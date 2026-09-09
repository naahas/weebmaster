// 🗓️ Convertit en WebP tout ce qui traîne dans le dossier des openings.
//
// Le but est qu'il n'y ait rien à retenir : on dépose « op_naruto_01.png »,
// on lance la commande, et il ne reste que « op_naruto_01.webp ». Les données
// citent le fichier au nom exact, extension comprise — un PNG ne serait pas
// trouvé, et sa série resterait hors du tirage sans qu'on sache pourquoi.
//
// Le poids n'est pas un détail : une capture d'opening en PNG pèse 400 à 800 Ko,
// et cent soixante-dix d'entre elles feraient plus de cent mégaoctets à cloner
// et à télécharger chez chaque joueur. En WebP l'ensemble tient dans cinq.
//
//   npm run openings:convertir
//   npm run openings:convertir -- --force   (refait celles déjà converties)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DOSSIER = path.join(__dirname, '..', 'src', 'img', 'ascensionpic', 'ascensionops');
const LARGEUR = 400;          // la largeur des 64 vignettes d'arcs
const QUALITE = 82;
const force = process.argv.includes('--force');

try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); }
catch (e) {
    console.error('❌ ffmpeg est introuvable. Sans lui, rien à faire ici.');
    process.exit(1);
}

if (!fs.existsSync(DOSSIER)) {
    console.error('❌ Le dossier n\'existe pas : ' + DOSSIER);
    process.exit(1);
}

const sources = fs.readdirSync(DOSSIER)
    .filter(n => /\.(png|jpe?g|bmp|webp)$/i.test(n))
    .filter(n => force || !/\.webp$/i.test(n));

if (!sources.length) {
    console.log('Rien à convertir — le dossier ne contient que des WebP.');
    console.log('(« -- --force » les refait, si tu veux les réduire à ' + LARGEUR + ' px.)');
    process.exit(0);
}

let avant = 0, apres = 0, faits = 0;
const ratés = [];

for (const nom of sources) {
    const source = path.join(DOSSIER, nom);
    const cible = path.join(DOSSIER, nom.replace(/\.[^.]+$/, '.webp'));
    // ffmpeg refuse d'écrire dans le fichier qu'il lit : on passe par un temporaire.
    const temp = cible + '.tmp.webp';
    const poidsAvant = fs.statSync(source).size;

    try {
        execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', source,
            '-vf', 'scale=' + LARGEUR + ':-2', '-c:v', 'libwebp',
            '-quality', String(QUALITE), '-compression_level', '6', temp], { stdio: 'pipe' });
    } catch (e) { ratés.push(nom); continue; }

    fs.renameSync(temp, cible);
    // On ne supprime la source qu'une fois la cible en place, et jamais si elle
    // porte le même nom : ce serait effacer ce qu'on vient d'écrire.
    if (path.resolve(source) !== path.resolve(cible)) fs.unlinkSync(source);

    const poidsApres = fs.statSync(cible).size;
    avant += poidsAvant; apres += poidsApres; faits++;
    console.log('  ' + nom.padEnd(24) + Math.round(poidsAvant / 1024) + ' Ko  →  '
        + path.basename(cible).padEnd(24) + Math.round(poidsApres / 1024) + ' Ko');
}

console.log('');
console.log(faits + ' vignette(s) converties : ' + Math.round(avant / 1024) + ' Ko → '
    + Math.round(apres / 1024) + ' Ko'
    + (avant ? ' (' + Math.round(100 - apres / avant * 100) + ' % de moins)' : ''));
if (ratés.length) console.log('❌ échec sur : ' + ratés.join(', '));
console.log('⚠️ Relance le serveur : il ne recense les images qu\'au démarrage.');
console.log('   « npm run openings » dit ce qui manque encore.');
