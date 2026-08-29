// ═══════════════════════════════════════════
// 🏔️ ASCENSION — Server Logic
// ═══════════════════════════════════════════

const ASCENSION_DATA = require('./ascensiondata.json');

const GAME_TYPES = [
    'guess',      // Devine le perso (5 images, tape les noms)
    'target',     // Cible (30 persos, 5 consignes "clique sur X")
    'intruder',   // Intrus (30 persos, trouve les 3 pas du bon anime)
    'wordle',     // Lettres communes (style Wordle)
    'order',      // Classer des arcs par ordre
    'match',      // Relie (perso→anime, couples, techniques, armes, rivaux, voix, studio)
    'scramble',   // Anagramme : lettres mélangées du nom d'un perso, à remettre dans l'ordre
];

const MATCH_SUBTYPES = [
    'char_anime',   // Perso → anime
    'couples',      // Couples
    'techniques',   // Perso → technique
    'weapons',      // Perso → arme
    'rivals',       // Rivaux
    'same_voice',   // Même voix
    'anime_studio', // Anime → studio
    'anime_year',   // Anime → année de sortie (1ère diffusion)
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
    // 🆕 Approche "bag" : on pioche dans un sac contenant 1 exemplaire de chaque type ;
    //    quand le sac est vide, on le remet à plein → on ne répète JAMAIS un type tant
    //    que tous les autres ne sont pas passés au moins 1x dans le cycle courant.
    //    Bonus : on évite aussi le back-to-back entre 2 cycles (le 1er d'un nouveau cycle
    //    ne peut pas être identique au dernier de l'ancien).
    const seq = [];
    let bag = [];
    for (let i = 0; i < numFloors; i++) {
        if (bag.length === 0) {
            // Cycle terminé : on refait un sac plein, mais on retire le dernier type
            //    pour empêcher le back-to-back (sera réinjecté juste après pioche).
            bag = GAME_TYPES.slice();
            const last = seq[seq.length - 1];
            if (last) {
                const idx = bag.indexOf(last);
                if (idx >= 0) {
                    bag.splice(idx, 1);
                    // Mémorise pour réinjecter après le 1er pick du nouveau cycle
                    bag._reinjectAfterPick = last;
                }
            }
        }
        const pickIdx = Math.floor(Math.random() * bag.length);
        const pick = bag.splice(pickIdx, 1)[0];
        seq.push(pick);
        if (bag._reinjectAfterPick) {
            bag.push(bag._reinjectAfterPick);
            delete bag._reinjectAfterPick;
        }
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
    // 🆕 Pour les jeux où le perso est la cible (guess/intruder/target/silhouette/char_anime),
    //    on exclut les persos marqués `match_only: true` (ils n'existent que pour servir de
    //    cible dans couples/rivals/same_voice/techniques/weapons côté Liaison).
    const chars = (ASCENSION_DATA.characters || []).filter(c => !c.match_only);
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
            // Grille 6x4 = 24 cards. 5 targets à cliquer d'affilée.
            const pool = pickRandom(chars, 24);
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
            // 🆕 Map nom UPPER → anime pour retrouver l'anime d'un perso wordle_words
            const charAnimeMap = {};
            (ASCENSION_DATA.characters || []).forEach(c => {
                if (c && c.name) charAnimeMap[c.name.toUpperCase()] = c.anime;
            });

            // Pool : persos (wordle_words, single-word) + animes (single OU multi-mots, lettres+espaces only)
            const personsPool = (ASCENSION_DATA.wordle_words || []).map(w => ({
                raw: w,
                groups: [w.length],
                anime: charAnimeMap[w] || null,
            }));
            const animesPool = (ASCENSION_DATA.animes || [])
                .map(a => a.name.toUpperCase())
                .filter(n => /^[A-Z]+( [A-Z]+)*$/.test(n))
                .map(n => ({ raw: n, groups: n.split(' ').map(g => g.length) }));
            const pickFromAnimes = animesPool.length > 0 && Math.random() < 0.5;
            const pool = pickFromAnimes ? animesPool : personsPool;
            const picked = pool[Math.floor(Math.random() * pool.length)];
            const totalLetters = picked.groups.reduce((a, b) => a + b, 0);
            return {
                type: 'wordle',
                label: 'Wordle',
                word: picked.raw,                          // ex: "DEMON SLAYER" (avec espace) — strippé par getFloorDataForClient
                wordLength: totalLetters,                  // 11 (sans espaces)
                category: pickFromAnimes ? 'anime' : 'character',
                groups: picked.groups,                     // ex: [5, 6] pour rendre les cells avec un gap entre groupes
                animeHint: picked.anime || null,
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

        case 'scramble': {
            // Anagramme : pioche soit un perso (single-word 4-10 lettres), soit un anime (single-word).
            // 50/50 entre les 2 pools pour la variété.
            const personsPool = chars.filter(c =>
                c.img && c.name && /^[A-Z]+$/i.test(c.name) && c.name.length >= 4 && c.name.length <= 10
            );
            const animesPool = (ASCENSION_DATA.animes || []).filter(a =>
                a.name && /^[A-Z]+$/i.test(a.name) && a.name.length >= 4 && a.name.length <= 10
            );
            const pickFromAnime = animesPool.length > 0 && Math.random() < 0.5;
            let word, hint, category;
            if (pickFromAnime) {
                const picked = animesPool[Math.floor(Math.random() * animesPool.length)];
                word = picked.name.toUpperCase();
                hint = null;
                category = 'anime';
            } else {
                if (personsPool.length === 0) return generateFloorData('guess', usedData);
                const picked = personsPool[Math.floor(Math.random() * personsPool.length)];
                word = picked.name.toUpperCase();
                hint = picked.anime;
                category = 'character';
            }

            // Shuffle des lettres en garantissant un résultat différent du mot original
            let scrambled;
            let safety = 0;
            do {
                scrambled = shuffle(word.split(''));
                safety++;
            } while (safety < 20 && scrambled.join('') === word);

            return {
                type: 'scramble',
                label: 'Anagramme',
                word: word,                  // strippé client-side (anti-triche)
                scrambled: scrambled,
                wordLength: word.length,
                category: category,          // 'anime' ou 'character'
                hint: hint,                  // anime du perso (si character), null sinon
            };
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
            // 5 persos d'animes différents → relier au nom de leur anime
            // 🆕 Exclut les `match_only` (ils n'apparaissent que comme partenaire dans couples/rivals/same_voice/techniques/weapons)
            const usedAnimes = new Set();
            const picked = [];
            const shuffled = shuffle(chars.filter(c => !c.match_only));
            for (const c of shuffled) {
                if (!usedAnimes.has(c.anime) && picked.length < 5) {
                    picked.push(c);
                    usedAnimes.add(c.anime);
                }
            }
            return {
                type: 'match', subtype: 'char_anime',
                label: 'Liaison',
                left: picked.map(c => ({ id: c.id, name: c.name, img: c.img })),
                right: shuffle(picked.map(c => ({ id: c.id, value: c.anime }))),
                pairs: picked.map(c => ({ leftId: c.id, rightId: c.id })),
            };
        }

        case 'couples': {
            const couples = ASCENSION_DATA.couples;
            const picked = pickRandom(couples, Math.min(5, couples.length));
            return {
                type: 'match', subtype: 'couples',
                label: 'Liaison',
                left: picked.map(c => ({ id: c.char1, name: charMap[c.char1]?.name || c.char1, img: charMap[c.char1]?.img })),
                // 🆕 right inclut img pour le layout image-image
                right: shuffle(picked.map(c => ({ id: c.char1, value: charMap[c.char2]?.name || c.char2_name || c.char2, img: charMap[c.char2]?.img }))),
                pairs: picked.map(c => ({ leftId: c.char1, rightId: c.char1 })),
            };
        }

        case 'techniques': {
            const techs = ASCENSION_DATA.techniques;
            const picked = pickRandom(techs, Math.min(5, techs.length));
            return {
                type: 'match', subtype: 'techniques',
                label: 'Liaison',
                left: picked.map(t => ({ id: t.character, name: charMap[t.character]?.name || t.character, img: charMap[t.character]?.img })),
                right: shuffle(picked.map(t => ({ id: t.character, value: t.technique }))),
                pairs: picked.map(t => ({ leftId: t.character, rightId: t.character })),
            };
        }

        case 'weapons': {
            const weapons = ASCENSION_DATA.weapons;
            const picked = pickRandom(weapons, Math.min(5, weapons.length));
            return {
                type: 'match', subtype: 'weapons',
                label: 'Liaison',
                left: picked.map(w => ({ id: w.character, name: charMap[w.character]?.name || w.character, img: charMap[w.character]?.img })),
                right: shuffle(picked.map(w => ({ id: w.character, value: w.weapon }))),
                pairs: picked.map(w => ({ leftId: w.character, rightId: w.character })),
            };
        }

        case 'rivals': {
            const rivals = ASCENSION_DATA.rivals;
            const picked = pickRandom(rivals, Math.min(5, rivals.length));
            return {
                type: 'match', subtype: 'rivals',
                label: 'Liaison',
                left: picked.map(r => ({ id: r.char1, name: charMap[r.char1]?.name || r.char1, img: charMap[r.char1]?.img })),
                // 🆕 right inclut img pour le layout image-image
                right: shuffle(picked.map(r => ({ id: r.char1, value: charMap[r.char2]?.name || r.char2, img: charMap[r.char2]?.img }))),
                pairs: picked.map(r => ({ leftId: r.char1, rightId: r.char1 })),
            };
        }

        case 'same_voice': {
            const voiceGroups = ASCENSION_DATA.same_voice;
            if (voiceGroups.length === 0) return generateMatchData('char_anime');
            const picked = pickRandom(voiceGroups, Math.min(5, voiceGroups.length));
            const pairs = [];
            picked.forEach(g => {
                if (g.chars.length >= 2) {
                    const [c1, c2] = pickRandom(g.chars, 2);
                    pairs.push({ char1: c1, char2: c2 });
                }
            });
            if (pairs.length < 4) return generateMatchData('char_anime');
            return {
                type: 'match', subtype: 'same_voice',
                label: 'Liaison',
                left: pairs.map(p => ({ id: p.char1, name: charMap[p.char1]?.name || p.char1, img: charMap[p.char1]?.img })),
                // 🆕 right inclut img pour le layout image-image
                right: shuffle(pairs.map(p => ({ id: p.char1, value: charMap[p.char2]?.name || p.char2, img: charMap[p.char2]?.img }))),
                pairs: pairs.map(p => ({ leftId: p.char1, rightId: p.char1 })),
            };
        }

        case 'anime_studio': {
            // 🆕 Exclut les animes `multi_studio: true` (studio a changé entre saisons, ambigu)
            const animes = (ASCENSION_DATA.animes || []).filter(a => !a.multi_studio);
            const usedStudios = new Set();
            const picked = [];
            const shuffled = shuffle(animes);
            for (const a of shuffled) {
                if (!usedStudios.has(a.studio) && picked.length < 5) {
                    picked.push(a);
                    usedStudios.add(a.studio);
                }
            }
            // 🆕 Si on a moins de 5 studios uniques (très improbable), fallback vers un autre subtype
            //    plutôt que d'autoriser des studios doublons (qui rendrait le jeu non-résolvable).
            if (picked.length < 5) {
                console.warn(`⚠️ Pas assez de studios uniques pour anime_studio (${picked.length}/5) → fallback sur char_anime`);
                return generateMatchData('char_anime');
            }
            return {
                type: 'match', subtype: 'anime_studio',
                label: 'Liaison',
                left: picked.map(a => ({ id: a.name, name: a.name })),
                right: shuffle(picked.map(a => ({ id: a.name, value: a.studio }))),
                pairs: picked.map(a => ({ leftId: a.name, rightId: a.name })),
            };
        }

        case 'anime_year': {
            // 🆕 Lie chaque anime à son année de 1ère diffusion (pas le manga)
            //    Exclut les animes sans `year` et garantit 5 années uniques (sinon non-résolvable).
            const animes = (ASCENSION_DATA.animes || []).filter(a => typeof a.year === 'number');
            const usedYears = new Set();
            const picked = [];
            const shuffled = shuffle(animes);
            for (const a of shuffled) {
                if (!usedYears.has(a.year) && picked.length < 5) {
                    picked.push(a);
                    usedYears.add(a.year);
                }
            }
            if (picked.length < 5) {
                console.warn(`⚠️ Pas assez d'années uniques pour anime_year (${picked.length}/5) → fallback sur char_anime`);
                return generateMatchData('char_anime');
            }
            return {
                type: 'match', subtype: 'anime_year',
                label: 'Liaison',
                left: picked.map(a => ({ id: a.name, name: a.name })),
                right: shuffle(picked.map(a => ({ id: a.name, value: String(a.year) }))),
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
    // Les reglages du salon font foi : ce sont ceux que l hote a choisis, et
    // ils vivent deja dans l etat. « options » ne sert qu a les forcer depuis
    // un appel particulier — un test, par exemple. La v1 ecrasait tout par des
    // valeurs en dur, heritage du panneau d administration qui les portait.
    ascension.floors = options.floors || ascension.floors || 15;
    ascension.timer = options.timer || ascension.timer || 30;
    ascension.syncEpreuves = options.syncEpreuves !== undefined
        ? options.syncEpreuves
        : (ascension.syncEpreuves !== undefined ? ascension.syncEpreuves : true);

    // Le salon entre en partie. La fin le remet a false ; sans ce pendant,
    // rien ne fermait la jointure et le salon se disait libre en pleine montee.
    gameState.inProgress = true;
    ascension.startedAt = Date.now();
    ascension.finishedPlayers = [];
    // 🆕 Callback exécuté à la fin de la partie (server.js l'utilise pour distribuer rewards + tracker stats)
    ascension.onGameEnd = typeof options.onGameEnd === 'function' ? options.onGameEnd : null;
    
    ascension.floorSequence = generateFloorSequence(ascension.floors);
    
    ascension.floorData = [];
    const usedData = {};
    for (let i = 0; i < ascension.floors; i++) {
        ascension.floorData.push(generateFloorData(ascension.floorSequence[i], usedData));
    }
    
    ascension.playerProgress = {};
    for (const [socketId, player] of gameState.players.entries()) {
        ascension.playerProgress[player.playerId] = {
            floor: 0,
            validated: false,
            username: player.username,
            avatarUrl: player.avatarUrl || null,
            socketId: socketId,
            colorIndex: player.colorIndex || 0,
            isGhost: !!player.isGhost,   // 🆕 Admin non-inscrit : joue mais invisible au classement
            // 🆕 Champs personnels (mode race indépendant par joueur)
            floorTimerEndTime: null,
            floorTimer: null,
            guessProgress: {},
            guessJokerUsed: {},   // 🆕 floorIndex → true si le joker a été utilisé pour cet étage
        };
        
        if (!ascension.syncEpreuves) {
            ascension.playerProgress[player.playerId].personalFloorData = [];
            const personalSeq = generateFloorSequence(ascension.floors);
            for (let i = 0; i < ascension.floors; i++) {
                ascension.playerProgress[player.playerId].personalFloorData.push(
                    generateFloorData(personalSeq[i], {})
                );
            }
        }
    }
    
    const COUNTDOWN_MS = 4000;
    ascension.countdownEndsAt = Date.now() + COUNTDOWN_MS;
    
    io.to(gameState.roomCode).emit('ascension-game-started', {
        floors: ascension.floors,
        timer: ascension.timer,
        syncEpreuves: ascension.syncEpreuves,
        countdownEndsAt: ascension.countdownEndsAt,
        players: Object.entries(ascension.playerProgress).map(([tid, p]) => ({
            playerId: tid,
            username: p.username,
            floor: 0,
            colorIndex: p.colorIndex,
            avatarUrl: p.avatarUrl || null,   // 🆕 inclus l'avatar dès le démarrage (sinon initiale jusqu'au reload)
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
function startPlayerFloor(gameState, io, playerId, floorIndex) {
    const ascension = gameState.ascension;
    if (!ascension.active) return;
    
    const pp = ascension.playerProgress[playerId];
    if (!pp) return;
    
    if (floorIndex >= ascension.floors) {
        // Joueur a complété tous les étages
        finalizePlayerFinish(gameState, io, playerId);
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
            advancePlayerToNextFloor(gameState, io, playerId, false);
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
    
    // 🆕 Emit via room playerId pour garantir la livraison (au cas où socketId est stale)
    //    Tous les sockets de ce user reçoivent (admin/joueur/refresh, peu importe).
    io.to((gameState.roomCode + ':asc:' + playerId)).emit('ascension-floor-start', eventData);
    if (sock) {
        sock.emit('ascension-floor-start', eventData);
    }
    
    // Broadcast la progression à tout le monde (pour la tour des joueurs)
    io.to(gameState.roomCode).emit('ascension-progress', {
        playerId: playerId,
        username: pp.username,
        floor: floorIndex,
        playerProgress: getPlayerProgressForClient(ascension),
    });

    console.log(`🏔️ ${pp.username} → étage ${floorIndex + 1}/${ascension.floors}: ${floorData.type}`);
}

// 🆕 Avance le joueur au floor suivant (avec délai pour l'animation côté client)
function advancePlayerToNextFloor(gameState, io, playerId, success, customDelay) {
    const ascension = gameState.ascension;
    if (!ascension.active) return;

    const pp = ascension.playerProgress[playerId];
    if (!pp) return;

    if (pp.floorTimer) {
        clearTimeout(pp.floorTimer);
        pp.floorTimer = null;
    }

    if (success) pp.validated = true;

    const nextFloor = pp.floor + 1;

    if (nextFloor >= ascension.floors) {
        pp.floor = nextFloor;
        finalizePlayerFinish(gameState, io, playerId);
        return;
    }

    // 🆕 Bump immédiat du floor + emit ascension-progress → le client anime la tour
    //    tout de suite (à la validation), pas seulement au démarrage du mini-jeu suivant.
    if (success) {
        pp.floor = nextFloor;
        io.to(gameState.roomCode).emit('ascension-progress', {
            playerId: playerId,
            username: pp.username,
            floor: nextFloor,
            playerProgress: getPlayerProgressForClient(ascension),
            });
    }

    // Délai pour laisser jouer l'animation de validation côté client (~750ms pour wrap fade + breathing room)
    // En cas d'échec (timer expiré), on enchaîne plus vite (300ms)
    // customDelay : override pour les mini-jeux qui ont une animation de victoire plus longue (ex: wordle 2500ms)
    // 1100 ms sur une reussite, c etait long : on a compris qu on avait gagne
    // bien avant que l etage suivant arrive, et l attente cassait l elan d une
    // course. 550 laisse voir la validation sans faire patienter.
    const delay = customDelay !== undefined ? customDelay : (success ? 550 : 300);
    setTimeout(() => {
        if (ascension.active && ascension.playerProgress[playerId]) {
            startPlayerFloor(gameState, io, playerId, nextFloor);
        }
    }, delay);
}

// 🆕 Marque la fin du parcours du joueur (atteint l'étage final ou abandonné)
function finalizePlayerFinish(gameState, io, playerId) {
    const ascension = gameState.ascension;
    const pp = ascension.playerProgress[playerId];
    if (!pp) return;
    
    if (pp.floorTimer) {
        clearTimeout(pp.floorTimer);
        pp.floorTimer = null;
    }
    
    const reachedSummit = pp.floor >= ascension.floors;
    // 🆕 Les ghosts (admin non inscrits) n'apparaissent pas au classement
    if (!pp.isGhost && !ascension.finishedPlayers.find(f => f.playerId === playerId)) {
        ascension.finishedPlayers.push({
            playerId: playerId,
            username: pp.username,
            rank: ascension.finishedPlayers.length + 1,
            finishedAt: Date.now(),
            reachedSummit,
        });
        console.log(`🏔️ 🏁 ${pp.username} a fini la partie (rang ${ascension.finishedPlayers.length}${reachedSummit ? ' — SOMMET' : ''})`);
    }

    io.to(gameState.roomCode).emit('ascension-progress', {
        playerId: playerId,
        username: pp.username,
        floor: pp.floor,
        playerProgress: getPlayerProgressForClient(ascension),
    });

    // 🆕 Mort subite : dès qu'un VRAI joueur (pas un ghost admin) atteint le sommet → fin immédiate
    if (reachedSummit && !pp.isGhost) {
        endAscensionGame(gameState, io);
        return;
    }

    // Sinon, si tous les VRAIS joueurs ont fini sans atteindre le sommet → fin
    const realPlayers = Object.entries(ascension.playerProgress).filter(([_, pp]) => !pp.isGhost);
    const allFinished = realPlayers.every(([tid, _]) => {
        return !!ascension.finishedPlayers.find(f => f.playerId === tid);
    });
    if (allFinished && realPlayers.length > 0) {
        endAscensionGame(gameState, io);
    }
}

function getFloorDataForClient(floorData) {
    const data = { ...floorData };
    
    if (data.type === 'wordle') {
        const { word, ...rest } = data;
        return rest;
    }
    if (data.type === 'scramble') {
        // Strip word + characterName (anti-triche) — le joueur ne doit pas pouvoir lire la réponse dans le DOM
        const { word, characterName, ...rest } = data;
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
    
    for (const [playerId, pp] of Object.entries(ascension.playerProgress)) {
        if (pp?.socketId === socket.id) {
            // Reconstruire un objet player minimal (juste playerId + username pour les usages)
            return { playerId, username: pp.username };
        }
    }
    return null;
}

function handleAscensionAnswer(gameState, io, socket, data) {
    const ascension = gameState.ascension;
    if (!ascension.active) return;
    
    const player = resolvePlayerFromSocket(gameState, socket);
    if (!player) return;
    
    const pp = ascension.playerProgress[player.playerId];
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
        advancePlayerToNextFloor(gameState, io, player.playerId, true);
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
        .filter(([_, pp]) => !pp.isGhost)   // 🆕 ghosts (admin) exclus du podium
        .map(([tid, pp]) => {
            const finished = ascension.finishedPlayers.find(f => f.playerId === tid);
            return {
                playerId: tid, username: pp.username, floor: pp.floor,
                avatarUrl: pp.avatarUrl || null,
                colorIndex: pp.colorIndex,
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
    
    const winner = podium[0] || null;
    io.to(gameState.roomCode).emit('ascension-game-end', { podium, winner });

    // 🆕 Callback côté server.js : rewards (XP/coins) + stats DB
    if (ascension.onGameEnd) {
        try {
            ascension.onGameEnd(podium, winner);
        } catch (e) {
            console.error('⚠️ Ascension onGameEnd callback error:', e.message);
        }
    }

    ascension.active = false;
    gameState.inProgress = false;

    console.log(`🏔️ Ascension terminée! Podium:`, podium.map(p => `${p.rank}. ${p.username} (étage ${p.floor})`).join(', '));
}

// ═══ Helpers ═══

function getPlayerProgressForClient(ascension) {
    // 🆕 On filtre les ghosts (admin non-joueur) : ils jouent localement mais
    //    n'apparaissent pas dans le classement / la tour.
    return Object.entries(ascension.playerProgress)
        .filter(([_, pp]) => !pp.isGhost)
        .map(([tid, pp]) => ({
            playerId: tid, username: pp.username, floor: pp.floor, colorIndex: pp.colorIndex, avatarUrl: pp.avatarUrl || null,
        }));
}

function getAscensionStateForClient(gameState, playerId) {
    const ascension = gameState.ascension;
    if (!ascension || !ascension.active) return null;
    
    // 🆕 État personnalisé par joueur (mode race indépendant)
    const pp = playerId ? ascension.playerProgress[playerId] : null;
    
    let currentFloor = 0;
    let floorTimerEndTime = null;
    let floorData = null;
    let myValidatedGuesses = [];
    let myGuessJokerUsed = false;

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
        if (pp.guessJokerUsed?.[currentFloor]) {
            myGuessJokerUsed = true;
        }
    } else {
        // Admin sans pp (avant ghost-add) : retour basique
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
        myGuessJokerUsed: myGuessJokerUsed,
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

// Le salon n est plus fige a l inscription : une socket peut changer de salon
// pendant sa vie, et les gestionnaires vivent aussi longtemps qu elle. On le
// resout donc a chaque evenement, comme partout ailleurs en v2.
function registerAscensionSocketHandlers(io, socket, resoudreSalon) {
    socket.on('ascension-answer', (data) => {
        const gameState = resoudreSalon();
        if (!gameState) return;
        handleAscensionAnswer(gameState, io, socket, data);
    });
    
    // 🆕 Validation incrémentale d'une seule guess (mini-jeu Guess)
    // Le client envoie {characterId, name} — le serveur répond {correct, characterId}
    socket.on('ascension-check-guess', (data) => {
        const gameState = resoudreSalon();
        if (!gameState) return;
        handleAscensionCheckGuess(gameState, io, socket, data);
    });

    // 🆕 Bind admin / joueur via room par playerId (livraison fiable même au reconnect)
    //    Met aussi à jour pp.socketId + gameState.players pour les actions (resolvePlayerFromSocket).
    socket.on('ascension-admin-bind', (data) => {
        const gameState = resoudreSalon();
        if (!gameState) return;
        if (!data || !data.playerId) return;
        // Rejoint la room du playerId pour recevoir les ascension-floor-start et autres events ciblés
        socket.join((gameState.roomCode + ':asc:' + data.playerId));

        const ascension = gameState.ascension;
        if (ascension?.playerProgress) {
            const pp = ascension.playerProgress[data.playerId];
            if (pp) {
                const oldSid = pp.socketId;
                pp.socketId = socket.id;
                // Met à jour gameState.players (retire ancienne entrée si stale, ajoute nouvelle)
                if (oldSid && oldSid !== socket.id) {
                    const oldPlayer = gameState.players.get(oldSid);
                    if (oldPlayer && oldPlayer.playerId === data.playerId) {
                        gameState.players.delete(oldSid);
                        gameState.players.set(socket.id, { ...oldPlayer, socketId: socket.id });
                    }
                }
                // Si l'entrée n'existe pas du tout dans gameState.players (cas extrême), la créer
                if (!gameState.players.get(socket.id)) {
                    gameState.players.set(socket.id, {
                        socketId: socket.id,
                        playerId: data.playerId,
                        username: pp.username,
                        avatarUrl: pp.avatarUrl || 'novice.png',
                        isGhost: !!pp.isGhost,
                        isAdmin: true,
                    });
                }
                console.log(`🏔️ admin-bind: ${pp.username} pp.socketId=${socket.id} (salon ${gameState.roomCode}:asc:${data.playerId})`);
            }
        }
    });



    // 🆕 Joker Guess utilisé : valide côté serveur + révèle le nom (anti-triche : le name n'est jamais envoyé d'avance)
    //    Réponse : 'ascension-guess-joker-revealed' avec { characterId, name }
    socket.on('ascension-guess-joker-used', (data) => {
        const gameState = resoudreSalon();
        if (!gameState) return;
        const ascension = gameState.ascension;
        if (!ascension?.active) return;
        const player = gameState.players.get(socket.id);
        if (!player) return;
        const pp = ascension.playerProgress[player.playerId];
        if (!pp) return;

        // Vérifie que l'étage courant est bien un guess
        const fd = ascension.syncEpreuves
            ? ascension.floorData[pp.floor]
            : (pp.personalFloorData?.[pp.floor] || ascension.floorData[pp.floor]);
        if (!fd || fd.type !== 'guess') return;

        // Anti-spam : déjà utilisé
        if (!pp.guessJokerUsed) pp.guessJokerUsed = {};
        if (pp.guessJokerUsed[pp.floor]) return;

        // Charge la progression : besoin d'au moins 2 guesses validées
        const validated = pp.guessProgress?.[pp.floor];
        const validatedCount = validated ? validated.size : 0;
        if (validatedCount < 2) return;

        // Vérifie que le characterId est bien dans cet étage et pas déjà validé
        const charId = data && data.characterId;
        if (!charId) return;
        const char = fd.characters.find(c => c.id === charId);
        if (!char) return;
        if (validated && validated.has(charId)) return;

        // OK : marque consommé + envoie le nom
        pp.guessJokerUsed[pp.floor] = true;
        socket.emit('ascension-guess-joker-revealed', { characterId: charId, name: char.name });
    });
    
    // 🆕 Validation continue de l'ordre des arcs (mini-jeu Order)
    // Le client envoie {order: [arcId1, arcId2, ...]} après chaque drop
    // Le serveur ne répond QUE si l'ordre est correct → avance auto à l'étage suivant
    socket.on('ascension-check-order', (data) => {
        const gameState = resoudreSalon();
        if (!gameState) return;
        handleAscensionCheckOrder(gameState, io, socket, data);
    });
    
    // 🆕 Validation incrémentale d'un clic sur une carte (mini-jeu Intruder)
    // Le client envoie {characterId} à chaque clic. Le serveur répond:
    //   {correct: bool, characterId, foundCount, totalTargets}
    // Quand foundCount === totalTargets, l'étage est validé et on avance.
    socket.on('ascension-check-intruder', (data) => {
        const gameState = resoudreSalon();
        if (!gameState) return;
        handleAscensionCheckIntruder(gameState, io, socket, data);
    });

    // 🆕 Validation d'une tentative Wordle. Client envoie {guess: 'NARUTO'}.
    // Serveur répond {guess, statuses: ['green','yellow','red',...], isCorrect}.
    socket.on('ascension-check-wordle', (data) => {
        const gameState = resoudreSalon();
        if (!gameState) return;
        handleAscensionCheckWordle(gameState, io, socket, data);
    });

    // 🆕 Validation des connexions Match (relie 2 colonnes). Client envoie {connections: [{leftId, rightId}, ...]}.
    // Serveur répond {results: [{leftId, rightId, correct}], allCorrect}.
    socket.on('ascension-check-match', (data) => {
        const gameState = resoudreSalon();
        if (!gameState) return;
        handleAscensionCheckMatch(gameState, io, socket, data);
    });

    // 🆕 Validation incrémentale d'un clic sur le mini-jeu Target (clique sur 5 persos d'affilée).
    // Client envoie {characterId}. Serveur tracke pp.targetProgress et reset à 0 sur erreur.
    socket.on('ascension-check-target', (data) => {
        const gameState = resoudreSalon();
        if (!gameState) return;
        handleAscensionCheckTarget(gameState, io, socket, data);
    });

    // 🆕 Validation d'une tentative Scramble (anagramme). Client envoie {guess: 'NARUTO'}.
    // Serveur compare au word et répond {correct, guess}.
    socket.on('ascension-check-scramble', (data) => {
        const gameState = resoudreSalon();
        if (!gameState) return;
        handleAscensionCheckScramble(gameState, io, socket, data);
    });
    
    socket.on('ascension-reconnect', (data) => {
        const gameState = resoudreSalon();
        if (!gameState) return;
        const ascension = gameState.ascension;

        // 🆕 Rejoint la room playerId pour recevoir les emits ciblés
        if (data?.playerId) {
            socket.join((gameState.roomCode + ':asc:' + data.playerId));
        }

        // Remap socket ID for this player
        if (data?.playerId && ascension?.playerProgress) {
            const pp = ascension.playerProgress[data.playerId];
            if (pp) {
                pp.socketId = socket.id;
                console.log(`🏔️ Reconnect: ${pp.username} remappé → ${socket.id}`);
            }
        }
        
        // 🆕 Retourner l'état perso du joueur (son floor, timer, guesses validées)
        const state = getAscensionStateForClient(gameState, data?.playerId);
        if (state) {
            socket.emit('ascension-state', state);
        }
    });
}

// 🆕 Validation incrémentale d'une seule guess pour le mini-jeu Guess
function handleAscensionCheckGuess(gameState, io, socket, data) {
    const ascension = gameState.ascension;
    if (!ascension.active) { console.log('🐛 [server] check-guess: ascension not active'); return; }

    const player = resolvePlayerFromSocket(gameState, socket);
    if (!player) {
        console.log('🐛 [server] check-guess: no player from socket.id=' + socket.id + ' | gameState.players keys=', Array.from(gameState.players.keys()).slice(0, 5), '| pp socketIds=', Object.values(ascension.playerProgress || {}).map(p => p.socketId).slice(0, 5));
        return;
    }
    console.log('🐛 [server] check-guess: player resolved tid=' + player.playerId + ' name=' + player.username);

    const pp = ascension.playerProgress[player.playerId];
    if (!pp || pp.validated) { console.log('🐛 [server] check-guess: no pp or already validated'); return; }
    
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
            advancePlayerToNextFloor(gameState, io, player.playerId, true);
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
    
    const pp = ascension.playerProgress[player.playerId];
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
        advancePlayerToNextFloor(gameState, io, player.playerId, true);
    }
    // Si pas correct → on ne répond rien (le client continue à drag)
}

// 🆕 Validation d'une tentative Wordle (essais infinis, le timer du floor gère la fin)
// Calcul des statuts par lettre avec gestion correcte des doublons (greens d'abord, puis yellows
// en consommant les positions disponibles dans le mot cible).
function handleAscensionCheckWordle(gameState, io, socket, data) {
    const ascension = gameState.ascension;
    if (!ascension.active) return;

    const player = resolvePlayerFromSocket(gameState, socket);
    if (!player) return;

    const pp = ascension.playerProgress[player.playerId];
    if (!pp || pp.validated) return;

    const floorIndex = pp.floor;
    const floorData = ascension.syncEpreuves
        ? ascension.floorData[floorIndex]
        : (pp.personalFloorData?.[floorIndex] || ascension.floorData[floorIndex]);

    if (!floorData || floorData.type !== 'wordle') return;
    if (!data || typeof data.guess !== 'string') return;

    const guess = data.guess.toUpperCase();
    // 🆕 Strip les espaces pour la comparaison (multi-mots : "DEMON SLAYER" → "DEMONSLAYER")
    const word = floorData.word.replace(/\s+/g, '');
    if (guess.length !== word.length) return;

    const statuses = new Array(word.length).fill('red');
    const used = new Array(word.length).fill(false);

    // Pass 1 : greens (lettre + position correctes)
    for (let i = 0; i < word.length; i++) {
        if (guess[i] === word[i]) {
            statuses[i] = 'green';
            used[i] = true;
        }
    }
    // Pass 2 : yellows (lettre présente ailleurs, sans double-comptage)
    for (let i = 0; i < word.length; i++) {
        if (statuses[i] === 'green') continue;
        for (let j = 0; j < word.length; j++) {
            if (!used[j] && guess[i] === word[j]) {
                statuses[i] = 'yellow';
                used[j] = true;
                break;
            }
        }
    }

    const isCorrect = statuses.every(s => s === 'green');

    socket.emit('ascension-wordle-result', { guess, statuses, isCorrect });

    if (isCorrect) {
        console.log(`🏔️ ✅ ${player.username} valide étage Wordle ${floorIndex + 1} (${word})`);
        socket.emit('ascension-answer-result', { correct: true, floor: pp.floor + 1 });
        // Délai 2500ms : laisse le temps de jouer le flip + pulse verte + fade-out du wrap côté client
        advancePlayerToNextFloor(gameState, io, player.playerId, true, 900);
    }
}

// 🆕 Validation des connexions Match (relie). Le client envoie toutes les connexions en bloc
// (auto-submit quand toutes les paires sont faites). Serveur valide chaque paire individuellement.
// Si tout est correct → étage validé. Sinon, le client retire les wrongs et re-soumet après que le joueur les refasse.
function handleAscensionCheckMatch(gameState, io, socket, data) {
    const ascension = gameState.ascension;
    if (!ascension.active) return;

    const player = resolvePlayerFromSocket(gameState, socket);
    if (!player) return;

    const pp = ascension.playerProgress[player.playerId];
    if (!pp || pp.validated) return;

    const floorIndex = pp.floor;
    const floorData = ascension.syncEpreuves
        ? ascension.floorData[floorIndex]
        : (pp.personalFloorData?.[floorIndex] || ascension.floorData[floorIndex]);

    if (!floorData || floorData.type !== 'match') return;
    if (!data || !Array.isArray(data.connections)) return;

    const pairs = floorData.pairs;
    const pairMap = new Map(pairs.map(p => [p.leftId, p.rightId]));

    const results = data.connections.map(c => {
        const expected = pairMap.get(c.leftId);
        return {
            leftId: c.leftId,
            rightId: c.rightId,
            correct: expected !== undefined && expected === c.rightId,
        };
    });

    const allCorrect = results.length === pairs.length && results.every(r => r.correct);

    socket.emit('ascension-match-result', { results, allCorrect });

    if (allCorrect) {
        console.log(`🏔️ ✅ ${player.username} valide étage Match ${floorIndex + 1} (${floorData.subtype})`);
        socket.emit('ascension-answer-result', { correct: true, floor: pp.floor + 1 });
        // Délai pour laisser jouer la cascade de validation + wrap fade
        advancePlayerToNextFloor(gameState, io, player.playerId, true, 900);
    }
}

// 🆕 Validation d'une tentative Scramble (anagramme).
// Le joueur réorganise les lettres et soumet → serveur compare au word.
// Si correct → étage validé. Sinon → renvoie correct: false, joueur peut réessayer.
function handleAscensionCheckScramble(gameState, io, socket, data) {
    const ascension = gameState.ascension;
    if (!ascension.active) return;

    const player = resolvePlayerFromSocket(gameState, socket);
    if (!player) return;

    const pp = ascension.playerProgress[player.playerId];
    if (!pp || pp.validated) return;

    const floorIndex = pp.floor;
    const floorData = ascension.syncEpreuves
        ? ascension.floorData[floorIndex]
        : (pp.personalFloorData?.[floorIndex] || ascension.floorData[floorIndex]);

    if (!floorData || floorData.type !== 'scramble') return;
    if (!data || typeof data.guess !== 'string') return;

    const guess = data.guess.toUpperCase();
    const word = floorData.word;
    const isCorrect = guess === word;

    // 🆕 Marqueur par position : true = lettre était à la bonne place (hint en cas de wrong)
    const correctPositions = guess.split('').map((letter, i) => letter === word[i]);

    socket.emit('ascension-scramble-result', {
        correct: isCorrect,
        guess,
        correctPositions,
    });

    if (isCorrect) {
        console.log(`🏔️ ✅ ${player.username} valide étage Scramble ${floorIndex + 1} (${word})`);
        socket.emit('ascension-answer-result', { correct: true, floor: pp.floor + 1 });
        advancePlayerToNextFloor(gameState, io, player.playerId, true);
    }
}

// 🆕 Validation incrémentale du mini-jeu Target.
// Le joueur doit cliquer sur 5 persos d'affilée. Sur erreur, progress reset à 0 et 1er target ré-affiché.
function handleAscensionCheckTarget(gameState, io, socket, data) {
    const ascension = gameState.ascension;
    if (!ascension.active) return;

    const player = resolvePlayerFromSocket(gameState, socket);
    if (!player) return;

    const pp = ascension.playerProgress[player.playerId];
    if (!pp || pp.validated) return;

    const floorIndex = pp.floor;
    const floorData = ascension.syncEpreuves
        ? ascension.floorData[floorIndex]
        : (pp.personalFloorData?.[floorIndex] || ascension.floorData[floorIndex]);

    if (!floorData || floorData.type !== 'target') return;
    if (!data || !data.characterId) return;

    if (typeof pp.targetProgress !== 'number') pp.targetProgress = 0;

    const expectedTarget = floorData.targets[pp.targetProgress];
    if (!expectedTarget) return;

    // 🆕 Match par id OU par name : si plusieurs persos partagent le même nom (ex: Hinata Naruto vs Hinata Haikyuu),
    //    cliquer n'importe quel perso de ce nom est validé (sinon le joueur ne peut pas savoir lequel est attendu).
    const clickedChar = floorData.characters.find(c => c.id === data.characterId);
    const isCorrect = data.characterId === expectedTarget.id
        || (clickedChar && clickedChar.name === expectedTarget.name);

    if (isCorrect) {
        pp.targetProgress++;
        const isComplete = pp.targetProgress >= floorData.totalTargets;
        const nextTarget = isComplete ? null : floorData.targets[pp.targetProgress];
        socket.emit('ascension-target-result', {
            correct: true,
            characterId: data.characterId,
            progress: pp.targetProgress,
            currentTarget: nextTarget,
            isComplete,
        });
        if (isComplete) {
            console.log(`🏔️ ✅ ${player.username} valide étage Target ${floorIndex + 1}`);
            socket.emit('ascension-answer-result', { correct: true, floor: pp.floor + 1 });
            pp.targetProgress = 0;
            advancePlayerToNextFloor(gameState, io, player.playerId, true);
        }
    } else {
        // Wrong → reset progress, ré-envoie le 1er target
        pp.targetProgress = 0;
        socket.emit('ascension-target-result', {
            correct: false,
            characterId: data.characterId,
            progress: 0,
            currentTarget: floorData.targets[0],
            isComplete: false,
        });
    }
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
    
    const pp = ascension.playerProgress[player.playerId];
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
            advancePlayerToNextFloor(gameState, io, player.playerId, true);
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

    // Exposes pour la suite de test : ce sont des fonctions pures du fichier
    // de donnees, elles s exercent sans serveur ni socket.
    _interne: {
        GAME_TYPES,
        MATCH_SUBTYPES,
        generateFloorSequence,
        generateFloorData,
        generateMatchData,
        getFloorDataForClient,
        getFloorAnswers,
        validateAnswer,
    },
};