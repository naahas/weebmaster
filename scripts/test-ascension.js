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
const jetonValide = (u) => /^\/ascpic\/[0-9a-f]{20}$/.test(String(u));

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

console.log(ko ? `\n${ko} échec(s)` : "\n✨ Le moteur d'Ascension tient, et ne trahit rien");
