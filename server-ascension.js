// ═══════════════════════════════════════════
// 🏔️ ASCENSION — Server Logic
// ═══════════════════════════════════════════

const ASCENSION_DATA = require('./ascensiondata.json');

const GAME_TYPES = [
    'guess',      // Devine le perso (5 images, tape les noms)
    'target',     // Cible (30 persos, 5 consignes "clique sur X")
    'intruder',   // Intrus (30 persos, trouve les 3 pas du bon anime)
    'wordle',     // Lettres communes (style Wordle)
    'silhouette', // Silhouette noire, devine le perso
    'order',      // Classer des arcs par ordre
    'match',      // Relie (perso→anime, couples, techniques, armes, rivaux, voix, studio)
];

const MATCH_SUBTYPES = [
    'char_anime',   // Perso → anime
    'couples',      // Couples
    'techniques',   // Perso → technique
    'weapons',      // Perso → arme
    'rivals',       // Rivaux
    'same_voice',   // Même voix
    'anime_studio', // Anime → studio
];

// ═══ State ═══

function createAscensionState() {
    return {
        active: false,
        floors: 15,
        timer: 15,
        syncEpreuves: true,
        currentFloor: 0,
        floorTimer: null,
        floorTimerEndTime: null,
        playerProgress: {},
        floorSequence: [],
        floorData: [],
        startedAt: null,
        countdownEndsAt: null,
        finishedPlayers: [],
    };
}

// ═══ Floor sequence generation ═══

function generateFloorSequence(numFloors) {
    const seq = [];
    for (let i = 0; i < numFloors; i++) {
        let available = GAME_TYPES.filter(t => {
            if (seq.length >= 2 && seq[seq.length - 1] === t && seq[seq.length - 2] === t) return false;
            if (seq.length >= 1 && seq[seq.length - 1] === t && Math.random() > 0.3) return false;
            return true;
        });
        if (available.length === 0) available = GAME_TYPES;
        seq.push(available[Math.floor(Math.random() * available.length)]);
    }
    return seq;
}

// ═══ Floor data generation ═══

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function pickRandom(arr, n) {
    return shuffle(arr).slice(0, n);
}

function generateFloorData(type, usedData) {
    const chars = ASCENSION_DATA.characters;
    const animes = ASCENSION_DATA.animes;
    
    switch (type) {
        case 'guess': {
            const picked = pickRandom(chars, 5);
            return {
                type: 'guess',
                label: 'Devine le perso',
                characters: picked.map(c => ({ id: c.id, img: c.img, name: c.name, anime: c.anime })),
                totalToGuess: 5,
            };
        }

        case 'target': {
            const pool = pickRandom(chars, 30);
            const targets = pickRandom(pool, 5);
            return {
                type: 'target',
                label: 'Cible',
                characters: pool.map(c => ({ id: c.id, img: c.img, name: c.name, anime: c.anime })),
                targets: targets.map(t => ({ id: t.id, name: t.name })),
                totalTargets: 5,
            };
        }

        case 'intruder': {
            const animesWithChars = {};
            chars.forEach(c => {
                if (!animesWithChars[c.anime]) animesWithChars[c.anime] = [];
                animesWithChars[c.anime].push(c);
            });
            const validAnimes = Object.entries(animesWithChars).filter(([, v]) => v.length >= 8);
            if (validAnimes.length === 0) return generateFloorData('guess', usedData);
            
            const [animeName, animeChars] = validAnimes[Math.floor(Math.random() * validAnimes.length)];
            const otherChars = chars.filter(c => c.anime !== animeName);
            
            const insiders = pickRandom(animeChars, Math.min(27, animeChars.length));
            const intruders = pickRandom(otherChars, 3);
            const allChars = shuffle([...insiders, ...intruders]);
            
            return {
                type: 'intruder',
                label: 'Trouve l\'intrus',
                anime: animeName,
                characters: allChars.map(c => ({ id: c.id, img: c.img, name: c.name, anime: c.anime })),
                intruderIds: intruders.map(c => c.id),
                totalIntruders: 3,
            };
        }

        case 'wordle': {
            const words = ASCENSION_DATA.wordle_words;
            const word = words[Math.floor(Math.random() * words.length)];
            return {
                type: 'wordle',
                label: 'Lettres communes',
                word: word,
                wordLength: word.length,
                maxAttempts: 6,
            };
        }

        case 'silhouette': {
            const picked = pickRandom(chars, 1)[0];
            return {
                type: 'silhouette',
                label: 'Silhouette',
                character: { id: picked.id, img: picked.img, name: picked.name, anime: picked.anime },
            };
        }

        case 'order': {
            const arcAnimes = Object.keys(ASCENSION_DATA.arcs);
            if (arcAnimes.length === 0) return generateFloorData('guess', usedData);
            
            const animeName = arcAnimes[Math.floor(Math.random() * arcAnimes.length)];
            const allArcs = ASCENSION_DATA.arcs[animeName];
            const count = Math.min(5, allArcs.length);
            const picked = pickRandom(allArcs, count);
            const correctOrder = [...picked].sort((a, b) => a.order - b.order);
            
            return {
                type: 'order',
                label: 'Ordre chronologique',
                anime: animeName,
                arcs: shuffle(picked).map(a => ({ name: a.name, order: a.order })),
                correctOrder: correctOrder.map(a => a.name),
            };
        }

        case 'match': {
            const subtype = MATCH_SUBTYPES[Math.floor(Math.random() * MATCH_SUBTYPES.length)];
            return generateMatchData(subtype);
        }

        default:
            return generateFloorData('guess', usedData);
    }
}

function generateMatchData(subtype) {
    const chars = ASCENSION_DATA.characters;
    const charMap = {};
    chars.forEach(c => charMap[c.id] = c);

    switch (subtype) {
        case 'char_anime': {
            const usedAnimes = new Set();
            const picked = [];
            const shuffled = shuffle(chars);
            for (const c of shuffled) {
                if (!usedAnimes.has(c.anime) && picked.length < 4) {
                    picked.push(c);
                    usedAnimes.add(c.anime);
                }
            }
            return {
                type: 'match', subtype: 'char_anime',
                label: 'Relie — Perso → Anime',
                left: picked.map(c => ({ id: c.id, name: c.name, img: c.img })),
                right: shuffle(picked.map(c => ({ id: c.id, value: c.anime }))),
                pairs: picked.map(c => ({ leftId: c.id, rightId: c.id })),
            };
        }

        case 'couples': {
            const couples = ASCENSION_DATA.couples;
            const picked = pickRandom(couples, Math.min(4, couples.length));
            return {
                type: 'match', subtype: 'couples',
                label: 'Relie — Couples',
                left: picked.map(c => ({ id: c.char1, name: charMap[c.char1]?.name || c.char1, img: charMap[c.char1]?.img })),
                right: shuffle(picked.map(c => ({ id: c.char1, value: charMap[c.char2]?.name || c.char2_name || c.char2 }))),
                pairs: picked.map(c => ({ leftId: c.char1, rightId: c.char1 })),
            };
        }

        case 'techniques': {
            const techs = ASCENSION_DATA.techniques;
            const picked = pickRandom(techs, Math.min(4, techs.length));
            return {
                type: 'match', subtype: 'techniques',
                label: 'Relie — Perso → Technique',
                left: picked.map(t => ({ id: t.character, name: charMap[t.character]?.name || t.character, img: charMap[t.character]?.img })),
                right: shuffle(picked.map(t => ({ id: t.character, value: t.technique }))),
                pairs: picked.map(t => ({ leftId: t.character, rightId: t.character })),
            };
        }

        case 'weapons': {
            const weapons = ASCENSION_DATA.weapons;
            const picked = pickRandom(weapons, Math.min(4, weapons.length));
            return {
                type: 'match', subtype: 'weapons',
                label: 'Relie — Perso → Arme',
                left: picked.map(w => ({ id: w.character, name: charMap[w.character]?.name || w.character, img: charMap[w.character]?.img })),
                right: shuffle(picked.map(w => ({ id: w.character, value: w.weapon }))),
                pairs: picked.map(w => ({ leftId: w.character, rightId: w.character })),
            };
        }

        case 'rivals': {
            const rivals = ASCENSION_DATA.rivals;
            const picked = pickRandom(rivals, Math.min(4, rivals.length));
            return {
                type: 'match', subtype: 'rivals',
                label: 'Relie — Rivaux',
                left: picked.map(r => ({ id: r.char1, name: charMap[r.char1]?.name || r.char1, img: charMap[r.char1]?.img })),
                right: shuffle(picked.map(r => ({ id: r.char1, value: charMap[r.char2]?.name || r.char2 }))),
                pairs: picked.map(r => ({ leftId: r.char1, rightId: r.char1 })),
            };
        }

        case 'same_voice': {
            const voiceGroups = ASCENSION_DATA.same_voice;
            if (voiceGroups.length === 0) return generateMatchData('char_anime');
            const picked = pickRandom(voiceGroups, Math.min(4, voiceGroups.length));
            const pairs = [];
            picked.forEach(g => {
                if (g.chars.length >= 2) {
                    const [c1, c2] = pickRandom(g.chars, 2);
                    pairs.push({ char1: c1, char2: c2 });
                }
            });
            if (pairs.length < 3) return generateMatchData('char_anime');
            return {
                type: 'match', subtype: 'same_voice',
                label: 'Relie — Même voix',
                left: pairs.map(p => ({ id: p.char1, name: charMap[p.char1]?.name || p.char1, img: charMap[p.char1]?.img })),
                right: shuffle(pairs.map(p => ({ id: p.char1, value: charMap[p.char2]?.name || p.char2 }))),
                pairs: pairs.map(p => ({ leftId: p.char1, rightId: p.char1 })),
            };
        }

        case 'anime_studio': {
            const animes = ASCENSION_DATA.animes;
            const usedStudios = new Set();
            const picked = [];
            const shuffled = shuffle(animes);
            for (const a of shuffled) {
                if (!usedStudios.has(a.studio) && picked.length < 4) {
                    picked.push(a);
                    usedStudios.add(a.studio);
                }
            }
            if (picked.length < 4) {
                for (const a of shuffled) {
                    if (picked.length < 4 && !picked.find(p => p.name === a.name)) {
                        picked.push(a);
                    }
                }
            }
            return {
                type: 'match', subtype: 'anime_studio',
                label: 'Relie — Anime → Studio',
                left: picked.map(a => ({ id: a.name, name: a.name })),
                right: shuffle(picked.map(a => ({ id: a.name, value: a.studio }))),
                pairs: picked.map(a => ({ leftId: a.name, rightId: a.name })),
            };
        }

        default:
            return generateMatchData('char_anime');
    }
}

// ═══ Game start ═══

function startAscensionGame(gameState, io, options = {}) {
    const ascension = gameState.ascension;
    
    ascension.active = true;
    ascension.floors = options.floors || 15;
    ascension.timer = options.timer || 15;
    ascension.syncEpreuves = options.syncEpreuves !== undefined ? options.syncEpreuves : true;
    ascension.currentFloor = 0;
    ascension.startedAt = Date.now();
    ascension.finishedPlayers = [];
    
    ascension.floorSequence = generateFloorSequence(ascension.floors);
    
    ascension.floorData = [];
    const usedData = {};
    for (let i = 0; i < ascension.floors; i++) {
        ascension.floorData.push(generateFloorData(ascension.floorSequence[i], usedData));
    }
    
    ascension.playerProgress = {};
    for (const [socketId, player] of gameState.players.entries()) {
        ascension.playerProgress[player.twitchId] = {
            floor: 0,
            validated: false,
            username: player.username,
            socketId: socketId,
            colorIndex: player.colorIndex || 0,
        };
        
        if (!ascension.syncEpreuves) {
            ascension.playerProgress[player.twitchId].personalFloorData = [];
            const personalSeq = generateFloorSequence(ascension.floors);
            for (let i = 0; i < ascension.floors; i++) {
                ascension.playerProgress[player.twitchId].personalFloorData.push(
                    generateFloorData(personalSeq[i], {})
                );
            }
        }
    }
    
    const COUNTDOWN_MS = 4000;
    ascension.countdownEndsAt = Date.now() + COUNTDOWN_MS;
    
    io.emit('ascension-game-started', {
        floors: ascension.floors,
        timer: ascension.timer,
        syncEpreuves: ascension.syncEpreuves,
        countdownEndsAt: ascension.countdownEndsAt,
        players: Object.entries(ascension.playerProgress).map(([tid, p]) => ({
            twitchId: tid,
            username: p.username,
            floor: 0,
            colorIndex: p.colorIndex,
        })),
    });
    
    setTimeout(() => {
        if (ascension.active) {
            startAscensionFloor(gameState, io, 0);
        }
    }, COUNTDOWN_MS);
    
    console.log(`🏔️ Ascension démarrée: ${ascension.floors} étages, ${ascension.timer}s, types: ${ascension.floorSequence.join(',')}`);
    
    return { success: true };
}

// ═══ Floor management ═══

function startAscensionFloor(gameState, io, floorIndex) {
    const ascension = gameState.ascension;
    if (!ascension.active || floorIndex >= ascension.floors) return;
    
    ascension.currentFloor = floorIndex;
    
    const floorData = ascension.floorData[floorIndex];
    const clientData = getFloorDataForClient(floorData);
    
    const timerMs = ascension.timer * 1000;
    ascension.floorTimerEndTime = Date.now() + timerMs;
    
    if (ascension.floorTimer) clearTimeout(ascension.floorTimer);
    
    for (const tid in ascension.playerProgress) {
        ascension.playerProgress[tid].validated = false;
    }
    
    io.emit('ascension-floor-start', {
        floor: floorIndex,
        totalFloors: ascension.floors,
        floorData: clientData,
        timerEndTime: ascension.floorTimerEndTime,
        timer: ascension.timer,
        playerProgress: getPlayerProgressForClient(ascension),
    });
    
    if (!ascension.syncEpreuves) {
        for (const [tid, pp] of Object.entries(ascension.playerProgress)) {
            if (pp.personalFloorData && pp.personalFloorData[floorIndex]) {
                const personalClient = getFloorDataForClient(pp.personalFloorData[floorIndex]);
                const sock = io.sockets.sockets.get(pp.socketId);
                if (sock) {
                    sock.emit('ascension-floor-personal', { floor: floorIndex, floorData: personalClient });
                }
            }
        }
    }
    
    ascension.floorTimer = setTimeout(() => {
        endAscensionFloor(gameState, io, floorIndex);
    }, timerMs);
    
    console.log(`🏔️ Étage ${floorIndex + 1}/${ascension.floors}: ${floorData.type} (${floorData.label})`);
}

function getFloorDataForClient(floorData) {
    const data = { ...floorData };
    
    if (data.type === 'wordle') {
        const { word, ...rest } = data;
        return rest;
    }
    if (data.type === 'silhouette') {
        return {
            type: data.type, label: data.label,
            character: { id: data.character.id, img: data.character.img, anime: data.character.anime },
        };
    }
    if (data.type === 'intruder') {
        const { intruderIds, ...rest } = data;
        return rest;
    }
    if (data.type === 'order') {
        const { correctOrder, ...rest } = data;
        return rest;
    }
    if (data.type === 'match') {
        const { pairs, ...rest } = data;
        return rest;
    }
    if (data.type === 'guess') {
        return {
            type: data.type, label: data.label, totalToGuess: data.totalToGuess,
            characters: data.characters.map(c => ({ id: c.id, img: c.img, anime: c.anime })),
        };
    }
    if (data.type === 'target') {
        return {
            type: data.type, label: data.label, totalTargets: data.totalTargets,
            characters: data.characters.map(c => ({ id: c.id, img: c.img, name: c.name, anime: c.anime })),
            currentTarget: data.targets[0],
        };
    }
    return data;
}

function endAscensionFloor(gameState, io, floorIndex) {
    const ascension = gameState.ascension;
    if (!ascension.active) return;
    
    if (ascension.floorTimer) {
        clearTimeout(ascension.floorTimer);
        ascension.floorTimer = null;
    }
    
    const floorData = ascension.floorData[floorIndex];
    
    io.emit('ascension-floor-end', {
        floor: floorIndex,
        answers: getFloorAnswers(floorData),
        playerProgress: getPlayerProgressForClient(ascension),
    });
    
    if (ascension.finishedPlayers.length > 0) {
        endAscensionGame(gameState, io);
        return;
    }
    
    const nextFloor = floorIndex + 1;
    if (nextFloor < ascension.floors) {
        setTimeout(() => {
            if (ascension.active) {
                startAscensionFloor(gameState, io, nextFloor);
            }
        }, 1000);
    } else {
        endAscensionGame(gameState, io);
    }
}

function getFloorAnswers(floorData) {
    switch (floorData.type) {
        case 'wordle': return { word: floorData.word };
        case 'silhouette': return { name: floorData.character.name };
        case 'intruder': return { intruderIds: floorData.intruderIds };
        case 'order': return { correctOrder: floorData.correctOrder };
        case 'match': return { pairs: floorData.pairs };
        case 'guess': return { characters: floorData.characters.map(c => ({ id: c.id, name: c.name })) };
        case 'target': return { targets: floorData.targets };
        default: return {};
    }
}

// ═══ Answer validation ═══

function handleAscensionAnswer(gameState, io, socket, data) {
    const ascension = gameState.ascension;
    if (!ascension.active) return;
    
    const player = gameState.players.get(socket.id);
    if (!player) return;
    
    const pp = ascension.playerProgress[player.twitchId];
    if (!pp || pp.validated) return;
    
    const floorIndex = ascension.currentFloor;
    const floorData = ascension.syncEpreuves 
        ? ascension.floorData[floorIndex]
        : (pp.personalFloorData?.[floorIndex] || ascension.floorData[floorIndex]);
    
    const isCorrect = validateAnswer(floorData, data);
    
    if (isCorrect) {
        pp.validated = true;
        pp.floor++;
        
        console.log(`🏔️ ✅ ${player.username} valide étage ${floorIndex + 1} → étage ${pp.floor}`);
        
        io.emit('ascension-progress', {
            twitchId: player.twitchId,
            username: player.username,
            floor: pp.floor,
            playerProgress: getPlayerProgressForClient(ascension),
        });
        
        if (pp.floor >= ascension.floors) {
            ascension.finishedPlayers.push({
                twitchId: player.twitchId,
                username: player.username,
                rank: ascension.finishedPlayers.length + 1,
                finishedAt: Date.now(),
            });
            endAscensionGame(gameState, io);
        }
        
        socket.emit('ascension-answer-result', { correct: true, floor: pp.floor });
    } else {
        socket.emit('ascension-answer-result', { correct: false });
    }
}

function validateAnswer(floorData, answer) {
    switch (floorData.type) {
        case 'guess': {
            if (!answer.guesses) return false;
            const correct = floorData.characters;
            let allCorrect = true;
            for (const guess of answer.guesses) {
                const char = correct.find(c => c.id === guess.id);
                if (!char) { allCorrect = false; continue; }
                if (normalize(guess.name) !== normalize(char.name)) allCorrect = false;
            }
            return allCorrect && answer.guesses.length === floorData.totalToGuess;
        }

        case 'target': {
            if (!answer.clickedIds) return false;
            const targetIds = floorData.targets.map(t => t.id);
            return targetIds.every(tid => answer.clickedIds.includes(tid));
        }

        case 'intruder': {
            if (!answer.selectedIds || answer.selectedIds.length !== 3) return false;
            const intruderSet = new Set(floorData.intruderIds);
            return answer.selectedIds.every(id => intruderSet.has(id));
        }

        case 'wordle': {
            return normalize(answer.word) === normalize(floorData.word);
        }

        case 'silhouette': {
            return normalize(answer.name) === normalize(floorData.character.name);
        }

        case 'order': {
            if (!answer.order) return false;
            return JSON.stringify(answer.order) === JSON.stringify(floorData.correctOrder);
        }

        case 'match': {
            if (!answer.matches) return false;
            const correctPairs = floorData.pairs;
            if (answer.matches.length !== correctPairs.length) return false;
            return correctPairs.every(cp => 
                answer.matches.some(m => m.leftId === cp.leftId && m.rightId === cp.rightId)
            );
        }

        default:
            return false;
    }
}

function normalize(str) {
    if (!str) return '';
    return str.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

// ═══ Victory ═══

function endAscensionGame(gameState, io) {
    const ascension = gameState.ascension;
    if (!ascension.active) return;
    
    if (ascension.floorTimer) {
        clearTimeout(ascension.floorTimer);
        ascension.floorTimer = null;
    }
    
    const podium = Object.entries(ascension.playerProgress)
        .map(([tid, pp]) => {
            const finished = ascension.finishedPlayers.find(f => f.twitchId === tid);
            return {
                twitchId: tid, username: pp.username, floor: pp.floor,
                rank: finished ? finished.rank : null,
                finishedAt: finished ? finished.finishedAt : null,
            };
        })
        .sort((a, b) => {
            if (a.rank && b.rank) return a.rank - b.rank;
            if (a.rank) return -1;
            if (b.rank) return 1;
            return b.floor - a.floor;
        });
    
    let rank = ascension.finishedPlayers.length + 1;
    podium.forEach(p => { if (!p.rank) p.rank = rank++; });
    
    io.emit('ascension-game-end', { podium, winner: podium[0] || null });
    
    ascension.active = false;
    gameState.inProgress = false;
    
    console.log(`🏔️ Ascension terminée! Podium:`, podium.map(p => `${p.rank}. ${p.username} (étage ${p.floor})`).join(', '));
}

// ═══ Helpers ═══

function getPlayerProgressForClient(ascension) {
    return Object.entries(ascension.playerProgress).map(([tid, pp]) => ({
        twitchId: tid, username: pp.username, floor: pp.floor, colorIndex: pp.colorIndex,
    }));
}

function getAscensionStateForClient(gameState) {
    const ascension = gameState.ascension;
    if (!ascension || !ascension.active) return null;
    
    return {
        active: true,
        floors: ascension.floors,
        timer: ascension.timer,
        currentFloor: ascension.currentFloor,
        countdownEndsAt: ascension.countdownEndsAt,
        floorTimerEndTime: ascension.floorTimerEndTime,
        floorData: ascension.floorData[ascension.currentFloor] 
            ? getFloorDataForClient(ascension.floorData[ascension.currentFloor]) 
            : null,
        playerProgress: getPlayerProgressForClient(ascension),
    };
}

function resetAscensionState(gameState) {
    if (gameState.ascension?.floorTimer) {
        clearTimeout(gameState.ascension.floorTimer);
    }
    gameState.ascension = createAscensionState();
}

// ═══ Socket handler registration ═══

function registerAscensionSocketHandlers(io, socket, gameState) {
    socket.on('ascension-answer', (data) => {
        handleAscensionAnswer(gameState, io, socket, data);
    });
    
    socket.on('ascension-reconnect', (data) => {
        const ascension = gameState.ascension;
        
        // Remap socket ID for this player
        if (data?.twitchId && ascension?.playerProgress) {
            const pp = ascension.playerProgress[data.twitchId];
            if (pp) {
                pp.socketId = socket.id;
                console.log(`🏔️ Reconnect: ${pp.username} remappé → ${socket.id}`);
            }
        }
        
        const state = getAscensionStateForClient(gameState);
        if (state) {
            socket.emit('ascension-state', state);
        }
    });
}

module.exports = {
    createAscensionState,
    startAscensionGame,
    resetAscensionState,
    registerAscensionSocketHandlers,
    getAscensionStateForClient,
};