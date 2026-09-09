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
//   npm run openings:convertir                 (ce qui est déjà dans le dossier)
//   npm run openings:convertir -- ~/Bureau     (aller les chercher ailleurs)
//   npm run openings:convertir -- --force      (refaire celles déjà converties)
//
// ⚠️ Depuis un dossier EXTÉRIEUR, l'original n'est jamais supprimé : on ne touche
// pas à ce qui vit hors du dépôt. Et seuls les fichiers nommés « op_… » sont pris,
// pour ne pas ramasser ce qui traîne à côté sur un bureau.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DOSSIER = path.join(__dirname, '..', 'src', 'img', 'ascensionpic', 'ascensionops');
const LARGEUR = 400;          // la largeur des 64 vignettes d'arcs
const QUALITE = 82;
const force = process.argv.includes('--force');
const SOURCE = process.argv.slice(2).find(a => !a.startsWith('--'));
const DEPUIS = SOURCE
    ? path.resolve(SOURCE.replace(/^~/, process.env.USERPROFILE || process.env.HOME || '~'))
    : DOSSIER;
const surPlace = path.resolve(DEPUIS) === path.resolve(DOSSIER);

try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); }
catch (e) {
    console.error('❌ ffmpeg est introuvable. Sans lui, rien à faire ici.');
    process.exit(1);
}

for (const d of [DOSSIER, DEPUIS]) {
    if (!fs.existsSync(d)) { console.error('❌ Dossier introuvable : ' + d); process.exit(1); }
}

const sources = fs.readdirSync(DEPUIS)
    .filter(n => /\.(png|jpe?g|bmp|webp)$/i.test(n))
    // Hors du dépôt, on ne prend que ce qui porte le préfixe : un bureau contient
    // autre chose que des vignettes d'openings, et on n'a rien à y faire.
    .filter(n => surPlace || /^op_/i.test(n))
    .filter(n => force || !/\.webp$/i.test(n));

if (!sources.length) {
    console.log('Rien à convertir — le dossier ne contient que des WebP.');
    console.log('(« -- --force » les refait, si tu veux les réduire à ' + LARGEUR + ' px.)');
    process.exit(0);
}

let avant = 0, apres = 0, faits = 0;
const ratés = [];

for (const nom of sources) {
    const source = path.join(DEPUIS, nom);
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
    if (surPlace && path.resolve(source) !== path.resolve(cible)) fs.unlinkSync(source);

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
if (!surPlace) console.log('   Les originaux restent dans ' + DEPUIS + ' — à toi de les ranger.');
console.log('⚠️ Relance le serveur : il ne recense les images qu\'au démarrage.');
console.log('   « npm run openings » dit ce qui manque encore.');
