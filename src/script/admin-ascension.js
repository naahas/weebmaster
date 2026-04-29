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
        
        // 🎮 Détecter si l'admin a rejoint la partie en tant que joueur
        ascensionState.isAdminPlayer = !!(typeof twitchUser !== 'undefined' && twitchUser && twitchUser.id &&
            (data.players || []).some(p => p.twitchId === twitchUser.id));
        console.log('🏔️ Admin-player:', ascensionState.isAdminPlayer);
        
        showAscensionGameUI();
        _startAscensionCountdown(data.countdownEndsAt);
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
            
            // 🎮 Reconnexion : détecter si admin est joueur
            ascensionState.isAdminPlayer = !!(typeof twitchUser !== 'undefined' && twitchUser && twitchUser.id &&
                (data.playerProgress || []).some(p => p.twitchId === twitchUser.id));
            
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
        console.log(`🏔️ Étage ${data.floor + 1}:`, data.floorData?.type);
        ascensionState.currentFloor = data.floor;
        ascensionState.floorData = data.floorData;
        ascensionState.playerProgress = data.playerProgress || ascensionState.playerProgress;
        ascensionState.timerEndTime = data.timerEndTime;
        ascensionState.guessSolved = {};  // Reset pour ce nouvel étage
        ascensionState.myValidatedGuesses = [];  // 🆕 Nouveau floor → vide (la restauration n'a lieu qu'au reload via ascension-state)
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
    
    // 🎯 Validation incrémentale du mini-jeu Guess côté admin-player
    socket.on('ascension-guess-result', (data) => {
        if (!data || !data.characterId) return;
        if (!ascensionState.isAdminPlayer) return;  // Admin spectateur ignore
        
        const card = document.querySelector(`.asc-guess-card[data-char-id="${data.characterId}"]`);
        const input = card?.querySelector('.asc-guess-input');
        
        if (data.correct) {
            if (!ascensionState.guessSolved) ascensionState.guessSolved = {};
            ascensionState.guessSolved[data.characterId] = true;
            
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
    
    socket.on('ascension-game-end', (data) => {
        console.log('🏔️ Ascension terminée:', data);
        _stopAscensionTimer();
        _showAscensionPodium(data.podium, data.winner);
    });
}

// ═══ Game UI ═══

function showAscensionGameUI() {
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
            <div class="asc-tower-crown">♛</div>
            <div class="asc-tower-track" id="ascTowerTrack">
                <div class="asc-tower-marks" id="ascTowerMarks"></div>
                <div class="asc-tower-players" id="ascTowerPlayers"></div>
            </div>
            <div class="asc-tower-base" id="ascTowerBase">1</div>
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
    
    // Generate tower marks
    const marksEl = document.getElementById('ascTowerMarks');
    for (let i = 1; i < ascensionState.floors; i++) {
        const mark = document.createElement('div');
        mark.className = 'asc-tower-mark';
        mark.style.bottom = (i / ascensionState.floors * 100) + '%';
        if (i % 5 === 0) {
            mark.classList.add('major');
            mark.dataset.floor = i;
        }
        marksEl.appendChild(mark);
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
}

// ═══ Tower ═══

function _updateAscensionTower() {
    const playersEl = document.getElementById('ascTowerPlayers');
    if (!playersEl) return;
    
    const progress = ascensionState.playerProgress;
    if (!progress || progress.length === 0) return;
    
    const COLORS = ['#50dc78', '#ef7844', '#788cff', '#ff50a0', '#ffd700', '#00d4ff', '#c084fc', '#f97316'];
    
    // Find leader
    let maxFloor = 0;
    progress.forEach(p => { if (p.floor > maxFloor) maxFloor = p.floor; });
    
    playersEl.innerHTML = '';
    progress.forEach((p, i) => {
        const color = COLORS[i % COLORS.length];
        const pct = ascensionState.floors > 0 ? (p.floor / ascensionState.floors * 100) : 0;
        const isLeader = p.floor === maxFloor && maxFloor > 0;
        
        const el = document.createElement('div');
        el.className = 'asc-tower-player' + (isLeader ? ' leader' : '');
        el.style.bottom = pct + '%';
        el.style.setProperty('--pcolor', color);
        
        // Stagger horizontally to avoid overlap
        const offset = (i % 2 === 0) ? -12 : 12;
        el.style.left = `calc(50% + ${offset}px)`;
        
        el.innerHTML = `
            <span class="asc-tower-pname">${p.username}</span>
            <div class="asc-tower-pdot" style="background:${color};box-shadow:0 0 8px ${color};"></div>
        `;
        playersEl.appendChild(el);
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
        socket.emit('ascension-check-guess', { characterId, name, source: source || 'input' });
    }
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
        case 'target': return `Trouvez ${data.totalTargets} cibles parmi ${data.characters?.length || 30} personnages`;
        case 'intruder': return '';  // 🆕 La description est affichée dans le sidebar à droite
        case 'wordle': return `Devinez le mot de ${data.wordLength} lettres`;
        case 'silhouette': return `Identifiez le personnage par sa silhouette`;
        case 'order': return `Classez les arcs de ${data.anime} dans l'ordre`;
        case 'match': return `Associez chaque élément de gauche avec celui de droite`;
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
    if (!content) return;
    
    const podiumHTML = podium.slice(0, 5).map((p, i) => `
        <div class="asc-podium-row ${i === 0 ? 'winner' : ''}">
            <span class="asc-podium-rank">${i === 0 ? '♛' : (i + 1)}</span>
            <span class="asc-podium-name">${p.username}</span>
            <span class="asc-podium-floor">Étage ${p.floor}</span>
        </div>
    `).join('');
    
    content.innerHTML = `
        <div class="asc-podium">
            <div class="asc-podium-title">${winner ? winner.username + ' remporte la partie !' : 'Partie terminée'}</div>
            <div class="asc-podium-list">${podiumHTML}</div>
        </div>
    `;
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