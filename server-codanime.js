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

const DUREES_TOUR = [60, 90, 120];
const DUREE_TOUR_DEFAUT = 90;
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

module.exports = {
    etatNeuf,
    // Le moteur, éprouvable sans serveur
    seuil, configJouable, melanger,
    tirerPersonnages, distribuerCamps, construireGrille,
    basculerVote, ordreFranchissement, engagees, compterMarques, voixDe,
    revelerCarte, vainqueur, equipeAdverse,
    grillePourAgent, grillePourEspion, estEspion, equipeDe, agentsPresents,
    TAILLE, CAMP_PREMIER, CAMP_SECOND, NEUTRES,
    INDICE_MAX, AGENTS_MAX, MAX_PAR_SERIE,
    DUREES_TOUR, DUREE_TOUR_DEFAUT, BATTEMENT,
};
