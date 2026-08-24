// Deux situations qu'aucune suite ne couvrait :
//   A. l'hôte perd sa connexion en pleine partie et revient — s'il ne reprend
//      pas la main, la partie est perdue pour tout le monde ;
//   B. on relance une manche en mode équipes — les camps doivent tenir.
const { io } = require('socket.io-client');
const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
const wait = (ms) => new Promise(r => setTimeout(r, ms));

const post = (p, jeton, b) => fetch(BASE + p, {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { 'X-Host-Token': jeton } : {}),
    body: JSON.stringify(b || {}),
}).then(r => r.json().then(j => ({ status: r.status, body: j })));

const etat = (code) => fetch(BASE + '/game/state?code=' + code).then(r => r.json());

let ko = 0;
const check = (l, ok, extra) => { console.log(`${ok ? '✅' : '❌'} ${l}${extra ? ' → ' + extra : ''}`); if (!ok) ko++; };

async function brancher(id, nom, code, hostToken) {
    const s = io(BASE);
    await new Promise(r => s.on('connect', r));
    const vu = { questions: [], erreurs: [] };
    s.on('new-question', (q) => vu.questions.push(q.questionNumber));
    s.on('error', (e) => vu.erreurs.push(e.message));
    s.emit('register-authenticated', { playerId: id, username: nom });
    await wait(120);
    s.emit('join-lobby', Object.assign({ playerId: id, username: nom, code }, hostToken ? { isHost: true, hostToken } : {}));
    return { s, id, nom, vu };
}

// Une manche complète, menée par l'hôte
async function manche(code, jeton, joueurs) {
    await post('/admin/start-game', jeton, {});
    for (let q = 0; q < 30; q++) {
        joueurs.forEach(({ s, id }, i) => s.emit('submit-answer', { playerId: id, answer: (i % 4) + 1 }));
        for (let i = 0; i < 40; i++) {
            const e = await etat(code);
            if (!e.inProgress) return;
            if (e.showResults) break;
            await wait(150);
        }
        const suite = await post('/admin/next-question', jeton, {});
        if (suite.body && suite.body.gameEnded) return;
        await wait(200);
    }
}

(async () => {
    // ══════════ A. L'hôte tombe en pleine partie ══════════
    console.log('\n── A. L\'hôte perd sa connexion en pleine partie ──');
    let r = (await post('/admin/toggle-game', null, { lobbyMode: 'classic' })).body;
    await post('/admin/set-mode', r.hostToken, { mode: 'points' });
    await post('/admin/set-questions', r.hostToken, { questions: 15 });
    await post('/admin/set-time', r.hostToken, { time: 1 });

    let hote = await brancher('rh', 'Hote', r.roomCode, r.hostToken);
    const joueur = await brancher('rj', 'Joueur', r.roomCode);
    await wait(600);
    await post('/admin/start-game', r.hostToken, {});
    await wait(2500);

    check('la partie tourne', (await etat(r.roomCode)).inProgress === true);
    const avant = joueur.vu.questions.length;

    // L'onglet de l'hôte se ferme
    hote.s.close();
    await wait(1500);

    const pendant = await etat(r.roomCode);
    check('la partie continue sans lui', pendant.inProgress === true && pendant.playerCount === 2,
        pendant.playerCount + ' joueur(s)');

    // Son jeton vit dans son navigateur : il revient avec
    hote = await brancher('rh', 'Hote', r.roomCode, r.hostToken);
    await wait(800);

    const reprise = await post('/admin/next-question', r.hostToken, {});
    check("l'hôte reprend la main avec son jeton", !reprise.body.error,
        reprise.body.error || 'question suivante lancée');
    await wait(1200);
    check('les joueurs reçoivent la suite', joueur.vu.questions.length > avant,
        joueur.vu.questions.length + ' question(s)');
    check('personne n\'a reçu d\'erreur', joueur.vu.erreurs.length === 0,
        joueur.vu.erreurs[0] || 'aucune');

    hote.s.close(); joueur.s.close();
    await post('/admin/toggle-game', r.hostToken, {});
    await wait(400);

    // ══════════ B. Relancer une manche en équipes ══════════
    console.log('\n── B. Relancer une manche en équipes ──');
    r = (await post('/admin/toggle-game', null, { lobbyMode: 'classic' })).body;
    await post('/admin/set-mode', r.hostToken, { mode: 'points' });
    await post('/admin/set-questions', r.hostToken, { questions: 15 });
    await post('/admin/set-time', r.hostToken, { time: 1 });

    const eq = [];
    eq.push(await brancher('e1', 'Un', r.roomCode, r.hostToken));
    for (const [id, nom] of [['e2', 'Deux'], ['e3', 'Trois'], ['e4', 'Quatre']]) {
        eq.push(await brancher(id, nom, r.roomCode));
    }
    await wait(700);

    await post('/admin/set-teams', r.hostToken, { enabled: true });
    await wait(400);

    const avantCamps = await etat(r.roomCode);
    const repartition = (avantCamps.players || []).map(p => p.username + '=' + p.team).sort().join(' ');
    check('les quatre sont répartis', (avantCamps.players || []).every(p => p.team === 1 || p.team === 2),
        repartition);

    await manche(r.roomCode, r.hostToken, eq);
    const fin = await etat(r.roomCode);
    check('la manche en équipes est allée à son terme', fin.inProgress === false);

    const relance = await post('/admin/replay', r.hostToken, {});
    check('la relance passe en équipes', relance.status === 200, relance.body.error || 'ok');

    const apres = await etat(r.roomCode);
    check('le salon est resté en équipes', apres.lobbyMode === 'rivalry', apres.lobbyMode);
    check('les quatre joueurs sont toujours là', apres.playerCount === 4,
        apres.playerCount + ' joueur(s)');
    const apresCamps = (apres.players || []).map(p => p.username + '=' + p.team).sort().join(' ');
    check('chacun a gardé son camp', apresCamps === repartition, apresCamps);

    const redemarrage = await post('/admin/start-game', r.hostToken, {});
    check('une nouvelle manche peut partir', redemarrage.body.success === true,
        redemarrage.body.error || 'ok');

    eq.forEach(j => j.s.close());
    await post('/admin/toggle-game', r.hostToken, {});
    await wait(300);

    console.log(ko ? `\n${ko} échec(s)` : '\n✨ Reprise de l\'hôte et relance en équipes tiennent');
    process.exit(ko ? 1 : 0);
})();
