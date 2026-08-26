// Enchaîner des manches dans le même salon, sans re-partager le code.
// Vérifie aussi qu'une question déjà servie ne revient pas d'une manche à
// l'autre : l'historique court sur le salon, plus sur la seule partie.
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

async function jouerUneManche(socks) {
    await post('/admin/start-game', {});
    for (let q = 0; q < 30; q++) {
        // Chacun tente une option différente : sans réponse, tout le monde
        // finit à zéro et le départage ne se tranche jamais.
        socks.forEach(({ s, id }, i) => s.emit('submit-answer', { playerId: id, answer: i + 1 }));

        for (let i = 0; i < 40; i++) {
            const e = await etat();
            if (!e.inProgress) return;          // la manche est finie
            if (e.showResults) break;
            await wait(150);
        }
        const suite = await post('/admin/next-question', {});
        if (suite.body && suite.body.gameEnded) return;
        await wait(200);
    }
}

let ko = 0;
const check = (l, ok, extra) => { console.log(`${ok ? '✅' : '❌'} ${l}${extra ? ' → ' + extra : ''}`); if (!ok) ko++; };

(async () => {
    await post('/admin/toggle-game', { lobbyMode: 'classic' });
    await post('/admin/set-mode', { mode: 'points' });
    await post('/admin/set-questions', { questions: 15 });
    await post('/admin/set-time', { time: 1 });

    const socks = [];
    for (const [id, nom] of [['r1', 'Un'], ['r2', 'Deux']]) {
        const s = io(BASE);
        await new Promise(r => s.on('connect', r));
        const vu = { questions: [], salon: 0 };
        s.on('new-question', (q) => vu.questions.push(q.questionId));
        s.on('retour-au-salon', () => { vu.salon++; });
        s.emit('register-authenticated', { playerId: id, username: nom });
        await wait(120);
        s.emit('join-lobby', { playerId: id, username: nom, code });
        socks.push({ s, id, vu });
    }
    await wait(600);

    // ── Manche 1, jusqu'à son terme ──
    await jouerUneManche(socks);
    const manche1 = socks[0].vu.questions.slice();
    check('la première manche est allée à son terme', manche1.length >= 10, manche1.length + ' question(s)');

    // ── L'hôte relance ──
    const relance = await post('/admin/replay', {});
    check('la relance est acceptée', relance.status === 200, relance.body.error || 'ok');
    check('les joueurs sont restés dans le salon', relance.body.playerCount === 2,
        relance.body.playerCount + ' joueur(s)');
    check('tout le monde est renvoyé au salon', socks.every(s => s.vu.salon === 1));

    const e = await etat();
    check('le salon est au repos, pas fermé', e.isActive === true && e.inProgress === false);
    check('le code n\'a pas changé', e.roomCode === code, e.roomCode);

    // ── Manche 2 : aucune question de la manche 1 ne doit revenir ──
    socks.forEach(s => { s.vu.questions.length = 0; });
    await jouerUneManche(socks);
    const manche2 = socks[0].vu.questions.slice();
    check('la seconde manche a servi des questions', manche2.length >= 10, manche2.length + ' question(s)');

    const revenues = manche2.filter(id => manche1.includes(id));
    check('aucune question de la manche 1 ne revient', revenues.length === 0,
        revenues.length ? revenues.length + ' question(s) répétée(s)' : 'aucune');

    // ── Fermer le salon efface bien l'historique ──
    await post('/admin/toggle-game', {});
    const apres = await fetch(BASE + '/game/state?code=' + code).then(r => r.json());
    check('le salon est bien fermé', apres.isActive === false);

    socks.forEach(s => s.s.close());
    await wait(300);
    console.log(ko ? `\n${ko} échec(s)` : '\n✨ Les manches s\'enchaînent sans répéter de question');
    process.exit(ko ? 1 : 0);
})();
