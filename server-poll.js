// ============================================
// 🗳️ POLL MODE - Server Logic
// ============================================

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════
// 📦 Chargement des données Poll
// ═══════════════════════════════════════════

let POLL_DATA = { animes: {}, specialCategories: {} };
try {
    const pollDataPath = path.join(__dirname, 'polldata.json');
    POLL_DATA = JSON.parse(fs.readFileSync(pollDataPath, 'utf8'));
    const totalChars = Object.values(POLL_DATA.animes).reduce((sum, a) => sum + a.characters.length, 0);
    console.log('✅ Poll: Données chargées -', Object.keys(POLL_DATA.animes).length, 'animes,', totalChars, 'personnages');
} catch (error) {
    console.error('❌ Erreur chargement polldata.json:', error.message);
}

// ═══════════════════════════════════════════
// ⚙️ Configuration
// ═══════════════════════════════════════════

const POLL_CONFIG = {
    MIN_PLAYERS: 2,
    MAX_PLAYERS: Infinity,
    VOTE_TIMER: 15,         // Secondes par vote (default, overridden by admin)
    RESULT_DISPLAY: 5,      // Secondes d'affichage résultats (avant que l'admin clique next)
};

// ═══════════════════════════════════════════
// 🗳️ État du mode Poll (ajouté dans gameState)
// ═══════════════════════════════════════════

function createPollState() {
    return {
        active: false,
        category: 'all',            // ID de la catégorie sélectionnée
        categoryName: '',           // Nom affiché
        perMatch: 2,                // 2, 3 ou 4 persos par match
        bracketSize: 16,            // 8, 16, 32, 64
        
        // Bracket
        bracket: [],                // Array de rounds: [{matches: [{id, characters: [{id,name,img}], votes: Map, winner: null}]}]
        currentRound: 0,            // Index du round actuel
        currentMatchIndex: 0,       // Index du match actuel dans le round
        
        // Match en cours
        currentMatch: null,         // {id, characters, votes: Map<twitchId, characterId>}
        voteTimer: null,            // Timeout du vote
        voteTimerEndTime: null,     // Timestamp fin du timer
        votingOpen: false,          // Les votes sont ouverts
        showingResults: false,      // Affichage des résultats
        
        // Historique
        allCharacters: [],          // Tous les persos sélectionnés pour ce tournoi
        eliminatedCharacters: [],   // Persos éliminés
        
        // Résultat final
        winner: null,               // Le personnage gagnant
        
        // Options d'affichage
        showNames: false,           // Afficher les noms sur les cartes
        voteTimerDuration: 15,      // Durée du timer en secondes (configurable par l'admin)
    };
}

// ═══════════════════════════════════════════
// 🎲 Génération du bracket
// ═══════════════════════════════════════════

/**
 * Récupère les personnages d'une catégorie
 */
function getCharactersForCategory(categoryId) {
    // Catégorie anime spécifique
    if (POLL_DATA.animes[categoryId]) {
        return POLL_DATA.animes[categoryId].characters.map(c => ({ ...c }));
    }
    
    // Catégorie spéciale (tag-based)
    const specialCat = POLL_DATA.specialCategories[categoryId];
    if (specialCat) {
        const allChars = [];
        for (const anime of Object.values(POLL_DATA.animes)) {
            for (const char of anime.characters) {
                if (specialCat.tag === null || char.tags.includes(specialCat.tag)) {
                    allChars.push({ ...char, anime: anime.name });
                }
            }
        }
        return allChars;
    }
    
    return [];
}

/**
 * Génère un bracket de tournoi
 * @param {Array} characters - Liste des personnages
 * @param {number} bracketSize - Taille du bracket (8, 16, 32, 64)
 * @param {number} perMatch - Nombre de persos par match (2, 3, 4)
 * @returns {Array} bracket - Array de rounds
 */
function generateBracket(characters, bracketSize, perMatch) {
    // Mélanger les personnages
    const shuffled = [...characters];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Prendre le nombre requis
    const selected = shuffled.slice(0, bracketSize);
    
    // Générer le premier round
    const firstRoundMatches = [];
    for (let i = 0; i < selected.length; i += perMatch) {
        const matchChars = selected.slice(i, i + perMatch);
        firstRoundMatches.push({
            id: `r0_m${firstRoundMatches.length}`,
            characters: matchChars,
            votes: {},      // {twitchId: characterId}
            winner: null,
            voteResults: null  // {characterId: {count, percentage}}
        });
    }
    
    // Calculer le nombre total de rounds
    const rounds = [{ matches: firstRoundMatches }];
    let currentCount = firstRoundMatches.length; // Nombre de gagnants = nombre de matchs
    
    while (currentCount > 1) {
        const nextMatchCount = Math.ceil(currentCount / perMatch);
        const nextMatches = [];
        for (let i = 0; i < nextMatchCount; i++) {
            nextMatches.push({
                id: `r${rounds.length}_m${i}`,
                characters: [],  // Rempli quand les gagnants sont connus
                votes: {},
                winner: null,
                voteResults: null
            });
        }
        rounds.push({ matches: nextMatches });
        currentCount = nextMatchCount;
    }
    
    console.log(`🗳️ Bracket généré: ${bracketSize} persos, ${perMatch}/match, ${rounds.length} rounds`);
    rounds.forEach((r, i) => {
        console.log(`   Round ${i + 1}: ${r.matches.length} match(s)`);
    });
    
    return rounds;
}

// ═══════════════════════════════════════════
// 🎮 Fonctions de jeu
// ═══════════════════════════════════════════

/**
 * Démarre une partie Poll
 */
function startPollGame(gameState, io, options = {}) {
    const poll = gameState.poll;
    
    // Clear any leftover timer from previous game
    if (poll.voteTimer) {
        clearTimeout(poll.voteTimer);
        poll.voteTimer = null;
    }
    
    const { category, perMatch, bracketSize, showNames, voteTimer } = options;
    
    // Configuration
    poll.category = category || 'all';
    poll.perMatch = perMatch || 2;
    poll.bracketSize = bracketSize || 16;
    poll.showNames = showNames !== undefined ? showNames : false;
    poll.voteTimerDuration = (voteTimer && voteTimer >= 10 && voteTimer <= 20) ? voteTimer : POLL_CONFIG.VOTE_TIMER;
    
    // Récupérer le nom de la catégorie
    if (POLL_DATA.animes[poll.category]) {
        poll.categoryName = POLL_DATA.animes[poll.category].name;
    } else if (POLL_DATA.specialCategories[poll.category]) {
        poll.categoryName = POLL_DATA.specialCategories[poll.category].name;
    } else {
        poll.categoryName = 'Tous';
    }
    
    // Récupérer les personnages
    const characters = getCharactersForCategory(poll.category);
    
    if (characters.length < poll.bracketSize) {
        return { success: false, error: `Pas assez de personnages (${characters.length}) pour un bracket de ${poll.bracketSize}` };
    }
    
    // Générer le bracket
    poll.bracket = generateBracket(characters, poll.bracketSize, poll.perMatch);
    poll.allCharacters = poll.bracket[0].matches.flatMap(m => m.characters);
    poll.currentRound = 0;
    poll.currentMatchIndex = 0;
    poll.active = true;
    poll.winner = null;
    poll.eliminatedCharacters = [];
    
    gameState.inProgress = true;
    
    console.log(`🗳️ Poll démarré! Catégorie: ${poll.categoryName}, ${poll.bracketSize} persos, ${poll.perMatch}/match`);
    
    // Émettre l'événement de début
    io.emit('poll-game-started', {
        category: poll.category,
        categoryName: poll.categoryName,
        perMatch: poll.perMatch,
        bracketSize: poll.bracketSize,
        totalRounds: poll.bracket.length,
        totalMatches: poll.bracket[0].matches.length,
        allCharacters: poll.allCharacters.map(c => ({ id: c.id, name: c.name, img: c.img })),
        showNames: poll.showNames,
        isParticipating: true
    });
    
    // Auto-start first match after a short delay
    setTimeout(() => {
        startCurrentMatch(gameState, io);
    }, 1000);
    
    return { success: true };
}

/**
 * Lance le vote pour le match actuel
 */
function startCurrentMatch(gameState, io) {
    const poll = gameState.poll;
    if (!poll.active) return;
    
    const round = poll.bracket[poll.currentRound];
    if (!round || poll.currentMatchIndex >= round.matches.length) return;
    
    const match = round.matches[poll.currentMatchIndex];
    poll.currentMatch = match;
    poll.votingOpen = true;
    poll.showingResults = false;
    poll.waitingForTieBreaker = false;
    match.votes = {};
    
    // Timer
    const timerDuration = poll.voteTimerDuration || POLL_CONFIG.VOTE_TIMER;
    const timerMs = timerDuration * 1000;
    poll.voteTimerEndTime = Date.now() + timerMs;
    poll.voteTimer = setTimeout(() => {
        endCurrentVote(gameState, io);
    }, timerMs);
    
    console.log(`🗳️ Match ${poll.currentMatchIndex + 1}/${round.matches.length} (Round ${poll.currentRound + 1}): ${match.characters.map(c => c.name).join(' vs ')}`);
    
    io.emit('poll-match-start', {
        round: poll.currentRound,
        matchIndex: poll.currentMatchIndex,
        totalMatches: round.matches.length,
        totalRounds: poll.bracket.length,
        characters: match.characters.map(c => ({ id: c.id, name: c.name, img: c.img })),
        timer: timerDuration,
        endTime: poll.voteTimerEndTime
    });
}

/**
 * Enregistre un vote
 */
function registerVote(gameState, io, twitchId, characterId, voterData) {
    const poll = gameState.poll;
    if (!poll.active || !poll.votingOpen || !poll.currentMatch) return { success: false };
    
    // Vérifier que le personnage est dans le match
    if (!poll.currentMatch.characters.some(c => c.id === characterId)) {
        return { success: false, error: 'Personnage invalide' };
    }
    
    // Bloquer si déjà voté (pas de changement de vote)
    if (poll.currentMatch.votes[twitchId]) {
        return { success: false, error: 'Déjà voté' };
    }
    
    // Enregistrer le vote
    poll.currentMatch.votes[twitchId] = characterId;
    
    // Store voter info if provided
    if (!poll.currentMatch.voterInfo) poll.currentMatch.voterInfo = {};
    if (voterData) {
        poll.currentMatch.voterInfo[twitchId] = { username: voterData.username, avatar: voterData.avatar };
    }
    
    // Compter les votes en temps réel
    const voteCounts = {};
    const votersByChar = {};
    poll.currentMatch.characters.forEach(c => { voteCounts[c.id] = 0; votersByChar[c.id] = []; });
    Object.entries(poll.currentMatch.votes).forEach(([tid, cId]) => {
        if (voteCounts[cId] !== undefined) {
            voteCounts[cId]++;
            const info = poll.currentMatch.voterInfo?.[tid];
            if (info) votersByChar[cId].push({ username: info.username, avatar: info.avatar });
        }
    });
    
    const totalVotes = Object.values(voteCounts).reduce((s, v) => s + v, 0);
    
    // Émettre la mise à jour des votes en temps réel
    io.emit('poll-vote-update', {
        totalVotes,
        voteCounts,
        votersByChar
    });
    
    return { success: true };
}

/**
 * Termine le vote du match en cours et détermine le gagnant
 */
function endCurrentVote(gameState, io) {
    const poll = gameState.poll;
    if (!poll.active || !poll.currentMatch) return;
    
    // Arrêter le timer
    if (poll.voteTimer) {
        clearTimeout(poll.voteTimer);
        poll.voteTimer = null;
    }
    
    poll.votingOpen = false;
    poll.showingResults = true;
    
    const match = poll.currentMatch;
    
    // Compter les votes
    const voteCounts = {};
    match.characters.forEach(c => { voteCounts[c.id] = 0; });
    Object.values(match.votes).forEach(cId => {
        if (voteCounts[cId] !== undefined) voteCounts[cId]++;
    });
    
    const totalVotes = Object.values(voteCounts).reduce((s, v) => s + v, 0);
    
    // Calculer les pourcentages
    const voteResults = {};
    match.characters.forEach(c => {
        voteResults[c.id] = {
            count: voteCounts[c.id],
            percentage: totalVotes > 0 ? Math.round((voteCounts[c.id] / totalVotes) * 100) : 0
        };
    });
    
    match.voteResults = voteResults;
    
    // Build votersByChar for display
    const votersByChar = {};
    match.characters.forEach(c => { votersByChar[c.id] = []; });
    Object.entries(match.votes).forEach(([tid, cId]) => {
        if (votersByChar[cId]) {
            const info = match.voterInfo?.[tid];
            votersByChar[cId].push({ username: info?.username || 'Joueur', avatar: info?.avatar || null });
        }
    });
    
    // Déterminer le gagnant (plus de votes)
    let maxVotes = -1;
    let winners = [];
    match.characters.forEach(c => {
        const count = voteCounts[c.id];
        if (count > maxVotes) {
            maxVotes = count;
            winners = [c];
        } else if (count === maxVotes) {
            winners.push(c);
        }
    });
    
    const isTie = winners.length > 1;
    
    if (isTie) {
        // Égalité — ne pas choisir, attendre la décision de l'admin
        match.winner = null;
        match.isTie = true;
        match.tiedCharacters = winners.map(c => ({ id: c.id, name: c.name, img: c.img }));
        poll.waitingForTieBreaker = true;
        
        console.log(`🗳️ Égalité: ${winners.map(c => `${c.name}(${voteCounts[c.id]})`).join(' vs ')}`);
        
        const currentRoundTie = poll.bracket[poll.currentRound];
        const isLastMatchTie = (poll.currentRound === poll.bracket.length - 1) && 
                              (poll.currentMatchIndex === currentRoundTie.matches.length - 1);
        
        io.emit('poll-match-result', {
            round: poll.currentRound,
            matchIndex: poll.currentMatchIndex,
            characters: match.characters.map(c => ({ id: c.id, name: c.name, img: c.img })),
            voteResults,
            totalVotes,
            votersByChar,
            winner: null,
            isTie: true,
            tiedCharacters: match.tiedCharacters,
            isLastMatch: isLastMatchTie
        });
    } else {
        // Gagnant clair (or random if 0 votes)
        const winner = winners.length > 1 ? winners[Math.floor(Math.random() * winners.length)] : winners[0];
        match.winner = winner;
        match.isTie = false;
        poll.waitingForTieBreaker = false;
        
        // Ajouter les perdants aux éliminés
        match.characters.forEach(c => {
            if (c.id !== winner.id) {
                poll.eliminatedCharacters.push(c);
            }
        });
        
        console.log(`🗳️ Résultat: ${match.characters.map(c => `${c.name}(${voteCounts[c.id]})`).join(' vs ')} → Gagnant: ${winner.name}`);
        
        const currentRound = poll.bracket[poll.currentRound];
        const isLastMatch = (poll.currentRound === poll.bracket.length - 1) && 
                           (poll.currentMatchIndex === currentRound.matches.length - 1);
        
        io.emit('poll-match-result', {
            round: poll.currentRound,
            matchIndex: poll.currentMatchIndex,
            characters: match.characters.map(c => ({ id: c.id, name: c.name, img: c.img })),
            voteResults,
            totalVotes,
            votersByChar,
            winner: { id: winner.id, name: winner.name, img: winner.img },
            isTie: false,
            isLastMatch
        });
    }
}

/**
 * Résout une égalité (appelé par l'admin)
 */
function resolveTie(gameState, io, winnerId) {
    const poll = gameState.poll;
    if (!poll.active || !poll.currentMatch || !poll.waitingForTieBreaker) return { success: false };
    
    const match = poll.currentMatch;
    const winner = match.characters.find(c => c.id === winnerId);
    if (!winner) return { success: false, error: 'Personnage invalide' };
    
    match.winner = winner;
    match.isTie = false;
    poll.waitingForTieBreaker = false;
    
    // Ajouter les perdants aux éliminés
    match.characters.forEach(c => {
        if (c.id !== winner.id) {
            poll.eliminatedCharacters.push(c);
        }
    });
    
    console.log(`🗳️ Égalité résolue: Gagnant: ${winner.name}`);
    
    io.emit('poll-tie-resolved', {
        winner: { id: winner.id, name: winner.name, img: winner.img }
    });
    
    return { success: true };
}

/**
 * Passe au match suivant (appelé par l'admin)
 */
function nextMatch(gameState, io) {
    const poll = gameState.poll;
    if (!poll.active) return;
    
    poll.currentMatchIndex++;
    
    const currentRound = poll.bracket[poll.currentRound];
    
    // S'il reste des matchs dans ce round
    if (poll.currentMatchIndex < currentRound.matches.length) {
        startCurrentMatch(gameState, io);
        return;
    }
    
    // Round terminé — passer au round suivant
    poll.currentRound++;
    poll.currentMatchIndex = 0;
    
    // Vérifier si le tournoi est terminé
    if (poll.currentRound >= poll.bracket.length) {
        // Tournoi terminé !
        const lastRound = poll.bracket[poll.bracket.length - 1];
        poll.winner = lastRound.matches[0].winner;
        endPollGame(gameState, io);
        return;
    }
    
    // Remplir le prochain round avec les gagnants
    const previousRound = poll.bracket[poll.currentRound - 1];
    const nextRound = poll.bracket[poll.currentRound];
    
    const winners = previousRound.matches.map(m => m.winner).filter(w => w);
    
    // Distribuer les gagnants dans les matchs du prochain round
    let winnerIndex = 0;
    for (const match of nextRound.matches) {
        match.characters = [];
        for (let i = 0; i < poll.perMatch && winnerIndex < winners.length; i++) {
            match.characters.push(winners[winnerIndex]);
            winnerIndex++;
        }
    }
    
    console.log(`🗳️ Round ${poll.currentRound + 1} prêt: ${nextRound.matches.length} match(s)`);
    
    // Émettre le nouveau round
    io.emit('poll-round-start', {
        round: poll.currentRound,
        totalRounds: poll.bracket.length,
        matchCount: nextRound.matches.length,
        characters: nextRound.matches.flatMap(m => m.characters.map(c => ({ id: c.id, name: c.name, img: c.img })))
    });
    
    // Démarrer le premier match du nouveau round
    startCurrentMatch(gameState, io);
}

/**
 * Termine la partie Poll
 */
function endPollGame(gameState, io) {
    const poll = gameState.poll;
    
    console.log(`🏆 Poll terminé! Gagnant: ${poll.winner?.name || 'Aucun'}`);
    
    io.emit('poll-game-ended', {
        winner: poll.winner ? { id: poll.winner.id, name: poll.winner.name, img: poll.winner.img } : null,
        totalRounds: poll.bracket.length,
        bracketSize: poll.bracketSize,
        category: poll.categoryName,
        bracket: poll.bracket.map(round => ({
            matches: round.matches.map(m => ({
                characters: m.characters.map(c => ({ id: c.id, name: c.name, img: c.img })),
                voteResults: m.voteResults,
                winner: m.winner ? { id: m.winner.id, name: m.winner.name } : null
            }))
        }))
    });
    
    poll.votingOpen = false;
    poll.showingResults = false;
}

/**
 * Récupère l'état du poll pour un client (reconnexion)
 */
function getPollStateForClient(gameState, twitchId) {
    const poll = gameState.poll;
    if (!poll || !poll.active) return null;
    
    const currentRound = poll.bracket[poll.currentRound];
    
    return {
        active: true,
        category: poll.category,
        categoryName: poll.categoryName,
        perMatch: poll.perMatch,
        bracketSize: poll.bracketSize,
        currentRound: poll.currentRound,
        totalRounds: poll.bracket.length,
        currentMatchIndex: poll.currentMatchIndex,
        totalMatches: currentRound ? currentRound.matches.length : 0,
        votingOpen: poll.votingOpen,
        showingResults: poll.showingResults,
        currentMatch: poll.currentMatch ? {
            characters: poll.currentMatch.characters.map(c => ({ id: c.id, name: c.name, img: c.img })),
            hasVoted: twitchId ? !!poll.currentMatch.votes[twitchId] : false,
            myVote: twitchId ? poll.currentMatch.votes[twitchId] : null,
            voteResults: poll.showingResults ? poll.currentMatch.voteResults : null,
            winner: poll.showingResults && poll.currentMatch.winner ? { id: poll.currentMatch.winner.id, name: poll.currentMatch.winner.name, img: poll.currentMatch.winner.img } : null,
            wasRandom: poll.showingResults ? (poll.currentMatch.wasRandom || false) : false,
            isTie: poll.currentMatch.isTie || false,
            tiedCharacters: poll.currentMatch.tiedCharacters || null
        } : null,
        waitingForTieBreaker: poll.waitingForTieBreaker || false,
        timeRemaining: poll.voteTimerEndTime
            ? Math.max(0, Math.ceil((poll.voteTimerEndTime - Date.now()) / 1000))
            : (poll.voteTimerDuration || POLL_CONFIG.VOTE_TIMER),
        endTime: poll.voteTimerEndTime || null,
        timer: poll.voteTimerDuration || POLL_CONFIG.VOTE_TIMER,
        winner: poll.winner ? { id: poll.winner.id, name: poll.winner.name, img: poll.winner.img } : null,
        allCharacters: poll.allCharacters.map(c => ({ id: c.id, name: c.name, img: c.img })),
        showNames: poll.showNames,
    };
}

/**
 * Reset l'état Poll
 */
function resetPollState(gameState) {
    const poll = gameState.poll;
    if (poll.voteTimer) {
        clearTimeout(poll.voteTimer);
        poll.voteTimer = null;
    }
    Object.assign(poll, createPollState());
}

/**
 * Récupère les catégories disponibles pour l'admin
 */
function getPollCategories() {
    const categories = [];
    
    // Catégories par anime
    for (const [id, anime] of Object.entries(POLL_DATA.animes)) {
        categories.push({
            id,
            name: anime.name,
            type: 'anime',
            count: anime.characters.length
        });
    }
    
    // Catégories spéciales
    for (const [id, cat] of Object.entries(POLL_DATA.specialCategories)) {
        const count = getCharactersForCategory(id).length;
        categories.push({
            id,
            name: cat.name,
            icon: cat.icon,
            type: 'special',
            count
        });
    }
    
    return categories;
}

/**
 * Retourne les tailles de bracket valides pour une catégorie
 */
function getValidBracketSizes(categoryId, perMatch) {
    const chars = getCharactersForCategory(categoryId);
    const count = chars.length;
    
    let allSizes;
    if (perMatch === 3) {
        allSizes = [27, 81];
    } else if (perMatch === 4) {
        allSizes = [16, 64];
    } else {
        allSizes = [16, 32, 64, 128];
    }
    return allSizes.filter(s => s <= count);
}

// ═══════════════════════════════════════════
// 📤 Exports
// ═══════════════════════════════════════════

module.exports = {
    POLL_DATA,
    POLL_CONFIG,
    createPollState,
    startPollGame,
    startCurrentMatch,
    registerVote,
    endCurrentVote,
    resolveTie,
    nextMatch,
    endPollGame,
    getPollStateForClient,
    resetPollState,
    getPollCategories,
    getValidBracketSizes,
    getCharactersForCategory
};