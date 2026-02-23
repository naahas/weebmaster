// ============================================
// VARIABLES INTRO
// ============================================
let particleAnimations = [];
let introStartTime = null;
let introCompleted = false;
const MAX_INTRO_DURATION = 8000;
const introMessages = ['Initialisation...', 'Streamer connecté..', 'Chargement des données...', 'Accès au panel admin..'];


// ============================================
// 🆕 FONCTION DÉCONNEXION ADMIN
// ============================================
function adminLogout() {
    // Appeler logout pour libérer le slot, puis rediriger vers /admin
    fetch('/auth/logout')
        .then(() => {
            window.location.href = '/admin';
        })
        .catch(() => {
            window.location.href = '/admin';
        });
}


// ============================================
// CONSTANTES SVG ICÔNES DE VIES
// ============================================

const LIVES_ICONS = {
    heart: `<svg viewBox="0 0 24 24" fill="#ff6b6b"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,

    dragonball: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#ff8c00"/><circle cx="8" cy="6" r="2.5" fill="#ffb347" opacity="0.7"/><circle cx="12" cy="8" r="1.8" fill="#c00"/><circle cx="9" cy="13" r="1.8" fill="#c00"/><circle cx="15" cy="13" r="1.8" fill="#c00"/><ellipse cx="7" cy="6" rx="3" ry="2" fill="#fff" opacity="0.4"/></svg>`,

    sharingan: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#cc0000"/><circle cx="12" cy="12" r="3" fill="#000"/><circle cx="12" cy="6" r="1.8" fill="#000"/><circle cx="6.8" cy="15" r="1.8" fill="#000"/><circle cx="17.2" cy="15" r="1.8" fill="#000"/></svg>`,

    katana: `<svg viewBox="0 0 24 24" fill="none"><path d="M20 18L4 8" stroke="#c8c8c8" stroke-width="2" stroke-linecap="round"/><rect x="18" y="16" width="4" height="4" rx="1" fill="#8b6b4a"/></svg>`,

    shuriken: `<svg viewBox="0 0 24 24" fill="#888"><path d="M12 2L14 10L22 12L14 14L12 22L10 14L2 12L10 10L12 2Z"/><circle cx="12" cy="12" r="2.5" fill="#0a0a0f"/></svg>`,

    konoha: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 2C8 2 4 6 4 12c0 4 2 7 5 8.5-.5-2-.5-4 1-6 1.5-2 3-3 3-3s1.5 1 3 3c1.5 2 1.5 4 1 6 3-1.5 5-4.5 5-8.5 0-6-4-10-8-10z" fill="#4ade80"/><path d="M12 8c-1 1-2 3-2 5s1 3 2 4c1-1 2-2 2-4s-1-4-2-5z" fill="#22c55e"/></svg>`,

    alchemy: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#f0c040" stroke-width="1.5" fill="none"/><circle cx="12" cy="12" r="7" stroke="#f0c040" stroke-width="1" fill="none"/><polygon points="12,4 18,16 6,16" stroke="#f0c040" stroke-width="1" fill="none"/><polygon points="12,20 6,8 18,8" stroke="#f0c040" stroke-width="1" fill="none"/></svg>`,

    curse: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#1a1a2e"/><path d="M12 4 Q16 8 12 12 Q8 8 12 4" fill="#7c3aed"/><path d="M12 20 Q8 16 12 12 Q16 16 12 20" fill="#7c3aed"/><path d="M4 12 Q8 8 12 12 Q8 16 4 12" fill="#7c3aed"/><path d="M20 12 Q16 16 12 12 Q16 8 20 12" fill="#7c3aed"/><circle cx="12" cy="12" r="2" fill="#a855f7"/></svg>`,

    kunai: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 2L8 12L12 14L16 12L12 2Z" fill="#a8a8a8"/><path d="M12 2L8 12L12 10L16 12L12 2Z" fill="#d4d4d4"/><rect x="11" y="14" width="2" height="6" fill="#8b6b4a"/><circle cx="12" cy="22" r="2" fill="none" stroke="#8b6b4a" stroke-width="1.5"/></svg>`,

    star4: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 2L14 10L22 12L14 14L12 22L10 14L2 12L10 10L12 2Z" fill="#3b82f6"/><path d="M12 5L13 10L18 12L13 14L12 19L11 14L6 12L11 10L12 5Z" fill="#60a5fa"/><path d="M12 8L12.5 10.5L15 12L12.5 13.5L12 16L11.5 13.5L9 12L11.5 10.5L12 8Z" fill="#93c5fd"/></svg>`
};

// Katanas groupés - SVG dynamique selon nombre de vies
const KATANA_SVGS = {
    3: `<svg viewBox="0 0 32 24" fill="none" class="katana-group"><path d="M28 20L6 4" stroke="#c8c8c8" stroke-width="2" stroke-linecap="round"/><path d="M28 20L3 11" stroke="#d4d4d4" stroke-width="2" stroke-linecap="round"/><path d="M28 20L4 18" stroke="#b8b8b8" stroke-width="2" stroke-linecap="round"/><rect x="26" y="18" width="5" height="4" rx="1" fill="#8b6b4a"/></svg>`,
    2: `<svg viewBox="0 0 32 24" fill="none" class="katana-group"><path d="M28 20L5 6" stroke="#c8c8c8" stroke-width="2" stroke-linecap="round"/><path d="M28 20L4 16" stroke="#d4d4d4" stroke-width="2" stroke-linecap="round"/><rect x="26" y="18" width="5" height="4" rx="1" fill="#8b6b4a"/></svg>`,
    1: `<svg viewBox="0 0 24 24" fill="none"><path d="M22 18L4 10" stroke="#c8c8c8" stroke-width="2.5" stroke-linecap="round"/><rect x="20" y="16" width="4" height="4" rx="1" fill="#8b6b4a"/></svg>`,
    0: `<svg viewBox="0 0 24 24" fill="none" class="lost"><path d="M22 18L4 10" stroke="#c8c8c8" stroke-width="2.5" stroke-linecap="round"/><rect x="20" y="16" width="4" height="4" rx="1" fill="#8b6b4a"/></svg>`
};

// Noms affichés pour chaque icône
const LIVES_ICON_NAMES = {
    heart: 'Cœur',
    dragonball: 'D.Ball',
    sharingan: 'Sharingan',
    katana: 'Katana',
    shuriken: 'Shuriken',
    konoha: 'Konoha',
    alchemy: 'Alchimie',
    curse: 'Malédiction',
    kunai: 'Kunai',
    star4: 'Étoile'
};


// ============================================
// 🆕 VARIABLES IMAGE PERSONNAGE
// ============================================
let characterImageEnabled = true;
let characterShowTimeout = null;
let characterHideTimeout = null;

// 🆕 État pour masquer les pourcentages (anti-triche)
let hidePercentsEnabled = false;

// Mapping série -> image (noms exacts de la DB)
const CHARACTER_IMAGES = {
    'fire force': 'questionpic/fireforce.png',
    'beelzebub': 'questionpic/beelzebub.png',
    'slam dunk': 'questionpic/slamdunk.png',
    'hajime no ippo': 'questionpic/hajimenoippo.png',
    'great teacher onizuka': 'questionpic/gto.png',
    'berserk': 'questionpic/berserk.png',
    'fate/stay night': 'questionpic/fate.png',
    'gantz': 'questionpic/gantz.png',
    'demon slayer': 'questionpic/demonslayer.png',
    'saint seiya': 'questionpic/saintseiya.png',
    'dandadan': 'questionpic/dandadan.png',
    'riku-do': 'questionpic/rikudo.png',
    'food wars': 'questionpic/foodwars.png',
    'blue exorcist': 'questionpic/blueexorcist.png',
    'katekyo hitman reborn': 'questionpic/reborn.png',
    'platinum end': 'questionpic/platinumend.png',
    'jujutsu kaisen': 'questionpic/jujutsukaisen.png',
    'jujustu kaisen': 'questionpic/jujutsukaisen.png', // typo dans la DB
    'nana': 'questionpic/nana.png',
    'shingeki no kyojin': 'questionpic/shingekinokyojin.png',
    'prisonnier riku': 'questionpic/prisonnieriku.png',
    'erased': 'questionpic/erased.png',
    'one punch man': 'questionpic/onepunchman.png',
    'bleach': 'questionpic/bleach.png',
    'the promised neverland': 'questionpic/promisedneverland.png',
    'yugioh': 'questionpic/yugioh.png',
    'fairy tail': 'questionpic/fairytail.png',
    'tokyo ghoul': 'questionpic/tokyoghoul.png',
    'death note': 'questionpic/deathnote.png',
    'dr. stone': 'questionpic/drstone.png',
    'one piece': 'questionpic/onepiece.png',
    'tokyo revengers': 'questionpic/tokyorevengers.png',
    'kuroko no basket': 'questionpic/kurokosbasket.png',
    'hunter hunter': 'questionpic/hunterxhunter.png',
    'naruto': 'questionpic/naruto.png',
    'blue lock': 'questionpic/bluelock.png',
    'i am a hero': 'questionpic/iamahero.png',
    'divers': 'questionpic/divers.png',
    'fullmetal alchemist': 'questionpic/fullmetalalchemist.png',
    'dragon ball': 'questionpic/dragonball.png',
    'jojo\'s bizarre adventure': 'questionpic/jojo.png',
    'pokemon': 'questionpic/pokemon.png',
    'black clover': 'questionpic/blackclover.png',
    'bakuman': 'questionpic/bakuman.png',
    'yu yu hakusho': 'questionpic/yuyuhakusho.png',
    'hokuto no ken': 'questionpic/hokutonoken.png',
    'prophecy': 'questionpic/prophecy.png',
    'green blood': 'questionpic/greenblood.png',
    'spy family': 'questionpic/spyfamily.png',
    'frieren': 'questionpic/frieren.png',
    'tomodachi game': 'questionpic/tomodachigame.png',
    'my hero academia': 'questionpic/myheroacademia.png',
    'vinland saga': 'questionpic/vinlandsaga.png',
    'gunnm': 'questionpic/gunnm.png'
};


// ============================================
// VARIABLES PARTICULES BOUTON
// ============================================
let isHovering = false;
let hoverTransition = 0;
let time = 0;
let movementFadeIn = 0;
let continuousAnimationId = null;



// ============================================
// 🔊 SYSTÈME AUDIO ADMIN
// ============================================
const adminSounds = {};
let adminSoundMuted = localStorage.getItem('adminSoundMuted') === 'true';
let adminSoundVolume = parseInt(localStorage.getItem('adminSoundVolume')) || 50;

function initAdminSounds() {
    adminSounds.bombanimePass = createPreloadedSound('slash3.mp3');
    adminSounds.bombanimeWrong = createPreloadedSound('wrong.mp3');
    adminSounds.bombanimeUsed = createPreloadedSound('lock1.mp3');
    adminSounds.bombanimeExplosion = createPreloadedSound('explode.mp3');
    console.log('🔊 Sons admin initialisés');
    
    // Initialiser le contrôle visuel
    initSoundControl();
}

function createPreloadedSound(src, volume = 0.5) {
    const sound = new Audio(src);
    sound.volume = volume;
    sound.preload = 'auto';
    sound.load();
    return sound;
}

function playAdminSound(sound) {
    if (!sound || adminSoundMuted) return;
    const clone = sound.cloneNode();
    clone.volume = (adminSoundVolume / 100) * 0.7;
    clone.play().catch(e => console.log('Audio blocked:', e));
}

function initSoundControl() {
    const control = document.getElementById('adminSoundControl');
    const btn = document.getElementById('adminSoundBtn');
    const slider = document.getElementById('adminSoundSlider');
    const soundOn = btn?.querySelector('.sound-on');
    const soundOff = btn?.querySelector('.sound-off');
    
    if (!control || !btn || !slider) return;
    
    // Appliquer l'état initial
    slider.value = adminSoundVolume;
    updateSoundControlUI();
    
    // Toggle mute
    btn.addEventListener('click', () => {
        adminSoundMuted = !adminSoundMuted;
        localStorage.setItem('adminSoundMuted', adminSoundMuted);
        updateSoundControlUI();
    });
    
    // Slider volume
    slider.addEventListener('input', (e) => {
        adminSoundVolume = parseInt(e.target.value);
        localStorage.setItem('adminSoundVolume', adminSoundVolume);
    });
    
    function updateSoundControlUI() {
        if (adminSoundMuted) {
            control.classList.add('muted');
            if (soundOn) soundOn.style.display = 'none';
            if (soundOff) soundOff.style.display = 'block';
        } else {
            control.classList.remove('muted');
            if (soundOn) soundOn.style.display = 'block';
            if (soundOff) soundOff.style.display = 'none';
        }
    }
}

// Afficher/Cacher le contrôle de son
function showSoundControl(show) {
    const control = document.getElementById('adminSoundControl');
    if (control) {
        if (show) {
            control.classList.add('visible');
        } else {
            control.classList.remove('visible');
        }
    }
}

// ============================================
// SOCKET.IO
// ============================================
let socket = null;

function initSocket() {
    socket = io();
    
    // 🔊 Initialiser les sons
    initAdminSounds();
    
    // 🎴 Charger la liste des animes Collect
    socket.emit('collect-get-animes');
    socket.on('collect-animes-list', (data) => {
        initAnimeFilter(data.animes, data.big3);
    });

    // ===== ÉVÉNEMENTS LOBBY =====

    socket.on('lobby-update', (data) => {
        console.log('📥 lobby-update:', data);

        if (data.livesIcon) {
            updateLivesIconSelector(data.livesIcon);
        }

        // Mettre à jour les paramètres si envoyés
        if (data.mode) updateModeDisplay(data.mode);
        if (data.lives) updateLivesDisplay(data.lives);
        if (data.questionTime) updateTimerDisplay(data.questionTime);

        // Mettre à jour les joueurs APRÈS l'icône
        if (data.players) {
            updateLobbyPlayers(data.players);
            
            // 🎴💣 Détecter si l'admin est dans le lobby
            if (twitchUser && (currentGameMode === 'collect' || currentGameMode === 'bombanime')) {
                const wasInLobby = adminInLobby;
                adminInLobby = data.players.some(p => p.twitchId === twitchUser.id);
                if (wasInLobby !== adminInLobby) updateAdminJoinButton();
            }
        }

        // Mettre à jour le compteur
        if (data.playerCount !== undefined) {
            document.getElementById('lobbyPlayerCount').textContent = data.playerCount;
        }
        
        // 💣 BombAnime / 🎴 Collect - Afficher/Cacher badge MAX
        const maxBadge = document.getElementById('lobbyMaxBadge');
        if (maxBadge) {
            if (data.isLobbyFull && (data.lobbyMode === 'bombanime' || data.lobbyMode === 'collect')) {
                maxBadge.style.display = 'inline-block';
            } else {
                maxBadge.style.display = 'none';
            }
        }
    });

    socket.on('game-activated', () => {
        console.log('✅ Lobby ouvert');
    });

    socket.on('game-deactivated', () => {
        console.log('❌ Lobby fermé');
        // 🆕 Retourner à l'idle depuis n'importe quel état (lobby ou game)
        returnToIdle();
    });

    socket.on('game-started', (data) => {
        // Ignorer en mode BombAnime (géré par bombanime-game-started)
        if (currentGameMode === 'bombanime') {
            console.log('🎮 game-started ignoré en mode BombAnime');
            return;
        }
        console.log('🎮 Partie démarrée:', data);
        gameSettings.mode = data.gameMode === 'lives' ? 'vie' : 'point';
        gameSettings.totalQuestions = data.questionsCount || 20;
        
        // 🔥 FIX: Synchroniser le DOM avant transitionToGame (sinon getGameSettings() écrase le mode)
        const modeValue = document.getElementById('modeValue');
        if (modeValue) modeValue.textContent = data.gameMode === 'lives' ? 'Vies' : 'Points';
        
        // 🔥 FIX: Synchroniser les boutons de mode aussi
        const serverMode = data.gameMode === 'lives' ? 'vie' : 'point';
        document.querySelectorAll('.mode-group .setting-option-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === serverMode);
        });
        
        transitionToGame();
    });

    socket.on('new-question', (data) => {
        // Ignorer en mode BombAnime
        if (currentGameMode === 'bombanime') return;
        console.log('📝 Nouvelle question:', data);
        displayQuestion(data);
    });


    socket.on('question-results', (data) => {
        // Ignorer en mode BombAnime
        if (currentGameMode === 'bombanime') return;
        console.log('📊 Résultats:', data);
        console.log('📊 Stats:', data.stats);  // AJOUTER
        console.log('📊 Fastest:', data.fastestPlayer);  // AJOUTER
        displayResults(data);
    });


    socket.on('live-answer-stats', (data) => {
        updateLiveStats(data);
    });

    socket.on('game-ended', (data) => {
        // Ignorer en mode BombAnime (géré par bombanime-game-ended)
        if (currentGameMode === 'bombanime') {
            console.log('🎮 game-ended ignoré en mode BombAnime');
            return;
        }
        console.log('🏆 Fin de partie:', data);
        displayWinner(data);
    });

    socket.on('activity-log', (log) => {
        handleActivityLog(log);
    });

    socket.on('tiebreaker-announced', (data) => {
        console.log('⚔️ Tiebreaker:', data);
        // Afficher message égalité
    });

    socket.on('connect', () => {
        console.log('🔌 Socket connecté');
        // Demander l'état Collect en cas de reconnexion, inclure le twitchId pour restaurer les cartes
        socket.emit('collect-get-state', { twitchId: twitchUser ? twitchUser.id : null });
    });

    socket.on('disconnect', () => {
        console.log('🔌 Socket déconnecté');
    });

    socket.on('logs-reset', () => {
        const logsList = document.getElementById('gameLogsList');
        if (logsList) {
            logsList.innerHTML = '';
        }
    });

    // ============================================
    // 💣 BOMBANIME - Socket Handlers
    // ============================================
    
    socket.on('bombanime-game-started', (data) => {
        console.log('💣 BombAnime démarré:', data);
        // 🆕 Supprimer les données du winner précédent
        sessionStorage.removeItem('bombanimeWinnerData');
        clearBombanimeLogs();
        showBombanimeCircle(data);
        showSoundControl(true); // 🔊 Afficher contrôle son
        showSuggestionButton(true); // Afficher bouton suggestions
        
        // 🔥 FIX: Mettre à jour le badge "En partie"
        const statusDotEl = document.getElementById('statusDot');
        const statusTextEl = document.getElementById('statusText');
        if (statusDotEl) statusDotEl.classList.add('active');
        if (statusTextEl) statusTextEl.textContent = 'En partie';
    });
    
    // 🆕 Handler pour la reconnexion - restaurer l'état BombAnime
    socket.on('bombanime-state', (data) => {
        console.log('💣 État BombAnime reçu:', data);
        
        // Cacher l'overlay winner classique si présent
        const classicWinnerOverlay = document.getElementById('winnerOverlay');
        if (classicWinnerOverlay) {
            classicWinnerOverlay.classList.remove('active');
        }
        
        if (data.active) {
            // Restaurer l'état BombAnime
            showBombanimeCircle({
                serie: data.serie,
                timer: data.timer,
                playersData: data.playersData,
                playersOrder: data.playersOrder,
                currentPlayerTwitchId: data.currentPlayerTwitchId,
                challenges: data.challenges || []
            });
            
            showSoundControl(true); // 🔊 Afficher contrôle son
            showSuggestionButton(true); // Afficher bouton suggestions
            
            // 💣 Reconnexion : pas un premier tour, la partie est déjà en cours
            bombanimeState.isFirstTurn = false;
            
            // Mettre à jour le timer restant
            bombanimeState.timeRemaining = data.timeRemaining || data.timer;
            
            // 🆕 Tourner la bombe vers le joueur actuel après un court délai (DOM prêt)
            setTimeout(() => {
                rotateBombToPlayer(data.currentPlayerTwitchId);
                updateBombDangerState();
                
                // Admin-as-player: restore turn state on reconnect
                if (bombanimeState.isAdminPlayer && twitchUser) {
                    const isMyTurn = data.currentPlayerTwitchId === twitchUser.id;
                    updateAdminBombanimeInput(isMyTurn);
                    // Restore alphabet/challenges if available
                    if (data.myAlphabet) {
                        bombanimeState.myAlphabet = data.myAlphabet;
                        renderAdminBombanimeAlphabet();
                    }
                    if (data.challenges) {
                        bombanimeState.challenges = data.challenges;
                        renderAdminBombanimeChalllenges();
                    }
                    if (data.bonuses) {
                        bombanimeState.bonuses = data.bonuses;
                    }
                }
                
                // 🆕 Restaurer les dernières réponses des joueurs (sauf le joueur actuel)
                data.playersData.forEach(player => {
                    if (player.twitchId !== data.currentPlayerTwitchId && player.lastAnswer) {
                        const playerSlot = document.getElementById(`player-slot-${player.twitchId}`);
                        if (playerSlot) {
                            let typingEl = playerSlot.querySelector('.player-typing');
                            if (!typingEl) {
                                typingEl = document.createElement('div');
                                typingEl.className = 'player-typing';
                                playerSlot.appendChild(typingEl);
                            }
                            typingEl.textContent = player.lastAnswer.toUpperCase();
                            typingEl.classList.add('last-answer');
                            typingEl.classList.remove('has-text');
                        }
                    }
                });
            }, 50);
            
            // Démarrer le timer visuel
            if (bombanimeState.timerInterval) {
                clearInterval(bombanimeState.timerInterval);
            }
            bombanimeState.timerInterval = setInterval(() => {
                bombanimeState.timeRemaining--;
                updateBombDangerState();
                if (bombanimeState.timeRemaining <= 0) {
                    clearInterval(bombanimeState.timerInterval);
                }
            }, 1000);
            
            console.log('✅ État BombAnime restauré');
        } else {
            // Si BombAnime n'est pas actif, nettoyer le sessionStorage du winner
            // (le serveur a probablement redémarré, donc pas de partie en cours)
            sessionStorage.removeItem('bombanimeWinnerData');
            
            if (currentGameMode === 'bombanime') {
                console.log('💣 BombAnime non actif - retour à l\'idle');
                returnToIdle();
            }
        }
    });
    
    socket.on('bombanime-turn-start', (data) => {
        console.log('💣 Tour de:', data.currentPlayerUsername);
        
        bombanimeState.isFirstTurn = false;
        
        updateBombanimeCircle(data);
        
        // Admin-as-player: update input state
        if (bombanimeState.isAdminPlayer && twitchUser) {
            const isMyTurn = data.currentPlayerTwitchId === twitchUser.id;
            
            // 🔥 FIX: Stocker le tour en cours pour retry si l'input n'est pas prêt
            bombanimeState._pendingTurn = isMyTurn;
            
            const input = document.getElementById('bombanimeAdminInputField');
            if (input) {
                updateAdminBombanimeInput(isMyTurn);
            } else if (isMyTurn) {
                // Input pas encore créé → retry après un délai
                console.warn('⚠️ Input non trouvé pour turn-start, retry dans 200ms');
                setTimeout(() => {
                    if (bombanimeState._pendingTurn) {
                        updateAdminBombanimeInput(true);
                    }
                }, 200);
            }
        }
    });
    
    socket.on('bombanime-name-accepted', (data) => {
        console.log('✅ Nom accepté:', data.name, 'par', data.playerUsername);
        playAdminSound(adminSounds.bombanimePass); // 🔊
        addBombanimeLog('success', data);
        onBombanimeNameAccepted(data);
        
        // Admin-as-player: update state
        if (bombanimeState.isAdminPlayer && twitchUser && data.playerTwitchId === twitchUser.id) {
            // Clear input
            const input = document.getElementById('bombanimeAdminInputField');
            if (input) input.value = '';
            
            // Update alphabet
            if (data.alphabet) {
                bombanimeState.myAlphabet = data.alphabet;
                renderAdminBombanimeAlphabet();
            }
            
            // Update challenges & bonuses
            if (data.challenges) {
                bombanimeState.challenges = data.challenges;
            }
            if (data.bonuses) {
                bombanimeState.bonuses = data.bonuses;
            }
            renderAdminBombanimeChalllenges();
        }
    });
    
    socket.on('bombanime-name-rejected', (data) => {
        console.log('❌ Nom rejeté:', data.name, 'raison:', data.reason);
        // 🔊 Son selon la raison
        if (data.reason === 'already_used') {
            playAdminSound(adminSounds.bombanimeUsed);
        } else {
            playAdminSound(adminSounds.bombanimeWrong);
        }
        onBombanimeNameRejected(data);
        
        // Admin-as-player: show error
        if (bombanimeState.isAdminPlayer && twitchUser && data.playerTwitchId === twitchUser.id) {
            showAdminBombanimeError(data.reason);
        }
    });
    
    socket.on('bombanime-explosion', (data) => {
        console.log('💥 Explosion sur:', data.playerUsername);
        playAdminSound(adminSounds.bombanimeExplosion); // 🔊
        addBombanimeLog('explosion', data);
        if (data.eliminated) {
            addBombanimeLog('elimination', data);
        }
        onBombanimeExplosion(data);
    });
    
    socket.on('bombanime-alphabet-complete', (data) => {
        console.log('🎉 Alphabet complet:', data.playerUsername, '+1 vie');
        onBombanimeAlphabetComplete(data);
    });
    
    // 🎯 Handler pour bonus vie extra utilisé
    socket.on('bombanime-player-lives-updated', (data) => {
        console.log('❤️ Vies mises à jour:', data.playerUsername, data.lives);
        onBombanimePlayerLivesUpdated(data);
        
        // Admin-as-player: update own lives
        if (bombanimeState.isAdminPlayer && twitchUser && data.playerTwitchId === twitchUser.id) {
            bombanimeState.playerLives = data.lives;
        }
    });
    
    // Admin-as-player: free character bonus
    socket.on('bombanime-free-character', (data) => {
        if (!bombanimeState.isAdminPlayer) return;
        console.log('🎁 Perso gratuit reçu:', data.character);
        const input = document.getElementById('bombanimeAdminInputField');
        if (input) {
            input.value = data.character;
            input.focus();
        }
        if (data.bonusesRemaining) {
            bombanimeState.bonuses = data.bonusesRemaining;
            renderAdminBombanimeChalllenges();
        }
    });
    
    // Admin-as-player: extra life used
    socket.on('bombanime-extra-life-used', (data) => {
        if (!bombanimeState.isAdminPlayer) return;
        console.log('❤️ Vie extra utilisée:', data);
        bombanimeState.playerLives = data.newLives;
        if (data.bonusesRemaining) {
            bombanimeState.bonuses = data.bonusesRemaining;
            renderAdminBombanimeChalllenges();
        }
    });
    
    // Admin-as-player: bonus error
    socket.on('bombanime-bonus-error', (data) => {
        if (!bombanimeState.isAdminPlayer) return;
        console.log('❌ Erreur bonus:', data.error);
    });
    
    socket.on('bombanime-game-ended', (data) => {
        console.log('🏆 BombAnime terminé:', data);
        showSoundControl(false); // 🔊 Cacher contrôle son
        showSuggestionButton(false); // Cacher bouton suggestions
        bombanimeState.isAdminPlayer = false; // Reset
        bombanimeState.isMyTurn = false;
        if (bombanimeState._turnWatchdog) {
            clearInterval(bombanimeState._turnWatchdog);
            bombanimeState._turnWatchdog = null;
        }
        sessionStorage.removeItem('adminBombanimePlayer');
        displayBombanimeWinner(data);
    });
    
    // ============================================
    // 🎴 COLLECT - Handlers
    // ============================================
    
    socket.on('collect-game-started', (data) => {
        console.log('🎴 Collect démarré:', data);
        adminDealStarted = false;
        adminCollectCards = [];
        adminCollectCardPlayed = false;
        sessionStorage.removeItem('adminCollectWasDiscard');
        const oldPov = document.getElementById('adminPovCards');
        if (oldPov) oldPov.innerHTML = '';
        showCollectTable(data);
        
        // Stocker les données du round 1
        const round1Data = data.round1 || null;
        
        // Si l'admin est joueur, demander ses cartes
        const isAdminPlayer = twitchUser && data.playersData && data.playersData.some(p => p.twitchId === twitchUser.id);
        if (isAdminPlayer) {
            console.log('🎴 Admin est joueur → demande de cartes');
            socket.emit('collect-request-my-cards', { twitchId: twitchUser.id });
        }
        
        // Synchrone: ajouter intro AVANT le premier paint
        const container = document.querySelector('.collect-table-container');
        if (container) {
            container.classList.add('intro');
            setTimeout(() => {
                container.querySelectorAll('.collect-player-seat, .collect-table').forEach(el => {
                    el.style.opacity = '1';
                });
                container.classList.remove('intro');
                setTimeout(() => {
                    container.querySelectorAll('.collect-player-seat, .collect-table').forEach(el => {
                        el.style.removeProperty('opacity');
                    });
                }, 500);
            }, 3000);
        }
        // Cacher les cartes adversaires pour l'animation de deal
        document.querySelectorAll('.collect-player-seat:not(.me) .collect-player-card-small').forEach(c => {
            c.classList.add('pre-deal');
        });
        // Lancer le deal des cartes adversaires après que les seats soient visibles
        setTimeout(() => {
            dealAdminSmallCards();
        }, 2800);
        
        // 🏪 Market reveal — server event + local fallback
        if (round1Data) {
            window._collectRound1Data = round1Data;
            window._marketRevealed = false;
            
            // Local fallback: si le server event n'arrive pas après 5.5s
            const localMarketCards = data.marketCards || [];
            setTimeout(() => {
                if (!window._marketRevealed && localMarketCards.length > 0) {
                    console.log('🏪 Admin: fallback local market reveal');
                    collectState.marketCards = localMarketCards;
                    renderMarketCards(localMarketCards, true);
                    
                    if (window._collectRound1Data) {
                        setTimeout(() => {
                            showCollectRoundOverlay(window._collectRound1Data.round, window._collectRound1Data.stat, window._collectRound1Data.statName);
                            window._collectRound1Data = null;
                        }, 1000);
                    }
                    window._marketRevealed = true;
                }
            }, 5500);
        }
    });
    
    // 🏪 Market reveal synchronisé par le serveur
    socket.on('collect-market-reveal', (data) => {
        console.log('🏪 Admin: market reveal reçu');
        if (window._marketRevealed) return;
        window._marketRevealed = true;
        if (data.marketCards && data.marketCards.length > 0) {
            collectState.marketCards = data.marketCards;
            renderMarketCards(data.marketCards, true);
            
            const round1Data = window._collectRound1Data;
            if (round1Data) {
                setTimeout(() => {
                    showCollectRoundOverlay(round1Data.round, round1Data.stat, round1Data.statName);
                    window._collectRound1Data = null;
                }, 1000);
            }
        }
    });
    
    // 🆕 Gestion de l'annonce de round (rounds 2+ uniquement, round 1 déclenché localement)
    socket.on('collect-player-played', (data) => {
        // Le joueur a joué — l'indicateur reste actif car c'était son tour
        // L'indicateur sera désactivé quand le tour suivant commencera
        
        // Animation pour les autres joueurs uniquement
        if (twitchUser && data.twitchId === twitchUser.id) return;
        
        // Pas d'animation de vol pour les échanges marché
        if (data.isSwap) return;
        
        // Trouver le siège du joueur
        const seatEl = document.querySelector(`.collect-player-seat[data-twitch-id="${data.twitchId}"]`);
        const slotEl = document.getElementById('collectCenterSlot');
        if (!seatEl || !slotEl) return;
        
        // Vol de carte du siège vers le slot
        const flightDur = 280;
        window._cardFlightPending = data.twitchId;
        animateCardToSlot(seatEl, slotEl, flightDur, (flyerEl) => {
            window._cardFlightPending = null;
            if (data.isDiscard) {
                // Défausse → retirer le flyer + shatter
                if (flyerEl) flyerEl.remove();
                const rect = slotEl.getBoundingClientRect();
                playAdminShatterEffect(rect.left + rect.width / 2, rect.top + rect.height / 2);
            } else {
                // Fusion → garder le flyer en place, star-gain le retirera
                window._cardFlyer = flyerEl;
                // Safety: retirer après 2s si star-gain ne vient pas
                setTimeout(() => { if (window._cardFlyer === flyerEl) { flyerEl.remove(); window._cardFlyer = null; } }, 2000);
            }
        }, true); // keepAlive = true
    });

    // ⭐ Gain d'étoile (Lien/Collect validé)
    socket.on('collect-star-gain', (data) => {
        console.log(`⭐ ${data.username} gagne ${data.starsGained} étoile(s) (${data.fusionType})`);
        const isCollect = data.fusionType === 'collect';
        const isMe = twitchUser && data.twitchId === twitchUser.id;
        
        // Update playersData wins
        const playerInState = collectState.playersData.find(p => p.twitchId === data.twitchId);
        if (playerInState) playerInState.wins = data.totalStars;
        
        const slotEl = document.getElementById('collectCenterSlot');
        
        // Find target star elements
        let starEls = [];
        let seatEl = null;
        if (isMe) {
            seatEl = document.getElementById('collectAdminPovSeat');
        } else {
            seatEl = document.querySelector(`.collect-player-seat[data-twitch-id="${data.twitchId}"]`);
        }
        if (seatEl) {
            const allStars = seatEl.querySelectorAll('.collect-star:not(.won)');
            starEls = Array.from(allStars).slice(0, data.starsGained);
        }
        
        // If card was already visible (isMe), shatter fast. If other player, wait for flight then render.
        if (isMe) {
            const cardEl = slotEl ? slotEl.querySelector('.center-played-card') : null;
            setTimeout(() => {
                if (cardEl) collectValidationEffect(cardEl, starEls, isCollect);
                if (slotEl) {
                    slotEl.classList.remove('has-card');
                    const inner = slotEl.querySelector('.center-slot-inner');
                    if (inner) inner.innerHTML = '';
                }
            }, 20);
        } else {
            // Guard against double execution
            const effectKey = '_starGainDone_' + data.twitchId;
            if (window[effectKey]) return;
            window[effectKey] = true;
            setTimeout(() => { delete window[effectKey]; }, 2000);
            
            const doEffect = () => {
                // Clean up flyer
                if (window._cardFlyer) {
                    window._cardFlyer.remove();
                    window._cardFlyer = null;
                }
                
                // Render fusion card in slot
                let cardEl = null;
                if (slotEl && data.playedCard) {
                    slotEl.classList.add('has-card');
                    const statIcon = slotEl.querySelector('.slot-stat-icon');
                    if (statIcon) statIcon.classList.remove('show');
                    const inner = slotEl.querySelector('.center-slot-inner');
                    if (inner) {
                        inner.innerHTML = buildCenterCardHTML(data.playedCard);
                        cardEl = inner.querySelector('.center-played-card');
                    }
                }
                
                // Wait for paint then shatter
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            if (cardEl) collectValidationEffect(cardEl, starEls, isCollect);
                            if (slotEl) {
                                slotEl.classList.remove('has-card');
                                const inner = slotEl.querySelector('.center-slot-inner');
                                if (inner) inner.innerHTML = '';
                            }
                        }, 80);
                    });
                });
            };
            
            // Wait for card flight to finish if in progress
            let effectRan = false;
            const runOnce = () => {
                if (effectRan) return;
                effectRan = true;
                doEffect();
            };
            
            if (window._cardFlightPending === data.twitchId) {
                const waitForFlight = setInterval(() => {
                    if (!window._cardFlightPending) {
                        clearInterval(waitForFlight);
                        runOnce();
                    }
                }, 20);
                // Safety timeout
                setTimeout(() => { clearInterval(waitForFlight); runOnce(); }, 500);
            } else {
                runOnce();
            }
        }
    });

    // 🎴 Tour par tour : un joueur commence son tour
    // 🧹 Nettoyage des éléments d'effet orphelins
    function cleanupCollectOrphans() {
        const selectors = [
            '.shatter-flash',
            '.shatter-fragment', 
            '.collect-validation-flash',
            '.collect-star-flyer',
            '.collect-star-burst-wrap',
            '.collect-card-flight-flyer',
            '.draw-card-flyer',
            '.drag-ghost',
            '.fusion-flash-overlay',
            '.collect-fusion-burst',
        ];
        const orphans = document.querySelectorAll(selectors.join(','));
        if (orphans.length > 0) {
            console.log(`🧹 Nettoyage: ${orphans.length} élément(s) orphelin(s) supprimé(s)`);
            orphans.forEach(el => el.remove());
        }
        // Reset flight state
        window._cardFlightPending = null;
        if (window._cardFlyer) { window._cardFlyer.remove(); window._cardFlyer = null; }
        // Reset swap highlights
        document.querySelectorAll('.market-card.swap-hover').forEach(el => el.classList.remove('swap-hover'));
    }

    socket.on('collect-turn-start', (data) => {
        // 🧹 Nettoyage avant chaque tour
        cleanupCollectOrphans();
        console.log(`🎴 Tour de ${data.username} (${data.duration}s)`);
        _adminCurrentTurnId = data.twitchId;
        
        // 🎴 Ring progress tracking global
        if (window._adminTurnRingInterval) clearInterval(window._adminTurnRingInterval);
        const turnEndMs = Date.now() + (data.duration || 15) * 1000;
        const turnDuration = data.duration || 15;
        window._adminTurnRingInterval = setInterval(() => {
            const elapsed = turnDuration - ((turnEndMs - Date.now()) / 1000);
            const progress = Math.min(1, Math.max(0, elapsed / turnDuration));
            // Update ring on active player's choose indicator
            document.querySelectorAll('.collect-player-seat').forEach(seat => {
                const ring = seat.querySelector('.choose-ring-progress');
                if (ring) {
                    if (seat.dataset.twitchId === _adminCurrentTurnId) {
                        ring.style.strokeDashoffset = (progress * 91.1).toString();
                    } else {
                        ring.style.strokeDashoffset = '91.1';
                    }
                }
            });
            if (progress >= 1) {
                clearInterval(window._adminTurnRingInterval);
                window._adminTurnRingInterval = null;
            }
        }, 100);
        
        // Activer l'indicateur choose du joueur actif
        document.querySelectorAll('.collect-choose-indicator').forEach(el => {
            el.classList.add('visible');
            el.classList.remove('active');
        });
        document.querySelectorAll('.collect-player-seat').forEach(seat => {
            if (seat.dataset.twitchId === data.twitchId) {
                const ind = seat.querySelector('.collect-choose-indicator');
                if (ind) ind.classList.add('active');
            }
        });
        // Aussi check si c'est le POV admin
        if (twitchUser && data.twitchId === twitchUser.id) {
            // POV admin indicator (pas de choose indicator visible mais on l'a dans la structure)
        }
        
        // Pseudo en jaune pour le joueur actif
        document.querySelectorAll('.collect-player-name').forEach(el => el.classList.remove('turn-active'));
        document.querySelectorAll('.collect-player-seat').forEach(seat => {
            if (seat.dataset.twitchId === data.twitchId) {
                const nameEl = seat.querySelector('.collect-player-name');
                if (nameEl) nameEl.classList.add('turn-active');
            }
        });
        // POV admin name
        if (twitchUser && data.twitchId === twitchUser.id) {
            const povName = document.querySelector('.collect-player-seat.me .collect-player-name');
            if (povName) povName.classList.add('turn-active');
        }
        
        // Show slot + deck
        const slot = document.getElementById('collectCenterSlot');
        if (slot) {
            slot.classList.add('visible');
            const deckEl = document.getElementById('adminCollectDeck');
            if (deckEl) deckEl.classList.add('deck-visible');
        }
        document.querySelectorAll('.collect-choose-indicator').forEach(el => el.classList.add('visible'));
        
        // Gérer cartes admin selon si c'est son tour
        const isAdminTurn = twitchUser && data.twitchId === twitchUser.id;
        const myCards = document.getElementById('adminPovCards');
        
        if (isAdminTurn) {
            // Mon tour → reset état du tour précédent + unlock cartes + timer + deck
            adminCollectCardPlayed = false;
            adminCollectPlayedCardData = null;
            adminCollectTimerExpired = false;
            sessionStorage.removeItem('adminCollectTimerExpired');
            // Vider le slot visuellement
            const slotEl2 = document.getElementById('collectCenterSlot');
            if (slotEl2) {
                slotEl2.classList.remove('has-card');
                const inner = slotEl2.querySelector('.center-slot-inner');
                if (inner) inner.innerHTML = '';
                const statIcon = slotEl2.querySelector('.slot-stat-icon');
                if (statIcon) statIcon.classList.add('show');
            }
            document.querySelectorAll('#adminPovCards .collect-card.large.card-played-out').forEach(el => el.classList.remove('card-played-out'));
            if (myCards) myCards.classList.remove('cards-locked');
            const deckEl2 = document.getElementById('adminCollectDeck');
            if (deckEl2) {
                deckEl2.classList.add('my-turn');
                deckEl2.classList.add('can-draw');
            }
            adminCollectCardPlayed = false;
            startAdminCollectTimer(data.duration || 15);
        } else {
            // Pas mon tour → lock cartes + cacher timer POV + disable deck
            if (myCards) myCards.classList.add('cards-locked');
            const deckEl2 = document.getElementById('adminCollectDeck');
            if (deckEl2) deckEl2.classList.remove('my-turn');
            stopAdminCollectTimer(true);
        }
    });
    
    socket.on('collect-turn-end', () => {
        console.log('🎴 Tous les joueurs ont joué');
        _adminCurrentTurnId = null;
        if (window._adminTurnRingInterval) { clearInterval(window._adminTurnRingInterval); window._adminTurnRingInterval = null; }
        document.querySelectorAll('.collect-choose-indicator').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.collect-player-name').forEach(el => el.classList.remove('turn-active'));
        document.querySelectorAll('.choose-ring-progress').forEach(r => r.style.strokeDashoffset = '91.1');
        const myCards = document.getElementById('adminPovCards');
        if (myCards) myCards.classList.add('cards-locked');
        const deckEl = document.getElementById('adminCollectDeck');
        if (deckEl) deckEl.classList.remove('my-turn');
        stopAdminCollectTimer(true);
    });

    socket.on('collect-timer-start', (data) => {
        // Show choose indicators when timer starts
        document.querySelectorAll('.collect-choose-indicator').forEach(el => el.classList.add('visible'));
        // Re-enable cards (clear any expired/disabled state)
        adminCollectTimerExpired = false;
        sessionStorage.removeItem('adminCollectTimerExpired');
        document.querySelectorAll('#adminPovCards .collect-card.large.card-played-out').forEach(el => el.classList.remove('card-played-out'));
        const myCards = document.getElementById('adminPovCards');
        if (myCards) myCards.classList.remove('cards-locked'); // 🔓 Unlock cards
        // Show slot + stat icon (needed after reconnect during deal)
        const slot = document.getElementById('collectCenterSlot');
        if (slot) {
            slot.classList.add('visible');
            // Show deck alongside slot
            const deckEl = document.getElementById('adminCollectDeck');
            if (deckEl) deckEl.classList.add('deck-visible');
            if (collectState.selectedStat) {
                let iconEl = slot.querySelector('.slot-stat-icon');
                if (!iconEl) {
                    iconEl = document.createElement('div');
                    iconEl.className = 'slot-stat-icon';
                    slot.appendChild(iconEl);
                }
                iconEl.innerHTML = `<svg viewBox="0 0 24 32" fill="none" width="24" height="32"><rect x="2" y="2" width="20" height="28" rx="3" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.1"/><path d="M12 9l1.76 3.57 3.94.57-2.85 2.78.67 3.93L12 17.77l-3.52 1.85.67-3.93-2.85-2.78 3.94-.57L12 9z" fill="currentColor" fill-opacity="0.5"/></svg>`;
                iconEl.classList.add('show');
            }
        }
        if (!adminCollectCardPlayed) startAdminCollectTimer(data.duration || 15);
    });

    socket.on('collect-round-start', (data) => {
        console.log('🎲 Round start:', data);
        showCollectRoundOverlay(data.round, data.stat, data.statName);
    });
    
    socket.on('collect-state', (data) => {
        console.log('🎴 État Collect reçu:', data);
        if (data.active) {
            // Nettoyer session timer avant le render pour éviter le flash
            const isAdminTurnEarly = twitchUser && data.currentTurnId === twitchUser.id;
            if (!isAdminTurnEarly) {
                sessionStorage.removeItem('adminCollectTimerEndMs');
                sessionStorage.removeItem('adminCollectTimerDuration');
                adminCollectCardPlayed = true;
            }
            showCollectTable(data);
            
            // Restaurer les cartes marché (sans animation)
            if (data.marketCards && data.marketCards.length > 0) {
                setTimeout(() => renderMarketCards(data.marketCards, false), 100);
            }
            
            // Restaurer slot + stat après reconnect
            if (data.roundStat) {
                collectState.selectedStat = data.roundStat;
                collectState.currentRound = data.currentRound || 0;
                setTimeout(() => {
                    const slot = document.getElementById('collectCenterSlot');
                    if (slot && data.currentRound > 0) {
                        slot.classList.add('visible');
                        const deckEl = document.getElementById('adminCollectDeck');
                        if (deckEl) deckEl.classList.add('deck-visible');
                        let iconEl = slot.querySelector('.slot-stat-icon');
                        if (!iconEl) {
                            iconEl = document.createElement('div');
                            iconEl.className = 'slot-stat-icon';
                            slot.appendChild(iconEl);
                        }
                        iconEl.innerHTML = `<svg viewBox="0 0 24 32" fill="none" width="24" height="32"><rect x="2" y="2" width="20" height="28" rx="3" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.1"/><path d="M12 9l1.76 3.57 3.94.57-2.85 2.78.67 3.93L12 17.77l-3.52 1.85.67-3.93-2.85-2.78 3.94-.57L12 9z" fill="currentColor" fill-opacity="0.5"/></svg>`;
                        iconEl.classList.add('show');
                    }
                    document.querySelectorAll('.collect-choose-indicator').forEach(el => el.classList.add('visible'));
                    
                    // 🎴 Restaurer le tour en cours
                    if (data.currentTurnId) {
                        _adminCurrentTurnId = data.currentTurnId;
                        // Choose indicator actif sur le joueur en cours
                        document.querySelectorAll('.collect-player-seat').forEach(seat => {
                            if (seat.dataset.twitchId === data.currentTurnId) {
                                const ind = seat.querySelector('.collect-choose-indicator');
                                if (ind) ind.classList.add('active');
                            }
                        });
                        // Pseudo en jaune
                        document.querySelectorAll('.collect-player-seat').forEach(seat => {
                            if (seat.dataset.twitchId === data.currentTurnId) {
                                const nameEl = seat.querySelector('.collect-player-name');
                                if (nameEl) nameEl.classList.add('turn-active');
                            }
                        });
                        if (twitchUser && data.currentTurnId === twitchUser.id) {
                            const povName = document.querySelector('.collect-player-seat.me .collect-player-name');
                            if (povName) povName.classList.add('turn-active');
                        }
                        
                        // 🎴 Restaurer le ring progress
                        if (data.timerRemainingMs > 500) {
                            const totalDuration = 15;
                            const elapsed = totalDuration - (data.timerRemainingMs / 1000);
                            const initProgress = Math.min(1, Math.max(0, elapsed / totalDuration));
                            // Set initial ring offset
                            document.querySelectorAll('.collect-player-seat').forEach(seat => {
                                const ring = seat.querySelector('.choose-ring-progress');
                                if (ring) {
                                    if (seat.dataset.twitchId === data.currentTurnId) {
                                        ring.style.strokeDashoffset = (initProgress * 91.1).toString();
                                    } else {
                                        ring.style.strokeDashoffset = '91.1';
                                    }
                                }
                            });
                            // Start interval
                            if (window._adminTurnRingInterval) clearInterval(window._adminTurnRingInterval);
                            const turnEndMs = Date.now() + data.timerRemainingMs;
                            window._adminTurnRingInterval = setInterval(() => {
                                const e = totalDuration - ((turnEndMs - Date.now()) / 1000);
                                const progress = Math.min(1, Math.max(0, e / totalDuration));
                                document.querySelectorAll('.collect-player-seat').forEach(seat => {
                                    const ring = seat.querySelector('.choose-ring-progress');
                                    if (ring) {
                                        if (seat.dataset.twitchId === _adminCurrentTurnId) {
                                            ring.style.strokeDashoffset = (progress * 91.1).toString();
                                        } else {
                                            ring.style.strokeDashoffset = '91.1';
                                        }
                                    }
                                });
                                if (progress >= 1) {
                                    clearInterval(window._adminTurnRingInterval);
                                    window._adminTurnRingInterval = null;
                                }
                            }, 100);
                        }
                    }
                    
                    const isAdminTurn = twitchUser && data.currentTurnId === twitchUser.id;
                    const adminHasPlayed = twitchUser && (data.playersWhoPlayed || []).includes(twitchUser.id);
                    
                    // Bloquer par défaut, débloquer seulement si c'est le tour
                    adminCollectCardPlayed = true;
                    const myCards = document.getElementById('adminPovCards');
                    if (myCards) myCards.classList.add('cards-locked');
                    stopAdminCollectTimer(true);
                    sessionStorage.removeItem('adminCollectTimerEndMs');
                    sessionStorage.removeItem('adminCollectTimerDuration');
                    
                    if (data.timerRemainingMs > 1000 && isAdminTurn && !data.playedCard && !adminHasPlayed) {
                        adminCollectCardPlayed = false;
                        adminCollectTimerExpired = false;
                        sessionStorage.removeItem('adminCollectTimerExpired');
                        document.querySelectorAll('#adminPovCards .collect-card.large.card-played-out').forEach(el => el.classList.remove('card-played-out'));
                        if (myCards) myCards.classList.remove('cards-locked');
                        const deckEl2 = document.getElementById('adminCollectDeck');
                        if (deckEl2) {
                            deckEl2.classList.add('my-turn');
                            deckEl2.classList.add('can-draw');
                        }
                        startAdminCollectTimer(Math.ceil(data.timerRemainingMs / 1000));
                    } else {
                        const deckEl2 = document.getElementById('adminCollectDeck');
                        if (deckEl2) deckEl2.classList.remove('my-turn');
                    }
                    
                    // Restaurer carte jouée dans le slot si déjà placée
                    if (data.playedCard) {
                        adminCollectCardPlayed = true;
                        adminCollectPlayedCardData = data.playedCard;
                        const slotEl = document.getElementById('collectCenterSlot');
                        if (slotEl) {
                            slotEl.classList.add('has-card');
                            const statIcon = slotEl.querySelector('.slot-stat-icon');
                            if (statIcon) statIcon.classList.remove('show');
                            const inner = slotEl.querySelector('.center-slot-inner');
                            if (inner) {
                                inner.innerHTML = buildCenterCardHTML(data.playedCard);
                                const centerCard = inner.querySelector('.center-played-card');
                                if (centerCard) {
                                    centerCard.style.cursor = 'pointer';
                                    centerCard.addEventListener('mouseenter', () => showAdminCardPreview(data.playedCard));
                                    centerCard.addEventListener('mouseleave', () => hideAdminCardPreview());
                                }
                            }
                            // Griser les cartes en main
                            document.querySelectorAll('#adminPovCards .collect-card.large').forEach(el => {
                                el.classList.add('card-played-out');
                            });
                        }
                    } else if (adminHasPlayed) {
                        // Défausse — pas de carte dans le slot, juste griser les cartes
                        adminCollectCardPlayed = true;
                        adminCollectPlayedCardData = null;
                        document.querySelectorAll('#adminPovCards .collect-card.large').forEach(el => {
                            el.classList.add('card-played-out');
                        });
                    }
                }, 200);
            }
        } else if (currentGameMode === 'collect') {
            returnToIdle();
        }
    });
    
    // 🎴 Recevoir mes cartes quand admin est joueur
    socket.on('collect-your-cards', (data) => {
        console.log('🎴 Admin cartes reçues:', data.cards, 'dealing:', data.dealing);
        const isDealing = data.dealing === true;
        
        if (isDealing && adminDealStarted) {
            console.log('🎴 Admin: deal déjà programmé, ignoré');
            return;
        }
        if (isDealing) adminDealStarted = true;
        
        adminCollectCards = data.cards || [];
        renderAdminPOVCards(isDealing);
        
        // Si déjà joué ce round, griser les cartes après rendu
        if (adminCollectCardPlayed && !isDealing) {
            setTimeout(() => {
                document.querySelectorAll('#adminPovCards .collect-card.large').forEach(el => {
                    el.classList.add('card-played-out');
                });
            }, 50);
        }
    });
    
    socket.on('collect-update', (data) => {
        console.log('🎴 Update Collect:', data);
        updateCollectTable(data);
    });
    

    
    socket.on('collect-round-result', (data) => {
        console.log('🎴 Round result (admin):', data);
        if (data.playersData) {
            collectState.playersData = data.playersData;
        }
        updateCollectTable(data);
    });
    
    socket.on('collect-new-round', (data) => {
        console.log('🎴 Nouveau round (admin):', data);
        showCollectTable(data);
    });

    // 🎴 Serveur indique pioche disponible
    socket.on('collect-can-draw', (data) => {
        console.log('🎴 Admin: pioche disponible, cardPlayed:', adminCollectCardPlayed);
        if (adminCollectCardPlayed) return; // Déjà joué/défaussé
        const deckEl = document.getElementById('adminCollectDeck');
        if (deckEl) deckEl.classList.add('can-draw');
    });

    // 🎴 Main pleine
    socket.on('collect-draw-full', () => {
        console.log('🎴 Admin: main pleine');
        const deckEl = document.getElementById('adminCollectDeck');
        if (deckEl) {
            deckEl.classList.add('deck-full-shake');
            setTimeout(() => deckEl.classList.remove('deck-full-shake'), 1200);
        }
    });

    // 🎴 Options de pioche (2 cartes)
    // 🎴 Résultat de pioche (1 carte)
    socket.on('collect-draw-result', (data) => {
        console.log('🎴 Admin: carte piochée:', data.card.name);
        const deckEl = document.getElementById('adminCollectDeck');
        if (deckEl) deckEl.classList.remove('can-draw');
        
        // Verrouiller immédiatement (la pioche = action du tour)
        adminCollectCardPlayed = true;
        const myCards = document.getElementById('adminPovCards');
        if (myCards) myCards.classList.add('cards-locked');
        if (deckEl) deckEl.classList.remove('my-turn');
        
        // Lancer l'animation de vol vers la main
        animateCardToHand(data.card, deckEl);
    });

    // 🔄 Mise à jour du marché (après un échange par n'importe quel joueur)
    socket.on('collect-market-update', (data) => {
        console.log(`🔄 Admin: marché mis à jour par ${data.username}`);
        collectState.marketCards = data.marketCards || [];
        // Re-render seulement si ce n'est pas l'admin qui a fait le swap (déjà fait en local)
        if (!twitchUser || data.twitchId !== twitchUser.id) {
            renderMarketCards(collectState.marketCards, false);
            updateMarketMatchGlow();
        }
    });

    // 🔄 Confirmation d'échange marché
    socket.on('collect-swap-confirmed', (data) => {
        if (!data.success) {
            console.log('⚠️ Admin: échange refusé:', data.reason);
        }
    });

    // 🃏 Mise à jour du nombre de cartes de chaque joueur
    socket.on('collect-card-counts', (counts) => {
        document.querySelectorAll('.collect-player-seat:not(.me)').forEach(seat => {
            const tid = seat.dataset.twitchId;
            if (!tid || counts[tid] === undefined) return;
            const cardsContainer = seat.querySelector('.collect-player-cards');
            if (!cardsContainer) return;
            const currentCount = cardsContainer.querySelectorAll('.collect-player-card-small').length;
            const newCount = counts[tid];
            if (currentCount === newCount) return;
            // Rebuild small cards
            cardsContainer.innerHTML = '<div class="collect-player-card-small"></div>'.repeat(newCount);
        });
    });
    
    socket.on('collect-game-ended', (data) => {
        console.log('🏆 Collect terminé:', data);
        displayCollectWinner(data);
    });
    
    // 🆕 Handler pour le texte tapé en temps réel
    socket.on('bombanime-typing', (data) => {
        const playerSlot = document.querySelector(`.player-slot[data-twitch-id="${data.playerTwitchId}"]`);
        if (playerSlot) {
            let typingEl = playerSlot.querySelector('.player-typing');
            if (!typingEl) {
                typingEl = document.createElement('div');
                typingEl.className = 'player-typing';
                playerSlot.appendChild(typingEl);
            }
            typingEl.textContent = data.text || '';
            typingEl.classList.remove('last-answer');
            typingEl.classList.toggle('has-text', !!data.text);
        }
    });

    socket.on('prepare-next-question', () => {
        console.log('🔄 Préparation question suivante (mode auto)');

        hideGameCloseBtn();

        const questionWrapper = document.getElementById('gameQuestionWrapper');
        const mainPanel = document.getElementById('gameMainPanel');
        const questionActions = document.getElementById('questionActions');

        // Cacher le contenu
        const questionText = document.getElementById('questionText');
        const answersGrid = document.getElementById('answersGrid');
        const questionBadges = document.querySelector('.question-badges-row');

        if (questionText) questionText.style.opacity = '0';
        if (answersGrid) answersGrid.style.opacity = '0';
        if (questionBadges) questionBadges.style.opacity = '0';

        // Lancer l'animation de fermeture
        if (questionActions) questionActions.classList.remove('visible');
        if (questionWrapper) questionWrapper.classList.add('closing');
        if (mainPanel) mainPanel.classList.add('closing');

        // Nettoyer après l'animation
        setTimeout(() => {
            if (questionWrapper) questionWrapper.classList.remove('closing', 'shifted');
            if (mainPanel) mainPanel.classList.remove('visible', 'closing');
        }, 400);
    });
    
    // 🆕 Demander l'état BombAnime à la connexion (pour la reconnexion)
    socket.on('connect', () => {
        console.log('🔌 Socket connecté - Demande état BombAnime');
        
        // Si l'admin était joueur bombanime, remap le socket d'abord
        const wasAdminBombanimePlayer = sessionStorage.getItem('adminBombanimePlayer');
        if (wasAdminBombanimePlayer === 'true' && twitchUser) {
            socket.emit('reconnect-player', {
                twitchId: twitchUser.id,
                username: twitchUser.display_name
            });
            console.log('💣 Admin-player: reconnect-player émis pour remap socket');
        }
        
        socket.emit('bombanime-get-state');
    });
}


function closeLobbyUI() {

    // Reset admin join state
    resetAdminJoinState();

    // Reset Collect hand size
    collectHandSize = 3;
    const collectHandValueEl = document.getElementById('collectHandValue');
    if (collectHandValueEl) collectHandValueEl.textContent = '3';
    document.querySelectorAll('#collectHandGroup .setting-option-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === '3');
    });

    // Reset anime filter (tous cochés par défaut)
    collectSelectedAnimes = new Set(COLLECT_ALL_ANIMES.map(a => a.id));
    document.querySelectorAll('.anime-filter-item').forEach(item => {
        item.classList.add('checked');
    });
    updateAnimeCount();
    const animePanel = document.getElementById('animeFilterPanel');
    if (animePanel) animePanel.style.display = 'none';
    const animeChevron = document.getElementById('animeFilterChevron');
    if (animeChevron) animeChevron.classList.remove('open');

    // Vider la grille des joueurs
    const grid = document.getElementById('playersGridLobby');
    if (grid) grid.innerHTML = '';
    document.getElementById('lobbyPlayerCount').textContent = '0';

    // 🆕 Cacher le badge de mode
    const modeBadgeHeader = document.getElementById('modeBadgeHeader');
    if (modeBadgeHeader) modeBadgeHeader.style.display = 'none';

    // 🆕 Reset les éléments d'équipe
    const teamsGroup = document.getElementById('teamsGroup');
    if (teamsGroup) teamsGroup.style.display = 'none';
    const teamCounters = document.getElementById('teamCounters');
    if (teamCounters) teamCounters.remove();

    anime({
        targets: stateLobby,
        opacity: [1, 0],
        duration: 400,
        easing: 'easeOutQuad',
        complete: () => {
            stateLobby.classList.remove('active');
            stateLobby.style.opacity = '';
            stateIdle.style.display = 'grid';
            
            // 🆕 Réafficher le bouton déconnexion
            const logoutBtn = document.getElementById('headerLogoutBtn');
            if (logoutBtn) logoutBtn.style.display = 'flex';
            
            // 🆕 Réafficher le bouton Twitch
            const twitchBtn = document.getElementById('twitchConnectBtn');
            if (twitchBtn) twitchBtn.style.display = 'flex';

            // Réafficher les panneaux latéraux
            recentPanel.classList.remove('hidden');
            lastgamePanel.classList.remove('hidden');
            recentPanel.style.opacity = '1';
            lastgamePanel.style.opacity = '1';

            // Reset background text
            bgText.textContent = 'MASTER';
            bgText.classList.remove('lobby-active');
            statusDot.classList.remove('active');
            statusText.textContent = 'Inactif';

            // Réactiver le pulse du bouton
            btnWrapper.classList.add('pulse-active');

            // 🔥 NOUVEAU: Relancer l'animation des particules
            movementFadeIn = 0; // Reset le fade-in
            startContinuousAnimation();

            // Réafficher le bouton JOUER
            const mainBtn = document.querySelector('.main-action-btn');
            if (mainBtn) {
                mainBtn.style.opacity = '1';
                mainBtn.style.transform = 'scale(1)';
            }

            // Réafficher le personnage chibi
            const btnCharacter = document.querySelector('.btn-character');
            if (btnCharacter) {
                btnCharacter.style.opacity = '0.95';
                btnCharacter.style.visibility = 'visible';
                btnCharacter.classList.add('visible');
            }

            // Réafficher les particules
            document.querySelectorAll('.btn-wrapper .particle').forEach(p => {
                p.style.opacity = '0.6';
            });

            // Animations de retour
            anime({
                targets: '.idle-main',
                opacity: [0, 1],
                translateY: [20, 0],
                duration: 500,
                easing: 'easeOutCubic'
            });

            anime({
                targets: '.idle-stats',
                opacity: [0, 1],
                duration: 500,
                delay: 100,
                easing: 'easeOutCubic'
            });

            anime({
                targets: '.recent-games-panel',
                opacity: [0, 1],
                translateX: [-40, 0],
                duration: 500,
                delay: 200,
                easing: 'easeOutCubic'
            });

            anime({
                targets: '.lastgame-panel',
                opacity: [0, 1],
                translateX: [40, 0],
                duration: 500,
                delay: 200,
                easing: 'easeOutCubic'
            });
        }
    });
}

// ============================================
// AUTHENTIFICATION
// ============================================

async function handleLogin(event) {
    event.preventDefault();
    const password = document.getElementById('adminCode').value;
    const masterPassword = document.getElementById('masterPassword').value;
    const errorMsg = document.getElementById('errorMsg');

    errorMsg.innerHTML = '';

    try {
        const response = await fetch('/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                password,
                masterOverride: masterPassword || undefined
            })
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('loginContainer').style.display = 'none';

            // Jouer l'intro ou skip
            if (shouldPlayIntro()) {
                document.getElementById('introScreen').style.display = 'flex';
                markIntroPlayed();
                playIntro();
            } else {
                showAdminPanel();
            }
        } else {
            if (data.error === 'admin_already_connected') {
                errorMsg.textContent = 'Un admin est déjà connecté';
                document.getElementById('masterPasswordGroup').style.display = 'block';
            } else {
                errorMsg.textContent = data.message || 'Code incorrect';
            }
        }
    } catch (error) {
        console.error('Erreur login:', error);
        errorMsg.textContent = 'Erreur de connexion';
    }
}

async function checkAuth() {
    try {
        const response = await fetch('/admin/check', { credentials: 'same-origin' });
        const data = await response.json();

        if (data.isAdmin) {
            document.getElementById('loginContainer').style.display = 'none';

            if (shouldPlayIntro()) {
                document.getElementById('introScreen').style.display = 'flex';
                markIntroPlayed();
                playIntro();
            } else {
                showAdminPanel();
            }
        } else {
            document.getElementById('loginContainer').style.display = 'flex';
            document.getElementById('adminCode').focus(); // ← Focus auto
        }
    } catch (error) {
        console.log('Non authentifié');
        document.getElementById('loginContainer').style.display = 'flex';
        document.getElementById('adminCode').focus(); // ← Focus auto
    }
}

function shouldPlayIntro() {
    return !sessionStorage.getItem('introPlayed');
}

function markIntroPlayed() {
    sessionStorage.setItem('introPlayed', 'true');
}


// ============================================
// INTRO ANIMATIONS
// ============================================

function createIntroParticles() {
    const container = document.getElementById('particlesContainer');
    if (!container) return;

    container.innerHTML = '';
    const numParticles = 25;

    for (let i = 0; i < numParticles; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        const size = 2 + Math.random() * 3;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        container.appendChild(particle);
    }
}

function animateIntroParticles() {
    const particles = document.querySelectorAll('.intro-screen .particle');

    particles.forEach((particle, i) => {
        particle.style.opacity = 0.3 + Math.random() * 0.4;

        const anim = anime({
            targets: particle,
            translateY: [0, -30 - Math.random() * 40],
            translateX: [-10 + Math.random() * 20, -10 + Math.random() * 20],
            opacity: [0.3 + Math.random() * 0.3, 0.5 + Math.random() * 0.3],
            duration: 3000 + Math.random() * 2000,
            delay: i * 50,
            easing: 'easeInOutSine',
            loop: true,
            direction: 'alternate'
        });
        particleAnimations.push(anim);
    });
}

function accelerateParticles() {
    particleAnimations.forEach(anim => anim.pause());

    anime({
        targets: '.intro-screen .particle',
        translateY: -window.innerHeight - 100,
        opacity: { value: 0, duration: 1200, easing: 'easeInQuad' },
        duration: 1500,
        easing: 'easeInCubic',
        delay: anime.stagger(20, { from: 'center' })
    });
}

function startIntroIdleAnimation() {
    anime({
        targets: '#ambientGlow',
        opacity: [1, 0.7, 1],
        scale: [1, 1.05, 1],
        duration: 3000,
        easing: 'easeInOutSine',
        loop: true
    });
}

function startTextPulse() {
    anime({
        targets: ['#logoShonen', '#logoMaster'],
        opacity: [0.8, 0.6, 0.8],
        duration: 2000,
        easing: 'easeInOutSine',
        loop: true
    });
}

async function showIntroMessage(text) {
    const msgEl = document.getElementById('messageText');
    if (!msgEl) return;

    msgEl.textContent = text;

    await anime({
        targets: msgEl,
        opacity: [0, 1],
        translateY: [10, 0],
        duration: 400,
        easing: 'easeOutQuad'
    }).finished;
}

async function hideIntroMessage() {
    const msgEl = document.getElementById('messageText');
    if (!msgEl) return;

    await anime({
        targets: msgEl,
        opacity: [1, 0],
        translateY: [0, -10],
        duration: 300,
        easing: 'easeInQuad'
    }).finished;
}

function sleepIntro(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function skipIntro() {
    introCompleted = true;

    anime.remove('.intro-screen .particle');
    anime.remove('#ambientGlow');
    anime.remove('#lightBeam');
    anime.remove('#logoSeparator');
    anime.remove('#logoShonen');
    anime.remove('#logoMaster');
    anime.remove('#paraIcon');
    anime.remove('#messageText');
    anime.remove('.intro-screen');

    particleAnimations.forEach(anim => anim.pause());

    document.getElementById('introScreen').style.display = 'none';
    showAdminPanel();
}

function resetIntroElements() {
    const elements = {
        'ambientGlow': { opacity: '0', transform: 'translate(-50%, -50%) scale(1)' },
        'lightBeam': { opacity: '0', width: '0' },
        'logoSeparator': { height: '0', opacity: '0' },
        'logoShonen': { clipPath: 'inset(0 100% 0 0)', opacity: '0.8' },
        'logoMaster': { clipPath: 'inset(0 100% 0 0)', opacity: '0.8' },
        'paraIcon': { opacity: '0', transform: 'translateY(-15px) rotate(-25deg)' },
        'messageText': { opacity: '0' }
    };

    for (const [id, styles] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) Object.assign(el.style, styles);
    }

    const msgText = document.getElementById('messageText');
    if (msgText) msgText.textContent = '';

    const particlesContainer = document.getElementById('particlesContainer');
    if (particlesContainer) particlesContainer.innerHTML = '';

    particleAnimations = [];
}

async function playIntro() {
    introStartTime = Date.now();
    introCompleted = false;

    resetIntroElements();
    createIntroParticles();
    animateIntroParticles();

    // 1. Glow ambiant
    anime({
        targets: '#ambientGlow',
        opacity: [0, 1],
        duration: 2000,
        easing: 'easeOutQuad'
    });

    await sleepIntro(300);

    // 2. Trait de lumière + Message 1
    anime({
        targets: '#lightBeam',
        opacity: [0, 1, 0.4],
        width: [0, 600],
        duration: 600,
        easing: 'easeOutQuad'
    });

    showIntroMessage(introMessages[0]);

    // 3. Séparateur
    await sleepIntro(50);
    anime({
        targets: '#logoSeparator',
        height: [0, 50],
        opacity: [0, 1],
        duration: 400,
        easing: 'easeOutQuad'
    });

    await sleepIntro(30);

    // 4. SHONEN
    anime({
        targets: '#logoShonen',
        clipPath: ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'],
        duration: 1200,
        easing: 'easeOutQuad'
    });

    startTextPulse();

    await sleepIntro(200);

    // 5. MASTER
    anime({
        targets: '#logoMaster',
        clipPath: ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'],
        duration: 1200,
        easing: 'easeOutQuad'
    });

    // 6. Message 2
    await sleepIntro(300);
    await hideIntroMessage();
    await sleepIntro(50);
    await showIntroMessage(introMessages[1]);

    // 7. Parapluie
    await sleepIntro(200);
    anime({
        targets: '#paraIcon',
        opacity: [0, 0.85],
        translateY: [-15, 0],
        rotate: [-25, -15],
        duration: 700,
        easing: 'easeOutQuad'
    });

    // 8. Message 3
    await sleepIntro(400);
    await hideIntroMessage();
    await sleepIntro(50);
    await showIntroMessage(introMessages[2]);

    // 9. Idle animation
    await sleepIntro(300);
    startIntroIdleAnimation();

    await sleepIntro(400);

    // 10. Message 4
    await hideIntroMessage();
    await sleepIntro(50);
    await showIntroMessage(introMessages[3]);

    await sleepIntro(600);

    // 11. Accélérer particules
    await hideIntroMessage();
    accelerateParticles();

    await sleepIntro(800);

    // 12. Fade out
    anime({
        targets: '.intro-screen',
        opacity: [1, 0],
        duration: 800,
        easing: 'easeInOutQuad',
        complete: () => {
            introCompleted = true;
            document.getElementById('introScreen').style.display = 'none';
        }
    });

    await sleepIntro(300);
    showAdminPanel();
}


// Skip intro si trop long
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && introStartTime && !introCompleted) {
        const elapsed = Date.now() - introStartTime;
        if (elapsed > MAX_INTRO_DURATION) {
            console.log('⏭️ Intro trop longue, skip vers le panel');
            skipIntro();
        }
    }
    
    // 💣 BombAnime: Re-focus et re-enable l'input admin si c'est mon tour
    if (document.visibilityState === 'visible' && bombanimeState.isAdminPlayer && bombanimeState.isMyTurn) {
        setTimeout(() => {
            const input = document.getElementById('bombanimeAdminInputField');
            if (input) {
                input.disabled = false;
                input.removeAttribute('disabled');
                input.classList.remove('disabled');
                input.focus();
            }
        }, 300);
    }
    
    // 🎴 Collect: Vérifier si le timer a expiré pendant que l'onglet était en background
    if (document.visibilityState === 'visible' && _adminCollectTimerEndMs) {
        _checkAdminCollectTimerTick();
    }
    // 🎴 Collect: Si timer déjà expiré, s'assurer que les cartes sont grisées (rattrapage)
    if (document.visibilityState === 'visible' && adminCollectTimerExpired && !adminCollectCardPlayed) {
        document.querySelectorAll('#adminPovCards .collect-card.large:not(.card-played-out)').forEach(el => el.classList.add('card-played-out'));
    }
});


// ============================================
// AFFICHAGE PANEL ADMIN
// ============================================

async function showAdminPanel() {
    // Initialiser Socket.io
    initSocket();

    // Charger les données
    await loadIdleData();

    // Restaurer l'état du jeu AVANT d'afficher quoi que ce soit
    const restored = await restoreGameState();

    // Si l'état a été restauré (lobby/game), ne pas afficher idle
    if (restored) {
        document.getElementById('mainHeader').style.display = '';
        document.getElementById('mainContainer').style.display = '';
        document.getElementById('bgText').style.display = '';
        return;
    }

    // Sinon, afficher l'état idle normal
    document.getElementById('mainHeader').style.display = '';
    document.getElementById('mainContainer').style.display = '';
    document.getElementById('bgText').style.display = '';

    startIdleAnimations();


}

function initPanel() {
    // Afficher le contenu principal
    document.getElementById('mainHeader').style.display = '';
    document.getElementById('mainContainer').style.display = '';
    document.getElementById('bgText').style.display = '';  // ← Ajouter cette ligne

    // Lancer les animations
    startIdleAnimations();

    // Charger les données
    setTimeout(loadIdleData, 500);
}

// ============================================
// ANIMATIONS IDLE (après login)
// ============================================

function startIdleAnimations() {
    // Animation bouton
    anime({
        targets: '.main-action-btn',
        scale: [0, 1],
        opacity: [0, 1],
        duration: 650,
        easing: 'easeOutBack',
        delay: 300,
        complete: () => {
            const wrapper = document.getElementById('btnWrapper');
            if (wrapper) wrapper.classList.add('pulse-active');
        }
    });

    // Badge Mode
    const modeBadge = document.getElementById('modeBadge');
    if (modeBadge) {
        setTimeout(() => {
            modeBadge.classList.add('visible');
            anime({
                targets: modeBadge,
                opacity: [0, 1],
                translateX: [-20, 0],
                duration: 400,
                easing: 'easeOutCubic'
            });
        }, 800);
    }

    // Personnage
    const btnCharacter = document.querySelector('.btn-character');
    if (btnCharacter) {
        btnCharacter.style.opacity = '0';
        btnCharacter.style.zIndex = '0';
        btnCharacter.style.visibility = 'hidden';

        setTimeout(() => {
            btnCharacter.style.visibility = 'visible';
            anime({
                targets: '.btn-character',
                opacity: [0, 0.95],
                translateY: [50, 0],
                scale: [0.85, 1],
                duration: 550,
                easing: 'easeOutCubic',
                complete: () => {
                    btnCharacter.style.zIndex = '10';
                    btnCharacter.classList.add('visible');
                }
            });
        }, 1150);
    }

    // Stats
    anime({
        targets: '.idle-stats',
        opacity: [0, 1],
        translateY: [30, 0],
        duration: 600,
        easing: 'easeOutCubic',
        delay: 500
    });

    // Panneau récentes
    anime({
        targets: '.recent-games-panel',
        opacity: [0, 1],
        translateX: [-40, 0],
        duration: 600,
        easing: 'easeOutCubic',
        delay: 400
    });

    anime({
        targets: '.recent-game-item',
        opacity: [0, 1],
        translateX: [-20, 0],
        delay: anime.stagger(80, { start: 600 }),
        duration: 400,
        easing: 'easeOutCubic'
    });

    // Leaderboard
    anime({
        targets: '.lastgame-panel',
        opacity: [0, 1],
        translateX: [40, 0],
        duration: 600,
        easing: 'easeOutCubic',
        delay: 400
    });

    anime({
        targets: '.lastgame-item',
        opacity: [0, 1],
        translateX: [20, 0],
        delay: anime.stagger(50, { start: 600 }),
        duration: 400,
        easing: 'easeOutCubic'
    });

    // Particules idle
    anime({
        targets: '.particles-container .particle',
        opacity: [0, 0.6],
        scale: [0, 1],
        delay: anime.stagger(100, { start: 1200 }),
        duration: 600,
        easing: 'easeOutCubic',
        complete: startContinuousAnimation
    });
}

// Vérifier l'auth au chargement
document.addEventListener('DOMContentLoaded', checkAuth);

// Chrome GPU Tip - copy link to clipboard
const chromeGpuLink = document.getElementById('chromeGpuLink');
if (chromeGpuLink) {
    chromeGpuLink.addEventListener('click', (e) => {
        e.preventDefault();
        navigator.clipboard.writeText('chrome://settings/system').then(() => {
            const tip = chromeGpuLink.closest('.chrome-gpu-tip');
            const originalText = tip.querySelector('span').innerHTML;
            tip.querySelector('span').innerHTML = '✓ Lien copié — colle-le dans ta barre d\'adresse Chrome';
            tip.classList.add('copied');
            setTimeout(() => {
                tip.classList.add('fade-out');
                setTimeout(() => tip.remove(), 500);
            }, 1500);
        });
    });
}

// ============================================
// CHARGEMENT DONNÉES RÉELLES - IDLE
// ============================================

async function loadIdleData() {
    try {
        // Charger stats générales
        const statsResponse = await fetch('/admin/stats', { credentials: 'same-origin' });
        if (statsResponse.ok) {
            const stats = await statsResponse.json();

            // Mettre à jour les stats sous le bouton
            const statValues = document.querySelectorAll('.idle-stat-value');
            setTimeout(() => {
                if (statValues[0]) animateCounter(statValues[0], stats.totalGames || 0, 1200);
            }, 600);

            // Mettre à jour le leaderboard
            if (stats.topPlayers && stats.topPlayers.length > 0) {
                populateLeaderboard(stats.topPlayers);
            }

            // Mettre à jour les parties récentes
            if (stats.recentGames && stats.recentGames.length > 0) {
                populateRecentGames(stats.recentGames);
            }
        }

        // Charger stats DB (nombre de questions ET joueurs)
        const dbStatsResponse = await fetch('/admin/db-stats', { credentials: 'same-origin' });
        if (dbStatsResponse.ok) {
            const dbStats = await dbStatsResponse.json();
            const statValues = document.querySelectorAll('.idle-stat-value');

            // 🆕 Arrondir à la centaine inférieure
            const roundedPlayers = Math.floor((dbStats.totalPlayers || 0) / 100) * 100;
            const roundedQuestions = Math.floor((dbStats.totalQuestions || 0) / 100) * 100 + 300;

            setTimeout(() => {
                if (statValues[1]) animateCounter(statValues[1], formatPlayerCount(roundedPlayers), 1200, '+');
                if (statValues[2]) animateCounter(statValues[2], roundedQuestions, 1200, '+');
            }, 600);
        }

        return true; // Données chargées
    } catch (error) {
        console.error('❌ Erreur chargement données Idle:', error);

        // Fallback en cas d'erreur
        const statValues = document.querySelectorAll('.idle-stat-value');
        if (statValues[0]) statValues[0].textContent = '0';
        if (statValues[1]) statValues[1].textContent = '0';
        if (statValues[2]) statValues[2].textContent = '+0';

        return false;
    }
}

function formatPlayerCount(count) {
    if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
}

function formatTimeAgo(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `Il y a ${diffMins}min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return 'Hier';
    return `Il y a ${diffDays}j`;
}

// Peupler le leaderboard avec les vraies données
function populateLeaderboard(players) {
    const list = document.getElementById('lastgameList');
    if (!list) return;
    list.innerHTML = '';

    // Créer les items originaux (sans doublons pour "Tous")
    const items = players.map((player, index) => ({
        player,
        rank: index + 1,
        isOriginal: true
    }));

    // Ajouter les doublons pour le scroll infini (Top 10)
    const duplicates = players.map((player, index) => ({
        player,
        rank: index + 1,
        isOriginal: false
    }));

    const allItems = [...items, ...duplicates];

    // Mélanger SEULEMENT les originaux pour l'affichage initial
    const shuffledOriginals = items.sort(() => Math.random() - 0.5);

    // Créer tous les éléments DOM
    allItems.forEach((item) => {
        const elem = document.createElement('div');
        elem.className = `lastgame-item ${getRankClass(item.rank)}`;
        elem.dataset.playerRank = item.rank;
        elem.dataset.playerName = item.player.username;
        elem.dataset.twitchId = item.player.twitch_id;
        elem.dataset.duplicate = item.isOriginal ? 'false' : 'true';

        const badgeNumber = getRankBadgeNumber(item.rank);
        const badgeHtml = badgeNumber ? `<span class="lastgame-rank-badge">${badgeNumber}</span>` : '';

        elem.innerHTML = `<div class="lastgame-name">${item.player.username}${badgeHtml}</div>`;

        // Par défaut : cacher les doublons, afficher les originaux
        elem.style.display = item.isOriginal ? 'flex' : 'none';

        list.appendChild(elem);
    });

    // Réordonner visuellement les originaux (mélangés)
    shuffledOriginals.forEach(item => {
        const elem = list.querySelector(`.lastgame-item[data-player-name="${item.player.username}"][data-duplicate="false"]`);
        if (elem) list.appendChild(elem);
    });

    // Réattacher les events
    setupPlayerCardEvents();
    setupLeaderboardFilters();
}


function setupLeaderboardFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Retirer active des autres
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.dataset.filter;
            const list = document.getElementById('lastgameList');
            const allItems = Array.from(list.querySelectorAll('.lastgame-item'));

            if (filter === 'all') {
                // "Tous" - Seulement les originaux (pas les doublons), mélangés
                const originalItems = allItems.filter(item => item.dataset.duplicate === 'false');
                const duplicateItems = allItems.filter(item => item.dataset.duplicate === 'true');

                // Cacher les doublons
                duplicateItems.forEach(item => {
                    item.style.display = 'none';
                });

                // Mélanger et afficher les originaux
                const shuffledItems = originalItems.sort(() => Math.random() - 0.5);

                shuffledItems.forEach((item, index) => {
                    item.style.display = 'flex';
                    list.appendChild(item);

                    anime({
                        targets: item,
                        opacity: [0, 1],
                        translateX: [20, 0],
                        duration: 300,
                        delay: index * 15,
                        easing: 'easeOutCubic'
                    });
                });

            } else {
                // "Top 10" - Trier par rang, afficher doublons pour scroll infini
                const sortedItems = allItems.sort((a, b) => {
                    const rankA = parseInt(a.dataset.playerRank);
                    const rankB = parseInt(b.dataset.playerRank);
                    const dupA = a.dataset.duplicate === 'true' ? 1 : 0;
                    const dupB = b.dataset.duplicate === 'true' ? 1 : 0;

                    // D'abord les originaux, puis les doublons, triés par rang
                    if (dupA !== dupB) return dupA - dupB;
                    return rankA - rankB;
                });

                let visibleIndex = 0;

                sortedItems.forEach((item) => {
                    const rank = parseInt(item.dataset.playerRank);
                    list.appendChild(item);

                    if (rank <= 10) {
                        item.style.display = 'flex';
                        anime({
                            targets: item,
                            opacity: [0, 1],
                            translateX: [20, 0],
                            duration: 300,
                            delay: visibleIndex * 30,
                            easing: 'easeOutCubic'
                        });
                        visibleIndex++;
                    } else {
                        item.style.display = 'none';
                    }
                });
            }
        });
    });
}

// Peupler les parties récentes
function populateRecentGames(games) {
    const panel = document.getElementById('recentPanel');
    if (!panel) return;

    // Garder le header
    const header = panel.querySelector('.recent-games-header');
    panel.innerHTML = '';
    if (header) panel.appendChild(header);

    games.slice(0, 7).forEach(game => {
        const item = document.createElement('div');
        item.className = 'recent-game-item';
        item.innerHTML = `
            <div class="recent-game-header">
                <span class="recent-game-date">${formatTimeAgo(game.created_at)}</span>
                <span class="recent-game-players">${game.total_players || '?'} joueurs</span>
            </div>
            <div class="recent-game-winner">🏆 ${game.winner?.username || 'N/A'}</div>
        `;
        panel.appendChild(item);
    });

    // Animation d'entrée
    anime({
        targets: '.recent-game-item',
        opacity: [0, 1],
        translateX: [-20, 0],
        delay: anime.stagger(80),
        duration: 400,
        easing: 'easeOutCubic'
    });
}





function startContinuousAnimation() {
    const particles = document.querySelectorAll('.btn-wrapper .particle');

    // 🔍 DEBUG
    console.log('🔍 Particules trouvées:', particles.length);
    console.log('🔍 stateIdle display:', document.getElementById('stateIdle')?.style.display);
    console.log('🔍 btnWrapper visible:', document.getElementById('btnWrapper')?.offsetParent !== null);

    if (!particles.length) {
        console.log('❌ Aucune particule trouvée, abandon');
        return;
    }

    // Annuler l'animation précédente si elle existe
    if (continuousAnimationId) {
        cancelAnimationFrame(continuousAnimationId);
        continuousAnimationId = null;
    }

    function animate() {
        time += 0.016;
        if (movementFadeIn < 1) movementFadeIn += 0.02;

        const targetTransition = isHovering ? 1 : 0;
        hoverTransition += (targetTransition - hoverTransition) * 0.08;

        const radius = 130;
        const orbitSpeed = 0.8;

        particles.forEach((particle, i) => {
            // État normal : flottement doux
            const floatX = Math.sin(time * 0.5 + i * 0.8) * 12 * movementFadeIn;
            const floatY = Math.cos(time * 0.4 + i * 1.2) * 10 * movementFadeIn;
            const floatScale = 1 + Math.sin(time * 0.3 + i) * 0.1 * movementFadeIn;
            const floatOpacity = 0.6 + Math.sin(time * 0.25 + i * 0.5) * 0.1 * movementFadeIn;

            // État hover : orbite circulaire
            const angle = (i / particles.length) * Math.PI * 2 + time * orbitSpeed;
            const orbitX = Math.cos(angle) * radius;
            const orbitY = Math.sin(angle) * radius;
            const orbitScale = 0.8;
            const orbitOpacity = 0.55;

            // Interpolation entre les deux états
            const x = floatX + (orbitX - floatX) * hoverTransition;
            const y = floatY + (orbitY - floatY) * hoverTransition;
            const scale = floatScale + (orbitScale - floatScale) * hoverTransition;
            const opacity = floatOpacity + (orbitOpacity - floatOpacity) * hoverTransition;

            particle.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
            particle.style.opacity = opacity;
        });

        continuousAnimationId = requestAnimationFrame(animate);
    }
    animate();

    console.log('✅ Animation démarrée, continuousAnimationId:', continuousAnimationId);
}

const mainActionBtn = document.querySelector('.main-action-btn');
if (mainActionBtn) {
    mainActionBtn.addEventListener('mouseenter', () => isHovering = true);
    mainActionBtn.addEventListener('mouseleave', () => isHovering = false);
}

// ============================================
// LEADERBOARD
// ============================================
function getRankClass(rank) {
    if (rank === 1) return 'top1';
    if (rank === 2) return 'top2';
    if (rank === 3) return 'top3';
    if (rank <= 10) return 'top10';
    return '';
}

function getRankBadgeNumber(rank) {
    if (rank <= 3) return rank;
    if (rank <= 10) return '10';
    if (rank <= 50) return '50';
    return '';
}

function populateLastGame() {
    const list = document.getElementById('lastgameList');
    list.innerHTML = '';
    const allPlayers = [...allDbPlayers, ...allDbPlayers];

    allPlayers.forEach(player => {
        const item = document.createElement('div');
        item.className = `lastgame-item ${getRankClass(player.rank)}`;
        item.dataset.playerRank = player.rank;
        item.dataset.playerName = player.name;

        const badgeNumber = getRankBadgeNumber(player.rank);
        const badgeHtml = badgeNumber ? `<span class="lastgame-rank-badge">${badgeNumber}</span>` : '';

        item.innerHTML = `<div class="lastgame-name">${player.name}${badgeHtml}</div>`;
        list.appendChild(item);
    });
}


// Filtres avec animations
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.dataset.filter;
        const items = document.querySelectorAll('.lastgame-item');

        items.forEach((item, index) => {
            const rank = parseInt(item.dataset.playerRank);
            const shouldShow = filter === 'all' || rank <= 10;

            if (shouldShow) {
                item.style.display = 'flex';
                anime({
                    targets: item,
                    opacity: [0, 1],
                    translateX: [20, 0],
                    duration: 300,
                    delay: index * 20,
                    easing: 'easeOutCubic'
                });
            } else {
                anime({
                    targets: item,
                    opacity: [1, 0],
                    translateX: [0, -20],
                    duration: 200,
                    easing: 'easeOutCubic',
                    complete: () => {
                        item.style.display = 'none';
                    }
                });
            }
        });
    });
});

// ============================================
// CARTE JOUEUR 3D AU HOVER
// ============================================
const playerCard = document.getElementById('playerCard');
const playerCardInner = document.getElementById('playerCardInner');
const cardRankBadge = document.getElementById('cardRankBadge');
let hideCardTimeout;

// Données fictives des joueurs
const playerData = {
    'Gojo_Satoru': { wins: 24, games: 31, titles: 3, badges: 7, title: 'Maître', lastPlace: 1 },
    'OnePieceKing': { wins: 19, games: 28, titles: 2, badges: 5, title: 'Expert', lastPlace: 2 },
    'LuffyD': { wins: 22, games: 35, titles: 2, badges: 6, title: 'Expert', lastPlace: 1 },
    'Levi_Heichou': { wins: 20, games: 29, titles: 2, badges: 5, title: 'Expert', lastPlace: 3 },
    'NarutoFan42': { wins: 17, games: 26, titles: 1, badges: 4, title: 'Avancé', lastPlace: 4 },
    'AllMight': { wins: 16, games: 24, titles: 1, badges: 4, title: 'Avancé', lastPlace: 5 },
    'Tanjiro': { wins: 15, games: 22, titles: 1, badges: 4, title: 'Avancé', lastPlace: 5 },
    'VegetaPrince': { wins: 14, games: 23, titles: 1, badges: 3, title: 'Avancé', lastPlace: 6 },
    'Deku_Hero': { wins: 13, games: 21, titles: 1, badges: 3, title: 'Avancé', lastPlace: 7 },
    'Mikasa': { wins: 18, games: 25, titles: 1, badges: 4, title: 'Avancé', lastPlace: 3 },
    'Eren_Jaeger': { wins: 12, games: 20, titles: 1, badges: 3, title: 'Avancé', lastPlace: 8 },
    'Bakugo': { wins: 11, games: 19, titles: 0, badges: 2, title: 'Intermédiaire', lastPlace: 10 },
    'Todoroki': { wins: 10, games: 18, titles: 0, badges: 2, title: 'Intermédiaire', lastPlace: 12 },
    'Zenitsu': { wins: 8, games: 16, titles: 0, badges: 2, title: 'Novice', lastPlace: 15 },
    'default': { wins: 5, games: 12, titles: 0, badges: 1, title: 'Novice', lastPlace: 20 }
};

function getRankBadgeClass(rank) {
    if (rank === 1) return 'top1';
    if (rank === 2) return 'top2';
    if (rank === 3) return 'top3';
    if (rank <= 10) return 'top10';
    if (rank <= 50) return 'top50';
    return '';
}

function getRankBadgeText(rank) {
    if (rank <= 3) return 'TOP ' + rank;
    if (rank <= 10) return 'TOP 10';
    if (rank <= 50) return 'TOP 50';
    return '';
}

function getPlaceClass(place) {
    if (place === 1) return 'top1';
    if (place <= 3) return 'top3';
    return 'normal';
}

function setupPlayerCardEvents() {
    const items = document.querySelectorAll('.lastgame-item');

    items.forEach(item => {
        item.addEventListener('mouseenter', async () => {
            clearTimeout(hideCardTimeout);

            const cardAvatar = document.getElementById('cardAvatar');
            if (cardAvatar) {
                cardAvatar.style.opacity = '0';
            }

            const name = item.dataset.playerName;
            const rank = parseInt(item.dataset.playerRank);
            const twitchId = item.dataset.twitchId;

            // Afficher la carte avec données de base immédiatement
            const cardNameEl = document.getElementById('cardName');
            cardNameEl.textContent = name;
            if (name.length > 14) cardNameEl.style.fontSize = '0.7rem';
            else if (name.length > 10) cardNameEl.style.fontSize = '0.8rem';
            else cardNameEl.style.fontSize = '0.85rem';

            // Badge de rang
            const badgeClass = getRankBadgeClass(rank);
            cardRankBadge.className = 'player-card-rank-badge ' + badgeClass;
            cardRankBadge.textContent = getRankBadgeText(rank);
            cardRankBadge.style.display = badgeClass ? 'flex' : 'none';

            // Reset classes de la carte
            playerCardInner.classList.remove('top1-card', 'top10-card');
            if (rank === 1) playerCardInner.classList.add('top1-card');
            else if (rank <= 10) playerCardInner.classList.add('top10-card');

            // Afficher la carte
            playerCard.classList.add('visible');

            // Charger les vraies données si twitchId disponible
            if (twitchId) {
                try {
                    const response = await fetch(`/profile/${twitchId}`);
                    if (response.ok) {
                        const data = await response.json();
                        const user = data.user;

                        const cardAvatar = document.getElementById('cardAvatar');
                        if (cardAvatar) {
                            cardAvatar.src = user.avatar_url || 'novice.png';
                            cardAvatar.onload = () => {
                                cardAvatar.style.opacity = '1';
                            };
                        }

                        document.getElementById('cardTitle').textContent = data.titles?.current?.title_name || 'Novice';
                        document.getElementById('cardWins').textContent = user.total_victories || 0;
                        document.getElementById('cardGames').textContent = user.total_games_played || 0;
                        document.getElementById('cardTitles').textContent = data.titles?.unlocked?.length || 0;
                        document.getElementById('cardBadges').textContent =
                            (data.badges?.games_played?.filter(b => b.unlocked).length || 0) +
                            (data.badges?.games_won?.filter(b => b.unlocked).length || 0);

                        // 🆕 Pastille victoires équipe
                        const teamWins = user.team_victories || 0;
                        const teamWinsBadge = document.getElementById('cardTeamWins');
                        teamWinsBadge.textContent = '+' + teamWins;
                        teamWinsBadge.classList.toggle('zero', teamWins === 0);

                        const winrate = parseInt(user.win_rate) || 0;
                        document.getElementById('cardWinrate').textContent = winrate + '%';
                        document.getElementById('cardWinrateFill').style.width = winrate + '%';

                        const lastPlace = user.last_placement;
                        const lastPlaceEl = document.getElementById('cardLastPlace');
                        lastPlaceEl.textContent = lastPlace ?
                            (lastPlace === 1 ? '1er' : lastPlace === 2 ? '2ème' : lastPlace + 'ème') : '-';
                        lastPlaceEl.className = 'player-card-lastplace-value ' + getPlaceClass(lastPlace || 99);
                    }
                } catch (error) {
                    console.error('Erreur chargement profil:', error);
                    // Fallback sur données par défaut
                    document.getElementById('cardTitle').textContent = 'Novice';
                    document.getElementById('cardWins').textContent = '-';
                    document.getElementById('cardGames').textContent = '-';
                }
            }
        });

        item.addEventListener('mouseleave', () => {
            hideCardTimeout = setTimeout(() => {
                playerCard.classList.remove('visible');
            }, 150);
        });
    });
}

setupPlayerCardEvents();

// ============================================
// ANIMATION ABSORPTION - OUVERTURE LOBBY
// ============================================
const openLobbyBtn = document.getElementById('openLobbyBtn');
const absorptionCircle = document.getElementById('absorptionCircle');
const stateIdle = document.getElementById('stateIdle');
const stateLobby = document.getElementById('stateLobby');
const stateGame = document.getElementById('stateGame');
const recentPanel = document.getElementById('recentPanel');
const lastgamePanel = document.getElementById('lastgamePanel');
const bgText = document.getElementById('bgText');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

// ============================================
// MODAL SÉLECTION MODE DE JEU
// ============================================
const modeModalOverlay = document.getElementById('modeModalOverlay');
const modeModalContent = document.getElementById('modeModalContent');
const modeClassiqueCard = document.getElementById('modeClassiqueCard');
const modeRivaliteCard = document.getElementById('modeRivaliteCard');
const modeBombanimeCard = document.getElementById('modeBombanimeCard');
const modeCollectCard = document.getElementById('modeCollectCard');
const modeCards = document.querySelectorAll('.mode-card');
const modeBadge = document.getElementById('modeBadge');

// Mode actuel - Restaurer depuis sessionStorage ou classic par défaut
let currentGameMode = sessionStorage.getItem('adminGameMode') || 'classic';

// Mettre à jour le badge au chargement si rivalité
if (currentGameMode === 'rivalry') {
    const badgeText = modeBadge?.querySelector('.mode-badge-text');
    if (badgeText) badgeText.textContent = 'Rivalry Mode';
    if (modeBadge) modeBadge.classList.add('rivalry');
}

// Fonction pour changer le mode avec persistance
// 🎯 Applique la visibilité des paramètres selon le mode de jeu
function applySettingsVisibility(mode) {
    const teamsGroup = document.getElementById('teamsGroup');
    const modeGroup = document.getElementById('modeGroup');
    const livesGroup = document.getElementById('livesGroup');
    const livesIconGroup = document.getElementById('livesIconGroup');
    const questionsGroup = document.getElementById('questionsGroup');
    const speedBonusGroup = document.getElementById('speedBonusGroup');
    const timerGroup = document.querySelector('.timer-group');
    const answersGroup = document.querySelector('.setting-group:has(.answers-options)');
    const difficultyGroup = document.querySelector('.setting-group:has(.difficulty-options)');
    const seriesTrigger = document.getElementById('seriesTrigger');
    const noSpoilGroup = document.querySelector('.no-spoil-group');
    const bombanimeSerieGroup = document.getElementById('bombanimeSerieGroup');
    const bombanimeLivesGroup = document.getElementById('bombanimeLivesGroup');
    const bombanimeTimerGroup = document.getElementById('bombanimeTimerGroup');
    const bombanimeBotsGroup = document.getElementById('bombanimeBotsGroup');
    const collectDeckGroup = document.getElementById('collectDeckGroup');
    const collectHandGroup = document.getElementById('collectHandGroup');

    if (mode === 'bombanime') {
        if (teamsGroup) teamsGroup.style.display = 'none';
        if (modeGroup) modeGroup.style.display = 'none';
        if (livesGroup) livesGroup.style.display = 'none';
        if (livesIconGroup) livesIconGroup.style.display = 'none';
        if (questionsGroup) questionsGroup.style.display = 'none';
        if (speedBonusGroup) speedBonusGroup.style.display = 'none';
        if (timerGroup) timerGroup.style.display = 'none';
        if (answersGroup) answersGroup.style.display = 'none';
        if (difficultyGroup) difficultyGroup.style.display = 'none';
        if (seriesTrigger) seriesTrigger.style.display = 'none';
        if (noSpoilGroup) noSpoilGroup.style.display = 'none';
        if (bombanimeSerieGroup) bombanimeSerieGroup.style.display = 'block';
        if (bombanimeLivesGroup) bombanimeLivesGroup.style.display = 'block';
        if (bombanimeTimerGroup) bombanimeTimerGroup.style.display = 'block';
        if (bombanimeBotsGroup) bombanimeBotsGroup.style.display = 'block';
        if (collectDeckGroup) collectDeckGroup.style.display = 'none';
        if (collectHandGroup) collectHandGroup.style.display = 'none';
        const collectAnimeGrp = document.getElementById('collectAnimeFilterGroup');
        if (collectAnimeGrp) collectAnimeGrp.style.display = 'none';
    } else if (mode === 'collect') {
        if (teamsGroup) teamsGroup.style.display = 'none';
        if (modeGroup) modeGroup.style.display = 'none';
        if (livesGroup) livesGroup.style.display = 'none';
        if (livesIconGroup) livesIconGroup.style.display = 'none';
        if (questionsGroup) questionsGroup.style.display = 'none';
        if (speedBonusGroup) speedBonusGroup.style.display = 'none';
        if (timerGroup) timerGroup.style.display = 'none';
        if (answersGroup) answersGroup.style.display = 'none';
        if (difficultyGroup) difficultyGroup.style.display = 'none';
        if (seriesTrigger) seriesTrigger.style.display = 'none';
        if (noSpoilGroup) noSpoilGroup.style.display = 'none';
        if (bombanimeSerieGroup) bombanimeSerieGroup.style.display = 'none';
        if (bombanimeLivesGroup) bombanimeLivesGroup.style.display = 'none';
        if (bombanimeTimerGroup) bombanimeTimerGroup.style.display = 'none';
        if (bombanimeBotsGroup) bombanimeBotsGroup.style.display = 'none';
        if (collectDeckGroup) collectDeckGroup.style.display = 'block';
        if (collectHandGroup) collectHandGroup.style.display = 'block';
        const collectAnimeGrp = document.getElementById('collectAnimeFilterGroup');
        if (collectAnimeGrp) collectAnimeGrp.style.display = 'block';
    } else if (mode === 'rivalry') {
        if (teamsGroup) teamsGroup.style.display = 'block';
        if (modeGroup) modeGroup.style.display = 'block';
        if (livesGroup) livesGroup.style.display = 'block';
        if (livesIconGroup) livesIconGroup.style.display = 'block';
        if (timerGroup) timerGroup.style.display = 'block';
        if (answersGroup) answersGroup.style.display = 'block';
        if (difficultyGroup) difficultyGroup.style.display = 'block';
        if (seriesTrigger) seriesTrigger.style.display = 'block';
        if (noSpoilGroup) noSpoilGroup.style.display = 'block';
        if (bombanimeSerieGroup) bombanimeSerieGroup.style.display = 'none';
        if (bombanimeLivesGroup) bombanimeLivesGroup.style.display = 'none';
        if (bombanimeTimerGroup) bombanimeTimerGroup.style.display = 'none';
        if (bombanimeBotsGroup) bombanimeBotsGroup.style.display = 'none';
        if (collectDeckGroup) collectDeckGroup.style.display = 'none';
        if (collectHandGroup) collectHandGroup.style.display = 'none';
        const collectAnimeGrp = document.getElementById('collectAnimeFilterGroup');
        if (collectAnimeGrp) collectAnimeGrp.style.display = 'none';
    } else {
        // Classic
        if (teamsGroup) teamsGroup.style.display = 'none';
        if (modeGroup) modeGroup.style.display = 'block';
        if (livesGroup) livesGroup.style.display = 'block';
        if (livesIconGroup) livesIconGroup.style.display = 'block';
        if (timerGroup) timerGroup.style.display = 'block';
        if (answersGroup) answersGroup.style.display = 'block';
        if (difficultyGroup) difficultyGroup.style.display = 'block';
        if (seriesTrigger) seriesTrigger.style.display = 'block';
        if (noSpoilGroup) noSpoilGroup.style.display = 'block';
        if (bombanimeSerieGroup) bombanimeSerieGroup.style.display = 'none';
        if (bombanimeLivesGroup) bombanimeLivesGroup.style.display = 'none';
        if (bombanimeTimerGroup) bombanimeTimerGroup.style.display = 'none';
        if (bombanimeBotsGroup) bombanimeBotsGroup.style.display = 'none';
        if (collectDeckGroup) collectDeckGroup.style.display = 'none';
        if (collectHandGroup) collectHandGroup.style.display = 'none';
        const collectAnimeGrp = document.getElementById('collectAnimeFilterGroup');
        if (collectAnimeGrp) collectAnimeGrp.style.display = 'none';
    }
}

function setGameMode(mode) {
    currentGameMode = mode;
    sessionStorage.setItem('adminGameMode', mode);
    
    // 🎯 Appliquer la visibilité des paramètres selon le mode
    applySettingsVisibility(mode);
    
    // 🆕 Supprimer les données du winner BombAnime si on change de mode
    if (mode !== 'bombanime') {
        sessionStorage.removeItem('bombanimeWinnerData');
    }
    
    // 🎴 Mettre à jour le bouton Rejoindre
    updateAdminJoinButton();
    
    // Mettre à jour le badge
    const badgeText = modeBadge?.querySelector('.mode-badge-text');
    modeBadge?.classList.remove('rivalry', 'bombanime', 'collect');
    
    // Mettre à jour le bouton Jouer et les particules
    btnWrapper?.classList.remove('rivalry', 'bombanime', 'collect');
    
    if (mode === 'rivalry') {
        if (badgeText) badgeText.textContent = 'Rivalry Mode';
        if (modeBadge) modeBadge.classList.add('rivalry');
        if (btnWrapper) btnWrapper.classList.add('rivalry');
    } else if (mode === 'bombanime') {
        if (badgeText) badgeText.textContent = 'BombAnime Mode';
        if (modeBadge) modeBadge.classList.add('bombanime');
        if (btnWrapper) btnWrapper.classList.add('bombanime');
    } else if (mode === 'collect') {
        if (badgeText) badgeText.textContent = 'Collect Mode';
        if (modeBadge) modeBadge.classList.add('collect');
        if (btnWrapper) btnWrapper.classList.add('collect');
    } else {
        if (badgeText) badgeText.textContent = 'Classic Mode';
    }

    // Afficher/cacher le toggle de tri selon le mode
    updateGridSortToggleVisibility();
}

// Gérer la visibilité du toggle de tri (uniquement en Rivalité ET onglet Grille)
function updateGridSortToggleVisibility() {
    const sortToggle = document.getElementById('gridSortToggle');
    if (sortToggle) {
        const isGrilleActive = document.getElementById('tabGrille')?.classList.contains('active');
        if (currentGameMode === 'rivalry' && isGrilleActive) {
            sortToggle.classList.add('visible');
        } else {
            sortToggle.classList.remove('visible');
            // Reset au tri par score si on quitte le mode rivalité
            if (currentGameMode !== 'rivalry') {
                gridSortMode = 'score';
                const scoreBtn = sortToggle.querySelector('[data-sort="score"]');
                const teamBtn = sortToggle.querySelector('[data-sort="team"]');
                if (scoreBtn) scoreBtn.classList.add('active');
                if (teamBtn) teamBtn.classList.remove('active');
            }
        }
    }
}

// ============================================
// RÉÉQUILIBRAGE ÉQUIPES
// ============================================
let currentModalPlayer = null; // Joueur actuellement dans la modal

// Fonction toast simple pour les notifications
function showToast(message, type = 'info') {
    // Créer le toast s'il n'existe pas
    let toast = document.getElementById('simpleToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'simpleToast';
        toast.style.cssText = `
            position: fixed;
            bottom: 2rem;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            font-size: 0.8rem;
            font-weight: 500;
            z-index: 10000;
            opacity: 0;
            transition: all 0.3s ease;
            pointer-events: none;
        `;
        document.body.appendChild(toast);
    }

    // Style selon le type
    if (type === 'success') {
        toast.style.background = 'rgba(34, 197, 94, 0.9)';
        toast.style.color = '#fff';
    } else if (type === 'error') {
        toast.style.background = 'rgba(239, 68, 68, 0.9)';
        toast.style.color = '#fff';
    } else {
        toast.style.background = 'rgba(59, 130, 246, 0.9)';
        toast.style.color = '#fff';
    }

    toast.textContent = message;
    
    // Afficher
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    // Cacher après 3s
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(100px)';
    }, 3000);
}

// 🆕 Mini-log discret pour les actions d'équipe
function showMiniLog(message) {
    let log = document.getElementById('miniLog');
    if (!log) {
        log = document.createElement('div');
        log.id = 'miniLog';
        log.style.cssText = `
            position: fixed;
            bottom: 1rem;
            right: 1rem;
            padding: 0.3rem 0.6rem;
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 3px;
            font-size: 0.55rem;
            font-family: monospace;
            color: rgba(255, 255, 255, 0.45);
            z-index: 10000;
            opacity: 0;
            transform: translateY(10px);
            transition: all 0.15s ease;
            pointer-events: none;
        `;
        document.body.appendChild(log);
    }

    log.textContent = message;
    
    requestAnimationFrame(() => {
        log.style.opacity = '1';
        log.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
        log.style.opacity = '0';
        log.style.transform = 'translateY(10px)';
    }, 1500);
}

// Compter les joueurs par équipe
function getTeamCounts() {
    const grid = document.getElementById('playersGridLobby');
    if (!grid) return { team1: 0, team2: 0 };
    
    const team1 = grid.querySelectorAll('.player-card-mini.team-1').length;
    const team2 = grid.querySelectorAll('.player-card-mini.team-2').length;
    return { team1, team2 };
}

// Rééquilibrer les équipes (les plus récents bougent)
function rebalanceTeams() {
    const grid = document.getElementById('playersGridLobby');
    if (!grid) return;

    const team1Cards = Array.from(grid.querySelectorAll('.player-card-mini.team-1'));
    const team2Cards = Array.from(grid.querySelectorAll('.player-card-mini.team-2'));
    
    const diff = Math.abs(team1Cards.length - team2Cards.length);
    if (diff <= 1) {
        // Mini effet rouge sur le bouton
        const btn = document.getElementById('rebalanceTeamsBtn');
        if (btn) {
            btn.style.transition = 'all 0.15s ease';
            btn.style.boxShadow = '0 0 12px rgba(239, 68, 68, 0.6)';
            btn.style.borderColor = 'rgba(239, 68, 68, 0.8)';
            setTimeout(() => {
                btn.style.boxShadow = '';
                btn.style.borderColor = '';
            }, 400);
        }
        return;
    }

    const toMove = Math.floor(diff / 2);
    let movedCount = 0;

    if (team1Cards.length > team2Cards.length) {
        // Déplacer les derniers de team1 vers team2
        const cardsToMove = team1Cards.slice(-toMove);
        cardsToMove.forEach(card => {
            switchCardTeam(card, 2);
            movedCount++;
        });
    } else {
        // Déplacer les derniers de team2 vers team1
        const cardsToMove = team2Cards.slice(-toMove);
        cardsToMove.forEach(card => {
            switchCardTeam(card, 1);
            movedCount++;
        });
    }

    // Mettre à jour les compteurs
    updateTeamCounters();
}

// Changer l'équipe d'une carte
function switchCardTeam(card, newTeam) {
    const oldTeam = card.classList.contains('team-1') ? 1 : 2;
    if (oldTeam === newTeam) return;

    // Mettre à jour les classes
    card.classList.remove('team-1', 'team-2');
    card.classList.add(`team-${newTeam}`);
    card.dataset.team = newTeam;

    // Mettre à jour le badge
    const badge = card.querySelector('.team-badge-lobby');
    if (badge) {
        badge.classList.remove('team-1', 'team-2');
        badge.classList.add(`team-${newTeam}`);
        badge.textContent = newTeam === 1 ? 'A' : 'B';
    }
    
    // 🆕 Émettre au serveur pour synchroniser avec le joueur
    const twitchId = card.dataset.twitchId;
    const username = card.querySelector('.player-card-mini-name')?.textContent;
    
    if (socket && (twitchId || username)) {
        socket.emit('admin-change-team', {
            twitchId: twitchId,
            username: username,
            newTeam: newTeam
        });
        console.log(`🔄 [ADMIN] ${username}: Team ${oldTeam} → Team ${newTeam}`);
    }
}

// Mettre à jour les compteurs d'équipe dans le header
function updateTeamCounters() {
    const counts = getTeamCounts();
    const team1CountEl = document.getElementById('team1Count');
    const team2CountEl = document.getElementById('team2Count');
    if (team1CountEl) team1CountEl.textContent = counts.team1;
    if (team2CountEl) team2CountEl.textContent = counts.team2;
    
    // 🆕 Mettre à jour l'état du bouton démarrer
    const grid = document.getElementById('playersGridLobby');
    const playerCount = grid ? grid.querySelectorAll('.player-card-mini').length : 0;
    updateStartButton(playerCount);
}

// Initialiser le bouton rééquilibrer
function initRebalanceButton() {
    const btn = document.getElementById('rebalanceTeamsBtn');
    if (btn) {
        btn.addEventListener('click', rebalanceTeams);
    }
    
    const shuffleBtn = document.getElementById('shuffleTeamsBtn');
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', shuffleTeams);
    }
}

// Mélanger aléatoirement tous les joueurs entre les équipes
function shuffleTeams() {
    const grid = document.getElementById('playersGridLobby');
    if (!grid) return;

    const allCards = Array.from(grid.querySelectorAll('.player-card-mini'));
    if (allCards.length === 0) {
        showMiniLog('aucun joueur');
        return;
    }

    // Mélanger le tableau (Fisher-Yates)
    for (let i = allCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
    }

    // Assigner alternativement aux équipes
    allCards.forEach((card, index) => {
        const newTeam = (index % 2) + 1;
        switchCardTeam(card, newTeam);
    });

    // Mettre à jour les compteurs
    updateTeamCounters();
}

// Gérer le changement d'équipe depuis la modal
function initTeamSwitchInModal() {
    const switchBtn = document.getElementById('teamSwitchBtn');
    if (switchBtn) {
        switchBtn.addEventListener('click', () => {
            if (!currentModalPlayer) return;

            const grid = document.getElementById('playersGridLobby');
            const card = Array.from(grid.querySelectorAll('.player-card-mini')).find(c => {
                const name = c.querySelector('.player-card-mini-name')?.textContent;
                return name === currentModalPlayer.name;
            });

            if (card) {
                const currentTeam = card.classList.contains('team-1') ? 1 : 2;
                const newTeam = currentTeam === 1 ? 2 : 1;

                switchCardTeam(card, newTeam);
                updateTeamCounters();
                closePlayerModal();
            }
        });
    }
}

// ============================================
// TWITCH CONNECT
// ============================================
const twitchConnectBtn = document.getElementById('twitchConnectBtn');
const twitchDisconnectedState = document.getElementById('twitchDisconnectedState');
const twitchConnectedState = document.getElementById('twitchConnectedState');
const twitchUsername = document.getElementById('twitchUsername');

let twitchUser = null; // { id, login, display_name, profile_image_url }

// Connexion Twitch
function connectTwitch() {
    console.log('Connexion Twitch...');
    // Rediriger vers OAuth Twitch avec le paramètre admin
    window.location.href = '/auth/twitch?from=admin';
}

// Déconnexion Twitch
function disconnectTwitch() {
    twitchUser = null;
    updateTwitchUI();
    // TODO: Appeler l'API pour invalider le token
}

// Mise à jour de l'UI
function updateTwitchUI() {
    const tipIcon = document.getElementById('lobbyTipIcon');
    if (twitchUser) {
        twitchDisconnectedState.style.display = 'none';
        twitchConnectedState.style.display = 'flex';
        twitchUsername.textContent = twitchUser.display_name;
        if (tipIcon) tipIcon.style.display = 'none';
    } else {
        twitchDisconnectedState.style.display = 'flex';
        twitchConnectedState.style.display = 'none';
        if (tipIcon) tipIcon.style.display = '';
    }
}

// 💡 Tooltip flottant pour l'icône tip (échappe overflow:hidden)
(function() {
    let floatingTip = null;
    const tipIcon = document.getElementById('lobbyTipIcon');
    if (!tipIcon) return;

    tipIcon.addEventListener('mouseenter', () => {
        if (!floatingTip) {
            floatingTip = document.createElement('div');
            floatingTip.className = 'lobby-tip-floating';
            floatingTip.textContent = 'Connectez-vous à Twitch pour jouer selon votre propre historique de questions';
            document.body.appendChild(floatingTip);
        }
        const rect = tipIcon.getBoundingClientRect();
        const tipWidth = 340;
        const left = rect.left + rect.width / 2 - tipWidth + 30;
        floatingTip.style.left = Math.max(8, left) + 'px';
        floatingTip.style.right = 'auto';
        floatingTip.style.top = (rect.top - floatingTip.offsetHeight - 10) + 'px';
        requestAnimationFrame(() => floatingTip.classList.add('visible'));
    });

    tipIcon.addEventListener('mouseleave', () => {
        if (floatingTip) floatingTip.classList.remove('visible');
    });
})();

// Message quand Twitch requis pour Rivalité
function showTwitchRequiredMessage() {
    // Shake la carte Rivalité
    anime({
        targets: modeRivaliteCard,
        translateX: [-8, 8, -6, 6, -4, 4, 0],
        duration: 400,
        easing: 'easeInOutQuad'
    });
    
    // Créer le toast si pas déjà présent
    let toast = document.getElementById('twitchRequiredToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'twitchRequiredToast';
        toast.className = 'twitch-required-toast';
        toast.innerHTML = `
            <span class="toast-msg">Connexion requise pour ce mode</span>
            <span class="toast-link">Se connecter ?</span>
        `;
        document.body.appendChild(toast);
        
        // Event listener pour le lien
        toast.querySelector('.toast-link').addEventListener('click', () => {
            // Sauvegarder que l'utilisateur voulait Rivalité
            sessionStorage.setItem('pendingRivalryMode', 'true');
            hideTwitchRequiredMessage();
            closeModeModal();
            connectTwitch();
        });
    }
    
    // Afficher le toast
    toast.classList.add('show');
    
    // Highlight le bouton Twitch
    const twitchWrapper = document.getElementById('twitchConnectBtn');
    twitchWrapper.classList.add('highlight');
    
    // Cacher après 3s
    setTimeout(() => {
        hideTwitchRequiredMessage();
    }, 3000);
}

// Cacher le toast
function hideTwitchRequiredMessage() {
    const toast = document.getElementById('twitchRequiredToast');
    if (toast) {
        toast.classList.remove('show');
    }
    const twitchWrapper = document.getElementById('twitchConnectBtn');
    if (twitchWrapper) {
        twitchWrapper.classList.remove('highlight');
    }
}

// Event listener - Clic pour se connecter
twitchConnectBtn.addEventListener('click', (e) => {
    if (!twitchUser) {
        connectTwitch();
    }
});

// Vérifier si déjà connecté au chargement
async function checkTwitchAuth() {
    try {
        const response = await fetch('/auth/twitch/status', { credentials: 'same-origin' });
        if (response.ok) {
            const data = await response.json();
            if (data.connected && data.user) {
                twitchUser = data.user;
                updateTwitchUI();
                updateAdminJoinButton();
                
                // Vérifier si l'utilisateur voulait sélectionner Rivalité
                if (sessionStorage.getItem('pendingRivalryMode') === 'true') {
                    sessionStorage.removeItem('pendingRivalryMode');
                    // Sélectionner le mode Rivalité (sans ouvrir le lobby)
                    setGameMode('rivalry');
                }
            }
        }
    } catch (error) {
        console.log('Twitch auth check:', error);
    }
}

// Appeler au chargement
checkTwitchAuth();

function openModeModal() {
    // Reset des styles inline avant d'ouvrir (au cas où)
    anime.remove(modeModalOverlay);
    anime.remove(modeClassiqueCard);
    anime.remove(modeRivaliteCard);
    anime.remove(modeBombanimeCard);
    anime.remove(modeCollectCard);
    modeModalOverlay.removeAttribute('style');
    modeClassiqueCard.removeAttribute('style');
    modeRivaliteCard.removeAttribute('style');
    modeBombanimeCard.removeAttribute('style');
    modeCollectCard.removeAttribute('style');
    
    modeModalOverlay.classList.add('active');
    modeModalContent.classList.add('active');
    
    // Ajouter animation-done après l'animation pour permettre le hover
    modeCards.forEach((card, index) => {
        card.classList.remove('animation-done', 'selecting');
        const delay = 650 + (index * 100);
        setTimeout(() => {
            card.classList.add('animation-done');
        }, delay);
    });
}

function closeModeModal() {
    // Arrêter toutes les animations anime.js en cours sur ces éléments
    anime.remove(modeModalOverlay);
    anime.remove(modeClassiqueCard);
    anime.remove(modeRivaliteCard);
    anime.remove(modeBombanimeCard);
    anime.remove(modeCollectCard);
    
    modeModalOverlay.classList.remove('active');
    modeModalContent.classList.remove('active');
    modeCards.forEach(card => card.classList.remove('animation-done', 'selecting'));
    
    // Reset complet des styles inline pour la prochaine ouverture
    modeModalOverlay.removeAttribute('style');
    modeClassiqueCard.removeAttribute('style');
    modeRivaliteCard.removeAttribute('style');
    modeBombanimeCard.removeAttribute('style');
    modeCollectCard.removeAttribute('style');
    
    // Cacher le toast Twitch si visible
    hideTwitchRequiredMessage();
}

// Fermer le modal au clic sur l'overlay
modeModalOverlay.addEventListener('click', closeModeModal);

// Empêcher la propagation des clics sur le contenu du modal
modeModalContent.addEventListener('click', (e) => {
    // Si on clique sur le fond du content (pas sur une carte), fermer le modal
    if (e.target === modeModalContent || e.target.classList.contains('mode-cards-container')) {
        closeModeModal();
    }
});

// Empêcher la propagation des clics sur les cartes
modeCards.forEach(card => {
    card.addEventListener('click', (e) => {
        e.stopPropagation();
    });
});

// Fermer avec Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modeModalContent.classList.contains('active')) {
        closeModeModal();
    }
});

// Clic sur le badge -> ouvre le modal de sélection de mode
modeBadge.addEventListener('click', () => {
    openModeModal();
});

// Clic sur le bouton JOUER -> lance directement le lobby
openLobbyBtn.addEventListener('click', async () => {
    // Vérifier d'abord si un lobby est déjà ouvert
    try {
        const stateResponse = await fetch('/admin/game-state', { credentials: 'same-origin' });
        const state = await stateResponse.json();

        // Si lobby déjà ouvert, juste afficher l'UI directement
        if (state.isActive || state.phase === 'lobby') {
            console.log('Lobby déjà ouvert, affichage direct');
            showLobbyUI(state.players || []);
            return;
        }
    } catch (error) {
        console.error('❌ Erreur vérification état:', error);
    }
    
    // Lancer directement le lobby en mode actuel (Classique)
    await launchLobby();
});

// Clic sur carte Classique -> sélectionner et fermer le modal
modeClassiqueCard.addEventListener('click', async () => {
    if (modeClassiqueCard.classList.contains('selecting')) return;
    
    setGameMode('classic');
    
    modeClassiqueCard.classList.add('selecting');
    
    // 🆕 Retirer immédiatement les classes active pour désactiver pointer-events
    modeModalOverlay.classList.remove('active');
    modeModalContent.classList.remove('active');
    
    // Cacher les autres cartes
    anime({
        targets: [modeRivaliteCard, modeBombanimeCard, modeCollectCard],
        opacity: 0,
        scale: 0.9,
        duration: 150,
        easing: 'easeOutQuad'
    });
    
    // Fade le fond
    anime({
        targets: modeModalOverlay,
        opacity: [1, 0],
        duration: 300,
        delay: 50,
        easing: 'easeOutQuad'
    });
    
    // Animation Pop & Vanish (gold)
    anime.timeline()
        .add({
            targets: modeClassiqueCard,
            scale: [1, 1.2],
            boxShadow: ['0 0 0px rgba(240, 192, 64, 0)', '0 0 60px rgba(240, 192, 64, 1)'],
            duration: 150,
            easing: 'easeOutQuad'
        })
        .add({
            targets: modeClassiqueCard,
            scale: [1.2, 0],
            opacity: [1, 0],
            boxShadow: ['0 0 60px rgba(240, 192, 64, 1)', '0 0 0px rgba(240, 192, 64, 0)'],
            duration: 200,
            easing: 'easeInQuad',
            complete: () => {
                closeModeModal();
                modeClassiqueCard.classList.remove('selecting');
            }
        });
});

// Fonction pour lancer le lobby
async function launchLobby() {
    try {
        // Préparer les données du mode
        const lobbyData = {
            lobbyMode: currentGameMode,
            teamNames: currentGameMode === 'rivalry' ? getTeamNames() : null,
            // 💣 Paramètres BombAnime
            bombanimeSerie: currentGameMode === 'bombanime' ? selectedBombanimeSerie : null,
            bombanimeTimer: currentGameMode === 'bombanime' ? 
                (document.getElementById('bombanimeTimerSlider')?.value || 8) : null,
            bombanimeLives: currentGameMode === 'bombanime' ?
                parseInt(document.querySelector('.bombanime-lives-group .setting-option-btn.active')?.dataset.value) || 2 : null
        };
        
        // Activer le lobby
        const response = await fetch('/admin/toggle-game', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(lobbyData)
        });

        const data = await response.json();
        console.log('✅ Toggle lobby:', data);

        if (!data.isActive) {
            console.log('Lobby fermé, annulation animation');
            return;
        }
    } catch (error) {
        console.error('❌ Erreur:', error);
        return;
    }

    // Position du bouton
    const btnRect = openLobbyBtn.getBoundingClientRect();
    const centerX = btnRect.left + btnRect.width / 2;
    const centerY = btnRect.top + btnRect.height / 2;

    // Calculer la taille nécessaire pour couvrir tout l'écran
    const maxDim = Math.max(
        Math.hypot(centerX, centerY),
        Math.hypot(window.innerWidth - centerX, centerY),
        Math.hypot(centerX, window.innerHeight - centerY),
        Math.hypot(window.innerWidth - centerX, window.innerHeight - centerY)
    ) * 2;

    // Cacher les panneaux latéraux
    recentPanel.classList.add('hidden');
    lastgamePanel.classList.add('hidden');

    // Désactiver le pulse
    btnWrapper.classList.remove('pulse-active');

    // Animation d'absorption
    absorptionCircle.style.left = centerX + 'px';
    absorptionCircle.style.top = centerY + 'px';
    absorptionCircle.style.opacity = '1';

    anime({
        targets: absorptionCircle,
        width: [185, maxDim],
        height: [185, maxDim],
        duration: 800,
        easing: 'easeInOutQuart',
        complete: () => {
            // Cacher l'état idle
            stateIdle.style.display = 'none';
            
            // 🆕 Cacher le bouton déconnexion
            const logoutBtn = document.getElementById('headerLogoutBtn');
            if (logoutBtn) logoutBtn.style.display = 'none';

            // Afficher le lobby
            stateLobby.classList.add('active');
            stateLobby.style.pointerEvents = '';

            bgText.textContent = 'LOBBY';
            bgText.classList.add('lobby-active');
            bgText.classList.remove('bombanime-mode');
            if (currentGameMode === 'bombanime') {
                bgText.classList.add('bombanime-mode');
            }
            statusDot.classList.add('active');
            statusText.textContent = 'Lobby ouvert';

            // 🆕 Afficher le badge de mode dans le header
            const modeBadgeHeader = document.getElementById('modeBadgeHeader');
            const modeBadgeText = document.getElementById('modeBadgeText');
            if (modeBadgeHeader && modeBadgeText) {
                modeBadgeHeader.style.display = 'block';
                modeBadgeHeader.classList.remove('rivalry', 'bombanime', 'collect');
                if (currentGameMode === 'rivalry') {
                    modeBadgeText.textContent = 'Rivalité';
                    modeBadgeHeader.classList.add('rivalry');
                } else if (currentGameMode === 'bombanime') {
                    modeBadgeText.textContent = 'BombAnime';
                    modeBadgeHeader.classList.add('bombanime');
                } else if (currentGameMode === 'collect') {
                    modeBadgeText.textContent = 'Collect';
                    modeBadgeHeader.classList.add('collect');
                } else {
                    modeBadgeText.textContent = 'Classic';
                }
            }

            // 🆕 Afficher/cacher les sections selon le mode
            const teamsGroup = document.getElementById('teamsGroup');
            const lobbyHeaderLeft = document.querySelector('.lobby-header-left');
            
            // Paramètres classiques
            const modeGroup = document.querySelector('.mode-group');
            const livesGroup = document.getElementById('livesGroup');
            const livesIconGroup = document.getElementById('livesIconGroup');
            const questionsGroup = document.getElementById('questionsGroup');
            const speedBonusGroup = document.getElementById('speedBonusGroup');
            const timerGroup = document.querySelector('.timer-group');
            const answersGroup = document.querySelector('.setting-group:has(.answers-options)');
            const difficultyGroup = document.querySelector('.setting-group:has(.difficulty-options)');
            const seriesTrigger = document.getElementById('seriesTrigger');
            
            // Paramètres BombAnime
            const bombanimeSerieGroup = document.getElementById('bombanimeSerieGroup');
            const bombanimeLivesGroup = document.getElementById('bombanimeLivesGroup');
            const bombanimeTimerGroup = document.getElementById('bombanimeTimerGroup');
            const bombanimeBotsGroup = document.getElementById('bombanimeBotsGroup');
            
            // Paramètres Collect
            const collectDeckGroup = document.getElementById('collectDeckGroup');
            const collectHandGroup = document.getElementById('collectHandGroup');
            
            // Paramètre Anti-spoil
            const noSpoilGroup = document.querySelector('.no-spoil-group');
            
            
            if (currentGameMode === 'bombanime') {
                // Mode BombAnime
                if (teamsGroup) teamsGroup.style.display = 'none';
                if (modeGroup) modeGroup.style.display = 'none';
                if (livesGroup) livesGroup.style.display = 'none';
                if (livesIconGroup) livesIconGroup.style.display = 'none';
                if (questionsGroup) questionsGroup.style.display = 'none';
                if (speedBonusGroup) speedBonusGroup.style.display = 'none';
                if (timerGroup) timerGroup.style.display = 'none';
                if (answersGroup) answersGroup.style.display = 'none';
                if (difficultyGroup) difficultyGroup.style.display = 'none';
                if (seriesTrigger) seriesTrigger.style.display = 'none';
                if (noSpoilGroup) noSpoilGroup.style.display = 'none';
                
                if (bombanimeSerieGroup) bombanimeSerieGroup.style.display = 'block';
                if (bombanimeLivesGroup) bombanimeLivesGroup.style.display = 'block';
                if (bombanimeTimerGroup) bombanimeTimerGroup.style.display = 'block';
                // Bots réactivés temporairement
                if (bombanimeBotsGroup) bombanimeBotsGroup.style.display = 'block';
                
                // Cacher Collect
                
                if (collectDeckGroup) collectDeckGroup.style.display = 'none';
                if (collectHandGroup) collectHandGroup.style.display = 'none';
        const collectAnimeGrp = document.getElementById('collectAnimeFilterGroup');
        if (collectAnimeGrp) collectAnimeGrp.style.display = 'none';
                
                const teamCounters = document.getElementById('teamCounters');
                if (teamCounters) teamCounters.remove();
                
            } else if (currentGameMode === 'collect') {
                // Mode Collect
                if (teamsGroup) teamsGroup.style.display = 'none';
                if (modeGroup) modeGroup.style.display = 'none';
                if (livesGroup) livesGroup.style.display = 'none';
                if (livesIconGroup) livesIconGroup.style.display = 'none';
                if (questionsGroup) questionsGroup.style.display = 'none';
                if (speedBonusGroup) speedBonusGroup.style.display = 'none';
                if (timerGroup) timerGroup.style.display = 'none';
                if (answersGroup) answersGroup.style.display = 'none';
                if (difficultyGroup) difficultyGroup.style.display = 'none';
                if (seriesTrigger) seriesTrigger.style.display = 'none';
                if (noSpoilGroup) noSpoilGroup.style.display = 'none';
                
                // Cacher BombAnime
                if (bombanimeSerieGroup) bombanimeSerieGroup.style.display = 'none';
                if (bombanimeLivesGroup) bombanimeLivesGroup.style.display = 'none';
                if (bombanimeTimerGroup) bombanimeTimerGroup.style.display = 'none';
                if (bombanimeBotsGroup) bombanimeBotsGroup.style.display = 'none';
                
                // Afficher Collect
                
                if (collectDeckGroup) collectDeckGroup.style.display = 'block';
                if (collectHandGroup) collectHandGroup.style.display = 'block';
        const collectAnimeGrp = document.getElementById('collectAnimeFilterGroup');
        if (collectAnimeGrp) collectAnimeGrp.style.display = 'block';
                
                const teamCounters = document.getElementById('teamCounters');
                if (teamCounters) teamCounters.remove();
                
            } else if (currentGameMode === 'rivalry') {
                // Mode Rivalité
                if (teamsGroup) teamsGroup.style.display = 'block';
                if (modeGroup) modeGroup.style.display = 'block';
                if (livesGroup) livesGroup.style.display = 'block';
                if (livesIconGroup) livesIconGroup.style.display = 'block';
                if (timerGroup) timerGroup.style.display = 'block';
                if (answersGroup) answersGroup.style.display = 'block';
                if (difficultyGroup) difficultyGroup.style.display = 'block';
                if (seriesTrigger) seriesTrigger.style.display = 'block';
                if (noSpoilGroup) noSpoilGroup.style.display = 'block';
                
                if (bombanimeSerieGroup) bombanimeSerieGroup.style.display = 'none';
                if (bombanimeLivesGroup) bombanimeLivesGroup.style.display = 'none';
                if (bombanimeTimerGroup) bombanimeTimerGroup.style.display = 'none';
                if (bombanimeBotsGroup) bombanimeBotsGroup.style.display = 'none';
                
                // Cacher Collect
                
                if (collectDeckGroup) collectDeckGroup.style.display = 'none';
                if (collectHandGroup) collectHandGroup.style.display = 'none';
        const collectAnimeGrp = document.getElementById('collectAnimeFilterGroup');
        if (collectAnimeGrp) collectAnimeGrp.style.display = 'none';
                
                // Ajouter les compteurs d'équipe si pas déjà présents
                if (lobbyHeaderLeft && !document.getElementById('teamCounters')) {
                    const teamCountersHTML = `
                        <div class="team-counters" id="teamCounters">
                            <div class="team-counter">
                                <span class="team-dot team-1"></span>
                                <span class="team-count" id="team1Count">0</span>
                            </div>
                            <div class="team-counter">
                                <span class="team-dot team-2"></span>
                                <span class="team-count" id="team2Count">0</span>
                            </div>
                        </div>
                    `;
                    lobbyHeaderLeft.insertAdjacentHTML('beforeend', teamCountersHTML);
                } else {
                    // 🔥 FIX: Reset les compteurs si l'élément existe déjà (réouverture lobby)
                    const team1Count = document.getElementById('team1Count');
                    const team2Count = document.getElementById('team2Count');
                    if (team1Count) team1Count.textContent = '0';
                    if (team2Count) team2Count.textContent = '0';
                }
            } else {
                // Mode Classique
                if (teamsGroup) teamsGroup.style.display = 'none';
                if (modeGroup) modeGroup.style.display = 'block';
                if (livesGroup) livesGroup.style.display = 'block';
                if (livesIconGroup) livesIconGroup.style.display = 'block';
                if (timerGroup) timerGroup.style.display = 'block';
                if (answersGroup) answersGroup.style.display = 'block';
                if (difficultyGroup) difficultyGroup.style.display = 'block';
                if (seriesTrigger) seriesTrigger.style.display = 'block';
                if (noSpoilGroup) noSpoilGroup.style.display = 'block';
                
                if (bombanimeSerieGroup) bombanimeSerieGroup.style.display = 'none';
                if (bombanimeLivesGroup) bombanimeLivesGroup.style.display = 'none';
                if (bombanimeTimerGroup) bombanimeTimerGroup.style.display = 'none';
                if (bombanimeBotsGroup) bombanimeBotsGroup.style.display = 'none';
                
                // Cacher Collect
                
                if (collectDeckGroup) collectDeckGroup.style.display = 'none';
                if (collectHandGroup) collectHandGroup.style.display = 'none';
        const collectAnimeGrp = document.getElementById('collectAnimeFilterGroup');
        if (collectAnimeGrp) collectAnimeGrp.style.display = 'none';
                
                const teamCounters = document.getElementById('teamCounters');
                if (teamCounters) teamCounters.remove();
            }


            // Fade out du cercle
            anime({
                targets: absorptionCircle,
                opacity: [1, 0],
                duration: 400,
                easing: 'easeOutQuad',
                complete: () => {
                    absorptionCircle.style.width = '0';
                    absorptionCircle.style.height = '0';
                }
            });

            // Animation d'entrée du lobby
            anime({
                targets: stateLobby,
                opacity: [0, 1],
                duration: 500,
                easing: 'easeOutQuad'
            });

            // Mettre à jour le bouton Rejoindre
            updateAdminJoinButton();

            anime({
                targets: '.lobby-stats',
                opacity: [0, 1],
                translateX: [-30, 0],
                duration: 600,
                delay: 200,
                easing: 'easeOutCubic'
            });

            anime({
                targets: '.lobby-actions-full',
                opacity: [0, 1],
                translateX: [30, 0],
                duration: 600,
                delay: 250,
                easing: 'easeOutCubic'
            });
        }
    });

    // Fade out des éléments idle
    anime({
        targets: ['.idle-main', '.idle-stats'],
        opacity: 0,
        duration: 300,
        easing: 'easeOutQuad'
    });
}

// Clic sur carte Rivalité
modeRivaliteCard.addEventListener('click', async () => {
    if (modeRivaliteCard.classList.contains('selecting')) return;
    
    setGameMode('rivalry');
    
    modeRivaliteCard.classList.add('selecting');
    
    // 🆕 Retirer immédiatement les classes active pour désactiver pointer-events
    modeModalOverlay.classList.remove('active');
    modeModalContent.classList.remove('active');
    
    // Cacher les autres cartes
    anime({
        targets: [modeClassiqueCard, modeBombanimeCard, modeCollectCard],
        opacity: 0,
        scale: 0.9,
        duration: 150,
        easing: 'easeOutQuad'
    });
    
    // Fade le fond
    anime({
        targets: modeModalOverlay,
        opacity: [1, 0],
        duration: 300,
        delay: 50,
        easing: 'easeOutQuad'
    });
    
    // Animation Pop & Vanish (violet)
    anime.timeline()
        .add({
            targets: modeRivaliteCard,
            scale: [1, 1.2],
            boxShadow: ['0 0 0px rgba(139, 92, 246, 0)', '0 0 60px rgba(139, 92, 246, 1)'],
            duration: 150,
            easing: 'easeOutQuad'
        })
        .add({
            targets: modeRivaliteCard,
            scale: [1.2, 0],
            opacity: [1, 0],
            boxShadow: ['0 0 60px rgba(139, 92, 246, 1)', '0 0 0px rgba(139, 92, 246, 0)'],
            duration: 200,
            easing: 'easeInQuad',
            complete: () => {
                closeModeModal();
                modeRivaliteCard.classList.remove('selecting');
            }
        });
    
    console.log('Mode Rivalité sélectionné');
});

// Clic sur carte BombAnime -> sélectionner et fermer le modal
modeBombanimeCard.addEventListener('click', async () => {
    if (modeBombanimeCard.classList.contains('selecting')) return;
    
    setGameMode('bombanime');
    
    modeBombanimeCard.classList.add('selecting');
    
    // Retirer immédiatement les classes active pour désactiver pointer-events
    modeModalOverlay.classList.remove('active');
    modeModalContent.classList.remove('active');
    
    // Cacher les autres cartes
    anime({
        targets: [modeClassiqueCard, modeRivaliteCard, modeCollectCard],
        opacity: 0,
        scale: 0.9,
        duration: 150,
        easing: 'easeOutQuad'
    });
    
    // Fade le fond
    anime({
        targets: modeModalOverlay,
        opacity: [1, 0],
        duration: 300,
        delay: 50,
        easing: 'easeOutQuad'
    });
    
    // Animation Pop & Vanish (vert)
    anime.timeline()
        .add({
            targets: modeBombanimeCard,
            scale: [1, 1.2],
            boxShadow: ['0 0 0px rgba(74, 222, 128, 0)', '0 0 60px rgba(74, 222, 128, 1)'],
            duration: 150,
            easing: 'easeOutQuad'
        })
        .add({
            targets: modeBombanimeCard,
            scale: [1.2, 0],
            opacity: [1, 0],
            boxShadow: ['0 0 60px rgba(74, 222, 128, 1)', '0 0 0px rgba(74, 222, 128, 0)'],
            duration: 200,
            easing: 'easeInQuad',
            complete: () => {
                closeModeModal();
                modeBombanimeCard.classList.remove('selecting');
            }
        });
    
    console.log('Mode BombAnime sélectionné');
});

// Empêcher propagation des clics sur BombAnime
modeBombanimeCard.addEventListener('click', (e) => {
    e.stopPropagation();
});

// ============================================
// EVENT LISTENER COLLECT
// ============================================
modeCollectCard.addEventListener('click', async () => {
    if (modeCollectCard.classList.contains('disabled')) return;
    if (modeCollectCard.classList.contains('selecting')) return;
    
    setGameMode('collect');
    
    modeCollectCard.classList.add('selecting');
    
    // Retirer immédiatement les classes active pour désactiver pointer-events
    modeModalOverlay.classList.remove('active');
    modeModalContent.classList.remove('active');
    
    // Cacher les autres cartes
    anime({
        targets: [modeClassiqueCard, modeRivaliteCard, modeBombanimeCard],
        opacity: 0,
        scale: 0.9,
        duration: 150,
        easing: 'easeOutQuad'
    });
    
    // Fade le fond
    anime({
        targets: modeModalOverlay,
        opacity: [1, 0],
        duration: 300,
        delay: 50,
        easing: 'easeOutQuad'
    });
    
    // Animation Pop & Vanish (bleu)
    anime.timeline()
        .add({
            targets: modeCollectCard,
            scale: [1, 1.2],
            boxShadow: ['0 0 0px rgba(59, 130, 246, 0)', '0 0 60px rgba(59, 130, 246, 1)'],
            duration: 150,
            easing: 'easeOutQuad'
        })
        .add({
            targets: modeCollectCard,
            scale: [1.2, 0],
            opacity: [1, 0],
            boxShadow: ['0 0 60px rgba(59, 130, 246, 1)', '0 0 0px rgba(59, 130, 246, 0)'],
            duration: 200,
            easing: 'easeInQuad',
            complete: () => {
                closeModeModal();
                modeCollectCard.classList.remove('selecting');
            }
        });
    
    console.log('Mode Collect sélectionné');
});

// Empêcher propagation des clics sur Collect
modeCollectCard.addEventListener('click', (e) => {
    e.stopPropagation();
});

// ============================================
// GRILLE JOUEURS LOBBY
// ============================================
function populateLobbyPlayers() {
    const grid = document.getElementById('playersGridLobby');
    const countEl = document.getElementById('lobbyPlayerCount');
    grid.innerHTML = '';

    // Démarrer avec 0 joueurs pour test
    const startWithPlayers = []; // mockPlayers pour avoir des joueurs

    startWithPlayers.forEach((player, i) => {
        const card = document.createElement('div');
        card.className = 'player-card-mini';

        // En lobby : pas de stats affichées
        // En jeu : on affichera les coeurs ou points ici
        card.innerHTML = `
                    <div class="player-card-mini-badge"></div>
                    <div class="player-card-mini-name">${player}</div>
                    <div class="player-card-mini-stats">
                        <!-- Vide en lobby, rempli en jeu -->
                    </div>
                `;
        card.style.opacity = '0';
        grid.appendChild(card);

        anime({
            targets: card,
            opacity: [0, 1],
            translateY: [12, 0],
            delay: 300 + i * 30,
            duration: 350,
            easing: 'easeOutCubic'
        });
    });

    // Animer le compteur
    countEl.textContent = '0';
}

// ============================================
// FERMETURE LOBBY
// ============================================
document.getElementById('closeLobbyBtn').addEventListener('click', async () => {
    try {
        // Appeler le serveur pour fermer le lobby
        const response = await fetch('/admin/toggle-game', {
            method: 'POST',
            credentials: 'same-origin'
        });

        const data = await response.json();
        console.log('🔒 Fermeture lobby:', data);

        // Si le lobby est bien fermé, l'animation sera déclenchée par le socket 'game-deactivated'
        // Mais on peut aussi la lancer directement ici pour plus de réactivité
        if (!data.isActive) {
            closeLobbyUI();
        }
    } catch (error) {
        console.error('❌ Erreur fermeture lobby:', error);
    }
});

// ============================================
// 🎴 ADMIN REJOINDRE LOBBY (Collect + BombAnime)
// ============================================
let adminInLobby = false;

const adminJoinBtn = document.getElementById('adminJoinLobbyBtn');

// Afficher/masquer le bouton selon le mode
function updateAdminJoinButton() {
    if (!adminJoinBtn) return;
    
    if (currentGameMode === 'collect' || currentGameMode === 'bombanime') {
        adminJoinBtn.style.display = 'flex';
        adminJoinBtn.disabled = !twitchUser || adminInLobby;
        adminJoinBtn.querySelector('span').textContent = adminInLobby ? 'Rejoint ✓' : 'Rejoindre';
    } else {
        adminJoinBtn.style.display = 'none';
    }
}

// Observer le lobby : dès qu'il devient visible, sync le bouton
const lobbyObserver = new MutationObserver(() => {
    if (stateLobby && stateLobby.classList.contains('active')) {
        updateAdminJoinButton();
    }
});
if (stateLobby) {
    lobbyObserver.observe(stateLobby, { attributes: true, attributeFilter: ['class'] });
}

// Tooltip JS positionné sur body (contourne overflow:hidden)
let joinTooltipEl = null;

if (adminJoinBtn) {
    adminJoinBtn.addEventListener('mouseenter', () => {
        if (twitchUser || !adminJoinBtn.disabled) return;
        
        if (!joinTooltipEl) {
            joinTooltipEl = document.createElement('div');
            joinTooltipEl.className = 'join-tooltip-fixed';
            joinTooltipEl.textContent = 'Se connecter pour rejoindre';
            document.body.appendChild(joinTooltipEl);
        }
        
        const rect = adminJoinBtn.getBoundingClientRect();
        joinTooltipEl.style.left = (rect.left + rect.width / 2 - joinTooltipEl.offsetWidth / 2) + 'px';
        joinTooltipEl.style.top = (rect.top - joinTooltipEl.offsetHeight - 14) + 'px';
        joinTooltipEl.classList.add('visible');
    });
    
    adminJoinBtn.addEventListener('mouseleave', () => {
        if (joinTooltipEl) joinTooltipEl.classList.remove('visible');
    });
}

if (adminJoinBtn) {
    adminJoinBtn.addEventListener('click', () => {
        if (!twitchUser || adminInLobby) return;
        
        // Rejoindre le lobby
        socket.emit('join-lobby', {
            twitchId: twitchUser.id,
            username: twitchUser.display_name,
            avatar: twitchUser.profile_image_url,
            isAdmin: true
        });
        adminInLobby = true;
        updateAdminJoinButton();
    });
}

// Reset le state quand le lobby se ferme
function resetAdminJoinState() {
    adminInLobby = false;
    sessionStorage.removeItem('adminBombanimePlayer');
    updateAdminJoinButton();
}

// ============================================
// ============================================
// PARAMÈTRES INLINE - Gestion des options
// ============================================

// ============================================
// BOMBANIME - Dropdown Séries Underline
// ============================================
const bombanimeDropdown = document.getElementById('bombanimeSerieGroup');
const bombanimeDropdownTrigger = document.getElementById('bombanimeDropdownTrigger');
let selectedBombanimeSerie = 'Naruto';

// Toggle dropdown
if (bombanimeDropdownTrigger) {
    bombanimeDropdownTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        bombanimeDropdown.classList.toggle('open');
    });
}

// Fermer au clic extérieur
document.addEventListener('click', (e) => {
    if (bombanimeDropdown && !bombanimeDropdown.contains(e.target)) {
        bombanimeDropdown.classList.remove('open');
    }
});

// Sélection d'une série (délégation sur document)
document.addEventListener('click', async (e) => {
    const item = e.target.closest('.bombanime-dropdown-item');
    if (!item) return;
    
    e.stopPropagation();
    
    const seriesValue = item.dataset.series;
    const seriesName = item.dataset.name;
    const seriesCount = item.dataset.count;
    
    // Retirer selected des autres
    document.querySelectorAll('.bombanime-dropdown-item').forEach(i => i.classList.remove('selected'));
    item.classList.add('selected');
    
    // Mettre à jour la valeur affichée
    const nameDisplay = document.getElementById('bombanimeSerieValue');
    const countDisplay = document.getElementById('bombanimeSerieCount');
    
    if (nameDisplay) {
        nameDisplay.textContent = seriesName;
        anime({
            targets: nameDisplay,
            scale: [1.1, 1],
            duration: 200,
            easing: 'easeOutQuad'
        });
    }
    
    if (countDisplay) {
        countDisplay.textContent = '• ' + seriesCount;
    }
    
    selectedBombanimeSerie = seriesValue;
    console.log(`🎮 Série BombAnime: ${seriesValue} (${seriesCount} persos)`);
    
    // Envoyer la mise à jour au serveur si on est en mode bombanime
    if (currentGameMode === 'bombanime') {
        try {
            const response = await fetch('/admin/bombanime/update-serie', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serie: seriesValue })
            });
            if (response.ok) {
                console.log(`✅ Série mise à jour sur le serveur: ${seriesValue}`);
            }
        } catch (error) {
            console.error('❌ Erreur mise à jour série:', error);
        }
    }
    
    // Fermer le dropdown
    const dropdown = document.getElementById('bombanimeSerieGroup');
    if (dropdown) {
        dropdown.classList.remove('open');
        console.log('🔽 Dropdown fermé');
    }
});

// ============================================
// COLLECT - Cartes en main (3 ou 5)
// ============================================
let collectHandSize = 3;

document.querySelectorAll('#collectHandGroup .setting-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#collectHandGroup .setting-option-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        collectHandSize = parseInt(btn.dataset.value);
        const valueEl = document.getElementById('collectHandValue');
        if (valueEl) valueEl.textContent = collectHandSize;
        // Mettre à jour les étoiles sur les cartes joueurs dans le lobby
        document.querySelectorAll('.player-stars').forEach(el => {
            el.textContent = '☆'.repeat(collectHandSize);
        });
        console.log('🎴 Cartes en main:', collectHandSize);
    });
});

// ============================================
// COLLECT - Filtre Animes (dynamique depuis serveur)
// ============================================
const ANIME_DISPLAY_NAMES = {
    'OnePiece': 'One Piece', 'Naruto': 'Naruto', 'Bleach': 'Bleach',
    'DragonBallZ': 'Dragon Ball', 'DragonBall': 'Dragon Ball', 'MyHeroAcademia': 'My Hero Academia',
    'BlackClover': 'Black Clover', 'DemonSlayer': 'Demon Slayer',
    'FairyTail': 'Fairy Tail', 'JujutsuKaisen': 'Jujutsu Kaisen',
    'AttackOnTitan': 'Attack on Titan', 'HunterXHunter': 'Hunter × Hunter',
    'Fate': 'Fate', 'ChainsawMan': 'Chainsaw Man', 'Haikyuu': 'Haikyu!!',
    'FullmetalAlchemist': 'Fullmetal Alchemist', 'Reborn': 'Reborn!',
    'JoJo': "JoJo's Bizarre Adventure", 'BlueLock': 'Blue Lock',
    'FoodWars': 'Food Wars', 'NanatsuNoTaizai': 'Seven Deadly Sins',
    'KurokoNoBasket': "Kuroko's Basket", 'OnePunchMan': 'One Punch Man',
    'TokyoGhoul': 'Tokyo Ghoul', 'Gintama': 'Gintama', 'Frieren': 'Frieren',
    'DeathNote': 'Death Note', 'DrStone': 'Dr. Stone', 'FireForce': 'Fire Force',
    'TokyoRevengers': 'Tokyo Revengers', 'VinlandSaga': 'Vinland Saga',
    'OshiNoKo': 'Oshi no Ko', 'ReZero': 'Re:Zero',
    'SwordArtOnline': 'Sword Art Online', 'SpyFamily': 'Spy × Family',
    'Berserk': 'Berserk', 'CodeGeass': 'Code Geass', 'SoulEater': 'Soul Eater',
    'MobPsycho': 'Mob Psycho 100', 'AkameGaKill': 'Akame ga Kill!',
    'Baki': 'Baki', 'Kakegurui': 'Kakegurui', 'Noragami': 'Noragami',
    'SteinsGate': 'Steins;Gate', 'Kaguya-sama': 'Kaguya-sama',
    'Mashle': 'Mashle', 'SaikiKusuo': 'Saiki K.',
    'SoloLeveling': 'Solo Leveling', 'VioletEvergarden': 'Violet Evergarden',
    'Boruto': 'Boruto', 'YuYuHakusho': 'Yu Yu Hakusho',
    'KingdomS': 'Kingdom', 'WorldTrigger': 'World Trigger'
};

// Animes cochés par défaut (affichés en haut de la liste)
const DEFAULT_SELECTED_ANIME_IDS = [
    'Naruto', 'OnePiece', 'Bleach', 'DragonBall',
    'MyHeroAcademia', 'HunterXHunter', 'JoJo',
    'BlackClover', 'DemonSlayer', 'JujutsuKaisen',
    'AttackOnTitan', 'FairyTail'
];

let COLLECT_ALL_ANIMES = [];
let BIG3_ANIME_IDS = ['OnePiece', 'Naruto', 'Bleach'];
let LOCKED_ANIME_IDS = DEFAULT_SELECTED_ANIME_IDS; // Les 9 ne peuvent pas être décochés
let collectSelectedAnimes = new Set();

function initAnimeFilter(animeList, big3) {
    BIG3_ANIME_IDS = big3 || ['OnePiece', 'Naruto', 'Bleach'];
    
    console.log('🎴 Anime IDs reçus:', animeList.map(a => a.id));
    console.log('🎴 LOCKED_ANIME_IDS:', LOCKED_ANIME_IDS);
    console.log('🎴 DragonBall in locked?', LOCKED_ANIME_IDS.includes('DragonBall'));
    
    // Sort: locked first (in their defined order), then rest by count desc
    const defaults = [];
    const rest = [];
    for (const anime of animeList) {
        if (LOCKED_ANIME_IDS.includes(anime.id)) {
            defaults.push(anime);
        } else {
            rest.push(anime);
        }
    }
    console.log('🎴 Defaults trouvés:', defaults.map(a => a.id));
    console.log('🎴 Rest:', rest.length);
    defaults.sort((a, b) => LOCKED_ANIME_IDS.indexOf(a.id) - LOCKED_ANIME_IDS.indexOf(b.id));
    rest.sort((a, b) => b.count - a.count);
    
    COLLECT_ALL_ANIMES = [...defaults, ...rest];
    // Tous cochés par défaut
    collectSelectedAnimes = new Set(COLLECT_ALL_ANIMES.map(a => a.id));
    buildAnimeFilterGrid();
    console.log(`🎴 Filtre séries chargé: ${COLLECT_ALL_ANIMES.length} séries, ${LOCKED_ANIME_IDS.length} verrouillées`);
}

function buildAnimeFilterGrid() {
    const grid = document.getElementById('animeFilterGrid');
    if (!grid) return;
    
    grid.innerHTML = COLLECT_ALL_ANIMES.map(anime => {
        const isLocked = LOCKED_ANIME_IDS.includes(anime.id);
        const isBig3 = BIG3_ANIME_IDS.includes(anime.id);
        const isChecked = collectSelectedAnimes.has(anime.id);
        const displayName = ANIME_DISPLAY_NAMES[anime.id] || anime.id.replace(/([A-Z])/g, ' $1').trim();
        return `
            <div class="anime-filter-item ${isChecked ? 'checked' : ''} ${isLocked ? 'locked' : ''} ${isBig3 ? 'big3' : ''}" data-anime-id="${anime.id}">
                <div class="anime-cb">
                    <svg viewBox="0 0 12 12"><polyline points="2 6 5 9 10 3"/></svg>
                </div>
                <span class="anime-filter-name">${displayName}</span>
                <span class="anime-filter-count">${anime.count}</span>
            </div>
        `;
    }).join('');
    
    // Click handlers
    grid.querySelectorAll('.anime-filter-item').forEach(item => {
        item.addEventListener('click', () => {
            const animeId = item.dataset.animeId;
            if (LOCKED_ANIME_IDS.includes(animeId)) return;
            
            const isChecked = item.classList.contains('checked');
            if (isChecked) {
                item.classList.remove('checked');
                collectSelectedAnimes.delete(animeId);
            } else {
                item.classList.add('checked');
                collectSelectedAnimes.add(animeId);
            }
            updateAnimeCount();
        });
    });
    
    updateAnimeCount();
}

function updateAnimeCount() {
    const countEl = document.getElementById('collectAnimeCount');
    if (countEl) countEl.textContent = `${collectSelectedAnimes.size}/${COLLECT_ALL_ANIMES.length}`;
}

// Toggle panel
document.getElementById('collectAnimeFilterToggle')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const panel = document.getElementById('animeFilterPanel');
    const chevron = document.getElementById('animeFilterChevron');
    if (!panel) return;
    const isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : 'block';
    if (chevron) chevron.classList.toggle('open', !isOpen);
});

// Click outside to close
document.addEventListener('click', (e) => {
    const panel = document.getElementById('animeFilterPanel');
    if (!panel || panel.style.display === 'none') return;
    const group = document.getElementById('collectAnimeFilterGroup');
    if (group && !group.contains(e.target)) {
        panel.style.display = 'none';
        const chevron = document.getElementById('animeFilterChevron');
        if (chevron) chevron.classList.remove('open');
    }
});

// Toggle all button
document.getElementById('animeToggleAll')?.addEventListener('click', () => {
    const allChecked = collectSelectedAnimes.size === COLLECT_ALL_ANIMES.length;
    if (allChecked) {
        // Décocher tout sauf les 9 locked
        collectSelectedAnimes = new Set(LOCKED_ANIME_IDS);
        document.querySelectorAll('.anime-filter-item').forEach(item => {
            if (LOCKED_ANIME_IDS.includes(item.dataset.animeId)) {
                item.classList.add('checked');
            } else {
                item.classList.remove('checked');
            }
        });
    } else {
        // Tout cocher
        collectSelectedAnimes = new Set(COLLECT_ALL_ANIMES.map(a => a.id));
        document.querySelectorAll('.anime-filter-item').forEach(item => item.classList.add('checked'));
    }
    updateAnimeCount();
});

// Anime filter is initialized via socket event in initSocket()

// ============================================
// COLLECT - Dropdown Deck avec Checkboxes
// ============================================
const collectDeckDropdown = document.getElementById('collectDeckGroup');
const collectDeckTrigger = document.getElementById('collectDeckTrigger');
let selectedCollectAnimes = [
    'OnePiece', 'Naruto', 'Bleach',
    'HunterXHunter', 'AttackOnTitan', 'DemonSlayer', 'JoJo',
    'MyHeroAcademia', 'FairyTail', 'JujutsuKaisen',
    'DragonBall', 'VinlandSaga', 'BlackClover'
];

// Toggle dropdown
if (collectDeckTrigger) {
    collectDeckTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (collectDeckDropdown) {
            collectDeckDropdown.classList.toggle('open');
        }
    });
}

// Fermer au clic extérieur
document.addEventListener('click', (e) => {
    if (collectDeckDropdown && !collectDeckDropdown.contains(e.target)) {
        collectDeckDropdown.classList.remove('open');
    }
});

// Gestion des checkboxes Collect
document.addEventListener('change', (e) => {
    if (!e.target.matches('.collect-dropdown-item input[type="checkbox"]')) return;
    
    const item = e.target.closest('.collect-dropdown-item');
    if (!item || item.classList.contains('locked')) return;
    
    const anime = item.dataset.anime;
    
    if (e.target.checked) {
        if (!selectedCollectAnimes.includes(anime)) {
            selectedCollectAnimes.push(anime);
        }
    } else {
        selectedCollectAnimes = selectedCollectAnimes.filter(a => a !== anime);
    }
    
    updateCollectDeckCount();
    updateCollectStartButton();
    
    console.log(`🎴 Anime Collect: ${selectedCollectAnimes.length} animes`, selectedCollectAnimes);
});

// Mettre à jour le compteur d'animes
function updateCollectDeckCount() {
    const countDisplay = document.getElementById('collectDeckCount');
    if (countDisplay) {
        countDisplay.textContent = selectedCollectAnimes.length;
        
        anime({
            targets: countDisplay,
            scale: [1.2, 1],
            duration: 200,
            easing: 'easeOutQuad'
        });
    }
}

// Valider le bouton Démarrer pour Collect
function updateCollectStartButton() {
    if (currentGameMode !== 'collect') return;
    
    const startBtn = document.getElementById('startGameBtn');
    const playerCount = document.querySelectorAll('#playersGridLobby .player-card-mini').length;
    
    // Besoin d'au moins 3 animes ET au moins 2 joueurs
    const canStart = playerCount >= 2;
    
    if (startBtn) {
        if (canStart) {
            startBtn.classList.remove('disabled');
            startBtn.disabled = false;
        } else {
            startBtn.classList.add('disabled');
            startBtn.disabled = true;
        }
    }
}

// ============================================
// BOMBANIME - Slider Timer
// ============================================
const bombanimeTimerSlider = document.getElementById('bombanimeTimerSlider');
if (bombanimeTimerSlider) {
    bombanimeTimerSlider.addEventListener('input', () => {
        const value = bombanimeTimerSlider.value;
        const valueDisplay = document.getElementById('bombanimeTimerValue');
        if (valueDisplay) {
            valueDisplay.textContent = value + 's';
            anime({
                targets: valueDisplay,
                scale: [1.1, 1],
                duration: 150,
                easing: 'easeOutQuad'
            });
        }
        console.log(`⏱️ Timer BombAnime: ${value}s`);
    });
}

// Options génériques (vies, questions, timer, difficulté)
document.querySelectorAll('.setting-group:not(.mode-group):not(.series-group) .setting-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const group = btn.closest('.setting-group');
        const valueDisplay = group.querySelector('.setting-group-value');

        // Retirer active des autres
        group.querySelectorAll('.setting-option-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Mettre à jour la valeur affichée
        valueDisplay.textContent = btn.dataset.value;

        // Animation
        anime({
            targets: valueDisplay,
            scale: [1.15, 1],
            duration: 300,
            easing: 'easeOutBack'
        });

        // Si c'est le groupe des vies classique, mettre à jour les cartes joueurs
        if (group.classList.contains('lives-group')) {
            const lives = parseInt(btn.dataset.value) || 3;
            document.querySelectorAll('.player-card-mini-stat').forEach(stat => {
                stat.innerHTML = '❤️'.repeat(lives);
            });
        }
        
        // Si c'est le groupe des vies BombAnime, mettre à jour les cartes joueurs
        if (group.classList.contains('bombanime-lives-group')) {
            const lives = parseInt(btn.dataset.value) || 1;
            document.querySelectorAll('.player-card-mini-stat').forEach(stat => {
                stat.innerHTML = getBombIconsHTML(lives);
            });
        }
        
    });
});

// Mode de jeu (Vies/Points)
document.querySelectorAll('.mode-group .setting-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const group = btn.closest('.setting-group');
        const valueDisplay = document.getElementById('modeValue');
        const livesGroup = document.getElementById('livesGroup');
        const questionsGroup = document.getElementById('questionsGroup');
        const speedBonusGroup = document.getElementById('speedBonusGroup'); // 🆕

        group.querySelectorAll('.setting-option-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        valueDisplay.textContent = btn.dataset.value;

        // Mode Vies : afficher vies, cacher questions et speedBonus
        if (btn.dataset.mode === 'vie') {
            // Afficher vies
            livesGroup.style.display = 'block';
            livesGroup.classList.remove('hidden');
            anime({
                targets: livesGroup,
                opacity: [0, 1],
                translateY: [-10, 0],
                duration: 300,
                easing: 'easeOutCubic'
            });

            // Cacher questions
            anime({
                targets: questionsGroup,
                opacity: [1, 0],
                translateY: [0, -10],
                duration: 200,
                easing: 'easeInCubic',
                complete: () => {
                    questionsGroup.style.display = 'none';
                    questionsGroup.classList.add('hidden');
                }
            });

            // 🆕 Cacher speedBonus
            anime({
                targets: speedBonusGroup,
                opacity: [1, 0],
                translateY: [0, -10],
                duration: 200,
                easing: 'easeInCubic',
                complete: () => {
                    speedBonusGroup.style.display = 'none';
                    speedBonusGroup.classList.add('hidden');
                }
            });


            const lives = parseInt(document.querySelector('.lives-group .setting-option-btn.active')?.dataset.value) || 3;
            document.querySelectorAll('.player-card-mini-stat').forEach(stat => {
                stat.innerHTML = getLivesIconsHTML(selectedLivesIcon, lives, lives);
            });

        }
        // Mode Points : cacher vies, afficher questions et speedBonus
        else {
            // Cacher vies
            anime({
                targets: livesGroup,
                opacity: [1, 0],
                translateY: [0, -10],
                duration: 200,
                easing: 'easeInCubic',
                complete: () => {
                    livesGroup.style.display = 'none';
                    livesGroup.classList.add('hidden');
                }
            });

            // Afficher questions
            questionsGroup.style.display = 'block';
            questionsGroup.classList.remove('hidden');
            anime({
                targets: questionsGroup,
                opacity: [0, 1],
                translateY: [-10, 0],
                duration: 300,
                easing: 'easeOutCubic'
            });

            // 🆕 Afficher speedBonus
            speedBonusGroup.style.display = 'block';
            speedBonusGroup.classList.remove('hidden');
            anime({
                targets: speedBonusGroup,
                opacity: [0, 1],
                translateY: [-10, 0],
                duration: 300,
                easing: 'easeOutCubic'
            });

            document.querySelectorAll('.player-card-mini-stat').forEach(stat => {
                stat.innerHTML = '<span class="player-points">0</span>';
            });

        }
    });
});

// Dropdown séries - REMOVED, now using modal

// Timer slider
document.getElementById('timerSlider').addEventListener('input', (e) => {
    const value = e.target.value;
    document.getElementById('timerValue').textContent = value + 's';
});

// 🆕 Bonus rapidité (Oui/Non)
document.querySelectorAll('.speed-bonus-options .setting-option-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        const group = btn.closest('.setting-group');
        const valueDisplay = document.getElementById('speedBonusValue');
        
        group.querySelectorAll('.setting-option-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const isEnabled = btn.dataset.value === 'true';
        valueDisplay.textContent = isEnabled ? 'Oui' : 'Non';
        
        // Envoyer au serveur
        try {
            await fetch('/admin/set-speed-bonus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ enabled: isEnabled })
            });
            console.log(`⚡ Bonus rapidité: ${isEnabled ? 'Activé' : 'Désactivé'}`);
        } catch (error) {
            console.error('Erreur set-speed-bonus:', error);
        }
    });
});

// ============================================
// SERIES MODAL
// ============================================
const seriesTrigger = document.getElementById('seriesTrigger');
const seriesModal = document.getElementById('seriesModal');
const seriesModalOverlay = document.getElementById('seriesModalOverlay');
const seriesModalClose = document.getElementById('seriesModalClose');
const seriesSearchInput = document.getElementById('seriesSearchInput');
const seriesCards = document.querySelectorAll('.series-card:not(.soon)');
const allSeriesCards = document.querySelectorAll('.series-card');

function openSeriesModal() {
    seriesModal.classList.add('active');
    seriesModalOverlay.classList.add('active');
    seriesSearchInput.focus();
    
    // Synchroniser avec le filtre actuel (Overall par défaut)
    const currentValue = document.getElementById('seriesValue')?.textContent || 'Overall';
    
    document.querySelectorAll('.series-card').forEach(card => {
        card.classList.toggle('active', card.dataset.name === currentValue);
    });
}

function closeSeriesModal() {
    seriesModal.classList.remove('active');
    seriesModalOverlay.classList.remove('active');
    seriesSearchInput.value = '';
    filterSeries('');
}

seriesTrigger.addEventListener('click', openSeriesModal);
seriesModalOverlay.addEventListener('click', closeSeriesModal);
seriesModalClose.addEventListener('click', closeSeriesModal);

// Series card selection
seriesCards.forEach(card => {
    card.addEventListener('click', () => {
        // Remove active from all
        document.querySelectorAll('.series-card').forEach(c => c.classList.remove('active'));
        // Add active to clicked
        card.classList.add('active');

        // Update value display
        const seriesName = card.dataset.name;
        document.getElementById('seriesValue').textContent = seriesName;

        // Animate check
        anime({
            targets: card.querySelector('.series-card-check'),
            scale: [0.5, 1.2, 1],
            duration: 400,
            easing: 'easeOutBack'
        });

        // Close modal after short delay
        setTimeout(closeSeriesModal, 300);
    });
});

// Search filter
function filterSeries(query) {
    const lowerQuery = query.toLowerCase();
    allSeriesCards.forEach(card => {
        const name = card.dataset.name.toLowerCase();
        if (name.includes(lowerQuery)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

seriesSearchInput.addEventListener('input', (e) => {
    filterSeries(e.target.value);
});

// Close on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && seriesModal.classList.contains('active')) {
        closeSeriesModal();
    }
    // BombAnime dropdown
    if (e.key === 'Escape' && bombanimeDropdown && bombanimeDropdown.classList.contains('open')) {
        bombanimeDropdown.classList.remove('open');
    }
    // Collect dropdown
    if (e.key === 'Escape' && collectDeckDropdown && collectDeckDropdown.classList.contains('open')) {
        collectDeckDropdown.classList.remove('open');
    }
});



let playerIndex = 0;


// ============================================
// MODAL CARTE JOUEUR
// ============================================
const playerModalOverlay = document.getElementById('playerModalOverlay');
const playerModal = document.getElementById('playerModal');
const playerModalClose = document.getElementById('playerModalClose');

async function openPlayerModal(playerName, isChampion, playerTitle, twitchId = null) {
    const statGames = document.getElementById('statGames');
    const statWins = document.getElementById('statWins');
    const statWinrate = document.getElementById('statWinrate');

    const modalAvatar = document.getElementById('playerModalAvatar');
    if (modalAvatar) {
        modalAvatar.style.opacity = '0';
    }

    // Stocker le joueur actuel pour le changement d'équipe
    currentModalPlayer = { name: playerName, twitchId };

    // Activer animation barres
    statGames.classList.add('loading');
    statWins.classList.add('loading');
    statWinrate.classList.add('loading');
    statGames.textContent = '';
    statWins.textContent = '';
    statWinrate.textContent = '';

    // Mettre à jour nom, badge, titre
    document.getElementById('playerModalName').textContent = playerName;
    document.getElementById('playerModalBadge').textContent = isChampion ? 'DERNIER VAINQUEUR' : '';
    document.getElementById('playerModalTitle').textContent = playerTitle || '';

    const modalCard = document.querySelector('.player-modal-card');
    modalCard.classList.toggle('champion', isChampion);

    // Gérer le bouton de changement d'équipe (seulement en mode Rivalité)
    const teamSwitchDiv = document.getElementById('playerModalTeamSwitch');
    const teamSwitchBtn = document.getElementById('teamSwitchBtn');
    const teamSwitchLabel = document.getElementById('teamSwitchLabel');
    
    // 🆕 Masquer le bouton de changement d'équipe (l'admin peut cliquer sur le badge directement)
    if (teamSwitchDiv) {
        teamSwitchDiv.style.display = 'none';
    }

    // Afficher modal
    document.getElementById('playerModalOverlay').classList.add('active');
    document.getElementById('playerModal').classList.add('active');

    // 🔥 Temps minimum de loading pour voir l'animation
    const minLoadingTime = 600;
    const startTime = Date.now();

    let gamesValue = '0';
    let winsValue = '0';
    let winrateValue = '0%';

    // Charger stats
    if (twitchId) {
        try {
            const response = await fetch(`/profile/${twitchId}`);
            const data = await response.json();

            const modalAvatar = document.getElementById('playerModalAvatar');
            if (modalAvatar) {
                modalAvatar.src = data.user.avatar_url || 'cardpic.png';
                modalAvatar.onload = () => {
                    modalAvatar.style.opacity = '1';
                };
            }

            gamesValue = data.user.total_games_played || 0;
            winsValue = data.user.total_victories || 0;
            winrateValue = (parseInt(data.user.win_rate) || 0) + '%';
        } catch (e) {
            console.error('Erreur chargement profil:', e);
        }
    }

    // 🔥 Attendre le temps minimum avant d'afficher
    const elapsed = Date.now() - startTime;
    const remainingTime = Math.max(0, minLoadingTime - elapsed);

    setTimeout(() => {
        // Retirer loading avec animation
        statGames.classList.remove('loading');
        statWins.classList.remove('loading');
        statWinrate.classList.remove('loading');

        // Afficher les valeurs avec un léger délai entre chaque
        setTimeout(() => {
            statGames.textContent = gamesValue;
            anime({
                targets: statGames,
                scale: [0.5, 1],
                opacity: [0, 1],
                duration: 300,
                easing: 'easeOutBack'
            });
        }, 0);

        setTimeout(() => {
            statWins.textContent = winsValue;
            anime({
                targets: statWins,
                scale: [0.5, 1],
                opacity: [0, 1],
                duration: 300,
                easing: 'easeOutBack'
            });
        }, 100);

        setTimeout(() => {
            statWinrate.textContent = winrateValue;
            anime({
                targets: statWinrate,
                scale: [0.5, 1],
                opacity: [0, 1],
                duration: 300,
                easing: 'easeOutBack'
            });
        }, 200);

    }, remainingTime);
}

function closePlayerModal() {
    playerModalOverlay.classList.remove('active');
    playerModal.classList.remove('active');
}

playerModalClose.addEventListener('click', closePlayerModal);
playerModalOverlay.addEventListener('click', closePlayerModal);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && playerModal.classList.contains('active')) {
        closePlayerModal();
    }
});

// ============================================
// ÉTAT GAME - SYSTÈME COMPLET
// ============================================
let gameStarted = false;

// 🎙️ Masquer le bouton Twitch en partie (empêcher connexion mid-game)
function updateTwitchBtnVisibility() {
    const btn = document.getElementById('twitchConnectBtn');
    if (btn) btn.style.display = gameStarted ? 'none' : '';
}
let currentQuestion = 0;
let timerInterval = null;
let timerValue = 10;
let gameSettings = {
    mode: 'vie',
    lives: 3,
    timer: 10,
    totalQuestions: 20
};

// Mode de tri de la grille (score ou team) - uniquement pour Rivalité
let gridSortMode = 'score';


// Joueurs en jeu
let gamePlayers = [];


function updateLobbyPlayers(players) {
    const grid = document.getElementById('playersGridLobby');
    const countEl = document.getElementById('lobbyPlayerCount');

    if (!grid) return;

    // Mettre à jour le compteur
    if (countEl) countEl.textContent = players.length;

    // Vider la grille
    grid.innerHTML = '';

    updateStartButton(players.length);

    // Si pas de joueurs, juste laisser vide
    if (players.length === 0) {
        // Reset compteurs équipes
        if (currentGameMode === 'rivalry') {
            const team1Count = document.getElementById('team1Count');
            const team2Count = document.getElementById('team2Count');
            if (team1Count) team1Count.textContent = '0';
            if (team2Count) team2Count.textContent = '0';
        }
        return;
    }

    // Compteurs pour les équipes
    let team1Players = 0;
    let team2Players = 0;

    // Sinon afficher les joueurs
    players.forEach((player, index) => {
        const card = document.createElement('div');
        card.className = 'player-card-mini';

        // Gérer les deux formats de données
        const isChampion = player.isChampion || player.isLastGlobalWinner;
        const twitchId = player.twitch_id || player.twitchId;

        if (isChampion) card.classList.add('champion');

        // 🆕 Attribuer une équipe en mode Rivalité
        if (currentGameMode === 'rivalry') {
            // Si le joueur a déjà une équipe assignée, l'utiliser
            // Sinon attribuer alternativement pour équilibrer
            const playerTeam = player.team || ((index % 2) + 1);
            card.classList.add(`team-${playerTeam}`);
            card.dataset.team = playerTeam;
            
            if (playerTeam === 1) team1Players++;
            else team2Players++;
        }

        // Récupérer les vies selon le mode de jeu
        let currentLives;
        let currentMode;
        
        if (currentGameMode === 'bombanime') {
            // Mode BombAnime - utiliser le paramètre BombAnime
            currentLives = parseInt(document.querySelector('.bombanime-lives-group .setting-option-btn.active')?.dataset.value) || 1;
            currentMode = 'vie'; // BombAnime est toujours en mode vies
        } else {
            // Mode classique ou rivalité
            currentLives = parseInt(document.querySelector('.lives-group .setting-option-btn.active')?.dataset.value) || 3;
            currentMode = document.querySelector('.mode-group .setting-option-btn.active')?.dataset.mode || 'vie';
        }

        card.dataset.twitchId = twitchId || '';

        // Badge d'équipe si en mode Rivalité
        const teamBadgeHTML = (currentGameMode === 'rivalry' && card.dataset.team) 
            ? `<span class="team-badge-lobby team-${card.dataset.team}">${card.dataset.team === '1' ? 'A' : 'B'}</span>`
            : '<div class="player-card-mini-badge"></div>';

        // Stats selon le mode
        let statsHTML = '';
        if (currentGameMode === 'collect') {
            statsHTML = `<span class="player-stars">${'☆'.repeat(collectHandSize || 3)}</span>`;
        } else if (currentGameMode === 'bombanime') {
            // Icônes bombes pour BombAnime
            statsHTML = getBombIconsHTML(currentLives);
        } else if (currentMode === 'vie') {
            statsHTML = getLivesIconsHTML(selectedLivesIcon, currentLives, currentLives);
        } else {
            statsHTML = '<span class="player-points">0</span>';
        }

        card.innerHTML = `
        ${teamBadgeHTML}
        <div class="player-card-mini-name">${player.username}</div>
        <div class="player-card-mini-title">${player.title || 'Novice'}</div>
        <div class="player-card-mini-separator"></div>
        <div class="player-card-mini-stat">
            ${statsHTML}
        </div>
        <button class="player-card-mini-kick" title="Exclure ${player.username}">
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
    `;

        // ===== CLIC SUR BOUTON KICK =====
        const kickBtn = card.querySelector('.player-card-mini-kick');
        if (kickBtn) {
            kickBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                kickPlayer(player.username, twitchId, card);
            });
        }

        // ===== CLIC SUR BADGE ÉQUIPE =====
        const teamBadge = card.querySelector('.team-badge-lobby');
        if (teamBadge) {
            teamBadge.addEventListener('click', (e) => {
                e.stopPropagation();
                const currentTeam = card.classList.contains('team-1') ? 1 : 2;
                const newTeam = currentTeam === 1 ? 2 : 1;

                switchCardTeam(card, newTeam);
                updateTeamCounters();
            });
        }

        // Clic pour ouvrir la modal
        card.addEventListener('click', (e) => {
            if (e.target.closest('.player-card-mini-kick')) return;
            if (e.target.closest('.team-badge-lobby')) return;
            openPlayerModal(player.username, isChampion, player.title || 'Novice', twitchId);
        });

        card.style.opacity = '0';
        card.style.cursor = 'pointer';
        grid.appendChild(card);

        anime({
            targets: card,
            opacity: [0, 1],
            translateY: [12, 0],
            delay: index * 30,
            duration: 350,
            easing: 'easeOutCubic'
        });
    });

    // 🆕 Mettre à jour les compteurs d'équipes
    if (currentGameMode === 'rivalry') {
        const team1Count = document.getElementById('team1Count');
        const team2Count = document.getElementById('team2Count');
        if (team1Count) team1Count.textContent = team1Players;
        if (team2Count) team2Count.textContent = team2Players;
    }
    
    // 🤖 Mettre à jour le compteur de bots en mode BombAnime
    if (currentGameMode === 'bombanime') {
        const botsCount = players.filter(p => p.isFake).length;
        const botsCountEl = document.getElementById('bombanimeBotsCount');
        if (botsCountEl) botsCountEl.textContent = botsCount;
        
        // Désactiver le bouton si 12 bots max (13 joueurs max - au moins 1 vrai joueur)
        const addBotBtn = document.getElementById('bombanimeAddBotBtn');
        if (addBotBtn) {
            addBotBtn.disabled = players.length >= 13;
        }
    }

    updateStartButton(players.length);


}

// Fonction pour vérifier si le bouton démarrer doit être actif
function updateStartButton(playerCount) {
    const startBtn = document.getElementById('startGameBtn');
    if (!startBtn) return;

    // 🆕 En mode Rivalité, vérifier que les deux équipes ont des joueurs
    if (currentGameMode === 'rivalry') {
        const team1Count = parseInt(document.getElementById('team1Count')?.textContent || '0');
        const team2Count = parseInt(document.getElementById('team2Count')?.textContent || '0');
        
        // 🆕 Minimum 2 joueurs au total ET au moins 1 dans chaque équipe
        if (playerCount >= 2 && team1Count >= 1 && team2Count >= 1) {
            startBtn.classList.remove('disabled');
            startBtn.title = '';
        } else {
            startBtn.classList.add('disabled');
            if (playerCount < 2) {
                startBtn.title = 'Minimum 2 joueurs requis';
            } else if (team1Count === 0 && team2Count === 0) {
                startBtn.title = 'Les deux équipes sont vides';
            } else if (team1Count === 0) {
                startBtn.title = 'L\'équipe A n\'a aucun joueur';
            } else if (team2Count === 0) {
                startBtn.title = 'L\'équipe B n\'a aucun joueur';
            }
        }
    } else {
        // Mode classique - minimum 2 joueurs
        if (playerCount >= 2) {
            startBtn.classList.remove('disabled');
            startBtn.title = '';
        } else if (playerCount === 1) {
            startBtn.classList.add('disabled');
            startBtn.title = 'Minimum 2 joueurs requis';
        } else {
            startBtn.classList.add('disabled');
            startBtn.title = 'Aucun joueur dans le lobby';
        }
    }
}

// Récupérer les paramètres actuels
function getGameSettings() {
    gameSettings.mode = document.getElementById('modeValue').textContent.toLowerCase().includes('vie') ? 'vie' : 'point';
    gameSettings.lives = parseInt(document.getElementById('livesValue')?.textContent || 3);
    gameSettings.timer = parseInt(document.getElementById('timerValue').textContent);
    gameSettings.answersCount = parseInt(document.getElementById('answersValue').textContent);  // AJOUTER
}

// Créer les cartes joueurs en mode jeu (style lobby)
function createGamePlayerCards() {
    const lobbyCards = document.querySelectorAll('.player-card-mini');
    const gameGrid = document.getElementById('playersGridGame');
    gameGrid.innerHTML = '';
    gamePlayers = [];

    lobbyCards.forEach((card, index) => {
        const name = card.querySelector('.player-card-mini-name').textContent;
        const isChampion = card.classList.contains('champion');
        const titleEl = card.querySelector('.player-card-mini-title');
        const playerTitle = titleEl ? titleEl.textContent : '';
        const twitchId = card.dataset.twitchId || '';
        const playerTeam = card.dataset.team || null; // 🆕 Récupérer l'équipe

        const playerData = {
            name: name,
            twitchId: twitchId,
            lives: gameSettings.lives,
            points: 0,
            isChampion: isChampion,
            title: playerTitle,
            team: playerTeam, // 🆕 Stocker l'équipe
            eliminated: false,
            hasAnswered: false,
            answer: null
        };
        gamePlayers.push(playerData);

        const gameCard = document.createElement('div');
        gameCard.className = 'player-card-game' + (isChampion ? ' champion' : '');
        
        // 🆕 Ajouter classe d'équipe en mode Rivalité
        if (currentGameMode === 'rivalry' && playerTeam) {
            gameCard.classList.add(`team-${playerTeam}`);
        }
        
        gameCard.dataset.playerIndex = index;
        gameCard.dataset.lives = gameSettings.lives;
        gameCard.dataset.twitchId = twitchId || '';
        gameCard.dataset.team = playerTeam || ''; // 🆕 Stocker l'équipe


        if (gameSettings.mode === 'vie') {
            const livesHtml = getLivesIconsHTML(selectedLivesIcon, gameSettings.lives, gameSettings.lives);
            // 🆕 Badge équipe pour mode Rivalité
            const teamBadgeHtml = (currentGameMode === 'rivalry' && playerTeam) 
                ? `<span class="team-badge-game team-${playerTeam}">${playerTeam === '1' ? 'A' : 'B'}</span>` 
                : '';
            gameCard.innerHTML = `
                <div class="answered-indicator"></div>
                ${teamBadgeHtml}
                <div class="player-card-game-name">${name}</div>
                <div class="player-card-game-lives">${livesHtml}</div>
                <div class="player-card-game-answer-overlay">
                    <span class="answer-text-display no-answer"><img src="zzzzz.png" alt="AFK" class="afk-icon"></span>
                </div>
                <button class="player-card-game-kick" title="Exclure ${name}">
                    <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            `;
        } else {
            // 🆕 Badge équipe pour mode Rivalité
            const teamBadgeHtml = (currentGameMode === 'rivalry' && playerTeam) 
                ? `<span class="team-badge-game team-${playerTeam}">${playerTeam === '1' ? 'A' : 'B'}</span>` 
                : '';
            gameCard.innerHTML = `
                <div class="answered-indicator"></div>
                ${teamBadgeHtml}
                <div class="player-card-game-name">${name}</div>
                <div class="player-card-game-points">0</div>
                <div class="player-card-game-answer-overlay">
                    <span class="answer-text-display no-answer"><img src="zzzzz.png" alt="AFK" class="afk-icon"></span>
                </div>
                <button class="player-card-game-kick" title="Exclure ${name}">
                    <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            `;
        }

        // ===== CLIC SUR BOUTON KICK =====
        const kickBtn = gameCard.querySelector('.player-card-game-kick');
        if (kickBtn) {
            kickBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                kickPlayer(name, twitchId, gameCard);
            });
        }

        // ===== CLIC SUR CARTE JOUEUR =====
        gameCard.style.cursor = 'pointer';
        gameCard.addEventListener('click', (e) => {
            // Empêcher le clic si on survole l'overlay ou le bouton kick
            if (e.target.closest('.player-card-game-answer-overlay')) return;
            if (e.target.closest('.player-card-game-kick')) return;

            openPlayerModal(name, isChampion, playerTitle, twitchId);
        });

        gameGrid.appendChild(gameCard);
    });
}



function updateTimerDisplay() {
    const display = Math.max(0, timerValue); // Protection contre -1
    document.getElementById('timerText').textContent = display;

    const progress = document.getElementById('timerProgress');
    const circumference = 226; // 2 * π * 36 (rayon du cercle chakra)
    const offset = circumference * (1 - display / gameSettings.timer);
    progress.style.strokeDashoffset = offset;
}





//QUESTION SUIVANTE
document.getElementById('nextQuestionBtn').addEventListener('click', async () => {
    const btn = document.getElementById('nextQuestionBtn');
    if (btn.classList.contains('loading')) return;

    btn.classList.add('loading');
    hideGameCloseBtn();

    const questionWrapper = document.getElementById('gameQuestionWrapper');
    const mainPanel = document.getElementById('gameMainPanel');
    const questionActions = document.getElementById('questionActions');

    // 🔥 1. CACHER le contenu IMMÉDIATEMENT
    const questionText = document.getElementById('questionText');
    const answersGrid = document.getElementById('answersGrid');
    const questionBadges = document.querySelector('.question-badges-row');

    if (questionText) questionText.style.opacity = '0';
    if (answersGrid) answersGrid.style.opacity = '0';
    if (questionBadges) questionBadges.style.opacity = '0';

    // 🔥 2. LANCER l'animation IMMÉDIATEMENT
    questionActions.classList.remove('visible');
    questionWrapper.classList.add('closing');
    mainPanel.classList.add('closing');

    // 🔥 3. PUIS appeler le serveur (en parallèle)
    try {
        const response = await fetch('/admin/next-question', {
            method: 'POST',
            credentials: 'same-origin'
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Erreur:', data.error);
            if (data.blocked) {
                console.log('⏳ Timer en cours:', data.timeRemaining);
            }
            // Restaurer si erreur
            if (questionText) questionText.style.opacity = '1';
            if (answersGrid) answersGrid.style.opacity = '1';
            if (questionBadges) questionBadges.style.opacity = '1';
            questionWrapper.classList.remove('closing');
            mainPanel.classList.remove('closing');
            btn.classList.remove('loading');
            return;
        }

        // La nouvelle question arrivera via socket 'new-question'

    } catch (error) {
        console.error('❌ Erreur:', error);
        btn.classList.remove('loading');
    }

    // 🔥 4. Nettoyer après l'animation
    setTimeout(() => {
        questionWrapper.classList.remove('closing', 'shifted');
        mainPanel.classList.remove('visible', 'closing');
        btn.classList.remove('loading');
    }, 400);
});





// Tab switching pour le panel - DÉLÉGATION D'ÉVÉNEMENTS
document.addEventListener('click', (e) => {
    const tab = e.target.closest('.panel-tab');
    if (!tab) return;

    const targetTab = tab.dataset.tab;
    if (!targetTab) return;

    // Update tab buttons
    document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Update tab content
    document.querySelectorAll('.panel-tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const tabContent = document.getElementById('tab' + targetTab.charAt(0).toUpperCase() + targetTab.slice(1));
    if (tabContent) tabContent.classList.add('active');

    // Cacher le toggle de tri si on n'est pas sur l'onglet Grille
    const sortToggle = document.getElementById('gridSortToggle');
    if (sortToggle) {
        if (targetTab === 'grille' && currentGameMode === 'rivalry') {
            sortToggle.classList.add('visible');
        } else {
            sortToggle.classList.remove('visible');
        }
    }
});

// Transition vers l'état Game
function transitionToGame() {
    const stateLobby = document.getElementById('stateLobby');
    const stateGame = document.getElementById('stateGame');
    const bgText = document.querySelector('.bg-text');
    const overlay = document.getElementById('gameStartOverlay');
    const startText = document.getElementById('gameStartText');
    const statusPill = document.querySelector('.status-pill');
    const questionWrapper = document.getElementById('gameQuestionWrapper');

    // 🔥 S'assurer que le bouton Fermer Lobby est caché au démarrage
    hideGameCloseBtn();

    const startTexts = [
        "READY.. FIGHT !",
        "GO BEYOND !",
        "GAME ON !",
        "戦い !",
        "戦闘開始 !",
        "C'EST PARTI !",
        "勝負だ !",
        "SHOWTIME !"
    ];
    const randomText = startTexts[Math.floor(Math.random() * startTexts.length)];
    if (startText) startText.textContent = randomText;


    // Récupérer les paramètres
    getGameSettings();


    setStatsMode(gameSettings.mode === 'point' ? 'points' : 'vie');

    // Créer les cartes joueurs
    createGamePlayerCards();

    // Afficher/cacher le toggle de tri selon le mode Rivalité
    updateGridSortToggleVisibility();
    
    // 🆕 Cacher le graphique des équipes si mode classique
    const teamsChartBlock = document.getElementById('teamsChartBlock');
    if (teamsChartBlock) {
        if (currentGameMode === 'rivalry') {
            teamsChartBlock.style.display = 'block';
            // 🔥 FIX: Reset les valeurs du graphique d'équipes (éviter affichage stale de la partie précédente)
            const team1Value = document.getElementById('team1Value');
            const team2Value = document.getElementById('team2Value');
            const team1Bar = document.getElementById('team1Bar');
            const team2Bar = document.getElementById('team2Bar');
            if (team1Value) team1Value.textContent = '0';
            if (team2Value) team2Value.textContent = '0';
            if (team1Bar) team1Bar.style.height = '80px';
            if (team2Bar) team2Bar.style.height = '80px';
        } else {
            teamsChartBlock.style.display = 'none';
        }
    }

    // Reset complet du wrapper
    // 🔥 RESET COMPLET du wrapper + panel + actions
    questionWrapper.className = 'game-question-wrapper';
    questionWrapper.removeAttribute('style');

    const questionPanel = document.getElementById('gameQuestionPanel');
    if (questionPanel) questionPanel.removeAttribute('style');

    const mainPanel = document.getElementById('gameMainPanel');
    if (mainPanel) {
        mainPanel.className = 'game-main-panel';
        mainPanel.removeAttribute('style');
    }

    const questionActions = document.getElementById('questionActions');
    if (questionActions) {
        questionActions.className = 'question-actions';
        questionActions.removeAttribute('style');
    }

    const panelMiniActions = document.querySelector('.panel-mini-actions');
    if (panelMiniActions) panelMiniActions.removeAttribute('style');

    // Mettre à jour le header status
    if (statusPill) {
        statusPill.classList.add('game-mode');
        document.getElementById('statusText').textContent = 'En partie';
    }
    
    // 🆕 Cacher le bouton déconnexion
    const logoutBtn = document.getElementById('headerLogoutBtn');
    if (logoutBtn) logoutBtn.style.display = 'none';

    // 1. Afficher l'overlay GAME START
    overlay.classList.add('active');

    // 2. Animation du texte GAME START
    anime({
        targets: startText,
        keyframes: [
            { scale: 0.5, opacity: 0 },
            { scale: 1.1, opacity: 1 },
            { scale: 1, opacity: 1 },
            { scale: 20, opacity: 0 }
        ],
        duration: 2000,
        easing: 'easeInOutQuad',
        complete: () => {
            overlay.classList.remove('active');
            startText.style.transform = '';
            startText.style.opacity = '';
        }
    });

    // 3. Transition du lobby vers le jeu
    setTimeout(() => {
        stateLobby.style.opacity = '0';
        stateLobby.style.transition = 'opacity 0.4s';

        setTimeout(() => {
            stateLobby.classList.remove('active');
            stateLobby.style.opacity = '';
            stateLobby.style.transition = '';

            // Afficher state game
            stateGame.classList.add('active');
            stateGame.style.opacity = '1';
            stateGame.style.pointerEvents = '';

            bgText.classList.remove('lobby-active');
            bgText.classList.add('game-active');
            bgText.textContent = 'GAME';

            // Lancer l'animation d'entrée
            requestAnimationFrame(() => {
                questionWrapper.classList.add('entering');
            });

            // Après l'animation, passer en état visible
            questionWrapper.addEventListener('animationend', function handler(e) {
                if (e.animationName !== 'questionEnter') return;
                questionWrapper.removeEventListener('animationend', handler);
                questionWrapper.classList.remove('entering');
                questionWrapper.classList.add('visible');
            });

        }, 400);
    }, 1500);

    document.getElementById('gameLogsToggle')?.classList.add('active');


}

// Bouton Démarrer
document.getElementById('startGameBtn').addEventListener('click', async () => {
    const startBtn = document.getElementById('startGameBtn');

    // Protection double-clic
    if (startBtn.classList.contains('disabled')) return;
    if (startBtn.classList.contains('loading')) return;  // AJOUTER
    if (gameStarted) return;

    // Bloquer immédiatement AVANT l'appel API
    startBtn.classList.add('loading');  // AJOUTER

    try {
        // Préparer les données (paramètres BombAnime si en mode BombAnime)
        const startData = {};
        if (currentGameMode === 'bombanime') {
            startData.bombanimeLives = parseInt(document.querySelector('.bombanime-lives-group .setting-option-btn.active')?.dataset.value) || 2;
            startData.bombanimeTimer = parseInt(document.getElementById('bombanimeTimerSlider')?.value) || 8;
            startData.bombanimeSerie = selectedBombanimeSerie || 'Naruto';
            console.log('💣 Paramètres BombAnime envoyés:', startData);
        }
        
        // 🎴 Paramètres Collect
        if (currentGameMode === 'collect') {
            startData.collectHandSize = collectHandSize || 3;
            startData.collectAnimes = Array.from(collectSelectedAnimes);
            console.log('🎴 Paramètres Collect envoyés:', startData);
        }
        
        const response = await fetch('/admin/start-game', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(startData)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Erreur démarrage:', data.error);
            
            // 🆕 Afficher un toast plus joli au lieu d'un alert
            if (data.errorType === 'empty_team') {
                showToast(data.error, 'error');
            } else {
                showToast(data.error || 'Impossible de démarrer la partie', 'error');
            }
            
            startBtn.classList.remove('loading');  // AJOUTER - débloquer si erreur
            return;
        }

        console.log('✅ Partie démarrée:', data);
        gameStarted = true;
        updateTwitchBtnVisibility();

        // Changer le texte du bouton
        startBtn.querySelector('.action-full-label').textContent = 'En cours...';
        startBtn.querySelector('.action-full-sub').textContent = 'Partie lancée';
        startBtn.classList.add('started');

    } catch (error) {
        console.error('❌ Erreur:', error);
        alert('Erreur de connexion au serveur');
        startBtn.classList.remove('loading');  // AJOUTER - débloquer si erreur
    }
});

let autoMode = false;

document.getElementById('autoToggleBtn').addEventListener('click', async function () {
    const btn = this;
    const icon = btn.querySelector('svg');

    try {
        const response = await fetch('/admin/toggle-auto-mode', {
            method: 'POST',
            credentials: 'same-origin'
        });

        const data = await response.json();

        if (data.success) {
            autoMode = data.autoMode;

            if (autoMode) {
                btn.classList.add('active');
                // Icône pause
                icon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';

                // Désactiver le bouton suivante
                const nextBtn = document.getElementById('nextQuestionBtn');
                if (nextBtn) {
                    nextBtn.classList.add('auto-disabled');
                    nextBtn.disabled = true;
                }

                // Si on est déjà sur les résultats, déclencher le mode auto
                const questionActions = document.getElementById('questionActions');
                if (questionActions && questionActions.classList.contains('visible')) {
                    fetch('/admin/trigger-auto-next', {
                        method: 'POST',
                        credentials: 'same-origin'
                    });
                }

            } else {
                btn.classList.remove('active');
                // Icône play
                icon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';

                // Réactiver le bouton suivante
                const nextBtn = document.getElementById('nextQuestionBtn');
                if (nextBtn) {
                    nextBtn.classList.remove('auto-disabled');
                    nextBtn.disabled = false;
                }
            }

            // Animation feedback
            anime({
                targets: btn,
                scale: [1, 1.1, 1],
                duration: 300,
                easing: 'easeOutBack'
            });
        }
    } catch (error) {
        console.error('❌ Erreur toggle auto mode:', error);
    }
});

// Dans revealAnswers(), ajouter à la fin pour l'auto-mode :
if (autoMode) {
    setTimeout(() => {
        document.getElementById('nextQuestionBtn').click();
    }, 3000); // 3 secondes avant question suivante
}


// Ajouter APRÈS createGamePlayerCards() ou dans l'initialisation
// Utiliser la délégation d'événement sur la grille plutôt que sur chaque carte

document.getElementById('playersGridGame').addEventListener('click', (e) => {
    const card = e.target.closest('.player-card-game');
    if (!card) return;

    // 🔥 Empêcher le double appel
    if (e.target.closest('.player-card-game-answer-overlay')) return;

    const playerIndex = parseInt(card.dataset.playerIndex);
    const player = gamePlayers[playerIndex];

    if (player) {
        console.log('Clic sur:', player.name);
        openPlayerModal(player.name, player.isChampion, player.title || '', player.twitchId);  // 🔥 AJOUTER twitchId
    }
});


// ============================================
// MODAL SIGNALEMENT
// ============================================
const reportModal = document.getElementById('reportModal');
const reportModalOverlay = document.getElementById('reportModalOverlay');

function openReportModal() {
    const reportModal = document.getElementById('reportModal');
    const reportModalOverlay = document.getElementById('reportModalOverlay');

    // Utiliser les vraies données de la question actuelle
    if (currentQuestionData) {
        document.getElementById('reportQuestionText').textContent = currentQuestionData.question;
    } else {
        document.getElementById('reportQuestionText').textContent = 'Aucune question en cours';
    }

    reportModal.classList.add('active');
    reportModalOverlay.classList.add('active');
}

function closeReportModal() {
    reportModal.classList.remove('active');
    reportModalOverlay.classList.remove('active');
}

// Event listeners
document.querySelector('.mini-action-btn.report').addEventListener('click', openReportModal);
document.getElementById('reportModalClose').addEventListener('click', closeReportModal);
document.getElementById('reportCancelBtn').addEventListener('click', closeReportModal);
reportModalOverlay.addEventListener('click', closeReportModal);

document.getElementById('reportSubmitBtn').addEventListener('click', async () => {
    const reason = document.getElementById('reportReason').value;
    const btn = document.getElementById('reportSubmitBtn');

    if (!currentQuestionData) {
        console.error('Aucune question à signaler');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Envoi...';

    try {
        const response = await fetch('/admin/report-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
                questionId: currentQuestionData.questionId || null,  // ← questionId pas id
                questionText: currentQuestionData.question,
                difficulty: currentQuestionData.difficulty || null,
                reason: reason
            })
        });

        const data = await response.json();

        if (data.success) {
            btn.textContent = 'Envoyé ✓';
            btn.style.background = 'rgba(0, 255, 136, 0.2)';
            btn.style.borderColor = 'rgba(0, 255, 136, 0.5)';
            btn.style.color = 'var(--green)';

            setTimeout(() => {
                closeReportModal();
                setTimeout(() => {
                    btn.textContent = 'Signaler';
                    btn.style.background = '';
                    btn.style.borderColor = '';
                    btn.style.color = '';
                    btn.disabled = false;
                }, 300);
            }, 800);
        } else {
            throw new Error(data.error || 'Erreur inconnue');
        }

    } catch (error) {
        console.error('❌ Erreur signalement:', error);

        btn.textContent = 'Erreur ✗';
        btn.style.background = 'rgba(255, 59, 92, 0.2)';
        btn.style.borderColor = 'rgba(255, 59, 92, 0.5)';
        btn.style.color = 'var(--red)';

        setTimeout(() => {
            btn.textContent = 'Signaler';
            btn.style.background = '';
            btn.style.borderColor = '';
            btn.style.color = '';
            btn.disabled = false;
        }, 1500);
    }
});


// Fermer avec Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && reportModal.classList.contains('active')) {
        closeReportModal();
    }
});

// ============================================
// BOUTON INFO - OUVRE LE LIEN DE PREUVE
// ============================================
const infoBtn = document.getElementById('infoBtn');

// Ouvrir le lien de preuve dans un nouvel onglet
function openProofLink() {
    if (!currentQuestionData || !currentQuestionData.proof_url) return;
    window.open(currentQuestionData.proof_url, '_blank');
}

// Mettre à jour l'état du badge info selon la disponibilité de la preuve
function updateInfoBadge() {
    if (!infoBtn) return;
    
    if (!currentQuestionData || !currentQuestionData.proof_url) {
        infoBtn.classList.add('disabled');
    } else {
        infoBtn.classList.remove('disabled');
    }
}

// Event listener pour le bouton info
if (infoBtn) {
    infoBtn.addEventListener('click', () => {
        if (!infoBtn.classList.contains('disabled')) {
            openProofLink();
        }
    });
}

const gameCloseBtn = document.getElementById('gameCloseBtn');

function showGameCloseBtn() {
    if (gameCloseBtn) {
        gameCloseBtn.style.display = ''; // Reset inline style
        gameCloseBtn.classList.add('visible');
    }
}

function hideGameCloseBtn() {
    if (gameCloseBtn) {
        gameCloseBtn.classList.remove('visible');
    }
}



// Configuration des couleurs
const COLORS = {
    correct: '#00ff88',
    wrong: '#ff3b5c',
    timeout: '#f0c040',
    lives3: '#00ff88',
    lives2: '#f0c040',
    lives1: '#ff9f43',
    lives0: '#6b7280'
};

/**
 * Met à jour le pie chart des réponses avec animation
 * @param {number} correct - Nombre de bonnes réponses
 * @param {number} wrong - Nombre de mauvaises réponses
 * @param {number} timeout - Nombre de non-réponses
 */
function updateResponsesPie(correct, wrong, timeout) {
    const total = correct + wrong + timeout;
    const pie = document.getElementById('responsesPie');

    if (total === 0) {
        pie.style.background = 'rgba(255, 255, 255, 0.08)';
    } else {
        const correctAngle = (correct / total) * 360;
        const wrongAngle = correctAngle + (wrong / total) * 360;

        pie.style.setProperty('--pie-color-1', COLORS.correct);
        pie.style.setProperty('--pie-color-2', COLORS.wrong);
        pie.style.setProperty('--pie-color-3', COLORS.timeout);

        animatePieAngles(pie, correctAngle, wrongAngle);
    }

    document.getElementById('correctCount').textContent = correct;
    document.getElementById('wrongCount').textContent = wrong;
    document.getElementById('timeoutCount').textContent = timeout;
}

function updateLivesPie(lives3, lives2, lives1, lives0) {
    const total = lives3 + lives2 + lives1 + lives0;
    const pie = document.getElementById('livesPie');

    if (total === 0) {
        pie.style.background = 'rgba(255, 255, 255, 0.08)';
    } else {
        const angle1 = (lives3 / total) * 360;
        const angle2 = angle1 + (lives2 / total) * 360;
        const angle3 = angle2 + (lives1 / total) * 360;

        pie.style.background = `conic-gradient(
                    ${COLORS.lives3} 0deg ${angle1}deg,
                    ${COLORS.lives2} ${angle1}deg ${angle2}deg,
                    ${COLORS.lives1} ${angle2}deg ${angle3}deg,
                    ${COLORS.lives0} ${angle3}deg 360deg
                )`;
    }

    document.getElementById('lives3Count').textContent = lives3;
    document.getElementById('lives2Count').textContent = lives2;
    document.getElementById('lives1Count').textContent = lives1;
    document.getElementById('lives0Count').textContent = lives0;
}

// 🆕 Met à jour le graphique des équipes (mode Rivalité)
function updateTeamsChart(teamScores, teamNames, gameMode) {
    const teamsBlock = document.getElementById('teamsChartBlock');
    if (!teamsBlock) return;
    
    // Afficher le bloc
    teamsBlock.style.display = 'block';
    
    const team1Score = teamScores[1] || 0;
    const team2Score = teamScores[2] || 0;
    const maxScore = Math.max(team1Score, team2Score, 1); // Éviter division par 0
    
    // Mettre à jour les barres (hauteur min 80px, max 160px)
    const team1Bar = document.getElementById('team1Bar');
    const team2Bar = document.getElementById('team2Bar');
    
    if (team1Bar) {
        const height = Math.max(80, (team1Score / maxScore) * 160);
        team1Bar.style.height = height + 'px';
    }
    
    if (team2Bar) {
        const height = Math.max(80, (team2Score / maxScore) * 160);
        team2Bar.style.height = height + 'px';
    }
    
    // Mettre à jour les valeurs affichées dans les barres
    const team1Value = document.getElementById('team1Value');
    const team2Value = document.getElementById('team2Value');
    if (team1Value) team1Value.textContent = team1Score;
    if (team2Value) team2Value.textContent = team2Score;
    
    // Mettre à jour les labels courts (A/B)
    const team1Label = document.getElementById('team1Label');
    const team2Label = document.getElementById('team2Label');
    if (team1Label) team1Label.textContent = 'A';
    if (team2Label) team2Label.textContent = 'B';
}

/**
 * Anime les angles du pie chart progressivement
 */
function animatePieAngles(pie, targetAngle1, targetAngle2) {
    let currentAngle1 = 0;
    let currentAngle2 = 0;
    const duration = 600;
    const startTime = performance.now();

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        currentAngle1 = targetAngle1 * eased;
        currentAngle2 = targetAngle2 * eased;

        pie.style.setProperty('--pie-angle-1', `${currentAngle1}deg`);
        pie.style.setProperty('--pie-angle-2', `${currentAngle2}deg`);

        if (progress < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
}

/**
 * Met à jour le joueur le plus rapide
 */
function updateFastestPlayer(name, timeMs) {
    document.getElementById('fastestName').textContent = name || '-';
    document.getElementById('fastestTime').textContent = timeMs ? (timeMs / 1000).toFixed(2) + 's' : '-';
}

/**
 * Configure le mode (points ou vie)
 * @param {string} mode - 'points' ou 'vie'
 */
function setStatsMode(mode) {
    const container = document.querySelector('.stats-charts-container');
    container.classList.toggle('mode-points', mode === 'points');
}

/**
 * Réinitialise les stats avec animation
 */
function resetStats() {
    // Réinitialiser les pies
    const pies = document.querySelectorAll('.pie-chart');
    pies.forEach(pie => {
        pie.style.animation = 'none';
        pie.offsetHeight; // Trigger reflow
        pie.style.animation = null;
    });

    // Réinitialiser les légendes
    const legends = document.querySelectorAll('.legend-item');
    legends.forEach(item => {
        item.style.animation = 'none';
        item.offsetHeight;
        item.style.animation = null;
    });

    // Valeurs à zéro avec animation
    updateResponsesPie(0, 0, 0);
    updateLivesPie(0, 0, 0, 0);
    updateFastestPlayer(null, null);
}


// ============================================
//    WINNER SCREEN - JAVASCRIPT
// ============================================

/**
 * Créer les rayons lumineux
 */
function createWinnerRays() {
    const raysContainer = document.getElementById('winnerRays');
    if (!raysContainer) return;
    raysContainer.innerHTML = '';
    for (let i = 0; i < 12; i++) {
        const ray = document.createElement('div');
        ray.className = 'winner-ray';
        ray.style.transform = `rotate(${i * 30}deg)`;
        raysContainer.appendChild(ray);
    }
}

/**
 * Créer les particules flottantes
 */
function createWinnerParticles() {
    const container = document.getElementById('winnerParticles');
    if (!container) return;
    container.innerHTML = '';

    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'w-particle';
        particle.style.left = Math.random() * 100 + '%'; // ✅ Tout l'écran
        particle.style.top = (Math.random() * 80 + 20) + '%';
        particle.style.width = (Math.random() * 5 + 2) + 'px';
        particle.style.height = particle.style.width;
        container.appendChild(particle);
    }
}

/**
 * Créer les confettis
 */
function createWinnerConfetti() {
    const overlay = document.getElementById('winnerOverlay');
    if (!overlay) return;
    const colors = ['#f0c040', '#ffd700', '#00ff88', '#ff3b5c', '#64b4ff', '#fff'];
    const shapes = ['square', 'circle', 'ribbon'];

    for (let i = 0; i < 80; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti ' + shapes[Math.floor(Math.random() * shapes.length)];
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animation = `confettiFall ${Math.random() * 3 + 4}s linear ${Math.random() * 2}s forwards`;
        overlay.appendChild(confetti);
    }
}

/**
 * Animation des particules
 */
function animateWinnerParticles() {
    particles.forEach((p, i) => {
        setTimeout(() => {
            p.style.animationDuration = duration + 's';
            p.classList.add('active');  /* Ajoute la classe qui rend visible + anime */
        }, i * 30);
    });
}

/**
 * Générer la grille de joueurs
 */
function generateWinnerPlayersGrid(players, winnerName, gameMode = 'lives', livesIcon = 'heart', lastQuestionPlayers = null) {
    const grid = document.getElementById('winnerGridInner');
    if (!grid) return;
    grid.innerHTML = '';

    // 🆕 Détecter si mode rivalité
    const isRivalryMode = gameMode === 'rivalry-lives' || gameMode === 'rivalry-points';
    const effectiveGameMode = isRivalryMode ? (gameMode === 'rivalry-points' ? 'points' : 'lives') : gameMode;

    // 🔥 Créer un map username → lastAnswer pour lookup rapide
    const lastAnswerMap = new Map();
    if (lastQuestionPlayers && Array.isArray(lastQuestionPlayers)) {
        lastQuestionPlayers.forEach(p => {
            lastAnswerMap.set(p.username, p);
        });
    }

    const sorted = [...players].sort((a, b) => {
        if (a.isWinner) return -1;
        if (b.isWinner) return 1;

        // 🔥 TRIER SELON LE MODE
        if (effectiveGameMode === 'points') {
            return (b.points || 0) - (a.points || 0);
        } else {
            if (a.status === 'eliminated' && b.status !== 'eliminated') return 1;
            if (b.status === 'eliminated' && a.status !== 'eliminated') return -1;
            return (b.lives || 0) - (a.lives || 0);
        }
    });

    const medals = ['🥇', '🥈', '🥉'];
    const medalClasses = ['gold', 'silver', 'bronze'];

    sorted.forEach((player, index) => {
        const card = document.createElement('div');
        const playerName = player.username || player.name || 'Joueur';
        const playerLives = player.lives ?? player.livesRemaining ?? 0;
        const playerPoints = player.points || 0;
        const playerTeam = player.team;

        card.className = `winner-player-card ${player.status || ''}`;
        if (player.isWinner) card.classList.add('winner');

        // 🔥 ÉLIMINÉ seulement en mode vie
        if (effectiveGameMode === 'lives' && playerLives <= 0 && !player.isWinner) {
            card.classList.add('eliminated');
        }

        // 🆕 Badge différent selon le mode
        let badgeHtml = '';
        if (isRivalryMode && playerTeam) {
            // Mode Rivalité : afficher le badge d'équipe
            const teamClass = playerTeam === 1 ? 'team-a' : 'team-b';
            const teamLetter = playerTeam === 1 ? 'A' : 'B';
            badgeHtml = `<span class="winner-player-team-badge ${teamClass}">${teamLetter}</span>`;
            card.classList.add('has-team-badge');
        } else if (!isRivalryMode && index < 3) {
            // Mode Classique : afficher les médailles
            card.classList.add('has-medal');
            badgeHtml = `<span class="winner-player-medal ${medalClasses[index]}">${medals[index]}</span>`;
        }

        // 🔥 AFFICHAGE SELON LE MODE
        let statsHtml = '';
        if (effectiveGameMode === 'points') {
            statsHtml = `<div class="winner-player-points">${playerPoints.toLocaleString()} pts</div>`;
        } else {
            statsHtml = `<div class="winner-player-lives">${getLivesIconsHTML(livesIcon, playerLives, gameSettings.lives)}</div>`;
        }

        // 🔥 Overlay dernière réponse (assombrit la carte au hover)
        let overlayHtml = '';
        const lastAnswer = lastAnswerMap.get(playerName);
        if (lastAnswer) {
            const statusClass = lastAnswer.status === 'correct' ? 'correct' : (lastAnswer.status === 'afk' ? 'afk' : 'wrong');
            const answerText = lastAnswer.selectedAnswer || (lastAnswer.status === 'afk' ? 'AFK' : '—');
            overlayHtml = `
                <div class="winner-card-answer-overlay ${statusClass}">
                    <span class="winner-answer-text">${answerText}</span>
                </div>
            `;
            card.classList.add('has-answer');
        }

        card.innerHTML = `
            ${badgeHtml}
            <div class="winner-player-name">${playerName}</div>
            ${statsHtml}
            ${overlayHtml}
        `;

        grid.appendChild(card);
    });
}


function showWinner(name, livesOrPoints, totalWins, questions, duration, playersData, topPlayers = [], gameMode = 'lives', lastQuestionPlayers = null) {
    const overlay = document.getElementById('winnerOverlay');
    if (!overlay) return;

    // 🆕 Détecter si mode rivalité
    const isRivalryMode = gameMode === 'rivalry-lives' || gameMode === 'rivalry-points';
    const effectiveGameMode = isRivalryMode ? (gameMode === 'rivalry-points' ? 'points' : 'lives') : gameMode;

    // === ANIMATION DE SORTIE DES PANELS ===
    const questionWrapper = document.getElementById('gameQuestionWrapper');
    const mainPanel = document.getElementById('gameMainPanel');
    const questionActions = document.getElementById('questionActions');

    if (questionActions) questionActions.classList.add('winner-exit');
    if (questionWrapper) questionWrapper.classList.add('winner-exit');
    if (mainPanel) mainPanel.classList.add('winner-exit');

    if (questionWrapper) questionWrapper.style.display = 'none';
    if (mainPanel) mainPanel.style.display = 'none';
    if (questionActions) questionActions.style.display = 'none';

    const playerCount = Array.isArray(playersData) ? playersData.length : playersData;
    const players = Array.isArray(playersData) ? playersData : [];


    // Mettre à jour les données
    document.getElementById('winnerName').textContent = name;
    document.getElementById('winnerName').setAttribute('data-name', name);

    document.getElementById('winnerName').classList.remove('long', 'very-long', 'ultra-long');
    if (name.length > 20) {
        document.getElementById('winnerName').classList.add('ultra-long');
    } else if (name.length > 14) {
        document.getElementById('winnerName').classList.add('very-long');
    } else if (name.length > 10) {
        document.getElementById('winnerName').classList.add('long');
    }

    // 🔥 ADAPTER SELON LE MODE
    const winnerLivesEl = document.getElementById('winnerLives');
    const livesLabelEl = winnerLivesEl?.closest('.winner-stat')?.querySelector('.winner-stat-label');

    if (effectiveGameMode === 'points') {
        winnerLivesEl.innerHTML = `<span class="points-icon">★</span> ${livesOrPoints.toLocaleString()}`;
        if (livesLabelEl) livesLabelEl.textContent = 'Points';
    } else {
        winnerLivesEl.innerHTML = `<span class="heart">❤</span> ${livesOrPoints}`;
        if (livesLabelEl) livesLabelEl.textContent = 'Vies restantes';
    }

    document.getElementById('winnerTotalWins').textContent = totalWins;
    document.getElementById('infoQuestions').textContent = questions;
    document.getElementById('infoDuration').textContent = duration;
    document.getElementById('infoPlayers').textContent = playerCount;

    // 🔥 PASSER LE MODE COMPLET à la grille (pour détecter rivalité)
    generateWinnerPlayersGrid(players, name, gameMode, selectedLivesIcon, lastQuestionPlayers);


    // Générer le Top 10
    if (topPlayers && topPlayers.length > 0) {
        generateWinnerTop10(topPlayers);
    }

    // Préparer les éléments
    createWinnerRays();
    createWinnerParticles();

    // Afficher l'overlay
    overlay.classList.add('active');


    // ========== SÉQUENCE D'ANIMATIONS (délai initial 1.5s) ==========

    // 1. Rayons lumineux
    setTimeout(() => {
        document.getElementById('winnerRays').style.opacity = '1';
        document.getElementById('winnerRays').style.transition = 'opacity 1s ease';
    }, 900);

    // 2. Container vainqueur (centré d'abord)
    setTimeout(() => {
        document.getElementById('winnerContainer').classList.add('visible');
    }, 1000);

    // 3. Nom du gagnant
    setTimeout(() => {
        document.getElementById('winnerName').classList.add('visible');
    }, 1200);

    // 4. Ligne décorative
    setTimeout(() => {
        document.getElementById('winnerLine').classList.add('visible');
    }, 1400);

    // 5. Stats
    setTimeout(() => {
        document.getElementById('winnerStats').classList.add('visible');
    }, 1550);

    // 6. Infos partie
    setTimeout(() => {
        document.getElementById('winnerGameInfo').classList.add('visible');
    }, 1700);

    // 7. Confettis
    setTimeout(() => {
        createWinnerConfetti();
        animateWinnerParticles();
    }, 1300);

    // 8. Après un moment centré, décaler le vainqueur vers la gauche
    setTimeout(() => {
        document.getElementById('winnerContainer').classList.add('shifted');
    }, 3600);

    // 9. Puis afficher la grille
    setTimeout(() => {
        document.getElementById('winnerPlayersGrid').classList.add('visible');
    }, 3800);

    // 10. Bouton fermer lobby
    setTimeout(() => {
        document.getElementById('winnerCloseLobby').classList.add('visible');
    }, 4300);

    // 11. Top 10 apparaît 1s après la grille
    setTimeout(() => {
        document.getElementById('winnerTop10').classList.add('visible');

        // Animation stagger des items
        const items = document.querySelectorAll('.winner-top10-item');
        items.forEach((item, i) => {
            setTimeout(() => {
                item.classList.add('visible');
            }, i * 60);
        });
    }, 4800);
}

/**
 * Fermer l'écran de victoire
 */
async function closeWinner() {
    const overlay = document.getElementById('winnerOverlay');
    if (!overlay) return;

    try {
        // Fermer le lobby côté serveur
        await fetch('/admin/toggle-game', {
            method: 'POST',
            credentials: 'same-origin'
        });
    } catch (error) {
        console.error('❌ Erreur fermeture lobby:', error);
    }

    // Animation de fermeture
    overlay.style.opacity = '0';

    setTimeout(() => {
        overlay.classList.remove('active');
        overlay.style.opacity = '';

        // Reset des éléments winner
        document.getElementById('winnerRays').style.opacity = '0';
        document.getElementById('winnerContainer').classList.remove('visible', 'shifted');
        document.getElementById('winnerName').classList.remove('visible');
        document.getElementById('winnerLine').classList.remove('visible');
        document.getElementById('winnerStats').classList.remove('visible');
        document.getElementById('winnerGameInfo').classList.remove('visible');
        document.getElementById('winnerPlayersGrid').classList.remove('visible');
        document.getElementById('winnerCloseLobby').classList.remove('visible');
        document.getElementById('winnerTop10').classList.remove('visible');
        document.querySelectorAll('.winner-top10-item').forEach(item => {
            item.classList.remove('visible');
        });

        // Supprimer confettis
        document.querySelectorAll('.confetti').forEach(c => c.remove());

        // Retour à idle
        returnToIdle();

    }, 500);
}


// Init rayons au chargement
document.addEventListener('DOMContentLoaded', createWinnerRays);


// ============================================
// SYSTÈME DE LOGS EN DIRECT
// ============================================

const LOG_ICONS = {
    answered: '✓',
    bonus_5050: '⚡',
    bonus_joker: '🃏',
    bonus_shield: '🛡️',
    bonus_x2: '✕2',
    disconnected: '⚠',
    reconnected: '↩',
    kicked: '🚫'
};

let logsVisible = true;


function addGameLog(type, playerName = null, extraData = null) {
    const logsList = document.getElementById('gameLogsList');
    if (!logsList) return;

    const log = document.createElement('div');
    log.className = `game-log-item ${type}`;

    let icon = LOG_ICONS[type] || '';
    let text = '';

    switch (type) {
        // === JOUEURS ===
        case 'join':
            text = `<span class="player-name">${playerName}</span> a rejoint`;
            break;
        case 'leave':
            text = `<span class="player-name">${playerName}</span> a quitté`;
            break;
        case 'disconnected':
            text = `<span class="player-name">${playerName}</span> déconnecté`;
            break;
        case 'reconnected':
            text = `<span class="player-name">${playerName}</span> reconnecté`;
            break;
        case 'answered':
            text = `<span class="player-name">${playerName}</span> a répondu`;
            break;
        case 'eliminated':
            text = `<span class="player-name">${playerName}</span> éliminé`;
            log.classList.add('eliminated');
            break;
        case 'kicked':
            text = `<span class="player-name">${playerName}</span> kick`;
            log.classList.add('kicked');
            break;

        // === BONUS ===
        case 'bonus_5050':
            text = `<span class="player-name">${playerName}</span> utilise <span class="bonus-name">50/50</span>`;
            log.classList.add('bonus');
            break;
        case 'bonus_joker':
            text = `<span class="player-name">${playerName}</span> utilise <span class="bonus-name">Joker</span>`;
            log.classList.add('bonus');
            break;
        case 'bonus_shield':
            text = `<span class="player-name">${playerName}</span> utilise <span class="bonus-name">Bouclier</span>`;
            log.classList.add('bonus');
            break;
        case 'bonus_x2':
            text = `<span class="player-name">${playerName}</span> utilise <span class="bonus-name">x2</span>`;
            log.classList.add('bonus');
            break;

        // === ÉVÉNEMENTS DE JEU ===
        case 'game_start':
            text = `Partie lancée avec <span class="highlight">${extraData?.playerCount || '?'}</span> joueurs`;
            log.classList.add('event');
            break;
        case 'game_end':
            text = `<span class="player-name">${extraData?.winner || '?'}</span> remporte la partie`;
            log.classList.add('event', 'winner');
            break;
        case 'question':
            text = `Question ${extraData?.questionNumber || '?'} - <span class="difficulty">${extraData?.difficulty || '?'}</span>`;
            log.classList.add('event');
            break;
        case 'tiebreaker':
            text = `Égalité - Départage entre <span class="highlight">${extraData?.playerCount || '?'}</span> joueurs`;
            log.classList.add('event', 'tiebreaker');
            break;

        default:
            text = `${type}: ${playerName || ''}`;
    }

    if (icon) {
        log.innerHTML = `<span class="game-log-icon">${icon}</span><span class="game-log-text">${text}</span>`;
    } else {
        log.innerHTML = `<span class="game-log-text">${text}</span>`;
    }

    logsList.appendChild(log);
    logsList.scrollTop = logsList.scrollHeight;

    // Limiter à 30 logs max
    const logs = logsList.querySelectorAll('.game-log-item');
    if (logs.length > 30) {
        logs[0].remove();
    }

    // Fade out après 12 secondes
    setTimeout(() => {
        log.classList.add('fading');
        setTimeout(() => {
            if (log.parentNode) {
                log.remove();
            }
        }, 500);
    }, 12000);
}



// Event listener pour le toggle
document.getElementById('gameLogsToggle')?.addEventListener('click', toggleLogsPanel);



// Données Top 10 (en cas de bugs)
const TOP10_DATA = [
    { name: 'Shikamaru', wins: 999 },
    { name: 'Gojo', wins: 998 },
    { name: 'Zaraki', wins: 997 },
    { name: 'Rengoku', wins: 996 },
    { name: 'Doflamingo', wins: 995 },
    { name: 'Piccolo', wins: 994 },
    { name: 'Midoriya', wins: 993 },
    { name: 'Lelouch', wins: 992 },
    { name: 'Killua', wins: 991 },
    { name: 'Mikasa', wins: 990 },
];

/**
 * Générer le Top 10
 */
function generateWinnerTop10(data) {
    const list = document.getElementById('winnerTop10List');
    if (!list) return;
    list.innerHTML = '';

    data.slice(0, 10).forEach((player, index) => {
        const item = document.createElement('div');
        item.className = 'winner-top10-item';

        // Supporter les deux formats (username/name, total_victories/wins)
        const playerName = player.username || player.name || 'Joueur';
        const playerWins = player.total_victories || player.wins || 0;

        item.innerHTML = `
            <span class="winner-top10-rank">${index + 1}</span>
            <span class="winner-top10-name">${playerName}</span>
            <span class="winner-top10-wins">${playerWins}</span>
        `;
        list.appendChild(item);
    });
}


// ============================================
// RESTAURATION ÉTAT DU JEU
// ============================================

async function restoreGameState() {
    try {
        const response = await fetch('/game/state', { credentials: 'same-origin' });
        if (!response.ok) return false;

        const state = await response.json();
        console.log('🔄 État restauré:', state);

        // 🔥 CAS 0: ÉCRAN WINNER AFFICHÉ
        if (state.showingWinner && state.winnerScreenData) {
            const data = state.winnerScreenData;
            
            // 💣 Ignorer si c'est un winner BombAnime (géré séparément)
            if (data.gameMode === 'bombanime') {
                console.log('💣 Winner BombAnime ignoré - géré par bombanime-state');
                // Ne pas afficher le winner classique, laisser returnToIdle se faire
                return false;
            }
            
            console.log('🏆 Restauration écran Winner');

            // 🔥 RESTAURER L'ICÔNE AVANT LE WINNER
            if (data.livesIcon) {
                selectedLivesIcon = data.livesIcon;
                updateLivesIconSelector(data.livesIcon);
            }

            // Afficher les éléments de base
            document.getElementById('mainHeader').style.display = '';
            document.getElementById('mainContainer').style.display = '';
            document.getElementById('bgText').style.display = '';

            // Cacher idle et lobby
            document.getElementById('stateIdle').style.display = 'none';
            document.getElementById('stateLobby').style.display = 'none';
            document.getElementById('stateLobby').classList.remove('active');

            // Cacher les panneaux latéraux
            recentPanel.classList.add('hidden');
            lastgamePanel.classList.add('hidden');

            // 🆕 Gérer le mode Rivalité
            const isRivalryMode = data.gameMode === 'rivalry-lives' || data.gameMode === 'rivalry-points';
            
            let winnerName, winnerScore, totalVictories, displayGameMode;
            
            if (isRivalryMode) {
                // Mode Rivalité : afficher le nom de l'équipe
                winnerName = data.winner.teamName || 'Équipe gagnante';
                winnerScore = data.winner.livesRemaining || data.winner.points || 0;
                totalVictories = 1;
                displayGameMode = data.gameMode; // 🔥 Garder le gameMode complet (rivalry-points/rivalry-lives)
            } else {
                // Mode classique
                winnerName = data.winner.username;
                winnerScore = data.gameMode === 'points' ? (data.winner.points || 0) : (data.winner.livesRemaining || 0);
                totalVictories = data.winner.totalVictories || 1;
                displayGameMode = data.gameMode;
            }

            // Afficher l'écran winner
            showWinner(
                winnerName,
                winnerScore,
                totalVictories,
                data.totalQuestions,
                formatDuration(data.duration),
                data.playersData || [],
                data.topPlayers || [],
                displayGameMode,
                data.lastQuestionPlayers || null
            );

            return true;
        }

        // === RESTAURER LES PARAMÈTRES ===
        if (state.mode) updateModeUI(state.mode);
        if (state.lives) updateLivesUI(state.lives);
        if (state.questionsCount) updateQuestionsUI(state.questionsCount);
        if (state.questionTime) updateTimerUI(state.questionTime);
        if (state.answersCount) updateAnswersUI(state.answersCount);
        if (state.difficultyMode) updateDifficultyUI(state.difficultyMode);
        if (state.serieFilter) updateSerieFilterUI(state.serieFilter);
        if (state.noSpoil !== undefined) updateNoSpoilUI(state.noSpoil);
        
        // 🆕 Gestion du mode Rivalité
        if (state.isActive && state.lobbyMode) {
            // Jeu actif → restaurer le mode depuis le serveur
            setGameMode(state.lobbyMode);
            console.log(`🎮 Mode restauré depuis serveur: ${currentGameMode}`);
        } else if (!state.isActive) {
            // Jeu pas actif (serveur restart, etc.) → reset à classic
            setGameMode('classic');
            console.log(`🎮 Mode reset à classic (jeu inactif)`);
        }

        // 🔥 Restaurer l'icône ET la variable globale
        if (state.livesIcon) {
            selectedLivesIcon = state.livesIcon;
            updateLivesIconSelector(state.livesIcon);
        }

        // Restaurer le mode auto
        if (state.autoMode !== undefined) {
            autoMode = state.autoMode;
            const autoBtn = document.getElementById('autoToggleBtn');
            const icon = autoBtn?.querySelector('svg');

            if (autoMode && autoBtn && icon) {
                autoBtn.classList.add('active');
                icon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
            }
        }

        // === CAS 1: PARTIE EN COURS ===
        if (state.inProgress) {
            console.log('🎮 Restauration partie en cours');
            gameStarted = true;
            updateTwitchBtnVisibility();

            // Récupérer les éléments DOM
            const stateIdleEl = document.getElementById('stateIdle');
            const stateLobbyEl = document.getElementById('stateLobby');
            const stateGameEl = document.getElementById('stateGame');
            const bgTextEl = document.getElementById('bgText');
            const statusDotEl = document.getElementById('statusDot');
            const statusTextEl = document.getElementById('statusText');
            const recentPanelEl = document.getElementById('recentPanel');
            const lastgamePanelEl = document.getElementById('lastgamePanel');
            const btnWrapperEl = document.getElementById('btnWrapper');

            // Mettre à jour gameSettings
            gameSettings.mode = state.mode === 'lives' ? 'vie' : 'point';
            gameSettings.lives = state.lives || 3;
            gameSettings.timer = state.questionTime || 10;
            gameSettings.totalQuestions = state.questionsCount || 20;

            // Sauvegarder les joueurs
            gamePlayers = state.players || [];

            // Afficher l'état GAME directement
            document.getElementById('mainContainer').style.display = '';
            if (stateIdleEl) stateIdleEl.style.display = 'none';
            if (stateLobbyEl) {
                stateLobbyEl.style.display = 'none';
                stateLobbyEl.classList.remove('active');
            }
            if (stateGameEl) {
                stateGameEl.style.display = 'flex';
                stateGameEl.classList.add('active');
                stateGameEl.style.opacity = '1';
                stateGameEl.style.pointerEvents = '';
            }

            if (bgTextEl) {
                bgTextEl.textContent = 'GAME';
                bgTextEl.classList.remove('lobby-active');
                bgTextEl.classList.add('game-active');
            }
            if (statusDotEl) statusDotEl.classList.add('active');
            if (statusTextEl) statusTextEl.textContent = 'En partie';

            if (recentPanelEl) recentPanelEl.classList.add('hidden');
            if (lastgamePanelEl) lastgamePanelEl.classList.add('hidden');
            if (btnWrapperEl) btnWrapperEl.classList.remove('pulse-active');
            
            // 🆕 Cacher le bouton déconnexion
            const logoutBtn = document.getElementById('headerLogoutBtn');
            if (logoutBtn) logoutBtn.style.display = 'none';

            // Configurer le mode stats
            setStatsMode(gameSettings.mode === 'point' ? 'points' : 'vie');

            // Créer les cartes joueurs dans la grille
            console.log('🃏 Création cartes joueurs:', state.players.length, 'joueurs');
            createGamePlayerCardsFromState(state.players);
            
            // 🆕 Restaurer le graphique équipes si mode Rivalité
            if (state.lobbyMode === 'rivalry' && state.teamScores) {
                updateTeamsChart(state.teamScores, state.teamNames, state.mode);
            }

            // Afficher le toggle logs
            document.getElementById('gameLogsToggle')?.classList.add('active');

            // === CAS 1A: QUESTION EN COURS ===
            if (state.currentQuestion && !state.showResults) {
                console.log('📝 Restauration question en cours');

                // Restaurer la question (sans animation)
                restoreQuestionDisplay(state);

                // Démarrer le timer visuel avec le temps restant
                if (state.timeRemaining > 0) {
                    startVisualTimer(state.timeRemaining, state.questionTime);
                }

                // Mettre à jour les stats live si des joueurs ont déjà répondu
                if (state.liveAnswerCounts) {
                    updateLiveStatsFromState(state);
                }
            }

            // === CAS 1B: RÉSULTATS AFFICHÉS ===
            else if (state.showResults && state.lastQuestionResults) {
                console.log('📊 Restauration des résultats');

                // Restaurer l'affichage de la question avec résultats
                restoreResultsDisplay(state);

                // Mettre à jour les cartes joueurs avec les réponses
                updatePlayerCardsFromState(state.lastQuestionResults);

                // Restaurer les statistiques
                restoreStatsDisplay(state.lastQuestionResults);

                const timerChakra = document.getElementById('timerChakra');
                if (timerChakra) {
                    timerChakra.style.opacity = '0';
                    showHidePercentButton(false); // 🆕 Masquer le bouton œil
                }
            }

            return true;
        }

        // === CAS 2: LOBBY OUVERT ===
        else if (state.isActive) {
            console.log('🚪 Restauration lobby');
            showLobbyUI(state.players || []);
            
            // 🔥 FIX: Restaurer la série BombAnime depuis l'état serveur
            // (évite que selectedBombanimeSerie reste à 'Naruto' après un refresh admin)
            if (state.bombanime && state.bombanime.serie) {
                selectedBombanimeSerie = state.bombanime.serie;
                
                // Mettre à jour l'affichage du dropdown
                const nameDisplay = document.getElementById('bombanimeSerieValue');
                const countDisplay = document.getElementById('bombanimeSerieCount');
                const serieName = SERIE_NAMES[state.bombanime.serie] || state.bombanime.serie;
                
                if (nameDisplay) nameDisplay.textContent = serieName;
                
                // Mettre à jour le count et la classe selected depuis le menu dropdown
                const dropdownItems = document.querySelectorAll('.bombanime-dropdown-item');
                dropdownItems.forEach(item => {
                    if (item.dataset.series === state.bombanime.serie) {
                        item.classList.add('selected');
                        if (countDisplay) countDisplay.textContent = '• ' + item.dataset.count;
                    } else {
                        item.classList.remove('selected');
                    }
                });
                
                console.log(`💣 Série BombAnime restaurée: ${serieName} (${state.bombanime.serie})`);
            }
            
            // 💣 Restaurer le badge MAX si lobby BombAnime/Collect plein
            const maxBadge = document.getElementById('lobbyMaxBadge');
            if (maxBadge) {
                if (state.isLobbyFull && (state.lobbyMode === 'bombanime' || state.lobbyMode === 'collect')) {
                    maxBadge.style.display = 'inline-block';
                    console.log('🔴 Badge MAX restauré');
                } else {
                    maxBadge.style.display = 'none';
                }
            }
            
            return true;
        }

        return false;

    } catch (error) {
        console.log('Pas d\'état à restaurer:', error);
        return false;
    }
}

// ============================================
// FONCTIONS HELPER POUR LA RESTAURATION
// ============================================

function createGamePlayerCardsFromState(players) {
    const gameGrid = document.getElementById('playersGridGame');
    gameGrid.innerHTML = '';
    gamePlayers = [];

    players.forEach((player, index) => {
        const playerData = {
            name: player.username,
            twitchId: player.twitchId,
            lives: player.lives || 0,
            points: player.points || 0,
            isChampion: player.isLastGlobalWinner,
            title: player.title || 'Novice',
            team: player.team || null, // 🆕 Équipe du joueur
            eliminated: player.lives === 0,
            hasAnswered: player.hasAnswered || false,
            answer: player.selectedAnswer || null
        };
        gamePlayers.push(playerData);

        const gameCard = document.createElement('div');
        gameCard.className = 'player-card-game' + (player.isLastGlobalWinner ? ' champion' : '');
        
        // 🆕 Ajouter classe d'équipe en mode Rivalité
        if (currentGameMode === 'rivalry' && player.team) {
            gameCard.classList.add(`team-${player.team}`);
        }
        
        gameCard.dataset.playerIndex = index;
        gameCard.dataset.lives = player.lives || 0;
        gameCard.dataset.twitchId = player.twitchId || '';
        gameCard.dataset.team = player.team || ''; // 🆕 Stocker l'équipe


        if (gameSettings.mode === 'vie') {
            const livesHtml = getLivesIconsHTML(selectedLivesIcon, player.lives, gameSettings.lives);
            // 🆕 Badge équipe pour mode Rivalité
            const teamBadgeHtml = (currentGameMode === 'rivalry' && player.team) 
                ? `<span class="team-badge-game team-${player.team}">${player.team === 1 || player.team === '1' ? 'A' : 'B'}</span>` 
                : '';
            gameCard.innerHTML = `
                <div class="answered-indicator"></div>
                ${teamBadgeHtml}
                <div class="player-card-game-name">${player.username}</div>
                <div class="player-card-game-lives">${livesHtml}</div>
                <div class="player-card-game-answer-overlay">
                    <span class="answer-text-display no-answer"><img src="zzzzz.png" alt="AFK" class="afk-icon"></span>
                </div>
                <button class="player-card-game-kick" title="Exclure ${player.username}">
                    <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            `;
        } else {
            // 🆕 Badge équipe pour mode Rivalité
            const teamBadgeHtml = (currentGameMode === 'rivalry' && player.team) 
                ? `<span class="team-badge-game team-${player.team}">${player.team === 1 || player.team === '1' ? 'A' : 'B'}</span>` 
                : '';
            gameCard.innerHTML = `
                <div class="answered-indicator"></div>
                ${teamBadgeHtml}
                <div class="player-card-game-name">${player.username}</div>
                <div class="player-card-game-points">${player.points || 0}</div>
                <div class="player-card-game-answer-overlay">
                    <span class="answer-text-display no-answer"><img src="zzzzz.png" alt="AFK" class="afk-icon"></span>
                </div>
                <button class="player-card-game-kick" title="Exclure ${player.username}">
                    <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            `;
        }

        // ===== CLIC SUR BOUTON KICK =====
        const kickBtn = gameCard.querySelector('.player-card-game-kick');
        if (kickBtn) {
            kickBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                kickPlayer(player.username, player.twitchId, gameCard);
            });
        }

        // Clic sur carte joueur
        gameCard.style.cursor = 'pointer';
        gameCard.addEventListener('click', (e) => {
            if (e.target.closest('.player-card-game-answer-overlay')) return;
            if (e.target.closest('.player-card-game-kick')) return;
            openPlayerModal(player.username, player.isLastGlobalWinner, player.title || 'Novice', player.twitchId);
        });

        gameGrid.appendChild(gameCard);
    });
}

function restoreQuestionDisplay(state) {
    const question = state.currentQuestion;
    const questionWrapper = document.getElementById('gameQuestionWrapper');
    const questionPanel = document.getElementById('gameQuestionPanel');
    const mainPanel = document.getElementById('gameMainPanel');
    const questionActions = document.getElementById('questionActions');


    console.log('🔍 restoreQuestionDisplay - question:', question);
    console.log('🔍 restoreQuestionDisplay - questionWrapper:', questionWrapper);
    console.log('🔍 restoreQuestionDisplay - questionWrapper.className AVANT:', questionWrapper?.className);

    // Reset complet (sans animation)
    if (questionWrapper) {
        questionWrapper.className = 'game-question-wrapper visible';
    }

    if (questionPanel) questionPanel.removeAttribute('style');
    if (mainPanel) mainPanel.className = 'game-main-panel';
    if (questionActions) questionActions.className = 'question-actions';

    // Badges
    const questionTabBadge = document.getElementById('questionTabBadge');
    const questionSeries = document.getElementById('questionSeries');
    const diffBadge = document.getElementById('questionDifficulty');

    if (questionTabBadge) {
        if (state.mode === 'points' && state.questionsCount) {
            questionTabBadge.textContent = `Question ${state.currentQuestionIndex}/${state.questionsCount}`;
        } else {
            questionTabBadge.textContent = `Question ${state.currentQuestionIndex}`;
        }
    }

    if (questionSeries) questionSeries.textContent = question.serie || 'Anime';

    if (diffBadge) {
        diffBadge.textContent = formatDifficulty(question.difficulty);
        diffBadge.className = 'question-difficulty-badge ' + getDifficultyClass(question.difficulty);
    }

    // 🆕 Mettre à jour la couleur du timer Chakra selon la difficulté
    updateTimerChakraColor(question.difficulty);

    // Question
    const questionText = document.getElementById('questionText');
    if (questionText) questionText.textContent = question.question;

    // Stocker la question courante
    currentQuestionData = question;
    
    // Mettre à jour le badge info
    updateInfoBadge();

    // Réponses
    const answersGrid = document.getElementById('answersGrid');
    if (answersGrid) {
        answersGrid.innerHTML = '';

        if (question.answers.length === 6) {
            answersGrid.classList.add('six-answers');
        } else {
            answersGrid.classList.remove('six-answers');
        }

        question.answers.forEach((answer, i) => {
            const answerEl = document.createElement('div');
            answerEl.className = 'answer-option';
            answerEl.dataset.answer = i + 1;

            // 🔥 NOUVEAU: Afficher les pourcentages live
            const answerIndex = i + 1;
            const count = state.liveAnswerCounts?.[answerIndex] || 0;
            const total = state.players?.length || 1;
            const percent = total > 0 ? Math.round((count / total) * 100) : 0;

            const answerText = document.createElement('span');
            answerText.className = 'answer-text';
            answerText.textContent = answer;

            const answerPercent = document.createElement('span');
            answerPercent.className = 'answer-percent';
            answerPercent.textContent = `${percent}%`;

            answerEl.appendChild(answerText);
            answerEl.appendChild(answerPercent);
            answersGrid.appendChild(answerEl);
        });
        
        // 🆕 Appliquer l'état masquage des pourcentages
        applyHidePercentsState();
    }

    // 🔥 NOUVEAU: Marquer les joueurs qui ont déjà répondu
    if (state.players) {
        state.players.forEach(player => {
            if (player.hasAnswered) {
                const cards = document.querySelectorAll('.player-card-game');
                cards.forEach(card => {
                    const nameEl = card.querySelector('.player-card-game-name');
                    if (nameEl && nameEl.textContent === player.username) {
                        card.classList.add('has-answered');
                    }
                });
            }
        });
    }

    const questionTextEl = document.getElementById('questionText');
    const answersGridEl = document.getElementById('answersGrid');
    const questionBadges = document.querySelector('.question-badges-row');

    if (questionTextEl) questionTextEl.style.opacity = '1';
    if (answersGridEl) answersGridEl.style.opacity = '1';
    if (questionBadges) questionBadges.style.opacity = '1';


    console.log('🔍 restoreQuestionDisplay - questionText contenu:', document.getElementById('questionText')?.textContent);
    console.log('🔍 restoreQuestionDisplay - answersGrid enfants:', document.getElementById('answersGrid')?.children.length);
}

function restoreResultsDisplay(state) {
    const question = state.currentQuestion;
    const results = state.lastQuestionResults;
    const questionWrapper = document.getElementById('gameQuestionWrapper');
    const mainPanel = document.getElementById('gameMainPanel');
    const questionActions = document.getElementById('questionActions');

    // Afficher la question d'abord
    restoreQuestionDisplay(state);

    // Révéler les réponses
    const correctAnswer = results.correctAnswer;
    document.querySelectorAll('.answer-option').forEach((option, i) => {
        const answerIndex = i + 1;
        option.classList.add('revealed');

        if (answerIndex === correctAnswer) {
            option.classList.add('correct');
        } else {
            option.classList.add('wrong');
        }

        // 🔥 Restaurer les pourcentages depuis les résultats
        const total = state.players?.length || 1;
        const count = state.liveAnswerCounts?.[answerIndex] || 0;
        const percent = total > 0 ? Math.round((count / total) * 100) : 0;
        const percentEl = option.querySelector('.answer-percent');
        if (percentEl) percentEl.textContent = `${percent}%`;
    });

    // Afficher le panel droit + boutons
    if (questionWrapper) questionWrapper.classList.add('shifted');
    if (mainPanel) mainPanel.classList.add('visible');
    if (questionActions) questionActions.classList.add('visible');

    // Focus sur l'onglet Stats
    focusStatsTab();

    // Gérer le bouton suivante selon le mode auto
    const nextBtn = document.getElementById('nextQuestionBtn');
    if (nextBtn) {
        if (autoMode) {
            nextBtn.classList.add('auto-disabled');
            nextBtn.disabled = true;
        } else {
            nextBtn.classList.remove('auto-disabled');
            nextBtn.disabled = false;
        }
    }

    showGameCloseBtn();

    // 🔥 Restaurer les stats
    restoreStatsDisplay(results);

    // 🔥 Mettre à jour les cartes joueurs
    updatePlayerCardsFromState(results);
}

function updatePlayerCardsFromState(results) {
    const correctAnswer = results.correctAnswer;
    const currentAnswers = currentQuestionData?.answers || [];

    results.players.forEach(playerResult => {
        const cards = document.querySelectorAll('.player-card-game');
        cards.forEach(card => {
            const nameEl = card.querySelector('.player-card-game-name');
            if (!nameEl || nameEl.textContent !== playerResult.username) return;

            // Status visuel
            card.classList.remove('correct-answer', 'wrong-answer', 'has-answered');

            if (playerResult.isCorrect || playerResult.status === 'correct') {
                card.classList.add('correct-answer');
            } else {
                card.classList.add('wrong-answer');
            }

            // Mode vie : mettre à jour les cœurs
            if (gameSettings.mode === 'vie') {
                const livesEl = card.querySelector('.player-card-game-lives');
                if (livesEl && playerResult.lives !== undefined) {
                    const hearts = livesEl.querySelectorAll('.heart');
                    hearts.forEach((heart, i) => {
                        if (i < playerResult.lives) {
                            heart.classList.remove('lost');
                        } else {
                            heart.classList.add('lost');
                        }
                    });
                }

                // Marquer éliminé si 0 vies
                if (playerResult.lives <= 0) {
                    card.classList.add('eliminated');
                }
            }

            // Mode points : mettre à jour les points
            if (gameSettings.mode === 'point') {
                const pointsEl = card.querySelector('.player-card-game-points');
                if (pointsEl && playerResult.points !== undefined) {
                    pointsEl.textContent = playerResult.points;
                }
            }

            // 🔥 Overlay réponse - utiliser selectedAnswer du résultat
            const overlay = card.querySelector('.answer-text-display');
            if (overlay) {
                if (playerResult.selectedAnswer) {
                    overlay.textContent = playerResult.selectedAnswer;
                    overlay.classList.remove('no-answer', 'wrong');
                    if (!playerResult.isCorrect && playerResult.status !== 'correct') {
                        overlay.classList.add('wrong');
                    }
                } else {
                    overlay.innerHTML = '<img src="zzzzz.png" alt="AFK" class="afk-icon">';
                    overlay.classList.add('no-answer');
                    overlay.classList.remove('wrong');
                }
            }
        });
    });

    // Trier la grille
    setTimeout(() => {
        sortPlayersGrid();
    }, 100);
}

function restoreStatsDisplay(results) {
    const correct = results.stats?.correct || 0;
    const wrong = results.stats?.wrong || 0;
    const afk = results.stats?.afk || 0;

    // Compteurs texte
    const correctCount = document.getElementById('correctCount');
    const wrongCount = document.getElementById('wrongCount');
    const timeoutCount = document.getElementById('timeoutCount');

    if (correctCount) correctCount.textContent = correct;
    if (wrongCount) wrongCount.textContent = wrong;
    if (timeoutCount) timeoutCount.textContent = afk;

    // Pie chart réponses
    updateResponsesPie(correct, wrong, afk);

    // Pie chart vies (si mode vies)
    if (results.stats?.livesDistribution && gameSettings.mode === 'vie') {
        updateLivesPie(
            results.stats.livesDistribution[3] || 0,
            results.stats.livesDistribution[2] || 0,
            results.stats.livesDistribution[1] || 0,
            results.stats.livesDistribution[0] || 0
        );
    }
    
    // 🆕 Graphique équipes (si mode rivalité)
    if (results.lobbyMode === 'rivalry' && results.teamScores) {
        updateTeamsChart(results.teamScores, results.teamNames, results.gameMode);
    }

    // 🔥 Joueur le plus rapide
    if (results.fastestPlayer) {
        updateFastestPlayer(results.fastestPlayer.username, results.fastestPlayer.time);
    } else {
        updateFastestPlayer('-', null);
    }
}

function updateLiveStatsFromState(state) {
    const total = state.players.length;
    const counts = state.liveAnswerCounts || {};

    document.querySelectorAll('.answer-option').forEach((option, i) => {
        const answerIndex = i + 1;
        const count = counts[answerIndex] || 0;
        const percent = total > 0 ? Math.round((count / total) * 100) : 0;

        const percentEl = option.querySelector('.answer-percent');
        if (percentEl) {
            percentEl.textContent = `${percent}%`;
        }
    });
}

function showLobbyUI(players = []) {
    // Afficher le main container (pour le lobby)
    document.getElementById('mainContainer').style.display = '';

    // Cacher idle, afficher lobby directement
    stateIdle.style.display = 'none';
    stateLobby.classList.add('active');
    stateLobby.style.opacity = '1';
    stateLobby.style.pointerEvents = '';  // 🔥 AJOUTER
    
    // 🆕 Cacher le bouton déconnexion
    const logoutBtn = document.getElementById('headerLogoutBtn');
    if (logoutBtn) logoutBtn.style.display = 'none';

    // 🆕 Afficher le badge de mode dans le header
    const modeBadgeHeader = document.getElementById('modeBadgeHeader');
    const modeBadgeText = document.getElementById('modeBadgeText');
    if (modeBadgeHeader && modeBadgeText) {
        modeBadgeHeader.style.display = 'block';
        modeBadgeHeader.classList.remove('rivalry', 'bombanime', 'collect');
        if (currentGameMode === 'rivalry') {
            modeBadgeText.textContent = 'Rivalité';
            modeBadgeHeader.classList.add('rivalry');
        } else if (currentGameMode === 'bombanime') {
            modeBadgeText.textContent = 'BombAnime';
            modeBadgeHeader.classList.add('bombanime');
        } else if (currentGameMode === 'collect') {
            modeBadgeText.textContent = 'Collect';
            modeBadgeHeader.classList.add('collect');
        } else {
            modeBadgeText.textContent = 'Classic';
        }
    }

    bgText.textContent = 'LOBBY';
    bgText.classList.add('lobby-active');
    bgText.classList.remove('bombanime-mode', 'collect-mode');
    if (currentGameMode === 'bombanime') {
        bgText.classList.add('bombanime-mode');
    } else if (currentGameMode === 'collect') {
        bgText.classList.add('collect-mode');
    }
    statusDot.classList.add('active');
    statusText.textContent = 'Lobby ouvert';
    
    // Mettre à jour le bouton Rejoindre
    updateAdminJoinButton();
    
    // 🔴 Reset du badge MAX à l'ouverture du lobby
    const maxBadge = document.getElementById('lobbyMaxBadge');
    if (maxBadge) maxBadge.style.display = 'none';

    recentPanel.classList.add('hidden');
    lastgamePanel.classList.add('hidden');
    btnWrapper.classList.remove('pulse-active');

    // 🆕 Afficher/cacher les sections selon le mode
    const teamsGroup = document.getElementById('teamsGroup');
    const lobbyHeaderLeft = document.querySelector('.lobby-header-left');
    
    // Paramètres classiques (à cacher en mode BombAnime)
    const modeGroup = document.querySelector('.mode-group');
    const livesGroup = document.getElementById('livesGroup');
    const livesIconGroup = document.getElementById('livesIconGroup');
    const questionsGroup = document.getElementById('questionsGroup');
    const speedBonusGroup = document.getElementById('speedBonusGroup');
    const timerGroup = document.querySelector('.timer-group');
    const answersGroup = document.querySelector('.setting-group:has(.answers-options)');
    const difficultyGroup = document.querySelector('.setting-group:has(.difficulty-options)');
    const seriesTrigger = document.getElementById('seriesTrigger');
    
    // Paramètres BombAnime
    const bombanimeSerieGroup = document.getElementById('bombanimeSerieGroup');
    const bombanimeLivesGroup = document.getElementById('bombanimeLivesGroup');
    const bombanimeTimerGroup = document.getElementById('bombanimeTimerGroup');
    const bombanimeBotsGroup = document.getElementById('bombanimeBotsGroup');
    
    // Paramètres Collect
    const collectDeckGroup = document.getElementById('collectDeckGroup');
    const collectHandGroup = document.getElementById('collectHandGroup');
    
    
    if (currentGameMode === 'bombanime') {
        // Mode BombAnime : cacher les paramètres classiques
        if (teamsGroup) teamsGroup.style.display = 'none';
        if (modeGroup) modeGroup.style.display = 'none';
        if (livesGroup) livesGroup.style.display = 'none';
        if (livesIconGroup) livesIconGroup.style.display = 'none';
        if (questionsGroup) questionsGroup.style.display = 'none';
        if (speedBonusGroup) speedBonusGroup.style.display = 'none';
        if (timerGroup) timerGroup.style.display = 'none';
        if (answersGroup) answersGroup.style.display = 'none';
        if (difficultyGroup) difficultyGroup.style.display = 'none';
        if (seriesTrigger) seriesTrigger.style.display = 'none';
        
        // Afficher les paramètres BombAnime
        if (bombanimeSerieGroup) bombanimeSerieGroup.style.display = 'block';
        if (bombanimeLivesGroup) bombanimeLivesGroup.style.display = 'block';
        if (bombanimeTimerGroup) bombanimeTimerGroup.style.display = 'block';
        // Bots réactivés temporairement
        if (bombanimeBotsGroup) bombanimeBotsGroup.style.display = 'block';
        
        // Cacher Collect
        
        if (collectDeckGroup) collectDeckGroup.style.display = 'none';
                if (collectHandGroup) collectHandGroup.style.display = 'none';
        const collectAnimeGrp = document.getElementById('collectAnimeFilterGroup');
        if (collectAnimeGrp) collectAnimeGrp.style.display = 'none';
        
        // Retirer les compteurs d'équipe
        const teamCounters = document.getElementById('teamCounters');
        if (teamCounters) teamCounters.remove();
        
    } else if (currentGameMode === 'collect') {
        // Mode Collect : cacher les paramètres classiques et BombAnime
        if (teamsGroup) teamsGroup.style.display = 'none';
        if (modeGroup) modeGroup.style.display = 'none';
        if (livesGroup) livesGroup.style.display = 'none';
        if (livesIconGroup) livesIconGroup.style.display = 'none';
        if (questionsGroup) questionsGroup.style.display = 'none';
        if (speedBonusGroup) speedBonusGroup.style.display = 'none';
        if (timerGroup) timerGroup.style.display = 'none';
        if (answersGroup) answersGroup.style.display = 'none';
        if (difficultyGroup) difficultyGroup.style.display = 'none';
        if (seriesTrigger) seriesTrigger.style.display = 'none';
        
        // Cacher les paramètres BombAnime
        if (bombanimeSerieGroup) bombanimeSerieGroup.style.display = 'none';
        if (bombanimeLivesGroup) bombanimeLivesGroup.style.display = 'none';
        if (bombanimeTimerGroup) bombanimeTimerGroup.style.display = 'none';
        if (bombanimeBotsGroup) bombanimeBotsGroup.style.display = 'none';
        
        // Afficher les paramètres Collect
        
        if (collectDeckGroup) collectDeckGroup.style.display = 'block';
                if (collectHandGroup) collectHandGroup.style.display = 'block';
        const collectAnimeGrp = document.getElementById('collectAnimeFilterGroup');
        if (collectAnimeGrp) collectAnimeGrp.style.display = 'block';
        
        // Retirer les compteurs d'équipe
        const teamCounters = document.getElementById('teamCounters');
        if (teamCounters) teamCounters.remove();
        
    } else if (currentGameMode === 'rivalry') {
        // Mode Rivalité
        if (teamsGroup) teamsGroup.style.display = 'block';
        if (modeGroup) modeGroup.style.display = 'block';
        if (livesGroup) livesGroup.style.display = 'block';
        if (livesIconGroup) livesIconGroup.style.display = 'block';
        if (timerGroup) timerGroup.style.display = 'block';
        if (answersGroup) answersGroup.style.display = 'block';
        if (difficultyGroup) difficultyGroup.style.display = 'block';
        if (seriesTrigger) seriesTrigger.style.display = 'block';
        
        // Cacher les paramètres BombAnime
        if (bombanimeSerieGroup) bombanimeSerieGroup.style.display = 'none';
        if (bombanimeLivesGroup) bombanimeLivesGroup.style.display = 'none';
        if (bombanimeTimerGroup) bombanimeTimerGroup.style.display = 'none';
        if (bombanimeBotsGroup) bombanimeBotsGroup.style.display = 'none';
        
        // Cacher Collect
        
        if (collectDeckGroup) collectDeckGroup.style.display = 'none';
                if (collectHandGroup) collectHandGroup.style.display = 'none';
        const collectAnimeGrp = document.getElementById('collectAnimeFilterGroup');
        if (collectAnimeGrp) collectAnimeGrp.style.display = 'none';
        
        // Ajouter les compteurs d'équipe si pas déjà présents
        if (lobbyHeaderLeft && !document.getElementById('teamCounters')) {
            const teamCountersHTML = `
                <div class="team-counters" id="teamCounters">
                    <div class="team-counter">
                        <span class="team-dot team-1"></span>
                        <span class="team-count" id="team1Count">0</span>
                    </div>
                    <div class="team-counter">
                        <span class="team-dot team-2"></span>
                        <span class="team-count" id="team2Count">0</span>
                    </div>
                </div>
            `;
            lobbyHeaderLeft.insertAdjacentHTML('beforeend', teamCountersHTML);
        } else {
            // 🔥 FIX: Reset les compteurs si l'élément existe déjà (réouverture lobby)
            const team1Count = document.getElementById('team1Count');
            const team2Count = document.getElementById('team2Count');
            if (team1Count) team1Count.textContent = '0';
            if (team2Count) team2Count.textContent = '0';
        }
    } else {
        // Mode Classique
        if (teamsGroup) teamsGroup.style.display = 'none';
        if (modeGroup) modeGroup.style.display = 'block';
        if (livesGroup) livesGroup.style.display = 'block';
        if (livesIconGroup) livesIconGroup.style.display = 'block';
        if (timerGroup) timerGroup.style.display = 'block';
        if (answersGroup) answersGroup.style.display = 'block';
        if (difficultyGroup) difficultyGroup.style.display = 'block';
        if (seriesTrigger) seriesTrigger.style.display = 'block';
        
        // Cacher les paramètres BombAnime
        if (bombanimeSerieGroup) bombanimeSerieGroup.style.display = 'none';
        if (bombanimeLivesGroup) bombanimeLivesGroup.style.display = 'none';
        if (bombanimeTimerGroup) bombanimeTimerGroup.style.display = 'none';
        if (bombanimeBotsGroup) bombanimeBotsGroup.style.display = 'none';
        
        // Cacher Collect
        
        if (collectDeckGroup) collectDeckGroup.style.display = 'none';
                if (collectHandGroup) collectHandGroup.style.display = 'none';
        const collectAnimeGrp = document.getElementById('collectAnimeFilterGroup');
        if (collectAnimeGrp) collectAnimeGrp.style.display = 'none';
        
        const teamCounters = document.getElementById('teamCounters');
        if (teamCounters) teamCounters.remove();
    }

    updateLobbyPlayers(players);

    // Vérifier le cooldown au chargement
    checkRefreshCooldown();
}



// ============================================
// BOUTON ACTUALISER JOUEURS
// ============================================
const refreshPlayersBtn = document.getElementById('refreshPlayersBtn');

if (refreshPlayersBtn) {

    refreshPlayersBtn.addEventListener('click', async () => {
        if (refreshPlayersBtn.classList.contains('loading') ||
            refreshPlayersBtn.classList.contains('cooldown')) return;

        refreshPlayersBtn.classList.add('loading');

        try {
            const response = await fetch('/admin/refresh-players', {
                method: 'POST',
                credentials: 'same-origin'
            });

            const data = await response.json();

            if (response.status === 429) {
                showRefreshCooldown(data.remainingTime);
            } else if (data.success) {
                console.log(`✅ ${data.playersRefreshed} joueur(s) actualisé(s)`);
                showRefreshCooldown(20); // Lancer le cooldown de 20s
            }
        } catch (error) {
            console.error('❌ Erreur refresh:', error);
        } finally {
            refreshPlayersBtn.classList.remove('loading');
        }
    });
}

async function checkRefreshCooldown() {
    try {
        const response = await fetch('/admin/refresh-cooldown', { credentials: 'same-origin' });
        const data = await response.json();

        if (data.onCooldown && data.remainingTime > 0) {
            showRefreshCooldown(data.remainingTime);
        }
    } catch (error) {
        console.log('Pas de cooldown actif');
    }
}

function showRefreshCooldown(seconds) {
    const btn = document.getElementById('refreshPlayersBtn');
    if (!btn) return;

    const spanEl = btn.querySelector('span');
    const originalText = 'Actualiser';

    btn.classList.add('cooldown');
    spanEl.textContent = `${seconds}s`;

    const interval = setInterval(() => {
        seconds--;
        if (seconds <= 0) {
            clearInterval(interval);
            spanEl.textContent = originalText;
            btn.classList.remove('cooldown');
        } else {
            spanEl.textContent = `${seconds}s`;
        }
    }, 1000);
}




// ============================================
// FONCTIONS UPDATE UI - PARAMÈTRES
// ============================================

function updateModeUI(mode) {
    const isLives = mode === 'lives';
    const btnValue = isLives ? 'vie' : 'point';

    // 🔥 AJOUTER - Mettre à jour gameSettings.mode
    gameSettings.mode = isLives ? 'vie' : 'point';

    // Boutons mode
    document.querySelectorAll('.mode-group .setting-option-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === btnValue);
    });

    // Label
    const modeValue = document.getElementById('modeValue');
    if (modeValue) modeValue.textContent = isLives ? 'Vies' : 'Points';

    // Afficher/cacher groupes
    const livesGroup = document.getElementById('livesGroup');
    const questionsGroup = document.getElementById('questionsGroup');
    const livesIconGroup = document.getElementById('livesIconGroup'); // 🔥 AJOUTER
    const speedBonusGroup = document.getElementById('speedBonusGroup'); // 🆕

    if (livesGroup && questionsGroup) {
        if (isLives) {
            // Mode Vies : afficher vies, cacher questions et speedBonus
            livesGroup.style.display = 'block';
            livesGroup.style.opacity = '1';
            livesGroup.classList.remove('hidden');

            questionsGroup.style.display = 'none';
            questionsGroup.classList.add('hidden');

            // 🔥 AJOUTER - Afficher icônes
            if (livesIconGroup) {
                livesIconGroup.style.display = '';
                livesIconGroup.classList.remove('hidden');
            }
            
            // 🆕 Cacher speedBonus
            if (speedBonusGroup) {
                speedBonusGroup.style.display = 'none';
                speedBonusGroup.classList.add('hidden');
            }
        } else {
            // Mode Points : cacher vies, afficher questions et speedBonus
            livesGroup.style.display = 'none';
            livesGroup.classList.add('hidden');

            questionsGroup.style.display = 'block';
            questionsGroup.style.opacity = '1';
            questionsGroup.classList.remove('hidden');

            // 🔥 AJOUTER - Cacher icônes
            if (livesIconGroup) {
                livesIconGroup.style.display = 'none';
                livesIconGroup.classList.add('hidden');
            }
            
            // 🆕 Afficher speedBonus
            if (speedBonusGroup) {
                speedBonusGroup.style.display = 'block';
                speedBonusGroup.style.opacity = '1';
                speedBonusGroup.classList.remove('hidden');
            }
        }
    }

    console.log(`✅ Mode UI restauré: ${mode}`);
}

function updateLivesUI(lives) {
    // Boutons vies
    document.querySelectorAll('.lives-group .setting-option-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.value) === lives);
    });

    // Label
    const livesValue = document.getElementById('livesValue');
    if (livesValue) livesValue.textContent = lives;

    console.log(`✅ Vies UI restauré: ${lives}`);
}

function updateQuestionsUI(count) {
    // Boutons questions
    document.querySelectorAll('.questions-group .setting-option-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.value) === count);
    });

    // Label
    const questionsValue = document.getElementById('questionsValue');
    if (questionsValue) questionsValue.textContent = count;

    console.log(`✅ Questions UI restauré: ${count}`);
}

function updateTimerUI(time) {
    // Slider
    const timerSlider = document.getElementById('timerSlider');
    if (timerSlider) timerSlider.value = time;

    // Label
    const timerValue = document.getElementById('timerValue');
    if (timerValue) timerValue.textContent = time + 's';

    console.log(`✅ Timer UI restauré: ${time}s`);
}

function updateAnswersUI(count) {
    // Boutons réponses
    document.querySelectorAll('.answers-options .setting-option-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.value) === count);
    });

    // Label
    const answersValue = document.getElementById('answersValue');
    if (answersValue) answersValue.textContent = count;

    console.log(`✅ Réponses UI restauré: ${count}`);
}

function updateDifficultyUI(mode) {
    console.log('🔍 updateDifficultyUI appelée avec:', mode);
    console.log('🔍 Type:', typeof mode);

    const buttons = document.querySelectorAll('.difficulty-options .setting-option-btn');
    console.log('🔍 Boutons trouvés:', buttons.length);

    buttons.forEach(btn => {
        console.log('🔍 Bouton data-value:', btn.dataset.value);
    });

    // Comparaison simple sans accent
    const modeClean = mode.toLowerCase().replace('é', 'e');

    buttons.forEach(btn => {
        const btnValue = (btn.dataset.value || '').toLowerCase().replace('é', 'e');
        const isActive = btnValue === modeClean;
        console.log(`🔍 Comparaison: "${btnValue}" === "${modeClean}" => ${isActive}`);
        btn.classList.toggle('active', isActive);
    });

    const difficultyValue = document.getElementById('difficultyValue');
    if (difficultyValue) {
        difficultyValue.textContent = mode === 'croissante' ? 'Croissante' : 'Aléatoire';
    }
}

// 🚫 Mise à jour UI du filtre anti-spoil
function updateNoSpoilUI(noSpoil) {
    const targetValue = noSpoil ? 'Sans' : 'Avec';
    const buttons = document.querySelectorAll('.no-spoil-options .setting-option-btn');
    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === targetValue);
    });

    const noSpoilValue = document.getElementById('noSpoilValue');
    if (noSpoilValue) {
        noSpoilValue.textContent = targetValue;
    }
}

function updateSerieFilterUI(filter) {
    // Cartes séries dans le modal
    document.querySelectorAll('.series-card').forEach(card => {
        card.classList.toggle('active', card.dataset.series === filter);
    });

    // Label principal
    const seriesValue = document.getElementById('seriesValue');
    if (seriesValue) {
        const activeCard = document.querySelector(`.series-card[data-series="${filter}"]`);
        if (activeCard) {
            seriesValue.textContent = activeCard.dataset.name || filter;
        }
    }

    // Mettre à jour la variable globale
    if (typeof currentSerieFilter !== 'undefined') {
        currentSerieFilter = filter;
    }

    console.log(`✅ Série UI restauré: ${filter}`);
}



// ============================================
// LISTENERS PARAMÈTRES - CONNEXION SERVEUR
// ============================================

function initSettingsListeners() {

    // === MODE (Vies / Points) ===
    document.querySelectorAll('.mode-group .setting-option-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const mode = btn.dataset.mode;
            const serverMode = mode === 'vie' ? 'lives' : 'points';

            // Mettre à jour gameSettings localement
            gameSettings.mode = mode;

            // Mettre à jour visibilité du sélecteur d'icônes
            updateLivesIconVisibility();

            // Appel serveur
            await fetch('/admin/set-mode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ mode: serverMode })
            });
        });
    });

    // === VIES ===
    document.querySelectorAll('.lives-group .setting-option-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const lives = parseInt(btn.dataset.value);

            await fetch('/admin/set-lives', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ lives })
            });
        });
    });

    // === QUESTIONS (mode points) ===
    document.querySelectorAll('.questions-group .setting-option-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const questions = parseInt(btn.dataset.value);

            await fetch('/admin/set-questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ questions })
            });
        });
    });

    // === TIMER (Slider) ===
    const timerSlider = document.getElementById('timerSlider');
    if (timerSlider) {
        timerSlider.addEventListener('change', async (e) => {
            await fetch('/admin/set-time', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ time: parseInt(e.target.value) })
            });
        });
    }

    // === RÉPONSES ===
    document.querySelectorAll('.answers-options .setting-option-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const answers = parseInt(btn.dataset.value);

            await fetch('/admin/set-answers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ answers })
            });
        });
    });

    // === DIFFICULTÉ ===
    document.querySelectorAll('.difficulty-options .setting-option-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            // Enlever accent pour le serveur
            const mode = btn.dataset.value.toLowerCase().replace('é', 'e');

            console.log('📤 Envoi difficulté:', mode);

            try {
                const response = await fetch('/admin/set-difficulty-mode', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ mode })
                });

                const data = await response.json();
                console.log('📥 Réponse:', response.status, data);
            } catch (err) {
                console.error('❌ Erreur:', err);
            }
        });
    });

    // === 🚫 FILTRE ANTI-SPOIL ===
    document.querySelectorAll('.no-spoil-options .setting-option-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const enabled = btn.dataset.value === 'Sans';

            try {
                const response = await fetch('/admin/set-no-spoil', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ enabled })
                });

                const data = await response.json();
                if (data.blocked) {
                    showToast('Impossible de changer pendant une partie', 'error');
                    return;
                }
                console.log('🚫 Anti-spoil:', data);
            } catch (err) {
                console.error('❌ Erreur set-no-spoil:', err);
            }
        });
    });

    // === SÉRIE (dans le modal) ===
    document.querySelectorAll('.series-card:not(.soon)').forEach(card => {
        card.addEventListener('click', async () => {
            const filter = card.dataset.series;

            await fetch('/admin/set-serie-filter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ filter })
            });
        });
    });

    console.log('✅ Settings listeners initialisés');
}


function displayQuestion(data) {
    clearInterval(visualTimerInterval);
    if (visualTimerRAF) cancelAnimationFrame(visualTimerRAF);

    // 🔥 Cacher le bouton Fermer Lobby pendant la question
    hideGameCloseBtn();

    const questionWrapper = document.getElementById('gameQuestionWrapper');
    const questionPanel = document.getElementById('gameQuestionPanel');
    const mainPanel = document.getElementById('gameMainPanel');
    const questionActions = document.getElementById('questionActions');
    const panelMiniActions = document.querySelector('.panel-mini-actions');
    const questionCard = document.querySelector('.question-card');
    const answersGrid = document.getElementById('answersGrid');

    // 🔥 RESET COMPLET
    if (questionWrapper) {
        questionWrapper.className = 'game-question-wrapper';
        questionWrapper.removeAttribute('style');
    }

    if (questionPanel) {
        questionPanel.removeAttribute('style');
    }

    if (panelMiniActions) {
        panelMiniActions.removeAttribute('style');
    }

    if (mainPanel) {
        mainPanel.className = 'game-main-panel';
    }

    if (questionActions) {
        questionActions.className = 'question-actions';
    }

    // Forcer reflow
    void questionWrapper.offsetWidth;

    // 🔥 Lancer l'animation d'entrée
    questionWrapper.classList.add('entering');

    // 🔥 Après l'animation (1s + 0.5s delay), passer en visible
    setTimeout(() => {
        questionWrapper.classList.remove('entering');
        questionWrapper.classList.add('visible');
    }, 1500);


    // REAFFICHER TIMER
    const timerChakra = document.getElementById('timerChakra');
    if (timerChakra) {
        timerChakra.style.opacity = '1';
        timerChakra.classList.remove('warning');
        showHidePercentButton(true); // 🆕 Afficher le bouton œil
    }

    // Mettre à jour les badges
    const questionTabBadge = document.getElementById('questionTabBadge');
    const questionSeries = document.getElementById('questionSeries');
    const diffBadge = document.getElementById('questionDifficulty');

    if (questionTabBadge) {
        if (data.totalQuestions) {
            questionTabBadge.textContent = `Question ${data.questionNumber}/${data.totalQuestions}`;
        } else {
            questionTabBadge.textContent = `Question ${data.questionNumber}`;
        }
    }
    if (questionSeries) questionSeries.textContent = data.serie || 'Anime';

    if (diffBadge) {
        diffBadge.textContent = formatDifficulty(data.difficulty);
        diffBadge.className = 'question-difficulty-badge ' + getDifficultyClass(data.difficulty);
    }

    // 🆕 Mettre à jour la couleur du timer Chakra selon la difficulté
    updateTimerChakraColor(data.difficulty);

    const questionText = document.getElementById('questionText');
    if (questionText) questionText.textContent = data.question;

    if (!answersGrid) return;
    answersGrid.innerHTML = '';

    if (data.answers.length === 6) {
        answersGrid.classList.add('six-answers');
        if (questionCard) questionCard.classList.add('six-answers');
    } else {
        answersGrid.classList.remove('six-answers');
        if (questionCard) questionCard.classList.remove('six-answers');
    }

    data.answers.forEach((answer, i) => {
        const answerEl = document.createElement('div');
        answerEl.className = 'answer-option';
        answerEl.dataset.answer = i + 1;
        answerEl.innerHTML = `
            <span class="answer-text">${answer}</span>
            <span class="answer-percent">0%</span>
        `;
        answersGrid.appendChild(answerEl);
    });

    // 🆕 Appliquer l'état masquage des pourcentages
    applyHidePercentsState();

    document.querySelectorAll('.player-card-game').forEach(card => {
        card.classList.remove('has-answered', 'correct-answer', 'wrong-answer');
        const overlay = card.querySelector('.answer-text-display');
        if (overlay) {
            overlay.textContent = '';
            overlay.classList.remove('wrong', 'no-answer');
        }
    });

    // 🔥 Réafficher le contenu (était caché pendant la transition)
    if (questionText) questionText.style.opacity = '1';
    if (answersGrid) answersGrid.style.opacity = '1';
    const questionBadges = document.querySelector('.question-badges-row');
    if (questionBadges) questionBadges.style.opacity = '1';

    currentQuestionData = data;
    
    // Mettre à jour le badge info
    updateInfoBadge();
    
    // 🆕 Image personnage (DÉSACTIVÉ TEMPORAIREMENT)
    // showCharacterImage(data.serie, data.timeLimit);
    
    startVisualTimer(data.timeLimit);
}


function formatDifficulty(diff) {
    const map = {
        'veryeasy': 'Veryeasy',
        'easy': 'Easy',
        'medium': 'Medium',
        'hard': 'Hard',
        'veryhard': 'Veryhard',
        'extreme': 'Extreme'
    };
    return map[diff] || diff;
}

function getDifficultyClass(diff) {
    const diffLower = (diff || '').toLowerCase();
    
    // 🆕 Gérer les difficultés de tiebreaker (DÉPARTAGE - XXX)
    if (diffLower.includes('départage') || diffLower.includes('tiebreaker')) {
        return 'tiebreaker';
    }
    
    if (['veryeasy', 'easy'].includes(diffLower)) return 'easy';
    if (diffLower === 'medium') return 'medium';
    if (diffLower === 'hard') return 'hard';
    if (diffLower === 'extreme') return 'extreme';
    return 'hard';
}

// 🆕 Fonction pour mettre à jour la couleur du timer Chakra selon la difficulté
function updateTimerChakraColor(difficulty) {
    const timerChakra = document.getElementById('timerChakra');
    if (!timerChakra) return;
    
    // Retirer toutes les classes de difficulté
    timerChakra.classList.remove(
        'difficulty-veryeasy',
        'difficulty-easy',
        'difficulty-medium',
        'difficulty-hard',
        'difficulty-veryhard',
        'difficulty-extreme',
        'difficulty-tiebreaker'
    );
    
    // Ajouter la classe correspondante
    let diffLower = (difficulty || 'medium').toLowerCase();
    
    // 🆕 Gérer les difficultés de tiebreaker (DÉPARTAGE - XXX)
    if (diffLower.includes('départage') || diffLower.includes('tiebreaker')) {
        // Utiliser le style tiebreaker spécial
        diffLower = 'tiebreaker';
    }
    
    timerChakra.classList.add(`difficulty-${diffLower}`);
    
    console.log(`⏱️ Timer Chakra: couleur ${diffLower}`);
}

let currentQuestionData = null;


// ============================================
// 🆕 FONCTIONS IMAGE PERSONNAGE
// ============================================

function showCharacterImage(serie, timeLimit) {
    if (!characterImageEnabled) return;
    
    const container = document.getElementById('characterImageContainer');
    const img = document.getElementById('characterImage');
    if (!container || !img) return;
    
    // Normaliser le nom de série
    const normalizedSerie = serie.toLowerCase().trim();
    const imagePath = CHARACTER_IMAGES[normalizedSerie];
    
    if (!imagePath) {
        console.log(`🖼️ Pas d'image pour la série: ${serie}`);
        return;
    }
    
    // Annuler les timeouts précédents
    clearTimeout(characterShowTimeout);
    clearTimeout(characterHideTimeout);
    
    // Cacher d'abord
    container.classList.remove('visible', 'hiding');
    
    // Charger l'image
    img.src = imagePath;
    img.alt = serie;
    
    // Afficher après 1s
    characterShowTimeout = setTimeout(() => {
        container.classList.add('visible');
        console.log(`🖼️ Affichage personnage: ${serie}`);
    }, 1000);
    
    // Cacher 1s avant la fin du timer
    const hideDelay = (timeLimit - 1) * 1000;
    if (hideDelay > 1000) {
        characterHideTimeout = setTimeout(() => {
            hideCharacterImage();
        }, hideDelay);
    }
}

function hideCharacterImage() {
    const container = document.getElementById('characterImageContainer');
    if (!container) return;
    
    container.classList.remove('visible');
    container.classList.add('hiding');
    
    // Nettoyer après l'animation
    setTimeout(() => {
        container.classList.remove('hiding');
    }, 600);
}

function toggleCharacterImages() {
    characterImageEnabled = !characterImageEnabled;
    const toggle = document.getElementById('characterToggle');
    
    if (toggle) {
        toggle.classList.toggle('hidden', !characterImageEnabled);
    }
    
    // Si on désactive, cacher immédiatement l'image actuelle
    if (!characterImageEnabled) {
        hideCharacterImage();
        clearTimeout(characterShowTimeout);
        clearTimeout(characterHideTimeout);
    }
    
    console.log(`🖼️ Images personnages: ${characterImageEnabled ? 'activées' : 'désactivées'}`);
}

// Initialiser le toggle au chargement
document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('characterToggle');
    if (toggle) {
        toggle.addEventListener('click', toggleCharacterImages);
    }
});


let visualTimerInterval = null;
let visualTimerRAF = null; // 🆕 Pour requestAnimationFrame

function startVisualTimer(seconds, totalTime = null) {
    // Arrêter tout timer précédent
    clearInterval(visualTimerInterval);
    if (visualTimerRAF) cancelAnimationFrame(visualTimerRAF);

    const maxTime = totalTime || gameSettings.timer;
    const startTime = Date.now();
    const duration = seconds * 1000; // Durée en ms

    const progress = document.getElementById('timerProgress');
    const timerText = document.getElementById('timerText');
    const timerChakra = document.getElementById('timerChakra');
    const circumference = 226; // 2 * π * 36 (rayon du cercle chakra)

    if (progress) {
        progress.style.strokeDasharray = circumference;
    }
    if (timerChakra) timerChakra.classList.remove('warning');

    // 🆕 Animation fluide avec requestAnimationFrame
    function animate() {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, duration - elapsed);
        const remainingSeconds = Math.ceil(remaining / 1000);
        const progress100 = remaining / (maxTime * 1000); // Progress de 0 à 1

        // Mise à jour du cercle (fluide)
        if (progress) {
            const offset = circumference * (1 - progress100);
            progress.style.strokeDashoffset = offset;
        }

        // Mise à jour du nombre (par seconde)
        if (timerText) {
            timerText.textContent = remainingSeconds;
        }

        // Warning à 3 secondes
        if (remainingSeconds <= 3 && remainingSeconds > 0) {
            if (timerChakra) timerChakra.classList.add('warning');
        }

        // Continuer l'animation si pas terminé
        if (remaining > 0) {
            visualTimerRAF = requestAnimationFrame(animate);
        }
    }

    // Démarrer l'animation
    visualTimerRAF = requestAnimationFrame(animate);
}



function displayResults(data) {
    clearInterval(visualTimerInterval);
    if (visualTimerRAF) cancelAnimationFrame(visualTimerRAF); // 🆕 Arrêter l'animation fluide
    
    // 🆕 Image personnage (DÉSACTIVÉ TEMPORAIREMENT)
    // hideCharacterImage();
    // clearTimeout(characterShowTimeout);
    // clearTimeout(characterHideTimeout);

    // 🔥 Fade out du timer Chakra
    const timerChakra = document.getElementById('timerChakra');

    if (timerChakra) {
        anime({
            targets: timerChakra,
            opacity: [1, 0],
            duration: 300,
            easing: 'easeOutQuad'
        });
    }
    
    // 🆕 Masquer le bouton œil
    showHidePercentButton(false);

    focusStatsTab();

    const questionWrapper = document.getElementById('gameQuestionWrapper');
    const mainPanel = document.getElementById('gameMainPanel');
    const questionActions = document.getElementById('questionActions');

    const correctAnswer = data.correctAnswer;

    // Mettre à jour les options de réponse
    document.querySelectorAll('.answer-option').forEach((option, i) => {
        const answerIndex = i + 1;
        option.classList.add('revealed');

        setTimeout(() => {
            if (answerIndex === correctAnswer) {
                option.classList.add('correct');
            } else {
                option.classList.add('wrong');
            }
        }, 100 + i * 50);
    });

    // Afficher le panel droit
    setTimeout(() => {
        if (questionWrapper) questionWrapper.classList.add('shifted');
        if (mainPanel) mainPanel.classList.add('visible');
        if (questionActions) questionActions.classList.add('visible');
        showGameCloseBtn();

        // 🔥 AJOUTER - Gérer le bouton suivante selon le mode auto
        const nextBtn = document.getElementById('nextQuestionBtn');
        if (nextBtn) {
            if (autoMode) {
                nextBtn.classList.add('auto-disabled');
                nextBtn.disabled = true;
            } else {
                nextBtn.classList.remove('auto-disabled');
                nextBtn.disabled = false;
            }
        }
    }, 350);

    // Mettre à jour les cartes joueurs
    if (data.players) {
        data.players.forEach(playerResult => {
            updatePlayerCard(playerResult, correctAnswer);
        });
    }


    setTimeout(() => {
        sortPlayersGrid();
    }, 500);

    // Mettre à jour les stats
    setTimeout(() => {
        if (data.stats) {
            const correct = data.stats.correct || 0;
            const wrong = data.stats.wrong || 0;
            const afk = data.stats.afk || 0;

            // Compteurs texte (utiliser les BONS IDs du HTML)
            const correctCount = document.getElementById('correctCount');
            const wrongCount = document.getElementById('wrongCount');
            const timeoutCount = document.getElementById('timeoutCount');

            if (correctCount) correctCount.textContent = correct;
            if (wrongCount) wrongCount.textContent = wrong;
            if (timeoutCount) timeoutCount.textContent = afk;

            // Pie chart réponses
            updateResponsesPie(correct, wrong, afk);

            // 🔥 AJOUTER - Pie chart vies
            if (data.stats.livesDistribution) {
                updateLivesPie(
                    data.stats.livesDistribution[3] || 0,
                    data.stats.livesDistribution[2] || 0,
                    data.stats.livesDistribution[1] || 0,
                    data.stats.livesDistribution[0] || 0
                );
            }
        }

        // Joueur le plus rapide (seulement si quelqu'un a bien répondu)
        if (data.fastestPlayer && data.stats?.correct > 0) {
            updateFastestPlayer(data.fastestPlayer.username, data.fastestPlayer.time);
        } else {
            updateFastestPlayer('-', null);
        }
        
        // 🆕 Mode Rivalité : Mettre à jour les scores d'équipe
        if (data.lobbyMode === 'rivalry' && data.teamScores) {
            updateTeamsChart(data.teamScores, data.teamNames, data.gameMode);
        }
    }, 700);
}


function sortPlayersGrid(animate = false) {
    const grid = document.getElementById('playersGridGame');
    if (!grid) return;

    // Supprimer les séparateurs existants
    grid.querySelectorAll('.team-separator').forEach(sep => sep.remove());

    const cards = Array.from(grid.querySelectorAll('.player-card-game'));
    if (cards.length === 0) return;

    // FLIP Animation - Phase 1: Enregistrer les positions initiales
    const positions = new Map();
    if (animate) {
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            positions.set(card, { x: rect.left, y: rect.top });
        });
    }

    // Fonction de tri par score
    const sortByScore = (a, b) => {
        if (gameSettings.mode === 'point') {
            const pointsA = parseInt(a.querySelector('.player-card-game-points')?.textContent) || 0;
            const pointsB = parseInt(b.querySelector('.player-card-game-points')?.textContent) || 0;
            return pointsB - pointsA;
        } else {
            const livesA = parseInt(a.dataset.lives) || 0;
            const livesB = parseInt(b.dataset.lives) || 0;
            return livesB - livesA;
        }
    };

    // Fonction de tri par équipe
    const sortByTeam = (a, b) => {
        const teamA = a.classList.contains('team-1') ? 1 : (a.classList.contains('team-2') ? 2 : 3);
        const teamB = b.classList.contains('team-1') ? 1 : (b.classList.contains('team-2') ? 2 : 3);
        
        if (teamA !== teamB) return teamA - teamB;
        
        // Au sein de la même équipe, trier par score
        return sortByScore(a, b);
    };

    // Appliquer le tri selon le mode
    const isRivalite = currentGameMode === 'rivalry';
    
    if (isRivalite && gridSortMode === 'team') {
        cards.sort(sortByTeam);
    } else {
        cards.sort(sortByScore);
    }

    // Réinsérer les cartes triées
    cards.forEach(card => grid.appendChild(card));

    // Ajouter séparateurs si tri par équipe
    if (isRivalite && gridSortMode === 'team') {
        const team1Cards = cards.filter(c => c.classList.contains('team-1'));
        const team2Cards = cards.filter(c => c.classList.contains('team-2'));

        // Ajouter séparateur avant équipe A si elle a des joueurs
        if (team1Cards.length > 0) {
            const sepA = document.createElement('div');
            sepA.className = 'team-separator team-1';
            sepA.id = 'teamSeparator1';
            sepA.innerHTML = `<span class="team-separator-label">Équipe A <span class="team-separator-count">(${team1Cards.length})</span></span>`;
            grid.insertBefore(sepA, team1Cards[0]);
        }

        // Ajouter séparateur avant équipe B si elle a des joueurs
        if (team2Cards.length > 0) {
            const sepB = document.createElement('div');
            sepB.className = 'team-separator team-2';
            sepB.id = 'teamSeparator2';
            sepB.innerHTML = `<span class="team-separator-label">Équipe B <span class="team-separator-count">(${team2Cards.length})</span></span>`;
            grid.insertBefore(sepB, team2Cards[0]);
        }

        // Afficher les boutons de navigation
        updateTeamNavVisibility(true);
    } else {
        // Cacher les boutons de navigation
        updateTeamNavVisibility(false);
    }

    // FLIP Animation - Phase 2: Calculer et animer
    if (animate && positions.size > 0) {
        cards.forEach(card => {
            const oldPos = positions.get(card);
            if (!oldPos) return;

            const newRect = card.getBoundingClientRect();
            const deltaX = oldPos.x - newRect.left;
            const deltaY = oldPos.y - newRect.top;

            if (deltaX === 0 && deltaY === 0) return;

            // Appliquer la transformation inverse
            card.classList.add('sorting');
            card.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

            // Forcer le reflow
            card.offsetHeight;

            // Retirer la classe sorting et animer vers la position finale
            card.classList.remove('sorting');
            card.style.transform = '';
        });
    }
}

function updatePlayerCard(playerResult, correctAnswer) {
    const cards = document.querySelectorAll('.player-card-game');
    const playerName = playerResult.username || playerResult.name;

    cards.forEach(card => {
        const nameEl = card.querySelector('.player-card-game-name');
        if (!nameEl || nameEl.textContent !== playerName) return;

        // Status visuel
        card.classList.remove('correct-answer', 'wrong-answer', 'has-answered');

        if (playerResult.isCorrect || playerResult.status === 'correct') {
            card.classList.add('correct-answer');
        } else {
            card.classList.add('wrong-answer');
        }

        // Mode vie : mettre à jour les icônes
        if (gameSettings.mode === 'vie') {
            const livesEl = card.querySelector('.player-card-game-lives');
            if (livesEl && playerResult.lives !== undefined) {
                const targetLives = playerResult.lives;
                card.dataset.lives = targetLives;

                // Katana : remplacer tout le SVG
                if (selectedLivesIcon === 'katana') {
                    livesEl.innerHTML = getLivesIconsHTML('katana', targetLives, gameSettings.lives);
                } else {
                    // Autres icônes : mettre à jour les classes lost
                    const icons = livesEl.querySelectorAll('.life-icon');
                    icons.forEach((icon, i) => {
                        if (i < targetLives) {
                            icon.classList.remove('lost');
                        } else if (!icon.classList.contains('lost')) {
                            // Animation de perte
                            icon.classList.add('losing');
                            setTimeout(() => {
                                icon.classList.remove('losing');
                                icon.classList.add('lost');
                            }, 400);
                        }
                    });
                }

                // Marquer éliminé si 0 vies
                if (targetLives <= 0) {
                    setTimeout(() => card.classList.add('eliminated'), 400);
                }
            }
        }

        // Mode points
        if (gameSettings.mode === 'point' && playerResult.points !== undefined) {
            const pointsEl = card.querySelector('.player-card-game-points');
            if (pointsEl) pointsEl.textContent = playerResult.points;
        }

        // Overlay réponse
        const overlay = card.querySelector('.answer-text-display');
        if (overlay) {
            if (playerResult.selectedAnswer) {
                overlay.textContent = playerResult.selectedAnswer;
                overlay.classList.remove('no-answer', 'wrong');
                if (!playerResult.isCorrect) overlay.classList.add('wrong');
            } else {
                overlay.innerHTML = '<img src="zzzzz.png" alt="AFK" class="afk-icon">';
                overlay.classList.add('no-answer');
                overlay.classList.remove('wrong');
            }
        }
    });
}



function updateLiveStats(data) {
    // Mettre à jour les pourcentages sur les réponses
    if (data.answerCounts) {
        document.querySelectorAll('.answer-option').forEach((option, i) => {
            const answerIndex = i + 1;
            const count = data.answerCounts[answerIndex] || 0;
            const total = data.answeredCount || 1;
            const percent = Math.round((count / total) * 100) || 0;

            const percentEl = option.querySelector('.answer-percent');
            if (percentEl) percentEl.textContent = percent + '%';
        });
    }

    // Mettre à jour indicateurs "a répondu" sur les cartes
    // (optionnel - le serveur envoie 'player-answered' pour ça)
}




function displayWinner(data) {
    gameStarted = false;
    updateTwitchBtnVisibility();

    if (data.winner) {
        // 🆕 Gérer le mode Rivalité
        const isRivalryMode = data.gameMode === 'rivalry-lives' || data.gameMode === 'rivalry-points';
        
        let winnerName, winnerScore, totalVictories;
        
        if (isRivalryMode) {
            // Mode Rivalité : afficher le nom de l'équipe
            winnerName = data.winner.teamName || 'Équipe gagnante';
            winnerScore = data.winner.livesRemaining || data.winner.points || 0;
            totalVictories = 1; // Pas de compteur de victoires pour les équipes
        } else {
            // Mode classique
            winnerName = data.winner.username;
            winnerScore = data.gameMode === 'points' ? (data.winner.points || 0) : (data.winner.livesRemaining || 0);
            totalVictories = data.winner.totalVictories || 1;
        }
        
        // 🆕 Passer le gameMode complet pour détecter le mode rivalité
        showWinner(
            winnerName,
            winnerScore,
            totalVictories,
            data.totalQuestions,
            formatDuration(data.duration),
            data.playersData || [],
            data.topPlayers || [],
            data.gameMode, // Passer le gameMode complet au lieu de le convertir
            data.lastQuestionPlayers || null
        );
    }

    // Reset pour prochaine partie
    const startBtn = document.getElementById('startGameBtn');
    if (startBtn) {
        startBtn.querySelector('.action-full-label').textContent = 'DÉMARRER';
        startBtn.querySelector('.action-full-sub').textContent = 'Lancer la partie';
        startBtn.classList.remove('started', 'loading');
    }
}

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
}


function handleActivityLog(log) {
    if (!log || !log.type) return;

    const data = log.data || {};
    const username = data.username;

    switch (log.type) {
        case 'join':
            addGameLog('join', username);
            break;
        case 'leave':
            addGameLog('leave', username);
            // 🆕 Supprimer la carte du joueur de la grille
            removePlayerCard(username);
            break;
        case 'kick':
            addGameLog('kicked', username);
            // Supprimer la carte du joueur de la grille
            removePlayerCard(username);
            break;
        case 'disconnect':
            addGameLog('disconnected', username);
            break;
        case 'reconnect':
            addGameLog('reconnected', username);
            break;
        case 'answer':
            addGameLog('answered', username);
            break;
        case 'eliminated':
            addGameLog('eliminated', username);
            break;
        case 'bonus-5050':
            addGameLog('bonus_5050', username);
            break;
        case 'bonus-joker':
            addGameLog('bonus_joker', username);
            break;
        case 'bonus-shield':
            addGameLog('bonus_shield', username);
            break;
        case 'bonus-x2':
            addGameLog('bonus_x2', username);
            break;
        case 'game-start':
            addGameLog('game_start', null, { playerCount: data.playerCount });
            break;
        case 'game-end':
            addGameLog('game_end', null, { winner: data.winner });
            break;
        case 'question':
            addGameLog('question', null, {
                questionNumber: data.questionNumber,
                difficulty: data.difficulty
            });
            break;
        case 'tiebreaker':
            addGameLog('tiebreaker', null, { playerCount: data.playerCount });
            break;
    }
}


// 🆕 Fonction pour supprimer la carte d'un joueur (lobby + game)
function removePlayerCard(username) {
    if (!username) return;

    // Chercher dans la grille du lobby
    const lobbyGrid = document.getElementById('playersGridLobby');
    if (lobbyGrid) {
        const lobbyCards = lobbyGrid.querySelectorAll('.player-card-mini');
        lobbyCards.forEach(card => {
            const nameEl = card.querySelector('.player-card-mini-name');
            if (nameEl && nameEl.textContent === username) {
                // Animation de fade out puis suppression
                card.style.transition = 'opacity 0.3s, transform 0.3s';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.8)';
                setTimeout(() => card.remove(), 300);
            }
        });
    }

    // Chercher dans la grille de jeu (en partie)
    const gameGrid = document.getElementById('playersGridGame');
    if (gameGrid) {
        const gameCards = gameGrid.querySelectorAll('.player-card-game');
        gameCards.forEach(card => {
            const nameEl = card.querySelector('.player-card-game-name');
            if (nameEl && nameEl.textContent === username) {
                // Animation de fade out puis suppression
                card.style.transition = 'opacity 0.3s, transform 0.3s';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.8)';
                setTimeout(() => card.remove(), 300);
            }
        });
    }

    console.log(`🗑️ Carte de ${username} supprimée`);
}


// ============================================
// 🆕 MODAL CONFIRMATION KICK
// ============================================
let pendingKick = null; // Stocke les infos du kick en attente

function openKickModal(username, twitchId, cardElement) {
    pendingKick = { username, twitchId, cardElement };
    
    document.getElementById('kickModalUsername').textContent = username;
    document.getElementById('kickModalOverlay').classList.add('active');
    document.getElementById('kickModal').classList.add('active');
}

function closeKickModal() {
    document.getElementById('kickModalOverlay').classList.remove('active');
    document.getElementById('kickModal').classList.remove('active');
    pendingKick = null;
}

function confirmKick() {
    if (!pendingKick) return;
    
    const { username, twitchId, cardElement } = pendingKick;
    
    // Émettre l'événement au serveur
    socket.emit('kick-player', { username, twitchId });
    
    // Animation de suppression de la carte
    if (cardElement) {
        cardElement.style.transition = 'opacity 0.3s, transform 0.3s';
        cardElement.style.opacity = '0';
        cardElement.style.transform = 'scale(0.8)';
        setTimeout(() => cardElement.remove(), 300);
    }
    
    console.log(`🚫 ${username} a été kick par le streamer`);
    closeKickModal();
}

// Initialisation des listeners du modal kick
function initKickModal() {
    const overlay = document.getElementById('kickModalOverlay');
    const cancelBtn = document.getElementById('kickModalCancel');
    const confirmBtn = document.getElementById('kickModalConfirm');
    
    if (overlay) overlay.addEventListener('click', closeKickModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeKickModal);
    if (confirmBtn) confirmBtn.addEventListener('click', confirmKick);
}

// Fonction pour kick un joueur manuellement (bouton poubelle)
function kickPlayer(username, twitchId, cardElement) {
    if (!username) return;
    
    // Si c'est l'admin qui est kické, reset le state
    if (twitchUser && twitchId === twitchUser.id) {
        adminInLobby = false;
        updateAdminJoinButton();
    }
    
    const stateLobby = document.getElementById('stateLobby');
    const isInLobby = stateLobby && stateLobby.classList.contains('active');
    
    // Dans le lobby → kick direct (pas de modal)
    if (isInLobby) {
        socket.emit('kick-player', { username, twitchId });

        if (cardElement) {
            cardElement.style.transition = 'opacity 0.3s, transform 0.3s';
            cardElement.style.opacity = '0';
            cardElement.style.transform = 'scale(0.8)';
            setTimeout(() => cardElement.remove(), 300);
        }

        console.log(`🚫 ${username} a été kick par le streamer`);
        return;
    }
    
    // En partie → modal de confirmation
    openKickModal(username, twitchId, cardElement);
}


function toggleLogsPanel() {
    const logsContainer = document.getElementById('gameLogsContainer');
    const toggleBtn = document.getElementById('gameLogsToggle');
    if (!logsContainer) return;

    logsVisible = !logsVisible;

    // Toggle la classe hidden (pas visible)
    logsContainer.classList.toggle('hidden', !logsVisible);
    toggleBtn?.classList.toggle('active', logsVisible);
}

function updateModeDisplay(mode) {
    updateModeUI(mode);
}

function updateLivesDisplay(lives) {
    updateLivesUI(lives);
}


// ============================================
// MODAL CONFIRMATION FERMETURE LOBBY
// ============================================

function showConfirmModal() {
    return new Promise((resolve) => {
        const overlay = document.getElementById('confirmModalOverlay');
        const modal = document.getElementById('confirmModal');
        const cancelBtn = document.getElementById('confirmModalCancel');
        const confirmBtn = document.getElementById('confirmModalConfirm');

        // Afficher
        overlay.classList.add('active');
        modal.classList.add('active');

        // Handlers
        const cleanup = () => {
            overlay.classList.remove('active');
            modal.classList.remove('active');
            cancelBtn.removeEventListener('click', onCancel);
            confirmBtn.removeEventListener('click', onConfirm);
            overlay.removeEventListener('click', onCancel);
        };

        const onCancel = () => {
            cleanup();
            resolve(false);
        };

        const onConfirm = () => {
            cleanup();
            resolve(true);
        };

        cancelBtn.addEventListener('click', onCancel);
        confirmBtn.addEventListener('click', onConfirm);
        overlay.addEventListener('click', onCancel);

        // Escape pour annuler
        const onEscape = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', onEscape);
                onCancel();
            }
        };
        document.addEventListener('keydown', onEscape);
    });
}

document.getElementById('gameCloseBtn')?.addEventListener('click', async () => {
    const confirmed = await showConfirmModal();
    if (!confirmed) return;

    try {
        // Fermer le lobby (fait aussi le reset de la partie)
        await fetch('/admin/toggle-game', {
            method: 'POST',
            credentials: 'same-origin'
        });

        // Retour à l'état idle
        returnToIdle();

    } catch (error) {
        console.error('❌ Erreur fermeture:', error);
    }
});

function returnToIdle() {
    sessionStorage.removeItem('adminCollectTimerExpired');
    sessionStorage.removeItem('adminCollectTimerEndMs');
    sessionStorage.removeItem('adminCollectTimerDuration');
    adminCollectTimerExpired = false;
    // 🔊 Cacher le contrôle de son
    showSoundControl(false);
    showSuggestionButton(false); // Cacher bouton suggestions
    
    // Reset admin join state
    resetAdminJoinState();
    
    const stateGame = document.getElementById('stateGame');
    const stateLobby = document.getElementById('stateLobby');
    const stateIdle = document.getElementById('stateIdle');
    const bgText = document.getElementById('bgText');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');

    // Reset des états
    gameStarted = false;
    updateTwitchBtnVisibility();

    // Reset bouton démarrer
    const startBtn = document.getElementById('startGameBtn');
    if (startBtn) {
        startBtn.querySelector('.action-full-label').textContent = 'DÉMARRER';
        startBtn.querySelector('.action-full-sub').textContent = 'Lancer la partie';
        startBtn.classList.remove('started', 'loading');
        startBtn.classList.add('disabled');
    }

    // 🔥 Cacher game et lobby - RESET COMPLET avec styles inline
    if (stateGame) {
        stateGame.classList.remove('active');
        stateGame.style.display = '';
        stateGame.style.opacity = '';
        stateGame.style.visibility = '';
        stateGame.style.pointerEvents = 'none';
        
        // Réafficher le game-layout (caché en mode BombAnime)
        const gameLayout = stateGame.querySelector('.game-layout');
        if (gameLayout) gameLayout.style.display = '';
    }
    
    // Cacher le container BombAnime
    const bombanimeContainer = document.getElementById('bombanimeAdminContainer');
    if (bombanimeContainer) bombanimeContainer.style.display = 'none';
    
    // Cacher le bouton fermer BombAnime
    const bombanimeCloseBtn = document.getElementById('bombanimeCloseLobbyBtn');
    if (bombanimeCloseBtn) bombanimeCloseBtn.style.display = 'none';
    
    // Cacher le panneau de logs BombAnime
    const logsPanel = document.getElementById('bombanimeLogsPanel');
    if (logsPanel) logsPanel.style.display = 'none';
    
    // Supprimer l'overlay winner BombAnime
    const winnerOverlay = document.getElementById('bombanimeWinnerOverlay');
    if (winnerOverlay) winnerOverlay.remove();
    
    // Cacher l'overlay winner classique
    const classicWinnerOverlay = document.getElementById('winnerOverlay');
    if (classicWinnerOverlay) classicWinnerOverlay.classList.remove('active');
    
    // === Nettoyage Collect ===
    const collectContainer = document.getElementById('collectAdminContainer');
    if (collectContainer) {
        collectContainer.style.display = 'none';
        collectContainer.remove();
    }
    const collectCloseBtn = document.getElementById('collectCloseLobbyBtn');
    if (collectCloseBtn) collectCloseBtn.remove();
    const collectPhaseEl = document.getElementById('collectPhaseIndicator');
    if (collectPhaseEl) collectPhaseEl.remove();
    
    // Réafficher les éléments game layout cachés par Collect
    const gameQuestionWrapper = document.getElementById('gameQuestionWrapper');
    const gameMainPanel = document.getElementById('gameMainPanel');
    const characterImageContainer = document.getElementById('characterImageContainer');
    const gameLayout = document.getElementById('stateGame')?.querySelector('.game-layout');
    if (gameQuestionWrapper) gameQuestionWrapper.style.display = '';
    if (gameMainPanel) gameMainPanel.style.display = '';
    if (characterImageContainer) characterImageContainer.style.display = '';
    if (gameLayout) gameLayout.style.display = '';
    
    // Nettoyer le sessionStorage BombAnime
    sessionStorage.removeItem('bombanimeWinnerData');
    
    if (stateLobby) {
        stateLobby.classList.remove('active');
        stateLobby.style.display = '';
        stateLobby.style.opacity = '';
        stateLobby.style.visibility = '';
        stateLobby.style.pointerEvents = 'none';
    }

    // Vider la grille lobby
    const gridLobby = document.getElementById('playersGridLobby');
    if (gridLobby) gridLobby.innerHTML = '';
    const countEl = document.getElementById('lobbyPlayerCount');
    if (countEl) countEl.textContent = '0';
    
    // 🔴 Reset du badge MAX
    const maxBadge = document.getElementById('lobbyMaxBadge');
    if (maxBadge) maxBadge.style.display = 'none';

    // Vider la grille game
    const gridGame = document.getElementById('playersGridGame');
    if (gridGame) gridGame.innerHTML = '';

    // Reset COMPLET question wrapper
    const questionWrapper = document.getElementById('gameQuestionWrapper');
    if (questionWrapper) {
        questionWrapper.className = 'game-question-wrapper';
        questionWrapper.removeAttribute('style');
    }

    const mainPanel = document.getElementById('gameMainPanel');
    if (mainPanel) {
        mainPanel.classList.remove('visible', 'closing');
        mainPanel.removeAttribute('style');
    }

    const questionActions = document.getElementById('questionActions');
    if (questionActions) {
        questionActions.classList.remove('visible');
        questionActions.removeAttribute('style');
    }

    // Reset les réponses
    const answersGrid = document.getElementById('answersGrid');
    if (answersGrid) {
        answersGrid.innerHTML = '';
        answersGrid.classList.remove('six-answers');
    }

    const questionCard = document.querySelector('.question-card');
    if (questionCard) {
        questionCard.classList.remove('six-answers');
    }

    // Reset timer
    clearInterval(visualTimerInterval);
    if (visualTimerRAF) cancelAnimationFrame(visualTimerRAF);
    const timerProgress = document.getElementById('timerProgress');
    const timerText = document.getElementById('timerText');
    const timerChakra = document.getElementById('timerChakra');
    if (timerProgress) {
        timerProgress.style.strokeDashoffset = '0';
    }
    if (timerText) {
        timerText.textContent = '10';
    }
    if (timerChakra) {
        timerChakra.classList.remove('warning');
        timerChakra.style.opacity = '1';
    }
    
    // 🆕 Cacher le graphique des équipes
    const teamsChartBlock = document.getElementById('teamsChartBlock');
    if (teamsChartBlock) {
        teamsChartBlock.style.display = 'none';
    }

    // Afficher idle
    stateIdle.style.display = 'grid';
    stateIdle.style.opacity = '1';
    stateIdle.style.visibility = 'visible';
    stateIdle.style.pointerEvents = '';
    
    // 🆕 Réafficher le bouton déconnexion
    const logoutBtn = document.getElementById('headerLogoutBtn');
    if (logoutBtn) logoutBtn.style.display = 'flex';
    
    // 🆕 Réafficher le bouton Twitch
    const twitchBtn = document.getElementById('twitchConnectBtn');
    if (twitchBtn) twitchBtn.style.display = 'flex';

    // Reset header
    bgText.textContent = 'MASTER';
    bgText.classList.remove('lobby-active', 'game-active', 'bombanime-mode');
    statusDot.classList.remove('active');
    document.querySelector('.status-pill')?.classList.remove('game-mode');
    statusText.textContent = 'Inactif';

    // Réafficher les panneaux
    recentPanel.classList.remove('hidden');
    lastgamePanel.classList.remove('hidden');
    recentPanel.style.opacity = '1';
    lastgamePanel.style.opacity = '1';

    // ============================================
    // 🔥 FIX COMPLET PARTICULES ET BOUTON
    // ============================================

    // 1. Annuler toute animation en cours
    if (continuousAnimationId) {
        cancelAnimationFrame(continuousAnimationId);
        continuousAnimationId = null;
    }

    // 2. Reset COMPLET des variables d'animation
    isHovering = false;
    hoverTransition = 0;
    time = 0;
    movementFadeIn = 0;

    // 3. Reset du wrapper
    const btnWrapperEl = document.getElementById('btnWrapper');
    if (btnWrapperEl) {
        btnWrapperEl.classList.add('pulse-active');
        btnWrapperEl.style.pointerEvents = '';
        btnWrapperEl.style.opacity = '1';
        btnWrapperEl.style.transform = '';
        btnWrapperEl.style.visibility = 'visible';
        btnWrapperEl.style.display = '';
    }

    // 4. Reset du bouton JOUER
    const openLobbyBtn = document.getElementById('openLobbyBtn');
    if (openLobbyBtn) {
        openLobbyBtn.style.pointerEvents = '';
        openLobbyBtn.style.opacity = '1';
        openLobbyBtn.style.transform = '';
        openLobbyBtn.style.display = '';
        openLobbyBtn.style.visibility = 'visible';
        openLobbyBtn.disabled = false;
        openLobbyBtn.style.cursor = 'pointer';
        
        // Réattacher les event listeners pour le hover des particules
        openLobbyBtn.onmouseenter = () => { isHovering = true; };
        openLobbyBtn.onmouseleave = () => { isHovering = false; };
    }

    // 4.5 Reset du badge mode
    const modeBadgeEl = document.getElementById('modeBadge');
    if (modeBadgeEl) {
        modeBadgeEl.classList.add('visible');
        modeBadgeEl.style.opacity = '1';
        modeBadgeEl.style.visibility = 'visible';
    }

    // 5. Réafficher le bouton principal
    const mainBtn = document.querySelector('.main-action-btn');
    if (mainBtn) {
        mainBtn.style.opacity = '1';
        mainBtn.style.transform = 'scale(1)';
        mainBtn.style.display = '';
        mainBtn.style.pointerEvents = '';
        mainBtn.style.visibility = 'visible';
    }

    // 6. INITIALISER les particules
    const particles = document.querySelectorAll('.btn-wrapper .particle');
    particles.forEach((p) => {
        p.style.opacity = '0.6';
        p.style.transform = 'translate(0px, 0px) scale(1)';
        p.style.visibility = 'visible';
        p.style.display = '';
    });

    // 7. Réafficher le personnage chibi
    const btnCharacter = document.querySelector('.btn-character');
    if (btnCharacter) {
        btnCharacter.style.opacity = '0.95';
        btnCharacter.style.visibility = 'visible';
        btnCharacter.style.display = '';
        btnCharacter.classList.add('visible');
    }

    // 8. Forcer un reflow puis lancer l'animation avec délai
    void stateIdle.offsetWidth;

    setTimeout(() => {
        startContinuousAnimation();
    }, 200);

    // ============================================
    // FIN FIX PARTICULES
    // ============================================

    // Animations de retour
    anime({
        targets: '.idle-main',
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 500,
        easing: 'easeOutCubic'
    });

    anime({
        targets: '.idle-stats',
        opacity: [0, 1],
        duration: 500,
        delay: 100,
        easing: 'easeOutCubic'
    });

    anime({
        targets: '.recent-games-panel',
        opacity: [0, 1],
        translateX: [-40, 0],
        duration: 500,
        delay: 200,
        easing: 'easeOutCubic'
    });

    anime({
        targets: '.lastgame-panel',
        opacity: [0, 1],
        translateX: [40, 0],
        duration: 500,
        delay: 200,
        easing: 'easeOutCubic'
    });

    setTimeout(() => {
        loadIdleData();
    }, 500);

    console.log('✅ Retour à l\'état idle');
}



function focusStatsTab() {
    // Activer l'onglet Stats
    document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.panel-tab[data-tab="stats"]')?.classList.add('active');

    // Afficher le contenu Stats
    document.querySelectorAll('.panel-tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('tabStats')?.classList.add('active');
}















































function getLivesIconsHTML(iconType, currentLives, maxLives) {
    // Cas spécial : Katana (une seule icône groupée)
    if (iconType === 'katana') {
        const svgKey = Math.max(0, Math.min(3, currentLives));
        const isLost = currentLives === 0;
        return `<span class="life-icon katana-group${isLost ? ' lost' : ''}">${KATANA_SVGS[svgKey]}</span>`;
    }

    // Autres icônes : répéter maxLives fois
    const iconSVG = LIVES_ICONS[iconType] || LIVES_ICONS.heart;
    let html = '';

    for (let i = 0; i < maxLives; i++) {
        const isLost = i >= currentLives;
        html += `<span class="life-icon${isLost ? ' lost' : ''}">${iconSVG}</span>`;
    }

    return html;
}

// Fonction pour générer les icônes bombes (BombAnime)
function getBombIconsHTML(lives) {
    const bombSVG = `<svg class="bomb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="14" r="8"/>
        <path d="M12 6V3"/>
        <path d="M10 3h4"/>
        <path d="M15 7l2-2"/>
    </svg>`;
    
    let html = '';
    for (let i = 0; i < lives; i++) {
        html += `<span class="bomb-life-icon">${bombSVG}</span>`;
    }
    return html;
}


// ============================================
// GESTION DU SÉLECTEUR D'ICÔNES
// ============================================

// Variable pour stocker l'icône sélectionnée
let selectedLivesIcon = 'heart';

/**
 * Initialise le sélecteur d'icônes de vies
 */
function initLivesIconSelector() {
    const iconBtns = document.querySelectorAll('.lives-icon-selector .icon-btn');
    const iconValueDisplay = document.getElementById('livesIconValue');

    iconBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const icon = btn.dataset.icon;

            // UI: Mettre à jour la sélection
            iconBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Mettre à jour l'affichage de la valeur (icône SVG)
            if (iconValueDisplay) {
                const iconSVG = LIVES_ICONS[icon] || LIVES_ICONS.heart;
                iconValueDisplay.innerHTML = iconSVG;
            }

            selectedLivesIcon = icon;

            // 🔥 NOUVEAU: Mettre à jour les cartes joueurs existantes
            updateLobbyPlayersIcons();

            // Envoyer au serveur
            try {
                await fetch('/admin/set-lives-icon', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ icon })
                });
            } catch (err) {
                console.error('Erreur set-lives-icon:', err);
            }
        });
    });

    updateLivesIconVisibility();
}


function updateLobbyPlayersIcons() {
    let currentLives;
    
    if (currentGameMode === 'bombanime') {
        // Mode BombAnime - utiliser le paramètre BombAnime
        currentLives = parseInt(document.querySelector('.bombanime-lives-group .setting-option-btn.active')?.dataset.value) || 1;
    } else {
        // Mode classique ou rivalité
        currentLives = parseInt(document.querySelector('.lives-group .setting-option-btn.active')?.dataset.value) || 3;
    }

    document.querySelectorAll('.player-card-mini-stat').forEach(stat => {
        stat.innerHTML = getLivesIconsHTML(selectedLivesIcon, currentLives, currentLives);
    });
}

/**
 * Met à jour la visibilité du sélecteur d'icônes selon le mode
 */
function updateLivesIconVisibility() {
    const iconGroup = document.getElementById('livesIconGroup');
    const isLivesMode = gameSettings.mode === 'vie';

    if (iconGroup) {
        iconGroup.classList.toggle('hidden', !isLivesMode);
    }
}

/**
 * Met à jour le sélecteur avec l'icône actuelle (depuis serveur)
 */
/**
 * Met à jour le sélecteur avec l'icône actuelle (depuis serveur)
 */
function updateLivesIconSelector(icon) {
    selectedLivesIcon = icon || 'heart';

    const iconBtns = document.querySelectorAll('.lives-icon-selector .icon-btn');
    const iconValueDisplay = document.getElementById('livesIconValue');

    iconBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.icon === selectedLivesIcon);
    });

    // Afficher l'icône SVG au lieu du nom texte
    if (iconValueDisplay) {
        const iconSVG = LIVES_ICONS[selectedLivesIcon] || LIVES_ICONS.heart;
        iconValueDisplay.innerHTML = iconSVG;
    }
}




// ============================================
// ANIMATION COMPTEUR
// ============================================
function animateCounter(element, target, duration = 1500, prefix = '', suffix = '') {
    const start = 0;
    const startTime = performance.now();

    // Si target contient 'K', convertir pour l'affichage final
    const isFormatted = typeof target === 'string' && target.includes('K');
    const numericTarget = isFormatted ? parseFloat(target) * 1000 : parseInt(target) || 0;

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing out cubic pour un effet satisfaisant
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (numericTarget - start) * eased);

        // Formater selon le type
        if (isFormatted && current >= 1000) {
            element.textContent = prefix + (current / 1000).toFixed(1) + 'K' + suffix;
        } else {
            element.textContent = prefix + current.toLocaleString() + suffix;
        }

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            // Valeur finale exacte
            element.textContent = prefix + target + suffix;
        }
    }

    requestAnimationFrame(update);
}



// Appeler après le DOM chargé
document.addEventListener('DOMContentLoaded', () => {
    initSettingsListeners();
    initLivesIconSelector();
    initHidePercentButton();
    initKickModal();
});

// 🆕 Initialiser le bouton pour masquer les pourcentages
function initHidePercentButton() {
    const btn = document.getElementById('hidePercentBtn');
    if (!btn) return;
    
    btn.addEventListener('click', () => {
        hidePercentsEnabled = !hidePercentsEnabled;
        btn.classList.toggle('hidden', hidePercentsEnabled);
        
        const answersGrid = document.getElementById('answersGrid');
        if (answersGrid) {
            answersGrid.classList.toggle('hide-percents', hidePercentsEnabled);
        }
        
        console.log(`👁️ Pourcentages ${hidePercentsEnabled ? 'masqués' : 'visibles'}`);
    });
}

// 🆕 Afficher/masquer le bouton œil (appelé avec le timer)
function showHidePercentButton(show) {
    const btn = document.getElementById('hidePercentBtn');
    if (btn) {
        btn.classList.toggle('visible', show);
        
        // 🆕 Si on masque le bouton (fin de question), réafficher les % pour voir les résultats
        // Mais on NE reset PAS hidePercentsEnabled pour conserver l'état à la prochaine question
        if (!show) {
            const answersGrid = document.getElementById('answersGrid');
            if (answersGrid) {
                answersGrid.classList.remove('hide-percents');
            }
        }
    }
}

// 🆕 Appliquer l'état hide-percents à la grille (conserve l'état entre questions)
function applyHidePercentsState() {
    const answersGrid = document.getElementById('answersGrid');
    const btn = document.getElementById('hidePercentBtn');
    
    if (answersGrid && hidePercentsEnabled) {
        answersGrid.classList.add('hide-percents');
    }
    
    // Mettre à jour l'icône du bouton selon l'état
    if (btn) {
        btn.classList.toggle('hidden', hidePercentsEnabled);
    }
}

// ============================================
// 🆕 MODE RIVALITÉ - GESTION ÉQUIPES
// ============================================

// Initialiser les listeners pour le mode Rivalité
function initRivalryMode() {
    const copySpectateLink = document.getElementById('copySpectateLink');
    
    if (copySpectateLink) {
        copySpectateLink.addEventListener('click', () => {
            // Générer le lien spectateur (basé sur l'URL actuelle + mode spectate)
            const spectateUrl = `${window.location.origin}/spectate`;
            
            navigator.clipboard.writeText(spectateUrl).then(() => {
                copySpectateLink.classList.add('copied');
                copySpectateLink.querySelector('span').textContent = 'Lien copié !';
                
                setTimeout(() => {
                    copySpectateLink.classList.remove('copied');
                    copySpectateLink.querySelector('span').textContent = 'Lien streamer';
                }, 2000);
            }).catch(err => {
                console.error('Erreur copie:', err);
            });
        });
    }
}

// Récupérer les noms d'équipes (valeurs par défaut)
function getTeamNames() {
    return {
        1: 'Team A',
        2: 'Team B'
    };
}

// Mettre à jour l'UI du badge de mode (près du bouton JOUER)
function updateModeBadgeUI() {
    const modeBadge = document.getElementById('modeBadge');
    if (!modeBadge) return;
    
    const badgeText = modeBadge.querySelector('.mode-badge-text');
    if (badgeText) {
        if (currentGameMode === 'rivalry') {
            badgeText.textContent = 'Rivalry Mode';
            modeBadge.classList.add('rivalry');
        } else {
            badgeText.textContent = 'Classic Mode';
            modeBadge.classList.remove('rivalry');
        }
    }
}

// Appel init au chargement
document.addEventListener('DOMContentLoaded', () => {
    initRivalryMode();
    
    // Mettre à jour le badge de mode selon localStorage
    updateModeBadgeUI();

    // Mettre à jour la visibilité du toggle de tri
    updateGridSortToggleVisibility();

    // Initialiser les contrôles de rééquilibrage
    initRebalanceButton();
    initTeamSwitchInModal();

    // Event listeners pour le toggle de tri en mode Rivalité
    const sortToggle = document.getElementById('gridSortToggle');
    if (sortToggle) {
        sortToggle.querySelectorAll('.sort-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const newSortMode = btn.dataset.sort;
                if (newSortMode === gridSortMode) return;

                // Mettre à jour l'état actif
                sortToggle.querySelectorAll('.sort-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Changer le mode et retrier avec animation
                gridSortMode = newSortMode;
                sortPlayersGrid(true);
            });
        });
    }

    // Event listeners pour les boutons de navigation entre équipes
    const teamNavButtons = document.getElementById('teamNavButtons');
    if (teamNavButtons) {
        teamNavButtons.querySelectorAll('.team-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const team = btn.dataset.team;
                const separator = document.getElementById(`teamSeparator${team}`);
                if (separator) {
                    separator.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }
});

// Gérer la visibilité des boutons de navigation entre équipes
function updateTeamNavVisibility(show) {
    const navButtons = document.getElementById('teamNavButtons');
    if (navButtons) {
        if (show) {
            navButtons.classList.add('visible');
        } else {
            navButtons.classList.remove('visible');
        }
    }
}

// ============================================
// 💣 BOMBANIME - Fonctions Admin
// ============================================

let bombanimeState = {
    playersOrder: [],
    playersData: [],
    currentPlayerTwitchId: null,
    timer: 8,
    timeRemaining: 8,
    timerInterval: null,
    serie: 'Naruto',
    lastValidName: null,
    isFirstTurn: true, // 💣 Track premier tour pour délai input
    // Admin-as-player state
    isAdminPlayer: false,
    isMyTurn: false,
    myAlphabet: [],
    challenges: [],
    bonuses: { freeCharacter: 0, extraLife: 0 },
    inputValue: '',
    lastError: null,
    playerLives: 0,
    _pendingTurn: false,
    _turnWatchdog: null
};

// 💣 BombAnime: Click anywhere to refocus admin input (sauf fermer lobby, signaler, son)
document.addEventListener('click', (e) => {
    // Vérifier qu'on est en mode bombanime admin-as-player et que c'est mon tour
    if (!bombanimeState.isAdminPlayer || !bombanimeState.isMyTurn) return;
    
    // Exclure : bouton fermer lobby, bouton signaler/suggestion, contrôle son
    if (e.target.closest('.bombanime-close-lobby-btn')) return;
    if (e.target.closest('#suggestionFlagBtn')) return;
    if (e.target.closest('#adminSoundControl')) return;
    if (e.target.closest('.suggestion-modal')) return;
    
    const input = document.getElementById('bombanimeAdminInputField');
    if (input && !input.disabled) {
        input.focus();
    }
});

// 💣 BombAnime: Backup Enter handler au niveau document (si l'input perd le focus OU si le handler input est perdu)
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (!bombanimeState.isAdminPlayer) return;
    if (currentGameMode !== 'bombanime') return;
    
    const input = document.getElementById('bombanimeAdminInputField');
    if (!input || !input.value.trim()) return;
    
    // Vérifier qu'on n'est pas dans un autre input (modal, etc.)
    const activeEl = document.activeElement;
    if (activeEl && activeEl !== input && activeEl.tagName === 'INPUT') return;
    
    // Vérifier que c'est bien mon tour (double-check avec currentPlayerTwitchId)
    const isReallyMyTurn = bombanimeState.isMyTurn || 
        (twitchUser && bombanimeState.currentPlayerTwitchId === twitchUser.id);
    
    if (isReallyMyTurn) {
        e.preventDefault();
        if (activeEl !== input) {
            console.log('🔧 Backup Enter: input sans focus, forçage soumission');
            input.focus();
        } else {
            console.log('🔧 Backup Enter: handler input perdu, fallback document');
        }
        adminSubmitBombanime();
    }
});

// Afficher le cercle BombAnime
function showBombanimeCircle(data) {
    bombanimeState.playersOrder = data.playersOrder;
    bombanimeState.playersData = data.playersData;
    bombanimeState.timer = data.timer;
    bombanimeState.timeRemaining = data.timer; // Reset le timer
    bombanimeState.serie = data.serie;
    bombanimeState.lastValidName = null;
    bombanimeState.currentPlayerTwitchId = null; // Reset pour que la bombe pointe vers le haut pendant l'intro
    bombanimeState.isFirstTurn = true; // 💣 Premier tour pas encore joué
    bombanimeState._pendingTurn = false; // Reset pending turn
    
    // Détecter si l'admin est joueur
    const isAdminPlayer = twitchUser && 
        data.playersData.some(p => p.twitchId === twitchUser.id);
    bombanimeState.isAdminPlayer = isAdminPlayer;
    if (isAdminPlayer) {
        sessionStorage.setItem('adminBombanimePlayer', 'true');
        adminInLobby = true;
        bombanimeState.isMyTurn = false;
        // 🔥 Nettoyer le watchdog si actif
        if (bombanimeState._turnWatchdog) {
            clearInterval(bombanimeState._turnWatchdog);
            bombanimeState._turnWatchdog = null;
        }
        bombanimeState.myAlphabet = [];
        bombanimeState.challenges = (data.challenges || []).map(c => ({
            ...c, progress: 0, completed: false
        }));
        bombanimeState.bonuses = { freeCharacter: 0, extraLife: 0 };
        bombanimeState.inputValue = '';
        bombanimeState.lastError = null;
        const myData = data.playersData.find(p => p.twitchId === twitchUser.id);
        bombanimeState.playerLives = myData ? myData.lives : 0;
    }
    
    console.log('💣 showBombanimeCircle - currentPlayerTwitchId reset à null, adminPlayer:', isAdminPlayer);
    
    // Clear l'interval précédent si existant
    if (bombanimeState.timerInterval) {
        clearInterval(bombanimeState.timerInterval);
        bombanimeState.timerInterval = null;
    }
    
    console.log('💣 showBombanimeCircle appelé avec:', data);
    
    // Récupérer les éléments
    const stateLobby = document.getElementById('stateLobby');
    const stateGame = document.getElementById('stateGame');
    
    // Cacher immédiatement le lobby
    if (stateLobby) {
        stateLobby.classList.remove('active');
        stateLobby.style.display = 'none';
    }
    
    // Afficher l'écran de jeu
    if (stateGame) {
        // Cacher tous les éléments du mode quiz classique
        const gameQuestionWrapper = document.getElementById('gameQuestionWrapper');
        const gameMainPanel = document.getElementById('gameMainPanel');
        const characterImageContainer = document.getElementById('characterImageContainer');
        const gameFizzbuzzPanel = document.getElementById('gameFizzbuzzPanel');
        const gameLogsContainer = document.getElementById('gameLogsContainer');
        const gameLogsToggle = document.getElementById('gameLogsToggle');
        const gameCloseBtn = document.getElementById('gameCloseBtn');
        const gameLayout = stateGame.querySelector('.game-layout');
        
        if (gameQuestionWrapper) gameQuestionWrapper.style.display = 'none';
        if (gameMainPanel) gameMainPanel.style.display = 'none';
        if (characterImageContainer) characterImageContainer.style.display = 'none';
        if (gameFizzbuzzPanel) gameFizzbuzzPanel.style.display = 'none';
        // Cacher les logs et boutons du mode quiz
        if (gameLogsContainer) gameLogsContainer.style.display = 'none';
        if (gameLogsToggle) gameLogsToggle.style.display = 'none';
        if (gameCloseBtn) gameCloseBtn.style.display = 'none';
        // Cacher le game-layout entier
        if (gameLayout) gameLayout.style.display = 'none';
        
        // Créer ou afficher le conteneur BombAnime
        let bombanimeContainer = document.getElementById('bombanimeAdminContainer');
        if (!bombanimeContainer) {
            bombanimeContainer = document.createElement('div');
            bombanimeContainer.id = 'bombanimeAdminContainer';
            bombanimeContainer.className = 'bombanime-admin-container';
            // Ajouter au body pour un centrage parfait
            document.body.appendChild(bombanimeContainer);
        }
        // Forcer les styles de centrage
        bombanimeContainer.style.cssText = `
            display: flex;
            position: fixed;
            top: 3.5rem;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 200;
        `;
        
        // Créer ou afficher le panneau de logs (ou player POV)
        if (isAdminPlayer) {
            // === ADMIN IS PLAYER: Pas de logs, mais challenges + alphabet + input ===
            
            // Supprimer l'ancien logs panel s'il existe
            let oldLogs = document.getElementById('bombanimeLogsPanel');
            if (oldLogs) oldLogs.remove();
            
            // Challenges panel (gauche)
            let challengesPanel = document.getElementById('bombanimeAdminChallenges');
            if (!challengesPanel) {
                challengesPanel = document.createElement('div');
                challengesPanel.id = 'bombanimeAdminChallenges';
                challengesPanel.className = 'bombanime-challenges-panel';
                bombanimeContainer.appendChild(challengesPanel);
            }
            renderAdminBombanimeChalllenges();
            
            // Alphabet panel (droite)
            let alphabetPanel = document.getElementById('bombanimeAdminAlphabet');
            if (!alphabetPanel) {
                alphabetPanel = document.createElement('div');
                alphabetPanel.id = 'bombanimeAdminAlphabet';
                alphabetPanel.className = 'alphabet-panel';
                bombanimeContainer.appendChild(alphabetPanel);
            }
            renderAdminBombanimeAlphabet();
            
            // Input zone (bas)
            let inputZone = document.getElementById('bombanimeAdminInput');
            if (!inputZone) {
                inputZone = document.createElement('div');
                inputZone.id = 'bombanimeAdminInput';
                inputZone.className = 'input-zone';
                inputZone.innerHTML = `
                    <div class="game-input-container">
                        <input type="text" class="game-input disabled" id="bombanimeAdminInputField"
                            placeholder="${(SERIE_NAMES[bombanimeState.serie] || bombanimeState.serie)}..." autocomplete="off" disabled>
                        <div class="input-underline disabled"></div>
                        <div class="feedback-message" id="bombanimeAdminFeedback"></div>
                    </div>
                `;
                bombanimeContainer.appendChild(inputZone);
                
                // Attach Enter handler
                const inputField = inputZone.querySelector('#bombanimeAdminInputField');
                inputField._bombanimeKeyHandler = (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation(); // 🔥 Empêcher le fallback document de double-fire
                        // 🔧 FIX: Double vérification isMyTurn + currentPlayerTwitchId
                        const isReallyMyTurn = bombanimeState.isMyTurn || 
                            (twitchUser && bombanimeState.currentPlayerTwitchId === twitchUser.id);
                        if (isReallyMyTurn) {
                            adminSubmitBombanime();
                        } else {
                            console.warn('⚠️ Enter pressé mais pas mon tour (isMyTurn=' + bombanimeState.isMyTurn + ', current=' + bombanimeState.currentPlayerTwitchId + ')');
                        }
                    }
                };
                inputField.addEventListener('keydown', inputField._bombanimeKeyHandler);
                // 💣 Bloquer le copier-coller (anti-triche)
                inputField.addEventListener('paste', (e) => e.preventDefault());
                inputField.addEventListener('drop', (e) => e.preventDefault());
                // Emit typing + show locally under admin hex
                inputField.addEventListener('input', () => {
                    if (bombanimeState.isMyTurn && twitchUser) {
                        const text = inputField.value;
                        socket.emit('bombanime-typing', {
                            twitchId: twitchUser.id,
                            text: text
                        });
                        // Update locally (broadcast doesn't echo back)
                        const mySlot = document.querySelector(`.player-slot[data-twitch-id="${twitchUser.id}"]`);
                        if (mySlot) {
                            let typingEl = mySlot.querySelector('.player-typing');
                            if (!typingEl) {
                                typingEl = document.createElement('div');
                                typingEl.className = 'player-typing';
                                mySlot.appendChild(typingEl);
                            }
                            typingEl.textContent = text.toUpperCase();
                            typingEl.classList.remove('last-answer');
                            typingEl.classList.toggle('has-text', !!text);
                        }
                    }
                });
            }
            
            // 💣 Forcer le disable de l'input au démarrage (même si l'input existait déjà d'une partie précédente)
            const existingInput = document.getElementById('bombanimeAdminInputField');
            if (existingInput) {
                existingInput.disabled = true;
                existingInput.classList.add('disabled');
                existingInput.value = '';
                // 🔥 FIX: Mettre le bon placeholder dès le démarrage (pas attendre bombanime-turn-start)
                const serieName = SERIE_NAMES[bombanimeState.serie] || bombanimeState.serie;
                existingInput.placeholder = `${serieName}...`;
                const underline = document.querySelector('#bombanimeAdminInput .input-underline');
                if (underline) underline.classList.add('disabled');
                
                // 🔥 FIX: Re-attacher le listener si manquant (input réutilisé d'une partie précédente)
                if (!existingInput._bombanimeKeyHandler) {
                    console.warn('⚠️ Re-attachement keydown sur input existant');
                    existingInput._bombanimeKeyHandler = (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            const isReallyMyTurn = bombanimeState.isMyTurn || 
                                (twitchUser && bombanimeState.currentPlayerTwitchId === twitchUser.id);
                            if (isReallyMyTurn) adminSubmitBombanime();
                        }
                    };
                    existingInput.addEventListener('keydown', existingInput._bombanimeKeyHandler);
                }
                
                // 🔥 FIX: Si un tour était en attente, l'appliquer maintenant
                if (bombanimeState._pendingTurn) {
                    console.log('🔄 Application du tour en attente après création input');
                    setTimeout(() => updateAdminBombanimeInput(true), 100);
                }
            }
            
            // Fermer lobby button (bas gauche)
            let closeBtn = document.getElementById('bombanimeAdminCloseBtn');
            if (!closeBtn) {
                closeBtn = document.createElement('button');
                closeBtn.id = 'bombanimeAdminCloseBtn';
                closeBtn.className = 'bombanime-close-lobby-btn';
                closeBtn.textContent = 'Fermer lobby';
                closeBtn.onclick = closeLobby;
                bombanimeContainer.appendChild(closeBtn);
            }
            
        } else {
            // === ADMIN SPECTATEUR: Logs panel classique ===
            // Supprimer les éléments joueur s'ils existent
            ['bombanimeAdminChallenges', 'bombanimeAdminAlphabet', 'bombanimeAdminInput', 'bombanimeAdminCloseBtn'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.remove();
            });
            
        let logsPanel = document.getElementById('bombanimeLogsPanel');
        if (!logsPanel) {
            logsPanel = document.createElement('div');
            logsPanel.id = 'bombanimeLogsPanel';
            logsPanel.className = 'bombanime-logs-panel';
            logsPanel.innerHTML = `
                <div class="logs-list" id="bombanimeLogsList"></div>
                <div class="logs-footer">
                    <button class="bombanime-close-lobby-btn" id="bombanimeCloseLobbyBtn">Fermer lobby</button>
                </div>
            `;
            bombanimeContainer.insertBefore(logsPanel, bombanimeContainer.firstChild);
        } else {
            // S'assurer que le footer et le bouton existent
            let footer = logsPanel.querySelector('.logs-footer');
            if (!footer) {
                footer = document.createElement('div');
                footer.className = 'logs-footer';
                footer.innerHTML = `<button class="bombanime-close-lobby-btn" id="bombanimeCloseLobbyBtn">Fermer lobby</button>`;
                logsPanel.appendChild(footer);
            }
        }
        
        // Toujours attacher l'événement au bouton et le rendre visible
        const closeBtn = logsPanel.querySelector('#bombanimeCloseLobbyBtn');
        if (closeBtn) {
            closeBtn.onclick = closeLobby;
            closeBtn.style.display = '';  // Réafficher le bouton
        }
        
        logsPanel.style.cssText = `
            display: flex;
            flex-direction: column;
            position: absolute;
            left: 0;
            top: 16px;
            bottom: 16px;
            width: 240px;
            padding-left: 16px;
            z-index: 10;
            background: linear-gradient(90deg, 
                rgba(15, 15, 20, 0.7) 0%, 
                rgba(15, 15, 20, 0.7) 60%,
                rgba(15, 15, 20, 0.1) 90%, 
                transparent 100%
            );
        `;
        } // end admin spectateur
        
        // Créer la zone de jeu principale si elle n'existe pas
        let gameZone = document.getElementById('bombanimeGameZone');
        if (!gameZone) {
            gameZone = document.createElement('div');
            gameZone.id = 'bombanimeGameZone';
            gameZone.className = 'bombanime-game-zone';
            bombanimeContainer.appendChild(gameZone);
        }
        gameZone.style.cssText = `
            position: absolute;
            left: 0;
            right: 0;
            top: 0;
            bottom: 0;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        // Activer l'écran de jeu
        stateGame.classList.add('active');
        stateGame.style.display = 'flex';
        stateGame.style.opacity = '1';
        stateGame.style.pointerEvents = '';
        
        console.log('✅ stateGame activé');
    }
    
    // Rendre le cercle
    renderBombanimeCircle();
}

// Ajouter une entrée dans le panneau de logs BombAnime
function addBombanimeLog(type, data) {
    const logsList = document.getElementById('bombanimeLogsList');
    if (!logsList) return;
    
    // Ne pas logger les alphabets complets ni les erreurs
    if (type === 'alphabet' || type === 'error' || type === 'start' || type === 'turn') return;
    
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    
    let content = '';
    
    switch (type) {
        case 'success':
            content = `
                <div class="log-dot"></div>
                <div class="log-content">
                    <span class="log-player">${data.playerUsername}</span>
                    <span class="log-answer">${data.name}</span>
                </div>
            `;
            break;
        case 'explosion':
            content = `
                <div class="log-dot"></div>
                <div class="log-content">
                    <span class="log-player">${data.playerUsername}</span>
                    <span class="log-answer">a explosé!</span>
                </div>
            `;
            break;
        case 'elimination':
            content = `
                <div class="log-dot"></div>
                <div class="log-content">
                    <span class="log-player">${data.playerUsername}</span>
                    <span class="log-answer">éliminé!</span>
                </div>
            `;
            break;
        default:
            return; // Ne pas afficher les autres types
    }
    
    logEntry.innerHTML = content;
    
    // Ajouter en haut de la liste
    logsList.insertBefore(logEntry, logsList.firstChild);
    
    // Limiter à 50 entrées
    while (logsList.children.length > 50) {
        logsList.removeChild(logsList.lastChild);
    }
    
    // Animation d'entrée
    logEntry.style.opacity = '0';
    logEntry.style.transform = 'translateX(-20px)';
    requestAnimationFrame(() => {
        logEntry.style.transition = 'all 0.3s ease';
        logEntry.style.opacity = '1';
        logEntry.style.transform = 'translateX(0)';
    });
}

// Vider les logs BombAnime
function clearBombanimeLogs() {
    const logsList = document.getElementById('bombanimeLogsList');
    if (logsList) {
        logsList.innerHTML = '';
    }
}

// ============================================
// 💣 BOMBANIME - Admin as Player POV
// ============================================

const SERIE_NAMES = {
    'Naruto': 'Naruto', 
    'OnePiece': 'One Piece', 
    'Dbz': 'Dragon Ball',
    'Mha': 'My Hero Academia', 
    'Bleach': 'Bleach', 
    'Jojo': 'Jojo',
    'Hxh': 'Hunter x Hunter', 
    'FairyTail': 'Fairy Tail', 
    'Pokemon': 'Pokemon',
    'Snk': 'Shingeki no Kyojin', 
    'DemonSlayer': 'Demon Slayer', 
    'JujutsuKaisen': 'Jujutsu Kaisen',
    'Reborn': 'Reborn', 
    'DeathNote': 'Death Note', 
    'BlackClover': 'Black Clover',
    'Fma': 'Fullmetal Alchemist',
    'ChainsawMan': 'Chainsaw Man',
    'Prota' : 'Protagonist'
};

function renderAdminBombanimeChalllenges() {
    const panel = document.getElementById('bombanimeAdminChallenges');
    if (!panel) return;
    
    const challenges = bombanimeState.challenges;
    if (!challenges.length) {
        panel.innerHTML = '';
        return;
    }
    
    let html = '<div class="challenges-list">';
    challenges.forEach(c => {
        const pct = Math.min(100, (c.progress / c.target) * 100);
        const completed = c.completed;
        const bonusCount = c.reward === 'extraLife' ? bombanimeState.bonuses.extraLife : bombanimeState.bonuses.freeCharacter;
        const hasBonus = completed && bonusCount > 0;
        const used = completed && bonusCount <= 0;
        const isGift = c.reward === 'freeCharacter';
        const notMyTurn = isGift && !bombanimeState.isMyTurn;
        const disabled = !completed || (isGift ? (!bonusCount || !bombanimeState.isMyTurn) : !bonusCount);
        
        html += `
            <div class="challenge-item ${completed ? 'completed' : ''} ${!completed && c.progress > 0 ? 'in-progress' : ''} ${used ? 'used' : ''}">
                <div class="challenge-content">
                    <div class="challenge-title">
                        ${c.target} perso${c.target > 1 ? 's' : ''} en <span class="challenge-letter">${c.letter}</span>
                    </div>
                    <div class="challenge-progress-bar">
                        <div class="progress-fill" style="width: ${pct}%"></div>
                    </div>
                </div>
                <button class="challenge-bonus-btn ${hasBonus ? 'available' : ''} ${isGift ? 'type-gift' : ''} ${notMyTurn ? 'not-my-turn' : ''}"
                    ${disabled ? 'disabled' : ''}
                    onclick="adminUseBombanimeBonus('${c.reward}')">
                    ${c.reward === 'extraLife' 
                        ? '<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>'
                        : '<svg viewBox="0 0 24 24"><path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z"/></svg>'}
                    ${hasBonus ? `<span class="bonus-count">${bonusCount}</span>` : ''}
                </button>
            </div>
        `;
    });
    html += '</div>';
    panel.innerHTML = html;
}

function renderAdminBombanimeAlphabet() {
    const panel = document.getElementById('bombanimeAdminAlphabet');
    if (!panel) return;
    
    const myAlphabet = new Set(bombanimeState.myAlphabet.map(l => l.toUpperCase()));
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const fillPct = (myAlphabet.size / 26) * 100;
    
    let gridHTML = '';
    // Main grid (A-X, 8 rows of 3)
    for (let i = 0; i < 24; i++) {
        const l = letters[i];
        gridHTML += `<div class="alphabet-letter ${myAlphabet.has(l) ? 'used' : ''}">${l}</div>`;
    }
    // Last row Y-Z
    const lastRowHTML = `
        <div class="alphabet-last-row">
            <div class="alphabet-letter ${myAlphabet.has('Y') ? 'used' : ''}">Y</div>
            <div class="alphabet-letter ${myAlphabet.has('Z') ? 'used' : ''}">Z</div>
        </div>
    `;
    
    panel.innerHTML = `
        <div class="alphabet-heart-main">
            <svg class="heart-bg" viewBox="0 0 24 24">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <svg class="heart-fill" viewBox="0 0 24 24" style="clip-path: inset(${100 - fillPct}% 0 0 0)">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
        </div>
        <div class="alphabet-grid">
            ${gridHTML}
            ${lastRowHTML}
        </div>
    `;
}

function updateAdminBombanimeInput(isMyTurn) {
    bombanimeState.isMyTurn = isMyTurn;
    bombanimeState._pendingTurn = false; // 🔥 Clear pending turn
    
    // 🔧 FIX: Si isMyTurn est false mais que currentPlayerTwitchId dit le contraire, corriger
    if (!isMyTurn && twitchUser && bombanimeState.currentPlayerTwitchId === twitchUser.id) {
        console.warn('🔧 updateAdminBombanimeInput: isMyTurn=false mais currentPlayerTwitchId correspond! Force isMyTurn=true');
        isMyTurn = true;
        bombanimeState.isMyTurn = true;
    }
    
    const input = document.getElementById('bombanimeAdminInputField');
    const underline = document.querySelector('#bombanimeAdminInput .input-underline');
    if (!input) {
        // 🔥 FIX: Si input pas trouvé et c'est mon tour, marquer comme pending
        if (isMyTurn) {
            bombanimeState._pendingTurn = true;
            console.warn('⚠️ updateAdminBombanimeInput: input introuvable, pendingTurn=true');
        }
        return;
    }
    
    // 🔥 FIX: Force disable/enable (pas toggle) pour éviter les désync
    input.disabled = !isMyTurn;
    if (isMyTurn) {
        input.classList.remove('disabled');
        input.removeAttribute('disabled');
    } else {
        input.classList.add('disabled');
    }
    if (underline) underline.classList.toggle('disabled', !isMyTurn);
    
    // 🔥 FIX: Re-attacher le listener keydown si manquant (peut arriver après reconnexion)
    if (!input._bombanimeKeyHandler) {
        console.warn('⚠️ Listener keydown manquant, re-attachement...');
        input._bombanimeKeyHandler = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                // 🔧 FIX: Double vérification isMyTurn + currentPlayerTwitchId
                const isReallyMyTurn = bombanimeState.isMyTurn || 
                    (twitchUser && bombanimeState.currentPlayerTwitchId === twitchUser.id);
                if (isReallyMyTurn) {
                    adminSubmitBombanime();
                } else {
                    console.warn('⚠️ Enter pressé mais pas mon tour (isMyTurn=' + bombanimeState.isMyTurn + ', current=' + bombanimeState.currentPlayerTwitchId + ')');
                }
            }
        };
        input.addEventListener('keydown', input._bombanimeKeyHandler);
    }
    
    const serieName = SERIE_NAMES[bombanimeState.serie] || bombanimeState.serie;
    input.placeholder = `${serieName}...`;
    
    // Reset input when turn ends (bomb exploded or turn passed)
    if (!isMyTurn) {
        input.value = '';
        // Clear local typing display (sauf si c'est un last-answer = réponse acceptée)
        if (twitchUser) {
            const mySlot = document.querySelector(`.player-slot[data-twitch-id="${twitchUser.id}"]`);
            if (mySlot) {
                const typingEl = mySlot.querySelector('.player-typing');
                if (typingEl && !typingEl.classList.contains('last-answer')) {
                    typingEl.textContent = '';
                    typingEl.classList.remove('has-text');
                }
            }
        }
    }
    
    if (isMyTurn) {
        input.focus();
        // Clear error
        bombanimeState.lastError = null;
        const feedback = document.getElementById('bombanimeAdminFeedback');
        if (feedback) {
            feedback.classList.remove('show', 'error');
            feedback.textContent = '';
        }
    }
    
    // Update challenges (bonus button state depends on isMyTurn)
    renderAdminBombanimeChalllenges();
    
    // 🔥 WATCHDOG: Vérification périodique quand c'est mon tour
    if (bombanimeState._turnWatchdog) {
        clearInterval(bombanimeState._turnWatchdog);
        bombanimeState._turnWatchdog = null;
    }
    if (isMyTurn) {
        let watchdogChecks = 0;
        bombanimeState._turnWatchdog = setInterval(() => {
            watchdogChecks++;
            // Arrêter après 30s (60 checks)
            if (watchdogChecks > 60 || !bombanimeState.isMyTurn) {
                clearInterval(bombanimeState._turnWatchdog);
                bombanimeState._turnWatchdog = null;
                return;
            }
            
            const inp = document.getElementById('bombanimeAdminInputField');
            if (!inp) return;
            
            // Vérifier que l'input est bien enabled
            if (inp.disabled || inp.hasAttribute('disabled') || inp.classList.contains('disabled')) {
                console.warn('🔧 Watchdog: input désync détecté, correction...');
                inp.disabled = false;
                inp.removeAttribute('disabled');
                inp.classList.remove('disabled');
            }
            
            // Vérifier que le listener est toujours attaché
            if (!inp._bombanimeKeyHandler) {
                console.warn('🔧 Watchdog: listener manquant, re-attachement...');
                inp._bombanimeKeyHandler = (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        const isReallyMyTurn = bombanimeState.isMyTurn || 
                            (twitchUser && bombanimeState.currentPlayerTwitchId === twitchUser.id);
                        if (isReallyMyTurn) adminSubmitBombanime();
                    }
                };
                inp.addEventListener('keydown', inp._bombanimeKeyHandler);
            }
        }, 500);
    }
}

function adminSubmitBombanime() {
    const input = document.getElementById('bombanimeAdminInputField');
    if (!input) { console.warn('⚠️ Submit: input introuvable'); return; }
    if (!input.value.trim()) { console.warn('⚠️ Submit: input vide'); return; }
    if (!twitchUser) { console.warn('⚠️ Submit: twitchUser null'); return; }
    
    // 🔧 FIX: Double vérification - isMyTurn OU vérification directe du currentPlayerTwitchId
    if (!bombanimeState.isMyTurn) {
        // Fallback: vérifier si c'est vraiment notre tour via l'ID joueur actuel
        if (bombanimeState.currentPlayerTwitchId === twitchUser.id) {
            console.warn('🔧 isMyTurn=false mais currentPlayerTwitchId correspond! Correction auto.');
            bombanimeState.isMyTurn = true; // Re-sync
        } else {
            console.warn('⚠️ Submit: pas mon tour (isMyTurn=false, currentPlayer=' + bombanimeState.currentPlayerTwitchId + ')');
            return;
        }
    }
    
    console.log('✅ Submit BombAnime:', input.value.trim());
    socket.emit('bombanime-submit-name', {
        name: input.value.trim()
    });
}

function adminUseBombanimeBonus(reward) {
    if (!twitchUser) return;
    if (reward === 'freeCharacter') {
        socket.emit('bombanime-use-free-character');
    } else if (reward === 'extraLife') {
        socket.emit('bombanime-use-extra-life');
    }
}

function showAdminBombanimeError(reason) {
    const input = document.getElementById('bombanimeAdminInputField');
    if (!input) return;
    
    // Reset input instantly
    input.value = '';
    
    // Shake animation (visual only)
    input.classList.add('shake-error');
    setTimeout(() => input.classList.remove('shake-error'), 400);
    
    // Clear local typing display
    if (twitchUser) {
        const mySlot = document.querySelector(`.player-slot[data-twitch-id="${twitchUser.id}"]`);
        if (mySlot) {
            const typingEl = mySlot.querySelector('.player-typing');
            if (typingEl) {
                typingEl.textContent = '';
                typingEl.classList.remove('has-text');
            }
        }
    }
}

// Rendre le cercle de joueurs (style v22)
function renderBombanimeCircle() {
    const container = document.getElementById('bombanimeGameZone') || document.getElementById('bombanimeAdminContainer');
    if (!container) {
        console.error('❌ Container BombAnime non trouvé');
        return;
    }
    
    const players = bombanimeState.playersData;
    const currentTwitchId = bombanimeState.currentPlayerTwitchId;
    const playerCount = players.length;
    
    console.log('🔄 renderBombanimeCircle - Joueurs:', playerCount, 'Current:', currentTwitchId);
    
    // Configuration adaptative - même formule que côté joueur
    // 🔥 FIX: Scale up pour écrans 2K+
    const is2K = window.innerWidth >= 2400;
    const scaleFactor = is2K ? 1.45 : 1;
    
    const circleSize = (500 + (playerCount * 22)) * scaleFactor;
    const hexSize = Math.max(58, 105 - (playerCount * 3.5)) * scaleFactor;
    
    // Taille de la bombe adaptative (moins de variation)
    const bombSize = Math.min(70, Math.max(58, 48 + (playerCount * 1.7))) * scaleFactor;
    
    const centerX = circleSize / 2;
    const centerY = circleSize / 2;
    
    // Distance minimum entre joueurs et bombe (augmente quand il y a moins de joueurs)
    const minDistanceFromBomb = (60 + (13 - playerCount) * 5) * scaleFactor;
    const baseRadius = (circleSize / 2) - hexSize - 20;
    const radius = Math.max(baseRadius, (bombSize / 2) + hexSize + minDistanceFromBomb);
    
    const offsetAngle = Math.PI / playerCount;
    
    let playersHTML = '';
    
    players.forEach((player, index) => {
        const angle = (index / playerCount) * 2 * Math.PI - Math.PI / 2 + offsetAngle;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        const isCurrent = player.twitchId === currentTwitchId;
        const isDead = !player.isAlive;
        
        // Générer les cœurs SVG
        let heartsHTML = '';
        for (let i = 0; i < 2; i++) {
            const lostClass = i >= player.lives ? 'lost' : '';
            heartsHTML += `<svg class="player-life ${lostClass}" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
        }
        
        playersHTML += `
            <div class="player-slot ${isCurrent ? 'active' : ''} ${isDead ? 'eliminated' : ''}" 
                 style="left: ${x}px; top: ${y}px; --hex-size: ${hexSize}px;"
                 data-twitch-id="${player.twitchId}"
                 id="player-slot-${player.twitchId}"
                 data-player-count="${playerCount}">
                <div class="player-name">${player.username}</div>
                <div class="player-hex-container">
                    <div class="player-hex" style="width: ${hexSize}px; height: ${hexSize}px;">
                        <svg viewBox="0 0 100 100">
                            <polygon points="50,3 97,25 97,75 50,97 3,75 3,25"/>
                        </svg>
                        <img class="player-avatar" src="${player.avatarUrl || '/img/avatars/novice.png'}" alt="${player.username}" onerror="this.src='/img/avatars/novice.png'"/>
                        <div class="success-particles">
                            <div class="success-particle"></div>
                            <div class="success-particle"></div>
                            <div class="success-particle"></div>
                            <div class="success-particle"></div>
                        </div>
                        <!-- 🎯 Éléments animation gain de vie -->
                        <div class="life-glow-ring"></div>
                        <div class="life-glow-ring ring-2"></div>
                        <div class="life-heart-overlay">
                            <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        </div>
                        <div class="life-particles">
                            <div class="particle"></div><div class="particle"></div><div class="particle"></div>
                            <div class="particle"></div><div class="particle"></div><div class="particle"></div>
                            <div class="particle"></div><div class="particle"></div><div class="particle"></div>
                            <div class="particle"></div><div class="particle"></div><div class="particle"></div>
                        </div>
                    </div>
                    <div class="player-lives">${heartsHTML}</div>
                    <div class="player-lock" id="lock-${player.twitchId}">
                        <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" fill="none" stroke="currentColor" stroke-width="2"/></svg>
                    </div>
                </div>
            </div>
        `;
    });
    
    // Calculer l'angle de la mèche vers le joueur actif
    const currentIndex = players.findIndex(p => p.twitchId === currentTwitchId);
    let fuseAngle = 0;
    if (currentIndex !== -1) {
        const angle = (currentIndex / playerCount) * 2 * Math.PI - Math.PI / 2 + offsetAngle;
        fuseAngle = (angle * 180 / Math.PI) + 90;
    }
    
    // Bombe chibi au centre (sans texte)
    const dangerClass = bombanimeState.timeRemaining <= 5 ? (bombanimeState.timeRemaining <= 2 ? 'critical' : 'danger') : '';
    const bombHTML = `
        <div class="bomb-container">
            <div class="bomb ${dangerClass}" style="width: ${bombSize}px; height: ${bombSize}px; --bomb-size: ${bombSize}px;">
                <div class="bomb-fuse-container" id="bombFuseContainer">
                    <div class="bomb-cap"></div>
                    <div class="bomb-fuse"></div>
                    <div class="bomb-spark"></div>
                </div>
                <div class="bomb-body">
                    <div class="bomb-highlight"></div>
                </div>
            </div>
        </div>
    `;
    
    // Le bouton Fermer le lobby est maintenant dans le panneau de logs
    
    container.innerHTML = `
        <div class="players-circle bombanime-appear" style="width: ${circleSize}px; height: ${circleSize}px; position: absolute; top: 42%; left: 50%; transform: translate(-50%, -50%);">
            ${playersHTML}
            ${bombHTML}
        </div>
    `;
    
    // Animer la rotation de la mèche (après insertion dans le DOM)
    requestAnimationFrame(() => {
        const fuseContainer = document.getElementById('bombFuseContainer');
        if (fuseContainer) {
            console.log('🔄 Rotation mèche vers:', fuseAngle, '° (currentTwitchId:', currentTwitchId, ')');
            fuseContainer.style.transform = `rotate(${fuseAngle}deg)`;
        }
    });
}

// Mettre à jour le cercle (nouveau tour)
function updateBombanimeCircle(data) {
    bombanimeState.currentPlayerTwitchId = data.currentPlayerTwitchId;
    bombanimeState.timeRemaining = data.timer;
    
    console.log('🔄 updateBombanimeCircle - Tour de:', data.currentPlayerUsername);
    
    // Redémarrer le timer visuel
    if (bombanimeState.timerInterval) {
        clearInterval(bombanimeState.timerInterval);
    }
    
    // 🆕 Reset immédiat de la couleur de la bombe
    updateBombDangerState();
    
    bombanimeState.timerInterval = setInterval(() => {
        bombanimeState.timeRemaining--;
        
        // Mise à jour légère: juste les classes danger/critical
        updateBombDangerState();
        
        if (bombanimeState.timeRemaining <= 0) {
            clearInterval(bombanimeState.timerInterval);
        }
    }, 1000);
    
    // Mettre à jour le joueur actif et tourner la bombe
    updateActivePlayer(data.currentPlayerTwitchId);
    rotateBombToPlayer(data.currentPlayerTwitchId);
    
    // Clear uniquement le texte tapé du prochain joueur actif (pas les last-answer des autres)
    const nextPlayerSlot = document.getElementById(`player-slot-${data.currentPlayerTwitchId}`);
    if (nextPlayerSlot) {
        const typingEl = nextPlayerSlot.querySelector('.player-typing');
        if (typingEl) {
            typingEl.textContent = '';
            typingEl.classList.remove('has-text', 'last-answer');
        }
    }
}

// Mise à jour légère des classes danger
function updateBombDangerState() {
    const bomb = document.querySelector('.bomb');
    if (!bomb) return;
    
    bomb.classList.remove('danger', 'critical');
    if (bombanimeState.timeRemaining <= 2) {
        bomb.classList.add('critical');
    } else if (bombanimeState.timeRemaining <= 5) {
        bomb.classList.add('danger');
    }
}

// Mettre à jour le joueur actif (sans re-render)
function updateActivePlayer(twitchId) {
    // Enlever active de tous
    document.querySelectorAll('.player-slot.active').forEach(el => el.classList.remove('active'));
    // Ajouter active au nouveau joueur
    const playerSlot = document.getElementById(`player-slot-${twitchId}`);
    if (playerSlot) {
        playerSlot.classList.add('active');
    }
}

// Tourner la bombe vers un joueur avec animation
function rotateBombToPlayer(twitchId) {
    const players = bombanimeState.playersData;
    const playerCount = players.length;
    const currentIndex = players.findIndex(p => p.twitchId === twitchId);
    
    if (currentIndex === -1) return;
    
    const offsetAngle = Math.PI / playerCount;
    const angle = (currentIndex / playerCount) * 2 * Math.PI - Math.PI / 2 + offsetAngle;
    const fuseAngle = (angle * 180 / Math.PI) + 90;
    
    const fuseContainer = document.getElementById('bombFuseContainer');
    if (fuseContainer) {
        fuseContainer.style.transform = `rotate(${fuseAngle}deg)`;
    }
}

// Nom accepté
function onBombanimeNameAccepted(data) {
    bombanimeState.playersData = data.playersData;
    bombanimeState.lastValidName = data.name;
    
    // 🆕 Reset immédiat de la couleur de la bombe (gris)
    const bomb = document.querySelector('.bomb');
    if (bomb) {
        bomb.classList.remove('danger', 'critical');
    }
    
    // 🆕 Animation de succès sur le joueur qui a répondu
    const playerSlot = document.getElementById(`player-slot-${data.playerTwitchId}`);
    if (playerSlot) {
        playerSlot.classList.add('success');
        setTimeout(() => playerSlot.classList.remove('success'), 500);
        
        // Garder la dernière réponse visible (grisée)
        let typingEl = playerSlot.querySelector('.player-typing');
        if (typingEl) {
            typingEl.textContent = data.name.toUpperCase();
            typingEl.classList.remove('has-text');
            typingEl.classList.add('last-answer');
        }
    }
    
    // Tourner la bombe IMMÉDIATEMENT vers le prochain joueur
    if (data.nextPlayerTwitchId) {
        bombanimeState.currentPlayerTwitchId = data.nextPlayerTwitchId;
        updateActivePlayer(data.nextPlayerTwitchId);
        rotateBombToPlayer(data.nextPlayerTwitchId);
        
        // Clear le texte tapé uniquement du prochain joueur actif
        const nextPlayerSlot = document.getElementById(`player-slot-${data.nextPlayerTwitchId}`);
        if (nextPlayerSlot) {
            const nextTypingEl = nextPlayerSlot.querySelector('.player-typing');
            if (nextTypingEl) {
                nextTypingEl.textContent = '';
                nextTypingEl.classList.remove('has-text', 'last-answer');
            }
        }
    }
    
    console.log('✅ BombAnime: Nom accepté -', data.name, 'par', data.playerUsername);
}

// Nom rejeté
function onBombanimeNameRejected(data) {
    const playerSlot = document.getElementById(`player-slot-${data.playerTwitchId}`);
    const lock = document.getElementById(`lock-${data.playerTwitchId}`);
    
    // Animation de shake sur le joueur (pour toutes les erreurs)
    if (playerSlot) {
        playerSlot.classList.add('shake-error');
        setTimeout(() => playerSlot.classList.remove('shake-error'), 400);
    }
    
    // Si c'est "already_used", afficher aussi le cadenas
    if (data.reason === 'already_used' && lock) {
        lock.classList.add('show');
        setTimeout(() => lock.classList.remove('show'), 600);
    }
    
    console.log('❌ BombAnime: Nom rejeté -', data.name, '-', data.reason);
}

// Explosion sur un joueur
function onBombanimeExplosion(data) {
    bombanimeState.playersData = data.playersData;
    
    if (bombanimeState.timerInterval) {
        clearInterval(bombanimeState.timerInterval);
    }
    
    // 🆕 Garder la tentative de réponse du joueur qui explose (grisée)
    const playerSlotForTyping = document.getElementById(`player-slot-${data.playerTwitchId}`);
    if (playerSlotForTyping) {
        const typingEl = playerSlotForTyping.querySelector('.player-typing');
        if (typingEl && typingEl.textContent) {
            // Garder le texte actuel et le griser
            typingEl.classList.remove('has-text');
            typingEl.classList.add('last-answer');
        }
    }
    
    // Délai pour synchroniser avec l'affichage
    setTimeout(() => {
        // Animation d'explosion sur le joueur
        const playerSlot = document.getElementById(`player-slot-${data.playerTwitchId}`);
        if (playerSlot) {
            playerSlot.classList.add('exploding');
            
            // Animer la perte de vie (coeur qui disparaît)
            const lives = playerSlot.querySelectorAll('.player-life:not(.lost)');
            if (lives.length > 0) {
                const lastHeart = lives[lives.length - 1];
                lastHeart.classList.add('lost');
            }
            
            setTimeout(() => {
                playerSlot.classList.remove('exploding');
                
                // Si le joueur est éliminé
                if (data.livesRemaining <= 0) {
                    playerSlot.classList.add('eliminated');
                }
            }, 250);
        }
        
        // Animation de la bombe (shake)
        const bomb = document.querySelector('.bomb');
        if (bomb) {
            bomb.classList.add('exploding');
            setTimeout(() => bomb.classList.remove('exploding'), 250);
        }
    }, 50); // Délai minimal
    
    console.log('💥 BombAnime: Explosion sur', data.playerUsername, '- Vies restantes:', data.livesRemaining);
}

// Alphabet complet
function onBombanimeAlphabetComplete(data) {
    const player = bombanimeState.playersData.find(p => p.twitchId === data.playerTwitchId);
    if (player) {
        player.lives = data.newLives;
    }
    
    // Animer le gain de vie
    const playerSlot = document.getElementById(`player-slot-${data.playerTwitchId}`);
    if (playerSlot) {
        // Réactiver un coeur perdu
        const lostHearts = playerSlot.querySelectorAll('.player-life.lost');
        if (lostHearts.length > 0) {
            lostHearts[0].classList.remove('lost');
        }
        
        // Animation de succès alphabet
        playerSlot.classList.add('alphabet-complete');
        
        // 🎯 Ajouter aussi l'animation de gain de vie (particules + cœur + rings)
        playerSlot.classList.remove('life-gained');
        void playerSlot.offsetWidth; // Force reflow
        playerSlot.classList.add('life-gained');
        
        setTimeout(() => {
            playerSlot.classList.remove('alphabet-complete');
            playerSlot.classList.remove('life-gained');
        }, 1000);
    }
    
    console.log('🎉 BombAnime: Alphabet complet -', data.playerUsername, '+1 vie');
}

// 🎯 Mise à jour des vies après bonus vie extra
function onBombanimePlayerLivesUpdated(data) {
    // Mettre à jour les données locales
    bombanimeState.playersData = data.playersData;
    
    const player = bombanimeState.playersData.find(p => p.twitchId === data.playerTwitchId);
    if (!player) return;
    
    // Animer le gain de vie sur le slot du joueur
    const playerSlot = document.getElementById(`player-slot-${data.playerTwitchId}`);
    if (playerSlot) {
        // Mettre à jour l'affichage des vies
        const livesContainer = playerSlot.querySelector('.player-lives');
        if (livesContainer) {
            const hearts = livesContainer.querySelectorAll('.player-life');
            hearts.forEach((heart, index) => {
                if (index < data.lives) {
                    heart.classList.remove('lost');
                } else {
                    heart.classList.add('lost');
                }
            });
        }
        
        // Animation de gain de vie
        playerSlot.classList.add('life-gained');
        setTimeout(() => playerSlot.classList.remove('life-gained'), 800);
    }
    
    console.log('❤️ BombAnime: Vie bonus utilisée -', data.playerUsername, 'a maintenant', data.lives, 'vies');
}

// Afficher le gagnant BombAnime
function displayBombanimeWinner(data) {
    if (bombanimeState.timerInterval) {
        clearInterval(bombanimeState.timerInterval);
    }
    
    // Clean up admin-player elements
    ['bombanimeAdminChallenges', 'bombanimeAdminAlphabet', 'bombanimeAdminInput', 'bombanimeAdminCloseBtn'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });
    
    // 🆕 Sauvegarder les données du winner pour restauration au refresh
    sessionStorage.setItem('bombanimeWinnerData', JSON.stringify({
        winner: data.winner,
        namesUsed: data.namesUsed,
        duration: data.duration
    }));
    
    // 🆕 Cacher l'écran winner classique s'il est visible
    const classicWinnerOverlay = document.getElementById('winnerOverlay');
    if (classicWinnerOverlay) {
        classicWinnerOverlay.classList.remove('active');
        classicWinnerOverlay.style.display = 'none';
    }
    
    const bombanimeContainer = document.getElementById('bombanimeAdminContainer');
    if (bombanimeContainer) {
        bombanimeContainer.style.display = 'none';
    }
    
    // Créer l'écran winner BombAnime
    let winnerOverlay = document.getElementById('bombanimeWinnerOverlay');
    if (!winnerOverlay) {
        winnerOverlay = document.createElement('div');
        winnerOverlay.id = 'bombanimeWinnerOverlay';
        winnerOverlay.className = 'bombanime-winner-overlay';
        document.body.appendChild(winnerOverlay);
    }
    
    const winnerName = data.winner ? data.winner.username : 'Aucun gagnant';
    
    winnerOverlay.innerHTML = `
        <div class="bombanime-winner-content">
            <div class="bombanime-winner-crown">
                <svg viewBox="0 0 64 64">
                    <path d="M32 8L40 24L56 20L48 40H16L8 20L24 24L32 8Z"/>
                    <rect x="14" y="40" width="36" height="8" rx="2"/>
                </svg>
            </div>
            
            <div class="bombanime-winner-label">VAINQUEUR</div>
            <div class="bombanime-winner-name">${winnerName}</div>
            
            <div class="bombanime-winner-stats">
                <div class="bombanime-winner-stat">
                    <div class="bombanime-winner-stat-value">${data.namesUsed || 0}</div>
                    <div class="bombanime-winner-stat-label">Personnages</div>
                </div>
                <div class="bombanime-winner-stat">
                    <div class="bombanime-winner-stat-value">${formatDuration(data.duration)}</div>
                    <div class="bombanime-winner-stat-label">Temps de jeu</div>
                </div>
            </div>
            
            <button class="bombanime-winner-close-btn" onclick="closeBombanimeWinner()">
                <span>Fermer le lobby</span>
            </button>
        </div>
    `;
    
    // Afficher avec animation séquentielle
    requestAnimationFrame(() => {
        winnerOverlay.classList.add('active');
    });
}

// Fermer l'écran winner BombAnime et fermer le lobby
async function closeBombanimeWinner() {
    // 🆕 Supprimer les données du winner du sessionStorage
    sessionStorage.removeItem('bombanimeWinnerData');
    
    const winnerOverlay = document.getElementById('bombanimeWinnerOverlay');
    if (winnerOverlay) {
        winnerOverlay.classList.remove('active');
        setTimeout(() => {
            winnerOverlay.remove();
        }, 500);
    }
    
    // Cacher le container BombAnime
    const bombanimeContainer = document.getElementById('bombanimeAdminContainer');
    if (bombanimeContainer) bombanimeContainer.style.display = 'none';
    
    // Cacher le bouton fermer BombAnime
    const bombanimeCloseBtn = document.getElementById('bombanimeCloseLobbyBtn');
    if (bombanimeCloseBtn) bombanimeCloseBtn.style.display = 'none';
    
    // Le serveur a déjà désactivé le lobby à la fin de la partie bombanime,
    // donc on retourne simplement à l'idle sans appeler toggle-game
    returnToIdle();
}

// 🆕 Fonction pour fermer le lobby BombAnime et retourner à l'idle
async function closeLobby() {
    const confirmed = await showConfirmModal();
    if (!confirmed) return;
    
    try {
        // Fermer le lobby BombAnime (endpoint spécifique)
        await fetch('/admin/bombanime/close-lobby', {
            method: 'POST',
            credentials: 'same-origin'
        });
        
        // Nettoyer le sessionStorage
        sessionStorage.removeItem('bombanimeWinnerData');
        
        // Cacher l'overlay winner si présent
        const winnerOverlay = document.getElementById('bombanimeWinnerOverlay');
        if (winnerOverlay) {
            winnerOverlay.remove();
        }
        
        // Cacher le container BombAnime
        const bombanimeContainer = document.getElementById('bombanimeAdminContainer');
        if (bombanimeContainer) {
            bombanimeContainer.style.display = 'none';
        }
        
        // Cacher le bouton fermer BombAnime
        const bombanimeCloseBtn = document.getElementById('bombanimeCloseLobbyBtn');
        if (bombanimeCloseBtn) bombanimeCloseBtn.style.display = 'none';
        
        // Cacher le panneau de logs
        const logsPanel = document.getElementById('bombanimeLogsPanel');
        if (logsPanel) logsPanel.style.display = 'none';
        
        // === Nettoyage Collect ===
        hideCollectTable();
        
        // Retour à l'état idle
        returnToIdle();
        
    } catch (error) {
        console.error('❌ Erreur fermeture lobby:', error);
    }
}

// Formater la durée
function formatDuration(seconds) {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
        return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
}

// 🆕 TEMPORAIRE: Ajouter un joueur fictif pour les tests
function addFakePlayer() {
    if (socket && socket.connected) {
        socket.emit('bombanime-add-fake-player');
        console.log('🤖 Demande d\'ajout de joueur fictif envoyée');
    } else {
        console.error('❌ Socket non connecté');
    }
}

// Raccourci clavier: Appuyer sur "F" pour ajouter un fake player (mode BombAnime uniquement)
// DÉSACTIVÉ - Bots désactivés
/*
document.addEventListener('keydown', (e) => {
    // Ignorer si on est dans un input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    // Touche F pour ajouter un fake player
    if (e.key === 'f' || e.key === 'F') {
        if (currentGameMode === 'bombanime') {
            addFakePlayer();
        }
    }
});
*/

// ============================================
// 🎴 COLLECT - Fonctions Admin (Vue Spectateur)
// ============================================

let collectState = {
    playersData: [],
    currentRound: 0,
    selectedStat: null,
    marketCards: []
};

// Afficher la table Collect (admin = spectateur)
// 🎴 État admin Collect
let adminCollectCards = [];
let adminDealStarted = false;
let adminCollectCardPlayed = false;
let _adminCurrentTurnId = null;
let adminCollectPlayedCardData = null;
let adminCollectDragGhost = null;
let adminCollectDragRect = null;


function showCollectTable(data) {
    // Sync handSize from server data (important for reconnection)
    if (data.handSize) collectHandSize = data.handSize;
    
    collectState = {
        playersData: data.playersData || [],
        currentRound: data.currentRound || 0,
        handSize: data.handSize || collectHandSize || 3,
        marketCards: data.marketCards || []
    };
    
    // Détecter si l'admin est joueur (directement depuis les données, sans dépendre de adminInLobby)
    const isAdminPlayer = twitchUser && 
        collectState.playersData.some(p => p.twitchId === twitchUser.id);
    
    // Mettre à jour adminInLobby pour cohérence
    if (isAdminPlayer) adminInLobby = true;
    
    console.log('🎴 showCollectTable appelé avec:', data, 'adminPlayer:', isAdminPlayer);
    
    // Cacher le lobby
    const stateLobby = document.getElementById('stateLobby');
    const stateGame = document.getElementById('stateGame');
    
    if (stateLobby) {
        stateLobby.classList.remove('active');
        stateLobby.style.display = 'none';
    }
    
    if (stateGame) {
        // Cacher tous les éléments du mode quiz classique
        const gameQuestionWrapper = document.getElementById('gameQuestionWrapper');
        const gameMainPanel = document.getElementById('gameMainPanel');
        const characterImageContainer = document.getElementById('characterImageContainer');
        const gameLayout = stateGame.querySelector('.game-layout');
        
        if (gameQuestionWrapper) gameQuestionWrapper.style.display = 'none';
        if (gameMainPanel) gameMainPanel.style.display = 'none';
        if (characterImageContainer) characterImageContainer.style.display = 'none';
        if (gameLayout) gameLayout.style.display = 'none';
        
        // Créer ou afficher le conteneur Collect
        let collectContainer = document.getElementById('collectAdminContainer');
        if (!collectContainer) {
            collectContainer = document.createElement('div');
            collectContainer.id = 'collectAdminContainer';
            collectContainer.className = 'collect-admin-container';
            document.body.appendChild(collectContainer);
        }
        
        collectContainer.style.display = 'flex';
        
        // Créer le bouton Fermer lobby
        let closeBtnEl = collectContainer.querySelector('#collectCloseLobbyBtn');
        if (!closeBtnEl) {
            closeBtnEl = document.createElement('button');
            closeBtnEl.id = 'collectCloseLobbyBtn';
            closeBtnEl.className = 'collect-close-lobby-btn';
            closeBtnEl.textContent = 'Fermer lobby';
            collectContainer.appendChild(closeBtnEl);
        }
        closeBtnEl.onclick = closeLobby;
        
        // Créer la table
        let tableContainer = collectContainer.querySelector('.collect-table-container');
        if (tableContainer) tableContainer.remove();
        
        tableContainer = document.createElement('div');
        tableContainer.className = 'collect-table-container';
        tableContainer.innerHTML = isAdminPlayer ? generateCollectPOVHTML() : generateCollectTableHTML();
        collectContainer.appendChild(tableContainer);

        // Triangle des classes widget
        let triangleWidget = collectContainer.querySelector('.class-triangle-widget');
        if (!triangleWidget) {
            triangleWidget = document.createElement('div');
            triangleWidget.className = 'class-triangle-widget';
            triangleWidget.innerHTML = `<svg viewBox="0 0 200 210" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <filter id="tw-gr"><feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#e74c3c" flood-opacity="0.35"/></filter>
                    <filter id="tw-gg"><feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#f39c12" flood-opacity="0.35"/></filter>
                    <filter id="tw-gb"><feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#3498db" flood-opacity="0.35"/></filter>
                    <marker id="tw-ar" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
                        <path d="M2,1 L8,5 L2,9" fill="none" stroke="#e74c3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>
                    </marker>
                    <marker id="tw-ab" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
                        <path d="M2,1 L8,5 L2,9" fill="none" stroke="#3498db" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>
                    </marker>
                    <marker id="tw-ag" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
                        <path d="M2,1 L8,5 L2,9" fill="none" stroke="#f39c12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>
                    </marker>
                </defs>
                <polygon points="100,30 30,152 170,152" fill="rgba(255,255,255,0.01)" stroke="rgba(255,255,255,0.04)" stroke-width="0.5"/>
                <line x1="114" y1="42" x2="137" y2="86" stroke="#e74c3c" stroke-width="2" opacity="0.5" marker-end="url(#tw-ar)"/>
                <line x1="148" y1="108" x2="160" y2="134" stroke="#e74c3c" stroke-width="1.5" opacity="0.15"/>
                <line x1="156" y1="152" x2="110" y2="152" stroke="#3498db" stroke-width="2" opacity="0.5" marker-end="url(#tw-ab)"/>
                <line x1="90" y1="152" x2="44" y2="152" stroke="#3498db" stroke-width="1.5" opacity="0.15"/>
                <line x1="40" y1="134" x2="56" y2="102" stroke="#f39c12" stroke-width="2" opacity="0.5" marker-end="url(#tw-ag)"/>
                <line x1="66" y1="82" x2="86" y2="42" stroke="#f39c12" stroke-width="1.5" opacity="0.15"/>
                <circle cx="100" cy="30" r="20" fill="#0c0c18" stroke="#e74c3c" stroke-width="2" filter="url(#tw-gr)"/>
                <circle cx="100" cy="30" r="14" fill="rgba(231,76,60,0.08)" stroke="#e74c3c" stroke-width="0.5" opacity="0.4"/>
                <circle cx="30" cy="152" r="20" fill="#0c0c18" stroke="#f39c12" stroke-width="2" filter="url(#tw-gg)"/>
                <circle cx="30" cy="152" r="14" fill="rgba(243,156,18,0.08)" stroke="#f39c12" stroke-width="0.5" opacity="0.4"/>
                <circle cx="170" cy="152" r="20" fill="#0c0c18" stroke="#3498db" stroke-width="2" filter="url(#tw-gb)"/>
                <circle cx="170" cy="152" r="14" fill="rgba(52,152,219,0.08)" stroke="#3498db" stroke-width="0.5" opacity="0.4"/>
                <g transform="translate(88,18) scale(0.95)" fill="#e74c3c">
                    <path d="M6.92 5H5L14 14L15 13.06L6.92 5M19.06 3C18.44 3 17.82 3.24 17.35 3.71L13.71 7.35L16.65 10.29L20.29 6.65C21.24 5.7 21.24 4.14 20.29 3.19C19.82 2.72 19.44 3 19.06 3M7.06 18.34L9.06 16.34L7.66 14.94L5.66 16.94C5.16 17.44 5.16 18.25 5.66 18.75C6.16 19.25 6.97 19.25 7.47 18.75L7.06 18.34Z"/>
                </g>
                <g transform="translate(18,140) scale(0.95)" fill="#f39c12">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </g>
                <g transform="translate(158,140) scale(0.95)" fill="#3498db">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                </g>
                <text x="100" y="2" text-anchor="middle" fill="#e74c3c" font-family="Orbitron,sans-serif" font-size="9" font-weight="700" letter-spacing="2">ASSAUT</text>
                <text x="30" y="186" text-anchor="middle" fill="#f39c12" font-family="Orbitron,sans-serif" font-size="9" font-weight="700" letter-spacing="2">ORACLE</text>
                <text x="170" y="186" text-anchor="middle" fill="#3498db" font-family="Orbitron,sans-serif" font-size="9" font-weight="700" letter-spacing="2">MIRAGE</text>
            </svg>`;
            collectContainer.appendChild(triangleWidget);
        }
        
        // Mettre à jour les positions des joueurs
        if (isAdminPlayer) {
            updateCollectPOVPositions();
            // Si un deal est en cours, re-render avec pre-deal pour éviter le flash
            renderAdminPOVCards(adminDealStarted);
        } else {
            updateCollectPlayerPositions();
        }
        updateCollectStars();
        
        // 🆕 Créer le slot carte central DANS le center-zone
        const collectTable = collectContainer.querySelector('.collect-table');
        if (collectTable) {
            const centerZone = collectTable.querySelector('.collect-center-zone');
            if (centerZone) {
                let centerSlot = centerZone.querySelector('.collect-center-slot');
                if (!centerSlot) {
                    centerSlot = document.createElement('div');
                    centerSlot.className = 'collect-center-slot';
                    centerSlot.id = 'collectCenterSlot';
                    centerSlot.innerHTML = `<div class="center-slot-inner"></div>`;
                    centerZone.appendChild(centerSlot);
                }
            }
            let timerEl = collectTable.querySelector(".collect-timer");
            if (timerEl) timerEl.remove(); // Old timer cleaned up
        }
        
        // 🎴 Deck de pioche (droite) — seulement si admin est joueur
        if (isAdminPlayer) {
            let deckZone = document.getElementById('adminCollectDeck');
            if (!deckZone) {
                deckZone = document.createElement('div');
                deckZone.id = 'adminCollectDeck';
                deckZone.className = 'collect-deck-zone';
                deckZone.innerHTML = `
                    <div class="collect-deck-card"><span class="collect-deck-sm">SM</span></div>
                    <div class="collect-deck-card"></div>
                    <div class="collect-deck-card"></div>
                    <div class="collect-deck-card"></div>
                    <div class="collect-deck-card"></div>
                    <div class="collect-deck-card"></div>
                    <div class="collect-deck-glow"></div>
                    <div class="collect-deck-wave"></div>
                    <div class="collect-deck-wave"></div>
                    <div class="collect-deck-wave"></div>
                    <div class="deck-hover-ripple"></div>
                    <div class="deck-hover-ripple delay"></div>
                `;
                collectContainer.appendChild(deckZone);
                
                // Timer du tour (séparé du deck pour que position:fixed fonctionne)
                let timerDiv = document.getElementById('collectTimer');
                if (!timerDiv) {
                    timerDiv = document.createElement('div');
                    timerDiv.id = 'collectTimer';
                    timerDiv.className = 'collect-deck-timer';
                    timerDiv.style.display = 'none';
                    timerDiv.innerHTML = `
                        <svg class="timer-ring" viewBox="0 0 54 54">
                            <circle class="timer-ring-bg" cx="27" cy="27" r="23" />
                            <circle class="timer-ring-progress" id="collectTimerRing" cx="27" cy="27" r="23" />
                        </svg>
                        <span class="timer-number" id="collectTimerNumber">15</span>
                    `;
                    collectContainer.appendChild(timerDiv);
                }

                // Click handler
                deckZone.addEventListener('pointerdown', () => {
                    if (deckZone._drawBusy) return;
                    
                    // Déjà joué/défaussé ce tour ?
                    if (adminCollectCardPlayed) return;
                    
                    // Main pleine ?
                    const handSize = collectHandSize || 3;
                    if (adminCollectCards.length >= handSize) {
                        if (deckZone._fullBusy) return;
                        deckZone._fullBusy = true;
                        deckZone.classList.add('deck-full-shake');
                        setTimeout(() => {
                            deckZone.classList.remove('deck-full-shake');
                            deckZone._fullBusy = false;
                        }, 1200);
                        return;
                    }
                    
                    if (!deckZone.classList.contains('can-draw')) return;
                    deckZone._drawBusy = true;

                    // Emit au serveur (l'animation est gérée par animateCardToHand au retour)
                    if (twitchUser) {
                        socket.emit('collect-draw-card', { twitchId: twitchUser.id });
                    }
                    deckZone.classList.remove('can-draw');

                    setTimeout(() => { deckZone._drawBusy = false; }, 1200);
                });
            }
        }
        
        // Preview carte (dans body, hors de tout conteneur transformé)
        if (isAdminPlayer) {
            let previewEl = document.getElementById('adminCardPreview');
            if (!previewEl) {
                previewEl = document.createElement('div');
                previewEl.id = 'adminCardPreview';
                previewEl.className = 'collect-card-preview';
                previewEl.innerHTML = `
                    <div class="preview-card" id="adminPreviewCard">
                        <div class="preview-image" id="adminPreviewImage">
                            <img id="adminPreviewImg" src="" alt="">
                        </div>
                        <div class="preview-fusion-badge" id="adminPreviewFusionBadge" style="display:none;">
                            <div class="fusion-badge-preview" id="adminFusionBadgeCircle">
                                <div class="fusion-badge-particles">
                                    <span></span><span></span><span></span><span></span><span></span><span></span>
                                </div>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l7.07 17.32M20 4l-7.07 17.32M3.5 9h17M7 16.5h10"/></svg>
                            </div>
                        </div>
                        <div class="preview-top-badges">
                            <div class="class-badge-small" id="adminPreviewClassBadge">
                                <span id="adminPreviewClassIcon"></span>
                            </div>
                            <div class="prota-badge" id="adminPreviewProtaBadge" style="display:none;">
                                <svg viewBox="0 0 24 24"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z"/></svg>
                            </div>
                        </div>
                        <div class="preview-info">
                            <div class="preview-name" id="adminPreviewName"></div>
                            <div class="preview-anime" id="adminPreviewAnime"></div>
                            <div class="preview-separator-line"><span class="sep-diamond"></span></div>
                        </div>
                    </div>
                `;
                document.body.appendChild(previewEl);
            }
        }
        
        // Activer l'écran
        stateGame.classList.add('active');
        stateGame.style.display = 'flex';
        stateGame.style.opacity = '1';
        stateGame.style.pointerEvents = '';
        
        // 💾 Restaurer le timer depuis sessionStorage immédiatement après création du DOM
        setTimeout(() => _restoreAdminTimerFromSession(), 50);
    }
}

// 🆕 Afficher l'overlay d'annonce de round avec clash de cartes

let _adminCollectTimerInterval = null;
let _adminCollectTimerDuration = null;
let adminCollectTimerExpired = sessionStorage.getItem('adminCollectTimerExpired') === 'true';
let _adminCollectTimerEndMs = null;
function startAdminCollectTimer(s) {
    stopAdminCollectTimer(true);
    s = s || 15;
    const t = document.getElementById('collectTimer'), n = document.getElementById('collectTimerNumber'), ring = document.getElementById('collectTimerRing');
    if (!t || !n) return;
    _adminCollectTimerEndMs = Date.now() + s * 1000;
    _adminCollectTimerDuration = s;
    // 💾 Sauvegarder pour restore après refresh
    sessionStorage.setItem('adminCollectTimerEndMs', _adminCollectTimerEndMs.toString());
    sessionStorage.setItem('adminCollectTimerDuration', _adminCollectTimerDuration.toString());
    sessionStorage.removeItem('adminCollectTimerExpired');
    adminCollectTimerExpired = false;
    n.textContent = s; t.style.display = ''; t.classList.remove('fade-out');
    if (ring) { ring.style.strokeDashoffset = '0'; }
    // 🔓 Unlock cards
    const myCards = document.getElementById('adminPovCards');
    if (myCards) myCards.classList.remove('cards-locked');
    _adminCollectTimerInterval = setInterval(() => {
        _checkAdminCollectTimerTick();
    }, 100);
}

// 🔒 Extracted tick so it can be called from visibilitychange too
function _checkAdminCollectTimerTick() {
    if (!_adminCollectTimerEndMs) return;
    const n = document.getElementById('collectTimerNumber');
    const ring = document.getElementById('collectTimerRing');
    const r = Math.max(0, Math.ceil((_adminCollectTimerEndMs - Date.now()) / 1000));
    const elapsed = (_adminCollectTimerDuration || 15) - ((_adminCollectTimerEndMs - Date.now()) / 1000);
    const progress = Math.min(1, elapsed / (_adminCollectTimerDuration || 15));
    if (n) n.textContent = r;
    if (ring) ring.style.strokeDashoffset = (progress * 144.51).toString();
    if (r <= 0) {
        clearInterval(_adminCollectTimerInterval); _adminCollectTimerInterval = null; _adminCollectTimerEndMs = null;
        _applyAdminTimerExpired();
    }
}

function _applyAdminTimerExpired() {
    if (adminCollectTimerExpired) return; // Already applied
    adminCollectTimerExpired = true;
    sessionStorage.setItem('adminCollectTimerExpired', 'true');
    sessionStorage.removeItem('adminCollectTimerEndMs');
    sessionStorage.removeItem('adminCollectTimerDuration');
    const timerFade = document.getElementById('collectTimer');
    if (timerFade) { timerFade.classList.add('fade-out'); }
    // Cancel any active drag
    const ghost = document.querySelector('.drag-ghost');
    if (ghost) { ghost.remove(); }
    if (window._adminBoundDragMove) { document.removeEventListener('pointermove', window._adminBoundDragMove); }
    if (window._adminBoundDragEnd) { document.removeEventListener('pointerup', window._adminBoundDragEnd); }
    // Clean up swap highlights
    document.querySelectorAll('.market-card.swap-hover').forEach(el => el.classList.remove('swap-hover'));
    // Gray out admin cards + lock
    document.querySelectorAll('#adminPovCards .collect-card.large').forEach(el => el.classList.add('card-played-out'));
    const myCards = document.getElementById('adminPovCards');
    if (myCards) myCards.classList.add('cards-locked');
}
function stopAdminCollectTimer(hideDisplay) {
    if (_adminCollectTimerInterval) { clearInterval(_adminCollectTimerInterval); _adminCollectTimerInterval = null; }
    _adminCollectTimerEndMs = null;
    if (hideDisplay) { const t = document.getElementById('collectTimer'); if (t) { t.style.display = 'none'; t.classList.remove('visible','fade-out'); } }
}

// 💾 Restaurer timer admin depuis sessionStorage après refresh
function _restoreAdminTimerFromSession() {
    if (_adminCollectTimerInterval) return; // Timer déjà actif
    const savedEndMs = parseInt(sessionStorage.getItem('adminCollectTimerEndMs') || '0');
    const savedDuration = parseInt(sessionStorage.getItem('adminCollectTimerDuration') || '15');
    const expired = sessionStorage.getItem('adminCollectTimerExpired') === 'true';
    
    if (savedEndMs && savedEndMs > Date.now() + 500) {
        const remainingSec = Math.ceil((savedEndMs - Date.now()) / 1000);
        console.log('⏱️ Admin: timer restauré depuis session:', remainingSec, 's');
        _adminCollectTimerDuration = savedDuration;
        // Afficher slot + deck si pas déjà visible
        const slot = document.getElementById('collectCenterSlot');
        if (slot) slot.classList.add('visible');
        const deckEl = document.getElementById('adminCollectDeck');
        if (deckEl) {
            deckEl.classList.add('deck-visible');
            deckEl.classList.add('my-turn');
        }
        startAdminCollectTimer(remainingSec);
    } else if (expired) {
        // Timer expiré → garder cartes lockées
        const myCards = document.getElementById('adminPovCards');
        if (myCards) myCards.classList.add('cards-locked');
    }
}

function showCollectRoundOverlay(round, stat, statName) {
    const centerSlot = document.getElementById('collectCenterSlot');
    if (centerSlot) {
        centerSlot.classList.remove('visible');
        centerSlot.classList.remove('has-card');
        const inner = centerSlot.querySelector('.center-slot-inner');
        if (inner) inner.innerHTML = '';
        const oldIcon = centerSlot.querySelector('.slot-stat-icon');
        if (oldIcon) oldIcon.remove();
    }
    
    collectState.currentRound = round;
    collectState.selectedStat = stat;
    
    // Reset choose indicators from previous round
    document.querySelectorAll('.collect-choose-indicator').forEach(el => {
        el.classList.remove('active', 'visible');
    });
    document.querySelectorAll('.choose-ring-progress').forEach(r => r.style.strokeDashoffset = '91.1');
    _adminCurrentTurnId = null;
    if (window._adminTurnRingInterval) { clearInterval(window._adminTurnRingInterval); window._adminTurnRingInterval = null; }
    // Reset drag state
    adminCollectCardPlayed = false;
    adminCollectTimerExpired = false;
    sessionStorage.removeItem('adminCollectTimerExpired');
    sessionStorage.removeItem('adminCollectWasDiscard');
    adminCollectPlayedCardData = null;
    stopAdminCollectTimer();
    
    // Retirer les classes dim des cartes + lock them initially
    document.querySelectorAll('#adminPovCards .collect-card.card-played-out').forEach(el => {
        el.classList.remove('card-played-out');
    });
    // 🔒 Lock cards until timer starts
    const myCardsContainer = document.getElementById('adminPovCards');
    if (myCardsContainer) myCardsContainer.classList.add('cards-locked');
    
    // Afficher le slot directement (pas d'overlay) + icône stat
    setTimeout(() => {
        const slot = document.getElementById('collectCenterSlot');
        if (slot) {
            slot.classList.add('visible');
            const deckEl = document.getElementById('adminCollectDeck');
            if (deckEl) deckEl.classList.add('deck-visible');
            
            // Ajouter l'icône carte au slot
            let iconEl = slot.querySelector('.slot-stat-icon');
            if (!iconEl) {
                iconEl = document.createElement('div');
                iconEl.className = 'slot-stat-icon';
                slot.appendChild(iconEl);
            }
            iconEl.innerHTML = `<svg viewBox="0 0 24 32" fill="none" width="24" height="32"><rect x="2" y="2" width="20" height="28" rx="3" stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.1"/><path d="M12 9l1.76 3.57 3.94.57-2.85 2.78.67 3.93L12 17.77l-3.52 1.85.67-3.93-2.85-2.78 3.94-.57L12 9z" fill="currentColor" fill-opacity="0.5"/></svg>`;
            iconEl.classList.remove('show');
            requestAnimationFrame(() => {
                requestAnimationFrame(() => iconEl.classList.add('show'));
            });
            
            // 🔒 Cartes restent lockées, le serveur enverra collect-turn-start
            setTimeout(() => {
                document.querySelectorAll('.collect-choose-indicator').forEach(el => el.classList.add('visible'));
                // Timer + unlock géré par collect-turn-start du serveur
                console.log('🎴 En attente du tour (collect-turn-start)...');
            }, 1000);
        }
    }, 1000);
}

// Générer le HTML de la table Collect
function generateCollectTableHTML() {
    return `
        <div class="collect-table">
            <div class="collect-table-rail"></div>
            <div class="collect-table-surface"></div>
            
            <div class="collect-table-logo">
                <div class="logo-main">COLLECT</div>
                <div class="logo-sub">ShonenMaster</div>
            </div>
            
            <!-- Center Zone: Market + Slot -->
            <div class="collect-center-zone" id="collectCenterZone">
                <div class="collect-market" id="collectMarket"></div>
            </div>
            
            <!-- Player Seats -->
            ${[1,2,3,4,5,6,7,8,9,10].map(i => `
                <div class="collect-player-seat hidden" id="collectSeat${i}">
                    <div class="collect-player-block">
                        <div class="collect-player-cards${collectHandSize === 5 ? ' hand-5' : ''}">
                            ${"<div class=\"collect-player-card-small\"></div>".repeat(collectHandSize || 3)}
                        </div>
                        <div class="collect-choose-indicator"><svg class="choose-ring" viewBox="0 0 34 34"><circle class="choose-ring-bg" cx="17" cy="17" r="14.5" /><circle class="choose-ring-progress" cx="17" cy="17" r="14.5" /></svg><img src="choose.png" alt="choose"></div>
                        <div class="collect-player-ribbon">
                            <div class="collect-stars">
                                ${'<svg class="collect-star" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'.repeat(collectHandSize || 3)}
                            </div>
                        </div>
                        <div class="collect-player-name-tag">
                            <div class="collect-player-name">Player ${i}</div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Calculer les positions des joueurs sur la table (cercle complet comme prototype V6)
function calculateCollectPositions(numPlayers) {
    const positions = [];
    const radiusX = 50;
    const radiusY = 50;
    const centerX = 50;
    const centerY = 50;
    const startAngle = 270; // Admin: premier joueur en haut
    
    for (let i = 0; i < numPlayers; i++) {
        const angle = startAngle + (i * 360 / numPlayers);
        const angleRad = angle * Math.PI / 180;
        
        const x = centerX + radiusX * Math.cos(angleRad);
        const y = centerY + radiusY * Math.sin(angleRad);
        
        positions.push({ left: `${x}%`, top: `${y}%` });
    }
    
    return positions;
}

// Mettre à jour les positions des joueurs
function updateCollectPlayerPositions() {
    const numPlayers = collectState.playersData.length;
    const positions = calculateCollectPositions(numPlayers);
    
    // Mêmes scales que le prototype V6
    const scaleByCount = {
        2: 1.35, 3: 1.3, 4: 1.25, 5: 1.3, 6: 1.25,
        7: 1.2, 8: 1.15, 9: 1.1, 10: 1.05
    };
    const scale = scaleByCount[numPlayers] || 1.0;
    
    // Cacher tous les sièges d'abord
    for (let i = 1; i <= 10; i++) {
        const seat = document.getElementById(`collectSeat${i}`);
        if (seat) {
            seat.classList.add('hidden');
            seat.style.cssText = '';
        }
    }
    
    // Afficher et positionner les joueurs
    collectState.playersData.forEach((player, index) => {
        const seat = document.getElementById(`collectSeat${index + 1}`);
        if (seat && positions[index]) {
            seat.classList.remove('hidden');
            seat.dataset.twitchId = player.twitchId;
            seat.style.left = positions[index].left;
            seat.style.top = positions[index].top;
            seat.style.transform = `translate(-50%, -50%) scale(${scale})`;
            
            // Mettre à jour le nom
            const nameEl = seat.querySelector('.collect-player-name');
            
            if (nameEl) nameEl.textContent = player.username || 'Player';
            
            // Mettre à jour le nombre de cartes si disponible
            if (player.cardCount !== undefined) {
                const cardsContainer = seat.querySelector('.collect-player-cards');
                if (cardsContainer) {
                    const currentCount = cardsContainer.querySelectorAll('.collect-player-card-small').length;
                    if (currentCount !== player.cardCount) {
                        cardsContainer.innerHTML = '<div class="collect-player-card-small"></div>'.repeat(player.cardCount);
                    }
                }
            }
            
            // État actif
            seat.classList.toggle('active', player.isCurrentPlayer);

        }
    });
}

// Mettre à jour la table Collect
function updateCollectTable(data) {
    if (data.playersData) collectState.playersData = data.playersData;
    
    const isAdminPlayer = twitchUser && 
        collectState.playersData.some(p => p.twitchId === twitchUser.id);
    
    if (isAdminPlayer) {
        updateCollectPOVPositions();
    } else {
        updateCollectPlayerPositions();
    }
    updateCollectStars();
}

// ⭐ Restaurer les étoiles won sur tous les sièges
function updateCollectStars() {
    if (!collectState.playersData || !collectState.playersData.length) return;
    
    // Other players seats (by data-twitch-id)
    collectState.playersData.forEach(p => {
        const isMe = twitchUser && p.twitchId === twitchUser.id;
        let seatEl;
        if (isMe) {
            seatEl = document.getElementById('collectAdminPovSeat');
        } else {
            seatEl = document.querySelector(`.collect-player-seat[data-twitch-id="${p.twitchId}"]`);
        }
        if (!seatEl) return;
        
        const stars = seatEl.querySelectorAll('.collect-star');
        const wins = p.wins || 0;
        stars.forEach((star, i) => {
            if (i < wins) {
                star.classList.add('won');
            } else {
                star.classList.remove('won');
            }
        });
    });
}

// Ajouter un log Collect
function addCollectLog(message, type = 'info') {
    const logsList = document.getElementById('collectLogsList');
    if (!logsList) return;
    
    const entry = document.createElement('div');
    entry.className = `collect-log-entry ${type}`;
    entry.textContent = message;
    
    logsList.insertBefore(entry, logsList.firstChild);
    
    // Limiter à 50 entrées
    while (logsList.children.length > 50) {
        logsList.removeChild(logsList.lastChild);
    }
}

// Afficher le gagnant Collect
function displayCollectWinner(data) {
    console.log('🏆 Affichage gagnant Collect:', data);
    // TODO: Implémenter l'écran de victoire
    
    // Pour l'instant, retour à l'idle
    setTimeout(() => {
        hideCollectTable();
        returnToIdle();
    }, 5000);
}

// Cacher la table Collect
function hideCollectTable() {
    const collectContainer = document.getElementById('collectAdminContainer');
    if (collectContainer) {
        collectContainer.style.display = 'none';
    }
    // Reset deck
    const deckEl = document.getElementById('adminCollectDeck');
    if (deckEl) {
        deckEl.classList.remove('can-draw');
        deckEl.classList.remove('deck-visible');
    }
    // Reset admin cards
    adminCollectCards = [];
    adminDealStarted = false;
    // Reset admin lobby state
    adminInLobby = false;
}

// ============================================
// 🎴 ADMIN POV MODE (quand admin est joueur)
// ============================================

function getAdminCardImage(card) {
    if (!card || !card.name) return '';
    return `${card.name.toLowerCase().replace(/\s+/g, '')}.png`;
}

function getAdminClassIcon(cardClass) {
    const icons = {
        assaut: '<svg viewBox="0 0 24 24"><path d="M6.92 5H5L14 14L15 13.06L6.92 5M19.06 3C18.44 3 17.82 3.24 17.35 3.71L13.71 7.35L16.65 10.29L20.29 6.65C21.24 5.7 21.24 4.14 20.29 3.19C19.82 2.72 19.44 3 19.06 3M7.06 18.34L9.06 16.34L7.66 14.94L5.66 16.94C5.16 17.44 5.16 18.25 5.66 18.75C6.16 19.25 6.97 19.25 7.47 18.75L7.06 18.34Z"/></svg>',
        oracle: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
        mirage: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>'
    };
    return icons[cardClass] || '';
}

function buildCenterCardHTML(card) {
    if (card.isFused && card.fusedCards && card.fusedCards.length > 1) {
        const count = card.fusedCards.length;
        const imgsHtml = card.fusedCards.map(fc => 
            `<img src="${getAdminCardImage(fc)}" alt="${fc.name}">`
        ).join('');
        return `<div class="center-played-card fused-card">
            <div class="center-fused-glow"></div>
            <div class="fused-img-wrap fused-x${count}">${imgsHtml}</div>
            <div class="fusion-badge-slot ${count >= 3 ? 'x3' : ''}">
                <div class="fusion-badge-particles"><span></span><span></span><span></span><span></span><span></span><span></span></div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l7.07 17.32M20 4l-7.07 17.32M3.5 9h17M7 16.5h10"/></svg>
            </div>
        </div>`;
    }
    return `<div class="center-played-card">
        <div class="card-image">
            <img src="${getAdminCardImage(card)}" alt="${card.name}">
        </div>
        <div class="class-badge ${card.class}">
            <span class="class-icon">${getAdminClassIcon(card.class)}</span>
        </div>
    </div>`;
}

function adminFormatName(name) {
    if (!name) return '';
    const exceptions = { 'JoJo': 'JoJo', 'Jojo': 'JoJo', 'DragonBallZ': 'Dragon Ball', 'DragonBall': 'Dragon Ball', 'Dbz': 'Dragon Ball' };
    if (exceptions[name]) return exceptions[name];
    return name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}

// 🏪 Afficher les cartes du marché
function renderMarketCards(cards, animated = true) {
    const market = document.getElementById('collectMarket');
    if (!market || !cards || cards.length === 0) return;
    
    market.innerHTML = cards.map((card, i) => `
        <div class="market-card ${animated ? 'market-hidden' : 'revealed'}" data-market-index="${i}" data-anime="${card.anime || ''}">
            <img src="${getAdminCardImage(card)}" alt="${card.name}">
            <div class="class-badge ${card.class}">
                <span class="class-icon">${getAdminClassIcon(card.class)}</span>
            </div>
            ${card.isProtagonist ? '<div class="prota-badge market-prota"><svg viewBox="0 0 24 24"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z"/></svg></div>' : ''}
        </div>
    `).join('');
    
    market.querySelectorAll('.market-card').forEach(cardEl => {
        const idx = parseInt(cardEl.dataset.marketIndex);
        const card = cards[idx];
        if (!card) return;
        cardEl.addEventListener('mouseenter', () => showAdminCardPreview(card));
        cardEl.addEventListener('mouseleave', () => hideAdminCardPreview());
    });
    
    if (animated) {
        market.querySelectorAll('.market-card').forEach((cardEl, i) => {
            setTimeout(() => {
                cardEl.classList.remove('market-hidden');
                cardEl.classList.add('revealed');
            }, 150 + i * 180);
        });
    }
    
    // Appliquer l'effet doré sur les cartes qui matchent la main
    setTimeout(() => updateMarketMatchGlow(), animated ? 800 : 100);
}

// 🎴 Met à jour l'effet doré des cartes marché qui matchent la main admin
function updateMarketMatchGlow() {
    const market = document.getElementById('collectMarket');
    if (!market) return;
    
    // Récupérer les animes en main depuis le tableau (pas le DOM qui peut être désynchronisé)
    const myAnimes = new Set();
    adminCollectCards.forEach(card => {
        if (card && card.anime) myAnimes.add(card.anime);
    });
    
    market.querySelectorAll('.market-card').forEach(cardEl => {
        const anime = cardEl.dataset.anime;
        const matches = anime && myAnimes.has(anime);
        
        if (matches && !cardEl.classList.contains('same-anime-match')) {
            cardEl.classList.add('same-anime-match');
            if (!cardEl.querySelector('.sa-glow-container')) {
                cardEl.insertAdjacentHTML('beforeend', `
                    <div class="sa-glow-container">
                        <div class="sa-smoke s1"></div>
                        <div class="sa-smoke s2"></div>
                        <div class="sa-smoke s3"></div>
                    </div>
                    <div class="sa-particles">
                        <div class="sa-particle sm"></div>
                        <div class="sa-particle md"></div>
                        <div class="sa-particle sm"></div>
                        <div class="sa-particle lg"></div>
                        <div class="sa-particle sm"></div>
                        <div class="sa-particle md"></div>
                    </div>
                `);
            }
        } else if (!matches && cardEl.classList.contains('same-anime-match')) {
            cardEl.classList.remove('same-anime-match');
            const glow = cardEl.querySelector('.sa-glow-container');
            const particles = cardEl.querySelector('.sa-particles');
            if (glow) glow.remove();
            if (particles) particles.remove();
        }
    });
}

// Ordonner les autres joueurs circulairement à partir du POV (identique à app.js)
function getOrderedOtherPlayersAdmin(playersData) {
    if (!playersData || !playersData.length) return [];
    if (!twitchUser) return playersData;
    const myIndex = playersData.findIndex(p => p.twitchId === twitchUser.id);
    if (myIndex === -1) return playersData.filter(p => p.twitchId !== twitchUser.id);
    const total = playersData.length;
    const ordered = [];
    for (let i = 1; i < total; i++) {
        const idx = (myIndex + i) % total;
        ordered.push(playersData[idx]);
    }
    return ordered;
}

// Générer le HTML POV (admin en bas, autres autour)
function generateCollectPOVHTML() {
    const otherPlayers = getOrderedOtherPlayersAdmin(collectState.playersData);
    
    return `
        <div class="collect-table">
            <div class="collect-table-rail"></div>
            <div class="collect-table-surface"></div>
            
            <div class="collect-table-logo">
                <div class="logo-main">COLLECT</div>
                <div class="logo-sub">ShonenMaster</div>
            </div>
            
            <!-- Center Zone: Market + Slot -->
            <div class="collect-center-zone" id="collectCenterZone">
                <div class="collect-market" id="collectMarket"></div>
            </div>
            
            <!-- Autres joueurs (sièges autour) -->
            ${otherPlayers.map((p, i) => `
                <div class="collect-player-seat" id="collectPovSeat${i}" 
                     data-twitch-id="${p.twitchId}">
                    <div class="collect-player-block">
                        <div class="collect-player-cards${collectHandSize === 5 ? ' hand-5' : ''}">
                            ${"<div class=\"collect-player-card-small\"></div>".repeat(p.cardCount !== undefined ? p.cardCount : (collectHandSize || 3))}
                        </div>
                        <div class="collect-choose-indicator"><svg class="choose-ring" viewBox="0 0 34 34"><circle class="choose-ring-bg" cx="17" cy="17" r="14.5" /><circle class="choose-ring-progress" cx="17" cy="17" r="14.5" /></svg><img src="choose.png" alt="choose"></div>
                        <div class="collect-player-ribbon">
                            <div class="collect-stars">
                                ${'<svg class="collect-star" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'.repeat(collectHandSize || 3)}
                            </div>
                        </div>
                        <div class="collect-player-name-tag">
                            <div class="collect-player-name">${p.username || 'Player'}</div>
                        </div>
                    </div>
                </div>
            `).join('')}
            
            <!-- Mon siège POV (en bas) -->
            <div class="collect-player-seat me" 
                 id="collectAdminPovSeat">
                <div class="collect-my-cards cards-locked${collectHandSize === 5 ? ' hand-5' : ''}" id="adminPovCards">
                    <!-- Rempli dynamiquement -->
                </div>
                <div class="collect-player-block">
                    <div class="collect-player-ribbon">
                        <div class="collect-stars">
                            ${'<svg class="collect-star" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'.repeat(collectHandSize || 3)}
                        </div>
                    </div>
                    <div class="collect-player-name-tag">
                        <div class="collect-player-name">Vous</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Positionner les autres joueurs en cercle (POV = bottom)
function updateCollectPOVPositions() {
    const otherPlayers = getOrderedOtherPlayersAdmin(collectState.playersData);
    const totalPlayers = otherPlayers.length + 1;
    
    // Scales identiques au joueur (app.js)
    const scaleByCount = {
        2: 1.35, 3: 1.3, 4: 1.25, 5: 1.3, 6: 1.25,
        7: 1.2, 8: 1.15, 9: 1.1, 10: 1.05
    };
    const scale = scaleByCount[totalPlayers] || 1.0;
    
    const radiusX = 50;
    const radiusY = 50;
    const centerX = 50;
    const centerY = 50;
    const startAngle = 90; // POV en bas
    
    otherPlayers.forEach((player, index) => {
        const seat = document.getElementById(`collectPovSeat${index}`);
        if (!seat) return;
        
        const seatIndex = index + 1;
        const angle = startAngle + (seatIndex * 360 / totalPlayers);
        const angleRad = angle * Math.PI / 180;
        
        const x = centerX + radiusX * Math.cos(angleRad);
        const y = centerY + radiusY * Math.sin(angleRad);
        
        seat.style.left = `${x}%`;
        seat.style.top = `${y}%`;
        seat.style.transform = `translate(-50%, -50%) scale(${scale})`;
        
        seat.classList.toggle('active', player.isCurrentPlayer);
    });
    
    // Scale POV seat
    const povSeat = document.getElementById('collectAdminPovSeat');
    if (povSeat) {
        povSeat.style.setProperty('--pov-scale', scale);
    }
}

// Rendre les cartes de l'admin dans le POV
function renderAdminPOVCards(isDealing = false) {
    const container = document.getElementById('adminPovCards');
    if (!container) return;
    
    // Détecter les animes avec 2+ cartes (bonus same-anime)
    const animeCounts = {};
    adminCollectCards.forEach(c => { if (c && c.anime) animeCounts[c.anime] = (animeCounts[c.anime] || 0) + 1; });
    
    const sameAnimeParticles = `
        <div class="sa-glow-container">
            <div class="sa-smoke s1"></div>
            <div class="sa-smoke s2"></div>
            <div class="sa-smoke s3"></div>
            <div class="sa-smoke s4"></div>
            <div class="sa-smoke s5"></div>
            <div class="sa-corner-glow tl"></div>
            <div class="sa-corner-glow tr"></div>
            <div class="sa-corner-glow bl"></div>
            <div class="sa-corner-glow br"></div>
        </div>
        <div class="sa-particles">
            <div class="sa-particle md"></div>
            <div class="sa-particle sm"></div>
            <div class="sa-particle lg"></div>
            <div class="sa-particle sm"></div>
            <div class="sa-particle md"></div>
            <div class="sa-particle lg"></div>
            <div class="sa-particle sm"></div>
            <div class="sa-particle md"></div>
            <div class="sa-particle lg"></div>
            <div class="sa-particle sm"></div>
            <div class="sa-particle sm"></div>
            <div class="sa-particle sm"></div>
            <div class="sa-particle sm"></div>
        </div>`;
    
    container.innerHTML = adminCollectCards.map((card, i) => {
        const hasBonus = card && card.anime && animeCounts[card.anime] >= 2 && !card.isFused;
        // Calculer la stat moyenne ou utiliser powerLevel comme fallback
        const avgStat = card.stats 
            ? Math.round((card.stats.atk + card.stats.int + card.stats.spd + card.stats.pwr) / 4) 
            : (card.powerLevel || '?');
        
        // Fused card rendering
        if (card.isFused) {
            const count = card.fusedCards.length;
            const fusedImgs = card.fusedCards.map(fc => 
                `<img src="${getAdminCardImage(fc)}" alt="${fc.name}">`
            ).join('');
            return `
            <div class="collect-card large fused-card ${isDealing ? 'pre-deal' : ''}"
                 data-card-index="${i}" data-anime="${card.anime || ''}">
                ${sameAnimeParticles}
                <div class="fused-img-wrap fused-x${count}">
                    ${fusedImgs}
                </div>
                <div class="card-shimmer"></div>
                <div class="fusion-badge-hand ${count >= 3 ? 'x3' : ''}">
                    <div class="fusion-badge-particles"><span></span><span></span><span></span><span></span><span></span><span></span></div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l7.07 17.32M20 4l-7.07 17.32M3.5 9h17M7 16.5h10"/></svg>
                </div>
                <div class="power-badge">
                    <span class="pw-value">${avgStat}</span>
                </div>
                <div class="card-info">
                    <div class="card-name fused-stacked">${card.fusedCards.map(c => `<span>${adminFormatName(c.name)}</span>`).join('')}</div>
                    <div class="card-anime">${adminFormatName(card.anime)}</div>
                </div>
            </div>`;
        }
        
        const isNewDrawCard = window._adminDrawNewCard && i === adminCollectCards.length - 1;
        
        return `
        <div class="collect-card large ${isDealing ? 'pre-deal' : 'dealt'} ${hasBonus ? 'same-anime-bonus' : ''} ${isNewDrawCard ? 'draw-new-card' : ''}"
             data-card-index="${i}" data-anime="${card.anime || ''}">
            ${hasBonus ? sameAnimeParticles : ''}
            <div class="card-image">
                <img src="${getAdminCardImage(card)}" alt="${card.name}">
            </div>
            <div class="class-badge ${card.class}">
                <span class="class-icon">${getAdminClassIcon(card.class)}</span>
            </div>
            <div class="power-badge">
                <span class="pw-value">${avgStat}</span>
            </div>
            <div class="card-info">
                <div class="card-name">${adminFormatName(card.name)}</div>
                <div class="card-anime">${adminFormatName(card.anime)}</div>
            </div>
        </div>`;
    }).join('');
    
    window._adminDrawNewCard = false;
    // Retirer draw-new-card après l'animation pour ne pas interférer avec hover
    container.querySelectorAll('.collect-card.large.draw-new-card').forEach(el => {
        el.addEventListener('animationend', () => el.classList.remove('draw-new-card'), { once: true });
    });
    container.querySelectorAll('.collect-card.large').forEach(cardEl => {
        const idx = parseInt(cardEl.dataset.cardIndex);
        const card = adminCollectCards[idx];
        if (!card) return;
        cardEl.addEventListener('mouseenter', () => showAdminCardPreview(card));
        cardEl.addEventListener('mouseleave', () => hideAdminCardPreview());
        cardEl.addEventListener('pointerdown', (e) => startAdminCardDrag(idx, e));
    });
    
    // Gray out if timer already expired
    if (adminCollectTimerExpired || adminCollectCardPlayed) {
        container.querySelectorAll('.collect-card.large').forEach(el => el.classList.add('card-played-out'));
    }

    // Animation de distribution
    if (isDealing) {
        // Annuler un éventuel deal précédent programmé (évite double animation)
        if (window._adminDealTimeout) clearTimeout(window._adminDealTimeout);
        window._adminDealTimeout = setTimeout(() => {
            window._adminDealTimeout = null;
            dealAdminCollectCards();
        }, 3400);
    }
    
    // Mettre à jour le glow du marché selon la main actuelle
    updateMarketMatchGlow();
}

// 🆕 DRAG & DROP ADMIN
function startAdminCardDrag(cardIndex, e) {
    if (adminCollectCardPlayed) return;
    if (adminCollectTimerExpired) return;
    if (!collectState.selectedStat) return;
    // Block drag if cards are locked (timer not started yet)
    const myCards = document.getElementById('adminPovCards');
    if (myCards && myCards.classList.contains('cards-locked')) return;
    // Block drag if cards are visually disabled (e.g. timer not yet started)
    if (e.currentTarget.classList.contains('card-played-out')) return;
    // Block drag until slot is visible (round overlay still playing)
    const slot = document.getElementById('collectCenterSlot');
    if (!slot || !slot.classList.contains('visible')) return;
    e.preventDefault();
    
    hideAdminCardPreview();
    
    const cardEl = e.currentTarget;
    const rect = cardEl.getBoundingClientRect();
    
    // Marquer la carte comme en cours de drag
    cardEl.classList.add('dragging-origin');
    
    // Créer un ghost simplifié
    const card = adminCollectCards[cardIndex];
    const ghost = document.createElement('div');
    ghost.className = 'collect-card large drag-ghost';
    if (card && card.isFused) {
        ghost.classList.add('fused-card');
        const count = card.fusedCards.length;
        const imgsHtml = card.fusedCards.map(fc => 
            `<img src="${getAdminCardImage(fc)}" alt="${fc.name}">`
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
    adminCollectDragGhost = ghost;
    adminCollectDragRect = rect;
    
    let mergeTargetIdx = null;
    let marketSwapIdx = null;
    const onMove = (ev) => {
        ghost.style.left = (ev.clientX - rect.width / 2) + 'px';
        ghost.style.top = (ev.clientY - rect.height / 2) + 'px';
        
        const slotEl = document.getElementById('collectCenterSlot');
        if (slotEl) {
            const slotRect = slotEl.getBoundingClientRect();
            const overSlot = (
                ev.clientX >= slotRect.left - 2 &&
                ev.clientX <= slotRect.right + 2 &&
                ev.clientY >= slotRect.top - 2 &&
                ev.clientY <= slotRect.bottom + 2
            );
            slotEl.classList.toggle('drop-hover', overSlot);
        }
        
        // 🔥 Detect merge target (same anime card)
        mergeTargetIdx = null;
        const sourceCard = adminCollectCards[cardIndex];
        if (!sourceCard) return;
        
        // 🔄 Detect market card hover
        let wasOverMarket = marketSwapIdx !== null;
        marketSwapIdx = null;
        document.querySelectorAll('#collectMarket .market-card').forEach((el, i) => {
            el.classList.remove('swap-hover');
            const r = el.getBoundingClientRect();
            if (ev.clientX >= r.left - 5 && ev.clientX <= r.right + 5 &&
                ev.clientY >= r.top - 5 && ev.clientY <= r.bottom + 5) {
                el.classList.add('swap-hover');
                marketSwapIdx = i;
            }
        });
        
        // Ghost transform: shrink + darken + swap icon quand sur marché
        if (marketSwapIdx !== null) {
            if (!wasOverMarket) {
                ghost.style.transform = 'scale(0.55) rotate(0deg)';
                ghost.style.filter = 'brightness(0.4)';
                ghost.style.transition = 'transform 0.2s ease, filter 0.2s ease';
                if (!ghost.querySelector('.ghost-swap-icon')) {
                    const icon = document.createElement('div');
                    icon.className = 'ghost-swap-icon';
                    icon.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:10;pointer-events:none;';
                    icon.innerHTML = '<div style="width:36px;height:36px;background:rgba(76,175,80,0.95);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(76,175,80,0.6);"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3l4 4-4 4"/><path d="M20 7H4"/><path d="M8 21l-4-4 4-4"/><path d="M4 17h16"/></svg></div>';
                    ghost.appendChild(icon);
                }
            }
        } else if (wasOverMarket) {
            ghost.style.transform = 'scale(1.08) rotate(2deg)';
            ghost.style.filter = 'brightness(1.2)';
            const swapIcon = ghost.querySelector('.ghost-swap-icon');
            if (swapIcon) swapIcon.remove();
        }
        
        const allCards = document.querySelectorAll('#adminPovCards .collect-card.large');
        allCards.forEach((el, i) => {
            el.classList.remove('merge-target');
            if (i === cardIndex) return;
            const tgt = adminCollectCards[i];
            if (!tgt || tgt.anime !== sourceCard.anime) return;
            const srcCount = sourceCard.isFused ? sourceCard.fusedCards.length : 1;
            const tgtCount = tgt.isFused ? tgt.fusedCards.length : 1;
            if (srcCount + tgtCount > 3) return;
            const r = el.getBoundingClientRect();
            if (ev.clientX >= r.left - 10 && ev.clientX <= r.right + 10 &&
                ev.clientY >= r.top - 10 && ev.clientY <= r.bottom + 10) {
                el.classList.add('merge-target');
                mergeTargetIdx = i;
            }
        });
    };
    
    const onEnd = (ev) => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onEnd);
        
        // Clean up merge highlights
        document.querySelectorAll('#adminPovCards .collect-card.large.merge-target').forEach(el => el.classList.remove('merge-target'));
        // Clean up market swap highlights
        document.querySelectorAll('#collectMarket .market-card.swap-hover').forEach(el => el.classList.remove('swap-hover'));
        
        // 🔄 Re-check market overlap at drop time
        const dropX = ev.clientX;
        const dropY = ev.clientY;
        let finalMarketSwap = null;
        document.querySelectorAll('#collectMarket .market-card').forEach((el, i) => {
            const r = el.getBoundingClientRect();
            if (dropX >= r.left - 5 && dropX <= r.right + 5 &&
                dropY >= r.top - 5 && dropY <= r.bottom + 5) {
                finalMarketSwap = i;
            }
        });
        
        // 🔄 MARKET SWAP: dropped on market card
        if (finalMarketSwap !== null) {
            const card = adminCollectCards[cardIndex];
            if (card && card.isFused) {
                // Pas d'échange de cartes fusionnées — retour en place
                ghost.style.transition = 'all 0.3s cubic-bezier(0.4,0,0.2,1)';
                ghost.style.left = rect.left + 'px';
                ghost.style.top = rect.top + 'px';
                ghost.style.transform = 'scale(1) rotate(0deg)';
                ghost.style.opacity = '1';
                setTimeout(() => ghost.remove(), 300);
            } else {
                const marketEl = document.querySelectorAll('#collectMarket .market-card')[finalMarketSwap];
                if (marketEl) {
                    const mr = marketEl.getBoundingClientRect();
                    ghost.style.transition = 'all 0.25s cubic-bezier(0.4,0,0.2,1)';
                    ghost.style.left = (mr.left + mr.width/2 - rect.width/2) + 'px';
                    ghost.style.top = (mr.top + mr.height/2 - rect.height/2) + 'px';
                    ghost.style.transform = 'scale(0.6) rotate(0deg)';
                    ghost.style.opacity = '0.5';
                }
                setTimeout(() => ghost.remove(), 300);
                adminSwapWithMarket(cardIndex, finalMarketSwap);
            }
            cardEl.classList.remove('dragging-origin');
            adminCollectDragGhost = null;
            return;
        }
        
        // 🔥 FUSION: dropped on merge target
        if (mergeTargetIdx !== null) {
            const targetEl = document.querySelectorAll('#adminPovCards .collect-card.large')[mergeTargetIdx];
            if (targetEl) {
                const tgtRect = targetEl.getBoundingClientRect();
                ghost.style.transition = 'all 0.2s ease-in';
                ghost.style.left = (tgtRect.left + tgtRect.width / 2 - rect.width / 2) + 'px';
                ghost.style.top = (tgtRect.top + tgtRect.height / 2 - rect.height / 2) + 'px';
                ghost.style.transform = 'scale(0.5)';
                ghost.style.opacity = '0';
            }
            setTimeout(() => ghost.remove(), 250);
            cardEl.classList.remove('dragging-origin');
            adminCollectDragGhost = null;
            fuseAdminCards(cardIndex, mergeTargetIdx);
            return;
        }
        
        const slotEl = document.getElementById('collectCenterSlot');
        const isOverSlot = slotEl && slotEl.classList.contains('drop-hover');
        
        if (isOverSlot) {
            // ✅ DROP → jouer la carte
            const slotRect = slotEl.getBoundingClientRect();
            const droppedCard = adminCollectCards[cardIndex];
            const isDiscard = droppedCard && !droppedCard.isFused;
            
            if (isDiscard) {
                // 💥 DÉFAUSSE — ghost snap puis shatter
                const cx = slotRect.left + slotRect.width / 2;
                const cy = slotRect.top + slotRect.height / 2;
                ghost.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
                ghost.style.left = (cx - rect.width / 2) + 'px';
                ghost.style.top = (cy - rect.height / 2) + 'px';
                ghost.style.transform = 'scale(0.5) rotate(0deg)';
                ghost.style.opacity = '1';
                
                setTimeout(() => {
                    ghost.style.display = 'none';
                    ghost.remove();
                    playAdminShatterEffect(cx, cy);
                }, 200);
                
                slotEl.classList.remove('drop-hover');
                adminDiscardCollectCard(cardIndex);
            } else {
                // ⭐ FUSION VALIDATION
                ghost.style.transition = 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
                ghost.style.left = (slotRect.left + slotRect.width / 2 - rect.width / 2) + 'px';
                ghost.style.top = (slotRect.top + slotRect.height / 2 - rect.height / 2) + 'px';
                ghost.style.transform = 'scale(0.55) rotate(0deg)';
                ghost.style.opacity = '0';
                setTimeout(() => ghost.remove(), 400);
                
                slotEl.classList.remove('drop-hover');
                adminPlayCollectCard(cardIndex);
            }
        } else {
            // ❌ Retour en place
            ghost.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            ghost.style.left = rect.left + 'px';
            ghost.style.top = rect.top + 'px';
            ghost.style.transform = 'scale(1) rotate(0deg)';
            ghost.style.opacity = '1';
            setTimeout(() => ghost.remove(), 300);
            
            if (slotEl) slotEl.classList.remove('drop-hover');
        }
        
        cardEl.classList.remove('dragging-origin');
        adminCollectDragGhost = null;
    };
    
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onEnd);
}

// 🔥 FUSION — Combine two cards from same anime
function fuseAdminCards(sourceIndex, targetIndex) {
    const src = adminCollectCards[sourceIndex];
    const tgt = adminCollectCards[targetIndex];
    if (!src || !tgt || src.anime !== tgt.anime) return;
    
    const srcCards = src.isFused ? [...src.fusedCards] : [src];
    const tgtCards = tgt.isFused ? [...tgt.fusedCards] : [tgt];
    const allCards = [...tgtCards, ...srcCards];
    if (allCards.length > 3) return;
    
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
    
    console.log(`🔥 ADMIN FUSION: ${allCards.map(c => c.name).join(' + ')} → stats:`, fusedStats);
    
    // 🎆 ANIMATION
    const cardEls = document.querySelectorAll('#adminPovCards .collect-card.large');
    const srcEl = cardEls[sourceIndex];
    const tgtEl = cardEls[targetIndex];
    
    if (tgtEl) {
        // Phase 1: Impact shake (0.4s)
        tgtEl.classList.add('fuse-impact');
        
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
        
        // Phase 4: Burst — fixed on body (survives DOM re-render)
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
    
    // Morph — wait for animation to finish, THEN update cards
    setTimeout(() => {
        if (sourceIndex < targetIndex) {
            adminCollectCards.splice(targetIndex, 1, fusedCard);
            adminCollectCards.splice(sourceIndex, 1);
        } else {
            adminCollectCards.splice(sourceIndex, 1);
            adminCollectCards.splice(targetIndex, 1, fusedCard);
        }
        renderAdminPOVCards(false);
    }, 600);
    
    // Notify server
    socket.emit('collect-fuse-cards', {
        twitchId: twitchUser.id,
        sourceIndex: sourceIndex,
        targetIndex: targetIndex
    });
}

// 💥 Effet Shatter — défausse de carte (admin)
/**
 * Animate a card-back flying from a player's seat to the center slot
 */
function animateCardToSlot(seatEl, slotEl, duration, onComplete, keepAlive) {
    const smallCards = seatEl.querySelectorAll('.collect-player-card-small');
    if (!smallCards.length) { if (onComplete) onComplete(); return; }
    
    const firstRect = smallCards[0].getBoundingClientRect();
    const lastRect = smallCards[smallCards.length - 1].getBoundingClientRect();
    const fromCx = (firstRect.left + lastRect.right) / 2;
    const fromCy = (firstRect.top + lastRect.bottom) / 2;
    const fromW = firstRect.width;
    const fromH = firstRect.height;
    const toRect = slotEl.getBoundingClientRect();
    
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
    const label = document.createElement('span');
    label.textContent = 'SM';
    label.style.cssText = `
        position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
        font-family:Orbitron,sans-serif; font-size:9px; font-weight:700;
        color:rgba(255,255,255,0.2); letter-spacing:2px;
    `;
    flyer.appendChild(label);
    document.body.appendChild(flyer);
    
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

function playAdminShatterEffect(cx, cy) {
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
}

function adminPlayCollectCard(cardIndex) {
    if (adminCollectTimerExpired) return;
    const card = adminCollectCards[cardIndex];
    if (!card) return;
    
    console.log('🎴 Admin joue carte:', card.name, 'index:', cardIndex);
    
    adminCollectCardPlayed = true;
    adminCollectPlayedCardData = card;
    // Timer keeps running until end of round
    
    // Disable le deck
    const deckEl = document.getElementById('adminCollectDeck');
    if (deckEl) {
        deckEl.classList.remove('can-draw');
        deckEl.classList.remove('my-turn');
    }
    
    // Émettre au serveur
    socket.emit('collect-play-card', {
        twitchId: twitchUser.id,
        cardIndex: cardIndex
    });
    
    // Retirer la carte de la main
    adminCollectCards.splice(cardIndex, 1);
    
    // Afficher la carte au centre
    const slotEl = document.getElementById('collectCenterSlot');
    if (slotEl) {
        slotEl.classList.add('has-card');
        // Hide stat icon
        const statIcon = slotEl.querySelector('.slot-stat-icon');
        if (statIcon) statIcon.classList.remove('show');
        const inner = slotEl.querySelector('.center-slot-inner');
        if (inner) {
            inner.innerHTML = buildCenterCardHTML(card);
            // Enable hover preview on center card
            const centerCard = inner.querySelector('.center-played-card');
            if (centerCard) {
                centerCard.style.cursor = 'pointer';
                centerCard.addEventListener('mouseenter', () => showAdminCardPreview(card));
                centerCard.addEventListener('mouseleave', () => hideAdminCardPreview());
            }
        }
    }
    
    // Recalculer le bonus same-anime sur les cartes restantes
    const animeCountsPlay = {};
    adminCollectCards.forEach(c => { if (c && c.anime) animeCountsPlay[c.anime] = (animeCountsPlay[c.anime] || 0) + 1; });
    
    // 🔥 FIX: Ne pas re-render — juste cacher la carte jouée et griser les restantes (transition smooth)
    const allCards = document.querySelectorAll('#adminPovCards .collect-card.large');
    allCards.forEach((el, i) => {
        if (i === cardIndex) {
            el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            el.style.opacity = '0';
            el.style.transform = 'scale(0.8)';
            setTimeout(() => el.remove(), 300);
        } else {
            el.classList.add('card-played-out');
            // Retirer le glow same-anime si plus de paire
            const anime = el.dataset.anime;
            if (anime && (!animeCountsPlay[anime] || animeCountsPlay[anime] < 2)) {
                el.classList.remove('same-anime-bonus');
                const glow = el.querySelector('.sa-glow-container');
                const particles = el.querySelector('.sa-particles');
                if (glow) glow.remove();
                if (particles) particles.remove();
            }
        }
    });
    
    // Mettre à jour le glow marché après placement
    updateMarketMatchGlow();
}

// 🗑️ Défausser une carte (admin) — pas de carte visible dans le slot
// 🎴 Animation de la carte volant du deck vers la main
function animateCardToHand(card, deckEl) {
    if (!deckEl) {
        adminCollectCards.push(card);
        renderAdminPOVCards(false);
        return;
    }
    
    // Trouver la carte du dessus du deck
    const topCard = deckEl.querySelector('.collect-deck-card:nth-child(1)');
    if (!topCard) {
        adminCollectCards.push(card);
        renderAdminPOVCards(false);
        return;
    }
    
    // Position et taille exacte de la carte du dessus
    const topRect = topCard.getBoundingClientRect();
    
    // Cacher la vraie carte du dessus
    topCard.style.visibility = 'hidden';
    
    // Calculer la stat moyenne
    const avgStat = card.stats 
        ? Math.round((card.stats.atk + card.stats.int + card.stats.spd + card.stats.pwr) / 4) 
        : (card.powerLevel || '?');
    
    // Créer le clone volant — taille exacte de la carte du deck
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
                    <img src="${getAdminCardImage(card)}" alt="${card.name}">
                </div>
                <div class="flyer-class-badge ${card.class}">
                    <span class="class-icon">${getAdminClassIcon(card.class)}</span>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(flyer);
    
    // Positionner exactement sur la carte du deck
    flyer.style.left = topRect.left + 'px';
    flyer.style.top = topRect.top + 'px';
    flyer.style.width = topRect.width + 'px';
    flyer.style.height = topRect.height + 'px';
    
    // Calculer la destination (dernière carte dans la main, ou centre main)
    const handContainer = document.getElementById('adminPovCards');
    let endX, endY, endW, endH;
    if (handContainer) {
        const handCards = handContainer.querySelectorAll('.collect-card.large');
        if (handCards.length > 0) {
            // Estimer la position de la NOUVELLE carte (après re-layout)
            // Prendre le centre de la main comme cible
            const firstCard = handCards[0];
            const lastCard = handCards[handCards.length - 1];
            const firstRect = firstCard.getBoundingClientRect();
            const lastRect = lastCard.getBoundingClientRect();
            endW = firstRect.width;
            endH = firstRect.height;
            // Nouvelle carte sera à droite de la dernière
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
    
    // Force layout avant animation
    flyer.getBoundingClientRect();
    
    const flyDuration = 600;
    
    // Animation du conteneur (position + taille)
    flyer.animate([
        { 
            left: topRect.left + 'px', 
            top: topRect.top + 'px', 
            width: topRect.width + 'px', 
            height: topRect.height + 'px' 
        },
        { 
            left: endX + 'px', 
            top: endY + 'px', 
            width: endW + 'px', 
            height: endH + 'px' 
        }
    ], { duration: flyDuration, easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)', fill: 'forwards' });
    
    // Animation du flip (inner)
    const inner = flyer.querySelector('.draw-card-flyer-inner');
    inner.animate([
        { transform: 'rotateY(0deg)' },
        { transform: 'rotateY(180deg)' }
    ], { duration: flyDuration, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' });
    
    // FLIP: attendre la fin du vol, puis décaler les cartes et révéler
    setTimeout(() => {
        // 1. Sauvegarder les positions actuelles des cartes existantes
        const oldPositions = new Map();
        if (handContainer) {
            handContainer.querySelectorAll('.collect-card.large').forEach(el => {
                oldPositions.set(el.dataset.cardIndex, el.getBoundingClientRect());
            });
        }
        
        // 2. Ajouter la carte et render le vrai layout final
        adminCollectCards.push(card);
        window._adminDrawNewCard = false;
        renderAdminPOVCards(false);
        
        // 3. Cacher la nouvelle carte (la dernière) — le flyer est encore visible
        if (handContainer) {
            const newCards = handContainer.querySelectorAll('.collect-card.large');
            const newCard = newCards[newCards.length - 1];
            if (newCard) newCard.style.opacity = '0';
            
            // 4. FLIP: animer chaque carte existante de son ancienne position vers la nouvelle
            newCards.forEach(el => {
                const idx = el.dataset.cardIndex;
                const oldRect = oldPositions.get(idx);
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
            
            // 5. Révéler la nouvelle carte après un court délai
            setTimeout(() => {
                flyer.remove();
                topCard.style.visibility = '';
                window._adminDrawNewCard = true;
                renderAdminPOVCards(false);
            }, 50);
        } else {
            flyer.remove();
            topCard.style.visibility = '';
            window._adminDrawNewCard = true;
            renderAdminPOVCards(false);
        }
    }, flyDuration);
}

function adminDiscardCollectCard(cardIndex) {
    if (adminCollectTimerExpired) return;
    const card = adminCollectCards[cardIndex];
    if (!card) return;
    
    console.log('🗑️ Admin défausse carte:', card.name, 'index:', cardIndex);
    
    adminCollectCardPlayed = true;
    adminCollectPlayedCardData = null; // PAS de carte dans le slot
    sessionStorage.setItem('adminCollectWasDiscard', 'true');
    
    // Disable le deck
    const deckEl = document.getElementById('adminCollectDeck');
    if (deckEl) {
        deckEl.classList.remove('can-draw');
        deckEl.classList.remove('my-turn');
    }
    socket.emit('collect-play-card', {
        twitchId: twitchUser.id,
        cardIndex: cardIndex,
        discard: true
    });
    
    // Retirer la carte de la main
    adminCollectCards.splice(cardIndex, 1);
    
    // Recalculer le bonus same-anime sur les cartes restantes
    const animeCountsAfter = {};
    adminCollectCards.forEach(c => { if (c && c.anime) animeCountsAfter[c.anime] = (animeCountsAfter[c.anime] || 0) + 1; });
    
    // Griser les cartes restantes (pas d'affichage dans le slot)
    const allCards = document.querySelectorAll('#adminPovCards .collect-card.large');
    allCards.forEach((el, i) => {
        if (i === cardIndex) {
            el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            el.style.opacity = '0';
            el.style.transform = 'scale(0.8)';
            setTimeout(() => el.remove(), 300);
        } else {
            el.classList.add('card-played-out');
            // Retirer le glow same-anime si plus de paire
            const anime = el.dataset.anime;
            if (anime && (!animeCountsAfter[anime] || animeCountsAfter[anime] < 2)) {
                el.classList.remove('same-anime-bonus');
                const glow = el.querySelector('.sa-glow-container');
                const particles = el.querySelector('.sa-particles');
                if (glow) glow.remove();
                if (particles) particles.remove();
            }
        }
    });
    
    // Mettre à jour le glow marché après défausse
    updateMarketMatchGlow();
}

// 🔄 Échanger une carte admin avec le marché
function adminSwapWithMarket(cardIndex, marketIndex) {
    if (adminCollectTimerExpired || adminCollectCardPlayed) return;
    const card = adminCollectCards[cardIndex];
    if (!card || card.isFused) return;
    if (!collectState.marketCards || !collectState.marketCards[marketIndex]) return;
    
    const marketCard = collectState.marketCards[marketIndex];
    console.log(`🔄 Admin échange: ${card.name} ↔ ${marketCard.name}`);
    
    adminCollectCardPlayed = true;
    sessionStorage.setItem('adminCollectWasDiscard', 'false');
    
    // Disable deck
    const deckEl = document.getElementById('adminCollectDeck');
    if (deckEl) {
        deckEl.classList.remove('can-draw');
        deckEl.classList.remove('my-turn');
    }
    
    // Emit au serveur
    socket.emit('collect-swap-market', {
        twitchId: twitchUser.id,
        cardIndex: cardIndex,
        marketIndex: marketIndex
    });
    
    // Swap local optimiste
    const receivedCard = JSON.parse(JSON.stringify(marketCard));
    collectState.marketCards[marketIndex] = JSON.parse(JSON.stringify(card));
    adminCollectCards.splice(cardIndex, 1, receivedCard);
    
    // Re-render
    renderAdminPOVCards(false);
    renderMarketCards(collectState.marketCards, false);
    
    // Griser les cartes (tour fini)
    document.querySelectorAll('#adminPovCards .collect-card.large').forEach(el => el.classList.add('card-played-out'));
    
    updateMarketMatchGlow();
}

// Preview carte - identique au joueur
let adminPreviewTimeout = null;

function showAdminCardPreview(card) {
    if (!card) return;
    if (adminPreviewTimeout) { clearTimeout(adminPreviewTimeout); adminPreviewTimeout = null; }
    
    const preview = document.getElementById('adminCardPreview');
    const imgContainer = document.getElementById('adminPreviewImage');
    const name = document.getElementById('adminPreviewName');
    const anime = document.getElementById('adminPreviewAnime');
    const classIcon = document.getElementById('adminPreviewClassIcon');
    const classBadge = document.getElementById('adminPreviewClassBadge');
    const fusionBadge = document.getElementById('adminPreviewFusionBadge');
    
    if (!preview) return;
    
    // Handle fused cards
    if (card.isFused && card.fusedCards && card.fusedCards.length > 1) {
        const count = card.fusedCards.length;
        // Build multiple images with vertical fade
        imgContainer.innerHTML = card.fusedCards.map(fc => 
            `<img src="${getAdminCardImage(fc)}" alt="${fc.name}">`
        ).join('');
        imgContainer.className = 'preview-image fused-preview fused-x' + count;
        
        // Fused names with + separator
        name.innerHTML = card.fusedCards.map(fc => `<span>${adminFormatName(fc.name)}</span>`).join('');
        name.className = 'preview-name fused-name fused-stacked-preview';
        
        // Fusion badge
        if (fusionBadge) {
            fusionBadge.style.display = '';
            const circle = document.getElementById('adminFusionBadgeCircle');
            if (circle) circle.className = 'fusion-badge-preview' + (count >= 3 ? ' x3' : '');
        }
        
        // Hide class/prota badges for fused cards
        if (classBadge) classBadge.style.display = 'none';
        const protaBadge = document.getElementById('adminPreviewProtaBadge');
        if (protaBadge) protaBadge.style.display = 'none';
    } else {
        // Normal card — single image
        imgContainer.innerHTML = `<img id="adminPreviewImg" src="${getAdminCardImage(card)}" alt="${card.name}">`;
        imgContainer.className = 'preview-image';
        
        name.textContent = adminFormatName(card.name);
        name.className = 'preview-name';
        
        // Hide fusion badge
        if (fusionBadge) fusionBadge.style.display = 'none';
        
        // Show class/prota badges
        if (classBadge) {
            classBadge.style.display = '';
            classBadge.className = 'class-badge-small ' + card.class;
        }
        if (classIcon) {
            classIcon.innerHTML = getAdminClassIcon(card.class);
        }
        
        // Badge protagoniste
        const protaBadge = document.getElementById('adminPreviewProtaBadge');
        if (protaBadge) {
            protaBadge.style.display = card.isProtagonist ? 'flex' : 'none';
            protaBadge.className = 'prota-badge' + (card.isBig3 ? ' big3' : '');
        }
    }
    
    anime.textContent = adminFormatName(card.anime);
    
    preview.classList.add('visible');
    
    // Highlight active stat
    updateAdminPreviewHighlight(collectState.selectedStat);
}

// Highlight the active stat on preview card
function updateAdminPreviewHighlight(stat) {
    const preview = document.getElementById('adminCardPreview');
    const statsContainer = document.getElementById('adminPreviewStats');
    if (!statsContainer) return;
    if (preview) {
        if (stat) preview.classList.add('has-active-stat');
        else preview.classList.remove('has-active-stat');
    }
    const items = statsContainer.querySelectorAll('.stat-item');
    const statOrder = ['atk', 'int', 'spd', 'pwr'];
    items.forEach((item, i) => {
        if (stat && statOrder[i] === stat) {
            item.classList.add('active-stat');
        } else {
            item.classList.remove('active-stat');
        }
    });
}

function hideAdminCardPreview() {
    const preview = document.getElementById('adminCardPreview');
    if (!preview) return;
    preview.classList.remove('visible');
    // Garder le contenu pendant l'animation de sortie
    adminPreviewTimeout = setTimeout(() => {
        // Ne pas vider le contenu pour éviter un flash
    }, 300);
}

// Animation de distribution des cartes adversaires (dos de cartes)
function dealAdminSmallCards() {
    const allSeats = document.querySelectorAll('.collect-player-seat:not(.hidden):not(.me)');
    
    // Préparer les positions de départ (centre de la table)
    allSeats.forEach(seat => {
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
    
    // Distribution siège par siège, carte par carte
    let seatDelay = 0;
    const delayPerSeat = 250;
    const delayBetweenCards = 80;
    
    allSeats.forEach((seat) => {
        const cards = seat.querySelectorAll('.collect-player-card-small');
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
        seatDelay += delayPerSeat;
    });
}

// Animation de distribution des cartes POV (admin joueur)
function dealAdminCollectCards() {
    const mySeat = document.querySelector('.collect-player-seat.me');
    if (!mySeat) {
        adminDealStarted = false;
        return;
    }
    
    const myCards = mySeat.querySelectorAll('.collect-my-cards .collect-card');
    myCards.forEach(card => {
        card.classList.remove('dealing', 'dealt');
        card.classList.add('pre-deal');
    });
    
    setTimeout(() => {
        const delayBetweenMyCards = 120;
        myCards.forEach((card, cardIndex) => {
            setTimeout(() => {
                card.classList.remove('pre-deal');
                card.classList.add('dealing');
                setTimeout(() => {
                    card.classList.remove('dealing');
                    card.classList.add('dealt');
                }, 350);
            }, cardIndex * delayBetweenMyCards);
        });
        // Reset dealStarted après la dernière carte
        const totalDealTime = (myCards.length - 1) * delayBetweenMyCards + 400;
        setTimeout(() => {
            adminDealStarted = false;
        }, totalDealTime);
    }, 100);
}


// ============================================
// SUGGESTION SYSTEM - MINIMALISTE
// ============================================

let suggestionAnimeListLoaded = false;

document.addEventListener('DOMContentLoaded', () => {
    initSuggestionSystem();
});

function initSuggestionSystem() {
    // Bouton flottant
    const flagBtn = document.getElementById('suggestionFlagBtn');
    if (flagBtn) {
        flagBtn.addEventListener('click', openSuggestionModal);
    }
    
    // Fermer modal
    const closeBtn = document.getElementById('closeSuggestionBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeSuggestionModal);
    }
    
    // Overlay
    const overlay = document.getElementById('suggestionModalOverlay');
    if (overlay) {
        overlay.addEventListener('click', closeSuggestionModal);
    }
    
    // Type toggle (Nouveau / Variante)
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const type = btn.dataset.type;
            document.getElementById('suggestionType').value = type;
            
            const variantField = document.getElementById('variantField');
            if (variantField) {
                variantField.style.display = type === 'variant' ? 'block' : 'none';
            }
        });
    });
    
    // Form submit
    const form = document.getElementById('suggestionForm');
    if (form) {
        form.addEventListener('submit', handleSuggestionSubmit);
    }
}

// Afficher/cacher le bouton flottant pendant une partie BombAnime
function showSuggestionButton(show) {
    const btn = document.getElementById('suggestionFlagBtn');
    if (btn) {
        btn.style.display = show ? 'flex' : 'none';
    }
}

function openSuggestionModal() {
    const modal = document.getElementById('suggestionModal');
    const overlay = document.getElementById('suggestionModalOverlay');
    
    if (modal && overlay) {
        overlay.classList.add('active');
        modal.classList.add('active');
        
        // Charger les animes si pas déjà fait
        if (!suggestionAnimeListLoaded) {
            loadSuggestionAnimes();
        }
    }
}

function closeSuggestionModal() {
    const modal = document.getElementById('suggestionModal');
    const overlay = document.getElementById('suggestionModalOverlay');
    
    if (modal && overlay) {
        overlay.classList.remove('active');
        modal.classList.remove('active');
    }
}

// Mapping des noms propres des séries
const animeDisplayNames = {
    'Naruto': 'Naruto',
    'OnePiece': 'One Piece',
    'Dbz': 'Dragon Ball',
    'Mha': 'My Hero Academia',
    'Fma' : 'Fullmetal Alchemist',
    'Prota' : 'Protagonist',
    'Bleach': 'Bleach',
    'Jojo': 'JoJo\'s Bizarre Adventure',
    'Hxh': 'Hunter x Hunter',
    'Snk': 'Shingeki no Kyojin',
    'DemonSlayer': 'Demon Slayer',
    'JujutsuKaisen': 'Jujutsu Kaisen',
    'DeathNote': 'Death Note',
    'FairyTail': 'Fairy Tail',
    'Pokemon': 'Pokemon',
    'Reborn': 'Reborn',
    'Aot': 'Shingeki no Kyojin',
    'Ds': 'Demon Slayer',
    'Jjk': 'Jujutsu Kaisen',
    'Ft': 'Fairy Tail',
    'Op': 'One Piece',
    'Db': 'Dragon Ball',
};

function getAnimeDisplayName(key) {
    return animeDisplayNames[key] || key;
}

async function loadSuggestionAnimes() {
    try {
        const response = await fetch('/admin/bombanime/animes', {
            credentials: 'same-origin'
        });
        const data = await response.json();
        
        if (data.animes) {
            const select = document.getElementById('suggestionAnime');
            if (select) {
                select.innerHTML = '<option value="">Sélectionner</option>';
                data.animes.forEach(anime => {
                    const option = document.createElement('option');
                    option.value = anime.key;
                    option.textContent = getAnimeDisplayName(anime.key);
                    select.appendChild(option);
                });
                suggestionAnimeListLoaded = true;
            }
        }
    } catch (error) {
        console.error('Erreur chargement animes:', error);
    }
}

async function handleSuggestionSubmit(e) {
    e.preventDefault();
    
    const anime = document.getElementById('suggestionAnime').value;
    const characterName = document.getElementById('suggestionName').value;
    const type = document.getElementById('suggestionType').value;
    const variantOf = document.getElementById('suggestionVariantOf')?.value || null;
    const submitBtn = document.querySelector('.suggestion-submit');
    
    if (!anime || !characterName) {
        showSuggestionToast('Remplir tous les champs', true);
        return;
    }
    
    if (type === 'variant' && !variantOf) {
        showSuggestionToast('Indiquer le personnage principal', true);
        return;
    }
    
    try {
        const response = await fetch('/admin/bombanime/suggestion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
                type,
                anime,
                characterName,
                variantOf: type === 'variant' ? variantOf : null,
                details: null
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Effet success sur le bouton
            submitBtn.classList.add('success');
            submitBtn.textContent = 'Envoyé ✓';
            
            // Fermer le modal après un court délai
            setTimeout(() => {
                const modal = document.getElementById('suggestionModal');
                const overlay = document.getElementById('suggestionModalOverlay');
                
                modal.classList.add('closing');
                overlay.style.opacity = '0';
                
                setTimeout(() => {
                    modal.classList.remove('active', 'closing');
                    overlay.classList.remove('active');
                    overlay.style.opacity = '';
                    
                    // Reset form
                    document.getElementById('suggestionForm').reset();
                    document.getElementById('variantField').style.display = 'none';
                    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
                    document.querySelector('.toggle-btn[data-type="add"]').classList.add('active');
                    document.getElementById('suggestionType').value = 'add';
                    
                    // Reset bouton
                    submitBtn.classList.remove('success');
                    submitBtn.textContent = 'Envoyer';
                }, 250);
            }, 600);
        } else {
            showSuggestionToast(data.error || 'Erreur', true);
        }
    } catch (error) {
        console.error('Erreur envoi suggestion:', error);
        showSuggestionToast('Erreur de connexion', true);
    }
}

function showSuggestionToast(message, isError = false) {
    const existing = document.querySelector('.suggestion-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `suggestion-toast ${isError ? 'error' : ''}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 200);
    }, 2500);
}
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