// Vérifie que les routes /admin sont bien réservées à l'hôte du salon.
// Sans ce garde-fou, n'importe quel visiteur pouvait fermer la partie en cours :
// il n'y en a qu'une sur tout le serveur.
const { io } = require('socket.io-client');
const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
const wait = (ms) => new Promise(r => setTimeout(r, ms));

// L'état d'un salon ne se lit qu'avec son code
let roomCode = '';
const etat = () => fetch(BASE + '/game/state?code=' + roomCode).then(r => r.json());

// L'intrus n'a aucun jeton : c'est tout l'objet du test
const sansJeton = (p, b) => fetch(BASE + p, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(b || {}),
}).then(r => r.json().then(j => ({ status: r.status, body: j })));

const avecJeton = (p, jeton, b) => fetch(BASE + p, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Host-Token': jeton },
    body: JSON.stringify(b || {}),
}).then(r => r.json().then(j => ({ status: r.status, body: j })));

(async () => {
    let ko = 0;
    const check = (l, ok, extra) => { console.log(`${ok ? '✅' : '❌'} ${l}${extra ? ' → ' + extra : ''}`); if (!ok) ko++; };

    // ── Ouvrir reste libre : c'est ce qui crée le jeton ──
    const ouverture = await sansJeton('/admin/toggle-game', { lobbyMode: 'classic' });
    check("l'ouverture d'un salon reste accessible", ouverture.body.isActive === true);
    const jeton = ouverture.body.hostToken;
    roomCode = ouverture.body.roomCode;
    check("le créateur repart avec un jeton", typeof jeton === 'string' && jeton.length >= 16,
        jeton ? jeton.slice(0, 8) + '…' : 'aucun');

    const { mode: avantMode } = await etat();

    // ── Tout le reste est fermé ──
    const routes = [
        ['/admin/start-game', {}],
        ['/admin/next-question', {}],
        ['/admin/set-mode', { mode: 'points' }],
        ['/admin/set-teams', { enabled: true }],
        ['/admin/shuffle-teams', {}],
        ['/admin/toggle-auto-mode', {}],
    ];
    let bloquees = 0;
    for (const [route, corps] of routes) {
        const r = await sansJeton(route, corps);
        if (r.status === 403) bloquees++;
        else console.log(`   ⚠️ ${route} a répondu ${r.status}`);
    }
    check('un visiteur sans jeton est refusé partout', bloquees === routes.length,
        bloquees + '/' + routes.length + ' routes protégées');

    const apres = await etat();
    check('le salon est toujours ouvert après ces tentatives', apres.isActive === true);
    // Le mode ambiant depend de ce qu ont laisse les autres suites : on compare
    // a ce qu il valait avant les tentatives, pas a une valeur en dur.
    check("le mode n'a pas bougé", apres.mode === avantMode, avantMode + ' → ' + apres.mode);

    // ── Un mauvais jeton ne vaut pas mieux ──
    // Un jeton inventé n'ouvre pas un salon : il est simplement refusé.
    // On compare au décompte du moment : d'autres suites peuvent en tenir.
    const avantFaux = (await fetch(BASE + '/api/home-stats').then(r => r.json())).activeRooms;
    const faux = await avecJeton('/admin/toggle-game', 'pas-le-bon-jeton', {});
    check('un jeton inventé est refusé', faux.status === 403, 'HTTP ' + faux.status);
    const apresFaux = await fetch(BASE + '/api/home-stats').then(r => r.json());
    check("il n'a pas créé de salon au passage", apresFaux.activeRooms === avantFaux,
        avantFaux + ' → ' + apresFaux.activeRooms + ' salon(s)');

    // ── L'hôte, lui, passe ──
    const modeOk = await avecJeton('/admin/set-mode', jeton, { mode: 'points' });
    check("l'hôte règle bien sa partie", modeOk.status === 200 && modeOk.body.success === true);

    // ── L'exclusion passe par la socket : même règle ──
    const hote = io(BASE);
    await new Promise(r => hote.on('connect', r));
    hote.emit('register-authenticated', { twitchId: 'h1', username: 'Hote' });
    await wait(150);
    hote.emit('join-lobby', { twitchId: 'h1', username: 'Hote', code: roomCode });

    const cible = io(BASE);
    await new Promise(r => cible.on('connect', r));
    let exclu = false;
    cible.on('kicked', () => { exclu = true; });
    cible.emit('register-authenticated', { twitchId: 'p2', username: 'Cible' });
    await wait(150);
    cible.emit('join-lobby', { twitchId: 'p2', username: 'Cible', code: roomCode });
    await wait(500);

    // La cible tente de s'exclure elle-même... puis d'exclure l'hôte
    cible.emit('kick-player', { twitchId: 'h1' });
    await wait(500);
    const pendant = await etat();
    check("une exclusion sans jeton ne passe pas", pendant.playerCount === 2 && !exclu,
        'playerCount=' + pendant.playerCount);

    hote.emit('kick-player', { twitchId: 'p2', hostToken: jeton });
    for (let i = 0; i < 20 && !exclu; i++) await wait(50);
    check("l'hôte exclut bien avec son jeton", exclu === true);

    // ── Fermer révoque le jeton ──
    await avecJeton('/admin/toggle-game', jeton, {});
    const refuse = await avecJeton('/admin/start-game', jeton, {});
    check('le jeton ne vaut plus rien une fois le salon fermé', refuse.status === 403, 'HTTP ' + refuse.status);

    hote.close(); cible.close();
    console.log(ko ? `\n${ko} échec(s)` : "\n✨ Les routes /admin sont bien réservées à l'hôte");
    process.exit(ko ? 1 : 0);
})();
