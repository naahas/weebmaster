// BombAnime en v2 : les trois réglages du salon, et l'enchaînement des manches.
const { io } = require('socket.io-client');
const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
const wait = (ms) => new Promise(r => setTimeout(r, ms));

let jeton = '', code = '';
const post = (p, b) => fetch(BASE + p, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Host-Token': jeton },
    body: JSON.stringify(b || {}),
}).then(r => r.json().then(j => {
    if (j.hostToken) jeton = j.hostToken;
    if (j.roomCode) code = j.roomCode;
    return { status: r.status, body: j };
}));
const etat = () => fetch(BASE + '/game/state?code=' + code).then(r => r.json());

let ko = 0;
const check = (l, ok, extra) => { console.log(`${ok ? '✅' : '❌'} ${l}${extra ? ' → ' + extra : ''}`); if (!ok) ko++; };

(async () => {
    const salonsAvant = (await fetch(BASE + '/api/home-stats').then(r => r.json())).activeRooms;
    await post('/admin/toggle-game', { lobbyMode: 'bombanime' });

    // ── Les valeurs par défaut ──
    let e = await etat();
    check('série par défaut', e.bombanime.serie === 'Naruto', e.bombanime.serie);
    check('timer par défaut à 8 s', e.bombanime.timer === 8, e.bombanime.timer + 's');
    check('deux vies par défaut', e.bombanime.lives === 2, e.bombanime.lives);

    // ── Les trois réglages se changent depuis le salon ──
    const serie = await post('/admin/bombanime/update-serie', { serie: 'DemonSlayer' });
    check('la série se change', serie.status === 200, serie.body.error || 'ok');

    const t = await post('/admin/bombanime/set-timer', { timer: 5 });
    check('le timer descend à 5 s', t.status === 200 && t.body.timer === 5, t.body.error || '5s');

    const v = await post('/admin/bombanime/set-lives', { lives: 1 });
    check('une seule vie', v.status === 200 && v.body.lives === 1, v.body.error || '1');

    e = await etat();
    check('le salon a bien retenu les trois',
        e.bombanime.serie === 'DemonSlayer' && e.bombanime.timer === 5 && e.bombanime.lives === 1,
        `${e.bombanime.serie} · ${e.bombanime.timer}s · ${e.bombanime.lives} vie(s)`);

    // ── Les bornes sont tenues ──
    const trop = await post('/admin/bombanime/set-timer', { timer: 30 });
    check('un timer hors bornes est refusé', trop.status === 400, 'HTTP ' + trop.status);
    const troisVies = await post('/admin/bombanime/set-lives', { lives: 3 });
    check('trois vies sont refusées', troisVies.status === 400, 'HTTP ' + troisVies.status);

    // On remet de quoi jouer une manche courte
    await post('/admin/bombanime/set-timer', { timer: 5 });
    await post('/admin/bombanime/set-lives', { lives: 1 });

    // ── Une manche, puis une relance ──
    const socks = [];
    for (const [id, nom] of [['b1', 'Un'], ['b2', 'Deux']]) {
        const s = io(BASE);
        await new Promise(r => s.on('connect', r));
        const vu = { fins: 0, salon: 0 };
        s.on('bombanime-game-ended', () => { vu.fins++; });
        s.on('retour-au-salon', () => { vu.salon++; });
        s.emit('register-authenticated', { playerId: id, username: nom });
        await wait(120);
        s.emit('join-lobby', { playerId: id, username: nom, code });
        socks.push({ s, id, vu });
    }
    await wait(700);

    const depart = await post('/admin/start-game', {});
    check('la manche démarre', depart.body.success === true, depart.body.error || 'ok');

    // Personne ne répond : la bombe fait le travail
    for (let i = 0; i < 60 && socks[0].vu.fins === 0; i++) await wait(400);
    check('la partie se termine sur explosion', socks[0].vu.fins > 0);

    const apresFin = await etat();
    check('le salon reste ouvert après la partie', apresFin.isActive === true,
        'isActive=' + apresFin.isActive);
    check('le podium survit au rafraîchissement',
        apresFin.showingWinner === true &&
        !!apresFin.winnerScreenData &&
        apresFin.winnerScreenData.gameMode === 'bombanime',
        apresFin.showingWinner ? 'gameMode=' + (apresFin.winnerScreenData || {}).gameMode : 'aucun podium');
    check('le classement est complet', ((apresFin.winnerScreenData || {}).ranking || []).length === 2,
        ((apresFin.winnerScreenData || {}).ranking || []).length + ' place(s)');

    // Sans jeton, personne ne relance la partie d'un autre
    const sansJeton = await fetch(BASE + '/admin/replay', { method: 'POST' }).then(r => r.status);
    check("la relance exige le jeton d'hôte", sansJeton === 403, 'HTTP ' + sansJeton);

    const relance = await post('/admin/replay', {});
    check('la relance est acceptée', relance.status === 200, relance.body.error || 'ok');
    check('les joueurs sont restés', relance.body.playerCount === 2,
        relance.body.playerCount + ' joueur(s)');
    check('tout le monde revient au salon', socks.every(s => s.vu.salon === 1));

    const apres = await etat();
    check('le salon est toujours en BombAnime', apres.lobbyMode === 'bombanime', apres.lobbyMode);
    check('la relance efface le podium', apres.showingWinner === false,
        'showingWinner=' + apres.showingWinner);
    check('le salon est rouvert pour la manche suivante', apres.isActive === true,
        'isActive=' + apres.isActive);
    check('les réglages ont survécu à la manche',
        apres.bombanime.serie === 'DemonSlayer' && apres.bombanime.timer === 5,
        `${apres.bombanime.serie} · ${apres.bombanime.timer}s`);

    const redemarrage = await post('/admin/start-game', {});
    check('une seconde manche peut partir', redemarrage.body.success === true,
        redemarrage.body.error || 'ok');

    await wait(500);

    // ── Trois manches d'affilée : l'usage réel du bouton Rejouer ──
    const pendant = await post('/admin/replay', {});
    check('pas de relance en pleine partie', pendant.status === 400, 'HTTP ' + pendant.status);

    socks.forEach(s => { s.vu.fins = 0; s.vu.salon = 0; });
    for (let i = 0; i < 60 && socks[0].vu.fins === 0; i++) await wait(400);
    check('la deuxième manche se termine aussi', socks[0].vu.fins > 0);

    const relance2 = await post('/admin/replay', {});
    check('deuxième relance acceptée', relance2.status === 200, relance2.body.error || 'ok');
    check('personne n\'a été perdu en route', relance2.body.playerCount === 2,
        relance2.body.playerCount + ' joueur(s)');
    check('tout le monde revient au salon une seconde fois',
        socks.every(s => s.vu.salon === 1));

    const troisieme = await post('/admin/start-game', {});
    check('une troisième manche peut partir', troisieme.body.success === true,
        troisieme.body.error || 'ok');

    await wait(500);

    // ── Le « Retour » de l'hôte referme bien le salon ──
    const ferme = await post('/admin/toggle-game', {});
    check("le « Retour » de l'hôte ferme le salon", ferme.body.isActive === false,
        'isActive=' + ferme.body.isActive);
    const vide = await fetch(BASE + '/api/home-stats').then(r => r.json());
    check("il ne reste pas de salon fantôme", vide.activeRooms === salonsAvant,
        salonsAvant + ' → ' + vide.activeRooms + ' salon(s)');

    socks.forEach(s => s.s.close());
    await wait(300);

    console.log(ko ? `\n${ko} échec(s)` : '\n✨ BombAnime se règle depuis le salon et enchaîne les manches');
    process.exit(ko ? 1 : 0);
})();
