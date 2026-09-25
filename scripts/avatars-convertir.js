// 🖼️ Convertit en WebP les avatars déposés dans src/img/avatarpic.
//
// Le but est qu'il n'y ait rien à retenir : on dépose « naruto.png », on lance
// la commande, et il ne reste que « naruto.webp ». Les deux listes d'avatars
// citent le fichier au nom exact, extension comprise — un PNG resté PNG ne
// serait pas trouvé et sa vignette retomberait sur le chevalier, sans rien dire.
//
// ⚠️ Il traite DEUX dossiers, et c'est voulu : src/img/avatarpic (les avatars
// des joueurs) et src/img/avatarpic/bot (les portraits du partenaire de
// BombAnime). Le second est lu au démarrage du serveur, aucune liste ne le cite,
// donc un PNG oublié là ne casse rien — il pèse juste dix fois son voisin, et
// personne ne s'en aperçoit. D'où ce passage automatique.
//
// Le poids compte plus qu'ailleurs : le panneau rend TOUTES les vignettes d'un
// coup à l'ouverture. Huit PNG de 80 Ko font 640 Ko à télécharger d'un bloc, et
// c'est le premier écran que voit un streamer. En WebP l'ensemble tient dans
// une centaine de kilooctets.
//
//   npm run avatars:convertir                 (les deux dossiers du dépôt)
//   npm run avatars:convertir -- ~/Bureau     (aller les chercher ailleurs)
//   npm run avatars:convertir -- ~/Bureau --bot   (… et les poser chez le bot)
//   npm run avatars:convertir -- --force      (refaire ceux déjà convertis)
//
// ⚠️ Depuis un dossier EXTÉRIEUR, l'original n'est jamais supprimé : on ne touche
// pas à ce qui vit hors du dépôt.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DOSSIER = path.join(__dirname, '..', 'src', 'img', 'avatarpic');
const DOSSIER_BOT = path.join(DOSSIER, 'bot');
// Le panneau les affiche à 4,6 rem (~74 px), 3,9 rem sur téléphone. 200 px
// couvre le double pour les écrans à forte densité, et rien au-delà ne se voit.
const BORNE = 200;
const QUALITE = 86;   // un visage en petit : on ne lésine pas, le fichier reste minuscule

const force = process.argv.includes('--force');
const versBot = process.argv.includes('--bot');
const SOURCE = process.argv.slice(2).find(a => !a.startsWith('--'));

try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); }
catch (e) {
    console.error('❌ ffmpeg est introuvable. Sans lui, rien à faire ici.');
    process.exit(1);
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

// Convertit ce qu'il trouve dans `depuis` et l'écrit dans `vers`. L'original
// n'est supprimé que si les deux ne font qu'un — sinon on est allé chercher
// hors du dépôt, et on n'y touche pas.
function convertir(depuis, vers) {
    const surPlace = path.resolve(depuis) === path.resolve(vers);
    const bilan = { faits: [], tordus: [], ratés: [], avant: 0, apres: 0 };

    const sources = fs.readdirSync(depuis)
        .filter(n => /\.(png|jpe?g|bmp|webp)$/i.test(n))
        .filter(n => force || !/\.webp$/i.test(n));

    for (const nom of sources) {
        const source = path.join(depuis, nom);
        const cible = path.join(vers, nom.replace(/\.[^.]+$/, '.webp'));
        const temp = cible + '.tmp.webp';
        const poidsAvant = fs.statSync(source).size;

        // ⚠️ Les avatars s'affichent dans un CERCLE, les portraits du bot dans un
        // HEXAGONE, les deux en object-fit: cover. Une image nettement plus haute
        // que large s'y fait rogner sur toute sa hauteur — on ne verra qu'une
        // bande du milieu. On convertit quand même, mais on le signale : c'est un
        // problème de cadrage, pas de format.
        const t = taillePng(source);
        if (t) {
            const rapport = Math.max(t.w / t.h, t.h / t.w);
            if (rapport > 1.35) bilan.tordus.push(nom + '  (' + t.w + '×' + t.h + ')');
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
        } catch (e) { bilan.ratés.push(nom); continue; }

        fs.renameSync(temp, cible);
        // On ne supprime la source qu'une fois la cible en place, et jamais si elle
        // porte le même nom : ce serait effacer ce qu'on vient d'écrire.
        if (surPlace && path.resolve(source) !== path.resolve(cible)) fs.unlinkSync(source);

        const poidsApres = fs.statSync(cible).size;
        bilan.avant += poidsAvant;
        bilan.apres += poidsApres;
        bilan.faits.push({ nom: path.basename(cible), av: poidsAvant, ap: poidsApres });
    }

    return bilan;
}

// ── Ce qu'on a à faire ────────────────────────────────────────────────
// Sans argument : les deux dossiers du dépôt, chacun chez lui. Avec un dossier
// extérieur : lui seul, et il atterrit chez les joueurs ou chez le bot.
const travaux = SOURCE
    ? [{ titre: versBot ? 'portraits du partenaire' : 'avatars des joueurs',
         depuis: path.resolve(SOURCE.replace(/^~/, process.env.USERPROFILE || process.env.HOME || '~')),
         vers: versBot ? DOSSIER_BOT : DOSSIER }]
    : [{ titre: 'avatars des joueurs', depuis: DOSSIER, vers: DOSSIER },
       { titre: 'portraits du partenaire', depuis: DOSSIER_BOT, vers: DOSSIER_BOT }];

for (const t of travaux) {
    for (const d of [t.depuis, t.vers]) {
        // Le dossier du bot peut ne pas exister sur une copie ancienne du dépôt :
        // on le crée plutôt que de refuser de travailler.
        if (!fs.existsSync(d) && path.resolve(d) === path.resolve(DOSSIER_BOT)) {
            fs.mkdirSync(d, { recursive: true });
            continue;
        }
        if (!fs.existsSync(d)) { console.error('❌ Dossier introuvable : ' + d); process.exit(1); }
    }
}

const ko = o => Math.round(o / 1024) + ' Ko';
let rien = true, echecs = 0;

for (const t of travaux) {
    const b = convertir(t.depuis, t.vers);
    if (!b.faits.length && !b.ratés.length) continue;
    rien = false;

    console.log('\n── ' + t.titre + ' ──');
    b.faits.forEach(f => console.log('  ✅ ' + f.nom.padEnd(20)
        + ko(f.av).padStart(7) + '  →  ' + ko(f.ap).padStart(7)
        + '   (-' + Math.round((1 - f.ap / f.av) * 100) + ' %)'));

    if (b.faits.length) {
        console.log('\n  ' + b.faits.length + ' image(s) : ' + ko(b.avant) + ' → ' + ko(b.apres)
            + '   (-' + Math.round((1 - b.apres / b.avant) * 100) + ' %)');
    }

    if (b.tordus.length) {
        console.log('\n⚠️ Cadrage — ces images sont loin du carré. Elles sont affichées');
        console.log('   dans un cercle ou un hexagone : elles seront rognées sur leur longueur.');
        b.tordus.forEach(x => console.log('   · ' + x));
    }

    if (b.ratés.length) {
        console.log('\n❌ ' + b.ratés.length + ' échec(s) : ' + b.ratés.join(', '));
        echecs += b.ratés.length;
    }
}

if (rien) {
    console.log('Rien à convertir — les deux dossiers ne contiennent que des WebP.');
    console.log('(« -- --force » les refait.)');
}

if (echecs) process.exit(1);
