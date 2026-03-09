
// ============================================
// 🎴 COLLECT - Admin Module
// Requires: socket, currentGameMode, twitchUser, returnToIdle,
//           collectHandSize, adminInLobby, playAdminSound
// ============================================

function initCollectSocketHandlers(socket) {
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
            // Mon tour → enable scanner hover on opponent cards
            document.querySelectorAll('.collect-player-seat:not(.me) .collect-player-cards-wrapper').forEach(w => w.classList.add('scannable'));
            // Mon tour → reset état du tour + unlock cartes + timer + deck
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
            _adminLastAction = null; // 🎬 Reset actions bar
            startAdminCollectTimer(data.duration || 15);
            updateAdminActionsBar(null);
        } else {
            // Pas mon tour → disable scanner hover
            document.querySelectorAll('.collect-player-cards-wrapper').forEach(w => w.classList.remove('scannable'));
            // Pas mon tour → lock cartes + cacher timer POV + disable deck
            if (myCards) myCards.classList.add('cards-locked');
            const deckEl2 = document.getElementById('adminCollectDeck');
            if (deckEl2) deckEl2.classList.remove('my-turn');
            stopAdminCollectTimer(true);
            updateAdminActionsBar(null);
        }
    });
    
    socket.on('collect-turn-end', () => {
        console.log('🎴 Tous les joueurs ont joué');
        _adminCurrentTurnId = null;
        _adminLastAction = null; // 🎬 Reset
        if (window._adminTurnRingInterval) { clearInterval(window._adminTurnRingInterval); window._adminTurnRingInterval = null; }
        document.querySelectorAll('.collect-choose-indicator').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.collect-player-name').forEach(el => el.classList.remove('turn-active'));
        document.querySelectorAll('.choose-ring-progress').forEach(r => r.style.strokeDashoffset = '91.1');
        const myCards = document.getElementById('adminPovCards');
        if (myCards) myCards.classList.add('cards-locked');
        const deckEl = document.getElementById('adminCollectDeck');
        if (deckEl) deckEl.classList.remove('my-turn');
        stopAdminCollectTimer(true);
        updateAdminActionsBar(null);
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

    // 🔍 Scanner result — cartes de l'adversaire reçues (privé admin)
    socket.on('collect-scan-result', (data) => {
        if (!data.success) {
            console.log('⚠️ Scan échoué:', data.reason);
            return;
        }
        
        console.log(`🔍 Admin scan: ${data.targetUsername} (${data.cards.length} cartes)`);
        
        adminCollectScanActive = true;
        adminCollectScanTargetId = data.targetId;
        adminCollectCardPlayed = true;
        triggerAdminActionBar('scan');
        
        // Lock admin cards + stop timer
        const myCards = document.getElementById('adminPovCards');
        if (myCards) myCards.classList.add('cards-locked');
        stopAdminCollectTimer(true);
        const deckEl = document.getElementById('adminCollectDeck');
        if (deckEl) deckEl.classList.remove('my-turn');
        
        // Find target seat and reveal cards
        const targetSeat = document.querySelector(`.collect-player-seat[data-twitch-id="${data.targetId}"]`);
        if (targetSeat) {
            targetSeat.classList.add('scan-target');
            const cardsContainer = targetSeat.querySelector('.collect-player-cards');
            if (cardsContainer) {
                cardsContainer.innerHTML = data.cards.map(card => {
                    const classIcon = getAdminClassIcon(card.class);
                    let imgHtml;
                    if (card.isFused && card.fusedCards && card.fusedCards.length > 1) {
                        const count = card.fusedCards.length;
                        imgHtml = `<div class="scan-fused-wrap fused-x${count}">` +
                            card.fusedCards.map(fc => `<img class="scan-card-img" src="${getAdminCardImage(fc)}" alt="${fc.name}">`).join('') +
                            `</div>`;
                    } else {
                        imgHtml = `<img class="scan-card-img" src="${getAdminCardImage(card)}" alt="${card.name}">`;
                    }
                    return `<div class="collect-player-card-small scan-revealed ${card.class}${card.isFused ? ' scan-fused' : ''}">
                        ${imgHtml}
                        <div class="scan-card-class ${card.class}"><span class="class-icon">${classIcon}</span></div>
                        <div class="scan-card-info"><div class="scan-card-name">${adminFormatName(card.name)}</div></div>
                    </div>`;
                }).join('');
                
                // Attach preview hover on each revealed card
                const revealedCards = cardsContainer.querySelectorAll('.scan-revealed');
                revealedCards.forEach((el, idx) => {
                    const card = data.cards[idx];
                    if (!card) return;
                    el.addEventListener('mouseenter', () => showAdminCardPreview(card));
                    el.addEventListener('mouseleave', () => hideAdminCardPreview());
                });
            }
            
            // Add timer ring on the LEFT at block level (sibling of choose-indicator)
            const block = targetSeat.querySelector('.collect-player-block');
            if (block) {
                const existing = block.querySelector('.scan-timer-ring');
                if (existing) existing.remove();
                const timerRing = document.createElement('div');
                timerRing.className = 'scan-timer-ring';
                timerRing.innerHTML = `<svg viewBox="0 0 34 34"><circle class="ring-bg" cx="17" cy="17" r="14.5"/><circle class="ring-progress" cx="17" cy="17" r="14.5"/></svg><div class="scan-timer-text"><svg viewBox="0 0 24 24" fill="none" stroke="rgba(0,200,255,0.9)" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></div>`;
                block.appendChild(timerRing);
            }
        }
        
        // Timer 7s indépendant
        if (adminCollectScanInterval) clearInterval(adminCollectScanInterval);
        const scanStartMs = Date.now();
        const scanDurationMs = (data.duration || 7) * 1000;
        const circumference = 91.1; // 2π × 14.5
        
        adminCollectScanInterval = setInterval(() => {
            const elapsed = Date.now() - scanStartMs;
            const progress = Math.min(1, elapsed / scanDurationMs);
            
            // Update ring
            if (targetSeat) {
                const ring = targetSeat.querySelector('.ring-progress');
                if (ring) ring.style.strokeDashoffset = (circumference * progress).toFixed(1);
            }
            
            if (progress >= 1) {
                clearInterval(adminCollectScanInterval);
                adminCollectScanInterval = null;
                adminCollectScanActive = false;
                adminCollectScanTargetId = null;
                
                // Restore card backs
                if (targetSeat) {
                    targetSeat.classList.remove('scan-target');
                    const cardsContainer = targetSeat.querySelector('.collect-player-cards');
                    const cardCount = data.cards.length;
                    if (cardsContainer) {
                        cardsContainer.innerHTML = '<div class="collect-player-card-small"></div>'.repeat(cardCount);
                    }
                    const timerEl = targetSeat.querySelector('.scan-timer-ring');
                    if (timerEl) timerEl.remove();
                }
            }
        }, 100);
    });

    // 🔍 Scanner click delegation (admin-side)
    document.addEventListener('click', (e) => {
        const wrapper = e.target.closest('.collect-player-cards-wrapper');
        if (!wrapper) return;
        
        // Only if admin is the current turn player and hasn't played
        if (!twitchUser || _adminCurrentTurnId !== twitchUser.id) return;
        if (adminCollectCardPlayed || adminCollectTimerExpired || adminCollectScanActive) return;
        
        // Get target ID from seat
        const seat = wrapper.closest('.collect-player-seat');
        if (!seat || seat.classList.contains('me')) return;
        
        const targetId = seat.dataset.twitchId || wrapper.dataset.targetId;
        if (!targetId || targetId === twitchUser.id) return;
        
        console.log(`🔍 Admin scan: ${targetId}`);
        socket.emit('collect-scan-player', {
            twitchId: twitchUser.id,
            targetId: targetId
        });
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
                        // Enable scanner hover on opponent cards
                        document.querySelectorAll('.collect-player-seat:not(.me) .collect-player-cards-wrapper').forEach(w => w.classList.add('scannable'));
                        startAdminCollectTimer(Math.ceil(data.timerRemainingMs / 1000));
                    } else {
                        const deckEl2 = document.getElementById('adminCollectDeck');
                        if (deckEl2) deckEl2.classList.remove('my-turn');
                        // Disable scanner hover
                        document.querySelectorAll('.collect-player-cards-wrapper').forEach(w => w.classList.remove('scannable'));
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
        triggerAdminActionBar('draw');
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
            // Don't overwrite scan-revealed cards
            if (seat.classList.contains('scan-target')) return;
            const cardsContainer = seat.querySelector('.collect-player-cards');
            if (!cardsContainer) return;
            // Skip if cards are currently scan-revealed
            if (cardsContainer.querySelector('.scan-revealed')) return;
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
    
}

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
let adminCollectScanActive = false;
let _adminLastAction = null; // 🎬 Actions bar: dernière action réalisée
let adminCollectScanTargetId = null;
let adminCollectScanInterval = null;
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
        
        // 🎬 Actions Bar
        let actionsBar = collectContainer.querySelector('.collect-actions-bar');
        if (!actionsBar) {
            actionsBar = document.createElement('div');
            actionsBar.className = 'collect-actions-bar';
            actionsBar.innerHTML = [
                { action: 'draw', icon: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 12h6M12 9v6"/>', name: 'Draw', desc: 'Piocher une carte' },
                { action: 'swap', icon: '<path d="M7 16l-4-4 4-4"/><path d="M3 12h14"/><path d="M17 8l4 4-4 4"/><path d="M21 12H7"/>', name: 'Swap', desc: 'Échanger au marché' },
                { action: 'scan', icon: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>', name: 'Scan', desc: 'Voir les cartes adverses' },
                { action: 'throw', icon: '<path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7"/><path d="M10 11v6M14 11v6M3 7h18M8 7V4a1 1 0 011-1h6a1 1 0 011 1v3"/>', name: 'Throw', desc: 'Défausser une carte' },
                { action: 'duel', icon: '<path d="M12 3L4 7v5c0 5.25 3.4 10.15 8 11.25C16.6 22.15 20 17.25 20 12V7l-8-4z" fill="none"/><path d="M12 8v5M10 15l2-2 2 2"/>', name: 'Duel', desc: 'Défier un adversaire' },
                { action: 'thief', icon: '<path d="M9 5l1-1h4l1 1"/><path d="M6 9a3 3 0 013-3h6a3 3 0 013 3v2"/><path d="M5 14l1-3h12l1 3"/><path d="M7 21v-4a2 2 0 012-2h6a2 2 0 012 2v4"/><path d="M12 11v4"/>', name: 'Thief', desc: 'Voler une carte', crowns: 2 }
            ].map(a => {
                const crownsHtml = a.crowns ? `<div class="actbar-req">${'<div class="actbar-crown"><svg viewBox="0 0 24 24"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z"/></svg></div>'.repeat(a.crowns)}</div>` : '';
                return `<div class="act-bar-item act-${a.action} idle" data-action="${a.action}">
                    <div class="actbar-icon"><svg viewBox="0 0 24 24">${a.icon}</svg></div>
                    <div class="actbar-text"><span class="actbar-name">${a.name}</span><span class="actbar-desc">${a.desc}</span></div>
                    ${crownsHtml}
                </div>`;
            }).join('');
            collectContainer.appendChild(actionsBar);
        }
        // Show bar once slot is visible
        actionsBar.classList.add('visible');
        
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
                        <div class="collect-player-cards-wrapper">
                            <div class="scan-hover-overlay"><svg class="scan-hover-icon" viewBox="0 0 24 24" fill="none" stroke="rgba(0,200,255,0.55)" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg></div>
                            <div class="collect-player-cards${collectHandSize === 5 ? ' hand-5' : ''}">
                                ${"<div class=\"collect-player-card-small\"></div>".repeat(collectHandSize || 3)}
                            </div>
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
                if (cardsContainer && !cardsContainer.querySelector('.scan-revealed')) {
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
                        <div class="collect-player-cards-wrapper" data-target-id="${p.twitchId}">
                            <div class="scan-hover-overlay"><svg class="scan-hover-icon" viewBox="0 0 24 24" fill="none" stroke="rgba(0,200,255,0.55)" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg></div>
                            <div class="collect-player-cards${collectHandSize === 5 ? ' hand-5' : ''}">
                                ${"<div class=\"collect-player-card-small\"></div>".repeat(p.cardCount !== undefined ? p.cardCount : (collectHandSize || 3))}
                            </div>
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
    triggerAdminActionBar('throw');
    
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
    triggerAdminActionBar('swap');
    
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
        
        // Auto-remplir avec la série en cours
        const currentSerie = bombanimeState.serie || '';
        const display = document.getElementById('suggestionAnimeDisplay');
        const hidden = document.getElementById('suggestionAnime');
        if (display) display.textContent = getAnimeDisplayName(currentSerie);
        if (hidden) hidden.value = currentSerie;
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
    'Gintama': 'Gintama',
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

// ==============================================
// 🎬 ADMIN ACTIONS BAR
// ==============================================
const ACTBAR_COLORS = {
    draw:  { r: 59, g: 130, b: 246 },
    swap:  { r: 168, g: 85, b: 247 },
    scan:  { r: 0, g: 200, b: 255 },
    throw: { r: 249, g: 115, b: 22 },
    duel:  { r: 234, g: 179, b: 8 },
    thief: { r: 239, g: 68, b: 68 }
};

function updateAdminActionsBar(triggeredAction) {
    const isMyTurn = twitchUser && _adminCurrentTurnId === twitchUser.id;
    const actions = ['draw', 'swap', 'scan', 'throw', 'duel', 'thief'];
    
    actions.forEach(action => {
        const el = document.querySelector(`.act-bar-item[data-action="${action}"]`);
        if (!el) return;
        
        // Remove all states
        el.classList.remove('idle', 'available', 'active', 'triggered', 'used', 'locked');
        
        if (!isMyTurn) {
            el.classList.add('idle');
            return;
        }
        
        // Triggered action
        if (_adminLastAction === action) {
            if (triggeredAction === action) {
                el.classList.add('active', 'triggered');
            } else {
                el.classList.add('used');
            }
            return;
        }
        
        // Another action was used or card played
        if (_adminLastAction || adminCollectCardPlayed) {
            el.classList.add('locked');
            return;
        }
        
        el.classList.add('available');
    });
}

function triggerAdminActionBar(action) {
    _adminLastAction = action;
    updateAdminActionsBar(action);
    
    // Spawn JS effects
    const el = document.querySelector(`.act-bar-item[data-action="${action}"]`);
    if (el) spawnAdminActionBarEffects(el, action);
    
    // Remove triggered after animation
    setTimeout(() => {
        updateAdminActionsBar(null);
    }, 1000);
}

function spawnAdminActionBarEffects(el, action) {
    const color = ACTBAR_COLORS[action];
    if (!color) return;
    const c = `rgba(${color.r},${color.g},${color.b}`;
    
    // Shockwave rings
    for (let i = 0; i < 2; i++) {
        setTimeout(() => {
            const ring = document.createElement('div');
            ring.className = 'actbar-trigger-ring';
            ring.style.color = c + `,${i === 0 ? 0.6 : 0.3})`;
            if (i === 1) ring.style.animationDuration = '0.85s';
            el.appendChild(ring);
            setTimeout(() => ring.remove(), 900);
        }, i * 100);
    }
    
    // Particles
    const iconEl = el.querySelector('.actbar-icon');
    if (iconEl) {
        const rect = iconEl.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const ox = rect.left - elRect.left + rect.width / 2;
        const oy = rect.top - elRect.top + rect.height / 2;
        
        for (let i = 0; i < 8; i++) {
            const p = document.createElement('div');
            p.className = 'actbar-particle';
            const angle = (Math.PI * 2 / 8) * i + (Math.random() - 0.5) * 0.6;
            const dist = 25 + Math.random() * 40;
            const size = 2.5 + Math.random() * 2.5;
            p.style.left = ox + 'px';
            p.style.top = oy + 'px';
            p.style.width = size + 'px';
            p.style.height = size + 'px';
            p.style.setProperty('--px', (Math.cos(angle) * dist) + 'px');
            p.style.setProperty('--py', (Math.sin(angle) * dist) + 'px');
            p.style.setProperty('--dur', (0.4 + Math.random() * 0.3) + 's');
            p.style.background = c + ',0.9)';
            p.style.boxShadow = `0 0 6px ${c},0.6)`;
            el.appendChild(p);
            setTimeout(() => p.remove(), 800);
        }
    }
    
    // Screen flash
    const flash = document.createElement('div');
    flash.className = 'actbar-screen-flash';
    flash.style.background = `radial-gradient(ellipse at 90% 5%, ${c},0.15) 0%, transparent 50%)`;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 500);
}