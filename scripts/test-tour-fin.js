// 🏔️ Ascension : la fin de partie et son classement.
//
// La montée s'arrête de deux façons — quelqu'un atteint le sommet, ou tout le
// monde est tombé. Dans les deux cas le serveur envoie un podium, et c'est lui
// que l'écran final lit. On vérifie ici qu'il porte de quoi l'écrire : un rang,
// un étage, et la distinction entre celui qui a fini et celui qui est tombé.
//
// Personne ne répond : un minuteur expiré ne fait pas tomber de la tour, il
// pousse à l'étage suivant. On monte donc en silence jusqu'au sommet, ce qui
// déclenche la mort subite et la fin de partie. C'est le seul chemin qui ne
// demande pas de résoudre sept types d'épreuve — mais il coûte dix étages de
// vingt secondes : ⚠️ CETTE SUITE DURE TROIS MINUTES ET DEMIE.
//
// On vérifie aussi que « Rejouer » remet la tour à neuf sans perdre les
// réglages du salon : sans cela la manche suivante repartait sur les
// progressions de la précédente.
const { io } = require('socket.io-client');
const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
const wait = (ms) => new Promise(r => setTimeout(r, ms));

// Un identifiant par lancement : deux suites qui se suivent partageaient le
// leur, et « register-authenticated » rebranchait la seconde sur le salon de la
// premiere. Elle recevait alors la fin de partie du salon d a cote.
const JOUEUR = 'grimpeur-' + process.pid;
const NOM = 'Grimpeur';

let ko = 0;
const check = (l, ok, extra) => {
    console.log(`${ok ? '✅' : '❌'} ${l}${extra ? ' → ' + extra : ''}`);
    if (!ok) ko++;
};

(async () => {
    let jeton = '', code = '';
    let fermer = async () => {};
    process.on('uncaughtException', async (e) => {
        console.error(e && e.message);
        try { await fermer(); } catch (x) { /* tant pis */ }
        process.exit(1);
    });
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
    // Le barème le plus court des deux côtés : la suite dure ce que dure un étage
    await post('/admin/ascension/set-etages', { etages: 10 });
    await post('/admin/ascension/set-timer', { timer: 20 });

    const s = io(BASE, { transports: ['websocket'] });
    await new Promise(r => s.on('connect', r));
    fermer = async () => { s.close(); await post('/admin/toggle-game', {}); };

    let fin = null, etage = null;
    s.on('ascension-game-end', (d) => { fin = d; });
    s.on('ascension-floor-start', (d) => { etage = d; });

    s.emit('register-authenticated', { playerId: JOUEUR, username: NOM });
    await wait(150);
    s.emit('join-lobby', { playerId: JOUEUR, username: NOM, code });
    await wait(400);
    await post('/admin/start-game', {});

    for (let i = 0; i < 60 && !etage; i++) await wait(200);
    check('le premier étage arrive', !!etage, etage ? 'étage ' + (etage.floor + 1) : '(rien)');

    // On ne répond rien : chaque minuteur pousse à l'étage suivant, et le
    // sommet finit par arriver. Dix étages de vingt secondes.
    console.log('   … montée silencieuse, dix étages de vingt secondes (~3 min 30)');
    for (let i = 0; i < 1200 && !fin; i++) {
        await wait(250);
        if (i % 80 === 0 && etage) console.log('   … étage ' + (etage.floor + 1) + '/10');
    }

    check('le sommet met fin à la partie', !!fin, fin ? 'podium reçu' : 'aucune fin en 5 min');

    const podium = (fin && fin.podium) || [];
    check('le podium contient le grimpeur', podium.length === 1, podium.length + ' ligne(s)');

    const p = podium[0] || {};
    check('il porte un nom', p.username === NOM, p.username || '(rien)');
    check('il porte un rang', p.rank === 1, String(p.rank));
    check('il porte l étage atteint', p.floor === 10, 'floor=' + p.floor);
    check('le sommet est marqué comme tel', p.sommet === true, String(p.sommet));
    check('le vainqueur désigné est le même',
        !!(fin.winner && fin.winner.playerId === JOUEUR),
        fin.winner ? fin.winner.username : '(aucun)');

    // ── Rejouer ──
    const rejeu = await post('/admin/replay', {});
    check('le salon accepte de rejouer', !!rejeu.success, JSON.stringify(rejeu).slice(0, 60));

    const etat = await fetch(BASE + '/game/state?code=' + code).then(r => r.json());
    check('la tour est remise à neuf',
        !!(etat.ascension && etat.ascension.active === false),
        etat.ascension ? 'active=' + etat.ascension.active : '(pas d ascension)');
    check('les réglages du salon survivent au rejeu',
        !!(etat.ascension && etat.ascension.floors === 10 && etat.ascension.timer === 20),
        etat.ascension ? etat.ascension.floors + ' étages, ' + etat.ascension.timer + ' s' : '(rien)');

    s.close();
    await post('/admin/toggle-game', {});

    console.log(ko ? `\n${ko} échec(s)` : '\n✨ La tour rend son classement, et rejouer la remet à neuf');
    process.exit(ko ? 1 : 0);
})();
