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

    const playersData = Array.from(gameState.players.values()).map(player => ({
        socketId: player.socketId,
        twitchId: player.twitchId,
        username: player.username,
        lives: gameState.mode === 'lives' ? player.lives : null,
        points: gameState.mode === 'points' ? (player.points || 0) : null,
        correctAnswers: player.correctAnswers,
        hasAnswered: gameState.answers.has(player.socketId)
    }));

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
        isTiebreaker: gameState.isTiebreaker,
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
app.use(express.static('src/img'));
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
    lastQuestionResults: null,

    mode: 'lives',
    lives: 3,
    questionTime: 10,
    answersCount: 4,
    questionsCount: 20,
    usedQuestionIds: [],

    // Tiebreaker
    isTiebreaker: false,
    tiebreakerPlayers: [],

    difficultyMode: 'croissante',
    lastDifficulty: null
};

// ============================================
// Helpers
// ============================================
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
    const { password } = req.body;

    if (password === process.env.ADMIN_PASSWORD) {
        req.session.isAdmin = true;

        // Forcer la sauvegarde de la session
        req.session.save((err) => {
            if (err) {
                console.error('❌ Erreur sauvegarde session:', err);
                return res.status(500).json({ success: false, message: 'Erreur de session' });
            }
            console.log('✅ Admin connecté - Session sauvegardée');
            res.json({ success: true });
        });
    } else {
        res.status(401).json({ success: false, message: 'Mot de passe incorrect' });
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

// Activer/désactiver le jeu
app.post('/admin/toggle-game', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé - Session expirée' });
    }

    gameState.isActive = !gameState.isActive;

    if (gameState.isActive) {
        console.log('✅ Jeu activé - Lobby ouvert');

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
        const completedGames = await db.getCompletedGamesCount();
        if (completedGames > 0 && completedGames % MAX_GAMES_BEFORE_RESET === 0) {
            console.log(`🔄 ${completedGames} parties terminées, reset automatique de l'historique...`);
            await db.resetUsedQuestions();
        }

        const game = await db.createGame(totalPlayers);

        gameState.inProgress = true;
        gameState.currentGameId = game.id;
        gameState.currentQuestionIndex = 0;
        gameState.gameStartTime = Date.now();
        gameState.showResults = false;
        gameState.lastQuestionResults = null;

        gameState.usedQuestionIds = await db.getUsedQuestionIds();

        // Initialiser les joueurs selon le mode
        gameState.players.forEach(player => {
            if (gameState.mode === 'lives') {
                player.lives = gameState.lives;
                player.correctAnswers = 0;
            } else {
                player.points = 0;
            }
        });

        console.log(`🎮 Partie démarrée (Mode: ${gameState.mode.toUpperCase()}) - ${totalPlayers} joueurs`);

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
        const questions = await db.getRandomQuestions(difficulty, 1, gameState.usedQuestionIds);

        if (questions.length === 0) {
            return res.status(404).json({ error: 'Aucune question disponible' });
        }

        const question = questions[0];
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


// 🔥 FIX TIEBREAKER: Fonction pour révéler les réponses
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

                const pointsEarned = getPointsForDifficulty(gameState.currentQuestion.difficulty);
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
                pointsEarned: isCorrect ? getPointsForDifficulty(gameState.currentQuestion.difficulty) : 0 // 🔥 NOUVEAU
            });
        });
    } else {
        // Mode Vie - Logique originale
        const alivePlayers = getAlivePlayers();
        const allHaveOneLife = alivePlayers.every(p => p.lives === 1);
        let allWillLose = false;

        if (allHaveOneLife && alivePlayers.length > 1) {
            const someoneCorrect = Array.from(alivePlayers).some(player => {
                const playerAnswer = gameState.answers.get(player.socketId);
                return playerAnswer && playerAnswer.answer === correctAnswer;
            });
            allWillLose = !someoneCorrect;
        }

        gameState.players.forEach((player, socketId) => {
            let status = 'afk';
            let isCorrect = false;
            const playerAnswer = gameState.answers.get(socketId);

            if (player.lives === 0) {
                stats.livesDistribution[0]++;
                status = 'eliminated';
            } else if (!playerAnswer) {
                stats.afk++;
                if (!allWillLose) {
                    player.lives--;
                    if (player.lives === 0) eliminatedThisRound++;
                }
                status = 'afk';
            } else if (playerAnswer.answer === correctAnswer) {
                stats.correct++;
                player.correctAnswers++;
                status = 'correct';
                isCorrect = true;
            } else {
                stats.wrong++;
                if (!allWillLose) {
                    player.lives--;
                    if (player.lives === 0) eliminatedThisRound++;
                }
                status = 'wrong';
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
                isCorrect: isCorrect
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
    if (gameState.mode === 'lives' && alivePlayersAfter.length <= 1) {
        endGame(alivePlayersAfter[0]);
    } else if (gameState.mode === 'points' && gameState.currentQuestionIndex >= gameState.questionsCount) {
        // Terminer automatiquement après la dernière question
        setTimeout(() => {
            endGameByPoints();
        }, 100);
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

        const questions = await db.getRandomQuestions(difficulty, 1, gameState.usedQuestionIds);

        if (questions.length === 0) {
            console.error('❌ Aucune question extreme disponible pour tiebreaker');
            // Fallback: terminer avec égalité
            await endGameWithTie();
            return;
        }

        const question = questions[0];
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

        io.emit('game-ended', {
            winner: winnerData,
            duration,
            totalQuestions: gameState.currentQuestionIndex,
            gameMode: 'lives'
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


// Route pour ajouter une question
app.post('/admin/add-question', async (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    try {
        const { question, answer1, answer2, answer3, answer4, answer5, answer6, correctAnswer, serie, difficulty } = req.body;

        // Utiliser supabase directement
        const { data, error } = await supabase
            .from('questions')
            .insert({
                question: question,
                answer1: answer1,
                answer2: answer2,
                answer3: answer3,
                answer4: answer4,
                answer5: answer5,
                answer6: answer6,
                coanswer: parseInt(correctAnswer),
                serie: serie,
                difficulty: difficulty
            })
            .select()
            .single();

        if (error) throw error;

        console.log('✅ Question ajoutée:', data.id);
        res.json({ success: true, question: data });
    } catch (error) {
        console.error('❌ Erreur ajout question:', error);
        res.status(500).json({ error: error.message });
    }
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
    console.log(`🔌 Nouveau socket connecté: ${socket.id}`);

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

        // Chercher le joueur par twitchId dans les joueurs existants
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
            // Sauvegarder la réponse de l'ancien socketId AVANT de supprimer
            const previousAnswer = gameState.answers.get(oldSocketId);

            // Supprimer l'ancienne référence
            gameState.players.delete(oldSocketId);
            gameState.answers.delete(oldSocketId);

            // Restaurer le joueur avec le nouveau socketId
            existingPlayer.socketId = socket.id;
            gameState.players.set(socket.id, existingPlayer);

            // Transférer la réponse au nouveau socketId si elle existait
            if (previousAnswer) {
                gameState.answers.set(socket.id, previousAnswer);
            }

            // Nettoyer les marqueurs de déconnexion temporaire
            delete existingPlayer.disconnectedAt;
            delete existingPlayer.disconnectedSocketId;

            console.log(`🔄 ${data.username} reconnecté - Mode: ${gameState.mode}, Points: ${existingPlayer.points || 0}, Vies: ${existingPlayer.lives}`);

            // Envoyer les bonnes données selon le mode
            const restorationData = {
                currentQuestionIndex: gameState.currentQuestionIndex,
                hasAnswered: !!previousAnswer,
                selectedAnswer: previousAnswer ? previousAnswer.answer : null,
                gameMode: gameState.mode
            };

            if (gameState.mode === 'lives') {
                restorationData.lives = existingPlayer.lives;
                restorationData.correctAnswers = existingPlayer.correctAnswers;
            } else {
                restorationData.points = existingPlayer.points || 0;
            }

            socket.emit('player-restored', restorationData);

            // Mettre à jour le compteur de joueurs pour l'admin
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
            // Nouveau joueur qui rejoint en cours de partie (spectateur)
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
            time: responseTime
        });

        socket.emit('answer-recorded');

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

    // Déconnexion
    socket.on('disconnect', () => {
        const player = gameState.players.get(socket.id);
        if (player) {
            console.log(`🔌 ${player.username} déconnecté (socket: ${socket.id})`);

            // Si une partie est en cours, NE PAS supprimer le joueur immédiatement
            // Lui laisser le temps de se reconnecter (30 secondes)
            if (gameState.inProgress) {
                console.log(`⏳ Attente de reconnexion pour ${player.username}...`);

                // Marquer le joueur comme temporairement déconnecté
                player.disconnectedAt = Date.now();
                player.disconnectedSocketId = socket.id;

                // Supprimer après 30 secondes si pas de reconnexion
                setTimeout(() => {
                    const currentPlayer = gameState.players.get(socket.id);
                    if (currentPlayer && currentPlayer.disconnectedAt === player.disconnectedAt) {
                        // Le joueur ne s'est pas reconnecté
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
                }, 30000); // 30 secondes
            } else {
                // Pas de partie en cours, supprimer immédiatement
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
// Gestion des erreurs
// ============================================
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error);
    process.exit(1);
});

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

    gameState.isActive = false;
    io.emit('game-deactivated');
    console.log('🔒 Lobby fermé automatiquement après la fin de partie');
}