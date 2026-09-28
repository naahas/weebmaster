// Le panneau /admin : la porte, le direct, et surtout le SEUIL.
//
// ⚠️ Ce test existe pour une raison précise. Le filtre des trois joueurs était
// à l'ÉCRITURE : une partie à deux n'entrait jamais en base. Il est passé à la
// LECTURE pour que le panneau puisse les montrer, et ce déplacement a un
// danger : si l'on oublie de filtrer côté lecture, le compteur de l'accueil
// se met à compter les parties de test, et le chiffre public devient faux.
//
// Les deux choses sont donc tenues ensemble ici : la partie à deux DOIT entrer
// en base, et le compteur public NE DOIT PAS bouger.
const { io } = require('socket.io-client');

const PORT = process.env.TEST_PORT || process.env.PORT || 7000;
const BASE = 'http://localhost:' + PORT;
const CODE = process.env.PANEL_ADMIN_CODE;

let ok = 0, ko = 0;
let SEUILS = { seuilCompteur: 3, seuilListe: 5 };
const dire = (b, txt, det) => {
    console.log((b ? '✅ ' : '❌ ') + txt + (det ? ' → ' + det : ''));
    b ? ok++ : ko++;
};
const attendre = ms => new Promise(r => setTimeout(r, ms));

async function json(chemin, opts) {
    const r = await fetch(BASE + chemin, opts);
    let corps = null;
    try { corps = await r.json(); } catch (e) { /* une page HTML, pas du JSON */ }
    return { statut: r.status, corps };
}

(async () => {
    if (!CODE) {
        console.log('❌ PANEL_ADMIN_CODE absent de l\'environnement.');
        console.log('   Lancer avec le .env chargé, ou PANEL_ADMIN_CODE=… npm run test:panneau');
        process.exit(1);
    }
    const q = encodeURIComponent(CODE);

    console.log('\n═══ 1. LA PORTE ═══\n');

    // Le garde-fou d'hôte est monté sur tout /admin et exige un X-Host-Token.
    // La page et ses routes en sont exemptées : il faut donc vérifier qu'elles
    // sont bien gardées par AUTRE CHOSE, et non pas ouvertes à tous.
    // ⚠️ /admin n'est PAS dans cette liste, et c'est voulu : la page est une
    // coquille vide qui demande le code puis va chercher le reste, exactement
    // comme /question. Ce sont les routes /admin/site/* qui gardent les
    // données. Exiger un code pour servir le HTML empêcherait le formulaire
    // d'exister.
    const nues = [
        ['GET', '/admin/site/stats'],
        ['GET', '/admin/site/direct'],
        ['POST', '/admin/site/vider'],
        ['POST', '/admin/site/supprimer'],
    ];
    let refus = 0;
    for (const [methode, chemin] of nues) {
        const r = await json(chemin, { method: methode });
        if (r.statut === 401) refus++;
        else dire(false, 'ouvert sans code : ' + methode + ' ' + chemin, 'HTTP ' + r.statut);
    }
    dire(refus === nues.length, 'sans code, tout est refusé',
        refus + '/' + nues.length + ' routes');

    const faux = await json('/admin/site/stats?code=paslebon');
    dire(faux.statut === 401, 'un code inventé est refusé', 'HTTP ' + faux.statut);

    const page = await fetch(BASE + '/admin');
    const html = await page.text();
    dire(page.status === 200 && html.includes('porte-code'),
        'la page se sert sans code, avec son formulaire', 'HTTP ' + page.status);
    // ⚠️ Elle part à qui la demande : elle ne doit donc porter AUCUN secret.
    dire(!html.includes(CODE), 'et elle ne contient aucun code en dur');

    console.log('');
    console.log('═══ 1 bis. LE PORTAIL ═══');
    console.log('');

    const portail = c => json('/admin/site/verifier', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: c }),
    });
    dire((await portail('nimportequoi')).statut === 401, 'un code faux est refusé');
    dire((await portail('')).statut === 401, 'un code vide est refusé');
    // ⚠️ L'échec est volontairement lent : sans cela on essaie des milliers de
    // codes à la seconde, et une erreur de frappe ne se voit pas passer.
    const t0 = Date.now();
    await portail('encoreFaux');
    const delai = Date.now() - t0;
    dire(delai >= 550, 'l\'échec est ralenti, contre les essais en rafale', delai + ' ms');
    dire((await portail(CODE)).statut === 200, 'le bon code passe');

    // Le code voyage en EN-TÊTE, plus dans l'adresse.
    const parEnTete = await json('/admin/site/stats', { headers: { 'X-Admin-Code': CODE } });
    dire(parEnTete.statut === 200, 'X-Admin-Code ouvre les routes', 'HTTP ' + parEnTete.statut);
    const mauvaisEnTete = await json('/admin/site/stats', { headers: { 'X-Admin-Code': 'faux' } });
    dire(mauvaisEnTete.statut === 401, 'un mauvais en-tête est refusé',
        'HTTP ' + mauvaisEnTete.statut);

    // ⚠️ L'exemption porte sur « /site/ » : un chemin qui commence par là et
    // remonte d'un cran ne doit pas atteindre une route d'hôte.
    //
    // ⚠️ Et on ne vise QUE des routes gardées. /admin/toggle-game est
    // volontairement ouverte — c'est elle qui crée les salons, on ne peut pas
    // exiger un jeton pour l'appeler puisqu'elle est ce qui le délivre. La
    // tester ici donnerait un échec qui ne veut rien dire.
    for (const chemin of ['/admin/site/../start-game', '/admin/site/../set-teams',
                          '/admin/site/../kick-player']) {
        const r = await fetch(BASE + chemin, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teams: true }),
        });
        dire(r.status === 404 || r.status === 403,
            'la traversée ne passe pas : ' + chemin.replace('/admin/site/../', '…/'),
            'HTTP ' + r.status);
    }

    console.log('\n═══ 2. LE DIRECT ═══\n');

    // Un vrai salon, deux vrais joueurs : le panneau doit les voir. C'est
    // l'information que la base ne peut PAS donner — les salons vivent dans la
    // mémoire du processus.
    const ouvert = await json('/admin/toggle-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobbyMode: 'rush' }),
    });
    const jeton = ouvert.corps && ouvert.corps.hostToken;
    const salon = ouvert.corps && ouvert.corps.roomCode;
    if (!jeton || !salon) {
        dire(false, 'impossible d\'ouvrir un salon de test', JSON.stringify(ouvert.corps));
        process.exit(1);
    }
    dire(true, 'salon de test ouvert', salon);
    const enTetes = { 'Content-Type': 'application/json', 'X-Host-Token': jeton };

    const socles = [];
    for (const nom of ['PanneauUn', 'PanneauDeux']) {
        const s = io(BASE, { transports: ['websocket'] });
        await new Promise(r => s.on('connect', r));
        s.emit('register-authenticated', { playerId: 'panneau-' + nom, username: nom });
        await attendre(200);
        // ⚠️ La clef est « code », pas « roomCode » : avec le mauvais nom la
        // jointure échoue en silence et le salon reste vide.
        s.emit('join-lobby', { playerId: 'panneau-' + nom, username: nom, code: salon });
        socles.push(s);
    }
    await attendre(900);

    const direct = (await json('/admin/site/direct?code=' + q)).corps;
    const vu = direct.salons.find(s => s.code === salon);
    dire(!!vu, 'le panneau voit le salon');
    if (vu) {
        dire(vu.joueurs === 2, 'il compte les deux joueurs', vu.joueurs + ' joueur(s)');
        dire(vu.mode === 'rush', 'il donne le bon mode', vu.mode);
        dire(!vu.enPartie, 'il sait que la partie n\'a pas commencé');
        dire(vu.noms.includes('PanneauUn') && vu.noms.includes('PanneauDeux'),
            'il nomme les joueurs', vu.noms.join(', '));
    }
    dire(direct.joueursEnLigne >= 2, 'le total en ligne les inclut',
        direct.joueursEnLigne + ' en ligne');

    console.log('\n═══ 3. LE SEUIL — une partie à deux ═══\n');

    // L'état d'avant, mesuré et non supposé.
    const stats0 = (await json('/admin/site/stats?code=' + q)).corps;
    SEUILS = { seuilCompteur: stats0.seuilCompteur, seuilListe: stats0.seuilListe };
    const avant = stats0.parties.length;
    const publicAvant = (await json('/api/home-stats')).corps.gamesPlayed;
    console.log('   ' + avant + ' partie(s) en base, compteur public à ' + publicAvant);

    // Une manche de Rush très courte, pour qu'elle se termine seule.
    await json('/admin/rush/set-duree', {
        method: 'POST', headers: enTetes,
        body: JSON.stringify({ duree: 30 }),
    });
    await json('/admin/start-game', { method: 'POST', headers: enTetes, body: '{}' });
    dire(true, 'partie lancée à deux joueurs, on attend la fin (~35 s)');
    // Le Rush s'arrête tout seul à la fin du temps ; on laisse une marge.
    await attendre(38000);

    const apres = (await json('/admin/site/stats?code=' + q)).corps.parties;
    const publicApres = (await json('/api/home-stats')).corps.gamesPlayed;

    const neuves = apres.length - avant;
    dire(neuves === 1, 'la partie à deux EST entrée en base',
        avant + ' → ' + apres.length + ' ligne(s)');
    if (neuves === 1) {
        const p = apres[0];
        dire(p.players_count === 2, 'et elle y est bien avec ses deux joueurs',
            p.players_count + ' joueur(s), mode ' + p.mode);
    }

    // ⚠️ Le point qui compte : le chiffre de l'accueil ne doit PAS bouger.
    dire(publicApres === publicAvant,
        'le compteur public n\'a pas bougé (c\'est le seuil de 3 qui tient)',
        publicAvant + ' → ' + publicApres);

    console.log('');
    console.log('═══ 4. SUPPRIMER UNE PARTIE ═══');
    console.log('');

    // Le panneau montre tout, parties de test comprises : il faut pouvoir
    // faire le tri a la main. On supprime celle qu'on vient de jouer.
    const nue = await json('/admin/site/supprimer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 1 }),
    });
    dire(nue.statut === 401, 'supprimer sans code est refuse', 'HTTP ' + nue.statut);

    const absurde = await json('/admin/site/supprimer?code=' + q, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'abc' }),
    });
    dire(absurde.statut === 400, 'un identifiant non numerique est refuse',
        'HTTP ' + absurde.statut);

    // Les refus du LOT. Ils ne demandent aucune vraie ligne : on eprouve la
    // porte, pas la suppression.
    const vide = await json('/admin/site/supprimer?code=' + q, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [] }),
    });
    dire(vide.statut === 400, 'un lot vide est refuse', 'HTTP ' + vide.statut);

    const trop = await json('/admin/site/supprimer?code=' + q, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from({ length: 501 }, (x, i) => i + 1) }),
    });
    dire(trop.statut === 400, 'un lot de plus de 500 est refuse', 'HTTP ' + trop.statut);

    const notre = apres[0];
    // ⚠️ On envoie l identifiant EN DOUBLE, sous la forme d un lot : la route
    // accepte { id } comme { ids }, et doit ecarter les doublons plutot que
    // de compter deux fois.
    const sup = await json('/admin/site/supprimer?code=' + q, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [notre.id, notre.id] }),
    });
    dire(sup.statut === 200, 'la partie de test est supprimee', 'id ' + notre.id);
    dire(sup.corps && sup.corps.supprimees === 1, 'le doublon est ecarte',
        'annonce ' + (sup.corps && sup.corps.supprimees) + ' supprimee(s)');

    const reste = (await json('/admin/site/stats?code=' + q)).corps.parties;
    dire(reste.length === apres.length - 1 && !reste.some(p => p.id === notre.id),
        'elle a bien disparu de la base', apres.length + ' → ' + reste.length);

    // ⚠️ Le compteur public et la liste de l accueil vivent en memoire. Sans
    // le rechargement fait par la route, ils garderaient la partie supprimee
    // jusqu au prochain redemarrage du dyno.
    const compteur = (await json('/api/home-stats')).corps.gamesPlayed;
    const attendu = reste.filter(p => (p.players_count || 0) >= SEUILS.seuilCompteur).length;
    dire(compteur === attendu,
        'le compteur public est recalcule, pas laisse en l etat',
        compteur + ' = ' + attendu + ' partie(s) au-dessus du seuil');

    for (const s of socles) s.disconnect();
    await json('/admin/toggle-game', { method: 'POST', headers: enTetes, body: '{}' });

    console.log('\n' + (ko === 0
        ? '✨ Le panneau est fermé, il voit le direct, et le seuil tient'
        : '💥 ' + ko + ' échec(s) sur ' + (ok + ko)));
    process.exit(ko === 0 ? 0 : 1);
})().catch(e => {
    console.error('\n💥 ' + e.message);
    process.exit(1);
});
