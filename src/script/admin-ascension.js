// ═══════════════════════════════════════════
// 🏔️ ASCENSION — Admin Game UI
// ═══════════════════════════════════════════

let ascensionState = {
    active: false,
    floors: 15,
    timer: 15,
    currentFloor: 0,
    players: [],
    playerProgress: [],
    floorData: null,
    timerEndTime: null,
    timerRAF: null,
    isAdminPlayer: false,  // 🆕 True si l'admin a rejoint en tant que joueur
    guessSolved: {},       // 🆕 Tracking des guesses validées (mode guess)
};

// 🆕 Tracker pour la déduplication des renders d'étage (évite double-render au visibilitychange)
let _lastAscFloorRenderAdmin = null;

function initAscensionSocketHandlers(socket) {
    
    socket.on('ascension-game-started', (data) => {
        console.log('🏔️ Ascension démarrée:', data);
        ascensionState.active = true;
        ascensionState.floors = data.floors || 15;
        ascensionState.timer = data.timer || 15;
        ascensionState.players = data.players || [];
        ascensionState.playerProgress = data.players || [];
        ascensionState.currentFloor = 0;
        ascensionState.guessSolved = {};
        // 🆕 Reset état validated + cibles draggées (résidus possibles d'une partie précédente
        //    qui empêchaient le drag and drop au 1er étage Order de la nouvelle partie)
        ascensionState.validated = false;
        ascensionState.myValidatedGuesses = [];
        ascensionState.intruderFound = null;  // 🆕 Reset tracker Intruder
        // 🆕 Reset le tracker de dédup pour la nouvelle game
        _lastAscFloorRenderAdmin = null;
        
        // 🎮 Admin joue toujours (en tant que joueur normal s'il a rejoint, sinon en ghost = invisible au classement)
        ascensionState.isAdminPlayer = true;

        showAscensionGameUI();
        _startAscensionCountdown(data.countdownEndsAt);

        // 🆕 Re-bind du socketId admin côté serveur (sans déclencher de render — on attend le floor-start)
        if (typeof twitchUser !== 'undefined' && twitchUser && twitchUser.id) {
            socket.emit('ascension-admin-bind', { twitchId: twitchUser.id });
        }
    });
    
    socket.on('ascension-state', (data) => {
        if (data && data.active) {
            // 🆕 SOFT SYNC : si UI déjà rendue sur le même étage, juste resync les progress
            //    (évite le re-render complet qui viderait les inputs / stamps en cours)
            const incomingFloor = data.currentFloor || 0;
            const uiIsRendered = !!document.getElementById('ascContent')?.children.length;
            const sameFloor = ascensionState.active && ascensionState.currentFloor === incomingFloor;
            
            if (uiIsRendered && sameFloor) {
                console.log('🏔️ Soft sync admin (UI déjà rendue, même étage)');
                ascensionState.playerProgress = data.playerProgress || ascensionState.playerProgress;
                _updateAscensionTower();
                return;
            }
            
            ascensionState.active = true;
            ascensionState.floors = data.floors || 15;
            ascensionState.timer = data.timer || 30;
            ascensionState.currentFloor = incomingFloor;
            ascensionState.playerProgress = data.playerProgress || [];
            ascensionState.floorData = data.floorData;
            ascensionState.timerEndTime = data.floorTimerEndTime;
            ascensionState.myValidatedGuesses = data.myValidatedGuesses || [];  // 🆕 Pour restaurer les stamps si admin-joueur
            ascensionState.myGuessJokerUsed = !!data.myGuessJokerUsed;            // 🆕 Joker Guess déjà consommé pour cet étage (anti-spam refresh)
            
            // 🎮 Reconnexion : détecter si admin est joueur (joueur normal OU ghost)
            ascensionState.isAdminPlayer = true; // 🆕 Admin joue toujours (en ghost si pas inscrit)
            
            showAscensionGameUI();
            
            // Reveal UI immediately (no countdown on reconnect)
            setTimeout(() => {
                document.querySelectorAll('.asc-pre-start').forEach(el => {
                    el.classList.remove('asc-pre-start');
                    el.classList.add('asc-reveal');
                });
            }, 50);
            
            _updateAscensionTower();
            if (data.floorData) _renderAscensionFloor(data.floorData, data.currentFloor);
            if (data.floorTimerEndTime) _startAscensionTimer(data.floorTimerEndTime);
        }
    });
    
    socket.on('ascension-floor-start', (data) => {
        console.log(`🐛 [client] ascension-floor-start reçu - étage ${data.floor + 1}:`, data.floorData?.type, 'socket.id=', socket.id);
        ascensionState.currentFloor = data.floor;
        ascensionState.floorData = data.floorData;
        ascensionState.playerProgress = data.playerProgress || ascensionState.playerProgress;
        ascensionState.timerEndTime = data.timerEndTime;
        ascensionState.guessSolved = {};  // Reset pour ce nouvel étage
        ascensionState.myValidatedGuesses = [];  // 🆕 Nouveau floor → vide (la restauration n'a lieu qu'au reload via ascension-state)
        ascensionState.myGuessJokerUsed = false;  // 🆕 Reset le flag joker (sinon état "used" hérité du floor précédent)
        ascensionState.validated = false;  // 🆕 Reset l'état validated du floor précédent (Order surtout)
        ascensionState.intruderFound = null;  // 🆕 Reset tracker Intruder pour le nouveau floor
        
        // Reveal UI elements (hidden during countdown)
        document.querySelectorAll('.asc-pre-start').forEach(el => {
            el.classList.remove('asc-pre-start');
            el.classList.add('asc-reveal');
        });
        
        // 🆕 Transition entre étages (étage N → N+1) : slide-up-out + stagger-in.
        // Pas de transition au 1er render après countdown (DOM vide).
        const content = document.getElementById('ascContent');
        const titleEl = document.getElementById('ascFloorTitle');
        const isTransition = content && content.children.length > 0;
        
        if (isTransition) {
            _renderAscensionFloor(data.floorData, data.floor);
            _startAscensionTimer(data.timerEndTime);
            _updateAscensionTower();
            
            // Animation simple sur content (1 seule classe, après render)
            if (content) {
                // 🆕 BUGFIX double pop : retirer asc-reveal AVANT d'ajouter stagger-in.
                //    Sinon quand on retire stagger-in à 700ms, le browser réévalue les
                //    animations et REDÉCLENCHE ascReveal sur le content (2ème pop).
                content.classList.remove('asc-reveal');
                content.classList.remove('asc-stagger-in', 'asc-stagger-d4');
                void content.offsetWidth;
                content.classList.add('asc-stagger-in', 'asc-stagger-d4');
                setTimeout(() => {
                    content.classList.remove('asc-stagger-in', 'asc-stagger-d4');
                }, 700);
            }
            // 🆕 Le titre garde asc-reveal aussi, on le retire au passage
            if (titleEl) {
                titleEl.classList.remove('asc-reveal');
            }
        } else {
            _renderAscensionFloor(data.floorData, data.floor);
            _startAscensionTimer(data.timerEndTime);
            _updateAscensionTower();
        }
    });
    
    socket.on('ascension-floor-end', (data) => {
        ascensionState.playerProgress = data.playerProgress || ascensionState.playerProgress;
        _stopAscensionTimer();
        _updateAscensionTower();
    });
    
    socket.on('ascension-progress', (data) => {
        ascensionState.playerProgress = data.playerProgress || ascensionState.playerProgress;
        _updateAscensionTower();
    });
    
    socket.on('ascension-answer-result', (data) => {
        if (data.correct) {
            _flashAscensionSuccess();
        }
    });
    
    // 🎯 Joker Guess côté admin-player : le serveur révèle le nom (anti-triche)
    socket.on('ascension-guess-joker-revealed', (data) => {
        if (!data || !data.characterId || typeof data.name !== 'string') return;
        if (!ascensionState.isAdminPlayer) return;
        const card = document.querySelector(`.asc-guess-card[data-char-id="${data.characterId}"]`);
        const input = card?.querySelector('.asc-guess-input');
        if (input && !input.disabled) {
            input.value = data.name;
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        }
        _playAdminGuessJokerSound();
        _shatterAllAdminGuessJokers();
    });

    // 🎯 Validation incrémentale du mini-jeu Guess côté admin-player
    socket.on('ascension-guess-result', (data) => {
        if (!data || !data.characterId) return;
        if (!ascensionState.isAdminPlayer) return;  // Admin spectateur ignore
        
        const card = document.querySelector(`.asc-guess-card[data-char-id="${data.characterId}"]`);
        const input = card?.querySelector('.asc-guess-input');
        
        if (data.correct) {
            const wasNew = !ascensionState.guessSolved || !ascensionState.guessSolved[data.characterId];
            if (!ascensionState.guessSolved) ascensionState.guessSolved = {};
            ascensionState.guessSolved[data.characterId] = true;

            // 🆕 Incrémente progression du joker (max 2, 1x par perso)
            if (wasNew && ascensionState.guessJoker && !ascensionState.guessJoker.used && ascensionState.guessJoker.progress < 2) {
                ascensionState.guessJoker.progress++;
                _updateAdminGuessJokerVisual();
            }

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
            
            // Petit son success (sweep descendant + click → feeling validation tech)
            try {
                if (!window._ascAdminAudioCtx) {
                    window._ascAdminAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
                }
                const ctx = window._ascAdminAudioCtx;
                if (ctx.state === 'suspended') ctx.resume();
                const t = ctx.currentTime;
                
                // Couche 1 — Click percussif court (attaque)
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
                
                // Couche 2 — Body warm descendant (confirmation)
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
            
            // Pop animation punchy sur la card validée
            if (card) {
                card.classList.remove('asc-guess-pop');
                void card.offsetWidth;
                card.classList.add('asc-guess-pop');
            }
            
            // 🆕 Focus sur le prochain input non-disabled à DROITE de celui qu'on vient de valider
            const allCards = Array.from(document.querySelectorAll('.asc-guess-card'));
            const validatedIdx = allCards.findIndex(c => c.dataset.charId === data.characterId);
            let nextInput = null;
            for (let i = validatedIdx + 1; i < allCards.length; i++) {
                const inp = allCards[i].querySelector('.asc-guess-input');
                if (inp && !inp.disabled) { nextInput = inp; break; }
            }
            if (!nextInput && validatedIdx > 0) {
                for (let i = 0; i < validatedIdx; i++) {
                    const inp = allCards[i].querySelector('.asc-guess-input');
                    if (inp && !inp.disabled) { nextInput = inp; break; }
                }
            }
            if (nextInput) nextInput.focus();
        } else {
            // 🆕 Shake UNIQUEMENT sur Enter explicite, pas à chaque frappe
            if (data.source === 'enter' && card) {
                card.classList.remove('asc-guess-shake');
                void card.offsetWidth;
                card.classList.add('asc-guess-shake');
            }
        }
    });
    
    // 🎯 Validation du mini-jeu Order côté admin — l'ordre est correct, on marque visuellement
    socket.on('ascension-order-result', (data) => {
        if (!data || !data.correct) return;
        ascensionState.validated = true;
        
        const grid = document.querySelector('.asc-order-grid');
        if (!grid) return;
        
        // 🆕 Cascade : ajoute la classe correct + transforme le badge num en badge ✓
        const cards = Array.from(grid.querySelectorAll('.asc-order-card'));
        cards.forEach((c, i) => {
            setTimeout(() => {
                c.classList.add('asc-order-correct');
                const numBadge = c.querySelector('.asc-order-num');
                if (numBadge && !numBadge.dataset.validated) {
                    numBadge.dataset.validated = '1';
                    numBadge.innerHTML = '<svg class="asc-order-check" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12 L10 18 L20 6" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                }
            }, i * 80);
        });
        
        // Petit son success (sweep descendant + click) — réutilise le AudioContext partagé
        try {
            if (!window._ascAdminAudioCtx) {
                window._ascAdminAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            const ctx = window._ascAdminAudioCtx;
            if (ctx.state === 'suspended') ctx.resume();
            const t = ctx.currentTime;
            const click = ctx.createOscillator();
            const clickGain = ctx.createGain();
            click.type = 'triangle';
            click.frequency.setValueAtTime(2200, t);
            click.frequency.exponentialRampToValueAtTime(900, t + 0.04);
            clickGain.gain.setValueAtTime(0, t);
            clickGain.gain.linearRampToValueAtTime(0.05, t + 0.002);
            clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
            click.connect(clickGain).connect(ctx.destination);
            click.start(t); click.stop(t + 0.06);
            const body = ctx.createOscillator();
            const bodyGain = ctx.createGain();
            body.type = 'sine';
            body.frequency.setValueAtTime(720, t + 0.01);
            body.frequency.exponentialRampToValueAtTime(440, t + 0.18);
            bodyGain.gain.setValueAtTime(0, t + 0.01);
            bodyGain.gain.linearRampToValueAtTime(0.07, t + 0.025);
            bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
            body.connect(bodyGain).connect(ctx.destination);
            body.start(t + 0.01); body.stop(t + 0.24);
        } catch(e) { /* ignore */ }
    });
    
    // 🎯 Validation incrémentale Intruder côté admin
    socket.on('ascension-intruder-result', (data) => {
        if (!data || !data.characterId) return;
        _handleAdminIntruderResult(data);
    });

    // 🎯 Validation Wordle côté admin
    socket.on('ascension-wordle-result', (data) => {
        if (!data || typeof data.guess !== 'string') return;
        _handleAdminWordleResult(data);
    });

    // 🎯 Validation Match côté admin
    socket.on('ascension-match-result', (data) => {
        if (!data || !Array.isArray(data.results)) return;
        _handleAdminMatchResult(data);
    });

    // 🎯 Validation Target côté admin
    socket.on('ascension-target-result', (data) => {
        if (!data || !data.characterId) return;
        _handleAdminTargetResult(data);
    });

    // 🎯 Validation Scramble côté admin
    socket.on('ascension-scramble-result', (data) => {
        if (!data || typeof data.guess !== 'string') return;
        _handleAdminScrambleResult(data);
    });

    socket.on('ascension-game-end', (data) => {
        console.log('🏔️ Ascension terminée:', data);
        _stopAscensionTimer();
        _showAscensionPodium(data.podium, data.winner);
    });

    // 🎁 Rewards Ascension reçus côté admin (XP + S-Coins) — affiche la barre en haut si l'admin a joué
    socket.on('ascension-rewards-ready', (data) => {
        console.log('🎁 Rewards Ascension reçus (admin):', data);
        if (!data || !data.rewardsData) return;
        if (typeof twitchUser === 'undefined' || !twitchUser || !twitchUser.id) return;
        const myReward = data.rewardsData[twitchUser.id];
        if (!myReward) return;
        // 🆕 Skip si l'écran ascension n'est plus visible (lobby déjà refermé, etc.)
        const container = document.getElementById('ascensionGameContainer');
        if (!container || container.style.display === 'none') return;
        // Réutilise la barre admin de Bombanime (fonction globale, layout identique)
        if (typeof showBombanimeAdminReward === 'function') {
            showBombanimeAdminReward(myReward);
            // 🆕 Auto-cleanup après 25s pour éviter qu'elle persiste indéfiniment
            if (window._ascensionRewardCleanupTimer) clearTimeout(window._ascensionRewardCleanupTimer);
            window._ascensionRewardCleanupTimer = setTimeout(() => {
                if (typeof closeBombanimeAdminReward === 'function') closeBombanimeAdminReward();
            }, 25000);
        }
    });
}

// ═══ Game UI ═══

function showAscensionGameUI() {
    // 🆕 Cleanup d'une éventuelle reward bar persistante de la partie précédente
    if (typeof closeBombanimeAdminReward === 'function') closeBombanimeAdminReward();
    if (window._ascensionRewardCleanupTimer) {
        clearTimeout(window._ascensionRewardCleanupTimer);
        window._ascensionRewardCleanupTimer = null;
    }
    const stateLobby = document.getElementById('stateLobby');
    if (stateLobby) { stateLobby.classList.remove('active'); stateLobby.style.opacity = '0'; stateLobby.style.pointerEvents = 'none'; }
    
    const mainContainer = document.getElementById('mainContainer');
    if (mainContainer) mainContainer.style.display = 'none';
    
    const bgText = document.querySelector('.bg-text');
    if (bgText) bgText.style.display = 'none';
    
    let container = document.getElementById('ascensionGameContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'ascensionGameContainer';
        container.className = 'asc-container';
        document.body.appendChild(container);
    }
    
    container.style.display = 'flex';
    container.innerHTML = `
        <div class="asc-game-area">
            <div class="asc-topbar asc-pre-start">
                <div class="asc-topbar-left">
                    <div class="asc-timer-wrap" id="ascTimerWrap">
                        <svg class="asc-timer-svg" viewBox="0 0 44 44" width="36" height="36">
                            <circle class="asc-timer-bg" cx="22" cy="22" r="18"/>
                            <circle class="asc-timer-fill" id="ascTimerFill" cx="22" cy="22" r="18"/>
                        </svg>
                        <div class="asc-timer-text" id="ascTimerText"></div>
                    </div>
                </div>
            </div>
            <div class="asc-floor-title asc-pre-start" id="ascFloorTitle"></div>
            <div class="asc-content asc-pre-start" id="ascContent">
                <!-- Mini-game renders here -->
            </div>
        </div>
        <div class="asc-tower asc-tower-reveal">
            <div class="asc-tower-glow"></div>
            <div class="asc-tower-sparks" id="ascTowerSparks"></div>
            <div class="asc-tower-links"></div>
            <div class="asc-tower-crown">
                <svg viewBox="0 0 60 64" width="40" height="42" fill="none" aria-hidden="true">
                    <defs>
                        <linearGradient id="ascCrownGradAdm" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stop-color="#fff5c8"/>
                            <stop offset="100%" stop-color="#a87012"/>
                        </linearGradient>
                    </defs>
                    <path d="M30 4 Q22 18 26 30 L30 36 L34 30 Q38 18 30 4 Z" fill="url(#ascCrownGradAdm)" stroke="#7a5210" stroke-width="1"/>
                    <path d="M30 24 Q14 16 10 30 Q12 38 26 32 Z" fill="url(#ascCrownGradAdm)" stroke="#7a5210" stroke-width="1"/>
                    <path d="M30 24 Q46 16 50 30 Q48 38 34 32 Z" fill="url(#ascCrownGradAdm)" stroke="#7a5210" stroke-width="1"/>
                    <rect x="14" y="30" width="32" height="6" rx="1" fill="#a87012" stroke="#5a3a08" stroke-width="0.6"/>
                    <path d="M28 36 L24 56 L36 56 L32 36 Z" fill="url(#ascCrownGradAdm)" stroke="#7a5210" stroke-width="1"/>
                </svg>
            </div>
            <div class="asc-tower-summit-aura"></div>
            <div class="asc-tower-platforms" id="ascTowerPlatforms"></div>
            <div class="asc-tower-players" id="ascTowerPlayers"></div>
        </div>
        <button class="asc-close-btn" id="ascensionCloseBtn">Fermer lobby</button>
        <div class="asc-confirm-overlay" id="ascensionConfirmOverlay">
            <div class="asc-confirm-modal">
                <div class="asc-confirm-title">Fermer le lobby ?</div>
                <div class="asc-confirm-sub">La partie en cours sera annulée</div>
                <div class="asc-confirm-btns">
                    <button class="asc-confirm-btn cancel" id="ascensionConfirmCancel">Annuler</button>
                    <button class="asc-confirm-btn confirm" id="ascensionConfirmYes">Confirmer</button>
                </div>
            </div>
        </div>
    `;
    
    // 🆕 Taille des avatars adaptée au nombre d'étages (sinon overlap quand beaucoup de floors)
    const towerEl = document.querySelector('.asc-tower');
    if (towerEl) {
        const f = ascensionState.floors || 15;
        let size = 28;
        if (f >= 25) size = 18;
        else if (f >= 20) size = 21;
        else if (f >= 15) size = 24;
        else if (f >= 10) size = 26;
        towerEl.style.setProperty('--asc-avatar-size', size + 'px');
        towerEl.style.setProperty('--asc-avatar-font', Math.round(size * 0.42) + 'px');
    }

    // 🆕 Génère les plateformes (1 par étage), majeures tous les 5, summit pour la dernière
    const platformsEl = document.getElementById('ascTowerPlatforms');
    if (platformsEl) {
        const total = ascensionState.floors;
        for (let i = 0; i < total; i++) {
            const p = document.createElement('div');
            const isSummit = (i === total - 1);
            let cls = 'asc-tower-platform';
            if ((i + 1) % 5 === 0) cls += ' major';
            if (isSummit) cls += ' summit';
            p.className = cls;
            p.style.bottom = (i / total * 100) + '%';
            p.innerHTML = '<div class="asc-tower-disc"></div>'
                + (isSummit ? '<div class="asc-tower-summit-rays"></div>' : '');
            platformsEl.appendChild(p);
        }
    }

    // 🆕 Étincelles
    const sparksEl = document.getElementById('ascTowerSparks');
    if (sparksEl) {
        for (let i = 0; i < 16; i++) {
            const s = document.createElement('div');
            s.className = 'asc-tower-spark';
            s.style.left = (15 + Math.random() * 70) + '%';
            s.style.bottom = (-5 - Math.random() * 20) + 'px';
            s.style.animationDuration = (3 + Math.random() * 4) + 's';
            s.style.animationDelay = (Math.random() * 5) + 's';
            sparksEl.appendChild(s);
        }
    }

    // Wire close button
    _wireAscensionCloseBtn();

    // Init tower players
    _updateAscensionTower();
}

function hideAscensionGameUI() {
    ascensionState.active = false;
    _stopAscensionTimer();

    const container = document.getElementById('ascensionGameContainer');
    if (container) { container.style.display = 'none'; container.innerHTML = ''; }

    const mainContainer = document.getElementById('mainContainer');
    if (mainContainer) mainContainer.style.display = '';

    const bgText = document.querySelector('.bg-text');
    if (bgText) bgText.style.display = '';

    // 🆕 Cleanup de la barre reward XP/Coins éventuellement encore visible
    if (typeof closeBombanimeAdminReward === 'function') {
        closeBombanimeAdminReward();
    } else {
        const rewardBar = document.getElementById('bombanimeAdminReward');
        if (rewardBar) rewardBar.remove();
    }
    if (window._ascensionRewardCleanupTimer) {
        clearTimeout(window._ascensionRewardCleanupTimer);
        window._ascensionRewardCleanupTimer = null;
    }
}

// ═══ Tower ═══

function _updateAscensionTower() {
    const playersEl = document.getElementById('ascTowerPlayers');
    if (!playersEl) return;

    const progress = ascensionState.playerProgress;
    if (!progress || progress.length === 0) return;

    const COLORS = ['#50dc78', '#ef7844', '#788cff', '#ff50a0', '#ffd700', '#00d4ff', '#c084fc', '#f97316'];
    const floors = ascensionState.floors;

    const byFloor = {};
    progress.forEach(p => {
        const f = p.floor;
        if (!byFloor[f]) byFloor[f] = [];
        byFloor[f].push(p);
    });

    const escapeHtml = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const initial = (n) => { const t = (n || '?').trim(); return t ? t.charAt(0).toUpperCase() : '?'; };

    // 🆕 Mise à jour incrémentale (préserve la transition CSS sur bottom)
    const seen = new Set();
    progress.forEach((p, i) => {
        const color = COLORS[i % COLORS.length];
        const pct = floors > 0 ? (p.floor / floors * 100) : 0;
        const key = p.twitchId || ('idx-' + i);
        seen.add(key);

        const sameFloorList = byFloor[p.floor] || [];
        const myIdxOnFloor = sameFloorList.indexOf(p);
        const sameCount = sameFloorList.length;
        const spread = 50;
        const offsetX = sameCount > 1
            ? ((myIdxOnFloor / (sameCount - 1)) - 0.5) * spread
            : 0;

        let el = playersEl.querySelector('.asc-tower-player[data-twitch-id="' + CSS.escape(String(key)) + '"]');
        if (!el) {
            el = document.createElement('div');
            el.className = 'asc-tower-player';
            el.dataset.twitchId = String(key);
            el.style.setProperty('--pcolor', color);

            // Avatar Twitch si dispo, sinon fallback initiale
            const avatarInner = p.avatarUrl
                ? '<img class="asc-tower-avatar-img" src="' + escapeHtml(p.avatarUrl) + '" alt="" draggable="false" onerror="this.replaceWith(Object.assign(document.createElement(\'span\'),{className:\'asc-tower-avatar-fallback\',textContent:\'' + escapeHtml(initial(p.username)) + '\'}))"/>'
                : '<span class="asc-tower-avatar-fallback">' + escapeHtml(initial(p.username)) + '</span>';
            el.innerHTML =
                  '<div class="asc-tower-avatar">' + avatarInner + '</div>'
                + '<div class="asc-tower-tip">' + escapeHtml(p.username) + '</div>';

            el.style.transition = 'none';
            el.style.bottom = pct + '%';
            el.style.left = 'calc(50% + ' + offsetX + 'px)';
            playersEl.appendChild(el);
            void el.offsetWidth;
            el.style.transition = '';
        } else {
            el.style.bottom = pct + '%';
            el.style.left = 'calc(50% + ' + offsetX + 'px)';
        }
    });

    playersEl.querySelectorAll('.asc-tower-player').forEach(node => {
        if (!seen.has(node.dataset.twitchId)) node.remove();
    });
}

// ═══ Floor rendering (admin spectator view) ═══

function _renderAscensionFloor(floorData, floorIndex) {
    // 🆕 Garde de déduplication : si on a déjà rendu ce floor il y a < 2s, on skip.
    const now = Date.now();
    const last = _lastAscFloorRenderAdmin;
    if (last && last.floor === floorIndex && (now - last.at) < 2000) {
        return;
    }
    _lastAscFloorRenderAdmin = { floor: floorIndex, at: now };
    
    const content = document.getElementById('ascContent');
    const floorNum = document.getElementById('ascFloorNum');
    const floorTitle = document.getElementById('ascFloorTitle');
    
    // 🆕 Cleanup du resize listener Order si on change d'étage
    _detachAdminOrderResize();
    
    // 🆕 Le badge ÉTAGE n'existe plus (le numéro est maintenant dans le titre central), reste safe
    if (floorNum) floorNum.textContent = floorIndex + 1;
    
    // Animate floor title + subtitle
    if (floorTitle) {
        // 🆕 Retirer asc-reveal (résiduel du 1er countdown reveal) pour éviter qu'il se
        //    redéclenche au moment où on retire `pop` plus tard.
        floorTitle.classList.remove('asc-reveal');
        floorTitle.classList.remove('pop');
        
        const desc = _getFloorDescription(floorData);
        const etageNum = floorIndex + 1;
        const label = floorData?.label || '';
        // 🆕 Pour Intruder : pas de subtitle (dans le sidebar) mais on garde le divider stylisé
        const isIntruder = floorData?.type === 'intruder';
        floorTitle.innerHTML = '<span class="asc-title-main">E' + etageNum + ' — ' + label + '</span>' +
            (desc ? '<div class="asc-title-divider"></div><span class="asc-title-sub">' + desc + '</span>'
                  : (isIntruder ? '<div class="asc-title-divider"></div>' : ''));
        void floorTitle.offsetHeight;
        floorTitle.classList.add('pop');
    }
    
    if (!content || !floorData) return;

    content.innerHTML = '';
    _cleanupAdminWordleKeyboard();  // 🆕 Démonte le keydown handler éventuellement actif
    _cleanupAdminScrambleKeyboard(); // 🆕 Démonte le keydown handler Scramble éventuellement actif
    _cleanupAdminMatchDrag();        // 🆕 Démonte les pointer handlers Match éventuellement actifs
    // 🆕 Cleanup joker Guess (mini-ampoules + shatter overlays orphelins)
    document.querySelectorAll('.asc-guess-joker-shatter').forEach(s => s.remove());

    // Render le mini-jeu correspondant
    switch (floorData.type) {
        case 'guess':
            if (ascensionState.isAdminPlayer) {
                _renderAdminGuessPlayer(content, floorData);  // Admin joue
            } else {
                _renderAdminGuessSpectator(content, floorData);  // Admin spectateur
            }
            break;
        case 'order':
            if (ascensionState.isAdminPlayer) {
                _renderAdminOrderPlayer(content, floorData);  // Admin joue avec drag & drop
            } else {
                _renderAdminOrderSpectator(content, floorData);  // Admin spectateur (read-only)
            }
            break;
        case 'intruder':
            if (ascensionState.isAdminPlayer) {
                _renderAdminIntruderPlayer(content, floorData);
            } else {
                _renderAdminIntruderSpectator(content, floorData);
            }
            break;
        case 'wordle':
            if (ascensionState.isAdminPlayer) {
                _renderAdminWordlePlayer(content, floorData);
            } else {
                _renderAdminWordleSpectator(content, floorData);
            }
            break;
        case 'match':
            if (ascensionState.isAdminPlayer) {
                _renderAdminMatchPlayer(content, floorData);
            } else {
                _renderAdminMatchSpectator(content, floorData);
            }
            break;
        case 'target':
            if (ascensionState.isAdminPlayer) {
                _renderAdminTargetPlayer(content, floorData);
            } else {
                _renderAdminTargetSpectator(content, floorData);
            }
            break;
        case 'scramble':
            if (ascensionState.isAdminPlayer) {
                _renderAdminScramblePlayer(content, floorData);
            } else {
                _renderAdminScrambleSpectator(content, floorData);
            }
            break;
        // Autres types à venir
        default:
            const fallback = document.createElement('div');
            fallback.className = 'asc-spectator-view';
            fallback.innerHTML = `
                <div class="asc-spectator-type">${floorData.type || ''}</div>
                <div class="asc-spectator-desc">${_getFloorDescription(floorData)}</div>
            `;
            content.appendChild(fallback);
    }
}

// 🆕 Apply stagger-in animation aux 4 éléments centraux (titre, divider, subtitle, content)
// Appelé après _renderAscensionFloor lors d'une transition d'étage à étage côté admin
function _applyAdminAscStaggerIn() {
    const titleEl = document.getElementById('ascFloorTitle');
    const content = document.getElementById('ascContent');
    
    const items = [
        { el: titleEl?.querySelector('.asc-title-main'),    delay: 'asc-stagger-d1' },
        { el: titleEl?.querySelector('.asc-title-divider'), delay: 'asc-stagger-d2' },
        { el: titleEl?.querySelector('.asc-title-sub'),     delay: 'asc-stagger-d3' },
        { el: content,                                       delay: 'asc-stagger-d4' },
    ];
    // 🆕 Applique d'abord les classes (qui posent opacity:0 via CSS), puis seulement après
    //    on retire l'inline opacity:0. Évite le flash visible intermédiaire.
    items.forEach(({ el, delay }) => {
        if (!el) return;
        el.classList.remove('asc-stagger-in', 'asc-stagger-d1', 'asc-stagger-d2', 'asc-stagger-d3', 'asc-stagger-d4');
        void el.offsetWidth;
        el.classList.add('asc-stagger-in', delay);
    });
    requestAnimationFrame(() => {
        if (titleEl) { titleEl.style.opacity = ''; titleEl.style.transform = ''; }
        if (content) { content.style.opacity = ''; content.style.transform = ''; }
    });
    setTimeout(() => {
        items.forEach(({ el }) => {
            if (el) el.classList.remove('asc-stagger-in', 'asc-stagger-d1', 'asc-stagger-d2', 'asc-stagger-d3', 'asc-stagger-d4');
        });
    }, 700);
}

// 🎯 Vue spectateur Guess côté admin — affiche les 5 persos avec leurs noms
function _renderAdminGuessSpectator(container, floorData) {
    const wrap = document.createElement('div');
    wrap.className = 'asc-admin-guess-grid';
    
    floorData.characters.forEach(char => {
        const card = document.createElement('div');
        card.className = 'asc-admin-guess-card';
        
        const imgWrap = document.createElement('div');
        imgWrap.className = 'asc-admin-guess-img';
        const img = document.createElement('img');
        img.src = char.img;
        img.alt = char.name;
        img.draggable = false;
        img.onerror = () => { img.style.display = 'none'; imgWrap.classList.add('asc-admin-guess-img-fail'); };
        imgWrap.appendChild(img);
        
        const name = document.createElement('div');
        name.className = 'asc-admin-guess-name';
        name.textContent = char.name;
        
        card.appendChild(imgWrap);
        card.appendChild(name);
        wrap.appendChild(card);
    });
    
    container.appendChild(wrap);
}

// 🎯 Admin qui joue - mêmes inputs que le joueur
function _renderAdminGuessPlayer(container, floorData) {
    // 🆕 Init joker (1x par étage Guess) — used:true si déjà consommé avant un refresh
    const alreadyUsed = !!ascensionState.myGuessJokerUsed;
    ascensionState.guessJoker = { progress: 0, used: alreadyUsed };
    ascensionState.guessFloorChars = floorData.characters;
    ascensionState.myGuessJokerUsed = false;

    const grid = document.createElement('div');
    grid.className = 'asc-guess-grid';  // Réutilise le style du joueur

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
            if (val.length < 2) return;
            _submitAdminGuessCheck(char.id, val, 'input');
        });
        // 🆕 Validation explicite sur Enter (source='enter', shake si faux)
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const val = input.value.trim();
                if (val) _submitAdminGuessCheck(char.id, val, 'enter');
            }
        });
        
        card.appendChild(imgWrap);
        card.appendChild(input);
        grid.appendChild(card);
    });
    
    container.appendChild(grid);

    // 🆕 Joker : 1 mini-ampoule au-dessus de chaque card (skip si déjà consommé)
    if (!ascensionState.guessJoker.used) {
        _attachAdminGuessJokerBulbs(grid, floorData.characters);
    }

    // 🆕 RESTAURATION (mode race) : si on reconnect après refresh et qu'on avait
    //    déjà validé certaines cards, on les marque visuellement (stamp + disabled)
    const validated = ascensionState.myValidatedGuesses || [];
    if (validated.length > 0) {
        console.log(`🏔️ Admin: restauration de ${validated.length} guess(es) déjà validée(s)`);
        if (!ascensionState.guessSolved) ascensionState.guessSolved = {};
        validated.forEach(charId => {
            const card = grid.querySelector(`.asc-guess-card[data-char-id="${charId}"]`);
            if (!card) return;
            card.classList.add('asc-guess-correct');
            if (!card.querySelector('.asc-guess-stamp')) {
                const stamp = document.createElement('div');
                stamp.className = 'asc-guess-stamp';
                stamp.textContent = 'PERFECT';
                // Pas d'animation au refresh : le stamp apparaît directement
                stamp.style.animation = 'none';
                stamp.style.transform = 'translate(-50%, -50%) rotate(-12deg) scale(1)';
                stamp.style.opacity = '1';
                card.appendChild(stamp);
            }
            const input = card.querySelector('.asc-guess-input');
            if (input) input.disabled = true;
            ascensionState.guessSolved[charId] = true;
        });
        // Reset pour ne pas re-restaurer si on re-render le floor
        ascensionState.myValidatedGuesses = [];
    }
    
    // Focus sur le 1er input non-validé
    setTimeout(() => {
        const firstAvailable = grid.querySelector('.asc-guess-input:not([disabled])');
        if (firstAvailable) firstAvailable.focus();
    }, 100);
}

function _submitAdminGuessCheck(characterId, name, source) {
    if (!ascensionState.active) return;
    if (ascensionState.guessSolved && ascensionState.guessSolved[characterId]) return;
    if (typeof socket !== 'undefined' && socket) {
        console.log('🐛 [client] emit ascension-check-guess', { characterId, name, source, socketId: socket.id });
        socket.emit('ascension-check-guess', { characterId, name, source: source || 'input' });
    }
}

// 🆕 ─── JOKER GUESS ADMIN (mini-ampoule par carte) ───
function _attachAdminGuessJokerBulbs(grid, characters) {
    characters.forEach(char => {
        const card = grid.querySelector(`.asc-guess-card[data-char-id="${char.id}"]`);
        if (!card) return;
        if (card.classList.contains('asc-guess-correct')) return;
        const bulb = document.createElement('button');
        bulb.className = 'asc-guess-joker-mini';
        bulb.type = 'button';
        bulb.dataset.charId = char.id;
        bulb.dataset.progress = '0';
        bulb.setAttribute('aria-label', 'Joker : révèle ce nom (charge en devinant 2 personnages)');
        bulb.innerHTML = `
            <svg viewBox="0 0 64 96" class="asc-guess-joker-svg" aria-hidden="true">
                <defs>
                    <clipPath id="ascJokerClipAdm-${char.id}">
                        <path d="M22 8 Q22 0 32 0 Q42 0 42 8 Q56 14 56 30 Q56 44 46 54 L46 70 Q46 74 42 74 L22 74 Q18 74 18 70 L18 54 Q8 44 8 30 Q8 14 22 8 Z"/>
                    </clipPath>
                </defs>
                <path class="asc-guess-joker-outline" d="M22 8 Q22 0 32 0 Q42 0 42 8 Q56 14 56 30 Q56 44 46 54 L46 70 Q46 74 42 74 L22 74 Q18 74 18 70 L18 54 Q8 44 8 30 Q8 14 22 8 Z" />
                <g clip-path="url(#ascJokerClipAdm-${char.id})">
                    <rect class="asc-guess-joker-fill" x="0" y="74" width="64" height="0"/>
                </g>
                <path class="asc-guess-joker-filament" d="M26 36 Q32 28 38 36 Q32 44 26 36 Z M30 44 L30 50 M34 44 L34 50" fill="none" stroke-width="1.5"/>
                <line class="asc-guess-joker-thread" x1="22" y1="80" x2="42" y2="80"/>
                <line class="asc-guess-joker-thread" x1="24" y1="86" x2="40" y2="86"/>
                <line class="asc-guess-joker-thread" x1="26" y1="92" x2="38" y2="92"/>
            </svg>
            <div class="asc-guess-joker-glow"></div>
        `;
        bulb.addEventListener('click', () => _useAdminGuessJoker(char.id));
        card.appendChild(bulb);
    });
    _updateAdminGuessJokerVisual();
}

function _updateAdminGuessJokerVisual() {
    const j = ascensionState.guessJoker;
    if (!j) return;
    const bulbs = document.querySelectorAll('.asc-guess-joker-mini');
    // 🆕 Au max (2/2), on remplit JUSQU'EN HAUT (y=0, height=74)
    const h = j.progress >= 2 ? 74 : (j.progress >= 1 ? 30 : 0);
    const y = 74 - h;
    bulbs.forEach(b => {
        b.dataset.progress = String(j.progress);
        b.classList.toggle('asc-guess-joker-ready', j.progress >= 2 && !j.used);
        const fill = b.querySelector('.asc-guess-joker-fill');
        if (fill) {
            fill.setAttribute('y', String(y));
            fill.setAttribute('height', String(h));
        }
        if (j.progress > 0) {
            b.classList.remove('asc-guess-joker-pulse');
            void b.offsetWidth;
            b.classList.add('asc-guess-joker-pulse');
        }
    });
}

function _useAdminGuessJoker(charId) {
    const j = ascensionState.guessJoker;
    if (!j || j.used || j.progress < 2) return;
    if (!charId || typeof socket === 'undefined' || !socket) return;
    const card = document.querySelector(`.asc-guess-card[data-char-id="${charId}"]`);
    const input = card?.querySelector('.asc-guess-input');
    if (!input || input.disabled) return;

    j.used = true;
    _updateAdminGuessJokerVisual();
    socket.emit('ascension-guess-joker-used', { characterId: charId });
}

function _shatterAllAdminGuessJokers() {
    document.querySelectorAll('.asc-guess-joker-mini').forEach(_shatterAdminGuessJoker);
}

function _shatterAdminGuessJoker(bulb) {
    bulb.style.pointerEvents = 'none';
    const rect = bulb.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const layer = document.createElement('div');
    layer.className = 'asc-guess-joker-shatter';
    layer.style.left = cx + 'px';
    layer.style.top = cy + 'px';
    for (let i = 0; i < 12; i++) {
        const frag = document.createElement('span');
        frag.className = 'asc-guess-joker-frag';
        const angle = (i / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const dist = 60 + Math.random() * 40;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist - 12;
        const rot = (Math.random() - 0.5) * 720;
        const size = 3 + Math.random() * 5;
        frag.style.setProperty('--dx', dx + 'px');
        frag.style.setProperty('--dy', dy + 'px');
        frag.style.setProperty('--rot', rot + 'deg');
        frag.style.width = size + 'px';
        frag.style.height = size + 'px';
        layer.appendChild(frag);
    }
    document.body.appendChild(layer);
    bulb.classList.add('asc-guess-joker-vanish');
    setTimeout(() => { bulb.remove(); layer.remove(); }, 900);
}

function _playAdminGuessJokerSound() {
    try {
        if (!window._ascAdminAudioCtx) {
            window._ascAdminAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        const ctx = window._ascAdminAudioCtx;
        if (ctx.state === 'suspended') ctx.resume();
        const t = ctx.currentTime;
        const sweep = ctx.createOscillator();
        const sweepGain = ctx.createGain();
        sweep.type = 'sine';
        sweep.frequency.setValueAtTime(300, t);
        sweep.frequency.exponentialRampToValueAtTime(1400, t + 0.18);
        sweepGain.gain.setValueAtTime(0, t);
        sweepGain.gain.linearRampToValueAtTime(0.06, t + 0.02);
        sweepGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        sweep.connect(sweepGain).connect(ctx.destination);
        sweep.start(t); sweep.stop(t + 0.28);

        [{ f: 987.77, d: 0.18 }, { f: 1318.51, d: 0.24 }].forEach(n => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(n.f, t + n.d);
            g.gain.setValueAtTime(0, t + n.d);
            g.gain.linearRampToValueAtTime(0.05, t + n.d + 0.005);
            g.gain.exponentialRampToValueAtTime(0.001, t + n.d + 0.5);
            o.connect(g).connect(ctx.destination);
            o.start(t + n.d); o.stop(t + n.d + 0.55);
            const h = ctx.createOscillator();
            const hg = ctx.createGain();
            h.type = 'sine';
            h.frequency.setValueAtTime(n.f * 2, t + n.d);
            hg.gain.setValueAtTime(0, t + n.d);
            hg.gain.linearRampToValueAtTime(0.018, t + n.d + 0.005);
            hg.gain.exponentialRampToValueAtTime(0.001, t + n.d + 0.32);
            h.connect(hg).connect(ctx.destination);
            h.start(t + n.d); h.stop(t + n.d + 0.34);
        });
    } catch (e) { /* ignore */ }
}

// ════════════════════════════════════════════
// 🎯 Mini-jeu ORDER — drag & drop chronologique
// ════════════════════════════════════════════

// Vue spectateur Order côté admin (read-only) — affiche les arcs dans leur ordre serveur
function _renderAdminOrderSpectator(container, floorData) {
    const wrap = document.createElement('div');
    wrap.className = 'asc-order-wrap';
    
    const grid = document.createElement('div');
    grid.className = 'asc-order-grid asc-order-grid-readonly';
    
    floorData.arcs.forEach((arc, idx) => {
        const card = _createAdminOrderCard(arc, idx);
        // Pas de cursor grab pour le spectateur
        card.style.cursor = 'default';
        grid.appendChild(card);
    });
    
    wrap.appendChild(grid);
    container.appendChild(wrap);
    
    // 🆕 Build connectors + resize listener
    requestAnimationFrame(() => requestAnimationFrame(() => _buildAdminOrderConnectors(grid)));
    _attachAdminOrderResize(grid);
}

// Vue admin-joueur Order — drag & drop comme côté joueur normal
function _renderAdminOrderPlayer(container, floorData) {
    const wrap = document.createElement('div');
    wrap.className = 'asc-order-wrap';
    
    const grid = document.createElement('div');
    grid.className = 'asc-order-grid';
    
    floorData.arcs.forEach((arc, idx) => {
        const card = _createAdminOrderCard(arc, idx);
        grid.appendChild(card);
    });
    
    _setupAdminOrderDrag(grid);
    
    wrap.appendChild(grid);
    container.appendChild(wrap);
    
    // 🆕 Build connectors + resize listener
    requestAnimationFrame(() => requestAnimationFrame(() => _buildAdminOrderConnectors(grid)));
    _attachAdminOrderResize(grid);
}

function _createAdminOrderCard(arc, idx) {
    const card = document.createElement('div');
    card.className = 'asc-order-card';
    card.dataset.arcId = arc.id;
    
    const numBadge = document.createElement('div');
    numBadge.className = 'asc-order-num';
    numBadge.textContent = idx + 1;
    
    const imgWrap = document.createElement('div');
    imgWrap.className = 'asc-order-img-wrap';
    const img = document.createElement('img');
    img.className = 'asc-order-img';
    img.src = arc.img;
    img.alt = '';
    img.draggable = false;
    img.onerror = () => { img.style.display = 'none'; imgWrap.classList.add('asc-order-img-fail'); };
    imgWrap.appendChild(img);
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'asc-order-name';
    nameDiv.textContent = arc.name;
    
    card.appendChild(numBadge);
    card.appendChild(imgWrap);
    card.appendChild(nameDiv);
    return card;
}

// ═══════════════════════════════════════════════════════════════
// 🎯 ASCENSION — Mini-jeu INTRUDER (Admin)
// ═══════════════════════════════════════════════════════════════

// Spectateur : grille 5x6 read-only avec compteur live des trouvés (mis à jour via ascension-progress)
function _renderAdminIntruderSpectator(container, floorData) {
    const characters = floorData.characters || [];
    const totalTargets = floorData.totalTargets || 1;
    
    const wrap = document.createElement('div');
    wrap.className = 'asc-intruder-wrap';
    
    const grid = document.createElement('div');
    grid.className = 'asc-intruder-grid';
    
    characters.forEach(char => {
        const card = _createAdminIntruderCard(char, false);
        grid.appendChild(card);
    });
    
    const sidebar = document.createElement('div');
    sidebar.className = 'asc-intruder-sidebar';
    
    // 🆕 Description du mini-jeu (au-dessus du compteur)
    const desc = document.createElement('div');
    desc.className = 'asc-intruder-desc';
    desc.textContent = floorData.instruction || 'Trouvez les intrus';
    sidebar.appendChild(desc);
    
    const counter = document.createElement('div');
    counter.className = 'asc-intruder-counter';
    const counterLabel = (floorData.variant === 'not_in') ? 'Intrus à trouver' : 'Personnages à trouver';
    counter.innerHTML = '<span class="asc-intruder-counter-label">' + counterLabel + '</span>'
        + '<span class="asc-intruder-counter-num">' + totalTargets + '</span>';
    sidebar.appendChild(counter);
    
    wrap.appendChild(grid);
    wrap.appendChild(sidebar);
    container.appendChild(wrap);
}

// Player : même chose mais cliquable + envoi 'ascension-check-intruder' à chaque clic
function _renderAdminIntruderPlayer(container, floorData) {
    const characters = floorData.characters || [];
    const totalTargets = floorData.totalTargets || 1;
    
    const alreadyFound = (ascensionState.intruderFound instanceof Set)
        ? ascensionState.intruderFound : new Set();
    
    const wrap = document.createElement('div');
    wrap.className = 'asc-intruder-wrap';
    
    const grid = document.createElement('div');
    grid.className = 'asc-intruder-grid';
    
    characters.forEach(char => {
        const card = _createAdminIntruderCard(char, true);
        if (alreadyFound.has(char.id)) {
            card.classList.add('asc-intruder-correct');
            card.style.pointerEvents = 'none';
        }
        grid.appendChild(card);
    });
    
    const sidebar = document.createElement('div');
    sidebar.className = 'asc-intruder-sidebar';
    
    // 🆕 Description du mini-jeu (au-dessus du compteur)
    const desc = document.createElement('div');
    desc.className = 'asc-intruder-desc';
    desc.textContent = floorData.instruction || 'Trouvez les intrus';
    sidebar.appendChild(desc);
    
    const counter = document.createElement('div');
    counter.className = 'asc-intruder-counter';
    const counterLabel = (floorData.variant === 'not_in') ? 'Intrus trouvés' : 'Personnages trouvés';
    counter.innerHTML = '<span class="asc-intruder-counter-label">' + counterLabel + '</span>'
        + '<span class="asc-intruder-counter-num"><span id="ascAdminIntruderCount">' + alreadyFound.size + '</span><span class="asc-intruder-counter-sep">/</span>' + totalTargets + '</span>';
    sidebar.appendChild(counter);
    
    wrap.appendChild(grid);
    wrap.appendChild(sidebar);
    container.appendChild(wrap);
}

function _createAdminIntruderCard(char, clickable) {
    const card = document.createElement('div');
    card.className = 'asc-intruder-card';
    card.dataset.id = char.id;
    
    const img = document.createElement('div');
    img.className = 'asc-intruder-card-img';
    if (char.img) {
        img.style.backgroundImage = "url('" + char.img + "')";
    } else {
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
    
    const name = document.createElement('div');
    name.className = 'asc-intruder-card-name';
    name.textContent = char.name || '';
    card.appendChild(name);
    
    if (clickable) {
        card.addEventListener('click', (e) => _onAdminIntruderCardClick(card, char, e));
    } else {
        card.style.cursor = 'default';
    }
    
    return card;
}

function _onAdminIntruderCardClick(card, char, event) {
    if (card.classList.contains('asc-intruder-correct')) return;
    if (ascensionState.validated) return;

    // 🔊 Click tactile immédiat
    _playAdminIntruderClickSound();

    // 🆕 Feedback visuel "press" + ripple depuis le point de clic
    _triggerIntruderPress(card, event);

    card.classList.remove('asc-intruder-wrong');
    void card.offsetWidth;

    socket.emit('ascension-check-intruder', { characterId: char.id });
}

function _handleAdminIntruderResult(data) {
    const grid = document.querySelector('.asc-intruder-grid');
    if (!grid) return;

    const card = grid.querySelector('.asc-intruder-card[data-id="' + data.characterId + '"]');
    if (!card) return;

    if (data.correct) {
        card.classList.add('asc-intruder-correct');
        card.style.pointerEvents = 'none';

        const countEl = document.getElementById('ascAdminIntruderCount');
        if (countEl) countEl.textContent = data.foundCount;

        if (!(ascensionState.intruderFound instanceof Set)) {
            ascensionState.intruderFound = new Set();
        }
        ascensionState.intruderFound.add(data.characterId);

        _playAdminIntruderCorrectSound();

        if (data.foundCount >= data.totalTargets) {
            _playAdminIntruderVictorySound();
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
            ascensionState.intruderFound = null;
        }
    } else {
        card.classList.add('asc-intruder-wrong');
        _playAdminIntruderWrongSound();

        // 🆕 Verrouille toute la grille pendant 3s : pointer-events:none + glow rouge pulsant
        if (!grid.classList.contains('asc-intruder-locked')) {
            grid.classList.add('asc-intruder-locked');
            setTimeout(() => grid.classList.remove('asc-intruder-locked'), 3000);
        }

        setTimeout(() => card.classList.remove('asc-intruder-wrong'), 800);
    }
}

// 🆕 Press feedback partagé : ajoute la classe pressed + spawn d'un ripple au point de clic
function _triggerIntruderPress(card, event) {
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
}

// 🔊 Click tactile court (avant résultat serveur) — médium 1600→900Hz
function _playAdminIntruderClickSound() {
    try {
        if (!window._ascAdminAudioCtx) {
            window._ascAdminAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        const ctx = window._ascAdminAudioCtx;
        if (ctx.state === 'suspended') ctx.resume();
        const t = ctx.currentTime;

        const click = ctx.createOscillator();
        const clickGain = ctx.createGain();
        click.type = 'triangle';
        click.frequency.setValueAtTime(1600, t);
        click.frequency.exponentialRampToValueAtTime(900, t + 0.04);
        clickGain.gain.setValueAtTime(0, t);
        clickGain.gain.linearRampToValueAtTime(0.045, t + 0.002);
        clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        click.connect(clickGain).connect(ctx.destination);
        click.start(t); click.stop(t + 0.07);

        const body = ctx.createOscillator();
        const bodyGain = ctx.createGain();
        body.type = 'sine';
        body.frequency.setValueAtTime(520, t);
        body.frequency.exponentialRampToValueAtTime(380, t + 0.08);
        bodyGain.gain.setValueAtTime(0, t);
        bodyGain.gain.linearRampToValueAtTime(0.04, t + 0.005);
        bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        body.connect(bodyGain).connect(ctx.destination);
        body.start(t); body.stop(t + 0.11);
    } catch(e) { /* ignore */ }
}

// 🔊 Validation correcte — note aigüe montante (parité avec côté joueur)
function _playAdminIntruderCorrectSound() {
    try {
        if (!window._ascAdminAudioCtx) {
            window._ascAdminAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        const ctx = window._ascAdminAudioCtx;
        if (ctx.state === 'suspended') ctx.resume();
        const now = ctx.currentTime;

        const o1 = ctx.createOscillator();
        const g1 = ctx.createGain();
        o1.type = 'sine';
        o1.frequency.setValueAtTime(1200, now);
        o1.frequency.exponentialRampToValueAtTime(1800, now + 0.08);
        g1.gain.setValueAtTime(0.001, now);
        g1.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
        g1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        o1.connect(g1).connect(ctx.destination);
        o1.start(now); o1.stop(now + 0.13);
    } catch(e) { /* ignore */ }
}

// 🔊 Validation finale (tous trouvés) — do5 → sol5 → do6 en sine waves douces (sobre)
function _playAdminIntruderVictorySound() {
    try {
        if (!window._ascAdminAudioCtx) {
            window._ascAdminAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        const ctx = window._ascAdminAudioCtx;
        if (ctx.state === 'suspended') ctx.resume();
        const t = ctx.currentTime;

        // Note 1 — Tonique (do5)
        const n1 = ctx.createOscillator();
        const g1 = ctx.createGain();
        n1.type = 'sine';
        n1.frequency.setValueAtTime(523, t);
        g1.gain.setValueAtTime(0, t);
        g1.gain.linearRampToValueAtTime(0.08, t + 0.04);
        g1.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        n1.connect(g1).connect(ctx.destination);
        n1.start(t); n1.stop(t + 0.55);

        // Note 2 — Quinte (sol5), 120ms après
        const n2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        n2.type = 'sine';
        n2.frequency.setValueAtTime(784, t + 0.12);
        g2.gain.setValueAtTime(0, t + 0.12);
        g2.gain.linearRampToValueAtTime(0.08, t + 0.16);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        n2.connect(g2).connect(ctx.destination);
        n2.start(t + 0.12); n2.stop(t + 0.65);

        // Shimmer (do6), 240ms après
        const sh = ctx.createOscillator();
        const shGain = ctx.createGain();
        sh.type = 'triangle';
        sh.frequency.setValueAtTime(1046, t + 0.24);
        shGain.gain.setValueAtTime(0, t + 0.24);
        shGain.gain.linearRampToValueAtTime(0.04, t + 0.27);
        shGain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
        sh.connect(shGain).connect(ctx.destination);
        sh.start(t + 0.24); sh.stop(t + 0.6);
    } catch(e) { /* ignore */ }
}

// 🔊 Erreur — note grave brève (parité avec côté joueur)
function _playAdminIntruderWrongSound() {
    try {
        if (!window._ascAdminAudioCtx) {
            window._ascAdminAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        const ctx = window._ascAdminAudioCtx;
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
        o.start(now); o.stop(now + 0.2);
    } catch(e) { /* ignore */ }
}

// ═══════════════════════════════════════════════════════════════
// 🎯 ASCENSION — Mini-jeu WORDLE (Admin)
// ═══════════════════════════════════════════════════════════════

function _renderAdminWordleSpectator(container, floorData) {
    // Vue spectateur : juste l'info (catégorie + longueur), pas de grille interactive
    const wrap = document.createElement('div');
    wrap.className = 'asc-wordle-wrap asc-wordle-spectator';

    const info = document.createElement('div');
    info.className = 'asc-wordle-spectator-info';
    info.innerHTML =
        '<div class="asc-wordle-cat">' + (floorData.category === 'anime' ? 'Anime' : 'Personnage') + '</div>' +
        '<div class="asc-wordle-length">' +
            '<span class="asc-wordle-length-label">Mot de</span>' +
            '<span class="asc-wordle-length-num">' + floorData.wordLength + '</span>' +
            '<span class="asc-wordle-length-label">lettres</span>' +
        '</div>';
    wrap.appendChild(info);
    container.appendChild(wrap);
}

function _renderAdminWordlePlayer(container, floorData) {
    const wordLength = floorData.wordLength;
    const groups = (floorData.groups && floorData.groups.length) ? floorData.groups : [wordLength];
    ascensionState.wordleAttempts = [];
    ascensionState.wordleCurrent = '';
    ascensionState.wordleSubmitting = false;
    ascensionState.wordleGroups = groups;
    ascensionState.wordleLength = wordLength;

    const wrap = document.createElement('div');
    wrap.className = 'asc-wordle-wrap';

    // Centre : grille des tentatives
    const centerStack = document.createElement('div');
    centerStack.className = 'asc-wordle-center';

    const gridWrap = document.createElement('div');
    gridWrap.className = 'asc-wordle-grid-wrap';
    const grid = document.createElement('div');
    grid.className = 'asc-wordle-grid';
    grid.style.setProperty('--asc-wordle-cols', wordLength);
    gridWrap.appendChild(grid);
    grid.appendChild(_createAdminWordleRow(groups, true));
    centerStack.appendChild(gridWrap);

    const sidebar = document.createElement('div');
    sidebar.className = 'asc-wordle-sidebar';

    const counter = document.createElement('div');
    counter.className = 'asc-wordle-counter';
    counter.innerHTML =
        '<span class="asc-wordle-counter-label">Tentatives</span>' +
        '<span class="asc-wordle-counter-num" id="ascAdminWordleAttemptCount">0</span>';
    sidebar.appendChild(counter);

    wrap.appendChild(centerStack);
    wrap.appendChild(sidebar);
    container.appendChild(wrap);

    _setupAdminWordleKeyboard(wordLength);
}

function _createAdminWordleRow(groups, isActive) {
    // groups : tableau de longueurs (ex: [5, 6] pour "DEMON SLAYER")
    const row = document.createElement('div');
    row.className = 'asc-wordle-row';
    if (isActive) row.classList.add('asc-wordle-row-active');
    let globalIdx = 0;
    groups.forEach((groupLen) => {
        const groupEl = document.createElement('div');
        groupEl.className = 'asc-wordle-group';
        for (let i = 0; i < groupLen; i++) {
            const cell = document.createElement('div');
            cell.className = 'asc-wordle-cell';
            cell.dataset.idx = globalIdx;
            groupEl.appendChild(cell);
            globalIdx++;
        }
        row.appendChild(groupEl);
    });
    return row;
}

function _setupAdminWordleKeyboard(wordLength) {
    _cleanupAdminWordleKeyboard();
    const handler = (e) => {
        if (ascensionState.validated) return;
        if (ascensionState.wordleSubmitting) return;
        const grid = document.querySelector('.asc-wordle-grid');
        if (!grid) return;
        const tgt = e.target;
        if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;

        const key = e.key;
        if (key === 'Enter') {
            _submitAdminWordleAttempt(wordLength);
            e.preventDefault();
        } else if (key === 'Backspace') {
            _adminWordleBackspace();
            e.preventDefault();
        } else if (/^[a-zA-Z]$/.test(key)) {
            _adminWordleAddLetter(key.toUpperCase(), wordLength);
            e.preventDefault();
        }
    };
    document.addEventListener('keydown', handler);
    ascensionState.wordleKeydownHandler = handler;
}

function _cleanupAdminWordleKeyboard() {
    if (ascensionState.wordleKeydownHandler) {
        document.removeEventListener('keydown', ascensionState.wordleKeydownHandler);
        ascensionState.wordleKeydownHandler = null;
    }
}

function _adminWordleAddLetter(letter, wordLength) {
    const buf = ascensionState.wordleCurrent || '';
    if (buf.length >= wordLength) return;
    ascensionState.wordleCurrent = buf + letter;
    _renderAdminWordleActiveRow();
    _playAdminWordleTypeSound();
    // 🆕 Auto-submit dès que la ligne est pleine
    if (ascensionState.wordleCurrent.length === wordLength) {
        _submitAdminWordleAttempt(wordLength);
    }
}

function _adminWordleBackspace() {
    const buf = ascensionState.wordleCurrent || '';
    if (buf.length === 0) return;
    ascensionState.wordleCurrent = buf.slice(0, -1);
    _renderAdminWordleActiveRow();
}

function _renderAdminWordleActiveRow() {
    const grid = document.querySelector('.asc-wordle-grid');
    if (!grid) return;
    const activeRow = grid.querySelector('.asc-wordle-row-active');
    if (!activeRow) return;
    const cells = activeRow.querySelectorAll('.asc-wordle-cell');
    const buffer = ascensionState.wordleCurrent || '';
    cells.forEach((cell, i) => {
        const newLetter = buffer[i] || '';
        if (cell.textContent !== newLetter) {
            cell.textContent = newLetter;
            if (newLetter) {
                cell.classList.remove('asc-wordle-cell-pop');
                void cell.offsetWidth;
                cell.classList.add('asc-wordle-cell-filled', 'asc-wordle-cell-pop');
            } else {
                cell.classList.remove('asc-wordle-cell-filled', 'asc-wordle-cell-pop');
            }
        }
    });
}

function _submitAdminWordleAttempt(wordLength) {
    const buffer = ascensionState.wordleCurrent || '';
    if (buffer.length !== wordLength) {
        const activeRow = document.querySelector('.asc-wordle-row-active');
        if (activeRow) {
            activeRow.classList.remove('asc-wordle-row-shake');
            void activeRow.offsetWidth;
            activeRow.classList.add('asc-wordle-row-shake');
            setTimeout(() => activeRow.classList.remove('asc-wordle-row-shake'), 500);
        }
        _playAdminWordleInvalidSound();
        return;
    }
    ascensionState.wordleSubmitting = true;
    socket.emit('ascension-check-wordle', { guess: buffer });
}

function _handleAdminWordleResult(data) {
    const grid = document.querySelector('.asc-wordle-grid');
    if (!grid) return;
    const activeRow = grid.querySelector('.asc-wordle-row-active');
    if (!activeRow) return;
    const cells = activeRow.querySelectorAll('.asc-wordle-cell');

    const STAGGER = 110;
    const FLIP_DURATION = 350;
    const COLOR_AT = 175;
    cells.forEach((cell, i) => {
        setTimeout(() => {
            cell.classList.add('asc-wordle-cell-flipping');
            _playAdminWordleFlipSound();
            setTimeout(() => {
                cell.classList.add('asc-wordle-cell-' + data.statuses[i]);
            }, COLOR_AT);
            setTimeout(() => {
                cell.classList.remove('asc-wordle-cell-flipping');
                cell.classList.add('asc-wordle-cell-revealed');
            }, FLIP_DURATION);
        }, i * STAGGER);
    });

    const totalAnimDuration = (cells.length - 1) * STAGGER + FLIP_DURATION;

    setTimeout(() => {
        ascensionState.wordleAttempts.push({ guess: data.guess, statuses: data.statuses });
        ascensionState.wordleCurrent = '';
        ascensionState.wordleSubmitting = false;

        const counterEl = document.getElementById('ascAdminWordleAttemptCount');
        if (counterEl) {
            counterEl.textContent = ascensionState.wordleAttempts.length;
            counterEl.classList.remove('asc-wordle-counter-bump');
            void counterEl.offsetWidth;
            counterEl.classList.add('asc-wordle-counter-bump');
        }

        if (data.isCorrect) {
            activeRow.classList.add('asc-wordle-row-victory');
            _playAdminIntruderVictorySound();  // Réutilise le son de victoire commun
            _cleanupAdminWordleKeyboard();
            // 🆕 Laisse 700ms pour bien voir la ligne verte + pulse avant de lancer le fade
            setTimeout(() => {
                const wrap = document.querySelector('.asc-wordle-wrap');
                if (wrap) wrap.classList.add('asc-wordle-validated');
            }, 700);
        } else {
            // 🆕 Snapshot l'état validé en past row insérée juste sous l'active, puis clear l'active EN PLACE
            const pastRow = activeRow.cloneNode(true);
            pastRow.classList.remove('asc-wordle-row-active');
            pastRow.classList.add('asc-wordle-row-past', 'asc-wordle-row-enter');
            if (activeRow.nextSibling) {
                grid.insertBefore(pastRow, activeRow.nextSibling);
            } else {
                grid.appendChild(pastRow);
            }
            setTimeout(() => pastRow.classList.remove('asc-wordle-row-enter'), 400);

            // Clear les cells de l'active row sur place
            cells.forEach(cell => {
                cell.textContent = '';
                cell.classList.remove(
                    'asc-wordle-cell-filled',
                    'asc-wordle-cell-pop',
                    'asc-wordle-cell-flipping',
                    'asc-wordle-cell-revealed',
                    'asc-wordle-cell-green',
                    'asc-wordle-cell-yellow',
                    'asc-wordle-cell-red'
                );
            });
        }
    }, totalAnimDuration);
}

// 🔊 Sons Wordle admin
function _playAdminWordleTypeSound() {
    try {
        if (!window._ascAdminAudioCtx) {
            window._ascAdminAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        const ctx = window._ascAdminAudioCtx;
        if (ctx.state === 'suspended') ctx.resume();
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(1400, t);
        o.frequency.exponentialRampToValueAtTime(900, t + 0.03);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.035, t + 0.002);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        o.connect(g).connect(ctx.destination);
        o.start(t); o.stop(t + 0.06);
    } catch(e) { /* ignore */ }
}

function _playAdminWordleInvalidSound() {
    try {
        if (!window._ascAdminAudioCtx) {
            window._ascAdminAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        const ctx = window._ascAdminAudioCtx;
        if (ctx.state === 'suspended') ctx.resume();
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(180, t);
        o.frequency.exponentialRampToValueAtTime(120, t + 0.18);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.05, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        o.connect(g).connect(ctx.destination);
        o.start(t); o.stop(t + 0.24);
    } catch(e) { /* ignore */ }
}

function _playAdminWordleFlipSound() {
    try {
        if (!window._ascAdminAudioCtx) {
            window._ascAdminAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        const ctx = window._ascAdminAudioCtx;
        if (ctx.state === 'suspended') ctx.resume();
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(900, t);
        o.frequency.exponentialRampToValueAtTime(500, t + 0.06);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.04, t + 0.003);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        o.connect(g).connect(ctx.destination);
        o.start(t); o.stop(t + 0.09);
    } catch(e) { /* ignore */ }
}

// ═══════════════════════════════════════════════════════════════
// 🎯 ASCENSION — Mini-jeu MATCH (Admin)
// ═══════════════════════════════════════════════════════════════

function _renderAdminMatchSpectator(container, floorData) {
    // Vue spectateur : grille statique des 2 colonnes, pas d'interactivité
    const wrap = document.createElement('div');
    wrap.className = 'asc-match-wrap asc-match-spectator asc-match-subtype-' + floorData.subtype;
    const grid = document.createElement('div');
    grid.className = 'asc-match-grid';
    const leftCol = document.createElement('div');
    leftCol.className = 'asc-match-col asc-match-col-left';
    floorData.left.forEach(item => leftCol.appendChild(_createAdminMatchCard(item, 'left', floorData.subtype)));
    const rightCol = document.createElement('div');
    rightCol.className = 'asc-match-col asc-match-col-right';
    floorData.right.forEach(item => rightCol.appendChild(_createAdminMatchCard(item, 'right', floorData.subtype)));
    grid.appendChild(leftCol);
    grid.appendChild(rightCol);
    wrap.appendChild(grid);
    container.appendChild(wrap);
}

function _renderAdminMatchPlayer(container, floorData) {
    ascensionState.matchConnections = {};
    ascensionState.matchSubtype = floorData.subtype;
    ascensionState.matchTotal = floorData.left.length;
    ascensionState.matchLocked = false;
    ascensionState.matchSubmitting = false;
    ascensionState.matchDrag = null;

    const wrap = document.createElement('div');
    wrap.className = 'asc-match-wrap asc-match-subtype-' + floorData.subtype;

    const grid = document.createElement('div');
    grid.className = 'asc-match-grid';

    const leftCol = document.createElement('div');
    leftCol.className = 'asc-match-col asc-match-col-left';
    floorData.left.forEach(item => leftCol.appendChild(_createAdminMatchCard(item, 'left', floorData.subtype)));
    grid.appendChild(leftCol);

    const SVG_NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'asc-match-svg');
    svg.setAttribute('preserveAspectRatio', 'none');
    const defs = document.createElementNS(SVG_NS, 'defs');
    defs.innerHTML = ''
        + '<linearGradient id="ascMatchGradLine" x1="0%" y1="0%" x2="100%" y2="0%">'
        +   '<stop offset="0%"   stop-color="#a0e0ff" stop-opacity="0.85"/>'
        +   '<stop offset="50%"  stop-color="#ffffff" stop-opacity="1"/>'
        +   '<stop offset="100%" stop-color="#a0e0ff" stop-opacity="0.85"/>'
        + '</linearGradient>'
        + '<linearGradient id="ascMatchGradLineCorrect" x1="0%" y1="0%" x2="100%" y2="0%">'
        +   '<stop offset="0%"   stop-color="#22c55e" stop-opacity="0.9"/>'
        +   '<stop offset="50%"  stop-color="#86efac" stop-opacity="1"/>'
        +   '<stop offset="100%" stop-color="#22c55e" stop-opacity="0.9"/>'
        + '</linearGradient>'
        + '<linearGradient id="ascMatchGradLineWrong" x1="0%" y1="0%" x2="100%" y2="0%">'
        +   '<stop offset="0%"   stop-color="#ef4444" stop-opacity="0.95"/>'
        +   '<stop offset="50%"  stop-color="#fca5a5" stop-opacity="1"/>'
        +   '<stop offset="100%" stop-color="#ef4444" stop-opacity="0.95"/>'
        + '</linearGradient>'
        + '<filter id="ascMatchGlow" x="-100%" y="-100%" width="300%" height="300%" filterUnits="userSpaceOnUse">'
        +   '<feGaussianBlur stdDeviation="3" result="b"/>'
        +   '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>'
        + '</filter>';
    svg.appendChild(defs);
    grid.appendChild(svg);

    const rightCol = document.createElement('div');
    rightCol.className = 'asc-match-col asc-match-col-right';
    floorData.right.forEach(item => rightCol.appendChild(_createAdminMatchCard(item, 'right', floorData.subtype)));
    grid.appendChild(rightCol);

    wrap.appendChild(grid);
    container.appendChild(wrap);

    _setupAdminMatchDrag();
    ascensionState.matchResizeHandler = () => _redrawAdminMatchLines();
    window.addEventListener('resize', ascensionState.matchResizeHandler);

    // 🆕 ResizeObserver sur la grid : capture les layout shifts internes
    if (window.ResizeObserver) {
        ascensionState.matchResizeObserver = new ResizeObserver(() => _redrawAdminMatchLines());
        ascensionState.matchResizeObserver.observe(grid);
        grid.querySelectorAll('.asc-match-card').forEach(c => ascensionState.matchResizeObserver.observe(c));
    }
}

function _createAdminMatchCard(item, side, subtype) {
    const card = document.createElement('div');
    card.className = 'asc-match-card asc-match-card-' + side;
    card.dataset.side = side;
    card.dataset.id = item.id;

    if (item.img) {
        const img = document.createElement('div');
        img.className = 'asc-match-card-img';
        img.style.backgroundImage = "url('" + item.img + "')";
        card.appendChild(img);
    } else {
        // 🆕 Card text-only : icône SVG (line-art) selon subtype + side, puis texte
        const iconText = document.createElement('div');
        iconText.className = 'asc-match-card-icon-text';
        const iconSvg = _getAdminMatchIconSvg(subtype, side);
        if (iconSvg) {
            const iconEl = document.createElement('span');
            iconEl.className = 'asc-match-card-icon';
            iconEl.innerHTML = iconSvg;
            iconText.appendChild(iconEl);
        }
        const txt = document.createElement('span');
        txt.className = 'asc-match-card-text';
        txt.textContent = side === 'left' ? item.name : item.value;
        iconText.appendChild(txt);
        card.appendChild(iconText);
    }

    const port = document.createElement('div');
    port.className = 'asc-match-port';
    card.appendChild(port);

    return card;
}

function _getAdminMatchIconSvg(subtype, side) {
    const key = subtype + '_' + side;
    const ICON_ANIME = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M7 21h10M8 7l4-4M16 7l-4-4"/></svg>';
    const ICON_STUDIO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l7-4 7 4v14"/><path d="M9 10h2M13 10h2M9 14h2M13 14h2M10 21v-3h4v3"/></svg>';
    const ICON_WEAPON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="M13 19l6-6M16 16l4 4M19 21l2-2"/></svg>';
    const ICON_TECHNIQUE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L13.5 9L19.5 10.5L13.5 12L12 18L10.5 12L4.5 10.5L10.5 9z"/><path d="M19 3L19.6 5.4L22 6L19.6 6.6L19 9L18.4 6.6L16 6L18.4 5.4z"/></svg>';
    const ICON_CALENDAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';
    const map = {
        'char_anime_right':   ICON_ANIME,
        'anime_studio_left':  ICON_ANIME,
        'anime_studio_right': ICON_STUDIO,
        'anime_year_left':    ICON_ANIME,
        'anime_year_right':   ICON_CALENDAR,
        'weapons_right':      ICON_WEAPON,
        'techniques_right':   ICON_TECHNIQUE,
    };
    return map[key] || null;
}

function _setupAdminMatchDrag() {
    _cleanupAdminMatchDrag();
    const wrap = document.querySelector('.asc-match-wrap');
    if (!wrap) return;

    const onPointerDown = (e) => {
        if (ascensionState.matchLocked || ascensionState.matchSubmitting) return;
        if (ascensionState.validated) return;
        const card = e.target.closest('.asc-match-card');
        if (!card || !wrap.contains(card)) return;
        e.preventDefault();
        _startAdminMatchDrag(card, e);
    };
    const onPointerMove = (e) => {
        if (!ascensionState.matchDrag) return;
        _updateAdminMatchDrag(e);
    };
    const onPointerUp = (e) => {
        if (!ascensionState.matchDrag) return;
        _endAdminMatchDrag(e);
    };
    wrap.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    ascensionState.matchPointerHandlers = { wrap, onPointerDown, onPointerMove, onPointerUp };
}

function _cleanupAdminMatchDrag() {
    const h = ascensionState.matchPointerHandlers;
    if (h) {
        h.wrap.removeEventListener('pointerdown', h.onPointerDown);
        window.removeEventListener('pointermove', h.onPointerMove);
        window.removeEventListener('pointerup', h.onPointerUp);
        window.removeEventListener('pointercancel', h.onPointerUp);
        ascensionState.matchPointerHandlers = null;
    }
    if (ascensionState.matchResizeHandler) {
        window.removeEventListener('resize', ascensionState.matchResizeHandler);
        ascensionState.matchResizeHandler = null;
    }
    if (ascensionState.matchResizeObserver) {
        ascensionState.matchResizeObserver.disconnect();
        ascensionState.matchResizeObserver = null;
    }
}

function _getAdminMatchPortPos(card) {
    const svg = document.querySelector('.asc-match-svg');
    if (!svg) return { x: 0, y: 0 };
    const svgRect = svg.getBoundingClientRect();
    const port = card.querySelector('.asc-match-port');
    const portRect = (port || card).getBoundingClientRect();
    return {
        x: portRect.left + portRect.width / 2 - svgRect.left,
        y: portRect.top + portRect.height / 2 - svgRect.top,
    };
}

function _startAdminMatchDrag(card, event) {
    // 🆕 Cleanup défensif : retire toute drag-line orpheline d'un drag précédent mal terminé
    const svgClean = document.querySelector('.asc-match-svg');
    if (svgClean) svgClean.querySelectorAll('.asc-match-drag-line').forEach(p => p.remove());
    ascensionState.matchDragPath = null;
    document.querySelectorAll('.asc-match-card-dragging').forEach(c => c.classList.remove('asc-match-card-dragging'));

    const side = card.dataset.side;
    const id = card.dataset.id;

    if (side === 'left' && ascensionState.matchConnections[id]) {
        _breakAdminMatchConnection(id);
    } else if (side === 'right') {
        const leftId = Object.keys(ascensionState.matchConnections).find(k => ascensionState.matchConnections[k] === id);
        if (leftId) _breakAdminMatchConnection(leftId);
    }

    const origin = _getAdminMatchPortPos(card);
    ascensionState.matchDrag = {
        originSide: side,
        originId: id,
        originX: origin.x,
        originY: origin.y,
        pointerId: event.pointerId,
    };
    card.classList.add('asc-match-card-dragging');
    _playAdminMatchSelectSound();

    const SVG_NS = 'http://www.w3.org/2000/svg';
    const svg = document.querySelector('.asc-match-svg');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('class', 'asc-match-drag-line');
    path.setAttribute('stroke', '#c8e8ff');
    path.setAttribute('filter', 'url(#ascMatchGlow)');
    svg.appendChild(path);
    ascensionState.matchDragPath = path;

    _updateAdminMatchDragPath(origin.x, origin.y);
}

function _updateAdminMatchDrag(event) {
    const svg = document.querySelector('.asc-match-svg');
    if (!svg) return;
    const svgRect = svg.getBoundingClientRect();
    const x = event.clientX - svgRect.left;
    const y = event.clientY - svgRect.top;
    _updateAdminMatchDragPath(x, y);

    const wrap = document.querySelector('.asc-match-wrap');
    const targetSide = ascensionState.matchDrag.originSide === 'left' ? 'right' : 'left';
    wrap.querySelectorAll('.asc-match-card-hover').forEach(c => c.classList.remove('asc-match-card-hover'));
    const elUnder = document.elementFromPoint(event.clientX, event.clientY);
    const targetCard = elUnder?.closest('.asc-match-card[data-side="' + targetSide + '"]');
    if (targetCard) targetCard.classList.add('asc-match-card-hover');
}

function _updateAdminMatchDragPath(x, y) {
    const drag = ascensionState.matchDrag;
    if (!drag || !ascensionState.matchDragPath) return;
    const x1 = drag.originX, y1 = drag.originY;
    // Bezier vertical : control points sur l'axe Y
    const dy = y - y1;
    const cx1 = x1, cy1 = y1 + dy * 0.5;
    const cx2 = x,  cy2 = y - dy * 0.5;
    ascensionState.matchDragPath.setAttribute('d', 'M ' + x1 + ' ' + y1 + ' C ' + cx1 + ' ' + cy1 + ', ' + cx2 + ' ' + cy2 + ', ' + x + ' ' + y);
}

function _endAdminMatchDrag(event) {
    // 🆕 Cleanup défensif TOUJOURS : retire toute drag-line orpheline du SVG, peu importe l'état
    const svgClean = document.querySelector('.asc-match-svg');
    if (svgClean) svgClean.querySelectorAll('.asc-match-drag-line').forEach(p => p.remove());
    ascensionState.matchDragPath = null;

    const drag = ascensionState.matchDrag;
    if (!drag) return;
    const wrap = document.querySelector('.asc-match-wrap');

    const targetSide = drag.originSide === 'left' ? 'right' : 'left';
    const elUnder = document.elementFromPoint(event.clientX, event.clientY);
    const targetCard = elUnder?.closest('.asc-match-card[data-side="' + targetSide + '"]');

    wrap.querySelectorAll('.asc-match-card-dragging').forEach(c => c.classList.remove('asc-match-card-dragging'));
    wrap.querySelectorAll('.asc-match-card-hover').forEach(c => c.classList.remove('asc-match-card-hover'));
    ascensionState.matchDrag = null;

    if (!targetCard) return;
    const targetId = targetCard.dataset.id;
    const leftId = drag.originSide === 'left' ? drag.originId : targetId;
    const rightId = drag.originSide === 'left' ? targetId : drag.originId;
    _connectAdminMatchPair(leftId, rightId);
}

function _connectAdminMatchPair(leftId, rightId) {
    const oldLeftForRight = Object.keys(ascensionState.matchConnections).find(k => ascensionState.matchConnections[k] === rightId);
    if (oldLeftForRight && oldLeftForRight !== leftId) _breakAdminMatchConnection(oldLeftForRight);
    if (ascensionState.matchConnections[leftId] && ascensionState.matchConnections[leftId] !== rightId) _breakAdminMatchConnection(leftId);

    ascensionState.matchConnections[leftId] = rightId;
    _drawAdminMatchLine(leftId, rightId, 'asc-match-line');
    _updateAdminMatchCounter();
    _playAdminMatchConnectSound();
    _checkAdminMatchAutoSubmit();
}

function _breakAdminMatchConnection(leftId) {
    delete ascensionState.matchConnections[leftId];
    const svg = document.querySelector('.asc-match-svg');
    if (svg) {
        const line = svg.querySelector('.asc-match-line[data-left-id="' + leftId + '"]');
        if (line) line.remove();
    }
    _updateAdminMatchCounter();
}

function _drawAdminMatchLine(leftId, rightId, baseClass) {
    const svg = document.querySelector('.asc-match-svg');
    if (!svg) return;
    const existing = svg.querySelector('.asc-match-line[data-left-id="' + leftId + '"]');
    if (existing) existing.remove();
    const leftCard = document.querySelector('.asc-match-card[data-side="left"][data-id="' + leftId + '"]');
    const rightCard = document.querySelector('.asc-match-card[data-side="right"][data-id="' + rightId + '"]');
    if (!leftCard || !rightCard) return;
    const a = _getAdminMatchPortPos(leftCard);
    const b = _getAdminMatchPortPos(rightCard);
    // 🆕 Défensif : si layout pas prêt (positions à 0,0), retry sur le prochain frame
    if ((a.x === 0 && a.y === 0) || (b.x === 0 && b.y === 0)) {
        requestAnimationFrame(() => _drawAdminMatchLine(leftId, rightId, baseClass));
        return;
    }
    // Bezier vertical : control points sur l'axe Y
    const dy = b.y - a.y;
    const cx1 = a.x, cy1 = a.y + dy * 0.5;
    const cx2 = b.x, cy2 = b.y - dy * 0.5;
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('class', baseClass);
    path.setAttribute('d', 'M ' + a.x + ' ' + a.y + ' C ' + cx1 + ' ' + cy1 + ', ' + cx2 + ' ' + cy2 + ', ' + b.x + ' ' + b.y);
    path.setAttribute('stroke', '#c8e8ff');             /* solide : robuste pour lignes verticales */
    path.setAttribute('filter', 'url(#ascMatchGlow)');
    path.dataset.leftId = leftId;
    path.dataset.rightId = rightId;
    svg.appendChild(path);
    return path;
}

function _redrawAdminMatchLines() {
    const svg = document.querySelector('.asc-match-svg');
    if (!svg) return;
    const conns = ascensionState.matchConnections || {};
    Object.keys(conns).forEach(leftId => {
        const rightId = conns[leftId];
        const line = svg.querySelector('.asc-match-line[data-left-id="' + leftId + '"]');
        const colorClass = line?.classList.contains('asc-match-line-correct') ? 'asc-match-line-correct' : 'asc-match-line';
        if (line) line.remove();
        const newLine = _drawAdminMatchLine(leftId, rightId, colorClass);
        if (newLine && colorClass === 'asc-match-line-correct') {
            newLine.setAttribute('stroke', '#5fdf7a');
        }
    });
}

function _updateAdminMatchCounter() {
    const el = document.getElementById('ascAdminMatchCount');
    if (el) el.textContent = Object.keys(ascensionState.matchConnections).length;
}

function _checkAdminMatchAutoSubmit() {
    const count = Object.keys(ascensionState.matchConnections).length;
    if (count !== ascensionState.matchTotal) return;
    ascensionState.matchSubmitting = true;
    const connections = Object.keys(ascensionState.matchConnections).map(leftId => ({
        leftId,
        rightId: ascensionState.matchConnections[leftId],
    }));
    socket.emit('ascension-check-match', { connections });
}

function _handleAdminMatchResult(data) {
    const svg = document.querySelector('.asc-match-svg');
    if (!svg) return;

    const STAGGER = 90;
    data.results.forEach((r, i) => {
        setTimeout(() => {
            const line = svg.querySelector('.asc-match-line[data-left-id="' + r.leftId + '"]');
            const leftCard = document.querySelector('.asc-match-card[data-side="left"][data-id="' + r.leftId + '"]');
            const rightCard = document.querySelector('.asc-match-card[data-side="right"][data-id="' + r.rightId + '"]');
            if (r.correct) {
                if (line) {
                    line.classList.add('asc-match-line-correct');
                    line.setAttribute('stroke', '#5fdf7a');
                }
                leftCard?.classList.add('asc-match-card-correct');
                rightCard?.classList.add('asc-match-card-correct');
                _playAdminMatchPairCorrectSound();
            } else {
                if (line) {
                    line.classList.add('asc-match-line-wrong');
                    line.setAttribute('stroke', '#ef4444');
                }
                leftCard?.classList.add('asc-match-card-wrong');
                rightCard?.classList.add('asc-match-card-wrong');
                _playAdminMatchPairWrongSound();
            }
        }, i * STAGGER);
    });

    const totalCascade = data.results.length * STAGGER;

    setTimeout(() => {
        if (data.allCorrect) {
            _playAdminIntruderVictorySound();
            _cleanupAdminMatchDrag();
            setTimeout(() => {
                const wrap = document.querySelector('.asc-match-wrap');
                if (wrap) wrap.classList.add('asc-match-validated');
            }, 700);
        } else {
            // Erreur : reset TOTAL après court délai + lock 2s
            const wrap = document.querySelector('.asc-match-wrap');
            if (wrap) wrap.classList.add('asc-match-locked');
            ascensionState.matchLocked = true;

            // Brise TOUTES les connexions (correct + wrong) après un court délai
            setTimeout(() => {
                svg.querySelectorAll('.asc-match-line, .asc-match-line-correct, .asc-match-line-wrong').forEach(l => l.remove());
                document.querySelectorAll('.asc-match-card').forEach(c => {
                    c.classList.remove('asc-match-card-correct', 'asc-match-card-wrong');
                });
                ascensionState.matchConnections = {};
                _updateAdminMatchCounter();
            }, 600);

            setTimeout(() => {
                if (wrap) wrap.classList.remove('asc-match-locked');
                ascensionState.matchLocked = false;
                ascensionState.matchSubmitting = false;
            }, 2000);
        }
    }, totalCascade + 100);
}

function _playAdminMatchSelectSound() {
    try {
        if (!window._ascAdminAudioCtx) window._ascAdminAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = window._ascAdminAudioCtx;
        if (ctx.state === 'suspended') ctx.resume();
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(800, t);
        o.frequency.exponentialRampToValueAtTime(1100, t + 0.05);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.04, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        o.connect(g).connect(ctx.destination);
        o.start(t); o.stop(t + 0.09);
    } catch(e) {}
}

function _playAdminMatchConnectSound() {
    try {
        if (!window._ascAdminAudioCtx) window._ascAdminAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = window._ascAdminAudioCtx;
        if (ctx.state === 'suspended') ctx.resume();
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(1200, t);
        o.frequency.exponentialRampToValueAtTime(1800, t + 0.1);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.06, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        o.connect(g).connect(ctx.destination);
        o.start(t); o.stop(t + 0.2);
    } catch(e) {}
}

function _playAdminMatchPairCorrectSound() {
    try {
        if (!window._ascAdminAudioCtx) window._ascAdminAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = window._ascAdminAudioCtx;
        if (ctx.state === 'suspended') ctx.resume();
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(1400, t);
        g.gain.setValueAtTime(0.001, t);
        g.gain.exponentialRampToValueAtTime(0.07, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        o.connect(g).connect(ctx.destination);
        o.start(t); o.stop(t + 0.13);
    } catch(e) {}
}

function _playAdminMatchPairWrongSound() {
    try {
        if (!window._ascAdminAudioCtx) window._ascAdminAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = window._ascAdminAudioCtx;
        if (ctx.state === 'suspended') ctx.resume();
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(220, t);
        o.frequency.exponentialRampToValueAtTime(140, t + 0.15);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.05, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        o.connect(g).connect(ctx.destination);
        o.start(t); o.stop(t + 0.2);
    } catch(e) {}
}

// ═══════════════════════════════════════════════════════════════
// 🎯 ASCENSION — Mini-jeu TARGET (Admin)
// ═══════════════════════════════════════════════════════════════

function _renderAdminTargetSpectator(container, floorData) {
    // Vue spectateur : grille statique 30 persos, pas d'interactivité
    const wrap = document.createElement('div');
    wrap.className = 'asc-target-wrap asc-target-spectator';
    const center = document.createElement('div');
    center.className = 'asc-target-center';
    const grid = document.createElement('div');
    grid.className = 'asc-target-grid';
    floorData.characters.forEach(char => grid.appendChild(_createAdminTargetCard(char, false)));
    center.appendChild(grid);
    wrap.appendChild(center);
    container.appendChild(wrap);
}

function _renderAdminTargetPlayer(container, floorData) {
    ascensionState.targetProgress = 0;
    ascensionState.targetCurrentId = floorData.currentTarget?.id || null;
    ascensionState.targetLocked = false;
    ascensionState.targetTotal = floorData.totalTargets || 5;

    const wrap = document.createElement('div');
    wrap.className = 'asc-target-wrap';

    const center = document.createElement('div');
    center.className = 'asc-target-center';

    // Barre de progression au-dessus
    const progress = document.createElement('div');
    progress.className = 'asc-target-progress';
    for (let i = 0; i < ascensionState.targetTotal; i++) {
        const seg = document.createElement('div');
        seg.className = 'asc-target-progress-seg';
        seg.dataset.idx = i;
        progress.appendChild(seg);
    }
    center.appendChild(progress);

    const grid = document.createElement('div');
    grid.className = 'asc-target-grid';
    floorData.characters.forEach(char => grid.appendChild(_createAdminTargetCard(char, true)));
    center.appendChild(grid);

    const sidebar = document.createElement('div');
    sidebar.className = 'asc-target-sidebar';
    sidebar.innerHTML =
        '<div class="asc-target-label">Trouve</div>' +
        '<div class="asc-target-name" id="ascAdminTargetName">' + (floorData.currentTarget?.name || '') + '</div>';

    wrap.appendChild(center);
    wrap.appendChild(sidebar);
    container.appendChild(wrap);
}

function _createAdminTargetCard(char, clickable) {
    const card = document.createElement('div');
    card.className = 'asc-target-card';
    card.dataset.id = char.id;
    const img = document.createElement('div');
    img.className = 'asc-target-card-img';
    if (char.img) img.style.backgroundImage = "url('" + char.img + "')";
    card.appendChild(img);
    if (clickable) {
        card.addEventListener('click', () => _onAdminTargetCardClick(card, char));
    } else {
        card.style.cursor = 'default';
    }
    return card;
}

function _onAdminTargetCardClick(card, char) {
    if (ascensionState.validated) return;
    if (ascensionState.targetLocked) return;
    _playAdminIntruderClickSound();
    socket.emit('ascension-check-target', { characterId: char.id });
}

function _handleAdminTargetResult(data) {
    const grid = document.querySelector('.asc-target-grid');
    if (!grid) return;
    const card = grid.querySelector('.asc-target-card[data-id="' + data.characterId + '"]');

    if (data.correct) {
        if (card) card.classList.add('asc-target-card-correct');
        _playAdminIntruderCorrectSound();

        const segIdx = data.progress - 1;
        const seg = document.querySelector('.asc-target-progress-seg[data-idx="' + segIdx + '"]');
        if (seg) seg.classList.add('asc-target-progress-seg-filled');

        if (data.isComplete) {
            _playAdminIntruderVictorySound();
            setTimeout(() => {
                const wrap = document.querySelector('.asc-target-wrap');
                if (wrap) wrap.classList.add('asc-target-validated');
            }, 700);
        } else {
            ascensionState.targetCurrentId = data.currentTarget?.id || null;
            const nameEl = document.getElementById('ascAdminTargetName');
            if (nameEl && data.currentTarget) {
                nameEl.classList.remove('asc-target-name-pop');
                void nameEl.offsetWidth;
                nameEl.textContent = data.currentTarget.name;
                nameEl.classList.add('asc-target-name-pop');
            }
        }
    } else {
        if (card) {
            card.classList.add('asc-target-card-wrong');
            setTimeout(() => card.classList.remove('asc-target-card-wrong'), 1200);
        }
        _playAdminIntruderWrongSound();

        ascensionState.targetLocked = true;
        const wrap = document.querySelector('.asc-target-wrap');
        if (wrap) wrap.classList.add('asc-target-locked');

        const correctCards = document.querySelectorAll('.asc-target-card-correct');
        correctCards.forEach((c, i) => {
            setTimeout(() => c.classList.remove('asc-target-card-correct'), i * 60);
        });
        const filledSegs = Array.from(document.querySelectorAll('.asc-target-progress-seg-filled'));
        filledSegs.reverse().forEach((s, i) => {
            setTimeout(() => {
                s.classList.remove('asc-target-progress-seg-filled');
                s.classList.add('asc-target-progress-seg-resetting');
                setTimeout(() => s.classList.remove('asc-target-progress-seg-resetting'), 400);
            }, i * 80);
        });

        setTimeout(() => {
            if (wrap) wrap.classList.remove('asc-target-locked');
            ascensionState.targetLocked = false;
        }, 1200);

        ascensionState.targetCurrentId = data.currentTarget?.id || null;
        const nameEl = document.getElementById('ascAdminTargetName');
        if (nameEl && data.currentTarget) {
            setTimeout(() => {
                nameEl.classList.remove('asc-target-name-pop');
                void nameEl.offsetWidth;
                nameEl.textContent = data.currentTarget.name;
                nameEl.classList.add('asc-target-name-pop');
            }, 350);
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// 🎯 ASCENSION — Mini-jeu SCRAMBLE / Anagramme (Admin)
// ═══════════════════════════════════════════════════════════════

function _renderAdminScrambleSpectator(container, floorData) {
    const wrap = document.createElement('div');
    wrap.className = 'asc-scramble-wrap asc-scramble-spectator';
    const top = document.createElement('div');
    top.className = 'asc-scramble-top';
    const catLbl = document.createElement('div');
    catLbl.className = 'asc-scramble-cat';
    catLbl.textContent = floorData.category === 'anime' ? 'Anime' : 'Personnage';
    top.appendChild(catLbl);
    const imgWrap = document.createElement('div');
    imgWrap.className = 'asc-scramble-img-wrap asc-scramble-mystery';
    const mystery = document.createElement('div');
    mystery.className = 'asc-scramble-mystery-icon';
    mystery.textContent = '?';
    imgWrap.appendChild(mystery);
    top.appendChild(imgWrap);
    wrap.appendChild(top);

    const reserve = document.createElement('div');
    reserve.className = 'asc-scramble-reserve';
    (floorData.scrambled || []).forEach(letter => {
        const btn = document.createElement('div');
        btn.className = 'asc-scramble-letter';
        btn.textContent = letter;
        reserve.appendChild(btn);
    });
    wrap.appendChild(reserve);
    container.appendChild(wrap);
}

function _renderAdminScramblePlayer(container, floorData) {
    ascensionState.scrambleLetters = [...floorData.scrambled];
    ascensionState.scrambleSlots = new Array(floorData.wordLength).fill(null);
    ascensionState.scrambleSubmitting = false;

    const wrap = document.createElement('div');
    wrap.className = 'asc-scramble-wrap';

    const top = document.createElement('div');
    top.className = 'asc-scramble-top';
    const catLbl = document.createElement('div');
    catLbl.className = 'asc-scramble-cat';
    catLbl.textContent = floorData.category === 'anime' ? 'Anime' : 'Personnage';
    top.appendChild(catLbl);
    const imgWrap = document.createElement('div');
    imgWrap.className = 'asc-scramble-img-wrap asc-scramble-mystery';
    const mystery = document.createElement('div');
    mystery.className = 'asc-scramble-mystery-icon';
    mystery.textContent = '?';
    imgWrap.appendChild(mystery);
    top.appendChild(imgWrap);
    wrap.appendChild(top);

    const slotEl = document.createElement('div');
    slotEl.className = 'asc-scramble-slot';
    for (let i = 0; i < floorData.wordLength; i++) {
        const cell = document.createElement('div');
        cell.className = 'asc-scramble-cell';
        cell.dataset.slotIdx = i;
        cell.addEventListener('click', () => _onAdminScrambleSlotClick(i));
        slotEl.appendChild(cell);
    }
    wrap.appendChild(slotEl);

    const reserve = document.createElement('div');
    reserve.className = 'asc-scramble-reserve';
    ascensionState.scrambleLetters.forEach((letter, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'asc-scramble-letter';
        btn.textContent = letter;
        btn.dataset.idx = idx;
        btn.addEventListener('click', () => _onAdminScrambleReserveClick(idx));
        reserve.appendChild(btn);
    });
    wrap.appendChild(reserve);

    container.appendChild(wrap);

    // 🆕 Active le clavier physique
    _setupAdminScrambleKeyboard();
}

function _setupAdminScrambleKeyboard() {
    _cleanupAdminScrambleKeyboard();
    const handler = (e) => {
        if (ascensionState.validated) return;
        if (ascensionState.scrambleSubmitting) return;
        const wrap = document.querySelector('.asc-scramble-wrap');
        if (!wrap) return;
        const tgt = e.target;
        if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;

        const key = e.key;
        if (key === 'Backspace') {
            const slots = ascensionState.scrambleSlots;
            for (let i = slots.length - 1; i >= 0; i--) {
                if (slots[i]) {
                    _onAdminScrambleSlotClick(i);
                    break;
                }
            }
            e.preventDefault();
        } else if (/^[a-zA-Z]$/.test(key)) {
            const letter = key.toUpperCase();
            const slots = ascensionState.scrambleSlots;
            const usedReserveIdxs = new Set(slots.filter(s => s).map(s => s.reserveIdx));
            const reserveIdx = ascensionState.scrambleLetters.findIndex((l, idx) =>
                l === letter && !usedReserveIdxs.has(idx)
            );
            if (reserveIdx !== -1) {
                _onAdminScrambleReserveClick(reserveIdx);
                e.preventDefault();
            }
        }
    };
    document.addEventListener('keydown', handler);
    ascensionState.scrambleKeydownHandler = handler;
}

function _cleanupAdminScrambleKeyboard() {
    if (ascensionState.scrambleKeydownHandler) {
        document.removeEventListener('keydown', ascensionState.scrambleKeydownHandler);
        ascensionState.scrambleKeydownHandler = null;
    }
}

function _onAdminScrambleReserveClick(reserveIdx) {
    if (ascensionState.validated) return;
    if (ascensionState.scrambleSubmitting) return;
    const slots = ascensionState.scrambleSlots;
    const firstEmpty = slots.findIndex(s => s === null);
    if (firstEmpty === -1) return;
    if (slots.some(s => s && s.reserveIdx === reserveIdx)) return;

    const letter = ascensionState.scrambleLetters[reserveIdx];
    slots[firstEmpty] = { letter, reserveIdx };
    _setAdminScrambleCellLetter(firstEmpty, letter, true);
    _setAdminScrambleReserveUsed(reserveIdx, true);
    _playAdminScrambleClickSound();
    _checkAdminScrambleAutoSubmit();
}

function _onAdminScrambleSlotClick(slotIdx) {
    if (ascensionState.validated) return;
    if (ascensionState.scrambleSubmitting) return;
    const slots = ascensionState.scrambleSlots;
    const slot = slots[slotIdx];
    if (!slot) return;
    slots[slotIdx] = null;
    _setAdminScrambleCellLetter(slotIdx, null, false);
    _setAdminScrambleReserveUsed(slot.reserveIdx, false);
    _playAdminScrambleClickSound();
}

function _setAdminScrambleCellLetter(slotIdx, letter, animate) {
    const cell = document.querySelector('.asc-scramble-cell[data-slot-idx="' + slotIdx + '"]');
    if (!cell) return;
    cell.textContent = letter || '';
    if (letter) {
        cell.classList.add('asc-scramble-cell-filled');
        if (animate) {
            cell.classList.remove('asc-scramble-cell-pop');
            void cell.offsetWidth;
            cell.classList.add('asc-scramble-cell-pop');
        }
    } else {
        cell.classList.remove('asc-scramble-cell-filled', 'asc-scramble-cell-pop');
    }
}

function _setAdminScrambleReserveUsed(reserveIdx, used) {
    const btn = document.querySelector('.asc-scramble-letter[data-idx="' + reserveIdx + '"]');
    if (btn) btn.classList.toggle('asc-scramble-letter-used', used);
}

function _checkAdminScrambleAutoSubmit() {
    const slots = ascensionState.scrambleSlots;
    if (slots.some(s => s === null)) return;
    ascensionState.scrambleSubmitting = true;
    const guess = slots.map(s => s.letter).join('');
    socket.emit('ascension-check-scramble', { guess });
}

function _handleAdminScrambleResult(data) {
    const slotEl = document.querySelector('.asc-scramble-slot');
    if (!slotEl) return;

    if (data.correct) {
        slotEl.classList.add('asc-scramble-slot-correct');
        _playAdminIntruderVictorySound();
        _cleanupAdminScrambleKeyboard();
        setTimeout(() => {
            const wrap = document.querySelector('.asc-scramble-wrap');
            if (wrap) wrap.classList.add('asc-scramble-validated');
        }, 700);
    } else {
        slotEl.classList.remove('asc-scramble-slot-shake');
        void slotEl.offsetWidth;
        slotEl.classList.add('asc-scramble-slot-shake', 'asc-scramble-slot-wrong');
        _playAdminIntruderWrongSound();

        // 🆕 Highlight cells qui étaient à la bonne place
        if (Array.isArray(data.correctPositions)) {
            data.correctPositions.forEach((isOk, i) => {
                if (!isOk) return;
                const cell = document.querySelector('.asc-scramble-cell[data-slot-idx="' + i + '"]');
                if (cell) cell.classList.add('asc-scramble-cell-was-correct');
            });
        }

        setTimeout(() => {
            slotEl.classList.remove('asc-scramble-slot-shake', 'asc-scramble-slot-wrong');
            document.querySelectorAll('.asc-scramble-cell-was-correct').forEach(c => c.classList.remove('asc-scramble-cell-was-correct'));
            for (let i = 0; i < ascensionState.scrambleSlots.length; i++) {
                ascensionState.scrambleSlots[i] = null;
                _setAdminScrambleCellLetter(i, null, false);
            }
            document.querySelectorAll('.asc-scramble-letter').forEach(btn => {
                btn.classList.remove('asc-scramble-letter-used');
            });
            ascensionState.scrambleSubmitting = false;
        }, 1100);
    }
}

function _playAdminScrambleClickSound() {
    try {
        if (!window._ascAdminAudioCtx) window._ascAdminAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const ctx = window._ascAdminAudioCtx;
        if (ctx.state === 'suspended') ctx.resume();
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(1100, t);
        o.frequency.exponentialRampToValueAtTime(700, t + 0.04);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.04, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        o.connect(g).connect(ctx.destination);
        o.start(t); o.stop(t + 0.07);
    } catch(e) {}
}

// Drag & drop admin — pareil que côté joueur (pointer events + FLIP)
function _setupAdminOrderDrag(grid) {
    let dragCard = null;
    let pointerId = null;
    let startX = 0, startY = 0;
    let hoveredTarget = null;  // 🆕 Cible actuellement highlightée — source de vérité pour le drop
    
    const onPointerDown = (e) => {
        if (ascensionState.validated) return;
        const card = e.target.closest('.asc-order-card');
        if (!card || !grid.contains(card)) return;
        
        e.preventDefault();
        dragCard = card;
        pointerId = e.pointerId;
        startX = e.clientX;
        startY = e.clientY;
        hoveredTarget = null;
        
        // 🔊 Prime le AudioContext sur ce user-gesture (pointerdown)
        try {
            if (!window._ascAdminAudioCtx) {
                window._ascAdminAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (window._ascAdminAudioCtx.state === 'suspended') {
                window._ascAdminAudioCtx.resume();
            }
        } catch(err) { console.warn('AudioContext prime failed:', err); }
        
        card.setPointerCapture(pointerId);
        card.classList.add('asc-order-dragging');
    };
    
    const onPointerMove = (e) => {
        if (!dragCard) return;
        e.preventDefault();
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        dragCard.style.transform = `translate(${dx}px, ${dy}px) scale(1.05) rotate(2deg)`;
        
        // 🆕 Stocker la cible — source de vérité pour le drop
        const target = _findAdminOrderTargetCard(grid, dragCard);
        if (target !== hoveredTarget) {
            if (hoveredTarget) hoveredTarget.classList.remove('asc-order-target');
            if (target) target.classList.add('asc-order-target');
            hoveredTarget = target;
        }
    };
    
    const onPointerUp = (e) => {
        if (!dragCard) return;
        const card = dragCard;
        
        // 🆕 Réutiliser hoveredTarget (= ce que le user voit highlighté)
        const target = hoveredTarget;
        
        if (hoveredTarget) hoveredTarget.classList.remove('asc-order-target');
        hoveredTarget = null;
        
        if (target && target !== card) {
            // 🆕 INSERT basé sur l'INDEX LOGIQUE des cards (la dragCard prend la place de la cible)
            const allCards = Array.from(grid.querySelectorAll('.asc-order-card'));
            const dragIdx   = allCards.indexOf(card);
            const targetIdx = allCards.indexOf(target);
            const insertBefore = dragIdx > targetIdx;
            _reorderAdminOrderCardsWithFLIP(grid, card, target, insertBefore);
            _playAdminOrderSwapSound();  // 🔊 Son d'interchange
        } else {
            card.style.transition = 'transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)';
            card.style.transform = '';
            setTimeout(() => { card.style.transition = ''; }, 260);
        }
        
        card.classList.remove('asc-order-dragging');
        try { card.releasePointerCapture(pointerId); } catch(e) {}
        
        setTimeout(() => {
            _updateAdminOrderNums(grid);
            _buildAdminOrderConnectors(grid);
            _submitAdminOrderCheck(grid);
        }, 520);  // 🆕 Aligné avec FLIP cascade
        
        dragCard = null;
        pointerId = null;
    };
    
    grid.addEventListener('pointerdown', onPointerDown);
    grid.addEventListener('pointermove', onPointerMove);
    grid.addEventListener('pointerup', onPointerUp);
    grid.addEventListener('pointercancel', onPointerUp);
}

// 🆕 Trouve la card cible par chevauchement HORIZONTAL avec la dragCard.
function _findAdminOrderTargetCard(grid, dragCard, pointerX) {
    const cards = Array.from(grid.querySelectorAll('.asc-order-card')).filter(c => c !== dragCard);
    if (cards.length === 0) return null;
    
    const dragRect = dragCard.getBoundingClientRect();
    const dragLeft  = dragRect.left;
    const dragRight = dragRect.right;
    const dragWidth = dragRect.width;
    
    const MIN_OVERLAP = dragWidth * 0.25;
    
    let bestCard = null;
    let bestOverlap = 0;
    
    for (const c of cards) {
        const rect = c.getBoundingClientRect();
        const overlapLeft  = Math.max(dragLeft,  rect.left);
        const overlapRight = Math.min(dragRight, rect.right);
        const overlap = Math.max(0, overlapRight - overlapLeft);
        
        if (overlap > bestOverlap && overlap >= MIN_OVERLAP) {
            bestOverlap = overlap;
            bestCard = c;
        }
    }
    
    return bestCard;
}

// FLIP technique : INSERT logic — la dragCard se place à la position du target,
// et toutes les cards entre les deux se décalent d'un cran avec une cascade fluide.
function _reorderAdminOrderCardsWithFLIP(grid, dragCard, targetCard, insertBefore) {
    const allCards = Array.from(grid.querySelectorAll('.asc-order-card'));
    
    const positions = new Map();
    allCards.forEach(c => positions.set(c, c.getBoundingClientRect()));
    
    const dragIdxBefore = allCards.indexOf(dragCard);
    
    dragCard.style.transition = 'none';
    dragCard.style.transform = '';
    
    if (insertBefore) {
        grid.insertBefore(dragCard, targetCard);
    } else {
        grid.insertBefore(dragCard, targetCard.nextSibling);
    }
    
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
    
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const easing = 'cubic-bezier(0.34, 1.2, 0.5, 1)';
            const duration = 380;
            
            movedCards.forEach(({ card }) => {
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
}

function _updateAdminOrderNums(grid) {
    const cards = grid.querySelectorAll('.asc-order-card');
    cards.forEach((c, i) => {
        const num = c.querySelector('.asc-order-num');
        if (num) num.textContent = i + 1;
    });
}

function _submitAdminOrderCheck(grid) {
    if (!ascensionState.active || ascensionState.validated) return;
    const order = Array.from(grid.querySelectorAll('.asc-order-card')).map(c => c.dataset.arcId);
    if (typeof socket !== 'undefined' && socket) {
        socket.emit('ascension-check-order', { order });
    }
}

// 🎵 Son d'interchange Order — 2 clicks rapides décalés
function _playAdminOrderSwapSound() {
    try {
        if (!window._ascAdminAudioCtx) {
            window._ascAdminAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        const ctx = window._ascAdminAudioCtx;
        if (ctx.state === 'suspended') ctx.resume();
        const t = ctx.currentTime;
        
        // Click 1 — fréquence descendante
        const c1 = ctx.createOscillator();
        const g1 = ctx.createGain();
        c1.type = 'triangle';
        c1.frequency.setValueAtTime(1400, t);
        c1.frequency.exponentialRampToValueAtTime(600, t + 0.06);
        g1.gain.setValueAtTime(0, t);
        g1.gain.linearRampToValueAtTime(0.06, t + 0.003);
        g1.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        c1.connect(g1).connect(ctx.destination);
        c1.start(t); c1.stop(t + 0.09);
        
        // Click 2 — fréquence montante 80ms plus tard
        const c2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        c2.type = 'triangle';
        c2.frequency.setValueAtTime(700, t + 0.08);
        c2.frequency.exponentialRampToValueAtTime(1500, t + 0.14);
        g2.gain.setValueAtTime(0, t + 0.08);
        g2.gain.linearRampToValueAtTime(0.06, t + 0.083);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        c2.connect(g2).connect(ctx.destination);
        c2.start(t + 0.08); c2.stop(t + 0.17);
    } catch(err) {
        console.warn('🔊 Admin order swap sound failed:', err);
    }
}

// 🆕 Construit les connecteurs SVG (courbes Bézier + flèches) entre les cards de la roadmap
function _buildAdminOrderConnectors(grid) {
    if (!grid || !grid.isConnected) return;
    
    const old = grid.querySelector('.asc-order-connectors');
    if (old) old.remove();
    
    const cards = grid.querySelectorAll('.asc-order-card');
    if (cards.length < 2) return;
    
    // 🆕 Cleanup transforms FLIP résiduels avant de mesurer (évite courbes en S)
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
    
    const defs = document.createElementNS(SVG_NS, 'defs');
    defs.innerHTML = `
        <linearGradient id="ascOrderGradWhite" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.35"/>
            <stop offset="50%"  stop-color="#ffffff" stop-opacity="1"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0.35"/>
        </linearGradient>
    `;
    svg.appendChild(defs);
    
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
        
        const angle = Math.atan2(y2 - cy2, x2 - cx2) * 180 / Math.PI;
        const arrow = document.createElementNS(SVG_NS, 'path');
        arrow.setAttribute('class', 'conn-arrow');
        arrow.setAttribute('d', 'M 0 0 L -10 -5 L -7 0 L -10 5 Z');
        arrow.setAttribute('transform', `translate(${x2}, ${y2}) rotate(${angle})`);
        svg.appendChild(arrow);
    }
    
    grid.appendChild(svg);
}

// 🆕 Attache un listener resize qui rebuild les connecteurs (1 seul à la fois côté admin)
let _adminOrderResizeHandler = null;
let _adminOrderResizeTO = null;
function _attachAdminOrderResize(grid) {
    _detachAdminOrderResize();
    _adminOrderResizeHandler = () => {
        clearTimeout(_adminOrderResizeTO);
        _adminOrderResizeTO = setTimeout(() => {
            if (document.body.contains(grid)) _buildAdminOrderConnectors(grid);
        }, 150);
    };
    window.addEventListener('resize', _adminOrderResizeHandler);
}
function _detachAdminOrderResize() {
    if (_adminOrderResizeHandler) {
        window.removeEventListener('resize', _adminOrderResizeHandler);
        _adminOrderResizeHandler = null;
    }
    clearTimeout(_adminOrderResizeTO);
}

function _getFloorDescription(data) {
    switch (data.type) {
        case 'guess': return `Devinez le nom de ${data.totalToGuess} personnages`;
        case 'target': return `Clique sur les ${data.totalTargets} bonnes cibles d'affilée`;
        case 'scramble': return data.category === 'anime' ? `Reconstitue le nom de l'anime` : `Reconstitue le nom du personnage`;
        case 'intruder': return '';  // 🆕 La description est affichée dans le sidebar à droite
        case 'wordle': return data.category === 'anime' ? "Devine l'anime" : 'Devine le personnage';
        case 'silhouette': return `Identifiez le personnage par sa silhouette`;
        case 'order': return `Classez les arcs de ${data.anime} dans l'ordre`;
        case 'match':
            switch (data.subtype) {
                case 'char_anime':   return "Lie les personnages à leur anime";
                case 'techniques':   return "Lie les personnages à leur technique";
                case 'weapons':      return "Lie les personnages à leur arme";
                case 'couples':      return "Lie les couples";
                case 'rivals':       return "Lie les rivaux";
                case 'same_voice':   return "Lie les personnages ayant la même voix japonaise";
                case 'anime_studio': return "Lie chaque anime à son studio";
                case 'anime_year':   return "Lie chaque anime à sa première année de parution";
                default:             return "Reliez les bonnes paires";
            }
        default: return '';
    }
}

// ═══ Circular Timer ═══

function _startAscensionTimer(endTime) {
    _stopAscensionTimer();
    ascensionState.timerEndTime = endTime;
    
    const fill = document.getElementById('ascTimerFill');
    const text = document.getElementById('ascTimerText');
    const wrap = document.getElementById('ascTimerWrap');
    if (!fill || !text) return;
    
    if (wrap) wrap.style.opacity = '1';
    
    const circumference = 2 * Math.PI * 18; // r=18
    fill.style.strokeDasharray = circumference;
    
    function tick() {
        const now = Date.now();
        const total = ascensionState.timer * 1000;
        const remaining = Math.max(0, endTime - now);
        const pct = remaining / total;
        
        fill.style.strokeDashoffset = circumference * (1 - pct);
        text.textContent = Math.ceil(remaining / 1000);
        
        if (remaining <= 0) {
            text.textContent = '0';
            return;
        }
        
        ascensionState.timerRAF = requestAnimationFrame(tick);
    }
    
    ascensionState.timerRAF = requestAnimationFrame(tick);
}

function _stopAscensionTimer() {
    if (ascensionState.timerRAF) {
        cancelAnimationFrame(ascensionState.timerRAF);
        ascensionState.timerRAF = null;
    }
}

// ═══ Success flash ═══

function _flashAscensionSuccess() {
    const flash = document.createElement('div');
    flash.className = 'asc-success-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 600);
}

// ═══ Podium ═══

function _showAscensionPodium(podium, winner) {
    const content = document.getElementById('ascContent');
    const wrapper = document.querySelector('.ascension-screen') || content?.parentElement;
    if (!content) return;

    if (wrapper) wrapper.classList.add('asc-ending');

    const escapeHtml = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const initialFromName = (n) => { const t = (n || '?').trim(); return t ? t.charAt(0).toUpperCase() : '?'; };
    const medalSvg = (rank) => {
        return '<svg viewBox="0 0 24 24" class="asc-podium-medal asc-podium-medal-r' + rank + '" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
             + '<path d="M8 3l-3 6 4 5"/><path d="M16 3l3 6-4 5"/>'
             + '<circle cx="12" cy="16" r="6"/>'
             + '<text x="12" y="19.2" text-anchor="middle" font-size="7" font-weight="700" fill="currentColor" stroke="none">' + rank + '</text>'
             + '</svg>';
    };

    setTimeout(() => {
        const others = podium.slice(1, 3);
        const rows = others.map((p, idx) => {
            const rank = idx + 2;
            const avatar = p.avatarUrl
                ? '<img class="asc-podium-avatar-img" src="' + escapeHtml(p.avatarUrl) + '" alt=""/>'
                : '<span class="asc-podium-avatar-fallback">' + escapeHtml(initialFromName(p.username)) + '</span>';
            return '<div class="asc-podium-row asc-podium-rank-' + rank + '" style="--asc-row-i:' + idx + '">'
                 +   '<span class="asc-podium-medal-wrap">' + medalSvg(rank) + '</span>'
                 +   '<span class="asc-podium-avatar">' + avatar + '</span>'
                 +   '<span class="asc-podium-name">' + escapeHtml(p.username) + '</span>'
                 +   '<span class="asc-podium-floor">Étage ' + p.floor + '</span>'
                 + '</div>';
        }).join('');

        const winnerName = winner ? escapeHtml(winner.username) : '';
        const winnerAvatar = winner && winner.avatarUrl
            ? '<img class="asc-podium-hero-avatar-img" src="' + escapeHtml(winner.avatarUrl) + '" alt=""/>'
            : '<span class="asc-podium-hero-avatar-fallback">' + escapeHtml(initialFromName(winner?.username)) + '</span>';
        const stars = ['<span class="asc-podium-spark asc-podium-spark-1"></span>',
                       '<span class="asc-podium-spark asc-podium-spark-2"></span>',
                       '<span class="asc-podium-spark asc-podium-spark-3"></span>',
                       '<span class="asc-podium-spark asc-podium-spark-4"></span>'].join('');

        content.innerHTML = ''
            + '<div class="asc-podium">'
            +   '<div class="asc-podium-hero">'
            +     '<div class="asc-podium-hero-avatar">' + stars + winnerAvatar + '</div>'
            +     '<div class="asc-podium-hero-name">' + winnerName + '</div>'
            +     '<div class="asc-podium-hero-sub">a atteint le sommet</div>'
            +   '</div>'
            +   (rows ? '<div class="asc-podium-list">' + rows + '</div>' : '')
            + '</div>';

        if (wrapper) {
            wrapper.classList.remove('asc-ending');
            wrapper.classList.add('asc-end-shown');
        }
    }, 1400);
}

// ═══ Close button ═══

function _wireAscensionCloseBtn() {
    const closeBtn = document.getElementById('ascensionCloseBtn');
    const confirmOverlay = document.getElementById('ascensionConfirmOverlay');
    const confirmCancel = document.getElementById('ascensionConfirmCancel');
    const confirmYes = document.getElementById('ascensionConfirmYes');
    
    if (closeBtn && confirmOverlay) {
        closeBtn.onclick = () => confirmOverlay.classList.add('active');
    }
    if (confirmCancel && confirmOverlay) {
        confirmCancel.onclick = () => confirmOverlay.classList.remove('active');
    }
    if (confirmOverlay) {
        confirmOverlay.onclick = (e) => { if (e.target === confirmOverlay) confirmOverlay.classList.remove('active'); };
    }
    
    if (!window._ascensionEscBound) {
        window._ascensionEscBound = true;
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const overlay = document.getElementById('ascensionConfirmOverlay');
                if (!overlay) return;
                if (overlay.classList.contains('active')) overlay.classList.remove('active');
                else if (ascensionState.active) overlay.classList.add('active');
            }
        });
    }
    
    if (confirmYes) {
        confirmYes.onclick = async () => {
            confirmOverlay.classList.remove('active');
            try {
                await fetch('/admin/toggle-game', { method: 'POST', credentials: 'same-origin' });
                hideAscensionGameUI();
            } catch (e) { console.error('Erreur fermeture ascension:', e); }
        };
    }
}

// ═══ Countdown 3-2-1-GO ═══

function _startAscensionCountdown(countdownEndsAt) {
    const existing = document.getElementById('ascensionCountdown');
    if (existing) existing.remove();
    
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
                _playAscensionGoSound();
            } else {
                // 🆕 Tick sound façon Mario Kart pour 3, 2, 1
                _playAscensionTickSound();
            }
        }
        
        requestAnimationFrame(tick);
    }
    
    requestAnimationFrame(tick);
}

// 🆕 Tick sound façon Mario Kart — joué pour 3, 2, 1 dans le countdown
function _playAscensionTickSound() {
    try {
        if (!window._ascAdminAudioCtx) {
            window._ascAdminAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        const ctx = window._ascAdminAudioCtx;
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
}

function _playAscensionGoSound() {
    try {
        if (!window._ascAdminAudioCtx) {
            window._ascAdminAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        const ctx = window._ascAdminAudioCtx;
        if (ctx.state === 'suspended') ctx.resume();
        const t = ctx.currentTime;
        const b1 = ctx.createOscillator();
        const g1 = ctx.createGain();
        b1.connect(g1); g1.connect(ctx.destination);
        b1.type = 'square'; b1.frequency.setValueAtTime(880, t);
        g1.gain.setValueAtTime(0.12, t); g1.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
        b1.start(t); b1.stop(t + 0.08);
        const b2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        b2.connect(g2); g2.connect(ctx.destination);
        b2.type = 'square'; b2.frequency.setValueAtTime(1320, t + 0.07);
        g2.gain.setValueAtTime(0, t); g2.gain.setValueAtTime(0.14, t + 0.07);
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
}