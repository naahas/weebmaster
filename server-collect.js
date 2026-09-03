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
        duelTimer: null,
        debut: 0,
        duel: null,          // un vol en attente de la defense de sa cible
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
// Le PAQUET reprend ce qui se perd au combat. Une carte tombée au duel ne doit
// pas atterrir sous les yeux de tous — elle disparaît, anonyme, et reviendra
// plus tard sans qu'on sache d'où elle vient.
function rendreAuPaquet(etat, carte) {
    etat.pioche.splice(Math.floor(Math.random() * (etat.pioche.length + 1)), 0, carte);
}

function poserAuMarche(etat, carte) {
    etat.marche.push(carte);
    while (etat.marche.length > CONFIG.MARCHE) {
        const partie = etat.marche.shift();
        etat.pioche.splice(Math.floor(Math.random() * (etat.pioche.length + 1)), 0, partie);
    }
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
    // Un vol attend sa défense : tant qu'il n'est pas tranché, plus personne ne
    // joue — pas même celui dont c'est le tour.
    if (etat.duel) return 'Un vol est en cours';
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
        if (i < 0) return { ok: false, erreur: 'Choisis la carte à laisser au marché' };
        poserAuMarche(etat, main[i]);
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

// ── Le vol, en deux temps ─────────────────────────────────────
//
// L'attaquant pose une carte FACE CACHÉE, annonce une série et désigne sa
// cible. Celle-ci ne voit que la série : elle doit présenter une de ses cartes
// de cette série sans savoir à quelle classe elle fait face. Les deux se
// retournent ensemble.
//
// C'est ce secret qui fait tout. Si la cible voyait la carte, elle jouerait
// mécaniquement sa meilleure réponse — dominante si elle l'a, égale sinon —
// et son « choix » serait une consultation de table. À l'aveugle, il n'existe
// aucune réponse dominante : c'est un pierre-feuille-ciseaux, donc un vrai
// pari des deux côtés. Le triangle ne sert enfin à rien d'autre qu'à ça.
//
// Et le scan prend sa vraie valeur : il ne dit plus seulement quoi prendre,
// mais avec quoi attaquer — sans jamais donner de certitude.
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
    const defenses = etat.mains.get(cibleId).filter(c => c.anime === anime);

    // Rien de cette série chez elle : inutile de la faire attendre pour rien,
    // on tranche tout de suite. L'attaquant garde sa carte et perd son tour.
    if (!defenses.length) {
        noter(etat, { type: 'vol', joueur: playerId, cible: cibleId, anime, issue: 'vide' });
        tourSuivant(etat);
        return { ok: true, issue: 'vide' };
    }

    etat.duel = { attaquant: playerId, cible: cibleId, anime, uidAttaque, fin: 0 };
    return { ok: true, duel: true, cible: cibleId, anime, choix: defenses.length };
}

// La cible présente sa carte. C'est le seul moment où quelqu'un d'autre que le
// joueur courant agit.
function actionDefendre(etat, cibleId, uidDefense) {
    const d = etat.duel;
    if (!d) return { ok: false, erreur: 'Aucun vol en cours' };
    if (d.cible !== cibleId) return { ok: false, erreur: 'Ce vol ne te vise pas' };

    const mainCible = etat.mains.get(cibleId);
    const iDef = carteParUid(mainCible, uidDefense);
    if (iDef < 0) return { ok: false, erreur: 'Cette carte n\'est pas dans ta main' };
    if (mainCible[iDef].anime !== d.anime) return { ok: false, erreur: 'Cette carte n\'est pas de la série annoncée' };

    const mainAtt = etat.mains.get(d.attaquant);
    const iAtt = carteParUid(mainAtt, d.uidAttaque);
    // l'attaquant a pu perdre sa carte entre-temps : on annule proprement
    if (iAtt < 0) {
        etat.duel = null;
        tourSuivant(etat);
        return { ok: true, issue: 'annule' };
    }

    const attaque = mainAtt[iAtt];
    const defense = mainCible[iDef];
    const fait = {
        type: 'vol', joueur: d.attaquant, cible: cibleId, anime: d.anime,
        attaque: { ...attaque }, defense: { ...defense },
    };

    let issue;
    if (domine(attaque.classe, defense.classe)) {
        // l'attaque passe : la carte volée prend la place de l'attaque, qui
        // retourne au paquet — pas au marché, ce n'est pas une défausse choisie
        mainCible.splice(iDef, 1);
        mainAtt[iAtt] = defense;
        rendreAuPaquet(etat, attaque);
        issue = 'gagne';
    } else if (domine(defense.classe, attaque.classe)) {
        // la défense l'emporte : l'attaquant perd sa carte, et sa main s'ouvre
        mainAtt.splice(iAtt, 1);
        rendreAuPaquet(etat, attaque);
        issue = 'perdu';
    } else {
        issue = 'nul';   // même classe : rien ne bouge, le tour est simplement passé
    }

    fait.issue = issue;
    noter(etat, fait);
    etat.duel = null;
    tourSuivant(etat);
    return { ok: true, issue, attaque, defense };
}

// La cible n'a pas répondu à temps. Aucune de ses cartes n'est « la bonne » —
// il n'existe pas de meilleure défense à l'aveugle — donc on en présente une au
// hasard. Un absent ne fait ainsi perdre personne, et ne gagne rien non plus.
function defenseParDefaut(etat) {
    const d = etat.duel;
    if (!d) return { ok: false, erreur: 'Aucun vol en cours' };
    const dispo = (etat.mains.get(d.cible) || []).filter(c => c.anime === d.anime);
    if (!dispo.length) {
        etat.duel = null;
        tourSuivant(etat);
        return { ok: true, issue: 'vide' };
    }
    return actionDefendre(etat, d.cible, dispo[Math.floor(Math.random() * dispo.length)].uid);
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
        main: r.main, bareme: r.nom, resume: r.resume,
        taille: r.taille, setsPourGagner: r.sets, mainMax: r.main,
        animes: etat.animes,
        marche: etat.marche.map(c => ({ ...c })),
        tourJoueur: etat.tourJoueur,
        tourFin: etat.tourFin,
        // Le duel se montre, mais JAMAIS la carte d'attaque ni sa classe : c'est
        // tout l'interet du vol a l'aveugle. La cible ne recoit que la serie.
        duel: etat.duel ? { attaquant: etat.duel.attaquant, cible: etat.duel.cible, anime: etat.duel.anime, fin: etat.duel.fin } : null,
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

const DUEL_MS = 8000;   // la cible n'a qu'une chose à faire, choisir une carte

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
    if (etat.duelTimer) { clearTimeout(etat.duelTimer); etat.duelTimer = null; }
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

    if (etat.duel) {
        etat.duel.fin = Date.now() + DUEL_MS;
        etat.duelTimer = setTimeout(() => {
            defenseParDefaut(etat);
            apresAction(gameState, io, onGameEnd);
        }, DUEL_MS);
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
    // le duel qui le visait, ou qu'il menait, n'a plus d'objet
    if (etat.duel && (etat.duel.cible === playerId || etat.duel.attaquant === playerId)) etat.duel = null;
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
    socket.on('collect-voler', (d) => jouer(c => actionVoler(c.etat, c.moi, d && d.cibleId, d && d.anime, d && d.uidAttaque)));
    socket.on('collect-defendre', (d) => jouer(c => actionDefendre(c.etat, c.moi, d && d.uidDefense)));

    // Le scan est le seul dont le résultat ne part qu'au demandeur : il porte
    // la main d'un adversaire, elle ne doit jamais passer par le salon.
    socket.on('collect-scanner', (d) => jouer(c => {
        const r = actionScanner(c.etat, c.moi, d && d.cibleId);
        return r.ok ? { ...r, cible: d.cibleId } : r;
    }));
}

module.exports = {
    CONFIG, BAREMES, CLASSES, BAT, DUEL_MS,
    demarrerPartie, reinitialiser, quitterCollect,
    registerCollectSocketHandlers, diffuserEtat,
    domine, etatNeuf, regles, demarrer, tourSuivant,
    actionPiocher, actionEchanger, actionVoler, actionScanner, actionPoser, actionParDefaut,
    actionDefendre, defenseParDefaut, rendreAuPaquet, poserAuMarche,
    vuePublique, vueJoueur,
    _data: DATA,
};
