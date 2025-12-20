// ============================================
// VARIABLES INTRO
// ============================================
let particleAnimations = [];
let introStartTime = null;
let introCompleted = false;
const MAX_INTRO_DURATION = 8000;
const introMessages = ['Initialisation...', 'Streamer connecté..', 'Chargement des données...', 'Accès au panel admin..'];


// ============================================
// 🆕 FONCTION DÉCONNEXION ADMIN
// ============================================
function adminLogout() {
    // Appeler logout pour libérer le slot, puis rediriger vers /admin
    fetch('/auth/logout')
        .then(() => {
            window.location.href = '/admin';
        })
        .catch(() => {
            window.location.href = '/admin';
        });
}


// ============================================
// CONSTANTES SVG ICÔNES DE VIES
// ============================================

const LIVES_ICONS = {
    heart: `<svg viewBox="0 0 24 24" fill="#ff6b6b"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,

    dragonball: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#ff8c00"/><circle cx="8" cy="6" r="2.5" fill="#ffb347" opacity="0.7"/><circle cx="12" cy="8" r="1.8" fill="#c00"/><circle cx="9" cy="13" r="1.8" fill="#c00"/><circle cx="15" cy="13" r="1.8" fill="#c00"/><ellipse cx="7" cy="6" rx="3" ry="2" fill="#fff" opacity="0.4"/></svg>`,

    sharingan: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#cc0000"/><circle cx="12" cy="12" r="3" fill="#000"/><circle cx="12" cy="6" r="1.8" fill="#000"/><circle cx="6.8" cy="15" r="1.8" fill="#000"/><circle cx="17.2" cy="15" r="1.8" fill="#000"/></svg>`,

    shuriken: `<svg viewBox="0 0 24 24" fill="#888"><path d="M12 2L14 10L22 12L14 14L12 22L10 14L2 12L10 10L12 2Z"/><circle cx="12" cy="12" r="2.5" fill="#0a0a0f"/></svg>`,

    konoha: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 2C8 2 4 6 4 12c0 4 2 7 5 8.5-.5-2-.5-4 1-6 1.5-2 3-3 3-3s1.5 1 3 3c1.5 2 1.5 4 1 6 3-1.5 5-4.5 5-8.5 0-6-4-10-8-10z" fill="#4ade80"/><path d="M12 8c-1 1-2 3-2 5s1 3 2 4c1-1 2-2 2-4s-1-4-2-5z" fill="#22c55e"/></svg>`,

    alchemy: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#f0c040" stroke-width="1.5" fill="none"/><circle cx="12" cy="12" r="7" stroke="#f0c040" stroke-width="1" fill="none"/><polygon points="12,4 18,16 6,16" stroke="#f0c040" stroke-width="1" fill="none"/><polygon points="12,20 6,8 18,8" stroke="#f0c040" stroke-width="1" fill="none"/></svg>`,

    curse: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#1a1a2e"/><path d="M12 4 Q16 8 12 12 Q8 8 12 4" fill="#7c3aed"/><path d="M12 20 Q8 16 12 12 Q16 16 12 20" fill="#7c3aed"/><path d="M4 12 Q8 8 12 12 Q8 16 4 12" fill="#7c3aed"/><path d="M20 12 Q16 16 12 12 Q16 8 20 12" fill="#7c3aed"/><circle cx="12" cy="12" r="2" fill="#a855f7"/></svg>`,

    kunai: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 2L8 12L12 14L16 12L12 2Z" fill="#a8a8a8"/><path d="M12 2L8 12L12 10L16 12L12 2Z" fill="#d4d4d4"/><rect x="11" y="14" width="2" height="6" fill="#8b6b4a"/><circle cx="12" cy="22" r="2" fill="none" stroke="#8b6b4a" stroke-width="1.5"/></svg>`,

    star4: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 2L14 10L22 12L14 14L12 22L10 14L2 12L10 10L12 2Z" fill="#3b82f6"/><path d="M12 5L13 10L18 12L13 14L12 19L11 14L6 12L11 10L12 5Z" fill="#60a5fa"/><path d="M12 8L12.5 10.5L15 12L12.5 13.5L12 16L11.5 13.5L9 12L11.5 10.5L12 8Z" fill="#93c5fd"/></svg>`
};

// Katanas groupés - SVG dynamique selon nombre de vies
const KATANA_SVGS = {
    3: `<svg viewBox="0 0 32 24" fill="none" class="katana-group"><path d="M28 20L6 4" stroke="#c8c8c8" stroke-width="2" stroke-linecap="round"/><path d="M28 20L3 11" stroke="#d4d4d4" stroke-width="2" stroke-linecap="round"/><path d="M28 20L4 18" stroke="#b8b8b8" stroke-width="2" stroke-linecap="round"/><rect x="26" y="18" width="5" height="4" rx="1" fill="#8b6b4a"/></svg>`,
    2: `<svg viewBox="0 0 32 24" fill="none" class="katana-group"><path d="M28 20L5 6" stroke="#c8c8c8" stroke-width="2" stroke-linecap="round"/><path d="M28 20L4 16" stroke="#d4d4d4" stroke-width="2" stroke-linecap="round"/><rect x="26" y="18" width="5" height="4" rx="1" fill="#8b6b4a"/></svg>`,
    1: `<svg viewBox="0 0 24 24" fill="none"><path d="M22 18L4 10" stroke="#c8c8c8" stroke-width="2.5" stroke-linecap="round"/><rect x="20" y="16" width="4" height="4" rx="1" fill="#8b6b4a"/></svg>`,
    0: `<svg viewBox="0 0 24 24" fill="none" class="lost"><path d="M22 18L4 10" stroke="#c8c8c8" stroke-width="2.5" stroke-linecap="round"/><rect x="20" y="16" width="4" height="4" rx="1" fill="#8b6b4a"/></svg>`
};

// Noms affichés pour chaque icône
const LIVES_ICON_NAMES = {
    heart: 'Cœur',
    dragonball: 'D.Ball',
    sharingan: 'Sharingan',
    katana: 'Katana',
    shuriken: 'Shuriken',
    konoha: 'Konoha',
    alchemy: 'Alchimie',
    curse: 'Malédiction',
    kunai: 'Kunai',
    star4: 'Étoile'
};


// ============================================
// 🆕 VARIABLES IMAGE PERSONNAGE
// ============================================
let characterImageEnabled = true;
let characterShowTimeout = null;
let characterHideTimeout = null;

// 🆕 État pour masquer les pourcentages (anti-triche)
let hidePercentsEnabled = false;

// Mapping série -> image (noms exacts de la DB)
const CHARACTER_IMAGES = {
    'fire force': 'questionpic/fireforce.png',
    'beelzebub': 'questionpic/beelzebub.png',
    'slam dunk': 'questionpic/slamdunk.png',
    'hajime no ippo': 'questionpic/hajimenoippo.png',
    'great teacher onizuka': 'questionpic/gto.png',
    'berserk': 'questionpic/berserk.png',
    'fate/stay night': 'questionpic/fate.png',
    'gantz': 'questionpic/gantz.png',
    'demon slayer': 'questionpic/demonslayer.png',
    'saint seiya': 'questionpic/saintseiya.png',
    'dandadan': 'questionpic/dandadan.png',
    'riku-do': 'questionpic/rikudo.png',
    'food wars': 'questionpic/foodwars.png',
    'blue exorcist': 'questionpic/blueexorcist.png',
    'katekyo hitman reborn': 'questionpic/reborn.png',
    'platinum end': 'questionpic/platinumend.png',
    'jujutsu kaisen': 'questionpic/jujutsukaisen.png',
    'jujustu kaisen': 'questionpic/jujutsukaisen.png', // typo dans la DB
    'nana': 'questionpic/nana.png',
    'shingeki no kyojin': 'questionpic/shingekinokyojin.png',
    'prisonnier riku': 'questionpic/prisonnieriku.png',
    'erased': 'questionpic/erased.png',
    'one punch man': 'questionpic/onepunchman.png',
    'bleach': 'questionpic/bleach.png',
    'the promised neverland': 'questionpic/promisedneverland.png',
    'yugioh': 'questionpic/yugioh.png',
    'fairy tail': 'questionpic/fairytail.png',
    'tokyo ghoul': 'questionpic/tokyoghoul.png',
    'death note': 'questionpic/deathnote.png',
    'dr. stone': 'questionpic/drstone.png',
    'one piece': 'questionpic/onepiece.png',
    'tokyo revengers': 'questionpic/tokyorevengers.png',
    'kuroko no basket': 'questionpic/kurokosbasket.png',
    'hunter hunter': 'questionpic/hunterxhunter.png',
    'naruto': 'questionpic/naruto.png',
    'blue lock': 'questionpic/bluelock.png',
    'i am a hero': 'questionpic/iamahero.png',
    'divers': 'questionpic/divers.png',
    'nanatsu no taizai': 'questionpic/nanatsunotaizai.png',
    'fullmetal alchemist': 'questionpic/fullmetalalchemist.png',
    'dragon ball': 'questionpic/dragonball.png',
    'jojo\'s bizarre adventure': 'questionpic/jojo.png',
    'pokemon': 'questionpic/pokemon.png',
    'black clover': 'questionpic/blackclover.png',
    'bakuman': 'questionpic/bakuman.png',
    'yu yu hakusho': 'questionpic/yuyuhakusho.png',
    'hokuto no ken': 'questionpic/hokutonoken.png',
    'prophecy': 'questionpic/prophecy.png',
    'green blood': 'questionpic/greenblood.png',
    'spy family': 'questionpic/spyfamily.png',
    'frieren': 'questionpic/frieren.png',
    'tomodachi game': 'questionpic/tomodachigame.png',
    'my hero academia': 'questionpic/myheroacademia.png',
    'vinland saga': 'questionpic/vinlandsaga.png',
    'gunnm': 'questionpic/gunnm.png'
};


// ============================================
// VARIABLES PARTICULES BOUTON
// ============================================
let isHovering = false;
let hoverTransition = 0;
let time = 0;
let movementFadeIn = 0;
let continuousAnimationId = null;



// ============================================
// SOCKET.IO
// ============================================
let socket = null;

function initSocket() {
    socket = io();

    // ===== ÉVÉNEMENTS LOBBY =====

    socket.on('lobby-update', (data) => {
        console.log('📥 lobby-update:', data);

        if (data.livesIcon) {
            updateLivesIconSelector(data.livesIcon);
        }

        // Mettre à jour les paramètres si envoyés
        if (data.mode) updateModeDisplay(data.mode);
        if (data.lives) updateLivesDisplay(data.lives);
        if (data.questionTime) updateTimerDisplay(data.questionTime);

        // Mettre à jour les joueurs APRÈS l'icône
        if (data.players) {
            updateLobbyPlayers(data.players);
        }

        // Mettre à jour le compteur
        if (data.playerCount !== undefined) {
            document.getElementById('lobbyPlayerCount').textContent = data.playerCount;
        }
    });

    socket.on('game-activated', () => {
        console.log('✅ Lobby ouvert');
    });

    socket.on('game-deactivated', () => {
        console.log('❌ Lobby fermé');
        // 🆕 Retourner à l'idle depuis n'importe quel état (lobby ou game)
        returnToIdle();
    });

    socket.on('game-started', (data) => {
        console.log('🎮 Partie démarrée:', data);
        gameSettings.mode = data.gameMode === 'lives' ? 'vie' : 'point';
        gameSettings.totalQuestions = data.questionsCount || 20;
        transitionToGame();
    });

    socket.on('new-question', (data) => {
        console.log('📝 Nouvelle question:', data);
        displayQuestion(data);
    });


    socket.on('question-results', (data) => {
        console.log('📊 Résultats:', data);
        console.log('📊 Stats:', data.stats);  // AJOUTER
        console.log('📊 Fastest:', data.fastestPlayer);  // AJOUTER
        displayResults(data);
    });


    socket.on('live-answer-stats', (data) => {
        updateLiveStats(data);
    });

    socket.on('game-ended', (data) => {
        console.log('🏆 Fin de partie:', data);
        displayWinner(data);
    });

    socket.on('activity-log', (log) => {
        handleActivityLog(log);
    });

    socket.on('tiebreaker-announced', (data) => {
        console.log('⚔️ Tiebreaker:', data);
        // Afficher message égalité
    });

    socket.on('connect', () => {
        console.log('🔌 Socket connecté');
    });

    socket.on('disconnect', () => {
        console.log('🔌 Socket déconnecté');
    });

    socket.on('logs-reset', () => {
        const logsList = document.getElementById('gameLogsList');
        if (logsList) {
            logsList.innerHTML = '';
        }
    });

    socket.on('prepare-next-question', () => {
        console.log('🔄 Préparation question suivante (mode auto)');

        hideGameCloseBtn();

        const questionWrapper = document.getElementById('gameQuestionWrapper');
        const mainPanel = document.getElementById('gameMainPanel');
        const questionActions = document.getElementById('questionActions');

        // Cacher le contenu
        const questionText = document.getElementById('questionText');
        const answersGrid = document.getElementById('answersGrid');
        const questionBadges = document.querySelector('.question-badges-row');

        if (questionText) questionText.style.opacity = '0';
        if (answersGrid) answersGrid.style.opacity = '0';
        if (questionBadges) questionBadges.style.opacity = '0';

        // Lancer l'animation de fermeture
        if (questionActions) questionActions.classList.remove('visible');
        if (questionWrapper) questionWrapper.classList.add('closing');
        if (mainPanel) mainPanel.classList.add('closing');

        // Nettoyer après l'animation
        setTimeout(() => {
            if (questionWrapper) questionWrapper.classList.remove('closing', 'shifted');
            if (mainPanel) mainPanel.classList.remove('visible', 'closing');
        }, 400);
    });
}


function closeLobbyUI() {


    // Vider la grille des joueurs
    const grid = document.getElementById('playersGridLobby');
    if (grid) grid.innerHTML = '';
    document.getElementById('lobbyPlayerCount').textContent = '0';


    anime({
        targets: stateLobby,
        opacity: [1, 0],
        duration: 400,
        easing: 'easeOutQuad',
        complete: () => {
            stateLobby.classList.remove('active');
            stateLobby.style.opacity = '';
            stateIdle.style.display = 'grid';
            
            // 🆕 Réafficher le bouton déconnexion
            const logoutBtn = document.getElementById('headerLogoutBtn');
            if (logoutBtn) logoutBtn.style.display = 'flex';

            // Réafficher les panneaux latéraux
            recentPanel.classList.remove('hidden');
            lastgamePanel.classList.remove('hidden');
            recentPanel.style.opacity = '1';
            lastgamePanel.style.opacity = '1';

            // Reset background text
            bgText.textContent = 'MASTER';
            bgText.classList.remove('lobby-active');
            statusDot.classList.remove('active');
            statusText.textContent = 'Inactif';

            // Réactiver le pulse du bouton
            btnWrapper.classList.add('pulse-active');

            // 🔥 NOUVEAU: Relancer l'animation des particules
            movementFadeIn = 0; // Reset le fade-in
            startContinuousAnimation();

            // Réafficher le bouton JOUER
            const mainBtn = document.querySelector('.main-action-btn');
            if (mainBtn) {
                mainBtn.style.opacity = '1';
                mainBtn.style.transform = 'scale(1)';
            }

            // Réafficher le personnage chibi
            const btnCharacter = document.querySelector('.btn-character');
            if (btnCharacter) {
                btnCharacter.style.opacity = '0.95';
                btnCharacter.style.visibility = 'visible';
                btnCharacter.classList.add('visible');
            }

            // Réafficher les particules
            document.querySelectorAll('.btn-wrapper .particle').forEach(p => {
                p.style.opacity = '0.6';
            });

            // Animations de retour
            anime({
                targets: '.idle-main',
                opacity: [0, 1],
                translateY: [20, 0],
                duration: 500,
                easing: 'easeOutCubic'
            });

            anime({
                targets: '.idle-stats',
                opacity: [0, 1],
                duration: 500,
                delay: 100,
                easing: 'easeOutCubic'
            });

            anime({
                targets: '.recent-games-panel',
                opacity: [0, 1],
                translateX: [-40, 0],
                duration: 500,
                delay: 200,
                easing: 'easeOutCubic'
            });

            anime({
                targets: '.lastgame-panel',
                opacity: [0, 1],
                translateX: [40, 0],
                duration: 500,
                delay: 200,
                easing: 'easeOutCubic'
            });
        }
    });
}

// ============================================
// AUTHENTIFICATION
// ============================================

async function handleLogin(event) {
    event.preventDefault();
    const password = document.getElementById('adminCode').value;
    const masterPassword = document.getElementById('masterPassword').value;
    const errorMsg = document.getElementById('errorMsg');

    errorMsg.innerHTML = '';

    try {
        const response = await fetch('/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                password,
                masterOverride: masterPassword || undefined
            })
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('loginContainer').style.display = 'none';

            // Jouer l'intro ou skip
            if (shouldPlayIntro()) {
                document.getElementById('introScreen').style.display = 'flex';
                markIntroPlayed();
                playIntro();
            } else {
                showAdminPanel();
            }
        } else {
            if (data.error === 'admin_already_connected') {
                errorMsg.textContent = 'Un admin est déjà connecté';
                document.getElementById('masterPasswordGroup').style.display = 'block';
            } else {
                errorMsg.textContent = data.message || 'Code incorrect';
            }
        }
    } catch (error) {
        console.error('Erreur login:', error);
        errorMsg.textContent = 'Erreur de connexion';
    }
}

async function checkAuth() {
    try {
        const response = await fetch('/admin/check', { credentials: 'same-origin' });
        const data = await response.json();

        if (data.isAdmin) {
            document.getElementById('loginContainer').style.display = 'none';

            if (shouldPlayIntro()) {
                document.getElementById('introScreen').style.display = 'flex';
                markIntroPlayed();
                playIntro();
            } else {
                showAdminPanel();
            }
        } else {
            document.getElementById('loginContainer').style.display = 'flex';
            document.getElementById('adminCode').focus(); // ← Focus auto
        }
    } catch (error) {
        console.log('Non authentifié');
        document.getElementById('loginContainer').style.display = 'flex';
        document.getElementById('adminCode').focus(); // ← Focus auto
    }
}

function shouldPlayIntro() {
    return !sessionStorage.getItem('introPlayed');
}

function markIntroPlayed() {
    sessionStorage.setItem('introPlayed', 'true');
}


// ============================================
// INTRO ANIMATIONS
// ============================================

function createIntroParticles() {
    const container = document.getElementById('particlesContainer');
    if (!container) return;

    container.innerHTML = '';
    const numParticles = 25;

    for (let i = 0; i < numParticles; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        const size = 2 + Math.random() * 3;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        container.appendChild(particle);
    }
}

function animateIntroParticles() {
    const particles = document.querySelectorAll('.intro-screen .particle');

    particles.forEach((particle, i) => {
        particle.style.opacity = 0.3 + Math.random() * 0.4;

        const anim = anime({
            targets: particle,
            translateY: [0, -30 - Math.random() * 40],
            translateX: [-10 + Math.random() * 20, -10 + Math.random() * 20],
            opacity: [0.3 + Math.random() * 0.3, 0.5 + Math.random() * 0.3],
            duration: 3000 + Math.random() * 2000,
            delay: i * 50,
            easing: 'easeInOutSine',
            loop: true,
            direction: 'alternate'
        });
        particleAnimations.push(anim);
    });
}

function accelerateParticles() {
    particleAnimations.forEach(anim => anim.pause());

    anime({
        targets: '.intro-screen .particle',
        translateY: -window.innerHeight - 100,
        opacity: { value: 0, duration: 1200, easing: 'easeInQuad' },
        duration: 1500,
        easing: 'easeInCubic',
        delay: anime.stagger(20, { from: 'center' })
    });
}

function startIntroIdleAnimation() {
    anime({
        targets: '#ambientGlow',
        opacity: [1, 0.7, 1],
        scale: [1, 1.05, 1],
        duration: 3000,
        easing: 'easeInOutSine',
        loop: true
    });
}

function startTextPulse() {
    anime({
        targets: ['#logoShonen', '#logoMaster'],
        opacity: [0.8, 0.6, 0.8],
        duration: 2000,
        easing: 'easeInOutSine',
        loop: true
    });
}

async function showIntroMessage(text) {
    const msgEl = document.getElementById('messageText');
    if (!msgEl) return;

    msgEl.textContent = text;

    await anime({
        targets: msgEl,
        opacity: [0, 1],
        translateY: [10, 0],
        duration: 400,
        easing: 'easeOutQuad'
    }).finished;
}

async function hideIntroMessage() {
    const msgEl = document.getElementById('messageText');
    if (!msgEl) return;

    await anime({
        targets: msgEl,
        opacity: [1, 0],
        translateY: [0, -10],
        duration: 300,
        easing: 'easeInQuad'
    }).finished;
}

function sleepIntro(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function skipIntro() {
    introCompleted = true;

    anime.remove('.intro-screen .particle');
    anime.remove('#ambientGlow');
    anime.remove('#lightBeam');
    anime.remove('#logoSeparator');
    anime.remove('#logoShonen');
    anime.remove('#logoMaster');
    anime.remove('#paraIcon');
    anime.remove('#messageText');
    anime.remove('.intro-screen');

    particleAnimations.forEach(anim => anim.pause());

    document.getElementById('introScreen').style.display = 'none';
    showAdminPanel();
}

function resetIntroElements() {
    const elements = {
        'ambientGlow': { opacity: '0', transform: 'translate(-50%, -50%) scale(1)' },
        'lightBeam': { opacity: '0', width: '0' },
        'logoSeparator': { height: '0', opacity: '0' },
        'logoShonen': { clipPath: 'inset(0 100% 0 0)', opacity: '0.8' },
        'logoMaster': { clipPath: 'inset(0 100% 0 0)', opacity: '0.8' },
        'paraIcon': { opacity: '0', transform: 'translateY(-15px) rotate(-25deg)' },
        'messageText': { opacity: '0' }
    };

    for (const [id, styles] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) Object.assign(el.style, styles);
    }

    const msgText = document.getElementById('messageText');
    if (msgText) msgText.textContent = '';

    const particlesContainer = document.getElementById('particlesContainer');
    if (particlesContainer) particlesContainer.innerHTML = '';

    particleAnimations = [];
}

async function playIntro() {
    introStartTime = Date.now();
    introCompleted = false;

    resetIntroElements();
    createIntroParticles();
    animateIntroParticles();

    // 1. Glow ambiant
    anime({
        targets: '#ambientGlow',
        opacity: [0, 1],
        duration: 2000,
        easing: 'easeOutQuad'
    });

    await sleepIntro(300);

    // 2. Trait de lumière + Message 1
    anime({
        targets: '#lightBeam',
        opacity: [0, 1, 0.4],
        width: [0, 600],
        duration: 600,
        easing: 'easeOutQuad'
    });

    showIntroMessage(introMessages[0]);

    // 3. Séparateur
    await sleepIntro(50);
    anime({
        targets: '#logoSeparator',
        height: [0, 50],
        opacity: [0, 1],
        duration: 400,
        easing: 'easeOutQuad'
    });

    await sleepIntro(30);

    // 4. SHONEN
    anime({
        targets: '#logoShonen',
        clipPath: ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'],
        duration: 1200,
        easing: 'easeOutQuad'
    });

    startTextPulse();

    await sleepIntro(200);

    // 5. MASTER
    anime({
        targets: '#logoMaster',
        clipPath: ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'],
        duration: 1200,
        easing: 'easeOutQuad'
    });

    // 6. Message 2
    await sleepIntro(300);
    await hideIntroMessage();
    await sleepIntro(50);
    await showIntroMessage(introMessages[1]);

    // 7. Parapluie
    await sleepIntro(200);
    anime({
        targets: '#paraIcon',
        opacity: [0, 0.85],
        translateY: [-15, 0],
        rotate: [-25, -15],
        duration: 700,
        easing: 'easeOutQuad'
    });

    // 8. Message 3
    await sleepIntro(400);
    await hideIntroMessage();
    await sleepIntro(50);
    await showIntroMessage(introMessages[2]);

    // 9. Idle animation
    await sleepIntro(300);
    startIntroIdleAnimation();

    await sleepIntro(400);

    // 10. Message 4
    await hideIntroMessage();
    await sleepIntro(50);
    await showIntroMessage(introMessages[3]);

    await sleepIntro(600);

    // 11. Accélérer particules
    await hideIntroMessage();
    accelerateParticles();

    await sleepIntro(800);

    // 12. Fade out
    anime({
        targets: '.intro-screen',
        opacity: [1, 0],
        duration: 800,
        easing: 'easeInOutQuad',
        complete: () => {
            introCompleted = true;
            document.getElementById('introScreen').style.display = 'none';
        }
    });

    await sleepIntro(300);
    showAdminPanel();
}


// Skip intro si trop long
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && introStartTime && !introCompleted) {
        const elapsed = Date.now() - introStartTime;
        if (elapsed > MAX_INTRO_DURATION) {
            console.log('⏭️ Intro trop longue, skip vers le panel');
            skipIntro();
        }
    }
});


// ============================================
// AFFICHAGE PANEL ADMIN
// ============================================

async function showAdminPanel() {
    // Initialiser Socket.io
    initSocket();

    // Charger les données
    await loadIdleData();

    // Restaurer l'état du jeu AVANT d'afficher quoi que ce soit
    const restored = await restoreGameState();

    // Si l'état a été restauré (lobby/game), ne pas afficher idle
    if (restored) {
        document.getElementById('mainHeader').style.display = '';
        document.getElementById('mainContainer').style.display = '';
        document.getElementById('bgText').style.display = '';
        return;
    }

    // Sinon, afficher l'état idle normal
    document.getElementById('mainHeader').style.display = '';
    document.getElementById('mainContainer').style.display = '';
    document.getElementById('bgText').style.display = '';

    startIdleAnimations();


}

function initPanel() {
    // Afficher le contenu principal
    document.getElementById('mainHeader').style.display = '';
    document.getElementById('mainContainer').style.display = '';
    document.getElementById('bgText').style.display = '';  // ← Ajouter cette ligne

    // Lancer les animations
    startIdleAnimations();

    // Charger les données
    setTimeout(loadIdleData, 500);
}

// ============================================
// ANIMATIONS IDLE (après login)
// ============================================

function startIdleAnimations() {
    // Animation bouton
    anime({
        targets: '.main-action-btn',
        scale: [0, 1],
        opacity: [0, 1],
        duration: 650,
        easing: 'easeOutBack',
        delay: 300,
        complete: () => {
            const wrapper = document.getElementById('btnWrapper');
            if (wrapper) wrapper.classList.add('pulse-active');
        }
    });

    // Personnage
    const btnCharacter = document.querySelector('.btn-character');
    if (btnCharacter) {
        btnCharacter.style.opacity = '0';
        btnCharacter.style.zIndex = '0';
        btnCharacter.style.visibility = 'hidden';

        setTimeout(() => {
            btnCharacter.style.visibility = 'visible';
            anime({
                targets: '.btn-character',
                opacity: [0, 0.95],
                translateY: [50, 0],
                scale: [0.85, 1],
                duration: 550,
                easing: 'easeOutCubic',
                complete: () => {
                    btnCharacter.style.zIndex = '10';
                    btnCharacter.classList.add('visible');
                }
            });
        }, 1150);
    }

    // Stats
    anime({
        targets: '.idle-stats',
        opacity: [0, 1],
        translateY: [30, 0],
        duration: 600,
        easing: 'easeOutCubic',
        delay: 500
    });

    // Panneau récentes
    anime({
        targets: '.recent-games-panel',
        opacity: [0, 1],
        translateX: [-40, 0],
        duration: 600,
        easing: 'easeOutCubic',
        delay: 400
    });

    anime({
        targets: '.recent-game-item',
        opacity: [0, 1],
        translateX: [-20, 0],
        delay: anime.stagger(80, { start: 600 }),
        duration: 400,
        easing: 'easeOutCubic'
    });

    // Leaderboard
    anime({
        targets: '.lastgame-panel',
        opacity: [0, 1],
        translateX: [40, 0],
        duration: 600,
        easing: 'easeOutCubic',
        delay: 400
    });

    anime({
        targets: '.lastgame-item',
        opacity: [0, 1],
        translateX: [20, 0],
        delay: anime.stagger(50, { start: 600 }),
        duration: 400,
        easing: 'easeOutCubic'
    });

    // Particules idle
    anime({
        targets: '.particles-container .particle',
        opacity: [0, 0.6],
        scale: [0, 1],
        delay: anime.stagger(100, { start: 1200 }),
        duration: 600,
        easing: 'easeOutCubic',
        complete: startContinuousAnimation
    });
}

// Vérifier l'auth au chargement
document.addEventListener('DOMContentLoaded', checkAuth);

// ============================================
// CHARGEMENT DONNÉES RÉELLES - IDLE
// ============================================

async function loadIdleData() {
    try {
        // Charger stats générales
        const statsResponse = await fetch('/admin/stats', { credentials: 'same-origin' });
        if (statsResponse.ok) {
            const stats = await statsResponse.json();

            // Mettre à jour les stats sous le bouton
            const statValues = document.querySelectorAll('.idle-stat-value');
            setTimeout(() => {
                if (statValues[0]) animateCounter(statValues[0], stats.totalGames || 0, 1200);
            }, 600);

            // Mettre à jour le leaderboard
            if (stats.topPlayers && stats.topPlayers.length > 0) {
                populateLeaderboard(stats.topPlayers);
            }

            // Mettre à jour les parties récentes
            if (stats.recentGames && stats.recentGames.length > 0) {
                populateRecentGames(stats.recentGames);
            }
        }

        // Charger stats DB (nombre de questions ET joueurs)
        const dbStatsResponse = await fetch('/admin/db-stats', { credentials: 'same-origin' });
        if (dbStatsResponse.ok) {
            const dbStats = await dbStatsResponse.json();
            const statValues = document.querySelectorAll('.idle-stat-value');

            // 🆕 Arrondir à la centaine inférieure
            const roundedPlayers = Math.floor((dbStats.totalPlayers || 0) / 100) * 100;
            const roundedQuestions = Math.floor((dbStats.totalQuestions || 0) / 100) * 100;

            setTimeout(() => {
                if (statValues[1]) animateCounter(statValues[1], formatPlayerCount(roundedPlayers), 1200, '+');
                if (statValues[2]) animateCounter(statValues[2], roundedQuestions, 1200, '+');
            }, 600);
        }

        return true; // Données chargées
    } catch (error) {
        console.error('❌ Erreur chargement données Idle:', error);

        // Fallback en cas d'erreur
        const statValues = document.querySelectorAll('.idle-stat-value');
        if (statValues[0]) statValues[0].textContent = '0';
        if (statValues[1]) statValues[1].textContent = '0';
        if (statValues[2]) statValues[2].textContent = '+0';

        return false;
    }
}

function formatPlayerCount(count) {
    if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
}

function formatTimeAgo(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `Il y a ${diffMins}min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return 'Hier';
    return `Il y a ${diffDays}j`;
}

// Peupler le leaderboard avec les vraies données
function populateLeaderboard(players) {
    const list = document.getElementById('lastgameList');
    if (!list) return;
    list.innerHTML = '';

    // Créer les items originaux (sans doublons pour "Tous")
    const items = players.map((player, index) => ({
        player,
        rank: index + 1,
        isOriginal: true
    }));

    // Ajouter les doublons pour le scroll infini (Top 10)
    const duplicates = players.map((player, index) => ({
        player,
        rank: index + 1,
        isOriginal: false
    }));

    const allItems = [...items, ...duplicates];

    // Mélanger SEULEMENT les originaux pour l'affichage initial
    const shuffledOriginals = items.sort(() => Math.random() - 0.5);

    // Créer tous les éléments DOM
    allItems.forEach((item) => {
        const elem = document.createElement('div');
        elem.className = `lastgame-item ${getRankClass(item.rank)}`;
        elem.dataset.playerRank = item.rank;
        elem.dataset.playerName = item.player.username;
        elem.dataset.twitchId = item.player.twitch_id;
        elem.dataset.duplicate = item.isOriginal ? 'false' : 'true';

        const badgeNumber = getRankBadgeNumber(item.rank);
        const badgeHtml = badgeNumber ? `<span class="lastgame-rank-badge">${badgeNumber}</span>` : '';

        elem.innerHTML = `<div class="lastgame-name">${item.player.username}${badgeHtml}</div>`;

        // Par défaut : cacher les doublons, afficher les originaux
        elem.style.display = item.isOriginal ? 'flex' : 'none';

        list.appendChild(elem);
    });

    // Réordonner visuellement les originaux (mélangés)
    shuffledOriginals.forEach(item => {
        const elem = list.querySelector(`.lastgame-item[data-player-name="${item.player.username}"][data-duplicate="false"]`);
        if (elem) list.appendChild(elem);
    });

    // Réattacher les events
    setupPlayerCardEvents();
    setupLeaderboardFilters();
}


function setupLeaderboardFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Retirer active des autres
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.dataset.filter;
            const list = document.getElementById('lastgameList');
            const allItems = Array.from(list.querySelectorAll('.lastgame-item'));

            if (filter === 'all') {
                // "Tous" - Seulement les originaux (pas les doublons), mélangés
                const originalItems = allItems.filter(item => item.dataset.duplicate === 'false');
                const duplicateItems = allItems.filter(item => item.dataset.duplicate === 'true');

                // Cacher les doublons
                duplicateItems.forEach(item => {
                    item.style.display = 'none';
                });

                // Mélanger et afficher les originaux
                const shuffledItems = originalItems.sort(() => Math.random() - 0.5);

                shuffledItems.forEach((item, index) => {
                    item.style.display = 'flex';
                    list.appendChild(item);

                    anime({
                        targets: item,
                        opacity: [0, 1],
                        translateX: [20, 0],
                        duration: 300,
                        delay: index * 15,
                        easing: 'easeOutCubic'
                    });
                });

            } else {
                // "Top 10" - Trier par rang, afficher doublons pour scroll infini
                const sortedItems = allItems.sort((a, b) => {
                    const rankA = parseInt(a.dataset.playerRank);
                    const rankB = parseInt(b.dataset.playerRank);
                    const dupA = a.dataset.duplicate === 'true' ? 1 : 0;
                    const dupB = b.dataset.duplicate === 'true' ? 1 : 0;

                    // D'abord les originaux, puis les doublons, triés par rang
                    if (dupA !== dupB) return dupA - dupB;
                    return rankA - rankB;
                });

                let visibleIndex = 0;

                sortedItems.forEach((item) => {
                    const rank = parseInt(item.dataset.playerRank);
                    list.appendChild(item);

                    if (rank <= 10) {
                        item.style.display = 'flex';
                        anime({
                            targets: item,
                            opacity: [0, 1],
                            translateX: [20, 0],
                            duration: 300,
                            delay: visibleIndex * 30,
                            easing: 'easeOutCubic'
                        });
                        visibleIndex++;
                    } else {
                        item.style.display = 'none';
                    }
                });
            }
        });
    });
}

// Peupler les parties récentes
function populateRecentGames(games) {
    const panel = document.getElementById('recentPanel');
    if (!panel) return;

    // Garder le header
    const header = panel.querySelector('.recent-games-header');
    panel.innerHTML = '';
    if (header) panel.appendChild(header);

    games.slice(0, 7).forEach(game => {
        const item = document.createElement('div');
        item.className = 'recent-game-item';
        item.innerHTML = `
            <div class="recent-game-header">
                <span class="recent-game-date">${formatTimeAgo(game.created_at)}</span>
                <span class="recent-game-players">${game.total_players || '?'} joueurs</span>
            </div>
            <div class="recent-game-winner">🏆 ${game.winner?.username || 'N/A'}</div>
        `;
        panel.appendChild(item);
    });

    // Animation d'entrée
    anime({
        targets: '.recent-game-item',
        opacity: [0, 1],
        translateX: [-20, 0],
        delay: anime.stagger(80),
        duration: 400,
        easing: 'easeOutCubic'
    });
}





function startContinuousAnimation() {
    const particles = document.querySelectorAll('.btn-wrapper .particle');

    // 🔍 DEBUG
    console.log('🔍 Particules trouvées:', particles.length);
    console.log('🔍 stateIdle display:', document.getElementById('stateIdle')?.style.display);
    console.log('🔍 btnWrapper visible:', document.getElementById('btnWrapper')?.offsetParent !== null);

    if (!particles.length) {
        console.log('❌ Aucune particule trouvée, abandon');
        return;
    }

    // Annuler l'animation précédente si elle existe
    if (continuousAnimationId) {
        cancelAnimationFrame(continuousAnimationId);
        continuousAnimationId = null;
    }

    function animate() {
        time += 0.016;
        if (movementFadeIn < 1) movementFadeIn += 0.02;

        const targetTransition = isHovering ? 1 : 0;
        hoverTransition += (targetTransition - hoverTransition) * 0.08;

        const radius = 130;
        const orbitSpeed = 0.8;

        particles.forEach((particle, i) => {
            // État normal : flottement doux
            const floatX = Math.sin(time * 0.5 + i * 0.8) * 12 * movementFadeIn;
            const floatY = Math.cos(time * 0.4 + i * 1.2) * 10 * movementFadeIn;
            const floatScale = 1 + Math.sin(time * 0.3 + i) * 0.1 * movementFadeIn;
            const floatOpacity = 0.6 + Math.sin(time * 0.25 + i * 0.5) * 0.1 * movementFadeIn;

            // État hover : orbite circulaire
            const angle = (i / particles.length) * Math.PI * 2 + time * orbitSpeed;
            const orbitX = Math.cos(angle) * radius;
            const orbitY = Math.sin(angle) * radius;
            const orbitScale = 0.8;
            const orbitOpacity = 0.55;

            // Interpolation entre les deux états
            const x = floatX + (orbitX - floatX) * hoverTransition;
            const y = floatY + (orbitY - floatY) * hoverTransition;
            const scale = floatScale + (orbitScale - floatScale) * hoverTransition;
            const opacity = floatOpacity + (orbitOpacity - floatOpacity) * hoverTransition;

            particle.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
            particle.style.opacity = opacity;
        });

        continuousAnimationId = requestAnimationFrame(animate);
    }
    animate();

    console.log('✅ Animation démarrée, continuousAnimationId:', continuousAnimationId);
}

const btnWrapper = document.querySelector('.btn-wrapper');
if (btnWrapper) {
    btnWrapper.addEventListener('mouseenter', () => isHovering = true);
    btnWrapper.addEventListener('mouseleave', () => isHovering = false);
}

// ============================================
// LEADERBOARD
// ============================================
function getRankClass(rank) {
    if (rank === 1) return 'top1';
    if (rank === 2) return 'top2';
    if (rank === 3) return 'top3';
    if (rank <= 10) return 'top10';
    return '';
}

function getRankBadgeNumber(rank) {
    if (rank <= 3) return rank;
    if (rank <= 10) return '10';
    if (rank <= 50) return '50';
    return '';
}

function populateLastGame() {
    const list = document.getElementById('lastgameList');
    list.innerHTML = '';
    const allPlayers = [...allDbPlayers, ...allDbPlayers];

    allPlayers.forEach(player => {
        const item = document.createElement('div');
        item.className = `lastgame-item ${getRankClass(player.rank)}`;
        item.dataset.playerRank = player.rank;
        item.dataset.playerName = player.name;

        const badgeNumber = getRankBadgeNumber(player.rank);
        const badgeHtml = badgeNumber ? `<span class="lastgame-rank-badge">${badgeNumber}</span>` : '';

        item.innerHTML = `<div class="lastgame-name">${player.name}${badgeHtml}</div>`;
        list.appendChild(item);
    });
}


// Filtres avec animations
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.dataset.filter;
        const items = document.querySelectorAll('.lastgame-item');

        items.forEach((item, index) => {
            const rank = parseInt(item.dataset.playerRank);
            const shouldShow = filter === 'all' || rank <= 10;

            if (shouldShow) {
                item.style.display = 'flex';
                anime({
                    targets: item,
                    opacity: [0, 1],
                    translateX: [20, 0],
                    duration: 300,
                    delay: index * 20,
                    easing: 'easeOutCubic'
                });
            } else {
                anime({
                    targets: item,
                    opacity: [1, 0],
                    translateX: [0, -20],
                    duration: 200,
                    easing: 'easeOutCubic',
                    complete: () => {
                        item.style.display = 'none';
                    }
                });
            }
        });
    });
});

// ============================================
// CARTE JOUEUR 3D AU HOVER
// ============================================
const playerCard = document.getElementById('playerCard');
const playerCardInner = document.getElementById('playerCardInner');
const cardRankBadge = document.getElementById('cardRankBadge');
let hideCardTimeout;

// Données fictives des joueurs
const playerData = {
    'Gojo_Satoru': { wins: 24, games: 31, titles: 3, badges: 7, title: 'Maître', lastPlace: 1 },
    'OnePieceKing': { wins: 19, games: 28, titles: 2, badges: 5, title: 'Expert', lastPlace: 2 },
    'LuffyD': { wins: 22, games: 35, titles: 2, badges: 6, title: 'Expert', lastPlace: 1 },
    'Levi_Heichou': { wins: 20, games: 29, titles: 2, badges: 5, title: 'Expert', lastPlace: 3 },
    'NarutoFan42': { wins: 17, games: 26, titles: 1, badges: 4, title: 'Avancé', lastPlace: 4 },
    'AllMight': { wins: 16, games: 24, titles: 1, badges: 4, title: 'Avancé', lastPlace: 5 },
    'Tanjiro': { wins: 15, games: 22, titles: 1, badges: 4, title: 'Avancé', lastPlace: 5 },
    'VegetaPrince': { wins: 14, games: 23, titles: 1, badges: 3, title: 'Avancé', lastPlace: 6 },
    'Deku_Hero': { wins: 13, games: 21, titles: 1, badges: 3, title: 'Avancé', lastPlace: 7 },
    'Mikasa': { wins: 18, games: 25, titles: 1, badges: 4, title: 'Avancé', lastPlace: 3 },
    'Eren_Jaeger': { wins: 12, games: 20, titles: 1, badges: 3, title: 'Avancé', lastPlace: 8 },
    'Bakugo': { wins: 11, games: 19, titles: 0, badges: 2, title: 'Intermédiaire', lastPlace: 10 },
    'Todoroki': { wins: 10, games: 18, titles: 0, badges: 2, title: 'Intermédiaire', lastPlace: 12 },
    'Zenitsu': { wins: 8, games: 16, titles: 0, badges: 2, title: 'Novice', lastPlace: 15 },
    'default': { wins: 5, games: 12, titles: 0, badges: 1, title: 'Novice', lastPlace: 20 }
};

function getRankBadgeClass(rank) {
    if (rank === 1) return 'top1';
    if (rank === 2) return 'top2';
    if (rank === 3) return 'top3';
    if (rank <= 10) return 'top10';
    if (rank <= 50) return 'top50';
    return '';
}

function getRankBadgeText(rank) {
    if (rank <= 3) return 'TOP ' + rank;
    if (rank <= 10) return 'TOP 10';
    if (rank <= 50) return 'TOP 50';
    return '';
}

function getPlaceClass(place) {
    if (place === 1) return 'top1';
    if (place <= 3) return 'top3';
    return 'normal';
}

function setupPlayerCardEvents() {
    const items = document.querySelectorAll('.lastgame-item');

    items.forEach(item => {
        item.addEventListener('mouseenter', async () => {
            clearTimeout(hideCardTimeout);

            const cardAvatar = document.getElementById('cardAvatar');
            if (cardAvatar) {
                cardAvatar.style.opacity = '0';
            }

            const name = item.dataset.playerName;
            const rank = parseInt(item.dataset.playerRank);
            const twitchId = item.dataset.twitchId;

            // Afficher la carte avec données de base immédiatement
            const cardNameEl = document.getElementById('cardName');
            cardNameEl.textContent = name;
            if (name.length > 14) cardNameEl.style.fontSize = '0.7rem';
            else if (name.length > 10) cardNameEl.style.fontSize = '0.8rem';
            else cardNameEl.style.fontSize = '0.85rem';

            // Badge de rang
            const badgeClass = getRankBadgeClass(rank);
            cardRankBadge.className = 'player-card-rank-badge ' + badgeClass;
            cardRankBadge.textContent = getRankBadgeText(rank);
            cardRankBadge.style.display = badgeClass ? 'flex' : 'none';

            // Reset classes de la carte
            playerCardInner.classList.remove('top1-card', 'top10-card');
            if (rank === 1) playerCardInner.classList.add('top1-card');
            else if (rank <= 10) playerCardInner.classList.add('top10-card');

            // Afficher la carte
            playerCard.classList.add('visible');

            // Charger les vraies données si twitchId disponible
            if (twitchId) {
                try {
                    const response = await fetch(`/profile/${twitchId}`);
                    if (response.ok) {
                        const data = await response.json();
                        const user = data.user;

                        const cardAvatar = document.getElementById('cardAvatar');
                        if (cardAvatar) {
                            cardAvatar.src = user.avatar_url || 'novice.png';
                            cardAvatar.onload = () => {
                                cardAvatar.style.opacity = '1';
                            };
                        }

                        document.getElementById('cardTitle').textContent = data.titles?.current?.title_name || 'Novice';
                        document.getElementById('cardWins').textContent = user.total_victories || 0;
                        document.getElementById('cardGames').textContent = user.total_games_played || 0;
                        document.getElementById('cardTitles').textContent = data.titles?.unlocked?.length || 0;
                        document.getElementById('cardBadges').textContent =
                            (data.badges?.games_played?.filter(b => b.unlocked).length || 0) +
                            (data.badges?.games_won?.filter(b => b.unlocked).length || 0);

                        const winrate = parseInt(user.win_rate) || 0;
                        document.getElementById('cardWinrate').textContent = winrate + '%';
                        document.getElementById('cardWinrateFill').style.width = winrate + '%';

                        const lastPlace = user.last_placement;
                        const lastPlaceEl = document.getElementById('cardLastPlace');
                        lastPlaceEl.textContent = lastPlace ?
                            (lastPlace === 1 ? '1er' : lastPlace === 2 ? '2ème' : lastPlace + 'ème') : '-';
                        lastPlaceEl.className = 'player-card-lastplace-value ' + getPlaceClass(lastPlace || 99);
                    }
                } catch (error) {
                    console.error('Erreur chargement profil:', error);
                    // Fallback sur données par défaut
                    document.getElementById('cardTitle').textContent = 'Novice';
                    document.getElementById('cardWins').textContent = '-';
                    document.getElementById('cardGames').textContent = '-';
                }
            }
        });

        item.addEventListener('mouseleave', () => {
            hideCardTimeout = setTimeout(() => {
                playerCard.classList.remove('visible');
            }, 150);
        });
    });
}

setupPlayerCardEvents();

// ============================================
// ANIMATION ABSORPTION - OUVERTURE LOBBY
// ============================================
const openLobbyBtn = document.getElementById('openLobbyBtn');
const absorptionCircle = document.getElementById('absorptionCircle');
const stateIdle = document.getElementById('stateIdle');
const stateLobby = document.getElementById('stateLobby');
const stateGame = document.getElementById('stateGame');
const recentPanel = document.getElementById('recentPanel');
const lastgamePanel = document.getElementById('lastgamePanel');
const bgText = document.getElementById('bgText');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

openLobbyBtn.addEventListener('click', async () => {

    try {
        const stateResponse = await fetch('/admin/game-state', { credentials: 'same-origin' });
        const state = await stateResponse.json();

        // Si lobby déjà ouvert, juste afficher l'UI
        if (state.isActive || state.phase === 'lobby') {
            console.log('Lobby déjà ouvert, affichage direct');
            showLobbyUI(state.players || []);
            return;
        }

        // Sinon, activer le lobby
        const response = await fetch('/admin/toggle-game', {
            method: 'POST',
            credentials: 'same-origin'
        });

        const data = await response.json();
        console.log('✅ Toggle lobby:', data);

        if (!data.isActive) {
            console.log('Lobby fermé, annulation animation');
            return;
        }
    } catch (error) {
        console.error('❌ Erreur:', error);
        return;
    }

    // Position du bouton
    const btnRect = openLobbyBtn.getBoundingClientRect();
    const centerX = btnRect.left + btnRect.width / 2;
    const centerY = btnRect.top + btnRect.height / 2;

    // Calculer la taille nécessaire pour couvrir tout l'écran
    const maxDim = Math.max(
        Math.hypot(centerX, centerY),
        Math.hypot(window.innerWidth - centerX, centerY),
        Math.hypot(centerX, window.innerHeight - centerY),
        Math.hypot(window.innerWidth - centerX, window.innerHeight - centerY)
    ) * 2;

    // Cacher les panneaux latéraux
    recentPanel.classList.add('hidden');
    lastgamePanel.classList.add('hidden');

    // Désactiver le pulse
    btnWrapper.classList.remove('pulse-active');

    // Animation d'absorption
    absorptionCircle.style.left = centerX + 'px';
    absorptionCircle.style.top = centerY + 'px';
    absorptionCircle.style.opacity = '1';

    anime({
        targets: absorptionCircle,
        width: [185, maxDim],
        height: [185, maxDim],
        duration: 800,
        easing: 'easeInOutQuart',
        complete: () => {
            // Cacher l'état idle
            stateIdle.style.display = 'none';
            
            // 🆕 Cacher le bouton déconnexion
            const logoutBtn = document.getElementById('headerLogoutBtn');
            if (logoutBtn) logoutBtn.style.display = 'none';

            // Afficher le lobby
            stateLobby.classList.add('active');
            stateLobby.style.pointerEvents = '';

            bgText.textContent = 'LOBBY';
            bgText.classList.add('lobby-active');
            statusDot.classList.add('active');
            statusText.textContent = 'Lobby ouvert';


            // Fade out du cercle
            anime({
                targets: absorptionCircle,
                opacity: [1, 0],
                duration: 400,
                easing: 'easeOutQuad',
                complete: () => {
                    absorptionCircle.style.width = '0';
                    absorptionCircle.style.height = '0';
                }
            });

            // Animation d'entrée du lobby
            anime({
                targets: stateLobby,
                opacity: [0, 1],
                duration: 500,
                easing: 'easeOutQuad'
            });

            anime({
                targets: '.lobby-stats',
                opacity: [0, 1],
                translateX: [-30, 0],
                duration: 600,
                delay: 200,
                easing: 'easeOutCubic'
            });

            anime({
                targets: '.lobby-actions-full',
                opacity: [0, 1],
                translateX: [30, 0],
                duration: 600,
                delay: 250,
                easing: 'easeOutCubic'
            });
        }
    });

    // Fade out des éléments idle
    anime({
        targets: ['.idle-main', '.idle-stats'],
        opacity: 0,
        duration: 300,
        easing: 'easeOutQuad'
    });
});

// ============================================
// GRILLE JOUEURS LOBBY
// ============================================
function populateLobbyPlayers() {
    const grid = document.getElementById('playersGridLobby');
    const countEl = document.getElementById('lobbyPlayerCount');
    grid.innerHTML = '';

    // Démarrer avec 0 joueurs pour test
    const startWithPlayers = []; // mockPlayers pour avoir des joueurs

    startWithPlayers.forEach((player, i) => {
        const card = document.createElement('div');
        card.className = 'player-card-mini';

        // En lobby : pas de stats affichées
        // En jeu : on affichera les coeurs ou points ici
        card.innerHTML = `
                    <div class="player-card-mini-badge"></div>
                    <div class="player-card-mini-name">${player}</div>
                    <div class="player-card-mini-stats">
                        <!-- Vide en lobby, rempli en jeu -->
                    </div>
                `;
        card.style.opacity = '0';
        grid.appendChild(card);

        anime({
            targets: card,
            opacity: [0, 1],
            translateY: [12, 0],
            delay: 300 + i * 30,
            duration: 350,
            easing: 'easeOutCubic'
        });
    });

    // Animer le compteur
    countEl.textContent = '0';
}

// ============================================
// FERMETURE LOBBY
// ============================================
document.getElementById('closeLobbyBtn').addEventListener('click', async () => {
    try {
        // Appeler le serveur pour fermer le lobby
        const response = await fetch('/admin/toggle-game', {
            method: 'POST',
            credentials: 'same-origin'
        });

        const data = await response.json();
        console.log('🔒 Fermeture lobby:', data);

        // Si le lobby est bien fermé, l'animation sera déclenchée par le socket 'game-deactivated'
        // Mais on peut aussi la lancer directement ici pour plus de réactivité
        if (!data.isActive) {
            closeLobbyUI();
        }
    } catch (error) {
        console.error('❌ Erreur fermeture lobby:', error);
    }
});

// ============================================
// ============================================
// PARAMÈTRES INLINE - Gestion des options
// ============================================

// Options génériques (vies, questions, timer, difficulté)
document.querySelectorAll('.setting-group:not(.mode-group):not(.series-group) .setting-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const group = btn.closest('.setting-group');
        const valueDisplay = group.querySelector('.setting-group-value');

        // Retirer active des autres
        group.querySelectorAll('.setting-option-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Mettre à jour la valeur affichée
        valueDisplay.textContent = btn.dataset.value;

        // Animation
        anime({
            targets: valueDisplay,
            scale: [1.15, 1],
            duration: 300,
            easing: 'easeOutBack'
        });

        // Si c'est le groupe des vies, mettre à jour les cartes joueurs
        if (group.classList.contains('lives-group')) {
            const lives = parseInt(btn.dataset.value) || 3;
            document.querySelectorAll('.player-card-mini-stat').forEach(stat => {
                stat.innerHTML = '❤️'.repeat(lives);
            });
        }
    });
});

// Mode de jeu (Vies/Points)
document.querySelectorAll('.mode-group .setting-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const group = btn.closest('.setting-group');
        const valueDisplay = document.getElementById('modeValue');
        const livesGroup = document.getElementById('livesGroup');
        const questionsGroup = document.getElementById('questionsGroup');
        const speedBonusGroup = document.getElementById('speedBonusGroup'); // 🆕

        group.querySelectorAll('.setting-option-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        valueDisplay.textContent = btn.dataset.value;

        // Mode Vies : afficher vies, cacher questions et speedBonus
        if (btn.dataset.mode === 'vie') {
            // Afficher vies
            livesGroup.style.display = 'block';
            livesGroup.classList.remove('hidden');
            anime({
                targets: livesGroup,
                opacity: [0, 1],
                translateY: [-10, 0],
                duration: 300,
                easing: 'easeOutCubic'
            });

            // Cacher questions
            anime({
                targets: questionsGroup,
                opacity: [1, 0],
                translateY: [0, -10],
                duration: 200,
                easing: 'easeInCubic',
                complete: () => {
                    questionsGroup.style.display = 'none';
                    questionsGroup.classList.add('hidden');
                }
            });

            // 🆕 Cacher speedBonus
            anime({
                targets: speedBonusGroup,
                opacity: [1, 0],
                translateY: [0, -10],
                duration: 200,
                easing: 'easeInCubic',
                complete: () => {
                    speedBonusGroup.style.display = 'none';
                    speedBonusGroup.classList.add('hidden');
                }
            });


            const lives = parseInt(document.querySelector('.lives-group .setting-option-btn.active')?.dataset.value) || 3;
            document.querySelectorAll('.player-card-mini-stat').forEach(stat => {
                stat.innerHTML = getLivesIconsHTML(selectedLivesIcon, lives, lives);
            });

        }
        // Mode Points : cacher vies, afficher questions et speedBonus
        else {
            // Cacher vies
            anime({
                targets: livesGroup,
                opacity: [1, 0],
                translateY: [0, -10],
                duration: 200,
                easing: 'easeInCubic',
                complete: () => {
                    livesGroup.style.display = 'none';
                    livesGroup.classList.add('hidden');
                }
            });

            // Afficher questions
            questionsGroup.style.display = 'block';
            questionsGroup.classList.remove('hidden');
            anime({
                targets: questionsGroup,
                opacity: [0, 1],
                translateY: [-10, 0],
                duration: 300,
                easing: 'easeOutCubic'
            });

            // 🆕 Afficher speedBonus
            speedBonusGroup.style.display = 'block';
            speedBonusGroup.classList.remove('hidden');
            anime({
                targets: speedBonusGroup,
                opacity: [0, 1],
                translateY: [-10, 0],
                duration: 300,
                easing: 'easeOutCubic'
            });

            document.querySelectorAll('.player-card-mini-stat').forEach(stat => {
                stat.innerHTML = '<span class="player-points">0</span>';
            });

        }
    });
});

// Dropdown séries - REMOVED, now using modal

// Timer slider
document.getElementById('timerSlider').addEventListener('input', (e) => {
    const value = e.target.value;
    document.getElementById('timerValue').textContent = value + 's';
});

// 🆕 Bonus rapidité (Oui/Non)
document.querySelectorAll('.speed-bonus-options .setting-option-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        const group = btn.closest('.setting-group');
        const valueDisplay = document.getElementById('speedBonusValue');
        
        group.querySelectorAll('.setting-option-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const isEnabled = btn.dataset.value === 'true';
        valueDisplay.textContent = isEnabled ? 'Oui' : 'Non';
        
        // Envoyer au serveur
        try {
            await fetch('/admin/set-speed-bonus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ enabled: isEnabled })
            });
            console.log(`⚡ Bonus rapidité: ${isEnabled ? 'Activé' : 'Désactivé'}`);
        } catch (error) {
            console.error('Erreur set-speed-bonus:', error);
        }
    });
});

// ============================================
// SERIES MODAL
// ============================================
const seriesTrigger = document.getElementById('seriesTrigger');
const seriesModal = document.getElementById('seriesModal');
const seriesModalOverlay = document.getElementById('seriesModalOverlay');
const seriesModalClose = document.getElementById('seriesModalClose');
const seriesSearchInput = document.getElementById('seriesSearchInput');
const seriesCards = document.querySelectorAll('.series-card:not(.soon)');
const allSeriesCards = document.querySelectorAll('.series-card');

function openSeriesModal() {
    seriesModal.classList.add('active');
    seriesModalOverlay.classList.add('active');
    seriesSearchInput.focus();
    
    // Synchroniser avec le filtre actuel (Overall par défaut)
    const currentValue = document.getElementById('seriesValue')?.textContent || 'Overall';
    
    document.querySelectorAll('.series-card').forEach(card => {
        card.classList.toggle('active', card.dataset.name === currentValue);
    });
}

function closeSeriesModal() {
    seriesModal.classList.remove('active');
    seriesModalOverlay.classList.remove('active');
    seriesSearchInput.value = '';
    filterSeries('');
}

seriesTrigger.addEventListener('click', openSeriesModal);
seriesModalOverlay.addEventListener('click', closeSeriesModal);
seriesModalClose.addEventListener('click', closeSeriesModal);

// Series card selection
seriesCards.forEach(card => {
    card.addEventListener('click', () => {
        // Remove active from all
        document.querySelectorAll('.series-card').forEach(c => c.classList.remove('active'));
        // Add active to clicked
        card.classList.add('active');

        // Update value display
        const seriesName = card.dataset.name;
        document.getElementById('seriesValue').textContent = seriesName;

        // Animate check
        anime({
            targets: card.querySelector('.series-card-check'),
            scale: [0.5, 1.2, 1],
            duration: 400,
            easing: 'easeOutBack'
        });

        // Close modal after short delay
        setTimeout(closeSeriesModal, 300);
    });
});

// Search filter
function filterSeries(query) {
    const lowerQuery = query.toLowerCase();
    allSeriesCards.forEach(card => {
        const name = card.dataset.name.toLowerCase();
        if (name.includes(lowerQuery)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

seriesSearchInput.addEventListener('input', (e) => {
    filterSeries(e.target.value);
});

// Close on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && seriesModal.classList.contains('active')) {
        closeSeriesModal();
    }
});



let playerIndex = 0;


// ============================================
// MODAL CARTE JOUEUR
// ============================================
const playerModalOverlay = document.getElementById('playerModalOverlay');
const playerModal = document.getElementById('playerModal');
const playerModalClose = document.getElementById('playerModalClose');

async function openPlayerModal(playerName, isChampion, playerTitle, twitchId = null) {
    const statGames = document.getElementById('statGames');
    const statWins = document.getElementById('statWins');
    const statWinrate = document.getElementById('statWinrate');

    const modalAvatar = document.getElementById('playerModalAvatar');
    if (modalAvatar) {
        modalAvatar.style.opacity = '0';
    }

    // Activer animation barres
    statGames.classList.add('loading');
    statWins.classList.add('loading');
    statWinrate.classList.add('loading');
    statGames.textContent = '';
    statWins.textContent = '';
    statWinrate.textContent = '';

    // Mettre à jour nom, badge, titre
    document.getElementById('playerModalName').textContent = playerName;
    document.getElementById('playerModalBadge').textContent = isChampion ? 'DERNIER VAINQUEUR' : '';
    document.getElementById('playerModalTitle').textContent = playerTitle || '';

    const modalCard = document.querySelector('.player-modal-card');
    modalCard.classList.toggle('champion', isChampion);

    // Afficher modal
    document.getElementById('playerModalOverlay').classList.add('active');
    document.getElementById('playerModal').classList.add('active');

    // 🔥 Temps minimum de loading pour voir l'animation
    const minLoadingTime = 600;
    const startTime = Date.now();

    let gamesValue = '0';
    let winsValue = '0';
    let winrateValue = '0%';

    // Charger stats
    if (twitchId) {
        try {
            const response = await fetch(`/profile/${twitchId}`);
            const data = await response.json();

            const modalAvatar = document.getElementById('playerModalAvatar');
            if (modalAvatar) {
                modalAvatar.src = data.user.avatar_url || 'cardpic.png';
                modalAvatar.onload = () => {
                    modalAvatar.style.opacity = '1';
                };
            }

            gamesValue = data.user.total_games_played || 0;
            winsValue = data.user.total_victories || 0;
            winrateValue = (parseInt(data.user.win_rate) || 0) + '%';
        } catch (e) {
            console.error('Erreur chargement profil:', e);
        }
    }

    // 🔥 Attendre le temps minimum avant d'afficher
    const elapsed = Date.now() - startTime;
    const remainingTime = Math.max(0, minLoadingTime - elapsed);

    setTimeout(() => {
        // Retirer loading avec animation
        statGames.classList.remove('loading');
        statWins.classList.remove('loading');
        statWinrate.classList.remove('loading');

        // Afficher les valeurs avec un léger délai entre chaque
        setTimeout(() => {
            statGames.textContent = gamesValue;
            anime({
                targets: statGames,
                scale: [0.5, 1],
                opacity: [0, 1],
                duration: 300,
                easing: 'easeOutBack'
            });
        }, 0);

        setTimeout(() => {
            statWins.textContent = winsValue;
            anime({
                targets: statWins,
                scale: [0.5, 1],
                opacity: [0, 1],
                duration: 300,
                easing: 'easeOutBack'
            });
        }, 100);

        setTimeout(() => {
            statWinrate.textContent = winrateValue;
            anime({
                targets: statWinrate,
                scale: [0.5, 1],
                opacity: [0, 1],
                duration: 300,
                easing: 'easeOutBack'
            });
        }, 200);

    }, remainingTime);
}

function closePlayerModal() {
    playerModalOverlay.classList.remove('active');
    playerModal.classList.remove('active');
}

playerModalClose.addEventListener('click', closePlayerModal);
playerModalOverlay.addEventListener('click', closePlayerModal);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && playerModal.classList.contains('active')) {
        closePlayerModal();
    }
});

// ============================================
// ÉTAT GAME - SYSTÈME COMPLET
// ============================================
let gameStarted = false;
let currentQuestion = 0;
let timerInterval = null;
let timerValue = 10;
let gameSettings = {
    mode: 'vie',
    lives: 3,
    timer: 10,
    totalQuestions: 20
};


// Joueurs en jeu
let gamePlayers = [];


function updateLobbyPlayers(players) {
    const grid = document.getElementById('playersGridLobby');
    const countEl = document.getElementById('lobbyPlayerCount');

    if (!grid) return;

    // Mettre à jour le compteur
    if (countEl) countEl.textContent = players.length;

    // Vider la grille
    grid.innerHTML = '';

    updateStartButton(players.length);

    // Si pas de joueurs, juste laisser vide
    if (players.length === 0) return;

    // Sinon afficher les joueurs
    players.forEach((player, index) => {
        const card = document.createElement('div');
        card.className = 'player-card-mini';

        // Gérer les deux formats de données
        const isChampion = player.isChampion || player.isLastGlobalWinner;
        const twitchId = player.twitch_id || player.twitchId;

        if (isChampion) card.classList.add('champion');

        const currentLives = parseInt(document.querySelector('.lives-group .setting-option-btn.active')?.dataset.value) || 3;
        const currentMode = document.querySelector('.mode-group .setting-option-btn.active')?.dataset.mode || 'vie';

        card.dataset.twitchId = twitchId || '';

        card.innerHTML = `
        <div class="player-card-mini-badge"></div>
        <div class="player-card-mini-name">${player.username}</div>
        <div class="player-card-mini-title">${player.title || 'Novice'}</div>
        <div class="player-card-mini-separator"></div>
        <div class="player-card-mini-stat">
            ${currentMode === 'vie' ? getLivesIconsHTML(selectedLivesIcon, currentLives, currentLives) : '<span class="player-points">0</span>'}
        </div>
        <button class="player-card-mini-kick" title="Exclure ${player.username}">
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
    `;

        // ===== CLIC SUR BOUTON KICK =====
        const kickBtn = card.querySelector('.player-card-mini-kick');
        if (kickBtn) {
            kickBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                kickPlayer(player.username, twitchId, card);
            });
        }

        // Clic pour ouvrir la modal
        card.addEventListener('click', (e) => {
            if (e.target.closest('.player-card-mini-kick')) return;
            openPlayerModal(player.username, isChampion, player.title || 'Novice', twitchId);
        });

        card.style.opacity = '0';
        card.style.cursor = 'pointer';
        grid.appendChild(card);

        anime({
            targets: card,
            opacity: [0, 1],
            translateY: [12, 0],
            delay: index * 30,
            duration: 350,
            easing: 'easeOutCubic'
        });
    });

    updateStartButton(players.length);


}

// Fonction pour vérifier si le bouton démarrer doit être actif
function updateStartButton(playerCount) {
    const startBtn = document.getElementById('startGameBtn');
    if (!startBtn) return;

    if (playerCount >= 1) {
        startBtn.classList.remove('disabled');
    } else {
        startBtn.classList.add('disabled');
    }
}

// Récupérer les paramètres actuels
function getGameSettings() {
    gameSettings.mode = document.getElementById('modeValue').textContent.toLowerCase().includes('vie') ? 'vie' : 'point';
    gameSettings.lives = parseInt(document.getElementById('livesValue')?.textContent || 3);
    gameSettings.timer = parseInt(document.getElementById('timerValue').textContent);
    gameSettings.answersCount = parseInt(document.getElementById('answersValue').textContent);  // AJOUTER
}

// Créer les cartes joueurs en mode jeu (style lobby)
function createGamePlayerCards() {
    const lobbyCards = document.querySelectorAll('.player-card-mini');
    const gameGrid = document.getElementById('playersGridGame');
    gameGrid.innerHTML = '';
    gamePlayers = [];

    lobbyCards.forEach((card, index) => {
        const name = card.querySelector('.player-card-mini-name').textContent;
        const isChampion = card.classList.contains('champion');
        const titleEl = card.querySelector('.player-card-mini-title');
        const playerTitle = titleEl ? titleEl.textContent : '';
        const twitchId = card.dataset.twitchId || '';

        const playerData = {
            name: name,
            twitchId: twitchId,
            lives: gameSettings.lives,
            points: 0,
            isChampion: isChampion,
            title: playerTitle,
            eliminated: false,
            hasAnswered: false,
            answer: null
        };
        gamePlayers.push(playerData);

        const gameCard = document.createElement('div');
        gameCard.className = 'player-card-game' + (isChampion ? ' champion' : '');
        gameCard.dataset.playerIndex = index;
        gameCard.dataset.lives = gameSettings.lives;
        gameCard.dataset.twitchId = twitchId || '';


        if (gameSettings.mode === 'vie') {
            const livesHtml = getLivesIconsHTML(selectedLivesIcon, gameSettings.lives, gameSettings.lives);
            gameCard.innerHTML = `
                <div class="answered-indicator"></div>
                <div class="player-card-game-name">${name}</div>
                <div class="player-card-game-lives">${livesHtml}</div>
                <div class="player-card-game-answer-overlay">
                    <span class="answer-text-display no-answer"><img src="zzzzz.png" alt="AFK" class="afk-icon"></span>
                </div>
                <button class="player-card-game-kick" title="Exclure ${name}">
                    <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            `;
        } else {
            gameCard.innerHTML = `
                <div class="answered-indicator"></div>
                <div class="player-card-game-name">${name}</div>
                <div class="player-card-game-points">0</div>
                <div class="player-card-game-answer-overlay">
                    <span class="answer-text-display no-answer"><img src="zzzzz.png" alt="AFK" class="afk-icon"></span>
                </div>
                <button class="player-card-game-kick" title="Exclure ${name}">
                    <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            `;
        }

        // ===== CLIC SUR BOUTON KICK =====
        const kickBtn = gameCard.querySelector('.player-card-game-kick');
        if (kickBtn) {
            kickBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                kickPlayer(name, twitchId, gameCard);
            });
        }

        // ===== CLIC SUR CARTE JOUEUR =====
        gameCard.style.cursor = 'pointer';
        gameCard.addEventListener('click', (e) => {
            // Empêcher le clic si on survole l'overlay ou le bouton kick
            if (e.target.closest('.player-card-game-answer-overlay')) return;
            if (e.target.closest('.player-card-game-kick')) return;

            openPlayerModal(name, isChampion, playerTitle, twitchId);
        });

        gameGrid.appendChild(gameCard);
    });
}



function updateTimerDisplay() {
    const display = Math.max(0, timerValue); // Protection contre -1
    document.getElementById('timerText').textContent = display;

    const progress = document.getElementById('timerProgress');
    const circumference = 2 * Math.PI * 22;
    const offset = circumference * (1 - display / gameSettings.timer);
    progress.style.strokeDashoffset = offset;
}





//QUESTION SUIVANTE
document.getElementById('nextQuestionBtn').addEventListener('click', async () => {
    const btn = document.getElementById('nextQuestionBtn');
    if (btn.classList.contains('loading')) return;

    btn.classList.add('loading');
    hideGameCloseBtn();

    const questionWrapper = document.getElementById('gameQuestionWrapper');
    const mainPanel = document.getElementById('gameMainPanel');
    const questionActions = document.getElementById('questionActions');

    // 🔥 1. CACHER le contenu IMMÉDIATEMENT
    const questionText = document.getElementById('questionText');
    const answersGrid = document.getElementById('answersGrid');
    const questionBadges = document.querySelector('.question-badges-row');

    if (questionText) questionText.style.opacity = '0';
    if (answersGrid) answersGrid.style.opacity = '0';
    if (questionBadges) questionBadges.style.opacity = '0';

    // 🔥 2. LANCER l'animation IMMÉDIATEMENT
    questionActions.classList.remove('visible');
    questionWrapper.classList.add('closing');
    mainPanel.classList.add('closing');

    // 🔥 3. PUIS appeler le serveur (en parallèle)
    try {
        const response = await fetch('/admin/next-question', {
            method: 'POST',
            credentials: 'same-origin'
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Erreur:', data.error);
            if (data.blocked) {
                console.log('⏳ Timer en cours:', data.timeRemaining);
            }
            // Restaurer si erreur
            if (questionText) questionText.style.opacity = '1';
            if (answersGrid) answersGrid.style.opacity = '1';
            if (questionBadges) questionBadges.style.opacity = '1';
            questionWrapper.classList.remove('closing');
            mainPanel.classList.remove('closing');
            btn.classList.remove('loading');
            return;
        }

        // La nouvelle question arrivera via socket 'new-question'

    } catch (error) {
        console.error('❌ Erreur:', error);
        btn.classList.remove('loading');
    }

    // 🔥 4. Nettoyer après l'animation
    setTimeout(() => {
        questionWrapper.classList.remove('closing', 'shifted');
        mainPanel.classList.remove('visible', 'closing');
        btn.classList.remove('loading');
    }, 400);
});





// Tab switching pour le panel - DÉLÉGATION D'ÉVÉNEMENTS
document.addEventListener('click', (e) => {
    const tab = e.target.closest('.panel-tab');
    if (!tab) return;

    const targetTab = tab.dataset.tab;
    if (!targetTab) return;

    // Update tab buttons
    document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Update tab content
    document.querySelectorAll('.panel-tab-content').forEach(content => {
        content.classList.remove('active');
    });

    const tabContent = document.getElementById('tab' + targetTab.charAt(0).toUpperCase() + targetTab.slice(1));
    if (tabContent) tabContent.classList.add('active');
});

// Transition vers l'état Game
function transitionToGame() {
    const stateLobby = document.getElementById('stateLobby');
    const stateGame = document.getElementById('stateGame');
    const bgText = document.querySelector('.bg-text');
    const overlay = document.getElementById('gameStartOverlay');
    const startText = document.getElementById('gameStartText');
    const statusPill = document.querySelector('.status-pill');
    const questionWrapper = document.getElementById('gameQuestionWrapper');

    const startTexts = [
        "READY.. FIGHT !",
        "GO BEYOND !",
        "GAME ON !",
        "戦い !",
        "戦闘開始 !",
        "C'EST PARTI !",
        "勝負だ !",
        "SHOWTIME !"
    ];
    const randomText = startTexts[Math.floor(Math.random() * startTexts.length)];
    if (startText) startText.textContent = randomText;


    // Récupérer les paramètres
    getGameSettings();


    setStatsMode(gameSettings.mode === 'point' ? 'points' : 'vie');

    // Créer les cartes joueurs
    createGamePlayerCards();

    // Reset complet du wrapper
    // 🔥 RESET COMPLET du wrapper + panel + actions
    questionWrapper.className = 'game-question-wrapper';
    questionWrapper.removeAttribute('style');

    const questionPanel = document.getElementById('gameQuestionPanel');
    if (questionPanel) questionPanel.removeAttribute('style');

    const mainPanel = document.getElementById('gameMainPanel');
    if (mainPanel) {
        mainPanel.className = 'game-main-panel';
        mainPanel.removeAttribute('style');
    }

    const questionActions = document.getElementById('questionActions');
    if (questionActions) {
        questionActions.className = 'question-actions';
        questionActions.removeAttribute('style');
    }

    const panelMiniActions = document.querySelector('.panel-mini-actions');
    if (panelMiniActions) panelMiniActions.removeAttribute('style');

    // Mettre à jour le header status
    if (statusPill) {
        statusPill.classList.add('game-mode');
        document.getElementById('statusText').textContent = 'En partie';
    }
    
    // 🆕 Cacher le bouton déconnexion
    const logoutBtn = document.getElementById('headerLogoutBtn');
    if (logoutBtn) logoutBtn.style.display = 'none';

    // 1. Afficher l'overlay GAME START
    overlay.classList.add('active');

    // 2. Animation du texte GAME START
    anime({
        targets: startText,
        keyframes: [
            { scale: 0.5, opacity: 0 },
            { scale: 1.1, opacity: 1 },
            { scale: 1, opacity: 1 },
            { scale: 20, opacity: 0 }
        ],
        duration: 2000,
        easing: 'easeInOutQuad',
        complete: () => {
            overlay.classList.remove('active');
            startText.style.transform = '';
            startText.style.opacity = '';
        }
    });

    // 3. Transition du lobby vers le jeu
    setTimeout(() => {
        stateLobby.style.opacity = '0';
        stateLobby.style.transition = 'opacity 0.4s';

        setTimeout(() => {
            stateLobby.classList.remove('active');
            stateLobby.style.opacity = '';
            stateLobby.style.transition = '';

            // Afficher state game
            stateGame.classList.add('active');
            stateGame.style.opacity = '1';
            stateGame.style.pointerEvents = '';

            bgText.classList.remove('lobby-active');
            bgText.classList.add('game-active');
            bgText.textContent = 'GAME';

            // Lancer l'animation d'entrée
            requestAnimationFrame(() => {
                questionWrapper.classList.add('entering');
            });

            // Après l'animation, passer en état visible
            questionWrapper.addEventListener('animationend', function handler(e) {
                if (e.animationName !== 'questionEnter') return;
                questionWrapper.removeEventListener('animationend', handler);
                questionWrapper.classList.remove('entering');
                questionWrapper.classList.add('visible');
            });

        }, 400);
    }, 1500);

    document.getElementById('gameLogsToggle')?.classList.add('active');


}

// Bouton Démarrer
document.getElementById('startGameBtn').addEventListener('click', async () => {
    const startBtn = document.getElementById('startGameBtn');

    // Protection double-clic
    if (startBtn.classList.contains('disabled')) return;
    if (startBtn.classList.contains('loading')) return;  // AJOUTER
    if (gameStarted) return;

    // Bloquer immédiatement AVANT l'appel API
    startBtn.classList.add('loading');  // AJOUTER

    try {
        const response = await fetch('/admin/start-game', {
            method: 'POST',
            credentials: 'same-origin'
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Erreur démarrage:', data.error);
            alert(data.error || 'Impossible de démarrer la partie');
            startBtn.classList.remove('loading');  // AJOUTER - débloquer si erreur
            return;
        }

        console.log('✅ Partie démarrée:', data);
        gameStarted = true;

        // Changer le texte du bouton
        startBtn.querySelector('.action-full-label').textContent = 'En cours...';
        startBtn.querySelector('.action-full-sub').textContent = 'Partie lancée';
        startBtn.classList.add('started');

    } catch (error) {
        console.error('❌ Erreur:', error);
        alert('Erreur de connexion au serveur');
        startBtn.classList.remove('loading');  // AJOUTER - débloquer si erreur
    }
});

let autoMode = false;

document.getElementById('autoToggleBtn').addEventListener('click', async function () {
    const btn = this;
    const icon = btn.querySelector('svg');

    try {
        const response = await fetch('/admin/toggle-auto-mode', {
            method: 'POST',
            credentials: 'same-origin'
        });

        const data = await response.json();

        if (data.success) {
            autoMode = data.autoMode;

            if (autoMode) {
                btn.classList.add('active');
                // Icône pause
                icon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';

                // Désactiver le bouton suivante
                const nextBtn = document.getElementById('nextQuestionBtn');
                if (nextBtn) {
                    nextBtn.classList.add('auto-disabled');
                    nextBtn.disabled = true;
                }

                // Si on est déjà sur les résultats, déclencher le mode auto
                const questionActions = document.getElementById('questionActions');
                if (questionActions && questionActions.classList.contains('visible')) {
                    fetch('/admin/trigger-auto-next', {
                        method: 'POST',
                        credentials: 'same-origin'
                    });
                }

            } else {
                btn.classList.remove('active');
                // Icône play
                icon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';

                // Réactiver le bouton suivante
                const nextBtn = document.getElementById('nextQuestionBtn');
                if (nextBtn) {
                    nextBtn.classList.remove('auto-disabled');
                    nextBtn.disabled = false;
                }
            }

            // Animation feedback
            anime({
                targets: btn,
                scale: [1, 1.1, 1],
                duration: 300,
                easing: 'easeOutBack'
            });
        }
    } catch (error) {
        console.error('❌ Erreur toggle auto mode:', error);
    }
});

// Dans revealAnswers(), ajouter à la fin pour l'auto-mode :
if (autoMode) {
    setTimeout(() => {
        document.getElementById('nextQuestionBtn').click();
    }, 3000); // 3 secondes avant question suivante
}


// Ajouter APRÈS createGamePlayerCards() ou dans l'initialisation
// Utiliser la délégation d'événement sur la grille plutôt que sur chaque carte

document.getElementById('playersGridGame').addEventListener('click', (e) => {
    const card = e.target.closest('.player-card-game');
    if (!card) return;

    // 🔥 Empêcher le double appel
    if (e.target.closest('.player-card-game-answer-overlay')) return;

    const playerIndex = parseInt(card.dataset.playerIndex);
    const player = gamePlayers[playerIndex];

    if (player) {
        console.log('Clic sur:', player.name);
        openPlayerModal(player.name, player.isChampion, player.title || '', player.twitchId);  // 🔥 AJOUTER twitchId
    }
});


// ============================================
// MODAL SIGNALEMENT
// ============================================
const reportModal = document.getElementById('reportModal');
const reportModalOverlay = document.getElementById('reportModalOverlay');

function openReportModal() {
    const reportModal = document.getElementById('reportModal');
    const reportModalOverlay = document.getElementById('reportModalOverlay');

    // Utiliser les vraies données de la question actuelle
    if (currentQuestionData) {
        document.getElementById('reportQuestionText').textContent = currentQuestionData.question;
    } else {
        document.getElementById('reportQuestionText').textContent = 'Aucune question en cours';
    }

    reportModal.classList.add('active');
    reportModalOverlay.classList.add('active');
}

function closeReportModal() {
    reportModal.classList.remove('active');
    reportModalOverlay.classList.remove('active');
}

// Event listeners
document.querySelector('.mini-action-btn.report').addEventListener('click', openReportModal);
document.getElementById('reportModalClose').addEventListener('click', closeReportModal);
document.getElementById('reportCancelBtn').addEventListener('click', closeReportModal);
reportModalOverlay.addEventListener('click', closeReportModal);

document.getElementById('reportSubmitBtn').addEventListener('click', async () => {
    const reason = document.getElementById('reportReason').value;
    const btn = document.getElementById('reportSubmitBtn');

    if (!currentQuestionData) {
        console.error('Aucune question à signaler');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Envoi...';

    try {
        const response = await fetch('/admin/report-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({
                questionId: currentQuestionData.questionId || null,  // ← questionId pas id
                questionText: currentQuestionData.question,
                difficulty: currentQuestionData.difficulty || null,
                reason: reason
            })
        });

        const data = await response.json();

        if (data.success) {
            btn.textContent = 'Envoyé ✓';
            btn.style.background = 'rgba(0, 255, 136, 0.2)';
            btn.style.borderColor = 'rgba(0, 255, 136, 0.5)';
            btn.style.color = 'var(--green)';

            setTimeout(() => {
                closeReportModal();
                setTimeout(() => {
                    btn.textContent = 'Signaler';
                    btn.style.background = '';
                    btn.style.borderColor = '';
                    btn.style.color = '';
                    btn.disabled = false;
                }, 300);
            }, 800);
        } else {
            throw new Error(data.error || 'Erreur inconnue');
        }

    } catch (error) {
        console.error('❌ Erreur signalement:', error);

        btn.textContent = 'Erreur ✗';
        btn.style.background = 'rgba(255, 59, 92, 0.2)';
        btn.style.borderColor = 'rgba(255, 59, 92, 0.5)';
        btn.style.color = 'var(--red)';

        setTimeout(() => {
            btn.textContent = 'Signaler';
            btn.style.background = '';
            btn.style.borderColor = '';
            btn.style.color = '';
            btn.disabled = false;
        }, 1500);
    }
});


// Fermer avec Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && reportModal.classList.contains('active')) {
        closeReportModal();
    }
});

const gameCloseBtn = document.getElementById('gameCloseBtn');

function showGameCloseBtn() {
    if (gameCloseBtn) gameCloseBtn.classList.add('visible');
}

function hideGameCloseBtn() {
    if (gameCloseBtn) gameCloseBtn.classList.remove('visible');
}



// Configuration des couleurs
const COLORS = {
    correct: '#00ff88',
    wrong: '#ff3b5c',
    timeout: '#f0c040',
    lives3: '#00ff88',
    lives2: '#f0c040',
    lives1: '#ff9f43',
    lives0: '#6b7280'
};

/**
 * Met à jour le pie chart des réponses avec animation
 * @param {number} correct - Nombre de bonnes réponses
 * @param {number} wrong - Nombre de mauvaises réponses
 * @param {number} timeout - Nombre de non-réponses
 */
function updateResponsesPie(correct, wrong, timeout) {
    const total = correct + wrong + timeout;
    const pie = document.getElementById('responsesPie');

    if (total === 0) {
        pie.style.background = 'rgba(255, 255, 255, 0.08)';
    } else {
        const correctAngle = (correct / total) * 360;
        const wrongAngle = correctAngle + (wrong / total) * 360;

        pie.style.setProperty('--pie-color-1', COLORS.correct);
        pie.style.setProperty('--pie-color-2', COLORS.wrong);
        pie.style.setProperty('--pie-color-3', COLORS.timeout);

        animatePieAngles(pie, correctAngle, wrongAngle);
    }

    document.getElementById('correctCount').textContent = correct;
    document.getElementById('wrongCount').textContent = wrong;
    document.getElementById('timeoutCount').textContent = timeout;
}

function updateLivesPie(lives3, lives2, lives1, lives0) {
    const total = lives3 + lives2 + lives1 + lives0;
    const pie = document.getElementById('livesPie');

    if (total === 0) {
        pie.style.background = 'rgba(255, 255, 255, 0.08)';
    } else {
        const angle1 = (lives3 / total) * 360;
        const angle2 = angle1 + (lives2 / total) * 360;
        const angle3 = angle2 + (lives1 / total) * 360;

        pie.style.background = `conic-gradient(
                    ${COLORS.lives3} 0deg ${angle1}deg,
                    ${COLORS.lives2} ${angle1}deg ${angle2}deg,
                    ${COLORS.lives1} ${angle2}deg ${angle3}deg,
                    ${COLORS.lives0} ${angle3}deg 360deg
                )`;
    }

    document.getElementById('lives3Count').textContent = lives3;
    document.getElementById('lives2Count').textContent = lives2;
    document.getElementById('lives1Count').textContent = lives1;
    document.getElementById('lives0Count').textContent = lives0;
}

/**
 * Anime les angles du pie chart progressivement
 */
function animatePieAngles(pie, targetAngle1, targetAngle2) {
    let currentAngle1 = 0;
    let currentAngle2 = 0;
    const duration = 600;
    const startTime = performance.now();

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        currentAngle1 = targetAngle1 * eased;
        currentAngle2 = targetAngle2 * eased;

        pie.style.setProperty('--pie-angle-1', `${currentAngle1}deg`);
        pie.style.setProperty('--pie-angle-2', `${currentAngle2}deg`);

        if (progress < 1) requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
}

/**
 * Met à jour le joueur le plus rapide
 */
function updateFastestPlayer(name, timeMs) {
    document.getElementById('fastestName').textContent = name || '-';
    document.getElementById('fastestTime').textContent = timeMs ? (timeMs / 1000).toFixed(2) + 's' : '-';
}

/**
 * Configure le mode (points ou vie)
 * @param {string} mode - 'points' ou 'vie'
 */
function setStatsMode(mode) {
    const container = document.querySelector('.stats-charts-container');
    container.classList.toggle('mode-points', mode === 'points');
}

/**
 * Réinitialise les stats avec animation
 */
function resetStats() {
    // Réinitialiser les pies
    const pies = document.querySelectorAll('.pie-chart');
    pies.forEach(pie => {
        pie.style.animation = 'none';
        pie.offsetHeight; // Trigger reflow
        pie.style.animation = null;
    });

    // Réinitialiser les légendes
    const legends = document.querySelectorAll('.legend-item');
    legends.forEach(item => {
        item.style.animation = 'none';
        item.offsetHeight;
        item.style.animation = null;
    });

    // Valeurs à zéro avec animation
    updateResponsesPie(0, 0, 0);
    updateLivesPie(0, 0, 0, 0);
    updateFastestPlayer(null, null);
}


// ============================================
//    WINNER SCREEN - JAVASCRIPT
// ============================================

/**
 * Créer les rayons lumineux
 */
function createWinnerRays() {
    const raysContainer = document.getElementById('winnerRays');
    if (!raysContainer) return;
    raysContainer.innerHTML = '';
    for (let i = 0; i < 12; i++) {
        const ray = document.createElement('div');
        ray.className = 'winner-ray';
        ray.style.transform = `rotate(${i * 30}deg)`;
        raysContainer.appendChild(ray);
    }
}

/**
 * Créer les particules flottantes
 */
function createWinnerParticles() {
    const container = document.getElementById('winnerParticles');
    if (!container) return;
    container.innerHTML = '';

    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'w-particle';
        particle.style.left = Math.random() * 100 + '%'; // ✅ Tout l'écran
        particle.style.top = (Math.random() * 80 + 20) + '%';
        particle.style.width = (Math.random() * 5 + 2) + 'px';
        particle.style.height = particle.style.width;
        container.appendChild(particle);
    }
}

/**
 * Créer les confettis
 */
function createWinnerConfetti() {
    const overlay = document.getElementById('winnerOverlay');
    if (!overlay) return;
    const colors = ['#f0c040', '#ffd700', '#00ff88', '#ff3b5c', '#64b4ff', '#fff'];
    const shapes = ['square', 'circle', 'ribbon'];

    for (let i = 0; i < 80; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti ' + shapes[Math.floor(Math.random() * shapes.length)];
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animation = `confettiFall ${Math.random() * 3 + 4}s linear ${Math.random() * 2}s forwards`;
        overlay.appendChild(confetti);
    }
}

/**
 * Animation des particules
 */
function animateWinnerParticles() {
    particles.forEach((p, i) => {
        setTimeout(() => {
            p.style.animationDuration = duration + 's';
            p.classList.add('active');  /* Ajoute la classe qui rend visible + anime */
        }, i * 30);
    });
}

/**
 * Générer la grille de joueurs
 */
function generateWinnerPlayersGrid(players, winnerName, gameMode = 'lives', livesIcon = 'heart') {
    const grid = document.getElementById('winnerGridInner');
    if (!grid) return;
    grid.innerHTML = '';

    const sorted = [...players].sort((a, b) => {
        if (a.isWinner) return -1;
        if (b.isWinner) return 1;

        // 🔥 TRIER SELON LE MODE
        if (gameMode === 'points') {
            return (b.points || 0) - (a.points || 0);
        } else {
            if (a.status === 'eliminated' && b.status !== 'eliminated') return 1;
            if (b.status === 'eliminated' && a.status !== 'eliminated') return -1;
            return (b.lives || 0) - (a.lives || 0);
        }
    });

    const medals = ['🥇', '🥈', '🥉'];
    const medalClasses = ['gold', 'silver', 'bronze'];

    sorted.forEach((player, index) => {
        const card = document.createElement('div');
        const playerName = player.username || player.name || 'Joueur';
        const playerLives = player.lives ?? player.livesRemaining ?? 0;
        const playerPoints = player.points || 0;

        card.className = `winner-player-card ${player.status || ''}`;
        if (player.isWinner) card.classList.add('winner');

        // 🔥 ÉLIMINÉ seulement en mode vie
        if (gameMode === 'lives' && playerLives <= 0 && !player.isWinner) {
            card.classList.add('eliminated');
        }

        let medalHtml = '';
        if (index < 3) {
            card.classList.add('has-medal');
            medalHtml = `<span class="winner-player-medal ${medalClasses[index]}">${medals[index]}</span>`;
        }

        // 🔥 AFFICHAGE SELON LE MODE
        let statsHtml = '';
        if (gameMode === 'points') {
            statsHtml = `<div class="winner-player-points">${playerPoints.toLocaleString()} pts</div>`;
        } else {
            statsHtml = `<div class="winner-player-lives">${getLivesIconsHTML(livesIcon, playerLives, gameSettings.lives)}</div>`;
        }

        card.innerHTML = `
            ${medalHtml}
            <div class="winner-player-name">${playerName}</div>
            ${statsHtml}
        `;

        grid.appendChild(card);
    });
}


function showWinner(name, livesOrPoints, totalWins, questions, duration, playersData, topPlayers = [], gameMode = 'lives') {
    const overlay = document.getElementById('winnerOverlay');
    if (!overlay) return;

    // === ANIMATION DE SORTIE DES PANELS ===
    const questionWrapper = document.getElementById('gameQuestionWrapper');
    const mainPanel = document.getElementById('gameMainPanel');
    const questionActions = document.getElementById('questionActions');

    if (questionActions) questionActions.classList.add('winner-exit');
    if (questionWrapper) questionWrapper.classList.add('winner-exit');
    if (mainPanel) mainPanel.classList.add('winner-exit');

    if (questionWrapper) questionWrapper.style.display = 'none';
    if (mainPanel) mainPanel.style.display = 'none';
    if (questionActions) questionActions.style.display = 'none';

    const playerCount = Array.isArray(playersData) ? playersData.length : playersData;
    const players = Array.isArray(playersData) ? playersData : [];


    // Mettre à jour les données
    document.getElementById('winnerName').textContent = name;
    document.getElementById('winnerName').setAttribute('data-name', name);

    document.getElementById('winnerName').classList.remove('long', 'very-long', 'ultra-long');
    if (name.length > 20) {
        document.getElementById('winnerName').classList.add('ultra-long');
    } else if (name.length > 14) {
        document.getElementById('winnerName').classList.add('very-long');
    } else if (name.length > 10) {
        document.getElementById('winnerName').classList.add('long');
    }

    // 🔥 ADAPTER SELON LE MODE
    const winnerLivesEl = document.getElementById('winnerLives');
    const livesLabelEl = winnerLivesEl?.closest('.winner-stat')?.querySelector('.winner-stat-label');

    if (gameMode === 'points') {
        winnerLivesEl.innerHTML = `<span class="points-icon">★</span> ${livesOrPoints.toLocaleString()}`;
        if (livesLabelEl) livesLabelEl.textContent = 'Points';
    } else {
        winnerLivesEl.innerHTML = `<span class="heart">❤</span> ${livesOrPoints}`;
        if (livesLabelEl) livesLabelEl.textContent = 'Vies restantes';
    }

    document.getElementById('winnerTotalWins').textContent = totalWins;
    document.getElementById('infoQuestions').textContent = questions;
    document.getElementById('infoDuration').textContent = duration;
    document.getElementById('infoPlayers').textContent = playerCount;

    // 🔥 PASSER LE MODE à la grille
    generateWinnerPlayersGrid(players, name, gameMode, selectedLivesIcon);


    // Générer le Top 10
    if (topPlayers && topPlayers.length > 0) {
        generateWinnerTop10(topPlayers);
    }

    // Préparer les éléments
    createWinnerRays();
    createWinnerParticles();

    // Afficher l'overlay
    overlay.classList.add('active');


    // ========== SÉQUENCE D'ANIMATIONS (délai initial 1.5s) ==========

    // 1. Rayons lumineux
    setTimeout(() => {
        document.getElementById('winnerRays').style.opacity = '1';
        document.getElementById('winnerRays').style.transition = 'opacity 1s ease';
    }, 900);

    // 2. Container vainqueur (centré d'abord)
    setTimeout(() => {
        document.getElementById('winnerContainer').classList.add('visible');
    }, 1000);

    // 3. Nom du gagnant
    setTimeout(() => {
        document.getElementById('winnerName').classList.add('visible');
    }, 1200);

    // 4. Ligne décorative
    setTimeout(() => {
        document.getElementById('winnerLine').classList.add('visible');
    }, 1400);

    // 5. Stats
    setTimeout(() => {
        document.getElementById('winnerStats').classList.add('visible');
    }, 1550);

    // 6. Infos partie
    setTimeout(() => {
        document.getElementById('winnerGameInfo').classList.add('visible');
    }, 1700);

    // 7. Confettis
    setTimeout(() => {
        createWinnerConfetti();
        animateWinnerParticles();
    }, 1300);

    // 8. Après un moment centré, décaler le vainqueur vers la gauche
    setTimeout(() => {
        document.getElementById('winnerContainer').classList.add('shifted');
    }, 3600);

    // 9. Puis afficher la grille
    setTimeout(() => {
        document.getElementById('winnerPlayersGrid').classList.add('visible');
    }, 3800);

    // 10. Bouton fermer lobby
    setTimeout(() => {
        document.getElementById('winnerCloseLobby').classList.add('visible');
    }, 4300);

    // 11. Top 10 apparaît 1s après la grille
    setTimeout(() => {
        document.getElementById('winnerTop10').classList.add('visible');

        // Animation stagger des items
        const items = document.querySelectorAll('.winner-top10-item');
        items.forEach((item, i) => {
            setTimeout(() => {
                item.classList.add('visible');
            }, i * 60);
        });
    }, 4800);
}

/**
 * Fermer l'écran de victoire
 */
async function closeWinner() {
    const overlay = document.getElementById('winnerOverlay');
    if (!overlay) return;

    try {
        // Fermer le lobby côté serveur
        await fetch('/admin/toggle-game', {
            method: 'POST',
            credentials: 'same-origin'
        });
    } catch (error) {
        console.error('❌ Erreur fermeture lobby:', error);
    }

    // Animation de fermeture
    overlay.style.opacity = '0';

    setTimeout(() => {
        overlay.classList.remove('active');
        overlay.style.opacity = '';

        // Reset des éléments winner
        document.getElementById('winnerRays').style.opacity = '0';
        document.getElementById('winnerContainer').classList.remove('visible', 'shifted');
        document.getElementById('winnerName').classList.remove('visible');
        document.getElementById('winnerLine').classList.remove('visible');
        document.getElementById('winnerStats').classList.remove('visible');
        document.getElementById('winnerGameInfo').classList.remove('visible');
        document.getElementById('winnerPlayersGrid').classList.remove('visible');
        document.getElementById('winnerCloseLobby').classList.remove('visible');
        document.getElementById('winnerTop10').classList.remove('visible');
        document.querySelectorAll('.winner-top10-item').forEach(item => {
            item.classList.remove('visible');
        });

        // Supprimer confettis
        document.querySelectorAll('.confetti').forEach(c => c.remove());

        // Retour à idle
        returnToIdle();

    }, 500);
}


// Init rayons au chargement
document.addEventListener('DOMContentLoaded', createWinnerRays);


// ============================================
// SYSTÈME DE LOGS EN DIRECT
// ============================================

const LOG_ICONS = {
    answered: '✓',
    bonus_5050: '⚡',
    bonus_joker: '🃏',
    bonus_shield: '🛡️',
    bonus_x2: '✕2',
    disconnected: '⚠',
    reconnected: '↩',
    kicked: '🚫'
};

let logsVisible = true;


function addGameLog(type, playerName = null, extraData = null) {
    const logsList = document.getElementById('gameLogsList');
    if (!logsList) return;

    const log = document.createElement('div');
    log.className = `game-log-item ${type}`;

    let icon = LOG_ICONS[type] || '';
    let text = '';

    switch (type) {
        // === JOUEURS ===
        case 'join':
            text = `<span class="player-name">${playerName}</span> a rejoint`;
            break;
        case 'leave':
            text = `<span class="player-name">${playerName}</span> a quitté`;
            break;
        case 'disconnected':
            text = `<span class="player-name">${playerName}</span> déconnecté`;
            break;
        case 'reconnected':
            text = `<span class="player-name">${playerName}</span> reconnecté`;
            break;
        case 'answered':
            text = `<span class="player-name">${playerName}</span> a répondu`;
            break;
        case 'eliminated':
            text = `<span class="player-name">${playerName}</span> éliminé`;
            log.classList.add('eliminated');
            break;
        case 'kicked':
            text = `<span class="player-name">${playerName}</span> kick`;
            log.classList.add('kicked');
            break;

        // === BONUS ===
        case 'bonus_5050':
            text = `<span class="player-name">${playerName}</span> utilise <span class="bonus-name">50/50</span>`;
            log.classList.add('bonus');
            break;
        case 'bonus_joker':
            text = `<span class="player-name">${playerName}</span> utilise <span class="bonus-name">Joker</span>`;
            log.classList.add('bonus');
            break;
        case 'bonus_shield':
            text = `<span class="player-name">${playerName}</span> utilise <span class="bonus-name">Bouclier</span>`;
            log.classList.add('bonus');
            break;
        case 'bonus_x2':
            text = `<span class="player-name">${playerName}</span> utilise <span class="bonus-name">x2</span>`;
            log.classList.add('bonus');
            break;

        // === ÉVÉNEMENTS DE JEU ===
        case 'game_start':
            text = `Partie lancée avec <span class="highlight">${extraData?.playerCount || '?'}</span> joueurs`;
            log.classList.add('event');
            break;
        case 'game_end':
            text = `<span class="player-name">${extraData?.winner || '?'}</span> remporte la partie`;
            log.classList.add('event', 'winner');
            break;
        case 'question':
            text = `Question ${extraData?.questionNumber || '?'} - <span class="difficulty">${extraData?.difficulty || '?'}</span>`;
            log.classList.add('event');
            break;
        case 'tiebreaker':
            text = `Égalité - Départage entre <span class="highlight">${extraData?.playerCount || '?'}</span> joueurs`;
            log.classList.add('event', 'tiebreaker');
            break;

        default:
            text = `${type}: ${playerName || ''}`;
    }

    if (icon) {
        log.innerHTML = `<span class="game-log-icon">${icon}</span><span class="game-log-text">${text}</span>`;
    } else {
        log.innerHTML = `<span class="game-log-text">${text}</span>`;
    }

    logsList.appendChild(log);
    logsList.scrollTop = logsList.scrollHeight;

    // Limiter à 30 logs max
    const logs = logsList.querySelectorAll('.game-log-item');
    if (logs.length > 30) {
        logs[0].remove();
    }

    // Fade out après 12 secondes
    setTimeout(() => {
        log.classList.add('fading');
        setTimeout(() => {
            if (log.parentNode) {
                log.remove();
            }
        }, 500);
    }, 12000);
}



// Event listener pour le toggle
document.getElementById('gameLogsToggle')?.addEventListener('click', toggleLogsPanel);



// Données Top 10 (en cas de bugs)
const TOP10_DATA = [
    { name: 'Shikamaru', wins: 999 },
    { name: 'Gojo', wins: 998 },
    { name: 'Zaraki', wins: 997 },
    { name: 'Rengoku', wins: 996 },
    { name: 'Doflamingo', wins: 995 },
    { name: 'Piccolo', wins: 994 },
    { name: 'Midoriya', wins: 993 },
    { name: 'Lelouch', wins: 992 },
    { name: 'Killua', wins: 991 },
    { name: 'Mikasa', wins: 990 },
];

/**
 * Générer le Top 10
 */
function generateWinnerTop10(data) {
    const list = document.getElementById('winnerTop10List');
    if (!list) return;
    list.innerHTML = '';

    data.slice(0, 10).forEach((player, index) => {
        const item = document.createElement('div');
        item.className = 'winner-top10-item';

        // Supporter les deux formats (username/name, total_victories/wins)
        const playerName = player.username || player.name || 'Joueur';
        const playerWins = player.total_victories || player.wins || 0;

        item.innerHTML = `
            <span class="winner-top10-rank">${index + 1}</span>
            <span class="winner-top10-name">${playerName}</span>
            <span class="winner-top10-wins">${playerWins}</span>
        `;
        list.appendChild(item);
    });
}


// ============================================
// RESTAURATION ÉTAT DU JEU
// ============================================

async function restoreGameState() {
    try {
        const response = await fetch('/game/state', { credentials: 'same-origin' });
        if (!response.ok) return false;

        const state = await response.json();
        console.log('🔄 État restauré:', state);

        // 🔥 CAS 0: ÉCRAN WINNER AFFICHÉ
        if (state.showingWinner && state.winnerScreenData) {
            console.log('🏆 Restauration écran Winner');

            const data = state.winnerScreenData;

            // 🔥 RESTAURER L'ICÔNE AVANT LE WINNER
            if (data.livesIcon) {
                selectedLivesIcon = data.livesIcon;
                updateLivesIconSelector(data.livesIcon);
            }

            // Afficher les éléments de base
            document.getElementById('mainHeader').style.display = '';
            document.getElementById('mainContainer').style.display = '';
            document.getElementById('bgText').style.display = '';

            // Cacher idle et lobby
            document.getElementById('stateIdle').style.display = 'none';
            document.getElementById('stateLobby').style.display = 'none';
            document.getElementById('stateLobby').classList.remove('active');

            // Cacher les panneaux latéraux
            recentPanel.classList.add('hidden');
            lastgamePanel.classList.add('hidden');

            // Afficher l'écran winner
            showWinner(
                data.winner.username,
                data.gameMode === 'points' ? (data.winner.points || 0) : (data.winner.livesRemaining || 0),
                data.winner.totalVictories || 1,
                data.totalQuestions,
                formatDuration(data.duration),
                data.playersData || [],
                data.topPlayers || [],
                data.gameMode
            );

            return true;
        }

        // === RESTAURER LES PARAMÈTRES ===
        if (state.mode) updateModeUI(state.mode);
        if (state.lives) updateLivesUI(state.lives);
        if (state.questionsCount) updateQuestionsUI(state.questionsCount);
        if (state.questionTime) updateTimerUI(state.questionTime);
        if (state.answersCount) updateAnswersUI(state.answersCount);
        if (state.difficultyMode) updateDifficultyUI(state.difficultyMode);
        if (state.serieFilter) updateSerieFilterUI(state.serieFilter);

        // 🔥 Restaurer l'icône ET la variable globale
        if (state.livesIcon) {
            selectedLivesIcon = state.livesIcon;
            updateLivesIconSelector(state.livesIcon);
        }

        // Restaurer le mode auto
        if (state.autoMode !== undefined) {
            autoMode = state.autoMode;
            const autoBtn = document.getElementById('autoToggleBtn');
            const icon = autoBtn?.querySelector('svg');

            if (autoMode && autoBtn && icon) {
                autoBtn.classList.add('active');
                icon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
            }
        }

        // === CAS 1: PARTIE EN COURS ===
        if (state.inProgress) {
            console.log('🎮 Restauration partie en cours');

            // Récupérer les éléments DOM
            const stateIdleEl = document.getElementById('stateIdle');
            const stateLobbyEl = document.getElementById('stateLobby');
            const stateGameEl = document.getElementById('stateGame');
            const bgTextEl = document.getElementById('bgText');
            const statusDotEl = document.getElementById('statusDot');
            const statusTextEl = document.getElementById('statusText');
            const recentPanelEl = document.getElementById('recentPanel');
            const lastgamePanelEl = document.getElementById('lastgamePanel');
            const btnWrapperEl = document.getElementById('btnWrapper');

            // Mettre à jour gameSettings
            gameSettings.mode = state.mode === 'lives' ? 'vie' : 'point';
            gameSettings.lives = state.lives || 3;
            gameSettings.timer = state.questionTime || 10;
            gameSettings.totalQuestions = state.questionsCount || 20;

            // Sauvegarder les joueurs
            gamePlayers = state.players || [];

            // Afficher l'état GAME directement
            document.getElementById('mainContainer').style.display = '';
            if (stateIdleEl) stateIdleEl.style.display = 'none';
            if (stateLobbyEl) {
                stateLobbyEl.style.display = 'none';
                stateLobbyEl.classList.remove('active');
            }
            if (stateGameEl) {
                stateGameEl.style.display = 'flex';
                stateGameEl.classList.add('active');
                stateGameEl.style.opacity = '1';
                stateGameEl.style.pointerEvents = '';
            }

            if (bgTextEl) {
                bgTextEl.textContent = 'GAME';
                bgTextEl.classList.remove('lobby-active');
                bgTextEl.classList.add('game-active');
            }
            if (statusDotEl) statusDotEl.classList.add('active');
            if (statusTextEl) statusTextEl.textContent = 'En partie';

            if (recentPanelEl) recentPanelEl.classList.add('hidden');
            if (lastgamePanelEl) lastgamePanelEl.classList.add('hidden');
            if (btnWrapperEl) btnWrapperEl.classList.remove('pulse-active');
            
            // 🆕 Cacher le bouton déconnexion
            const logoutBtn = document.getElementById('headerLogoutBtn');
            if (logoutBtn) logoutBtn.style.display = 'none';

            // Configurer le mode stats
            setStatsMode(gameSettings.mode === 'point' ? 'points' : 'vie');

            // Créer les cartes joueurs dans la grille
            console.log('🃏 Création cartes joueurs:', state.players.length, 'joueurs');
            createGamePlayerCardsFromState(state.players);

            // Afficher le toggle logs
            document.getElementById('gameLogsToggle')?.classList.add('active');

            // === CAS 1A: QUESTION EN COURS ===
            if (state.currentQuestion && !state.showResults) {
                console.log('📝 Restauration question en cours');

                // Restaurer la question (sans animation)
                restoreQuestionDisplay(state);

                // Démarrer le timer visuel avec le temps restant
                if (state.timeRemaining > 0) {
                    startVisualTimer(state.timeRemaining, state.questionTime);
                }

                // Mettre à jour les stats live si des joueurs ont déjà répondu
                if (state.liveAnswerCounts) {
                    updateLiveStatsFromState(state);
                }
            }

            // === CAS 1B: RÉSULTATS AFFICHÉS ===
            else if (state.showResults && state.lastQuestionResults) {
                console.log('📊 Restauration des résultats');

                // Restaurer l'affichage de la question avec résultats
                restoreResultsDisplay(state);

                // Mettre à jour les cartes joueurs avec les réponses
                updatePlayerCardsFromState(state.lastQuestionResults);

                // Restaurer les statistiques
                restoreStatsDisplay(state.lastQuestionResults);

                const timerText = document.getElementById('timerText');
                const timerContainer = timerText?.closest('.question-timer') || timerText?.parentElement;
                if (timerContainer) {
                    timerContainer.style.opacity = '0';
                    showHidePercentButton(false); // 🆕 Masquer le bouton œil
                }
            }

            return true;
        }

        // === CAS 2: LOBBY OUVERT ===
        else if (state.isActive) {
            console.log('🚪 Restauration lobby');
            showLobbyUI(state.players || []);
            return true;
        }

        return false;

    } catch (error) {
        console.log('Pas d\'état à restaurer:', error);
        return false;
    }
}

// ============================================
// FONCTIONS HELPER POUR LA RESTAURATION
// ============================================

function createGamePlayerCardsFromState(players) {
    const gameGrid = document.getElementById('playersGridGame');
    gameGrid.innerHTML = '';
    gamePlayers = [];

    players.forEach((player, index) => {
        const playerData = {
            name: player.username,
            twitchId: player.twitchId,
            lives: player.lives || 0,
            points: player.points || 0,
            isChampion: player.isLastGlobalWinner,
            title: player.title || 'Novice',
            eliminated: player.lives === 0,
            hasAnswered: player.hasAnswered || false,
            answer: player.selectedAnswer || null
        };
        gamePlayers.push(playerData);

        const gameCard = document.createElement('div');
        gameCard.className = 'player-card-game' + (player.isLastGlobalWinner ? ' champion' : '');
        gameCard.dataset.playerIndex = index;
        gameCard.dataset.lives = player.lives || 0;
        gameCard.dataset.twitchId = player.twitchId || '';


        if (gameSettings.mode === 'vie') {
            const livesHtml = getLivesIconsHTML(selectedLivesIcon, player.lives, gameSettings.lives);
            gameCard.innerHTML = `
                <div class="answered-indicator"></div>
                <div class="player-card-game-name">${player.username}</div>
                <div class="player-card-game-lives">${livesHtml}</div>
                <div class="player-card-game-answer-overlay">
                    <span class="answer-text-display no-answer"><img src="zzzzz.png" alt="AFK" class="afk-icon"></span>
                </div>
                <button class="player-card-game-kick" title="Exclure ${player.username}">
                    <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            `;
        } else {
            gameCard.innerHTML = `
                <div class="answered-indicator"></div>
                <div class="player-card-game-name">${player.username}</div>
                <div class="player-card-game-points">${player.points || 0}</div>
                <div class="player-card-game-answer-overlay">
                    <span class="answer-text-display no-answer"><img src="zzzzz.png" alt="AFK" class="afk-icon"></span>
                </div>
                <button class="player-card-game-kick" title="Exclure ${player.username}">
                    <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            `;
        }

        // ===== CLIC SUR BOUTON KICK =====
        const kickBtn = gameCard.querySelector('.player-card-game-kick');
        if (kickBtn) {
            kickBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                kickPlayer(player.username, player.twitchId, gameCard);
            });
        }

        // Clic sur carte joueur
        gameCard.style.cursor = 'pointer';
        gameCard.addEventListener('click', (e) => {
            if (e.target.closest('.player-card-game-answer-overlay')) return;
            if (e.target.closest('.player-card-game-kick')) return;
            openPlayerModal(player.username, player.isLastGlobalWinner, player.title || 'Novice', player.twitchId);
        });

        gameGrid.appendChild(gameCard);
    });
}

function restoreQuestionDisplay(state) {
    const question = state.currentQuestion;
    const questionWrapper = document.getElementById('gameQuestionWrapper');
    const questionPanel = document.getElementById('gameQuestionPanel');
    const mainPanel = document.getElementById('gameMainPanel');
    const questionActions = document.getElementById('questionActions');


    console.log('🔍 restoreQuestionDisplay - question:', question);
    console.log('🔍 restoreQuestionDisplay - questionWrapper:', questionWrapper);
    console.log('🔍 restoreQuestionDisplay - questionWrapper.className AVANT:', questionWrapper?.className);

    // Reset complet (sans animation)
    if (questionWrapper) {
        questionWrapper.className = 'game-question-wrapper visible';
    }

    if (questionPanel) questionPanel.removeAttribute('style');
    if (mainPanel) mainPanel.className = 'game-main-panel';
    if (questionActions) questionActions.className = 'question-actions';

    // Badges
    const questionTabBadge = document.getElementById('questionTabBadge');
    const questionSeries = document.getElementById('questionSeries');
    const diffBadge = document.getElementById('questionDifficulty');

    if (questionTabBadge) {
        if (state.mode === 'points' && state.questionsCount) {
            questionTabBadge.textContent = `Question ${state.currentQuestionIndex}/${state.questionsCount}`;
        } else {
            questionTabBadge.textContent = `Question ${state.currentQuestionIndex}`;
        }
    }

    if (questionSeries) questionSeries.textContent = question.serie || 'Anime';

    if (diffBadge) {
        diffBadge.textContent = formatDifficulty(question.difficulty);
        diffBadge.className = 'question-difficulty-badge ' + getDifficultyClass(question.difficulty);
    }

    // Question
    const questionText = document.getElementById('questionText');
    if (questionText) questionText.textContent = question.question;

    // Stocker la question courante
    currentQuestionData = question;

    // Réponses
    const answersGrid = document.getElementById('answersGrid');
    if (answersGrid) {
        answersGrid.innerHTML = '';

        if (question.answers.length === 6) {
            answersGrid.classList.add('six-answers');
        } else {
            answersGrid.classList.remove('six-answers');
        }

        question.answers.forEach((answer, i) => {
            const answerEl = document.createElement('div');
            answerEl.className = 'answer-option';
            answerEl.dataset.answer = i + 1;

            // 🔥 NOUVEAU: Afficher les pourcentages live
            const answerIndex = i + 1;
            const count = state.liveAnswerCounts?.[answerIndex] || 0;
            const total = state.players?.length || 1;
            const percent = total > 0 ? Math.round((count / total) * 100) : 0;

            const answerText = document.createElement('span');
            answerText.className = 'answer-text';
            answerText.textContent = answer;

            const answerPercent = document.createElement('span');
            answerPercent.className = 'answer-percent';
            answerPercent.textContent = `${percent}%`;

            answerEl.appendChild(answerText);
            answerEl.appendChild(answerPercent);
            answersGrid.appendChild(answerEl);
        });
        
        // 🆕 Appliquer l'état masquage des pourcentages
        applyHidePercentsState();
    }

    // 🔥 NOUVEAU: Marquer les joueurs qui ont déjà répondu
    if (state.players) {
        state.players.forEach(player => {
            if (player.hasAnswered) {
                const cards = document.querySelectorAll('.player-card-game');
                cards.forEach(card => {
                    const nameEl = card.querySelector('.player-card-game-name');
                    if (nameEl && nameEl.textContent === player.username) {
                        card.classList.add('has-answered');
                    }
                });
            }
        });
    }

    const questionTextEl = document.getElementById('questionText');
    const answersGridEl = document.getElementById('answersGrid');
    const questionBadges = document.querySelector('.question-badges-row');

    if (questionTextEl) questionTextEl.style.opacity = '1';
    if (answersGridEl) answersGridEl.style.opacity = '1';
    if (questionBadges) questionBadges.style.opacity = '1';


    console.log('🔍 restoreQuestionDisplay - questionText contenu:', document.getElementById('questionText')?.textContent);
    console.log('🔍 restoreQuestionDisplay - answersGrid enfants:', document.getElementById('answersGrid')?.children.length);
}

function restoreResultsDisplay(state) {
    const question = state.currentQuestion;
    const results = state.lastQuestionResults;
    const questionWrapper = document.getElementById('gameQuestionWrapper');
    const mainPanel = document.getElementById('gameMainPanel');
    const questionActions = document.getElementById('questionActions');

    // Afficher la question d'abord
    restoreQuestionDisplay(state);

    // Révéler les réponses
    const correctAnswer = results.correctAnswer;
    document.querySelectorAll('.answer-option').forEach((option, i) => {
        const answerIndex = i + 1;
        option.classList.add('revealed');

        if (answerIndex === correctAnswer) {
            option.classList.add('correct');
        } else {
            option.classList.add('wrong');
        }

        // 🔥 Restaurer les pourcentages depuis les résultats
        const total = state.players?.length || 1;
        const count = state.liveAnswerCounts?.[answerIndex] || 0;
        const percent = total > 0 ? Math.round((count / total) * 100) : 0;
        const percentEl = option.querySelector('.answer-percent');
        if (percentEl) percentEl.textContent = `${percent}%`;
    });

    // Afficher le panel droit + boutons
    if (questionWrapper) questionWrapper.classList.add('shifted');
    if (mainPanel) mainPanel.classList.add('visible');
    if (questionActions) questionActions.classList.add('visible');

    // Focus sur l'onglet Stats
    focusStatsTab();

    // Gérer le bouton suivante selon le mode auto
    const nextBtn = document.getElementById('nextQuestionBtn');
    if (nextBtn) {
        if (autoMode) {
            nextBtn.classList.add('auto-disabled');
            nextBtn.disabled = true;
        } else {
            nextBtn.classList.remove('auto-disabled');
            nextBtn.disabled = false;
        }
    }

    showGameCloseBtn();

    // 🔥 Restaurer les stats
    restoreStatsDisplay(results);

    // 🔥 Mettre à jour les cartes joueurs
    updatePlayerCardsFromState(results);
}

function updatePlayerCardsFromState(results) {
    const correctAnswer = results.correctAnswer;
    const currentAnswers = currentQuestionData?.answers || [];

    results.players.forEach(playerResult => {
        const cards = document.querySelectorAll('.player-card-game');
        cards.forEach(card => {
            const nameEl = card.querySelector('.player-card-game-name');
            if (!nameEl || nameEl.textContent !== playerResult.username) return;

            // Status visuel
            card.classList.remove('correct-answer', 'wrong-answer', 'has-answered');

            if (playerResult.isCorrect || playerResult.status === 'correct') {
                card.classList.add('correct-answer');
            } else {
                card.classList.add('wrong-answer');
            }

            // Mode vie : mettre à jour les cœurs
            if (gameSettings.mode === 'vie') {
                const livesEl = card.querySelector('.player-card-game-lives');
                if (livesEl && playerResult.lives !== undefined) {
                    const hearts = livesEl.querySelectorAll('.heart');
                    hearts.forEach((heart, i) => {
                        if (i < playerResult.lives) {
                            heart.classList.remove('lost');
                        } else {
                            heart.classList.add('lost');
                        }
                    });
                }

                // Marquer éliminé si 0 vies
                if (playerResult.lives <= 0) {
                    card.classList.add('eliminated');
                }
            }

            // Mode points : mettre à jour les points
            if (gameSettings.mode === 'point') {
                const pointsEl = card.querySelector('.player-card-game-points');
                if (pointsEl && playerResult.points !== undefined) {
                    pointsEl.textContent = playerResult.points;
                }
            }

            // 🔥 Overlay réponse - utiliser selectedAnswer du résultat
            const overlay = card.querySelector('.answer-text-display');
            if (overlay) {
                if (playerResult.selectedAnswer) {
                    overlay.textContent = playerResult.selectedAnswer;
                    overlay.classList.remove('no-answer', 'wrong');
                    if (!playerResult.isCorrect && playerResult.status !== 'correct') {
                        overlay.classList.add('wrong');
                    }
                } else {
                    overlay.innerHTML = '<img src="zzzzz.png" alt="AFK" class="afk-icon">';
                    overlay.classList.add('no-answer');
                    overlay.classList.remove('wrong');
                }
            }
        });
    });

    // Trier la grille
    setTimeout(() => {
        sortPlayersGrid();
    }, 100);
}

function restoreStatsDisplay(results) {
    const correct = results.stats?.correct || 0;
    const wrong = results.stats?.wrong || 0;
    const afk = results.stats?.afk || 0;

    // Compteurs texte
    const correctCount = document.getElementById('correctCount');
    const wrongCount = document.getElementById('wrongCount');
    const timeoutCount = document.getElementById('timeoutCount');

    if (correctCount) correctCount.textContent = correct;
    if (wrongCount) wrongCount.textContent = wrong;
    if (timeoutCount) timeoutCount.textContent = afk;

    // Pie chart réponses
    updateResponsesPie(correct, wrong, afk);

    // Pie chart vies (si mode vies)
    if (results.stats?.livesDistribution && gameSettings.mode === 'vie') {
        updateLivesPie(
            results.stats.livesDistribution[3] || 0,
            results.stats.livesDistribution[2] || 0,
            results.stats.livesDistribution[1] || 0,
            results.stats.livesDistribution[0] || 0
        );
    }

    // 🔥 Joueur le plus rapide
    if (results.fastestPlayer) {
        updateFastestPlayer(results.fastestPlayer.username, results.fastestPlayer.time);
    } else {
        updateFastestPlayer('-', null);
    }
}

function updateLiveStatsFromState(state) {
    const total = state.players.length;
    const counts = state.liveAnswerCounts || {};

    document.querySelectorAll('.answer-option').forEach((option, i) => {
        const answerIndex = i + 1;
        const count = counts[answerIndex] || 0;
        const percent = total > 0 ? Math.round((count / total) * 100) : 0;

        const percentEl = option.querySelector('.answer-percent');
        if (percentEl) {
            percentEl.textContent = `${percent}%`;
        }
    });
}

function showLobbyUI(players = []) {
    // Afficher le main container (pour le lobby)
    document.getElementById('mainContainer').style.display = '';

    // Cacher idle, afficher lobby directement
    stateIdle.style.display = 'none';
    stateLobby.classList.add('active');
    stateLobby.style.opacity = '1';
    stateLobby.style.pointerEvents = '';  // 🔥 AJOUTER
    
    // 🆕 Cacher le bouton déconnexion
    const logoutBtn = document.getElementById('headerLogoutBtn');
    if (logoutBtn) logoutBtn.style.display = 'none';

    bgText.textContent = 'LOBBY';
    bgText.classList.add('lobby-active');
    statusDot.classList.add('active');
    statusText.textContent = 'Lobby ouvert';

    recentPanel.classList.add('hidden');
    lastgamePanel.classList.add('hidden');
    btnWrapper.classList.remove('pulse-active');

    updateLobbyPlayers(players);

    // Vérifier le cooldown au chargement
    checkRefreshCooldown();
}



// ============================================
// BOUTON ACTUALISER JOUEURS
// ============================================
const refreshPlayersBtn = document.getElementById('refreshPlayersBtn');

if (refreshPlayersBtn) {

    refreshPlayersBtn.addEventListener('click', async () => {
        if (refreshPlayersBtn.classList.contains('loading') ||
            refreshPlayersBtn.classList.contains('cooldown')) return;

        refreshPlayersBtn.classList.add('loading');

        try {
            const response = await fetch('/admin/refresh-players', {
                method: 'POST',
                credentials: 'same-origin'
            });

            const data = await response.json();

            if (response.status === 429) {
                showRefreshCooldown(data.remainingTime);
            } else if (data.success) {
                console.log(`✅ ${data.playersRefreshed} joueur(s) actualisé(s)`);
                showRefreshCooldown(20); // Lancer le cooldown de 20s
            }
        } catch (error) {
            console.error('❌ Erreur refresh:', error);
        } finally {
            refreshPlayersBtn.classList.remove('loading');
        }
    });
}

async function checkRefreshCooldown() {
    try {
        const response = await fetch('/admin/refresh-cooldown', { credentials: 'same-origin' });
        const data = await response.json();

        if (data.onCooldown && data.remainingTime > 0) {
            showRefreshCooldown(data.remainingTime);
        }
    } catch (error) {
        console.log('Pas de cooldown actif');
    }
}

function showRefreshCooldown(seconds) {
    const btn = document.getElementById('refreshPlayersBtn');
    if (!btn) return;

    const spanEl = btn.querySelector('span');
    const originalText = 'Actualiser';

    btn.classList.add('cooldown');
    spanEl.textContent = `${seconds}s`;

    const interval = setInterval(() => {
        seconds--;
        if (seconds <= 0) {
            clearInterval(interval);
            spanEl.textContent = originalText;
            btn.classList.remove('cooldown');
        } else {
            spanEl.textContent = `${seconds}s`;
        }
    }, 1000);
}




// ============================================
// FONCTIONS UPDATE UI - PARAMÈTRES
// ============================================

function updateModeUI(mode) {
    const isLives = mode === 'lives';
    const btnValue = isLives ? 'vie' : 'point';

    // 🔥 AJOUTER - Mettre à jour gameSettings.mode
    gameSettings.mode = isLives ? 'vie' : 'point';

    // Boutons mode
    document.querySelectorAll('.mode-group .setting-option-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === btnValue);
    });

    // Label
    const modeValue = document.getElementById('modeValue');
    if (modeValue) modeValue.textContent = isLives ? 'Vies' : 'Points';

    // Afficher/cacher groupes
    const livesGroup = document.getElementById('livesGroup');
    const questionsGroup = document.getElementById('questionsGroup');
    const livesIconGroup = document.getElementById('livesIconGroup'); // 🔥 AJOUTER
    const speedBonusGroup = document.getElementById('speedBonusGroup'); // 🆕

    if (livesGroup && questionsGroup) {
        if (isLives) {
            // Mode Vies : afficher vies, cacher questions et speedBonus
            livesGroup.style.display = 'block';
            livesGroup.style.opacity = '1';
            livesGroup.classList.remove('hidden');

            questionsGroup.style.display = 'none';
            questionsGroup.classList.add('hidden');

            // 🔥 AJOUTER - Afficher icônes
            if (livesIconGroup) {
                livesIconGroup.style.display = '';
                livesIconGroup.classList.remove('hidden');
            }
            
            // 🆕 Cacher speedBonus
            if (speedBonusGroup) {
                speedBonusGroup.style.display = 'none';
                speedBonusGroup.classList.add('hidden');
            }
        } else {
            // Mode Points : cacher vies, afficher questions et speedBonus
            livesGroup.style.display = 'none';
            livesGroup.classList.add('hidden');

            questionsGroup.style.display = 'block';
            questionsGroup.style.opacity = '1';
            questionsGroup.classList.remove('hidden');

            // 🔥 AJOUTER - Cacher icônes
            if (livesIconGroup) {
                livesIconGroup.style.display = 'none';
                livesIconGroup.classList.add('hidden');
            }
            
            // 🆕 Afficher speedBonus
            if (speedBonusGroup) {
                speedBonusGroup.style.display = 'block';
                speedBonusGroup.style.opacity = '1';
                speedBonusGroup.classList.remove('hidden');
            }
        }
    }

    console.log(`✅ Mode UI restauré: ${mode}`);
}

function updateLivesUI(lives) {
    // Boutons vies
    document.querySelectorAll('.lives-group .setting-option-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.value) === lives);
    });

    // Label
    const livesValue = document.getElementById('livesValue');
    if (livesValue) livesValue.textContent = lives;

    console.log(`✅ Vies UI restauré: ${lives}`);
}

function updateQuestionsUI(count) {
    // Boutons questions
    document.querySelectorAll('.questions-group .setting-option-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.value) === count);
    });

    // Label
    const questionsValue = document.getElementById('questionsValue');
    if (questionsValue) questionsValue.textContent = count;

    console.log(`✅ Questions UI restauré: ${count}`);
}

function updateTimerUI(time) {
    // Slider
    const timerSlider = document.getElementById('timerSlider');
    if (timerSlider) timerSlider.value = time;

    // Label
    const timerValue = document.getElementById('timerValue');
    if (timerValue) timerValue.textContent = time + 's';

    console.log(`✅ Timer UI restauré: ${time}s`);
}

function updateAnswersUI(count) {
    // Boutons réponses
    document.querySelectorAll('.answers-options .setting-option-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.value) === count);
    });

    // Label
    const answersValue = document.getElementById('answersValue');
    if (answersValue) answersValue.textContent = count;

    console.log(`✅ Réponses UI restauré: ${count}`);
}

function updateDifficultyUI(mode) {
    console.log('🔍 updateDifficultyUI appelée avec:', mode);
    console.log('🔍 Type:', typeof mode);

    const buttons = document.querySelectorAll('.difficulty-options .setting-option-btn');
    console.log('🔍 Boutons trouvés:', buttons.length);

    buttons.forEach(btn => {
        console.log('🔍 Bouton data-value:', btn.dataset.value);
    });

    // Comparaison simple sans accent
    const modeClean = mode.toLowerCase().replace('é', 'e');

    buttons.forEach(btn => {
        const btnValue = (btn.dataset.value || '').toLowerCase().replace('é', 'e');
        const isActive = btnValue === modeClean;
        console.log(`🔍 Comparaison: "${btnValue}" === "${modeClean}" => ${isActive}`);
        btn.classList.toggle('active', isActive);
    });

    const difficultyValue = document.getElementById('difficultyValue');
    if (difficultyValue) {
        difficultyValue.textContent = mode === 'croissante' ? 'Croissante' : 'Aléatoire';
    }
}

function updateSerieFilterUI(filter) {
    // Cartes séries dans le modal
    document.querySelectorAll('.series-card').forEach(card => {
        card.classList.toggle('active', card.dataset.series === filter);
    });

    // Label principal
    const seriesValue = document.getElementById('seriesValue');
    if (seriesValue) {
        const activeCard = document.querySelector(`.series-card[data-series="${filter}"]`);
        if (activeCard) {
            seriesValue.textContent = activeCard.dataset.name || filter;
        }
    }

    // Mettre à jour la variable globale
    if (typeof currentSerieFilter !== 'undefined') {
        currentSerieFilter = filter;
    }

    console.log(`✅ Série UI restauré: ${filter}`);
}



// ============================================
// LISTENERS PARAMÈTRES - CONNEXION SERVEUR
// ============================================

function initSettingsListeners() {

    // === MODE (Vies / Points) ===
    document.querySelectorAll('.mode-group .setting-option-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const mode = btn.dataset.mode;
            const serverMode = mode === 'vie' ? 'lives' : 'points';

            // Mettre à jour gameSettings localement
            gameSettings.mode = mode;

            // Mettre à jour visibilité du sélecteur d'icônes
            updateLivesIconVisibility();

            // Appel serveur
            await fetch('/admin/set-mode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ mode: serverMode })
            });
        });
    });

    // === VIES ===
    document.querySelectorAll('.lives-group .setting-option-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const lives = parseInt(btn.dataset.value);

            await fetch('/admin/set-lives', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ lives })
            });
        });
    });

    // === QUESTIONS (mode points) ===
    document.querySelectorAll('.questions-group .setting-option-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const questions = parseInt(btn.dataset.value);

            await fetch('/admin/set-questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ questions })
            });
        });
    });

    // === TIMER (Slider) ===
    const timerSlider = document.getElementById('timerSlider');
    if (timerSlider) {
        timerSlider.addEventListener('change', async (e) => {
            await fetch('/admin/set-time', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ time: parseInt(e.target.value) })
            });
        });
    }

    // === RÉPONSES ===
    document.querySelectorAll('.answers-options .setting-option-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const answers = parseInt(btn.dataset.value);

            await fetch('/admin/set-answers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ answers })
            });
        });
    });

    // === DIFFICULTÉ ===
    document.querySelectorAll('.difficulty-options .setting-option-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            // Enlever accent pour le serveur
            const mode = btn.dataset.value.toLowerCase().replace('é', 'e');

            console.log('📤 Envoi difficulté:', mode);

            try {
                const response = await fetch('/admin/set-difficulty-mode', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ mode })
                });

                const data = await response.json();
                console.log('📥 Réponse:', response.status, data);
            } catch (err) {
                console.error('❌ Erreur:', err);
            }
        });
    });

    // === SÉRIE (dans le modal) ===
    document.querySelectorAll('.series-card:not(.soon)').forEach(card => {
        card.addEventListener('click', async () => {
            const filter = card.dataset.series;

            await fetch('/admin/set-serie-filter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ filter })
            });
        });
    });

    console.log('✅ Settings listeners initialisés');
}


function displayQuestion(data) {
    clearInterval(visualTimerInterval);

    const questionWrapper = document.getElementById('gameQuestionWrapper');
    const questionPanel = document.getElementById('gameQuestionPanel');
    const mainPanel = document.getElementById('gameMainPanel');
    const questionActions = document.getElementById('questionActions');
    const panelMiniActions = document.querySelector('.panel-mini-actions');
    const questionCard = document.querySelector('.question-card');
    const answersGrid = document.getElementById('answersGrid');

    // 🔥 RESET COMPLET
    if (questionWrapper) {
        questionWrapper.className = 'game-question-wrapper';
        questionWrapper.removeAttribute('style');
    }

    if (questionPanel) {
        questionPanel.removeAttribute('style');
    }

    if (panelMiniActions) {
        panelMiniActions.removeAttribute('style');
    }

    if (mainPanel) {
        mainPanel.className = 'game-main-panel';
    }

    if (questionActions) {
        questionActions.className = 'question-actions';
    }

    // Forcer reflow
    void questionWrapper.offsetWidth;

    // 🔥 Lancer l'animation d'entrée
    questionWrapper.classList.add('entering');

    // 🔥 Après l'animation (1s + 0.5s delay), passer en visible
    setTimeout(() => {
        questionWrapper.classList.remove('entering');
        questionWrapper.classList.add('visible');
    }, 1500);


    // REAFFICHER TIMER
    const timerText = document.getElementById('timerText');
    const timerContainer = timerText?.closest('.question-timer') || timerText?.parentElement;
    if (timerContainer) {
        timerContainer.style.opacity = '1';
        showHidePercentButton(true); // 🆕 Afficher le bouton œil
    }

    // Mettre à jour les badges
    const questionTabBadge = document.getElementById('questionTabBadge');
    const questionSeries = document.getElementById('questionSeries');
    const diffBadge = document.getElementById('questionDifficulty');

    if (questionTabBadge) {
        if (data.totalQuestions) {
            questionTabBadge.textContent = `Question ${data.questionNumber}/${data.totalQuestions}`;
        } else {
            questionTabBadge.textContent = `Question ${data.questionNumber}`;
        }
    }
    if (questionSeries) questionSeries.textContent = data.serie || 'Anime';

    if (diffBadge) {
        diffBadge.textContent = formatDifficulty(data.difficulty);
        diffBadge.className = 'question-difficulty-badge ' + getDifficultyClass(data.difficulty);
    }

    const questionText = document.getElementById('questionText');
    if (questionText) questionText.textContent = data.question;

    if (!answersGrid) return;
    answersGrid.innerHTML = '';

    if (data.answers.length === 6) {
        answersGrid.classList.add('six-answers');
        if (questionCard) questionCard.classList.add('six-answers');
    } else {
        answersGrid.classList.remove('six-answers');
        if (questionCard) questionCard.classList.remove('six-answers');
    }

    data.answers.forEach((answer, i) => {
        const answerEl = document.createElement('div');
        answerEl.className = 'answer-option';
        answerEl.dataset.answer = i + 1;
        answerEl.innerHTML = `
            <span class="answer-text">${answer}</span>
            <span class="answer-percent">0%</span>
        `;
        answersGrid.appendChild(answerEl);
    });

    // 🆕 Appliquer l'état masquage des pourcentages
    applyHidePercentsState();

    document.querySelectorAll('.player-card-game').forEach(card => {
        card.classList.remove('has-answered', 'correct-answer', 'wrong-answer');
        const overlay = card.querySelector('.answer-text-display');
        if (overlay) {
            overlay.textContent = '';
            overlay.classList.remove('wrong', 'no-answer');
        }
    });

    // 🔥 Réafficher le contenu (était caché pendant la transition)
    if (questionText) questionText.style.opacity = '1';
    if (answersGrid) answersGrid.style.opacity = '1';
    const questionBadges = document.querySelector('.question-badges-row');
    if (questionBadges) questionBadges.style.opacity = '1';

    currentQuestionData = data;
    
    // 🆕 Image personnage (DÉSACTIVÉ TEMPORAIREMENT)
    // showCharacterImage(data.serie, data.timeLimit);
    
    startVisualTimer(data.timeLimit);
}


function formatDifficulty(diff) {
    const map = {
        'veryeasy': 'Veryeasy',
        'easy': 'Easy',
        'medium': 'Medium',
        'hard': 'Hard',
        'veryhard': 'Veryhard',
        'extreme': 'Extreme'
    };
    return map[diff] || diff;
}

function getDifficultyClass(diff) {
    if (['veryeasy', 'easy'].includes(diff)) return 'easy';
    if (diff === 'medium') return 'medium';
    return 'hard';
}

let currentQuestionData = null;


// ============================================
// 🆕 FONCTIONS IMAGE PERSONNAGE
// ============================================

function showCharacterImage(serie, timeLimit) {
    if (!characterImageEnabled) return;
    
    const container = document.getElementById('characterImageContainer');
    const img = document.getElementById('characterImage');
    if (!container || !img) return;
    
    // Normaliser le nom de série
    const normalizedSerie = serie.toLowerCase().trim();
    const imagePath = CHARACTER_IMAGES[normalizedSerie];
    
    if (!imagePath) {
        console.log(`🖼️ Pas d'image pour la série: ${serie}`);
        return;
    }
    
    // Annuler les timeouts précédents
    clearTimeout(characterShowTimeout);
    clearTimeout(characterHideTimeout);
    
    // Cacher d'abord
    container.classList.remove('visible', 'hiding');
    
    // Charger l'image
    img.src = imagePath;
    img.alt = serie;
    
    // Afficher après 1s
    characterShowTimeout = setTimeout(() => {
        container.classList.add('visible');
        console.log(`🖼️ Affichage personnage: ${serie}`);
    }, 1000);
    
    // Cacher 1s avant la fin du timer
    const hideDelay = (timeLimit - 1) * 1000;
    if (hideDelay > 1000) {
        characterHideTimeout = setTimeout(() => {
            hideCharacterImage();
        }, hideDelay);
    }
}

function hideCharacterImage() {
    const container = document.getElementById('characterImageContainer');
    if (!container) return;
    
    container.classList.remove('visible');
    container.classList.add('hiding');
    
    // Nettoyer après l'animation
    setTimeout(() => {
        container.classList.remove('hiding');
    }, 600);
}

function toggleCharacterImages() {
    characterImageEnabled = !characterImageEnabled;
    const toggle = document.getElementById('characterToggle');
    
    if (toggle) {
        toggle.classList.toggle('hidden', !characterImageEnabled);
    }
    
    // Si on désactive, cacher immédiatement l'image actuelle
    if (!characterImageEnabled) {
        hideCharacterImage();
        clearTimeout(characterShowTimeout);
        clearTimeout(characterHideTimeout);
    }
    
    console.log(`🖼️ Images personnages: ${characterImageEnabled ? 'activées' : 'désactivées'}`);
}

// Initialiser le toggle au chargement
document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('characterToggle');
    if (toggle) {
        toggle.addEventListener('click', toggleCharacterImages);
    }
});


let visualTimerInterval = null;

function startVisualTimer(seconds, totalTime = null) {
    clearInterval(visualTimerInterval);

    timerValue = seconds;
    const maxTime = totalTime || gameSettings.timer;

    // Mise à jour initiale avec le bon total
    const display = Math.max(0, timerValue);
    document.getElementById('timerText').textContent = display;

    const progress = document.getElementById('timerProgress');
    const timerText = document.getElementById('timerText');
    const circumference = 2 * Math.PI * 22;

    if (progress) {
        progress.style.strokeDasharray = circumference;
        // Calculer l'offset initial en fonction du temps restant
        const offset = circumference * (1 - timerValue / maxTime);
        progress.style.strokeDashoffset = offset;
        progress.classList.remove('warning');
    }
    if (timerText) timerText.classList.remove('warning');

    visualTimerInterval = setInterval(() => {
        timerValue--;

        // Check stop EN PREMIER
        if (timerValue < 0) {
            clearInterval(visualTimerInterval);
            return;
        }

        // Mise à jour affichage
        const display = Math.max(0, timerValue);
        document.getElementById('timerText').textContent = display;

        const offset = circumference * (1 - timerValue / maxTime);
        progress.style.strokeDashoffset = offset;

        // Puis warning
        if (timerValue <= 3) {
            if (progress) progress.classList.add('warning');
            if (timerText) timerText.classList.add('warning');
        }
    }, 1000);
}



function displayResults(data) {
    clearInterval(visualTimerInterval);
    
    // 🆕 Image personnage (DÉSACTIVÉ TEMPORAIREMENT)
    // hideCharacterImage();
    // clearTimeout(characterShowTimeout);
    // clearTimeout(characterHideTimeout);

    // 🔥 AJOUTER - Fade out du timer
    const timerText = document.getElementById('timerText');
    const timerProgress = document.getElementById('timerProgress');
    const timerContainer = timerText?.closest('.question-timer') || timerText?.parentElement;

    if (timerContainer) {
        anime({
            targets: timerContainer,
            opacity: [1, 0],
            duration: 300,
            easing: 'easeOutQuad'
        });
    }
    
    // 🆕 Masquer le bouton œil
    showHidePercentButton(false);

    focusStatsTab();

    const questionWrapper = document.getElementById('gameQuestionWrapper');
    const mainPanel = document.getElementById('gameMainPanel');
    const questionActions = document.getElementById('questionActions');

    const correctAnswer = data.correctAnswer;

    // Mettre à jour les options de réponse
    document.querySelectorAll('.answer-option').forEach((option, i) => {
        const answerIndex = i + 1;
        option.classList.add('revealed');

        setTimeout(() => {
            if (answerIndex === correctAnswer) {
                option.classList.add('correct');
            } else {
                option.classList.add('wrong');
            }
        }, 100 + i * 50);
    });

    // Afficher le panel droit
    setTimeout(() => {
        if (questionWrapper) questionWrapper.classList.add('shifted');
        if (mainPanel) mainPanel.classList.add('visible');
        if (questionActions) questionActions.classList.add('visible');
        showGameCloseBtn();

        // 🔥 AJOUTER - Gérer le bouton suivante selon le mode auto
        const nextBtn = document.getElementById('nextQuestionBtn');
        if (nextBtn) {
            if (autoMode) {
                nextBtn.classList.add('auto-disabled');
                nextBtn.disabled = true;
            } else {
                nextBtn.classList.remove('auto-disabled');
                nextBtn.disabled = false;
            }
        }
    }, 350);

    // Mettre à jour les cartes joueurs
    if (data.players) {
        data.players.forEach(playerResult => {
            updatePlayerCard(playerResult, correctAnswer);
        });
    }


    setTimeout(() => {
        sortPlayersGrid();
    }, 500);

    // Mettre à jour les stats
    setTimeout(() => {
        if (data.stats) {
            const correct = data.stats.correct || 0;
            const wrong = data.stats.wrong || 0;
            const afk = data.stats.afk || 0;

            // Compteurs texte (utiliser les BONS IDs du HTML)
            const correctCount = document.getElementById('correctCount');
            const wrongCount = document.getElementById('wrongCount');
            const timeoutCount = document.getElementById('timeoutCount');

            if (correctCount) correctCount.textContent = correct;
            if (wrongCount) wrongCount.textContent = wrong;
            if (timeoutCount) timeoutCount.textContent = afk;

            // Pie chart réponses
            updateResponsesPie(correct, wrong, afk);

            // 🔥 AJOUTER - Pie chart vies
            if (data.stats.livesDistribution) {
                updateLivesPie(
                    data.stats.livesDistribution[3] || 0,
                    data.stats.livesDistribution[2] || 0,
                    data.stats.livesDistribution[1] || 0,
                    data.stats.livesDistribution[0] || 0
                );
            }
        }

        // Joueur le plus rapide (seulement si quelqu'un a bien répondu)
        if (data.fastestPlayer && data.stats?.correct > 0) {
            updateFastestPlayer(data.fastestPlayer.username, data.fastestPlayer.time);
        } else {
            updateFastestPlayer('-', null);
        }
    }, 700);
}


function sortPlayersGrid() {
    const grid = document.getElementById('playersGridGame');
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll('.player-card-game'));

    cards.sort((a, b) => {
        if (gameSettings.mode === 'point') {
            // Mode Points : trier par points décroissants
            const pointsA = parseInt(a.querySelector('.player-card-game-points')?.textContent) || 0;
            const pointsB = parseInt(b.querySelector('.player-card-game-points')?.textContent) || 0;
            return pointsB - pointsA;
        } else {
            // Mode Vie : trier par vies décroissantes (utiliser data-lives)
            const livesA = parseInt(a.dataset.lives) || 0;
            const livesB = parseInt(b.dataset.lives) || 0;
            return livesB - livesA;
        }
    });

    // Réinsérer dans l'ordre
    cards.forEach(card => grid.appendChild(card));
}

function updatePlayerCard(playerResult, correctAnswer) {
    const cards = document.querySelectorAll('.player-card-game');
    const playerName = playerResult.username || playerResult.name;

    cards.forEach(card => {
        const nameEl = card.querySelector('.player-card-game-name');
        if (!nameEl || nameEl.textContent !== playerName) return;

        // Status visuel
        card.classList.remove('correct-answer', 'wrong-answer', 'has-answered');

        if (playerResult.isCorrect || playerResult.status === 'correct') {
            card.classList.add('correct-answer');
        } else {
            card.classList.add('wrong-answer');
        }

        // Mode vie : mettre à jour les icônes
        if (gameSettings.mode === 'vie') {
            const livesEl = card.querySelector('.player-card-game-lives');
            if (livesEl && playerResult.lives !== undefined) {
                const targetLives = playerResult.lives;
                card.dataset.lives = targetLives;

                // Katana : remplacer tout le SVG
                if (selectedLivesIcon === 'katana') {
                    livesEl.innerHTML = getLivesIconsHTML('katana', targetLives, gameSettings.lives);
                } else {
                    // Autres icônes : mettre à jour les classes lost
                    const icons = livesEl.querySelectorAll('.life-icon');
                    icons.forEach((icon, i) => {
                        if (i < targetLives) {
                            icon.classList.remove('lost');
                        } else if (!icon.classList.contains('lost')) {
                            // Animation de perte
                            icon.classList.add('losing');
                            setTimeout(() => {
                                icon.classList.remove('losing');
                                icon.classList.add('lost');
                            }, 400);
                        }
                    });
                }

                // Marquer éliminé si 0 vies
                if (targetLives <= 0) {
                    setTimeout(() => card.classList.add('eliminated'), 400);
                }
            }
        }

        // Mode points
        if (gameSettings.mode === 'point' && playerResult.points !== undefined) {
            const pointsEl = card.querySelector('.player-card-game-points');
            if (pointsEl) pointsEl.textContent = playerResult.points;
        }

        // Overlay réponse
        const overlay = card.querySelector('.answer-text-display');
        if (overlay) {
            if (playerResult.selectedAnswer) {
                overlay.textContent = playerResult.selectedAnswer;
                overlay.classList.remove('no-answer', 'wrong');
                if (!playerResult.isCorrect) overlay.classList.add('wrong');
            } else {
                overlay.innerHTML = '<img src="zzzzz.png" alt="AFK" class="afk-icon">';
                overlay.classList.add('no-answer');
                overlay.classList.remove('wrong');
            }
        }
    });
}



function updateLiveStats(data) {
    // Mettre à jour les pourcentages sur les réponses
    if (data.answerCounts) {
        document.querySelectorAll('.answer-option').forEach((option, i) => {
            const answerIndex = i + 1;
            const count = data.answerCounts[answerIndex] || 0;
            const total = data.answeredCount || 1;
            const percent = Math.round((count / total) * 100) || 0;

            const percentEl = option.querySelector('.answer-percent');
            if (percentEl) percentEl.textContent = percent + '%';
        });
    }

    // Mettre à jour indicateurs "a répondu" sur les cartes
    // (optionnel - le serveur envoie 'player-answered' pour ça)
}




function displayWinner(data) {
    gameStarted = false;

    if (data.winner) {
        showWinner(
            data.winner.username,
            data.gameMode === 'points' ? (data.winner.points || 0) : (data.winner.livesRemaining || 0),
            data.winner.totalVictories || 1,
            data.totalQuestions,
            formatDuration(data.duration),
            data.playersData || [],
            data.topPlayers || [],
            data.gameMode  // 🔥 AJOUTER - passer le mode
        );
    }

    // Reset pour prochaine partie
    const startBtn = document.getElementById('startGameBtn');
    if (startBtn) {
        startBtn.querySelector('.action-full-label').textContent = 'DÉMARRER';
        startBtn.querySelector('.action-full-sub').textContent = 'Lancer la partie';
        startBtn.classList.remove('started', 'loading');
    }
}

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
}


function handleActivityLog(log) {
    if (!log || !log.type) return;

    const data = log.data || {};
    const username = data.username;

    switch (log.type) {
        case 'join':
            addGameLog('join', username);
            break;
        case 'leave':
            addGameLog('leave', username);
            // 🆕 Supprimer la carte du joueur de la grille
            removePlayerCard(username);
            break;
        case 'kick':
            addGameLog('kicked', username);
            // Supprimer la carte du joueur de la grille
            removePlayerCard(username);
            break;
        case 'disconnect':
            addGameLog('disconnected', username);
            break;
        case 'reconnect':
            addGameLog('reconnected', username);
            break;
        case 'answer':
            addGameLog('answered', username);
            break;
        case 'eliminated':
            addGameLog('eliminated', username);
            break;
        case 'bonus-5050':
            addGameLog('bonus_5050', username);
            break;
        case 'bonus-joker':
            addGameLog('bonus_joker', username);
            break;
        case 'bonus-shield':
            addGameLog('bonus_shield', username);
            break;
        case 'bonus-x2':
            addGameLog('bonus_x2', username);
            break;
        case 'game-start':
            addGameLog('game_start', null, { playerCount: data.playerCount });
            break;
        case 'game-end':
            addGameLog('game_end', null, { winner: data.winner });
            break;
        case 'question':
            addGameLog('question', null, {
                questionNumber: data.questionNumber,
                difficulty: data.difficulty
            });
            break;
        case 'tiebreaker':
            addGameLog('tiebreaker', null, { playerCount: data.playerCount });
            break;
    }
}


// 🆕 Fonction pour supprimer la carte d'un joueur (lobby + game)
function removePlayerCard(username) {
    if (!username) return;

    // Chercher dans la grille du lobby
    const lobbyGrid = document.getElementById('playersGridLobby');
    if (lobbyGrid) {
        const lobbyCards = lobbyGrid.querySelectorAll('.player-card-mini');
        lobbyCards.forEach(card => {
            const nameEl = card.querySelector('.player-card-mini-name');
            if (nameEl && nameEl.textContent === username) {
                // Animation de fade out puis suppression
                card.style.transition = 'opacity 0.3s, transform 0.3s';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.8)';
                setTimeout(() => card.remove(), 300);
            }
        });
    }

    // Chercher dans la grille de jeu (en partie)
    const gameGrid = document.getElementById('playersGridGame');
    if (gameGrid) {
        const gameCards = gameGrid.querySelectorAll('.player-card-game');
        gameCards.forEach(card => {
            const nameEl = card.querySelector('.player-card-game-name');
            if (nameEl && nameEl.textContent === username) {
                // Animation de fade out puis suppression
                card.style.transition = 'opacity 0.3s, transform 0.3s';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.8)';
                setTimeout(() => card.remove(), 300);
            }
        });
    }

    console.log(`🗑️ Carte de ${username} supprimée`);
}


// ============================================
// 🆕 MODAL CONFIRMATION KICK
// ============================================
let pendingKick = null; // Stocke les infos du kick en attente

function openKickModal(username, twitchId, cardElement) {
    pendingKick = { username, twitchId, cardElement };
    
    document.getElementById('kickModalUsername').textContent = username;
    document.getElementById('kickModalOverlay').classList.add('active');
    document.getElementById('kickModal').classList.add('active');
}

function closeKickModal() {
    document.getElementById('kickModalOverlay').classList.remove('active');
    document.getElementById('kickModal').classList.remove('active');
    pendingKick = null;
}

function confirmKick() {
    if (!pendingKick) return;
    
    const { username, twitchId, cardElement } = pendingKick;
    
    // Émettre l'événement au serveur
    socket.emit('kick-player', { username, twitchId });
    
    // Animation de suppression de la carte
    if (cardElement) {
        cardElement.style.transition = 'opacity 0.3s, transform 0.3s';
        cardElement.style.opacity = '0';
        cardElement.style.transform = 'scale(0.8)';
        setTimeout(() => cardElement.remove(), 300);
    }
    
    console.log(`🚫 ${username} a été kick par le streamer`);
    closeKickModal();
}

// Initialisation des listeners du modal kick
function initKickModal() {
    const overlay = document.getElementById('kickModalOverlay');
    const cancelBtn = document.getElementById('kickModalCancel');
    const confirmBtn = document.getElementById('kickModalConfirm');
    
    if (overlay) overlay.addEventListener('click', closeKickModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeKickModal);
    if (confirmBtn) confirmBtn.addEventListener('click', confirmKick);
}

// Fonction pour kick un joueur manuellement (bouton poubelle)
function kickPlayer(username, twitchId, cardElement) {
    if (!username) return;
    
    const stateLobby = document.getElementById('stateLobby');
    const isInLobby = stateLobby && stateLobby.classList.contains('active');
    
    // Dans le lobby → kick direct (pas de modal)
    if (isInLobby) {
        socket.emit('kick-player', { username, twitchId });

        if (cardElement) {
            cardElement.style.transition = 'opacity 0.3s, transform 0.3s';
            cardElement.style.opacity = '0';
            cardElement.style.transform = 'scale(0.8)';
            setTimeout(() => cardElement.remove(), 300);
        }

        console.log(`🚫 ${username} a été kick par le streamer`);
        return;
    }
    
    // En partie → modal de confirmation
    openKickModal(username, twitchId, cardElement);
}


function toggleLogsPanel() {
    const logsContainer = document.getElementById('gameLogsContainer');
    const toggleBtn = document.getElementById('gameLogsToggle');
    if (!logsContainer) return;

    logsVisible = !logsVisible;

    // Toggle la classe hidden (pas visible)
    logsContainer.classList.toggle('hidden', !logsVisible);
    toggleBtn?.classList.toggle('active', logsVisible);
}

function updateModeDisplay(mode) {
    updateModeUI(mode);
}

function updateLivesDisplay(lives) {
    updateLivesUI(lives);
}


// ============================================
// MODAL CONFIRMATION FERMETURE LOBBY
// ============================================

function showConfirmModal() {
    return new Promise((resolve) => {
        const overlay = document.getElementById('confirmModalOverlay');
        const modal = document.getElementById('confirmModal');
        const cancelBtn = document.getElementById('confirmModalCancel');
        const confirmBtn = document.getElementById('confirmModalConfirm');

        // Afficher
        overlay.classList.add('active');
        modal.classList.add('active');

        // Handlers
        const cleanup = () => {
            overlay.classList.remove('active');
            modal.classList.remove('active');
            cancelBtn.removeEventListener('click', onCancel);
            confirmBtn.removeEventListener('click', onConfirm);
            overlay.removeEventListener('click', onCancel);
        };

        const onCancel = () => {
            cleanup();
            resolve(false);
        };

        const onConfirm = () => {
            cleanup();
            resolve(true);
        };

        cancelBtn.addEventListener('click', onCancel);
        confirmBtn.addEventListener('click', onConfirm);
        overlay.addEventListener('click', onCancel);

        // Escape pour annuler
        const onEscape = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', onEscape);
                onCancel();
            }
        };
        document.addEventListener('keydown', onEscape);
    });
}

document.getElementById('gameCloseBtn')?.addEventListener('click', async () => {
    const confirmed = await showConfirmModal();
    if (!confirmed) return;

    try {
        // Fermer le lobby (fait aussi le reset de la partie)
        await fetch('/admin/toggle-game', {
            method: 'POST',
            credentials: 'same-origin'
        });

        // Retour à l'état idle
        returnToIdle();

    } catch (error) {
        console.error('❌ Erreur fermeture:', error);
    }
});

function returnToIdle() {
    const stateGame = document.getElementById('stateGame');
    const stateLobby = document.getElementById('stateLobby');
    const stateIdle = document.getElementById('stateIdle');
    const bgText = document.getElementById('bgText');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');

    // Reset des états
    gameStarted = false;

    // Reset bouton démarrer
    const startBtn = document.getElementById('startGameBtn');
    if (startBtn) {
        startBtn.querySelector('.action-full-label').textContent = 'DÉMARRER';
        startBtn.querySelector('.action-full-sub').textContent = 'Lancer la partie';
        startBtn.classList.remove('started', 'loading');
        startBtn.classList.add('disabled');
    }

    // 🔥 Cacher game et lobby - RESET COMPLET avec styles inline
    if (stateGame) {
        stateGame.classList.remove('active');
        stateGame.style.display = '';
        stateGame.style.opacity = '';
        stateGame.style.visibility = '';
        stateGame.style.pointerEvents = 'none';
    }
    if (stateLobby) {
        stateLobby.classList.remove('active');
        stateLobby.style.display = '';
        stateLobby.style.opacity = '';
        stateLobby.style.visibility = '';
        stateLobby.style.pointerEvents = 'none';
    }

    // Vider la grille lobby
    const gridLobby = document.getElementById('playersGridLobby');
    if (gridLobby) gridLobby.innerHTML = '';
    const countEl = document.getElementById('lobbyPlayerCount');
    if (countEl) countEl.textContent = '0';

    // Vider la grille game
    const gridGame = document.getElementById('playersGridGame');
    if (gridGame) gridGame.innerHTML = '';

    // Reset COMPLET question wrapper
    const questionWrapper = document.getElementById('gameQuestionWrapper');
    if (questionWrapper) {
        questionWrapper.className = 'game-question-wrapper';
        questionWrapper.removeAttribute('style');
    }

    const mainPanel = document.getElementById('gameMainPanel');
    if (mainPanel) {
        mainPanel.classList.remove('visible', 'closing');
        mainPanel.removeAttribute('style');
    }

    const questionActions = document.getElementById('questionActions');
    if (questionActions) {
        questionActions.classList.remove('visible');
        questionActions.removeAttribute('style');
    }

    // Reset les réponses
    const answersGrid = document.getElementById('answersGrid');
    if (answersGrid) {
        answersGrid.innerHTML = '';
        answersGrid.classList.remove('six-answers');
    }

    const questionCard = document.querySelector('.question-card');
    if (questionCard) {
        questionCard.classList.remove('six-answers');
    }

    // Reset timer
    clearInterval(visualTimerInterval);
    const timerProgress = document.getElementById('timerProgress');
    const timerText = document.getElementById('timerText');
    if (timerProgress) {
        timerProgress.classList.remove('warning');
        timerProgress.style.strokeDashoffset = '0';
    }
    if (timerText) {
        timerText.classList.remove('warning');
        timerText.textContent = '10';
    }

    // Afficher idle
    stateIdle.style.display = 'grid';
    stateIdle.style.opacity = '1';
    stateIdle.style.visibility = 'visible';
    stateIdle.style.pointerEvents = '';
    
    // 🆕 Réafficher le bouton déconnexion
    const logoutBtn = document.getElementById('headerLogoutBtn');
    if (logoutBtn) logoutBtn.style.display = 'flex';

    // Reset header
    bgText.textContent = 'MASTER';
    bgText.classList.remove('lobby-active', 'game-active');
    statusDot.classList.remove('active');
    document.querySelector('.status-pill')?.classList.remove('game-mode');
    statusText.textContent = 'Inactif';

    // Réafficher les panneaux
    recentPanel.classList.remove('hidden');
    lastgamePanel.classList.remove('hidden');
    recentPanel.style.opacity = '1';
    lastgamePanel.style.opacity = '1';

    // ============================================
    // 🔥 FIX COMPLET PARTICULES ET BOUTON
    // ============================================

    // 1. Annuler toute animation en cours
    if (continuousAnimationId) {
        cancelAnimationFrame(continuousAnimationId);
        continuousAnimationId = null;
    }

    // 2. Reset COMPLET des variables d'animation
    isHovering = false;
    hoverTransition = 0;
    time = 0;
    movementFadeIn = 0;

    // 3. Reset du wrapper
    const btnWrapperEl = document.getElementById('btnWrapper');
    if (btnWrapperEl) {
        btnWrapperEl.classList.add('pulse-active');
        btnWrapperEl.style.pointerEvents = '';
        btnWrapperEl.style.opacity = '1';
        btnWrapperEl.style.transform = '';
        btnWrapperEl.style.visibility = 'visible';
        btnWrapperEl.style.display = '';

        // Réattacher les event listeners pour le hover
        btnWrapperEl.onmouseenter = () => { isHovering = true; };
        btnWrapperEl.onmouseleave = () => { isHovering = false; };
    }

    // 4. Reset du bouton JOUER
    const openLobbyBtn = document.getElementById('openLobbyBtn');
    if (openLobbyBtn) {
        openLobbyBtn.style.pointerEvents = '';
        openLobbyBtn.style.opacity = '1';
        openLobbyBtn.style.transform = '';
        openLobbyBtn.style.display = '';
        openLobbyBtn.style.visibility = 'visible';
        openLobbyBtn.disabled = false;
        openLobbyBtn.style.cursor = 'pointer';
    }

    // 5. Réafficher le bouton principal
    const mainBtn = document.querySelector('.main-action-btn');
    if (mainBtn) {
        mainBtn.style.opacity = '1';
        mainBtn.style.transform = 'scale(1)';
        mainBtn.style.display = '';
        mainBtn.style.pointerEvents = '';
        mainBtn.style.visibility = 'visible';
    }

    // 6. INITIALISER les particules
    const particles = document.querySelectorAll('.btn-wrapper .particle');
    particles.forEach((p) => {
        p.style.opacity = '0.6';
        p.style.transform = 'translate(0px, 0px) scale(1)';
        p.style.visibility = 'visible';
        p.style.display = '';
    });

    // 7. Réafficher le personnage chibi
    const btnCharacter = document.querySelector('.btn-character');
    if (btnCharacter) {
        btnCharacter.style.opacity = '0.95';
        btnCharacter.style.visibility = 'visible';
        btnCharacter.style.display = '';
        btnCharacter.classList.add('visible');
    }

    // 8. Forcer un reflow puis lancer l'animation avec délai
    void stateIdle.offsetWidth;

    setTimeout(() => {
        startContinuousAnimation();
    }, 200);

    // ============================================
    // FIN FIX PARTICULES
    // ============================================

    // Animations de retour
    anime({
        targets: '.idle-main',
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 500,
        easing: 'easeOutCubic'
    });

    anime({
        targets: '.idle-stats',
        opacity: [0, 1],
        duration: 500,
        delay: 100,
        easing: 'easeOutCubic'
    });

    anime({
        targets: '.recent-games-panel',
        opacity: [0, 1],
        translateX: [-40, 0],
        duration: 500,
        delay: 200,
        easing: 'easeOutCubic'
    });

    anime({
        targets: '.lastgame-panel',
        opacity: [0, 1],
        translateX: [40, 0],
        duration: 500,
        delay: 200,
        easing: 'easeOutCubic'
    });

    setTimeout(() => {
        loadIdleData();
    }, 500);

    console.log('✅ Retour à l\'état idle');
}



function focusStatsTab() {
    // Activer l'onglet Stats
    document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.panel-tab[data-tab="stats"]')?.classList.add('active');

    // Afficher le contenu Stats
    document.querySelectorAll('.panel-tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('tabStats')?.classList.add('active');
}















































function getLivesIconsHTML(iconType, currentLives, maxLives) {
    // Cas spécial : Katana (une seule icône groupée)
    if (iconType === 'katana') {
        const svgKey = Math.max(0, Math.min(3, currentLives));
        const isLost = currentLives === 0;
        return `<span class="life-icon katana-group${isLost ? ' lost' : ''}">${KATANA_SVGS[svgKey]}</span>`;
    }

    // Autres icônes : répéter maxLives fois
    const iconSVG = LIVES_ICONS[iconType] || LIVES_ICONS.heart;
    let html = '';

    for (let i = 0; i < maxLives; i++) {
        const isLost = i >= currentLives;
        html += `<span class="life-icon${isLost ? ' lost' : ''}">${iconSVG}</span>`;
    }

    return html;
}


// ============================================
// GESTION DU SÉLECTEUR D'ICÔNES
// ============================================

// Variable pour stocker l'icône sélectionnée
let selectedLivesIcon = 'heart';

/**
 * Initialise le sélecteur d'icônes de vies
 */
function initLivesIconSelector() {
    const iconBtns = document.querySelectorAll('.lives-icon-selector .icon-btn');
    const iconValueDisplay = document.getElementById('livesIconValue');

    iconBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const icon = btn.dataset.icon;

            // UI: Mettre à jour la sélection
            iconBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Mettre à jour l'affichage de la valeur (icône SVG)
            if (iconValueDisplay) {
                const iconSVG = LIVES_ICONS[icon] || LIVES_ICONS.heart;
                iconValueDisplay.innerHTML = iconSVG;
            }

            selectedLivesIcon = icon;

            // 🔥 NOUVEAU: Mettre à jour les cartes joueurs existantes
            updateLobbyPlayersIcons();

            // Envoyer au serveur
            try {
                await fetch('/admin/set-lives-icon', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ icon })
                });
            } catch (err) {
                console.error('Erreur set-lives-icon:', err);
            }
        });
    });

    updateLivesIconVisibility();
}


function updateLobbyPlayersIcons() {
    const currentLives = parseInt(document.querySelector('.lives-group .setting-option-btn.active')?.dataset.value) || 3;

    document.querySelectorAll('.player-card-mini-stat').forEach(stat => {
        stat.innerHTML = getLivesIconsHTML(selectedLivesIcon, currentLives, currentLives);
    });
}

/**
 * Met à jour la visibilité du sélecteur d'icônes selon le mode
 */
function updateLivesIconVisibility() {
    const iconGroup = document.getElementById('livesIconGroup');
    const isLivesMode = gameSettings.mode === 'vie';

    if (iconGroup) {
        iconGroup.classList.toggle('hidden', !isLivesMode);
    }
}

/**
 * Met à jour le sélecteur avec l'icône actuelle (depuis serveur)
 */
/**
 * Met à jour le sélecteur avec l'icône actuelle (depuis serveur)
 */
function updateLivesIconSelector(icon) {
    selectedLivesIcon = icon || 'heart';

    const iconBtns = document.querySelectorAll('.lives-icon-selector .icon-btn');
    const iconValueDisplay = document.getElementById('livesIconValue');

    iconBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.icon === selectedLivesIcon);
    });

    // Afficher l'icône SVG au lieu du nom texte
    if (iconValueDisplay) {
        const iconSVG = LIVES_ICONS[selectedLivesIcon] || LIVES_ICONS.heart;
        iconValueDisplay.innerHTML = iconSVG;
    }
}




// ============================================
// ANIMATION COMPTEUR
// ============================================
function animateCounter(element, target, duration = 1500, prefix = '', suffix = '') {
    const start = 0;
    const startTime = performance.now();

    // Si target contient 'K', convertir pour l'affichage final
    const isFormatted = typeof target === 'string' && target.includes('K');
    const numericTarget = isFormatted ? parseFloat(target) * 1000 : parseInt(target) || 0;

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing out cubic pour un effet satisfaisant
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (numericTarget - start) * eased);

        // Formater selon le type
        if (isFormatted && current >= 1000) {
            element.textContent = prefix + (current / 1000).toFixed(1) + 'K' + suffix;
        } else {
            element.textContent = prefix + current.toLocaleString() + suffix;
        }

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            // Valeur finale exacte
            element.textContent = prefix + target + suffix;
        }
    }

    requestAnimationFrame(update);
}



// Appeler après le DOM chargé
document.addEventListener('DOMContentLoaded', () => {
    initSettingsListeners();
    initLivesIconSelector();
    initHidePercentButton();
    initKickModal();
});

// 🆕 Initialiser le bouton pour masquer les pourcentages
function initHidePercentButton() {
    const btn = document.getElementById('hidePercentBtn');
    if (!btn) return;
    
    btn.addEventListener('click', () => {
        hidePercentsEnabled = !hidePercentsEnabled;
        btn.classList.toggle('hidden', hidePercentsEnabled);
        
        const answersGrid = document.getElementById('answersGrid');
        if (answersGrid) {
            answersGrid.classList.toggle('hide-percents', hidePercentsEnabled);
        }
        
        console.log(`👁️ Pourcentages ${hidePercentsEnabled ? 'masqués' : 'visibles'}`);
    });
}

// 🆕 Afficher/masquer le bouton œil (appelé avec le timer)
function showHidePercentButton(show) {
    const btn = document.getElementById('hidePercentBtn');
    if (btn) {
        btn.classList.toggle('visible', show);
        
        // 🆕 Si on masque le bouton (fin de question), réafficher les % pour voir les résultats
        // Mais on NE reset PAS hidePercentsEnabled pour conserver l'état à la prochaine question
        if (!show) {
            const answersGrid = document.getElementById('answersGrid');
            if (answersGrid) {
                answersGrid.classList.remove('hide-percents');
            }
        }
    }
}

// 🆕 Appliquer l'état hide-percents à la grille (conserve l'état entre questions)
function applyHidePercentsState() {
    const answersGrid = document.getElementById('answersGrid');
    const btn = document.getElementById('hidePercentBtn');
    
    if (answersGrid && hidePercentsEnabled) {
        answersGrid.classList.add('hide-percents');
    }
    
    // Mettre à jour l'icône du bouton selon l'état
    if (btn) {
        btn.classList.toggle('hidden', hidePercentsEnabled);
    }
}