// ============================================
// WEEBMASTER - Server Principal - TIEBREAKER FIX
// ============================================

require('dotenv').config();
const express = require('express');
const compression = require('compression');
const { randomUUID } = require('crypto');
const { Server } = require('socket.io');
const { db, supabase, SERIES_FILTERS, getFilterSeries, invaliderBanque } = require('./dbs');

const app = express();

// Rien n'était compressé : le CSS et le script partaient bruts, soit près d'un
// méga-octet de texte à chaque première visite.
app.use(compression());
const PORT = process.env.PORT || 7000;

const REFRESH_COOLDOWN_MS = 20000;

let connectionsByIP = new Map();
// Plusieurs joueurs derrière la même box partagent une seule IP publique :
// une limite à 5 excluait le sixième d'un groupe d'amis. Réglable par variable
// d'environnement si un abus se présentait.
// Ce plafond vise un client qui ouvrirait des sockets en boucle, pas une salle
// de classe. Les opérateurs mobiles passent leurs abonnés derrière une même IP
// (CGNAT) : à 16, la moitié du public d'un live TikTok se serait fait refuser
// sans comprendre pourquoi.
const MAX_CONNECTIONS_PER_IP = parseInt(process.env.MAX_CONNECTIONS_PER_IP, 10) || 100;




const MAX_LOGS = 30;

const STATS_THROTTLE_MS = 500; // Max 2 updates par seconde


const PLAYER_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
    '#F8B739', '#52B788', '#E76F51', '#8E44AD'
];

// ============================================
// BOMBANIME - Données et Configuration
// ============================================
const fs = require('fs');
const path = require('path');
const { getAllNamesToBlock, CHARACTER_VARIANTS: BOMB_VARIANTS, THEME_MAPPING: BOMB_THEME_MAPPING } = require('./character-variants');

// Charger les personnages depuis le JSON
let BOMBANIME_CHARACTERS = {};
try {
    const bombDataPath = path.join(__dirname, 'bombdata.json');
    const bombData = JSON.parse(fs.readFileSync(bombDataPath, 'utf8'));
    BOMBANIME_CHARACTERS = bombData.Character || {};
    console.log('✅ BombAnime: Données chargées -', Object.keys(BOMBANIME_CHARACTERS).length, 'séries');
    
    // Log du nombre de personnages par série
    for (const [serie, chars] of Object.entries(BOMBANIME_CHARACTERS)) {
        console.log(`   📌 ${serie}: ${chars.length} personnages`);
    }
} catch (error) {
    console.error('❌ Erreur chargement bombdata.json:', error.message);
}

// 🖼️ Charger les images des personnages BombAnime
let BOMBANIME_IMAGES = {};
try {
    const bombImagesPath = path.join(__dirname, 'bombimages.json');
    if (fs.existsSync(bombImagesPath)) {
        BOMBANIME_IMAGES = JSON.parse(fs.readFileSync(bombImagesPath, 'utf8'));
        const totalImages = Object.values(BOMBANIME_IMAGES).reduce((sum, serie) => sum + Object.keys(serie).length, 0);
        console.log('✅ BombImages: Données chargées -', totalImages, 'images');
    } else {
        console.log('⚠️ bombimages.json non trouvé - Images désactivées');
    }
} catch (error) {
    console.error('❌ Erreur chargement bombimages.json:', error.message);
}

// 🖼️ Trouver l'image d'un personnage par son nom (gère les variantes)
function getCharacterImage(name, serie) {
    const serieImages = BOMBANIME_IMAGES[serie];
    if (!serieImages) return null;
    
    const upperName = name.toUpperCase();
    
    // 1. Match exact dans bombimages
    if (serieImages[upperName]) return serieImages[upperName];
    
    // 2. Chercher parmi les clés (case-insensitive)
    for (const [mainName, imgUrl] of Object.entries(serieImages)) {
        if (upperName === mainName.toUpperCase()) return imgUrl;
    }
    
    // 3. Chercher via les variantes de bombdata
    // Si le nom soumis est une variante, trouver le nom principal qui a une image
    const characters = BOMBANIME_CHARACTERS[serie] || [];
    const allVariants = getAllNamesToBlock(upperName, characters, serie);
    for (const variant of allVariants) {
        const variantUpper = variant.toUpperCase();
        for (const [mainName, imgUrl] of Object.entries(serieImages)) {
            if (variantUpper === mainName.toUpperCase()) return imgUrl;
        }
    }
    
    return null;
}

// Configuration BombAnime
const BOMBANIME_CONFIG = {
    MIN_PLAYERS: 2,
    MAX_PLAYERS: 13,
    DEFAULT_LIVES: 2,
    DEFAULT_TIMER: 8,
    ALPHABET_BONUS_LIVES: 1
};


// 💣 Set pour réserver les places pendant le traitement async (évite les race conditions)


// SERIES_FILTERS importé depuis dbs.js


// ============================================
// Middleware
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('trust proxy', 1);


// ============================================
// 📊 STATS PUBLIQUES (page d'accueil)
// ============================================

// Historique des parties : en mémoire d'abord (aucune dépendance), persisté dans
// la table `game_history` si elle existe. SQL de création : docs/game-history.sql
const recentGames = [];
let gamesPlayedTotal = 0;   // parties terminées (depuis la base si game_history existe)
const RECENT_GAMES_MAX = 8;

// Délai entre la révélation d'une question et la suivante, en mode auto.
// Les deux minuteries valaient déjà 5 s, mais logs et commentaires annonçaient
// 3 s : l'anneau de décompte affiché à l'hôte doit suivre la vraie valeur.
const AUTO_DELAI_MS = parseInt(process.env.AUTO_DELAI_MS, 10) || 5000;

// Sursis laissé à un joueur qui se déconnecte du salon : le temps d'un
// rafraîchissement de page. Sans rapport avec le délai du mode auto.
const DELAI_RETRAIT_JOUEUR_MS = 5000;

// Les parties à deux ou trois ne disent rien de l'activité du site : elles
// viennent d'un test ou d'un essai entre amis. Seules celles qui ont rassemblé
// du monde sont comptées et affichées.
const MIN_JOUEURS_HISTORIQUE = parseInt(process.env.MIN_JOUEURS_HISTORIQUE, 10) || 15;
let gameHistoryTableOk = null; // null = pas encore testé, false = table absente

let questionsCountCache = { value: null, at: 0 };
const QUESTIONS_COUNT_TTL = 5 * 60 * 1000;

const MODE_LABELS = { classic: 'Classique', rivalry: 'Rivalité', bombanime: 'BombAnime' };

async function recordFinishedGame({ mode, playersCount, winnerName, duration }) {
    const entry = {
        mode,
        modeLabel: MODE_LABELS[mode] || mode,
        playersCount: playersCount || 0,
        winnerName: winnerName || null,
        duration: duration || 0,
        endedAt: new Date().toISOString(),
    };

    if (entry.playersCount < MIN_JOUEURS_HISTORIQUE) {
        console.log(`📊 Partie non retenue : ${entry.playersCount} joueur(s), minimum ${MIN_JOUEURS_HISTORIQUE}`);
        return;
    }

    gamesPlayedTotal++;
    recentGames.unshift(entry);
    if (recentGames.length > RECENT_GAMES_MAX) recentGames.length = RECENT_GAMES_MAX;

    if (gameHistoryTableOk === false) return;

    try {
        const { error } = await supabase.from('game_history').insert({
            mode: entry.mode,
            players_count: entry.playersCount,
            winner_name: entry.winnerName,
            duration: entry.duration,
        });
        if (error) throw error;
        gameHistoryTableOk = true;
    } catch (e) {
        if (gameHistoryTableOk === null) {
            console.log('ℹ️ Table game_history absente — historique gardé en mémoire uniquement');
        }
        gameHistoryTableOk = false;
    }
}

async function loadRecentGamesFromDb() {
    try {
        const { data, error } = await supabase
            .from('game_history')
            .select('mode, players_count, winner_name, duration, created_at')
            .gte('players_count', MIN_JOUEURS_HISTORIQUE)
            .order('created_at', { ascending: false })
            .limit(RECENT_GAMES_MAX);
        if (error) throw error;

        gameHistoryTableOk = true;
        recentGames.length = 0;
        (data || []).forEach(g => recentGames.push({
            mode: g.mode,
            modeLabel: MODE_LABELS[g.mode] || g.mode,
            playersCount: g.players_count || 0,
            winnerName: g.winner_name || null,
            duration: g.duration || 0,
            endedAt: g.created_at,
        }));
        const { count } = await supabase.from('game_history')
            .select('id', { count: 'exact', head: true })
            .gte('players_count', MIN_JOUEURS_HISTORIQUE);
        gamesPlayedTotal = count || recentGames.length;
        console.log(`📊 ${recentGames.length} partie(s) récente(s) chargée(s), ${gamesPlayedTotal} au total`);
    } catch (e) {
        // Silencieux jusqu'ici : on ne voyait pas que la table manquait
        console.log('ℹ️ Historique des parties indisponible (' + e.message + ') — mémoire seule');
        gameHistoryTableOk = false;
    }
}

async function getQuestionsCount() {
    const now = Date.now();
    if (questionsCountCache.value !== null && now - questionsCountCache.at < QUESTIONS_COUNT_TTL) {
        return questionsCountCache.value;
    }
    try {
        const { count, error } = await supabase
            .from('questions')
            .select('id', { count: 'exact', head: true });
        if (error) throw error;
        questionsCountCache = { value: count || 0, at: now };
    } catch (e) {
        console.error('⚠️ Comptage des questions impossible:', e.message);
        questionsCountCache = { value: questionsCountCache.value || 0, at: now };
    }
    return questionsCountCache.value;
}

// 🔑 Code de salon — alphabet sans caractères ambigus (ni 0/O, ni 1/I/L)
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateRoomCode(length = 4) {
    let code = '';
    for (let i = 0; i < length; i++) {
        code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
    }
    return code;
}

// Émet game-ended et enregistre la partie dans l'historique.
// Toutes les fins de partie passent par ici — ne pas diffuser 'game-ended' directement.
function emitGameEnded(gameState, payload) {
    diffuser(gameState, 'game-ended', payload);
    recordFinishedGame({
        mode: gameState.lobbyMode,
        playersCount: gameState.initialPlayerCount || (payload.playersData || []).length,
        winnerName: payload.winner?.username || payload.winner?.name || null,
        duration: payload.duration,
    });
}

function emitBombanimeGameEnded(gameState, payload) {
    diffuser(gameState, 'bombanime-game-ended', payload);
    recordFinishedGame({
        mode: 'bombanime',
        playersCount: gameState.initialPlayerCount || (payload.ranking || []).length,
        winnerName: payload.winner?.username || null,
        duration: payload.duration,
    });
}

// Stats affichées sur la page d'accueil — toutes réelles.
app.get('/api/home-stats', async (req, res) => {
    res.json({
        playersOnline: io ? io.engine.clientsCount : 0,
        activeRooms: rooms.size,
        inGame: [...rooms.values()].reduce((n, r) => n + (r.inProgress ? r.players.size : 0), 0),
        questionsCount: await getQuestionsCount(),
        gamesPlayed: gamesPlayedTotal,
        recentGames,
    });
});


// L'état d'un salon, pour se remettre en phase après un rechargement.
// Le code est la seule clé : sans lui, il n'y a rien à raconter.
app.get('/game/state', (req, res) => {
    const gameState = roomParCode(req.query.code) || roomParJeton(req.get('X-Host-Token'));
    if (!gameState) {
        return res.json({ isActive: false, inProgress: false, playerCount: 0, players: [] });
    }

    let timeRemaining = null;
    if (gameState.questionStartTime && gameState.inProgress) {
        const elapsed = Math.floor((Date.now() - gameState.questionStartTime) / 1000);
        timeRemaining = Math.max(0, gameState.questionTime - elapsed);
    }
    
    // 🆕 Mettre à jour les compteurs d'équipe
    if (gameState.lobbyMode === 'rivalry') {
        updateTeamCounts(gameState);
        updateTeamScores(gameState); // 🆕 Calculer les scores d'équipe
    }
    
    // 💣🎴 Vérifier si le lobby BombAnime/Collect est plein
    const isBombanimeMode = gameState.lobbyMode === 'bombanime';
    const maxPlayers = isBombanimeMode ? BOMBANIME_CONFIG.MAX_PLAYERS : Infinity;
    const isLobbyFull = isBombanimeMode && gameState.players.size >= maxPlayers;

    // 🔥 Construire les données des joueurs avec leurs réponses
    const playersData = Array.from(gameState.players.values()).map(player => {
        // Chercher les bonus par twitchId
        let comboData = null;
        for (const [sid, bonusData] of gameState.playerBonuses.entries()) {
            const bonusPlayer = gameState.players.get(sid);
            if (bonusPlayer && bonusPlayer.twitchId === player.twitchId) {
                comboData = {
                    comboLevel: bonusData.comboLevel,
                    comboProgress: bonusData.comboProgress,
                    bonusInventory: bonusData.bonusInventory
                };
                break;
            }
        }

        // 🔥 NOUVEAU: Récupérer la réponse du joueur
        const playerAnswer = gameState.answers.get(player.socketId);

        return {
            socketId: player.socketId,
            twitchId: player.twitchId,
            username: player.username,
            title: player.title || 'Novice courageux',
            lives: gameState.mode === 'lives' ? player.lives : null,
            points: gameState.mode === 'points' ? (player.points || 0) : null,
            isLastGlobalWinner: player.twitchId === gameState.lastGlobalWinner,
            correctAnswers: player.correctAnswers,
            hasAnswered: !!playerAnswer,
            selectedAnswerIndex: playerAnswer?.answer || null,
            responseTime: playerAnswer?.time || null,
            comboData: comboData,
            team: player.team || null  // 🆕 Équipe du joueur
        };
    });

    // 🔥 Compter les réponses par option
    const answerCounts = {};
    gameState.liveAnswers.forEach((answerIndex) => {
        if (!answerCounts[answerIndex]) {
            answerCounts[answerIndex] = 0;
        }
        answerCounts[answerIndex]++;
    });

    res.json({
        isActive: gameState.isActive,
        roomCode: gameState.roomCode,
        inProgress: gameState.inProgress,
        currentQuestionIndex: gameState.currentQuestionIndex,
        playerCount: gameState.players.size,
        currentQuestion: gameState.currentQuestion,
        timeRemaining: timeRemaining,
        players: playersData,
        showResults: gameState.showResults,
        lastQuestionResults: gameState.lastQuestionResults,
        mode: gameState.mode,
        lives: gameState.lives,
        questionTime: gameState.questionTime,
        answersCount: gameState.answersCount,
        questionsCount: gameState.questionsCount,
        difficultyMode: gameState.difficultyMode,
        serieFilter: gameState.serieFilter,
        noSpoil: gameState.noSpoil, // 🚫 Filtre anti-spoil
        bonusEnabled: gameState.bonusEnabled, // 🎮 Bonus activés
        speedBonus: gameState.speedBonus, // ⚡ +500 au plus rapide (mode points)
        isTiebreaker: gameState.isTiebreaker,
        liveAnswerCounts: answerCounts,
        showingWinner: !!gameState.winnerScreenData,
        winnerScreenData: gameState.winnerScreenData,
        livesIcon: gameState.livesIcon,
        answeredCount: gameState.liveAnswers.size,
        autoMode: gameState.autoMode,
        // 🆕 Mode Rivalité
        lobbyMode: gameState.lobbyMode,
        teamNames: gameState.teamNames,
        teamCounts: gameState.teamCounts,
        teamScores: gameState.lobbyMode === 'rivalry' ? gameState.teamScores : null, // 🆕 Scores d'équipe
        // 💣 BombAnime - Lobby plein
        maxPlayers: maxPlayers,
        isLobbyFull: isLobbyFull,
        tiebreakerPlayers: gameState.isTiebreaker
            ? Array.from(gameState.players.values())
                .filter(p => gameState.tiebreakerPlayers.includes(p.twitchId))
                .map(p => ({ twitchId: p.twitchId, username: p.username }))
            : [],
        // 💣 Mode BombAnime
        bombanime: gameState.lobbyMode === 'bombanime' ? {
            active: gameState.bombanime.active,
            serie: gameState.bombanime.serie,
            timer: gameState.bombanime.timer,
            currentPlayerTwitchId: gameState.bombanime.currentPlayerTwitchId,
            playersOrder: gameState.bombanime.playersOrder,
            playersData: gameState.bombanime.active ? getBombanimePlayersData(gameState) : [],
            usedNamesCount: gameState.bombanime.usedNames.size,
            direction: gameState.bombanime.bombDirection,
            timeRemaining: gameState.bombanime.turnStartTime ? 
                Math.max(0, gameState.bombanime.timer - Math.floor((Date.now() - gameState.bombanime.turnStartTime) / 1000)) : 
                gameState.bombanime.timer
        } : null
    });
});

// ============================================
// Fichiers statiques (APRÈS les routes API)
// ============================================
// Le code (html, css, js) garde une revalidation par ETag : un déploiement doit
// être vu tout de suite, et le 304 ne coûte que quelques octets.
app.use(express.static('src/html'));
app.use(express.static('src/style'));
app.use(express.static('src/script'));

// Sons et images ne changent pas sans changer de nom : ils peuvent rester en cache
const MEDIA = { maxAge: '7d' };
app.use(express.static('src/sound', MEDIA));
app.use(express.static('src/img', MEDIA));
app.use(express.static('src/img/questionpic', MEDIA));
app.use(express.static('src/img/avatarpic', MEDIA));
app.use(express.static('src/img/avatar', MEDIA));




// Toute diffusion passe par ici : une partie ne parle qu'aux sockets de sa
// room. Les sockets y entrent en rejoignant le salon (socket.join).
function diffuser(gameState, evt, payload) {
    if (!gameState || !gameState.roomCode) return;
    if (payload === undefined) io.to(gameState.roomCode).emit(evt);
    else io.to(gameState.roomCode).emit(evt, payload);
}

// ============================================
// Les salons
// ============================================
// Une room = une partie complète et indépendante, rangée sous son code.
// Tout ce qui décrit une partie vit ici : rien d'autre au niveau du module.
const rooms = new Map();

function roomParCode(code) {
    if (!code) return null;
    return rooms.get(String(code).trim().toUpperCase()) || null;
}

// L'hôte ne se reconnaît qu'à son jeton : il est tiré à la création du salon
// et n'est renvoyé qu'à son créateur.
function roomParJeton(jeton) {
    if (!jeton) return null;
    for (const r of rooms.values()) if (r.hostToken === jeton) return r;
    return null;
}

function roomDeSocket(socket) {
    return roomParCode(socket.data && socket.data.roomCode);
}

// Rien n'empêchait d'ouvrir des salons en boucle. Le plafond est un garde-fou
// contre l'abus, pas un objectif : à cinquante salons pleins on aurait déjà
// changé d'hébergement.
const MAX_ROOMS = parseInt(process.env.MAX_ROOMS, 10) || 50;

// Avant de refuser, on récupère les salons que plus personne n'occupe : sinon
// cinquante ouvertures abandonnées bloqueraient le site dix minutes durant.
// ⚠️ Un salon qui vient d'ouvrir est vide : son hôte n'a pas encore eu le temps
// d'y entrer. Le récupérer serait lui prendre son salon sous les pieds.
const AGE_MINIMUM_RECUPERATION = 60 * 1000;

function libererSalonsVides() {
    const maintenant = Date.now();
    let n = 0;
    for (const r of [...rooms.values()]) {
        if (r.players.size || r.inProgress) continue;
        if (maintenant - r.creeA < AGE_MINIMUM_RECUPERATION) continue;
        fermerRoom(r);
        n++;
    }
    if (n) console.log(`🧹 ${n} salon(s) abandonné(s) libéré(s) pour faire de la place`);
    return n;
}

function creerRoom() {
    if (rooms.size >= MAX_ROOMS) {
        libererSalonsVides();
        if (rooms.size >= MAX_ROOMS) return null;
    }

    const gameState = etatNeuf();
    gameState.roomCode = generateRoomCode();
    gameState.hostToken = randomUUID();
    gameState.isActive = true;
    gameState.creeA = Date.now();
    rooms.set(gameState.roomCode, gameState);
    console.log(`✅ Salon ouvert : ${gameState.roomCode} (${rooms.size} au total)`);
    return gameState;
}

// Un salon vide ne s'annonce nulle part : sans ménage, il resterait en
// mémoire pour toujours. On laisse un délai de grâce — le temps qu'un hôte
// qui rafraîchit sa page revienne.
const GRACE_SALON_VIDE = parseInt(process.env.GRACE_SALON_VIDE, 10) || 10 * 60 * 1000;

setInterval(() => {
    const maintenant = Date.now();
    for (const r of [...rooms.values()]) {
        // Une partie dont plus personne n'est connecté est abandonnée, même si
        // ses joueurs restent inscrits en attendant un retour.
        const joueurs = [...r.players.values()];
        const desert = joueurs.length === 0 ||
            joueurs.every(p => p.disconnectedAt && maintenant - p.disconnectedAt > GRACE_SALON_VIDE);

        if (!desert) { r.videDepuis = null; continue; }
        if (!r.videDepuis) { r.videDepuis = maintenant; continue; }
        if (maintenant - r.videDepuis > GRACE_SALON_VIDE) {
            console.log(`🧹 Salon ${r.roomCode} sans personne depuis 10 min — fermé`);
            fermerRoom(r);
        }
    }
}, Math.min(60 * 1000, Math.max(1000, GRACE_SALON_VIDE)));

function fermerRoom(gameState) {
    if (!gameState) return;
    // Les minuteries d'une partie fermée continueraient de tourner dans le vide
    for (const t of ['rivalryTiebreakerTimeout', 'rivalryRevealTimeout',
                     'rivalryEndGameTimeout', 'autoModeTimeout']) {
        if (gameState[t]) clearTimeout(gameState[t]);
    }
    if (gameState.bombanime && gameState.bombanime.turnTimeout) clearTimeout(gameState.bombanime.turnTimeout);
    rooms.delete(gameState.roomCode);
    console.log(`❌ Salon fermé : ${gameState.roomCode} (${rooms.size} restant(s))`);
}

function etatNeuf() {
    return {
    // Ces sept-là étaient des variables de module. Elles décrivent pourtant une
    // partie précise : à plusieurs rooms, elles se seraient marché dessus.
    winnerScreenData: null,     // l'écran de victoire à rejouer pour qui arrive après
    activityLogs: [],           // le journal de la partie
    playerColors: {},           // une couleur par pseudo, le temps de la partie
    lastGlobalWinner: null,     // le vainqueur de la partie précédente, pour son liseré
    pendingJoins: new Set(),    // jointures en cours, contre les doubles arrivées
    lastStatsUpdate: 0,         // limitation du débit des stats en direct
    pendingStatsUpdate: false,
    lastRefreshPlayersTime: 0,  // délai entre deux rafraîchissements de la liste

    isActive: false,
    inProgress: false,
    currentGameId: null,
    currentQuestionIndex: 0,
    currentQuestion: null,
    players: new Map(),
    questionStartTime: null,
    answers: new Map(),
    gameStartTime: null,
    showResults: false,
    livesIcon: 'heart',
    lastQuestionResults: null,

    recentSeries: [],

    mode: 'lives',
    lives: 3,
    questionTime: 10,
    answersCount: 4,
    questionsCount: 20,
    usedQuestionIds: [],
    speedBonus: true, // 🆕 Bonus rapidité (500 pts au plus rapide en mode points)
    bonusEnabled: true, // 🎮 Bonus activés (jauge combo, bonus, défis)

    liveAnswers: new Map(),

    // Tiebreaker
    isTiebreaker: false,
    tiebreakerPlayers: [],
    isRivalryTiebreaker: false, // 🆕 Tiebreaker en mode Rivalité
    rivalryTiebreakerTimeout: null, // 🆕 Timeout pour le tiebreaker rivalry
    rivalryRevealTimeout: null, // 🆕 Timeout pour révéler les réponses du tiebreaker
    rivalryEndGameTimeout: null, // 🔥 Timeout pour endGameRivalryPoints (5s delay)

    difficultyMode: 'croissante',
    lastDifficulty: null,

    autoMode: false,
    autoModeTimeout: null,
    
    initialPlayerCount: 0, // Nombre de joueurs au début de la partie

    serieFilter: 'overall',
    noSpoil: false, // 🚫 Filtre anti-spoil (exclure les questions spoil)

    playerBonuses: new Map(),
    
    // 🆕 Mode Rivalité
    lobbyMode: 'classic', // 'classic' | 'rivalry' | 'bombanime'
    roomCode: null,       // 🔑 code du salon ouvert (phase 2 : cle de la Map des rooms)
    // Tiré à l'ouverture du salon et connu du seul créateur : c'est lui qui
    // distingue l'hôte de n'importe quel visiteur sur les routes /admin.
    hostToken: null,
    teamNames: { 1: 'Team A', 2: 'Team B' },
    teamCounts: { 1: 0, 2: 0 },
    teamScores: { 1: 0, 2: 0 }, // Vies restantes ou points totaux par équipe
    
    // 🆕 Système de défis
    activeChallenges: [],           // Les 3 défis de la partie actuelle
    playerChallenges: new Map(),     // Progression des défis par joueur
    
    // ============================================
    // 💣 BOMBANIME - État du mode
    // ============================================
    bombanime: {
        active: false,              // Mode BombAnime actif
        serie: 'Naruto',            // Série sélectionnée
        timer: 8,                   // Timer par défaut (secondes)
        playersOrder: [],           // Ordre des joueurs (twitchIds) dans le cercle
        currentPlayerIndex: 0,      // Index du joueur actuel dans playersOrder
        currentPlayerTwitchId: null,// TwitchId du joueur qui doit jouer
        usedNames: new Set(),       // Noms déjà utilisés dans la partie
        playerAlphabets: new Map(), // Map<twitchId, Set<lettre>> - Lettres collectées par joueur
        playerLastAnswers: new Map(), // Map<twitchId, string> - Dernière réponse de chaque joueur
        turnTimeout: null,          // Timeout du tour actuel
        turnId: 0,                  // Identifiant unique du tour (pour éviter race conditions)
        turnStartTime: null,        // Timestamp du début du tour
        lastValidName: null,        // Dernier nom validé
        bombDirection: 1,           // 1 = sens horaire, -1 = anti-horaire
        isPaused: false,            // Pause entre les tours
        eliminatedPlayers: [],      // Joueurs éliminés (pour affichage)
        // 🎯 DÉFIS BOMBANIME
        challenges: [],             // Les 2 défis [{id, letter, target, reward, name, description}]
        playerChallenges: new Map(), // Map<twitchId, {challenges: {id: {progress, target, completed}}, lettersGiven: Map}>
        playerBonuses: new Map()    // Map<twitchId, {freeCharacter: 0, extraLife: 0}>
        },
    };
}

// ============================================
// 🆕 HELPER - BROADCAST LOBBY UPDATE
// ============================================

function updateTeamCounts(gameState) {
    gameState.teamCounts = { 1: 0, 2: 0 };
    for (const player of gameState.players.values()) {
        if (player.team === 1) gameState.teamCounts[1]++;
        else if (player.team === 2) gameState.teamCounts[2]++;
    }
}

// 🆕 Calculer les scores d'équipe (vies restantes ou points totaux)
// Camp le moins peuplé, tiré au sort en cas d'égalité pour ne pas
// remplir toujours le même en premier.
function campLeMoinsFourni(gameState) {
    let a = 0, b = 0;
    for (const p of gameState.players.values()) {
        if (p.team === 1) a++;
        else if (p.team === 2) b++;
    }
    if (a < b) return 1;
    if (b < a) return 2;
    return Math.random() < 0.5 ? 1 : 2;
}

function updateTeamScores(gameState) {
    gameState.teamScores = { 1: 0, 2: 0 };
    
    for (const player of gameState.players.values()) {
        if (!player.team) continue;
        
        if (gameState.mode === 'lives') {
            // 🆕 Compter les joueurs encore en vie (lives > 0)
            if (player.lives > 0) {
                gameState.teamScores[player.team] += 1;
            }
        } else {
            // Additionner les points
            gameState.teamScores[player.team] += player.points || 0;
        }
    }
}

// 🆕 Vérifier si une équipe a gagné (mode rivalité)
function checkRivalryWinner(gameState) {
    if (gameState.lobbyMode !== 'rivalry') return null;
    
    updateTeamScores(gameState);
    
    if (gameState.mode === 'lives') {
        // En mode vie : une équipe gagne si l'autre a 0 vies
        const team1Alive = gameState.teamScores[1] > 0;
        const team2Alive = gameState.teamScores[2] > 0;
        
        if (!team1Alive && team2Alive) return 2;
        if (!team2Alive && team1Alive) return 1;
        if (!team1Alive && !team2Alive) return 'draw'; // Égalité (rare)
    }
    // En mode points : pas de victoire anticipée, on continue jusqu'à la fin
    
    return null;
}

function broadcastLobbyUpdate(gameState) {
    // Mettre à jour les compteurs d'équipe
    if (gameState.lobbyMode === 'rivalry') {
        updateTeamCounts(gameState);
    }
    
    // 💣🎴 Vérifier si le lobby BombAnime/Collect est plein
    const isBombanimeMode = gameState.lobbyMode === 'bombanime';
    const maxPlayers = isBombanimeMode ? BOMBANIME_CONFIG.MAX_PLAYERS : Infinity;
    const isLobbyFull = isBombanimeMode && gameState.players.size >= maxPlayers;
    
    diffuser(gameState, 'lobby-update', {
        playerCount: gameState.players.size,
        lives: gameState.lives,
        livesIcon: gameState.livesIcon,
        questionTime: gameState.questionTime,
        // Mode Rivalité
        lobbyMode: gameState.lobbyMode,
        teamNames: gameState.teamNames,
        teamCounts: gameState.teamCounts,
        // BombAnime/Collect - Lobby plein
        maxPlayers: maxPlayers,
        isLobbyFull: isLobbyFull,
        // Liste des joueurs
        players: Array.from(gameState.players.values()).map(p => ({
            twitchId: p.twitchId,
            username: p.username,
            lives: p.lives,
            title: p.title || 'Novice courageux',
            avatarUrl: p.avatarUrl,
            team: p.team || null,
            isLastGlobalWinner: p.twitchId === gameState.lastGlobalWinner,
        }))
    });
}

// ============================================
// 🆕 SYSTÈME DE DÉFIS
// ============================================

const CHALLENGE_POOLS = {
    // Pool 50/50 - Facile
    '5050': [
        { id: 'speed3s', name: 'Éclair', description: 'Bonne réponse en moins de 3s', target: 1, type: 'speed' },
        { id: 'streak3', name: 'Précis', description: '3 bonnes réponses d\'affilée', target: 3, type: 'streak' },
        { id: 'total5', name: 'Quintuplé', description: '5 bonnes réponses', target: 5, type: 'total' }
    ],
    // Pool Joker - Moyen
    'reveal': [
        { id: 'first', name: 'Rapide', description: 'Etre le plus rapide à bien répondre', target: 1, type: 'first' },
        { id: 'streak5', name: 'Déchaîné', description: '5 bonnes réponses d\'affilée', target: 5, type: 'streak' },
        { id: 'hard', name: 'Téméraire', description: 'Bien répondre à une question Hard', target: 1, type: 'difficulty' }
    ],
    // Pool Bouclier/x2 - Difficile
    'shield': [
        { id: 'veryhard', name: 'Expert', description: 'Bien répondre à question VeryHard+', target: 1, type: 'difficulty' },
        { id: 'series7', name: 'Polyvalent', description: 'Bien répondre sur 7 séries différentes', target: 7, type: 'series' },
        { id: 'streak12', name: 'Légendaire', description: '12 bonnes réponses d\'affilée', target: 12, type: 'streak' }
    ]
};

// Générer les 3 défis pour une partie
function generateChallenges(gameState) {
    const challenges = [];
    
    // 1. Tirer un défi 50/50
    const pool5050 = CHALLENGE_POOLS['5050'];
    const challenge5050 = { ...pool5050[Math.floor(Math.random() * pool5050.length)], reward: '5050' };
    challenges.push(challenge5050);
    
    // 2. Tirer un défi Joker
    const poolReveal = CHALLENGE_POOLS['reveal'];
    const challengeReveal = { ...poolReveal[Math.floor(Math.random() * poolReveal.length)], reward: 'reveal' };
    challenges.push(challengeReveal);
    
    // 3. Tirer un défi Bouclier/x2 (avec restriction si filtre actif)
    let poolShield = [...CHALLENGE_POOLS['shield']];
    
    // Option A : Exclure series7 si filtre ≠ overall/mainstream
    if (gameState.serieFilter !== 'overall' && gameState.serieFilter !== 'mainstream') {
        poolShield = poolShield.filter(c => c.id !== 'series7');
    }
    
    const challengeShield = { ...poolShield[Math.floor(Math.random() * poolShield.length)], reward: gameState.mode === 'lives' ? 'shield' : 'doublex2' };
    challenges.push(challengeShield);
    
    console.log(`🎯 Défis générés: ${challenges.map(c => c.id).join(', ')}`);
    return challenges;
}

// Initialiser la progression des défis pour un joueur
function initPlayerChallenges(gameState, socketId) {
    const progress = {
        challenges: {},
        currentStreak: 0,
        seriesAnswered: new Set()
    };
    
    // Initialiser chaque défi actif
    gameState.activeChallenges.forEach(challenge => {
        progress.challenges[challenge.id] = {
            progress: 0,
            target: challenge.target,
            completed: false
        };
    });
    
    gameState.playerChallenges.set(socketId, progress);
}

// Vérifier et mettre à jour les défis après une réponse
function checkChallenges(gameState, socketId, answerData) {
    const playerProgress = gameState.playerChallenges.get(socketId);
    if (!playerProgress) return [];
    
    const { correct, responseTime, difficulty, series, isFirst } = answerData;
    const completedChallenges = [];
    
    // Mettre à jour le streak
    if (correct) {
        playerProgress.currentStreak++;
        if (series) {
            playerProgress.seriesAnswered.add(series);
        }
    } else {
        playerProgress.currentStreak = 0;
    }
    
    // Vérifier chaque défi actif
    gameState.activeChallenges.forEach(challenge => {
        const cp = playerProgress.challenges[challenge.id];
        if (!cp || cp.completed) return;
        
        let progressMade = false;
        
        switch (challenge.type) {
            case 'speed':
                // Bonne réponse en moins de 3s
                if (correct && responseTime < 3000) {
                    cp.progress = 1;
                    progressMade = true;
                }
                break;
                
            case 'streak':
                // X bonnes réponses d'affilée
                if (correct) {
                    cp.progress = playerProgress.currentStreak;
                    progressMade = true;
                } else {
                    cp.progress = 0; // Reset à 0 si mauvaise réponse
                }
                break;
                
            case 'total':
                // X bonnes réponses au total
                if (correct) {
                    cp.progress++;
                    progressMade = true;
                }
                break;
                
            case 'first':
                // Premier à bien répondre
                if (correct && isFirst) {
                    cp.progress = 1;
                    progressMade = true;
                }
                break;
                
            case 'difficulty':
                // Réussir une question de difficulté spécifique
                if (correct) {
                    if (challenge.id === 'hard' && difficulty === 'hard') {
                        cp.progress = 1;
                        progressMade = true;
                    } else if (challenge.id === 'veryhard' && (difficulty === 'veryhard' || difficulty === 'extreme')) {
                        cp.progress = 1;
                        progressMade = true;
                    }
                }
                break;
                
            case 'series':
                // Réussir sur X séries différentes
                if (correct) {
                    cp.progress = playerProgress.seriesAnswered.size;
                    progressMade = true;
                }
                break;
        }
        
        // Vérifier si défi complété
        if (progressMade && cp.progress >= cp.target && !cp.completed) {
            cp.completed = true;
            completedChallenges.push({
                challengeId: challenge.id,
                reward: challenge.reward
            });
            console.log(`🏆 Défi "${challenge.name}" complété par ${socketId} ! Récompense: ${challenge.reward}`);
        }
    });
    
    return completedChallenges;
}

// Obtenir l'état des défis pour un joueur (pour envoi au client)
function getPlayerChallengesState(gameState, socketId) {
    const playerProgress = gameState.playerChallenges.get(socketId);
    if (!playerProgress) return [];
    
    return gameState.activeChallenges.map(challenge => {
        const cp = playerProgress.challenges[challenge.id];
        return {
            id: challenge.id,
            name: challenge.name,
            description: challenge.description,
            reward: challenge.reward,
            progress: cp ? cp.progress : 0,
            target: challenge.target,
            completed: cp ? cp.completed : false
        };
    });
}

const authenticatedUsers = new Map();

// ============================================
// Helpers
// ============================================

// 🆕 Vérifie si on doit appliquer le cooldown de série
function shouldApplySerieCooldown(gameState) {
    return gameState.serieFilter === 'overall' || gameState.serieFilter === 'mainstream';
}

// 🆕 Ajoute une série à l'historique récent (garde les 5 dernières)
function addToRecentSeries(gameState, serie) {
    if (!shouldApplySerieCooldown(gameState)) return;

    gameState.recentSeries.push(serie);
    if (gameState.recentSeries.length > 5) {
        gameState.recentSeries.shift(); // Retirer la plus ancienne
    }
    console.log(`📚 Séries récentes: [${gameState.recentSeries.join(', ')}]`);
}


function getDifficultyForQuestion(gameState, questionNumber) {
    if (gameState.difficultyMode === 'aleatoire') {
        // 🆕 MODE ALÉATOIRE PONDÉRÉ - sqrt des tailles de pool pour un entre-deux équilibré
        // Poids approximatifs basés sur les pools (recalculés dynamiquement serait mieux mais ça suffit)
        const difficultyWeights = {
            veryeasy: Math.sqrt(98),   // ~9.9
            easy: Math.sqrt(178),      // ~13.3
            medium: Math.sqrt(208),    // ~14.4
            hard: Math.sqrt(195),      // ~14.0
            veryhard: Math.sqrt(115),  // ~10.7
            extreme: Math.sqrt(10)     // ~3.2 → ~5%
        };
        // Résultat approx: veryeasy 15.1%, easy 20.3%, medium 22.0%, hard 21.4%, veryhard 16.3%, extreme ~5%
        
        const difficulties = Object.keys(difficultyWeights);
        
        // Filtrer pour éviter la dernière difficulté utilisée
        const available = gameState.lastDifficulty
            ? difficulties.filter(d => d !== gameState.lastDifficulty)
            : difficulties;
        
        // Tirage pondéré
        const totalWeight = available.reduce((sum, d) => sum + difficultyWeights[d], 0);
        let roll = Math.random() * totalWeight;
        let picked = available[0];
        for (const d of available) {
            roll -= difficultyWeights[d];
            if (roll <= 0) { picked = d; break; }
        }
        
        gameState.lastDifficulty = picked;
        return picked;
    }

    // MODE CROISSANTE (logique actuelle)
    if (gameState.mode === 'lives') {
        if (questionNumber <= 5) return 'veryeasy';
        if (questionNumber <= 12) return 'easy';
        if (questionNumber <= 25) return 'medium';
        if (questionNumber <= 35) return 'hard';
        if (questionNumber <= 45) return 'veryhard';
        return 'extreme';
    } else {
        const distribution = getQuestionDistribution(gameState.questionsCount);
        let cumulative = 0;
        const difficulties = ['veryeasy', 'easy', 'medium', 'hard', 'veryhard', 'extreme'];

        for (const diff of difficulties) {
            cumulative += distribution[diff];
            if (questionNumber <= cumulative) {
                return diff;
            }
        }
        return 'extreme';
    }
}

function getAlivePlayers(gameState) {
    return Array.from(gameState.players.values()).filter(p => p.lives > 0);
}

function getEliminatedCount(gameState) {
    return Array.from(gameState.players.values()).filter(p => p.lives === 0).length;
}



// 🧪 Page de travail : prototypes de mise en page de l'accueil
app.get('/prototypes', (req, res) => {
    res.sendFile(__dirname + '/src/html/prototypes.html');
});

app.get('/prototypes/boutons', (req, res) => {
    res.sendFile(__dirname + '/src/html/prototypes-boutons.html');
});

app.get('/prototypes/modes', (req, res) => {
    res.sendFile(__dirname + '/src/html/prototypes-modes.html');
});

app.get('/prototypes/modes-2', (req, res) => {
    res.sendFile(__dirname + '/src/html/prototypes-modes2.html');
});

app.get('/prototypes/jeu', (req, res) => {
    res.sendFile(__dirname + '/src/html/prototypes-jeu.html');
});

app.get('/prototypes/lobby-mobile', (req, res) => {
    res.sendFile(__dirname + '/src/html/prototypes-lobby-mobile.html');
});

app.get('/prototypes/boutons-mobile', (req, res) => {
    res.sendFile(__dirname + '/src/html/prototypes-boutons-mobile.html');
});

app.get('/prototypes/reveal', (req, res) => {
    res.sendFile(__dirname + '/src/html/prototypes-reveal.html');
});

app.get('/prototypes/podium', (req, res) => {
    res.sendFile(__dirname + '/src/html/prototypes-podium.html');
});

app.get('/prototypes/stats', (req, res) => {
    res.sendFile(__dirname + '/src/html/prototypes-stats.html');
});

app.get('/prototypes/points', (req, res) => {
    res.sendFile(__dirname + '/src/html/prototypes-points.html');
});

app.get('/prototypes/coeurs', (req, res) => {
    res.sendFile(__dirname + '/src/html/prototypes-coeurs.html');
});

app.get('/prototypes/hud', (req, res) => {
    res.sendFile(__dirname + '/src/html/prototypes-hud.html');
});

app.get('/prototypes/vies', (req, res) => {
    res.sendFile(__dirname + '/src/html/prototypes-vies.html');
});

app.get('/prototypes/timer', (req, res) => {
    res.sendFile(__dirname + '/src/html/prototypes-timer.html');
});

app.get('/prototypes/effets', (req, res) => {
    res.sendFile(__dirname + '/src/html/prototypes-effets.html');
});

app.get('/prototypes/lancer', (req, res) => {
    res.sendFile(__dirname + '/src/html/prototypes-lancer.html');
});

app.get('/prototypes/parametres', (req, res) => {
    res.sendFile(__dirname + '/src/html/prototypes-parametres.html');
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/src/html/home.html');
});

// ============================================
// Routes de contrôle (appelées par l'hôte depuis /)
// ============================================

// ════════════════════════════════════════════
// 🔐 RÉSERVÉ À L'HÔTE
// Ces routes pilotaient le panel /admin, qui n'existe plus. Sans contrôle,
// n'importe quel visiteur pouvait fermer ou saboter la partie en cours —
// il n'y en a qu'une sur tout le serveur.
// ════════════════════════════════════════════
app.use('/admin', (req, res, next) => {
    // Le jeton désigne l'hôte ET son salon : plus besoin de le chercher ensuite
    req.room = roomParJeton(req.get('X-Host-Token'));

    // Ouvrir un salon, c'est précisément ce qu'on fait avant d'avoir un jeton.
    // Mais un jeton présenté et non reconnu reste une erreur : sans ce test,
    // l'hôte dont le salon a disparu en ouvrait un neuf en cliquant « fermer ».
    if (req.path === '/toggle-game' && !req.get('X-Host-Token')) return next();

    if (!req.room) {
        return res.status(403).json({ error: "Réservé à l'hôte du salon" });
    }
    next();
});

app.get('/admin/game-state', (req, res) => {
    const gameState = req.room;   // posée par le garde-fou d'hôte
    // 💣🎴 Vérifier si le lobby BombAnime/Collect est plein
    const isBombanimeMode = gameState.lobbyMode === 'bombanime';
    const maxPlayers = isBombanimeMode ? BOMBANIME_CONFIG.MAX_PLAYERS : Infinity;
    const isLobbyFull = isBombanimeMode && gameState.players.size >= maxPlayers;

    res.json({
        isActive: gameState.isActive,
        roomCode: gameState.roomCode,
        phase: gameState.inProgress ? 'playing' : (gameState.isActive ? 'lobby' : 'idle'),
        players: Array.from(gameState.players.values()).map(p => ({
            username: p.username,
            twitch_id: p.twitchId,
            twitchId: p.twitchId,
            title: p.title || 'Novice courageux',
            isChampion: p.twitchId === gameState.lastGlobalWinner
        })),
        playerCount: gameState.players.size,
        lobbyMode: gameState.lobbyMode,
        maxPlayers: maxPlayers,
        isLobbyFull: isLobbyFull
    });
});

// Ouvrir ou fermer un salon.
// Sans jeton : on en crée un et son créateur en devient l'hôte.
// Avec jeton : on ferme le sien, et lui seul.
app.post('/admin/toggle-game', async (req, res) => {
    if (req.room) {
        const gameState = req.room;
        console.log(`❌ Salon ${gameState.roomCode} fermé par son hôte`);
        diffuser(gameState, 'game-deactivated');
        for (const s of io.sockets.adapter.rooms.get(gameState.roomCode) || []) {
            const sock = io.sockets.sockets.get(s);
            if (sock) { sock.leave(gameState.roomCode); sock.data.roomCode = null; }
        }
        fermerRoom(gameState);
        return res.json({ isActive: false });
    }

    const gameState = creerRoom();
    if (!gameState) {
        return res.status(503).json({
            error: 'Trop de salons ouverts en ce moment — réessaie dans un instant.',
        });
    }

    // 🆕 Récupérer le mode et les noms d'équipe depuis la requête
    const { lobbyMode, teamNames, bombanimeSerie, bombanimeTimer, bombanimeLives } = req.body || {};
    gameState.lobbyMode = lobbyMode || 'classic';
    if (teamNames) gameState.teamNames = teamNames;

    // 💣 Configuration BombAnime
    if (lobbyMode === 'bombanime') {
        gameState.bombanime.serie = bombanimeSerie || 'Naruto';
        gameState.bombanime.timer = bombanimeTimer || BOMBANIME_CONFIG.DEFAULT_TIMER;
        gameState.bombanime.lives = bombanimeLives || BOMBANIME_CONFIG.DEFAULT_LIVES;
    }

    console.log(`🎮 Mode: ${gameState.lobbyMode}${gameState.lobbyMode === 'bombanime' ? ` (${gameState.bombanime.serie})` : ''}`);

    // Le jeton ne part qu'ici, dans la réponse à celui qui vient d'ouvrir
    res.json({ isActive: true, roomCode: gameState.roomCode, hostToken: gameState.hostToken });
});

// 💣 Mettre à jour la série BombAnime
app.post('/admin/bombanime/update-serie', (req, res) => {
    const gameState = req.room;   // posée par le garde-fou d'hôte
    
    const { serie } = req.body;
    
    if (!serie) {
        return res.status(400).json({ error: 'Série manquante' });
    }
    
    // Vérifier que la série existe
    if (!BOMBANIME_CHARACTERS[serie]) {
        return res.status(400).json({ error: 'Série inconnue' });
    }
    
    gameState.bombanime.serie = serie;
    console.log(`💣 Série BombAnime mise à jour: ${serie} (${BOMBANIME_CHARACTERS[serie].length} personnages)`);
    
    // Notifier les joueurs du changement de série
    diffuser(gameState, 'bombanime-serie-updated', { 
        serie: serie,
        characterCount: BOMBANIME_CHARACTERS[serie].length 
    });
    
    res.json({ success: true, serie: serie });
});

// 💣 Fermer le lobby BombAnime spécifiquement
app.post('/admin/bombanime/close-lobby', (req, res) => {
    const gameState = req.room;   // posée par le garde-fou d'hôte
    
    // Fermer le lobby
    gameState.isActive = false;
    gameState.inProgress = false;
    
    // Reset BombAnime
    resetBombanimeState(gameState);
    
    
    // Reset gameState.winnerScreenData
    gameState.winnerScreenData = null;
    
    // Vider les joueurs
    gameState.players.clear();
    
    // Notifier les clients
    diffuser(gameState, 'game-deactivated');
    diffuser(gameState, 'bombanime-lobby-closed');
    diffuser(gameState, 'collect-state', { active: false });
    
    console.log('🔒 Lobby fermé (BombAnime/Collect reset)');
    res.json({ success: true });
});

// ============================================
// 📝 BOMBANIME SUGGESTIONS ROUTES
// ============================================

// Créer une nouvelle suggestion
app.post('/admin/bombanime/suggestion', async (req, res) => {
    
    try {
        const { type, anime, characterName, variantOf, details } = req.body;
        
        if (!type || !anime || !characterName) {
            return res.status(400).json({ error: 'Champs requis manquants' });
        }
        
        const suggestion = await db.createSuggestion({
            type,
            anime,
            characterName: characterName.toUpperCase().trim(),
            variantOf: variantOf ? variantOf.toUpperCase().trim() : null,
            details,
            submittedBy: 'Host'
        });
        
        res.json({ success: true, suggestion });
    } catch (error) {
        console.error('Erreur création suggestion:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// 🎌 Suggestion joueur (1x par partie, pas de variante)
app.post('/bombanime/player-suggestion', async (req, res) => {
    try {
        const { anime, characterName, submittedBy } = req.body;
        
        if (!anime || !characterName || !submittedBy) {
            return res.status(400).json({ error: 'Champs requis manquants' });
        }
        
        const suggestion = await db.createSuggestion({
            type: 'add',
            anime,
            characterName: characterName.toUpperCase().trim(),
            variantOf: null,
            details: null,
            submittedBy: `[Player] ${submittedBy}`
        });
        
        res.json({ success: true, suggestion });
    } catch (error) {
        console.error('Erreur suggestion joueur:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Récupérer les suggestions
app.get('/admin/bombanime/suggestions', async (req, res) => {
    
    try {
        const { status } = req.query;
        const suggestions = await db.getSuggestions(status || null);
        const counts = await db.getSuggestionsCount();
        
        res.json({ suggestions, counts });
    } catch (error) {
        console.error('Erreur récupération suggestions:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Mettre à jour le statut d'une suggestion
app.post('/admin/bombanime/suggestion/:id/status', async (req, res) => {
    
    try {
        const { id } = req.params;
        const { status, adminNotes } = req.body;
        
        if (!['pending', 'approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Statut invalide' });
        }
        
        const suggestion = await db.updateSuggestionStatus(parseInt(id), status, adminNotes);
        res.json({ success: true, suggestion });
    } catch (error) {
        console.error('Erreur mise à jour suggestion:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Supprimer une suggestion
app.delete('/admin/bombanime/suggestion/:id', async (req, res) => {
    
    try {
        const { id } = req.params;
        await db.deleteSuggestion(parseInt(id));
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur suppression suggestion:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Récupérer la liste des animes disponibles pour les suggestions
app.get('/admin/bombanime/animes', (req, res) => {
    
    const animes = Object.keys(BOMBANIME_CHARACTERS).map(key => ({
        key,
        count: BOMBANIME_CHARACTERS[key].length
    }));
    
    res.json({ animes });
});

// Mettre à jour les paramètres du jeu (vies et temps)
app.post('/admin/update-settings', (req, res) => {
    const gameState = req.room;   // posée par le garde-fou d'hôte

    const { lives, timePerQuestion } = req.body;

    if (lives) {
        gameState.lives = parseInt(lives);
    }
    if (timePerQuestion) {
        gameState.questionTime = parseInt(timePerQuestion);
    }

    console.log(`⚙️ Paramètres mis à jour: ${gameState.lives}❤️ - ${gameState.questionTime}s`);

    // Notifier tous les clients des nouveaux paramètres
    diffuser(gameState, 'game-config-updated', {
        lives: gameState.lives,
        questionTime: gameState.questionTime
    });

    res.json({
        success: true,
        lives: gameState.lives,
        questionTime: gameState.questionTime
    });
});

// Route séparée pour changer les vies
app.post('/admin/set-lives', (req, res) => {
    const gameState = req.room;   // posée par le garde-fou d'hôte

    const { lives } = req.body;
    gameState.lives = parseInt(lives);

    console.log(`⚙️ Vies mises à jour: ${gameState.lives}❤️`);

    // Mettre à jour les vies de tous les joueurs déjà connectés dans le lobby
    if (!gameState.inProgress && gameState.players.size > 0) {
        gameState.players.forEach(player => {
            player.lives = gameState.lives;
        });

        // Notifier l'admin pour rafraîchir la grille joueurs
        broadcastLobbyUpdate(gameState);

        console.log(`✅ Vies mises à jour pour ${gameState.players.size} joueur(s) dans le lobby`);
    }

    res.json({ success: true, lives: gameState.lives });
});

// Route séparée pour changer le temps par question
app.post('/admin/set-time', (req, res) => {
    const gameState = req.room;   // posée par le garde-fou d'hôte

    const { time } = req.body;
    gameState.questionTime = parseInt(time);

    console.log(`⚙️ Temps par question mis à jour: ${gameState.questionTime}s`);

    // Notifier tous les clients du nouveau temps
    diffuser(gameState, 'game-config-updated', {
        lives: gameState.lives,
        questionTime: gameState.questionTime
    });

    res.json({ success: true, questionTime: gameState.questionTime });
});

// Route séparée pour changer le nombre de réponses
app.post('/admin/set-answers', (req, res) => {
    const gameState = req.room;   // posée par le garde-fou d'hôte

    const { answers } = req.body;
    gameState.answersCount = parseInt(answers);

    console.log(`⚙️ Nombre de réponses mis à jour: ${gameState.answersCount}`);

    // Notifier tous les clients du nouveau paramètre
    diffuser(gameState, 'game-config-updated', {
        lives: gameState.lives,
        questionTime: gameState.questionTime,
        answersCount: gameState.answersCount
    });

    res.json({ success: true, answersCount: gameState.answersCount });
});

// Démarrer une partie
app.post('/admin/start-game', async (req, res) => {
    const gameState = req.room;   // posée par le garde-fou d'hôte

    if (gameState.inProgress) {
        return res.status(400).json({ error: 'Partie déjà en cours' });
    }

    const totalPlayers = gameState.players.size;
    if (totalPlayers === 0) {
        return res.status(400).json({
            success: false,
            error: 'Impossible de démarrer : aucun joueur dans le lobby'
        });
    }
    
    // 🆕 Minimum 2 joueurs pour lancer une partie
    if (totalPlayers < 2) {
        return res.status(400).json({
            success: false,
            error: 'Impossible de démarrer : minimum 2 joueurs requis'
        });
    }

    // 💣 MODE BOMBANIME - Démarrage spécial
    if (gameState.lobbyMode === 'bombanime') {
        // Récupérer les paramètres envoyés
        const { bombanimeLives, bombanimeTimer, bombanimeSerie } = req.body || {};
        
        // Mettre à jour la série si fournie
        if (bombanimeSerie && BOMBANIME_CHARACTERS[bombanimeSerie]) {
            gameState.bombanime.serie = bombanimeSerie;
            console.log(`💣 Série BombAnime: ${gameState.bombanime.serie}`);
        }
        
        // Mettre à jour les paramètres si fournis
        if (bombanimeLives) {
            gameState.bombanime.lives = parseInt(bombanimeLives);
            console.log(`💣 Vies BombAnime mises à jour: ${gameState.bombanime.lives}`);
        }
        if (bombanimeTimer) {
            gameState.bombanime.timer = parseInt(bombanimeTimer);
            console.log(`💣 Timer BombAnime mis à jour: ${gameState.bombanime.timer}s`);
        }
        
        // Vérifier les limites de joueurs
        if (totalPlayers > BOMBANIME_CONFIG.MAX_PLAYERS) {
            return res.status(400).json({
                success: false,
                error: `Maximum ${BOMBANIME_CONFIG.MAX_PLAYERS} joueurs en mode BombAnime`
            });
        }
        
        try {
            const result = await startBombanimeGame(gameState);
            if (result.success) {
                return res.json({ success: true, mode: 'bombanime' });
            } else {
                return res.status(400).json({ success: false, error: result.error });
            }
        } catch (error) {
            console.error('❌ Erreur démarrage BombAnime:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }


    // 🆕 Vérifier que les deux équipes ont des joueurs en mode Rivalité
    if (gameState.lobbyMode === 'rivalry') {
        let team1Count = 0;
        let team2Count = 0;
        
        gameState.players.forEach(player => {
            if (player.team === 1) team1Count++;
            else if (player.team === 2) team2Count++;
        });
        
        console.log(`🔍 Vérification équipes: Team A = ${team1Count}, Team B = ${team2Count}`);
        
        if (team1Count === 0 || team2Count === 0) {
            const emptyTeam = team1Count === 0 ? gameState.teamNames[1] : gameState.teamNames[2];
            return res.status(400).json({
                success: false,
                error: `Impossible de démarrer : l'équipe "${emptyTeam}" n'a aucun joueur`,
                errorType: 'empty_team'
            });
        }
    }

    try {
        // 📝 Historique des questions : il court sur tout le salon, pas sur une
        // seule manche. Tant que l'hôte enchaîne, une question déjà servie ne
        // revient pas. Il repart à zéro quand le salon ferme.

        gameState.inProgress = true;
        gameState.currentGameId = null;
        gameState.initialPlayerCount = totalPlayers; // 🆕 Stocker le nombre initial
        gameState.currentQuestionIndex = 0;
        gameState.gameStartTime = Date.now();
        gameState.showResults = false;
        gameState.lastQuestionResults = null;
        gameState.recentSeries = [];
        
        // 🔥 FIX: Reset des flags tiebreaker (pouvaient rester à true si l'admin a fermé le lobby pendant un tiebreaker)
        gameState.isTiebreaker = false;
        gameState.tiebreakerPlayers = [];
        gameState.isRivalryTiebreaker = false;
        
        // 🔥 FIX: Annuler les timeouts stale de la partie précédente
        if (gameState.autoModeTimeout) {
            clearTimeout(gameState.autoModeTimeout);
            gameState.autoModeTimeout = null;
        }
        if (gameState.rivalryTiebreakerTimeout) {
            clearTimeout(gameState.rivalryTiebreakerTimeout);
            gameState.rivalryTiebreakerTimeout = null;
        }
        if (gameState.rivalryRevealTimeout) {
            clearTimeout(gameState.rivalryRevealTimeout);
            gameState.rivalryRevealTimeout = null;
        }
        if (gameState.rivalryEndGameTimeout) {
            clearTimeout(gameState.rivalryEndGameTimeout);
            gameState.rivalryEndGameTimeout = null;
        }

        const playerCount = gameState.players.size;
        addLog(gameState, 'game-start', { playerCount });

        gameState.playerBonuses.clear();
        console.log('🔄 Bonus reset pour nouvelle partie');

        // 🆕 Générer les défis pour cette partie (seulement si bonus activés)
        if (gameState.bonusEnabled) {
            gameState.activeChallenges = generateChallenges(gameState);
            gameState.playerChallenges.clear();
            console.log('🎯 Défis initialisés pour la partie');
        } else {
            gameState.activeChallenges = [];
            gameState.playerChallenges.clear();
            console.log('🎮 Bonus désactivés — pas de défis ni de jauge combo');
        }

        // Initialiser les joueurs selon le mode
        gameState.players.forEach((player, socketId) => {
            if (gameState.mode === 'lives') {
                player.lives = gameState.lives;
                player.correctAnswers = 0;
            } else {
                player.points = 0;
            }

            // 🆕 Initialiser les bonus du joueur avec inventaire (seulement si bonus activés)
            if (gameState.bonusEnabled) {
                gameState.playerBonuses.set(socketId, {
                    comboLevel: 0,
                    comboProgress: 0,
                    bonusInventory: { '5050': 0, 'reveal': 0, 'shield': 0, 'doublex2': 0 }
                });

                // 🆕 Initialiser les défis du joueur
                initPlayerChallenges(gameState, socketId);
            }
        });

        console.log(`🎮 Partie démarrée (Mode: ${gameState.mode.toUpperCase()}) - ${totalPlayers} joueurs - Filtre: ${gameState.serieFilter}`);

        // Les sockets de ce salon, et elles seules : io.sockets.sockets couvre
        // tout le serveur, et annonçait donc ce démarrage aux autres parties.
        for (const socketId of io.sockets.adapter.rooms.get(gameState.roomCode) || []) {
            const socket = io.sockets.sockets.get(socketId);
            if (!socket) continue;
            const player = gameState.players.get(socketId);

            if (player) {
                socket.emit('game-started', {
                    totalPlayers,
                    isParticipating: true,
                    gameMode: gameState.mode,
                    questionsCount: gameState.mode === 'points' ? gameState.questionsCount : null,
                    challenges: getPlayerChallengesState(gameState, socketId), // 🆕 Envoyer les défis
                    // 🆕 Mode Rivalité
                    lobbyMode: gameState.lobbyMode,
                    teamNames: gameState.teamNames,
                    playerTeam: player.team || null,
                    bonusEnabled: gameState.bonusEnabled // 🎮 Bonus activés
                });
            } else {
                socket.emit('game-started', {
                    totalPlayers,
                    isParticipating: false,
                    gameMode: gameState.mode,
                    // 🆕 Mode Rivalité
                    lobbyMode: gameState.lobbyMode,
                    teamNames: gameState.teamNames,
                    bonusEnabled: gameState.bonusEnabled // 🎮 Bonus activés
                });
            }
        }

        // La première question part immédiatement : l'écran « c'est parti » n'existe plus.
        // On garde un souffle de 250 ms, le temps que les clients traitent game-started.
        setTimeout(async () => {
            try {
                gameState.currentQuestionIndex = 1;

                const difficulty = getDifficultyForQuestion(gameState, 1);
                const questions = await db.getRandomQuestions(
                    difficulty,
                    1,
                    gameState.usedQuestionIds,
                    gameState.serieFilter,
                    shouldApplySerieCooldown(gameState) ? gameState.recentSeries : [],
                    gameState.noSpoil  // 🚫 Filtre anti-spoil
                );

                if (questions.length === 0) {
                    console.error('❌ Aucune question disponible');
                    return;
                }

                const question = questions[0];
                addToRecentSeries(gameState, question.serie);
                gameState.usedQuestionIds.push(question.id);

                console.log(`📌 Question 1 - Difficulté: ${difficulty}`);

                const allAnswers = [
                    { text: question.answer1, index: 1 },
                    { text: question.answer2, index: 2 },
                    { text: question.answer3, index: 3 },
                    { text: question.answer4, index: 4 },
                    { text: question.answer5, index: 5 },
                    { text: question.answer6, index: 6 }
                ].filter(answer => answer.text !== null && answer.text !== '');

                const correctAnswerObj = allAnswers.find(a => a.index === question.coanswer);
                const wrongAnswers = allAnswers.filter(a => a.index !== question.coanswer);
                const wrongAnswersNeeded = gameState.answersCount - 1;
                const shuffledWrong = wrongAnswers.sort(() => 0.5 - Math.random()).slice(0, wrongAnswersNeeded);
                const selectedAnswers = [correctAnswerObj, ...shuffledWrong];
                const finalAnswers = selectedAnswers.sort(() => 0.5 - Math.random());
                const newCorrectIndex = finalAnswers.findIndex(a => a.index === question.coanswer) + 1;

                const questionData = {
                    questionNumber: 1,
                    totalQuestions: gameState.mode === 'points' ? gameState.questionsCount : null,
                    questionId: question.id,
                    question: question.question,
                    answers: finalAnswers.map(a => a.text),
                    serie: question.serie,
                    difficulty: question.difficulty,
                    timeLimit: gameState.questionTime,
                    proof_url: question.proof_url || null
                };

                gameState.currentQuestion = {
                    ...questionData,
                    correctAnswer: newCorrectIndex,
                    difficulty: question.difficulty
                };

                gameState.questionStartTime = Date.now();
                gameState.showResults = false;
                gameState.lastQuestionResults = null;
                gameState.answers.clear();
                gameState.liveAnswers.clear();

                addLog(gameState, 'question', {
                    questionNumber: 1,
                    difficulty: difficulty,
                    series: question.serie
                });

                // Envoyer la question aux joueurs
                diffuser(gameState, 'new-question', questionData);

                // Timer pour révéler les réponses
                setTimeout(() => {
                    if (gameState.inProgress) {
                        revealAnswers(gameState, newCorrectIndex);
                    }
                }, gameState.questionTime * 1000);

            } catch (error) {
                console.error('❌ Erreur envoi première question:', error);
            }
        }, 650);

        res.json({ success: true, mode: gameState.mode });

    } catch (error) {
        console.error('❌ Erreur démarrage partie:', error);
        res.status(500).json({ error: error.message });
    }
});


// Route pour changer le mode de jeu
app.post('/admin/set-mode', (req, res) => {
    const gameState = req.room;   // posée par le garde-fou d'hôte

    // Bloquer si une partie est en cours
    if (gameState.inProgress) {
        return res.status(400).json({
            error: 'Impossible de changer le mode pendant une partie',
            blocked: true
        });
    }

    const { mode } = req.body;

    if (!['lives', 'points'].includes(mode)) {
        return res.status(400).json({ error: 'Mode invalide' });
    }

    gameState.mode = mode;
    console.log(`⚙️ Mode de jeu changé: ${mode}`);

    // Mettre à jour tous les joueurs déjà dans le lobby
    if (gameState.players.size > 0) {
        gameState.players.forEach(player => {
            if (mode === 'lives') {
                player.lives = gameState.lives;
                player.correctAnswers = 0;
                delete player.points;
            } else {
                player.points = 0;
                delete player.lives;
                delete player.correctAnswers;
            }
        });

        console.log(`✅ ${gameState.players.size} joueur(s) mis à jour pour le mode ${mode}`);
    }

    diffuser(gameState, 'game-config-updated', {
        mode: gameState.mode,
        lives: gameState.lives,
        questionTime: gameState.questionTime,
        answersCount: gameState.answersCount,
        questionsCount: gameState.questionsCount
    });

    broadcastLobbyUpdate(gameState);

    res.json({ success: true, mode: gameState.mode });
});

// Route pour changer le nombre de questions (Mode Points)
app.post('/admin/set-questions', (req, res) => {
    const gameState = req.room;   // posée par le garde-fou d'hôte

    const { questions } = req.body;
    const validCounts = [15, 20, 25, 30, 35, 40, 45, 50];

    if (!validCounts.includes(parseInt(questions))) {
        return res.status(400).json({ error: 'Nombre de questions invalide' });
    }

    gameState.questionsCount = parseInt(questions);
    console.log(`⚙️ Nombre de questions mis à jour: ${gameState.questionsCount}`);

    diffuser(gameState, 'game-config-updated', {
        mode: gameState.mode,
        lives: gameState.lives,
        questionTime: gameState.questionTime,
        answersCount: gameState.answersCount,
        questionsCount: gameState.questionsCount
    });

    res.json({ success: true, questionsCount: gameState.questionsCount });
});

// 🆕 v2 — Passer le salon en équipes, ou revenir en solo.
// Classique et Rivalité sont le même quiz : seul le décompte diffère. On bascule
// donc en cours de salon plutôt que d'imposer le choix à la création.
app.post('/admin/set-teams', (req, res) => {
    const gameState = req.room;   // posée par le garde-fou d'hôte
    if (!gameState.isActive) {
        return res.status(400).json({ error: 'Aucun salon ouvert' });
    }
    if (gameState.inProgress) {
        return res.status(400).json({ error: 'Partie déjà en cours' });
    }
    if (gameState.lobbyMode === 'bombanime') {
        return res.status(400).json({ error: 'Sans objet en BombAnime' });
    }

    const enEquipes = req.body && req.body.enabled === true;
    gameState.lobbyMode = enEquipes ? 'rivalry' : 'classic';

    // En sortant, un camp resté collé fausserait les comptes. En entrant, on
    // répartit tout de suite en alternance plutôt que de laisser tout le monde sans camp.
    let i = 0;
    gameState.players.forEach((p, socketId) => {
        p.team = enEquipes ? (i++ % 2) + 1 : null;
        const sock = io.sockets.sockets.get(socketId);
        if (sock) sock.emit('team-changed', { newTeam: p.team });
    });
    gameState.teamScores = { 1: 0, 2: 0 };
    updateTeamCounts(gameState);

    console.log(`👥 Salon en ${enEquipes ? 'équipes' : 'solo'}`);

    diffuser(gameState, 'teams-toggled', {
        lobbyMode: gameState.lobbyMode,
        teamNames: gameState.teamNames,
    });
    broadcastLobbyUpdate(gameState);

    res.json({ success: true, lobbyMode: gameState.lobbyMode });
});

// 🆕 v2 — L'hôte attribue les camps. Un joueur ne choisit plus le sien.
app.post('/admin/set-player-team', (req, res) => {
    const gameState = req.room;   // posée par le garde-fou d'hôte
    if (!gameState.isActive) return res.status(400).json({ error: 'Aucun salon ouvert' });
    if (gameState.inProgress) return res.status(400).json({ error: 'Partie déjà en cours' });

    const { twitchId, team } = req.body || {};
    if (!twitchId) return res.status(400).json({ error: 'Joueur manquant' });

    const camp = team === 1 || team === 2 ? team : null;
    let trouve = null;
    for (const [socketId, p] of gameState.players.entries()) {
        if (p.twitchId === twitchId) { p.team = camp; trouve = { socketId, p }; break; }
    }
    if (!trouve) return res.status(404).json({ error: 'Joueur introuvable' });

    updateTeamCounts(gameState);
    // Le joueur concerné en est informé, les autres voient la liste bouger
    const sock = io.sockets.sockets.get(trouve.socketId);
    if (sock) sock.emit('team-changed', { newTeam: camp });
    broadcastLobbyUpdate(gameState);

    res.json({ success: true, twitchId, team: camp });
});

// 🆕 v2 — Répartition au hasard, équilibrée en nombre
app.post('/admin/shuffle-teams', (req, res) => {
    const gameState = req.room;   // posée par le garde-fou d'hôte
    if (!gameState.isActive) return res.status(400).json({ error: 'Aucun salon ouvert' });
    if (gameState.inProgress) return res.status(400).json({ error: 'Partie déjà en cours' });
    if (gameState.lobbyMode !== 'rivalry') return res.status(400).json({ error: "Le salon n'est pas en équipes" });

    const entrees = Array.from(gameState.players.entries());
    // Mélange de Fisher-Yates : un tri au hasard biaiserait la répartition
    for (let i = entrees.length - 1; i > 0; i--) {
        const k = Math.floor(Math.random() * (i + 1));
        [entrees[i], entrees[k]] = [entrees[k], entrees[i]];
    }
    // Une distribution en alternance garantit l'écart minimal entre les camps
    entrees.forEach(([socketId, p], i) => {
        p.team = (i % 2) + 1;
        const sock = io.sockets.sockets.get(socketId);
        if (sock) sock.emit('team-changed', { newTeam: p.team });
    });

    updateTeamCounts(gameState);
    broadcastLobbyUpdate(gameState);

    console.log(`🔀 Camps mélangés : ${gameState.teamCounts[1]} contre ${gameState.teamCounts[2]}`);
    res.json({
        success: true,
        teamCounts: gameState.teamCounts,
        teams: entrees.map(([, p]) => ({ twitchId: p.twitchId, team: p.team })),
    });
});

// 🆕 Route pour activer/désactiver le bonus rapidité (mode points uniquement)
app.post('/admin/set-speed-bonus', (req, res) => {
    const gameState = req.room;   // posée par le garde-fou d'hôte

    const { enabled } = req.body;
    gameState.speedBonus = enabled === true;
    console.log(`⚡ Bonus rapidité: ${gameState.speedBonus ? 'Activé' : 'Désactivé'}`);

    res.json({ success: true, speedBonus: gameState.speedBonus });
});

// 🎮 Route pour activer/désactiver les bonus (jauge combo, bonus, défis)
app.post('/admin/set-bonus-enabled', (req, res) => {
    const gameState = req.room;   // posée par le garde-fou d'hôte

    const { enabled } = req.body;
    gameState.bonusEnabled = enabled === true;
    console.log(`🎮 Bonus (jauge/défis): ${gameState.bonusEnabled ? 'Activé' : 'Désactivé'}`);

    res.json({ success: true, bonusEnabled: gameState.bonusEnabled });
});


// Route pour changer le mode de difficulté
app.post('/admin/set-difficulty-mode', (req, res) => {
    const gameState = req.room;   // posée par le garde-fou d'hôte

    // Bloquer si une partie est en cours
    if (gameState.inProgress) {
        return res.status(400).json({
            error: 'Impossible de changer la difficulté pendant une partie',
            blocked: true
        });
    }

    const { mode } = req.body;

    if (!['croissante', 'aleatoire'].includes(mode)) {
        return res.status(400).json({ error: 'Mode de difficulté invalide' });
    }

    gameState.difficultyMode = mode;
    gameState.lastDifficulty = null; // Reset
    console.log(`⚙️ Mode de difficulté changé: ${mode}`);

    diffuser(gameState, 'game-config-updated', {
        mode: gameState.mode,
        lives: gameState.lives,
        questionTime: gameState.questionTime,
        answersCount: gameState.answersCount,
        questionsCount: gameState.questionsCount,
        difficultyMode: gameState.difficultyMode // 🆕
    });

    res.json({ success: true, difficultyMode: gameState.difficultyMode });
});


// 🚫 Route pour activer/désactiver le filtre anti-spoil
app.post('/admin/set-no-spoil', (req, res) => {
    const gameState = req.room;   // posée par le garde-fou d'hôte

    if (gameState.inProgress) {
        return res.status(400).json({
            error: 'Impossible de changer le filtre pendant une partie',
            blocked: true
        });
    }

    const { enabled } = req.body;
    gameState.noSpoil = enabled === true;
    console.log(`🚫 Filtre anti-spoil: ${gameState.noSpoil ? 'Activé (masqué)' : 'Désactivé (autorisé)'}`);

    diffuser(gameState, 'game-config-updated', {
        mode: gameState.mode,
        lives: gameState.lives,
        questionTime: gameState.questionTime,
        answersCount: gameState.answersCount,
        questionsCount: gameState.questionsCount,
        difficultyMode: gameState.difficultyMode,
        serieFilter: gameState.serieFilter,
        noSpoil: gameState.noSpoil
    });

    res.json({ success: true, noSpoil: gameState.noSpoil });
});


// Route pour obtenir les statistiques des séries (nombre de questions)
app.get('/admin/serie-stats', async (req, res) => {

    try {
        const allQuestions = await db.getAllQuestions();

        // Compter les séries uniques
        const uniqueSeries = new Set(allQuestions.map(q => q.serie).filter(s => s));
        const totalSeries = uniqueSeries.size;

        const stats = {};

        // 🔥 AUTOMATIQUE: Générer les stats pour chaque filtre dans SERIES_FILTERS
        for (const [filterId, filterConfig] of Object.entries(SERIES_FILTERS)) {
            if (filterId === 'overall') {
                stats.overall = {
                    count: allQuestions.length,
                    series: totalSeries,
                    subtitle: `${totalSeries} séries`
                };
            } else if (filterId === 'mainstream') {
                const mainstreamSeriesWithQuestions = new Set(
                    allQuestions
                        .filter(q => filterConfig.series.includes(q.serie))
                        .map(q => q.serie)
                );
                stats.mainstream = {
                    count: mainstreamSeriesWithQuestions.size,
                    series: mainstreamSeriesWithQuestions.size,
                    subtitle: `${mainstreamSeriesWithQuestions.size} séries`
                };
            } else {
                // Pour tous les autres filtres (naruto, dragonball, onepiece, bleach, etc.)
                stats[filterId] = {
                    count: allQuestions.filter(q => filterConfig.series.includes(q.serie)).length,
                    subtitle: null
                };
            }
        }

        res.json(stats);
    } catch (error) {
        console.error('❌ Erreur stats séries:', error);
        res.status(500).json({ error: error.message });
    }
});

// Route pour changer le filtre série
app.post('/admin/set-serie-filter', (req, res) => {
    const gameState = req.room;   // posée par le garde-fou d'hôte

    // Bloquer si une partie est en cours
    if (gameState.inProgress) {
        return res.status(400).json({
            error: 'Impossible de changer le filtre pendant une partie',
            blocked: true
        });
    }

    const { filter } = req.body;

    // 🔥 AUTOMATIQUE: Validation basée sur SERIES_FILTERS
    if (!SERIES_FILTERS[filter]) {
        return res.status(400).json({ error: 'Filtre invalide' });
    }

    gameState.serieFilter = filter;
    console.log(`⚙️ Filtre série changé: ${filter}`);

    diffuser(gameState, 'game-config-updated', {
        mode: gameState.mode,
        lives: gameState.lives,
        questionTime: gameState.questionTime,
        answersCount: gameState.answersCount,
        questionsCount: gameState.questionsCount,
        difficultyMode: gameState.difficultyMode,
        autoMode: gameState.autoMode,
        serieFilter: gameState.serieFilter
    });

    res.json({ success: true, serieFilter: gameState.serieFilter });
});


// Route pour toggle le mode auto
app.post('/admin/toggle-auto-mode', (req, res) => {
    const gameState = req.room;   // posée par le garde-fou d'hôte

    gameState.autoMode = !gameState.autoMode;
    console.log(`⚙️ Mode Auto ${gameState.autoMode ? 'activé' : 'désactivé'}`);

    // 🔥 AJOUTER - Annuler le timeout si on désactive le mode auto
    if (!gameState.autoMode && gameState.autoModeTimeout) {
        clearTimeout(gameState.autoModeTimeout);
        gameState.autoModeTimeout = null;
        console.log('⏹️ Timeout auto-mode annulé');
    }

    diffuser(gameState, 'game-config-updated', {
        mode: gameState.mode,
        lives: gameState.lives,
        questionTime: gameState.questionTime,
        answersCount: gameState.answersCount,
        questionsCount: gameState.questionsCount,
        difficultyMode: gameState.difficultyMode,
        autoMode: gameState.autoMode
    });

    res.json({ success: true, autoMode: gameState.autoMode, autoDelai: AUTO_DELAI_MS });
});

// Route pour forcer le déclenchement du mode auto (si activé pendant résultats)
app.post('/admin/trigger-auto-next', (req, res) => {
    const gameState = req.room;   // posée par le garde-fou d'hôte

    // Vérifier que le mode auto est activé et qu'une partie est en cours
    if (!gameState.autoMode || !gameState.inProgress) {
        return res.json({ success: false, reason: 'Mode auto désactivé ou pas de partie' });
    }

    // Vérifier qu'on est bien en train d'afficher les résultats
    if (!gameState.showResults) {
        return res.json({ success: false, reason: 'Pas en phase de résultats' });
    }

    console.log('🔄 Trigger manuel du mode auto');

    // Annuler le timeout précédent si existant
    if (gameState.autoModeTimeout) {
        clearTimeout(gameState.autoModeTimeout);
        gameState.autoModeTimeout = null;
    }

    // Lancer le compte à rebours de 3s
    gameState.autoModeTimeout = setTimeout(async () => {
        try {
            if (!gameState.inProgress || !gameState.autoMode) return;
            
            // 🆕 Ne pas interférer avec les tiebreakers
            if (gameState.isTiebreaker || gameState.isRivalryTiebreaker) {
                console.log('⚠️ Mode auto ignoré : tiebreaker en cours');
                return;
            }

            console.log('🤖 Mode Auto (trigger manuel) : Passage à la question suivante');

            // 🔥 FIX TIEBREAKER
            if (gameState.isTiebreaker) {
                await sendTiebreakerQuestion(gameState);
                return;
            }

            gameState.currentQuestionIndex++;

            if (gameState.mode === 'points' && gameState.currentQuestionIndex > gameState.questionsCount) {
                endGameByPoints(gameState);
                return;
            }

            const difficulty = getDifficultyForQuestion(gameState, gameState.currentQuestionIndex);
            const questions = await db.getRandomQuestions(
                difficulty,
                1,
                gameState.usedQuestionIds,
                gameState.serieFilter,
                shouldApplySerieCooldown(gameState) ? gameState.recentSeries : [],  // 🆕
                gameState.noSpoil  // 🚫 Filtre anti-spoil
            );


            if (questions.length === 0) {
                console.error('❌ Mode Auto : Aucune question disponible');
                return;
            }

            const question = questions[0];
            addToRecentSeries(gameState, question.serie);
            gameState.usedQuestionIds.push(question.id);

            const allAnswers = [
                { text: question.answer1, index: 1 },
                { text: question.answer2, index: 2 },
                { text: question.answer3, index: 3 },
                { text: question.answer4, index: 4 },
                { text: question.answer5, index: 5 },
                { text: question.answer6, index: 6 }
            ].filter(answer => answer.text !== null && answer.text !== '');

            const correctAnswerObj = allAnswers.find(a => a.index === question.coanswer);
            const wrongAnswers = allAnswers.filter(a => a.index !== question.coanswer);
            const wrongAnswersNeeded = gameState.answersCount - 1;
            const shuffledWrong = wrongAnswers.sort(() => 0.5 - Math.random()).slice(0, wrongAnswersNeeded);
            const selectedAnswers = [correctAnswerObj, ...shuffledWrong];
            const finalAnswers = selectedAnswers.sort(() => 0.5 - Math.random());
            const newCorrectIndex = finalAnswers.findIndex(a => a.index === question.coanswer) + 1;

            const questionData = {
                questionNumber: gameState.currentQuestionIndex,
                totalQuestions: gameState.mode === 'points' ? gameState.questionsCount : null,
                questionId: question.id,
                question: question.question,
                answers: finalAnswers.map(a => a.text),
                serie: question.serie,
                difficulty: question.difficulty,
                timeLimit: gameState.questionTime,
                proof_url: question.proof_url || null
            };

            gameState.currentQuestion = {
                ...questionData,
                correctAnswer: newCorrectIndex,
                difficulty: question.difficulty
            };

            gameState.questionStartTime = Date.now();
            gameState.showResults = false;
            gameState.lastQuestionResults = null;
            gameState.answers.clear();

            // Émettre l'event de préparation pour l'animation
            diffuser(gameState, 'prepare-next-question');

            // Attendre 400ms pour l'animation de fermeture
            await new Promise(resolve => setTimeout(resolve, 400));

            diffuser(gameState, 'new-question', questionData);

            setTimeout(() => {
                if (gameState.inProgress) {
                    revealAnswers(gameState, newCorrectIndex);
                }
            }, gameState.questionTime * 1000);

        } catch (error) {
            console.error('❌ Erreur trigger auto:', error);
        }
    }, AUTO_DELAI_MS);

    res.json({ success: true });
});


// Route pour forcer le refresh de tous les joueurs AUTHENTIFIÉS
app.post('/admin/refresh-players', (req, res) => {
    const gameState = req.room;   // posée par le garde-fou d'hôte

    try {
        const now = Date.now();
        const timeSinceLastRefresh = now - gameState.lastRefreshPlayersTime;

        // 🔥 Vérifier le cooldown côté serveur
        if (timeSinceLastRefresh < REFRESH_COOLDOWN_MS) {
            const remainingTime = Math.ceil((REFRESH_COOLDOWN_MS - timeSinceLastRefresh) / 1000);
            return res.status(429).json({
                error: 'Cooldown actif',
                remainingTime: remainingTime,
                onCooldown: true
            });
        }

        let refreshedCount = 0;

        // 🔥 NOUVEAU : Parcourir TOUS les utilisateurs authentifiés (pas seulement ceux dans le lobby)
        authenticatedUsers.forEach((user, socketId) => {
            const socket = io.sockets.sockets.get(socketId);
            if (socket) {
                // 🔥 Envoyer uniquement à ce joueur authentifié
                socket.emit('force-refresh');
                refreshedCount++;
                console.log(`🔄 Refresh envoyé à ${user.username}`);
            }
        });

        // 🔥 Mettre à jour le timestamp
        gameState.lastRefreshPlayersTime = now;

        console.log(`🔄 Refresh forcé envoyé à ${refreshedCount} utilisateur(s) authentifié(s)`);

        res.json({
            success: true,
            playersRefreshed: refreshedCount
        });
    } catch (error) {
        console.error('❌ Erreur refresh joueurs:', error);
        res.status(500).json({ error: error.message });
    }
});


// Route pour vérifier le cooldown restant
app.get('/admin/refresh-cooldown', (req, res) => {
    const gameState = req.room;   // posée par le garde-fou d'hôte

    const now = Date.now();
    const timeSinceLastRefresh = now - gameState.lastRefreshPlayersTime;

    if (timeSinceLastRefresh < REFRESH_COOLDOWN_MS) {
        const remainingTime = Math.ceil((REFRESH_COOLDOWN_MS - timeSinceLastRefresh) / 1000);
        res.json({
            onCooldown: true,
            remainingTime: remainingTime
        });
    } else {
        res.json({
            onCooldown: false,
            remainingTime: 0
        });
    }
});

// 🔁 Relancer une manche dans le même salon, avec les mêmes joueurs.
// Le salon n'est jamais refermé : seuls les écrans reviennent au lobby.
app.post('/admin/replay', (req, res) => {
    const gameState = req.room;

    if (gameState.inProgress) {
        return res.status(400).json({ error: 'Une partie est déjà en cours' });
    }

    gameState.winnerScreenData = null;
    resetGameState(gameState);
    resetBombanimeState(gameState);

    console.log(`🔁 Salon ${gameState.roomCode} : retour au lobby pour une nouvelle manche`);
    diffuser(gameState, 'retour-au-salon');
    broadcastLobbyUpdate(gameState);

    res.json({ success: true, playerCount: gameState.players.size });
});

// Route pour reset manuel de l'historique des questions
app.post('/admin/reset-questions-history', async (req, res) => {
    const gameState = req.room;   // posée par le garde-fou d'hôte

    try {
        gameState.usedQuestionIds = [];
        console.log('🔄 Historique des questions réinitialisé manuellement');
        res.json({ success: true, message: 'Historique réinitialisé' });
    } catch (error) {
        console.error('❌ Erreur reset questions:', error);
        res.status(500).json({ error: error.message });
    }
});

// Passer à la question suivante
app.post('/admin/next-question', async (req, res) => {
    const gameState = req.room;   // posée par le garde-fou d'hôte

    if (!gameState.inProgress) {
        return res.status(400).json({ error: 'Aucune partie en cours' });
    }

    // 🆕 Bloquer si la partie est déjà en cours de finalisation (dernière question atteinte)
    if (gameState.endingGame) {
        return res.status(400).json({ error: 'Partie en cours de finalisation', ending: true });
    }

    // Bloquer si une question est déjà en cours
    if (gameState.questionStartTime && gameState.currentQuestion) {
        const elapsed = Math.floor((Date.now() - gameState.questionStartTime) / 1000);
        if (elapsed < gameState.questionTime) {
            const timeRemaining = gameState.questionTime - elapsed;
            return res.status(400).json({
                error: 'Une question est déjà en cours',
                timeRemaining: timeRemaining,
                blocked: true
            });
        }
    }

    try {
        // 🔥 FIX TIEBREAKER: Si tiebreaker, lancer une question EXTREME
        if (gameState.isTiebreaker) {
            console.log('⚔️ Admin lance une question de départage');
            await sendTiebreakerQuestion(gameState);
            return res.json({ success: true, tiebreaker: true });
        }
        
        // 🆕 RIVALRY TIEBREAKER: Si tiebreaker rivalry, lancer une question de départage
        if (gameState.isRivalryTiebreaker) {
            console.log('⚔️ Admin lance une question de départage Rivalry');
            await sendRivalryTiebreakerQuestion(gameState);
            return res.json({ success: true, rivalryTiebreaker: true });
        }

        // Logique normale
        gameState.currentQuestionIndex++;

        // Vérifier si on a atteint le nombre max de questions en mode Points
        if (gameState.mode === 'points' && gameState.currentQuestionIndex > gameState.questionsCount) {
            // Fin de partie - déterminer le gagnant par points
            endGameByPoints(gameState);
            return res.json({ success: true, gameEnded: true });
        }

        const difficulty = getDifficultyForQuestion(gameState, gameState.currentQuestionIndex);

        // 🔥 DEBUG: Afficher le filtre utilisé
        console.log(`🔍 Filtre série actif: ${gameState.serieFilter}`);

        const questions = await db.getRandomQuestions(
            difficulty,
            1,
            gameState.usedQuestionIds,
            gameState.serieFilter,
            shouldApplySerieCooldown(gameState) ? gameState.recentSeries : [],  // 🆕
            gameState.noSpoil  // 🚫 Filtre anti-spoil
        );


        if (questions.length === 0) {
            return res.status(404).json({ error: 'Aucune question disponible' });
        }

        const question = questions[0];
        addToRecentSeries(gameState, question.serie);

        // 🔥 DEBUG: Afficher la série de la question retournée
        console.log(`📌 Question série: ${question.serie}, difficulté: ${difficulty}`);

        gameState.usedQuestionIds.push(question.id);

        console.log(`📌 Question ${gameState.currentQuestionIndex}/${gameState.mode === 'points' ? gameState.questionsCount : '∞'} - Difficulté: ${difficulty}`);
        // Récupérer toutes les réponses disponibles
        const allAnswers = [
            { text: question.answer1, index: 1 },
            { text: question.answer2, index: 2 },
            { text: question.answer3, index: 3 },
            { text: question.answer4, index: 4 },
            { text: question.answer5, index: 5 },
            { text: question.answer6, index: 6 }
        ].filter(answer => answer.text !== null && answer.text !== '');

        const correctAnswerObj = allAnswers.find(a => a.index === question.coanswer);
        const wrongAnswers = allAnswers.filter(a => a.index !== question.coanswer);

        const wrongAnswersNeeded = gameState.answersCount - 1;
        const shuffledWrong = wrongAnswers.sort(() => 0.5 - Math.random()).slice(0, wrongAnswersNeeded);

        const selectedAnswers = [correctAnswerObj, ...shuffledWrong];
        const finalAnswers = selectedAnswers.sort(() => 0.5 - Math.random());

        const newCorrectIndex = finalAnswers.findIndex(a => a.index === question.coanswer) + 1;

        const questionData = {
            questionNumber: gameState.currentQuestionIndex,
            totalQuestions: gameState.mode === 'points' ? gameState.questionsCount : null,
            questionId: question.id,
            question: question.question,
            answers: finalAnswers.map(a => a.text),
            serie: question.serie,
            difficulty: question.difficulty, // ✅ Important pour le calcul des points
            timeLimit: gameState.questionTime,
            proof_url: question.proof_url || null
        };

        gameState.currentQuestion = {
            ...questionData,
            correctAnswer: newCorrectIndex,
            difficulty: question.difficulty // ✅ Stocker aussi dans l'état
        };

        gameState.questionStartTime = Date.now();
        gameState.showResults = false;
        gameState.lastQuestionResults = null;
        gameState.answers.clear();
        gameState.liveAnswers.clear();
        updateLiveAnswerStats(gameState);

        addLog(gameState, 'question', {
            questionNumber: gameState.currentQuestionIndex,
            difficulty: difficulty,
            series: question.serie
        });


        diffuser(gameState, 'new-question', questionData);

        setTimeout(() => {
            if (gameState.inProgress) {
                revealAnswers(gameState, newCorrectIndex);
            }
        }, gameState.questionTime * 1000);

        res.json({ success: true, question: questionData });
    } catch (error) {
        console.error('❌ Erreur question suivante:', error);
        res.status(500).json({ error: error.message });
    }
});


// Fonction pour calculer la répartition des questions par difficulté
function getQuestionDistribution(totalQuestions) {
    return {
        veryeasy: Math.round(totalQuestions * 0.10),
        easy: Math.round(totalQuestions * 0.20),
        medium: Math.round(totalQuestions * 0.30),
        hard: Math.round(totalQuestions * 0.20),
        veryhard: Math.round(totalQuestions * 0.10),
        extreme: Math.round(totalQuestions * 0.10)
    };
}

// Fonction pour révéler les réponses
function revealAnswers(gameState, correctAnswer) {
    // 🆕 Si tiebreaker rivalry en cours, ne pas interférer
    if (gameState.isRivalryTiebreaker) {
        console.log('⚠️ revealAnswers ignoré : tiebreaker rivalry en cours');
        return;
    }
    
    const stats = {
        correct: 0,
        wrong: 0,
        afk: 0,
        livesDistribution: { 3: 0, 2: 0, 1: 0, 0: 0 }
    };

    let eliminatedThisRound = 0;
    const playersDetails = [];

    // 🔥 FIX: Si tiebreaker, utiliser la fonction dédiée
    if (gameState.isTiebreaker) {
        revealTiebreakerAnswers(gameState, correctAnswer);
        return;
    }

    // Mode Points: calculer les scores
    if (gameState.mode === 'points') {
        gameState.players.forEach((player, socketId) => {
            const playerAnswer = gameState.answers.get(socketId);
            let isCorrect = false;
            let status = 'afk';

            if (!playerAnswer) {
                stats.afk++;
                status = 'afk';
            } else if (playerAnswer.answer === correctAnswer) {
                stats.correct++;

                // 🆕 Appliquer le multiplicateur x2 si bonus actif
                let pointsEarned = getPointsForDifficulty(gameState.currentQuestion.difficulty);
                if (playerAnswer.bonusActive === 'doublex2') { // ✅ BON
                    pointsEarned *= 2;
                    console.log(`💰 ${player.username} : Points x2 appliqué ! ${pointsEarned} points`);
                }

                player.points = (player.points || 0) + pointsEarned;

                isCorrect = true;
                status = 'correct';

                // 🆕 Incrémenter le combo
                updatePlayerCombo(gameState, socketId);
            } else {
                stats.wrong++;
                status = 'wrong';
            }

            playersDetails.push({
                socketId: socketId,
                twitchId: player.twitchId,
                correctAnswers: player.correctAnswers || 0,
                username: player.username,
                lives: player.lives,
                points: player.points || 0,
                status: status,
                responseTime: playerAnswer?.time || null,
                isCorrect: isCorrect,
                selectedAnswer: playerAnswer?.answer ? gameState.currentQuestion.answers[playerAnswer.answer - 1] : null,
                pointsEarned: isCorrect ? getPointsForDifficulty(gameState.currentQuestion.difficulty) : 0, // 🔥 NOUVEAU
                team: player.team || null // 🆕 Équipe du joueur
            });
        });
    } else {
        // Mode Vie - Logique originale
        const alivePlayers = getAlivePlayers(gameState);
        const allHaveOneLife = alivePlayers.every(p => p.lives === 1);
        let allWillLose = false;

        if (allHaveOneLife && alivePlayers.length > 1) {
            // Vérifier si quelqu'un a répondu correctement
            const someoneCorrect = Array.from(alivePlayers).some(player => {
                const playerAnswer = gameState.answers.get(player.socketId);
                return playerAnswer && playerAnswer.answer === correctAnswer;
            });

            // 🔥 NOUVEAU : Vérifier si quelqu'un a un Shield actif
            const someoneHasShield = Array.from(alivePlayers).some(player => {
                return player.activeShield === true;
            });

            // Si personne n'a répondu juste ET personne n'a de Shield → Tous vont perdre
            allWillLose = !someoneCorrect && !someoneHasShield;
        }

        gameState.players.forEach((player, socketId) => {
            let status = 'afk';
            let isCorrect = false;
            const playerAnswer = gameState.answers.get(socketId);

            // 🔥 FIX SHIELD + AFK: Vérifier le Shield dans les données du joueur
            const hasShield = player.activeShield === true;

            console.log(`🔍 ${player.username} (${socketId}):`);
            console.log(`   - playerAnswer:`, playerAnswer);
            console.log(`   - bonusActive (answer):`, playerAnswer?.bonusActive);
            console.log(`   - activeShield (player):`, player.activeShield);
            console.log(`   - hasShield:`, hasShield);

            if (player.lives === 0) {
                stats.livesDistribution[0]++;
                status = 'eliminated';
            } else if (!playerAnswer) {
                stats.afk++;
                if (!allWillLose) {
                    // 🛡️ Shield protège contre l'AFK
                    if (hasShield) {
                        console.log(`🛡️ ${player.username} protégé par le Bouclier (AFK)`);
                        status = 'afk-shielded';
                        player.activeShield = false; // ✅ Consommer le Shield
                    } else {
                        player.lives--;
                        if (player.lives === 0) {
                            eliminatedThisRound++;
                            addLog(gameState, 'eliminated', {
                                username: player.username,
                                playerColor: gameState.playerColors[player.username]
                            });
                        }
                        status = 'afk';
                    }
                } else {
                    status = 'afk';
                }
            } else if (playerAnswer.answer === correctAnswer) {
                stats.correct++;
                player.correctAnswers++;
                status = 'correct';
                isCorrect = true;

                // 🔥 Ne pas consommer le Shield si bonne réponse
                if (hasShield) {
                    player.activeShield = false; // ✅ Retirer le Shield (pas utilisé)
                    console.log(`🛡️ Shield retiré (bonne réponse, non utilisé)`);
                }

                updatePlayerCombo(gameState, socketId);

            } else {
                stats.wrong++;
                if (!allWillLose) {
                    // 🛡️ Shield protège contre la mauvaise réponse
                    if (hasShield) {
                        console.log(`🛡️ ${player.username} protégé par Shield (mauvaise réponse)`);
                        status = 'wrong-shielded';
                        player.activeShield = false; // ✅ Consommer le Shield
                    } else {
                        player.lives--;
                        if (player.lives === 0) {
                            eliminatedThisRound++;
                            addLog(gameState, 'eliminated', {
                                username: player.username,
                                playerColor: gameState.playerColors[player.username]
                            });
                        }
                        status = 'wrong';
                    }
                } else {
                    status = 'wrong';
                }
            }

            if (player.lives > 0 || status !== 'eliminated') {
                stats.livesDistribution[player.lives]++;
            }

            playersDetails.push({
                socketId: socketId,
                twitchId: player.twitchId,
                correctAnswers: player.correctAnswers || 0,
                username: player.username,
                lives: player.lives,
                points: player.points || 0,
                status: status,
                responseTime: playerAnswer?.time || null,
                isCorrect: isCorrect,
                selectedAnswer: playerAnswer?.answer ? gameState.currentQuestion.answers[playerAnswer.answer - 1] : null,
                shieldUsed: hasShield, // 🔥 Indiquer si le Shield a été utilisé
                team: player.team || null // 🆕 Équipe du joueur
            });
        });


    }

    const alivePlayersAfter = gameState.mode === 'points'
        ? Array.from(gameState.players.values())
        : getAlivePlayers(gameState);

    const playersData = Array.from(gameState.players.values()).map(player => ({
        twitchId: player.twitchId,
        username: player.username,
        lives: player.lives,
        correctAnswers: player.correctAnswers,
        points: player.points || 0,
        isLastGlobalWinner: player.twitchId === gameState.lastGlobalWinner,
        team: player.team || null, // 🆕 Équipe du joueur
        avatarUrl: player.avatarUrl || null
    }));

    let fastestPlayer = null;
    playersDetails.forEach(p => {
        if (p.isCorrect && p.responseTime !== null) {
            if (!fastestPlayer || p.responseTime < fastestPlayer.time) {
                fastestPlayer = {
                    username: p.username,
                    socketId: p.socketId, // 🆕 Ajouter socketId pour identifier le premier
                    time: p.responseTime
                };
            }
        }
    });

    // 🆕 BONUS RAPIDITÉ : +500 points au joueur le plus rapide (mode points uniquement)
    if (gameState.mode === 'points' && gameState.speedBonus && fastestPlayer) {
        const SPEED_BONUS_POINTS = 500;
        
        // Mettre à jour les points du joueur dans gameState
        const player = gameState.players.get(fastestPlayer.socketId);
        if (player) {
            player.points = (player.points || 0) + SPEED_BONUS_POINTS;
            console.log(`⚡ Bonus rapidité: ${fastestPlayer.username} +${SPEED_BONUS_POINTS} pts (total: ${player.points})`);
            
            // Mettre à jour playersDetails pour les résultats
            const playerDetail = playersDetails.find(p => p.socketId === fastestPlayer.socketId);
            if (playerDetail) {
                playerDetail.points = player.points;
                playerDetail.speedBonus = SPEED_BONUS_POINTS;
                // 🔥 IMPORTANT: Ajouter le bonus à pointsEarned pour le calcul côté client
                playerDetail.pointsEarned = (playerDetail.pointsEarned || 0) + SPEED_BONUS_POINTS;
            }
            
            // Notifier le joueur du bonus (juste pour la notification)
            const socket = io.sockets.sockets.get(fastestPlayer.socketId);
            if (socket) {
                socket.emit('speed-bonus', { 
                    points: SPEED_BONUS_POINTS
                });
            }
        }
        
        // Ajouter l'info au fastestPlayer pour l'affichage
        fastestPlayer.speedBonus = SPEED_BONUS_POINTS;
    }

    // 🆕 DÉFIS : Vérifier les défis pour chaque joueur
    const currentDifficulty = gameState.currentQuestion?.difficulty || 'medium';
    const currentSeries = gameState.currentQuestion?.serie || '';
    
    playersDetails.forEach(p => {
        const playerAnswer = gameState.answers.get(p.socketId);
        if (!playerAnswer) return;
        
        const answerData = {
            correct: p.isCorrect,
            responseTime: p.responseTime || 999999,
            difficulty: currentDifficulty,
            series: currentSeries,
            isFirst: fastestPlayer && fastestPlayer.socketId === p.socketId
        };
        
        const completedChallenges = checkChallenges(gameState, p.socketId, answerData);
        
        // Si des défis sont complétés, ajouter les bonus à l'inventaire
        if (completedChallenges.length > 0) {
            const bonusData = gameState.playerBonuses.get(p.socketId);
            if (bonusData) {
                completedChallenges.forEach(({ reward }) => {
                    bonusData.bonusInventory[reward]++;
                    console.log(`🎁 Bonus ${reward} ajouté à ${p.username} (total: ${bonusData.bonusInventory[reward]})`);
                });
                
                // Envoyer mise à jour des bonus au joueur
                const socket = io.sockets.sockets.get(p.socketId);
                if (socket) {
                    socket.emit('combo-updated', {
                        comboLevel: bonusData.comboLevel,
                        comboProgress: bonusData.comboProgress,
                        bonusInventory: bonusData.bonusInventory
                    });
                }
            }
        }
        
        // Envoyer mise à jour des défis au joueur
        const socket = io.sockets.sockets.get(p.socketId);
        if (socket) {
            socket.emit('challenges-updated', {
                challenges: getPlayerChallengesState(gameState, p.socketId),
                completedChallenges: completedChallenges
            });
        }
    });

    // 🆕 Mettre à jour les scores d'équipe en mode Rivalité
    if (gameState.lobbyMode === 'rivalry') {
        updateTeamScores(gameState);
    }

    const resultsData = {
        correctAnswer,
        stats,
        eliminatedCount: eliminatedThisRound,
        remainingPlayers: alivePlayersAfter.length,
        players: playersDetails,
        playersData: playersData,
        gameMode: gameState.mode,
        fastestPlayer: fastestPlayer,
        // 🆕 Données équipe pour mode Rivalité
        lobbyMode: gameState.lobbyMode,
        teamScores: gameState.lobbyMode === 'rivalry' ? gameState.teamScores : null,
        teamNames: gameState.lobbyMode === 'rivalry' ? gameState.teamNames : null,
        // 🆕 Flag dernière question (mode points) → client désactive le bouton "Suivant"
        isLastQuestion: gameState.mode === 'points' && gameState.currentQuestionIndex >= gameState.questionsCount,
        // De quoi dessiner le décompte du mode auto chez l'hôte
        autoDelai: AUTO_DELAI_MS,
    };

    gameState.showResults = true;
    gameState.lastQuestionResults = resultsData;

    diffuser(gameState, 'question-results', resultsData);

    // Vérifier fin de partie selon le mode
    if (gameState.mode === 'lives') {
        // Recalculer les joueurs en vie APRÈS les mises à jour
        const currentAlivePlayers = getAlivePlayers(gameState);
        console.log(`🔍 Joueurs en vie après cette question: ${currentAlivePlayers.length}`);

        // 🆕 MODE RIVALITÉ : Vérifier si une équipe est éliminée
        if (gameState.lobbyMode === 'rivalry') {
            const rivalryWinner = checkRivalryWinner(gameState);
            if (rivalryWinner && rivalryWinner !== 'draw') {
                console.log(`🏆 Fin de partie Rivalité - Équipe gagnante: Team ${rivalryWinner} (${gameState.teamNames[rivalryWinner]})`);
                endGameRivalry(gameState, rivalryWinner);
                return;
            } else if (rivalryWinner === 'draw') {
                console.log(`⚖️ Égalité en mode Rivalité - Les deux équipes éliminées`);
                endGameRivalry(gameState, 'draw');
                return;
            }
        } else {
            // Mode classique
            if (currentAlivePlayers.length <= 1) {
                // 0 ou 1 joueur restant = fin de partie
                const winner = currentAlivePlayers.length === 1 ? currentAlivePlayers[0] : null;
                console.log(`🏁 Fin de partie mode vie - Gagnant: ${winner ? winner.username : 'Aucun'}`);
                endGame(gameState, winner);
                return; // 🔥 IMPORTANT: Arrêter ici pour ne pas continuer avec le mode auto
            }
        }
    } else if (gameState.mode === 'points' && gameState.currentQuestionIndex >= gameState.questionsCount) {
        // 🆕 MODE RIVALITÉ : Fin par points
        if (gameState.lobbyMode === 'rivalry') {
            gameState.endingGame = true;  // 🆕 Bloque /admin/next-question pendant le délai
            gameState.rivalryEndGameTimeout = setTimeout(() => {
                endGameRivalryPoints(gameState);
            }, 100); // 🔥 FIX: Afficher le winner directement (comme en classique)
            return; // 🆕 IMPORTANT: Arrêter pour ne pas continuer avec le mode auto
        } else {
            // Terminer automatiquement après la dernière question
            gameState.endingGame = true;  // 🆕 Bloque /admin/next-question pendant le délai
            setTimeout(() => {
                endGameByPoints(gameState);
            }, 100);
        }
    }


    // 🆕 MODE AUTO : Passer automatiquement à la question suivante après 3s
    if (gameState.autoMode && gameState.inProgress) {
        // 🆕 Ne pas interférer avec les tiebreakers (ils ont leur propre logique)
        if (gameState.isTiebreaker || gameState.isRivalryTiebreaker) {
            console.log('⏱️ Mode Auto : Tiebreaker en cours, pas d\'interférence');
            return;
        }
        
        console.log(`⏱️ Mode Auto : Question suivante dans ${AUTO_DELAI_MS / 1000}s...`);

        // Annuler le timeout précédent si existant
        if (gameState.autoModeTimeout) {
            clearTimeout(gameState.autoModeTimeout);
        }

        gameState.autoModeTimeout = setTimeout(async () => {
            if (!gameState.inProgress) return; // Sécurité : vérifier que la partie est toujours en cours
            
            // 🆕 Double vérification tiebreaker
            if (gameState.isTiebreaker || gameState.isRivalryTiebreaker) return;

            console.log('🤖 Mode Auto : Passage automatique à la question suivante');

            // 🔥 FIX TIEBREAKER: Si tiebreaker, lancer une question EXTREME
            if (gameState.isTiebreaker) {
                await sendTiebreakerQuestion(gameState);
                return;
            }

            // Logique normale (copie de /admin/next-question)
            gameState.currentQuestionIndex++;

            // Vérifier si on a atteint le nombre max de questions en mode Points
            if (gameState.mode === 'points' && gameState.currentQuestionIndex > gameState.questionsCount) {
                endGameByPoints(gameState);
                return;
            }

            try {
                const difficulty = getDifficultyForQuestion(gameState, gameState.currentQuestionIndex);

                // 🔥 FIX: AJOUTER gameState.serieFilter (c'était probablement déjà là, mais vérifie bien)
                console.log(`🔍 [Mode Auto Timer] Filtre série: ${gameState.serieFilter}`); // 🔥 NOUVEAU LOG

                const questions = await db.getRandomQuestions(
                    difficulty,
                    1,
                    gameState.usedQuestionIds,
                    gameState.serieFilter,
                    shouldApplySerieCooldown(gameState) ? gameState.recentSeries : [],  // 🆕
                    gameState.noSpoil  // 🚫 Filtre anti-spoil
                );

                if (questions.length === 0) {
                    console.error('❌ Aucune question disponible (mode auto)');
                    return;
                }

                const question = questions[0];
                addToRecentSeries(gameState, question.serie);
                gameState.usedQuestionIds.push(question.id);

                console.log(`📌 Question ${gameState.currentQuestionIndex}/${gameState.mode === 'points' ? gameState.questionsCount : '∞'} - Difficulté: ${difficulty}`);

                // Préparer les réponses
                const allAnswers = [
                    { text: question.answer1, index: 1 },
                    { text: question.answer2, index: 2 },
                    { text: question.answer3, index: 3 },
                    { text: question.answer4, index: 4 },
                    { text: question.answer5, index: 5 },
                    { text: question.answer6, index: 6 }
                ].filter(answer => answer.text !== null && answer.text !== '');

                const correctAnswerObj = allAnswers.find(a => a.index === question.coanswer);
                const wrongAnswers = allAnswers.filter(a => a.index !== question.coanswer);
                const wrongAnswersNeeded = gameState.answersCount - 1;
                const shuffledWrong = wrongAnswers.sort(() => 0.5 - Math.random()).slice(0, wrongAnswersNeeded);
                const selectedAnswers = [correctAnswerObj, ...shuffledWrong];
                const finalAnswers = selectedAnswers.sort(() => 0.5 - Math.random());
                const newCorrectIndex = finalAnswers.findIndex(a => a.index === question.coanswer) + 1;

                const questionData = {
                    questionNumber: gameState.currentQuestionIndex,
                    totalQuestions: gameState.mode === 'points' ? gameState.questionsCount : null,
                    questionId: question.id,
                    question: question.question,
                    answers: finalAnswers.map(a => a.text),
                    serie: question.serie,
                    difficulty: question.difficulty,
                    timeLimit: gameState.questionTime,
                    proof_url: question.proof_url || null
                };

                gameState.currentQuestion = {
                    ...questionData,
                    correctAnswer: newCorrectIndex,
                    difficulty: question.difficulty
                };

                gameState.questionStartTime = Date.now();
                gameState.showResults = false;
                gameState.lastQuestionResults = null;
                gameState.answers.clear();

                addLog(gameState, 'question', {
                    questionNumber: gameState.currentQuestionIndex,
                    difficulty: difficulty,
                    series: question.serie
                });

                // 🔥 Animation de fermeture avant la nouvelle question
                diffuser(gameState, 'prepare-next-question');
                await new Promise(resolve => setTimeout(resolve, 400));

                diffuser(gameState, 'new-question', questionData);

                setTimeout(() => {
                    if (gameState.inProgress) {
                        revealAnswers(gameState, newCorrectIndex);
                    }
                }, gameState.questionTime * 1000);

            } catch (error) {
                console.error('❌ Erreur mode auto:', error);
            }
        }, AUTO_DELAI_MS);
    }
}


function getPointsForDifficulty(difficulty) {
    const pointsMap = {
        'veryeasy': 500,
        'easy': 1000,
        'medium': 1500,
        'hard': 2000,
        'veryhard': 2500,
        'extreme': 3000
    };

    return pointsMap[difficulty] || 1000; // Défaut 1000 si difficulté inconnue
}

// 🔥 FIX TIEBREAKER: Fonction dédiée pour révéler les résultats du tiebreaker
function revealTiebreakerAnswers(gameState, correctAnswer) {
    console.log('⚔️ Révélation résultats tiebreaker');

    const stats = {
        correct: 0,
        wrong: 0,
        afk: 0
    };

    const playersDetails = [];

    // 🔥 FIX: Analyser TOUS les joueurs ET incrémenter TOUS les points
    gameState.players.forEach((player, socketId) => {
        const playerAnswer = gameState.answers.get(socketId);
        let isCorrect = false;
        let status = 'spectator';

        // Vérifier si le joueur est en tiebreaker (pour l'affichage visuel uniquement)
        const isInTiebreaker = gameState.tiebreakerPlayers.includes(player.twitchId);

        // 🔥 FIX: Traiter la réponse de TOUS les joueurs, pas seulement ceux en tiebreaker
        if (!playerAnswer) {
            stats.afk++;
            status = 'afk';
        } else if (playerAnswer.answer === correctAnswer) {
            stats.correct++;

            // 🔥 Tiebreaker = toujours EXTREME = 3000 points
            const pointsEarned = 3000;
            player.points = (player.points || 0) + pointsEarned;

            isCorrect = true;
            status = 'correct';
        } else {
            stats.wrong++;
            status = 'wrong';
        }

        playersDetails.push({
            socketId: socketId,
            username: player.username,
            points: player.points || 0,
            status: status,
            responseTime: playerAnswer?.time || null,
            isCorrect: isCorrect,
            isInTiebreaker: isInTiebreaker,
            pointsEarned: isCorrect ? 3000 : 0 // 🔥 NOUVEAU (toujours 3000 en tiebreaker)
        });
    });

    const playersData = Array.from(gameState.players.values()).map(player => ({
        twitchId: player.twitchId,
        username: player.username,
        points: player.points || 0,
        isLastGlobalWinner: player.twitchId === gameState.lastGlobalWinner,
        avatarUrl: player.avatarUrl || null
    }));

    const resultsData = {
        correctAnswer: correctAnswer,
        stats: stats,
        players: playersDetails,
        playersData: playersData,
        gameMode: 'points',
        isTiebreaker: true,
        remainingPlayers: gameState.tiebreakerPlayers.length
    };

    gameState.showResults = true;
    gameState.lastQuestionResults = resultsData;

    diffuser(gameState, 'question-results', resultsData);

    console.log(`⚔️ Résultats tiebreaker: ${stats.correct} bonne(s) réponse(s), ${stats.wrong} mauvaise(s), ${stats.afk} AFK`);

    // 🔥 FIX: Vérifier IMMÉDIATEMENT le gagnant
    setTimeout(async () => {
        await checkTiebreakerWinner(gameState);
    }, 100);
}


// Fonction pour terminer une partie en mode Points
async function endGameByPoints(gameState) {
    const duration = Math.floor((Date.now() - gameState.gameStartTime) / 1000);

    try {
        // Trier les joueurs par points (décroissant)
        const sortedPlayers = Array.from(gameState.players.values())
            .sort((a, b) => (b.points || 0) - (a.points || 0));

        // Détecter les égalités
        const maxPoints = sortedPlayers[0]?.points || 0;
        const winners = sortedPlayers.filter(p => p.points === maxPoints);

        // CAS 1: UN SEUL GAGNANT
        if (winners.length === 1) {
            const winner = winners[0];
            gameState.lastGlobalWinner = winner.twitchId;

            if (winner && winner.points > 0) {
                addLog(gameState, 'game-end', { winner: winner.username });

                const rewardsData = null;

                const winnerData = {
                    username: winner.username,
                    points: winner.points || 0
                };

                console.log(`🏆 Gagnant: ${winner.username} avec ${winner.points} points`);

                // Créer le podium Top 3
                const podium = sortedPlayers.slice(0, 3).map((player, index) => ({
                    rank: index + 1,
                    username: player.username,
                    points: player.points || 0,
                    avatarUrl: player.avatarUrl || null
                }));

                const { playersData, topPlayers } = await generateGameEndedData(gameState);
                
                // 🔥 Sauvegarder les données de la dernière question AVANT le reset
                const lastQuestionPlayers = getLastQuestionPlayersData(gameState);

                gameState.winnerScreenData = {
                    winner: winnerData,
                    podium: podium,
                    duration,
                    totalQuestions: gameState.currentQuestionIndex,
                    gameMode: 'points',
                    playersData,
                    topPlayers,
                    livesIcon: gameState.livesIcon,
                    lastQuestionPlayers,
                    rewardsData
                };

                emitGameEnded(gameState, {
                    winner: winnerData,
                    podium: podium,
                    duration,
                    totalQuestions: gameState.currentQuestionIndex,
                    gameMode: 'points',
                    playersData,
                    topPlayers,
                    lastQuestionPlayers,
                    rewardsData
                });

                // Reset complet
                resetGameState(gameState);
            }
        }
        // CAS 2: ÉGALITÉ → QUESTION DE DÉPARTAGE
        else {
            console.log(`⚖️ ÉGALITÉ: ${winners.length} joueurs avec ${maxPoints} points → Question de départage !`);

            // Stocker les twitchId
            gameState.isTiebreaker = true;
            gameState.tiebreakerPlayers = winners.map(w => w.twitchId);
            // La partie n'est plus en train de se terminer : elle se prolonge.
            // Sans ça l'hôte se heurtait à « Partie en cours de finalisation ».
            gameState.endingGame = false;

            addLog(gameState, 'tiebreaker', { playerCount: winners.length });

            diffuser(gameState, 'tiebreaker-announced', {
                tiebreakerPlayers: winners.map(w => ({
                    twitchId: w.twitchId,
                    username: w.username,
                    points: w.points
                })),
                message: '⚖️ Égalité ! Question de départage...'
            });

            console.log('⚠️ En attente que l\'admin lance la question de départage...');
        }

    } catch (error) {
        console.error('❌ Erreur fin de partie (Mode Points):', error);
    }
}


// FONCTION: Envoyer une question de départage (EXTREME)
async function sendTiebreakerQuestion(gameState) {
    try {
        gameState.currentQuestionIndex++;

        // Toujours prendre une question EXTREME pour le tiebreaker
        const difficulty = 'extreme';

        const questions = await db.getRandomQuestions(
            difficulty,
            1,
            gameState.usedQuestionIds,
            gameState.serieFilter,
            shouldApplySerieCooldown(gameState) ? gameState.recentSeries : [],  // 🆕
            gameState.noSpoil  // 🚫 Filtre anti-spoil
        );


        if (questions.length === 0) {
            console.error('❌ Aucune question extreme disponible pour tiebreaker');
            // Fallback: terminer avec égalité
            await endGameWithTie(gameState);
            return;
        }

        const question = questions[0];
        addToRecentSeries(gameState, question.serie);
        gameState.usedQuestionIds.push(question.id);

        console.log(`⚔️ Question de départage ${gameState.currentQuestionIndex} - Difficulté: EXTREME`);

        // Préparer les réponses
        const allAnswers = [
            { text: question.answer1, index: 1 },
            { text: question.answer2, index: 2 },
            { text: question.answer3, index: 3 },
            { text: question.answer4, index: 4 },
            { text: question.answer5, index: 5 },
            { text: question.answer6, index: 6 }
        ].filter(answer => answer.text !== null && answer.text !== '');

        const correctAnswerObj = allAnswers.find(a => a.index === question.coanswer);
        const wrongAnswers = allAnswers.filter(a => a.index !== question.coanswer);
        const wrongAnswersNeeded = gameState.answersCount - 1;
        const shuffledWrong = wrongAnswers.sort(() => 0.5 - Math.random()).slice(0, wrongAnswersNeeded);
        const selectedAnswers = [correctAnswerObj, ...shuffledWrong];
        const finalAnswers = selectedAnswers.sort(() => 0.5 - Math.random());
        const newCorrectIndex = finalAnswers.findIndex(a => a.index === question.coanswer) + 1;

        const questionData = {
            questionNumber: gameState.currentQuestionIndex,
            totalQuestions: null,
            questionId: question.id,
            question: question.question,
            answers: finalAnswers.map(a => a.text),
            serie: question.serie,
            difficulty: 'extreme',
            timeLimit: gameState.questionTime,
            isTiebreaker: true,
            proof_url: question.proof_url || null
        };

        gameState.currentQuestion = {
            ...questionData,
            correctAnswer: newCorrectIndex
        };

        gameState.questionStartTime = Date.now();
        gameState.showResults = false;
        gameState.lastQuestionResults = null;
        gameState.answers.clear();

        addLog(gameState, 'question', {
            questionNumber: gameState.currentQuestionIndex,
            difficulty: 'TIEBREAKER - EXTREME',
            series: question.serie
        });

        // Envoyer la question à TOUS les joueurs
        diffuser(gameState, 'new-question', questionData);

        // 🔥 FIX: Attendre la fin du timer PUIS révéler
        setTimeout(() => {
            if (gameState.inProgress && gameState.isTiebreaker) {
                revealTiebreakerAnswers(gameState, newCorrectIndex);
            }
        }, gameState.questionTime * 1000);

    } catch (error) {
        console.error('❌ Erreur question tiebreaker:', error);
    }
}

// 🔥 FIX TIEBREAKER: Fonction pour vérifier si on a un gagnant
async function checkTiebreakerWinner(gameState) {
    console.log('🔍 Vérification gagnant tiebreaker...');

    // 🆕 FIX: Récupérer TOUS les joueurs et les trier par points
    const allPlayersSorted = Array.from(gameState.players.values())
        .sort((a, b) => (b.points || 0) - (a.points || 0));

    if (allPlayersSorted.length === 0) {
        console.error('❌ Aucun joueur trouvé');
        return;
    }

    // 🆕 FIX: Le max points peut avoir changé (un joueur a pu rattraper)
    const maxPoints = allPlayersSorted[0]?.points || 0;
    const stillTied = allPlayersSorted.filter(p => p.points === maxPoints);

    console.log(`📊 Max points: ${maxPoints}, Joueurs à ${maxPoints} pts: ${stillTied.length}`);

    // 🆕 FIX: Mettre à jour la liste des joueurs en tiebreaker (peut avoir changé)
    gameState.tiebreakerPlayers = stillTied.map(p => p.twitchId);

    if (stillTied.length === 1) {
        // 🎉 UN GAGNANT !
        const winner = stillTied[0];
        console.log(`🏆 Tiebreaker terminé: ${winner.username} gagne avec ${winner.points} points !`);

        gameState.isTiebreaker = false;
        gameState.tiebreakerPlayers = [];

        // Terminer la partie avec ce gagnant
        const duration = Math.floor((Date.now() - gameState.gameStartTime) / 1000);

        try {
            const winnerData = {
                username: winner.username,
                points: winner.points || 0
            };

            // Créer le podium Top 3
            const allPlayersSorted = Array.from(gameState.players.values())
                .sort((a, b) => (b.points || 0) - (a.points || 0));
            const podium = allPlayersSorted.slice(0, 3).map((player, index) => ({
                rank: index + 1,
                username: player.username,
                points: player.points || 0,
                avatarUrl: player.avatarUrl || null
            }));

            const { playersData, topPlayers } = await generateGameEndedData(gameState);
            
            // 🔥 Sauvegarder les données de la dernière question AVANT le reset
            const lastQuestionPlayers = getLastQuestionPlayersData(gameState);

            gameState.winnerScreenData = {
                winner: winnerData,
                podium: podium,
                duration,
                totalQuestions: gameState.currentQuestionIndex,
                gameMode: 'points',
                playersData,
                topPlayers,
                livesIcon: gameState.livesIcon,
                lastQuestionPlayers
            };


            emitGameEnded(gameState, {
                winner: winnerData,
                podium: podium,
                duration,
                totalQuestions: gameState.currentQuestionIndex,
                gameMode: 'points',
                playersData,
                topPlayers,
                lastQuestionPlayers
            });

            // Reset complet
            resetGameState(gameState);

            console.log('✅ Partie terminée après tiebreaker');
        } catch (error) {
            console.error('❌ Erreur fin de partie après tiebreaker:', error);
        }
    } else {
        // ⚔️ ENCORE ÉGALITÉ
        console.log(`⚖️ Toujours ${stillTied.length} joueurs à égalité avec ${maxPoints} points`);

        gameState.tiebreakerPlayers = stillTied.map(p => p.twitchId);

        diffuser(gameState, 'tiebreaker-continues', {
            tiebreakerPlayers: stillTied.map(p => ({
                twitchId: p.twitchId,
                username: p.username,
                points: p.points
            })),
            message: '⚖️ Encore égalité ! Cliquez sur "Question suivante"'
        });

        console.log('⚠️ En attente que l\'admin lance la prochaine question de départage...');
    }
}

// 🆕 RIVALRY TIEBREAKER: Envoyer une question de départage entre équipes
async function sendRivalryTiebreakerQuestion(gameState) {
    try {
        gameState.currentQuestionIndex++;

        // Difficulté selon le mode choisi
        let difficulty;
        if (gameState.difficultyMode === 'croissante') {
            difficulty = 'extreme';
        } else {
            // Mode aléatoire : choisir une difficulté au hasard
            const difficulties = ['easy', 'medium', 'hard', 'extreme'];
            difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
        }

        const questions = await db.getRandomQuestions(
            difficulty,
            1,
            gameState.usedQuestionIds,
            gameState.serieFilter,
            shouldApplySerieCooldown(gameState) ? gameState.recentSeries : [],
            gameState.noSpoil  // 🚫 Filtre anti-spoil
        );

        if (questions.length === 0) {
            console.error('❌ Aucune question disponible pour tiebreaker rivalry');
            // Fallback: terminer avec égalité
            await endRivalryWithTie(gameState);
            return;
        }

        const question = questions[0];
        addToRecentSeries(gameState, question.serie);
        gameState.usedQuestionIds.push(question.id);

        console.log(`⚔️ Question de départage Rivalry #${gameState.currentQuestionIndex} - Difficulté: ${difficulty.toUpperCase()}`);

        // Préparer les réponses
        const allAnswers = [
            { text: question.answer1, index: 1 },
            { text: question.answer2, index: 2 },
            { text: question.answer3, index: 3 },
            { text: question.answer4, index: 4 },
            { text: question.answer5, index: 5 },
            { text: question.answer6, index: 6 }
        ].filter(answer => answer.text !== null && answer.text !== '');

        const correctAnswerObj = allAnswers.find(a => a.index === question.coanswer);
        const wrongAnswers = allAnswers.filter(a => a.index !== question.coanswer);
        const wrongAnswersNeeded = gameState.answersCount - 1;
        const shuffledWrong = wrongAnswers.sort(() => 0.5 - Math.random()).slice(0, wrongAnswersNeeded);
        const selectedAnswers = [correctAnswerObj, ...shuffledWrong];
        const finalAnswers = selectedAnswers.sort(() => 0.5 - Math.random());
        const newCorrectIndex = finalAnswers.findIndex(a => a.index === question.coanswer) + 1;

        const questionData = {
            questionNumber: gameState.currentQuestionIndex,
            totalQuestions: null,
            questionId: question.id,
            question: question.question,
            answers: finalAnswers.map(a => a.text),
            serie: question.serie,
            // La difficulté brute, pas un libellé : le barème des points s'appuie
            // dessus, et le panel affiche ce badge tel quel.
            difficulty: difficulty,
            timeLimit: gameState.questionTime,
            // Le panel n'a qu'un seul repère de départage : sans lui, la mention
            // n'apparaissait jamais en mode camps.
            isTiebreaker: true,
            isRivalryTiebreaker: true,
            proof_url: question.proof_url || null
        };

        gameState.currentQuestion = {
            ...questionData,
            correctAnswer: newCorrectIndex
        };

        gameState.questionStartTime = Date.now();
        gameState.showResults = false;
        gameState.lastQuestionResults = null;
        gameState.answers.clear();

        addLog(gameState, 'question', {
            questionNumber: gameState.currentQuestionIndex,
            difficulty: `DÉPARTAGE - ${difficulty.toUpperCase()}`,
            series: question.serie
        });

        // Envoyer la question à TOUS les joueurs
        diffuser(gameState, 'new-question', questionData);

        // 🆕 Annuler l'ancien timeout de révélation si existant
        if (gameState.rivalryRevealTimeout) {
            clearTimeout(gameState.rivalryRevealTimeout);
        }

        // Attendre la fin du timer PUIS révéler et vérifier
        gameState.rivalryRevealTimeout = setTimeout(() => {
            if (gameState.inProgress && gameState.isRivalryTiebreaker) {
                revealRivalryTiebreakerAnswers(gameState, newCorrectIndex);
            }
        }, gameState.questionTime * 1000);

    } catch (error) {
        console.error('❌ Erreur question tiebreaker rivalry:', error);
    }
}

// 🆕 RIVALRY TIEBREAKER: Révéler les réponses et calculer les scores
async function revealRivalryTiebreakerAnswers(gameState, correctAnswer) {
    console.log('⚔️ Révélation résultats tiebreaker Rivalry');
    
    // 🆕 Marquer qu'on est en phase de résultats
    gameState.showResults = true;

    const results = {
        correctAnswer,
        players: [],
        stats: { correct: 0, wrong: 0, afk: 0 }
    };

    // Calculer les points pour chaque joueur (utiliser socketId comme clé)
    gameState.players.forEach((player, socketId) => {
        const playerAnswer = gameState.answers.get(socketId);
        
        let isCorrect = false;
        let pointsEarned = 0;

        if (playerAnswer) {
            isCorrect = playerAnswer.answer === correctAnswer;
            if (isCorrect) {
                pointsEarned = 3000; // Points fixes pour tiebreaker
                player.points = (player.points || 0) + pointsEarned;
                results.stats.correct++;
                console.log(`✅ ${player.username} (Team ${player.team}) +3000 pts = ${player.points}`);
            } else {
                results.stats.wrong++;
                console.log(`❌ ${player.username} (Team ${player.team}) mauvaise réponse`);
            }
        } else {
            results.stats.afk++;
            console.log(`⏸️ ${player.username} (Team ${player.team}) AFK`);
        }

        results.players.push({
            socketId: socketId,
            twitchId: player.twitchId,
            username: player.username,
            answer: playerAnswer?.answer || null,
            isCorrect,
            pointsEarned,
            totalPoints: player.points || 0,
            team: player.team
        });
    });

    // Recalculer les scores d'équipe
    updateTeamScores(gameState);

    // Envoyer les résultats
    diffuser(gameState, 'question-results', {
        correctAnswer,
        players: results.players,
        stats: results.stats,
        teamScores: gameState.teamScores,
        isRivalryTiebreaker: true
    });

    console.log(`⚔️ Scores après tiebreaker: Team A = ${gameState.teamScores[1]}, Team B = ${gameState.teamScores[2]}`);

    // Vérifier si on a un gagnant
    await checkRivalryTiebreakerWinner(gameState);
}

// 🆕 RIVALRY TIEBREAKER: Vérifier si une équipe a pris l'avantage
async function checkRivalryTiebreakerWinner(gameState) {
    const team1Score = gameState.teamScores[1];
    const team2Score = gameState.teamScores[2];

    console.log(`🔍 Vérification gagnant tiebreaker Rivalry: ${team1Score} vs ${team2Score}`);
    console.log(`🔍 État: inProgress=${gameState.inProgress}, isRivalryTiebreaker=${gameState.isRivalryTiebreaker}`);

    if (team1Score !== team2Score) {
        // 🎉 UNE ÉQUIPE GAGNE !
        const winningTeam = team1Score > team2Score ? 1 : 2;
        console.log(`🏆 Tiebreaker Rivalry terminé: ${gameState.teamNames[winningTeam]} gagne avec ${gameState.teamScores[winningTeam]} points !`);

        // 🆕 Annuler TOUS les timeouts
        if (gameState.rivalryTiebreakerTimeout) {
            clearTimeout(gameState.rivalryTiebreakerTimeout);
            gameState.rivalryTiebreakerTimeout = null;
            console.log('⏹️ rivalryTiebreakerTimeout annulé');
        }
        if (gameState.rivalryRevealTimeout) {
            clearTimeout(gameState.rivalryRevealTimeout);
            gameState.rivalryRevealTimeout = null;
            console.log('⏹️ rivalryRevealTimeout annulé');
        }
        if (gameState.autoModeTimeout) {
            clearTimeout(gameState.autoModeTimeout);
            gameState.autoModeTimeout = null;
            console.log('⏹️ autoModeTimeout annulé');
        }
        
        gameState.isRivalryTiebreaker = false;
        console.log('✅ isRivalryTiebreaker = false');

        // Terminer la partie normalement
        const duration = Math.floor((Date.now() - gameState.gameStartTime) / 1000);

        const teamData = {
            team: winningTeam,
            teamName: gameState.teamNames[winningTeam],
            points: gameState.teamScores[winningTeam],
            isDraw: false
        };

        addLog(gameState, 'game-end', { winner: teamData.teamName, mode: 'rivalry-points-tiebreaker' });

        // 🔥 Préparer les données AVANT les appels DB
        const playersData = Array.from(gameState.players.values()).map(p => ({
            twitchId: p.twitchId,
            username: p.username,
            lives: p.lives,
            points: p.points || 0,
            correctAnswers: p.correctAnswers,
            team: p.team,
            isLastGlobalWinner: false,
            avatarUrl: p.avatarUrl || null
        }));

        const podium = [
            { rank: 1, teamName: gameState.teamNames[1], points: team1Score, team: 1 },
            { rank: 2, teamName: gameState.teamNames[2], points: team2Score, team: 2 }
        ].sort((a, b) => b.points - a.points);

        // 🔥 Sauvegarder avant reset (copie)
        const savedTeamScores = { ...gameState.teamScores };
        const savedTeamNames = { ...gameState.teamNames };
        const savedInitialPlayerCount = gameState.initialPlayerCount;

        // 🔥 FIX: Récupérer topPlayers AVANT l'émission
        let topPlayers = [];
        try {
            topPlayers = [];
        } catch (dbError) {
            console.error('⚠️ Erreur récup topPlayers:', dbError.message);
        }
        
        // 🔥 Sauvegarder les données de la dernière question AVANT le reset
        const lastQuestionPlayers = getLastQuestionPlayersData(gameState);

        // 🔥 ÉMETTRE game-ended IMMÉDIATEMENT
        const gameEndedPayload = {
            winner: teamData,
            teamScores: savedTeamScores,
            teamNames: savedTeamNames,
            podium,
            duration,
            totalQuestions: gameState.currentQuestionIndex,
            gameMode: 'rivalry-points',
            playersData,
            topPlayers,
            lastQuestionPlayers
        };

        gameState.winnerScreenData = {
            ...gameEndedPayload,
            livesIcon: gameState.livesIcon
        };

        emitGameEnded(gameState, gameEndedPayload);
        console.log('📡 game-ended émis pour rivalry-points-tiebreaker');

        resetGameState(gameState);

    } else {
        // ⚖️ ENCORE ÉGALITÉ
        console.log(`⚖️ Toujours égalité: ${team1Score} - ${team2Score}`);

        diffuser(gameState, 'tiebreaker-continues', {
            mode: 'rivalry',
            team1Score,
            team2Score,
            teamNames: gameState.teamNames,
            message: '⚖️ Encore égalité ! Cliquez sur "Question suivante"'
        });

        // 🆕 Si mode auto activé, lancer automatiquement après 3s
        if (gameState.autoMode) {
            console.log('🤖 Mode Auto : Prochaine question de départage dans 3s...');
            if (gameState.rivalryTiebreakerTimeout) {
                clearTimeout(gameState.rivalryTiebreakerTimeout);
            }
            gameState.rivalryTiebreakerTimeout = setTimeout(async () => {
                if (gameState.inProgress && gameState.isRivalryTiebreaker) {
                    await sendRivalryTiebreakerQuestion(gameState);
                }
            }, 3000);
        } else {
            console.log('⚠️ En attente que l\'admin lance la prochaine question de départage...');
        }
    }
}

// 🆕 RIVALRY: Terminer avec égalité (fallback si plus de questions)
async function endRivalryWithTie(gameState) {
    const duration = Math.floor((Date.now() - gameState.gameStartTime) / 1000);
    
    const teamData = {
        team: null,
        teamName: 'Égalité',
        points: gameState.teamScores[1],
        isDraw: true
    };

    addLog(gameState, 'game-end', { winner: 'Égalité', mode: 'rivalry-points' });
    console.log(`🏆 Mode Rivalité terminé en ÉGALITÉ: ${gameState.teamScores[1]} - ${gameState.teamScores[2]}`);

    const playersData = Array.from(gameState.players.values()).map(p => ({
        twitchId: p.twitchId,
        username: p.username,
        lives: p.lives,
        points: p.points || 0,
        correctAnswers: p.correctAnswers,
        team: p.team,
        isLastGlobalWinner: false,
        avatarUrl: p.avatarUrl || null
    }));

    const podium = [
        { rank: 1, teamName: gameState.teamNames[1], points: gameState.teamScores[1], team: 1 },
        { rank: 1, teamName: gameState.teamNames[2], points: gameState.teamScores[2], team: 2 }
    ];

    // 🔥 Sauvegarder avant reset (copie)
    const savedTeamScores = { ...gameState.teamScores };
    const savedTeamNames = { ...gameState.teamNames };

    // 🔥 FIX: Récupérer topPlayers AVANT l'émission
    let topPlayers = [];
    try {
        topPlayers = [];
    } catch (dbError) {
        console.error('⚠️ Erreur récup topPlayers:', dbError.message);
    }

    // 🔥 Sauvegarder les données de la dernière question AVANT le reset
    const lastQuestionPlayers = getLastQuestionPlayersData(gameState);

    const gameEndedPayload = {
        winner: teamData,
        teamScores: savedTeamScores,
        teamNames: savedTeamNames,
        podium,
        duration,
        totalQuestions: gameState.currentQuestionIndex,
        gameMode: 'rivalry-points',
        playersData,
        topPlayers,
        lastQuestionPlayers
    };

    gameState.winnerScreenData = {
        ...gameEndedPayload,
        livesIcon: gameState.livesIcon
    };

    emitGameEnded(gameState, gameEndedPayload);
    console.log('📡 game-ended émis pour rivalry-points (égalité)');

    resetGameState(gameState);
}


// FONCTION: Terminer avec égalité (fallback si plus de questions)
async function endGameWithTie(gameState) {
    const duration = Math.floor((Date.now() - gameState.gameStartTime) / 1000);

    const sortedPlayers = Array.from(gameState.players.values())
        .sort((a, b) => (b.points || 0) - (a.points || 0));

    const maxPoints = sortedPlayers[0]?.points || 0;
    const winners = sortedPlayers.filter(p => p.points === maxPoints);

    const rewardsData = null;

    const winnerData = {
        tie: true,
        winners: winners.map(w => ({
            username: w.username,
            points: w.points || 0
        })),
        points: maxPoints,
        username: winners.map(w => w.username).join(' & ')
    };

    const podium = sortedPlayers.slice(0, 3).map((player, index) => ({
        rank: index + 1,
        username: player.username,
        points: player.points || 0,
        avatarUrl: player.avatarUrl || null
    }));

    const { playersData, topPlayers } = await generateGameEndedData(gameState);
    
    // 🔥 Sauvegarder les données de la dernière question AVANT le reset
    const lastQuestionPlayers = getLastQuestionPlayersData(gameState);

    gameState.winnerScreenData = {
        winner: winnerData,
        podium: podium,
        duration,
        totalQuestions: gameState.currentQuestionIndex,
        gameMode: 'points',
        playersData,
        topPlayers,
        livesIcon: gameState.livesIcon,
        lastQuestionPlayers,
        rewardsData
    };


    emitGameEnded(gameState, {
        winner: winnerData,
        podium: podium,
        duration,
        totalQuestions: gameState.currentQuestionIndex,
        gameMode: 'points',
        playersData,
        topPlayers,
        lastQuestionPlayers,
        rewardsData
    });

    resetGameState(gameState);
}

// 🔥 Helper: Extraire les données de la dernière question pour l'écran winner (hover)
function getLastQuestionPlayersData(gameState) {
    if (!gameState.lastQuestionResults || !gameState.lastQuestionResults.players) return null;
    return gameState.lastQuestionResults.players.map(p => ({
        username: p.username,
        status: p.status,
        isCorrect: p.isCorrect,
        selectedAnswer: p.selectedAnswer || null,
        responseTime: p.responseTime || null
    }));
}

// Terminer la partie
async function endGame(gameState, winner) {
    const duration = Math.floor((Date.now() - gameState.gameStartTime) / 1000);

    try {
        let winnerData = null;
        let rewardsData = null;

        if (winner) {
            gameState.lastGlobalWinner = winner.twitchId;
            addLog(gameState, 'game-end', { winner: winner.username });

            winnerData = {
                username: winner.username,
                correctAnswers: winner.correctAnswers,
                livesRemaining: winner.lives
            };
        } else {
            // 🆕 Cas aucun gagnant - terminer la partie en DB quand même
            console.log('💀 Fin de partie sans gagnant');
            addLog(gameState, 'game-end', { winner: 'Aucun' });
        }

        const playersData = Array.from(gameState.players.values()).map(p => ({
            twitchId: p.twitchId,
            username: p.username,
            lives: p.lives,
            correctAnswers: p.correctAnswers,
            isLastGlobalWinner: p.twitchId === gameState.lastGlobalWinner,
            avatarUrl: p.avatarUrl || null
        }));

        const topPlayers = [];


        // 🔥 Sauvegarder les données de la dernière question AVANT le reset
        const lastQuestionPlayers = getLastQuestionPlayersData(gameState);

        // 🔥 Stocker pour restauration
        gameState.winnerScreenData = {
            winner: winnerData,
            duration,
            totalQuestions: gameState.currentQuestionIndex,
            gameMode: 'lives',
            playersData: playersData,
            topPlayers,
            livesIcon: gameState.livesIcon,
            lastQuestionPlayers,
            rewardsData: rewardsData
        };


        // 🆕 N'envoyer game-ended que s'il y a un gagnant
        if (winner) {
            emitGameEnded(gameState, {
                winner: winnerData,
                duration,
                totalQuestions: gameState.currentQuestionIndex,
                gameMode: 'lives',
                playersData: playersData,
                topPlayers,
                lastQuestionPlayers,
                rewardsData
            });
        }

        // Reset
        resetGameState(gameState);

        // 🆕 Si aucun gagnant, fermer le lobby automatiquement
        if (!winner) {
            console.log('🔒 Fermeture automatique du lobby (aucun gagnant)');
            gameState.isActive = false;
            diffuser(gameState, 'game-deactivated');
        }

    } catch (error) {
        console.error('❌ Erreur fin de partie:', error);
        // 🆕 Reset même en cas d'erreur pour débloquer
        resetGameState(gameState);
    }
}

// 🆕 Fin de partie mode Rivalité (vie)
async function endGameRivalry(gameState, winningTeam) {
    const duration = Math.floor((Date.now() - gameState.gameStartTime) / 1000);
    
    try {
        updateTeamScores(gameState);
        
        const teamData = {
            team: winningTeam === 'draw' ? null : winningTeam,
            teamName: winningTeam === 'draw' ? 'Égalité' : gameState.teamNames[winningTeam],
            livesRemaining: winningTeam === 'draw' ? 0 : gameState.teamScores[winningTeam],
            isDraw: winningTeam === 'draw'
        };
        
        // Log
        addLog(gameState, 'game-end', { winner: teamData.teamName, mode: 'rivalry' });
        console.log(`🏆 Mode Rivalité terminé - ${teamData.teamName} gagne avec ${teamData.livesRemaining} vies`);
        
        // 🔥 Préparer les données AVANT les appels DB
        const playersData = Array.from(gameState.players.values()).map(p => ({
            twitchId: p.twitchId,
            username: p.username,
            lives: p.lives,
            points: p.points || 0,
            correctAnswers: p.correctAnswers,
            team: p.team,
            isLastGlobalWinner: false,
            avatarUrl: p.avatarUrl || null
        }));
        
        // 🔥 Sauvegarder avant reset (copie)
        const savedTeamScores = { ...gameState.teamScores };
        const savedTeamNames = { ...gameState.teamNames };
        const savedInitialPlayerCount = gameState.initialPlayerCount;
        
        // 🔥 FIX: Récupérer topPlayers AVANT l'émission (comme en mode classique)
        let topPlayers = [];
        try {
            topPlayers = [];
        } catch (dbError) {
            console.error('⚠️ Erreur récup topPlayers:', dbError.message);
        }
        
        // 🔥 Sauvegarder les données de la dernière question AVANT le reset
        const lastQuestionPlayers = getLastQuestionPlayersData(gameState);
        
        const rewardsData = null;

        const gameEndedPayload = {
            winner: teamData,
            teamScores: savedTeamScores,
            teamNames: savedTeamNames,
            duration,
            totalQuestions: gameState.currentQuestionIndex,
            gameMode: 'rivalry-lives',
            playersData: playersData,
            topPlayers,
            lastQuestionPlayers,
            rewardsData
        };
        
        gameState.winnerScreenData = {
            ...gameEndedPayload,
            livesIcon: gameState.livesIcon
        };
        
        emitGameEnded(gameState, gameEndedPayload);
        console.log('📡 game-ended émis pour rivalry-lives');
        
        
        resetGameState(gameState);
        
    } catch (error) {
        console.error('❌ Erreur fin de partie Rivalité:', error);
        resetGameState(gameState);
    }
}

// 🆕 Fin de partie mode Rivalité (points)
async function endGameRivalryPoints(gameState) {
    const duration = Math.floor((Date.now() - gameState.gameStartTime) / 1000);
    
    try {
        updateTeamScores(gameState);
        
        const team1Points = gameState.teamScores[1];
        const team2Points = gameState.teamScores[2];
        
        // 🆕 TIEBREAKER: Si égalité, lancer une question de départage
        if (team1Points === team2Points) {
            console.log(`⚖️ ÉGALITÉ RIVALRY: ${team1Points} - ${team2Points} → Question de départage !`);
            
            gameState.isRivalryTiebreaker = true;
            // La partie se prolonge au lieu de se terminer : sans ça l'hôte
            // se heurtait à « Partie en cours de finalisation » et le départage
            // ne partait jamais. Même correctif qu'en solo.
            gameState.endingGame = false;
            
            addLog(gameState, 'tiebreaker', { mode: 'rivalry', score: team1Points, playerCount: gameState.players.size });
            
            diffuser(gameState, 'tiebreaker-announced', {
                mode: 'rivalry',
                team1Score: team1Points,
                team2Score: team2Points,
                teamNames: gameState.teamNames,
                message: '⚖️ Égalité ! Question de départage...'
            });
            
            // 🆕 Si mode auto activé, lancer automatiquement après 3s
            if (gameState.autoMode) {
                console.log('🤖 Mode Auto : Question de départage dans 3s...');
                if (gameState.rivalryTiebreakerTimeout) {
                    clearTimeout(gameState.rivalryTiebreakerTimeout);
                }
                gameState.rivalryTiebreakerTimeout = setTimeout(async () => {
                    if (gameState.inProgress && gameState.isRivalryTiebreaker) {
                        await sendRivalryTiebreakerQuestion(gameState);
                    }
                }, 3000);
            } else {
                console.log('⚠️ En attente que l\'admin lance la question de départage (clic sur Question suivante)...');
            }
            
            return; // Ne pas terminer la partie
        }
        
        let winningTeam;
        if (team1Points > team2Points) {
            winningTeam = 1;
        } else {
            winningTeam = 2;
        }
        
        const teamData = {
            team: winningTeam,
            teamName: gameState.teamNames[winningTeam],
            points: gameState.teamScores[winningTeam],
            isDraw: false
        };
        
        // Log
        addLog(gameState, 'game-end', { winner: teamData.teamName, mode: 'rivalry-points' });
        console.log(`🏆 Mode Rivalité (points) terminé - ${teamData.teamName} gagne avec ${teamData.points} points`);
        
        // 🔥 Préparer les données AVANT les appels DB (pas de dépendance DB)
        const playersData = Array.from(gameState.players.values()).map(p => ({
            twitchId: p.twitchId,
            username: p.username,
            lives: p.lives,
            points: p.points || 0,
            correctAnswers: p.correctAnswers,
            team: p.team,
            isLastGlobalWinner: false,
            avatarUrl: p.avatarUrl || null
        }));
        
        // Créer le podium par équipe
        const podium = [
            { rank: 1, teamName: gameState.teamNames[1], points: team1Points, team: 1 },
            { rank: 2, teamName: gameState.teamNames[2], points: team2Points, team: 2 }
        ].sort((a, b) => b.points - a.points);
        
        // 🔥 Sauvegarder teamScores/teamNames avant reset (copie)
        const savedTeamScores = { ...gameState.teamScores };
        const savedTeamNames = { ...gameState.teamNames };
        const savedInitialPlayerCount = gameState.initialPlayerCount;
        
        // 🔥 FIX: Récupérer topPlayers AVANT l'émission (comme en mode classique)
        let topPlayers = [];
        try {
            topPlayers = [];
        } catch (dbError) {
            console.error('⚠️ Erreur récup topPlayers:', dbError.message);
        }
        
        // 🔥 Sauvegarder les données de la dernière question AVANT le reset
        const lastQuestionPlayers = getLastQuestionPlayersData(gameState);
        
        const rewardsData = null;

        const gameEndedPayload = {
            winner: teamData,
            teamScores: savedTeamScores,
            teamNames: savedTeamNames,
            podium,
            duration,
            totalQuestions: gameState.currentQuestionIndex,
            gameMode: 'rivalry-points',
            playersData: playersData,
            topPlayers,
            lastQuestionPlayers,
            rewardsData
        };
        
        gameState.winnerScreenData = {
            ...gameEndedPayload,
            livesIcon: gameState.livesIcon
        };
        
        emitGameEnded(gameState, gameEndedPayload);
        console.log('📡 game-ended émis pour rivalry-points');
        
        
        resetGameState(gameState);
        
    } catch (error) {
        console.error('❌ Erreur fin de partie Rivalité (points):', error);
        resetGameState(gameState);
    }
}




app.get('/question', (req, res) => {
    res.sendFile(__dirname + '/src/html/question.html');
});

// API ajout question - avec code spécifique

app.post('/api/add-question', async (req, res) => {
    // Le corpus change : la banque en mémoire doit être relue
    invaliderBanque();
    const { adminCode, question, answers, correctAnswer, serie, difficulty, proof_url, is_spoil } = req.body;

    // Vérifier le code (spécifique OU master)
    if (adminCode !== process.env.QUESTION_ADMIN_CODE || adminCode === process.env.MASTER_ADMIN_CODE) {
        return res.status(401).json({ error: 'Code invalide' });
    }

    try {
        const { data, error } = await supabase
            .from('questions')
            .insert([{
                question,
                answer1: answers[0],
                answer2: answers[1],
                answer3: answers[2],
                answer4: answers[3],
                answer5: answers[4],
                answer6: answers[5],
                coanswer: correctAnswer,
                serie,
                difficulty,
                proof_url: proof_url || null,
                is_spoil: is_spoil === true
            }]);

        if (error) throw error;

        res.json({ success: true, message: 'Question ajoutée !' });
    } catch (error) {
        console.error('Erreur ajout question:', error);
        res.status(500).json({ error: 'Erreur lors de l\'ajout' });
    }
});


// 🆕 Modifier une question
app.post('/api/update-question', async (req, res) => {
    // Le corpus change : la banque en mémoire doit être relue
    invaliderBanque();
    const { adminCode, id, question, answers, correctAnswer, serie, difficulty, proof_url, is_spoil } = req.body;

    // Vérifier le code
    if (adminCode !== process.env.QUESTION_ADMIN_CODE && adminCode !== process.env.MASTER_ADMIN_CODE) {
        return res.status(401).json({ error: 'Code invalide' });
    }

    try {
        const { data, error } = await supabase
            .from('questions')
            .update({
                question,
                answer1: answers[0],
                answer2: answers[1],
                answer3: answers[2],
                answer4: answers[3],
                answer5: answers[4],
                answer6: answers[5],
                coanswer: correctAnswer,
                serie,
                difficulty,
                proof_url: proof_url || null,
                is_spoil: is_spoil === true
            })
            .eq('id', id);

        if (error) throw error;

        res.json({ success: true, message: 'Question modifiée !' });
    } catch (error) {
        console.error('Erreur modification question:', error);
        res.status(500).json({ error: 'Erreur lors de la modification' });
    }
});


// 🚫 Toggle le statut spoil d'une question
app.post('/api/toggle-spoil', async (req, res) => {
    // Le corpus change : la banque en mémoire doit être relue
    invaliderBanque();
    const { adminCode, id, is_spoil } = req.body;

    if (adminCode !== process.env.QUESTION_ADMIN_CODE && adminCode !== process.env.MASTER_ADMIN_CODE) {
        return res.status(401).json({ error: 'Code invalide' });
    }

    try {
        const { data, error } = await supabase
            .from('questions')
            .update({ is_spoil: is_spoil === true })
            .eq('id', id);

        if (error) throw error;

        console.log(`🚫 Question ${id} → spoil: ${is_spoil}`);
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur toggle spoil:', error);
        res.status(500).json({ error: 'Erreur lors du toggle spoil' });
    }
});


// 🆕 Supprimer une question
app.post('/api/delete-question', async (req, res) => {
    // Le corpus change : la banque en mémoire doit être relue
    invaliderBanque();
    const { adminCode, id } = req.body;

    // Vérifier le code
    if (adminCode !== process.env.QUESTION_ADMIN_CODE && adminCode !== process.env.MASTER_ADMIN_CODE) {
        return res.status(401).json({ error: 'Code invalide' });
    }

    try {
        const { data, error } = await supabase
            .from('questions')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({ success: true, message: 'Question supprimée !' });
    } catch (error) {
        console.error('Erreur suppression question:', error);
        res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
});

// Récupérer toutes les questions (avec filtre optionnel)
app.get('/api/questions', async (req, res) => {
    const { adminCode } = req.query;

    // Vérifier le code
    if (adminCode !== process.env.QUESTION_ADMIN_CODE && adminCode !== process.env.MASTER_ADMIN_CODE) {
        return res.status(401).json({ error: 'Code invalide' });
    }

    try {
        const { data, error } = await supabase
            .from('questions')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;

        res.json({ success: true, questions: data });
    } catch (error) {
        console.error('Erreur récupération questions:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Récupérer la liste des séries uniques
app.get('/api/series', async (req, res) => {
    const { adminCode } = req.query;

    if (adminCode !== process.env.QUESTION_ADMIN_CODE && adminCode !== process.env.MASTER_ADMIN_CODE) {
        return res.status(401).json({ error: 'Code invalide' });
    }

    try {
        const { data, error } = await supabase
            .from('questions')
            .select('serie');

        if (error) throw error;

        // Extraire les séries uniques et trier
        const uniqueSeries = [...new Set(data.map(q => q.serie).filter(s => s))].sort();

        res.json({ success: true, series: uniqueSeries });
    } catch (error) {
        console.error('Erreur récupération séries:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});


app.post('/api/verify-question-code', (req, res) => {
    const { code } = req.body;

    if (code === process.env.QUESTION_ADMIN_CODE || code === process.env.MASTER_ADMIN_CODE) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

// 🚨 Signalement d'une question par l'hôte (qualité de la base de questions)
app.post('/admin/report-question', async (req, res) => {
    try {
        const { questionId, questionText, difficulty, reason } = req.body;

        if (!questionText || !reason) {
            return res.status(400).json({ error: 'Données manquantes' });
        }

        const { data, error } = await supabase
            .from('reported_questions')
            .insert({
                question_id: questionId,
                question_text: questionText,
                difficulty: difficulty,
                reason: reason,
                reported_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        console.log('🚨 Question signalée:', questionText);
        res.json({ success: true, report: data });
    } catch (error) {
        console.error('❌ Erreur signalement question:', error);
        res.status(500).json({ error: error.message });
    }
});


// POST /admin/set-lives-icon
app.post('/admin/set-lives-icon', (req, res) => {
    const gameState = req.room;   // posée par le garde-fou d'hôte

    const { icon } = req.body;
    const validIcons = ['heart', 'dragonball', 'flame', 'sharingan', 'katana', 'shuriken', 'konoha', 'alchemy', 'curse', 'kunai', 'star4'];

    if (!validIcons.includes(icon)) {
        return res.status(400).json({ error: 'Invalid icon' });
    }

    gameState.livesIcon = icon;

    // Broadcast aux clients
    diffuser(gameState, 'lobby-update', {
        livesIcon: icon
    });

    console.log(`🎨 Icône de vies changée: ${icon}`);
    res.json({ success: true, icon });
});


// ============================================
// Socket.IO
// ============================================
const server = app.listen(PORT, () => {
    console.log(`
    ╔═══════════════════════════════════════╗
    ║    🎮 SHONENMASTER SERVER (v2) 🎮     ║
    ╠═══════════════════════════════════════╣
    ║  Port: ${PORT}                        ║
    ║  Status: ✅ Online                    ║
    ║  Mode: ${process.env.NODE_ENV || 'development'}
    ╚═══════════════════════════════════════╝
    `);

    loadRecentGamesFromDb();
    db.getAllQuestions().catch(() => { /* elle se chargera à la première partie */ });

});



// ============================================
// 💣 BOMBANIME - Fonctions de jeu
// ============================================

// Valider un nom de personnage
function validateBombanimeCharacter(gameState, name, serie) {
    if (!name || !serie) return { valid: false, reason: 'invalid_input' };
    
    const characters = BOMBANIME_CHARACTERS[serie];
    if (!characters) return { valid: false, reason: 'serie_not_found' };
    
    const normalizedName = name.trim().toUpperCase();
    
    // Vérifier si le nom est dans la liste
    const isValid = characters.some(char => char.toUpperCase() === normalizedName);
    
    if (!isValid) return { valid: false, reason: 'character_not_found' };
    
    // Vérifier si le nom a déjà été utilisé
    if (gameState.bombanime.usedNames.has(normalizedName)) {
        return { valid: false, reason: 'already_used' };
    }
    
    return { valid: true, normalizedName };
}

// Obtenir la première lettre d'un nom (pour l'alphabet)
function getFirstLetter(name) {
    if (!name) return null;
    const normalized = name.trim().toUpperCase();
    const firstChar = normalized.charAt(0);
    // Vérifier que c'est une lettre A-Z
    if (/^[A-Z]$/.test(firstChar)) {
        return firstChar;
    }
    return null;
}

// Extraire toutes les lettres uniques d'un nom (A-Z seulement)
function getAllLetters(name) {
    if (!name) return [];
    const normalized = name.trim().toUpperCase();
    const letters = new Set();
    for (const char of normalized) {
        if (/^[A-Z]$/.test(char)) {
            letters.add(char);
        }
    }
    return Array.from(letters);
}

// Vérifier si un joueur a complété l'alphabet
function checkAlphabetComplete(gameState, twitchId) {
    const alphabet = gameState.bombanime.playerAlphabets.get(twitchId);
    if (!alphabet) return false;
    return alphabet.size >= 26;
}

// ============================================
// 🎯 BOMBANIME - Système de Défis
// ============================================

// Lettres communes (exclut Q, X, W, Z pour le défi 3 persos)
const COMMON_LETTERS = 'ABCDEFGHIJKLMNOPRSTUY'.split('');
const ALL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Générer les 2 défis BombAnime pour une partie
function generateBombanimeChallenges() {
    const challenges = [];
    
    // Défi 1: 3 personnages commençant par lettre X (lettres communes uniquement)
    const letter3 = COMMON_LETTERS[Math.floor(Math.random() * COMMON_LETTERS.length)];
    challenges.push({
        id: 'three_letters',
        type: 'three_letters',
        letter: letter3,
        target: 3,
        reward: 'extraLife',
        name: `3 persos en "${letter3}"`,
        description: `Donnez 3 personnages commençant par "${letter3}"`
    });
    
    // Défi 2: 1 personnage commençant par lettre Y (toutes lettres)
    // On évite la même lettre que le défi 1 si possible
    let letter1;
    do {
        letter1 = ALL_LETTERS[Math.floor(Math.random() * ALL_LETTERS.length)];
    } while (letter1 === letter3 && ALL_LETTERS.length > 1);
    
    challenges.push({
        id: 'one_letter',
        type: 'one_letter',
        letter: letter1,
        target: 1,
        reward: 'freeCharacter',
        name: `1 perso en "${letter1}"`,
        description: `Donnez 1 personnage commençant par "${letter1}"`
    });
    
    console.log(`🎯 Défis BombAnime générés: "${letter3}" (x3) et "${letter1}" (x1)`);
    return challenges;
}

// Initialiser la progression des défis pour un joueur BombAnime
function initBombanimePlayerChallenges(gameState, twitchId) {
    const progress = {
        challenges: {},
        lettersGiven: new Map() // Map<letter, count> pour tracker les lettres données
    };
    
    // Initialiser chaque défi actif
    gameState.bombanime.challenges.forEach(challenge => {
        progress.challenges[challenge.id] = {
            progress: 0,
            target: challenge.target,
            completed: false,
            letter: challenge.letter
        };
    });
    
    gameState.bombanime.playerChallenges.set(twitchId, progress);
    
    // Initialiser les bonus du joueur
    if (!gameState.bombanime.playerBonuses.has(twitchId)) {
        gameState.bombanime.playerBonuses.set(twitchId, {
            freeCharacter: 0,
            extraLife: 0
        });
    }
}

// Vérifier et mettre à jour les défis BombAnime après une réponse valide
function checkBombanimeChallenges(gameState, twitchId, characterName) {
    const playerProgress = gameState.bombanime.playerChallenges.get(twitchId);
    if (!playerProgress) return [];
    
    const completedChallenges = [];
    const firstLetter = characterName.charAt(0).toUpperCase();
    
    // Mettre à jour le compteur de lettres
    const currentCount = playerProgress.lettersGiven.get(firstLetter) || 0;
    playerProgress.lettersGiven.set(firstLetter, currentCount + 1);
    
    // Vérifier chaque défi actif
    gameState.bombanime.challenges.forEach(challenge => {
        const cp = playerProgress.challenges[challenge.id];
        if (!cp || cp.completed) return;
        
        // Vérifier si la première lettre correspond au défi
        if (firstLetter === challenge.letter) {
            cp.progress = playerProgress.lettersGiven.get(challenge.letter) || 0;
            
            // Vérifier si défi complété
            if (cp.progress >= cp.target && !cp.completed) {
                cp.completed = true;
                completedChallenges.push({
                    challengeId: challenge.id,
                    reward: challenge.reward
                });
                
                // Ajouter le bonus à l'inventaire du joueur
                const bonuses = gameState.bombanime.playerBonuses.get(twitchId);
                if (bonuses) {
                    bonuses[challenge.reward]++;
                    console.log(`🏆 Défi BombAnime "${challenge.name}" complété par ${twitchId} ! Bonus: ${challenge.reward} (total: ${bonuses[challenge.reward]})`);
                }
            }
        }
    });
    
    return completedChallenges;
}

// Obtenir l'état des défis BombAnime pour un joueur (pour envoi au client)
function getBombanimePlayerChallengesState(gameState, twitchId) {
    const playerProgress = gameState.bombanime.playerChallenges.get(twitchId);
    if (!playerProgress) return [];
    
    return gameState.bombanime.challenges.map(challenge => {
        const cp = playerProgress.challenges[challenge.id];
        return {
            id: challenge.id,
            name: challenge.name,
            description: challenge.description,
            reward: challenge.reward,
            letter: challenge.letter,
            progress: cp ? cp.progress : 0,
            target: challenge.target,
            completed: cp ? cp.completed : false
        };
    });
}

// Obtenir les bonus BombAnime d'un joueur
function getBombanimePlayerBonuses(gameState, twitchId) {
    return gameState.bombanime.playerBonuses.get(twitchId) || { freeCharacter: 0, extraLife: 0 };
}

// Obtenir un personnage aléatoire non utilisé pour le bonus perso gratuit
function getRandomUnusedCharacter(gameState, serie) {
    const characters = BOMBANIME_CHARACTERS[serie];
    if (!characters) return null;
    
    // Filtrer les personnages non utilisés
    const unusedCharacters = characters.filter(char => 
        !gameState.bombanime.usedNames.has(char.toUpperCase())
    );
    
    if (unusedCharacters.length === 0) return null;
    
    // Retourner un personnage aléatoire
    return unusedCharacters[Math.floor(Math.random() * unusedCharacters.length)];
}

// Obtenir les joueurs BombAnime encore en vie
function getAliveBombanimePlayers(gameState) {
    return Array.from(gameState.players.values()).filter(p => p.lives > 0);
}

// Passer au joueur suivant dans le cercle
function getNextBombanimePlayer(gameState) {
    const alivePlayers = getAliveBombanimePlayers(gameState);
    if (alivePlayers.length <= 1) return null;
    
    const currentTwitchId = gameState.bombanime.currentPlayerTwitchId;
    const playersOrder = gameState.bombanime.playersOrder;
    const direction = gameState.bombanime.bombDirection;
    
    // Trouver l'index du joueur actuel dans l'ordre ORIGINAL
    const currentIndexInOriginal = playersOrder.indexOf(currentTwitchId);
    
    // Parcourir dans la direction jusqu'à trouver un joueur vivant
    let nextIndex = currentIndexInOriginal;
    for (let i = 0; i < playersOrder.length; i++) {
        nextIndex = (nextIndex + direction + playersOrder.length) % playersOrder.length;
        const candidateTwitchId = playersOrder[nextIndex];
        
        // Vérifier si ce joueur est vivant
        const candidate = Array.from(gameState.players.values()).find(p => p.twitchId === candidateTwitchId);
        if (candidate && candidate.lives > 0) {
            return candidateTwitchId;
        }
    }
    
    return null;
}

// Démarrer le tour d'un joueur BombAnime
function startBombanimeTurn(gameState, twitchId) {
    if (!gameState.bombanime.active) return;
    
    // Annuler le timeout précédent
    if (gameState.bombanime.turnTimeout) {
        clearTimeout(gameState.bombanime.turnTimeout);
    }
    
    // Trouver le joueur AVANT de modifier l'état
    let player = Array.from(gameState.players.values()).find(p => p.twitchId === twitchId);
    
    // 🔥 FIX: Si le joueur n'est pas trouvé, chercher le prochain joueur vivant
    if (!player) {
        console.log(`⚠️ Joueur ${twitchId} introuvable - recherche du prochain joueur...`);
        
        // Temporairement setter le currentPlayerTwitchId pour que getNextBombanimePlayer fonctionne
        gameState.bombanime.currentPlayerTwitchId = twitchId;
        
        const alivePlayers = getAliveBombanimePlayers(gameState);
        if (alivePlayers.length <= 1) {
            // Fin de partie ou aucun joueur
            if (alivePlayers.length === 1) {
                endBombanimeGame(gameState, alivePlayers[0]);
            } else {
                endBombanimeGame(gameState, null);
            }
            return;
        }
        
        // Essayer de trouver le prochain joueur vivant
        const nextTwitchId = getNextBombanimePlayer(gameState);
        if (nextTwitchId) {
            console.log(`🔄 Joueur de remplacement trouvé: ${nextTwitchId}`);
            player = Array.from(gameState.players.values()).find(p => p.twitchId === nextTwitchId);
            twitchId = nextTwitchId;
        }
        
        // Si toujours pas de joueur trouvé, fallback sur le premier joueur vivant
        if (!player) {
            player = alivePlayers[0];
            twitchId = player.twitchId;
            console.log(`🔄 Fallback sur premier joueur vivant: ${player.username}`);
        }
    }
    
    // Incrémenter l'identifiant de tour (protection contre race conditions)
    gameState.bombanime.turnId++;
    const currentTurnId = gameState.bombanime.turnId;
    
    gameState.bombanime.currentPlayerTwitchId = twitchId;
    gameState.bombanime.turnStartTime = Date.now();
    gameState.bombanime.isPaused = false;
    
    console.log(`💣 Tour de ${player.username} (${gameState.bombanime.timer}s) [turnId=${currentTurnId}]`);
    
    // Envoyer l'état à tous les clients
    diffuser(gameState, 'bombanime-turn-start', {
        currentPlayerTwitchId: twitchId,
        currentPlayerUsername: player.username,
        timer: gameState.bombanime.timer,
        playersOrder: gameState.bombanime.playersOrder,
        direction: gameState.bombanime.bombDirection
    });
    
    // Timeout pour l'explosion - vérifie turnId pour éviter race condition
    gameState.bombanime.turnTimeout = setTimeout(() => {
        // Si le turnId a changé, le joueur a répondu à temps
        if (gameState.bombanime.turnId !== currentTurnId) {
            console.log(`⏱️ Explosion annulée [turnId changé: ${currentTurnId} -> ${gameState.bombanime.turnId}]`);
            return;
        }
        bombExplode(gameState, twitchId);
    }, gameState.bombanime.timer * 1000);
}

// La bombe explose sur un joueur
function bombExplode(gameState, twitchId) {
    if (!gameState.bombanime.active) return;
    
    // IMPORTANT: Vérifier que c'est toujours le tour de ce joueur
    // Si ce n'est plus son tour, c'est qu'il a répondu à temps (race condition évitée)
    if (gameState.bombanime.currentPlayerTwitchId !== twitchId) {
        console.log(`⏱️ Explosion ignorée pour ${twitchId} - ce n'est plus son tour (a répondu à temps)`);
        return;
    }
    
    const player = Array.from(gameState.players.values()).find(p => p.twitchId === twitchId);
    if (!player) return;
    
    // Calculer le temps écoulé depuis le début du tour
    const elapsedMs = Date.now() - gameState.bombanime.turnStartTime;
    console.log(`💥 EXPLOSION sur ${player.username}! (après ${elapsedMs}ms, turnId=${gameState.bombanime.turnId})`);
    
    // Retirer une vie
    player.lives--;
    
    const isEliminated = player.lives <= 0;
    
    if (isEliminated) {
        gameState.bombanime.eliminatedPlayers.push({
            twitchId: player.twitchId,
            username: player.username,
            rank: getAliveBombanimePlayers(gameState).length + 1
        });
        console.log(`☠️ ${player.username} ÉLIMINÉ!`);
    }
    
    // Envoyer l'événement d'explosion
    diffuser(gameState, 'bombanime-explosion', {
        playerTwitchId: twitchId,
        playerUsername: player.username,
        livesRemaining: player.lives,
        isEliminated: isEliminated,
        playersData: getBombanimePlayersData(gameState),
        // Debug
        debugElapsedMs: elapsedMs,
        debugTurnId: gameState.bombanime.turnId
    });
    
    // Vérifier si la partie est terminée
    const alivePlayers = getAliveBombanimePlayers(gameState);
    if (alivePlayers.length <= 1) {
        endBombanimeGame(gameState, alivePlayers[0] || null);
        return;
    }
    
    // Pause puis passer au joueur suivant
    gameState.bombanime.isPaused = true;
    setTimeout(() => {
        const nextPlayerTwitchId = getNextBombanimePlayer(gameState);
        if (nextPlayerTwitchId) {
            startBombanimeTurn(gameState, nextPlayerTwitchId);
        } else {
            // 🔥 FIX: Safety net - si getNextBombanimePlayer retourne null mais il reste des joueurs
            const remainingPlayers = getAliveBombanimePlayers(gameState);
            if (remainingPlayers.length > 1) {
                // Prendre un joueur vivant différent du joueur qui vient d'exploser
                const fallback = remainingPlayers.find(p => p.twitchId !== twitchId) || remainingPlayers[0];
                console.log(`⚠️ getNextBombanimePlayer null mais ${remainingPlayers.length} joueurs vivants - fallback sur ${fallback.username}`);
                startBombanimeTurn(gameState, fallback.twitchId);
            } else if (remainingPlayers.length === 1) {
                endBombanimeGame(gameState, remainingPlayers[0]);
            } else {
                endBombanimeGame(gameState, null);
            }
        }
    }, 100); // Passage de tour pendant le shake
}

// Soumettre un nom BombAnime
function submitBombanimeName(gameState, socketId, name) {
    if (!gameState.bombanime.active) return { success: false, reason: 'game_not_active' };
    
    const player = gameState.players.get(socketId);
    if (!player) return { success: false, reason: 'player_not_found' };
    
    // Vérifier que c'est le tour de ce joueur
    if (player.twitchId !== gameState.bombanime.currentPlayerTwitchId) {
        return { success: false, reason: 'not_your_turn' };
    }
    
    // IMPORTANT: Vérifier que le temps n'est pas écoulé côté serveur
    // Ceci empêche les réponses qui arrivent après l'expiration du timer
    const elapsedMs = Date.now() - gameState.bombanime.turnStartTime;
    const timerMs = gameState.bombanime.timer * 1000;
    if (elapsedMs >= timerMs) {
        console.log(`⏱️ Réponse REJETÉE pour ${player.username} - temps écoulé (${elapsedMs}ms >= ${timerMs}ms)`);
        return { success: false, reason: 'time_expired' };
    }
    
    // Valider le nom
    const validation = validateBombanimeCharacter(gameState, name, gameState.bombanime.serie);
    
    if (!validation.valid) {
        console.log(`❌ Nom invalide: "${name}" - ${validation.reason}`);
        
        diffuser(gameState, 'bombanime-name-rejected', {
            playerTwitchId: player.twitchId,
            name: name,
            reason: validation.reason
        });
        
        return { success: false, reason: validation.reason };
    }
    
    // Nom valide!
    const normalizedName = validation.normalizedName;
    
    // 🎯 Bloquer le nom ET toutes ses variantes
    const characters = BOMBANIME_CHARACTERS[gameState.bombanime.serie] || [];
    const allVariants = getAllNamesToBlock(normalizedName, characters, gameState.bombanime.serie);
    
    for (const variant of allVariants) {
        gameState.bombanime.usedNames.add(variant.toUpperCase());
    }
    
    console.log(`🔒 Noms bloqués: ${allVariants.join(', ')}`);
    
    gameState.bombanime.lastValidName = normalizedName;
    
    // Ajouter TOUTES les lettres du nom à l'alphabet du joueur
    const allLetters = getAllLetters(normalizedName);
    if (allLetters.length > 0) {
        if (!gameState.bombanime.playerAlphabets.has(player.twitchId)) {
            gameState.bombanime.playerAlphabets.set(player.twitchId, new Set());
        }
        const playerAlphabet = gameState.bombanime.playerAlphabets.get(player.twitchId);
        
        const newLetters = allLetters.filter(letter => !playerAlphabet.has(letter));
        allLetters.forEach(letter => playerAlphabet.add(letter));
        
        if (newLetters.length > 0) {
            console.log(`✅ ${player.username}: "${normalizedName}" - Nouvelles lettres: ${newLetters.join(', ')} (Total: ${playerAlphabet.size}/26)`);
        } else {
            console.log(`✅ ${player.username}: "${normalizedName}" - Aucune nouvelle lettre (Total: ${playerAlphabet.size}/26)`);
        }
        
        // Vérifier si l'alphabet est complet
        if (checkAlphabetComplete(gameState, player.twitchId)) {
            // Reset l'alphabet du joueur (toujours, même si au max de vies)
            gameState.bombanime.playerAlphabets.set(player.twitchId, new Set());
            
            // 🔥 FIX: Plafonner les vies au max configuré (évite vies invisibles)
            const maxLives = gameState.bombanime.lives || BOMBANIME_CONFIG.DEFAULT_LIVES;
            if (player.lives < maxLives) {
                player.lives += BOMBANIME_CONFIG.ALPHABET_BONUS_LIVES;
                console.log(`🎉 ${player.username} a complété l'alphabet! +1 vie (${player.lives}/${maxLives})`);
            } else {
                console.log(`🎉 ${player.username} a complété l'alphabet mais déjà au max (${player.lives}/${maxLives})`);
            }
            
            diffuser(gameState, 'bombanime-alphabet-complete', {
                playerTwitchId: player.twitchId,
                playerUsername: player.username,
                newLives: player.lives
            });
        }
    }
    
    // Annuler le timeout d'explosion et incrémenter turnId
    // L'incrémentation invalide le callback même s'il est déjà dans la queue d'événements
    if (gameState.bombanime.turnTimeout) {
        clearTimeout(gameState.bombanime.turnTimeout);
        gameState.bombanime.turnTimeout = null;
    }
    gameState.bombanime.turnId++; // Invalide l'ancien timeout immédiatement
    
    // Calculer le prochain joueur
    const nextPlayerTwitchId = getNextBombanimePlayer(gameState);
    
    // Changer le joueur actuel
    if (nextPlayerTwitchId) {
        gameState.bombanime.currentPlayerTwitchId = nextPlayerTwitchId;
    }
    
    // Sauvegarder la dernière réponse du joueur
    gameState.bombanime.playerLastAnswers.set(player.twitchId, normalizedName);
    
    // 🎯 Vérifier les défis BombAnime
    const completedChallenges = checkBombanimeChallenges(gameState, player.twitchId, normalizedName);
    const playerChallengesState = getBombanimePlayerChallengesState(gameState, player.twitchId);
    const playerBonuses = getBombanimePlayerBonuses(gameState, player.twitchId);
    
    // Calculer le temps restant au moment de la validation (pour debug)
    const debugElapsedMs = Date.now() - gameState.bombanime.turnStartTime;
    const timeRemainingMs = (gameState.bombanime.timer * 1000) - debugElapsedMs;
    
    console.log(`⏱️ Réponse validée avec ${timeRemainingMs}ms restants (turnId=${gameState.bombanime.turnId})`);
    
    // 🖼️ Chercher l'image du personnage (DÉSACTIVÉ temporairement)
    // const characterImage = getCharacterImage(normalizedName, gameState.bombanime.serie);
    
    // Envoyer la confirmation avec le prochain joueur
    diffuser(gameState, 'bombanime-name-accepted', {
        playerTwitchId: player.twitchId,
        playerUsername: player.username,
        name: normalizedName,
        // characterImage: characterImage, // 🖼️ DÉSACTIVÉ temporairement
        newLetters: getAllLetters(normalizedName),
        alphabet: Array.from(gameState.bombanime.playerAlphabets.get(player.twitchId) || []),
        playersData: getBombanimePlayersData(gameState),
        nextPlayerTwitchId: nextPlayerTwitchId,  // Pour rotation immédiate de la bombe
        // 🎯 Défis et bonus
        challenges: playerChallengesState,
        bonuses: playerBonuses,
        completedChallenges: completedChallenges,
        // Debug info
        debugTimeRemainingMs: timeRemainingMs,
        debugTurnId: gameState.bombanime.turnId
    });
    
    // Démarrer le tour du prochain joueur (avec son nouveau timer)
    setTimeout(() => {
        if (nextPlayerTwitchId) {
            startBombanimeTurn(gameState, nextPlayerTwitchId);
        }
    }, 30); // 30ms - quasi-instantané
    
    return { success: true };
}

// Obtenir les données des joueurs BombAnime pour l'affichage
function getBombanimePlayersData(gameState) {
    const playersData = [];
    
    gameState.bombanime.playersOrder.forEach((twitchId, index) => {
        const player = Array.from(gameState.players.values()).find(p => p.twitchId === twitchId);
        if (player) {
            playersData.push({
                twitchId: player.twitchId,
                username: player.username,
                lives: player.lives,
                isAlive: player.lives > 0,
                isCurrent: player.twitchId === gameState.bombanime.currentPlayerTwitchId,
                alphabet: Array.from(gameState.bombanime.playerAlphabets.get(twitchId) || []),
                lastAnswer: gameState.bombanime.playerLastAnswers.get(twitchId) || '',
                position: index,
                avatarUrl: player.avatarUrl || 'novice.png'
            });
        }
    });
    
    return playersData;
}

// Démarrer une partie BombAnime
async function startBombanimeGame(gameState) {
    const players = Array.from(gameState.players.values());
    
    if (players.length < BOMBANIME_CONFIG.MIN_PLAYERS) {
        return { success: false, error: `Minimum ${BOMBANIME_CONFIG.MIN_PLAYERS} joueurs requis` };
    }
    
    if (players.length > BOMBANIME_CONFIG.MAX_PLAYERS) {
        return { success: false, error: `Maximum ${BOMBANIME_CONFIG.MAX_PLAYERS} joueurs` };
    }
    
    console.log(`💣 Démarrage BombAnime - ${players.length} joueurs - Série: ${gameState.bombanime.serie}`);
    
    // Reset état BombAnime
    gameState.bombanime.active = true;
    gameState.bombanime.usedNames = new Set();
    gameState.bombanime.playerAlphabets = new Map();
    gameState.bombanime.playerLastAnswers = new Map();
    gameState.bombanime.eliminatedPlayers = [];
    gameState.bombanime.bombDirection = 1;
    gameState.bombanime.lastValidName = null;
    
    gameState.bombanime.turnId = 0; // Reset l'identifiant de tour
    
    // Mélanger les joueurs pour l'ordre du cercle
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    gameState.bombanime.playersOrder = shuffledPlayers.map(p => p.twitchId);
    
    // Initialiser les alphabets ET les vies des joueurs
    players.forEach(player => {
        gameState.bombanime.playerAlphabets.set(player.twitchId, new Set());
        player.lives = gameState.bombanime.lives || BOMBANIME_CONFIG.DEFAULT_LIVES; // Utiliser les vies BombAnime
    });
    
    // 🎯 Générer les défis BombAnime
    gameState.bombanime.challenges = generateBombanimeChallenges();
    gameState.bombanime.playerChallenges = new Map();
    gameState.bombanime.playerBonuses = new Map();
    
    // Initialiser les défis et bonus pour chaque joueur
    players.forEach(player => {
        initBombanimePlayerChallenges(gameState, player.twitchId);
    });
    
    // Marquer la partie comme en cours
    gameState.inProgress = true;
    gameState.gameStartTime = Date.now();
    gameState.initialPlayerCount = players.length;
    
    // 🔥 FIX: Annuler TOUS les pendingRemoval pour éviter la suppression de joueurs pendant la partie
    players.forEach(player => {
        if (player.pendingRemoval) {
            clearTimeout(player.pendingRemoval);
            delete player.pendingRemoval;
            console.log(`⚠️ pendingRemoval annulé pour ${player.username} (BombAnime démarré)`);
        }
    });
    
    // Envoyer l'événement de démarrage
    diffuser(gameState, 'bombanime-game-started', {
        serie: gameState.bombanime.serie,
        timer: gameState.bombanime.timer,
        playersOrder: gameState.bombanime.playersOrder,
        playersData: getBombanimePlayersData(gameState),
        totalCharacters: BOMBANIME_CHARACTERS[gameState.bombanime.serie]?.length || 0,
        // 🎯 Défis BombAnime
        challenges: gameState.bombanime.challenges.map(c => ({
            id: c.id,
            name: c.name,
            description: c.description,
            reward: c.reward,
            letter: c.letter,
            target: c.target
        }))
    });
    
    // Choisir un joueur aléatoire pour commencer
    const randomStartIndex = Math.floor(Math.random() * gameState.bombanime.playersOrder.length);
    gameState.bombanime.currentPlayerIndex = randomStartIndex;
    
    // Commencer avec le joueur aléatoire après un délai
    setTimeout(() => {
        // 🔥 FIX: Vérifier que la partie est toujours active avant de démarrer le premier tour
        if (!gameState.bombanime.active) {
            console.log('⚠️ BombAnime annulé pendant l\'intro - premier tour ignoré');
            return;
        }
        
        const alivePlayers = getAliveBombanimePlayers(gameState);
        if (alivePlayers.length < BOMBANIME_CONFIG.MIN_PLAYERS) {
            console.log('⚠️ Plus assez de joueurs vivants pour démarrer le premier tour');
            endBombanimeGame(gameState, alivePlayers[0] || null);
            return;
        }
        
        let firstPlayer = gameState.bombanime.playersOrder[randomStartIndex];
        
        // 🔥 FIX: Vérifier que le joueur choisi existe encore, sinon prendre le premier vivant
        const firstPlayerExists = Array.from(gameState.players.values()).find(p => p.twitchId === firstPlayer && p.lives > 0);
        if (!firstPlayerExists) {
            console.log(`⚠️ Premier joueur ${firstPlayer} introuvable/mort - fallback sur premier joueur vivant`);
            firstPlayer = alivePlayers[0].twitchId;
        }
        
        startBombanimeTurn(gameState, firstPlayer);
    }, 3000); // 3s avant le premier tour
    
    return { success: true };
}

// Terminer une partie BombAnime
async function endBombanimeGame(gameState, winner) {
    if (!gameState.bombanime.active) return;
    
    // Annuler le timeout
    if (gameState.bombanime.turnTimeout) {
        clearTimeout(gameState.bombanime.turnTimeout);
    }
    
    gameState.bombanime.active = false;
    
    const duration = Math.floor((Date.now() - gameState.gameStartTime) / 1000);
    
    console.log(`🏆 Fin BombAnime - Gagnant: ${winner ? winner.username : 'Aucun'}`);
    
    // Construire le classement
    const ranking = [];
    
    // Le gagnant en premier
    if (winner) {
        ranking.push({
            rank: 1,
            twitchId: winner.twitchId,
            username: winner.username,
            lives: winner.lives
        });
    }
    
    // Puis les éliminés (dans l'ordre inverse d'élimination)
    const eliminated = [...gameState.bombanime.eliminatedPlayers].reverse();
    eliminated.forEach((p, index) => {
        ranking.push({
            rank: index + 2,
            twitchId: p.twitchId,
            username: p.username,
            lives: 0
        });
    });
    
    // Stocker pour l'écran de fin
    gameState.winnerScreenData = {
        winner: winner ? {
            twitchId: winner.twitchId,
            username: winner.username,
            lives: winner.lives,
            avatarUrl: winner.avatarUrl || null
        } : null,
        ranking: ranking,
        duration: duration,
        gameMode: 'bombanime',
        serie: gameState.bombanime.serie,
        namesUsed: gameState.bombanime.usedNames.size
    };

    // 🚀 Émettre le winner IMMÉDIATEMENT pour un affichage instantané
    // Les rewards seront envoyés dans un second event quand calculés
    emitBombanimeGameEnded(gameState, {
        winner: winner ? {
            twitchId: winner.twitchId,
            username: winner.username,
            lives: winner.lives,
            avatarUrl: winner.avatarUrl || null
        } : null,
        ranking: ranking,
        duration: duration,
        serie: gameState.bombanime.serie,
        namesUsed: gameState.bombanime.usedNames.size,
        rewardsData: null // Sera envoyé dans bombanime-rewards-ready
    });

    // Désactiver le lobby silencieusement après fin de partie bombanime
    gameState.isActive = false;
    console.log('🔒 Lobby désactivé automatiquement après fin BombAnime');

    const sortedPlayers = ranking.map(r => ({
        twitchId: r.twitchId,
        username: r.username
    }));


    // Reset
    resetBombanimeState(gameState);
    resetGameState(gameState);
}

// Reset l'état BombAnime
function resetBombanimeState(gameState) {
    if (gameState.bombanime.turnTimeout) {
        clearTimeout(gameState.bombanime.turnTimeout);
    }
    
    gameState.bombanime.active = false;
    gameState.bombanime.playersOrder = [];
    gameState.bombanime.currentPlayerIndex = 0;
    gameState.bombanime.currentPlayerTwitchId = null;
    gameState.bombanime.usedNames = new Set();
    gameState.bombanime.playerAlphabets = new Map();
    gameState.bombanime.playerLastAnswers = new Map();
    gameState.bombanime.turnTimeout = null;
    gameState.bombanime.turnId = 0;
    gameState.bombanime.turnStartTime = null;
    gameState.bombanime.lastValidName = null;
    gameState.bombanime.bombDirection = 1;
    gameState.bombanime.isPaused = false;
    gameState.bombanime.eliminatedPlayers = [];
}


const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    // 🛡️ Protection anti-spam connexions
    const ip = socket.handshake.headers['x-forwarded-for']?.split(',')[0] || socket.handshake.address;
    const currentConnections = connectionsByIP.get(ip) || 0;

    if (currentConnections >= MAX_CONNECTIONS_PER_IP) {
        console.log(`⚠️ Connexion refusée - Trop de connexions depuis ${ip} (${currentConnections})`);
        // Le client était coupé sans un mot : il restait à attendre dans le vide
        socket.emit('error', { message: 'Trop de connexions depuis ce réseau' });
        setTimeout(() => socket.disconnect(true), 100);
        return;
    }

    connectionsByIP.set(ip, currentConnections + 1);
    console.log(`🔌 Nouveau socket connecté: ${socket.id} (IP: ${ip}, connexions: ${currentConnections + 1})`);

    // 🔥 NOUVEAU: Événement pour enregistrer l'authentification
    socket.on('register-authenticated', (data) => {
        authenticatedUsers.set(socket.id, {
            twitchId: data.twitchId,
            username: data.username,
            avatar: data.avatar || null
        });
        
        // 🔥 FIX: Auto-remap socket.id if player already in gameState.players with old socket
        // La socket est neuve : on ignore encore sa room. On la retrouve par le
        // joueur lui-même, présent dans un salon ou dans aucun.
        const gameState = roomDeSocket(socket) ||
            (data.twitchId ? [...rooms.values()].find(r =>
                [...r.players.values()].some(p => p.twitchId === data.twitchId)) : null);

        if (data.twitchId && gameState && gameState.isActive) {
            socket.data.roomCode = gameState.roomCode;
            socket.join(gameState.roomCode);
            for (const [oldSocketId, player] of gameState.players.entries()) {
                if (player.twitchId === data.twitchId && oldSocketId !== socket.id) {
                    // Transfer player entry to new socket.id
                    const previousAnswer = gameState.answers.get(oldSocketId);
                    const oldBonusData = gameState.playerBonuses.get(oldSocketId);
                    const oldChallengesData = gameState.playerChallenges ? gameState.playerChallenges.get(oldSocketId) : null;
                    
                    gameState.players.delete(oldSocketId);
                    gameState.answers.delete(oldSocketId);
                    
                    player.socketId = socket.id;
                    gameState.players.set(socket.id, player);
                    
                    if (previousAnswer) gameState.answers.set(socket.id, previousAnswer);
                    if (oldBonusData) {
                        gameState.playerBonuses.set(socket.id, oldBonusData);
                        gameState.playerBonuses.delete(oldSocketId);
                    }
                    if (oldChallengesData) {
                        gameState.playerChallenges.set(socket.id, oldChallengesData);
                        gameState.playerChallenges.delete(oldSocketId);
                    }
                    
                    // Cancel pending removal
                    if (player.pendingRemoval) {
                        clearTimeout(player.pendingRemoval);
                        delete player.pendingRemoval;
                    }
                    if (player.pendingDisconnectLog) {
                        clearTimeout(player.pendingDisconnectLog);
                        delete player.pendingDisconnectLog;
                    }
                    delete player.disconnectedAt;
                    delete player.disconnectedSocketId;
                    
                    
                    console.log(`🔄 Auto-remap: ${data.username} ${oldSocketId} → ${socket.id}`);
                    broadcastLobbyUpdate(gameState);
                    break;
                }
            }
        }
        
        console.log(`✅ Utilisateur authentifié enregistré: ${data.username} (${socket.id})`);
    });


    // Rejoindre le lobby
    socket.on('join-lobby', async (data) => {
        // Le code fait foi : c'est la seule chose qu'un arrivant connaisse.
        // L'hôte, lui, a déjà sa room et repasse par ici pour y entrer aussi.
        // Le code fait foi. L'hôte peut aussi se présenter avec son jeton :
        // il tient déjà le salon, il n'a pas à ressaisir son propre code.
        const gameState = roomParCode(data.code) || roomParJeton(data.hostToken);
        if (!gameState || !gameState.isActive) {
            return socket.emit('error', { message: 'Code de salon invalide', badCode: true });
        }

        if (gameState.inProgress) {
            return socket.emit('error', { message: 'Partie déjà en cours' });
        }

        // 🔑 Vérification du code de salon (l'hôte le transmet, il n'a rien à saisir)
        if (data.code !== undefined && data.code !== null && !data.isHost) {
            const given = String(data.code).trim().toUpperCase();
            if (given !== gameState.roomCode) {
                return socket.emit('error', { message: 'Code de salon invalide', badCode: true });
            }
        }
        
        // 🔒 Vérifier si ce joueur est déjà en cours de traitement (anti-spam)
        if (gameState.pendingJoins.has(data.twitchId)) {
            console.log(`⏳ ${data.username} déjà en cours de traitement`);
            return socket.emit('error', { message: 'Connexion en cours...' });
        }
        
        // 🔥 Vérifier si le joueur est déjà dans le lobby (reconnexion)
        let isReconnection = false;
        let existingSocketId = null;
        let campPrecedent = null;
        for (const [socketId, player] of gameState.players.entries()) {
            if (player.twitchId === data.twitchId) {
                isReconnection = true;
                existingSocketId = socketId;
                campPrecedent = player.team || null;
                break;
            }
        }
        
        // 💣🎴 En mode BombAnime/Collect, vérifier la limite avec les places réservées
        if (gameState.lobbyMode === 'bombanime' && !isReconnection) {
            const maxPlayers = BOMBANIME_CONFIG.MAX_PLAYERS;
            const currentCount = gameState.players.size + gameState.pendingJoins.size;
            if (currentCount >= maxPlayers) {
                console.log(`🚫 Lobby plein: ${gameState.players.size} joueurs + ${gameState.pendingJoins.size} en attente >= ${maxPlayers}`);
                return socket.emit('error', { message: `Le lobby est plein (maximum ${maxPlayers} joueurs)` });
            }
        }
        
        // En v2 c'est l'hôte qui répartit : on entre sans camp, il l'attribue ensuite.
        
        // 🔒 Réserver la place AVANT les opérations async
        gameState.pendingJoins.add(data.twitchId);
        console.log(`🔒 Place réservée pour ${data.username} (pending: ${gameState.pendingJoins.size})`);
        
        try {
            if (isReconnection) {
                const existingPlayer = gameState.players.get(existingSocketId);
                
                // 🎴 Si l'entrée existante est l'admin-joueur et le nouveau join n'est PAS l'admin,
                // bloquer la reconnexion pour ne pas écraser l'admin
                if (existingPlayer && existingPlayer.isAdmin && !data.isAdmin) {
                    console.log(`🚫 ${data.username} tente de remplacer l'admin-joueur - bloqué`);
                    gameState.pendingJoins.delete(data.twitchId);
                    return socket.emit('error', { message: 'Ce compte est déjà utilisé par le streamer' });
                }
                
                // Remplacer l'ancienne connexion
                console.log(`🔄 ${data.username} remplace sa connexion précédente`);
                
                // 🆕 Annuler le timeout de suppression si existant
                if (existingPlayer && existingPlayer.pendingRemoval) {
                    clearTimeout(existingPlayer.pendingRemoval);
                    console.log(`⏱️ Timeout de suppression annulé pour ${data.username}`);
                }
                
                gameState.players.delete(existingSocketId);
                gameState.answers.delete(existingSocketId);

                // Déconnecter l'ancien socket (sans envoyer kicked pour éviter de reset le localStorage).
                // ⚠️ 'register-authenticated' a pu déjà rebrancher l'entrée sur la socket
                // courante : sans ce garde-fou on coupait la connexion qu'on vient
                // d'accepter, et le joueur restait sourd aux diffusions pendant
                // toute la reconnexion automatique.
                if (existingSocketId !== socket.id) {
                    const oldSocket = io.sockets.sockets.get(existingSocketId);
                    if (oldSocket) {
                        oldSocket.disconnect(true);
                    }
                }
            }


        // 🔥 FIX: Re-vérifier après les awaits que la partie n'a pas démarré entre-temps
        // (race condition: admin clique Démarrer pendant que le DB call était en cours)
        if (gameState.inProgress) {
            console.log(`⚠️ ${data.username} - join annulé: partie démarrée pendant le traitement`);
            gameState.pendingJoins.delete(data.twitchId);
            return socket.emit('error', { message: 'La partie vient de démarrer' });
        }

        // Sans ça, la socket n'entendrait aucune diffusion : elles visent la room
        socket.join(gameState.roomCode);
        socket.data.roomCode = gameState.roomCode;

        gameState.players.set(socket.id, {
            socketId: socket.id,
            twitchId: data.twitchId,
            username: data.username,
            lives: gameState.lives,
            correctAnswers: 0,
            avatarUrl: 'novice.png',
            // Après un refresh on reprend son camp : le retirer au hasard
            // ferait sauter les joueurs d'un côté à l'autre à chaque rechargement.
            team: gameState.lobbyMode === 'rivalry' ? (campPrecedent || campLeMoinsFourni(gameState)) : null,
            isAdmin: data.isAdmin || false
        });

        const playerColor = assignPlayerColor(gameState, data.username);
        addLog(gameState, 'join', { username: data.username, playerColor });

        console.log(`✅ ${data.username} a rejoint le lobby${data.team ? ` (Team ${data.team})` : ''}`);

        // 🆕 Utiliser la fonction helper
        broadcastLobbyUpdate(gameState);
        
        } finally {
            // 🔓 Libérer la réservation
            gameState.pendingJoins.delete(data.twitchId);
            console.log(`🔓 Place libérée pour ${data.username} (pending: ${gameState.pendingJoins.size})`);
        }
    });
    
    socket.on('leave-lobby', (data) => {
        // La socket dit sa room : sans elle, cet événement ne concerne personne
        const gameState = roomDeSocket(socket);
        if (!gameState) return socket.emit('error', { message: 'Salon introuvable' });
        const player = gameState.players.get(socket.id);
        if (player) {
            gameState.players.delete(socket.id);
            gameState.answers.delete(socket.id);
            console.log(`👋 ${data.username} a quitté le lobby`);

            const playerColor = gameState.playerColors[data.username];
            addLog(gameState, 'leave', { username: data.username, playerColor });

            broadcastLobbyUpdate(gameState);

            // Un départ n'interrompt pas la partie : celui qui reste continue seul.
            // Il voit le nombre de joueurs encore en lice dans le détail de la question.
        }
    });

    // 🆕 Kick un joueur manuellement (depuis l'admin)
    socket.on('kick-player', (data) => {
        // La socket dit sa room : sans elle, cet événement ne concerne personne
        const gameState = roomDeSocket(socket);
        if (!gameState) return socket.emit('error', { message: 'Salon introuvable' });
        // Seul événement socket réservé à l'hôte : il porte donc le jeton,
        // le garde-fou HTTP ne protégeant que les routes /admin.
        if (!gameState.hostToken || !data || data.hostToken !== gameState.hostToken) {
            return socket.emit('error', { message: "Réservé à l'hôte du salon" });
        }

        const { username, twitchId } = data || {};
        // L'appel peut ne porter que l'identifiant : exiger le pseudo bloquait tout kick
        if (!username && !twitchId) return;

        console.log(`🚫 Kick demandé pour: ${username || twitchId}`);

        // Trouver le joueur par username ou twitchId
        let targetSocketId = null;
        let targetPlayer = null;

        for (const [socketId, player] of gameState.players.entries()) {
            const parPseudo = username && player.username === username;
            const parId = twitchId && player.twitchId === twitchId;
            if (parPseudo || parId) {
                targetSocketId = socketId;
                targetPlayer = player;
                break;
            }
        }

        if (targetSocketId && targetPlayer) {
            // Supprimer le joueur
            gameState.players.delete(targetSocketId);
            gameState.answers.delete(targetSocketId);

            console.log(`🚫 ${username} a été kick par le streamer`);

            // Notifier le joueur qu'il a été kick
            const targetSocket = io.sockets.sockets.get(targetSocketId);
            if (targetSocket) {
                targetSocket.emit('kicked', { reason: 'Tu as été exclu par le streamer' });
                // 🆕 Ne pas déconnecter le socket pour que le joueur reçoive les événements (game-started, etc.)
            }

            // Log pour les admins
            const playerColor = gameState.playerColors[username];
            addLog(gameState, 'kick', { username, playerColor });

            // Mettre à jour le lobby/game pour tout le monde
            broadcastLobbyUpdate(gameState);

            // 🆕 Vérifier si la partie doit se terminer après le kick
            if (gameState.inProgress && gameState.mode === 'lives') {
                const currentAlivePlayers = getAlivePlayers(gameState);
                console.log(`🔍 Joueurs en vie après kick: ${currentAlivePlayers.length}`);
                
                if (currentAlivePlayers.length <= 1) {
                    const winner = currentAlivePlayers.length === 1 ? currentAlivePlayers[0] : null;
                    console.log(`🏁 Fin de partie après kick - Gagnant: ${winner ? winner.username : 'Aucun'}`);
                    endGame(gameState, winner);
                }
            }
        } else {
            console.log(`⚠️ Joueur ${username} non trouvé pour kick`);
        }
    });

    // Reconnexion d'un joueur (nouveau événement)
    socket.on('reconnect-player', (data) => {
        const gameState = roomDeSocket(socket) || roomParCode(data && data.code);
        if (!gameState || !gameState.isActive) {
            return socket.emit('error', { message: 'Aucune partie active' });
        }

        // La socket est neuve : elle doit rentrer dans la room pour entendre la suite
        socket.join(gameState.roomCode);
        socket.data.roomCode = gameState.roomCode;

        let existingPlayer = null;
        let oldSocketId = null;
        for (const [socketId, player] of gameState.players.entries()) {
            if (player.twitchId === data.twitchId) {
                existingPlayer = player;
                oldSocketId = socketId;
                break;
            }
        }

        if (existingPlayer) {
            const previousAnswer = gameState.answers.get(oldSocketId);

            // 🔥 Transférer les bonus
            if (oldSocketId !== socket.id) {
                const oldBonusData = gameState.playerBonuses.get(oldSocketId);
                if (oldBonusData) {
                    gameState.playerBonuses.set(socket.id, oldBonusData);
                    gameState.playerBonuses.delete(oldSocketId);
                    console.log(`🎁 Bonus transférés: ${oldSocketId} → ${socket.id}`);
                }
                
                // 🆕 Transférer les défis aussi
                const oldChallengesData = gameState.playerChallenges.get(oldSocketId);
                if (oldChallengesData) {
                    gameState.playerChallenges.set(socket.id, oldChallengesData);
                    gameState.playerChallenges.delete(oldSocketId);
                    console.log(`🎯 Défis transférés: ${oldSocketId} → ${socket.id}`);
                }
            }

            gameState.players.delete(oldSocketId);
            gameState.answers.delete(oldSocketId);

            existingPlayer.socketId = socket.id;
            gameState.players.set(socket.id, existingPlayer);


            if (previousAnswer) {
                gameState.answers.set(socket.id, previousAnswer);
            }

            delete existingPlayer.disconnectedAt;
            delete existingPlayer.disconnectedSocketId;

            // 🔄 Annuler le log "disconnect" en attente si présent
            if (existingPlayer.pendingDisconnectLog) {
                clearTimeout(existingPlayer.pendingDisconnectLog);
                delete existingPlayer.pendingDisconnectLog;
            }

            console.log(`🔄 ${data.username} reconnecté - Mode: ${gameState.mode}, Points: ${existingPlayer.points || 0}, Vies: ${existingPlayer.lives}`);

            // 🆕 Initialiser les défis SEULEMENT si pas transférés (nouveau joueur mid-game)
            if (!gameState.playerChallenges.has(socket.id) && gameState.activeChallenges.length > 0) {
                initPlayerChallenges(gameState, socket.id);
                console.log(`🎯 Nouveaux défis initialisés pour joueur reconnecté`);
            }

            const restorationData = {
                currentQuestionIndex: gameState.currentQuestionIndex,
                hasAnswered: !!previousAnswer,
                selectedAnswer: previousAnswer ? previousAnswer.answer : null,
                bonusActive: previousAnswer ? previousAnswer.bonusActive : null, // 🔥 AJOUTER ICI
                gameMode: gameState.mode,
                comboData: gameState.playerBonuses.get(socket.id) ? {
                    comboLevel: gameState.playerBonuses.get(socket.id).comboLevel,
                    comboProgress: gameState.playerBonuses.get(socket.id).comboProgress,
                    bonusInventory: gameState.playerBonuses.get(socket.id).bonusInventory
                } : null,
                challenges: getPlayerChallengesState(gameState, socket.id), // 🆕 Envoyer les défis
                bonusEnabled: gameState.bonusEnabled // 🎮 Bonus activés
            };

            if (gameState.mode === 'lives') {
                restorationData.lives = existingPlayer.lives;
                restorationData.correctAnswers = existingPlayer.correctAnswers;
            } else {
                restorationData.points = existingPlayer.points || 0;
            }

            socket.emit('player-restored', restorationData);

            // 🔄 Log "reconnect" seulement si "disconnect" avait été affiché
            const playerColor = gameState.playerColors[data.username] || assignPlayerColor(gameState, data.username);
            if (existingPlayer.disconnectLogged) {
                addLog(gameState, 'reconnect', { username: data.username, playerColor });
                delete existingPlayer.disconnectLogged;
            }

            // Mise à jour lobby
            broadcastLobbyUpdate(gameState);
        } else {
            socket.emit('error', {
                message: 'Partie déjà en cours',
                canSpectate: true
            });
        }
    });


    // Répondre à une question
    socket.on('submit-answer', (data) => {
        // La socket dit sa room : sans elle, cet événement ne concerne personne
        const gameState = roomDeSocket(socket);
        if (!gameState) return socket.emit('error', { message: 'Salon introuvable' });
        if (!gameState.inProgress) return;

        const player = gameState.players.get(socket.id);
        if (!player) return;

        // Vérifier que le timer n'est pas expiré
        if (gameState.questionStartTime) {
            const elapsed = Math.floor((Date.now() - gameState.questionStartTime) / 1000);
            if (elapsed >= gameState.questionTime) {
                console.log(`⏱️ ${player.username} a essayé de répondre après expiration du timer`);
                return;
            }
        }

        // 🔥 FIX: En mode Points, TOUS les joueurs continuent à jouer pendant le tiebreaker
        // Seul le mode Vie bloque les joueurs éliminés (lives === 0)

        // Mode Vie - bloquer si éliminé
        if (gameState.mode === 'lives' && player.lives === 0) return;

        const responseTime = Date.now() - gameState.questionStartTime;

        gameState.answers.set(socket.id, {
            answer: data.answer,
            time: responseTime,
            bonusActive: data.bonusActive // 🔥 AJOUTER CETTE LIGNE
        });

        if (player) {
            addLog(gameState, 'answer', {
                username: player.username,
                playerColor: gameState.playerColors[player.username]
            });
        }

        socket.emit('answer-recorded');

        gameState.liveAnswers.set(socket.id, data.answer);
        throttledUpdateLiveAnswerStats(gameState);

        diffuser(gameState, 'answer-submitted', {
            socketId: socket.id,
            answeredCount: gameState.answers.size,
            totalPlayers: gameState.players.size
        });

        diffuser(gameState, 'player-answered', {
            username: player.username,
            answeredCount: gameState.answers.size,
            totalPlayers: gameState.players.size
        });
    });


    // 🆕 Utilisation d'un bonus
    socket.on('use-bonus', (data) => {
        // La socket dit sa room : sans elle, cet événement ne concerne personne
        const gameState = roomDeSocket(socket);
        if (!gameState) return socket.emit('error', { message: 'Salon introuvable' });
        if (!gameState.inProgress) return;

        const player = gameState.players.get(socket.id);
        if (!player) return;

        const { bonusType } = data;

        // Vérifier et utiliser le bonus
        const success = usePlayerBonus(gameState, socket.id, bonusType);

        if (success) {
            console.log(`✅ Bonus "${bonusType}" utilisé par ${player.username}`);

            // LOGS D'ACTIVITÉ
            const playerColor = gameState.playerColors[player.username];
            switch (bonusType) {
                case '5050':
                    addLog(gameState, 'bonus-5050', { username: player.username, playerColor });
                    break;
                case 'reveal':
                    addLog(gameState, 'bonus-joker', { username: player.username, playerColor });
                    break;
                case 'shield':
                    addLog(gameState, 'bonus-shield', { username: player.username, playerColor });
                    break;
                case 'doublex2':
                    addLog(gameState, 'bonus-x2', { username: player.username, playerColor });
                    break;
            }

            // 🔥 NOUVEAU: Stocker le Shield dans les données du joueur
            if (bonusType === 'shield') {
                player.activeShield = true;
                console.log(`🛡️ Shield marqué actif pour ${player.username}`);
            }

            // 🔥 NOUVEAU: Pour 50/50 et Reveal, envoyer la bonne réponse
            if (bonusType === '5050' || bonusType === 'reveal') {
                const correctAnswer = gameState.currentQuestion?.correctAnswer;

                if (correctAnswer) {
                    socket.emit('bonus-validated', {
                        bonusType: bonusType,
                        correctAnswer: correctAnswer
                    });

                    console.log(`📡 Bonne réponse (${correctAnswer}) envoyée à ${player.username} pour bonus ${bonusType}`);
                }
            }
        } else {
            socket.emit('bonus-used', {
                bonusType: bonusType,
                success: false,
                error: 'Bonus non disponible'
            });
        }
    });

    // ============================================
    // 💣 BOMBANIME - Socket Handlers
    // ============================================
    
    // Soumettre un nom de personnage
    socket.on('bombanime-submit-name', (data) => {
        // La socket dit sa room : sans elle, cet événement ne concerne personne
        const gameState = roomDeSocket(socket);
        if (!gameState) return socket.emit('error', { message: 'Salon introuvable' });
        if (!gameState.bombanime.active) return;
        
        const result = submitBombanimeName(gameState, socket.id, data.name);
        
        if (!result.success) {
            // L'erreur est déjà envoyée dans submitBombanimeName
        }
    });
    
    // 🎯 Utiliser le bonus "Perso Gratuit" - donne un personnage aléatoire non utilisé
    socket.on('bombanime-use-free-character', () => {
        // La socket dit sa room : sans elle, cet événement ne concerne personne
        const gameState = roomDeSocket(socket);
        if (!gameState) return socket.emit('error', { message: 'Salon introuvable' });
        if (!gameState.bombanime.active) return;
        
        const player = gameState.players.get(socket.id);
        if (!player) return;
        
        // Vérifier que c'est le tour de ce joueur
        if (player.twitchId !== gameState.bombanime.currentPlayerTwitchId) {
            socket.emit('bombanime-bonus-error', { error: 'not_your_turn' });
            return;
        }
        
        // Vérifier que le joueur a ce bonus
        const bonuses = gameState.bombanime.playerBonuses.get(player.twitchId);
        if (!bonuses || bonuses.freeCharacter <= 0) {
            socket.emit('bombanime-bonus-error', { error: 'no_bonus_available' });
            return;
        }
        
        // Obtenir un personnage aléatoire non utilisé
        const freeChar = getRandomUnusedCharacter(gameState, gameState.bombanime.serie);
        if (!freeChar) {
            socket.emit('bombanime-bonus-error', { error: 'no_character_available' });
            return;
        }
        
        // Décrémenter le bonus
        bonuses.freeCharacter--;
        
        console.log(`🎁 ${player.username} utilise Perso Gratuit: "${freeChar}" (reste: ${bonuses.freeCharacter})`);
        
        // Envoyer le personnage au joueur (il n'a plus qu'à appuyer sur Entrée)
        socket.emit('bombanime-free-character', {
            character: freeChar,
            bonusesRemaining: bonuses
        });
    });
    
    // 🎯 Utiliser le bonus "Vie Extra" - ajoute une vie (max 2)
    socket.on('bombanime-use-extra-life', () => {
        // La socket dit sa room : sans elle, cet événement ne concerne personne
        const gameState = roomDeSocket(socket);
        if (!gameState) return socket.emit('error', { message: 'Salon introuvable' });
        if (!gameState.bombanime.active) return;
        
        const player = gameState.players.get(socket.id);
        if (!player) return;
        
        // Vérifier que le joueur a ce bonus
        const bonuses = gameState.bombanime.playerBonuses.get(player.twitchId);
        if (!bonuses || bonuses.extraLife <= 0) {
            socket.emit('bombanime-bonus-error', { error: 'no_bonus_available' });
            return;
        }
        
        // Décrémenter le bonus
        bonuses.extraLife--;
        
        // Ajouter une vie (max 2, sinon gâché)
        const maxLives = gameState.bombanime.lives || BOMBANIME_CONFIG.DEFAULT_LIVES;
        const oldLives = player.lives;
        
        if (player.lives < maxLives) {
            player.lives++;
            console.log(`❤️ ${player.username} utilise Vie Extra: ${oldLives} -> ${player.lives} (reste: ${bonuses.extraLife})`);
        } else {
            console.log(`❤️ ${player.username} utilise Vie Extra mais déjà au max (${player.lives}/${maxLives}) - GÂCHÉ`);
        }
        
        // Notifier tout le monde de la mise à jour des vies
        diffuser(gameState, 'bombanime-player-lives-updated', {
            playerTwitchId: player.twitchId,
            playerUsername: player.username,
            lives: player.lives,
            playersData: getBombanimePlayersData(gameState)
        });
        
        // Envoyer confirmation au joueur
        socket.emit('bombanime-extra-life-used', {
            newLives: player.lives,
            wasWasted: oldLives >= maxLives,
            bonusesRemaining: bonuses
        });
    });
    
    // Broadcaster ce que le joueur tape en temps réel
    socket.on('bombanime-typing', (data) => {
        // La socket dit sa room : sans elle, cet événement ne concerne personne
        const gameState = roomDeSocket(socket);
        if (!gameState) return;
        if (!gameState.bombanime.active) return;
        
        const player = gameState.players.get(socket.id);
        if (!player) return;
        
        // Vérifier que c'est bien le tour de ce joueur
        if (player.twitchId !== gameState.bombanime.currentPlayerTwitchId) return;
        
        // Broadcaster à tous les autres joueurs
        socket.broadcast.emit('bombanime-typing', {
            playerTwitchId: player.twitchId,
            text: data.text || ''
        });
    });
    
    // Demander l'état actuel du jeu BombAnime (pour reconnexion)
    socket.on('bombanime-get-state', () => {
        // La socket dit sa room : sans elle, cet événement ne concerne personne
        const gameState = roomDeSocket(socket);
        if (!gameState) return socket.emit('error', { message: 'Salon introuvable' });
        if (!gameState.bombanime.active) {
            socket.emit('bombanime-state', { active: false });
            return;
        }
        
        let player = gameState.players.get(socket.id);
        
        // 🔥 FIX: Si le joueur n'est pas trouvé par socketId, chercher par twitchId
        // (cas d'un refresh pendant la partie : le socketId a changé)
        if (!player) {
            const authUser = authenticatedUsers.get(socket.id);
            if (authUser) {
                let oldSocketId = null;
                for (const [sid, p] of gameState.players.entries()) {
                    if (p.twitchId === authUser.twitchId) {
                        player = p;
                        oldSocketId = sid;
                        break;
                    }
                }
                
                if (player && oldSocketId && oldSocketId !== socket.id) {
                    console.log(`🔄 BombAnime resync: ${player.username} transféré ${oldSocketId} → ${socket.id}`);
                    
                    // Transférer les bonus et défis
                    const oldBonusData = gameState.playerBonuses.get(oldSocketId);
                    if (oldBonusData) {
                        gameState.playerBonuses.set(socket.id, oldBonusData);
                        gameState.playerBonuses.delete(oldSocketId);
                    }
                    const oldChallengesData = gameState.playerChallenges?.get(oldSocketId);
                    if (oldChallengesData) {
                        gameState.playerChallenges.set(socket.id, oldChallengesData);
                        gameState.playerChallenges.delete(oldSocketId);
                    }
                    
                    // Transférer l'entrée joueur
                    gameState.players.delete(oldSocketId);
                    gameState.answers.delete(oldSocketId);
                    player.socketId = socket.id;
                    gameState.players.set(socket.id, player);
                    
                    // Nettoyer les flags de déconnexion
                    delete player.disconnectedAt;
                    delete player.disconnectedSocketId;
                    delete player.pendingRemoval;
                }
            }
        }
        
        const myAlphabet = player ? 
            Array.from(gameState.bombanime.playerAlphabets.get(player.twitchId) || []) : 
            [];
        
        // 🎯 Récupérer les défis et bonus du joueur
        const myChallenges = player ? getBombanimePlayerChallengesState(gameState, player.twitchId) : [];
        const myBonuses = player ? getBombanimePlayerBonuses(gameState, player.twitchId) : { freeCharacter: 0, extraLife: 0 };
        
        socket.emit('bombanime-state', {
            active: true,
            serie: gameState.bombanime.serie,
            timer: gameState.bombanime.timer,
            currentPlayerTwitchId: gameState.bombanime.currentPlayerTwitchId,
            playersOrder: gameState.bombanime.playersOrder,
            playersData: getBombanimePlayersData(gameState),
            myAlphabet: myAlphabet,
            usedNamesCount: gameState.bombanime.usedNames.size,
            direction: gameState.bombanime.bombDirection,
            timeRemaining: gameState.bombanime.turnStartTime ? 
                Math.max(0, gameState.bombanime.timer - Math.floor((Date.now() - gameState.bombanime.turnStartTime) / 1000)) : 
                gameState.bombanime.timer,
            // 🎯 Défis et bonus
            challenges: myChallenges,
            bonuses: myBonuses
        });
    });
    
    // 🆕 TEMPORAIRE: Ajouter un joueur fictif pour les tests
    // 🧪 Outil de mise au point : peupler le salon pour juger l'affichage
    // Déconnexion
    socket.on('disconnect', () => {
        // La socket dit sa room : sans elle, cet événement ne concerne personne
        const gameState = roomDeSocket(socket);
        if (!gameState) return;
        const ip = socket.handshake.headers['x-forwarded-for']?.split(',')[0] || socket.handshake.address;
        const currentConnections = connectionsByIP.get(ip) || 1;
        if (currentConnections <= 1) {
            connectionsByIP.delete(ip);
        } else {
            connectionsByIP.set(ip, currentConnections - 1);
        }


        const player = gameState.players.get(socket.id);

        if (player) {
            const playerColor = gameState.playerColors[player.username];
            // 🔄 Délai avant d'afficher le log "disconnect" (évite le spam lors de changement d'onglet)
            player.pendingDisconnectLog = setTimeout(() => {
                addLog(gameState, 'disconnect', { username: player.username, playerColor });
                player.disconnectLogged = true;
                delete player.pendingDisconnectLog;
            }, 3000); // 3 secondes
        }

        // 🔥 Retirer du tracker d'authentification
        if (authenticatedUsers.has(socket.id)) {
            const user = authenticatedUsers.get(socket.id);
            console.log(`🔌 ${user.username} déconnecté (authentifié)`);
            authenticatedUsers.delete(socket.id);
        }

        if (player) {
            console.log(`🔌 ${player.username} déconnecté (socket: ${socket.id})`);

            // Si une partie est en cours, NE PAS supprimer le joueur
            if (gameState.inProgress) {
                console.log(`⏳ ${player.username} marqué comme déconnecté (reste dans la partie)`);
                player.disconnectedAt = Date.now();
                player.disconnectedSocketId = socket.id;
                // 🆕 On ne supprime plus automatiquement - l'admin peut kick manuellement si besoin
            } else {
                // 🆕 En lobby, attendre 5 secondes avant de supprimer (permet le refresh)
                // 🎴 Ne PAS supprimer l'admin-joueur sur disconnect (son socket admin reste actif)
                if (player.isAdmin) {
                    console.log(`🎴 ${player.username} (admin) déconnecté du lobby - conservé (admin-joueur)`);
                } else {
                    player.pendingRemoval = setTimeout(() => {
                        // 🔥 FIX: Si une partie a démarré entre-temps, NE PAS supprimer le joueur
                        if (gameState.inProgress) {
                            console.log(`⚠️ ${player.username} - pendingRemoval annulé (partie en cours)`);
                            delete player.pendingRemoval;
                            // Marquer comme déconnecté à la place
                            player.disconnectedAt = Date.now();
                            player.disconnectedSocketId = socket.id;
                            return;
                        }
                        
                        // Vérifier que le joueur n'a pas re-rejoint entre temps
                        const stillExists = gameState.players.get(socket.id);
                        if (stillExists && stillExists.pendingRemoval) {
                            console.log(`🗑️ ${player.username} supprimé du lobby (timeout ${DELAI_RETRAIT_JOUEUR_MS / 1000}s)`);
                            gameState.players.delete(socket.id);
                            gameState.answers.delete(socket.id);
                            broadcastLobbyUpdate(gameState);
                        }
                    }, DELAI_RETRAIT_JOUEUR_MS);
                }
            }
        }
    });
});



// ============================================
// 🆕 SYSTÈME DE BONUS
// ============================================

// Seuils de combo
const COMBO_THRESHOLDS = [3, 8, 14]; // Lvl1, Lvl2, Lvl3

// Mise à jour du combo d'un joueur (bonne réponse)
function updatePlayerCombo(gameState, socketId) {
    const bonusData = gameState.playerBonuses.get(socketId);
    if (!bonusData) return;

    // 🔥 NOUVEAU : Si déjà au niveau MAX, ne plus incrémenter
    if (bonusData.comboLevel >= 3) {
        console.log(`🎯 Joueur ${socketId} déjà au niveau MAX - Pas d'incrémentation`);
        return;
    }

    // Incrémenter le progrès
    bonusData.comboProgress++;

    console.log(`📊 Combo update: socketId=${socketId}, progress=${bonusData.comboProgress}, level=${bonusData.comboLevel}`);

    // Vérifier si on atteint un nouveau niveau
    const currentLevel = bonusData.comboLevel;
    if (currentLevel < 3) {
        const threshold = COMBO_THRESHOLDS[currentLevel];

        if (bonusData.comboProgress >= threshold) {
            bonusData.comboLevel++;

            // Débloquer le bonus correspondant - 🔥 REFONTE: Incrémenter l'inventaire
            let bonusType = '';
            if (bonusData.comboLevel === 1) {
                bonusType = '5050';
            } else if (bonusData.comboLevel === 2) {
                bonusType = 'reveal';
            } else if (bonusData.comboLevel === 3) {
                bonusType = gameState.mode === 'lives' ? 'shield' : 'doublex2';
            }

            if (bonusType) {
                bonusData.bonusInventory[bonusType]++;
                console.log(`🎉 Level up ! Joueur ${socketId}: Lvl${bonusData.comboLevel}, Bonus: ${bonusType} (x${bonusData.bonusInventory[bonusType]})`);
            }
        }
    }

    // 🔥 TOUJOURS envoyer combo-updated après CHAQUE bonne réponse
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
        socket.emit('combo-updated', {
            comboLevel: bonusData.comboLevel,
            comboProgress: bonusData.comboProgress,
            bonusInventory: bonusData.bonusInventory
        });
        console.log(`📡 combo-updated envoyé: level=${bonusData.comboLevel}, progress=${bonusData.comboProgress}, inventory=${JSON.stringify(bonusData.bonusInventory)}`);
    }
}

// Reset du combo d'un joueur (mauvaise réponse ou AFK)
function resetPlayerCombo(gameState, socketId) {
    const bonusData = gameState.playerBonuses.get(socketId);
    if (!bonusData) return;

    // Reset uniquement la progression, pas le niveau ni les bonus
    // (on garde les bonus débloqués pour toute la partie)

    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
        socket.emit('combo-updated', {
            comboLevel: bonusData.comboLevel,
            comboProgress: bonusData.comboProgress,
            bonusInventory: bonusData.bonusInventory
        });
    }
}

// Utilisation d'un bonus - 🔥 REFONTE: Décrémenter l'inventaire
function usePlayerBonus(gameState, socketId, bonusType) {
    const bonusData = gameState.playerBonuses.get(socketId);
    if (!bonusData) return false;

    // Vérifier que le bonus est disponible dans l'inventaire
    if (!bonusData.bonusInventory[bonusType] || bonusData.bonusInventory[bonusType] <= 0) {
        return false;
    }

    // Décrémenter l'inventaire
    bonusData.bonusInventory[bonusType]--;

    console.log(`✅ Bonus "${bonusType}" utilisé par joueur ${socketId} (reste: ${bonusData.bonusInventory[bonusType]})`);

    return true;
}

// Reset des bonus et défis en fin de partie
function resetAllBonuses(gameState) {
    gameState.playerBonuses.clear();
    gameState.activeChallenges = [];
    gameState.playerChallenges.clear();
    console.log('🔄 Reset de tous les bonus et défis');
}


// FONCTION: Générer les données communes pour game-ended
async function generateGameEndedData(gameState) {
    const playersData = Array.from(gameState.players.values()).map(p => ({
        twitchId: p.twitchId,
        username: p.username,
        lives: p.lives,
        points: p.points || 0,
        correctAnswers: p.correctAnswers,
        isLastGlobalWinner: p.twitchId === gameState.lastGlobalWinner,
        team: p.team || null // 🆕 Inclure l'équipe pour mode Rivalité
    }));

    const topPlayers = [];

    return { playersData, topPlayers };
}


// FONCTION: Reset complet de l'état du jeu
function resetGameState(gameState) {
    gameState.inProgress = false;
    gameState.endingGame = false; // 🆕 Reset du flag de finalisation
    gameState.currentGameId = null;
    gameState.currentQuestionIndex = 0;
    gameState.currentQuestion = null;
    gameState.showResults = false;
    gameState.lastQuestionResults = null;
    gameState.questionStartTime = null;
    gameState.gameStartTime = null;
    gameState.initialPlayerCount = 0; // 🆕 Reset du compteur initial
    // Les joueurs restent dans le salon : c'est ce qui permet d'enchaîner une
    // manche sans re-partager le code. start-game remet leurs vies, points,
    // bonus et défis à neuf.
    gameState.answers.clear();
    gameState.pendingJoins.clear(); // 🔓 Reset les réservations
    gameState.isTiebreaker = false;
    gameState.tiebreakerPlayers = [];
    gameState.isRivalryTiebreaker = false; // 🆕 Reset tiebreaker Rivalry
    
    // 🆕 Annuler le timeout du tiebreaker rivalry
    if (gameState.rivalryTiebreakerTimeout) {
        clearTimeout(gameState.rivalryTiebreakerTimeout);
        gameState.rivalryTiebreakerTimeout = null;
    }
    if (gameState.rivalryRevealTimeout) {
        clearTimeout(gameState.rivalryRevealTimeout);
        gameState.rivalryRevealTimeout = null;
    }
    if (gameState.rivalryEndGameTimeout) {
        clearTimeout(gameState.rivalryEndGameTimeout);
        gameState.rivalryEndGameTimeout = null;
    }

    gameState.players.forEach(player => {
        player.activeShield = false;
    });

    resetAllBonuses(gameState);


    // 🔥 COMMENTER CES LIGNES
    // gameState.isActive = false;
    // diffuser(gameState, 'game-deactivated');
    // console.log('🔒 Lobby fermé automatiquement après la fin de partie');

    // 🆕 Annuler le timeout auto mode si actif
    if (gameState.autoModeTimeout) {
        clearTimeout(gameState.autoModeTimeout);
        gameState.autoModeTimeout = null;
    }

    // 🆕 OPTIONNEL : Log pour savoir que le jeu reste ouvert
    console.log('✅ Partie terminée - Lobby reste ouvert pour la prochaine partie');
}




function updateLiveAnswerStats(gameState) {
    const answerCounts = {};

    gameState.liveAnswers.forEach((answerIndex) => {
        if (!answerCounts[answerIndex]) {
            answerCounts[answerIndex] = 0;
        }
        answerCounts[answerIndex]++;
    });

    diffuser(gameState, 'live-answer-stats', {
        answerCounts: answerCounts,
        answeredCount: gameState.liveAnswers.size,
        totalPlayers: gameState.players.size
    });
}

// 🆕 Version throttlée - appeler celle-ci à la place
function throttledUpdateLiveAnswerStats(gameState) {
    const now = Date.now();

    // Si assez de temps s'est écoulé, envoyer immédiatement
    if (now - gameState.lastStatsUpdate >= STATS_THROTTLE_MS) {
        gameState.lastStatsUpdate = now;
        updateLiveAnswerStats(gameState);
        gameState.pendingStatsUpdate = false;
    }
    // Sinon, programmer un envoi différé (si pas déjà programmé)
    else if (!gameState.pendingStatsUpdate) {
        gameState.pendingStatsUpdate = true;
        const delay = STATS_THROTTLE_MS - (now - gameState.lastStatsUpdate);

        setTimeout(() => {
            gameState.lastStatsUpdate = Date.now();
            updateLiveAnswerStats(gameState);
            gameState.pendingStatsUpdate = false;
        }, delay);
    }
}





function addLog(gameState, type, data) {
    const log = {
        id: Date.now() + Math.random(),
        type: type,
        data: data,
        timestamp: Date.now()
    };

    gameState.activityLogs.push(log);
    if (gameState.activityLogs.length > MAX_LOGS) {
        gameState.activityLogs.shift();
    }

    diffuser(gameState, 'activity-log', log);
}

function resetLogs(gameState) {
    gameState.activityLogs = [];
    gameState.playerColors = {};
    diffuser(gameState, 'logs-reset');
}

function assignPlayerColor(gameState, username) {
    if (!gameState.playerColors[username]) {
        const usedColors = Object.values(gameState.playerColors);
        const availableColors = PLAYER_COLORS.filter(c => !usedColors.includes(c));
        gameState.playerColors[username] = availableColors.length > 0
            ? availableColors[0]
            : PLAYER_COLORS[Object.keys(gameState.playerColors).length % PLAYER_COLORS.length];
    }
    return gameState.playerColors[username];
}







// ============================================
// Gestion des erreurs
// ============================================




process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled rejection:', error);
});


process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error);
    process.exit(1);
});