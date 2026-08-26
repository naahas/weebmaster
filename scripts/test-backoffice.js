// 🔐 Le back-office des questions n'est ouvert qu'avec QUESTION_ADMIN_CODE.
//
// Il a été grand ouvert en production : six contrôles comparaient le code reçu
// à QUESTION_ADMIN_CODE **ou** à MASTER_ADMIN_CODE, variable jamais définie.
// Elle valait donc `undefined`, et une requête sans champ « adminCode » vaut
// `undefined` aussi : le `&&` court-circuitait sur cette égalité et laissait
// passer. Toute la banque de questions, réponses comprises, était lisible et
// modifiable par n'importe qui.
//
// Ce test refait le geste de l'intrus : aucun code, un code vide, un code faux.
const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);

// Le vrai code, lu comme le fait le serveur — sans lui on ne peut pas vérifier
// que la porte s'ouvre encore pour qui la connaît.
const fs = require('fs');
const path = require('path');
let CODE = process.env.QUESTION_ADMIN_CODE || '';
if (!CODE) {
    try {
        const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
        const l = env.match(/^QUESTION_ADMIN_CODE=(.*)$/m);
        if (l) CODE = l[1].trim();
    } catch (e) { /* signalé plus bas */ }
}

let ko = 0;
const check = (l, ok, extra) => {
    console.log(`${ok ? '✅' : '❌'} ${l}${extra ? ' → ' + extra : ''}`);
    if (!ok) ko++;
};

const post = (p, corps) => fetch(BASE + p, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
}).then(r => r.status);

const get = (p) => fetch(BASE + p).then(r => r.status);

(async () => {
    if (!CODE) {
        console.log('❌ QUESTION_ADMIN_CODE introuvable : test impossible');
        process.exit(1);
    }

    // ── Ce qu'un visiteur peut tenter ──
    // Le corps vide est le cas qui passait : « adminCode » absent valait
    // `undefined`, tout comme la variable master jamais configurée.
    const tentatives = [
        ['aucun champ', {}],
        ['champ vide', { adminCode: '', code: '' }],
        ['code faux', { adminCode: 'nawak', code: 'nawak' }],
    ];

    for (const [nom, corps] of tentatives) {
        const routes = [
            ['/api/verify-question-code', () => post('/api/verify-question-code', corps)],
            ['/api/add-question',         () => post('/api/add-question', corps)],
            ['/api/update-question',      () => post('/api/update-question', corps)],
            ['/api/delete-question',      () => post('/api/delete-question', corps)],
            ['/api/suggestions',          () => post('/api/suggestions', corps)],
        ];
        for (const [chemin, appel] of routes) {
            const s = await appel();
            check(`${nom} : ${chemin} refuse`, s === 401 || s === 404, 'HTTP ' + s);
        }
    }

    // Les deux lectures se font en GET, le code passe donc par l'URL
    for (const [nom, suffixe] of [['sans code', ''], ['code vide', '?adminCode='],
                                  ['code faux', '?adminCode=nawak']]) {
        for (const chemin of ['/api/questions', '/api/series']) {
            const s = await get(chemin + suffixe);
            check(`${nom} : ${chemin} refuse`, s === 401, 'HTTP ' + s);
        }
    }

    // ── Et la porte s'ouvre toujours pour qui a le code ──
    const bon = encodeURIComponent(CODE);
    check('avec le bon code, le portail s ouvre',
        (await post('/api/verify-question-code', { code: CODE })) === 200);
    check('avec le bon code, la banque se lit',
        (await get('/api/questions?adminCode=' + bon)) === 200);
    check('avec le bon code, les séries se lisent',
        (await get('/api/series?adminCode=' + bon)) === 200);

    console.log(ko ? `\n${ko} échec(s)` : '\n✨ Le back-office ne s ouvre qu avec son code');
    process.exit(ko ? 1 : 0);
})();
