// 🕵️ Les portraits posés dans `src/img/rushpic/` que personne ne cite encore.
//
//   npm run codanime:nouveaux
//   npm run codanime:nouveaux -- --serie "Fairy Tail"
//
// Le dossier ne décide de rien : une image que ni `rushdata.json` ni
// `codanimedata.json` ne nomme n'est qu'un fichier posé là. Ce script compare
// les trois et dit ce qui traîne — pour qu'on n'ait pas à tenir la liste à la
// main en déposant les images.
//
// Avec `--serie`, il écrit en plus le bloc JSON prêt à coller dans
// `codanimedata.json`, en devinant le nom depuis le fichier. ⚠️ Il DEVINE le
// nom, il ne devine jamais la série : « natsu.webp » ne dit pas Fairy Tail, et
// un script qui inventerait la série se tromperait en silence sur les persos
// qui portent le même prénom ailleurs.
const fs = require('fs');
const path = require('path');

const DOSSIER = path.join(__dirname, '..', 'src', 'img', 'rushpic');
const RACINE = path.join(__dirname, '..');

const args = process.argv.slice(2);
const i = args.indexOf('--serie');
const SERIE = i >= 0 ? args[i + 1] : null;

// ── Les dimensions, sans bibliothèque ──────────────────────────────
// ⚠️ Un portrait hors ratio ne casse rien — `object-fit: cover` le recadre —
// mais il se fait rogner la tête ou les pieds sans que rien ne le dise. Le
// gabarit du dossier est 225 × 350.
function dimensions(fichier) {
    let b;
    try { b = fs.readFileSync(fichier); } catch (e) { return null; }
    // PNG : largeur et hauteur en clair dans l'IHDR.
    if (b.length > 24 && b.toString('ascii', 1, 4) === 'PNG') {
        return { l: b.readUInt32BE(16), h: b.readUInt32BE(20), type: 'PNG' };
    }
    if (b.length > 30 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
        const bloc = b.toString('ascii', 12, 16);
        // VP8X : la taille du canevas, sur trois octets, moins un.
        if (bloc === 'VP8X') {
            return { l: (b.readUIntLE(24, 3) & 0xFFFFFF) + 1,
                     h: (b.readUIntLE(27, 3) & 0xFFFFFF) + 1, type: 'WebP' };
        }
        if (bloc === 'VP8 ') {
            return { l: b.readUInt16LE(26) & 0x3FFF, h: b.readUInt16LE(28) & 0x3FFF, type: 'WebP' };
        }
        if (bloc === 'VP8L') {
            const n = b.readUInt32LE(21);
            return { l: (n & 0x3FFF) + 1, h: ((n >> 14) & 0x3FFF) + 1, type: 'WebP' };
        }
        return { l: null, h: null, type: 'WebP' };
    }
    if (b.length > 4 && b[0] === 0xFF && b[1] === 0xD8) return { l: null, h: null, type: 'JPEG' };
    return { l: null, h: null, type: '?' };
}

// « natsu-dragneel.webp » → « Natsu Dragneel ». Une proposition, pas une vérité.
const nomDepuis = (f) => f.replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(m => m.charAt(0).toUpperCase() + m.slice(1))
    .join(' ');

const idDepuis = (f) => f.replace(/\.[a-z0-9]+$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '');

const lire = (nom) => {
    const brut = JSON.parse(fs.readFileSync(path.join(RACINE, nom), 'utf8'));
    return Array.isArray(brut) ? brut : (brut.personnages || []);
};

const rush = lire('rushdata.json');
const cod = lire('codanimedata.json');
const citeRush = new Set(rush.map(p => p.img));
const citeCod = new Set(cod.map(p => p.img));

let fichiers;
try { fichiers = fs.readdirSync(DOSSIER).filter(f => /\.(webp|png|jpe?g)$/i.test(f)); }
catch (e) { console.error('✗ Dossier introuvable : ' + DOSSIER); process.exit(1); }

const orphelins = fichiers.filter(f => !citeRush.has(f) && !citeCod.has(f));
const dansRushSeul = fichiers.filter(f => citeRush.has(f) && !citeCod.has(f));
const manquants = [...new Set([...citeRush, ...citeCod])].filter(f => !fichiers.includes(f));

console.log('\n📁 ' + DOSSIER);
console.log('   ' + fichiers.length + ' image(s) · ' + rush.length + ' citée(s) par Rush · '
    + cod.length + ' par Codanime');

if (manquants.length) {
    console.log('\n❌ CITÉES MAIS ABSENTES DU DOSSIER — le jeu servira une image morte :');
    for (const f of manquants) console.log('   ' + f);
}

console.log('\n🆕 Posées dans le dossier et citées NULLE PART (' + orphelins.length + ') :');
if (!orphelins.length) console.log('   (aucune)');
for (const f of orphelins) {
    const d = dimensions(path.join(DOSSIER, f)) || {};
    const ko = Math.round(fs.statSync(path.join(DOSSIER, f)).size / 1024);
    const taille = d.l ? d.l + '×' + d.h : 'taille illisible';
    const alerte = []
        .concat(d.type !== 'WebP' ? ['⚠️ ' + d.type + ' — à convertir en WebP'] : [])
        .concat(d.l && Math.abs(d.l / d.h - 225 / 350) > 0.12 ? ['⚠️ ratio inhabituel'] : [])
        .concat(ko > 60 ? ['⚠️ ' + ko + ' Ko, lourd pour un portrait'] : []);
    console.log('   ' + f.padEnd(34) + taille.padEnd(12) + String(ko + ' Ko').padEnd(9)
        + alerte.join('  '));
}

console.log('\nℹ️ Citées par Rush mais pas par Codanime : ' + dansRushSeul.length
    + ' (c\'est normal — les deux viviers sont des listes séparées)');

if (SERIE && orphelins.length) {
    console.log('\n── À coller dans codanimedata.json, série « ' + SERIE + ' » ──');
    console.log('⚠️ Les noms sont DEVINÉS depuis les fichiers : relis-les avant de coller.\n');
    console.log(orphelins.map(f => '        ' + JSON.stringify({
        id: idDepuis(f), nom: nomDepuis(f), anime: SERIE, img: f,
    })).join(',\n'));
    const dejaId = new Set(cod.map(p => p.id));
    const collisions = orphelins.map(idDepuis).filter(x => dejaId.has(x));
    if (collisions.length) {
        console.log('\n⚠️ IDENTIFIANTS DÉJÀ PRIS dans codanimedata.json : ' + collisions.join(', '));
        console.log('   Deux entrées de même `id` : la seconde passerait inaperçue.');
    }
} else if (!SERIE && orphelins.length) {
    console.log('\nℹ️ Relance avec  --serie "Nom De La Serie"  pour avoir le bloc JSON tout prêt.');
}
console.log('');
