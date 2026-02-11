// ============================================
// WEEBMASTER - Frontend App (Vue 3) - FIXED
// ============================================

const { createApp } = Vue;

createApp({
    data() {
        return {
            // Authentification
            isAuthenticated: false,
            showBonusArcMobile: false,
            username: '',
            twitchId: '',

            clickSound: null,
            sounds: {}, // 💣 Sons BombAnime
            soundMuted: localStorage.getItem('soundMuted') === 'true',
            soundVolume: parseInt(localStorage.getItem('soundVolume')) || 50,

            // 📱 Responsive
            isMobile: window.innerWidth <= 768,
            isMobileAlphabetOpen: false,


            tempCorrectAnswer: null,

            showBonusMenu: false,


            gameMode: 'lives',
            gameLives: 3,
            gameTime: 10,


            playerPoints: 0,
            pointsAnimation: false,
            pointsGained: 0,

            // État du jeu
            isGameActive: false,
            gameInProgress: sessionStorage.getItem('bombanimeInProgress') === 'true',
            gameStartedOnServer: false,
            gameEnded: false,

            // Lobby
            playerCount: 0,
            hasJoined: false,
            
            // Mode Rivalité
            lobbyMode: sessionStorage.getItem('triadeInProgress') === 'true' ? 'triade' : (sessionStorage.getItem('bombanimeInProgress') === 'true' ? 'bombanime' : 'classic'), // 'classic' ou 'rivalry' ou 'fizzbuzz' ou 'triade'
            selectedTeam: null, // 1 ou 2
            teamNames: { 1: 'Team A', 2: 'Team B' },
            teamCounts: { 1: 0, 2: 0 },
            teamScores: { 1: 0, 2: 0 }, // 🆕 Vies restantes ou points totaux par équipe
            teamCooldownActive: false,
            teamCooldownSeconds: 0,
            teamCooldownInterval: null,
            
            // 💣 BombAnime - Lobby plein
            isLobbyFull: false,
            maxPlayers: 13,
            lobbyFullError: false,
            triadeShakeError: false,
            joinCooldown: false,
            triadeJoinPending: false,

            // Mode FizzBuzz
            fizzbuzzMaxLives: 1, // Nombre max de vies en FizzBuzz (1 ou 2)


            // Profil & Badges
            showProfileModal: false,
            currentTab: 'profile',
            profileData: null,
            savedScrollY: 0,

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
            timerWarning: false,
            timerInterval: null,
            timerAnimationId: null,

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

            // Lobby Tips
            currentTip: '',
            tipKey: 0,
            tipIndex: 0,
            tipInterval: null,
            lobbyTips: [
                "Récoltez des bonus en répondant correctement et en complétant des défis !",
                "Chaque bonus n'est utilisable que 2 fois maximum par partie",
                "Actuellement, Dragon Ball est la série qui comptabilise le plus de questions",
                "Sauf indication contraire, chaque question porte sur la version manga de la série",
                "Des avatars et des titres sont disponibles dans votre profil",
                "Plus vous participez à des parties, plus vous débloquerez de badges",
                "Les titres et avatars d'un joueur sont visibles dans le classement et en live",
                "Des événements inter-communautaires comme des duels et tournois sont en préparation",
                "Un classement détaillé des joueurs est accessible depuis l'écran d'accueil",
                "Vous pouvez signaler des bugs ou suggérer des améliorations",
                "Vous pourrez bientôt proposer vos propres questions qui seront évaluées",
                "Trois défis sont disponibles chaque partie, complétez-les pour gagner des bonus",
                "Les défis se renouvellent à chaque nouvelle partie",
                "En mode points, la difficulté des questions détermine les points gagnés",
                "Aucune question ne porte sur des Manwas ou Mebtoons",
            ],


            comboLevel: 0,              // Niveau actuel (0, 1, 2, 3)
            comboProgress: 0,           // Nombre de bonnes réponses
            comboThresholds: [3, 8, 14], // Seuils : Lvl1=3, Lvl2=7 (3+4), Lvl3=12 (7+5)
            bonusInventory: { '5050': 0, 'reveal': 0, 'shield': 0, 'doublex2': 0 }, // 🔥 REFONTE: Inventaire avec compteurs
            showBonusModal: false,      // Afficher/masquer le modal
            activeBonusEffect: 'null',

            // 🆕 Système de défis
            challenges: [],             // Les 3 défis de la partie [{id, name, description, reward, progress, target, completed}]
            showChallengesMobile: false, // Afficher le modal défis sur mobile

            isLevelingUp: false,


            streamersLive: {
                MinoStreaming: false,
                pikinemadd: false,
                Mikyatc: false,
            },

            // ============================================
            // 💣 BOMBANIME - État côté joueur
            // ============================================
            bombanime: {
                active: false,
                serie: 'Naruto',
                timer: 8,
                timeRemaining: 8,
                timerInterval: null,
                playersOrder: [],
                playersData: [],
                currentPlayerTwitchId: null,
                isMyTurn: false,
                inputValue: '',
                lastValidName: null,
                lastError: null,
                usedNamesCount: 0,
                // Alphabet personnel
                myAlphabet: [],
                alphabetLetters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
                // Animations
                justAddedLetters: [],
                heartCompleting: false,
                heartPulse: false,
                mobileAlphabetPulse: false, // 📱 Animation bouton alphabet mobile
                showLifeGained: false,
                showLifeGainedAnimation: false, // 🎯 Animation bonus vie extra
                successPlayerTwitchId: null,
                lifeGainedPlayerTwitchId: null,
                // Debug
                debugInfo: null,
                debugMs: null, // 🆕 Timer en millisecondes pour debug
                debugMsInterval: null, // 🆕 Interval pour le timer ms
                // Animation intro
                introPhase: null,  // 'players' | 'panel' | 'bomb' | 'ready' | null
                introPlayersRevealed: 0,
                // Contrôle de la direction de la bombe
                bombPointingUp: true,
                // 🎯 Défis et bonus BombAnime
                challenges: [],              // [{id, name, description, reward, letter, progress, target, completed}]
                bonuses: { freeCharacter: 0, extraLife: 0 },
                showChallengesModal: false,  // Modal défis sur mobile
                showBonusesModal: false,     // Modal bonus sur mobile
                challengeJustCompleted: null // Pour animation de défi complété
            },

            // 🎴 État Triade
            triade: {
                active: sessionStorage.getItem('triadeInProgress') === 'true',
                reconnecting: sessionStorage.getItem('triadeInProgress') === 'true', // Waiting for server confirmation
                playersData: [],        // Tous les joueurs
                otherPlayers: [],       // Les autres joueurs (pas moi)
                myCards: [],            // Mes 3 cartes
                myData: {               // Mes données
                    wins: 0
                },
                isMyTurn: false,
                previewCard: null,       // Carte en preview au hover
                previewCardDisplay: null, // Garde le contenu pendant l'animation de sortie
                previewVisible: false,    // Contrôle la classe CSS visible
                // 🆕 Round announcement
                showCenterSlot: (() => { try { return !!JSON.parse(sessionStorage.getItem('triadeState') || '{}').selectedStat; } catch(e) { return false; } })(),
                currentRound: 0,
                selectedStat: (() => { try { return JSON.parse(sessionStorage.getItem('triadeState') || '{}').selectedStat || null; } catch(e) { return null; } })(),
                // 🆕 Drag & Drop
                draggingCardIndex: null,
                dropZoneActive: false,
                cardPlayed: (() => { try { return !!JSON.parse(sessionStorage.getItem('triadeState') || '{}').cardPlayed; } catch(e) { return false; } })(),
                playedCardData: (() => { try { return JSON.parse(sessionStorage.getItem('triadeState') || '{}').playedCardData || null; } catch(e) { return null; } })(),
                timer: 0,
                playersWhoPlayed: [],
                timerExpired: (() => { try { return !!JSON.parse(sessionStorage.getItem('triadeState') || '{}').timerExpired; } catch(e) { return false; } })()
            },


            // Liste des partenaires (ordre d'affichage)
            partnersList: [
                { id: 'MinoStreaming', name: 'mino', avatar: 'mino.png' },
                { id: 'pikinemadd', name: 'pikinemadd', avatar: 'pikine.png' },
                { id: 'Mikyatc', name: 'Mikyatc', avatar: 'mikyatc.png' }
            ],


            defaultAvatars: [
                { id: 1, name: 'avatar1', url: 'novice.png', locked: false },
                { id: 2, name: 'avatar2', url: 'ninja.png', locked: false },
                { id: 3, name: 'avatar3', url: 'knight.png', locked: false },
                { id: 4, name: 'avatar4', url: 'knight2.png', locked: false },
                { id: 5, name: 'avatar5', url: 'girl.png', locked: false },
                { id: 6, name: 'avatar6', url: 'assassin.png', locked: false },
                { id: 7, name: 'avatar7', url: 'sorcier.png', locked: false },
                { id: 8, name: 'avatar8', url: 'totoro.png', locked: false },
                { id: 9, name: 'avatar9', url: 'melody.png', locked: false }
            ],
            twitchAvatarUrl: null,
        };
    },

    async mounted() {

        setTimeout(() => {
            this.animateLogo();
        }, 700);

        await this.checkAuth();
        await this.restoreGameState();
        await this.loadLeaderboard();
        
        // 🎴 Restaurer l'état Triade instantanément depuis sessionStorage
        if (sessionStorage.getItem('triadeInProgress') === 'true') {
            this.restoreTriadeState();
        }

        this.initParticles();
        this.initSocket();
        
        // 🆕 Restaurer l'équipe sélectionnée après refresh
        const savedTeam = localStorage.getItem('selectedTeam');
        if (savedTeam) {
            this.selectedTeam = parseInt(savedTeam);
        }

        // 🆕 Démarrer les tips si connecté et pas en partie
        if (this.isAuthenticated && !this.gameInProgress) {
            this.startTipsRotation();
        }

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                console.log('📱 Onglet redevenu visible - vérification état...');

                // Reconnecter la socket si morte
                if (!this.socket.connected) {
                    this.socket.connect();
                }

                if (this.gameInProgress && this.hasJoined && this.isAuthenticated) {
                    this.socket.emit('reconnect-player', {
                        twitchId: this.twitchId,
                        username: this.username
                    });
                }
                
                // 🎴 Triade : si la partie est active mais pas de cartes, redemander
                if (this.lobbyMode === 'triade' && this.hasJoined && this.twitchId) {
                    if (this.triade.active && (!this.triade.myCards || this.triade.myCards.length === 0) && !this._pendingTriadeCards) {
                        console.log('🎴 Onglet visible + pas de cartes → redemande');
                        this.socket.emit('triade-request-my-cards', { twitchId: this.twitchId });
                    } else if (!this.triade.active) {
                        // Peut-être raté triade-game-started pendant le background
                        console.log('🎴 Onglet visible + triade pas active → vérification');
                        this.socket.emit('triade-reconnect', {
                            twitchId: this.twitchId,
                            username: this.username
                        });
                    }
                }

                // Re-sync l'état du jeu
                this.refreshGameState();
            }
        });

        this.loadTheme();
        this.initSounds();

        // 📱 Listener resize pour le responsive
        window.addEventListener('resize', this.handleResize);
        this.handleResize(); // Appel initial

    },
    
    beforeDestroy() {
        window.removeEventListener('resize', this.handleResize);
    },

    computed: {

        // 5 premiers streamers à afficher (live en priorité)
        visibleStreamers() {
            // Trier : live en premier
            const sorted = [...this.partnersList].sort((a, b) => {
                const aLive = this.streamersLive[a.id] ? 1 : 0;
                const bLive = this.streamersLive[b.id] ? 1 : 0;
                return bLive - aLive; // Live en premier
            });

            return sorted.slice(0, 5);
        },

        // Nombre de streamers cachés
        hiddenStreamersCount() {
            return Math.max(0, this.partnersList.length - 5);
        },


        formattedPlayerPoints() {
            return this.playerPoints.toLocaleString('fr-FR');
        },

        // Timer circulaire FizzBuzz (stroke-dashoffset)
        fizzbuzzTimerOffset() {
            // Circumference = 2 * PI * r = 2 * 3.14159 * 45 ≈ 283
            const circumference = 283;
            const progress = this.timerProgress / 100;
            return circumference * (1 - progress);
        },

        isWinner() {
            if (!this.gameEndData.winner) return false;

            if (this.gameEndData.winner.tie) {
                return this.gameEndData.winner.winners.some(w => w.username === this.username);
            }

            return this.gameEndData.winner.username === this.username;
        },

        livesModePodium() {
            if (!this.gameEndData || this.gameEndData.gameMode !== 'lives') return [];

            // Récupérer tous les joueurs depuis playersData (envoyé par le serveur)
            const allPlayers = this.gameEndData.playersData || [];

            // 🆕 Vérifier s'il y a au moins 1 survivant (sinon = aucun gagnant)
            const hasWinner = allPlayers.some(p => p.lives > 0);
            if (!hasWinner) return [];

            // Trier par : 
            // 1. Vies restantes (DESC)
            // 2. Si égalité de vies : bonnes réponses (DESC)
            const sorted = [...allPlayers].sort((a, b) => {
                if (b.lives !== a.lives) {
                    return b.lives - a.lives; // Plus de vies = meilleur
                }
                return (b.correctAnswers || 0) - (a.correctAnswers || 0); // Plus de bonnes réponses = meilleur
            });

            // Retourner Top 3 (ou moins si moins de joueurs)
            return sorted.slice(0, 3);
        },

        // 🆕 Podium unifié pour le nouveau design
        podiumPlayers() {
            if (!this.gameEndData) return [];
            
            // 🆕 Mode Rivalité
            if (this.gameEndData.gameMode === 'rivalry-lives' || this.gameEndData.gameMode === 'rivalry-points') {
                // En mode rivalité, on affiche les équipes au lieu des joueurs
                const teamScores = this.gameEndData.teamScores || { 1: 0, 2: 0 };
                const teamNames = this.gameEndData.teamNames || { 1: 'Team A', 2: 'Team B' };
                
                const teams = [
                    { team: 1, teamName: teamNames[1], score: teamScores[1] },
                    { team: 2, teamName: teamNames[2], score: teamScores[2] }
                ].sort((a, b) => b.score - a.score);
                
                return teams.map((t, index) => ({
                    username: t.teamName,
                    isTeam: true,
                    team: t.team,
                    points: this.gameEndData.gameMode === 'rivalry-points' ? t.score : undefined,
                    lives: this.gameEndData.gameMode === 'rivalry-lives' ? t.score : undefined,
                    rank: index + 1
                }));
            }
            
            if (this.gameEndData.gameMode === 'points' && this.gameEndData.podium) {
                // Mode points : utiliser le podium du serveur
                return this.gameEndData.podium.map(p => ({
                    username: p.username,
                    points: p.points,
                    lives: undefined,
                    rank: p.rank
                }));
            } else if (this.gameEndData.gameMode === 'lives') {
                // Mode vies : utiliser livesModePodium
                return this.livesModePodium.map((p, index) => ({
                    username: p.username,
                    lives: p.lives,
                    correctAnswers: p.correctAnswers,
                    points: undefined,
                    rank: index + 1
                }));
            }
            return [];
        },
        
        // 🆕 Vérifier si c'est un mode rivalité
        isRivalryMode() {
            if (!this.gameEndData) return false;
            return this.gameEndData.gameMode === 'rivalry-lives' || this.gameEndData.gameMode === 'rivalry-points';
        },

        // 🆕 Mon classement (pour afficher si hors top 3)
        myRank() {
            if (!this.gameEndData || !this.gameEndData.playersData) return null;
            
            const allPlayers = this.gameEndData.playersData || [];
            
            // Trier les joueurs
            let sorted;
            if (this.gameEndData.gameMode === 'points') {
                sorted = [...allPlayers].sort((a, b) => b.points - a.points);
            } else {
                sorted = [...allPlayers].sort((a, b) => {
                    if (b.lives !== a.lives) return b.lives - a.lives;
                    return b.correctAnswers - a.correctAnswers;
                });
            }
            
            // Trouver ma position
            const myIndex = sorted.findIndex(p => p.twitchId === this.twitchId || p.username === this.username);
            
            if (myIndex === -1) return null;
            
            return {
                rank: myIndex + 1,
                ...sorted[myIndex]
            };
        },

        comboBarHeight() {
            if (this.comboLevel >= 3) return 0; // 🔥 CHANGÉ: Jauge vide au MAX

            if (this.isLevelingUp) {
                console.log('🔒 Recalcul bloqué - Animation en cours');
                return 100;
            }

            const currentThreshold = this.comboThresholds[this.comboLevel];
            const prevThreshold = this.comboLevel > 0 ? this.comboThresholds[this.comboLevel - 1] : 0;

            const progressInCurrentLevel = this.comboProgress - prevThreshold;
            const rangeForCurrentLevel = currentThreshold - prevThreshold;

            const result = Math.min(100, (progressInCurrentLevel / rangeForCurrentLevel) * 100);
            console.log(`📊 ComboBarHeight calculé: ${result}%`);
            return result;
        },

        comboLevelDisplay() {
            return this.comboLevel >= 3 ? 'MAX' : this.comboLevel.toString();
        },

        // 🔥 REFONTE: Vérifie si au moins un bonus disponible
        hasUnusedBonuses() {
            return Object.values(this.bonusInventory).some(count => count > 0);
        },

        // 🔥 REFONTE: Total de tous les bonus disponibles
        unusedBonusCount() {
            return Object.values(this.bonusInventory).reduce((sum, count) => sum + count, 0);
        },

        // 🔥 REFONTE: Liste avec compteurs individuels
        bonusList() {
            const thirdBonusId = this.gameMode === 'lives' ? 'shield' : 'doublex2';
            return [
                {
                    id: '5050',
                    name: '50/50',
                    desc: 'Élimine 50% des mauvaises réponses',
                    count: this.bonusInventory['5050'] || 0
                },
                {
                    id: 'reveal',
                    name: 'Joker',
                    desc: 'Affiche la bonne réponse',
                    count: this.bonusInventory['reveal'] || 0
                },
                {
                    id: thirdBonusId,
                    name: this.gameMode === 'lives' ? 'Bouclier' : 'Points x2',
                    desc: this.gameMode === 'lives' ? 'Protège contre une perte de vie' : 'Double les points de cette question',
                    count: this.bonusInventory[thirdBonusId] || 0
                }
            ];
        },

        gaugeCircleOffset() {
            const circumference = 188; // 2π × 30
            const progress = this.comboBarHeight;
            return circumference - (progress / 100) * circumference;
        }
    },

    watch: {
        // 🆕 Gérer les tips automatiquement quand l'état du jeu change
        gameInProgress(newVal, oldVal) {
            if (this.isAuthenticated) {
                if (newVal) {
                    // Partie commence → arrêter les tips
                    this.stopTipsRotation();
                } else if (oldVal && !newVal) {
                    // Partie termine → redémarrer les tips
                    this.startTipsRotation();
                }
            }
        }
    },

    methods: {

        // ============================================
        // LOBBY TIPS
        // ============================================
        startTipsRotation() {
            // Mélanger les tips aléatoirement
            this.shuffleTips();
            
            // Afficher le premier tip
            this.showNextTip();
            
            // Rotation toutes les 7 secondes
            this.tipInterval = setInterval(() => {
                this.showNextTip();
            }, 7000);
        },

        stopTipsRotation() {
            if (this.tipInterval) {
                clearInterval(this.tipInterval);
                this.tipInterval = null;
            }
            this.currentTip = '';
        },

        showNextTip() {
            this.currentTip = this.lobbyTips[this.tipIndex];
            this.tipKey++; // Force Vue à recréer l'élément pour relancer l'animation
            this.tipIndex = (this.tipIndex + 1) % this.lobbyTips.length;
        },

        shuffleTips() {
            // Mélange Fisher-Yates
            for (let i = this.lobbyTips.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.lobbyTips[i], this.lobbyTips[j]] = [this.lobbyTips[j], this.lobbyTips[i]];
            }
        },

        // Notification de kick désactivée
        showKickNotification() {
            // Ne rien afficher
            return;
        },


        animateLogo() {
            const logoTitle = document.querySelector('.welcome-screen .logo-title');
            if (!logoTitle) return;

            const shonenSpan = logoTitle.querySelector('.neon-text');
            const masterSpan = logoTitle.querySelector('.neon-text-alt');

            if (!shonenSpan || !masterSpan) return;

            // Séparer les lettres
            const shonenText = shonenSpan.textContent;
            const masterText = masterSpan.textContent;

            shonenSpan.innerHTML = shonenText.split('').map(l =>
                `<span class="letter">${l}</span>`
            ).join('');

            masterSpan.innerHTML = masterText.split('').map(l =>
                `<span class="letter">${l}</span>`
            ).join('');

            // Révéler les spans (les lettres sont encore opacity: 0)
            shonenSpan.style.visibility = 'visible';
            masterSpan.style.visibility = 'visible';

            // Animation avec anime.js
            const letters = logoTitle.querySelectorAll('.letter');
            const total = letters.length;
            const middle = total / 2;

            anime({
                targets: letters,
                opacity: [0, 1],
                scale: [0, 1],
                rotate: [180, 0],
                duration: 1000,
                delay: (el, i) => Math.abs(i - middle) * 80,
                easing: 'easeOutElastic(1, .5)'
            });
        },

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

                // 🆕 Empêcher le décalage du contenu
                this.savedScrollY = window.scrollY;
                document.body.style.top = `-${this.savedScrollY}px`;
                document.body.classList.add('modal-open');

                // 🔥 NOUVEAU: Extraire l'avatar Twitch si c'est une URL Twitch
                if (data.user.avatar_url && data.user.avatar_url.includes('jtvnw.net')) {
                    this.twitchAvatarUrl = data.user.avatar_url;
                } else {
                    // Sinon, essayer de le récupérer depuis le serveur
                    // (On pourrait aussi le stocker séparément en BDD)
                    this.twitchAvatarUrl = data.user.twitch_avatar_url || null;
                }

                console.log('✅ Profil chargé:', data);

                // Attendre le rendu puis animer
                this.$nextTick(() => {
                    this.animateProfileOpen();
                });

            } catch (error) {
                console.error('❌ Erreur chargement profil:', error);
            }
        },

        closeProfile() {
            // Animation de fermeture
            const modal = this.$refs.profileModal;
            if (modal) {
                anime({
                    targets: modal,
                    scale: [1, 0.8],
                    opacity: [1, 0],
                    translateY: [0, 50],
                    duration: 300,
                    easing: 'easeInQuad',
                    complete: () => {
                        // 🔥 FIX: Reset les styles inline pour permettre réouverture
                        modal.style.transform = '';
                        modal.style.opacity = '';
                        modal.style.scale = '';

                        this.showProfileModal = false;
                        this.profileData = null;
                        
                        // 🆕 Réactiver le scroll et restaurer la position
                        document.body.classList.remove('modal-open');
                        document.body.style.top = '';
                        window.scrollTo(0, this.savedScrollY || 0);
                    }
                });
            } else {
                this.showProfileModal = false;
                this.profileData = null;
                
                // 🆕 Réactiver le scroll et restaurer la position
                document.body.classList.remove('modal-open');
                document.body.style.top = '';
                window.scrollTo(0, this.savedScrollY || 0);
            }
        },


        animateProfileOpen() {
            const modal = this.$refs.profileModal;
            const scanLine = this.$refs.profileScanLine;
            const tabIndicator = this.$refs.profileTabIndicator;
            const activeTab = this.$refs.tabProfile;

            if (!modal) return;

            // Animer la scan line
            if (scanLine) {
                anime({
                    targets: scanLine,
                    opacity: [0, 1, 0],
                    translateY: [0, 400],
                    duration: 800,
                    easing: 'easeInOutQuad',
                    delay: 200
                });
            }

            // Positionner l'indicateur de tab
            if (tabIndicator && activeTab) {
                setTimeout(() => {
                    tabIndicator.style.left = activeTab.offsetLeft + 'px';
                    tabIndicator.style.width = activeTab.offsetWidth + 'px';
                }, 400);
            }

            // Animer le contenu du premier tab
            setTimeout(() => {
                this.animateProfileTabContent('profile');
            }, 500);
        },

        // ========== AJOUTER switchProfileTab ==========
        switchProfileTab(tabName) {
            if (this.currentTab === tabName) return;

            this.currentTab = tabName;

            // Animer l'indicateur
            const tabIndicator = this.$refs.profileTabIndicator;
            let targetTab;

            if (tabName === 'profile') targetTab = this.$refs.tabProfile;
            else if (tabName === 'badges') targetTab = this.$refs.tabBadges;
            else if (tabName === 'titres') targetTab = this.$refs.tabTitres;
            else if (tabName === 'avatar') targetTab = this.$refs.tabAvatar; // 🔥 NOUVEAU

            if (tabIndicator && targetTab) {
                anime({
                    targets: tabIndicator,
                    left: targetTab.offsetLeft,
                    width: targetTab.offsetWidth,
                    duration: 400,
                    easing: 'easeOutElastic(1, 0.5)'
                });
            }

            // Animer le nouveau contenu
            this.$nextTick(() => {
                this.animateProfileTabContent(tabName);
            });
        },

        // ========== AJOUTER animateProfileTabContent ==========
        animateProfileTabContent(tabName) {
            if (tabName === 'profile') {
                const showcase = this.$refs.titleShowcase;
                const cards = [this.$refs.statCard1, this.$refs.statCard2, this.$refs.statCard3].filter(Boolean);

                // Reset
                if (showcase) {
                    anime.set(showcase, { opacity: 0, translateY: 20 });
                }
                cards.forEach(card => {
                    anime.set(card, { opacity: 0, translateY: 30, scale: 0.9 });
                });

                // Animer le panel
                const panel = this.$refs.panelProfile;
                if (panel) {
                    anime({
                        targets: panel,
                        opacity: [0, 1],
                        duration: 300,
                        easing: 'easeOutExpo'
                    });
                }

                // Animer le showcase
                if (showcase) {
                    anime({
                        targets: showcase,
                        opacity: [0, 1],
                        translateY: [20, 0],
                        duration: 500,
                        easing: 'easeOutExpo',
                        delay: 100
                    });
                }

                // Animer les cards avec stagger
                anime({
                    targets: cards,
                    opacity: [0, 1],
                    translateY: [30, 0],
                    scale: [0.9, 1],
                    duration: 500,
                    easing: 'easeOutExpo',
                    delay: anime.stagger(100, { start: 200 })
                });

                // Animer les compteurs
                setTimeout(() => {
                    this.animateProfileCounters();
                }, 400);

            } else if (tabName === 'badges') {
                const categories = [this.$refs.badgesCat1, this.$refs.badgesCat2].filter(Boolean);
                const panel = this.$refs.panelBadges;

                // Reset
                categories.forEach(cat => {
                    anime.set(cat, { opacity: 0, translateX: -20 });
                });

                // Animer le panel
                if (panel) {
                    anime({
                        targets: panel,
                        opacity: [0, 1],
                        duration: 300,
                        easing: 'easeOutExpo'
                    });
                }

                // Animer les catégories
                anime({
                    targets: categories,
                    opacity: [0, 1],
                    translateX: [-20, 0],
                    duration: 400,
                    easing: 'easeOutExpo',
                    delay: anime.stagger(150, { start: 100 })
                });

                // Animer les badges
                setTimeout(() => {
                    const badges = panel?.querySelectorAll('.profile-badge-item');
                    if (badges) {
                        anime({
                            targets: badges,
                            opacity: (el) => el.classList.contains('locked') ? 0.35 : 1,
                            scale: [0, 1],
                            rotate: [-180, 0],
                            duration: 600,
                            easing: 'easeOutExpo',
                            delay: anime.stagger(50, { grid: [5, 2], from: 'center' })
                        });
                    }
                }, 200);

            } else if (tabName === 'titres') {
                const panel = this.$refs.panelTitres;
                const rows = panel?.querySelectorAll('.profile-title-row');

                // Animer le panel
                if (panel) {
                    anime({
                        targets: panel,
                        opacity: [0, 1],
                        duration: 300,
                        easing: 'easeOutExpo'
                    });
                }

                // Animer les lignes
                if (rows) {
                    anime.set(rows, { opacity: 0, translateX: 50 });

                    anime({
                        targets: rows,
                        opacity: (el) => el.classList.contains('locked') ? 0.4 : 1,
                        translateX: [50, 0],
                        duration: 500,
                        easing: 'easeOutExpo',
                        delay: anime.stagger(80, { start: 100 })
                    });
                }
            } else if (tabName === 'avatar') {
                const panel = this.$refs.panelAvatar;
                const currentAvatar = panel?.querySelector('.profile-current-avatar');
                const sections = [this.$refs.avatarSectionTwitch, this.$refs.avatarSectionDefault].filter(Boolean);
                const avatarOptions = panel?.querySelectorAll('.profile-avatar-option');

                // Animer le panel
                if (panel) {
                    anime({
                        targets: panel,
                        opacity: [0, 1],
                        duration: 300,
                        easing: 'easeOutExpo'
                    });
                }

                // Animer l'avatar actuel
                if (currentAvatar) {
                    anime.set(currentAvatar, { opacity: 0, scale: 0.8 });
                    anime({
                        targets: currentAvatar,
                        opacity: [0, 1],
                        scale: [0.8, 1],
                        duration: 500,
                        easing: 'easeOutElastic(1, 0.5)',
                        delay: 100
                    });
                }

                // Animer les sections
                anime({
                    targets: sections,
                    opacity: [0, 1],
                    translateY: [20, 0],
                    duration: 400,
                    easing: 'easeOutExpo',
                    delay: anime.stagger(100, { start: 200 })
                });

                // Animer les options d'avatar
                if (avatarOptions) {
                    anime.set(avatarOptions, { opacity: 0, scale: 0, rotate: -10 });
                    anime({
                        targets: avatarOptions,
                        opacity: [0, 1],
                        scale: [0, 1],
                        rotate: [-10, 0],
                        duration: 400,
                        easing: 'easeOutBack',
                        delay: anime.stagger(50, { start: 400, grid: [4, 3], from: 'first' })
                    });
                }
            }
        },


        async selectAvatar(avatarUrl) {
            if (!this.isAuthenticated || !this.profileData) return;

            // Si c'est 'twitch', utiliser l'URL Twitch stockée
            if (avatarUrl === 'twitch') {
                if (!this.twitchAvatarUrl) {
                    console.log('❌ Pas d\'avatar Twitch disponible');
                    return;
                }
                avatarUrl = this.twitchAvatarUrl;
            }

            // Vérifier si c'est déjà l'avatar actuel
            if (this.profileData.user.avatar_url === avatarUrl) {
                return;
            }

            try {
                const response = await fetch('/profile/update-avatar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        twitchId: this.twitchId,
                        avatarUrl: avatarUrl
                    })
                });

                const data = await response.json();

                if (data.success) {
                    // Mettre à jour localement
                    this.profileData.user.avatar_url = avatarUrl;

                    // Afficher le toast
                    // this.showProfileToast('Avatar mis à jour !');

                    // Animer le changement
                    this.animateAvatarChange();

                    console.log('✅ Avatar changé:', avatarUrl);
                }
            } catch (error) {
                console.error('❌ Erreur changement avatar:', error);
            }
        },


        animateAvatarChange() {
            const preview = this.$refs.panelAvatar?.querySelector('.profile-avatar-preview');

            if (preview) {
                anime({
                    targets: preview,
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0],
                    duration: 600,
                    easing: 'easeOutElastic(1, 0.5)'
                });
            }

            // Animer aussi l'avatar dans le header
            const headerAvatar = this.$refs.profileModal?.querySelector('.profile-avatar-wrapper');
            if (headerAvatar) {
                anime({
                    targets: headerAvatar,
                    scale: [1, 1.15, 1],
                    duration: 500,
                    easing: 'easeOutElastic(1, 0.5)'
                });
            }
        },


        // ========== AJOUTER animateProfileCounters ==========
        animateProfileCounters() {
            if (!this.profileData) return;

            const games = this.profileData.user?.total_games_played || 0;
            const wins = this.profileData.user?.total_victories || 0;
            const winrate = parseFloat(this.profileData.user?.win_rate) || 0;

            const counterGames = this.$refs.counterGames;
            const counterWins = this.$refs.counterWins;
            const counterWinrate = this.$refs.counterWinrate;

            if (counterGames) {
                anime({
                    targets: { val: 0 },
                    val: games,
                    duration: 1000,
                    round: 1,
                    easing: 'easeOutExpo',
                    update: (a) => {
                        counterGames.textContent = Math.round(a.animations[0].currentValue);
                    }
                });
            }

            if (counterWins) {
                anime({
                    targets: { val: 0 },
                    val: wins,
                    duration: 1000,
                    round: 1,
                    easing: 'easeOutExpo',
                    delay: 100,
                    update: (a) => {
                        counterWins.textContent = Math.round(a.animations[0].currentValue);
                    }
                });
            }

            if (counterWinrate) {
                anime({
                    targets: { val: 0 },
                    val: winrate,
                    duration: 1000,
                    round: 1,
                    easing: 'easeOutExpo',
                    delay: 200,
                    update: (a) => {
                        counterWinrate.textContent = Math.round(a.animations[0].currentValue);
                    }
                });
            }
        },

        // ========== AJOUTER rippleEffect ==========
        rippleEffect(event) {
            const card = event.currentTarget;
            const ripple = document.createElement('div');
            ripple.className = 'ripple';

            const rect = card.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = event.clientX - rect.left - size / 2 + 'px';
            ripple.style.top = event.clientY - rect.top - size / 2 + 'px';

            card.appendChild(ripple);

            anime({
                targets: ripple,
                scale: [0, 2],
                opacity: [1, 0],
                duration: 600,
                easing: 'easeOutExpo',
                complete: () => ripple.remove()
            });
        },

        async equipTitleAnimated(titleId, titleName) {
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
                    // Afficher le toast
                    this.showProfileToast(`Titre "${titleName}" équipé !`);

                    // Recharger le profil
                    const profileResponse = await fetch(`/profile/${this.twitchId}`);
                    this.profileData = await profileResponse.json();

                    // Re-animer le tab titres
                    this.$nextTick(() => {
                        this.animateProfileTabContent('titres');
                    });
                }
            } catch (error) {
                console.error('❌ Erreur équipement titre:', error);
            }
        },

        // ========== AJOUTER showProfileToast ==========
        showProfileToast(message) {
            const toast = this.$refs.profileToast;
            if (!toast) return;

            toast.textContent = message;
            toast.classList.add('show');

            setTimeout(() => {
                toast.classList.remove('show');
            }, 2500);
        },


        toggleLeaderboard() {
            this.showLeaderboard = !this.showLeaderboard;
        },

        // 🆕 Effet de protection Shield
        // 🆕 Effet de protection Shield - Vague UNIQUEMENT
        showShieldProtectionEffect() {
            // Créer uniquement la vague (pas d'overlay)
            const wave = document.createElement('div');
            wave.className = 'shield-protection-wave';
            document.body.appendChild(wave);

            setTimeout(() => {
                wave.classList.add('expand');
            }, 10);

            setTimeout(() => {
                document.body.removeChild(wave);
            }, 1000);

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
                
                // 🆕 Restaurer le mode Rivalité
                if (state.lobbyMode) {
                    this.lobbyMode = state.lobbyMode;
                }
                if (state.teamNames) {
                    this.teamNames = state.teamNames;
                }
                if (state.teamCounts) {
                    this.teamCounts = state.teamCounts;
                }
                if (state.teamScores) {
                    this.teamScores = state.teamScores;
                }

                if (state.lives) this.gameLives = state.lives;
                if (state.questionTime) this.gameTime = state.questionTime;
                if (state.questionsCount) this.totalQuestions = state.questionsCount;

                this.gameStartedOnServer = state.inProgress;

                if (!state.isActive) {
                    localStorage.removeItem('hasJoinedLobby');
                    localStorage.removeItem('lobbyTwitchId');
                    localStorage.removeItem('selectedTeam');
                    localStorage.removeItem('teamCooldownEnd');
                    console.log('🧹 localStorage nettoyé (jeu non actif)');
                    return;
                }
                
                // 🆕 Restaurer l'équipe sélectionnée en mode Rivalité
                if (this.lobbyMode === 'rivalry') {
                    const savedTeam = localStorage.getItem('selectedTeam');
                    if (savedTeam) {
                        this.selectedTeam = parseInt(savedTeam);
                        console.log(`✅ Équipe restaurée: Team ${this.selectedTeam}`);
                    }
                }

                if (this.isAuthenticated) {
                    const savedLobbyState = localStorage.getItem('hasJoinedLobby');
                    const savedTwitchId = localStorage.getItem('lobbyTwitchId');

                    if (savedLobbyState === 'true' && savedTwitchId === this.twitchId) {
                        // Vérifier que le joueur est réellement dans la liste du serveur
                        const isInPlayerList = state.players && state.players.some(p => p.twitchId === this.twitchId);
                        
                        if (isInPlayerList || state.inProgress) {
                            this.hasJoined = true;
                            console.log('✅ État hasJoined restauré (joueur confirmé côté serveur)');
                        } else {
                            // State périmé d'un ancien lobby - nettoyer
                            console.log('🧹 hasJoined périmé - joueur absent du lobby serveur');
                            localStorage.removeItem('hasJoinedLobby');
                            localStorage.removeItem('lobbyTwitchId');
                            localStorage.removeItem('selectedTeam');
                            this.hasJoined = false;
                        }

                        if (this.isGameActive && !state.inProgress && this.hasJoined) {
                            this.shouldRejoinLobby = true;
                        }
                    }
                }
                
                // 🎴 Nettoyer Triade si le serveur n'est pas en mode Triade
                if (state.lobbyMode !== 'triade') {
                    sessionStorage.removeItem('triadeInProgress');
                    sessionStorage.removeItem('triadeState');
                    this.triade.active = false;
                    this.triade.reconnecting = false;
                    if (this.lobbyMode === 'triade') {
                        this.lobbyMode = state.lobbyMode || 'classic';
                    }
                }
                
                // 🎴 FIX: Valider hasJoined pour Triade lobby (sessionStorage peut survivre après game-deactivated)
                if (this.isAuthenticated && state.lobbyMode === 'triade' && !state.inProgress) {
                    const isInPlayerList = state.players && state.players.some(p => p.twitchId === this.twitchId);
                    if (isInPlayerList) {
                        // Le joueur est bien dans le lobby serveur → auto-rejoin après reconnexion socket
                        this.hasJoined = true;
                        this.shouldRejoinLobby = true;
                        console.log('✅ Triade: joueur confirmé dans le lobby serveur → auto-rejoin');
                    } else if (this.hasJoined) {
                        // hasJoined périmé (sessionStorage stale) → nettoyer
                        console.log('🧹 Triade: hasJoined périmé - joueur absent du lobby serveur');
                        this.hasJoined = false;
                        sessionStorage.removeItem('triadeInProgress');
                        sessionStorage.removeItem('triadeState');
                        localStorage.removeItem('hasJoinedLobby');
                        localStorage.removeItem('lobbyTwitchId');
                    }
                }
                
                // 🔥 FIX GLOBAL: Catch-all - si hasJoined mais absent du serveur et pas en game
                if (this.isAuthenticated && this.hasJoined && !state.inProgress && state.isActive) {
                    const isInPlayerList = state.players && state.players.some(p => p.twitchId === this.twitchId);
                    if (!isInPlayerList && !this.shouldRejoinLobby) {
                        console.log('🧹 Catch-all: hasJoined=true mais absent du serveur → reset');
                        this.hasJoined = false;
                        localStorage.removeItem('hasJoinedLobby');
                        localStorage.removeItem('lobbyTwitchId');
                        sessionStorage.removeItem('triadeInProgress');
                        sessionStorage.removeItem('triadeState');
                    }
                }

                if (state.inProgress && this.hasJoined) {
                    // 🎴 En mode Triade, vérifier que le joueur est vraiment dans la partie
                    // (hasJoined = lobby rejoint, mais il faut être dans playersData pour la game)
                    if (state.lobbyMode === 'triade' && !this.triade.active) {
                        // Triade en cours mais pas initialisé → attendre triade-reconnect
                        // Ne pas mettre gameInProgress=true tant qu'on n'a pas confirmé être dans la partie
                        this.gameInProgress = false;
                    } else {
                        this.gameInProgress = true;
                    }
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

                        if (currentPlayer.hasAnswered) {
                            this.hasAnswered = true;
                            this.selectedAnswer = currentPlayer.selectedAnswer;
                            console.log(`✅ Réponse restaurée immédiatement: ${this.selectedAnswer}`);
                        }

                        if (currentPlayer.comboData && this.comboLevel === 0 && this.comboProgress === 0) {
                            this.comboLevel = currentPlayer.comboData.comboLevel || 0;
                            this.comboProgress = currentPlayer.comboData.comboProgress || 0;
                            this.bonusInventory = currentPlayer.comboData.bonusInventory || { '5050': 0, 'reveal': 0, 'shield': 0, 'doublex2': 0 };
                            console.log(`✅ Combo restauré via /game/state: Lvl${this.comboLevel}, Progress:${this.comboProgress}, Inventory:${JSON.stringify(this.bonusInventory)}`);
                        }
                    }
                }


                if (state.currentQuestion && state.inProgress && this.hasJoined) {
                    this.currentQuestion = state.currentQuestion;
                    this.currentQuestionNumber = state.currentQuestion.questionNumber;

                    if (state.timeRemaining > 0) {
                        this.timeRemaining = state.timeRemaining;
                        this.timerProgress = (state.timeRemaining / this.gameTime) * 100;
                        this.timerWarning = state.timeRemaining <= 3;
                        this.startTimer(state.timeRemaining);
                    } else {
                        this.timeRemaining = 0;
                        this.timerProgress = 0;
                        this.timerWarning = true;
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


        restoreBonusEffects(data) {
            if (!data.hasAnswered || !data.bonusActive) {
                console.log('Aucun bonus actif à restaurer');
                return;
            }

            const bonusType = data.bonusActive;
            console.log(`🎨 Restauration effet visuel du bonus: ${bonusType}`);

            this.activeBonusEffect = bonusType;

            setTimeout(() => {
                if (bonusType === '5050') {
                    console.log('🎨 Restauration visuelle 50/50');
                    this.apply5050();
                } else if (bonusType === 'reveal') {
                    console.log('🎨 Restauration visuelle Joker');
                    this.applyReveal();
                } else if (bonusType === 'shield') {
                    console.log('🎨 Restauration visuelle Shield');
                    const hud = document.querySelector('.player-hud');
                    if (hud) {
                        hud.classList.add('shield-protected');
                    }
                } else if (bonusType === 'doublex2') {
                    console.log('🎨 Restauration visuelle x2');
                    // 🔥 AJOUTER ICI : Pulse doré du HUD
                    const hud = document.querySelector('.player-hud');
                    if (hud) {
                        hud.classList.add('x2-protected');
                    }
                }
            }, 100);
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

                // 🆕 Re-joindre le lobby si l'état a été restauré (sauf si kick)
                const wasKicked = sessionStorage.getItem('wasKicked');
                if (this.shouldRejoinLobby && this.isGameActive && !this.gameInProgress && !wasKicked) {
                    // En mode rivalité, vérifier qu'on a une équipe
                    if (this.lobbyMode === 'rivalry' && !this.selectedTeam) {
                        console.log('⚠️ Mode Rivalité mais pas d\'équipe sauvegardée - pas de rejoin auto');
                        this.shouldRejoinLobby = false;
                        this.hasJoined = false;
                        localStorage.removeItem('hasJoinedLobby');
                    } else {
                        this.socket.emit('join-lobby', {
                            twitchId: this.twitchId,
                            username: this.username,
                            team: this.lobbyMode === 'rivalry' ? this.selectedTeam : null
                        });
                        this.shouldRejoinLobby = false;
                        console.log(`✅ Re-jointure automatique du lobby après refresh${this.selectedTeam ? ` (Team ${this.selectedTeam})` : ''}`);
                    }
                } else if (wasKicked) {
                    console.log('🚫 Rejoin auto bloqué - joueur kick');
                    this.shouldRejoinLobby = false;
                }
                
                // 💣 Demander l'état BombAnime si en mode BombAnime
                if (this.lobbyMode === 'bombanime') {
                    this.socket.emit('bombanime-get-state');
                    console.log('💣 Demande état BombAnime après connexion');
                }
                
                // 🎴 Demander la reconnexion Triade si une partie était en cours
                const triadeWasInProgress = sessionStorage.getItem('triadeInProgress');
                if (triadeWasInProgress === 'true' && !this.shouldRejoinLobby) {
                    console.log('🎴 Tentative de reconnexion Triade...');
                    this.gameInProgress = true; // Optimiste — évite le flash "Partie en cours"
                    this.socket.emit('triade-reconnect', {
                        twitchId: this.twitchId,
                        username: this.username
                    });
                    
                    // Timeout de sécurité: si pas de réponse en 1.5s, la partie est probablement terminée
                    this._triadeReconnectTimeout = setTimeout(() => {
                        if (!this.triade.myCards || this.triade.myCards.length === 0) {
                            console.log('🎴 Reconnexion Triade expirée - partie probablement terminée');
                            sessionStorage.removeItem('triadeInProgress');
                            sessionStorage.removeItem('triadeState');
                            this.triade.active = false;
                            this.triade.reconnecting = false;
                            this.gameInProgress = false;
                            this.lobbyMode = 'classic';
                            this.hasJoined = false;
                        }
                    }, 1500);
                }
                // 🎴 FIX: Si joueur dans lobby triade mais a raté triade-game-started (race condition socket)
                else if (this.hasJoined && this.lobbyMode === 'triade' && !this.triade.active) {
                    console.log('🎴 Lobby triade détecté sans partie active → vérification auprès du serveur...');
                    // Cacher le modal "partie en cours" immédiatement (optimiste)
                    this.gameInProgress = true;
                    this.socket.emit('triade-reconnect', {
                        twitchId: this.twitchId,
                        username: this.username
                    });
                    
                    // Timeout: si le serveur ne répond pas, c'est que la game n'a pas encore commencé
                    this._triadeReconnectTimeout = setTimeout(() => {
                        if (!this.triade.active) {
                            console.log('🎴 Pas de partie Triade en cours - lobby normal');
                            this.gameInProgress = false;
                            this.triade.reconnecting = false;
                        }
                    }, 3000);
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

                // 🔥 Restaurer les bonus
                if (data.comboData) {
                    this.comboLevel = data.comboData.comboLevel || 0;
                    this.comboProgress = data.comboData.comboProgress || 0;
                    this.bonusInventory = data.comboData.bonusInventory || { '5050': 0, 'reveal': 0, 'shield': 0, 'doublex2': 0 };
                    console.log(`✅ Combo restauré via player-restored (prioritaire): Lvl${this.comboLevel}, Progress:${this.comboProgress}, Inventory:${JSON.stringify(this.bonusInventory)}`);
                }

                // 🆕 Restaurer les défis
                if (data.challenges) {
                    this.challenges = data.challenges;
                    console.log(`✅ Défis restaurés: ${this.challenges.map(c => c.name).join(', ')}`);
                }

                this.currentQuestionNumber = data.currentQuestionIndex;
                this.hasJoined = true;

                if (data.hasAnswered) {
                    this.hasAnswered = true;
                    this.selectedAnswer = data.selectedAnswer;
                    console.log(`⚠️ Réponse ${data.selectedAnswer} restaurée`);
                }

                // 🔥 NOUVEAU : Restaurer les effets visuels des bonus utilisés
                this.$nextTick(() => {
                    this.restoreBonusEffects(data);
                });

                console.log(`✅ Joueur restauré - Mode: ${data.gameMode}`);
                this.showNotification('Reconnecté à la partie !', 'success');
            });



            // Événements du serveur
            this.socket.on('game-activated', (data) => {
                this.isGameActive = true;
                // 🔧 Reset hasJoined — c'est un NOUVEAU lobby, personne n'a rejoint
                this.hasJoined = false;
                this.playerCount = 0;
                sessionStorage.removeItem('triadeInProgress');
                sessionStorage.removeItem('triadeState');
                localStorage.removeItem('hasJoinedLobby');
                localStorage.removeItem('lobbyTwitchId');
                // 🆕 Mettre à jour les paramètres si fournis
                if (data && data.lives) this.gameLives = data.lives;
                if (data && data.questionTime) this.gameTime = data.questionTime;
                // 🆕 Mode Rivalité / BombAnime
                if (data && data.lobbyMode) {
                    this.lobbyMode = data.lobbyMode;
                    if (data.lobbyMode === 'rivalry') {
                        // Restaurer l'équipe sélectionnée si elle existe
                        const savedTeam = localStorage.getItem('selectedTeam');
                        if (savedTeam) {
                            this.selectedTeam = parseInt(savedTeam);
                        }
                    } else if (data.lobbyMode === 'bombanime') {
                        // Mode BombAnime - initialiser les vies et la série
                        this.playerLives = data.lives || 2;
                        this.bombanime.serie = data.bombanimeSerie || 'Naruto';
                        this.bombanime.timer = data.bombanimeTimer || 8;
                        console.log('💣 Mode BombAnime activé:', this.bombanime.serie);
                    }
                }
                if (data && data.teamNames) this.teamNames = data.teamNames;
                this.showNotification('Le jeu est maintenant actif ! 🎮', 'success');
            });

            // 🆕 Écouter les mises à jour de configuration
            this.socket.on('game-config-updated', (data) => {
                this.gameLives = data.lives;
                this.gameTime = data.questionTime;
                console.log(`⚙️ Paramètres mis à jour: ${data.lives}❤️ - ${data.questionTime}s`);
            });

            this.socket.on('game-deactivated', () => {
                // Reset COMPLET de l'état du jeu
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
                
                // 🆕 Reset mode Rivalité
                this.lobbyMode = 'classic';
                this.selectedTeam = null;
                this.teamCounts = { 1: 0, 2: 0 };
                this.endTeamCooldown();

                // Arrêter le timer si actif
                this.stopTimer();

                this.resetComboSystem();

                // Nettoyer localStorage et sessionStorage
                localStorage.removeItem('hasJoinedLobby');
                localStorage.removeItem('lobbyTwitchId');
                localStorage.removeItem('selectedTeam');
                localStorage.removeItem('teamCooldownEnd');
                sessionStorage.removeItem('wasKicked'); // 🆕 Clear kick flag pour prochaine partie
                sessionStorage.removeItem('triadeInProgress');
                sessionStorage.removeItem('triadeState');
                
                // 🎴 Reset Triade
                this.triade.active = false;

                this.showNotification('Le jeu a été désactivé', 'info');
            });

            this.socket.on('game-started', (data) => {
                // Ignorer en mode BombAnime (géré par bombanime-game-started)
                if (this.lobbyMode === 'bombanime') {
                    console.log('🎮 game-started ignoré en mode BombAnime');
                    return;
                }
                
                this.gameStartedOnServer = true;
                this.gameMode = data.gameMode || 'lives';
                
                // 🆕 Mode Rivalité
                if (data.lobbyMode) {
                    this.lobbyMode = data.lobbyMode;
                }
                if (data.teamNames) {
                    this.teamNames = data.teamNames;
                }
                if (data.playerTeam) {
                    this.selectedTeam = data.playerTeam;
                }

                if (data.isParticipating) {
                    document.body.classList.add('game-active');
                    this.gameInProgress = true;

                    // 🆕 Initialiser selon le mode
                    if (this.gameMode === 'lives') {
                        this.playerLives = this.gameLives;
                    } else {
                        this.playerPoints = 0;
                    }

                    // 🆕 Initialiser les défis
                    if (data.challenges) {
                        this.challenges = data.challenges;
                        console.log('🎯 Défis reçus:', this.challenges.map(c => c.name).join(', '));
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
                
                // 🆕 Mode Rivalité
                if (data.lobbyMode) {
                    this.lobbyMode = data.lobbyMode;
                    // Si on passe en classic, reset les données d'équipe
                    if (data.lobbyMode === 'classic') {
                        this.selectedTeam = null;
                        this.teamCounts = { 1: 0, 2: 0 };
                        localStorage.removeItem('selectedTeam');
                        localStorage.removeItem('teamCooldownEnd');
                    }
                }
                if (data.teamNames) this.teamNames = data.teamNames;
                if (data.teamCounts) this.teamCounts = data.teamCounts;
                
                // 💣 BombAnime / 🎴 Triade - Lobby plein
                if (data.lobbyMode === 'bombanime' || data.lobbyMode === 'triade') {
                    this.isLobbyFull = data.isLobbyFull || false;
                    this.maxPlayers = data.maxPlayers || (data.lobbyMode === 'triade' ? 10 : 13);
                    // Reset l'erreur si le lobby n'est plus plein
                    if (!data.isLobbyFull && this.lobbyFullError) {
                        this.lobbyFullError = false;
                        console.log('💣 Place disponible - bouton réactivé');
                    }
                } else {
                    this.isLobbyFull = false;
                    this.lobbyFullError = false;
                }
            });
            
            // 🆕 L'admin a changé notre équipe
            this.socket.on('team-changed', (data) => {
                if (data.newTeam) {
                    const oldTeam = this.selectedTeam;
                    this.selectedTeam = data.newTeam;
                    localStorage.setItem('selectedTeam', data.newTeam);
                    console.log(`🔄 [ADMIN] Équipe changée: Team ${oldTeam} → Team ${data.newTeam}`);
                    this.showNotification(`Tu as été déplacé dans ${this.teamNames[data.newTeam]}`, 'info');
                }
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
                
                // 🆕 Mettre à jour les scores d'équipe en mode Rivalité
                if (results.lobbyMode === 'rivalry' && results.teamScores) {
                    this.teamScores = results.teamScores;
                    if (results.teamNames) this.teamNames = results.teamNames;
                }

                // 🔥 Déplacer myResult ici pour être accessible partout

                const myResult = results.players?.find(p => p.username === this.username);

                if (myResult && myResult.shieldUsed) {
                    this.showNotification('🛡️ Bouclier utilisé ! Vous êtes protégé !', 'success');
                    this.showShieldProtectionEffect();
                }

                // Mode Points - Incrémenter le score si correct
                if (this.gameMode === 'points') {
                    if (this.selectedAnswer === results.correctAnswer) {
                        const pointsEarned = myResult?.pointsEarned || 1000;

                        const finalPoints = this.activeBonusEffect === 'doublex2' ? pointsEarned * 2 : pointsEarned;

                        this.pointsGained = finalPoints;
                        this.playerPoints += finalPoints;
                        this.triggerPointsAnimation();
                    }
                } else {
                    // Mode Vie
                    const myPlayerData = results.playersData?.find(p => p.twitchId === this.twitchId);

                    if (myPlayerData) {
                        this.playerLives = myPlayerData.lives;
                        console.log(`✅ Vies synchronisées: ${this.playerLives}`);
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
                // 🆕 Ne pas afficher le podium si le joueur a été kick
                const wasKicked = sessionStorage.getItem('wasKicked');
                if (wasKicked) {
                    console.log('🚫 Podium ignoré - joueur kick');
                    this.gameStartedOnServer = false;
                    // Nettoyer localStorage car la partie est terminée
                    localStorage.removeItem('hasJoinedLobby');
                    localStorage.removeItem('lobbyTwitchId');
                    localStorage.removeItem('selectedTeam');
                    localStorage.removeItem('teamCooldownEnd');
                    return;
                }
                
                // 🆕 Ne pas afficher le podium si le joueur n'a pas participé
                // Vérifier si le joueur est dans playersData
                const isParticipant = data.playersData && data.playersData.some(p => 
                    p.twitchId === this.twitchId || p.username === this.username
                );
                
                if (!isParticipant) {
                    console.log('👀 Podium ignoré - spectateur');
                    this.gameStartedOnServer = false;
                    return;
                }
                
                this.gameEnded = true;
                this.gameStartedOnServer = false; // 🆕 Reset flag
                this.gameEndData = data;
                this.stopTimer();

                this.resetComboSystem();

                // 🆕 Initialiser les animations du winner
                this.$nextTick(() => {
                    this.initWinnerAnimations();
                });

                // 🆕 Nettoyer localStorage car la partie est terminée
                localStorage.removeItem('hasJoinedLobby');
                localStorage.removeItem('lobbyTwitchId');
                localStorage.removeItem('selectedTeam');
                localStorage.removeItem('teamCooldownEnd');
            });

            this.socket.on('error', (data) => {
                // 🆕 Si canSpectate = true, le joueur n'est plus dans la partie
                if (data.canSpectate) {
                    console.log('👀 Passage en mode spectateur - plus dans la partie');
                    this.hasJoined = false;
                    this.gameInProgress = false;
                    // Forcer l'affichage "Partie en cours"
                    this.gameStartedOnServer = true;
                    this.isGameActive = true;
                    // Nettoyer localStorage
                    localStorage.removeItem('hasJoinedLobby');
                    localStorage.removeItem('lobbyTwitchId');
                    localStorage.removeItem('selectedTeam');
                    localStorage.removeItem('teamCooldownEnd');
                }
                
                // 💣🎴 Lobby BombAnime/Triade plein
                if (data.message && data.message.includes('plein')) {
                    this.hasJoined = false; // Le joueur n'a PAS rejoint
                    this.triadeJoinPending = false; // Annuler le pending
                    // Nettoyer localStorage car le join a échoué
                    localStorage.removeItem('hasJoinedLobby');
                    localStorage.removeItem('lobbyTwitchId');
                    
                    // 🎴💣 Animation shake + cooldown 3s (pour les deux modes)
                    this.triadeShakeError = true;
                    this.joinCooldown = true;
                    
                    setTimeout(() => {
                        this.triadeShakeError = false;
                    }, 1000);
                    
                    setTimeout(() => {
                        this.joinCooldown = false;
                        this.lobbyFullError = false;
                    }, 3000);
                    
                    console.log('🚫 Lobby plein - animation shake + cooldown 3s');
                    return; // Ne pas afficher la notification
                }
                
                this.showNotification(data.message, 'error');
            });

            // 🆕 Handler quand le joueur est kick par le streamer
            this.socket.on('kicked', (data) => {
                console.log('🚫 Vous avez été kick:', data.reason);
                
                // Réinitialiser l'état du joueur
                this.hasJoined = false;
                this.gameInProgress = false;
                // Note: on garde isGameActive et gameStartedOnServer tels quels 
                // pour que le joueur voie le bon écran (lobby ou partie en cours)
                this.currentQuestion = null;
                this.selectedAnswer = null;
                this.hasAnswered = false;
                this.showResults = false;
                this.playerLives = 3;
                this.playerPoints = 0;
                this.playerCount = 0; // 🆕 Reset le compteur visuellement
                this.gameEnded = false; // 🆕 Reset pour éviter d'afficher le podium
                
                // Stopper le timer si actif
                if (this.timerInterval) {
                    clearInterval(this.timerInterval);
                    this.timerInterval = null;
                }
                
                // Marquer comme kick pour empêcher le rejoin auto
                sessionStorage.setItem('wasKicked', 'true');
                
                // 🆕 Clear le localStorage pour reset l'état "dans la partie"
                localStorage.removeItem('hasJoinedLobby');
                localStorage.removeItem('lobbyTwitchId');
                
                // Afficher une notification discrète en bas
                this.showKickNotification();
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

            // 🆕 Bonus rapidité reçu (+500 pts) - Notification uniquement
            this.socket.on('speed-bonus', (data) => {
                console.log(`⚡ Bonus rapidité: +${data.points} pts`);
                this.showNotification(`⚡ Bonus rapidité ! +${data.points} pts`, 'success');
                // Les points sont déjà inclus dans question-results, pas besoin de les mettre à jour ici
            });

            this.socket.on('combo-updated', (data) => {
                // 🔥 Sauvegarder l'ancien niveau AVANT la mise à jour
                const oldLevel = this.comboLevel;
                const oldProgress = this.comboProgress;

                // 🔥 SI animation en cours, IGNORER complètement cette mise à jour
                if (this.isLevelingUp) {
                    console.log('⏸️ Update combo ignorée - Animation en cours');

                    // Mettre à jour SEULEMENT les données (pas la jauge visuelle)
                    this.comboLevel = data.comboLevel;
                    this.comboProgress = data.comboProgress;
                    this.bonusInventory = data.bonusInventory || this.bonusInventory;
                    return; // ❌ NE PAS continuer
                }

                // Mise à jour normale des données
                this.comboLevel = data.comboLevel;
                this.comboProgress = data.comboProgress;
                this.bonusInventory = data.bonusInventory || this.bonusInventory;

                console.log(`📡 Combo reçu du serveur: Lvl${this.comboLevel}, Progress:${this.comboProgress}, Inventory:${JSON.stringify(this.bonusInventory)}`);

                // 🔥 Détecter si on vient de LEVEL-UP
                if (data.comboLevel > oldLevel) {
                    console.log(`🎉 LEVEL UP DÉTECTÉ: ${oldLevel} → ${data.comboLevel}`);

                    // BLOQUER immédiatement AVANT d'appeler l'animation
                    this.isLevelingUp = true;

                    // Lancer l'animation
                    this.animateLevelUp();
                } else {
                    // Pas de level-up, juste spawn particules si progression
                    if (data.comboProgress > oldProgress) {
                        this.spawnParticles();
                        this.spawnParticlesMobile();
                    }
                }
            });


            // 🆕 Bonus utilisé (confirmation) - 🔥 REFONTE: Décrémenter l'inventaire
            this.socket.on('bonus-used', (data) => {
                if (data.success) {
                    // Décrémenter localement aussi
                    if (this.bonusInventory[data.bonusType] > 0) {
                        this.bonusInventory[data.bonusType]--;
                    }

                    // Appliquer l'effet
                    this.applyBonusEffect(data.bonusType);

                    // Fermer le modal
                    this.closeBonusModal();
                } else {
                    console.error('❌ Erreur utilisation bonus:', data.error);
                }
            });


            this.socket.on('bonus-validated', (data) => {
                console.log(`📡 Bonus validé par le serveur:`, data);

                const { bonusType, correctAnswer } = data;

                // Stocker temporairement la bonne réponse
                this.tempCorrectAnswer = correctAnswer;

                // Appliquer l'effet
                if (bonusType === '5050') {
                    this.apply5050();
                } else if (bonusType === 'reveal') {
                    this.applyReveal();
                }

                // Nettoyer après
                setTimeout(() => {
                    this.tempCorrectAnswer = null;
                }, 100);
            });


            // 🆕 Mise à jour des défis
            this.socket.on('challenges-updated', (data) => {
                console.log('🎯 Défis mis à jour:', data);
                
                // Mettre à jour la progression des défis
                if (data.challenges) {
                    this.challenges = data.challenges;
                }
                
                // Si un défi vient d'être complété, jouer une animation
                if (data.completedChallenges && data.completedChallenges.length > 0) {
                    data.completedChallenges.forEach(({ challengeId, reward }) => {
                        const challenge = this.challenges.find(c => c.id === challengeId);
                        if (challenge) {
                            this.showNotification(`🎯 Défi "${challenge.name}" complété ! +1 ${this.getBonusName(reward)}`, 'success');
                        }
                    });
                }
            });


            // Statut live des streamers partenaires
            this.socket.on('partners-live-status', (liveStatus) => {
                this.streamersLive = liveStatus;
                console.log('📡 Statut live reçu:', liveStatus);
            });

            // ============================================
            // 💣 BOMBANIME - Socket Handlers
            // ============================================
            
            this.socket.on('bombanime-game-started', (data) => {
                console.log('💣 BombAnime démarré:', data);
                
                // 🆕 Marquer que la partie a démarré sur le serveur (pour le panneau spectateur)
                this.gameStartedOnServer = true;
                
                // 🆕 Si le joueur n'a pas rejoint, ne pas afficher la partie (mode spectateur)
                if (!this.hasJoined) {
                    console.log('⏳ BombAnime en cours - Vous êtes spectateur');
                    this.gameInProgress = false;
                    return;
                }
                
                // ========== INITIALISER L'INTRO D'ABORD ==========
                // Important: définir introPhase AVANT playersData pour éviter le flash
                this.bombanime.introPhase = 'players';
                this.bombanime.introPlayersRevealed = 0;
                this.bombanime.currentPlayerTwitchId = null;
                this.bombanime.bombPointingUp = true; // Bombe vers le haut jusqu'au premier tour
                this.bombanime.isMyTurn = false; // 🆕 Reset isMyTurn pour éviter l'input activé au mauvais moment
                
                // Maintenant mettre à jour les données
                this.bombanime.active = true;
                this.bombanime.serie = data.serie;
                this.bombanime.timer = data.timer;
                this.bombanime.timeRemaining = data.timer; // 🆕 Reset timeRemaining pour éviter la bombe rouge
                this.bombanime.inputValue = ''; // 🆕 Reset input à chaque nouvelle partie
                this.bombanime.playersOrder = [...data.playersOrder];
                this.bombanime.playersData = [...data.playersData];
                this.bombanime.usedNamesCount = 0;
                this.bombanime.myAlphabet = [];
                
                // 🎯 Initialiser les défis BombAnime
                this.bombanime.challenges = (data.challenges || []).map(c => ({
                    ...c,
                    progress: 0,
                    completed: false
                }));
                this.bombanime.bonuses = { freeCharacter: 0, extraLife: 0 };
                this.bombanime.challengeJustCompleted = null;
                console.log('🎯 Défis BombAnime:', this.bombanime.challenges);
                
                this.gameInProgress = true;
                this.gameEnded = false;
                
                // 🆕 Clear le timer précédent s'il existe
                if (this.bombanime.timerInterval) {
                    clearInterval(this.bombanime.timerInterval);
                    this.bombanime.timerInterval = null;
                }
                if (this.bombanime.debugMsInterval) {
                    clearInterval(this.bombanime.debugMsInterval);
                    this.bombanime.debugMsInterval = null;
                }
                this.bombanime.debugMs = null;
                
                // 🆕 Forcer le refresh pour appliquer le nouveau timeRemaining
                this.$forceUpdate();
                
                // Sauvegarder l'état pour éviter le flash au refresh
                sessionStorage.setItem('bombanimeInProgress', 'true');
                
                // Initialiser les vies du joueur depuis playersData
                const myData = data.playersData.find(p => p.twitchId === this.twitchId);
                if (myData) {
                    this.playerLives = myData.lives;
                }
                
                document.body.classList.add('game-active');
                
                // ========== ANIMATION D'INTRO ==========
                const totalPlayers = data.playersData.length;
                const playerRevealDelay = 150; // 150ms entre chaque joueur
                
                // Révéler les joueurs séquentiellement (après un court délai pour que le DOM soit prêt)
                this.$nextTick(() => {
                    for (let i = 0; i < totalPlayers; i++) {
                        setTimeout(() => {
                            this.bombanime.introPlayersRevealed = i + 1;
                        }, i * playerRevealDelay);
                    }
                });
                
                // Phase 2: Afficher le panel alphabet (après tous les joueurs)
                setTimeout(() => {
                    this.bombanime.introPhase = 'panel';
                }, totalPlayers * playerRevealDelay + 200);
                
                // Phase 3: Animation de la bombe
                setTimeout(() => {
                    this.bombanime.introPhase = 'bomb';
                }, totalPlayers * playerRevealDelay + 800);
                
                // Phase 4: Prêt à jouer
                setTimeout(() => {
                    this.bombanime.introPhase = 'ready';
                    this.showNotification(`💣 BombAnime démarre ! Série: ${data.serie}`, 'success');
                }, totalPlayers * playerRevealDelay + 1200);
                
                // Fin de l'intro (le serveur enverra bombanime-turn-start après ~3s)
                setTimeout(() => {
                    this.bombanime.introPhase = null;
                }, totalPlayers * playerRevealDelay + 2000);
            });
            
            this.socket.on('bombanime-turn-start', (data) => {
                console.log('💣 Tour de:', data.currentPlayerUsername);
                this.bombanime.currentPlayerTwitchId = data.currentPlayerTwitchId;
                this.bombanime.bombPointingUp = false; // La bombe tourne vers le joueur
                this.bombanime.timeRemaining = data.timer;
                this.bombanime.lastError = null;
                
                // Reset les currentTyping de tous les joueurs (null = pas encore tapé)
                this.bombanime.playersData.forEach(p => {
                    p.currentTyping = null;
                });
                
                // Forcer le re-render pour mettre à jour l'angle de la mèche
                this.$forceUpdate();
                
                // Démarrer le timer visuel
                this.startBombanimeTimer();
                
                // 🆕 Attendre que l'intro soit terminée avant d'activer isMyTurn
                const activateTurn = () => {
                    this.bombanime.isMyTurn = data.currentPlayerTwitchId === this.twitchId;
                    
                    // Focus sur l'input si c'est mon tour
                    if (this.bombanime.isMyTurn) {
                        this.$nextTick(() => {
                            const input = document.getElementById('bombanimeInput');
                            if (input) input.focus();
                        });
                    }
                };
                
                // Si l'intro est encore en cours, attendre qu'elle soit finie
                if (this.bombanime.introPhase) {
                    const checkIntro = setInterval(() => {
                        if (!this.bombanime.introPhase) {
                            clearInterval(checkIntro);
                            // Petit délai supplémentaire pour l'animation de la bombe
                            setTimeout(activateTurn, 300);
                        }
                    }, 50);
                } else {
                    activateTurn();
                }
            });
            
            this.socket.on('bombanime-name-accepted', (data) => {
                console.log('✅ Nom accepté:', data.name);
                
                // 🔊 Son de passage de tour
                this.playSound(this.sounds.bombanimePass);
                
                // DEBUG: Afficher le temps restant
                if (data.playerTwitchId === this.twitchId && data.debugTimeRemainingMs !== undefined) {
                    const timeRemainingSec = (data.debugTimeRemainingMs / 1000).toFixed(3);
                    this.bombanime.debugInfo = `✅ Réponse à ${timeRemainingSec}s restants (turnId=${data.debugTurnId})`;
                    console.log(`🔍 DEBUG: ${this.bombanime.debugInfo}`);
                    // Garder le message 5 secondes
                    setTimeout(() => {
                        if (this.bombanime.debugInfo && this.bombanime.debugInfo.includes('Réponse')) {
                            this.bombanime.debugInfo = null;
                        }
                    }, 5000);
                }
                
                // Animation de succès visible par TOUS sur le joueur qui vient de répondre
                this.bombanime.successPlayerTwitchId = data.playerTwitchId;
                setTimeout(() => {
                    this.bombanime.successPlayerTwitchId = null;
                }, 500);
                
                this.bombanime.playersData = [...data.playersData];
                this.bombanime.lastValidName = data.name;
                this.bombanime.usedNamesCount++;
                this.bombanime.inputValue = '';
                
                // Tourner la bombe IMMÉDIATEMENT vers le prochain joueur
                if (data.nextPlayerTwitchId) {
                    this.bombanime.currentPlayerTwitchId = data.nextPlayerTwitchId;
                }
                
                // Mettre à jour mon alphabet et animer les nouvelles lettres si c'était ma réponse
                if (data.playerTwitchId === this.twitchId) {
                    // Trouver les nouvelles lettres (pas encore dans myAlphabet)
                    const oldAlphabet = new Set(this.bombanime.myAlphabet);
                    const newLetters = (data.newLetters || []).filter(l => !oldAlphabet.has(l));
                    
                    // Déclencher l'animation des lettres et du cœur
                    if (newLetters.length > 0) {
                        this.bombanime.justAddedLetters = newLetters;
                        this.bombanime.heartPulse = true;
                        this.bombanime.mobileAlphabetPulse = true; // 📱 Animation bouton mobile
                        
                        // Retirer les classes après les animations
                        setTimeout(() => {
                            this.bombanime.justAddedLetters = [];
                            this.bombanime.heartPulse = false;
                            this.bombanime.mobileAlphabetPulse = false;
                        }, 600);
                    }
                    
                    this.bombanime.myAlphabet = data.alphabet;
                    
                    // 🎯 Mettre à jour les défis et bonus
                    if (data.challenges) {
                        this.bombanime.challenges = data.challenges;
                    }
                    if (data.bonuses) {
                        this.bombanime.bonuses = data.bonuses;
                    }
                    
                    // 🎯 Notification si défi complété
                    if (data.completedChallenges && data.completedChallenges.length > 0) {
                        data.completedChallenges.forEach(cc => {
                            const challenge = this.bombanime.challenges.find(c => c.id === cc.challengeId);
                            if (challenge) {
                                this.bombanime.challengeJustCompleted = challenge.id;
                                const rewardText = cc.reward === 'extraLife' ? '❤️ +1 Vie' : '🎁 Perso Gratuit';
                                this.showNotification(`🎯 Défi complété: ${challenge.name} → ${rewardText}`, 'success');
                                
                                setTimeout(() => {
                                    this.bombanime.challengeJustCompleted = null;
                                }, 2000);
                            }
                        });
                    }
                }
                
                // Forcer le re-render
                this.$forceUpdate();
            });
            
            this.socket.on('bombanime-name-rejected', (data) => {
                console.log('❌ Nom rejeté:', data.reason);
                
                // Trouver le slot du joueur actuel (visible par tous)
                const playerSlot = document.querySelector('.bombanime-player-slot.active');
                
                // Si c'est "already_used", afficher le cadenas et shake
                if (data.reason === 'already_used') {
                    // 🔊 Son "déjà utilisé"
                    this.playSound(this.sounds.bombanimeUsed);
                    
                    const lock = document.getElementById('lock-' + this.bombanime.currentPlayerTwitchId);
                    
                    if (playerSlot) {
                        playerSlot.classList.add('already-used');
                        setTimeout(() => playerSlot.classList.remove('already-used'), 400);
                    }
                    
                    if (lock) {
                        lock.classList.add('show');
                        setTimeout(() => lock.classList.remove('show'), 600);
                    }
                    
                    // Clear l'input seulement si c'est moi
                    if (data.playerTwitchId === this.twitchId) {
                        this.bombanime.inputValue = '';
                    }
                } else if (data.reason === 'character_not_found') {
                    // 🔊 Son "personnage inconnu"
                    this.playSound(this.sounds.bombanimeWrong);
                    
                    // Personnage non reconnu: shake le joueur (visible par tous)
                    if (playerSlot) {
                        playerSlot.classList.add('shake-error');
                        setTimeout(() => playerSlot.classList.remove('shake-error'), 400);
                    }
                    
                    // Clear l'input et shake seulement si c'est moi
                    if (data.playerTwitchId === this.twitchId) {
                        const input = document.getElementById('bombanimeInput');
                        if (input) {
                            input.classList.add('shake-error');
                            setTimeout(() => input.classList.remove('shake-error'), 400);
                        }
                        this.bombanime.inputValue = '';
                    }
                } else {
                    // Autres erreurs: shake le joueur et afficher le message
                    if (playerSlot) {
                        playerSlot.classList.add('shake-error');
                        setTimeout(() => playerSlot.classList.remove('shake-error'), 400);
                    }
                    
                    if (data.playerTwitchId === this.twitchId) {
                        this.bombanime.lastError = data.reason;
                        
                        // Feedback visuel sur l'input
                        const input = document.getElementById('bombanimeInput');
                        if (input) {
                            input.classList.add('error');
                            setTimeout(() => input.classList.remove('error'), 500);
                        }
                    }
                }
            });
            
            // Écouter les frappes en temps réel des autres joueurs
            this.socket.on('bombanime-typing', (data) => {
                // Mettre à jour le currentTyping du joueur
                const player = this.bombanime.playersData.find(p => p.twitchId === data.playerTwitchId);
                if (player) {
                    player.currentTyping = data.text;
                    this.$forceUpdate();
                }
            });
            
            this.socket.on('bombanime-explosion', (data) => {
                console.log('💥 Explosion sur:', data.playerUsername);
                
                // 🔊 Son d'explosion
                this.playSound(this.sounds.bombanimeExplosion);
                
                // 🆕 Garder la tentative de réponse du joueur qui explose
                const explodingPlayer = this.bombanime.playersData.find(p => p.twitchId === data.playerTwitchId);
                if (explodingPlayer && explodingPlayer.currentTyping) {
                    explodingPlayer.lastAnswer = explodingPlayer.currentTyping;
                }
                
                // 🆕 Désactiver immédiatement l'input si c'est mon tour qui explose
                if (data.playerTwitchId === this.twitchId) {
                    this.bombanime.isMyTurn = false;
                    this.bombanime.inputValue = '';
                    // Défocuser l'input
                    const input = document.getElementById('bombanimeInput');
                    if (input) input.blur();
                }
                
                // DEBUG: Afficher l'explosion avec timing
                if (data.playerTwitchId === this.twitchId) {
                    const elapsedSec = data.debugElapsedMs ? (data.debugElapsedMs / 1000).toFixed(3) : '?';
                    this.bombanime.debugInfo = `💥 EXPLOSION après ${elapsedSec}s (turnId=${data.debugTurnId})`;
                    console.log(`🔍 DEBUG: ${this.bombanime.debugInfo}`);
                }
                
                // Arrêter le timer immédiatement
                if (this.bombanime.timerInterval) {
                    clearInterval(this.bombanime.timerInterval);
                }
                if (this.bombanime.debugMsInterval) {
                    clearInterval(this.bombanime.debugMsInterval);
                }
                
                // 🆕 Animation de shake sur le joueur qui explose (avec délai)
                setTimeout(() => {
                    const playerSlot = document.querySelector(`.bombanime-player-slot[data-twitch-id="${data.playerTwitchId}"]`);
                    if (playerSlot) {
                        playerSlot.classList.add('exploding');
                        setTimeout(() => {
                            playerSlot.classList.remove('exploding');
                        }, 250);
                    }
                }, 50); // Délai minimal
                
                // Notification immédiate si c'est moi
                if (data.playerTwitchId === this.twitchId) {
                    this.playerLives = data.livesRemaining;
                    if (data.isEliminated) {
                        this.showNotification('💀 Vous êtes éliminé !', 'error');
                    } else {
                        this.showNotification('💥 -1 vie !', 'error');
                    }
                }
                
                // Sauvegarder la tentative de réponse avant la mise à jour
                const attemptedAnswer = explodingPlayer ? explodingPlayer.currentTyping : null;
                
                // Retarder la mise à jour visuelle des playersData pour l'animation
                setTimeout(() => {
                    this.bombanime.playersData = [...data.playersData];
                    
                    // Restaurer la tentative de réponse
                    if (attemptedAnswer) {
                        const player = this.bombanime.playersData.find(p => p.twitchId === data.playerTwitchId);
                        if (player) {
                            player.lastAnswer = attemptedAnswer;
                        }
                    }
                    
                    this.$forceUpdate();
                }, 50); // Synchronisé avec le shake
            });
            
            this.socket.on('bombanime-alphabet-complete', (data) => {
                console.log('🎉 Alphabet complet:', data.playerUsername);
                
                // Animation alphabet visible par TOUS sur l'hexagone du joueur
                this.$nextTick(() => {
                    const playerSlot = document.querySelector(`.bombanime-player-slot[data-twitch-id="${data.playerTwitchId}"]`);
                    if (playerSlot) {
                        playerSlot.classList.add('alphabet-complete');
                        
                        setTimeout(() => {
                            playerSlot.classList.remove('alphabet-complete');
                        }, 1200);
                    }
                });
                
                // 🎯 Animation gain de vie via Vue (réactive)
                setTimeout(() => {
                    this.bombanime.lifeGainedPlayerTwitchId = data.playerTwitchId;
                    
                    setTimeout(() => {
                        this.bombanime.lifeGainedPlayerTwitchId = null;
                    }, 800);
                }, 200);
                
                // Mettre à jour les vies dans playersData pour tous
                const player = this.bombanime.playersData.find(p => p.twitchId === data.playerTwitchId);
                if (player) {
                    setTimeout(() => {
                        player.lives = data.newLives;
                        this.$forceUpdate();
                    }, 400);
                }
                
                if (data.playerTwitchId === this.twitchId) {
                    // Déclencher l'animation spectaculaire du cœur (pour moi)
                    this.bombanime.heartCompleting = true;
                    
                    // Mettre à jour mes vies locales
                    setTimeout(() => {
                        this.playerLives = data.newLives;
                        this.bombanime.myAlphabet = []; // Reset
                    }, 400);
                    
                    // Retirer l'animation après sa fin
                    setTimeout(() => {
                        this.bombanime.heartCompleting = false;
                    }, 850);
                    
                    // Notification
                    this.showNotification('🎉 Alphabet complet ! +1 vie', 'success');
                }
            });
            
            this.socket.on('bombanime-game-ended', (data) => {
                console.log('🏆 BombAnime terminé:', data);
                this.bombanime.active = false;
                this.gameEnded = true;
                this.gameStartedOnServer = false; // 🆕 Reset pour les spectateurs
                
                // Supprimer l'état de sessionStorage
                sessionStorage.removeItem('bombanimeInProgress');
                
                // Arrêter le timer
                if (this.bombanime.timerInterval) {
                    clearInterval(this.bombanime.timerInterval);
                }
                if (this.bombanime.debugMsInterval) {
                    clearInterval(this.bombanime.debugMsInterval);
                }
                
                // Stocker les données de fin
                this.gameEndData = {
                    winner: data.winner,
                    ranking: data.ranking,
                    duration: data.duration,
                    gameMode: 'bombanime',
                    serie: data.serie,
                    namesUsed: data.namesUsed
                };
            });
            
            this.socket.on('bombanime-state', (data) => {
                console.log('💣 État BombAnime reçu:', data);
                if (data.active) {
                    // 🆕 Vérifier si le joueur fait partie de la partie
                    const myData = data.playersData.find(p => p.twitchId === this.twitchId);
                    
                    // 🆕 Si le joueur n'est pas dans la partie, mode spectateur
                    if (!myData) {
                        console.log('⏳ BombAnime en cours - Vous êtes spectateur (reconnexion)');
                        this.gameStartedOnServer = true;
                        this.gameInProgress = false;
                        return;
                    }
                    
                    // Mettre à jour l'état BombAnime
                    this.bombanime.active = true;
                    this.bombanime.serie = data.serie;
                    this.bombanime.timer = data.timer;
                    this.bombanime.timeRemaining = data.timeRemaining || data.timer;
                    this.bombanime.currentPlayerTwitchId = data.currentPlayerTwitchId;
                    this.bombanime.bombPointingUp = false; // 🆕 Partie en cours, bombe vers le joueur
                    this.bombanime.playersOrder = [...data.playersOrder];
                    this.bombanime.playersData = [...data.playersData];
                    this.bombanime.myAlphabet = data.myAlphabet || [];
                    this.bombanime.usedNamesCount = data.usedNamesCount || 0;
                    this.bombanime.isMyTurn = data.currentPlayerTwitchId === this.twitchId;
                    
                    // Mettre à jour l'état global
                    this.gameInProgress = true;
                    this.lobbyMode = 'bombanime';
                    
                    // Mettre à jour les vies du joueur
                    this.playerLives = myData.lives;
                    
                    // 🎯 Restaurer les défis et bonus
                    if (data.challenges) {
                        this.bombanime.challenges = data.challenges;
                        console.log('🎯 Défis restaurés:', this.bombanime.challenges);
                    }
                    if (data.bonuses) {
                        this.bombanime.bonuses = data.bonuses;
                        console.log('🎁 Bonus restaurés:', this.bombanime.bonuses);
                    }
                    
                    // Démarrer le timer
                    this.startBombanimeTimer();
                    
                    // Forcer le re-render
                    this.$forceUpdate();
                    
                    // Auto-focus sur l'input si c'est mon tour (après refresh)
                    if (this.bombanime.isMyTurn) {
                        this.$nextTick(() => {
                            const input = document.getElementById('bombanimeInput');
                            if (input) input.focus();
                        });
                    }
                    
                    console.log('✅ État BombAnime restauré - Mon tour:', this.bombanime.isMyTurn);
                } else {
                    // Partie non active - nettoyer l'état
                    sessionStorage.removeItem('bombanimeInProgress');
                    if (this.lobbyMode === 'bombanime' && this.gameInProgress) {
                        this.gameInProgress = false;
                        this.lobbyMode = 'classic';
                    }
                }
            });
            
            // 🆕 Mise à jour de la série BombAnime (pendant le lobby)
            this.socket.on('bombanime-serie-updated', (data) => {
                console.log('💣 Série BombAnime mise à jour:', data.serie);
                this.bombanime.serie = data.serie;
            });
            
            // 🎯 BONUS BOMBANIME - Perso gratuit reçu
            this.socket.on('bombanime-free-character', (data) => {
                console.log('🎁 Perso gratuit reçu:', data.character);
                
                // Mettre le personnage dans l'input
                this.bombanime.inputValue = data.character;
                
                // Mettre à jour les bonus restants
                if (data.bonusesRemaining) {
                    this.bombanime.bonuses = data.bonusesRemaining;
                }
                
                // Auto-focus sur l'input
                this.$nextTick(() => {
                    const input = document.getElementById('bombanimeInput');
                    if (input) input.focus();
                });
                
                this.showNotification(`🎁 Perso gratuit: ${data.character} - Appuie sur Entrée !`, 'info');
            });
            
            // 🎯 BONUS BOMBANIME - Vie extra utilisée
            this.socket.on('bombanime-extra-life-used', (data) => {
                console.log('❤️ Vie extra utilisée:', data);
                
                // Mettre à jour les vies
                this.playerLives = data.newLives;
                
                // Mettre à jour les bonus restants
                if (data.bonusesRemaining) {
                    this.bombanime.bonuses = data.bonusesRemaining;
                }
                
                // Notification
                if (data.wasWasted) {
                    this.showNotification(`❤️ Vie extra gâchée - Tu étais déjà au max !`, 'warning');
                } else {
                    this.showNotification(`❤️ +1 Vie ! (${data.newLives} vies)`, 'success');
                }
                // L'animation est déclenchée par bombanime-player-lives-updated
            });
            
            // 🎯 BONUS BOMBANIME - Mise à jour vies d'un joueur
            this.socket.on('bombanime-player-lives-updated', (data) => {
                console.log('❤️ Vies mises à jour:', data.playerUsername, data.lives);
                this.bombanime.playersData = [...data.playersData];
                
                // Si c'est moi, mettre à jour mes vies
                if (data.playerTwitchId === this.twitchId) {
                    this.playerLives = data.lives;
                }
                
                // 🎯 Déclencher l'animation via Vue (réactive)
                this.bombanime.lifeGainedPlayerTwitchId = data.playerTwitchId;
                
                setTimeout(() => {
                    this.bombanime.lifeGainedPlayerTwitchId = null;
                }, 800);
            });
            
            // 🎯 BONUS BOMBANIME - Erreur
            this.socket.on('bombanime-bonus-error', (data) => {
                console.log('❌ Erreur bonus:', data.error);
                let message = 'Erreur';
                switch (data.error) {
                    case 'not_your_turn':
                        message = 'Ce n\'est pas ton tour !';
                        break;
                    case 'no_bonus_available':
                        message = 'Tu n\'as pas ce bonus !';
                        break;
                    case 'no_character_available':
                        message = 'Plus de personnages disponibles !';
                        break;
                }
                this.showNotification(`❌ ${message}`, 'error');
            });
            
            // ============================================
            // 🎴 TRIADE SOCKET EVENTS
            // ============================================
            
            console.log('🎴 Registering triade socket handlers...');
            
            // Partie Triade démarrée
            this.socket.on('triade-game-started', (data) => {
                console.log('🎴 Triade game started:', data);
                
                this.lobbyMode = 'triade';
                this.gameStartedOnServer = true;
                this.gameEnded = false; // 🆕 Reset gameEnded pour afficher le template
                
                // Vérifier si je suis dans la partie
                const allPlayers = data.playersData || [];
                const isInGame = allPlayers.some(p => p.twitchId === this.twitchId);
                
                if (!isInGame) {
                    console.log('🎴 Triade: je ne suis pas dans la partie → spectateur');
                    this.gameInProgress = false;
                    this.triade.active = false;
                    sessionStorage.removeItem('triadeInProgress');
                    return;
                }
                
                this.gameInProgress = true;
                this.initTriade(data);
                
                // Stocker les données du round 1 (sera déclenché à la fin du deal)
                if (data.round1) {
                    this._triadeRound1 = data.round1;
                }
                
                // Demander mes cartes au serveur avec retry automatique
                this._triadeCardsReceived = false;
                const requestCards = () => {
                    if (this._triadeCardsReceived) return;
                    console.log('🎴 Demande de cartes... twitchId:', this.twitchId);
                    this.socket.emit('triade-request-my-cards', { twitchId: this.twitchId });
                };
                requestCards();
                setTimeout(() => requestCards(), 500);
                setTimeout(() => requestCards(), 1500);
                setTimeout(() => {
                    if (!this._triadeCardsReceived) {
                        console.log('🎴 Cartes toujours pas reçues → reconnect fallback');
                        this.socket.emit('triade-reconnect', { twitchId: this.twitchId, username: this.username });
                    }
                }, 3000);
                
                // 🛡️ FALLBACK ULTIME: si après 6s les cartes ne sont toujours pas affichées
                setTimeout(() => {
                    if (!this.triade.myCards || this.triade.myCards.length === 0) {
                        console.log('🎴 FALLBACK: cartes toujours vides après 6s');
                        // Essayer _pendingTriadeCards d'abord
                        if (this._pendingTriadeCards && this._pendingTriadeCards.length > 0) {
                            console.log('🎴 FALLBACK: injection depuis _pendingTriadeCards');
                            this.triade.myCards = this._pendingTriadeCards.filter(c => c != null);
                            this._pendingTriadeCards = null;
                            this.saveTriadeState();
                        } else {
                            // Dernier recours: redemander au serveur sans animation
                            console.log('🎴 FALLBACK: redemande directe au serveur');
                            this.socket.emit('triade-request-my-cards', { twitchId: this.twitchId });
                        }
                    }
                }, 6000);
                
                // Cacher immédiatement les cartes adverses + lancer l'intro
                this.$nextTick(() => {
                    document.querySelectorAll('.triade-player-card-small').forEach(c => {
                        c.classList.add('pre-deal');
                    });
                    const container = document.querySelector('.triade-table-container');
                    if (container) {
                        container.classList.add('intro');
                        setTimeout(() => container.classList.remove('intro'), 3000);
                    }
                    // Le slot central sera affiché par showTriadeRoundOverlay après l'animation de round
                });
            });
            
            // 🆕 Gestion de l'annonce de round (rounds 2+ uniquement, round 1 déclenché localement)
            this.socket.on('triade-player-played', (data) => {
                if (data.twitchId && !this.triade.playersWhoPlayed.includes(data.twitchId)) {
                    this.triade.playersWhoPlayed.push(data.twitchId);
                }
            });

            this.socket.on('triade-timer-start', (data) => {
                // Restore stat if it was pending (reconnect during deal)
                if (this._pendingRoundStat && !this.triade.selectedStat) {
                    this.triade.selectedStat = this._pendingRoundStat;
                }
                this._pendingRoundStat = null;
                // Enable cards and show slot
                this.triade.timerExpired = false;
                this.triade.showCenterSlot = true;
                if (!this.triade.cardPlayed) this.startTriadeTimer(data.duration || 20);
            });

            this.socket.on('triade-round-start', (data) => {
                console.log('🎲 Round start received:', data);
                
                if (!this.triade.active) {
                    console.warn('🎲 triade.active is false, setting to true');
                    this.triade.active = true;
                }
                
                // Rounds 2+ : afficher immédiatement
                if (this.showTriadeRoundOverlay) {
                    this.showTriadeRoundOverlay(data.round, data.stat, data.statName);
                }
            });
            
            // Reconnexion à une partie Triade en cours
            this.socket.on('triade-reconnect', (data) => {
                console.log('🎴 Triade reconnect:', data);
                
                // Annuler le timeout de sécurité
                if (this._triadeReconnectTimeout) {
                    clearTimeout(this._triadeReconnectTimeout);
                    this._triadeReconnectTimeout = null;
                }
                
                // Server says no game active → clean up stale state
                if (data.active === false) {
                    console.log('🎴 Serveur: pas de partie Triade → nettoyage état');
                    sessionStorage.removeItem('triadeInProgress');
                    sessionStorage.removeItem('triadeState');
                    this.triade.active = false;
                    this.triade.reconnecting = false;
                    this.triade.myCards = [];
                    this.triade.cardPlayed = false;
                    this.triade.playedCardData = null;
                    this.triade.showCenterSlot = false;
                    this.triade.selectedStat = null;
                    this.triade.timerExpired = false;
                    this.triade.timer = 0;
                    this.gameInProgress = false;
                    this.hasJoined = false;
                    this.lobbyMode = 'classic';
                    this.stopTriadeTimer();
                    return;
                }
                
                this.gameInProgress = true;
                this.lobbyMode = 'triade';
                this.hasJoined = true;
                
                // Mettre à jour avec les données fraîches du serveur
                this.initTriade(data);
                this.triade.showCenterSlot = !!data.timerStarted; // Only show if timer already running
                
                // Restaurer la stat du round actuel
                if (data.roundStat) {
                    this.triade.selectedStat = data.timerStarted ? data.roundStat : null;
                    this._pendingRoundStat = data.roundStat; // Store for when timer starts
                }
                this.triade.playersWhoPlayed = data.playersWhoPlayed || [];
                // Timer restore (before card restore so condition works)
                if (data.timerRemainingMs > 1000) {
                    // Keeps running even if card already played
                    this.triade.selectedStat = data.roundStat;
                    this.startTriadeTimer(Math.ceil(data.timerRemainingMs / 1000));
                } else if (!data.playedCard && data.currentRound > 0 && data.timerStarted) {
                    // Timer truly expired and no card was played
                    this.triade.timerExpired = true;
                    this.triade.timer = 0;
                } else if (!data.timerStarted && data.currentRound > 0) {
                    // Timer not started yet (deal/overlay) -> disable cards temporarily
                    this.triade.timerExpired = true;
                    this.triade.showCenterSlot = false;
                }
                
                // Restaurer mes cartes si fournies
                if (data.myCards && data.myCards.length > 0) {
                    this.triade.myCards = (data.myCards || []).filter(c => c != null);
                    this._triadeCardsReceived = true;
                }
                
                // Restaurer carte jouée si déjà placée ce round
                if (data.playedCard) {
                    this.triade.cardPlayed = true;
                    this.$set(this.triade, 'playedCardData', data.playedCard);
                    // Timer keeps running - don't stop it
                }
                
                // Sauvegarder l'état mis à jour
                this.saveTriadeState();
            });
            
            // Mise à jour de la partie
            this.socket.on('triade-update', (data) => {
                console.log('🎴 Triade update:', data);
                
                // Mettre à jour les données des joueurs
                if (data.playersData) {
                    this.triade.playersData = data.playersData;
                    
                    const myPlayer = data.playersData.find(p => p.twitchId === this.twitchId);
                    if (myPlayer) {
                        this.triade.myData = {
                            wins: myPlayer.wins || 0
                        };
                    }
                    
                    this.triade.otherPlayers = this.getOrderedOtherPlayers(data.playersData, p => ({
                            ...p,
                            wins: p.wins || 0
                        }));
                }
                
                // Sauvegarder l'état mis à jour
                this.saveTriadeState();
            });
            

            
            // Recevoir mes cartes (initial deal ou reconnexion)
            this.socket.on('triade-your-cards', (data) => {
                console.log('🎴 Mes cartes Triade:', data.cards, 'dealing:', data.dealing);
                this._triadeCardsReceived = true;
                const safeCards = (data.cards || []).filter(c => c != null);
                
                if (data.dealing && !this._triadeDealStarted) {
                    // Première réception pendant l'intro → animation de deal
                    this._triadeDealStarted = true;
                    this._pendingTriadeCards = safeCards;
                    setTimeout(() => {
                        this.dealTriadeCards();
                        // 🛡️ Safety net: si dealTriadeCards n'a pas injecté les cartes
                        setTimeout(() => {
                            if (!this.triade.myCards || this.triade.myCards.length === 0) {
                                console.log('🎴 Safety: force injection cartes');
                                this.triade.myCards = safeCards;
                                this.saveTriadeState();
                            }
                        }, 2000);
                    }, 3000);
                } else if (data.dealing && this._triadeDealStarted) {
                    // Deal déjà programmé → ignorer (évite d'afficher les cartes avant l'animation)
                    console.log('🎴 Cartes dealing ignorées (deal déjà programmé)');
                } else {
                    // Reconnexion (dealing: false) → afficher directement
                    this.triade.myCards = safeCards;
                    this.saveTriadeState();
                }
            });
            
            // Résultat d'un round
            this.socket.on('triade-round-result', (data) => {
                console.log('🎴 Round result:', data);
                
                // Mettre à jour les données des joueurs (wins, etc.)
                if (data.playersData) {
                    this.triade.playersData = data.playersData;
                    
                    const myPlayer = data.playersData.find(p => p.twitchId === this.twitchId);
                    if (myPlayer) {
                        this.triade.myData.wins = myPlayer.wins || 0;
                    }
                    
                    this.triade.otherPlayers = this.getOrderedOtherPlayers(data.playersData, p => ({ ...p }));
                }
                
                // Afficher qui a gagné
                this.triade.roundWinner = data.winner;
                this.triade.isMyTurn = false;
                
                this.saveTriadeState();
            });
            
            // Nouveau round (nouvelles cartes)
            this.socket.on('triade-new-round', (data) => {
                console.log('🎴 Nouveau round:', data);
                
                // Reset l'état du round
                this.triade.myCards = [];
                this.triade.roundWinner = null;
                this.triade.isMyTurn = false;
                
                // Mettre à jour les joueurs
                this.initTriade(data);
                
                // Animation de distribution
                this.$nextTick(() => {
                    document.querySelectorAll('.triade-player-card-small').forEach(c => {
                        c.classList.add('pre-deal');
                    });
                });
                
                this.saveTriadeState();
            });
            
            // Fin de partie Triade
            this.socket.on('triade-game-ended', (data) => {
                console.log('🏆 Triade terminé:', data);
                
                // Full state reset
                this.stopTriadeTimer();
                this.triade.myCards = [];
                this.triade.cardPlayed = false;
                this.triade.playedCardData = null;
                this.triade.timerExpired = false;
                this.triade.timer = 0;
                this.triade.playersWhoPlayed = [];
                this.triade.selectedStat = null;
                this.triade.showCenterSlot = false;
                this._pendingTriadeCards = null;
                this._triadeCardsReceived = false;
                this._triadeDealStarted = false;
                this.triade.active = false;
                this.gameEnded = true;
                this.gameInProgress = false;
                
                // Nettoyer le flag de reconnexion
                sessionStorage.removeItem('triadeInProgress');
                sessionStorage.removeItem('triadeState');
                
                this.gameEndData = {
                    winner: data.winner,
                    ranking: data.ranking,
                    gameMode: 'triade'
                };
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
            
            // 🎴 Bloquer si en cooldown
            if (this.joinCooldown) {
                return;
            }
            
            // En mode rivalité, vérifier qu'une équipe est sélectionnée
            if (this.lobbyMode === 'rivalry' && !this.selectedTeam) {
                this.showNotification('Choisissez une équipe !', 'error');
                return;
            }

            // 🆕 Clear le flag kick pour permettre le rejoin
            sessionStorage.removeItem('wasKicked');

            this.socket.emit('join-lobby', {
                twitchId: this.twitchId,
                username: this.username,
                team: this.lobbyMode === 'rivalry' ? this.selectedTeam : null
            });

            // 🎴💣 En mode Triade/BombAnime, attendre confirmation avant d'afficher "rejoint"
            if (this.lobbyMode === 'triade' || this.lobbyMode === 'bombanime') {
                this.triadeJoinPending = true;
                // Confirmer après 400ms si pas d'erreur reçue
                setTimeout(() => {
                    if (this.triadeJoinPending && !this.triadeShakeError) {
                        this.hasJoined = true;
                        this.triadeJoinPending = false;
                        // Sauvegarder dans localStorage seulement après confirmation
                        localStorage.setItem('hasJoinedLobby', 'true');
                        localStorage.setItem('lobbyTwitchId', this.twitchId);
                        this.showNotification('Vous avez rejoint la partie !', 'success');
                    }
                }, 400);
            } else {
                this.hasJoined = true;
                // 🆕 Sauvegarder l'état dans localStorage
                localStorage.setItem('hasJoinedLobby', 'true');
                localStorage.setItem('lobbyTwitchId', this.twitchId);
                if (this.lobbyMode === 'rivalry' && this.selectedTeam) {
                    localStorage.setItem('selectedTeam', this.selectedTeam);
                }
                this.showNotification('Vous avez rejoint le lobby !', 'success');
            }
        },
        
        // Sélectionner une équipe (mode Rivalité)
        selectTeam(team) {
            // Bloquer si déjà dans le lobby
            if (this.hasJoined) return;
            if (this.selectedTeam === team) return;
            
            this.selectedTeam = team;
            
            // Sauvegarder dans localStorage
            localStorage.setItem('selectedTeam', team);
        },
        
        // Sélectionner une équipe ET rejoindre le lobby (nouveau modal V9)
        selectAndJoinTeam(team) {
            // Bloquer si déjà dans le lobby
            if (this.hasJoined) return;
            
            // Sélectionner l'équipe
            this.selectedTeam = team;
            localStorage.setItem('selectedTeam', team);
            
            // Rejoindre automatiquement le lobby
            this.joinLobby();
        },
        
        // Note: Les fonctions de cooldown d'équipe ont été supprimées
        // Le joueur choisit son équipe une seule fois avant de rejoindre

        // ========== Question ==========
        selectAnswer(answerIndex, event) {
            if (this.hasAnswered || this.playerLives === 0) return;

            this.selectedAnswer = answerIndex;

            this.playSound(this.clickSound);

            if (event) this.spawnClickParticles(event);

            this.socket.emit('submit-answer', {
                answer: answerIndex,
                bonusActive: this.activeBonusEffect // 🔥 CHANGÉ : envoie 'shield', 'doublex2', etc.
            });

            console.log(`📤 Réponse envoyée: ${answerIndex}, bonus: ${this.activeBonusEffect}`);
        },

        // Sélection carte FizzBuzz
        selectFizzbuzzCard(cardIndex) {
            if (this.hasAnswered || this.playerLives === 0) return;

            this.selectedAnswer = cardIndex;

            this.playSound(this.clickSound);

            this.socket.emit('submit-answer', {
                answer: cardIndex,
                bonusActive: null // Pas de bonus en mode FizzBuzz
            });

            console.log(`📤 Carte FizzBuzz sélectionnée: ${cardIndex}`);
        },

        startTimer(initialTime = null) {
            // Arrêter tout timer existant d'abord
            this.stopTimer();

            // Utiliser le temps passé en paramètre ou gameTime par défaut
            const remainingTime = initialTime !== null ? initialTime : this.gameTime;
            const totalTime = this.gameTime; // Temps total de la question (pour calculer le %)
            
            this.timeRemaining = remainingTime;
            // Calculer la progression initiale basée sur le temps restant vs temps total
            this.timerProgress = (remainingTime / totalTime) * 100;
            this.timerWarning = remainingTime <= 3;

            // 🆕 Animation fluide avec requestAnimationFrame
            const startTime = Date.now();
            const duration = remainingTime * 1000; // Durée restante en ms

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const remaining = Math.max(0, duration - elapsed);

                // Calculer la progression basée sur le temps TOTAL (pas la durée restante)
                const remainingSeconds = remaining / 1000;
                this.timerProgress = (remainingSeconds / totalTime) * 100;
                this.timeRemaining = Math.ceil(remainingSeconds);
                
                // Warning basé sur le temps réel en ms
                this.timerWarning = remaining <= 3000;

                if (remaining > 0 && this.timerAnimationId) {
                    this.timerAnimationId = requestAnimationFrame(animate);
                } else {
                    this.timerProgress = 0;
                    this.timeRemaining = 0;
                    this.timerWarning = true;
                    this.timerAnimationId = null;
                }
            };

            this.timerAnimationId = requestAnimationFrame(animate);
        },

        stopTimer() {
            if (this.timerAnimationId) {
                cancelAnimationFrame(this.timerAnimationId);
                this.timerAnimationId = null;
            }
            // Garder aussi pour compatibilité si ancien code utilisé
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
            this.playerPoints = 0;

            // Reset le système de combo
            this.resetComboSystem();

            localStorage.removeItem('hasJoinedLobby');
            localStorage.removeItem('lobbyTwitchId');

            // 🆕 Demander l'état actuel du serveur pour rafraîchir le compteur
            this.refreshGameState();
        },

        // 🆕 Ajoute cette nouvelle méthode juste après backToHome()
        async refreshGameState() {
            try {
                const response = await fetch('/game/state');
                const state = await response.json();

                this.isGameActive = state.isActive;
                this.playerCount = state.playerCount;
                this.gameMode = state.mode || 'lives';
                this.gameLives = state.lives || 3;
                this.gameTime = state.questionTime || 10;

                console.log(`🔄 État rafraîchi: ${this.playerCount} joueurs dans le lobby`);
            } catch (error) {
                console.error('Erreur refresh état:', error);
            }
        },

        formatDuration(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        },
        
        // Retour au menu principal après fin de partie BombAnime
        returnToLobby() {
            // Reset l'état BombAnime
            this.bombanime.active = false;
            this.bombanime.playersData = [];
            this.bombanime.currentPlayerTwitchId = null;
            this.bombanime.myAlphabet = [];
            this.bombanime.usedNamesCount = 0;
            this.bombanime.inputValue = '';
            this.bombanime.justAddedLetters = [];
            this.bombanime.heartCompleting = false;
            this.bombanime.heartPulse = false;
            this.bombanime.mobileAlphabetPulse = false;
            this.bombanime.successPlayerTwitchId = null;
            this.bombanime.lifeGainedPlayerTwitchId = null;
            this.bombanime.debugInfo = null;
            this.bombanime.introPhase = null;
            this.bombanime.introPlayersRevealed = 0;
            this.bombanime.bombPointingUp = true; // 🆕 Reset pour la prochaine partie
            
            // Reset l'état global
            this.gameInProgress = false;
            this.gameEnded = false;
            this.gameEndData = null;
            this.hasJoined = false;
            this.lobbyMode = 'classic';
            
            // Supprimer du localStorage et sessionStorage
            localStorage.removeItem('hasJoinedLobby');
            sessionStorage.removeItem('bombanimeInProgress');
            
            console.log('🔙 Retour au menu principal');
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
                        value: 0.5, // 🆕 Augmenté de 0.5 à 0.7
                        random: true,
                        anim: { enable: true, speed: 0.8, opacity_min: 0.3, sync: false } // 🆕 Min à 0.3 au lieu de 0.1
                    },
                    size: {
                        value: 3, // 🆕 Augmenté de 3 à 4
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
            if (!barFill) {
                console.error('❌ Barre combo non trouvée');
                return;
            }

            console.log('🎉 === DEBUT ANIMATION LEVEL-UP ===');

            // 🔥 ÉTAPE 1: BLOQUER le recalcul IMMÉDIATEMENT
            this.isLevelingUp = true;

            // 🔥 ÉTAPE 2: Forcer le border-radius
            barFill.style.borderRadius = '15px';

            // 🔥 ÉTAPE 3: Monter à 100% de manière FLUIDE
            barFill.style.height = '100%';

            this.spawnParticles();

            // 🔥 ÉTAPE 4: Attendre la FIN de la montée (500ms)
            setTimeout(() => {
                console.log('💥 === PIC ATTEINT - EXPLOSION ===');

                barFill.offsetHeight;

                barFill.style.transition = 'opacity 0.5s ease-out';
                barFill.style.opacity = '0';

                // APRÈS le fade (500ms), reset complet
                setTimeout(() => {
                    barFill.style.transition = 'none';
                    barFill.style.height = '0%';
                    barFill.style.minHeight = '';
                    barFill.style.maxHeight = '';
                    barFill.style.borderRadius = '';

                    setTimeout(() => {
                        barFill.style.opacity = '1';
                    }, 500);

                    // Débloquer le système
                    this.isLevelingUp = false;

                    console.log(`📊 Reset complet - Level=${this.comboLevel}, Progress=${this.comboProgress}`);

                    // 🔥 MODIFIÉ: Si niveau MAX, ne pas remonter la jauge
                    if (this.comboLevel < 3) {
                        this.$nextTick(() => {
                            barFill.style.transition = '';
                            const newHeight = this.comboBarHeight;
                            console.log(`📈 Remontée à ${newHeight}%`);
                            barFill.style.height = `${newHeight}%`;
                        });
                    } else {
                        // 🆕 Niveau MAX atteint, jauge reste vide
                        console.log('🎯 Niveau MAX atteint - Jauge reste vide');
                    }
                }, 500);

            }, 500);
        },




        spawnParticles() {
            const container = document.querySelector('.combo-particles-external');
            if (!container) return;

            // 🔥 FIX: Utiliser la VRAIE hauteur actuelle de la barre
            const currentHeight = this.comboBarHeight;

            console.log(`✨ Spawn particules à ${currentHeight}% de hauteur`);

            // 🔥 40 particules pour un effet explosif
            for (let i = 0; i < 40; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';

                // Position horizontale aléatoire
                const randomX = Math.random() * 100;
                particle.style.left = `${randomX}%`;

                // 🔥 FIX: Position verticale ALÉATOIRE sur toute la hauteur actuelle
                const randomHeightInRange = Math.random() * currentHeight;
                particle.style.bottom = `${randomHeightInRange}%`;

                // Dérive horizontale
                const drift = (Math.random() - 0.5) * 60;
                particle.style.setProperty('--drift', `${drift}px`);

                // Délai aléatoire
                particle.style.animationDelay = `${Math.random() * 0.4}s`;

                container.appendChild(particle);

                // Supprimer après animation
                setTimeout(() => particle.remove(), 2000);
            }
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
            return this.currentQuestion &&
                !this.hasAnswered &&
                this.gameInProgress &&
                !this.showResults &&
                this.timeRemaining > 0 &&
                (this.gameMode === 'points' || this.playerLives > 0);
        },

        // 🔥 REFONTE: Utiliser bonusInventory
        useBonus(bonusType) {
            console.log(`🎮 useBonus appelé avec: ${bonusType}`);

            if (!this.bonusInventory[bonusType] || this.bonusInventory[bonusType] <= 0) {
                console.log('⚠️ Bonus non disponible');
                return;
            }

            // Envoyer au serveur
            this.socket.emit('use-bonus', { bonusType });

            // Décrémenter localement
            this.bonusInventory[bonusType]--;

            // Appliquer l'effet
            this.applyBonusEffect(bonusType);

            console.log(`✅ Bonus ${bonusType} utilisé. Reste: ${this.bonusInventory[bonusType]}`);
        },

        applyBonusEffect(bonusType) {
            this.activeBonusEffect = bonusType;

            if (bonusType === '5050') {
                this.apply5050();
            } else if (bonusType === 'reveal') {
                this.applyReveal();
            } else if (bonusType === 'shield') {
                this.applyShield();
            } else if (bonusType === 'doublex2') {
                // 🔥 MODIFIER ICI : Ajouter le pulse doré
                console.log('💰 Points x2 activé pour cette question');
                const hud = document.querySelector('.player-hud');
                if (hud) {
                    hud.classList.add('x2-protected');
                }
            }
        },

        apply5050() {
            if (!this.currentQuestion) return;

            const correctIndex = this.tempCorrectAnswer;

            if (!correctIndex) {
                console.error('❌ Pas de bonne réponse reçue du serveur');
                return;
            }

            const totalAnswers = this.currentQuestion.answers.length;

            console.log(`🎯 Bonus 50/50 - Bonne réponse: ${correctIndex}, Total: ${totalAnswers}`);

            // 🔥 Calculer combien garder visible (50% arrondi au supérieur)
            const toKeepVisible = Math.ceil(totalAnswers / 2);
            // Si 4 réponses → 2 visibles (50%)
            // Si 6 réponses → 3 visibles (50%)

            console.log(`📊 50% de ${totalAnswers} = ${toKeepVisible} réponses à garder`);

            // Toutes les MAUVAISES réponses
            const wrongIndexes = [];
            for (let i = 1; i <= totalAnswers; i++) {
                if (i !== correctIndex) {
                    wrongIndexes.push(i);
                }
            }

            // 🔥 Nombre de mauvaises réponses à GARDER visibles
            const wrongToKeepCount = toKeepVisible - 1; // -1 car la bonne est déjà comptée
            // Si 4 réponses (2 à garder) → 1 mauvaise à garder
            // Si 6 réponses (3 à garder) → 2 mauvaises à garder

            // Mélanger et prendre les N premières
            const shuffledWrong = [...wrongIndexes].sort(() => 0.5 - Math.random());
            const wrongToKeep = shuffledWrong.slice(0, wrongToKeepCount);

            // Toutes les autres seront masquées
            const toHide = wrongIndexes.filter(idx => !wrongToKeep.includes(idx));

            console.log(`✅ Visibles: ${correctIndex} (bonne) + ${wrongToKeep} (mauvaises) = ${toKeepVisible} total`);
            console.log(`🙈 Masquées: ${toHide} = ${toHide.length} réponses`);

            // Appliquer
            setTimeout(() => {
                toHide.forEach(index => {
                    const btn = document.querySelector(`.answer-btn:nth-child(${index})`);
                    if (btn) {
                        btn.classList.add('bonus-5050-hidden');
                        console.log(`   ✅ Réponse ${index} masquée`);
                    }
                });
            }, 100);
        },


        applyReveal() {
            if (!this.currentQuestion) return;

            // 🔥 UTILISER tempCorrectAnswer (envoyé par le serveur)
            const correctIndex = this.tempCorrectAnswer;

            if (!correctIndex) {
                console.error('❌ Pas de bonne réponse reçue du serveur');
                return;
            }

            const totalAnswers = this.currentQuestion.answers.length;

            console.log(`💡 Bonus Révéler - Bonne réponse: ${correctIndex}`);

            // Masquer TOUTES les mauvaises réponses
            setTimeout(() => {
                for (let i = 1; i <= totalAnswers; i++) {
                    const btn = document.querySelector(`.answer-btn:nth-child(${i})`);
                    if (btn) {
                        if (i !== correctIndex) {
                            btn.classList.add('bonus-5050-hidden');
                        }
                    }
                }
            }, 100);

            console.log(`✅ Seule la réponse ${correctIndex} est visible`);
        },

        applyShield() {
            console.log(`🛡️ Bouclier activé ! Protection contre la prochaine perte de vie`);

            // 🔥 Ajouter le pulse SANS timeout (reste jusqu'à la fin)
            const hud = document.querySelector('.player-hud');
            if (hud) {
                hud.classList.add('shield-protected');
            }
        },

        // 🆕 Afficher l'animation Shield
        showShieldAnimation() {
            // Créer un overlay d'effet Shield
            const overlay = document.createElement('div');
            overlay.className = 'shield-overlay-effect';
            document.body.appendChild(overlay);

            // Animation de pulsation
            setTimeout(() => {
                overlay.classList.add('active');
            }, 10);

            // Retirer après 2 secondes
            setTimeout(() => {
                overlay.classList.remove('active');
                setTimeout(() => {
                    document.body.removeChild(overlay);
                }, 500);
            }, 2000);


        },

        resetBonusEffects() {
            // Retirer tous les effets visuels
            document.querySelectorAll('.answer-btn').forEach(btn => {
                btn.classList.remove('bonus-5050-hidden', 'bonus-revealed');
            });

            this.activeBonusEffect = null;

            // Retirer les pulses du HUD
            const hud = document.querySelector('.player-hud');
            if (hud) {
                hud.classList.remove('shield-protected', 'x2-protected'); // 🔥 AJOUTER x2-protected
            }
        },

        // 🔥 REFONTE: Reset avec bonusInventory
        resetComboSystem() {
            this.comboLevel = 0;
            this.comboProgress = 0;
            this.bonusInventory = { '5050': 0, 'reveal': 0, 'shield': 0, 'doublex2': 0 };
            this.activeBonusEffect = null;
            this.showBonusModal = false;
            this.challenges = []; // 🆕 Reset les défis
            this.showChallengesMobile = false; // 🆕 Fermer le modal défis mobile

            console.log('🔄 Système de combo et défis complètement reset');
        },

        // 🆕 Helper pour obtenir le nom d'un bonus
        getBonusName(bonusType) {
            const names = {
                '5050': '50/50',
                'reveal': 'Joker',
                'shield': 'Bouclier',
                'doublex2': 'Points x2'
            };
            return names[bonusType] || bonusType;
        },

        beforeUnmount() {
            if (this.socket) {
                this.socket.disconnect();
            }
            this.stopTimer();
        },


        // 🔥 REFONTE: Déterminer l'état d'un bonus avec bonusInventory
        getBonusState(bonusType) {
            const count = this.bonusInventory[bonusType] || 0;
            
            if (count > 0) {
                return 'available';
            }

            return 'locked';
        },

        // 🔥 REFONTE: Utiliser un bonus depuis une bandelette
        useBonusStrip(bonusType) {
            if (!this.canUseBonus()) {
                console.log('⚠️ Impossible d\'utiliser un bonus maintenant');
                return;
            }

            if (!this.bonusInventory[bonusType] || this.bonusInventory[bonusType] <= 0) {
                console.log('⚠️ Bonus non disponible');
                return;
            }

            this.showBonusMenu = false;
            this.useBonus(bonusType);

            // 🔥 NOUVEAU: Activer immédiatement l'effet Shield
            if (bonusType === 'shield') {
                this.activeBonusEffect = 'shield';
                console.log('✅ Shield activé, effet appliqué');
            }
        },


        confettiStyle(index) {
            const colors = ['#FFD700', '#FFA500', '#FF8C00', '#00ff88', '#3b82f6'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            const randomX = Math.random() * 100;
            const randomDelay = Math.random() * 2;
            const randomDuration = 2 + Math.random() * 2;

            return {
                left: randomX + '%',
                backgroundColor: randomColor,
                animationDelay: randomDelay + 's',
                animationDuration: randomDuration + 's'
            };
        },

        // 🆕 Initialiser les animations du podium winner
        initWinnerAnimations() {
            // Créer les particules de fond
            const particlesContainer = document.getElementById('winnerParticles');
            if (particlesContainer) {
                particlesContainer.innerHTML = '';
                for (let i = 0; i < 40; i++) {
                    const p = document.createElement('div');
                    p.className = 'winner-particle' + (Math.random() > 0.6 ? ' accent' : '');
                    p.style.left = Math.random() * 100 + '%';
                    p.style.animationDelay = Math.random() * 12 + 's';
                    p.style.animationDuration = (10 + Math.random() * 5) + 's';
                    p.style.width = (2 + Math.random() * 3) + 'px';
                    p.style.height = p.style.width;
                    particlesContainer.appendChild(p);
                }
            }

            // Démarrer les explosions aléatoires
            this.startRandomExplosions();

            // Burst de particules pour le winner
            setTimeout(() => {
                this.createWinnerBurst();
            }, 3200);
        },

        startRandomExplosions() {
            const container = document.getElementById('bgExplosions');
            if (!container) return;

            const createExplosion = () => {
                const explosion = document.createElement('div');
                explosion.className = 'bg-explosion';
                explosion.style.left = (10 + Math.random() * 80) + '%';
                explosion.style.top = (10 + Math.random() * 80) + '%';
                container.appendChild(explosion);

                const colors = ['#FFD700', '#F0C850', '#6366F1', '#8B5CF6', '#FFE55C'];
                const particleCount = 8 + Math.floor(Math.random() * 8);

                for (let i = 0; i < particleCount; i++) {
                    const particle = document.createElement('div');
                    particle.className = 'bg-explosion-particle';
                    const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.5;
                    const distance = 40 + Math.random() * 60;
                    particle.style.setProperty('--ex', Math.cos(angle) * distance + 'px');
                    particle.style.setProperty('--ey', Math.sin(angle) * distance + 'px');
                    particle.style.background = colors[Math.floor(Math.random() * colors.length)];
                    particle.style.width = (2 + Math.random() * 4) + 'px';
                    particle.style.height = particle.style.width;
                    particle.style.animationDelay = (Math.random() * 0.1) + 's';
                    explosion.appendChild(particle);
                }

                setTimeout(() => explosion.remove(), 2000);
            };

            // Créer des explosions périodiques
            const scheduleExplosion = () => {
                if (!this.gameEnded) return;
                createExplosion();
                setTimeout(scheduleExplosion, 1500 + Math.random() * 2500);
            };

            setTimeout(scheduleExplosion, 500);
        },

        createWinnerBurst() {
            const burstContainer = document.getElementById('winnerBurst');
            if (!burstContainer) return;

            const colors = ['#FFD700', '#FFF8DC', '#F0C850', '#FFE55C', '#FFFFFF'];
            for (let i = 0; i < 25; i++) {
                const particle = document.createElement('div');
                particle.className = 'winner-burst-particle';
                const angle = (i / 25) * Math.PI * 2;
                const distance = 100 + Math.random() * 80;
                particle.style.setProperty('--tx', Math.cos(angle) * distance + 'px');
                particle.style.setProperty('--ty', Math.sin(angle) * distance + 'px');
                particle.style.background = colors[Math.floor(Math.random() * colors.length)];
                particle.style.width = (4 + Math.random() * 5) + 'px';
                particle.style.height = particle.style.width;
                particle.style.animationDelay = (Math.random() * 0.2) + 's';
                burstContainer.appendChild(particle);
            }
        },


        toggleBonusArcMobile() {
            if (!this.canUseBonus()) return;
            this.showBonusArcMobile = !this.showBonusArcMobile;
        },

        closeBonusArcMobile() {
            this.showBonusArcMobile = false;
        },

        // 🔥 REFONTE: Utiliser bonusInventory
        useBonusArcMobile(bonusType) {
            if (!this.canUseBonus() || !this.bonusInventory[bonusType] || this.bonusInventory[bonusType] <= 0) return;
            this.showBonusArcMobile = false;
            this.useBonus(bonusType);
        },

        // 🆕 Particules mobiles après bonne réponse
        spawnParticlesMobile() {
            const container = document.querySelector('.gauge-particles-mobile');
            if (!container) return;

            for (let i = 0; i < 20; i++) {
                const particle = document.createElement('div');
                particle.className = 'gauge-particle-mobile';

                const angle = Math.random() * 360;
                const distance = 30 + Math.random() * 20;
                const x = Math.cos(angle * Math.PI / 180) * distance;
                const y = Math.sin(angle * Math.PI / 180) * distance;

                particle.style.setProperty('--x', `${x}px`);
                particle.style.setProperty('--y', `${y}px`);
                particle.style.left = '50%';
                particle.style.top = '50%';

                container.appendChild(particle);

                setTimeout(() => particle.remove(), 1000);
            }
        },

        spawnClickParticles(event) {
            const x = event.clientX;
            const y = event.clientY;

            const particleCount = 12;

            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.className = 'click-particle';

                // Direction complètement aléatoire
                const angle = Math.random() * Math.PI * 2;
                const distance = 80 + Math.random() * 120; // 🔥 Très loin : 80-200px
                const offsetX = Math.cos(angle) * distance;
                const offsetY = Math.sin(angle) * distance;

                // Taille aléatoire
                const size = 4 + Math.random() * 6;

                // Position de départ éparpillée
                const startOffsetX = (Math.random() - 0.5) * 40;
                const startOffsetY = (Math.random() - 0.5) * 20;

                particle.style.left = (x + startOffsetX) + 'px';
                particle.style.top = (y + startOffsetY) + 'px';
                particle.style.width = size + 'px';
                particle.style.height = size + 'px';
                particle.style.setProperty('--x', offsetX + 'px');
                particle.style.setProperty('--y', offsetY + 'px');

                // 🔥 Durée plus longue : 0.7s à 1.1s
                const duration = 0.7 + Math.random() * 0.4;
                particle.style.animationDuration = duration + 's';

                document.body.appendChild(particle);

                setTimeout(() => {
                    particle.remove();
                }, duration * 1000);
            }
        },

        initSounds() {
            this.clickSound = new Audio('click.mp3');
            this.clickSound.volume = 0.5;
            
            // 💣 Sons BombAnime (placés dans src/sound/)
            this.sounds = {
                bombanimePass: this.createPreloadedSound('slash3.mp3'),
                bombanimeWrong: this.createPreloadedSound('wrong.mp3'),
                bombanimeUsed: this.createPreloadedSound('lock1.mp3'),
                bombanimeExplosion: this.createPreloadedSound('explode.mp3'),
            };
        },
        
        // Créer un son préchargé pour réduire la latence
        createPreloadedSound(src, volume = 0.5) {
            const sound = new Audio(src);
            sound.volume = volume;
            sound.preload = 'auto';
            // Forcer le chargement en mémoire
            sound.load();
            return sound;
        },

        playSound(sound) {
            if (!sound || this.soundMuted) return;
            
            // Cloner le son pour éviter le délai de reset si déjà en lecture
            const clone = sound.cloneNode();
            const maxVol = this.lobbyMode === 'bombanime' ? 0.45 : 0.7;
            clone.volume = (this.soundVolume / 100) * maxVol;
            clone.play().catch(e => console.log('Audio blocked:', e));
        },
        
        toggleSound() {
            this.soundMuted = !this.soundMuted;
            localStorage.setItem('soundMuted', this.soundMuted);
        },
        
        setSoundVolume(value) {
            this.soundVolume = parseInt(value);
            localStorage.setItem('soundVolume', this.soundVolume);
        },
        
        // 📱 Gestion du responsive
        handleResize() {
            this.isMobile = window.innerWidth <= 768;
            // Fermer l'alphabet mobile si on passe en desktop
            if (!this.isMobile) {
                this.isMobileAlphabetOpen = false;
            }
            // Force re-render pour recalculer les tailles
            this.$forceUpdate();
        },
        
        toggleMobileAlphabet() {
            this.isMobileAlphabetOpen = !this.isMobileAlphabetOpen;
        },

        // ============================================
        // 💣 BOMBANIME - Méthodes
        // ============================================
        
        startBombanimeTimer() {
            // Arrêter le timer précédent
            if (this.bombanime.timerInterval) {
                clearInterval(this.bombanime.timerInterval);
            }
            if (this.bombanime.debugMsInterval) {
                clearInterval(this.bombanime.debugMsInterval);
            }
            
            // 🆕 Timer en millisecondes PRÉCIS avec Date.now()
            const startTime = Date.now();
            const totalMs = this.bombanime.timeRemaining * 1000;
            this.bombanime.debugMs = totalMs;
            
            this.bombanime.debugMsInterval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                this.bombanime.debugMs = Math.max(0, totalMs - elapsed);
            }, 50); // 50ms suffit pour un affichage fluide
            
            this.bombanime.timerInterval = setInterval(() => {
                this.bombanime.timeRemaining--;
                if (this.bombanime.timeRemaining <= 0) {
                    clearInterval(this.bombanime.timerInterval);
                    clearInterval(this.bombanime.debugMsInterval);
                    this.bombanime.debugMs = 0;
                    
                    // 🆕 Désactiver immédiatement l'input quand le timer atteint 0
                    if (this.bombanime.isMyTurn) {
                        this.bombanime.isMyTurn = false;
                        this.bombanime.inputValue = '';
                        // Défocuser l'input
                        const input = document.getElementById('bombanimeInput');
                        if (input) input.blur();
                    }
                }
            }, 1000);
        },
        
        // Émettre ce que le joueur tape en temps réel
        emitTyping() {
            if (!this.bombanime.isMyTurn) return;
            
            // Mettre à jour localement aussi pour que le joueur voie sa propre frappe
            const myPlayer = this.bombanime.playersData.find(p => p.twitchId === this.twitchId);
            if (myPlayer) {
                myPlayer.currentTyping = this.bombanime.inputValue.toUpperCase();
                this.$forceUpdate();
            }
            
            // Envoyer aux autres joueurs
            this.socket.emit('bombanime-typing', {
                text: this.bombanime.inputValue.toUpperCase()
            });
        },
        
        submitBombanimeName() {
            if (!this.bombanime.isMyTurn) return;
            if (!this.bombanime.inputValue.trim()) return;
            
            // DEBUG: Afficher le temps local restant au moment de la soumission
            const localTimeRemaining = this.bombanime.timeRemaining.toFixed(2);
            this.bombanime.debugInfo = `📤 Envoi à ${localTimeRemaining}s (local)...`;
            console.log(`🔍 DEBUG: Soumission à ${localTimeRemaining}s restants (local)`);
            
            this.socket.emit('bombanime-submit-name', {
                name: this.bombanime.inputValue.trim().toUpperCase()
            });
        },
        
        // 🎯 Utiliser le bonus "Perso Gratuit"
        useBombanimeFreeCharacter() {
            if (!this.bombanime.isMyTurn) {
                this.showNotification('❌ Ce n\'est pas ton tour !', 'error');
                return;
            }
            if (!this.bombanime.bonuses || this.bombanime.bonuses.freeCharacter <= 0) {
                this.showNotification('❌ Tu n\'as pas ce bonus !', 'error');
                return;
            }
            
            console.log('🎁 Utilisation bonus Perso Gratuit');
            this.socket.emit('bombanime-use-free-character');
        },
        
        // 🎯 Utiliser le bonus "Vie Extra"
        useBombanimeExtraLife() {
            if (!this.bombanime.bonuses || this.bombanime.bonuses.extraLife <= 0) {
                this.showNotification('❌ Tu n\'as pas ce bonus !', 'error');
                return;
            }
            
            console.log('❤️ Utilisation bonus Vie Extra');
            this.socket.emit('bombanime-use-extra-life');
        },
        
        // 🎯 Toggle modal défis (mobile)
        toggleBombanimeChallengesModal() {
            this.bombanime.showChallengesModal = !this.bombanime.showChallengesModal;
            this.bombanime.showBonusesModal = false; // Fermer l'autre
        },
        
        // 🎯 Toggle modal bonus (mobile)
        toggleBombanimeBonusesModal() {
            this.bombanime.showBonusesModal = !this.bombanime.showBonusesModal;
            this.bombanime.showChallengesModal = false; // Fermer l'autre
        },
        
        // 🎯 Vérifier si le joueur a des bonus BombAnime disponibles
        hasBombanimeBonuses() {
            return this.bombanime.bonuses && 
                   (this.bombanime.bonuses.freeCharacter > 0 || this.bombanime.bonuses.extraLife > 0);
        },
        
        // 🎯 Obtenir le total des bonus BombAnime
        getTotalBombanimeBonuses() {
            if (!this.bombanime.bonuses) return 0;
            return (this.bombanime.bonuses.freeCharacter || 0) + (this.bombanime.bonuses.extraLife || 0);
        },
        
        // Obtenir ma position dans le cercle
        getBombanimeMyPosition() {
            return this.bombanime.playersOrder.indexOf(this.twitchId);
        },
        
        // Calculer la taille du cercle selon le nombre de joueurs
        getBombanimeCircleSize() {
            const playerCount = this.bombanime.playersData.length;
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            
            // Mobile portrait - cercle plus grand pour espacer les joueurs
            if (screenWidth <= 480) {
                const baseSize = 280;
                const perPlayer = 18;
                return Math.min(screenWidth - 40, baseSize + (playerCount * perPlayer));
            }
            // Mobile paysage / petite tablette
            if (screenWidth <= 768 || screenHeight <= 500) {
                const baseSize = 320;
                const perPlayer = 20;
                return Math.min(screenWidth - 60, baseSize + (playerCount * perPlayer));
            }
            // Tablette
            if (screenWidth <= 1024) {
                const baseSize = 420;
                const perPlayer = 18;
                return baseSize + (playerCount * perPlayer);
            }
            // Desktop (actuel)
            const baseSize = 500;
            const perPlayer = 22;
            const size = baseSize + (playerCount * perPlayer);
            
            // 2K+ : agrandir proportionnellement
            if (screenWidth >= 2560) {
                return Math.round(size * 1.3);
            }
            return size;
        },
        
        // Calculer la taille de la bombe selon le nombre de joueurs
        getBombSize() {
            const total = this.bombanime.playersData.length;
            const screenWidth = window.innerWidth;
            
            // Mobile - plus petit
            if (screenWidth <= 480) {
                return Math.min(42, Math.max(32, 28 + (total * 1)));
            }
            // Tablette
            if (screenWidth <= 768) {
                return Math.min(55, Math.max(42, 36 + (total * 1.3)));
            }
            // Desktop
            const size = Math.min(70, Math.max(58, 48 + (total * 1.7)));
            // 2K+
            if (screenWidth >= 2560) {
                return Math.round(size * 1.25);
            }
            return size;
        },
        
        // Calculer le style de position d'un joueur
        getBombanimePlayerStyle(index, total) {
            const circleSize = this.getBombanimeCircleSize();
            const hexSize = this.getBombanimeHexSize();
            const centerX = circleSize / 2;
            const centerY = circleSize / 2;
            
            // Radius = rayon du cercle moins la moitié de l'hexagone pour que les joueurs soient à l'intérieur
            // On utilise un pourcentage fixe du cercle pour garantir un vrai cercle
            const radius = (circleSize / 2) - (hexSize / 2) - 10;
            
            // Vrai cercle complet avec décalage pour éviter joueur pile en bas
            // Offset d'un demi-segment pour décaler tous les joueurs
            const offsetAngle = Math.PI / total;
            // -90° pour commencer en haut, + offset pour décaler
            const angle = ((index / total) * 2 * Math.PI) - (Math.PI / 2) + offsetAngle;
            
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            
            return {
                left: x + 'px',
                top: y + 'px'
            };
        },
        
        // Déterminer si le texte de réponse doit être au-dessus (pour éviter chevauchements)
        isAnswerAbove(index, total) {
            // Pas utilisé pour l'instant, toujours en dessous
            return false;
        },
        
        // Calculer la taille de l'hexagone selon le nombre de joueurs
        getBombanimeHexSize() {
            const playerCount = this.bombanime.playersData.length;
            const screenWidth = window.innerWidth;
            
            // Mobile - plus petit pour laisser de l'espace
            if (screenWidth <= 480) {
                const baseSize = 48;
                const reduction = 1.8;
                return Math.max(30, baseSize - (playerCount * reduction));
            }
            // Tablette
            if (screenWidth <= 768) {
                const baseSize = 65;
                const reduction = 2.2;
                return Math.max(40, baseSize - (playerCount * reduction));
            }
            // Desktop
            const baseSize = 105;
            const reduction = 3.5;
            const size = Math.max(58, baseSize - (playerCount * reduction));
            // 2K+
            if (screenWidth >= 2560) {
                return Math.round(size * 1.25);
            }
            return size;
        },
        
        // Calculer la taille de la police des réponses selon le nombre de joueurs
        getAnswerFontSize() {
            const total = this.bombanime.playersData.length;
            const screenWidth = window.innerWidth;
            
            // Mobile
            if (screenWidth <= 480) {
                return Math.max(0.55, 0.85 - (total * 0.025)) + 'rem';
            }
            // Tablette
            if (screenWidth <= 768) {
                return Math.max(0.65, 1.0 - (total * 0.03)) + 'rem';
            }
            // Desktop
            const size = Math.max(0.75, 1.2 - (total * 0.035));
            // 2K+
            if (screenWidth >= 2560) {
                return (size * 1.25) + 'rem';
            }
            return size + 'rem';
        },
        
        // Calculer l'angle de la mèche de la bombe
        getBombFuseAngle() {
            // Si bombPointingUp est true, la bombe pointe vers le haut (0°)
            if (this.bombanime.bombPointingUp) {
                return 0;
            }
            
            const currentIndex = this.bombanime.playersData.findIndex(
                p => p.twitchId === this.bombanime.currentPlayerTwitchId
            );
            if (currentIndex === -1) {
                return 0;
            }
            
            const total = this.bombanime.playersData.length;
            
            // Même calcul que getBombanimePlayerStyle
            const offsetAngle = Math.PI / total;
            const angle = ((currentIndex / total) * 2 * Math.PI) - (Math.PI / 2) + offsetAngle;
            
            // Convertir en degrés pour CSS (0° = haut en CSS)
            return (angle * 180 / Math.PI) + 90;
        },
        
        // Calculer la position d'un joueur dans le cercle (en degrés)
        getBombanimePlayerAngle(index, total) {
            const offsetAngle = 180 / total;
            return ((index / total) * 360) - 90 + offsetAngle;
        },
        
        // Vérifier si une lettre est dans mon alphabet
        hasLetter(letter) {
            return this.bombanime.myAlphabet.includes(letter);
        },
        
        // Obtenir le message d'erreur formaté
        getBombanimeErrorMessage() {
            const messages = {
                'character_not_found': 'Personnage inconnu',
                'already_used': 'Déjà utilisé !',
                'not_your_turn': 'Ce n\'est pas ton tour',
                'invalid_input': 'Entrée invalide'
            };
            return messages[this.bombanime.lastError] || this.bombanime.lastError;
        },
        
        // Formater le nom de la série pour l'affichage (JujutsuKaisen -> Jujutsu Kaisen)
        getFormattedSerieName() {
            const serieNames = {
                'Naruto': 'Naruto',
                'OnePiece': 'One Piece',
                'Dbz': 'Dragon Ball',
                'Mha': 'My Hero Academia',
                'Bleach': 'Bleach',
                'Jojo': 'Jojo',
                'Hxh': 'Hunter x Hunter',
                'FairyTail': 'Fairy Tail',
                'Pokemon': 'Pokémon',
                'Snk': 'Attack on Titan',
                'DemonSlayer': 'Demon Slayer',
                'JujutsuKaisen': 'Jujutsu Kaisen',
                'Reborn': 'Reborn',
                'DeathNote': 'Death Note'
            };
            return serieNames[this.bombanime.serie] || this.bombanime.serie;
        },
        
        // Obtenir les données d'un joueur par twitchId
        getBombanimePlayer(twitchId) {
            return this.bombanime.playersData.find(p => p.twitchId === twitchId);
        },
        
        // Calculer le pourcentage de remplissage du cœur alphabet
        getAlphabetHeartFill() {
            return (this.bombanime.myAlphabet.length / 26) * 100;
        },

        // ============================================
        // TRIADE METHODS
        // ============================================
        
        // Calculer la position d'un siège Triade
        getTriadeSeatPosition(index, totalPlayers) {
            const radiusX = 42;
            const radiusY = 38;
            const centerX = 50;
            const centerY = 50;
            const startAngle = 90; // Bottom position for "me"
            
            const angle = startAngle + (index * 360 / totalPlayers);
            const angleRad = angle * Math.PI / 180;
            
            const x = centerX + radiusX * Math.cos(angleRad);
            const y = centerY + radiusY * Math.sin(angleRad);
            
            const scaleByPlayers = {
                2: 1.35, 3: 1.3, 4: 1.25, 5: 1.3, 6: 1.25, 7: 1.2, 8: 1.15, 9: 1.1, 10: 1.05
            };
            const scale = scaleByPlayers[totalPlayers] || 1;
            
            return {
                left: `${x}%`,
                top: `${y}%`,
                transform: `translate(-50%, -50%) scale(${scale})`
            };
        },
        
        // Icônes des classes
        getClassIcon(cardClass) {
            const icons = {
                assaut: '<svg viewBox="0 0 24 24"><path d="M6.92 5H5L14 14L15 13.06L6.92 5M19.06 3C18.44 3 17.82 3.24 17.35 3.71L13.71 7.35L16.65 10.29L20.29 6.65C21.24 5.7 21.24 4.14 20.29 3.19C19.82 2.72 19.44 3 19.06 3M7.06 18.34L9.06 16.34L7.66 14.94L5.66 16.94C5.16 17.44 5.16 18.25 5.66 18.75C6.16 19.25 6.97 19.25 7.47 18.75L7.06 18.34Z"/></svg>',
                oracle: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
                mirage: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>'
            };
            return icons[cardClass] || '';
        },
        
        // Image de la carte (nom du personnage en minuscule + .png)
        getFusedSparkStyle(n, total) {
            const colors = ['#ffd700','#ff6b35','#fff','#ffaa00','#ff4500'];
            const a = ((n-1) / total) * Math.PI * 2;
            const r = 45 + Math.random() * 35;
            const w = 2 + Math.random() * 3;
            return {
                left: '50%', top: '50%',
                width: w + 'px', height: w + 'px',
                background: colors[(n-1) % colors.length],
                '--sx': (Math.random() - 0.5) * 12 + 'px',
                '--sy': Math.random() * 6 + 'px',
                '--mx': Math.cos(a) * r * 0.5 + 'px',
                '--my': (Math.sin(a) * r * 0.5 - 6) + 'px',
                '--ex': Math.cos(a) * r + 'px',
                '--ey': (Math.sin(a) * r - 12) + 'px',
                '--dur': (1.2 + Math.random() * 1.8) + 's',
                '--delay': (Math.random() * 2.5) + 's'
            };
        },
        getCardImage(card) {
            if (!card || !card.name) return '';
            return `${card.name.toLowerCase().replace(/\s+/g, '')}.png`;
        },
        
        // Formater un nom camelCase en ajoutant des espaces
        // "AllMight" → "All Might", "MyHeroAcademia" → "My Hero Academia"
        formatName(name) {
            if (!name) return '';
            // Exceptions à ne pas splitter
            const exceptions = { 'JoJo': 'JoJo', 'Jojo': 'JoJo', 'DragonBallZ': 'Dragon Ball' };
            if (exceptions[name]) return exceptions[name];
            return name
                .replace(/([a-z])([A-Z])/g, '$1 $2')   // camelCase → spaces
                .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2'); // ABCDef → ABC Def
        },

        // Vérifier si une carte bénéficie du bonus même anime (2+ cartes du même anime en main)
        hasSameAnimeBonus(card) {
            if (!card || !card.anime || !this.triade.myCards) return false;
            const count = this.triade.myCards.filter(c => c && c.anime === card.anime).length;
            return count >= 2;
        },
        
        // Afficher le preview d'une carte
        showCardPreview(card, event) {
            if (!card) return;
            // Ne pas afficher si la carte est encore en pre-deal ou dealing
            if (event && event.target) {
                const cardEl = event.target.closest('.triade-card');
                if (cardEl && (cardEl.classList.contains('pre-deal') || cardEl.classList.contains('dealing'))) return;
            }
            this.triade.previewCard = card;
            this.triade.previewCardDisplay = card;
            this.triade.previewVisible = true;
        },
        
        // Masquer le preview avec animation
        hideCardPreview() {
            this.triade.previewCard = null;
            this.triade.previewVisible = false;
            // Garder le contenu visible pendant l'animation de sortie
            setTimeout(() => {
                if (!this.triade.previewVisible) {
                    this.triade.previewCardDisplay = null;
                }
            }, 300);
        },
        
        // Position d'un joueur sur la table Triade (POV toujours en bas)
        // Réordonner les joueurs en cercle : commence par le joueur APRÈS le POV (sens horaire)
        getOrderedOtherPlayers(playersData, mapFn) {
            if (!playersData || !playersData.length) return [];
            const myIndex = playersData.findIndex(p => p.twitchId === this.twitchId);
            if (myIndex === -1) {
                const filtered = playersData.filter(p => p.twitchId !== this.twitchId);
                return mapFn ? filtered.map(mapFn) : filtered;
            }
            const total = playersData.length;
            const ordered = [];
            for (let i = 1; i < total; i++) {
                const idx = (myIndex + i) % total;
                const p = playersData[idx];
                ordered.push(mapFn ? mapFn(p) : p);
            }
            return ordered;
        },
        
        getTriadePlayerStyle(index, totalOthers) {
            // Distribution circulaire complète comme le prototype V6
            // POV est à 90° (bottom), les autres sont répartis sur le cercle complet
            const totalPlayers = totalOthers + 1; // +1 pour le POV
            const radiusX = 50;
            const radiusY = 50;
            const centerX = 50;
            const centerY = 50;
            
            // POV = seat 0 à 90° (bottom), les autres suivent dans le sens horaire
            // index 0 = seat 1, index 1 = seat 2, etc.
            const startAngle = 90; // Bottom = POV
            const seatIndex = index + 1; // Les autres joueurs commencent à seat 1
            const angle = startAngle + (seatIndex * 360 / totalPlayers);
            const angleRad = angle * Math.PI / 180;
            
            const x = centerX + radiusX * Math.cos(angleRad);
            const y = centerY + radiusY * Math.sin(angleRad);
            
            // Scale identique au prototype V6
            const scaleByCount = {
                2: 1.35, 3: 1.3, 4: 1.25, 5: 1.3, 6: 1.25,
                7: 1.2, 8: 1.15, 9: 1.1, 10: 1.05
            };
            const scale = scaleByCount[totalPlayers] || 1.0;
            
            return {
                left: `${x}%`,
                top: `${y}%`,
                transform: `translate(-50%, -50%) scale(${scale})`
            };
        },
        
        // Animation de distribution des cartes
        dealTriadeCards() {
            const allSeats = document.querySelectorAll('.triade-player-seat:not(.hidden)');
            
            // Préparer les cartes adverses (cacher via DOM)
            allSeats.forEach(seat => {
                const isMe = seat.classList.contains('me');
                if (isMe) return; // Les cartes POV ne sont pas encore rendues
                
                const cards = seat.querySelectorAll('.triade-player-card-small');
                cards.forEach(card => {
                    card.classList.remove('dealing', 'dealt');
                    card.classList.add('pre-deal');
                    
                    const rect = card.getBoundingClientRect();
                    const centerX = window.innerWidth / 2;
                    const centerY = window.innerHeight / 2;
                    const fromX = centerX - rect.left - rect.width / 2;
                    const fromY = centerY - rect.top - rect.height / 2;
                    card.style.setProperty('--deal-from-x', fromX + 'px');
                    card.style.setProperty('--deal-from-y', fromY + 'px');
                    const cardIndex = Array.from(card.parentElement.children).indexOf(card);
                    const rotations = ['-10deg', '0deg', '10deg'];
                    card.style.setProperty('--card-rotation', rotations[cardIndex] || '0deg');
                });
            });
            
            // Distribution joueur par joueur
            setTimeout(() => {
                let seatDelay = 0;
                const delayPerSeat = 250;
                const delayBetweenCards = 80;
                let totalDealEnd = 0; // Tracker la fin de la dernière carte
                
                allSeats.forEach((seat) => {
                    const isMe = seat.classList.contains('me');
                    
                    if (isMe) {
                        // Cartes POV : injecter les données Vue à ce moment
                        // puis immédiatement cacher + animer
                        const myDelay = seatDelay;
                        const myDealEnd = myDelay + 2 * 120 + 350; // Dernière carte POV
                        if (myDealEnd > totalDealEnd) totalDealEnd = myDealEnd;
                        setTimeout(() => {
                            if (this._pendingTriadeCards) {
                                this.triade.myCards = this._pendingTriadeCards.filter(c => c != null);
                                this._pendingTriadeCards = null;
                                this.saveTriadeState();
                            }
                            // Attendre que Vue ait rendu les cartes
                            this.$nextTick(() => {
                                const myCards = seat.querySelectorAll('.triade-my-cards .triade-card');
                                myCards.forEach(card => {
                                    card.classList.add('pre-deal');
                                });
                                // Petit délai pour que pre-deal s'applique
                                requestAnimationFrame(() => {
                                    requestAnimationFrame(() => {
                                        myCards.forEach((card, cardIndex) => {
                                            setTimeout(() => {
                                                card.classList.remove('pre-deal');
                                                card.classList.add('dealing');
                                                setTimeout(() => {
                                                    card.classList.remove('dealing');
                                                    card.classList.add('dealt');
                                                }, 350);
                                            }, cardIndex * 120);
                                        });
                                    });
                                });
                            });
                        }, myDelay);
                    } else {
                        // Cartes adverses : animation DOM classique
                        const cards = seat.querySelectorAll('.triade-player-card-small');
                        const seatEnd = seatDelay + Math.max(0, (cards.length - 1)) * delayBetweenCards + 350;
                        if (seatEnd > totalDealEnd) totalDealEnd = seatEnd;
                        cards.forEach((card, cardIndex) => {
                            setTimeout(() => {
                                card.classList.remove('pre-deal');
                                card.classList.add('dealing');
                                setTimeout(() => {
                                    card.classList.remove('dealing');
                                    card.classList.add('dealt');
                                }, 350);
                            }, seatDelay + (cardIndex * delayBetweenCards));
                        });
                    }
                    
                    seatDelay += delayPerSeat;
                });
                
                // 🎲 Déclencher l'overlay round PILE à la fin du deal + 400ms de respiration
                if (this._triadeRound1) {
                    const r = this._triadeRound1;
                    setTimeout(() => {
                        if (this.showTriadeRoundOverlay) {
                            this.showTriadeRoundOverlay(r.round, r.stat, r.statName);
                        }
                        this._triadeRound1 = null;
                    }, totalDealEnd + 400);
                }
            }, 100);
        },
        
        // Initialiser Triade quand on reçoit les données
        initTriade(data) {
            console.log('🎴 Init Triade:', data);
            
            this.triade.active = true;
            this.triade.reconnecting = false;
            this.triade.showCenterSlot = false;
            this.triade.cardPlayed = false;
            this.triade.playedCardData = null;
            this.triade.timerExpired = false;
            this.triade.timer = 0;
            this.triade.selectedStat = null;
            this.triade.draggingCardIndex = null;
            this.triade.dropZoneActive = false;
            this.triade.playersWhoPlayed = [];
            this.stopTriadeTimer();
            this.triade.myCards = [];  // Reset cartes POV (seront injectées par dealTriadeCards)
            this._pendingTriadeCards = null;
            this._triadeCardsReceived = false;
            this._triadeDealStarted = false;
            
            // Séparer mes données des autres joueurs
            const allPlayers = data.playersData || [];
            this.triade.playersData = allPlayers;
            
            // Trouver mes données
            const myPlayer = allPlayers.find(p => p.twitchId === this.twitchId);
            if (myPlayer) {
                this.triade.myData = {
                    wins: myPlayer.wins || 0
                };
            }
            
            // Les autres joueurs - ordonnés en sens horaire à partir du joueur après moi
            this.triade.otherPlayers = this.getOrderedOtherPlayers(allPlayers, p => ({
                    ...p,
                    wins: p.wins || 0,
                    isCurrentPlayer: p.isCurrentPlayer || false
                }));
            
            // Sauvegarder l'état complet dans sessionStorage
            this.saveTriadeState();
        },
        
        // Sauvegarder l'état Triade dans sessionStorage
        saveTriadeState() {
            try {
                const state = {
                    myCards: this.triade.myCards,
                    myData: this.triade.myData,
                    otherPlayers: this.triade.otherPlayers,
                    playersData: this.triade.playersData,
                    selectedStat: this.triade.selectedStat,
                    cardPlayed: this.triade.cardPlayed || false,
                    playedCardData: this.triade.playedCardData || null,
                    timerExpired: this.triade.timerExpired || false
                };
                sessionStorage.setItem('triadeInProgress', 'true');
                sessionStorage.setItem('triadeState', JSON.stringify(state));
            } catch (e) {
                console.warn('🎴 Erreur sauvegarde état Triade:', e);
            }
        },
        
        // Restaurer l'état Triade depuis sessionStorage (instantané)
        restoreTriadeState() {
            try {
                const raw = sessionStorage.getItem('triadeState');
                if (!raw) return false;
                
                const state = JSON.parse(raw);
                
                this.triade.myCards = (state.myCards || []).filter(c => c != null);
                this.triade.myData = state.myData || { wins: 0 };
                this.triade.otherPlayers = state.otherPlayers || [];
                this.triade.playersData = state.playersData || [];
                this.triade.reconnecting = false;
                
                // Restaurer stat + slot
                if (state.selectedStat) {
                    this.triade.selectedStat = state.selectedStat;
                    this.triade.showCenterSlot = true;
                }
                
                // Restaurer carte jouée
                if (state.cardPlayed && state.playedCardData) {
                    this.triade.cardPlayed = true;
                    this.$set(this.triade, 'playedCardData', state.playedCardData);
                }
                
                console.log('🎴 État Triade restauré depuis sessionStorage');
                return true;
            } catch (e) {
                console.warn('🎴 Erreur restauration état Triade:', e);
                return false;
            }
        },
        
        // 🆕 Afficher l'overlay d'annonce de round avec clash de cartes
        showTriadeRoundOverlay(round, stat, statName) {
            this.triade.currentRound = round;
            this.triade.selectedStat = stat;
            // Reset du round
            this.triade.cardPlayed = false;
            this.triade.playedCardData = null;
            this.triade.draggingCardIndex = null;
            this.triade.dropZoneActive = false;
            this.triade.timerExpired = false;
            this.triade.playersWhoPlayed = [];
            this.stopTriadeTimer();
            
            // NE PAS montrer le slot tout de suite — il apparaîtra après l'animation
            this.triade.showCenterSlot = false;
            
            const fullStatNames = { atk: 'Attaque', int: 'Intelligence', spd: 'Vitesse', pwr: 'Pouvoir' };
            const statIcons = {
                atk: '<img src="attack.png" alt="ATK">',
                int: '<img src="int.png" alt="INT">',
                spd: '<img src="speed.png" alt="VIT">',
                pwr: '<img src="power3.png" alt="POW">'
            };
            
            // Créer l'overlay
            const overlay = document.createElement('div');
            overlay.className = 'triade-round-overlay';
            overlay.innerHTML = `
                <div class="tro-card tro-card-left"></div>
                <div class="tro-card tro-card-right"></div>
                <div class="tro-impact"></div>
                <div class="tro-particles">
                    ${Array(12).fill(0).map(() => '<div class="tro-particle"></div>').join('')}
                </div>
                <div class="tro-text">
                    <div class="tro-round-label">ROUND ${round}</div>
                    <div class="tro-stat">
                        <div class="tro-stat-particles">
                            ${Array(16).fill(0).map(() => '<div class="tro-stat-particle"></div>').join('')}
                        </div>
                        <div class="tro-stat-flash"></div>
                        <span class="tro-stat-icon">${statIcons[stat] || ''}</span>
                        <span class="tro-stat-name">${fullStatNames[stat] || statName}</span>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            
            // Séquence d'animation
            requestAnimationFrame(() => {
                overlay.classList.add('active');
                
                // 300ms: cartes commencent à glisser
                setTimeout(() => overlay.classList.add('cards-slide'), 300);
                
                // 700ms: clash
                setTimeout(() => overlay.classList.add('clash'), 700);
                
                // 900ms: ROUND apparaît juste après l'impact
                setTimeout(() => overlay.classList.add('show-text'), 750);
                
                // 2200ms: ROUND disparaît
                setTimeout(() => overlay.classList.add('hide-text'), 2200);
                
                // 2500ms: stat apparaît au même endroit
                setTimeout(() => overlay.classList.add('show-stat'), 2550);
                
                // 3800ms: fade out
                setTimeout(() => overlay.classList.add('fade-out'), 3800);
                
                // 4300ms: supprimer + montrer le slot
                setTimeout(() => {
                    overlay.remove();
                    this.triade.showCenterSlot = true;
                }, 4300);
            });
        },

        // 🆕 DRAG & DROP - Début du drag
        startCardDrag(cardIndex, e) {
            if (this.triade.cardPlayed) return;
            if (this.triade.timerExpired) return;
            if (!this.triade.showCenterSlot) return; // Pas encore de round actif
            if (this._fusionInProgress) return; // Fusion en cours
            
            this.hideCardPreview(); // Cacher le preview
            this.triade.draggingCardIndex = cardIndex;
            
            const cardEl = e.currentTarget;
            const rect = cardEl.getBoundingClientRect();
            const card = this.triade.myCards[cardIndex];
            
            // Créer un ghost simplifié
            const ghost = document.createElement('div');
            ghost.className = 'triade-card large drag-ghost';
            if (card && card.isFused) {
                ghost.classList.add('fused-card');
                const count = card.fusedCards.length;
                const imgsHtml = card.fusedCards.map(fc => 
                    `<img src="${this.getCardImage(fc)}" alt="${fc.name}">`
                ).join('');
                ghost.innerHTML = `<div class="fused-img-wrap fused-x${count}">${imgsHtml}</div>`;
            } else {
                const imgEl = cardEl.querySelector('.card-image img');
                ghost.innerHTML = `<div class="card-image"><img src="${imgEl ? imgEl.src : ''}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;"></div>`;
            }
            ghost.style.cssText = `
                position: fixed;
                width: ${rect.width}px;
                height: ${rect.height}px;
                left: ${e.clientX - rect.width / 2}px;
                top: ${e.clientY - rect.height / 2}px;
                z-index: 10000;
                pointer-events: none;
                transition: none;
                transform: scale(1.08) rotate(2deg);
                opacity: 0.95;
                filter: brightness(1.2);
            `;
            document.body.appendChild(ghost);
            this._dragGhost = ghost;
            this._dragCardRect = rect;
            
            // Listeners document
            this._boundDragMove = this.onCardDragMove.bind(this);
            this._boundDragEnd = this.onCardDragEnd.bind(this);
            document.addEventListener('pointermove', this._boundDragMove);
            document.addEventListener('pointerup', this._boundDragEnd);
        },
        
        // 🆕 DRAG & DROP - Mouvement
        onCardDragMove(e) {
            if (!this._dragGhost) return;
            
            const ghost = this._dragGhost;
            ghost.style.left = (e.clientX - this._dragCardRect.width / 2) + 'px';
            ghost.style.top = (e.clientY - this._dragCardRect.height / 2) + 'px';
            
            // Détecter si on survole le slot central
            const slotEl = document.querySelector('.triade-center-slot');
            if (slotEl) {
                const slotRect = slotEl.getBoundingClientRect();
                const overSlot = (
                    e.clientX >= slotRect.left - 30 &&
                    e.clientX <= slotRect.right + 30 &&
                    e.clientY >= slotRect.top - 30 &&
                    e.clientY <= slotRect.bottom + 30
                );
                this.triade.dropZoneActive = overSlot;
            }
            
            // 🔥 Détecter si on survole une autre carte du même anime (fusion)
            this._mergeTargetIndex = null;
            const sourceCard = this.triade.myCards[this.triade.draggingCardIndex];
            if (!sourceCard) return;
            const cardEls = document.querySelectorAll('.triade-my-cards .triade-card.large');
            cardEls.forEach((el, i) => {
                el.classList.remove('merge-target');
                if (i === this.triade.draggingCardIndex) return;
                const targetCard = this.triade.myCards[i];
                if (!targetCard || targetCard.anime !== sourceCard.anime) return;
                // Max 3 cards per fusion
                const srcCount = sourceCard.isFused ? sourceCard.fusedCards.length : 1;
                const tgtCount = targetCard.isFused ? targetCard.fusedCards.length : 1;
                if (srcCount + tgtCount > 3) return;
                const r = el.getBoundingClientRect();
                if (e.clientX >= r.left - 10 && e.clientX <= r.right + 10 &&
                    e.clientY >= r.top - 10 && e.clientY <= r.bottom + 10) {
                    el.classList.add('merge-target');
                    this._mergeTargetIndex = i;
                }
            });
        },
        
        // 🆕 DRAG & DROP - Fin du drag
        onCardDragEnd(e) {
            document.removeEventListener('pointermove', this._boundDragMove);
            document.removeEventListener('pointerup', this._boundDragEnd);
            
            const ghost = this._dragGhost;
            if (!ghost) return;
            
            const cardIndex = this.triade.draggingCardIndex;
            
            // Clean up merge target highlights
            document.querySelectorAll('.triade-my-cards .triade-card.large.merge-target').forEach(el => el.classList.remove('merge-target'));
            
            // 🔥 FIX: Re-check positions at DROP time (not relying on last pointermove)
            const dropX = e.clientX;
            const dropY = e.clientY;
            
            // Check slot overlap at drop time
            let overSlot = false;
            const slotEl = document.querySelector('.triade-center-slot');
            if (slotEl) {
                const slotRect = slotEl.getBoundingClientRect();
                overSlot = (
                    dropX >= slotRect.left - 30 &&
                    dropX <= slotRect.right + 30 &&
                    dropY >= slotRect.top - 30 &&
                    dropY <= slotRect.bottom + 30
                );
            }
            
            // Check merge target at drop time
            let mergeTarget = null;
            if (cardIndex !== null && !overSlot) {
                const sourceCard = this.triade.myCards[cardIndex];
                if (sourceCard) {
                    const cardEls = document.querySelectorAll('.triade-my-cards .triade-card.large');
                    cardEls.forEach((el, i) => {
                        if (i === cardIndex) return;
                        const targetCard = this.triade.myCards[i];
                        if (!targetCard || targetCard.anime !== sourceCard.anime) return;
                        const srcCount = sourceCard.isFused ? sourceCard.fusedCards.length : 1;
                        const tgtCount = targetCard.isFused ? targetCard.fusedCards.length : 1;
                        if (srcCount + tgtCount > 3) return;
                        const r = el.getBoundingClientRect();
                        if (dropX >= r.left - 10 && dropX <= r.right + 10 &&
                            dropY >= r.top - 10 && dropY <= r.bottom + 10) {
                            mergeTarget = i;
                        }
                    });
                }
            }
            
            // 🔥 FUSION: dropped on a merge target (but NOT on the slot)
            if (mergeTarget !== null && cardIndex !== null) {
                const targetIndex = mergeTarget;
                const targetEl = document.querySelectorAll('.triade-my-cards .triade-card.large')[targetIndex];
                if (targetEl) {
                    const tgtRect = targetEl.getBoundingClientRect();
                    ghost.style.transition = 'all 0.2s ease-in';
                    ghost.style.left = (tgtRect.left + tgtRect.width / 2 - this._dragCardRect.width / 2) + 'px';
                    ghost.style.top = (tgtRect.top + tgtRect.height / 2 - this._dragCardRect.height / 2) + 'px';
                    ghost.style.transform = 'scale(0.5)';
                    ghost.style.opacity = '0';
                }
                setTimeout(() => ghost.remove(), 250);
                this.fuseTriadeCards(cardIndex, targetIndex);
                this._mergeTargetIndex = null;
                this.triade.draggingCardIndex = null;
                this.triade.dropZoneActive = false;
                this._dragGhost = null;
                return;
            }
            this._mergeTargetIndex = null;
            
            if (overSlot && cardIndex !== null && !this.triade.timerExpired && !this.triade.cardPlayed) {
                // ✅ DROP SUR LE SLOT → jouer la carte
                console.log('✅ DROP on slot - cardIndex:', cardIndex, 'overSlot:', overSlot);
                const slotRect = slotEl.getBoundingClientRect();
                
                // Animer le ghost vers le centre du slot
                ghost.style.transition = 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
                ghost.style.left = (slotRect.left + slotRect.width / 2 - this._dragCardRect.width / 2) + 'px';
                ghost.style.top = (slotRect.top + slotRect.height / 2 - this._dragCardRect.height / 2) + 'px';
                ghost.style.transform = 'scale(0.55) rotate(0deg)';
                ghost.style.opacity = '0';
                
                setTimeout(() => {
                    ghost.remove();
                }, 400);
                
                // Jouer la carte
                this.playTriadeCard(cardIndex);
            } else {
                // ❌ PAS SUR LE SLOT → retour en place
                console.log('❌ DROP missed - overSlot:', overSlot, 'cardIndex:', cardIndex, 'timerExpired:', this.triade.timerExpired, 'cardPlayed:', this.triade.cardPlayed, 'dropXY:', dropX, dropY);
                ghost.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                ghost.style.left = this._dragCardRect.left + 'px';
                ghost.style.top = this._dragCardRect.top + 'px';
                ghost.style.transform = 'scale(1) rotate(0deg)';
                ghost.style.opacity = '1';
                
                setTimeout(() => {
                    ghost.remove();
                }, 300);
            }
            
            this.triade.draggingCardIndex = null;
            this.triade.dropZoneActive = false;
            this._dragGhost = null;
        },
        
        // 🆕 Jouer une carte Triade
        // Server-synced timer (100ms precision)
        startTriadeTimer(seconds = 20) {
            this.stopTriadeTimer(true);
            this._triadeTimerEndMs = Date.now() + seconds * 1000;
            this.triade.timer = seconds;
            this.triade.timerExpired = false;
            this._triadeTimerInterval = setInterval(() => {
                const remaining = Math.ceil((this._triadeTimerEndMs - Date.now()) / 1000);
                this.triade.timer = Math.max(0, remaining);
                if (remaining <= 0) {
                    clearInterval(this._triadeTimerInterval);
                    this._triadeTimerInterval = null;
                    this._triadeTimerEndMs = null;
                    this.triade.timerExpired = true;
                    // Cancel any active drag immediately
                    if (this._dragGhost) {
                        this._dragGhost.remove();
                        this._dragGhost = null;
                        this.triade.draggingCardIndex = null;
                        this.triade.dropZoneActive = false;
                        if (this._boundDragMove) document.removeEventListener('pointermove', this._boundDragMove);
                        if (this._boundDragEnd) document.removeEventListener('pointerup', this._boundDragEnd);
                    }
                    this.saveTriadeState();
                }
            }, 100);
        },
        stopTriadeTimer(silent) {
            if (this._triadeTimerInterval) { clearInterval(this._triadeTimerInterval); this._triadeTimerInterval = null; }
            this._triadeTimerEndMs = null;
            if (!silent) this.triade.timer = 0;
            // timerExpired is NOT reset here - only on new round
        },

        // 🔥 FUSION - Combiner deux cartes du même anime
        fuseTriadeCards(sourceIndex, targetIndex) {
            const src = this.triade.myCards[sourceIndex];
            const tgt = this.triade.myCards[targetIndex];
            if (!src || !tgt || src.anime !== tgt.anime) return;
            
            // Prevent drag during fusion animation
            this._fusionInProgress = true;
            
            // Build fusedCards array
            const srcCards = src.isFused ? [...src.fusedCards] : [src];
            const tgtCards = tgt.isFused ? [...tgt.fusedCards] : [tgt];
            const allCards = [...tgtCards, ...srcCards];
            if (allCards.length > 3) return;
            
            // Best stat from each card
            const fusedStats = {
                atk: Math.max(...allCards.map(c => c.stats ? c.stats.atk : 0)),
                int: Math.max(...allCards.map(c => c.stats ? c.stats.int : 0)),
                spd: Math.max(...allCards.map(c => c.stats ? c.stats.spd : 0)),
                pwr: Math.max(...allCards.map(c => c.stats ? c.stats.pwr : 0))
            };
            
            const fusedCard = {
                isFused: true,
                fusedCards: allCards,
                name: allCards.map(c => c.name).join('+'),
                anime: src.anime,
                class: tgt.class,
                stats: fusedStats,
                isProtagonist: allCards.some(c => c.isProtagonist),
                isBig3: allCards.some(c => c.isBig3)
            };
            
            console.log(`🔥 FUSION: ${allCards.map(c => c.name).join(' + ')} → stats:`, fusedStats);
            
            // 🎆 ANIMATION PHASE
            const cardEls = document.querySelectorAll('.triade-my-cards .triade-card.large');
            const srcEl = cardEls[sourceIndex];
            const tgtEl = cardEls[targetIndex];
            
            if (tgtEl) {
                // Phase 1: Impact shake (0.4s)
                tgtEl.classList.add('fuse-impact');
                
                // Get target center in screen coords
                const tgtRect = tgtEl.getBoundingClientRect();
                const cx = tgtRect.left + tgtRect.width / 2;
                const cy = tgtRect.top + tgtRect.height / 2;
                
                // Phase 2: Screen flash (0.35s)
                const flashOv = document.createElement('div');
                flashOv.className = 'fusion-flash-overlay';
                flashOv.style.setProperty('--fx', cx / window.innerWidth * 100 + '%');
                flashOv.style.setProperty('--fy', cy / window.innerHeight * 100 + '%');
                document.body.appendChild(flashOv);
                setTimeout(() => flashOv.remove(), 400);
                
                // Phase 3: Source dissolve (0.2s)
                if (srcEl) { srcEl.classList.add('dissolving'); srcEl.style.pointerEvents = 'none'; }
                
                // Phase 4: Burst — fixed on body (survives Vue re-render)
                const burst = document.createElement('div');
                burst.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;pointer-events:none;z-index:99998;`;
                document.body.appendChild(burst);
                // Flash circle + expanding ring
                const fl = document.createElement('div'); fl.className = 'burst-flash-i'; burst.appendChild(fl);
                const ri = document.createElement('div'); ri.className = 'burst-ring-i'; burst.appendChild(ri);
                // Shockwave rings (0.5s + 0.6s)
                const sw1 = document.createElement('div'); sw1.className = 'fusion-shockwave'; burst.appendChild(sw1);
                const sw2 = document.createElement('div'); sw2.className = 'fusion-shockwave sw2'; burst.appendChild(sw2);
                // Rays (0.4s)
                const rays = document.createElement('div'); rays.className = 'fusion-rays'; burst.appendChild(rays);
                for (let ri2 = 0; ri2 < 12; ri2++) {
                    const r = document.createElement('div'); r.className = 'fusion-ray';
                    r.style.transform = `rotate(${ri2 * 30}deg) translateY(-5px)`;
                    r.style.animationDelay = (ri2 * 0.02) + 's';
                    rays.appendChild(r);
                }
                // Exploding particles (0.5s)
                const pc = ['#ffd700','#ff6b35','#fff','#ffaa00','#ff4500'];
                const ps = [];
                for (let i = 0; i < 20; i++) {
                    const p = document.createElement('div'); p.className = 'bp-i';
                    const a = (i / 20) * Math.PI * 2, d = 40 + Math.random() * 70;
                    p.style.cssText = `width:${3+Math.random()*5}px;height:${3+Math.random()*5}px;background:${pc[i%pc.length]};box-shadow:0 0 4px ${pc[i%pc.length]};`;
                    p.dataset.tx = Math.cos(a) * d;
                    p.dataset.ty = Math.sin(a) * d;
                    burst.appendChild(p); ps.push(p);
                }
                requestAnimationFrame(() => {
                    fl.classList.add('go'); ri.classList.add('go');
                    ps.forEach(p => {
                        p.style.transition = 'all 0.5s cubic-bezier(0.25,0.46,0.45,0.94)';
                        p.style.opacity = '1';
                        p.style.transform = `translate(calc(-50% + ${p.dataset.tx}px), calc(-50% + ${p.dataset.ty}px))`;
                        setTimeout(() => { p.style.opacity = '0'; }, 80);
                    });
                });
                setTimeout(() => burst.remove(), 800);
            }
            
            // Phase 5: Morph — wait for animation to finish, THEN update cards
            setTimeout(() => {
                if (tgtEl) tgtEl.classList.remove('fuse-impact');
                // Adjust indices: remove source first if before target
                if (sourceIndex < targetIndex) {
                    this.triade.myCards.splice(targetIndex, 1, fusedCard);
                    this.triade.myCards.splice(sourceIndex, 1);
                } else {
                    this.triade.myCards.splice(sourceIndex, 1);
                    this.triade.myCards.splice(targetIndex, 1, fusedCard);
                }
                
                // 🔥 FIX: Clean up stale DOM classes/styles after Vue re-render
                this.$nextTick(() => {
                    document.querySelectorAll('.triade-my-cards .triade-card.large').forEach(el => {
                        el.classList.remove('dissolving', 'fuse-impact');
                        el.style.pointerEvents = '';
                        el.style.opacity = '';
                    });
                    this._fusionInProgress = false;
                });
            }, 600);
            
            // Notify server
            this.socket.emit('triade-fuse-cards', {
                twitchId: this.twitchId,
                sourceIndex: sourceIndex,
                targetIndex: targetIndex
            });
        },
        
        playTriadeCard(cardIndex) {
            if (this.triade.timerExpired) return;
            const card = this.triade.myCards[cardIndex];
            if (!card) return;
            
            console.log('🎴 Carte jouée:', card.name, 'isFused:', card.isFused, 'fusedCards:', card.fusedCards ? card.fusedCards.length : 0);
            
            this.triade.cardPlayed = true;
            // Deep clone to ensure Vue reactivity detects all properties
            this.$set(this.triade, 'playedCardData', JSON.parse(JSON.stringify(card)));
            // Timer keeps running until end of round
            
            // Émettre au serveur
            this.socket.emit('triade-play-card', {
                twitchId: this.twitchId,
                cardIndex: cardIndex
            });
            
            // Retirer la carte de la main
            this.triade.myCards.splice(cardIndex, 1);
            this.saveTriadeState();
        },


    },


}).mount('#app');