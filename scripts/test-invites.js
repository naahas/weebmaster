// ════════════════════════════════════════════════════════════════
// 🔐 LA PORTE DES INVITÉS — qui peut rejoindre un salon
// ════════════════════════════════════════════════════════════════
// Un salon peut exiger un compte de ses arrivants. Le réglage est posé à
// VRAI par défaut (`invitesAutorises`, etatNeuf) : on entre donc sans
// compte, sauf si l'hôte referme la porte.
//
// ⚠️ LE DÉFAUT A ÉTÉ INVERSÉ, et cette suite a dû suivre. Elle éprouvait la
// porte telle qu'un salon neuf la posait ; un salon neuf la pose maintenant
// OUVERTE, donc tous les contrôles qui vérifient qu'elle mord doivent
// d'abord la FERMER explicitement (étape 2 bis). Sans ça ils seraient
// passés au vert sans rien tenir — une porte ouverte ne refuse personne, et
// le test n'aurait plus signalé sa disparition.
//
// ⚠️ ELLE NE VAUT QUE SI L'HÔTE EST LUI-MÊME INSCRIT. On n'exige pas des
// autres ce qu'on n'a pas fait soi-même — et sans cette condition, un hôte
// sans compte refermerait la porte, se la prendrait en revenant, et son
// salon mourrait avec lui.
//
// ⚠️ C'EST AUSSI POURQUOI CETTE SUITE SE FABRIQUE UN COMPTE. Sans lui la
// porte ne mord jamais, et le test passerait au vert en ne prouvant rien —
// exactement le genre de filet qui rassure sans rien tenir. Elle crée un
// utilisateur Supabase sur un domaine `.invalid` (réservé, donc aucun
// courriel ne partira), s'en sert comme hôte, puis le supprime.
//
// Il lui faut `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` et
// `SUPABASE_ANON_KEY` dans l'environnement — la dernière pour obtenir un
// VRAI jeton de session, que le serveur fera vérifier par Supabase.
//
//   npm run test:invites        (serveur lancé à côté)
require('dotenv').config();
const io = require('socket.io-client');
const { createClient } = require('@supabase/supabase-js');

const BASE = process.env.BASE || 'http://localhost:7000';
let ok = 0, ko = 0;
const check = (nom, vrai, detail) => {
    if (vrai) { ok++; console.log('  ✅ ' + nom); }
    else { ko++; console.log('  ❌ ' + nom + (detail ? '  → ' + detail : '')); }
};
const attendre = (ms) => new Promise(r => setTimeout(r, ms));
const client = () => io(BASE, { transports: ['websocket'], forceNew: true });

// Rejoint, et rend soit { ok: true } soit { erreur }.
function rejoindre(sock, charge) {
    return new Promise((resolve) => {
        let fini = false;
        const finir = (v) => { if (!fini) { fini = true; resolve(v); } };
        sock.once('error', (d) => finir({ erreur: d }));
        sock.once('lobby-update', () => finir({ ok: true }));
        sock.once('joined-lobby', () => finir({ ok: true }));
        sock.emit('join-lobby', charge);
        setTimeout(() => finir({ erreur: { message: 'aucune reponse' } }), 2500);
    });
}

async function poster(chemin, corps, jeton) {
    const entetes = { 'Content-Type': 'application/json' };
    if (jeton) entetes['X-Host-Token'] = jeton;
    const r = await fetch(BASE + chemin, { method: 'POST', headers: entetes, body: JSON.stringify(corps) });
    return { statut: r.status, corps: await r.json().catch(() => ({})) };
}
const etatDu = (code) => fetch(BASE + '/game/state?code=' + code).then(r => r.json()).catch(() => ({}));

(async () => {
    console.log('\n🔐 LA PORTE DES INVITÉS\n');

    const url = process.env.SUPABASE_URL;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anon = process.env.SUPABASE_ANON_KEY;
    if (!url || !service || !anon) {
        console.log('⏭️  SUPABASE_URL / SERVICE_ROLE / ANON manquantes — suite sautée.');
        console.log('   Sans compte, la porte ne mord pas : le test passerait sans rien prouver.\n');
        process.exit(0);
    }
    const admin = createClient(url, service, { auth: { persistSession: false } });

    // ── 1. Le cobaye : un hôte INSCRIT ───────────────────────────
    const marque = 'porte-' + Date.now();
    const email = marque + '@exemple.invalid';
    const { data: ne, error: eCreer } = await admin.auth.admin.createUser({
        email, email_confirm: true,
    });
    if (eCreer || !ne || !ne.user) {
        console.log('  ❌ création du cobaye impossible : ' + (eCreer && eCreer.message));
        process.exit(1);
    }
    const ID = ne.user.id;
    const menage = async () => { try { await admin.auth.admin.deleteUser(ID); } catch (e) {} };
    check('1. un compte de test est créé', !!ID, ID.slice(0, 8) + '…');

    // Un VRAI jeton de session : c'est lui que le serveur fera vérifier par
    // Supabase, et donc lui seul qui rend l'hôte « inscrit ».
    //
    // ⚠️ PAR LIEN MAGIQUE, et pas par mot de passe. Ce projet n'ouvre que
    // Discord et Twitch : le fournisseur « Email » y est ETEINT, et
    // `signInWithPassword` répond « Email logins are disabled ».
    // `generateLink` est une route d'ADMINISTRATION — elle n'envoie aucun
    // courriel et ne dépend pas du fournisseur public. On échange le jeton
    // haché contre une session, exactement comme le ferait un navigateur.
    const navigateur = createClient(url, anon, { auth: { persistSession: false } });
    const { data: lien, error: eLien } =
        await admin.auth.admin.generateLink({ type: 'magiclink', email });
    const hache = lien && lien.properties && lien.properties.hashed_token;
    if (eLien || !hache) {
        console.log('  ❌ lien magique impossible : ' + (eLien && eLien.message));
        await menage(); process.exit(1);
    }
    const { data: session, error: eSess } =
        await navigateur.auth.verifyOtp({ token_hash: hache, type: 'magiclink' });
    if (eSess || !session || !session.session) {
        console.log('  ❌ session impossible : ' + (eSess && eSess.message));
        await menage(); process.exit(1);
    }
    const jetonCompte = session.session.access_token;
    check('   … et il obtient un vrai jeton de session', !!jetonCompte);

    // ── 2. Le salon, ouvert par ce compte ────────────────────────
    // ⚠️ LE COMPTE SE FAIT RECONNAÎTRE AVANT D'OUVRIR LE SALON, et l'ordre
    // n'est pas un détail : la porte se calcule à la lecture, et un salon
    // ouvert par un inconnu naît porte OUVERTE. C'est l'ordre réel, celui du
    // navigateur — il présente son jeton dès le chargement de la page, bien
    // avant que l'hôte ne clique sur « créer un salon ».
    const hote = client();
    await attendre(300);
    hote.emit('register-authenticated', { playerId: ID, username: 'Cobaye', jeton: jetonCompte });
    await attendre(900);

    const ouv = await poster('/admin/toggle-game', { lobbyMode: 'bombanime', playerId: ID });
    const jeton = ouv.corps.hostToken;
    const code = ouv.corps.roomCode;
    if (!jeton || !code) { console.log('  ❌ ouverture impossible'); await menage(); process.exit(1); }
    console.log('  Salon ' + code + ' ouvert par le cobaye.\n');

    check('2. un salon neuf ACCEPTE les invités (le défaut)',
        ouv.corps.reglages && ouv.corps.reglages.invitesAutorises === true,
        JSON.stringify(ouv.corps.reglages && ouv.corps.reglages.invitesAutorises));

    // ── 2 pre. ON FERME LA PORTE POUR LA SUITE ───────────────────
    // ⚠️ TOUT CE QUI SUIT JUSQU'A L'ETAPE 5 EPROUVE UNE PORTE FERMEE, et
    // elle ne l'est plus a la naissance du salon. Cette fermeture n'est donc
    // pas une etape de plus : c'est la CONDITION des six controles suivants.
    // Sans elle ils passeraient au vert sans rien tenir — une porte ouverte
    // ne refuse personne, pas meme un faussaire.
    const ferme = await poster('/admin/set-invites', { autorises: false }, jeton);
    check('2 pre. l’hôte inscrit peut refermer sa porte',
        ferme.corps.invitesAutorises === false, JSON.stringify(ferme.corps));

    // ── 2 bis. ⚠️ L IDENTIFIANT D UN INSCRIT N EST PAS UNE CLEF ──
    // Les `playerId` circulent : `lobby-update` les envoie a tout le salon.
    // La porte s appuyait sur « cet identifiant a-t-il un compte ? », une
    // question sur un ID et non sur l interlocuteur — donc quiconque
    // recopiait celui d un inscrit entrait, portait son losange, et se
    // faisait crediter SUR SON COMPTE en fin de partie, pseudo compris.
    // Elle demande maintenant une preuve posee sur la socket.
    //
    // ⚠️ CES DEUX CONTROLES PASSENT AVANT QUE L HOTE N ENTRE, et c est
    // necessaire : une fois son entree posee, un arrivant qui annonce le meme
    // `playerId` est traite comme une RECONNEXION, et la porte ne s applique
    // pas aux reconnexions — par dessein, c est le telephone qui verrouille
    // son ecran. Ce chemin-la est une autre question, notee a part.
    const f1 = client(); await attendre(250);
    const rF1 = await rejoindre(f1, { code, playerId: ID, username: 'Faussaire' });
    check('2 bis. ⚠️ recopier le playerId d’un INSCRIT ne passe pas',
        !!rF1.erreur && rF1.erreur.compteRequis === true, JSON.stringify(rF1));

    // ── 2 ter. ⚠️ SE DECONNECTER REND INVITE, TOUT DE SUITE ──────
    // Le navigateur garde son `playerId` de compte apres deconnexion — c est
    // voulu, pour ne pas devenir quelqu un d autre en plein salon. Le serveur
    // doit donc oublier la preuve de son cote, sans quoi l onglet reste un
    // inscrit a ses yeux jusqu a sa fermeture : c est le defaut constate en
    // jouant, d un navigateur a l autre.
    const f2 = client(); await attendre(250);
    f2.emit('register-authenticated', { playerId: ID, username: 'Cobaye2', jeton: jetonCompte });
    await attendre(900);
    const avantDeconnexion = await rejoindre(f2, { code, playerId: ID, username: 'Cobaye2' });
    check('   … alors qu’une socket qui a PROUVE entre bien',
        !!avantDeconnexion.ok, JSON.stringify(avantDeconnexion.erreur));
    f2.emit('leave-lobby');
    await attendre(400);
    f2.emit('compte-deconnecte');
    await attendre(300);
    const rF2 = await rejoindre(f2, { code, playerId: ID, username: 'Cobaye2' });
    check('2 ter. ⚠️ apres « compte-deconnecte », la porte se referme sur lui',
        !!rF2.erreur && rF2.erreur.compteRequis === true, JSON.stringify(rF2));

    // ── 2 quater. ⚠️ LA COURSE DU LIEN D INVITATION ──────────────
    // Par le lien, tout part ensemble : la socket s ouvre, le jeton est
    // presente, et `join-lobby` suit DANS LA FOULEE — avant que la
    // verification Supabase, qui demande un aller-retour, ne soit revenue.
    // La porte prenait alors un joueur connecte pour un invite et le
    // refusait. En saisissant le code a la main il passait, parce que taper
    // quatre lettres prend plus longtemps que la verification : le defaut ne
    // se voyait QUE par le lien.
    // Ici on ne laisse AUCUN repit — zero milliseconde entre les deux.
    const f3 = client(); await attendre(250);
    f3.emit('register-authenticated', { playerId: ID, username: 'Presse', jeton: jetonCompte });
    const rF3 = await rejoindre(f3, { code, playerId: ID, username: 'Presse' });
    check('2 quater. ⚠️ rejoindre AUSSITOT apres avoir presente son jeton passe',
        !!rF3.ok, JSON.stringify(rF3.erreur));
    f3.emit('leave-lobby'); await attendre(300);

    const rH = await rejoindre(hote, { code, playerId: ID, username: 'Cobaye', isHost: true, hostToken: jeton });
    check('   l’hôte inscrit entre dans son salon', !!rH.ok, JSON.stringify(rH.erreur));

    // ── 3. La porte mord ─────────────────────────────────────────
    const b = client(); await attendre(300);
    const rB = await rejoindre(b, { code, playerId: 'invite-B', username: 'InviteB' });
    check('3. ⚠️ un invité est REFUSÉ', !!rB.erreur && rB.erreur.compteRequis === true, JSON.stringify(rB));
    check('   … avec le message attendu',
        rB.erreur && rB.erreur.message === 'Compte connecté requis', rB.erreur && rB.erreur.message);

    // ⚠️ Deux forgeries : `isHost` et `hostToken` viennent du CLIENT.
    const c = client(); await attendre(250);
    const rC = await rejoindre(c, { code, playerId: 'invite-C', username: 'InviteC', isHost: true });
    check('4. ⚠️ « isHost: true » NE SUFFIT PAS — ce champ vient du client',
        !!rC.erreur && rC.erreur.compteRequis === true, JSON.stringify(rC));
    const d = client(); await attendre(250);
    const rD = await rejoindre(d, { code, playerId: 'invite-D', username: 'InviteD', hostToken: 'faux' });
    check('   … ni un faux jeton d’hôte',
        !!rD.erreur && rD.erreur.compteRequis === true, JSON.stringify(rD));

    // ── 5. Porte ouverte : l'invité entre ────────────────────────
    const o = await poster('/admin/set-invites', { autorises: true }, jeton);
    check('5. la porte s’ouvre', o.corps.invitesAutorises === true, JSON.stringify(o.corps));
    const e = client(); await attendre(250);
    const rE = await rejoindre(e, { code, playerId: 'invite-E', username: 'InviteE' });
    check('   l’invité entre', !!rE.ok, JSON.stringify(rE.erreur));

    // ── 6. On referme : il RESTE ─────────────────────────────────
    const f = await poster('/admin/set-invites', { autorises: false }, jeton);
    check('6. la porte se referme', f.corps.invitesAutorises === false, JSON.stringify(f.corps));
    const noms = ((await etatDu(code)).players || []).map(p => p.username);
    check('   ⚠️ l’invité déjà entré RESTE', noms.includes('InviteE'), 'salon : ' + noms.join(', '));

    // ── 7. Et il revient après une coupure ───────────────────────
    e.disconnect(); await attendre(450);
    const e2 = client(); await attendre(300);
    const rE2 = await rejoindre(e2, { code, playerId: 'invite-E', username: 'InviteE' });
    check('7. ⚠️ … et il REVIENT après une coupure de socket',
        !!rE2.ok, JSON.stringify(rE2.erreur));

    // ── 8. Un hôte SANS compte ne peut pas fermer ────────────────
    const ouv2 = await poster('/admin/toggle-game', { lobbyMode: 'bombanime', playerId: 'hote-sans-compte' });
    const jeton2 = ouv2.corps.hostToken;

    // ⚠️ SON SALON NAÎT PORTE OUVERTE, et l'interrupteur doit le dire. C'est
    // le piège trouvé à l'écran : le drapeau valant `false` pour tout le
    // monde, son salon s'affichait restreint alors qu'il laissait entrer
    // n'importe qui — et refermer ce qu'il montrait déjà fermé était refusé.
    // Un interrupteur à sens unique, bloqué sur un état qu'il n'avait jamais
    // eu. Le serveur affiche désormais l'état RÉEL de la porte.
    //
    // ⚠️ DEPUIS QUE LE DÉFAUT EST « OUVERT », CE PREMIER CONTRÔLE NE PROUVE
    // PLUS GRAND-CHOSE : il serait vrai même sans la règle de l'hôte sans
    // compte. Ce qui tient encore, et qui est tout l'objet de l'étape, ce
    // sont les 403 juste en dessous — lui seul ne peut pas refermer.
    check('8. ⚠️ le salon d’un hôte SANS compte s’affiche PORTE OUVERTE',
        ouv2.corps.reglages && ouv2.corps.reglages.invitesAutorises === true,
        JSON.stringify(ouv2.corps.reglages && ouv2.corps.reglages.invitesAutorises));

    const refus = await poster('/admin/set-invites', { autorises: false }, jeton2);
    check('   … et il ne peut pas la fermer', refus.statut === 403, 'HTTP ' + refus.statut);
    check('   … le refus explique pourquoi',
        typeof refus.corps.error === 'string' && /onnecte/.test(refus.corps.error), refus.corps.error);

    // Ouvrir ce qui est déjà ouvert, puis tenter de refermer : le refus doit
    // être le même. Sinon on aurait rétabli le sens unique par une autre porte.
    const o2 = await poster('/admin/set-invites', { autorises: true }, jeton2);
    const refus2 = await poster('/admin/set-invites', { autorises: false }, jeton2);
    check('   … et l’avoir « ouverte » d’abord n’y change rien',
        o2.corps.invitesAutorises === true && refus2.statut === 403,
        JSON.stringify({ ouvre: o2.corps.invitesAutorises, ferme: refus2.statut }));
    const g = client(); await attendre(250);
    const rG = await rejoindre(g, { code: ouv2.corps.roomCode, playerId: 'invite-G', username: 'InviteG' });
    check('   … donc son salon reste ouvert aux invités', !!rG.ok, JSON.stringify(rG.erreur));

    [hote, b, c, d, e2, g, f1, f2, f3].forEach(s => { try { s.disconnect(); } catch (x) {} });
    await poster('/admin/toggle-game', {}, jeton);
    await poster('/admin/toggle-game', {}, jeton2);
    await menage();
    console.log('\n  🧹 compte de test supprimé.');

    console.log('\n' + (ko ? '❌ ' : '✅ ') + ok + ' vérifications passées, ' + ko + ' échouées\n');
    process.exit(ko ? 1 : 0);
})().catch((e) => { console.error('💥', e); process.exit(1); });
