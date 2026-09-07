// ⚡✖️ Rush : le multiplicateur. Un cran toutes les dix bonnes réponses
// D'AFFILÉE, et le palier se compte en RÉPONSES, jamais en points — c'est la
// seule chose que ce fichier surveille vraiment.
//
// Compter le palier sur le score affiché aurait ouvert le ×3 après quinze
// réponses au lieu de vingt, puis le ×4 après quatre de plus : l'emballement
// se serait mangé lui-même. La différence est invisible à l'écran, et un
// barème faux ne se voit qu'au classement d'une manche déjà jouée.
//
// On vérifie aussi que le réglage ÉTEINT rend exactement le mode d'avant : à
// ×1 le score suit la série pas à pas, et personne ne doit voir la différence.
const { io } = require('socket.io-client');

const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
const MDP = require('./mdp-hote');   // mesure temporaire : ouverture du mode Classique
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
const check = (l, ok, extra) => { console.log(`${ok ? '✅' : '❌'} ${l}${extra ? ' → ' + extra : ''}`); if (!ok) ko++; };

// Le serveur n'envoie jamais le nom : on le lui demande par la porte de mise au
// point, refusée en production et fermée par le jeton d'hôte.
const nomDuPortrait = async (playerId) => {
    const r = await post('/admin/rush/solution', { playerId });
    return r.body ? r.body.nom : r.nom;
};

// Ouvre un salon Rush neuf, sans limite par portrait — la manche doit tenir le
// temps de quarante réponses, et un compte à rebours de huit secondes casserait
// la série au premier aller-retour un peu lent.
async function salonRush(multiplicateur) {
    jeton = ''; code = '';
    await post('/admin/toggle-game', { lobbyMode: 'rush' });
    await post('/admin/rush/set-duree', { duree: 90 });
    await post('/admin/rush/set-limite', { limite: 0 });
    await post('/admin/rush/set-multiplicateur', { actif: multiplicateur });

    const s = io(BASE, { transports: ['websocket'] });
    await new Promise(r => s.on('connect', r));
    const vu = [];
    s.on('rush-portrait', (x) => vu.push(x));
    s.emit('register-authenticated', { playerId: 'm1', username: 'Mult' });
    await wait(120);
    s.emit('join-lobby', { playerId: 'm1', username: 'Mult', code });
    await wait(600);
    await post('/admin/start-game', {});
    await wait(400);
    return { s, vu, id: 'm1' };
}

// Une bonne réponse, et l'état du compteur qui en revient.
async function repondre(j) {
    const nom = await nomDuPortrait(j.id);
    j.s.emit('rush-saisie', { texte: nom });
    await wait(160);
    return j.vu[j.vu.length - 1];
}

(async () => {
    // ── Le réglage ──
    await post('/admin/toggle-game', { lobbyMode: 'rush' });
    let e = await etat();
    check('le multiplicateur est éteint par défaut', e.rush && e.rush.multiplicateur === false,
        String(e.rush && e.rush.multiplicateur));

    const on = await post('/admin/rush/set-multiplicateur', { actif: true });
    check('le réglage s\'allume', on.status === 200 && on.body.multiplicateur === true,
        on.body.error || 'oui');
    e = await etat();
    check('et l\'état du salon le porte', e.rush && e.rush.multiplicateur === true);
    await post('/admin/toggle-game', {});

    // ══ Le barème, réglage allumé ══
    const j = await salonRush(true);
    check('la manche démarre avec ×1', j.vu.length === 1 && j.vu[0].mult === 1,
        'x' + (j.vu[0] && j.vu[0].mult));

    const jalons = {};
    for (let rep = 1; rep <= 21; rep++) {
        const p = await repondre(j);
        if (!p) { check('la manche tient 21 réponses', false, 'plus de portrait à la ' + rep + 'e'); break; }
        jalons[rep] = { score: p.serie, mult: p.mult, record: p.record };
    }

    check('dix réponses valent dix points',
        jalons[10] && jalons[10].score === 10,
        jalons[10] && 'score ' + jalons[10].score);
    check('c\'est là, et pas avant, que le ×2 s\'ouvre',
        jalons[9] && jalons[9].mult === 1 && jalons[10] && jalons[10].mult === 2,
        jalons[9] && 'x' + jalons[9].mult + ' puis x' + jalons[10].mult);
    check('la onzième réponse vaut deux points, pas la dixième',
        jalons[11] && jalons[11].score === 12,
        jalons[11] && 'score ' + jalons[11].score);

    // ⚠️ Le cœur du fichier : à vingt réponses on a trente points, et c'est le
    // NOMBRE DE RÉPONSES qui ouvre le cran, pas le compteur.
    check('vingt réponses valent trente points',
        jalons[20] && jalons[20].score === 30,
        jalons[20] && 'score ' + jalons[20].score);
    check('le ×3 s\'ouvre à la vingtième réponse, pas au trentième point',
        jalons[19] && jalons[19].mult === 2 && jalons[20] && jalons[20].mult === 3,
        jalons[19] && 'x' + jalons[19].mult + ' puis x' + jalons[20].mult);
    check('la vingt-et-unième vaut donc trois points',
        jalons[21] && jalons[21].score === 33,
        jalons[21] && 'score ' + jalons[21].score);
    check('le record suit le score', jalons[21] && jalons[21].record === 33,
        jalons[21] && 'record ' + jalons[21].record);

    // ── La reprise garde le multiplicateur ──
    let reprise = null;
    j.s.on('rush-reprise', (d) => { reprise = d; });
    j.s.emit('rush-get-state');
    await wait(350);
    check('après un F5, on retrouve son score et son cran',
        reprise && reprise.serie === 33 && reprise.mult === 3 && reprise.multiplicateur === true,
        reprise && 'score ' + reprise.serie + ', x' + reprise.mult);

    // ── Une erreur casse tout ──
    j.s.emit('rush-passer');
    await wait(300);
    const casse = j.vu[j.vu.length - 1];
    check('une erreur remet le score à zéro', casse && casse.serie === 0, casse && 'score ' + casse.serie);
    check('et le multiplicateur avec', casse && casse.mult === 1, casse && 'x' + casse.mult);
    check('le record du tour, lui, reste', casse && casse.record === 33, casse && 'record ' + casse.record);

    // Il faut de nouveau dix réponses pour rouvrir le ×2 : le cran ne se
    // rattrape pas, il se regagne.
    let apres = null;
    for (let rep = 1; rep <= 9; rep++) apres = await repondre(j);
    check('neuf réponses ne suffisent pas à rouvrir le ×2',
        apres && apres.mult === 1 && apres.serie === 9,
        apres && 'score ' + apres.serie + ', x' + apres.mult);
    apres = await repondre(j);
    check('la dixième le rouvre', apres && apres.mult === 2 && apres.serie === 10,
        apres && 'score ' + apres.serie + ', x' + apres.mult);

    j.s.disconnect();
    await post('/admin/toggle-game', {});

    // ══ Réglage éteint : le mode d'avant, au point près ══
    const k = await salonRush(false);
    let dernier = null;
    for (let rep = 1; rep <= 12; rep++) {
        dernier = await repondre(k);
        if (!dernier) break;
    }
    check('éteint, douze réponses valent douze points',
        dernier && dernier.serie === 12, dernier && 'score ' + dernier.serie);
    check('éteint, le multiplicateur ne monte jamais',
        dernier && dernier.mult === 1, dernier && 'x' + dernier.mult);
    k.s.disconnect();
    await post('/admin/toggle-game', {});

    console.log(ko ? `\n❌ ${ko} problème(s)` : '\n✨ Le multiplicateur compte les réponses, pas les points');
    process.exit(ko ? 1 : 0);
})().catch(e => { console.error('💥', e); process.exit(1); });
