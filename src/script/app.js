// ============================================
// WEEBMASTER - Frontend App (Vue 3) - FIXED
// ============================================

const { createApp } = Vue;

createApp({
    data() {
        return {
            // Authentification
            isAuthenticated: false,
            username: '',
            twitchId: '',

            gameLives: 3,
            gameTime: 7,

            // État du jeu
            isGameActive: false,
            gameInProgress: false,
            gameStartedOnServer: false, // 🆕 Track si une partie a démarré côté serveur
            gameEnded: false,

            // Lobby
            playerCount: 0,
            hasJoined: false,


            // Profil & Badges
            showProfileModal: false,
            currentTab: 'profile',
            profileData: null,

            // Leaderboard
            leaderboard: [],
            leaderboardLoaded: false,
            showLeaderboard: false, 

            // Question en cours
            currentQuestion: null,
            currentQuestionNumber: 0,
            selectedAnswer: null,
            hasAnswered: false,
            timeRemaining: 7,
            timerProgress: 100,
            timerInterval: null,

            // Résultats
            showResults: false,
            questionResults: {
                correctAnswer: null,
                stats: {
                    correct: 0,
                    wrong: 0,
                    afk: 0,
                    livesDistribution: { 3: 0, 2: 0, 1: 0, 0: 0 }
                },
                eliminatedCount: 0,
                remainingPlayers: 0
            },

            // Joueur
            playerLives: 3,

            // Game Over
            gameEndData: {
                winner: null,
                totalQuestions: 0,
                duration: 0
            },

            // Thème
            isDark: true,

            // Socket
            socket: null,
            
            // Reconnexion
            needsReconnect: false,
            shouldRejoinLobby: false
        };
    },

    async mounted() {
        await this.checkAuth();
        await this.restoreGameState();
        await this.loadLeaderboard();
        this.initParticles();
        this.initSocket();
        this.loadTheme();
    },

    methods: {
        // ========== Authentification ==========
        async checkAuth() {
            try {
                const response = await fetch('/auth/status');
                const data = await response.json();
                
                if (data.authenticated) {
                    this.isAuthenticated = true;
                    this.username = data.username;
                    this.twitchId = data.twitchId;
                }
            } catch (error) {
                console.error('Erreur vérification auth:', error);
            }
        },

        // ========== Profil & Badges ==========
        async openProfile() {
            if (!this.isAuthenticated) return;
            
            try {
                const response = await fetch(`/profile/${this.twitchId}`);
                const data = await response.json();
                
                this.profileData = data;
                this.showProfileModal = true;
                this.currentTab = 'profile';
                
                console.log('✅ Profil chargé:', data);
            } catch (error) {
                console.error('❌ Erreur chargement profil:', error);
                this.showNotification('Erreur chargement profil', 'error');
            }
        },

        closeProfile() {
            this.showProfileModal = false;
            this.profileData = null;
        },

        async equipTitle(titleId) {
            try {
                const response = await fetch('/profile/update-title', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        twitchId: this.twitchId,
                        titleId: titleId
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Recharger le profil
                    await this.openProfile();
                    this.showNotification('Titre équipé !', 'success');
                }
            } catch (error) {
                console.error('❌ Erreur équipement titre:', error);
                this.showNotification('Erreur changement titre', 'error');
            }
        },

        toggleLeaderboard() {
            this.showLeaderboard = !this.showLeaderboard;
        },

        // ========== Leaderboard ==========
        async loadLeaderboard() {
            try {
                // 🆕 Attendre 1 seconde avant de charger
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const response = await fetch('/leaderboard?limit=10');
                const data = await response.json();
                
                // Arrondir le win rate (pas de décimal)
                this.leaderboard = data.map(player => ({
                    ...player,
                    win_rate: Math.round(parseFloat(player.win_rate))
                }));
                
                // 🆕 Marquer comme chargé
                this.leaderboardLoaded = true;
                
                console.log('✅ Leaderboard chargé:', this.leaderboard);
            } catch (error) {
                console.error('❌ Erreur leaderboard:', error);
            }
        },

        // ========== Restauration d'état ==========
        async restoreGameState() {
            try {
                const response = await fetch('/game/state');
                const state = await response.json();
                
                this.isGameActive = state.isActive;
                this.playerCount = state.playerCount;
                
                // 🆕 Restaurer les paramètres configurables
                if (state.lives) this.gameLives = state.lives;
                if (state.questionTime) this.gameTime = state.questionTime;
                
                // 🆕 Restaurer gameStartedOnServer depuis l'état serveur
                this.gameStartedOnServer = state.inProgress;
                
                // 🆕 IMPORTANT: Si le jeu n'est PAS actif, nettoyer le localStorage
                // (cas du redémarrage serveur ou fermeture du jeu)
                if (!state.isActive) {
                    localStorage.removeItem('hasJoinedLobby');
                    localStorage.removeItem('lobbyTwitchId');
                    console.log('🧹 localStorage nettoyé (jeu non actif)');
                    return; // Sortir sans restaurer l'état
                }
                
                // 🆕 Restaurer l'état "hasJoined" depuis localStorage AVANT de restaurer gameInProgress
                if (this.isAuthenticated) {
                    const savedLobbyState = localStorage.getItem('hasJoinedLobby');
                    const savedTwitchId = localStorage.getItem('lobbyTwitchId');
                    
                    // Vérifier que c'est bien le même utilisateur
                    if (savedLobbyState === 'true' && savedTwitchId === this.twitchId) {
                        this.hasJoined = true;
                        console.log('✅ État hasJoined restauré depuis localStorage');
                        
                        // Re-joindre le lobby côté serveur si pas en partie
                        if (this.isGameActive && !state.inProgress) {
                            this.shouldRejoinLobby = true;
                        }
                    }
                }
                
                // 🆕 IMPORTANT: Ne mettre gameInProgress = true que si le joueur a rejoint
                if (state.inProgress && this.hasJoined) {
                    this.gameInProgress = true;
                } else {
                    this.gameInProgress = false;
                }
                
                // 🆕 Restaurer la question en cours si elle existe ET que le joueur participe
                if (state.currentQuestion && state.inProgress && this.hasJoined) {
                    this.currentQuestion = state.currentQuestion;
                    this.currentQuestionNumber = state.currentQuestion.questionNumber;
                    
                    // Restaurer le timer avec le temps restant RÉEL
                    if (state.timeRemaining > 0) {
                        this.timeRemaining = state.timeRemaining;
                        this.timerProgress = (state.timeRemaining / this.gameTime) * 100;
                        this.startTimer(state.timeRemaining); // 🆕 Passer le temps restant
                    } else {
                        // Timer écoulé
                        this.timeRemaining = 0;
                        this.timerProgress = 0;
                    }
                    
                    console.log(`✅ Question restaurée avec ${state.timeRemaining}s restantes`);
                
                // 🆕 Restaurer les résultats si affichés ET que le joueur participe
                if (state.showResults && state.lastQuestionResults && state.inProgress && this.hasJoined) {
                    this.showResults = true;
                    this.questionResults = state.lastQuestionResults;
                    console.log('✅ Résultats de la question restaurés');
                }
                }
                
                // Si partie en cours ET que le joueur avait rejoint, se reconnecter
                if (state.inProgress && this.isAuthenticated && this.hasJoined) {
                    this.needsReconnect = true;
                }
            } catch (error) {
                console.error('Erreur restauration état:', error);
            }
        },

        loginTwitch() {
            window.location.href = '/auth/twitch';
        },

        async logout() {
            // 🆕 Notifier le serveur qu'on quitte le lobby
            if (this.hasJoined && this.socket) {
                this.socket.emit('leave-lobby', {
                    twitchId: this.twitchId,
                    username: this.username
                });
            }
            
            // Nettoyer le localStorage pour éjecter du lobby
            localStorage.removeItem('hasJoinedLobby');
            localStorage.removeItem('lobbyTwitchId');
            
            window.location.href = '/auth/logout';
        },

        // ========== Socket.IO ==========
        initSocket() {
            this.socket = io();

            // Événements de connexion
            this.socket.on('connect', () => {
                if (this.needsReconnect && this.gameInProgress) {
                    this.socket.emit('reconnect-player', {
                        twitchId: this.twitchId,
                        username: this.username
                    });
                    this.needsReconnect = false;
                }
                
                // 🆕 Re-joindre le lobby si l'état a été restauré
                if (this.shouldRejoinLobby && this.isGameActive && !this.gameInProgress) {
                    this.socket.emit('join-lobby', {
                        twitchId: this.twitchId,
                        username: this.username
                    });
                    this.shouldRejoinLobby = false;
                    console.log('✅ Re-jointure automatique du lobby après refresh');
                }
            });

            // Restauration du joueur
            this.socket.on('player-restored', (data) => {
                this.playerLives = data.lives;
                this.currentQuestionNumber = data.currentQuestionIndex;
                this.hasJoined = true;
                
                // 🆕 Restaurer l'état hasAnswered et selectedAnswer si le joueur a déjà répondu
                if (data.hasAnswered) {
                    this.hasAnswered = true;
                    this.selectedAnswer = data.selectedAnswer; // 🆕 Restaurer la réponse sélectionnée
                    console.log(`⚠️ Réponse ${data.selectedAnswer} restaurée`);
                }
                
                this.showNotification('Reconnecté à la partie !', 'success');
            });

            // Événements du serveur
            this.socket.on('game-activated', (data) => {
                this.isGameActive = true;
                // 🆕 Mettre à jour les paramètres si fournis
                if (data && data.lives) this.gameLives = data.lives;
                if (data && data.questionTime) this.gameTime = data.questionTime;
                this.showNotification('Le jeu est maintenant actif ! 🎮', 'success');
            });

            // 🆕 Écouter les mises à jour de configuration
            this.socket.on('game-config-updated', (data) => {
                this.gameLives = data.lives;
                this.gameTime = data.questionTime;
                console.log(`⚙️ Paramètres mis à jour: ${data.lives}❤️ - ${data.questionTime}s`);
            });

            this.socket.on('game-deactivated', () => {
                // 🆕 Reset COMPLET de l'état du jeu
                this.isGameActive = false;
                this.gameInProgress = false;
                this.gameStartedOnServer = false; // 🆕 Reset flag
                this.gameEnded = false;
                this.hasJoined = false;
                this.currentQuestion = null;
                this.currentQuestionNumber = 0;
                this.selectedAnswer = null;
                this.hasAnswered = false;
                this.showResults = false;
                this.playerLives = this.gameLives;  // 🆕 Utiliser gameLives configuré
                this.playerCount = 0;
                
                // Arrêter le timer si actif
                this.stopTimer();
                
                // Nettoyer localStorage
                localStorage.removeItem('hasJoinedLobby');
                localStorage.removeItem('lobbyTwitchId');
                
                this.showNotification('Le jeu a été désactivé', 'info');
            });

            this.socket.on('game-started', (data) => {
                // 🆕 Marquer qu'une partie a démarré côté serveur
                this.gameStartedOnServer = true;
                
                // 🆕 Vérifier si le joueur participe à la partie
                if (data.isParticipating) {
                    // Le joueur a rejoint le lobby, il participe
                    this.gameInProgress = true;
                    this.playerLives = this.gameLives;  // 🆕 Utiliser gameLives configuré
                    this.showNotification(`La partie commence avec ${data.totalPlayers} joueurs !`, 'success');
                } else {
                    // Le joueur n'a pas rejoint ou arrive en cours de partie
                    // On ne change pas gameInProgress, il reste en mode spectateur
                    console.log('⏳ Partie en cours - Vous êtes spectateur');
                }
            });

            this.socket.on('lobby-update', (data) => {
                this.playerCount = data.playerCount;
                // 🆕 Mettre à jour les paramètres si fournis
                if (data.lives) this.gameLives = data.lives;
                if (data.questionTime) this.gameTime = data.questionTime;
            });

            // 🔒 BUG FIX 1: Empêcher l'affichage des questions si non inscrit au lobby
            this.socket.on('new-question', (question) => {
                if (!this.hasJoined) {
                    console.log('❌ Vous devez rejoindre le lobby pour voir les questions');
                    return;
                }
                
                this.showResults = false;
                this.currentQuestion = question;
                this.currentQuestionNumber = question.questionNumber;
                this.selectedAnswer = null;
                this.hasAnswered = false;
                this.startTimer();
            });

            this.socket.on('question-results', (results) => {
                this.stopTimer();
                this.questionResults = results;
                this.showResults = true;

                // 🆕 Ne mettre à jour les vies QUE si ce n'est pas un cas où tout le monde perdrait
                if (!results.allWillLose) {
                    // Mettre à jour les vies du joueur
                    if (this.selectedAnswer && this.selectedAnswer !== results.correctAnswer) {
                        this.playerLives = Math.max(0, this.playerLives - 1);
                    } else if (!this.selectedAnswer) {
                        this.playerLives = Math.max(0, this.playerLives - 1);
                    }
                }
                // 🆕 Si allWillLose = true, personne ne perd de vie !
            });

            this.socket.on('answer-recorded', () => {
                this.hasAnswered = true;
            });

            this.socket.on('game-ended', (data) => {
                this.gameEnded = true;
                this.gameStartedOnServer = false; // 🆕 Reset flag
                this.gameEndData = data;
                this.stopTimer();
                
                // 🆕 Nettoyer localStorage car la partie est terminée
                localStorage.removeItem('hasJoinedLobby');
                localStorage.removeItem('lobbyTwitchId');
            });

            this.socket.on('error', (data) => {
                this.showNotification(data.message, 'error');
            });


            this.socket.on('settings-updated', (data) => {
                this.gameLives = data.lives;
                this.gameTime = data.timePerQuestion;
                console.log(`⚙️ Paramètres mis à jour: ${data.lives} vies, ${data.timePerQuestion}s`);
            });

            // 🆕 Écouter quand un joueur répond
            this.socket.on('player-answered', (data) => {
                if (data.username !== this.username) {
                    this.showAnswerNotification(data.username);
                }
                
            });
        },

        // 🆕 Afficher la notification quand un joueur répond
        showAnswerNotification(username) {
            const notification = document.createElement('div');
            notification.className = 'answer-notification';
            
            // 🆕 Choisir aléatoirement une trajectoire (1 ou 2)
            const randomPath = Math.random() < 0.5 ? 'path1' : 'path2';
            notification.classList.add(randomPath);
            
            notification.innerHTML = `
                <span class="notif-username">${username}</span>
                <span class="notif-text">a répondu</span>
            `;
            
            document.body.appendChild(notification);
            
            // Suppression après l'animation
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 3000);
        },

        // ========== Lobby ==========
        joinLobby() {
            if (!this.isAuthenticated) {
                this.showNotification('Vous devez être connecté !', 'error');
                return;
            }

            this.socket.emit('join-lobby', {
                twitchId: this.twitchId,
                username: this.username
            });

            this.hasJoined = true;
            
            // 🆕 Sauvegarder l'état dans localStorage
            localStorage.setItem('hasJoinedLobby', 'true');
            localStorage.setItem('lobbyTwitchId', this.twitchId);
            
            this.showNotification('Vous avez rejoint le lobby !', 'success');
        },

        // ========== Question ==========
        selectAnswer(answerIndex) {
            if (this.hasAnswered || this.playerLives === 0) return;

            this.selectedAnswer = answerIndex;
            
            this.socket.emit('submit-answer', {
                answer: answerIndex
            });
        },

        startTimer(initialTime = null) {
            // Ne pas restart le timer s'il tourne déjà
            if (this.timerInterval) {
                console.log('⚠️ Timer déjà en cours');
                return;
            }

            this.timeRemaining = initialTime !== null ? initialTime : this.gameTime;
            this.timerProgress = (this.timeRemaining / this.gameTime) * 100;

            // 🆕 Animation fluide avec requestAnimationFrame
            const startTime = Date.now();
            const duration = this.timeRemaining * 1000; // Durée en ms
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const remaining = Math.max(0, duration - elapsed);
                
                // 🆕 Mise à jour continue de la progression
                this.timerProgress = (remaining / (this.gameTime * 1000)) * 100;
                this.timeRemaining = Math.ceil(remaining / 1000); // Arrondi pour l'affichage du nombre
                
                if (remaining > 0) {
                    requestAnimationFrame(animate);
                } else {
                    this.timerProgress = 0;
                    this.timeRemaining = 0;
                    this.stopTimer();
                }
            };
            
            requestAnimationFrame(animate);
        },

        stopTimer() {
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
        },

        // ========== Résultats ==========
        getBarHeight(value) {
            const max = Math.max(
                this.questionResults.stats.correct,
                this.questionResults.stats.wrong,
                this.questionResults.stats.afk
            );
            if (max === 0) return '0%';
            return ((value / max) * 100) + '%';
        },

        getLifeBarWidth(count) {
            const total = Object.values(this.questionResults.stats.livesDistribution).reduce((a, b) => a + b, 0);
            if (total === 0) return '0%';
            return ((count / total) * 100) + '%';
        },

        // ========== Game Over ==========
        backToHome() {
            this.gameInProgress = false;
            this.gameEnded = false;
            this.currentQuestion = null;
            this.playerLives = 3;
            this.hasJoined = false;
            this.showResults = false;
            
            // 🆕 Nettoyer localStorage
            localStorage.removeItem('hasJoinedLobby');
            localStorage.removeItem('lobbyTwitchId');
        },

        formatDuration(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        },

        // ========== Thème ==========
        toggleTheme() {
            this.isDark = !this.isDark;
            document.body.classList.toggle('light-theme', !this.isDark);
            localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
            
            this.initParticles();
        },

        loadTheme() {
            const savedTheme = localStorage.getItem('theme') || 'dark';
            this.isDark = savedTheme === 'dark';
            document.body.classList.toggle('light-theme', !this.isDark);
        },

        // ========== Particles.js ==========
        initParticles() {
    const particleColor = this.isDark ? '#FFD700' : '#FF8C00';

    particlesJS('particles-js', {
        particles: {
            number: { value: 50, density: { enable: true, value_area: 800 } }, // 🆕 +20 lucioles
            color: { value: ['#FFD700', '#FFA500', '#FF8C00'] },
            shape: { type: 'circle' },
            opacity: {
                value: 0.7, // 🆕 Augmenté de 0.5 à 0.7
                random: true,
                anim: { enable: true, speed: 0.8, opacity_min: 0.3, sync: false } // 🆕 Min à 0.3 au lieu de 0.1
            },
            size: {
                value: 4, // 🆕 Augmenté de 3 à 4
                random: true,
                anim: { enable: true, speed: 2, size_min: 1, sync: false } // 🆕 Min à 1 au lieu de 0.5
            },
            line_linked: { enable: false },
            move: {
                enable: true,
                speed: 0.8, // 🆕 Augmenté de 0.5 à 0.8 (plus vivant)
                direction: 'none',
                random: true,
                straight: false,
                out_mode: 'bounce'
            }
        },
        interactivity: {
            detect_on: 'canvas',
            events: {
                onhover: { enable: true, mode: 'repulse' },
                onclick: { enable: false }
            },
            modes: {
                repulse: { distance: 120, duration: 0.4 } // 🆕 Distance augmentée
            }
        },
        retina_detect: true
    });
},

        // ========== Notifications ==========
        showNotification(message, type = 'info') {
            // 🔇 Notifications désactivées - Log uniquement en console
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    },

    beforeUnmount() {
        if (this.socket) {
            this.socket.disconnect();
        }
        this.stopTimer();
    }
}).mount('#app');