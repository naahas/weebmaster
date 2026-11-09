// 💡 Rush — les jokers : passer un portrait SANS casser la série.
//
// Deux par manche, en forme d'ampoules à côté du portrait. Ce qui se mesure
// ici n'est pas qu'ils marchent, mais qu'on ne puisse pas en avoir plus :
//
//   1. le défaut est OUI, et il vaut deux ;
//   2. un joker avance SANS toucher à la série, au score ni au record ;
//   3. il ne compte pas comme un personnage trouvé — `trouves` départage le
//      classement à record égal, on y grimperait en esquivant ;
//   4. le troisième est REFUSÉ, en silence ;
//   5. RÉGLAGE ÉTEINT, l'événement ne fait rien — le serveur ne se repose pas
//      sur le fait que le client cache les ampoules ;
//   6. ⚠️ UN RAFRAÎCHISSEMENT NE LES RECHARGE PAS. C'est le contrôle qui
//      compte le plus : si la reprise renvoyait le défaut, recharger la page
//      serait la façon la plus simple d'en avoir autant qu'on veut ;
//   7. et la manche SUIVANTE, elle, repart avec les deux.
const { io } = require('socket.io-client');

const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
const MDP = require('./mdp-hote');
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

// Le nom du portrait courant passe par une porte fermée en production : les
// images sont servies sous jeton, leur nom de fichier disait la réponse.
const nomDuPortrait = async (playerId) => {
    const r = await post('/admin/rush/solution', { playerId });
    return r.body ? r.body.nom : r.nom;
};

const brancher = async (id, nom) => {
    const s = io(BASE, { transports: ['websocket'] });
    await new Promise(r => s.on('connect', r));
    const vu = { portraits: [], classements: [], reprises: [], fins: [], departs: [] };
    s.on('rush-portrait', (x) => vu.portraits.push(x));
    // ⚠️ La charge utile est `{ classement: [...] }`, pas le tableau nu.
    s.on('rush-classement', (x) => vu.classements.push(x.classement || []));
    s.on('rush-reprise', (x) => vu.reprises.push(x));
    s.on('rush-game-ended', (x) => vu.fins.push(x));
    s.on('rush-game-started', (x) => vu.departs.push(x));
    s.emit('register-authenticated', { playerId: id, username: nom });
    await wait(120);
    s.emit('join-lobby', { playerId: id, username: nom, code });
    return { s, id, nom, vu };
};
const dernier = (j) => j.vu.portraits[j.vu.portraits.length - 1];

// ⚠️ Il n'existe PAS de route pour arrêter une manche : elle court jusqu'au
// bout de son chrono, et `/admin/replay` relance ensuite. D'où les trente
// secondes par manche — le plus court du barème — et les trois manches de
// cette suite, qui durent donc une minute quarante-cinq en tout.
const attendreLaFin = async (j) => {
    const vus = j.vu.fins.length;
    for (let i = 0; i < 90 && j.vu.fins.length === vus; i++) await wait(500);
    return j.vu.fins.length > vus;
};

(async () => {
    await post('/admin/toggle-game', { lobbyMode: 'rush' });

    // ── 1. Le défaut ──
    let e = await etat();
    check('les jokers sont allumés par défaut', e.rush && e.rush.jokers === true,
        e.rush ? String(e.rush.jokers) : 'pas de bloc rush');

    // La limite par portrait gênerait la mesure : un portrait qui expire tout
    // seul casserait la série pendant qu'on regarde ailleurs.
    await post('/admin/rush/set-limite', { limite: 0 });
    await post('/admin/rush/set-duree', { duree: 30 });   // le plus court du barème

    const a = await brancher('j1', 'Joker');
    const b = await brancher('j2', 'Temoin');
    await wait(700);

    const depart = await post('/admin/start-game', {});
    check('la manche démarre', depart.body.success === true, depart.body.error || 'ok');
    await wait(500);

    check('on commence avec deux jokers', dernier(a).jokersRestants === 2,
        String(dernier(a).jokersRestants));
    // Le TOTAL voyage avec le départ de manche, pas avec chaque portrait :
    // c'est lui qui dessine les douilles, y compris celles déjà brûlées.
    const depart0 = a.vu.departs[a.vu.departs.length - 1] || {};
    check('le départ annonce le réglage et le total',
        depart0.jokers === true && depart0.jokersTotal === 2,
        'jokers=' + depart0.jokers + ' total=' + depart0.jokersTotal);

    // ── 2. Une série de trois, puis un joker ──
    for (let i = 0; i < 3; i++) {
        const nom = await nomDuPortrait(a.id);
        a.s.emit('rush-saisie', { texte: nom });
        await wait(280);
    }
    const avant = dernier(a);
    check('la série monte à trois', avant.serie === 3 && avant.record === 3,
        'série ' + avant.serie + ', record ' + avant.record);

    const imgAvant = avant.portrait.img;
    a.s.emit('rush-joker');
    await wait(320);
    const apres = dernier(a);

    check('le joker fait changer de portrait', apres.portrait.img !== imgAvant);
    check('⭐ la série NE CASSE PAS', apres.serie === 3,
        'série ' + apres.serie + ' (attendu 3)');
    check('le record ne bouge pas', apres.record === 3, 'record ' + apres.record);
    check('une ampoule en moins', apres.jokersRestants === 1, String(apres.jokersRestants));
    check('ce n\'est ni une réussite ni un raté', apres.reussi === null && apres.joker === true,
        'reussi=' + apres.reussi + ' joker=' + apres.joker);

    // ── 3. Il ne compte pas comme un personnage trouvé ──
    const moi = (j) => {
        const c = j.vu.classements[j.vu.classements.length - 1] || [];
        return c.find(x => x.playerId === j.id) || {};
    };
    check('⭐ le joker ne compte pas comme un trouvé', moi(a).trouves === 3,
        'trouves ' + moi(a).trouves + ' (attendu 3)');

    // ── 4. Le troisième est refusé ──
    a.s.emit('rush-joker');
    await wait(300);
    check('le second joker passe', dernier(a).jokersRestants === 0,
        String(dernier(a).jokersRestants));
    const nbAvant = a.vu.portraits.length;
    a.s.emit('rush-joker');
    await wait(300);
    check('⭐ le troisième est refusé', a.vu.portraits.length === nbAvant,
        a.vu.portraits.length + ' portraits, ' + nbAvant + ' avant');
    check('la série a tenu les deux jokers', dernier(a).serie === 3,
        'série ' + dernier(a).serie);

    // ── 5. Un rafraîchissement ne les recharge pas ──
    // On rebranche une socket NEUVE pour le même joueur, comme le ferait un
    // rechargement de page, puis on redemande l'état.
    a.s.disconnect();
    await wait(250);
    const a2 = await brancher('j1', 'Joker');
    await wait(350);
    a2.s.emit('rush-get-state');
    await wait(350);
    const rep = a2.vu.reprises[a2.vu.reprises.length - 1];
    check('la reprise répond', rep && rep.enCours === true, rep ? 'enCours' : 'rien reçu');
    check('⭐ les jokers brûlés le RESTENT après un rafraîchissement',
        rep && rep.jokersRestants === 0,
        rep ? String(rep.jokersRestants) + ' (attendu 0)' : '—');
    check('la reprise porte aussi le réglage', rep && rep.jokers === true,
        rep ? String(rep.jokers) : '—');
    check('la série a survécu au rafraîchissement', rep && rep.serie === 3,
        rep ? 'série ' + rep.serie : '—');

    // ── 6. La manche suivante recharge ──
    console.log('   (on attend la fin des 30 s…)');
    check('la manche se termine seule', await attendreLaFin(a2));
    const relance = await post('/admin/replay', {});
    check('le salon relance', relance.status === 200,
        relance.body && relance.body.error);
    await wait(300);
    const depart2 = await post('/admin/start-game', {});
    if (depart2.body && depart2.body.success) {
        await wait(600);
        check('⭐ la manche suivante repart avec deux jokers',
            dernier(a2).jokersRestants === 2, String(dernier(a2).jokersRestants));
    } else {
        check('la manche suivante repart avec deux jokers', false,
            'relance refusée : ' + (depart2.body && depart2.body.error));
    }

    // ── Et le réglage est refusé en pleine partie ──
    const pendant = await post('/admin/rush/set-jokers', { actif: true });
    check('on ne change pas le réglage en pleine manche', pendant.status === 400,
        'HTTP ' + pendant.status);

    // ── 7. Réglage éteint : le serveur refuse, pas seulement l'écran ──
    console.log('   (on attend la fin des 30 s…)');
    check('la deuxième manche se termine', await attendreLaFin(a2));
    await post('/admin/replay', {});
    await wait(300);
    const off = await post('/admin/rush/set-jokers', { actif: false });
    check('le réglage s\'éteint', off.status === 200 && off.body.jokers === false,
        off.body.error || 'off');
    const e2 = await etat();
    check('et l\'état du salon le dit', e2.rush && e2.rush.jokers === false);

    const depart3 = await post('/admin/start-game', {});
    if (depart3.body && depart3.body.success) {
        await wait(600);
        check('aucun joker en réserve', dernier(a2).jokersRestants === 0,
            String(dernier(a2).jokersRestants));
        const nb2 = a2.vu.portraits.length;
        a2.s.emit('rush-joker');
        await wait(350);
        check('⭐ réglage éteint, l\'événement ne fait RIEN',
            a2.vu.portraits.length === nb2,
            a2.vu.portraits.length + ' portraits, ' + nb2 + ' avant');
    } else {
        check('réglage éteint : manche jouée', false,
            'départ refusé : ' + (depart3.body && depart3.body.error));
    }

    a2.s.disconnect();
    b.s.disconnect();
    await wait(300);

    console.log(ko ? `\n❌ ${ko} contrôle(s) en échec` : '\n✅ Les jokers du Rush tiennent');
    process.exit(ko ? 1 : 0);
})().catch((e) => { console.error('💥', e); process.exit(1); });
