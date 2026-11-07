// 🕵️ Le moteur de Codanime, éprouvé SANS serveur.
//
// On vérifie ici ce qu'aucune partie jouée à la main ne montrerait de façon
// fiable : la répartition des camps, le plafond par série sur des milliers de
// tirages, l'unanimité, le barème des coups — et surtout qu'AUCUNE couleur ne
// sort vers un agent.
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

titre('Le seuil de voix : L\'UNANIMITÉ');
dire(m.seuil(1) === 1, '1 agent → 1 voix');
dire(m.seuil(2) === 2, '2 agents → 2 voix');
dire(m.seuil(3) === 3, '3 agents → 3 voix — TOUT LE MONDE, plus la majorité');
// ⚠️ Le plancher n'est pas décoratif : à zéro agent présent, un seuil de 0
// ferait partir une carte sur la voix d'un fantôme.
dire(m.seuil(0) === 1, 'à zéro agent présent, le seuil reste à 1 et non à 0');

titre('Le barème des coups');
// ⚠️ `n + 1`, et le « +1 » est le coup de rattrapage : c'est lui qui porte
// toute la stratégie du mode.
dire(m.coupsPour(1) === 2, 'un indice à 1 donne DEUX coups');
dire(m.coupsPour(3) === 4, 'un indice à 3 en donne quatre');
dire(m.coupsPour(9) === 10, 'et un indice à 9 en donne dix');
// ⚠️ 0 et ∞ sont mécaniquement IDENTIQUES — coups illimités. Seule
// l'intention diffère, et c'est l'espion qui la porte à la voix.
dire(m.coupsPour(0) === Infinity, '« 0 » (évitez tout ça) donne des coups ILLIMITÉS, pas un seul');
dire(m.coupsPour(m.INDICE_INFINI) === Infinity, '« ∞ » aussi');
dire(m.INDICE_INFINI === -1, 'l\'∞ voyage en −1 : Infinity se sérialise en null à travers JSON');

titre('Ce qu\'un espion a le droit d\'annoncer');
dire(m.indiceValide(0, 9), '0 passe toujours');
dire(m.indiceValide(m.INDICE_INFINI, 9), '∞ aussi');
dire(m.indiceValide(9, 9), 'le plafond est à 9');
dire(!m.indiceValide(10, 9), 'au-delà, non');
// ⚠️ Borné par ce qu'il RESTE : annoncer 7 quand il reste 2 cartes ne veut
// rien dire, et promettrait des coups que l'équipe ne peut pas honorer.
dire(!m.indiceValide(9, 3), 'et borné par ce qu\'il reste à trouver');
dire(m.indiceValide(3, 3), 'juste ce qu\'il reste, ça passe');
dire(m.indiceValide(m.INDICE_INFINI, 1), '∞ passe même avec une seule carte restante');
dire(!m.indiceValide(-2, 9) && !m.indiceValide(1.5, 9), 'ni un nombre négatif inventé, ni un décimal');

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

// ⚠️ LE PIÈGE ÉTEINT ne retire pas une carte, il la change en PASSANT. La
// grille doit rester à vingt-cinq et les deux camps garder leurs 9 et 8 —
// sinon désactiver le piège raccourcirait aussi la partie, ce que personne
// ne demande en le faisant.
let sansKo = 0;
for (let g = 1; g <= 200; g++) {
    const grille = m.construireGrille(vivier, g % 2 ? 'A' : 'B', alea(g + 900), false);
    const c = {};
    grille.forEach(x => { c[x.camp] = (c[x.camp] || 0) + 1; });
    const premier = g % 2 ? 'A' : 'B';
    const second = premier === 'A' ? 'B' : 'A';
    if (grille.length !== m.TAILLE || c.assassin || c.neutre !== m.NEUTRES + 1
        || c[premier] !== m.CAMP_PREMIER || c[second] !== m.CAMP_SECOND) sansKo++;
}
dire(sansKo === 0, 'piège éteint : plus aucun assassin, un passant de plus, et toujours 25',
    sansKo + ' ratés');
dire(m.etatNeuf().piege === true, 'et il est ALLUMÉ par défaut');

titre('Le mot de l\'indice');
// ⚠️ UN SEUL MOT, ET RIEN QUE DES LETTRES. La règle de Codenames tient en
// un mot, et c'est elle qui rend le jeu difficile : « lame tranchante »
// laisse passer deux indices pour le prix d'un. Et ce n'est pas qu'une
// règle de jeu — le champ est libre et repart vers huit personnes : sans
// ce filtre, c'est une messagerie, avec ses liens et ses émojis.
dire(m.nettoyerMot('  katana  ') === 'katana', 'il est détouré');
dire(m.nettoyerMot('lame tranchante') === 'lame',
    'seul le PREMIER mot survit — un indice de Codenames en fait un seul');
dire(m.nettoyerMot('lame\n\ntranchante') === 'lame', 'et le saut de ligne sépare aussi');
dire(m.nettoyerMot('ka!ta#na') === 'katana', 'la ponctuation tombe');
dire(m.nettoyerMot('http://x.fr/a') === 'httpxfra', 'un lien n\'en est plus un');
dire(m.nettoyerMot('feu\u{1F525}') === 'feu', 'les émojis tombent');
dire(m.nettoyerMot('a\u0007b') === 'ab', 'les caractères de contrôle aussi');
// ⚠️ Les lettres ACCENTUÉES restent : sans le drapeau `u`, la classe
// `\p{L}` les jetterait — et la moitié des indices français avec.
dire(m.nettoyerMot('épée') === 'épée' && m.nettoyerMot('ñandú') === 'ñandú',
    'mais les accents survivent');
dire(m.nettoyerMot('sous-marin') === 'sous-marin',
    'le tiret aussi — « sous-marin » est un mot');
dire(m.nettoyerMot('--feu--') === 'feu' && m.nettoyerMot('a---b') === 'a-b',
    'mais il ne sert pas de décoration');
dire(m.nettoyerMot('x'.repeat(80)).length === m.MOT_MAX,
    'il est borné à ' + m.MOT_MAX + ' signes');
dire(m.nettoyerMot('   ') === '' && m.nettoyerMot(null) === '' && m.nettoyerMot(42) === ''
    && m.nettoyerMot('!!!') === '',
    'et ce qui n\'est pas un mot rend une chaîne vide');

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

titre('Les votes : UNE VOIX PAR AGENT, qui se déplace');
{
    const etat = m.etatNeuf();
    etat.grille = m.construireGrille(vivier, 'A', alea(11));
    etat.phase = 'vote';
    etat.indice = { nombre: 2 };
    const vote = (qui, idx) => m.basculerVote(etat, qui, idx);

    dire(vote('a', 0).ok, 'un agent désigne une carte');
    dire(m.voixDe(etat, 0).length === 1, 'la carte porte une voix');
    dire(vote('a', 0).ok && m.voixDe(etat, 0).length === 0, 're-cliquer retire la voix');

    // ⚠️ LE CŒUR DE LA NOUVELLE RÈGLE. On désigne UNE carte ; cliquer
    // ailleurs DÉPLACE sa voix. Pouvoir en marquer plusieurs n'avait de sens
    // que dans l'ancien modèle, où l'équipe préparait une salve.
    vote('a', 3);
    vote('a', 7);
    dire(m.voixDe(etat, 3).length === 0, 'cliquer ailleurs vide la carte d\'avant');
    dire(m.voixDe(etat, 7).length === 1, 'et la voix se retrouve sur la nouvelle');
    dire(m.voixAilleurs(etat, 'a') === 7, 'un agent n\'a jamais qu\'une voix posée');

    // ⚠️ Sans le retrait AVANT la pose, deux cartes pourraient atteindre
    // l'unanimité avec le même joueur compté deux fois.
    vote('b', 7); vote('c', 7);
    dire(m.voixDe(etat, 7).length === 3, 'trois agents sur la même carte');
    vote('b', 2);
    dire(m.voixDe(etat, 7).length === 2 && m.voixDe(etat, 2).length === 1,
        'celui qui change d\'avis ne laisse rien derrière lui');

    etat.phase = 'revelation';
    dire(!vote('b', 5).ok, 'hors de la phase de vote, aucune voix ne passe');

    etat.phase = 'vote';
    etat.grille[4].revelee = true;
    const dejaVue = vote('a', 4);
    dire(!dejaVue.ok && dejaVue.raison === 'deja-revelee',
        'une carte déjà retournée ne se vote pas');
    dire(!vote('a', 99).ok, 'une carte qui n\'existe pas non plus');
}

titre('L\'unanimité, carte par carte');
{
    const etat = m.etatNeuf();
    etat.grille = m.construireGrille(vivier, 'A', alea(13));
    etat.phase = 'vote';
    etat.indice = { nombre: 3 };
    const vote = (qui, idx) => m.basculerVote(etat, qui, idx);
    const atteinte = (idx, nbAgents) => m.voixDe(etat, idx).length >= m.seuil(nbAgents);

    vote('a', 7); vote('b', 7);
    dire(!atteinte(7, 3), 'à trois agents, deux voix NE SUFFISENT PLUS');
    vote('c', 7);
    dire(atteinte(7, 3), 'la troisième la retourne');

    // ⚠️ Ce sont les PRÉSENTS qui comptent : si l'un part, l'unanimité
    // retombe sur ceux qui restent, sinon l'équipe ne pourrait plus rien
    // retourner du tout.
    const etat2 = m.etatNeuf();
    etat2.grille = m.construireGrille(vivier, 'A', alea(19));
    etat2.phase = 'vote';
    etat2.indice = { nombre: 2 };
    m.basculerVote(etat2, 'a', 5); m.basculerVote(etat2, 'b', 5);
    dire(m.voixDe(etat2, 5).length < m.seuil(3), 'à trois présents, deux voix ne suffisent pas');
    dire(m.voixDe(etat2, 5).length >= m.seuil(2), 'le troisième parti, les deux mêmes voix suffisent');
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

titre('Le réglage « série »');
{
    const liste = m.seriesJouables(vivier);
    const ids = liste.map(s => s.id);
    dire(ids[0] === m.SERIE_DEFAUT, 'Overall ouvre la liste', ids.join(', '));
    dire(liste.every(s => s.n >= m.TAILLE || s.id === m.SERIE_DEFAUT),
        'AUCUNE série en dessous de vingt-cinq n\'est proposée',
        liste.filter(s => s.n < m.TAILLE).map(s => s.nom + ':' + s.n).join(', '));
    dire(ids.includes('naruto') && ids.includes('big3'),
        'Naruto et Big 3 y sont, le vivier les porte');
    // ⚠️ Le compte vient des DONNÉES : la liste doit bouger quand elles
    // bougent, c'est tout l'intérêt. On le vérifie sur un vivier fabriqué.
    const faux = [].concat(
        Array.from({ length: 30 }, (_, i) => ({ id: 'x' + i, nom: 'X' + i, anime: 'Niche', img: 'x.webp' })),
        Array.from({ length: 4 }, (_, i) => ({ id: 'y' + i, nom: 'Y' + i, anime: 'Trop Peu', img: 'y.webp' })));
    const l2 = m.seriesJouables(faux).map(s => s.id);
    dire(l2.includes('niche') && !l2.includes('troppeu'),
        'une série inventée entre dès qu\'elle atteint la barre, l\'autre non', l2.join(', '));

    dire(m.vivierPour(vivier, 'naruto').every(p => p.anime === 'Naruto'),
        'le filtre d\'une série ne garde que cette série');
    dire(m.vivierPour(vivier, 'big3').every(p => ['One Piece', 'Naruto', 'Bleach'].includes(p.anime)),
        'et Big 3 ses trois séries');

    // ⚠️ Protagonistes se lit sur le PERSONNAGE et non sur sa série : c'est
    // l'autre façon de dire un groupe, et les deux passent par la même
    // fonction. Si elle divergeait, le tiroir proposerait une entrée que le
    // tirage ne saurait pas remplir.
    const heros = m.vivierPour(vivier, 'protago');
    dire(heros.length >= m.TAILLE && heros.every(p => p.protago),
        'Protagonistes ne garde que ceux qui portent le drapeau', heros.length + ' héros');
    // ⚠️ PRESQUE un héros par série, et pas tout à fait : JoJo en a trois,
    // un par partie, ce qui est juste. Ce qui compte n'est donc pas l'unicité
    // mais que le plafond par série tienne — sans quoi un plateau
    // « Protagonistes » pourrait sortir quatre JoJo et perdre ce qui fait ce
    // filtre : vingt-cinq mangas différents sur la table.
    {
        const parSerie = new Map();
        for (const p of heros) parSerie.set(p.anime, (parSerie.get(p.anime) || 0) + 1);
        const trop = [...parSerie.entries()].filter(([, n]) => n > m.MAX_PAR_SERIE);
        dire(trop.length === 0, 'aucune série n\'y dépasse le plafond du tirage',
            trop.map(([a, n]) => a + ':' + n).join(', '));
        dire(parSerie.size >= m.TAILLE, 'et il reste assez de séries pour un plateau entier',
            parSerie.size + ' séries');
    }
    dire(m.seriesJouables(vivier).some(s => s.id === 'protago'),
        'le groupe est proposé dans le tiroir');
    dire(m.vivierPour(vivier, 'overall').length === vivier.length, 'Overall ne filtre rien');
    // ⚠️ LE REPLI. Une série qui n'a plus de quoi jouer ne doit pas rendre un
    // salon impossible à démarrer — surtout un salon ouvert avant le retrait.
    dire(m.vivierPour(vivier, 'tokyoghoul').length === vivier.length,
        'une série trop courte retombe sur tout le vivier');
    dire(m.serieValide(vivier, 'naruto') && !m.serieValide(vivier, 'tokyoghoul'),
        'et elle n\'est pas acceptée par la route');

    // ⚠️ LE PLAFOND PAR SÉRIE DOIT SAUTER SUR UN VIVIER D'UNE SEULE SÉRIE.
    // Sinon le tour de table n'en prend que trois et les vingt-deux autres
    // tombent dans la voie de secours : le résultat serait bon par accident.
    const seul = m.vivierPour(vivier, 'naruto');
    const g = m.tirerPersonnages(seul, alea(7));
    dire(g.length === m.TAILLE, 'vingt-cinq cartes sur une seule série', String(g.length));
    dire(new Set(g.map(p => p.id)).size === m.TAILLE, 'toutes différentes');
    dire(g.every(p => p.anime === 'Naruto'), 'et toutes de la série demandée');

    // Deux plateaux d'affilée ne se ressemblent pas, même sur une série juste
    // au-dessus de la barre : c'est ce qui rend « 25 pile » acceptable.
    const a = m.construireGrille(seul, 'A', alea(11), true).map(c => c.id).join();
    const b = m.construireGrille(seul, 'A', alea(29), true).map(c => c.id).join();
    dire(a !== b, 'deux tirages de la même série ne donnent pas le même plateau');
}

console.log('\n' + (ko ? '❌ ' + ko + ' échec(s) sur ' + (ok + ko)
    : '✨ ' + ok + ' contrôles au vert — le moteur de Codanime tient'));
process.exit(ko ? 1 : 0);
