// ════════════════════════════════════════════════════════════════════════
// Les sons propres à Collect, fabriqués ici.
//
// POURQUOI un générateur plutôt que des fichiers déposés à la main : les
// sons du site venaient tous de BombAnime et d'Ascension, et s'entendaient
// comme tels — un verrou de quiz pour un scan de cartes, une buzzer d'erreur
// pour un vol raté. Emprunter donne un jeu qui sonne comme un autre.
//
// Chaque son est décrit par sa forme, pas par un fichier : on peut donc le
// retoucher (« la lame est trop longue », « le set manque de corps ») en
// changeant deux nombres et en relançant, plutôt qu'en cherchant un
// remplaçant qui ressemble. C'est tout l'intérêt.
//
//     node scripts/sons-collect.js
//
// Écrit dans src/sound/. Demande ffmpeg (déjà nécessaire aux portraits).
//
// ⚠️ Le WAV intermédiaire va dans un dossier temporaire, jamais dans le
// dépôt : à 44,1 kHz un seul son pèse plus que les dix-huit MP3 réunis.
// ════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SR = 44100;
const SORTIE = path.join(__dirname, '..', 'src', 'sound');

// ── Boîte à outils ────────────────────────────────────────────────────

// Décroissance exponentielle : « d » est le temps où il reste un millième.
const chute = (t, d) => Math.exp(-6.9 * t / d);
// Attaque puis chute. Une attaque nulle claque ; deux millisecondes suffisent
// à supprimer le clic parasite sans qu'on entende un fondu.
const enveloppe = (t, a, d) => (t < a ? t / a : chute(t - a, d));
const bruit = () => Math.random() * 2 - 1;
// Glissando exponentiel : l'oreille entend les hauteurs en rapports, pas en
// écarts — un balayage linéaire monte trop vite au début et traîne à la fin.
const glisse = (t, duree, de, vers) => de * Math.pow(vers / de, Math.min(1, t / duree));

// Un pôle, la brique de tout le reste. « f » est la fréquence de coupure.
function passeBas(f) {
    const k = 1 - Math.exp(-2 * Math.PI * f / SR);
    let y = 0;
    return (x) => (y += (x - y) * k);
}
function passeHaut(f) {
    const bas = passeBas(f);
    return (x) => x - bas(x);
}
// Un résonateur : deux passe-bas en série autour d'une bande étroite. Ce qui
// donne au bruit blanc une couleur — sans lui, tout bruit se ressemble.
function bande(f, largeur) {
    const h = passeHaut(f / largeur), b1 = passeBas(f * largeur), b2 = passeBas(f * largeur);
    return (x) => b2(b1(h(x)));
}

// Une réverbération de quatre lignes à retard. Grossière, et c'est voulu :
// ce qu'on veut, c'est que le son ne s'arrête pas net dans le silence.
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

// Écrêtage doux : on gagne du volume perçu sans le grésillement d'un
// écrêtage franc, et les MP3 à 96 kb/s pardonnent mieux.
const adoucir = (x) => Math.tanh(x * 1.25) / Math.tanh(1.25);

// Le niveau se regle son par son, pas au forfait. Les MP3 deja en place
// tournent autour de -27 dB de moyenne : un son neuf normalise a fond sautait
// de dix decibels au-dessus et donnait l impression d un bug. Les cretes
// ci-dessous sont mesurees, pas devinees — « ffmpeg -af volumedetect ».
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
    // Deux millisecondes de fondu final : un échantillon coupé net produit un
    // claquement à la fin, très audible en boucle.
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
        buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(ech[i] * 32767))), 44 + i * 2);
    }
    return buf;
}

// ── Les sons ──────────────────────────────────────────────────────────

const SONS = {

    // 🔍 SCANNER — on force un secret.
    // Un balayage qui monte (l'appareil cherche), un souffle de bande étroite
    // qui l'accompagne, et deux déclics au bout : le verrou qui cède. Froid,
    // mécanique, sans aucune note tenue — ce n'est pas une prise, c'est une
    // intrusion, et ça ne doit pas être agréable.
    'col-scan': () => {
        const b = bande(2400, 2.2), pb = passeBas(5200);
        return reverbe(normaliser(fabriquer(0.62, (t) => {
            const balayage = Math.sin(2 * Math.PI * glisse(t, 0.34, 380, 2050) * t) * chute(t, 0.4) * 0.5;
            const souffle = b(bruit()) * enveloppe(t, 0.02, 0.3) * 0.55;
            // Les deux déclics : brefs, secs, et le second plus haut — c'est
            // ce décalage qui se lit comme « ça s'ouvre » et non « ça rate ».
            let clic = 0;
            for (const [quand, hauteur] of [[0.36, 1500], [0.43, 2100]]) {
                const d = t - quand;
                if (d >= 0 && d < 0.05) clic += Math.sin(2 * Math.PI * hauteur * d) * chute(d, 0.028) * 0.7;
            }
            return pb(balayage + souffle) + clic;
        }), 0.41), 0.18, 0.2);
    },

    // ★ POSER UN SET — l'instant de gloire, et du verre qui casse.
    // Trois couches : un corps grave qui donne le poids de l'impact, un éclat
    // de bruit très aigu qui EST le verre, et un accord qui monte par-dessus
    // pour dire que c'est une réussite et non un accident. Sans l'accord, on
    // entendait une casse ; sans le verre, une fanfare. Il faut les deux.
    'col-set': () => {
        const aigu = passeHaut(3800), corps = passeBas(220);
        const accord = [523.25, 659.25, 783.99, 1046.5];   // do majeur, quatre voix
        return reverbe(normaliser(fabriquer(1.15, (t) => {
            const impact = corps(Math.sin(2 * Math.PI * glisse(t, 0.16, 130, 46) * t)) * chute(t, 0.3) * 1.6;
            const verre = aigu(bruit()) * chute(t, 0.42) * 0.75;
            // L'accord entre un souffle après la casse : la récompense suit
            // l'événement, elle ne le couvre pas.
            const d = t - 0.06;
            let chant = 0;
            if (d > 0) {
                for (const [k, f] of accord.entries()) {
                    const arrive = k * 0.035;
                    const u = d - arrive;
                    if (u > 0) chant += Math.sin(2 * Math.PI * f * u * (1 + 0.012 * u)) * enveloppe(u, 0.012, 0.62) / (k + 2.2);
                }
            }
            return impact + verre + chant * 1.15;
        }), 0.78), 0.3, 0.5);
    },

    // ⚔️ VOLER, ET ÇA PASSE — une lame, puis ce qu'elle touche.
    // Le sifflement descend (une lame qui part), l'impact arrive après et
    // porte une courte résonance métallique. C'est le seul moment du jeu où
    // l'on prend quelque chose à quelqu'un : il faut que ça tranche.
    'col-vol': () => {
        const b = bande(3200, 3), pb = passeBas(7000);
        return reverbe(normaliser(fabriquer(0.68, (t) => {
            const lame = b(bruit()) * enveloppe(t, 0.012, 0.16) * 0.9
                       * (1 - Math.min(1, t / 0.2) * 0.4);
            const d = t - 0.11;
            let coup = 0;
            if (d > 0) {
                // Trois partiels non harmoniques : c'est ce rapport-là qui
                // s'entend comme du métal plutôt que comme une note.
                coup = (Math.sin(2 * Math.PI * 210 * d) * 1.0
                      + Math.sin(2 * Math.PI * 611 * d) * 0.42
                      + Math.sin(2 * Math.PI * 1490 * d) * 0.2) * chute(d, 0.3);
                coup += Math.sin(2 * Math.PI * glisse(d, 0.1, 320, 70) * d) * chute(d, 0.12) * 1.2;
            }
            return pb(lame) + coup;
        }), 0.79), 0.22, 0.3);
    },

    // 🛡️ VOLER, ET ÇA RATE — rien ne s'est passé.
    // Un vol échoue près d'une fois sur deux : le son ne doit PAS punir. Pas
    // de buzzer, pas de dissonance, pas de note descendante — juste un choc
    // mat, celui de deux cartes qui se cognent et retombent. On a tenté
    // quelque chose ; on n'a pas commis d'erreur.
    'col-vol-rate': () => {
        const pb = passeBas(900), b = bande(700, 2.4);
        return normaliser(fabriquer(0.34, (t) => {
            const mat = Math.sin(2 * Math.PI * glisse(t, 0.09, 190, 96) * t) * chute(t, 0.13) * 1.3;
            const carton = b(bruit()) * chute(t, 0.05) * 0.8;
            return pb(mat + carton);
        }), 0.29);
    },

    // 🔔 C'EST À TOI — deux notes, et on n'insiste pas.
    // Il tombe pendant qu'on regarde ailleurs, souvent en vocal : il doit
    // percer sans couvrir une voix. Une quinte montante, douce, courte.
    'col-tour': () => {
        return reverbe(normaliser(fabriquer(0.7, (t) => {
            let s = 0;
            for (const [quand, f] of [[0, 659.25], [0.1, 987.77]]) {
                const d = t - quand;
                if (d > 0) {
                    s += (Math.sin(2 * Math.PI * f * d)
                        + Math.sin(2 * Math.PI * f * 2 * d) * 0.22
                        + Math.sin(2 * Math.PI * f * 3 * d) * 0.08) * enveloppe(d, 0.008, 0.34);
                }
            }
            return s * 0.6;
        }), 0.33), 0.32, 0.42);
    },
};

// ── Fabrication ───────────────────────────────────────────────────────

const temporaire = fs.mkdtempSync(path.join(os.tmpdir(), 'sons-collect-'));
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
