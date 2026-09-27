// BombAnime — la mèche continue.
//
// Ce qui compte, et qu'aucune autre suite ne voit : la mèche ne repart PAS
// quand quelqu'un répond juste. C'est toute la différence avec le mode par
// tour, et c'est invisible de l'extérieur — un salon qui a l'air de bien
// tourner peut très bien avoir réarmé son minuteur en douce à chaque réponse.
//
// On le prouve en mesurant : on fait répondre correctement plusieurs fois de
// suite, et l'on vérifie que le temps annoncé DESCEND d'une réponse à l'autre
// au lieu de remonter.
const { io } = require('socket.io-client');
const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
const wait = ms => new Promise(r => setTimeout(r, ms));

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
const check = (l, ok, extra) => {
    console.log(`${ok ? '✅' : '❌'} ${l}${extra !== undefined ? ' → ' + extra : ''}`);
    if (!ok) ko++;
};

(async () => {
    // ═══════════════════════════════════════════════════════════════
    // 1. Le réglage
    // ═══════════════════════════════════════════════════════════════
    console.log('── le réglage ──');
    await post('/admin/toggle-game', { lobbyMode: 'bombanime' });
    await post('/admin/bombanime/update-serie', { serie: 'Naruto' });
    await post('/admin/bombanime/set-lives', { lives: 2 });

    let e = await etat();
    check('par défaut, la mèche est « par tour »', e.bombanime.meche === 'tour', e.bombanime.meche);

    let r = await post('/admin/bombanime/set-meche', { meche: 'nimporte' });
    check('une mèche inventée est refusée', r.status === 400, 'HTTP ' + r.status);

    r = await post('/admin/bombanime/set-meche', { meche: 'continue', b: 99 });
    check('un B hors bornes est refusé', r.status === 400, 'HTTP ' + r.status);
    e = await etat();
    check('et rien n a bougé', e.bombanime.meche === 'tour', e.bombanime.meche);

    r = await post('/admin/bombanime/set-meche', { meche: 'continue', b: 2.7 });
    check('la mèche passe en continue', r.body.meche === 'continue', r.body.meche);
    check('le B est ramené au demi-cran', r.body.mecheB === 2.5, r.body.mecheB);

    // Un B bas : la manche doit tenir dans la durée de la suite.
    await post('/admin/bombanime/set-meche', { b: 2 });
    console.log('salon ' + code + '\n');

    // ═══════════════════════════════════════════════════════════════
    // 2. Deux joueurs, et la mèche qui ne repart pas
    // ═══════════════════════════════════════════════════════════════
    console.log('── la manche ──');
    const socks = [];
    for (const [id, nom] of [['j1', 'Un'], ['j2', 'Deux']]) {
        const s = io(BASE);
        await new Promise(res => s.on('connect', res));
        s.emit('register-authenticated', { playerId: id, username: nom });
        await wait(120);
        s.emit('join-lobby', { playerId: id, username: nom, code });
        await wait(250);
        socks.push({ id, nom, s });
    }

    // Ce que chacun voit du tour en cours.
    let tour = null, explosions = [], finPartie = null, total = null;
    for (const j of socks) {
        j.s.on('bombanime-turn-start', d => { tour = d; if (d.mecheTotal) total = d.mecheTotal; });
        j.s.on('bombanime-explosion', d => explosions.push(d));
        j.s.on('bombanime-game-end', d => { finPartie = d; });
    }

    await post('/admin/start-game', {});
    // L'intro dure ~3 s avant le premier tour.
    await wait(4200);

    check('la manche a démarré', !!tour, tour && tour.currentPlayerUsername);
    check('le serveur annonce la mèche continue', tour && tour.meche === 'continue', tour && tour.meche);
    // 2 joueurs × B 2 × aléa → sous le plancher, donc exactement le plancher.
    check('la durée tombe sur le plancher de 12 s', total >= 11.9 && total <= 12.1, total && total.toFixed(1) + ' s');

    // ⚠️ Le cœur de la suite. On répond juste, plusieurs fois, et l'on relève
    // le temps restant à chaque passage : il doit DESCENDRE.
    const NOMS = ['Naruto', 'Sasuke', 'Sakura', 'Kakashi', 'Hinata', 'Shikamaru'];
    const releves = [];
    for (let i = 0; i < NOMS.length; i++) {
        const porteur = socks.find(j => j.id === (tour && tour.currentPlayerId));
        if (!porteur) break;
        const avant = await etat();
        releves.push(avant.bombanime.timeRemaining);
        porteur.s.emit('bombanime-submit-name', { name: NOMS[i] });
        await wait(700);
    }

    console.log('   relevés : ' + releves.map(x => x.toFixed(1)).join(' → '));
    let descend = releves.length >= 4;
    for (let i = 1; i < releves.length; i++) {
        if (releves[i] >= releves[i - 1]) descend = false;
    }
    check('⚠️ la mèche NE REPART PAS après une bonne réponse', descend,
          releves.length + ' relevés, tous décroissants : ' + descend);

    const consomme = releves.length >= 2 ? (releves[0] - releves[releves.length - 1]) : 0;
    check('elle a bien brûlé pendant ces réponses', consomme > 2, consomme.toFixed(1) + ' s consommées');

    // ═══════════════════════════════════════════════════════════════
    // 3. Elle explose sur celui qui la tient, et une neuve est tirée
    // ═══════════════════════════════════════════════════════════════
    console.log('\n── l explosion ──');
    const porteurAvant = tour && tour.currentPlayerId;
    // On laisse filer ce qu il reste, sans répondre.
    const reste = (await etat()).bombanime.timeRemaining;
    await wait(reste * 1000 + 1500);

    check('la bombe a fini par exploser', explosions.length >= 1, explosions.length + ' explosion(s)');
    check('sur celui qui la tenait', explosions[0] && explosions[0].playerId === porteurAvant,
          explosions[0] && explosions[0].playerUsername);

    if (!finPartie) {
        await wait(400);
        const apres = await etat();
        check('une mèche neuve est tirée pour la manche suivante',
              apres.bombanime.timeRemaining > 5, apres.bombanime.timeRemaining.toFixed(1) + ' s');
    }

    // ═══════════════════════════════════════════════════════════════
    // 2 bis. Garder la bombe plus longtemps que le minuteur de tour
    // ═══════════════════════════════════════════════════════════════
    // ⚠️ C'est LA stratégie du mode : on attend le dernier moment pour refiler
    // la bombe. Le serveur refusait toute réponse passée la durée du tour (8 s
    // par défaut) alors que la mèche en avait encore : l'envoi était ignoré
    // sans rien à l'écran pour le dire.
    console.log('\n── garder la bombe longtemps ──');
    {
        // ⚠️ Un salon NEUF : avec le jeton du précédent, /admin/toggle-game
        // refermerait celui-là au lieu d en ouvrir un autre.
        jeton = ''; code = '';
        // Une mèche large, pour avoir de la marge devant le minuteur de tour.
        await post('/admin/toggle-game', { lobbyMode: 'bombanime' });
        const salonLong = code, jetonLong = jeton;
        await post('/admin/bombanime/update-serie', { serie: 'Naruto' });
        await post('/admin/bombanime/set-meche', { meche: 'continue', b: 5 });
        await post('/admin/bombanime/set-timer', { timer: 5 });

        // ⚠️ CINQ joueurs, et non deux : la mèche vaut « joueurs × B », il en
        // faut donc assez pour qu elle dépasse largement les neuf secondes
        // d attente. À deux, une manche se terminait pendant le test et la
        // suivante repartait — on croyait mesurer une longue possession alors
        // que le tour avait recommencé entre-temps.
        const bs = [];
        for (const [id, nom] of [['k1', 'Lent'], ['k2', 'Alpha'], ['k3', 'Beta'], ['k4', 'Gamma'], ['k5', 'Delta']]) {
            const s = io(BASE);
            await new Promise(res => s.on('connect', res));
            s.emit('register-authenticated', { playerId: id, username: nom });
            await wait(120);
            s.emit('join-lobby', { playerId: id, username: nom, code: salonLong });
            await wait(250);
            bs.push({ id, nom, s });
        }

        let tourL = null, accepte = false, refus = null, boum = 0;
        for (const j of bs) {
            j.s.on('bombanime-turn-start', d => { tourL = d; });
            j.s.on('bombanime-name-accepted', () => { accepte = true; });
            j.s.on('bombanime-name-rejected', d => { refus = d; });
            j.s.on('bombanime-explosion', () => { boum++; });
        }

        jeton = jetonLong; code = salonLong;
        await post('/admin/start-game', {});
        await wait(6500);

        const e0 = await etat();
        check('la mèche dépasse le minuteur de tour',
              e0.bombanime.timeRemaining > e0.bombanime.timer,
              e0.bombanime.timeRemaining.toFixed(1) + ' s > ' + e0.bombanime.timer + ' s');

        // On garde la bombe bien plus longtemps que le minuteur, sans répondre.
        const porteur = bs.find(j => j.id === (tourL && tourL.currentPlayerId));
        const boumAvant = boum;
        await wait(9000);

        const avant = (await etat()).bombanime.timeRemaining;
        check('aucune manche ne s est terminée entre-temps', boum === boumAvant,
              (boum - boumAvant) + ' explosion(s)');
        check('la mèche brûle encore après 9 s de possession', avant > 1.5, avant.toFixed(1) + ' s');
        check('c est toujours le même joueur qui la tient',
              porteur && tourL && tourL.currentPlayerId === porteur.id,
              tourL && tourL.currentPlayerUsername);

        if (porteur) porteur.s.emit('bombanime-submit-name', { name: 'Naruto' });
        await wait(700);
        check('⚠️ la réponse passe malgré les 9 s de possession',
              accepte && !refus, refus ? 'refusée : ' + refus.reason : 'acceptée');
        for (const j of bs) j.s.close();
        await wait(200);
        await post('/admin/toggle-game', { lobbyMode: 'bombanime' });
        jeton = ''; code = '';
    }


    // ═══════════════════════════════════════════════════════════════
    // 4. Le mode par tour n a pas changé
    // ═══════════════════════════════════════════════════════════════
    console.log('\n── et le mode d avant ──');
    for (const j of socks) j.s.close();
    await wait(300);

    // ⚠️ Un SECOND salon, et non un « toggle » sur celui-ci : appeler
    // /admin/toggle-game avec le mode DÉJÀ ouvert le REFERME. La première
    // version croyait le rebasculer et interrogeait ensuite un salon disparu.
    jeton = ''; code = '';
    await post('/admin/toggle-game', { lobbyMode: 'bombanime' });
    await post('/admin/bombanime/set-meche', { meche: 'tour' });
    e = await etat();
    check('on revient en « par tour »', e.bombanime.meche === 'tour', e.bombanime.meche);
    check('et le minuteur de tour reparaît', e.bombanime.timeRemaining === e.bombanime.timer,
          e.bombanime.timeRemaining + ' = ' + e.bombanime.timer);

    await post('/admin/toggle-game', { lobbyMode: 'bombanime' });
    console.log(ko ? `\n❌ ${ko} échec(s)` : '\n✨ La mèche continue brûle sans repartir');
    process.exit(ko ? 1 : 0);
})().catch(e => { console.error('💥', e); process.exit(1); });
