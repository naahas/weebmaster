// ════════════════════════════════════════════════════════════
// ✅❌ LE MOTEUR DE CHOICE, SANS SERVEUR
// ════════════════════════════════════════════════════════════
// Aucune socket, aucune base, aucun salon : on éprouve les RÈGLES.
// Trois d'entre elles ne se devinent pas et se casseraient en silence —
// la réponse qui ne doit jamais sortir, les indécis qui tombent, et la
// manche nulle quand personne ne trouve.
//
//   npm run test:choice
const C = require('../server-choice.js');

let ok = 0, ko = 0;
const dire = (bon, texte, detail) => {
    console.log((bon ? '✅ ' : '❌ ') + texte + (detail ? ' → ' + detail : ''));
    bon ? ok++ : ko++;
};
const titre = (t) => console.log('\n═══ ' + t + ' ═══\n');

const Q = (id, rep, diff, serie, spoil) => ({
    id, question: 'énoncé ' + id, reponse: rep, difficulty: diff,
    serie: serie || 'One Piece', is_spoil: !!spoil,
    proof_url: 'https://exemple.test/' + id,
});

// ════════════════════════════════════════════
titre('1. LA RÉPONSE NE SORT PAS');

const servie = C.questionPourLeJoueur(Q(1, true, 'easy'));
const brut = JSON.stringify(servie);
dire(servie.question === 'énoncé 1', 'l’énoncé part bien', servie.question);
dire(!('reponse' in servie), 'la RÉPONSE ne part pas');
dire(!('proof_url' in servie), 'le lien de preuve non plus');
dire(!/true|false|exemple\.test/.test(brut), 'et rien ne la trahit dans la charge', brut);
dire(C.questionPourLeJoueur(null) === null, 'aucune question : rien à servir');

// ════════════════════════════════════════════
titre('2. LE PALIER MONTE, ET NE REDESCEND PAS');

dire(C.palierVise(10, 10) === 0, 'tout le monde debout : on reste en bas');
dire(C.palierVise(6, 10) === 1, 'six sur dix : un cran');
dire(C.palierVise(4, 10) === 2, 'quatre sur dix : deux crans');
dire(C.palierVise(3, 10) === 3, 'trois sur dix : trois crans');
dire(C.palierVise(1, 10) === 4, 'le dernier carré : quatre crans');
dire(C.palierVise(1, 1) === 0, 'un seul joueur au départ : pas de division par rien');

// Il ne redescend pas, même quand le salon se vide puis se « remplit »
const e1 = C.etatNeuf();
C.monterLePalier(e1, 3, 10, false);
const haut = e1.palier;
C.monterLePalier(e1, 9, 10, false);
dire(e1.palier === haut, 'le palier ne REDESCEND jamais', 'resté à ' + e1.palier);

// Une manche sans élimination le pousse quand même
const e2 = C.etatNeuf();
C.monterLePalier(e2, 10, 10, true);
dire(e2.palier === 1, 'personne d’éliminé : il monte quand même', 'palier ' + e2.palier);
for (let i = 0; i < 20; i++) C.monterLePalier(e2, 10, 10, true);
dire(e2.palier === C.PALIERS.length - 1,
    'et il plafonne au dernier palier', C.PALIERS[e2.palier]);

// ════════════════════════════════════════════
titre('3. LE REPLI DE DIFFICULTÉ');

const r = C.ordreDeRepli(2);
dire(r[0] === 2, 'on vise d’abord son palier');
dire(r[1] === 1, 'puis on descend AVANT de monter', 'suivant = ' + r[1]);
dire(r.length === C.PALIERS.length, 'tous les paliers sont couverts', r.join(','));
dire(new Set(r).size === r.length, 'aucun doublon dans l’ordre de repli');

// ════════════════════════════════════════════
titre('4. LE TIRAGE');

const banque = [
    Q(1, true, 'easy'), Q(2, false, 'easy'), Q(3, true, 'hard'),
    Q(4, false, 'hard', 'Naruto'), Q(5, true, 'medium', 'Naruto', true),
];

const e3 = C.etatNeuf();
e3.palier = 0;
const t1 = C.tirerQuestion(e3, banque);
dire(!!t1, 'une question sort');

// Déjà vue : jamais deux fois
const e4 = C.etatNeuf();
e4.dejaVus = [1, 2, 3, 4, 5];
dire(C.tirerQuestion(e4, banque) === null, 'tout vu : plus rien à servir');

// Le filtre de série
const e5 = C.etatNeuf();
e5.serieFiltre = 'Naruto';
const dix = Array.from({ length: 10 }, () => C.tirerQuestion(e5, banque));
dire(dix.every(q => q && q.serie === 'Naruto'), 'le filtre de série tient sur dix tirages');

// Le repli : on demande « extreme », la banque n'en a pas
const e7 = C.etatNeuf();
e7.palier = C.PALIERS.indexOf('extreme');
dire(!!C.tirerQuestion(e7, banque),
    'aucune question au palier demandé : on sert quand même, on ne bloque pas');

dire(C.combienDisponibles(C.etatNeuf(), banque) === 5, 'le compte disponible est juste');
const e8 = C.etatNeuf(); e8.serieFiltre = 'Naruto';
dire(C.combienDisponibles(e8, banque) === 2, 'et il suit le filtre', '2 pour Naruto');

// ════════════════════════════════════════════
titre('5. LE DÉPOUILLEMENT');

function table(camps, bonne) {
    const e = C.etatNeuf();
    e.question = Q(99, bonne, 'easy');
    camps.forEach((c, i) => e.joueurs.set('j' + i, { vies: 1, camp: c, vivant: true }));
    return e;
}

// La réponse est VRAI : ceux du bord 'v' survivent.
let d = C.depouiller(table(['v', 'v', 'f', 'f'], true));
dire(d.justes.length === 2 && d.perdants.length === 2,
    'bonne réponse VRAI : deux justes, deux perdants');
dire(d.perdants.includes('j2') && d.perdants.includes('j3'), 'ce sont bien ceux du bord FAUX');

// La réponse est FAUX : l'inverse, sans rien changer d'autre.
d = C.depouiller(table(['v', 'v', 'f', 'f'], false));
dire(d.justes.length === 2 && d.perdants.includes('j0'),
    'bonne réponse FAUX : le bord s’inverse proprement');

// ⚠️ Ne pas choisir n'est PAS une protection.
d = C.depouiller(table(['v', null, null], true));
dire(d.perdants.length === 2 && d.perdants.includes('j1') && d.perdants.includes('j2'),
    'les INDÉCIS tombent avec les perdants', d.perdants.join(','));

// ⚠️ La manche nulle : personne n'a trouvé, personne ne paie.
d = C.depouiller(table(['f', 'f', 'f'], true));
dire(d.nulle === true, 'personne ne trouve : la manche est NULLE');
dire(d.perdants.length === 0, 'et personne ne perd de vie', d.perdants.length + ' perdant(s)');

// Un seul trouve : la manche n'est PAS nulle, tous les autres tombent.
d = C.depouiller(table(['v', 'f', 'f', null], true));
dire(d.nulle === false && d.perdants.length === 3,
    'un seul juste suffit à rendre la manche valable', d.perdants.length + ' tombent');

// Les morts ne comptent pas.
const e9 = C.etatNeuf();
e9.question = Q(99, true, 'easy');
e9.joueurs.set('vif', { vies: 1, camp: 'v', vivant: true });
e9.joueurs.set('mort', { vies: 0, camp: 'f', vivant: false });
d = C.depouiller(e9);
dire(d.perdants.length === 0 && d.vivantsAvant === 1,
    'un joueur déjà éliminé ne rejoue pas', d.vivantsAvant + ' vivant(s)');

// ════════════════════════════════════════════
titre('6. LES DÉFAUTS DU SALON');

const neuf = C.etatNeuf();
dire(neuf.vies === 1, 'une vie par défaut', String(neuf.vies));
dire(neuf.duree === 8, 'huit secondes par défaut', String(neuf.duree));
dire(neuf.voirLesAutres === true, 'on voit les autres par défaut — c’est le jeu');
dire(neuf.serieFiltre === 'overall', 'aucun filtre de série au départ');
dire(neuf.active === false && neuf.manche === 0, 'un état neuf ne joue pas');

// ════════════════════════════════════════════
console.log('\n' + (ko === 0
    ? '✨ Le moteur de Choice tient : ' + ok + ' contrôles'
    : '💥 ' + ko + ' contrôle(s) en échec sur ' + (ok + ko)));
process.exit(ko === 0 ? 0 : 1);
