// Quitter une partie de BombAnime : le joueur reste dans le cercle, éteint,
// et la bombe l'ignore. Le retirer redistribuerait les places en plein tour.
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

let ko = 0;
const check = (l, ok, extra) => { console.log(`${ok ? '✅' : '❌'} ${l}${extra ? ' → ' + extra : ''}`); if (!ko && !ok) {} if (!ok) ko++; };

(async () => {
    await post('/admin/toggle-game', { lobbyMode: 'bombanime', bombanimeTimer: 10, bombanimeLives: 2 });

    const joueurs = [];
    for (const [id, nom] of [['d1', 'Un'], ['d2', 'Deux'], ['d3', 'Trois']]) {
        const s = io(BASE, { transports: ['websocket'] });
        await new Promise(r => s.on('connect', r));
        const vu = { tours: [], vies: [], fins: [] };
        s.on('bombanime-turn-start', (d) => vu.tours.push(d));
        s.on('bombanime-player-lives-updated', (d) => vu.vies.push(d));
        s.on('bombanime-game-ended', (d) => vu.fins.push(d));
        s.emit('register-authenticated', { playerId: id, username: nom });
        await wait(120);
        s.emit('join-lobby', { playerId: id, username: nom, code });
        joueurs.push({ s, id, nom, vu });
    }
    await wait(700);

    const depart = await post('/admin/start-game', {});
    check('la partie démarre à trois', depart.body.success === true, depart.body.error || 'ok');

    // L intro retarde le premier tour : on l attend plutot qu un delai fixe
    const temoin = joueurs[0];
    for (let i = 0; i < 40 && temoin.vu.tours.length === 0; i++) await wait(300);
    const avant = temoin.vu.tours[temoin.vu.tours.length - 1];
    check('un joueur a la bombe', !!avant, avant ? avant.currentPlayerUsername : 'personne');

    // Celui qui a la bombe s'en va : c'est le cas le plus délicat
    const actif = joueurs.find(j => j.id === avant.currentPlayerId) || joueurs[1];
    const toursAvantDepart = temoin.vu.tours.length;   // pour ne juger que la suite
    actif.s.emit('leave-lobby', { playerId: actif.id, username: actif.nom });
    await wait(900);

    const maj = temoin.vu.vies[temoin.vu.vies.length - 1];
    check('son départ est annoncé aux autres', !!maj, maj ? maj.playerUsername : 'rien reçu');

    const cercle = (maj && maj.playersData) || [];
    check('il reste dans le cercle', cercle.length === 3, cercle.length + ' place(s)');

    const parti = cercle.find(p => p.playerId === actif.id);
    check('il y figure éteint', !!parti && parti.isAlive === false && parti.lives === 0,
        parti ? 'vies=' + parti.lives + ' vivant=' + parti.isAlive : 'absent du cercle');

    check('les autres gardent leur place et leurs vies',
        cercle.filter(p => p.playerId !== actif.id).every(p => p.isAlive && p.lives === 2));

    // La bombe doit être repartie chez quelqu'un d'autre, sans attendre l'explosion
    const apres = temoin.vu.tours[temoin.vu.tours.length - 1];
    check('la bombe est passée au suivant', apres && apres.currentPlayerId !== actif.id,
        apres ? apres.currentPlayerUsername : 'aucun tour');
    // On ne regarde que les tours postérieurs au départ : celui d avant etait
    // le sien, forcement.
    const depuis = temoin.vu.tours.slice(toursAvantDepart);
    check('elle ne revient jamais sur le partant',
        depuis.length > 0 && depuis.every(t => t.currentPlayerId !== actif.id),
        depuis.length + ' tour(s) depuis son depart');
    check('la partie continue', temoin.vu.fins.length === 0);

    // Le second partant ne laisse qu'un joueur : la partie doit se terminer
    const reste = joueurs.filter(j => j !== actif && j !== temoin)[0];
    reste.s.emit('leave-lobby', { playerId: reste.id, username: reste.nom });
    await wait(900);
    check('un seul rescapé termine la partie', temoin.vu.fins.length === 1,
        temoin.vu.fins.length ? 'gagnant : ' + (temoin.vu.fins[0].winner || {}).username : 'aucune fin');

    await post('/admin/toggle-game', {});
    joueurs.forEach(j => j.s.close());
    await wait(300);

    console.log(ko ? `\n${ko} échec(s)` : '\n✨ Un départ laisse sa place dans le cercle');
    process.exit(ko ? 1 : 0);
})();
