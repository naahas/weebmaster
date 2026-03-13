// ============================================
// 💣 BOMBANIME - Admin Module
// Requires: socket, currentGameMode, twitchUser, returnToIdle
//           playAdminSound, adminSounds, startAdminTicking,
//           stopAdminTicking, updateAdminTictacSpeed,
//           showSoundControl, showSuggestionButton
// ============================================

function initBombanimeSocketHandlers(socket) {
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
            classicWinnerOverlay.style.display = ''; // 🔥 FIX: Reset le display:none
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
            
            // Son 'c'est ton tour' pour admin-joueur
            if (isMyTurn) {
                playAdminSound(adminSounds.bombanimePlayerTurn);
            }
            
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
        stopAdminTicking();
        playAdminSound(adminSounds.bombanimePass); // 🔊
        addBombanimeLog('success', data);
        onBombanimeNameAccepted(data);
        
        // 🖼️ Afficher l'image du personnage
        if (data.characterImage && bombanimeState.showCharacterImages !== false) {
            showCharacterFlash(data.characterImage, data.name);
        }
        
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
        stopAdminTicking();
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
        stopAdminTicking();
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

// ============================================
// 💣 BOMBANIME - Fonctions Admin
// ============================================

let bombanimeState = {
    active: false,
    playersOrder: [],
    playersData: [],
    currentPlayerTwitchId: null,
    timer: 8,
    timeRemaining: 8,
    timerInterval: null,
    serie: 'Naruto',
    lastValidName: null,
    isFirstTurn: true, // 💣 Track premier tour pour délai input
    showCharacterImages: true, // 🖼️ Afficher les images de personnages
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
    bombanimeState.active = true;
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
    'Prota' : 'Protagonist',
    'Manganime': 'Manganime'
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
    
    // 🔥 Détecter les nouvelles lettres pour animation
    const prevAlphabet = renderAdminBombanimeAlphabet._prev || new Set();
    const newLetters = new Set([...myAlphabet].filter(l => !prevAlphabet.has(l)));
    renderAdminBombanimeAlphabet._prev = new Set(myAlphabet);
    
    let gridHTML = '';
    // Main grid (A-X, 8 rows of 3)
    for (let i = 0; i < 24; i++) {
        const l = letters[i];
        const isUsed = myAlphabet.has(l);
        const isNew = newLetters.has(l);
        gridHTML += `<div class="alphabet-letter ${isUsed ? 'used' : ''}${isNew ? ' just-added' : ''}">${l}</div>`;
    }
    // Last row Y-Z
    const lastRowHTML = `
        <div class="alphabet-last-row">
            <div class="alphabet-letter ${myAlphabet.has('Y') ? 'used' : ''}${newLetters.has('Y') ? ' just-added' : ''}">Y</div>
            <div class="alphabet-letter ${myAlphabet.has('Z') ? 'used' : ''}${newLetters.has('Z') ? ' just-added' : ''}">Z</div>
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
    
    // Bombe redesign au centre
    const stateClass = bombanimeState.timeRemaining <= 2 ? 'state-critical' : bombanimeState.timeRemaining <= 5 ? 'state-warning' : 'state-normal';
    const bombHTML = `
        <div class="bomb-container">
            <div class="bomb-wrapper ${stateClass}" id="bombWrapper" style="--bomb-size: ${bombSize}px;">
                <div class="bomb-body-wrap">
                    <div class="bomb-body"><div class="bomb-cracks"></div></div>
                    <div class="bomb-pulse"></div>
                </div>
                <div class="fuse-pivot" id="bombFuseContainer">
                    <div class="fuse-inner">
                        <div class="fuse-socle"></div>
                        <div class="fuse-wave-wrap">
                            <svg class="fuse-wave-svg" viewBox="0 0 52 12">
                                <path d="M0,6 Q13,2.5 26,6 Q39,9.5 52,6"/>
                            </svg>
                        </div>
                        <div class="fuse-spark-wrap">
                            <div class="fuse-spark"></div>
                            <div class="mini-sparks">
                                <div class="mini-s"></div><div class="mini-s"></div>
                                <div class="mini-s"></div><div class="mini-s"></div>
                            </div>
                        </div>
                    </div>
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
            fuseContainer.style.transform = `rotate(${fuseAngle - 90}deg)`;
        }
        // 💥 Appliquer effets crack/shatter
        updateAdminBombanimeEffects();
    });
}

// Mettre à jour le cercle (nouveau tour)
function updateBombanimeCircle(data) {
    bombanimeState.currentPlayerTwitchId = data.currentPlayerTwitchId;
    bombanimeState.timeRemaining = data.timer;
    
    // Demarrer le tictac
    startAdminTicking();
    
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
    const wrapper = document.getElementById('bombWrapper');
    if (!wrapper) return;
    
    updateAdminTictacSpeed(bombanimeState.timeRemaining);
    
    wrapper.classList.remove('state-normal', 'state-warning', 'state-critical');
    if (bombanimeState.timeRemaining <= 2) {
        wrapper.classList.add('state-critical');
    } else if (bombanimeState.timeRemaining <= 5) {
        wrapper.classList.add('state-warning');
    } else {
        wrapper.classList.add('state-normal');
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
        fuseContainer.style.transform = `rotate(${fuseAngle - 90}deg)`;
    }
}

// Nom accepté
function onBombanimeNameAccepted(data) {
    bombanimeState.playersData = data.playersData;
    bombanimeState.lastValidName = data.name;
    
    // 🆕 Reset immédiat de la couleur de la bombe (gris)
    const wrapper = document.getElementById('bombWrapper');
    if (wrapper) {
        wrapper.classList.remove('state-warning', 'state-critical');
        wrapper.classList.add('state-normal');
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

// 💥 CRACK - Injection des fissures
function injectCrackOverlay(hex) {
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
}

// 💀 SHATTER - Injection des fragments
function injectShatterEffect(hex) {
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
}

// 🔄 Mise à jour effets crack/shatter admin - vérifie le DOM
function updateAdminBombanimeEffects() {
    if (!bombanimeState.playersData) return;
    bombanimeState.playersData.forEach(p => {
        const slot = document.getElementById(`player-slot-${p.twitchId}`);
        if (!slot) return;
        const hex = slot.querySelector('.player-hex');
        if (!hex) return;
        if (p.lives === 1) {
            const isNew = !hex.querySelector('.crack-overlay');
            injectCrackOverlay(hex);
            slot.classList.add('cracked');
            if (isNew) { slot.classList.add('crack-flash-active'); setTimeout(() => slot.classList.remove('crack-flash-active'), 400); }
        } else if (p.lives > 1) {
            slot.classList.remove('cracked', 'crack-flash-active');
            hex.querySelectorAll('.crack-overlay,.crack-vignette,.crack-flash,.crack-ember').forEach(e => e.remove());
        }
        if (p.lives === 0) {
            slot.classList.remove('cracked', 'crack-flash-active');
            hex.querySelectorAll('.crack-overlay,.crack-vignette,.crack-flash,.crack-ember').forEach(e => e.remove());
            injectShatterEffect(hex);
            slot.classList.add('shattering');
        }
    });
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
        const bombWrapper = document.getElementById('bombWrapper');
        if (bombWrapper) {
            bombWrapper.classList.add('exploding');
            setTimeout(() => bombWrapper.classList.remove('exploding'), 250);
        }
    }, 50); // Délai minimal
    
    console.log('💥 BombAnime: Explosion sur', data.playerUsername, '- Vies restantes:', data.livesRemaining);
    
    // 💥 Crack/shatter effects (immédiat après le shake)
    setTimeout(() => updateAdminBombanimeEffects(), 100);
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
    
    // 💥 Retirer crack si regain de vie
    setTimeout(() => updateAdminBombanimeEffects(), 400);
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
    
    // 💥 Crack/shatter effects
    updateAdminBombanimeEffects();
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
    
    // 🔊 Couper le tictac + timer immédiatement
    stopAdminTicking();
    if (bombanimeState.timerInterval) {
        clearInterval(bombanimeState.timerInterval);
        bombanimeState.timerInterval = null;
    }
    bombanimeState.active = false; // Empêche les events socket de relancer le son
    
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
// 🖼️ BOMBANIME - Flash Image Personnage
// ============================================

function showCharacterFlash(imageUrl, characterName) {
    // Supprimer le flash précédent s'il existe
    const existing = document.getElementById('characterFlash');
    if (existing) existing.remove();
    
    // Créer l'élément flash
    const flash = document.createElement('div');
    flash.id = 'characterFlash';
    flash.className = 'character-flash';
    flash.innerHTML = `<img src="${imageUrl}" alt="${characterName}" draggable="false" onerror="this.parentElement.remove()"/>`;
    
    // Insérer dans le container de la bombe
    const bombWrapper = document.getElementById('bombWrapper');
    if (bombWrapper) {
        bombWrapper.appendChild(flash);
    } else {
        const gameZone = document.getElementById('bombanimeGameZone') || document.getElementById('bombanimeAdminContainer');
        if (gameZone) gameZone.appendChild(flash);
    }
    
    // Trigger l'animation
    requestAnimationFrame(() => flash.classList.add('active'));
    
    // Supprimer après l'animation (0.8s)
    setTimeout(() => flash.remove(), 850);
}

// Toggle images personnages (admin)
function toggleCharacterImages() {
    bombanimeState.showCharacterImages = !bombanimeState.showCharacterImages;
    const btn = document.getElementById('toggleCharImagesBtn');
    if (btn) {
        btn.classList.toggle('disabled', !bombanimeState.showCharacterImages);
        btn.title = bombanimeState.showCharacterImages ? 'Masquer les images' : 'Afficher les images';
    }
    console.log(`🖼️ Images personnages: ${bombanimeState.showCharacterImages ? 'ON' : 'OFF'}`);
}