// Vérifie que l'hôte peut enchaîner les questions depuis / (sans /admin)
const { io } = require('socket.io-client');
const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
const post = (p, b) => fetch(BASE + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b || {}) }).then(r => r.json());
const wait = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
    let ko = 0;
    const check = (l, ok, extra) => { console.log(`${ok ? '✅' : '❌'} ${l}${extra ? ' → ' + extra : ''}`); if (!ok) ko++; };

    await post('/admin/toggle-game', { lobbyMode: 'classic' });

    const socks = [];
    for (const [id, nom] of [['h1', 'Hote'], ['p2', 'Joueur2']]) {
        const s = io(BASE);
        await new Promise(r => s.on('connect', r));
        s.emit('register-authenticated', { twitchId: id, username: nom });
        socks.push({ s, id, nom, vu: [] });
        s.on('new-question', (d) => socks.find(x => x.s === s).vu.push(d));
        s.on('game-started', (d) => { socks.find(x => x.s === s).depart = d; });
    }
    await wait(300);
    socks.forEach(({ s, id, nom }, i) => s.emit('join-lobby', { twitchId: id, username: nom, isHost: i === 0 }));
    await wait(500);

    const start = await post('/admin/start-game', {});
    check('partie démarrée', start.success === true);
    await wait(400);
    // L'hôte joue comme les autres : sans isParticipating il n'aurait ni vies ni cœurs
    check("l'hôte participe à la partie", socks[0].depart && socks[0].depart.isParticipating === true,
        'mode=' + (socks[0].depart || {}).gameMode);
    // On mesure le délai réel : un court sursis volontaire côté serveur plus la
    // requête Supabase. Le garde-fou est là pour repérer une dérive, pas une valeur exacte.
    const depart = Date.now();
    while (socks[0].vu.length === 0 && Date.now() - depart < 5000) await wait(50);
    const delai = Date.now() - depart;
    check('question 1 reçue', socks[0].vu.length >= 1, delai + ' ms après le démarrage');
    check('délai de lancement maîtrisé', delai < 1800, delai + ' ms');

    // les joueurs répondent, puis l'hôte enchaîne comme depuis la barre de contrôle
    socks.forEach(({ s, id }) => s.emit('submit-answer', { twitchId: id, answerIndex: 0 }));
    // on attend la fin du chrono : le serveur refuse d avancer pendant la question
    await wait(11000);

    const auto = await post('/admin/toggle-auto-mode', {});
    check('bascule du mode auto', auto.success === true, 'auto=' + auto.autoMode);
    await post('/admin/toggle-auto-mode', {});   // on repasse en manuel

    const suivante = await post('/admin/next-question', {});
    check('question suivante déclenchée', !suivante.error, JSON.stringify(suivante).slice(0, 70));
    await wait(2500);
    check('question 2 reçue', socks[0].vu.length >= 2, socks[0].vu.length + ' question(s)');

    await post('/admin/toggle-game', {});
    socks.forEach(({ s }) => s.close());
    console.log(ko ? `\n${ko} échec(s)` : '\n✨ Contrôles de l\'hôte opérationnels sans /admin');
    process.exit(ko ? 1 : 0);
})();
