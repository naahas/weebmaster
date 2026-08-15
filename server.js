// ============================================
// WEEBMASTER - Server Principal - TIEBREAKER FIX
// ============================================

require('dotenv').config();
const express = require('express');
const { Server } = require('socket.io');
const { db, supabase, SERIES_FILTERS, getFilterSeries } = require('./dbs');

const app = express();
const PORT = process.env.PORT || 7000;

let lastRefreshPlayersTime = 0;
const REFRESH_COOLDOWN_MS = 20000;

let connectionsByIP = new Map();
const MAX_CONNECTIONS_PER_IP = 5;

let activityLogs = [];
let lastGlobalWinner = null;


let winnerScreenData = null;

const MAX_LOGS = 30;
let playerColors = {}; // Associer chaque joueur à une couleur

let lastStatsUpdate = 0;
const STATS_THROTTLE_MS = 500; // Max 2 updates par seconde
let pendingStatsUpdate = false;


const PLAYER_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
    '#F8B739', '#52B788', '#E76F51', '#8E44AD'
];

// ============================================
// BOMBANIME - Données et Configuration
// ============================================
const fs = require('fs');
const path = require('path');
const { getAllNamesToBlock, CHARACTER_VARIANTS: BOMB_VARIANTS, THEME_MAPPING: BOMB_THEME_MAPPING } = require('./character-variants');

// Charger les personnages depuis le JSON
let BOMBANIME_CHARACTERS = {};
try {
    const bombDataPath = path.join(__dirname, 'bombdata.json');
    const bombData = JSON.parse(fs.readFileSync(bombDataPath, 'utf8'));
    BOMBANIME_CHARACTERS = bombData.Character || {};
    console.log('✅ BombAnime: Données chargées -', Object.keys(BOMBANIME_CHARACTERS).length, 'séries');
    
    // Log du nombre de personnages par série
    for (const [serie, chars] of Object.entries(BOMBANIME_CHARACTERS)) {
        console.log(`   📌 ${serie}: ${chars.length} personnages`);
    }
} catch (error) {
    console.error('❌ Erreur chargement bombdata.json:', error.message);
}

// 🖼️ Charger les images des personnages BombAnime
let BOMBANIME_IMAGES = {};
try {
    const bombImagesPath = path.join(__dirname, 'bombimages.json');
    if (fs.existsSync(bombImagesPath)) {
        BOMBANIME_IMAGES = JSON.parse(fs.readFileSync(bombImagesPath, 'utf8'));
        const totalImages = Object.values(BOMBANIME_IMAGES).reduce((sum, serie) => sum + Object.keys(serie).length, 0);
        console.log('✅ BombImages: Données chargées -', totalImages, 'images');
    } else {
        console.log('⚠️ bombimages.json non trouvé - Images désactivées');
    }
} catch (error) {
    console.error('❌ Erreur chargement bombimages.json:', error.message);
}

// 🖼️ Trouver l'image d'un personnage par son nom (gère les variantes)
function getCharacterImage(name, serie) {
    const serieImages = BOMBANIME_IMAGES[serie];
    if (!serieImages) return null;
    
    const upperName = name.toUpperCase();
    
    // 1. Match exact dans bombimages
    if (serieImages[upperName]) return serieImages[upperName];
    
    // 2. Chercher parmi les clés (case-insensitive)
    for (const [mainName, imgUrl] of Object.entries(serieImages)) {
        if (upperName === mainName.toUpperCase()) return imgUrl;
    }
    
    // 3. Chercher via les variantes de bombdata
    // Si le nom soumis est une variante, trouver le nom principal qui a une image
    const characters = BOMBANIME_CHARACTERS[serie] || [];
    const allVariants = getAllNamesToBlock(upperName, characters, serie);
    for (const variant of allVariants) {
        const variantUpper = variant.toUpperCase();
        for (const [mainName, imgUrl] of Object.entries(serieImages)) {
            if (variantUpper === mainName.toUpperCase()) return imgUrl;
        }
    }
    
    return null;
}

// Configuration BombAnime
const BOMBANIME_CONFIG = {
    MIN_PLAYERS: 2,
    MAX_PLAYERS: 13,
    DEFAULT_LIVES: 2,
    DEFAULT_TIMER: 8,
    ALPHABET_BONUS_LIVES: 1
};


// 💣 Set pour réserver les places pendant le traitement async (évite les race conditions)
const pendingJoins = new Set();


// SERIES_FILTERS importé depuis dbs.js


// ============================================
// Middleware
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('trust proxy', 1);


// ============================================
// 📊 STATS PUBLIQUES (page d'accueil)
// ============================================

// Historique des parties : en mémoire d'abord (aucune dépendance), persisté dans
// la table `game_history` si elle existe. Voir PLAN-V2.md pour le SQL de création.
const recentGames = [];
let gamesPlayedTotal = 0;   // parties terminées (depuis la base si game_history existe)
const RECENT_GAMES_MAX = 8;
let gameHistoryTableOk = null; // null = pas encore testé, false = table absente

let questionsCountCache = { value: null, at: 0 };
const QUESTIONS_COUNT_TTL = 5 * 60 * 1000;

const MODE_LABELS = { classic: 'Classique', rivalry: 'Rivalité', bombanime: 'BombAnime' };

async function recordFinishedGame({ mode, playersCount, winnerName, duration }) {
    const entry = {
        mode,
        modeLabel: MODE_LABELS[mode] || mode,
        playersCount: playersCount || 0,
        winnerName: winnerName || null,
        duration: duration || 0,
        endedAt: new Date().toISOString(),
    };

    gamesPlayedTotal++;
    recentGames.unshift(entry);
    if (recentGames.length > RECENT_GAMES_MAX) recentGames.length = RECENT_GAMES_MAX;

    if (gameHistoryTableOk === false) return;

    try {
        const { error } = await supabase.from('game_history').insert({
            mode: entry.mode,
            players_count: entry.playersCount,
            winner_name: entry.winnerName,
            duration: entry.duration,
        });
        if (error) throw error;
        gameHistoryTableOk = true;
    } catch (e) {
        if (gameHistoryTableOk === null) {
            console.log('ℹ️ Table game_history absente — historique gardé en mémoire uniquement');
        }
        gameHistoryTableOk = false;
    }
}

async function loadRecentGamesFromDb() {
    try {
        const { data, error } = await supabase
            .from('game_history')
            .select('mode, players_count, winner_name, duration, created_at')
            .order('created_at', { ascending: false })
            .limit(RECENT_GAMES_MAX);
        if (error) throw error;

        gameHistoryTableOk = true;
        recentGames.length = 0;
        (data || []).forEach(g => recentGames.push({
            mode: g.mode,
            modeLabel: MODE_LABELS[g.mode] || g.mode,
            playersCount: g.players_count || 0,
            winnerName: g.winner_name || null,
            duration: g.duration || 0,
            endedAt: g.created_at,
        }));
        const { count } = await supabase.from('game_history').select('id', { count: 'exact', head: true });
        gamesPlayedTotal = count || recentGames.length;
        console.log(`📊 ${recentGames.length} partie(s) récente(s) chargée(s), ${gamesPlayedTotal} au total`);
    } catch (e) {
        gameHistoryTableOk = false;
    }
}

async function getQuestionsCount() {
    const now = Date.now();
    if (questionsCountCache.value !== null && now - questionsCountCache.at < QUESTIONS_COUNT_TTL) {
        return questionsCountCache.value;
    }
    try {
        const { count, error } = await supabase
            .from('questions')
            .select('id', { count: 'exact', head: true });
        if (error) throw error;
        questionsCountCache = { value: count || 0, at: now };
    } catch (e) {
        console.error('⚠️ Comptage des questions impossible:', e.message);
        questionsCountCache = { value: questionsCountCache.value || 0, at: now };
    }
    return questionsCountCache.value;
}

// 🔑 Code de salon — alphabet sans caractères ambigus (ni 0/O, ni 1/I/L)
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateRoomCode(length = 4) {
    let code = '';
    for (let i = 0; i < length; i++) {
        code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
    }
    return code;
}

// Émet game-ended et enregistre la partie dans l'historique.
// Toutes les fins de partie passent par ici — ne pas appeler io.emit('game-ended') directement.
function emitGameEnded(payload) {
    io.emit('game-ended', payload);
    recordFinishedGame({
        mode: gameState.lobbyMode,
        playersCount: gameState.initialPlayerCount || (payload.playersData || []).length,
        winnerName: payload.winner?.username || payload.winner?.name || null,
        duration: payload.duration,
    });
}

function emitBombanimeGameEnded(payload) {
    io.emit('bombanime-game-ended', payload);
    recordFinishedGame({
        mode: 'bombanime',
        playersCount: gameState.initialPlayerCount || (payload.ranking || []).length,
        winnerName: payload.winner?.username || null,
        duration: payload.duration,
    });
}

// Stats affichées sur la page d'accueil — toutes réelles.
app.get('/api/home-stats', async (req, res) => {
    res.json({
        playersOnline: io ? io.engine.clientsCount : 0,
        activeRooms: gameState.isActive ? 1 : 0,   // phase 2 : rooms.size
        inGame: gameState.inProgress ? gameState.players.size : 0,
        questionsCount: await getQuestionsCount(),
        gamesPlayed: gamesPlayedTotal,
        recentGames,
    });
});


// Route pour obtenir l'état actuel du jeu (pour reconnexion)
app.get('/game/state', (req, res) => {
    let timeRemaining = null;
    if (gameState.questionStartTime && gameState.inProgress) {
        const elapsed = Math.floor((Date.now() - gameState.questionStartTime) / 1000);
        timeRemaining = Math.max(0, gameState.questionTime - elapsed);
    }
    
    // 🆕 Mettre à jour les compteurs d'équipe
    if (gameState.lobbyMode === 'rivalry') {
        updateTeamCounts();
        updateTeamScores(); // 🆕 Calculer les scores d'équipe
    }
    
    // 💣🎴 Vérifier si le lobby BombAnime/Collect est plein
    const isBombanimeMode = gameState.lobbyMode === 'bombanime';
    const maxPlayers = isBombanimeMode ? BOMBANIME_CONFIG.MAX_PLAYERS : Infinity;
    const isLobbyFull = isBombanimeMode && gameState.players.size >= maxPlayers;

    // 🔥 Construire les données des joueurs avec leurs réponses
    const playersData = Array.from(gameState.players.values()).map(player => {
        // Chercher les bonus par twitchId
        let comboData = null;
        for (const [sid, bonusData] of gameState.playerBonuses.entries()) {
            const bonusPlayer = gameState.players.get(sid);
            if (bonusPlayer && bonusPlayer.twitchId === player.twitchId) {
                comboData = {
                    comboLevel: bonusData.comboLevel,
                    comboProgress: bonusData.comboProgress,
                    bonusInventory: bonusData.bonusInventory
                };
                break;
            }
        }

        // 🔥 NOUVEAU: Récupérer la réponse du joueur
        const playerAnswer = gameState.answers.get(player.socketId);

        return {
            socketId: player.socketId,
            twitchId: player.twitchId,
            username: player.username,
            title: player.title || 'Novice courageux',
            lives: gameState.mode === 'lives' ? player.lives : null,
            points: gameState.mode === 'points' ? (player.points || 0) : null,
            isLastGlobalWinner: player.twitchId === lastGlobalWinner,
            correctAnswers: player.correctAnswers,
            hasAnswered: !!playerAnswer,
            selectedAnswerIndex: playerAnswer?.answer || null,
            responseTime: playerAnswer?.time || null,
            comboData: comboData,
            team: player.team || null  // 🆕 Équipe du joueur
        };
    });

    // 🔥 Compter les réponses par option
    const answerCounts = {};
    gameState.liveAnswers.forEach((answerIndex) => {
        if (!answerCounts[answerIndex]) {
            answerCounts[answerIndex] = 0;
        }
        answerCounts[answerIndex]++;
    });

    res.json({
        isActive: gameState.isActive,
        inProgress: gameState.inProgress,
        currentQuestionIndex: gameState.currentQuestionIndex,
        playerCount: gameState.players.size,
        currentQuestion: gameState.currentQuestion,
        timeRemaining: timeRemaining,
        players: playersData,
        showResults: gameState.showResults,
        lastQuestionResults: gameState.lastQuestionResults,
        mode: gameState.mode,
        lives: gameState.lives,
        questionTime: gameState.questionTime,
        answersCount: gameState.answersCount,
        questionsCount: gameState.questionsCount,
        difficultyMode: gameState.difficultyMode,
        serieFilter: gameState.serieFilter,
        noSpoil: gameState.noSpoil, // 🚫 Filtre anti-spoil
        bonusEnabled: gameState.bonusEnabled, // 🎮 Bonus activés
        isTiebreaker: gameState.isTiebreaker,
        liveAnswerCounts: answerCounts,
        showingWinner: !!winnerScreenData,
        winnerScreenData: winnerScreenData,
        livesIcon: gameState.livesIcon,
        answeredCount: gameState.liveAnswers.size,
        autoMode: gameState.autoMode,
        // 🆕 Mode Rivalité
        lobbyMode: gameState.lobbyMode,
        teamNames: gameState.teamNames,
        teamCounts: gameState.teamCounts,
        teamScores: gameState.lobbyMode === 'rivalry' ? gameState.teamScores : null, // 🆕 Scores d'équipe
        // 💣 BombAnime - Lobby plein
        maxPlayers: maxPlayers,
        isLobbyFull: isLobbyFull,
        tiebreakerPlayers: gameState.isTiebreaker
            ? Array.from(gameState.players.values())
                .filter(p => gameState.tiebreakerPlayers.includes(p.twitchId))
                .map(p => ({ twitchId: p.twitchId, username: p.username }))
            : [],
        // 💣 Mode BombAnime
        bombanime: gameState.lobbyMode === 'bombanime' ? {
            active: gameState.bombanime.active,
            serie: gameState.bombanime.serie,
            timer: gameState.bombanime.timer,
            currentPlayerTwitchId: gameState.bombanime.currentPlayerTwitchId,
            playersOrder: gameState.bombanime.playersOrder,
            playersData: gameState.bombanime.active ? getBombanimePlayersData() : [],
            usedNamesCount: gameState.bombanime.usedNames.size,
            direction: gameState.bombanime.bombDirection,
            timeRemaining: gameState.bombanime.turnStartTime ? 
                Math.max(0, gameState.bombanime.timer - Math.floor((Date.now() - gameState.bombanime.turnStartTime) / 1000)) : 
                gameState.bombanime.timer
        } : null
    });
});

// ============================================
// Fichiers statiques (APRÈS les routes API)
// ============================================
app.use(express.static('src/html'));
app.use(express.static('src/style'));
app.use(express.static('src/sound'));
app.use(express.static('src/img'));
app.use(express.static('src/img/questionpic'));
app.use(express.static('src/img/avatarpic'));
app.use(express.static('src/img/avatar'));
app.use(express.static('src/script'));




// ============================================
// État du jeu
// ============================================
const gameState = {
    isActive: false,
    inProgress: false,
    currentGameId: null,
    currentQuestionIndex: 0,
    currentQuestion: null,
    players: new Map(),
    questionStartTime: null,
    answers: new Map(),
    gameStartTime: null,
    showResults: false,
    livesIcon: 'heart',
    lastQuestionResults: null,

    recentSeries: [],

    mode: 'lives',
    lives: 3,
    questionTime: 10,
    answersCount: 4,
    questionsCount: 20,
    usedQuestionIds: [],
    speedBonus: true, // 🆕 Bonus rapidité (500 pts au plus rapide en mode points)
    bonusEnabled: true, // 🎮 Bonus activés (jauge combo, bonus, défis)

    liveAnswers: new Map(),

    // Tiebreaker
    isTiebreaker: false,
    tiebreakerPlayers: [],
    isRivalryTiebreaker: false, // 🆕 Tiebreaker en mode Rivalité
    rivalryTiebreakerTimeout: null, // 🆕 Timeout pour le tiebreaker rivalry
    rivalryRevealTimeout: null, // 🆕 Timeout pour révéler les réponses du tiebreaker
    rivalryEndGameTimeout: null, // 🔥 Timeout pour endGameRivalryPoints (5s delay)

    difficultyMode: 'croissante',
    lastDifficulty: null,

    autoMode: false,
    autoModeTimeout: null,
    
    initialPlayerCount: 0, // Nombre de joueurs au début de la partie

    serieFilter: 'tout',
    noSpoil: false, // 🚫 Filtre anti-spoil (exclure les questions spoil)

    playerBonuses: new Map(),
    
    // 🆕 Mode Rivalité
    lobbyMode: 'classic', // 'classic' | 'rivalry' | 'bombanime'
    roomCode: null,       // 🔑 code du salon ouvert (phase 2 : cle de la Map des rooms)
    teamNames: { 1: 'Team A', 2: 'Team B' },
    teamCounts: { 1: 0, 2: 0 },
    teamScores: { 1: 0, 2: 0 }, // Vies restantes ou points totaux par équipe
    
    // 🆕 Système de défis
    activeChallenges: [],           // Les 3 défis de la partie actuelle
    playerChallenges: new Map(),     // Progression des défis par joueur
    
    // ============================================
    // 💣 BOMBANIME - État du mode
    // ============================================
    bombanime: {
        active: false,              // Mode BombAnime actif
        serie: 'Naruto',            // Série sélectionnée
        timer: 8,                   // Timer par défaut (secondes)
        playersOrder: [],           // Ordre des joueurs (twitchIds) dans le cercle
        currentPlayerIndex: 0,      // Index du joueur actuel dans playersOrder
        currentPlayerTwitchId: null,// TwitchId du joueur qui doit jouer
        usedNames: new Set(),       // Noms déjà utilisés dans la partie
        playerAlphabets: new Map(), // Map<twitchId, Set<lettre>> - Lettres collectées par joueur
        playerLastAnswers: new Map(), // Map<twitchId, string> - Dernière réponse de chaque joueur
        turnTimeout: null,          // Timeout du tour actuel
        turnId: 0,                  // Identifiant unique du tour (pour éviter race conditions)
        turnStartTime: null,        // Timestamp du début du tour
        lastValidName: null,        // Dernier nom validé
        bombDirection: 1,           // 1 = sens horaire, -1 = anti-horaire
        isPaused: false,            // Pause entre les tours
        eliminatedPlayers: [],      // Joueurs éliminés (pour affichage)
        // 🎯 DÉFIS BOMBANIME
        challenges: [],             // Les 2 défis [{id, letter, target, reward, name, description}]
        playerChallenges: new Map(), // Map<twitchId, {challenges: {id: {progress, target, completed}}, lettersGiven: Map}>
        playerBonuses: new Map()    // Map<twitchId, {freeCharacter: 0, extraLife: 0}>
    },
};

// ============================================
// 🆕 HELPER - BROADCAST LOBBY UPDATE
// ============================================

function updateTeamCounts() {
    gameState.teamCounts = { 1: 0, 2: 0 };
    for (const player of gameState.players.values()) {
        if (player.team === 1) gameState.teamCounts[1]++;
        else if (player.team === 2) gameState.teamCounts[2]++;
    }
}

// 🆕 Calculer les scores d'équipe (vies restantes ou points totaux)
function updateTeamScores() {
    gameState.teamScores = { 1: 0, 2: 0 };
    
    for (const player of gameState.players.values()) {
        if (!player.team) continue;
        
        if (gameState.mode === 'lives') {
            // 🆕 Compter les joueurs encore en vie (lives > 0)
            if (player.lives > 0) {
                gameState.teamScores[player.team] += 1;
            }
        } else {
            // Additionner les points
            gameState.teamScores[player.team] += player.points || 0;
        }
    }
}

// 🆕 Vérifier si une équipe a gagné (mode rivalité)
function checkRivalryWinner() {
    if (gameState.lobbyMode !== 'rivalry') return null;
    
    updateTeamScores();
    
    if (gameState.mode === 'lives') {
        // En mode vie : une équipe gagne si l'autre a 0 vies
        const team1Alive = gameState.teamScores[1] > 0;
        const team2Alive = gameState.teamScores[2] > 0;
        
        if (!team1Alive && team2Alive) return 2;
        if (!team2Alive && team1Alive) return 1;
        if (!team1Alive && !team2Alive) return 'draw'; // Égalité (rare)
    }
    // En mode points : pas de victoire anticipée, on continue jusqu'à la fin
    
    return null;
}

function broadcastLobbyUpdate() {
    // Mettre à jour les compteurs d'équipe
    if (gameState.lobbyMode === 'rivalry') {
        updateTeamCounts();
    }
    
    // 💣🎴 Vérifier si le lobby BombAnime/Collect est plein
    const isBombanimeMode = gameState.lobbyMode === 'bombanime';
    const maxPlayers = isBombanimeMode ? BOMBANIME_CONFIG.MAX_PLAYERS : Infinity;
    const isLobbyFull = isBombanimeMode && gameState.players.size >= maxPlayers;
    
    io.emit('lobby-update', {
        playerCount: gameState.players.size,
        lives: gameState.lives,
        livesIcon: gameState.livesIcon,
        questionTime: gameState.questionTime,
        // Mode Rivalité
        lobbyMode: gameState.lobbyMode,
        teamNames: gameState.teamNames,
        teamCounts: gameState.teamCounts,
        // BombAnime/Collect - Lobby plein
        maxPlayers: maxPlayers,
        isLobbyFull: isLobbyFull,
        // Liste des joueurs
        players: Array.from(gameState.players.values()).map(p => ({
            twitchId: p.twitchId,
            username: p.username,
            lives: p.lives,
            title: p.title || 'Novice courageux',
            avatarUrl: p.avatarUrl,
            team: p.team || null,
            isLastGlobalWinner: p.twitchId === lastGlobalWinner,
        }))
    });
}

// ============================================
// 🆕 SYSTÈME DE DÉFIS
// ============================================

const CHALLENGE_POOLS = {
    // Pool 50/50 - Facile
    '5050': [
        { id: 'speed3s', name: 'Éclair', description: 'Bonne réponse en moins de 3s', target: 1, type: 'speed' },
        { id: 'streak3', name: 'Précis', description: '3 bonnes réponses d\'affilée', target: 3, type: 'streak' },
        { id: 'total5', name: 'Quintuplé', description: '5 bonnes réponses', target: 5, type: 'total' }
    ],
    // Pool Joker - Moyen
    'reveal': [
        { id: 'first', name: 'Rapide', description: 'Etre le plus rapide à bien répondre', target: 1, type: 'first' },
        { id: 'streak5', name: 'Déchaîné', description: '5 bonnes réponses d\'affilée', target: 5, type: 'streak' },
        { id: 'hard', name: 'Téméraire', description: 'Bien répondre à une question Hard', target: 1, type: 'difficulty' }
    ],
    // Pool Bouclier/x2 - Difficile
    'shield': [
        { id: 'veryhard', name: 'Expert', description: 'Bien répondre à question VeryHard+', target: 1, type: 'difficulty' },
        { id: 'series7', name: 'Polyvalent', description: 'Bien répondre sur 7 séries différentes', target: 7, type: 'series' },
        { id: 'streak12', name: 'Légendaire', description: '12 bonnes réponses d\'affilée', target: 12, type: 'streak' }
    ]
};

// Générer les 3 défis pour une partie
function generateChallenges() {
    const challenges = [];
    
    // 1. Tirer un défi 50/50
    const pool5050 = CHALLENGE_POOLS['5050'];
    const challenge5050 = { ...pool5050[Math.floor(Math.random() * pool5050.length)], reward: '5050' };
    challenges.push(challenge5050);
    
    // 2. Tirer un défi Joker
    const poolReveal = CHALLENGE_POOLS['reveal'];
    const challengeReveal = { ...poolReveal[Math.floor(Math.random() * poolReveal.length)], reward: 'reveal' };
    challenges.push(challengeReveal);
    
    // 3. Tirer un défi Bouclier/x2 (avec restriction si filtre actif)
    let poolShield = [...CHALLENGE_POOLS['shield']];
    
    // Option A : Exclure series7 si filtre ≠ overall/mainstream
    if (gameState.serieFilter !== 'tout' && gameState.serieFilter !== 'mainstream') {
        poolShield = poolShield.filter(c => c.id !== 'series7');
    }
    
    const challengeShield = { ...poolShield[Math.floor(Math.random() * poolShield.length)], reward: gameState.mode === 'lives' ? 'shield' : 'doublex2' };
    challenges.push(challengeShield);
    
    console.log(`🎯 Défis générés: ${challenges.map(c => c.id).join(', ')}`);
    return challenges;
}

// Initialiser la progression des défis pour un joueur
function initPlayerChallenges(socketId) {
    const progress = {
        challenges: {},
        currentStreak: 0,
        seriesAnswered: new Set()
    };
    
    // Initialiser chaque défi actif
    gameState.activeChallenges.forEach(challenge => {
        progress.challenges[challenge.id] = {
            progress: 0,
            target: challenge.target,
            completed: false
        };
    });
    
    gameState.playerChallenges.set(socketId, progress);
}

// Vérifier et mettre à jour les défis après une réponse
function checkChallenges(socketId, answerData) {
    const playerProgress = gameState.playerChallenges.get(socketId);
    if (!playerProgress) return [];
    
    const { correct, responseTime, difficulty, series, isFirst } = answerData;
    const completedChallenges = [];
    
    // Mettre à jour le streak
    if (correct) {
        playerProgress.currentStreak++;
        if (series) {
            playerProgress.seriesAnswered.add(series);
        }
    } else {
        playerProgress.currentStreak = 0;
    }
    
    // Vérifier chaque défi actif
    gameState.activeChallenges.forEach(challenge => {
        const cp = playerProgress.challenges[challenge.id];
        if (!cp || cp.completed) return;
        
        let progressMade = false;
        
        switch (challenge.type) {
            case 'speed':
                // Bonne réponse en moins de 3s
                if (correct && responseTime < 3000) {
                    cp.progress = 1;
                    progressMade = true;
                }
                break;
                
            case 'streak':
                // X bonnes réponses d'affilée
                if (correct) {
                    cp.progress = playerProgress.currentStreak;
                    progressMade = true;
                } else {
                    cp.progress = 0; // Reset à 0 si mauvaise réponse
                }
                break;
                
            case 'total':
                // X bonnes réponses au total
                if (correct) {
                    cp.progress++;
                    progressMade = true;
                }
                break;
                
            case 'first':
                // Premier à bien répondre
                if (correct && isFirst) {
                    cp.progress = 1;
                    progressMade = true;
                }
                break;
                
            case 'difficulty':
                // Réussir une question de difficulté spécifique
                if (correct) {
                    if (challenge.id === 'hard' && difficulty === 'hard') {
                        cp.progress = 1;
                        progressMade = true;
                    } else if (challenge.id === 'veryhard' && (difficulty === 'veryhard' || difficulty === 'extreme')) {
                        cp.progress = 1;
                        progressMade = true;
                    }
                }
                break;
                
            case 'series':
                // Réussir sur X séries différentes
                if (correct) {
                    cp.progress = playerProgress.seriesAnswered.size;
                    progressMade = true;
                }
                break;
        }
        
        // Vérifier si défi complété
        if (progressMade && cp.progress >= cp.target && !cp.completed) {
            cp.completed = true;
            completedChallenges.push({
                challengeId: challenge.id,
                reward: challenge.reward
            });
            console.log(`🏆 Défi "${challenge.name}" complété par ${socketId} ! Récompense: ${challenge.reward}`);
        }
    });
    
    return completedChallenges;
}

// Obtenir l'état des défis pour un joueur (pour envoi au client)
function getPlayerChallengesState(socketId) {
    const playerProgress = gameState.playerChallenges.get(socketId);
    if (!playerProgress) return [];
    
    return gameState.activeChallenges.map(challenge => {
        const cp = playerProgress.challenges[challenge.id];
        return {
            id: challenge.id,
            name: challenge.name,
            description: challenge.description,
            reward: challenge.reward,
            progress: cp ? cp.progress : 0,
            target: challenge.target,
            completed: cp ? cp.completed : false
        };
    });
}

const authenticatedUsers = new Map();

// ============================================
// Helpers
// ============================================

// 🆕 Vérifie si on doit appliquer le cooldown de série
function shouldApplySerieCooldown() {
    return gameState.serieFilter === 'tout' || gameState.serieFilter === 'mainstream';
}

// 🆕 Ajoute une série à l'historique récent (garde les 5 dernières)
function addToRecentSeries(serie) {
    if (!shouldApplySerieCooldown()) return;

    gameState.recentSeries.push(serie);
    if (gameState.recentSeries.length > 5) {
        gameState.recentSeries.shift(); // Retirer la plus ancienne
    }
    console.log(`📚 Séries récentes: [${gameState.recentSeries.join(', ')}]`);
}


function getDifficultyForQuestion(questionNumber) {
    if (gameState.difficultyMode === 'aleatoire') {
        // 🆕 MODE ALÉATOIRE PONDÉRÉ - sqrt des tailles de pool pour un entre-deux équilibré
        // Poids approximatifs basés sur les pools (recalculés dynamiquement serait mieux mais ça suffit)
        const difficultyWeights = {
            veryeasy: Math.sqrt(98),   // ~9.9
            easy: Math.sqrt(178),      // ~13.3
            medium: Math.sqrt(208),    // ~14.4
            hard: Math.sqrt(195),      // ~14.0
            veryhard: Math.sqrt(115),  // ~10.7
            extreme: Math.sqrt(10)     // ~3.2 → ~5%
        };
        // Résultat approx: veryeasy 15.1%, easy 20.3%, medium 22.0%, hard 21.4%, veryhard 16.3%, extreme ~5%
        
        const difficulties = Object.keys(difficultyWeights);
        
        // Filtrer pour éviter la dernière difficulté utilisée
        const available = gameState.lastDifficulty
            ? difficulties.filter(d => d !== gameState.lastDifficulty)
            : difficulties;
        
        // Tirage pondéré
        const totalWeight = available.reduce((sum, d) => sum + difficultyWeights[d], 0);
        let roll = Math.random() * totalWeight;
        let picked = available[0];
        for (const d of available) {
            roll -= difficultyWeights[d];
            if (roll <= 0) { picked = d; break; }
        }
        
        gameState.lastDifficulty = picked;
        return picked;
    }

    // MODE CROISSANTE (logique actuelle)
    if (gameState.mode === 'lives') {
        if (questionNumber <= 5) return 'veryeasy';
        if (questionNumber <= 12) return 'easy';
        if (questionNumber <= 25) return 'medium';
        if (questionNumber <= 35) return 'hard';
        if (questionNumber <= 45) return 'veryhard';
        return 'extreme';
    } else {
        const distribution = getQuestionDistribution(gameState.questionsCount);
        let cumulative = 0;
        const difficulties = ['veryeasy', 'easy', 'medium', 'hard', 'veryhard', 'extreme'];

        for (const diff of difficulties) {
            cumulative += distribution[diff];
            if (questionNumber <= cumulative) {
                return diff;
            }
        }
        return 'extreme';
    }
}

function getAlivePlayers() {
    return Array.from(gameState.players.values()).filter(p => p.lives > 0);
}

function getEliminatedCount() {
    return Array.from(gameState.players.values()).filter(p => p.lives === 0).length;
}



app.get('/', (req, res) => {
    res.sendFile(__dirname + '/src/html/home.html');
});

// ============================================
// Routes HOST (ex-admin)
// ============================================

// Panel du host (créateur de la room)
app.get('/admin', (req, res) => {
    res.sendFile(__dirname + '/src/html/admin.html');
});

app.get('/admin/game-state', (req, res) => {
    // 💣🎴 Vérifier si le lobby BombAnime/Collect est plein
    const isBombanimeMode = gameState.lobbyMode === 'bombanime';
    const maxPlayers = isBombanimeMode ? BOMBANIME_CONFIG.MAX_PLAYERS : Infinity;
    const isLobbyFull = isBombanimeMode && gameState.players.size >= maxPlayers;

    res.json({
        isActive: gameState.isActive,
        roomCode: gameState.roomCode,
        phase: gameState.inProgress ? 'playing' : (gameState.isActive ? 'lobby' : 'idle'),
        players: Array.from(gameState.players.values()).map(p => ({
            username: p.username,
            twitch_id: p.twitchId,
            twitchId: p.twitchId,
            title: p.title || 'Novice courageux',
            isChampion: p.twitchId === lastGlobalWinner
        })),
        playerCount: gameState.players.size,
        lobbyMode: gameState.lobbyMode,
        maxPlayers: maxPlayers,
        isLobbyFull: isLobbyFull
    });
});

// Activer/désactiver le jeu
app.post('/admin/toggle-game', async (req, res) => {

    gameState.isActive = !gameState.isActive;

    if (gameState.isActive) {
        // 🔑 Code de salon : généré à l'ouverture, vérifié à chaque jointure.
        // Phase 2 : ce code deviendra la clé de la Map des rooms.
        gameState.roomCode = generateRoomCode();
        console.log(`✅ Jeu activé - Lobby ouvert (code ${gameState.roomCode})`);

        // 🔥 FIX: Clear le winnerScreenData pour éviter les données stale
        // (ex: après BombAnime le winner screen data persiste car closeBombanimeWinner n'appelle pas le serveur)
        winnerScreenData = null;
        
        // 🆕 Récupérer le mode et les noms d'équipe depuis la requête
        const { lobbyMode, teamNames, bombanimeSerie, bombanimeTimer, bombanimeLives } = req.body || {};
        gameState.lobbyMode = lobbyMode || 'classic';
        if (teamNames) {
            gameState.teamNames = teamNames;
        } else {
            gameState.teamNames = { 1: 'Team A', 2: 'Team B' };
        }
        gameState.teamCounts = { 1: 0, 2: 0 };
        
        // 💣 Configuration BombAnime
        if (lobbyMode === 'bombanime') {
            gameState.bombanime.serie = bombanimeSerie || 'Naruto';
            gameState.bombanime.timer = bombanimeTimer || BOMBANIME_CONFIG.DEFAULT_TIMER;
            gameState.bombanime.lives = bombanimeLives || BOMBANIME_CONFIG.DEFAULT_LIVES;
            console.log(`💣 BombAnime configuré: ${gameState.bombanime.serie} - ${gameState.bombanime.timer}s - ${gameState.bombanime.lives} vies`);
        }
        
        console.log(`🎮 Mode: ${gameState.lobbyMode}${gameState.lobbyMode === 'rivalry' ? ` (${gameState.teamNames[1]} vs ${gameState.teamNames[2]})` : ''}${gameState.lobbyMode === 'bombanime' ? ` (${gameState.bombanime.serie})` : ''}`);

        resetLogs();

        // Reset la grille des joueurs à l'ouverture du lobby
        gameState.players.clear();
        gameState.answers.clear();
        pendingJoins.clear(); // 🔓 Reset les réservations
        gameState.currentQuestionIndex = 0;
        gameState.currentQuestion = null;
        gameState.showResults = false;
        gameState.lastQuestionResults = null;
        gameState.questionStartTime = null;
        gameState.gameStartTime = null;
        gameState.inProgress = false;
        gameState.currentGameId = null;
        gameState.livesIcon = 'heart';

        // 🔥 NOUVEAU: Reset tiebreaker
        gameState.isTiebreaker = false;
        gameState.tiebreakerPlayers = [];
        gameState.isRivalryTiebreaker = false; // 🔥 FIX: Reset rivalry tiebreaker aussi
        
        // 🔥 FIX: Annuler les timeouts stale d'une partie précédente
        if (gameState.rivalryTiebreakerTimeout) {
            clearTimeout(gameState.rivalryTiebreakerTimeout);
            gameState.rivalryTiebreakerTimeout = null;
        }
        if (gameState.rivalryRevealTimeout) {
            clearTimeout(gameState.rivalryRevealTimeout);
            gameState.rivalryRevealTimeout = null;
        }
        if (gameState.rivalryEndGameTimeout) {
            clearTimeout(gameState.rivalryEndGameTimeout);
            gameState.rivalryEndGameTimeout = null;
        }

        io.emit('game-activated', {
            lives: gameState.lives,
            questionTime: gameState.questionTime,
            lobbyMode: gameState.lobbyMode,
            teamNames: gameState.teamNames,
            noSpoil: gameState.noSpoil, // 🚫 Filtre anti-spoil
            bonusEnabled: gameState.bonusEnabled, // 🎮 Bonus activés
            // 💣 Données BombAnime
            bombanimeSerie: gameState.bombanime.serie,
            bombanimeTimer: gameState.bombanime.timer
        });
    } else {
        console.log('❌ Jeu désactivé');

        // Reset complet de l'état si une partie était en cours
        if (gameState.inProgress) {
            console.log('⚠️ Partie en cours annulée');
        }

        winnerScreenData = null;
        gameState.inProgress = false;
        gameState.currentGameId = null;
        gameState.currentQuestionIndex = 0;
        gameState.currentQuestion = null;
        gameState.showResults = false;
        gameState.lastQuestionResults = null;
        gameState.players.clear();
        gameState.answers.clear();
        pendingJoins.clear(); // 🔓 Reset les réservations
        gameState.questionStartTime = null;
        gameState.gameStartTime = null;

        gameState.playerBonuses.clear();
        
        // 🆕 Reset mode Rivalité
        gameState.lobbyMode = 'classic';
        gameState.teamNames = { 1: 'Team A', 2: 'Team B' };
        gameState.teamCounts = { 1: 0, 2: 0 };
        
        // 🚫 Reset anti-spoil
        gameState.noSpoil = false;
        
        // 🔥 FIX: Reset tiebreaker flags
        gameState.isTiebreaker = false;
        gameState.tiebreakerPlayers = [];
        gameState.isRivalryTiebreaker = false;
        
        // 🔥 FIX: Annuler les timeouts stale
        if (gameState.autoModeTimeout) {
            clearTimeout(gameState.autoModeTimeout);
            gameState.autoModeTimeout = null;
        }
        if (gameState.rivalryTiebreakerTimeout) {
            clearTimeout(gameState.rivalryTiebreakerTimeout);
            gameState.rivalryTiebreakerTimeout = null;
        }
        if (gameState.rivalryRevealTimeout) {
            clearTimeout(gameState.rivalryRevealTimeout);
            gameState.rivalryRevealTimeout = null;
        }
        if (gameState.rivalryEndGameTimeout) {
            clearTimeout(gameState.rivalryEndGameTimeout);
            gameState.rivalryEndGameTimeout = null;
        }
        
        // 💣 Reset BombAnime
        resetBombanimeState();
        

        io.emit('game-deactivated');
    }

    res.json({ isActive: gameState.isActive });
});

// 💣 Mettre à jour la série BombAnime
app.post('/admin/bombanime/update-serie', (req, res) => {
    
    const { serie } = req.body;
    
    if (!serie) {
        return res.status(400).json({ error: 'Série manquante' });
    }
    
    // Vérifier que la série existe
    if (!BOMBANIME_CHARACTERS[serie]) {
        return res.status(400).json({ error: 'Série inconnue' });
    }
    
    gameState.bombanime.serie = serie;
    console.log(`💣 Série BombAnime mise à jour: ${serie} (${BOMBANIME_CHARACTERS[serie].length} personnages)`);
    
    // Notifier les joueurs du changement de série
    io.emit('bombanime-serie-updated', { 
        serie: serie,
        characterCount: BOMBANIME_CHARACTERS[serie].length 
    });
    
    res.json({ success: true, serie: serie });
});

// 💣 Fermer le lobby BombAnime spécifiquement
app.post('/admin/bombanime/close-lobby', (req, res) => {
    
    // Fermer le lobby
    gameState.isActive = false;
    gameState.inProgress = false;
    
    // Reset BombAnime
    resetBombanimeState();
    
    
    // Reset winnerScreenData
    winnerScreenData = null;
    
    // Vider les joueurs
    gameState.players.clear();
    
    // Notifier les clients
    io.emit('game-deactivated');
    io.emit('bombanime-lobby-closed');
    io.emit('collect-state', { active: false });
    
    console.log('🔒 Lobby fermé (BombAnime/Collect reset)');
    res.json({ success: true });
});

// ============================================
// 📝 BOMBANIME SUGGESTIONS ROUTES
// ============================================

// Créer une nouvelle suggestion
app.post('/admin/bombanime/suggestion', async (req, res) => {
    
    try {
        const { type, anime, characterName, variantOf, details } = req.body;
        
        if (!type || !anime || !characterName) {
            return res.status(400).json({ error: 'Champs requis manquants' });
        }
        
        const suggestion = await db.createSuggestion({
            type,
            anime,
            characterName: characterName.toUpperCase().trim(),
            variantOf: variantOf ? variantOf.toUpperCase().trim() : null,
            details,
            submittedBy: 'Host'
        });
        
        res.json({ success: true, suggestion });
    } catch (error) {
        console.error('Erreur création suggestion:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// 🎌 Suggestion joueur (1x par partie, pas de variante)
app.post('/bombanime/player-suggestion', async (req, res) => {
    try {
        const { anime, characterName, submittedBy } = req.body;
        
        if (!anime || !characterName || !submittedBy) {
            return res.status(400).json({ error: 'Champs requis manquants' });
        }
        
        const suggestion = await db.createSuggestion({
            type: 'add',
            anime,
            characterName: characterName.toUpperCase().trim(),
            variantOf: null,
            details: null,
            submittedBy: `[Player] ${submittedBy}`
        });
        
        res.json({ success: true, suggestion });
    } catch (error) {
        console.error('Erreur suggestion joueur:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Récupérer les suggestions
app.get('/admin/bombanime/suggestions', async (req, res) => {
    
    try {
        const { status } = req.query;
        const suggestions = await db.getSuggestions(status || null);
        const counts = await db.getSuggestionsCount();
        
        res.json({ suggestions, counts });
    } catch (error) {
        console.error('Erreur récupération suggestions:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Mettre à jour le statut d'une suggestion
app.post('/admin/bombanime/suggestion/:id/status', async (req, res) => {
    
    try {
        const { id } = req.params;
        const { status, adminNotes } = req.body;
        
        if (!['pending', 'approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Statut invalide' });
        }
        
        const suggestion = await db.updateSuggestionStatus(parseInt(id), status, adminNotes);
        res.json({ success: true, suggestion });
    } catch (error) {
        console.error('Erreur mise à jour suggestion:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Supprimer une suggestion
app.delete('/admin/bombanime/suggestion/:id', async (req, res) => {
    
    try {
        const { id } = req.params;
        await db.deleteSuggestion(parseInt(id));
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur suppression suggestion:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Récupérer la liste des animes disponibles pour les suggestions
app.get('/admin/bombanime/animes', (req, res) => {
    
    const animes = Object.keys(BOMBANIME_CHARACTERS).map(key => ({
        key,
        count: BOMBANIME_CHARACTERS[key].length
    }));
    
    res.json({ animes });
});

// Mettre à jour les paramètres du jeu (vies et temps)
app.post('/admin/update-settings', (req, res) => {

    const { lives, timePerQuestion } = req.body;

    if (lives) {
        gameState.lives = parseInt(lives);
    }
    if (timePerQuestion) {
        gameState.questionTime = parseInt(timePerQuestion);
    }

    console.log(`⚙️ Paramètres mis à jour: ${gameState.lives}❤️ - ${gameState.questionTime}s`);

    // Notifier tous les clients des nouveaux paramètres
    io.emit('game-config-updated', {
        lives: gameState.lives,
        questionTime: gameState.questionTime
    });

    res.json({
        success: true,
        lives: gameState.lives,
        questionTime: gameState.questionTime
    });
});

// Route séparée pour changer les vies
app.post('/admin/set-lives', (req, res) => {

    const { lives } = req.body;
    gameState.lives = parseInt(lives);

    console.log(`⚙️ Vies mises à jour: ${gameState.lives}❤️`);

    // Mettre à jour les vies de tous les joueurs déjà connectés dans le lobby
    if (!gameState.inProgress && gameState.players.size > 0) {
        gameState.players.forEach(player => {
            player.lives = gameState.lives;
        });

        // Notifier l'admin pour rafraîchir la grille joueurs
        broadcastLobbyUpdate();

        console.log(`✅ Vies mises à jour pour ${gameState.players.size} joueur(s) dans le lobby`);
    }

    res.json({ success: true, lives: gameState.lives });
});

// Route séparée pour changer le temps par question
app.post('/admin/set-time', (req, res) => {

    const { time } = req.body;
    gameState.questionTime = parseInt(time);

    console.log(`⚙️ Temps par question mis à jour: ${gameState.questionTime}s`);

    // Notifier tous les clients du nouveau temps
    io.emit('game-config-updated', {
        lives: gameState.lives,
        questionTime: gameState.questionTime
    });

    res.json({ success: true, questionTime: gameState.questionTime });
});

// Route séparée pour changer le nombre de réponses
app.post('/admin/set-answers', (req, res) => {

    const { answers } = req.body;
    gameState.answersCount = parseInt(answers);

    console.log(`⚙️ Nombre de réponses mis à jour: ${gameState.answersCount}`);

    // Notifier tous les clients du nouveau paramètre
    io.emit('game-config-updated', {
        lives: gameState.lives,
        questionTime: gameState.questionTime,
        answersCount: gameState.answersCount
    });

    res.json({ success: true, answersCount: gameState.answersCount });
});

// Démarrer une partie
app.post('/admin/start-game', async (req, res) => {

    if (gameState.inProgress) {
        return res.status(400).json({ error: 'Une partie est déjà en cours' });
    }

    const totalPlayers = gameState.players.size;
    if (totalPlayers === 0) {
        return res.status(400).json({
            success: false,
            error: 'Impossible de démarrer : aucun joueur dans le lobby'
        });
    }
    
    // 🆕 Minimum 2 joueurs pour lancer une partie
    if (totalPlayers < 2) {
        return res.status(400).json({
            success: false,
            error: 'Impossible de démarrer : minimum 2 joueurs requis'
        });
    }

    // 💣 MODE BOMBANIME - Démarrage spécial
    if (gameState.lobbyMode === 'bombanime') {
        // Récupérer les paramètres envoyés
        const { bombanimeLives, bombanimeTimer, bombanimeSerie } = req.body || {};
        
        // Mettre à jour la série si fournie
        if (bombanimeSerie && BOMBANIME_CHARACTERS[bombanimeSerie]) {
            gameState.bombanime.serie = bombanimeSerie;
            console.log(`💣 Série BombAnime: ${gameState.bombanime.serie}`);
        }
        
        // Mettre à jour les paramètres si fournis
        if (bombanimeLives) {
            gameState.bombanime.lives = parseInt(bombanimeLives);
            console.log(`💣 Vies BombAnime mises à jour: ${gameState.bombanime.lives}`);
        }
        if (bombanimeTimer) {
            gameState.bombanime.timer = parseInt(bombanimeTimer);
            console.log(`💣 Timer BombAnime mis à jour: ${gameState.bombanime.timer}s`);
        }
        
        // Vérifier les limites de joueurs
        if (totalPlayers > BOMBANIME_CONFIG.MAX_PLAYERS) {
            return res.status(400).json({
                success: false,
                error: `Maximum ${BOMBANIME_CONFIG.MAX_PLAYERS} joueurs en mode BombAnime`
            });
        }
        
        try {
            const result = await startBombanimeGame();
            if (result.success) {
                return res.json({ success: true, mode: 'bombanime' });
            } else {
                return res.status(400).json({ success: false, error: result.error });
            }
        } catch (error) {
            console.error('❌ Erreur démarrage BombAnime:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }


    // 🆕 Vérifier que les deux équipes ont des joueurs en mode Rivalité
    if (gameState.lobbyMode === 'rivalry') {
        let team1Count = 0;
        let team2Count = 0;
        
        gameState.players.forEach(player => {
            if (player.team === 1) team1Count++;
            else if (player.team === 2) team2Count++;
        });
        
        console.log(`🔍 Vérification équipes: Team A = ${team1Count}, Team B = ${team2Count}`);
        
        if (team1Count === 0 || team2Count === 0) {
            const emptyTeam = team1Count === 0 ? gameState.teamNames[1] : gameState.teamNames[2];
            return res.status(400).json({
                success: false,
                error: `Impossible de démarrer : l'équipe "${emptyTeam}" n'a aucun joueur`,
                errorType: 'empty_team'
            });
        }
    }

    try {
        // 📝 Historique des questions : local à la partie (v2 : plus de streamerId)
        gameState.usedQuestionIds = [];

        gameState.inProgress = true;
        gameState.currentGameId = null;
        gameState.initialPlayerCount = totalPlayers; // 🆕 Stocker le nombre initial
        gameState.currentQuestionIndex = 0;
        gameState.gameStartTime = Date.now();
        gameState.showResults = false;
        gameState.lastQuestionResults = null;
        gameState.recentSeries = [];
        
        // 🔥 FIX: Reset des flags tiebreaker (pouvaient rester à true si l'admin a fermé le lobby pendant un tiebreaker)
        gameState.isTiebreaker = false;
        gameState.tiebreakerPlayers = [];
        gameState.isRivalryTiebreaker = false;
        
        // 🔥 FIX: Annuler les timeouts stale de la partie précédente
        if (gameState.autoModeTimeout) {
            clearTimeout(gameState.autoModeTimeout);
            gameState.autoModeTimeout = null;
        }
        if (gameState.rivalryTiebreakerTimeout) {
            clearTimeout(gameState.rivalryTiebreakerTimeout);
            gameState.rivalryTiebreakerTimeout = null;
        }
        if (gameState.rivalryRevealTimeout) {
            clearTimeout(gameState.rivalryRevealTimeout);
            gameState.rivalryRevealTimeout = null;
        }
        if (gameState.rivalryEndGameTimeout) {
            clearTimeout(gameState.rivalryEndGameTimeout);
            gameState.rivalryEndGameTimeout = null;
        }

        const playerCount = gameState.players.size;
        addLog('game-start', { playerCount });

        gameState.playerBonuses.clear();
        console.log('🔄 Bonus reset pour nouvelle partie');

        // 🆕 Générer les défis pour cette partie (seulement si bonus activés)
        if (gameState.bonusEnabled) {
            gameState.activeChallenges = generateChallenges();
            gameState.playerChallenges.clear();
            console.log('🎯 Défis initialisés pour la partie');
        } else {
            gameState.activeChallenges = [];
            gameState.playerChallenges.clear();
            console.log('🎮 Bonus désactivés — pas de défis ni de jauge combo');
        }

        // Initialiser les joueurs selon le mode
        gameState.players.forEach((player, socketId) => {
            if (gameState.mode === 'lives') {
                player.lives = gameState.lives;
                player.correctAnswers = 0;
            } else {
                player.points = 0;
            }

            // 🆕 Initialiser les bonus du joueur avec inventaire (seulement si bonus activés)
            if (gameState.bonusEnabled) {
                gameState.playerBonuses.set(socketId, {
                    comboLevel: 0,
                    comboProgress: 0,
                    bonusInventory: { '5050': 0, 'reveal': 0, 'shield': 0, 'doublex2': 0 }
                });

                // 🆕 Initialiser les défis du joueur
                initPlayerChallenges(socketId);
            }
        });

        console.log(`🎮 Partie démarrée (Mode: ${gameState.mode.toUpperCase()}) - ${totalPlayers} joueurs - Filtre: ${gameState.serieFilter}`);

        io.sockets.sockets.forEach((socket) => {
            const socketId = socket.id;
            const player = gameState.players.get(socketId);

            if (player) {
                socket.emit('game-started', {
                    totalPlayers,
                    isParticipating: true,
                    gameMode: gameState.mode,
                    questionsCount: gameState.mode === 'points' ? gameState.questionsCount : null,
                    challenges: getPlayerChallengesState(socketId), // 🆕 Envoyer les défis
                    // 🆕 Mode Rivalité
                    lobbyMode: gameState.lobbyMode,
                    teamNames: gameState.teamNames,
                    playerTeam: player.team || null,
                    bonusEnabled: gameState.bonusEnabled // 🎮 Bonus activés
                });
            } else {
                socket.emit('game-started', {
                    totalPlayers,
                    isParticipating: false,
                    gameMode: gameState.mode,
                    // 🆕 Mode Rivalité
                    lobbyMode: gameState.lobbyMode,
                    teamNames: gameState.teamNames,
                    bonusEnabled: gameState.bonusEnabled // 🎮 Bonus activés
                });
            }
        });

        // 🔥 NOUVEAU: Envoyer automatiquement la première question après 2s
        setTimeout(async () => {
            try {
                gameState.currentQuestionIndex = 1;

                const difficulty = getDifficultyForQuestion(1);
                const questions = await db.getRandomQuestions(
                    difficulty,
                    1,
                    gameState.usedQuestionIds,
                    gameState.serieFilter,
                    shouldApplySerieCooldown() ? gameState.recentSeries : [],
                    gameState.noSpoil  // 🚫 Filtre anti-spoil
                );

                if (questions.length === 0) {
                    console.error('❌ Aucune question disponible');
                    return;
                }

                const question = questions[0];
                addToRecentSeries(question.serie);
                gameState.usedQuestionIds.push(question.id);

                console.log(`📌 Question 1 - Difficulté: ${difficulty}`);

                const allAnswers = [
                    { text: question.answer1, index: 1 },
                    { text: question.answer2, index: 2 },
                    { text: question.answer3, index: 3 },
                    { text: question.answer4, index: 4 },
                    { text: question.answer5, index: 5 },
                    { text: question.answer6, index: 6 }
                ].filter(answer => answer.text !== null && answer.text !== '');

                const correctAnswerObj = allAnswers.find(a => a.index === question.coanswer);
                const wrongAnswers = allAnswers.filter(a => a.index !== question.coanswer);
                const wrongAnswersNeeded = gameState.answersCount - 1;
                const shuffledWrong = wrongAnswers.sort(() => 0.5 - Math.random()).slice(0, wrongAnswersNeeded);
                const selectedAnswers = [correctAnswerObj, ...shuffledWrong];
                const finalAnswers = selectedAnswers.sort(() => 0.5 - Math.random());
                const newCorrectIndex = finalAnswers.findIndex(a => a.index === question.coanswer) + 1;

                const questionData = {
                    questionNumber: 1,
                    totalQuestions: gameState.mode === 'points' ? gameState.questionsCount : null,
                    questionId: question.id,
                    question: question.question,
                    answers: finalAnswers.map(a => a.text),
                    serie: question.serie,
                    difficulty: question.difficulty,
                    timeLimit: gameState.questionTime,
                    proof_url: question.proof_url || null
                };

                gameState.currentQuestion = {
                    ...questionData,
                    correctAnswer: newCorrectIndex,
                    difficulty: question.difficulty
                };

                gameState.questionStartTime = Date.now();
                gameState.showResults = false;
                gameState.lastQuestionResults = null;
                gameState.answers.clear();
                gameState.liveAnswers.clear();

                addLog('question', {
                    questionNumber: 1,
                    difficulty: difficulty,
                    series: question.serie
                });

                // Envoyer la question aux joueurs
                io.emit('new-question', questionData);

                // Timer pour révéler les réponses
                setTimeout(() => {
                    if (gameState.inProgress) {
                        revealAnswers(newCorrectIndex);
                    }
                }, gameState.questionTime * 1000);

            } catch (error) {
                console.error('❌ Erreur envoi première question:', error);
            }
        }, 2000);

        res.json({ success: true, mode: gameState.mode });

    } catch (error) {
        console.error('❌ Erreur démarrage partie:', error);
        res.status(500).json({ error: error.message });
    }
});


// Route pour changer le mode de jeu
app.post('/admin/set-mode', (req, res) => {

    // Bloquer si une partie est en cours
    if (gameState.inProgress) {
        return res.status(400).json({
            error: 'Impossible de changer le mode pendant une partie',
            blocked: true
        });
    }

    const { mode } = req.body;

    if (!['lives', 'points'].includes(mode)) {
        return res.status(400).json({ error: 'Mode invalide' });
    }

    gameState.mode = mode;
    console.log(`⚙️ Mode de jeu changé: ${mode}`);

    // Mettre à jour tous les joueurs déjà dans le lobby
    if (gameState.players.size > 0) {
        gameState.players.forEach(player => {
            if (mode === 'lives') {
                player.lives = gameState.lives;
                player.correctAnswers = 0;
                delete player.points;
            } else {
                player.points = 0;
                delete player.lives;
                delete player.correctAnswers;
            }
        });

        console.log(`✅ ${gameState.players.size} joueur(s) mis à jour pour le mode ${mode}`);
    }

    io.emit('game-config-updated', {
        mode: gameState.mode,
        lives: gameState.lives,
        questionTime: gameState.questionTime,
        answersCount: gameState.answersCount,
        questionsCount: gameState.questionsCount
    });

    broadcastLobbyUpdate();

    res.json({ success: true, mode: gameState.mode });
});

// Route pour changer le nombre de questions (Mode Points)
app.post('/admin/set-questions', (req, res) => {

    const { questions } = req.body;
    const validCounts = [15, 20, 25, 30, 35, 40, 45, 50];

    if (!validCounts.includes(parseInt(questions))) {
        return res.status(400).json({ error: 'Nombre de questions invalide' });
    }

    gameState.questionsCount = parseInt(questions);
    console.log(`⚙️ Nombre de questions mis à jour: ${gameState.questionsCount}`);

    io.emit('game-config-updated', {
        mode: gameState.mode,
        lives: gameState.lives,
        questionTime: gameState.questionTime,
        answersCount: gameState.answersCount,
        questionsCount: gameState.questionsCount
    });

    res.json({ success: true, questionsCount: gameState.questionsCount });
});

// 🆕 Route pour activer/désactiver le bonus rapidité (mode points uniquement)
app.post('/admin/set-speed-bonus', (req, res) => {

    const { enabled } = req.body;
    gameState.speedBonus = enabled === true;
    console.log(`⚡ Bonus rapidité: ${gameState.speedBonus ? 'Activé' : 'Désactivé'}`);

    res.json({ success: true, speedBonus: gameState.speedBonus });
});

// 🎮 Route pour activer/désactiver les bonus (jauge combo, bonus, défis)
app.post('/admin/set-bonus-enabled', (req, res) => {

    const { enabled } = req.body;
    gameState.bonusEnabled = enabled === true;
    console.log(`🎮 Bonus (jauge/défis): ${gameState.bonusEnabled ? 'Activé' : 'Désactivé'}`);

    res.json({ success: true, bonusEnabled: gameState.bonusEnabled });
});


// Route pour changer le mode de difficulté
app.post('/admin/set-difficulty-mode', (req, res) => {

    // Bloquer si une partie est en cours
    if (gameState.inProgress) {
        return res.status(400).json({
            error: 'Impossible de changer la difficulté pendant une partie',
            blocked: true
        });
    }

    const { mode } = req.body;

    if (!['croissante', 'aleatoire'].includes(mode)) {
        return res.status(400).json({ error: 'Mode de difficulté invalide' });
    }

    gameState.difficultyMode = mode;
    gameState.lastDifficulty = null; // Reset
    console.log(`⚙️ Mode de difficulté changé: ${mode}`);

    io.emit('game-config-updated', {
        mode: gameState.mode,
        lives: gameState.lives,
        questionTime: gameState.questionTime,
        answersCount: gameState.answersCount,
        questionsCount: gameState.questionsCount,
        difficultyMode: gameState.difficultyMode // 🆕
    });

    res.json({ success: true, difficultyMode: gameState.difficultyMode });
});


// 🚫 Route pour activer/désactiver le filtre anti-spoil
app.post('/admin/set-no-spoil', (req, res) => {

    if (gameState.inProgress) {
        return res.status(400).json({
            error: 'Impossible de changer le filtre pendant une partie',
            blocked: true
        });
    }

    const { enabled } = req.body;
    gameState.noSpoil = enabled === true;
    console.log(`🚫 Filtre anti-spoil: ${gameState.noSpoil ? 'Activé (masqué)' : 'Désactivé (autorisé)'}`);

    io.emit('game-config-updated', {
        mode: gameState.mode,
        lives: gameState.lives,
        questionTime: gameState.questionTime,
        answersCount: gameState.answersCount,
        questionsCount: gameState.questionsCount,
        difficultyMode: gameState.difficultyMode,
        serieFilter: gameState.serieFilter,
        noSpoil: gameState.noSpoil
    });

    res.json({ success: true, noSpoil: gameState.noSpoil });
});


// Route pour obtenir les statistiques des séries (nombre de questions)
app.get('/admin/serie-stats', async (req, res) => {

    try {
        const allQuestions = await db.getAllQuestions();

        // Compter les séries uniques
        const uniqueSeries = new Set(allQuestions.map(q => q.serie).filter(s => s));
        const totalSeries = uniqueSeries.size;

        const stats = {};

        // 🔥 AUTOMATIQUE: Générer les stats pour chaque filtre dans SERIES_FILTERS
        for (const [filterId, filterConfig] of Object.entries(SERIES_FILTERS)) {
            if (filterId === 'tout') {
                stats.tout = {
                    count: allQuestions.length,
                    subtitle: `${totalSeries} séries`
                };
            } else if (filterId === 'mainstream') {
                const mainstreamSeriesWithQuestions = new Set(
                    allQuestions
                        .filter(q => filterConfig.series.includes(q.serie))
                        .map(q => q.serie)
                );
                stats.mainstream = {
                    count: mainstreamSeriesWithQuestions.size,
                    subtitle: `${mainstreamSeriesWithQuestions.size} séries`
                };
            } else {
                // Pour tous les autres filtres (naruto, dragonball, onepiece, bleach, etc.)
                stats[filterId] = {
                    count: allQuestions.filter(q => filterConfig.series.includes(q.serie)).length,
                    subtitle: null
                };
            }
        }

        res.json(stats);
    } catch (error) {
        console.error('❌ Erreur stats séries:', error);
        res.status(500).json({ error: error.message });
    }
});

// Route pour changer le filtre série
app.post('/admin/set-serie-filter', (req, res) => {

    // Bloquer si une partie est en cours
    if (gameState.inProgress) {
        return res.status(400).json({
            error: 'Impossible de changer le filtre pendant une partie',
            blocked: true
        });
    }

    const { filter } = req.body;

    // 🔥 AUTOMATIQUE: Validation basée sur SERIES_FILTERS
    if (!SERIES_FILTERS[filter]) {
        return res.status(400).json({ error: 'Filtre invalide' });
    }

    gameState.serieFilter = filter;
    console.log(`⚙️ Filtre série changé: ${filter}`);

    io.emit('game-config-updated', {
        mode: gameState.mode,
        lives: gameState.lives,
        questionTime: gameState.questionTime,
        answersCount: gameState.answersCount,
        questionsCount: gameState.questionsCount,
        difficultyMode: gameState.difficultyMode,
        autoMode: gameState.autoMode,
        serieFilter: gameState.serieFilter
    });

    res.json({ success: true, serieFilter: gameState.serieFilter });
});


// Route pour toggle le mode auto
app.post('/admin/toggle-auto-mode', (req, res) => {

    gameState.autoMode = !gameState.autoMode;
    console.log(`⚙️ Mode Auto ${gameState.autoMode ? 'activé' : 'désactivé'}`);

    // 🔥 AJOUTER - Annuler le timeout si on désactive le mode auto
    if (!gameState.autoMode && gameState.autoModeTimeout) {
        clearTimeout(gameState.autoModeTimeout);
        gameState.autoModeTimeout = null;
        console.log('⏹️ Timeout auto-mode annulé');
    }

    io.emit('game-config-updated', {
        mode: gameState.mode,
        lives: gameState.lives,
        questionTime: gameState.questionTime,
        answersCount: gameState.answersCount,
        questionsCount: gameState.questionsCount,
        difficultyMode: gameState.difficultyMode,
        autoMode: gameState.autoMode
    });

    res.json({ success: true, autoMode: gameState.autoMode });
});

// Route pour forcer le déclenchement du mode auto (si activé pendant résultats)
app.post('/admin/trigger-auto-next', (req, res) => {

    // Vérifier que le mode auto est activé et qu'une partie est en cours
    if (!gameState.autoMode || !gameState.inProgress) {
        return res.json({ success: false, reason: 'Mode auto désactivé ou pas de partie' });
    }

    // Vérifier qu'on est bien en train d'afficher les résultats
    if (!gameState.showResults) {
        return res.json({ success: false, reason: 'Pas en phase de résultats' });
    }

    console.log('🔄 Trigger manuel du mode auto');

    // Annuler le timeout précédent si existant
    if (gameState.autoModeTimeout) {
        clearTimeout(gameState.autoModeTimeout);
        gameState.autoModeTimeout = null;
    }

    // Lancer le compte à rebours de 3s
    gameState.autoModeTimeout = setTimeout(async () => {
        try {
            if (!gameState.inProgress || !gameState.autoMode) return;
            
            // 🆕 Ne pas interférer avec les tiebreakers
            if (gameState.isTiebreaker || gameState.isRivalryTiebreaker) {
                console.log('⚠️ Mode auto ignoré : tiebreaker en cours');
                return;
            }

            console.log('🤖 Mode Auto (trigger manuel) : Passage à la question suivante');

            // 🔥 FIX TIEBREAKER
            if (gameState.isTiebreaker) {
                await sendTiebreakerQuestion();
                return;
            }

            gameState.currentQuestionIndex++;

            if (gameState.mode === 'points' && gameState.currentQuestionIndex > gameState.questionsCount) {
                endGameByPoints();
                return;
            }

            const difficulty = getDifficultyForQuestion(gameState.currentQuestionIndex);
            const questions = await db.getRandomQuestions(
                difficulty,
                1,
                gameState.usedQuestionIds,
                gameState.serieFilter,
                shouldApplySerieCooldown() ? gameState.recentSeries : [],  // 🆕
                gameState.noSpoil  // 🚫 Filtre anti-spoil
            );


            if (questions.length === 0) {
                console.error('❌ Mode Auto : Aucune question disponible');
                return;
            }

            const question = questions[0];
            addToRecentSeries(question.serie);
            gameState.usedQuestionIds.push(question.id);

            const allAnswers = [
                { text: question.answer1, index: 1 },
                { text: question.answer2, index: 2 },
                { text: question.answer3, index: 3 },
                { text: question.answer4, index: 4 },
                { text: question.answer5, index: 5 },
                { text: question.answer6, index: 6 }
            ].filter(answer => answer.text !== null && answer.text !== '');

            const correctAnswerObj = allAnswers.find(a => a.index === question.coanswer);
            const wrongAnswers = allAnswers.filter(a => a.index !== question.coanswer);
            const wrongAnswersNeeded = gameState.answersCount - 1;
            const shuffledWrong = wrongAnswers.sort(() => 0.5 - Math.random()).slice(0, wrongAnswersNeeded);
            const selectedAnswers = [correctAnswerObj, ...shuffledWrong];
            const finalAnswers = selectedAnswers.sort(() => 0.5 - Math.random());
            const newCorrectIndex = finalAnswers.findIndex(a => a.index === question.coanswer) + 1;

            const questionData = {
                questionNumber: gameState.currentQuestionIndex,
                totalQuestions: gameState.mode === 'points' ? gameState.questionsCount : null,
                questionId: question.id,
                question: question.question,
                answers: finalAnswers.map(a => a.text),
                serie: question.serie,
                difficulty: question.difficulty,
                timeLimit: gameState.questionTime,
                proof_url: question.proof_url || null
            };

            gameState.currentQuestion = {
                ...questionData,
                correctAnswer: newCorrectIndex,
                difficulty: question.difficulty
            };

            gameState.questionStartTime = Date.now();
            gameState.showResults = false;
            gameState.lastQuestionResults = null;
            gameState.answers.clear();

            // Émettre l'event de préparation pour l'animation
            io.emit('prepare-next-question');

            // Attendre 400ms pour l'animation de fermeture
            await new Promise(resolve => setTimeout(resolve, 400));

            io.emit('new-question', questionData);

            setTimeout(() => {
                if (gameState.inProgress) {
                    revealAnswers(newCorrectIndex);
                }
            }, gameState.questionTime * 1000);

        } catch (error) {
            console.error('❌ Erreur trigger auto:', error);
        }
    }, 5000);

    res.json({ success: true });
});


// Route pour forcer le refresh de tous les joueurs AUTHENTIFIÉS
app.post('/admin/refresh-players', (req, res) => {

    try {
        const now = Date.now();
        const timeSinceLastRefresh = now - lastRefreshPlayersTime;

        // 🔥 Vérifier le cooldown côté serveur
        if (timeSinceLastRefresh < REFRESH_COOLDOWN_MS) {
            const remainingTime = Math.ceil((REFRESH_COOLDOWN_MS - timeSinceLastRefresh) / 1000);
            return res.status(429).json({
                error: 'Cooldown actif',
                remainingTime: remainingTime,
                onCooldown: true
            });
        }

        let refreshedCount = 0;

        // 🔥 NOUVEAU : Parcourir TOUS les utilisateurs authentifiés (pas seulement ceux dans le lobby)
        authenticatedUsers.forEach((user, socketId) => {
            const socket = io.sockets.sockets.get(socketId);
            if (socket) {
                // 🔥 Envoyer uniquement à ce joueur authentifié
                socket.emit('force-refresh');
                refreshedCount++;
                console.log(`🔄 Refresh envoyé à ${user.username}`);
            }
        });

        // 🔥 Mettre à jour le timestamp
        lastRefreshPlayersTime = now;

        console.log(`🔄 Refresh forcé envoyé à ${refreshedCount} utilisateur(s) authentifié(s)`);

        res.json({
            success: true,
            playersRefreshed: refreshedCount
        });
    } catch (error) {
        console.error('❌ Erreur refresh joueurs:', error);
        res.status(500).json({ error: error.message });
    }
});


// Route pour vérifier le cooldown restant
app.get('/admin/refresh-cooldown', (req, res) => {

    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshPlayersTime;

    if (timeSinceLastRefresh < REFRESH_COOLDOWN_MS) {
        const remainingTime = Math.ceil((REFRESH_COOLDOWN_MS - timeSinceLastRefresh) / 1000);
        res.json({
            onCooldown: true,
            remainingTime: remainingTime
        });
    } else {
        res.json({
            onCooldown: false,
            remainingTime: 0
        });
    }
});

// Route pour reset manuel de l'historique des questions
app.post('/admin/reset-questions-history', async (req, res) => {

    try {
        gameState.usedQuestionIds = [];
        console.log('🔄 Historique des questions réinitialisé manuellement');
        res.json({ success: true, message: 'Historique réinitialisé' });
    } catch (error) {
        console.error('❌ Erreur reset questions:', error);
        res.status(500).json({ error: error.message });
    }
});

// Passer à la question suivante
app.post('/admin/next-question', async (req, res) => {

    if (!gameState.inProgress) {
        return res.status(400).json({ error: 'Aucune partie en cours' });
    }

    // 🆕 Bloquer si la partie est déjà en cours de finalisation (dernière question atteinte)
    if (gameState.endingGame) {
        return res.status(400).json({ error: 'Partie en cours de finalisation', ending: true });
    }

    // Bloquer si une question est déjà en cours
    if (gameState.questionStartTime && gameState.currentQuestion) {
        const elapsed = Math.floor((Date.now() - gameState.questionStartTime) / 1000);
        if (elapsed < gameState.questionTime) {
            const timeRemaining = gameState.questionTime - elapsed;
            return res.status(400).json({
                error: 'Une question est déjà en cours',
                timeRemaining: timeRemaining,
                blocked: true
            });
        }
    }

    try {
        // 🔥 FIX TIEBREAKER: Si tiebreaker, lancer une question EXTREME
        if (gameState.isTiebreaker) {
            console.log('⚔️ Admin lance une question de départage');
            await sendTiebreakerQuestion();
            return res.json({ success: true, tiebreaker: true });
        }
        
        // 🆕 RIVALRY TIEBREAKER: Si tiebreaker rivalry, lancer une question de départage
        if (gameState.isRivalryTiebreaker) {
            console.log('⚔️ Admin lance une question de départage Rivalry');
            await sendRivalryTiebreakerQuestion();
            return res.json({ success: true, rivalryTiebreaker: true });
        }

        // Logique normale
        gameState.currentQuestionIndex++;

        // Vérifier si on a atteint le nombre max de questions en mode Points
        if (gameState.mode === 'points' && gameState.currentQuestionIndex > gameState.questionsCount) {
            // Fin de partie - déterminer le gagnant par points
            endGameByPoints();
            return res.json({ success: true, gameEnded: true });
        }

        const difficulty = getDifficultyForQuestion(gameState.currentQuestionIndex);

        // 🔥 DEBUG: Afficher le filtre utilisé
        console.log(`🔍 Filtre série actif: ${gameState.serieFilter}`);

        const questions = await db.getRandomQuestions(
            difficulty,
            1,
            gameState.usedQuestionIds,
            gameState.serieFilter,
            shouldApplySerieCooldown() ? gameState.recentSeries : [],  // 🆕
            gameState.noSpoil  // 🚫 Filtre anti-spoil
        );


        if (questions.length === 0) {
            return res.status(404).json({ error: 'Aucune question disponible' });
        }

        const question = questions[0];
        addToRecentSeries(question.serie);

        // 🔥 DEBUG: Afficher la série de la question retournée
        console.log(`📌 Question série: ${question.serie}, difficulté: ${difficulty}`);

        gameState.usedQuestionIds.push(question.id);

        console.log(`📌 Question ${gameState.currentQuestionIndex}/${gameState.mode === 'points' ? gameState.questionsCount : '∞'} - Difficulté: ${difficulty}`);
        // Récupérer toutes les réponses disponibles
        const allAnswers = [
            { text: question.answer1, index: 1 },
            { text: question.answer2, index: 2 },
            { text: question.answer3, index: 3 },
            { text: question.answer4, index: 4 },
            { text: question.answer5, index: 5 },
            { text: question.answer6, index: 6 }
        ].filter(answer => answer.text !== null && answer.text !== '');

        const correctAnswerObj = allAnswers.find(a => a.index === question.coanswer);
        const wrongAnswers = allAnswers.filter(a => a.index !== question.coanswer);

        const wrongAnswersNeeded = gameState.answersCount - 1;
        const shuffledWrong = wrongAnswers.sort(() => 0.5 - Math.random()).slice(0, wrongAnswersNeeded);

        const selectedAnswers = [correctAnswerObj, ...shuffledWrong];
        const finalAnswers = selectedAnswers.sort(() => 0.5 - Math.random());

        const newCorrectIndex = finalAnswers.findIndex(a => a.index === question.coanswer) + 1;

        const questionData = {
            questionNumber: gameState.currentQuestionIndex,
            totalQuestions: gameState.mode === 'points' ? gameState.questionsCount : null,
            questionId: question.id,
            question: question.question,
            answers: finalAnswers.map(a => a.text),
            serie: question.serie,
            difficulty: question.difficulty, // ✅ Important pour le calcul des points
            timeLimit: gameState.questionTime,
            proof_url: question.proof_url || null
        };

        gameState.currentQuestion = {
            ...questionData,
            correctAnswer: newCorrectIndex,
            difficulty: question.difficulty // ✅ Stocker aussi dans l'état
        };

        gameState.questionStartTime = Date.now();
        gameState.showResults = false;
        gameState.lastQuestionResults = null;
        gameState.answers.clear();
        gameState.liveAnswers.clear();
        updateLiveAnswerStats();

        addLog('question', {
            questionNumber: gameState.currentQuestionIndex,
            difficulty: difficulty,
            series: question.serie
        });


        io.emit('new-question', questionData);

        setTimeout(() => {
            if (gameState.inProgress) {
                revealAnswers(newCorrectIndex);
            }
        }, gameState.questionTime * 1000);

        res.json({ success: true, question: questionData });
    } catch (error) {
        console.error('❌ Erreur question suivante:', error);
        res.status(500).json({ error: error.message });
    }
});


// Fonction pour calculer la répartition des questions par difficulté
function getQuestionDistribution(totalQuestions) {
    return {
        veryeasy: Math.round(totalQuestions * 0.10),
        easy: Math.round(totalQuestions * 0.20),
        medium: Math.round(totalQuestions * 0.30),
        hard: Math.round(totalQuestions * 0.20),
        veryhard: Math.round(totalQuestions * 0.10),
        extreme: Math.round(totalQuestions * 0.10)
    };
}

// Fonction pour révéler les réponses
function revealAnswers(correctAnswer) {
    // 🆕 Si tiebreaker rivalry en cours, ne pas interférer
    if (gameState.isRivalryTiebreaker) {
        console.log('⚠️ revealAnswers ignoré : tiebreaker rivalry en cours');
        return;
    }
    
    const stats = {
        correct: 0,
        wrong: 0,
        afk: 0,
        livesDistribution: { 3: 0, 2: 0, 1: 0, 0: 0 }
    };

    let eliminatedThisRound = 0;
    const playersDetails = [];

    // 🔥 FIX: Si tiebreaker, utiliser la fonction dédiée
    if (gameState.isTiebreaker) {
        revealTiebreakerAnswers(correctAnswer);
        return;
    }

    // Mode Points: calculer les scores
    if (gameState.mode === 'points') {
        gameState.players.forEach((player, socketId) => {
            const playerAnswer = gameState.answers.get(socketId);
            let isCorrect = false;
            let status = 'afk';

            if (!playerAnswer) {
                stats.afk++;
                status = 'afk';
            } else if (playerAnswer.answer === correctAnswer) {
                stats.correct++;

                // 🆕 Appliquer le multiplicateur x2 si bonus actif
                let pointsEarned = getPointsForDifficulty(gameState.currentQuestion.difficulty);
                if (playerAnswer.bonusActive === 'doublex2') { // ✅ BON
                    pointsEarned *= 2;
                    console.log(`💰 ${player.username} : Points x2 appliqué ! ${pointsEarned} points`);
                }

                player.points = (player.points || 0) + pointsEarned;

                isCorrect = true;
                status = 'correct';

                // 🆕 Incrémenter le combo
                updatePlayerCombo(socketId);
            } else {
                stats.wrong++;
                status = 'wrong';
            }

            playersDetails.push({
                socketId: socketId,
                username: player.username,
                lives: player.lives,
                points: player.points || 0,
                status: status,
                responseTime: playerAnswer?.time || null,
                isCorrect: isCorrect,
                selectedAnswer: playerAnswer?.answer ? gameState.currentQuestion.answers[playerAnswer.answer - 1] : null,
                pointsEarned: isCorrect ? getPointsForDifficulty(gameState.currentQuestion.difficulty) : 0, // 🔥 NOUVEAU
                team: player.team || null // 🆕 Équipe du joueur
            });
        });
    } else {
        // Mode Vie - Logique originale
        const alivePlayers = getAlivePlayers();
        const allHaveOneLife = alivePlayers.every(p => p.lives === 1);
        let allWillLose = false;

        if (allHaveOneLife && alivePlayers.length > 1) {
            // Vérifier si quelqu'un a répondu correctement
            const someoneCorrect = Array.from(alivePlayers).some(player => {
                const playerAnswer = gameState.answers.get(player.socketId);
                return playerAnswer && playerAnswer.answer === correctAnswer;
            });

            // 🔥 NOUVEAU : Vérifier si quelqu'un a un Shield actif
            const someoneHasShield = Array.from(alivePlayers).some(player => {
                return player.activeShield === true;
            });

            // Si personne n'a répondu juste ET personne n'a de Shield → Tous vont perdre
            allWillLose = !someoneCorrect && !someoneHasShield;
        }

        gameState.players.forEach((player, socketId) => {
            let status = 'afk';
            let isCorrect = false;
            const playerAnswer = gameState.answers.get(socketId);

            // 🔥 FIX SHIELD + AFK: Vérifier le Shield dans les données du joueur
            const hasShield = player.activeShield === true;

            console.log(`🔍 ${player.username} (${socketId}):`);
            console.log(`   - playerAnswer:`, playerAnswer);
            console.log(`   - bonusActive (answer):`, playerAnswer?.bonusActive);
            console.log(`   - activeShield (player):`, player.activeShield);
            console.log(`   - hasShield:`, hasShield);

            if (player.lives === 0) {
                stats.livesDistribution[0]++;
                status = 'eliminated';
            } else if (!playerAnswer) {
                stats.afk++;
                if (!allWillLose) {
                    // 🛡️ Shield protège contre l'AFK
                    if (hasShield) {
                        console.log(`🛡️ ${player.username} protégé par le Bouclier (AFK)`);
                        status = 'afk-shielded';
                        player.activeShield = false; // ✅ Consommer le Shield
                    } else {
                        player.lives--;
                        if (player.lives === 0) {
                            eliminatedThisRound++;
                            addLog('eliminated', {
                                username: player.username,
                                playerColor: playerColors[player.username]
                            });
                        }
                        status = 'afk';
                    }
                } else {
                    status = 'afk';
                }
            } else if (playerAnswer.answer === correctAnswer) {
                stats.correct++;
                player.correctAnswers++;
                status = 'correct';
                isCorrect = true;

                // 🔥 Ne pas consommer le Shield si bonne réponse
                if (hasShield) {
                    player.activeShield = false; // ✅ Retirer le Shield (pas utilisé)
                    console.log(`🛡️ Shield retiré (bonne réponse, non utilisé)`);
                }

                updatePlayerCombo(socketId);

            } else {
                stats.wrong++;
                if (!allWillLose) {
                    // 🛡️ Shield protège contre la mauvaise réponse
                    if (hasShield) {
                        console.log(`🛡️ ${player.username} protégé par Shield (mauvaise réponse)`);
                        status = 'wrong-shielded';
                        player.activeShield = false; // ✅ Consommer le Shield
                    } else {
                        player.lives--;
                        if (player.lives === 0) {
                            eliminatedThisRound++;
                            addLog('eliminated', {
                                username: player.username,
                                playerColor: playerColors[player.username]
                            });
                        }
                        status = 'wrong';
                    }
                } else {
                    status = 'wrong';
                }
            }

            if (player.lives > 0 || status !== 'eliminated') {
                stats.livesDistribution[player.lives]++;
            }

            playersDetails.push({
                socketId: socketId,
                username: player.username,
                lives: player.lives,
                points: player.points || 0,
                status: status,
                responseTime: playerAnswer?.time || null,
                isCorrect: isCorrect,
                selectedAnswer: playerAnswer?.answer ? gameState.currentQuestion.answers[playerAnswer.answer - 1] : null,
                shieldUsed: hasShield, // 🔥 Indiquer si le Shield a été utilisé
                team: player.team || null // 🆕 Équipe du joueur
            });
        });


    }

    const alivePlayersAfter = gameState.mode === 'points'
        ? Array.from(gameState.players.values())
        : getAlivePlayers();

    const playersData = Array.from(gameState.players.values()).map(player => ({
        twitchId: player.twitchId,
        username: player.username,
        lives: player.lives,
        correctAnswers: player.correctAnswers,
        points: player.points || 0,
        isLastGlobalWinner: player.twitchId === lastGlobalWinner,
        team: player.team || null, // 🆕 Équipe du joueur
        avatarUrl: player.avatarUrl || null
    }));

    let fastestPlayer = null;
    playersDetails.forEach(p => {
        if (p.isCorrect && p.responseTime !== null) {
            if (!fastestPlayer || p.responseTime < fastestPlayer.time) {
                fastestPlayer = {
                    username: p.username,
                    socketId: p.socketId, // 🆕 Ajouter socketId pour identifier le premier
                    time: p.responseTime
                };
            }
        }
    });

    // 🆕 BONUS RAPIDITÉ : +500 points au joueur le plus rapide (mode points uniquement)
    if (gameState.mode === 'points' && gameState.speedBonus && fastestPlayer) {
        const SPEED_BONUS_POINTS = 500;
        
        // Mettre à jour les points du joueur dans gameState
        const player = gameState.players.get(fastestPlayer.socketId);
        if (player) {
            player.points = (player.points || 0) + SPEED_BONUS_POINTS;
            console.log(`⚡ Bonus rapidité: ${fastestPlayer.username} +${SPEED_BONUS_POINTS} pts (total: ${player.points})`);
            
            // Mettre à jour playersDetails pour les résultats
            const playerDetail = playersDetails.find(p => p.socketId === fastestPlayer.socketId);
            if (playerDetail) {
                playerDetail.points = player.points;
                playerDetail.speedBonus = SPEED_BONUS_POINTS;
                // 🔥 IMPORTANT: Ajouter le bonus à pointsEarned pour le calcul côté client
                playerDetail.pointsEarned = (playerDetail.pointsEarned || 0) + SPEED_BONUS_POINTS;
            }
            
            // Notifier le joueur du bonus (juste pour la notification)
            const socket = io.sockets.sockets.get(fastestPlayer.socketId);
            if (socket) {
                socket.emit('speed-bonus', { 
                    points: SPEED_BONUS_POINTS
                });
            }
        }
        
        // Ajouter l'info au fastestPlayer pour l'affichage
        fastestPlayer.speedBonus = SPEED_BONUS_POINTS;
    }

    // 🆕 DÉFIS : Vérifier les défis pour chaque joueur
    const currentDifficulty = gameState.currentQuestion?.difficulty || 'medium';
    const currentSeries = gameState.currentQuestion?.serie || '';
    
    playersDetails.forEach(p => {
        const playerAnswer = gameState.answers.get(p.socketId);
        if (!playerAnswer) return;
        
        const answerData = {
            correct: p.isCorrect,
            responseTime: p.responseTime || 999999,
            difficulty: currentDifficulty,
            series: currentSeries,
            isFirst: fastestPlayer && fastestPlayer.socketId === p.socketId
        };
        
        const completedChallenges = checkChallenges(p.socketId, answerData);
        
        // Si des défis sont complétés, ajouter les bonus à l'inventaire
        if (completedChallenges.length > 0) {
            const bonusData = gameState.playerBonuses.get(p.socketId);
            if (bonusData) {
                completedChallenges.forEach(({ reward }) => {
                    bonusData.bonusInventory[reward]++;
                    console.log(`🎁 Bonus ${reward} ajouté à ${p.username} (total: ${bonusData.bonusInventory[reward]})`);
                });
                
                // Envoyer mise à jour des bonus au joueur
                const socket = io.sockets.sockets.get(p.socketId);
                if (socket) {
                    socket.emit('combo-updated', {
                        comboLevel: bonusData.comboLevel,
                        comboProgress: bonusData.comboProgress,
                        bonusInventory: bonusData.bonusInventory
                    });
                }
            }
        }
        
        // Envoyer mise à jour des défis au joueur
        const socket = io.sockets.sockets.get(p.socketId);
        if (socket) {
            socket.emit('challenges-updated', {
                challenges: getPlayerChallengesState(p.socketId),
                completedChallenges: completedChallenges
            });
        }
    });

    // 🆕 Mettre à jour les scores d'équipe en mode Rivalité
    if (gameState.lobbyMode === 'rivalry') {
        updateTeamScores();
    }

    const resultsData = {
        correctAnswer,
        stats,
        eliminatedCount: eliminatedThisRound,
        remainingPlayers: alivePlayersAfter.length,
        players: playersDetails,
        playersData: playersData,
        gameMode: gameState.mode,
        fastestPlayer: fastestPlayer,
        // 🆕 Données équipe pour mode Rivalité
        lobbyMode: gameState.lobbyMode,
        teamScores: gameState.lobbyMode === 'rivalry' ? gameState.teamScores : null,
        teamNames: gameState.lobbyMode === 'rivalry' ? gameState.teamNames : null,
        // 🆕 Flag dernière question (mode points) → client désactive le bouton "Suivant"
        isLastQuestion: gameState.mode === 'points' && gameState.currentQuestionIndex >= gameState.questionsCount,
    };

    gameState.showResults = true;
    gameState.lastQuestionResults = resultsData;

    io.emit('question-results', resultsData);

    // Vérifier fin de partie selon le mode
    if (gameState.mode === 'lives') {
        // Recalculer les joueurs en vie APRÈS les mises à jour
        const currentAlivePlayers = getAlivePlayers();
        console.log(`🔍 Joueurs en vie après cette question: ${currentAlivePlayers.length}`);

        // 🆕 MODE RIVALITÉ : Vérifier si une équipe est éliminée
        if (gameState.lobbyMode === 'rivalry') {
            const rivalryWinner = checkRivalryWinner();
            if (rivalryWinner && rivalryWinner !== 'draw') {
                console.log(`🏆 Fin de partie Rivalité - Équipe gagnante: Team ${rivalryWinner} (${gameState.teamNames[rivalryWinner]})`);
                endGameRivalry(rivalryWinner);
                return;
            } else if (rivalryWinner === 'draw') {
                console.log(`⚖️ Égalité en mode Rivalité - Les deux équipes éliminées`);
                endGameRivalry('draw');
                return;
            }
        } else {
            // Mode classique
            if (currentAlivePlayers.length <= 1) {
                // 0 ou 1 joueur restant = fin de partie
                const winner = currentAlivePlayers.length === 1 ? currentAlivePlayers[0] : null;
                console.log(`🏁 Fin de partie mode vie - Gagnant: ${winner ? winner.username : 'Aucun'}`);
                endGame(winner);
                return; // 🔥 IMPORTANT: Arrêter ici pour ne pas continuer avec le mode auto
            }
        }
    } else if (gameState.mode === 'points' && gameState.currentQuestionIndex >= gameState.questionsCount) {
        // 🆕 MODE RIVALITÉ : Fin par points
        if (gameState.lobbyMode === 'rivalry') {
            gameState.endingGame = true;  // 🆕 Bloque /admin/next-question pendant le délai
            gameState.rivalryEndGameTimeout = setTimeout(() => {
                endGameRivalryPoints();
            }, 100); // 🔥 FIX: Afficher le winner directement (comme en classique)
            return; // 🆕 IMPORTANT: Arrêter pour ne pas continuer avec le mode auto
        } else {
            // Terminer automatiquement après la dernière question
            gameState.endingGame = true;  // 🆕 Bloque /admin/next-question pendant le délai
            setTimeout(() => {
                endGameByPoints();
            }, 100);
        }
    }


    // 🆕 MODE AUTO : Passer automatiquement à la question suivante après 3s
    if (gameState.autoMode && gameState.inProgress) {
        // 🆕 Ne pas interférer avec les tiebreakers (ils ont leur propre logique)
        if (gameState.isTiebreaker || gameState.isRivalryTiebreaker) {
            console.log('⏱️ Mode Auto : Tiebreaker en cours, pas d\'interférence');
            return;
        }
        
        console.log('⏱️ Mode Auto : Question suivante dans 3s...');

        // Annuler le timeout précédent si existant
        if (gameState.autoModeTimeout) {
            clearTimeout(gameState.autoModeTimeout);
        }

        gameState.autoModeTimeout = setTimeout(async () => {
            if (!gameState.inProgress) return; // Sécurité : vérifier que la partie est toujours en cours
            
            // 🆕 Double vérification tiebreaker
            if (gameState.isTiebreaker || gameState.isRivalryTiebreaker) return;

            console.log('🤖 Mode Auto : Passage automatique à la question suivante');

            // 🔥 FIX TIEBREAKER: Si tiebreaker, lancer une question EXTREME
            if (gameState.isTiebreaker) {
                await sendTiebreakerQuestion();
                return;
            }

            // Logique normale (copie de /admin/next-question)
            gameState.currentQuestionIndex++;

            // Vérifier si on a atteint le nombre max de questions en mode Points
            if (gameState.mode === 'points' && gameState.currentQuestionIndex > gameState.questionsCount) {
                endGameByPoints();
                return;
            }

            try {
                const difficulty = getDifficultyForQuestion(gameState.currentQuestionIndex);

                // 🔥 FIX: AJOUTER gameState.serieFilter (c'était probablement déjà là, mais vérifie bien)
                console.log(`🔍 [Mode Auto Timer] Filtre série: ${gameState.serieFilter}`); // 🔥 NOUVEAU LOG

                const questions = await db.getRandomQuestions(
                    difficulty,
                    1,
                    gameState.usedQuestionIds,
                    gameState.serieFilter,
                    shouldApplySerieCooldown() ? gameState.recentSeries : [],  // 🆕
                    gameState.noSpoil  // 🚫 Filtre anti-spoil
                );

                if (questions.length === 0) {
                    console.error('❌ Aucune question disponible (mode auto)');
                    return;
                }

                const question = questions[0];
                addToRecentSeries(question.serie);
                gameState.usedQuestionIds.push(question.id);

                console.log(`📌 Question ${gameState.currentQuestionIndex}/${gameState.mode === 'points' ? gameState.questionsCount : '∞'} - Difficulté: ${difficulty}`);

                // Préparer les réponses
                const allAnswers = [
                    { text: question.answer1, index: 1 },
                    { text: question.answer2, index: 2 },
                    { text: question.answer3, index: 3 },
                    { text: question.answer4, index: 4 },
                    { text: question.answer5, index: 5 },
                    { text: question.answer6, index: 6 }
                ].filter(answer => answer.text !== null && answer.text !== '');

                const correctAnswerObj = allAnswers.find(a => a.index === question.coanswer);
                const wrongAnswers = allAnswers.filter(a => a.index !== question.coanswer);
                const wrongAnswersNeeded = gameState.answersCount - 1;
                const shuffledWrong = wrongAnswers.sort(() => 0.5 - Math.random()).slice(0, wrongAnswersNeeded);
                const selectedAnswers = [correctAnswerObj, ...shuffledWrong];
                const finalAnswers = selectedAnswers.sort(() => 0.5 - Math.random());
                const newCorrectIndex = finalAnswers.findIndex(a => a.index === question.coanswer) + 1;

                const questionData = {
                    questionNumber: gameState.currentQuestionIndex,
                    totalQuestions: gameState.mode === 'points' ? gameState.questionsCount : null,
                    questionId: question.id,
                    question: question.question,
                    answers: finalAnswers.map(a => a.text),
                    serie: question.serie,
                    difficulty: question.difficulty,
                    timeLimit: gameState.questionTime,
                    proof_url: question.proof_url || null
                };

                gameState.currentQuestion = {
                    ...questionData,
                    correctAnswer: newCorrectIndex,
                    difficulty: question.difficulty
                };

                gameState.questionStartTime = Date.now();
                gameState.showResults = false;
                gameState.lastQuestionResults = null;
                gameState.answers.clear();

                addLog('question', {
                    questionNumber: gameState.currentQuestionIndex,
                    difficulty: difficulty,
                    series: question.serie
                });

                // 🔥 Animation de fermeture avant la nouvelle question
                io.emit('prepare-next-question');
                await new Promise(resolve => setTimeout(resolve, 400));

                io.emit('new-question', questionData);

                setTimeout(() => {
                    if (gameState.inProgress) {
                        revealAnswers(newCorrectIndex);
                    }
                }, gameState.questionTime * 1000);

            } catch (error) {
                console.error('❌ Erreur mode auto:', error);
            }
        }, 5000); // 3 secondes
    }
}


function getPointsForDifficulty(difficulty) {
    const pointsMap = {
        'veryeasy': 500,
        'easy': 1000,
        'medium': 1500,
        'hard': 2000,
        'veryhard': 2500,
        'extreme': 3000
    };

    return pointsMap[difficulty] || 1000; // Défaut 1000 si difficulté inconnue
}

// 🔥 FIX TIEBREAKER: Fonction dédiée pour révéler les résultats du tiebreaker
function revealTiebreakerAnswers(correctAnswer) {
    console.log('⚔️ Révélation résultats tiebreaker');

    const stats = {
        correct: 0,
        wrong: 0,
        afk: 0
    };

    const playersDetails = [];

    // 🔥 FIX: Analyser TOUS les joueurs ET incrémenter TOUS les points
    gameState.players.forEach((player, socketId) => {
        const playerAnswer = gameState.answers.get(socketId);
        let isCorrect = false;
        let status = 'spectator';

        // Vérifier si le joueur est en tiebreaker (pour l'affichage visuel uniquement)
        const isInTiebreaker = gameState.tiebreakerPlayers.includes(player.twitchId);

        // 🔥 FIX: Traiter la réponse de TOUS les joueurs, pas seulement ceux en tiebreaker
        if (!playerAnswer) {
            stats.afk++;
            status = 'afk';
        } else if (playerAnswer.answer === correctAnswer) {
            stats.correct++;

            // 🔥 Tiebreaker = toujours EXTREME = 3000 points
            const pointsEarned = 3000;
            player.points = (player.points || 0) + pointsEarned;

            isCorrect = true;
            status = 'correct';
        } else {
            stats.wrong++;
            status = 'wrong';
        }

        playersDetails.push({
            socketId: socketId,
            username: player.username,
            points: player.points || 0,
            status: status,
            responseTime: playerAnswer?.time || null,
            isCorrect: isCorrect,
            isInTiebreaker: isInTiebreaker,
            pointsEarned: isCorrect ? 3000 : 0 // 🔥 NOUVEAU (toujours 3000 en tiebreaker)
        });
    });

    const playersData = Array.from(gameState.players.values()).map(player => ({
        twitchId: player.twitchId,
        username: player.username,
        points: player.points || 0,
        isLastGlobalWinner: player.twitchId === lastGlobalWinner,
        avatarUrl: player.avatarUrl || null
    }));

    const resultsData = {
        correctAnswer: correctAnswer,
        stats: stats,
        players: playersDetails,
        playersData: playersData,
        gameMode: 'points',
        isTiebreaker: true,
        remainingPlayers: gameState.tiebreakerPlayers.length
    };

    gameState.showResults = true;
    gameState.lastQuestionResults = resultsData;

    io.emit('question-results', resultsData);

    console.log(`⚔️ Résultats tiebreaker: ${stats.correct} bonne(s) réponse(s), ${stats.wrong} mauvaise(s), ${stats.afk} AFK`);

    // 🔥 FIX: Vérifier IMMÉDIATEMENT le gagnant
    setTimeout(async () => {
        await checkTiebreakerWinner();
    }, 100);
}


// Fonction pour terminer une partie en mode Points
async function endGameByPoints() {
    const duration = Math.floor((Date.now() - gameState.gameStartTime) / 1000);

    try {
        // Trier les joueurs par points (décroissant)
        const sortedPlayers = Array.from(gameState.players.values())
            .sort((a, b) => (b.points || 0) - (a.points || 0));

        // Détecter les égalités
        const maxPoints = sortedPlayers[0]?.points || 0;
        const winners = sortedPlayers.filter(p => p.points === maxPoints);

        // CAS 1: UN SEUL GAGNANT
        if (winners.length === 1) {
            const winner = winners[0];
            lastGlobalWinner = winner.twitchId;

            if (winner && winner.points > 0) {
                addLog('game-end', { winner: winner.username });

                const rewardsData = null;

                const winnerData = {
                    username: winner.username,
                    points: winner.points || 0
                };

                console.log(`🏆 Gagnant: ${winner.username} avec ${winner.points} points`);

                // Créer le podium Top 3
                const podium = sortedPlayers.slice(0, 3).map((player, index) => ({
                    rank: index + 1,
                    username: player.username,
                    points: player.points || 0,
                    avatarUrl: player.avatarUrl || null
                }));

                const { playersData, topPlayers } = await generateGameEndedData();
                
                // 🔥 Sauvegarder les données de la dernière question AVANT le reset
                const lastQuestionPlayers = getLastQuestionPlayersData();

                winnerScreenData = {
                    winner: winnerData,
                    podium: podium,
                    duration,
                    totalQuestions: gameState.currentQuestionIndex,
                    gameMode: 'points',
                    playersData,
                    topPlayers,
                    livesIcon: gameState.livesIcon,
                    lastQuestionPlayers,
                    rewardsData
                };

                emitGameEnded({
                    winner: winnerData,
                    podium: podium,
                    duration,
                    totalQuestions: gameState.currentQuestionIndex,
                    gameMode: 'points',
                    playersData,
                    topPlayers,
                    lastQuestionPlayers,
                    rewardsData
                });

                // Reset complet
                resetGameState();
            }
        }
        // CAS 2: ÉGALITÉ → QUESTION DE DÉPARTAGE
        else {
            console.log(`⚖️ ÉGALITÉ: ${winners.length} joueurs avec ${maxPoints} points → Question de départage !`);

            // Stocker les twitchId
            gameState.isTiebreaker = true;
            gameState.tiebreakerPlayers = winners.map(w => w.twitchId);

            addLog('tiebreaker', { playerCount: winners.length });

            io.emit('tiebreaker-announced', {
                tiebreakerPlayers: winners.map(w => ({
                    twitchId: w.twitchId,
                    username: w.username,
                    points: w.points
                })),
                message: '⚖️ Égalité ! Question de départage...'
            });

            console.log('⚠️ En attente que l\'admin lance la question de départage...');
        }

    } catch (error) {
        console.error('❌ Erreur fin de partie (Mode Points):', error);
    }
}


// FONCTION: Envoyer une question de départage (EXTREME)
async function sendTiebreakerQuestion() {
    try {
        gameState.currentQuestionIndex++;

        // Toujours prendre une question EXTREME pour le tiebreaker
        const difficulty = 'extreme';

        const questions = await db.getRandomQuestions(
            difficulty,
            1,
            gameState.usedQuestionIds,
            gameState.serieFilter,
            shouldApplySerieCooldown() ? gameState.recentSeries : [],  // 🆕
            gameState.noSpoil  // 🚫 Filtre anti-spoil
        );


        if (questions.length === 0) {
            console.error('❌ Aucune question extreme disponible pour tiebreaker');
            // Fallback: terminer avec égalité
            await endGameWithTie();
            return;
        }

        const question = questions[0];
        addToRecentSeries(question.serie);
        gameState.usedQuestionIds.push(question.id);

        console.log(`⚔️ Question de départage ${gameState.currentQuestionIndex} - Difficulté: EXTREME`);

        // Préparer les réponses
        const allAnswers = [
            { text: question.answer1, index: 1 },
            { text: question.answer2, index: 2 },
            { text: question.answer3, index: 3 },
            { text: question.answer4, index: 4 },
            { text: question.answer5, index: 5 },
            { text: question.answer6, index: 6 }
        ].filter(answer => answer.text !== null && answer.text !== '');

        const correctAnswerObj = allAnswers.find(a => a.index === question.coanswer);
        const wrongAnswers = allAnswers.filter(a => a.index !== question.coanswer);
        const wrongAnswersNeeded = gameState.answersCount - 1;
        const shuffledWrong = wrongAnswers.sort(() => 0.5 - Math.random()).slice(0, wrongAnswersNeeded);
        const selectedAnswers = [correctAnswerObj, ...shuffledWrong];
        const finalAnswers = selectedAnswers.sort(() => 0.5 - Math.random());
        const newCorrectIndex = finalAnswers.findIndex(a => a.index === question.coanswer) + 1;

        const questionData = {
            questionNumber: gameState.currentQuestionIndex,
            totalQuestions: null,
            questionId: question.id,
            question: question.question,
            answers: finalAnswers.map(a => a.text),
            serie: question.serie,
            difficulty: 'TIEBREAKER - EXTREME',
            timeLimit: gameState.questionTime,
            isTiebreaker: true,
            proof_url: question.proof_url || null
        };

        gameState.currentQuestion = {
            ...questionData,
            correctAnswer: newCorrectIndex
        };

        gameState.questionStartTime = Date.now();
        gameState.showResults = false;
        gameState.lastQuestionResults = null;
        gameState.answers.clear();

        addLog('question', {
            questionNumber: gameState.currentQuestionIndex,
            difficulty: 'TIEBREAKER - EXTREME',
            series: question.serie
        });

        // Envoyer la question à TOUS les joueurs
        io.emit('new-question', questionData);

        // 🔥 FIX: Attendre la fin du timer PUIS révéler
        setTimeout(() => {
            if (gameState.inProgress && gameState.isTiebreaker) {
                revealTiebreakerAnswers(newCorrectIndex);
            }
        }, gameState.questionTime * 1000);

    } catch (error) {
        console.error('❌ Erreur question tiebreaker:', error);
    }
}

// 🔥 FIX TIEBREAKER: Fonction pour vérifier si on a un gagnant
async function checkTiebreakerWinner() {
    console.log('🔍 Vérification gagnant tiebreaker...');

    // 🆕 FIX: Récupérer TOUS les joueurs et les trier par points
    const allPlayersSorted = Array.from(gameState.players.values())
        .sort((a, b) => (b.points || 0) - (a.points || 0));

    if (allPlayersSorted.length === 0) {
        console.error('❌ Aucun joueur trouvé');
        return;
    }

    // 🆕 FIX: Le max points peut avoir changé (un joueur a pu rattraper)
    const maxPoints = allPlayersSorted[0]?.points || 0;
    const stillTied = allPlayersSorted.filter(p => p.points === maxPoints);

    console.log(`📊 Max points: ${maxPoints}, Joueurs à ${maxPoints} pts: ${stillTied.length}`);

    // 🆕 FIX: Mettre à jour la liste des joueurs en tiebreaker (peut avoir changé)
    gameState.tiebreakerPlayers = stillTied.map(p => p.twitchId);

    if (stillTied.length === 1) {
        // 🎉 UN GAGNANT !
        const winner = stillTied[0];
        console.log(`🏆 Tiebreaker terminé: ${winner.username} gagne avec ${winner.points} points !`);

        gameState.isTiebreaker = false;
        gameState.tiebreakerPlayers = [];

        // Terminer la partie avec ce gagnant
        const duration = Math.floor((Date.now() - gameState.gameStartTime) / 1000);

        try {
            const winnerData = {
                username: winner.username,
                points: winner.points || 0
            };

            // Créer le podium Top 3
            const allPlayersSorted = Array.from(gameState.players.values())
                .sort((a, b) => (b.points || 0) - (a.points || 0));
            const podium = allPlayersSorted.slice(0, 3).map((player, index) => ({
                rank: index + 1,
                username: player.username,
                points: player.points || 0,
                avatarUrl: player.avatarUrl || null
            }));

            const { playersData, topPlayers } = await generateGameEndedData();
            
            // 🔥 Sauvegarder les données de la dernière question AVANT le reset
            const lastQuestionPlayers = getLastQuestionPlayersData();

            winnerScreenData = {
                winner: winnerData,
                podium: podium,
                duration,
                totalQuestions: gameState.currentQuestionIndex,
                gameMode: 'points',
                playersData,
                topPlayers,
                livesIcon: gameState.livesIcon,
                lastQuestionPlayers
            };


            emitGameEnded({
                winner: winnerData,
                podium: podium,
                duration,
                totalQuestions: gameState.currentQuestionIndex,
                gameMode: 'points',
                playersData,
                topPlayers,
                lastQuestionPlayers
            });

            // Reset complet
            resetGameState();

            console.log('✅ Partie terminée après tiebreaker');
        } catch (error) {
            console.error('❌ Erreur fin de partie après tiebreaker:', error);
        }
    } else {
        // ⚔️ ENCORE ÉGALITÉ
        console.log(`⚖️ Toujours ${stillTied.length} joueurs à égalité avec ${maxPoints} points`);

        gameState.tiebreakerPlayers = stillTied.map(p => p.twitchId);

        io.emit('tiebreaker-continues', {
            tiebreakerPlayers: stillTied.map(p => ({
                twitchId: p.twitchId,
                username: p.username,
                points: p.points
            })),
            message: '⚖️ Encore égalité ! Cliquez sur "Question suivante"'
        });

        console.log('⚠️ En attente que l\'admin lance la prochaine question de départage...');
    }
}

// 🆕 RIVALRY TIEBREAKER: Envoyer une question de départage entre équipes
async function sendRivalryTiebreakerQuestion() {
    try {
        gameState.currentQuestionIndex++;

        // Difficulté selon le mode choisi
        let difficulty;
        if (gameState.difficultyMode === 'croissante') {
            difficulty = 'extreme';
        } else {
            // Mode aléatoire : choisir une difficulté au hasard
            const difficulties = ['easy', 'medium', 'hard', 'extreme'];
            difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
        }

        const questions = await db.getRandomQuestions(
            difficulty,
            1,
            gameState.usedQuestionIds,
            gameState.serieFilter,
            shouldApplySerieCooldown() ? gameState.recentSeries : [],
            gameState.noSpoil  // 🚫 Filtre anti-spoil
        );

        if (questions.length === 0) {
            console.error('❌ Aucune question disponible pour tiebreaker rivalry');
            // Fallback: terminer avec égalité
            await endRivalryWithTie();
            return;
        }

        const question = questions[0];
        addToRecentSeries(question.serie);
        gameState.usedQuestionIds.push(question.id);

        console.log(`⚔️ Question de départage Rivalry #${gameState.currentQuestionIndex} - Difficulté: ${difficulty.toUpperCase()}`);

        // Préparer les réponses
        const allAnswers = [
            { text: question.answer1, index: 1 },
            { text: question.answer2, index: 2 },
            { text: question.answer3, index: 3 },
            { text: question.answer4, index: 4 },
            { text: question.answer5, index: 5 },
            { text: question.answer6, index: 6 }
        ].filter(answer => answer.text !== null && answer.text !== '');

        const correctAnswerObj = allAnswers.find(a => a.index === question.coanswer);
        const wrongAnswers = allAnswers.filter(a => a.index !== question.coanswer);
        const wrongAnswersNeeded = gameState.answersCount - 1;
        const shuffledWrong = wrongAnswers.sort(() => 0.5 - Math.random()).slice(0, wrongAnswersNeeded);
        const selectedAnswers = [correctAnswerObj, ...shuffledWrong];
        const finalAnswers = selectedAnswers.sort(() => 0.5 - Math.random());
        const newCorrectIndex = finalAnswers.findIndex(a => a.index === question.coanswer) + 1;

        const questionData = {
            questionNumber: gameState.currentQuestionIndex,
            totalQuestions: null,
            questionId: question.id,
            question: question.question,
            answers: finalAnswers.map(a => a.text),
            serie: question.serie,
            difficulty: `DÉPARTAGE - ${difficulty.toUpperCase()}`,
            timeLimit: gameState.questionTime,
            isRivalryTiebreaker: true,
            proof_url: question.proof_url || null
        };

        gameState.currentQuestion = {
            ...questionData,
            correctAnswer: newCorrectIndex
        };

        gameState.questionStartTime = Date.now();
        gameState.showResults = false;
        gameState.lastQuestionResults = null;
        gameState.answers.clear();

        addLog('question', {
            questionNumber: gameState.currentQuestionIndex,
            difficulty: `DÉPARTAGE - ${difficulty.toUpperCase()}`,
            series: question.serie
        });

        // Envoyer la question à TOUS les joueurs
        io.emit('new-question', questionData);

        // 🆕 Annuler l'ancien timeout de révélation si existant
        if (gameState.rivalryRevealTimeout) {
            clearTimeout(gameState.rivalryRevealTimeout);
        }

        // Attendre la fin du timer PUIS révéler et vérifier
        gameState.rivalryRevealTimeout = setTimeout(() => {
            if (gameState.inProgress && gameState.isRivalryTiebreaker) {
                revealRivalryTiebreakerAnswers(newCorrectIndex);
            }
        }, gameState.questionTime * 1000);

    } catch (error) {
        console.error('❌ Erreur question tiebreaker rivalry:', error);
    }
}

// 🆕 RIVALRY TIEBREAKER: Révéler les réponses et calculer les scores
async function revealRivalryTiebreakerAnswers(correctAnswer) {
    console.log('⚔️ Révélation résultats tiebreaker Rivalry');
    
    // 🆕 Marquer qu'on est en phase de résultats
    gameState.showResults = true;

    const results = {
        correctAnswer,
        players: [],
        stats: { correct: 0, wrong: 0, afk: 0 }
    };

    // Calculer les points pour chaque joueur (utiliser socketId comme clé)
    gameState.players.forEach((player, socketId) => {
        const playerAnswer = gameState.answers.get(socketId);
        
        let isCorrect = false;
        let pointsEarned = 0;

        if (playerAnswer) {
            isCorrect = playerAnswer.answer === correctAnswer;
            if (isCorrect) {
                pointsEarned = 3000; // Points fixes pour tiebreaker
                player.points = (player.points || 0) + pointsEarned;
                results.stats.correct++;
                console.log(`✅ ${player.username} (Team ${player.team}) +3000 pts = ${player.points}`);
            } else {
                results.stats.wrong++;
                console.log(`❌ ${player.username} (Team ${player.team}) mauvaise réponse`);
            }
        } else {
            results.stats.afk++;
            console.log(`⏸️ ${player.username} (Team ${player.team}) AFK`);
        }

        results.players.push({
            socketId: socketId,
            twitchId: player.twitchId,
            username: player.username,
            answer: playerAnswer?.answer || null,
            isCorrect,
            pointsEarned,
            totalPoints: player.points || 0,
            team: player.team
        });
    });

    // Recalculer les scores d'équipe
    updateTeamScores();

    // Envoyer les résultats
    io.emit('question-results', {
        correctAnswer,
        players: results.players,
        stats: results.stats,
        teamScores: gameState.teamScores,
        isRivalryTiebreaker: true
    });

    console.log(`⚔️ Scores après tiebreaker: Team A = ${gameState.teamScores[1]}, Team B = ${gameState.teamScores[2]}`);

    // Vérifier si on a un gagnant
    await checkRivalryTiebreakerWinner();
}

// 🆕 RIVALRY TIEBREAKER: Vérifier si une équipe a pris l'avantage
async function checkRivalryTiebreakerWinner() {
    const team1Score = gameState.teamScores[1];
    const team2Score = gameState.teamScores[2];

    console.log(`🔍 Vérification gagnant tiebreaker Rivalry: ${team1Score} vs ${team2Score}`);
    console.log(`🔍 État: inProgress=${gameState.inProgress}, isRivalryTiebreaker=${gameState.isRivalryTiebreaker}`);

    if (team1Score !== team2Score) {
        // 🎉 UNE ÉQUIPE GAGNE !
        const winningTeam = team1Score > team2Score ? 1 : 2;
        console.log(`🏆 Tiebreaker Rivalry terminé: ${gameState.teamNames[winningTeam]} gagne avec ${gameState.teamScores[winningTeam]} points !`);

        // 🆕 Annuler TOUS les timeouts
        if (gameState.rivalryTiebreakerTimeout) {
            clearTimeout(gameState.rivalryTiebreakerTimeout);
            gameState.rivalryTiebreakerTimeout = null;
            console.log('⏹️ rivalryTiebreakerTimeout annulé');
        }
        if (gameState.rivalryRevealTimeout) {
            clearTimeout(gameState.rivalryRevealTimeout);
            gameState.rivalryRevealTimeout = null;
            console.log('⏹️ rivalryRevealTimeout annulé');
        }
        if (gameState.autoModeTimeout) {
            clearTimeout(gameState.autoModeTimeout);
            gameState.autoModeTimeout = null;
            console.log('⏹️ autoModeTimeout annulé');
        }
        
        gameState.isRivalryTiebreaker = false;
        console.log('✅ isRivalryTiebreaker = false');

        // Terminer la partie normalement
        const duration = Math.floor((Date.now() - gameState.gameStartTime) / 1000);

        const teamData = {
            team: winningTeam,
            teamName: gameState.teamNames[winningTeam],
            points: gameState.teamScores[winningTeam],
            isDraw: false
        };

        addLog('game-end', { winner: teamData.teamName, mode: 'rivalry-points-tiebreaker' });

        // 🔥 Préparer les données AVANT les appels DB
        const playersData = Array.from(gameState.players.values()).map(p => ({
            twitchId: p.twitchId,
            username: p.username,
            lives: p.lives,
            points: p.points || 0,
            correctAnswers: p.correctAnswers,
            team: p.team,
            isLastGlobalWinner: false,
            avatarUrl: p.avatarUrl || null
        }));

        const podium = [
            { rank: 1, teamName: gameState.teamNames[1], points: team1Score, team: 1 },
            { rank: 2, teamName: gameState.teamNames[2], points: team2Score, team: 2 }
        ].sort((a, b) => b.points - a.points);

        // 🔥 Sauvegarder avant reset (copie)
        const savedTeamScores = { ...gameState.teamScores };
        const savedTeamNames = { ...gameState.teamNames };
        const savedInitialPlayerCount = gameState.initialPlayerCount;

        // 🔥 FIX: Récupérer topPlayers AVANT l'émission
        let topPlayers = [];
        try {
            topPlayers = [];
        } catch (dbError) {
            console.error('⚠️ Erreur récup topPlayers:', dbError.message);
        }
        
        // 🔥 Sauvegarder les données de la dernière question AVANT le reset
        const lastQuestionPlayers = getLastQuestionPlayersData();

        // 🔥 ÉMETTRE game-ended IMMÉDIATEMENT
        const gameEndedPayload = {
            winner: teamData,
            teamScores: savedTeamScores,
            teamNames: savedTeamNames,
            podium,
            duration,
            totalQuestions: gameState.currentQuestionIndex,
            gameMode: 'rivalry-points',
            playersData,
            topPlayers,
            lastQuestionPlayers
        };

        winnerScreenData = {
            ...gameEndedPayload,
            livesIcon: gameState.livesIcon
        };

        emitGameEnded(gameEndedPayload);
        console.log('📡 game-ended émis pour rivalry-points-tiebreaker');

        resetGameState();

    } else {
        // ⚖️ ENCORE ÉGALITÉ
        console.log(`⚖️ Toujours égalité: ${team1Score} - ${team2Score}`);

        io.emit('tiebreaker-continues', {
            mode: 'rivalry',
            team1Score,
            team2Score,
            teamNames: gameState.teamNames,
            message: '⚖️ Encore égalité ! Cliquez sur "Question suivante"'
        });

        // 🆕 Si mode auto activé, lancer automatiquement après 3s
        if (gameState.autoMode) {
            console.log('🤖 Mode Auto : Prochaine question de départage dans 3s...');
            if (gameState.rivalryTiebreakerTimeout) {
                clearTimeout(gameState.rivalryTiebreakerTimeout);
            }
            gameState.rivalryTiebreakerTimeout = setTimeout(async () => {
                if (gameState.inProgress && gameState.isRivalryTiebreaker) {
                    await sendRivalryTiebreakerQuestion();
                }
            }, 3000);
        } else {
            console.log('⚠️ En attente que l\'admin lance la prochaine question de départage...');
        }
    }
}

// 🆕 RIVALRY: Terminer avec égalité (fallback si plus de questions)
async function endRivalryWithTie() {
    const duration = Math.floor((Date.now() - gameState.gameStartTime) / 1000);
    
    const teamData = {
        team: null,
        teamName: 'Égalité',
        points: gameState.teamScores[1],
        isDraw: true
    };

    addLog('game-end', { winner: 'Égalité', mode: 'rivalry-points' });
    console.log(`🏆 Mode Rivalité terminé en ÉGALITÉ: ${gameState.teamScores[1]} - ${gameState.teamScores[2]}`);

    const playersData = Array.from(gameState.players.values()).map(p => ({
        twitchId: p.twitchId,
        username: p.username,
        lives: p.lives,
        points: p.points || 0,
        correctAnswers: p.correctAnswers,
        team: p.team,
        isLastGlobalWinner: false,
        avatarUrl: p.avatarUrl || null
    }));

    const podium = [
        { rank: 1, teamName: gameState.teamNames[1], points: gameState.teamScores[1], team: 1 },
        { rank: 1, teamName: gameState.teamNames[2], points: gameState.teamScores[2], team: 2 }
    ];

    // 🔥 Sauvegarder avant reset (copie)
    const savedTeamScores = { ...gameState.teamScores };
    const savedTeamNames = { ...gameState.teamNames };

    // 🔥 FIX: Récupérer topPlayers AVANT l'émission
    let topPlayers = [];
    try {
        topPlayers = [];
    } catch (dbError) {
        console.error('⚠️ Erreur récup topPlayers:', dbError.message);
    }

    // 🔥 Sauvegarder les données de la dernière question AVANT le reset
    const lastQuestionPlayers = getLastQuestionPlayersData();

    const gameEndedPayload = {
        winner: teamData,
        teamScores: savedTeamScores,
        teamNames: savedTeamNames,
        podium,
        duration,
        totalQuestions: gameState.currentQuestionIndex,
        gameMode: 'rivalry-points',
        playersData,
        topPlayers,
        lastQuestionPlayers
    };

    winnerScreenData = {
        ...gameEndedPayload,
        livesIcon: gameState.livesIcon
    };

    emitGameEnded(gameEndedPayload);
    console.log('📡 game-ended émis pour rivalry-points (égalité)');

    resetGameState();
}


// FONCTION: Terminer avec égalité (fallback si plus de questions)
async function endGameWithTie() {
    const duration = Math.floor((Date.now() - gameState.gameStartTime) / 1000);

    const sortedPlayers = Array.from(gameState.players.values())
        .sort((a, b) => (b.points || 0) - (a.points || 0));

    const maxPoints = sortedPlayers[0]?.points || 0;
    const winners = sortedPlayers.filter(p => p.points === maxPoints);

    const rewardsData = null;

    const winnerData = {
        tie: true,
        winners: winners.map(w => ({
            username: w.username,
            points: w.points || 0
        })),
        points: maxPoints,
        username: winners.map(w => w.username).join(' & ')
    };

    const podium = sortedPlayers.slice(0, 3).map((player, index) => ({
        rank: index + 1,
        username: player.username,
        points: player.points || 0,
        avatarUrl: player.avatarUrl || null
    }));

    const { playersData, topPlayers } = await generateGameEndedData();
    
    // 🔥 Sauvegarder les données de la dernière question AVANT le reset
    const lastQuestionPlayers = getLastQuestionPlayersData();

    winnerScreenData = {
        winner: winnerData,
        podium: podium,
        duration,
        totalQuestions: gameState.currentQuestionIndex,
        gameMode: 'points',
        playersData,
        topPlayers,
        livesIcon: gameState.livesIcon,
        lastQuestionPlayers,
        rewardsData
    };


    emitGameEnded({
        winner: winnerData,
        podium: podium,
        duration,
        totalQuestions: gameState.currentQuestionIndex,
        gameMode: 'points',
        playersData,
        topPlayers,
        lastQuestionPlayers,
        rewardsData
    });

    resetGameState();
}

// 🔥 Helper: Extraire les données de la dernière question pour l'écran winner (hover)
function getLastQuestionPlayersData() {
    if (!gameState.lastQuestionResults || !gameState.lastQuestionResults.players) return null;
    return gameState.lastQuestionResults.players.map(p => ({
        username: p.username,
        status: p.status,
        isCorrect: p.isCorrect,
        selectedAnswer: p.selectedAnswer || null,
        responseTime: p.responseTime || null
    }));
}

// Terminer la partie
async function endGame(winner) {
    const duration = Math.floor((Date.now() - gameState.gameStartTime) / 1000);

    try {
        let winnerData = null;
        let rewardsData = null;

        if (winner) {
            lastGlobalWinner = winner.twitchId;
            addLog('game-end', { winner: winner.username });

            winnerData = {
                username: winner.username,
                correctAnswers: winner.correctAnswers,
                livesRemaining: winner.lives
            };
        } else {
            // 🆕 Cas aucun gagnant - terminer la partie en DB quand même
            console.log('💀 Fin de partie sans gagnant');
            addLog('game-end', { winner: 'Aucun' });
        }

        const playersData = Array.from(gameState.players.values()).map(p => ({
            twitchId: p.twitchId,
            username: p.username,
            lives: p.lives,
            correctAnswers: p.correctAnswers,
            isLastGlobalWinner: p.twitchId === lastGlobalWinner,
            avatarUrl: p.avatarUrl || null
        }));

        const topPlayers = [];


        // 🔥 Sauvegarder les données de la dernière question AVANT le reset
        const lastQuestionPlayers = getLastQuestionPlayersData();

        // 🔥 Stocker pour restauration
        winnerScreenData = {
            winner: winnerData,
            duration,
            totalQuestions: gameState.currentQuestionIndex,
            gameMode: 'lives',
            playersData: playersData,
            topPlayers,
            livesIcon: gameState.livesIcon,
            lastQuestionPlayers,
            rewardsData: rewardsData
        };


        // 🆕 N'envoyer game-ended que s'il y a un gagnant
        if (winner) {
            emitGameEnded({
                winner: winnerData,
                duration,
                totalQuestions: gameState.currentQuestionIndex,
                gameMode: 'lives',
                playersData: playersData,
                topPlayers,
                lastQuestionPlayers,
                rewardsData
            });
        }

        // Reset
        resetGameState();

        // 🆕 Si aucun gagnant, fermer le lobby automatiquement
        if (!winner) {
            console.log('🔒 Fermeture automatique du lobby (aucun gagnant)');
            gameState.isActive = false;
            io.emit('game-deactivated');
        }

    } catch (error) {
        console.error('❌ Erreur fin de partie:', error);
        // 🆕 Reset même en cas d'erreur pour débloquer
        resetGameState();
    }
}

// 🆕 Fin de partie mode Rivalité (vie)
async function endGameRivalry(winningTeam) {
    const duration = Math.floor((Date.now() - gameState.gameStartTime) / 1000);
    
    try {
        updateTeamScores();
        
        const teamData = {
            team: winningTeam === 'draw' ? null : winningTeam,
            teamName: winningTeam === 'draw' ? 'Égalité' : gameState.teamNames[winningTeam],
            livesRemaining: winningTeam === 'draw' ? 0 : gameState.teamScores[winningTeam],
            isDraw: winningTeam === 'draw'
        };
        
        // Log
        addLog('game-end', { winner: teamData.teamName, mode: 'rivalry' });
        console.log(`🏆 Mode Rivalité terminé - ${teamData.teamName} gagne avec ${teamData.livesRemaining} vies`);
        
        // 🔥 Préparer les données AVANT les appels DB
        const playersData = Array.from(gameState.players.values()).map(p => ({
            twitchId: p.twitchId,
            username: p.username,
            lives: p.lives,
            points: p.points || 0,
            correctAnswers: p.correctAnswers,
            team: p.team,
            isLastGlobalWinner: false,
            avatarUrl: p.avatarUrl || null
        }));
        
        // 🔥 Sauvegarder avant reset (copie)
        const savedTeamScores = { ...gameState.teamScores };
        const savedTeamNames = { ...gameState.teamNames };
        const savedInitialPlayerCount = gameState.initialPlayerCount;
        
        // 🔥 FIX: Récupérer topPlayers AVANT l'émission (comme en mode classique)
        let topPlayers = [];
        try {
            topPlayers = [];
        } catch (dbError) {
            console.error('⚠️ Erreur récup topPlayers:', dbError.message);
        }
        
        // 🔥 Sauvegarder les données de la dernière question AVANT le reset
        const lastQuestionPlayers = getLastQuestionPlayersData();
        
        const rewardsData = null;

        const gameEndedPayload = {
            winner: teamData,
            teamScores: savedTeamScores,
            teamNames: savedTeamNames,
            duration,
            totalQuestions: gameState.currentQuestionIndex,
            gameMode: 'rivalry-lives',
            playersData: playersData,
            topPlayers,
            lastQuestionPlayers,
            rewardsData
        };
        
        winnerScreenData = {
            ...gameEndedPayload,
            livesIcon: gameState.livesIcon
        };
        
        emitGameEnded(gameEndedPayload);
        console.log('📡 game-ended émis pour rivalry-lives');
        
        
        resetGameState();
        
    } catch (error) {
        console.error('❌ Erreur fin de partie Rivalité:', error);
        resetGameState();
    }
}

// 🆕 Fin de partie mode Rivalité (points)
async function endGameRivalryPoints() {
    const duration = Math.floor((Date.now() - gameState.gameStartTime) / 1000);
    
    try {
        updateTeamScores();
        
        const team1Points = gameState.teamScores[1];
        const team2Points = gameState.teamScores[2];
        
        // 🆕 TIEBREAKER: Si égalité, lancer une question de départage
        if (team1Points === team2Points) {
            console.log(`⚖️ ÉGALITÉ RIVALRY: ${team1Points} - ${team2Points} → Question de départage !`);
            
            gameState.isRivalryTiebreaker = true;
            
            addLog('tiebreaker', { mode: 'rivalry', score: team1Points, playerCount: gameState.players.size });
            
            io.emit('tiebreaker-announced', {
                mode: 'rivalry',
                team1Score: team1Points,
                team2Score: team2Points,
                teamNames: gameState.teamNames,
                message: '⚖️ Égalité ! Question de départage...'
            });
            
            // 🆕 Si mode auto activé, lancer automatiquement après 3s
            if (gameState.autoMode) {
                console.log('🤖 Mode Auto : Question de départage dans 3s...');
                if (gameState.rivalryTiebreakerTimeout) {
                    clearTimeout(gameState.rivalryTiebreakerTimeout);
                }
                gameState.rivalryTiebreakerTimeout = setTimeout(async () => {
                    if (gameState.inProgress && gameState.isRivalryTiebreaker) {
                        await sendRivalryTiebreakerQuestion();
                    }
                }, 3000);
            } else {
                console.log('⚠️ En attente que l\'admin lance la question de départage (clic sur Question suivante)...');
            }
            
            return; // Ne pas terminer la partie
        }
        
        let winningTeam;
        if (team1Points > team2Points) {
            winningTeam = 1;
        } else {
            winningTeam = 2;
        }
        
        const teamData = {
            team: winningTeam,
            teamName: gameState.teamNames[winningTeam],
            points: gameState.teamScores[winningTeam],
            isDraw: false
        };
        
        // Log
        addLog('game-end', { winner: teamData.teamName, mode: 'rivalry-points' });
        console.log(`🏆 Mode Rivalité (points) terminé - ${teamData.teamName} gagne avec ${teamData.points} points`);
        
        // 🔥 Préparer les données AVANT les appels DB (pas de dépendance DB)
        const playersData = Array.from(gameState.players.values()).map(p => ({
            twitchId: p.twitchId,
            username: p.username,
            lives: p.lives,
            points: p.points || 0,
            correctAnswers: p.correctAnswers,
            team: p.team,
            isLastGlobalWinner: false,
            avatarUrl: p.avatarUrl || null
        }));
        
        // Créer le podium par équipe
        const podium = [
            { rank: 1, teamName: gameState.teamNames[1], points: team1Points, team: 1 },
            { rank: 2, teamName: gameState.teamNames[2], points: team2Points, team: 2 }
        ].sort((a, b) => b.points - a.points);
        
        // 🔥 Sauvegarder teamScores/teamNames avant reset (copie)
        const savedTeamScores = { ...gameState.teamScores };
        const savedTeamNames = { ...gameState.teamNames };
        const savedInitialPlayerCount = gameState.initialPlayerCount;
        
        // 🔥 FIX: Récupérer topPlayers AVANT l'émission (comme en mode classique)
        let topPlayers = [];
        try {
            topPlayers = [];
        } catch (dbError) {
            console.error('⚠️ Erreur récup topPlayers:', dbError.message);
        }
        
        // 🔥 Sauvegarder les données de la dernière question AVANT le reset
        const lastQuestionPlayers = getLastQuestionPlayersData();
        
        const rewardsData = null;

        const gameEndedPayload = {
            winner: teamData,
            teamScores: savedTeamScores,
            teamNames: savedTeamNames,
            podium,
            duration,
            totalQuestions: gameState.currentQuestionIndex,
            gameMode: 'rivalry-points',
            playersData: playersData,
            topPlayers,
            lastQuestionPlayers,
            rewardsData
        };
        
        winnerScreenData = {
            ...gameEndedPayload,
            livesIcon: gameState.livesIcon
        };
        
        emitGameEnded(gameEndedPayload);
        console.log('📡 game-ended émis pour rivalry-points');
        
        
        resetGameState();
        
    } catch (error) {
        console.error('❌ Erreur fin de partie Rivalité (points):', error);
        resetGameState();
    }
}




app.get('/question', (req, res) => {
    res.sendFile(__dirname + '/src/html/question.html');
});

// API ajout question - avec code spécifique

app.post('/api/add-question', async (req, res) => {
    const { adminCode, question, answers, correctAnswer, serie, difficulty, proof_url, is_spoil } = req.body;

    // Vérifier le code (spécifique OU master)
    if (adminCode !== process.env.QUESTION_ADMIN_CODE || adminCode === process.env.MASTER_ADMIN_CODE) {
        return res.status(401).json({ error: 'Code invalide' });
    }

    try {
        const { data, error } = await supabase
            .from('questions')
            .insert([{
                question,
                answer1: answers[0],
                answer2: answers[1],
                answer3: answers[2],
                answer4: answers[3],
                answer5: answers[4],
                answer6: answers[5],
                coanswer: correctAnswer,
                serie,
                difficulty,
                proof_url: proof_url || null,
                is_spoil: is_spoil === true
            }]);

        if (error) throw error;

        res.json({ success: true, message: 'Question ajoutée !' });
    } catch (error) {
        console.error('Erreur ajout question:', error);
        res.status(500).json({ error: 'Erreur lors de l\'ajout' });
    }
});


// 🆕 Modifier une question
app.post('/api/update-question', async (req, res) => {
    const { adminCode, id, question, answers, correctAnswer, serie, difficulty, proof_url, is_spoil } = req.body;

    // Vérifier le code
    if (adminCode !== process.env.QUESTION_ADMIN_CODE && adminCode !== process.env.MASTER_ADMIN_CODE) {
        return res.status(401).json({ error: 'Code invalide' });
    }

    try {
        const { data, error } = await supabase
            .from('questions')
            .update({
                question,
                answer1: answers[0],
                answer2: answers[1],
                answer3: answers[2],
                answer4: answers[3],
                answer5: answers[4],
                answer6: answers[5],
                coanswer: correctAnswer,
                serie,
                difficulty,
                proof_url: proof_url || null,
                is_spoil: is_spoil === true
            })
            .eq('id', id);

        if (error) throw error;

        res.json({ success: true, message: 'Question modifiée !' });
    } catch (error) {
        console.error('Erreur modification question:', error);
        res.status(500).json({ error: 'Erreur lors de la modification' });
    }
});


// 🚫 Toggle le statut spoil d'une question
app.post('/api/toggle-spoil', async (req, res) => {
    const { adminCode, id, is_spoil } = req.body;

    if (adminCode !== process.env.QUESTION_ADMIN_CODE && adminCode !== process.env.MASTER_ADMIN_CODE) {
        return res.status(401).json({ error: 'Code invalide' });
    }

    try {
        const { data, error } = await supabase
            .from('questions')
            .update({ is_spoil: is_spoil === true })
            .eq('id', id);

        if (error) throw error;

        console.log(`🚫 Question ${id} → spoil: ${is_spoil}`);
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur toggle spoil:', error);
        res.status(500).json({ error: 'Erreur lors du toggle spoil' });
    }
});


// 🆕 Supprimer une question
app.post('/api/delete-question', async (req, res) => {
    const { adminCode, id } = req.body;

    // Vérifier le code
    if (adminCode !== process.env.QUESTION_ADMIN_CODE && adminCode !== process.env.MASTER_ADMIN_CODE) {
        return res.status(401).json({ error: 'Code invalide' });
    }

    try {
        const { data, error } = await supabase
            .from('questions')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ success: true, message: 'Question supprimée !' });
    } catch (error) {
        console.error('Erreur suppression question:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

// Récupérer toutes les questions (avec filtre optionnel)
app.get('/api/questions', async (req, res) => {
    const { adminCode } = req.query;

    // Vérifier le code
    if (adminCode !== process.env.QUESTION_ADMIN_CODE && adminCode !== process.env.MASTER_ADMIN_CODE) {
        return res.status(401).json({ error: 'Code invalide' });
    }

    try {
        const { data, error } = await supabase
            .from('questions')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;

        res.json({ success: true, questions: data });
    } catch (error) {
        console.error('Erreur récupération questions:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Récupérer la liste des séries uniques
app.get('/api/series', async (req, res) => {
    const { adminCode } = req.query;

    if (adminCode !== process.env.QUESTION_ADMIN_CODE && adminCode !== process.env.MASTER_ADMIN_CODE) {
        return res.status(401).json({ error: 'Code invalide' });
    }

    try {
        const { data, error } = await supabase
            .from('questions')
            .select('serie');

        if (error) throw error;

        // Extraire les séries uniques et trier
        const uniqueSeries = [...new Set(data.map(q => q.serie).filter(s => s))].sort();

        res.json({ success: true, series: uniqueSeries });
    } catch (error) {
        console.error('Erreur récupération séries:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});


app.post('/api/verify-question-code', (req, res) => {
    const { code } = req.body;

    if (code === process.env.QUESTION_ADMIN_CODE || code === process.env.MASTER_ADMIN_CODE) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

// 🚨 Signalement d'une question par l'hôte (qualité de la base de questions)
app.post('/admin/report-question', async (req, res) => {
    try {
        const { questionId, questionText, difficulty, reason } = req.body;

        if (!questionText || !reason) {
            return res.status(400).json({ error: 'Données manquantes' });
        }

        const { data, error } = await supabase
            .from('reported_questions')
            .insert({
                question_id: questionId,
                question_text: questionText,
                difficulty: difficulty,
                reason: reason,
                reported_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        console.log('🚨 Question signalée:', questionText);
        res.json({ success: true, report: data });
    } catch (error) {
        console.error('❌ Erreur signalement question:', error);
        res.status(500).json({ error: error.message });
    }
});


// POST /admin/set-lives-icon
app.post('/admin/set-lives-icon', (req, res) => {

    const { icon } = req.body;
    const validIcons = ['heart', 'dragonball', 'flame', 'sharingan', 'katana', 'shuriken', 'konoha', 'alchemy', 'curse', 'kunai', 'star4'];

    if (!validIcons.includes(icon)) {
        return res.status(400).json({ error: 'Invalid icon' });
    }

    gameState.livesIcon = icon;

    // Broadcast aux clients
    io.emit('lobby-update', {
        livesIcon: icon
    });

    console.log(`🎨 Icône de vies changée: ${icon}`);
    res.json({ success: true, icon });
});


// ============================================
// Socket.IO
// ============================================
const server = app.listen(PORT, () => {
    console.log(`
    ╔═══════════════════════════════════════╗
    ║    🎮 SHONENMASTER SERVER (v2) 🎮     ║
    ╠═══════════════════════════════════════╣
    ║  Port: ${PORT}                        ║
    ║  Status: ✅ Online                    ║
    ║  Mode: ${process.env.NODE_ENV || 'development'}
    ╚═══════════════════════════════════════╝
    `);

    loadRecentGamesFromDb();

});



// ============================================
// 💣 BOMBANIME - Fonctions de jeu
// ============================================

// Valider un nom de personnage
function validateBombanimeCharacter(name, serie) {
    if (!name || !serie) return { valid: false, reason: 'invalid_input' };
    
    const characters = BOMBANIME_CHARACTERS[serie];
    if (!characters) return { valid: false, reason: 'serie_not_found' };
    
    const normalizedName = name.trim().toUpperCase();
    
    // Vérifier si le nom est dans la liste
    const isValid = characters.some(char => char.toUpperCase() === normalizedName);
    
    if (!isValid) return { valid: false, reason: 'character_not_found' };
    
    // Vérifier si le nom a déjà été utilisé
    if (gameState.bombanime.usedNames.has(normalizedName)) {
        return { valid: false, reason: 'already_used' };
    }
    
    return { valid: true, normalizedName };
}

// Obtenir la première lettre d'un nom (pour l'alphabet)
function getFirstLetter(name) {
    if (!name) return null;
    const normalized = name.trim().toUpperCase();
    const firstChar = normalized.charAt(0);
    // Vérifier que c'est une lettre A-Z
    if (/^[A-Z]$/.test(firstChar)) {
        return firstChar;
    }
    return null;
}

// Extraire toutes les lettres uniques d'un nom (A-Z seulement)
function getAllLetters(name) {
    if (!name) return [];
    const normalized = name.trim().toUpperCase();
    const letters = new Set();
    for (const char of normalized) {
        if (/^[A-Z]$/.test(char)) {
            letters.add(char);
        }
    }
    return Array.from(letters);
}

// Vérifier si un joueur a complété l'alphabet
function checkAlphabetComplete(twitchId) {
    const alphabet = gameState.bombanime.playerAlphabets.get(twitchId);
    if (!alphabet) return false;
    return alphabet.size >= 26;
}

// ============================================
// 🎯 BOMBANIME - Système de Défis
// ============================================

// Lettres communes (exclut Q, X, W, Z pour le défi 3 persos)
const COMMON_LETTERS = 'ABCDEFGHIJKLMNOPRSTUY'.split('');
const ALL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Générer les 2 défis BombAnime pour une partie
function generateBombanimeChallenges() {
    const challenges = [];
    
    // Défi 1: 3 personnages commençant par lettre X (lettres communes uniquement)
    const letter3 = COMMON_LETTERS[Math.floor(Math.random() * COMMON_LETTERS.length)];
    challenges.push({
        id: 'three_letters',
        type: 'three_letters',
        letter: letter3,
        target: 3,
        reward: 'extraLife',
        name: `3 persos en "${letter3}"`,
        description: `Donnez 3 personnages commençant par "${letter3}"`
    });
    
    // Défi 2: 1 personnage commençant par lettre Y (toutes lettres)
    // On évite la même lettre que le défi 1 si possible
    let letter1;
    do {
        letter1 = ALL_LETTERS[Math.floor(Math.random() * ALL_LETTERS.length)];
    } while (letter1 === letter3 && ALL_LETTERS.length > 1);
    
    challenges.push({
        id: 'one_letter',
        type: 'one_letter',
        letter: letter1,
        target: 1,
        reward: 'freeCharacter',
        name: `1 perso en "${letter1}"`,
        description: `Donnez 1 personnage commençant par "${letter1}"`
    });
    
    console.log(`🎯 Défis BombAnime générés: "${letter3}" (x3) et "${letter1}" (x1)`);
    return challenges;
}

// Initialiser la progression des défis pour un joueur BombAnime
function initBombanimePlayerChallenges(twitchId) {
    const progress = {
        challenges: {},
        lettersGiven: new Map() // Map<letter, count> pour tracker les lettres données
    };
    
    // Initialiser chaque défi actif
    gameState.bombanime.challenges.forEach(challenge => {
        progress.challenges[challenge.id] = {
            progress: 0,
            target: challenge.target,
            completed: false,
            letter: challenge.letter
        };
    });
    
    gameState.bombanime.playerChallenges.set(twitchId, progress);
    
    // Initialiser les bonus du joueur
    if (!gameState.bombanime.playerBonuses.has(twitchId)) {
        gameState.bombanime.playerBonuses.set(twitchId, {
            freeCharacter: 0,
            extraLife: 0
        });
    }
}

// Vérifier et mettre à jour les défis BombAnime après une réponse valide
function checkBombanimeChallenges(twitchId, characterName) {
    const playerProgress = gameState.bombanime.playerChallenges.get(twitchId);
    if (!playerProgress) return [];
    
    const completedChallenges = [];
    const firstLetter = characterName.charAt(0).toUpperCase();
    
    // Mettre à jour le compteur de lettres
    const currentCount = playerProgress.lettersGiven.get(firstLetter) || 0;
    playerProgress.lettersGiven.set(firstLetter, currentCount + 1);
    
    // Vérifier chaque défi actif
    gameState.bombanime.challenges.forEach(challenge => {
        const cp = playerProgress.challenges[challenge.id];
        if (!cp || cp.completed) return;
        
        // Vérifier si la première lettre correspond au défi
        if (firstLetter === challenge.letter) {
            cp.progress = playerProgress.lettersGiven.get(challenge.letter) || 0;
            
            // Vérifier si défi complété
            if (cp.progress >= cp.target && !cp.completed) {
                cp.completed = true;
                completedChallenges.push({
                    challengeId: challenge.id,
                    reward: challenge.reward
                });
                
                // Ajouter le bonus à l'inventaire du joueur
                const bonuses = gameState.bombanime.playerBonuses.get(twitchId);
                if (bonuses) {
                    bonuses[challenge.reward]++;
                    console.log(`🏆 Défi BombAnime "${challenge.name}" complété par ${twitchId} ! Bonus: ${challenge.reward} (total: ${bonuses[challenge.reward]})`);
                }
            }
        }
    });
    
    return completedChallenges;
}

// Obtenir l'état des défis BombAnime pour un joueur (pour envoi au client)
function getBombanimePlayerChallengesState(twitchId) {
    const playerProgress = gameState.bombanime.playerChallenges.get(twitchId);
    if (!playerProgress) return [];
    
    return gameState.bombanime.challenges.map(challenge => {
        const cp = playerProgress.challenges[challenge.id];
        return {
            id: challenge.id,
            name: challenge.name,
            description: challenge.description,
            reward: challenge.reward,
            letter: challenge.letter,
            progress: cp ? cp.progress : 0,
            target: challenge.target,
            completed: cp ? cp.completed : false
        };
    });
}

// Obtenir les bonus BombAnime d'un joueur
function getBombanimePlayerBonuses(twitchId) {
    return gameState.bombanime.playerBonuses.get(twitchId) || { freeCharacter: 0, extraLife: 0 };
}

// Obtenir un personnage aléatoire non utilisé pour le bonus perso gratuit
function getRandomUnusedCharacter(serie) {
    const characters = BOMBANIME_CHARACTERS[serie];
    if (!characters) return null;
    
    // Filtrer les personnages non utilisés
    const unusedCharacters = characters.filter(char => 
        !gameState.bombanime.usedNames.has(char.toUpperCase())
    );
    
    if (unusedCharacters.length === 0) return null;
    
    // Retourner un personnage aléatoire
    return unusedCharacters[Math.floor(Math.random() * unusedCharacters.length)];
}

// Obtenir les joueurs BombAnime encore en vie
function getAliveBombanimePlayers() {
    return Array.from(gameState.players.values()).filter(p => p.lives > 0);
}

// Passer au joueur suivant dans le cercle
function getNextBombanimePlayer() {
    const alivePlayers = getAliveBombanimePlayers();
    if (alivePlayers.length <= 1) return null;
    
    const currentTwitchId = gameState.bombanime.currentPlayerTwitchId;
    const playersOrder = gameState.bombanime.playersOrder;
    const direction = gameState.bombanime.bombDirection;
    
    // Trouver l'index du joueur actuel dans l'ordre ORIGINAL
    const currentIndexInOriginal = playersOrder.indexOf(currentTwitchId);
    
    // Parcourir dans la direction jusqu'à trouver un joueur vivant
    let nextIndex = currentIndexInOriginal;
    for (let i = 0; i < playersOrder.length; i++) {
        nextIndex = (nextIndex + direction + playersOrder.length) % playersOrder.length;
        const candidateTwitchId = playersOrder[nextIndex];
        
        // Vérifier si ce joueur est vivant
        const candidate = Array.from(gameState.players.values()).find(p => p.twitchId === candidateTwitchId);
        if (candidate && candidate.lives > 0) {
            return candidateTwitchId;
        }
    }
    
    return null;
}

// Démarrer le tour d'un joueur BombAnime
function startBombanimeTurn(twitchId) {
    if (!gameState.bombanime.active) return;
    
    // Annuler le timeout précédent
    if (gameState.bombanime.turnTimeout) {
        clearTimeout(gameState.bombanime.turnTimeout);
    }
    
    // Trouver le joueur AVANT de modifier l'état
    let player = Array.from(gameState.players.values()).find(p => p.twitchId === twitchId);
    
    // 🔥 FIX: Si le joueur n'est pas trouvé, chercher le prochain joueur vivant
    if (!player) {
        console.log(`⚠️ Joueur ${twitchId} introuvable - recherche du prochain joueur...`);
        
        // Temporairement setter le currentPlayerTwitchId pour que getNextBombanimePlayer fonctionne
        gameState.bombanime.currentPlayerTwitchId = twitchId;
        
        const alivePlayers = getAliveBombanimePlayers();
        if (alivePlayers.length <= 1) {
            // Fin de partie ou aucun joueur
            if (alivePlayers.length === 1) {
                endBombanimeGame(alivePlayers[0]);
            } else {
                endBombanimeGame(null);
            }
            return;
        }
        
        // Essayer de trouver le prochain joueur vivant
        const nextTwitchId = getNextBombanimePlayer();
        if (nextTwitchId) {
            console.log(`🔄 Joueur de remplacement trouvé: ${nextTwitchId}`);
            player = Array.from(gameState.players.values()).find(p => p.twitchId === nextTwitchId);
            twitchId = nextTwitchId;
        }
        
        // Si toujours pas de joueur trouvé, fallback sur le premier joueur vivant
        if (!player) {
            player = alivePlayers[0];
            twitchId = player.twitchId;
            console.log(`🔄 Fallback sur premier joueur vivant: ${player.username}`);
        }
    }
    
    // Incrémenter l'identifiant de tour (protection contre race conditions)
    gameState.bombanime.turnId++;
    const currentTurnId = gameState.bombanime.turnId;
    
    gameState.bombanime.currentPlayerTwitchId = twitchId;
    gameState.bombanime.turnStartTime = Date.now();
    gameState.bombanime.isPaused = false;
    
    console.log(`💣 Tour de ${player.username} (${gameState.bombanime.timer}s) [turnId=${currentTurnId}]`);
    
    // Envoyer l'état à tous les clients
    io.emit('bombanime-turn-start', {
        currentPlayerTwitchId: twitchId,
        currentPlayerUsername: player.username,
        timer: gameState.bombanime.timer,
        playersOrder: gameState.bombanime.playersOrder,
        direction: gameState.bombanime.bombDirection
    });
    
    // Timeout pour l'explosion - vérifie turnId pour éviter race condition
    gameState.bombanime.turnTimeout = setTimeout(() => {
        // Si le turnId a changé, le joueur a répondu à temps
        if (gameState.bombanime.turnId !== currentTurnId) {
            console.log(`⏱️ Explosion annulée [turnId changé: ${currentTurnId} -> ${gameState.bombanime.turnId}]`);
            return;
        }
        bombExplode(twitchId);
    }, gameState.bombanime.timer * 1000);
}

// La bombe explose sur un joueur
function bombExplode(twitchId) {
    if (!gameState.bombanime.active) return;
    
    // IMPORTANT: Vérifier que c'est toujours le tour de ce joueur
    // Si ce n'est plus son tour, c'est qu'il a répondu à temps (race condition évitée)
    if (gameState.bombanime.currentPlayerTwitchId !== twitchId) {
        console.log(`⏱️ Explosion ignorée pour ${twitchId} - ce n'est plus son tour (a répondu à temps)`);
        return;
    }
    
    const player = Array.from(gameState.players.values()).find(p => p.twitchId === twitchId);
    if (!player) return;
    
    // Calculer le temps écoulé depuis le début du tour
    const elapsedMs = Date.now() - gameState.bombanime.turnStartTime;
    console.log(`💥 EXPLOSION sur ${player.username}! (après ${elapsedMs}ms, turnId=${gameState.bombanime.turnId})`);
    
    // Retirer une vie
    player.lives--;
    
    const isEliminated = player.lives <= 0;
    
    if (isEliminated) {
        gameState.bombanime.eliminatedPlayers.push({
            twitchId: player.twitchId,
            username: player.username,
            rank: getAliveBombanimePlayers().length + 1
        });
        console.log(`☠️ ${player.username} ÉLIMINÉ!`);
    }
    
    // Envoyer l'événement d'explosion
    io.emit('bombanime-explosion', {
        playerTwitchId: twitchId,
        playerUsername: player.username,
        livesRemaining: player.lives,
        isEliminated: isEliminated,
        playersData: getBombanimePlayersData(),
        // Debug
        debugElapsedMs: elapsedMs,
        debugTurnId: gameState.bombanime.turnId
    });
    
    // Vérifier si la partie est terminée
    const alivePlayers = getAliveBombanimePlayers();
    if (alivePlayers.length <= 1) {
        endBombanimeGame(alivePlayers[0] || null);
        return;
    }
    
    // Pause puis passer au joueur suivant
    gameState.bombanime.isPaused = true;
    setTimeout(() => {
        const nextPlayerTwitchId = getNextBombanimePlayer();
        if (nextPlayerTwitchId) {
            startBombanimeTurn(nextPlayerTwitchId);
        } else {
            // 🔥 FIX: Safety net - si getNextBombanimePlayer retourne null mais il reste des joueurs
            const remainingPlayers = getAliveBombanimePlayers();
            if (remainingPlayers.length > 1) {
                // Prendre un joueur vivant différent du joueur qui vient d'exploser
                const fallback = remainingPlayers.find(p => p.twitchId !== twitchId) || remainingPlayers[0];
                console.log(`⚠️ getNextBombanimePlayer null mais ${remainingPlayers.length} joueurs vivants - fallback sur ${fallback.username}`);
                startBombanimeTurn(fallback.twitchId);
            } else if (remainingPlayers.length === 1) {
                endBombanimeGame(remainingPlayers[0]);
            } else {
                endBombanimeGame(null);
            }
        }
    }, 100); // Passage de tour pendant le shake
}

// Soumettre un nom BombAnime
function submitBombanimeName(socketId, name) {
    if (!gameState.bombanime.active) return { success: false, reason: 'game_not_active' };
    
    const player = gameState.players.get(socketId);
    if (!player) return { success: false, reason: 'player_not_found' };
    
    // Vérifier que c'est le tour de ce joueur
    if (player.twitchId !== gameState.bombanime.currentPlayerTwitchId) {
        return { success: false, reason: 'not_your_turn' };
    }
    
    // IMPORTANT: Vérifier que le temps n'est pas écoulé côté serveur
    // Ceci empêche les réponses qui arrivent après l'expiration du timer
    const elapsedMs = Date.now() - gameState.bombanime.turnStartTime;
    const timerMs = gameState.bombanime.timer * 1000;
    if (elapsedMs >= timerMs) {
        console.log(`⏱️ Réponse REJETÉE pour ${player.username} - temps écoulé (${elapsedMs}ms >= ${timerMs}ms)`);
        return { success: false, reason: 'time_expired' };
    }
    
    // Valider le nom
    const validation = validateBombanimeCharacter(name, gameState.bombanime.serie);
    
    if (!validation.valid) {
        console.log(`❌ Nom invalide: "${name}" - ${validation.reason}`);
        
        io.emit('bombanime-name-rejected', {
            playerTwitchId: player.twitchId,
            name: name,
            reason: validation.reason
        });
        
        return { success: false, reason: validation.reason };
    }
    
    // Nom valide!
    const normalizedName = validation.normalizedName;
    
    // 🎯 Bloquer le nom ET toutes ses variantes
    const characters = BOMBANIME_CHARACTERS[gameState.bombanime.serie] || [];
    const allVariants = getAllNamesToBlock(normalizedName, characters, gameState.bombanime.serie);
    
    for (const variant of allVariants) {
        gameState.bombanime.usedNames.add(variant.toUpperCase());
    }
    
    console.log(`🔒 Noms bloqués: ${allVariants.join(', ')}`);
    
    gameState.bombanime.lastValidName = normalizedName;
    
    // Ajouter TOUTES les lettres du nom à l'alphabet du joueur
    const allLetters = getAllLetters(normalizedName);
    if (allLetters.length > 0) {
        if (!gameState.bombanime.playerAlphabets.has(player.twitchId)) {
            gameState.bombanime.playerAlphabets.set(player.twitchId, new Set());
        }
        const playerAlphabet = gameState.bombanime.playerAlphabets.get(player.twitchId);
        
        const newLetters = allLetters.filter(letter => !playerAlphabet.has(letter));
        allLetters.forEach(letter => playerAlphabet.add(letter));
        
        if (newLetters.length > 0) {
            console.log(`✅ ${player.username}: "${normalizedName}" - Nouvelles lettres: ${newLetters.join(', ')} (Total: ${playerAlphabet.size}/26)`);
        } else {
            console.log(`✅ ${player.username}: "${normalizedName}" - Aucune nouvelle lettre (Total: ${playerAlphabet.size}/26)`);
        }
        
        // Vérifier si l'alphabet est complet
        if (checkAlphabetComplete(player.twitchId)) {
            // Reset l'alphabet du joueur (toujours, même si au max de vies)
            gameState.bombanime.playerAlphabets.set(player.twitchId, new Set());
            
            // 🔥 FIX: Plafonner les vies au max configuré (évite vies invisibles)
            const maxLives = gameState.bombanime.lives || BOMBANIME_CONFIG.DEFAULT_LIVES;
            if (player.lives < maxLives) {
                player.lives += BOMBANIME_CONFIG.ALPHABET_BONUS_LIVES;
                console.log(`🎉 ${player.username} a complété l'alphabet! +1 vie (${player.lives}/${maxLives})`);
            } else {
                console.log(`🎉 ${player.username} a complété l'alphabet mais déjà au max (${player.lives}/${maxLives})`);
            }
            
            io.emit('bombanime-alphabet-complete', {
                playerTwitchId: player.twitchId,
                playerUsername: player.username,
                newLives: player.lives
            });
        }
    }
    
    // Annuler le timeout d'explosion et incrémenter turnId
    // L'incrémentation invalide le callback même s'il est déjà dans la queue d'événements
    if (gameState.bombanime.turnTimeout) {
        clearTimeout(gameState.bombanime.turnTimeout);
        gameState.bombanime.turnTimeout = null;
    }
    gameState.bombanime.turnId++; // Invalide l'ancien timeout immédiatement
    
    // Calculer le prochain joueur
    const nextPlayerTwitchId = getNextBombanimePlayer();
    
    // Changer le joueur actuel
    if (nextPlayerTwitchId) {
        gameState.bombanime.currentPlayerTwitchId = nextPlayerTwitchId;
    }
    
    // Sauvegarder la dernière réponse du joueur
    gameState.bombanime.playerLastAnswers.set(player.twitchId, normalizedName);
    
    // 🎯 Vérifier les défis BombAnime
    const completedChallenges = checkBombanimeChallenges(player.twitchId, normalizedName);
    const playerChallengesState = getBombanimePlayerChallengesState(player.twitchId);
    const playerBonuses = getBombanimePlayerBonuses(player.twitchId);
    
    // Calculer le temps restant au moment de la validation (pour debug)
    const debugElapsedMs = Date.now() - gameState.bombanime.turnStartTime;
    const timeRemainingMs = (gameState.bombanime.timer * 1000) - debugElapsedMs;
    
    console.log(`⏱️ Réponse validée avec ${timeRemainingMs}ms restants (turnId=${gameState.bombanime.turnId})`);
    
    // 🖼️ Chercher l'image du personnage (DÉSACTIVÉ temporairement)
    // const characterImage = getCharacterImage(normalizedName, gameState.bombanime.serie);
    
    // Envoyer la confirmation avec le prochain joueur
    io.emit('bombanime-name-accepted', {
        playerTwitchId: player.twitchId,
        playerUsername: player.username,
        name: normalizedName,
        // characterImage: characterImage, // 🖼️ DÉSACTIVÉ temporairement
        newLetters: getAllLetters(normalizedName),
        alphabet: Array.from(gameState.bombanime.playerAlphabets.get(player.twitchId) || []),
        playersData: getBombanimePlayersData(),
        nextPlayerTwitchId: nextPlayerTwitchId,  // Pour rotation immédiate de la bombe
        // 🎯 Défis et bonus
        challenges: playerChallengesState,
        bonuses: playerBonuses,
        completedChallenges: completedChallenges,
        // Debug info
        debugTimeRemainingMs: timeRemainingMs,
        debugTurnId: gameState.bombanime.turnId
    });
    
    // Démarrer le tour du prochain joueur (avec son nouveau timer)
    setTimeout(() => {
        if (nextPlayerTwitchId) {
            startBombanimeTurn(nextPlayerTwitchId);
        }
    }, 30); // 30ms - quasi-instantané
    
    return { success: true };
}

// Obtenir les données des joueurs BombAnime pour l'affichage
function getBombanimePlayersData() {
    const playersData = [];
    
    gameState.bombanime.playersOrder.forEach((twitchId, index) => {
        const player = Array.from(gameState.players.values()).find(p => p.twitchId === twitchId);
        if (player) {
            playersData.push({
                twitchId: player.twitchId,
                username: player.username,
                lives: player.lives,
                isAlive: player.lives > 0,
                isCurrent: player.twitchId === gameState.bombanime.currentPlayerTwitchId,
                alphabet: Array.from(gameState.bombanime.playerAlphabets.get(twitchId) || []),
                lastAnswer: gameState.bombanime.playerLastAnswers.get(twitchId) || '',
                position: index,
                avatarUrl: player.avatarUrl || 'novice.png'
            });
        }
    });
    
    return playersData;
}

// Démarrer une partie BombAnime
async function startBombanimeGame() {
    const players = Array.from(gameState.players.values());
    
    if (players.length < BOMBANIME_CONFIG.MIN_PLAYERS) {
        return { success: false, error: `Minimum ${BOMBANIME_CONFIG.MIN_PLAYERS} joueurs requis` };
    }
    
    if (players.length > BOMBANIME_CONFIG.MAX_PLAYERS) {
        return { success: false, error: `Maximum ${BOMBANIME_CONFIG.MAX_PLAYERS} joueurs` };
    }
    
    console.log(`💣 Démarrage BombAnime - ${players.length} joueurs - Série: ${gameState.bombanime.serie}`);
    
    // Reset état BombAnime
    gameState.bombanime.active = true;
    gameState.bombanime.usedNames = new Set();
    gameState.bombanime.playerAlphabets = new Map();
    gameState.bombanime.playerLastAnswers = new Map();
    gameState.bombanime.eliminatedPlayers = [];
    gameState.bombanime.bombDirection = 1;
    gameState.bombanime.lastValidName = null;
    
    // Donner des lastAnswers par défaut aux fake players (utilise le fakeCharacterName stocké)
    players.forEach(player => {
        if (player.isFake && player.fakeCharacterName) {
            gameState.bombanime.playerLastAnswers.set(player.twitchId, player.fakeCharacterName);
        }
    });
    gameState.bombanime.turnId = 0; // Reset l'identifiant de tour
    
    // Mélanger les joueurs pour l'ordre du cercle
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    gameState.bombanime.playersOrder = shuffledPlayers.map(p => p.twitchId);
    
    // Initialiser les alphabets ET les vies des joueurs
    players.forEach(player => {
        gameState.bombanime.playerAlphabets.set(player.twitchId, new Set());
        player.lives = gameState.bombanime.lives || BOMBANIME_CONFIG.DEFAULT_LIVES; // Utiliser les vies BombAnime
    });
    
    // 🎯 Générer les défis BombAnime
    gameState.bombanime.challenges = generateBombanimeChallenges();
    gameState.bombanime.playerChallenges = new Map();
    gameState.bombanime.playerBonuses = new Map();
    
    // Initialiser les défis et bonus pour chaque joueur
    players.forEach(player => {
        initBombanimePlayerChallenges(player.twitchId);
    });
    
    // Marquer la partie comme en cours
    gameState.inProgress = true;
    gameState.gameStartTime = Date.now();
    gameState.initialPlayerCount = players.length;
    
    // 🔥 FIX: Annuler TOUS les pendingRemoval pour éviter la suppression de joueurs pendant la partie
    players.forEach(player => {
        if (player.pendingRemoval) {
            clearTimeout(player.pendingRemoval);
            delete player.pendingRemoval;
            console.log(`⚠️ pendingRemoval annulé pour ${player.username} (BombAnime démarré)`);
        }
    });
    
    // Envoyer l'événement de démarrage
    io.emit('bombanime-game-started', {
        serie: gameState.bombanime.serie,
        timer: gameState.bombanime.timer,
        playersOrder: gameState.bombanime.playersOrder,
        playersData: getBombanimePlayersData(),
        totalCharacters: BOMBANIME_CHARACTERS[gameState.bombanime.serie]?.length || 0,
        // 🎯 Défis BombAnime
        challenges: gameState.bombanime.challenges.map(c => ({
            id: c.id,
            name: c.name,
            description: c.description,
            reward: c.reward,
            letter: c.letter,
            target: c.target
        }))
    });
    
    // Choisir un joueur aléatoire pour commencer
    const randomStartIndex = Math.floor(Math.random() * gameState.bombanime.playersOrder.length);
    gameState.bombanime.currentPlayerIndex = randomStartIndex;
    
    // Commencer avec le joueur aléatoire après un délai
    setTimeout(() => {
        // 🔥 FIX: Vérifier que la partie est toujours active avant de démarrer le premier tour
        if (!gameState.bombanime.active) {
            console.log('⚠️ BombAnime annulé pendant l\'intro - premier tour ignoré');
            return;
        }
        
        const alivePlayers = getAliveBombanimePlayers();
        if (alivePlayers.length < BOMBANIME_CONFIG.MIN_PLAYERS) {
            console.log('⚠️ Plus assez de joueurs vivants pour démarrer le premier tour');
            endBombanimeGame(alivePlayers[0] || null);
            return;
        }
        
        let firstPlayer = gameState.bombanime.playersOrder[randomStartIndex];
        
        // 🔥 FIX: Vérifier que le joueur choisi existe encore, sinon prendre le premier vivant
        const firstPlayerExists = Array.from(gameState.players.values()).find(p => p.twitchId === firstPlayer && p.lives > 0);
        if (!firstPlayerExists) {
            console.log(`⚠️ Premier joueur ${firstPlayer} introuvable/mort - fallback sur premier joueur vivant`);
            firstPlayer = alivePlayers[0].twitchId;
        }
        
        startBombanimeTurn(firstPlayer);
    }, 3000); // 3s avant le premier tour
    
    return { success: true };
}

// Terminer une partie BombAnime
async function endBombanimeGame(winner) {
    if (!gameState.bombanime.active) return;
    
    // Annuler le timeout
    if (gameState.bombanime.turnTimeout) {
        clearTimeout(gameState.bombanime.turnTimeout);
    }
    
    gameState.bombanime.active = false;
    
    const duration = Math.floor((Date.now() - gameState.gameStartTime) / 1000);
    
    console.log(`🏆 Fin BombAnime - Gagnant: ${winner ? winner.username : 'Aucun'}`);
    
    // Construire le classement
    const ranking = [];
    
    // Le gagnant en premier
    if (winner) {
        ranking.push({
            rank: 1,
            twitchId: winner.twitchId,
            username: winner.username,
            lives: winner.lives
        });
    }
    
    // Puis les éliminés (dans l'ordre inverse d'élimination)
    const eliminated = [...gameState.bombanime.eliminatedPlayers].reverse();
    eliminated.forEach((p, index) => {
        ranking.push({
            rank: index + 2,
            twitchId: p.twitchId,
            username: p.username,
            lives: 0
        });
    });
    
    // Stocker pour l'écran de fin
    winnerScreenData = {
        winner: winner ? {
            twitchId: winner.twitchId,
            username: winner.username,
            lives: winner.lives,
            avatarUrl: winner.avatarUrl || null
        } : null,
        ranking: ranking,
        duration: duration,
        gameMode: 'bombanime',
        serie: gameState.bombanime.serie,
        namesUsed: gameState.bombanime.usedNames.size
    };

    // 🚀 Émettre le winner IMMÉDIATEMENT pour un affichage instantané
    // Les rewards seront envoyés dans un second event quand calculés
    emitBombanimeGameEnded({
        winner: winner ? {
            twitchId: winner.twitchId,
            username: winner.username,
            lives: winner.lives,
            avatarUrl: winner.avatarUrl || null
        } : null,
        ranking: ranking,
        duration: duration,
        serie: gameState.bombanime.serie,
        namesUsed: gameState.bombanime.usedNames.size,
        rewardsData: null // Sera envoyé dans bombanime-rewards-ready
    });

    // Désactiver le lobby silencieusement après fin de partie bombanime
    gameState.isActive = false;
    console.log('🔒 Lobby désactivé automatiquement après fin BombAnime');

    const sortedPlayers = ranking.map(r => ({
        twitchId: r.twitchId,
        username: r.username
    }));


    // Reset
    resetBombanimeState();
    resetGameState();
}

// Reset l'état BombAnime
function resetBombanimeState() {
    if (gameState.bombanime.turnTimeout) {
        clearTimeout(gameState.bombanime.turnTimeout);
    }
    
    gameState.bombanime.active = false;
    gameState.bombanime.playersOrder = [];
    gameState.bombanime.currentPlayerIndex = 0;
    gameState.bombanime.currentPlayerTwitchId = null;
    gameState.bombanime.usedNames = new Set();
    gameState.bombanime.playerAlphabets = new Map();
    gameState.bombanime.playerLastAnswers = new Map();
    gameState.bombanime.turnTimeout = null;
    gameState.bombanime.turnId = 0;
    gameState.bombanime.turnStartTime = null;
    gameState.bombanime.lastValidName = null;
    gameState.bombanime.bombDirection = 1;
    gameState.bombanime.isPaused = false;
    gameState.bombanime.eliminatedPlayers = [];
}


const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    // 🛡️ Protection anti-spam connexions
    const ip = socket.handshake.headers['x-forwarded-for']?.split(',')[0] || socket.handshake.address;
    const currentConnections = connectionsByIP.get(ip) || 0;

    if (currentConnections >= MAX_CONNECTIONS_PER_IP) {
        console.log(`⚠️ Connexion refusée - Trop de connexions depuis ${ip}`);
        socket.disconnect(true);
        return;
    }

    connectionsByIP.set(ip, currentConnections + 1);
    console.log(`🔌 Nouveau socket connecté: ${socket.id} (IP: ${ip}, connexions: ${currentConnections + 1})`);

    // 🔥 NOUVEAU: Événement pour enregistrer l'authentification
    socket.on('register-authenticated', (data) => {
        authenticatedUsers.set(socket.id, {
            twitchId: data.twitchId,
            username: data.username,
            avatar: data.avatar || null
        });
        
        // 🔥 FIX: Auto-remap socket.id if player already in gameState.players with old socket
        if (data.twitchId && gameState.isActive) {
            for (const [oldSocketId, player] of gameState.players.entries()) {
                if (player.twitchId === data.twitchId && oldSocketId !== socket.id) {
                    // Transfer player entry to new socket.id
                    const previousAnswer = gameState.answers.get(oldSocketId);
                    const oldBonusData = gameState.playerBonuses.get(oldSocketId);
                    const oldChallengesData = gameState.playerChallenges ? gameState.playerChallenges.get(oldSocketId) : null;
                    
                    gameState.players.delete(oldSocketId);
                    gameState.answers.delete(oldSocketId);
                    
                    player.socketId = socket.id;
                    gameState.players.set(socket.id, player);
                    
                    if (previousAnswer) gameState.answers.set(socket.id, previousAnswer);
                    if (oldBonusData) {
                        gameState.playerBonuses.set(socket.id, oldBonusData);
                        gameState.playerBonuses.delete(oldSocketId);
                    }
                    if (oldChallengesData) {
                        gameState.playerChallenges.set(socket.id, oldChallengesData);
                        gameState.playerChallenges.delete(oldSocketId);
                    }
                    
                    // Cancel pending removal
                    if (player.pendingRemoval) {
                        clearTimeout(player.pendingRemoval);
                        delete player.pendingRemoval;
                    }
                    if (player.pendingDisconnectLog) {
                        clearTimeout(player.pendingDisconnectLog);
                        delete player.pendingDisconnectLog;
                    }
                    delete player.disconnectedAt;
                    delete player.disconnectedSocketId;
                    
                    
                    console.log(`🔄 Auto-remap: ${data.username} ${oldSocketId} → ${socket.id}`);
                    broadcastLobbyUpdate();
                    break;
                }
            }
        }
        
        console.log(`✅ Utilisateur authentifié enregistré: ${data.username} (${socket.id})`);
    });


    // Rejoindre le lobby
    socket.on('join-lobby', async (data) => {
        if (!gameState.isActive) {
            return socket.emit('error', { message: 'Aucun salon ouvert' });
        }

        if (gameState.inProgress) {
            return socket.emit('error', { message: 'Une partie est déjà en cours' });
        }

        // 🔑 Vérification du code de salon (l'hôte le transmet, il n'a rien à saisir)
        if (data.code !== undefined && data.code !== null && !data.isHost) {
            const given = String(data.code).trim().toUpperCase();
            if (given !== gameState.roomCode) {
                return socket.emit('error', { message: 'Code de salon invalide', badCode: true });
            }
        }
        
        // 🔒 Vérifier si ce joueur est déjà en cours de traitement (anti-spam)
        if (pendingJoins.has(data.twitchId)) {
            console.log(`⏳ ${data.username} déjà en cours de traitement`);
            return socket.emit('error', { message: 'Connexion en cours...' });
        }
        
        // 🔥 Vérifier si le joueur est déjà dans le lobby (reconnexion)
        let isReconnection = false;
        let existingSocketId = null;
        for (const [socketId, player] of gameState.players.entries()) {
            if (player.twitchId === data.twitchId) {
                isReconnection = true;
                existingSocketId = socketId;
                break;
            }
        }
        
        // 💣🎴 En mode BombAnime/Collect, vérifier la limite avec les places réservées
        if ((gameState.lobbyMode === 'bombanime' || gameState.lobbyMode === 'collect') && !isReconnection) {
            const maxPlayers = BOMBANIME_CONFIG.MAX_PLAYERS;
            const currentCount = gameState.players.size + pendingJoins.size;
            if (currentCount >= maxPlayers) {
                console.log(`🚫 Lobby plein: ${gameState.players.size} joueurs + ${pendingJoins.size} en attente >= ${maxPlayers}`);
                return socket.emit('error', { message: `Le lobby est plein (maximum ${maxPlayers} joueurs)` });
            }
        }
        
        // 🆕 En mode rivalité, vérifier qu'une équipe est fournie (AVANT réservation)
        if (gameState.lobbyMode === 'rivalry' && !data.team) {
            return socket.emit('error', { message: 'Vous devez choisir une équipe' });
        }
        
        // 🔒 Réserver la place AVANT les opérations async
        pendingJoins.add(data.twitchId);
        console.log(`🔒 Place réservée pour ${data.username} (pending: ${pendingJoins.size})`);
        
        try {
            if (isReconnection) {
                const existingPlayer = gameState.players.get(existingSocketId);
                
                // 🎴 Si l'entrée existante est l'admin-joueur et le nouveau join n'est PAS l'admin,
                // bloquer la reconnexion pour ne pas écraser l'admin
                if (existingPlayer && existingPlayer.isAdmin && !data.isAdmin) {
                    console.log(`🚫 ${data.username} tente de remplacer l'admin-joueur - bloqué`);
                    pendingJoins.delete(data.twitchId);
                    return socket.emit('error', { message: 'Ce compte est déjà utilisé par le streamer' });
                }
                
                // Remplacer l'ancienne connexion
                console.log(`🔄 ${data.username} remplace sa connexion précédente`);
                
                // 🆕 Annuler le timeout de suppression si existant
                if (existingPlayer && existingPlayer.pendingRemoval) {
                    clearTimeout(existingPlayer.pendingRemoval);
                    console.log(`⏱️ Timeout de suppression annulé pour ${data.username}`);
                }
                
                gameState.players.delete(existingSocketId);
                gameState.answers.delete(existingSocketId);

                // Déconnecter l'ancien socket (sans envoyer kicked pour éviter de reset le localStorage)
                const oldSocket = io.sockets.sockets.get(existingSocketId);
                if (oldSocket) {
                    oldSocket.disconnect(true);
                }
            }


        // 🔥 FIX: Re-vérifier après les awaits que la partie n'a pas démarré entre-temps
        // (race condition: admin clique Démarrer pendant que le DB call était en cours)
        if (gameState.inProgress) {
            console.log(`⚠️ ${data.username} - join annulé: partie démarrée pendant le traitement`);
            pendingJoins.delete(data.twitchId);
            return socket.emit('error', { message: 'La partie vient de démarrer' });
        }

        gameState.players.set(socket.id, {
            socketId: socket.id,
            twitchId: data.twitchId,
            username: data.username,
            lives: gameState.lives,
            correctAnswers: 0,
            avatarUrl: 'novice.png',
            team: gameState.lobbyMode === 'rivalry' ? data.team : null,
            isAdmin: data.isAdmin || false
        });

        const playerColor = assignPlayerColor(data.username);
        addLog('join', { username: data.username, playerColor });

        console.log(`✅ ${data.username} a rejoint le lobby${data.team ? ` (Team ${data.team})` : ''}`);

        // 🆕 Utiliser la fonction helper
        broadcastLobbyUpdate();
        
        } finally {
            // 🔓 Libérer la réservation
            pendingJoins.delete(data.twitchId);
            console.log(`🔓 Place libérée pour ${data.username} (pending: ${pendingJoins.size})`);
        }
    });
    
    // 🆕 Changer d'équipe (mode Rivalité)
    socket.on('change-team', (data) => {
        if (gameState.lobbyMode !== 'rivalry') return;
        if (gameState.inProgress) return;
        
        const player = gameState.players.get(socket.id);
        if (!player) return;
        
        const oldTeam = player.team;
        player.team = data.team;
        
        console.log(`🔄 ${player.username} change d'équipe: Team ${oldTeam} → Team ${data.team}`);
        
        // Mettre à jour tous les clients
        broadcastLobbyUpdate();
    });
    
    // 🆕 Admin change l'équipe d'un joueur
    socket.on('admin-change-team', (data) => {
        if (gameState.lobbyMode !== 'rivalry') return;
        if (gameState.inProgress) return;
        
        const { twitchId, username, newTeam } = data;
        if (!newTeam) return;
        
        // Trouver le joueur par twitchId ou username
        let targetSocketId = null;
        let targetPlayer = null;
        
        for (const [socketId, player] of gameState.players.entries()) {
            if ((twitchId && player.twitchId === twitchId) || 
                (username && player.username === username)) {
                targetSocketId = socketId;
                targetPlayer = player;
                break;
            }
        }
        
        if (targetPlayer) {
            const oldTeam = targetPlayer.team;
            targetPlayer.team = newTeam;
            
            console.log(`🔄 [ADMIN] ${targetPlayer.username} changé: Team ${oldTeam} → Team ${newTeam}`);
            
            // Notifier le joueur concerné de son changement d'équipe
            const targetSocket = io.sockets.sockets.get(targetSocketId);
            if (targetSocket) {
                targetSocket.emit('team-changed', { newTeam: newTeam });
            }
            
            // Mettre à jour tous les clients
            broadcastLobbyUpdate();
        } else {
            console.log(`⚠️ [ADMIN] Joueur non trouvé: twitchId=${twitchId}, username=${username}`);
        }
    });

    // Quitter le lobby
    socket.on('leave-lobby', (data) => {
        const player = gameState.players.get(socket.id);
        if (player) {
            gameState.players.delete(socket.id);
            gameState.answers.delete(socket.id);
            console.log(`👋 ${data.username} a quitté le lobby`);

            const playerColor = playerColors[data.username];
            addLog('leave', { username: data.username, playerColor });

            broadcastLobbyUpdate();
        }
    });

    // 🆕 Kick un joueur manuellement (depuis l'admin)
    socket.on('kick-player', (data) => {
        const { username, twitchId } = data;
        if (!username) return;

        console.log(`🚫 Kick demandé pour: ${username}`);

        // Trouver le joueur par username ou twitchId
        let targetSocketId = null;
        let targetPlayer = null;

        for (const [socketId, player] of gameState.players.entries()) {
            if (player.username === username || player.twitchId === twitchId) {
                targetSocketId = socketId;
                targetPlayer = player;
                break;
            }
        }

        if (targetSocketId && targetPlayer) {
            // Supprimer le joueur
            gameState.players.delete(targetSocketId);
            gameState.answers.delete(targetSocketId);

            console.log(`🚫 ${username} a été kick par le streamer`);

            // Notifier le joueur qu'il a été kick
            const targetSocket = io.sockets.sockets.get(targetSocketId);
            if (targetSocket) {
                targetSocket.emit('kicked', { reason: 'Tu as été exclu par le streamer' });
                // 🆕 Ne pas déconnecter le socket pour que le joueur reçoive les événements (game-started, etc.)
            }

            // Log pour les admins
            const playerColor = playerColors[username];
            addLog('kick', { username, playerColor });

            // Mettre à jour le lobby/game pour tout le monde
            broadcastLobbyUpdate();

            // 🆕 Vérifier si la partie doit se terminer après le kick
            if (gameState.inProgress && gameState.mode === 'lives') {
                const currentAlivePlayers = getAlivePlayers();
                console.log(`🔍 Joueurs en vie après kick: ${currentAlivePlayers.length}`);
                
                if (currentAlivePlayers.length <= 1) {
                    const winner = currentAlivePlayers.length === 1 ? currentAlivePlayers[0] : null;
                    console.log(`🏁 Fin de partie après kick - Gagnant: ${winner ? winner.username : 'Aucun'}`);
                    endGame(winner);
                }
            }
        } else {
            console.log(`⚠️ Joueur ${username} non trouvé pour kick`);
        }
    });

    // Reconnexion d'un joueur (nouveau événement)
    socket.on('reconnect-player', (data) => {
        if (!gameState.isActive) {
            return socket.emit('error', { message: 'Aucune partie active' });
        }

        let existingPlayer = null;
        let oldSocketId = null;
        for (const [socketId, player] of gameState.players.entries()) {
            if (player.twitchId === data.twitchId) {
                existingPlayer = player;
                oldSocketId = socketId;
                break;
            }
        }

        if (existingPlayer) {
            const previousAnswer = gameState.answers.get(oldSocketId);

            // 🔥 Transférer les bonus
            if (oldSocketId !== socket.id) {
                const oldBonusData = gameState.playerBonuses.get(oldSocketId);
                if (oldBonusData) {
                    gameState.playerBonuses.set(socket.id, oldBonusData);
                    gameState.playerBonuses.delete(oldSocketId);
                    console.log(`🎁 Bonus transférés: ${oldSocketId} → ${socket.id}`);
                }
                
                // 🆕 Transférer les défis aussi
                const oldChallengesData = gameState.playerChallenges.get(oldSocketId);
                if (oldChallengesData) {
                    gameState.playerChallenges.set(socket.id, oldChallengesData);
                    gameState.playerChallenges.delete(oldSocketId);
                    console.log(`🎯 Défis transférés: ${oldSocketId} → ${socket.id}`);
                }
            }

            gameState.players.delete(oldSocketId);
            gameState.answers.delete(oldSocketId);

            existingPlayer.socketId = socket.id;
            gameState.players.set(socket.id, existingPlayer);


            if (previousAnswer) {
                gameState.answers.set(socket.id, previousAnswer);
            }

            delete existingPlayer.disconnectedAt;
            delete existingPlayer.disconnectedSocketId;

            // 🔄 Annuler le log "disconnect" en attente si présent
            if (existingPlayer.pendingDisconnectLog) {
                clearTimeout(existingPlayer.pendingDisconnectLog);
                delete existingPlayer.pendingDisconnectLog;
            }

            console.log(`🔄 ${data.username} reconnecté - Mode: ${gameState.mode}, Points: ${existingPlayer.points || 0}, Vies: ${existingPlayer.lives}`);

            // 🆕 Initialiser les défis SEULEMENT si pas transférés (nouveau joueur mid-game)
            if (!gameState.playerChallenges.has(socket.id) && gameState.activeChallenges.length > 0) {
                initPlayerChallenges(socket.id);
                console.log(`🎯 Nouveaux défis initialisés pour joueur reconnecté`);
            }

            const restorationData = {
                currentQuestionIndex: gameState.currentQuestionIndex,
                hasAnswered: !!previousAnswer,
                selectedAnswer: previousAnswer ? previousAnswer.answer : null,
                bonusActive: previousAnswer ? previousAnswer.bonusActive : null, // 🔥 AJOUTER ICI
                gameMode: gameState.mode,
                comboData: gameState.playerBonuses.get(socket.id) ? {
                    comboLevel: gameState.playerBonuses.get(socket.id).comboLevel,
                    comboProgress: gameState.playerBonuses.get(socket.id).comboProgress,
                    bonusInventory: gameState.playerBonuses.get(socket.id).bonusInventory
                } : null,
                challenges: getPlayerChallengesState(socket.id), // 🆕 Envoyer les défis
                bonusEnabled: gameState.bonusEnabled // 🎮 Bonus activés
            };

            if (gameState.mode === 'lives') {
                restorationData.lives = existingPlayer.lives;
                restorationData.correctAnswers = existingPlayer.correctAnswers;
            } else {
                restorationData.points = existingPlayer.points || 0;
            }

            socket.emit('player-restored', restorationData);

            // 🔄 Log "reconnect" seulement si "disconnect" avait été affiché
            const playerColor = playerColors[data.username] || assignPlayerColor(data.username);
            if (existingPlayer.disconnectLogged) {
                addLog('reconnect', { username: data.username, playerColor });
                delete existingPlayer.disconnectLogged;
            }

            // Mise à jour lobby
            broadcastLobbyUpdate();
        } else {
            socket.emit('error', {
                message: 'Vous ne pouvez pas rejoindre une partie en cours',
                canSpectate: true
            });
        }
    });


    // Répondre à une question
    socket.on('submit-answer', (data) => {
        if (!gameState.inProgress) return;

        const player = gameState.players.get(socket.id);
        if (!player) return;

        // Vérifier que le timer n'est pas expiré
        if (gameState.questionStartTime) {
            const elapsed = Math.floor((Date.now() - gameState.questionStartTime) / 1000);
            if (elapsed >= gameState.questionTime) {
                console.log(`⏱️ ${player.username} a essayé de répondre après expiration du timer`);
                return;
            }
        }

        // 🔥 FIX: En mode Points, TOUS les joueurs continuent à jouer pendant le tiebreaker
        // Seul le mode Vie bloque les joueurs éliminés (lives === 0)

        // Mode Vie - bloquer si éliminé
        if (gameState.mode === 'lives' && player.lives === 0) return;

        const responseTime = Date.now() - gameState.questionStartTime;

        gameState.answers.set(socket.id, {
            answer: data.answer,
            time: responseTime,
            bonusActive: data.bonusActive // 🔥 AJOUTER CETTE LIGNE
        });

        if (player) {
            addLog('answer', {
                username: player.username,
                playerColor: playerColors[player.username]
            });
        }

        socket.emit('answer-recorded');

        gameState.liveAnswers.set(socket.id, data.answer);
        throttledUpdateLiveAnswerStats();

        io.emit('answer-submitted', {
            socketId: socket.id,
            answeredCount: gameState.answers.size,
            totalPlayers: gameState.players.size
        });

        io.emit('player-answered', {
            username: player.username,
            answeredCount: gameState.answers.size,
            totalPlayers: gameState.players.size
        });
    });


    // 🆕 Utilisation d'un bonus
    socket.on('use-bonus', (data) => {
        if (!gameState.inProgress) return;

        const player = gameState.players.get(socket.id);
        if (!player) return;

        const { bonusType } = data;

        // Vérifier et utiliser le bonus
        const success = usePlayerBonus(socket.id, bonusType);

        if (success) {
            console.log(`✅ Bonus "${bonusType}" utilisé par ${player.username}`);

            // LOGS D'ACTIVITÉ
            const playerColor = playerColors[player.username];
            switch (bonusType) {
                case '5050':
                    addLog('bonus-5050', { username: player.username, playerColor });
                    break;
                case 'reveal':
                    addLog('bonus-joker', { username: player.username, playerColor });
                    break;
                case 'shield':
                    addLog('bonus-shield', { username: player.username, playerColor });
                    break;
                case 'doublex2':
                    addLog('bonus-x2', { username: player.username, playerColor });
                    break;
            }

            // 🔥 NOUVEAU: Stocker le Shield dans les données du joueur
            if (bonusType === 'shield') {
                player.activeShield = true;
                console.log(`🛡️ Shield marqué actif pour ${player.username}`);
            }

            // 🔥 NOUVEAU: Pour 50/50 et Reveal, envoyer la bonne réponse
            if (bonusType === '5050' || bonusType === 'reveal') {
                const correctAnswer = gameState.currentQuestion?.correctAnswer;

                if (correctAnswer) {
                    socket.emit('bonus-validated', {
                        bonusType: bonusType,
                        correctAnswer: correctAnswer
                    });

                    console.log(`📡 Bonne réponse (${correctAnswer}) envoyée à ${player.username} pour bonus ${bonusType}`);
                }
            }
        } else {
            socket.emit('bonus-used', {
                bonusType: bonusType,
                success: false,
                error: 'Bonus non disponible'
            });
        }
    });

    // ============================================
    // 💣 BOMBANIME - Socket Handlers
    // ============================================
    
    // Soumettre un nom de personnage
    socket.on('bombanime-submit-name', (data) => {
        if (!gameState.bombanime.active) return;
        
        const result = submitBombanimeName(socket.id, data.name);
        
        if (!result.success) {
            // L'erreur est déjà envoyée dans submitBombanimeName
        }
    });
    
    // 🎯 Utiliser le bonus "Perso Gratuit" - donne un personnage aléatoire non utilisé
    socket.on('bombanime-use-free-character', () => {
        if (!gameState.bombanime.active) return;
        
        const player = gameState.players.get(socket.id);
        if (!player) return;
        
        // Vérifier que c'est le tour de ce joueur
        if (player.twitchId !== gameState.bombanime.currentPlayerTwitchId) {
            socket.emit('bombanime-bonus-error', { error: 'not_your_turn' });
            return;
        }
        
        // Vérifier que le joueur a ce bonus
        const bonuses = gameState.bombanime.playerBonuses.get(player.twitchId);
        if (!bonuses || bonuses.freeCharacter <= 0) {
            socket.emit('bombanime-bonus-error', { error: 'no_bonus_available' });
            return;
        }
        
        // Obtenir un personnage aléatoire non utilisé
        const freeChar = getRandomUnusedCharacter(gameState.bombanime.serie);
        if (!freeChar) {
            socket.emit('bombanime-bonus-error', { error: 'no_character_available' });
            return;
        }
        
        // Décrémenter le bonus
        bonuses.freeCharacter--;
        
        console.log(`🎁 ${player.username} utilise Perso Gratuit: "${freeChar}" (reste: ${bonuses.freeCharacter})`);
        
        // Envoyer le personnage au joueur (il n'a plus qu'à appuyer sur Entrée)
        socket.emit('bombanime-free-character', {
            character: freeChar,
            bonusesRemaining: bonuses
        });
    });
    
    // 🎯 Utiliser le bonus "Vie Extra" - ajoute une vie (max 2)
    socket.on('bombanime-use-extra-life', () => {
        if (!gameState.bombanime.active) return;
        
        const player = gameState.players.get(socket.id);
        if (!player) return;
        
        // Vérifier que le joueur a ce bonus
        const bonuses = gameState.bombanime.playerBonuses.get(player.twitchId);
        if (!bonuses || bonuses.extraLife <= 0) {
            socket.emit('bombanime-bonus-error', { error: 'no_bonus_available' });
            return;
        }
        
        // Décrémenter le bonus
        bonuses.extraLife--;
        
        // Ajouter une vie (max 2, sinon gâché)
        const maxLives = gameState.bombanime.lives || BOMBANIME_CONFIG.DEFAULT_LIVES;
        const oldLives = player.lives;
        
        if (player.lives < maxLives) {
            player.lives++;
            console.log(`❤️ ${player.username} utilise Vie Extra: ${oldLives} -> ${player.lives} (reste: ${bonuses.extraLife})`);
        } else {
            console.log(`❤️ ${player.username} utilise Vie Extra mais déjà au max (${player.lives}/${maxLives}) - GÂCHÉ`);
        }
        
        // Notifier tout le monde de la mise à jour des vies
        io.emit('bombanime-player-lives-updated', {
            playerTwitchId: player.twitchId,
            playerUsername: player.username,
            lives: player.lives,
            playersData: getBombanimePlayersData()
        });
        
        // Envoyer confirmation au joueur
        socket.emit('bombanime-extra-life-used', {
            newLives: player.lives,
            wasWasted: oldLives >= maxLives,
            bonusesRemaining: bonuses
        });
    });
    
    // Broadcaster ce que le joueur tape en temps réel
    socket.on('bombanime-typing', (data) => {
        if (!gameState.bombanime.active) return;
        
        const player = gameState.players.get(socket.id);
        if (!player) return;
        
        // Vérifier que c'est bien le tour de ce joueur
        if (player.twitchId !== gameState.bombanime.currentPlayerTwitchId) return;
        
        // Broadcaster à tous les autres joueurs
        socket.broadcast.emit('bombanime-typing', {
            playerTwitchId: player.twitchId,
            text: data.text || ''
        });
    });
    
    // Demander l'état actuel du jeu BombAnime (pour reconnexion)
    socket.on('bombanime-get-state', () => {
        if (!gameState.bombanime.active) {
            socket.emit('bombanime-state', { active: false });
            return;
        }
        
        let player = gameState.players.get(socket.id);
        
        // 🔥 FIX: Si le joueur n'est pas trouvé par socketId, chercher par twitchId
        // (cas d'un refresh pendant la partie : le socketId a changé)
        if (!player) {
            const authUser = authenticatedUsers.get(socket.id);
            if (authUser) {
                let oldSocketId = null;
                for (const [sid, p] of gameState.players.entries()) {
                    if (p.twitchId === authUser.twitchId) {
                        player = p;
                        oldSocketId = sid;
                        break;
                    }
                }
                
                if (player && oldSocketId && oldSocketId !== socket.id) {
                    console.log(`🔄 BombAnime resync: ${player.username} transféré ${oldSocketId} → ${socket.id}`);
                    
                    // Transférer les bonus et défis
                    const oldBonusData = gameState.playerBonuses.get(oldSocketId);
                    if (oldBonusData) {
                        gameState.playerBonuses.set(socket.id, oldBonusData);
                        gameState.playerBonuses.delete(oldSocketId);
                    }
                    const oldChallengesData = gameState.playerChallenges?.get(oldSocketId);
                    if (oldChallengesData) {
                        gameState.playerChallenges.set(socket.id, oldChallengesData);
                        gameState.playerChallenges.delete(oldSocketId);
                    }
                    
                    // Transférer l'entrée joueur
                    gameState.players.delete(oldSocketId);
                    gameState.answers.delete(oldSocketId);
                    player.socketId = socket.id;
                    gameState.players.set(socket.id, player);
                    
                    // Nettoyer les flags de déconnexion
                    delete player.disconnectedAt;
                    delete player.disconnectedSocketId;
                    delete player.pendingRemoval;
                }
            }
        }
        
        const myAlphabet = player ? 
            Array.from(gameState.bombanime.playerAlphabets.get(player.twitchId) || []) : 
            [];
        
        // 🎯 Récupérer les défis et bonus du joueur
        const myChallenges = player ? getBombanimePlayerChallengesState(player.twitchId) : [];
        const myBonuses = player ? getBombanimePlayerBonuses(player.twitchId) : { freeCharacter: 0, extraLife: 0 };
        
        socket.emit('bombanime-state', {
            active: true,
            serie: gameState.bombanime.serie,
            timer: gameState.bombanime.timer,
            currentPlayerTwitchId: gameState.bombanime.currentPlayerTwitchId,
            playersOrder: gameState.bombanime.playersOrder,
            playersData: getBombanimePlayersData(),
            myAlphabet: myAlphabet,
            usedNamesCount: gameState.bombanime.usedNames.size,
            direction: gameState.bombanime.bombDirection,
            timeRemaining: gameState.bombanime.turnStartTime ? 
                Math.max(0, gameState.bombanime.timer - Math.floor((Date.now() - gameState.bombanime.turnStartTime) / 1000)) : 
                gameState.bombanime.timer,
            // 🎯 Défis et bonus
            challenges: myChallenges,
            bonuses: myBonuses
        });
    });
    
    // 🆕 TEMPORAIRE: Ajouter un joueur fictif pour les tests
    socket.on('bombanime-add-fake-player', () => {
        if (gameState.inProgress) {
            console.log('❌ Impossible d\'ajouter un joueur fictif en cours de partie');
            return;
        }
        
        // Pseudos réalistes style Twitch
        const fakeNames = [
            'xNarutoFan_99', 'SakuraChan_', 'OnePieceLover', 'ZoroSlash42',
            'LuffyGumGum', 'SasukeDark_', 'KakashiSensei', 'HinataShy',
            'GaaraOfSand', 'ItachiLegend', 'MadaraGod_', 'TobiramaH2O'
        ];
        
        // Noms de personnages longs pour tester le rendu (max 15 chars)
        const fakeCharacterNames = [
            'SASUKE UCHIHA', 'MONKEY D LUFFY', 'RORONOA ZORO', 'PORTGAS D ACE',
            'TRAFALGAR LAW', 'VINSMOKE SANJI', 'NICO ROBIN', 'DOFLAMINGO',
            'KATAKURI', 'UZUMAKI NARUTO', 'KAKASHI HATAKE', 'MADARA UCHIHA'
        ];
        
        // Trouver un nom non utilisé
        const usedNames = Array.from(gameState.players.values()).map(p => p.username);
        const availableIndex = fakeNames.findIndex(name => !usedNames.includes(name));
        
        if (availableIndex === -1) {
            console.log('❌ Plus de noms fictifs disponibles');
            return;
        }
        
        if (gameState.players.size >= 13) {
            console.log('❌ Maximum 13 joueurs atteint');
            return;
        }
        
        const availableName = fakeNames[availableIndex];
        const fakeCharacterName = fakeCharacterNames[availableIndex] || 'PERSONNAGE';
        
        const fakeId = 'fake-' + Date.now();
        const fakeTwitchId = 'fake-twitch-' + Date.now();
        
        const fakePlayer = {
            socketId: fakeId,
            odemonId: fakeId,
            odemonAvatar: '/default-avatar.png',
            odemonBgColor: '#333',
            odemonBgUrl: null,
            odemonGradient: 'none',
            odemonEmoji: null,
            twitchId: fakeTwitchId,
            username: availableName,
            lives: gameState.bombanime.lives || BOMBANIME_CONFIG.DEFAULT_LIVES,
            points: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            answered: false,
            hasAnsweredFirst: false,
            hasUsedBonus: false,
            usedBonuses: [],
            team: null,
            joinedAt: Date.now(),
            isFake: true,
            fakeCharacterName: fakeCharacterName
        };
        
        gameState.players.set(fakeId, fakePlayer);
        
        console.log(`🤖 Joueur fictif ajouté: ${availableName} avec réponse "${fakeCharacterName}" (Total: ${gameState.players.size})`);
        
        // Notifier tous les clients
        io.emit('player-joined', {
            odemonId: fakeId,
            odemonAvatar: fakePlayer.odemonAvatar,
            odemonBgColor: fakePlayer.odemonBgColor,
            odemonBgUrl: fakePlayer.odemonBgUrl,
            odemonGradient: fakePlayer.odemonGradient,
            odemonEmoji: fakePlayer.odemonEmoji,
            twitchId: fakeTwitchId,
            username: availableName,
            lives: fakePlayer.lives,
            points: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            team: null,
            isFake: true,
            fakeCharacterName: fakeCharacterName
        });
        
        io.emit('player-count', gameState.players.size);
    });

    // Déconnexion
    socket.on('disconnect', () => {
        const ip = socket.handshake.headers['x-forwarded-for']?.split(',')[0] || socket.handshake.address;
        const currentConnections = connectionsByIP.get(ip) || 1;
        if (currentConnections <= 1) {
            connectionsByIP.delete(ip);
        } else {
            connectionsByIP.set(ip, currentConnections - 1);
        }


        const player = gameState.players.get(socket.id);

        if (player) {
            const playerColor = playerColors[player.username];
            // 🔄 Délai avant d'afficher le log "disconnect" (évite le spam lors de changement d'onglet)
            player.pendingDisconnectLog = setTimeout(() => {
                addLog('disconnect', { username: player.username, playerColor });
                player.disconnectLogged = true;
                delete player.pendingDisconnectLog;
            }, 3000); // 3 secondes
        }

        // 🔥 Retirer du tracker d'authentification
        if (authenticatedUsers.has(socket.id)) {
            const user = authenticatedUsers.get(socket.id);
            console.log(`🔌 ${user.username} déconnecté (authentifié)`);
            authenticatedUsers.delete(socket.id);
        }

        if (player) {
            console.log(`🔌 ${player.username} déconnecté (socket: ${socket.id})`);

            // Si une partie est en cours, NE PAS supprimer le joueur
            if (gameState.inProgress) {
                console.log(`⏳ ${player.username} marqué comme déconnecté (reste dans la partie)`);
                player.disconnectedAt = Date.now();
                player.disconnectedSocketId = socket.id;
                // 🆕 On ne supprime plus automatiquement - l'admin peut kick manuellement si besoin
            } else {
                // 🆕 En lobby, attendre 5 secondes avant de supprimer (permet le refresh)
                // 🎴 Ne PAS supprimer l'admin-joueur sur disconnect (son socket admin reste actif)
                if (player.isAdmin) {
                    console.log(`🎴 ${player.username} (admin) déconnecté du lobby - conservé (admin-joueur)`);
                } else {
                    player.pendingRemoval = setTimeout(() => {
                        // 🔥 FIX: Si une partie a démarré entre-temps, NE PAS supprimer le joueur
                        if (gameState.inProgress) {
                            console.log(`⚠️ ${player.username} - pendingRemoval annulé (partie en cours)`);
                            delete player.pendingRemoval;
                            // Marquer comme déconnecté à la place
                            player.disconnectedAt = Date.now();
                            player.disconnectedSocketId = socket.id;
                            return;
                        }
                        
                        // Vérifier que le joueur n'a pas re-rejoint entre temps
                        const stillExists = gameState.players.get(socket.id);
                        if (stillExists && stillExists.pendingRemoval) {
                            console.log(`🗑️ ${player.username} supprimé du lobby (timeout 5s)`);
                            gameState.players.delete(socket.id);
                            gameState.answers.delete(socket.id);
                            broadcastLobbyUpdate();
                        }
                    }, 5000);
                }
            }
        }
    });
});



// ============================================
// 🆕 SYSTÈME DE BONUS
// ============================================

// Seuils de combo
const COMBO_THRESHOLDS = [3, 8, 14]; // Lvl1, Lvl2, Lvl3

// Mise à jour du combo d'un joueur (bonne réponse)
function updatePlayerCombo(socketId) {
    const bonusData = gameState.playerBonuses.get(socketId);
    if (!bonusData) return;

    // 🔥 NOUVEAU : Si déjà au niveau MAX, ne plus incrémenter
    if (bonusData.comboLevel >= 3) {
        console.log(`🎯 Joueur ${socketId} déjà au niveau MAX - Pas d'incrémentation`);
        return;
    }

    // Incrémenter le progrès
    bonusData.comboProgress++;

    console.log(`📊 Combo update: socketId=${socketId}, progress=${bonusData.comboProgress}, level=${bonusData.comboLevel}`);

    // Vérifier si on atteint un nouveau niveau
    const currentLevel = bonusData.comboLevel;
    if (currentLevel < 3) {
        const threshold = COMBO_THRESHOLDS[currentLevel];

        if (bonusData.comboProgress >= threshold) {
            bonusData.comboLevel++;

            // Débloquer le bonus correspondant - 🔥 REFONTE: Incrémenter l'inventaire
            let bonusType = '';
            if (bonusData.comboLevel === 1) {
                bonusType = '5050';
            } else if (bonusData.comboLevel === 2) {
                bonusType = 'reveal';
            } else if (bonusData.comboLevel === 3) {
                bonusType = gameState.mode === 'lives' ? 'shield' : 'doublex2';
            }

            if (bonusType) {
                bonusData.bonusInventory[bonusType]++;
                console.log(`🎉 Level up ! Joueur ${socketId}: Lvl${bonusData.comboLevel}, Bonus: ${bonusType} (x${bonusData.bonusInventory[bonusType]})`);
            }
        }
    }

    // 🔥 TOUJOURS envoyer combo-updated après CHAQUE bonne réponse
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
        socket.emit('combo-updated', {
            comboLevel: bonusData.comboLevel,
            comboProgress: bonusData.comboProgress,
            bonusInventory: bonusData.bonusInventory
        });
        console.log(`📡 combo-updated envoyé: level=${bonusData.comboLevel}, progress=${bonusData.comboProgress}, inventory=${JSON.stringify(bonusData.bonusInventory)}`);
    }
}

// Reset du combo d'un joueur (mauvaise réponse ou AFK)
function resetPlayerCombo(socketId) {
    const bonusData = gameState.playerBonuses.get(socketId);
    if (!bonusData) return;

    // Reset uniquement la progression, pas le niveau ni les bonus
    // (on garde les bonus débloqués pour toute la partie)

    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
        socket.emit('combo-updated', {
            comboLevel: bonusData.comboLevel,
            comboProgress: bonusData.comboProgress,
            bonusInventory: bonusData.bonusInventory
        });
    }
}

// Utilisation d'un bonus - 🔥 REFONTE: Décrémenter l'inventaire
function usePlayerBonus(socketId, bonusType) {
    const bonusData = gameState.playerBonuses.get(socketId);
    if (!bonusData) return false;

    // Vérifier que le bonus est disponible dans l'inventaire
    if (!bonusData.bonusInventory[bonusType] || bonusData.bonusInventory[bonusType] <= 0) {
        return false;
    }

    // Décrémenter l'inventaire
    bonusData.bonusInventory[bonusType]--;

    console.log(`✅ Bonus "${bonusType}" utilisé par joueur ${socketId} (reste: ${bonusData.bonusInventory[bonusType]})`);

    return true;
}

// Reset des bonus et défis en fin de partie
function resetAllBonuses() {
    gameState.playerBonuses.clear();
    gameState.activeChallenges = [];
    gameState.playerChallenges.clear();
    console.log('🔄 Reset de tous les bonus et défis');
}


// FONCTION: Générer les données communes pour game-ended
async function generateGameEndedData() {
    const playersData = Array.from(gameState.players.values()).map(p => ({
        twitchId: p.twitchId,
        username: p.username,
        lives: p.lives,
        points: p.points || 0,
        correctAnswers: p.correctAnswers,
        isLastGlobalWinner: p.twitchId === lastGlobalWinner,
        team: p.team || null // 🆕 Inclure l'équipe pour mode Rivalité
    }));

    const topPlayers = [];

    return { playersData, topPlayers };
}


// FONCTION: Reset complet de l'état du jeu
function resetGameState() {
    gameState.inProgress = false;
    gameState.endingGame = false; // 🆕 Reset du flag de finalisation
    gameState.currentGameId = null;
    gameState.currentQuestionIndex = 0;
    gameState.currentQuestion = null;
    gameState.showResults = false;
    gameState.lastQuestionResults = null;
    gameState.questionStartTime = null;
    gameState.gameStartTime = null;
    gameState.initialPlayerCount = 0; // 🆕 Reset du compteur initial
    gameState.players.clear();
    gameState.answers.clear();
    pendingJoins.clear(); // 🔓 Reset les réservations
    gameState.isTiebreaker = false;
    gameState.tiebreakerPlayers = [];
    gameState.isRivalryTiebreaker = false; // 🆕 Reset tiebreaker Rivalry
    
    // 🆕 Annuler le timeout du tiebreaker rivalry
    if (gameState.rivalryTiebreakerTimeout) {
        clearTimeout(gameState.rivalryTiebreakerTimeout);
        gameState.rivalryTiebreakerTimeout = null;
    }
    if (gameState.rivalryRevealTimeout) {
        clearTimeout(gameState.rivalryRevealTimeout);
        gameState.rivalryRevealTimeout = null;
    }
    if (gameState.rivalryEndGameTimeout) {
        clearTimeout(gameState.rivalryEndGameTimeout);
        gameState.rivalryEndGameTimeout = null;
    }

    gameState.players.forEach(player => {
        player.activeShield = false;
    });

    resetAllBonuses();


    // 🔥 COMMENTER CES LIGNES
    // gameState.isActive = false;
    // io.emit('game-deactivated');
    // console.log('🔒 Lobby fermé automatiquement après la fin de partie');

    // 🆕 Annuler le timeout auto mode si actif
    if (gameState.autoModeTimeout) {
        clearTimeout(gameState.autoModeTimeout);
        gameState.autoModeTimeout = null;
    }

    // 🆕 OPTIONNEL : Log pour savoir que le jeu reste ouvert
    console.log('✅ Partie terminée - Lobby reste ouvert pour la prochaine partie');
}




function updateLiveAnswerStats() {
    const answerCounts = {};

    gameState.liveAnswers.forEach((answerIndex) => {
        if (!answerCounts[answerIndex]) {
            answerCounts[answerIndex] = 0;
        }
        answerCounts[answerIndex]++;
    });

    io.emit('live-answer-stats', {
        answerCounts: answerCounts,
        answeredCount: gameState.liveAnswers.size,
        totalPlayers: gameState.players.size
    });
}

// 🆕 Version throttlée - appeler celle-ci à la place
function throttledUpdateLiveAnswerStats() {
    const now = Date.now();

    // Si assez de temps s'est écoulé, envoyer immédiatement
    if (now - lastStatsUpdate >= STATS_THROTTLE_MS) {
        lastStatsUpdate = now;
        updateLiveAnswerStats();
        pendingStatsUpdate = false;
    }
    // Sinon, programmer un envoi différé (si pas déjà programmé)
    else if (!pendingStatsUpdate) {
        pendingStatsUpdate = true;
        const delay = STATS_THROTTLE_MS - (now - lastStatsUpdate);

        setTimeout(() => {
            lastStatsUpdate = Date.now();
            updateLiveAnswerStats();
            pendingStatsUpdate = false;
        }, delay);
    }
}





function addLog(type, data) {
    const log = {
        id: Date.now() + Math.random(),
        type: type,
        data: data,
        timestamp: Date.now()
    };

    activityLogs.push(log);
    if (activityLogs.length > MAX_LOGS) {
        activityLogs.shift();
    }

    io.emit('activity-log', log);
}

function resetLogs() {
    activityLogs = [];
    playerColors = {};
    io.emit('logs-reset');
}

function assignPlayerColor(username) {
    if (!playerColors[username]) {
        const usedColors = Object.values(playerColors);
        const availableColors = PLAYER_COLORS.filter(c => !usedColors.includes(c));
        playerColors[username] = availableColors.length > 0
            ? availableColors[0]
            : PLAYER_COLORS[Object.keys(playerColors).length % PLAYER_COLORS.length];
    }
    return playerColors[username];
}







// ============================================
// Gestion des erreurs
// ============================================




process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled rejection:', error);
});


process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error);
    process.exit(1);
});