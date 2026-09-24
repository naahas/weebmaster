// 🖼️ Convertit en WebP les avatars déposés dans src/img/avatarpic.
//
// Le but est qu'il n'y ait rien à retenir : on dépose « naruto.png », on lance
// la commande, et il ne reste que « naruto.webp ». Les deux listes d'avatars
// citent le fichier au nom exact, extension comprise — un PNG resté PNG ne
// serait pas trouvé et sa vignette retomberait sur le chevalier, sans rien dire.
//
// Le poids compte plus qu'ailleurs : le panneau rend TOUTES les vignettes d'un
// coup à l'ouverture. Huit PNG de 80 Ko font 640 Ko à télécharger d'un bloc, et
// c'est le premier écran que voit un streamer. En WebP l'ensemble tient dans
// une centaine de kilooctets.
//
//   npm run avatars:convertir                 (ce qui est dans le dossier)
//   npm run avatars:convertir -- ~/Bureau     (aller les chercher ailleurs)
//   npm run avatars:convertir -- --force      (refaire ceux déjà convertis)
//
// ⚠️ Depuis un dossier EXTÉRIEUR, l'original n'est jamais supprimé : on ne touche
// pas à ce qui vit hors du dépôt.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DOSSIER = path.join(__dirname, '..', 'src', 'img', 'avatarpic');
// Le panneau les affiche à 4,6 rem (~74 px), 3,9 rem sur téléphone. 200 px
// couvre le double pour les écrans à forte densité, et rien au-delà ne se voit.
const BORNE = 200;
const QUALITE = 86;   // un visage en petit : on ne lésine pas, le fichier reste minuscule

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

// Les dimensions d'un PNG se lisent dans son en-tête, sans rien installer.
// On s'en sert pour ne JAMAIS agrandir : une image déjà petite qu'on étire
// pèserait plus lourd pour un résultat plus flou.
function taillePng(fichier) {
    try {
        const b = fs.readFileSync(fichier);
        if (b.slice(1, 4).toString() !== 'PNG') return null;
        return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
    } catch (e) { return null; }
}

const sources = fs.readdirSync(DEPUIS)
    .filter(n => /\.(png|jpe?g|bmp|webp)$/i.test(n))
    .filter(n => force || !/\.webp$/i.test(n));

if (!sources.length) {
    console.log('Rien à convertir — le dossier ne contient que des WebP.');
    console.log('(« -- --force » les refait.)');
    process.exit(0);
}

let avant = 0, apres = 0;
const faits = [];
const ratés = [];
const tordus = [];

for (const nom of sources) {
    const source = path.join(DEPUIS, nom);
    const cible = path.join(DOSSIER, nom.replace(/\.[^.]+$/, '.webp'));
    const temp = cible + '.tmp.webp';
    const poidsAvant = fs.statSync(source).size;

    // ⚠️ Le panneau affiche les avatars dans un CERCLE, en object-fit: cover.
    // Une image nettement plus haute que large s'y fait rogner sur toute sa
    // hauteur — on ne verra qu'une bande du milieu. On convertit quand même,
    // mais on le signale : c'est un problème de cadrage, pas de format.
    const t = taillePng(source);
    if (t) {
        const rapport = Math.max(t.w / t.h, t.h / t.w);
        if (rapport > 1.35) tordus.push(nom + '  (' + t.w + '×' + t.h + ')');
    }

    // On ne monte jamais au-dessus de la taille d'origine.
    const borne = t ? Math.min(BORNE, Math.max(t.w, t.h)) : BORNE;
    const filtre = 'scale=w=' + borne + ':h=' + borne
        + ':force_original_aspect_ratio=decrease';

    try {
        execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', source,
            '-vf', filtre, '-c:v', 'libwebp',
            // La couche alpha doit survivre : un avatar au fond transparent
            // qui deviendrait opaque laisserait un carré dans le cercle.
            '-quality', String(QUALITE), '-compression_level', '6', temp], { stdio: 'pipe' });
    } catch (e) { ratés.push(nom); continue; }

    fs.renameSync(temp, cible);
    // On ne supprime la source qu'une fois la cible en place, et jamais si elle
    // porte le même nom : ce serait effacer ce qu'on vient d'écrire.
    if (surPlace && path.resolve(source) !== path.resolve(cible)) fs.unlinkSync(source);

    const poidsApres = fs.statSync(cible).size;
    avant += poidsAvant;
    apres += poidsApres;
    faits.push({ nom: path.basename(cible), av: poidsAvant, ap: poidsApres });
}

const ko = o => Math.round(o / 1024) + ' Ko';

console.log('');
faits.forEach(f => console.log('  ✅ ' + f.nom.padEnd(20)
    + ko(f.av).padStart(7) + '  →  ' + ko(f.ap).padStart(7)
    + '   (-' + Math.round((1 - f.ap / f.av) * 100) + ' %)'));

if (faits.length) {
    console.log('\n  ' + faits.length + ' avatar(s) : ' + ko(avant) + ' → ' + ko(apres)
        + '   (-' + Math.round((1 - apres / avant) * 100) + ' %)');
}

if (tordus.length) {
    console.log('\n⚠️ Cadrage — ces images sont loin du carré. Le panneau les affiche');
    console.log('   dans un cercle : elles seront rognées sur leur longueur.');
    tordus.forEach(t => console.log('   · ' + t));
}

if (ratés.length) {
    console.log('\n❌ ' + ratés.length + ' échec(s) : ' + ratés.join(', '));
    process.exit(1);
}
