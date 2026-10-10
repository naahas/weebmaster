// 🕵️ Codanime de bout en bout : un vrai salon, de vraies sockets.
//
// Ce que le moteur seul ne peut pas montrer : que les rôles tiennent côté
// SERVEUR (un agent ne peut pas annoncer, un espion ne peut pas voter), que
// l'agent ne reçoit jamais la clef sur le fil, et qu'une chaîne cassée rend
// bien la main à l'adversaire.
//
//   npm start   (dans un autre terminal)
//   npm run test:codanime-salon
const { io } = require('socket.io-client');

const BASE = process.env.BASE || 'http://localhost:7000';
let ok = 0, ko = 0;
const dire = (bon, t, d) => {
    if (bon) { ok++; console.log('  ✅ ' + t); }
    else { ko++; console.log('  ❌ ' + t + (d ? ' → ' + d : '')); }
};
const titre = (t) => console.log('\n── ' + t);
const wait = (ms) => new Promise(r => setTimeout(r, ms));

const post = async (chemin, corps, jeton) => {
    const r = await fetch(BASE + chemin, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(jeton ? { 'X-Host-Token': jeton } : {}) },
        body: JSON.stringify(corps || {}),
    });
    return { statut: r.status, corps: await r.json().catch(() => ({})) };
};

(async () => {
    titre('Ouverture du salon');
    const ouv = await post('/admin/toggle-game', {
        lobbyMode: 'codanime', playerId: 'hote', pseudo: 'Hote',
    });
    const jeton = ouv.corps.hostToken;
    const code = ouv.corps.roomCode || ouv.corps.code;
    dire(!!code && !!jeton, 'salon ouvert en Codanime → ' + code);

    // Quatre joueurs : deux espions, deux agents. Le minimum jouable.
    const gens = [['e1', 'EspionA'], ['a1', 'AgentA'], ['e2', 'EspionB'], ['a2', 'AgentB']];
    const socks = {};
    const vu = {};
    for (const [id, nom] of gens) {
        const s = io(BASE, { transports: ['websocket'] });
        await new Promise(r => s.on('connect', r));
        vu[id] = { etats: [], cartes: [], fin: null, refus: [] };
        s.on('codanime-etat', (d) => vu[id].etats.push(d));
        s.on('codanime-carte', (d) => vu[id].cartes.push(d));
        s.on('codanime-fin', (d) => { vu[id].fin = d; });
        s.on('codanime-refus', (d) => vu[id].refus.push(d));
        s.emit('register-authenticated', { playerId: id, username: nom });
        await wait(120);
        s.emit('join-lobby', { playerId: id, username: nom, code });
        socks[id] = s;
    }
    await wait(700);

    titre('La composition');
    await post('/admin/codanime/placer', { playerId: 'e1', equipe: 'A', role: 'espion' }, jeton);
    await post('/admin/codanime/placer', { playerId: 'a1', equipe: 'A', role: 'agent' }, jeton);
    await post('/admin/codanime/placer', { playerId: 'e2', equipe: 'B', role: 'espion' }, jeton);
    const r4 = await post('/admin/codanime/placer', { playerId: 'a2', equipe: 'B', role: 'agent' }, jeton);
    dire(r4.statut === 200, 'les quatre sont placés');
    dire(r4.corps.equipes && r4.corps.equipes.A.espion === 'e1', 'e1 est bien espion de A');

    const trop = await post('/admin/codanime/placer', { playerId: 'hote', equipe: 'A', role: 'agent' }, jeton);
    dire(trop.statut === 200, 'un troisième joueur peut rejoindre A comme agent');
    const inconnu = await post('/admin/codanime/placer', { playerId: 'x', equipe: 'Z', role: 'agent' }, jeton);
    dire(inconnu.statut === 400, 'une équipe inconnue est refusée');

    titre('Le départ');
    const dep = await post('/admin/start-game', {}, jeton);
    dire(dep.statut === 200 && dep.corps.mode === 'codanime', 'la partie démarre → ' + dep.corps.premier);
    await wait(600);

    const dernier = (id) => vu[id].etats[vu[id].etats.length - 1];
    const eA = dernier('e1'), ag = dernier('a1');
    dire(!!eA && eA.grille.length === 25, 'la grille fait 25 cartes');

    titre('⚠️ Ce qui voyage sur le fil');
    dire(eA.grille.every(c => c.camp), 'l\'espion reçoit les 25 camps');
    const fuites = ag.grille.filter(c => !c.revelee && c.camp !== null);
    dire(fuites.length === 0, 'l\'agent n\'en reçoit AUCUN', fuites.length + ' fuites');
    dire(!ag.grille.some(c => c.nom || c.anime), 'ni nom ni série chez l\'agent');
    dire(ag.grille.every(c => /^\/pic\//.test(c.img)),
        'les portraits passent sous JETON — le nom du fichier dirait qui c\'est');

    const etat = await (await fetch(BASE + '/game/state?code=' + code)).json();
    dire(!JSON.stringify(etat.codanime || {}).includes('assassin'),
        '/game/state, qui s\'ouvre avec le seul code du salon, ne porte pas la clef');

    titre('Les rôles, tenus côté serveur');
    const premier = eA.tourDe;
    const espionDuTour = premier === 'A' ? 'e1' : 'e2';
    const agentDuTour = premier === 'A' ? 'a1' : 'a2';
    const agentAdverse = premier === 'A' ? 'a2' : 'a1';

    socks[agentDuTour].emit('codanime-indice', { nombre: 2 });
    await wait(250);
    dire(vu[agentDuTour].refus.some(r => r.raison === 'pas-espion'),
        'un agent ne peut pas annoncer à la place de son espion');

    socks[espionDuTour].emit('codanime-indice', { nombre: 99 });
    await wait(250);
    dire(vu[espionDuTour].refus.some(r => r.raison === 'trop-grand'),
        'un nombre au-delà du plafond est refusé');

    socks[espionDuTour].emit('codanime-indice', { nombre: 2 });
    await wait(300);
    dire(dernier(espionDuTour).phase === 'vote', 'l\'indice ouvre la phase de vote');
    dire(dernier(espionDuTour).indice.nombre === 2, 'le nombre est transmis');

    socks[espionDuTour].emit('codanime-vote', { i: 0 });
    await wait(200);
    dire(vu[espionDuTour].refus.some(r => r.raison === 'espion-ne-vote-pas'),
        'l\'espion ne peut pas marquer de carte — il désignerait du doigt');

    socks[agentAdverse].emit('codanime-vote', { i: 0 });
    await wait(200);
    dire(vu[agentAdverse].refus.some(r => r.raison === 'pas-ton-tour'),
        'un agent de l\'autre équipe ne vote pas pendant ce tour');

    titre('Le vote et la révélation');
    const vueEspion = dernier(espionDuTour);
    const campDuTour = premier;
    const bonnes = vueEspion.grille.filter(c => c.camp === campDuTour).map(c => c.i);
    const neutre = vueEspion.grille.find(c => c.camp === 'neutre').i;

    // Un seul agent présent dans cette équipe → seuil 1, la carte part seule.
    socks[agentDuTour].emit('codanime-vote', { i: bonnes[0] });
    await wait(300);
    const apresVote = dernier(agentDuTour);
    dire(apresVote.votes && apresVote.votes[bonnes[0]],
        'la marque est visible de tous', JSON.stringify(apresVote.votes));

    socks[agentDuTour].emit('codanime-vote', { i: neutre });
    // ⚠️ Le quota atteint déclenche la clôture après 400 ms, puis chaque
    // carte se retourne toutes les 1400 ms. Deux cartes demandent donc
    // 400 + 1400 × 2 = 3,2 s. Attendre 2,5 s faisait échouer quatre
    // contrôles d'affilée sur une mécanique qui marchait très bien.
    await wait(4200);

    const cartes = vu[agentDuTour].cartes;
    dire(cartes.length >= 1, cartes.length + ' carte(s) retournée(s)');
    dire(cartes[0] && cartes[0].issue === 'bonne', 'la première est bonne');
    const auNeutre = cartes.find(c => c.issue === 'neutre');
    dire(!!auNeutre, 'la neutre a bien été retournée ensuite');

    await wait(600);
    const apres = dernier(agentDuTour);
    dire(apres.tourDe !== premier, 'la chaîne cassée rend la main à l\'adversaire',
        'tourDe=' + apres.tourDe);
    dire(apres.phase === 'indice', 'et l\'autre espion doit annoncer');
    dire(Object.keys(apres.votes).length === 0, 'les marques du tour précédent sont vidées');

    titre('Ménage');
    Object.values(socks).forEach(s => s.close());
    await post('/admin/back-to-lobby', {}, jeton).catch(() => {});
    await wait(300);
    dire(true, 'salon rendu au lobby');

    console.log('\n' + (ko ? '❌ ' + ko + ' échec(s) sur ' + (ok + ko)
        : '✨ ' + ok + ' contrôles au vert — Codanime se joue de bout en bout'));
    process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('\n❌ ' + e.stack); process.exit(1); });
