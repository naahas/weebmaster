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

    // ⚠️ `/game/state` s'ouvre avec le SEUL code du salon : un curieux qui
    // le lit ne doit y trouver ni la grille, ni un camp, ni le piège.
    //
    // ⚠️ Le contrôle cherchait la chaîne « assassin », ce qui a fini par
    // sonner à tort le jour où le RÉGLAGE du piège est arrivé — un booléen
    // nommé comme la carte. Il porte maintenant sur ce qui fuit vraiment :
    // la grille et le mot « camp ». Le réglage s'appelle `piege`, la carte
    // reste `assassin`, et les deux ne se confondent plus.
    const etat = await (await fetch(BASE + '/game/state?code=' + code)).json();
    const brut = JSON.stringify(etat.codanime || {});
    dire(!brut.includes('camp') && !brut.includes('grille') && !brut.includes('assassin'),
        '/game/state, qui s\'ouvre avec le seul code du salon, ne porte pas la clef');
    dire(typeof (etat.codanime || {}).piege === 'boolean',
        'il porte bien le RÉGLAGE du piège, qui n\'est pas un secret');

    titre('Les rôles, tenus côté serveur');
    const premier = eA.tourDe;
    const espionDuTour = premier === 'A' ? 'e1' : 'e2';
    const agentDuTour = premier === 'A' ? 'a1' : 'a2';
    const agentAdverse = premier === 'A' ? 'a2' : 'a1';

    socks[agentDuTour].emit('codanime-indice', { nombre: 2, mot: 'sabre' });
    await wait(250);
    dire(vu[agentDuTour].refus.some(r => r.raison === 'pas-espion'),
        'un agent ne peut pas annoncer à la place de son espion');

    socks[espionDuTour].emit('codanime-indice', { nombre: 99, mot: 'sabre' });
    await wait(250);
    dire(vu[espionDuTour].refus.some(r => r.raison === 'trop-grand'),
        'un nombre au-delà du plafond est refusé');

    // ⚠️ Le MOT est exigé. Un indice sans mot laisserait l'équipe deviner
    // sans rien, ce qui est pire qu'un tour passé — et c'est exactement ce
    // qu'envoyait un vieux client, du temps où le mot se disait à la voix.
    socks[espionDuTour].emit('codanime-indice', { nombre: 2 });
    await wait(250);
    dire(vu[espionDuTour].refus.some(r => r.raison === 'mot-vide'),
        'un indice sans mot est refusé');
    socks[espionDuTour].emit('codanime-indice', { nombre: 2, mot: '   ' });
    await wait(250);
    dire(vu[espionDuTour].refus.filter(r => r.raison === 'mot-vide').length >= 2,
        'et un mot fait d\'espaces aussi');

    // ⚠️ UN SEUL MOT, ET RIEN QUE DES LETTRES. Le serveur ne fait pas que
    // détourer : il garde le PREMIER mot et jette tout ce qui n'est ni
    // lettre ni chiffre. Un champ libre rediffusé à huit personnes est une
    // messagerie s'il n'est pas tenu — et « lame tranchante » donnerait
    // deux indices pour le prix d'un.
    socks[espionDuTour].emit('codanime-indice', { nombre: 2, mot: '  la!me\n\n   tranchante  ' });
    await wait(300);
    dire(dernier(espionDuTour).phase === 'vote', 'l\'indice ouvre la phase de vote');
    dire(dernier(espionDuTour).indice.nombre === 2, 'le nombre est transmis');
    dire(dernier(espionDuTour).indice.mot === 'lame',
        'le mot est transmis, réduit au premier et sans ponctuation');
    // Et il part à TOUT LE MONDE, camp adverse compris — comme dans le vrai jeu.
    dire(dernier(agentAdverse).indice && dernier(agentAdverse).indice.mot === 'lame',
        'et le camp adverse le lit aussi');

    socks[espionDuTour].emit('codanime-vote', { i: 0 });
    await wait(200);
    dire(vu[espionDuTour].refus.some(r => r.raison === 'espion-ne-vote-pas'),
        'l\'espion ne peut pas marquer de carte — il désignerait du doigt');

    socks[agentAdverse].emit('codanime-vote', { i: 0 });
    await wait(200);
    dire(vu[agentAdverse].refus.some(r => r.raison === 'pas-ton-tour'),
        'un agent de l\'autre équipe ne vote pas pendant ce tour');

    titre('Une carte à la fois, et n + 1 coups');
    const vueEspion = dernier(espionDuTour);
    const campDuTour = premier;
    const bonnes = vueEspion.grille.filter(c => c.camp === campDuTour).map(c => c.i);
    const neutre = vueEspion.grille.find(c => c.camp === 'neutre').i;

    // ⚠️ UN SEUL agent présent dans ce camp → l'unanimité vaut 1, la carte
    // part donc à la première voix. C'est voulu : l'unanimité se compte sur
    // les PRÉSENTS, pas sur les sièges.
    dire(dernier(agentDuTour).seuil === 1,
        'à un seul agent présent, l\'unanimité vaut une voix', 'seuil=' + dernier(agentDuTour).seuil);
    // L'indice annonce 2 → trois coups, le troisième étant le rattrapage.
    dire(dernier(agentDuTour).coups === 3,
        'un indice à 2 ouvre TROIS coups (n + 1)', 'coups=' + dernier(agentDuTour).coups);

    socks[agentDuTour].emit('codanime-vote', { i: bonnes[0] });
    await wait(250);
    const apresVote = vu[agentDuTour].etats.slice(-3).find(e => e.votes && e.votes[bonnes[0]]);
    dire(!!apresVote, 'la marque est visible de tous');

    // ⚠️ La carte part SEULE, sans clôture : la révélation suit l'unanimité
    // d'un battement, et le tour CONTINUE puisqu'elle était bonne.
    await wait(1900);
    let cartes = vu[agentDuTour].cartes;
    dire(cartes.length === 1, 'une seule carte s\'est retournée', cartes.length + ' vue(s)');
    dire(cartes[0] && cartes[0].issue === 'bonne', 'et elle est bonne');
    const enCours = dernier(agentDuTour);
    dire(enCours.phase === 'vote' && enCours.tourDe === premier,
        'le tour continue : la main NE PASSE PAS après une bonne carte',
        enCours.phase + '/' + enCours.tourDe);
    dire(enCours.coups === 2, 'et il reste deux coups', 'coups=' + enCours.coups);
    dire(Object.keys(enCours.votes).length === 0,
        'les voix du coup précédent sont vidées — on repart d\'une carte vierge');

    // ⚠️ UNE SEULE ERREUR ARRÊTE LE TOUR, et les coups qui restaient sont
    // perdus. C'est tout le sel du mode : il restait deux coups.
    socks[agentDuTour].emit('codanime-vote', { i: neutre });
    await wait(2200);
    cartes = vu[agentDuTour].cartes;
    dire(cartes.length === 2, 'la neutre s\'est retournée à son tour', cartes.length + ' vue(s)');
    dire(cartes[1] && cartes[1].issue === 'neutre', 'et elle est annoncée comme neutre');

    const apres = dernier(agentDuTour);
    dire(apres.tourDe !== premier, 'une erreur rend la main à l\'adversaire SUR-LE-CHAMP',
        'tourDe=' + apres.tourDe);
    dire(apres.phase === 'indice', 'et l\'autre espion doit annoncer');
    dire(Object.keys(apres.votes).length === 0, 'les marques du tour précédent sont vidées');

    titre('Le 0, l\'∞, et « on s\'arrête »');
    const espion2 = apres.tourDe === 'A' ? 'e1' : 'e2';
    const agent2 = apres.tourDe === 'A' ? 'a1' : 'a2';

    // ⚠️ 0 et ∞ sont RECEVABLES et donnent des coups ILLIMITÉS. Le serveur
    // renvoie -1 pour l'infini : `Infinity` se sérialise en `null` à travers
    // JSON, et le client recevrait un indice sans nombre.
    socks[espion2].emit('codanime-indice', { nombre: 0, mot: 'danger' });
    await wait(350);
    dire(dernier(agent2).indice && dernier(agent2).indice.nombre === 0,
        '« 0 » est une annonce recevable — « évitez tout ça »');
    dire(dernier(agent2).coups === -1,
        'et il donne des coups ILLIMITÉS, portés par −1', 'coups=' + dernier(agent2).coups);

    // Le bouton d'arrêt : à l'unanimité aussi. Un seul agent présent → une
    // voix suffit, et la main passe sans qu'aucune carte ne soit retournée.
    const avantArret = vu[agent2].cartes.length;
    socks[agent2].emit('codanime-passer');
    await wait(500);
    const apresArret = dernier(agent2);
    dire(vu[agent2].cartes.length === avantArret,
        '« on s\'arrête » ne retourne aucune carte');
    dire(apresArret.tourDe !== apres.tourDe, 'mais il rend bien la main',
        'tourDe=' + apresArret.tourDe);

    titre('L\'assassin, et le temps qu\'on lui laisse');
    // ⚠️ LA DERNIÈRE CARTE A DROIT À SON TEMPS. La fin partait à l'instant où
    // la carte se retournait : on passait au classement sans avoir vu
    // l'assassin noircir, c'est-à-dire qu'on ratait le seul moment où le mode
    // fait peur. On mesure ici le délai réel entre les deux événements.
    const espion3 = apresArret.tourDe === 'A' ? 'e1' : 'e2';
    const agent3 = apresArret.tourDe === 'A' ? 'a1' : 'a2';
    const vueE3 = dernier(espion3);
    const assassin = vueE3.grille.find(c => c.camp === 'assassin');

    if (!assassin) {
        dire(false, 'le plateau porte un assassin (piège allumé)');
    } else {
        socks[espion3].emit('codanime-indice', { nombre: 1, mot: 'piege' });
        await wait(350);
        let tCarte = 0;
        const avant = vu[agent3].cartes.length;
        socks[agent3].emit('codanime-vote', { i: assassin.i });

        // On attend la carte, puis la fin, en relevant les deux instants.
        for (let k = 0; k < 60 && !vu[agent3].fin; k++) {
            if (!tCarte && vu[agent3].cartes.length > avant) tCarte = Date.now();
            await wait(100);
        }
        const tFin = Date.now();
        const derniereCarte = vu[agent3].cartes[vu[agent3].cartes.length - 1];
        dire(derniereCarte && derniereCarte.issue === 'assassin',
            'l\'assassin est bien annoncé comme tel');
        dire(!!vu[agent3].fin, 'et la partie se termine');
        const pause = tCarte ? tFin - tCarte : 0;
        // ⚠️ Au moins une seconde et demie : le balayage dure une demi-seconde,
        // et il faut ce qui reste pour lire la couleur. Mesuré, pas supposé.
        dire(pause >= 1500, 'la fin attend ' + pause + ' ms après la carte — pas d\'à-coup',
            pause + ' ms');
        dire(vu[agent3].fin && vu[agent3].fin.raison === 'assassin',
            'et la raison voyage jusqu\'au podium');
    }

    titre('Ménage');
    Object.values(socks).forEach(s => s.close());
    await post('/admin/back-to-lobby', {}, jeton).catch(() => {});
    await wait(300);
    dire(true, 'salon rendu au lobby');

    console.log('\n' + (ko ? '❌ ' + ko + ' échec(s) sur ' + (ok + ko)
        : '✨ ' + ok + ' contrôles au vert — Codanime se joue de bout en bout'));
    process.exit(ko ? 1 : 0);
})().catch((e) => { console.log('\n❌ ' + e.stack); process.exit(1); });
