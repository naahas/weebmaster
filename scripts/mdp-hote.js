// ── Mesure temporaire ──
// Le mode Classique ne s'ouvre qu'avec le mot de passe de l'ancien panneau
// d'administration. Les suites ouvrent des salons Classique : il leur faut donc
// ce mot de passe. Les scripts de test ne chargent pas `.env` (seul le serveur
// le fait), on le lit donc à la main.
//
// Le jour où la mesure est levée : supprimer ce fichier, le garde dans
// /admin/toggle-game et « demandeMdp » dans app.js.
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
