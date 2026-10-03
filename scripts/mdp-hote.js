// ── Vestige de la mesure temporaire, levée le 3 octobre 2026 ──
//
// Le mode Classique ne s'ouvrait qu'avec le mot de passe de l'ancien panneau
// d'administration. Il s'ouvre désormais à tout le monde, et se garde par un
// plancher de dix joueurs au lancement (`MIN_CLASSIQUE` dans app.js).
//
// ⚠️ CE FICHIER SURVIT, et ce n'est pas un oubli : DIX-NEUF suites l'importent
// et envoient encore `motDePasse` à `/admin/toggle-game`. Le serveur ignore
// désormais ce champ, donc elles marchent telles quelles — les toucher toutes
// pour retirer un champ inerte, c'est dix-neuf occasions de casser le filet
// qui garde le reste. Il rend `''` si la variable n'existe plus, et ça suffit.
//
// À nettoyer un jour, hors d'un chantier : retirer `motDePasse` des suites,
// puis ce fichier.
const fs = require('fs');
const path = require('path');

let mdp = process.env.ADMIN_PASSWORD || '';

if (!mdp) {
    try {
        const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
        const ligne = env.match(/^ADMIN_PASSWORD=(.*)$/m);
        if (ligne) mdp = ligne[1].trim();
    } catch (e) {
        // Pas de .env : le serveur refusera l'ouverture et le test le dira
        // clairement, plutôt que d'échouer sur un symptôme lointain.
    }
}

module.exports = mdp;
