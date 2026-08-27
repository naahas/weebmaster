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

// L'intrus se lit dans le champ « anime » de chaque personnage : le joueur
// doit trouver ceux d'un anime donné, et chacun annonce le sien.
{
    const d = I.generateFloorData('intruder', {});
    const c = I.getFloorDataForClient(d);
    const devines = (c.characters || []).filter(p => p.anime === c.targetAnime).map(p => p.id).sort();
    const attendus = [...(d.targetIds || [])].sort();
    check("« intruder » ne trahit pas ses cibles par le champ « anime »",
        JSON.stringify(devines) !== JSON.stringify(attendus),
        devines.length ? devines.length + ' cible(s) lisibles sans jouer' : 'champ absent');
}

// À « guess » on tape le nom du personnage : ni son identifiant ni le nom de
// son image ne doivent le désigner.
{
    const c = I.getFloorDataForClient(I.generateFloorData('guess', {}));
    const p = (c.characters || [])[0] || {};
    const parlant = (v) => typeof v === 'string' && /[a-z]{4}/i.test(v.replace(/_ascension|\.png/g, ''));
    check('« guess » ne trahit pas le nom par l identifiant', !parlant(p.id), p.id || '—');
    check('« guess » ne trahit pas le nom par le fichier image', !parlant(p.img), p.img || '—');
}

console.log(ko ? `\n${ko} échec(s)` : "\n✨ Le moteur d'Ascension tient, et ne trahit rien");
process.exit(ko ? 1 : 0);
