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
function pseudoAPoser(demande, existant) {
    // Rien a proposer : on ne touche a rien.
    if (!demande) return false;
    // Le compte a DEJA un pseudo — celui du jeu. Il gagne toujours.
    if (existant) return false;
    return true;
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
async function toucherCompte(idCompte, { pseudo, avatar } = {}) {
    if (!ACTIF || !tableComptesOk || !idCompte) return null;

    const ligne = { id: idCompte, vu_le: new Date().toISOString() };
    if (avatar) ligne.avatar = avatar;

    try {
        // ⚠️ ON LIT AVANT D ECRIRE, et uniquement pour savoir si le compte est
        // NEUF. Sans cette lecture, l upsert reposerait le pseudo a chaque
        // connexion — « nahass#0 » reviendrait ecraser le pseudo choisi dans
        // le jeu, a chaque fois, sans que rien ne l explique au joueur.
        // Un aller-retour de plus, une seule fois par connexion : c est le
        // prix d un pseudo qui ne bouge pas tout seul.
        const { data: deja, error: eLecture } = await supabase
            .from('comptes').select('pseudo').eq('id', idCompte).maybeSingle();
        if (eLecture && eLecture.code === '42P01') {
            tableComptesOk = false;
            console.error('🚨 La table « comptes » n existe pas — passe docs/comptes.sql. Connexion sans profil.');
            return null;
        }
        if (pseudoAPoser(pseudo, deja && deja.pseudo)) ligne.pseudo = pseudo;

        const { data, error } = await supabase
            .from('comptes')
            .upsert(ligne, { onConflict: 'id' })
            // ⚠️ Pas de `niveau` ni de `titre` : ils se deduisent de l xp cote
            // client. Les stocker garantirait deux verites qui divergent le
            // jour ou le bareme change — et un bareme d xp change toujours.
            .select('id, pseudo, avatar, xp, parties, victoires')
            .single();
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

    let aPoser = pseudo;
    if (!aPoser && u.nomFournisseur) {
        const tamis = typeof nettoyer === 'function' ? nettoyer : (x) => x;
        // `pseudoPropre` rend une chaine vide pour un pseudo refuse : on ne
        // pose alors RIEN, et le joueur garde celui qu il avait.
        aPoser = tamis(u.nomFournisseur) || null;
    }

    const profil = await toucherCompte(u.id, { pseudo: aPoser, avatar });
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
const XP_MODES = {
    classic:   { partie: 100, victoire: 300, seuil: 8 },
    // ⚠️ `rivalry` n est pas un mode, c est le reglage Format du quiz. Meme
    // bareme, forcement : un ecart rendrait un camp plus payant qu un solo
    // sur exactement les memes questions, et l hote choisirait le Format
    // pour l xp plutot que pour la partie.
    rivalry:   { partie: 100, victoire: 300, seuil: 8 },
    rush:      { partie:  80, victoire: 150, seuil: 4 },
    bombanime: { partie:  25, victoire:  75, seuil: 4 },
    // ⚠️ Collect est le SEUL a trois, et c est son PLAFOND qui le decide :
    // le mode se joue a cinq au maximum. A quatre, la fenetre ou une victoire
    // paye n aurait fait que deux valeurs sur quatre, alors que la partie
    // mediane s y joue a deux. Le meme seuil que les autres aurait eteint le
    // bonus du mode presque partout.
    collect:   { partie: 100, victoire: 200, seuil: 3 },
    codanime:  { partie:  50, victoire: 125, seuil: 4 },
    ascension: { partie: 100, victoire: 225, seuil: 4 },
    // Choice n est pas encore ouvert au public (`soon: true` sur sa carte),
    // mais il se joue a la maison et il appelle `recordFinishedGame`. Sa
    // ligne est donc la : l oublier le ferait tomber sur le defaut en
    // silence, et personne ne s en apercevrait avant son ouverture.
    choice:    { partie:  50, victoire: 125, seuil: 4 },
};

// ⚠️ Un mode inconnu rapporte QUELQUE CHOSE plutot que rien. Le jour ou un
// mode est ajoute sans sa ligne, le defaut le fait payer peu — ca se remarque
// au bareme. Rendre zero le rendrait invisible : le joueur verrait son xp ne
// plus bouger sans pouvoir dire depuis quand.
const XP_DEFAUT = { partie: 50, victoire: 125, seuil: 4 };

// Pure : ni base, ni reseau, ni etat. C est la seule decision du bareme, donc
// c est celle que `npm run test:comptes` rejoue.
function xpDeLaPartie(mode, { gagnant = false, joueurs = 0 } = {}) {
    const b = XP_MODES[mode] || XP_DEFAUT;
    const victoire = !!gagnant && joueurs >= b.seuil;
    return {
        xp: b.partie + (victoire ? b.victoire : 0),
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
        const { data: avant, error: eLecture } = await supabase
            .from('comptes').select('id, xp, parties, victoires').in('id', ids);
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
                return {
                    id: l.id,
                    xp: (r.xp || 0) + (l.xp || 0),
                    parties: (r.parties || 0) + 1,
                    victoires: (r.victoires || 0) + (l.victoire ? 1 : 0),
                };
            });
        if (!aEcrire.length) return null;

        // ⚠️ `pseudo` et `avatar` sont ABSENTS de l objet, donc l upsert n y
        // touche pas : Postgres ne met a jour que les colonnes citees. Les y
        // mettre a `undefined` les effacerait.
        const { data, error } = await supabase
            .from('comptes')
            .upsert(aEcrire, { onConflict: 'id' })
            .select('id, xp, parties, victoires');
        if (error) throw error;
        return data || null;
    } catch (e) {
        return null;
    }
}

module.exports = {
    ACTIF, configPourNavigateur, verifierJeton, identifier,
    xpDeLaPartie, crediter,
    // Exportes pour `npm run test:comptes` : ce sont les decisions qui se
    // rejouent sans base ni reseau, et celles qui coutent cher si elles
    // changent en silence.
    natureDeLaClef, pseudoAPoser, XP_MODES,
};
