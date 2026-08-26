// Vérifie que le départage repart bien après une égalité, en solo comme en camps.
// Deux joueurs qui répondent toujours juste finissent forcément à égalité parfaite.
const { io } = require('socket.io-client');
const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
const MDP = require("./mdp-hote");   // mesure temporaire : ouverture du mode Classique
// Les routes /admin sont réservées à l'hôte : on suit le jeton du salon.
let hostToken = '';
let roomCode = '';
const post = (p, b) => fetch(BASE + p, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Host-Token': hostToken },
    body: JSON.stringify(Object.assign({ motDePasse: MDP }, b || {})),
}).then(r => r.json()).then(j => { if (j && j.hostToken) hostToken = j.hostToken;
    if (j && j.roomCode) roomCode = j.roomCode; return j; });
const etat = () => fetch(BASE + '/game/state?code=' + roomCode).then(r => r.json());
const wait = (ms) => new Promise(r => setTimeout(r, ms));

let ko = 0;
const check = (l, ok, extra) => { console.log(`${ok ? '✅' : '❌'} ${l}${extra ? ' → ' + extra : ''}`); if (!ok) ko++; };

async function manche(enCamps) {
    const nom = enCamps ? 'camps' : 'solo';
    // Le jeton meurt avec le salon : le garder ferait refuser l'ouverture suivante
    if (hostToken) { await post('/admin/toggle-game', {}); hostToken = ''; roomCode = ''; }
    await post('/admin/toggle-game', { lobbyMode: 'classic' });
    await post('/admin/set-mode', { mode: 'points' });
    await post('/admin/set-questions', { questions: 15 });
    // Une seconde par question : quinze questions restent tenables dans un test
    await post('/admin/set-time', { time: 1 });
    // Le bonus de rapidité départagerait les deux joueurs : on veut l'égalité
    await post('/admin/set-speed-bonus', { enabled: false });
    await post('/admin/set-bonus-enabled', { enabled: false });

    const socks = [];
    for (const [id, pseudo] of [['t1', 'Un'], ['t2', 'Deux']]) {
        const s = io(BASE);
        await new Promise(r => s.on('connect', r));
        s.emit('register-authenticated', { playerId: id, username: pseudo });
        const suivi = { s, id, questions: [], departage: false, fin: null };
        s.on('new-question', (q) => suivi.questions.push(q));
        s.on('tiebreaker-announced', () => { suivi.departage = true; });
        s.on('game-ended', (d) => { suivi.fin = d; });
        socks.push(suivi);
        await wait(120);
        s.emit('join-lobby', { playerId: id, username: pseudo, code: roomCode });
    }
    await wait(400);
    if (enCamps) { await post('/admin/set-teams', { enabled: true }); await wait(250); }

    await post('/admin/start-game', {});

    // On enchaîne les quinze questions en répondant juste des deux côtés
    for (let n = 1; n <= 15; n++) {
        for (let i = 0; i < 100 && socks[0].questions.length < n; i++) await wait(60);
        const q = socks[0].questions[n - 1];
        if (!q) break;
        const bonne = (q.answers || []).indexOf(q.correctAnswer) + 1;
        socks.forEach(({ s, id }) => s.emit('submit-answer', { playerId: id, answer: bonne || 1 }));
        await wait(1600);
        if (socks[0].departage || socks[0].fin) break;
        if (n < 15) await post('/admin/next-question', {});
    }

    for (let i = 0; i < 60 && !socks[0].departage && !socks[0].fin; i++) await wait(100);

    check(`égalité annoncée (${nom})`, socks[0].departage === true,
        socks[0].departage ? '' : (socks[0].fin ? 'la partie s est terminée sans départage' : 'rien reçu'));

    const avant = socks[0].questions.length;
    const suite = await post('/admin/next-question', {});
    check(`départage lancé sans blocage (${nom})`, !suite.error, suite.error || 'ok');
    await wait(900);
    check(`question de départage reçue (${nom})`, socks[0].questions.length > avant,
        socks[0].questions.length + ' question(s)');
    const derniere = socks[0].questions[socks[0].questions.length - 1];
    check(`elle est marquée comme départage (${nom})`, !!(derniere && derniere.isTiebreaker));

    socks.forEach(({ s }) => s.close());
    // Remettre les reglages AVANT de fermer : le jeton meurt avec le salon
    await post('/admin/set-mode', { mode: 'lives' });
    await post('/admin/set-time', { time: 10 });
    await post('/admin/set-speed-bonus', { enabled: true });
    await post('/admin/set-bonus-enabled', { enabled: true });
    await post('/admin/toggle-game', {});
    await wait(400);
}

(async () => {
    await manche(false);
    await manche(true);
    console.log(ko ? `\n${ko} échec(s)` : '\n✨ Le départage repart dans les deux formats');
    process.exit(ko ? 1 : 0);
})();
