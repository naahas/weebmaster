// ════════════════════════════════════════════════════════════
// ✅❌ CHOICE — le mode à deux bords
// ════════════════════════════════════════════════════════════
// Une affirmation s'affiche. Tout le monde part d'un seul tas au milieu,
// et chacun a quelques secondes pour aller du côté VRAI (bleu, à gauche)
// ou FAUX (rouge, à droite). On ne se reprend pas. À la fin du compte, le
// mauvais bord éclate et ceux qui s'y trouvaient perdent une vie.
//
// Le module suit la coupe de server-collect.js : le MOTEUR d'abord —
// pur, sans socket, éprouvable sans serveur —, puis son raccord au salon.
//
// ── Les règles qui ne se devinent pas ──────────────────────────────
//
// ⚠️ LA RÉPONSE NE SORT JAMAIS AVANT LA RÉVÉLATION. C'est la règle qui
// gouverne tout le fichier. `questionPourLeJoueur()` est le SEUL objet
// qu'on diffuse, et il ne porte ni `reponse` ni `proof_url` — l'URL nomme
// très souvent la réponse. La leçon vient du quiz, où `proof_url`
// voyageait avec la question et se lisait dans l'onglet réseau avant
// d'avoir répondu.
//
// ⚠️ NE PAS CHOISIR N'EST PAS UNE PROTECTION. Les indécis perdent une vie
// comme ceux du mauvais bord. Sans ça, la stratégie optimale d'un joueur
// prudent est de ne jamais bouger, et le mode n'a plus de mode.
//
// ⚠️ SI TOUT LE MONDE SE TROMPE, PERSONNE NE PERD RIEN. La manche est
// nulle et une autre question tombe. Sans cette règle, UNE question trop
// dure vide le salon d'un coup et la partie se termine sans vainqueur —
// le pire écran possible pour un stream. C'est le seul cas où l'on
// pardonne, et il est rare : il faut que pas un seul survivant n'ait
// trouvé.
//
// ⚠️ LA DIFFICULTÉ MONTE AVEC LES ÉLIMINATIONS, pas avec le numéro de la
// manche. Un salon de trente qui perd la moitié d'un coup doit se durcir
// aussitôt ; un salon de cinq qui ne perd personne en six manches doit se
// durcir aussi, sinon on tourne en rond sur des « easy » que tout le
// monde connaît. La part de survivants décide donc, et le palier ne
// REDESCEND jamais.

const DUREES = [5, 8, 12];           // secondes de choix proposées au salon
const DUREE_DEFAUT = 8;
const VIES_DEFAUT = 1;
const PALIERS = ['veryeasy', 'easy', 'medium', 'hard', 'veryhard', 'extreme'];

// Après le verrouillage : le temps que l'écran montre les camps figés,
// puis celui que dure la sanction avant la question suivante.
const ATTENTE_VERROU = 900;
const ATTENTE_SANCTION = 2600;

// ════════════════════════════════════════════
// LE MOTEUR — aucune socket ici
// ════════════════════════════════════════════

function etatNeuf() {
    return {
        active: false,
        vies: VIES_DEFAUT,
        duree: DUREE_DEFAUT,
        voirLesAutres: true,     // voir les autres bouger EST le jeu
        serieFiltre: 'overall',  // 'overall' ou un nom de série exact
        // ⚠️ AUCUN réglage de spoil ici, et il ne reviendra pas. La colonne
        // `is_spoil` reste en base — un énoncé peut être marqué — mais plus
        // rien ne la lit : un salon ne trie pas ses énoncés là-dessus.

        manche: 0,
        palier: 0,               // index dans PALIERS, ne redescend jamais
        joueurs: new Map(),      // playerId -> { vies, camp, vivant, elimineA }
        question: null,          // l'énoncé en cours, AVEC sa réponse
        finA: 0,                 // échéance du choix (horloge serveur)
        dejaVus: [],             // ids servis dans cette partie
        debutA: 0,
        timeouts: [],            // tout ce qu'il faut pouvoir annuler
    };
}

// Ce que le joueur reçoit. ⚠️ Ni `reponse`, ni `proof_url`.
function questionPourLeJoueur(q) {
    if (!q) return null;
    return { id: q.id, question: q.question, serie: q.serie, difficulty: q.difficulty };
}

// La part de survivants décide du palier. Trois quarts encore debout :
// on reste ; la moitié : un cran ; un tiers : deux ; un cinquième : trois.
function palierVise(vivants, auDepart) {
    if (auDepart <= 1) return 0;
    const part = vivants / auDepart;
    if (part > 0.75) return 0;
    if (part > 0.5) return 1;
    if (part > 0.33) return 2;
    if (part > 0.2) return 3;
    return 4;
}

// ⚠️ Le palier ne REDESCEND jamais, et il monte aussi quand une manche
// n'élimine personne : sans ce second moteur, un salon de cinq joueurs
// prudents resterait sur « easy » toute la partie.
function monterLePalier(etat, vivants, auDepart, personneElimine) {
    const vise = palierVise(vivants, auDepart);
    let p = Math.max(etat.palier, vise);
    if (personneElimine) p = Math.min(p + 1, PALIERS.length - 1);
    etat.palier = Math.min(p, PALIERS.length - 1);
}

// Tirer un énoncé. On vise le palier courant et on s'écarte si le compte
// n'y est pas — un salon ne doit jamais s'arrêter faute de question à la
// bonne difficulté. L'ordre de repli part du palier et s'éloigne de
// proche en proche, vers le bas d'abord : mieux vaut trop facile que de
// sauter d'« easy » à « extreme ».
function ordreDeRepli(depart) {
    const ordre = [depart];
    for (let d = 1; d < PALIERS.length; d++) {
        if (depart - d >= 0) ordre.push(depart - d);
        if (depart + d < PALIERS.length) ordre.push(depart + d);
    }
    return ordre;
}

function tirerQuestion(etat, banque) {
    const vus = new Set(etat.dejaVus);
    const serie = etat.serieFiltre;

    const utilisable = (q) => {
        if (vus.has(q.id)) return false;
        if (serie !== 'overall' && q.serie !== serie) return false;
        return true;
    };

    const dispo = banque.filter(utilisable);
    if (!dispo.length) return null;

    for (const i of ordreDeRepli(etat.palier)) {
        const lot = dispo.filter(q => q.difficulty === PALIERS[i]);
        if (lot.length) return lot[Math.floor(Math.random() * lot.length)];
    }
    // Une difficulté inconnue traîne en base : on sert quand même.
    return dispo[Math.floor(Math.random() * dispo.length)];
}

// Combien d'énoncés ce salon peut-il encore servir ? Sert au démarrage,
// pour refuser tout de suite plutôt qu'au milieu de la troisième manche.
function combienDisponibles(etat, banque) {
    return banque.filter(q =>
        etat.serieFiltre === 'overall' || q.serie === etat.serieFiltre).length;
}

// Le dépouillement d'une manche. PUR : il prend l'état et rend ce qu'il
// faut en faire, sans rien diffuser ni rien modifier.
function depouiller(etat) {
    const bonne = etat.question ? etat.question.reponse === true : true;
    const vivants = [...etat.joueurs.entries()].filter(([, j]) => j.vivant);

    const justes = vivants.filter(([, j]) => j.camp !== null && (j.camp === 'v') === bonne);
    const faux = vivants.filter(([, j]) => j.camp !== null && (j.camp === 'v') !== bonne);
    const absents = vivants.filter(([, j]) => j.camp === null);

    // ⚠️ La manche nulle : personne n'a trouvé. On ne sanctionne pas —
    // sinon une seule question trop dure termine la partie à vide.
    const nulle = justes.length === 0 && vivants.length > 0;

    return {
        bonne,
        nulle,
        justes: justes.map(([id]) => id),
        perdants: nulle ? [] : faux.concat(absents).map(([id]) => id),
        vivantsAvant: vivants.length,
    };
}

// ════════════════════════════════════════════
// LE RACCORD AU SALON
// ════════════════════════════════════════════

// ⚠️ PAS de `io` dans les dépendances, et ce n'est pas un oubli : tout
// passe par `diffuser`, qui vise la room et elle seule. Le prendre ici
// obligeait de surcroît à créer le module APRÈS `io`, alors qu'on veut le
// poser à côté de `diffuser` — et un `const` lu trop tôt lève une
// ReferenceError qui tue le démarrage entier.
function creerModule(deps) {
    const { diffuser, assurerBanqueVF, supabase, recordFinishedGame, MIN_JOUEURS } = deps;

    const nettoyerTimeouts = (etat) => {
        etat.timeouts.forEach(t => clearTimeout(t));
        etat.timeouts = [];
    };
    const plusTard = (etat, fn, ms) => {
        const t = setTimeout(fn, ms);
        etat.timeouts.push(t);
        return t;
    };

    // ⚠️ LE DUEL FINAL SE JOUE À L'AVEUGLE, et ce n'est pas un réglage.
    //
    // À deux survivants, voir le bord de l'autre casse la fin : le second à
    // choisir n'a qu'à se coller au premier. Les deux sont alors toujours du
    // même côté, donc toujours justes ensemble ou faux ensemble — la manche
    // ne peut plus départager et le duel tourne en rond jusqu'à ce que la
    // banque s'épuise. Vu en partie.
    //
    // Les placements se cachent donc d'eux-mêmes dès qu'il ne reste que deux
    // vivants, quoi qu'ait réglé l'hôte. Le compte reste connu (`aChoisi`) :
    // on sait que l'autre a tranché, on ne sait pas pour quoi.
    //
    // ⚠️ Côté SERVEUR, jamais en masquant côté client : l'onglet réseau
    // donnerait le bord de l'adversaire, ce qui est exactement ce qu'on
    // protège ici.
    function placementsCaches(gameState) {
        const etat = gameState.choice;
        if (!etat.voirLesAutres) return true;
        let vivants = 0;
        for (const [, j] of etat.joueurs) if (j.vivant) vivants++;
        return vivants <= 2;
    }

    // Ce que l'écran doit savoir des joueurs. Le camp n'y est que si le
    // salon a laissé « voir les autres » ET qu'on n'est pas dans le duel
    // final — sinon on dit seulement QUE la personne a choisi, ce qui garde
    // le compte sans donner le bord.
    function joueursPourLEcran(gameState) {
        const etat = gameState.choice;
        const out = [];
        for (const [sid, p] of gameState.players) {
            const j = etat.joueurs.get(p.playerId);
            if (!j) continue;
            out.push({
                playerId: p.playerId,
                username: p.username,
                // ⚠️ `avatarUrl`, PAS `avatar` : c'est le nom que porte
                // l'entrée d'un joueur dans `gameState.players`, posé par
                // `avatarPropre()` à la jointure. En lisant `p.avatar` on
                // envoyait `undefined`, et tout le monde se retrouvait avec
                // le portrait par défaut — y compris celui qui venait d'en
                // choisir un. Rien ne le signalait : `srcAvatar()` retombe
                // en silence sur « novice.png ».
                avatar: p.avatarUrl,
                vies: j.vies,
                vivant: j.vivant,
                // ⚠️ `camp` est à null quand le salon cache les placements.
                // Ne PAS envoyer puis masquer côté client : l'onglet réseau
                // donnerait le bord de chacun, ce que le réglage promet
                // justement de cacher.
                camp: placementsCaches(gameState) ? null : j.camp,
                aChoisi: j.camp !== null,
            });
        }
        return out;
    }

    function etatPourLeClient(gameState) {
        const etat = gameState.choice;
        return {
            manche: etat.manche,
            question: questionPourLeJoueur(etat.question),
            reste: Math.max(0, etat.finA - Date.now()),
            duree: etat.duree * 1000,
            voirLesAutres: etat.voirLesAutres,
            // ⚠️ SÉPARÉ du réglage, et pas une valeur « effective » qui
            // l'écraserait : `voirLesAutres` est ce qu'a choisi l'hôte et le
            // tiroir l'affiche, `caches` est ce qui s'applique à cette manche
            // — le duel final le force. Les confondre ferait mentir le tiroir
            // après une partie, quand on revient au salon.
            caches: placementsCaches(gameState),
            joueurs: joueursPourLEcran(gameState),
        };
    }

    async function demarrer(gameState) {
        const etat = gameState.choice;
        const banque = await assurerBanqueVF(supabase);

        if (!banque || !banque.length) {
            return { success: false, error: 'Aucun vrai/faux en banque — ajoute-les depuis /admin.' };
        }
        const dispo = combienDisponibles(etat, banque);
        // Trois manches au moins, sinon la partie n'en est pas une.
        if (dispo < 3) {
            return {
                success: false,
                error: 'Pas assez d’énoncés pour ce filtre (' + dispo + ').',
            };
        }
        if (gameState.players.size < MIN_JOUEURS) {
            return { success: false, error: 'Il faut au moins ' + MIN_JOUEURS + ' joueurs.' };
        }

        nettoyerTimeouts(etat);
        etat.active = true;
        etat.manche = 0;
        etat.palier = 0;
        etat.dejaVus = [];
        etat.question = null;
        etat.debutA = Date.now();
        etat.joueurs = new Map();
        for (const [, p] of gameState.players) {
            etat.joueurs.set(p.playerId, { vies: etat.vies, camp: null, vivant: true });
        }
        gameState.inProgress = true;
        gameState.initialPlayerCount = gameState.players.size;

        diffuser(gameState, 'choice-debut', {
            vies: etat.vies,
            duree: etat.duree * 1000,
            voirLesAutres: etat.voirLesAutres,
            caches: placementsCaches(gameState),
            joueurs: joueursPourLEcran(gameState),
        });

        plusTard(etat, () => mancheSuivante(gameState), 1200);
        return { success: true };
    }

    async function mancheSuivante(gameState) {
        const etat = gameState.choice;
        if (!etat.active) return;

        const vivants = [...etat.joueurs.values()].filter(j => j.vivant);
        if (vivants.length <= 1) return terminer(gameState);

        const banque = await assurerBanqueVF(supabase);
        const q = tirerQuestion(etat, banque || []);
        if (!q) {
            // Plus rien à servir : on arrête proprement plutôt que de
            // laisser le salon sur un écran vide.
            return terminer(gameState, 'Plus d’énoncés disponibles.');
        }

        etat.manche++;
        etat.question = q;
        etat.dejaVus.push(q.id);
        etat.joueurs.forEach(j => { if (j.vivant) j.camp = null; });
        etat.finA = Date.now() + etat.duree * 1000;

        diffuser(gameState, 'choice-question', {
            manche: etat.manche,
            question: questionPourLeJoueur(q),
            // ⚠️ Un RESTE en millisecondes, jamais une échéance : une
            // machine en retard de trois secondes verrait le compte
            // s'arrêter avant le bout. Le client fabrique son échéance
            // sur SA montre.
            reste: etat.duree * 1000,
            // Recalculé à CHAQUE manche : le duel final arrive en cours de
            // partie, c'est une élimination qui le déclenche.
            caches: placementsCaches(gameState),
            joueurs: joueursPourLEcran(gameState),
        });

        // 🧪 Les bots de mise au point choisissent un bord AU HASARD, trois à
        // quatre secondes après le départ. Sans ça ils restaient indécis et
        // tombaient tous à la première manche : impossible d'éprouver une
        // partie à dix sans dix onglets ouverts.
        // ⚠️ Le retard est borné à la durée du choix moins six dixièmes :
        // avec un salon réglé à cinq secondes, un bot qui part à 4,0 s
        // passerait encore, mais à 4,9 s il jouerait après le verrou.
        const retardMax = Math.max(400, etat.duree * 1000 - 600);
        for (const [, p] of gameState.players) {
            if (!p.estBot) continue;
            const j = etat.joueurs.get(p.playerId);
            if (!j || !j.vivant) continue;
            const quand = Math.min(3000 + Math.random() * 1000, retardMax);
            plusTard(etat, () => {
                choisir(gameState, p.playerId, Math.random() < 0.5 ? 'v' : 'f');
            }, quand);
        }

        plusTard(etat, () => verrouiller(gameState), etat.duree * 1000);
    }

    function verrouiller(gameState) {
        const etat = gameState.choice;
        if (!etat.active || !etat.question) return;

        diffuser(gameState, 'choice-verrou', { joueurs: joueursPourLEcran(gameState) });
        plusTard(etat, () => reveler(gameState), ATTENTE_VERROU);
    }

    function reveler(gameState) {
        const etat = gameState.choice;
        if (!etat.active || !etat.question) return;

        const auDepart = gameState.initialPlayerCount || etat.joueurs.size;
        const d = depouiller(etat);

        d.perdants.forEach(id => {
            const j = etat.joueurs.get(id);
            if (!j) return;
            j.vies--;
            if (j.vies <= 0) { j.vivant = false; j.elimineA = etat.manche; }
        });

        const vivants = [...etat.joueurs.values()].filter(j => j.vivant).length;
        monterLePalier(etat, vivants, auDepart, d.perdants.length === 0);

        // ⚠️ C'est ICI, et nulle part avant, que la réponse sort. Tout ce
        // qui a été diffusé jusque-là en était dépourvu.
        diffuser(gameState, 'choice-revelation', {
            bonne: d.bonne,
            nulle: d.nulle,
            proof_url: etat.question.proof_url || null,
            perdants: d.perdants,
            // Les camps de TOUT LE MONDE, cette fois : la manche est jouée,
            // le réglage « voir les autres » n'a plus rien à protéger.
            joueurs: [...etat.joueurs.entries()].map(([id, j]) => ({
                playerId: id, camp: j.camp, vies: j.vies, vivant: j.vivant,
            })),
            restants: vivants,
        });

        plusTard(etat, () => {
            if (vivants <= 1) terminer(gameState);
            else mancheSuivante(gameState);
        }, ATTENTE_SANCTION);
    }

    function terminer(gameState, raison) {
        const etat = gameState.choice;
        if (!etat.active) return;
        etat.active = false;
        nettoyerTimeouts(etat);
        gameState.inProgress = false;

        // Le classement : les vivants d'abord, puis les éliminés du plus
        // tard au plus tôt. Tenir une manche de plus doit se voir.
        const nomDe = (id) => {
            for (const [, p] of gameState.players) if (p.playerId === id) return p.username;
            return '—';
        };
        const classement = [...etat.joueurs.entries()]
            .map(([id, j]) => ({
                playerId: id, username: nomDe(id),
                vivant: j.vivant, vies: j.vies,
                // ⚠️ La manche ATTEINTE, et le vainqueur a atteint la
                // dernière — pas une de plus. `etat.manche + 1` annonçait
                // une manche qui n'a jamais été jouée.
                manche: j.vivant ? etat.manche : (j.elimineA || 0),
            }))
            .sort((a, b) => (b.vivant - a.vivant) || (b.manche - a.manche));

        const vainqueur = classement[0] && classement[0].vivant ? classement[0] : null;

        diffuser(gameState, 'choice-fin', {
            classement, manches: etat.manche, raison: raison || null,
        });

        if (recordFinishedGame) {
            recordFinishedGame({
                mode: 'choice',
                playersCount: gameState.initialPlayerCount || etat.joueurs.size,
                winnerName: vainqueur ? vainqueur.username : null,
                duration: Math.round((Date.now() - etat.debutA) / 1000),
                gameState,
            });
        }
    }

    // Un joueur choisit son bord. ⚠️ UNE SEULE FOIS : on ne se reprend
    // pas, c'est la règle du mode. Un second envoi est ignoré en silence
    // — le client grise déjà les deux bords.
    function choisir(gameState, playerId, camp) {
        const etat = gameState.choice;
        if (!etat.active || !etat.question) return { ok: false };
        if (camp !== 'v' && camp !== 'f') return { ok: false };
        if (Date.now() > etat.finA) return { ok: false };

        const j = etat.joueurs.get(playerId);
        if (!j || !j.vivant || j.camp !== null) return { ok: false };

        j.camp = camp;
        diffuser(gameState, 'choice-bouge', {
            playerId,
            // Même garde que `joueursPourLEcran` : le bord ne part que si le
            // salon l'autorise ET qu'on n'est pas dans le duel final.
            camp: placementsCaches(gameState) ? null : camp,
            comptes: comptes(gameState),
        });
        return { ok: true };
    }

    // ⚠️ LES DEUX COMPTEURS DES COINS SONT UNE FUITE au duel final, et c'est
    // le trou que cacher les placements laissait grand ouvert : à deux
    // vivants, « VRAI 2 · FAUX 0 » dit que l'autre est du même bord, et
    // « 1 · 1 » qu'il est en face. Dans les deux cas on sait tout, et cacher
    // les avatars n'aura servi à rien.
    //
    // On n'envoie donc plus que le nombre d'INDÉCIS, qui suffit à savoir si
    // l'autre a tranché sans dire pour quoi — et c'est déjà ce que dit le
    // halo sur son portrait. `v` et `f` partent à null : le client cache les
    // deux chiffres plutôt que d'afficher un zéro, qui se lirait comme une
    // information.
    function comptes(gameState) {
        const etat = gameState.choice;
        let v = 0, f = 0, indecis = 0;
        etat.joueurs.forEach(j => {
            if (!j.vivant) return;
            if (j.camp === 'v') v++;
            else if (j.camp === 'f') f++;
            else indecis++;
        });
        if (placementsCaches(gameState)) return { v: null, f: null, indecis };
        return { v, f, indecis };
    }

    // Un joueur part en pleine partie : il est traité comme un indécis
    // définitif. On ne le retire pas de la table — le classement final
    // doit pouvoir le nommer.
    function quitter(gameState, playerId) {
        const etat = gameState.choice;
        if (!etat.active) return;
        const j = etat.joueurs.get(playerId);
        if (!j || !j.vivant) return;
        j.vivant = false;
        j.elimineA = etat.manche;
        diffuser(gameState, 'choice-depart', { playerId, comptes: comptes(gameState) });

        const vivants = [...etat.joueurs.values()].filter(x => x.vivant).length;
        if (vivants <= 1) plusTard(etat, () => terminer(gameState), 600);
    }

    function arreter(gameState) {
        const etat = gameState.choice;
        nettoyerTimeouts(etat);
        etat.active = false;
    }

    return {
        demarrer, choisir, quitter, arreter, terminer,
        etatPourLeClient, joueursPourLEcran, comptes,
    };
}

module.exports = {
    etatNeuf, creerModule,
    // Exportés pour la suite de tests, qui éprouve le moteur sans serveur.
    questionPourLeJoueur, palierVise, monterLePalier, ordreDeRepli,
    tirerQuestion, combienDisponibles, depouiller,
    DUREES, DUREE_DEFAUT, VIES_DEFAUT, PALIERS,
};
