// La banque de questions, pilotee depuis le panneau /admin.
//
// Le back-office a demenage : /question redirige, question.html n existe plus,
// et les routes /api/* s ouvrent desormais par DEUX clefs — l ancienne
// (adminCode = QUESTION_ADMIN_CODE, dont /saisie se sert encore) et l en-tete
// X-Admin-Code du panneau.
//
// Ce test tient les deux portes ET le sens INTERDIT : le code des questions ne
// doit jamais ouvrir le panneau. Puis il joue le cycle complet d une question
// — ajout, bascule du spoil, suppression — sur la VRAIE banque, et nettoie.
//
// Le code se lit dans l environnement :
//   PANEL_ADMIN_CODE=... QUESTION_ADMIN_CODE=... QUESTION_DELETE_CODE=... npm run test:banque
const BASE = 'http://localhost:' + (process.env.TEST_PORT || 7099);
const PANEL = process.env.PANEL_ADMIN_CODE;
const QCODE = process.env.QUESTION_ADMIN_CODE;
const DELCODE = process.env.QUESTION_DELETE_CODE;

let ko = 0;
const d = (b, t, x) => { console.log((b ? 'OK  ' : 'KO  ') + t + (x ? ' → ' + x : '')); if (!b) ko++; };
const H = { 'X-Admin-Code': PANEL, 'Content-Type': 'application/json' };
const get = (c, h) => fetch(BASE + c, { headers: h || {} });
const post = (c, corps, h) => fetch(BASE + c, {
    method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, h || {}),
    body: JSON.stringify(corps || {}),
});

const ROUTES = ['/api/questions', '/api/series', '/api/suggestions'];

(async () => {
    console.log('\n═══ 1. LES PORTES ═══\n');

    for (const c of ROUTES) {
        const r = await get(c);
        if (r.status !== 401) d(false, 'ouvert sans code : ' + c, 'HTTP ' + r.status);
    }
    d(true, 'sans code, les routes de lecture sont fermées', ROUTES.length + ' testées');

    // ⚠️ Le code du PANNEAU doit ouvrir les questions…
    for (const c of ROUTES) {
        const r = await get(c, { 'X-Admin-Code': PANEL });
        d(r.status === 200, 'X-Admin-Code ouvre ' + c, 'HTTP ' + r.status);
    }

    // …et l ancien code doit continuer de marcher, pour /saisie.
    const parQ = await get('/api/questions?adminCode=' + encodeURIComponent(QCODE));
    d(parQ.status === 200, 'l ancien adminCode fonctionne toujours', 'HTTP ' + parQ.status);

    // ⚠️ Mais le code des QUESTIONS ne doit PAS ouvrir le panneau.
    const fuite = await get('/admin/site/stats', { 'X-Admin-Code': QCODE });
    d(fuite.status === 401, 'le code des questions n ouvre PAS le panneau', 'HTTP ' + fuite.status);
    const fuite2 = await get('/admin/site/stats?code=' + encodeURIComponent(QCODE));
    d(fuite2.status === 401, 'ni par l adresse', 'HTTP ' + fuite2.status);

    // /question renvoie vers le panneau.
    const red = await fetch(BASE + '/question', { redirect: 'manual' });
    d(red.status === 302 && (red.headers.get('location') || '').includes('/admin'),
        '/question redirige vers /admin', 'HTTP ' + red.status + ' → ' + red.headers.get('location'));

    console.log('\n═══ 2. LE CYCLE D UNE QUESTION ═══\n');

    const avant = (await get('/api/questions', H).then(r => r.json())).questions.length;
    console.log('   ' + avant + ' questions en banque');

    const texte = 'SONDE — a supprimer ' + avant;
    const ajout = await post('/api/add-question', {
        question: texte,
        answers: ['un', 'deux', 'trois', 'quatre', 'cinq', 'six'],
        correctAnswer: 3,
        serie: 'SondeSerie',
        difficulty: 'hard',
        proof_url: 'https://example.org/preuve',
        is_spoil: false,
    }, H).then(r => r.json());
    d(ajout.success === true, 'ajout par le code du panneau', ajout.error || 'ok');

    let liste = (await get('/api/questions', H).then(r => r.json())).questions;
    const mienne = liste.find(q => q.question === texte);
    d(!!mienne, 'elle est en banque', mienne ? 'id ' + mienne.id : 'introuvable');
    if (!mienne) process.exit(1);
    d(mienne.coanswer === 3, 'la bonne réponse est la bonne', String(mienne.coanswer));
    d(mienne.difficulty === 'hard', 'la difficulté aussi', mienne.difficulty);
    d(mienne.is_spoil !== true, 'et elle n est pas marquée spoil');

    // ⚠️ LE BOUTON SPOIL. Dans l ancienne page il appelait « toggleSpoil »,
    // une fonction qui n existait nulle part : il ne faisait rien, en
    // silence. Le panneau passe par update-question, qui exige la question
    // ENTIÈRE — n envoyer que le drapeau effacerait les réponses.
    const bascule = await post('/api/update-question', {
        id: mienne.id,
        question: mienne.question,
        answers: [mienne.answer1, mienne.answer2, mienne.answer3,
                  mienne.answer4, mienne.answer5, mienne.answer6],
        correctAnswer: mienne.coanswer,
        serie: mienne.serie,
        difficulty: mienne.difficulty,
        proof_url: mienne.proof_url || null,
        is_spoil: true,
    }, H).then(r => r.json());
    d(bascule.success === true, 'le bouton spoil passe', bascule.error || 'ok');

    liste = (await get('/api/questions', H).then(r => r.json())).questions;
    const apres = liste.find(q => q.id === mienne.id);
    d(apres && apres.is_spoil === true, 'elle est bien marquée spoil maintenant');
    d(apres && apres.answer1 === 'un' && apres.answer6 === 'six',
        '⚠️ et ses six réponses sont INTACTES', apres ? apres.answer1 + '…' + apres.answer6 : '');
    d(apres && apres.coanswer === 3, 'la bonne réponse n a pas bougé non plus');

    console.log('\n═══ 3. LA SUPPRESSION ═══\n');

    const sansMdp = await post('/api/delete-question', { id: mienne.id }, H);
    d(sansMdp.status === 401, 'sans le second mot de passe, refusée', 'HTTP ' + sansMdp.status);
    const mauvais = await post('/api/delete-question', { id: mienne.id, deleteCode: 'nimporte' }, H);
    d(mauvais.status === 401, 'avec un mauvais, refusée aussi', 'HTTP ' + mauvais.status);

    const sup = await post('/api/delete-question', { id: mienne.id, deleteCode: DELCODE }, H).then(r => r.json());
    d(sup.success === true, 'avec le bon, elle part', sup.error || 'ok');

    const fin = (await get('/api/questions', H).then(r => r.json())).questions;
    d(fin.length === avant, 'la banque retrouve son compte', avant + ' → ' + fin.length);
    d(!fin.some(q => q.id === mienne.id), 'et la sonde a bien disparu');

    console.log('');
    console.log(ko === 0 ? '✨ le panneau pilote la banque de bout en bout'
        : '💥 ' + ko + ' problème(s)');
    process.exit(ko === 0 ? 0 : 1);
})().catch(e => { console.error('ERREUR : ' + e.message); process.exit(1); });
