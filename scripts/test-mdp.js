// ── Mesure temporaire : le mode Classique est sous mot de passe ──
//
// Cette suite ne vérifie pas que la porte d'entrée est fermée — ça, un seul
// `if` le fait. Elle vérifie qu'il n'existe pas de PORTE DE SERVICE : un salon
// Rush, Collect ou Ascension s'ouvre librement, et son hôte repart avec un
// jeton valable sur TOUTES les routes /admin de son salon. Si l'une d'elles
// sait écrire `lobbyMode`, la mesure ne vaut plus rien.
//
// C'était le cas de « /admin/set-teams » : le réglage Format du quiz écrit
// `lobbyMode = 'classic'` ou `'rivalry'`, et ne refusait que BombAnime. Ouvrir
// en Rush puis appeler set-teams donnait un salon Classique sans mot de passe.
//
// Le jour où la mesure est levée : supprimer ce fichier, le garde dans
// /admin/toggle-game, « demandeMdp » dans app.js et scripts/mdp-hote.js.
const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
const MDP = require('./mdp-hote');

const poste = (chemin, corps, jeton) => fetch(BASE + chemin, {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' },
                           jeton ? { 'X-Host-Token': jeton } : {}),
    body: JSON.stringify(corps || {}),
}).then(r => r.json().then(j => ({ status: r.status, body: j })).catch(() => ({ status: r.status, body: {} })));

const etat = code => fetch(BASE + "/game/state?code=" + code).then(r => r.json());
const salons = () => fetch(BASE + '/api/home-stats').then(r => r.json()).then(s => s.activeRooms);

(async () => {
    let ko = 0;
    const check = (l, ok, extra) => {
        console.log(`${ok ? '✅' : '❌'} ${l}${extra ? '  → ' + extra : ''}`);
        if (!ok) ko++;
    };

    if (!MDP) {
        console.log('❌ ADMIN_PASSWORD introuvable (.env) — la suite ne peut rien prouver.');
        process.exit(1);
    }

    console.log('── La porte d\'entrée ──');

    // Sans mot de passe, avec un mauvais, et sans mode du tout (le défaut est « classic »)
    for (const [libelle, corps] of [
        ['Classique sans mot de passe',       { lobbyMode: 'classic' }],
        ['Classique avec un mauvais mot de passe', { lobbyMode: 'classic', motDePasse: MDP + 'x' }],
        ['Rivalité sans mot de passe',        { lobbyMode: 'rivalry' }],
        ['aucun mode précisé (défaut classic)', {}],
    ]) {
        const avant = await salons();
        const r = await poste('/admin/toggle-game', corps);
        const apres = await salons();
        check(libelle + ' : refusé', r.status === 403 || r.status === 503, 'HTTP ' + r.status);
        check(libelle + ' : aucun salon fantôme', apres === avant, avant + ' → ' + apres);
        check(libelle + ' : aucun jeton livré', !r.body.hostToken);
    }

    console.log('\n── Les modes inventés ──');

    // Le garde testait « si le mode demandé vaut classic ». Un mode inconnu y
    // échappait, et /admin/start-game — qui aiguille sur les modes qu'il connaît
    // et retombe SINON sur le quiz — lançait un vrai Classique. Vérifié en
    // conditions réelles : « lobbyMode: "Classic" » servait une question.
    for (const invente of ['Classic', 'CLASSIC', 'Rivalry', 'pizza', 'quiz']) {
        const avant = await salons();
        const r = await poste('/admin/toggle-game', { lobbyMode: invente });
        const apres = await salons();
        check(`lobbyMode « ${invente} » : refusé`, !r.body.hostToken, 'HTTP ' + r.status);
        check(`lobbyMode « ${invente} » : aucun salon fantôme`, apres === avant, avant + ' → ' + apres);
        if (r.body.hostToken) await poste('/admin/toggle-game', {}, r.body.hostToken);
    }

    console.log('\n── Les portes de service ──');

    // Chaque mode libre ouvre un salon, puis tente de le convertir en Classique.
    for (const mode of ['rush', 'collect', 'ascension']) {
        const ouvert = await poste('/admin/toggle-game', { lobbyMode: mode });
        if (!ouvert.body.hostToken) {
            check(mode + ' : ouverture libre', false, 'HTTP ' + ouvert.status);
            continue;
        }
        const jeton = ouvert.body.hostToken, code = ouvert.body.roomCode;
        check(mode + ' : s\'ouvre bien sans mot de passe', true);

        // set-teams est le réglage « Format » du quiz : il écrit lobbyMode.
        for (const [libelle, corps] of [['solo', { enabled: false }], ['équipes', { enabled: true }]]) {
            const r = await poste('/admin/set-teams', corps, jeton);
            const apres = (await etat(code)).lobbyMode;
            check(`${mode} → set-teams ${libelle} : refusé`, r.status === 400,
                  'HTTP ' + r.status);
            check(`${mode} → set-teams ${libelle} : le mode n'a pas bougé`, apres === mode,
                  'mode = ' + apres);
        }

        // Et si malgré tout le mode avait basculé, le quiz démarrerait-il ?
        const demarre = await poste('/admin/start-game', {}, jeton);
        const modeFinal = (await etat(code)).lobbyMode;
        check(`${mode} : le salon reste en ${mode} après une tentative de démarrage`,
              modeFinal === mode, 'mode = ' + modeFinal);
        void demarre;

        await poste('/admin/toggle-game', {}, jeton);   // on referme derrière soi
    }

    console.log('\n── La porte s\'ouvre bien avec le bon mot de passe ──');
    const bon = await poste('/admin/toggle-game', { lobbyMode: 'classic', motDePasse: MDP });
    check('Classique avec le bon mot de passe : accepté', bon.body.isActive === true,
          'HTTP ' + bon.status);
    if (bon.body.hostToken) {
        const m = (await etat(bon.body.roomCode)).lobbyMode;
        check('le salon est bien en Classique', m === 'classic', 'mode = ' + m);
        // Et là, set-teams DOIT marcher : c'est son rôle.
        const r = await poste('/admin/set-teams', { enabled: true }, bon.body.hostToken);
        const m2 = (await etat(bon.body.roomCode)).lobbyMode;
        check('set-teams fonctionne encore dans un vrai salon Classique',
              r.status === 200 && m2 === 'rivalry', 'mode = ' + m2);
        await poste('/admin/toggle-game', {}, bon.body.hostToken);
    }

    console.log(ko ? `\n❌ ${ko} contrôle(s) en échec` : '\n✅ aucune porte ouverte');
    process.exit(ko ? 1 : 0);
})().catch(e => { console.error('💥', e.message); process.exit(1); });
