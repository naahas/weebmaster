// ══════════════════════════════════════════════════════════════
// 🎴 Collect — le moteur
// ══════════════════════════════════════════════════════════════
//
// Réunis trois cartes du même anime et pose le set. Le premier à deux sets
// gagne. À ton tour, une seule action : piocher, échanger avec le marché,
// voler un anime à un adversaire, scanner sa main, ou poser un set.
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
    DUREE_DEFAUT: 'normale',
};

// Chaque durée fixe la main ET l'objectif : les deux se tiennent.
const DUREES = {
    courte:  { cle: 'courte',  nom: 'Courte',  main: 5, taille: 2, sets: 3 },
    normale: { cle: 'normale', nom: 'Normale', main: 5, taille: 3, sets: 2 },
    longue:  { cle: 'longue',  nom: 'Longue',  main: 4, taille: 3, sets: 2 },
};

// ── Le triangle ───────────────────────────────────────────────
// Assaut bat Mirage, Mirage bat Oracle, Oracle bat Assaut.
const BAT = { assaut: 'mirage', mirage: 'oracle', oracle: 'assaut' };
const CLASSES = { assaut: 'Assaut', mirage: 'Mirage', oracle: 'Oracle' };
const domine = (a, b) => BAT[a] === b;

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
        duree: CONFIG.DUREE_DEFAUT,
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
        vainqueur: null,
        journal: [],           // les derniers faits, pour l'écran de tous
    };
}

const regles = (etat) => DUREES[etat.duree] || DUREES.normale;

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
function tourSuivant(etat) {
    if (!etat.active) return;
    etat.tourIndex = (etat.tourIndex + 1) % etat.ordre.length;
    etat.tourJoueur = etat.ordre[etat.tourIndex];
}

const carteParUid = (liste, uid) => liste.findIndex(c => c.uid === uid);

function verifierTour(etat, playerId) {
    if (!etat.active) return 'La partie n\'est pas en cours';
    if (etat.tourJoueur !== playerId) return 'Ce n\'est pas ton tour';
    if (!etat.mains.has(playerId)) return 'Tu n\'es pas dans cette partie';
    return null;
}

function noter(etat, fait) {
    etat.journal.push(fait);
    if (etat.journal.length > 30) etat.journal.shift();
}

// ── Les cinq actions ──────────────────────────────────────────

// Toutes les actions rendent une carte pour une, sauf le scan qui n'en bouge
// aucune et la pose qui en retire. La main garde donc toujours sa taille.
//
// Ce n'est pas une coquetterie : avec un plafond dur, la main est pleine dès la
// donne, et ni la pioche ni le vol ne sont plus jamais disponibles — or le vol
// est ce qui fait converger la partie. En rendant tout symétrique, chaque
// action reste ouverte à chaque tour, et il n'y a plus aucun cas limite à
// écrire. Le prix à payer devient le choix de ce qu'on lâche.
function actionPiocher(etat, playerId, uidRendue) {
    const ko = verifierTour(etat, playerId);
    if (ko) return { ok: false, erreur: ko };
    const main = etat.mains.get(playerId);

    // main incomplète (juste après une pose) : on se sert sans rien rendre
    if (main.length < regles(etat).main) {
        main.push(tirer(etat));
    } else {
        const i = carteParUid(main, uidRendue);
        if (i < 0) return { ok: false, erreur: 'Choisis la carte à rendre' };
        etat.pioche.splice(Math.floor(Math.random() * (etat.pioche.length + 1)), 0, main[i]);
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

    const prise = etat.marche[iMarche];
    etat.marche[iMarche] = main[iMain];
    main[iMain] = prise;
    noter(etat, { type: 'echange', joueur: playerId, prise, rendue: etat.marche[iMarche] });
    tourSuivant(etat);
    return { ok: true, prise };
}

// Le vol : on annonce un anime et on pose une carte face visible. Cette carte
// joue deux rôles d'un coup — sa CLASSE dit ce qu'on a le droit de prendre, et
// elle part chez la cible en échange. Un seul geste, et voler coûte quelque
// chose : on nourrit forcément celui qu'on dépouille.
//
// Rien chez elle que notre classe domine ? Le tour est perdu et la carte
// revient. C'est ce qui donne sa valeur au scan — sans cette pénalité, voler
// serait toujours meilleur que piocher et il n'y aurait plus de choix.
function actionVoler(etat, playerId, cibleId, anime, uidAttaque) {
    const ko = verifierTour(etat, playerId);
    if (ko) return { ok: false, erreur: ko };
    if (cibleId === playerId) return { ok: false, erreur: 'Choisis un adversaire' };
    if (!etat.mains.has(cibleId)) return { ok: false, erreur: 'Ce joueur n\'est pas dans la partie' };
    if (!etat.animes.includes(anime)) return { ok: false, erreur: 'Cet anime n\'est pas en jeu' };

    const main = etat.mains.get(playerId);
    const iAttaque = carteParUid(main, uidAttaque);
    if (iAttaque < 0) return { ok: false, erreur: 'Cette carte n\'est pas dans ta main' };

    const attaque = main[iAttaque];
    const cible = etat.mains.get(cibleId);
    const iPrise = cible.findIndex(c => c.anime === anime && domine(attaque.classe, c.classe));

    const fait = { type: 'vol', joueur: playerId, cible: cibleId, anime, classe: attaque.classe };
    if (iPrise < 0) {
        // annoncé dans le vide : la carte reste en main, seul le tour est perdu
        fait.reussi = false;
        noter(etat, fait);
        tourSuivant(etat);
        return { ok: true, reussi: false };
    }

    const prise = cible.splice(iPrise, 1)[0];
    main[iAttaque] = prise;          // une pour une
    cible.push(attaque);
    fait.reussi = true;
    fait.prise = prise;
    fait.donnee = attaque;
    noter(etat, fait);
    tourSuivant(etat);
    return { ok: true, reussi: true, prise, donnee: attaque };
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
    tourSuivant(etat);
    // la main scannée ne part qu'au scanneur, jamais au salon
    return { ok: true, main: cible.map(c => ({ ...c })) };
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
    noter(etat, { type: 'set', joueur: playerId, anime, total: sets.length });

    if (sets.length >= r.sets) {
        etat.vainqueur = playerId;
        etat.active = false;
        return { ok: true, vainqueur: playerId };
    }

    // La main se refait aussitôt : sans ça, celui qui pose se retrouve à deux
    // cartes et n'a plus rien pour jouer, alors qu'il vient de bien faire.
    while (etat.mains.get(playerId).length < r.main) etat.mains.get(playerId).push(tirer(etat));

    tourSuivant(etat);
    return { ok: true };
}

// Le minuteur a expiré : on pioche à sa place plutôt que de sauter le tour.
// Piocher marche toujours, et un joueur absent ne doit pas prendre de retard
// au point de décrocher.
function actionParDefaut(etat, playerId) {
    const main = etat.mains.get(playerId);
    if (!main || !main.length) {
        const ko = verifierTour(etat, playerId);
        if (ko) return { ok: false, erreur: ko };
        noter(etat, { type: 'passe', joueur: playerId });
        tourSuivant(etat);
        return { ok: true };
    }
    // On rend la carte la plus isolée : celle d'un anime dont il n'a que cet
    // exemplaire. C'est le choix qu'un joueur ferait, et il ne casse jamais une
    // paire en cours.
    const par = {};
    for (const c of main) par[c.anime] = (par[c.anime] || 0) + 1;
    const isolee = main.find(c => par[c.anime] === 1) || main[main.length - 1];
    return actionPiocher(etat, playerId, isolee.uid);
}

// ── Ce que chacun voit ────────────────────────────────────────
// La main d'un joueur ne sort jamais du serveur, sauf vers lui — et vers celui
// qui vient de la scanner, par le retour de « actionScanner ».
function vuePublique(etat) {
    const r = regles(etat);
    return {
        active: etat.active,
        duree: r.cle, dureeNom: r.nom, taille: r.taille, setsPourGagner: r.sets, mainMax: r.main,
        animes: etat.animes,
        marche: etat.marche.map(c => ({ ...c })),
        tourJoueur: etat.tourJoueur,
        tourFin: etat.tourFin,
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

module.exports = {
    CONFIG, DUREES, CLASSES, BAT,
    domine, etatNeuf, regles, demarrer, tourSuivant,
    actionPiocher, actionEchanger, actionVoler, actionScanner, actionPoser, actionParDefaut,
    vuePublique, vueJoueur,
    _data: DATA,
};
