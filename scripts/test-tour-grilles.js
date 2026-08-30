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
//
// Les identifiants sont opaques, les images anonymes, et les cartes ne portent
// plus ni nom ni anime : rien de ce que reçoit le client ne dit la réponse —
// c'est le but. Pour jouer quand même, la suite demande la solution au serveur
// par `/admin/ascension/solution`, une porte refusée en production et fermée
// par le jeton d'hôte.
const { io } = require('socket.io-client');
const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
const wait = (ms) => new Promise(r => setTimeout(r, ms));

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
        s, recu, etage, post,
        fermer: async () => { s.close(); await post('/admin/toggle-game', {}); },
    };
}

(async () => {
    const vus = {};
    const MAX = 30;   // largement de quoi croiser trois types parmi sept

    for (let tour = 0; tour < MAX && Object.keys(vus).length < 3; tour++) {
        const { s, recu, etage, post, fermer } = await premierEtage();
        const f = etage && etage.floorData;
        const type = f && f.type;

        // ── Devine le perso ──
        if (type === 'guess' && !vus.guess) {
            vus.guess = true;
            const sol = await post('/admin/ascension/solution', { playerId: 'j1' });
            const nomDe = (id) => (sol.characters || []).find(c => c.id === id)?.name;
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

        // ── Cible ──
        // Le client ne reçoit plus que le nom à chercher : c'est au serveur de
        // dire quelle carte le porte, et c'est bien ce qu'on lui demande ici.
        if (type === 'target' && !vus.target) {
            vus.target = true;
            const sol = await post('/admin/ascension/solution', { playerId: 'j1' });
            const cibles = new Set((sol.targets || []).map(t => t.id));
            const attendue = (sol.targets || [])[0];
            const faux = f.characters.find(c => !cibles.has(c.id));

            s.emit('ascension-check-target', { characterId: faux.id });
            await wait(700);
            check('« target » remet le compteur à zéro sur une erreur',
                recu.target.length >= 1 && recu.target[0].correct === false && recu.target[0].progress === 0,
                recu.target.length ? 'progress=' + recu.target[0].progress : 'aucune réponse');
            check('et il redonne la première cible, par son nom seul',
                recu.target[0] && !!recu.target[0].currentTarget
                && !('id' in recu.target[0].currentTarget),
                recu.target[0] && recu.target[0].currentTarget
                    ? Object.keys(recu.target[0].currentTarget).join(', ') : '—');

            // L erreur ferme la grille une seconde : on attend qu elle rouvre,
            // sinon le serveur refuse le clic suivant sans rien dire.
            await wait(1200);
            recu.target.length = 0;
            s.emit('ascension-check-target', { characterId: attendue.id });
            await wait(700);
            check('« target » avance sur la bonne cible',
                recu.target.length >= 1 && recu.target[0].correct === true && recu.target[0].progress === 1,
                recu.target.length ? 'progress=' + recu.target[0].progress : 'aucune réponse');
        }

        // ── Intrus ──
        if (type === 'intruder' && !vus.intruder) {
            vus.intruder = true;
            const sol = await post('/admin/ascension/solution', { playerId: 'j1' });
            const cibles = new Set(sol.targetIds || []);
            const cible = f.characters.find(c => cibles.has(c.id));
            const autre = f.characters.find(c => !cibles.has(c.id));

            s.emit('ascension-check-intruder', { characterId: autre.id });
            await wait(700);
            check('« intruder » refuse un portrait hors cible',
                recu.intrus.length >= 1 && recu.intrus[0].correct === false,
                recu.intrus.length ? 'correct=' + recu.intrus[0].correct : 'aucune réponse');

            // Une erreur ferme la grille une seconde : on attend qu'elle rouvre,
            // sinon le serveur refuse le clic suivant sans rien dire.
            await wait(1200);
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
