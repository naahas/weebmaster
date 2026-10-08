// Les portes de service du mode Classique.
//
// Cette suite est née d'une mesure temporaire — le Classique s'ouvrait sous
// mot de passe — et elle lui a survécu, parce que ce qu'elle garde n'avait
// jamais été le mot de passe. Deux portes, toutes deux encore ouvertes sans
// elle :
//
//   • LES MODES INVENTÉS. `/admin/start-game` aiguille sur les modes qu'il
//     connaît et retombe SINON sur le quiz. Un salon ouvert avec
//     `lobbyMode: "pizza"` démarrait donc un vrai Classique, en échappant à
//     tout contrôle posé sur le nom du mode. Seule la liste blanche de
//     `/admin/toggle-game` ferme ça.
//
//   • `/admin/set-teams`. C'est le réglage « Format » du quiz, et il ÉCRIT
//     `lobbyMode`. Il ne refusait que BombAnime : ouvrir un salon Rush,
//     Collect ou Ascension puis l'appeler le convertissait en Classique.
//     L'hôte a un jeton valable sur TOUTES les routes /admin de son salon,
//     donc une seule route qui écrit `lobbyMode` suffit à tout défaire.
//
// ⚠️ La leçon vaut au-delà : une liste NOIRE ne couvre que les modes qui
// existaient le jour où on l'a écrite. Les deux gardes sont des listes
// blanches, et ils doivent le rester.
const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);

const poste = (chemin, corps, jeton) => fetch(BASE + chemin, {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' },
                           jeton ? { 'X-Host-Token': jeton } : {}),
    body: JSON.stringify(corps || {}),
}).then(r => r.json().then(j => ({ status: r.status, body: j })).catch(() => ({ status: r.status, body: {} })));

const etat = code => fetch(BASE + '/game/state?code=' + code).then(r => r.json());
const salons = () => fetch(BASE + '/api/home-stats').then(r => r.json()).then(s => s.activeRooms);

(async () => {
    let ko = 0;
    const check = (l, ok, extra) => {
        console.log(`${ok ? '✅' : '❌'} ${l}${extra ? '  → ' + extra : ''}`);
        if (!ko && !ok) { /* rien : on compte juste */ }
        if (!ok) ko++;
    };

    console.log('── Le Classique s\'ouvre librement ──');
    const libre = await poste('/admin/toggle-game', { lobbyMode: 'classic' });
    check('Classique : ouvert sans mot de passe', libre.body.isActive === true,
          'HTTP ' + libre.status);
    if (libre.body.hostToken) {
        const m = (await etat(libre.body.roomCode)).lobbyMode;
        check('le salon est bien en Classique', m === 'classic', 'mode = ' + m);
        // Et là, set-teams DOIT marcher : c'est son rôle.
        const r = await poste('/admin/set-teams', { enabled: true }, libre.body.hostToken);
        const m2 = (await etat(libre.body.roomCode)).lobbyMode;
        check('set-teams fonctionne dans un vrai salon Classique',
              r.status === 200 && m2 === 'rivalry', 'mode = ' + m2);
        await poste('/admin/toggle-game', {}, libre.body.hostToken);
    }

    console.log('\n── Les modes inventés ──');
    for (const invente of ['Classic', 'CLASSIC', 'Rivalry', 'pizza', 'quiz']) {
        const avant = await salons();
        const r = await poste('/admin/toggle-game', { lobbyMode: invente });
        const apres = await salons();
        check(`lobbyMode « ${invente} » : refusé`, !r.body.hostToken, 'HTTP ' + r.status);
        // ⚠️ Un refus ne doit pas laisser de salon derrière lui : le contrôle
        // vient AVANT creerRoom, et c'est ce que ce second check mesure.
        check(`lobbyMode « ${invente} » : aucun salon fantôme`, apres === avant, avant + ' → ' + apres);
        if (r.body.hostToken) await poste('/admin/toggle-game', {}, r.body.hostToken);
    }

    console.log('\n── Les portes de service ──');
    // ⚠️ TOUT MODE QUI S'OUVRE LIBREMENT doit figurer ici, Choice compris.
    // La garde de `/admin/set-teams` est une liste blanche, donc un mode neuf
    // est refusé par construction — mais c'est précisément ce qu'on vérifie :
    // le jour où quelqu'un la retourne en liste noire « pour simplifier », ce
    // sont ces lignes qui le disent.
    for (const mode of ['rush', 'collect', 'ascension', 'choice']) {
        const ouvert = await poste('/admin/toggle-game', { lobbyMode: mode });
        if (!ouvert.body.hostToken) {
            check(mode + ' : ouverture', false, 'HTTP ' + ouvert.status);
            continue;
        }
        const jeton = ouvert.body.hostToken, code = ouvert.body.roomCode;
        check(mode + ' : s\'ouvre bien', true);

        for (const [libelle, corps] of [['solo', { enabled: false }], ['équipes', { enabled: true }]]) {
            const r = await poste('/admin/set-teams', corps, jeton);
            const apres = (await etat(code)).lobbyMode;
            check(`${mode} → set-teams ${libelle} : refusé`, r.status === 400, 'HTTP ' + r.status);
            check(`${mode} → set-teams ${libelle} : le mode n'a pas bougé`, apres === mode,
                  'mode = ' + apres);
        }

        // Et si malgré tout le mode avait basculé, le quiz démarrerait-il ?
        await poste('/admin/start-game', {}, jeton);
        const modeFinal = (await etat(code)).lobbyMode;
        check(`${mode} : le salon reste en ${mode} après une tentative de démarrage`,
              modeFinal === mode, 'mode = ' + modeFinal);

        await poste('/admin/toggle-game', {}, jeton);   // on referme derrière soi
    }

    console.log(ko ? `\n❌ ${ko} contrôle(s) en échec` : '\n✅ aucune porte ouverte');
    process.exit(ko ? 1 : 0);
})().catch(e => { console.error('💥', e.message); process.exit(1); });
