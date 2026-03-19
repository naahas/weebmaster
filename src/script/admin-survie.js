// ============================================
// MODE SURVIE - Admin Module
// ============================================

let _adminMinimapInterval = null;

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
    quests: [],
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
        survieState.quests = data.quests || [];
        survieState.groundItems = data.groundItems || [];
        survieState.boosts = data.boosts || [];
        survieState.questItems = data.questItems || {};
        
        // Save admin's quest state (with stepDesc) if admin is a player
        if (data.playerQuestStates && twitchUser && data.playerQuestStates[twitchUser.id]) {
            survieState.savedQuestState = data.playerQuestStates[twitchUser.id];
        }
        
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
            survieState.quests = data.quests || [];
            survieState.groundItems = data.groundItems || [];
            if (data.boosts) survieState.boosts = data.boosts;
            if (data.questItems) survieState.questItems = data.questItems;
            // Save player quest state for restore
            if (data.playerQuestState && data.playerQuestState.quests) {
                survieState.savedQuestState = data.playerQuestState;
            }
            showSurvieGameUI();
        }
    });
}

// ============================================
// UI
// ============================================
function showSurvieGameUI() {
    // Hide header immediately via CSS class
    document.body.classList.add('survie-active');
    
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
                <div class="survie-inventory-slot" data-slot="11" id="survieSlot11"></div>
                <div class="survie-inventory-slot" data-slot="12" id="survieSlot12"></div>
            </div>
            <div class="survie-quest-list quest-entrance" id="survieQuestList">
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
            <div class="survie-minimap" id="survieMinimap">
                <div class="survie-minimap-frame">
                    <div class="survie-minimap-inner">
                        <div class="survie-minimap-grid"></div>
                    </div>
                    <div class="survie-minimap-boundary"></div>
                    <canvas class="survie-minimap-canvas" id="survieMinimapCanvas"></canvas>
                    <div class="survie-minimap-coord" id="survieMinimapCoord"></div>
                </div>
                <div class="survie-minimap-corner tl"></div>
                <div class="survie-minimap-corner tr"></div>
                <div class="survie-minimap-corner bl"></div>
                <div class="survie-minimap-corner br"></div>
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
        
        // Escape key → open/close confirm overlay
        if (!window._survieEscBound) {
            window._survieEscBound = true;
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const overlay = document.getElementById('survieConfirmOverlay');
                    if (!overlay) return;
                    if (overlay.classList.contains('active')) {
                        overlay.classList.remove('active');
                    } else if (survieState.active) {
                        overlay.classList.add('active');
                    }
                }
            });
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
    
    // Load quests — use saved state if available, otherwise fresh
    // This runs OUTSIDE initSurvieAdminCanvas so quests display even if canvas fails
    console.log('📋 Admin quests:', survieState.quests?.length || 0, 'savedState:', !!survieState.savedQuestState);
    
    if (survieState.savedQuestState && survieState.savedQuestState.quests) {
        console.log('📋 Admin using SAVED quest state');
        updateAdminQuestListUI(survieState.savedQuestState);
        
        // Remove already-picked items from canvas
        if (survieState.savedQuestState.pickedItems && survieAdminCanvas) {
            survieState.savedQuestState.pickedItems.forEach(itemId => {
                survieAdminCanvas.removeGroundItem(itemId);
            });
            console.log('📦 Admin removed', survieState.savedQuestState.pickedItems.length, 'picked items');
        }
        
        // Restore inventory UI
        if (survieState.savedQuestState.inventory) {
            survieState.savedQuestState.inventory.forEach(itemId => {
                // Try questItems dict first (NPC-given items)
                const qi = (survieState.questItems || {})[itemId];
                if (qi) {
                    addAdminInventoryItem(qi);
                } else {
                    // Fallback to ground items (collectibles)
                    const allItems = survieState.groundItems || [];
                    const gi = allItems.find(g => g.itemId === itemId);
                    if (gi) {
                        addAdminInventoryItem({ id: itemId, name: gi.name || itemId, imageUrl: gi.imageUrl });
                    }
                }
            });
        }
        
        survieState.savedQuestState = null;
    } else if (survieState.quests && survieState.quests.length > 0) {
        updateAdminQuestListUI({
            quests: survieState.quests.map(q => ({
                ...q,
                currentStep: 0,
                completed: false,
                ...(q.type === 'REUNION' && { found: [], count: q.count }),
                ...(q.type === 'COLLECT_ITEMS' && { collected: 0, count: q.count }),
                ...(q.type === 'MYSTERY' && { interrogated: [] }),
            })),
        });
    } else {
        updateAdminQuestListUI({ quests: [] });
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
    if (_adminMinimapInterval) {
        clearInterval(_adminMinimapInterval);
        _adminMinimapInterval = null;
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
                socket.emit('survie-position', { x, y, vx, vy, twitchId: twitchUser ? twitchUser.id : null });
            }
        },
        onNPCInteract(npc) {
            openAdminSurvieDialogue(npc);
            // Send interact to server for quest progression
            if (socket) {
                socket.emit('survie-interact', {
                    npcId: npc.id,
                    isStructure: !!npc.isStructure,
                    twitchId: twitchUser ? twitchUser.id : null,
                });
                console.log('📤 Admin survie-interact émis pour', npc.id);
            }
        },
        onDialogueClose() {
            closeAdminSurvieDialogue();
        },
        onItemPickup(item) {
            console.log('📦 Admin pickup:', item.id);
            if (socket) {
                socket.emit('survie-pickup', { groundItemId: item.id, twitchId: twitchUser ? twitchUser.id : null });
            }
        },
        onBoostPickup(boost) {
            console.log('⚡ Admin boost pickup:', boost.id);
            if (socket) {
                socket.emit('survie-boost-pickup', { boostId: boost.id, twitchId: twitchUser ? twitchUser.id : null });
            }
        }
    });
    
    // Resize first so dimensions are available for position calculation
    survieAdminCanvas.resize();
    
    // Add all players
    survieState.alivePlayers.forEach(p => {
        survieAdminCanvas.addPlayer(p.twitchId, p.username, p.colorIndex || 0, p.posX, p.posY);
    });
    
    survieAdminCanvas.start();
    
    // Force resize after layout settles (header hidden etc.)
    setTimeout(() => {
        if (survieAdminCanvas) survieAdminCanvas.resize();
    }, 100);
    setTimeout(() => {
        if (survieAdminCanvas) survieAdminCanvas.resize();
    }, 500);
    
    // Add NPCs from server data
    (survieState.npcs || []).forEach(npc => {
        survieAdminCanvas.addNPC(npc.id, npc.name, npc.imageUrl, npc.x * MAP_WIDTH, npc.y * MAP_HEIGHT, npc.size, npc.defaultDialogues, npc.questDialogues, npc.isStructure);
    });
    
    // Add ground items
    (survieState.groundItems || []).forEach(gi => {
        survieAdminCanvas.addGroundItem(gi.id, gi.imageUrl, gi.x * MAP_WIDTH, gi.y * MAP_HEIGHT, gi.size);
    });
    
    // Add boosts
    (survieState.boosts || []).forEach(b => {
        survieAdminCanvas.addBoost(b.id, b.x * MAP_WIDTH, b.y * MAP_HEIGHT);
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
    
    // Remove entrance animation after it completes
    setTimeout(() => {
        const ql = document.getElementById('survieQuestList');
        if (ql) ql.classList.remove('quest-entrance');
    }, 2000);
    
    // Quest init is now handled in showSurvieGameUI() after canvas init
    
    // Restore winner banner if active
    _restoreAdminWinnerBanner();
    
    // Setup minimap canvas
    const mmCanvas = document.getElementById('survieMinimapCanvas');
    if (mmCanvas) {
        const mmRect = mmCanvas.parentElement.getBoundingClientRect();
        mmCanvas.width = mmRect.width - 12;
        mmCanvas.height = mmRect.height - 12;
    }
    
    // Start minimap render loop
    if (_adminMinimapInterval) clearInterval(_adminMinimapInterval);
    _adminMinimapInterval = setInterval(() => {
        renderAdminMinimap();
    }, 100);
    
    // Listen for player movements (only once per session)
    if (!survieAdminMovedListenerSet) {
        survieAdminMovedListenerSet = true;
        
        // Remove old listeners if any (prevents duplicates after lobby re-open)
        socket.off('survie-interact-result');
        socket.off('survie-pickup-result');
        socket.off('survie-player-moved');
        socket.off('survie-player-pos');
        socket.off('survie-boost-picked');
        socket.off('survie-boost-spawn');
        socket.off('survie-give-result');
        socket.off('survie-winner');
        socket.off('survie-player-finished');
        socket.off('survie-game-over');
        
        // Listen for interact results (quest progression)
        socket.on('survie-interact-result', (data) => {
            console.log('📨 Admin interact result:', data.npcId, 'questDialogue:', data.questDialogue ? 'OUI' : 'NON');
            
            // Update quest UI
            if (data.questState) {
                updateAdminQuestListUI(data.questState);
            }
            
            // Add/remove items from inventory
            if (data.itemGiven) {
                addAdminInventoryItem(data.itemGiven);
            }
            if (data.itemTaken) {
                removeAdminInventoryItem(data.itemTaken);
            }
            
            // Override dialogue with quest dialogue
            if (data.questDialogue) {
                const text = document.getElementById('survieDialogueText');
                if (text) {
                    const parsed = data.questDialogue.replace(/\*\*(.+?)\*\*/g, '<span class="quest-highlight">$1</span>');
                    const rawText = data.questDialogue.replace(/\*\*/g, '');
                    text.innerHTML = '';
                    let charIndex = 0;
                    if (_adminTypewriterInterval) clearInterval(_adminTypewriterInterval);
                    _adminTypewriterInterval = setInterval(() => {
                        if (charIndex < rawText.length) {
                            let shown = 0, htmlOut = '', inTag = false;
                            for (let ci = 0; ci < parsed.length; ci++) {
                                if (parsed[ci] === '<') inTag = true;
                                if (inTag) { htmlOut += parsed[ci]; if (parsed[ci] === '>') inTag = false; continue; }
                                if (shown <= charIndex) { htmlOut += parsed[ci]; shown++; } else break;
                            }
                            text.innerHTML = htmlOut + '<span class="typing-cursor"></span>';
                            charIndex++;
                        } else {
                            text.innerHTML = parsed;
                            clearInterval(_adminTypewriterInterval);
                            _adminTypewriterInterval = null;
                        }
                    }, 15);
                }
            }
            
            // Handle awaiting give — enter inventory selection mode
            if (data.questUpdate?.awaitingGive) {
                _enterAdminGiveMode(data.npcId, data.questUpdate.questId, data.questUpdate.requiredItems, data.questUpdate.requiredCount, data.questUpdate.requiredImageUrls);
            }
        });
        
        // Listen for give results
        socket.on('survie-give-result', (data) => {
            console.log('🎁 Admin give result:', data.questId);
            _exitAdminGiveMode();
            
            if (data.questState) {
                updateAdminQuestListUI(data.questState);
            }
            
            if (data.questDialogue) {
                const text = document.getElementById('survieDialogueText');
                if (text) {
                    const parsed = data.questDialogue.replace(/\*\*(.+?)\*\*/g, '<span class="quest-highlight">$1</span>');
                    const rawText = data.questDialogue.replace(/\*\*/g, '');
                    text.innerHTML = '';
                    let charIndex = 0;
                    if (_adminTypewriterInterval) clearInterval(_adminTypewriterInterval);
                    _adminTypewriterInterval = setInterval(() => {
                        if (charIndex < rawText.length) {
                            let shown = 0, htmlOut = '', inTag = false;
                            for (let ci = 0; ci < parsed.length; ci++) {
                                if (parsed[ci] === '<') inTag = true;
                                if (inTag) { htmlOut += parsed[ci]; if (parsed[ci] === '>') inTag = false; continue; }
                                if (shown <= charIndex) { htmlOut += parsed[ci]; shown++; } else break;
                            }
                            text.innerHTML = htmlOut + '<span class="typing-cursor"></span>';
                            charIndex++;
                        } else {
                            text.innerHTML = parsed;
                            clearInterval(_adminTypewriterInterval);
                            _adminTypewriterInterval = null;
                        }
                    }, 15);
                }
            }
            
            if (data.itemGiven) addAdminInventoryItem(data.itemGiven);
            if (data.itemsTaken) data.itemsTaken.forEach(id => removeAdminInventoryItem(id));
        });
        
        // Listen for pickup results
        socket.on('survie-pickup-result', (data) => {
            console.log('📦 Admin pickup result:', data.groundItemId);
            
            if (data.questState) {
                updateAdminQuestListUI(data.questState);
            }
            
            // Add to inventory UI (using shared function for animation)
            if (data.itemData) {
                addAdminInventoryItem(data.itemData);
            }
        });
        
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
        
        // Listen for boost picked by other players
        socket.on('survie-boost-picked', (data) => {
            if (!survieAdminCanvas) return;
            console.log('⚡ Admin: boost picked by other player:', data.boostId);
            const boost = survieAdminCanvas.boosts.find(b => b.id === data.boostId);
            if (boost && !boost.picked) {
                boost.picked = true;
                const shardColors = [
                    'rgba(180, 220, 255, 0.9)', 'rgba(140, 180, 255, 0.8)',
                    'rgba(200, 240, 255, 0.9)', 'rgba(100, 200, 255, 0.8)',
                    'rgba(160, 140, 255, 0.7)', 'rgba(220, 200, 255, 0.8)',
                ];
                const shards = [];
                for (let k = 0; k < 14; k++) {
                    shards.push({
                        angle: (Math.PI * 2 / 14) * k + (Math.random() - 0.5) * 0.4,
                        speed: 150 + Math.random() * 200,
                        size: 5 + Math.random() * 7,
                        rotSpeed: 6 + Math.random() * 10,
                        color: shardColors[k % shardColors.length],
                    });
                }
                survieAdminCanvas.boostShatters.push({ x: boost.x, y: boost.y, time: performance.now(), shards });
            }
        });
        
        // Listen for new boost spawned by server
        socket.on('survie-boost-spawn', (data) => {
            if (!survieAdminCanvas) return;
            console.log('⚡ Admin: new boost spawned:', data.id);
            survieAdminCanvas.addBoost(data.id, data.x * MAP_WIDTH, data.y * MAP_HEIGHT);
        });
        
        // Listen for player finishing quests
        socket.on('survie-player-finished', (data) => {
            console.log(`🏆 Admin: ${data.username} a terminé ! Rang: ${data.rank}`);
        });
        
        // Listen for winner
        socket.on('survie-winner', (data) => {
            console.log(`🥇 Admin: WINNER = ${data.username}`);
            _showAdminWinnerBanner(data);
        });
        
        // Listen for game over (podium)
        socket.on('survie-game-over', (data) => {
            console.log('🏆 Admin: Game over!', data);
            _showAdminVictoryOverlay(data);
        });
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
    // Exit give mode if active
    if (_adminGiveMode) {
        _exitAdminGiveMode();
    }
}

let _adminQuestState = null;

function renderAdminMinimap() {
    const canvas = document.getElementById('survieMinimapCanvas');
    const coord = document.getElementById('survieMinimapCoord');
    if (!canvas || !survieAdminCanvas) return;
    
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const MAP_W = 38000;
    const MAP_H = 24000;
    
    ctx.clearRect(0, 0, w, h);
    
    // Draw structures (blue squares)
    survieAdminCanvas.npcs.forEach(npc => {
        if (!npc.isStructure) return;
        const sx = (npc.x / MAP_W) * w;
        const sy = (npc.y / MAP_H) * h;
        ctx.fillStyle = 'rgba(126, 200, 227, 0.35)';
        ctx.fillRect(sx - 2.5, sy - 2.5, 5, 5);
        ctx.strokeStyle = 'rgba(126, 200, 227, 0.25)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(sx - 2.5, sy - 2.5, 5, 5);
    });
    
    // TEMP DISABLED — NPC dots
    // survieAdminCanvas.npcs.forEach(npc => {
    //     if (npc.isStructure) return;
    //     const nx = (npc.x / MAP_W) * w;
    //     const ny = (npc.y / MAP_H) * h;
    //     ctx.beginPath();
    //     ctx.arc(nx, ny, 2, 0, Math.PI * 2);
    //     ctx.fillStyle = 'rgba(255, 50, 50, 0.6)';
    //     ctx.fill();
    // });
    
    // Draw structures only (cyan squares, more visible)
    (survieAdminCanvas.npcs || []).forEach(npc => {
        if (!npc.isStructure) return;
        const nx = (npc.x / MAP_W) * w;
        const ny = (npc.y / MAP_H) * h;
        ctx.fillStyle = 'rgba(126, 200, 227, 0.7)';
        ctx.fillRect(nx - 3, ny - 3, 6, 6);
        ctx.strokeStyle = 'rgba(126, 200, 227, 0.4)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(nx - 3, ny - 3, 6, 6);
    });
    
    // Draw all players
    let localDrawn = false;
    const adminTwitchId = survieAdminCanvas.localTwitchId;
    
    survieAdminCanvas.auras.forEach((aura, id) => {
        const px = (aura.x / MAP_W) * w;
        const py = (aura.y / MAP_H) * h;
        
        if (id === adminTwitchId) {
            // Local player (gold, bigger)
            ctx.beginPath();
            ctx.arc(px, py, 6, 0, Math.PI * 2);
            const glow = ctx.createRadialGradient(px, py, 0, px, py, 6);
            glow.addColorStop(0, 'rgba(255, 200, 80, 0.3)');
            glow.addColorStop(1, 'rgba(255, 200, 80, 0)');
            ctx.fillStyle = glow;
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#ffcc00';
            ctx.fill();
            
            if (coord) {
                const kx = (aura.x / 1000).toFixed(1);
                const ky = (aura.y / 1000).toFixed(1);
                coord.textContent = `${kx}K · ${ky}K`;
            }
            localDrawn = true;
        } else {
            // Other players (white, no distinction)
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.fill();
        }
    });
    
    // If admin is spectator (no local player), show center
    if (!localDrawn && coord) {
        coord.textContent = 'SPECTATEUR';
    }
}

function addAdminInventoryItem(item) {
    if (!item) return;
    for (let i = 1; i <= 12; i++) {
        const slot = document.getElementById(`survieSlot${i}`);
        if (slot && !slot.classList.contains('filled')) {
            slot.classList.add('filled', 'item-new');
            slot.innerHTML = `<img src="/tracepic/${item.imageUrl}" alt="${item.name || item.id}">`;
            slot.dataset.itemId = item.id;
            slot.dataset.itemName = item.name || item.id;
            setTimeout(() => slot.classList.remove('item-new'), 500);
            break;
        }
    }
}

function removeAdminInventoryItem(itemId) {
    if (!itemId) return;
    for (let i = 1; i <= 12; i++) {
        const slot = document.getElementById(`survieSlot${i}`);
        if (slot && slot.dataset.itemId === itemId) {
            slot.classList.remove('filled');
            slot.innerHTML = '';
            slot.dataset.itemId = '';
            slot.dataset.itemName = '';
            break;
        }
    }
}

function updateAdminQuestListUI(questState) {
    const container = document.getElementById('survieQuestItems');
    const counter = document.getElementById('survieQuestCounter');
    if (!container || !questState) return;
    
    // Detect changes for animations
    const prevState = _adminQuestState;
    const changedQuests = new Set();
    const completedQuests = new Set();
    if (prevState && prevState.quests) {
        const quests = questState.quests || [];
        quests.forEach((q, idx) => {
            const prev = prevState.quests[idx];
            if (!prev) return;
            if (q.currentStep !== prev.currentStep) changedQuests.add(idx);
            if (q.type === 'REUNION' && (q.found || []).length !== (prev.found || []).length) changedQuests.add(idx);
            if (q.type === 'COLLECT_ITEMS' && (q.collected || 0) !== (prev.collected || 0)) changedQuests.add(idx);
            if (q.type === 'MYSTERY' && (q.interrogated || []).length !== (prev.interrogated || []).length) changedQuests.add(idx);
            if (q.type === 'RIDDLE' && q.hintReceived !== prev.hintReceived) changedQuests.add(idx);
            if (q.completed && !prev.completed) completedQuests.add(idx);
        });
    }
    
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
                const collected = q.collected || 0;
                if (q.stepDesc && collected >= q.count) {
                    stepText = `► ${q.stepDesc}`;
                    progressPercent = 100;
                    showBar = false;
                } else {
                    stepText = `► ${collected}/${q.count} collectés`;
                    progressPercent = (collected / q.count) * 100;
                    showBar = true;
                }
            } else if (q.type === 'MYSTERY') {
                const interr = (q.interrogated || []).filter(i => i !== '_victim').length;
                stepText = q.stepDesc ? `► ${q.stepDesc}` : `► ${interr}/3 suspects interrogés`;
                progressPercent = (interr / 3) * 100;
                showBar = true;
            } else if (q.type === 'RIDDLE') {
                stepText = q.stepDesc ? `► ${q.stepDesc}` : '► Résolvez l\'énigme...';
            } else if (q.stepDesc) {
                stepText = `► ${q.stepDesc}`;
                const current = q.currentStep || 0;
                progressPercent = (current / (q.totalSteps || 1)) * 100;
                showBar = (q.totalSteps || 0) > 1;
            } else if (q.totalSteps) {
                // No stepDesc yet — don't show "Étape x/y", wait for server update
                stepText = '';
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
    
    // Trigger animations and add click listeners
    container.querySelectorAll('.survie-quest-item').forEach(el => {
        const idx = parseInt(el.dataset.questIdx);
        
        if (changedQuests.has(idx) && !completedQuests.has(idx)) {
            el.classList.add('step-progress');
            const stepEl = el.querySelector('.survie-quest-step');
            if (stepEl) stepEl.classList.add('step-text-flash');
            const barFill = el.querySelector('.survie-quest-bar-fill');
            if (barFill) barFill.classList.add('bar-pulse');
            setTimeout(() => {
                el.classList.remove('step-progress');
                if (stepEl) stepEl.classList.remove('step-text-flash');
                if (barFill) barFill.classList.remove('bar-pulse');
            }, 800);
        }
        
        if (completedQuests.has(idx)) {
            el.classList.add('just-completed');
            setTimeout(() => el.classList.remove('just-completed'), 800);
        }
        
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            openAdminQuestDetailModal(parseInt(el.dataset.questIdx));
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
        stepDetail = q.stepDesc ? `► ${q.stepDesc}` : `Trouvez et parlez à ${q.count} membres du groupe.`;
        progressPercent = (found / q.count) * 100;
        progressText = `${found}/${q.count}`;
    } else if (q.type === 'COLLECT_ITEMS') {
        const collected = q.collected || 0;
        if (q.stepDesc && collected >= q.count) {
            stepDetail = `► ${q.stepDesc}`;
        } else {
            stepDetail = `Récupérez ${q.count} objets dispersés sur la map.`;
        }
        progressPercent = (collected / q.count) * 100;
        progressText = `${collected}/${q.count}`;
    } else if (q.type === 'MYSTERY') {
        const interr = (q.interrogated || []).filter(i => i !== '_victim').length;
        stepDetail = q.stepDesc ? `► ${q.stepDesc}` : `Interrogez les suspects pour découvrir le coupable.`;
        progressPercent = (interr / 3) * 100;
        progressText = `${interr}/3`;
    } else if (q.type === 'RIDDLE') {
        stepDetail = q.stepDesc ? `► ${q.stepDesc}` : 'Trouvez le personnage ou le lieu décrit par l\'énigme.';
        progressPercent = q.hintReceived ? 50 : 0;
        progressText = q.hintReceived ? '1/2' : '0/2';
    } else if (q.totalSteps) {
        const current = q.currentStep || 0;
        stepDetail = q.stepDesc ? `► ${q.stepDesc}` : `Étape ${current + 1}/${q.totalSteps}`;
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
// ═══ ADMIN GIVE MODE — Inventory selection for item delivery ═══
let _adminGiveMode = null;

function _enterAdminGiveMode(npcId, questId, requiredItems, requiredCount, requiredImageUrls) {
    console.log('🎁 Admin entering give mode:', questId, requiredItems, requiredImageUrls);
    _adminGiveMode = { npcId, questId, requiredItems, requiredCount, selectedItems: [] };
    
    for (let i = 1; i <= 12; i++) {
        const slot = document.getElementById(`survieSlot${i}`);
        if (!slot) continue;
        if (slot.classList.contains('filled')) {
            const itemId = slot.dataset.itemId;
            const img = slot.querySelector('img');
            const imgSrc = img ? img.getAttribute('src')?.split('/').pop() : '';
            const isRequired = requiredItems.includes(itemId) || 
                (requiredImageUrls && requiredImageUrls.includes(imgSrc));
            
            if (isRequired) {
                slot.classList.add('give-selectable');
                slot.addEventListener('click', _handleAdminGiveClick);
            } else {
                slot.classList.add('give-disabled');
            }
        }
    }
    
    const inv = document.getElementById('survieInventory');
    if (inv) inv.classList.add('give-mode-active');
}

function _exitAdminGiveMode() {
    console.log('🎁 Admin exiting give mode');
    _adminGiveMode = null;
    
    for (let i = 1; i <= 12; i++) {
        const slot = document.getElementById(`survieSlot${i}`);
        if (!slot) continue;
        slot.classList.remove('give-selectable', 'give-disabled', 'give-selected');
        slot.removeEventListener('click', _handleAdminGiveClick);
    }
    
    const inv = document.getElementById('survieInventory');
    if (inv) inv.classList.remove('give-mode-active');
}

function _handleAdminGiveClick(e) {
    e.stopPropagation();
    e.preventDefault();
    if (!_adminGiveMode) return;
    const slot = e.currentTarget;
    const itemId = slot.dataset.itemId;
    if (!itemId) return;
    
    const slotKey = slot.id || itemId;
    const idx = _adminGiveMode.selectedItems.findIndex(s => s.slotKey === slotKey);
    if (idx === -1) {
        _adminGiveMode.selectedItems.push({ slotKey, itemId });
        slot.classList.add('give-selected');
        slot.classList.remove('give-selectable');
    } else {
        _adminGiveMode.selectedItems.splice(idx, 1);
        slot.classList.remove('give-selected');
        slot.classList.add('give-selectable');
    }
    
    console.log('🎁 Admin selected:', _adminGiveMode.selectedItems.length, '/', _adminGiveMode.requiredCount);
    
    if (_adminGiveMode.selectedItems.length >= _adminGiveMode.requiredCount) {
        console.log('🎁 Admin: all items selected — sending!');
        if (socket) {
            socket.emit('survie-give-items', {
                twitchId: twitchUser ? twitchUser.id : null,
                npcId: _adminGiveMode.npcId,
                questId: _adminGiveMode.questId,
                givenItems: _adminGiveMode.selectedItems.map(s => s.itemId)
            });
        }
    }
}

// ═══ ADMIN VICTORY SYSTEM ═══
let _adminWinnerInterval = null;

function _showAdminWinnerBanner(data) {
    const existing = document.getElementById('survieWinnerBanner');
    if (existing) existing.remove();
    
    // Store for restore after refresh
    const endTime = Date.now() + 60000;
    sessionStorage.setItem('survieWinnerEndTime', endTime);
    sessionStorage.setItem('survieWinnerName', data.username);
    
    _createAdminWinnerText(data.username, endTime);
}

function _restoreAdminWinnerBanner() {
    const endTime = sessionStorage.getItem('survieWinnerEndTime');
    const winnerName = sessionStorage.getItem('survieWinnerName');
    if (!endTime || !winnerName) return;
    
    const remaining = Math.ceil((parseInt(endTime) - Date.now()) / 1000);
    if (remaining <= 0) {
        sessionStorage.removeItem('survieWinnerEndTime');
        sessionStorage.removeItem('survieWinnerName');
        return;
    }
    
    _createAdminWinnerText(winnerName, parseInt(endTime));
}

function _createAdminWinnerText(username, endTime) {
    const existing = document.getElementById('survieWinnerBanner');
    if (existing) existing.remove();
    if (_adminWinnerInterval) clearInterval(_adminWinnerInterval);
    
    const banner = document.createElement('div');
    banner.id = 'survieWinnerBanner';
    banner.className = 'survie-winner-text';
    const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    banner.innerHTML = `<span class="winner-text-name">Un joueur</span> a terminé ses quêtes · Fin dans <span class="winner-text-timer" id="survieWinnerTimer">${remaining}</span> secondes`;
    document.body.appendChild(banner);
    
    _adminWinnerInterval = setInterval(() => {
        const rem = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        const timerEl = document.getElementById('survieWinnerTimer');
        if (timerEl) timerEl.textContent = rem;
        if (rem <= 0) {
            clearInterval(_adminWinnerInterval);
            _adminWinnerInterval = null;
        }
    }, 1000);
}

function _showAdminVictoryOverlay(data) {
    // Remove banner and cleanup
    const banner = document.getElementById('survieWinnerBanner');
    if (banner) banner.remove();
    if (_adminWinnerInterval) { clearInterval(_adminWinnerInterval); _adminWinnerInterval = null; }
    sessionStorage.removeItem('survieWinnerEndTime');
    sessionStorage.removeItem('survieWinnerName');
    
    const existing = document.getElementById('survieVictoryOverlay');
    if (existing) existing.remove();
    
    const crownSVG = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M8 48h48v6H8z" fill="rgba(255,200,80,0.9)"/><path d="M8 48L4 20l14 12 14-18 14 18 14-12-4 28z" fill="rgba(255,200,80,0.85)" stroke="rgba(255,170,30,0.6)" stroke-width="1.5"/><circle cx="4" cy="20" r="3" fill="rgba(255,220,100,0.9)"/><circle cx="18" cy="32" r="3" fill="rgba(255,220,100,0.9)"/><circle cx="32" cy="14" r="3.5" fill="rgba(255,240,150,1)"/><circle cx="46" cy="32" r="3" fill="rgba(255,220,100,0.9)"/><circle cx="60" cy="20" r="3" fill="rgba(255,220,100,0.9)"/></svg>`;
    const medalSVGs = [
        `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="22" r="14" fill="rgba(255,200,80,0.2)" stroke="rgba(255,200,80,0.8)" stroke-width="2"/><circle cx="20" cy="22" r="10" fill="rgba(255,200,80,0.1)" stroke="rgba(255,200,80,0.4)" stroke-width="1"/><text x="20" y="27" text-anchor="middle" font-family="Orbitron,sans-serif" font-size="14" font-weight="700" fill="rgba(255,200,80,0.9)">1</text><path d="M15 4l5 8 5-8" fill="rgba(255,200,80,0.6)"/></svg>`,
        `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="22" r="14" fill="rgba(192,192,192,0.15)" stroke="rgba(192,192,192,0.7)" stroke-width="2"/><circle cx="20" cy="22" r="10" fill="rgba(192,192,192,0.08)" stroke="rgba(192,192,192,0.3)" stroke-width="1"/><text x="20" y="27" text-anchor="middle" font-family="Orbitron,sans-serif" font-size="14" font-weight="700" fill="rgba(192,192,192,0.8)">2</text><path d="M15 4l5 8 5-8" fill="rgba(192,192,192,0.5)"/></svg>`,
        `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="22" r="14" fill="rgba(205,127,50,0.15)" stroke="rgba(205,127,50,0.7)" stroke-width="2"/><circle cx="20" cy="22" r="10" fill="rgba(205,127,50,0.08)" stroke="rgba(205,127,50,0.3)" stroke-width="1"/><text x="20" y="27" text-anchor="middle" font-family="Orbitron,sans-serif" font-size="14" font-weight="700" fill="rgba(205,127,50,0.8)">3</text><path d="M15 4l5 8 5-8" fill="rgba(205,127,50,0.5)"/></svg>`,
    ];
    
    const classes = ['first', 'second', 'third'];
    const rankLabels = ['CHAMPION', '2ÈME PLACE', '3ÈME PLACE'];
    
    let podiumHTML = '';
    const podiumPlayers = (data.podium || []).slice(1);
    if (podiumPlayers.length > 0) {
        podiumPlayers.forEach((p, i) => {
            const actualIdx = i + 1;
            const questInfo = `${p.completedCount}/${p.totalQuests || 5} quêtes`;
            podiumHTML += `
                <div class="survie-podium-place ${classes[actualIdx] || ''}">
                    <div class="survie-podium-medal">${medalSVGs[actualIdx] || ''}</div>
                    <div class="survie-podium-name">${p.username}</div>
                    <div class="survie-podium-quests">${questInfo}</div>
                    <div class="survie-podium-rank">${rankLabels[actualIdx] || `${actualIdx + 1}ÈME`}</div>
                </div>
            `;
        });
    }
    
    const overlay = document.createElement('div');
    overlay.id = 'survieVictoryOverlay';
    overlay.className = 'survie-victory-overlay';
    overlay.innerHTML = `
        <div class="survie-victory-crown">${crownSVG}</div>
        <div class="survie-victory-title">VICTOIRE</div>
        <div class="survie-victory-winner">${data.winner.username}</div>
        <div class="survie-victory-podium">${podiumHTML}</div>
        <div class="survie-victory-btn-wrap"><span class="survie-victory-btn" id="survieVictoryClose">FERMER LE LOBBY</span></div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));
    
    // Spawn particles
    const colors = [
        'rgba(255, 200, 80, 0.8)', 'rgba(255, 150, 50, 0.7)',
        'rgba(255, 255, 200, 0.6)', 'rgba(200, 160, 80, 0.7)',
    ];
    for (let i = 0; i < 40; i++) {
        setTimeout(() => {
            const particle = document.createElement('div');
            particle.className = 'survie-victory-particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = '-10px';
            particle.style.background = colors[Math.floor(Math.random() * colors.length)];
            particle.style.width = (3 + Math.random() * 5) + 'px';
            particle.style.height = particle.style.width;
            particle.style.animationDuration = (3 + Math.random() * 4) + 's';
            overlay.appendChild(particle);
            setTimeout(() => particle.remove(), 7000);
        }, i * 100);
    }
    
    // Fermer lobby button
    document.getElementById('survieVictoryClose').addEventListener('click', () => {
        overlay.remove();
        // Toggle game off via admin API
        fetch('/admin/toggle-game', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
            .then(() => console.log('✅ Lobby fermé après victoire'))
            .catch(err => console.error('❌ Erreur fermeture lobby:', err));
    });
}