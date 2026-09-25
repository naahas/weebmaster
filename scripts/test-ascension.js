// 🏔️ Ascension — le moteur d'étages, exercé sans serveur.
//
// Les générateurs sont des fonctions pures du fichier de données : on peut les
// faire tourner à vide, ce qui rend cette suite instantanée et indépendante
// d'un serveur lancé, contrairement aux autres.
//
// Elle vérifie trois choses : que la séquence d'étages respecte le tirage
// « par sac », que les 7 types et les 8 sous-types produisent tous un étage
// jouable, et surtout qu'aucun d'eux ne livre sa réponse au client.
const { _interne: I } = require('../server-ascension.js');

let ko = 0;
const check = (l, ok, extra) => {
    console.log(`${ok ? '✅' : '❌'} ${l}${extra ? ' → ' + extra : ''}`);
    if (!ok) ko++;
};

// ── La séquence d'étages ──
// On tire sans remise dans un sac contenant un exemplaire de chaque type :
// aucun ne revient tant que tous les autres ne sont pas passés.
const seq = I.generateFloorSequence(21);
check('une séquence de 21 étages se génère', seq.length === 21);

let cycleFautif = null;
for (let d = 0; d + I.GAME_TYPES.length <= seq.length; d += I.GAME_TYPES.length) {
    const cycle = seq.slice(d, d + I.GAME_TYPES.length);
    if (new Set(cycle).size !== cycle.length) cycleFautif = cycle;
}
check('aucun type ne se répète dans un cycle complet', !cycleFautif,
    cycleFautif ? cycleFautif.join(' ') : I.GAME_TYPES.length + ' types par cycle');

let dosADos = 0;
for (let i = 1; i < seq.length; i++) if (seq[i] === seq[i - 1]) dosADos++;
check('aucun type deux fois de suite', dosADos === 0, dosADos + ' répétition(s)');

// ── Chaque type produit un étage jouable ──
for (const type of I.GAME_TYPES) {
    let ok = false, detail = '';
    try {
        const d = I.generateFloorData(type, {});
        ok = !!d && !!I.getFloorDataForClient(d);
        detail = Object.keys(d).filter(k => k !== 'type').slice(0, 3).join(', ');
    } catch (e) {
        detail = 'ERREUR ' + e.message;
    }
    check("l'étage « " + type + " » se génère", ok, detail);
}

for (const st of I.MATCH_SUBTYPES) {
    let ok = false, detail = '';
    try {
        const d = I.generateMatchData(st);
        ok = !!d && Array.isArray(d.left) && Array.isArray(d.right) && d.left.length > 0;
        detail = d.left ? d.left.length + ' paires' : 'vide';
    } catch (e) {
        detail = 'ERREUR ' + e.message;
    }
    check('le sous-type « ' + st + ' » se génère', ok, detail);
}

// ── Ce que le client ne doit jamais recevoir ──
// Le serveur est autoritaire, mais cela ne sert à rien si la réponse voyage
// dans le message : n'importe quel onglet d'outils de développement la lit.
const secrets = {
    intruder: ['targetIds'],
    order: ['correctOrder'],
    wordle: ['word'],
    scramble: ['word'],
    target: ['targets'],
    match: ['pairs'],
    oeil: ['targets'],
};

for (const [type, champs] of Object.entries(secrets)) {
    const d = I.generateFloorData(type, {});
    const c = I.getFloorDataForClient(d);
    const fuite = champs.filter(f => f in c);
    check('« ' + type + ' » ne livre pas ' + champs.join(', '), fuite.length === 0,
        fuite.length ? 'fuite : ' + fuite.join(', ') : 'retiré');
}

// ── Rien de ce qui sort ne doit designer la reponse ──
// Trois vecteurs se cumulaient : les champs que le client n'affiche jamais, le
// nom du fichier image, et les identifiants — a la Liaison, une paire portait
// le meme des deux cotes, le fil se lisait donc sans regarder l'ecran.
const parlant = (v) => typeof v === 'string' && /[a-z]{4}/i.test(v);
const jetonValide = (u) => /^\/pic\/[0-9a-f]{20}$/.test(String(u));

{
    const c = I.getFloorDataForClient(I.generateFloorData('intruder', {}));
    const bavards = (c.characters || []).filter(p => 'anime' in p || 'name' in p);
    check("« intruder » ne trahit pas ses cibles par « anime » ou « name »",
        bavards.length === 0,
        bavards.length ? bavards.length + '/' + c.characters.length + ' cartes en disent trop' : 'retires');
}

{
    const c = I.getFloorDataForClient(I.generateFloorData('target', {}));
    const bavards = (c.characters || []).filter(p => 'anime' in p || 'name' in p);
    check("« target » ne nomme pas ses cartes", bavards.length === 0,
        bavards.length ? bavards.length + '/' + c.characters.length + ' cartes nommees' : 'retires');
    check('« target » ne designe pas la carte a cliquer',
        !!c.currentTarget && !('id' in c.currentTarget),
        c.currentTarget ? Object.keys(c.currentTarget).join(', ') : '(aucune cible)');
}

// L Oeil montre les visages — c est son principe — mais il ne doit livrer
// ni les noms, ni la position des cibles. La boucle suit OEIL_VARIANTES et
// ne cite aucune variante en dur : il y en a eu trois, il n en reste qu une,
// et une liste figee ici aurait teste un etage disparu.
{
    for (const v of I.OEIL_VARIANTES) {
        const d = I.generateFloorData('oeil', { oeilVariante: v });
        const c = I.getFloorDataForClient(d);
        const bavards = (c.characters || []).filter(p => 'name' in p || 'anime' in p || 'aliases' in p);
        check('« oeil/' + v + ' » ne nomme pas ses cartes', bavards.length === 0,
            bavards.length ? bavards.length + '/5 en disent trop' : 'retires');

        const ids = (c.characters || []).filter(p => parlant(p.id));
        check('« oeil/' + v + ' » ne trahit pas le nom par son identifiant', ids.length === 0,
            ids.length ? 'ex. ' + ids[0].id : 'opaques');

        const imgs = (c.characters || []).filter(p => !jetonValide(p.img));
        check('« oeil/' + v + ' » sert ses portraits sous jeton', imgs.length === 0,
            imgs.length ? 'ex. ' + imgs[0].img : 'sous jeton');

        check('« oeil/' + v + ' » ne designe pas la carte a cliquer',
            !!c.currentTarget && !('id' in c.currentTarget) && !('position' in c.currentTarget),
            c.currentTarget ? Object.keys(c.currentTarget).join(', ') : '(aucune)');
    }
}

{
    const c = I.getFloorDataForClient(I.generateFloorData('guess', {}));
    const bavards = (c.characters || []).filter(p => 'name' in p || 'anime' in p || 'aliases' in p);
    check('« guess » ne livre ni nom, ni anime, ni alias', bavards.length === 0,
        bavards.length ? bavards.length + '/' + c.characters.length + ' portraits en disent trop' : 'retires');

    const ids = (c.characters || []).filter(p => parlant(p.id));
    check("« guess » ne trahit pas le nom par l'identifiant", ids.length === 0,
        ids.length ? ids.length + ' — ex. ' + ids[0].id : 'opaques');

    // Un jeton est vingt caracteres hexadecimaux et rien d'autre : c'est la
    // forme qu'on verifie, pas l'absence de mots — du hasard en hexadecimal
    // finit toujours par en contenir un.
    const imgs = (c.characters || []).filter(p => !jetonValide(p.img));
    check('« guess » ne trahit pas le nom par le fichier image', imgs.length === 0,
        imgs.length ? imgs.length + ' — ex. ' + imgs[0].img : 'sous jeton');
}

// La Liaison : la paire se lisait en comparant les identifiants des deux
// colonnes, qui etaient les memes. Ils doivent maintenant etre etrangers.
{
    const d = I.generateFloorData('match', {});
    const c = I.getFloorDataForClient(d);
    const communs = (c.left || []).map(n => n.id).filter(id => (c.right || []).some(n => n.id === id));
    check('« match » ne relie pas ses colonnes par leurs identifiants',
        communs.length === 0,
        communs.length ? communs.length + ' identifiant(s) partages — ex. ' + communs[0] : 'etrangers');

    // Et l'ordre ne doit pas non plus faire la paire : le rang du bon element
    // de droite doit varier d'un tirage a l'autre.
    const rangs = new Set();
    for (let n = 0; n < 30; n++) {
        const e = I.generateFloorData('match', {});
        const p0 = e.pairs.find(p => p.leftId === 'g0');
        if (p0) rangs.add(p0.rightId);
    }
    check("« match » ne range pas la reponse en face de sa question",
        rangs.size > 1, rangs.size + ' position(s) differentes en trente tirages');
}

// Les portraits de toutes les grilles passent sous jeton, pas seulement guess
{
    for (const type of ['target', 'intruder', 'match', 'order']) {
        const c = I.getFloorDataForClient(I.generateFloorData(type, {}));
        const listes = [c.characters, c.left, c.right, c.arcs].filter(Boolean);
        const images = listes.flat().map(n => n.img).filter(Boolean);
        const clair = images.filter(u => !jetonValide(u));
        check('« ' + type + ' » sert ses images sous jeton', clair.length === 0,
            clair.length ? clair.length + '/' + images.length + ' en clair — ex. ' + clair[0] : images.length + ' image(s)');
    }
}

// ── Aucun nom ne doit être intapable ──
// « Devine le perso » n'envoie la saisie qu'au-delà d'un certain nombre de
// lettres. Ce seuil valait trois : « L » de Death Note ne partait jamais, et
// le portrait restait invalidable — il fallait dépenser l'ampoule dessus. Le
// seuil doit donc rester sous la longueur du nom le plus court des données.
{
    const donnees = require('../ascensiondata.json');
    const noms = (donnees.characters || []).map(c => c.name).filter(Boolean);
    const court = noms.reduce((m, n) => Math.min(m, n.length), Infinity);

    const app = require('fs').readFileSync(require('path').join(__dirname, '..', 'src', 'script', 'app.js'), 'utf8');
    const m = app.match(/if \(nom\.length < (\d+) \|\| !this\.socket/);
    const seuil = m ? parseInt(m[1], 10) : null;

    check('le seuil de saisie de « guess » se lit encore', seuil !== null,
        seuil === null ? 'la ligne a changé de forme' : seuil + ' lettre(s)');
    check('aucun nom n est trop court pour être tapé',
        seuil !== null && seuil <= court,
        'seuil ' + seuil + ', plus court nom ' + court + ' lettre(s) — ex. '
            + noms.find(n => n.length === court));
}

// ── Deux orthographes pour une même personne ──
// La Liaison ne prend qu'un anime par auteur, sinon la grille proposerait deux
// fois la même réponse et n'aurait pas de solution. Ce dédoublonnage compare
// des chaînes : saisi à la main, « Hirohiko Araki » ici et « Araki Hirohiko »
// là comptent pour deux personnes. La comparaison ignore déjà la casse, les
// accents et la ponctuation — le reste se signale ici.
{
    const donnees = require('../ascensiondata.json');
    const cle = (s) => String(s || '').toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]/g, '');

    for (const champ of ['author', 'studio']) {
        const parCle = new Map();
        for (const a of donnees.animes || []) {
            if (!a[champ]) continue;
            const k = cle(a[champ]);
            if (!parCle.has(k)) parCle.set(k, new Set());
            parCle.get(k).add(a[champ]);
        }
        // Un mot en commun, des mots dans un ordre différent : on rapproche les
        // clés qui contiennent les mêmes lettres pour attraper l'inversion.
        const trie = (s) => s.split('').sort().join('');
        const parLettres = new Map();
        for (const [k, formes] of parCle) {
            const l = trie(k);
            if (!parLettres.has(l)) parLettres.set(l, new Set());
            for (const f of formes) parLettres.get(l).add(f);
        }
        const suspects = [...parLettres.values()].filter(s => s.size > 1);

        check('les « ' + champ + ' » ne s écrivent que d une façon',
            suspects.length === 0,
            suspects.length
                ? suspects.map(s => [...s].join(' ≠ ')).join(' | ')
                : parCle.size + ' valeur(s) distinctes');
    }
}

// ── 🔗 Les liaisons ne citent que des personnages qui existent ──
//
// Couples, rivaux, techniques, armes et memes voix designent leurs
// personnages par leur « id », JAMAIS par leur nom — « itadori » et non
// « Yuji ». Un identifiant mal tape ne cassait rien : le generateur retombait
// dessus et l'affichait tel quel, en minuscules, sur une carte sans image.
//
// ⚠️ On relit le fichier depuis le disque. Le module d'Ascension retire de
// lui-meme les lignes fautives au chargement, et il mute l'objet que « require »
// met en cache : le lire par « require » ne montrerait que des donnees deja
// nettoyees, et cette verification passerait toujours.
const BRUT = JSON.parse(require('fs').readFileSync(require('path')
    .join(__dirname, '..', 'ascensiondata.json'), 'utf8'));
const idsConnus = new Set((BRUT.characters || []).map(c => c.id));
const CITES = {
    couples: (l) => [l.char1, l.char2],
    rivals: (l) => [l.char1, l.char2],
    techniques: (l) => [l.character],
    weapons: (l) => [l.character],
    same_voice: (l) => l.chars || [],
};
const orphelines = [];
for (const table of Object.keys(CITES)) {
    for (const l of BRUT[table] || []) {
        for (const id of CITES[table](l)) {
            if (id && !idsConnus.has(id)) orphelines.push(table + ' → ' + id);
        }
    }
}
check('aucune liaison ne cite un personnage inexistant', orphelines.length === 0,
    orphelines.length ? orphelines.join(', ')
        : Object.keys(CITES).map(k => (BRUT[k] || []).length + ' ' + k).join(', '));

// Et le portrait doit exister, sinon la carte sort vide.
const sansFichier = (BRUT.characters || []).filter(c => c.img &&
    !require('fs').existsSync(require('path').join(__dirname, '..', 'src', 'img', 'ascensionpic', c.img)));
check('chaque personnage cite un fichier de portrait qui existe',
    sansFichier.length === 0,
    sansFichier.length ? sansFichier.map(c => c.id + ' (' + c.img + ')').join(', ')
        : (BRUT.characters || []).length + ' portrait(s) en place');
// ── 🔤 Le sac de l'Anagramme ──
//
// Deux listes nommées dans le fichier de données, et elles seules. L'étage se
// servait auparavant dans « characters » et « animes » en entier : on ne
// pouvait pas en retirer un mot sans le retirer aussi de Devine le perso, de
// Cible, de l'Intrus et de la Liaison. Ce que cette section garde, c'est
// exactement cette séparation — le sac est clos, et il n'ampute rien.
const DONNEES = require('../ascensiondata.json');
const sacPersos = DONNEES.scramble_characters || [];
const sacAnimes = DONNEES.scramble_animes || [];

check('les deux listes de l anagramme existent et sont fournies',
    sacPersos.length > 20 && sacAnimes.length > 5,
    sacPersos.length + ' personnages, ' + sacAnimes.length + ' animes');

// Rien ne doit être écarté en silence : une entrée mal formée disparaîtrait du
// sac sans que personne ne le sache, et ces listes sont faites pour être
// éditées à la main.
const malFormees = [...sacPersos, ...sacAnimes].filter(n =>
    !(n && /^[A-Z]+$/i.test(n) && n.length >= 4 && n.length <= 10));
check('aucune entrée mal formée n est jetée en silence', malFormees.length === 0,
    malFormees.length ? malFormees.join(', ') : 'un seul mot de 4 à 10 lettres partout');

const dansSac = new Set([...sacPersos, ...sacAnimes].map(n => n.toUpperCase()));
const dehors = [], melangeRate = [], lettresPerdues = [], indiceVendu = [];
for (let i = 0; i < 1500; i++) {
    const e = I.generateFloorData('scramble', {});
    if (e.type !== 'scramble') continue;
    if (!dansSac.has(e.word)) dehors.push(e.word);
    if (e.scrambled.join('') === e.word) melangeRate.push(e.word);
    if (e.scrambled.slice().sort().join('') !== e.word.split('').sort().join('')) lettresPerdues.push(e.word);
    // L'indice est l'anime du personnage : il ne doit jamais être le mot
    // lui-même, sans quoi « Naruto » s'afficherait sous les lettres de NARUTO.
    if (e.hint && e.hint.toUpperCase() === e.word) indiceVendu.push(e.word);
}
check('sur 1500 tirages, aucun mot ne vient d ailleurs que du sac',
    dehors.length === 0, dehors.length ? [...new Set(dehors)].slice(0, 6).join(', ') : 'sac clos');
check('le mélange ne rend jamais le mot tel quel', melangeRate.length === 0,
    melangeRate.length ? melangeRate.slice(0, 4).join(', ') : 'toujours brouillé');
check('le mélange garde exactement les mêmes lettres', lettresPerdues.length === 0,
    lettresPerdues.length ? lettresPerdues.slice(0, 4).join(', ') : 'aucune lettre perdue');
check('l indice ne donne jamais la réponse', indiceVendu.length === 0,
    indiceVendu.length ? [...new Set(indiceVendu)].join(', ') : 'jamais l anime homonyme');

// ── Les trois écritures d'une entrée ──
//
// L'indice affiché sous les lettres est l'anime du personnage, et il se
// retrouve TOUT SEUL par le nom. Reste le personnage qui n'existe nulle part
// ailleurs : il n'a pas de portrait, donc rien à faire dans « characters » —
// l'y mettre le ferait tirer par Devine le perso, Cible et l'Intrus, qui
// montreraient une carte vide. Pour celui-là on écrit { nom, anime }.
const annuaire = {
    ORIHIME: { name: 'Orihime', anime: 'Bleach' },
    NARUTO: { name: 'Naruto', anime: 'Naruto' },
};
const sac = I.construireSacScramble(
    ['Orihime', 'Naruto', 'Ryuk', { nom: 'Beerus', anime: 'Dragon Ball' }, 'One Piece', 'Ace'],
    ['Bleach'], annuaire);
const parMot = {};
for (const p of sac.persos) parMot[p.word] = p.hint;

check('le nom seul retrouve son anime dans « characters »',
    parMot.ORIHIME === 'Bleach', 'ORIHIME → ' + parMot.ORIHIME);
check('{ nom, anime } donne l indice à la main, sans passer par « characters »',
    parMot.BEERUS === 'Dragon Ball', 'BEERUS → ' + parMot.BEERUS);
check('un nom introuvable reste jouable, mais sans indice',
    'RYUK' in parMot && parMot.RYUK === null, 'RYUK → ' + parMot.RYUK);
check('et il est nommé au démarrage plutôt que jeté en silence',
    sac.inconnus.length === 1 && sac.inconnus[0] === 'Ryuk', sac.inconnus.join(', '));
check('un nom qui EST son anime n affiche pas la réponse en indice',
    parMot.NARUTO === null, 'NARUTO → ' + parMot.NARUTO);
check('les entrées mal formées sont écartées et nommées',
    sac.refuses.length === 2 && sac.refuses.includes('One Piece') && sac.refuses.includes('Ace'),
    sac.refuses.join(' | '));
// ⚠️ Le point de toute l'affaire : le sac RESTREINT l'anagramme et ne touche à
// rien d'autre. Un personnage absent de la liste doit rester tiré ailleurs.
const horsSac = (DONNEES.characters || []).filter(c => c.img && !dansSac.has((c.name || '').toUpperCase()));
check('des personnages hors du sac existent encore dans les données',
    horsSac.length > 30, horsSac.length + ' personnage(s) hors anagramme');

const vusAilleurs = new Set();
for (let i = 0; i < 400; i++) {
    for (const c of I.generateFloorData('guess', {}).characters) vusAilleurs.add(c.name.toUpperCase());
}
check('et « Devine le perso » les tire toujours',
    horsSac.some(c => vusAilleurs.has((c.name || '').toUpperCase())),
    vusAilleurs.size + ' nom(s) vus en 400 étages');
console.log(ko ? `\n${ko} échec(s)` : "\n✨ Le moteur d'Ascension tient, et ne trahit rien");
