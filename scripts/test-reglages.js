// Un salon NEUF affiche ses propres réglages, pas ceux de la session d'avant.
//
// Le défaut qui a mené à ce test : l'hôte terminait une partie BombAnime,
// cliquait Retour, rouvrait un salon BombAnime — et le tiroir annonçait encore
// « Bleach », la série qu'il avait choisie la fois d'avant. Le serveur, lui,
// venait de fabriquer un salon neuf avec son défaut : la manche se jouait en
// Naruto. L'écran et le jeu disaient deux choses différentes.
//
// La cause était une SECONDE écriture des défauts, côté client. Elle existait
// aussi pour Collect — l'écran annonçait douze animes quand le serveur en met
// dix — et rien ne l'avait signalé. D'où ce test, qui tient les deux bouts :
// `/admin/toggle-game` doit rendre TOUS les réglages du salon, et ils doivent
// être ceux d'`etatNeuf()`.
//
// ⚠️ Un réglage ajouté au tiroir sans être ajouté à `reglagesDuSalon` restera
// figé sur l'écran de l'hôte entre deux salons, en silence. C'est ce que la
// liste `ATTENDUS` ci-dessous empêche : elle doit grandir avec le tiroir.
const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
const MDP = require('./mdp-hote');   // mesure temporaire : ouverture du mode Classique

let ko = 0;
const check = (l, ok, extra) => {
    console.log((ok ? '✅ ' : '❌ ') + l + (extra ? ' → ' + extra : ''));
    if (!ok) ko++;
};

// Les champs que `reglagesDuSalon` doit porter, et leur valeur sur un salon neuf.
const ATTENDUS = {
    racine: ['mode', 'lives', 'questionTime', 'answersCount', 'questionsCount',
        'difficultyMode', 'serieFilter', 'noSpoil', 'speedBonus', 'bonusEnabled',
        'lobbyMode', 'teamNames'],
    bombanime: { serie: 'Naruto', timer: 8, lives: 2, meche: 'tour', ordre: 'horaire' },
    rush: { duree: 60, filtre: 'overall', multiplicateur: false, sequencePartagee: true },
    collect: { main: 4, animes: 10 },
    ascension: { etages: 15, timer: 30 },
};

async function ouvrir(mode) {
    const r = await fetch(BASE + '/admin/toggle-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true, lobbyMode: mode, motDePasse: MDP, playerId: 'rg-hote' }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(mode + ' → ' + r.status + ' ' + JSON.stringify(j));
    return j;
}

const admin = (route, jeton, corps) => fetch(BASE + route, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Host-Token': jeton },
    body: JSON.stringify(corps),
}).then(r => r.json());

const fermer = (jeton) => fetch(BASE + '/admin/toggle-game', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Host-Token': jeton },
    body: JSON.stringify({}),
});

(async () => {
    // ── 1. Le cas exact du rapport ──
    console.log('── BombAnime : régler, fermer, rouvrir ──');
    let s = await ouvrir('bombanime');
    check('un salon neuf annonce ses réglages', !!s.reglages,
        s.reglages ? 'oui' : 'AUCUN — le client ne peut rien afficher');
    if (!s.reglages) { console.log('\n1 échec(s)'); process.exit(1); }

    check('la série de départ est le défaut', s.reglages.bombanime.serie === 'Naruto',
        s.reglages.bombanime.serie);

    await admin('/admin/bombanime/update-serie', s.hostToken, { serie: 'Bleach' });
    await admin('/admin/bombanime/set-lives', s.hostToken, { lives: 1 });
    await admin('/admin/bombanime/set-meche', s.hostToken, { meche: 'continue' });
    await fermer(s.hostToken);

    s = await ouvrir('bombanime');
    check('après fermeture, la série repart au défaut', s.reglages.bombanime.serie === 'Naruto',
        s.reglages.bombanime.serie + ' (était Bleach)');
    check('les vies aussi', s.reglages.bombanime.lives === 2, String(s.reglages.bombanime.lives));
    check('la mèche aussi', s.reglages.bombanime.meche === 'tour', s.reglages.bombanime.meche);
    await fermer(s.hostToken);

    // ── 2. Tous les modes annoncent TOUS leurs réglages ──
    console.log('\n── chaque mode dit ses réglages ──');
    for (const mode of ['classic', 'bombanime', 'rush', 'collect', 'ascension']) {
        const o = await ouvrir(mode);
        const r = o.reglages || {};

        const manquants = ATTENDUS.racine.concat(['bombanime', 'rush', 'collect', 'ascension'])
            .filter(k => r[k] === undefined);
        check(mode.padEnd(10) + ' : aucun réglage manquant', manquants.length === 0,
            manquants.length ? manquants.join(', ') : Object.keys(r).length + ' champs');

        for (const bloc of ['bombanime', 'rush', 'collect', 'ascension']) {
            for (const [k, v] of Object.entries(ATTENDUS[bloc])) {
                if (r[bloc] && r[bloc][k] !== v) {
                    check('  ' + bloc + '.' + k + ' au défaut', false,
                        String(r[bloc][k]) + ' au lieu de ' + v);
                }
            }
        }
        await fermer(o.hostToken);
    }

    // ── 3. Le piège des booléens ──
    // ⚠️ Un réglage à FAUX doit revenir à VRAI sur un salon neuf. Côté client,
    // un `r.speedBonus || this.speedBonus` l'aurait laissé coché : il faut
    // tester `undefined`, pas la vérité de la valeur.
    console.log('\n── le piège des booléens ──');
    let q = await ouvrir('classic');
    check('speedBonus part à vrai', q.reglages.speedBonus === true, String(q.reglages.speedBonus));
    await admin('/admin/set-speed-bonus', q.hostToken, { enabled: false });
    await admin('/admin/set-no-spoil', q.hostToken, { enabled: true });
    await fermer(q.hostToken);

    q = await ouvrir('classic');
    check('un salon neuf le remet à vrai', q.reglages.speedBonus === true, String(q.reglages.speedBonus));
    check('et noSpoil revient à faux', q.reglages.noSpoil === false, String(q.reglages.noSpoil));
    await fermer(q.hostToken);

    console.log(ko ? '\n' + ko + ' échec(s)' : "\n✨ Un salon neuf affiche ses propres réglages");
    process.exit(ko ? 1 : 0);
})().catch(e => { console.error('✗', e.message); process.exit(1); });
