// 🛡️ Le débit d'une socket : un client bricolé ne doit pas pouvoir noyer le
// serveur, et un joueur normal ne doit jamais s'en apercevoir.
//
// Le plafond par IP ne comptait que les connexions ouvertes. Une seule suffisait
// ensuite à envoyer des milliers d'événements par seconde, et comme la boucle du
// dyno est partagée par tous les salons, un seul client pouvait faire ramer les
// parties des autres.
//
// À lancer avec le serveur à côté, aux valeurs par défaut.
const { io } = require('socket.io-client');

const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
const DEBIT = parseInt(process.env.EVENEMENTS_PAR_SECONDE, 10) || 25;
const RAFALE = DEBIT * 2;
const COUPURE = 300;   // REFUS_AVANT_COUPURE côté serveur

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

let ko = 0;
const check = (l, ok, extra) => { console.log(`${ok ? '✅' : '❌'} ${l}${extra ? ' → ' + extra : ''}`); if (!ok) ko++; };

// « rush-get-state » répond au seul demandeur : c'est donc le compteur de
// réponses qui dit combien d'événements ont franchi le filtre.
async function client(nom) {
    const s = io(BASE, { transports: ['websocket'], forceNew: true });
    const c = { socket: s, nom, reponses: 0, coupe: false };
    s.on('rush-reprise', () => c.reponses++);
    s.on('disconnect', () => { c.coupe = true; });
    await new Promise(r => s.on('connect', r));
    s.emit('register-authenticated', { playerId: nom, username: nom });
    await wait(120);
    s.emit('join-lobby', { playerId: nom, username: nom, code });
    await wait(250);
    return c;
}

(async () => {
    // Rush : libre, pas de mot de passe à fournir
    await post('/admin/toggle-game', { lobbyMode: 'rush' });
    check('salon ouvert', !!code, code);

    const sage = await client('Sage');
    const brute = await client('Brute');

    const dedans = await fetch(BASE + '/game/state?code=' + code).then(r => r.json());
    check('les deux joueurs sont dans le salon', (dedans.players || []).length === 2,
        (dedans.players || []).length + ' joueur(s)');

    // ── 1. La rafale passe, le surplus est jeté ──
    //
    // Deux cents envois d'un coup : la rafale d'entrée en laisse passer une
    // poignée, le reste tombe. Deux cents et pas plus, pour que le compte de
    // refus reste sous le seuil de coupure — on l'éprouve plus bas.
    const ENVOIS = 200;
    for (let i = 0; i < ENVOIS; i++) brute.socket.emit('rush-get-state', {});
    await wait(900);

    const plafond = RAFALE + DEBIT * 2;   // la rafale, plus ce qui se remplit pendant l'attente
    check('la rafale est bornée', brute.reponses > 0 && brute.reponses <= plafond,
        brute.reponses + ' réponse(s) pour ' + ENVOIS + ' envois, plafond ' + plafond);
    check('un client bavard n\'est pas coupé pour autant', !brute.coupe,
        'environ ' + (ENVOIS - RAFALE) + ' refus, seuil ' + COUPURE);

    // ── 2. Le joueur normal ne s'aperçoit de rien ──
    //
    // Pendant que l'autre matraque à cent par seconde, celui-ci envoie à seize,
    // la cadence maximale du vrai client de Rush. Tout doit lui revenir.
    const avant = sage.reponses;
    const marteau = setInterval(() => { for (let i = 0; i < 5; i++) brute.socket.emit('rush-get-state', {}); }, 50);

    const SAGES = 16;
    for (let i = 0; i < SAGES; i++) { sage.socket.emit('rush-get-state', {}); await wait(62); }
    await wait(300);
    check('le joueur à cadence normale est servi entièrement', sage.reponses - avant >= SAGES,
        (sage.reponses - avant) + '/' + SAGES + ' réponse(s) pendant le matraquage');

    // ── 3. L'acharnement finit par couper ──
    await wait(2500);
    clearInterval(marteau);
    await wait(300);
    check('le client acharné finit coupé', brute.coupe,
        brute.coupe ? 'socket fermée' : 'toujours connectée');
    check('le joueur normal n\'a pas été coupé au passage', !sage.coupe);

    // ── 4. Et le salon reste sain ──
    const apres = await fetch(BASE + '/game/state?code=' + code).then(r => r.json());
    check('le salon répond toujours', !!apres && !apres.error);

    sage.socket.close();
    brute.socket.close();
    await post('/admin/toggle-game', {});   // referme le salon

    console.log(ko ? `\n💥 ${ko} contrôle(s) en échec` : '\n✨ Le débit tient : la brute est bornée, le joueur normal ne voit rien');
    process.exit(ko ? 1 : 0);
})().catch(e => { console.error('💥', e); process.exit(1); });
