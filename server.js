// ============================================
// WEEBMASTER - Server Principal - TIEBREAKER FIX
// ============================================

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { Server } = require('socket.io');
const axios = require('axios');
const { db, supabase, SERIES_FILTERS, getFilterSeries } = require('./dbs');

const app = express();
const PORT = process.env.PORT || 7000;

const MAX_GAMES_BEFORE_RESET = 5;
const MIN_PLAYERS_FOR_STATS = 15; // Minimum de joueurs pour comptabiliser les stats

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


// SERIES_FILTERS importé depuis dbs.js

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

        // Créer ou mettre à jour l'utilisateur dans la DB (avec avatar)
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
            title: player.title || 'Novice',
            lives: gameState.mode === 'lives' ? player.lives : null,
            points: gameState.mode === 'points' ? (player.points || 0) : null,
            isLastGlobalWinner: player.twitchId === lastGlobalWinner,
            correctAnswers: player.correctAnswers,
            hasAnswered: !!playerAnswer,
            selectedAnswerIndex: playerAnswer?.answer || null,
            responseTime: playerAnswer?.time || null,
            comboData: comboData
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
        isTiebreaker: gameState.isTiebreaker,
        liveAnswerCounts: answerCounts,
        showingWinner: !!winnerScreenData,
        winnerScreenData: winnerScreenData,
        livesIcon: gameState.livesIcon,
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
app.use(express.static('src/img/questionpic'));
app.use(express.static('src/img/avatar'));
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

    liveAnswers: new Map(),

    // Tiebreaker
    isTiebreaker: false,
    tiebreakerPlayers: [],

    difficultyMode: 'croissante',
    lastDifficulty: null,

    autoMode: false,
    autoModeTimeout: null,
    
    initialPlayerCount: 0, // Nombre de joueurs au début de la partie

    serieFilter: 'tout',

    playerBonuses: new Map(),
    
    // 🆕 Système de défis
    activeChallenges: [],           // Les 3 défis de la partie actuelle
    playerChallenges: new Map()     // Progression des défis par joueur
};

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


// ============================================
// 🆕 TRACKING VISITES (discret)
// ============================================
async function logVisit(page, twitchUsername = null, userAgent = null) {
    try {
        await supabase.from('visits').insert({ 
            page,
            twitch_username: twitchUsername,
            user_agent: userAgent
        });
    } catch (e) {}
}


app.get('/', (req, res) => {
    logVisit('home', req.session?.username || null, req.headers['user-agent'] || null);
    res.sendFile(__dirname + '/src/html/home.html');
});

// ============================================
// Routes ADMIN
// ============================================

// Page admin
app.get('/admin', (req, res) => {
    logVisit('admin', req.session?.username || null, req.headers['user-agent'] || null);
    res.sendFile(__dirname + '/src/html/admin.html');
});

// 🆕 Page Ranking
app.get('/ranking', (req, res) => {
    logVisit('ranking', req.session?.username || null, req.headers['user-agent'] || null);
    res.sendFile(__dirname + '/src/html/ranking.html');
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

// 🆕 Route secrète pour voir les visites
app.get('/visits-stats', async (req, res) => {
    try {
        const { data: homeVisits } = await supabase
            .from('visits')
            .select('timestamp')
            .eq('page', 'home')
            .order('timestamp', { ascending: false })
            .limit(20);

        const { data: adminVisits } = await supabase
            .from('visits')
            .select('timestamp')
            .eq('page', 'admin')
            .order('timestamp', { ascending: false })
            .limit(20);

        const { count: homeCount } = await supabase
            .from('visits')
            .select('*', { count: 'exact', head: true })
            .eq('page', 'home');

        const { count: adminCount } = await supabase
            .from('visits')
            .select('*', { count: 'exact', head: true })
            .eq('page', 'admin');

        res.json({
            total: { home: homeCount || 0, admin: adminCount || 0 },
            recent: {
                home: homeVisits?.map(v => new Date(v.timestamp).toLocaleString('fr-FR')) || [],
                admin: adminVisits?.map(v => new Date(v.timestamp).toLocaleString('fr-FR')) || []
            }
        });
    } catch (e) {
        res.json({ error: e.message });
    }
});

// Vérifier si admin
app.get('/admin/check', (req, res) => {
    res.json({ isAdmin: req.session.isAdmin === true });
});

// Vérifier l'authentification admin (utilisé par le nouveau panel)
app.get('/admin/auth', (req, res) => {
    res.json({ authenticated: req.session.isAdmin === true });
});


app.get('/admin/game-state', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    res.json({
        isActive: gameState.isActive,
        phase: gameState.inProgress ? 'playing' : (gameState.isActive ? 'lobby' : 'idle'),
        players: Array.from(gameState.players.values()).map(p => ({
            username: p.username,
            twitch_id: p.twitchId,
            title: p.title || 'Novice',
            isChampion: p.twitchId === lastGlobalWinner
        })),
        playerCount: gameState.players.size
    });
});

// Activer/désactiver le jeu
app.post('/admin/toggle-game', async (req, res) => {
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
        gameState.livesIcon = 'heart';

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
        if (gameState.inProgress && gameState.currentGameId) {
            console.log('⚠️ Partie en cours annulée - Suppression de la BDD');

            // 🔥 Supprimer la partie interrompue (pas de winner = pas de vraie partie)
            try {
                await supabase
                    .from('games')
                    .delete()
                    .eq('id', gameState.currentGameId);
                console.log(`🗑️ Partie ${gameState.currentGameId} supprimée (interrompue)`);
            } catch (error) {
                console.error('❌ Erreur suppression partie:', error);
            }
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
            livesIcon: gameState.livesIcon,
            lives: gameState.lives,
            questionTime: gameState.questionTime,
            players: Array.from(gameState.players.values()).map(p => ({
                twitchId: p.twitchId,
                username: p.username,
                isLastGlobalWinner: p.twitchId === lastGlobalWinner,
                lives: p.lives,
                title: p.title || 'Novice',
                avatarUrl: p.avatarUrl
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
        const questionsNeeded = gameState.mode === 'points' ? gameState.questionsCount : 50;

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
            gameState.usedQuestionIds = [];
            console.log('✅ Historique réinitialisé - Toutes les questions sont à nouveau disponibles');
        }

        // Reset automatique tous les 5 jeux (système existant)
        const completedGames = await db.getCompletedGamesCount();
        if (completedGames > 0 && completedGames % MAX_GAMES_BEFORE_RESET === 0) {
            console.log(`🔄 ${completedGames} parties terminées, reset automatique de l'historique...`);
            await db.resetUsedQuestions();
            gameState.usedQuestionIds = [];
        }

        const game = await db.createGame(totalPlayers, gameState.mode);

        gameState.inProgress = true;
        gameState.currentGameId = game.id;
        gameState.initialPlayerCount = totalPlayers; // 🆕 Stocker le nombre initial
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

        // 🆕 Générer les défis pour cette partie
        gameState.activeChallenges = generateChallenges();
        gameState.playerChallenges.clear();
        console.log('🎯 Défis initialisés pour la partie');

        // Initialiser les joueurs selon le mode
        gameState.players.forEach((player, socketId) => {
            if (gameState.mode === 'lives') {
                player.lives = gameState.lives;
                player.correctAnswers = 0;
            } else {
                player.points = 0;
            }

            // 🆕 Initialiser les bonus du joueur avec inventaire
            gameState.playerBonuses.set(socketId, {
                comboLevel: 0,
                comboProgress: 0,
                bonusInventory: { '5050': 0, 'reveal': 0, 'shield': 0, 'doublex2': 0 }
            });

            // 🆕 Initialiser les défis du joueur
            initPlayerChallenges(socketId);
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
                    challenges: getPlayerChallengesState(socketId) // 🆕 Envoyer les défis
                });
            } else {
                socket.emit('game-started', {
                    totalPlayers,
                    isParticipating: false,
                    gameMode: gameState.mode
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
                    shouldApplySerieCooldown() ? gameState.recentSeries : []
                );

                if (questions.length === 0) {
                    console.error('❌ Aucune question disponible');
                    return;
                }

                const question = questions[0];
                addToRecentSeries(question.serie);
                await db.addUsedQuestion(question.id);
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
        livesIcon: gameState.livesIcon,
        lives: gameState.lives,
        questionTime: gameState.questionTime,
        players: Array.from(gameState.players.values()).map(p => ({
            twitchId: p.twitchId,
            isLastGlobalWinner: p.twitchId === lastGlobalWinner,
            username: p.username,
            lives: mode === 'lives' ? p.lives : null,
            points: mode === 'points' ? p.points : null,
            title: p.title || 'Novice',
            avatarUrl: p.avatarUrl
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

// 🆕 Route pour activer/désactiver le bonus rapidité (mode points uniquement)
app.post('/admin/set-speed-bonus', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    const { enabled } = req.body;
    gameState.speedBonus = enabled === true;
    console.log(`⚡ Bonus rapidité: ${gameState.speedBonus ? 'Activé' : 'Désactivé'}`);

    res.json({ success: true, speedBonus: gameState.speedBonus });
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
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

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
                lives: player.lives,
                points: player.points || 0,
                status: status,
                responseTime: playerAnswer?.time || null,
                isCorrect: isCorrect,
                selectedAnswer: playerAnswer?.answer ? gameState.currentQuestion.answers[playerAnswer.answer - 1] : null,
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
                lives: player.lives,
                points: player.points || 0,
                status: status,
                responseTime: playerAnswer?.time || null,
                isCorrect: isCorrect,
                selectedAnswer: playerAnswer?.answer ? gameState.currentQuestion.answers[playerAnswer.answer - 1] : null,
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
        points: player.points || 0,
        isLastGlobalWinner: player.twitchId === lastGlobalWinner
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

    const resultsData = {
        correctAnswer,
        stats,
        eliminatedCount: eliminatedThisRound,
        remainingPlayers: alivePlayersAfter.length,
        players: playersDetails,
        playersData: playersData,
        gameMode: gameState.mode,
        fastestPlayer: fastestPlayer
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
        isLastGlobalWinner: player.twitchId === lastGlobalWinner
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
                await db.endGame(
                    gameState.currentGameId,
                    winner.twitchId,
                    gameState.currentQuestionIndex,
                    duration
                );
                
                // 🆕 Stats comptabilisées uniquement si 15+ joueurs
                if (gameState.initialPlayerCount >= MIN_PLAYERS_FOR_STATS) {
                    await db.updateUserStats(winner.twitchId, true, 1);
                    
                    // Mettre à jour les stats des perdants
                    let placement = 2;
                    for (const player of sortedPlayers.slice(1)) {
                        await db.updateUserStats(player.twitchId, false, placement++);
                    }
                    console.log(`📊 Stats mises à jour (${gameState.initialPlayerCount} joueurs)`);
                } else {
                    console.log(`⚠️ Stats NON comptabilisées (${gameState.initialPlayerCount} < ${MIN_PLAYERS_FOR_STATS} joueurs)`);
                }

                addLog('game-end', { winner: winner.username });

                const winnerUser = await db.getUserByTwitchId(winner.twitchId);

                const winnerData = {
                    username: winner.username,
                    points: winner.points || 0,
                    totalVictories: winnerUser ? winnerUser.total_victories : 1
                };

                console.log(`🏆 Gagnant: ${winner.username} avec ${winner.points} points`);

                // Créer le podium Top 3
                const podium = sortedPlayers.slice(0, 3).map((player, index) => ({
                    rank: index + 1,
                    username: player.username,
                    points: player.points || 0
                }));

                const { playersData, topPlayers } = await generateGameEndedData();

                winnerScreenData = {
                    winner: winnerData,
                    podium: podium,
                    duration,
                    totalQuestions: gameState.currentQuestionIndex,
                    gameMode: 'points',
                    playersData,
                    topPlayers,
                    livesIcon: gameState.livesIcon
                };

                io.emit('game-ended', {
                    winner: winnerData,
                    podium: podium,
                    duration,
                    totalQuestions: gameState.currentQuestionIndex,
                    gameMode: 'points',
                    playersData,
                    topPlayers
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
            
            // 🆕 Stats comptabilisées uniquement si 15+ joueurs
            if (gameState.initialPlayerCount >= MIN_PLAYERS_FOR_STATS) {
                await db.updateUserStats(winner.twitchId, true, 1);

                // Mettre à jour les stats des perdants
                const allPlayers = Array.from(gameState.players.values())
                    .sort((a, b) => (b.points || 0) - (a.points || 0));

                let placement = 2;
                for (const player of allPlayers) {
                    if (player.twitchId !== winner.twitchId) {
                        await db.updateUserStats(player.twitchId, false, placement++);
                    }
                }
                console.log(`📊 Stats mises à jour après tiebreaker (${gameState.initialPlayerCount} joueurs)`);
            } else {
                console.log(`⚠️ Stats NON comptabilisées après tiebreaker (${gameState.initialPlayerCount} < ${MIN_PLAYERS_FOR_STATS} joueurs)`);
            }

            const winnerUser = await db.getUserByTwitchId(winner.twitchId);

            const winnerData = {
                username: winner.username,
                points: winner.points || 0,
                totalVictories: winnerUser ? winnerUser.total_victories : 1
            };

            // Créer le podium Top 3
            const allPlayersSorted = Array.from(gameState.players.values())
                .sort((a, b) => (b.points || 0) - (a.points || 0));
            const podium = allPlayersSorted.slice(0, 3).map((player, index) => ({
                rank: index + 1,
                username: player.username,
                points: player.points || 0
            }));

            const { playersData, topPlayers } = await generateGameEndedData();

            winnerScreenData = {
                winner: winnerData,
                podium: podium,
                duration,
                totalQuestions: gameState.currentQuestionIndex,
                gameMode: 'points',
                playersData,
                topPlayers,
                livesIcon: gameState.livesIcon
            };


            io.emit('game-ended', {
                winner: winnerData,
                podium: podium,
                duration,
                totalQuestions: gameState.currentQuestionIndex,
                gameMode: 'points',
                playersData,
                topPlayers
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

    // 🆕 Stats comptabilisées uniquement si 15+ joueurs
    if (gameState.initialPlayerCount >= MIN_PLAYERS_FOR_STATS) {
        for (const winner of winners) {
            await db.updateUserStats(winner.twitchId, true, 1);
        }

        let placement = winners.length + 1;
        for (const player of sortedPlayers.slice(winners.length)) {
            await db.updateUserStats(player.twitchId, false, placement++);
        }
        console.log(`📊 Stats mises à jour (égalité, ${gameState.initialPlayerCount} joueurs)`);
    } else {
        console.log(`⚠️ Stats NON comptabilisées (égalité, ${gameState.initialPlayerCount} < ${MIN_PLAYERS_FOR_STATS} joueurs)`);
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

    const { playersData, topPlayers } = await generateGameEndedData();

    winnerScreenData = {
        winner: winnerData,
        podium: podium,
        duration,
        totalQuestions: gameState.currentQuestionIndex,
        gameMode: 'points',
        playersData,
        topPlayers,
        livesIcon: gameState.livesIcon
    };


    io.emit('game-ended', {
        winner: winnerData,
        podium: podium,
        duration,
        totalQuestions: gameState.currentQuestionIndex,
        gameMode: 'points',
        playersData,
        topPlayers
    });

    resetGameState();
}

// Terminer la partie
async function endGame(winner) {
    const duration = Math.floor((Date.now() - gameState.gameStartTime) / 1000);

    try {
        let winnerData = null;

        if (winner) {
            lastGlobalWinner = winner.twitchId;
            await db.endGame(
                gameState.currentGameId,
                winner.twitchId,
                gameState.currentQuestionIndex,
                duration
            );
            
            // 🆕 Stats comptabilisées uniquement si 15+ joueurs
            if (gameState.initialPlayerCount >= MIN_PLAYERS_FOR_STATS) {
                await db.updateUserStats(winner.twitchId, true, 1);
                
                // Mettre à jour les stats des autres joueurs
                const losers = Array.from(gameState.players.values()).filter(p => p !== winner);
                let placement = 2;
                for (const loser of losers) {
                    await db.updateUserStats(loser.twitchId, false, placement++);
                }
                console.log(`📊 Stats mises à jour (mode vies, ${gameState.initialPlayerCount} joueurs)`);
            } else {
                console.log(`⚠️ Stats NON comptabilisées (mode vies, ${gameState.initialPlayerCount} < ${MIN_PLAYERS_FOR_STATS} joueurs)`);
            }

            addLog('game-end', { winner: winner.username });

            const winnerUser = await db.getUserByTwitchId(winner.twitchId);

            winnerData = {
                username: winner.username,
                correctAnswers: winner.correctAnswers,
                livesRemaining: winner.lives,
                totalVictories: winnerUser ? winnerUser.total_victories : 1
            };
        } else {
            // 🆕 Cas aucun gagnant - terminer la partie en DB quand même
            console.log('💀 Fin de partie sans gagnant');
            if (gameState.currentGameId) {
                await db.endGame(
                    gameState.currentGameId,
                    null, // Pas de winner
                    gameState.currentQuestionIndex,
                    duration
                );
            }
            addLog('game-end', { winner: 'Aucun' });
        }

        const playersData = Array.from(gameState.players.values()).map(p => ({
            twitchId: p.twitchId,
            username: p.username,
            lives: p.lives,
            correctAnswers: p.correctAnswers,
            isLastGlobalWinner: p.twitchId === lastGlobalWinner
        }));

        const topPlayers = await db.getTopPlayers(10);


        // 🔥 Stocker pour restauration
        winnerScreenData = {
            winner: winnerData,
            duration,
            totalQuestions: gameState.currentQuestionIndex,
            gameMode: 'lives',
            playersData: playersData,
            topPlayers,
            livesIcon: gameState.livesIcon
        };


        // 🆕 N'envoyer game-ended que s'il y a un gagnant
        if (winner) {
            io.emit('game-ended', {
                winner: winnerData,
                duration,
                totalQuestions: gameState.currentQuestionIndex,
                gameMode: 'lives',
                playersData: playersData,
                topPlayers
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

// Stats admin
app.get('/admin/stats', async (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    try {
        const totalGames = await db.getTotalGames();
        const topPlayers = await db.getTopPlayers(50);  // ← 50 joueurs max
        const recentGames = await db.getRecentGames(7);

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
        const totalPlayers = await db.getTotalPlayers();  // ← AJOUTER

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
            totalPlayers: totalPlayers,  // ← AJOUTER
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
                avatar_url: user.avatar_url || '/img/avatars/novice.png', // 🔥 NOUVEAU
                total_games_played: user.total_games_played,
                total_victories: user.total_victories,
                last_placement: user.last_placement || null,
                isLastGlobalWinner: user.twitch_id === lastGlobalWinner,
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


app.post('/profile/update-avatar', async (req, res) => {
    try {
        const { twitchId, avatarUrl } = req.body;

        if (!twitchId || !avatarUrl) {
            return res.status(400).json({ error: 'Paramètres manquants' });
        }

        const allowedAvatars = [
            'novice.png',
            'ninja.png',
            'knight.png',
            'knight2.png',
            'girl.png',
            'assassin.png',
            'sorcier.png',
            'totoro.png',
            'melody.png'
        ];

        if (!allowedAvatars.includes(avatarUrl)) {
            return res.status(400).json({ error: 'Avatar non autorisé' });
        }

        const updatedUser = await db.updateUserAvatar(twitchId, avatarUrl);

        res.json({
            success: true,
            user: updatedUser
        });
    } catch (error) {
        console.error('❌ Erreur update avatar:', error);
        res.status(400).json({ error: error.message });
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


// Récupérer les parties récentes
app.get('/api/recent-games', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const games = await db.getRecentGames(limit);
        res.json({ success: true, games });
    } catch (error) {
        console.error('❌ Erreur recent-games:', error);
        res.status(500).json({ success: false, error: error.message });
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


// 🆕 Modifier une question
app.post('/api/update-question', async (req, res) => {
    const { adminCode, id, question, answers, correctAnswer, serie, difficulty } = req.body;

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
                difficulty
            })
            .eq('id', id);

        if (error) throw error;

        res.json({ success: true, message: 'Question modifiée !' });
    } catch (error) {
        console.error('Erreur modification question:', error);
        res.status(500).json({ error: 'Erreur lors de la modification' });
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

// 🆕 Récupérer les IDs des questions utilisées
app.get('/api/used-questions', async (req, res) => {
    const { adminCode } = req.query;

    if (adminCode !== process.env.QUESTION_ADMIN_CODE && adminCode !== process.env.MASTER_ADMIN_CODE) {
        return res.status(401).json({ error: 'Code invalide' });
    }

    try {
        const usedIds = await db.getUsedQuestionIds();
        res.json({ success: true, usedIds });
    } catch (error) {
        console.error('Erreur récupération questions utilisées:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// 🆕 Marquer une question comme utilisée (exclure)
app.post('/api/mark-question-used', async (req, res) => {
    const { adminCode, questionId } = req.body;

    if (adminCode !== process.env.QUESTION_ADMIN_CODE && adminCode !== process.env.MASTER_ADMIN_CODE) {
        return res.status(401).json({ error: 'Code invalide' });
    }

    try {
        await db.addUsedQuestion(questionId);
        gameState.usedQuestionIds.push(questionId);
        console.log(`🚫 Question ${questionId} marquée comme utilisée (exclue)`);
        res.json({ success: true, message: 'Question exclue' });
    } catch (error) {
        console.error('Erreur marquage question:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// 🆕 Retirer une question de l'historique (réactiver)
app.post('/api/unmark-question-used', async (req, res) => {
    const { adminCode, questionId } = req.body;

    if (adminCode !== process.env.QUESTION_ADMIN_CODE && adminCode !== process.env.MASTER_ADMIN_CODE) {
        return res.status(401).json({ error: 'Code invalide' });
    }

    try {
        const { error } = await supabase
            .from('used_questions')
            .delete()
            .eq('question_id', questionId);

        if (error) throw error;

        // Retirer du gameState aussi
        gameState.usedQuestionIds = gameState.usedQuestionIds.filter(id => id !== questionId);
        console.log(`✅ Question ${questionId} réactivée (retirée de l'historique)`);
        res.json({ success: true, message: 'Question réactivée' });
    } catch (error) {
        console.error('Erreur réactivation question:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// 🆕 Reset toutes les questions utilisées (via page question.html)
app.post('/api/reset-used-questions', async (req, res) => {
    const { adminCode } = req.body;

    if (adminCode !== process.env.QUESTION_ADMIN_CODE && adminCode !== process.env.MASTER_ADMIN_CODE) {
        return res.status(401).json({ error: 'Code invalide' });
    }

    try {
        await db.resetUsedQuestions();
        gameState.usedQuestionIds = [];
        console.log('🔄 Historique des questions réinitialisé (via page questions)');
        res.json({ success: true, message: 'Historique réinitialisé' });
    } catch (error) {
        console.error('Erreur reset questions:', error);
        res.status(500).json({ error: 'Erreur serveur' });
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


// POST /admin/set-lives-icon
app.post('/admin/set-lives-icon', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

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
    ║     🎮 WEEBMASTER SERVER 🎮          ║
    ╠═══════════════════════════════════════╣
    ║  Port: ${PORT}                        ║
    ║  Status: ✅ Online                    ║
    ║  Mode: ${process.env.NODE_ENV}                  ║
    ║  Twitch Redirect: ${TWITCH_REDIRECT_URI}
    ╚═══════════════════════════════════════╝
    `);

    loadLastGlobalWinner();
});


// ============================================
// STREAMERS PARTENAIRES - LIVE STATUS
// ============================================
const PARTNER_STREAMERS = ['MinoStreaming', 'pikinemadd'];
let partnersLiveStatus = {}; // Cache du statut



async function checkPartnersLive() {
    try {
        // Token Twitch (App Access Token)
        const tokenRes = await axios.post('https://id.twitch.tv/oauth2/token', null, {
            params: {
                client_id: process.env.TWITCH_CLIENT_ID,
                client_secret: process.env.TWITCH_CLIENT_SECRET,
                grant_type: 'client_credentials'
            }
        });
        const accessToken = tokenRes.data.access_token;

        // Vérifier les streams
        const userLogins = PARTNER_STREAMERS.join('&user_login=');
        const streamsRes = await axios.get(
            `https://api.twitch.tv/helix/streams?user_login=${userLogins}`,
            {
                headers: {
                    'Client-ID': process.env.TWITCH_CLIENT_ID,
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        const liveStreams = streamsRes.data.data || [];

        PARTNER_STREAMERS.forEach(streamer => {
            partnersLiveStatus[streamer] = liveStreams.some(
                stream => stream.user_login.toLowerCase() === streamer.toLowerCase()
            );
        });

        // Émettre à tous les clients
        io.emit('partners-live-status', partnersLiveStatus);
        console.log('📡 Statut live partenaires:', partnersLiveStatus);

    } catch (err) {
        console.error('❌ Erreur check live partenaires:', err.message);
    }
}

// Vérifier au démarrage puis toutes les 2 minutes
checkPartnersLive();
setInterval(checkPartnersLive, 120000);

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

    // Envoyer immédiatement le statut live des partenaires
    if (Object.keys(partnersLiveStatus).length > 0) {
        socket.emit('partners-live-status', partnersLiveStatus);
    }

    // 🔥 NOUVEAU: Événement pour enregistrer l'authentification
    socket.on('register-authenticated', (data) => {
        authenticatedUsers.set(socket.id, {
            twitchId: data.twitchId,
            username: data.username
        });
        console.log(`✅ Utilisateur authentifié enregistré: ${data.username} (${socket.id})`);
    });


    // Rejoindre le lobby
    socket.on('join-lobby', async (data) => {
        if (!gameState.isActive) {
            return socket.emit('error', { message: 'Le jeu n\'est pas activé' });
        }

        if (gameState.inProgress) {
            return socket.emit('error', { message: 'Une partie est déjà en cours' });
        }

        // 🔥 NOUVEAU: Vérifier si le joueur est déjà dans le lobby
        let alreadyInLobby = false;
        let existingSocketId = null;

        for (const [socketId, player] of gameState.players.entries()) {
            if (player.twitchId === data.twitchId) {
                alreadyInLobby = true;
                existingSocketId = socketId;
                break;
            }
        }

        if (alreadyInLobby) {
            // Option 1: Refuser la connexion
            // return socket.emit('error', { message: 'Vous êtes déjà dans le lobby' });

            // Option 2: Remplacer l'ancienne connexion (recommandé)
            console.log(`🔄 ${data.username} remplace sa connexion précédente`);
            gameState.players.delete(existingSocketId);
            gameState.answers.delete(existingSocketId);

            // Déconnecter l'ancien socket
            const oldSocket = io.sockets.sockets.get(existingSocketId);
            if (oldSocket) {
                oldSocket.emit('kicked', { reason: 'Connexion depuis un autre appareil' });
                oldSocket.disconnect(true);
            }
        }

        const userInfo = await db.getUserByTwitchId(data.twitchId);
        
        // 🔥 Récupérer le titre actuel du joueur
        let playerTitle = 'Novice';
        if (userInfo && userInfo.current_title_id) {
            const titleData = await db.getTitleById(userInfo.current_title_id);
            if (titleData) {
                playerTitle = titleData.title_name;
            }
        }

        gameState.players.set(socket.id, {
            socketId: socket.id,
            twitchId: data.twitchId,
            username: data.username,
            lives: gameState.lives,
            correctAnswers: 0,
            lastPlacement: userInfo?.last_placement || null,
            title: playerTitle,
            avatarUrl: userInfo?.avatar_url || '/img/avatars/novice.png'
        });

        const playerColor = assignPlayerColor(data.username);
        addLog('join', { username: data.username, playerColor });

        console.log(`✅ ${data.username} a rejoint le lobby`);

        io.emit('lobby-update', {
            playerCount: gameState.players.size,
            lives: gameState.lives,
            livesIcon: gameState.livesIcon,
            questionTime: gameState.questionTime,
            players: Array.from(gameState.players.values()).map(p => ({
                twitchId: p.twitchId,
                username: p.username,
                lives: p.lives,
                title: p.title || 'Novice',
                avatarUrl: p.avatarUrl,
                isLastGlobalWinner: p.twitchId === lastGlobalWinner,
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
                livesIcon: gameState.livesIcon,
                players: Array.from(gameState.players.values()).map(p => ({
                    twitchId: p.twitchId,
                    username: p.username,
                    lives: p.lives,
                    title: p.title || 'Novice',
                    avatarUrl: p.avatarUrl,
                    isLastGlobalWinner: p.twitchId === lastGlobalWinner,
                }))
            });
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
            io.emit('lobby-update', {
                playerCount: gameState.players.size,
                livesIcon: gameState.livesIcon,
                players: Array.from(gameState.players.values()).map(p => ({
                    twitchId: p.twitchId,
                    username: p.username,
                    lives: p.lives,
                    title: p.title || 'Novice',
                    avatarUrl: p.avatarUrl,
                    isLastGlobalWinner: p.twitchId === lastGlobalWinner,
                }))
            });

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
                challenges: getPlayerChallengesState(socket.id) // 🆕 Envoyer les défis
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
            io.emit('lobby-update', {
                playerCount: gameState.players.size,
                mode: gameState.mode,
                livesIcon: gameState.livesIcon,
                players: Array.from(gameState.players.values()).map(p => ({
                    twitchId: p.twitchId,
                    isLastGlobalWinner: p.twitchId === lastGlobalWinner,
                    username: p.username,
                    lives: gameState.mode === 'lives' ? p.lives : null,
                    points: gameState.mode === 'points' ? (p.points || 0) : null,
                    title: p.title || 'Novice',
                    avatarUrl: p.avatarUrl
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
                gameState.players.delete(socket.id);
                gameState.answers.delete(socket.id);

                io.emit('lobby-update', {
                    livesIcon: gameState.livesIcon,
                    playerCount: gameState.players.size,
                    players: Array.from(gameState.players.values()).map(p => ({
                        twitchId: p.twitchId,
                        username: p.username,
                        isLastGlobalWinner: p.twitchId === lastGlobalWinner,
                        lives: p.lives,
                        title: p.title || 'Novice',
                        avatarUrl: p.avatarUrl
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
        isLastGlobalWinner: p.twitchId === lastGlobalWinner
    }));

    const topPlayers = await db.getTopPlayers(10);

    return { playersData, topPlayers };
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
    gameState.initialPlayerCount = 0; // 🆕 Reset du compteur initial
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


async function loadLastGlobalWinner() {
    try {
        const recentGames = await db.getRecentGames(10);
        if (recentGames && recentGames.length > 0) {
            const lastWonGame = recentGames.find(game => game.winner_twitch_id !== null);
            if (lastWonGame) {
                lastGlobalWinner = lastWonGame.winner_twitch_id;
                console.log(`👑 Dernier vainqueur chargé: ${lastGlobalWinner}`);
            }
        }
    } catch (error) {
        console.error('❌ Erreur chargement dernier vainqueur:', error);
    }
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