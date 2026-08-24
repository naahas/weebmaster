// Deux salons en même temps : c'est tout l'objet de la phase 2.
// Vérifie qu'ils ne se voient pas, ne s'entendent pas, et ne se pilotent pas.
const { io } = require('socket.io-client');
const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
const wait = (ms) => new Promise(r => setTimeout(r, ms));

const post = (p, jeton, b) => fetch(BASE + p, {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { 'X-Host-Token': jeton } : {}),
    body: JSON.stringify(b || {}),
}).then(r => r.json().then(j => ({ status: r.status, body: j })));

const etat = (code) => fetch(BASE + '/game/state?code=' + code).then(r => r.json());

let ko = 0;
const check = (l, ok, extra) => { console.log(`${ok ? '✅' : '❌'} ${l}${extra ? ' → ' + extra : ''}`); if (!ok) ko++; };

async function joueur(id, nom, code) {
    const s = io(BASE);
    await new Promise(r => s.on('connect', r));
    const vu = { questions: [], lobby: [], fins: [], erreurs: [], departs: [] };
    s.on('new-question', (q) => vu.questions.push(q));
    s.on('lobby-update', (d) => vu.lobby.push(d));
    s.on('game-ended', (d) => vu.fins.push(d));
    s.on('game-deactivated', () => vu.fins.push('ferme'));
    s.on('error', (e) => vu.erreurs.push(e.message));
    s.on('game-started', (d) => vu.departs.push(d));
    s.emit('register-authenticated', { twitchId: id, username: nom });
    await wait(120);
    s.emit('join-lobby', { twitchId: id, username: nom, code });
    return { s, id, nom, vu };
}

(async () => {
    // ── Deux salons, deux hôtes ──
    const a = (await post('/admin/toggle-game', null, { lobbyMode: 'classic' })).body;
    const b = (await post('/admin/toggle-game', null, { lobbyMode: 'classic' })).body;
    check('deux salons ouverts en parallèle', a.isActive && b.isActive && a.roomCode !== b.roomCode,
        a.roomCode + ' et ' + b.roomCode);
    check('chacun son jeton', a.hostToken !== b.hostToken);

    const stats = await fetch(BASE + '/api/home-stats').then(r => r.json());
    check('les deux sont comptés', stats.activeRooms >= 2, stats.activeRooms + ' salon(s)');

    // ── Deux joueurs de chaque côté ──
    const a1 = await joueur('a1', 'Alice', a.roomCode);
    const a2 = await joueur('a2', 'Arthur', a.roomCode);
    const b1 = await joueur('b1', 'Bea', b.roomCode);
    const b2 = await joueur('b2', 'Bruno', b.roomCode);
    await wait(600);

    const ea = await etat(a.roomCode), eb = await etat(b.roomCode);
    check('salon A ne voit que les siens', ea.playerCount === 2,
        ea.playerCount + ' joueur(s) : ' + (ea.players || []).map(p => p.username).join(', '));
    check('salon B ne voit que les siens', eb.playerCount === 2,
        eb.playerCount + ' joueur(s) : ' + (eb.players || []).map(p => p.username).join(', '));

    // ── Un code inconnu n'ouvre rien ──
    const perdu = await joueur('x1', 'Perdu', 'ZZZZ');
    await wait(400);
    check('un code inconnu est refusé', perdu.vu.erreurs.some(m => /invalide/i.test(m)),
        perdu.vu.erreurs[0] || 'aucune erreur');
    perdu.s.close();

    // ── Les réglages de l'un ne touchent pas l'autre ──
    await post('/admin/set-mode', a.hostToken, { mode: 'points' });
    await post('/admin/set-time', a.hostToken, { time: 7 });
    const ea2 = await etat(a.roomCode), eb2 = await etat(b.roomCode);
    check('le mode change dans A seulement', ea2.mode === 'points' && eb2.mode === 'lives',
        'A=' + ea2.mode + ' B=' + eb2.mode);
    check('le temps change dans A seulement', ea2.questionTime === 7 && eb2.questionTime === 10,
        'A=' + ea2.questionTime + 's B=' + eb2.questionTime + 's');

    // ── Le jeton de A ne pilote pas B ──
    const vol = await post('/admin/start-game', 'inconnu', {});
    check("un jeton étranger ne démarre rien", vol.status === 403, 'HTTP ' + vol.status);

    // ── Une partie démarre d'un côté sans réveiller l'autre ──
    const avantB = b1.vu.questions.length;
    await post('/admin/start-game', a.hostToken, {});
    await wait(1500);
    check('les joueurs de A reçoivent la question', a1.vu.questions.length > 0,
        a1.vu.questions.length + ' question(s)');
    check("ceux de B n'entendent rien", b1.vu.questions.length === avantB,
        b1.vu.questions.length + ' question(s)');

    check("le demarrage de A ne s annonce pas dans B", b1.vu.departs.length === 0,
        b1.vu.departs.length + ' annonce(s) recue(s)');
    check('les joueurs de A ont bien ete prevenus', a1.vu.departs.length === 1,
        a1.vu.departs.length + ' annonce(s)');

    const eb3 = await etat(b.roomCode);
    check('le salon B est toujours au repos', eb3.inProgress === false);

    // ── Fermer A laisse B debout ──
    await post('/admin/toggle-game', a.hostToken, {});
    await wait(500);
    check('les joueurs de A sont renvoyés', a1.vu.fins.includes('ferme'));
    check("ceux de B ne bougent pas", !b1.vu.fins.includes('ferme'));
    const eb4 = await etat(b.roomCode);
    check('le salon B vit toujours', eb4.isActive === true && eb4.playerCount === 2,
        eb4.playerCount + ' joueur(s)');

    // ── Le plafond de salons tient, et se libère tout seul ──
    const ouverts = [];
    let refus = null;
    for (let i = 0; i < 60; i++) {
        const r = await post('/admin/toggle-game', null, { lobbyMode: 'classic' });
        if (r.status === 503) { refus = r; break; }
        ouverts.push(r.body.hostToken);
    }
    check('le nombre de salons est plafonné', refus !== null,
        refus ? ouverts.length + ' ouverts puis refus' : 'aucun refus après 60 tentatives');

    // Un salon fermé rend sa place immédiatement
    if (ouverts.length) {
        await post('/admin/toggle-game', ouverts.pop(), {});
        const apres = await post('/admin/toggle-game', null, { lobbyMode: 'classic' });
        check('un salon fermé rend sa place', apres.status !== 503, 'HTTP ' + apres.status);
        if (apres.body && apres.body.hostToken) ouverts.push(apres.body.hostToken);
    }
    for (const t of ouverts) await post('/admin/toggle-game', t, {});

    await post('/admin/toggle-game', b.hostToken, {});
    [a1, a2, b1, b2].forEach(p => p.s.close());
    await wait(300);

    console.log(ko ? `\n${ko} échec(s)` : '\n✨ Deux salons cohabitent sans se voir');
    process.exit(ko ? 1 : 0);
})();
