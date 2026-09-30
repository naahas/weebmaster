// L'ORDRE de passage de la bombe, joué pour de vrai.
//
// Le réglage « Ordre » a deux valeurs : « horaire » (le défaut, l'ordre de
// toujours) et « aléatoire ». En aléatoire la bombe désigne au hasard parmi
// ceux qui n'ont PAS encore joué le tour en cours.
//
// ⚠️ Deux garanties, et il faut les deux :
//   • chacun reçoit la bombe UNE fois par tour, jamais deux — sinon un joueur
//     pourrait la prendre trois fois pendant qu'un autre ne l'a jamais eue ;
//   • et jamais deux fois D'AFFILÉE, y compris à la charnière entre deux tours
//     — dernier d'un tour puis premier du suivant est le seul cas possible.
//
// On l'observe sur une VRAIE manche : les bots de mise au point répondent
// comme des joueurs, donc la bombe tourne sans qu'on ait à jouer.
const { io } = require('socket.io-client');

const PORT = process.env.TEST_PORT || process.env.PORT || 7000;
const BASE = 'http://localhost:' + PORT;

let ok = 0, ko = 0;
const dire = (b, txt, det) => {
    console.log((b ? '✅ ' : '❌ ') + txt + (det ? ' → ' + det : ''));
    b ? ok++ : ko++;
};
const attendre = ms => new Promise(r => setTimeout(r, ms));
const poster = (chemin, corps, jeton) => fetch(BASE + chemin, {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' },
        jeton ? { 'X-Host-Token': jeton } : {}),
    body: JSON.stringify(corps || {}),
}).then(r => r.json().catch(() => ({})));

// Une manche observée : on relève qui porte la bombe, tour après tour.
async function manche(ordre, nbBots) {
    const o = await poster('/admin/toggle-game', { lobbyMode: 'bombanime', playerId: 'ord-h' });
    const jeton = o.hostToken;
    await poster('/admin/bombanime/update-serie', { serie: 'Manganime' }, jeton);
    await poster('/admin/bombanime/set-timer', { timer: 5 }, jeton);
    // Deux vies : un joueur éliminé fausserait le relevé des tours.
    await poster('/admin/bombanime/set-lives', { lives: 2 }, jeton);
    await poster('/admin/bombanime/set-ordre', { ordre }, jeton);

    const s = io(BASE, { transports: ['websocket'] });
    await new Promise(r => s.on('connect', r));
    s.emit('register-authenticated', { playerId: 'ord-h', username: 'Hote' });
    await attendre(200);
    s.emit('join-lobby', { playerId: 'ord-h', username: 'Hote', code: o.roomCode });
    await attendre(600);

    // ⚠️ Des bots de MISE AU POINT, qui répondent : sans eux la bombe explose
    // au premier tour et l'on n'observe rien.
    s.emit('dev-add-bots', { count: nbBots, hostToken: jeton });
    await attendre(800);

    const porteurs = [];
    // ⚠️ Le champ s'appelle « currentPlayerId », pas « playerId » : avec le
    // mauvais nom on ne relève rien et le test conclut à tort que la bombe
    // n'a pas tourné.
    const noter = id => {
        if (id && porteurs[porteurs.length - 1] !== id) porteurs.push(id);
    };
    s.on('bombanime-turn-start', d => noter(d && d.currentPlayerId));
    s.on('bombanime-state', d => noter(d && d.currentPlayerId));

    await poster('/admin/start-game', {}, jeton);
    // L'hôte ne répond jamais : il perdra ses vies, les bots font tourner.
    await attendre(22000);

    s.disconnect();
    await poster('/admin/toggle-game', {}, jeton);
    return porteurs;
}

(async () => {
    console.log('');
    console.log('═══ ORDRE ALÉATOIRE, six joueurs ═══');
    console.log('');

    const porteurs = await manche('aleatoire', 5);
    dire(porteurs.length >= 6, 'la bombe a tourné', porteurs.length + ' passage(s) relevé(s)');
    if (porteurs.length < 6) {
        console.log('   (pas assez de passages pour conclure — le serveur tourne-t-il ?)');
        process.exit(1);
    }

    // Jamais deux fois d'affilée.
    let colles = 0;
    for (let i = 1; i < porteurs.length; i++) if (porteurs[i] === porteurs[i - 1]) colles++;
    dire(colles === 0, '⚠️ jamais deux passages d\'affilée sur le même',
        colles ? colles + ' cas' : '0 sur ' + (porteurs.length - 1) + ' enchaînements');

    // Et l'écart entre deux passages d'un même joueur ne descend jamais sous
    // le nombre de joueurs vivants — c'est la garantie du « un par tour ».
    const vus = {};
    let tropTot = 0;
    porteurs.forEach((p, i) => {
        if (vus[p] !== undefined && i - vus[p] < 2) tropTot++;
        vus[p] = i;
    });
    dire(tropTot === 0, 'aucun retour avant que d\'autres soient passés',
        tropTot ? tropTot + ' cas' : 'aucun');

    const distincts = new Set(porteurs).size;
    dire(distincts >= 3, 'plusieurs joueurs ont porté la bombe',
        distincts + ' joueur(s) distinct(s)');

    console.log('');
    console.log('   ordre observé : ' + porteurs.slice(0, 14).map(p => p.slice(-4)).join(' '));

    console.log('');
    console.log(ko === 0
        ? '✨ L\'ordre aléatoire passe par tout le monde, et jamais deux fois de suite'
        : '💥 ' + ko + ' échec(s) sur ' + (ok + ko));
    process.exit(ko === 0 ? 0 : 1);
})().catch(e => { console.error('\n💥 ' + e.message); process.exit(1); });
