// 🔒 Ce que le serveur laisse voir à qui n'y a pas droit.
//
// Le serveur est autoritaire partout, mais cela ne sert à rien si la réponse
// voyage dans le message : n'importe quel onglet d'outils de développement la
// lit. Cette suite se met à la place d'un curieux qui n'a que le code du salon
// — celui-là même qui s'affiche à l'écran pendant un direct — et vérifie qu'il
// n'y trouve rien qui l'avance.
//
// Elle complète `test:ascension`, qui vérifie la même chose sur le moteur de la
// tour, hors serveur.
const { io } = require('socket.io-client');
const mdpHote = require('./mdp-hote.js');
const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
const wait = (ms) => new Promise(r => setTimeout(r, ms));

let ko = 0;
const check = (l, ok, extra) => {
    console.log(`${ok ? '✅' : '❌'} ${l}${extra ? ' → ' + extra : ''}`);
    if (!ok) ko++;
};

function salon() {
    let jeton = '', code = '';
    const post = (p, b) => fetch(BASE + p, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Host-Token': jeton },
        body: JSON.stringify(b || {}),
    }).then(r => r.json().then(j => {
        if (j.hostToken) jeton = j.hostToken;
        if (j.roomCode) code = j.roomCode;
        return j;
    }));
    return { post, get code() { return code; } };
}

(async () => {
    // ══════════ Le quiz ══════════
    {
        const s = salon();
        const ouvert = await s.post('/admin/toggle-game', { lobbyMode: 'classic', motDePasse: mdpHote });
        if (!s.code) {
            check('un salon Classique s ouvre pour le test', false,
                JSON.stringify(ouvert).slice(0, 90) + ' — ADMIN_PASSWORD manquant ?');
        } else {
            const socks = [];
            for (const n of ['A', 'B']) {
                const k = io(BASE, { transports: ['websocket'] });
                await new Promise(r => k.on('connect', r));
                k.emit('register-authenticated', { playerId: 'f' + n + process.pid, username: 'Fuite' + n });
                await wait(120);
                k.emit('join-lobby', { playerId: 'f' + n + process.pid, username: 'Fuite' + n, code: s.code });
                socks.push(k);
            }
            await wait(600);
            await s.post('/admin/start-game', {});
            await wait(1500);

            // Le curieux n'a que le code, aucun jeton
            const etat = await fetch(BASE + '/game/state?code=' + s.code).then(r => r.json());
            const q = etat.currentQuestion;

            check('une question est bien en cours', !!q, q ? q.question.slice(0, 40) + '…' : '(aucune)');
            check("/game/state ne dit pas laquelle est la bonne",
                !!q && !('correctAnswer' in q),
                q ? Object.keys(q).join(', ') : '—');
            check('il ne la dit pas non plus sous un autre nom',
                !!q && !JSON.stringify(q).match(/coanswer|answer[0-9]|bonneReponse/i),
                'aucun champ suspect');

            // La répartition des votes : l'écran ne la montre qu'aux résultats,
            // mais elle partait dès la première réponse. Il suffisait d'écouter
            // pour voir la salle se ranger, puis de choisir la majorité.
            let stats = null;
            socks[0].on('live-answer-stats', (d) => { stats = d; });
            socks[0].emit('submit-answer', { answer: 1 });
            await wait(900);

            check('la répartition des votes ne circule pas pendant la question',
                !!stats && Object.keys(stats.answerCounts || {}).length === 0,
                stats ? JSON.stringify(stats.answerCounts) : '(aucune statistique)');
            check('mais le nombre de répondants, oui',
                !!stats && stats.answeredCount >= 1,
                stats ? stats.answeredCount + ' répondant(s)' : '—');

            const pendant = await fetch(BASE + '/game/state?code=' + s.code).then(r => r.json());
            check('/game/state ne dit pas non plus comment la salle a voté',
                Object.keys(pendant.answerCounts || {}).length === 0,
                JSON.stringify(pendant.answerCounts));

            // Une réponse, une seule : l'écran verrouille ses boutons, le serveur
            // doit le faire aussi — sinon on répond, on regarde, on change d'avis.
            socks[0].emit('submit-answer', { answer: 2 });
            await wait(500);
            const apres = await fetch(BASE + '/game/state?code=' + s.code).then(r => r.json());
            const moi = (apres.players || []).find(p => p.username === 'FuiteA');
            check('on ne change pas sa réponse une fois donnée',
                !moi || moi.selectedAnswerIndex === 1,
                moi ? 'index ' + moi.selectedAnswerIndex : '(joueur introuvable)');

            // Et une réponse hors des choix proposés n'entre nulle part
            socks[1].emit('submit-answer', { answer: 999 });
            await wait(500);
            const bidon = await fetch(BASE + '/game/state?code=' + s.code).then(r => r.json());
            const lui = (bidon.players || []).find(p => p.username === 'FuiteB');
            check('une réponse hors barème est refusée',
                !lui || !lui.hasAnswered, lui ? 'hasAnswered=' + lui.hasAnswered : '(introuvable)');

            for (const k of socks) k.close();
            await s.post('/admin/toggle-game', {});
        }
    }

    // ══════════ La tour ══════════
    {
        const s = salon();
        await s.post('/admin/toggle-game', { lobbyMode: 'ascension' });
        const k = io(BASE, { transports: ['websocket'] });
        await new Promise(r => k.on('connect', r));
        let etage = null;
        k.on('ascension-floor-start', (d) => { if (!etage) etage = d; });
        k.emit('register-authenticated', { playerId: 'ft' + process.pid, username: 'FuiteT' });
        await wait(150);
        k.emit('join-lobby', { playerId: 'ft' + process.pid, username: 'FuiteT', code: s.code });
        await wait(400);
        await s.post('/admin/start-game', {});
        for (let i = 0; i < 40 && !etage; i++) await wait(200);

        const brut = JSON.stringify(etage || {});
        check('l étage livré ne porte aucun champ de réponse', !!etage
            && !/"targetIds"|"correctOrder"|"pairs"|"word"|"targets"/.test(brut),
            etage ? etage.floorData.type : '(aucun étage)');
        check('ni un nom de fichier qui la dise', !!etage && !/ascensionpic\//.test(brut),
            'images sous jeton');

        const etat = await fetch(BASE + '/game/state?code=' + s.code).then(r => r.json());
        check('/game/state ne rend pas les étages de la tour',
            !('floorData' in etat) && !('ascensionFloors' in etat),
            Object.keys(etat.ascension || {}).join(', ') || 'rien');

        k.close();
        await s.post('/admin/toggle-game', {});
    }

    // ══════════ Le Rush ══════════
    // Même famille que la tour : l'image EST la question, donc son nom de
    // fichier ne doit pas la dire. L'anime non plus — il réduisait la réponse à
    // une poignée de candidats, et le client ne l'affichait même pas.
    {
        const s = salon();
        await s.post('/admin/toggle-game', { lobbyMode: 'rush' });
        const k = io(BASE, { transports: ['websocket'] });
        await new Promise(r => k.on('connect', r));
        let portrait = null;
        k.on('rush-portrait', (d) => { if (!portrait) portrait = d.portrait; });
        k.emit('register-authenticated', { playerId: 'fr' + process.pid, username: 'FuiteR' });
        await wait(150);
        k.emit('join-lobby', { playerId: 'fr' + process.pid, username: 'FuiteR', code: s.code });
        await wait(400);
        await s.post('/admin/start-game', {});
        for (let i = 0; i < 40 && !portrait; i++) await wait(200);

        check('un portrait de Rush arrive', !!portrait,
            portrait ? JSON.stringify(portrait) : '(aucun)');
        check('son fichier ne dit pas le nom du personnage',
            !!portrait && /^\/pic\/[0-9a-f]{20}$/.test(portrait.img),
            portrait ? portrait.img : '—');
        check('et son anime ne part plus avec',
            !!portrait && !('anime' in portrait),
            portrait ? Object.keys(portrait).join(', ') : '—');

        // Le jeton doit tout de même servir une vraie image
        if (portrait && portrait.img) {
            const r = await fetch(BASE + portrait.img);
            const octets = (await r.arrayBuffer()).byteLength;
            check('le jeton sert bien l image', r.status === 200 && octets > 1000,
                'HTTP ' + r.status + ', ' + octets + ' octets');
        }

        k.close();
        await s.post('/admin/toggle-game', {});
    }

    // ══════════ Le pseudo d un client bricole ══════════
    // Le formulaire filtre déjà, mais rien n'oblige à passer par lui : une
    // socket faite à la main envoie ce qu'elle veut. Le pseudo voyage ensuite à
    // tous les joueurs, entre dans l'historique et finit en base.
    {
        const s = salon();
        await s.post('/admin/toggle-game', { lobbyMode: 'ascension' });

        const mechant = '<img src=x onerror=alert(1)>';
        const trop = 'A'.repeat(300);
        const k = io(BASE, { transports: ['websocket'] });
        await new Promise(r => k.on('connect', r));
        let salle = null;
        k.on('lobby-update', (d) => { salle = d; });
        k.emit('register-authenticated', { playerId: 'x' + process.pid, username: mechant });
        await wait(150);
        k.emit('join-lobby', { playerId: 'x' + process.pid, username: mechant, code: s.code });
        await wait(700);

        const moi = salle && (salle.players || []).find(p => p.playerId === 'x' + process.pid);
        check('un pseudo avec du balisage est nettoyé',
            !moi || !/[<>"'/]/.test(moi.username),
            moi ? JSON.stringify(moi.username) : '(refusé à l entrée)');

        const k2 = io(BASE, { transports: ['websocket'] });
        await new Promise(r => k2.on('connect', r));
        let salle2 = null;
        k2.on('lobby-update', (d) => { salle2 = d; });
        k2.emit('register-authenticated', { playerId: 'y' + process.pid, username: trop });
        await wait(150);
        k2.emit('join-lobby', { playerId: 'y' + process.pid, username: trop, code: s.code });
        await wait(700);

        const lui = salle2 && (salle2.players || []).find(p => p.playerId === 'y' + process.pid);
        // Un pseudo inconvenant ne doit pas entrer, ni par la socket ni par la
        // porte de verification — c est le meme tamis des deux cotes.
        const grossier = io(BASE, { transports: ['websocket'] });
        await new Promise(r => grossier.on('connect', r));
        let salle3 = null;
        grossier.on('lobby-update', (d) => { salle3 = d; });
        grossier.emit('register-authenticated', { playerId: 'z' + process.pid, username: 'C0nn4rd' });
        await wait(150);
        grossier.emit('join-lobby', { playerId: 'z' + process.pid, username: 'C0nn4rd', code: s.code });
        await wait(700);
        const entre = salle3 && (salle3.players || []).find(p => p.playerId === 'z' + process.pid);
        check('un pseudo inconvenant n entre pas dans le salon', !entre,
            entre ? JSON.stringify(entre.username) : 'refuse a la porte');
        grossier.close();

        const verdict = await fetch(BASE + '/api/pseudo', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pseudo: 'C0nn4rd' }),
        }).then(r => r.json());
        check('et la verification le dit avant meme de rejoindre', verdict.ok === false,
            JSON.stringify(verdict));

        const honnete = await fetch(BASE + '/api/pseudo', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pseudo: 'Kakashi' }),
        }).then(r => r.json());
        check('un pseudo honnete passe sans encombre', honnete.ok === true,
            JSON.stringify(honnete));

        check('un pseudo de trois cents lettres est raccourci',
            !lui || lui.username.length <= 16,
            lui ? lui.username.length + ' caractère(s)' : '(refusé à l entrée)');

        k.close(); k2.close();
        await s.post('/admin/toggle-game', {});
    }

    // ══════════ Les portes reservees ══════════
    {
        const sansJeton = (p) => fetch(BASE + p, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
        }).then(r => r.status);

        for (const route of ['/admin/start-game', '/admin/next-question', '/admin/replay',
                             '/admin/ascension/solution', '/admin/ascension/set-etages']) {
            const st = await sansJeton(route);
            check('« ' + route + ' » se ferme sans jeton', st === 401 || st === 403 || st === 404,
                'HTTP ' + st);
        }
    }

    console.log(ko ? `\n${ko} échec(s)` : '\n✨ Le code du salon ne donne rien de plus que le droit de jouer');
    process.exit(ko ? 1 : 0);
})();
