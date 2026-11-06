// ══════════════════════════════════════════════════════════════
// 🕵️ CODANIME — le moteur, puis son raccord au salon
// ══════════════════════════════════════════════════════════════
//
// Deux équipes, une grille de 25 portraits communs. Chaque équipe doit
// retrouver LES SIENS avant l'autre, guidée par un espion qui seul voit la
// répartition. L'espion annonce UN MOT et UN NOMBRE ; ses agents marquent les
// cartes ; à la clôture elles se retournent une par une, et la première qui
// n'est pas la leur coupe tout.
//
// ── Ce qui ne se devine pas en lisant le code ──────────────────────
//
// ⚠️ L'ESPION EST FIXE POUR TOUTE LA PARTIE, et ce n'est pas un choix de
// confort : il a vu la clef. S'il redevenait agent au tour suivant, il
// connaîtrait les 25 cartes et devinerait sans se tromper. Une rotation n'est
// possible qu'ENTRE deux manches, jamais à l'intérieur de l'une.
//
// ⚠️ LES PORTRAITS VOYAGENT SOUS JETON. Le nom du fichier dit qui est le
// personnage, et comme on n'affiche pas les noms, le lire dans l'onglet réseau
// rendrait la moitié du jeu gratuite. Même raison que Rush et Ascension —
// voir jetons-images.js.
//
// ⚠️ LA COULEUR D'UNE CARTE NE SORT JAMAIS VERS UN AGENT. `grillePourAgent`
// ne renvoie que ce qui est déjà retourné. Masquer côté client aurait laissé
// la clef entière dans la charge réseau, ce qui est exactement ce qu'on
// protège ici.
//
// ⚠️ L'INDICE N'EST PAS TAPÉ. Il se dit à la voix — il est public de toute
// façon, seule la répartition est secrète. L'espion ne transmet que le NOMBRE.
// C'est ce qui évite la saisie de texte au doigt.
//
// ⚠️ « MÊME SÉRIE » EST UN INDICE INTERDIT, mais le serveur ne peut pas
// l'arbitrer puisqu'il ne voit pas le mot. La règle vit donc dans l'écran de
// l'espion, qui la rappelle. Le jour où l'indice passera par le serveur, c'est
// ici qu'il faudra le refuser — on a le champ `anime` sur chaque carte.

const TAILLE = 25;
// 9 / 8 / 7 / 1 — la répartition du jeu d'origine à 25 cartes. Celle qui a 9
// commence, et ce surnombre est exactement ce qui compense le fait de jouer
// en premier : ne pas les délier.
const CAMP_PREMIER = 9;
const CAMP_SECOND = 8;
const NEUTRES = 7;

// ⚠️ NEUF, et deux valeurs spéciales. L'indice annonce combien de cartes le
// mot couvre, et l'équipe a droit à `n + 1` coups — le « +1 » sert à rattraper
// un ancien indice resté en plan, et c'est la meilleure couche de stratégie
// du jeu. Deux cas donnent des coups ILLIMITÉS :
//
//   0  — « évitez tout ça ». L'espion ne couvre aucune carte, il en écarte.
//   ∞  — « débrouillez-vous avec tous les indices d'avant ». Fin de partie.
//
// Les deux sont mécaniquement identiques ; seule l'intention diffère, et
// c'est l'espion qui la porte à la voix. Le jeu d'origine fait exactement ça.
const INDICE_MAX = 9;
// ⚠️ `-1` ET PAS `Infinity` : la valeur traverse une socket, donc JSON, et
// `Infinity` s'y sérialise en `null`. Le client recevait alors un indice sans
// nombre, impossible à distinguer d'un indice cassé.
const INDICE_INFINI = -1;
const AGENTS_MAX = 3;
// ⚠️ Au plus trois portraits de la même série dans une grille. Sans ce
// plafond, Naruto et One Piece pèsent 60 % du vivier et l'on se retrouve avec
// six bandeaux frontaux côte à côte : les crochets visuels s'annulent, et
// comme « nommer une série » est un indice interdit, ces cartes deviennent
// muettes. Mesuré sur le vivier d'amorce.
const MAX_PAR_SERIE = 3;

// ⚠️ Un INTERVALLE, pas une liste de trois valeurs. Le temps qu'il faut à un
// espion dépend trop du salon — quatre habitués vont trois fois plus vite que
// quatre curieux — pour qu'on puisse deviner trois bons crans. Le pas de 15 s
// garde le curseur lisible sans lui donner 150 positions.
// ⚠️ C'EST UN TEMPS PAR CARTE, plus par tour. Le défaut est tombé de 90 s
// à 45 : avec `n + 1` coups, une équipe qui enchaîne quatre bonnes cartes
// aurait eu quatre fois quatre-vingt-dix secondes, soit six minutes pour un
// seul tour pendant que l'autre camp regarde. Quarante-cinq secondes pour
// désigner UNE carte, c'est déjà confortable.
const DUREE_MIN = 30;
const DUREE_MAX = 180;
const DUREE_PAS = 15;
const DUREE_TOUR_DEFAUT = 45;
// Le temps de reflexion de l espion, avant que la main ne passe. Il est
// FIXE et non reglable : c est un garde-fou contre un espion absent, pas
// un parametre de jeu. Trente secondes suffisent a trouver un mot ; au-dela
// ce sont sept personnes qui attendent.
const DUREE_INDICE = 30;
function dureeValide(d) {
    return Number.isInteger(d) && d >= DUREE_MIN && d <= DUREE_MAX && d % DUREE_PAS === 0;
}
// Le temps qu'on laisse à la DERNIÈRE carte avant d'annoncer le vainqueur.
//
// ⚠️ IL EN FAUT, et il ne faut pas plus. Sans pause, la fin partait à
// l'instant où la carte se retournait : on passait au classement sans avoir
// vu l'assassin noircir, c'est-à-dire qu'on ratait le seul moment où le mode
// fait peur. Mais deux secondes, essayées en jeu, traînaient — le balayage
// finit à 560 ms, et le reste n'est plus qu'une image fixe sur laquelle on
// attend. Une seconde laisse l'animation se jouer en entier et un battement
// pour lire la couleur, puis le plateau s'efface en fondu (520 ms de plus,
// côté client) et le classement arrive.
const FIN_PAUSE = 1000;

// Le battement entre deux cartes d'une même salve. C'est le suspense : on ne
// sait pas encore si le tour continue. Trop court, la salve devient un bloc.
const BATTEMENT = 1400;

// ── Le seuil de voix : L'UNANIMITÉ ─────────────────────────────────
//
// Tous les agents PRÉSENTS doivent désigner la même carte pour qu'elle se
// retourne. 1→1, 2→2, 3→3.
//
// ⚠️ C'était la majorité stricte (3 agents → 2 voix). L'unanimité est venue
// avec la règle « une erreur arrête le tour » : quand un clic malheureux
// coûte le tour ENTIER et non une carte, personne ne doit pouvoir être mis en
// minorité dessus. Le mode plafonnant à 3 agents, ça ne change le
// comportement que dans un seul cas — un camp à trois — puisqu'à un et à deux
// la majorité stricte ÉTAIT déjà l'unanimité.
//
// ⚠️ Et ce sont les PRÉSENTS. Les voix d'un joueur parti restent sur le
// plateau (règle du mode), mais exiger la sienne rendrait l'unanimité
// inatteignable dès qu'un onglet se ferme — l'équipe ne pourrait plus jamais
// rien retourner.
//
// ⚠️ Le plancher à 1 n'est pas décoratif : à zéro agent présent, `seuil`
// vaudrait 0 et la première voix venue — celle d'un fantôme — ferait partir
// une carte.
function seuil(nbAgents) {
    return Math.max(1, nbAgents);
}

// Combien de cartes l'équipe a le droit de retourner avec cet indice.
//
// ⚠️ `n + 1`, et c'est la règle qui porte tout le mode : le « +1 » est le
// coup de rattrapage, celui où l'on retente un indice du tour d'avant resté
// en plan. Sans lui, un indice à 2 n'est qu'une liste de deux cartes.
// ⚠️ `0` et `∞` donnent des coups ILLIMITÉS, pas `1` et pas `∞+1` : voir
// INDICE_MAX. Le tour ne s'arrête alors que sur une erreur, sur le chrono, ou
// parce que l'équipe choisit de s'arrêter — d'où le bouton, qui n'est plus
// facultatif dans ces deux cas.
function coupsPour(nombre) {
    if (nombre === INDICE_INFINI || nombre === 0) return Infinity;
    return nombre + 1;
}

// L'indice est-il recevable ? 0 et ∞ passent toujours ; au-delà, on borne au
// plafond ET à ce qu'il reste à trouver — annoncer 7 quand il reste 2 cartes
// ne veut rien dire.
function indiceValide(nombre, restant) {
    if (nombre === INDICE_INFINI || nombre === 0) return true;
    if (!Number.isInteger(nombre) || nombre < 0) return false;
    return nombre <= Math.min(INDICE_MAX, restant);
}

function melanger(tab, alea) {
    const t = tab.slice();
    for (let i = t.length - 1; i > 0; i--) {
        const j = Math.floor(alea() * (i + 1));
        [t[i], t[j]] = [t[j], t[i]];
    }
    return t;
}

// ── Le tirage de la grille ─────────────────────────────────────────
//
// On ne pioche pas 25 portraits au hasard : on plafonne par série (voir
// MAX_PAR_SERIE). Le tirage passe donc par les séries, puis par les
// personnages de chacune.
//
// ⚠️ Si le vivier est trop pauvre pour honorer le plafond, on complète en
// l'ignorant plutôt que de rendre une grille incomplète : une grille à 23
// cartes casserait la répartition 9/8/7/1 en silence.
function tirerPersonnages(vivier, alea, taille = TAILLE, maxParSerie = MAX_PAR_SERIE) {
    const parSerie = new Map();
    for (const p of vivier) {
        if (!parSerie.has(p.anime)) parSerie.set(p.anime, []);
        parSerie.get(p.anime).push(p);
    }

    const choisis = [];
    const series = melanger([...parSerie.keys()], alea);
    // Un tour de table par série, autant de fois qu'il faut : ça répartit au
    // lieu de vider la première série rencontrée.
    for (let passe = 0; passe < maxParSerie && choisis.length < taille; passe++) {
        for (const s of series) {
            if (choisis.length >= taille) break;
            const restants = parSerie.get(s).filter(p => !choisis.includes(p));
            if (!restants.length) continue;
            choisis.push(melanger(restants, alea)[0]);
        }
    }

    if (choisis.length < taille) {
        const reste = melanger(vivier.filter(p => !choisis.includes(p)), alea);
        for (const p of reste) {
            if (choisis.length >= taille) break;
            choisis.push(p);
        }
    }

    return melanger(choisis.slice(0, taille), alea);
}

// Distribue les camps sur des portraits déjà tirés.
// ⚠️ `avecAssassin` à faux ne RETIRE pas une carte, il la change en
// PASSANT. La grille doit rester à vingt-cinq : c'est le 5×5 qu'on scanne,
// et les deux camps gardent leurs 9 et 8 — sans quoi désactiver le piège
// raccourcirait aussi la partie, ce que personne ne demande en le faisant.
function distribuerCamps(personnages, premier, alea, avecAssassin) {
    const second = premier === 'A' ? 'B' : 'A';
    const camps = [];
    for (let i = 0; i < CAMP_PREMIER; i++) camps.push(premier);
    for (let i = 0; i < CAMP_SECOND; i++) camps.push(second);
    for (let i = 0; i < NEUTRES; i++) camps.push('neutre');
    camps.push(avecAssassin === false ? 'neutre' : 'assassin');

    const melanges = melanger(camps, alea);
    return personnages.map((p, i) => ({
        id: p.id,
        nom: p.nom,
        anime: p.anime,
        img: p.img,
        camp: melanges[i],
        revelee: false,
    }));
}

function construireGrille(vivier, premier, alea, avecAssassin) {
    return distribuerCamps(tirerPersonnages(vivier, alea), premier, alea, avecAssassin);
}

// ── Le mot de l'indice ─────────────────────────────────────────────
//
// ⚠️ Il est TAPÉ, et il part à tout le monde — y compris au camp adverse,
// comme dans le vrai jeu : c'est la moitié du plaisir de voir les autres
// se tromper sur un mot qu'on a entendu. Il passe donc par un nettoyage,
// parce qu'un champ libre rediffusé à huit personnes est un salon de
// discussion déguisé s'il n'est pas borné.
//
// ⚠️ UN SEUL MOT, ET RIEN QUE DES LETTRES. La règle de Codenames tient en
// un mot, et c'est elle qui rend le jeu difficile : « lame tranchante »
// laisse passer deux indices pour le prix d'un. On ne garde donc que le
// PREMIER mot, et l'on jette tout ce qui n'est ni lettre ni chiffre.
//
// Et ce n'est pas qu'une règle de jeu : le champ est libre et son contenu
// repart vers huit personnes. Sans ce filtre, c'est une messagerie — avec
// ses liens, sa ponctuation et ses émojis.
//
// ℹ️ Le TIRET survit, seul signe admis : « sous-marin » est un mot, et
// l'interdire obligerait à écrire « sousmarin ». Il est écrasé en rafale
// et retiré des deux bouts, pour qu'il ne serve pas de décoration.
//
// ⚠️ `\p{L}` exige le drapeau `u`. Sans lui, `é`, `ñ` et `ü` tomberaient —
// et la moitié des indices français avec.
const MOT_MAX = 24;
function nettoyerMot(brut) {
    if (typeof brut !== 'string') return '';
    const premier = brut.trim().split(/\s+/)[0] || '';
    return premier
        .replace(/[^\p{L}\p{N}-]/gu, '')
        .replace(/-{2,}/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, MOT_MAX);
}

// ── L'état d'un salon ──────────────────────────────────────────────
function etatNeuf() {
    return {
        active: false,
        // Réglages du salon
        chrono: true,
        dureeTour: DUREE_TOUR_DEFAUT,
        // ⚠️ Le piège est là PAR DÉFAUT : c'est lui qui fait qu'un indice à 4
        // est un pari et non un calcul. Éteint, le mode devient une course au
        // score — plus doux pour un premier salon, et c'est le seul usage
        // qu'on lui connaisse.
        piege: true,
        // Composition, décidée dans le salon par l'hôte
        equipes: {
            A: { espion: null, agents: [] },
            B: { espion: null, agents: [] },
        },
        // La partie
        grille: [],
        restant: { A: 0, B: 0 },
        tourDe: null,
        phase: 'repos',     // repos | indice | vote | revelation | fini
        indice: null,       // { mot, nombre } — nombre : 0..9 ou INDICE_INFINI
        votes: {},          // idxCarte -> [playerId]
        // Les coups qu'il reste à l'équipe sur cet indice. `Infinity` pour 0
        // et ∞. Décompté à chaque carte TROUVÉE, jamais à chaque clic : une
        // erreur arrête le tour de toute façon.
        coups: 0,
        historique: [],     // { equipe, mot, nombre, trouvees }
        gagnant: null,
        finTour: 0,
        manche: 0,
        timeouts: [],
    };
}

// ── Les votes ──────────────────────────────────────────────────────
//
// UNE CARTE À LA FOIS, et UNE VOIX PAR AGENT.
//
// ⚠️ Ce n'est plus un plateau qu'on engage puis qu'on ouvre : on désigne une
// carte, elle se retourne dès que tout le monde la désigne, et l'on
// recommence. Un agent ne peut donc pointer qu'une carte — cliquer ailleurs
// DÉPLACE sa voix. Pouvoir en marquer plusieurs n'avait de sens que dans
// l'ancien modèle, où l'équipe préparait une salve.
//
// ⚠️ Et il n'y a plus d'ordre de franchissement à tenir : la carte part à
// l'instant où l'unanimité est atteinte, il n'y a jamais de file.
function voixDe(etat, idx) {
    return etat.votes[idx] || [];
}

// Où se trouve la voix de ce joueur, ou -1.
function voixAilleurs(etat, playerId) {
    for (const idx of Object.keys(etat.votes)) {
        if (etat.votes[idx].includes(playerId)) return Number(idx);
    }
    return -1;
}

function retirerVoix(etat, playerId, idx) {
    const reste = voixDe(etat, idx).filter(p => p !== playerId);
    if (reste.length) etat.votes[idx] = reste;
    else delete etat.votes[idx];
}

// Rend { ok, raison } — jamais d'exception : un clic refusé n'est pas une panne.
function basculerVote(etat, playerId, idx) {
    if (etat.phase !== 'vote') return { ok: false, raison: 'pas-en-vote' };
    const carte = etat.grille[idx];
    if (!carte) return { ok: false, raison: 'carte-inconnue' };
    if (carte.revelee) return { ok: false, raison: 'deja-revelee' };

    const ou = voixAilleurs(etat, playerId);
    if (ou === idx) { retirerVoix(etat, playerId, idx); return { ok: true, pose: false }; }
    // ⚠️ On retire AVANT de poser : sans ça un agent qui change d'avis
    // laisserait sa voix sur l'ancienne carte, et deux cartes pourraient
    // atteindre l'unanimité avec le même joueur compté deux fois.
    if (ou >= 0) retirerVoix(etat, playerId, ou);
    etat.votes[idx] = voixDe(etat, idx).concat([playerId]);
    return { ok: true, pose: true };
}

// ── La révélation ──────────────────────────────────────────────────
//
// Rend ce qu'était la carte : 'bonne' | 'adverse' | 'neutre' | 'assassin'.
function revelerCarte(etat, idx) {
    const carte = etat.grille[idx];
    if (!carte || carte.revelee) return null;
    carte.revelee = true;

    if (carte.camp === 'assassin') return 'assassin';
    if (carte.camp === 'neutre') return 'neutre';

    etat.restant[carte.camp] = Math.max(0, etat.restant[carte.camp] - 1);
    return carte.camp === etat.tourDe ? 'bonne' : 'adverse';
}

function equipeAdverse(e) { return e === 'A' ? 'B' : 'A'; }

// Qui a gagné, s'il y a lieu. `parAssassin` dit quelle équipe l'a touché.
function vainqueur(etat, parAssassin) {
    if (parAssassin) return equipeAdverse(parAssassin);
    if (etat.restant.A === 0) return 'A';
    if (etat.restant.B === 0) return 'B';
    return null;
}

// ── Ce que chacun a le droit de voir ───────────────────────────────
//
// ⚠️ Deux vues, et c'est tout l'intérêt du serveur : l'espion voit les camps,
// l'agent ne voit que ce qui est retourné. La différence se fait ICI, pas à
// l'affichage.
function grillePourAgent(etat, urlImage) {
    return etat.grille.map((c, i) => ({
        i,
        img: urlImage ? urlImage(c.img) : c.img,
        revelee: c.revelee,
        camp: c.revelee ? c.camp : null,
    }));
}

function grillePourEspion(etat, urlImage) {
    return etat.grille.map((c, i) => ({
        i,
        img: urlImage ? urlImage(c.img) : c.img,
        revelee: c.revelee,
        camp: c.camp,
    }));
}

function estEspion(etat, playerId) {
    return etat.equipes.A.espion === playerId || etat.equipes.B.espion === playerId;
}

function equipeDe(etat, playerId) {
    for (const e of ['A', 'B']) {
        if (etat.equipes[e].espion === playerId) return e;
        if (etat.equipes[e].agents.includes(playerId)) return e;
    }
    return null;
}

function agentsPresents(etat, equipe, estPresent) {
    const l = etat.equipes[equipe].agents;
    return estPresent ? l.filter(estPresent) : l;
}

// ══════════════════════════════════════════════════════════════
// 🔌 Le raccord au salon
// ══════════════════════════════════════════════════════════════
function creerModule(deps) {
    // ⚠️ `getIo` et non `io` : au moment où ce module est construit, le
    // serveur de sockets n'existe pas encore. On va le chercher au moment de
    // s'en servir — c'est-à-dire une fois une partie lancée.
    const { diffuser, getIo, urlImage, recordFinishedGame, vivier } = deps;

    const nettoyerTimeouts = (etat) => {
        etat.timeouts.forEach(t => clearTimeout(t));
        etat.timeouts = [];
    };
    const plusTard = (etat, fn, ms) => {
        const t = setTimeout(fn, ms);
        etat.timeouts.push(t);
        return t;
    };

    const joueursDuSalon = (gameState) => [...gameState.players.values()];
    const nomDe = (gameState, playerId) => {
        for (const p of gameState.players.values()) {
            if (p.playerId === playerId) return p.username;
        }
        return '—';
    };
    // ⚠️ `gameState.players` est indexée par socket.id, jamais par playerId :
    // un `get(playerId)` rend toujours undefined. On cherche sur le CHAMP.
    const estPresent = (gameState) => {
        const vus = new Set(joueursDuSalon(gameState).map(p => p.playerId));
        return (playerId) => vus.has(playerId);
    };

    // ── La composition ─────────────────────────────────────────────
    //
    // L'hôte la décide dans le salon. S'il n'a rien touché, on répartit
    // nous-mêmes : un mode qui refuse de démarrer parce que personne n'a
    // cliqué sur les bons boutons est un mode qu'on ne lance jamais.
    function composerAuto(gameState) {
        const etat = gameState.codanime;
        const ids = joueursDuSalon(gameState).map(p => p.playerId);
        const melanges = melanger(ids, Math.random);
        etat.equipes = { A: { espion: null, agents: [] }, B: { espion: null, agents: [] } };
        let tour = 'A';
        for (const id of melanges) {
            const e = etat.equipes[tour];
            if (!e.espion) e.espion = id;
            else if (e.agents.length < AGENTS_MAX) e.agents.push(id);
            else {
                const autre = etat.equipes[tour === 'A' ? 'B' : 'A'];
                if (!autre.espion) autre.espion = id;
                else if (autre.agents.length < AGENTS_MAX) autre.agents.push(id);
                // Au-delà, le joueur reste spectateur : le mode plafonne à 8.
            }
            tour = tour === 'A' ? 'B' : 'A';
        }
    }

    // ── Le placement a l'arrivée ───────────────────────────────────
    //
    // On remplit A, puis B, dans l'ordre d'arrivée. Donc :
    //   1er (l'hôte) → espion bleu · 2 à 4 → agents bleus
    //   5e           → espion rouge · 6 à 8 → agents rouges
    //
    // ⚠️ Ça n'est pas qu'un confort : sans placement automatique, un salon
    // où l'hôte n'a touché à rien ne peut pas démarrer, et rien à l'écran ne
    // dit pourquoi. Le mode doit être jouable en cliquant « Démarrer ».
    function placerAuto(gameState, playerId) {
        const etat = gameState.codanime;
        if (etat.active) return false;
        if (equipeDe(etat, playerId)) return false;

        // ⚠️ LES DEUX ESPIONS D'ABORD, puis les agents en alternance.
        //
        // La consigne d'origine était « on remplit A en entier, puis B ».
        // Elle rend le salon INJOUABLE À QUATRE : les quatre premiers vont
        // tous en bleu, le rouge n'a son espion qu'au cinquième et son agent
        // qu'au sixième — alors que le mode annonce « 4 – 8 » et qu'on exige
        // maintenant deux espions et un agent de chaque côté pour démarrer.
        // Un salon de quatre resterait bloqué sans que rien ne le dise.
        //
        // L'hôte reste l'espion bleu, ce qui était le cœur de la demande.
        if (!etat.equipes.A.espion) { etat.equipes.A.espion = playerId; return true; }
        if (!etat.equipes.B.espion) { etat.equipes.B.espion = playerId; return true; }

        // Puis le camp le MOINS fourni, à égalité le bleu. À quatre on a
        // donc 1+1 de chaque côté, et à huit 4+4.
        const a = etat.equipes.A.agents.length;
        const b = etat.equipes.B.agents.length;
        const ordre = a <= b ? ['A', 'B'] : ['B', 'A'];
        for (const e of ordre) {
            if (etat.equipes[e].agents.length < AGENTS_MAX) {
                etat.equipes[e].agents.push(playerId);
                return true;
            }
        }
        return false;
    }

    // ⚠️ Un joueur qui part AVANT la partie libère sa place, sinon le suivant
    // tombe dans un camp plein et reste spectateur. En COURS de partie, au
    // contraire, on ne touche à rien : son équipe doit continuer à exister,
    // et le classement doit pouvoir le nommer.
    function retirerDuSalon(gameState, playerId) {
        const etat = gameState.codanime;
        if (etat.active) return;
        for (const e of ['A', 'B']) {
            if (etat.equipes[e].espion === playerId) etat.equipes[e].espion = null;
            etat.equipes[e].agents = etat.equipes[e].agents.filter(id => id !== playerId);
        }
        // Un camp sans espion mais avec des agents en promeut un : sinon le
        // départ de l'hôte bloque le salon pour tout le monde.
        for (const e of ['A', 'B']) {
            if (!etat.equipes[e].espion && etat.equipes[e].agents.length) {
                etat.equipes[e].espion = etat.equipes[e].agents.shift();
            }
        }
    }

    // Une composition est jouable s'il y a deux espions et au moins un agent
    // de chaque côté.
    function compositionValide(etat) {
        for (const e of ['A', 'B']) {
            if (!etat.equipes[e].espion) return false;
            if (!etat.equipes[e].agents.length) return false;
        }
        return true;
    }

    // ⚠️ LA COMPOSITION SE RÉPARE TOUTE SEULE, et il le faut absolument :
    // un joueur peut disparaître de `players` par des chemins qui ignorent
    // Codanime — `dev-clear-bots` en est un, qui vide la table sans rien
    // dire à personne. Les places restaient alors prises par des absents, le
    // tiroir annonçait « 4 · 4 » dans un salon de quatre, et tout nouvel
    // arrivant tombait en « sans équipe ».
    //
    // Corriger chaque chemin de sortie un par un, c'est en oublier un : on
    // répare donc À LA LECTURE, dans la seule fonction par laquelle passent
    // toutes les diffusions.
    //
    // ⚠️ Jamais PENDANT une partie : un joueur parti doit garder sa place,
    // son équipe doit continuer d'exister et le résultat doit pouvoir le
    // nommer.
    function synchroniser(gameState) {
        const etat = gameState.codanime;
        if (etat.active) return;
        const present = estPresent(gameState);

        for (const e of ['A', 'B']) {
            if (etat.equipes[e].espion && !present(etat.equipes[e].espion)) {
                etat.equipes[e].espion = null;
            }
            etat.equipes[e].agents = etat.equipes[e].agents.filter(present);
            if (!etat.equipes[e].espion && etat.equipes[e].agents.length) {
                etat.equipes[e].espion = etat.equipes[e].agents.shift();
            }
        }
        // Et l'on replace ceux qui attendent : une place libérée doit
        // profiter à quelqu'un, sinon le salon reste bloqué sous le plafond.
        for (const p of joueursDuSalon(gameState)) placerAuto(gameState, p.playerId);
    }

    // ── Les vues ───────────────────────────────────────────────────
    // ⚠️ L'avatar part en NOM DE FICHIER, pas en URL : c'est `srcAvatar()`
    // côté client qui y colle le jeton de version, et le dossier est servi
    // en « immutable » pour un an. Fabriquer l'adresse ici la ferait diverger
    // de celle que le reste de la page écrit — exactement le défaut qu'a déjà
    // eu le panneau /admin.
    const vignette = (gameState, playerId) => {
        for (const p of gameState.players.values()) {
            if (p.playerId === playerId) {
                return { playerId, username: p.username, avatar: p.avatarUrl || null };
            }
        }
        // Un joueur parti garde sa place dans la composition : on le nomme
        // quand même, plutôt que de laisser un trou dans le rang.
        return { playerId, username: '—', avatar: null };
    };

    function vueDesEquipes(gameState) {
        synchroniser(gameState);
        const etat = gameState.codanime;
        const paquet = {};
        for (const e of ['A', 'B']) {
            paquet[e] = {
                espion: etat.equipes[e].espion,
                espionNom: etat.equipes[e].espion ? nomDe(gameState, etat.equipes[e].espion) : null,
                // La vignette complète de l'espion, pour le rang de côté : son
                // seul nom suffisait au tiroir du salon, pas à un portrait.
                espionFiche: etat.equipes[e].espion ? vignette(gameState, etat.equipes[e].espion) : null,
                agents: etat.equipes[e].agents.map(id => vignette(gameState, id)),
                restant: etat.restant[e],
            };
        }
        return paquet;
    }

    // ⚠️ La seule fonction qui décide QUI VOIT QUOI. Un agent ne reçoit
    // jamais les camps des cartes cachées — pas même pour les masquer à
    // l'affichage, ce qui laisserait la clef dans l'onglet réseau.
    function etatPourLeClient(gameState, playerId) {
        const etat = gameState.codanime;
        const espion = estEspion(etat, playerId);
        const monEquipe = equipeDe(etat, playerId);
        // Les agents PRÉSENTS du camp qui joue. ⚠️ Le client en a besoin pour
        // deux choses : savoir combien de voix il manque, et dessiner en
        // creux ceux qui n'ont pas encore cliqué — sans quoi une unanimité
        // qui n'arrive pas ne dit pas qui l'on attend.
        const agentsDuTour = etat.tourDe
            ? agentsPresents(etat, etat.tourDe, estPresent(gameState)) : [];

        return {
            active: etat.active,
            phase: etat.phase,
            tourDe: etat.tourDe,
            monEquipe,
            jeSuisEspion: espion,
            grille: espion ? grillePourEspion(etat, urlImage) : grillePourAgent(etat, urlImage),
            equipes: vueDesEquipes(gameState),
            indice: etat.indice,
            // Les marques, visibles de TOUS : c'est la convergence qui se
            // regarde monter, et c'est elle qui remplace les mains tendues
            // autour d'une table.
            votes: etat.votes,
            // Qui a voté « on s'arrête » : le bouton montre où en est
            // l'unanimité, sinon on clique dans le vide.
            passe: etat.passe || [],
            agentsDuTour,
            seuil: seuil(agentsDuTour.length),
            // Les coups qu'il reste. ⚠️ `Infinity` ne traverse pas JSON — il
            // s'y sérialise en `null`. On envoie `-1`, comme pour le nombre
            // de l'indice, et le client lit les deux de la même façon.
            coups: etat.coups === Infinity ? INDICE_INFINI : etat.coups,
            historique: etat.historique,
            restant: etat.restant,
            // ⚠️ Un RESTE en millisecondes, jamais une échéance : l'horloge du
            // client n'est pas celle du serveur. Voir la note de Rush.
            reste: etat.finTour ? Math.max(0, etat.finTour - Date.now()) : 0,
            chrono: etat.chrono,
            dureeTour: etat.dureeTour,
            piege: etat.piege !== false,
            // ⚠️ La durée de RÉFÉRENCE change selon la phase : la jauge se
            // remplirait de travers si le client divisait toujours par la
            // durée du tour, alors que la phase d'indice en dure trente.
            dureePhase: etat.phase === 'indice' ? DUREE_INDICE : etat.dureeTour,
            gagnant: etat.gagnant,
            manche: etat.manche,
        };
    }

    // ⚠️ Chacun reçoit SA vue, donc PAS de diffusion groupée : l'espion voit
    // les 25 camps, l'agent n'en voit aucun. Un `diffuser()` unique enverrait
    // la même charge à tout le monde, c'est-à-dire la clef à tout le monde.
    function diffuserEtat(gameState) {
        const io = getIo && getIo();
        if (!io) return;
        for (const [sid, p] of gameState.players) {
            const socket = io.sockets.sockets.get(sid);
            if (socket) socket.emit('codanime-etat', etatPourLeClient(gameState, p.playerId));
        }
    }

    // ── Le déroulé ─────────────────────────────────────────────────
    // ⚠️ LA PHASE D'INDICE A SON PROPRE CHRONO, et il manquait : rien ne
    // bornait le temps de réflexion de l'espion. Un espion absent, ou qui
    // ne trouve rien, figeait la partie pour les sept autres — sans que
    // rien à l'écran ne dise qu'on attendait quelqu'un.
    //
    // À l'échéance, on passe la main : annoncer de force un nombre au
    // hasard serait pire, l'équipe engagerait des cartes sur un mot que
    // personne n'a dit.
    function ouvrirTour(gameState, equipe) {
        const etat = gameState.codanime;
        nettoyerTimeouts(etat);
        etat.tourDe = equipe;
        etat.phase = 'indice';
        etat.indice = null;
        etat.votes = {};
        etat.coups = 0;
        etat.passe = [];
        etat.finTour = etat.chrono ? Date.now() + DUREE_INDICE * 1000 : 0;
        if (etat.chrono) {
            plusTard(etat, () => {
                // Toujours vérifier qu'on est encore là où l'on croit : le
                // minuteur peut survivre d'un battement à l'annonce.
                if (!etat.active || etat.phase !== 'indice') return;
                diffuser(gameState, 'codanime-indice-rate', { equipe: etat.tourDe });
                finirTour(gameState);
            }, DUREE_INDICE * 1000);
        }
        diffuserEtat(gameState);
    }

    function demarrer(gameState) {
        const etat = gameState.codanime;
        if (etat.active) return { ok: false, raison: 'deja-en-cours' };

        if (!compositionValide(etat)) composerAuto(gameState);
        if (!compositionValide(etat)) {
            return { ok: false, raison: 'composition' };
        }

        const premier = Math.random() < 0.5 ? 'A' : 'B';
        etat.grille = construireGrille(vivier(), premier, Math.random, etat.piege !== false);
        etat.restant = {
            A: premier === 'A' ? CAMP_PREMIER : CAMP_SECOND,
            B: premier === 'B' ? CAMP_PREMIER : CAMP_SECOND,
        };
        etat.historique = [];
        etat.gagnant = null;
        etat.manche++;
        etat.active = true;
        gameState.inProgress = true;
        gameState.winnerScreenData = null;

        diffuser(gameState, 'codanime-debut', { premier });
        ouvrirTour(gameState, premier);
        return { ok: true, premier };
    }

    // L'espion annonce SON NOMBRE. Le mot, lui, se dit à la voix.
    function annoncerIndice(gameState, playerId, nombre, mot) {
        const etat = gameState.codanime;
        if (!etat.active || etat.phase !== 'indice') return { ok: false, raison: 'phase' };
        if (etat.equipes[etat.tourDe].espion !== playerId) return { ok: false, raison: 'pas-espion' };

        const n = parseInt(nombre, 10);
        if (!Number.isInteger(n)) return { ok: false, raison: 'nombre' };
        if (!indiceValide(n, etat.restant[etat.tourDe])) {
            return { ok: false, raison: 'trop-grand', max: Math.min(INDICE_MAX, etat.restant[etat.tourDe]) };
        }

        // ⚠️ Le MOT est exigé, et nettoyé ici — jamais au client, qui est
        // justement la pièce qu'on ne contrôle pas. Un indice vide laisserait
        // l'équipe deviner sans rien, ce qui est pire qu'un tour passé.
        const m = nettoyerMot(mot);
        if (!m) return { ok: false, raison: 'mot-vide' };

        etat.indice = { mot: m, nombre: n };
        etat.coups = coupsPour(n);

        // ⚠️ LA LIGNE D'HISTORIQUE NAÎT ICI, plus à la fin du tour. Elle était
        // écrite à la clôture pour citer l'espion même s'il partait en
        // route ; maintenant qu'il n'y a plus de clôture, l'écrire à
        // l'annonce est même PLUS juste — celui qui vient d'annoncer est
        // présent par définition. Et `trouvees` monte carte par carte.
        etat.historique.push({
            equipe: etat.tourDe,
            espion: etat.equipes[etat.tourDe].espion
                ? nomDe(gameState, etat.equipes[etat.tourDe].espion) : '—',
            mot: m,
            nombre: n,
            trouvees: 0,
        });

        ouvrirCoup(gameState);
        return { ok: true, nombre: n };
    }

    // ── UN COUP ────────────────────────────────────────────────────
    // Un coup, c'est : les agents désignent une carte, l'unanimité la
    // retourne. Chaque coup a SON chrono.
    //
    // ⚠️ LE CHRONO EST PAR COUP, pas par tour. Un chrono de tour unique
    // étranglait les longues séries : avec `n + 1` coups, une équipe qui
    // enchaîne quatre bonnes cartes aurait eu le même temps qu'une qui se
    // trompe au premier. À l'échéance, le tour s'arrête — un camp qui
    // n'arrive pas à se mettre d'accord perd son tour, il ne bloque pas la
    // partie. C'est ce qui rend l'unanimité tenable.
    function ouvrirCoup(gameState) {
        const etat = gameState.codanime;
        nettoyerTimeouts(etat);
        etat.phase = 'vote';
        etat.votes = {};
        etat.passe = [];
        etat.finTour = etat.chrono ? Date.now() + etat.dureeTour * 1000 : 0;
        if (etat.chrono) {
            plusTard(etat, () => {
                if (!etat.active || etat.phase !== 'vote') return;
                finirTour(gameState);
            }, etat.dureeTour * 1000);
        }
        diffuserEtat(gameState);
    }

    function voter(gameState, playerId, idx) {
        const etat = gameState.codanime;
        if (!etat.active || etat.phase !== 'vote') return { ok: false, raison: 'phase' };
        const monEquipe = equipeDe(etat, playerId);
        if (monEquipe !== etat.tourDe) return { ok: false, raison: 'pas-ton-tour' };
        // ⚠️ L'espion ne vote pas et ne pose aucune marque : il désignerait
        // du doigt, ce qui est exactement ce que l'indice doit remplacer.
        if (estEspion(etat, playerId)) return { ok: false, raison: 'espion-ne-vote-pas' };

        const r = basculerVote(etat, playerId, idx);
        if (!r.ok) return r;

        diffuserEtat(gameState);

        // L'UNANIMITÉ DES PRÉSENTS retourne la carte, sur-le-champ.
        const nbAgents = agentsPresents(etat, monEquipe, estPresent(gameState)).length;
        if (voixDe(etat, idx).length >= seuil(nbAgents)) resoudre(gameState, idx);
        return r;
    }

    // « On s'arrête » : à l'unanimité aussi, comme une carte.
    //
    // ⚠️ IL N'EST PLUS FACULTATIF. Avec un indice à 0 ou à ∞ les coups sont
    // illimités : sans ce bouton, le seul moyen de rendre la main serait de
    // se tromper ou d'attendre le chrono.
    // ⚠️ Et un veto sur « on s'arrête » ne coûte rien : si l'équipe ne
    // s'accorde pas, elle continue de jouer, et le chrono finira le tour.
    // C'est l'inverse d'un veto sur une carte, qui lui gèle tout.
    function passer(gameState, playerId) {
        const etat = gameState.codanime;
        if (!etat.active || etat.phase !== 'vote') return { ok: false, raison: 'phase' };
        if (equipeDe(etat, playerId) !== etat.tourDe) return { ok: false, raison: 'pas-ton-tour' };
        if (estEspion(etat, playerId)) return { ok: false, raison: 'espion-ne-vote-pas' };

        etat.passe = etat.passe || [];
        if (etat.passe.includes(playerId)) etat.passe = etat.passe.filter(p => p !== playerId);
        else etat.passe.push(playerId);

        const nbAgents = agentsPresents(etat, etat.tourDe, estPresent(gameState)).length;
        diffuserEtat(gameState);
        if (etat.passe.length >= seuil(nbAgents)) finirTour(gameState);
        return { ok: true };
    }

    // ── La résolution d'un coup ────────────────────────────────────
    //
    // La carte part TOUT DE SUITE — c'est elle qu'on regarde, et le balayage
    // joue dessus. Ce qui attend `BATTEMENT`, c'est la SUITE : on laisse le
    // temps de lire la couleur avant d'enchaîner ou de rendre la main.
    function resoudre(gameState, idx) {
        const etat = gameState.codanime;
        if (!etat.active || etat.phase !== 'vote') return;
        nettoyerTimeouts(etat);
        etat.phase = 'revelation';
        etat.finTour = 0;
        etat.votes = {};
        etat.passe = [];

        const issue = revelerCarte(etat, idx);
        const ligne = etat.historique[etat.historique.length - 1];
        if (issue === 'bonne' && ligne) ligne.trouvees++;

        diffuser(gameState, 'codanime-carte', {
            i: idx,
            camp: etat.grille[idx].camp,
            issue,
            restant: etat.restant,
        });
        diffuserEtat(gameState);

        // ⚠️ LA DERNIÈRE CARTE A DROIT À SON TEMPS. La fin partait à
        // l'instant où la carte se retournait : on passait au classement sans
        // avoir vu l'assassin noircir, c'est-à-dire qu'on ratait le seul
        // moment où le mode fait peur. Deux secondes, le temps que le
        // balayage se joue et qu'on lise la couleur — et le client s'efface
        // ensuite en fondu avant le podium.
        // ⚠️ La victoire y a droit aussi : c'est la même carte qui tombe, et
        // la laisser filer d'un côté pendant qu'on l'attend de l'autre aurait
        // été un défaut de plus, pas un choix.
        if (issue === 'assassin') {
            plusTard(etat, () => terminer(gameState, 'assassin', etat.tourDe), FIN_PAUSE);
            return;
        }

        const gagne = vainqueur(etat, null);
        if (gagne) {
            plusTard(etat, () => terminer(gameState, 'complet', null, gagne), FIN_PAUSE);
            return;
        }

        // ⚠️ UNE SEULE ERREUR ARRÊTE LE TOUR, et c'est tout le sel du mode :
        // une carte adverse, un passant, et la main passe sur-le-champ. Les
        // coups qui restaient sont perdus.
        if (issue !== 'bonne') {
            plusTard(etat, () => finirTour(gameState), BATTEMENT);
            return;
        }

        // ⚠️ Le décompte se fait sur les cartes TROUVÉES. Une erreur ne
        // consomme pas un coup — elle les consomme tous.
        etat.coups--;
        if (etat.coups <= 0) {
            plusTard(etat, () => finirTour(gameState), BATTEMENT);
            return;
        }
        plusTard(etat, () => {
            if (!etat.active || etat.phase !== 'revelation') return;
            ouvrirCoup(gameState);
        }, BATTEMENT);
    }

    function finirTour(gameState) {
        const etat = gameState.codanime;
        if (!etat.active) return;
        nettoyerTimeouts(etat);
        ouvrirTour(gameState, equipeAdverse(etat.tourDe));
    }

    function terminer(gameState, raison, parAssassin, gagnantDirect) {
        const etat = gameState.codanime;
        if (!etat.active) return;
        etat.active = false;
        nettoyerTimeouts(etat);
        gameState.inProgress = false;

        const gagnant = gagnantDirect || vainqueur(etat, parAssassin);
        etat.gagnant = gagnant;
        etat.phase = 'fini';

        const fin = {
            gameMode: 'codanime',
            gagnant,
            raison: raison || null,
            equipes: vueDesEquipes(gameState),
            // Tout se dévoile à la fin : c'est le moment « ahhh c'était ÇA »,
            // et la capture d'écran que les gens postent.
            grille: grillePourEspion(etat, urlImage),
            historique: etat.historique,
        };

        diffuser(gameState, 'codanime-fin', fin);
        // ⚠️ Le podium doit survivre à un rafraîchissement, comme partout
        // ailleurs : sans ça, celui qui recharge est renvoyé au salon pendant
        // que les autres lisent encore le résultat.
        gameState.winnerScreenData = fin;

        if (recordFinishedGame) {
            const joueurs = [].concat(
                etat.equipes.A.espion ? [etat.equipes.A.espion] : [], etat.equipes.A.agents,
                etat.equipes.B.espion ? [etat.equipes.B.espion] : [], etat.equipes.B.agents);
            recordFinishedGame({
                mode: 'codanime',
                playersCount: joueurs.length,
                winnerName: gagnant ? ('Équipe ' + gagnant) : null,
                duration: 0,
                gameState,
            });
        }
    }

    // ⚠️ Les votes d'un joueur parti RESTENT sur le plateau — décision
    // assumée. Conséquence à connaître : à trois agents dont un parti, le
    // seuil reste 2, donc un agent vivant qui clique une carte déjà marquée
    // par l'absent l'engage à lui seul. L'hôte peut toujours arrêter la
    // partie, comme dans les autres modes.
    function quitter(gameState, playerId) {
        const etat = gameState.codanime;
        if (!etat.active) return;
        diffuserEtat(gameState);
    }

    function arreter(gameState) {
        const etat = gameState.codanime;
        nettoyerTimeouts(etat);
        etat.active = false;
        etat.phase = 'repos';
        etat.grille = [];
        etat.votes = {};
        etat.coups = 0;
        etat.passe = [];
    }

    return {
        demarrer, annoncerIndice, voter, passer,
        quitter, arreter, terminer,
        etatPourLeClient, diffuserEtat, vueDesEquipes,
        composerAuto, compositionValide, placerAuto, retirerDuSalon, synchroniser,
    };
}

module.exports = {
    etatNeuf, creerModule,
    // Le moteur, éprouvable sans serveur
    seuil, coupsPour, indiceValide, melanger,
    tirerPersonnages, distribuerCamps, construireGrille,
    basculerVote, voixAilleurs, voixDe,
    revelerCarte, vainqueur, equipeAdverse,
    grillePourAgent, grillePourEspion, estEspion, equipeDe, agentsPresents,
    TAILLE, CAMP_PREMIER, CAMP_SECOND, NEUTRES,
    INDICE_MAX, INDICE_INFINI, AGENTS_MAX, MAX_PAR_SERIE,
    DUREE_MIN, DUREE_MAX, DUREE_PAS, DUREE_TOUR_DEFAUT, DUREE_INDICE, dureeValide, BATTEMENT,
    MOT_MAX, nettoyerMot,
};
