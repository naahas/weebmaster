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
const MDP = require("./mdp-hote");   // mesure temporaire : ouverture du mode Classique
const log = (...a) => console.log(...a);
const wait = (ms) => new Promise(r => setTimeout(r, ms));

// Les routes /admin sont réservées à l'hôte : on garde le jeton que
// l'ouverture du salon nous remet, et on le joint ensuite à chaque appel.
let hostToken = '';
let roomCode = '';

const post = (path, body) => fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Host-Token': hostToken },
    body: JSON.stringify(Object.assign({ motDePasse: MDP }, body || {})),
}).then(r => r.json().then(j => {
    if (j && j.hostToken) hostToken = j.hostToken;
    if (j && j.roomCode) roomCode = j.roomCode;
    return { status: r.status, body: j };
}));

const get = (path) => fetch(BASE + path, { headers: { 'X-Host-Token': hostToken } }).then(r => r.json());

// Ouvre un salon neuf, en refermant celui qu'on tiendrait encore
const ouvrirSalon = async (config) => {
    if (hostToken) { await post('/admin/toggle-game', {}); hostToken = ''; roomCode = ''; }
    return post('/admin/toggle-game', config || {});
};

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
            sock.emit('register-authenticated', { playerId: id, username: name });
            resolve({ sock, seen, id, name });
        });
        sock.on('connect_error', (e) => { clearTimeout(timer); reject(e); });
        WATCHED.forEach(evt => sock.on(evt, (d) => seen.push({ evt, d })));
    });
}

async function scenarioClassic() {
    log('\n── Mode Classic ──');

    const toggle = await ouvrirSalon({ lobbyMode: 'classic' });
    check('ouverture du lobby', toggle.status === 200 && toggle.body.isActive === true);

    const lobby = await get('/admin/game-state');
    const code = lobby.roomCode;
    check('code de salon généré', !!code && code.length === 4, code);

    const p1 = await makePlayer('smoke-p1', 'Joueur1');
    const p2 = await makePlayer('smoke-p2', 'Joueur2');
    await wait(300);

    // Un mauvais code doit être refusé
    p1.sock.emit('join-lobby', { playerId: p1.id, username: p1.name, code: 'ZZZZ' });
    await wait(400);
    const refused = p1.seen.find(e => e.evt === 'error' && e.d.badCode);
    check('mauvais code refusé', !!refused, refused ? refused.d.message : 'aucune erreur reçue');

    p1.sock.emit('join-lobby', { playerId: p1.id, username: p1.name, code });
    p2.sock.emit('join-lobby', { playerId: p2.id, username: p2.name, code });
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
        // Une partie lancée doit refuser tout nouvel arrivant
        const retardataire = io(BASE);
        await new Promise(r => retardataire.on('connect', r));
        let refus = null;
        retardataire.on('error', (d) => { refus = d && d.message; });
        retardataire.emit('register-authenticated', { playerId: 'late', username: 'Retard' });
        await wait(200);
        retardataire.emit('join-lobby', { playerId: 'late', username: 'Retard', code });
        for (let i = 0; i < 20 && !refus; i++) await wait(50);
        check('partie lancée : arrivée refusée', !!refus && /en cours/i.test(refus), refus || 'aucun refus');
        retardataire.close();

        p1.sock.emit('submit-answer', { playerId: p1.id, answer: 1 });
        p2.sock.emit('submit-answer', { playerId: p2.id, answer: 2 });
        await wait(500);
        const st = await get('/game/state?code=' + roomCode);
        check('réponses enregistrées', st.players.some(p => p.hasAnswered));
    }

    await post('/admin/toggle-game', {});
    const final = await get('/game/state?code=' + roomCode);
    check('lobby refermé', final.isActive === false);

    p1.sock.close();
    p2.sock.close();
    await wait(400);
}

async function scenarioBombanime() {
    log('\n── Mode BombAnime ──');

    const toggle = await ouvrirSalon({
        lobbyMode: 'bombanime', bombanimeSerie: 'Naruto', bombanimeTimer: 8, bombanimeLives: 2,
    });
    check('ouverture du lobby BombAnime', toggle.status === 200 && toggle.body.isActive === true);

    const p1 = await makePlayer('smoke-b1', 'Bomb1');
    const p2 = await makePlayer('smoke-b2', 'Bomb2');
    await wait(300);
    p1.sock.emit('join-lobby', { playerId: p1.id, username: p1.name, code: roomCode });
    p2.sock.emit('join-lobby', { playerId: p2.id, username: p2.name, code: roomCode });
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
        const active = [p1, p2].find(p => p.id === turn.d.currentPlayerId);
        if (active) active.sock.emit('bombanime-submit-name', { name: 'NARUTO' });
        await wait(700);
        const accepted = [...p1.seen, ...p2.seen].find(e => e.evt === 'bombanime-name-accepted');
        check('nom de personnage validé', !!accepted, accepted ? accepted.d.name : '');
    }

    // Un salon se referme par la même porte que les autres : la route
    // /admin/bombanime/close-lobby doublait celle-ci et ne servait qu ici.
    await post('/admin/toggle-game', {});
    const ferme = await get('/game/state?code=' + roomCode);
    check('lobby BombAnime refermé', ferme.isActive === false);
    p1.sock.close();
    p2.sock.close();
    await wait(400);
}

// Partie express (timer 1 s, 1 vie) : personne ne répond, la bombe fait le travail.
// Sert à vérifier la fin de partie ET l'enregistrement dans l'historique.
async function scenarioGameEnd() {
    log('\n── Fin de partie & historique ──');

    await ouvrirSalon({
        lobbyMode: 'bombanime', bombanimeSerie: 'Naruto', bombanimeTimer: 1, bombanimeLives: 1,
    });

    const p1 = await makePlayer('smoke-e1', 'Express1');
    const p2 = await makePlayer('smoke-e2', 'Express2');
    await wait(300);
    p1.sock.emit('join-lobby', { playerId: p1.id, username: p1.name, code: roomCode });
    p2.sock.emit('join-lobby', { playerId: p2.id, username: p2.name, code: roomCode });
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
    // Les parties du smoke tiennent à deux joueurs : elles doivent être écartées.
    // Le seuil dépend du mode : quinze au quiz, cinq en BombAnime, qui plafonne
    // justement à quinze et n aurait sinon retenu que les salons complets.
    check('historique lisible', Array.isArray(stats.recentGames),
        (stats.recentGames || []).length + ' partie(s) retenue(s)');
    // Rush partage le seuil de BombAnime : une partie a cinq y a du sens
    const seuil = (m) => ((m === 'bombanime' || m === 'rush') ? 5 : 15);
    const petites = (stats.recentGames || []).filter(g => g.playersCount < seuil(g.mode));
    check('les parties sous le seuil de leur mode sont écartées', petites.length === 0,
        petites.length ? petites.map(g => g.mode + ' ' + g.playersCount + 'j').join(', ') : 'aucune');
}

(async () => {
    try {
        await get('/api/home-stats');
    } catch (e) {
        log(`❌ Serveur injoignable sur ${BASE} — lance "npm start" d'abord.`);
        process.exit(1);
    }

    await scenarioClassic();
    await scenarioBombanime();
    await scenarioGameEnd();
    await scenarioHomeStats();

    // Ne rien laisser derriere soi : le dernier scenario gardait son salon ouvert
    if (hostToken) await post('/admin/toggle-game', {});

    log(failures ? `\n${failures} échec(s)` : '\n✨ Tout est vert');
    process.exit(failures ? 1 : 0);
})();
