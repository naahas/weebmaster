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
        ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME || process.env.VERCEL_URL || 'shonenmaster.com'}/auth/twitch/callback`
        : `http://localhost:${PORT}/auth/twitch/callback`);

// ============================================

// ============================================
// Middleware
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.set('trust proxy' , 1);


app.use(session({
    secret: process.env.SESSION_SECRET || 'pikine-secret-2025',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24h,
        httpOnly: true,
        sameSite: 'lax'

    }
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
    // 🆕 Calculer le temps restant du timer si une question est en cours
    let timeRemaining = null;
    if (gameState.questionStartTime && gameState.inProgress) {
        const elapsed = Math.floor((Date.now() - gameState.questionStartTime) / 1000);
        timeRemaining = Math.max(0, 7 - elapsed);
    }

    // BUG FIX: Inclure la liste des joueurs pour l'admin  
    const playersData = Array.from(gameState.players.values()).map(player => ({
        socketId: player.socketId,
        twitchId: player.twitchId,
        username: player.username,
        lives: player.lives,
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
        players: playersData // BUG FIX: Liste complete des joueurs
    });
});

// ============================================
// Fichiers statiques (APRÈS les routes API)
// ============================================
app.use(express.static('src/html'));
app.use(express.static('src/style'));
app.use(express.static('src/script'));


// ============================================
// État du jeu
// ============================================
const gameState = {
    isActive: false,              // Le jeu est-il activé ?
    inProgress: false,            // Une partie est-elle en cours ?
    currentGameId: null,          // ID de la partie en cours
    currentQuestionIndex: 0,      // Index de la question actuelle
    currentQuestion: null,        // 🆕 Question actuellement affichée
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
        
        // 🆕 Reset la grille des joueurs à l'ouverture du lobby
        gameState.players.clear();
        gameState.answers.clear();
        gameState.currentQuestionIndex = 0;
        gameState.currentQuestion = null;
        gameState.questionStartTime = null;
        gameState.gameStartTime = null;
        gameState.inProgress = false;
        gameState.currentGameId = null;
        
        io.emit('game-activated');
    } else {
        console.log('❌ Jeu désactivé');
        
        // 🆕 Reset complet de l'état si une partie était en cours
        if (gameState.inProgress) {
            console.log('⚠️ Partie en cours annulée - Reset de l\'état');
        }
        
        gameState.inProgress = false;
        gameState.currentGameId = null;
        gameState.currentQuestionIndex = 0;
        gameState.currentQuestion = null; // 🆕 Reset question
        gameState.players.clear();
        gameState.answers.clear();
        gameState.questionStartTime = null;
        gameState.gameStartTime = null;
        
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

    // 🆕 Vérifier qu'il y a au moins 1 joueur dans le lobby
    const totalPlayers = gameState.players.size;
    if (totalPlayers === 0) {
        return res.status(400).json({ 
            success: false, 
            error: 'Impossible de démarrer : aucun joueur dans le lobby' 
        });
    }

    try {
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
        
        // 🆕 Envoyer des infos différentes selon si le joueur participe ou non
        io.sockets.sockets.forEach((socket) => {
            const socketId = socket.id;
            const player = gameState.players.get(socketId);
            
            if (player) {
                // Le joueur participe
                socket.emit('game-started', { totalPlayers, isParticipating: true });
            } else {
                // Le joueur ne participe pas (spectateur ou pas rejoint)
                socket.emit('game-started', { totalPlayers, isParticipating: false });
            }
        });
        
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

    // 🆕 BUG 2 FIX: Bloquer si une question est déjà en cours (timer actif)
    if (gameState.questionStartTime && gameState.currentQuestion) {
        const elapsed = Math.floor((Date.now() - gameState.questionStartTime) / 1000);
        if (elapsed < 7) {
            const timeRemaining = 7 - elapsed;
            return res.status(400).json({ 
                error: 'Une question est déjà en cours',
                timeRemaining: timeRemaining,
                blocked: true
            });
        }
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
            difficulty: question.difficulty,
            timeLimit: 7 // Durée en secondes
        };

        // 🆕 Sauvegarder la question complète avec la bonne réponse dans gameState
        gameState.currentQuestion = {
            ...questionData,
            correctAnswer: question.coanswer
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
    const playersDetails = []; // 🆕 Détails pour l'admin

    gameState.players.forEach((player, socketId) => {
        let status = 'afk';
        let isCorrect = false;
        const playerAnswer = gameState.answers.get(socketId);
        
        if (player.lives === 0) {
            stats.livesDistribution[0]++;
            status = 'eliminated';
        } else if (!playerAnswer) {
            // AFK - perd une vie
            stats.afk++;
            player.lives--;
            if (player.lives === 0) eliminatedThisRound++;
            status = 'afk';
        } else if (playerAnswer.answer === correctAnswer) {
            // Bonne réponse
            stats.correct++;
            player.correctAnswers++;
            status = 'correct';
            isCorrect = true;
        } else {
            // Mauvaise réponse - perd une vie
            stats.wrong++;
            player.lives--;
            if (player.lives === 0) eliminatedThisRound++;
            status = 'wrong';
        }

        if (player.lives > 0 || status !== 'eliminated') {
            stats.livesDistribution[player.lives]++;
        }

        // 🆕 Ajouter les détails du joueur pour l'admin
        playersDetails.push({
            socketId: socketId,
            username: player.username,
            lives: player.lives,
            status: status,
            responseTime: playerAnswer?.time || null,
            isCorrect: isCorrect
        });
    });

    const alivePlayers = getAlivePlayers();

    // 🆕 Créer le tableau playersData pour l'admin
    const playersData = Array.from(gameState.players.values()).map(player => ({
        twitchId: player.twitchId,
        username: player.username,
        lives: player.lives,
        correctAnswers: player.correctAnswers
    }));

    io.emit('question-results', {
        correctAnswer,
        stats,
        eliminatedCount: eliminatedThisRound,
        remainingPlayers: alivePlayers.length,
        players: playersDetails, // Détails des joueurs pour l'admin
        playersData: playersData  // 🆕 Données complètes des joueurs
    });

    // 🆕 Reset la question actuelle après révélation
    gameState.currentQuestion = null;

    // Vérifier fin de partie
    if (alivePlayers.length <= 1) {
        endGame(alivePlayers[0]);
    }
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
            
            // 🆕 Récupérer les stats complètes du winner depuis la DB
            const winnerUser = await db.getUserByTwitchId(winner.twitchId);
            
            winnerData = {
                username: winner.username,
                correctAnswers: winner.correctAnswers,
                livesRemaining: winner.lives, // 🆕 Vies restantes
                totalVictories: winnerUser ? winnerUser.total_victories : 1 // 🆕 Total victoires
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
            totalQuestions: gameState.currentQuestionIndex
        });

        // Reset l'état
        gameState.inProgress = false;
        gameState.currentGameId = null;
        gameState.currentQuestionIndex = 0;
        gameState.currentQuestion = null; // 🆕 Reset question
        gameState.questionStartTime = null; // 🆕 Reset timer
        gameState.gameStartTime = null; // 🆕 Reset game start time
        gameState.players.clear();
        gameState.answers.clear();

        // 🆕 Fermer automatiquement le lobby à la fin de la partie
        gameState.isActive = false;
        io.emit('game-deactivated');
        console.log('🔒 Lobby fermé automatiquement après la fin de partie');

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
            activePlayers: gameState.inProgress ? getAlivePlayers().length : 0, // 🆕 0 si pas en cours
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
                twitchId: p.twitchId,
                username: p.username,
                lives: p.lives
            }))
        });
    });

    // 🆕 Quitter le lobby
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
            // 🆕 Sauvegarder la réponse de l'ancien socketId AVANT de supprimer
            const previousAnswer = gameState.answers.get(oldSocketId);
            
            // Supprimer l'ancienne référence
            gameState.players.delete(oldSocketId);
            gameState.answers.delete(oldSocketId);
            
            // Restaurer le joueur avec le nouveau socketId
            existingPlayer.socketId = socket.id;
            gameState.players.set(socket.id, existingPlayer);
            
            // 🆕 Transférer la réponse au nouveau socketId si elle existait
            if (previousAnswer) {
                gameState.answers.set(socket.id, previousAnswer);
            }
            
            // 🆕 Nettoyer les marqueurs de déconnexion temporaire
            delete existingPlayer.disconnectedAt;
            delete existingPlayer.disconnectedSocketId;
            
            console.log(`🔄 ${data.username} reconnecté - ${existingPlayer.lives} ❤️`);
            
            // 🆕 Envoyer l'état du joueur au client avec sa réponse précédente
            socket.emit('player-restored', {
                lives: existingPlayer.lives,
                correctAnswers: existingPlayer.correctAnswers,
                currentQuestionIndex: gameState.currentQuestionIndex,
                hasAnswered: !!previousAnswer, // A répondu si previousAnswer existe
                selectedAnswer: previousAnswer ? previousAnswer.answer : null // 🆕 La réponse sélectionnée
            });
            
            // 🆕 Mettre à jour le compteur de joueurs pour l'admin
            io.emit('lobby-update', {
                playerCount: gameState.players.size,
                players: Array.from(gameState.players.values()).map(p => ({
                    twitchId: p.twitchId,
                    username: p.username,
                    lives: p.lives
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
        if (!player || player.lives === 0) return;

        const responseTime = Date.now() - gameState.questionStartTime;

        gameState.answers.set(socket.id, {
            answer: data.answer,
            time: responseTime
        });

        socket.emit('answer-recorded');
        
        // 🆕 Notifier l'admin en temps réel qu'un joueur a répondu
        io.emit('answer-submitted', {
            socketId: socket.id,
            answeredCount: gameState.answers.size,
            totalPlayers: gameState.players.size
        });
    });

    // Déconnexion
    socket.on('disconnect', () => {
        const player = gameState.players.get(socket.id);
        if (player) {
            console.log(`🔌 ${player.username} déconnecté (socket: ${socket.id})`);
            
            // 🆕 Si une partie est en cours, NE PAS supprimer le joueur immédiatement
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