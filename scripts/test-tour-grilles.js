// 🏔️ Ascension : les trois épreuves à portraits se jouent vraiment.
//
// On ne teste pas l'écran — on ne peut pas — mais l'aller-retour qu'il produit :
// pour chaque type, on envoie ce que le client enverrait et on vérifie que le
// serveur répond ce que le client attend. Une divergence ici, et l'écran reste
// muet sans qu'on sache pourquoi.
//
// Les bonnes réponses se lisent dans le moteur, comme un joueur omniscient : ce
// qui compte est le protocole, pas la difficulté.
const { io } = require('socket.io-client');
const A = require('../server-ascension.js')._interne;
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
    return j;
}));

let ko = 0;
const check = (l, ok, extra) => {
    console.log(`${ok ? '✅' : '❌'} ${l}${extra ? ' → ' + extra : ''}`);
    if (!ok) ko++;
};

// Le nom attendu pour un personnage, tiré du fichier de données
const data = require('../ascensiondata.json');
const nomDe = (id) => {
    const c = (data.characters || []).find(x => x.id === id);
    return c ? c.name : null;
};

(async () => {
    await post('/admin/toggle-game', { lobbyMode: 'ascension' });
    await post('/admin/ascension/set-timer', { timer: 45 });

    const s = io(BASE, { transports: ['websocket'] });
    await new Promise(r => s.on('connect', r));
    const recu = { guess: [], target: [], intrus: [] };
    s.on('ascension-guess-result', (d) => recu.guess.push(d));
    s.on('ascension-target-result', (d) => recu.target.push(d));
    s.on('ascension-intruder-result', (d) => recu.intrus.push(d));
    let etage = null;
    s.on('ascension-floor-start', (d) => { etage = d; });

    s.emit('register-authenticated', { playerId: 'j1', username: 'Joueur' });
    await wait(150);
    s.emit('join-lobby', { playerId: 'j1', username: 'Joueur', code });
    await wait(500);
    await post('/admin/start-game', {});

    // On monte jusqu'à croiser chacun des trois types
    const vus = {};
    for (let tour = 0; tour < 60 && Object.keys(vus).length < 3; tour++) {
        for (let i = 0; i < 90 && !etage; i++) await wait(250);
        if (!etage) break;
        const f = etage.floorData;
        const type = f && f.type;

        if (type === 'guess' && !vus.guess) {
            vus.guess = true;
            const p = f.characters[0];
            recu.guess = [];
            s.emit('ascension-check-guess', { characterId: p.id, name: 'nawak-qui-ne-marche-pas' });
            await wait(350);
            check('« guess » refuse un nom faux',
                recu.guess.length === 1 && recu.guess[0].correct === false,
                recu.guess.length ? 'correct=' + recu.guess[0].correct : 'aucune réponse');

            recu.guess = [];
            s.emit('ascension-check-guess', { characterId: p.id, name: nomDe(p.id) || '' });
            await wait(350);
            check('« guess » accepte le bon nom',
                recu.guess.length === 1 && recu.guess[0].correct === true,
                nomDe(p.id) + ' → ' + (recu.guess[0] && recu.guess[0].correct));
            check('il désigne le portrait concerné',
                recu.guess[0] && recu.guess[0].characterId === p.id, p.id);
        }

        if (type === 'target' && !vus.target) {
            vus.target = true;
            const cible = f.currentTarget;
            const faux = f.characters.find(c => c.id !== cible.id);
            recu.target = [];
            s.emit('ascension-check-target', { characterId: faux.id });
            await wait(350);
            check('« target » remet le compteur à zéro sur une erreur',
                recu.target.length === 1 && recu.target[0].correct === false && recu.target[0].progress === 0,
                recu.target.length ? 'progress=' + recu.target[0].progress : 'aucune réponse');
            check('et il redonne la première cible',
                recu.target[0] && !!recu.target[0].currentTarget,
                recu.target[0] && recu.target[0].currentTarget ? recu.target[0].currentTarget.name : '—');

            const bonne = recu.target[0].currentTarget;
            recu.target = [];
            s.emit('ascension-check-target', { characterId: bonne.id });
            await wait(350);
            check('« target » avance sur la bonne cible',
                recu.target.length === 1 && recu.target[0].correct === true && recu.target[0].progress === 1,
                recu.target.length ? 'progress=' + recu.target[0].progress : 'aucune réponse');
        }

        if (type === 'intruder' && !vus.intruder) {
            vus.intruder = true;
            // Le champ « anime » trahit les cibles — c'est la fuite connue, et
            // elle sert ici à jouer sans tricher sur le protocole.
            const cible = f.characters.find(c => c.anime === f.targetAnime);
            const autre = f.characters.find(c => c.anime !== f.targetAnime);
            recu.intrus = [];
            s.emit('ascension-check-intruder', { characterId: autre.id });
            await wait(350);
            check('« intruder » refuse un portrait hors cible',
                recu.intrus.length === 1 && recu.intrus[0].correct === false,
                recu.intrus.length ? 'correct=' + recu.intrus[0].correct : 'aucune réponse');

            recu.intrus = [];
            s.emit('ascension-check-intruder', { characterId: cible.id });
            await wait(350);
            check('« intruder » compte une bonne trouvaille',
                recu.intrus.length === 1 && recu.intrus[0].correct === true && recu.intrus[0].foundCount === 1,
                recu.intrus.length ? 'foundCount=' + recu.intrus[0].foundCount : 'aucune réponse');
        }

        // On passe à l'étage suivant en laissant le minuteur expirer serait trop
        // long : on force le passage en ratant volontairement l'épreuve courante.
        etage = null;
        await post('/admin/ascension/set-timer', { timer: 20 }).catch(() => {});
        for (let i = 0; i < 12 && !etage; i++) await wait(250);
        if (!etage) {
            // Le serveur n'avance que sur validation ou expiration : on attend.
            for (let i = 0; i < 90 && !etage; i++) await wait(250);
        }
    }

    check('les trois types ont été rencontrés', Object.keys(vus).length === 3,
        Object.keys(vus).join(', ') || 'aucun');

    s.close();
    await post('/admin/toggle-game', {});
    await wait(200);

    console.log(ko ? `\n${ko} échec(s)` : '\n✨ Les trois épreuves à portraits répondent comme il faut');
    process.exit(ko ? 1 : 0);
})();
