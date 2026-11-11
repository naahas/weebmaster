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
        return {
            id: u.id,                                   // ⚠️ DEVIENT le playerId
            email: u.email || null,
            fournisseur: (u.app_metadata && u.app_metadata.provider) || null,
        };
    } catch (e) {
        // Reseau coupe, Supabase en vrac : on refuse la connexion, on ne
        // casse pas la partie. Le joueur reste un invite.
        return null;
    }
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
    if (pseudo) ligne.pseudo = pseudo;
    if (avatar) ligne.avatar = avatar;

    try {
        const { data, error } = await supabase
            .from('comptes')
            .upsert(ligne, { onConflict: 'id' })
            .select('id, pseudo, avatar, xp, parties')
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
async function identifier(jeton, { pseudo, avatar } = {}) {
    const u = await verifierJeton(jeton);
    if (!u) return null;
    const profil = await toucherCompte(u.id, { pseudo, avatar });
    return {
        playerId: u.id,
        compte: true,
        fournisseur: u.fournisseur,
        // Le profil peut etre nul (table absente) : le losange s allume quand
        // meme, puisque le jeton, lui, est valide.
        profil: profil || null,
    };
}

module.exports = { ACTIF, configPourNavigateur, verifierJeton, identifier, natureDeLaClef };
