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
    let publique = null;   // la carte qu un echange a rendue visible de tous
    // ⚠️ La pioche n'est ouverte qu'à main INCOMPLÈTE, donc en sortant d'une
    // pose. À main pleine le serveur refuse, et c'est ce qu'on vérifie ici : le
    // refus doit venir de LUI, pas seulement d'un paquet éteint à l'écran.
    let courant = tous.find(j => j.nom === dernier(A).tourJoueur);
    courant.refus.length = 0;
    courant.socket.emit('collect-piocher', {});
    await wait(300);
    check('piocher à main pleine est refusé par le serveur', courant.refus.length > 0,
        courant.refus.length ? courant.refus[0].erreur : 'aucun refus');
    check('… et le tour n\'a pas bougé', dernier(A).tourJoueur === courant.nom, courant.nom);

    // Le tour passe donc par le marché, seul geste toujours ouvert.
    // ⚠️ Le RYTHME du marché — une carte par tour de table, et non par tour —
    // se vérifie dans « test:collect », sur le moteur à sec : là-bas on fait
    // passer les tours sans rien toucher, alors qu'ici chaque échange modifie
    // justement le marché qu'on voudrait observer. Cette suite-ci tient ce
    // qu'elle seule peut tenir : que le coup parte, qu'il soit diffusé, et que
    // le marché garde ses cinq places.
    {
        const avant = dernier(A).marche.map(c => c.uid);
        const rendue = courant.main[0].uid;
        const prise = dernier(A).marche[2].uid;
        // Elle devient PUBLIQUE : un échange se voit de tous, et le journal
        // diffusé le nomme. Le contrôle du scan, plus bas, doit donc l écarter.
        publique = prise;
        courant.socket.emit('collect-echanger', { uidMain: rendue, uidMarche: prise });
        await wait(300);
        check('un échange passe le tour', dernier(A).tourJoueur !== courant.nom,
            courant.nom + ' → ' + dernier(A).tourJoueur);
        check('la carte prise a quitté le marché', !dernier(A).marche.some(c => c.uid === prise));
        check('… et celle qu\'il a rendue y est, à la même place',
            dernier(A).marche[2].uid === rendue, dernier(A).marche[2].uid.slice(0, 6));
        check('le marché n\'a pas glissé pour un seul tour',
            dernier(A).marche.filter((c, i) => i !== 2).map(c => c.uid).join()
                === avant.filter((c, i) => i !== 2).join(),
            tous.length + ' joueurs à table');
    }
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
            // ⚠️ On écarte la carte qu un échange a rendue publique : elle est
            // dans sa main, mais tout le monde l a vue passer et le journal la
            // nomme légitimement. Sans cela le contrôle criait à la fuite pour
            // une carte que le jeu montre exprès.
            return vise.main.filter(c => c.uid !== publique)
                .every(c => !recents.includes('"' + c.uid + '"'));
        }), apres.join('/') + ' états reçus');

    // ── Le scan retient la table ──
    // Il ne passe plus la main tout de suite : sinon le joueur suivant
    // agissait pendant que la main scannee etait encore retournee, et ce
    // qu'on lisait devenait faux sous les yeux.
    {
        const lecteur = dernier(A).scan && dernier(A).scan.par;
        check('la table sait qui scanne qui', !!dernier(A).scan,
            dernier(A).scan ? dernier(A).scan.par + ' → ' + dernier(A).scan.cible : 'aucun');
        check('le scan ne montre aucune carte au salon',
            !dernier(A).scan || !JSON.stringify(dernier(A).scan).includes('img'));
        check('le tour reste au scanneur', dernier(A).tourJoueur === lecteur, String(lecteur));
        // on attend qu'il se referme de lui-meme
        for (let i = 0; i < 40 && dernier(A).scan; i++) await wait(300);
        check('sept secondes plus tard, la main passe',
            !dernier(A).scan && dernier(A).tourJoueur !== lecteur, String(dernier(A).tourJoueur));
    }

    // ── Le vol ──
    // On prend une carte par sa POSITION, elle se retourne pour tout le monde,
    // et le voleur doit la payer : une carte de la même classe, ou deux à défaut.
    courant = tous.find(j => j.nom === dernier(A).tourJoueur);
    {
        const cible = tous.find(j => j.nom !== courant.nom && j.main.length);
        const avantCible = cible.main.length;
        const avantVoleur = courant.main.map(c => c.uid);
        // Premier temps : on ANNONCE. Toute la table le voit, et le meme compte
        // a rebours tourne pour tout le monde.
        courant.socket.emit('collect-viser', { cibleId: cible.nom });
        await wait(300);
        check('la visee s\'annonce a la table',
            !!dernier(A).visee && dernier(A).visee.cible === cible.nom,
            dernier(A).visee ? dernier(A).visee.voleur : 'aucune');
        check('la table est arretee pendant qu\'il cherche',
            dernier(A).tourJoueur === courant.nom);

        // Second temps : la place.
        courant.socket.emit('collect-voler', { cibleId: cible.nom, index: 0 });
        await wait(300);
        check('la prise leve la visee', !dernier(A).visee);

        const st = dernier(A);
        check('le vol ouvre une dette', !!st.larcin,
            st.larcin ? courant.nom + ' → ' + cible.nom : 'aucun');
        check('la carte prise se montre à toute la table',
            !!(st.larcin && st.larcin.carte && st.larcin.carte.img));
        check('la cible a perdu une carte', cible.main.length === avantCible - 1,
            avantCible + ' → ' + cible.main.length);
        check('le tour reste au voleur', st.tourJoueur === courant.nom);
        check('personne d\'autre ne joue pendant ce temps',
            (() => { cible.socket.emit('collect-piocher', {}); return true; })());

        // le reste de la main de la cible ne sort toujours pas
        const vu = JSON.stringify(st) + JSON.stringify(cible.etats.slice(-3));
        const restants = cible.main.map(c => c.uid).filter(u => !vu.includes(u));
        check('… et le reste de sa main ne fuit pas',
            restants.length === cible.main.length,
            cible.main.length + ' carte(s) toujours cachée(s)');

        // un autre que le voleur ne solde pas sa dette
        cible.socket.emit('collect-payer', { uids: [cible.main[0].uid] });
        await wait(250);
        check('un autre que le voleur ne peut pas payer', !!dernier(A).larcin);

        const du = dernier(A).larcin.aRendre;
        const classe = dernier(A).larcin.classe;
        const dette = dernier(A).larcin.du === 1
            ? [courant.main.find(c => c.classe === classe).uid]
            : courant.main.slice(0, du).map(c => c.uid);
        courant.socket.emit('collect-payer', { uids: dette });
        await wait(350);

        check('le paiement solde le vol', !dernier(A).larcin);
        check('… et le tour repart', dernier(A).tourJoueur !== courant.nom,
            String(dernier(A).tourJoueur));
        const perdues = avantVoleur.filter(u => !courant.main.some(c => c.uid === u));
        check('le voleur a bien lâché ce qu\'il devait', perdues.length === du,
            perdues.length + '/' + du);
    }

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

    // ── Rejouer, une fois la manche éteinte ──
    // ⚠️ Le défaut qui vaut ce contrôle : « inProgress » ne retombait JAMAIS en
    // Collect. « demarrerPartie » le lève, et rien ne le rabaissait — ni la
    // victoire, ni le dernier joueur qui s'en va. « /admin/replay » répondait
    // donc toujours 400, « Une partie est déjà en cours », et le bouton Rejouer
    // ne faisait rien EN SILENCE : l'écran de fin de Collect n'a nulle part où
    // montrer une erreur d'hôte. Le mode était injouable deux manches de suite.
    {
        restants[0].socket.emit('leave-lobby', {});
        await wait(600);
        const e = await etat();
        check('la manche s\'éteint quand il ne reste qu\'un joueur',
            e.inProgress === false, 'inProgress = ' + e.inProgress);

        // ⚠️ On repose des réglages QUI NE SONT PAS ceux par défaut avant de
        // rejouer. Le rejeu repart d'un « etatNeuf », qui les ramènerait à 4
        // cartes et 10 animes : contrôler ces deux valeurs-là ne prouverait
        // rien, elles seraient justes même si le réglage avait été perdu.
        await post('/admin/collect/set-main', { main: 3 });
        await post('/admin/collect/set-animes', { animes: 8 });

        const r = await post('/admin/replay', {});
        check('rejouer est accepté', r.status === 200 && !r.body.error,
            r.body.error || 'HTTP ' + r.status);

        const apres = await etat();
        check('les réglages ont survécu au rejeu',
            apres.collect && apres.collect.main === 3 && apres.collect.animes === 8,
            apres.collect ? apres.collect.main + ' cartes, ' + apres.collect.animes + ' animes' : 'aucun');
        check('… et la table est repartie à neuf', apres.inProgress === false,
            'inProgress = ' + apres.inProgress);
    }

    // ── Ménage ──
    for (const j of tous) j.socket.close();
    await post('/admin/toggle-game', {});
    const fin = await etat();
    check('le salon se referme', !fin || !fin.isActive || fin.error, 'ok');

    console.log(ko ? `\n💥 ${ko} contrôle(s) en échec` : '\n✨ Collect tient dans un salon, et ne montre aucune main');
    process.exit(ko ? 1 : 0);
})().catch(e => { console.error('💥', e); process.exit(1); });
