// 🏔️ Ascension : quitter en pleine montée.
//
// Le scénario est celui d'une vraie partie : deux grimpeurs, l'un s'en va au
// premier étage, l'autre continue. Trois choses doivent alors se produire.
//
// Celui qui part cesse de monter. Sans cela le serveur le faisait avancer d'un
// étage à chaque minuteur expiré : parti au deuxième, il atteignait le sommet
// tout seul, déclenchait la mort subite et gagnait la partie sans être là.
//
// Il n'entend plus rien. Sa socket restait dans son salon personnel et recevait
// encore les étages : on entendait le pas d'un étage franchi depuis l'écran
// d'accueil, longtemps après être parti.
//
// Il reste au classement, à l'étage où il s'est arrêté — comme au Rush, où l'on
// ne raye pas celui qui s'en va.
//
// ⚠️ La suite attend deux minuteurs d'étage : compter une minute au barème le
// plus court.
const { io } = require('socket.io-client');
const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
const wait = (ms) => new Promise(r => setTimeout(r, ms));

const A = 'part-' + process.pid, B = 'reste-' + process.pid;

let ko = 0;
const check = (l, ok, extra) => {
    console.log(`${ok ? '✅' : '❌'} ${l}${extra ? ' → ' + extra : ''}`);
    if (!ok) ko++;
};

(async () => {
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

    await post('/admin/toggle-game', { lobbyMode: 'ascension' });
    await post('/admin/ascension/set-etages', { etages: 10 });
    await post('/admin/ascension/set-timer', { timer: 20 });

    const joueurs = {};
    for (const [id, nom] of [[A, 'Partant'], [B, 'Restant']]) {
        const s = io(BASE, { transports: ['websocket'] });
        await new Promise(r => s.on('connect', r));
        const recu = { etages: [], fin: [] };
        s.on('ascension-floor-start', (d) => recu.etages.push(d));
        s.on('ascension-game-end', (d) => recu.fin.push(d));
        s.emit('register-authenticated', { playerId: id, username: nom });
        await wait(150);
        s.emit('join-lobby', { playerId: id, username: nom, code });
        joueurs[id] = { s, recu, nom };
    }
    await wait(500);
    await post('/admin/start-game', {});

    for (let i = 0; i < 50 && !joueurs[A].recu.etages.length; i++) await wait(200);
    check('les deux grimpeurs reçoivent leur premier étage',
        joueurs[A].recu.etages.length >= 1 && joueurs[B].recu.etages.length >= 1,
        joueurs[A].recu.etages.length + ' et ' + joueurs[B].recu.etages.length);

    // ── L'un s'en va ──
    joueurs[A].s.emit('leave-lobby', { playerId: A, username: 'Partant' });
    await wait(600);
    const dejaVus = joueurs[A].recu.etages.length;

    // Deux minuteurs passent : le restant doit monter, le partant non
    console.log('   … deux minuteurs d étage (~45 s)');
    await wait(45000);

    check('celui qui est parti ne reçoit plus d étage',
        joueurs[A].recu.etages.length === dejaVus,
        dejaVus + ' → ' + joueurs[A].recu.etages.length);
    check('celui qui reste continue de monter',
        joueurs[B].recu.etages.length > 1,
        joueurs[B].recu.etages.length + ' étage(s)');

    const dernierB = joueurs[B].recu.etages[joueurs[B].recu.etages.length - 1];
    const partantVu = (dernierB.playerProgress || []).find(p => p.playerId === A);
    check('celui qui est parti reste au classement',
        !!partantVu, partantVu ? 'étage ' + (partantVu.floor + 1) : '(absent)');
    check('et il y reste figé à son étage',
        !!partantVu && partantVu.floor === 0, partantVu ? 'floor=' + partantVu.floor : '(absent)');
    check('la partie n est pas terminée pour autant',
        joueurs[B].recu.fin.length === 0, joueurs[B].recu.fin.length + ' fin(s)');

    for (const id of [A, B]) joueurs[id].s.close();
    await post('/admin/toggle-game', {});

    console.log(ko ? `\n${ko} échec(s)` : '\n✨ Qui part cesse de monter, n entend plus rien, et reste au classement');
    process.exit(ko ? 1 : 0);
})();
