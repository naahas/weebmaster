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
};

function initAscensionSocketHandlers(socket) {
    
    socket.on('ascension-game-started', (data) => {
        console.log('🏔️ Ascension démarrée:', data);
        ascensionState.active = true;
        ascensionState.floors = data.floors || 15;
        ascensionState.timer = data.timer || 15;
        ascensionState.players = data.players || [];
        ascensionState.playerProgress = data.players || [];
        ascensionState.currentFloor = 0;
        
        showAscensionGameUI();
        _startAscensionCountdown(data.countdownEndsAt);
    });
    
    socket.on('ascension-state', (data) => {
        if (data && data.active) {
            ascensionState.active = true;
            ascensionState.floors = data.floors || 15;
            ascensionState.timer = data.timer || 15;
            ascensionState.currentFloor = data.currentFloor || 0;
            ascensionState.playerProgress = data.playerProgress || [];
            ascensionState.floorData = data.floorData;
            ascensionState.timerEndTime = data.floorTimerEndTime;
            
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
        
        // Reveal UI elements (hidden during countdown)
        document.querySelectorAll('.asc-pre-start').forEach(el => {
            el.classList.remove('asc-pre-start');
            el.classList.add('asc-reveal');
        });
        
        _renderAscensionFloor(data.floorData, data.floor);
        _startAscensionTimer(data.timerEndTime);
        _updateAscensionTower();
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
                    <div class="asc-floor-badge">
                        <span class="asc-floor-label">ÉTAGE</span>
                        <span class="asc-floor-num" id="ascFloorNum">1</span>
                    </div>
                </div>
            </div>
            <div class="asc-floor-title asc-pre-start" id="ascFloorTitle"></div>
            <div class="asc-content" id="ascContent">
                <!-- Mini-game renders here -->
            </div>
        </div>
        <div class="asc-tower asc-pre-start">
            <div class="asc-timer-wrap" id="ascTimerWrap">
                <svg class="asc-timer-svg" viewBox="0 0 44 44" width="36" height="36">
                    <circle class="asc-timer-bg" cx="22" cy="22" r="18"/>
                    <circle class="asc-timer-fill" id="ascTimerFill" cx="22" cy="22" r="18"/>
                </svg>
                <div class="asc-timer-text" id="ascTimerText"></div>
            </div>
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
    const content = document.getElementById('ascContent');
    const floorNum = document.getElementById('ascFloorNum');
    const floorTitle = document.getElementById('ascFloorTitle');
    
    if (floorNum) floorNum.textContent = floorIndex + 1;
    
    // Animate floor title + subtitle
    if (floorTitle) {
        floorTitle.classList.remove('pop');
        const desc = _getFloorDescription(floorData);
        floorTitle.innerHTML = '<span class="asc-title-main">' + (floorData?.label || '') + '</span>' +
            (desc ? '<span class="asc-title-sub">' + desc + '</span>' : '');
        void floorTitle.offsetHeight;
        floorTitle.classList.add('pop');
    }
    
    if (!content || !floorData) return;
    
    // Content will be filled by actual mini-game renderers later
    content.innerHTML = '';
}

function _getFloorDescription(data) {
    switch (data.type) {
        case 'guess': return `Devinez le nom de ${data.totalToGuess} personnages`;
        case 'target': return `Trouvez ${data.totalTargets} cibles parmi ${data.characters?.length || 30} personnages`;
        case 'intruder': return `Trouvez les 3 intrus qui ne sont pas de ${data.anime}`;
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
            }
        }
        
        requestAnimationFrame(tick);
    }
    
    requestAnimationFrame(tick);
}

function _playAscensionGoSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
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