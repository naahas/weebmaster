// ══════════════════════════════════════════════════════════════
// 🔒 Les images de jeu, servies sous un jeton
// ══════════════════════════════════════════════════════════════
//
// Le nom d'un fichier disait la réponse : « naruto.png » sous un portrait qu'on
// doit nommer, c'est la solution écrite dans le DOM. Les images des modes où
// l'image EST la question voyagent donc sous un jeton, que le serveur seul sait
// retourner en chemin.
//
// Le sel est tiré à chaque démarrage : un jeton relevé aujourd'hui ne vaudra
// plus rien demain. Le prix est un cache navigateur perdu à chaque redéploiement
// — le dyno se recycle de toute façon tous les jours.
//
// Les fichiers restent servis en statique sous leur vrai nom : pour en tirer
// quelque chose, il faudrait déjà connaître le nom, c'est-à-dire la réponse.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SEL = crypto.randomBytes(16).toString('hex');
const RACINE = path.join(__dirname, 'src', 'img');

const parJeton = new Map();    // jeton → { famille, relatif }
const parChemin = new Map();   // 'famille/relatif' → jeton

const signalees = new Set();

// Recense un dossier d'images. À appeler une fois au chargement du module qui
// s'en sert : un fichier ajouté ensuite ne sera pas connu.
function recenser(famille) {
    const racine = path.join(RACINE, famille);

    (function parcourir(dossier, prefixe) {
        let entrees;
        try { entrees = fs.readdirSync(dossier, { withFileTypes: true }); }
        catch (e) { return; }
        for (const e of entrees) {
            const relatif = prefixe ? prefixe + '/' + e.name : e.name;
            if (e.isDirectory()) { parcourir(path.join(dossier, e.name), relatif); continue; }
            const jeton = crypto.createHash('sha256')
                .update(SEL + famille + '/' + relatif).digest('hex').slice(0, 20);
            parJeton.set(jeton, { famille, relatif });
            parChemin.set(famille + '/' + relatif, jeton);
        }
    })(racine, '');
}

function connait(famille, nom) {
    return parChemin.has(famille + '/' + nom);
}

// Un fichier ajouté après le démarrage n'est pas au recensement : il passe alors
// en clair plutôt que de laisser un cadre vide. Mieux vaut une fuite visible
// qu'une image manquante — et le journal le dit une fois.
function urlImage(famille, nom) {
    if (!nom) return nom;
    const jeton = parChemin.get(famille + '/' + nom);
    if (jeton) return '/pic/' + jeton;

    const cle = famille + '/' + nom;
    if (!signalees.has(cle)) {
        signalees.add(cle);
        console.warn('⚠️ Image hors recensement, servie en clair — ' + cle);
    }
    return '/' + cle;
}

function cheminImage(jeton) {
    return parJeton.get(jeton) || null;
}

// Le chemin absolu à servir, ou null si le jeton ne dit rien
function fichierPourJeton(jeton) {
    const cible = parJeton.get(jeton);
    if (!cible) return null;
    return path.join(RACINE, cible.famille, cible.relatif);
}

module.exports = { recenser, connait, urlImage, cheminImage, fichierPourJeton };
