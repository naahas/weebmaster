// Vérifie que l'hôte peut enchaîner les questions depuis / (sans /admin)
const { io } = require('socket.io-client');
const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
// Les routes /admin sont réservées à l'hôte : on retient le jeton remis à
// l'ouverture du salon et on le joint à tous les appels suivants.
let hostToken = '';
let roomCode = '';
const post = (p, b) => fetch(BASE + p, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Host-Token': hostToken },
    body: JSON.stringify(b || {}),
}).then(r => r.json()).then(j => { if (j && j.hostToken) hostToken = j.hostToken;
    if (j && j.roomCode) roomCode = j.roomCode; return j; });
const wait = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
    let ko = 0;
    const check = (l, ok, extra) => { console.log(`${ok ? '✅' : '❌'} ${l}${extra ? ' → ' + extra : ''}`); if (!ok) ko++; };

    await post('/admin/toggle-game', { lobbyMode: 'classic' });

    const socks = [];
    for (const [id, nom] of [['h1', 'Hote'], ['p2', 'Joueur2']]) {
        const s = io(BASE);
        await new Promise(r => s.on('connect', r));
        s.emit('register-authenticated', { playerId: id, username: nom });
        socks.push({ s, id, nom, vu: [] });
        s.on('new-question', (d) => socks.find(x => x.s === s).vu.push(d));
        s.on('game-started', (d) => { socks.find(x => x.s === s).depart = d; });
        s.on('question-results', (d) => { socks.find(x => x.s === s).resultats = d; });
    }
    await wait(300);
    socks.forEach(({ s, id, nom }, i) => s.emit('join-lobby', { playerId: id, username: nom, isHost: i === 0, code: roomCode }));
    await wait(500);

    // Exclusion d'un joueur : l'hôte n'envoie que l'identifiant depuis la liste du salon
    const intrus = io(BASE);
    await new Promise(r => intrus.on('connect', r));
    let exclu = false;
    intrus.on('kicked', () => { exclu = true; });
    intrus.emit('register-authenticated', { playerId: 'p3', username: 'Intrus' });
    await wait(300);
    let dansLeSalon = false;
    intrus.on('lobby-update', (d) => {
        if ((d.players || []).some(p => p.playerId === 'p3')) dansLeSalon = true;
    });
    intrus.emit('join-lobby', { playerId: 'p3', username: 'Intrus', code: roomCode });
    for (let i = 0; i < 40 && !dansLeSalon; i++) await wait(50);
    socks[0].s.emit('kick-player', { playerId: 'p3', hostToken });
    for (let i = 0; i < 20 && !exclu; i++) await wait(50);
    check("exclusion par identifiant seul", exclu === true);
    intrus.close();
    await wait(300);

    // Solo et équipes ne sont qu'un réglage du même quiz
    const enEquipes = await post('/admin/set-teams', { enabled: true });
    check('passage en équipes', enEquipes.lobbyMode === 'rivalry', enEquipes.lobbyMode);
    const enSolo = await post('/admin/set-teams', { enabled: false });
    check('retour en solo', enSolo.lobbyMode === 'classic', enSolo.lobbyMode);

    // L'hôte répartit : attribution nominative puis mélange équilibré
    await post('/admin/set-teams', { enabled: true });
    const apresBascule = await fetch(BASE + '/game/state?code=' + roomCode).then(r => r.json());
    const sansCamp = (apresBascule.players || []).filter(p => !p.team).length;
    check('personne ne reste sans camp au passage en équipes', sansCamp === 0, sansCamp + ' sans camp');
    const place = await post('/admin/set-player-team', { playerId: 'p2', team: 2 });
    check('camp attribué par l hôte', place.success === true && place.team === 2, 'team=' + place.team);
    const melange = await post('/admin/shuffle-teams', {});
    const ecart = melange.teamCounts ? Math.abs(melange.teamCounts[1] - melange.teamCounts[2]) : 99;
    check('mélange équilibré', melange.success === true && ecart <= 1,
        melange.teamCounts ? melange.teamCounts[1] + ' contre ' + melange.teamCounts[2] : 'aucun');
    // Un rafraîchissement de page ne doit ni sortir du salon ni changer de camp
    const avantRefresh = await fetch(BASE + '/game/state?code=' + roomCode).then(r => r.json());
    const campAvant = (avantRefresh.players.find(p => p.playerId === 'p2') || {}).team;
    socks[1].s.disconnect();
    await wait(150);
    const revenu = io(BASE);
    await new Promise(r => revenu.on('connect', r));
    revenu.emit('register-authenticated', { playerId: 'p2', username: 'Joueur2' });
    await wait(150);
    revenu.emit('join-lobby', { playerId: 'p2', username: 'Joueur2', code: roomCode });
    await wait(400);
    const apresRefresh = await fetch(BASE + '/game/state?code=' + roomCode).then(r => r.json());
    const rentre = apresRefresh.players.find(p => p.playerId === 'p2');
    check('le camp survit à un rafraîchissement', !!rentre && rentre.team === campAvant,
        campAvant + ' → ' + (rentre ? rentre.team : 'sorti du salon'));

    // La socket qui vient de rejoindre doit rester en ligne : coupée, elle
    // manquait toutes les diffusions jusqu'à sa reconnexion automatique.
    let diffusionRecue = false;
    revenu.on('lobby-update', () => { diffusionRecue = true; });
    check('la socket revenue reste connectée', revenu.connected === true);
    await post('/admin/set-player-team', { playerId: 'p2', team: campAvant === 1 ? 2 : 1 });
    for (let i = 0; i < 20 && !diffusionRecue; i++) await wait(50);
    check('elle reçoit bien les diffusions du salon', diffusionRecue === true);
    socks[1].s = revenu;

    // Un camp vide fait échouer le démarrage : le bouton est grisé côté hôte,
    // mais le serveur reste la dernière barrière.
    const tous = await fetch(BASE + '/game/state?code=' + roomCode).then(r => r.json());
    for (const p of tous.players || []) await post('/admin/set-player-team', { playerId: p.playerId, team: 1 });
    const refus = await post('/admin/start-game', {});
    check('un camp vide bloque le démarrage', refus.errorType === 'empty_team', refus.error || 'aucune erreur');

    await post('/admin/set-teams', { enabled: false });

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
    socks.forEach(({ s, id }, i) => s.emit('submit-answer', { playerId: id, answer: i + 1 }));
    // on attend la fin du chrono : le serveur refuse d avancer pendant la question
    await wait(11000);

    // Le classement de fin de question a besoin de reconnaître chaque joueur
    // et de compter ses bonnes réponses : sans ça le top 5 ne peut pas se construire.
    const res = socks[0].resultats;
    check('résultats de question reçus', !!res);
    check('joueurs identifiables dans le classement',
        !!res && res.players.length > 0 && res.players.every(p => p.playerId && p.correctAnswers !== undefined),
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

    // Le serveur arme l enchainement a la revelation. Active pendant les
    // resultats — le moment ou l hote y pense — il faut l amorcer, sinon il
    // attend une question suivante qui ne viendra jamais.
    const avantAuto = socks[0].vu.length;
    const amorce = await post('/admin/trigger-auto-next', {});
    check("le mode auto s amorce pendant les resultats", amorce.success !== false,
        amorce.reason || 'arme');
    for (let k = 0; k < 60 && socks[0].vu.length === avantAuto; k++) await wait(100);
    check('il enchaine bien tout seul', socks[0].vu.length > avantAuto,
        socks[0].vu.length + ' question(s)');

    await post('/admin/toggle-auto-mode', {});   // on repasse en manuel
    for (let k = 0; k < 150; k++) {
        const e = await fetch(BASE + '/game/state?code=' + roomCode).then(r => r.json());
        if (e.showResults) break;
        await wait(100);
    }

    const suivante = await post('/admin/next-question', {});
    check('question suivante déclenchée', !suivante.error, JSON.stringify(suivante).slice(0, 70));
    await wait(2500);
    check('question 2 reçue', socks[0].vu.length >= 2, socks[0].vu.length + ' question(s)');

    // Un départ n'interrompt pas la partie : celui qui reste joue seul,
    // et le compte des joueurs restants suit.
    socks[1].s.emit('leave-lobby', { playerId: socks[1].id, username: socks[1].nom });
    await wait(1200);
    const etat = await fetch(BASE + '/game/state?code=' + roomCode).then(r => r.json());
    check('la partie continue après un départ', etat.inProgress === true, 'inProgress=' + etat.inProgress);
    check('le compte des joueurs suit', etat.playerCount === 1, 'playerCount=' + etat.playerCount);

    await post('/admin/toggle-game', {});
    socks.forEach(({ s }) => s.close());
    console.log(ko ? `\n${ko} échec(s)` : '\n✨ Contrôles de l\'hôte opérationnels sans /admin');
    process.exit(ko ? 1 : 0);
})();
