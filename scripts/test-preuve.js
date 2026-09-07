// 🔗 La preuve d'une question : elle ne doit atteindre le joueur QU'APRÈS la
// révélation.
//
// L'URL nomme très souvent la réponse — « …/wiki/Gaara » passe sous « De quel
// village est originaire Gaara ? », mais pas sous « Qui est le père de
// Boruto ? ». Elle partait avec « new-question », donc lisible dans l'onglet
// réseau avant d'avoir répondu, et elle traînait aussi dans « /game/state »,
// une porte qui s'ouvre avec le seul code du salon.
//
// Trois choses ici : la question n'en porte rien, l'état du salon non plus, et
// les résultats la portent enfin.
const { io } = require('socket.io-client');

const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
const MDP = require('./mdp-hote');
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

// Cherche une trace de preuve n'importe où dans un objet, quel que soit le nom
// du champ : renommer « proof_url » en « proofUrl » ne doit pas suffire à
// passer sous le radar de ce fichier.
const sentLaPreuve = (o) => {
    const s = JSON.stringify(o || {});
    return /proof|preuve|fandom|wikipedia|https?:\/\//i.test(s);
};

(async () => {
    await post('/admin/toggle-game', { lobbyMode: 'classic' });
    await post('/admin/set-mode', { mode: 'points' }).catch(() => {});

    // Deux joueurs : le mode Classique refuse de demarrer en dessous.
    const socks = [];
    const questions = [], resultats = [];
    for (const [id, nom] of [['p1', 'Preuve'], ['p2', 'Temoin']]) {
        const s = io(BASE, { transports: ['websocket'] });
        await new Promise(r => s.on('connect', r));
        if (id === 'p1') {
            s.on('new-question', (q) => questions.push(q));
            s.on('question-results', (r) => resultats.push(r));
        }
        s.emit('register-authenticated', { playerId: id, username: nom });
        await wait(150);
        s.emit('join-lobby', { playerId: id, username: nom, code });
        socks.push(s);
    }
    const s = socks[0];
    await wait(700);

    const depart = await post('/admin/start-game', {});
    check('la partie démarre', depart.body.success === true, depart.body.error || 'ok');

    // On attend la première question
    for (let i = 0; i < 40 && !questions.length; i++) await wait(250);
    check('une question arrive', questions.length > 0, questions.length + ' question(s)');
    if (!questions.length) { console.log('\n❌ rien à vérifier'); process.exit(1); }

    const q = questions[0];
    check('la question ne porte aucune preuve', !sentLaPreuve(q),
        Object.keys(q).join(', '));

    // ⚠️ Cette porte s'ouvre avec le seul code du salon, pendant la question.
    const e = await etat();
    check('l état du salon n en porte pas davantage',
        !sentLaPreuve(e.currentQuestion),
        e.currentQuestion ? Object.keys(e.currentQuestion).join(', ') : 'aucune question');
    check('et il ne donne toujours pas la bonne réponse',
        !e.currentQuestion || e.currentQuestion.correctAnswer === undefined,
        e.currentQuestion ? 'correctAnswer ' + e.currentQuestion.correctAnswer : '—');

    // On répond, puis on attend la révélation
    s.emit('submit-answer', { playerId: 'p1', answer: 1 });
    for (let i = 0; i < 80 && !resultats.length; i++) await wait(250);
    check('les résultats arrivent', resultats.length > 0, resultats.length + ' résultat(s)');

    if (resultats.length) {
        const r = resultats[0];
        check('les résultats portent le champ de preuve', 'proofUrl' in r,
            'proofUrl = ' + JSON.stringify(r.proofUrl));
        // La banque de questions n'a pas forcément de preuve sur celle-ci : on
        // vérifie le CHEMIN, pas le contenu. Le champ doit exister et valoir une
        // URL ou null — jamais rester absent, sinon le client n'a rien à lire.
        check('et sa valeur est une URL ou rien',
            r.proofUrl === null || (typeof r.proofUrl === 'string' && /^https?:\/\//.test(r.proofUrl)),
            String(r.proofUrl));
        check('et la bonne réponse est enfin donnée', typeof r.correctAnswer === 'number',
            'correctAnswer ' + r.correctAnswer);
    }

    socks.forEach(x => x.close());
    await post('/admin/toggle-game', {});
    console.log(ko ? `\n❌ ${ko} problème(s)` : '\n✨ La preuve attend la révélation');
    process.exit(ko ? 1 : 0);
})().catch(e => { console.error('💥', e); process.exit(1); });
