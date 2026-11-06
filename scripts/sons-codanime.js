// ════════════════════════════════════════════════════════════════════════
// Les trois sons de Codanime, fabriqués ici.
//
// ⚠️ LE MODE ÉTAIT MUET. Le client appelait `sounds.correct`,
// `sounds.wrong` et `sounds.eliminated` — trois clefs qui n'ont JAMAIS
// existé dans `initSounds`. `playSound(undefined)` sort en silence, donc
// rien ne le signalait : pas d'erreur en console, pas de son. On a joué
// des parties entières en croyant que les retournements étaient discrets.
//
// POURQUOI un générateur plutôt que des fichiers déposés : même raison que
// pour Collect (scripts/sons-collect.js, dont ce fichier reprend la boîte à
// outils). Emprunter un son à un autre mode donne un jeu qui sonne comme un
// autre, et ici le geste est très particulier — on ne RÉPOND pas, on
// RETOURNE une carte dont on ignorait la couleur.
//
//     node scripts/sons-codanime.js
//
// Écrit dans src/sound/. Demande ffmpeg (déjà nécessaire aux portraits).
//
// ⚠️ Le WAV intermédiaire va dans un dossier temporaire, jamais dans le
// dépôt : à 44,1 kHz un seul son pèse plus que les MP3 réunis.
// ════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SR = 44100;
const SORTIE = path.join(__dirname, '..', 'src', 'sound');

// ── Boîte à outils (reprise de sons-collect.js) ───────────────────────

const chute = (t, d) => Math.exp(-6.9 * t / d);
const enveloppe = (t, a, d) => (t < a ? t / a : chute(t - a, d));
const bruit = () => Math.random() * 2 - 1;
const glisse = (t, duree, de, vers) => de * Math.pow(vers / de, Math.min(1, t / duree));

function passeBas(f) {
    const k = 1 - Math.exp(-2 * Math.PI * f / SR);
    let y = 0;
    return (x) => (y += (x - y) * k);
}
function passeHaut(f) {
    const bas = passeBas(f);
    return (x) => x - bas(x);
}
function bande(f, largeur) {
    const h = passeHaut(f / largeur), b1 = passeBas(f * largeur), b2 = passeBas(f * largeur);
    return (x) => b2(b1(h(x)));
}
function reverbe(ech, melange = 0.25, duree = 0.28) {
    const retards = [1237, 1613, 1871, 2153];
    const lignes = retards.map(n => ({ buf: new Float64Array(n), i: 0, n }));
    const g = Math.pow(0.001, retards[0] / (duree * SR));
    const out = new Float64Array(ech.length);
    for (let i = 0; i < ech.length; i++) {
        let humide = 0;
        for (const l of lignes) {
            const v = l.buf[l.i];
            humide += v;
            l.buf[l.i] = ech[i] + v * g;
            l.i = (l.i + 1) % l.n;
        }
        out[i] = ech[i] * (1 - melange) + (humide / lignes.length) * melange;
    }
    return out;
}
const adoucir = (x) => Math.tanh(x * 1.25) / Math.tanh(1.25);

// ⚠️ Le niveau se règle son par son. Les MP3 déjà en place tournent autour
// de −27 dB de moyenne : un son neuf normalisé à fond saute de dix décibels
// au-dessus et donne l'impression d'un bug.
function normaliser(ech, crete = 0.89) {
    let max = 0;
    for (const v of ech) max = Math.max(max, Math.abs(v));
    if (!max) return ech;
    const g = crete / max;
    for (let i = 0; i < ech.length; i++) ech[i] = adoucir(ech[i] * g);
    return ech;
}
function fabriquer(duree, f) {
    const n = Math.round(duree * SR);
    const ech = new Float64Array(n);
    for (let i = 0; i < n; i++) ech[i] = f(i / SR, i);
    const q = Math.round(0.002 * SR);
    for (let i = 0; i < q; i++) ech[n - 1 - i] *= i / q;
    return ech;
}
function wav(ech) {
    const n = ech.length;
    const buf = Buffer.alloc(44 + n * 2);
    buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
    buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
    buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28);
    buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
    buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
    for (let i = 0; i < n; i++) {
        const v = Math.max(-1, Math.min(1, ech[i]));
        buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
    }
    return buf;
}

// ── Les trois sons ────────────────────────────────────────────────────
//
// ⚠️ Ils s'entendent EN SALVE : une équipe qui trouve trois cartes les
// enchaîne à 1,4 s d'intervalle. Chacun doit donc tenir sous une demi-
// seconde et ne pas traîner — deux queues qui se chevauchent font une
// bouillie, et c'est le moment le plus tendu du tour.
//
// ⚠️ Et ils doivent se distinguer SANS qu'on ait appris lequel est lequel :
// la couleur de la carte arrive en même temps, mais en stream le viewer
// entend souvent avant de regarder.

const SONS = {
    // ✅ TROUVÉE — une carte de son camp. Deux notes qui MONTENT, nettes,
    // avec une pointe de corps. C'est une confirmation, pas une fanfare :
    // on en entend trois d'affilée quand ça va bien.
    'cod-bonne': () => {
        return reverbe(normaliser(fabriquer(0.38, (t) => {
            let s = 0;
            for (const [quand, f, p] of [[0, 783.99, 1], [0.072, 1174.66, 0.85]]) {
                const d = t - quand;
                if (d > 0) {
                    s += (Math.sin(2 * Math.PI * f * d)
                        + Math.sin(2 * Math.PI * f * 2 * d) * 0.18
                        + Math.sin(2 * Math.PI * f * 3 * d) * 0.06)
                        * enveloppe(d, 0.004, 0.16) * p;
                }
            }
            return s * 0.62;
        }), 0.3), 0.2, 0.22);
    },

    // ⬜ RATÉE — un passant, ou une carte adverse. ⚠️ CE N'EST PAS UNE
    // FAUTE, et surtout pas un buzzer : on a tenté, on s'est trompé, le
    // tour passe. Une seule note qui DESCEND, mate, étouffée — le son d'une
    // porte qu'on referme, pas d'une alarme.
    'cod-ratee': () => {
        const pb = passeBas(1100);
        return normaliser(fabriquer(0.32, (t) => {
            const note = Math.sin(2 * Math.PI * glisse(t, 0.13, 392, 262) * t)
                * chute(t, 0.14) * 1.2;
            const bois = bande(520, 2.2)(bruit()) * chute(t, 0.045) * 0.55;
            return pb(note + bois);
        }), 0.26);
    },

    // 💀 L'ASSASSIN — la partie s'arrête là. ⚠️ Il a son son A LUI et non
    // celui d'une ratée : perdre sur-le-champ et perdre la main ne se
    // racontent pas pareil, et c'est le seul moment du mode où une carte
    // termine tout. Un coup grave qui s'effondre, et une traîne.
    'cod-assassin': () => {
        const pb = passeBas(420);
        return reverbe(normaliser(fabriquer(1.1, (t) => {
            const grave = Math.sin(2 * Math.PI * glisse(t, 0.5, 118, 41) * t)
                * chute(t, 0.62) * 1.4;
            const frappe = bande(170, 2.8)(bruit()) * chute(t, 0.09) * 1.1;
            // Un battement très lent : le son « respire » en s'éteignant,
            // ce qui le rend menaçant sans l'allonger.
            const souffle = 1 + 0.18 * Math.sin(2 * Math.PI * 5.5 * t);
            return pb((grave + frappe) * souffle);
        }), 0.34), 0.3, 0.75);
    },
};

// ── Fabrication ───────────────────────────────────────────────────────

const temporaire = fs.mkdtempSync(path.join(os.tmpdir(), 'sons-codanime-'));
let total = 0;
for (const [nom, faire] of Object.entries(SONS)) {
    const brut = path.join(temporaire, nom + '.wav');
    fs.writeFileSync(brut, wav(faire()));
    const fini = path.join(SORTIE, nom + '.mp3');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', brut,
        '-ac', '1', '-ar', '44100', '-b:a', '96k', fini]);
    const ko = fs.statSync(fini).size / 1024;
    total += ko;
    console.log('  ' + nom.padEnd(14) + ko.toFixed(1).padStart(6) + ' Ko');
}
fs.rmSync(temporaire, { recursive: true, force: true });
console.log('\n✨ ' + Object.keys(SONS).length + ' sons, ' + total.toFixed(1) + ' Ko au total');
