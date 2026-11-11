// ════════════════════════════════════════════════════════════════
// 🔑 npm run test:comptes — les deux decisions de la connexion
// ════════════════════════════════════════════════════════════════
//
// Sans serveur, sans base, sans reseau. Les deux regles eprouvees ici ne
// cassent RIEN A L ECRAN quand elles changent — c est exactement pour ca
// qu elles ont une suite :
//
//   1. QUELLE CLEF on sert au navigateur. Confondre anon et service_role
//      laisse le site marcher a l identique, en ouvrant la base entiere a qui
//      ouvre l onglet reseau. Aucun symptome, jamais.
//
//   2. QUAND on ecrit le pseudo. Le reposer a chaque connexion ferait revenir
//      « nahass#0 » par-dessus le pseudo choisi dans le jeu, a chaque fois,
//      sans que rien ne l explique au joueur.
//
// ⚠️ La suite ne lit AUCUN secret : elle fabrique ses propres jetons d essai.

require('dotenv').config();
const c = require('../server-comptes');

let ok = 0, ko = 0;
const verif = (nom, attendu, vu) => {
    const bon = JSON.stringify(attendu) === JSON.stringify(vu);
    console.log(`  ${bon ? '✅' : '❌'} ${nom}` + (bon ? '' : `  (attendu ${JSON.stringify(attendu)}, vu ${JSON.stringify(vu)})`));
    bon ? ok++ : ko++;
};

// Un faux JWT : seule la charge du milieu compte, la signature n est jamais
// regardee par `natureDeLaClef` — elle ne fait que LIRE le role annonce.
const jwt = (role) => 'x.' + Buffer.from(JSON.stringify({ role })).toString('base64') + '.y';

console.log('\n=== 1. Quelle clef sert-on au navigateur ? ===');
verif('un JWT « anon » est accepte', 'anon', c.natureDeLaClef(jwt('anon')));
verif('un JWT « service_role » est RECONNU', 'service_role', c.natureDeLaClef(jwt('service_role')));
verif('la nouvelle clef publique', 'anon', c.natureDeLaClef('sb_publishable_abc123'));
verif('la nouvelle clef secrete est RECONNUE', 'service_role', c.natureDeLaClef('sb_secret_abc123'));
verif('une clef absente', 'absente', c.natureDeLaClef(''));
verif('une clef absente (undefined)', 'absente', c.natureDeLaClef(undefined));
verif('du n importe quoi', 'inconnue', c.natureDeLaClef('bonjour'));
verif('un JWT sans role', 'inconnue', c.natureDeLaClef(jwt(undefined)));

console.log('\n=== 2. Quand ecrit-on le pseudo ? ===');
verif('premier login : on pose celui du fournisseur', true, c.pseudoAPoser('nahass#0', null));
verif('premier login, ligne vide ( chaine )', true, c.pseudoAPoser('Adem', ''));
verif('⚠️ reconnexion : le pseudo du JEU gagne', false, c.pseudoAPoser('nahass#0', 'Naahas'));
verif('rien a proposer : on ne touche a rien', false, c.pseudoAPoser(null, 'Naahas'));
verif('rien a proposer et rien en base', false, c.pseudoAPoser(null, null));
verif('pseudo refuse par le tamis (chaine vide)', false, c.pseudoAPoser('', null));

console.log('\n=== 3. Ce qui part vraiment au navigateur ===');
const cfg = c.configPourNavigateur();
if (!cfg.actif) {
    console.log('  ⏭️  connexion eteinte dans cet environnement — rien a verifier');
} else {
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '§aucune§';
    verif('la service_role ne fuit pas', false, JSON.stringify(cfg).includes(service));
    verif('on ne sert que ce qu il faut', ['actif', 'url', 'cle'], Object.keys(cfg));
    verif('la clef servie est bien une « anon »', 'anon', c.natureDeLaClef(cfg.cle));
}

console.log(`\n${ko ? '❌' : '✅'} ${ok} verifications passees, ${ko} echouees\n`);
process.exit(ko ? 1 : 0);
