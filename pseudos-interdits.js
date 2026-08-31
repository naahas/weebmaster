// ══════════════════════════════════════════════════════════════
// 🚫 Les pseudos qu'on refuse
// ══════════════════════════════════════════════════════════════
//
// Ce filtre arrête celui qui essaie, pas celui qui s'acharne. Aucune liste ne
// couvre l'ingéniosité de quelqu'un de déterminé, et une liste assez large pour
// s'en approcher refuserait des pseudos honnêtes. Le dernier mot reste
// l'exclusion par l'hôte, qui voit le contexte — ceci ne fait que lui épargner
// l'évident.
//
// Deux listes, parce que deux problèmes différents :
//
//   • PARTOUT — ce qui ne peut se cacher dans aucun mot innocent. On le cherche
//     n'importe où dans le pseudo réduit : accents, espaces, tirets et
//     chiffres-lettres retirés, lettres répétées ramenées à une. « n i g g e r »,
//     « N1GG3R » et « niiigger » deviennent la même chaîne.
//
//   • ENTIERS — les gros mots qui vivent aussi à l'intérieur de mots ordinaires.
//     « con » est dans Conan, concombre et second ; « pd » dans rapide. Ceux-là
//     ne se cherchent qu'en mot entier, sur le pseudo découpé à ses séparateurs.
//     On laisse donc passer « xxconxx », et c'est le prix à payer pour ne pas
//     refuser « Conan ».
//
// ⚠️ La réduction ramène les lettres répétées à une seule : un terme qui n'y
// survit pas — « kkk » devient « k », « 1488 » devient « ia » — passerait sa
// courte forme dans PARTOUT et refuserait la moitié de l'alphabet. Le garde en
// bas de fichier écarte ces termes-là et le dit au démarrage ; c'est ce qui a
// attrapé « Kakashi » refusé pour « kkk » et « Négociateur » pour « 1488 ».
//
// Pour ajuster : dans PARTOUT ce qui ne peut jamais être innocent, dans ENTIERS
// ce qui pourrait l'être. En cas de doute, ENTIERS — un faux refus se voit tout
// de suite et fâche, un mot passé se corrige d'un clic sur « exclure ».

const PARTOUT = [
    // Insultes raciales et ethniques
    'nigger', 'nigga', 'negre', 'negro', 'bougnoul', 'bicot',
    'youpin', 'chink', 'niakoue', 'niakwe', 'chinetoque',
    'bamboula', 'sale arabe', 'sale noir', 'sale juif', 'sale blanc',
    'sale beur', 'sale rebeu', 'sale asiat', 'sale gitan', 'rebeudemerde',
    // Haine et apologie
    'hitler', 'nazi', 'heilhitler', 'siegheil', 'gazlesjuifs',
    'auschwitz', 'genocide', 'suprematie blanche', 'white power',
    // Insultes homophobes et transphobes
    'faggot', 'pede', 'tapette', 'tarlouze', 'travelo', 'tranny',
    // Sexuel explicite
    'niquetamere', 'niketamere', 'baisetamere', 'filsdepute', 'enculedetamere',
    'suce moi', 'suce ma', 'penis', 'vagin', 'clitoris', 'testicule',
    'sodomie', 'felation', 'branlette', 'masturb', 'ejacul',
    'pedophile', 'zoophil', 'inceste', 'violeur', 'porno',
    // Insultes lourdes sans ambiguite
    'connard', 'connasse', 'salope', 'putain', 'encule', 'batard',
    'enfoire', 'trouduc', 'ducon', 'grossepute',
    'motherfuck', 'asshole', 'cunt', 'whore',
    'trisomique', 'mongolien',
];

const ENTIERS = [
    'con', 'cons', 'conne', 'pd', 'pute', 'putes', 'bite', 'bites',
    'cul', 'culs', 'chatte', 'nichon', 'nichons', 'burne', 'burnes',
    'couille', 'couilles', 'zizi', 'pedo', 'viol', 'nique', 'niquer',
    'merde', 'chier', 'chiotte', 'salaud', 'crevure', 'raclure',
    'pouffiasse', 'garce', 'catin', 'tocard', 'bouffon', 'gueulasse',
    'fuck', 'fucker', 'shit', 'dick', 'cock', 'pussy', 'bitch', 'slut',
    'mongol', 'negro', 'kkk', 'ntm', 'fdp', 'tamere', 'ta mere',
    'ta race', 'sa mere', 'feuj',
    // Écartés à dessein, parce qu'ils fâchent plus d'innocents qu'ils
    // n'arrêtent de malveillants — c'est à l'hôte de trancher sur le contexte :
    //   « melon », « raton », « macaque », « romano » — un fruit, un laveur,
    //   un singe et un prénom ;
    //   « retard » — une insulte en anglais, un simple retard en français.
    //   La suite de tests l'a attrapé en essayant de rejoindre sous le pseudo
    //   « Retard », qu'aucune modération ne devrait refuser ici.
];

// La forme la plus nue d'un pseudo : c'est sur celle-là qu'on cherche. Les
// chiffres-lettres passent en lettres, les accents tombent, tout ce qui n'est
// pas une lettre disparaît, et une lettre répétée se ramène à une seule.
// « cooooonnard », « c-o-n-n-a-r-d » et « C0NN4RD » se rejoignent.
function reduire(brut) {
    return String(brut === undefined || brut === null ? '' : brut)
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[4@]/g, 'a')
        .replace(/[3€]/g, 'e')
        .replace(/[1!|]/g, 'i')
        .replace(/0/g, 'o')
        .replace(/[5$]/g, 's')
        .replace(/7/g, 't')
        .replace(/[^a-z]/g, '')
        .replace(/(.)\1+/g, '$1');
}

// Les mots du pseudo, chacun réduit de son côté. C'est ce découpage qui permet
// de refuser « con » sans refuser « Conan » : le premier est un mot, le second
// n'en contient pas.
function mots(brut) {
    const jetons = [];
    const morceaux = String(brut === undefined || brut === null ? '' : brut).split(/[^\p{L}\p{N}]+/u);
    for (const morceau of morceaux) {
        if (!morceau) continue;
        jetons.push(reduire(morceau));
        // « FDP2024 » est un seul mot pour qui le lit, mais « fdp » suivi d'un
        // millésime pour qui l'écrit. On essaie donc aussi le morceau sans ses
        // chiffres — sans quoi il suffisait d'en accoler un pour passer.
        if (/\d/.test(morceau)) jetons.push(reduire(morceau.replace(/\d/g, '')));
    }
    return jetons.filter(Boolean);
}

// ── Les termes, préparés une fois ──
// Un terme de PARTOUT trop court après réduction refuserait tout : on l'écarte
// et on le dit, plutôt que de le laisser saboter la liste en silence.
const SEUIL_PARTOUT = 4;

const partoutPrets = [];
const ecartes = [];
for (const terme of PARTOUT) {
    const nu = reduire(terme);
    if (nu.length >= SEUIL_PARTOUT) partoutPrets.push({ terme, nu });
    else ecartes.push(terme + ' → « ' + nu + ' »');
}
if (ecartes.length) {
    console.warn('⚠️ Pseudos interdits : ' + ecartes.length
        + ' terme(s) trop courts une fois réduits, écartés de la recherche large — '
        + ecartes.join(', ') + '. À déplacer dans ENTIERS.');
}

// Un terme en plusieurs mots s'est réduit en un seul : on le cherche alors dans
// la suite recollée, faute de quoi il ne correspondrait à aucun jeton.
const entiersPrets = ENTIERS.map(terme => ({
    terme,
    nu: reduire(terme),
    colle: /\s/.test(terme),
})).filter(t => t.nu);

// Rend le terme qui a fait refuser, ou null si le pseudo passe. On rend le
// terme et non un simple booléen : le journal en a besoin pour qu'on puisse
// corriger la liste le jour où elle se trompe.
function motInterdit(brut) {
    const nu = reduire(brut);
    if (!nu) return null;

    for (const t of partoutPrets) {
        if (nu.includes(t.nu)) return t.terme;
    }

    const decoupe = mots(brut);
    for (const t of entiersPrets) {
        if (t.colle ? nu.includes(t.nu) : decoupe.includes(t.nu)) return t.terme;
    }

    return null;
}

module.exports = { motInterdit, reduire, PARTOUT, ENTIERS };
