
let socket;
let statsInterval;
let currentQuestionData = null;
let timerInterval = null;
let timeRemaining = 10;
let isReloading = false; // 🆕 Flag pour éviter les reloads multiples
let isTogglingGame = false; // 🆕 Anti-spam toggle game
let isStartingGame = false; // 🆕 Anti-spam start game
let isNextQuestion = false; // 🆕 Anti-spam next question
let tiebreakerPlayerIds = [];
let lastQuestionResults = null;

let refreshCooldownActive = false;
let refreshCooldownTimer = null;

let currentSerieFilter = 'tout';

const SERIE_FILTERS = {
    tout: {
        name: 'Overall',
        icon: '🌍',
        series: [] // Vide = toutes les séries
    },
    big3: {
        name: 'Big 3',
        icon: '👑',
        series: ['One Piece', 'Naruto', 'Bleach']
    },
    mainstream: {
        name: 'Mainstream',
        icon: '⭐',
        series: [
            'One Piece', 'Naruto', 'Bleach', 'Hunter x Hunter',
            'Shingeki no Kyojin', 'Fullmetal Alchemist', 'Death Note',
            'Dragon Ball', 'Demon Slayer', 'Jojo\'s Bizarre Adventure', 'My Hero Academia',
            'Fairy Tail', 'Tokyo Ghoul', 'Nanatsu no Taizai', 'Kuroko no Basket'
        ]
    },

    onepiece: {
        name: 'One Piece',
        icon: '',
        series: ['One Piece']
    },

    naruto: {
        name: 'Naruto',
        icon: '',
        series: ['Naruto']
    },
    dragonball: {
        name: 'Dragon Ball',
        icon: '',
        series: ['Dragon Ball']
    },

    bleach: {
        name: 'Bleach',
        icon: '⚔️',
        series: ['Bleach']
    }
};




let currentGameMode = 'lives'; // 'lives' ou 'points'
let gameSettings = {
    mode: 'lives',
    lives: 3,
    questions: 15,
    timePerQuestion: 10,
    answersCount: 4,
    difficultyMode: 'croissante',
    autoMode: false
};

// Toggle du menu de sélection de mode
function toggleModeMenu() {
    const menu = document.getElementById('modeMenu');
    const btn = document.getElementById('btnModeToggle');
    const overlay = document.getElementById('modeMenuOverlay');

    const isActive = menu.classList.contains('active');

    if (isActive) {
        menu.classList.remove('active');
        btn.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    } else {
        menu.classList.add('active');
        btn.classList.add('active');
        if (overlay) overlay.classList.add('active');
    }
}

// Sélection d'un mode
function selectMode(mode) {
    // 🆕 Vérifier si une partie est en cours
    if (isGameInProgress()) {
        console.log('⚠️ Impossible de changer le mode pendant une partie');
        toggleModeMenu(); // Fermer le menu quand même
        return;
    }

    currentGameMode = mode;
    gameSettings.mode = mode;

    // Fermer le menu
    toggleModeMenu();

    // Mettre à jour le texte du bouton
    const modeText = document.getElementById('currentModeText');
    if (mode === 'lives') {
        modeText.textContent = 'Mode Vie';
    } else if (mode === 'points') {
        modeText.textContent = 'Mode Points';
    }

    // Afficher/masquer les paramètres selon le mode
    updateModeParams(mode);

    // Envoyer au serveur
    fetch('/admin/set-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ mode: mode })
    }).then(response => {
        if (response.status === 400) {
            return response.json().then(data => {
                if (data.blocked) {
                    console.log('❌ Changement de mode bloqué: partie en cours');
                }
            });
        }
        return response.json();
    })
        .then(data => {
            if (data && data.success) {
                console.log('✅ Mode changé:', data);
            }
        })
        .catch(err => console.error('❌ Erreur changement mode:', err));

    console.log(`✅ Mode changé: ${mode}`);
}

// Mettre à jour l'affichage des paramètres selon le mode
function updateModeParams(mode) {
    const livesParams = document.getElementById('livesParams');
    const pointsParams = document.getElementById('pointsParams');

    if (mode === 'lives') {
        livesParams.style.display = 'block';
        pointsParams.style.display = 'none';
    } else if (mode === 'points') {
        livesParams.style.display = 'none';
        pointsParams.style.display = 'block';
    }
}

// Définir le nombre de questions (Mode Points)
function setQuestions(count) {
    if (isGameInProgress()) return;

    gameSettings.questions = count;

    // Update UI
    document.querySelectorAll('.questions-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`questions-${count}`).classList.add('active');

    // Envoyer au serveur
    fetch('/admin/set-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ questions: count })
    }).then(response => response.json())
        .then(data => console.log('✅ Nombre de questions synchronisé:', data))
        .catch(err => console.error('❌ Erreur sync questions:', err));

    console.log(`✅ Nombre de questions: ${count}`);
}


// 🆕 Définir le mode de difficulté
function toggleDifficultyMode() {
    if (isGameInProgress()) return;

    // Toggle entre croissante et aléatoire
    gameSettings.difficultyMode = gameSettings.difficultyMode === 'croissante' ? 'aleatoire' : 'croissante';

    // Update UI
    const diffBtn = document.getElementById('difficultyModeBtn');
    if (diffBtn) {
        diffBtn.classList.toggle('active');
        const text = diffBtn.querySelector('.diff-mode-text');
        if (text) {
            text.textContent = gameSettings.difficultyMode === 'croissante' ? 'Croissante' : 'Aléatoire';
        }
    }

    // Envoyer au serveur
    fetch('/admin/set-difficulty-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ mode: gameSettings.difficultyMode })
    }).then(response => response.json())
        .then(data => console.log('✅ Mode de difficulté synchronisé:', data))
        .catch(err => console.error('❌ Erreur sync difficulté:', err));

    console.log(`✅ Mode de difficulté: ${gameSettings.difficultyMode}`);
}



// 🆕 Toggle Mode Auto
async function toggleAutoMode() {
    try {
        const response = await fetch('/admin/toggle-auto-mode', {
            method: 'POST',
            credentials: 'same-origin'
        });

        if (response.status === 403) {
            if (!isReloading) {
                isReloading = true;
                console.log('⚠️ Session expirée, rechargement...');
                location.reload();
            }
            return;
        }

        const data = await response.json();

        if (data.success) {
            gameSettings.autoMode = data.autoMode;

            // Update UI
            const autoBtn = document.getElementById('autoModeBtn');
            if (autoBtn) {
                autoBtn.classList.toggle('active', data.autoMode);

                // 🔥 Mettre à jour le tooltip
                autoBtn.setAttribute('data-tooltip', data.autoMode ? 'Auto' : 'Manuel');

                const text = autoBtn.querySelector('.auto-mode-text');
                if (text) {
                    text.innerHTML = data.autoMode
                        ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>'
                        : '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M23 5.5V20c0 2.2-1.8 4-4 4h-7.3c-1.08 0-2.1-.43-2.85-1.19L1 14.83s1.26-1.23 1.3-1.25c.22-.19.49-.29.79-.29.22 0 .42.06.6.16.04.01 4.31 2.46 4.31 2.46V4c0-.83.67-1.5 1.5-1.5S11 3.17 11 4v7h1V1.5c0-.83.67-1.5 1.5-1.5S15 .67 15 1.5V11h1V2.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5V11h1V5.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5z"/></svg>';
                }
            }

            updateNextQuestionButtonState();
            console.log(`✅ Mode Auto ${data.autoMode ? 'activé' : 'désactivé'}`);

            if (data.autoMode) {
                fetch('/admin/trigger-auto-next', {
                    method: 'POST',
                    credentials: 'same-origin'
                }).catch(err => console.error('❌ Erreur trigger auto:', err));
            }
        }
    } catch (error) {
        console.error('❌ Erreur toggle auto mode:', error);
    }
}

// Remplacer la fonction updateNextQuestionButtonState() :
function updateNextQuestionButtonState() {
    const nextCard = document.getElementById('nextQuestionCard');
    if (!nextCard) return;

    if (gameSettings.autoMode) {
        // 🔥 MODE AUTO: Désactiver le bouton ET ajouter le clignotement jaune
        nextCard.classList.add('auto-mode-disabled');

        // Ajouter le clignotement SEULEMENT si le bouton est actif (partie en cours)
        if (nextCard.classList.contains('game-active') && !nextCard.classList.contains('disabled') && !nextCard.classList.contains('timer-blocked')) {
            nextCard.classList.add('auto-mode-active');
        } else {
            nextCard.classList.remove('auto-mode-active');
        }
    } else {
        // 🔥 MODE MANUEL: Activer le bouton et retirer le clignotement
        nextCard.classList.remove('auto-mode-disabled');
        nextCard.classList.remove('auto-mode-active');
    }
}

// Fermer le menu si on clique ailleurs
document.addEventListener('click', (e) => {
    const modeContainer = document.querySelector('.mode-selector-container');
    const menu = document.getElementById('modeMenu');

    if (menu && modeContainer) {
        if (!modeContainer.contains(e.target) && menu.classList.contains('active')) {
            toggleModeMenu();
        }
    }
})


// Initialisation au chargement
document.addEventListener('DOMContentLoaded', () => {
    // Créer l'overlay si il n'existe pas
    if (!document.getElementById('modeMenuOverlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'modeMenuOverlay';
        overlay.className = 'mode-menu-overlay';
        overlay.onclick = toggleModeMenu;
        document.body.appendChild(overlay);
    }

    // Initialiser l'affichage selon le mode par défaut
    updateModeParams(currentGameMode);

    console.log('✅ Mode selector initialisé');
});


// ============ AUTH ============
async function handleLogin(event) {
    event.preventDefault();
    const password = document.getElementById('adminCode').value;
    const masterPassword = document.getElementById('masterPassword').value;
    const errorMsg = document.getElementById('errorMsg');

    // 🔥 AJOUTER : Nettoyer les anciens messages
    errorMsg.innerHTML = ''; // Vider complètement
    errorMsg.style.color = ''; // Reset de la couleur

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
            document.getElementById('adminPanel').style.display = 'block';
            
            // Afficher badge master si applicable
            if (data.isMaster) {
                showMasterBadge();
            }
            
            initSocket();
            await new Promise(resolve => setTimeout(resolve, 500));
            await restoreGameState();
            refreshStats();
            startStatsRefresh();
        } else {
            // ⚠️ Si admin déjà connecté
            if (data.error === 'admin_already_connected') {
                // errorMsg.textContent = `${data.message} (depuis ${data.connectedSince} min)`;
                errorMsg.style.color = 'var(--warning)'; // Orange au lieu de rouge
                
                // Afficher le champ master password
                document.getElementById('masterPasswordGroup').style.display = 'block';
                document.getElementById('masterPassword').focus();
                
                // Ajouter un hint pour le dev
                const hint = document.createElement('small');
                hint.style.color = 'var(--text-secondary)';
                hint.style.fontSize = '0.65rem';
                hint.style.display = 'block';
                hint.style.marginTop = '8px';
                hint.textContent = '💡 streamer déjà en activité , en attente de déconnexion';
                errorMsg.appendChild(hint);
            } else {
                errorMsg.textContent = data.message || 'Code incorrect';
                errorMsg.style.color = 'var(--danger)'; // 🔥 Rouge pour erreur normale
            }
        }
    } catch (error) {
        console.error('Erreur login:', error);
        errorMsg.textContent = 'Erreur de connexion';
        errorMsg.style.color = 'var(--danger)';
    }
}


function showMasterBadge() {
    const header = document.querySelector('.admin-header');
    
    const badge = document.createElement('div');
    badge.className = 'master-admin-badge';
    badge.innerHTML = '👑 MODE DEV';
    
    header.appendChild(badge);
    
    // Ajouter une notification discrète
    console.log('%c👑 MODE DEV ACTIVÉ', 'color: #FFD700; font-size: 16px; font-weight: bold;');
    console.log('%cVous êtes en mode observation. Le streamer n\'a pas été déconnecté.', 'color: #00ff88;');
}

async function checkAuth() {
    try {
        const response = await fetch('/admin/check', {
            credentials: 'same-origin'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.isAdmin) {
                document.getElementById('loginContainer').style.display = 'none';
                document.getElementById('adminPanel').style.display = 'block';
                initSocket();

                // 🆕 Attendre que socket soit connecté
                await new Promise(resolve => setTimeout(resolve, 500));

                // 🆕 FORCER la restauration
                await restoreGameState();
                refreshStats();
                startStatsRefresh();
            }
        }
    } catch (error) {
        console.log('Non authentifié');
    }
}

async function restoreGameState() {
    try {
        const response = await fetch('/game/state');
        const state = await response.json();

        console.log('🔄 Restauration état:', state);

        await new Promise(resolve => setTimeout(resolve, 200));

        if (state.difficultyMode) {
            gameSettings.difficultyMode = state.difficultyMode;
            const diffBtn = document.getElementById('difficultyModeBtn');
            if (diffBtn) {
                if (state.difficultyMode === 'aleatoire') {
                    diffBtn.classList.add('active');
                } else {
                    diffBtn.classList.remove('active');
                }
                const text = diffBtn.querySelector('.diff-mode-text');
                if (text) {
                    text.textContent = state.difficultyMode === 'croissante' ? 'Croissante' : 'Aléatoire';
                }
            }
            console.log(`✅ Mode de difficulté restauré: ${state.difficultyMode}`);
        }

        // 🔥 NOUVEAU: Restaurer le filtre série
        if (state.serieFilter) {
            currentSerieFilter = state.serieFilter;

            // Mettre à jour le bouton principal
            const filterText = document.getElementById('serieFilterText');
            if (filterText) {
                // Mapper l'ID du filtre vers son nom d'affichage
                const filterNames = {
                    'tout': 'Overall',
                    'big3': 'Big 3',
                    'mainstream': 'Mainstream',
                    'naruto': 'Naruto',
                    'dragonball': 'Dragon Ball',
                    'onepiece': 'One Piece',
                    'bleach': 'Bleach'
                };
                filterText.textContent = filterNames[state.serieFilter] || 'Overall';
            }

            console.log(`✅ Filtre série restauré: ${state.serieFilter}`);
        }

        // Restaurer le mode
        if (state.mode) {
            currentGameMode = state.mode;
            gameSettings.mode = state.mode;
            const modeText = document.getElementById('currentModeText');
            if (modeText) {
                modeText.textContent = state.mode === 'lives' ? 'Mode Vie' : 'Mode Points';
            }
            updateModeParams(state.mode);
        }

        // Restaurer joueurs
        if (state.players && state.players.length > 0) {
            updatePlayersGrid(state.players);
            console.log(`✅ ${state.players.length} joueurs restaurés`);
        }

        // Restaurer question en cours
        if (state.currentQuestion && state.inProgress) {
            console.log('✅ Question en cours restaurée');
            switchTab('question');
            await new Promise(resolve => setTimeout(resolve, 100));
            displayQuestion(state.currentQuestion, state.timeRemaining || 0);

            if (state.timeRemaining > 0) {
                startAdminTimer(state.timeRemaining);
            }
        }

        if (state.currentQuestion && state.liveAnswerCounts) {
            console.log('📊 Restauration des stats live:', state.liveAnswerCounts);

            // Attendre que le DOM soit prêt
            setTimeout(() => {
                updateLiveAnswerDisplay({
                    answerCounts: state.liveAnswerCounts,
                    answeredCount: state.answeredCount || 0,
                    totalPlayers: state.playerCount || 0
                });
            }, 200);
        }

        // Désactiver paramètres si partie en cours
        if (state.inProgress) {
            toggleSettingsAccess(false);
            console.log('🔒 Paramètres désactivés');
        } else {
            toggleSettingsAccess(true);
            console.log('🔓 Paramètres activés');
        }

        // Restaurer TOUS les paramètres visuels
        if (state.lives) {
            gameSettings.lives = state.lives;
            const livesButtons = document.querySelectorAll('.lives-btn');
            if (livesButtons.length > 0) {
                livesButtons.forEach(btn => btn.classList.remove('active'));
                const livesBtn = document.getElementById(`lives-${state.lives}`);
                if (livesBtn) livesBtn.classList.add('active');
            }
        }

        if (state.questionTime) {
            gameSettings.timePerQuestion = state.questionTime;
            const timeSelect = document.getElementById('timeSelect');
            if (timeSelect) timeSelect.value = state.questionTime;
        }

        if (state.answersCount) {
            gameSettings.answersCount = state.answersCount;
            const answersSelect = document.getElementById('answersSelect');
            if (answersSelect) {
                answersSelect.value = state.answersCount;
            }
        }

        if (state.questionsCount) {
            gameSettings.questions = state.questionsCount;
            const questionsButtons = document.querySelectorAll('.questions-btn');
            if (questionsButtons.length > 0) {
                questionsButtons.forEach(btn => btn.classList.remove('active'));
                const questionsBtn = document.getElementById(`questions-${state.questionsCount}`);
                if (questionsBtn) questionsBtn.classList.add('active');
                console.log(`✅ Nombre de questions restauré: ${state.questionsCount}`);
            }
        }

        if (state.autoMode !== undefined) {
            gameSettings.autoMode = state.autoMode;
            const autoBtn = document.getElementById('autoModeBtn');
            if (autoBtn) {
                autoBtn.classList.toggle('active', state.autoMode);
                autoBtn.setAttribute('data-tooltip', state.autoMode ? 'Auto' : 'Manuel');

                const text = autoBtn.querySelector('.auto-mode-text');
                if (text) {
                    text.innerHTML = state.autoMode
                        ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>'
                        : '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M23 5.5V20c0 2.2-1.8 4-4 4h-7.3c-1.08 0-2.1-.43-2.85-1.19L1 14.83s1.26-1.23 1.3-1.25c.22-.19.49-.29.79-.29.22 0 .42.06.6.16.04.01 4.31 2.46 4.31 2.46V4c0-.83.67-1.5 1.5-1.5S11 3.17 11 4v7h1V1.5c0-.83.67-1.5 1.5-1.5S15 .67 15 1.5V11h1V2.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5V11h1V5.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5z"/></svg>';
                }
            }
            updateNextQuestionButtonState();
            console.log(`✅ Mode Auto restauré: ${state.autoMode ? 'activé' : 'désactivé'}`);
        }

        if (state.isTiebreaker && state.tiebreakerPlayers) {
            tiebreakerPlayerIds = state.tiebreakerPlayers.map(p => p.twitchId);
            console.log('✅ Tiebreaker restauré:', tiebreakerPlayerIds);
        }

        await checkRefreshCooldown();


    } catch (error) {
        console.error('❌ Erreur restauration état:', error);
    }
}

// ============ SOCKET ============
function initSocket() {
    socket = io();


    socket.on('tiebreaker-announced', (data) => {
        console.log('⚖️ Tiebreaker annoncé:', data);

        // 🔥 Stocker les IDs des joueurs en tiebreaker
        tiebreakerPlayerIds = data.tiebreakerPlayers.map(p => p.twitchId);

        // Mettre à jour la grille pour afficher le clignotement
        updatePlayersGridWithTiebreaker();

        console.log(`⚔️ ${tiebreakerPlayerIds.length} joueurs en tiebreaker`);
    });

    socket.on('tiebreaker-continues', (data) => {
        console.log('⚖️ Tiebreaker continue:', data);

        // 🔥 Mettre à jour les IDs
        tiebreakerPlayerIds = data.tiebreakerPlayers.map(p => p.twitchId);

        // Mettre à jour la grille
        updatePlayersGridWithTiebreaker();

        console.log(`⚔️ ${tiebreakerPlayerIds.length} joueurs encore en tiebreaker`);
    });

    socket.on('new-question', (data) => {
        console.log('📩 Question reçue:', data);
        displayQuestion(data);
        hideResults();
    });

    socket.on('question-results', (data) => {
        console.log('📊 Résultats reçus:', data);
        displayResults(data);

        // 🔥 Stocker les résultats pour usage ultérieur
        lastQuestionResults = data;
    });

    socket.on('lobby-update', (data) => {
        this.playerCount = data.playerCount;

        // 🆕 Mettre à jour le mode si fourni
        if (data.mode) {
            currentGameMode = data.mode;
            gameSettings.mode = data.mode;

            const modeText = document.getElementById('currentModeText');
            if (modeText) {
                modeText.textContent = data.mode === 'lives' ? 'Mode Vie' : 'Mode Points';
            }

            updateModeParams(data.mode);
        }

        // Mettre à jour les paramètres si fournis
        if (data.lives) gameSettings.lives = data.lives;
        if (data.questionTime) gameSettings.timePerQuestion = data.questionTime;

        // 🔥 NOUVEAU: Mettre à jour la grille avec les joueurs si fournis
        if (data.players) {
            updatePlayersGrid(data.players);
            console.log(`✅ Grille mise à jour avec ${data.players.length} joueur(s) - Mode: ${data.mode}`);
        }
    });

    socket.on('game-started', (data) => {
        console.log('🎮 Partie démarrée:', data);
        toggleSettingsAccess(false); // 🆕 Désactiver les paramètres au démarrage
        refreshStats();
        // Afficher l'onglet grille joueurs automatiquement
        switchTab('players');
    });

    socket.on('game-ended', (data) => {
        console.log('🏁 Partie terminée:', data);
        clearInterval(timerInterval);
        hideResults();
        displayGameEnd(data);
        refreshStats();

        tiebreakerPlayerIds = [];

        // 🔥 FIX: Utiliser les données du podium pour mettre à jour la grille
        if (data.podium && data.podium.length > 0) {
            console.log('📊 Mise à jour grille avec scores finaux du podium');

            // Transformer les données du podium en format compatible avec updatePlayersGrid
            const finalPlayers = data.podium.map(player => ({
                username: player.username,
                points: player.points || 0,
                lives: null,
                correctAnswers: null,
                twitchId: player.twitchId || null
            }));

            updatePlayersGrid(finalPlayers);
        } else {
            // Fallback : fetch /game/state si pas de podium
            setTimeout(() => {
                fetch('/game/state')
                    .then(response => response.json())
                    .then(state => {
                        if (state.players && state.players.length > 0) {
                            console.log('📊 Mise à jour grille avec scores finaux (fallback)');
                            const sortedPlayers = state.players.sort((a, b) => {
                                if (state.mode === 'points') {
                                    return (b.points || 0) - (a.points || 0);
                                } else {
                                    if (b.lives !== a.lives) return b.lives - a.lives;
                                    return (b.correctAnswers || 0) - (a.correctAnswers || 0);
                                }
                            });
                            updatePlayersGrid(sortedPlayers);
                        }
                    })
                    .catch(err => console.error('❌ Erreur fetch scores finaux:', err));
            }, 200);
        }
    });

    // 🆕 Reset grille quand le lobby est ouvert (nouveau lobby)
    socket.on('game-activated', () => {
        console.log('✅ Lobby ouvert - Reset grille et affichage');
        updatePlayersGrid([]); // Vider la grille
        resetQuestionDisplay(); // Reset l'affichage question + panel fin
        refreshStats();

        lastQuestionResults = null;
    });

    // 🆕 Reset grille quand le lobby est fermé MAIS pas l'affichage (pour garder le panel de fin)
    socket.on('game-deactivated', () => {
        console.log('❌ Lobby fermé');
        // ✅ NE PAS vider la grille ici pour garder le classement visible
        // La grille sera vidée lors de la prochaine ouverture du lobby
        refreshStats();
        toggleSettingsAccess(true); // Réactiver les paramètres
    });


    socket.on('game-config-updated', (data) => {
        if (data.mode) {
            currentGameMode = data.mode;
            gameSettings.mode = data.mode;

            const modeText = document.getElementById('currentModeText');
            if (modeText) {
                modeText.textContent = data.mode === 'lives' ? 'Mode Vie' : 'Mode Points';
            }

            updateModeParams(data.mode);
        }

        if (data.lives) gameSettings.lives = data.lives;
        if (data.questionTime) gameSettings.timePerQuestion = data.questionTime;
        if (data.answersCount) gameSettings.answersCount = data.answersCount;
        if (data.questionsCount) gameSettings.questions = data.questionsCount;

        console.log('⚙️ Config mise à jour:', data);
    });


    socket.on('live-answer-stats', (data) => {
        updateLiveAnswerDisplay(data);
    });
}

// ============ DISPLAY QUESTION ============
function displayQuestion(data, initialTimeRemaining = null) {
    currentQuestionData = data;
    console.log("📝 Displaying question:", data);

    updateLiveAnswerDisplay({
        answerCounts: {},
        answeredCount: 0,
        totalPlayers: 0
    });

    const container = document.getElementById('questionContainer');

    // Reset timer
    clearInterval(timerInterval);
    timeRemaining = initialTimeRemaining !== null ? initialTimeRemaining : data.timeLimit;

    container.innerHTML = `
        <div class="question-display">
            <div class="question-meta">
                <span class="meta-badge serie">${data.serie}</span>
                <span class="meta-badge difficulty ${data.difficulty}">${data.difficulty.toUpperCase()}</span>
            </div>
            
            <h3 class="question-text">${data.question}</h3>
            
            <div class="timer-bar-container">
                <div class="timer-bar-wrapper">
                    <div class="timer-bar-fill" id="timerBarFill"></div>
                </div>
                <div class="timer-text" id="timerText">${timeRemaining}s</div>
            </div>
            
            <div class="answers-list">
                ${data.answers.map((answer, index) => `
                    <div class="answer-item" id="answer-${index + 1}">
                        <div class="answer-number">${index + 1}</div>
                        <div class="answer-text">${answer}</div>
                        <div class="answer-percentage" id="percent-${index + 1}">0%</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    if (timeRemaining > 0) {
        startTimer(data.timeLimit);
    } else {
        const fill = document.getElementById('timerBarFill');
        const text = document.getElementById('timerText');
        if (fill) fill.style.width = '0%';
        if (text) {
            text.textContent = '0s';
            text.classList.add('warning');
        }
    }

    document.getElementById('currentQuestion').textContent = data.questionNumber;

    // 🆕 S'assurer qu'on est sur l'onglet Question
    switchTab('question');

    // Masquer les résultats
    document.getElementById('resultsContainer').style.display = 'none';
    document.getElementById('statsEmptyState').style.display = 'block';
    container.style.display = 'block';
}

function startTimer(duration) {
    const fill = document.getElementById('timerBarFill');
    const text = document.getElementById('timerText');

    timerInterval = setInterval(() => {
        timeRemaining--;

        const percentage = (timeRemaining / duration) * 100;
        fill.style.width = percentage + '%';
        text.textContent = timeRemaining + 's';

        if (timeRemaining <= 3) {
            fill.classList.add('warning');
            text.classList.add('warning');
        }

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
        }
    }, 1000);
}

// BUG FIX 2: Timer spécifique pour la restauration après refresh
function startAdminTimer(initialTime) {
    // Ne pas démarrer si le timer est presque fini (< 1 seconde)
    if (initialTime < 1) {
        console.log('⚠️ Timer trop court, pas de démarrage');
        return;
    }

    const fill = document.getElementById('timerBarFill');
    const text = document.getElementById('timerText');
    const duration = 7; // Durée totale de base

    if (!fill || !text) {
        console.log('⚠️ Éléments timer non trouvés');
        return;
    }

    // Définir l'état initial du timer
    timeRemaining = initialTime;
    const percentage = (timeRemaining / duration) * 100;
    fill.style.width = percentage + '%';
    text.textContent = timeRemaining + 's';

    if (timeRemaining <= 3) {
        fill.classList.add('warning');
        text.classList.add('warning');
    }

    // Démarrer l'intervalle
    clearInterval(timerInterval); // Clear any existing interval
    timerInterval = setInterval(() => {
        timeRemaining--;

        const newPercentage = (timeRemaining / duration) * 100;
        fill.style.width = newPercentage + '%';
        text.textContent = timeRemaining + 's';

        if (timeRemaining <= 3) {
            fill.classList.add('warning');
            text.classList.add('warning');
        }

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            console.log('⏱️ Timer terminé après restauration');
        }
    }, 1000);

    console.log(`✅ Timer démarré avec ${initialTime}s restantes`);
}

// ============ DISPLAY RESULTS ============
function displayResults(data) {
    console.log('📊 displayResults appelé avec:', data);
    clearInterval(timerInterval);

    // 🆕 Mettre en évidence la bonne réponse dans l'onglet Question
    highlightCorrectAnswer(data.correctAnswer);

    // 🆕 Afficher les stats dans l'onglet Statistiques
    const resultsContainer = document.getElementById('resultsContainer');
    const statsEmptyState = document.getElementById('statsEmptyState');

    const correctCount = data.stats.correct;
    const wrongCount = data.stats.wrong;
    const afkCount = data.stats.afk;
    const totalAnswers = correctCount + wrongCount + afkCount;

    const lives3 = data.stats.livesDistribution[3] || 0;
    const lives2 = data.stats.livesDistribution[2] || 0;
    const lives1 = data.stats.livesDistribution[1] || 0;
    const lives0 = data.stats.livesDistribution[0] || 0;
    const totalPlayers = lives3 + lives2 + lives1 + lives0;

    let fastestPlayer = null;
    if (data.players) {
        const correctPlayers = data.players.filter(p => p.isCorrect && p.responseTime);
        if (correctPlayers.length > 0) {
            fastestPlayer = correctPlayers.reduce((fastest, current) =>
                current.responseTime < fastest.responseTime ? current : fastest
            );
        }
    }

    resultsContainer.innerHTML = `
        <div class="results-display">
            
            <div class="charts-container ${currentGameMode === 'points' ? 'single-chart' : ''}">
                <div class="chart-box">
                    <div class="chart-title">Répartition des réponses</div>
                    <div class="chart-with-legend">
                        <div class="chart-legend">
                            <div class="legend-item">
                                <div class="legend-color" style="background: #00ff88;"></div>
                                <span class="legend-label">✓</span>
                                <span class="legend-value">${correctCount}</span>
                            </div>
                            <div class="legend-item">
                                <div class="legend-color" style="background: #ff4757;"></div>
                                <span class="legend-label">✕</span>
                                <span class="legend-value">${wrongCount}</span>
                            </div>
                            <div class="legend-item">
                                <div class="legend-color" style="background: #ffa502;"></div>
                                <span class="legend-label">⏱</span>
                                <span class="legend-value">${afkCount}</span>
                            </div>
                        </div>
                        <svg id="answersChart" class="chart-svg" viewBox="0 0 100 100"></svg>
                    </div>
                </div>

                ${currentGameMode === 'lives' ? `
                <div class="chart-box">
                    <div class="chart-title">Répartition des vies</div>
                    <div class="chart-with-legend">
                        <div class="chart-legend">
                            <div class="legend-item">
                                <div class="legend-color" style="background: #00ff88;"></div>
                                <span class="legend-label">❤️❤️❤️</span>
                                <span class="legend-value">${lives3}</span>
                            </div>
                            <div class="legend-item">
                                <div class="legend-color" style="background: #FFD700;"></div>
                                <span class="legend-label">❤️❤️</span>
                                <span class="legend-value">${lives2}</span>
                            </div>
                            <div class="legend-item">
                                <div class="legend-color" style="background: #ffa502;"></div>
                                <span class="legend-label">❤️</span>
                                <span class="legend-value">${lives1}</span>
                            </div>
                            <div class="legend-item">
                                <div class="legend-color" style="background: #ff4757;"></div>
                                <span class="legend-label">💀</span>
                                <span class="legend-value">${lives0}</span>
                            </div>
                        </div>
                        <svg id="livesChart" class="chart-svg" viewBox="0 0 100 100"></svg>
                    </div>
                </div>
                ` : ''}
            </div>
            
            ${fastestPlayer ? `
                <div class="fastest-player">
                    <h4>⚡ Plus rapide:</h4>
                    <span class="fastest-player-name">${fastestPlayer.username}</span>
                    <span class="fastest-player-time">${(fastestPlayer.responseTime / 1000).toFixed(2)}s</span>
                </div>
            ` : ''}
        </div>
    `;

    resultsContainer.style.display = 'block';
    statsEmptyState.style.display = 'none';

    // Générer les charts
    setTimeout(() => {
        if (totalAnswers > 0) {
            const svg1 = document.getElementById('answersChart');
            if (svg1) {
                generatePieChart(svg1, [
                    { value: correctCount, color: '#00ff88', label: '✓\n' + correctCount },
                    { value: wrongCount, color: '#ff4757', label: '✕\n' + wrongCount },
                    { value: afkCount, color: '#ffa502', label: '⏱\n' + afkCount }
                ]);
            }
        }

        if (totalPlayers > 0 && currentGameMode === 'lives') {
            const svg2 = document.getElementById('livesChart');
            if (svg2) {
                generatePieChart(svg2, [
                    { value: lives3, color: '#00ff88', label: '3❤\n' + lives3 },
                    { value: lives2, color: '#FFD700', label: '2❤\n' + lives2 },
                    { value: lives1, color: '#ffa502', label: '1❤\n' + lives1 },
                    { value: lives0, color: '#ff4757', label: '💀\n' + lives0 }
                ]);
            }
        }
    }, 50);

    document.getElementById('activePlayers').textContent = data.remainingPlayers;

    if (data.playersData && data.players) {
        updatePlayersGridWithResults(data.playersData, data.players);
    }

    // 🆕 Switcher automatiquement vers l'onglet Statistiques
    setTimeout(() => {
        switchTab('stats');
    }, 300);

    console.log('✅ Results displayed successfully');
}


// 🆕 Mettre en évidence la bonne réponse dans l'onglet Question
function highlightCorrectAnswer(correctAnswerIndex) {
    const answerElement = document.getElementById(`answer-${correctAnswerIndex}`);

    if (answerElement) {
        // Retirer le style de toutes les réponses d'abord
        document.querySelectorAll('.answer-item').forEach(item => {
            item.classList.remove('correct-answer', 'wrong-answer');
        });

        // Ajouter la classe correct à la bonne réponse
        answerElement.classList.add('correct-answer');

        console.log(`✅ Réponse ${correctAnswerIndex} mise en évidence`);
    }
}

// 🆕 Fonction pour générer un pie chart SVG avec labels (FIXED)
function generatePieChart(svgElement, segments) {
    console.log('🎨 generatePieChart appelé avec:', segments);

    // Vider le SVG
    while (svgElement.firstChild) {
        svgElement.removeChild(svgElement.firstChild);
    }

    const centerX = 50;
    const centerY = 50;
    const radius = 40;
    let currentAngle = -90;

    // Filtrer les segments avec valeur > 0
    const validSegments = segments.filter(s => s.value > 0);

    console.log('✅ Valid segments:', validSegments);

    if (validSegments.length === 0) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '50');
        text.setAttribute('y', '50');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', '#fff');
        text.setAttribute('font-size', '8');
        text.textContent = 'Aucune donnée';
        svgElement.appendChild(text);
        return;
    }

    // Calculer le total
    const total = validSegments.reduce((sum, s) => sum + s.value, 0);
    console.log('📊 Total:', total);

    validSegments.forEach((segment, i) => {
        const angle = (segment.value / total) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;

        console.log(`Segment ${i}:`, { angle, startAngle, endAngle, color: segment.color });

        // Convertir en radians
        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;

        // Points de départ et fin
        const x1 = centerX + radius * Math.cos(startRad);
        const y1 = centerY + radius * Math.sin(startRad);
        const x2 = centerX + radius * Math.cos(endRad);
        const y2 = centerY + radius * Math.sin(endRad);

        const largeArc = angle > 180 ? 1 : 0;

        // ⭐ FIX: Pour un cercle complet (360°), utiliser 2 arcs de 180°
        let pathD;
        if (angle >= 359.9) {
            // Cercle complet : 2 demi-cercles
            const midX = centerX - radius;
            pathD = `M ${centerX},${centerY - radius} A ${radius},${radius} 0 0,1 ${centerX},${centerY + radius} A ${radius},${radius} 0 0,1 ${centerX},${centerY - radius} Z`;
        } else {
            pathD = `M ${centerX},${centerY} L ${x1},${y1} A ${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`;
        }
        console.log('Path:', pathD);

        // ⭐ CRÉER LE PATH AVEC createElementNS
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathD);
        path.setAttribute('fill', segment.color);
        path.setAttribute('stroke', '#1a1d29');
        path.setAttribute('stroke-width', '1.5');
        svgElement.appendChild(path);

        currentAngle = endAngle;
    });

    console.log('✅ SVG elements created successfully');
}

function hideResults() {
    console.log('🔄 Hiding results, showing question');
    document.getElementById('resultsContainer').style.display = 'none';
    document.getElementById('resultsContainer').innerHTML = ''; // Vider le contenu
    document.getElementById('questionContainer').style.display = 'block';
}

// 🆕 Reset l'affichage à l'état initial
function resetQuestionDisplay() {
    console.log('🔄 Reset question display');
    const questionContainer = document.getElementById('questionContainer');
    const resultsContainer = document.getElementById('resultsContainer');

    // Cacher les résultats
    resultsContainer.style.display = 'none';
    resultsContainer.innerHTML = '';

    // Afficher le message par défaut
    questionContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">❓</div>
                    <h3>Aucune question active</h3>
                    <p>Démarrez une partie pour afficher les questions</p>
                </div>
            `;
    questionContainer.style.display = 'block';

    // Revenir à l'onglet Question
    switchTab('question');
}

// ============ GAME END PANEL ============
function displayGameEnd(data) {
    console.log('🏁 Affichage fin de partie:', data);

    const resultsContainer = document.getElementById('resultsContainer');
    const questionContainer = document.getElementById('questionContainer');

    // Cacher la question et afficher le panel de fin
    questionContainer.style.display = 'none';

    if (!data.winner) {
        resultsContainer.innerHTML = `
            <div class="game-end-panel">
                <div class="game-end-header">
                    <h2>Partie terminée</h2>
                </div>
                <p>Aucun gagnant</p>
            </div>
        `;
    } else {
        // 🔥 FIX: Affichage selon le mode
        let statsHTML = '';

        if (data.gameMode === 'lives') {
            const hearts = '❤️'.repeat(data.winner.livesRemaining || 0);
            statsHTML = `
                <div class="winner-stat">
                    <div class="stat-label">Vies restantes</div>
                    <div class="stat-value hearts">${hearts}</div>
                </div>
            `;
        } else if (data.gameMode === 'points') {
            statsHTML = `
                <div class="winner-stat">
                    <div class="stat-label">Points</div>
                    <div class="stat-value">${data.winner.points || 0}</div>
                </div>
            `;
        }

        resultsContainer.innerHTML = `
            <div class="game-end-panel">
                <div class="game-end-header">
                    <h2>Partie terminée !</h2>
                </div>
                
                <div class="winner-section">
                    <div class="winner-badge">VAINQUEUR</div>
                    <div class="winner-name">${data.winner.username}</div>
                    
                    <div class="winner-stats">
                        ${statsHTML}
                        <div class="stat-divider"></div>
                        <div class="winner-stat">
                            <div class="stat-label">Victoires totales</div>
                            <div class="stat-value">${data.winner.totalVictories}</div>
                        </div>
                    </div>
                </div>
                
                <div class="game-summary">
                    <div class="summary-item">
                        <span class="summary-label">Questions</span>
                        <span class="summary-value">${data.totalQuestions}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Durée</span>
                        <span class="summary-value">${Math.floor(data.duration / 60)}m ${data.duration % 60}s</span>
                    </div>
                </div>
            </div>
        `;
    }

    resultsContainer.style.display = 'block';
}

// ============ PLAYERS GRID ============
function updatePlayersGrid(players) {
    // 🔥 NOUVEAU: Toujours trier avant d'afficher
    let sortedPlayers = [...players];

    if (currentGameMode === 'points') {
        sortedPlayers.sort((a, b) => (b.points || 0) - (a.points || 0));
    } else {
        sortedPlayers.sort((a, b) => {
            if (b.lives !== a.lives) return b.lives - a.lives;
            return (b.correctAnswers || 0) - (a.correctAnswers || 0);
        });
    }

    // Utiliser la fonction avec effet tiebreaker qui gère déjà l'affichage
    updatePlayersGridWithTiebreakerEffect(sortedPlayers);
}


// 🆕 Fonction modifiée de updatePlayersGrid avec effet tiebreaker
function updatePlayersGridWithTiebreakerEffect(players) {
    const grid = document.getElementById('playersGrid');

    if (players.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <h3>Aucun joueur</h3>
                <p>Les joueurs apparaîtront ici une fois la partie lancée</p>
            </div>
        `;
        return;
    }

    // 🔥 FIX: Récupérer les résultats de la dernière question
    const playersDetails = lastQuestionResults?.players || [];

    // Créer une map des détails pour accès rapide
    const detailsMap = new Map();
    playersDetails.forEach(detail => {
        detailsMap.set(detail.username, detail);
    });

    grid.innerHTML = players.map(player => {
        const isEliminated = currentGameMode === 'lives' ? player.lives === 0 : false;
        const isTiebreaker = tiebreakerPlayerIds.includes(player.twitchId);

        // 🔥 Récupérer le status de la dernière question
        const detail = detailsMap.get(player.username);
        let statusClass = '';
        if (detail) {
            if (detail.status === 'correct') {
                statusClass = 'correct';
            } else if (detail.status === 'wrong' || detail.status === 'afk') {
                statusClass = 'wrong';
            }
        }

        let statsHTML = '';
        if (currentGameMode === 'lives') {
            const lives = player.lives !== undefined ? player.lives : gameSettings.lives;
            statsHTML = `
                <div class="player-lives">
                    <span>Vies:</span>
                    ${[1, 2, 3].map(n =>
                `<span class="heart-icon ${n <= lives ? 'active' : 'lost'}">
                            ${n <= lives ? '❤️' : '🖤'}
                        </span>`
            ).join('')}
                </div>
            `;
        } else {
            const points = player.points !== undefined && player.points !== null ? player.points : 0;
            statsHTML = `
                <div class="player-points">
                    <span class="points-label">Points:</span>
                    <span class="points-value">${points}</span>
                </div>
            `;
        }

        return `
            <div class="player-card ${statusClass} ${isEliminated ? 'eliminated' : ''} ${isTiebreaker ? 'tiebreaker' : ''}">
                <div class="player-header">
                    <div class="player-username">${player.username}</div>
                    <div class="player-status">
                        <div class="status-indicator ${statusClass}"></div>
                    </div>
                </div>
                ${statsHTML}
            </div>
        `;
    }).join('');
}

// 🆕 Fonction pour mettre à jour la grille avec les résultats de la question
function updatePlayersGridWithResults(playersData, playersDetails) {
    const grid = document.getElementById('playersGrid');

    if (!playersData || playersData.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <h3>Aucun joueur</h3>
                <p>Les joueurs apparaîtront ici une fois la partie lancée</p>
            </div>
        `;
        return;
    }

    // 🔥 NOUVEAU: Trier les joueurs selon le mode
    let sortedPlayers = [...playersData]; // Copie pour ne pas modifier l'original

    if (currentGameMode === 'points') {
        // Tri par points décroissants (du plus haut au plus bas)
        sortedPlayers.sort((a, b) => (b.points || 0) - (a.points || 0));
        console.log('📊 Joueurs triés par points:', sortedPlayers.map(p => `${p.username}: ${p.points}`));
    } else {
        // Mode Vie: tri par vies décroissantes, puis par bonnes réponses
        sortedPlayers.sort((a, b) => {
            if (b.lives !== a.lives) return b.lives - a.lives;
            return (b.correctAnswers || 0) - (a.correctAnswers || 0);
        });
    }

    // Créer une map des détails pour accès rapide
    const detailsMap = new Map();
    if (playersDetails) {
        playersDetails.forEach(detail => {
            detailsMap.set(detail.username, detail);
        });
    }

    // 🔥 Utiliser sortedPlayers au lieu de playersData
    grid.innerHTML = sortedPlayers.map(player => {
        const detail = detailsMap.get(player.username);

        let statusClass = '';
        if (detail) {
            if (detail.status === 'correct') {
                statusClass = 'correct';
            } else if (detail.status === 'wrong' || detail.status === 'afk') {
                statusClass = 'wrong';
            }
        }

        const isEliminated = currentGameMode === 'lives' && player.lives === 0;
        const isTiebreaker = tiebreakerPlayerIds.includes(player.twitchId);

        let statsHTML = '';
        if (currentGameMode === 'points') {
            const points = player.points !== undefined && player.points !== null ? player.points : 0;
            statsHTML = `
                <div class="player-points">
                    <span class="points-label">Points:</span>
                    <span class="points-value">${points}</span>
                </div>
            `;
        } else {
            statsHTML = `
                <div class="player-lives">
                    <span>Vies:</span>
                    ${[1, 2, 3].map(n =>
                `<span class="heart-icon ${n <= player.lives ? 'active' : 'lost'}">
                            ${n <= player.lives ? '❤️' : '🖤'}
                        </span>`
            ).join('')}
                </div>
            `;
        }

        return `
            <div class="player-card ${statusClass} ${isEliminated ? 'eliminated' : ''} ${isTiebreaker ? 'tiebreaker' : ''}">
                <div class="player-header">
                    <div class="player-username">${player.username}</div>
                    <div class="player-status">
                        <div class="status-indicator ${statusClass}"></div>
                    </div>
                </div>
                ${statsHTML}
            </div>
        `;
    }).join('');
}

// ============ OVERLAYS ============
function toggleOverlay(type) {
    closeOverlays();

    const backdrop = document.getElementById('overlayBackdrop');
    backdrop.classList.add('active');

    if (type === 'top10') {
        document.getElementById('overlayTop10').classList.add('active');
    } else if (type === 'recent') {
        document.getElementById('overlayRecent').classList.add('active');
    }
}

function closeOverlays() {
    document.getElementById('overlayBackdrop').classList.remove('active');
    document.getElementById('overlayTop10').classList.remove('active');
    document.getElementById('overlayRecent').classList.remove('active');
}

// ============ TABS ============
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    if (tab === 'question') {
        document.querySelector('.tab-btn:nth-child(1)').classList.add('active');
        document.getElementById('tabQuestion').classList.add('active');
    } else if (tab === 'stats') {
        document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
        document.getElementById('tabStats').classList.add('active');
    } else if (tab === 'players') {
        document.querySelector('.tab-btn:nth-child(3)').classList.add('active');
        document.getElementById('tabPlayers').classList.add('active');
    }
}

// ============ ACTIONS ============
async function toggleGame() {
    // 🆕 Anti-spam
    if (isTogglingGame) {
        console.log('⏳ Veuillez patienter...');
        return;
    }

    isTogglingGame = true;

    try {
        const response = await fetch('/admin/toggle-game', {
            method: 'POST',
            credentials: 'same-origin'
        });

        if (response.status === 403) {
            if (!isReloading) {
                isReloading = true;
                console.log('⚠️ Session expirée, rechargement...');
                location.reload();
            }
            return;
        }

        if (!response.ok) {
            console.error('❌ Erreur toggle-game:', response.status);
            return;
        }

        const data = await response.json();
        updateGameStatus(data.isActive);

        // 🆕 Si on ouvre le lobby, reset l'affichage de fin de partie
        if (data.isActive) {
            resetQuestionDisplay();
            toggleSettingsAccess(true); // Débloquer les paramètres
        }

        refreshStats();
    } catch (error) {
        console.error('❌ Erreur toggleGame:', error);
    } finally {
        // 🆕 Débloquer après 1 seconde
        setTimeout(() => {
            isTogglingGame = false;
        }, 1000);
    }
}

async function startGame() {
    // 🆕 Anti-spam
    if (isStartingGame) {
        console.log('⏳ Démarrage en cours...');
        return;
    }

    isStartingGame = true;

    try {
        const response = await fetch('/admin/start-game', {
            method: 'POST',
            credentials: 'same-origin'
        });

        if (response.status === 403) {
            if (!isReloading) {
                isReloading = true;
                console.log('⚠️ Session expirée, rechargement...');
                location.reload();
            }
            return;
        }

        const data = await response.json();

        if (data.success) {
            toggleSettingsAccess(false); // Bloquer les paramètres
            refreshStats();
        }
    } catch (error) {
        console.error('Erreur démarrage:', error);
    } finally {
        // 🆕 Débloquer après 2 secondes
        setTimeout(() => {
            isStartingGame = false;
        }, 2000);
    }
}

async function nextQuestion() {
    const nextCard = document.getElementById('nextQuestionCard');

    // 🆕 Bloquer si mode auto activé
    if (gameSettings.autoMode) {
        console.log('⚠️ Mode Auto activé - Bouton désactivé');
        return;
    }

    // 🆕 Anti-spam
    if (isNextQuestion) {
        console.log('⏳ Question en cours d\'envoi...');
        return;
    }

    isNextQuestion = true;

    // Feedback visuel
    nextCard.classList.add('loading');
    nextCard.style.pointerEvents = 'none';

    // 🆕 Ajouter l'état visuel de blocage
    nextCard.classList.add('timer-blocked');
    nextCard.classList.remove('game-active');

    try {
        const response = await fetch('/admin/next-question', {
            method: 'POST',
            credentials: 'same-origin'
        });

        if (response.status === 403) {
            if (!isReloading) {
                isReloading = true;
                console.log('⚠️ Session expirée, rechargement...');
                location.reload();
            }
            return;
        }

        if (!response.ok) {
            const data = await response.json();

            // 🆕 Si bloqué par le timer (400 avec blocked: true)
            if (response.status === 400 && data.blocked) {
                console.log(`⏱ Timer actif - ${data.timeRemaining}s restantes`);
                // Garder le visuel bloqué pendant le temps restant
                setTimeout(() => {
                    nextCard.classList.remove('timer-blocked');
                    nextCard.classList.add('game-active');
                    isNextQuestion = false;
                }, data.timeRemaining * 1000);
                return;
            }

            console.error('❌ Erreur next-question:', response.status);
            nextCard.classList.remove('timer-blocked');
            nextCard.classList.add('game-active');
            return;
        }

        const data = await response.json();
        if (data.success) {
            console.log('✅ Question suivante envoyée');

            // 🆕 Switch automatique vers l'onglet "Question en cours"
            switchTab('question');
            // 🆕 Garder le visuel bloqué pendant 7 secondes (durée du timer)
            setTimeout(() => {
                nextCard.classList.remove('timer-blocked');
                nextCard.classList.add('game-active');
                isNextQuestion = false;
            }, 7000);
        }
    } catch (error) {
        console.error('❌ Erreur nextQuestion:', error);
        nextCard.classList.remove('timer-blocked');
        nextCard.classList.add('game-active');
        isNextQuestion = false;
    } finally {
        // 🆕 Débloquer après 2 secondes (temps de sécurité)
        setTimeout(() => {
            isNextQuestion = false;
            nextCard.classList.remove('loading');
            nextCard.style.pointerEvents = 'auto';
        }, 2000);
    }
}

// ============ GAME SETTINGS ============
function setLives(lives) {
    if (isGameInProgress()) return;

    gameSettings.lives = lives;

    // Update UI
    document.querySelectorAll('.lives-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`lives-${lives}`).classList.add('active');

    // 🆕 Utiliser la route spécifique /admin/set-lives
    fetch('/admin/set-lives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ lives: lives })
    }).then(response => response.json())
        .then(data => console.log('✅ Vies synchronisées:', data))
        .catch(err => console.error('❌ Erreur sync vies:', err));

    console.log(`✅ Vies définies: ${lives}`);
}

function setTime(seconds) {
    if (isGameInProgress()) return;

    gameSettings.timePerQuestion = parseInt(seconds);

    // 🆕 Émettre vers le serveur pour synchroniser avec les clients
    fetch('/admin/update-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ lives: gameSettings.lives, timePerQuestion: gameSettings.timePerQuestion })
    }).then(response => response.json())
        .then(data => console.log('✅ Paramètres synchronisés'))
        .catch(err => console.error('❌ Erreur sync paramètres:', err));

    console.log(`✅ Temps défini: ${seconds}s`);
}

// Remplace la fonction setAnswers (vers ligne 350-370) :
function setAnswers(count) {
    if (isGameInProgress()) return;

    gameSettings.answersCount = parseInt(count);

    // Update UI - dropdown est automatiquement mis à jour
    const answersSelect = document.getElementById('answersSelect');
    if (answersSelect) {
        answersSelect.value = count;
    }

    // Envoyer au serveur
    fetch('/admin/set-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ answers: count })
    }).then(response => response.json())
        .then(data => console.log('✅ Nombre de réponses synchronisé:', data))
        .catch(err => console.error('❌ Erreur sync réponses:', err));

    console.log(`✅ Réponses définies: ${count}`);
}

function isGameInProgress() {
    const startCard = document.getElementById('startGameCard');
    return !startCard.classList.contains('game-active') &&
        !startCard.classList.contains('disabled');
}

function toggleSettingsAccess(enabled) {
    const settingsSection = document.getElementById('gameSettings');
    const livesButtons = document.querySelectorAll('.lives-btn');
    const questionsButtons = document.querySelectorAll('.questions-btn');
    const timeSelect = document.getElementById('timeSelect');
    const answersButtons = document.querySelectorAll('#answers-4, #answers-6');
    const btnResetQuestions = document.getElementById('btnResetQuestions');
    const btnModeToggle = document.getElementById('btnModeToggle'); // 🆕
    const btnDifficultyMode = document.getElementById('difficultyModeBtn');
    const btnReportQuestion = document.getElementById('btnReportQuestion'); // 🔥 NOUVEAU


    if (enabled) {
        settingsSection.classList.remove('disabled');
        livesButtons.forEach(btn => btn.disabled = false);
        questionsButtons.forEach(btn => btn.disabled = false);
        timeSelect.disabled = false;
        answersButtons.forEach(btn => btn.disabled = false);
        if (btnResetQuestions) btnResetQuestions.disabled = false;
        if (btnModeToggle) btnModeToggle.disabled = false; // 🆕
        if (btnDifficultyMode) btnDifficultyMode.disabled = false;
        if (btnReportQuestion) btnReportQuestion.disabled = false;

    } else {
        settingsSection.classList.add('disabled');
        livesButtons.forEach(btn => btn.disabled = true);
        questionsButtons.forEach(btn => btn.disabled = true);
        timeSelect.disabled = true;
        answersButtons.forEach(btn => btn.disabled = true);
        if (btnResetQuestions) btnResetQuestions.disabled = true;
        if (btnModeToggle) btnModeToggle.disabled = true; // 🆕
        if (btnDifficultyMode) btnDifficultyMode.disabled = true;
        if (btnReportQuestion) btnReportQuestion.disabled = false;

    }
}


function refreshPage() {
    location.reload();
}


// 🔄 Forcer le refresh de tous les joueurs
async function refreshAllPlayers() {
    // Vérifier si en cooldown
    if (refreshCooldownActive) {
        console.log('⏳ Cooldown actif - Veuillez attendre');
        return;
    }

    try {
        const response = await fetch('/admin/refresh-players', {
            method: 'POST',
            credentials: 'same-origin'
        });

        if (response.status === 403) {
            if (!isReloading) {
                isReloading = true;
                console.log('⚠️ Session expirée, rechargement...');
                location.reload();
            }
            return;
        }

        if (response.status === 429) {
            const data = await response.json();
            console.log(`⏳ Cooldown actif - ${data.remainingTime}s restantes`);
            startRefreshCooldown(data.remainingTime);
            return;
        }

        const data = await response.json();

        if (data.success) {
            console.log(`✅ ${data.playersRefreshed} joueur(s) refresh forcé`);
            startRefreshCooldown(20);
        }
    } catch (error) {
        console.error('❌ Erreur refresh joueurs:', error);
    }
}

// 🔥 Gérer le cooldown de 20s
function startRefreshCooldown(initialTime = 20) {
    refreshCooldownActive = true;

    const card = document.getElementById('refreshPlayersCard');

    // 🔥 Juste griser le bouton
    card.classList.add('on-cooldown');

    // Clear any existing timer
    if (refreshCooldownTimer) {
        clearInterval(refreshCooldownTimer);
    }

    let timeLeft = initialTime;

    refreshCooldownTimer = setInterval(() => {
        timeLeft--;

        if (timeLeft <= 0) {
            clearInterval(refreshCooldownTimer);
            refreshCooldownActive = false;
            card.classList.remove('on-cooldown');
            console.log('✅ Cooldown refresh terminé');
        }
    }, 1000);
}


// 🔥 Vérifier et restaurer le cooldown au chargement
async function checkRefreshCooldown() {
    try {
        const response = await fetch('/admin/refresh-cooldown', {
            credentials: 'same-origin'
        });

        if (response.status === 403) return;

        const data = await response.json();

        if (data.onCooldown && data.remainingTime > 0) {
            console.log(`⏳ Cooldown restauré: ${data.remainingTime}s restantes`);
            startRefreshCooldown(data.remainingTime);
        }
    } catch (error) {
        console.error('❌ Erreur vérification cooldown:', error);
    }
}

async function refreshStats() {
    try {
        const response = await fetch('/admin/stats', {
            credentials: 'same-origin'
        });

        if (response.status === 403) {
            if (!isReloading) {
                isReloading = true;
                console.log('⚠️ Session expirée, rechargement...');
                clearInterval(statsInterval); // 🆕 Arrêter le refresh avant de recharger
                location.reload();
            }
            return;
        }

        if (!response.ok) {
            console.error('❌ Erreur refresh stats:', response.status);
            return;
        }

        const data = await response.json();

        // 🆕 Récupérer l'état du jeu pour le timer
        const gameStateResponse = await fetch('/game/state', {
            credentials: 'same-origin'
        });
        const gameState = await gameStateResponse.json();

        document.getElementById('totalGames').textContent = data.totalGames;

        // 🆕 Logique Lobby vs Actifs
        if (data.gameInProgress) {
            // Partie en cours : Lobby = 0, Actifs = joueurs en vie
            document.getElementById('playerCount').textContent = '0';
            document.getElementById('activePlayers').textContent = data.activePlayers;
        } else {
            // Avant/après partie : Lobby = joueurs qui rejoignent, Actifs = 0
            document.getElementById('playerCount').textContent = data.currentPlayers;
            document.getElementById('activePlayers').textContent = '0';
        }

        updateGameStatus(data.gameActive);

        const startCard = document.getElementById('startGameCard');
        const nextCard = document.getElementById('nextQuestionCard');

        if (!data.gameActive || data.gameInProgress || data.currentPlayers === 0) {
            startCard.classList.add('disabled');
            startCard.classList.remove('game-active');
        } else {
            startCard.classList.remove('disabled');
            startCard.classList.add('game-active'); // 🆕 Indicateur visuel
        }

        if (!data.gameInProgress) {
            nextCard.classList.add('disabled');
            nextCard.classList.remove('game-active');
            nextCard.classList.remove('timer-blocked'); // 🆕 Retirer timer-blocked
        } else {
            nextCard.classList.remove('disabled');

            // 🆕 Gérer l'état timer-blocked si une question est en cours
            if (gameState.timeRemaining !== null && gameState.timeRemaining > 0) {
                nextCard.classList.add('timer-blocked');
                nextCard.classList.remove('game-active');
                isNextQuestion = true;

                // Débloquer après le temps restant
                setTimeout(() => {
                    nextCard.classList.remove('timer-blocked');
                    nextCard.classList.add('game-active');
                    isNextQuestion = false;
                }, gameState.timeRemaining * 1000);
            } else {
                nextCard.classList.remove('timer-blocked');
                nextCard.classList.add('game-active');
            }
        }

        const topPlayersTable = document.getElementById('topPlayersTable');
        if (data.topPlayers.length === 0) {
            topPlayersTable.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 40px; color: var(--text-secondary);">Aucune donnée disponible</td></tr>';
        } else {
            topPlayersTable.innerHTML = data.topPlayers.map((player, index) => {
                // 🔥 NOUVEAU: Vérifier si le joueur est qualifié (≥3 parties)
                const isQualified = player.total_games_played >= 3;

                return `
            <tr class="${isQualified ? 'qualified' : ''}">
                <td><span class="rank-badge rank-${index + 1}">${index + 1}</span></td>
                <td>${player.username}</td>
                <td>${player.total_victories}</td>
                <td>${player.total_games_played}</td>
            </tr>
        `;
            }).join('');
        }

        const recentGamesTable = document.getElementById('recentGamesTable');
        if (data.recentGames.length === 0) {
            recentGamesTable.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 40px; color: var(--text-secondary);">Aucune donnée disponible</td></tr>';
        } else {
            recentGamesTable.innerHTML = data.recentGames.map(game => `
                        <tr>
                            <td>#${game.id}</td>
                            <td>${game.winner ? game.winner.username : 'N/A'}</td>
                            <td>${game.questions_count}</td>
                            <td>${new Date(game.created_at).toLocaleDateString()}</td>
                        </tr>
                    `).join('');
        }
    } catch (error) {
        console.error('Error refreshing stats:', error);
    }
}

function updateGameStatus(isActive) {
    const statusText = document.getElementById('statusText');
    const statusIndicator = document.getElementById('statusIndicator');
    const toggleBtn = document.getElementById('toggleGameBtn');
    const toggleCard = document.getElementById('toggleGameCard');

    if (isActive) {
        statusText.textContent = 'ACTIF';
        statusIndicator.classList.remove('inactive');
        statusIndicator.classList.add('active');
        toggleBtn.textContent = 'Fermer lobby';
        toggleCard.classList.add('lobby-active');
    } else {
        statusText.textContent = 'INACTIF';
        statusIndicator.classList.remove('active');
        statusIndicator.classList.add('inactive');
        toggleBtn.textContent = 'Ouvrir lobby';
        toggleCard.classList.remove('lobby-active');
    }
}

function startStatsRefresh() {
    statsInterval = setInterval(refreshStats, 3000);
}


// Reset Questions History
async function resetQuestionsHistory() {
    // 🆕 Vérifier si une partie est en cours
    const btnResetQuestions = document.getElementById('btnResetQuestions');
    if (btnResetQuestions && btnResetQuestions.disabled) {
        console.log('⚠️ Impossible de reset pendant une partie');
        return;
    }

    if (!confirm('Réinitialiser l\'historique des questions ?\n\nToutes les questions redeviendront disponibles')) {
        return;
    }

    try {
        const response = await fetch('/admin/reset-questions-history', {
            method: 'POST',
            credentials: 'same-origin'
        });

        if (response.status === 403) {
            alert('❌ Session expirée, rechargement...');
            location.reload();
            return;
        }

        const data = await response.json();

        if (data.success) {
            console.log('🔄 Reset effectué avec succès');
        } else {
            alert('❌ Erreur: ' + (data.error || 'Erreur inconnue'));
        }
    } catch (error) {
        console.error('❌ Erreur reset:', error);
        alert('❌ Erreur lors du reset: ' + error.message);
    }
}


function goToHome() {
    window.location.href = '/';
}


// Ouvrir le modal de signalement
function openReportModal() {
    // Vérifier qu'une question est en cours
    if (!currentQuestionData || !currentQuestionData.question) {
        alert('❌ Aucune question en cours à signaler');
        return;
    }

    // 🔥 FIX: Vérifier que l'élément existe avant de le modifier
    const previewElement = document.getElementById('reportQuestionPreview');
    if (!previewElement) {
        console.error('❌ Element reportQuestionPreview introuvable');
        alert('❌ Erreur: Modal de signalement non trouvé');
        return;
    }

    // Afficher la question dans le preview
    previewElement.textContent = currentQuestionData.question;

    // Reset du select
    const reasonSelect = document.getElementById('reportReason');
    if (reasonSelect) {
        reasonSelect.value = 'Augmenter la difficulté';
    }

    // Afficher le modal
    const modalOverlay = document.getElementById('reportModalOverlay');
    if (modalOverlay) {
        modalOverlay.classList.add('active');
    } else {
        console.error('❌ Element reportModalOverlay introuvable');
        alert('❌ Erreur: Modal de signalement non trouvé');
    }
}

// Fermer le modal
function closeReportModal() {
    document.getElementById('reportModalOverlay').classList.remove('active');
}

// Soumettre le signalement
async function submitReport() {
    const reason = document.getElementById('reportReason').value;

    if (!reason) {
        alert('❌ Veuillez sélectionner un motif');
        return;
    }

    try {
        const response = await fetch('/admin/report-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
                questionId: currentQuestionData.questionId || null,
                questionText: currentQuestionData.question,
                difficulty: currentQuestionData.difficulty,
                reason: reason
            })
        });

        if (response.status === 403) {
            alert('❌ Session expirée, rechargement...');
            location.reload();
            return;
        }

        const data = await response.json();

        if (data.success) {
            closeReportModal();
            // 🆕 Afficher la notification discrète
            showToast();
            console.log('✅ Signalement envoyé:', data);
        } else {
            alert('❌ Erreur: ' + (data.error || 'Erreur inconnue'));
        }
    } catch (error) {
        console.error('❌ Erreur signalement:', error);
        alert('❌ Erreur lors du signalement: ' + error.message);
    }
}

// 🆕 Fonction pour afficher le toast
function showToast() {
    const toast = document.getElementById('toastNotification');
    toast.classList.add('show');

    // Masquer après 3 secondes
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Fermer le modal avec Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeReportModal();
    }
});



// 🆕 Fonction pour mettre à jour la grille avec effet tiebreaker
function updatePlayersGridWithTiebreaker() {
    // Récupérer les joueurs actuels depuis gameState via fetch
    fetch('/game/state')
        .then(response => response.json())
        .then(state => {
            if (state.players && state.players.length > 0) {
                const playersData = state.players.map(p => ({
                    twitchId: p.twitchId,
                    username: p.username,
                    lives: state.mode === 'lives' ? p.lives : null,
                    points: state.mode === 'points' ? (p.points || 0) : null
                }));

                updatePlayersGridWithTiebreakerEffect(playersData);
            }
        })
        .catch(err => console.error('❌ Erreur refresh grille tiebreaker:', err));
}


// ============================================
// FILTRE SÉRIE - Fonctions
// ============================================
function toggleSeriePanel() {
    const panel = document.getElementById('seriePanel');
    const backdrop = document.getElementById('seriePanelBackdrop');

    panel.classList.toggle('active');
    backdrop.classList.toggle('active');

    // 🔥 Générer les cartes au premier affichage OU à chaque ouverture (pour refresh stats)
    if (panel.classList.contains('active')) {
        generateSerieCards(); // 🔥 Recharger à chaque ouverture
    }
}

function closeSeriePanel() {
    document.getElementById('seriePanel').classList.remove('active');
    document.getElementById('seriePanelBackdrop').classList.remove('active');
}



async function generateSerieCards() {
    const grid = document.getElementById('serieCardsGrid');

    // Afficher un loader pendant le chargement
    grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-secondary);">
            <div style="font-size: 1.5rem; margin-bottom: 8px;">⏳</div>
            <div>Chargement...</div>
        </div>
    `;

    try {
        // Récupérer les stats depuis le serveur
        const response = await fetch('/admin/serie-stats', {
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error('Erreur chargement stats');
        }

        const stats = await response.json();

        // 🔥 PRODUCTION: Définir quelles cartes sont disponibles
        const cards = [
            {
                id: 'tout',
                name: 'Overall',
                subtitle: stats.tout.subtitle,
                bg: 'overall.jpg',
                disabled: false // ✅ Disponible
            },

            {
                id: 'mainstream',
                name: 'Mainstream',
                subtitle: stats.mainstream.subtitle,
                bg: 'mainstream.jpg',
                disabled: false // ✅ Disponible
            },
            {
                id: 'big3',
                name: 'Big 3',
                subtitle: `${stats.big3.count} questions`,
                bg: 'overall.jpg',
                disabled: true // 🔥 Bientôt disponible
            },

            {
                id: 'onepiece',
                name: 'One Piece',
                subtitle: `${stats.onepiece.count} questions`,
                bg: 'op.png',
                disabled: true // 🔥 Bientôt disponible
            },

            {
                id: 'naruto',
                name: 'Naruto',
                subtitle: `${stats.naruto.count} questions`,
                bg: 'naruto2.png',
                disabled: true // 🔥 Bientôt disponible
            },
            {
                id: 'dragonball',
                name: 'Dragon Ball',
                subtitle: `${stats.dragonball.count} questions`,
                bg: 'dbz.png',
                disabled: true // 🔥 Bientôt disponible
            },

            ,
            {
                id: 'bleach',
                name: 'Bleach',
                subtitle: `${stats.bleach.count} questions`,
                bg: 'bleach.png',
                disabled: true // 🔥 Bientôt disponible
            },

            /* ------------ Cartes Bientôt Disponibles ------------ */

            ,
            {
                id: 'bleach',
                name: 'Demon Slayer',
                subtitle: `${stats.dragonball.count} questions`,
                bg: 'overall.jpg',
                disabled: true // 🔥 Bientôt disponible
            },
            ,
            {
                id: 'bleach',
                name: 'Jujutsu Kaisen',
                subtitle: `${stats.dragonball.count} questions`,
                bg: 'overall.jpg',
                disabled: true // 🔥 Bientôt disponible
            },
            ,
            {
                id: 'bleach',
                name: 'My Hero Academia',
                subtitle: `${stats.dragonball.count} questions`,
                bg: 'overall.jpg',
                disabled: true // 🔥 Bientôt disponible
            },
            ,
            {
                id: 'bleach',
                name: 'Shingeki no Kyojin',
                subtitle: `${stats.dragonball.count} questions`,
                bg: 'overall.jpg',
                disabled: true // 🔥 Bientôt disponible
            },
            ,
            {
                id: 'bleach',
                name: 'Death Note',
                subtitle: `${stats.dragonball.count} questions`,
                bg: 'overall.jpg',
                disabled: true // 🔥 Bientôt disponible
            },
            ,
            {
                id: 'bleach',
                name: 'Hunter Hunter',
                subtitle: `${stats.dragonball.count} questions`,
                bg: 'overall.jpg',
                disabled: true // 🔥 Bientôt disponible
            }
            ,
            {
                id: 'bleach',
                name: 'Fairy Tail',
                subtitle: `${stats.dragonball.count} questions`,
                bg: 'overall.jpg',
                disabled: true // 🔥 Bientôt disponible
            },
            ,
            {
                id: 'bleach',
                name: 'Fullmetal Alchemist',
                subtitle: `${stats.dragonball.count} questions`,
                bg: 'overall.jpg',
                disabled: true // 🔥 Bientôt disponible
            },
            ,
            {
                id: 'bleach',
                name: 'Jojo\'s Bizarre Adventure',
                subtitle: `${stats.dragonball.count} questions`,
                bg: 'overall.jpg',
                disabled: true // 🔥 Bientôt disponible
            },
            ,
            {
                id: 'bleach',
                name: 'Vinland Saga',
                subtitle: `${stats.dragonball.count} questions`,
                bg: 'overall.jpg',
                disabled: true // 🔥 Bientôt disponible
            },
            ,
            {
                id: 'bleach',
                name: 'Tokyo Ghoul',
                subtitle: `${stats.dragonball.count} questions`,
                bg: 'overall.jpg',
                disabled: true // 🔥 Bientôt disponible
            },
            ,
            {
                id: 'bleach',
                name: 'Kuroko no Basket',
                subtitle: `${stats.dragonball.count} questions`,
                bg: 'overall.jpg',
                disabled: true // 🔥 Bientôt disponible
            },
            ,
            {
                id: 'bleach',
                name: 'Gintama',
                subtitle: `${stats.dragonball.count} questions`,
                bg: 'overall.jpg',
                disabled: true // 🔥 Bientôt disponible
            },
            ,
            {
                id: 'bleach',
                name: 'Nanatsu no Taizai',
                subtitle: `${stats.dragonball.count} questions`,
                bg: 'overall.jpg',
                disabled: true // 🔥 Bientôt disponible
            },
            ,
            {
                id: 'bleach',
                name: 'Yu Yu Hakusho',
                subtitle: `${stats.dragonball.count} questions`,
                bg: 'overall.jpg',
                disabled: true // 🔥 Bientôt disponible
            },
            ,
            {
                id: 'bleach',
                name: 'Yu-Gi-Oh!',
                subtitle: `${stats.dragonball.count} questions`,
                bg: 'overall.jpg',
                disabled: true // 🔥 Bientôt disponible
            },
            {
                id: 'bleach',
                name: 'Pokemon',
                subtitle: `${stats.dragonball.count} questions`,
                bg: 'overall.jpg',
                disabled: true // 🔥 Bientôt disponible
            }


        ];

        // Générer les cartes
        grid.innerHTML = cards.map(card => `
            <div class="serie-card-pro ${currentSerieFilter === card.id ? 'selected' : ''} ${card.disabled ? 'disabled' : ''}" 
                 data-serie="${card.id}" 
                 data-name="${card.name.toLowerCase()}"
                 ${card.disabled ? '' : `onclick="selectSerie('${card.id}', '${card.name}')"`}>
                <div class="serie-card-bg" style="background-image: url('${card.bg}')"></div>
                <div class="serie-shine-card"></div>
                ${card.disabled ? '<div class="serie-card-soon">SOON</div>' : ''}
                <div class="serie-card-content">
                    <div class="serie-card-name">${card.name}</div>
                    <div class="serie-card-subtitle">${card.subtitle}</div>
                </div>
            </div>
        `).join('');

        console.log('✅ Stats séries chargées:', stats);

    } catch (error) {
        console.error('❌ Erreur chargement stats séries:', error);

        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--danger);">
                <div style="font-size: 1.5rem; margin-bottom: 8px;">❌</div>
                <div>Erreur de chargement</div>
            </div>
        `;
    }
}


function selectSerie(serieId, serieName) {
    if (isGameInProgress()) {
        console.log('⚠️ Impossible de changer le filtre pendant une partie');
        return;
    }

    currentSerieFilter = serieId;

    // 🔥 FIX: Mettre à jour visuellement TOUTES les cartes
    document.querySelectorAll('.serie-card-pro').forEach(card => {
        if (card.dataset.serie === serieId) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });

    // Mettre à jour le bouton principal
    const filterText = document.getElementById('serieFilterText');
    const filterBg = document.getElementById('serieFilterBg');

    if (filterText) {
        filterText.textContent = serieName;
    }

    if (filterBg) {
        filterBg.style.backgroundImage = `url('overall.jpg')`;
    }

    // Envoyer au serveur
    fetch('/admin/set-serie-filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ filter: serieId })
    }).then(response => response.json())
        .then(data => console.log('✅ Filtre série synchronisé:', data))
        .catch(err => console.error('❌ Erreur sync filtre série:', err));

    console.log(`✅ Filtre série: ${serieName}`);

    // Fermer le panel
    closeSeriePanel();
}

function filterSerieCards() {
    const search = document.getElementById('serieSearch').value.toLowerCase();
    const cards = document.querySelectorAll('.serie-card-pro'); // 🔥 Changé de .serie-card à .serie-card-pro

    cards.forEach(card => {
        const name = card.dataset.name; // Récupère data-name
        if (name && name.includes(search)) {
            card.style.display = 'flex'; // 🔥 Changé de 'block' à 'flex' (pour le layout)
        } else {
            card.style.display = 'none';
        }
    });
}

function updateLiveAnswerDisplay(data) {
    const { answerCounts, answeredCount } = data;

    // Mettre à jour chaque pourcentage
    for (let answerIndex = 1; answerIndex <= 6; answerIndex++) {
        const count = answerCounts[answerIndex] || 0;
        const percentage = answeredCount > 0
            ? Math.round((count / answeredCount) * 100)
            : 0;

        const percentElem = document.getElementById(`percent-${answerIndex}`);
        if (percentElem) {
            percentElem.textContent = percentage > 0 ? `${percentage}%` : '';
        }
    }
}


// Gestion du formulaire d'ajout de question
if (document.getElementById('addQuestionForm')) {
    document.getElementById('addQuestionForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const statusDiv = document.getElementById('addQuestionStatus');
        statusDiv.style.display = 'none';

        const formData = {
            question: document.getElementById('questionText').value,
            answer1: document.getElementById('answer1').value,
            answer2: document.getElementById('answer2').value,
            answer3: document.getElementById('answer3').value,
            answer4: document.getElementById('answer4').value,
            answer5: document.getElementById('answer5').value,
            answer6: document.getElementById('answer6').value,
            correctAnswer: document.getElementById('correctAnswer').value,
            serie: document.getElementById('serie').value,
            difficulty: document.getElementById('difficulty').value
        };

        try {
            const response = await fetch('/admin/add-question', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                statusDiv.textContent = '✅ Question ajoutée avec succès !';
                statusDiv.style.background = 'rgba(16, 185, 129, 0.2)';
                statusDiv.style.color = '#10b981';
                statusDiv.style.border = '1px solid #10b981';
                statusDiv.style.display = 'block';

                // Reset form
                document.getElementById('addQuestionForm').reset();

            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            statusDiv.textContent = '❌ Erreur: ' + error.message;
            statusDiv.style.background = 'rgba(239, 68, 68, 0.2)';
            statusDiv.style.color = '#ef4444';
            statusDiv.style.border = '1px solid #ef4444';
            statusDiv.style.display = 'block';
        }
    });
}


window.addEventListener('beforeunload', () => {
    fetch('/admin/logout-silent', {
        method: 'POST',
        credentials: 'same-origin',
        keepalive: true
    });
});


// ============ INIT ============
checkAuth();


