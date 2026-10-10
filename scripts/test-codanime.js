// 🕵️ Le moteur de Codanime, éprouvé SANS serveur.
//
// On vérifie ici ce qu'aucune partie jouée à la main ne montrerait de façon
// fiable : la répartition des camps, le plafond par série sur des milliers de
// tirages, l'ordre de franchissement, le débordement du quota — et surtout
// qu'AUCUNE couleur ne sort vers un agent.
//
//   npm run test:codanime
const m = require('../server-codanime');
const vivier = require('../codanimedata.json').personnages;

let ok = 0, ko = 0;
const dire = (bon, texte, detail) => {
    if (bon) { ok++; console.log('  ✅ ' + texte); }
    else { ko++; console.log('  ❌ ' + texte + (detail ? ' → ' + detail : '')); }
};
const titre = (t) => console.log('\n── ' + t);

// Un hasard REPRODUCTIBLE : une suite qui échoue doit pouvoir se rejouer.
function alea(graine) {
    let x = graine >>> 0;
    return () => {
        x ^= x << 13; x >>>= 0;
        x ^= x >> 17;
        x ^= x << 5; x >>>= 0;
        return x / 4294967296;
    };
}

titre('Le seuil de voix');
dire(m.seuil(1) === 1, '1 agent → 1 voix');
dire(m.seuil(2) === 2, '2 agents → 2 voix');
dire(m.seuil(3) === 2, '3 agents → 2 voix');
dire(m.seuil(4) === 3, '4 agents → 3 voix (la majorité STRICTE, pas la moitié)');

titre('Le garde-fou de jouabilité');
dire(m.configJouable(2, 4, 4), '2 agents, plafond 4, indice 4 → jouable');
dire(!m.configJouable(2, 3, 4), '2 agents, plafond FIXE à 3, indice 4 → injouable, et on le dit');
for (let a = 1; a <= 3; a++) {
    for (let n = 1; n <= m.INDICE_MAX; n++) {
        if (!m.configJouable(a, n, n)) {
            dire(false, 'plafond = nombre annoncé', a + ' agents, indice ' + n);
        }
    }
}
dire(true, 'plafond = nombre annoncé → jouable pour tous les couples (agents, indice)');

titre('Le vivier');
dire(vivier.length >= m.TAILLE, vivier.length + ' personnages, il en faut au moins ' + m.TAILLE);
dire(vivier.every(p => p.id && p.nom && p.anime && p.img), 'chaque entrée a id, nom, anime et img');
dire(new Set(vivier.map(p => p.id)).size === vivier.length, 'aucun identifiant en double');

titre('Le tirage de la grille, sur 2000 essais');
let tailleKo = 0, serieKo = 0, doublonKo = 0, pireSerie = 0;
for (let g = 1; g <= 2000; g++) {
    const p = m.tirerPersonnages(vivier, alea(g));
    if (p.length !== m.TAILLE) tailleKo++;
    if (new Set(p.map(x => x.id)).size !== p.length) doublonKo++;
    const parS = {};
    p.forEach(x => { parS[x.anime] = (parS[x.anime] || 0) + 1; });
    const max = Math.max(...Object.values(parS));
    if (max > pireSerie) pireSerie = max;
    if (max > m.MAX_PAR_SERIE) serieKo++;
}
dire(tailleKo === 0, 'toujours exactement ' + m.TAILLE + ' cartes', tailleKo + ' ratés');
dire(doublonKo === 0, 'jamais deux fois le même personnage', doublonKo + ' ratés');
dire(serieKo === 0, 'jamais plus de ' + m.MAX_PAR_SERIE + ' par série (pire vu : ' + pireSerie + ')', serieKo + ' ratés');

titre('La répartition des camps');
let repKo = 0;
for (let g = 1; g <= 500; g++) {
    const grille = m.construireGrille(vivier, g % 2 ? 'A' : 'B', alea(g));
    const c = {};
    grille.forEach(x => { c[x.camp] = (c[x.camp] || 0) + 1; });
    const premier = g % 2 ? 'A' : 'B';
    const second = premier === 'A' ? 'B' : 'A';
    if (c[premier] !== m.CAMP_PREMIER || c[second] !== m.CAMP_SECOND
        || c.neutre !== m.NEUTRES || c.assassin !== 1) repKo++;
}
dire(repKo === 0, '9 / 8 / 7 / 1, et les 9 vont bien à l\'équipe qui commence', repKo + ' ratés');
dire(m.CAMP_PREMIER + m.CAMP_SECOND + m.NEUTRES + 1 === m.TAILLE,
    'la répartition fait bien ' + m.TAILLE);

titre('⚠️ Ce qu\'un AGENT reçoit — aucune couleur ne doit fuiter');
{
    const etat = m.etatNeuf();
    etat.grille = m.construireGrille(vivier, 'A', alea(7));
    etat.grille[3].revelee = true;
    const vue = m.grillePourAgent(etat);
    const fuites = vue.filter(c => !c.revelee && c.camp !== null);
    dire(fuites.length === 0, 'aucune carte cachée ne porte son camp', fuites.length + ' fuites');
    dire(vue[3].camp === etat.grille[3].camp, 'une carte RETOURNÉE porte bien son camp');
    const brut = JSON.stringify(vue);
    dire(!/assassin/.test(brut) || vue[3].camp === 'assassin',
        'le mot « assassin » n\'apparaît pas dans la charge d\'un agent');
    dire(!vue.some(c => c.nom || c.anime || c.id),
        'ni le nom, ni la série, ni l\'identifiant ne partent chez l\'agent');
    const espion = m.grillePourEspion(etat);
    dire(espion.every(c => c.camp), 'l\'espion, lui, voit les 25 camps');
}

titre('Les votes : pose, retrait, plafond');
{
    const etat = m.etatNeuf();
    etat.grille = m.construireGrille(vivier, 'A', alea(11));
    etat.phase = 'vote';
    etat.indice = { nombre: 2 };
    let t = 1000;
    const vote = (qui, idx) => m.basculerVote(etat, qui, idx, 3, t++);

    dire(vote('a', 0).ok, 'un agent pose une marque');
    dire(m.voixDe(etat, 0).length === 1, 'la carte porte une voix');
    dire(vote('a', 0).ok && m.voixDe(etat, 0).length === 0, 're-cliquer retire la marque');

    vote('a', 0); vote('a', 1);
    const trop = vote('a', 2);
    dire(!trop.ok && trop.raison === 'plafond-atteint',
        'au-delà du nombre annoncé, la marque est refusée');
    dire(m.compterMarques(etat, 'a') === 2, 'il en a bien deux, pas trois');

    etat.phase = 'revelation';
    dire(!vote('b', 5).ok, 'hors de la phase de vote, aucune marque ne passe');
}

titre('L\'ordre de franchissement');
{
    const etat = m.etatNeuf();
    etat.grille = m.construireGrille(vivier, 'A', alea(13));
    etat.phase = 'vote';
    etat.indice = { nombre: 3 };
    let t = 1000;
    const vote = (qui, idx) => m.basculerVote(etat, qui, idx, 3, t++);

    vote('a', 7); vote('b', 7);          // carte 7 franchit en premier
    vote('a', 2); vote('c', 2);          // carte 2 en second
    vote('b', 9); vote('c', 9);          // carte 9 en troisième
    dire(JSON.stringify(m.ordreFranchissement(etat)) === '[7,2,9]',
        'l\'ordre suit le franchissement, pas le numéro de carte',
        JSON.stringify(m.ordreFranchissement(etat)));

    // Une carte qui prend une 3e voix ne remonte pas devant.
    vote('c', 7);
    dire(JSON.stringify(m.ordreFranchissement(etat)) === '[7,2,9]',
        'une voix de plus ne change pas l\'ordre');

    // On retire une voix de la carte 2 : elle repasse sous le seuil et sort.
    vote('a', 2);
    dire(JSON.stringify(m.ordreFranchissement(etat)) === '[7,9]',
        'sous le seuil, la carte perd sa place', JSON.stringify(m.ordreFranchissement(etat)));

    // Elle revient : elle repart EN DERNIER, pas à son ancienne place.
    vote('a', 2);
    dire(JSON.stringify(m.ordreFranchissement(etat)) === '[7,9,2]',
        'elle revient en dernier, pas à son ancien rang');
}

titre('Le débordement du quota');
{
    const etat = m.etatNeuf();
    etat.grille = m.construireGrille(vivier, 'A', alea(17));
    etat.phase = 'vote';
    etat.indice = { nombre: 2 };     // 3 agents × 2 marques = 6 voix, seuil 2
    let t = 1000;
    const vote = (qui, idx) => m.basculerVote(etat, qui, idx, 3, t++);
    vote('a', 1); vote('b', 1);
    vote('a', 4); vote('c', 4);
    vote('b', 8); vote('c', 8);
    dire(m.ordreFranchissement(etat).length === 3, 'trois cartes ont franchi le seuil');
    dire(m.engagees(etat).length === 2, 'mais seules DEUX sont engagées — le quota coupe');
    dire(JSON.stringify(m.engagees(etat)) === '[1,4]', 'et ce sont les deux premières');
}

titre('La révélation et la fin de partie');
{
    const etat = m.etatNeuf();
    etat.grille = m.construireGrille(vivier, 'A', alea(23));
    etat.tourDe = 'A';
    etat.restant = { A: m.CAMP_PREMIER, B: m.CAMP_SECOND };

    const idxDe = (camp) => etat.grille.findIndex(c => c.camp === camp && !c.revelee);

    dire(m.revelerCarte(etat, idxDe('A')) === 'bonne', 'une carte de son camp → bonne');
    dire(etat.restant.A === m.CAMP_PREMIER - 1, 'le compteur de l\'équipe descend');
    dire(m.revelerCarte(etat, idxDe('neutre')) === 'neutre', 'une neutre est annoncée comme telle');
    dire(m.revelerCarte(etat, idxDe('B')) === 'adverse', 'une carte adverse → adverse');
    dire(etat.restant.B === m.CAMP_SECOND - 1, 'et elle fait descendre le compteur de l\'ADVERSAIRE');
    const i = idxDe('A');
    m.revelerCarte(etat, i);
    dire(m.revelerCarte(etat, i) === null, 'une carte déjà retournée ne se retourne pas deux fois');

    dire(m.vainqueur(etat, null) === null, 'tant qu\'il reste des cartes, personne n\'a gagné');
    etat.restant.A = 0;
    dire(m.vainqueur(etat, null) === 'A', 'plus de cartes → l\'équipe gagne');
    dire(m.vainqueur(etat, 'A') === 'B', 'l\'assassin touché par A fait gagner B');
    dire(m.vainqueur(etat, 'B') === 'A', 'et réciproquement');
}

titre('Les rôles');
{
    const etat = m.etatNeuf();
    etat.equipes.A = { espion: 'e1', agents: ['a1', 'a2'] };
    etat.equipes.B = { espion: 'e2', agents: ['b1'] };
    dire(m.estEspion(etat, 'e1') && m.estEspion(etat, 'e2'), 'les deux espions sont reconnus');
    dire(!m.estEspion(etat, 'a1'), 'un agent n\'est pas espion');
    dire(m.equipeDe(etat, 'a2') === 'A' && m.equipeDe(etat, 'b1') === 'B', 'chacun dans son équipe');
    dire(m.equipeDe(etat, 'inconnu') === null, 'un inconnu n\'est dans aucune équipe');
    dire(m.agentsPresents(etat, 'A', p => p !== 'a2').length === 1,
        'un agent parti ne compte plus dans les présents');
}

console.log('\n' + (ko ? '❌ ' + ko + ' échec(s) sur ' + (ok + ko)
    : '✨ ' + ok + ' contrôles au vert — le moteur de Codanime tient'));
process.exit(ko ? 1 : 0);
