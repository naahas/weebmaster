// ============================================
// WEEBMASTER - Server Principal
// ============================================

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { Server } = require('socket.io');
const axios = require('axios');
const { db } = require('./dbs');

const app = express();
const PORT = process.env.PORT || 7000;

// Détection automatique de l'URL de redirection
const TWITCH_REDIRECT_URI = process.env.TWITCH_REDIRECT_URI || 
    (process.env.NODE_ENV === 'production' 
        ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME || process.env.VERCEL_URL || 'weebmaster.com'}/auth/twitch/callback`
        : `http://localhost:${PORT}/auth/twitch/callback`);

// ============================================
// Middleware
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('src/html'));
app.use(express.static('src/style'));
app.use(express.static('src/script'));

app.use(session({
    secret: process.env.SESSION_SECRET || 'pikine-secret-2025',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24h
    }
}));

// ============================================
// État du jeu
// ============================================
const gameState = {
    isActive: false,              // Le jeu est-il activé ?
    inProgress: false,            // Une partie est-elle en cours ?
    currentGameId: null,          // ID de la partie en cours
    currentQuestionIndex: 0,      // Index de la question actuelle
    players: new Map(),           // Map<socketId, playerData>
    questionStartTime: null,      // Timestamp du début de la question
    answers: new Map(),           // Map<socketId, answerData>
    gameStartTime: null           // Timestamp du début du jeu
};

// ============================================
// Helpers
// ============================================
function getDifficultyForQuestion(questionNumber) {
    if (questionNumber <= 15) return 'veryeasy';
    if (questionNumber <= 35) return 'easy';
    if (questionNumber <= 55) return 'medium';
    if (questionNumber <= 70) return 'hard';
    if (questionNumber <= 85) return 'veryhard';
    return 'extreme';
}

function getAlivePlayers() {
    return Array.from(gameState.players.values()).filter(p => p.lives > 0);
}

function getEliminatedCount() {
    return Array.from(gameState.players.values()).filter(p => p.lives === 0).length;
}

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
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Mot de passe incorrect' });
    }
});

// Vérifier si admin
app.get('/admin/check', (req, res) => {
    res.json({ isAdmin: req.session.isAdmin === true });
});

// Activer/désactiver le jeu
app.post('/admin/toggle-game', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    gameState.isActive = !gameState.isActive;
    
    if (gameState.isActive) {
        console.log('✅ Jeu activé - Lobby ouvert');
        io.emit('game-activated');
    } else {
        console.log('❌ Jeu désactivé');
        io.emit('game-deactivated');
    }

    res.json({ isActive: gameState.isActive });
});

// Démarrer une partie
app.post('/admin/start-game', async (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    if (gameState.inProgress) {
        return res.status(400).json({ error: 'Une partie est déjà en cours' });
    }

    try {
        const totalPlayers = gameState.players.size;
        const game = await db.createGame(totalPlayers);
        
        gameState.inProgress = true;
        gameState.currentGameId = game.id;
        gameState.currentQuestionIndex = 0;
        gameState.gameStartTime = Date.now();
        
        // Initialiser les joueurs
        gameState.players.forEach(player => {
            player.lives = 3;
            player.correctAnswers = 0;
        });

        console.log(`🎮 Partie démarrée avec ${totalPlayers} joueurs`);
        io.emit('game-started', { totalPlayers });
        
        res.json({ success: true, gameId: game.id });
    } catch (error) {
        console.error('❌ Erreur démarrage partie:', error);
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

    try {
        gameState.currentQuestionIndex++;
        const difficulty = getDifficultyForQuestion(gameState.currentQuestionIndex);
        const questions = await db.getRandomQuestions(difficulty, 1);
        
        if (questions.length === 0) {
            return res.status(404).json({ error: 'Aucune question disponible' });
        }

        const question = questions[0];
        
        // Préparer la question (sans la bonne réponse)
        const questionData = {
            questionNumber: gameState.currentQuestionIndex,
            question: question.question,
            answers: [
                question.answer1,
                question.answer2,
                question.answer3,
                question.answer4
            ].filter(a => a !== null),
            serie: question.serie,
            difficulty: question.difficulty
        };

        gameState.questionStartTime = Date.now();
        gameState.answers.clear();

        io.emit('new-question', questionData);
        
        // Auto-révéler après 7 secondes
        setTimeout(() => {
            if (gameState.inProgress) {
                revealAnswers(question.coanswer);
            }
        }, 7000);

        res.json({ success: true, question: questionData });
    } catch (error) {
        console.error('❌ Erreur question suivante:', error);
        res.status(500).json({ error: error.message });
    }
});

// Fonction pour révéler les réponses
function revealAnswers(correctAnswer) {
    const stats = {
        correct: 0,
        wrong: 0,
        afk: 0,
        livesDistribution: { 3: 0, 2: 0, 1: 0, 0: 0 }
    };

    let eliminatedThisRound = 0;

    gameState.players.forEach((player, socketId) => {
        if (player.lives === 0) {
            stats.livesDistribution[0]++;
            return;
        }

        const playerAnswer = gameState.answers.get(socketId);

        if (!playerAnswer) {
            // AFK - perd une vie
            stats.afk++;
            player.lives--;
            if (player.lives === 0) eliminatedThisRound++;
        } else if (playerAnswer.answer === correctAnswer) {
            // Bonne réponse
            stats.correct++;
            player.correctAnswers++;
        } else {
            // Mauvaise réponse - perd une vie
            stats.wrong++;
            player.lives--;
            if (player.lives === 0) eliminatedThisRound++;
        }

        stats.livesDistribution[player.lives]++;
    });

    const alivePlayers = getAlivePlayers();

    io.emit('question-results', {
        correctAnswer,
        stats,
        eliminatedCount: eliminatedThisRound,
        remainingPlayers: alivePlayers.length
    });

    // Vérifier fin de partie
    if (alivePlayers.length <= 1) {
        endGame(alivePlayers[0]);
    }
}

// Terminer la partie
async function endGame(winner) {
    const duration = Math.floor((Date.now() - gameState.gameStartTime) / 1000);
    
    try {
        if (winner) {
            await db.endGame(
                gameState.currentGameId,
                winner.twitchId,
                gameState.currentQuestionIndex,
                duration
            );
            await db.updateUserStats(winner.twitchId, true, 1);
        }

        // Mettre à jour les stats des autres joueurs
        const losers = Array.from(gameState.players.values()).filter(p => p !== winner);
        let placement = 2;
        for (const loser of losers) {
            await db.updateUserStats(loser.twitchId, false, placement++);
        }

        io.emit('game-ended', {
            winner: winner ? {
                username: winner.username,
                correctAnswers: winner.correctAnswers
            } : null,
            duration,
            totalQuestions: gameState.currentQuestionIndex
        });

        // Reset l'état
        gameState.inProgress = false;
        gameState.currentGameId = null;
        gameState.currentQuestionIndex = 0;
        gameState.players.clear();
        gameState.answers.clear();

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
            gameActive: gameState.isActive,
            gameInProgress: gameState.inProgress
        });
    } catch (error) {
        console.error('❌ Erreur stats:', error);
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
            lives: 3,
            correctAnswers: 0
        });

        console.log(`✅ ${data.username} a rejoint le lobby`);
        
        io.emit('lobby-update', {
            playerCount: gameState.players.size,
            players: Array.from(gameState.players.values()).map(p => ({
                username: p.username,
                lives: p.lives
            }))
        });
    });

    // Répondre à une question
    socket.on('submit-answer', (data) => {
        if (!gameState.inProgress) return;

        const player = gameState.players.get(socket.id);
        if (!player || player.lives === 0) return;

        const responseTime = Date.now() - gameState.questionStartTime;

        gameState.answers.set(socket.id, {
            answer: data.answer,
            time: responseTime
        });

        socket.emit('answer-recorded');
    });

    // Déconnexion
    socket.on('disconnect', () => {
        const player = gameState.players.get(socket.id);
        if (player) {
            console.log(`❌ ${player.username} s'est déconnecté`);
            gameState.players.delete(socket.id);
            gameState.answers.delete(socket.id);

            io.emit('lobby-update', {
                playerCount: gameState.players.size,
                players: Array.from(gameState.players.values()).map(p => ({
                    username: p.username,
                    lives: p.lives
                }))
            });
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