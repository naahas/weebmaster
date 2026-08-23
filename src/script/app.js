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

            // 🆕 v2 — Accueil : choix du mode, création / jointure de salon
            modes: [
                // `plain: true` = illustration sans fond transparent : elle est alors
                // cadrée dans le panneau au lieu de flotter comme un personnage détouré.
                { id: 'classic',   name: 'Classique', kind: 'Solo ou équipes', players: '∞',  img: 'lambo2.png',
                  desc: "Quiz QCM. Solo ou en deux camps, vies ou points, séries au choix." },
                { id: 'bombanime', name: 'BombAnime', kind: 'Solo',   players: '13', img: 'lambo2.png',
                  desc: "La bombe tourne. Cite un perso avant qu'elle explose." },
                // 🧪 Modes fictifs : uniquement pour juger la mise en page à l'échelle
                { id: 'ascension', name: 'Ascension', kind: 'Solo',   players: '∞',  img: 'lambo2.png', soon: true,
                  desc: "Grimpe la tour, un mini-jeu différent à chaque étage." },
                { id: 'duel',      name: 'Duel',      kind: '1 v 1',  players: '2',  img: 'lambo2.png', soon: true,
                  desc: "Face à face en une manche. Un seul survivant." },
                { id: 'tournoi',   name: 'Tournoi',   kind: 'Bracket', players: '32', img: 'lambo2.png', soon: true,
                  desc: "Élimination directe jusqu'à la finale." },
                { id: 'blindtest', name: 'Blind test', kind: 'Solo',  players: '∞',  img: 'lambo2.png', soon: true,
                  desc: "Reconnais l'opening en quelques secondes." },
                { id: 'chrono',    name: 'Chrono',    kind: 'Solo',   players: '∞',  img: 'lambo2.png', soon: true,
                  desc: "Le plus de bonnes réponses en soixante secondes." },
            ],
            selectedMode: localStorage.getItem('lastMode') || 'classic',
            hoverMode: null,   // survol temporaire ; le clic verrouille selectedMode
            showSettings: true,
            autoMode: false,
            nextQuestionBusy: false,
            answerCounts: {},
            // Repères des réponses : une forme et une couleur, pas de lettre
            answerMarks: ['◆', '●', '▲', '■', '★', '⬢'],
            lobbyPlayers: [],
            answersCount: 4,
            questionsCount: 20,
            difficultyMode: 'croissante',
            serieFilter: 'tout',
            noSpoil: false,
            serieFilters: [
                { id: 'tout', name: 'Tout' },
                { id: 'big3', name: 'Big 3' },
                { id: 'mainstream', name: 'Mainstream' },
                { id: 'onepiece', name: 'One Piece' },
                { id: 'naruto', name: 'Naruto' },
                { id: 'dragonball', name: 'Dragon Ball' },
                { id: 'bleach', name: 'Bleach' },
            ],
            bombanimeSeries: ['Naruto', 'OnePiece', 'Dbz', 'Bleach', 'Hxh', 'Snk', 'DemonSlayer', 'JujutsuKaisen', 'FairyTail', 'Mha', 'BlackClover', 'Jojo'],
            homeScreen: 'hub',    // hub | modes | join
            editingPseudo: false,
            hubHover: null,
            homeStats: { playersOnline: 0, activeRooms: 0, questionsCount: 0, gamesPlayed: 0, recentGames: [] },
            homeStatsTimer: null,
            creatingRoom: false,
            createError: '',
            joinCode: '',
            joinShake: false,
            joinError: '',
            roomCode: localStorage.getItem('roomCode') || null,
            codeCopied: false,
            isHost: localStorage.getItem('isHost') === 'true',
            startingGame: false,
            hostError: '',

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
            campsAvant: { 1: 0, 2: 0 }, // score des camps avant la question qui vient de tomber
            campsProg: 1,               // avancement du remplissage des barres (0 → 1)
            campDetail: null,           // camp dont on regarde le détail au classement final
            rangDelta: 0,               // places gagnées (+) ou perdues (-) à la dernière question
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
            lifeLost: null,   // index du cœur en train de se briser
            displayedPoints: 0,   // valeur affichée, qui rattrape le score réel en s'animant
            pointsDelta: 0,       // gain affiché brièvement au-dessus du compteur
            pointsPulse: false,
            speedBonus: true,     // +500 points au plus rapide, en mode points
            showQuestionStats: false,  // feuille de détail de la question (hôte)
            showTopSheet: false,       // classement en calque, sur petit écran
            endStep: 0,                // 0→4 : avancement de la révélation finale
            showReport: false,         // modale de signalement d'une question
            reportPicked: [],          // plusieurs motifs peuvent se cumuler
            reportBusy: false,
            reportDone: false,         // confirmation affichée avant la fermeture
            reportError: false,
            reportReasons: [
                { v: 'Augmenter difficulté', l: 'Augmenter la difficulté' },
                { v: 'Baisser difficulté', l: 'Baisser la difficulté' },
                { v: 'Corriger question / reponses', l: 'Corriger la question ou les réponses' },
                { v: 'Changer bonne réponse', l: 'Changer la bonne réponse' },
                { v: 'Reformuler', l: 'Reformuler la question' },
                { v: 'Doublon', l: 'Enlever un doublon' },
                { v: 'Marquer spoil', l: 'Marquer comme spoil' },
            ],
            confirmAction: null,       // 'close' (hôte) ou 'leave' (invité)
            ringSweep: 0,              // 0 → 1 : remplissage de l'anneau à l'ouverture
            answerColors: ['#ffd24a', '#7fb4ff', '#6ee7b7', '#d8b4fe', '#fca5a5', '#fdba74'],
            notifs: [],           // messages passagers, en haut de l'écran
            teamsBusy: false,     // bascule solo / équipes en cours
            shuffleBusy: false,
            tabConflict: false,   // un autre onglet du même navigateur tient déjà la partie
            booting: true,        // tant que l'état serveur n'est pas connu, on n'affiche aucun écran
            questionShown: false, // passe à vrai quand le premier panel de question est visible

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
            comboPhase: '',   // '' | 'up' | 'flush' | 'reset' — étapes du passage de palier



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

    created() {
        // Hors de data : un simple compteur n a pas à être réactif
        this._notifSeq = 0;
    },

    async mounted() {
        // 🆕 v2 : les stats en premier — elles ne doivent dépendre de rien d'autre
        this.loadHomeStats();
        this.homeStatsTimer = setInterval(() => {
            if (!this.gameInProgress && !this.hasJoined) this.loadHomeStats();
        }, 20000);

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
        // L'état du serveur est connu : on peut choisir quel écran montrer.
        // Sans ça, l'accueil apparaissait une fraction de seconde avant la partie.
        this.booting = false;

        this.preloadModeArt();
        this.initParticles();
        this.initCursorDust();
        this.initSocket();
        await this.initTabGuard();
        if (!this.tabConflict) this.socket.connect();
        
        // 🆕 Restaurer l'équipe sélectionnée après refresh
        const savedTeam = localStorage.getItem('selectedTeam');
        if (savedTeam) {
            this.selectedTeam = parseInt(savedTeam);
        }

        document.addEventListener('visibilitychange', () => {
            // Un onglet mis en retrait ne doit surtout pas rouvrir sa socket :
            // il relancerait le va-et-vient avec l'onglet actif.
            if (this.tabConflict) return;
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

        // 🆕 v2 — mode actuellement sélectionné sur l'accueil
        // Le survol prévisualise, le clic verrouille : en sortant de la liste on
        // revient au mode verrouillé.
        serieFilterName() {
            const f = this.serieFilters.find(x => x.id === this.serieFilter);
            return f ? f.name : 'Tout';
        },

        // Le serveur refuse en dessous de 2 joueurs : on grise plutot que d avertir
        canStart() {
            if (this.playerCount < 2) return false;
            // En camps, un côté vide fait échouer le démarrage côté serveur
            if (this.lobbyMode === 'rivalry') {
                const c = this.campsRemplis;
                if (!c[1] || !c[2]) return false;
            }
            return true;
        },

        campsRemplis() {
            const c = { 1: 0, 2: 0 };
            (this.lobbyPlayers || []).forEach(p => { if (p.team === 1 || p.team === 2) c[p.team]++; });
            return c;
        },

        // Les deux camps du salon, pour que l'hôte voie l'équilibre avant de lancer
        campsDuSalon() {
            const c = this.campsRemplis;
            return [1, 2].map(t => ({ team: t, nom: this.teamNames[t], n: c[t] }));
        },

        startTitle() {
            if (this.playerCount < 2) return 'Il faut au moins 2 joueurs';
            if (this.lobbyMode === 'rivalry') {
                const c = this.campsRemplis;
                if (!c[1] || !c[2]) return 'Chaque camp doit avoir au moins un joueur';
            }
            return 'Démarrer la partie';
        },

        modeLabel() {
            // 'rivalry' n'est plus un mode mais un réglage du quiz : le badge ne
            // le trouvait pas dans la liste et retombait sur « Salon ».
            if (this.lobbyMode === 'rivalry') return 'Classique';
            const m = this.modes.find(x => x.id === this.lobbyMode);
            return m ? m.name : 'Classique';
        },

        currentMode() {
            const id = this.hoverMode || this.selectedMode;
            return this.modes.find(m => m.id === id) || this.modes[0];
        },

        // 🎌 Au moins une ligne de suggestion non vide
        hasValidPlayerSuggestions() {
            if (!this.bombanime || !Array.isArray(this.bombanime.suggestionLines)) return false;
            return this.bombanime.suggestionLines.some(l => (l || '').trim().length > 0);
        },

        // Au moins 1 streamer est en live
        formattedPlayerPoints() {
            return this.playerPoints.toLocaleString('fr-FR');
        },

        // Le compteur du HUD suit la valeur animée, pas le score brut
        formattedPoints() {
            return this.displayedPoints.toLocaleString('fr-FR');
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
        myEndRank() {
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
            if (this.comboLevel >= 3) return 100; // Palier maximum : la jauge reste pleine, en rouge

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

        // Largeur de l'arête : les étapes du palier priment sur la progression
        comboEdgeWidth() {
            if (this.comboPhase === 'up' || this.comboPhase === 'flush') return 100;
            if (this.comboPhase === 'reset') return 0;
            return this.comboBarHeight;
        },

        // ── Classement de fin de question ──
        // En points on trie sur le score, en vies sur les vies puis les bonnes réponses.
        rankedPlayers() {
            const liste = (this.questionResults.players || []).slice();
            if (this.gameMode === 'points') {
                liste.sort((a, b) => (b.points || 0) - (a.points || 0) || (b.correctAnswers || 0) - (a.correctAnswers || 0));
            } else {
                liste.sort((a, b) => (b.lives || 0) - (a.lives || 0) || (b.correctAnswers || 0) - (a.correctAnswers || 0));
            }
            return liste;
        },

        topPlayers() {
            return this.rankedPlayers.slice(0, 3);
        },

        myLiveRank() {
            const i = this.rankedPlayers.findIndex(p => p.twitchId === this.twitchId);
            return i === -1 ? 0 : i + 1;
        },

        // Éliminé mais toujours là : il regarde la partie se terminer sans lui
        estSpectateur() {
            return this.gameMode === 'lives' && this.hasJoined && this.playerLives <= 0;
        },

        // Combien tiennent encore debout, à l'arrivée des résultats
        encoreEnVie() {
            const r = this.questionResults.remainingPlayers;
            return typeof r === 'number' ? r : null;
        },

        // Ce que porte le panneau de droite : les camps, le classement de
        // l'hôte, ou la course du joueur. Rien s'il n'y a rien à montrer.
        panneauLateral() {
            if (!this.showResults || this.lobbyMode === 'bombanime') return null;
            if (this.lobbyMode === 'rivalry') return 'camps';
            if (this.isHost) return 'top';
            return this.mesStats ? 'moi' : null;
        },

        // Ma ligne dans les résultats de la question qui vient de tomber
        moiEnJeu() {
            return (this.questionResults.players || []).find(p => p.twitchId === this.twitchId) || null;
        },

        // Le joueur ne voit plus le classement : il voit sa propre place, et
        // de combien elle a bougé. Le reste lui apprendrait celle des autres.
        mesStats() {
            const moi = this.moiEnJeu;
            if (!moi) return null;
            return { rang: this.myLiveRank, delta: this.rangDelta };
        },

        successRate() {
            const s = this.questionResults.stats || {};
            const total = (s.correct || 0) + (s.wrong || 0) + (s.afk || 0);
            return total ? Math.round((s.correct || 0) / total * 100) : 0;
        },

        // Le chiffre du centre suit le tracé de l'anneau
        sweptRate() {
            return Math.round(this.successRate * this.ringSweep);
        },

        fastestTime() {
            const f = this.questionResults.fastestPlayer;
            return f ? (f.time / 1000).toFixed(1).replace('.', ',') : '';
        },

        // Répartition par réponse, dans les couleurs des repères du panel
        answerBreakdown() {
            if (!this.currentQuestion) return [];
            const joueurs = this.questionResults.players || [];
            return this.currentQuestion.answers.map((texte, i) => ({
                i,
                label: texte,
                color: this.answerColors[i],
                count: joueurs.filter(p => p.selectedAnswer === texte).length,
                juste: this.questionResults.correctAnswer === i + 1
            }));
        },

        // Anneau composé : une part par réponse, plus les absents en gris
        ringGradient() {
            const parts = this.answerBreakdown.map(a => ({ n: a.count, c: a.color }));
            parts.push({ n: (this.questionResults.stats || {}).afk || 0, c: 'rgba(255,255,255,0.18)' });
            const total = parts.reduce((s, p) => s + p.n, 0);
            const vide = 'rgba(255,255,255,0.07)';
            if (!total) return vide;

            // Le balayage dessine l'anneau à l'ouverture ; au-delà, c'est du vide
            const arc = 360 * this.ringSweep;
            let acc = 0;
            const stops = [];
            for (const p of parts) {
                const de = acc / total * 360;
                acc += p.n;
                const a = acc / total * 360;
                if (de >= arc) break;
                stops.push(`${p.c} ${de}deg ${Math.min(a, arc)}deg`);
            }
            if (arc < 360) stops.push(`${vide} ${arc}deg 360deg`);
            return `conic-gradient(${stops.join(',')})`;
        },

        confirmTitle() {
            if (this.confirmAction === 'leave') return this.gameInProgress ? 'Quitter la partie ?' : 'Quitter le salon ?';
            return this.gameInProgress ? 'Arrêter la partie ?' : 'Fermer le salon ?';
        },

        confirmText() {
            if (this.confirmAction === 'leave') {
                return this.gameInProgress
                    ? 'Tu sors de la partie en cours. Tu pourras revenir avec le code du salon.'
                    : 'Tu quittes le salon. Tu pourras y revenir avec son code.';
            }
            return this.gameInProgress
                ? "La partie s'arrête tout de suite et tout le monde est renvoyé à l'accueil."
                : 'Le salon est fermé et les joueurs présents en sont sortis.';
        },

        confirmLabel() {
            if (this.confirmAction === 'leave') return 'Quitter';
            return this.gameInProgress ? 'Arrêter' : 'Fermer';
        },

        // Le camp du joueur : la liste du salon fait foi, la valeur locale dépanne
        monCamp() {
            if (this.lobbyMode !== 'rivalry') return null;
            // En jeu la liste du salon peut dater : les résultats font alors foi
            const listes = [
                (this.questionResults && this.questionResults.playersData) || [],
                this.lobbyPlayers || [],
            ];
            for (const l of listes) {
                const moi = l.find(p => p.twitchId === this.twitchId);
                if (moi && moi.team) return moi.team;
            }
            return this.selectedTeam || null;
        },

        // Les deux camps, du mieux placé au moins bien, avec leur part relative
        campsClasses() {
            const s = (this.questionResults && this.questionResults.teamScores) || this.teamScores || {};
            const total = (s[1] || 0) + (s[2] || 0);
            const p = this.campsProg;
            // Le classement suit le score final : sans ça les deux camps
            // permuteraient en plein milieu du remplissage.
            const camps = [1, 2].map(t => {
                const cible = s[t] || 0;
                const avant = this.campsAvant[t] || 0;
                return {
                    team: t,
                    nom: this.teamNames[t],
                    fin: cible,
                    score: Math.round(avant + (cible - avant) * p),
                    part: (total ? (cible / total * 100) : 50) * p,
                };
            }).sort((a, b) => b.fin - a.fin);
            camps.forEach((c, i) => { c.tete = i === 0 && camps[0].fin !== camps[1].fin; });
            return camps;
        },

        // Le joueur ne voit que son camp : les deux scores côte à côte
        // en diraient trop sur l'issue. L'hôte, lui, arbitre.
        campsAffiches() {
            if (this.isHost || !this.monCamp) return this.campsClasses;
            return this.campsClasses.filter(c => c.team === this.monCamp);
        },

        // Fin de partie en camps : les trois meilleurs de chaque côté
        campsPodium() {
            if (!this.gameEndData || !this.estFinEnCamps) return [];
            const parPoints = this.trioEnPoints;
            const tous = this.gameEndData.playersData || [];
            const scores = this.gameEndData.teamScores || {};
            const noms = this.gameEndData.teamNames || this.teamNames;

            return [1, 2].map(t => ({
                team: t,
                nom: noms[t],
                score: scores[t] || 0,
                joueurs: tous
                    .filter(p => p.team === t)
                    .sort((a, b) => parPoints
                        ? (b.points || 0) - (a.points || 0)
                        : (b.lives || 0) - (a.lives || 0) || (b.correctAnswers || 0) - (a.correctAnswers || 0))
                    .slice(0, 3)
                    .map((p, i) => ({
                        rang: i + 1,
                        username: p.username,
                        twitchId: p.twitchId,
                        valeur: parPoints ? this.formatScore(p.points || 0) : (p.lives || 0),
                    })),
            })).sort((a, b) => b.score - a.score);
        },

        // Aux points on affiche le score, aux vies le nombre de coeurs restants
        trioEnPoints() {
            return !!this.gameEndData && this.gameEndData.gameMode === 'rivalry-points';
        },

        // Tous les joueurs d'un camp, pour le détail ouvert depuis le podium
        campDetailListe() {
            if (!this.campDetail || !this.gameEndData) return [];
            const parPoints = this.trioEnPoints;
            return (this.gameEndData.playersData || [])
                .filter(p => p.team === this.campDetail)
                .sort((a, b) => parPoints
                    ? (b.points || 0) - (a.points || 0)
                    : (b.lives || 0) - (a.lives || 0) || (b.correctAnswers || 0) - (a.correctAnswers || 0))
                .map((p, i) => ({
                    rang: i + 1,
                    username: p.username,
                    twitchId: p.twitchId,
                    points: p.points || 0,
                    lives: p.lives || 0,
                    bonnes: p.correctAnswers || 0,
                }));
        },

        campDetailNom() {
            if (!this.campDetail) return '';
            const noms = (this.gameEndData && this.gameEndData.teamNames) || this.teamNames;
            return noms[this.campDetail];
        },

        estFinEnCamps() {
            const m = this.gameEndData && this.gameEndData.gameMode;
            return m === 'rivalry-lives' || m === 'rivalry-points';
        },

        // Six places au plus : au-delà, la liste déborderait en vertical
        endRows() {
            return this.podiumPlayers.slice(0, 6);
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
        // Un calque ouvert efface les icônes fixées à la racine : leur z-index
        // les placerait sinon au-dessus du voile, qui vit dans le panel.
        showTopSheet(ouvert) { this.marquerCalque(ouvert || this.showQuestionStats); },
        showQuestionStats(ouvert) { this.marquerCalque(ouvert || this.showTopSheet); },

        // Points gagnés : le compteur rattrape le score en s'animant, le gain s'envole
        playerPoints(neuf, ancien) {
            if (neuf === ancien) return;
            if (neuf < ancien) { this.displayedPoints = neuf; return; }  // remise à zéro de partie
            // Restauration après refresh : on cale la valeur sans animer ni sonner
            if (!this.questionShown) { this.displayedPoints = neuf; return; }

            this.pointsDelta = neuf - ancien;
            this.pointsPulse = true;
            this.playPointsSound();
            this.tweenPoints(ancien, neuf, 700);

            clearTimeout(this._ptsTimer);
            this._ptsTimer = setTimeout(() => {
                this.pointsPulse = false;
                this.pointsDelta = 0;
            }, 950);
        },

        // Une vie perdue : le cœur correspondant se brise avant de s'éteindre
        playerLives(neuf, ancien) {
            if (neuf >= ancien) return;
            this.lifeLost = ancien;
            this.$nextTick(() => this.playLifeLostEffect(ancien));
            clearTimeout(this._timerVie);
            this._timerVie = setTimeout(() => { this.lifeLost = null; }, 700);
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
        // 🆕 v2 : identité invité. Un pseudo est attribué automatiquement à l'arrivée —
        // le joueur peut le changer d'un clic en haut à droite, jamais bloqué par un formulaire.
        async checkAuth() {
            let playerId = localStorage.getItem('playerId');
            let name = localStorage.getItem('pseudo');

            if (!playerId) {
                playerId = this.makePlayerId();
                localStorage.setItem('playerId', playerId);
            }
            if (!name) {
                name = this.randomPseudo();
                localStorage.setItem('pseudo', name);
            }

            this.twitchId = playerId;
            this.username = name;
            this.pseudoInput = name;
            this.isAuthenticated = true;
            this.homeScreen = 'hub';

            if (this.socket && this.socket.connected) {
                this.socket.emit('register-authenticated', {
                    twitchId: this.twitchId,
                    username: this.username
                });
            }
        },

        makePlayerId() {
            return crypto.randomUUID
                ? crypto.randomUUID()
                : 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2);
        },

        // Pseudo auto : un mot du folklore anime + un nombre
        randomPseudo() {
            const words = [
                'Shinobi', 'Kitsune', 'Senpai', 'Hokage', 'Samurai', 'Ronin', 'Yokai', 'Nakama',
                'Katana', 'Ramen', 'Kaiju', 'Otaku', 'Sensei', 'Onigiri', 'Mecha', 'Tanuki',
                'Bushido', 'Shogun', 'Kunai', 'Sakura', 'Tengu', 'Oni', 'Zanpakuto', 'Haki',
            ];
            const word = words[Math.floor(Math.random() * words.length)];
            return word + Math.floor(10 + Math.random() * 990);
        },

        rerollPseudo() {
            this.pseudoInput = this.randomPseudo();
            this.pseudoError = '';
        },

        cancelPseudoEdit() {
            this.editingPseudo = false;
            this.pseudoError = '';
            this.pseudoInput = this.username;
        },

        reloadHome() {
            window.location.reload();
        },

        // 🆕 v2 : valide le pseudo saisi et ouvre la session invité
        // ========== 🆕 v2 — Accueil : salons ==========

        // ✨ Traînée de poussière dorée qui suit la souris (accueil uniquement)
        initCursorDust() {
            let last = 0;
            document.addEventListener('mousemove', (e) => {
                if (this.gameInProgress || this.hasJoined) return;
                const now = Date.now();
                if (now - last < 42) return;   // ~24 particules/s : assez dense, sans saturer le DOM
                last = now;

                const dust = document.createElement('div');
                dust.className = 'v2-dust';
                dust.style.left = e.clientX + 'px';
                dust.style.top = e.clientY + 'px';
                const size = 0.22 + Math.random() * 0.35;
                dust.style.width = size + 'rem';
                dust.style.height = size + 'rem';
                dust.style.setProperty('--dx', (Math.random() * 1.2 - 0.6).toFixed(2) + 'rem');
                document.body.appendChild(dust);
                setTimeout(() => dust.remove(), 760);
            }, { passive: true });
        },

        async loadHomeStats() {
            try {
                const res = await fetch('/api/home-stats');
                if (res.ok) this.homeStats = await res.json();
            } catch (e) { /* silencieux : l'accueil reste utilisable sans les stats */ }
        },

        editPseudo() {
            this.pseudoInput = this.username;
            this.pseudoError = '';
            this.editingPseudo = true;
            this.$nextTick(() => this.$refs.pseudoField?.select());
        },

        // L'hôte ouvre un salon dans le mode sélectionné, puis le rejoint.
        async createRoom() {
            if (this.currentMode.soon) {
                this.createError = 'Ce mode arrive bientôt';
                return;
            }

            if (this.creatingRoom) return;
            this.creatingRoom = true;
            this.createError = '';

            try {
                if (this.isGameActive) {
                    this.createError = 'Un salon est déjà ouvert — rejoins-le avec son code.';
                    return;
                }

                localStorage.setItem('lastMode', this.selectedMode);

                const res = await fetch('/admin/toggle-game', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lobbyMode: this.selectedMode }),
                });
                const data = await res.json();

                if (!data.isActive) {
                    this.createError = "Le salon n'a pas pu être ouvert.";
                    return;
                }

                this.isHost = true;
                localStorage.setItem('isHost', 'true');
                this.lobbyMode = this.selectedMode;
                await this.fetchRoomCode();

                // En Rivalité l'hôte choisit d'abord son camp dans le salon
                if (this.selectedMode !== 'rivalry') {
                    this.socket.emit('join-lobby', {
                        twitchId: this.twitchId,
                        username: this.username,
                        isHost: true,
                    });
                    this.hasJoined = true;
                    localStorage.setItem('hasJoinedLobby', 'true');
                    localStorage.setItem('lobbyTwitchId', this.twitchId);
                }
            } catch (e) {
                this.createError = 'Erreur de connexion au serveur.';
            } finally {
                this.creatingRoom = false;
            }
        },

        async fetchRoomCode() {
            try {
                const res = await fetch('/admin/game-state');
                const data = await res.json();
                if (data.roomCode) {
                    this.roomCode = data.roomCode;
                    localStorage.setItem('roomCode', data.roomCode);
                }
            } catch (e) { /* le code reste affiché vide, sans bloquer */ }
        },

        // Les illustrations sont lourdes : on les met en cache avant le premier survol
        preloadModeArt() {
            this.modes.forEach(m => { const i = new Image(); i.src = m.img; });
        },

        // Tous les réglages passent par la même route POST, avec application
        // optimiste côté client et retour arrière si le serveur refuse.
        async applySetting(url, payload, apply) {
            const avant = JSON.parse(JSON.stringify({
                gameMode: this.gameMode, gameLives: this.gameLives, gameTime: this.gameTime,
                answersCount: this.answersCount, questionsCount: this.questionsCount,
                difficultyMode: this.difficultyMode, serieFilter: this.serieFilter,
                noSpoil: this.noSpoil, bonusEnabled: this.bonusEnabled,
            }));
            apply();
            this.hostError = '';

            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                const data = await res.json();
                if (!res.ok || data.error) throw new Error(data.error || 'Réglage refusé');
            } catch (e) {
                Object.assign(this, avant);
                this.hostError = e.message;
            }
        },

        addFakePlayers(count) {
            if (this.socket) this.socket.emit('dev-add-fake-players', { count });
        },

        clearFakePlayers() {
            if (this.socket) this.socket.emit('dev-clear-fake-players');
        },

        // Contrôles de l'hôte pendant la partie (ex-panel /admin)
        openReport() {
            this.reportPicked = [];
            this.reportDone = false;
            this.showReport = true;
        },

        toggleReason(v) {
            const i = this.reportPicked.indexOf(v);
            if (i === -1) this.reportPicked.push(v);
            else this.reportPicked.splice(i, 1);
        },

        async sendReport() {
            if (!this.reportPicked.length || !this.currentQuestion || this.reportBusy) return;
            this.reportBusy = true;
            try {
                const res = await fetch('/admin/report-question', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        questionId: this.currentQuestion.questionId,
                        questionText: this.currentQuestion.question,
                        difficulty: this.currentQuestion.difficulty,
                        // La colonne est un texte libre : on joint les motifs par une
                        // barre, qui n'apparaît dans aucun d'eux.
                        reason: this.reportPicked.join(' | '),
                    }),
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                // La modale affiche la confirmation un instant avant de se retirer
                this.reportDone = true;
                setTimeout(() => { this.showReport = false; this.reportDone = false; }, 900);
            } catch (e) {
                this.reportError = true;
                setTimeout(() => { this.reportError = false; }, 2500);
            } finally {
                this.reportBusy = false;
            }
        },

        // Le 3e apparaît d'abord, puis le 2e, puis le vainqueur, puis le reste
        ouvrirCamp(team) { this.campDetail = team; },

        // Le trio d'un camp, accroché sous sa ligne au classement final
        crewOf(team) {
            const c = this.campsPodium.find(x => x.team === team);
            return c ? c.joueurs : [];
        },

        endSlot(rang) {
            if (rang === 3) return 1;
            if (rang === 2) return 2;
            if (rang === 1) return 3;
            return 4;
        },

        // Le mode Vies affiche des cœurs : ce calcul ne sert plus qu'aux points
        endScore(p) {
            return (p.points || 0).toLocaleString('fr-FR');
        },

        // Enchaînement de la révélation, avec les éclats et les confettis
        startEndReveal() {
            clearTimeout(this._endT1); clearTimeout(this._endT2);
            clearTimeout(this._endT3); clearTimeout(this._endT4);
            this.endStep = 0;
            // 0,3 s de plus entre chaque place : le suspense tenait trop court
            this._endT1 = setTimeout(() => { this.endStep = 1; }, 500);
            this._endT2 = setTimeout(() => { this.endStep = 2; }, 1700);
            this._endT3 = setTimeout(() => {
                this.endStep = 3;
                this.$nextTick(() => this.celebrerVainqueur());
            }, 3000);
            this._endT4 = setTimeout(() => { this.endStep = 4; }, 4200);
        },

        celebrerVainqueur() {
            const zone = document.querySelector('.v2-end');
            if (!zone) return;

            const eclat = document.createElement('span');
            eclat.className = 'v2-end-eclat';
            zone.appendChild(eclat);
            setTimeout(() => eclat.remove(), 1100);

            const couleurs = ['#FFD700', '#FF8C00', '#ffffff', '#7fb4ff', '#6ee7b7', '#d8b4fe'];
            const nb = window.innerWidth < 768 ? 45 : 80;
            for (let i = 0; i < nb; i++) {
                const c = document.createElement('span');
                c.className = 'v2-end-confetti';
                c.style.left = (Math.random() * 100) + '%';
                c.style.background = couleurs[(Math.random() * couleurs.length) | 0];
                c.style.setProperty('--dx', ((Math.random() - 0.5) * 14) + 'rem');
                c.style.setProperty('--rot', ((Math.random() - 0.5) * 1200) + 'deg');
                c.style.setProperty('--d', (1.7 + Math.random() * 1.5).toFixed(2) + 's');
                c.style.animationDelay = (Math.random() * 0.5).toFixed(2) + 's';
                if (Math.random() > 0.6) { c.style.width = '0.5rem'; c.style.height = '0.5rem'; c.style.borderRadius = '50%'; }
                zone.appendChild(c);
                setTimeout(() => c.remove(), 3800);
            }
        },

        // ── Un seul onglet actif ──
        // Le serveur n'accepte qu'une socket par joueur : un second onglet ferait
        // tomber le premier, qui se reconnecterait et ferait tomber le second.
        // On tranche donc côté client : un onglet joue, les autres attendent.
        async initTabGuard() {
            if (typeof BroadcastChannel === 'undefined') return;
            this._tabId = Math.random().toString(36).slice(2);
            this._canal = new BroadcastChannel('shonenmaster');

            this._canal.onmessage = (e) => {
                const m = e.data || {};
                if (m.de === this._tabId) return;

                // Un nouvel onglet se signale : si on tient la partie, on le lui dit
                if (m.type === 'bonjour' && !this.tabConflict) {
                    this._canal.postMessage({ type: 'occupe', de: this._tabId });
                }
                // Quelqu'un d'autre tient déjà la partie : on se met en retrait
                if (m.type === 'occupe') { this._libre = false; if (!this.tabConflict) this.cederOnglet(); }
                // L'onglet actif se ferme : on regarde s'il reste quelqu'un
                if (m.type === 'depart' && this.tabConflict) this.reprendreSiLibre();
            };

            // En partant, l'onglet actif libère la place pour ceux qui attendent
            window.addEventListener('pagehide', () => {
                if (!this.tabConflict && this._canal) {
                    this._canal.postMessage({ type: 'depart', de: this._tabId });
                }
            });

            this._canal.postMessage({ type: 'bonjour', de: this._tabId });
            // Court délai d'écoute : s'il y a déjà un onglet actif, il répond ici
            await new Promise(r => setTimeout(r, 220));
        },

        cederOnglet() {
            this.tabConflict = true;
            // Le serveur ne voit qu'une socket par joueur : ni doublon, ni
            // va-et-vient entre deux onglets qui se reprennent l'entrée.
            if (this.socket && this.socket.connected) this.socket.disconnect();
        },

        // L'autre onglet s'est fermé : si plus personne ne répond, on recharge.
        // Un rechargement complet vaut mieux qu'une reprise à chaud — l'état
        // repart propre, sans reconnexion partielle à rattraper.
        reprendreSiLibre() {
            this._libre = true;
            this._canal.postMessage({ type: 'bonjour', de: this._tabId });
            clearTimeout(this._timerLibre);
            this._timerLibre = setTimeout(() => {
                if (this._libre) window.location.reload();
            }, 400);
        },

        marquerCalque(ouvert) {
            document.body.classList.toggle('v2-sheet-open', !!ouvert);
        },

        // Cœurs et jetons rejoignent le panel au lieu de le précéder.
        // Le retard reprend le délai de .v2q-enter-active : les deux vont de pair.
        revealQuestionChrome() {
            if (this.questionShown) return;
            clearTimeout(this._chromeTimer);
            this._chromeTimer = setTimeout(() => { this.questionShown = true; }, 800);
        },

        // L'anneau se trace d'un trait à l'ouverture de la feuille
        sweepRing() {
            cancelAnimationFrame(this._ringRaf);
            this.ringSweep = 0;
            const debut = performance.now();
            const duree = 650;
            const pas = (t) => {
                const p = Math.min(1, (t - debut) / duree);
                this.ringSweep = 1 - Math.pow(1 - p, 3);   // sortie douce
                if (p < 1) this._ringRaf = requestAnimationFrame(pas);
            };
            this._ringRaf = requestAnimationFrame(pas);
        },

        // Les barres de camp se remplissent pendant que les scores grimpent
        remplirCamps(nouveaux) {
            cancelAnimationFrame(this._campsRaf);
            this.campsAvant = { ...this.teamScores };
            this.teamScores = { 1: nouveaux[1] || 0, 2: nouveaux[2] || 0 };
            this.campsProg = 0;
            const debut = performance.now();
            const duree = 700;
            const pas = (t) => {
                const p = Math.min(1, (t - debut) / duree);
                this.campsProg = 1 - Math.pow(1 - p, 3);   // sortie douce
                if (p < 1) this._campsRaf = requestAnimationFrame(pas);
            };
            this._campsRaf = requestAnimationFrame(pas);
        },

        openQuestionStats() {
            this.showQuestionStats = true;
            this.$nextTick(() => this.sweepRing());
        },

        // Le repère de la réponse choisie : la couleur suffit, le libellé serait trop long
        answerIndexOf(p) {
            if (!p || !p.selectedAnswer || !this.currentQuestion) return -1;
            return this.currentQuestion.answers.indexOf(p.selectedAnswer);
        },

        tagSymbol(p) {
            const i = this.answerIndexOf(p);
            return i === -1 ? '×' : this.answerMarks[i];
        },

        tagClass(p) {
            const i = this.answerIndexOf(p);
            if (i === -1) return 'afk';
            return ['m' + i, this.questionResults.correctAnswer === i + 1 ? 'juste' : ''];
        },

        scoreOf(p) {
            return this.gameMode === 'points' ? (p.points || 0) : (p.correctAnswers || 0);
        },

        formatScore(n) {
            return (n || 0).toLocaleString('fr-FR');
        },

        // Part des joueurs ayant choisi cette réponse (affichée aux résultats)
        answerPercent(n) {
            const total = Object.values(this.answerCounts).reduce((s, v) => s + v, 0);
            if (!total) return 0;
            return Math.round(((this.answerCounts[n] || 0) / total) * 100);
        },

        async hostNextQuestion() {
            if (this.nextQuestionBusy) return;
            this.nextQuestionBusy = true;
            this.hostError = '';

            // La question sort dès le clic : sans ça on attendrait l'aller-retour
            // serveur et la requête Supabase avant de voir quoi que ce soit bouger.
            const sortante = this.currentQuestion;
            const resultatsSortants = this.showResults;
            this.currentQuestion = null;
            this.showResults = false;

            try {
                const res = await fetch('/admin/next-question', { method: 'POST' });
                const data = await res.json();
                if (data.error) {
                    this.hostError = data.error;
                    // Refus du serveur : on remet la question en place
                    this.currentQuestion = sortante;
                    this.showResults = resultatsSortants;
                }
            } catch (e) {
                this.hostError = 'Erreur de connexion';
                this.currentQuestion = sortante;
                this.showResults = resultatsSortants;
            } finally {
                setTimeout(() => { this.nextQuestionBusy = false; }, 600);
            }
        },

        async hostToggleAuto() {
            this.hostError = '';
            try {
                const res = await fetch('/admin/toggle-auto-mode', { method: 'POST' });
                const data = await res.json();
                if (data.autoMode !== undefined) this.autoMode = data.autoMode;
            } catch (e) {
                this.hostError = 'Erreur de connexion';
            }
        },

        leaveRoom() {
            if (this.socket) {
                this.socket.emit('leave-lobby', { twitchId: this.twitchId, username: this.username });
            }
            this.hasJoined = false;
            this.selectedTeam = null;
            this.roomCode = null;

            // Partir en pleine partie laissait l'écran de jeu à l'affiche, figé :
            // on démonte tout ce que game-deactivated démonterait.
            this.gameInProgress = false;
            this.gameStartedOnServer = false;
            this.gameEnded = false;
            this.currentQuestion = null;
            this.currentQuestionNumber = 0;
            this.selectedAnswer = null;
            this.hasAnswered = false;
            this.showResults = false;
            this.questionShown = false;
            this.showTopSheet = false;
            this.showQuestionStats = false;
            this.stopTimer();
            this.clearSeal();
            this.resetComboSystem();
            document.body.classList.remove('game-active');
            localStorage.removeItem('hasJoinedLobby');
            localStorage.removeItem('lobbyTwitchId');
            localStorage.removeItem('selectedTeam');
            localStorage.removeItem('roomCode');
            this.homeScreen = 'hub';
            this.loadHomeStats();
        },

        hostKick(twitchId) {
            if (!this.socket) return;
            const cible = this.lobbyPlayers.find(p => p.twitchId === twitchId);
            this.socket.emit('kick-player', { twitchId, username: cible ? cible.username : undefined });
        },

        lockMode(id) {
            this.selectedMode = id;
            this.hoverMode = null;
            localStorage.setItem('lastMode', id);
        },

        // Un appui sur l'un des deux choix : une onde part du point touché et le
        // bloc s'enfonce, puis on navigue. Le court délai laisse voir l'effet,
        // qui disparaîtrait aussitôt avec le changement d'écran.
        pressChoice(event, quoi) {
            const b = event.currentTarget;
            if (b) {
                const r = b.getBoundingClientRect();
                const onde = document.createElement('span');
                onde.className = 'v2-choice-ripple';
                onde.style.left = (event.clientX ? event.clientX - r.left : r.width / 2) + 'px';
                onde.style.top = (event.clientY ? event.clientY - r.top : r.height / 2) + 'px';
                b.appendChild(onde);
                setTimeout(() => onde.remove(), 700);

                if (b.animate) {
                    b.animate(
                        [{ transform: 'scale(1)' }, { transform: 'scale(0.972)', offset: 0.4 }, { transform: 'scale(1)' }],
                        { duration: 280, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)' }
                    );
                }
            }
            setTimeout(() => {
                if (quoi === 'create') this.goToModes();
                else this.openJoin();
            }, 190);
        },

        goToModes() {
            this.createError = '';
            this.homeScreen = 'modes';
        },

        // Code refusé : une secousse rouge vaut mieux qu'un message
        signalJoinError(message) {
            this.joinError = message || '';
            this.joinShake = false;
            this.$nextTick(() => {
                this.joinShake = true;
                setTimeout(() => { this.joinShake = false; }, 600);
            });
        },

        openJoin() {
            this.joinError = '';
            this.joinCode = '';
            this.homeScreen = 'join';
            // Le curseur se pose tout de suite : sur mobile le clavier s'ouvre avec
            this.$nextTick(() => this.$refs.codeInput && this.$refs.codeInput.focus());
        },

        joinRoom(team) {
            const code = (this.joinCode || '').trim().toUpperCase();

            if (code.length < 4) {
                this.signalJoinError('Code à 4 caractères');
                return;
            }
            if (!this.isGameActive) {
                this.signalJoinError('Aucun salon ouvert pour le moment');
                return;
            }

            // En v2 on entre sans camp : c'est l'hôte qui répartit ensuite.

            if (team) this.selectedTeam = team;
            sessionStorage.removeItem('wasKicked');
            this.joinError = '';

            this.socket.emit('join-lobby', {
                twitchId: this.twitchId,
                username: this.username,
                code,
                team: this.lobbyMode === 'rivalry' ? this.selectedTeam : null,
            });

            // Le serveur répond par 'player-joined'/'lobby-update' en cas de succès,
            // ou par 'error' (badCode) — géré dans le handler 'error'.
            this.pendingJoinCode = code;
            setTimeout(() => {
                if (this.pendingJoinCode === code && !this.joinError) {
                    this.hasJoined = true;
                    this.roomCode = code;
                    // Une fois entré, l'accueil derrière repasse au hub : quand le salon
                    // se fermera, on ne retombera pas sur l'écran du code.
                    this.homeScreen = 'hub';
                    localStorage.setItem('roomCode', code);
                    localStorage.setItem('hasJoinedLobby', 'true');
                    localStorage.setItem('lobbyTwitchId', this.twitchId);
                }
            }, 450);
        },

        copyRoomCode() {
            if (!this.roomCode) return;
            navigator.clipboard?.writeText(this.roomCode);
            this.codeCopied = true;
            setTimeout(() => { this.codeCopied = false; }, 1500);
        },

        async hostStartGame() {
            if (this.startingGame) return;
            this.startingGame = true;
            this.hostError = '';
            try {
                const res = await fetch('/admin/start-game', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                });
                const data = await res.json();
                if (!data.success) this.hostError = data.error || 'Démarrage impossible';
            } catch (e) {
                this.hostError = 'Erreur de connexion au serveur.';
            } finally {
                this.startingGame = false;
            }
        },

        // Passer le salon en équipes ou revenir en solo, sans le refermer
        async setTeams(enabled) {
            if (this.teamsBusy) return;
            this.teamsBusy = true;
            this.hostError = '';
            try {
                const res = await fetch('/admin/set-teams', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ enabled }),
                });
                const data = await res.json();
                if (data.error) this.hostError = data.error;
                else this.lobbyMode = data.lobbyMode;
            } catch (e) {
                this.hostError = 'Erreur de connexion';
            } finally {
                this.teamsBusy = false;
            }
        },

        // L'hôte place un joueur dans un camp, ou l'en retire
        async setPlayerTeam(twitchId, team) {
            this.hostError = '';
            try {
                const res = await fetch('/admin/set-player-team', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ twitchId, team }),
                });
                const data = await res.json();
                if (data.error) { this.hostError = data.error; return; }
                this.appliquerCamps([{ twitchId: data.twitchId, team: data.team }]);
            } catch (e) {
                this.hostError = 'Erreur de connexion';
            }
        },

        // Recopie une répartition dans la liste affichée
        appliquerCamps(couples) {
            (couples || []).forEach(({ twitchId, team }) => {
                const cible = this.lobbyPlayers.find(p => p.twitchId === twitchId);
                if (cible) cible.team = team;
                if (twitchId === this.twitchId) this.selectedTeam = team;
            });
        },

        // Répartition au hasard, à un joueur près
        async shuffleTeams() {
            if (this.shuffleBusy) return;
            this.shuffleBusy = true;
            this.hostError = '';
            try {
                const res = await fetch('/admin/shuffle-teams', { method: 'POST' });
                const data = await res.json();
                if (data.error) this.hostError = data.error;
                else this.appliquerCamps(data.teams);
            } catch (e) {
                this.hostError = 'Erreur de connexion';
            } finally {
                setTimeout(() => { this.shuffleBusy = false; }, 400);
            }
        },

        askCloseRoom() { this.confirmAction = 'close'; },
        askLeaveRoom() { this.confirmAction = 'leave'; },

        confirmProceed() {
            const action = this.confirmAction;
            this.confirmAction = null;
            if (action === 'close') this.hostCloseRoom();
            else if (action === 'leave') this.leaveRoom();
        },

        async hostCloseRoom() {
            this.confirmAction = null;
            try {
                await fetch('/admin/toggle-game', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                });
            } catch (e) { /* le serveur émet game-deactivated de toute façon */ }
            this.quitterSalonLocalement();
        },

        // Tout ce qui rattache le navigateur à un salon, remis à zéro d'un bloc.
        // Sans hasJoined ni isGameActive, on retombait sur l'écran d'attente de
        // l'invité, et la création suivante était refusée pour un salon déjà fermé.
        quitterSalonLocalement() {
            this.isHost = false;
            this.roomCode = null;
            this.hasJoined = false;
            this.isGameActive = false;
            this.shouldRejoinLobby = false;
            this.selectedTeam = null;
            this.homeScreen = 'hub';
            localStorage.removeItem('isHost');
            localStorage.removeItem('roomCode');
            localStorage.removeItem('hasJoinedLobby');
            localStorage.removeItem('lobbyTwitchId');
            localStorage.removeItem('selectedTeam');
            this.loadHomeStats();
        },

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
                playerId = this.makePlayerId();
                localStorage.setItem('playerId', playerId);
            }
            localStorage.setItem('pseudo', name);

            this.twitchId = playerId;
            this.username = name;
            this.isAuthenticated = true;
            this.editingPseudo = false;

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
                if (state.speedBonus !== undefined) {
                    this.speedBonus = state.speedBonus;
                }

                if (state.lives) this.gameLives = state.lives;
                if (state.questionTime) this.gameTime = state.questionTime;
                if (state.questionsCount) this.totalQuestions = state.questionsCount;
                if (state.answersCount) this.answersCount = state.answersCount;
                if (state.questionsCount) this.questionsCount = state.questionsCount;
                if (state.difficultyMode) this.difficultyMode = state.difficultyMode;
                if (state.serieFilter) this.serieFilter = state.serieFilter;
                if (state.noSpoil !== undefined) this.noSpoil = state.noSpoil;
                if (state.autoMode !== undefined) this.autoMode = state.autoMode;
                if (state.players) this.lobbyPlayers = state.players;

                this.gameStartedOnServer = state.inProgress;

                if (!state.isActive) {
                    localStorage.removeItem('hasJoinedLobby');
                    localStorage.removeItem('lobbyTwitchId');
                    localStorage.removeItem('selectedTeam');
                    localStorage.removeItem('teamCooldownEnd');

                    // 🔧 Le salon n'existe plus (serveur redémarré, salon fermé) : sans ce
                    // reset, un ancien isHost/roomCode cachait à la fois l'accueil et le
                    // salon, et la page restait vide.
                    this.hasJoined = false;
                    this.isHost = false;
                    this.roomCode = null;
                    this.selectedTeam = null;
                    this.homeScreen = 'hub';
                    localStorage.removeItem('isHost');
                    localStorage.removeItem('roomCode');

                    console.log('🧹 État local nettoyé (aucun salon actif)');
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
                    this.revealQuestionChrome();

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
                } else if (bonusType === 'shield' || bonusType === 'doublex2') {
                    this.marquerJeton(bonusType);
                }
            }, 100);
        },

        // ========== Socket.IO ==========
        initSocket() {
            this.socket = io({ autoConnect: false });
            
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
                // Reste de la v1 : le joueur choisissait son camp, donc pas de camp
                // sauvegardé = pas de rejointure. En v2 c'est l'hôte qui répartit, et
                // ce garde-fou faisait sortir du salon quiconque rafraîchissait sa page
                // en mode équipes — l'hôte compris.
                if (this.shouldRejoinLobby && this.isGameActive && !this.gameInProgress && !wasKicked) {
                    this.socket.emit('join-lobby', {
                        twitchId: this.twitchId,
                        username: this.username,
                    });
                    this.shouldRejoinLobby = false;
                    console.log('✅ Re-jointure automatique du lobby après refresh');
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
                
                // Le salon vient de fermer alors qu'on lit encore le classement
                // final : on le garde à l'écran, le bouton Retour fera le reste.
                if (this.gameEnded) {
                    this.isGameActive = false;
                    this.gameInProgress = false;
                    this.hasJoined = false;
                    this.joinCode = '';
                    this.homeScreen = 'hub';
                    localStorage.removeItem('hasJoinedLobby');
                    localStorage.removeItem('lobbyTwitchId');
                    return;
                }

                // Reset COMPLET de l'état du jeu
                this.isGameActive = false;
                this.gameInProgress = false;
                // L'écran du code était resté sélectionné depuis l'entrée dans le salon
                this.homeScreen = 'hub';
                this.joinCode = '';
                this.joinError = '';
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

            });

            this.socket.on('game-started', (data) => {
                // 🔧 FIX: synchroniser le lobbyMode avec le serveur AVANT les checks de mode.
                // Sans ça, si le client a un lobbyMode stale (ex: 'bombanime' resté après une fermeture
                // de lobby ratée), l'event serait ignoré → playerLives=0 + bouton réponse disabled.
                if (data && data.lobbyMode) {
                    this.lobbyMode = data.lobbyMode;
                }

                // Une nouvelle partie repart de zéro : sans ça les barres de camp
                // se rempliraient à partir du score de la partie précédente.
                cancelAnimationFrame(this._campsRaf);
                this.teamScores = { 1: 0, 2: 0 };
                this.campsAvant = { 1: 0, 2: 0 };
                this.campsProg = 1;

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
                    // Sans ça, la question de la partie précédente reste affichée
                    // le temps que la première arrive
                    this.currentQuestion = null;
                    this.showResults = false;
                    this.questionShown = false;
                    clearTimeout(this._chromeTimer);

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

                } else {
                    console.log('⏳ Partie en cours - Vous êtes spectateur');
                }
            });

            // Le salon vient de passer en équipes, ou d'en sortir
            this.socket.on('teams-toggled', (data) => {
                this.lobbyMode = data.lobbyMode;
                if (data.teamNames) this.teamNames = data.teamNames;
                // Le camp arrive juste après, par 'team-changed' : rien à deviner ici
                if (data.lobbyMode !== 'rivalry') {
                    this.selectedTeam = null;
                    localStorage.removeItem('selectedTeam');
                }
            });

            this.socket.on('lobby-update', (data) => {
                this.playerCount = data.playerCount;
                if (data.players) this.lobbyPlayers = data.players;
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
                this.selectedTeam = data.newTeam || null;
                if (data.newTeam) localStorage.setItem('selectedTeam', data.newTeam);
                else localStorage.removeItem('selectedTeam');
            });

            // 🔒 BUG FIX 1: Empêcher l'affichage des questions si non inscrit au lobby
            this.socket.on('new-question', (question) => {
                this.answerCounts = {};
                this.showQuestionStats = false;
                this.showTopSheet = false;
                this.showReport = false;
                this.clearSeal();
                this.revealQuestionChrome();
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
                this.clearSeal();
                // Lu avant puis après l'affectation : le classement se recalcule
                // sur les nouveaux résultats dès qu'ils sont posés.
                const rangAvant = this.myLiveRank;
                this.questionResults = results;
                this.rangDelta = rangAvant ? rangAvant - this.myLiveRank : 0;
                this.showResults = true;
                
                // 🆕 Mettre à jour les scores d'équipe en mode Rivalité
                if (results.lobbyMode === 'rivalry' && results.teamScores) {
                    if (results.teamNames) this.teamNames = results.teamNames;
                    this.remplirCamps(results.teamScores);
                }

                // 🔥 Déplacer myResult ici pour être accessible partout

                const myResult = results.players?.find(p => p.username === this.username);

                if (myResult && myResult.shieldUsed) {
                    this.showShieldProtectionEffect();
                }

                // Mode Points - Incrémenter le score si correct
                if (this.gameMode === 'points') {
                    if (this.selectedAnswer === results.correctAnswer) {
                        const pointsEarned = myResult?.pointsEarned || 1000;

                        const finalPoints = this.activeBonusEffect === 'doublex2' ? pointsEarned * 2 : pointsEarned;

                        this.playerPoints += finalPoints;
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

            // Le serveur diffuse la répartition des réponses en continu. On la garde
            // sous le coude mais on ne l'affiche qu'une fois les résultats révélés :
            // en direct, elle inciterait à suivre la majorité.
            this.socket.on('live-answer-stats', (data) => {
                this.answerCounts = data.answerCounts || {};
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
                    this.startEndReveal();
                });

                // 🆕 Nettoyer localStorage car la partie est terminée
                localStorage.removeItem('hasJoinedLobby');
                localStorage.removeItem('lobbyTwitchId');
                localStorage.removeItem('selectedTeam');
                localStorage.removeItem('teamCooldownEnd');
            });

            this.socket.on('error', (data) => {
                // 🆕 v2 : code de salon refusé → on reste sur la modale
                if (data.badCode) {
                    this.signalJoinError(data.message || 'Code de salon invalide');
                    this.pendingJoinCode = null;
                    this.hasJoined = false;
                    return;
                }
                // Refus de rejoindre : le message revient sous le champ de code plutôt
                // qu'en bandeau. Si le joueur ne cherchait pas à entrer, on n'affiche rien.
                if (data.message &&
                    (data.message.includes('en cours') || data.message.includes('Aucun salon'))) {
                    this.pendingJoinCode = null;
                    this.hasJoined = false;
                    this.gameInProgress = false;
                    if (this.homeScreen === 'join') this.signalJoinError(data.message);
                    return;
                }
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
                
                if (data.message === 'Aucune partie active') {
                    this.hasJoined = false;
                    this.gameInProgress = false;
                    return;
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
                    } else {
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
                } else {
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
        
        // Note: Les fonctions de cooldown d'équipe ont été supprimées
        // Le joueur choisit son équipe une seule fois avant de rejoindre

        // ========== Question ==========
        selectAnswer(answerIndex, event) {
            if (this.hasAnswered || this.playerLives === 0) return;

            this.selectedAnswer = answerIndex;
            this._lastClickTime = Date.now();

            // 💥 Son "Shockwave 3D"
            this.playShockwaveSound();

            if (event) this.playSealEffect(event.currentTarget);

            this.socket.emit('submit-answer', {
                answer: answerIndex,
                bonusActive: this.activeBonusEffect
            });

            console.log(`📤 Réponse envoyée: ${answerIndex}, bonus: ${this.activeBonusEffect}`);
        },

        // Le compteur monte progressivement jusqu'au nouveau score
        tweenPoints(de, vers, duree) {
            cancelAnimationFrame(this._ptsRaf);
            const debut = performance.now();
            const pas = (t) => {
                const p = Math.min(1, (t - debut) / duree);
                const k = 1 - Math.pow(1 - p, 3);   // sortie douce
                this.displayedPoints = Math.round(de + (vers - de) * k);
                if (p < 1) this._ptsRaf = requestAnimationFrame(pas);
            };
            this._ptsRaf = requestAnimationFrame(pas);
        },

        // Son des points : deux notes qui montent, plus une harmonique brillante
        playPointsSound() {
            try {
                if (!this._shockwaveCtx) {
                    this._shockwaveCtx = new (window.AudioContext || window.webkitAudioContext)();
                }
                const ctx = this._shockwaveCtx;
                if (ctx.state === 'suspended') ctx.resume();
                const t = ctx.currentTime;

                [[880, 0], [1320, 0.075], [1760, 0.15]].forEach(([freq, retard], i) => {
                    const o = ctx.createOscillator();
                    const g = ctx.createGain();
                    o.type = i === 2 ? 'triangle' : 'sine';
                    o.frequency.setValueAtTime(freq, t + retard);
                    g.gain.setValueAtTime(0, t + retard);
                    g.gain.linearRampToValueAtTime(i === 2 ? 0.035 : 0.06, t + retard + 0.012);
                    g.gain.exponentialRampToValueAtTime(0.001, t + retard + 0.3);
                    o.connect(g).connect(ctx.destination);
                    o.start(t + retard); o.stop(t + retard + 0.3);
                });
            } catch (e) {
                console.warn('Son de points indisponible:', e);
            }
        },

        // 💔 Perte d'une vie : le cœur éclate, une onde part et des éclats se dispersent.
        // Les décors vivent sur <body> : le HUD est repatché par Vue au même instant.
        playLifeLostEffect(rang) {
            this.playLifeLostSound();

            const coeur = document.querySelectorAll('.v2q-lives i')[rang - 1];
            if (!coeur) return;
            const r = coeur.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;

            const onde = document.createElement('div');
            onde.className = 'v2q-hp-wave';
            onde.style.cssText = `left:${cx}px;top:${cy}px;`;
            document.body.appendChild(onde);
            setTimeout(() => onde.remove(), 700);

            for (let i = 0; i < 12; i++) {
                const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.5;
                const dist = 26 + Math.random() * 34;
                const eclat = document.createElement('div');
                eclat.className = 'v2q-hp-shard';
                eclat.style.cssText = `left:${cx}px;top:${cy}px;` +
                    `--dx:${Math.cos(angle) * dist}px;--dy:${Math.sin(angle) * dist}px;--rot:${angle}rad;` +
                    `animation-delay:${(Math.random() * 0.07).toFixed(3)}s;`;
                document.body.appendChild(eclat);
                setTimeout(() => eclat.remove(), 800);
            }
        },

        // Son de casse : un choc sourd, un craquement, et une note qui retombe
        playLifeLostSound() {
            try {
                if (!this._shockwaveCtx) {
                    this._shockwaveCtx = new (window.AudioContext || window.webkitAudioContext)();
                }
                const ctx = this._shockwaveCtx;
                if (ctx.state === 'suspended') ctx.resume();
                const t = ctx.currentTime;

                // Impact grave
                const o1 = ctx.createOscillator();
                const g1 = ctx.createGain();
                o1.type = 'sine';
                o1.frequency.setValueAtTime(190, t);
                o1.frequency.exponentialRampToValueAtTime(55, t + 0.28);
                g1.gain.setValueAtTime(0, t);
                g1.gain.linearRampToValueAtTime(0.14, t + 0.01);
                g1.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
                o1.connect(g1).connect(ctx.destination);
                o1.start(t); o1.stop(t + 0.32);

                // Craquement : bruit blanc court passé en haut du spectre
                const n = ctx.createBufferSource();
                const buf = ctx.createBuffer(1, ctx.sampleRate * 0.18, ctx.sampleRate);
                const data = buf.getChannelData(0);
                for (let i = 0; i < data.length; i++) {
                    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
                }
                n.buffer = buf;
                const filtre = ctx.createBiquadFilter();
                filtre.type = 'highpass';
                filtre.frequency.setValueAtTime(1800, t);
                const gn = ctx.createGain();
                gn.gain.setValueAtTime(0.09, t);
                gn.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
                n.connect(filtre).connect(gn).connect(ctx.destination);
                n.start(t); n.stop(t + 0.18);

                // Note qui retombe, pour la couleur
                const o2 = ctx.createOscillator();
                const g2 = ctx.createGain();
                o2.type = 'triangle';
                o2.frequency.setValueAtTime(880, t + 0.02);
                o2.frequency.exponentialRampToValueAtTime(240, t + 0.4);
                g2.gain.setValueAtTime(0, t + 0.02);
                g2.gain.linearRampToValueAtTime(0.05, t + 0.04);
                g2.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
                o2.connect(g2).connect(ctx.destination);
                o2.start(t + 0.02); o2.stop(t + 0.42);
            } catch (e) {
                console.warn('Son de perte de vie indisponible:', e);
            }
        },

        // 🏮 Effet « Sceau ninja » : un sceau doré s'abat sur la réponse choisie,
        // la barre encaisse le choc et un anneau se propage.
        // Les décors sont posés en position fixed sur <body> : Vue repatche la
        // classe du bouton au moment même du clic, tout ce qui vit dedans saute.
        playSealEffect(bouton) {
            if (!bouton) return;
            const r = bouton.getBoundingClientRect();

            // Le choc du bouton passe par l'API d'animation : insensible au repatch
            if (bouton.animate) {
                bouton.animate(
                    [{ transform: 'scale(1)' }, { transform: 'scale(0.968)', offset: 0.35 }, { transform: 'scale(1)' }],
                    { duration: 300, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)' }
                );
            }

            const anneau = document.createElement('div');
            anneau.className = 'v2q-shock';
            anneau.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;`;
            document.body.appendChild(anneau);

            // Le sceau se cale à gauche du pourcentage, qui n'apparaîtra qu'aux résultats
            const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
            const sceau = document.createElement('div');
            sceau.className = 'v2q-seal';
            sceau.textContent = '選';
            sceau.style.cssText = `left:${r.right - 3.75 * rem}px;top:${r.top + r.height / 2}px;`;
            document.body.appendChild(sceau);

            // L'anneau ne vit que le temps du choc ; le sceau reste jusqu'à la fin du temps
            setTimeout(() => anneau.remove(), 600);
            this._sceau = sceau;
        },

        // Retire le sceau (fin du temps, question suivante, sortie de partie)
        clearSeal() {
            if (this._sceau) { this._sceau.remove(); this._sceau = null; }
            document.querySelectorAll('.v2q-seal, .v2q-shock').forEach(n => n.remove());
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

            // 🆕 v2 : on quitte le salon et on revient à l'accueil
            // L'hôte referme aussi le salon côté serveur : sinon il restait ouvert
            // sans personne dedans, et bloquait la création de la suivante.
            const etaitHote = this.isHost;
            this.joinCode = '';
            this.quitterSalonLocalement();

            if (etaitHote) {
                fetch('/admin/toggle-game', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                }).catch(() => { /* le serveur diffuse game-deactivated de toute façon */ })
                  .finally(() => this.refreshGameState());
            } else {
                this.refreshGameState();
            }
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
        // Neutralisée depuis la v1, elle n'écrivait plus que dans la console :
        // vingt-six appels ne donnaient donc aucun retour au joueur.
        showNotification(message, type = 'info') {
            if (!message) return;
            const n = { id: ++this._notifSeq, message, type };
            this.notifs.push(n);
            // Trois à l'écran au plus : au-delà, les plus anciens cèdent la place
            if (this.notifs.length > 3) this.notifs.shift();
            setTimeout(() => {
                const i = this.notifs.indexOf(n);
                if (i !== -1) this.notifs.splice(i, 1);
            }, 3200);
        },





        // Passage de palier. La jauge est un enfant du panel, recréé à chaque question :
        // toute manipulation directe du DOM serait perdue. Tout passe donc par l'état.
        // C'est ce qui bloquait la jauge : l'ancienne version cherchait .combo-bar-fill,
        // ne le trouvait plus, et sortait sans jamais relâcher isLevelingUp.
        animateLevelUp() {
            clearTimeout(this._comboT1);
            clearTimeout(this._comboT2);
            clearTimeout(this._comboT3);

            this.isLevelingUp = true;
            this.comboPhase = 'up';          // la jauge finit sa montée
            this.spawnParticles();

            this._comboT1 = setTimeout(() => {
                this.comboPhase = 'flush';   // elle s'efface, pleine
                this._comboT2 = setTimeout(() => {
                    this.comboPhase = 'reset';   // vidée d'un coup, encore invisible
                    this._comboT3 = setTimeout(() => {
                        this.comboPhase = '';    // et repart de la progression réelle
                        this.isLevelingUp = false;
                    }, 60);
                }, 450);
            }, 500);
        },

        spawnParticles() {
            const container = document.querySelector('.combo-particles-external');
            if (!container) return;

            // La jauge est horizontale : les particules jaillissent de la portion remplie
            const remplissage = this.comboBarHeight;

            for (let i = 0; i < 40; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';

                // Réparties sur la longueur déjà acquise
                particle.style.left = `${Math.random() * remplissage}%`;
                particle.style.bottom = '0';

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
                this.marquerJeton('doublex2');
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
                    const btn = document.querySelector(`.v2q-answer:nth-child(${index})`);
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
                    const btn = document.querySelector(`.v2q-answer:nth-child(${i})`);
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
            this.marquerJeton('shield');
        },

        // Le bonus actif se signale sur son propre jeton, seul repère qui reste
        marquerJeton(type) {
            this.activeBonusEffect = type;
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
            document.querySelectorAll('.v2q-answer').forEach(btn => {
                btn.classList.remove('bonus-5050-hidden', 'bonus-revealed');
            });

            // Le jeton allumé s'éteint avec l'effet
            this.activeBonusEffect = null;
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
