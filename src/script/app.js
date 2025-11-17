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


            gameMode: 'lives',
            gameLives: 3,
            gameTime: 10,


            playerPoints: 0,
            pointsAnimation: false,
            pointsGained: 0,

            // État du jeu
            isGameActive: false,
            gameInProgress: false,
            gameStartedOnServer: false,
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
            shouldRejoinLobby: false,


            comboLevel: 0,              // Niveau actuel (0, 1, 2, 3)
            comboProgress: 0,           // Nombre de bonnes réponses
            comboThresholds: [3, 7, 12], // Seuils : Lvl1=3, Lvl2=7 (3+4), Lvl3=12 (7+5)
            availableBonuses: [],       // ['5050', 'reveal', 'extralife' ou 'doublex2']
            usedBonuses: [],            // Bonus déjà utilisés dans la partie
            showBonusModal: false,      // Afficher/masquer le modal
            activeBonusEffect: null
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

    computed: {
        formattedPlayerPoints() {
            return this.playerPoints.toLocaleString('fr-FR');
        },

        // 🆕 COMPUTED POUR LES BONUS
        comboBarHeight() {
            if (this.comboLevel >= 3) return 100; // MAX atteint

            const currentThreshold = this.comboThresholds[this.comboLevel];
            const prevThreshold = this.comboLevel > 0 ? this.comboThresholds[this.comboLevel - 1] : 0;

            // 🔥 FIX : Calculer la progression RELATIVE au niveau actuel
            const progressInCurrentLevel = this.comboProgress - prevThreshold;
            const rangeForCurrentLevel = currentThreshold - prevThreshold;

            // Pourcentage de 0 à 100 pour CE niveau uniquement
            return Math.min(100, (progressInCurrentLevel / rangeForCurrentLevel) * 100);
        },

        hasUnusedBonuses() {
            return this.availableBonuses.length > 0;
        },

        unusedBonusCount() {
            return this.availableBonuses.length;
        },

        bonusList() {
            const bonuses = [
                {
                    id: '5050',
                    name: '50/50',
                    desc: 'Élimine 50% des mauvaises réponses',
                    available: this.availableBonuses.includes('5050'),
                    used: this.usedBonuses.includes('5050')
                },
                {
                    id: 'reveal',
                    name: 'Révéler',
                    desc: 'Affiche la bonne réponse',
                    available: this.availableBonuses.includes('reveal'),
                    used: this.usedBonuses.includes('reveal')
                },
                {
                    id: this.gameMode === 'lives' ? 'extralife' : 'doublex2',
                    name: this.gameMode === 'lives' ? '+1 Vie' : 'Points x2',
                    desc: this.gameMode === 'lives' ? 'Ajoute une vie' : 'Double les points de cette question',
                    available: this.availableBonuses.includes(this.gameMode === 'lives' ? 'extralife' : 'doublex2'),
                    used: this.usedBonuses.includes(this.gameMode === 'lives' ? 'extralife' : 'doublex2')
                }
            ];

            return bonuses.filter(b => b.available || b.used);
        }
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

                    if (this.socket && this.socket.connected) {
                        this.socket.emit('register-authenticated', {
                            twitchId: this.twitchId,
                            username: this.username
                        });
                        console.log('✅ Authentification enregistrée (connexion tardive)');
                    }
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
                // 🆕 Délai uniquement sur desktop (width > 614px)
                const isMobile = window.innerWidth <= 614;
                if (!isMobile) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                const response = await fetch('/leaderboard?limit=10');
                const data = await response.json();

                // Arrondir le win rate (pas de décimal)
                this.leaderboard = data.map(player => ({
                    ...player,
                    win_rate: Math.round(parseFloat(player.win_rate))
                }));

                // Marquer comme chargé
                this.leaderboardLoaded = true;

                console.log('✅ Leaderboard chargé:', this.leaderboard);
            } catch (error) {
                console.error('❌ Erreur leaderboard:', error);
            }
        },

        triggerPointsAnimation() {
            this.pointsAnimation = true;
            setTimeout(() => {
                this.pointsAnimation = false;
            }, 1500);
        },

        // ========== Restauration d'état ==========
        async restoreGameState() {
            try {
                const response = await fetch('/game/state');
                const state = await response.json();

                this.isGameActive = state.isActive;
                this.playerCount = state.playerCount;

                // 🆕 Restaurer le mode
                if (state.mode) {
                    this.gameMode = state.mode;
                }

                if (state.lives) this.gameLives = state.lives;
                if (state.questionTime) this.gameTime = state.questionTime;
                if (state.questionsCount) this.totalQuestions = state.questionsCount;

                this.gameStartedOnServer = state.inProgress;

                if (!state.isActive) {
                    localStorage.removeItem('hasJoinedLobby');
                    localStorage.removeItem('lobbyTwitchId');
                    console.log('🧹 localStorage nettoyé (jeu non actif)');
                    return;
                }

                if (this.isAuthenticated) {
                    const savedLobbyState = localStorage.getItem('hasJoinedLobby');
                    const savedTwitchId = localStorage.getItem('lobbyTwitchId');

                    if (savedLobbyState === 'true' && savedTwitchId === this.twitchId) {
                        this.hasJoined = true;
                        console.log('✅ État hasJoined restauré depuis localStorage');

                        if (this.isGameActive && !state.inProgress) {
                            this.shouldRejoinLobby = true;
                        }
                    }
                }

                if (state.inProgress && this.hasJoined) {
                    this.gameInProgress = true;
                } else {
                    this.gameInProgress = false;
                }

                // 🔥 CORRECTION: Restaurer les points/vies selon le mode
                if (state.inProgress && this.hasJoined) {
                    const currentPlayer = state.players?.find(p => p.twitchId === this.twitchId);

                    if (currentPlayer) {
                        if (state.mode === 'points') {
                            this.playerPoints = currentPlayer.points || 0;
                            console.log(`✅ Points restaurés: ${this.playerPoints}`);
                        } else {
                            this.playerLives = currentPlayer.lives !== undefined ? currentPlayer.lives : this.gameLives;
                            console.log(`✅ Vies restaurées: ${this.playerLives}`);
                        }

                        if (currentPlayer.comboData && this.comboLevel === 0 && this.comboProgress === 0) {
                            this.comboLevel = currentPlayer.comboData.comboLevel || 0;
                            this.comboProgress = currentPlayer.comboData.comboProgress || 0;
                            this.availableBonuses = [...(currentPlayer.comboData.availableBonuses || [])];
                            this.usedBonuses = [...(currentPlayer.comboData.usedBonuses || [])];
                            console.log(`✅ Combo restauré via /game/state: Lvl${this.comboLevel}, Progress:${this.comboProgress}`);
                        }
                    }
                }


                if (state.currentQuestion && state.inProgress && this.hasJoined) {
                    this.currentQuestion = state.currentQuestion;
                    this.currentQuestionNumber = state.currentQuestion.questionNumber;

                    if (state.timeRemaining > 0) {
                        this.timeRemaining = state.timeRemaining;
                        this.timerProgress = (state.timeRemaining / this.gameTime) * 100;
                        this.startTimer(state.timeRemaining);
                    } else {
                        this.timeRemaining = 0;
                        this.timerProgress = 0;
                    }

                    console.log(`✅ Question restaurée avec ${state.timeRemaining}s restantes`);

                    if (state.showResults && state.lastQuestionResults && state.inProgress && this.hasJoined) {
                        this.showResults = true;
                        this.questionResults = state.lastQuestionResults;
                        console.log('✅ Résultats de la question restaurés');
                    }
                }

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

                if (this.isAuthenticated) {
                    this.socket.emit('register-authenticated', {
                        twitchId: this.twitchId,
                        username: this.username
                    });
                    console.log('✅ Authentification enregistrée auprès du serveur');
                }

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
                console.log('🔄 Données de restauration reçues:', data);

                if (data.gameMode === 'lives') {
                    this.playerLives = data.lives;
                    console.log(`✅ Vies restaurées: ${this.playerLives}`);
                } else if (data.gameMode === 'points') {
                    this.playerPoints = data.points || 0;
                    console.log(`✅ Points restaurés: ${this.playerPoints}`);
                }

                // 🔥 AJOUTE CETTE PARTIE
                if (data.comboData) {
                    this.comboLevel = data.comboData.comboLevel || 0;
                    this.comboProgress = data.comboData.comboProgress || 0;
                    this.availableBonuses = [...(data.comboData.availableBonuses || [])];
                    this.usedBonuses = [...(data.comboData.usedBonuses || [])];
                    console.log(`✅ Combo restauré via player-restored (prioritaire): Lvl${this.comboLevel}, Progress:${this.comboProgress}`);
                }



                this.currentQuestionNumber = data.currentQuestionIndex;
                this.hasJoined = true;

                if (data.hasAnswered) {
                    this.hasAnswered = true;
                    this.selectedAnswer = data.selectedAnswer;
                    console.log(`⚠️ Réponse ${data.selectedAnswer} restaurée`);
                }

                console.log(`✅ Joueur restauré - Mode: ${data.gameMode}`);
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
                this.playerPoints = 0;

                // Arrêter le timer si actif
                this.stopTimer();

                this.resetComboSystem();

                // Nettoyer localStorage
                localStorage.removeItem('hasJoinedLobby');
                localStorage.removeItem('lobbyTwitchId');

                this.showNotification('Le jeu a été désactivé', 'info');
            });

            this.socket.on('game-started', (data) => {
                this.gameStartedOnServer = true;
                this.gameMode = data.gameMode || 'lives';

                if (data.isParticipating) {
                    document.body.classList.add('game-active');
                    this.gameInProgress = true;

                    // 🔥 AJOUTE CETTE LIGNE ICI
                    this.resetComboSystem();

                    // 🆕 Initialiser selon le mode
                    if (this.gameMode === 'lives') {
                        this.playerLives = this.gameLives;
                    } else {
                        this.playerPoints = 0;
                    }

                    this.showNotification(`La partie commence avec ${data.totalPlayers} joueurs !`, 'success');
                } else {
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
                this.resetBonusEffects(); // 🆕 Reset les effets de bonus de la question précédente
                this.startTimer();
            });

            this.socket.on('question-results', (results) => {
                this.stopTimer();
                this.questionResults = results;
                this.showResults = true;

                // Mode Points - Incrémenter le score si correct
                if (this.gameMode === 'points') {
                    if (this.selectedAnswer === results.correctAnswer) {
                        const myResult = results.players?.find(p => p.username === this.username);
                        const pointsEarned = myResult?.pointsEarned || 1000;

                        const finalPoints = this.activeBonusEffect === 'doublex2' ? pointsEarned * 2 : pointsEarned;

                        this.pointsGained = finalPoints;
                        this.playerPoints += finalPoints;
                        this.triggerPointsAnimation();

                        // 🔥 SUPPRIMÉ : this.updateCombo() - Le serveur s'en charge
                    }
                } else {
                    // Mode Vie
                    const myPlayerData = results.playersData?.find(p => p.twitchId === this.twitchId);

                    if (myPlayerData) {
                        this.playerLives = myPlayerData.lives;
                        console.log(`✅ Vies synchronisées: ${this.playerLives}`);

                        // 🔥 SUPPRIMÉ : if (this.selectedAnswer === results.correctAnswer) { this.updateCombo(); }
                    } else {
                        // Fallback
                        if (!results.allWillLose) {
                            if (this.selectedAnswer && this.selectedAnswer !== results.correctAnswer) {
                                this.playerLives = Math.max(0, this.playerLives - 1);
                            } else if (!this.selectedAnswer) {
                                this.playerLives = Math.max(0, this.playerLives - 1);
                            }
                        }
                    }
                }

                this.resetBonusEffects();
            });

            this.socket.on('answer-recorded', () => {
                this.hasAnswered = true;
            });

            this.socket.on('game-ended', (data) => {
                this.gameEnded = true;
                this.gameStartedOnServer = false; // 🆕 Reset flag
                this.gameEndData = data;
                this.stopTimer();

                this.resetComboSystem();

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

            // 🔄 Forcer le refresh par l'admin
            this.socket.on('force-refresh', () => {
                console.log('🔄 Refresh forcé par l\'admin');
                location.reload();
            });

            // 🆕 Écouter quand un joueur répond
            this.socket.on('player-answered', (data) => {
                if (data.username !== this.username) {
                    this.showAnswerNotification(data.username);
                }

            });


            // 🆕 Bonus débloqué
            this.socket.on('bonus-unlocked', (data) => {
                console.log(`🎁 Nouveau bonus débloqué: ${data.bonusType} (Lvl${data.level})`);
                this.animateLevelUp();
            });

            this.socket.on('combo-updated', (data) => {
                // 🔥 VERSION SIMPLE : Accepter TOUJOURS ce que le serveur envoie
                const oldProgress = this.comboProgress;
                const oldLevel = this.comboLevel;

                this.comboLevel = data.comboLevel;
                this.comboProgress = data.comboProgress;
                this.availableBonuses = data.availableBonuses;

                // Spawn particules seulement si vraie progression
                if (data.comboProgress > oldProgress) {
                    this.spawnParticles();
                }

                console.log(`📡 Combo reçu du serveur: Lvl${this.comboLevel}, Progress:${this.comboProgress}`);
            });

            // 🆕 Bonus utilisé (confirmation)
            this.socket.on('bonus-used', (data) => {
                if (data.success) {
                    // Retirer localement aussi
                    const index = this.availableBonuses.indexOf(data.bonusType);
                    if (index > -1) {
                        this.availableBonuses.splice(index, 1);
                    }
                    this.usedBonuses.push(data.bonusType);

                    // Appliquer l'effet
                    this.applyBonusEffect(data.bonusType);

                    // Fermer le modal
                    this.closeBonusModal();
                } else {
                    console.error('❌ Erreur utilisation bonus:', data.error);
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
                answer: answerIndex,
                usedBonus: this.activeBonusEffect, // 🆕 Envoyer le bonus utilisé
                bonusActive: this.activeBonusEffect === 'doublex2' // 🆕 Pour le x2 points
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

            // 🆕 Reset le système de combo
            this.resetComboSystem();

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
        },





        animateLevelUp() {
            const barFill = document.querySelector('.combo-bar-fill');
            if (barFill) {
                // 🔥 Stocker la hauteur actuelle avant l'animation
                const currentHeight = barFill.style.height || this.comboBarHeight + '%';
                barFill.style.setProperty('--current-height', currentHeight);

                barFill.classList.add('level-up');
                setTimeout(() => barFill.classList.remove('level-up'), 1500);
            }

            this.spawnParticles();
        },

        // Dans app.js, remplace la fonction spawnParticles() :

        // Dans app.js, remplace la fonction spawnParticles() :

        spawnParticles() {
            const container = document.querySelector('.combo-particles-external');
            if (!container) return;

            // Hauteur actuelle de la barre
            const currentHeight = this.comboBarHeight;

            // 🔥 NOUVEAU: Spawn des particules sur TOUTE la hauteur de la barre
            for (let i = 0; i < 25; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';

                // Position aléatoire horizontale
                const randomX = Math.random() * 100;
                particle.style.left = `${randomX}%`;

                // 🔥 Position verticale ALÉATOIRE entre 0 et la hauteur actuelle
                const randomHeight = Math.random() * currentHeight;
                particle.style.bottom = `${randomHeight}%`;

                // Dérive horizontale aléatoire
                const drift = (Math.random() - 0.5) * 40;
                particle.style.setProperty('--drift', `${drift}px`);

                // Délai aléatoire
                particle.style.animationDelay = `${Math.random() * 0.4}s`;

                container.appendChild(particle);

                // Supprimer après animation
                setTimeout(() => particle.remove(), 2000);
            }

            console.log('✨ Particules spawned sur toute la jauge (0 à ' + currentHeight + '%)');
        },

        // 🆕 GESTION DES BONUS
        toggleBonusModal() {
            if (!this.currentQuestion || this.hasAnswered) {
                console.log('⚠️ Impossible d\'ouvrir les bonus en dehors d\'une question');
                return;
            }
            this.showBonusModal = !this.showBonusModal;
        },

        closeBonusModal() {
            this.showBonusModal = false;
        },

        canUseBonus() {
            return this.currentQuestion && !this.hasAnswered && this.gameInProgress;
        },

        useBonus(bonusType) {
            if (!this.canUseBonus()) {
                console.log('⚠️ Impossible d\'utiliser un bonus maintenant');
                return;
            }

            if (!this.availableBonuses.includes(bonusType)) {
                console.log('⚠️ Bonus non disponible');
                return;
            }

            this.socket.emit('use-bonus', { bonusType: bonusType });


            // Retirer le bonus du stock
            const index = this.availableBonuses.indexOf(bonusType);
            this.availableBonuses.splice(index, 1);
            this.usedBonuses.push(bonusType);

            // Appliquer l'effet
            this.applyBonusEffect(bonusType);

            // Fermer le modal
            this.closeBonusModal();

            console.log(`✅ Bonus utilisé: ${bonusType}`);
        },

        applyBonusEffect(bonusType) {
            this.activeBonusEffect = bonusType;

            if (bonusType === '5050') {
                this.apply5050();
            } else if (bonusType === 'reveal') {
                this.applyReveal();
            } else if (bonusType === 'extralife') {
                this.applyExtraLife();
            } else if (bonusType === 'doublex2') {
                // Le x2 sera appliqué lors du calcul des points dans question-results
                console.log('💰 Points x2 activé pour cette question');
            }
        },

        apply5050() {
            if (!this.currentQuestion) return;

            const totalAnswers = this.currentQuestion.answers.length;
            const correctIndex = this.currentQuestion.correctAnswer || 1;

            // Nombre de mauvaises réponses à cacher (50%)
            const hideCount = totalAnswers === 4 ? 2 : 3;

            // Toutes les mauvaises réponses
            const wrongIndexes = [];
            for (let i = 1; i <= totalAnswers; i++) {
                if (i !== correctIndex) {
                    wrongIndexes.push(i);
                }
            }

            // Mélanger et prendre les X premières
            const shuffled = wrongIndexes.sort(() => 0.5 - Math.random());
            const toHide = shuffled.slice(0, hideCount);

            // Appliquer le style
            setTimeout(() => {
                toHide.forEach(index => {
                    const btn = document.querySelector(`.answer-btn:nth-child(${index})`);
                    if (btn) {
                        btn.classList.add('bonus-5050-hidden');
                    }
                });
            }, 100);

            console.log(`🎯 50/50 appliqué - ${hideCount} réponses cachées`);
        },

        applyReveal() {
            if (!this.currentQuestion) return;

            const correctIndex = this.currentQuestion.correctAnswer || 1;

            // Mettre en évidence la bonne réponse
            setTimeout(() => {
                const correctBtn = document.querySelector(`.answer-btn:nth-child(${correctIndex})`);
                if (correctBtn) {
                    correctBtn.classList.add('bonus-revealed');
                }
            }, 100);

            console.log(`💡 Bonne réponse révélée: ${correctIndex}`);
        },

        applyExtraLife() {
            this.playerLives = Math.min(this.gameLives, this.playerLives + 1);
            console.log(`❤️ +1 Vie ! Vies actuelles: ${this.playerLives}`);
        },

        resetBonusEffects() {
            // Retirer tous les effets visuels
            document.querySelectorAll('.answer-btn').forEach(btn => {
                btn.classList.remove('bonus-5050-hidden', 'bonus-revealed');
            });

            this.activeBonusEffect = null;
        },

        resetComboSystem() {
            this.comboLevel = 0;
            this.comboProgress = 0;
            this.availableBonuses = [];
            this.usedBonuses = [];
            this.activeBonusEffect = null;
            this.showBonusModal = false;

            console.log('🔄 Système de combo complètement reset');
        }
    },

    beforeUnmount() {
        if (this.socket) {
            this.socket.disconnect();
        }
        this.stopTimer();
    }
}).mount('#app');