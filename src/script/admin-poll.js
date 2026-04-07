// ============================================
// 🗳️ POLL MODE - Admin Logic
// ============================================

let pollState = {
    category: 'all',
    perMatch: 2,
    bracketSize: 32,
    showNames: false,
    voteTimer: 15,
    showNotifs: true,
    categories: [],
    validBracketSizes: [16, 32, 64, 128]
};

// ═══════════════════════════════════════════
// ⚙️ Paramètres Poll
// ═══════════════════════════════════════════

function setPollPerMatch(value) {
    pollState.perMatch = value;
    document.getElementById('pollPerMatchValue').textContent = value;
    
    // Update active button
    document.querySelectorAll('.poll-permatch-group .poll-option').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.value) === value);
    });
    
    // Update bracket options based on perMatch
    updateBracketOptionsForPerMatch(value);
    
    // Refresh valid bracket sizes from server
    refreshBracketSizes();
    
    if (typeof anime !== 'undefined') {
        anime({ targets: '#pollPerMatchValue', scale: [1.15, 1], duration: 200, easing: 'easeOutQuad' });
    }
}

function updateBracketOptionsForPerMatch(perMatch) {
    const container = document.getElementById('pollBracketOptions');
    if (!container) return;
    
    let sizes = [];
    if (perMatch === 2) {
        sizes = [16, 32, 64, 128];
    } else if (perMatch === 3) {
        sizes = [27, 81];
    } else if (perMatch === 4) {
        sizes = [16, 64];
    }
    
    container.innerHTML = sizes.map(s => 
        `<button class="setting-option-btn poll-option ${s === sizes[Math.min(1, sizes.length - 1)] ? 'active' : ''}" data-value="${s}" onclick="setPollBracket(${s})">${s}</button>`
    ).join('');
    
    // Select the default (second option or first)
    const defaultSize = sizes[Math.min(1, sizes.length - 1)];
    setPollBracket(defaultSize);
}

function setPollBracket(value) {
    pollState.bracketSize = value;
    document.getElementById('pollBracketValue').textContent = value;
    
    // Update active button
    document.querySelectorAll('.poll-bracket-group .poll-option').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.value) === value);
    });
    
    if (typeof anime !== 'undefined') {
        anime({ targets: '#pollBracketValue', scale: [1.15, 1], duration: 200, easing: 'easeOutQuad' });
    }
}

function refreshBracketSizes() {
    if (!socket || !socket.connected) return;
    socket.emit('poll-get-bracket-sizes', { 
        category: pollState.category, 
        perMatch: pollState.perMatch 
    });
}

function setPollShowNames(value) {
    pollState.showNames = value;
    document.getElementById('pollShowNamesValue').textContent = value ? 'Oui' : 'Non';
    
    document.querySelectorAll('.poll-names-group .poll-option').forEach(btn => {
        const btnVal = btn.dataset.value === 'on';
        btn.classList.toggle('active', btnVal === value);
    });
    
    if (typeof anime !== 'undefined') {
        anime({ targets: '#pollShowNamesValue', scale: [1.15, 1], duration: 200, easing: 'easeOutQuad' });
    }
}

function setPollTimer(value) {
    pollState.voteTimer = parseInt(value);
    document.getElementById('pollTimerValue').textContent = value + 's';
    
    if (typeof anime !== 'undefined') {
        anime({ targets: '#pollTimerValue', scale: [1.15, 1], duration: 200, easing: 'easeOutQuad' });
    }
}

// ═══════════════════════════════════════════
// 📡 Socket Events
// ═══════════════════════════════════════════

function initPollSocketEvents() {
    if (!socket) return;
    
    // Receive categories
    socket.on('poll-categories', (categories) => {
        pollState.categories = categories;
        renderPollCategoryList(categories);
        refreshBracketSizes();
    });
    
    // Receive valid bracket sizes
    socket.on('poll-bracket-sizes', (data) => {
        pollState.validBracketSizes = data.sizes;
        const container = document.getElementById('pollBracketOptions');
        if (!container) return;
        
        container.querySelectorAll('.poll-option').forEach(btn => {
            const val = parseInt(btn.dataset.value);
            btn.disabled = !data.sizes.includes(val);
            btn.style.opacity = data.sizes.includes(val) ? '1' : '0.3';
        });
        
        // If current selection is invalid, select the largest valid
        if (!data.sizes.includes(pollState.bracketSize)) {
            const largest = data.sizes[data.sizes.length - 1];
            if (largest) setPollBracket(largest);
        }
    });
    
    // Poll game started
    socket.on('poll-game-started', (data) => {
        console.log('🗳️ Poll game started:', data);
        document.body.classList.add('poll-active');
        sessionStorage.setItem('pollGameActive', 'true');
        if (data.showNames !== undefined) pollState.showNames = data.showNames;
        
        // Hide lobby, show poll game view
        initPollGameView(data);
    });
    
    // Match start
    socket.on('poll-match-start', (data) => {
        console.log('🗳️ Match start:', data);
        showPollMatch(data);
    });
    
    // Vote update (real-time)
    socket.on('poll-vote-update', (data) => {
        updatePollVotes(data);
    });
    
    // Vote notification from players
    socket.on('poll-vote-notif', (data) => {
        pollSpawnVoteNotif(data.username, data.avatar);
    });
    
    // Match result
    socket.on('poll-match-result', (data) => {
        console.log('🗳️ Match result:', data);
        showPollResult(data);
    });
    
    // Round start
    socket.on('poll-round-start', (data) => {
        console.log('🗳️ Round start:', data);
        showRoundAnnouncement(data);
    });
    
    // Game ended
    socket.on('poll-game-ended', (data) => {
        console.log('🏆 Poll ended:', data);
        showPollWinner(data);
    });
    
    // Reconnection state restore
    socket.on('poll-state', (data) => {
        if (!data || !data.active) return;
        console.log('🗳️ Poll state restored (admin):', data);
        
        document.body.classList.add('poll-active');
        if (data.showNames !== undefined) pollState.showNames = data.showNames;
        
        // Init game view
        initPollGameView({
            categoryName: data.categoryName,
            totalRounds: data.totalRounds,
            totalMatches: data.totalMatches
        });
        
        // Restore current match if any
        if (data.currentMatch) {
            showPollMatch({
                round: data.currentRound,
                matchIndex: data.currentMatchIndex,
                totalMatches: data.totalMatches,
                totalRounds: data.totalRounds,
                characters: data.currentMatch.characters,
                timer: data.timeRemaining || 15,
                totalTimer: data.timer || 15,
                endTime: data.endTime || null,
                skipTimer: data.showingResults || !data.votingOpen,
                votingOpen: data.votingOpen,
                isReconnect: true
            });
            
            // Restore admin's vote — server myVote is source of truth
            const matchKey = `${data.currentRound}_${data.currentMatchIndex}`;
            const savedMatchKey = sessionStorage.getItem('pollAdminVoteMatch');
            const savedVoteFromStorage = sessionStorage.getItem('pollAdminVote');
            const isTieState = data.currentMatch.isTie && !data.currentMatch.winner;
            
            // Use server myVote first, fallback to sessionStorage only if same match
            const savedVote = data.currentMatch.myVote || (savedMatchKey === matchKey ? savedVoteFromStorage : null);
            
            if (savedVote && !isTieState) {
                // Verify the character is actually in this match
                const charInMatch = data.currentMatch.characters.some(c => c.id === savedVote);
                if (charInMatch) {
                    pollState.currentVote = savedVote;
                    sessionStorage.setItem('pollAdminVote', savedVote);
                    sessionStorage.setItem('pollAdminVoteMatch', matchKey);
                    setTimeout(() => {
                        document.querySelectorAll('.poll-char-card').forEach(card => {
                            const isVoted = card.dataset.charId === savedVote;
                            card.classList.remove('poll-voted', 'poll-not-voted');
                            if (isVoted) {
                                card.classList.add('poll-voted');
                            } else {
                                card.classList.add('poll-not-voted');
                            }
                        });
                    }, 50);
                } else {
                    sessionStorage.removeItem('pollAdminVote');
                    sessionStorage.removeItem('pollAdminVoteMatch');
                }
            }
            
            // If showing results, show them
            if (data.showingResults && data.currentMatch.voteResults) {
                setTimeout(() => {
                    showPollResult({
                        characters: data.currentMatch.characters,
                        voteResults: data.currentMatch.voteResults,
                        totalVotes: Object.values(data.currentMatch.voteResults).reduce((s, v) => s + v.count, 0),
                        winner: data.currentMatch.winner,
                        matchIndex: data.currentMatchIndex,
                        wasRandom: data.currentMatch.wasRandom || false,
                        isTie: data.currentMatch.isTie || false,
                        tiedCharacters: data.currentMatch.tiedCharacters || null
                    });
                }, 100);
            }
        }
        
        // If game has a winner, show victory
        if (data.winner) {
            showPollWinner({ winner: data.winner, category: data.categoryName, bracketSize: data.bracketSize, totalRounds: data.totalRounds });
        }
    });
}

// ═══════════════════════════════════════════
// 🎮 Game View (Admin)
// ═══════════════════════════════════════════

function initPollGameView(data) {
    // Create or show poll container
    let container = document.getElementById('pollAdminContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'pollAdminContainer';
        container.className = 'poll-admin-container';
        document.body.appendChild(container);
    }
    
    container.innerHTML = `
        <div class="poll-notif-zone" id="pollNotifZone"></div>
        <div class="poll-game-topbar">
            <div class="poll-game-logo">Shonen<span class="poll-logo-master">Master</span></div>
            <div class="poll-game-badge">POLL</div>
        </div>
        <div class="poll-header" id="pollHeader" style="opacity: 0;">
            <div class="poll-header-info">
                <span class="poll-round-badge">Round 1/${data.totalRounds}</span>
                <span class="poll-match-badge">Match 1/${data.totalMatches}</span>
            </div>
        </div>
        <div class="poll-timer-wrap" id="pollTimerWrap">
            <div class="poll-timer-bar">
                <div class="poll-timer-fill" id="pollTimerFill"></div>
            </div>
            <div class="poll-next-wrap" id="pollNextWrap">
            </div>
        </div>
        <div class="poll-match-area" id="pollMatchArea">
        </div>
        <div class="poll-admin-controls" id="pollAdminControls">
        </div>
        <button class="poll-close-lobby-btn" onclick="pollCloseLobby()">FERMER LOBBY</button>
        <button class="poll-notif-toggle" id="pollNotifToggle" onclick="pollToggleNotifs()">
            <svg viewBox="0 0 24 24" fill="none" width="14" height="14" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
        </button>
    `;
    
    container.style.display = 'flex';
}

function pollStartFirstMatch() {
    socket.emit('poll-start-first-match');
    const btn = document.getElementById('pollStartFirstMatch');
    if (btn) btn.style.display = 'none';
}

function showPollMatch(data) {
    const area = document.getElementById('pollMatchArea');
    if (!area) return;
    
    // Track current match context
    pollState.currentRound = data.round;
    pollState.currentMatchIndex = data.matchIndex;
    
    // Reveal header on first match
    const header = document.getElementById('pollHeader');
    if (header && header.style.opacity === '0') {
        header.style.transition = 'opacity 0.5s ease';
        header.style.opacity = '1';
    }
    
    // Update header info
    const roundInfo = document.querySelector('.poll-round-badge');
    const matchInfo = document.querySelector('.poll-match-badge');
    if (roundInfo) roundInfo.textContent = `Round ${data.round + 1}/${data.totalRounds}`;
    if (matchInfo) matchInfo.textContent = `Match ${data.matchIndex + 1}/${data.totalMatches}`;
    
    // Determine card count class
    const cardCount = data.characters.length;
    const countClass = cardCount >= 4 ? ' cards-4' : '';
    
    // Build new card structure
    const cardsHtml = data.characters.map((char, i) => `
        <div class="poll-char-card" data-char-id="${char.id}" onclick="pollAdminVote('${char.id}')">
            <div class="poll-char-inner">
                <div class="poll-char-glow"></div>
                <div class="poll-char-img-wrapper">
                    <img src="${char.img}" alt="${char.name}" class="poll-char-img" onerror="this.src='novice.png'">
                </div>
                <div class="poll-char-body">
                    <div class="poll-char-name">${char.name}</div>
                    <div class="poll-char-bar"></div>
                </div>
                <div class="poll-char-pulse"></div>
                <div class="poll-char-particles"></div>
                <div class="poll-char-shine"></div>
            </div>
            <div class="poll-voter-badge" data-voter-cid="${char.id}"></div>
            <div class="poll-char-result" data-cid="${char.id}">
                <div class="poll-res-pct">0%</div>
                <div class="poll-res-votes">0 votes</div>
            </div>
        </div>
    `).join('<div class="poll-vs">VS</div>');
    
    area.innerHTML = `
        <div class="poll-cards-row${countClass}${pollState.showNames === false ? ' poll-hide-names' : ''}">${cardsHtml}</div>
    `;
    
    // Track admin vote state
    pollState.currentVote = null;
    pollState.votingOpen = data.skipTimer ? false : true;
    if (data.votingOpen !== undefined) pollState.votingOpen = data.votingOpen;
    
    // Only clear saved vote if this is a fresh match (not reconnection)
    if (!data.isReconnect) {
        sessionStorage.removeItem('pollAdminVote');
        sessionStorage.removeItem('pollAdminVoteMatch');
    }
    
    if (data.skipTimer) {
        // Hide timer on reconnection during results
        const timerWrap = document.getElementById('pollTimerWrap');
        if (timerWrap) timerWrap.classList.add('visible');
        const timerFill = document.getElementById('pollTimerFill');
        if (timerFill) { timerFill.style.visibility = 'hidden'; timerFill.style.opacity = '0'; }
    } else {
    // Show timer wrap (hidden by default)
    const timerWrap = document.getElementById('pollTimerWrap');
    if (timerWrap) timerWrap.classList.add('visible');
    
    // Start timer animation
    const timerFill = document.getElementById('pollTimerFill');
    const totalTimer = data.totalTimer || data.timer;
    const timeRemaining = data.endTime ? Math.max(0, (data.endTime - Date.now()) / 1000) : data.timer;
    const startPercent = (timeRemaining / totalTimer) * 100;
    
    if (timerFill) {
        timerFill.style.transition = 'none';
        timerFill.style.width = startPercent + '%';
        timerFill.style.visibility = 'visible';
        timerFill.style.opacity = '1';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                timerFill.style.transition = `width ${timeRemaining}s linear`;
                timerFill.style.width = '0%';
            });
        });
    }
    
    // Timer urgency + dot shatter — synced to server endTime
    const endTime = data.endTime || (Date.now() + data.timer * 1000);
    pollState._timerEndTime = endTime;
    pollState._timerInterval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        const tw = document.getElementById('pollTimerWrap');
        if (tw && remaining <= 3) tw.classList.add('urgent');
        if (remaining <= 0) {
            clearInterval(pollState._timerInterval);
            // Dot shatter
            const bar = tw?.querySelector('.poll-timer-bar');
            const fill = document.getElementById('pollTimerFill');
            if (bar && fill) {
                const fillRect = fill.getBoundingClientRect();
                const barRect = bar.getBoundingClientRect();
                const dotX = fillRect.right - barRect.left;
                fill.style.opacity = '0';
                fill.style.visibility = 'hidden';
                for (let i = 0; i < 12; i++) {
                    const p = document.createElement('div');
                    const a = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.5;
                    const d = 15 + Math.random() * 35;
                    const s = 2 + Math.random() * 4;
                    p.className = `poll-timer-shard ${Math.random() > 0.7 ? 'white' : 'red'}`;
                    Object.assign(p.style, {
                        left: dotX + 'px', top: '0px',
                        width: s + 'px', height: s + 'px', borderRadius: '50%',
                        transition: `all ${0.5 + Math.random() * 0.4}s cubic-bezier(.16,1,.3,1)`,
                    });
                    bar.appendChild(p);
                    requestAnimationFrame(() => requestAnimationFrame(() => {
                        p.style.transform = `translate(${Math.cos(a)*d}px, ${Math.sin(a)*d}px)`;
                        p.style.opacity = '0';
                    }));
                    setTimeout(() => p.remove(), 1000);
                }
            }
        }
    }, 250); // Check more frequently for precision
    } // end if !skipTimer
    
    // No skip button — admin uses "Suivant" below timer after results
    const controls = document.getElementById('pollAdminControls');
    if (controls) controls.innerHTML = '';
}

function updatePollVotes(data) {
    // Store voter data for later display (after results)
    if (data.votersByChar) {
        pollState._votersByChar = data.votersByChar;
    }
}

function showPollResult(data) {
    // Close voting
    pollState.votingOpen = false;
    pollState.isTie = data.isTie || false;
    if (pollState._timerInterval) clearInterval(pollState._timerInterval);
    
    // Trigger shatter if timer hasn't reached 0 yet
    const tw = document.getElementById('pollTimerWrap');
    const fill = document.getElementById('pollTimerFill');
    if (fill && fill.style.opacity !== '0') {
        const bar = tw?.querySelector('.poll-timer-bar');
        if (bar && fill) {
            const fillRect = fill.getBoundingClientRect();
            const barRect = bar.getBoundingClientRect();
            const dotX = fillRect.right - barRect.left;
            fill.style.opacity = '0';
            fill.classList.add('poll-timer-shattered');
            for (let i = 0; i < 12; i++) {
                const p = document.createElement('div');
                const a = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.5;
                const d = 15 + Math.random() * 35;
                const s = 2 + Math.random() * 4;
                p.className = `poll-timer-shard ${Math.random() > 0.7 ? 'white' : 'red'}`;
                Object.assign(p.style, {
                    left: dotX + 'px', top: '0px',
                    width: s + 'px', height: s + 'px', borderRadius: '50%',
                    transition: `all ${0.5 + Math.random() * 0.4}s cubic-bezier(.16,1,.3,1)`,
                });
                bar.appendChild(p);
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    p.style.transform = `translate(${Math.cos(a)*d}px, ${Math.sin(a)*d}px)`;
                    p.style.opacity = '0';
                }));
                setTimeout(() => p.remove(), 1000);
            }
        }
    } else if (fill) {
        fill.style.visibility = 'hidden';
    }
    
    // Show results under cards (always, tie or not)
    const chars = data.characters || [];
    const mx = Math.max(...Object.values(data.voteResults).map(r => r.percentage));
    setTimeout(() => {
        chars.forEach((char, i) => {
            const res = document.querySelector(`.poll-char-result[data-cid="${char.id}"]`);
            if (!res) return;
            const result = data.voteResults[char.id] || { count: 0, percentage: 0 };
            setTimeout(() => {
                res.classList.add('show');
                if (result.percentage === mx) res.classList.add('win');
                res.querySelector('.poll-res-pct').textContent = result.percentage + '%';
                res.querySelector('.poll-res-votes').textContent = result.count + ' vote' + (result.count > 1 ? 's' : '');
            }, i * 120);
        });
        
        // Show voter badges now that results are visible
        if (data.votersByChar) {
            pollState._votersByChar = data.votersByChar;
        }
        pollRenderVoterBadges();
    }, 500);
    
    if (data.isTie && !data.winner) {
        // ═══ ÉGALITÉ — deselect cards, show dice ═══
        pollPlayTieSound();
        const cards = document.querySelectorAll('.poll-char-card');
        cards.forEach(card => {
            card.classList.remove('poll-voted', 'poll-not-voted', 'poll-winner', 'poll-loser');
            card.style.cursor = 'pointer';
            card.style.pointerEvents = 'auto';
            card.onclick = function() { pollTiePickCard(card.dataset.charId); };
        });
        
        // Show dice button
        setTimeout(() => {
            const nextWrap = document.getElementById('pollNextWrap');
            if (nextWrap) {
                nextWrap.innerHTML = `
                    <button class="poll-dice-btn" id="pollDiceBtn" onclick="pollDiceRoll()">
                        <span class="poll-dice-icon">🎲</span>
                    </button>
                `;
                nextWrap.classList.add('visible');
            }
        }, 1000);
    } else {
        // ═══ GAGNANT CLAIR — reveal synced with shatter ═══
        const cards = document.querySelectorAll('.poll-char-card');
        cards.forEach(card => {
            card.classList.remove('poll-voted', 'poll-not-voted');
            card.onclick = null;
            card.style.cursor = 'default';
            if (data.winner && card.dataset.charId === data.winner.id) {
                card.classList.add('poll-winner');
                // Particles + sound immediately with shatter
                pollSpawnParticles(card);
            } else {
                card.classList.add('poll-loser');
            }
        });
        // Sound fires at the same time as shatter
        pollPlayWinSound();
        
        if (data.isLastMatch) {
            // Last match — auto-advance to victory screen
            setTimeout(() => {
                pollNextMatch();
            }, 2000);
        } else {
            // Show next button
            setTimeout(() => {
                const nextWrap = document.getElementById('pollNextWrap');
                if (nextWrap) {
                    nextWrap.innerHTML = `<button class="poll-next-btn" onclick="pollNextMatch()">Suivant →</button>`;
                    nextWrap.classList.add('visible');
                }
            }, 1500);
        }
    }
    
    // Hide skip button
    const controls = document.getElementById('pollAdminControls');
    if (controls) controls.innerHTML = '';
}

// Admin picks a card manually during tie
function pollTiePickCard(charId) {
    if (!pollState.isTie) return;
    pollState.isTie = false;
    pollState.currentVote = null;
    
    // Hide dice
    const nextWrap = document.getElementById('pollNextWrap');
    if (nextWrap) nextWrap.classList.remove('visible');
    
    // Apply winner/loser immediately — same as end-of-timer reveal
    document.querySelectorAll('.poll-char-card').forEach(card => {
        card.onclick = null;
        card.style.cursor = 'default';
        card.style.pointerEvents = '';
        card.classList.remove('poll-voted', 'poll-not-voted');
        if (card.dataset.charId === charId) {
            card.classList.add('poll-winner');
            pollSpawnParticles(card);
        } else {
            card.classList.add('poll-loser');
        }
    });
    pollPlayWinSound();
    
    // Send to server
    socket.emit('poll-resolve-tie', { winnerId: charId });
    
    // Auto-advance after animation
    setTimeout(() => {
        pollNextMatch();
    }, 1500);
}

// Admin clicks dice — random pick (direct, no animation)
function pollDiceRoll() {
    if (!pollState.isTie) return;
    
    const cards = document.querySelectorAll('.poll-char-card');
    const charIds = Array.from(cards).map(c => c.dataset.charId);
    const winnerId = charIds[Math.floor(Math.random() * charIds.length)];
    
    pollTiePickCard(winnerId);
}

function pollRenderVoterBadges() {
    const voters = pollState._votersByChar;
    if (!voters) return;
    const MAX_AVATARS = 4;
    Object.entries(voters).forEach(([charId, voterList]) => {
        const badge = document.querySelector(`.poll-voter-badge[data-voter-cid="${charId}"]`);
        if (!badge) return;
        if (voterList.length === 0) { badge.innerHTML = ''; return; }
        const show = voterList.slice(0, MAX_AVATARS);
        let html = show.map(v => {
            const name = v.username || '?';
            if (v.avatar) {
                return `<span class="pvb-av-wrap" title="${name}"><img class="pvb-av" src="${v.avatar}" alt="" onerror="this.style.display='none'"></span>`;
            } else {
                return `<span class="pvb-av-wrap" title="${name}"><div class="pvb-av pvb-av-placeholder">${name[0].toUpperCase()}</div></span>`;
            }
        }).join('');
        if (voterList.length > MAX_AVATARS) {
            html += `<span class="pvb-count">+${voterList.length - MAX_AVATARS}</span>`;
        }
        badge.innerHTML = html;
    });
}

function pollToggleNotifs() {
    pollState.showNotifs = !pollState.showNotifs;
    const btn = document.getElementById('pollNotifToggle');
    if (btn) btn.classList.toggle('off', !pollState.showNotifs);
    const zone = document.getElementById('pollNotifZone');
    if (zone) zone.style.display = pollState.showNotifs ? '' : 'none';
}

function pollSpawnVoteNotif(username, avatar) {
    if (!pollState.showNotifs) return;
    const zone = document.getElementById('pollNotifZone');
    if (!zone) return;
    
    const zW = zone.offsetWidth;
    const zH = zone.offsetHeight;
    const rand = (a, b) => a + Math.random() * (b - a);
    
    const angle = rand(-2.8, -0.3);
    const totalDist = rand(70, 160);
    const midX = rand(20, zW * 0.78);
    const midY = rand(zH * 0.18, zH * 0.78);
    const halfDist = totalDist / 2;
    const sx = midX - Math.cos(angle) * halfDist;
    const sy = midY - Math.sin(angle) * halfDist;
    const ex = midX + Math.cos(angle) * halfDist;
    const ey = midY + Math.sin(angle) * halfDist;
    const life = rand(2.4, 3.8);
    const peakOp = rand(0.55, 1.0);
    const sr = rand(-12, 12);
    const er = sr + rand(-10, 10);
    
    const notif = document.createElement('div');
    notif.className = 'poll-vote-notif';
    notif.style.setProperty('--sx', sx + 'px');
    notif.style.setProperty('--sy', sy + 'px');
    notif.style.setProperty('--ex', ex + 'px');
    notif.style.setProperty('--ey', ey + 'px');
    notif.style.setProperty('--life', life + 's');
    notif.style.setProperty('--peak-op', peakOp);
    notif.style.setProperty('--sr', sr + 'deg');
    notif.style.setProperty('--er', er + 'deg');
    
    const avatarHtml = avatar 
        ? `<img class="pn-avatar" src="${avatar}" alt="" onerror="this.style.display='none'">` 
        : '';
    notif.innerHTML = `
        ${avatarHtml}
        <div class="pn-text"><strong>${username}</strong> a voté</div>
        <span class="pn-check">✓</span>
    `;
    
    zone.appendChild(notif);
    setTimeout(() => { if (notif.parentNode) notif.remove(); }, life * 1000 + 300);
    while (zone.children.length > 30) zone.removeChild(zone.firstChild);
}

function showRoundAnnouncement(data) {
    const area = document.getElementById('pollMatchArea');
    if (!area) return;
    
    area.innerHTML = `
        <div class="poll-round-announce">
            <div class="poll-round-title">Round ${data.round + 1}</div>
            <div class="poll-round-subtitle">${data.matchCount} match${data.matchCount > 1 ? 's' : ''}</div>
        </div>
    `;
}

function showPollWinner(data) {
    const container = document.getElementById('pollAdminContainer');
    if (!container || !data.winner) return;
    
    container.innerHTML = `
        <div class="poll-game-topbar">
            <div class="poll-game-logo">Shonen<span class="poll-logo-master">Master</span></div>
            <div class="poll-game-badge">POLL</div>
        </div>
        <div class="poll-victory">
            <div class="poll-victory-crown">
                <svg viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 48L14 18L28 32L40 8L52 32L66 18L76 48H4Z" fill="url(#crownGradA)" stroke="rgba(240,128,176,0.6)" stroke-width="1.5"/>
                    <circle cx="14" cy="16" r="4" fill="#f080b0" opacity="0.8"/>
                    <circle cx="40" cy="6" r="5" fill="#f5a0c8" opacity="0.9"/>
                    <circle cx="66" cy="16" r="4" fill="#f080b0" opacity="0.8"/>
                    <rect x="4" y="48" width="72" height="6" rx="2" fill="url(#crownGradA)"/>
                    <defs>
                        <linearGradient id="crownGradA" x1="4" y1="8" x2="76" y2="54">
                            <stop offset="0%" stop-color="#f080b0"/>
                            <stop offset="50%" stop-color="#f5c0d8"/>
                            <stop offset="100%" stop-color="#f080b0"/>
                        </linearGradient>
                    </defs>
                </svg>
                <div class="poll-victory-sparkles" id="pollVictorySparkles"></div>
            </div>
            <div class="poll-victory-card-wrap">
                <div class="poll-victory-card-inner">
                    <div class="poll-victory-card-glow"></div>
                    <div class="poll-victory-img-wrapper">
                        <img src="${data.winner.img}" alt="${data.winner.name}" class="poll-victory-img" onerror="this.src='novice.png'">
                    </div>
                </div>
            </div>
            <div class="poll-victory-winner-name">${data.winner.name}</div>
            <div class="poll-victory-category">${data.category || ''}</div>
            <div class="poll-victory-stats">${data.bracketSize || ''} personnages · ${data.totalRounds || ''} rounds</div>
            <button class="poll-victory-close-btn" onclick="pollEndGameClose()">FERMER LOBBY</button>
        </div>
    `;
    
    const controls = document.getElementById('pollAdminControls');
    if (controls) controls.innerHTML = '';
    
    // Spawn sparkles
    setTimeout(() => pollSpawnVictorySparkles(), 400);
}

function pollSpawnVictorySparkles() {
    const container = document.getElementById('pollVictorySparkles');
    if (!container) return;
    const cx = 40, cy = 30;
    const spawn = () => {
        for (let i = 0; i < 8; i++) {
            const p = document.createElement('div');
            const a = Math.random() * Math.PI * 2;
            const d = 30 + Math.random() * 50;
            const s = 2 + Math.random() * 3;
            const hue = 325 + Math.random() * 40;
            const light = 60 + Math.random() * 30;
            Object.assign(p.style, {
                position: 'absolute', width: s+'px', height: s+'px', borderRadius: '50%',
                background: `hsl(${hue}, 85%, ${light}%)`,
                left: cx+'px', top: cy+'px', opacity: '0.8',
                transition: `all ${0.8 + Math.random()*0.5}s cubic-bezier(.15,.9,.3,1)`,
                pointerEvents: 'none',
                boxShadow: `0 0 ${s*3}px hsl(${hue}, 85%, ${light}%)`
            });
            container.appendChild(p);
            requestAnimationFrame(() => requestAnimationFrame(() => {
                p.style.left = (cx + Math.cos(a) * d) + 'px';
                p.style.top = (cy + Math.sin(a) * d) + 'px';
                p.style.opacity = '0';
                p.style.transform = 'scale(0)';
            }));
            setTimeout(() => p.remove(), 1400);
        }
    };
    spawn();
    const iv = setInterval(spawn, 1200);
    setTimeout(() => clearInterval(iv), 8000);
}

function pollForceEndVote() {
    socket.emit('poll-force-end-vote');
}

function pollAdminVote(characterId) {
    if (!pollState.votingOpen || pollState.currentVote) return;
    // Admin must have joined the lobby to vote
    if (typeof adminInLobby !== 'undefined' && !adminInLobby) return;
    
    socket.emit('poll-vote', { characterId });
    pollState.currentVote = characterId;
    sessionStorage.setItem('pollAdminVote', characterId);
    sessionStorage.setItem('pollAdminVoteMatch', `${pollState.currentRound}_${pollState.currentMatchIndex}`);
    
    // Update UI
    document.querySelectorAll('.poll-char-card').forEach(card => {
        const isVoted = card.dataset.charId === characterId;
        card.classList.remove('poll-voted', 'poll-not-voted');
        if (isVoted) {
            card.classList.add('poll-voted');
            // Re-trigger bounce
            const inner = card.querySelector('.poll-char-inner');
            if (inner) { inner.style.animation = 'none'; void inner.offsetHeight; inner.style.animation = ''; }
            const pulse = card.querySelector('.poll-char-pulse');
            if (pulse) { pulse.style.animation = 'none'; void pulse.offsetHeight; pulse.style.animation = ''; }
            // Particles
            pollSpawnParticles(card);
            // Sound
            pollPlayVoteSound();
        } else {
            card.classList.add('poll-not-voted');
        }
    });
}

function pollPlayVoteSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(350, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15);
        
        const noise = ctx.createBufferSource();
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.025, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.12));
        noise.buffer = buf;
        const nGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass'; filter.frequency.value = 4000; filter.Q.value = 1.2;
        noise.connect(filter); filter.connect(nGain); nGain.connect(ctx.destination);
        nGain.gain.setValueAtTime(0.07, ctx.currentTime);
        noise.start(ctx.currentTime);
        
        const ding = ctx.createOscillator();
        const dg = ctx.createGain();
        ding.connect(dg); dg.connect(ctx.destination);
        ding.type = 'sine';
        ding.frequency.setValueAtTime(900, ctx.currentTime + 0.03);
        dg.gain.setValueAtTime(0, ctx.currentTime);
        dg.gain.setValueAtTime(0.04, ctx.currentTime + 0.03);
        dg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        ding.start(ctx.currentTime + 0.03); ding.stop(ctx.currentTime + 0.16);
    } catch(e) {}
}

function pollPlayTieSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const t = ctx.currentTime;
        
        // Soft descending two-tone — "hmm, tied"
        const o1 = ctx.createOscillator();
        const g1 = ctx.createGain();
        o1.connect(g1); g1.connect(ctx.destination);
        o1.type = 'sine';
        o1.frequency.setValueAtTime(520, t);
        o1.frequency.exponentialRampToValueAtTime(480, t + 0.15);
        g1.gain.setValueAtTime(0.04, t);
        g1.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        o1.start(t); o1.stop(t + 0.2);
        
        const o2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o2.connect(g2); g2.connect(ctx.destination);
        o2.type = 'sine';
        o2.frequency.setValueAtTime(400, t + 0.12);
        o2.frequency.exponentialRampToValueAtTime(350, t + 0.3);
        g2.gain.setValueAtTime(0, t);
        g2.gain.setValueAtTime(0.035, t + 0.12);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        o2.start(t + 0.12); o2.stop(t + 0.36);
    } catch(e) {}
}

function pollPlayWinSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const t = ctx.currentTime;
        
        // Rising sweep
        const sweep = ctx.createOscillator();
        const sweepGain = ctx.createGain();
        sweep.connect(sweepGain); sweepGain.connect(ctx.destination);
        sweep.type = 'sine';
        sweep.frequency.setValueAtTime(250, t);
        sweep.frequency.exponentialRampToValueAtTime(600, t + 0.15);
        sweep.frequency.exponentialRampToValueAtTime(400, t + 0.25);
        sweepGain.gain.setValueAtTime(0.08, t);
        sweepGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        sweep.start(t); sweep.stop(t + 0.3);
        
        // High chime 1
        const chime1 = ctx.createOscillator();
        const cg1 = ctx.createGain();
        chime1.connect(cg1); cg1.connect(ctx.destination);
        chime1.type = 'sine';
        chime1.frequency.setValueAtTime(880, t + 0.08);
        cg1.gain.setValueAtTime(0, t);
        cg1.gain.setValueAtTime(0.06, t + 0.08);
        cg1.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        chime1.start(t + 0.08); chime1.stop(t + 0.36);
        
        // High chime 2 (harmony)
        const chime2 = ctx.createOscillator();
        const cg2 = ctx.createGain();
        chime2.connect(cg2); cg2.connect(ctx.destination);
        chime2.type = 'sine';
        chime2.frequency.setValueAtTime(1100, t + 0.14);
        cg2.gain.setValueAtTime(0, t);
        cg2.gain.setValueAtTime(0.04, t + 0.14);
        cg2.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        chime2.start(t + 0.14); chime2.stop(t + 0.46);
        
        // Soft impact noise
        const noise = ctx.createBufferSource();
        const buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.08));
        noise.buffer = buf;
        const nGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass'; filter.frequency.value = 3000;
        noise.connect(filter); filter.connect(nGain); nGain.connect(ctx.destination);
        nGain.gain.setValueAtTime(0.05, t);
        noise.start(t);
    } catch(e) {}
}

function pollSpawnParticles(card) {
    const inner = card.querySelector('.poll-char-inner');
    if (!inner) return;
    const r = inner.getBoundingClientRect();
    const cardR = card.getBoundingClientRect();
    const w = r.width, h = r.height;
    const ox = r.left - cardR.left, oy = r.top - cardR.top;
    
    const edgePoints = [];
    for (let i = 0; i < 12; i++) edgePoints.push({ x: ox + (w * i/11), y: oy, angle: -Math.PI/2 + (Math.random()-0.5)*0.8 });
    for (let i = 0; i < 12; i++) edgePoints.push({ x: ox + (w * i/11), y: oy + h, angle: Math.PI/2 + (Math.random()-0.5)*0.8 });
    for (let i = 0; i < 8; i++) edgePoints.push({ x: ox, y: oy + (h * i/7), angle: Math.PI + (Math.random()-0.5)*0.8 });
    for (let i = 0; i < 8; i++) edgePoints.push({ x: ox + w, y: oy + (h * i/7), angle: 0 + (Math.random()-0.5)*0.8 });
    [{x: ox, y: oy}, {x: ox+w, y: oy}, {x: ox, y: oy+h}, {x: ox+w, y: oy+h}].forEach(corner => {
        for (let i = 0; i < 6; i++) {
            const a = Math.atan2(corner.y - (oy+h/2), corner.x - (ox+w/2)) + (Math.random()-0.5)*0.6;
            edgePoints.push({ x: corner.x, y: corner.y, angle: a });
        }
    });
    
    edgePoints.forEach((pt) => {
        const p = document.createElement('div');
        const dist = 60 + Math.random() * 100;
        const s = 3 + Math.random() * 6;
        const hue = 325 + Math.random() * 40;
        const light = 55 + Math.random() * 30;
        const dur = 0.5 + Math.random() * 0.5;
        Object.assign(p.style, {
            position: 'absolute', width: s+'px', height: s+'px', borderRadius: '50%',
            background: `hsl(${hue}, 85%, ${light}%)`,
            left: pt.x+'px', top: pt.y+'px', opacity: '1',
            transition: `all ${dur}s cubic-bezier(.15,.9,.3,1)`,
            pointerEvents: 'none', zIndex: '10',
            boxShadow: `0 0 ${s*3}px hsl(${hue}, 85%, ${light}%), 0 0 ${s*6}px hsl(${hue}, 60%, ${light-10}%)`
        });
        card.appendChild(p);
        requestAnimationFrame(() => requestAnimationFrame(() => {
            p.style.left = (pt.x + Math.cos(pt.angle) * dist) + 'px';
            p.style.top = (pt.y + Math.sin(pt.angle) * dist) + 'px';
            p.style.opacity = '0';
            p.style.transform = `scale(0.2) rotate(${Math.random()*180}deg)`;
        }));
        setTimeout(() => p.remove(), (dur * 1000) + 100);
    });
    
    // Edge glow flash
    const glow = document.createElement('div');
    Object.assign(glow.style, {
        position: 'absolute', left: ox+'px', top: oy+'px', width: w+'px', height: h+'px',
        borderRadius: '14px', border: '2px solid rgba(240,128,176,0.6)',
        boxShadow: '0 0 20px rgba(240,128,176,0.4), inset 0 0 20px rgba(240,128,176,0.1)',
        pointerEvents: 'none', zIndex: '9', transition: 'all 0.6s ease-out', opacity: '1'
    });
    card.appendChild(glow);
    requestAnimationFrame(() => requestAnimationFrame(() => {
        glow.style.opacity = '0'; glow.style.transform = 'scale(1.08)';
        glow.style.boxShadow = '0 0 40px rgba(240,128,176,0), inset 0 0 40px rgba(240,128,176,0)';
    }));
    setTimeout(() => glow.remove(), 700);
}

function pollNextMatch() {
    // Hide next button
    const nextWrap = document.getElementById('pollNextWrap');
    if (nextWrap) nextWrap.classList.remove('visible');
    
    // Hide timer wrap (will reappear with next match)
    const timerWrap = document.getElementById('pollTimerWrap');
    if (timerWrap) {
        timerWrap.classList.remove('visible', 'urgent');
    }
    
    // Exit animations
    const row = document.querySelector('.poll-cards-row');
    if (row) {
        // Fade results
        row.querySelectorAll('.poll-char-result').forEach(r => {
            r.style.transition = 'opacity 0.15s';
            r.style.opacity = '0';
        });
        // Exit cards + VS
        const children = Array.from(row.children);
        children.forEach((el, i) => {
            setTimeout(() => el.classList.add('poll-exiting'), i * 20);
        });
    }
    
    // Emit after exit animation
    setTimeout(() => {
        socket.emit('poll-next-match');
    }, 800);
}

function pollCloseLobby() {
    // Create confirmation modal
    let modal = document.getElementById('pollCloseModal');
    if (modal) { modal.remove(); return; }
    
    modal = document.createElement('div');
    modal.id = 'pollCloseModal';
    modal.className = 'poll-close-modal';
    modal.innerHTML = `
        <div class="poll-close-modal-content">
            <div class="poll-close-modal-title">Fermer le lobby ?</div>
            <div class="poll-close-modal-subtitle">Cette action mettra fin à la partie en cours</div>
            <div class="poll-close-modal-actions">
                <button class="poll-close-modal-btn cancel" onclick="document.getElementById('pollCloseModal').remove()">Annuler</button>
                <button class="poll-close-modal-btn confirm" onclick="pollConfirmClose()">Confirmer</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function pollConfirmClose() {
    // Remove modal
    const modal = document.getElementById('pollCloseModal');
    if (modal) modal.remove();
    
    try {
        await fetch('/admin/toggle-game', {
            method: 'POST',
            credentials: 'same-origin'
        });
    } catch (error) {
        console.error('❌ Erreur fermeture lobby Poll:', error);
    }
    
    cleanupPoll();
}

// Direct close from victory screen — no confirmation needed
async function pollEndGameClose() {
    try {
        await fetch('/admin/toggle-game', {
            method: 'POST',
            credentials: 'same-origin'
        });
    } catch (error) {
        console.error('❌ Erreur fermeture lobby Poll:', error);
    }
    
    cleanupPoll();
}

// ═══════════════════════════════════════════
// 🎛️ Category Dropdown
// ═══════════════════════════════════════════

let pollDropdownOpen = false;

function togglePollCategoryDropdown() {
    const panel = document.getElementById('pollCategoryPanel');
    const chevron = document.getElementById('pollCategoryChevron');
    if (!panel) return;
    
    pollDropdownOpen = !pollDropdownOpen;
    panel.style.display = pollDropdownOpen ? 'block' : 'none';
    if (chevron) chevron.style.transform = pollDropdownOpen ? 'rotate(180deg)' : '';
}

function selectPollCategory(id, name, count) {
    pollState.category = id;
    
    // Show name below header
    let nameEl = document.getElementById('pollCategorySelectedName');
    if (!nameEl) {
        nameEl = document.createElement('div');
        nameEl.id = 'pollCategorySelectedName';
        nameEl.className = 'poll-category-selected-name';
        const trigger = document.getElementById('pollCategoryTrigger');
        if (trigger) trigger.parentNode.insertBefore(nameEl, trigger.nextSibling);
    }
    nameEl.textContent = name;
    
    // Hide header value (only show the pink name below)
    const valueEl = document.getElementById('pollCategoryValue');
    valueEl.textContent = '';
    
    // Update active item
    document.querySelectorAll('.poll-dropdown-item').forEach(item => {
        item.classList.toggle('active', item.dataset.catId === id);
    });
    
    // Close dropdown
    const panel = document.getElementById('pollCategoryPanel');
    const chevron = document.getElementById('pollCategoryChevron');
    if (panel) panel.style.display = 'none';
    if (chevron) chevron.style.transform = '';
    pollDropdownOpen = false;
    
    // Refresh bracket sizes
    refreshBracketSizes();
    
    if (typeof anime !== 'undefined') {
        anime({ targets: '#pollCategoryValue', scale: [1.15, 1], duration: 200, easing: 'easeOutQuad' });
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (pollDropdownOpen && !e.target.closest('.poll-category-group')) {
        const panel = document.getElementById('pollCategoryPanel');
        const chevron = document.getElementById('pollCategoryChevron');
        if (panel) panel.style.display = 'none';
        if (chevron) chevron.style.transform = '';
        pollDropdownOpen = false;
    }
});

function renderPollCategoryList(categories) {
    const list = document.getElementById('pollCategoryList');
    if (!list) return;
    
    let html = '';
    
    const special = categories.filter(c => c.type === 'special' && c.id !== 'all');
    const animes = categories.filter(c => c.type === 'anime');
    
    // Séries first
    if (animes.length > 0) {
        html += '<div class="poll-dropdown-section">Séries</div>';
        animes.forEach((cat, i) => {
            const isActive = cat.id === pollState.category;
            html += `<div class="poll-dropdown-item ${isActive ? 'active' : ''}" data-cat-id="${cat.id}" onclick="selectPollCategory('${cat.id}', '${cat.name.replace(/'/g, "\\'")}', ${cat.count})">
                <span class="poll-dropdown-item-name">${cat.name}</span>
            </div>`;
            if (i < animes.length - 1) html += '<div class="poll-dropdown-divider"></div>';
        });
    }
    
    // Then special categories
    if (special.length > 0) {
        html += '<div class="poll-dropdown-divider-thick"></div>';
        html += '<div class="poll-dropdown-section">Catégories</div>';
        special.forEach((cat, i) => {
            const isActive = cat.id === pollState.category;
            html += `<div class="poll-dropdown-item ${isActive ? 'active' : ''}" data-cat-id="${cat.id}" onclick="selectPollCategory('${cat.id}', '${cat.name.replace(/'/g, "\\'")}', ${cat.count})">
                <span class="poll-dropdown-item-name">${cat.name}</span>
            </div>`;
            if (i < special.length - 1) html += '<div class="poll-dropdown-divider"></div>';
        });
    }
    
    list.innerHTML = html;
    
    // Set default to first anime if current is 'all'
    if (pollState.category === 'all' && animes.length > 0) {
        selectPollCategory(animes[0].id, animes[0].name, animes[0].count);
    }
}

// ═══════════════════════════════════════════
// 🔌 Init on socket ready
// ═══════════════════════════════════════════

// Called when socket is available (from admin.js)
function initPollAdmin() {
    initPollSocketEvents();
    
    // Request categories when entering poll mode
    if (socket && socket.connected) {
        socket.emit('poll-get-categories');
    }
}

// Hook into mode change — call from admin.js when poll mode is selected
function onPollModeSelected() {
    if (socket && socket.connected) {
        socket.emit('poll-get-categories');
    }
}

// ═══════════════════════════════════════════
// 🧹 Cleanup
// ═══════════════════════════════════════════

function cleanupPoll() {
    // Clear any running timers
    if (pollState._timerInterval) {
        clearInterval(pollState._timerInterval);
        pollState._timerInterval = null;
    }
    
    // Remove DOM
    const container = document.getElementById('pollAdminContainer');
    if (container) container.remove();
    
    // Remove body classes
    document.body.classList.remove('poll-active');
    
    // Clear session storage
    sessionStorage.removeItem('pollGameActive');
    sessionStorage.removeItem('pollAdminVote');
    sessionStorage.removeItem('pollAdminVoteMatch');
    
    // Reset all poll state
    pollState.category = 'all';
    pollState.perMatch = 2;
    pollState.bracketSize = 32;
    pollState.showNames = false;
    pollState.voteTimer = 15;
    pollState.currentVote = null;
    pollState.votingOpen = false;
    pollState.isTie = false;
    pollState._timerEndTime = null;
    pollState._shattered = false;
    
    // Reset lobby UI elements
    const timerSlider = document.getElementById('pollTimerSlider');
    if (timerSlider) { timerSlider.value = 15; }
    const timerValue = document.getElementById('pollTimerValue');
    if (timerValue) { timerValue.textContent = '15s'; }
    const showNamesValue = document.getElementById('pollShowNamesValue');
    if (showNamesValue) { showNamesValue.textContent = 'Non'; }
    document.querySelectorAll('.poll-names-group .poll-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === 'off');
    });
    const perMatchValue = document.getElementById('pollPerMatchValue');
    if (perMatchValue) { perMatchValue.textContent = '2'; }
    document.querySelectorAll('.poll-permatch-group .poll-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === '2');
    });
    const bracketValue = document.getElementById('pollBracketValue');
    if (bracketValue) { bracketValue.textContent = '32'; }
    document.querySelectorAll('.poll-bracket-group .poll-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === '32');
    });
}