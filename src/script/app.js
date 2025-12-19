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
            },


            // Liste des partenaires (ordre d'affichage)
            partnersList: [
                { id: 'MinoStreaming', name: 'mino', avatar: 'mino.png' },
                { id: 'pikinemadd', name: 'pikinemadd', avatar: 'pikine.png' }
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

        this.initParticles();
        this.initSocket();


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

                // Re-sync l'état du jeu
                this.refreshGameState();
            }
        });

        this.loadTheme();
        this.initSounds();



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

    methods: {

        // 🆕 Afficher une notification de kick discrète en bas
        showKickNotification() {
            // Supprimer une notification existante si présente
            const existing = document.querySelector('.kick-notification');
            if (existing) existing.remove();
            
            const notif = document.createElement('div');
            notif.className = 'kick-notification';
            notif.innerHTML = `Tu as été exclus...`;
            document.body.appendChild(notif);
            
            // Animation d'entrée
            setTimeout(() => notif.classList.add('show'), 10);
            
            // Disparition après 4 secondes
            setTimeout(() => {
                notif.classList.remove('show');
                setTimeout(() => notif.remove(), 300);
            }, 4000);
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
                    this.socket.emit('join-lobby', {
                        twitchId: this.twitchId,
                        username: this.username
                    });
                    this.shouldRejoinLobby = false;
                    console.log('✅ Re-jointure automatique du lobby après refresh');
                } else if (wasKicked) {
                    console.log('🚫 Rejoin auto bloqué - joueur kick');
                    this.shouldRejoinLobby = false;
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

                // Nettoyer localStorage et sessionStorage
                localStorage.removeItem('hasJoinedLobby');
                localStorage.removeItem('lobbyTwitchId');
                sessionStorage.removeItem('wasKicked'); // 🆕 Clear kick flag pour prochaine partie

                this.showNotification('Le jeu a été désactivé', 'info');
            });

            this.socket.on('game-started', (data) => {
                this.gameStartedOnServer = true;
                this.gameMode = data.gameMode || 'lives';

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

            // 🆕 Clear le flag kick pour permettre le rejoin
            sessionStorage.removeItem('wasKicked');

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
            this.clickSound.volume = 0.5; // Volume à 50%
        },

        playSound(sound) {
            if (sound) {
                sound.currentTime = 0; // Reset au début
                sound.play().catch(e => console.log('Audio blocked:', e));
            }
        },



    },


}).mount('#app');