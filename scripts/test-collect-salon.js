// 🎴 Collect, de bout en bout : le salon, les réglages, une vraie partie par
// les sockets, et surtout ce qui NE doit pas circuler.
//
// Le moteur est éprouvé à part (npm run test:collect). Ici on vérifie le
// raccord : que les réglages tiennent, que chacun ne reçoit que sa main, que le
// duel arrive bien chez sa cible, et qu'un départ ne fige pas la table.
//
// À lancer avec le serveur à côté.
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
const check = (l, ok, extra) => { console.log(`${ok ? '✅' : '❌'} ${l}${extra ? ' → ' + extra : ''}`); if (!ok) ko++; };

// Un joueur qui retient tout ce qu'il reçoit
async function joueur(nom) {
    const s = io(BASE, { transports: ['websocket'], forceNew: true });
    const j = { nom, socket: s, etats: [], mains: [], scans: [], refus: [], coupe: false };
    s.on('collect-state', (x) => j.etats.push(x));
    s.on('collect-main', (x) => { j.mains.push(x); j.main = x.main; });
    s.on('collect-scan', (x) => j.scans.push(x));
    s.on('collect-refus', (x) => j.refus.push(x));
    s.on('disconnect', () => { j.coupe = true; });
    await new Promise(r => s.on('connect', r));
    s.emit('register-authenticated', { playerId: nom, username: nom });
    await wait(120);
    s.emit('join-lobby', { playerId: nom, username: nom, code });
    await wait(220);
    return j;
}
const dernier = (j) => j.etats[j.etats.length - 1];

(async () => {
    // ── Le salon ──
    await post('/admin/toggle-game', { lobbyMode: 'collect' });
    check('salon Collect ouvert', !!code, code);

    let e = await etat();
    check('les réglages sont annoncés', !!e.collect, e.collect ? e.collect.main + ' cartes' : 'aucun');
    check('la main par défaut est de 4 — l\'entre-deux', e.collect && e.collect.main === 4);
    check('… soit 2 sets de 3',
        e.collect && e.collect.regles.sets === 2 && e.collect.regles.taille === 3 && e.collect.regles.main === 4,
        e.collect ? `${e.collect.regles.sets}×${e.collect.regles.taille}, main ${e.collect.regles.main}` : '');
    check('les trois tailles de main sont proposées',
        e.collect && e.collect.mainsPossibles.join() === '3,4,5', e.collect && e.collect.mainsPossibles.join(', '));
    check('dix animes par défaut', e.collect && e.collect.animes === 10, e.collect && String(e.collect.animes));
    check('jamais moins de huit au barème',
        e.collect && e.collect.animesPossibles.every(n => n >= 8), e.collect && e.collect.animesPossibles.join(', '));

    // Une main de 3 ne peut pas viser des sets de 3 : il faudrait toute la
    // main d'un seul anime. L'objectif doit donc suivre tout seul.
    const d1 = await post('/admin/collect/set-main', { main: 3 });
    check('la taille de main se change', d1.status === 200 && d1.body.main === 3, d1.body.error || '3');
    check('… et l\'objectif suit tout seul',
        d1.status === 200 && d1.body.regles.taille === 2, d1.body.regles && d1.body.regles.resume);
    const d15 = await post('/admin/collect/set-main', { main: 5 });
    check('à cinq cartes l\'objectif grandit',
        d15.status === 200 && d15.body.regles.sets === 3 && d15.body.regles.taille === 3,
        d15.body.regles && d15.body.regles.resume);
    const d2 = await post('/admin/collect/set-main', { main: 9 });
    check('une main hors barème est refusée', d2.status === 400, 'HTTP ' + d2.status);
    await post('/admin/collect/set-main', { main: 4 });

    const a1 = await post('/admin/collect/set-animes', { animes: 8 });
    check('le nombre d\'animes se change', a1.status === 200 && a1.body.animes === 8, a1.body.error || '8');
    const a2 = await post('/admin/collect/set-animes', { animes: 4 });
    check('quatre animes est refusé — hors barème', a2.status === 400, 'HTTP ' + a2.status);
    await post('/admin/collect/set-animes', { animes: 10 });

    // ── La partie ──
    const A = await joueur('Ayumi');
    const B = await joueur('Bakugo');
    const C = await joueur('Chihiro');
    const tous = [A, B, C];

    const dep = await post('/admin/start-game', {});
    check('la partie démarre', dep.status === 200 && dep.body.success, dep.body.error || 'ok');
    await wait(400);

    check('chacun reçoit l\'état', tous.every(j => j.etats.length), tous.map(j => j.etats.length).join('/'));
    check('chacun reçoit une main de 4', tous.every(j => j.main && j.main.length === 4),
        tous.map(j => (j.main || []).length).join('/'));
    check('dix animes sont en jeu', dernier(A).animes.length === 10);
    check('le marché est servi', dernier(A).marche.length === 5);
    check('un joueur a le tour', tous.map(j => j.nom).includes(dernier(A).tourJoueur), dernier(A).tourJoueur);

    // ── Ce qui ne doit pas circuler ──
    const pub = JSON.stringify(dernier(A));
    const cartesDesAutres = [...B.main, ...C.main].map(c => c.uid);
    check('l\'état public ne porte aucune main',
        cartesDesAutres.every(u => !pub.includes('"' + u + '"')), cartesDesAutres.length + ' cartes cachées');
    check('… il ne donne que des comptes',
        dernier(A).joueurs.every(p => typeof p.cartes === 'number' && !p.main));
    const mienne = JSON.stringify(A.main);
    check('chacun ne reçoit que la sienne',
        A.main.every(c => !JSON.stringify(B.main).includes('"' + c.uid + '"')), mienne.length + ' octets');

    // ── Jouer hors de son tour ──
    const pasSonTour = tous.find(j => j.nom !== dernier(A).tourJoueur);
    pasSonTour.socket.emit('collect-piocher', { uidDefausse: pasSonTour.main[0].uid });
    await wait(250);
    check('jouer hors de son tour est refusé', pasSonTour.refus.length > 0,
        pasSonTour.refus.length ? pasSonTour.refus[0].erreur : 'aucun refus');

    // ── Piocher ──
    let courant = tous.find(j => j.nom === dernier(A).tourJoueur);
    const marcheAvant = dernier(A).marche.map(c => c.uid);
    const lachee = courant.main[0].uid;
    courant.socket.emit('collect-piocher', { uidDefausse: lachee });
    await wait(300);
    check('la pioche passe', dernier(A).tourJoueur !== courant.nom, courant.nom + ' → ' + dernier(A).tourJoueur);
    // La carte lâchée repart au PAQUET, que le client ne voit pas. Ce qu'il
    // peut constater, c'est le renouvellement de fin de tour : la plus ancienne
    // du marché s'en va et une neuve arrive, depuis le paquet.
    check('la carte lâchée ne réapparaît pas au marché', !dernier(A).marche.some(c => c.uid === lachee));
    check('le marché s\'est renouvelé', dernier(A).marche[0].uid === marcheAvant[1],
        marcheAvant[0].slice(0, 6) + ' est partie');
    check('le marché garde ses cinq cartes', dernier(A).marche.length === 5, String(dernier(A).marche.length));
    check('la main garde sa taille', courant.main.length === 4, String(courant.main.length));

    // ── Le scan ne part qu'au demandeur ──
    courant = tous.find(j => j.nom === dernier(A).tourJoueur);
    const vise = tous.find(j => j.nom !== courant.nom);
    const avantEtats = tous.map(j => j.etats.length);
    courant.socket.emit('collect-scanner', { cibleId: vise.nom });
    await wait(300);
    check('le scan revient à celui qui l\'a lancé', courant.scans.length === 1,
        courant.scans.length ? courant.scans[0].main.length + ' cartes vues' : 'rien reçu');
    const autres = tous.filter(j => j !== courant);
    check('… et à personne d\'autre', autres.every(j => j.scans.length === 0));
    const apres = tous.map(j => j.etats.length);
    check('… sans que la main scannée passe par le salon',
        tous.every(j => {
            const recents = j.etats.slice(avantEtats[tous.indexOf(j)]).map(x => JSON.stringify(x)).join('');
            return vise.main.every(c => !recents.includes('"' + c.uid + '"'));
        }), apres.join('/') + ' états reçus');

    // ── Le duel ──
    // On cherche un vol qui ouvrira vraiment un duel : la cible doit avoir la
    // série annoncée. Le scan précédent nous a montré une main, on s'en sert —
    // c'est exactement ce que ferait un joueur.
    courant = tous.find(j => j.nom === dernier(A).tourJoueur);
    let duelOuvert = false;
    for (let essai = 0; essai < 6 && !duelOuvert; essai++) {
        courant = tous.find(j => j.nom === dernier(A).tourJoueur);
        const cible = tous.find(j => j.nom !== courant.nom);
        // on triche pour le test : on lit la main de la cible côté client
        const serie = cible.main.length ? cible.main[0].anime : null;
        const arme = courant.main.find(c => c.anime !== serie);
        if (!serie || !arme) { // rien à tenter, on pioche pour passer la main
            courant.socket.emit('collect-piocher', { uidDefausse: courant.main[0].uid });
            await wait(250);
            continue;
        }
        courant.socket.emit('collect-voler', { cibleId: cible.nom, anime: serie, uidAttaque: arme.uid });
        await wait(300);
        const st = dernier(A);
        if (st.duel) {
            duelOuvert = true;
            check('le vol ouvre un duel', true, courant.nom + ' → ' + cible.nom + ' sur ' + serie);
            check('la table voit le duel et sa série', st.duel.anime === serie && st.duel.cible === cible.nom);
            // le secret de la carte d'attaque est tout l'intérêt du vol
            const vu = JSON.stringify(st) + JSON.stringify(cible.etats.slice(-3));
            check('… mais jamais la carte d\'attaque', !vu.includes('"' + arme.uid + '"'), arme.nom);

            const parAutre = tous.find(j => j !== cible);
            parAutre.socket.emit('collect-defendre', { uidDefense: parAutre.main[0].uid });
            await wait(250);
            check('un autre que la cible ne peut pas défendre', !!dernier(A).duel);

            const def = cible.main.find(c => c.anime === serie);
            cible.socket.emit('collect-defendre', { uidDefense: def.uid });
            await wait(350);
            check('la cible tranche le duel', !dernier(A).duel);
            check('… et le tour repart', dernier(A).tourJoueur !== courant.nom, dernier(A).tourJoueur);
        }
    }
    check('un duel a bien pu être joué', duelOuvert, duelOuvert ? 'oui' : 'aucune occasion en six essais');

    // ── La reprise après un rafraîchissement ──
    // La main ne part QUE sur sa propre socket : rien ne la rejoue tout seul.
    // Sans « collect-get-state » au retour, le joueur revenait devant une table
    // dont il ne voyait plus ses propres cartes.
    {
        const revenant = tous.find(j => j.nom !== dernier(A).tourJoueur);
        const avant = revenant.main.map(c => c.uid).join();
        revenant.socket.close();
        await wait(350);

        const repris = await joueur(revenant.nom);
        check('en revenant, rien ne vient tout seul', !repris.main, repris.main ? repris.main.length + ' cartes' : 'aucune main');
        repris.socket.emit('collect-get-state');
        await wait(350);
        check('la main est retrouvée à l\'identique',
            repris.main && repris.main.map(c => c.uid).join() === avant,
            repris.main ? repris.main.length + ' cartes' : 'rien');
        check('… et la table avec', dernier(repris) && dernier(repris).marche.length === 5,
            dernier(repris) ? dernier(repris).marche.length + ' au marché' : 'rien');
        tous[tous.indexOf(revenant)] = repris;
    }

    // ── Un départ ne fige pas la table ──
    const partant = tous.find(j => j.nom === dernier(A).tourJoueur);
    const restants = tous.filter(j => j !== partant);
    partant.socket.emit('leave-lobby', {});
    await wait(500);
    check('la table repart sans celui qui est parti',
        dernier(restants[0]).tourJoueur !== partant.nom, dernier(restants[0]).tourJoueur);
    check('il n\'est plus à la table',
        !dernier(restants[0]).joueurs.some(p => p.playerId === partant.nom));

    // ── Ménage ──
    for (const j of tous) j.socket.close();
    await post('/admin/toggle-game', {});
    const fin = await etat();
    check('le salon se referme', !fin || !fin.isActive || fin.error, 'ok');

    console.log(ko ? `\n💥 ${ko} contrôle(s) en échec` : '\n✨ Collect tient dans un salon, et ne montre aucune main');
    process.exit(ko ? 1 : 0);
})().catch(e => { console.error('💥', e); process.exit(1); });
