// Salons de modes différents en même temps : 2 quiz + 3 BombAnime.
// BombAnime a ses propres minuteries et son propre tour de table ; c'est le
// mode le plus susceptible de se mélanger d'un salon à l'autre.
const { io } = require('socket.io-client');
const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
const wait = (ms) => new Promise(r => setTimeout(r, ms));

const post = (p, jeton, b) => fetch(BASE + p, {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { 'X-Host-Token': jeton } : {}),
    body: JSON.stringify(b || {}),
}).then(r => r.json().catch(() => ({})));

let ko = 0;
const check = (l, ok, extra) => { console.log(`${ok ? '✅' : '❌'} ${l}${extra ? ' → ' + extra : ''}`); if (!ok) ko++; };

async function joueur(id, nom, code) {
    const s = io(BASE, { transports: ['websocket'] });
    await new Promise(r => s.on('connect', r));
    const vu = { questions: [], tours: [], explosions: [], departs: [], erreurs: [] };
    s.on('new-question', (q) => vu.questions.push(q));
    s.on('bombanime-turn-start', (d) => vu.tours.push(d));
    s.on('bombanime-explosion', (d) => vu.explosions.push(d));
    s.on('bombanime-game-started', (d) => vu.departs.push(d));
    s.on('game-started', (d) => vu.departs.push(d));
    s.on('error', (e) => vu.erreurs.push(e.message));
    s.emit('register-authenticated', { twitchId: id, username: nom });
    await wait(60);
    s.emit('join-lobby', { twitchId: id, username: nom, code });
    return { s, id, nom, vu };
}

(async () => {
    const PLAN = [
        { mode: 'classic',   n: 8,  nom: 'Quiz A' },
        { mode: 'classic',   n: 10, nom: 'Quiz B' },
        { mode: 'bombanime', n: 5,  nom: 'Bomb A' },
        { mode: 'bombanime', n: 7,  nom: 'Bomb B' },
        { mode: 'bombanime', n: 9,  nom: 'Bomb C' },
    ];
    console.log(`\n🎯 ${PLAN.length} salons : ${PLAN.map(p => p.nom + ' (' + p.n + ')').join(', ')}\n`);

    // ── Ouverture ──
    const salons = [];
    for (const p of PLAN) {
        const r = await post('/admin/toggle-game', null, {
            lobbyMode: p.mode, bombanimeSerie: 'Naruto', bombanimeTimer: 8, bombanimeLives: 2,
        });
        if (!r.roomCode) { console.log(`❌ ${p.nom} non ouvert`); process.exit(1); }
        salons.push({ ...p, code: r.roomCode, jeton: r.hostToken, joueurs: [] });
    }
    check('les cinq salons sont ouverts', salons.length === 5,
        salons.map(s => s.nom + '=' + s.code).join(' '));

    // ── Les joueurs entrent ──
    for (const s of salons) {
        for (let k = 0; k < s.n; k++) {
            s.joueurs.push(await joueur(`${s.code}_${k}`, `${s.nom.replace(' ', '')}${k}`, s.code));
        }
    }
    await wait(1200);

    const etats = await Promise.all(salons.map(s =>
        fetch(BASE + '/game/state?code=' + s.code).then(r => r.json())));
    const bons = etats.filter((e, i) => e.playerCount === salons[i].n).length;
    check('chaque salon a exactement ses joueurs', bons === 5,
        etats.map((e, i) => salons[i].nom + '=' + e.playerCount + '/' + salons[i].n).join(' '));
    check('les modes ne se mélangent pas', etats.every((e, i) => e.lobbyMode === salons[i].mode),
        etats.map(e => e.lobbyMode).join(' '));

    // ── Tout démarre en même temps ──
    await Promise.all(salons.map(s => post('/admin/start-game', s.jeton, {})));
    await wait(6000);

    for (const s of salons) {
        const recu = s.joueurs.filter(j => j.vu.departs.length > 0).length;
        check(`${s.nom} : la partie démarre pour tous`, recu === s.n, recu + '/' + s.n);
    }

    // ── Le quiz sert ses questions, la bombe tourne ──
    for (const s of salons.filter(x => x.mode === 'classic')) {
        const q = s.joueurs.filter(j => j.vu.questions.length > 0).length;
        check(`${s.nom} : question reçue par tous`, q === s.n, q + '/' + s.n);
    }
    for (const s of salons.filter(x => x.mode === 'bombanime')) {
        const t = s.joueurs.filter(j => j.vu.tours.length > 0).length;
        check(`${s.nom} : la bombe tourne`, t === s.n, t + '/' + s.n);
        // Le joueur désigné doit appartenir à ce salon, pas à un autre
        const designe = s.joueurs[0].vu.tours[0];
        const aNous = designe && s.joueurs.some(j => j.id === designe.currentPlayerTwitchId);
        check(`${s.nom} : la bombe désigne un des siens`, !!aNous,
            designe ? designe.currentPlayerUsername : 'personne');
    }

    // ── Les bombes explosent chacune chez soi ──
    await wait(11000);
    for (const s of salons.filter(x => x.mode === 'bombanime')) {
        const boum = s.joueurs[0].vu.explosions.length;
        check(`${s.nom} : la bombe a explosé`, boum > 0, boum + ' explosion(s)');
    }
    const croise = salons.filter(x => x.mode === 'classic')
        .some(s => s.joueurs.some(j => j.vu.explosions.length > 0 || j.vu.tours.length > 0));
    check("aucun événement BombAnime n'atterrit dans un quiz", !croise);

    const erreurs = salons.flatMap(s => s.joueurs.flatMap(j => j.vu.erreurs));
    check('aucune erreur côté joueurs', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));

    const stats = await fetch(BASE + '/api/home-stats').then(r => r.json());
    console.log(`\n   ${stats.activeRooms} salons actifs, ${stats.playersOnline} sockets`);

    // ── Ménage ──
    await Promise.all(salons.map(s => post('/admin/toggle-game', s.jeton, {})));
    salons.forEach(s => s.joueurs.forEach(j => j.s.close()));
    await wait(500);

    console.log(ko ? `\n${ko} échec(s)` : '\n✨ Quiz et BombAnime cohabitent sans se mélanger');
    process.exit(ko ? 1 : 0);
})();
