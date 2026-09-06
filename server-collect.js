// ══════════════════════════════════════════════════════════════
// 🎴 Collect — le moteur
// ══════════════════════════════════════════════════════════════
//
// Réunis trois cartes du même anime et pose le set. Le premier à deux sets
// gagne. À ton tour, une seule action : piocher, échanger avec le marché,
// voler un anime à un adversaire, scanner sa main, ou poser un set.
//
// Poser ne refait pas la main : on repart avec ce qui reste et l'on met
// plusieurs tours à se refaire. C'est le prix du point — et c'est ce qui rend
// la pioche utile, puisqu'elle ajoute une carte tant que la main n'est pas
// pleine au lieu d'en échanger une.
//
// Ce fichier ne connaît ni socket ni salon : il reçoit un état et le fait
// avancer. C'est ce qui permet de l'éprouver sans serveur (npm run test:collect).
//
// Les réglages ne sont pas au jugé. Trois choses viennent de mesures, et les
// changer casse le jeu :
//
//  · DEUX sets de trois, pas trois. À trois sets, les cartes posées quittent
//    le jeu plus vite qu'elles ne circulent et 70 à 96 % des parties n'ont
//    aucun vainqueur.
//  · Le vol est CIBLÉ. Voler au hasard ne converge pas : 18 % de parties sans
//    vainqueur, contre 1 % en annonçant l'anime.
//  · HUIT animes au minimum. À quatre, une main servie complète un set du
//    premier coup une partie sur quatorze ; à dix, une sur sept cents.
//
// Et la taille de main est liée à l'objectif : une main de trois avec des sets
// de trois demanderait toute la main d'un seul anime, sans réserve possible —
// 22 % de parties sans vainqueur. D'où le réglage « durée », qui déplace les
// deux ensemble au lieu d'exposer la taille de main seule.

const DATA = require('./collectdata.json');

// ── Réglages ──────────────────────────────────────────────────
const CONFIG = {
    MIN_JOUEURS: 2,
    MAX_JOUEURS: 6,
    MARCHE: 5,              // cartes face visible, taille constante
    TOUR_MS: 15000,
    ANIMES_POSSIBLES: [8, 10, 12],
    ANIMES_DEFAUT: 10,
    MAINS_POSSIBLES: [3, 4, 5],
    MAIN_DEFAUT: 4,
};

// L'hôte ne choisit qu'une chose : combien de cartes en main. L'objectif suit
// tout seul, parce qu'il ne se choisit pas séparément — avec trois cartes en
// main, un set de trois exigerait toute la main d'un seul anime, sans jamais
// pouvoir garder une carte de réserve.
//
// Les trois barèmes tournent tous autour de cinq à six tours de table : la
// taille de main change la TENSION, pas la durée. À trois cartes on étouffe et
// l'objectif est simple ; à cinq on respire et il devient ambitieux.
const BAREMES = {
    3: { main: 3, taille: 2, sets: 3, nom: '3 cartes', resume: '3 paires' },
    4: { main: 4, taille: 3, sets: 2, nom: '4 cartes', resume: '2 sets de 3' },
    5: { main: 5, taille: 3, sets: 3, nom: '5 cartes', resume: '3 sets de 3' },
};

// Le scan RETIENT le tour sept secondes. Il ne fallait pas qu'il le passe
// aussitôt : la main scannée reste retournée pendant ce temps, et si le joueur
// suivant agissait dans l'intervalle, ce qu'on lisait devenait faux sous nos
// yeux. Sept secondes, la table s'arrête, puis on enchaîne.
const SCAN_MS = 7000;

// Les trois classes. Elles ne se battent plus entre elles — le cycle « Assaut
// bat Mirage bat Oracle » a disparu avec le duel — mais elles décident de ce
// que coûte un vol : rendre une carte de la même classe, ou deux à défaut.
// Il n'y a donc plus rien à apprendre par cœur, seulement à faire correspondre.
const CLASSES = { assaut: 'Assaut', mirage: 'Mirage', oracle: 'Oracle' };

// ── Le paquet ─────────────────────────────────────────────────
const CARTES_PAR_ANIME = {};
for (const c of DATA.cartes) (CARTES_PAR_ANIME[c.anime] = CARTES_PAR_ANIME[c.anime] || []).push(c);

const melanger = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

// Chaque carte distribuée reçoit un identifiant propre : le même personnage
// peut réapparaître après un remélange, et les deux exemplaires doivent
// pouvoir être désignés séparément.
let compteurUid = 0;
const instancier = (modele) => ({
    uid: 'c' + (++compteurUid),
    id: modele.id, nom: modele.nom, anime: modele.anime,
    classe: modele.classe, img: modele.img,
});

function etatNeuf() {
    return {
        active: false,
        main: CONFIG.MAIN_DEFAUT,
        nbAnimes: CONFIG.ANIMES_DEFAUT,
        animes: [],
        pioche: [],
        marche: [],
        ordre: [],
        mains: new Map(),      // playerId → [carte]
        sets: new Map(),       // playerId → [{ anime, cartes }]
        tourIndex: 0,
        tourJoueur: null,
        tourFin: 0,
        tourTimer: null,
        viseeTimer: null,
        larcinTimer: null,
        scanTimer: null,
        debut: 0,
        visee: null,         // un voleur qui cherche sa place dans une main
        larcin: null,        // un vol pris, en attente de son paiement
        scan: null,          // un scan qui retient la table sept secondes
        vainqueur: null,
        journal: [],           // les derniers faits, pour l'écran de tous
    };
}

const regles = (etat) => BAREMES[etat.main] || BAREMES[CONFIG.MAIN_DEFAUT];

// ── La pioche ne s'épuise jamais ──────────────────────────────
// Mesuré : même à dix cartes par joueur, un paquet fini ne se vide jamais —
// les joueurs posent trop vite. Plutôt que d'écrire une règle de fin par
// épuisement qu'on ne verrait jamais, on remélange. Une règle de moins.
function remplirPioche(etat) {
    const modeles = [];
    for (const a of etat.animes) modeles.push(...CARTES_PAR_ANIME[a]);
    etat.pioche = melanger(modeles.map(instancier));
}

function tirer(etat) {
    if (!etat.pioche.length) remplirPioche(etat);
    return etat.pioche.pop();
}

// Deux circuits, et il faut les distinguer.
//
// Le MARCHÉ reçoit ce qu'un joueur rejette volontairement — sa défausse quand
// il pioche. C'est public, convoité, et sa taille ne bouge jamais : la plus
// ancienne carte repart dans le paquet quand une nouvelle arrive.
//
// Le PAQUET reprend ce qu'on perd au vol. Une carte lâchée pour solder un
// larcin ne doit pas atterrir sous les yeux de tous — elle disparaît, anonyme,
// et reviendra plus tard sans qu'on sache d'où elle vient.
function rendreAuPaquet(etat, carte) {
    etat.pioche.splice(Math.floor(Math.random() * (etat.pioche.length + 1)), 0, carte);
}

// La plus ancienne carte du marché part SOUS le paquet, et une neuve arrive
// du dessus. « Sous », et non mêlée au hasard : une carte qu'on vient de voir
// partir ne doit pas pouvoir revenir au tour suivant. Le fond de la pile, c'est
// la promesse qu'on ne la reverra pas de sitôt.
//
// (« tirer » prend par le haut, avec « pop » : le bas de la pile est donc
// l'index zéro.)
function sousLePaquet(etat, carte) {
    etat.pioche.unshift(carte);
}

// ⚠️ DEUX MOUVEMENTS, ET IL FAUT LES DISTINGUER.
//
// Le RENOUVELLEMENT de fin de tour est un TAPIS ROULANT : la carte de gauche
// s'en va, tout glisse d'un cran, une neuve entre par la droite. La position
// dit alors exactement combien de tours il reste à chaque carte — la première
// part au prochain, la dernière dans cinq. C'est un renseignement qu'on lit
// sans y penser, et le glissement se voit de loin.
//
// L'ÉCHANGE, lui, se fait SUR PLACE : chacune prend la place de l'autre et
// rien d'autre ne bouge. Faire glisser toute la rangée pour un troc qui n'en
// concerne qu'une la rendait illisible — la carte rendue entrait par la droite
// comme une carte neuve, et l'on ne savait plus ce qu'on regardait.
//
// Les deux ne se croisent jamais : un échange ne renouvelle pas le marché
// (voir « tourSuivant(etat, false) »), et le renouvellement ne touche à aucune
// place au hasard. Une seule chose bouge à la fois.
function renouvelerMarche(etat) {
    if (!etat.marche.length) return;
    sousLePaquet(etat, etat.marche.shift());
    etat.marche.push(tirer(etat));
}

// ── Démarrage ─────────────────────────────────────────────────
function demarrer(etat, joueurs) {
    if (joueurs.length < CONFIG.MIN_JOUEURS) return { ok: false, erreur: `Il faut au moins ${CONFIG.MIN_JOUEURS} joueurs` };
    if (joueurs.length > CONFIG.MAX_JOUEURS) return { ok: false, erreur: `Maximum ${CONFIG.MAX_JOUEURS} joueurs` };

    const dispo = melanger(DATA.animes.slice());
    etat.animes = dispo.slice(0, Math.min(etat.nbAnimes, dispo.length));
    remplirPioche(etat);

    const r = regles(etat);
    etat.ordre = melanger(joueurs.slice());
    etat.mains = new Map();
    etat.sets = new Map();
    for (const id of etat.ordre) {
        etat.mains.set(id, Array.from({ length: r.main }, () => tirer(etat)));
        etat.sets.set(id, []);
    }
    etat.marche = Array.from({ length: CONFIG.MARCHE }, () => tirer(etat));

    etat.active = true;
    etat.vainqueur = null;
    etat.journal = [];
    etat.tourIndex = 0;
    etat.tourJoueur = etat.ordre[0];
    return { ok: true };
}

// ── Tour ──────────────────────────────────────────────────────
// L'échange est le seul geste qui SERT déjà le marché : la carte prise y est
// remplacée par celle qu'on rend, la rangée reste pleine et elle a changé. Y
// verser une carte de plus en fin de tour la faisait donc tourner deux fois
// d'un coup, et l'on perdait de vue ce qu'on venait d'y déposer.
function tourSuivant(etat, renouveler = true) {
    if (!etat.active) return;
    if (renouveler) renouvelerMarche(etat);
    etat.tourIndex = (etat.tourIndex + 1) % etat.ordre.length;
    etat.tourJoueur = etat.ordre[etat.tourIndex];
}

const carteParUid = (liste, uid) => liste.findIndex(c => c.uid === uid);

function verifierTour(etat, playerId) {
    if (!etat.active) return 'La partie n\'est pas en cours';
    // Un vol attend sa défense : tant qu'il n'est pas tranché, plus personne ne
    // joue — pas même celui dont c'est le tour.
    if (etat.visee) return 'Un vol est en cours';
    if (etat.larcin) return 'Un vol est en cours';
    // Un scan retient la table le temps qu'on lise la main
    if (etat.scan) return 'Un scan est en cours';
    if (etat.tourJoueur !== playerId) return 'Ce n\'est pas ton tour';
    if (!etat.mains.has(playerId)) return 'Tu n\'es pas dans cette partie';
    return null;
}

function noter(etat, fait) {
    etat.journal.push(fait);
    if (etat.journal.length > 30) etat.journal.shift();
}

// ── Les cinq actions ──────────────────────────────────────────

// Chaque action fait entrer une carte et en fait sortir une — vers le MARCHÉ,
// où tout le monde la voit et peut la reprendre. La main garde donc sa taille.
//
// Ce n'est pas une coquetterie : avec un plafond dur, la main est pleine dès la
// donne, et ni la pioche ni le vol ne sont plus jamais disponibles — or le vol
// est ce qui fait converger la partie. En rendant tout symétrique, chaque
// action reste ouverte à chaque tour, il n'y a plus aucun cas limite à écrire,
// et le prix à payer devient le choix de ce qu'on abandonne aux autres.
function actionPiocher(etat, playerId, uidDefausse) {
    const ko = verifierTour(etat, playerId);
    if (ko) return { ok: false, erreur: ko };
    const main = etat.mains.get(playerId);

    // main incomplète (juste après une pose) : on se sert sans rien lâcher
    if (main.length < regles(etat).main) {
        main.push(tirer(etat));
    } else {
        const i = carteParUid(main, uidDefausse);
        if (i < 0) return { ok: false, erreur: 'Choisis la carte à rendre' };
        rendreAuPaquet(etat, main[i]);
        main[i] = tirer(etat);
    }
    noter(etat, { type: 'pioche', joueur: playerId });
    tourSuivant(etat);
    return { ok: true };
}

// Prendre au marché coûte une carte : il garde donc sa taille et ne se vide
// jamais. C'est aussi ce qui remplace la défausse — ce qu'on rend est vu de
// tous, et nourrit forcément quelqu'un.
function actionEchanger(etat, playerId, uidMain, uidMarche) {
    const ko = verifierTour(etat, playerId);
    if (ko) return { ok: false, erreur: ko };
    const main = etat.mains.get(playerId);
    const iMain = carteParUid(main, uidMain);
    const iMarche = carteParUid(etat.marche, uidMarche);
    if (iMain < 0) return { ok: false, erreur: 'Cette carte n\'est pas dans ta main' };
    if (iMarche < 0) return { ok: false, erreur: 'Cette carte n\'est plus au marché' };

    // Chacune prend la place de l'autre, sans que rien d'autre ne bouge. La
    // rendue hérite donc du rang de la prise dans la file : prendre la carte de
    // gauche, c'est y laisser la sienne pour un seul tour. Ce n'est pas une
    // punition — on est souvent content de voir sa défausse disparaître vite —
    // et la flèche sous la première carte le dit à qui regarde.
    const prise = etat.marche[iMarche];
    const rendue = main[iMain];
    main[iMain] = prise;
    etat.marche[iMarche] = rendue;
    noter(etat, { type: 'echange', joueur: playerId, prise, rendue });
    tourSuivant(etat, false);
    return { ok: true, prise };
}

// ── Le vol : on prend à l'aveugle, et l'on paie ───────────────
//
// Le voleur désigne une carte dans la main d'un adversaire — une carte DE DOS,
// il ne choisit qu'une position. Elle se retourne pour toute la table, et il
// doit alors rendre une carte de LA MÊME CLASSE. S'il n'en a aucune, il en
// rend DEUX, de n'importe quelle classe.
//
// Le hasard n'en est un que pour l'étourdi : les positions ne bougent pas d'un
// tour à l'autre — une pioche remplace la carte lâchée à sa place, un échange
// aussi — et l'on voit une carte entrer dans la main d'un adversaire. Qui suit
// sait ce qu'il prend. Le scan, lui, sert deux fois : il donne la position ET
// la classe, donc le prix qu'on va payer.
//
// C'est ce qui a remplacé le duel de classes. Le duel était élégant — un
// pierre-feuille-ciseaux à l'aveugle — mais il ratait une fois sur deux, il
// demandait un cycle à apprendre, et il ouvrait une fenêtre par joueur. Ici le
// vol aboutit toujours, la règle tient en cinq mots, et la classe reste la
// chose qui décide : elle ne décide plus de qui gagne, mais de ce que ça coûte.
// Premier temps : on ANNONCE qu'on va prendre chez quelqu'un. Le serveur le
// sait, donc toute la table le voit et le même compte à rebours tourne pour
// tout le monde — sept secondes, puis la place est tirée au sort. Sans ce
// passage par le serveur, le viseur ne vivait que sur l'écran du voleur et
// personne d'autre ne comprenait pourquoi la table s'était arrêtée.
function actionViser(etat, playerId, cibleId) {
    const ko = verifierTour(etat, playerId);
    if (ko) return { ok: false, erreur: ko };
    if (cibleId === playerId) return { ok: false, erreur: 'Choisis un adversaire' };
    const mainCible = etat.mains.get(cibleId);
    if (!mainCible) return { ok: false, erreur: 'Ce joueur n\'est pas dans la partie' };
    if (!mainCible.length) return { ok: false, erreur: 'Il n\'a plus rien à prendre' };
    etat.visee = { voleur: playerId, cible: cibleId, fin: 0 };
    noter(etat, { type: 'visee', joueur: playerId, cible: cibleId });
    return { ok: true, visee: true };
}

// On se ravise. Le tour reprend son cours, on n'a rien perdu.
function annulerVisee(etat, playerId) {
    if (!etat.visee || etat.visee.voleur !== playerId) {
        return { ok: false, erreur: 'Tu ne vises personne' };
    }
    etat.visee = null;
    // le fait annoncé n'a plus eu lieu : on le retire plutôt que de laisser
    // « X vise Y » traîner dans le journal de tout le monde
    if (etat.journal.length && etat.journal[etat.journal.length - 1].type === 'visee') {
        etat.journal.pop();
    }
    return { ok: true };
}

// Sept secondes sans choisir : la place est tirée au sort. Ce n'est pas une
// punition — à l'aveugle, une place en vaut une autre pour qui n'a rien suivi.
function viseeParDefaut(etat) {
    const v = etat.visee;
    if (!v) return { ok: false, erreur: 'Personne ne vise' };
    const main = etat.mains.get(v.cible) || [];
    if (!main.length) { etat.visee = null; tourSuivant(etat); return { ok: true, issue: 'vide' }; }
    return actionVoler(etat, v.voleur, v.cible, Math.floor(Math.random() * main.length));
}

function actionVoler(etat, playerId, cibleId, index) {
    // La visée tient lieu d'autorisation : « verifierTour » refuserait, puisque
    // c'est justement elle qui bloque la table.
    const v = etat.visee;
    if (!v || v.voleur !== playerId || v.cible !== cibleId) {
        return { ok: false, erreur: 'Tu ne vises pas ce joueur' };
    }
    const mainCible = etat.mains.get(cibleId);
    if (!mainCible) return { ok: false, erreur: 'Ce joueur n\'est pas dans la partie' };
    const i = Number(index);
    if (!Number.isInteger(i) || i < 0 || i >= mainCible.length) {
        return { ok: false, erreur: 'Cette carte n\'existe pas' };
    }

    etat.visee = null;
    // Elle quitte sa main et se retourne pour tout le monde : c'est le moment
    // du mode, et il a lieu même quand le vol va rater.
    const carte = mainCible.splice(i, 1)[0];
    const main = etat.mains.get(playerId) || [];
    // La classe décide de TOUT : on ne peut prendre une carte que si l'on a de
    // quoi la remplacer chez soi. Sans elle, le vol échoue — la carte retourne
    // à son propriétaire — et l'on paie quand même deux cartes d'avoir tenté à
    // l'aveugle. C'est ce qui donne son prix au scan : lui seul dit à l'avance
    // ce qu'on va trouver, donc si le coup est jouable.
    const du = main.some(c => c.classe === carte.classe) ? 1 : 2;
    etat.larcin = {
        voleur: playerId, cible: cibleId, carte, classe: carte.classe,
        place: i, du,
        // On rend ce qu'on a, quitte à finir les mains vides : le geste reste
        // permis à qui n'a plus qu'une carte, il lui coûte simplement tout.
        aRendre: Math.min(du, main.length),
        fin: 0,
    };
    noter(etat, { type: 'prise', joueur: playerId, cible: cibleId, carte: { ...carte }, du });
    return { ok: true, larcin: true, carte, du };
}

// Le voleur solde sa dette. Il choisit lui-même ce qu'il lâche — parmi les
// cartes de la bonne classe s'il en a — et tout repart au paquet : ce n'est pas
// une défausse choisie, personne ne doit pouvoir la ramasser au marché.
function actionPayer(etat, playerId, uids) {
    const l = etat.larcin;
    if (!l) return { ok: false, erreur: 'Aucun vol en cours' };
    if (l.voleur !== playerId) return { ok: false, erreur: 'Ce n\'est pas toi qui voles' };

    const main = etat.mains.get(playerId) || [];
    const choisies = [...new Set(uids || [])];
    if (choisies.length !== l.aRendre) {
        return { ok: false, erreur: l.aRendre === 1 ? 'Rends une carte' : `Rends ${l.aRendre} cartes` };
    }
    const index = choisies.map(u => carteParUid(main, u));
    if (index.some(k => k < 0)) return { ok: false, erreur: 'Cette carte n\'est pas dans ta main' };
    if (l.du === 1 && main[index[0]].classe !== l.classe) {
        return { ok: false, erreur: 'Il faut une carte de la même classe' };
    }

    // du plus grand indice au plus petit, sinon les suivants glissent
    const rendues = index.sort((a, b) => b - a).map(k => main.splice(k, 1)[0]);
    for (const c of rendues) rendreAuPaquet(etat, c);

    if (l.du === 1) {
        main.push(l.carte);
    } else {
        // Le vol a raté : la carte retourne À SA PLACE chez son propriétaire.
        // À sa place, et pas au bout : les positions sont ce sur quoi tout le
        // monde compte pour viser, et une carte qui reviendrait ailleurs
        // fausserait la mémoire de toute la table.
        const chezElle = etat.mains.get(l.cible);
        if (chezElle) chezElle.splice(Math.min(l.place, chezElle.length), 0, l.carte);
        else rendreAuPaquet(etat, l.carte);
    }

    noter(etat, {
        type: 'vol', joueur: playerId, cible: l.cible,
        carte: { ...l.carte }, rendues: rendues.map(c => ({ ...c })),
        du: l.du, issue: l.du === 1 ? 'pris' : 'rate',
    });
    etat.larcin = null;
    tourSuivant(etat);
    return { ok: true, issue: l.du === 1 ? 'pris' : 'rate', rendues };
}

// Le voleur n'a pas payé à temps. On solde à sa place, au moins mauvais choix :
// ses cartes les plus isolées, celles qui ne cassent aucune série en cours.
// Un joueur parti ne doit pas figer la table, et il ne doit pas non plus s'en
// tirer mieux qu'un joueur présent.
function larcinParDefaut(etat) {
    const l = etat.larcin;
    if (!l) return { ok: false, erreur: 'Aucun vol en cours' };
    const main = etat.mains.get(l.voleur) || [];
    const par = {};
    for (const c of main) par[c.anime] = (par[c.anime] || 0) + 1;
    const eligibles = l.du === 1 ? main.filter(c => c.classe === l.classe) : main.slice();
    eligibles.sort((a, b) => par[a.anime] - par[b.anime]);
    return actionPayer(etat, l.voleur, eligibles.slice(0, l.aRendre).map(c => c.uid));
}


// Le scan ne rend rien : il informe. C'est lui qui rend le vol sûr, au prix
// d'un tour.
function actionScanner(etat, playerId, cibleId) {
    const ko = verifierTour(etat, playerId);
    if (ko) return { ok: false, erreur: ko };
    if (cibleId === playerId) return { ok: false, erreur: 'Choisis un adversaire' };
    const cible = etat.mains.get(cibleId);
    if (!cible) return { ok: false, erreur: 'Ce joueur n\'est pas dans la partie' };

    noter(etat, { type: 'scan', joueur: playerId, cible: cibleId });
    // On ne passe PAS la main ici : « apresAction » pose un minuteur de sept
    // secondes, et c'est lui qui enchaînera. Voir « SCAN_MS ».
    etat.scan = { par: playerId, cible: cibleId, fin: 0 };
    // la main scannée ne part qu'au scanneur, jamais au salon
    return { ok: true, main: cible.map(c => ({ ...c })) };
}

// Le scan se referme : la main passe. C'est « apresAction » qui l'appelle au
// bout de sept secondes, mais la fonction vit ICI pour que le moteur reste
// éprouvable sans serveur — sinon un scan ouvert bloquait la table à jamais
// dans une partie simulée.
function finirScan(etat) {
    if (!etat.scan) return false;
    etat.scan = null;
    tourSuivant(etat);
    return true;
}

function actionPoser(etat, playerId, anime) {
    const ko = verifierTour(etat, playerId);
    if (ko) return { ok: false, erreur: ko };
    const r = regles(etat);
    const main = etat.mains.get(playerId);
    const memes = main.filter(c => c.anime === anime);
    if (memes.length < r.taille) return { ok: false, erreur: `Il t'en faut ${r.taille} du même anime` };

    const poses = memes.slice(0, r.taille);
    const gardees = [];
    const aRetirer = new Set(poses.map(c => c.uid));
    for (const c of main) if (!aRetirer.has(c.uid)) gardees.push(c);
    etat.mains.set(playerId, gardees);

    const sets = etat.sets.get(playerId);
    sets.push({ anime, cartes: poses });
    // Les cartes posées sont PUBLIQUES : elles quittent la main pour un tas
    // visible de tous. Le journal les porte, ce qui permet aux autres écrans de
    // montrer le set partir — sans elles, poser un set ne se voyait de nulle part
    // ailleurs que de sa propre main.
    noter(etat, { type: 'set', joueur: playerId, anime, total: sets.length,
                  cartes: poses.map(c => ({ ...c })) });

    if (sets.length >= r.sets) {
        etat.vainqueur = playerId;
        etat.active = false;
        return { ok: true, vainqueur: playerId };
    }

    // La main NE se refait PAS. Poser doit coûter : sinon on rend trois cartes
    // et l'on en reçoit trois neuves dans le même geste, avec une chance de
    // reformer un set aussitôt. On repart donc avec ce qui reste, et il faut
    // plusieurs tours de pioche pour se refaire — c'est ce qui redonne son sens
    // à la pioche, qui n'était jusqu'ici qu'un échange déguisé.
    //
    // Mesuré : la partie tient toujours (aucun blocage) et passe de cinq à huit
    // tours de table à main de quatre.
    tourSuivant(etat);
    return { ok: true };
}

// Le minuteur a expiré : on PASSE, on ne joue pas à la place du joueur.
//
// On piochait autrefois pour lui, en rendant sa carte la plus isolée. C'était
// bien intentionné et c'était faux : la pioche est un choix, et le minuteur le
// prenait à sa place — y compris pendant qu'il traînait une carte, qui lui
// était alors arrachée des doigts. Une main hésitante n'est pas une main
// absente. Passer ne coûte que le tour, et ne décide de rien.
function actionParDefaut(etat, playerId) {
    const ko = verifierTour(etat, playerId);
    if (ko) return { ok: false, erreur: ko };
    noter(etat, { type: 'passe', joueur: playerId });
    tourSuivant(etat);
    return { ok: true };
}

// ── Ce que chacun voit ────────────────────────────────────────
// La main d'un joueur ne sort jamais du serveur, sauf vers lui — et vers celui
// qui vient de la scanner, par le retour de « actionScanner ».
function vuePublique(etat) {
    const r = regles(etat);
    return {
        active: etat.active,
        main: r.main, bareme: r.nom, resume: r.resume,
        taille: r.taille, setsPourGagner: r.sets, mainMax: r.main,
        animes: etat.animes,
        marche: etat.marche.map(c => ({ ...c })),
        tourJoueur: etat.tourJoueur,
        tourFin: etat.tourFin,
        // Depuis combien de temps la partie tourne. C'est ce qui permet au
        // client de savoir s'il assiste au début ou s'il arrive en cours : sans
        // ça, un joueur qui se rafraîchit revoyait toute la distribution.
        depuis: etat.debut ? Date.now() - etat.debut : 0,
        // Qui vise qui, et jusqu'à quand. La table doit comprendre pourquoi
        // elle s'est arrêtée — et la cible mérite de voir venir le coup.
        visee: etat.visee ? { voleur: etat.visee.voleur, cible: etat.visee.cible, fin: etat.visee.fin } : null,
        // Le vol en cours se montre ENTIÈREMENT, carte comprise : elle vient de
        // se retourner devant tout le monde, c'est le moment du mode. Seul le
        // paiement reste à venir, et il n'a rien de secret non plus.
        larcin: etat.larcin ? {
            voleur: etat.larcin.voleur, cible: etat.larcin.cible,
            carte: { ...etat.larcin.carte }, classe: etat.larcin.classe,
            du: etat.larcin.du, aRendre: etat.larcin.aRendre, fin: etat.larcin.fin,
        } : null,
        // Qui scanne qui, et jusqu'à quand — JAMAIS les cartes. Celui qui se
        // fait lire a le droit de le savoir : c'est ce qui l'avertit que sa
        // main vient d'être vue, donc que son bluff ne tient plus.
        scan: etat.scan ? { par: etat.scan.par, cible: etat.scan.cible, fin: etat.scan.fin } : null,
        vainqueur: etat.vainqueur,
        joueurs: etat.ordre.map(id => ({
            playerId: id,
            cartes: (etat.mains.get(id) || []).length,
            sets: (etat.sets.get(id) || []).map(s => ({ anime: s.anime, cartes: s.cartes.map(c => ({ ...c })) })),
        })),
        journal: etat.journal.slice(-8),
    };
}

function vueJoueur(etat, playerId) {
    return {
        ...vuePublique(etat),
        moi: playerId,
        main: (etat.mains.get(playerId) || []).map(c => ({ ...c })),
    };
}

// ══════════════════════════════════════════════════════════════
// 🔌 Le raccord au salon
// ══════════════════════════════════════════════════════════════
//
// Tout ce qui précède ignore les sockets. À partir d'ici on relie le moteur à
// un salon : minuteries, diffusion, et les mains qui ne partent qu'à leur
// propriétaire.

// Les deux temps du vol durent la même chose : sept secondes pour désigner
// une place chez l'autre, sept pour désigner ce qu'on lâche chez soi. C'est la
// durée du scan, et ce n'est pas un hasard — ce sont les trois moments où la
// table entière attend une seule personne.
const VISEE_MS = 7000;
const LARCIN_MS = 7000;

// Le pseudo d'un joueur, pour le journal — le moteur ne connaît que des
// identifiants.
function pseudos(gameState) {
    const m = {};
    for (const p of gameState.players.values()) m[p.playerId] = p.username;
    return m;
}

// La main d'un joueur ne part QUE vers lui. Tout le reste va au salon.
function diffuserEtat(gameState, io) {
    const etat = gameState.collect;
    const publique = { ...vuePublique(etat), pseudos: pseudos(gameState) };
    io.to(gameState.roomCode).emit('collect-state', publique);
    for (const p of gameState.players.values()) {
        if (!etat.mains.has(p.playerId)) continue;
        io.to(p.socketId).emit('collect-main', { main: etat.mains.get(p.playerId).map(c => ({ ...c })) });
    }
}

function stopperMinuteries(etat) {
    if (etat.tourTimer) { clearTimeout(etat.tourTimer); etat.tourTimer = null; }
    if (etat.viseeTimer) { clearTimeout(etat.viseeTimer); etat.viseeTimer = null; }
    if (etat.larcinTimer) { clearTimeout(etat.larcinTimer); etat.larcinTimer = null; }
    if (etat.scanTimer) { clearTimeout(etat.scanTimer); etat.scanTimer = null; }
}

// Après CHAQUE action : on remet la bonne minuterie en marche, on diffuse, et
// l'on regarde si quelqu'un a gagné. Un seul endroit, pour qu'aucun chemin ne
// puisse oublier l'un des trois.
function apresAction(gameState, io, onGameEnd) {
    const etat = gameState.collect;
    stopperMinuteries(etat);

    if (!etat.active) {
        diffuserEtat(gameState, io);
        if (etat.vainqueur && onGameEnd) onGameEnd(etat.vainqueur);
        return;
    }

    if (etat.visee) {
        // Il cherche sa place. Toute la table voit le même compte à rebours.
        etat.visee.fin = Date.now() + VISEE_MS;
        etat.tourFin = etat.visee.fin;
        etat.viseeTimer = setTimeout(() => {
            viseeParDefaut(etat);
            apresAction(gameState, io, onGameEnd);
        }, VISEE_MS);
    } else if (etat.larcin) {
        // La carte est retournée, la table s'arrête : le voleur doit payer.
        etat.larcin.fin = Date.now() + LARCIN_MS;
        etat.tourFin = etat.larcin.fin;
        etat.larcinTimer = setTimeout(() => {
            larcinParDefaut(etat);
            apresAction(gameState, io, onGameEnd);
        }, LARCIN_MS);
    } else if (etat.scan) {
        // Sept secondes pendant lesquelles la table ne bouge pas, puis la main
        // passe. Le chrono du tour affiche cette échéance-là : c'est bien le
        // tour en cours qui dure sept secondes de plus.
        etat.scan.fin = Date.now() + SCAN_MS;
        etat.tourFin = etat.scan.fin;
        etat.scanTimer = setTimeout(() => {
            finirScan(etat);
            apresAction(gameState, io, onGameEnd);
        }, SCAN_MS);
    } else {
        etat.tourFin = Date.now() + CONFIG.TOUR_MS;
        etat.tourTimer = setTimeout(() => {
            actionParDefaut(etat, etat.tourJoueur);
            apresAction(gameState, io, onGameEnd);
        }, CONFIG.TOUR_MS);
    }
    diffuserEtat(gameState, io);
}

function demarrerPartie(gameState, io, opts) {
    const etat = gameState.collect;
    const joueurs = [...gameState.players.values()].map(p => p.playerId);
    const r = demarrer(etat, joueurs);
    if (!r.ok) return { success: false, error: r.erreur };

    gameState.inProgress = true;
    etat.debut = Date.now();
    const onGameEnd = (vainqueurId) => {
        const nom = pseudos(gameState)[vainqueurId] || null;
        if (opts && opts.onGameEnd) opts.onGameEnd(vainqueurId, nom, Math.round((Date.now() - etat.debut) / 1000));
    };
    etat._onGameEnd = onGameEnd;
    apresAction(gameState, io, onGameEnd);
    return { success: true };
}

// Un salon qui se ferme, ou une partie qu'on relance : les minuteries d'un
// salon mort continueraient sinon de tourner pour personne.
function reinitialiser(gameState) {
    if (!gameState.collect) return;
    stopperMinuteries(gameState.collect);
    gameState.collect = etatNeuf();
}

// Un joueur s'en va. S'il tenait le tour, la partie doit repartir sans lui —
// et s'il ne reste qu'un joueur, elle s'arrête.
function quitterCollect(gameState, io, playerId) {
    const etat = gameState.collect;
    if (!etat || !etat.active || !etat.mains.has(playerId)) return;

    // ses cartes retournent au paquet plutôt que de disparaître
    for (const c of etat.mains.get(playerId)) rendreAuPaquet(etat, c);
    etat.mains.delete(playerId);
    etat.sets.delete(playerId);
    const i = etat.ordre.indexOf(playerId);
    if (i >= 0) etat.ordre.splice(i, 1);

    if (etat.ordre.length < 2) {
        etat.active = false;
        etat.vainqueur = etat.ordre[0] || null;
        stopperMinuteries(etat);
        diffuserEtat(gameState, io);
        return;
    }
    // Le vol qu'il menait, ou qu'il subissait, n'a plus d'objet. La carte prise
    // repart au paquet : elle n'appartient plus à personne, et la laisser dans
    // les limbes bloquerait la table.
    if (etat.visee && (etat.visee.voleur === playerId || etat.visee.cible === playerId)) etat.visee = null;
    if (etat.larcin && (etat.larcin.voleur === playerId || etat.larcin.cible === playerId)) {
        rendreAuPaquet(etat, etat.larcin.carte);
        etat.larcin = null;
    }
    // le scan qu'il lisait, ou qu'il subissait, non plus : la table ne doit
    // pas rester bloquee sept secondes pour un joueur parti
    if (etat.scan && (etat.scan.par === playerId || etat.scan.cible === playerId)) etat.scan = null;
    if (etat.tourIndex >= etat.ordre.length) etat.tourIndex = 0;
    if (etat.tourJoueur === playerId) etat.tourJoueur = etat.ordre[etat.tourIndex];
    apresAction(gameState, io, etat._onGameEnd);
}

// ── Les événements ────────────────────────────────────────────
function registerCollectSocketHandlers(io, socket, resoudreSalon) {
    // Le salon se résout à chaque événement : une socket peut en changer, ses
    // gestionnaires vivent aussi longtemps qu'elle.
    const contexte = () => {
        const gameState = resoudreSalon();
        if (!gameState || !gameState.collect) return null;
        const joueur = gameState.players.get(socket.id);
        if (!joueur) return null;
        return { gameState, etat: gameState.collect, moi: joueur.playerId };
    };

    const jouer = (fn) => {
        const c = contexte();
        if (!c) return;
        const r = fn(c);
        if (!r) return;
        if (!r.ok) return socket.emit('collect-refus', { erreur: r.erreur });
        if (r.main) socket.emit('collect-scan', { cible: r.cible, main: r.main });
        apresAction(c.gameState, io, c.etat._onGameEnd);
    };

    socket.on('collect-get-state', () => {
        const c = contexte();
        if (!c) return;
        socket.emit('collect-state', { ...vuePublique(c.etat), pseudos: pseudos(c.gameState) });
        if (c.etat.mains.has(c.moi)) socket.emit('collect-main', { main: c.etat.mains.get(c.moi).map(x => ({ ...x })) });
    });

    socket.on('collect-piocher', (d) => jouer(c => actionPiocher(c.etat, c.moi, d && d.uidDefausse)));
    socket.on('collect-echanger', (d) => jouer(c => actionEchanger(c.etat, c.moi, d && d.uidMain, d && d.uidMarche)));
    socket.on('collect-poser', (d) => jouer(c => actionPoser(c.etat, c.moi, d && d.anime)));
    // Le vol en deux temps : on prend une position, puis on paie. Le paiement
    // n'est pas soumis a « verifierTour » — c'est bien le tour du voleur, mais
    // « etat.larcin » y bloque justement tout le monde, lui compris.
    socket.on('collect-viser', (d) => jouer(c => (d && d.cibleId)
        ? actionViser(c.etat, c.moi, d.cibleId)
        : annulerVisee(c.etat, c.moi)));
    socket.on('collect-voler', (d) => jouer(c => actionVoler(c.etat, c.moi, d && d.cibleId, d && d.index)));
    socket.on('collect-payer', (d) => jouer(c => actionPayer(c.etat, c.moi, d && d.uids)));

    // Le scan est le seul dont le résultat ne part qu'au demandeur : il porte
    // la main d'un adversaire, elle ne doit jamais passer par le salon.
    socket.on('collect-scanner', (d) => jouer(c => {
        const r = actionScanner(c.etat, c.moi, d && d.cibleId);
        return r.ok ? { ...r, cible: d.cibleId } : r;
    }));
}

module.exports = {
    CONFIG, BAREMES, CLASSES, LARCIN_MS,
    demarrerPartie, reinitialiser, quitterCollect,
    registerCollectSocketHandlers, diffuserEtat,
    etatNeuf, regles, demarrer, tourSuivant,
    actionPiocher, actionEchanger, actionVoler, actionScanner, actionPoser, actionParDefaut, finirScan,
    actionViser, annulerVisee, viseeParDefaut, actionPayer, larcinParDefaut,
    rendreAuPaquet, renouvelerMarche, sousLePaquet,
    SCAN_MS, VISEE_MS,
    vuePublique, vueJoueur,
    _data: DATA,
};
