
// ============================================
// WEEBMASTER - Frontend App (Vue 3)
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
            socket: null
        };
    },

    async mounted() {
        await this.checkAuth();
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

        loginTwitch() {
            window.location.href = '/auth/twitch';
        },

        async logout() {
            window.location.href = '/auth/logout';
        },

        // ========== Socket.IO ==========
        initSocket() {
            this.socket = io();

            // Événements du serveur
            this.socket.on('game-activated', () => {
                this.isGameActive = true;
                this.showNotification('Le jeu est maintenant actif ! 🎮', 'success');
            });

            this.socket.on('game-deactivated', () => {
                this.isGameActive = false;
                this.showNotification('Le jeu a été désactivé', 'info');
            });

            this.socket.on('game-started', (data) => {
                this.gameInProgress = true;
                this.showNotification(`La partie commence avec ${data.totalPlayers} joueurs !`, 'success');
            });

            this.socket.on('lobby-update', (data) => {
                this.playerCount = data.playerCount;
            });

            this.socket.on('new-question', (question) => {
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

                // Mettre à jour les vies du joueur (approximation)
                // Note: Le serveur pourrait envoyer les vies individuelles pour plus de précision
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
                this.gameEndData = data;
                this.stopTimer();
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

        startTimer() {
            this.timeRemaining = 7;
            this.timerProgress = 100;

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
            
            // Réinitialiser les particules avec le nouveau thème
            this.initParticles();
        },

        loadTheme() {
            const savedTheme = localStorage.getItem('theme') || 'dark';
            this.isDark = savedTheme === 'dark';
            document.body.classList.toggle('light-theme', !this.isDark);
        },

        // ========== Particles.js ==========
        initParticles() {
            const particleColor = this.isDark ? '#00ffff' : '#6366f1';
            const lineColor = this.isDark ? '#00ffff' : '#6366f1';

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
            // Simple console log pour l'instant, peut être amélioré avec un système de toast
            console.log(`[${type.toUpperCase()}] ${message}`);
            
            // Optionnel: Créer un toast visuel
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.textContent = message;
            document.body.appendChild(toast);

            setTimeout(() => {
                toast.classList.add('show');
            }, 100);

            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    },

    beforeUnmount() {
        if (this.socket) {
            this.socket.disconnect();
        }
        this.stopTimer();
    }
}).mount('#app');