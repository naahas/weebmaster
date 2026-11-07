// 🖼️ Convertit en WebP des portraits déposés ailleurs et les pose dans
// src/img/rushpic — le réservoir où puisent le Rush et Codanime.
//
//   node scripts/portraits-convertir.js ~/vignettes
//   node scripts/portraits-convertir.js ~/vignettes --nommer kyoraku.png=kyoraku2.webp
//
// Un portrait en PNG pèse dix fois son équivalent WebP. Cinquante PNG de 70 Ko
// font 3,5 Mo dans le dépôt et autant à télécharger : en WebP l'ensemble tient
// dans trois cents kilooctets.
//
// ⚠️ IL N'ÉCRASE JAMAIS UN FICHIER EXISTANT. Deux raisons, et la seconde est la
// plus coûteuse :
//
//   • un nom déjà pris est souvent un HOMONYME, pas un doublon — « yamamoto »
//     est un personnage de Bleach ET un de Reborn. Écraser, c'est changer en
//     silence le portrait d'un autre personnage dans un autre mode ;
//   • src/img est servi avec SEPT JOURS DE CACHE. Une image réécrite sous le
//     même nom reste l'ancienne chez les joueurs pendant une semaine, et un
//     rafraîchissement forcé n'y suffit pas toujours. Pour remplacer une image,
//     on CHANGE SON NOM et on met les données à jour — c'est à ça que sert
//     `--nommer`.
//
// ⚠️ L'original n'est JAMAIS supprimé : il vit hors du dépôt.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CIBLE = path.join(__dirname, '..', 'src', 'img', 'rushpic');
// Les cartes de Codanime font 118 px sur ordinateur, 69 sur téléphone ; le Rush
// les montre à 225. À deux pixels par pixel CSS, 300 couvre les deux largement.
// On ne monte jamais au-dessus de la taille d'origine.
const BORNE = 300;
const QUALITE = 88;

const args = process.argv.slice(2);
const SOURCE = args.find(a => !a.startsWith('--'));
const renommes = new Map();
args.forEach((a, i) => {
    if (a !== '--nommer') return;
    const paire = args[i + 1] || '';
    const [de, vers] = paire.split('=');
    if (de && vers) renommes.set(de.toLowerCase(), vers.toLowerCase());
});

if (!SOURCE) {
    console.error('Usage : node scripts/portraits-convertir.js <dossier> [--nommer a.png=b.webp]');
    process.exit(1);
}
try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); }
catch (e) { console.error('❌ ffmpeg est introuvable. Sans lui, rien à faire ici.'); process.exit(1); }

const dimensions = (f) => {
    try {
        const b = fs.readFileSync(f);
        if (b.slice(1, 4).toString() === 'PNG') return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
    } catch (e) { /* on convertira sans borne */ }
    return null;
};

const sources = fs.readdirSync(SOURCE).filter(n => /\.(png|jpe?g|bmp|webp)$/i.test(n));
const faits = [], sautes = [], rates = [];
let avant = 0, apres = 0;

for (const nom of sources) {
    const source = path.join(SOURCE, nom);
    const voulu = renommes.get(nom.toLowerCase())
        || nom.toLowerCase().replace(/\.[^.]+$/, '.webp');
    const cible = path.join(CIBLE, voulu);

    if (fs.existsSync(cible)) { sautes.push(nom + ' → ' + voulu); continue; }

    const t = dimensions(source);
    const borne = t ? Math.min(BORNE, Math.max(t.w, t.h)) : BORNE;
    const temp = cible + '.tmp.webp';
    try {
        execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', source,
            '-vf', 'scale=w=' + borne + ':h=' + borne + ':force_original_aspect_ratio=decrease',
            '-c:v', 'libwebp', '-quality', String(QUALITE), '-compression_level', '6', temp],
            { stdio: 'pipe' });
    } catch (e) { rates.push(nom); continue; }

    fs.renameSync(temp, cible);
    avant += fs.statSync(source).size;
    apres += fs.statSync(cible).size;
    faits.push(nom + ' → ' + voulu);
}

const ko = (o) => Math.round(o / 1024) + ' Ko';
console.log('\n📁 ' + SOURCE + '  →  src/img/rushpic');
console.log('   ' + faits.length + ' converti(s), ' + sautes.length + ' sauté(s), '
    + rates.length + ' raté(s)');
if (faits.length) {
    console.log('   ' + ko(avant) + ' → ' + ko(apres)
        + '  (' + Math.round((1 - apres / avant) * 100) + ' % de moins)');
}
for (const f of faits) console.log('   ✅ ' + f);
if (sautes.length) {
    console.log('\n⚠️ DÉJÀ PRIS dans rushpic — rien n\'a été écrasé :');
    for (const s of sautes) console.log('   ' + s);
    console.log('   Si c\'est un homonyme ou un remplacement, relance avec');
    console.log('   --nommer <fichier>=<nouveau-nom>.webp, puis mets les données à jour.');
}
for (const r of rates) console.log('   ❌ ffmpeg a refusé ' + r);
console.log('\nℹ️ Les originaux n\'ont pas été touchés : ils vivent hors du dépôt.\n');
