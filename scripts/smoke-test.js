/**
 * 🧪 Smoke test v2 — vérifie le cycle de jeu complet sans navigateur.
 *
 * Couvre : ouverture du lobby, arrivée des joueurs, démarrage, réception d'une
 * question, enregistrement des réponses, fermeture — en Classic et en BombAnime.
 *
 * Usage :
 *   node server.js              (dans un terminal, ou npm start)
 *   node scripts/smoke-test.js  (dans un autre)
 *
 * Port personnalisé : TEST_PORT=7143 node scripts/smoke-test.js
 */

const { io } = require('socket.io-client');

const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
const log = (...a) => console.log(...a);
const wait = (ms) => new Promise(r => setTimeout(r, ms));

const post = (path, body) => fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
}).then(r => r.json().then(j => ({ status: r.status, body: j })));

const get = (path) => fetch(BASE + path).then(r => r.json());

let failures = 0;
function check(label, ok, extra) {
    log(`${ok ? '✅' : '❌'} ${label}${extra ? ' → ' + extra : ''}`);
    if (!ok) failures++;
}

const WATCHED = [
    'new-question', 'game-started', 'question-results', 'game-ended', 'error', 'lobby-update',
    'bombanime-game-started', 'bombanime-turn-start', 'bombanime-name-accepted', 'bombanime-game-ended',
];

function makePlayer(id, name) {
    return new Promise((resolve, reject) => {
        const sock = io(BASE, { timeout: 5000 });
        const seen = [];
        const timer = setTimeout(() => reject(new Error('connexion socket impossible')), 8000);
        sock.on('connect', () => {
            clearTimeout(timer);
            sock.emit('register-authenticated', { twitchId: id, username: name });
            resolve({ sock, seen, id, name });
        });
        sock.on('connect_error', (e) => { clearTimeout(timer); reject(e); });
        WATCHED.forEach(evt => sock.on(evt, (d) => seen.push({ evt, d })));
    });
}

async function scenarioClassic() {
    log('\n── Mode Classic ──');

    const toggle = await post('/admin/toggle-game', { lobbyMode: 'classic' });
    check('ouverture du lobby', toggle.status === 200 && toggle.body.isActive === true);

    const lobby = await get('/admin/game-state');
    const code = lobby.roomCode;
    check('code de salon généré', !!code && code.length === 4, code);

    const p1 = await makePlayer('smoke-p1', 'Joueur1');
    const p2 = await makePlayer('smoke-p2', 'Joueur2');
    await wait(300);

    // Un mauvais code doit être refusé
    p1.sock.emit('join-lobby', { twitchId: p1.id, username: p1.name, code: 'ZZZZ' });
    await wait(400);
    const refused = p1.seen.find(e => e.evt === 'error' && e.d.badCode);
    check('mauvais code refusé', !!refused, refused ? refused.d.message : 'aucune erreur reçue');

    p1.sock.emit('join-lobby', { twitchId: p1.id, username: p1.name, code });
    p2.sock.emit('join-lobby', { twitchId: p2.id, username: p2.name, code });
    await wait(600);

    const state = await get('/admin/game-state');
    check('2 joueurs dans le lobby', state.playerCount === 2, 'playerCount=' + state.playerCount);

    const start = await post('/admin/start-game', {});
    check('démarrage de la partie', start.status === 200 && start.body.success, JSON.stringify(start.body).slice(0, 90));

    // la 1re question dépend d une requête Supabase : marge large
    await wait(5000);
    const q = p1.seen.find(e => e.evt === 'new-question');
    check('question reçue', !!q, q ? `${q.d.answers?.length} réponses` : 'aucune');

    if (q) {
        p1.sock.emit('submit-answer', { twitchId: p1.id, answerIndex: 0 });
        p2.sock.emit('submit-answer', { twitchId: p2.id, answerIndex: 1 });
        await wait(500);
        const st = await get('/game/state');
        check('réponses enregistrées', st.players.some(p => p.hasAnswered));
    }

    await post('/admin/toggle-game', {});
    const final = await get('/admin/game-state');
    check('lobby refermé', final.isActive === false);

    p1.sock.close();
    p2.sock.close();
    await wait(400);
}

async function scenarioBombanime() {
    log('\n── Mode BombAnime ──');

    const toggle = await post('/admin/toggle-game', {
        lobbyMode: 'bombanime', bombanimeSerie: 'Naruto', bombanimeTimer: 8, bombanimeLives: 2,
    });
    check('ouverture du lobby BombAnime', toggle.status === 200 && toggle.body.isActive === true);

    const p1 = await makePlayer('smoke-b1', 'Bomb1');
    const p2 = await makePlayer('smoke-b2', 'Bomb2');
    await wait(300);
    p1.sock.emit('join-lobby', { twitchId: p1.id, username: p1.name });
    p2.sock.emit('join-lobby', { twitchId: p2.id, username: p2.name });
    await wait(600);

    const start = await post('/admin/start-game', {});
    check('démarrage BombAnime', start.status === 200 && start.body.success, JSON.stringify(start.body).slice(0, 90));

    // le premier tour est lancé 3 s après le démarrage (animation d'intro côté client)
    await wait(4200);
    const started = p1.seen.find(e => e.evt === 'bombanime-game-started');
    check('partie BombAnime démarrée côté joueur', !!started);

    const turn = [...p1.seen, ...p2.seen].find(e => e.evt === 'bombanime-turn-start');
    check('premier tour distribué', !!turn, turn ? 'joueur ' + turn.d.currentPlayerUsername : '');

    if (turn) {
        const active = [p1, p2].find(p => p.id === turn.d.currentPlayerTwitchId);
        if (active) active.sock.emit('bombanime-submit-name', { name: 'NARUTO' });
        await wait(700);
        const accepted = [...p1.seen, ...p2.seen].find(e => e.evt === 'bombanime-name-accepted');
        check('nom de personnage validé', !!accepted, accepted ? accepted.d.name : '');
    }

    await post('/admin/bombanime/close-lobby', {});
    p1.sock.close();
    p2.sock.close();
    await wait(400);
}

// Partie express (timer 1 s, 1 vie) : personne ne répond, la bombe fait le travail.
// Sert à vérifier la fin de partie ET l'enregistrement dans l'historique.
async function scenarioGameEnd() {
    log('\n── Fin de partie & historique ──');

    await post('/admin/toggle-game', {
        lobbyMode: 'bombanime', bombanimeSerie: 'Naruto', bombanimeTimer: 1, bombanimeLives: 1,
    });

    const p1 = await makePlayer('smoke-e1', 'Express1');
    const p2 = await makePlayer('smoke-e2', 'Express2');
    await wait(300);
    p1.sock.emit('join-lobby', { twitchId: p1.id, username: p1.name });
    p2.sock.emit('join-lobby', { twitchId: p2.id, username: p2.name });
    await wait(600);

    await post('/admin/start-game', {});
    await wait(9000); // intro (3 s) + explosions successives

    const ended = [...p1.seen, ...p2.seen].find(e => e.evt === 'bombanime-game-ended');
    check('partie terminée sur explosion', !!ended, ended?.d?.winner?.username || '');

    p1.sock.close();
    p2.sock.close();
    await wait(600);
}

async function scenarioHomeStats() {
    log('\n── Stats de l\'accueil ──');

    const stats = await get('/api/home-stats');
    check('questions comptées', stats.questionsCount > 0, stats.questionsCount + ' questions');
    check('salons actifs cohérents', typeof stats.activeRooms === 'number', 'activeRooms=' + stats.activeRooms);
    check('historique alimenté par les parties jouées', Array.isArray(stats.recentGames) && stats.recentGames.length > 0,
        (stats.recentGames || []).map(g => g.modeLabel).join(', ') || 'vide');
}

(async () => {
    try {
        await get('/admin/game-state');
    } catch (e) {
        log(`❌ Serveur injoignable sur ${BASE} — lance "npm start" d'abord.`);
        process.exit(1);
    }

    await scenarioClassic();
    await scenarioBombanime();
    await scenarioGameEnd();
    await scenarioHomeStats();

    log(failures ? `\n${failures} échec(s)` : '\n✨ Tout est vert');
    process.exit(failures ? 1 : 0);
})();
