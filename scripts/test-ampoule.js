// 🏔️ Ascension : l'ampoule de « Devine le perso ».
//
// Un joker par étage, qui livre le nom d'un portrait. Tout ce qui compte se
// décide au serveur — le seuil de trois bonnes réponses, l'unicité, le nom qui
// n'est jamais envoyé d'avance. Un client bricolé doit donc se heurter aux
// mêmes refus qu'un client honnête.
//
// La suite ne grimpe pas la tour : elle ouvre un salon, lit son premier étage,
// referme si ce n'est pas un « guess », et recommence. Attendre que le hasard
// amène le bon type en montant dépendrait des minuteurs.
//
// ⚠️ Elle se sert de la fuite connue des identifiants : `nomDe(id)` retrouve
// la réponse dans ascensiondata.json parce que l'identifiant la porte. C'est
// justement ce que `npm run test:ascension` signale en rouge. Le jour où les
// identifiants deviendront opaques, ce fichier devra changer avec eux.
const { io } = require('socket.io-client');
const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
const wait = (ms) => new Promise(r => setTimeout(r, ms));

const data = require('../ascensiondata.json');
const nomDe = (id) => {
    const c = (data.characters || []).find(x => x.id === id);
    return c ? c.name : null;
};

let ko = 0;
const check = (l, ok, extra) => {
    console.log(`${ok ? '✅' : '❌'} ${l}${extra ? ' → ' + extra : ''}`);
    if (!ok) ko++;
};

// Ouvre un salon, y place un joueur, lance la montée, et rend son premier étage
async function premierEtage() {
    let jeton = '', code = '';
    const post = (p, b) => fetch(BASE + p, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Host-Token': jeton },
        body: JSON.stringify(b || {}),
    }).then(r => r.json().then(j => {
        if (j.hostToken) jeton = j.hostToken;
        if (j.roomCode) code = j.roomCode;
        return j;
    }));

    await post('/admin/toggle-game', { lobbyMode: 'ascension' });
    const s = io(BASE, { transports: ['websocket'] });
    await new Promise(r => s.on('connect', r));

    const recu = { guess: [], joker: [], etat: [], fini: [] };
    s.on('ascension-guess-result', (d) => recu.guess.push(d));
    s.on('ascension-guess-joker', (d) => recu.joker.push(d));
    s.on('ascension-state', (d) => recu.etat.push(d));
    s.on('ascension-answer-result', (d) => recu.fini.push(d));

    let etage = null;
    s.on('ascension-floor-start', (d) => { etage = d; });

    s.emit('register-authenticated', { playerId: 'j1', username: 'Joueur' });
    await wait(120);
    s.emit('join-lobby', { playerId: 'j1', username: 'Joueur', code });
    await wait(400);
    await post('/admin/start-game', {});

    for (let i = 0; i < 60 && !etage; i++) await wait(200);
    return {
        s, recu, etage,
        fermer: async () => { s.close(); await post('/admin/toggle-game', {}); },
    };
}

(async () => {
    let trouve = null;
    const MAX = 30;   // largement de quoi tomber sur un « guess » parmi sept types

    for (let tour = 0; tour < MAX && !trouve; tour++) {
        const salon = await premierEtage();
        const f = salon.etage && salon.etage.floorData;
        if (f && f.type === 'guess') { trouve = Object.assign({ f }, salon); break; }
        await salon.fermer();
    }

    if (!trouve) {
        check('un étage « guess » a fini par sortir', false, MAX + ' salons ouverts en vain');
        console.log('\n1 échec(s)');
        process.exit(1);
    }

    const { s, recu, f, fermer } = trouve;
    const persos = f.characters || [];
    check('l étage porte bien cinq portraits', persos.length >= 4, persos.length + ' portrait(s)');

    // ── Trop tôt : rien ne doit sortir ──
    s.emit('ascension-guess-joker', { characterId: persos[4].id });
    await wait(500);
    check('l ampoule reste muette à zéro bonne réponse',
        recu.joker.length === 0, recu.joker.length + ' réponse(s)');

    // ── Deux bonnes réponses : toujours trop tôt ──
    for (let i = 0; i < 2; i++) {
        s.emit('ascension-check-guess', { characterId: persos[i].id, name: nomDe(persos[i].id) || '' });
        await wait(350);
    }
    check('les deux premiers noms sont acceptés',
        recu.guess.filter(g => g.correct).length === 2,
        recu.guess.filter(g => g.correct).length + ' juste(s)');

    s.emit('ascension-guess-joker', { characterId: persos[4].id });
    await wait(500);
    check('l ampoule reste muette à deux bonnes réponses',
        recu.joker.length === 0, recu.joker.length + ' réponse(s)');

    // ── La troisième l allume ──
    s.emit('ascension-check-guess', { characterId: persos[2].id, name: nomDe(persos[2].id) || '' });
    await wait(400);

    s.emit('ascension-guess-joker', { characterId: persos[3].id });
    await wait(600);
    check('l ampoule s allume à la troisième bonne réponse',
        recu.joker.length === 1, recu.joker.length + ' réponse(s)');
    check('elle livre le portrait demandé',
        recu.joker[0] && recu.joker[0].characterId === persos[3].id,
        recu.joker[0] ? recu.joker[0].characterId : '(rien)');
    check('elle livre son nom',
        recu.joker[0] && recu.joker[0].name === nomDe(persos[3].id),
        recu.joker[0] ? recu.joker[0].name : '(rien)');

    // ── Une seule par étage ──
    s.emit('ascension-guess-joker', { characterId: persos[4].id });
    await wait(500);
    check('une seconde ampoule est refusée',
        recu.joker.length === 1, recu.joker.length + ' réponse(s) au total');
    check('l étage n est pas encore validé',
        recu.fini.filter(r => r.correct).length === 0,
        recu.fini.length + ' verdict(s)');

    // ── La reprise ──
    recu.etat.length = 0;
    s.emit('ascension-reconnect', { playerId: 'j1' });
    await wait(700);
    const etat = recu.etat[recu.etat.length - 1];
    check('la reprise répond', !!etat, etat ? 'étage ' + (etat.currentFloor + 1) : '(rien)');
    check('elle se souvient que l ampoule a servi',
        !!(etat && etat.myGuessJokerUsed), etat ? String(etat.myGuessJokerUsed) : '(rien)');
    check('elle rend les quatre portraits déjà tombés',
        !!(etat && (etat.myValidatedGuesses || []).length === 4),
        etat ? (etat.myValidatedGuesses || []).length + ' portrait(s)' : '(rien)');
    check('elle rend leurs noms, pour que les tampons reviennent',
        !!(etat && etat.myValidatedNames
           && etat.myValidatedNames[persos[3].id] === nomDe(persos[3].id)),
        etat && etat.myValidatedNames ? Object.keys(etat.myValidatedNames).length + ' nom(s)' : '(rien)');
    check('elle ne livre toujours pas les noms non trouvés',
        !!(etat && etat.myValidatedNames && !etat.myValidatedNames[persos[4].id]),
        etat && etat.myValidatedNames ? Object.keys(etat.myValidatedNames).join(', ') : '(rien)');

    // ── Le dernier portrait clôt l étage ──
    s.emit('ascension-check-guess', { characterId: persos[4].id, name: nomDe(persos[4].id) || '' });
    await wait(600);
    check('le cinquième nom valide l étage',
        recu.fini.filter(r => r.correct).length === 1,
        recu.fini.filter(r => r.correct).length + ' verdict(s) positif(s)');

    await fermer();

    console.log(ko ? `\n${ko} échec(s)` : '\n✨ L ampoule ne s allume qu à trois, ne sert qu une fois, et survit au rechargement');
    process.exit(ko ? 1 : 0);
})();
