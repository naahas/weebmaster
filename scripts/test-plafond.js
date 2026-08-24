// Vingt joueurs en BombAnime : le plafond, le refus au-delà, et le démarrage.
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
    await post('/admin/toggle-game', { lobbyMode: 'bombanime' });

    const s = io(BASE);
    await new Promise(r => s.on('connect', r));
    s.emit('register-authenticated', { twitchId: 'hote20', username: 'Hote' });
    await wait(150);
    s.emit('join-lobby', { twitchId: 'hote20', username: 'Hote', isHost: true, code, hostToken: jeton });
    await wait(400);

    let e = await etat();
    check('le plafond annoncé est bien vingt', e.maxPlayers === 20, e.maxPlayers);

    // On demande trente bots : le serveur ne doit en accepter que dix-neuf
    s.emit('dev-add-bots', { count: 30, hostToken: jeton });
    await wait(700);
    e = await etat();
    check('le salon se remplit jusqu au plafond', e.playerCount === 20, e.playerCount + ' joueur(s)');
    check('le salon se déclare plein', e.isLobbyFull === true, 'isLobbyFull=' + e.isLobbyFull);

    // Un vingt-et-unième doit être refusé
    const tard = io(BASE);
    await new Promise(r => tard.on('connect', r));
    let refus = '';
    tard.on('error', (d) => { refus = d.message || ''; });
    tard.emit('register-authenticated', { twitchId: 'tardif', username: 'Tardif' });
    await wait(150);
    tard.emit('join-lobby', { twitchId: 'tardif', username: 'Tardif', code });
    await wait(600);
    e = await etat();
    check('le vingt-et-unième est refusé', e.playerCount === 20 && /plein/i.test(refus),
        e.playerCount + ' joueur(s), message « ' + refus + ' »');

    const depart = await post('/admin/start-game', {});
    check('la manche démarre à vingt', depart.body.success === true, depart.body.error || 'ok');

    await wait(400);
    await post('/admin/toggle-game', {});
    s.close(); tard.close();
    await wait(300);

    console.log(ko ? `\n${ko} échec(s)` : '\n✨ BombAnime tient vingt joueurs');
    process.exit(ko ? 1 : 0);
})();
