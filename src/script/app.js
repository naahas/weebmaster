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
            pseudoInput: '',
            pseudoError: '',
            joinPending: false,
            lobbyShakeError: false,

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
            lobbyMode: sessionStorage.getItem('bombanimeInProgress') === 'true' ? 'bombanime' : 'classic', // 'classic' | 'rivalry' | 'bombanime'
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
            joinCooldown: false,

            // Mode FizzBuzz
            fizzbuzzMaxLives: 1, // Nombre max de vies en FizzBuzz (1 ou 2)



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

            // Reward animation
            rewardAnimData: null,
            rewardAnimVisible: false,
            rewardTimers: [],

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
            bonusEnabled: true,         // 🎮 Bonus activés (jauge combo, bonus, défis)

            // 🆕 Système de défis
            challenges: [],             // Les 3 défis de la partie [{id, name, description, reward, progress, target, completed}]
            showChallengesMobile: false, // Afficher le modal défis sur mobile

            isLevelingUp: false,



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
                showSuggestionModal: false,  // Modal suggestion joueur
                suggestionUsed: false,       // 1x par partie
                suggestionName: '',          // (legacy - single input, gardé pour compat)
                suggestionLines: [''],       // Lignes multi-suggestions (array de strings)
                suggestionSubmitting: false, // Indicateur envoi en cours
                suggestionResult: '',        // Message de feedback
                suggestionResultType: '',    // 'success' | 'error'
                showBonusesModal: false,     // Modal bonus sur mobile
                challengeJustCompleted: null, // Pour animation de défi complété
                showCharacterImages: true    // 🖼️ Afficher les images de personnages
            },




            twitchAvatarUrl: null,
        };
    },

    async mounted() {
        // Bind give mode click handler
        this._onGiveSlotClick = this._handleGiveSlotClick.bind(this);
        
        // Restore winner banner if active (delayed to ensure DOM is ready)

        // 🔊 Raccourci clavier: Ctrl+M pour mute/unmute le son
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && (e.key === 'm' || e.key === 'M')) {
                e.preventDefault();
                this.toggleSound();
            }
        });

        setTimeout(() => {
            this.animateLogo();
        }, 700);

        await this.checkAuth();
        await this.restoreGameState();

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
                
                // 🔒 Re-sync état serveur immédiatement au retour d'onglet
                this._resyncServerState();

                if (this.gameInProgress && this.hasJoined && this.isAuthenticated) {
                    this.socket.emit('reconnect-player', {
                        twitchId: this.twitchId,
                        username: this.username
                    });
                }

                // Re-sync l'état du jeu
                this.refreshGameState();
                
                // 💣 BombAnime: Re-focus l'input si c'est mon tour
                if (this.lobbyMode === 'bombanime' && this.bombanime.isMyTurn && this.playerLives > 0) {
                    setTimeout(() => {
                        const input = document.getElementById('bombanimeInput');
                        if (input && !input.disabled) input.focus();
                    }, 300);
                }
            }
        });

        this.loadTheme();
        this.initSounds();

        // 💣 BombAnime: Click anywhere to refocus input (sauf contrôle son)
        document.addEventListener('click', (e) => {
            // Vérifier qu'on est en mode bombanime et que c'est mon tour
            if (this.lobbyMode !== 'bombanime' || !this.bombanime.isMyTurn || this.bombanime.introPhase) return;
            if (this.playerLives <= 0) return;
            
            // Exclure les clics sur le contrôle du son
            if (e.target.closest('.sound-control')) return;
            
            const input = document.getElementById('bombanimeInput');
            if (input && !input.disabled) {
                input.focus();
            }
        });

        // 📱 Listener resize pour le responsive
        window.addEventListener('resize', this.handleResize);
        this.handleResize(); // Appel initial

    },
    
    beforeDestroy() {
        window.removeEventListener('resize', this.handleResize);
    },

    computed: {

        // 🎌 Au moins une ligne de suggestion non vide
        hasValidPlayerSuggestions() {
            if (!this.bombanime || !Array.isArray(this.bombanime.suggestionLines)) return false;
            return this.bombanime.suggestionLines.some(l => (l || '').trim().length > 0);
        },

        // Au moins 1 streamer est en live
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
                    rank: p.rank,
                    avatarUrl: p.avatarUrl || null
                }));
            } else if (this.gameEndData.gameMode === 'lives') {
                // Mode vies : utiliser livesModePodium
                return this.livesModePodium.map((p, index) => ({
                    username: p.username,
                    lives: p.lives,
                    correctAnswers: p.correctAnswers,
                    points: undefined,
                    rank: index + 1,
                    avatarUrl: p.avatarUrl || null
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
        },
    },

    // 💥 Re-injecter les effets crack/shatter après chaque re-render Vue
    updated() {
        if (this.bombanime.active && this.bombanime.playersData.some(p => p.lives <= 1)) {
            clearTimeout(this._crackTimer);
            this._crackTimer = setTimeout(() => this.updateBombanimeEffects(), 15);
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
        // 🆕 v2 : identité invité stockée en localStorage (plus de compte, plus d'OAuth).
        // `twitchId` garde son nom sur le fil socket pour l'instant — renommage en playerId en phase 2.
        async checkAuth() {
            const savedId = localStorage.getItem('playerId');
            const savedName = localStorage.getItem('pseudo');

            if (!savedId || !savedName) return;

            this.twitchId = savedId;
            this.username = savedName;
            this.pseudoInput = savedName;
            this.isAuthenticated = true;

            if (this.socket && this.socket.connected) {
                this.socket.emit('register-authenticated', {
                    twitchId: this.twitchId,
                    username: this.username
                });
            }
        },

        // 🆕 v2 : valide le pseudo saisi et ouvre la session invité
        setPseudo() {
            const name = (this.pseudoInput || '').trim();

            if (name.length < 2) {
                this.pseudoError = 'Au moins 2 caractères';
                return;
            }
            if (name.length > 16) {
                this.pseudoError = 'Maximum 16 caractères';
                return;
            }
            // Filtre de pseudo complet (normalisation + blocklist) : phase 3
            if (!/^[\p{L}\p{N}_\- ]+$/u.test(name)) {
                this.pseudoError = 'Lettres, chiffres, espaces, - et _ uniquement';
                return;
            }

            this.pseudoError = '';

            let playerId = localStorage.getItem('playerId');
            if (!playerId) {
                playerId = (crypto.randomUUID ? crypto.randomUUID() : 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2));
                localStorage.setItem('playerId', playerId);
            }
            localStorage.setItem('pseudo', name);

            this.twitchId = playerId;
            this.username = name;
            this.isAuthenticated = true;

            if (this.socket && this.socket.connected) {
                this.socket.emit('register-authenticated', {
                    twitchId: this.twitchId,
                    username: this.username
                });
            }
        },

        // ========== Profil & Badges ==========
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
        triggerPointsAnimation() {
            this.pointsAnimation = true;
            setTimeout(() => {
                this.pointsAnimation = false;
            }, 1500);
        },

        // ========== Restauration d'état ==========
        async _resyncServerState() {
            try {
                const response = await fetch('/game/state');
                const state = await response.json();
                
                // Resync lobbyMode — source of truth = serveur
                if (state.isActive && state.lobbyMode) {
                    if (this.lobbyMode !== state.lobbyMode) {
                        console.log(`🔄 Resync lobbyMode: ${this.lobbyMode} → ${state.lobbyMode}`);
                        this.lobbyMode = state.lobbyMode;
                    }
                    // Protéger contre game-deactivated stale pendant 2s après resync
                    if (state.lobbyMode !== 'classic') {
                        this._lastActivationTime = Date.now();
                    }
                } else if (!state.isActive) {
                    this.lobbyMode = 'classic';
                }
                
                
                this.playerCount = state.playerCount;
                
                // 🎮 Resync bonusEnabled
                if (state.bonusEnabled !== undefined) {
                    this.bonusEnabled = state.bonusEnabled;
                }
                

                // 🔧 FIX: Si la partie est en cours côté serveur MAIS le client est bloqué sur le modal lobby
                // (peut arriver si le socket s'est reconnecté avec un nouveau socket.id pendant le démarrage
                // de la partie, faisant que le serveur envoie isParticipating=false au nouveau socket)
                // → émettre reconnect-player pour réassigner le player au nouveau socket.id
                if (state.isActive && state.inProgress && this.isAuthenticated && this.hasJoined && !this.gameInProgress) {
                    const classicLikeMode = !state.lobbyMode || state.lobbyMode === 'classic' || state.lobbyMode === 'rivalry';
                    if (classicLikeMode) {
                        console.log('🔧 Resync: partie en cours serveur mais client bloqué en lobby → reconnect-player');
                        this.socket.emit('reconnect-player', {
                            twitchId: this.twitchId,
                            username: this.username
                        });
                    }
                }
            } catch (e) {
                console.warn('⚠️ Resync échoué:', e);
            }
        },

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
                    // 🔒 Protéger contre game-deactivated stale lors de reconnexion
                    if (state.lobbyMode !== 'classic' && state.isActive) {
                        this._lastActivationTime = Date.now();
                    }
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
                // 🎮 Restaurer bonusEnabled
                if (state.bonusEnabled !== undefined) {
                    this.bonusEnabled = state.bonusEnabled;
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
                
                // 🎴 Nettoyer Collect si le serveur n'est pas en mode Collect

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

            // 🆕 v2 : on garde le playerId (identité stable) mais on repasse par l'écran pseudo
            this.isAuthenticated = false;
            this.hasJoined = false;
            window.location.reload();
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
            
            this.socket.on('connect', () => {

                if (this.isAuthenticated) {
                    this.socket.emit('register-authenticated', {
                        twitchId: this.twitchId,
                        username: this.username
                    });
                    console.log('✅ Authentification enregistrée auprès du serveur');
                }
                
                // 🔒 Re-sync état serveur sur chaque (re)connexion socket
                // Protège contre les events manqués pendant la déconnexion
                this._resyncServerState();

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

                // 🎮 Restaurer bonusEnabled
                if (data.bonusEnabled !== undefined) {
                    this.bonusEnabled = data.bonusEnabled;
                }

                this.currentQuestionNumber = data.currentQuestionIndex;
                this.hasJoined = true;

                // 🔧 FIX: Activer gameInProgress pour quitter le modal "Vous êtes dans la partie"
                // Si le serveur nous restaure, c'est qu'une partie est en cours et qu'on est dedans
                this.gameStartedOnServer = true;
                this.gameInProgress = true;
                this.gameMode = data.gameMode || this.gameMode || 'lives';
                document.body.classList.add('game-active');

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
                
                // 🎮 Bonus activés
                if (data && data.bonusEnabled !== undefined) {
                    this.bonusEnabled = data.bonusEnabled;
                }
                
                // 🔒 Timestamp pour éviter race condition avec game-deactivated
                this._lastActivationTime = Date.now();
                
                // 🔒 Re-sync safety: re-confirmer le mode après un court délai
                // (protège contre game-deactivated qui arriverait après game-activated)
                if (data && data.lobbyMode && data.lobbyMode !== 'classic') {
                    const expectedMode = data.lobbyMode;
                    setTimeout(() => {
                        if (this.isGameActive && this.lobbyMode !== expectedMode) {
                            console.log(`⚠️ Race condition détectée: lobbyMode=${this.lobbyMode}, expected=${expectedMode} → correction`);
                            this.lobbyMode = expectedMode;
                        }
                    }, 500);
                }
                
                this.showNotification('Le jeu est maintenant actif ! 🎮', 'success');
            });

            // 🆕 Écouter les mises à jour de configuration
            this.socket.on('game-config-updated', (data) => {
                this.gameLives = data.lives;
                this.gameTime = data.questionTime;
                console.log(`⚙️ Paramètres mis à jour: ${data.lives}❤️ - ${data.questionTime}s`);
            });

            this.socket.on('game-deactivated', () => {
                // 🔊 Toujours couper le tictac, même si le reste est ignoré
                this.stopBombTicking();
                if (this.bombanime.timerInterval) {
                    clearInterval(this.bombanime.timerInterval);
                    this.bombanime.timerInterval = null;
                }
                
                // 🔒 Protection race condition: ignorer si game-activated ou resync récent
                if (this._lastActivationTime && (Date.now() - this._lastActivationTime < 2000)) {
                    console.log('⚠️ game-deactivated ignoré (game-activated récent, race condition)');
                    return;
                }
                
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

                // Arrêter le timer si actif
                this.stopTimer();

                this.resetComboSystem();

                // Nettoyer localStorage et sessionStorage
                localStorage.removeItem('hasJoinedLobby');
                localStorage.removeItem('lobbyTwitchId');
                localStorage.removeItem('selectedTeam');
                localStorage.removeItem('teamCooldownEnd');
                sessionStorage.removeItem('wasKicked'); // 🆕 Clear kick flag pour prochaine partie
                
                // 💣 Reset BombAnime
                this.cleanupBombanimeEffects();
                this.bombanime.active = false;
                sessionStorage.removeItem('bombanimeInProgress');
                sessionStorage.removeItem('bombanimeSuggestionUsed');

                this.showNotification('Le jeu a été désactivé', 'info');
            });

            this.socket.on('game-started', (data) => {
                // 🔧 FIX: synchroniser le lobbyMode avec le serveur AVANT les checks de mode.
                // Sans ça, si le client a un lobbyMode stale (ex: 'bombanime' resté après une fermeture
                // de lobby ratée), l'event serait ignoré → playerLives=0 + bouton réponse disabled.
                if (data && data.lobbyMode) {
                    this.lobbyMode = data.lobbyMode;
                }

                // Modes ayant leur propre handler dédié → on ignore game-started générique
                if (this.lobbyMode === 'bombanime') {
                    console.log('🎮 game-started ignoré en mode BombAnime');
                    return;
                }

                this.gameStartedOnServer = true;
                this.gameMode = data.gameMode || 'lives';
                
                // 🎮 Bonus activés
                if (data.bonusEnabled !== undefined) {
                    this.bonusEnabled = data.bonusEnabled;
                }
                
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
                
                // 💣 BombAnime / 🎴 Collect - Lobby plein
                if (data.lobbyMode === 'bombanime') {
                    this.isLobbyFull = data.isLobbyFull || false;
                    this.maxPlayers = data.maxPlayers || 13;
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
                
                // 💣🎴 Lobby BombAnime/Collect plein
                if (data.message && data.message.includes('plein')) {
                    this.hasJoined = false; // Le joueur n'a PAS rejoint
                    this.joinPending = false; // Annuler le pending
                    // Nettoyer localStorage car le join a échoué
                    localStorage.removeItem('hasJoinedLobby');
                    localStorage.removeItem('lobbyTwitchId');
                    
                    // 🎴💣 Animation shake + cooldown 3s (pour les deux modes)
                    this.lobbyShakeError = true;
                    this.joinCooldown = true;
                    
                    setTimeout(() => {
                        this.lobbyShakeError = false;
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
                // 🔥 TEMPORAIRE: Notifs "joueur a répondu" masquées
                // if (data.username !== this.username) {
                //     this.showAnswerNotification(data.username);
                // }
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
                
                // 🎌 Reset suggestion pour nouvelle partie
                this.bombanime.suggestionUsed = false;
                sessionStorage.removeItem('bombanimeSuggestionUsed');
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
                
                // 🔥 Détecter si c'est le premier tour (bombe qui passe de haut → joueur)
                const isFirstTurn = this.bombanime.bombPointingUp;
                
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
                
                // 💥 Re-injecter effets (forceUpdate détruit le DOM injecté)
                this.updateBombanimeEffects();
                
                // Démarrer le timer visuel
                this.startBombanimeTimer();
                
                // 🆕 Attendre que l'intro soit terminée ET la bombe ait tourné avant d'activer isMyTurn
                const activateTurn = () => {
                    this.bombanime.isMyTurn = data.currentPlayerTwitchId === this.twitchId;
                    
                    // 🎌 Fermer le modal suggestion si c'est mon tour
                    if (this.bombanime.isMyTurn && this.bombanime.showSuggestionModal) {
                        this.bombanime.showSuggestionModal = false;
                    }
                    
                    // 🔊 Son "c'est ton tour" uniquement pour le joueur POV
                    if (this.bombanime.isMyTurn) {
                        this.playSound(this.sounds.bombanimePlayerTurn);
                    }
                    
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
                            // Délai pour l'animation de la bombe (rotation vers le joueur)
                            setTimeout(activateTurn, 800);
                        }
                    }, 50);
                } else if (isFirstTurn) {
                    // 🔥 Premier tour mais intro déjà finie : attendre la rotation de la bombe
                    setTimeout(activateTurn, 800);
                } else {
                    activateTurn();
                }
            });
            
            this.socket.on('bombanime-name-accepted', (data) => {
                console.log('✅ Nom accepté:', data.name);
                
                // 🖼️ Afficher l'image du personnage
                if (data.characterImage && this.bombanime.showCharacterImages !== false) {
                    this.showBombanimeCharacterFlash(data.characterImage, data.name);
                }
                
                // 🔊 Stopper le tictac + son de passage de tour
                this.stopBombTicking();
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
                
                // 💥 Re-injecter effets (Vue re-render détruit le DOM injecté)
                this.updateBombanimeEffects();
                
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
                this.stopBombTicking();
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
                    
                    // 💥 Crack/shatter (après forceUpdate)
                    this.updateBombanimeEffects();
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
                        this.updateBombanimeEffects();
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
                this.stopBombTicking();
                console.log('🏆 BombAnime terminé:', data);
                this.bombanime.active = false;
                this.gameEnded = true;
                this.gameStartedOnServer = false; // 🆕 Reset pour les spectateurs
                
                // Supprimer l'état de sessionStorage
                sessionStorage.removeItem('bombanimeInProgress');
                sessionStorage.removeItem('bombanimeSuggestionUsed');
                
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
                    namesUsed: data.namesUsed,
                    rewardsData: data.rewardsData
                };

                // 🎁 Si les rewards sont déjà présents (cas normal classique/rivalité), déclencher
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
                    this.bombanime.suggestionUsed = sessionStorage.getItem('bombanimeSuggestionUsed') === 'true';
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
                    
                    // 💥 Restaurer effets visuels
                    this.updateBombanimeEffects();
                    
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
                
                // 💥 Crack/shatter effects
                this.updateBombanimeEffects();
                
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
            
        },
        
        // ============================================
        // 🎮 SURVIE - Méthodes
        // ============================================
        
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

            // 🎴💣 En mode Collect/BombAnime, attendre confirmation avant d'afficher "rejoint"
            if (this.lobbyMode === 'bombanime') {
                this.joinPending = true;
                // Confirmer après 400ms si pas d'erreur reçue
                setTimeout(() => {
                    if (this.joinPending && !this.lobbyShakeError) {
                        this.hasJoined = true;
                        this.joinPending = false;
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
        selectAndJoinTeam(team, event) {
            // Bloquer si déjà dans le lobby
            if (this.hasJoined) return;

            // 🎯 Feedback tactile : son + particules + ripple
            this.playSound(this.clickSound);
            if (event) this.spawnClickParticles(event);

            // Ripple effect sur la card cliquée
            if (event && event.currentTarget) {
                const card = event.currentTarget;
                card.classList.remove('just-selected');
                // Force reflow pour que la classe se re-applique et redéclenche l'animation
                void card.offsetWidth;
                card.classList.add('just-selected');
            }

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
            this._lastClickTime = Date.now();

            // 💥 Son "Shockwave 3D"
            this.playShockwaveSound();

            if (event) {
                this.spawnClickParticles(event);
                // 💥 Effet visuel "Flash impact" via un CLONE superposé
                // Immunisé contre les re-renders Vue, classes qui changent, transitions CSS, etc.
                this.playClickFlashOverlay(event.currentTarget);
            }

            this.socket.emit('submit-answer', {
                answer: answerIndex,
                bonusActive: this.activeBonusEffect
            });

            console.log(`📤 Réponse envoyée: ${answerIndex}, bonus: ${this.activeBonusEffect}`);
        },

        // Sélection carte FizzBuzz
        selectFizzbuzzCard(cardIndex, event) {
            if (this.hasAnswered || this.playerLives === 0) return;

            this.selectedAnswer = cardIndex;
            this._lastClickTime = Date.now();

            this.playShockwaveSound();

            if (event) {
                this.spawnClickParticles(event);
                this.playClickFlashOverlay(event.currentTarget);
            }

            this.socket.emit('submit-answer', {
                answer: cardIndex,
                bonusActive: null
            });

            console.log(`📤 Carte FizzBuzz sélectionnée: ${cardIndex}`);
        },

        // 💥 Crée un clone overlay de la card pour jouer l'animation
        // sans être perturbé par les re-renders Vue ou les changements de classe
        playClickFlashOverlay(originalCard) {
            if (!originalCard) return;
            const rect = originalCard.getBoundingClientRect();
            
            // Récupérer le texte de la card pour l'inclure dans le clone
            const textEl = originalCard.querySelector('.answer-text');
            const answerText = textEl ? textEl.textContent : '';
            
            // Clone visuel FIDÈLE qui MASQUE l'original pendant l'animation
            // + transform visible (rebond) sans toucher à l'original
            const clone = document.createElement('div');
            clone.className = 'click-flash-overlay';
            clone.style.cssText = `
                position: fixed;
                left: ${rect.left}px;
                top: ${rect.top}px;
                width: ${rect.width}px;
                height: ${rect.height}px;
                pointer-events: none;
                z-index: 9998;
                border-radius: 1rem 1.5rem 1.25rem 1.375rem / 1.375rem 1.25rem 1.5rem 1.125rem;
                background: linear-gradient(145deg, #2a2a2a 0%, #1f1f1f 100%);
                border: 0.125rem solid rgba(255, 232, 138, 0.9);
                animation: clickFlashImpactOverlay 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                transform-origin: center;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 1.25rem 2rem;
                box-sizing: border-box;
                overflow: hidden;
            `;
            // Ajouter le texte identique
            const textSpan = document.createElement('span');
            textSpan.textContent = answerText;
            textSpan.style.cssText = `
                font-size: 1rem;
                font-weight: 500;
                color: rgba(255, 255, 255, 0.88);
                text-align: center;
                font-family: 'Poppins', sans-serif;
                text-shadow: 0 0.0625rem 0.125rem rgba(0, 0, 0, 0.3);
            `;
            clone.appendChild(textSpan);
            document.body.appendChild(clone);
            
            // Anneau qui se propage
            const ring = document.createElement('div');
            ring.className = 'click-flash-overlay-ring';
            ring.style.cssText = `
                position: fixed;
                left: ${rect.left - 2}px;
                top: ${rect.top - 2}px;
                width: ${rect.width + 4}px;
                height: ${rect.height + 4}px;
                pointer-events: none;
                z-index: 9997;
                border-radius: 1rem 1.5rem 1.25rem 1.375rem / 1.375rem 1.25rem 1.5rem 1.125rem;
                border: 3px solid rgba(245, 212, 66, 0.9);
                opacity: 0;
                animation: clickFlashOverlayRing 0.65s ease-out forwards;
                transform-origin: center;
                background: transparent;
            `;
            document.body.appendChild(ring);
            
            setTimeout(() => {
                clone.remove();
                ring.remove();
            }, 700);
        },

        // 💥 Son "Shockwave 3D" — généré via Web Audio API (pas de fichier MP3)
        playShockwaveSound() {
            try {
                if (!this._shockwaveCtx) {
                    this._shockwaveCtx = new (window.AudioContext || window.webkitAudioContext)();
                }
                const ctx = this._shockwaveCtx;
                if (ctx.state === 'suspended') ctx.resume();
                const t = ctx.currentTime;

                // 🧚 Fairy chime - 2 notes décalées + shimmer aigu

                // Note 1 haute (ping principal)
                const o1 = ctx.createOscillator();
                const g1 = ctx.createGain();
                o1.type = 'sine';
                o1.frequency.setValueAtTime(4400, t);
                g1.gain.setValueAtTime(0, t);
                g1.gain.linearRampToValueAtTime(0.08, t + 0.005);
                g1.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
                o1.connect(g1).connect(ctx.destination);
                o1.start(t); o1.stop(t + 0.35);

                // Note 2 un peu plus basse, légèrement décalée
                const o2 = ctx.createOscillator();
                const g2 = ctx.createGain();
                o2.type = 'sine';
                o2.frequency.setValueAtTime(3300, t + 0.03);
                g2.gain.setValueAtTime(0, t + 0.03);
                g2.gain.linearRampToValueAtTime(0.07, t + 0.04);
                g2.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
                o2.connect(g2).connect(ctx.destination);
                o2.start(t + 0.03); o2.stop(t + 0.4);

                // Harmonique haute shimmer
                const o3 = ctx.createOscillator();
                const g3 = ctx.createGain();
                o3.type = 'triangle';
                o3.frequency.setValueAtTime(8800, t + 0.01);
                g3.gain.setValueAtTime(0, t + 0.01);
                g3.gain.linearRampToValueAtTime(0.025, t + 0.02);
                g3.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
                o3.connect(g3).connect(ctx.destination);
                o3.start(t + 0.01); o3.stop(t + 0.25);
            } catch(e) {
                console.warn('Fairy chime sound failed:', e);
            }
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

            // 🎁 Cleanup reward animation
            this.rewardTimers.forEach(t => clearTimeout(t));
            this.rewardTimers = [];
            this.rewardAnimData = null;
            this.rewardAnimVisible = false;

            localStorage.removeItem('hasJoinedLobby');
            localStorage.removeItem('lobbyTwitchId');

            // 🆕 Demander l'état actuel du serveur pour rafraîchir le compteur
            this.refreshGameState();
        },

        // ============================================
        // 🎁 REWARD ANIMATION
        // ============================================
        async refreshGameState() {
            try {
                const response = await fetch('/game/state');
                const state = await response.json();

                this.isGameActive = state.isActive;
                this.playerCount = state.playerCount;
                this.gameMode = state.mode || 'lives';
                this.gameLives = state.lives || 3;
                this.gameTime = state.questionTime || 10;
                
                // 🔥 FIX: Synchroniser le lobbyMode depuis le serveur
                if (state.isActive && state.lobbyMode) {
                    this.lobbyMode = state.lobbyMode;
                }
                // 🎮 Synchroniser bonusEnabled
                if (state.bonusEnabled !== undefined) {
                    this.bonusEnabled = state.bonusEnabled;
                }

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
        
        // 💥 CRACK - Injection des fissures bord-à-bord
        injectCrackOverlay(hex) {
            if (hex.querySelector('.crack-overlay')) return;
            const o = document.createElement('div'); o.className = 'crack-overlay';
            o.innerHTML = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <polyline class="crack-line" points="17,18 28,28 38,40 50,50 60,62 68,74 76,86" stroke-width="1.6"/>
                <polyline class="crack-line" points="83,18 70,26 58,34 46,40 30,46 3,50" stroke-width="1.5"/>
                <polyline class="crack-line" points="97,45 82,48 68,54 56,62 44,74 31,88" stroke-width="1.4"/>
                <polyline class="crack-line" points="38,40 46,36 58,34" stroke-width="1"/>
            </svg>`;
            const v = document.createElement('div'); v.className = 'crack-vignette';
            const f = document.createElement('div'); f.className = 'crack-flash';
            hex.appendChild(v); hex.appendChild(o); hex.appendChild(f);
            [{l:'38%',t:'40%',tx:'-5px',ty:'-12px',d:'0.3s'},{l:'58%',t:'34%',tx:'4px',ty:'-13px',d:'0.8s'},
             {l:'68%',t:'54%',tx:'5px',ty:'-11px',d:'1.1s'},{l:'30%',t:'46%',tx:'-4px',ty:'-14px',d:'0.5s'}
            ].forEach(e => { const el = document.createElement('div'); el.className = 'crack-ember';
                el.style.cssText = `left:${e.l};top:${e.t};--tx:${e.tx};--ty:${e.ty};--d:${e.d}`; hex.appendChild(el); });
        },
        // 💀 SHATTER - Injection des fragments
        injectShatterEffect(hex) {
            if (hex.querySelector('.shatter-container')) return;
            const c = document.createElement('div'); c.className = 'shatter-container';
            for (let i = 0; i < 14; i++) {
                const s = document.createElement('div'); s.className = 'shatter-shard';
                const a = (Math.PI*2*i)/14+(Math.random()-0.5)*0.4, d = 10+Math.random()*20;
                const fd = 40+Math.random()*60, sx = Math.cos(a)*fd, sy = Math.sin(a)*fd;
                s.style.cssText = `left:${35+Math.cos(a)*d-8}px;top:${35+Math.sin(a)*d-5}px;width:${8+Math.random()*12}px;height:${5+Math.random()*10}px;`+
                    `clip-path:polygon(${Math.random()*30}% ${Math.random()*20}%,${60+Math.random()*40}% ${Math.random()*30}%,${70+Math.random()*30}% ${60+Math.random()*40}%,${Math.random()*40}% ${70+Math.random()*30}%);`+
                    `--sx:${sx}px;--sy:${sy}px;--sr:${(Math.random()-0.5)*180}deg;--sd:${(i*0.02).toFixed(2)}s;--dur:${(0.8+Math.random()*0.6).toFixed(2)}s;`+
                    `background:linear-gradient(${Math.random()*360}deg,rgba(${~~(30+Math.random()*20)},${~~(20+Math.random()*15)},${~~(40+Math.random()*20)},0.9),rgba(${~~(50+Math.random()*30)},${~~(25+Math.random()*15)},${~~(30+Math.random()*20)},0.7));`;
                c.appendChild(s);
            }
            const f = document.createElement('div'); f.className = 'shatter-flash';
            const r1 = document.createElement('div'); r1.className = 'shatter-ring'; r1.style.cssText = '--rd:0s';
            const r2 = document.createElement('div'); r2.className = 'shatter-ring'; r2.style.cssText = '--rd:0.15s';
            hex.appendChild(c); hex.appendChild(f); hex.appendChild(r1); hex.appendChild(r2);
            [{l:'25%',t:'35%',dx:'-20px',dy:'-30px',dd:'0.3s'},{l:'50%',t:'15%',dx:'8px',dy:'-40px',dd:'0.4s'},
             {l:'70%',t:'45%',dx:'25px',dy:'-20px',dd:'0.2s'},{l:'35%',t:'65%',dx:'-15px',dy:'20px',dd:'0.5s'},
             {l:'60%',t:'55%',dx:'-6px',dy:'-35px',dd:'0.45s'}
            ].forEach(d => { const el = document.createElement('div'); el.className = 'shatter-debris';
                el.style.cssText = `left:${d.l};top:${d.t};--dx:${d.dx};--dy:${d.dy};--dd:${d.dd}`; hex.appendChild(el); });
        },
        // 🔄 Mise à jour effets crack/shatter - vérifie le DOM, pas les classes
        updateBombanimeEffects() {
            if (!this.bombanime.active) return;
            this.$nextTick(() => {
                this.bombanime.playersData.forEach(p => {
                    const slot = document.querySelector(`.bombanime-player-slot[data-twitch-id="${p.twitchId}"]`);
                    if (!slot) return;
                    const hex = slot.querySelector('.player-hex');
                    if (!hex) return;
                    
                    if (p.lives === 1) {
                        // Toujours vérifier si le DOM existe (Vue peut le détruire au re-render)
                        const isNew = !hex.querySelector('.crack-overlay');
                        this.injectCrackOverlay(hex); // No-op si déjà présent
                        slot.classList.add('cracked');
                        if (isNew) {
                            slot.classList.add('crack-flash-active');
                            setTimeout(() => slot.classList.remove('crack-flash-active'), 400);
                        }
                    } else if (p.lives > 1) {
                        slot.classList.remove('cracked', 'crack-flash-active');
                        hex.querySelectorAll('.crack-overlay,.crack-vignette,.crack-flash,.crack-ember').forEach(e => e.remove());
                    }
                    
                    if (p.lives === 0) {
                        slot.classList.remove('cracked', 'crack-flash-active');
                        hex.querySelectorAll('.crack-overlay,.crack-vignette,.crack-flash,.crack-ember').forEach(e => e.remove());
                        const isNewShatter = !hex.querySelector('.shatter-container');
                        this.injectShatterEffect(hex); // No-op si déjà présent
                        slot.classList.add('shattering');
                        if (isNewShatter) {
                            slot.dataset.shattered = 'true';
                        }
                    }
                });
            });
        },
        // 🧹 Nettoyage effets
        cleanupBombanimeEffects() {
            document.querySelectorAll('.bombanime-player-slot').forEach(slot => {
                slot.classList.remove('cracked', 'shattering', 'crack-flash-active');
                delete slot.dataset.shattered;
                const hex = slot.querySelector('.player-hex');
                if (hex) hex.querySelectorAll('.crack-overlay,.crack-vignette,.crack-flash,.crack-ember,.shatter-container,.shatter-flash,.shatter-ring,.shatter-debris').forEach(e => e.remove());
            });
        },
        
        // Retour au menu principal après fin de partie BombAnime
        returnToLobby() {
            this.cleanupBombanimeEffects();
            this._lastValidFuseAngle = 0;
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
            this.bombanime.suggestionUsed = false;
            this.bombanime.showSuggestionModal = false;
            this.bombanime.suggestionName = '';
            sessionStorage.removeItem('bombanimeSuggestionUsed');
            
            // Reset l'état global
            this.gameInProgress = false;
            this.gameEnded = false;
            this.gameEndData = null;
            this.hasJoined = false;
            this.lobbyMode = 'classic';
            
            // Supprimer du localStorage et sessionStorage
            localStorage.removeItem('hasJoinedLobby');
            sessionStorage.removeItem('bombanimeInProgress');
            
            // 🔥 FIX: Rafraîchir l'état serveur (le lobby est peut-être fermé)
            this.refreshGameState();
            
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
            // 🆕 Animation winner V3 - JS natif équivalent GSAP
            this._fsWinnerTimers = this._fsWinnerTimers || [];
            this._fsWinnerTimers.forEach(t => clearTimeout(t));
            this._fsWinnerTimers = [];

            const beam = document.querySelector('.fs-beam');
            const stars = document.querySelectorAll('.fs-star');

            // Beam fade in
            if (beam) {
                beam.animate(
                    [{ opacity: 0 }, { opacity: 1 }],
                    { duration: 1200, fill: 'forwards', easing: 'ease-out' }
                );
            }

            // Stars twinkle (stagger + infinite)
            stars.forEach((star, i) => {
                const t = setTimeout(() => {
                    star.animate(
                        [{ opacity: 0 }, { opacity: 0.4 }],
                        { duration: 800, fill: 'forwards', easing: 'ease-out' }
                    );
                    star.animate(
                        [{ opacity: 0.2 }, { opacity: 0.6 }, { opacity: 0.2 }],
                        { duration: 2000, delay: 800, iterations: Infinity, easing: 'ease-in-out' }
                    );
                }, 300 + i * 80);
                this._fsWinnerTimers.push(t);
            });

            // 3ème à 900ms
            this._fsWinnerTimers.push(setTimeout(() => {
                const el = document.querySelector('.fs-chal-3');
                if (el) this._fsAnimateIn(el, { x: -40, scale: 0.9, duration: 600, easing: 'back-out' });
            }, 900));

            // 2ème à 1700ms
            this._fsWinnerTimers.push(setTimeout(() => {
                const el = document.querySelector('.fs-chal-2');
                if (el) this._fsAnimateIn(el, { x: -40, scale: 0.9, duration: 600, easing: 'back-out' });
            }, 1700));

            // Champion à 2900ms
            const champTime = 2900;

            // Avatar frame pop
            this._fsWinnerTimers.push(setTimeout(() => {
                const frame = document.getElementById('fsAvatarFrame');
                if (!frame) return;

                frame.animate(
                    [
                        { opacity: 0, transform: 'scale(0.2) rotate(-180deg)' },
                        { opacity: 1, transform: 'scale(1.18) rotate(0deg)', offset: 0.7 },
                        { opacity: 1, transform: 'scale(1) rotate(0deg)' }
                    ],
                    { duration: 1250, fill: 'forwards', easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
                );
            }, champTime));

            // Shockwave à champ+300ms
            this._fsWinnerTimers.push(setTimeout(() => {
                const sw = document.getElementById('fsShockwave');
                if (!sw) return;
                sw.animate(
                    [
                        { opacity: 0.9, transform: 'translate(-50%, -50%) scale(1)' },
                        { opacity: 0, transform: 'translate(-50%, -50%) scale(2.8)' }
                    ],
                    { duration: 900, fill: 'forwards', easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
                );
            }, champTime + 300));

            // Burst particles à champ+300ms
            this._fsWinnerTimers.push(setTimeout(() => {
                this._fsExplodeChampion();
            }, champTime + 300));

            // Ring fade in à champ+550ms
            this._fsWinnerTimers.push(setTimeout(() => {
                const ring = document.querySelector('.fs-avatar-ring');
                if (ring) ring.animate(
                    [{ opacity: 0 }, { opacity: 0.9 }],
                    { duration: 600, fill: 'forwards', easing: 'ease-out' }
                );
            }, champTime + 550));

            // Glow pulse à champ+550ms puis infinie
            this._fsWinnerTimers.push(setTimeout(() => {
                const glow = document.querySelector('.fs-avatar-glow');
                if (!glow) return;
                glow.animate(
                    [{ opacity: 0 }, { opacity: 0.55 }],
                    { duration: 700, fill: 'forwards', easing: 'ease-out' }
                );
                setTimeout(() => {
                    glow.animate(
                        [
                            { opacity: 0.55, transform: 'scale(1)' },
                            { opacity: 0.8, transform: 'scale(1.05)' },
                            { opacity: 0.55, transform: 'scale(1)' }
                        ],
                        { duration: 2200, iterations: Infinity, easing: 'ease-in-out' }
                    );
                }, 700);
            }, champTime + 550));

            // Couronne à champ+450ms
            this._fsWinnerTimers.push(setTimeout(() => {
                const crown = document.getElementById('fsCrownBar');
                if (!crown) return;
                crown.animate(
                    [
                        { opacity: 0, transform: 'translateX(-50%) rotate(-30deg) scale(0.6) translateY(-40px)' },
                        { opacity: 1, transform: 'translateX(-50%) rotate(-12deg) scale(1) translateY(0)' }
                    ],
                    { duration: 750, fill: 'forwards', easing: 'cubic-bezier(0.34, 1.8, 0.64, 1)' }
                );
                // Swing infini après
                setTimeout(() => {
                    crown.animate(
                        [
                            { transform: 'translateX(-50%) rotate(-12deg)' },
                            { transform: 'translateX(-50%) rotate(-15deg)' },
                            { transform: 'translateX(-50%) rotate(-12deg)' }
                        ],
                        { duration: 3500, iterations: Infinity, easing: 'ease-in-out' }
                    );
                }, 850);
            }, champTime + 450));

            // Nom champion à champ+750ms
            this._fsWinnerTimers.push(setTimeout(() => {
                const name = document.querySelector('.fs-name');
                if (name) this._fsAnimateIn(name, { y: 20, scale: 0.95, duration: 600, easing: 'ease-out' });
            }, champTime + 750));

            // "is the Master" à champ+950ms
            this._fsWinnerTimers.push(setTimeout(() => {
                const tag = document.querySelector('.fs-master-tag');
                if (tag) this._fsAnimateIn(tag, { y: 8, duration: 700, easing: 'ease-out' });
            }, champTime + 950));

            // Stats à champ+1000ms
            this._fsWinnerTimers.push(setTimeout(() => {
                const stats = document.querySelector('.fs-stats');
                if (stats) this._fsAnimateIn(stats, { y: 12, duration: 550, easing: 'ease-out' });
            }, champTime + 1000));

            // Votre rang à champ+1100ms
            this._fsWinnerTimers.push(setTimeout(() => {
                const you = document.getElementById('fsYouRank');
                if (you) this._fsAnimateIn(you, { x: -30, duration: 600, easing: 'ease-out' });
            }, champTime + 1100));

            // Bouton Retour à champ+1200ms
            this._fsWinnerTimers.push(setTimeout(() => {
                const btn = document.querySelector('.fs-champ-action');
                if (btn) this._fsAnimateIn(btn, { y: 10, duration: 500, easing: 'ease-out' });
            }, champTime + 1200));

            // Particules orbitales à champ+800ms
            this._fsWinnerTimers.push(setTimeout(() => {
                this._fsAnimateOrbitals();
            }, champTime + 800));

            // Reward bar à champ+1400ms (après le champion reveal)
            this._fsWinnerTimers.push(setTimeout(() => {
                const reward = document.querySelector('.reward-anim');
                if (reward) {
                    reward.classList.add('visible');
                }
            }, champTime + 1400));
        },

        _fsAnimateIn(el, { x = 0, y = 0, scale = 1, duration = 500, easing = 'ease-out' } = {}) {
            if (!el) return;
            const fromTransform = [];
            if (x !== 0) fromTransform.push(`translateX(${x}px)`);
            if (y !== 0) fromTransform.push(`translateY(${y}px)`);
            if (scale !== 1) fromTransform.push(`scale(${scale})`);

            const easingMap = {
                'back-out': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                'ease-out': 'cubic-bezier(0.22, 1, 0.36, 1)'
            };

            el.animate(
                [
                    { opacity: 0, transform: fromTransform.join(' ') || 'none' },
                    { opacity: 1, transform: 'translateX(0) translateY(0) scale(1)' }
                ],
                { duration, fill: 'forwards', easing: easingMap[easing] || easing }
            );
        },

        _fsExplodeChampion() {
            const burst = document.getElementById('fsBurst');
            if (!burst) return;
            burst.innerHTML = '';

            const NUM = 36;
            const colors = ['#f5d442', '#ffe88a', '#fff8dc', '#daa520', '#fff'];

            for (let i = 0; i < NUM; i++) {
                const p = document.createElement('div');
                p.className = 'fs-burst-particle';
                const size = 2 + Math.random() * 4;
                const col = colors[Math.floor(Math.random() * colors.length)];
                p.style.width = size + 'px';
                p.style.height = size + 'px';
                p.style.background = col;
                p.style.boxShadow = `0 0 ${4 + Math.random() * 5}px ${col}`;

                const angle = (Math.PI * 2 / NUM) * i + (Math.random() - 0.5) * 0.3;
                const dist = 120 + Math.random() * 100;
                const dur = 700 + Math.random() * 500;

                burst.appendChild(p);

                const anim = p.animate(
                    [
                        { opacity: 1, transform: 'translate(0, 0) scale(1.5)' },
                        { opacity: 0, transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px) scale(0)` }
                    ],
                    { duration: dur, fill: 'forwards', easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
                );
                anim.onfinish = () => p.remove();
            }
        },

        _fsAnimateOrbitals() {
            const container = document.getElementById('fsParticles');
            if (!container) return;
            container.innerHTML = '';

            const NUM = 14;
            const colors = ['#f5d442', '#ffe88a', '#fff8dc', '#daa520'];
            this._fsOrbitalAnims = [];

            for (let i = 0; i < NUM; i++) {
                const p = document.createElement('div');
                p.className = 'fs-particle';
                const size = 2 + Math.random() * 3;
                const col = colors[Math.floor(Math.random() * colors.length)];
                p.style.width = size + 'px';
                p.style.height = size + 'px';
                p.style.background = col;
                p.style.boxShadow = `0 0 ${4 + Math.random() * 4}px ${col}`;
                container.appendChild(p);

                const baseAngle = (Math.PI * 2 / NUM) * i;
                const radius = 95 + Math.random() * 25;
                const speed = 8000 + Math.random() * 6000;
                const direction = Math.random() > 0.5 ? 1 : -1;
                const delay = Math.random() * 3000;

                // Construction du keyframes orbital
                const keyframes = [];
                const steps = 24;
                for (let s = 0; s <= steps; s++) {
                    const progress = s / steps;
                    const angle = baseAngle + direction * Math.PI * 2 * progress;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    keyframes.push({
                        transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                        opacity: s === 0 ? 0 : (0.3 + 0.5 * Math.abs(Math.sin(progress * Math.PI * 2)))
                    });
                }

                const t = setTimeout(() => {
                    const anim = p.animate(keyframes, {
                        duration: speed,
                        iterations: Infinity,
                        easing: 'linear'
                    });
                    this._fsOrbitalAnims.push(anim);
                }, delay);
                this._fsWinnerTimers.push(t);
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
            
            // 💣 Sons BombAnime (placés dans src)
            this.sounds = {
                bombanimePass: this.createPreloadedSound('slash3.mp3'),
                bombanimeWrong: this.createPreloadedSound('wrong.mp3'),
                bombanimeUsed: this.createPreloadedSound('lock1.mp3'),
                bombanimeExplosion: this.createPreloadedSound('explode.mp3'),
                bombanimePlayerTurn: this.createPreloadedSound('playerturn.mp3'),
            };
            
            // 💣 Son tictac en boucle (instance unique, pas cloné)
            this.tictacSound = new Audio('tictac.mp3');
            this.tictacSound.loop = true;
            this.tictacSound.volume = 0.3;
            this.tictacSound.preload = 'auto';
            this.tictacSound.load();
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
            // 🔊 Muter/démuter le tictac en cours
            if (this.tictacSound) {
                if (this.soundMuted) {
                    this.tictacSound.pause();
                } else if (this.bombanime.active && this.bombanime.timeRemaining > 0) {
                    this.startBombTicking();
                }
            }
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
            
            // 🔊 Démarrer le tictac
            this.startBombTicking();
            
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
                
                // 🔊 Mettre à jour la vitesse du tictac
                this.updateTictacSpeed();
                
                if (this.bombanime.timeRemaining <= 0) {
                    clearInterval(this.bombanime.timerInterval);
                    clearInterval(this.bombanime.debugMsInterval);
                    this.bombanime.debugMs = 0;
                    this.stopBombTicking();
                    
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
        
        // 🔊 Démarrer le son tictac de la bombe
        startBombTicking() {
            if (!this.tictacSound || this.soundMuted || !this.bombanime.active) return;
            
            const maxVol = 0.18;
            this.tictacSound.volume = (this.soundVolume / 100) * maxVol;
            this.tictacSound.playbackRate = 1.0;
            this.tictacSound.currentTime = 0;
            this.tictacSound.play().catch(e => console.log('Tictac blocked:', e));
        },
        
        // 🔊 Arrêter le tictac
        stopBombTicking() {
            if (!this.tictacSound) return;
            this.tictacSound.pause();
            this.tictacSound.currentTime = 0;
        },
        
        // 🔊 Mettre à jour la vitesse du tictac selon l'état
        updateTictacSpeed() {
            if (!this.tictacSound || this.tictacSound.paused) return;
            
            const t = this.bombanime.timeRemaining;
            if (t <= 2) {
                this.tictacSound.playbackRate = 1.5;
            } else if (t <= 5) {
                this.tictacSound.playbackRate = 1.2;
            } else {
                this.tictacSound.playbackRate = 1.0;
            }
            
            // Mettre à jour le volume (respecter le slider)
            if (!this.soundMuted) {
                const maxVol = 0.18;
                this.tictacSound.volume = (this.soundVolume / 100) * maxVol;
            }
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
        
        // 🎌 Ouvrir la suggestion joueur (modal multi-lignes)
        openPlayerSuggestion() {
            if (this.bombanime.suggestionUsed) return;
            this.bombanime.suggestionLines = [''];
            this.bombanime.suggestionResult = '';
            this.bombanime.suggestionResultType = '';
            this.bombanime.suggestionSubmitting = false;
            this.bombanime.showSuggestionModal = true;
            // Focus sur le premier input après rendu
            this.$nextTick(() => {
                const firstInput = document.querySelector('.player-suggestion-line-input');
                if (firstInput) firstInput.focus();
            });
        },
        
        // 🎌 Fermer la suggestion joueur
        closePlayerSuggestion() {
            this.bombanime.showSuggestionModal = false;
            this.bombanime.suggestionLines = [''];
            this.bombanime.suggestionName = '';
            this.bombanime.suggestionResult = '';
            this.bombanime.suggestionResultType = '';
        },

        // 🎌 Ajouter une ligne de suggestion (max 5)
        addPlayerSuggestionLine() {
            if (this.bombanime.suggestionLines.length >= 5) return;
            this.bombanime.suggestionLines.push('');
            this.$nextTick(() => {
                const inputs = document.querySelectorAll('.player-suggestion-line-input');
                const lastInput = inputs[inputs.length - 1];
                if (lastInput) lastInput.focus();
            });
        },

        // 🎌 Supprimer une ligne de suggestion
        removePlayerSuggestionLine(idx) {
            if (this.bombanime.suggestionLines.length <= 1) return;
            this.bombanime.suggestionLines.splice(idx, 1);
        },

        // 🎌 Enter dans un input: si dernière ligne non vide, ajouter une nouvelle ligne (max 5)
        onPlayerSuggestEnter(idx) {
            const val = (this.bombanime.suggestionLines[idx] || '').trim();
            if (!val) return;
            if (idx === this.bombanime.suggestionLines.length - 1 && this.bombanime.suggestionLines.length < 5) {
                this.addPlayerSuggestionLine();
            }
        },
        
        // 🎌 Envoyer les suggestions joueur (multi-lignes)
        async submitPlayerSuggestion() {
            if (this.bombanime.suggestionUsed || this.bombanime.suggestionSubmitting) return;

            // Récupérer toutes les lignes non vides
            const names = this.bombanime.suggestionLines
                .map(n => (n || '').trim())
                .filter(n => n.length > 0);

            if (names.length === 0) {
                this.bombanime.suggestionResult = 'Ajoute au moins un nom de personnage.';
                this.bombanime.suggestionResultType = 'error';
                return;
            }

            this.bombanime.suggestionSubmitting = true;
            this.bombanime.suggestionResult = '';
            this.bombanime.suggestionResultType = '';

            const serie = this.bombanime.serie || 'Unknown';
            const submittedBy = this.twitchUsername || this.twitchId || 'Joueur';
            let successCount = 0;
            let errorCount = 0;

            for (const characterName of names) {
                try {
                    const response = await fetch('/bombanime/player-suggestion', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            anime: serie,
                            characterName: characterName,
                            submittedBy: submittedBy
                        })
                    });
                    const data = await response.json();
                    if (data.success) successCount++;
                    else errorCount++;
                } catch (err) {
                    console.error('Erreur suggestion:', err);
                    errorCount++;
                }
            }

            this.bombanime.suggestionSubmitting = false;

            if (errorCount === 0 && successCount > 0) {
                // Succès total : on marque comme utilisé (bouton disparaît)
                this.bombanime.suggestionUsed = true;
                sessionStorage.setItem('bombanimeSuggestionUsed', 'true');
                this.bombanime.suggestionResult = `✓ ${successCount} suggestion${successCount > 1 ? 's' : ''} envoyée${successCount > 1 ? 's' : ''}.`;
                this.bombanime.suggestionResultType = 'success';
                this.showNotification('Suggestions envoyées !', 'success');
                // Auto-close après 1.2s
                setTimeout(() => this.closePlayerSuggestion(), 1200);
            } else if (successCount > 0) {
                // Partiel : on marque quand même comme utilisé
                this.bombanime.suggestionUsed = true;
                sessionStorage.setItem('bombanimeSuggestionUsed', 'true');
                this.bombanime.suggestionResult = `${successCount} envoyée${successCount > 1 ? 's' : ''}, ${errorCount} erreur${errorCount > 1 ? 's' : ''}.`;
                this.bombanime.suggestionResultType = 'error';
            } else {
                this.bombanime.suggestionResult = 'Erreur réseau. Réessaie.';
                this.bombanime.suggestionResultType = 'error';
            }
        },
        
        // Obtenir ma position dans le cercle
        getBombanimeMyPosition() {
            return this.bombanime.playersOrder.indexOf(this.twitchId);
        },
        
        // 🖼️ Flash image personnage sur la bombe
        showBombanimeCharacterFlash(imageUrl, characterName) {
            const existing = document.getElementById('playerCharFlash');
            if (existing) existing.remove();
            
            const flash = document.createElement('div');
            flash.id = 'playerCharFlash';
            flash.className = 'character-flash';
            flash.innerHTML = `<img src="${imageUrl}" alt="${characterName}" draggable="false" onerror="this.parentElement.remove()"/>`;
            
            const bombWrapper = document.querySelector('.bomb-wrapper');
            if (bombWrapper) {
                bombWrapper.appendChild(flash);
            } else {
                const gameZone = document.querySelector('.bombanime-game-zone');
                if (gameZone) gameZone.appendChild(flash);
            }
            
            requestAnimationFrame(() => flash.classList.add('active'));
            setTimeout(() => flash.remove(), 850);
        },
        
        // 🖼️ Toggle images personnages
        toggleCharacterImages() {
            this.bombanime.showCharacterImages = !this.bombanime.showCharacterImages;
        },
        
        // Calculer la taille du cercle selon le nombre de joueurs
        getBombanimeCircleSize() {
            const playerCount = this.bombanime.playersData.length;
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            
            // Mobile portrait - cercle plus grand pour espacer les joueurs
            if (screenWidth <= 480) {
                const baseSize = playerCount <= 2 ? 190 : 280;
                const perPlayer = 18;
                return Math.min(screenWidth - 40, baseSize + (playerCount * perPlayer));
            }
            // Mobile paysage / petite tablette
            if (screenWidth <= 768 || screenHeight <= 500) {
                const baseSize = playerCount <= 2 ? 230 : 320;
                const perPlayer = 20;
                return Math.min(screenWidth - 60, baseSize + (playerCount * perPlayer));
            }
            // Tablette
            if (screenWidth <= 1024) {
                const baseSize = 420;
                const perPlayer = 18;
                return baseSize + (playerCount * perPlayer);
            }
            // Desktop (aligné avec admin)
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
            
            // Mobile - plus gros qu'avant
            if (screenWidth <= 480) {
                return Math.min(52, Math.max(40, 34 + (total * 1.2)));
            }
            // Tablette
            if (screenWidth <= 768) {
                return Math.min(58, Math.max(46, 38 + (total * 1.3)));
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
            
            // Radius aligné avec admin.js
            const bombSize = this.getBombSize();
            const screenWidth = window.innerWidth;
            let minDistanceFromBomb = 60 + (13 - total) * 5;
            // Mobile + peu de joueurs: rapprocher de la bombe
            if (screenWidth <= 480 && total <= 2) minDistanceFromBomb = 65;
            else if (screenWidth <= 768 && total <= 2) minDistanceFromBomb = 65;
            const baseRadius = (circleSize / 2) - hexSize - 20;
            const radius = Math.max(baseRadius, (bombSize / 2) + hexSize + minDistanceFromBomb);
            
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
                // 🔥 FIX: Retourner le dernier angle valide au lieu de 0
                return this._lastValidFuseAngle || 0;
            }
            
            const total = this.bombanime.playersData.length;
            
            // Même calcul que getBombanimePlayerStyle
            const offsetAngle = Math.PI / total;
            const angle = ((currentIndex / total) * 2 * Math.PI) - (Math.PI / 2) + offsetAngle;
            
            // Convertir en degrés pour CSS (0° = haut en CSS)
            const result = (angle * 180 / Math.PI) + 90;
            this._lastValidFuseAngle = result;
            return result;
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
                'BlackClover' : 'Black Clover',
                'Jojo': 'Jojo',
                'Hxh': 'Hunter x Hunter',
                'FairyTail': 'Fairy Tail',
                'Pokemon': 'Pokémon',
                'Fma' : 'Fullmetal Alchemist',
                'ChainsawMan' : 'Chainsaw Man',
                'Snk': 'Attack on Titan',
                'DemonSlayer': 'Demon Slayer',
                'JujutsuKaisen': 'Jujutsu Kaisen',
                'Reborn': 'Reborn',
                'DeathNote': 'Death Note',
                'Prota': 'Protagonist',
                'Manganime': 'Manganime'
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
    },

}).mount('#app');
