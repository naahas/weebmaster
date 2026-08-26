// L'historique des questions appartient au salon, à personne d'autre.
// Deux hôtes qui enchaînent des manches en même temps ne doivent ni se voler
// leurs questions, ni se les interdire.
const { io } = require('socket.io-client');
const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
const MDP = require("./mdp-hote");   // mesure temporaire : ouverture du mode Classique
const wait = (ms) => new Promise(r => setTimeout(r, ms));

const post = (p, jeton, b) => fetch(BASE + p, {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { 'X-Host-Token': jeton } : {}),
    body: JSON.stringify(Object.assign({ motDePasse: MDP }, b || {})),
}).then(r => r.json().then(j => ({ status: r.status, body: j })));

const etat = (code) => fetch(BASE + '/game/state?code=' + code).then(r => r.json());

let ko = 0;
const check = (l, ok, extra) => { console.log(`${ok ? '✅' : '❌'} ${l}${extra ? ' → ' + extra : ''}`); if (!ok) ko++; };

async function ouvrirSalon(nom) {
    const r = (await post('/admin/toggle-game', null, { lobbyMode: 'classic' })).body;
    await post('/admin/set-mode', r.hostToken, { mode: 'points' });
    await post('/admin/set-questions', r.hostToken, { questions: 15 });
    await post('/admin/set-time', r.hostToken, { time: 1 });
    // Vivier volontairement étroit : 48 questions, pour que deux manches
    // indépendantes se recoupent nécessairement.
    await post('/admin/set-serie-filter', r.hostToken, { filter: 'bleach' });

    const joueurs = [];
    for (let k = 0; k < 2; k++) {
        const s = io(BASE);
        await new Promise(res => s.on('connect', res));
        const vu = [];
        s.on('new-question', (q) => vu.push(q.questionId));
        const id = nom + k;
        s.emit('register-authenticated', { playerId: id, username: id });
        await wait(100);
        s.emit('join-lobby', { playerId: id, username: id, code: r.roomCode });
        joueurs.push({ s, id, vu });
    }
    await wait(500);
    return { nom, code: r.roomCode, jeton: r.hostToken, joueurs };
}

// Une manche complète : chacun tente une option différente, sinon deux zéros
// déclenchent un départage qui ne se tranche jamais.
async function manche(salon) {
    await post('/admin/start-game', salon.jeton, {});
    for (let q = 0; q < 30; q++) {
        salon.joueurs.forEach(({ s, id }, i) => s.emit('submit-answer', { playerId: id, answer: i + 1 }));
        for (let i = 0; i < 40; i++) {
            const e = await etat(salon.code);
            if (!e.inProgress) return;
            if (e.showResults) break;
            await wait(150);
        }
        const suite = await post('/admin/next-question', salon.jeton, {});
        if (suite.body && suite.body.gameEnded) return;
        await wait(200);
    }
}

(async () => {
    const a = await ouvrirSalon('A');
    const b = await ouvrirSalon('B');
    check('deux salons ouverts', a.code !== b.code, a.code + ' et ' + b.code);

    // ── Une manche de chaque côté, en parallèle ──
    await Promise.all([manche(a), manche(b)]);
    const a1 = a.joueurs[0].vu.slice();
    const b1 = b.joueurs[0].vu.slice();
    check('chaque salon a joué sa manche', a1.length >= 10 && b1.length >= 10,
        'A=' + a1.length + ' B=' + b1.length);

    // Les salons sont indépendants : ils peuvent très bien tomber sur les mêmes
    // questions. Ce qu'on vérifie, c'est qu'ils ne se les interdisent pas.
    // Le vrai piège serait un historique partagé : B se verrait interdire ce que
    // A a servi, et le vivier de chacun fondrait. Dans un vivier de 48, deux
    // manches indépendantes de 15 se recoupent forcément.
    const communes = a1.filter(id => b1.includes(id)).length;
    check('les deux salons puisent dans le même vivier sans se gêner', communes > 0,
        communes + ' question(s) en commun');

    // ── Chacun relance ──
    await Promise.all([
        post('/admin/replay', a.jeton, {}),
        post('/admin/replay', b.jeton, {}),
    ]);
    a.joueurs.forEach(j => { j.vu.length = 0; });
    b.joueurs.forEach(j => { j.vu.length = 0; });

    await Promise.all([manche(a), manche(b)]);
    const a2 = a.joueurs[0].vu.slice();
    const b2 = b.joueurs[0].vu.slice();

    // ⚠️ On ne vérifie pas ici l'absence de répétition dans un salon : le vivier
    // est trop étroit, et le serveur remet une difficulté épuisée à zéro plutôt
    // que de ne rien servir. C'est test:rejouer qui s'en charge, sur tout le corpus.
    const bReprendDeA = b2.filter(id => a1.includes(id) || a2.includes(id)).length;
    check('B sert des questions déjà vues chez A', bReprendDeA > 0,
        bReprendDeA + ' question(s) — les historiques ne sont pas partagés');

    // ── Fermer A ne doit pas déranger B ──
    await post('/admin/toggle-game', a.jeton, {});
    await wait(400);

    const apresA = await etat(b.code);
    check('B survit à la fermeture de A', apresA.isActive === true && apresA.playerCount === 2,
        apresA.playerCount + ' joueur(s)');

    b.joueurs.forEach(j => { j.vu.length = 0; });
    const relance = await post('/admin/replay', b.jeton, {});
    check('B peut encore relancer', relance.status === 200, relance.body.error || 'ok');
    await manche(b);
    check('et rejouer une manche entière', b.joueurs[0].vu.length >= 10,
        b.joueurs[0].vu.length + ' question(s)');

    await post('/admin/toggle-game', b.jeton, {});
    [...a.joueurs, ...b.joueurs].forEach(j => j.s.close());
    await wait(300);

    console.log(ko ? `\n${ko} échec(s)` : '\n✨ Chaque salon a sa propre mémoire de questions');
    process.exit(ko ? 1 : 0);
})();
