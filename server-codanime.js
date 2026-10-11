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

const INDICE_MAX = 4;
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
const DUREE_MIN = 30;
const DUREE_MAX = 180;
const DUREE_PAS = 15;
const DUREE_TOUR_DEFAUT = 90;
function dureeValide(d) {
    return Number.isInteger(d) && d >= DUREE_MIN && d <= DUREE_MAX && d % DUREE_PAS === 0;
}
// Le battement entre deux cartes d'une même salve. C'est le suspense : on ne
// sait pas encore si le tour continue. Trop court, la salve devient un bloc.
const BATTEMENT = 1400;

// ── Le seuil de voix ───────────────────────────────────────────────
//
// La majorité STRICTE des agents présents : 1→1, 2→2, 3→2.
//
// ⚠️ Pas « la moitié » : à 4 agents, 2 voix laisseraient deux joueurs
// retourner une carte CONTRE l'avis des deux autres. Une égalité ne tranche
// pas. (Le mode plafonne à 3 agents, mais la formule doit rester juste si ce
// plafond bouge un jour.)
function seuil(nbAgents) {
    return Math.floor(Math.max(1, nbAgents) / 2) + 1;
}

// ⚠️ Le garde-fou qui dit si une configuration est JOUABLE :
//        agents × plafond ≥ nombre × seuil
// Avec un plafond de marques égal au nombre annoncé, ça se réduit à
// « agents ≥ seuil », toujours vrai. Mais si quelqu'un remet un plafond FIXE
// un jour, à deux agents un indice à 4 deviendrait impossible à honorer : les
// agents voteraient dans le vide sans que rien ne l'explique. On garde donc
// la formule sous la main.
function configJouable(nbAgents, plafondMarques, nombre) {
    return nbAgents * plafondMarques >= nombre * seuil(nbAgents);
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
function distribuerCamps(personnages, premier, alea) {
    const second = premier === 'A' ? 'B' : 'A';
    const camps = [];
    for (let i = 0; i < CAMP_PREMIER; i++) camps.push(premier);
    for (let i = 0; i < CAMP_SECOND; i++) camps.push(second);
    for (let i = 0; i < NEUTRES; i++) camps.push('neutre');
    camps.push('assassin');

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

function construireGrille(vivier, premier, alea) {
    return distribuerCamps(tirerPersonnages(vivier, alea), premier, alea);
}

// ── L'état d'un salon ──────────────────────────────────────────────
function etatNeuf() {
    return {
        active: false,
        // Réglages du salon
        chrono: true,
        dureeTour: DUREE_TOUR_DEFAUT,
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
        indice: null,       // { nombre }
        votes: {},          // idxCarte -> [playerId]
        franchiA: {},       // idxCarte -> horodatage du franchissement du seuil
        file: [],           // les cartes engagées, verrouillées à la clôture
        historique: [],     // { equipe, nombre, trouvees, engagees }
        gagnant: null,
        finTour: 0,
        manche: 0,
        timeouts: [],
    };
}

// ── Les votes ──────────────────────────────────────────────────────
//
// Fluide : on peut poser, retirer et changer sa voix jusqu'à la clôture.
//
// ⚠️ L'ORDRE EST CELUI DU FRANCHISSEMENT, pas celui du nombre de voix. Une
// carte à 3 voix obtenue en second reste derrière une carte à 2 voix obtenue
// en premier — sinon l'ordre se remettrait à bouger à chaque clic, et les
// agents ne sauraient jamais laquelle part en premier. Or l'ordre décide de
// qui survit à la chaîne.
function voixDe(etat, idx) {
    return etat.votes[idx] || [];
}

function compterMarques(etat, playerId) {
    let n = 0;
    for (const idx of Object.keys(etat.votes)) {
        if (etat.votes[idx].includes(playerId)) n++;
    }
    return n;
}

// Rend { ok, raison } — jamais d'exception : un clic refusé n'est pas une panne.
function basculerVote(etat, playerId, idx, nbAgents, maintenant) {
    if (etat.phase !== 'vote') return { ok: false, raison: 'pas-en-vote' };
    const carte = etat.grille[idx];
    if (!carte) return { ok: false, raison: 'carte-inconnue' };
    if (carte.revelee) return { ok: false, raison: 'deja-revelee' };

    const voix = voixDe(etat, idx);
    const dedans = voix.includes(playerId);

    if (!dedans) {
        // ⚠️ Le plafond de marques vaut LE NOMBRE ANNONCÉ, pas une constante.
        // Un plafond fixe rendrait certains indices impossibles à honorer —
        // voir configJouable.
        const plafond = etat.indice ? etat.indice.nombre : 1;
        if (compterMarques(etat, playerId) >= plafond) {
            return { ok: false, raison: 'plafond-atteint' };
        }
        etat.votes[idx] = voix.concat([playerId]);
    } else {
        const reste = voix.filter(p => p !== playerId);
        if (reste.length) etat.votes[idx] = reste;
        else delete etat.votes[idx];
    }

    // Franchissement, dans les deux sens.
    const s = seuil(nbAgents);
    const apres = voixDe(etat, idx).length;
    if (apres >= s && !etat.franchiA[idx]) etat.franchiA[idx] = maintenant;
    if (apres < s && etat.franchiA[idx]) delete etat.franchiA[idx];

    return { ok: true, pose: !dedans };
}

// Les cartes ayant franchi le seuil, dans l'ordre. Non plafonné : c'est
// `engagees` qui coupe au nombre annoncé.
function ordreFranchissement(etat) {
    return Object.keys(etat.franchiA)
        .map(Number)
        .sort((a, b) => etat.franchiA[a] - etat.franchiA[b]);
}

// ⚠️ Plus de cartes peuvent franchir le seuil que l'indice n'en annonce : à
// 3 agents, un indice à 2 met 6 voix en jeu, de quoi faire passer 3 cartes.
// On prend les PREMIÈRES dans l'ordre et l'on ignore le reste — la même règle
// sert donc à l'ordre de révélation ET au débordement, sans départage à
// inventer. Le client grise celles au-delà du quota pour qu'on le voie.
function engagees(etat) {
    const n = etat.indice ? etat.indice.nombre : 0;
    return ordreFranchissement(etat).slice(0, n);
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
    function vueDesEquipes(gameState) {
        synchroniser(gameState);
        const etat = gameState.codanime;
        const paquet = {};
        for (const e of ['A', 'B']) {
            paquet[e] = {
                espion: etat.equipes[e].espion,
                espionNom: etat.equipes[e].espion ? nomDe(gameState, etat.equipes[e].espion) : null,
                agents: etat.equipes[e].agents.map(id => ({ playerId: id, username: nomDe(gameState, id) })),
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
        const ordre = ordreFranchissement(etat);
        const retenues = engagees(etat);

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
            // L'ordre affiché ① ② ③ — et les cartes au-delà du quota, que le
            // client grise pour qu'on voie qu'on s'est trop engagé.
            ordre,
            retenues,
            seuil: seuil(agentsPresents(etat, etat.tourDe || 'A', estPresent(gameState)).length),
            historique: etat.historique,
            restant: etat.restant,
            // ⚠️ Un RESTE en millisecondes, jamais une échéance : l'horloge du
            // client n'est pas celle du serveur. Voir la note de Rush.
            reste: etat.finTour ? Math.max(0, etat.finTour - Date.now()) : 0,
            chrono: etat.chrono,
            dureeTour: etat.dureeTour,
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
    function ouvrirTour(gameState, equipe) {
        const etat = gameState.codanime;
        etat.tourDe = equipe;
        etat.phase = 'indice';
        etat.indice = null;
        etat.votes = {};
        etat.franchiA = {};
        etat.file = [];
        etat.finTour = 0;
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
        etat.grille = construireGrille(vivier(), premier, Math.random);
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
    function annoncerIndice(gameState, playerId, nombre) {
        const etat = gameState.codanime;
        if (!etat.active || etat.phase !== 'indice') return { ok: false, raison: 'phase' };
        if (etat.equipes[etat.tourDe].espion !== playerId) return { ok: false, raison: 'pas-espion' };

        const n = parseInt(nombre, 10);
        if (!Number.isInteger(n) || n < 1) return { ok: false, raison: 'nombre' };
        // ⚠️ Borné par le plafond ET par ce qu'il reste à trouver : annoncer 4
        // quand il ne reste que 2 cartes n'a aucun sens, et laisserait engager
        // plus de cartes que l'équipe n'en possède.
        const max = Math.min(INDICE_MAX, etat.restant[etat.tourDe]);
        if (n > max) return { ok: false, raison: 'trop-grand', max };

        etat.indice = { nombre: n };
        etat.phase = 'vote';
        etat.finTour = etat.chrono ? Date.now() + etat.dureeTour * 1000 : 0;
        if (etat.chrono) {
            plusTard(etat, () => cloturer(gameState), etat.dureeTour * 1000);
        }
        diffuserEtat(gameState);
        return { ok: true, nombre: n };
    }

    function voter(gameState, playerId, idx) {
        const etat = gameState.codanime;
        if (!etat.active || etat.phase !== 'vote') return { ok: false, raison: 'phase' };
        const monEquipe = equipeDe(etat, playerId);
        if (monEquipe !== etat.tourDe) return { ok: false, raison: 'pas-ton-tour' };
        // ⚠️ L'espion ne vote pas et ne pose aucune marque : il désignerait
        // du doigt, ce qui est exactement ce que l'indice doit remplacer.
        if (estEspion(etat, playerId)) return { ok: false, raison: 'espion-ne-vote-pas' };

        const nbAgents = agentsPresents(etat, monEquipe, estPresent(gameState)).length;
        const r = basculerVote(etat, playerId, idx, nbAgents, Date.now());
        if (!r.ok) return r;

        diffuserEtat(gameState);

        // Quota atteint → on résout tout de suite, sans faire attendre une
        // équipe décidée. C'est « le premier des deux » avec le chrono.
        if (engagees(etat).length >= etat.indice.nombre) {
            plusTard(etat, () => cloturer(gameState), 400);
        }
        return r;
    }

    // Les agents peuvent renoncer : « on s'arrête » se vote comme une carte,
    // au même seuil. Sans ça l'équipe ne peut jamais choisir de s'arrêter.
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
        if (etat.passe.length >= seuil(nbAgents)) cloturer(gameState);
        return { ok: true };
    }

    function cloturer(gameState) {
        const etat = gameState.codanime;
        if (!etat.active || etat.phase !== 'vote') return;
        nettoyerTimeouts(etat);

        etat.file = engagees(etat);
        etat.passe = [];
        etat.phase = 'revelation';
        etat.finTour = 0;

        etat.historique.push({
            equipe: etat.tourDe,
            nombre: etat.indice ? etat.indice.nombre : 0,
            engagees: etat.file.length,
            trouvees: 0,
        });

        diffuserEtat(gameState);
        plusTard(etat, () => revelerSuivante(gameState), BATTEMENT);
    }

    function revelerSuivante(gameState) {
        const etat = gameState.codanime;
        if (!etat.active || etat.phase !== 'revelation') return;

        if (!etat.file.length) { finirTour(gameState); return; }

        const idx = etat.file.shift();
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

        if (issue === 'assassin') { terminer(gameState, 'assassin', etat.tourDe); return; }

        const gagne = vainqueur(etat, null);
        if (gagne) { terminer(gameState, 'complet', null, gagne); return; }

        // ⚠️ La chaîne casse à la PREMIÈRE carte qui n'est pas la leur, et les
        // cartes engagées restantes ne sont jamais révélées. C'est tout le
        // prix de la gourmandise : engager trois cartes, c'est accepter de
        // n'en toucher aucune au-delà de la première erreur.
        if (issue !== 'bonne') { etat.file = []; finirTour(gameState); return; }

        plusTard(etat, () => revelerSuivante(gameState), BATTEMENT);
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
        etat.franchiA = {};
        etat.file = [];
        etat.passe = [];
    }

    return {
        demarrer, annoncerIndice, voter, passer, cloturer,
        quitter, arreter, terminer,
        etatPourLeClient, diffuserEtat, vueDesEquipes,
        composerAuto, compositionValide, placerAuto, retirerDuSalon, synchroniser,
    };
}

module.exports = {
    etatNeuf, creerModule,
    // Le moteur, éprouvable sans serveur
    seuil, configJouable, melanger,
    tirerPersonnages, distribuerCamps, construireGrille,
    basculerVote, ordreFranchissement, engagees, compterMarques, voixDe,
    revelerCarte, vainqueur, equipeAdverse,
    grillePourAgent, grillePourEspion, estEspion, equipeDe, agentsPresents,
    TAILLE, CAMP_PREMIER, CAMP_SECOND, NEUTRES,
    INDICE_MAX, AGENTS_MAX, MAX_PAR_SERIE,
    DUREE_MIN, DUREE_MAX, DUREE_PAS, DUREE_TOUR_DEFAUT, dureeValide, BATTEMENT,
};
