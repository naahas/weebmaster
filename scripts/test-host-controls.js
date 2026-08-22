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
        s.on('question-results', (d) => { socks.find(x => x.s === s).resultats = d; });
    }
    await wait(300);
    socks.forEach(({ s, id, nom }, i) => s.emit('join-lobby', { twitchId: id, username: nom, isHost: i === 0 }));
    await wait(500);

    // Exclusion d'un joueur : l'hôte n'envoie que l'identifiant depuis la liste du salon
    const intrus = io(BASE);
    await new Promise(r => intrus.on('connect', r));
    let exclu = false;
    intrus.on('kicked', () => { exclu = true; });
    intrus.emit('register-authenticated', { twitchId: 'p3', username: 'Intrus' });
    await wait(300);
    intrus.emit('join-lobby', { twitchId: 'p3', username: 'Intrus' });
    await wait(500);
    socks[0].s.emit('kick-player', { twitchId: 'p3' });
    await wait(600);
    check("exclusion par identifiant seul", exclu === true);
    intrus.close();
    await wait(300);

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
    // Deux réponses différentes : l'une des deux peut être la bonne
    socks.forEach(({ s, id }, i) => s.emit('submit-answer', { twitchId: id, answer: i + 1 }));
    // on attend la fin du chrono : le serveur refuse d avancer pendant la question
    await wait(11000);

    // Le classement de fin de question a besoin de reconnaître chaque joueur
    // et de compter ses bonnes réponses : sans ça le top 5 ne peut pas se construire.
    const res = socks[0].resultats;
    check('résultats de question reçus', !!res);
    check('joueurs identifiables dans le classement',
        !!res && res.players.length > 0 && res.players.every(p => p.twitchId && p.correctAnswers !== undefined),
        res ? res.players.length + ' joueur(s)' : '');
    check('réponses bien enregistrées', !!res && res.players.some(p => p.selectedAnswer),
        res ? res.players.map(p => p.selectedAnswer || '—').join(' / ') : '');
    // La bonne réponse est tirée au hasard : on vérifie la cohérence, pas une valeur
    // La bonne réponse est tirée au hasard : on vérifie la cohérence, pas une valeur
    const aTrouve = !!res && res.stats.correct > 0;
    check("plus rapide désigné dès que quelqu'un trouve",
        !!res && (!aTrouve || !!res.fastestPlayer),
        res && res.fastestPlayer ? res.fastestPlayer.username + ' en ' + res.fastestPlayer.time + ' ms'
                                 : 'personne n a trouvé cette fois');

    const auto = await post('/admin/toggle-auto-mode', {});
    check('bascule du mode auto', auto.success === true, 'auto=' + auto.autoMode);
    await post('/admin/toggle-auto-mode', {});   // on repasse en manuel

    const suivante = await post('/admin/next-question', {});
    check('question suivante déclenchée', !suivante.error, JSON.stringify(suivante).slice(0, 70));
    await wait(2500);
    check('question 2 reçue', socks[0].vu.length >= 2, socks[0].vu.length + ' question(s)');

    // Un départ n'interrompt pas la partie : celui qui reste joue seul,
    // et le compte des joueurs restants suit.
    socks[1].s.emit('leave-lobby', { twitchId: socks[1].id, username: socks[1].nom });
    await wait(1200);
    const etat = await fetch(BASE + '/game/state').then(r => r.json());
    check('la partie continue après un départ', etat.inProgress === true, 'inProgress=' + etat.inProgress);
    check('le compte des joueurs suit', etat.playerCount === 1, 'playerCount=' + etat.playerCount);

    await post('/admin/toggle-game', {});
    socks.forEach(({ s }) => s.close());
    console.log(ko ? `\n${ko} échec(s)` : '\n✨ Contrôles de l\'hôte opérationnels sans /admin');
    process.exit(ko ? 1 : 0);
})();
