// 🔌 Un joueur dont la socket saute revient-il dans le salon de l'hôte ?
//
// Le cas vécu : après une soirée à enchaîner Collect, Ascension, Rush,
// BombAnime et une Classique, un joueur voyait toujours son écran de salon
// alors que l'hôte ne le voyait plus dans la liste. Il devait rafraîchir, ou
// rafraîchir PUIS quitter PUIS ressaisir le code.
//
// La cause : la re-jointure automatique était gardée par « shouldRejoinLobby »,
// un drapeau posé une seule fois au chargement de la page et consommé à la
// première reconnexion. Toutes les suivantes ne réémettaient plus rien. Or
// socket.io se reconnecte tout seul sans arrêt, et passé le sursis le serveur
// retire le joueur — plus personne ne l'y remettait.
//
// ⚠️ À lancer avec GRACE_LOBBY_MS=1500 DES DEUX CÔTÉS, sinon il faut attendre
// les soixante secondes de sursis par défaut :
//     GRACE_LOBBY_MS=1500 npm start
//     GRACE_LOBBY_MS=1500 npm run test:rejointure
const { io } = require('socket.io-client');

const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
const SURSIS = parseInt(process.env.GRACE_LOBBY_MS, 10) || 60000;
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

// Un joueur qui rejoint comme le vrai client : register-authenticated PUIS join-lobby.
async function joueur(nom) {
    const s = io(BASE, { transports: ['websocket'], forceNew: true, reconnection: false });
    await new Promise(r => s.on('connect', r));
    s.emit('register-authenticated', { playerId: nom, username: nom });
    await wait(120);
    s.emit('join-lobby', { playerId: nom, username: nom, code });
    await wait(250);
    return s;
}

const noms = async () => ((await etat()).players || []).map(p => p.username).sort();

(async () => {
    if (SURSIS > 5000) {
        console.log('⚠️  GRACE_LOBBY_MS vaut ' + SURSIS + ' ms.');
        console.log('   Relance les deux côtés avec GRACE_LOBBY_MS=1500, sinon ce test dure une minute.\n');
    }

    await post('/admin/toggle-game', { lobbyMode: 'rush' });
    check('salon ouvert', !!code, code);

    const hote = await joueur('Hote');
    const pote = await joueur('Pote');
    check('les deux sont dans le salon', (await noms()).join(',') === 'Hote,Pote', (await noms()).join(', '));

    // ── La socket du pote saute, et le sursis expire ──
    // C'est tout le scénario : un écran verrouillé, un changement de réseau,
    // un onglet en arrière-plan. Rien de rare sur une soirée entière.
    pote.close();
    await wait(SURSIS + 1200);
    check('passé le sursis, l\'hôte ne le voit plus', !(await noms()).includes('Pote'),
        (await noms()).join(', ') || 'salon vide');

    // ── Sa socket revient, comme le fait socket.io tout seul ──
    // Le client réémet « register-authenticated » sur chaque « connect ».
    // AVANT le correctif il s'arrêtait là, « shouldRejoinLobby » étant déjà
    // consommé : le joueur restait invisible pour l'hôte.
    const retour = io(BASE, { transports: ['websocket'], forceNew: true, reconnection: false });
    await new Promise(r => retour.on('connect', r));
    retour.emit('register-authenticated', { playerId: 'Pote', username: 'Pote' });
    await wait(200);
    check('le seul « register-authenticated » ne suffit pas à le remettre',
        !(await noms()).includes('Pote'), (await noms()).join(', '));

    // C'est ce que le correctif ajoute : à CHAQUE reconnexion, si l'on se croit
    // dans un salon, on réémet « join-lobby ».
    retour.emit('join-lobby', { playerId: 'Pote', username: 'Pote', code });
    await wait(350);
    check('après la re-jointure, l\'hôte le revoit', (await noms()).includes('Pote'),
        (await noms()).join(', '));
    check('et il n\'y est qu\'une fois', (await noms()).filter(n => n === 'Pote').length === 1);

    // ── Et une seconde fois : c'est là que le drapeau à usage unique lâchait ──
    retour.close();
    await wait(SURSIS + 1200);
    const encore = io(BASE, { transports: ['websocket'], forceNew: true, reconnection: false });
    await new Promise(r => encore.on('connect', r));
    encore.emit('register-authenticated', { playerId: 'Pote', username: 'Pote' });
    await wait(150);
    encore.emit('join-lobby', { playerId: 'Pote', username: 'Pote', code });
    await wait(350);
    check('une DEUXIÈME coupure se rattrape aussi', (await noms()).includes('Pote'),
        (await noms()).join(', '));

    // ── Une manche peut repartir avec lui ──
    const dem = await post('/admin/start-game', {});
    check('la manche démarre avec les deux joueurs',
        dem.status === 200 || (dem.body && dem.body.success), dem.body.error || 'ok');

    for (const s of [hote, encore]) s.close();
    await post('/admin/toggle-game', {});
    console.log(ko ? `\n💥 ${ko} contrôle(s) en échec` : '\n✨ Un joueur coupé revient dans le salon de l\'hôte');
    process.exit(ko ? 1 : 0);
})().catch(e => { console.error('💥', e); process.exit(1); });
