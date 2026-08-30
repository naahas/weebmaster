// 🏔️ Ascension : deux tours à la fois.
//
// Le mode a été porté depuis la v1, qui ne connaissait qu'un salon : elle
// diffusait par `io.emit` et nommait ses salons de joueur par le seul
// identifiant. Deux parties simultanées se seraient donc parlé. On vérifie
// ici que ce n'est plus le cas — chaque salon a ses réglages, sa séquence
// d'étages et ses messages, et fermer l'un ne touche pas l'autre.
//
// C'est la contrepartie d'Ascension à `test:rooms` et `test:mixte`.
const { io } = require('socket.io-client');
const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
const wait = (ms) => new Promise(r => setTimeout(r, ms));

let ko = 0;
const check = (l, ok, extra) => {
    console.log(`${ok ? '✅' : '❌'} ${l}${extra ? ' → ' + extra : ''}`);
    if (!ok) ko++;
};

// Un salon avec son hôte, son jeton et son grimpeur
function salon(nom) {
    let jeton = '', code = '';
    const post = (p, b) => fetch(BASE + p, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Host-Token': jeton },
        body: JSON.stringify(b || {}),
    }).then(r => r.json().then(j => {
        if (j.hostToken) jeton = j.hostToken;
        if (j.roomCode) code = j.roomCode;
        return j;
    }));
    return {
        nom, post,
        get code() { return code; },
        recu: { etages: [], progres: [], fin: [] },
        socket: null,
    };
}

(async () => {
    // Deux identifiants distincts d'un lancement à l'autre : le serveur
    // rebranche un joueur sur son salon par son identifiant, et deux suites
    // qui se suivent se seraient mélangées.
    const IDA = 'a-' + process.pid, IDB = 'b-' + process.pid;

    const A = salon('A'), B = salon('B');
    const tous = [A, B];

    // ── Ouverture, réglages distincts ──
    await A.post('/admin/toggle-game', { lobbyMode: 'ascension' });
    await B.post('/admin/toggle-game', { lobbyMode: 'ascension' });
    check('deux salons Ascension coexistent', !!A.code && !!B.code && A.code !== B.code,
        A.code + ' et ' + B.code);

    await A.post('/admin/ascension/set-etages', { etages: 10 });
    await A.post('/admin/ascension/set-timer', { timer: 20 });
    await B.post('/admin/ascension/set-etages', { etages: 20 });
    await B.post('/admin/ascension/set-timer', { timer: 45 });

    const etatA = await fetch(BASE + '/game/state?code=' + A.code).then(r => r.json());
    const etatB = await fetch(BASE + '/game/state?code=' + B.code).then(r => r.json());
    check('chaque salon garde ses propres réglages',
        etatA.ascension.floors === 10 && etatA.ascension.timer === 20 &&
        etatB.ascension.floors === 20 && etatB.ascension.timer === 45,
        etatA.ascension.floors + '/' + etatA.ascension.timer + ' contre ' +
        etatB.ascension.floors + '/' + etatB.ascension.timer);

    // ── Un grimpeur dans chacun ──
    for (const [s, id] of [[A, IDA], [B, IDB]]) {
        s.socket = io(BASE, { transports: ['websocket'] });
        await new Promise(r => s.socket.on('connect', r));
        s.socket.on('ascension-floor-start', (d) => s.recu.etages.push(d));
        s.socket.on('ascension-progress', (d) => s.recu.progres.push(d));
        s.socket.on('ascension-game-end', (d) => s.recu.fin.push(d));
        s.socket.emit('register-authenticated', { playerId: id, username: 'Grimpeur' + s.nom });
        await wait(150);
        s.socket.emit('join-lobby', { playerId: id, username: 'Grimpeur' + s.nom, code: s.code });
    }
    await wait(500);

    // ── A démarre seul : B ne doit rien entendre ──
    await A.post('/admin/start-game', {});
    for (let i = 0; i < 50 && !A.recu.etages.length; i++) await wait(200);

    check('le salon qui démarre reçoit son étage', A.recu.etages.length >= 1,
        A.recu.etages.length + ' étage(s)');
    check('le salon voisin n entend rien', B.recu.etages.length === 0,
        B.recu.etages.length + ' étage(s) reçu(s) à tort');
    check('il n entend pas non plus la progression', B.recu.progres.length === 0,
        B.recu.progres.length + ' message(s) à tort');

    const etatBapres = await fetch(BASE + '/game/state?code=' + B.code).then(r => r.json());
    check('le salon voisin ne se croit pas en partie',
        etatBapres.ascension.active === false, 'active=' + etatBapres.ascension.active);

    // ── B démarre à son tour ──
    await B.post('/admin/start-game', {});
    for (let i = 0; i < 50 && !B.recu.etages.length; i++) await wait(200);

    check('le second salon reçoit le sien', B.recu.etages.length >= 1,
        B.recu.etages.length + ' étage(s)');
    check('chacun compte ses propres étages',
        A.recu.etages[0].totalFloors === 10 && B.recu.etages[0].totalFloors === 20,
        A.recu.etages[0].totalFloors + ' contre ' + B.recu.etages[0].totalFloors);
    check('aucun grimpeur ne voit celui d en face',
        A.recu.etages.every(e => (e.playerProgress || []).every(p => p.playerId !== IDB)) &&
        B.recu.etages.every(e => (e.playerProgress || []).every(p => p.playerId !== IDA)),
        'les tours restent séparées');

    // ── Une réponse dans A ne bouge pas B ──
    const avantB = B.recu.progres.length;
    A.socket.emit('ascension-check-guess', { characterId: 'inexistant', name: 'peu importe' });
    await wait(500);
    check('une réponse dans un salon laisse l autre tranquille',
        B.recu.progres.length === avantB, avantB + ' → ' + B.recu.progres.length);

    // ── Fermer A ne touche pas B ──
    await A.post('/admin/toggle-game', {});
    await wait(600);
    const etatBfin = await fetch(BASE + '/game/state?code=' + B.code).then(r => r.json());
    check('fermer un salon laisse l autre en partie',
        !!(etatBfin.ascension && etatBfin.ascension.active === true),
        etatBfin.ascension ? 'active=' + etatBfin.ascension.active : '(salon perdu)');
    check('le salon fermé n a pas emporté la fin de l autre', B.recu.fin.length === 0,
        B.recu.fin.length + ' fin(s) reçue(s)');

    for (const s of tous) if (s.socket) s.socket.close();
    await B.post('/admin/toggle-game', {});

    console.log(ko ? `\n${ko} échec(s)` : '\n✨ Deux tours montent côte à côte sans se voir');
    process.exit(ko ? 1 : 0);
})();
