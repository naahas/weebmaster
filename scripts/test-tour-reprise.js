// 🏔️ Ascension : reprendre la montée après un rafraîchissement.
//
// Le joueur recharge sa page en plein étage. Il doit retrouver l'étage où il
// était, le minuteur là où il en était — et non remis à neuf —, le contenu de
// l'épreuve, et la tour avec tout le monde dessus.
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
    return j;
}));

let ko = 0;
const check = (l, ok, extra) => {
    console.log(`${ok ? '✅' : '❌'} ${l}${extra ? ' → ' + extra : ''}`);
    if (!ok) ko++;
};

(async () => {
    await post('/admin/toggle-game', { lobbyMode: 'ascension' });
    await post('/admin/ascension/set-etages', { etages: 10 });
    await post('/admin/ascension/set-timer', { timer: 45 });

    const s = io(BASE, { transports: ['websocket'] });
    await new Promise(r => s.on('connect', r));
    const etages = [];
    s.on('ascension-floor-start', (d) => etages.push(d));
    s.emit('register-authenticated', { playerId: 'g1', username: 'Grimpeur' });
    await wait(150);
    s.emit('join-lobby', { playerId: 'g1', username: 'Grimpeur', code });
    await wait(500);

    // Quelques compagnons, pour que la tour ait de quoi se souvenir
    s.emit('dev-add-bots', { count: 4, hostToken: jeton });
    await wait(400);

    await post('/admin/start-game', {});

    // ── Recharger pendant le décompte d'entrée ──
    // Il dure quatre secondes. Une reprise à cet instant doit rendre le
    // décompte, et non le jeu : sinon on entre en piste avant les autres.
    // On coupe d'abord l'ancienne socket : deux sockets pour un même joueur,
    // et la seconde lui prend sa place — le serveur ne livre qu'à une.
    await wait(900);
    s.disconnect();
    await wait(200);
    const tot = io(BASE, { transports: ['websocket'] });
    await new Promise(r => tot.on('connect', r));
    let pendant = null;
    tot.on('ascension-state', (d) => { pendant = d; });
    tot.on('ascension-floor-start', (d) => etages.push(d));
    tot.emit('register-authenticated', { playerId: 'g1', username: 'Grimpeur' });
    tot.emit('ascension-reconnect', { playerId: 'g1' });
    await wait(500);
    const resteDecompte = pendant && pendant.countdownEndsAt
        ? pendant.countdownEndsAt - Date.now() : 0;
    check('recharger pendant le décompte rend le décompte',
        resteDecompte > 0, Math.round(resteDecompte) + ' ms avant le départ');

    for (let i = 0; i < 40 && !etages.length; i++) await wait(250);
    check('la montée a commencé', etages.length > 0);

    const avant = etages[0];
    const typeAvant = avant.floorData && avant.floorData.type;

    // On laisse filer du temps, pour que la reprise ait quelque chose à prouver
    await wait(4000);

    // ── Le rafraîchissement : socket neuve, comme le navigateur ──
    tot.disconnect();
    await wait(300);
    const neuve = io(BASE, { transports: ['websocket'] });
    await new Promise(r => neuve.on('connect', r));
    let repris = null;
    neuve.on('ascension-state', (d) => { repris = d; });
    neuve.emit('register-authenticated', { playerId: 'g1', username: 'Grimpeur' });
    neuve.emit('ascension-reconnect', { playerId: 'g1' });
    await wait(700);

    check('la socket neuve retrouve la montée', !!repris && repris.active === true,
        repris ? 'étage ' + (repris.currentFloor + 1) + '/' + repris.floors : 'aucune réponse');

    if (repris) {
        check('elle rend le même étage', repris.currentFloor === avant.floor,
            repris.currentFloor + ' contre ' + avant.floor);
        check('elle rend la même épreuve',
            repris.floorData && repris.floorData.type === typeAvant,
            (repris.floorData && repris.floorData.type) + ' contre ' + typeAvant);

        // Le minuteur doit avoir vieilli : remis à neuf, il offrirait du rab
        const restant = repris.floorTimerEndTime - Date.now();
        check('le minuteur reprend où il en était',
            restant > 0 && restant < 42000,
            Math.round(restant) + ' ms restants sur 45000');

        check('la tour retrouve tout le monde',
            (repris.playerProgress || []).length === 5,
            (repris.playerProgress || []).length + ' grimpeur(s)');

        // Le serveur reste autoritaire : la reprise ne doit pas livrer la réponse
        const secrets = ['targetIds', 'correctOrder', 'word', 'targets', 'pairs'];
        const fuite = secrets.filter(x => repris.floorData && x in repris.floorData);
        check('la reprise ne livre pas la réponse', fuite.length === 0,
            fuite.length ? 'fuite : ' + fuite.join(', ') : 'rien de compromettant');
    }

    neuve.close();
    await post('/admin/toggle-game', {});
    await wait(200);

    console.log(ko ? `\n${ko} échec(s)` : '\n✨ La montée se reprend là où on l a laissée');
    process.exit(ko ? 1 : 0);
})();
