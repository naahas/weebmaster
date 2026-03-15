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
    npcs: [],
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
        survieState.npcs = data.npcs || [];
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
            survieState.npcs = data.npcs || [];
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
            bgText.textContent = 'TRACE';
            bgText.style.opacity = '';
            bgText.style.transition = '';
        }, 500);
    }
    
    if (statusDot) statusDot.classList.add('active');
    if (statusText) statusText.textContent = 'En partie';
    
    // Hide header completely
    const mainHeader = document.getElementById('mainHeader');
    if (mainHeader) {
        mainHeader.style.display = 'none';
    }
    
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
            <div class="survie-inventory" id="survieInventory">
                <div class="survie-inventory-slot" data-slot="1" id="survieSlot1"></div>
                <div class="survie-inventory-slot" data-slot="2" id="survieSlot2"></div>
                <div class="survie-inventory-slot" data-slot="3" id="survieSlot3"></div>
                <div class="survie-inventory-slot" data-slot="4" id="survieSlot4"></div>
                <div class="survie-inventory-slot" data-slot="5" id="survieSlot5"></div>
                <div class="survie-inventory-slot" data-slot="6" id="survieSlot6"></div>
                <div class="survie-inventory-slot" data-slot="7" id="survieSlot7"></div>
                <div class="survie-inventory-slot" data-slot="8" id="survieSlot8"></div>
                <div class="survie-inventory-slot" data-slot="9" id="survieSlot9"></div>
                <div class="survie-inventory-slot" data-slot="10" id="survieSlot10"></div>
            </div>
            <div class="survie-quest-list" id="survieQuestList">
                <div class="survie-quest-header" id="survieQuestHeader">
                    <span class="survie-quest-title">Objectifs</span>
                    <div style="display:flex;align-items:center;">
                        <span class="survie-quest-counter" id="survieQuestCounter">0<span>/0</span></span>
                        <span class="survie-quest-toggle" id="survieQuestToggle">▼</span>
                    </div>
                </div>
                <div class="survie-quest-items" id="survieQuestItems"></div>
            </div>
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
        
        // If admin is a player, emit reconnect-player so server updates socket.id
        if (twitchUser) {
            const adminIsPlayer = survieState.alivePlayers.some(p => p.twitchId === twitchUser.id);
            if (adminIsPlayer) {
                socket.emit('reconnect-player', {
                    twitchId: twitchUser.id,
                    username: twitchUser.display_name
                });
            }
        }
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
        },
        onNPCInteract(npc) {
            openAdminSurvieDialogue(npc);
        },
        onDialogueClose() {
            closeAdminSurvieDialogue();
        }
    });
    
    // Resize first so dimensions are available for position calculation
    survieAdminCanvas.resize();
    
    // Add all players
    survieState.alivePlayers.forEach(p => {
        survieAdminCanvas.addPlayer(p.twitchId, p.username, p.colorIndex || 0, p.posX, p.posY);
    });
    
    survieAdminCanvas.start();
    
    // Add NPCs from server data
    (survieState.npcs || []).forEach(npc => {
        survieAdminCanvas.addNPC(npc.id, npc.name, npc.imageUrl, npc.x * MAP_WIDTH, npc.y * MAP_HEIGHT, npc.size, npc.defaultDialogues, npc.questDialogues, npc.isStructure);
    });
    
    // Quest list toggle
    const questHeader = document.getElementById('survieQuestHeader');
    if (questHeader && !questHeader._toggleBound) {
        questHeader._toggleBound = true;
        questHeader.addEventListener('click', (e) => {
            e.stopPropagation();
            const list = document.getElementById('survieQuestList');
            if (list) list.classList.toggle('collapsed');
        });
    }
    
    // TEST — Mock quest data (remove when real quests are connected)
    updateAdminQuestListUI({
        quests: [
            { id: 'deliver_armor_erza', type: 'DELIVER', desc: "Rapporter l'armure à Erza", currentStep: 2, totalSteps: 2, completed: true },
            { id: 'reunion_straw_hats', type: 'REUNION', desc: 'Réunir le Chapeau de Paille', found: ['luffy', 'zoro', 'nami', 'robin'], count: 4, completed: true },
            { id: 'collect_bentos', type: 'COLLECT_ITEMS', desc: 'Trouver les bentos pour Rengoku', collected: 3, count: 5, totalSteps: 6, completed: false },
            { id: 'riddle_kakashi', type: 'RIDDLE', desc: "L'énigme du masqué", completed: false },
            { id: 'escort_zoro', type: 'ESCORT', desc: 'Escorter Zoro jusqu\'au Sunny', currentStep: 0, totalSteps: 3, completed: false },
            { id: 'mystery_deathnote', type: 'MYSTERY', desc: 'Retrouver le Death Note volé', interrogated: ['makima'], completed: false },
        ],
    });
    
    // Listen for player movements (only once)
    if (!survieAdminMovedListenerSet) {
        survieAdminMovedListenerSet = true;
        
        const handleMove = (data) => {
            if (survieAdminCanvas) {
                // Don't update local player from remote events
                const adminTwitchId = twitchUser ? twitchUser.id : null;
                if (data.twitchId === adminTwitchId) return;
                survieAdminCanvas.updateRemotePlayer(data.twitchId, data.x, data.y, data.vx, data.vy);
            }
        };
        
        socket.on('survie-player-moved', handleMove);
        socket.on('survie-player-pos', handleMove);
    }
}

function survieNextRound() {
    socket.emit('survie-next-round');
}

// ============================================
// DIALOGUE SYSTEM (Admin as player)
// ============================================
let _adminTypewriterInterval = null;

function openAdminSurvieDialogue(npc) {
    // Create overlay if not exists
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
            closeAdminSurvieDialogue();
            if (survieAdminCanvas) survieAdminCanvas.dialogueOpen = false;
        });
    }
    
    const overlay = document.getElementById('survieDialogueOverlay');
    const name = document.getElementById('survieDialogueName');
    const text = document.getElementById('survieDialogueText');
    
    name.textContent = npc.name;
    name.classList.toggle('structure', !!npc.isStructure);
    
    // Pick dialogue: quest dialogue if active, otherwise random default
    const dialogues = npc.defaultDialogues || ["..."];
    const dialogue = dialogues[Math.floor(Math.random() * dialogues.length)];
    
    // Typewriter effect
    text.innerHTML = '';
    let charIndex = 0;
    if (_adminTypewriterInterval) clearInterval(_adminTypewriterInterval);
    
    _adminTypewriterInterval = setInterval(() => {
        if (charIndex < dialogue.length) {
            text.innerHTML = dialogue.substring(0, charIndex + 1) + '<span class="typing-cursor"></span>';
            charIndex++;
        } else {
            text.innerHTML = dialogue;
            clearInterval(_adminTypewriterInterval);
            _adminTypewriterInterval = null;
        }
    }, 15);
    
    overlay.classList.add('active');
}

function closeAdminSurvieDialogue() {
    const overlay = document.getElementById('survieDialogueOverlay');
    if (overlay) overlay.classList.remove('active');
    if (_adminTypewriterInterval) {
        clearInterval(_adminTypewriterInterval);
        _adminTypewriterInterval = null;
    }
}

let _adminQuestState = null;

function updateAdminQuestListUI(questState) {
    const container = document.getElementById('survieQuestItems');
    const counter = document.getElementById('survieQuestCounter');
    if (!container || !questState) return;
    
    _adminQuestState = questState;
    
    const quests = questState.quests || [];
    const completedCount = quests.filter(q => q.completed).length;
    const total = quests.length;
    
    counter.innerHTML = `${completedCount}<span>/${total}</span>`;
    
    let html = '';
    quests.forEach((q, idx) => {
        const status = q.completed ? 'done' : 'active';
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
                stepText = `► ${q.collected || 0}/${q.count} collectés`;
                progressPercent = ((q.collected || 0) / q.count) * 100;
                showBar = true;
            } else if (q.type === 'MYSTERY') {
                const interr = (q.interrogated || []).length;
                stepText = `► ${interr}/3 suspects interrogés`;
                progressPercent = (interr / 3) * 100;
                showBar = true;
            } else if (q.type === 'RIDDLE') {
                stepText = '► Résolvez l\'énigme...';
            } else if (q.totalSteps) {
                const current = q.currentStep || 0;
                stepText = `► Étape ${current + 1}/${q.totalSteps}`;
                progressPercent = (current / q.totalSteps) * 100;
                showBar = q.totalSteps > 1;
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
    
    // Add click listeners for modal
    container.querySelectorAll('.survie-quest-item').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(el.dataset.questIdx);
            openAdminQuestDetailModal(idx);
        });
    });
}

function openAdminQuestDetailModal(questIdx) {
    if (!_adminQuestState) return;
    const q = _adminQuestState.quests[questIdx];
    if (!q) return;
    
    const typeLabels = {
        'DELIVER': 'Livraison', 'VISIT_DELIVER': 'Exploration', 'CHAIN': 'Chaîne',
        'TRADE_CHAIN': 'Troc', 'REUNION': 'Réunion', 'COLLECT_ITEMS': 'Collecte',
        'RIDDLE': 'Énigme', 'ESCORT': 'Escorte', 'MYSTERY': 'Enquête'
    };
    
    let stepDetail = '';
    let progressPercent = 0;
    let progressText = '';
    
    if (q.completed) {
        stepDetail = 'Quête terminée !';
        progressPercent = 100;
        progressText = '100%';
    } else if (q.type === 'REUNION') {
        const found = (q.found || []).length;
        stepDetail = `Trouvez et parlez à ${q.count} membres du groupe. ${found} trouvé${found > 1 ? 's' : ''} pour l'instant.`;
        progressPercent = (found / q.count) * 100;
        progressText = `${found}/${q.count}`;
    } else if (q.type === 'COLLECT_ITEMS') {
        const collected = q.collected || 0;
        stepDetail = `Récupérez ${q.count} objets dispersés sur la map, puis livrez-les.`;
        progressPercent = (collected / q.count) * 100;
        progressText = `${collected}/${q.count}`;
    } else if (q.type === 'MYSTERY') {
        const interr = (q.interrogated || []).length;
        stepDetail = `Interrogez les suspects pour découvrir le coupable. ${interr} suspect${interr > 1 ? 's' : ''} interrogé${interr > 1 ? 's' : ''}.`;
        progressPercent = (interr / 3) * 100;
        progressText = `${interr}/3`;
    } else if (q.type === 'RIDDLE') {
        stepDetail = q.riddle || 'Trouvez le personnage ou le lieu décrit par l\'énigme.';
        progressPercent = 0;
        progressText = '0/1';
    } else if (q.totalSteps) {
        const current = q.currentStep || 0;
        stepDetail = `Progressez à travers les ${q.totalSteps} étapes de cette quête.`;
        progressPercent = (current / q.totalSteps) * 100;
        progressText = `${current}/${q.totalSteps}`;
    }
    
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
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('active');
        });
        document.getElementById('survieQuestModalClose').addEventListener('click', () => {
            overlay.classList.remove('active');
        });
    }
    
    document.getElementById('sqmType').textContent = typeLabels[q.type] || q.type;
    document.getElementById('sqmTitle').textContent = q.desc;
    document.getElementById('sqmStep').textContent = stepDetail;
    document.getElementById('sqmBar').style.width = progressPercent + '%';
    document.getElementById('sqmPercent').textContent = progressText;
    
    overlay.classList.add('active');
}