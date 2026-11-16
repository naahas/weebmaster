// 🪑 Peut-on prendre la place de quelqu'un d'autre dans un salon ?
//
// ── LE TROU QU'ON FERME ──────────────────────────────────────────
// Reprendre sa place après une coupure ne demandait qu'un « playerId ». Or
// « playerId » N'EST PAS UN SECRET : « broadcastLobbyUpdate » l'envoie à TOUS
// les joueurs du salon, pour chacun d'eux. N'importe qui dans la partie le
// lisait dans la console de son navigateur, se reconnectait en l'annonçant, et
// le serveur lui transférait le siège de la victime — score, vies, réponses —
// en sortant celle-ci de la table. Le code du salon, lui, s'affiche à l'écran
// pendant un direct : il n'ajoutait aucune difficulté.
//
// Deux chemins y menaient, et ce fichier les éprouve tous les deux :
//   1. le remappage automatique de « register-authenticated » ;
//   2. « reconnect-player », qui cherchait l'entrée par le seul « playerId ».
//
// ── CE QUI COMPTE AUTANT QUE LE REFUS ────────────────────────────
// ⚠️ Un correctif de sécurité qui casse les reconnexions légitimes est pire
// que le trou : les coupures sont le cas COURANT — un écran verrouillé, un
// changement de réseau, un onglet en arrière-plan — et l'attaque, elle, est
// rare. Chaque refus vérifié ici est donc suivi de la réussite qui lui
// correspond. Un test qui ne prouverait que le refus passerait au vert avec
// un serveur qui refuse tout le monde.
//
//     npm start            (dans un autre terminal)
//     npm run test:siege
const { io } = require('socket.io-client');

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
const check = (l, ok, extra) => {
    console.log(`${ok ? '✅' : '❌'} ${l}${extra ? ' → ' + extra : ''}`);
    if (!ok) ko++;
};

// Une socket qui entre dans le salon comme le vrai client : d'abord
// « register-authenticated », puis « join-lobby ». On retient au passage tout
// ce que le serveur lui envoie — c'est ce qu'un joueur peut VOIR, et donc tout
// ce dont un tricheur dispose.
async function joueur(nom) {
    const s = io(BASE, { transports: ['websocket'], forceNew: true, reconnection: false });
    s.sieges = {};
    s.vus = [];
    s.erreurs = [];
    s.on('siege', (d) => { if (d && d.roomCode && d.jeton) s.sieges[d.roomCode] = d.jeton; });
    s.on('lobby-update', (d) => s.vus.push(d));
    s.on('error', (d) => s.erreurs.push(d && d.message));
    await new Promise(r => s.on('connect', r));
    s.emit('register-authenticated', { playerId: nom, username: nom, sieges: s.sieges });
    await wait(120);
    s.emit('join-lobby', { playerId: nom, username: nom, code });
    await wait(300);
    return s;
}

// Une socket neuve et nue, celle du tricheur : elle n'a jamais rien reçu.
async function socketNue() {
    const s = io(BASE, { transports: ['websocket'], forceNew: true, reconnection: false });
    s.vus = [];
    s.erreurs = [];
    s.on('lobby-update', (d) => s.vus.push(d));
    s.on('error', (d) => s.erreurs.push(d && d.message));
    await new Promise(r => s.on('connect', r));
    return s;
}

const noms = async () => ((await etat()).players || []).map(p => p.username).sort();

(async () => {
    await post('/admin/toggle-game', { lobbyMode: 'rush' });
    check('salon ouvert', !!code, code);

    const hote = await joueur('Hote');
    const victime = await joueur('Victime');
    check('les deux sont dans le salon', (await noms()).join(',') === 'Hote,Victime',
        (await noms()).join(', '));

    // ── Ce que la victime a reçu, et que personne d'autre ne doit avoir ──
    check('la victime a reçu un jeton de siège', !!victime.sieges[code],
        victime.sieges[code] ? 'oui' : 'AUCUN');

    // ⚠️ LE CONTROLE LE PLUS IMPORTANT DU FICHIER. Si le jeton partait dans
    // « lobby-update », tout le reste serait du théâtre : chaque joueur
    // lirait le secret des autres et le trou serait intact, correctif compris.
    const diffuse = JSON.stringify(hote.vus);
    check('le jeton ne voyage JAMAIS dans une diffusion',
        !diffuse.includes('jetonSiege') && !diffuse.includes(victime.sieges[code]));

    // La prémisse de l'attaque : le playerId de la victime est à la vue de tous.
    const listeChezLHote = (hote.vus[hote.vus.length - 1] || {}).players || [];
    const idVole = (listeChezLHote.find(p => p.username === 'Victime') || {}).playerId;
    check('… alors que le playerId, lui, est visible par tout le salon', idVole === 'Victime',
        idVole || 'absent');

    // ── La coupure : l'écran se verrouille, la socket saute ──
    // L'entrée reste dans la table pendant le sursis : c'est elle qu'on convoite.
    victime.close();
    await wait(400);

    // ══════════ 1. LE REMAPPAGE DE « register-authenticated » ══════════
    const voleur = await socketNue();
    voleur.emit('register-authenticated', {
        playerId: idVole, username: 'Victime', roomCode: code,
        // Pas de `sieges` : c'est exactement ce dont dispose un tricheur.
    });
    await wait(300);

    // ⚠️ LE SIGNE OBSERVABLE EST L'ABONNEMENT AU SALON, et non la liste des
    // joueurs : refusé ou accepté, « Victime » y figure toujours — ce qui
    // change, c'est la socket derrière l'entrée. Or un remappage réussi fait
    // un `socket.join(roomCode)`, donc le voleur entendrait les diffusions.
    // On en provoque une en faisant entrer quelqu'un.
    voleur.vus.length = 0;
    const temoin = await joueur('Temoin');
    await wait(300);
    check('le voleur n\'a pas été rebranché sur le salon', voleur.vus.length === 0,
        voleur.vus.length + ' diffusion(s) reçue(s)');

    // Et avec un jeton inventé, pas davantage.
    const menteur = await socketNue();
    menteur.emit('register-authenticated', {
        playerId: idVole, username: 'Victime', roomCode: code,
        sieges: { [code]: 'ce-jeton-n-existe-pas' },
    });
    await wait(300);
    menteur.vus.length = 0;
    const temoin2 = await joueur('Temoin2');
    await wait(300);
    check('un jeton inventé ne vaut pas mieux', menteur.vus.length === 0,
        menteur.vus.length + ' diffusion(s) reçue(s)');

    // ⚠️ LA CONTREPARTIE : la vraie victime, elle, doit rentrer chez elle.
    const retour = await socketNue();
    retour.emit('register-authenticated', {
        playerId: idVole, username: 'Victime', roomCode: code,
        sieges: { [code]: victime.sieges[code] },
    });
    await wait(300);
    retour.vus.length = 0;
    const temoin3 = await joueur('Temoin3');
    await wait(300);
    check('la vraie victime reprend sa place avec son jeton', retour.vus.length > 0,
        retour.vus.length + ' diffusion(s) reçue(s)');
    check('et elle est toujours dans la liste', (await noms()).includes('Victime'),
        (await noms()).join(', '));

    // ══════════ 2. « reconnect-player » ══════════
    // L'autre porte. Celle-ci répond, elle : un refus se dit par « error ».
    const voleur2 = await socketNue();
    voleur2.emit('reconnect-player', { playerId: idVole, username: 'Victime', code });
    await wait(300);
    check('reconnect-player refuse sans jeton',
        voleur2.erreurs.includes('Reconnexion impossible'),
        voleur2.erreurs.join(' / ') || 'aucune erreur reçue');

    const retour2 = await socketNue();
    retour2.emit('reconnect-player', {
        playerId: idVole, username: 'Victime', code,
        sieges: { [code]: victime.sieges[code] },
    });
    await wait(300);
    check('… et l\'accepte avec le bon jeton',
        !retour2.erreurs.includes('Reconnexion impossible'),
        retour2.erreurs.join(' / ') || 'aucune erreur, comme attendu');

    // ⚠️ Et le jeton d'un AUTRE salon ne vaut pas pour celui-ci : le secret
    // est attaché au siège, pas au joueur. Sans ce contrôle, un tricheur
    // réutiliserait le jeton de sa propre place ailleurs.
    const voleur3 = await socketNue();
    voleur3.emit('reconnect-player', {
        playerId: idVole, username: 'Victime', code,
        sieges: { AUTRE: victime.sieges[code] },
    });
    await wait(300);
    check('un jeton rangé sous un autre salon ne vaut rien',
        voleur3.erreurs.includes('Reconnexion impossible'),
        voleur3.erreurs.join(' / ') || 'aucune erreur reçue');

    for (const s of [hote, voleur, menteur, retour, retour2, voleur2, voleur3,
                     temoin, temoin2, temoin3]) {
        try { s.close(); } catch (e) { /* deja fermee */ }
    }
    await post('/admin/toggle-game', {});
    console.log(ko ? `\n💥 ${ko} contrôle(s) en échec`
                   : '\n✨ Un siège ne se prend qu\'avec son jeton');
    process.exit(ko ? 1 : 0);
})().catch(e => { console.error('💥', e); process.exit(1); });
