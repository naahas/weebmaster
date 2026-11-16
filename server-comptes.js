// ════════════════════════════════════════════════════════════════
// 🔑 server-comptes.js — la connexion par Discord et Google
// ════════════════════════════════════════════════════════════════
//
// ⚠️ LE COMPTE N'EST JAMAIS REQUIS POUR JOUER. C'est la these de la v2 et
// l avantage du site sur ses concurrents : un viewer colle un lien, tape un
// pseudo, il joue. Tout ce fichier doit pouvoir TOMBER sans empecher une
// seule partie — d ou les `actif: false` un peu partout plutot que des
// exceptions.
//
// Le schema de la table est dans docs/comptes.sql, les clics de configuration
// dans docs/comptes-providers.md.
//
// ════════════════════════════════════════════════════════════════
// LES DEUX CLEFS, ET POURQUOI IL Y A UN GARDE-FOU AU DEMARRAGE
// ════════════════════════════════════════════════════════════════
// `SUPABASE_SERVICE_ROLE_KEY` ouvre TOUTE la base en ignorant RLS. Elle vit
// dans dbs.js et ne sort jamais du serveur.
// `SUPABASE_ANON_KEY` est faite pour le navigateur : RLS s applique, et la
// seule politique de `comptes` est « chacun lit sa ligne ».
//
// Les deux se ressemblent, tiennent sur une ligne, et se collent dans la meme
// page de configuration Heroku. Une confusion ne casse RIEN A L ECRAN : le
// site marcherait exactement pareil, en servant la base entiere a quiconque
// ouvre l onglet reseau. C est la panne la plus chere possible et la moins
// visible, donc on la refuse AU DEMARRAGE plutot que d esperer.

const { supabase } = require('./dbs');

const URL_SUPABASE = process.env.SUPABASE_URL || '';
const CLE_PUBLIQUE = process.env.SUPABASE_ANON_KEY || '';

// La table peut ne pas exister (SQL pas encore passe) : on le retient apres le
// premier refus plutot que de reessayer a chaque connexion. Meme esprit que
// `colonneReglagesOk` pour l historique.
let tableComptesOk = true;

// ════════════════════════════════════════════════════════════════
// ⚠️ LES DEUX COLONNES ARRIVEES APRES LA TABLE
// ════════════════════════════════════════════════════════════════
// `titre` et `pseudo_impose` n existaient pas au depart. Les NOMMER dans un
// `select` alors qu elles manquent ne degrade rien : ca fait echouer la
// REQUETE ENTIERE (Postgres 42703). Resultat si le SQL n a pas ete passe en
// production : plus de profil du tout, plus d xp credite, et rien a l ecran
// pour le dire — la panne la plus chere possible et la moins visible.
//
// On retient donc leur absence apres le PREMIER refus et l on repart sur les
// colonnes d origine. Le jeu tourne alors a l identique, sans titre special
// ni pseudo impose. Meme garde-fou que `colonneReglagesOk` pour l historique,
// et pour la meme raison : une colonne ajoutee apres coup se deploie toujours
// en deux temps.
let colonnesPanneauOk = null;
const CHAMPS_BASE = 'id, pseudo, avatar, xp, parties, victoires';
const CHAMPS_PLUS = CHAMPS_BASE + ', titre, pseudo_impose, rubis, titres, titre_prefixe, titre_suffixe';
const champsProfil = () => (colonnesPanneauOk === false ? CHAMPS_BASE : CHAMPS_PLUS);

// Rend `true` si l erreur vient de ces colonnes — l appelant doit alors
// reessayer sans elles. Ne se plaint qu UNE fois.
function colonnesManquantes(error) {
    if (!error || error.code !== '42703') return false;
    if (colonnesPanneauOk !== false) {
        colonnesPanneauOk = false;
        console.error('🚨 Colonnes « titre » / « pseudo_impose » absentes de « comptes » — passe docs/comptes.sql.');
        console.error('   Le jeu tourne, mais le panneau ne pourra ni imposer un pseudo ni donner un titre.');
    }
    return true;
}

// ════════════════════════════════════════════════════════════════
// 🔍 Quelle clef nous a-t-on donnee ?
// ════════════════════════════════════════════════════════════════
// Supabase a DEUX generations de clefs et il faut tenir les deux :
//   - les anciennes sont des JWT, dont la charge porte `role` ;
//   - les nouvelles sont `sb_publishable_…` (navigateur) et `sb_secret_…`
//     (serveur), qui ne sont pas des JWT du tout.
// ⚠️ On ne renvoie JAMAIS la clef elle-meme, seulement sa nature : cette
// fonction sert aux messages de demarrage, qui finissent dans les journaux
// d Heroku.
function natureDeLaClef(cle) {
    if (!cle) return 'absente';
    if (cle.startsWith('sb_publishable_')) return 'anon';
    if (cle.startsWith('sb_secret_')) return 'service_role';
    const morceaux = cle.split('.');
    if (morceaux.length !== 3) return 'inconnue';
    try {
        const charge = JSON.parse(
            Buffer.from(morceaux[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
        );
        return charge.role || 'inconnue';
    } catch (e) {
        return 'inconnue';
    }
}

// ⚠️ Appele au demarrage. Il ne fait PAS tomber le serveur — le jeu doit
// tourner sans comptes —, mais il refuse d allumer la connexion plutot que de
// servir une clef dangereuse.
function controleDemarrage() {
    if (!URL_SUPABASE) {
        console.log('🔑 Comptes : eteints (SUPABASE_URL manque)');
        return false;
    }
    const nature = natureDeLaClef(CLE_PUBLIQUE);
    if (nature === 'absente') {
        console.log('🔑 Comptes : eteints (SUPABASE_ANON_KEY manque). Le jeu tourne, sans connexion.');
        return false;
    }
    if (nature === 'service_role') {
        // ⚠️ LE CAS QUI JUSTIFIE TOUT CE FICHIER. On refuse, bruyamment.
        console.error('');
        console.error('🚨🚨🚨 SUPABASE_ANON_KEY CONTIENT LA CLEF service_role 🚨🚨🚨');
        console.error('   Elle ouvre TOUTE la base en ignorant RLS, et cette variable');
        console.error('   est servie au NAVIGATEUR. La connexion reste eteinte.');
        console.error('   -> Supabase > Settings > API > clef « anon / public ».');
        console.error('');
        return false;
    }
    if (nature !== 'anon') {
        console.error(`🚨 SUPABASE_ANON_KEY n est pas une clef « anon » (role lu : ${nature}). Connexion eteinte.`);
        return false;
    }
    console.log('🔑 Comptes : connexion Discord / Google prete');
    return true;
}

const ACTIF = controleDemarrage();

// ════════════════════════════════════════════════════════════════
// 📤 Ce que le navigateur recoit
// ════════════════════════════════════════════════════════════════
// ⚠️ La clef publique n est PAS ecrite en dur dans app.js, bien qu elle soit
// publique par conception. Le depot est public : une clef commitee ne se
// change plus sans reecrire l historique. Servie depuis l environnement, elle
// se fait tourner sans toucher au code.
function configPourNavigateur() {
    if (!ACTIF) return { actif: false };
    return { actif: true, url: URL_SUPABASE, cle: CLE_PUBLIQUE };
}

// ════════════════════════════════════════════════════════════════
// ✅ Verifier un jeton — LE SERVEUR EST AUTORITAIRE
// ════════════════════════════════════════════════════════════════
// Le client annonce « je suis connecte ». On ne le croit pas : on demande a
// Supabase qui est le porteur de ce jeton. Sans ca, une page bricolee se
// decernerait le losange toute seule, et le signe ne vaudrait plus rien.
//
// ℹ️ On interroge /auth/v1/user plutot que de verifier la signature nous-memes.
// C est un aller-retour, mais il n a lieu QU UNE FOIS par connexion de socket,
// et il nous epargne de suivre la rotation des clefs de signature — dont
// Supabase a change l algorithme en cours de route.
async function verifierJeton(jeton) {
    if (!ACTIF || !jeton || typeof jeton !== 'string') return null;
    // Une borne large : un jeton Supabase fait ~800 caracteres. Au-dela, ce
    // n est pas un jeton, et rien ne sert d aller le demander au reseau.
    if (jeton.length > 4000) return null;

    try {
        const r = await fetch(`${URL_SUPABASE}/auth/v1/user`, {
            headers: { apikey: CLE_PUBLIQUE, Authorization: `Bearer ${jeton}` },
            signal: AbortSignal.timeout(5000),
        });
        if (!r.ok) return null;
        const u = await r.json();
        if (!u || !u.id) return null;
        const m = u.user_metadata || {};
        return {
            id: u.id,                                   // ⚠️ DEVIENT le playerId
            email: u.email || null,
            fournisseur: (u.app_metadata && u.app_metadata.provider) || null,
            // Le nom affiche chez le fournisseur. Les deux n emploient pas le
            // meme champ, et Discord en remplit plusieurs : on prend le
            // premier qui existe. ⚠️ Il sort d ici BRUT — c est l appelant qui
            // le passe au tamis, voir `identifier`.
            nomFournisseur: m.full_name || m.name || m.user_name || m.preferred_username || null,
        };
    } catch (e) {
        // Reseau coupe, Supabase en vrac : on refuse la connexion, on ne
        // casse pas la partie. Le joueur reste un invite.
        return null;
    }
}

// ════════════════════════════════════════════════════════════════
// ✍️ La regle du pseudo, isolee pour etre eprouvable sans base
// ════════════════════════════════════════════════════════════════
// « Sème au premier login, ne reprends jamais ensuite. »
//
// Elle tient en une ligne mais c est elle qui decide de ce que le joueur VOIT
// s afficher a chaque reconnexion, donc elle vit a part plutot qu enfouie dans
// une requete : on peut la lire, et `npm run test:comptes` peut la rejouer
// sans toucher a la base de production.
// ⚠️ LA REGLE A CHANGE : le pseudo du jeu se RESYNCHRONISE maintenant.
//
// Avant, on l ecrivait au tout premier login et plus jamais. L intention
// etait bonne — empecher « nahass#0 » de revenir ecraser le pseudo choisi
// dans le jeu a chaque reconnexion — mais le resultat ne l etait pas : le
// pseudo du jeu n etait JAMAIS envoye au serveur, donc il ne « gagnait »
// pas, il n arrivait simplement pas. La colonne restait figee sur le nom
// Discord du premier jour, et le panneau montrait un pseudo que plus
// personne ne portait.
//
// Rend LA CHAINE A ECRIRE, ou `null` quand il n y a rien a faire. Pure,
// donc rejouable sans base — voir `npm run test:comptes`.
function pseudoAPoser(duJeu, duFournisseur, existant) {
    // Celui du JEU gagne, et il se reecrit des qu il change. Le nom du
    // fournisseur ne sert QUE d amorce, au tout premier login, quand le
    // compte n a encore rien : passe cette amorce, il ne doit plus jamais
    // revenir — c est le defaut d origine, et il reste interdit.
    const voulu = duJeu || (existant ? null : duFournisseur);
    if (!voulu) return null;
    // ⚠️ Rien a changer : on ne reecrit pas. Un upsert par connexion de
    // socket, pour reposer la meme chaine, ferait une ecriture inutile a
    // chaque rafraichissement de page.
    if (voulu === existant) return null;
    return voulu;
}

// ════════════════════════════════════════════════════════════════
// 💾 La ligne de profil
// ════════════════════════════════════════════════════════════════
// ⚠️ Ecrite avec la clef service_role (dbs.js), donc RLS ne s applique pas :
// c est VOULU. Le joueur ne doit jamais pouvoir ecrire son XP lui-meme.
//
// ⚠️ `avatar` et `pseudo` ne sont ecrits QUE s ils sont fournis. Un `undefined`
// passe a Supabase effacerait la valeur existante — un joueur qui se reconnecte
// sans avoir encore choisi d avatar perdrait le sien.
async function toucherCompte(idCompte, { pseudo, pseudoFournisseur, avatar } = {}) {
    if (!ACTIF || !tableComptesOk || !idCompte) return null;

    const ligne = { id: idCompte, vu_le: new Date().toISOString() };
    if (avatar) ligne.avatar = avatar;

    try {
        // ⚠️ ON LIT AVANT D ECRIRE, pour savoir ce que le compte porte DEJA.
        // Sans cette lecture on ne saurait pas si le pseudo a change, et l on
        // reecrirait la meme chaine a chaque rafraichissement de page.
        const { data: deja, error: eLecture } = await supabase
            .from('comptes').select('pseudo').eq('id', idCompte).maybeSingle();
        if (eLecture && eLecture.code === '42P01') {
            tableComptesOk = false;
            console.error('🚨 La table « comptes » n existe pas — passe docs/comptes.sql. Connexion sans profil.');
            return null;
        }
        const aEcrire = pseudoAPoser(pseudo, pseudoFournisseur, deja && deja.pseudo);
        if (aEcrire) ligne.pseudo = aEcrire;

        // ⚠️ Pas de `niveau` : il se deduit de l xp (src/script/niveaux.js).
        // `titre` et `pseudo_impose`, eux, SONT des colonnes — ils ne se
        // deduisent de rien, ils se posent a la main depuis le panneau. Et on
        // retombe sur les colonnes d origine si le SQL n a pas ete passe.
        let { data, error } = await supabase
            .from('comptes').upsert(ligne, { onConflict: 'id' })
            .select(champsProfil()).single();
        if (colonnesManquantes(error)) {
            ({ data, error } = await supabase
                .from('comptes').upsert(ligne, { onConflict: 'id' })
                .select(CHAMPS_BASE).single());
        }
        if (error) {
            // 42P01 = la table n existe pas. Le SQL de docs/comptes.sql n a pas
            // ete passe : on le dit UNE fois et on arrete d essayer.
            if (error.code === '42P01') {
                tableComptesOk = false;
                console.error('🚨 La table « comptes » n existe pas — passe docs/comptes.sql. Connexion sans profil.');
            }
            return null;
        }
        return data;
    } catch (e) {
        return null;
    }
}

// ════════════════════════════════════════════════════════════════
// 🎯 Le point d entree du serveur
// ════════════════════════════════════════════════════════════════
// Rend `null` pour un invite, et sinon de quoi allumer le losange.
//
// ⚠️ C EST ICI QUE SE JOUE LA SEULE REGLE QUI COMPTE : le `playerId` d un
// joueur connecte est l identifiant Supabase, et il vient du JETON VERIFIE,
// jamais du champ `playerId` annonce par le client. Les croire egaux sur
// parole suffirait a se faire passer pour n importe quel inscrit.
// ════════════════════════════════════════════════════════════════
// ✍️ LA REGLE DU PSEUDO : semé au premier login, jamais repris ensuite
// ════════════════════════════════════════════════════════════════
// Au tout premier login, le compte n a pas de pseudo : on prend celui du
// fournisseur, faute de mieux, et c est un bon defaut — « Adem » vaut mieux
// qu un pseudo tire au sort.
//
// ⚠️ MAIS PLUS JAMAIS ENSUITE. Un joueur qui a choisi son pseudo dans le jeu
// ne doit pas le voir redevenir « nahass#0 » a chaque reconnexion : il ne
// comprendrait meme pas d ou ca vient, et le changerait a nouveau, en boucle.
// Le pseudo du JEU gagne toujours sur celui du fournisseur.
//
// ⚠️ Et il passe par le meme tamis que les autres (`nettoyer`, qui est
// `pseudoPropre` cote serveur). Un pseudo Discord peut etre deplace lui aussi,
// et il s afficherait sur l ecran d un streamer devant son audience. Le fait
// qu il vienne d un fournisseur serieux ne garantit rien.
// ⚠️ La fonction est PASSEE EN PARAMETRE plutot qu importee : `pseudoPropre`
// vit dans server.js, qui requiert ce fichier — l importer ici ferait une
// boucle.
async function identifier(jeton, { pseudo, avatar, nettoyer } = {}) {
    const u = await verifierJeton(jeton);
    if (!u) return null;

    const tamis = typeof nettoyer === 'function' ? nettoyer : (x) => x;
    // ⚠️ Les deux passent par le MEME tamis, et le nom du fournisseur plus
    // encore que l autre : un pseudo Discord peut etre deplace lui aussi, et
    // il s afficherait sur l ecran d un streamer devant son audience. Le fait
    // qu il vienne d un fournisseur serieux ne garantit rien.
    // `pseudoPropre` rend une chaine vide pour un pseudo refuse : on ne pose
    // alors RIEN, et le joueur garde celui qu il avait.
    const duJeu = pseudo ? (tamis(pseudo) || null) : null;
    const duFournisseur = u.nomFournisseur ? (tamis(u.nomFournisseur) || null) : null;

    const profil = await toucherCompte(u.id, { pseudo: duJeu, pseudoFournisseur: duFournisseur, avatar });
    return {
        playerId: u.id,
        compte: true,
        fournisseur: u.fournisseur,
        // Le profil peut etre nul (table absente) : le losange s allume quand
        // meme, puisque le jeton, lui, est valide.
        profil: profil || null,
    };
}

// ════════════════════════════════════════════════════════════════
// 🎖️ LE BAREME D XP
// ════════════════════════════════════════════════════════════════
// Il s ecrit ICI et nulle part ailleurs. Le client ne recalcule jamais ce
// qu une partie a rapporte : il recoit un TOTAL et le dessine. C est la meme
// regle que partout sur ce projet — une valeur ecrite deux fois finit par
// diverger, et ici elle divergerait sur le profil des joueurs.
//
// ⚠️ `victoire` est un BONUS QUI S AJOUTE a `partie`, pas un remplacement.
// Une victoire en Rush vaut 80 + 150 = 230. Le lire comme un total diviserait
// par deux ce que rapporte une partie gagnee, sans rien casser nulle part —
// le genre d erreur qu on ne voit qu au bout d un mois de parties.
//
// ⚠️ `seuil` ne borne QUE le bonus de victoire, JAMAIS l xp de base. Rush et
// Ascension se jouent seuls, BombAnime a son bot : un plancher pose sur tout
// l xp aurait rendu le jeu en solo entierement sterile, alors que c est par
// la qu on decouvre le site. Mais « gagner » a deux ne veut rien dire, et
// c est exactement ce qu un joueur aurait envie de forcer — d ou la porte,
// posee la et seulement la.
//
// ⚠️ Le Classique est a HUIT, comme son plancher de lancement
// (`MIN_CLASSIQUE`, app.js). Ce n est pas une coincidence a corriger : c est
// le meme chiffre de produit, le quiz n est le quiz qu a partir de la. Les
// deux se changent ensemble ou pas du tout.
//
// ⏱️ `duree` est la DURÉE MINIMALE, en secondes, sous laquelle une partie ne
// rapporte RIEN — ni xp, ni victoire, ni même le « +1 partie ». Elle reste
// enregistrée dans l historique : c est le crédit qui saute, pas la trace.
//
// ⚠️ Elle est PAR MODE, et une valeur unique ne marcherait pas : une manche de
// Rush dure légitimement 30 s (c est un réglage du salon), donc un plancher
// global à 60 s aurait éteint l xp d un réglage normal — un bug déguisé en
// garde-fou. Chaque chiffre se lit contre la durée réelle de SON mode.
//
// Ce qu elle ferme, mesuré : quatre modes terminent la partie sur-le-champ
// quand il ne reste qu un joueur (BombAnime, Collect, Choice, et le Classique
// en vies à la question suivante). Deux onglets, l un part, l autre encaissait.
// Codanime se terminait en 25 s en désignant l assassin exprès. Toutes ces
// parties étaient bel et bien FINIES — elles n avaient juste pas été jouées.
//
// ⚠️ Ça ne couvre PAS le Rush : une manche farmée est une vraie manche de
// 30 s, la durée ne les distingue pas. Lui demande l autre levier (un plafond
// quotidien), qui n est pas posé.
//
// 💎 `rubis` / `rubisVictoire` : LA MONNAIE, sur la meme ligne que l xp.
//
// ⚠️ Deux baremes dans UNE table, et pas deux tables. Ils partagent `seuil`
// et `duree` — les memes regles exactement, c est ce qu Adem a demande —, et
// deux tables auraient voulu dire deux fois ces deux colonnes, donc deux
// occasions de les desaccorder. Une partie trop courte ne rapporte ni xp ni
// rubis ; un bonus refuse l est pour les deux.
//
// ⚠️ Et la monnaie est ENVIRON CINQ FOIS l xp, volontairement : ce sont deux
// echelles qui ne se comparent pas. L xp dit « combien j ai joue » et se
// compte en centaines ; les rubis achetent des titres dont les prix de la v1
// allaient de 500 a 260 000. Les mettre a la meme echelle aurait rendu la
// boutique inatteignable ou l xp absurde.
const XP_MODES = {
    // ⚠️ 500 + 1500 = 2000. Adem a ecrit « +3000 si gagnee (donc 2000
    // cumulees) » — les deux ne peuvent pas etre vraies ensemble, et c est
    // la somme qu il a donnee qui decide : 3500 aurait fait du Classique le
    // double de Codanime, qui culmine a 1700.
    classic:   { partie: 100, victoire: 300, seuil: 8, duree: 60, rubis: 500, rubisVictoire: 1500 },
    // ⚠️ `rivalry` n est pas un mode, c est le reglage Format du quiz. Meme
    // bareme, forcement : un ecart rendrait un camp plus payant qu un solo
    // sur exactement les memes questions, et l hote choisirait le Format
    // pour l xp plutot que pour la partie.
    rivalry:   { partie: 100, victoire: 300, seuil: 8, duree: 60, rubis: 500, rubisVictoire: 1500 },
    // ⏱️ 25 s et pas davantage : la manche la plus courte que le salon
    // propose vaut 30 s. Monter le plancher au-dessus éteindrait un réglage
    // parfaitement normal.
    rush:      { partie:  80, victoire: 150, seuil: 4, duree: 25, rubis: 300, rubisVictoire:  800 },
    bombanime: { partie:  25, victoire:  75, seuil: 4, duree: 45, rubis: 200, rubisVictoire:  500 },
    // ⚠️ Collect est le SEUL a trois, et c est son PLAFOND qui le decide :
    // le mode se joue a cinq au maximum. A quatre, la fenetre ou une victoire
    // paye n aurait fait que deux valeurs sur quatre, alors que la partie
    // mediane s y joue a deux. Le meme seuil que les autres aurait eteint le
    // bonus du mode presque partout.
    collect:   { partie: 100, victoire: 200, seuil: 3, duree: 50, rubis: 300, rubisVictoire:  700 },
    codanime:  { partie:  50, victoire: 125, seuil: 4, duree: 60, rubis: 700, rubisVictoire: 1000 },
    ascension: { partie: 100, victoire: 225, seuil: 4, duree: 60, rubis: 400, rubisVictoire: 1000 },
    // Choice n est pas encore ouvert au public (`soon: true` sur sa carte),
    // mais il se joue a la maison et il appelle `recordFinishedGame`. Sa
    // ligne est donc la : l oublier le ferait tomber sur le defaut en
    // silence, et personne ne s en apercevrait avant son ouverture.
    choice:    { partie:  50, victoire: 125, seuil: 4, duree: 60, rubis: 300, rubisVictoire:  700 },
};

// ⚠️ Un mode inconnu rapporte QUELQUE CHOSE plutot que rien. Le jour ou un
// mode est ajoute sans sa ligne, le defaut le fait payer peu — ca se remarque
// au bareme. Rendre zero le rendrait invisible : le joueur verrait son xp ne
// plus bouger sans pouvoir dire depuis quand.
// ⏱️ Et son plancher de durée est le plus HAUT, pas le plus bas : sur le
// barème on est généreux avec l inconnu, sur la durée on est strict. Un mode
// dont on ne sait rien pourrait se terminer en trois secondes.
const XP_DEFAUT = { partie: 50, victoire: 125, seuil: 4, duree: 60, rubis: 300, rubisVictoire: 700 };

// ⏱️ La partie a-t-elle duré assez pour compter ?
//
// À part de `xpDeLaPartie` exprès : l une répond « combien », l autre « est-ce
// que ça compte ». Les mélanger aurait donné une fonction qui rend 0 xp, et
// `crediterXpDeLaPartie` aurait quand même écrit « +1 partie » pour chacun —
// on aurait fermé le robinet de l xp en laissant gonfler le compteur de
// parties. Une partie trop courte ne laisse RIEN.
//
// ⚠️ `duree` est en SECONDES. Les sept modes la calculent déjà ainsi
// (`Math.floor((Date.now() - debut) / 1000)`), et Rush annonce la durée
// réglée de sa manche. Une valeur manquante vaut zéro, donc refuse : c est le
// bon côté pour se tromper — un chemin qui oublierait de la passer cesserait
// de payer, au lieu d ouvrir un robinet que personne ne verrait couler.
function partieAssezLongue(mode, duree) {
    if (SANS_LIMITES) return true;
    const b = XP_MODES[mode] || XP_DEFAUT;
    return (Number(duree) || 0) >= b.duree;
}

// ⏳ MISE AU POINT — LES DEUX PLANCHERS SONT LEVES HORS PRODUCTION : la duree
// minimale d une partie, et le nombre de joueurs qu exige le bonus de
// victoire. Sans ca, regler l ecran de gain demanderait une vraie partie a
// huit pendant une minute, a chaque essai — on ne met pas une animation au
// point a ce prix-la, et l on finirait par la regler « a peu pres ».
//
// ⚠️ C EST UN DEFAUT, ET PLUS UNE VARIABLE A POSER. Elle l a ete, et deux
// fois de suite le serveur de developpement a tourne sans elle : les parties
// d essai ne s ecrivaient nulle part, le profil restait a « 0 partie, 0
// victoire », et rien a l ecran ne disait pourquoi. Un interrupteur de mise
// au point qu on doit penser a allumer est un interrupteur qu on oublie. Il
// se lit donc a l envers, comme les bots de mise au point : ouvert en
// developpement, ferme en production, rien a poser.
//
// ⚠️ FERMEE EN PRODUCTION, et pas seulement deconseillee : laissee ouverte
// sur Heroku, elle paierait l xp PLEINE a toute partie de dix secondes, bonus
// de victoire en solo compris — exactement les six portes qu on a passe un
// chantier a fermer. `NODE_ENV` y vaut `production`, et c est deja lui qui
// ferme les bots : une seule chose a ne pas casser, pas deux.
//
// ⚠️ `XP_SANS_LIMITES=0` REMET LES PLANCHERS hors production. C est la seule
// facon d eprouver le bareme pour de vrai sur une machine de developpement,
// et `test:comptes` s en sert — il le pose LUI-MEME avant de charger ce
// fichier, parce qu un `const` lu au chargement ne se change plus apres.
//
// ⚠️ Elle est lue ICI, a la source, et non dans `crediterXpDeLaPartie` : les
// deux planchers vivent dans ce fichier, et un interrupteur pose plus haut en
// aurait laisse un des deux debout sans que rien ne le dise.
const SANS_LIMITES = process.env.NODE_ENV !== 'production'
    && process.env.XP_SANS_LIMITES !== '0';

// Pure : ni base, ni reseau, ni etat. C est la seule decision du bareme, donc
// c est celle que `npm run test:comptes` rejoue.
// ⚠️ Pure A INTERRUPTEUR ETEINT, ce qui est le cas de la suite : elle ne pose
// jamais `XP_SANS_LIMITES`. Le jour ou elle voudrait l eprouver, il faudra
// relancer le processus — un `const` lu au chargement ne se change pas.
function xpDeLaPartie(mode, { gagnant = false, joueurs = 0 } = {}) {
    const b = XP_MODES[mode] || XP_DEFAUT;
    const victoire = !!gagnant && (SANS_LIMITES || joueurs >= b.seuil);
    return {
        xp: b.partie + (victoire ? b.victoire : 0),
        // 💎 La monnaie suit EXACTEMENT les memes regles : meme seuil de
        // joueurs, meme duree minimale, meme bonus qui s AJOUTE. Un joueur ne
        // doit jamais avoir a retenir deux jeux de conditions.
        rubis: b.rubis + (victoire ? b.rubisVictoire : 0),
        // ⚠️ Le compteur « Victoires » du profil suit LE BONUS, pas le
        // classement : une victoire a deux ne rapporte rien, donc elle ne
        // s affiche pas non plus. Les deux ensemble disent la meme chose ;
        // les separer donnerait un profil a « 30 victoires » dont l xp
        // n aurait jamais bouge, et rien a l ecran pour l expliquer.
        victoire,
    };
}

// ════════════════════════════════════════════════════════════════
// 💰 Crediter la fin d une partie
// ════════════════════════════════════════════════════════════════
// `lignes` : [{ id, xp, victoire }] — un par joueur INSCRIT de la partie.
// Rend les profils a jour, pour que le serveur les renvoie a chacun.
//
// ⚠️ ON LIT PUIS ON ECRIT, en deux requetes, et pas une fonction SQL
// `xp = xp + n`. Le pas atomique serait plus juste, mais il demanderait une
// migration de plus — donc une etape de deploiement de plus, donc une
// occasion de plus de l oublier en production, ou l echec serait SILENCIEUX.
// La course qu on s autorise, c est qu un meme joueur termine DEUX parties
// dans la meme fraction de seconde : il faut etre dans deux salons a la fois
// et qu ils se terminent ensemble. Le prix, alors, est un credit perdu.
//
// ⚠️ Et une seule requete pour toute la table, jamais une par joueur : un
// Classique a quinze inscrits ferait trente allers-retours a la fin de chaque
// partie, sur la boucle que TOUS les salons partagent.
async function crediter(lignes) {
    if (!ACTIF || !tableComptesOk || !Array.isArray(lignes) || !lignes.length) return null;
    const ids = lignes.map((l) => l.id).filter(Boolean);
    if (!ids.length) return null;

    try {
        // ⚠️ `rubis` passe par le MEME repli que `titre` : la colonne est
        // arrivee apres, la nommer quand elle manque ferait echouer la
        // lecture entiere, donc plus d xp credite du tout.
        const avecRubis = colonnesPanneauOk !== false;
        let { data: avant, error: eLecture } = await supabase
            .from('comptes')
            .select('id, pseudo, xp, parties, victoires' + (avecRubis ? ', rubis' : ''))
            .in('id', ids);
        if (colonnesManquantes(eLecture)) {
            ({ data: avant, error: eLecture } = await supabase
                .from('comptes').select('id, pseudo, xp, parties, victoires').in('id', ids));
        }
        if (eLecture) {
            if (eLecture.code === '42P01') tableComptesOk = false;
            return null;
        }

        const parId = new Map((avant || []).map((r) => [r.id, r]));
        // ⚠️ On ne credite QUE des lignes qui existent deja. Un upsert sur un
        // identifiant inconnu creerait un compte fantome, sans pseudo ni
        // avatar, a partir d un `playerId` qu on n a pas verifie ici.
        const aEcrire = lignes
            .filter((l) => parId.has(l.id))
            .map((l) => {
                const r = parId.get(l.id);
                const ligne = {
                    id: l.id,
                    xp: (r.xp || 0) + (l.xp || 0),
                    parties: (r.parties || 0) + 1,
                    victoires: (r.victoires || 0) + (l.victoire ? 1 : 0),
                };
                // 💎 La monnaie, seulement si la colonne existe : sans ce
                // test, l upsert la nommerait et echouerait en entier — on
                // perdrait l xp AUSSI, pour une colonne accessoire.
                if (colonnesPanneauOk !== false) ligne.rubis = (r.rubis || 0) + (l.rubis || 0);
                // 🏷️ LA SECONDE COUCHE DE SYNCHRONISATION DU PSEUDO.
                //
                // La premiere est la connexion de socket. Celle-ci rattrape
                // le cas qui lui echappe : un joueur qui change de pseudo EN
                // COURS DE SESSION, sans recharger la page — sa socket est
                // deja enregistree, `register-authenticated` ne repassera
                // pas. Sans ce filet, la base garderait l ancien jusqu au
                // prochain rechargement, qui peut ne jamais venir.
                //
                // ⚠️ On n ecrit QUE si ca a change : la colonne part sinon
                // dans chaque upsert de fin de partie, pour rien.
                if (l.pseudo && l.pseudo !== r.pseudo) ligne.pseudo = l.pseudo;
                return ligne;
            });
        if (!aEcrire.length) return null;

        // ⚠️ `pseudo` et `avatar` sont ABSENTS de l objet, donc l upsert n y
        // touche pas : Postgres ne met a jour que les colonnes citees. Les y
        // mettre a `undefined` les effacerait.
        let { data, error } = await supabase
            .from('comptes').upsert(aEcrire, { onConflict: 'id' })
            .select(champsProfil());
        if (colonnesManquantes(error)) {
            ({ data, error } = await supabase
                .from('comptes').upsert(aEcrire, { onConflict: 'id' })
                .select(CHAMPS_BASE));
        }
        if (error) throw error;
        return data || null;
    } catch (e) {
        return null;
    }
}

// ════════════════════════════════════════════════════════════════
// 🛠️ LE PANNEAU — lire et corriger les comptes
// ════════════════════════════════════════════════════════════════
// ⚠️ TOUT CE QUI SUIT EST RESERVE A /admin, derriere `PANEL_ADMIN_CODE`, et
// les deux gestes destructeurs exigent EN PLUS `QUESTION_DELETE_CODE`. Rien
// ici ne doit etre appele depuis une route ouverte : ce sont les seules
// fonctions du fichier qui ECRIVENT sur un compte sans que le joueur ait fait
// quoi que ce soit.
//
// ⚠️ Et elles passent par `supabase` (service_role), donc RLS ne s applique
// pas. C est voulu et c est le seul moyen de lire la table entiere — la
// politique de `comptes` ne laisse voir a chacun que SA ligne.

// ⚠️ Pas de pagination : `toutesLesLignes` existe pour les tables qui
// grossissent (la banque a franchi les mille), mais un millier de COMPTES
// serait une tres bonne nouvelle qu on verrait venir de loin. Le plafond est
// pose a 1000 pour que la limite soit explicite plutot que silencieuse.
async function listerComptes() {
    if (!ACTIF || !tableComptesOk) return null;
    const lire = (champs) => supabase.from('comptes')
        .select(champs + ', cree_le, vu_le')
        .order('vu_le', { ascending: false })
        .limit(1000);

    let { data, error } = await lire(champsProfil());
    // ⚠️ Le panneau marche SANS les deux colonnes, en lecture seule sur ces
    // deux champs : mieux vaut une liste sans titres qu un onglet en erreur.
    if (colonnesManquantes(error)) ({ data, error } = await lire(CHAMPS_BASE));
    if (error) {
        if (error.code === '42P01') tableComptesOk = false;
        return null;
    }

    // 🔗 LE FOURNISSEUR — Discord, Google… Il n est PAS dans `comptes`, et on
    // n y ajoute pas de colonne pour lui : il vit deja dans `auth.users`, et
    // l y recopier ferait deux verites a tenir d accord le jour ou quelqu un
    // relie une seconde identite a son compte.
    //
    // ⚠️ `listUsers` PAGINE — 50 par page par defaut, en silence. Demander la
    // premiere page et s arreter marcherait tant qu il y a peu de monde, puis
    // les inscrits les plus anciens perdraient leur icone sans que rien ne le
    // signale. C est la meme maladie que le plafond des mille lignes de
    // PostgREST, et elle se repare de la meme facon : on tourne.
    const fournisseurs = new Map();
    try {
        for (let page = 1; page <= 40; page++) {
            const { data: u, error: eU } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
            const lot = (u && u.users) || [];
            if (eU || !lot.length) break;
            for (const x of lot) {
                fournisseurs.set(x.id, (x.app_metadata && x.app_metadata.provider) || null);
            }
            if (lot.length < 200) break;
        }
    } catch (e) {
        // Pas de fournisseur affiche, et c est tout : l onglet doit s ouvrir.
    }

    return (data || []).map((c) => Object.assign({}, c, { fournisseur: fournisseurs.get(c.id) || null }));
}

// Le panneau doit pouvoir DIRE que le SQL manque, plutot que de laisser
// cliquer sur un bouton qui echouera.
function colonnesPanneauPretes() { return colonnesPanneauOk !== false; }

// Un compte, par son identifiant. Sert aux routes qui doivent LIRE avant
// d ecrire — donner un titre demande de savoir ce qu il possede deja.
async function lireCompte(id) {
    if (!ACTIF || !tableComptesOk || !id) return null;
    let { data, error } = await supabase.from('comptes')
        .select(champsProfil()).eq('id', id).maybeSingle();
    if (colonnesManquantes(error)) {
        ({ data, error } = await supabase.from('comptes')
            .select(CHAMPS_BASE).eq('id', id).maybeSingle());
    }
    if (error) return null;
    return data || null;
}

// Pose, change ou efface un champ d un compte. `valeurs` ne contient que ce
// qu on touche — un champ absent n est pas ecrase.
async function majCompte(id, valeurs) {
    if (!ACTIF || !tableComptesOk || !id) return null;
    const ecrire = (champs) => supabase.from('comptes')
        .update(valeurs).eq('id', id)
        .select(champs + ', cree_le, vu_le').single();

    let { data, error } = await ecrire(champsProfil());
    // ⚠️ Le MEME repli que partout ailleurs, et il manquait ici : sans lui,
    // remettre les compteurs a zero echouait sur une base ou le SQL n avait
    // pas ete passe — l ECRITURE etait pourtant parfaitement valide, c est le
    // `select` de retour qui nommait deux colonnes absentes. Mesure : la
    // route rendait « Écriture impossible » alors qu elle n avait rien ecrit
    // de fautif.
    if (colonnesManquantes(error)) ({ data, error } = await ecrire(CHAMPS_BASE));
    if (error) return null;
    return data;
}

// ⚠️ SUPPRIMER POUR DE BON : on efface le COMPTE SUPABASE, pas seulement sa
// ligne de profil. Effacer la seule ligne de `comptes` ne supprimerait rien —
// l identite Supabase resterait, le joueur se reconnecterait et retrouverait
// une ligne neuve a zero. C est une remise a zero, pas une suppression, et
// confondre les deux dans un bouton nomme « Supprimer » serait un mensonge.
//
// Le `on delete cascade` de `comptes.id` fait partir le profil tout seul.
//
// ℹ️ Et ce n est PAS un bannissement : la personne peut se reconnecter avec
// le meme Discord et repartir d un compte neuf. Il n existe aucune liste
// noire sur ce projet, et ce bouton n en fabrique pas une.
async function supprimerCompte(id) {
    if (!ACTIF || !id) return { ok: false, erreur: 'Connexion aux comptes éteinte.' };
    try {
        const { error } = await supabase.auth.admin.deleteUser(id);
        if (error) return { ok: false, erreur: error.message };
        return { ok: true };
    } catch (e) {
        return { ok: false, erreur: e.message };
    }
}

module.exports = {
    ACTIF, configPourNavigateur, verifierJeton, identifier,
    xpDeLaPartie, partieAssezLongue, crediter,
    listerComptes, lireCompte, majCompte, supprimerCompte, colonnesPanneauPretes,
    // Exportes pour `npm run test:comptes` : ce sont les decisions qui se
    // rejouent sans base ni reseau, et celles qui coutent cher si elles
    // changent en silence.
    natureDeLaClef, pseudoAPoser, XP_MODES,
    // ⏳ Pour que le demarrage l annonce : un interrupteur de mise au point
    // qu on ne voit pas est un interrupteur qu on oublie allume.
    SANS_LIMITES,
};
