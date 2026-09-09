// 🗓️ L'état des vignettes d'openings, sans lancer le serveur.
//
// Le travail est long et s'étale sur plusieurs jours : cette liste dit, série
// par série, ce qui est posé et ce qui manque — avec le nom exact du fichier à
// produire. Une série n'entre dans le tirage que si elle est COMPLÈTE ; servie
// amputée, elle sortirait des cartes muettes devant lesquelles le chronomètre
// tourne quand même.
//
//   node scripts/openings.js            → ce qui manque
//   node scripts/openings.js --tout     → tout, y compris ce qui est prêt
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const DOSSIER = path.join(RACINE, 'src', 'img', 'ascensionpic', 'ascensionops');
const d = JSON.parse(fs.readFileSync(path.join(RACINE, 'ascensiondata.json'), 'utf8'));
const tout = process.argv.includes('--tout');

const openings = d.openings || {};
const present = (img) => fs.existsSync(path.join(DOSSIER, img));

// Le poids des 64 vignettes d'arcs sert d'étalon : 30 Ko de moyenne, 83 au pire.
const SEUIL_KO = 90;

let pretes = 0, manquantes = 0, lourdes = [];
const lignes = [];

for (const [anime, liste] of Object.entries(openings)) {
    const absents = liste.filter(o => !present(o.img));
    const vides = liste.filter(o => !o.name);
    const complete = liste.length >= 5 && !vides.length && !absents.length;

    for (const o of liste) {
        if (!present(o.img)) continue;
        const ko = fs.statSync(path.join(DOSSIER, o.img)).size / 1024;
        if (ko > SEUIL_KO) lourdes.push(o.img + ' (' + Math.round(ko) + ' Ko)');
    }

    if (complete) { pretes++; if (!tout) continue; }
    manquantes += absents.length;

    const etat = complete ? 'prête'
        : liste.length < 5 ? liste.length + ' entrée(s), il en faut 5'
        : vides.length ? vides.length + ' titre(s) à écrire'
        : absents.length + ' / ' + liste.length + ' vignette(s) à poser';

    lignes.push('');
    lignes.push((complete ? '✅ ' : '⏳ ') + anime + ' — ' + etat);
    for (const o of absents) lignes.push('      ' + o.img.padEnd(22) + o.name);
}

console.log('🗓️  Vignettes d\'openings — ' + DOSSIER.replace(RACINE + path.sep, ''));
console.log(lignes.join('\n'));
console.log('');
console.log('   ' + pretes + ' série(s) prête(s) sur ' + Object.keys(openings).length
    + ', ' + manquantes + ' vignette(s) à produire.');
if (lourdes.length) {
    console.log('   ⚠️ trop lourdes (plus de ' + SEUIL_KO + ' Ko, les arcs font 30 en moyenne) : '
        + lourdes.join(', '));
}
if (!tout && pretes) console.log('   (« --tout » montre aussi les séries prêtes)');
console.log('');
console.log('   Convertir un lot d\'images en WebP, 400 px de large :');
console.log('     for f in *.png; do ffmpeg -i "$f" -vf scale=400:-2 -c:v libwebp -quality 82 "${f%.*}.webp"; done');
console.log('   ⚠️ Le serveur ne recense les images qu\'au démarrage : relance-le après.');
