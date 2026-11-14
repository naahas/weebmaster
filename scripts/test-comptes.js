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
// `pseudoAPoser(duJeu, duFournisseur, existant)` rend LA CHAINE A ECRIRE,
// ou `null` quand il n y a rien a faire.

// Le nom du fournisseur n est qu une AMORCE, au tout premier login.
verif('compte neuf, pas de pseudo de jeu : on amorce avec le fournisseur',
    'nahass#0', c.pseudoAPoser(null, 'nahass#0', null));
verif('compte neuf, ligne vide ( chaine )',
    'nahass#0', c.pseudoAPoser(null, 'nahass#0', ''));
verif('compte neuf AVEC un pseudo de jeu : c est lui qu on pose',
    'Naahas', c.pseudoAPoser('Naahas', 'nahass#0', null));

// ⚠️ LE DEFAUT D ORIGINE, ET IL RESTE FERME : passe l amorce, le nom du
// fournisseur ne doit PLUS JAMAIS revenir. Un joueur qui a choisi son pseudo
// ne doit pas le voir redevenir « nahass#0 » a chaque reconnexion — il ne
// comprendrait meme pas d ou ca vient.
verif('⚠️ le fournisseur ne revient JAMAIS sur un compte qui a deja un pseudo',
    null, c.pseudoAPoser(null, 'nahass#0', 'Naahas'));

// ⚠️ CE QUI A CHANGE : le pseudo du jeu se RESYNCHRONISE. Avant, il n etait
// jamais envoye au serveur — la colonne restait figee sur le nom Discord du
// premier jour et le panneau montrait un pseudo que plus personne ne portait.
verif('⚠️ le pseudo du jeu a change : on le reecrit',
    'Senpai174', c.pseudoAPoser('Senpai174', 'nahass#0', 'Naahas'));
verif('⚠️ il n a PAS change : on n ecrit rien',
    null, c.pseudoAPoser('Naahas', 'nahass#0', 'Naahas'));

verif('rien a proposer du tout', null, c.pseudoAPoser(null, null, 'Naahas'));
verif('rien a proposer et rien en base', null, c.pseudoAPoser(null, null, null));
verif('pseudo refuse par le tamis (chaine vide)', null, c.pseudoAPoser('', '', null));

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

console.log('\n=== 4. Le bareme d XP ===');
// ⚠️ Le bonus S AJOUTE a l xp de base, il ne la remplace pas. C est la seule
// facon de lire le tableau, et la lire autrement diviserait par deux ce que
// rapporte toute partie gagnee — sans rien casser nulle part.
verif('Rush gagné à 4 = 80 + 150', 230, c.xpDeLaPartie('rush', { gagnant: true, joueurs: 4 }).xp);
verif('Classique gagné à 8 = 100 + 300', 400, c.xpDeLaPartie('classic', { gagnant: true, joueurs: 8 }).xp);
verif('BombAnime gagné à 4 = 25 + 75', 100, c.xpDeLaPartie('bombanime', { gagnant: true, joueurs: 4 }).xp);
verif('Collect gagné à 4 = 100 + 200', 300, c.xpDeLaPartie('collect', { gagnant: true, joueurs: 4 }).xp);
// ⚠️ Collect plafonne a CINQ joueurs : a seuil 4, la fenetre ou une victoire
// paye n aurait fait que deux valeurs sur quatre, et la partie mediane s y
// joue a deux. C est le plafond du mode qui decide du seuil, pas l habitude.
verif('⚠️ Collect paye dès 3 (son plafond est à 5)', 300, c.xpDeLaPartie('collect', { gagnant: true, joueurs: 3 }).xp);
verif('⚠️ mais pas à 2', 100, c.xpDeLaPartie('collect', { gagnant: true, joueurs: 2 }).xp);
verif('Codanime gagné à 4 = 50 + 125', 175, c.xpDeLaPartie('codanime', { gagnant: true, joueurs: 4 }).xp);
verif('Ascension gagné à 4 = 100 + 225', 325, c.xpDeLaPartie('ascension', { gagnant: true, joueurs: 4 }).xp);

// ⚠️ LE PLANCHER NE BORNE QUE LE BONUS. Rush et Ascension se jouent seuls :
// un plancher pose sur TOUTE l xp aurait rendu le solo sterile, alors que
// c est par la qu on decouvre le site.
verif('⚠️ Rush joué SEUL rapporte quand même', 80, c.xpDeLaPartie('rush', { gagnant: false, joueurs: 1 }).xp);
verif('⚠️ Ascension jouée SEULE rapporte quand même', 100, c.xpDeLaPartie('ascension', { gagnant: false, joueurs: 1 }).xp);
verif('⚠️ gagner à 2 ne paye AUCUN bonus', 80, c.xpDeLaPartie('rush', { gagnant: true, joueurs: 2 }).xp);
verif('⚠️ gagner à 3 non plus (seuil = 4)', 80, c.xpDeLaPartie('rush', { gagnant: true, joueurs: 3 }).xp);
verif('⚠️ Classique à 7 : pas de bonus (seuil = 8)', 100, c.xpDeLaPartie('classic', { gagnant: true, joueurs: 7 }).xp);

// ⚠️ Le compteur « Victoires » suit LE BONUS, pas le classement : un profil
// a 30 victoires dont l xp n a jamais bouge n aurait aucune explication.
verif('le compteur de victoires suit le bonus (à 4)', true, c.xpDeLaPartie('rush', { gagnant: true, joueurs: 4 }).victoire);
verif('⚠️ et ne bouge pas sous le seuil', false, c.xpDeLaPartie('rush', { gagnant: true, joueurs: 3 }).victoire);
verif('un perdant n a jamais de victoire', false, c.xpDeLaPartie('classic', { gagnant: false, joueurs: 12 }).victoire);

// ⚠️ `rivalry` n est pas un mode, c est le Format du quiz. Un ecart ferait
// choisir le Format pour l xp plutot que pour la partie.
verif('⚠️ rivalry = classic, au point près', c.XP_MODES.classic, c.XP_MODES.rivalry);

// ⚠️ Un mode sans ligne doit payer PEU, jamais RIEN : a zero, le joueur
// verrait son xp s arreter sans pouvoir dire depuis quand.
verif('⚠️ un mode inconnu tombe sur le défaut', 175, c.xpDeLaPartie('pizza', { gagnant: true, joueurs: 9 }).xp);
verif('un mode inconnu, sans victoire', 50, c.xpDeLaPartie('pizza', { gagnant: false, joueurs: 9 }).xp);
verif('aucun argument ne fait pas tomber', 50, c.xpDeLaPartie('codanime').xp);

// ⚠️ Chaque mode que `recordFinishedGame` connaît doit avoir sa ligne. Sans
// ce controle, un mode ajoute demain paierait le defaut en silence.
const MODES_DU_JEU = ['classic', 'rivalry', 'bombanime', 'rush', 'ascension', 'collect', 'choice', 'codanime'];
verif('⚠️ les 8 modes du jeu ont leur ligne', [], MODES_DU_JEU.filter((m) => !c.XP_MODES[m]));
verif('⚠️ … et chacune porte sa durée minimale', [], MODES_DU_JEU.filter((m) => !c.XP_MODES[m].duree));

console.log('\n=== 5. La durée minimale d une partie ===');
// ⏱️ Ce qui se fermait : quatre modes terminent la partie sur-le-champ quand
// il ne reste qu un joueur, et Codanime se suicide sur l assassin en 25 s.
verif('⚠️ Collect fini en 10 s par un départ : refusé', false, c.partieAssezLongue('collect', 10));
verif('⚠️ BombAnime fini en 10 s par un départ : refusé', false, c.partieAssezLongue('bombanime', 10));
verif('⚠️ Codanime suicidé sur l assassin (25 s) : refusé', false, c.partieAssezLongue('codanime', 25));
verif('⚠️ Classique à 2 sans réponse (20 s) : refusé', false, c.partieAssezLongue('classic', 20));
verif('⚠️ Ascension abandonnée (10 s) : refusé', false, c.partieAssezLongue('ascension', 10));

// ⚠️ Et ce qu il ne faut SURTOUT pas fermer : la manche de Rush la plus
// courte que le salon propose vaut 30 s. Un plancher global à 60 s aurait
// éteint l xp d un réglage parfaitement normal.
verif('⚠️ une VRAIE manche de Rush à 30 s passe', true, c.partieAssezLongue('rush', 30));
verif('une manche de Rush à 60 s passe', true, c.partieAssezLongue('rush', 60));
verif('un BombAnime de 2 min passe', true, c.partieAssezLongue('bombanime', 120));
verif('un Collect de 2 min 30 passe', true, c.partieAssezLongue('collect', 150));
verif('un Classique de 5 min passe', true, c.partieAssezLongue('classic', 300));

// Les bords exacts, pour que personne ne les déplace sans le voir.
verif('le seuil est INCLUSIF (collect à 50)', true, c.partieAssezLongue('collect', 50));
verif('… et 49 ne passe pas', false, c.partieAssezLongue('collect', 49));

// ⚠️ Une durée absente vaut zéro, donc REFUSE. C est le bon côté pour se
// tromper : un chemin qui oublierait de la passer cesserait de payer, au
// lieu d ouvrir un robinet que personne ne verrait couler.
verif('⚠️ durée absente : refusé', false, c.partieAssezLongue('rush', undefined));
verif('⚠️ durée NaN : refusé', false, c.partieAssezLongue('rush', 'bonjour'));
verif('⚠️ durée négative : refusé', false, c.partieAssezLongue('rush', -300));
verif('⚠️ un mode inconnu prend le plancher le plus HAUT', false, c.partieAssezLongue('pizza', 59));
verif('… et passe au-delà', true, c.partieAssezLongue('pizza', 60));

console.log(`\n${ko ? '❌' : '✅'} ${ok} verifications passees, ${ko} echouees\n`);
process.exit(ko ? 1 : 0);
