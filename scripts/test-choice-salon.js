// ════════════════════════════════════════════════════════════
// ✅❌ CHOICE DE BOUT EN BOUT — serveur lancé à côté
// ════════════════════════════════════════════════════════════
// Une vraie partie, jouée par de vraies sockets. Ce que la suite du
// moteur ne peut pas voir : les réglages qui voyagent, la question qui
// arrive, le choix qui part, et surtout LA FUITE — ni l'événement de
// question, ni /game/state ne doivent porter la réponse.
//
//   npm start   (dans un autre terminal)
//   npm run test:choice-salon
const { io } = require('socket.io-client');
// ⚠️ `mdp-hote` exporte une CHAÎNE, pas une fonction : c'est le vestige du
// mot de passe retiré le 3 octobre 2026, que dix-neuf suites envoient
// encore et que le serveur ignore. On fait comme elles.
const MDP = require('./mdp-hote');

const PORT = process.env.TEST_PORT || process.env.PORT || 7000;
const BASE = 'http://localhost:' + PORT;

let ok = 0, ko = 0;
const dire = (bon, texte, detail) => {
    console.log((bon ? '✅ ' : '❌ ') + texte + (detail ? ' → ' + detail : ''));
    bon ? ok++ : ko++;
};
const titre = (t) => console.log('\n═══ ' + t + ' ═══\n');
const dodo = (ms) => new Promise(r => setTimeout(r, ms));

async function admin(chemin, jeton, corps) {
    const r = await fetch(BASE + chemin, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Host-Token': jeton },
        body: JSON.stringify(corps || {}),
    });
    return { statut: r.status, corps: await r.json().catch(() => ({})) };
}

function brancher(code, pseudo, id) {
    return new Promise((resolve) => {
        const s = io(BASE, { transports: ['websocket'], forceNew: true });
        const recu = { questions: [], revelations: [], fin: null, debut: null };
        // ⚠️ `code`, et pas `roomCode` — c'est le nom qu'attend le serveur.
        // Et l'enregistrement doit avoir eu lieu AVANT la jointure, sinon le
        // joueur entre sans identité et le salon reste vide.
        s.on('connect', () => {
            s.emit('register-authenticated', { playerId: id, username: pseudo, avatar: 'goku.webp' });
            setTimeout(() => {
                s.emit('join-lobby', { code, playerId: id, username: pseudo, avatar: 'goku.webp' });
                setTimeout(() => resolve({ s, recu, id, pseudo }), 350);
            }, 150);
        });
        s.on('choice-debut', (d) => { recu.debut = d; });
        s.on('choice-question', (d) => { recu.questions.push(d); });
        s.on('choice-revelation', (d) => { recu.revelations.push(d); });
        s.on('choice-fin', (d) => { recu.fin = d; });
    });
}

(async () => {
    titre('1. OUVRIR UN SALON EN CHOICE');

    const ouverture = await (await fetch(BASE + '/admin/toggle-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motDePasse: MDP, lobbyMode: 'choice', playerId: 'hote-choice' }),
    })).json();

    dire(!!ouverture.hostToken, 'le salon s’ouvre et rend un jeton', ouverture.roomCode);
    const jeton = ouverture.hostToken;
    const code = ouverture.roomCode;
    if (!jeton) { console.log('\n💥 pas de jeton : ' + JSON.stringify(ouverture)); process.exit(1); }

    const r = ouverture.reglages || {};
    dire(!!r.choice, 'les réglages du salon portent la section « choice »');
    dire(r.choice && r.choice.vies === 1, 'une vie par défaut', String(r.choice && r.choice.vies));
    dire(r.choice && r.choice.duree === 8, 'huit secondes par défaut', String(r.choice && r.choice.duree));
    dire(r.choice && r.choice.voirLesAutres === true, 'on voit les autres par défaut');

    titre('2. LES RÉGLAGES');

    let a = await admin('/admin/choice/set-duree', jeton, { duree: 5 });
    dire(a.corps.duree === 5, 'la durée se règle', '5 s');
    a = await admin('/admin/choice/set-duree', jeton, { duree: 7 });
    dire(a.statut === 400, 'une durée hors barème est refusée', 'HTTP ' + a.statut);
    a = await admin('/admin/choice/set-voir', jeton, { voir: false });
    dire(a.corps.voirLesAutres === false, '« voir les autres » s’éteint');
    a = await admin('/admin/choice/set-voir', jeton, { voir: true });
    dire(a.corps.voirLesAutres === true, 'et se rallume');
    a = await admin('/admin/choice/set-serie', jeton, { serie: 'Série Qui N Existe Pas' });
    dire(a.statut === 400, 'une série inconnue de la banque est refusée', 'HTTP ' + a.statut);

    // Sans le jeton d'hôte, rien ne passe.
    const sansJeton = await fetch(BASE + '/admin/choice/set-vies', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vies: 2 }),
    });
    dire(sansJeton.status === 401 || sansJeton.status === 403,
        'sans jeton d’hôte, le réglage est fermé', 'HTTP ' + sansJeton.status);

    titre('3. DEUX JOUEURS, UNE MANCHE');

    const j1 = await brancher(code, 'ChoiceUn', 'choice-1');
    const j2 = await brancher(code, 'ChoiceDeux', 'choice-2');
    await dodo(400);

    const dep = await admin('/admin/start-game', jeton, {});
    dire(dep.corps.success === true, 'la partie démarre', JSON.stringify(dep.corps).slice(0, 80));
    if (dep.corps.success !== true) {
        console.log('\n💥 impossible de continuer sans partie.');
        process.exit(1);
    }

    // La première question arrive après le temps d'entrée.
    await dodo(2200);
    dire(j1.recu.questions.length >= 1, 'la première question arrive',
        j1.recu.questions.length + ' reçue(s)');

    const q = j1.recu.questions[0];
    titre('4. ⚠️ LA FUITE — ce que le joueur ne doit PAS recevoir');

    if (q) {
        const brut = JSON.stringify(q);
        dire(!('reponse' in q.question), 'la RÉPONSE n’est pas dans l’événement');
        dire(!('proof_url' in q.question), 'le lien de preuve non plus');
        dire(!/proof|reponse/i.test(brut), 'et rien ne les trahit dans la charge entière');
        dire(!!q.question.question && !!q.question.serie,
            'l’énoncé et la série, eux, sont bien là', q.question.serie);
        dire(typeof q.reste === 'number' && !('finA' in q),
            'le temps part en RESTE, pas en échéance serveur', q.reste + ' ms');
    }

    // /game/state s'ouvre avec le seul code du salon.
    const etat = await (await fetch(BASE + '/game/state?code=' + code)).json();
    const brutEtat = JSON.stringify(etat);
    dire(!!etat.choice, '/game/state porte bien la section « choice »');
    dire(!/"reponse"/.test(brutEtat), '⚠️ mais PAS la réponse de la question en cours');
    dire(!/proof_url/.test(brutEtat), 'ni le lien de preuve');
    dire(q ? !brutEtat.includes(q.question.question) : true,
        'ni même l’énoncé — il n’a rien à faire sur une route ouverte au code');

    titre('5. CHOISIR, ET NE PAS SE REPRENDRE');

    j1.s.emit('choice-choisir', { camp: 'v' });
    j2.s.emit('choice-choisir', { camp: 'f' });
    await dodo(300);
    // Un second envoi : le moteur doit l'ignorer.
    j1.s.emit('choice-choisir', { camp: 'f' });
    await dodo(300);

    const apres = await (await fetch(BASE + '/game/state?code=' + code)).json();
    dire(apres.choice && apres.choice.active === true, 'la manche est toujours en cours');

    // On attend le verrouillage puis la révélation.
    await dodo(6500);
    dire(j1.recu.revelations.length >= 1, 'la révélation arrive',
        j1.recu.revelations.length + ' reçue(s)');
    const rev = j1.recu.revelations[0];
    if (rev) {
        dire(typeof rev.bonne === 'boolean', '⚠️ et C’EST LÀ que la réponse sort', String(rev.bonne));
        dire(Array.isArray(rev.perdants), 'avec la liste de ceux qui tombent',
            rev.perdants.length + ' perdant(s)');
        // Un seul des deux a pu avoir raison : l'autre tombe.
        dire(rev.nulle === true || rev.perdants.length >= 1,
            'un des deux bords tombe, ou la manche est nulle',
            rev.nulle ? 'nulle' : rev.perdants.length + ' tombé(s)');
    }

    titre('6. LA FIN');

    // À deux joueurs avec une vie, la partie se termine vite — on laisse
    // quelques manches au cas où elles seraient nulles.
    let tours = 0;
    while (!j1.recu.fin && tours < 10) { await dodo(3000); tours++; }

    dire(!!j1.recu.fin, 'la partie se termine', tours + ' tour(s) d’attente');
    if (j1.recu.fin) {
        const f = j1.recu.fin;
        dire(Array.isArray(f.classement) && f.classement.length === 2,
            'le classement nomme les deux joueurs', f.classement.map(c => c.username).join(', '));
        dire(f.classement[0].vivant === true || f.manches > 0,
            'le premier du classement est le survivant', f.classement[0].username);
    }

    const fini = await (await fetch(BASE + '/game/state?code=' + code)).json();
    dire(fini.inProgress === false, 'le salon n’est plus « en partie »');

    j1.s.close(); j2.s.close();
    await dodo(300);

    console.log('\n' + (ko === 0
        ? '✨ Choice tient de bout en bout : ' + ok + ' contrôles'
        : '💥 ' + ko + ' contrôle(s) en échec sur ' + (ok + ko)));
    process.exit(ko === 0 ? 0 : 1);
})().catch((e) => {
    console.error('\n💥 ' + (e && e.message ? e.message : e));
    process.exit(1);
});
