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
        timer: 30,
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
        // 🧪 DEBUG: Forcer le 1er étage à être 'intruder' pour tester
        if (i === 0) {
            seq.push('intruder');
            continue;
        }
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

// 🆕 Slugifier le nom d'un arc pour générer un id stable + le filename d'image
// "Examen Chunin" → "examen_chunin" → image "arc_examen_chunin.png"
function slugifyArc(name) {
    return String(name)
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // retire les accents
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
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
                characters: picked.map(c => ({
                    id: c.id,
                    img: c.img,
                    name: c.name,
                    anime: c.anime,
                    aliases: c.aliases || [],  // 🆕 Noms alternatifs acceptés
                })),
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
            // 🆕 2 variantes : 'not_in' (trouver les intrus), 'in' (trouver les persos de tel anime).
            //    Grille 6x4 = 24 cases.
            const animesWithChars = {};
            chars.forEach(c => {
                if (!animesWithChars[c.anime]) animesWithChars[c.anime] = [];
                animesWithChars[c.anime].push(c);
            });
            
            const TOTAL_CARDS = 24;
            // Pool de N possibles selon la variante
            const N_OPTIONS = [2, 3, 5, 7];
            
            // Choix de variante aléatoire (équiprobable)
            const variants = ['not_in', 'in'];
            const variant = variants[Math.floor(Math.random() * variants.length)];
            
            // Variantes 'not_in' / 'in' : on a besoin d'un anime cible avec assez de persos
            // N = nombre à trouver. On veut que (TOTAL_CARDS - N) <= persos dispo de l'anime cible
            // (pour 'not_in') ou N <= persos dispo (pour 'in').
            const N = N_OPTIONS[Math.floor(Math.random() * N_OPTIONS.length)];
            
            let validAnimes;
            if (variant === 'not_in') {
                // Il faut au moins (TOTAL_CARDS - N) persos de l'anime cible
                // Si pas assez d'animes garnis, on adapte le N à la baisse.
                validAnimes = Object.entries(animesWithChars).filter(([, v]) => v.length >= TOTAL_CARDS - N);
            } else { // 'in'
                // Il faut au moins N persos de l'anime cible (et 30-N persos d'autres animes au total)
                validAnimes = Object.entries(animesWithChars).filter(([, v]) => v.length >= N);
            }
            
            // Si aucun anime ne convient, fallback en réduisant N
            if (validAnimes.length === 0) {
                // Fallback : on prend l'anime le plus garni et on adapte N en conséquence
                const sortedAnimes = Object.entries(animesWithChars).sort((a, b) => b[1].length - a[1].length);
                if (sortedAnimes.length === 0) return generateFloorData('guess', usedData);
                const [biggestAnime, biggestChars] = sortedAnimes[0];
                
                if (variant === 'not_in') {
                    // 🆕 Stratégie de remplissage propre :
                    //   - On prend tous les persos de l'anime cible (insiders)
                    //   - On veut N intrus (vrais "non de cet anime" = targets à trouver)
                    //   - On complète avec des "non-cibles fillers" si insiders + N < TOTAL_CARDS
                    // 
                    // ⚠️ ATTENTION : tous les persos non-cibles affichés sont en réalité des "intrus"
                    // (ils ne sont pas de l'anime cible). Donc si on a 16 OP + 8 autres = 24 cartes,
                    // on a en fait 8 intrus visibles, pas N=7. La consigne "trouvez les N" devient fausse.
                    // 
                    // Pour rester cohérent avec la consigne : on FORCE intrudersN à être le total
                    // de persos non-cibles affichés (= nombre de targets réels).
                    const insiders = biggestChars;
                    const intrudersN = TOTAL_CARDS - insiders.length;  // Tous les non-cibles SONT des intrus
                    const otherChars = chars.filter(c => c.anime !== biggestAnime);
                    const intruders = pickRandom(otherChars, intrudersN);
                    const allChars = shuffle([...insiders, ...intruders]);
                    
                    return {
                        type: 'intruder',
                        label: 'Trouve les intrus',
                        variant: 'not_in',
                        targetAnime: biggestAnime,
                        instruction: `${intrudersN} intrus qui ne sont pas de ${biggestAnime}`,
                        characters: allChars.map(c => ({ id: c.id, img: c.img, name: c.name, anime: c.anime })),
                        targetIds: intruders.map(c => c.id),
                        totalTargets: intrudersN,
                    };
                } else {
                    // 'in' : on prend N persos de l'anime + le reste d'autres
                    const adjustedN = Math.min(N, biggestChars.length);
                    const insiders = pickRandom(biggestChars, adjustedN);
                    const otherChars = chars.filter(c => c.anime !== biggestAnime);
                    const others = pickRandom(otherChars, TOTAL_CARDS - adjustedN);
                    const allChars = shuffle([...insiders, ...others]);
                    
                    return {
                        type: 'intruder',
                        label: 'Search',
                        variant: 'in',
                        targetAnime: biggestAnime,
                        instruction: `${adjustedN} personnages de ${biggestAnime}`,
                        characters: allChars.map(c => ({ id: c.id, img: c.img, name: c.name, anime: c.anime })),
                        targetIds: insiders.map(c => c.id),
                        totalTargets: adjustedN,
                    };
                }
            }
            
            const [animeName, animeChars] = validAnimes[Math.floor(Math.random() * validAnimes.length)];
            const otherChars = chars.filter(c => c.anime !== animeName);
            
            if (variant === 'not_in') {
                // (TOTAL_CARDS - N) persos de l'anime + N intrus
                const insiders = pickRandom(animeChars, TOTAL_CARDS - N);
                const intruders = pickRandom(otherChars, N);
                const allChars = shuffle([...insiders, ...intruders]);
                
                return {
                    type: 'intruder',
                    label: 'Trouve les intrus',
                    variant: 'not_in',
                    targetAnime: animeName,
                    instruction: `${N} intrus qui ne sont pas de ${animeName}`,
                    characters: allChars.map(c => ({ id: c.id, img: c.img, name: c.name, anime: c.anime })),
                    targetIds: intruders.map(c => c.id),
                    totalTargets: N,
                };
            } else {
                // 'in' : N persos de l'anime + (TOTAL_CARDS - N) d'autres animes
                const insiders = pickRandom(animeChars, N);
                const others = pickRandom(otherChars, TOTAL_CARDS - N);
                const allChars = shuffle([...insiders, ...others]);
                
                return {
                    type: 'intruder',
                    label: 'Search',
                    variant: 'in',
                    targetAnime: animeName,
                    instruction: `${N} personnages de ${animeName}`,
                    characters: allChars.map(c => ({ id: c.id, img: c.img, name: c.name, anime: c.anime })),
                    targetIds: insiders.map(c => c.id),
                    totalTargets: N,
                };
            }
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
            // Filtrer pour ne garder que les animes ayant ≥ 5 arcs
            const validAnimes = arcAnimes.filter(a => ASCENSION_DATA.arcs[a].length >= 5);
            if (validAnimes.length === 0) return generateFloorData('guess', usedData);
            
            const animeName = validAnimes[Math.floor(Math.random() * validAnimes.length)];
            const allArcs = ASCENSION_DATA.arcs[animeName];
            
            // 🆕 Prendre 5 arcs CONSÉCUTIFS (cohérence chronologique). Si l'anime en a + de 5,
            // on choisit une fenêtre aléatoire ; sinon on prend les 5 disponibles.
            const total = allArcs.length;
            const startIdx = total > 5 ? Math.floor(Math.random() * (total - 4)) : 0;
            const slice = allArcs.slice(startIdx, startIdx + 5);
            
            // Enrichir chaque arc avec id (slug) + img (convention "arc_<slug>.png")
            const enriched = slice.map(a => ({
                id: slugifyArc(a.name),
                name: a.name,
                img: 'arc_' + slugifyArc(a.name) + '.png',
                order: a.order,  // côté serveur seulement, retiré dans getFloorDataForClient
            }));
            
            // Ordre correct : trié par order (= ordre chronologique)
            const correctOrder = [...enriched].sort((a, b) => a.order - b.order).map(a => a.id);
            
            // 🆕 Shuffle avec garantie que l'ordre initial soit DIFFÉRENT du correctOrder
            //    (sinon le joueur n'a rien à faire, le serveur valide direct au 1er check).
            //    Fisher-Yates peut par hasard ressortir l'ordre identique → on re-shuffle si besoin.
            let shuffled;
            let attempts = 0;
            do {
                shuffled = shuffle([...enriched]);
                attempts++;
            } while (
                attempts < 10 &&
                shuffled.map(a => a.id).every((id, i) => id === correctOrder[i])
            );
            
            return {
                type: 'order',
                label: 'Ordre chronologique',
                anime: animeName,
                arcs: shuffled,
                correctOrder,             // côté serveur, anti-triche
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
    ascension.timer = options.timer || 30;
    ascension.syncEpreuves = options.syncEpreuves !== undefined ? options.syncEpreuves : true;
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
            // 🆕 Champs personnels (mode race indépendant par joueur)
            floorTimerEndTime: null,
            floorTimer: null,
            guessProgress: {},
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
            // 🆕 Démarrer floor 0 indépendamment pour chaque joueur (mode race avec timers persos)
            for (const tid in ascension.playerProgress) {
                startPlayerFloor(gameState, io, tid, 0);
            }
        }
    }, COUNTDOWN_MS);
    
    console.log(`🏔️ Ascension démarrée: ${ascension.floors} étages, ${ascension.timer}s, types: ${ascension.floorSequence.join(',')}`);
    
    return { success: true };
}

// ═══ Player Floor management (mode race indépendant) ═══

// 🆕 Démarre un étage pour UN joueur précis avec son timer perso
function startPlayerFloor(gameState, io, twitchId, floorIndex) {
    const ascension = gameState.ascension;
    if (!ascension.active) return;
    
    const pp = ascension.playerProgress[twitchId];
    if (!pp) return;
    
    if (floorIndex >= ascension.floors) {
        // Joueur a complété tous les étages
        finalizePlayerFinish(gameState, io, twitchId);
        return;
    }
    
    pp.floor = floorIndex;
    pp.validated = false;
    if (!pp.guessProgress) pp.guessProgress = {};
    if (!pp.guessProgress[floorIndex]) pp.guessProgress[floorIndex] = new Set();
    // 🆕 Reset le tracking Intruder pour ce nouvel étage
    pp.intruderFound = null;
    
    if (pp.floorTimer) {
        clearTimeout(pp.floorTimer);
        pp.floorTimer = null;
    }
    
    const floorData = ascension.syncEpreuves
        ? ascension.floorData[floorIndex]
        : (pp.personalFloorData?.[floorIndex] || ascension.floorData[floorIndex]);
    
    if (!floorData) {
        console.error(`🏔️ Pas de floor data pour étage ${floorIndex} (joueur ${pp.username})`);
        return;
    }
    
    const timerMs = ascension.timer * 1000;
    pp.floorTimerEndTime = Date.now() + timerMs;
    pp.floorTimer = setTimeout(() => {
        // Timer expiré sans validation → on avance quand même (échec)
        if (!pp.validated && pp.floor === floorIndex) {
            console.log(`🏔️ ⏰ ${pp.username} timer expiré étage ${floorIndex + 1}, passage forcé`);
            advancePlayerToNextFloor(gameState, io, twitchId, false);
        }
    }, timerMs);
    
    const sock = io.sockets.sockets.get(pp.socketId);
    const clientData = getFloorDataForClient(floorData);
    
    const eventData = {
        floor: floorIndex,
        totalFloors: ascension.floors,
        floorData: clientData,
        timerEndTime: pp.floorTimerEndTime,
        timer: ascension.timer,
        playerProgress: getPlayerProgressForClient(ascension),
    };
    
    if (sock) {
        sock.emit('ascension-floor-start', eventData);
    }
    
    // Broadcast la progression à tout le monde (pour la tour des joueurs)
    io.emit('ascension-progress', {
        twitchId: twitchId,
        username: pp.username,
        floor: floorIndex,
        playerProgress: getPlayerProgressForClient(ascension),
    });
    
    console.log(`🏔️ ${pp.username} → étage ${floorIndex + 1}/${ascension.floors}: ${floorData.type}`);
}

// 🆕 Avance le joueur au floor suivant (avec délai pour l'animation côté client)
function advancePlayerToNextFloor(gameState, io, twitchId, success) {
    const ascension = gameState.ascension;
    if (!ascension.active) return;
    
    const pp = ascension.playerProgress[twitchId];
    if (!pp) return;
    
    if (pp.floorTimer) {
        clearTimeout(pp.floorTimer);
        pp.floorTimer = null;
    }
    
    if (success) pp.validated = true;
    
    const nextFloor = pp.floor + 1;
    
    if (nextFloor >= ascension.floors) {
        pp.floor = nextFloor;
        finalizePlayerFinish(gameState, io, twitchId);
        return;
    }
    
    // Délai pour laisser jouer l'animation du stamp PERFECT côté client (anim ~700ms)
    // En cas d'échec (timer expiré), on enchaîne plus vite (300ms)
    const delay = success ? 700 : 300;
    setTimeout(() => {
        if (ascension.active && ascension.playerProgress[twitchId]) {
            startPlayerFloor(gameState, io, twitchId, nextFloor);
        }
    }, delay);
}

// 🆕 Marque la fin du parcours du joueur (atteint l'étage final ou abandonné)
function finalizePlayerFinish(gameState, io, twitchId) {
    const ascension = gameState.ascension;
    const pp = ascension.playerProgress[twitchId];
    if (!pp) return;
    
    if (pp.floorTimer) {
        clearTimeout(pp.floorTimer);
        pp.floorTimer = null;
    }
    
    if (!ascension.finishedPlayers.find(f => f.twitchId === twitchId)) {
        ascension.finishedPlayers.push({
            twitchId: twitchId,
            username: pp.username,
            rank: ascension.finishedPlayers.length + 1,
            finishedAt: Date.now(),
        });
        console.log(`🏔️ 🏁 ${pp.username} a fini la partie (rang ${ascension.finishedPlayers.length})`);
    }
    
    io.emit('ascension-progress', {
        twitchId: twitchId,
        username: pp.username,
        floor: pp.floor,
        playerProgress: getPlayerProgressForClient(ascension),
    });
    
    // Vérifier si tous les joueurs ont fini → fin de la partie
    const allFinished = Object.keys(ascension.playerProgress).every(tid => {
        return ascension.playerProgress[tid].floor >= ascension.floors;
    });
    
    if (allFinished) {
        endAscensionGame(gameState, io);
    }
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
        // 🆕 Cacher targetIds (anti-triche). Pour 'find_one' on garde targetCharacter (le nom à trouver).
        const { targetIds, ...rest } = data;
        return rest;
    }
    if (data.type === 'order') {
        // 🆕 Anti-triche : retirer correctOrder ET le champ "order" individuel de chaque arc
        return {
            type: data.type,
            label: data.label,
            anime: data.anime,
            arcs: data.arcs.map(a => ({ id: a.id, name: a.name, img: a.img })),
        };
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

function getFloorAnswers(floorData) {
    switch (floorData.type) {
        case 'wordle': return { word: floorData.word };
        case 'silhouette': return { name: floorData.character.name };
        case 'intruder': return { targetIds: floorData.targetIds };
        case 'order': return { correctOrder: floorData.correctOrder };
        case 'match': return { pairs: floorData.pairs };
        case 'guess': return { characters: floorData.characters.map(c => ({ id: c.id, name: c.name })) };
        case 'target': return { targets: floorData.targets };
        default: return {};
    }
}

// ═══ Answer validation ═══

// 🆕 Résout le `player` à partir du socket. Essai 1 : Map principale `gameState.players` (cas normal).
//    Essai 2 (fallback après refresh): recherche dans `playerProgress` un joueur dont le socketId
//    a été remappé via 'ascension-reconnect'. Sans ça, après refresh côté admin/joueur,
//    handleAscensionCheck* échouait silencieusement car `players.get(socket.id)` retournait undefined.
function resolvePlayerFromSocket(gameState, socket) {
    let player = gameState.players.get(socket.id);
    if (player) return player;
    
    // Fallback : chercher via le mapping playerProgress (mis à jour au reconnect)
    const ascension = gameState.ascension;
    if (!ascension?.playerProgress) return null;
    
    for (const [twitchId, pp] of Object.entries(ascension.playerProgress)) {
        if (pp?.socketId === socket.id) {
            // Reconstruire un objet player minimal (juste twitchId + username pour les usages)
            return { twitchId, username: pp.username };
        }
    }
    return null;
}

function handleAscensionAnswer(gameState, io, socket, data) {
    const ascension = gameState.ascension;
    if (!ascension.active) return;
    
    const player = resolvePlayerFromSocket(gameState, socket);
    if (!player) return;
    
    const pp = ascension.playerProgress[player.twitchId];
    if (!pp || pp.validated) return;
    
    // 🆕 Utiliser le floor PERSONNEL du joueur (pas ascension.currentFloor qui n'existe plus)
    const floorIndex = pp.floor;
    const floorData = ascension.syncEpreuves 
        ? ascension.floorData[floorIndex]
        : (pp.personalFloorData?.[floorIndex] || ascension.floorData[floorIndex]);
    
    if (!floorData) return;
    
    const isCorrect = validateAnswer(floorData, data);
    
    if (isCorrect) {
        console.log(`🏔️ ✅ ${player.username} valide étage ${floorIndex + 1}`);
        socket.emit('ascension-answer-result', { correct: true, floor: pp.floor + 1 });
        // 🆕 Avance au floor suivant après délai pour l'animation côté client
        advancePlayerToNextFloor(gameState, io, player.twitchId, true);
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
                if (!matchesCharacterName(char, guess.name)) allCorrect = false;
            }
            return allCorrect && answer.guesses.length === floorData.totalToGuess;
        }

        case 'target': {
            if (!answer.clickedIds) return false;
            const targetIds = floorData.targets.map(t => t.id);
            return targetIds.every(tid => answer.clickedIds.includes(tid));
        }

        case 'intruder': {
            if (!answer.selectedIds || answer.selectedIds.length !== floorData.totalTargets) return false;
            const targetSet = new Set(floorData.targetIds);
            return answer.selectedIds.every(id => targetSet.has(id));
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

// 🆕 Vérifie si `guess` correspond au nom du personnage (name + aliases)
function matchesCharacterName(character, guess) {
    if (!character || !guess) return false;
    const normalizedGuess = normalize(guess);
    if (!normalizedGuess) return false;
    if (normalize(character.name) === normalizedGuess) return true;
    if (Array.isArray(character.aliases)) {
        for (const alias of character.aliases) {
            if (normalize(alias) === normalizedGuess) return true;
        }
    }
    return false;
}

// ═══ Victory ═══

function endAscensionGame(gameState, io) {
    const ascension = gameState.ascension;
    if (!ascension.active) return;
    
    // 🆕 Cleanup tous les timers personnels
    for (const tid in ascension.playerProgress) {
        const pp = ascension.playerProgress[tid];
        if (pp.floorTimer) {
            clearTimeout(pp.floorTimer);
            pp.floorTimer = null;
        }
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

function getAscensionStateForClient(gameState, twitchId) {
    const ascension = gameState.ascension;
    if (!ascension || !ascension.active) return null;
    
    // 🆕 État personnalisé par joueur (mode race indépendant)
    const pp = twitchId ? ascension.playerProgress[twitchId] : null;
    
    let currentFloor = 0;
    let floorTimerEndTime = null;
    let floorData = null;
    let myValidatedGuesses = [];
    
    if (pp) {
        currentFloor = pp.floor;
        floorTimerEndTime = pp.floorTimerEndTime;
        const fd = ascension.syncEpreuves
            ? ascension.floorData[currentFloor]
            : (pp.personalFloorData?.[currentFloor] || ascension.floorData[currentFloor]);
        floorData = fd ? getFloorDataForClient(fd) : null;
        if (pp.guessProgress?.[currentFloor]) {
            myValidatedGuesses = Array.from(pp.guessProgress[currentFloor]);
        }
    } else {
        // Admin spectateur sans pp : retour basique sans état perso
        floorData = ascension.floorData[0] ? getFloorDataForClient(ascension.floorData[0]) : null;
    }
    
    return {
        active: true,
        floors: ascension.floors,
        timer: ascension.timer,
        currentFloor: currentFloor,
        countdownEndsAt: ascension.countdownEndsAt,
        floorTimerEndTime: floorTimerEndTime,
        floorData: floorData,
        playerProgress: getPlayerProgressForClient(ascension),
        myValidatedGuesses: myValidatedGuesses,
    };
}

function resetAscensionState(gameState) {
    // Cleanup tous les timers personnels
    if (gameState.ascension?.playerProgress) {
        for (const tid in gameState.ascension.playerProgress) {
            const pp = gameState.ascension.playerProgress[tid];
            if (pp.floorTimer) clearTimeout(pp.floorTimer);
        }
    }
    gameState.ascension = createAscensionState();
}

// ═══ Socket handler registration ═══

function registerAscensionSocketHandlers(io, socket, gameState) {
    socket.on('ascension-answer', (data) => {
        handleAscensionAnswer(gameState, io, socket, data);
    });
    
    // 🆕 Validation incrémentale d'une seule guess (mini-jeu Guess)
    // Le client envoie {characterId, name} — le serveur répond {correct, characterId}
    socket.on('ascension-check-guess', (data) => {
        handleAscensionCheckGuess(gameState, io, socket, data);
    });
    
    // 🆕 Validation continue de l'ordre des arcs (mini-jeu Order)
    // Le client envoie {order: [arcId1, arcId2, ...]} après chaque drop
    // Le serveur ne répond QUE si l'ordre est correct → avance auto à l'étage suivant
    socket.on('ascension-check-order', (data) => {
        handleAscensionCheckOrder(gameState, io, socket, data);
    });
    
    // 🆕 Validation incrémentale d'un clic sur une carte (mini-jeu Intruder)
    // Le client envoie {characterId} à chaque clic. Le serveur répond:
    //   {correct: bool, characterId, foundCount, totalTargets}
    // Quand foundCount === totalTargets, l'étage est validé et on avance.
    socket.on('ascension-check-intruder', (data) => {
        handleAscensionCheckIntruder(gameState, io, socket, data);
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
        
        // 🆕 Retourner l'état perso du joueur (son floor, timer, guesses validées)
        const state = getAscensionStateForClient(gameState, data?.twitchId);
        if (state) {
            socket.emit('ascension-state', state);
        }
    });
}

// 🆕 Validation incrémentale d'une seule guess pour le mini-jeu Guess
function handleAscensionCheckGuess(gameState, io, socket, data) {
    const ascension = gameState.ascension;
    if (!ascension.active) return;
    
    const player = resolvePlayerFromSocket(gameState, socket);
    if (!player) return;
    
    const pp = ascension.playerProgress[player.twitchId];
    if (!pp || pp.validated) return;
    
    // 🆕 Utiliser le floor PERSONNEL du joueur (mode race indépendant)
    const floorIndex = pp.floor;
    const floorData = ascension.syncEpreuves
        ? ascension.floorData[floorIndex]
        : (pp.personalFloorData?.[floorIndex] || ascension.floorData[floorIndex]);
    
    if (!floorData || floorData.type !== 'guess') return;
    if (!data || !data.characterId || typeof data.name !== 'string') return;
    
    const character = floorData.characters.find(c => c.id === data.characterId);
    if (!character) {
        socket.emit('ascension-guess-result', { characterId: data.characterId, correct: false, source: data.source || null });
        return;
    }
    
    const isCorrect = matchesCharacterName(character, data.name);
    socket.emit('ascension-guess-result', { characterId: data.characterId, correct: isCorrect, source: data.source || null });
    
    // Track les guesses validées du joueur pour cet étage
    if (!pp.guessProgress) pp.guessProgress = {};
    if (!pp.guessProgress[floorIndex]) pp.guessProgress[floorIndex] = new Set();
    
    if (isCorrect) {
        pp.guessProgress[floorIndex].add(data.characterId);
        
        // Si toutes les guesses sont correctes → valider l'étage et avancer au suivant
        if (pp.guessProgress[floorIndex].size >= floorData.totalToGuess) {
            console.log(`🏔️ ✅ ${player.username} valide étage Guess ${floorIndex + 1}`);
            socket.emit('ascension-answer-result', { correct: true, floor: pp.floor + 1 });
            // 🆕 Avance immédiatement au floor suivant (avec délai pour l'animation du stamp PERFECT)
            advancePlayerToNextFloor(gameState, io, player.twitchId, true);
        }
    }
}

// 🆕 Validation de l'ordre proposé pour le mini-jeu Order
// Le client envoie {order: [arcId1, arcId2, ...]} à chaque drop.
// Le serveur ne répond QUE si l'ordre est correct (sinon silence — pas de feedback intermédiaire).
function handleAscensionCheckOrder(gameState, io, socket, data) {
    const ascension = gameState.ascension;
    if (!ascension.active) return;
    
    const player = resolvePlayerFromSocket(gameState, socket);
    if (!player) return;
    
    const pp = ascension.playerProgress[player.twitchId];
    if (!pp || pp.validated) return;
    
    const floorIndex = pp.floor;
    const floorData = ascension.syncEpreuves
        ? ascension.floorData[floorIndex]
        : (pp.personalFloorData?.[floorIndex] || ascension.floorData[floorIndex]);
    
    if (!floorData || floorData.type !== 'order') return;
    if (!data || !Array.isArray(data.order)) return;
    
    const proposed = data.order;
    const correct = floorData.correctOrder;
    
    if (proposed.length !== correct.length) return;
    
    const isCorrect = proposed.every((id, i) => id === correct[i]);
    
    if (isCorrect) {
        console.log(`🏔️ ✅ ${player.username} valide étage Order ${floorIndex + 1} (${floorData.anime})`);
        socket.emit('ascension-order-result', { correct: true });
        socket.emit('ascension-answer-result', { correct: true, floor: pp.floor + 1 });
        advancePlayerToNextFloor(gameState, io, player.twitchId, true);
    }
    // Si pas correct → on ne répond rien (le client continue à drag)
}

// 🆕 Validation incrémentale d'un clic sur une carte du mini-jeu Intruder
// Le client envoie {characterId} à chaque clic.
// Le serveur tracke la progression dans pp.intruderFound (Set d'ids déjà trouvés)
// et répond {correct, characterId, foundCount, totalTargets}.
// Quand foundCount === totalTargets → étage validé, on avance.
function handleAscensionCheckIntruder(gameState, io, socket, data) {
    const ascension = gameState.ascension;
    if (!ascension.active) return;
    
    const player = resolvePlayerFromSocket(gameState, socket);
    if (!player) return;
    
    const pp = ascension.playerProgress[player.twitchId];
    if (!pp || pp.validated) return;
    
    const floorIndex = pp.floor;
    const floorData = ascension.syncEpreuves
        ? ascension.floorData[floorIndex]
        : (pp.personalFloorData?.[floorIndex] || ascension.floorData[floorIndex]);
    
    if (!floorData || floorData.type !== 'intruder') return;
    if (!data || !data.characterId) return;
    
    const characterId = data.characterId;
    const targetSet = new Set(floorData.targetIds);
    const isCorrect = targetSet.has(characterId);
    
    // Init le tracking pour ce joueur sur cet étage si pas déjà fait
    if (!pp.intruderFound) pp.intruderFound = new Set();
    
    // Si déjà trouvé, on ignore (mais on confirme au client comme déjà correct)
    if (pp.intruderFound.has(characterId)) {
        socket.emit('ascension-intruder-result', {
            correct: true,
            characterId,
            foundCount: pp.intruderFound.size,
            totalTargets: floorData.totalTargets,
            alreadyFound: true,
        });
        return;
    }
    
    if (isCorrect) {
        pp.intruderFound.add(characterId);
        const foundCount = pp.intruderFound.size;
        const totalTargets = floorData.totalTargets;
        
        socket.emit('ascension-intruder-result', {
            correct: true,
            characterId,
            foundCount,
            totalTargets,
        });
        
        // Tous les targets trouvés → valide l'étage et avance
        if (foundCount === totalTargets) {
            console.log(`🏔️ ✅ ${player.username} valide étage Intruder ${floorIndex + 1} (variant: ${floorData.variant})`);
            socket.emit('ascension-answer-result', { correct: true, floor: pp.floor + 1 });
            // Reset du tracking pour le prochain étage
            pp.intruderFound = null;
            advancePlayerToNextFloor(gameState, io, player.twitchId, true);
        }
    } else {
        // Mauvaise carte : pas de pénalité, on signale juste l'erreur
        socket.emit('ascension-intruder-result', {
            correct: false,
            characterId,
            foundCount: pp.intruderFound.size,
            totalTargets: floorData.totalTargets,
        });
    }
}

module.exports = {
    createAscensionState,
    startAscensionGame,
    resetAscensionState,
    registerAscensionSocketHandlers,
    getAscensionStateForClient,
};