// Le plafond de BombAnime : remplissage, refus du joueur de trop, démarrage.
// Une seule valeur à changer ici quand le plafond bouge.
const PLAFOND = 15;
const { io } = require('socket.io-client');
const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
const MDP = require("./mdp-hote");   // mesure temporaire : ouverture du mode Classique
const wait = (ms) => new Promise(r => setTimeout(r, ms));

let jeton = '', code = '';
const post = (p, b) => fetch(BASE + p, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Host-Token': jeton },
    body: JSON.stringify(Object.assign({ motDePasse: MDP }, b || {})),
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
    s.emit('register-authenticated', { playerId: 'hotePlafond', username: 'Hote' });
    await wait(150);
    s.emit('join-lobby', { playerId: 'hotePlafond', username: 'Hote', isHost: true, code, hostToken: jeton });
    await wait(400);

    let e = await etat();
    check('le plafond annoncé est celui attendu', e.maxPlayers === PLAFOND,
        e.maxPlayers + ' (attendu ' + PLAFOND + ')');

    // On en demande bien plus que la place : le serveur s'arrête au plafond
    s.emit('dev-add-bots', { count: PLAFOND + 15, hostToken: jeton });
    await wait(700);
    e = await etat();
    check('le salon se remplit jusqu au plafond', e.playerCount === PLAFOND,
        e.playerCount + ' joueur(s)');
    check('le salon se déclare plein', e.isLobbyFull === true, 'isLobbyFull=' + e.isLobbyFull);

    // Le joueur de trop doit être refusé
    const tard = io(BASE);
    await new Promise(r => tard.on('connect', r));
    let refus = '';
    tard.on('error', (d) => { refus = d.message || ''; });
    tard.emit('register-authenticated', { playerId: 'tardif', username: 'Tardif' });
    await wait(150);
    tard.emit('join-lobby', { playerId: 'tardif', username: 'Tardif', code });
    await wait(600);
    e = await etat();
    check('le joueur de trop est refusé', e.playerCount === PLAFOND && /plein/i.test(refus),
        e.playerCount + ' joueur(s), message « ' + refus + ' »');

    const depart = await post('/admin/start-game', {});
    check('la manche démarre au complet', depart.body.success === true, depart.body.error || 'ok');

    await wait(400);
    await post('/admin/toggle-game', {});
    s.close(); tard.close();
    await wait(300);

    console.log(ko ? `\n${ko} échec(s)` : `\n✨ BombAnime tient ses ${PLAFOND} joueurs`);
    process.exit(ko ? 1 : 0);
})();
