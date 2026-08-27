// 🏔️ Ascension, de bout en bout : ouvrir un salon, le régler, lancer la
// montée et recevoir son premier étage.
//
// La suite « test:ascension » exerce le moteur à vide ; celle-ci vérifie qu'il
// est correctement branché au serveur v2 — état par salon, réglages de l'hôte,
// livraison de l'étage au seul joueur concerné.
const { io } = require('socket.io-client');
const MDP = require('./mdp-hote');   // mesure temporaire : ouverture du mode Classique
const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
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
const check = (l, ok, extra) => {
    console.log(`${ok ? '✅' : '❌'} ${l}${extra ? ' → ' + extra : ''}`);
    if (!ok) ko++;
};

(async () => {
    await post('/admin/toggle-game', { lobbyMode: 'ascension' });
    check('un salon Ascension s ouvre', !!code, code || 'aucun code');

    // ── Les réglages de l'hôte ──
    let e = await etat();
    check('le salon annonce son Ascension', !!e.ascension,
        e.ascension ? e.ascension.floors + ' étages, ' + e.ascension.timer + ' s' : 'rien');
    check('quinze étages par défaut', e.ascension && e.ascension.floors === 15);
    check('trente secondes par défaut', e.ascension && e.ascension.timer === 30);

    const et = await post('/admin/ascension/set-etages', { etages: 10 });
    check('le nombre d étages se change', et.status === 200 && et.body.floors === 10,
        et.body.error || '10 étages');
    const horsBareme = await post('/admin/ascension/set-etages', { etages: 99 });
    check('un nombre hors barème est refusé', horsBareme.status === 400, 'HTTP ' + horsBareme.status);

    const ti = await post('/admin/ascension/set-timer', { timer: 45 });
    check('la durée d étage se change', ti.status === 200 && ti.body.timer === 45,
        ti.body.error || '45 s');
    const mauvaise = await post('/admin/ascension/set-timer', { timer: 7 });
    check('une durée hors barème est refusée', mauvaise.status === 400, 'HTTP ' + mauvaise.status);

    // ── Un joueur, et la montée ──
    const s = io(BASE, { transports: ['websocket'] });
    await new Promise(r => s.on('connect', r));
    const vu = { depart: [], etages: [], progres: [] };
    s.on('ascension-game-started', (d) => vu.depart.push(d));
    s.on('ascension-floor-start', (d) => vu.etages.push(d));
    s.on('ascension-progress', (d) => vu.progres.push(d));
    s.emit('register-authenticated', { playerId: 'a1', username: 'Grimpeur' });
    await wait(150);
    s.emit('join-lobby', { playerId: 'a1', username: 'Grimpeur', code });
    await wait(600);

    const d = await post('/admin/start-game', {});
    check('la montée démarre à un seul joueur', d.status === 200 && d.body.success === true,
        d.body.error || d.body.floors + ' étages');

    // Le moteur fait précéder la partie d'un décompte : on lui laisse le temps
    for (let i = 0; i < 40 && !vu.etages.length; i++) await wait(250);

    check('le départ est annoncé', vu.depart.length > 0);
    check('le premier étage arrive', vu.etages.length > 0,
        vu.etages.length + ' étage(s) reçu(s)');

    if (vu.etages.length) {
        const f = vu.etages[0].floorData || vu.etages[0];
        check('il porte un type connu', typeof f.type === 'string' && f.type.length > 0, f.type);
        // Le serveur est autoritaire, mais cela ne vaut que si la réponse ne
        // voyage pas : on refait ici le contrôle fait à vide, sur le vrai message.
        const secrets = ['targetIds', 'correctOrder', 'word', 'targets', 'pairs'];
        const fuite = secrets.filter(x => x in f);
        check('il ne transporte pas sa réponse', fuite.length === 0,
            fuite.length ? 'fuite : ' + fuite.join(', ') : 'rien de compromettant');
    }

    const enCours = await etat();
    check('le salon se dit en partie', enCours.inProgress === true);

    s.close();
    await post('/admin/toggle-game', {});
    await wait(200);

    console.log(ko ? `\n${ko} échec(s)` : '\n✨ La tour se règle, démarre et livre ses étages');
    process.exit(ko ? 1 : 0);
})();
