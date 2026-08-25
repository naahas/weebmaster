// ⚡ Rush : réglages du salon, séquence commune, validation sans touche Entrée,
// série qui casse, et classement en fin de manche.
const { io } = require('socket.io-client');
const data = require('../rushdata.json');
const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
const wait = (ms) => new Promise(r => setTimeout(r, ms));

let jeton = '', code = '';
const post = (p, b) => fetch(BASE + p, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Host-Token': jeton },
    body: JSON.stringify(b || {}),
}).then(r => r.json().then(j => {
    if (j.hostToken) jeton = j.hostToken;
    if (j.roomCode) code = j.roomCode;
    return { status: r.status, body: j };
}));
const etat = () => fetch(BASE + '/game/state?code=' + code).then(r => r.json());

let ko = 0;
const check = (l, ok, extra) => { console.log(`${ok ? '✅' : '❌'} ${l}${extra ? ' → ' + extra : ''}`); if (!ok) ko++; };

// Retrouve le personnage affiché à partir de son image : c'est tout ce que le
// serveur envoie, il ne divulgue jamais le nom.
const persoParImage = (img) => data.personnages.find(p => p.img === img);

(async () => {
    await post('/admin/toggle-game', { lobbyMode: 'rush' });

    // ── Les réglages ──
    let e = await etat();
    check('durée par défaut à 60 s', e.rush && e.rush.duree === 60, e.rush && e.rush.duree + 's');
    check('séquence partagée par défaut', e.rush && e.rush.sequencePartagee === true);
    check('les filtres sont annoncés', e.rush && e.rush.filtres.length >= 2,
        e.rush ? e.rush.filtres.map(f => f.id + '(' + f.compte + ')').join(' ') : '');

    const d = await post('/admin/rush/set-duree', { duree: 30 });
    check('la durée se change', d.status === 200 && d.body.duree === 30, d.body.error || '30s');
    const mauvaise = await post('/admin/rush/set-duree', { duree: 45 });
    check('une durée hors barème est refusée', mauvaise.status === 400, 'HTTP ' + mauvaise.status);

    const sansLimite = await post('/admin/rush/set-limite', { limite: 0 });
    check('la limite par portrait peut être retirée', sansLimite.status === 200 && sansLimite.body.limite === 0);
    await post('/admin/rush/set-limite', { limite: 10 });

    const f = await post('/admin/rush/set-filtre', { filtre: 'big3' });
    check('le filtre se change', f.status === 200 && f.body.filtre === 'big3', f.body.error || 'big3');
    const inconnu = await post('/admin/rush/set-filtre', { filtre: 'nawak' });
    check('un filtre inconnu est refusé', inconnu.status === 400, 'HTTP ' + inconnu.status);
    await post('/admin/rush/set-filtre', { filtre: 'overall' });

    // ── Deux joueurs ──
    const joueurs = [];
    for (const [id, nom] of [['r1', 'Un'], ['r2', 'Deux']]) {
        const s = io(BASE, { transports: ['websocket'] });
        await new Promise(r => s.on('connect', r));
        const vu = { portraits: [], classements: [], fins: [] };
        s.on('rush-portrait', (x) => vu.portraits.push(x));
        s.on('rush-classement', (x) => vu.classements.push(x));
        s.on('rush-game-ended', (x) => vu.fins.push(x));
        s.emit('register-authenticated', { playerId: id, username: nom });
        await wait(120);
        s.emit('join-lobby', { playerId: id, username: nom, code });
        joueurs.push({ s, id, nom, vu });
    }
    await wait(700);

    const depart = await post('/admin/start-game', {});
    check('la manche démarre', depart.body.success === true, depart.body.error || 'ok');
    await wait(500);

    const [a, b] = joueurs;
    check('chacun reçoit un portrait', a.vu.portraits.length === 1 && b.vu.portraits.length === 1);
    check('le serveur ne divulgue pas le nom',
        a.vu.portraits[0].portrait && !('nom' in a.vu.portraits[0].portrait),
        Object.keys(a.vu.portraits[0].portrait || {}).join(', '));
    check('la séquence est la même pour les deux',
        a.vu.portraits[0].portrait.img === b.vu.portraits[0].portrait.img,
        a.vu.portraits[0].portrait.img + ' / ' + b.vu.portraits[0].portrait.img);

    // ── La saisie, sans touche Entrée ──
    const p1 = persoParImage(a.vu.portraits[0].portrait.img);
    a.s.emit('rush-saisie', { texte: p1.nom.slice(0, 2) });   // début du nom : rien ne doit bouger
    await wait(250);
    check('un nom incomplet ne valide rien', a.vu.portraits.length === 1,
        a.vu.portraits.length + ' portrait(s)');

    a.s.emit('rush-saisie', { texte: p1.nom.toUpperCase() + ' ' });  // casse et espace ignorés
    await wait(300);
    check('le nom complet valide, quelle que soit la casse', a.vu.portraits.length === 2,
        a.vu.portraits.length + ' portrait(s)');
    check('la série monte à 1', a.vu.portraits[1].serie === 1 && a.vu.portraits[1].record === 1);

    // Deux de plus, pour une série de 3
    for (let i = 0; i < 2; i++) {
        const perso = persoParImage(a.vu.portraits[a.vu.portraits.length - 1].portrait.img);
        a.s.emit('rush-saisie', { texte: perso.nom });
        await wait(300);
    }
    const dernier = a.vu.portraits[a.vu.portraits.length - 1];
    check('la série suit les bonnes réponses', dernier.serie === 3 && dernier.record === 3,
        'série ' + dernier.serie + ', record ' + dernier.record);

    // ── Passer casse la série mais garde le record ──
    a.s.emit('rush-passer');
    await wait(300);
    const apresPasse = a.vu.portraits[a.vu.portraits.length - 1];
    check('passer remet la série à zéro', apresPasse.serie === 0, 'série ' + apresPasse.serie);
    check('le record du tour est conservé', apresPasse.record === 3, 'record ' + apresPasse.record);

    // ── La reprise apres un rafraichissement ──
    // Le joueur recharge sa page : il doit retrouver son portrait, sa serie et
    // son record la ou il les avait laisses.
    let reprise = null;
    a.s.on('rush-reprise', (d) => { reprise = d; });
    a.s.emit('rush-get-state');
    await wait(400);
    check('une manche en cours se reprend', reprise && reprise.enCours === true);
    check('elle rend le portrait courant',
        reprise && reprise.portrait &&
        reprise.portrait.img === a.vu.portraits[a.vu.portraits.length - 1].portrait.img,
        reprise && reprise.portrait ? reprise.portrait.img : 'aucun');
    check('elle rend la serie et le record',
        reprise && reprise.serie === apresPasse.serie && reprise.record === apresPasse.record,
        reprise ? 'serie ' + reprise.serie + ', record ' + reprise.record : '');
    check('elle rend l heure de fin', reprise && reprise.finA > Date.now(),
        reprise ? Math.round((reprise.finA - Date.now()) / 1000) + 's restantes' : '');

    // ── Un vrai rafraichissement : socket neuve, comme le navigateur ──
    // Le test ci-dessus reutilisait la socket ouverte, qui etait deja rattachee
    // au salon : il ne pouvait donc pas voir qu apres un F5 la reprise n etait
    // jamais demandee. On rejoue ici la sequence exacte du client au chargement.
    a.s.disconnect();
    await wait(300);
    const neuve = io(BASE, { transports: ['websocket'] });
    await new Promise(r => neuve.on('connect', r));
    let repriseF5 = null;
    neuve.on('rush-reprise', (d) => { repriseF5 = d; });
    neuve.emit('register-authenticated', { playerId: a.id, username: a.nom });
    neuve.emit('rush-get-state');
    await wait(600);
    check('apres un F5, la socket neuve retrouve la manche',
        repriseF5 && repriseF5.enCours === true,
        repriseF5 ? 'enCours ' + repriseF5.enCours : 'aucune reponse');
    check('apres un F5, le portrait et le record sont les memes',
        repriseF5 && repriseF5.portrait && repriseF5.record === apresPasse.record,
        repriseF5 && repriseF5.portrait ? repriseF5.portrait.img + ', record ' + repriseF5.record : '');
    a.s = neuve;
    a.s.on('rush-portrait', (x) => a.vu.portraits.push(x));
    a.s.on('rush-classement', (x) => a.vu.classements.push(x));
    a.s.on('rush-game-ended', (x) => a.vu.fins.push(x));

    // ── Aucun portrait ne revient deux fois ──
    const vus = a.vu.portraits.filter(p => p.portrait).map(p => p.portrait.img);
    check('aucun portrait ne se répète dans la manche', new Set(vus).size === vus.length,
        vus.length + ' portrait(s), ' + new Set(vus).size + ' distinct(s)');

    // ── Le classement suit ──
    const dernierClassement = a.vu.classements[a.vu.classements.length - 1];
    check('le classement place le meilleur en tête',
        dernierClassement && dernierClassement.classement[0].playerId === 'r1',
        dernierClassement ? dernierClassement.classement.map(c => c.username + ':' + c.record).join(' ') : '');

    // ── La fin de manche ──
    console.log('   (on attend la fin des 30 s…)');
    for (let i = 0; i < 80 && a.vu.fins.length === 0; i++) await wait(500);
    check('la manche se termine seule', a.vu.fins.length === 1);
    const fin = a.vu.fins[0];
    check('elle désigne le vainqueur', fin && fin.winner && fin.winner.username === 'Un',
        fin && fin.winner ? fin.winner.username + ' avec ' + fin.winner.record : 'aucun');

    const apres = await etat();
    check('le salon est prêt à relancer', apres.inProgress === false, 'inProgress=' + apres.inProgress);

    await post('/admin/toggle-game', {});
    joueurs.forEach(j => j.s.close());
    await wait(300);

    console.log(ko ? `\n${ko} échec(s)` : '\n✨ Rush enchaîne les portraits et compte les séries');
    process.exit(ko ? 1 : 0);
})();
