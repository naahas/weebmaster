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
            gameInProgress: sessionStorage.getItem('bombanimeInProgress') === 'true' || sessionStorage.getItem('collectInProgress') === 'true',
            gameStartedOnServer: false,
            gameEnded: false,

            // Lobby
            playerCount: 0,
            hasJoined: false,
            
            // Mode Rivalité
            lobbyMode: sessionStorage.getItem('collectInProgress') === 'true' ? 'collect' : (sessionStorage.getItem('bombanimeInProgress') === 'true' ? 'bombanime' : 'classic'), // 'classic' ou 'rivalry' ou 'fizzbuzz' ou 'collect'
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
            collectShakeError: false,
            joinCooldown: false,
            collectJoinPending: false,

            // Mode FizzBuzz
            fizzbuzzMaxLives: 1, // Nombre max de vies en FizzBuzz (1 ou 2)


            // Profil & Badges
            showProfileModal: false,
            currentTab: 'profile',
            titleSubTab: 'prefix',
            showShopModal: false,
            shopTab: 'prefix',
            shopItems: [],
            shopLoading: false,
            shopUserCoins: null,
            shopNotif: false,
            shopNotifText: '',
            shopConfirmItem: null,
            profileData: null,
            profileLoading: false,
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


            streamersLive: {
                MinoStreaming: false,
                pikinemadd: false,
                Mikyatc: false,
                luidjy_skyblex: false,
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

            // 🎴 État Collect
            collect: {
                active: sessionStorage.getItem('collectInProgress') === 'true',
                reconnecting: sessionStorage.getItem('collectInProgress') === 'true', // Waiting for server confirmation
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
                showCenterSlot: (() => { try { return !!JSON.parse(sessionStorage.getItem('collectState') || '{}').selectedStat; } catch(e) { return false; } })(),
                currentRound: 0,
                selectedStat: (() => { try { return JSON.parse(sessionStorage.getItem('collectState') || '{}').selectedStat || null; } catch(e) { return null; } })(),
                // 🆕 Drag & Drop
                draggingCardIndex: null,
                dropZoneActive: false,
                cardPlayed: (() => { try { return !!JSON.parse(sessionStorage.getItem('collectState') || '{}').cardPlayed; } catch(e) { return false; } })(),
                playedCardData: (() => { try { return JSON.parse(sessionStorage.getItem('collectState') || '{}').playedCardData || null; } catch(e) { return null; } })(),
                timer: 0,
                playersWhoPlayed: [],
                currentTurnId: null, // 🎴 Tour par tour: ID du joueur actif
                scanActive: false,      // 🔍 Scanner actif
                scanTargetId: null,     // 🔍 ID du joueur scanné
                scanCards: [],          // 🔍 Cartes révélées par le scan
                scanTimer: 0,           // 🔍 Timer restant du scan
                scanTimerProgress: 0,   // 🔍 Progress continu 0→1
                // 🎬 Actions Bar
                lastAction: null,           // Dernière action réalisée ('draw','swap','scan','throw')
                actionTriggered: false,      // Animation triggered en cours
                turnTimerProgress: 0, // 🎴 0 to 1, progress ring on choose indicator
                timerExpired: (() => { try { return !!JSON.parse(sessionStorage.getItem('collectState') || '{}').timerExpired; } catch(e) { return false; } })(),
                canDraw: false,  // 🎴 Deck: le joueur peut piocher
                cardsActive: false, // 🔒 Cartes draggables seulement quand timer actif
                timerProgress: 0, // 0 to 1, smooth progress for ring
                handSize: (() => { try { return JSON.parse(sessionStorage.getItem('collectState') || '{}').handSize || 3; } catch(e) { return 3; } })(),     // 🎴 Nombre de cartes en main (3 ou 5)
                marketCards: [],     // 🏪 Cartes du marché (4 cartes face visible)
                deckFullFlash: false,  // 🎴 Flash rouge quand main pleine
                drawChoiceVisible: false, // 🎴 Overlay de choix pioche visible
                drawCardsRevealed: false, // 🎴 Cartes de choix révélées (animation)
                drawOptions: [],   // 🎴 2 cartes proposées
                drawPicked: null,  // 🎴 Index de la carte choisie (0 ou 1)
            },

            // 🎮 SURVIE
            survie: {
                active: false,
                currentRound: 0,
                roundInProgress: false,
                alivePlayers: [],
                eliminatedPlayers: [],
                completedCount: 0,
                qualifiedCount: 0,
                toEliminateCount: 0,
                timer: 30,
                timeRemaining: 30,
                timerInterval: null,
                currentEpreuve: null,
                isEliminated: false,
                myPosition: null,
                showElimOverlay: false,
                elimPlayers: [],
                isQualified: false,
                npcs: [],
            },

            // 🗳️ POLL
            poll: {
                active: false,
                currentRound: 0,
                totalRounds: 0,
                currentMatchIndex: 0,
                totalMatches: 0,
                categoryName: '',
                perMatch: 2,
                bracketSize: 16,
                showNames: false,
                isTie: false,
                showNotifs: true,
                votersByChar: {},
                votersByChar: {},
                characters: [],
                myVote: null,
                votingOpen: false,
                showingResults: false,
                resultsVisible: false,   // Delayed flag for CSS animation
                timer: 15,
                timeRemaining: 15,
                timerInterval: null,
                voteCounts: {},
                totalVotes: 0,
                voteResults: null,
                winner: null,
                wasRandom: false,
                gameWinner: null,
                allCharacters: [],
            },

            // 🏔️ Ascension
            ascension: {
                active: false,
                floors: 15,
                timer: 15,
                currentFloor: 0,
                playerProgress: [],
                floorData: null,
                myFloor: 0,
                validated: false,
            },


            // Liste des partenaires (ordre d'affichage)
            partnersList: [ 
                { id: 'Mikyatc', name: 'Mikyatc', avatar: 'mikyatc.png' },
                { id: 'MinoStreaming', name: 'Mino', avatar: 'mino.png' },
                { id: 'Zogaa_', name: 'Zogaa', avatar: 'zogaa.png' },
                { id: 'pikinemadd', name: 'Pikinemad', avatar: 'pikine.png' },
                { id: 'luidjy_skyblex', name: 'Luidjy', avatar: 'luidjy.png' },
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
        // Bind give mode click handler
        this._onGiveSlotClick = this._handleGiveSlotClick.bind(this);
        
        // Restore winner banner if active (delayed to ensure DOM is ready)
        setTimeout(() => this._restoreWinnerBanner(), 1500);

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
        await this.loadLeaderboard();
        
        // 🎴 Restaurer l'état Collect instantanément depuis sessionStorage
        if (sessionStorage.getItem('collectInProgress') === 'true') {
            this.restoreCollectState();
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
                
                // 🔒 Re-sync état serveur immédiatement au retour d'onglet
                this._resyncServerState();

                if (this.gameInProgress && this.hasJoined && this.isAuthenticated) {
                    this.socket.emit('reconnect-player', {
                        twitchId: this.twitchId,
                        username: this.username
                    });
                }
                
                // 🎴 Collect : si la partie est active mais pas de cartes, redemander
                if (this.lobbyMode === 'collect' && this.hasJoined && this.twitchId) {
                    if (this.collect.active && (!this.collect.myCards || this.collect.myCards.length === 0) && !this._pendingCollectCards) {
                        console.log('🎴 Onglet visible + pas de cartes → redemande');
                        this.socket.emit('collect-request-my-cards', { twitchId: this.twitchId });
                    } else if (!this.collect.active) {
                        // Peut-être raté collect-game-started pendant le background
                        console.log('🎴 Onglet visible + collect pas active → vérification');
                        this.socket.emit('collect-reconnect', {
                            twitchId: this.twitchId,
                            username: this.username
                        });
                    }
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
        anyStreamerLive() {
            return Object.values(this.streamersLive).some(v => v === true);
        },

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

        filteredShopItems() {
            const typeMap = { prefix: 'title_prefix', suffix: 'title_suffix', avatar: 'avatar' };
            const targetType = typeMap[this.shopTab];
            return this.shopItems.filter(item => item.type === targetType);
        },

        allAvatars() {
            const avatars = [...this.defaultAvatars];
            if (this.profileData && this.profileData.purchasedAvatars) {
                this.profileData.purchasedAvatars.forEach(a => {
                    if (!avatars.some(d => d.url === a.url)) {
                        avatars.push({ id: a.id, name: a.name, url: a.url, locked: false, premium: true });
                    }
                });
            }
            return avatars;
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
        shopTab() {
            this.$nextTick(() => {
                // Move tab indicator
                this.moveShopTabIndicator();
                // Re-animate cards
                const items = document.querySelectorAll('.shop-item');
                items.forEach((el, i) => {
                    el.style.animation = 'none';
                    el.offsetHeight;
                    el.style.animation = 'shopCardSlideIn 0.4s cubic-bezier(0.16,1,0.3,1) both';
                    el.style.animationDelay = (i * 0.04) + 's';
                });
            });
        },
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
        },
        // 🎬 Actions bar — mount/update/destroy
        'collect.showCenterSlot'(val) {
            if (val) this.mountActionsBar();
            this.updateActionsBar();
        },
        'collect.active'(val) {
            if (!val) this.destroyActionsBar();
        },
        'collect.isMyTurn'() { this.updateActionsBar(); },
        'collect.lastAction'() { this.updateActionsBar(); },
        'collect.cardPlayed'() { this.updateActionsBar(); },
        'collect.actionTriggered'() { this.updateActionsBar(); }
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

            // Afficher le modal immédiatement avec un état loading
            this.profileData = null;
            this.showProfileModal = true;
            this.currentTab = 'profile';
            this.profileLoading = true;

            this.savedScrollY = window.scrollY;
            document.body.style.top = `-${this.savedScrollY}px`;
            document.body.classList.add('modal-open');

            // Charger les données en arrière-plan
            try {
                const response = await fetch(`/profile/${this.twitchId}`);
                const data = await response.json();

                this.profileData = data;
                this.profileLoading = false;

                if (data.user.avatar_url && data.user.avatar_url.includes('jtvnw.net')) {
                    this.twitchAvatarUrl = data.user.avatar_url;
                } else {
                    this.twitchAvatarUrl = data.user.twitch_avatar_url || null;
                }

                this.$nextTick(() => {
                    this.animateProfileOpen();
                    this.animateProfileCounters();
                });

            } catch (error) {
                console.error('❌ Erreur chargement profil:', error);
                this.profileLoading = false;
            }
        },

        closeProfile() {
            this.showProfileModal = false;
            this.profileData = null;
            
            document.body.classList.remove('modal-open');
            document.body.style.top = '';
            window.scrollTo(0, this.savedScrollY || 0);
        },


        animateProfileOpen() {
            // No animation needed - CSS handles it
        },

        // ========== AJOUTER switchProfileTab ==========
        switchProfileTab(tabName) {
            if (this.currentTab === tabName) return;
            this.currentTab = tabName;
        },

        // ========== AJOUTER animateProfileTabContent ==========
        // animateProfileTabContent - disabled for performance
        animateProfileTabContent(tabName) {
            if (tabName === 'profile') {
                this.animateProfileCounters();
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
            // Simple visual feedback without anime.js
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
                    const profileResponse = await fetch(`/profile/${this.twitchId}`);
                    this.profileData = await profileResponse.json();
                }
            } catch (error) {
                console.error('❌ Erreur équipement titre:', error);
            }
        },

        async equipPrefix(prefixName) {
            try {
                const response = await fetch('/profile/equip-prefix', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        twitchId: this.twitchId,
                        prefix: prefixName
                    })
                });
                const data = await response.json();
                if (data.success) {
                    const profileResponse = await fetch(`/profile/${this.twitchId}`);
                    this.profileData = await profileResponse.json();
                }
            } catch (error) {
                console.error('❌ Erreur équipement préfixe:', error);
            }
        },

        async equipSuffix(suffixName) {
            try {
                const response = await fetch('/profile/equip-suffix', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        twitchId: this.twitchId,
                        suffix: suffixName
                    })
                });
                const data = await response.json();
                if (data.success) {
                    const profileResponse = await fetch(`/profile/${this.twitchId}`);
                    this.profileData = await profileResponse.json();
                }
            } catch (error) {
                console.error('❌ Erreur équipement suffixe:', error);
            }
        },

        // ========== BOUTIQUE ==========
        async openShop() {
            this.showShopModal = true;
            this.shopLoading = true;
            this.shopTab = 'prefix';
            document.body.classList.add('modal-open');

            try {
                const shopRes = await fetch(`/shop${this.twitchId ? '?twitchId=' + this.twitchId : ''}`);
                this.shopItems = await shopRes.json();

                if (this.twitchId) {
                    const coinsRes = await fetch(`/coins/${this.twitchId}`);
                    const coinsData = await coinsRes.json();
                    this.shopUserCoins = coinsData.coins || 0;
                } else {
                    this.shopUserCoins = null;
                }
            } catch (error) {
                console.error('❌ Erreur chargement boutique:', error);
            }

            this.shopLoading = false;
            this.$nextTick(() => this.moveShopTabIndicator());
        },

        closeShop() {
            this.showShopModal = false;
            document.body.classList.remove('modal-open');
        },

        moveShopTabIndicator() {
            const tabMap = { prefix: 'shopTabPrefix', suffix: 'shopTabSuffix', avatar: 'shopTabAvatar' };
            const tabEl = this.$refs[tabMap[this.shopTab]];
            const indicator = this.$refs.shopTabIndicator;
            const bar = this.$refs.shopTabsBar;
            if (!tabEl || !indicator || !bar) return;
            const tabRect = tabEl.getBoundingClientRect();
            const barRect = bar.getBoundingClientRect();
            indicator.style.left = (tabRect.left - barRect.left + 8) + 'px';
            indicator.style.width = (tabRect.width - 16) + 'px';
        },

        shopTabPrev() {
            const tabs = ['prefix', 'suffix', 'avatar'];
            const i = tabs.indexOf(this.shopTab);
            if (i > 0) this.shopTab = tabs[i - 1];
        },

        shopTabNext() {
            const tabs = ['prefix', 'suffix', 'avatar'];
            const i = tabs.indexOf(this.shopTab);
            if (i < tabs.length - 1) this.shopTab = tabs[i + 1];
        },

        showShopNotif(msg) {
            this.shopNotifText = msg;
            this.shopNotif = true;
            setTimeout(() => { this.shopNotif = false; }, 2500);
        },

        async buyItem(item) {
            if (item.owned || item.locked) return;

            if (!this.isAuthenticated) {
                this.showShopNotif('Connecte-toi pour acheter des articles');
                return;
            }

            if (this.shopUserCoins < item.price) {
                this.showShopNotif('Pas assez de S-Coins');
                return;
            }

            this.shopConfirmItem = item;
        },

        async confirmBuy() {
            const item = this.shopConfirmItem;
            if (!item) return;
            this.shopConfirmItem = null;

            try {
                const response = await fetch('/shop/purchase', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        twitchId: this.twitchId,
                        itemId: item.id
                    })
                });

                const data = await response.json();

                if (data.success) {
                    item.owned = true;
                    this.shopUserCoins = data.balance;
                    this.showShopNotif('Achat effectue !');
                } else {
                    this.showShopNotif(data.error || 'Erreur lors de l\'achat');
                }
            } catch (error) {
                console.error('❌ Erreur achat:', error);
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

                const response = await fetch('/leaderboard?limit=3');
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
                
                // Resync hasJoined pour collect lobby
                if (state.isActive && !state.inProgress && state.lobbyMode === 'collect' && this.isAuthenticated) {
                    const isInPlayerList = state.players && state.players.some(p => p.twitchId === this.twitchId);
                    if (isInPlayerList && !this.hasJoined) {
                        console.log('🔄 Resync: joueur trouvé dans lobby serveur → hasJoined=true');
                        this.hasJoined = true;
                    }
                }
                
                this.playerCount = state.playerCount;
                
                // 🎮 Resync bonusEnabled
                if (state.bonusEnabled !== undefined) {
                    this.bonusEnabled = state.bonusEnabled;
                }
                
                // 🏔️ Resync Ascension
                if (state.isActive && state.inProgress && state.lobbyMode === 'ascension' && this.isAuthenticated && this.hasJoined) {
                    this.socket.emit('ascension-reconnect', { twitchId: this.twitchId });
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
                if (state.lobbyMode !== 'collect') {
                    sessionStorage.removeItem('collectInProgress');
                    sessionStorage.removeItem('collectState');
                    this.collect.active = false;
                    this.collect.reconnecting = false;
                    if (this.lobbyMode === 'collect') {
                        this.lobbyMode = state.lobbyMode || 'classic';
                    }
                }
                
                // 🎴 FIX: Valider hasJoined pour Collect lobby (sessionStorage peut survivre après game-deactivated)
                if (this.isAuthenticated && state.lobbyMode === 'collect' && !state.inProgress) {
                    const isInPlayerList = state.players && state.players.some(p => p.twitchId === this.twitchId);
                    if (isInPlayerList) {
                        // Le joueur est bien dans le lobby serveur → auto-rejoin après reconnexion socket
                        this.hasJoined = true;
                        this.shouldRejoinLobby = true;
                        console.log('✅ Collect: joueur confirmé dans le lobby serveur → auto-rejoin');
                    } else if (this.hasJoined) {
                        // hasJoined périmé (sessionStorage stale) → nettoyer
                        console.log('🧹 Collect: hasJoined périmé - joueur absent du lobby serveur');
                        this.hasJoined = false;
                        sessionStorage.removeItem('collectInProgress');
                        sessionStorage.removeItem('collectState');
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
                        sessionStorage.removeItem('collectInProgress');
                        sessionStorage.removeItem('collectState');
                    }
                }

                if (state.inProgress && this.hasJoined) {
                    // 🎴 En mode Collect, vérifier que le joueur est vraiment dans la partie
                    if (state.lobbyMode === 'collect' && !this.collect.active) {
                        this.gameInProgress = false;
                    // 🎮 En mode Survie, restaurer l'état survie
                    } else if (state.lobbyMode === 'survie') {
                        if (state.survie && state.survie.active) {
                            this.survie.active = true;
                            this.survie.currentRound = state.survie.currentRound;
                            this.survie.roundInProgress = state.survie.roundInProgress;
                            this.survie.alivePlayers = state.survie.alivePlayers || [];
                            this.survie.eliminatedPlayers = state.survie.eliminatedPlayers || [];
                            this.survie.completedCount = state.survie.completedCount || 0;
                            this.survie.qualifiedCount = state.survie.qualifiedCount || 0;
                            this.survie.toEliminateCount = state.survie.toEliminateCount || 0;
                            this.survie.timer = state.survie.timer || 30;
                            this.survie.currentEpreuve = state.survie.currentEpreuve;
                            this.survie.npcs = state.survie.npcs || [];
                            this.survie.quests = state.survie.quests || [];
                            this.survie.groundItems = state.survie.groundItems || [];
                            if (state.survie.boosts) this.survie.boosts = state.survie.boosts;
                            if (state.survie.questItems) this.survie.questItems = state.survie.questItems;
                            if (state.survie.gameStartedAt) this.survie.gameStartedAt = state.survie.gameStartedAt;
                            
                            // Restore player's saved quest state from server
                            if (state.survie.playerQuestStates && this.twitchId && state.survie.playerQuestStates[this.twitchId]) {
                                this.survie.savedQuestState = state.survie.playerQuestStates[this.twitchId];
                                console.log('📋 Resync: saved quest state found for', this.twitchId);
                            }
                            
                            this.survie.isEliminated = false;
                            
                            this.gameInProgress = true;
                            document.body.classList.add('game-active');
                            
                            if (state.survie.roundInProgress && state.survie.timeRemaining > 0) {
                                this.startSurvieTimer(state.survie.timeRemaining);
                            }
                            
                            // Init canvas after Vue renders
                            this.$nextTick(() => {
                                this.initSurvieCanvas();
                                this._restoreWinnerBanner();
                                
                            });
                        } else {
                            // Survie terminée mais lobby encore ouvert
                            this.survie.active = true;
                            this.survie.npcs = state.survie?.npcs || [];
                            this.gameInProgress = true;
                            document.body.classList.add('game-active');
                            this.$nextTick(() => {
                                this.initSurvieCanvas();
                                this._restoreWinnerBanner();
                                
                            });
                        }
                    // 🗳️ En mode Poll, restaurer l'état poll
                    } else if (state.lobbyMode === 'poll') {
                        if (state.poll && state.poll.active) {
                            this.poll.active = true;
                            this.poll.categoryName = state.poll.categoryName || '';
                            this.poll.currentRound = state.poll.currentRound || 0;
                            this.poll.totalRounds = state.poll.totalRounds || 0;
                            this.poll.currentMatchIndex = state.poll.currentMatchIndex || 0;
                            this.poll.totalMatches = state.poll.totalMatches || 0;
                            this.poll.votingOpen = state.poll.votingOpen || false;
                            this.poll.showingResults = state.poll.showingResults || false;
                            this.poll.showNames = state.poll.showNames !== undefined ? state.poll.showNames : false;
                            this.poll.allCharacters = state.poll.allCharacters || [];
                            this.poll.gameWinner = state.poll.winner || null;
                            
                            if (state.poll.currentMatch) {
                                this.poll.characters = state.poll.currentMatch.characters || [];
                                this.poll.myVote = state.poll.currentMatch.myVote || null;
                                this.poll.voteResults = state.poll.currentMatch.voteResults || null;
                                this.poll.winner = state.poll.currentMatch.winner || null;
                                this.poll.wasRandom = state.poll.currentMatch.wasRandom || false;
                                this.poll.isTie = state.poll.currentMatch.isTie || false;
                            }
                            
                            // Restore results visibility
                            if (state.poll.showingResults && state.poll.currentMatch && state.poll.currentMatch.voteResults) {
                                this.$nextTick(() => {
                                    this.poll.resultsVisible = true;
                                    const fill = this.$refs.pollTimerFill;
                                    if (fill) {
                                        fill.classList.add('poll-p-timer-shattered');
                                        fill.style.opacity = '0';
                                    }
                                });
                            }
                            
                            this.gameInProgress = true;
                            document.body.classList.add('game-active');
                            
                            if (state.poll.votingOpen && state.poll.timeRemaining > 0) {
                                this.poll.timer = state.poll.timer || 15;
                                this.startPollTimer(state.poll.timeRemaining, state.poll.endTime);
                            }
                        } else {
                            this.gameInProgress = false;
                        }
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
            
            // ═══ Permanent survie listeners (bound once, never removed) ═══
            this.socket.on('survie-interact-result', (data) => {
                if (!this.survie?.active) return;
                console.log('📨 Interact result:', data.npcId, 'questDialogue:', data.questDialogue ? 'OUI' : 'NON', 'update:', data.questUpdate);
                
                // Update quest UI
                if (data.questState) {
                    this.updateQuestListUI(data.questState);
                }
                
                // Show quest dialogue if any (overrides default)
                if (data.questDialogue) {
                    const overlay = document.getElementById('survieDialogueOverlay');
                    const text = document.getElementById('survieDialogueText');
                    if (overlay && text) {
                        // Convert **word** to highlighted spans
                        const parsed = data.questDialogue.replace(/\*\*(.+?)\*\*/g, '<span class="quest-highlight">$1</span>');
                        // Strip ** for typewriter char counting
                        const rawText = data.questDialogue.replace(/\*\*/g, '');
                        text.innerHTML = '';
                        let charIndex = 0;
                        if (this._typewriterInterval) clearInterval(this._typewriterInterval);
                        this._typewriterInterval = setInterval(() => {
                            if (charIndex < rawText.length) {
                                // Build partial text with highlights
                                const partial = data.questDialogue.replace(/\*\*(.+?)\*\*/g, '<span class="quest-highlight">$1</span>');
                                // Slice raw text to charIndex, but render with HTML
                                let shown = 0, htmlOut = '', inTag = false;
                                for (let ci = 0; ci < parsed.length; ci++) {
                                    if (parsed[ci] === '<') inTag = true;
                                    if (inTag) { htmlOut += parsed[ci]; if (parsed[ci] === '>') inTag = false; continue; }
                                    if (shown <= charIndex) { htmlOut += parsed[ci]; shown++; } else break;
                                }
                                text.innerHTML = htmlOut + '<span class="typing-cursor"></span>';
                                charIndex++;
                            } else {
                                text.innerHTML = parsed;
                                clearInterval(this._typewriterInterval);
                                this._typewriterInterval = null;
                            }
                        }, 15);
                    }
                }
                
                // Update inventory UI
                if (data.itemGiven) {
                    this._addItemToInventory(data.itemGiven);
                }
                if (data.itemTaken) {
                    this._removeItemFromInventory(data.itemTaken);
                }
                
                // Hide NPC from canvas (ESCORT quest)
                if (data.questUpdate?.hideNpc && this._survieCanvas) {
                    this._survieCanvas.removeNPC(data.questUpdate.hideNpc);
                }
                
                // Check if all quests completed
                if (data.completedCount >= data.totalQuests) {
                    console.log('🏆 Toutes les quêtes complétées !');
                }
                
                // Handle awaiting give — enter inventory selection mode
                if (data.questUpdate?.awaitingGive) {
                    this._enterGiveMode(data.npcId, data.questUpdate.questId, data.questUpdate.requiredItems, data.questUpdate.requiredCount, data.questUpdate.requiredImageUrls);
                }
            });
            
            // ═══ Give items result ═══
            this.socket.on('survie-give-result', (data) => {
                if (!this.survie?.active) return;
                console.log('🎁 Give result:', data.questId, data.questDialogue ? 'OUI' : 'NON');
                this._playSound('pickup');
                
                // Exit give mode
                this._exitGiveMode();
                
                // Update quest UI
                if (data.questState) {
                    this.updateQuestListUI(data.questState);
                }
                
                // Show final dialogue
                if (data.questDialogue) {
                    const text = document.getElementById('survieDialogueText');
                    if (text) {
                        const parsed = data.questDialogue.replace(/\*\*(.+?)\*\*/g, '<span class="quest-highlight">$1</span>');
                        const rawText = data.questDialogue.replace(/\*\*/g, '');
                        text.innerHTML = '';
                        let charIndex = 0;
                        if (this._typewriterInterval) clearInterval(this._typewriterInterval);
                        this._typewriterInterval = setInterval(() => {
                            if (charIndex < rawText.length) {
                                let shown = 0, htmlOut = '', inTag = false;
                                for (let ci = 0; ci < parsed.length; ci++) {
                                    if (parsed[ci] === '<') inTag = true;
                                    if (inTag) { htmlOut += parsed[ci]; if (parsed[ci] === '>') inTag = false; continue; }
                                    if (shown <= charIndex) { htmlOut += parsed[ci]; shown++; } else break;
                                }
                                text.innerHTML = htmlOut + '<span class="typing-cursor"></span>';
                                charIndex++;
                            } else {
                                text.innerHTML = parsed;
                                clearInterval(this._typewriterInterval);
                                this._typewriterInterval = null;
                            }
                        }, 15);
                    }
                }
                
                // Add/remove items
                if (data.itemGiven) {
                    this._addItemToInventory(data.itemGiven);
                }
                if (data.itemsTaken) {
                    data.itemsTaken.forEach(itemId => this._removeItemFromInventory(itemId));
                }
            });
            
            this.socket.on('survie-pickup-result', (data) => {
                if (!this.survie?.active) return;
                console.log('📦 Pickup result:', data.groundItemId, data.itemData?.name);
                this._playSound('pickup');
                
                // Update quest UI
                if (data.questState) {
                    this.updateQuestListUI(data.questState);
                }
                
                // Fix slot itemId — replace ground item ID with real quest item ID
                if (data.itemData && data.groundItemId) {
                    for (let i = 1; i <= 12; i++) {
                        const slot = document.getElementById(`survieSlot${i}`);
                        if (slot && slot.dataset.itemId === data.groundItemId) {
                            slot.dataset.itemId = data.itemData.id;
                            slot.dataset.itemName = data.itemData.name || data.itemData.id;
                            break;
                        }
                    }
                }
            });
            
            // Listen for boost picked by another player
            this.socket.on('survie-boost-picked', (data) => {
                if (!this._survieCanvas) return;
                console.log('⚡ Boost picked by other player:', data.boostId);
                const boost = this._survieCanvas.boosts.find(b => b.id === data.boostId);
                if (boost && !boost.picked) {
                    boost.picked = true;
                    // Show shatter animation even for other players
                    const shardColors = [
                        'rgba(180, 220, 255, 0.9)', 'rgba(140, 180, 255, 0.8)',
                        'rgba(200, 240, 255, 0.9)', 'rgba(100, 200, 255, 0.8)',
                        'rgba(160, 140, 255, 0.7)', 'rgba(220, 200, 255, 0.8)',
                    ];
                    const shards = [];
                    for (let k = 0; k < 14; k++) {
                        shards.push({
                            angle: (Math.PI * 2 / 14) * k + (Math.random() - 0.5) * 0.4,
                            speed: 150 + Math.random() * 200,
                            size: 5 + Math.random() * 7,
                            rotSpeed: 6 + Math.random() * 10,
                            color: shardColors[k % shardColors.length],
                        });
                    }
                    this._survieCanvas.boostShatters.push({ x: boost.x, y: boost.y, time: performance.now(), shards });
                }
            });
            
            // Listen for new boost spawned by server
            this.socket.on('survie-boost-spawn', (data) => {
                if (!this._survieCanvas) return;
                console.log('⚡ New boost spawned:', data.id);
                this._survieCanvas.addBoost(data.id, data.x * 38000, data.y * 24000);
            });
            
            // Listen for player finishing all quests
            this.socket.on('survie-player-finished', (data) => {
                console.log(`🏆 ${data.username} a terminé ! Rang: ${data.rank}`);
                // Don't show notification during countdown (winner banner visible)
                if (!document.getElementById('survieWinnerBanner')) {
                    this._showFinishNotification(data.username, data.rank);
                }
            });
            
            // Listen for winner (first to finish)
            this.socket.on('survie-winner', (data) => {
                console.log(`🥇 WINNER: ${data.username}`);
                this._showWinnerBanner(data);
            });
            
            // Listen for game over (60s after first winner)
            this.socket.on('survie-game-over', (data) => {
                console.log('🏆 Game over!', data);
                this._showVictoryOverlay(data);
            });

            // ═══ 🗳️ POLL - Socket Listeners ═══
            
            this.socket.on('poll-game-started', (data) => {
                console.log('🗳️ Poll game started:', data);
                this.gameStartedOnServer = true;
                
                if (!this.hasJoined) {
                    this.gameInProgress = false;
                    return;
                }
                
                this.poll.active = true;
                this.poll.categoryName = data.categoryName;
                this.poll.perMatch = data.perMatch;
                this.poll.bracketSize = data.bracketSize;
                this.poll.showNames = data.showNames !== undefined ? data.showNames : false;
                this.poll.totalRounds = data.totalRounds;
                this.poll.totalMatches = data.totalMatches;
                this.poll.allCharacters = data.allCharacters || [];
                this.poll.currentRound = 0;
                this.poll.currentMatchIndex = 0;
                this.poll.gameWinner = null;
                this.gameInProgress = true;
                this.gameEnded = false;
                
                document.body.classList.add('game-active');
            });
            
            this.socket.on('poll-match-start', (data) => {
                console.log('🗳️ Match start:', data);
                this.poll.currentRound = data.round;
                this.poll.currentMatchIndex = data.matchIndex;
                this.poll.totalMatches = data.totalMatches;
                this.poll.totalRounds = data.totalRounds;
                this.poll.characters = data.characters;
                this.poll.votingOpen = true;
                this.poll.showingResults = false;
                this.poll.resultsVisible = false;
                this.poll.myVote = null;
                this.poll.winner = null;
                this.poll.wasRandom = false;
                this.poll.isTie = false;
                this.poll.voteResults = null;
                this.poll.voteCounts = {};
                this.poll.votersByChar = {};
                this.poll.votersByChar = {};
                this.poll.totalVotes = 0;
                this.poll.timer = data.timer;
                this.poll.timeRemaining = data.timer;
                this.poll._shattered = false;
                
                // Start countdown (handles fill bar CSS transition internally)
                this.startPollTimer(data.timer, data.endTime);
            });
            
            this.socket.on('poll-vote-update', (data) => {
                this.poll.voteCounts = data.voteCounts;
                this.poll.totalVotes = data.totalVotes;
                if (data.votersByChar) this.poll.votersByChar = data.votersByChar;
            });
            
            this.socket.on('poll-vote-confirmed', (data) => {
                this.poll.myVote = data.characterId;
            });
            
            // Vote notification from other players
            this.socket.on('poll-vote-notif', (data) => {
                this.pollSpawnVoteNotif(data.username, data.avatar);
            });
            
            this.socket.on('poll-match-result', (data) => {
                console.log('🗳️ Match result:', data);
                this.poll.votingOpen = false;
                this.poll.showingResults = true;
                this.poll.voteResults = data.voteResults;
                this.poll.totalVotes = data.totalVotes;
                this.poll.winner = data.winner;
                this.poll.isTie = data.isTie || false;
                this.poll.wasRandom = false;
                this.poll.resultsVisible = false;
                if (data.votersByChar) this.poll.votersByChar = data.votersByChar;
                this.stopPollTimer();
                if (!this.poll._shattered) {
                    this.pollShatterTimer();
                }
                // Winner reveal + particles + sound — immediate with shatter
                if (data.winner && !data.isTie) {
                    this.$nextTick(() => {
                        const winnerRef = this.$refs['pollCard_' + data.winner.id];
                        const winnerEl = Array.isArray(winnerRef) ? winnerRef[0] : winnerRef;
                        if (winnerEl) {
                            this.pollSpawnParticles(winnerEl);
                        }
                        this.pollPlayWinSound();
                    });
                }
                // Tie sound
                if (data.isTie && !data.winner) {
                    this.pollPlayTieSound();
                }
                // Results percentages — delayed for stagger effect
                setTimeout(() => {
                    this.poll.resultsVisible = true;
                }, 500);
            });
            
            // Tie resolved by admin
            this.socket.on('poll-tie-resolved', (data) => {
                console.log('🗳️ Tie resolved:', data);
                this.poll.winner = data.winner;
                this.poll.isTie = false;
                // Winner animation — particles + sound
                this.$nextTick(() => {
                    const winnerRef = this.$refs['pollCard_' + data.winner.id];
                    const winnerEl = Array.isArray(winnerRef) ? winnerRef[0] : winnerRef;
                    if (winnerEl) {
                        this.pollSpawnParticles(winnerEl);
                    }
                    this.pollPlayWinSound();
                });
            });
            
            this.socket.on('poll-round-start', (data) => {
                console.log('🗳️ Round start:', data);
                this.poll.currentRound = data.round;
            });
            
            this.socket.on('poll-game-ended', (data) => {
                console.log('🏆 Poll ended:', data);
                this.poll.gameWinner = data.winner;
                this.poll.votingOpen = false;
                this.poll.showingResults = false;
                // Spawn victory sparkles after render
                this.$nextTick(() => {
                    setTimeout(() => this.pollSpawnVictorySparkles(), 400);
                });
            });
            
            this.socket.on('poll-state', (data) => {
                if (!data) return;
                console.log('🗳️ Poll state restored:', data);
                this.poll.active = data.active;
                this.poll.categoryName = data.categoryName;
                this.poll.showNames = data.showNames !== undefined ? data.showNames : false;
                this.poll.currentRound = data.currentRound;
                this.poll.totalRounds = data.totalRounds;
                this.poll.currentMatchIndex = data.currentMatchIndex;
                this.poll.totalMatches = data.totalMatches;
                this.poll.votingOpen = data.votingOpen;
                this.poll.showingResults = data.showingResults;
                this.poll.allCharacters = data.allCharacters || [];
                this.poll.gameWinner = data.winner;
                if (data.currentMatch) {
                    this.poll.characters = data.currentMatch.characters;
                    this.poll.myVote = data.currentMatch.myVote;
                    this.poll.voteResults = data.currentMatch.voteResults;
                    this.poll.winner = data.currentMatch.winner;
                    this.poll.wasRandom = data.currentMatch.wasRandom || false;
                    this.poll.isTie = data.currentMatch.isTie || false;
                }
                // Restore results visibility
                if (data.showingResults && data.currentMatch && data.currentMatch.voteResults) {
                    this.$nextTick(() => {
                        this.poll.resultsVisible = true;
                        // Hide timer fill during results
                        const fill = this.$refs.pollTimerFill;
                        if (fill) {
                            fill.classList.add('poll-p-timer-shattered');
                            fill.style.opacity = '0';
                        }
                    });
                }
                if (data.votingOpen && data.timeRemaining > 0) {
                    this.poll.timer = data.timer || 15;
                    this.startPollTimer(data.timeRemaining, data.endTime);
                } else if (!data.votingOpen && !data.showingResults) {
                    // Timer ended but no results yet — hide fill
                    this.$nextTick(() => {
                        const fill = this.$refs.pollTimerFill;
                        if (fill) { fill.style.visibility = 'hidden'; }
                    });
                }
            });

            // Événements de connexion
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
                
                // 🎴 Demander la reconnexion Collect si une partie était en cours
                const collectWasInProgress = sessionStorage.getItem('collectInProgress');
                if (collectWasInProgress === 'true' && !this.shouldRejoinLobby) {
                    console.log('🎴 Tentative de reconnexion Collect...');
                    this.gameInProgress = true; // Optimiste — évite le flash "Partie en cours"
                    this.socket.emit('collect-reconnect', {
                        twitchId: this.twitchId,
                        username: this.username
                    });
                    
                    // Timeout de sécurité: si pas de réponse en 1.5s, la partie est probablement terminée
                    this._collectReconnectTimeout = setTimeout(() => {
                        if (!this.collect.myCards || this.collect.myCards.length === 0) {
                            console.log('🎴 Reconnexion Collect expirée - partie probablement terminée');
                            sessionStorage.removeItem('collectInProgress');
                            sessionStorage.removeItem('collectState');
                            this.collect.active = false;
                            this.collect.reconnecting = false;
                            this.gameInProgress = false;
                            this.lobbyMode = 'classic';
                            this.hasJoined = false;
                        }
                    }, 1500);
                }
                // 🎴 FIX: Si joueur dans lobby collect mais a raté collect-game-started (race condition socket)
                // Seulement si une partie était en cours côté serveur (pas en lobby)
                else if (this.hasJoined && this.lobbyMode === 'collect' && !this.collect.active && this.gameStartedOnServer) {
                    console.log('🎴 Lobby collect détecté sans partie active → vérification auprès du serveur...');
                    // Cacher le modal "partie en cours" immédiatement (optimiste)
                    this.gameInProgress = true;
                    this.socket.emit('collect-reconnect', {
                        twitchId: this.twitchId,
                        username: this.username
                    });
                    
                    // Timeout: si le serveur ne répond pas, c'est que la game n'a pas encore commencé
                    this._collectReconnectTimeout = setTimeout(() => {
                        if (!this.collect.active) {
                            console.log('🎴 Pas de partie Collect en cours - lobby normal');
                            this.gameInProgress = false;
                            this.collect.reconnecting = false;
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
                sessionStorage.removeItem('collectInProgress');
                sessionStorage.removeItem('collectState');
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
                if (typeof this.endTeamCooldown === 'function') this.endTeamCooldown();
                
                // 🎮 Reset Survie
                this.survie.active = false;
                this.survie.currentRound = 0;
                this.survie.roundInProgress = false;
                this.survie.alivePlayers = [];
                this.survie.eliminatedPlayers = [];
                this.survie.completedCount = 0;
                this.survie.qualifiedCount = 0;
                this.survie.toEliminateCount = 0;
                this.survie.npcs = [];
                this.survie.quests = [];
                this.survie.groundItems = [];
                this.survie.boosts = [];
                this.survie.questItems = {};
                this.survie.savedQuestState = null;
                this.survie.isEliminated = false;
                this.survie.isQualified = false;
                this.survie.currentEpreuve = null;
                this.survie.showElimOverlay = false;
                this._questState = null;
                this.stopSurvieTimer();
                this.destroySurvieCanvas();
                document.body.classList.remove('game-active');
                
                // 🗳️ Reset Poll
                this.poll.active = false;
                this.poll.currentRound = 0;
                this.poll.totalRounds = 0;
                this.poll.characters = [];
                this.poll.myVote = null;
                this.poll.votingOpen = false;
                this.poll.showingResults = false;
                this.poll.resultsVisible = false;
                this.poll.voteResults = null;
                this.poll.winner = null;
                this.poll.gameWinner = null;
                this.poll.isTie = false;
                this.poll.allCharacters = [];
                this.poll._shattered = false;
                this.poll._endTime = null;
                this.stopPollTimer();
                
                // Force cleanup after Vue re-render
                this.$nextTick(() => {
                    const inv = document.getElementById('survieInventory');
                    if (inv) inv.remove();
                    const ql = document.getElementById('survieQuestList');
                    if (ql) ql.remove();
                    const qm = document.getElementById('survieQuestModal');
                    if (qm) qm.remove();
                    const dl = document.getElementById('survieDialogueOverlay');
                    if (dl) dl.remove();
                    const mm = document.getElementById('survieMinimap');
                    if (mm) mm.remove();
                });

                // Arrêter le timer si actif
                this.stopTimer();

                this.resetComboSystem();

                // Nettoyer localStorage et sessionStorage
                localStorage.removeItem('hasJoinedLobby');
                localStorage.removeItem('lobbyTwitchId');
                localStorage.removeItem('selectedTeam');
                localStorage.removeItem('teamCooldownEnd');
                sessionStorage.removeItem('wasKicked'); // 🆕 Clear kick flag pour prochaine partie
                sessionStorage.removeItem('collectInProgress');
                sessionStorage.removeItem('collectState');
                
                // 🎴 Reset Collect
                this.collect.active = false;

                // 💣 Reset BombAnime
                this.cleanupBombanimeEffects();
                this.bombanime.active = false;
                sessionStorage.removeItem('bombanimeInProgress');
                sessionStorage.removeItem('bombanimeSuggestionUsed');
                
                // 🏆 Reset winner banner
                sessionStorage.removeItem('survieWinnerEndTime');
                sessionStorage.removeItem('survieWinnerName');
                sessionStorage.removeItem('survieIntroShown');
                const winBanner = document.getElementById('survieWinnerBanner');
                if (winBanner) winBanner.remove();
                if (this._winnerCountdownInterval) {
                    clearInterval(this._winnerCountdownInterval);
                    this._winnerCountdownInterval = null;
                }
                const vicOverlay = document.getElementById('survieVictoryOverlay');
                if (vicOverlay) vicOverlay.remove();
                
                // Clean all survie UI elements
                ['survieIntro', 'survieQuestComplete', 'survieQuestModalMobile', 'survieQuestBackdrop', 'survieMinimap', 'survieQuestList'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.remove();
                });
                document.body.classList.remove('survie-intro-active');
                
                // 🗺️ Reset Survie
                if (this.survie.active) {
                    this.survie.active = false;
                    this.destroySurvieCanvas();
                }
                this._questState = null;

                this.showNotification('Le jeu a été désactivé', 'info');
            });

            this.socket.on('game-started', (data) => {
                // Ignorer en mode BombAnime (géré par bombanime-game-started)
                if (this.lobbyMode === 'bombanime') {
                    console.log('🎮 game-started ignoré en mode BombAnime');
                    return;
                }
                // Ignorer en mode Survie (géré par survie-game-started)
                if (this.lobbyMode === 'survie') {
                    console.log('🎮 game-started ignoré en mode Survie');
                    return;
                }
                // Ignorer en mode Poll (géré par poll-game-started)
                if (this.lobbyMode === 'poll') {
                    console.log('🎮 game-started ignoré en mode Poll');
                    return;
                }
                // Ignorer en mode Ascension (géré par ascension-game-started)
                if (this.lobbyMode === 'ascension') {
                    console.log('🎮 game-started ignoré en mode Ascension');
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
                if (data.lobbyMode === 'bombanime' || data.lobbyMode === 'collect') {
                    this.isLobbyFull = data.isLobbyFull || false;
                    this.maxPlayers = data.maxPlayers || (data.lobbyMode === 'collect' ? 5 : 13);
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
                // Ignorer en mode Survie (géré par survie-game-ended)
                if (this.lobbyMode === 'survie') {
                    console.log('🎮 game-ended ignoré en mode Survie');
                    return;
                }
                
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
                    // 🎁 Trigger reward animation
                    if (data.rewardsData && this.twitchId && data.rewardsData[this.twitchId]) {
                        this.rewardAnimData = data.rewardsData[this.twitchId];
                        this.$nextTick(() => this.playRewardAnimation());
                    }
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
                    this.collectJoinPending = false; // Annuler le pending
                    // Nettoyer localStorage car le join a échoué
                    localStorage.removeItem('hasJoinedLobby');
                    localStorage.removeItem('lobbyTwitchId');
                    
                    // 🎴💣 Animation shake + cooldown 3s (pour les deux modes)
                    this.collectShakeError = true;
                    this.joinCooldown = true;
                    
                    setTimeout(() => {
                        this.collectShakeError = false;
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
                // Sinon ils arriveront via bombanime-rewards-ready
                if (data.rewardsData && this.twitchId && data.rewardsData[this.twitchId]) {
                    this.$nextTick(() => {
                        this.rewardAnimData = data.rewardsData[this.twitchId];
                        this.$nextTick(() => this.playRewardAnimation());
                    });
                }
            });

            // 🎁 Handler pour les rewards BombAnime qui arrivent après l'écran winner
            this.socket.on('bombanime-rewards-ready', (data) => {
                console.log('🎁 Rewards BombAnime reçus:', data);
                if (!data.rewardsData || !this.twitchId) return;
                const myReward = data.rewardsData[this.twitchId];
                if (!myReward) return;

                // Enregistrer dans gameEndData
                if (this.gameEndData) {
                    this.gameEndData.rewardsData = data.rewardsData;
                }

                this.rewardAnimData = myReward;
                this.$nextTick(() => this.playRewardAnimation());
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
            
            // ============================================
            // 🎴 COLLECT SOCKET EVENTS
            // ============================================
            
            console.log('🎴 Registering collect socket handlers...');
            
            // Partie Collect démarrée
            this.socket.on('collect-game-started', (data) => {
                console.log('🎴 Collect game started:', data);
                
                this.lobbyMode = 'collect';
                this.gameStartedOnServer = true;
                this.gameEnded = false; // 🆕 Reset gameEnded pour afficher le template
                
                // Vérifier si je suis dans la partie
                const allPlayers = data.playersData || [];
                const isInGame = allPlayers.some(p => p.twitchId === this.twitchId);
                
                if (!isInGame) {
                    console.log('🎴 Collect: je ne suis pas dans la partie → spectateur');
                    this.gameInProgress = false;
                    this.collect.active = false;
                    sessionStorage.removeItem('collectInProgress');
                    return;
                }
                
                this.gameInProgress = true;
                this.initCollect(data);
                
                // Stocker les données du round 1 (sera déclenché à la fin du deal)
                if (data.round1) {
                    this._collectRound1 = data.round1;
                }
                
                // Demander mes cartes au serveur avec retry automatique
                this._collectCardsReceived = false;
                const requestCards = () => {
                    if (this._collectCardsReceived) return;
                    console.log('🎴 Demande de cartes... twitchId:', this.twitchId);
                    this.socket.emit('collect-request-my-cards', { twitchId: this.twitchId });
                };
                requestCards();
                setTimeout(() => requestCards(), 500);
                setTimeout(() => requestCards(), 1500);
                setTimeout(() => {
                    if (!this._collectCardsReceived) {
                        console.log('🎴 Cartes toujours pas reçues → reconnect fallback');
                        this.socket.emit('collect-reconnect', { twitchId: this.twitchId, username: this.username });
                    }
                }, 3000);
                
                // 🛡️ FALLBACK ULTIME: si après 6s les cartes ne sont toujours pas affichées
                setTimeout(() => {
                    if (!this.collect.myCards || this.collect.myCards.length === 0) {
                        console.log('🎴 FALLBACK: cartes toujours vides après 6s');
                        // Essayer _pendingCollectCards d'abord
                        if (this._pendingCollectCards && this._pendingCollectCards.length > 0) {
                            console.log('🎴 FALLBACK: injection depuis _pendingCollectCards');
                            this.collect.myCards = this._pendingCollectCards.filter(c => c != null);
                            this._pendingCollectCards = null;
                            this.saveCollectState();
                        } else {
                            // Dernier recours: redemander au serveur sans animation
                            console.log('🎴 FALLBACK: redemande directe au serveur');
                            this.socket.emit('collect-request-my-cards', { twitchId: this.twitchId });
                        }
                    }
                }, 6000);
                
                // Cacher immédiatement les cartes adverses + lancer l'intro
                this.$nextTick(() => {
                    document.querySelectorAll('.collect-player-card-small').forEach(c => {
                        c.classList.add('pre-deal');
                    });
                    const container = document.querySelector('.collect-table-container');
                    if (container) {
                        container.classList.add('intro');
                        setTimeout(() => container.classList.remove('intro'), 3000);
                    }
                });
                
                // 🏪 Local fallback: si collect-market-reveal du serveur n'arrive pas
                this._marketRevealed = false;
                this._timerStarted = false;
                const localMarketCards = data.marketCards || [];
                const vm = this;
                setTimeout(() => {
                    if (!vm._marketRevealed && localMarketCards.length > 0 && vm.collect.active) {
                        console.log('🏪 Player: fallback local market reveal');
                        vm.collect.marketCards = localMarketCards;
                        vm._marketRevealed = true;
                        vm._startCollectAfterMarket();
                    }
                }, 5500);
            });
            
            // 🏪 Market reveal synchronisé par le serveur
            this.socket.on('collect-market-reveal', (data) => {
                console.log('🏪 Market reveal reçu:', data.marketCards?.length, 'cartes');
                if (this._marketRevealed) return;
                this._marketRevealed = true;
                if (data.marketCards && data.marketCards.length > 0 && this.collect.active) {
                    this.collect.marketCards = data.marketCards;
                    this._startCollectAfterMarket();
                }
            });
            
            // 🆕 Gestion de l'annonce de round (rounds 2+ uniquement, round 1 déclenché localement)
            this.socket.on('collect-player-played', (data) => {
                if (data.twitchId && !this.collect.playersWhoPlayed.includes(data.twitchId)) {
                    this.collect.playersWhoPlayed.push(data.twitchId);
                }
                
                // Animation pour les autres joueurs uniquement
                if (data.twitchId === this.twitchId) return;
                
                // Pas d'animation de vol pour les échanges marché
                if (data.isSwap) return;
                
                // Pas d'animation de vol pour les scans
                if (data.isScan) return;
                
                // Trouver le siège du joueur
                const seats = document.querySelectorAll('.collect-player-seat:not(.me)');
                const playerIdx = this.collect.otherPlayers.findIndex(p => p.twitchId === data.twitchId);
                const seatEl = (playerIdx >= 0 && seats[playerIdx]) ? seats[playerIdx] : null;
                
                // Trouver le center slot
                const slotEl = document.querySelector('.collect-center-slot');
                if (!seatEl || !slotEl) return;
                
                // Lancer le vol de carte
                const flightDur = 280;
                this._cardFlightPending = data.twitchId;
                animateCardToSlot(seatEl, slotEl, flightDur, (flyerEl) => {
                    this._cardFlightPending = null;
                    if (data.isDiscard) {
                        // Défausse → retirer le flyer + shatter
                        if (flyerEl) flyerEl.remove();
                        const rect = slotEl.getBoundingClientRect();
                        this.playShatterEffect(rect.left + rect.width / 2, rect.top + rect.height / 2);
                    } else {
                        // Fusion → garder le flyer, star-gain le retirera
                        this._cardFlyer = flyerEl;
                        setTimeout(() => { if (this._cardFlyer === flyerEl) { flyerEl.remove(); this._cardFlyer = null; } }, 2000);
                    }
                }, true); // keepAlive
            });

            // 🔍 Résultat du scanner — cartes de l'adversaire reçues (privé)
            this.socket.on('collect-scan-result', (data) => {
                if (!data.success) {
                    console.log('⚠️ Scan échoué:', data.reason);
                    return;
                }
                
                console.log(`🔍 Scan réussi: ${data.targetUsername} (${data.cards.length} cartes)`);
                
                this.collect.scanActive = true;
                this.collect.scanTargetId = data.targetId;
                this.collect.scanCards = data.cards;
                this.collect.scanTimer = data.duration || 7;
                
                // Le scan consomme le tour — reset l'état du tour pour ce joueur
                this.collect.cardPlayed = true;
                this.collect.cardsActive = false;
                this.collect.canDraw = false;
                this.triggerActionBar('scan');
                this.stopCollectTimer(true);
                
                // Timer indépendant de 7s (continue même si le tour passe)
                if (this._scanInterval) clearInterval(this._scanInterval);
                const scanStartMs = Date.now();
                const scanDurationMs = (data.duration || 7) * 1000;
                this._scanInterval = setInterval(() => {
                    const elapsed = Date.now() - scanStartMs;
                    const progress = Math.min(1, elapsed / scanDurationMs);
                    const remaining = Math.max(0, Math.ceil((scanDurationMs - elapsed) / 1000));
                    this.collect.scanTimer = remaining;
                    this.collect.scanTimerProgress = progress;
                    if (progress >= 1) {
                        clearInterval(this._scanInterval);
                        this._scanInterval = null;
                        this.collect.scanActive = false;
                        this.collect.scanTargetId = null;
                        this.collect.scanCards = [];
                        this.collect.scanTimerProgress = 0;
                    }
                }, 50);
                
                this.saveCollectState();
            });

            // 🎴 Tour par tour : un joueur commence son tour
            this.socket.on('collect-turn-start', (data) => {
                // 🧹 Nettoyage des éléments d'effet orphelins
                document.querySelectorAll('.shatter-flash, .shatter-fragment, .collect-validation-flash, .collect-star-flyer, .collect-star-burst-wrap, .collect-card-flight-flyer, .draw-card-flyer, .drag-ghost, .fusion-flash-overlay, .collect-fusion-burst').forEach(el => el.remove());
                document.querySelectorAll('.market-card.swap-hover').forEach(el => el.classList.remove('swap-hover'));
                this._cardFlightPending = null;
                if (this._cardFlyer) { this._cardFlyer.remove(); this._cardFlyer = null; }
                
                console.log(`🎴 Tour de ${data.username} (${data.duration}s)`);
                this.collect.currentTurnId = data.twitchId;
                this.collect.showCenterSlot = true;
                this.collect.turnTimerProgress = 0;
                
                const isMe = data.twitchId === this.twitchId;
                this.collect.isMyTurn = isMe;
                
                // 🎴 Tracking global du ring (pour tous les joueurs)
                if (this._turnRingInterval) clearInterval(this._turnRingInterval);
                this._turnRingEndMs = Date.now() + (data.duration || 15) * 1000;
                this._turnRingDuration = data.duration || 15;
                this._turnRingInterval = setInterval(() => {
                    const elapsed = this._turnRingDuration - ((this._turnRingEndMs - Date.now()) / 1000);
                    this.collect.turnTimerProgress = Math.min(1, Math.max(0, elapsed / this._turnRingDuration));
                    if (this.collect.turnTimerProgress >= 1) {
                        clearInterval(this._turnRingInterval);
                        this._turnRingInterval = null;
                    }
                }, 100);
                
                if (isMe) {
                    // C'est mon tour → reset état du tour précédent + activer
                    this.collect.cardPlayed = false;
                    this.collect.playedCardData = null;
                    this.collect.cardsActive = true;
                    this.collect.timerExpired = false;
                    this.collect.canDraw = true;
                    this.collect.lastAction = null;       // 🎬 Reset actions bar
                    this.collect.actionTriggered = false;
                    this.startCollectTimer(data.duration || 15);
                } else {
                    // Pas mon tour → désactiver les cartes, cacher timer POV
                    this.collect.cardsActive = false;
                    this.stopCollectTimer(true);
                    this.collect.timer = 0; // Cacher le timer POV
                    this.collect.timerExpired = false;
                }
                
                this.saveCollectState();
            });
            
            // 🎴 Fin de tous les tours (tous ont joué)
            this.socket.on('collect-turn-end', () => {
                console.log('🎴 Tous les joueurs ont joué');
                this.collect.currentTurnId = null;
                this.collect.isMyTurn = false;
                this.collect.cardsActive = false;
                this.collect.lastAction = null;          // 🎬 Reset
                this.collect.actionTriggered = false;
                this.collect.turnTimerProgress = 1;
                if (this._turnRingInterval) { clearInterval(this._turnRingInterval); this._turnRingInterval = null; }
                this.stopCollectTimer(true);
            });

            this.socket.on('collect-timer-start', (data) => {
                // Restore stat if it was pending (reconnect during deal)
                if (this._pendingRoundStat && !this.collect.selectedStat) {
                    this.collect.selectedStat = this._pendingRoundStat;
                }
                this._pendingRoundStat = null;
                // Enable cards and show slot
                this.collect.timerExpired = false;
                this.collect.cardsActive = true; // 🔓 Activer les cartes
                this.collect.showCenterSlot = true;
                if (!this.collect.cardPlayed) this.startCollectTimer(data.duration || 15);
            });

            this.socket.on('collect-round-start', (data) => {
                console.log('🎲 Round start received:', data);
                
                if (!this.collect.active) {
                    console.warn('🎲 collect.active is false, setting to true');
                    this.collect.active = true;
                }
                
                // Rounds 2+ : afficher immédiatement
                if (this.showCollectRoundOverlay) {
                    this.showCollectRoundOverlay(data.round, data.stat, data.statName);
                }
            });
            
            // Reconnexion à une partie Collect en cours
            this.socket.on('collect-reconnect', (data) => {
                console.log('🎴 Collect reconnect:', data);
                
                // Annuler le timeout de sécurité
                if (this._collectReconnectTimeout) {
                    clearTimeout(this._collectReconnectTimeout);
                    this._collectReconnectTimeout = null;
                }
                
                // Server says no game active → clean up stale state
                if (data.active === false) {
                    console.log('🎴 Serveur: pas de partie Collect → nettoyage état game');
                    sessionStorage.removeItem('collectInProgress');
                    sessionStorage.removeItem('collectState');
                    sessionStorage.removeItem('collectTimerEndMs');
                    sessionStorage.removeItem('collectTimerDuration');
                    sessionStorage.removeItem('collectTimerExpired');
                    this.collect.active = false;
                    this.collect.reconnecting = false;
                    this.collect.myCards = [];
                    this.collect.cardPlayed = false;
                    this.collect.playedCardData = null;
                    this.collect.showCenterSlot = false;
                    this.collect.selectedStat = null;
                    this.collect.timerExpired = false;
                    this.collect.timer = 0;
                    this.gameInProgress = false;
                    this.stopCollectTimer();
                    // Ne reset hasJoined/lobbyMode que si on n'est PAS dans un lobby collect actif
                    if (!this.isGameActive || this.lobbyMode !== 'collect') {
                        this.hasJoined = false;
                        this.lobbyMode = 'classic';
                    }
                    return;
                }
                
                this.gameInProgress = true;
                this.lobbyMode = 'collect';
                this.hasJoined = true;
                
                // Mettre à jour avec les données fraîches du serveur
                this.initCollect(data);
                this.collect.showCenterSlot = data.currentRound > 0; // Show slot if round active
                
                // Révéler les cartes marché immédiatement (reconnect)
                if (data.marketCards && data.marketCards.length > 0) {
                    this.collect.marketCards = data.marketCards;
                }
                
                // Restaurer la stat du round actuel
                if (data.roundStat) {
                    this.collect.selectedStat = data.roundStat;
                    this._pendingRoundStat = data.roundStat;
                }
                this.collect.playersWhoPlayed = data.playersWhoPlayed || [];
                
                // 🎴 Restaurer le tour en cours
                this.collect.currentTurnId = data.currentTurnId || null;
                const isMyTurn = data.currentTurnId === this.twitchId;
                this.collect.isMyTurn = isMyTurn;
                
                // Timer restore — seulement si c'est mon tour
                if (data.timerRemainingMs > 1000 && data.currentTurnId) {
                    this.collect.selectedStat = data.roundStat;
                    
                    // 🎴 Restaurer le ring pour tous les joueurs
                    const remainingSec = Math.ceil(data.timerRemainingMs / 1000);
                    const totalDuration = 15; // durée standard du tour
                    const elapsed = totalDuration - (data.timerRemainingMs / 1000);
                    this.collect.turnTimerProgress = Math.min(1, Math.max(0, elapsed / totalDuration));
                    
                    if (this._turnRingInterval) clearInterval(this._turnRingInterval);
                    this._turnRingEndMs = Date.now() + data.timerRemainingMs;
                    this._turnRingDuration = totalDuration;
                    this._turnRingInterval = setInterval(() => {
                        const e = this._turnRingDuration - ((this._turnRingEndMs - Date.now()) / 1000);
                        this.collect.turnTimerProgress = Math.min(1, Math.max(0, e / this._turnRingDuration));
                        if (this.collect.turnTimerProgress >= 1) {
                            clearInterval(this._turnRingInterval);
                            this._turnRingInterval = null;
                        }
                    }, 100);
                    
                    const hasAlreadyPlayed = (data.playersWhoPlayed || []).includes(this.twitchId);
                    
                    if (isMyTurn && !data.playedCard && !hasAlreadyPlayed) {
                        this.collect.cardsActive = true;
                        this.collect.canDraw = true;
                        this.collect.cardPlayed = false;
                        this.startCollectTimer(remainingSec);
                    } else {
                        this.collect.cardsActive = false;
                        if (hasAlreadyPlayed) {
                            this.collect.cardPlayed = true;
                        }
                    }
                } else {
                    // Fallback sessionStorage
                    const savedEndMs = parseInt(sessionStorage.getItem('collectTimerEndMs') || '0');
                    const savedDuration = parseInt(sessionStorage.getItem('collectTimerDuration') || '15');
                    const hasAlreadyPlayedSS = (data.playersWhoPlayed || []).includes(this.twitchId);
                    if (savedEndMs && savedEndMs > Date.now() + 500 && isMyTurn && !hasAlreadyPlayedSS) {
                        const remainingSec = Math.ceil((savedEndMs - Date.now()) / 1000);
                        this.collect.cardsActive = true;
                        this.collect.canDraw = true;
                        this.collect.cardPlayed = false;
                        this._collectTimerDuration = savedDuration;
                        this.startCollectTimer(remainingSec);
                    } else {
                        this.collect.cardsActive = false;
                    }
                }
                
                // Restaurer mes cartes si fournies
                if (data.myCards && data.myCards.length > 0) {
                    this.collect.myCards = (data.myCards || []).filter(c => c != null);
                    this._collectCardsReceived = true;
                }
                
                // Restaurer carte jouée si déjà placée ce round
                if (data.playedCard) {
                    this.collect.cardPlayed = true;
                    this.collect.playedCardData = data.playedCard;
                    // Timer keeps running - don't stop it
                } else if ((data.playersWhoPlayed || []).includes(this.twitchId)) {
                    // Défausse: joueur a joué mais pas de carte à afficher
                    this.collect.cardPlayed = true;
                    this.collect.playedCardData = null;
                }
                
                // Sauvegarder l'état mis à jour
                this.saveCollectState();
            });
            
            // Mise à jour de la partie
            this.socket.on('collect-update', (data) => {
                console.log('🎴 Collect update:', data);
                
                // Mettre à jour les données des joueurs
                if (data.playersData) {
                    this.collect.playersData = data.playersData;
                    
                    const myPlayer = data.playersData.find(p => p.twitchId === this.twitchId);
                    if (myPlayer) {
                        this.collect.myData = {
                            wins: myPlayer.wins || 0
                        };
                    }
                    
                    this.collect.otherPlayers = this.getOrderedOtherPlayers(data.playersData, p => ({
                            ...p,
                            wins: p.wins || 0
                        }));
                }
                
                // Sauvegarder l'état mis à jour
                this.saveCollectState();
            });
            
            // ⭐ Gain d'étoile (Lien/Collect validé)
            this.socket.on('collect-star-gain', (data) => {
                console.log(`⭐ ${data.username} gagne ${data.starsGained} étoile(s) (${data.fusionType})`);
                const isCollect = data.fusionType === 'collect';
                const isMe = data.twitchId === this.twitchId;
                
                // Guard: prevent running twice for same player
                if (this._lastStarGainKey === data.twitchId && Date.now() - (this._lastStarGainTime || 0) < 500) return;
                this._lastStarGainKey = data.twitchId;
                this._lastStarGainTime = Date.now();
                
                // Find target star elements BEFORE updating data (so .won classes are still old)
                const prevStars = isMe ? (this.collect.myData.wins || 0) : (() => {
                    const other = this.collect.otherPlayers.find(p => p.twitchId === data.twitchId);
                    return other ? (other.wins || 0) : 0;
                })();
                
                // Find stars by index
                let starEls = [];
                if (isMe) {
                    const allStars = document.querySelectorAll('.collect-player-seat.me .collect-star');
                    for (let i = prevStars; i < prevStars + data.starsGained && i < allStars.length; i++) {
                        starEls.push(allStars[i]);
                    }
                } else {
                    const seats = document.querySelectorAll('.collect-player-seat:not(.me)');
                    const playerIdx = this.collect.otherPlayers.findIndex(p => p.twitchId === data.twitchId);
                    if (playerIdx >= 0 && seats[playerIdx]) {
                        const allStars = seats[playerIdx].querySelectorAll('.collect-star');
                        for (let i = prevStars; i < prevStars + data.starsGained && i < allStars.length; i++) {
                            starEls.push(allStars[i]);
                        }
                    }
                }
                
                // If card already visible (isMe), run effect directly
                let cardEl = document.querySelector('.collect-center-slot .center-played-card');
                if (cardEl) {
                    collectValidationEffect(cardEl, starEls, isCollect);
                    this.collect.playedCardData = null;
                    const slot = document.querySelector('.collect-center-slot');
                    if (slot) slot.classList.remove('has-card');
                } else if (!isMe && data.playedCard) {
                    // Other player's fusion — wait for card flight to finish, then render + shatter
                    const doEffect = () => {
                        // Remove flyer if still alive
                        if (this._cardFlyer) { this._cardFlyer.remove(); this._cardFlyer = null; }
                        
                        this.collect.playedCardData = JSON.parse(JSON.stringify(data.playedCard));
                        const slot = document.querySelector('.collect-center-slot');
                        if (slot) slot.classList.add('has-card');
                        
                        this.$nextTick(() => {
                            cardEl = document.querySelector('.collect-center-slot .center-played-card');
                            if (cardEl) {
                                setTimeout(() => {
                                    collectValidationEffect(cardEl, starEls, isCollect);
                                    this.collect.playedCardData = null;
                                    if (slot) slot.classList.remove('has-card');
                                }, 80);
                            }
                        });
                    };
                    
                    // If card flight is still in progress, wait for it
                    if (this._cardFlightPending === data.twitchId) {
                        let effectRan = false;
                        const runOnce = () => { if (effectRan) return; effectRan = true; doEffect(); };
                        const waitForFlight = setInterval(() => {
                            if (!this._cardFlightPending) {
                                clearInterval(waitForFlight);
                                runOnce();
                            }
                        }, 20);
                        // Safety timeout
                        setTimeout(() => { clearInterval(waitForFlight); runOnce(); }, 500);
                    } else {
                        doEffect();
                    }
                }
                
                // Update wins data after animation completes
                setTimeout(() => {
                    if (isMe) {
                        this.collect.myData.wins = data.totalStars;
                    } else {
                        const other = this.collect.otherPlayers.find(p => p.twitchId === data.twitchId);
                        if (other) other.wins = data.totalStars;
                    }
                }, 800);
            });

            
            // Recevoir mes cartes (initial deal ou reconnexion)
            this.socket.on('collect-your-cards', (data) => {
                console.log('🎴 Mes cartes Collect:', data.cards, 'dealing:', data.dealing);
                this._collectCardsReceived = true;
                const safeCards = (data.cards || []).filter(c => c != null);
                
                if (data.dealing && !this._collectDealStarted) {
                    // Première réception pendant l'intro → animation de deal
                    this._collectDealStarted = true;
                    this._pendingCollectCards = safeCards;
                    setTimeout(() => {
                        this.dealCollectCards();
                        // 🛡️ Safety net: si dealCollectCards n'a pas injecté les cartes
                        setTimeout(() => {
                            if (!this.collect.myCards || this.collect.myCards.length === 0) {
                                console.log('🎴 Safety: force injection cartes');
                                this.collect.myCards = safeCards;
                                this.saveCollectState();
                            }
                        }, 2000);
                    }, 3000);
                } else if (data.dealing && this._collectDealStarted) {
                    // Deal déjà programmé → ignorer (évite d'afficher les cartes avant l'animation)
                    console.log('🎴 Cartes dealing ignorées (deal déjà programmé)');
                } else {
                    // Reconnexion (dealing: false) → afficher directement
                    this.collect.myCards = safeCards;
                    this.saveCollectState();
                }
            });
            
            // Résultat d'un round
            this.socket.on('collect-round-result', (data) => {
                console.log('🎴 Round result:', data);
                
                // Mettre à jour les données des joueurs (wins, etc.)
                if (data.playersData) {
                    this.collect.playersData = data.playersData;
                    
                    const myPlayer = data.playersData.find(p => p.twitchId === this.twitchId);
                    if (myPlayer) {
                        this.collect.myData.wins = myPlayer.wins || 0;
                    }
                    
                    this.collect.otherPlayers = this.getOrderedOtherPlayers(data.playersData, p => ({ ...p }));
                }
                
                // Afficher qui a gagné
                this.collect.roundWinner = data.winner;
                this.collect.isMyTurn = false;
                
                this.saveCollectState();
            });
            
            // Nouveau round (nouvelles cartes)
            this.socket.on('collect-new-round', (data) => {
                console.log('🎴 Nouveau round:', data);
                
                // Reset l'état du round
                this.collect.myCards = [];
                this.collect.roundWinner = null;
                this.collect.isMyTurn = false;
                
                // Mettre à jour les joueurs
                this.initCollect(data);
                
                // Animation de distribution
                this.$nextTick(() => {
                    document.querySelectorAll('.collect-player-card-small').forEach(c => {
                        c.classList.add('pre-deal');
                    });
                });
                
                this.saveCollectState();
            });
            
            // 🎴 Serveur indique que le joueur peut piocher
            this.socket.on('collect-can-draw', (data) => {
                console.log('🎴 Pioche disponible:', data);
                if (this.collect.cardPlayed) return; // Déjà joué/défaussé
                this.collect.canDraw = true;
                this.saveCollectState();
            });

            // 🎴 Carte piochée reçue du serveur
            // 🎴 Main pleine
            this.socket.on('collect-draw-full', () => {
                if (this.collect.deckFullFlash) return;
                this.collect.deckFullFlash = true;
                setTimeout(() => { this.collect.deckFullFlash = false; }, 1200);
            });

            // 🎴 Options de pioche (2 cartes)
            // 🎴 Résultat de pioche (1 carte)
            this.socket.on('collect-draw-result', (data) => {
                console.log('🎴 Carte piochée:', data.card.name);
                this.collect.canDraw = false;
                this.collect.cardPlayed = true;
                this.collect.cardsActive = false;
                
                const deckEl = document.querySelector('.collect-deck-zone');
                if (deckEl) {
                    this.animateDrawToHand(data.card, deckEl);
                } else {
                    this.collect.myCards.push(data.card);
                    this.saveCollectState();
                }
            });

            // 🔄 Mise à jour du marché (après un échange par n'importe quel joueur)
            this.socket.on('collect-market-update', (data) => {
                console.log(`🔄 Marché mis à jour par ${data.username}`);
                // Skip si c'est nous (déjà mis à jour en local)
                if (data.twitchId === this.twitchId) return;
                this.collect.marketCards = data.marketCards || [];
            });

            // 🔄 Confirmation d'échange (pour le joueur qui a échangé)
            this.socket.on('collect-swap-confirmed', (data) => {
                if (!data.success) {
                    console.log('⚠️ Échange refusé:', data.reason);
                    // Rollback si le serveur refuse — recharger depuis le serveur
                    this.socket.emit('collect-request-my-cards', { twitchId: this.twitchId });
                }
            });

            // 🃏 Mise à jour du nombre de cartes de chaque joueur
            this.socket.on('collect-card-counts', (counts) => {
                this.collect.otherPlayers.forEach(p => {
                    if (counts[p.twitchId] !== undefined) {
                        p.cardCount = counts[p.twitchId];
                    }
                });
            });

            // Fin de partie Collect
            this.socket.on('collect-game-ended', (data) => {
                console.log('🏆 Collect terminé:', data);
                
                // Full state reset
                this.stopCollectTimer();
                if (this._scanInterval) { clearInterval(this._scanInterval); this._scanInterval = null; }
                this.collect.scanActive = false;
                this.collect.scanTargetId = null;
                this.collect.scanCards = [];
                this.collect.scanTimer = 0;
                this.collect.myCards = [];
                this.collect.cardPlayed = false;
                this.collect.playedCardData = null;
                this.collect.timerExpired = false;
                this.collect.timer = 0;
                this.collect.playersWhoPlayed = [];
                this.collect.selectedStat = null;
                this.collect.currentTurnId = null;
                this.collect.isMyTurn = false;
                this.collect.showCenterSlot = false;
                this._pendingCollectCards = null;
                this._collectCardsReceived = false;
                this._collectDealStarted = false;
                this.collect.active = false;
                this.gameEnded = true;
                this.gameInProgress = false;
                
                // Nettoyer le flag de reconnexion
                sessionStorage.removeItem('collectInProgress');
                sessionStorage.removeItem('collectState');
                sessionStorage.removeItem('collectTimerEndMs');
                sessionStorage.removeItem('collectTimerDuration');
                sessionStorage.removeItem('collectTimerExpired');
                
                this.gameEndData = {
                    winner: data.winner,
                    ranking: data.ranking,
                    gameMode: 'collect'
                };
            });

            // ============================================
            // 🎮 SURVIE - Socket Handlers
            // ============================================
            
            this.socket.on('survie-game-started', (data) => {
                console.log('Survie demarree:', data);
                this.gameStartedOnServer = true;
                
                // Reset intro flag for fresh game
                sessionStorage.removeItem('survieIntroShown');
                
                if (!this.hasJoined) {
                    this.gameInProgress = false;
                    return;
                }
                
                this.survie.active = true;
                this.survie.currentRound = 0;
                this.survie.alivePlayers = data.players || [];
                this.survie.eliminatedPlayers = [];
                this.survie.timer = data.timer || 30;
                this.survie.gameStartedAt = data.gameStartedAt || Date.now();
                this.survie.isEliminated = false;
                this.survie.isQualified = false;
                this.survie.npcs = data.npcs || [];
                this.survie.quests = data.quests || [];
                this.survie.groundItems = data.groundItems || [];
                this.survie.boosts = data.boosts || [];
                this.survie.questItems = data.questItems || {};
                this.gameInProgress = true;
                this.gameEnded = false;
                
                // Save player's quest state (with stepDesc) from server
                if (data.playerQuestStates && this.twitchId && data.playerQuestStates[this.twitchId]) {
                    this.survie.savedQuestState = data.playerQuestStates[this.twitchId];
                }
                
                document.body.classList.add('game-active');
                
                // Ensure server has our current socket.id mapped to our twitchId
                if (this.twitchId && this.username) {
                    this.socket.emit('reconnect-player', {
                        twitchId: this.twitchId,
                        username: this.username
                    });
                }
                
                // Init canvas after Vue renders the template
                this.$nextTick(() => {
                    this.initSurvieCanvas();
                    this._restoreWinnerBanner();
                    
                    // Show intro only on first game start
                    if (!sessionStorage.getItem('survieIntroShown')) {
                        sessionStorage.setItem('survieIntroShown', 'true');
                        if (this._survieCanvas) this._survieCanvas.frozen = true;
                        this._showSurvieIntro();
                    }
                });
            });
            
            // 🏔️ ASCENSION — Game started
            this.socket.on('ascension-game-started', (data) => {
                console.log('🏔️ Ascension démarrée:', data);
                this.gameStartedOnServer = true;
                
                if (!this.hasJoined) {
                    this.gameInProgress = false;
                    return;
                }
                
                this.gameInProgress = true;
                this.gameEnded = false;
                this._lastAscFloorRender = null;  // 🆕 Reset le tracker de dédup pour une nouvelle game
                this.ascension = {
                    active: true,
                    floors: data.floors,
                    timer: data.timer,
                    currentFloor: 0,
                    playerProgress: data.players || [],
                    floorData: null,
                    myFloor: 0,
                    validated: false,
                    countdownEndsAt: data.countdownEndsAt || 0,  // 🆕 Pour différer le render pendant le countdown
                };
                document.body.classList.add('game-active');
                
                this.$nextTick(() => {
                    this._initAscensionUI();
                    this._startAscensionCountdown(data.countdownEndsAt);
                });
            });
            
            this.socket.on('ascension-floor-start', (data) => {
                if (!this.ascension?.active) return;
                console.log(`🏔️ Étage ${data.floor + 1}:`, data.floorData?.type);
                this.ascension.currentFloor = data.floor;
                this.ascension.floorData = data.floorData;
                this.ascension.playerProgress = data.playerProgress || this.ascension.playerProgress;
                this.ascension.validated = false;
                this.ascension.myValidatedGuesses = [];  // 🆕 Nouveau floor → on repart à vide (la restauration n'a lieu qu'au reload via ascension-state)
                
                // 🆕 Si on est encore dans le countdown initial (3-2-1-GO du floor 0),
                // attendre la fin du countdown avant de reveal+render pour éviter
                // que le contenu apparaisse en fond pendant l'overlay.
                const now = Date.now();
                const countdownEnd = this.ascension.countdownEndsAt || 0;
                const delay = countdownEnd > now ? (countdownEnd - now) : 0;
                
                const doReveal = () => {
                    // Reveal UI elements (hidden during countdown)
                    document.querySelectorAll('.asc-pre-start').forEach(el => {
                        el.classList.remove('asc-pre-start');
                        el.classList.add('asc-reveal');
                    });
                    
                    // 🆕 Transition entre étages : si du contenu existe déjà (étage N → N+1),
                    // on fait un slide-up-out puis un stagger-in. Sinon (1er render après countdown),
                    // on render direct sans transition.
                    const content = document.getElementById('ascPlayerContent');
                    const titleEl = document.getElementById('ascPlayerFloorTitle');
                    const isTransition = content && content.children.length > 0;
                    
                    if (isTransition) {
                        // 🆕 Render normal (le _renderAscensionPlayerFloor ajoute la classe `pop`
                        //    sur le titre qui anime via ascTitlePop maintenant que les keyframes
                        //    sont définies côté joueur). On ajoute juste un stagger-in sur le content.
                        this._renderAscensionPlayerFloor(data.floorData, data.floor);
                        this._startAscensionPlayerTimer(data.timerEndTime);
                        this._updateAscensionPlayerTower();
                        
                        // Animation simple sur content (1 seule classe, 1 seule fois, après render)
                        if (content) {
                            // 🆕 BUGFIX double pop : retirer asc-reveal AVANT d'ajouter asc-stagger-in.
                            //    Sinon quand on retire stagger-in à 700ms, le browser réévalue les
                            //    animations actives et REDÉCLENCHE ascReveal sur le content (2ème pop).
                            //    asc-reveal a `forwards` donc l'état final reste appliqué après remove.
                            content.classList.remove('asc-reveal');
                            content.classList.remove('asc-stagger-in', 'asc-stagger-d4');
                            void content.offsetWidth;
                            content.classList.add('asc-stagger-in', 'asc-stagger-d4');
                            setTimeout(() => {
                                content.classList.remove('asc-stagger-in', 'asc-stagger-d4');
                            }, 700);
                        }
                        // 🆕 Pareil pour le titre qui a aussi asc-reveal après doReveal initial
                        if (titleEl) {
                            titleEl.classList.remove('asc-reveal');
                        }
                    } else {
                        // 1er render après countdown : direct, pas de transition
                        this._renderAscensionPlayerFloor(data.floorData, data.floor);
                        this._startAscensionPlayerTimer(data.timerEndTime);
                        this._updateAscensionPlayerTower();
                    }
                };
                
                if (delay > 0) {
                    setTimeout(doReveal, delay);
                } else {
                    doReveal();
                }
            });
            
            this.socket.on('ascension-floor-end', (data) => {
                if (!this.ascension?.active) return;
                this.ascension.playerProgress = data.playerProgress || this.ascension.playerProgress;
                this._stopAscensionPlayerTimer();
                this._updateAscensionPlayerTower();
            });
            
            this.socket.on('ascension-progress', (data) => {
                if (!this.ascension?.active) return;
                this.ascension.playerProgress = data.playerProgress || this.ascension.playerProgress;
                // Update my floor
                const me = this.ascension.playerProgress.find(p => p.twitchId === this.twitchId);
                if (me) this.ascension.myFloor = me.floor;
                this._updateAscensionPlayerTower();
            });
            
            this.socket.on('ascension-answer-result', (data) => {
                if (data.correct) {
                    this.ascension.validated = true;
                    this.ascension.myFloor = data.floor;
                    this._flashAscensionPlayerSuccess();
                }
            });
            
            // 🎯 Validation du mini-jeu Order — l'ordre proposé est correct → on marque visuellement
            //    avant que le serveur déclenche le passage à l'étage suivant (1500ms après).
            this.socket.on('ascension-order-result', (data) => {
                if (!data || !data.correct) return;
                if (this.ascension) this.ascension.validated = true;
                
                const grid = document.querySelector('.asc-order-grid');
                if (!grid) return;
                
                // 🆕 Cascade de 80ms : ajoute la classe correct + transforme le badge numéro en badge ✓
                const cards = Array.from(grid.querySelectorAll('.asc-order-card'));
                cards.forEach((c, i) => {
                    setTimeout(() => {
                        c.classList.add('asc-order-correct');
                        // Transforme le badge numéro en badge de validation (✓)
                        const numBadge = c.querySelector('.asc-order-num');
                        if (numBadge && !numBadge.dataset.validated) {
                            numBadge.dataset.validated = '1';
                            numBadge.innerHTML = '<svg class="asc-order-check" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12 L10 18 L20 6" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                        }
                    }, i * 80);
                });
                
                // Petit son de validation (le même que Guess pour cohérence)
                this._playAscGuessCorrectSound?.();
            });
            
            // 🎯 Validation incrémentale du mini-jeu Intruder
            //    Le serveur répond après chaque clic sur une carte: {correct, characterId, foundCount, totalTargets}
            this.socket.on('ascension-intruder-result', (data) => {
                if (!data || !data.characterId) return;
                this._handleIntruderResult(data);
            });
            
            // 🎯 Validation incrémentale du mini-jeu Guess
            this.socket.on('ascension-guess-result', (data) => {
                if (!data || !data.characterId) return;
                
                const card = document.querySelector(`.asc-guess-card[data-char-id="${data.characterId}"]`);
                const input = card?.querySelector('.asc-guess-input');
                
                if (data.correct) {
                    if (!this.ascension.guessSolved) this.ascension.guessSolved = {};
                    this.ascension.guessSolved[data.characterId] = true;
                    
                    if (card) {
                        card.classList.add('asc-guess-correct');
                        // 🆕 Stamp "PERFECT" qui s'applique sur la card avec rotation
                        if (!card.querySelector('.asc-guess-stamp')) {
                            const stamp = document.createElement('div');
                            stamp.className = 'asc-guess-stamp';
                            stamp.textContent = 'PERFECT';
                            card.appendChild(stamp);
                        }
                    }
                    if (input) {
                        input.disabled = true;
                        input.blur();
                    }
                    
                    // Petit son success
                    this._playAscGuessCorrectSound();
                    
                    // Pop animation punchy sur la card validée
                    if (card) {
                        card.classList.remove('asc-guess-pop');
                        void card.offsetWidth;
                        card.classList.add('asc-guess-pop');
                    }
                    
                    // 🆕 Focus sur le prochain input non-disabled à DROITE de celui qu'on vient de valider
                    //     (et seulement si rien à droite, on retombe vers la gauche)
                    const allCards = Array.from(document.querySelectorAll('.asc-guess-card'));
                    const validatedIdx = allCards.findIndex(c => c.dataset.charId === data.characterId);
                    let nextInput = null;
                    // 1) cherche à droite
                    for (let i = validatedIdx + 1; i < allCards.length; i++) {
                        const inp = allCards[i].querySelector('.asc-guess-input');
                        if (inp && !inp.disabled) { nextInput = inp; break; }
                    }
                    // 2) sinon, retombe sur le premier dispo à gauche
                    if (!nextInput && validatedIdx > 0) {
                        for (let i = 0; i < validatedIdx; i++) {
                            const inp = allCards[i].querySelector('.asc-guess-input');
                            if (inp && !inp.disabled) { nextInput = inp; break; }
                        }
                    }
                    if (nextInput) nextInput.focus();
                } else {
                    // 🆕 Shake UNIQUEMENT si la validation vient d'un Enter explicite (pas à chaque frappe)
                    if (data.source === 'enter' && card) {
                        card.classList.remove('asc-guess-shake');
                        void card.offsetWidth;
                        card.classList.add('asc-guess-shake');
                    }
                }
            });
            
            // 🎵 Son court pour validation guess (généré, pas de fichier)
            //    Sweep descendant + click percussif → feeling "validation tech" mature
            this._playAscGuessCorrectSound = function() {
                try {
                    if (!this._ascGuessCtx) {
                        this._ascGuessCtx = new (window.AudioContext || window.webkitAudioContext)();
                    }
                    const ctx = this._ascGuessCtx;
                    if (ctx.state === 'suspended') ctx.resume();
                    const t = ctx.currentTime;
                    
                    // Couche 1 — Click percussif court (impact / attaque)
                    const click = ctx.createOscillator();
                    const clickGain = ctx.createGain();
                    click.type = 'triangle';
                    click.frequency.setValueAtTime(2200, t);
                    click.frequency.exponentialRampToValueAtTime(900, t + 0.04);
                    clickGain.gain.setValueAtTime(0, t);
                    clickGain.gain.linearRampToValueAtTime(0.05, t + 0.002);
                    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
                    click.connect(clickGain).connect(ctx.destination);
                    click.start(t);
                    click.stop(t + 0.06);
                    
                    // Couche 2 — Body warm tone descendant (confirmation)
                    const body = ctx.createOscillator();
                    const bodyGain = ctx.createGain();
                    body.type = 'sine';
                    body.frequency.setValueAtTime(720, t + 0.01);
                    body.frequency.exponentialRampToValueAtTime(440, t + 0.18);
                    bodyGain.gain.setValueAtTime(0, t + 0.01);
                    bodyGain.gain.linearRampToValueAtTime(0.07, t + 0.025);
                    bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
                    body.connect(bodyGain).connect(ctx.destination);
                    body.start(t + 0.01);
                    body.stop(t + 0.24);
                } catch(e) { /* ignore */ }
            };
            
            // 🎵 Son d'interchange Order — 2 clicks rapides décalés (suggère 2 cards qui s'échangent)
            this._playAscOrderSwapSound = function() {
                try {
                    if (!this._ascGuessCtx) {
                        this._ascGuessCtx = new (window.AudioContext || window.webkitAudioContext)();
                    }
                    const ctx = this._ascGuessCtx;
                    if (ctx.state === 'suspended') ctx.resume();
                    const t = ctx.currentTime;
                    
                    // Click 1 — fréquence descendante (la card qui part)
                    const c1 = ctx.createOscillator();
                    const g1 = ctx.createGain();
                    c1.type = 'triangle';
                    c1.frequency.setValueAtTime(1400, t);
                    c1.frequency.exponentialRampToValueAtTime(600, t + 0.06);
                    g1.gain.setValueAtTime(0, t);
                    g1.gain.linearRampToValueAtTime(0.06, t + 0.003);
                    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
                    c1.connect(g1).connect(ctx.destination);
                    c1.start(t);
                    c1.stop(t + 0.09);
                    
                    // Click 2 — fréquence montante 80ms plus tard (la card qui arrive à destination)
                    const c2 = ctx.createOscillator();
                    const g2 = ctx.createGain();
                    c2.type = 'triangle';
                    c2.frequency.setValueAtTime(700, t + 0.08);
                    c2.frequency.exponentialRampToValueAtTime(1500, t + 0.14);
                    g2.gain.setValueAtTime(0, t + 0.08);
                    g2.gain.linearRampToValueAtTime(0.06, t + 0.083);
                    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
                    c2.connect(g2).connect(ctx.destination);
                    c2.start(t + 0.08);
                    c2.stop(t + 0.17);
                } catch(e) { /* ignore */ }
            };
            
            this.socket.on('ascension-game-end', (data) => {
                if (!this.ascension?.active) return;
                console.log('🏔️ Fin:', data);
                this.ascension.active = false;
                this._stopAscensionPlayerTimer();
                this._showAscensionPlayerPodium(data.podium, data.winner);
            });
            
            this.socket.on('ascension-state', (data) => {
                if (!data || !data.active) return;
                console.log('🏔️ Reconnexion ascension:', data);
                this.gameStartedOnServer = true;
                this.gameInProgress = true;
                this.gameEnded = false;
                document.body.classList.add('game-active');
                
                // 🆕 SOFT SYNC : si on est déjà en ascension active sur le même floor avec
                //    le DOM rendu (cas typique : visibilitychange = onglet caché → visible),
                //    on synchronise juste les progress sans toucher au DOM. Ça évite le
                //    "faux refresh" qui vide les inputs déjà tapés et fait disparaître les stamps.
                const incomingFloor = data.currentFloor || 0;
                const uiIsRendered = !!document.getElementById('ascPlayerContent')?.children.length;
                const sameFloor = this.ascension?.active && this.ascension?.currentFloor === incomingFloor;
                
                if (uiIsRendered && sameFloor) {
                    console.log('🏔️ Soft sync (UI déjà rendue, même étage) — pas de re-render');
                    this.ascension.playerProgress = data.playerProgress || this.ascension.playerProgress;
                    const me = this.ascension.playerProgress.find(p => p.twitchId === this.twitchId);
                    if (me) this.ascension.myFloor = me.floor;
                    this._updateAscensionPlayerTower();
                    return;
                }
                
                // Hard sync : reset complet (vrai cas de reconnexion après reload de la page)
                this.ascension = {
                    active: true,
                    floors: data.floors,
                    timer: data.timer,
                    currentFloor: incomingFloor,
                    playerProgress: data.playerProgress || [],
                    floorData: data.floorData,
                    myFloor: 0,
                    validated: false,
                    countdownEndsAt: data.countdownEndsAt || 0,  // 🆕 Idem pour reconnexion pendant countdown initial
                    myValidatedGuesses: data.myValidatedGuesses || [],  // 🆕 Guesses déjà validées au refresh (mode race)
                };
                
                // Find my floor
                const me = this.ascension.playerProgress.find(p => p.twitchId === this.twitchId);
                if (me) this.ascension.myFloor = me.floor;
                
                this.$nextTick(() => {
                    this._initAscensionUI();
                    
                    // 🆕 Si on reconnect pendant le countdown initial, relancer le countdown overlay
                    const now = Date.now();
                    const countdownEnd = data.countdownEndsAt || 0;
                    const inCountdown = countdownEnd > now;
                    
                    if (inCountdown) {
                        this._startAscensionCountdown(countdownEnd);
                    }
                    
                    // Reveal UI immediately then render floor
                    // (Si countdown actif, _renderAscensionPlayerFloor se chargera de différer
                    //  via sa garde défensive interne, et idem pour le reveal des éléments)
                    setTimeout(() => {
                        if (!inCountdown) {
                            document.querySelectorAll('.asc-pre-start').forEach(el => {
                                el.classList.remove('asc-pre-start');
                                el.classList.add('asc-reveal');
                            });
                        }
                        // Render after reveal so title pop is visible
                        setTimeout(() => {
                            this._updateAscensionPlayerTower();
                            if (data.floorData) this._renderAscensionPlayerFloor(data.floorData, data.currentFloor);
                            // Le timer se synchronise sur l'horloge serveur (timestamp absolu),
                            // donc même différé il affichera la bonne valeur restante.
                            if (data.floorTimerEndTime) {
                                if (inCountdown) {
                                    setTimeout(() => this._startAscensionPlayerTimer(data.floorTimerEndTime), countdownEnd - Date.now());
                                } else {
                                    this._startAscensionPlayerTimer(data.floorTimerEndTime);
                                }
                            }
                        }, 100);
                    }, 50);
                });
            });
            
            // Receive other players' positions
            const handleSurvieMove = (data) => {

                if (this._survieCanvas && data.twitchId !== this.twitchId) {
                    this._survieCanvas.updateRemotePlayer(data.twitchId, data.x, data.y, data.vx, data.vy);
                }
            };
            this.socket.on('survie-player-moved', handleSurvieMove);
            this.socket.on('survie-player-pos', handleSurvieMove);
            
            this.socket.on('survie-round-start', (data) => {
                if (!this.survie.active) return;
                console.log('🎮 Survie Manche:', data.round, data.epreuveType);
                
                this.survie.currentRound = data.round;
                this.survie.roundInProgress = true;
                this.survie.completedCount = 0;
                this.survie.qualifiedCount = data.qualifiedCount;
                this.survie.toEliminateCount = data.toEliminateCount;
                this.survie.alivePlayers = data.alivePlayers;
                this.survie.currentEpreuve = { type: data.epreuveType, data: data.epreuveData };
                this.survie.isQualified = false;
                this.survie.showElimOverlay = false;
                
                this.startSurvieTimer(data.timer);
            });
            
            this.socket.on('survie-qualified-update', (data) => {
                if (!this.survie.active) return;
                this.survie.completedCount = data.completedCount;
                
                // Vérifier si c'est moi qui viens de qualifier
                if (data.playerTwitchId === this.twitchId) {
                    this.survie.isQualified = true;
                }
            });
            
            this.socket.on('survie-round-results', (data) => {
                if (!this.survie.active) return;
                console.log('🎮 Survie résultats:', data);
                
                this.survie.roundInProgress = false;
                this.stopSurvieTimer();
                
                this.survie.elimPlayers = data.eliminated;
                this.survie.showElimOverlay = true;
                
                // Élimination désactivée pour le moment
                // const amIEliminated = data.eliminated.some(p => p.twitchId === this.twitchId);
                // if (amIEliminated) {
                //     this.survie.isEliminated = true;
                // }
                
                this.survie.alivePlayers = data.qualified;
            });
            
            this.socket.on('survie-duel-start', (data) => {
                if (!this.survie.active) return;
                console.log('🎮 Survie Duel Final:', data);
                
                this.survie.currentRound = data.round;
                this.survie.roundInProgress = true;
                this.survie.completedCount = 0;
                this.survie.qualifiedCount = 1;
                this.survie.toEliminateCount = 1;
                this.survie.currentEpreuve = { type: data.epreuveType, data: data.epreuveData };
                this.survie.isQualified = false;
                
                this.startSurvieTimer(data.timer);
            });
            
            this.socket.on('survie-game-ended', (data) => {
                if (!this.survie.active) return;
                console.log('🏆 Survie terminée:', data);
                
                this.survie.roundInProgress = false;
                this.stopSurvieTimer();
                this.survie.showElimOverlay = false;
                this.survie.currentEpreuve = null;
                
                // Garder survie.active = true et gameInProgress = true
                // pour que le container survie reste affiché
                // Le lobby fermera tout via game-deactivated
                
                this.gameEndData = {
                    winner: data.winner,
                    totalRounds: data.totalRounds,
                    gameMode: 'survie'
                };
            });
        },
        
        // ============================================
        // 🎮 SURVIE - Méthodes
        // ============================================
        
        startSurvieTimer(seconds) {
            this.stopSurvieTimer();
            this.survie.timeRemaining = seconds;
            this.survie.timerInterval = setInterval(() => {
                this.survie.timeRemaining--;
                if (this.survie.timeRemaining <= 0) {
                    this.stopSurvieTimer();
                }
            }, 1000);
        },
        
        stopSurvieTimer() {
            if (this.survie.timerInterval) {
                clearInterval(this.survie.timerInterval);
                this.survie.timerInterval = null;
            }
        },
        
        // ═══ 🗳️ POLL METHODS ═══
        
        startPollTimer(seconds, endTime) {
            this.stopPollTimer();
            this.poll._shattered = false;
            
            // Calculate precise remaining time from server endTime
            const now = Date.now();
            if (endTime) {
                this.poll._endTime = endTime;
            } else {
                this.poll._endTime = now + seconds * 1000;
            }
            const remainingMs = Math.max(0, this.poll._endTime - now);
            const remainingSec = remainingMs / 1000;
            const totalTimer = this.poll.timer || 15;
            const startPercent = (remainingSec / totalTimer) * 100;
            
            this.poll.timeRemaining = Math.ceil(remainingSec);
            
            // Drive the fill bar with CSS transition (smooth, like admin)
            this.$nextTick(() => {
                const fill = this.$refs.pollTimerFill;
                if (fill) {
                    fill.classList.remove('poll-p-timer-shattered');
                    fill.style.transition = 'none';
                    fill.style.opacity = '';
                    fill.style.visibility = '';
                    fill.style.width = startPercent + '%';
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            fill.style.transition = `width ${remainingSec}s linear`;
                            fill.style.width = '0%';
                        });
                    });
                }
            });
            
            // JS interval only for urgency class + shatter trigger + timeRemaining display
            this.poll.timerInterval = setInterval(() => {
                const remaining = Math.max(0, Math.ceil((this.poll._endTime - Date.now()) / 1000));
                this.poll.timeRemaining = remaining;
                if (remaining <= 0) {
                    this.stopPollTimer();
                    this.pollShatterTimer();
                }
            }, 250);
        },
        
        stopPollTimer() {
            if (this.poll.timerInterval) {
                clearInterval(this.poll.timerInterval);
                this.poll.timerInterval = null;
            }
        },
        
        pollVote(characterId) {
            if (!this.poll.votingOpen || this.poll.myVote) return;
            this.socket.emit('poll-vote', { characterId });
            this.poll.myVote = characterId;
            
            // Play vote sound
            this.pollPlayVoteSound();
            
            // Spawn particles on voted card
            this.$nextTick(() => {
                const refKey = 'pollCard_' + characterId;
                const cardEl = this.$refs[refKey];
                if (cardEl) {
                    const el = Array.isArray(cardEl) ? cardEl[0] : cardEl;
                    if (el) this.pollSpawnParticles(el);
                }
            });
        },
        
        // ── Vote sound (from prototype) ──
        pollPlayVoteSound() {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                // Mid-high hit
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(260, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.12, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14);
                osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15);
                // Bright click
                const noise = ctx.createBufferSource();
                const buf = ctx.createBuffer(1, ctx.sampleRate * 0.025, ctx.sampleRate);
                const d = buf.getChannelData(0);
                for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.12));
                noise.buffer = buf;
                const nGain = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass'; filter.frequency.value = 3000; filter.Q.value = 1.2;
                noise.connect(filter); filter.connect(nGain); nGain.connect(ctx.destination);
                nGain.gain.setValueAtTime(0.07, ctx.currentTime);
                noise.start(ctx.currentTime);
                // Tiny ding
                const ding = ctx.createOscillator();
                const dg = ctx.createGain();
                ding.connect(dg); dg.connect(ctx.destination);
                ding.type = 'sine';
                ding.frequency.setValueAtTime(650, ctx.currentTime + 0.03);
                dg.gain.setValueAtTime(0, ctx.currentTime);
                dg.gain.setValueAtTime(0.04, ctx.currentTime + 0.03);
                dg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
                ding.start(ctx.currentTime + 0.03); ding.stop(ctx.currentTime + 0.16);
            } catch(e) {}
        },
        
        pollPlayWinSound() {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const t = ctx.currentTime;
                // Rising sweep
                const sweep = ctx.createOscillator();
                const sweepGain = ctx.createGain();
                sweep.connect(sweepGain); sweepGain.connect(ctx.destination);
                sweep.type = 'sine';
                sweep.frequency.setValueAtTime(250, t);
                sweep.frequency.exponentialRampToValueAtTime(600, t + 0.15);
                sweep.frequency.exponentialRampToValueAtTime(400, t + 0.25);
                sweepGain.gain.setValueAtTime(0.08, t);
                sweepGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
                sweep.start(t); sweep.stop(t + 0.3);
                // High chime 1
                const chime1 = ctx.createOscillator();
                const cg1 = ctx.createGain();
                chime1.connect(cg1); cg1.connect(ctx.destination);
                chime1.type = 'sine';
                chime1.frequency.setValueAtTime(880, t + 0.08);
                cg1.gain.setValueAtTime(0, t);
                cg1.gain.setValueAtTime(0.06, t + 0.08);
                cg1.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
                chime1.start(t + 0.08); chime1.stop(t + 0.36);
                // High chime 2
                const chime2 = ctx.createOscillator();
                const cg2 = ctx.createGain();
                chime2.connect(cg2); cg2.connect(ctx.destination);
                chime2.type = 'sine';
                chime2.frequency.setValueAtTime(1100, t + 0.14);
                cg2.gain.setValueAtTime(0, t);
                cg2.gain.setValueAtTime(0.04, t + 0.14);
                cg2.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
                chime2.start(t + 0.14); chime2.stop(t + 0.46);
                // Impact
                const noise = ctx.createBufferSource();
                const buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
                const d = buf.getChannelData(0);
                for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.08));
                noise.buffer = buf;
                const nGain = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                filter.type = 'highpass'; filter.frequency.value = 3000;
                noise.connect(filter); filter.connect(nGain); nGain.connect(ctx.destination);
                nGain.gain.setValueAtTime(0.05, t);
                noise.start(t);
            } catch(e) {}
        },
        
        pollPlayTieSound() {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const t = ctx.currentTime;
                const o1 = ctx.createOscillator();
                const g1 = ctx.createGain();
                o1.connect(g1); g1.connect(ctx.destination);
                o1.type = 'sine';
                o1.frequency.setValueAtTime(520, t);
                o1.frequency.exponentialRampToValueAtTime(480, t + 0.15);
                g1.gain.setValueAtTime(0.04, t);
                g1.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
                o1.start(t); o1.stop(t + 0.2);
                const o2 = ctx.createOscillator();
                const g2 = ctx.createGain();
                o2.connect(g2); g2.connect(ctx.destination);
                o2.type = 'sine';
                o2.frequency.setValueAtTime(400, t + 0.12);
                o2.frequency.exponentialRampToValueAtTime(350, t + 0.3);
                g2.gain.setValueAtTime(0, t);
                g2.gain.setValueAtTime(0.035, t + 0.12);
                g2.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
                o2.start(t + 0.12); o2.stop(t + 0.36);
            } catch(e) {}
        },
        
        // ── Particles on vote (edge burst from prototype) ──
        pollSpawnParticles(card) {
            const inner = card.querySelector('.poll-p-card-inner');
            if (!inner) return;
            const r = inner.getBoundingClientRect();
            const cardR = card.getBoundingClientRect();
            const w = r.width, h = r.height;
            const ox = r.left - cardR.left, oy = r.top - cardR.top;
            
            const edgePoints = [];
            for (let i = 0; i < 12; i++) edgePoints.push({ x: ox + (w * i/11), y: oy, angle: -Math.PI/2 + (Math.random()-0.5)*0.8 });
            for (let i = 0; i < 12; i++) edgePoints.push({ x: ox + (w * i/11), y: oy + h, angle: Math.PI/2 + (Math.random()-0.5)*0.8 });
            for (let i = 0; i < 8; i++) edgePoints.push({ x: ox, y: oy + (h * i/7), angle: Math.PI + (Math.random()-0.5)*0.8 });
            for (let i = 0; i < 8; i++) edgePoints.push({ x: ox + w, y: oy + (h * i/7), angle: 0 + (Math.random()-0.5)*0.8 });
            [{x: ox, y: oy}, {x: ox+w, y: oy}, {x: ox, y: oy+h}, {x: ox+w, y: oy+h}].forEach(corner => {
                for (let i = 0; i < 6; i++) {
                    const a = Math.atan2(corner.y - (oy+h/2), corner.x - (ox+w/2)) + (Math.random()-0.5)*0.6;
                    edgePoints.push({ x: corner.x, y: corner.y, angle: a });
                }
            });
            
            edgePoints.forEach((pt) => {
                const p = document.createElement('div');
                const dist = 60 + Math.random() * 100;
                const s = 3 + Math.random() * 6;
                const hue = 325 + Math.random() * 40;
                const light = 55 + Math.random() * 30;
                const dur = 0.5 + Math.random() * 0.5;
                Object.assign(p.style, {
                    position: 'absolute', width: s+'px', height: s+'px', borderRadius: '50%',
                    background: `hsl(${hue}, 85%, ${light}%)`,
                    left: pt.x+'px', top: pt.y+'px', opacity: '1',
                    transition: `all ${dur}s cubic-bezier(.15,.9,.3,1)`,
                    pointerEvents: 'none', zIndex: '10',
                    boxShadow: `0 0 ${s*3}px hsl(${hue}, 85%, ${light}%), 0 0 ${s*6}px hsl(${hue}, 60%, ${light-10}%)`
                });
                card.appendChild(p);
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    p.style.left = (pt.x + Math.cos(pt.angle) * dist) + 'px';
                    p.style.top = (pt.y + Math.sin(pt.angle) * dist) + 'px';
                    p.style.opacity = '0';
                    p.style.transform = `scale(0.2) rotate(${Math.random()*180}deg)`;
                }));
                setTimeout(() => p.remove(), (dur * 1000) + 100);
            });
            
            // Edge glow flash
            const glow = document.createElement('div');
            Object.assign(glow.style, {
                position: 'absolute', left: ox+'px', top: oy+'px', width: w+'px', height: h+'px',
                borderRadius: '14px', border: '2px solid rgba(240,128,176,0.6)',
                boxShadow: '0 0 20px rgba(240,128,176,0.4), inset 0 0 20px rgba(240,128,176,0.1)',
                pointerEvents: 'none', zIndex: '9', transition: 'all 0.6s ease-out', opacity: '1'
            });
            card.appendChild(glow);
            requestAnimationFrame(() => requestAnimationFrame(() => {
                glow.style.opacity = '0'; glow.style.transform = 'scale(1.08)';
                glow.style.boxShadow = '0 0 40px rgba(240,128,176,0), inset 0 0 40px rgba(240,128,176,0)';
            }));
            setTimeout(() => glow.remove(), 700);
        },
        
        // ── Shatter timer (dot explodes into particles) ──
        pollShatterTimer() {
            if (this.poll._shattered) return;
            this.poll._shattered = true;
            const bar = this.$refs.pollTimerBar;
            const fill = this.$refs.pollTimerFill;
            const flash = this.$refs.pollTimerFlash;
            if (!bar || !fill) return;
            
            const fillRect = fill.getBoundingClientRect();
            const barRect = bar.getBoundingClientRect();
            const dotX = fillRect.right - barRect.left;
            
            // Hide the fill and its dot
            fill.style.opacity = '0';
            fill.classList.add('poll-p-timer-shattered');
            
            // Flash
            if (flash) {
                flash.style.setProperty('--fx', ((dotX / barRect.width) * 100) + '%');
                flash.classList.add('active');
                setTimeout(() => flash.classList.remove('active'), 700);
            }
            
            // Burst particles from dot position
            for (let i = 0; i < 12; i++) {
                const p = document.createElement('div');
                const a = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.5;
                const d = 15 + Math.random() * 35;
                const s = 2 + Math.random() * 4;
                const isWhite = Math.random() > 0.7;
                p.className = `poll-p-timer-shard ${isWhite ? 'white' : 'red'}`;
                Object.assign(p.style, {
                    left: dotX + 'px', top: '0px',
                    width: s + 'px', height: s + 'px', borderRadius: '50%',
                    transition: `all ${0.5 + Math.random() * 0.4}s cubic-bezier(.16,1,.3,1)`,
                });
                bar.appendChild(p);
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    p.style.transform = `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px)`;
                    p.style.opacity = '0';
                }));
                setTimeout(() => p.remove(), 1000);
            }
        },
        
        getPollVotePercent(charId) {
            if (!this.poll.showingResults || !this.poll.voteResults || !this.poll.voteResults[charId]) return 0;
            return this.poll.voteResults[charId].percentage;
        },
        
        pollSpawnVoteNotif(username, avatar) {
            if (!this.poll.showNotifs) return;
            const zone = this.$refs.pollNotifZone;
            if (!zone) return;
            
            const zW = zone.offsetWidth;
            const zH = zone.offsetHeight;
            const rand = (a, b) => a + Math.random() * (b - a);
            
            const angle = rand(-2.8, -0.3);
            const totalDist = rand(70, 160);
            const midX = rand(20, zW * 0.78);
            const midY = rand(zH * 0.18, zH * 0.78);
            const halfDist = totalDist / 2;
            const sx = midX - Math.cos(angle) * halfDist;
            const sy = midY - Math.sin(angle) * halfDist;
            const ex = midX + Math.cos(angle) * halfDist;
            const ey = midY + Math.sin(angle) * halfDist;
            const life = rand(2.4, 3.8);
            const peakOp = rand(0.55, 1.0);
            const sr = rand(-12, 12);
            const er = sr + rand(-10, 10);
            
            const notif = document.createElement('div');
            notif.className = 'poll-vote-notif';
            notif.style.setProperty('--sx', sx + 'px');
            notif.style.setProperty('--sy', sy + 'px');
            notif.style.setProperty('--ex', ex + 'px');
            notif.style.setProperty('--ey', ey + 'px');
            notif.style.setProperty('--life', life + 's');
            notif.style.setProperty('--peak-op', peakOp);
            notif.style.setProperty('--sr', sr + 'deg');
            notif.style.setProperty('--er', er + 'deg');
            
            const avatarHtml = avatar 
                ? `<img class="pn-avatar" src="${avatar}" alt="" onerror="this.style.display='none'">` 
                : '';
            notif.innerHTML = `
                ${avatarHtml}
                <div class="pn-text"><strong>${username}</strong> a voté</div>
                <span class="pn-check">✓</span>
            `;
            
            zone.appendChild(notif);
            setTimeout(() => { if (notif.parentNode) notif.remove(); }, life * 1000 + 300);
            while (zone.children.length > 30) zone.removeChild(zone.firstChild);
        },
        
        getPollVoteCount(charId) {
            if (this.poll.showingResults && this.poll.voteResults && this.poll.voteResults[charId]) {
                return this.poll.voteResults[charId].count;
            }
            return this.poll.voteCounts[charId] || 0;
        },
        
        pollSpawnVictorySparkles() {
            const container = this.$refs.pollVictorySparkles;
            if (!container) return;
            const cx = 40, cy = 30;
            const spawn = () => {
                for (let i = 0; i < 8; i++) {
                    const p = document.createElement('div');
                    const a = Math.random() * Math.PI * 2;
                    const d = 30 + Math.random() * 50;
                    const s = 2 + Math.random() * 3;
                    const hue = 325 + Math.random() * 40;
                    const light = 60 + Math.random() * 30;
                    Object.assign(p.style, {
                        position: 'absolute', width: s+'px', height: s+'px', borderRadius: '50%',
                        background: `hsl(${hue}, 85%, ${light}%)`,
                        left: cx+'px', top: cy+'px', opacity: '0.8',
                        transition: `all ${0.8 + Math.random()*0.5}s cubic-bezier(.15,.9,.3,1)`,
                        pointerEvents: 'none',
                        boxShadow: `0 0 ${s*3}px hsl(${hue}, 85%, ${light}%)`
                    });
                    container.appendChild(p);
                    requestAnimationFrame(() => requestAnimationFrame(() => {
                        p.style.left = (cx + Math.cos(a) * d) + 'px';
                        p.style.top = (cy + Math.sin(a) * d) + 'px';
                        p.style.opacity = '0';
                        p.style.transform = 'scale(0)';
                    }));
                    setTimeout(() => p.remove(), 1400);
                }
            };
            spawn();
            this._victorySparkleInterval = setInterval(spawn, 1200);
            setTimeout(() => clearInterval(this._victorySparkleInterval), 8000);
        },
        
        pollBackToLobby() {
            this.stopPollTimer();
            if (this._victorySparkleInterval) {
                clearInterval(this._victorySparkleInterval);
                this._victorySparkleInterval = null;
            }
            this.poll.active = false;
            this.poll.gameWinner = null;
            this.poll.characters = [];
            this.poll.myVote = null;
            this.poll.votingOpen = false;
            this.poll.showingResults = false;
            this.poll.resultsVisible = false;
            this.poll.voteResults = null;
            this.poll.winner = null;
            this.poll._shattered = false;
            this.poll._endTime = null;
            this.gameInProgress = false;
            this.gameEnded = false;
        },
        
        survieComplete() {
            if (!this.survie.active || !this.survie.roundInProgress || this.survie.isQualified || this.survie.isEliminated) return;
            this.socket.emit('survie-completed', {});
        },
        
        initSurvieCanvas() {
            this.destroySurvieCanvas();
            
            // Init audio system
            if (!this._survieAudio) {
                this._survieAudio = {
                    boost: new Audio('boost.mp3'),
                    pickup: new Audio('pickup.mp3'),
                    npc: new Audio('npc.mp3'),
                    step: new Audio('step.mp3'),
                    quest: new Audio('quest.mp3'),
                };
                // Set volumes
                this._survieAudio.boost.volume = 0.4;
                this._survieAudio.pickup.volume = 0.5;
                this._survieAudio.npc.volume = 0.3;
                this._survieAudio.step.volume = 0.4;
                this._survieAudio.quest.volume = 0.5;
            }
            
            const canvasEl = document.getElementById('surviePlayerCanvas');
            if (!canvasEl || !window.SurvieCanvas) return;
            
            const self = this;
            this._survieCanvas = new SurvieCanvas(canvasEl, {
                localTwitchId: this.twitchId,
                isAdmin: false,
                onPosition(x, y, vx, vy) {
                    if (self.socket) {
                        self.socket.emit('survie-position', { x, y, vx, vy, twitchId: self.twitchId });
                    }
                },
                onNPCInteract(npc) {
                    self.openSurvieDialogue(npc);
                },
                onDialogueClose() {
                    self.closeSurvieDialogue();
                },
                onItemPickup(item) {
                    console.log('📦 Pickup:', item.id, item.imageUrl);
                    if (self.socket) {
                        self.socket.emit('survie-pickup', { groundItemId: item.id, twitchId: self.twitchId });
                    }
                    // Optimistic update — add to inventory immediately
                    if (item.imageUrl) {
                        // Resolve real item name from questItems if available
                        let itemName = item.id;
                        const qi = self.survie.questItems || {};
                        // Try direct match or match by imageUrl
                        for (const [key, val] of Object.entries(qi)) {
                            if (val.imageUrl === item.imageUrl) { itemName = val.name; break; }
                        }
                        self._addItemToInventory({ id: item.id, name: itemName, imageUrl: item.imageUrl });
                    }
                },
                onBoostPickup(boost) {
                    console.log('⚡ Boost pickup:', boost.id);
                    self._playSound('boost');
                    if (self.socket) {
                        self.socket.emit('survie-boost-pickup', { boostId: boost.id, twitchId: self.twitchId });
                    }
                }
            });
            
            // Resize first so dimensions are available
            this._survieCanvas.resize();
            
            // Always start frozen — unfreeze only after tutorial period
            const TUTO_DURATION = 14000;
            if (this.survie.gameStartedAt) {
                const elapsed = Date.now() - this.survie.gameStartedAt;
                const remaining = TUTO_DURATION - elapsed;
                if (remaining > 0) {
                    this._survieCanvas.frozen = true;
                    setTimeout(() => {
                        if (this._survieCanvas) this._survieCanvas.frozen = false;
                    }, remaining);
                } else {
                    // Tuto already over
                    this._survieCanvas.frozen = false;
                }
            } else {
                // No gameStartedAt yet — freeze and wait for survie-state to provide it
                this._survieCanvas.frozen = true;
                // Safety: unfreeze after max tuto duration in case state never arrives
                setTimeout(() => {
                    if (this._survieCanvas && this._survieCanvas.frozen) {
                        this._survieCanvas.frozen = false;
                    }
                }, TUTO_DURATION);
            }
            
            // Add all players
            this.survie.alivePlayers.forEach(p => {
                this._survieCanvas.addPlayer(p.twitchId, p.username, p.colorIndex || 0, p.posX, p.posY);
            });
            
            this._survieCanvas.start();
            
            // Force resize after a short delay (ensures header is hidden and layout is settled)
            setTimeout(() => {
                if (this._survieCanvas) this._survieCanvas.resize();
            }, 100);
            setTimeout(() => {
                if (this._survieCanvas) this._survieCanvas.resize();
            }, 500);
            
            // Add NPCs from server data
            (this.survie.npcs || []).forEach(npc => {
                this._survieCanvas.addNPC(npc.id, npc.name, npc.imageUrl, npc.x * MAP_WIDTH, npc.y * MAP_HEIGHT, npc.size, npc.defaultDialogues, npc.questDialogues, npc.isStructure);
            });
            
            // Add ground items
            this._pickedItems = this._pickedItems || new Set();
            (this.survie.groundItems || []).forEach(gi => {
                this._survieCanvas.addGroundItem(gi.id, gi.imageUrl, gi.x * MAP_WIDTH, gi.y * MAP_HEIGHT, gi.size);
            });
            
            // Add boosts
            (this.survie.boosts || []).forEach(b => {
                this._survieCanvas.addBoost(b.id, b.x * MAP_WIDTH, b.y * MAP_HEIGHT);
            });
            
            // Create dialogue overlay if not exists
            if (!document.getElementById('survieDialogueOverlay')) {
                const dialogueHTML = `
                    <div class="survie-dialogue-overlay" id="survieDialogueOverlay">
                        <div class="survie-dialogue-box">
                            <div class="survie-dialogue-content">
                                <div class="survie-dialogue-name" id="survieDialogueName"></div>
                                <div class="survie-dialogue-text" id="survieDialogueText"></div>
                            </div>
                        </div>
                    </div>
                `;
                document.body.insertAdjacentHTML('beforeend', dialogueHTML);
                
                // Close on click
                document.getElementById('survieDialogueOverlay').addEventListener('click', () => {
                    this.closeSurvieDialogue();
                    if (this._survieCanvas) this._survieCanvas.dialogueOpen = false;
                });
            }
            
            // Create inventory if not exists
            if (!document.getElementById('survieInventory')) {
                let slotsHTML = '';
                for (let i = 1; i <= 12; i++) {
                    slotsHTML += `<div class="survie-inventory-slot" data-slot="${i}" id="survieSlot${i}"></div>`;
                }
                document.body.insertAdjacentHTML('beforeend', `
                    <div class="survie-inventory" id="survieInventory">${slotsHTML}</div>
                `);
            }
            
            // Create quest list if not exists
            if (!document.getElementById('survieQuestList')) {
                document.body.insertAdjacentHTML('beforeend', `
                    <div class="survie-quest-list quest-entrance" id="survieQuestList">
                        <div class="survie-quest-header" id="survieQuestHeader">
                            <span class="survie-quest-title">Objectifs</span>
                            <div style="display:flex;align-items:center;">
                                <span class="survie-quest-counter" id="survieQuestCounter">0<span>/0</span></span>
                                <span class="survie-quest-toggle" id="survieQuestToggle">▼</span>
                            </div>
                        </div>
                        <div class="survie-quest-items" id="survieQuestItems"></div>
                    </div>
                `);
                
                // Remove entrance class after animation completes
                setTimeout(() => {
                    const ql = document.getElementById('survieQuestList');
                    if (ql) ql.classList.remove('quest-entrance');
                }, 2000);
                
                // Toggle collapse
                document.getElementById('survieQuestHeader').addEventListener('click', () => {
                    document.getElementById('survieQuestList').classList.toggle('collapsed');
                });
                
                // Mobile: open separate quest modal
                const ql = document.getElementById('survieQuestList');
                ql.addEventListener('click', (e) => {
                    if (window.innerWidth <= 600) {
                        e.stopPropagation();
                        this._openMobileQuestModal();
                    }
                });
            }
            
            // Create minimap if not exists
            if (!document.getElementById('survieMinimap')) {
                document.body.insertAdjacentHTML('beforeend', `
                    <div class="survie-minimap" id="survieMinimap">
                        <div class="survie-minimap-frame">
                            <div class="survie-minimap-inner">
                                <div class="survie-minimap-grid"></div>
                            </div>
                            <div class="survie-minimap-boundary"></div>
                            <canvas class="survie-minimap-canvas" id="survieMinimapCanvas"></canvas>
                        </div>
                        <div class="survie-minimap-corner tl"></div>
                        <div class="survie-minimap-corner tr"></div>
                        <div class="survie-minimap-corner bl"></div>
                        <div class="survie-minimap-corner br"></div>
                        <div class="survie-minimap-pins">
                            <div class="survie-minimap-pin-btn pin-red" id="surviePin1" title="Épingle rouge">
                                <svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="rgba(255,80,80,0.9)"/><circle cx="12" cy="9" r="2.5" fill="rgba(30,10,10,0.6)"/></svg>
                            </div>
                            <div class="survie-minimap-pin-btn pin-green" id="surviePin2" title="Épingle verte">
                                <svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="rgba(80,220,120,0.9)"/><circle cx="12" cy="9" r="2.5" fill="rgba(10,30,15,0.6)"/></svg>
                            </div>
                        </div>
                    </div>
                `);
                
                // Init pins system
                this._minimapPins = { red: null, green: null };
                this._pinMode = null; // null, 'red', or 'green'
                
                // Pin button clicks
                document.getElementById('surviePin1').addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this._minimapPins.red) {
                        // Remove pin
                        this._minimapPins.red = null;
                        document.getElementById('surviePin1').classList.remove('placed');
                        this._pinMode = null;
                    } else if (this._pinMode === 'red') {
                        this._pinMode = null;
                        document.getElementById('surviePin1').classList.remove('active');
                    } else {
                        this._pinMode = 'red';
                        document.getElementById('surviePin1').classList.add('active');
                        document.getElementById('surviePin2').classList.remove('active');
                    }
                });
                
                document.getElementById('surviePin2').addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this._minimapPins.green) {
                        this._minimapPins.green = null;
                        document.getElementById('surviePin2').classList.remove('placed');
                        this._pinMode = null;
                    } else if (this._pinMode === 'green') {
                        this._pinMode = null;
                        document.getElementById('surviePin2').classList.remove('active');
                    } else {
                        this._pinMode = 'green';
                        document.getElementById('surviePin2').classList.add('active');
                        document.getElementById('surviePin1').classList.remove('active');
                    }
                });
                
                // Click on minimap canvas to place pin
                const mmCanvasEl = document.getElementById('survieMinimapCanvas');
                mmCanvasEl.style.pointerEvents = 'auto';
                mmCanvasEl.addEventListener('click', (e) => {
                    if (!this._pinMode) return;
                    const rect = mmCanvasEl.getBoundingClientRect();
                    const px = (e.clientX - rect.left) / rect.width;
                    const py = (e.clientY - rect.top) / rect.height;
                    
                    this._minimapPins[this._pinMode] = { x: px, y: py };
                    document.getElementById(this._pinMode === 'red' ? 'surviePin1' : 'surviePin2').classList.remove('active');
                    document.getElementById(this._pinMode === 'red' ? 'surviePin1' : 'surviePin2').classList.add('placed');
                    this._pinMode = null;
                });
                
                // Setup minimap canvas
                const mmCanvas = document.getElementById('survieMinimapCanvas');
                const mmRect = mmCanvas.parentElement.getBoundingClientRect();
                mmCanvas.width = mmRect.width - 12;
                mmCanvas.height = mmRect.height - 12;
                
                // Start minimap render loop
                this._minimapInterval = setInterval(() => {
                    this._renderMinimap();
                }, 100);
            }
            
            // Load quests — use saved state if available (after refresh), otherwise fresh
            console.log('📋 Player quests:', this.survie.quests?.length || 0, 'savedState:', !!this.survie.savedQuestState);
            if (this.survie.savedQuestState && this.survie.savedQuestState.quests) {
                // Restored from server after refresh
                console.log('📋 Using SAVED quest state');
                this.updateQuestListUI(this.survie.savedQuestState);
                
                // Remove already-picked items from canvas
                if (this.survie.savedQuestState.pickedItems && this._survieCanvas) {
                    this.survie.savedQuestState.pickedItems.forEach(itemId => {
                        this._survieCanvas.removeGroundItem(itemId);
                    });
                    console.log('📦 Removed', this.survie.savedQuestState.pickedItems.length, 'picked items from canvas');
                }
                
                // Restore inventory UI
                if (this.survie.savedQuestState.inventory) {
                    this.survie.savedQuestState.inventory.forEach(itemId => {
                        // Try questItems dict first (for NPC-given items like armor, scroll, etc.)
                        const questItems = this.survie.questItems || {};
                        const qi = questItems[itemId];
                        if (qi) {
                            this._addItemToInventory({ id: itemId, name: qi.name || itemId, imageUrl: qi.imageUrl });
                        } else {
                            // Fallback to ground items (for collectibles like dragonballs)
                            const allItems = this.survie.groundItems || [];
                            const gi = allItems.find(g => g.itemId === itemId);
                            if (gi) {
                                this._addItemToInventory({ id: itemId, name: gi.name || itemId, imageUrl: gi.imageUrl });
                            }
                        }
                    });
                }
                
                this.survie.savedQuestState = null;
            } else if (this.survie.quests && this.survie.quests.length > 0) {
                // Fresh game start — generate initial stepDesc client-side as fallback
                this.updateQuestListUI({
                    quests: this.survie.quests.map(q => ({
                        ...q,
                        currentStep: 0,
                        completed: false,
                        stepDesc: this._getInitialStepDesc(q),
                        ...(q.type === 'REUNION' && { found: [] }),
                        ...(q.type === 'COLLECT_ITEMS' && { collected: 0 }),
                        ...(q.type === 'MYSTERY' && { interrogated: [] }),
                    })),
                });
            }
            
            // Request saved quest state from server (with delay to ensure server has re-registered us)
            setTimeout(() => {
                this.socket.emit('survie-reconnect', { twitchId: this.twitchId });
            }, 500);
            
            // Handle survie-state (reconnect response)
            this.socket.off('survie-state');
            this.socket.on('survie-state', (data) => {
                    if (!data) return;
                    console.log('📋 Reconnect: quests:', data.quests?.length || 0, 'items:', data.groundItems?.length || 0, 'playerQuestState:', !!data.playerQuestState, data.playerQuestState?.quests?.length || 0);
                    if (data.playerQuestState?.quests) {
                        console.log('📋 Saved progress:', data.playerQuestState.quests.map(q => `${q.id}:step${q.currentStep}/${q.completed?'DONE':'active'}`).join(', '));
                    }
                    this.survie.quests = data.quests || [];
                    this.survie.groundItems = data.groundItems || [];
                    if (data.questItems) this.survie.questItems = data.questItems;
                    if (data.gameStartedAt) this.survie.gameStartedAt = data.gameStartedAt;
                    
                    // Add ground items to canvas if not already there
                    if (this._survieCanvas && data.groundItems) {
                        data.groundItems.forEach(gi => {
                            if (!this._survieCanvas.groundItems.find(g => g.id === gi.id)) {
                                this._survieCanvas.addGroundItem(gi.id, gi.imageUrl, gi.x * 38000, gi.y * 24000, gi.size);
                            }
                        });
                    }
                    
                    // Add boosts to canvas if not already there
                    if (this._survieCanvas && data.boosts) {
                        data.boosts.forEach(b => {
                            if (!this._survieCanvas.boosts.find(eb => eb.id === b.id)) {
                                this._survieCanvas.addBoost(b.id, b.x * 38000, b.y * 24000);
                            }
                        });
                    }
                    
                    // Use player's saved quest state if available, otherwise init fresh
                    if (data.playerQuestState && data.playerQuestState.quests) {
                        this.updateQuestListUI(data.playerQuestState);
                        
                        // Remove already-picked items from canvas
                        if (data.playerQuestState.pickedItems && this._survieCanvas) {
                            data.playerQuestState.pickedItems.forEach(itemId => {
                                this._survieCanvas.removeGroundItem(itemId);
                            });
                        }
                    } else if (data.quests && data.quests.length > 0) {
                        this.updateQuestListUI({
                            quests: data.quests.map(q => ({
                                ...q,
                                currentStep: 0,
                                completed: false,
                                ...(q.type === 'REUNION' && { found: [] }),
                                ...(q.type === 'COLLECT_ITEMS' && { collected: 0 }),
                                ...(q.type === 'MYSTERY' && { interrogated: [] }),
                            })),
                        });
                    }
                    
                    // Freeze during tutorial if still in tuto period
                    if (data.gameStartedAt && this._survieCanvas) {
                        const TUTO_DURATION = 14000; // 1s delay + 4 slides × 3s + buffer
                        const elapsed = Date.now() - data.gameStartedAt;
                        const remaining = TUTO_DURATION - elapsed;
                        if (remaining > 0) {
                            this._survieCanvas.frozen = true;
                            setTimeout(() => {
                                if (this._survieCanvas) this._survieCanvas.frozen = false;
                            }, remaining);
                        }
                    }
                });
            
            // Ensure server has our current socket.id (critical after page refresh)
            if (this.socket && this.twitchId && this.username) {
                this.socket.emit('reconnect-player', {
                    twitchId: this.twitchId,
                    username: this.username
                });
            }
        },
        sendSurvieInteract(npc) {
            console.log('🗣️ sendSurvieInteract:', npc.id, 'survie.active:', this.survie.active, 'socket:', !!this.socket);
            if (this.socket && this.survie.active) {
                this.socket.emit('survie-interact', {
                    npcId: npc.id,
                    isStructure: !!npc.isStructure,
                    twitchId: this.twitchId,
                });
                console.log('📤 survie-interact émis pour', npc.id);
            } else {
                console.warn('⚠️ survie-interact NON émis - active:', this.survie.active);
            }
        },
        
        _addItemToInventory(item) {
            console.log('📦 _addItemToInventory:', item.id, item.imageUrl, item.name);
            // Find first empty slot
            let found = false;
            for (let i = 1; i <= 12; i++) {
                const slot = document.getElementById(`survieSlot${i}`);
                if (slot && !slot.classList.contains('filled')) {
                    slot.classList.add('filled', 'item-new');
                    slot.innerHTML = `<img src="/tracepic/${item.imageUrl}" alt="${item.name}">`;
                    slot.dataset.itemId = item.id;
                    slot.dataset.itemName = item.name || item.id;
                    setTimeout(() => slot.classList.remove('item-new'), 500);
                    found = true;
                    console.log('📦 Item ajouté au slot', i);
                    break;
                }
            }
            if (!found) console.warn('⚠️ Aucun slot vide trouvé !');
        },
        
        _removeItemFromInventory(itemId) {
            for (let i = 1; i <= 12; i++) {
                const slot = document.getElementById(`survieSlot${i}`);
                if (slot && slot.dataset.itemId === itemId) {
                    slot.classList.remove('filled');
                    slot.innerHTML = '';
                    slot.dataset.itemId = '';
                    slot.dataset.itemName = '';
                    break;
                }
            }
        },
        
        // ═══ GIVE MODE — Inventory selection for item delivery ═══
        _giveMode: null,
        
        _enterGiveMode(npcId, questId, requiredItems, requiredCount, requiredImageUrls) {
            console.log('🎁 Entering give mode:', questId, requiredItems, requiredImageUrls);
            this._giveMode = {
                npcId,
                questId,
                requiredItems: requiredItems,
                requiredCount: requiredCount,
                selectedItems: []
            };
            
            // Style all slots — highlight valid items, grey out others
            for (let i = 1; i <= 12; i++) {
                const slot = document.getElementById(`survieSlot${i}`);
                if (!slot) continue;
                
                if (slot.classList.contains('filled')) {
                    const itemId = slot.dataset.itemId;
                    const img = slot.querySelector('img');
                    const imgSrc = img ? img.getAttribute('src')?.split('/').pop() : '';
                    
                    // Match by itemId OR by imageUrl
                    const isRequired = requiredItems.includes(itemId) || 
                        (requiredImageUrls && requiredImageUrls.includes(imgSrc));
                    
                    if (isRequired) {
                        slot.classList.add('give-selectable');
                        slot.addEventListener('click', this._onGiveSlotClick);
                    } else {
                        slot.classList.add('give-disabled');
                    }
                }
            }
            
            // Add give-mode class to inventory container
            const inv = document.getElementById('survieInventory');
            if (inv) inv.classList.add('give-mode-active');
        },
        
        _exitGiveMode() {
            console.log('🎁 Exiting give mode');
            this._giveMode = null;
            
            for (let i = 1; i <= 12; i++) {
                const slot = document.getElementById(`survieSlot${i}`);
                if (!slot) continue;
                slot.classList.remove('give-selectable', 'give-disabled', 'give-selected');
                slot.removeEventListener('click', this._onGiveSlotClick);
            }
            
            const inv = document.getElementById('survieInventory');
            if (inv) inv.classList.remove('give-mode-active');
        },
        
        _onGiveSlotClick: null, // Will be bound in created()
        
        _handleGiveSlotClick(e) {
            e.stopPropagation();
            e.preventDefault();
            if (!this._giveMode) return;
            const slot = e.currentTarget;
            const itemId = slot.dataset.itemId;
            if (!itemId) return;
            
            // Use slot index as unique key (handles duplicate itemIds like 'berries')
            const slotKey = slot.id || itemId;
            
            // Toggle selection
            const idx = this._giveMode.selectedItems.findIndex(s => s.slotKey === slotKey);
            if (idx === -1) {
                this._giveMode.selectedItems.push({ slotKey, itemId });
                slot.classList.add('give-selected');
                slot.classList.remove('give-selectable');
            } else {
                this._giveMode.selectedItems.splice(idx, 1);
                slot.classList.remove('give-selected');
                slot.classList.add('give-selectable');
            }
            
            console.log('🎁 Selected:', this._giveMode.selectedItems.length, '/', this._giveMode.requiredCount);
            
            // Auto-send when all required items are selected
            if (this._giveMode.selectedItems.length >= this._giveMode.requiredCount) {
                console.log('🎁 All items selected — sending!');
                if (this.socket) {
                    this.socket.emit('survie-give-items', {
                        twitchId: this.twitchId,
                        npcId: this._giveMode.npcId,
                        questId: this._giveMode.questId,
                        givenItems: this._giveMode.selectedItems.map(s => s.itemId)
                    });
                }
            }
        },

        // ═══ AUDIO SYSTEM ═══
        _playSound(name) {
            if (!this._survieAudio || !this._survieAudio[name]) return;
            const sound = this._survieAudio[name];
            sound.currentTime = 0;
            sound.play().catch(() => {});
        },

        _playSurvieStartSound() {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const t = ctx.currentTime;
                const bip1 = ctx.createOscillator();
                const g1 = ctx.createGain();
                bip1.connect(g1); g1.connect(ctx.destination);
                bip1.type = 'square';
                bip1.frequency.setValueAtTime(880, t);
                g1.gain.setValueAtTime(0.12, t);
                g1.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
                bip1.start(t); bip1.stop(t + 0.08);
                const bip2 = ctx.createOscillator();
                const g2 = ctx.createGain();
                bip2.connect(g2); g2.connect(ctx.destination);
                bip2.type = 'square';
                bip2.frequency.setValueAtTime(1320, t + 0.08);
                g2.gain.setValueAtTime(0, t);
                g2.gain.setValueAtTime(0.14, t + 0.08);
                g2.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
                bip2.start(t + 0.08); bip2.stop(t + 0.19);
                const noise = ctx.createBufferSource();
                const buf = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate);
                const d = buf.getChannelData(0);
                for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.02));
                noise.buffer = buf;
                const nG = ctx.createGain();
                const hp = ctx.createBiquadFilter();
                hp.type = 'highpass'; hp.frequency.value = 4000;
                noise.connect(hp); hp.connect(nG); nG.connect(ctx.destination);
                nG.gain.setValueAtTime(0.08, t + 0.07);
                noise.start(t + 0.07);
            } catch(e) {}
        },

        _showTraceOnText() {
            const intro = document.createElement('div');
            intro.id = 'survieIntro';
            intro.className = 'survie-intro-text';
            intro.innerHTML = `TRACE <span class="intro-on">ON</span>`;
            document.body.appendChild(intro);
            
            setTimeout(() => {
                intro.classList.add('exit');
                setTimeout(() => {
                    intro.innerHTML = `ACCOMPLISSEZ VOS OBJECTIFS`;
                    intro.classList.remove('exit');
                    intro.classList.add('subtitle');
                    
                    setTimeout(() => {
                        intro.classList.add('exit');
                        setTimeout(() => intro.remove(), 500);
                    }, 1800);
                }, 400);
            }, 1800);
        },

        // ═══ ASCENSION COUNTDOWN ═══
        _startAscensionCountdown(countdownEndsAt) {
            const existing = document.getElementById('ascensionCountdown');
            if (existing) existing.remove();
            
            const self = this;
            const overlay = document.createElement('div');
            overlay.id = 'ascensionCountdown';
            overlay.className = 'ascension-countdown';
            overlay.innerHTML = '<div class="asc-cd-number"></div>';
            document.body.appendChild(overlay);
            
            const numEl = overlay.querySelector('.asc-cd-number');
            const steps = ['3', '2', '1', 'GO'];
            let lastStep = -1;
            
            function tick() {
                const remaining = countdownEndsAt - Date.now();
                
                if (remaining <= 0) {
                    numEl.classList.remove('pop', 'go');
                    numEl.style.animation = 'none';
                    numEl.style.opacity = '0';
                    overlay.classList.add('fade-out');
                    setTimeout(() => overlay.remove(), 400);
                    return;
                }
                
                let step;
                if (remaining > 3000) step = 0;
                else if (remaining > 2000) step = 1;
                else if (remaining > 1000) step = 2;
                else step = 3;
                
                if (step !== lastStep) {
                    lastStep = step;
                    numEl.textContent = steps[step];
                    numEl.classList.remove('pop', 'go');
                    void numEl.offsetHeight;
                    numEl.classList.add('pop');
                    
                    if (step === 3) {
                        numEl.classList.remove('pop');
                        numEl.classList.add('go');
                        for (let i = 0; i < 2; i++) {
                            const ring = document.createElement('div');
                            ring.className = 'asc-cd-ring';
                            overlay.appendChild(ring);
                            setTimeout(() => ring.remove(), 900);
                        }
                        self._playAscensionGoSound();
                    } else {
                        // 🆕 Tick sound façon Mario Kart pour 3, 2, 1
                        self._playAscensionTickSound();
                    }
                }
                
                requestAnimationFrame(tick);
            }
            
            requestAnimationFrame(tick);
        },

        _playAscensionGoSound() {
            try {
                if (!this._ascGuessCtx) {
                    this._ascGuessCtx = new (window.AudioContext || window.webkitAudioContext)();
                }
                const ctx = this._ascGuessCtx;
                if (ctx.state === 'suspended') ctx.resume();
                const t = ctx.currentTime;
                const b1 = ctx.createOscillator();
                const g1 = ctx.createGain();
                b1.connect(g1); g1.connect(ctx.destination);
                b1.type = 'square';
                b1.frequency.setValueAtTime(880, t);
                g1.gain.setValueAtTime(0.12, t);
                g1.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
                b1.start(t); b1.stop(t + 0.08);
                const b2 = ctx.createOscillator();
                const g2 = ctx.createGain();
                b2.connect(g2); g2.connect(ctx.destination);
                b2.type = 'square';
                b2.frequency.setValueAtTime(1320, t + 0.07);
                g2.gain.setValueAtTime(0, t);
                g2.gain.setValueAtTime(0.14, t + 0.07);
                g2.gain.exponentialRampToValueAtTime(0.001, t + 0.17);
                b2.start(t + 0.07); b2.stop(t + 0.18);
                const n = ctx.createBufferSource();
                const buf = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate);
                const d = buf.getChannelData(0);
                for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.02));
                n.buffer = buf;
                const ng = ctx.createGain();
                const hp = ctx.createBiquadFilter();
                hp.type = 'highpass'; hp.frequency.value = 4000;
                n.connect(hp); hp.connect(ng); ng.connect(ctx.destination);
                ng.gain.setValueAtTime(0.08, t + 0.06);
                n.start(t + 0.06);
            } catch(e) {}
        },

        // 🆕 Tick sound façon Mario Kart — joué pour 3, 2, 1 dans le countdown
        _playAscensionTickSound() {
            try {
                if (!this._ascGuessCtx) {
                    this._ascGuessCtx = new (window.AudioContext || window.webkitAudioContext)();
                }
                const ctx = this._ascGuessCtx;
                if (ctx.state === 'suspended') ctx.resume();
                const t = ctx.currentTime;
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.type = 'square';
                o.frequency.setValueAtTime(700, t);
                g.gain.setValueAtTime(0, t);
                g.gain.linearRampToValueAtTime(0.09, t + 0.005);
                g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
                o.connect(g).connect(ctx.destination);
                o.start(t);
                o.stop(t + 0.1);
            } catch(e) {}
        },

        // ═══ ASCENSION — Player UI Methods ═══
        _initAscensionUI() {
            const screen = document.querySelector('.ascension-player-screen');
            if (!screen) return;
            
            screen.innerHTML = `
                <div class="asc-player-topbar asc-pre-start">
                    <div class="asc-topbar-left">
                        <div class="asc-timer-wrap" id="ascPlayerTimerWrap">
                            <svg class="asc-timer-svg" viewBox="0 0 44 44" width="36" height="36">
                                <circle class="asc-timer-bg" cx="22" cy="22" r="18"/>
                                <circle class="asc-timer-fill" id="ascPlayerTimerFill" cx="22" cy="22" r="18"/>
                            </svg>
                            <div class="asc-timer-text" id="ascPlayerTimerText"></div>
                        </div>
                    </div>
                </div>
                <div class="asc-floor-title asc-pre-start" id="ascPlayerFloorTitle"></div>
                <div class="asc-player-content asc-pre-start" id="ascPlayerContent"></div>
                <div class="asc-player-tower asc-tower-reveal">
                    <div class="asc-tower-crown">♛</div>
                    <div class="asc-tower-track">
                        <div class="asc-tower-marks" id="ascPlayerTowerMarks"></div>
                        <div class="asc-tower-players" id="ascPlayerTowerPlayers"></div>
                    </div>
                </div>
            `;
            
            const marks = document.getElementById('ascPlayerTowerMarks');
            if (marks) {
                for (let i = 1; i < this.ascension.floors; i++) {
                    const m = document.createElement('div');
                    m.className = 'asc-tower-mark';
                    m.style.bottom = (i / this.ascension.floors * 100) + '%';
                    if (i % 5 === 0) { m.classList.add('major'); m.dataset.floor = i; }
                    marks.appendChild(m);
                }
            }
            
            // 🆕 Position immédiatement les joueurs sur la tour (tous à l'étage 0)
            //    pour que la tour soit déjà animée et stylée pendant le countdown 3-2-1-GO
            this._updateAscensionPlayerTower();
        },

        _renderAscensionPlayerFloor(floorData, floorIndex) {
            // 🆕 Garde défensive : tant que le countdown initial 3-2-1-GO est actif,
            // on diffère TOUT le rendu (titre + cards) pour éviter le flash en arrière-plan.
            // Peu importe d'où l'appel vient (ascension-floor-start, ascension-state, …).
            const now = Date.now();
            const countdownEnd = this.ascension?.countdownEndsAt || 0;
            if (countdownEnd > now) {
                const delay = countdownEnd - now;
                setTimeout(() => {
                    this._renderAscensionPlayerFloor(floorData, floorIndex);
                }, delay);
                return;
            }
            
            // 🆕 Garde de déduplication : si on a déjà rendu ce floor il y a moins de 2 secondes,
            //    on skip ce re-render. Évite le double render quand 2 events (ascension-floor-start
            //    et ascension-state par exemple) tentent tous deux de render le même étage.
            const lastRender = this._lastAscFloorRender;
            if (lastRender && lastRender.floor === floorIndex && (now - lastRender.at) < 2000) {
                return;
            }
            this._lastAscFloorRender = { floor: floorIndex, at: now };
            
            // Reveal UI elements au cas où ils seraient encore cachés (idempotent)
            document.querySelectorAll('.ascension-player-screen .asc-pre-start').forEach(el => {
                el.classList.remove('asc-pre-start');
                el.classList.add('asc-reveal');
            });
            
            // 🆕 Cleanup du resize listener Order si on change d'étage (le grid précédent
            // sera détaché du DOM, son listener doit l'être aussi)
            if (this._ascOrderResizeHandler) {
                window.removeEventListener('resize', this._ascOrderResizeHandler);
                this._ascOrderResizeHandler = null;
                clearTimeout(this._ascOrderResizeTO);
            }
            
            const content = document.getElementById('ascPlayerContent');
            const floorNum = document.getElementById('ascPlayerFloorNum');
            const floorTitle = document.getElementById('ascPlayerFloorTitle');
            
            // 🆕 Le badge ÉTAGE en haut à gauche n'existe plus, mais on reste safe avec le if
            if (floorNum) floorNum.textContent = floorIndex + 1;
            
            // Animate floor title + subtitle
            if (floorTitle) {
                // 🆕 Retirer asc-reveal (résiduel du 1er countdown reveal) pour éviter
                //    qu'il se redéclenche au moment où on retire `pop` plus tard.
                floorTitle.classList.remove('asc-reveal');
                floorTitle.classList.remove('pop');
                
                const desc = this._getAscFloorDesc(floorData);
                const etageNum = floorIndex + 1;
                const label = floorData?.label || '';
                // 🆕 Pour Intruder : pas de subtitle (déplacé dans le sidebar) mais on garde le divider stylisé
                const isIntruder = floorData?.type === 'intruder';
                floorTitle.innerHTML = '<span class="asc-title-main">E' + etageNum + ' — ' + label + '</span>' +
                    (desc ? '<div class="asc-title-divider"></div><span class="asc-title-sub">' + desc + '</span>'
                          : (isIntruder ? '<div class="asc-title-divider"></div>' : ''));
                void floorTitle.offsetHeight;
                floorTitle.classList.add('pop');
            }
            
            if (!content || !floorData) return;
            
            // Reset l'état de validation pour cet étage
            this.ascension.guessSolved = {};
            this.ascension.intruderFound = null;  // 🆕 Reset tracker Intruder pour le nouveau floor
            
            // Render le mini-jeu correspondant au type
            content.innerHTML = '';
            switch (floorData.type) {
                case 'guess':
                    this._renderGuessGame(content, floorData);
                    break;
                case 'order':
                    this._renderOrderGame(content, floorData);
                    break;
                case 'intruder':
                    this._renderIntruderGame(content, floorData);
                    break;
                // Les autres types seront ajoutés progressivement
                default:
                    content.innerHTML = '<div class="asc-todo">Mini-jeu "' + floorData.type + '" à venir...</div>';
            }
        },
        
        // 🆕 Apply stagger-in animation aux 4 éléments centraux (titre, divider, subtitle, content)
        // Appelé après _renderAscensionPlayerFloor lors d'une transition d'étage à étage
        _applyAscStaggerIn() {
            const titleEl = document.getElementById('ascPlayerFloorTitle');
            const content = document.getElementById('ascPlayerContent');
            
            const items = [
                { el: titleEl?.querySelector('.asc-title-main'),    delay: 'asc-stagger-d1' },
                { el: titleEl?.querySelector('.asc-title-divider'), delay: 'asc-stagger-d2' },
                { el: titleEl?.querySelector('.asc-title-sub'),     delay: 'asc-stagger-d3' },
                { el: content,                                       delay: 'asc-stagger-d4' },
            ];
            // 🆕 Applique d'abord les classes d'animation. La classe asc-stagger-in contient
            //    `opacity: 0; transform: translateY(20px)` au début → l'élément reste invisible
            //    avant que l'animation kick in. Comme ça, même si on retire l'inline opacity:0
            //    qui était en place, il n'y a pas de "flash visible" intermédiaire.
            items.forEach(({ el, delay }) => {
                if (!el) return;
                el.classList.remove('asc-stagger-in', 'asc-stagger-d1', 'asc-stagger-d2', 'asc-stagger-d3', 'asc-stagger-d4');
                void el.offsetWidth;  // force reflow
                el.classList.add('asc-stagger-in', delay);
            });
            // 🆕 Maintenant que la classe asc-stagger-in est posée (et donc opacity:0 via CSS),
            //    on peut retirer l'inline opacity:0 qui était posé par doReveal.
            //    Sans ça, l'inline persiste après le cleanup à 700ms et le content redisparait.
            //    NOTE : on retire les inlines APRÈS un nouveau reflow pour s'assurer que la
            //    classe a bien pris effet avant.
            requestAnimationFrame(() => {
                if (titleEl) { titleEl.style.opacity = ''; titleEl.style.transform = ''; }
                if (content) { content.style.opacity = ''; content.style.transform = ''; }
            });
            // Cleanup les classes après l'anim pour ne pas affecter les renders suivants
            setTimeout(() => {
                items.forEach(({ el }) => {
                    if (el) el.classList.remove('asc-stagger-in', 'asc-stagger-d1', 'asc-stagger-d2', 'asc-stagger-d3', 'asc-stagger-d4');
                });
            }, 700);
        },

        // 🎯 Mini-jeu GUESS — 5 personnages à deviner par leur image
        _renderGuessGame(container, floorData) {
            const grid = document.createElement('div');
            grid.className = 'asc-guess-grid';
            
            floorData.characters.forEach(char => {
                const card = document.createElement('div');
                card.className = 'asc-guess-card';
                card.dataset.charId = char.id;
                
                const imgWrap = document.createElement('div');
                imgWrap.className = 'asc-guess-img-wrap';
                const img = document.createElement('img');
                img.className = 'asc-guess-img';
                img.src = char.img;
                img.alt = '';
                img.draggable = false;
                img.onerror = () => { img.style.display = 'none'; imgWrap.classList.add('asc-guess-img-fail'); };
                imgWrap.appendChild(img);
                
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'asc-guess-input';
                input.placeholder = 'Nom...';
                input.maxLength = 30;
                input.autocomplete = 'off';
                input.spellcheck = false;
                input.dataset.charId = char.id;
                
                // 🆕 Validation instantanée à chaque frappe (source='input', sans shake si faux)
                input.addEventListener('input', (e) => {
                    const val = e.target.value.trim();
                    if (val.length < 2) return; // Pas la peine de checker pour 1 lettre
                    this._submitGuessCheck(char.id, val, 'input');
                });
                
                // 🆕 Validation explicite sur Enter (source='enter', shake si faux)
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = input.value.trim();
                        if (val) this._submitGuessCheck(char.id, val, 'enter');
                    }
                });
                
                card.appendChild(imgWrap);
                card.appendChild(input);
                grid.appendChild(card);
            });
            
            container.appendChild(grid);
            
            // 🆕 RESTAURATION (mode race) : si on reconnect après refresh et qu'on avait
            //    déjà validé certaines cards, on les marque visuellement (stamp + disabled)
            const validated = this.ascension?.myValidatedGuesses || [];
            if (validated.length > 0) {
                console.log(`🏔️ Restauration de ${validated.length} guess(es) déjà validée(s)`);
                if (!this.ascension.guessSolved) this.ascension.guessSolved = {};
                validated.forEach(charId => {
                    const card = grid.querySelector(`.asc-guess-card[data-char-id="${charId}"]`);
                    if (!card) return;
                    card.classList.add('asc-guess-correct');
                    if (!card.querySelector('.asc-guess-stamp')) {
                        const stamp = document.createElement('div');
                        stamp.className = 'asc-guess-stamp';
                        stamp.textContent = 'PERFECT';
                        // Pas d'animation au refresh : le stamp apparaît directement sans pop
                        stamp.style.animation = 'none';
                        stamp.style.transform = 'translate(-50%, -50%) rotate(-12deg) scale(1)';
                        stamp.style.opacity = '1';
                        card.appendChild(stamp);
                    }
                    const input = card.querySelector('.asc-guess-input');
                    if (input) input.disabled = true;
                    this.ascension.guessSolved[charId] = true;
                });
                // Reset myValidatedGuesses pour ne pas re-restaurer si on re-render le floor
                this.ascension.myValidatedGuesses = [];
            }
            
            // Focus sur le 1er input non-validé (skip ceux déjà validés au refresh)
            setTimeout(() => {
                const firstAvailable = grid.querySelector('.asc-guess-input:not([disabled])');
                if (firstAvailable) firstAvailable.focus();
            }, 100);
        },

        _submitGuessCheck(characterId, name, source) {
            if (!this.ascension?.active || this.ascension.validated) return;
            if (!this.ascension.guessSolved) this.ascension.guessSolved = {};
            if (this.ascension.guessSolved[characterId]) return; // Déjà validé
            
            this.socket.emit('ascension-check-guess', { characterId, name, source: source || 'input' });
        },

        // 🎯 Mini-jeu ORDER — drag & drop pour classer 5 arcs par ordre chronologique
        _renderOrderGame(container, floorData) {
            const wrap = document.createElement('div');
            wrap.className = 'asc-order-wrap';
            
            // Grille de 5 cards
            const grid = document.createElement('div');
            grid.className = 'asc-order-grid';
            grid.dataset.role = 'order-grid';
            
            floorData.arcs.forEach((arc, idx) => {
                const card = this._createOrderCard(arc, idx);
                grid.appendChild(card);
            });
            
            // Setup les listeners (un seul par grid, pas par card)
            this._setupOrderDragListeners(grid);
            
            wrap.appendChild(grid);
            container.appendChild(wrap);
            
            // 🆕 Build les connecteurs SVG après que le DOM soit en place et stylé
            requestAnimationFrame(() => {
                requestAnimationFrame(() => this._buildOrderConnectors(grid));
            });
            
            // 🆕 Re-build au resize (les positions changent → les paths SVG aussi)
            if (this._ascOrderResizeHandler) {
                window.removeEventListener('resize', this._ascOrderResizeHandler);
            }
            this._ascOrderResizeHandler = () => {
                clearTimeout(this._ascOrderResizeTO);
                this._ascOrderResizeTO = setTimeout(() => {
                    if (document.body.contains(grid)) this._buildOrderConnectors(grid);
                }, 150);
            };
            window.addEventListener('resize', this._ascOrderResizeHandler);
        },

        _createOrderCard(arc, idx) {
            const card = document.createElement('div');
            card.className = 'asc-order-card';
            card.dataset.arcId = arc.id;
            
            // Numéro d'ordre actuel (badge en haut à gauche)
            const numBadge = document.createElement('div');
            numBadge.className = 'asc-order-num';
            numBadge.textContent = idx + 1;
            
            // Image de l'arc
            const imgWrap = document.createElement('div');
            imgWrap.className = 'asc-order-img-wrap';
            const img = document.createElement('img');
            img.className = 'asc-order-img';
            img.src = arc.img;
            img.alt = '';
            img.draggable = false;
            img.onerror = () => { img.style.display = 'none'; imgWrap.classList.add('asc-order-img-fail'); };
            imgWrap.appendChild(img);
            
            // Nom de l'arc en bas
            const nameDiv = document.createElement('div');
            nameDiv.className = 'asc-order-name';
            nameDiv.textContent = arc.name;
            
            card.appendChild(numBadge);
            card.appendChild(imgWrap);
            card.appendChild(nameDiv);
            return card;
        },

        // Drag & drop custom avec pointer events (marche desktop + mobile)
        // Au drop, FLIP animation pour le swap des cards adjacentes.
        _setupOrderDragListeners(grid) {
            const self = this;
            let dragCard = null;
            let pointerId = null;
            let startX = 0, startY = 0;
            let originRect = null;
            let hoveredTarget = null;  // 🆕 Cible actuellement highlightée — source de vérité pour le drop
            
            const onPointerDown = (e) => {
                if (self.ascension?.validated) return;
                const card = e.target.closest('.asc-order-card');
                if (!card || !grid.contains(card)) return;
                
                e.preventDefault();
                dragCard = card;
                pointerId = e.pointerId;
                startX = e.clientX;
                startY = e.clientY;
                originRect = card.getBoundingClientRect();
                hoveredTarget = null;
                
                card.setPointerCapture(pointerId);
                card.classList.add('asc-order-dragging');
            };
            
            const onPointerMove = (e) => {
                if (!dragCard) return;
                e.preventDefault();
                
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                dragCard.style.transform = `translate(${dx}px, ${dy}px) scale(1.05) rotate(2deg)`;
                
                // 🆕 Highlight la card cible — on stocke la cible dans hoveredTarget
                //    pour la réutiliser au drop (cohérence visuel ↔ logique).
                const target = self._findOrderTargetCard(grid, dragCard);
                if (target !== hoveredTarget) {
                    if (hoveredTarget) hoveredTarget.classList.remove('asc-order-target');
                    if (target) target.classList.add('asc-order-target');
                    hoveredTarget = target;
                }
            };
            
            const onPointerUp = (e) => {
                if (!dragCard) return;
                const card = dragCard;
                
                // 🆕 On utilise hoveredTarget directement (= ce que le user VOIT highlighté)
                //    Plus de recalcul → plus de risque d'incohérence visuel/logique
                const target = hoveredTarget;
                
                // Cleanup highlight
                if (hoveredTarget) hoveredTarget.classList.remove('asc-order-target');
                hoveredTarget = null;
                
                if (target && target !== card) {
                    // 🆕 INSERT basé sur l'INDEX LOGIQUE (pas la position visuelle, qui dépend
                    //    d'où la souris a lâché et créait des bugs "1x sur 2").
                    //    Règle simple : la dragCard prend la place de la cible.
                    //    - Si dragCard vient d'AVANT la cible → on l'insère APRÈS (la cible recule)
                    //    - Si dragCard vient d'APRÈS la cible → on l'insère AVANT (la cible avance)
                    const allCards = Array.from(grid.querySelectorAll('.asc-order-card'));
                    const dragIdx   = allCards.indexOf(card);
                    const targetIdx = allCards.indexOf(target);
                    const insertBefore = dragIdx > targetIdx;
                    self._reorderOrderCardsWithFLIP(grid, card, target, insertBefore);
                    self._playAscOrderSwapSound?.();  // 🔊 Son d'interchange
                } else {
                    // Pas de cible → retour smooth à la position originale
                    card.style.transition = 'transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)';
                    card.style.transform = '';
                    setTimeout(() => { card.style.transition = ''; }, 260);
                }
                
                card.classList.remove('asc-order-dragging');
                try { card.releasePointerCapture(pointerId); } catch(e) {}
                
                // Update les numéros d'ordre + envoyer au serveur pour validation
                setTimeout(() => {
                    self._updateOrderNums(grid);
                    self._buildOrderConnectors(grid);  // 🆕 Rebuild les connecteurs (positions des cards ont changé)
                    self._submitOrderCheck(grid);
                }, 520);  // 🆕 Aligné avec FLIP cascade (380ms + jusqu'à 80ms stagger)
                
                dragCard = null;
                pointerId = null;
            };
            
            grid.addEventListener('pointerdown', onPointerDown);
            grid.addEventListener('pointermove', onPointerMove);
            grid.addEventListener('pointerup', onPointerUp);
            grid.addEventListener('pointercancel', onPointerUp);
        },

        // Trouve la card sous le pointeur (ignorant la dragCard elle-même)
        // 🆕 Trouve la card cible par chevauchement HORIZONTAL avec la dragCard.
        //    Beaucoup plus permissif et fiable que l'ancienne méthode (basée sur le pointer X seul).
        //    Renvoie la card avec le plus grand overlap, à condition qu'il dépasse un seuil minimum.
        _findOrderTargetCard(grid, dragCard, pointerX) {
            const cards = Array.from(grid.querySelectorAll('.asc-order-card')).filter(c => c !== dragCard);
            if (cards.length === 0) return null;
            
            const dragRect = dragCard.getBoundingClientRect();
            const dragLeft  = dragRect.left;
            const dragRight = dragRect.right;
            const dragWidth = dragRect.width;
            
            // Seuil : il faut au moins 25% de la largeur d'une card en chevauchement pour considérer une cible
            const MIN_OVERLAP = dragWidth * 0.25;
            
            let bestCard = null;
            let bestOverlap = 0;
            
            for (const c of cards) {
                const rect = c.getBoundingClientRect();
                // Calcul de l'overlap horizontal entre dragRect et rect
                const overlapLeft  = Math.max(dragLeft,  rect.left);
                const overlapRight = Math.min(dragRight, rect.right);
                const overlap = Math.max(0, overlapRight - overlapLeft);
                
                if (overlap > bestOverlap && overlap >= MIN_OVERLAP) {
                    bestOverlap = overlap;
                    bestCard = c;
                }
            }
            
            return bestCard;
        },

        // FLIP technique : INSERT logic — la dragCard se place à la position du target,
        // et toutes les cards entre les deux se décalent d'un cran. Animation fluide en cascade
        // pour que le mouvement des cards intermédiaires soit lisible.
        _reorderOrderCardsWithFLIP(grid, dragCard, targetCard, insertBefore) {
            const allCards = Array.from(grid.querySelectorAll('.asc-order-card'));
            
            // 1. FIRST : capture les positions actuelles
            const positions = new Map();
            allCards.forEach(c => positions.set(c, c.getBoundingClientRect()));
            
            // Index du drag et du target avant déplacement (pour la cascade)
            const dragIdxBefore = allCards.indexOf(dragCard);
            
            // 2. LAST : reorder DOM (insertion à la position du target)
            dragCard.style.transition = 'none';
            dragCard.style.transform = '';
            
            if (insertBefore) {
                grid.insertBefore(dragCard, targetCard);
            } else {
                grid.insertBefore(dragCard, targetCard.nextSibling);
            }
            
            // 3. INVERT : pour chaque card qui a bougé, calcule la translation depuis l'ancienne position
            const movedCards = [];
            allCards.forEach(c => {
                const oldRect = positions.get(c);
                const newRect = c.getBoundingClientRect();
                const dx = oldRect.left - newRect.left;
                const dy = oldRect.top  - newRect.top;
                if (dx === 0 && dy === 0) return;
                movedCards.push({ card: c, dx, dy });
                c.style.transition = 'none';
                c.style.transform = `translate(${dx}px, ${dy}px)`;
            });
            
            // 4. PLAY : anim avec délai en cascade pour les cards "poussées" (pas la dragCard)
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const easing = 'cubic-bezier(0.34, 1.2, 0.5, 1)';  // léger overshoot doux
                    const duration = 380;
                    
                    movedCards.forEach(({ card }) => {
                        // dragCard part immédiatement, les cards intermédiaires ont un mini délai
                        // proportionnel à leur distance de la dragCard (cascade lisible)
                        const isDrag = card === dragCard;
                        const idx = allCards.indexOf(card);
                        const stagger = isDrag ? 0 : Math.min(80, Math.abs(idx - dragIdxBefore) * 25);
                        
                        card.style.transition = `transform ${duration}ms ${easing} ${stagger}ms`;
                        card.style.transform = '';
                    });
                    
                    setTimeout(() => {
                        movedCards.forEach(({ card }) => {
                            card.style.transition = '';
                            card.style.transform = '';
                        });
                    }, duration + 120);
                });
            });
        },

        // Met à jour les badges de position (1, 2, 3, 4, 5) selon l'ordre actuel dans le DOM
        _updateOrderNums(grid) {
            const cards = grid.querySelectorAll('.asc-order-card');
            cards.forEach((c, i) => {
                const num = c.querySelector('.asc-order-num');
                if (num) num.textContent = i + 1;
            });
        },

        // Envoie l'ordre actuel au serveur pour validation continue
        _submitOrderCheck(grid) {
            if (!this.ascension?.active || this.ascension.validated) return;
            const order = Array.from(grid.querySelectorAll('.asc-order-card')).map(c => c.dataset.arcId);
            this.socket.emit('ascension-check-order', { order });
        },
        
        // 🆕 Construit (ou reconstruit) les connecteurs SVG entre les cards de la roadmap.
        // Calcule des courbes de Bézier cubiques entre les bords droit/gauche des cards consécutives,
        // avec une petite flèche à l'arrivée.
        _buildOrderConnectors(grid) {
            if (!grid || !grid.isConnected) return;
            
            // Cleanup ancien SVG s'il existe
            const old = grid.querySelector('.asc-order-connectors');
            if (old) old.remove();
            
            const cards = grid.querySelectorAll('.asc-order-card');
            if (cards.length < 2) return;
            
            // 🆕 Forcer le cleanup des transforms FLIP résiduels avant de mesurer les positions
            //    (sinon on lit des positions intermédiaires d'animation → courbes en S déformées)
            cards.forEach(c => {
                if (c.style.transform || c.style.transition) {
                    c.style.transition = '';
                    c.style.transform = '';
                }
            });
            
            const containerRect = grid.getBoundingClientRect();
            const w = containerRect.width;
            const h = containerRect.height;
            if (w === 0 || h === 0) return;
            
            // Calcul des points d'ancrage (centre vertical sur les bords droit/gauche)
            const points = [];
            cards.forEach(card => {
                const r = card.getBoundingClientRect();
                points.push({
                    left:  r.left  - containerRect.left,
                    right: r.right - containerRect.left,
                    cy:    (r.top + r.bottom) / 2 - containerRect.top,
                });
            });
            
            const SVG_NS = 'http://www.w3.org/2000/svg';
            const svg = document.createElementNS(SVG_NS, 'svg');
            svg.setAttribute('class', 'asc-order-connectors');
            svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
            svg.setAttribute('preserveAspectRatio', 'none');
            
            // Defs : gradient blanc symétrique (transparent → opaque → transparent)
            const defs = document.createElementNS(SVG_NS, 'defs');
            defs.innerHTML = `
                <linearGradient id="ascOrderGradWhite" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.35"/>
                    <stop offset="50%"  stop-color="#ffffff" stop-opacity="1"/>
                    <stop offset="100%" stop-color="#ffffff" stop-opacity="0.35"/>
                </linearGradient>
            `;
            svg.appendChild(defs);
            
            // Pour chaque paire de cards consécutives → un path en courbe + une flèche
            for (let i = 0; i < points.length - 1; i++) {
                const a = points[i], b = points[i + 1];
                const x1 = a.right + 4, y1 = a.cy;
                const x2 = b.left - 4,  y2 = b.cy;
                const dx = x2 - x1;
                const cx1 = x1 + dx * 0.45, cy1 = y1;
                const cx2 = x2 - dx * 0.45, cy2 = y2;
                const pathD = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
                
                const path = document.createElementNS(SVG_NS, 'path');
                path.setAttribute('class', 'conn-path');
                path.setAttribute('d', pathD);
                svg.appendChild(path);
                
                // Petite flèche triangulaire à l'arrivée, alignée sur la tangente
                const angle = Math.atan2(y2 - cy2, x2 - cx2) * 180 / Math.PI;
                const arrow = document.createElementNS(SVG_NS, 'path');
                arrow.setAttribute('class', 'conn-arrow');
                arrow.setAttribute('d', 'M 0 0 L -10 -5 L -7 0 L -10 5 Z');
                arrow.setAttribute('transform', `translate(${x2}, ${y2}) rotate(${angle})`);
                svg.appendChild(arrow);
            }
            
            grid.appendChild(svg);
        },

        // ═══════════════════════════════════════════════════════════════
        // 🎯 ASCENSION — Mini-jeu INTRUDER (Joueur)
        // ═══════════════════════════════════════════════════════════════
        // 3 variantes :
        //   - 'not_in'    : trouvez les N intrus qui ne sont pas de [anime]
        //   - 'in'        : trouvez les N personnages de [anime]
        //   - 'find_one'  : trouvez [personnage]
        // Validation incrémentale : chaque clic envoie 'ascension-check-intruder'
        // au serveur qui répond {correct, characterId, foundCount, totalTargets}
        _renderIntruderGame(container, floorData) {
            const characters = floorData.characters || [];
            const totalTargets = floorData.totalTargets || 1;
            
            // Restauration : si on a déjà trouvé des targets (refresh page)
            const alreadyFound = (this.ascension.intruderFound instanceof Set)
                ? this.ascension.intruderFound
                : new Set();
            
            // Wrapper principal en row : grille à gauche + panneau à droite
            const wrap = document.createElement('div');
            wrap.className = 'asc-intruder-wrap';
            
            // Grille (à gauche)
            const grid = document.createElement('div');
            grid.className = 'asc-intruder-grid';
            
            characters.forEach(char => {
                const card = this._createIntruderCard(char, floorData);
                if (alreadyFound.has(char.id)) {
                    card.classList.add('asc-intruder-correct');
                    card.style.pointerEvents = 'none';
                }
                grid.appendChild(card);
            });
            
            // Panneau latéral à droite : description + compteur
            const sidebar = document.createElement('div');
            sidebar.className = 'asc-intruder-sidebar';
            
            // Description du mini-jeu (au-dessus du compteur)
            const desc = document.createElement('div');
            desc.className = 'asc-intruder-desc';
            desc.textContent = floorData.instruction || 'Trouvez les intrus';
            sidebar.appendChild(desc);
            
            const counter = document.createElement('div');
            counter.className = 'asc-intruder-counter';
            const counterLabel = (floorData.variant === 'not_in') ? 'Intrus trouvés' : 'Personnages trouvés';
            counter.innerHTML = '<span class="asc-intruder-counter-label">' + counterLabel + '</span>'
                + '<span class="asc-intruder-counter-num"><span id="ascIntruderCount">' + alreadyFound.size + '</span><span class="asc-intruder-counter-sep">/</span>' + totalTargets + '</span>';
            sidebar.appendChild(counter);
            
            wrap.appendChild(grid);
            wrap.appendChild(sidebar);
            container.appendChild(wrap);
            
            // Si tout est déjà trouvé, désactiver les autres cartes
            if (alreadyFound.size >= totalTargets) {
                grid.querySelectorAll('.asc-intruder-card:not(.asc-intruder-correct)').forEach(c => {
                    c.style.pointerEvents = 'none';
                    c.style.opacity = '0.4';
                });
            }
        },
        
        _createIntruderCard(char, floorData) {
            const card = document.createElement('div');
            card.className = 'asc-intruder-card';
            card.dataset.id = char.id;
            
            // Img (avec fallback placeholder coloré si pas d'image)
            const img = document.createElement('div');
            img.className = 'asc-intruder-card-img';
            if (char.img) {
                img.style.backgroundImage = "url('" + char.img + "')";
            } else {
                // Placeholder visuel fallback
                img.style.background = 'linear-gradient(135deg, #2a2a3a, #1a1a2a)';
                img.textContent = (char.name || '?').charAt(0).toUpperCase();
                img.style.display = 'flex';
                img.style.alignItems = 'center';
                img.style.justifyContent = 'center';
                img.style.fontFamily = "'Orbitron', sans-serif";
                img.style.fontSize = '28px';
                img.style.color = 'rgba(255,255,255,0.4)';
            }
            card.appendChild(img);
            
            // Nom
            const name = document.createElement('div');
            name.className = 'asc-intruder-card-name';
            name.textContent = char.name || '';
            card.appendChild(name);
            
            // Click handler
            card.addEventListener('click', (e) => this._onIntruderCardClick(card, char, floorData, e));

            return card;
        },

        _onIntruderCardClick(card, char, floorData, event) {
            // Si déjà trouvé / déjà cliqué → ignorer
            if (card.classList.contains('asc-intruder-correct')) return;
            if (this.ascension?.validated) return;

            // 🔊 Click tactile immédiat (feedback neutre avant résultat serveur)
            this._playAscIntruderClickSound();

            // 🆕 Feedback visuel "press" + ripple depuis le point de clic
            this._triggerIntruderPress(card, event);

            // Animation feedback "wrong" se réapplique si on reclique
            card.classList.remove('asc-intruder-wrong');
            void card.offsetWidth;

            // Envoyer la validation au serveur
            this.socket.emit('ascension-check-intruder', { characterId: char.id });
        },

        _triggerIntruderPress(card, event) {
            // 🆕 Press feedback : classe pressed + ripple stylé au point de clic
            card.classList.remove('asc-intruder-pressed');
            void card.offsetWidth;
            card.classList.add('asc-intruder-pressed');
            setTimeout(() => card.classList.remove('asc-intruder-pressed'), 220);

            const rect = card.getBoundingClientRect();
            const ripple = document.createElement('span');
            ripple.className = 'asc-intruder-ripple';
            const x = event ? event.clientX - rect.left : rect.width / 2;
            const y = event ? event.clientY - rect.top : rect.height / 2;
            const size = Math.max(rect.width, rect.height) * 0.5;
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.style.width = size + 'px';
            ripple.style.height = size + 'px';
            card.appendChild(ripple);
            setTimeout(() => ripple.remove(), 620);
        },
        
        _handleIntruderResult(data) {
            // data = {correct, characterId, foundCount, totalTargets, alreadyFound?}
            const grid = document.querySelector('.asc-intruder-grid');
            if (!grid) return;
            
            const card = grid.querySelector('.asc-intruder-card[data-id="' + data.characterId + '"]');
            if (!card) return;
            
            if (data.correct) {
                // ─── BONNE RÉPONSE — apparition burst minimaliste blanc ───
                card.classList.add('asc-intruder-correct');
                card.style.pointerEvents = 'none';
                
                // Update compteur
                const countEl = document.getElementById('ascIntruderCount');
                if (countEl) countEl.textContent = data.foundCount;
                
                // Tracker côté client pour le refresh
                if (!(this.ascension.intruderFound instanceof Set)) {
                    this.ascension.intruderFound = new Set();
                }
                this.ascension.intruderFound.add(data.characterId);
                
                // Petit son de validation (réutilise le son swap d'order ou un similaire)
                this._playAscIntruderCorrectSound();
                
                // Si tout trouvé → effet de validation stylé : cartes restantes fadent, puis wrap zoom-out + blur
                if (data.foundCount >= data.totalTargets) {
                    this._playAscIntruderVictorySound();
                    setTimeout(() => {
                        grid.querySelectorAll('.asc-intruder-card:not(.asc-intruder-correct)').forEach(c => {
                            c.style.transition = 'opacity 0.35s ease-out, transform 0.35s ease-out';
                            c.style.opacity = '0';
                            c.style.transform = 'scale(0.92)';
                            c.style.pointerEvents = 'none';
                        });
                    }, 100);
                    setTimeout(() => {
                        const wrap = document.querySelector('.asc-intruder-wrap');
                        if (wrap) wrap.classList.add('asc-intruder-validated');
                    }, 250);
                    // Reset le tracker pour le prochain étage
                    this.ascension.intruderFound = null;
                }
            } else {
                // ─── MAUVAISE RÉPONSE — feedback + verrouillage grille 3s (anti-spam) ───
                card.classList.add('asc-intruder-wrong');
                this._playAscIntruderWrongSound();

                // 🆕 Verrouille toute la grille pendant 3s : pointer-events:none + glow rouge pulsant
                if (!grid.classList.contains('asc-intruder-locked')) {
                    grid.classList.add('asc-intruder-locked');
                    setTimeout(() => grid.classList.remove('asc-intruder-locked'), 3000);
                }

                setTimeout(() => {
                    card.classList.remove('asc-intruder-wrong');
                }, 800);
            }
        },
        
        _playAscIntruderClickSound() {
            // 🔊 Click tactile neutre joué dès qu'une card est cliquée (avant le résultat serveur).
            //    Plage médium (1600→900Hz) pour ne pas concurrencer le correct (aigu) ni le wrong (grave).
            //    2 couches : click percussif triangle + body sine chaud → feeling tactile.
            try {
                if (!this._ascAudioCtx) {
                    this._ascAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
                }
                const ctx = this._ascAudioCtx;
                if (ctx.state === 'suspended') ctx.resume();
                const t = ctx.currentTime;

                // Couche 1 — click percussif (attaque sèche)
                const click = ctx.createOscillator();
                const clickGain = ctx.createGain();
                click.type = 'triangle';
                click.frequency.setValueAtTime(1600, t);
                click.frequency.exponentialRampToValueAtTime(900, t + 0.04);
                clickGain.gain.setValueAtTime(0, t);
                clickGain.gain.linearRampToValueAtTime(0.045, t + 0.002);
                clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
                click.connect(clickGain).connect(ctx.destination);
                click.start(t);
                click.stop(t + 0.07);

                // Couche 2 — body warm bref (donne du corps au tap)
                const body = ctx.createOscillator();
                const bodyGain = ctx.createGain();
                body.type = 'sine';
                body.frequency.setValueAtTime(520, t);
                body.frequency.exponentialRampToValueAtTime(380, t + 0.08);
                bodyGain.gain.setValueAtTime(0, t);
                bodyGain.gain.linearRampToValueAtTime(0.04, t + 0.005);
                bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
                body.connect(bodyGain).connect(ctx.destination);
                body.start(t);
                body.stop(t + 0.11);
            } catch (e) { /* ignore */ }
        },

        _playAscIntruderCorrectSound() {
            // Son court tech (un "tick" aigu) — réutilise l'audio context d'Order si disponible
            try {
                if (!this._ascAudioCtx) {
                    this._ascAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
                }
                const ctx = this._ascAudioCtx;
                if (ctx.state === 'suspended') ctx.resume();
                const now = ctx.currentTime;
                
                // Click 1 : note aigüe
                const o1 = ctx.createOscillator();
                const g1 = ctx.createGain();
                o1.type = 'sine';
                o1.frequency.setValueAtTime(1200, now);
                o1.frequency.exponentialRampToValueAtTime(1800, now + 0.08);
                g1.gain.setValueAtTime(0.001, now);
                g1.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
                g1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                o1.connect(g1).connect(ctx.destination);
                o1.start(now);
                o1.stop(now + 0.13);
            } catch (e) { /* ignore */ }
        },
        
        _playAscIntruderVictorySound() {
            // 🔊 Son de validation finale (tous trouvés) : do5 → sol5 → do6 en sine waves douces (sobre)
            try {
                if (!this._ascAudioCtx) {
                    this._ascAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
                }
                const ctx = this._ascAudioCtx;
                if (ctx.state === 'suspended') ctx.resume();
                const t = ctx.currentTime;

                // Note 1 — Tonique (do5 ~523Hz)
                const n1 = ctx.createOscillator();
                const g1 = ctx.createGain();
                n1.type = 'sine';
                n1.frequency.setValueAtTime(523, t);
                g1.gain.setValueAtTime(0, t);
                g1.gain.linearRampToValueAtTime(0.08, t + 0.04);
                g1.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
                n1.connect(g1).connect(ctx.destination);
                n1.start(t); n1.stop(t + 0.55);

                // Note 2 — Quinte (sol5 ~784Hz), 120ms après
                const n2 = ctx.createOscillator();
                const g2 = ctx.createGain();
                n2.type = 'sine';
                n2.frequency.setValueAtTime(784, t + 0.12);
                g2.gain.setValueAtTime(0, t + 0.12);
                g2.gain.linearRampToValueAtTime(0.08, t + 0.16);
                g2.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
                n2.connect(g2).connect(ctx.destination);
                n2.start(t + 0.12); n2.stop(t + 0.65);

                // Shimmer (do6 ~1046Hz), 240ms après — apporte la touche finale
                const sh = ctx.createOscillator();
                const shGain = ctx.createGain();
                sh.type = 'triangle';
                sh.frequency.setValueAtTime(1046, t + 0.24);
                shGain.gain.setValueAtTime(0, t + 0.24);
                shGain.gain.linearRampToValueAtTime(0.04, t + 0.27);
                shGain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
                sh.connect(shGain).connect(ctx.destination);
                sh.start(t + 0.24); sh.stop(t + 0.6);
            } catch (e) { /* ignore */ }
        },

        _playAscIntruderWrongSound() {
            // Son grave bref pour erreur (sans agressivité)
            try {
                if (!this._ascAudioCtx) {
                    this._ascAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
                }
                const ctx = this._ascAudioCtx;
                if (ctx.state === 'suspended') ctx.resume();
                const now = ctx.currentTime;
                
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.type = 'sine';
                o.frequency.setValueAtTime(280, now);
                o.frequency.exponentialRampToValueAtTime(160, now + 0.15);
                g.gain.setValueAtTime(0.001, now);
                g.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
                g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
                o.connect(g).connect(ctx.destination);
                o.start(now);
                o.stop(now + 0.2);
            } catch (e) { /* ignore */ }
        },
        
        _getAscFloorDesc(data) {
            switch (data.type) {
                case 'guess': return 'Devinez le nom de ' + data.totalToGuess + ' personnages';
                case 'target': return 'Trouvez ' + data.totalTargets + ' cibles';
                case 'intruder': return '';  // 🆕 La description est affichée dans le sidebar à droite
                case 'wordle': return 'Devinez le mot de ' + data.wordLength + ' lettres';
                case 'silhouette': return 'Identifiez le personnage';
                case 'order': return 'Classez les arcs de ' + data.anime;
                case 'match': return 'Associez chaque élément de gauche avec celui de droite';
                default: return '';
            }
        },

        _startAscensionPlayerTimer(endTime) {
            this._stopAscensionPlayerTimer();
            
            const fill = document.getElementById('ascPlayerTimerFill');
            const text = document.getElementById('ascPlayerTimerText');
            const wrap = document.getElementById('ascPlayerTimerWrap');
            if (!fill || !text) return;
            if (wrap) wrap.style.opacity = '1';
            
            const circumference = 2 * Math.PI * 18;
            fill.style.strokeDasharray = circumference;
            const timer = this.ascension.timer;
            const self = this;
            
            function tick() {
                const remaining = Math.max(0, endTime - Date.now());
                const pct = remaining / (timer * 1000);
                fill.style.strokeDashoffset = circumference * (1 - pct);
                text.textContent = Math.ceil(remaining / 1000);
                if (remaining <= 0) { text.textContent = '0'; return; }
                self._ascTimerRAF = requestAnimationFrame(tick);
            }
            this._ascTimerRAF = requestAnimationFrame(tick);
        },

        _stopAscensionPlayerTimer() {
            if (this._ascTimerRAF) {
                cancelAnimationFrame(this._ascTimerRAF);
                this._ascTimerRAF = null;
            }
        },

        _updateAscensionPlayerTower() {
            const el = document.getElementById('ascPlayerTowerPlayers');
            if (!el || !this.ascension.playerProgress) return;
            
            const COLORS = ['#50dc78', '#ef7844', '#788cff', '#ff50a0', '#ffd700', '#00d4ff', '#c084fc', '#f97316'];
            const progress = this.ascension.playerProgress;
            let maxFloor = 0;
            progress.forEach(p => { if (p.floor > maxFloor) maxFloor = p.floor; });
            
            el.innerHTML = '';
            progress.forEach((p, i) => {
                const color = COLORS[i % COLORS.length];
                const pct = this.ascension.floors > 0 ? (p.floor / this.ascension.floors * 100) : 0;
                const isLeader = p.floor === maxFloor && maxFloor > 0;
                const isMe = p.twitchId === this.twitchId;
                
                const div = document.createElement('div');
                div.className = 'asc-tower-player' + (isLeader ? ' leader' : '') + (isMe ? ' me' : '');
                div.style.bottom = pct + '%';
                div.style.setProperty('--pcolor', color);
                const offset = (i % 2 === 0) ? -12 : 12;
                div.style.left = 'calc(50% + ' + offset + 'px)';
                div.innerHTML = '<span class="asc-tower-pname">' + (isMe ? 'Vous' : p.username) + '</span><div class="asc-tower-pdot" style="background:' + color + ';box-shadow:0 0 8px ' + color + ';"></div>';
                el.appendChild(div);
            });
        },

        _flashAscensionPlayerSuccess() {
            const flash = document.createElement('div');
            flash.className = 'asc-success-flash';
            document.body.appendChild(flash);
            setTimeout(() => flash.remove(), 600);
        },

        _showAscensionPlayerPodium(podium, winner) {
            const content = document.getElementById('ascPlayerContent');
            if (!content) return;
            
            const rows = podium.slice(0, 5).map((p, i) => {
                const isMe = p.twitchId === this.twitchId;
                return '<div class="asc-podium-row ' + (i === 0 ? 'winner' : '') + (isMe ? ' me' : '') + '">' +
                    '<span class="asc-podium-rank">' + (i === 0 ? '♛' : (i + 1)) + '</span>' +
                    '<span class="asc-podium-name">' + (isMe ? 'Vous' : p.username) + '</span>' +
                    '<span class="asc-podium-floor">Étage ' + p.floor + '</span></div>';
            }).join('');
            
            content.innerHTML = '<div class="asc-podium"><div class="asc-podium-title">' + 
                (winner ? winner.username + ' remporte la partie !' : 'Partie terminée') + 
                '</div><div class="asc-podium-list">' + rows + '</div></div>';
        },

        // ═══ QUEST COMPLETE CENTER TEXT ═══
        _showQuestCompleteText(completed, total) {
            const existing = document.getElementById('survieQuestComplete');
            if (existing) existing.remove();
            
            const el = document.createElement('div');
            el.id = 'survieQuestComplete';
            el.className = 'survie-quest-complete-text';
            el.innerHTML = `QUÊTE COMPLÈTE <span class="qc-count">${completed}/${total}</span>`;
            document.body.appendChild(el);
            
            setTimeout(() => {
                el.classList.add('exit');
                setTimeout(() => el.remove(), 600);
            }, 2000);
        },

        // ═══ MOBILE QUEST ICON PULSE ═══
        _pulseQuestIcon(type) {
            const ql = document.getElementById('survieQuestList');
            if (!ql) return;
            const cls = type === 'complete' ? 'quest-icon-complete' : 'quest-icon-step';
            ql.classList.remove('quest-icon-step', 'quest-icon-complete');
            void ql.offsetWidth; // Force reflow
            ql.classList.add(cls);
            setTimeout(() => ql.classList.remove(cls), type === 'complete' ? 1200 : 600);
        },

        // ═══ MOBILE QUEST MODAL ═══
        _openMobileQuestModal() {
            // Remove existing
            const existing = document.getElementById('survieQuestModalMobile');
            if (existing) existing.remove();
            const existingBd = document.getElementById('survieQuestBackdrop');
            if (existingBd) existingBd.remove();
            
            // Build quest list from current state
            const quests = this._questState?.quests || [];
            let questsHTML = '';
            quests.forEach(q => {
                const done = q.completed;
                let step = '';
                let barHTML = '';
                if (!done) {
                    if (q.type === 'REUNION') {
                        const found = (q.found || []).length;
                        const pct = Math.round((found / q.count) * 100);
                        step = `${found}/${q.count} trouvés`;
                        barHTML = `<div class="modal-quest-bar"><div class="modal-quest-bar-fill" style="width:${pct}%"></div></div>`;
                    } else if (q.type === 'COLLECT_ITEMS') {
                        const collected = q.collected || 0;
                        if (q.stepDesc && collected >= q.count) {
                            step = q.stepDesc;
                        } else {
                            const pct = Math.round((collected / q.count) * 100);
                            step = `${collected}/${q.count} collectés`;
                            barHTML = `<div class="modal-quest-bar"><div class="modal-quest-bar-fill" style="width:${pct}%"></div></div>`;
                        }
                    } else if (q.type === 'MYSTERY') {
                        step = q.stepDesc || 'Interroger les suspects';
                    } else if (q.type === 'RIDDLE') {
                        step = q.stepDesc || 'Résolvez l\'énigme...';
                    } else if (q.stepDesc) {
                        step = q.stepDesc;
                    }
                }
                questsHTML += `
                    <div class="modal-quest-item">
                        <div class="modal-quest-dot ${done ? 'completed' : ''}"></div>
                        <div class="modal-quest-info">
                            <div class="modal-quest-desc ${done ? 'completed' : ''}">${q.desc || ''}</div>
                            ${!done && step ? `<div class="modal-quest-step">► ${step}</div>` : ''}
                            ${!done ? barHTML : ''}
                        </div>
                    </div>
                `;
            });
            
            const completed = quests.filter(q => q.completed).length;
            
            const modal = document.createElement('div');
            modal.id = 'survieQuestModalMobile';
            modal.className = 'survie-quest-modal-mobile active';
            modal.innerHTML = `
                <div class="modal-quest-title">OBJECTIFS ${completed}/${quests.length}</div>
                ${questsHTML}
            `;
            
            const backdrop = document.createElement('div');
            backdrop.id = 'survieQuestBackdrop';
            backdrop.className = 'survie-quest-backdrop active';
            
            document.body.appendChild(backdrop);
            document.body.appendChild(modal);
            
            backdrop.onclick = () => {
                modal.remove();
                backdrop.remove();
            };
        },

        // ═══ INTRO SYSTEM ═══
        _showSurvieIntro() {
            const SLIDE_MS = 3000;
            const TOTAL = 4;
            let current = 0;

            const existing = document.getElementById('survieTutoOverlay');
            if (existing) existing.remove();

            const overlay = document.createElement('div');
            overlay.id = 'survieTutoOverlay';
            overlay.className = 'survie-tuto-overlay';
            overlay.innerHTML = `
                <div class="survie-tuto-step" id="survTutoStep1">
                    <div class="survie-tuto-visual">
                        <div class="survie-tuto-keys">
                            <div class="survie-tuto-key stk-up">Z</div>
                            <div class="survie-tuto-key stk-left">Q</div>
                            <div class="survie-tuto-key stk-down">S</div>
                            <div class="survie-tuto-key stk-right">D</div>
                        </div>
                    </div>
                    <div class="survie-tuto-title">Explorez la map</div>
                    <div class="survie-tuto-desc">Utilisez <span class="sthl">ZQSD</span>, les <span class="sthl">flèches</span> ou <span class="sthl">cliquez</span> pour vous déplacer. Sur mobile, <span class="sthl">touchez</span> l'écran.</div>
                    <div class="survie-tuto-timer"><div class="survie-tuto-timer-fill" id="survTutoTimer1"></div></div>
                </div>
                <div class="survie-tuto-step" id="survTutoStep2">
                    <div class="survie-tuto-visual">
                        <div class="survie-tuto-ekey">E</div>
                    </div>
                    <div class="survie-tuto-title">Interagissez</div>
                    <div class="survie-tuto-desc">Appuyez <span class="sthl">E</span> pour parler aux <span class="sthl">personnages</span>, interagir avec des <span class="sthl">structures</span> et <span class="sthl">ramasser des objets</span>. Sur mobile, <span class="sthl">touchez</span> directement.</div>
                    <div class="survie-tuto-timer"><div class="survie-tuto-timer-fill" id="survTutoTimer2"></div></div>
                </div>
                <div class="survie-tuto-step" id="survTutoStep3">
                    <div class="survie-tuto-visual">
                        <div class="survie-tuto-boosts">
                            <div class="survie-tuto-boost-item">
                                <div class="survie-tuto-orb st-speed"><svg viewBox="0 0 24 24" fill="none" stroke="rgba(100,200,255,0.8)" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
                                <div class="survie-tuto-boost-lbl st-speed">Vitesse</div>
                            </div>
                            <div class="survie-tuto-boosts-sep"></div>
                            <div class="survie-tuto-boost-item">
                                <div class="survie-tuto-orb st-malus"><svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,80,80,0.8)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg></div>
                                <div class="survie-tuto-boost-lbl st-malus">Malus</div>
                            </div>
                        </div>
                    </div>
                    <div class="survie-tuto-title">Boosts & Malus</div>
                    <div class="survie-tuto-desc">Ramassez des <span class="sthl">boosts</span> pour accélérer et des <span class="sthl">malus</span> pour ralentir vos adversaires. Ils apparaissent sur toute la carte.</div>
                    <div class="survie-tuto-timer"><div class="survie-tuto-timer-fill" id="survTutoTimer3"></div></div>
                </div>
                <div class="survie-tuto-step" id="survTutoStep4">
                    <div class="survie-tuto-visual">
                        <div class="survie-tuto-quests">
                            <div class="survie-tuto-qcard stq-1"><div class="survie-tuto-qdot"></div><span>Livrer le parchemin</span></div>
                            <div class="survie-tuto-qcard stq-2"><div class="survie-tuto-qdot"></div><span>Réunir l'équipe</span></div>
                            <div class="survie-tuto-qcard stq-3"><div class="survie-tuto-qdot"></div><span>Trouver le trésor</span></div>
                            <div class="survie-tuto-qcard stq-4"><div class="survie-tuto-qdot"></div><span>Résoudre l'énigme</span></div>
                        </div>
                    </div>
                    <div class="survie-tuto-title">Complétez vos quêtes</div>
                    <div class="survie-tuto-desc">Vos objectifs s'affichent <span class="sthl">en haut à gauche</span>. Le premier joueur à terminer toutes ses quêtes <span class="sthl">remporte la partie</span>.</div>
                    <div class="survie-tuto-timer"><div class="survie-tuto-timer-fill" id="survTutoTimer4"></div></div>
                </div>
                <div class="survie-tuto-pips">
                    <div class="survie-tuto-pip st-active"></div>
                    <div class="survie-tuto-pip"></div>
                    <div class="survie-tuto-pip"></div>
                    <div class="survie-tuto-pip"></div>
                </div>
            `;
            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('active'));

            const self = this;
            function advance() {
                if (current >= TOTAL - 1) {
                    self._playSurvieStartSound();
                    overlay.classList.add('exiting');
                    setTimeout(() => {
                        overlay.remove();
                        if (self._survieCanvas) self._survieCanvas.frozen = false;
                        // Show "TRACE ON" then "ACCOMPLISSEZ VOS OBJECTIFS"
                        self._showTraceOnText();
                    }, 600);
                    return;
                }
                const curEl = document.getElementById('survTutoStep' + (current + 1));
                if (curEl) curEl.classList.add('exiting');
                setTimeout(() => {
                    if (curEl) curEl.classList.remove('active', 'exiting');
                    current++;
                    const nextEl = document.getElementById('survTutoStep' + (current + 1));
                    if (nextEl) nextEl.classList.add('active');
                    const timer = document.getElementById('survTutoTimer' + (current + 1));
                    if (timer) { timer.style.animation = 'none'; void timer.offsetHeight; timer.style.animation = 'survTutoShrink ' + SLIDE_MS + 'ms linear forwards'; }
                    document.querySelectorAll('.survie-tuto-pip').forEach((p, i) => {
                        p.classList.remove('st-active', 'st-done');
                        if (i === current) p.classList.add('st-active');
                        else if (i < current) p.classList.add('st-done');
                    });
                    setTimeout(advance, SLIDE_MS);
                }, 250);
            }

            // 1s delay before first slide appears
            setTimeout(() => {
                const firstStep = document.getElementById('survTutoStep1');
                if (firstStep) firstStep.classList.add('active');
                const firstTimer = document.getElementById('survTutoTimer1');
                if (firstTimer) { firstTimer.style.animation = 'none'; void firstTimer.offsetHeight; firstTimer.style.animation = 'survTutoShrink ' + SLIDE_MS + 'ms linear forwards'; }
                setTimeout(advance, SLIDE_MS);
            }, 1000);
        },

        // ═══ VICTORY SYSTEM ═══
        _showFinishNotification(username, rank) {
            const rankLabels = { 1: '★ 1ER', 2: '☆ 2ÈME', 3: '☆ 3ÈME' };
            const rankLabel = rankLabels[rank] || `${rank}ÈME`;
            const isMe = username === this.username;
            
            const notif = document.createElement('div');
            notif.className = 'survie-finish-notif';
            notif.innerHTML = `
                <div class="notif-rank">${rankLabel} À FINIR</div>
                <div class="notif-name">${isMe ? 'VOUS !' : username}</div>
            `;
            document.body.appendChild(notif);
            setTimeout(() => notif.remove(), 4000);
        },
        
        _showWinnerBanner(data) {
            const isMe = data.twitchId === this.twitchId;
            
            // Remove existing banner
            const existing = document.getElementById('survieWinnerBanner');
            if (existing) existing.remove();
            
            // Store winner end time for restore after refresh
            this._winnerEndTime = Date.now() + 60000;
            sessionStorage.setItem('survieWinnerEndTime', this._winnerEndTime);
            sessionStorage.setItem('survieWinnerName', data.username);
            
            const banner = document.createElement('div');
            banner.id = 'survieWinnerBanner';
            banner.className = 'survie-winner-text';
            banner.innerHTML = `<span class="winner-text-name">Un joueur</span> a terminé ses quêtes · Fin dans <span class="winner-text-timer" id="survieWinnerTimer">60</span> secondes`;
            document.body.appendChild(banner);
            
            // Start countdown
            if (this._winnerCountdownInterval) clearInterval(this._winnerCountdownInterval);
            this._winnerCountdownInterval = setInterval(() => {
                const remaining = Math.max(0, Math.ceil((this._winnerEndTime - Date.now()) / 1000));
                const timerEl = document.getElementById('survieWinnerTimer');
                if (timerEl) timerEl.textContent = remaining;
                if (remaining <= 0) {
                    clearInterval(this._winnerCountdownInterval);
                    this._winnerCountdownInterval = null;
                }
            }, 1000);
        },
        
        _restoreWinnerBanner() {
            const endTime = sessionStorage.getItem('survieWinnerEndTime');
            const winnerName = sessionStorage.getItem('survieWinnerName');
            if (!endTime || !winnerName) return;
            
            const remaining = Math.ceil((parseInt(endTime) - Date.now()) / 1000);
            if (remaining <= 0) {
                sessionStorage.removeItem('survieWinnerEndTime');
                sessionStorage.removeItem('survieWinnerName');
                return;
            }
            
            this._winnerEndTime = parseInt(endTime);
            
            const existing = document.getElementById('survieWinnerBanner');
            if (existing) existing.remove();
            
            const banner = document.createElement('div');
            banner.id = 'survieWinnerBanner';
            banner.className = 'survie-winner-text';
            banner.innerHTML = `<span class="winner-text-name">Un joueur</span> a terminé ses quêtes · Fin dans <span class="winner-text-timer" id="survieWinnerTimer">${remaining}</span> secondes`;
            document.body.appendChild(banner);
            
            if (this._winnerCountdownInterval) clearInterval(this._winnerCountdownInterval);
            this._winnerCountdownInterval = setInterval(() => {
                const rem = Math.max(0, Math.ceil((this._winnerEndTime - Date.now()) / 1000));
                const timerEl = document.getElementById('survieWinnerTimer');
                if (timerEl) timerEl.textContent = rem;
                if (rem <= 0) {
                    clearInterval(this._winnerCountdownInterval);
                    this._winnerCountdownInterval = null;
                }
            }, 1000);
        },
        
        _showVictoryOverlay(data) {
            // SVG icons
            const crownSVG = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M8 48h48v6H8z" fill="rgba(255,200,80,0.9)"/><path d="M8 48L4 20l14 12 14-18 14 18 14-12-4 28z" fill="rgba(255,200,80,0.85)" stroke="rgba(255,170,30,0.6)" stroke-width="1.5"/><circle cx="4" cy="20" r="3" fill="rgba(255,220,100,0.9)"/><circle cx="18" cy="32" r="3" fill="rgba(255,220,100,0.9)"/><circle cx="32" cy="14" r="3.5" fill="rgba(255,240,150,1)"/><circle cx="46" cy="32" r="3" fill="rgba(255,220,100,0.9)"/><circle cx="60" cy="20" r="3" fill="rgba(255,220,100,0.9)"/></svg>`;
            const medalSVGs = [
                `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="22" r="14" fill="rgba(255,200,80,0.2)" stroke="rgba(255,200,80,0.8)" stroke-width="2"/><circle cx="20" cy="22" r="10" fill="rgba(255,200,80,0.1)" stroke="rgba(255,200,80,0.4)" stroke-width="1"/><text x="20" y="27" text-anchor="middle" font-family="Orbitron,sans-serif" font-size="14" font-weight="700" fill="rgba(255,200,80,0.9)">1</text><path d="M15 4l5 8 5-8" fill="rgba(255,200,80,0.6)"/></svg>`,
                `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="22" r="14" fill="rgba(192,192,192,0.15)" stroke="rgba(192,192,192,0.7)" stroke-width="2"/><circle cx="20" cy="22" r="10" fill="rgba(192,192,192,0.08)" stroke="rgba(192,192,192,0.3)" stroke-width="1"/><text x="20" y="27" text-anchor="middle" font-family="Orbitron,sans-serif" font-size="14" font-weight="700" fill="rgba(192,192,192,0.8)">2</text><path d="M15 4l5 8 5-8" fill="rgba(192,192,192,0.5)"/></svg>`,
                `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="22" r="14" fill="rgba(205,127,50,0.15)" stroke="rgba(205,127,50,0.7)" stroke-width="2"/><circle cx="20" cy="22" r="10" fill="rgba(205,127,50,0.08)" stroke="rgba(205,127,50,0.3)" stroke-width="1"/><text x="20" y="27" text-anchor="middle" font-family="Orbitron,sans-serif" font-size="14" font-weight="700" fill="rgba(205,127,50,0.8)">3</text><path d="M15 4l5 8 5-8" fill="rgba(205,127,50,0.5)"/></svg>`,
            ];
            
            // Remove existing overlay and banner
            const existing = document.getElementById('survieVictoryOverlay');
            if (existing) existing.remove();
            const banner = document.getElementById('survieWinnerBanner');
            if (banner) banner.remove();
            if (this._winnerCountdownInterval) {
                clearInterval(this._winnerCountdownInterval);
                this._winnerCountdownInterval = null;
            }
            
            // Build podium HTML — skip 1st place (already shown above)
            const classes = ['first', 'second', 'third'];
            const rankLabels = ['CHAMPION', '2ÈME PLACE', '3ÈME PLACE'];
            
            let podiumHTML = '';
            const podiumPlayers = (data.podium || []).slice(1); // Skip winner
            if (podiumPlayers.length > 0) {
                podiumPlayers.forEach((p, i) => {
                    const actualIdx = i + 1; // 2nd, 3rd
                    const questInfo = `${p.completedCount}/${p.totalQuests || 5} quêtes`;
                    podiumHTML += `
                        <div class="survie-podium-place ${classes[actualIdx] || ''}">
                            <div class="survie-podium-medal">${medalSVGs[actualIdx] || ''}</div>
                            <div class="survie-podium-name">${p.username}</div>
                            <div class="survie-podium-quests">${questInfo}</div>
                            <div class="survie-podium-rank">${rankLabels[actualIdx] || `${actualIdx + 1}ÈME`}</div>
                        </div>
                    `;
                });
            }
            
            const self = this;
            const overlay = document.createElement('div');
            overlay.id = 'survieVictoryOverlay';
            overlay.className = 'survie-victory-overlay';
            overlay.innerHTML = `
                <div class="survie-victory-crown">${crownSVG}</div>
                <div class="survie-victory-title">VICTOIRE</div>
                <div class="survie-victory-winner">${data.winner.username}</div>
                <div class="survie-victory-podium">${podiumHTML}</div>
                <div class="survie-victory-btn-wrap"><span class="survie-victory-btn" id="survieVictoryRetour">RETOUR</span></div>
            `;
            document.body.appendChild(overlay);
            
            // Activate with delay for transition
            requestAnimationFrame(() => overlay.classList.add('active'));
            
            // Retour button handler
            document.getElementById('survieVictoryRetour').addEventListener('click', () => {
                overlay.remove();
                // Full cleanup
                sessionStorage.removeItem('survieWinnerEndTime');
                sessionStorage.removeItem('survieWinnerName');
                sessionStorage.removeItem('survieIntroShown');
                ['survieWinnerBanner', 'survieIntro', 'survieQuestComplete', 'survieQuestModalMobile', 'survieQuestBackdrop', 'survieMinimap', 'survieQuestList'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.remove();
                });
                if (self._winnerCountdownInterval) {
                    clearInterval(self._winnerCountdownInterval);
                    self._winnerCountdownInterval = null;
                }
                document.body.classList.remove('survie-intro-active');
                self._questState = null;
                self.isGameActive = false;
                self.gameInProgress = false;
                self.gameEnded = true;
                self.survie.active = false;
                self.destroySurvieCanvas();
            });
            
            // Spawn particles
            this._spawnVictoryParticles(overlay);
        },
        
        _spawnVictoryParticles(container) {
            const colors = [
                'rgba(255, 200, 80, 0.8)', 'rgba(255, 150, 50, 0.7)',
                'rgba(255, 255, 200, 0.6)', 'rgba(200, 160, 80, 0.7)',
                'rgba(255, 220, 100, 0.8)', 'rgba(180, 140, 60, 0.6)',
            ];
            for (let i = 0; i < 40; i++) {
                setTimeout(() => {
                    const particle = document.createElement('div');
                    particle.className = 'survie-victory-particle';
                    particle.style.left = Math.random() * 100 + '%';
                    particle.style.top = '-10px';
                    particle.style.background = colors[Math.floor(Math.random() * colors.length)];
                    particle.style.width = (3 + Math.random() * 5) + 'px';
                    particle.style.height = particle.style.width;
                    particle.style.animationDuration = (3 + Math.random() * 4) + 's';
                    container.appendChild(particle);
                    setTimeout(() => particle.remove(), 7000);
                }, i * 100);
            }
        },

        openSurvieDialogue(npc) {
            this._playSound('npc');
            const overlay = document.getElementById('survieDialogueOverlay');
            const name = document.getElementById('survieDialogueName');
            const text = document.getElementById('survieDialogueText');
            
            if (!overlay) return;
            
            // Set name
            name.textContent = npc.name;
            name.classList.toggle('structure', !!npc.isStructure);
            
            // Send interact to server (server will respond with quest dialogue if applicable)
            this.sendSurvieInteract(npc);
            
            // Pick default dialogue (server may override with quest dialogue via survie-interact-result)
            const dialogues = npc.defaultDialogues || ["..."];
            const dialogue = dialogues[Math.floor(Math.random() * dialogues.length)];
            
            // Typewriter effect
            text.innerHTML = '';
            let charIndex = 0;
            if (this._typewriterInterval) clearInterval(this._typewriterInterval);
            
            this._typewriterInterval = setInterval(() => {
                if (charIndex < dialogue.length) {
                    text.innerHTML = dialogue.substring(0, charIndex + 1) + '<span class="typing-cursor"></span>';
                    charIndex++;
                } else {
                    text.innerHTML = dialogue;
                    clearInterval(this._typewriterInterval);
                    this._typewriterInterval = null;
                }
            }, 15);
            
            // Show
            overlay.classList.add('active');
        },
        
        closeSurvieDialogue() {
            const overlay = document.getElementById('survieDialogueOverlay');
            if (overlay) overlay.classList.remove('active');
            if (this._typewriterInterval) {
                clearInterval(this._typewriterInterval);
                this._typewriterInterval = null;
            }
            // Exit give mode if active
            if (this._giveMode) {
                this._exitGiveMode();
            }
        },
        
        // Generate initial step description client-side (fallback)
        _getInitialStepDesc(q) {
            if (!q) return '';
            // For step-based quests, we don't have NPC names client-side in templates
            // So return a generic first-step hint based on type
            if (q.type === 'DELIVER' || q.type === 'VISIT_DELIVER' || q.type === 'CHAIN' || q.type === 'TRADE_CHAIN') {
                return null; // Will use stepDesc from server once interaction happens
            }
            if (q.type === 'RIDDLE') return 'Résolvez l\'énigme...';
            if (q.type === 'ESCORT') return 'Trouver le personnage';
            if (q.type === 'MYSTERY') return 'Enquêter sur le vol';
            return '';
        },
        
        updateQuestListUI(questState) {
            const container = document.getElementById('survieQuestItems');
            const counter = document.getElementById('survieQuestCounter');
            if (!container || !questState) return;
            
            // Detect changes from previous state for animations
            const prevState = this._questState;
            const changedQuests = new Set();
            const completedQuests = new Set();
            if (prevState && prevState.quests) {
                const quests = questState.quests || [];
                quests.forEach((q, idx) => {
                    const prev = prevState.quests[idx];
                    if (!prev) return;
                    // Detect step change
                    if (q.currentStep !== prev.currentStep) changedQuests.add(idx);
                    // Detect found/collected change
                    if (q.type === 'REUNION' && (q.found || []).length !== (prev.found || []).length) changedQuests.add(idx);
                    if (q.type === 'COLLECT_ITEMS' && (q.collected || 0) !== (prev.collected || 0)) changedQuests.add(idx);
                    if (q.type === 'MYSTERY' && (q.interrogated || []).length !== (prev.interrogated || []).length) changedQuests.add(idx);
                    if (q.type === 'RIDDLE' && q.hintReceived !== prev.hintReceived) changedQuests.add(idx);
                    // Detect completion
                    if (q.completed && !prev.completed) completedQuests.add(idx);
                });
            }
            
            // Store quest state for modal
            this._questState = questState;
            
            const quests = questState.quests || [];
            const completedCount = quests.filter(q => q.completed).length;
            const total = quests.length;
            
            // Update counter
            counter.innerHTML = `${completedCount}<span>/${total}</span>`;
            
            // Update mobile badge
            const ql = document.getElementById('survieQuestList');
            if (ql) ql.setAttribute('data-remaining', total - completedCount);
            
            // Type labels
            const typeLabels = {
                'DELIVER': 'Livraison', 'VISIT_DELIVER': 'Exploration', 'CHAIN': 'Chaîne',
                'TRADE_CHAIN': 'Troc', 'REUNION': 'Réunion', 'COLLECT_ITEMS': 'Collecte',
                'RIDDLE': 'Énigme', 'ESCORT': 'Escorte', 'MYSTERY': 'Enquête'
            };
            
            // Build items HTML
            let html = '';
            quests.forEach((q, idx) => {
                const status = q.completed ? 'done' : 'active';
                
                // Build step text
                let stepText = '';
                let progressPercent = 0;
                let showBar = false;
                
                if (!q.completed) {
                    if (q.type === 'REUNION') {
                        const found = (q.found || []).length;
                        stepText = `► ${found}/${q.count} trouvés`;
                        progressPercent = (found / q.count) * 100;
                        showBar = true;
                    } else if (q.type === 'COLLECT_ITEMS') {
                        const collected = q.collected || 0;
                        if (q.stepDesc && collected >= q.count) {
                            // All collected → show delivery target
                            stepText = `► ${q.stepDesc}`;
                            progressPercent = 100;
                            showBar = false;
                        } else {
                            stepText = `► ${collected}/${q.count} collectés`;
                            progressPercent = (collected / q.count) * 100;
                            showBar = true;
                        }
                    } else if (q.type === 'MYSTERY') {
                        const interr = (q.interrogated || []).filter(i => i !== '_victim').length;
                        stepText = q.stepDesc ? `► ${q.stepDesc}` : `► ${interr}/3 suspects interrogés`;
                        progressPercent = (interr / 3) * 100;
                        showBar = true;
                    } else if (q.type === 'RIDDLE') {
                        stepText = q.stepDesc ? `► ${q.stepDesc}` : '► Résolvez l\'énigme...';
                    } else if (q.stepDesc) {
                        // DELIVER, CHAIN, VISIT_DELIVER, TRADE_CHAIN, ESCORT
                        stepText = `► ${q.stepDesc}`;
                        const current = q.currentStep || 0;
                        progressPercent = (current / (q.totalSteps || 1)) * 100;
                        showBar = (q.totalSteps || 0) > 1;
                    } else if (q.totalSteps) {
                        // No stepDesc yet — don't show "Étape x/y", wait for server update
                        stepText = '';
                    }
                }
                
                html += `<div class="survie-quest-item ${status}" data-quest-idx="${idx}">`;
                html += `<div class="survie-quest-desc">${q.desc}</div>`;
                if (stepText && !q.completed) {
                    html += `<div class="survie-quest-step">${stepText}</div>`;
                }
                if (showBar && !q.completed) {
                    html += `<div class="survie-quest-bar"><div class="survie-quest-bar-fill" style="width:${progressPercent}%"></div></div>`;
                }
                html += `<div class="survie-quest-info-icon">i</div>`;
                html += '</div>';
            });
            
            container.innerHTML = html;
            
            // Trigger animations for changed quests
            container.querySelectorAll('.survie-quest-item').forEach(el => {
                const idx = parseInt(el.dataset.questIdx);
                
                // Step progress glow
                if (changedQuests.has(idx) && !completedQuests.has(idx)) {
                    el.classList.add('step-progress');
                    const stepEl = el.querySelector('.survie-quest-step');
                    if (stepEl) stepEl.classList.add('step-text-flash');
                    const barFill = el.querySelector('.survie-quest-bar-fill');
                    if (barFill) barFill.classList.add('bar-pulse');
                    setTimeout(() => {
                        el.classList.remove('step-progress');
                        if (stepEl) stepEl.classList.remove('step-text-flash');
                        if (barFill) barFill.classList.remove('bar-pulse');
                    }, 800);
                    // Pulse mobile quest icon
                    this._pulseQuestIcon('step');
                    this._playSound('step');
                }
                
                // Quest completed flash
                if (completedQuests.has(idx)) {
                    el.classList.add('just-completed');
                    setTimeout(() => el.classList.remove('just-completed'), 800);
                    // Strong pulse mobile quest icon
                    this._pulseQuestIcon('complete');
                    // Show center text
                    this._showQuestCompleteText(completedCount, total);
                    this._playSound('quest');
                }
                
                // Click listener for modal
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openQuestDetailModal(parseInt(el.dataset.questIdx));
                });
            });
        },
        
        openQuestDetailModal(questIdx) {
            if (!this._questState) return;
            const q = this._questState.quests[questIdx];
            if (!q) return;
            
            const typeLabels = {
                'DELIVER': 'Livraison', 'VISIT_DELIVER': 'Exploration', 'CHAIN': 'Chaîne',
                'TRADE_CHAIN': 'Troc', 'REUNION': 'Réunion', 'COLLECT_ITEMS': 'Collecte',
                'RIDDLE': 'Énigme', 'ESCORT': 'Escorte', 'MYSTERY': 'Enquête'
            };
            
            // Build step detail
            let stepDetail = '';
            let progressPercent = 0;
            let progressText = '';
            
            if (q.completed) {
                stepDetail = 'Quête terminée !';
                progressPercent = 100;
                progressText = '100%';
            } else if (q.type === 'REUNION') {
                const found = (q.found || []).length;
                stepDetail = q.stepDesc ? `► ${q.stepDesc}` : `Trouvez et parlez à ${q.count} membres du groupe.`;
                progressPercent = (found / q.count) * 100;
                progressText = `${found}/${q.count}`;
            } else if (q.type === 'COLLECT_ITEMS') {
                const collected = q.collected || 0;
                if (q.stepDesc && collected >= q.count) {
                    stepDetail = `► ${q.stepDesc}`;
                } else {
                    stepDetail = `Récupérez ${q.count} objets dispersés sur la map.`;
                }
                progressPercent = (collected / q.count) * 100;
                progressText = `${collected}/${q.count}`;
            } else if (q.type === 'MYSTERY') {
                const interr = (q.interrogated || []).filter(i => i !== '_victim').length;
                stepDetail = q.stepDesc ? `► ${q.stepDesc}` : `Interrogez les suspects pour découvrir le coupable.`;
                progressPercent = (interr / 3) * 100;
                progressText = `${interr}/3`;
            } else if (q.type === 'RIDDLE') {
                stepDetail = q.stepDesc ? `► ${q.stepDesc}` : 'Trouvez le personnage ou le lieu décrit par l\'énigme.';
                progressPercent = q.hintReceived ? 50 : 0;
                progressText = q.hintReceived ? '1/2' : '0/2';
            } else if (q.totalSteps) {
                const current = q.currentStep || 0;
                stepDetail = q.stepDesc ? `► ${q.stepDesc}` : `Étape ${current + 1}/${q.totalSteps}`;
                progressPercent = (current / q.totalSteps) * 100;
                progressText = `${current}/${q.totalSteps}`;
            }
            
            // Create or update modal
            let overlay = document.getElementById('survieQuestModal');
            if (!overlay) {
                document.body.insertAdjacentHTML('beforeend', `
                    <div class="survie-quest-modal-overlay" id="survieQuestModal">
                        <div class="survie-quest-modal">
                            <button class="survie-quest-modal-close" id="survieQuestModalClose">✕</button>
                            <div class="survie-quest-modal-type" id="sqmType"></div>
                            <div class="survie-quest-modal-title" id="sqmTitle"></div>
                            <div class="survie-quest-modal-step" id="sqmStep"></div>
                            <div class="survie-quest-modal-progress">
                                <div class="survie-quest-modal-progress-bar"><div class="survie-quest-modal-progress-fill" id="sqmBar"></div></div>
                                <div class="survie-quest-modal-progress-text" id="sqmPercent"></div>
                            </div>
                        </div>
                    </div>
                `);
                overlay = document.getElementById('survieQuestModal');
                
                // Close on overlay click or button
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) overlay.classList.remove('active');
                });
                document.getElementById('survieQuestModalClose').addEventListener('click', () => {
                    overlay.classList.remove('active');
                });
            }
            
            // Fill content
            document.getElementById('sqmType').textContent = typeLabels[q.type] || q.type;
            document.getElementById('sqmTitle').textContent = q.desc;
            document.getElementById('sqmStep').textContent = stepDetail;
            document.getElementById('sqmBar').style.width = progressPercent + '%';
            document.getElementById('sqmPercent').textContent = progressText;
            
            // Show
            overlay.classList.add('active');
        },
        
        _renderMinimap() {
            const canvas = document.getElementById('survieMinimapCanvas');
            if (!canvas || !this._survieCanvas) return;
            
            const ctx = canvas.getContext('2d');
            const w = canvas.width;
            const h = canvas.height;
            const MAP_W = 38000;
            const MAP_H = 24000;
            
            ctx.clearRect(0, 0, w, h);
            
            // Draw structures only (cyan squares)
            this._survieCanvas.npcs.forEach(npc => {
                if (!npc.isStructure) return;
                const sx = (npc.x / MAP_W) * w;
                const sy = (npc.y / MAP_H) * h;
                ctx.fillStyle = 'rgba(126, 200, 227, 0.6)';
                ctx.fillRect(sx - 2, sy - 2, 4, 4);
            });
            
            // Draw other players (white dots)
            this._survieCanvas.auras.forEach((aura, id) => {
                if (id === this._survieCanvas.localTwitchId) return;
                const px = (aura.x / MAP_W) * w;
                const py = (aura.y / MAP_H) * h;
                ctx.beginPath();
                ctx.arc(px, py, 2, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
                ctx.fill();
            });
            
            // Draw local player (gold, with glow)
            const local = this._survieCanvas.auras.get(this._survieCanvas.localTwitchId);
            if (local) {
                const lx = (local.x / MAP_W) * w;
                const ly = (local.y / MAP_H) * h;
                
                // Glow
                ctx.beginPath();
                ctx.arc(lx, ly, 5, 0, Math.PI * 2);
                const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, 5);
                glow.addColorStop(0, 'rgba(255, 200, 80, 0.25)');
                glow.addColorStop(1, 'rgba(255, 200, 80, 0)');
                ctx.fillStyle = glow;
                ctx.fill();
                
                // Dot
                ctx.beginPath();
                ctx.arc(lx, ly, 2.5, 0, Math.PI * 2);
                ctx.fillStyle = '#ffcc00';
                ctx.fill();
            }
            
            // Draw pins
            if (this._minimapPins) {
                const pinColors = { red: 'rgba(255, 80, 80,', green: 'rgba(80, 220, 120,' };
                ['red', 'green'].forEach(color => {
                    const pin = this._minimapPins[color];
                    if (!pin) return;
                    const px = pin.x * w;
                    const py = pin.y * h;
                    const c = pinColors[color];
                    
                    // Glow
                    ctx.beginPath();
                    ctx.arc(px, py, 6, 0, Math.PI * 2);
                    const pGlow = ctx.createRadialGradient(px, py, 0, px, py, 6);
                    pGlow.addColorStop(0, c + '0.3)');
                    pGlow.addColorStop(1, c + '0)');
                    ctx.fillStyle = pGlow;
                    ctx.fill();
                    
                    // Diamond
                    ctx.beginPath();
                    ctx.moveTo(px, py - 5);
                    ctx.lineTo(px + 3, py);
                    ctx.lineTo(px, py + 2);
                    ctx.lineTo(px - 3, py);
                    ctx.closePath();
                    ctx.fillStyle = c + '0.85)';
                    ctx.fill();
                    
                    // Dot
                    ctx.beginPath();
                    ctx.arc(px, py, 2, 0, Math.PI * 2);
                    ctx.fillStyle = c + '1)';
                    ctx.fill();
                });
            }
        },
        
        destroySurvieCanvas() {
            if (this._survieCanvas) {
                this._survieCanvas.stop();
                this._survieCanvas = null;
            }
            // Cleanup minimap
            if (this._minimapInterval) {
                clearInterval(this._minimapInterval);
                this._minimapInterval = null;
            }
            const minimap = document.getElementById('survieMinimap');
            if (minimap) minimap.remove();
            // Cleanup dialogue
            this.closeSurvieDialogue();
            const overlay = document.getElementById('survieDialogueOverlay');
            if (overlay) overlay.remove();
            // Cleanup inventory
            const inventory = document.getElementById('survieInventory');
            if (inventory) inventory.remove();
            // Cleanup quest list
            const questList = document.getElementById('survieQuestList');
            if (questList) questList.remove();
            // Cleanup quest modal
            const questModal = document.getElementById('survieQuestModal');
            if (questModal) questModal.remove();
        },
        
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
            if (this.lobbyMode === 'collect' || this.lobbyMode === 'bombanime') {
                this.collectJoinPending = true;
                // Confirmer après 400ms si pas d'erreur reçue
                setTimeout(() => {
                    if (this.collectJoinPending && !this.collectShakeError) {
                        this.hasJoined = true;
                        this.collectJoinPending = false;
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
        playRewardAnimation() {
            const r = this.rewardAnimData;
            if (!r) return;

            this.rewardTimers.forEach(t => clearTimeout(t));
            this.rewardTimers = [];

            // 🎯 Délai adapté au mode : modes classique/rivalité ont une longue animation podium,
            // BombAnime/autres modes ont un écran winner quasi instantané
            const isInstantMode = this.gameEndData && (
                this.gameEndData.gameMode === 'bombanime' ||
                this.gameEndData.gameMode === 'survie' ||
                this.gameEndData.gameMode === 'ascension' ||
                this.gameEndData.gameMode === 'collect'
            );
            const waitBeforeSlide = isInstantMode ? 600 : 4500;
            const waitBeforeFill = isInstantMode ? 200 : 400;

            // Wait for podium (or short delay for instant modes), then slide in reward from top
            this.rewardTimers.push(setTimeout(() => {
                this.rewardAnimVisible = true;

                // Start the reward sequence after slide-in
                this.rewardTimers.push(setTimeout(() => {
                    this._startRewardSequence(r);
                }, waitBeforeFill));
            }, waitBeforeSlide));
        },

        _playSparkleSound() {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const duration = 0.35;
                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const gain = ctx.createGain();
                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(2400, ctx.currentTime);
                osc1.frequency.exponentialRampToValueAtTime(4800, ctx.currentTime + 0.08);
                osc1.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + duration);
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(3600, ctx.currentTime);
                osc2.frequency.exponentialRampToValueAtTime(6000, ctx.currentTime + 0.05);
                osc2.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + duration);
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
                osc1.connect(gain);
                osc2.connect(gain);
                gain.connect(ctx.destination);
                osc1.start(ctx.currentTime);
                osc2.start(ctx.currentTime);
                osc1.stop(ctx.currentTime + duration);
                osc2.stop(ctx.currentTime + duration);
                setTimeout(() => ctx.close(), 500);
            } catch(e) { /* silent */ }
        },

        _startRewardSequence(r) {
            const fill = document.getElementById('rewardFill');
            const coinVal = document.getElementById('rewardCoinVal');
            const xpGainEl = document.getElementById('rewardXpGain');
            const coinsGainEl = document.getElementById('rewardCoinsGain');

            if (!fill) return;

            // Reset
            fill.style.transition = 'none';
            fill.style.width = '0%';
            fill.style.background = '';
            const sparks = document.getElementById('rewardSparks');
            if (sparks) sparks.innerHTML = '';
            const xpParticles = document.getElementById('rewardXpParticles');
            if (xpParticles) xpParticles.innerHTML = '';
            const lvlBadge = document.getElementById('rewardLvlBadge');
            if (lvlBadge) lvlBadge.classList.remove('show', 'hide');
            const track = document.getElementById('rewardTrack');
            if (track) track.classList.remove('faded');
            if (xpGainEl) xpGainEl.classList.remove('show');
            if (coinsGainEl) coinsGainEl.classList.remove('show');
            void fill.offsetHeight;

            if (!r.leveledUp) {
                // === NORMAL ===
                const dur = 1600;
                const finalPct = r.xpForNextLevel > 0 ? ((r.xpInLevel + r.xpGained) / r.xpForNextLevel) * 100 : 0;

                this.rewardTimers.push(setTimeout(() => {
                    fill.style.transition = `width ${dur}ms cubic-bezier(0.25,0.1,0.25,1)`;
                    fill.style.width = Math.min(finalPct, 100) + '%';
                    this._startXpParticleLoop(dur);
                }, 300));

            } else {
                // === LEVEL UP ===
                const fillTo100dur = 1200;
                const remainderPct = r.newXpForNextLevel > 0 ? (r.newXpInLevel / r.newXpForNextLevel) * 100 : 0;
                const remainderDur = 800;

                this.rewardTimers.push(setTimeout(() => {
                    fill.style.transition = `width ${fillTo100dur}ms cubic-bezier(0.25,0.1,0.25,1)`;
                    fill.style.width = '100%';
                    this._startXpParticleLoop(fillTo100dur);
                }, 300));

                const sparkTime = 300 + fillTo100dur + 100;
                this.rewardTimers.push(setTimeout(() => {
                    this._spawnRewardSparks();
                    this._playSparkleSound();
                    if (track) track.classList.add('faded');

                    // 🆕 Animer le Niv de gauche en même temps que le son
                    const sideMain = document.querySelector('.reward-anim-level-text');
                    if (sideMain) {
                        sideMain.classList.remove('leveling-up');
                        void sideMain.offsetHeight;
                        this._spawnLevelUpBurst(sideMain);
                        setTimeout(() => {
                            sideMain.textContent = 'Niv. ' + r.levelAfter;
                        }, 180);
                        sideMain.classList.add('leveling-up');
                        setTimeout(() => sideMain.classList.remove('leveling-up'), 900);
                    }
                }, sparkTime));

                const resetTime = sparkTime + 300 + 1000;
                this.rewardTimers.push(setTimeout(() => {
                    fill.style.transition = 'none';
                    fill.style.width = '0%';
                    fill.style.background = '';
                    if (track) track.classList.remove('faded');
                    void fill.offsetHeight;

                    fill.style.transition = `width ${remainderDur}ms cubic-bezier(0.25,0.1,0.25,1)`;
                    fill.style.width = remainderPct + '%';
                    this._startXpParticleLoop(remainderDur);
                }, resetTime));
            }

            // +XP gain label
            this.rewardTimers.push(setTimeout(() => {
                if (xpGainEl) xpGainEl.classList.add('show');
            }, 800));

            // +Coins gain label + coin counter
            this.rewardTimers.push(setTimeout(() => {
                if (coinsGainEl) coinsGainEl.classList.add('show');
                this._spawnRewardParticles('rewardParticlesCoins', '#f5d442', '#ffe066');
                this._animateRewardCoins(coinVal, r.coinsBefore, r.coinsAfter, 1200);
            }, 1000));
        },

        _animateRewardCounter(el, from, to, max, duration) {
            if (!el) return;
            const start = performance.now();
            function tick(now) {
                const p = Math.min((now - start) / duration, 1);
                const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
                const val = Math.round(from + (to - from) * eased);
                el.textContent = val.toLocaleString() + ' / ' + max.toLocaleString();
                if (p < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
        },

        _animateRewardCoins(el, from, to, duration) {
            if (!el) return;
            const start = performance.now();
            function tick(now) {
                const p = Math.min((now - start) / duration, 1);
                const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
                const val = Math.round(from + (to - from) * eased);
                el.textContent = val.toLocaleString();
                if (p < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
        },

        _startXpParticleLoop(durationMs) {
            const track = document.getElementById('rewardTrack');
            const fill = document.getElementById('rewardFill');
            const container = document.getElementById('rewardXpParticles');
            if (!track || !fill || !container) return;

            const startTime = performance.now();
            const endTime = startTime + durationMs + 150;
            const self = this;

            function tick(now) {
                if (now > endTime) return;

                const trackW = track.getBoundingClientRect().width;
                const fillW = fill.getBoundingClientRect().width;
                if (trackW <= 0) {
                    requestAnimationFrame(tick);
                    return;
                }
                const filled = Math.max(0, Math.min(100, (fillW / trackW) * 100));

                const trailingCount = Math.max(1, Math.floor(filled / 12));
                for (let k = 0; k < trailingCount; k++) {
                    if (Math.random() > 0.5) {
                        self._spawnXpParticle(container, Math.random() * filled * 0.92, 'rising');
                    }
                }

                for (let k = 0; k < 6; k++) {
                    const jitter = (Math.random() - 0.2) * 1.5;
                    self._spawnXpParticle(container, Math.max(0, Math.min(100, filled + jitter)), 'edge');
                }

                if (Math.random() > 0.4) {
                    self._spawnXpParticle(container, filled, 'burst');
                }

                requestAnimationFrame(tick);
            }

            requestAnimationFrame(tick);
        },

        _spawnXpParticle(container, xPct, type) {
            const p = document.createElement('div');
            p.className = 'reward-xp-particle ' + type;
            const color = Math.random() > 0.5 ? '#fff8dc' : '#f5d442';
            let size, driftX, driftY, dur;

            if (type === 'edge') {
                size = 2.2 + Math.random() * 2.2;
                driftX = (Math.random() - 0.3) * 16;
                driftY = -(14 + Math.random() * 22);
                dur = 0.7 + Math.random() * 0.5;
            } else if (type === 'burst') {
                size = 1.8 + Math.random() * 2.5;
                const angle = (Math.random() * Math.PI) - Math.PI / 2;
                const dist = 8 + Math.random() * 18;
                driftX = Math.cos(angle) * dist;
                driftY = Math.sin(angle) * dist - 6;
                dur = 0.5 + Math.random() * 0.4;
            } else {
                size = 1 + Math.random() * 1.5;
                driftX = (Math.random() - 0.5) * 8;
                driftY = -(10 + Math.random() * 14);
                dur = 0.8 + Math.random() * 0.5;
            }

            p.style.cssText = `width:${size}px;height:${size}px;left:${xPct}%;top:50%;background:${color};box-shadow:0 0 ${3 + Math.random() * 3}px ${color};--dx:${driftX}px;--dy:${driftY}px;animation-duration:${dur}s;`;
            container.appendChild(p);
            setTimeout(() => p.remove(), dur * 1000 + 50);
        },

        _spawnLevelUpBurst(anchorEl) {
            if (!anchorEl) return;
            const parent = anchorEl.parentElement;
            if (!parent) return;

            let burst = parent.querySelector('.reward-lvl-burst');
            if (!burst) {
                burst = document.createElement('div');
                burst.className = 'reward-lvl-burst';
                parent.appendChild(burst);
            }
            burst.innerHTML = '';

            const rect = anchorEl.getBoundingClientRect();
            const parentRect = parent.getBoundingClientRect();
            burst.style.left = (rect.left - parentRect.left + rect.width / 2) + 'px';
            burst.style.top = (rect.top - parentRect.top + rect.height / 2) + 'px';

            const colors = ['#f5d442', '#ffe066', '#daa520', '#fff8dc', '#fff'];
            for (let i = 0; i < 18; i++) {
                const p = document.createElement('div');
                p.className = 'reward-lvl-burst-particle';
                const angle = (Math.PI * 2 / 18) * i + (Math.random() - 0.5) * 0.4;
                const dist = 18 + Math.random() * 32;
                const size = 1.8 + Math.random() * 2.8;
                const color = colors[Math.floor(Math.random() * colors.length)];
                const dur = 0.55 + Math.random() * 0.4;
                p.style.cssText = `width:${size}px;height:${size}px;background:${color};box-shadow:0 0 ${size * 2}px ${color};--tx:${Math.cos(angle) * dist}px;--ty:${Math.sin(angle) * dist}px;--duration:${dur}s;`;
                burst.appendChild(p);
            }

            setTimeout(() => { if (burst) burst.innerHTML = ''; }, 1100);
        },

        _spawnRewardParticles(containerId, c1, c2) {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = '';
            for (let i = 0; i < 14; i++) {
                const p = document.createElement('div');
                p.className = 'reward-particle';
                const angle = (Math.PI * 2 / 14) * i + (Math.random() - 0.5) * 0.6;
                const dist = 25 + Math.random() * 40;
                const size = 2 + Math.random() * 3;
                const color = Math.random() > 0.5 ? c1 : c2;
                p.style.cssText = `width:${size}px;height:${size}px;left:50%;top:50%;margin-left:-${size/2}px;margin-top:-${size/2}px;background:${color};--tx:${Math.cos(angle)*dist}px;--ty:${Math.sin(angle)*dist}px;--duration:${0.5+Math.random()*0.4}s;--delay:${Math.random()*0.15}s;box-shadow:0 0 ${size*2}px ${color};`;
                container.appendChild(p);
                requestAnimationFrame(() => p.classList.add('show'));
            }
        },

        _spawnRewardSparks() {
            const container = document.getElementById('rewardSparks');
            if (!container) return;
            container.innerHTML = '';
            const colors = ['#f5d442','#ffe066','#daa520','#fff8dc','#fff'];
            for (let i = 0; i < 16; i++) {
                const spark = document.createElement('div');
                const isLine = Math.random() > 0.4;
                spark.className = 'reward-spark ' + (isLine ? 'reward-spark-line' : 'reward-spark-dot');
                const angle = (Math.random() - 0.5) * Math.PI * 1.2;
                const dist = 18 + Math.random() * 50;
                const tx = Math.cos(angle) * dist + 8;
                const ty = Math.sin(angle) * dist;
                const dur = 0.4 + Math.random() * 0.35;
                const delay = Math.random() * 0.12;
                const color = colors[Math.floor(Math.random() * colors.length)];
                if (isLine) {
                    const len = 5 + Math.random() * 12;
                    spark.style.cssText = `width:${len}px;--angle:${angle}rad;--tx:${tx}px;--ty:${ty}px;--duration:${dur}s;--delay:${delay}s;background:${color};box-shadow:0 0 ${3+Math.random()*3}px ${color};`;
                } else {
                    const sz = 2 + Math.random() * 3;
                    spark.style.cssText = `width:${sz}px;height:${sz}px;--angle:0rad;--tx:${tx}px;--ty:${ty}px;--duration:${dur}s;--delay:${delay}s;background:${color};box-shadow:0 0 ${sz*2}px ${color};`;
                }
                container.appendChild(spark);
                requestAnimationFrame(() => spark.classList.add('show'));
            }
        },

        _spawnRewardLvlParticles() {
            const container = document.getElementById('rewardSparks');
            if (!container) return;
            for (let i = 0; i < 12; i++) {
                const p = document.createElement('div');
                p.className = 'reward-particle';
                const angle = (Math.PI * 2 / 12) * i + (Math.random() - 0.5) * 0.5;
                const dist = 20 + Math.random() * 35;
                const size = 2 + Math.random() * 3;
                const colors = ['#f5d442','#daa520','#ffe066','#fff'];
                const color = colors[Math.floor(Math.random() * colors.length)];
                p.style.cssText = `width:${size}px;height:${size}px;background:${color};--tx:${Math.cos(angle)*dist}px;--ty:${Math.sin(angle)*dist}px;--duration:${0.5+Math.random()*0.4}s;--delay:${Math.random()*0.12}s;box-shadow:0 0 ${size*2}px ${color};`;
                container.appendChild(p);
                requestAnimationFrame(() => p.classList.add('show'));
            }
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

        // ============================================
        // COLLECT METHODS
        // ============================================
        
        // Calculer la position d'un siège Collect
        getCollectSeatPosition(index, totalPlayers) {
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
            const exceptions = { 'JoJo': 'JoJo', 'Jojo': 'JoJo', 'DragonBallZ': 'Dragon Ball', 'DragonBall': 'Dragon Ball' };
            if (exceptions[name]) return exceptions[name];
            return name
                .replace(/([a-z])([A-Z])/g, '$1 $2')   // camelCase → spaces
                .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2'); // ABCDef → ABC Def
        },

        // Vérifier si une carte bénéficie du bonus même anime (2+ cartes du même anime en main)
        hasSameAnimeBonus(card) {
            if (!card || !card.anime || !this.collect.myCards) return false;
            const count = this.collect.myCards.filter(c => c && c.anime === card.anime).length;
            return count >= 2;
        },
        
        marketMatchesHand(card) {
            if (!card || !card.anime || !this.collect.myCards) return false;
            return this.collect.myCards.some(c => c && c.anime === card.anime);
        },
        
        // Afficher le preview d'une carte
        showCardPreview(card, event) {
            if (!card) return;
            // Ne pas afficher si la carte est encore en pre-deal ou dealing
            if (event && event.target) {
                const cardEl = event.target.closest('.collect-card');
                if (cardEl && (cardEl.classList.contains('pre-deal') || cardEl.classList.contains('dealing'))) return;
            }
            this.collect.previewCard = card;
            this.collect.previewCardDisplay = card;
            this.collect.previewVisible = true;
        },
        
        // Masquer le preview avec animation
        hideCardPreview() {
            this.collect.previewCard = null;
            this.collect.previewVisible = false;
            // Garder le contenu visible pendant l'animation de sortie
            setTimeout(() => {
                if (!this.collect.previewVisible) {
                    this.collect.previewCardDisplay = null;
                }
            }, 300);
        },
        
        // Position d'un joueur sur la table Collect (POV toujours en bas)
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
        
        getCollectPlayerStyle(index, totalOthers) {
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
        dealCollectCards() {
            const allSeats = document.querySelectorAll('.collect-player-seat:not(.hidden)');
            
            // Préparer les cartes adverses (cacher via DOM)
            allSeats.forEach(seat => {
                const isMe = seat.classList.contains('me');
                if (isMe) return; // Les cartes POV ne sont pas encore rendues
                
                const cards = seat.querySelectorAll('.collect-player-card-small');
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
                            if (this._pendingCollectCards) {
                                this.collect.myCards = this._pendingCollectCards.filter(c => c != null);
                                this._pendingCollectCards = null;
                                this.saveCollectState();
                            }
                            // Attendre que Vue ait rendu les cartes
                            this.$nextTick(() => {
                                const myCards = seat.querySelectorAll('.collect-my-cards .collect-card');
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
                        const cards = seat.querySelectorAll('.collect-player-card-small');
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
                
                // Le slot sera affiché après le market-reveal (géré par le listener collect-market-reveal)
            }, 100);
        },
        
        // Initialiser Collect quand on reçoit les données
        initCollect(data) {
            console.log('🎴 Init Collect:', data);
            
            this.collect.active = true;
            this.collect.handSize = data.handSize || 3;
            this.collect.reconnecting = false;
            this.collect.showCenterSlot = false;
            this.collect.cardPlayed = false;
            this.collect.playedCardData = null;
            this.collect.timerExpired = false;
            this.collect.cardsActive = false; // 🔒 Reset, sera réactivé par timer
            this.collect.timer = 0;
            this.collect.selectedStat = null;
            this.collect.currentTurnId = null;
            this.collect.isMyTurn = false;
            this.collect.draggingCardIndex = null;
            this.collect.dropZoneActive = false;
            this.collect.playersWhoPlayed = [];
            this.collect.canDraw = false;
            this.stopCollectTimer();
            this.collect.myCards = [];  // Reset cartes POV (seront injectées par dealCollectCards)
            this.collect.marketCards = [];  // Vide au départ, injectées par collect-market-reveal
            this._pendingCollectCards = null;
            this._collectCardsReceived = false;
            this._collectDealStarted = false;
            
            // Séparer mes données des autres joueurs
            const allPlayers = data.playersData || [];
            this.collect.playersData = allPlayers;
            
            // Trouver mes données
            const myPlayer = allPlayers.find(p => p.twitchId === this.twitchId);
            if (myPlayer) {
                this.collect.myData = {
                    wins: myPlayer.wins || 0
                };
            }
            
            // Les autres joueurs - ordonnés en sens horaire à partir du joueur après moi
            this.collect.otherPlayers = this.getOrderedOtherPlayers(allPlayers, p => ({
                    ...p,
                    wins: p.wins || 0,
                    cardCount: p.cardCount !== undefined ? p.cardCount : (this.collect.handSize || 3),
                    isCurrentPlayer: p.isCurrentPlayer || false
                }));
            
            // Sauvegarder l'état complet dans sessionStorage
            this.saveCollectState();
        },
        
        // Sauvegarder l'état Collect dans sessionStorage
        saveCollectState() {
            try {
                const state = {
                    myCards: this.collect.myCards,
                    myData: this.collect.myData,
                    otherPlayers: this.collect.otherPlayers,
                    playersData: this.collect.playersData,
                    selectedStat: this.collect.selectedStat,
                    cardPlayed: this.collect.cardPlayed || false,
                    playedCardData: this.collect.playedCardData || null,
                    timerExpired: this.collect.timerExpired || false,
                    canDraw: this.collect.canDraw || false,
                    isMyTurn: this.collect.isMyTurn || false,
                    handSize: this.collect.handSize || 3,
                    cardsActive: this.collect.cardsActive || false,
                    timerEndMs: this._collectTimerEndMs || null,
                    timerDuration: this._collectTimerDuration || null
                };
                sessionStorage.setItem('collectInProgress', 'true');
                sessionStorage.setItem('collectState', JSON.stringify(state));
            } catch (e) {
                console.warn('🎴 Erreur sauvegarde état Collect:', e);
            }
        },
        
        // Restaurer l'état Collect depuis sessionStorage (instantané)
        restoreCollectState() {
            try {
                const raw = sessionStorage.getItem('collectState');
                if (!raw) return false;
                
                const state = JSON.parse(raw);
                
                this.collect.myCards = (state.myCards || []).filter(c => c != null);
                this.collect.myData = state.myData || { wins: 0 };
                this.collect.otherPlayers = state.otherPlayers || [];
                this.collect.playersData = state.playersData || [];
                this.collect.reconnecting = false;
                
                // Restaurer stat + slot
                if (state.selectedStat) {
                    this.collect.selectedStat = state.selectedStat;
                    this.collect.showCenterSlot = true;
                }
                
                // Restaurer carte jouée
                if (state.cardPlayed) {
                    this.collect.cardPlayed = true;
                    this.collect.playedCardData = state.playedCardData || null;
                }
                
                // Restaurer état pioche + tour
                this.collect.canDraw = state.canDraw || false;
                this.collect.isMyTurn = state.isMyTurn || false;
                this.collect.handSize = state.handSize || 3;
                
                // Restaurer timer + cardsActive depuis clés standalone
                const savedEndMs = parseInt(sessionStorage.getItem('collectTimerEndMs') || '0');
                const savedDuration = parseInt(sessionStorage.getItem('collectTimerDuration') || '15');
                const timerExpiredSS = sessionStorage.getItem('collectTimerExpired') === 'true';
                
                if (savedEndMs && savedEndMs > Date.now() + 500) {
                    const remainingMs = savedEndMs - Date.now();
                    const remainingSec = Math.ceil(remainingMs / 1000);
                    this.collect.cardsActive = true;
                    this._collectTimerDuration = savedDuration;
                    this.startCollectTimer(remainingSec);
                    console.log('⏱️ Timer restauré:', remainingSec, 's restantes');
                } else if (timerExpiredSS || state.timerExpired) {
                    this.collect.timerExpired = true;
                    this.collect.cardsActive = false;
                } else {
                    this.collect.cardsActive = state.cardsActive || false;
                }
                
                console.log('🎴 État Collect restauré depuis sessionStorage');
                return true;
            } catch (e) {
                console.warn('🎴 Erreur restauration état Collect:', e);
                return false;
            }
        },
        
        // 🆕 Afficher l'overlay d'annonce de round avec clash de cartes
        // 🎴 Séquence après market reveal: slot+deck → 1s → timer + cartes actives
        _startCollectAfterMarket() {
            if (this._timerStarted) return;
            this._timerStarted = true;
            
            // Reset état
            this.collect.cardPlayed = false;
            this.collect.timerExpired = false;
            this.collect.cardsActive = false; // 🔒 Cartes inactives, le serveur enverra collect-turn-start
            
            const vm = this;
            // 1s après market → afficher slot + deck
            setTimeout(() => {
                vm.collect.showCenterSlot = true;
                console.log('🎴 Slot + deck visibles, en attente du tour...');
                // Le serveur enverra collect-turn-start ~1s plus tard
            }, 1000);
        },

        showCollectRoundOverlay(round, stat, statName) {
            this.collect.currentRound = round;
            this.collect.selectedStat = stat;
            // Reset du round
            this.collect.cardPlayed = false;
            this.collect.playedCardData = null;
            this.collect.draggingCardIndex = null;
            this.collect.dropZoneActive = false;
            this.collect.timerExpired = false;
            this.collect.cardsActive = false; // 🔒 Cartes inactives jusqu'au tour
            this.collect.playersWhoPlayed = [];
            this.collect.currentTurnId = null;
            this.collect.isMyTurn = false;
            this.collect.turnTimerProgress = 0;
            this.stopCollectTimer();
            
            // NE PAS montrer le slot tout de suite
            this.collect.showCenterSlot = false;
            
            const vm = this;
            // Afficher le slot après 1s — le serveur enverra collect-turn-start
            setTimeout(() => {
                vm.collect.showCenterSlot = true;
                console.log('🎲 Round', round, '- en attente du tour...');
            }, 1000);
        },

        // 🆕 DRAG & DROP - Début du drag
        startCardDrag(cardIndex, e) {
            if (this.collect.cardPlayed) return;
            if (this.collect.timerExpired) return;
            if (!this.collect.cardsActive) return; // 🔒 Timer pas encore démarré
            if (!this.collect.showCenterSlot) return; // Pas encore de round actif
            if (this._fusionInProgress) return; // Fusion en cours
            
            this.hideCardPreview(); // Cacher le preview
            this.collect.draggingCardIndex = cardIndex;
            this._dragStartX = e.clientX;
            this._dragStartY = e.clientY;
            
            const cardEl = e.currentTarget;
            const rect = cardEl.getBoundingClientRect();
            const card = this.collect.myCards[cardIndex];
            
            // Créer un ghost simplifié
            const ghost = document.createElement('div');
            ghost.className = 'collect-card large drag-ghost';
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
            const slotEl = document.querySelector('.collect-center-slot');
            if (slotEl) {
                const slotRect = slotEl.getBoundingClientRect();
                let overSlot = (
                    e.clientX >= slotRect.left - 2 &&
                    e.clientX <= slotRect.right + 2 &&
                    e.clientY >= slotRect.top - 2 &&
                    e.clientY <= slotRect.bottom + 2
                );
                this.collect.dropZoneActive = overSlot;
            }
            
            // 🔥 Détecter si on survole une autre carte du même anime (fusion)
            this._mergeTargetIndex = null;
            const sourceCard = this.collect.myCards[this.collect.draggingCardIndex];
            if (!sourceCard) return;
            
            // 🔄 Détecter survol carte marché
            let wasOverMarket = this._marketSwapIndex !== null;
            this._marketSwapIndex = null;
            document.querySelectorAll('.collect-market .market-card').forEach((el, i) => {
                el.classList.remove('swap-hover');
                const r = el.getBoundingClientRect();
                if (e.clientX >= r.left - 5 && e.clientX <= r.right + 5 &&
                    e.clientY >= r.top - 5 && e.clientY <= r.bottom + 5) {
                    el.classList.add('swap-hover');
                    this._marketSwapIndex = i;
                }
            });
            
            // Ghost transform: shrink + darken + swap icon quand sur marché
            if (this._marketSwapIndex !== null && ghost) {
                if (!wasOverMarket) {
                    ghost.style.transform = 'scale(0.55) rotate(0deg)';
                    ghost.style.filter = 'brightness(0.4)';
                    ghost.style.transition = 'transform 0.2s ease, filter 0.2s ease';
                    // Add swap icon overlay
                    if (!ghost.querySelector('.ghost-swap-icon')) {
                        const icon = document.createElement('div');
                        icon.className = 'ghost-swap-icon';
                        icon.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:10;pointer-events:none;';
                        icon.innerHTML = '<div style="width:36px;height:36px;background:rgba(76,175,80,0.95);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(76,175,80,0.6);animation:swap-badge-pop 0.2s cubic-bezier(0.34,1.56,0.64,1) forwards;"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3l4 4-4 4"/><path d="M20 7H4"/><path d="M8 21l-4-4 4-4"/><path d="M4 17h16"/></svg></div>';
                        ghost.appendChild(icon);
                    }
                }
            } else if (wasOverMarket && ghost) {
                ghost.style.transform = 'scale(1.08) rotate(2deg)';
                ghost.style.filter = 'brightness(1.2)';
                const swapIcon = ghost.querySelector('.ghost-swap-icon');
                if (swapIcon) swapIcon.remove();
            }
            
            const cardEls = document.querySelectorAll('.collect-my-cards .collect-card.large');
            cardEls.forEach((el, i) => {
                el.classList.remove('merge-target');
                if (i === this.collect.draggingCardIndex) return;
                const targetCard = this.collect.myCards[i];
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
            
            const cardIndex = this.collect.draggingCardIndex;
            
            // 🔥 Si le joueur n'a presque pas bougé, c'est un click - ignorer (drag only)
            const dragDistance = Math.hypot(e.clientX - this._dragStartX, e.clientY - this._dragStartY);
            if (dragDistance < 15) {
                ghost.remove();
                this.collect.draggingCardIndex = null;
                this.collect.dropZoneActive = false;
                this._dragGhost = null;
                return;
            }
            
            // Clean up merge target highlights
            document.querySelectorAll('.collect-my-cards .collect-card.large.merge-target').forEach(el => el.classList.remove('merge-target'));
            // Clean up market swap highlights
            document.querySelectorAll('.collect-market .market-card.swap-hover').forEach(el => el.classList.remove('swap-hover'));
            
            // 🔥 FIX: Re-check positions at DROP time (not relying on last pointermove)
            const dropX = e.clientX;
            const dropY = e.clientY;
            
            // 🔄 Check market card overlap at drop time
            let marketSwapIdx = null;
            document.querySelectorAll('.collect-market .market-card').forEach((el, i) => {
                const r = el.getBoundingClientRect();
                if (dropX >= r.left - 5 && dropX <= r.right + 5 &&
                    dropY >= r.top - 5 && dropY <= r.bottom + 5) {
                    marketSwapIdx = i;
                }
            });
            
            // 🔄 MARKET SWAP: dropped on a market card
            if (marketSwapIdx !== null && cardIndex !== null && !this.collect.timerExpired && !this.collect.cardPlayed) {
                const card = this.collect.myCards[cardIndex];
                // Pas d'échange de cartes fusionnées
                if (card && card.isFused) {
                    // Retour en place
                    ghost.style.transition = 'all 0.3s cubic-bezier(0.4,0,0.2,1)';
                    ghost.style.left = this._dragCardRect.left + 'px';
                    ghost.style.top = this._dragCardRect.top + 'px';
                    ghost.style.transform = 'scale(1) rotate(0deg)';
                    ghost.style.opacity = '1';
                    setTimeout(() => ghost.remove(), 300);
                } else {
                    // Animation: ghost snap vers la carte marché
                    const marketEl = document.querySelectorAll('.collect-market .market-card')[marketSwapIdx];
                    if (marketEl) {
                        const mr = marketEl.getBoundingClientRect();
                        ghost.style.transition = 'all 0.25s cubic-bezier(0.4,0,0.2,1)';
                        ghost.style.left = (mr.left + mr.width/2 - this._dragCardRect.width/2) + 'px';
                        ghost.style.top = (mr.top + mr.height/2 - this._dragCardRect.height/2) + 'px';
                        ghost.style.transform = 'scale(0.6) rotate(0deg)';
                        ghost.style.opacity = '0.5';
                    }
                    setTimeout(() => ghost.remove(), 300);
                    this.swapWithMarket(cardIndex, marketSwapIdx);
                }
                this.collect.draggingCardIndex = null;
                this.collect.dropZoneActive = false;
                this._dragGhost = null;
                return;
            }
            
            // Check slot overlap at drop time
            let overSlot = false;
            const slotEl = document.querySelector('.collect-center-slot');
            if (slotEl) {
                const slotRect = slotEl.getBoundingClientRect();
                // Zone de drop = slot + 2px de marge
                overSlot = (
                    dropX >= slotRect.left - 2 &&
                    dropX <= slotRect.right + 2 &&
                    dropY >= slotRect.top - 2 &&
                    dropY <= slotRect.bottom + 2
                );
                
                if (!overSlot) {
                    console.log('❌ DROP zone miss debug - slotRect:', JSON.stringify({l: slotRect.left, r: slotRect.right, t: slotRect.top, b: slotRect.bottom}), 'drop:', dropX, dropY);
                }
            }
            
            // Check merge target at drop time
            let mergeTarget = null;
            if (cardIndex !== null && !overSlot) {
                const sourceCard = this.collect.myCards[cardIndex];
                if (sourceCard) {
                    const cardEls = document.querySelectorAll('.collect-my-cards .collect-card.large');
                    cardEls.forEach((el, i) => {
                        if (i === cardIndex) return;
                        const targetCard = this.collect.myCards[i];
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
                const targetEl = document.querySelectorAll('.collect-my-cards .collect-card.large')[targetIndex];
                if (targetEl) {
                    const tgtRect = targetEl.getBoundingClientRect();
                    ghost.style.transition = 'all 0.2s ease-in';
                    ghost.style.left = (tgtRect.left + tgtRect.width / 2 - this._dragCardRect.width / 2) + 'px';
                    ghost.style.top = (tgtRect.top + tgtRect.height / 2 - this._dragCardRect.height / 2) + 'px';
                    ghost.style.transform = 'scale(0.5)';
                    ghost.style.opacity = '0';
                }
                setTimeout(() => ghost.remove(), 250);
                this.fuseCollectCards(cardIndex, targetIndex);
                this._mergeTargetIndex = null;
                this.collect.draggingCardIndex = null;
                this.collect.dropZoneActive = false;
                this._dragGhost = null;
                return;
            }
            this._mergeTargetIndex = null;
            
            if (overSlot && cardIndex !== null && !this.collect.timerExpired && !this.collect.cardPlayed) {
                // ✅ DROP SUR LE SLOT → jouer la carte
                console.log('✅ DROP on slot - cardIndex:', cardIndex, 'overSlot:', overSlot);
                const slotRect = slotEl.getBoundingClientRect();
                const card = this.collect.myCards[cardIndex];
                const isDiscard = card && !card.isFused;
                
                if (isDiscard) {
                    // 💥 DÉFAUSSE — ghost snap au centre du slot puis shatter
                    const cx = slotRect.left + slotRect.width / 2;
                    const cy = slotRect.top + slotRect.height / 2;
                    ghost.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
                    ghost.style.left = (cx - this._dragCardRect.width / 2) + 'px';
                    ghost.style.top = (cy - this._dragCardRect.height / 2) + 'px';
                    ghost.style.transform = 'scale(0.5) rotate(0deg)';
                    ghost.style.opacity = '1';
                    
                    setTimeout(() => {
                        ghost.style.display = 'none';
                        ghost.remove();
                        this.playShatterEffect(cx, cy);
                    }, 200);
                    
                    this.discardCollectCard(cardIndex);
                } else {
                    // ⭐ FUSION VALIDATION — comportement existant
                    ghost.style.transition = 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    ghost.style.left = (slotRect.left + slotRect.width / 2 - this._dragCardRect.width / 2) + 'px';
                    ghost.style.top = (slotRect.top + slotRect.height / 2 - this._dragCardRect.height / 2) + 'px';
                    ghost.style.transform = 'scale(0.55) rotate(0deg)';
                    ghost.style.opacity = '0';
                    setTimeout(() => { ghost.remove(); }, 400);
                    
                    this.playCollectCard(cardIndex);
                }
            } else {
                // ❌ PAS SUR LE SLOT → retour en place
                console.log('❌ DROP missed - overSlot:', overSlot, 'cardIndex:', cardIndex, 'timerExpired:', this.collect.timerExpired, 'cardPlayed:', this.collect.cardPlayed, 'dropXY:', dropX, dropY);
                ghost.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                ghost.style.left = this._dragCardRect.left + 'px';
                ghost.style.top = this._dragCardRect.top + 'px';
                ghost.style.transform = 'scale(1) rotate(0deg)';
                ghost.style.opacity = '1';
                
                setTimeout(() => {
                    ghost.remove();
                }, 300);
            }
            
            this.collect.draggingCardIndex = null;
            this.collect.dropZoneActive = false;
            this._dragGhost = null;
        },
        
        // 🆕 Jouer une carte Collect
        // Server-synced timer (100ms precision)
        startCollectTimer(seconds = 15) {
            this.stopCollectTimer(true);
            this._collectTimerEndMs = Date.now() + seconds * 1000;
            this._collectTimerDuration = seconds;
            this.collect.timer = seconds;
            this.collect.timerProgress = 0;
            this.collect.timerExpired = false;
            // 💾 Sauvegarder pour restore après refresh
            sessionStorage.setItem('collectTimerEndMs', this._collectTimerEndMs.toString());
            sessionStorage.setItem('collectTimerDuration', this._collectTimerDuration.toString());
            sessionStorage.removeItem('collectTimerExpired');
            this._collectTimerInterval = setInterval(() => {
                const now = Date.now();
                const remaining = Math.ceil((this._collectTimerEndMs - now) / 1000);
                const elapsed = this._collectTimerDuration - ((this._collectTimerEndMs - now) / 1000);
                this.collect.timer = Math.max(0, remaining);
                this.collect.timerProgress = Math.min(1, elapsed / this._collectTimerDuration);
                if (remaining <= 0) {
                    clearInterval(this._collectTimerInterval);
                    this._collectTimerInterval = null;
                    this._collectTimerEndMs = null;
                    this._collectTimerDuration = null;
                    this.collect.timerExpired = true;
                    this.collect.cardsActive = false; // 🔒 Désactiver les cartes
                    this.collect.timerProgress = 1;
                    // 💾 Marquer expiré
                    sessionStorage.setItem('collectTimerExpired', 'true');
                    sessionStorage.removeItem('collectTimerEndMs');
                    sessionStorage.removeItem('collectTimerDuration');
                    // Cancel any active drag immediately
                    if (this._dragGhost) {
                        this._dragGhost.remove();
                        this._dragGhost = null;
                        this.collect.draggingCardIndex = null;
                        this.collect.dropZoneActive = false;
                        if (this._boundDragMove) document.removeEventListener('pointermove', this._boundDragMove);
                        if (this._boundDragEnd) document.removeEventListener('pointerup', this._boundDragEnd);
                    }
                    // Clean up swap/merge highlights
                    document.querySelectorAll('.market-card.swap-hover').forEach(el => el.classList.remove('swap-hover'));
                    document.querySelectorAll('.collect-card.large.merge-target').forEach(el => el.classList.remove('merge-target'));
                    this.saveCollectState();
                }
            }, 100);
        },
        stopCollectTimer(silent) {
            if (this._collectTimerInterval) { clearInterval(this._collectTimerInterval); this._collectTimerInterval = null; }
            this._collectTimerEndMs = null;
            if (!silent) this.collect.timer = 0;
            // timerExpired is NOT reset here - only on new round
        },

        // 🔥 FUSION - Combiner deux cartes du même anime
        fuseCollectCards(sourceIndex, targetIndex) {
            const src = this.collect.myCards[sourceIndex];
            const tgt = this.collect.myCards[targetIndex];
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
            const cardEls = document.querySelectorAll('.collect-my-cards .collect-card.large');
            const srcEl = cardEls[sourceIndex];
            const tgtEl = cardEls[targetIndex];
            
            if (tgtEl) {
                // Phase 1: Impact glow (0.4s)
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
                
                // Phase 3: Source disappears immediately at start (like admin ghost covers it)
                if (srcEl) { srcEl.style.opacity = '0'; srcEl.style.transform = 'scale(0.6)'; srcEl.style.pointerEvents = 'none'; }
                
                // Phase 4: Burst — fixed on body (survives Vue re-render)
                const burst = document.createElement('div');
                burst.className = 'collect-fusion-burst';
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
                // Cacher la target AVANT de retirer fuse-impact (évite le snap-back visible)
                if (tgtEl) { tgtEl.style.opacity = '0'; tgtEl.classList.remove('fuse-impact'); }
                // Adjust indices: remove source first if before target
                if (sourceIndex < targetIndex) {
                    this.collect.myCards.splice(targetIndex, 1, fusedCard);
                    this.collect.myCards.splice(sourceIndex, 1);
                } else {
                    this.collect.myCards.splice(sourceIndex, 1);
                    this.collect.myCards.splice(targetIndex, 1, fusedCard);
                }
                
                // 🔥 FIX: Clean up stale DOM classes/styles after Vue re-render
                this.$nextTick(() => {
                    document.querySelectorAll('.collect-my-cards .collect-card.large').forEach(el => {
                        el.classList.remove('dissolving', 'fuse-impact');
                        el.style.pointerEvents = '';
                        el.style.opacity = '';
                    });
                    this._fusionInProgress = false;
                });
            }, 600);
            
            // Notify server
            this.socket.emit('collect-fuse-cards', {
                twitchId: this.twitchId,
                sourceIndex: sourceIndex,
                targetIndex: targetIndex
            });
        },
        
        playCollectCard(cardIndex) {
            if (this.collect.timerExpired) return;
            const card = this.collect.myCards[cardIndex];
            if (!card) return;
            
            console.log('🎴 Carte jouée:', card.name, 'isFused:', card.isFused, 'fusedCards:', card.fusedCards ? card.fusedCards.length : 0);
            
            this.collect.cardPlayed = true;
            // Deep clone to ensure Vue reactivity detects all properties
            this.collect.playedCardData = JSON.parse(JSON.stringify(card));
            // Timer keeps running until end of round
            
            // Émettre au serveur
            this.socket.emit('collect-play-card', {
                twitchId: this.twitchId,
                cardIndex: cardIndex
            });
            
            // Retirer la carte de la main
            this.collect.myCards.splice(cardIndex, 1);
            this.saveCollectState();
        },

        // 🗑️ Défausser une carte (pas de carte visible dans le slot)
        discardCollectCard(cardIndex) {
            if (this.collect.timerExpired) return;
            const card = this.collect.myCards[cardIndex];
            if (!card) return;
            
            console.log('🗑️ Carte défaussée:', card.name);
            
            this.collect.cardPlayed = true;
            // PAS de playedCardData → le slot reste vide visuellement
            this.collect.playedCardData = null;
            this.collect.canDraw = false; // Défausse = fin du tour
            this.triggerActionBar('throw');
            
            // Émettre au serveur avec flag discard
            this.socket.emit('collect-play-card', {
                twitchId: this.twitchId,
                cardIndex: cardIndex,
                discard: true
            });
            
            // Retirer la carte de la main
            this.collect.myCards.splice(cardIndex, 1);
            this.saveCollectState();
        },

        // 🔄 Échanger une carte avec le marché
        swapWithMarket(cardIndex, marketIndex) {
            if (this.collect.timerExpired || this.collect.cardPlayed) return;
            const card = this.collect.myCards[cardIndex];
            if (!card || card.isFused) return;
            
            const marketCard = this.collect.marketCards[marketIndex];
            if (!marketCard) return;
            
            console.log(`🔄 Échange: ${card.name} ↔ ${marketCard.name}`);
            
            this.collect.cardPlayed = true;
            this.collect.canDraw = false;
            this.triggerActionBar('swap');
            
            // Émettre au serveur
            this.socket.emit('collect-swap-market', {
                twitchId: this.twitchId,
                cardIndex: cardIndex,
                marketIndex: marketIndex
            });
            
            // Swap local optimiste
            const receivedCard = JSON.parse(JSON.stringify(marketCard));
            this.collect.marketCards[marketIndex] = JSON.parse(JSON.stringify(card));
            this.collect.myCards.splice(cardIndex, 1, receivedCard);
            
            this.saveCollectState();
        },

        // 💥 Effet Shatter — défausse de carte
        playShatterEffect(cx, cy) {
            const colors = ['#93c5fd', '#60a5fa', '#3b82f6', '#1d4ed8', '#c4d5f0', '#fff', '#a5b4fc', '#818cf8'];
            
            // Flash blanc
            const flash = document.createElement('div');
            flash.className = 'shatter-flash';
            flash.style.cssText = `
                left: ${cx}px; top: ${cy}px;
                width: 70px; height: 70px;
                animation: shatter-flash 0.5s ease-out forwards;
            `;
            document.body.appendChild(flash);
            setTimeout(() => flash.remove(), 550);
            
            // Fragments
            for (let i = 0; i < 16; i++) {
                const frag = document.createElement('div');
                frag.className = 'shatter-fragment';
                const w = 8 + Math.random() * 20;
                const h = 8 + Math.random() * 20;
                const sx = (Math.random() - 0.5) * 220;
                const sy = (Math.random() - 0.5) * 200;
                const sr = (Math.random() - 0.5) * 720;
                const dur = 0.45 + Math.random() * 0.35;
                const color = colors[Math.floor(Math.random() * colors.length)];
                const points = [
                    `${Math.random()*30}% 0%`,
                    `100% ${Math.random()*30}%`,
                    `${70+Math.random()*30}% 100%`,
                    `0% ${70+Math.random()*30}%`
                ].join(', ');
                frag.style.cssText = `
                    left: ${cx + (Math.random()-0.5)*30}px;
                    top: ${cy + (Math.random()-0.5)*40}px;
                    width: ${w}px; height: ${h}px;
                    background: ${color};
                    clip-path: polygon(${points});
                    --sx: ${sx}px; --sy: ${sy}px; --sr: ${sr}deg;
                    animation: shatter-piece ${dur}s ease-out forwards;
                    opacity: 0.9;
                `;
                document.body.appendChild(frag);
                setTimeout(() => frag.remove(), dur * 1000 + 50);
            }
        },

        // 🎴 Piocher une carte depuis le deck
        // 🔍 Scanner un adversaire
        // 🎬 Actions Bar — état d'une action
        getActionState(action) {
            const c = this.collect;
            if (!c.showCenterSlot) return '';
            // Pas mon tour → tout en default dimmed
            if (!c.isMyTurn) return 'idle';
            // Action réalisée
            if (c.lastAction === action) {
                return c.actionTriggered ? 'active triggered' : 'used';
            }
            // Une autre action a été réalisée (ou carte jouée/validée)
            if (c.lastAction || c.cardPlayed) return 'locked';
            // Disponible
            return 'available';
        },

        // 🎬 Monte la barre d'actions sur document.body (hors stacking context)
        mountActionsBar() {
            if (document.getElementById('collectActionsBarBody')) return;
            const ACTIONS = [
                { action: 'draw', icon: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 12h6M12 9v6"/>', name: 'Draw', desc: 'Piocher une carte' },
                { action: 'swap', icon: '<path d="M7 16l-4-4 4-4"/><path d="M3 12h14"/><path d="M17 8l4 4-4 4"/><path d="M21 12H7"/>', name: 'Swap', desc: 'Échanger au marché' },
                { action: 'scan', icon: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>', name: 'Scan', desc: 'Voir les cartes adverses' },
                { action: 'throw', icon: '<path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7"/><path d="M10 11v6M14 11v6M3 7h18M8 7V4a1 1 0 011-1h6a1 1 0 011 1v3"/>', name: 'Throw', desc: 'Défausser une carte' },
                { action: 'duel', icon: '<path d="M12 3L4 7v5c0 5.25 3.4 10.15 8 11.25C16.6 22.15 20 17.25 20 12V7l-8-4z" fill="none"/><path d="M12 8v5M10 15l2-2 2 2"/>', name: 'Duel', desc: 'Défier un adversaire' },
                { action: 'thief', icon: '<path d="M9 5l1-1h4l1 1"/><path d="M6 9a3 3 0 013-3h6a3 3 0 013 3v2"/><path d="M5 14l1-3h12l1 3"/><path d="M7 21v-4a2 2 0 012-2h6a2 2 0 012 2v4"/><path d="M12 11v4"/>', name: 'Thief', desc: 'Voler une carte', crowns: 2 }
            ];
            const bar = document.createElement('div');
            bar.id = 'collectActionsBarBody';
            bar.className = 'collect-actions-bar';
            bar.innerHTML = ACTIONS.map(a => {
                const crowns = a.crowns ? `<div class="actbar-req">${'<div class="actbar-crown"><svg viewBox="0 0 24 24"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z"/></svg></div>'.repeat(a.crowns)}</div>` : '';
                return `<div class="act-bar-item act-${a.action}" data-action="${a.action}">
                    <div class="actbar-icon"><svg viewBox="0 0 24 24">${a.icon}</svg></div>
                    <div class="actbar-text"><span class="actbar-name">${a.name}</span><span class="actbar-desc">${a.desc}</span></div>
                    ${crowns}
                </div>`;
            }).join('');
            document.body.appendChild(bar);
            this.updateActionsBar();
        },

        // 🎬 Update les classes de chaque item
        updateActionsBar() {
            const bar = document.getElementById('collectActionsBarBody');
            if (!bar) return;
            // Visible?
            if (this.collect.showCenterSlot) {
                bar.classList.add('visible');
            } else {
                bar.classList.remove('visible');
            }
            ['draw','swap','scan','throw','duel','thief'].forEach(action => {
                const el = bar.querySelector(`[data-action="${action}"]`);
                if (!el) return;
                el.classList.remove('idle','available','active','triggered','used','locked');
                const state = this.getActionState(action);
                if (state) state.split(' ').forEach(s => el.classList.add(s));
            });
        },

        // 🎬 Détruire la barre
        destroyActionsBar() {
            const bar = document.getElementById('collectActionsBarBody');
            if (bar) bar.remove();
        },

        // 🎬 Trigger l'effet premium sur la barre
        triggerActionBar(action) {
            this.collect.lastAction = action;
            this.collect.actionTriggered = true;
            this.updateActionsBar();
            
            // Spawn JS effects
            this.$nextTick(() => {
                const el = document.querySelector(`.act-bar-item[data-action="${action}"]`);
                if (el) this.spawnActionBarEffects(el, action);
            });
            
            // Remove triggered after animation
            setTimeout(() => {
                this.collect.actionTriggered = false;
                this.updateActionsBar();
            }, 1000);
        },

        // 🎬 Effets JS — particules + shockwave + screen flash
        spawnActionBarEffects(el, action) {
            const COLORS = {
                draw:  { r: 59, g: 130, b: 246 },
                swap:  { r: 168, g: 85, b: 247 },
                scan:  { r: 0, g: 200, b: 255 },
                throw: { r: 249, g: 115, b: 22 },
                duel:  { r: 234, g: 179, b: 8 },
                thief: { r: 239, g: 68, b: 68 }
            };
            const color = COLORS[action] || COLORS.draw;
            const c = `rgba(${color.r},${color.g},${color.b}`;
            
            // Shockwave rings
            for (let i = 0; i < 2; i++) {
                setTimeout(() => {
                    const ring = document.createElement('div');
                    ring.className = 'actbar-trigger-ring';
                    ring.style.color = c + `,${i === 0 ? 0.6 : 0.3})`;
                    if (i === 1) ring.style.animationDuration = '0.85s';
                    el.appendChild(ring);
                    setTimeout(() => ring.remove(), 900);
                }, i * 100);
            }
            
            // Particles
            const iconEl = el.querySelector('.actbar-icon');
            if (iconEl) {
                const rect = iconEl.getBoundingClientRect();
                const elRect = el.getBoundingClientRect();
                const ox = rect.left - elRect.left + rect.width / 2;
                const oy = rect.top - elRect.top + rect.height / 2;
                
                for (let i = 0; i < 8; i++) {
                    const p = document.createElement('div');
                    p.className = 'actbar-particle';
                    const angle = (Math.PI * 2 / 8) * i + (Math.random() - 0.5) * 0.6;
                    const dist = 25 + Math.random() * 40;
                    const size = 2.5 + Math.random() * 2.5;
                    p.style.left = ox + 'px';
                    p.style.top = oy + 'px';
                    p.style.width = size + 'px';
                    p.style.height = size + 'px';
                    p.style.setProperty('--px', (Math.cos(angle) * dist) + 'px');
                    p.style.setProperty('--py', (Math.sin(angle) * dist) + 'px');
                    p.style.setProperty('--dur', (0.4 + Math.random() * 0.3) + 's');
                    p.style.background = c + ',0.9)';
                    p.style.boxShadow = `0 0 6px ${c},0.6)`;
                    el.appendChild(p);
                    setTimeout(() => p.remove(), 800);
                }
            }
            
            // Screen flash
            const flash = document.createElement('div');
            flash.className = 'actbar-screen-flash';
            flash.style.background = `radial-gradient(ellipse at 90% 5%, ${c},0.15) 0%, transparent 50%)`;
            document.body.appendChild(flash);
            setTimeout(() => flash.remove(), 500);
        },

        scanPlayer(player) {
            // Vérifier que c'est mon tour et que je n'ai pas déjà joué
            if (!this.collect.isMyTurn || this.collect.cardPlayed || this.collect.timerExpired) return;
            if (!player || !player.twitchId || player.twitchId === this.twitchId) return;
            // Pas de scan pendant un scan actif
            if (this.collect.scanActive) return;
            
            console.log(`🔍 Scan de ${player.username}`);
            this.socket.emit('collect-scan-player', {
                twitchId: this.twitchId,
                targetId: player.twitchId
            });
        },

        drawFromDeck() {
            if (this._drawAnimBusy) return;
            
            // Main pleine ?
            if (this.collect.myCards.length >= this.collect.handSize) {
                if (this.collect.deckFullFlash) return; // Anti-spam
                this.collect.deckFullFlash = true;
                setTimeout(() => { this.collect.deckFullFlash = false; }, 1200);
                return;
            }
            
            if (!this.collect.canDraw) return;
            this._drawAnimBusy = true;

            // Émettre au serveur (l'animation est gérée au retour par draw-result)
            this.socket.emit('collect-draw-card', { twitchId: this.twitchId });
            
            this.collect.canDraw = false;
            this.triggerActionBar('draw');
            this.saveCollectState();

            setTimeout(() => { this._drawAnimBusy = false; }, 1200);
        },

        // 🎴 Animation carte volant du deck vers la main
        animateDrawToHand(card, deckEl) {
            const topCard = deckEl.querySelector('.collect-deck-card:nth-child(1)');
            if (!topCard) {
                this.collect.myCards.push(card);
                this.saveCollectState();
                return;
            }
            
            const topRect = topCard.getBoundingClientRect();
            topCard.style.visibility = 'hidden';
            
            // Créer le clone volant
            const flyer = document.createElement('div');
            flyer.className = 'draw-card-flyer';
            
            flyer.innerHTML = `
                <div class="draw-card-flyer-inner">
                    <div class="draw-card-flyer-back">
                        <div class="flyer-back-pattern"></div>
                        <span class="flyer-back-sm">SM</span>
                    </div>
                    <div class="draw-card-flyer-front">
                        <div class="card-image">
                            <img src="${this.getCardImage(card)}" alt="${card.name}">
                        </div>
                        <div class="flyer-class-badge ${card.class}">
                            <span class="class-icon">${this.getClassIcon(card.class)}</span>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(flyer);
            
            flyer.style.left = topRect.left + 'px';
            flyer.style.top = topRect.top + 'px';
            flyer.style.width = topRect.width + 'px';
            flyer.style.height = topRect.height + 'px';
            
            // Calculer destination (main du joueur)
            const handContainer = document.querySelector('.collect-my-cards');
            let endX, endY, endW, endH;
            if (handContainer) {
                const handCards = handContainer.querySelectorAll('.collect-card');
                if (handCards.length > 0) {
                    const lastCard = handCards[handCards.length - 1];
                    const lastRect = lastCard.getBoundingClientRect();
                    endW = lastRect.width;
                    endH = lastRect.height;
                    endX = lastRect.right + 8;
                    endY = lastRect.top;
                } else {
                    const handRect = handContainer.getBoundingClientRect();
                    endW = 130;
                    endH = 185;
                    endX = handRect.left + handRect.width / 2 - endW / 2;
                    endY = handRect.top + handRect.height / 2 - endH / 2;
                }
            } else {
                endW = 130;
                endH = 185;
                endX = window.innerWidth / 2 - endW / 2;
                endY = window.innerHeight - 280;
            }
            
            flyer.getBoundingClientRect();
            
            const flyDuration = 600;
            
            // Vol
            flyer.animate([
                { left: topRect.left + 'px', top: topRect.top + 'px', width: topRect.width + 'px', height: topRect.height + 'px' },
                { left: endX + 'px', top: endY + 'px', width: endW + 'px', height: endH + 'px' }
            ], { duration: flyDuration, easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)', fill: 'forwards' });
            
            // Flip
            const inner = flyer.querySelector('.draw-card-flyer-inner');
            inner.animate([
                { transform: 'rotateY(0deg)' },
                { transform: 'rotateY(180deg)' }
            ], { duration: flyDuration, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' });
            
            // FLIP: décaler les cartes pendant le vol
            setTimeout(() => {
                const oldPositions = new Map();
                if (handContainer) {
                    handContainer.querySelectorAll('.collect-card').forEach((el, i) => {
                        oldPositions.set(i, el.getBoundingClientRect());
                    });
                }
                
                // Ajouter la carte (Vue re-render)
                this.collect.myCards.push(card);
                this.saveCollectState();
                
                // Après le re-render Vue
                this.$nextTick(() => {
                    if (handContainer) {
                        const newCards = handContainer.querySelectorAll('.collect-card');
                        const newCard = newCards[newCards.length - 1];
                        if (newCard) newCard.style.opacity = '0';
                        
                        // FLIP existantes
                        newCards.forEach((el, i) => {
                            const oldRect = oldPositions.get(i);
                            if (!oldRect) return;
                            const newRect = el.getBoundingClientRect();
                            const dx = oldRect.left - newRect.left;
                            if (Math.abs(dx) > 1) {
                                el.animate([
                                    { transform: `translateX(${dx}px)` },
                                    { transform: 'translateX(0)' }
                                ], { duration: 350, easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)', composite: 'add' });
                            }
                        });
                    }
                });
            }, 200);
            
            // Fin: révéler la nouvelle carte
            setTimeout(() => {
                flyer.remove();
                topCard.style.visibility = '';
                this.$nextTick(() => {
                    if (handContainer) {
                        const allCards = handContainer.querySelectorAll('.collect-card');
                        const lastCard = allCards[allCards.length - 1];
                        if (lastCard) {
                            lastCard.style.opacity = '';
                            lastCard.classList.add('draw-new-card');
                            lastCard.addEventListener('animationend', () => lastCard.classList.remove('draw-new-card'), { once: true });
                        }
                    }
                });
            }, flyDuration + 30);
        },

        // 🎴 Particules bleues de pioche
        spawnDrawParticles(deckEl) {
            const rect = deckEl.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height * 0.3;
            
            for (let i = 0; i < 12; i++) {
                const p = document.createElement('div');
                p.className = 'draw-particle';
                const angle = (Math.random() - 0.5) * 1.8;
                const dist = 40 + Math.random() * 80;
                const tx = Math.sin(angle) * dist;
                const ty = -(30 + Math.random() * 60);
                const size = 3 + Math.random() * 4;
                const dur = 0.5 + Math.random() * 0.4;
                const delay = Math.random() * 0.15;
                p.style.cssText = `
                    left: ${cx}px; top: ${cy}px;
                    width: ${size}px; height: ${size}px;
                    --tx: ${tx}px; --ty: ${ty}px;
                    animation: draw-particle-fly ${dur}s ${delay}s ease-out forwards;
                `;
                document.body.appendChild(p);
                setTimeout(() => p.remove(), (dur + delay) * 1000 + 50);
            }
        },

        // 🎴 Choisir une carte parmi les 2 piochées
        pickDrawCard(index) {
            if (this.collect.drawPicked !== null) return; // Déjà choisi
            this.collect.drawPicked = index;
            
            // Envoyer le choix au serveur
            this.socket.emit('collect-draw-choice', { 
                twitchId: this.twitchId, 
                choiceIndex: index 
            });
            
            // Fermer l'overlay après animation
            setTimeout(() => {
                this.collect.drawCardsRevealed = false;
                setTimeout(() => {
                    this.collect.drawChoiceVisible = false;
                    this.collect.drawOptions = [];
                    this.collect.drawPicked = null;
                }, 400);
            }, 600);
        },


    },


}).mount('#app');
// =============================================
// ⭐ COLLECT VALIDATION EFFECTS
// =============================================

const STAR_SVG_HTML = '<svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';

function collectValidationFlash(cx, cy, isCollect) {
    const el = document.createElement('div');
    el.className = 'collect-validation-flash';
    el.style.setProperty('--cx', cx + 'px');
    el.style.setProperty('--cy', cy + 'px');
    document.body.appendChild(el);
    void el.offsetWidth;
    el.classList.add(isCollect ? 'collect-flash' : 'lien-flash');
    setTimeout(() => el.remove(), isCollect ? 800 : 550);
    
    if (isCollect) {
        const el2 = document.createElement('div');
        el2.className = 'collect-validation-flash';
        el2.style.setProperty('--cx', cx + 'px');
        el2.style.setProperty('--cy', cy + 'px');
        document.body.appendChild(el2);
        void el2.offsetWidth;
        el2.classList.add('lien-flash');
        setTimeout(() => el2.remove(), 550);
    }
}

function collectShake(isCollect) {
    const container = document.querySelector('.collect-table') || document.body;
    container.style.animation = 'none';
    void container.offsetWidth;
    container.style.animation = isCollect ? 'collect-shake-b 0.4s ease-out' : 'collect-shake-a 0.3s ease-out';
    setTimeout(() => { container.style.animation = ''; }, isCollect ? 400 : 300);
}

function collectShatterCard(cardEl, cx, cy, isCollect) {
    if (!cardEl) return;
    const rect = cardEl.getBoundingClientRect();
    const cols = 4, rows = 5;
    const fragW = rect.width / cols;
    const fragH = rect.height / rows;
    
    // Get images from the card
    const imgs = cardEl.querySelectorAll('img');
    const imgSrcs = Array.from(imgs).map(i => i.src);
    const imgCount = imgSrcs.length || 1;
    
    cardEl.style.display = 'none';
    cardEl.style.visibility = 'hidden';
    cardEl.style.pointerEvents = 'none';
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const frag = document.createElement('div');
            const fragLeft = rect.left + c * fragW;
            const fragTop = rect.top + r * fragH;
            
            const imgIdx = Math.min(Math.floor(c / (cols / imgCount)), imgCount - 1);
            const imgLeft = rect.left + (imgIdx * rect.width / imgCount);
            const imgWidth = rect.width / imgCount;
            
            frag.style.cssText = `position:fixed;left:${fragLeft}px;top:${fragTop}px;width:${fragW}px;height:${fragH}px;background-image:url(${imgSrcs[imgIdx] || ''});background-size:${imgWidth}px ${rect.height}px;background-position:${-(fragLeft-imgLeft)}px ${-(r*fragH)}px;pointer-events:none;z-index:9004;border-radius:2px;will-change:transform,opacity;`;
            document.body.appendChild(frag);
            
            const fcx = fragLeft + fragW/2;
            const fcy = fragTop + fragH/2;
            const angle = Math.atan2(fcy - cy, fcx - cx);
            const dist = (isCollect ? 55 : 40) + Math.random() * (isCollect ? 50 : 35);
            const tx = Math.cos(angle) * dist + (Math.random()-0.5) * 25;
            const ty = Math.sin(angle) * dist + (Math.random()-0.5) * 25;
            const rot = (Math.random()-0.5) * 280;
            const dur = 600 + Math.random() * 350;
            const delay = Math.random() * 50;
            
            frag.animate([
                { transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: 1, filter: 'brightness(1)' },
                { transform: 'translate(0,0) rotate(0deg) scale(1.02)', opacity: 1, filter: 'brightness(3)', offset: 0.1 },
                { transform: `translate(${tx*0.5}px,${ty*0.5}px) rotate(${rot*0.4}deg) scale(0.7)`, opacity: 0.8, filter: 'brightness(1.8)', offset: 0.4 },
                { transform: `translate(${tx}px,${ty}px) rotate(${rot}deg) scale(0.15)`, opacity: 0, filter: 'brightness(1.2)' }
            ], { duration: dur, delay, easing: 'cubic-bezier(0.25, 0.6, 0.35, 1)', fill: 'forwards' });
            
            setTimeout(() => frag.remove(), dur + delay + 30);
        }
    }
    
    // Core flash
    const core = document.createElement('div');
    const coreSize = isCollect ? 90 : 65;
    core.style.cssText = `position:fixed;left:${cx-coreSize/2}px;top:${cy-coreSize/2}px;width:${coreSize}px;height:${coreSize}px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,0.95) 0%,rgba(255,255,255,0.5) 25%,${isCollect?'rgba(255,100,0,0.25)':'rgba(251,191,36,0.25)'} 55%,transparent 100%);pointer-events:none;z-index:9005;will-change:transform,opacity;`;
    document.body.appendChild(core);
    core.animate([
        { transform: 'scale(0.3)', opacity: 0 },
        { transform: 'scale(1)', opacity: 1, offset: 0.2 },
        { transform: 'scale(1.6)', opacity: 0 }
    ], { duration: isCollect ? 350 : 300, easing: 'ease-out', fill: 'forwards' });
    setTimeout(() => core.remove(), isCollect ? 380 : 330);
}

function collectBurstParticles(cx, cy, isCollect) {
    const goldColors = ['#fbbf24','#f59e0b','#ffd700','#ffe066','#ffaa00'];
    const fireColors = ['#ff6b35','#ff4500','#fbbf24','#ff8c00','#ffcc00','#ff3d00'];
    const colors = isCollect ? fireColors : goldColors;

    // Spiral particles
    const count = isCollect ? 80 : 55;
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        const startAngle = (i / count) * Math.PI * 2 + (Math.random()-0.5) * 0.5;
        const dist = (isCollect ? 70 : 50) + Math.random() * (isCollect ? 90 : 65);
        const size = 2 + Math.random() * (isCollect ? 5 : 4);
        const dur = 500 + Math.random() * 400;
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        const spin = (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 1.2);
        const steps = 5;
        const keyframes = [];
        for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const r = dist * t;
            const a = startAngle + spin * t;
            keyframes.push({
                transform: `translate(${Math.cos(a)*r}px,${Math.sin(a)*r}px) scale(${1 - t*0.8})`,
                opacity: s === 0 ? 1 : (s < steps ? 0.85 : 0),
                offset: t
            });
        }

        p.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;width:${size}px;height:${size}px;background:${color};box-shadow:0 0 ${size*2}px ${color};border-radius:50%;pointer-events:none;z-index:9002;will-change:transform,opacity;`;
        document.body.appendChild(p);
        p.animate(keyframes, { duration: dur, easing: 'cubic-bezier(0.1, 0.6, 0.3, 1)', fill: 'forwards' });
        setTimeout(() => p.remove(), dur + 30);
    }

    // Fast sparks
    const sparkCount = isCollect ? 30 : 20;
    for (let i = 0; i < sparkCount; i++) {
        const p = document.createElement('div');
        const startAngle = Math.random() * Math.PI * 2;
        const dist = (isCollect ? 100 : 75) + Math.random() * 50;
        const size = 1.5 + Math.random() * 2.5;
        const dur = 350 + Math.random() * 250;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const spin = (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.8);
        
        const mid = { r: dist * 0.5, a: startAngle + spin * 0.5 };
        const end = { r: dist, a: startAngle + spin };

        p.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;width:${size}px;height:${size}px;background:#fff;box-shadow:0 0 ${size*3}px ${color}, 0 0 ${size*5}px ${color};border-radius:50%;pointer-events:none;z-index:9003;will-change:transform,opacity;`;
        document.body.appendChild(p);
        p.animate([
            { transform: 'translate(0,0)', opacity: 1 },
            { transform: `translate(${Math.cos(mid.a)*mid.r}px,${Math.sin(mid.a)*mid.r}px)`, opacity: 0.8, offset: 0.4 },
            { transform: `translate(${Math.cos(end.a)*end.r}px,${Math.sin(end.a)*end.r}px)`, opacity: 0 }
        ], { duration: dur, easing: 'cubic-bezier(0.1, 0.7, 0.3, 1)', fill: 'forwards' });
        setTimeout(() => p.remove(), dur + 30);
    }

    // Twinkles
    const twinkleCount = isCollect ? 14 : 8;
    for (let i = 0; i < twinkleCount; i++) {
        const delay = 100 + Math.random() * 200;
        setTimeout(() => {
            const sp = document.createElement('div');
            const angle = Math.random() * Math.PI * 2;
            const dist = 25 + Math.random() * (isCollect ? 90 : 65);
            const size = 2 + Math.random() * 3;
            const color = colors[Math.floor(Math.random() * colors.length)];
            sp.style.cssText = `position:fixed;left:${cx + Math.cos(angle)*dist}px;top:${cy + Math.sin(angle)*dist}px;width:${size}px;height:${size}px;background:#fff;border-radius:50%;pointer-events:none;z-index:9003;box-shadow:0 0 ${size*2}px ${color}, 0 0 ${size*4}px ${color};animation:collect-sparkle-twinkle 0.35s ease-out forwards;will-change:transform,opacity;`;
            document.body.appendChild(sp);
            setTimeout(() => sp.remove(), 400);
        }, delay);
    }
}

function collectFlyStar(fromX, fromY, targetStarEl, delay) {
    if (!targetStarEl) return;
    setTimeout(() => {
        const target = targetStarEl.getBoundingClientRect();
        const tx = target.left + target.width/2;
        const ty = target.top + target.height/2;
        
        const flyer = document.createElement('div');
        flyer.className = 'collect-star-flyer';
        flyer.innerHTML = STAR_SVG_HTML;
        flyer.style.left = (fromX - 12) + 'px';
        flyer.style.top = (fromY - 12) + 'px';
        document.body.appendChild(flyer);

        // Trail particles
        const trail = setInterval(() => {
            const fr = flyer.getBoundingClientRect();
            const s = 2 + Math.random() * 4;
            const tp = document.createElement('div');
            tp.style.cssText = `position:fixed;left:${fr.left+fr.width/2+(Math.random()-0.5)*8}px;top:${fr.top+fr.height/2+(Math.random()-0.5)*8}px;width:${s}px;height:${s}px;background:#fbbf24;border-radius:50%;pointer-events:none;z-index:8999;box-shadow:0 0 5px #fbbf24;transition:all 0.3s ease-out;opacity:0.7;`;
            document.body.appendChild(tp);
            requestAnimationFrame(() => {
                tp.style.opacity = '0';
                tp.style.transform = `translate(${(Math.random()-0.5)*14}px,${6+Math.random()*10}px) scale(0.1)`;
            });
            setTimeout(() => tp.remove(), 350);
        }, 25);

        const dur = 420;
        flyer.animate([
            { left: (fromX-12)+'px', top: (fromY-12)+'px', transform: 'scale(1.2)', filter: 'drop-shadow(0 0 12px rgba(251,191,36,1))' },
            { left: (tx-12)+'px', top: (ty-12)+'px', transform: 'scale(0.5)', filter: 'drop-shadow(0 0 5px rgba(251,191,36,0.4))' }
        ], { duration: dur, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' });

        setTimeout(() => {
            clearInterval(trail);
            flyer.remove();
            collectLandStar(targetStarEl);
        }, dur);
    }, delay);
}

function collectLandStar(starEl) {
    if (!starEl) return;
    starEl.classList.add('won', 'star-landing');

    // Burst rays
    const wrap = document.createElement('div');
    wrap.className = 'collect-star-burst-wrap';
    for (let i = 0; i < 10; i++) {
        const ray = document.createElement('div');
        ray.className = 'collect-sbr';
        ray.style.cssText = `transform:translateX(-50%) rotate(${i*36}deg);animation-delay:${i*0.025}s;`;
        wrap.appendChild(ray);
    }
    starEl.style.position = 'relative';
    starEl.appendChild(wrap);

    // Mini sparkles
    const sr = starEl.getBoundingClientRect();
    const scx = sr.left + sr.width/2, scy = sr.top + sr.height/2;
    for (let i = 0; i < 8; i++) {
        const a = (i/8) * Math.PI * 2, d = 8 + Math.random() * 12;
        const sp = document.createElement('div');
        sp.style.cssText = `position:fixed;left:${scx}px;top:${scy}px;width:3px;height:3px;background:#fbbf24;border-radius:50%;box-shadow:0 0 4px #fbbf24;pointer-events:none;z-index:9001;transition:all 0.3s ease-out;`;
        document.body.appendChild(sp);
        requestAnimationFrame(() => { sp.style.left = (scx+Math.cos(a)*d)+'px'; sp.style.top = (scy+Math.sin(a)*d)+'px'; sp.style.opacity = '0'; });
        setTimeout(() => sp.remove(), 350);
    }

    setTimeout(() => { starEl.classList.remove('star-landing'); wrap.remove(); }, 800);
}

/**
 * Main orchestrator: runs the full validation effect sequence
 * @param {Element} cardEl - The center card element to shatter
 * @param {Element[]} targetStarEls - Array of star elements to fly to (1 for Lien, 2 for Collect)
 * @param {boolean} isCollect - true for Collect (3-card fusion), false for Lien (2-card)
 */
function collectValidationEffect(cardEl, targetStarEls, isCollect) {
    if (!cardEl) return;
    const rect = cardEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // Immediate: flash + shake + shatter + particles
    collectValidationFlash(cx, cy, isCollect);
    collectShake(isCollect);
    collectShatterCard(cardEl, cx, cy, isCollect);
    collectBurstParticles(cx, cy, isCollect);

    // Delayed: star flight(s)
    const starDelay = 300;
    if (targetStarEls && targetStarEls.length > 0) {
        collectFlyStar(cx, cy, targetStarEls[0], starDelay);
        if (targetStarEls.length > 1) {
            collectFlyStar(cx, cy, targetStarEls[1], starDelay + 250);
        }
    }
}

/**
 * Animate a card-back flying from a player's seat to the center slot
 */
function animateCardToSlot(seatEl, slotEl, duration, onComplete, keepAlive) {
    // Source: center of player's hand
    const smallCards = seatEl.querySelectorAll('.collect-player-card-small');
    if (!smallCards.length) { if (onComplete) onComplete(); return; }
    
    // Calculate center of all small cards
    const firstRect = smallCards[0].getBoundingClientRect();
    const lastRect = smallCards[smallCards.length - 1].getBoundingClientRect();
    const fromCx = (firstRect.left + lastRect.right) / 2;
    const fromCy = (firstRect.top + lastRect.bottom) / 2;
    const fromW = firstRect.width;
    const fromH = firstRect.height;
    const toRect = slotEl.getBoundingClientRect();
    
    // Create card-back flyer
    const flyer = document.createElement('div');
    flyer.className = 'collect-card-flight-flyer';
    flyer.style.cssText = `
        position:fixed; z-index:8500; pointer-events:none;
        width:${fromW}px; height:${fromH}px;
        left:${fromCx - fromW / 2}px; top:${fromCy - fromH / 2}px;
        background: linear-gradient(135deg, #1a1a3e 0%, #0d0d2b 100%);
        border: 1.5px solid rgba(255,255,255,0.15);
        border-radius: 4px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.5);
        will-change: transform, left, top, width, height;
    `;
    // SM text on back
    const label = document.createElement('span');
    label.textContent = 'SM';
    label.style.cssText = `
        position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
        font-family:Orbitron,sans-serif; font-size:9px; font-weight:700;
        color:rgba(255,255,255,0.2); letter-spacing:2px;
    `;
    flyer.appendChild(label);
    document.body.appendChild(flyer);
    
    // Target: center of slot
    const endW = Math.min(fromW * 1.2, toRect.width * 0.6);
    const endH = endW * (fromH / fromW);
    const endX = toRect.left + toRect.width / 2 - endW / 2;
    const endY = toRect.top + toRect.height / 2 - endH / 2;
    
    const startX = fromCx - fromW / 2;
    const startY = fromCy - fromH / 2;
    
    flyer.animate([
        { left: startX + 'px', top: startY + 'px', width: fromW + 'px', height: fromH + 'px', opacity: 1 },
        { left: endX + 'px', top: endY + 'px', width: endW + 'px', height: endH + 'px', opacity: 0.7 }
    ], { duration: duration, easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)', fill: 'forwards' });
    
    setTimeout(() => {
        if (!keepAlive) flyer.remove();
        if (onComplete) onComplete(flyer);
    }, duration);
}