// ============================================
// MODE SURVIE - Admin Module
// ============================================

const survieState = {
    active: false,
    currentRound: 0,
    roundInProgress: false,
    alivePlayers: [],
    eliminatedPlayers: [],
    completedCount: 0,
    qualifiedCount: 0,
    toEliminateCount: 0,
    timer: 30,
    timerInterval: null,
    timeRemaining: 30,
};

// ============================================
// SOCKET HANDLERS
// ============================================
function initSurvieSocketHandlers(socket) {
    
    socket.on('survie-game-started', (data) => {
        console.log('Survie demarree:', data);
        survieState.active = true;
        survieState.currentRound = 0;
        survieState.timer = data.timer || 30;
        survieState.alivePlayers = data.players || [];
        survieState.eliminatedPlayers = [];
        showSurvieGameUI();
    });
    
    socket.on('survie-round-start', (data) => {
        survieState.currentRound = data.round;
        survieState.roundInProgress = true;
        survieState.completedCount = 0;
        survieState.qualifiedCount = data.qualifiedCount;
        survieState.toEliminateCount = data.toEliminateCount;
        survieState.alivePlayers = data.alivePlayers;
    });
    
    socket.on('survie-qualified-update', (data) => {
        survieState.completedCount = data.completedCount;
    });
    
    socket.on('survie-round-results', (data) => {
        survieState.roundInProgress = false;
        survieState.alivePlayers = data.qualified;
    });
    
    socket.on('survie-duel-start', (data) => {
        survieState.currentRound = data.round;
        survieState.roundInProgress = true;
        survieState.completedCount = 0;
        survieState.qualifiedCount = 1;
        survieState.toEliminateCount = 1;
    });
    
    socket.on('survie-game-ended', (data) => {
        survieState.active = false;
        survieState.roundInProgress = false;
    });
    
    socket.on('survie-state', (data) => {
        if (data.active) {
            survieState.active = true;
            survieState.currentRound = data.currentRound;
            survieState.roundInProgress = data.roundInProgress;
            survieState.alivePlayers = data.alivePlayers;
            survieState.completedCount = data.completedCount;
            survieState.qualifiedCount = data.qualifiedCount;
            survieState.toEliminateCount = data.toEliminateCount;
            showSurvieGameUI();
        }
    });
}

// ============================================
// UI
// ============================================
function showSurvieGameUI() {
    const stateIdle = document.getElementById('stateIdle');
    const stateGame = document.getElementById('stateGame');
    const stateLobby = document.getElementById('stateLobby');
    const mainContainer = document.getElementById('mainContainer');
    const bgText = document.getElementById('bgText');
    const statusText = document.getElementById('statusText');
    const statusDot = document.getElementById('statusDot');
    
    if (mainContainer) mainContainer.style.display = '';
    if (stateIdle) stateIdle.style.display = 'none';
    if (stateLobby) {
        stateLobby.classList.remove('active');
        stateLobby.style.display = 'none';
    }
    if (stateGame) {
        stateGame.style.display = 'flex';
        stateGame.classList.add('active');
        stateGame.style.opacity = '1';
        stateGame.style.pointerEvents = '';
    }
    
    if (bgText) {
        bgText.classList.remove('lobby-active', 'game-active');
        bgText.classList.add('survie-mode');
        bgText.style.transition = 'opacity 0.5s';
        bgText.style.opacity = '0';
        setTimeout(() => {
            bgText.textContent = 'SURVIE';
            bgText.style.opacity = '';
            bgText.style.transition = '';
        }, 500);
    }
    
    if (statusDot) statusDot.classList.add('active');
    if (statusText) statusText.textContent = 'En partie';
    
    const logoutBtn = document.getElementById('headerLogoutBtn');
    if (logoutBtn) logoutBtn.style.display = 'none';
    
    const modeBadgeHeader = document.getElementById('modeBadgeHeader');
    if (modeBadgeHeader) modeBadgeHeader.style.display = 'none';
    
    const recentPanel = document.getElementById('recentPanel');
    const lastgamePanel = document.getElementById('lastgamePanel');
    if (recentPanel) recentPanel.classList.add('hidden');
    if (lastgamePanel) lastgamePanel.classList.add('hidden');
    
    // Cacher les elements quiz
    ['gameLogsContainer', 'gameLogsToggle', 'gameCloseBtn', 'gameMainPanel'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    // Container vide
    if (!document.getElementById('survieContainer')) {
        const container = document.createElement('div');
        container.id = 'survieContainer';
        container.innerHTML = `
            <canvas id="survieAdminCanvas" style="position:absolute;inset:0;width:100%;height:100%;"></canvas>
            <button class="survie-close-lobby-btn" id="survieCloseLobbyBtn">Fermer lobby</button>
            <div class="survie-confirm-overlay" id="survieConfirmOverlay">
                <div class="survie-confirm-modal">
                    <div class="survie-confirm-title">Fermer le lobby ?</div>
                    <div class="survie-confirm-sub">La partie en cours sera annulee</div>
                    <div class="survie-confirm-btns">
                        <button class="survie-confirm-btn cancel" id="survieConfirmCancel">Annuler</button>
                        <button class="survie-confirm-btn confirm" id="survieConfirmYes">Confirmer</button>
                    </div>
                </div>
            </div>
        `;
        
        const gameArea = stateGame || document.getElementById('mainContainer');
        if (gameArea) gameArea.appendChild(container);
        
        const closeBtn = document.getElementById('survieCloseLobbyBtn');
        const confirmOverlay = document.getElementById('survieConfirmOverlay');
        const confirmCancel = document.getElementById('survieConfirmCancel');
        const confirmYes = document.getElementById('survieConfirmYes');
        
        if (closeBtn && confirmOverlay) {
            closeBtn.onclick = () => confirmOverlay.classList.add('active');
        }
        if (confirmCancel && confirmOverlay) {
            confirmCancel.onclick = () => confirmOverlay.classList.remove('active');
        }
        if (confirmOverlay) {
            confirmOverlay.onclick = (e) => {
                if (e.target === confirmOverlay) confirmOverlay.classList.remove('active');
            };
        }
        if (confirmYes) {
            confirmYes.onclick = async () => {
                confirmOverlay.classList.remove('active');
                try {
                    await fetch('/admin/toggle-game', { method: 'POST', credentials: 'same-origin' });
                } catch (e) {
                    console.error('Erreur fermeture lobby survie:', e);
                }
            };
        }
        
        // Init admin canvas
        initSurvieAdminCanvas();
    }
    
    // Always (re)init canvas when players data is available
    if (survieState.alivePlayers.length > 0) {
        initSurvieAdminCanvas();
    }
}

// Admin canvas instance
let survieAdminCanvas = null;
let survieAdminMovedListenerSet = false;

function initSurvieAdminCanvas() {
    if (survieAdminCanvas) {
        survieAdminCanvas.stop();
        survieAdminCanvas = null;
    }
    
    const canvasEl = document.getElementById('survieAdminCanvas');
    if (!canvasEl || !window.SurvieCanvas) return;
    
    // Check if admin is also a player
    const adminIsPlayer = twitchUser && survieState.alivePlayers.some(p => p.twitchId === twitchUser.id);
    
    survieAdminCanvas = new SurvieCanvas(canvasEl, {
        isAdmin: !adminIsPlayer,
        localTwitchId: adminIsPlayer ? twitchUser.id : null,
        onPosition(x, y, vx, vy) {
            if (socket) {
                socket.emit('survie-position', { x, y, vx, vy });
            }
        }
    });
    
    // Add all players
    survieState.alivePlayers.forEach(p => {
        survieAdminCanvas.addPlayer(p.twitchId, p.username, p.colorIndex || 0);
    });
    
    survieAdminCanvas.start();
    
    // Listen for player movements (only once)
    if (!survieAdminMovedListenerSet) {
        survieAdminMovedListenerSet = true;
        socket.on('survie-player-moved', (data) => {
            if (survieAdminCanvas) {
                survieAdminCanvas.updateRemotePlayer(data.twitchId, data.x, data.y, data.vx, data.vy);
            }
        });
    }
}

function survieNextRound() {
    socket.emit('survie-next-round');
}