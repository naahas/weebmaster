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

            // État du jeu
            isGameActive: false,
            gameInProgress: false,
            gameStartedOnServer: false, // 🆕 Track si une partie a démarré côté serveur
            gameEnded: false,

            // Lobby
            playerCount: 0,
            hasJoined: false,

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

        // ========== Restauration d'état ==========
        async restoreGameState() {
            try {
                const response = await fetch('/game/state');
                const state = await response.json();
                
                this.isGameActive = state.isActive;
                this.playerCount = state.playerCount;
                
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
                        this.timerProgress = (state.timeRemaining / 7) * 100;
                        this.startTimer(state.timeRemaining); // 🆕 Passer le temps restant
                    } else {
                        // Timer écoulé
                        this.timeRemaining = 0;
                        this.timerProgress = 0;
                    }
                    
                    console.log(`✅ Question restaurée avec ${state.timeRemaining}s restantes`);
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
            this.socket.on('game-activated', () => {
                this.isGameActive = true;
                this.showNotification('Le jeu est maintenant actif ! 🎮', 'success');
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
                this.playerLives = 3;
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
                    this.showNotification(`La partie commence avec ${data.totalPlayers} joueurs !`, 'success');
                } else {
                    // Le joueur n'a pas rejoint ou arrive en cours de partie
                    // On ne change pas gameInProgress, il reste en mode spectateur
                    console.log('⏳ Partie en cours - Vous êtes spectateur');
                }
            });

            this.socket.on('lobby-update', (data) => {
                this.playerCount = data.playerCount;
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

                // Mettre à jour les vies du joueur
                if (this.selectedAnswer && this.selectedAnswer !== results.correctAnswer) {
                    this.playerLives = Math.max(0, this.playerLives - 1);
                } else if (!this.selectedAnswer) {
                    this.playerLives = Math.max(0, this.playerLives - 1);
                }
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

        startTimer(initialTime = 7) {
            // Ne pas restart le timer s'il tourne déjà
            if (this.timerInterval) {
                console.log('⚠️ Timer déjà en cours');
                return;
            }

            this.timeRemaining = initialTime;
            this.timerProgress = (initialTime / 7) * 100;

            this.timerInterval = setInterval(() => {
                this.timeRemaining--;
                this.timerProgress = (this.timeRemaining / 7) * 100;

                if (this.timeRemaining <= 0) {
                    this.stopTimer();
                }
            }, 1000);
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
            const lineColor = this.isDark ? '#FFA500' : '#FF8C00';

            particlesJS('particles-js', {
                particles: {
                    number: {
                        value: 80,
                        density: {
                            enable: true,
                            value_area: 800
                        }
                    },
                    color: {
                        value: particleColor
                    },
                    shape: {
                        type: 'circle'
                    },
                    opacity: {
                        value: 0.5,
                        random: false
                    },
                    size: {
                        value: 3,
                        random: true
                    },
                    line_linked: {
                        enable: true,
                        distance: 150,
                        color: lineColor,
                        opacity: 0.4,
                        width: 1
                    },
                    move: {
                        enable: true,
                        speed: 2,
                        direction: 'none',
                        random: false,
                        straight: false,
                        out_mode: 'out',
                        bounce: false
                    }
                },
                interactivity: {
                    detect_on: 'canvas',
                    events: {
                        onhover: {
                            enable: true,
                            mode: 'repulse'
                        },
                        onclick: {
                            enable: true,
                            mode: 'push'
                        },
                        resize: true
                    },
                    modes: {
                        repulse: {
                            distance: 100,
                            duration: 0.4
                        },
                        push: {
                            particles_nb: 4
                        }
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