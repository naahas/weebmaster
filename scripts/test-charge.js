// Mesure de charge : N salons de quiz en parallèle, M joueurs chacun.
// Ne vérifie pas des règles de jeu — il répond à « est-ce que ça tient ? ».
//
//   node scripts/test-charge.js            (15 salons × 12 joueurs, 3 questions)
//   SALONS=25 JOUEURS=15 node scripts/test-charge.js
const { io } = require('socket.io-client');
const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
const MDP = require("./mdp-hote");   // mesure temporaire : ouverture du mode Classique
const SALONS = parseInt(process.env.SALONS, 10) || 15;
const JOUEURS = parseInt(process.env.JOUEURS, 10) || 12;
const QUESTIONS = parseInt(process.env.QUESTIONS, 10) || 3;

const wait = (ms) => new Promise(r => setTimeout(r, ms));
const post = (p, jeton, b) => fetch(BASE + p, {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { 'X-Host-Token': jeton } : {}),
    body: JSON.stringify(Object.assign({ motDePasse: MDP }, b || {})),
}).then(r => r.json().catch(() => ({})));

const pct = (t, p) => t.length ? t.slice().sort((a, b) => a - b)[Math.min(t.length - 1, Math.floor(t.length * p))] : 0;

(async () => {
    console.log(`\n🎯 ${SALONS} salons × ${JOUEURS} joueurs = ${SALONS * JOUEURS} sockets, ${QUESTIONS} questions chacun\n`);

    const memAvant = await fetch(BASE + '/api/home-stats').then(r => r.json()).then(() => process.memoryUsage().heapUsed);
    const salons = [];
    const t0 = Date.now();

    // ── Ouverture ──
    for (let i = 0; i < SALONS; i++) {
        const r = await post('/admin/toggle-game', null, { lobbyMode: 'classic' });
        if (!r.roomCode) { console.log(`❌ salon ${i} non ouvert`); process.exit(1); }
        salons.push({ code: r.roomCode, jeton: r.hostToken, joueurs: [], recues: 0, latences: [] });
    }
    console.log(`✅ ${SALONS} salons ouverts en ${Date.now() - t0} ms`);

    // ── Arrivée des joueurs ──
    const tJoin = Date.now();
    await Promise.all(salons.map((s, i) => Promise.all(
        Array.from({ length: JOUEURS }, async (_, k) => {
            const id = `c${i}_${k}`;
            const sock = io(BASE, { transports: ['websocket'] });
            await new Promise(r => sock.on('connect', r));
            sock.on('new-question', () => {
                s.recues++;
                if (s.envoyeA) s.latences.push(Date.now() - s.envoyeA);
            });
            sock.emit('register-authenticated', { playerId: id, username: 'J' + id });
            await wait(30);
            sock.emit('join-lobby', { playerId: id, username: 'J' + id, code: s.code });
            s.joueurs.push({ sock, id });
        })
    )));
    await wait(1500);
    console.log(`✅ ${SALONS * JOUEURS} joueurs entrés en ${Date.now() - tJoin} ms`);

    const etat = await fetch(BASE + '/api/home-stats').then(r => r.json());
    console.log(`   ${etat.activeRooms} salons actifs, ${etat.playersOnline} sockets connectées`);

    // ── Démarrage simultané : le pire cas ──
    const tStart = Date.now();
    salons.forEach(s => { s.envoyeA = Date.now(); });
    await Promise.all(salons.map(s => post('/admin/start-game', s.jeton, {})));
    await wait(4000);
    const recuesDepart = salons.filter(s => s.recues >= JOUEURS).length;
    console.log(`\n▶️  Démarrage simultané des ${SALONS} salons : ${Date.now() - tStart} ms`);
    console.log(`   ${recuesDepart}/${SALONS} salons ont servi la question à tous leurs joueurs`);

    // ── Les joueurs répondent, on enchaîne ──
    for (let q = 2; q <= QUESTIONS; q++) {
        salons.forEach(s => s.joueurs.forEach(({ sock, id }) =>
            sock.emit('submit-answer', { playerId: id, answer: 1 + (q % 4) })));
        await wait(11000);   // la question court 10 s

        const tq = Date.now();
        salons.forEach(s => { s.envoyeA = Date.now(); });
        const rep = await Promise.all(salons.map(s => post('/admin/next-question', s.jeton, {})));
        const refus = rep.filter(r => r.error).length;
        await wait(3000);
        console.log(`▶️  Question ${q} : ${Date.now() - tq} ms pour ${SALONS} salons${refus ? ` (${refus} refus)` : ''}`);
    }

    // ── Bilan ──
    const toutes = salons.flatMap(s => s.latences);
    const attendues = SALONS * JOUEURS * QUESTIONS;
    const recues = salons.reduce((n, s) => n + s.recues, 0);
    console.log(`\n── Bilan ──`);
    console.log(`Questions distribuées : ${recues} / ${attendues} attendues (${Math.round(recues / attendues * 100)} %)`);
    console.log(`Latence ordre → réception : médiane ${pct(toutes, 0.5)} ms · p90 ${pct(toutes, 0.9)} ms · max ${Math.max(...toutes, 0)} ms`);

    const stats = await fetch(BASE + '/api/home-stats').then(r => r.json());
    console.log(`Salons encore actifs : ${stats.activeRooms}, sockets : ${stats.playersOnline}`);

    // ── Ménage ──
    await Promise.all(salons.map(s => post('/admin/toggle-game', s.jeton, {})));
    salons.forEach(s => s.joueurs.forEach(({ sock }) => sock.close()));
    await wait(600);
    console.log(`\n✨ Terminé (${Math.round((Date.now() - t0) / 1000)} s au total)`);
    process.exit(recues < attendues * 0.95 ? 1 : 0);
})();
