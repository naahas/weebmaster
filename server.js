// ============================================
// WEEBMASTER - Server Principal - TIEBREAKER FIX
// ============================================

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { Server } = require('socket.io');
const axios = require('axios');
const { db, supabase } = require('./dbs');

const app = express();
const PORT = process.env.PORT || 7000;

const MAX_GAMES_BEFORE_RESET = 5;

let lastRefreshPlayersTime = 0;
const REFRESH_COOLDOWN_MS = 20000;

let connectionsByIP = new Map();
const MAX_CONNECTIONS_PER_IP = 5;

let activityLogs = [];
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


// config/serieFilters.js
const SERIE_FILTERS = {
    tout: {
        name: 'Tout',
        icon: '🌍',
        series: []
    },
    big3: {
        name: 'Big 3',
        icon: '👑',
        series: ['One Piece', 'Naruto', 'Bleach']
    },
    mainstream: {
        name: 'Mainstream',
        icon: '⭐',
        series: [
            'One Piece', 'Naruto', 'Bleach', 'Hunter x Hunter',
            'Shingeki no Kyojin', 'Fullmetal Alchemist', 'Death Note',
            'Dragon Ball', 'Demon Slayer', 'Jojo\'s Bizarre Adventure', 'My Hero Academia',
            'Fairy Tail', 'Tokyo Ghoul', 'Nanatsu no Taizai', 'Kuroko no Basket'
        ]
    },
    onepiece: {
        name: 'One Piece',
        icon: '🏴‍☠️',
        series: ['One Piece']
    },
    naruto: {
        name: 'Naruto',
        icon: '🍥',
        series: ['Naruto']
    },
    dragonball: {
        name: 'Dragon Ball',
        icon: '🐉',
        series: ['Dragon Ball']
    },

    bleach: {
        name: 'Bleach',
        icon: '⚔️',
        series: ['Bleach']
    }
};


// Détection automatique de l'URL de redirection
const TWITCH_REDIRECT_URI = process.env.TWITCH_REDIRECT_URI ||
    (process.env.NODE_ENV === 'production'
        ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME || process.env.VERCEL_URL || 'shonenmaster.com'}/auth/twitch/callback`
        : `http://localhost:${PORT}/auth/twitch/callback`);

// ============================================
// Middleware
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('trust proxy', 1);

app.use(session({
    secret: process.env.SESSION_SECRET || 'pikine-secret-2025',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24h
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    },
    proxy: process.env.NODE_ENV === 'production'
}));


app.use('/admin/*', (req, res, next) => {
    if (req.session.isAdmin) {
        // Si admin normal
        if (req.session.id === activeAdminSession) {
            lastAdminActivity = Date.now();
        }
        // Si master, ne pas tracker (pas de timeout pour les devs)
        if (req.session.isMasterAdmin) {
            // Les masters n'ont pas de timeout
        }
    }
    next();
});

// ============================================
// Routes AUTH TWITCH
// ============================================

// Route pour démarrer l'auth Twitch
app.get('/auth/twitch', (req, res) => {
    const twitchAuthUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${process.env.TWITCH_CLIENT_ID}&redirect_uri=${encodeURIComponent(TWITCH_REDIRECT_URI)}&response_type=code&scope=user:read:email`;
    res.redirect(twitchAuthUrl);
});

// Callback Twitch OAuth
app.get('/auth/twitch/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.redirect('/?error=auth_failed');
    }

    try {
        // Échanger le code contre un token
        const tokenResponse = await axios.post('https://id.twitch.tv/oauth2/token', null, {
            params: {
                client_id: process.env.TWITCH_CLIENT_ID,
                client_secret: process.env.TWITCH_CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: TWITCH_REDIRECT_URI
            }
        });

        const accessToken = tokenResponse.data.access_token;

        // Récupérer les infos utilisateur
        const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Client-Id': process.env.TWITCH_CLIENT_ID
            }
        });

        const twitchUser = userResponse.data.data[0];

        // Créer ou mettre à jour l'utilisateur dans la DB
        await db.createOrUpdateUser(twitchUser.id, twitchUser.display_name);

        // Stocker dans la session
        req.session.twitchId = twitchUser.id;
        req.session.username = twitchUser.display_name;
        req.session.isAuthenticated = true;

        res.redirect('/');
    } catch (error) {
        console.error('❌ Erreur auth Twitch:', error.message);
        res.redirect('/?error=auth_failed');
    }
});

// Route de déconnexion
app.get('/auth/logout', (req, res) => {
    // Si c'est l'admin normal qui se déconnecte
    if (req.session.id === activeAdminSession) {
        activeAdminSession = null;
        activeAdminLoginTime = null;
        console.log('🔓 Slot admin normal libéré (logout)');
    }

    // Si c'est un master qui se déconnecte
    if (req.session.isMasterAdmin) {
        masterAdminSessions.delete(req.session.id);
        console.log(`👑 Master déconnecté (${masterAdminSessions.size} restant(s))`);
    }

    req.session.destroy();
    res.redirect('/');
});

// Route pour vérifier l'état de l'auth
app.get('/auth/status', (req, res) => {
    if (req.session.isAuthenticated) {
        res.json({
            authenticated: true,
            username: req.session.username,
            twitchId: req.session.twitchId
        });
    } else {
        res.json({ authenticated: false });
    }
});


// Route pour obtenir l'état actuel du jeu (pour reconnexion)
app.get('/game/state', (req, res) => {
    let timeRemaining = null;
    if (gameState.questionStartTime && gameState.inProgress) {
        const elapsed = Math.floor((Date.now() - gameState.questionStartTime) / 1000);
        timeRemaining = Math.max(0, gameState.questionTime - elapsed);
    }

    const playersData = Array.from(gameState.players.values()).map(player => {
        // 🔥 FIX: Chercher les bonus par twitchId au lieu de socketId (qui change à chaque refresh)
        let comboData = null;
        for (const [sid, bonusData] of gameState.playerBonuses.entries()) {
            const bonusPlayer = gameState.players.get(sid);
            if (bonusPlayer && bonusPlayer.twitchId === player.twitchId) {
                comboData = {
                    comboLevel: bonusData.comboLevel,
                    comboProgress: bonusData.comboProgress,
                    availableBonuses: bonusData.availableBonuses,
                    usedBonuses: bonusData.usedBonuses
                };
                break;
            }
        }

        return {
            socketId: player.socketId,
            twitchId: player.twitchId,
            username: player.username,
            lives: gameState.mode === 'lives' ? player.lives : null,
            points: gameState.mode === 'points' ? (player.points || 0) : null,
            correctAnswers: player.correctAnswers,
            hasAnswered: gameState.answers.has(player.socketId),
            selectedAnswer: gameState.answers.get(player.socketId)?.answer || null,
            comboData: comboData
        };
    });

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
        isTiebreaker: gameState.isTiebreaker,
        liveAnswerCounts: answerCounts,
        answeredCount: gameState.liveAnswers.size,
        autoMode: gameState.autoMode,
        tiebreakerPlayers: gameState.isTiebreaker
            ? Array.from(gameState.players.values())
                .filter(p => gameState.tiebreakerPlayers.includes(p.twitchId))
                .map(p => ({ twitchId: p.twitchId, username: p.username }))
            : []
    });
});

// ============================================
// Fichiers statiques (APRÈS les routes API)
// ============================================
app.use(express.static('src/html'));
app.use(express.static('src/style'));
app.use(express.static('src/sound'));
app.use(express.static('src/img'));
app.use(express.static('src/script'));


let activeAdminSession = null; // Session de l'admin connecté
let activeAdminLoginTime = null; // Timestamp de connexion
let masterAdminSessions = new Set();


const MASTER_PASSWORD = process.env.MASTER_ADMIN_PASSWORD || 'cc';
const ADMIN_TIMEOUT_MS = 10 * 60 * 1000;


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
    lastQuestionResults: null,

    recentSeries: [],

    mode: 'lives',
    lives: 3,
    questionTime: 10,
    answersCount: 4,
    questionsCount: 20,
    usedQuestionIds: [],

    liveAnswers: new Map(),

    // Tiebreaker
    isTiebreaker: false,
    tiebreakerPlayers: [],

    difficultyMode: 'croissante',
    lastDifficulty: null,

    autoMode: false,
    autoModeTimeout: null,

    serieFilter: 'tout',

    playerBonuses: new Map()
};

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
        // 🆕 MODE ALÉATOIRE - Éviter 2 fois la même difficulté
        const difficulties = ['veryeasy', 'easy', 'medium', 'hard', 'veryhard', 'extreme'];

        // Filtrer pour éviter la dernière difficulté utilisée
        const availableDifficulties = gameState.lastDifficulty
            ? difficulties.filter(d => d !== gameState.lastDifficulty)
            : difficulties;

        // Piocher aléatoirement
        const randomDifficulty = availableDifficulties[Math.floor(Math.random() * availableDifficulties.length)];
        gameState.lastDifficulty = randomDifficulty;
        return randomDifficulty;
    }

    // MODE CROISSANTE (logique actuelle)
    if (gameState.mode === 'lives') {
        if (questionNumber <= 7) return 'veryeasy';
        if (questionNumber <= 15) return 'easy';
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
// Routes ADMIN
// ============================================

// Page admin
app.get('/admin', (req, res) => {
    res.sendFile(__dirname + '/src/html/admin.html');
});

// Login admin
app.post('/admin/login', (req, res) => {
    const { password, masterOverride } = req.body;

    // ========== CAS 1 : Master override (toi le dev) ==========
    if (masterOverride && masterOverride === MASTER_PASSWORD) {
        req.session.isAdmin = true;
        req.session.isMasterAdmin = true;

        // Ajouter à la liste des masters connectés (SANS déconnecter le streamer)
        masterAdminSessions.add(req.session.id);
        lastAdminActivity = Date.now();

        req.session.save((err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Erreur de session' });
            }
            console.log(`👑 MASTER ADMIN connecté (${masterAdminSessions.size} master(s) actif(s))`);
            res.json({
                success: true,
                isMaster: true,
                canObserve: true // Indique que c'est un mode observation
            });
        });
        return;
    }

    // ========== CAS 2 : Login normal ==========
    if (password === process.env.ADMIN_PASSWORD) {

        // ⚠️ Vérifier si un admin NORMAL est déjà connecté
        if (activeAdminSession && activeAdminSession !== req.session.id) {
            const minutesConnected = Math.floor((Date.now() - activeAdminLoginTime) / 60000);
            return res.status(409).json({
                success: false,
                error: 'admin_already_connected',
                message: '',
                connectedSince: minutesConnected,
                requiresMaster: true
            });
        }

        // Sinon, autoriser la connexion normale
        req.session.isAdmin = true;
        req.session.isMasterAdmin = false; // Pas un master
        activeAdminSession = req.session.id;
        activeAdminLoginTime = Date.now();
        lastAdminActivity = Date.now();

        req.session.save((err) => {
            if (err) {
                console.error('❌ Erreur sauvegarde session:', err);
                return res.status(500).json({ success: false, message: 'Erreur de session' });
            }
            console.log('✅ Admin normal connecté - Slot pris');
            res.json({ success: true, isMaster: false });
        });
        return;
    }

    // ========== CAS 3 : Mot de passe incorrect ==========
    res.status(401).json({ success: false, message: 'Mot de passe incorrect' });
});

// Vérifier si admin
app.get('/admin/check', (req, res) => {
    res.json({ isAdmin: req.session.isAdmin === true });
});

// Vérifier l'authentification admin (utilisé par le nouveau panel)
app.get('/admin/auth', (req, res) => {
    res.json({ authenticated: req.session.isAdmin === true });
});

// Activer/désactiver le jeu
app.post('/admin/toggle-game', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé - Session expirée' });
    }

    gameState.isActive = !gameState.isActive;

    if (gameState.isActive) {
        console.log('✅ Jeu activé - Lobby ouvert');

        resetLogs();

        // Reset la grille des joueurs à l'ouverture du lobby
        gameState.players.clear();
        gameState.answers.clear();
        gameState.currentQuestionIndex = 0;
        gameState.currentQuestion = null;
        gameState.showResults = false;
        gameState.lastQuestionResults = null;
        gameState.questionStartTime = null;
        gameState.gameStartTime = null;
        gameState.inProgress = false;
        gameState.currentGameId = null;

        // 🔥 NOUVEAU: Reset tiebreaker
        gameState.isTiebreaker = false;
        gameState.tiebreakerPlayers = [];

        io.emit('game-activated', {
            lives: gameState.lives,
            questionTime: gameState.questionTime
        });
    } else {
        console.log('❌ Jeu désactivé');

        // Reset complet de l'état si une partie était en cours
        if (gameState.inProgress) {
            console.log('⚠️ Partie en cours annulée - Reset de l\'état');
        }

        gameState.inProgress = false;
        gameState.currentGameId = null;
        gameState.currentQuestionIndex = 0;
        gameState.currentQuestion = null;
        gameState.showResults = false;
        gameState.lastQuestionResults = null;
        gameState.players.clear();
        gameState.answers.clear();
        gameState.questionStartTime = null;
        gameState.gameStartTime = null;

        gameState.playerBonuses.clear();

        io.emit('game-deactivated');
    }

    res.json({ isActive: gameState.isActive });
});

// Mettre à jour les paramètres du jeu (vies et temps)
app.post('/admin/update-settings', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

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
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    const { lives } = req.body;
    gameState.lives = parseInt(lives);

    console.log(`⚙️ Vies mises à jour: ${gameState.lives}❤️`);

    // Mettre à jour les vies de tous les joueurs déjà connectés dans le lobby
    if (!gameState.inProgress && gameState.players.size > 0) {
        gameState.players.forEach(player => {
            player.lives = gameState.lives;
        });

        // Notifier l'admin pour rafraîchir la grille joueurs
        io.emit('lobby-update', {
            playerCount: gameState.players.size,
            lives: gameState.lives,
            questionTime: gameState.questionTime,
            players: Array.from(gameState.players.values()).map(p => ({
                twitchId: p.twitchId,
                username: p.username,
                lives: p.lives
            }))
        });

        console.log(`✅ Vies mises à jour pour ${gameState.players.size} joueur(s) dans le lobby`);
    }

    res.json({ success: true, lives: gameState.lives });
});

// Route séparée pour changer le temps par question
app.post('/admin/set-time', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

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
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

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
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

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

    try {
        // 🔥 NOUVEAU: Vérifier si on a assez de questions AVANT de démarrer
        const questionsNeeded = gameState.mode === 'points' ? gameState.questionsCount : 50; // 50 pour mode Vie (estimation haute)

        const usedQuestionIds = await db.getUsedQuestionIds();
        const availableQuestionsCount = await db.getAvailableQuestionsCount(
            gameState.serieFilter,
            usedQuestionIds
        );

        console.log(`📊 Questions disponibles: ${availableQuestionsCount}, Besoin: ${questionsNeeded}`);

        // 🔥 Si pas assez de questions, reset auto
        if (availableQuestionsCount < questionsNeeded) {
            console.log(`⚠️ Pas assez de questions (${availableQuestionsCount} < ${questionsNeeded}), reset automatique de l'historique...`);
            await db.resetUsedQuestions();
            gameState.usedQuestionIds = []; // Reset aussi la liste en mémoire
            console.log('✅ Historique réinitialisé - Toutes les questions sont à nouveau disponibles');
        }

        // Reset automatique tous les 5 jeux (système existant)
        const completedGames = await db.getCompletedGamesCount();
        if (completedGames > 0 && completedGames % MAX_GAMES_BEFORE_RESET === 0) {
            console.log(`🔄 ${completedGames} parties terminées, reset automatique de l'historique...`);
            await db.resetUsedQuestions();
            gameState.usedQuestionIds = [];
        }

        const game = await db.createGame(totalPlayers);

        gameState.inProgress = true;
        gameState.currentGameId = game.id;
        gameState.currentQuestionIndex = 0;
        gameState.gameStartTime = Date.now();
        gameState.showResults = false;
        gameState.lastQuestionResults = null;
        gameState.recentSeries = [];

        const playerCount = gameState.players.size;
        addLog('game-start', { playerCount });

        // 🔥 Recharger les IDs utilisés (peut être vide si reset)
        gameState.usedQuestionIds = await db.getUsedQuestionIds();

        gameState.playerBonuses.clear();
        console.log('🔄 Bonus reset pour nouvelle partie');

        // Initialiser les joueurs selon le mode
        gameState.players.forEach((player, socketId) => {
            if (gameState.mode === 'lives') {
                player.lives = gameState.lives;
                player.correctAnswers = 0;
            } else {
                player.points = 0;
            }

            // 🆕 Initialiser les bonus du joueur
            gameState.playerBonuses.set(socketId, {
                comboLevel: 0,
                comboProgress: 0,
                availableBonuses: [],
                usedBonuses: []
            });
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
                    questionsCount: gameState.mode === 'points' ? gameState.questionsCount : null
                });
            } else {
                socket.emit('game-started', {
                    totalPlayers,
                    isParticipating: false,
                    gameMode: gameState.mode
                });
            }
        });

        res.json({ success: true, gameId: game.id, mode: gameState.mode });
    } catch (error) {
        console.error('❌ Erreur démarrage partie:', error);
        res.status(500).json({ error: error.message });
    }
});


// Route pour changer le mode de jeu
app.post('/admin/set-mode', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

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

    io.emit('lobby-update', {
        playerCount: gameState.players.size,
        mode: gameState.mode,
        lives: gameState.lives,
        questionTime: gameState.questionTime,
        players: Array.from(gameState.players.values()).map(p => ({
            twitchId: p.twitchId,
            username: p.username,
            lives: mode === 'lives' ? p.lives : null,
            points: mode === 'points' ? p.points : null
        }))
    });

    res.json({ success: true, mode: gameState.mode });
});

// Route pour changer le nombre de questions (Mode Points)
app.post('/admin/set-questions', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

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


// Route pour changer le mode de difficulté
app.post('/admin/set-difficulty-mode', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

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


// Route pour obtenir les statistiques des séries (nombre de questions)
app.get('/admin/serie-stats', async (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    try {
        const allQuestions = await db.getAllQuestions();

        // Compter les séries uniques
        const uniqueSeries = new Set(allQuestions.map(q => q.serie).filter(s => s));
        const totalSeries = uniqueSeries.size;

        const stats = {};

        // 🔥 AUTOMATIQUE: Générer les stats pour chaque filtre dans SERIE_FILTERS
        for (const [filterId, filterConfig] of Object.entries(SERIE_FILTERS)) {
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
// Route pour changer le filtre série
app.post('/admin/set-serie-filter', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    // Bloquer si une partie est en cours
    if (gameState.inProgress) {
        return res.status(400).json({
            error: 'Impossible de changer le filtre pendant une partie',
            blocked: true
        });
    }

    const { filter } = req.body;

    // 🔥 AUTOMATIQUE: Validation basée sur SERIE_FILTERS
    if (!SERIE_FILTERS[filter]) {
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
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    gameState.autoMode = !gameState.autoMode;
    console.log(`⚙️ Mode Auto ${gameState.autoMode ? 'activé' : 'désactivé'}`);

    io.emit('game-config-updated', {
        mode: gameState.mode,
        lives: gameState.lives,
        questionTime: gameState.questionTime,
        answersCount: gameState.answersCount,
        questionsCount: gameState.questionsCount,
        difficultyMode: gameState.difficultyMode,
        autoMode: gameState.autoMode // 🆕
    });

    res.json({ success: true, autoMode: gameState.autoMode });
});

// Route pour forcer le déclenchement du mode auto (si activé pendant résultats)
app.post('/admin/trigger-auto-next', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

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
                shouldApplySerieCooldown() ? gameState.recentSeries : []  // 🆕
            );


            if (questions.length === 0) {
                console.error('❌ Mode Auto : Aucune question disponible');
                return;
            }

            const question = questions[0];
            addToRecentSeries(question.serie);
            await db.addUsedQuestion(question.id);
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
                timeLimit: gameState.questionTime
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

            io.emit('new-question', questionData);

            setTimeout(() => {
                if (gameState.inProgress) {
                    revealAnswers(newCorrectIndex);
                }
            }, gameState.questionTime * 1000);

        } catch (error) {
            console.error('❌ Erreur trigger auto:', error);
        }
    }, 3000);

    res.json({ success: true });
});


// Route pour forcer le refresh de tous les joueurs AUTHENTIFIÉS
app.post('/admin/refresh-players', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

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
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

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
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    try {
        await db.resetUsedQuestions();
        console.log('🔄 Historique des questions réinitialisé manuellement');
        res.json({ success: true, message: 'Historique réinitialisé' });
    } catch (error) {
        console.error('❌ Erreur reset questions:', error);
        res.status(500).json({ error: error.message });
    }
});

// Passer à la question suivante
app.post('/admin/next-question', async (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    if (!gameState.inProgress) {
        return res.status(400).json({ error: 'Aucune partie en cours' });
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
            shouldApplySerieCooldown() ? gameState.recentSeries : []  // 🆕
        );


        if (questions.length === 0) {
            return res.status(404).json({ error: 'Aucune question disponible' });
        }

        const question = questions[0];
        addToRecentSeries(question.serie);

        // 🔥 DEBUG: Afficher la série de la question retournée
        console.log(`📌 Question série: ${question.serie}, difficulté: ${difficulty}`);

        await db.addUsedQuestion(question.id);
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
            timeLimit: gameState.questionTime
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


app.post('/admin/logout-silent', (req, res) => {
    if (req.session.id === activeAdminSession) {
        activeAdminSession = null;
        activeAdminLoginTime = null;
        console.log('🔓 Slot admin normal libéré (silent)');
    }

    if (req.session.isMasterAdmin) {
        masterAdminSessions.delete(req.session.id);
        console.log(`👑 Master déconnecté (silent) (${masterAdminSessions.size} restant(s))`);
    }

    req.session.destroy();
    res.json({ success: true });
});


// Vérifier le statut de connexion admin
app.get('/admin/connection-status', (req, res) => {
    if (!req.session.isAdmin) {
        return res.json({ connected: false });
    }

    res.json({
        connected: true,
        isMaster: req.session.isMasterAdmin || false,
        hasControl: req.session.id === activeAdminSession,
        normalAdminConnected: !!activeAdminSession,
        mastersConnected: masterAdminSessions.size
    });
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
                points: player.points || 0,
                status: status,
                responseTime: playerAnswer?.time || null,
                isCorrect: isCorrect,
                pointsEarned: isCorrect ? getPointsForDifficulty(gameState.currentQuestion.difficulty) : 0 // 🔥 NOUVEAU
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
                points: player.points || 0,
                status: status,
                responseTime: playerAnswer?.time || null,
                isCorrect: isCorrect,
                shieldUsed: hasShield // 🔥 Indiquer si le Shield a été utilisé
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
        points: player.points || 0
    }));

    const resultsData = {
        correctAnswer,
        stats,
        eliminatedCount: eliminatedThisRound,
        remainingPlayers: alivePlayersAfter.length,
        players: playersDetails,
        playersData: playersData,
        gameMode: gameState.mode
    };

    gameState.showResults = true;
    gameState.lastQuestionResults = resultsData;

    io.emit('question-results', resultsData);

    // Vérifier fin de partie selon le mode
    if (gameState.mode === 'lives') {
        // Recalculer les joueurs en vie APRÈS les mises à jour
        const currentAlivePlayers = getAlivePlayers();
        console.log(`🔍 Joueurs en vie après cette question: ${currentAlivePlayers.length}`);

        if (currentAlivePlayers.length <= 1) {
            // 0 ou 1 joueur restant = fin de partie
            const winner = currentAlivePlayers.length === 1 ? currentAlivePlayers[0] : null;
            console.log(`🏁 Fin de partie mode vie - Gagnant: ${winner ? winner.username : 'Aucun'}`);
            endGame(winner);
            return; // 🔥 IMPORTANT: Arrêter ici pour ne pas continuer avec le mode auto
        }
    } else if (gameState.mode === 'points' && gameState.currentQuestionIndex >= gameState.questionsCount) {
        // Terminer automatiquement après la dernière question
        setTimeout(() => {
            endGameByPoints();
        }, 100);
    }


    // 🆕 MODE AUTO : Passer automatiquement à la question suivante après 3s
    if (gameState.autoMode && gameState.inProgress) {
        console.log('⏱️ Mode Auto : Question suivante dans 3s...');

        // Annuler le timeout précédent si existant
        if (gameState.autoModeTimeout) {
            clearTimeout(gameState.autoModeTimeout);
        }

        gameState.autoModeTimeout = setTimeout(async () => {
            if (!gameState.inProgress) return; // Sécurité : vérifier que la partie est toujours en cours

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
                    shouldApplySerieCooldown() ? gameState.recentSeries : []  // 🆕
                );

                if (questions.length === 0) {
                    console.error('❌ Aucune question disponible (mode auto)');
                    return;
                }

                const question = questions[0];
                addToRecentSeries(question.serie);
                await db.addUsedQuestion(question.id);
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
                    timeLimit: gameState.questionTime
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

                io.emit('new-question', questionData);

                setTimeout(() => {
                    if (gameState.inProgress) {
                        revealAnswers(newCorrectIndex);
                    }
                }, gameState.questionTime * 1000);

            } catch (error) {
                console.error('❌ Erreur mode auto:', error);
            }
        }, 3000); // 3 secondes
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
        points: player.points || 0
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

            if (winner && winner.points > 0) {
                await db.endGame(
                    gameState.currentGameId,
                    winner.twitchId,
                    gameState.currentQuestionIndex,
                    duration
                );
                await db.updateUserStats(winner.twitchId, true, 1);

                addLog('game-end', { winner: winner.username });

                const winnerUser = await db.getUserByTwitchId(winner.twitchId);

                const winnerData = {
                    username: winner.username,
                    points: winner.points || 0,
                    totalVictories: winnerUser ? winnerUser.total_victories : 1
                };

                console.log(`🏆 Gagnant: ${winner.username} avec ${winner.points} points`);

                // Mettre à jour les stats des perdants
                let placement = 2;
                for (const player of sortedPlayers.slice(1)) {
                    await db.updateUserStats(player.twitchId, false, placement++);
                }

                // Créer le podium Top 3
                const podium = sortedPlayers.slice(0, 3).map((player, index) => ({
                    rank: index + 1,
                    username: player.username,
                    points: player.points || 0
                }));

                io.emit('game-ended', {
                    winner: winnerData,
                    podium: podium,
                    duration,
                    totalQuestions: gameState.currentQuestionIndex,
                    gameMode: 'points'
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
            shouldApplySerieCooldown() ? gameState.recentSeries : []  // 🆕
        );


        if (questions.length === 0) {
            console.error('❌ Aucune question extreme disponible pour tiebreaker');
            // Fallback: terminer avec égalité
            await endGameWithTie();
            return;
        }

        const question = questions[0];
        addToRecentSeries(question.serie);
        await db.addUsedQuestion(question.id);
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
            isTiebreaker: true
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
            // Enregistrer la victoire
            await db.endGame(
                gameState.currentGameId,
                winner.twitchId,
                gameState.currentQuestionIndex,
                duration
            );
            await db.updateUserStats(winner.twitchId, true, 1);

            const winnerUser = await db.getUserByTwitchId(winner.twitchId);

            const winnerData = {
                username: winner.username,
                points: winner.points || 0,
                totalVictories: winnerUser ? winnerUser.total_victories : 1
            };

            // Mettre à jour les stats des perdants
            const allPlayers = Array.from(gameState.players.values())
                .sort((a, b) => (b.points || 0) - (a.points || 0));

            let placement = 2;
            for (const player of allPlayers) {
                if (player.twitchId !== winner.twitchId) {
                    await db.updateUserStats(player.twitchId, false, placement++);
                }
            }

            // Créer le podium Top 3
            const podium = allPlayers.slice(0, 3).map((player, index) => ({
                rank: index + 1,
                username: player.username,
                points: player.points || 0
            }));

            io.emit('game-ended', {
                winner: winnerData,
                podium: podium,
                duration,
                totalQuestions: gameState.currentQuestionIndex,
                gameMode: 'points'
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


// FONCTION: Terminer avec égalité (fallback si plus de questions)
async function endGameWithTie() {
    const duration = Math.floor((Date.now() - gameState.gameStartTime) / 1000);

    const sortedPlayers = Array.from(gameState.players.values())
        .sort((a, b) => (b.points || 0) - (a.points || 0));

    const maxPoints = sortedPlayers[0]?.points || 0;
    const winners = sortedPlayers.filter(p => p.points === maxPoints);

    await db.endGame(
        gameState.currentGameId,
        null,
        gameState.currentQuestionIndex,
        duration
    );

    for (const winner of winners) {
        await db.updateUserStats(winner.twitchId, true, 1);
    }

    let placement = winners.length + 1;
    for (const player of sortedPlayers.slice(winners.length)) {
        await db.updateUserStats(player.twitchId, false, placement++);
    }

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
        points: player.points || 0
    }));

    io.emit('game-ended', {
        winner: winnerData,
        podium: podium,
        duration,
        totalQuestions: gameState.currentQuestionIndex,
        gameMode: 'points'
    });

    resetGameState();
}

// Terminer la partie
async function endGame(winner) {
    const duration = Math.floor((Date.now() - gameState.gameStartTime) / 1000);

    try {
        let winnerData = null;

        if (winner) {
            await db.endGame(
                gameState.currentGameId,
                winner.twitchId,
                gameState.currentQuestionIndex,
                duration
            );
            await db.updateUserStats(winner.twitchId, true, 1);

            addLog('game-end', { winner: winner.username });

            const winnerUser = await db.getUserByTwitchId(winner.twitchId);

            winnerData = {
                username: winner.username,
                correctAnswers: winner.correctAnswers,
                livesRemaining: winner.lives,
                totalVictories: winnerUser ? winnerUser.total_victories : 1
            };
        }

        // Mettre à jour les stats des autres joueurs
        const losers = Array.from(gameState.players.values()).filter(p => p !== winner);
        let placement = 2;
        for (const loser of losers) {
            await db.updateUserStats(loser.twitchId, false, placement++);
        }

        const playersData = Array.from(gameState.players.values()).map(p => ({
            twitchId: p.twitchId,
            username: p.username,
            lives: p.lives,
            correctAnswers: p.correctAnswers
        }));

        io.emit('game-ended', {
            winner: winnerData,
            duration,
            totalQuestions: gameState.currentQuestionIndex,
            gameMode: 'lives',
            playersData: playersData // 🔥 IMPORTANT
        });

        // Reset
        resetGameState();

    } catch (error) {
        console.error('❌ Erreur fin de partie:', error);
    }
}

// Stats admin
app.get('/admin/stats', async (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    try {
        const totalGames = await db.getTotalGames();
        const topPlayers = await db.getTopPlayers(10);
        const recentGames = await db.getRecentGames(5);

        res.json({
            totalGames,
            topPlayers,
            recentGames,
            currentPlayers: gameState.players.size,
            activePlayers: gameState.inProgress ? getAlivePlayers().length : 0,
            gameActive: gameState.isActive,
            gameInProgress: gameState.inProgress
        });
    } catch (error) {
        console.error('❌ Erreur stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// Route pour les stats de la base de données
app.get('/admin/db-stats', async (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    try {
        const allQuestions = await db.getAllQuestions();

        // Compter les questions par difficulté
        const byDifficulty = {
            veryeasy: 0,
            easy: 0,
            medium: 0,
            hard: 0,
            veryhard: 0
        };

        const seriesSet = new Set();

        allQuestions.forEach(q => {
            if (byDifficulty.hasOwnProperty(q.difficulty)) {
                byDifficulty[q.difficulty]++;
            }
            if (q.serie) {
                seriesSet.add(q.serie);
            }
        });

        res.json({
            totalQuestions: allQuestions.length,
            totalSeries: seriesSet.size,
            byDifficulty: byDifficulty
        });
    } catch (error) {
        console.error('❌ Erreur db-stats:', error);
        res.status(500).json({ error: error.message });
    }
});


// Route pour mettre à jour les paramètres du jeu
app.post('/admin/update-settings', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    const { lives, timePerQuestion } = req.body;

    if (!lives || !timePerQuestion) {
        return res.status(400).json({ error: 'Paramètres invalides' });
    }

    // Mettre à jour les paramètres du jeu
    gameSettings.lives = parseInt(lives);
    gameSettings.timePerQuestion = parseInt(timePerQuestion);

    // Émettre vers tous les clients connectés
    io.emit('settings-updated', {
        lives: gameSettings.lives,
        timePerQuestion: gameSettings.timePerQuestion
    });

    console.log(`✅ Paramètres mis à jour: ${lives} vies, ${timePerQuestion}s`);
    res.json({ success: true, lives: gameSettings.lives, timePerQuestion: gameSettings.timePerQuestion });
});


// ============================================
// ROUTES PROFIL & BADGES
// ============================================

// Récupérer le profil complet d'un joueur
app.get('/profile/:twitchId', async (req, res) => {
    try {
        const { twitchId } = req.params;

        const user = await db.getUserByTwitchId(twitchId);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        const badges = await db.getUserBadges(twitchId);
        const unlockedTitles = await db.getUserUnlockedTitles(twitchId);
        const currentTitle = user.current_title_id
            ? await db.getTitleById(user.current_title_id)
            : await db.getTitleById(1); // Novice par défaut

        res.json({
            user: {
                twitch_id: user.twitch_id,
                username: user.username,
                total_games_played: user.total_games_played,
                total_victories: user.total_victories,
                win_rate: user.total_games_played > 0
                    ? ((user.total_victories / user.total_games_played) * 100).toFixed(1)
                    : '0.0'
            },
            badges: {
                games_played: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(tier => ({
                    tier,
                    unlocked: badges.some(b => b.badge_type === 'games_played' && b.badge_tier === tier)
                })),
                games_won: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(tier => ({
                    tier,
                    unlocked: badges.some(b => b.badge_type === 'games_won' && b.badge_tier === tier)
                }))
            },
            titles: {
                current: currentTitle,
                unlocked: unlockedTitles
            }
        });
    } catch (error) {
        console.error('❌ Erreur profil:', error);
        res.status(500).json({ error: error.message });
    }
});

// Changer le titre actuel
app.post('/profile/update-title', async (req, res) => {
    try {
        const { twitchId, titleId } = req.body;

        if (!twitchId || !titleId) {
            return res.status(400).json({ error: 'Paramètres manquants' });
        }

        const updatedUser = await db.updateUserTitle(twitchId, titleId);
        const newTitle = await db.getTitleById(titleId);

        res.json({
            success: true,
            user: updatedUser,
            title: newTitle
        });
    } catch (error) {
        console.error('❌ Erreur update titre:', error);
        res.status(400).json({ error: error.message });
    }
});


// Route pour signaler une question
app.post('/admin/report-question', async (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    try {
        const { questionId, questionText, difficulty, reason } = req.body;

        if (!questionText || !reason) {
            return res.status(400).json({ error: 'Données manquantes' });
        }

        // Enregistrer le signalement dans Supabase
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

// Récupérer tous les titres disponibles
app.get('/titles', async (req, res) => {
    try {
        const titles = await db.getAllTitles();
        res.json(titles);
    } catch (error) {
        console.error('❌ Erreur titres:', error);
        res.status(500).json({ error: error.message });
    }
});

// Récupérer le leaderboard
app.get('/leaderboard', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const leaderboard = await db.getLeaderboard(limit);
        res.json(leaderboard);
    } catch (error) {
        console.error('❌ Erreur leaderboard:', error);
        res.status(500).json({ error: error.message });
    }
});


app.get('/question', (req, res) => {
    res.sendFile(__dirname + '/src/html/question.html');
});

// API ajout question - avec code spécifique
app.post('/api/add-question', async (req, res) => {
    const { adminCode, question, answers, correctAnswer, serie, difficulty } = req.body;

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
                difficulty
            }]);

        if (error) throw error;

        res.json({ success: true, message: 'Question ajoutée !' });
    } catch (error) {
        console.error('Erreur ajout question:', error);
        res.status(500).json({ error: 'Erreur lors de l\'ajout' });
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

// ============================================
// Socket.IO
// ============================================
const server = app.listen(PORT, () => {
    console.log(`
    ╔═══════════════════════════════════════╗
    ║     🎮 WEEBMASTER SERVER 🎮          ║
    ╠═══════════════════════════════════════╣
    ║  Port: ${PORT}                        ║
    ║  Status: ✅ Online                    ║
    ║  Mode: ${process.env.NODE_ENV}                  ║
    ║  Twitch Redirect: ${TWITCH_REDIRECT_URI}
    ╚═══════════════════════════════════════╝
    `);
});

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
            username: data.username
        });
        console.log(`✅ Utilisateur authentifié enregistré: ${data.username} (${socket.id})`);
    });

    // Rejoindre le lobby
    socket.on('join-lobby', (data) => {
        if (!gameState.isActive) {
            return socket.emit('error', { message: 'Le jeu n\'est pas activé' });
        }

        if (gameState.inProgress) {
            return socket.emit('error', { message: 'Une partie est déjà en cours' });
        }

        gameState.players.set(socket.id, {
            socketId: socket.id,
            twitchId: data.twitchId,
            username: data.username,
            lives: gameState.lives,
            correctAnswers: 0
        });

        const playerColor = assignPlayerColor(data.username);
        addLog('join', { username: data.username, playerColor });

        console.log(`✅ ${data.username} a rejoint le lobby`);

        io.emit('lobby-update', {
            playerCount: gameState.players.size,
            lives: gameState.lives,
            questionTime: gameState.questionTime,
            players: Array.from(gameState.players.values()).map(p => ({
                twitchId: p.twitchId,
                username: p.username,
                lives: p.lives
            }))
        });
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

            io.emit('lobby-update', {
                playerCount: gameState.players.size,
                players: Array.from(gameState.players.values()).map(p => ({
                    twitchId: p.twitchId,
                    username: p.username,
                    lives: p.lives
                }))
            });
        }
    });

    // Reconnexion d'un joueur (nouveau événement)
    socket.on('reconnect-player', (data) => {
        if (!gameState.inProgress) {
            return socket.emit('error', { message: 'Aucune partie en cours' });
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

            console.log(`🔄 ${data.username} reconnecté - Mode: ${gameState.mode}, Points: ${existingPlayer.points || 0}, Vies: ${existingPlayer.lives}`);

            const restorationData = {
                currentQuestionIndex: gameState.currentQuestionIndex,
                hasAnswered: !!previousAnswer,
                selectedAnswer: previousAnswer ? previousAnswer.answer : null,
                bonusActive: previousAnswer ? previousAnswer.bonusActive : null, // 🔥 AJOUTER ICI
                gameMode: gameState.mode,
                comboData: gameState.playerBonuses.get(socket.id) ? {
                    comboLevel: gameState.playerBonuses.get(socket.id).comboLevel,
                    comboProgress: gameState.playerBonuses.get(socket.id).comboProgress,
                    availableBonuses: gameState.playerBonuses.get(socket.id).availableBonuses,
                    usedBonuses: gameState.playerBonuses.get(socket.id).usedBonuses
                } : null
            };

            if (gameState.mode === 'lives') {
                restorationData.lives = existingPlayer.lives;
                restorationData.correctAnswers = existingPlayer.correctAnswers;
            } else {
                restorationData.points = existingPlayer.points || 0;
            }

            socket.emit('player-restored', restorationData);

            const playerColor = playerColors[data.username] || assignPlayerColor(data.username);
            addLog('reconnect', { username: data.username, playerColor });

            // Mise à jour lobby
            io.emit('lobby-update', {
                playerCount: gameState.players.size,
                mode: gameState.mode,
                players: Array.from(gameState.players.values()).map(p => ({
                    twitchId: p.twitchId,
                    username: p.username,
                    lives: gameState.mode === 'lives' ? p.lives : null,
                    points: gameState.mode === 'points' ? (p.points || 0) : null
                }))
            });
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
            addLog('leave', { username: player.username, playerColor });
        }

        // 🔥 Retirer du tracker d'authentification
        if (authenticatedUsers.has(socket.id)) {
            const user = authenticatedUsers.get(socket.id);
            console.log(`🔌 ${user.username} déconnecté (authentifié)`);
            authenticatedUsers.delete(socket.id);
        }

        if (player) {
            console.log(`🔌 ${player.username} déconnecté (socket: ${socket.id})`);

            // Si une partie est en cours, NE PAS supprimer le joueur immédiatement
            if (gameState.inProgress) {
                console.log(`⏳ Attente de reconnexion pour ${player.username}...`);
                player.disconnectedAt = Date.now();
                player.disconnectedSocketId = socket.id;

                setTimeout(() => {
                    const currentPlayer = gameState.players.get(socket.id);
                    if (currentPlayer && currentPlayer.disconnectedAt === player.disconnectedAt) {
                        console.log(`❌ ${player.username} définitivement déconnecté`);
                        gameState.players.delete(socket.id);
                        gameState.answers.delete(socket.id);

                        io.emit('lobby-update', {
                            playerCount: gameState.players.size,
                            players: Array.from(gameState.players.values()).map(p => ({
                                twitchId: p.twitchId,
                                username: p.username,
                                lives: p.lives
                            }))
                        });
                    }
                }, 30000);
            } else {
                gameState.players.delete(socket.id);
                gameState.answers.delete(socket.id);

                io.emit('lobby-update', {
                    playerCount: gameState.players.size,
                    players: Array.from(gameState.players.values()).map(p => ({
                        twitchId: p.twitchId,
                        username: p.username,
                        lives: p.lives
                    }))
                });
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

            // Débloquer le bonus correspondant
            let bonusType = '';
            if (bonusData.comboLevel === 1) {
                bonusType = '5050';
            } else if (bonusData.comboLevel === 2) {
                bonusType = 'reveal';
            } else if (bonusData.comboLevel === 3) {
                bonusType = gameState.mode === 'lives' ? 'shield' : 'doublex2';
            }

            if (bonusType && !bonusData.availableBonuses.includes(bonusType)) {
                bonusData.availableBonuses.push(bonusType);
            }

            console.log(`🎉 Level up ! Joueur ${socketId}: Lvl${bonusData.comboLevel}, Bonus: ${bonusType}`);
        }
    }

    // 🔥 TOUJOURS envoyer combo-updated après CHAQUE bonne réponse
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
        socket.emit('combo-updated', {
            comboLevel: bonusData.comboLevel,
            comboProgress: bonusData.comboProgress,
            availableBonuses: bonusData.availableBonuses
        });
        console.log(`📡 combo-updated envoyé: level=${bonusData.comboLevel}, progress=${bonusData.comboProgress}`);
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
            availableBonuses: bonusData.availableBonuses
        });
    }
}

// Utilisation d'un bonus
function usePlayerBonus(socketId, bonusType) {
    const bonusData = gameState.playerBonuses.get(socketId);
    if (!bonusData) return false;

    // Vérifier que le bonus est disponible
    if (!bonusData.availableBonuses.includes(bonusType)) {
        return false;
    }

    // Retirer le bonus des disponibles
    const index = bonusData.availableBonuses.indexOf(bonusType);
    bonusData.availableBonuses.splice(index, 1);

    // Ajouter aux utilisés
    bonusData.usedBonuses.push(bonusType);

    console.log(`✅ Bonus "${bonusType}" utilisé par joueur ${socketId}`);

    return true;
}

// Reset des bonus en fin de partie
function resetAllBonuses() {
    gameState.playerBonuses.clear();
    console.log('🔄 Reset de tous les bonus');
}



// FONCTION: Reset complet de l'état du jeu
function resetGameState() {
    gameState.inProgress = false;
    gameState.currentGameId = null;
    gameState.currentQuestionIndex = 0;
    gameState.currentQuestion = null;
    gameState.showResults = false;
    gameState.lastQuestionResults = null;
    gameState.questionStartTime = null;
    gameState.gameStartTime = null;
    gameState.players.clear();
    gameState.answers.clear();
    gameState.isTiebreaker = false;
    gameState.tiebreakerPlayers = [];

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


setInterval(() => {
    // Timeout uniquement pour l'admin NORMAL (pas les masters)
    if (activeAdminSession && Date.now() - lastAdminActivity > ADMIN_TIMEOUT_MS) {
        console.log('⏰ Timeout admin normal (10min) - Libération du slot');
        activeAdminSession = null;
        activeAdminLoginTime = null;
    }
}, 30000);


process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled rejection:', error);
});


process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error);
    process.exit(1);
});