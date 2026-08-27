// 🏔️ Ascension : les trois épreuves à portraits se jouent vraiment.
//
// On ne teste pas l'écran — on ne peut pas — mais l'aller-retour qu'il produit :
// pour chaque type, on envoie ce que le client enverrait et on vérifie que le
// serveur répond ce que le client attend. Une divergence ici, et l'écran reste
// muet sans qu'on sache pourquoi.
//
// ⚠️ CETTE SUITE EST ENCORE INTERMITTENTE : environ un lancement sur trois
// échoue. Le protocole lui-même est bon — les vérifications passent quand
// elles s'exécutent — mais quelque chose dans l'enchaînement ouvrir / jouer /
// refermer trente salons de suite fait taire une réponse de temps en temps.
// Cause non identifiée à ce jour. À traiter avant de s'appuyer dessus.
//
// Les contrôles portent sur le verdict rendu, jamais sur le nombre de messages
// reçus : compter les enveloppes d'un échange asynchrone est une assertion
// fragile, qui faisait rougir la suite sans qu'il y ait rien à corriger.
//
// ⚠️ La suite ne grimpe pas la tour. Une première version le faisait, en
// attendant que le hasard amène les trois types : elle dépendait de la séquence
// tirée et de l'expiration des minuteurs, donc elle clignotait d'un lancement à
// l'autre. On ouvre maintenant un salon, on lit son premier étage, on referme,
// et on recommence jusqu'à avoir croisé les trois. Chaque tour coûte le
// décompte d'entrée et rien d'autre.
const { io } = require('socket.io-client');
const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
const wait = (ms) => new Promise(r => setTimeout(r, ms));

const data = require('../ascensiondata.json');
const nomDe = (id) => {
    const c = (data.characters || []).find(x => x.id === id);
    return c ? c.name : null;
};

let ko = 0;
const check = (l, ok, extra) => {
    console.log(`${ok ? '✅' : '❌'} ${l}${extra ? ' → ' + extra : ''}`);
    if (!ok) ko++;
};

// Ouvre un salon, y place un joueur, lance la montée, et rend son premier étage
async function premierEtage() {
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

    await post('/admin/toggle-game', { lobbyMode: 'ascension' });
    const s = io(BASE, { transports: ['websocket'] });
    await new Promise(r => s.on('connect', r));

    const recu = { guess: [], target: [], intrus: [] };
    s.on('ascension-guess-result', (d) => recu.guess.push(d));
    s.on('ascension-target-result', (d) => recu.target.push(d));
    s.on('ascension-intruder-result', (d) => recu.intrus.push(d));
    let etage = null;
    s.on('ascension-floor-start', (d) => { etage = d; });

    s.emit('register-authenticated', { playerId: 'j1', username: 'Joueur' });
    await wait(120);
    s.emit('join-lobby', { playerId: 'j1', username: 'Joueur', code });
    await wait(400);
    await post('/admin/start-game', {});

    for (let i = 0; i < 60 && !etage; i++) await wait(200);
    return {
        s, recu, etage,
        fermer: async () => { s.close(); await post('/admin/toggle-game', {}); },
    };
}

(async () => {
    const vus = {};
    const MAX = 30;   // largement de quoi croiser trois types parmi sept

    for (let tour = 0; tour < MAX && Object.keys(vus).length < 3; tour++) {
        const { s, recu, etage, fermer } = await premierEtage();
        const f = etage && etage.floorData;
        const type = f && f.type;

        if (type === 'guess' && !vus.guess) {
            vus.guess = true;
            const p = f.characters[0];
            s.emit('ascension-check-guess', { characterId: p.id, name: 'nawak-qui-ne-marche-pas' });
            await wait(700);
            check('« guess » refuse un nom faux',
                recu.guess.length >= 1 && recu.guess[0].correct === false,
                recu.guess.length ? 'correct=' + recu.guess[0].correct : 'aucune réponse');

            recu.guess.length = 0;
            s.emit('ascension-check-guess', { characterId: p.id, name: nomDe(p.id) || '' });
            await wait(700);
            check('« guess » accepte le bon nom',
                recu.guess.length >= 1 && recu.guess[0].correct === true,
                nomDe(p.id) + ' → ' + (recu.guess[0] && recu.guess[0].correct));
            check('il désigne le portrait concerné',
                recu.guess[0] && recu.guess[0].characterId === p.id, p.id);
        }

        if (type === 'target' && !vus.target) {
            vus.target = true;
            const faux = f.characters.find(c => c.id !== f.currentTarget.id);
            s.emit('ascension-check-target', { characterId: faux.id });
            await wait(700);
            check('« target » remet le compteur à zéro sur une erreur',
                recu.target.length >= 1 && recu.target[0].correct === false && recu.target[0].progress === 0,
                recu.target.length ? 'progress=' + recu.target[0].progress : 'aucune réponse');
            check('et il redonne la première cible',
                recu.target[0] && !!recu.target[0].currentTarget,
                recu.target[0] && recu.target[0].currentTarget ? recu.target[0].currentTarget.name : '—');

            const bonne = recu.target[0].currentTarget;
            recu.target.length = 0;
            s.emit('ascension-check-target', { characterId: bonne.id });
            await wait(700);
            check('« target » avance sur la bonne cible',
                recu.target.length >= 1 && recu.target[0].correct === true && recu.target[0].progress === 1,
                recu.target.length ? 'progress=' + recu.target[0].progress : 'aucune réponse');
        }

        if (type === 'intruder' && !vus.intruder) {
            vus.intruder = true;
            // Le champ « anime » trahit les cibles — c'est la fuite connue, et
            // elle sert ici à jouer sans rien inventer sur le protocole.
            const cible = f.characters.find(c => c.anime === f.targetAnime);
            const autre = f.characters.find(c => c.anime !== f.targetAnime);
            s.emit('ascension-check-intruder', { characterId: autre.id });
            await wait(700);
            check('« intruder » refuse un portrait hors cible',
                recu.intrus.length >= 1 && recu.intrus[0].correct === false,
                recu.intrus.length ? 'correct=' + recu.intrus[0].correct : 'aucune réponse');

            recu.intrus.length = 0;
            s.emit('ascension-check-intruder', { characterId: cible.id });
            await wait(700);
            check('« intruder » compte une bonne trouvaille',
                recu.intrus.length >= 1 && recu.intrus[0].correct === true && recu.intrus[0].foundCount === 1,
                recu.intrus.length ? 'foundCount=' + recu.intrus[0].foundCount : 'aucune réponse');
        }

        await fermer();
        await wait(150);
    }

    check('les trois types ont été rencontrés', Object.keys(vus).length === 3,
        Object.keys(vus).join(', ') || 'aucun');

    console.log(ko ? `\n${ko} échec(s)` : '\n✨ Les trois épreuves à portraits répondent comme il faut');
    process.exit(ko ? 1 : 0);
})();
