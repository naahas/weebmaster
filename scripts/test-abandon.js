// Un salon que tout le monde a quitté sans le fermer doit finir par se libérer.
// Pendant une partie les joueurs déconnectés restent inscrits — pour pouvoir
// revenir — donc le ménage ne peut pas se contenter de compter les inscrits.
//
// Le délai de grâce est de 10 min en production : on le raccourcit ici.
//   GRACE_SALON_VIDE=3000 node server.js
const { io } = require('socket.io-client');
const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const GRACE = parseInt(process.env.GRACE_SALON_VIDE, 10) || 10 * 60 * 1000;

const post = (p, jeton, b) => fetch(BASE + p, {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { 'X-Host-Token': jeton } : {}),
    body: JSON.stringify(b || {}),
}).then(r => r.json().then(j => ({ status: r.status, body: j })));

const etat = (code) => fetch(BASE + '/game/state?code=' + code).then(r => r.json());

let ko = 0;
const check = (l, ok, extra) => { console.log(`${ok ? '✅' : '❌'} ${l}${extra ? ' → ' + extra : ''}`); if (!ok) ko++; };

(async () => {
    if (GRACE > 60000) {
        console.log(`⚠️ Délai de grâce à ${GRACE / 1000} s : relance le serveur avec`);
        console.log('   GRACE_SALON_VIDE=3000 node server.js');
        process.exit(1);
    }

    // ── Un salon abandonné en pleine partie ──
    const r = (await post('/admin/toggle-game', null, { lobbyMode: 'classic' })).body;
    const socks = [];
    for (const [id, n] of [['ab1', 'Un'], ['ab2', 'Deux']]) {
        const s = io(BASE);
        await new Promise(res => s.on('connect', res));
        s.emit('register-authenticated', { playerId: id, username: n });
        await wait(120);
        s.emit('join-lobby', { playerId: id, username: n, code: r.roomCode });
        socks.push(s);
    }
    await wait(600);
    await post('/admin/start-game', r.hostToken, {});
    await wait(1200);

    const enCours = await etat(r.roomCode);
    check('la partie tourne', enCours.inProgress === true && enCours.playerCount === 2,
        enCours.playerCount + ' joueur(s)');

    // Tout le monde ferme son onglet, personne ne referme le salon
    socks.forEach(s => s.close());
    await wait(1500);

    const juste = await etat(r.roomCode);
    check('les joueurs restent inscrits juste après', juste.playerCount === 2,
        juste.playerCount + ' joueur(s) — ils peuvent encore revenir');

    // ── Passé le délai de grâce, le salon doit disparaître ──
    // Le ménage tourne toutes les minutes en production ; en test il faut donc
    // patienter au moins un tour de balayage après la grâce.
    console.log(`   (on patiente ~${Math.round((GRACE * 3 + 2000) / 1000)} s, le temps d un tour de ménage)`);
    await wait(GRACE * 2 + Math.min(62000, GRACE + 2000));

    const apres = await etat(r.roomCode);
    check('le salon abandonné a été libéré', apres.isActive === false,
        apres.isActive ? 'toujours ouvert' : 'fermé');

    console.log(ko ? `\n${ko} échec(s)` : '\n✨ Les salons abandonnés se libèrent');
    process.exit(ko ? 1 : 0);
})();
