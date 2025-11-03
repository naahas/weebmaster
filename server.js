// ============================================
// WEEBMASTER - Server Principal
// ============================================

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { Server } = require('socket.io');
const axios = require('axios');
const { db , supabase  } = require('./dbs');

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
    // 🆕 Calculer le temps restant du timer si une question est en cours
    let timeRemaining = null;
    if (gameState.questionStartTime && gameState.inProgress) {
        const elapsed = Math.floor((Date.now() - gameState.questionStartTime) / 1000);
        timeRemaining = Math.max(0, gameState.questionTime - elapsed);
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
        players: playersData, // BUG FIX: Liste complete des joueurs
        showResults: gameState.showResults,
        lastQuestionResults: gameState.lastQuestionResults,
        lives: gameState.lives, // 🆕 Paramètres configurables
        questionTime: gameState.questionTime
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
    isActive: false,              // Le jeu est-il activé ?
    inProgress: false,            // Une partie est-elle en cours ?
    currentGameId: null,          // ID de la partie en cours
    currentQuestionIndex: 0,      // Index de la question actuelle
    currentQuestion: null,        // 🆕 Question actuellement affichée
    players: new Map(),           // Map<socketId, playerData>
    questionStartTime: null,      // Timestamp du début de la question
    answers: new Map(),           // Map<socketId, answerData>
    gameStartTime: null,          // Timestamp du début du jeu
    showResults: false,           // Afficher les résultats de la dernière question
    lastQuestionResults: null,    // Résultats de la dernière question
    // 🆕 Paramètres configurables
    lives: 3,                     // Nombre de vies par défaut
    questionTime: 7,              // Temps par question par défaut
    answersCount: 4,              // Nombre de réponses par défaut (4 ou 6)
    usedQuestionIds: []           // 🆕 NOUVEAU: Tracker les questions déjà utilisées
};

// ============================================
// Helpers
// ============================================
function getDifficultyForQuestion(questionNumber) {
    if (questionNumber <= 7) return 'veryeasy';
    if (questionNumber <= 15) return 'easy';
    if (questionNumber <= 25) return 'medium';
    if (questionNumber <= 35) return 'hard';
    if (questionNumber <= 45) return 'veryhard';
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
        gameState.showResults = false;
        gameState.lastQuestionResults = null;
        gameState.questionStartTime = null;
        gameState.gameStartTime = null;
        gameState.inProgress = false;
        gameState.currentGameId = null;
        gameState.usedQuestionIds = []; // 🆕 RESET: Vider l'historique des questions
        
        io.emit('game-activated', {
            lives: gameState.lives,
            questionTime: gameState.questionTime
        });
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
        gameState.showResults = false;
        gameState.lastQuestionResults = null;
        gameState.players.clear();
        gameState.answers.clear();
        gameState.questionStartTime = null;
        gameState.gameStartTime = null;
        gameState.usedQuestionIds = []; // 🆕 RESET: Vider l'historique des questions
        
        io.emit('game-deactivated');
    }

    res.json({ isActive: gameState.isActive });
});

// 🆕 Mettre à jour les paramètres du jeu (vies et temps)
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

// 🆕 Route séparée pour changer les vies
app.post('/admin/set-lives', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    const { lives } = req.body;
    gameState.lives = parseInt(lives);

    console.log(`⚙️ Vies mises à jour: ${gameState.lives}❤️`);

    // 🔥 Mettre à jour les vies de tous les joueurs déjà connectés dans le lobby
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

// 🆕 Route séparée pour changer le temps par question
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

// 🆕 Route séparée pour changer le nombre de réponses
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
        gameState.showResults = false;
        gameState.lastQuestionResults = null;
        gameState.usedQuestionIds = []; // 🆕 RESET: Vider l'historique des questions au début de partie
        
        // Initialiser les joueurs
        gameState.players.forEach(player => {
            player.lives = gameState.lives;  // 🆕 Utiliser les vies configurées
            player.correctAnswers = 0;
        });

        console.log(`🎮 Partie démarrée avec ${totalPlayers} joueurs - ${gameState.lives}❤️ - ${gameState.questionTime}s`);
        
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

    // BUG 2 FIX: Bloquer si une question est déjà en cours (timer actif)
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
        gameState.currentQuestionIndex++;
        const difficulty = getDifficultyForQuestion(gameState.currentQuestionIndex);
        
        // 🆕 MODIFIÉ: Passer les IDs des questions déjà utilisées
        const questions = await db.getRandomQuestions(difficulty, 1, gameState.usedQuestionIds);
        
        if (questions.length === 0) {
            return res.status(404).json({ error: 'Aucune question disponible' });
        }

        const question = questions[0];
        
        // 🆕 NOUVEAU: Ajouter l'ID de la question aux questions utilisées
        gameState.usedQuestionIds.push(question.id);
        console.log(`📌 Question ID ${question.id} ajoutée à l'historique (${gameState.usedQuestionIds.length} questions utilisées)`);
        
        // 🆕 Récupérer toutes les réponses disponibles (filtrer les null)
        const allAnswers = [
            { text: question.answer1, index: 1 },
            { text: question.answer2, index: 2 },
            { text: question.answer3, index: 3 },
            { text: question.answer4, index: 4 },
            { text: question.answer5, index: 5 },
            { text: question.answer6, index: 6 }
        ].filter(answer => answer.text !== null && answer.text !== '');

        // 🆕 Identifier la bonne réponse
        const correctAnswerObj = allAnswers.find(a => a.index === question.coanswer);
        
        // 🆕 Réponses incorrectes (toutes sauf la bonne)
        const wrongAnswers = allAnswers.filter(a => a.index !== question.coanswer);
        
        // 🆕 Utiliser le nombre de réponses configuré (4 ou 6)
        const wrongAnswersNeeded = gameState.answersCount - 1; // -1 car on ajoute la bonne réponse
        const shuffledWrong = wrongAnswers.sort(() => 0.5 - Math.random()).slice(0, wrongAnswersNeeded);
        
        // 🆕 Combiner la bonne réponse + les mauvaises
        const selectedAnswers = [correctAnswerObj, ...shuffledWrong];
        
        // 🆕 Mélanger les 4 réponses finales
        const finalAnswers = selectedAnswers.sort(() => 0.5 - Math.random());
        
        // 🆕 Trouver le nouvel index de la bonne réponse après mélange
        const newCorrectIndex = finalAnswers.findIndex(a => a.index === question.coanswer) + 1;

        // Préparer la question (sans la bonne réponse côté client)
        const questionData = {
            questionNumber: gameState.currentQuestionIndex,
            question: question.question,
            answers: finalAnswers.map(a => a.text), // 🆕 Seulement le texte
            serie: question.serie,
            difficulty: question.difficulty,
            timeLimit: gameState.questionTime
        };

        // 🆕 Sauvegarder la question complète avec le NOUVEL index de la bonne réponse
        gameState.currentQuestion = {
            ...questionData,
            correctAnswer: newCorrectIndex // 🆕 Nouvel index après mélange
        };

        gameState.questionStartTime = Date.now();
        
        // 🆕 Réinitialiser showResults quand une nouvelle question est envoyée
        gameState.showResults = false;
        gameState.lastQuestionResults = null;
        gameState.answers.clear();

        io.emit('new-question', questionData);
        
        // Auto-révéler après le temps configuré avec le nouvel index
        setTimeout(() => {
            if (gameState.inProgress) {
                revealAnswers(newCorrectIndex); // 🆕 Utiliser le nouvel index
            }
        }, gameState.questionTime * 1000);

        res.json({ success: true, question: questionData });
    } catch (error) {
        console.error('❌ Erreur question suivante:', error);
        res.status(500).json({ error: error.message });
    }
});

// Fonction pour révéler les réponses
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
    
    // 🆕 NOUVEAU : Détecter si tous les joueurs en vie ont 1 vie et vont tous perdre
    const alivePlayers = getAlivePlayers();
    const allHaveOneLife = alivePlayers.every(p => p.lives === 1);
    let allWillLose = false;
    
    if (allHaveOneLife && alivePlayers.length > 1) {
        // Vérifier si tous vont perdre (personne n'a la bonne réponse)
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
            // AFK
            stats.afk++;
            // 🆕 Ne pas perdre de vie si tout le monde perdrait
            if (!allWillLose) {
                player.lives--;
                if (player.lives === 0) eliminatedThisRound++;
            }
            status = 'afk';
        } else if (playerAnswer.answer === correctAnswer) {
            // Bonne réponse
            stats.correct++;
            player.correctAnswers++;
            status = 'correct';
            isCorrect = true;
        } else {
            // Mauvaise réponse
            stats.wrong++;
            // 🆕 Ne pas perdre de vie si tout le monde perdrait
            if (!allWillLose) {
                player.lives--;
                if (player.lives === 0) eliminatedThisRound++;
            }
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

    const alivePlayersAfter = getAlivePlayers();

    // 🆕 Créer le tableau playersData pour l'admin
    const playersData = Array.from(gameState.players.values()).map(player => ({
        twitchId: player.twitchId,
        username: player.username,
        lives: player.lives,
        correctAnswers: player.correctAnswers
    }));

    // 🆕 Stocker les résultats dans gameState pour la restauration
    const resultsData = {
        correctAnswer,
        stats,
        eliminatedCount: eliminatedThisRound,
        remainingPlayers: alivePlayersAfter.length,
        players: playersDetails,
        playersData: playersData,
        allWillLose: allWillLose // 🆕 Indiquer si c'était un cas spécial
    };
    
    gameState.showResults = true;
    gameState.lastQuestionResults = resultsData;

    io.emit('question-results', resultsData);


    // Vérifier fin de partie
    if (alivePlayersAfter.length <= 1) {
        endGame(alivePlayersAfter[0]);
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
        gameState.showResults = false;
        gameState.lastQuestionResults = null;
        gameState.questionStartTime = null; // 🆕 Reset timer
        gameState.gameStartTime = null; // 🆕 Reset game start time
        gameState.players.clear();
        gameState.answers.clear();
        gameState.usedQuestionIds = []; // 🆕 RESET: Vider l'historique des questions

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

        // 🆕 Utiliser supabase directement
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
            lives: gameState.lives,  // 🆕 Utiliser les vies configurées
            correctAnswers: 0
        });

        console.log(`✅ ${data.username} a rejoint le lobby`);
        
        io.emit('lobby-update', {
            playerCount: gameState.players.size,
            lives: gameState.lives,  // 🆕 Envoyer les paramètres configurés
            questionTime: gameState.questionTime,
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

        // 🆕 Notifier TOUS les joueurs qu'un joueur a répondu
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