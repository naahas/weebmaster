// ============================================
// WEEBMASTER - Server Principal - TIEBREAKER FIX
// ============================================

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { Server } = require('socket.io');
const axios = require('axios');
const { db, supabase, SERIES_FILTERS, getFilterSeries } = require('./dbs');

const app = express();
const PORT = process.env.PORT || 7000;

const MIN_PLAYERS_FOR_STATS = 15; // Minimum de joueurs pour comptabiliser les stats
const MIN_PLAYERS_FOR_TEAM_STATS = 20; // Minimum de joueurs pour comptabiliser les stats en mode Rivalité

let lastRefreshPlayersTime = 0;
const REFRESH_COOLDOWN_MS = 20000;

let connectionsByIP = new Map();
const MAX_CONNECTIONS_PER_IP = 5;

let activityLogs = [];
let lastGlobalWinner = null;


let winnerScreenData = null;

const MAX_LOGS = 30;
let playerColors = {}; // Associer chaque joueur à une couleur

let lastStatsUpdate = 0;
const STATS_THROTTLE_MS = 500; // Max 2 updates par seconde
let pendingStatsUpdate = false;


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
const { getAllNamesToBlock } = require('./character-variants');

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

// 🎴 Configuration Collect
const COLLECT_CONFIG = {
    MIN_PLAYERS: 2,
    MAX_PLAYERS: 5,
    STARS_TO_WIN: 3
};

// 🎮 Configuration Survie
const SURVIE_CONFIG = {
    MIN_PLAYERS: 2,
    MAX_PLAYERS: 50,
    DEFAULT_TIMER: 30
};

// 🎮 Personnages du mode Survie
const SURVIE_CHARACTERS = [
    { id: 'erza', name: 'Erza', imageUrl: 'erza_trace.png', size: 120,
        defaultDialogues: ["Si tu veux me tenir compagnie n'hésite pas , j'ai besoin d'un partenaire d'entraînement.", "Tu veux un morceau de fraisier ? ...Non ? Tant mieux, je n'avais pas l'intention de partager.", "Dis , tu pourrais me dire comment tu trouves ma nouvelle armure ? Je ne la trouve pas très efficace..."], questDialogues: {} },
    { id: 'denji', name: 'Denji', imageUrl: 'denji_trace.png', size: 120,
        defaultDialogues: ["Hé, t'aurais pas une copine à me présenter ?", "Pourquoi j'ai jamais de chance avec les filles...", "ELLE EST OÙ ?! ...Ah Salut mec , j'tavais pas vu désolé."], questDialogues: {} },
    { id: 'ban', name: 'Ban', imageUrl: 'ban_trace.png', size: 120,
        defaultDialogues: ["Ahhh je cherche quelqu'un d'intéressant. Dis , t'es intéressant toi ?", "Salut , tu veux me tenir compagnie ? J'espère que tu tiens bien la bière.", "Laisse moi dormir mon pote !"], questDialogues: {} },
    { id: 'toji', name: 'Toji', imageUrl: 'toji_trace.png', size: 120,
        defaultDialogues: ["Les exorcistes me font rire. Tout ce pouvoir et ils ne savent même pas se battre.", "Hé toi , t'as misé sur qui ? Dis le moi.", "Mon fils ? Changeons de sujet."], questDialogues: {} },
    { id: 'minato', name: 'Minato', imageUrl: 'minato_trace.png', size: 120,
        defaultDialogues: ["Oh tu as entendu de parler de moi ? Merci ca me flatte hahaha.", "Quand tu as quelqu'un à protéger , tu as tendance à agir sans reflechir alors fais attention ! ", "On me surnomme l'éclair jaune et toi ?"], questDialogues: {} },
    { id: 'ulquiorra', name: 'Ulquiorra', imageUrl: 'ulquiorra_trace.png', size: 120,
        defaultDialogues: ["Humain , a quoi penses-tu ?", "Tout se passera selon ses ordres.", "Tu es insignifiant. ...Ce n'est pas une insulte, c'est un fait."], questDialogues: {} },
    { id: 'tsunade', name: 'Tsunade', imageUrl: 'tsunade_trace.png', size: 120,
        defaultDialogues: ["Si tu es blessé, viens me voir. Sinon, ne me dérange pas, j'ai du sake à finir.", "Hé toi , ne dis pas a personne que tu m'as vu entrée dans ce casino !", "C'est beau la jeunesse."], questDialogues: {} },
    { id: 'naruto', name: 'Naruto', imageUrl: 'naruto_trace.png', size: 120,
        defaultDialogues: ["Salut ! T'es pas d'ici ?", "J'ai enfin pu réaliser mon rêve , j'espère que ce sera le cas pour toi aussi !", "Je connais un bon restaurant donc n'hésite pas à passer me voir à l'occasion."], questDialogues: {} },
    { id: 'luffy', name: 'Luffy', imageUrl: 'luffy_trace.png', size: 120,
        defaultDialogues: ["Dis toi , tu sais qui deviendras le roi des pirates ? Tu sais c'est qui ?? Hein tu sais c'est qui ??? C'est moiiiiii.", "T'as l'air drôle toi ! Rejoins mon équipage ! Allez !!!", "J'ai faim.............."], questDialogues: {} },
    { id: 'ichigo', name: 'Ichigo', imageUrl: 'ichigo_trace.png', size: 120,
        defaultDialogues: ["Salut , tu cherches quelque chose ?", "Désole , je suis un peu occupé , on se parle plus tard.", "Si t'as besoin de quelque chose , n'hésite pas !"], questDialogues: {} },
    { id: 'mikasa', name: 'Mikasa', imageUrl: 'mikasa_trace.png', size: 120,
        defaultDialogues: ["Dis , tu l'as vu ? Où est-il ? Je sens son odeur sur toi , tu l'as rencontré ?", "Je dois le retrouver...", "Toi , va te mettre à l'abri , on ne sait jamais."], questDialogues: {} },
    { id: 'rengoku', name: 'Rengoku', imageUrl: 'rengoku_trace.png', size: 120,
        defaultDialogues: ["DÉLICIEUX !! .. Pardon , je ne t'avais pas vu , que puis-je faire pour toi hahaha ?", "Efforce toi d'être toujours dynamique et la vie sera plus belle hahaha.", "Enflamme ton coeur ! Si tu avances avec détermination, rien ne pourra t'arrêter !"], questDialogues: {} },
    { id: 'killua', name: 'Killua', imageUrl: 'killua_trace.png', size: 120,
        defaultDialogues: ["Toi , t'as l'air faible... J'mennuiiiiiiiiiiie trop.", "Dis , tu sais jouer au YoYo ? Regarde ça !", "Hé toi , évite de me bousculer si tu tiens a la vie , juste un conseil."], questDialogues: {} },
    { id: 'shoto', name: 'Shoto', imageUrl: 'shoto_trace.png', size: 120,
        defaultDialogues: ["Tu as déjà goûté du soba froid ? Non ? Tu rates ta vie.", "Salut... De quoi veux-tu parler ?", "Tu sais , la famille c'est important , j'en ai enfin pris conscience..."], questDialogues: {} },
    { id: 'frieren', name: 'Frieren', imageUrl: 'frieren_trace.png', size: 120,
        defaultDialogues: ["Salut , saurais-tu où je pourrais trouver un grimoire ?", "Ah, un humain. Dans cent ans tu ne seras plus là... Désolée, c'était impoli ?", "Désolé , je ne suis pas du coin , je suis voyageur moi aussi."], questDialogues: {} },
    { id: 'tsuna', name: 'Tsuna', imageUrl: 'tsuna_trace.png', size: 120,
        defaultDialogues: ["HIII ! Tu m'as fait peur ! ...Désolé, je suis un peu nerveux en ce moment.", "Je vais le faire ! Je peux le faire pour mes amis , je ne reculerai plus !", "J'ai encore eu une mauvaise note , ma mère va me tuer..."], questDialogues: {} },
    { id: 'zoro', name: 'Zoro', imageUrl: 'zoro_trace.png', size: 120,
        defaultDialogues: ["Purée je suis où là... Dis toi , tu sais où on est ?" , "Hé touche pas a mon sabre , tu vas le regretter." , "Si t'as de la bière , je prends."], questDialogues: {} },
    { id: 'goku', name: 'Goku', imageUrl: 'goku_trace.png', size: 120,
        defaultDialogues: ["Hé toi , ca te dit de me servir de partenaire ? T'as l'air costaud. ", "Ma femme va encore me tuer si je rentre en retard... Bon, je me dépêche !", "La Terre est enfin paisible... Ou presque , j'entends des missiles..."], questDialogues: {} },
    { id: 'gohan', name: 'Gohan', imageUrl: 'gohan_trace.png', size: 120,
        defaultDialogues: ["Oh salut , tu as besoin de quelque chose ?", "Plus tard je veux être un grand scientifique et toi , c'est quoi ton rêve ?", "Quelques fois j'ai peur de moi-même..."], questDialogues: {} },
    { id: 'rem', name: 'Rem', imageUrl: 'rem_trace.png', size: 120,
        defaultDialogues: ["Tu as l'air fatigué. Rem peut te préparer quelque chose si tu veux ?", "Tu me regardes bizarrement... Tu ne confonds pas Rem avec sa sœur, quand même ?", "Rem est là pour toi !"], questDialogues: {} },
    { id: 'robin', name: 'Robin', imageUrl: 'robin_trace.png', size: 120,
        defaultDialogues: ["Tu es vraiment quelqu'un d'intéressant. J'aimerais en savoir plus sur toi.", "Tu veux savoir comment tu vas mourir ? ...Je plaisante. Peut-être.", "Es-tu la réincarnation d'un squelette antique ?"], questDialogues: {} },
    { id: 'thorfinn', name: 'Thorfinn', imageUrl: 'thorfinn_trace.png', size: 120,
        defaultDialogues: ["Quoi ? T'as un problème ?", "Dégage de mon chemin , j'ai un compte à régler.", "Si tu ne veux pas avoir d'ennuis , passe ton chemin."], questDialogues: {} },
    { id: 'itachi', name: 'Itachi', imageUrl: 'itachi_trace.png', size: 120,
        defaultDialogues: ["Toi , tes yeux reflètent quelque chose de profond.", "Tu ne sais rien de moi. Et crois-moi... c'est mieux ainsi.", "La prochaine fois que tu croiseras mon regard... détourne les yeux."], questDialogues: {} },
    { id: 'yor', name: 'Yor', imageUrl: 'yor_trace.png', size: 120,
        defaultDialogues: ["Oh mon dieu , j'ai oubliée de préparer le dîner...", "Tu veux goûter ma cuisine ?", "Moi ? Je suis juste une fonctionnaire ! Enchanté."], questDialogues: {} },
    { id: 'loid', name: 'Loid', imageUrl: 'loid_trace.png', size: 120,
        defaultDialogues: ["Enchanté. Je suis psychiatre... Enfin , c'est ce que dit ma carte de visite.", "Ma famille est un peu... particulière. Mais je ne l'échangerais pour rien au monde.", "Tu as l'air tendu. Un conseil : souris toujours , même quand tout s'effondre."], questDialogues: {} },
    { id: 'gojo', name: 'Gojo', imageUrl: 'gojo_trace.png', size: 120,
        defaultDialogues: ["Toi , tu es.. spécial.", "Aaaaaaaaaah j'ai envie de faire une sieste , pas toi ?", "Hé toi , tu veux devenir ecorciste ?"], questDialogues: {} },
    { id: 'jotaro', name: 'Jotaro', imageUrl: 'jotaro_trace.png', size: 120,
        defaultDialogues: ["Encore un coup de ce vieux débris, je ne pourrai donc jamais être tranquille...", "... T'es encore là toi ?", "Pourquoi tu me fixes ?"], questDialogues: {} },
    { id: 'saitama', name: 'Saitama', imageUrl: 'saitama_trace.png', size: 120,
        defaultDialogues: ["Mec , tu peux pas me remplacer a ma réunion ? Allez sois sympa...", "L'ennui c'es pas cool , t'es pas d'accord ?", "Je sais pas quoi manger ce soir , t'as une idée ?"], questDialogues: {} },
    { id: 'seiya', name: 'Seiya', imageUrl: 'seiya_trace.png', size: 120,
        defaultDialogues: ["Fais exploser ton cosmos !", "Tant qu'il me restera un souffle de vie, je me relèverai. Retiens ça et prends en de la graine..", "Désolé mais j'ai pas de temps à perdre , je suis pressé !"], questDialogues: {} },
    { id: 'saber', name: 'Saber', imageUrl: 'saber_trace.png', size: 120,
        defaultDialogues: ["Je suis le Servant Saber. Identifie-toi... Es-tu mon Master ?", "Il n'y aurait pas un bon restaurant dans le coin ? ...C'est pour un ami.", "Ne te méprends pas, je ne suis pas une demoiselle en détresse. Je suis le roi."], questDialogues: {} },
    { id: 'eren', name: 'Eren', imageUrl: 'eren_trace.png', size: 120,
        defaultDialogues: ["Je les éliminerai tous. Jusqu'au dernier... Oh, je parle des titans, évidemment.", "Dis , t'as déjà vu la mer ?", "La liberté... Tu sais ce que c'est, toi ? Moi je suis prêt à tout pour elle."], questDialogues: {} },
    { id: 'madara', name: 'Madara', imageUrl: 'madara_trace.png', size: 120,
        defaultDialogues: ["Toi aussi , tu veux danser ? Fais en sorte que ta dance dure au moins 1 minute.", "Ce monde n'est qu'illusion. Mais toi... tu es réel, non ?", "Ne m'adresse pas la parole."], questDialogues: {} },
    { id: 'vegeta', name: 'Vegeta', imageUrl: 'vegeta_trace.png', size: 120,
        defaultDialogues: ["Qui je suis ? Comment oses-tu l'ignorer ? Je suis le Prince , le plus grand de tous.", "Mh tu ne m'intéresses pas , c'est lui que je veux.", "Qu'est-ce que tu regardes petit insecte ?"], questDialogues: {} },
    { id: 'makima', name: 'Makima', imageUrl: 'makima_trace.png', size: 120,
        defaultDialogues: ["Assis.", "Mh , tu sembles être quelqu'un d'intéressant...", "Tu es libre pour aller au cinéma avec moi demain ?"], questDialogues: {} },
    { id: 'cc', name: 'CC', imageUrl: 'cc_trace.png', size: 120,
        defaultDialogues: ["Tu aimes les pizzas toi aussi ?", "Toi , tu as un avenir tragique qui t'attend.", "Tu veux passer un contrat avec moi ? ...Réfléchis bien avant de répondre."], questDialogues: {} },
    { id: 'light', name: 'Light', imageUrl: 'light_trace.png', size: 120,
        defaultDialogues: ["Vous subirez tous le jugement suprême.", "Hé toi , tu t'appelles comment ? Juste pour savoir.", "Le monde a besoin d'ordre. Mais ça, tu ne peux pas encore le comprendre."], questDialogues: {} },
    { id: 'gintoki', name: 'Gintoki', imageUrl: 'gintoki_trace.png', size: 120,
        defaultDialogues: ["T'as vraiment une tête à faire peur toi...", "T'as pas du boulot à me filer ? J'suis un peu fauché là..", "Hé touche pas à mon parfait au chocolat !"  , "Pourquoi je tombe que sur des fous aujourd'hui..."], questDialogues: {} },
    { id: 'boruto', name: 'Boruto', imageUrl: 'boruto_trace.png', size: 120,
        defaultDialogues: ["Arrrrh je ne suis pas juste le fils de mon père !", "Hé toi ! T'es nouveau ici ? Moi c'est Boruto, retiens bien ce nom !", "Tu veux voir mes nouvelles techniques ?"], questDialogues: {} },
    { id: 'sasuke', name: 'Sasuke', imageUrl: 'sasuke_trace.png', size: 120,
        defaultDialogues: ["Hmph, je n'ai rien à te dire.", "Encore un peu , j'y suis presque , j'accomplirai mon objectif sans faute...", "Dégage."], questDialogues: {} },
    { id: 'usopp', name: 'Usopp', imageUrl: 'usopp_trace.png', size: 120,
        defaultDialogues: ["Misère , pourquoi il n'y a que des brutes par ici ?", "Hé toi fais gaffe hein , j'ai une armée derrière moi !", "Olala j'ai le cafard..."], questDialogues: {} },
    { id: 'nami', name: 'Nami', imageUrl: 'nami_trace.png', size: 120,
        defaultDialogues: ["Salut toi ! Tu n'aurais pas un peu d'argent à me prêter ? Je te les rendrai, promis, hihi.", "Je sais que je suis belle mais c'est pas une raison pour me regarder comme ça !", "Dis , tu penses quoi de ma nouvelle tenue ? Elle est mignonne hein ? Avoue !"], questDialogues: {} },
    { id: 'kakashi', name: 'Kakashi', imageUrl: 'kakashi_trace.png', size: 120,
        defaultDialogues: ["Yo. Désolé du retard , un chat noir m'a barré la route et j'ai dû faire un détour.", "Tu veux un conseil ? Ceux qui abandonnent leurs amis sont pires que des ordures.", "Hmm ? Mon masque ? Ah , c'est une longue histoire... que je ne te raconterai pas."], questDialogues: {} },
    { id: 'dio', name: 'Dio', imageUrl: 'dio_trace.png', size: 120,
        defaultDialogues: ["**KONO DIO DA** !! Tu ne t'attendais pas à me voir , n'est-ce pas ?", "Tu croyais que ton premier interlocuteur serait un PNJ lambda ? Mais c'était moi , DIO !", "Le monde m'appartient. Toi aussi d'ailleurs. Approche."], questDialogues: {} },
    { id: 'ram', name: 'Ram', imageUrl: 'ram_trace.png', size: 120,
        defaultDialogues: ["Qu'est-ce que tu veux ? Ram est occupée.", "Si tu cherches ma sœur , elle est quelque part par là. Ne me dérange pas pour ça.", "Cet idiot ferait mieux de ne pas traîner dans le coin... Toi non plus d'ailleurs."], questDialogues: {} },
    { id: 'edward', name: 'Edward', imageUrl: 'edward_trace.png', size: 120,
        defaultDialogues: ["QUI EST-CE QUE TU TRAITES DE MINUS ?! ...Ah , t'as rien dit ? Pardon.", "L'alchimie c'est la science de la compréhension , de la décomposition et de la reconstruction.", "Un conseil : ne tente jamais de transmutation humaine. Crois-moi."], questDialogues: {} },
    { id: 'lelouch', name: 'Lelouch', imageUrl: 'lelouch_trace.png', size: 120,
        defaultDialogues: ["Si le roi ne bouge pas , ses sujets ne le suivront pas.", "Tu veux changer le monde ? Moi aussi. Mais es-tu prêt à en payer le prix ?", "Les échecs m'ont appris une chose : il faut toujours sacrifier des pièces pour gagner."], questDialogues: {} },
    { id: 'levi', name: 'Levi', imageUrl: 'levi_trace.png', size: 120,
        defaultDialogues: ["Tch. C'est sale ici. Tu pourrais au moins nettoyer avant de me parler.", "Choisis. Pas de regrets. Quel que soit ton choix , avance.", "Je suis le soldat le plus fort de l'humanité. Pas le plus aimable."], questDialogues: {} },
    { id: 'kaneki', name: 'Kaneki', imageUrl: 'kaneki_trace.png', size: 120,
        defaultDialogues: ["Je ne suis ni humain ni goule... Je suis les deux à la fois.", "Tu sais ce qui fait le plus mal ? C'est d'être seul.", "1000 moins 7... 993... 986... Pardon , une mauvaise habitude."], questDialogues: {} },
    { id: 'asta', name: 'Asta', imageUrl: 'asta_trace.png', size: 120,
        defaultDialogues: ["JE VAIS DEVENIR LE ROI DES SORCIERS !!! ...Pourquoi tu recules ?", "J'ai pas de magie mais j'ai mes bras , mes jambes et ma détermination !", "Abandonne ? Ce mot n'existe pas dans mon vocabulaire ! AAAAAAH !"], questDialogues: {} },
    { id: 'tanjiro', name: 'Tanjiro', imageUrl: 'tanjiro_trace.png', size: 120,
        defaultDialogues: ["Bonjour ! Tu as l'air d'être quelqu'un de bien , je le sens.", "Ma famille... je ferai tout pour protéger ceux qui me sont chers.", "Tu sens cette odeur ? C'est l'odeur de la gentillesse. Elle vient de toi."], questDialogues: {} },
    { id: 'sanji', name: 'Sanji', imageUrl: 'sanji_trace.png', size: 120,
        defaultDialogues: ["MELLORINE !! ...Ah pardon , je croyais que t'étais une fille. Dégage.", "La cuisine c'est de l'amour. Tu veux goûter mon plat du jour ?", "Un vrai homme ne frappe jamais une femme. Même si elle essaie de le tuer."], questDialogues: {} },
    { id: 'yugi', name: 'Yugi', imageUrl: 'yugi_trace.png', size: 120,
        defaultDialogues: ["Tu veux faire un duel ? J'ai toujours mon deck sur moi !", "Le cœur des cartes ne ment jamais... Fais confiance à ton deck !", "Hé , tu connais la carte Exodia ? Non ? Alors ne me cherche pas."], questDialogues: {} },
    { id: 'franky', name: 'Franky', imageUrl: 'franky_trace.png', size: 120,
        defaultDialogues: ["SUUUUPEEEEER !! Tu veux voir mon nouveau gadget ?", "Le Sunny est le plus beau navire du monde et c'est MOI qui l'ai construit !", "Cola ! J'ai besoin de cola ! Tu en aurais pas sur toi ?"], questDialogues: {} },
    { id: 'sukuna', name: 'Sukuna', imageUrl: 'sukuna_trace.png', size: 120,
        defaultDialogues: ["Tu oses m'adresser la parole , vermisseau ?", "Je m'ennuie... Divertis-moi ou disparais.", "Connais ta place. Tu n'es rien face au Roi des Fléaux."], questDialogues: {} },
    { id: 'akaza', name: 'Akaza', imageUrl: 'akaza_trace.png', size: 120,
        defaultDialogues: ["Deviens un démon ! Avec ta force , tu serais magnifique !", "Je déteste les faibles... Mais toi , tu as quelque chose dans le regard.", "Montre-moi ta technique de combat ! Allez , bats-toi !"], questDialogues: {} },
    { id: 'pain', name: 'Pain', imageUrl: 'pain_trace.png', size: 120,
        defaultDialogues: ["Connais-tu la douleur ? Le monde ne peut connaître la paix sans elle.", "Je suis Dieu. Et Dieu ne se trompe jamais.", "Ce monde est rempli de haine... Toi aussi tu la ressens , n'est-ce pas ?"], questDialogues: {} },
    { id: 'hisoka', name: 'Hisoka', imageUrl: 'hisoka_trace.png', size: 120,
        defaultDialogues: ["Hmm... Tu as du potentiel. Reviens me voir quand tu seras plus fort. ♠", "Mon sang bouillonne... J'adore quand je croise quelqu'un d'intéressant. ♣", "Tu veux jouer ? Attention , mes jeux finissent rarement bien pour l'adversaire. ♥"], questDialogues: {} },
    { id: 'brook', name: 'Brook', imageUrl: 'brook_trace.png', size: 120,
        defaultDialogues: ["Yohohoho ! Pourrais-je voir tes sous-vêtements ? ...C'est une blague ! Enfin...", "La musique adoucit les mœurs ! Tu veux entendre Binks' Sake ?", "Je suis mort de rire ! Ah mais je suis déjà mort... YOHOHOHO !"], questDialogues: {} },
    { id: 'aizen', name: 'Aizen', imageUrl: 'aizen_trace.png', size: 120,
        defaultDialogues: ["Depuis quand crois-tu que je ne t'observais pas ?", "L'admiration est le sentiment le plus éloigné de la compréhension.", "Tout se passe selon mon plan. Même cette conversation."], questDialogues: {} },
    { id: 'gaara', name: 'Gaara', imageUrl: 'gaara_trace.png', size: 120,
        defaultDialogues: ["Les liens que j'ai forgés... Ce sont eux qui m'ont sauvé.", "Tu veux être mon ami ? ...Pardon , je ne suis pas encore habitué à demander ça.", "Le sable protège ceux que j'aime. Ne l'oublie pas."], questDialogues: {} },
    { id: 'koro', name: 'Koro-sensei', imageUrl: 'koro_trace.png', size: 120,
        defaultDialogues: ["Nurufufufu ! Un élève de plus ? Bienvenue dans ma classe !", "La vitesse Mach 20 c'est pratique pour faire les courses du monde entier !", "Un bon professeur ne renonce jamais sur ses élèves. Jamais."], questDialogues: {} },
    { id: 'law', name: 'Law', imageUrl: 'law_trace.png', size: 120,
        defaultDialogues: ["Room... Ah pardon , réflexe. Tu voulais quelque chose ?", "Je ne suis l'allié de personne. Mais on peut coopérer... temporairement.", "Mon allié au chapeau m'a encore entraîné dans ses plans foireux..."], questDialogues: {} },
    { id: 'nezuko', name: 'Nezuko', imageUrl: 'nezuko_trace.png', size: 120,
        defaultDialogues: ["Mmm ! Mmmmh !", "...*te regarde avec de grands yeux curieux*...", "*serre son bambou et hoche la tête gentiment*"], questDialogues: {} },
    { id: 'chopper', name: 'Chopper', imageUrl: 'chopper_trace.png', size: 120,
        defaultDialogues: ["Ça ne me fait pas plaisir du tout que tu me complimentes , idiot ! ...Hehehe !", "Tu es blessé ? Montre-moi , je suis médecin !", "Arrête de me flatter , crétin ! *danse de joie*"], questDialogues: {} },
    { id: 'natsu', name: 'Natsu', imageUrl: 'natsu_trace.png', size: 120,
        defaultDialogues: ["JE SUIS TOUT FEU TOUT FLAMME !! Hé , tu veux goûter mon poing enflammé ?!", "Mon petit compagnon bleu ! T'es où ?! ...Ah c'est toi. T'as pas du poisson sur toi par hasard ?", "Cet exhibitionniste de mage de glace m'a encore cherché... ATTENDS JE VAIS LE CRAMER !"], questDialogues: {} },
    { id: 'ace', name: 'Ace', imageUrl: 'ace_trace.png', size: 120,
        defaultDialogues: ["Mon petit frère deviendra le roi des pirates , c'est certain.", "Tu veux voir mes pouvoirs de feu ? ...Attends , je m'endors... *zzz*", "La vraie question c'est : est-ce que j'étais heureux d'être né ? Oui. Oui je l'étais."], questDialogues: {} },
    { id: 'giorno', name: 'Giorno', imageUrl: 'giorno_trace.png', size: 120,
        defaultDialogues: ["J'ai un rêve... Devenir un Gang-Star !", "La détermination , c'est la seule chose qui ne peut pas être volée.", "Connais-tu le Requiem ? Non ? Tant mieux pour toi."], questDialogues: {} },
    { id: 'kurapika', name: 'Kurapika', imageUrl: 'kurapika_trace.png', size: 120,
        defaultDialogues: ["Mes yeux deviennent écarlates quand je suis en colère. Ne me mets pas en colère.", "La Brigade Fantôme... Un jour , je les retrouverai tous.", "Je n'ai pas besoin d'amis. ...Enfin , peut-être un ou deux."], questDialogues: {} },
    { id: 'maki', name: 'Maki', imageUrl: 'maki_trace.png', size: 120,
        defaultDialogues: ["Pas besoin d'énergie occulte pour être forte. Regarde.", "Le clan Zenin peut aller se faire voir. Je me suis faite toute seule.", "Tu veux t'entraîner ? Préviens , j'y vais pas doucement."], questDialogues: {} },
    { id: 'shoyo', name: 'Shoyo', imageUrl: 'shoyo_trace.png', size: 120,
        defaultDialogues: ["GWAAAH ! Le volleyball c'est trop cool !! Tu joues ?!", "Je suis peut-être petit mais je saute plus haut que tout le monde !", "Un jour je serai comme le Petit Géant ! Tu verras !"], questDialogues: {} },
    { id: 'anya', name: 'Anya', imageUrl: 'anya_trace.png', size: 120,
        defaultDialogues: ["Waku waku ! C'est excitant ici !", "Anya veut des cacahuètes ! Tu en as ?", "Anya peut lire dans tes pensées... hehe , c'est un secret !"], questDialogues: {} },
    { id: 'kuroko', name: 'Kuroko', imageUrl: 'kuroko_trace.png', size: 120,
        defaultDialogues: ["...Je suis là depuis le début. Tu ne m'avais pas vu ?", "Mon style de jeu c'est de rendre les autres meilleurs.", "Le basketball , c'est un sport d'équipe. On ne gagne jamais seul."], questDialogues: {} },
    { id: 'gon', name: 'Gon', imageUrl: 'gon_trace.png', size: 120,
        defaultDialogues: ["Salut ! Tu veux être mon ami ? Moi c'est Gon !", "Mon père est quelque part dans le monde... Un jour je le retrouverai !", "Mon meilleur ami aux cheveux blancs... Tu l'as vu par ici ?"], questDialogues: {} },
    { id: 'bakugo', name: 'Bakugo', imageUrl: 'bakugo_trace.png', size: 120,
        defaultDialogues: ["DÉGAGE DE MON CHEMIN !! JE SUIS LE NUMÉRO 1 !!", "Tu veux mourir ?! Mon explosif va te faire comprendre ta place !", "Ce nerd inutile... Un jour je le surpasserai tellement qu'il pourra même plus me voir !"], questDialogues: {} },
    { id: 'lucy', name: 'Lucy', imageUrl: 'lucy_trace.png', size: 120,
        defaultDialogues: ["Je suis une constellationniste ! Mes esprits stellaires sont mes amis !", "Cet idiot de mage de feu a encore détruit la moitié de la ville... Mon loyer va exploser.", "Tu veux lire mon roman ? ...Non en fait oublie , c'est pas encore fini."], questDialogues: {} },
    { id: 'joseph', name: 'Joseph', imageUrl: 'joseph_trace.png', size: 120,
        defaultDialogues: ["TON PROCHAIN MOT SERA... 'Comment tu as fait ?!'", "NIGERUNDAYOOO !! ...C'est une technique de survie , pas de la lâcheté !", "OH MY GOD ! OH NOOO ! ...Pardon , réflexe."], questDialogues: {} },
    { id: 'grimmjow', name: 'Grimmjow', imageUrl: 'grimmjow_trace.png', size: 120,
        defaultDialogues: ["Je suis le Roi ! Tu ferais mieux de t'en souvenir !", "Ce shinigami de pacotille... La prochaine fois c'est MOI qui gagne.", "Tu me regardes de travers ? T'as envie de crever ?"], questDialogues: {} },
    { id: 'zaraki', name: 'Zaraki', imageUrl: 'zaraki_trace.png', size: 120,
        defaultDialogues: ["T'as l'air fort. Bats-toi avec moi !", "Le combat c'est tout ce qui compte. Le reste c'est de la déco.", "Ma petite lieutenant ! ...Ah , elle est partie chercher des bonbons."], questDialogues: {} },
    { id: 'l', name: 'L', imageUrl: 'l_trace.png', size: 120,
        defaultDialogues: ["Il y a 5% de chances que tu sois intéressant. Je vais t'observer.", "Tu veux un gâteau ? J'en ai trop commandé.", "Je soupçonne tout le monde. C'est une habitude professionnelle."], questDialogues: {} },
    { id: 'sabo', name: 'Sabo', imageUrl: 'sabo_trace.png', size: 120,
        defaultDialogues: ["Mes deux frères comptent plus que tout. On est liés par un serment.", "Le Gouvernement Mondial cache trop de choses. Je vais tout révéler.", "Ces flammes... C'est l'héritage de mon grand frère. Je les protégerai."], questDialogues: {} },
    { id: 'trunks', name: 'Trunks', imageUrl: 'trunks_trace.png', size: 120,
        defaultDialogues: ["Je viens du futur. Crois-moi , tu veux pas savoir ce qui s'y passe.", "Mon père ne l'admettra jamais mais il tient à moi.", "Cette épée ? C'est pour les androïdes. Enfin... c'était."], questDialogues: {} },
    { id: 'alphonse', name: 'Alphonse', imageUrl: 'alphonse_trace.png', size: 120,
        defaultDialogues: ["Grand frère et moi on cherche la Pierre Philosophale. Tu l'as vue ?", "Mon corps est une armure mais mon cœur est bien là.", "Tu veux voir mon chat ? ...Il est dans l'armure. Chut , dis rien à Ed."], questDialogues: {} },
    { id: 'chrollo', name: 'Chrollo', imageUrl: 'chrollo_trace.png', size: 120,
        defaultDialogues: ["Je collectionne les capacités rares. La tienne m'intéresse peut-être.", "La Brigade Fantôme n'a pas de règles. Juste des liens.", "Un bon livre vaut mieux qu'un combat. Mais les deux ensemble..."], questDialogues: {} },
    { id: 'zenitsu', name: 'Zenitsu', imageUrl: 'zenitsu_trace.png', size: 120,
        defaultDialogues: ["JE VAIS MOURIR !! ON VA TOUS MOURIR !! MA DÉESSE AUX YEUX ROSES !!", "Je ne sais faire qu'une seule technique... Mais elle est mortelle.", "Quand je dors je deviens fort. Éveillé , je suis une catastrophe."], questDialogues: {} },
    { id: 'inosuke', name: 'Inosuke', imageUrl: 'inosuke_trace.png', size: 120,
        defaultDialogues: ["JE SUIS INOSUKE HASHIBIRA !! LE ROI DE LA MONTAGNE !!", "Hé le pleurnichard blond ! ...Ah non t'es pas lui. Tu veux te battre quand même ?!", "Ma tête de sanglier c'est ma fierté ! Touche pas !"], questDialogues: {} },
    { id: 'meruem', name: 'Meruem', imageUrl: 'meruem_trace.png', size: 120,
        defaultDialogues: ["Tu es faible. Mais ta présence est... intrigante.", "Cette joueuse de Gungi... Son nom résonne encore dans mon esprit.", "Le pouvoir absolu est ennuyeux. Ce qui compte c'est ce qu'on en fait."], questDialogues: {} },
    { id: 'hancock', name: 'Hancock', imageUrl: 'hancock_trace.png', size: 120,
        defaultDialogues: ["Je suis si belle que même ta pierre serait pétrifiée.", "MON CHÉRI AU CHAPEAU DE PAILLE !! ...Pardon , tu disais quelque chose ?", "Regarde-moi de haut si tu veux , je suis une impératrice."], questDialogues: {} },
    { id: 'yuno', name: 'Yuno', imageUrl: 'yuno_trace.png', size: 120,
        defaultDialogues: ["Je serai le Roi-Mage. Asta sera mon rival pour toujours.", "Le vent est mon allié. Il me murmure des choses.", "Parler est inutile. Je laisse ma magie s'exprimer."], questDialogues: {} },
    { id: 'kageyama', name: 'Kageyama', imageUrl: 'kageyama_trace.png', size: 120,
        defaultDialogues: ["Ma passe sera parfaite. C'est toi qui dois frapper.", "Ce petit rouquin est un idiot. Mais il saute plus haut que tout le monde.", "Le volleyball c'est tout. Le reste ne m'intéresse pas."], questDialogues: {} },
    { id: 'sakura', name: 'Sakura', imageUrl: 'sakura_trace.png', size: 120,
        defaultDialogues: ["Je ne suis plus la fille faible d'avant. Un coup de poing et tu comprendras.", "Ces deux idiots de coéquipiers... Ils me rendront folle.", "Mon maître m'a tout appris. Médecine ET destruction."], questDialogues: {} },
    { id: 'armin', name: 'Armin', imageUrl: 'armin_trace.png', size: 120,
        defaultDialogues: ["Le monde extérieur... Il est bien plus vaste que ces murs.", "La stratégie peut vaincre la force brute. Toujours.", "Mes deux amis d'enfance comptent plus que tout pour moi."], questDialogues: {} },
    { id: 'meliodas', name: 'Meliodas', imageUrl: 'meliodas_trace.png', size: 120,
        defaultDialogues: ["Bienvenue au Boar Hat ! Tu veux une bière ? ...Elle est tiède.", "Ma princesse ! Ah non , c'est toi. T'as pas vu une princesse par hasard ?", "J'ai l'air petit mais crois-moi , tu veux pas me chercher."], questDialogues: {} },
];

// 🏠 Structures du mode Survie
const SURVIE_STRUCTURES = [
    { id: 'kame', name: 'Kame House', imageUrl: 'kame_trace.png', size: 220,
        defaultDialogues: ["Une petite maison rose sur une île déserte... Ça sent les tortues et les magazines douteux.", "Un panneau indique : 'Kame House'. L'endroit a l'air paisible... Trop paisible."], questDialogues: {} },
    { id: 'yuei', name: 'Lycée Yuei', imageUrl: 'yuei_trace.png', size: 220,
        defaultDialogues: ["L'Académie des héros. On sent la pression rien qu'en regardant les murs.", "Les couloirs sont vides. Les élèves doivent être en entraînement.", "Un écriteau : 'Plus Ultra !'. Ça donne presque envie de courir."], questDialogues: {} },
    { id: 'konoha', name: 'Village de Konoha', imageUrl: 'konoha_trace.png', size: 220,
        defaultDialogues: ["Le village caché de la feuille. Les visages des Hokages veillent depuis la montagne.", "Des ninjas sautent sur les toits. Personne ne fait attention à toi.", "Ça sent les ramen d'ici... Ou c'est peut-être ton imagination."], questDialogues: {} },
    { id: 'marineford', name: 'Marineford', imageUrl: 'marineford_trace.png', size: 220,
        defaultDialogues: ["La forteresse de la Marine. L'air est lourd, chargé de souvenirs de guerre.", "Un avis de recherche vole au vent. Le montant est... impressionnant."], questDialogues: {} },
    { id: 'sunny', name: 'Thoussand Sunny', imageUrl: 'sunny_trace.png', size: 220,
        defaultDialogues: ["La figure de proue de ce bateau sourit. Ce bateau a du voir beaucoup de choses.", "Le drapeau au chapeau de paille flotte fièrement. Ca sent l'aventure."], questDialogues: {} },
    { id: 'snk', name: 'Le Mur', imageUrl: 'snk_trace.png', size: 220,
        defaultDialogues: ["Un mur immense se dresse devant toi. Qu'est-ce qu'il cache de l'autre côté ?", "Le silence ici est étouffant. Comme si tout le monde retenait son souffle.", "Des traces de griffures géantes marquent la pierre. Mieux vaut ne pas s'attarder."], questDialogues: {} },
    { id: 'guild', name: 'Guilde Fairy Tail', imageUrl: 'guild_trace.png', size: 220,
        defaultDialogues: ["La guilde Fairy Tail. On entend des bruits de bagarre à l'intérieur...", "Le panneau des missions est plein. Y'en a pour tous les niveaux."], questDialogues: {} },
    { id: 'gracefield', name: 'Grace Field House', imageUrl: 'gracefield_trace.png', size: 220,
        defaultDialogues: ["Un orphelinat paisible... En apparence. Quelque chose cloche ici.", "Les enfants jouent dehors. Leurs sourires sont presque trop parfaits."], questDialogues: {} },
    { id: 'infinitecastle', name: 'Forteresse infinie', imageUrl: 'infinitecastle_trace.png', size: 220,
        defaultDialogues: ["Les murs bougent. Les escaliers mènent nulle part. Qu'est-ce qui se passe ici ?", "Si tu entres ici... personne ne garantit que tu trouveras la sortie."], questDialogues: {} },
    { id: 'haikyuu', name: 'Gynmase', imageUrl: 'haikyuu_trace.png', size: 220,
        defaultDialogues: ["Un gymnase de volleyball. Le bruit des ballons résonne contre les murs.", "Ça sent la sueur et la détermination. Surtout la sueur."], questDialogues: {} },
    { id: 'waterseven', name: 'Water Seven', imageUrl: 'waterseven_trace.png', size: 220,
        defaultDialogues: ["La cité sur l'eau. Les canaux serpentent entre des bâtiments magnifiques."], questDialogues: {} },
    { id: 'valleyend', name: 'Vallée de la fin', imageUrl: 'valleyend_trace.png', size: 220,
        defaultDialogues: ["Deux statues colossales se font face. Qui peuvent-elles bien représenter ?", "L'eau de la cascade gronde. Combien de batailles se sont jouées ici ?", "Un endroit chargé d'histoire... et de rivalités qui ne s'éteignent jamais."], questDialogues: {} },
];

// Combined list for backward compat
const SURVIE_NPCS = [...SURVIE_STRUCTURES, ...SURVIE_CHARACTERS];

// ═══════════════════════════════════════════════════════════════
// 🗺️ SYSTÈME DE QUÊTES — DONNÉES
// ═══════════════════════════════════════════════════════════════

// --- Groupes de NPCs (relations entre personnages) ---
const QUEST_GROUPS = {
    // ═══ Duos / Relations ═══
    duos: [
        { name: 'CC & Lelouch', members: ['cc', 'lelouch'] },
        { name: 'Denji & Makima', members: ['denji', 'makima'] },
        { name: 'Gojo & Toji', members: ['gojo', 'toji'] },
        { name: 'Gojo & Sukuna', members: ['gojo', 'sukuna'] },
        { name: 'Itachi & Sasuke', members: ['itachi', 'sasuke'] },
        { name: 'Rem & Ram', members: ['rem', 'ram'] },
        { name: 'Goku & Vegeta', members: ['goku', 'vegeta'] },
        { name: 'Naruto & Sasuke', members: ['naruto', 'sasuke'] },
        { name: 'Naruto & Pain', members: ['naruto', 'pain'] },
        { name: 'Naruto & Gaara', members: ['naruto', 'gaara'] },
        { name: 'Eren & Mikasa', members: ['eren', 'mikasa'] },
        { name: 'Jotaro & Dio', members: ['jotaro', 'dio'] },
        { name: 'Giorno & Dio', members: ['giorno', 'dio'] },
        { name: 'Joseph & Jotaro', members: ['joseph', 'jotaro'] },
        { name: 'Ichigo & Aizen', members: ['ichigo', 'aizen'] },
        { name: 'Ichigo & Ulquiorra', members: ['ichigo', 'ulquiorra'] },
        { name: 'Ichigo & Grimmjow', members: ['ichigo', 'grimmjow'] },
        { name: 'Light & L', members: ['light', 'l'] },
        { name: 'Light & Lelouch', members: ['light', 'lelouch'] },
        { name: 'Killua & Gon', members: ['killua', 'gon'] },
        { name: 'Killua & Hisoka', members: ['killua', 'hisoka'] },
        { name: 'Gon & Hisoka', members: ['gon', 'hisoka'] },
        { name: 'Kurapika & Chrollo', members: ['kurapika', 'chrollo'] },
        { name: 'Rengoku & Akaza', members: ['rengoku', 'akaza'] },
        { name: 'Tanjiro & Nezuko', members: ['tanjiro', 'nezuko'] },
        { name: 'Tanjiro & Zenitsu', members: ['tanjiro', 'zenitsu'] },
        { name: 'Luffy & Ace', members: ['luffy', 'ace'] },
        { name: 'Luffy & Law', members: ['luffy', 'law'] },
        { name: 'Luffy & Hancock', members: ['luffy', 'hancock'] },
        { name: 'Ace & Sabo', members: ['ace', 'sabo'] },
        { name: 'Yor & Anya', members: ['yor', 'anya'] },
        { name: 'Loid & Yor', members: ['loid', 'yor'] },
        { name: 'Edward & Alphonse', members: ['edward', 'alphonse'] },
        { name: 'Asta & Yuno', members: ['asta', 'yuno'] },
        { name: 'Shoyo & Kageyama', members: ['shoyo', 'kageyama'] },
        { name: 'Meliodas & Ban', members: ['meliodas', 'ban'] },
        { name: 'Bakugo & Shoto', members: ['bakugo', 'shoto'] },
    ],

    // ═══ Familles ═══
    naruto_family: { name: 'Famille de Naruto', members: ['naruto', 'boruto', 'minato'] },
    saiyans: { name: 'Saiyans', members: ['goku', 'gohan', 'vegeta', 'trunks'] },
    brothers_asl: { name: 'Frères ASL', members: ['luffy', 'ace', 'sabo'] },

    // ═══ Fratries ═══
    uchiha_brothers: { name: 'Frères Uchiha', members: ['itachi', 'sasuke'] },
    rem_ram: { name: 'Rem & Ram', members: ['rem', 'ram'] },
    tanjiro_nezuko: { name: 'Tanjiro & Nezuko', members: ['tanjiro', 'nezuko'] },
    luffy_ace: { name: 'Luffy & Ace', members: ['luffy', 'ace'] },
    elric_brothers: { name: 'Frères Elric', members: ['edward', 'alphonse'] },

    // ═══ Équipages / Teams ═══
    straw_hats: { name: 'Chapeau de Paille', members: ['luffy', 'zoro', 'nami', 'usopp', 'robin', 'sanji', 'franky', 'brook', 'chopper'] },
    fairy_tail: { name: 'Fairy Tail', members: ['erza', 'natsu', 'lucy'] },
    forgers: { name: 'Famille Forger', members: ['loid', 'yor', 'anya'] },
    demon_slayer_trio: { name: 'Trio Demon Slayer', members: ['tanjiro', 'zenitsu', 'inosuke'] },

    // ═══ Rivaux / Ennemis ═══
    rivals: [
        { name: 'Naruto & Pain', members: ['naruto', 'pain'] },
        { name: 'Gojo & Sukuna', members: ['gojo', 'sukuna'] },
        { name: 'Rengoku & Akaza', members: ['rengoku', 'akaza'] },
        { name: 'Ichigo & Aizen', members: ['ichigo', 'aizen'] },
        { name: 'Jotaro & Dio', members: ['jotaro', 'dio'] },
        { name: 'Gon & Hisoka', members: ['gon', 'hisoka'] },
        { name: 'Kurapika & Chrollo', members: ['kurapika', 'chrollo'] },
        { name: 'Light & L', members: ['light', 'l'] },
        { name: 'Asta & Yuno', members: ['asta', 'yuno'] },
        { name: 'Bakugo & Shoto', members: ['bakugo', 'shoto'] },
    ],

    // ═══ Par anime ═══
    naruto_series: { name: 'Ninjas', members: ['naruto', 'sasuke', 'kakashi', 'itachi', 'minato', 'boruto', 'madara', 'tsunade', 'sakura'] },
    one_piece: { name: 'One Piece', members: ['luffy', 'zoro', 'nami', 'usopp', 'robin', 'sanji', 'franky', 'brook', 'chopper', 'law', 'ace', 'sabo', 'hancock'] },
    dbz: { name: 'Dragon Ball', members: ['goku', 'gohan', 'vegeta', 'trunks'] },
    snk_series: { name: 'Bataillon d\'Exploration', members: ['eren', 'mikasa', 'levi', 'armin'] },
    jjk: { name: 'Jujutsu Kaisen', members: ['gojo', 'toji', 'sukuna', 'maki'] },
    demon_slayer: { name: 'Demon Slayer', members: ['tanjiro', 'nezuko', 'rengoku', 'akaza', 'zenitsu', 'inosuke'] },
    chainsaw_man: { name: 'Chainsaw Man', members: ['denji', 'makima'] },
    bleach: { name: 'Bleach', members: ['ichigo', 'ulquiorra', 'aizen', 'grimmjow', 'zaraki'] },
    code_geass: { name: 'Code Geass', members: ['lelouch', 'cc'] },
    rezero: { name: 'Re:Zero', members: ['rem', 'ram'] },
    jojo: { name: 'JoJo', members: ['jotaro', 'giorno', 'joseph'] },
    fairy_tail_series: { name: 'Fairy Tail', members: ['erza', 'natsu', 'lucy'] },
    reborn: { name: 'Reborn', members: ['tsuna'] },
    black_clover: { name: 'Black Clover', members: ['asta', 'yuno'] },
    hxh: { name: 'Hunter x Hunter', members: ['killua', 'gon', 'hisoka', 'kurapika', 'chrollo', 'meruem'] },
    mha: { name: 'My Hero Academia', members: ['shoto', 'bakugo'] },
    frieren_series: { name: 'Frieren', members: ['frieren'] },
    vinland_saga: { name: 'Vinland Saga', members: ['thorfinn'] },
    tokyo_ghoul: { name: 'Tokyo Ghoul', members: ['kaneki'] },
    fma: { name: 'Fullmetal Alchemist', members: ['edward', 'alphonse'] },
    gintama: { name: 'Gintama', members: ['gintoki'] },
    spy_family: { name: 'SPY×FAMILY', members: ['loid', 'yor', 'anya'] },
    fate: { name: 'Fate', members: ['saber'] },
    saint_seiya: { name: 'Saint Seiya', members: ['seiya'] },
    opm: { name: 'One Punch Man', members: ['saitama'] },
    death_note: { name: 'Death Note', members: ['light', 'l'] },
    yugioh: { name: 'Yu-Gi-Oh!', members: ['yugi'] },
    assassination_classroom: { name: 'Assassination Classroom', members: ['koro'] },
    haikyuu_series: { name: 'Haikyuu', members: ['shoyo', 'kageyama'] },
    kuroko_series: { name: 'Kuroko no Basket', members: ['kuroko'] },
    seven_deadly_sins: { name: 'Seven Deadly Sins', members: ['meliodas', 'ban'] },

    // ═══ Personnages féminins ═══
    female: ['erza', 'nami', 'mikasa', 'tsunade', 'rem', 'robin', 'yor', 'makima', 'cc', 'saber', 'frieren', 'ram', 'nezuko', 'maki', 'anya', 'lucy', 'hancock', 'sakura'],
};

// --- Associations NPC ↔ Structure (qui "appartient" à quel lieu) ---
const NPC_STRUCTURE_LINKS = {
    // Naruto
    naruto: 'konoha', sasuke: 'konoha', kakashi: 'konoha', minato: 'konoha', boruto: 'konoha', tsunade: 'konoha',
    pain: 'konoha', gaara: 'konoha', sakura: 'konoha',
    madara: 'valleyend',
    // One Piece
    luffy: 'sunny', zoro: 'sunny', nami: 'sunny', usopp: 'sunny', robin: 'sunny', sanji: 'sunny',
    franky: 'sunny', brook: 'sunny', chopper: 'sunny', law: 'sunny',
    ace: 'marineford', sabo: 'marineford', hancock: 'marineford', doflamingo: 'waterseven',
    // DBZ
    goku: 'kame', gohan: 'kame', vegeta: 'kame', trunks: 'kame',
    // Fairy Tail
    erza: 'guild', natsu: 'guild', lucy: 'guild',
    // Reborn
    tsuna: 'guild',
    // SNK
    eren: 'snk', mikasa: 'snk', levi: 'snk', armin: 'snk',
    // MHA
    shoto: 'yuei', bakugo: 'yuei',
    // Demon Slayer
    rengoku: 'infinitecastle', tanjiro: 'infinitecastle', akaza: 'infinitecastle', nezuko: 'infinitecastle',
    zenitsu: 'infinitecastle', inosuke: 'infinitecastle',
    // JJK
    sukuna: 'infinitecastle', maki: 'yuei',
    // Bleach
    aizen: 'marineford', grimmjow: 'marineford', zaraki: 'marineford',
    // Assassination Classroom
    koro: 'yuei',
    // Haikyuu
    shoyo: 'haikyuu', kageyama: 'haikyuu',
    // HxH
    gon: 'gracefield', killua: 'gracefield', kurapika: 'gracefield', chrollo: 'gracefield', meruem: 'gracefield',
    // FMA
    alphonse: 'gracefield',
    // Seven Deadly Sins
    meliodas: 'guild',
};

// --- Items (objets transportables) ---
const QUEST_ITEMS = {
    armor:      { id: 'armor', name: 'Armure', icon: '🛡️', imageUrl: 'shield_trace.png' },
    bento:      { id: 'bento', name: 'Bento', icon: '🍱', imageUrl: 'bento_trace.png' },
    scroll:     { id: 'scroll', name: 'Parchemin', icon: '📜', imageUrl: 'parchemin_trace.png' },
    death_note: { id: 'death_note', name: 'Death Note', icon: '📓', imageUrl: 'deathnote_trace.png' },
    magazine:   { id: 'magazine', name: 'Magazine', icon: '📖', imageUrl: 'magazine_trace.png' },
    grimoire:   { id: 'grimoire', name: 'Grimoire', icon: '📕', imageUrl: 'grimoire_trace.png' },
    katana:     { id: 'katana', name: 'Katana', icon: '⚔️', imageUrl: 'katana_trace.png' },
    berries:    { id: 'berries', name: 'Berries', icon: '💰', imageUrl: 'money_trace.png' },
    letter:     { id: 'letter', name: 'Lettre', icon: '✉️', imageUrl: 'lettre_trace.png' },
    hat:        { id: 'hat', name: 'Chapeau de paille', icon: '👒', imageUrl: 'chapeau_trace.png' },
    headband:   { id: 'headband', name: 'Bandeau', icon: '🎗️', imageUrl: 'bandeau_trace.png' },
    book:       { id: 'book', name: 'Livre', icon: '📘', imageUrl: 'book_trace.png' },
    photo:      { id: 'photo', name: 'Photo', icon: '📷', imageUrl: 'photo_trace.png' },
    mask:       { id: 'mask', name: 'Masque', icon: '🎭', imageUrl: 'masque1_trace.png' },
    // Dragon Balls
    dragonball1: { id: 'dragonball1', name: 'Dragon Ball 1', icon: '🟠', imageUrl: 'dragonball1_trace.png' },
    dragonball2: { id: 'dragonball2', name: 'Dragon Ball 2', icon: '🟠', imageUrl: 'dragonball2_trace.png' },
    dragonball3: { id: 'dragonball3', name: 'Dragon Ball 3', icon: '🟠', imageUrl: 'dragonball3_trace.png' },
    dragonball4: { id: 'dragonball4', name: 'Dragon Ball 4', icon: '🟠', imageUrl: 'dragonball4_trace.png' },
    dragonball5: { id: 'dragonball5', name: 'Dragon Ball 5', icon: '🟠', imageUrl: 'dragonball5_trace.png' },
    dragonball6: { id: 'dragonball6', name: 'Dragon Ball 6', icon: '🟠', imageUrl: 'dragonball6_trace.png' },
    dragonball7: { id: 'dragonball7', name: 'Dragon Ball 7', icon: '🟠', imageUrl: 'dragonball7_trace.png' },
    // New items
    portrait:   { id: 'portrait', name: 'Portrait', icon: '🎨', imageUrl: 'portrait_trace.png' },
    chocolate:  { id: 'chocolate', name: 'Chocolats', icon: '🍫', imageUrl: 'chocolate_trace.png' },
    card:       { id: 'card', name: 'Carte', icon: '🃏', imageUrl: 'card_trace.png' },
    keys:       { id: 'keys', name: 'Clés du Zodiaque', icon: '🔑', imageUrl: 'keys_trace.png' },
    cooking:    { id: 'cooking', name: 'Ingrédients', icon: '🥘', imageUrl: 'cooking_trace.png' },
    cooking1:   { id: 'cooking1', name: 'Poisson frais', icon: '🐟', imageUrl: 'cooking_trace.png' },
    cooking2:   { id: 'cooking2', name: 'Légumes du marché', icon: '🥕', imageUrl: 'cooking_trace.png' },
    cooking3:   { id: 'cooking3', name: 'Épices rares', icon: '🌶️', imageUrl: 'cooking_trace.png' },
    zoro1:      { id: 'zoro1', name: 'Sabre Wado', icon: '⚔️', imageUrl: 'zoro1_trace.png' },
    zoro2:      { id: 'zoro2', name: 'Sabre Sandai', icon: '⚔️', imageUrl: 'zoro2_trace.png' },
    zoro3:      { id: 'zoro3', name: 'Sabre Enma', icon: '⚔️', imageUrl: 'zoro3_trace.png' },
    tools:      { id: 'tools', name: 'Outils', icon: '🔧', imageUrl: 'tools_trace.png' },
};

// --- Templates de quêtes ---
const QUEST_TEMPLATES = [

    // ══════════ DELIVER ══════════
    { type: 'DELIVER', id: 'deliver_armor_erza',
        steps: [
            { action: 'talk', npc: 'gintoki', dialogue: "Hé toi ! J'ai trouvé cette **armure** par terre... C'est pas à moi. Tu peux la ramener à **Erza** ? Elle doit la chercher partout.", giveItem: 'armor' },
            { action: 'deliver', npc: 'erza', item: 'armor', dialogue: "Mon **armure** ! Où l'as-tu trouvée ? Merci, je la cherchais depuis des heures !" },
        ],
        desc: "Rapporter l'armure perdue", lockedNPCs: ['gintoki', 'erza'] },

    { type: 'DELIVER', id: 'deliver_scroll_kakashi',
        steps: [
            { action: 'talk', npc: 'tsunade', dialogue: "Toi ! J'ai un **parchemin** urgent pour **Kakashi**. Il traîne quelque part, retrouve-le et donne-lui ça.", giveItem: 'scroll' },
            { action: 'deliver', npc: 'kakashi', item: 'scroll', dialogue: "Un **parchemin** de Tsunade ? Merci... J'espère que ce n'est pas encore une mission suicide." },
        ],
        desc: "Livrer le parchemin maudit", lockedNPCs: ['tsunade', 'kakashi'] },

    { type: 'DELIVER', id: 'deliver_letter_mikasa',
        steps: [
            { action: 'talk', npc: 'eren', dialogue: "Écoute... J'ai écrit une **lettre** pour **Mikasa** mais je n'arrive pas à la lui donner en face. Tu peux le faire pour moi ?", giveItem: 'letter' },
            { action: 'deliver', npc: 'mikasa', item: 'letter', dialogue: "Une **lettre** d'Eren... Merci. Vraiment." },
        ],
        desc: "Transmettre la lettre secrète", lockedNPCs: ['eren', 'mikasa'] },

    { type: 'DELIVER', id: 'deliver_death_note_light',
        steps: [
            { action: 'talk', npc: 'rem', dialogue: "Ce **carnet** noir... Il ne m'appartient pas. Un humain le cherche. Il s'appelle **Light**. Retrouve-le.", giveItem: 'death_note' },
            { action: 'deliver', npc: 'light', item: 'death_note', dialogue: "Mon **carnet** ! Haha... Merci. Tu n'as pas regardé à l'intérieur, j'espère ?" },
        ],
        desc: "Remettre le carnet mystérieux", lockedNPCs: ['rem', 'light'] },

    { type: 'DELIVER', id: 'deliver_portrait_anya',
        steps: [
            { action: 'talk', npc: 'anya', dialogue: "Anya a fait un **dessin** pour **papa** ! Tu peux lui donner ? Anya est trop timide...", giveItem: 'portrait' },
            { action: 'deliver', npc: 'loid', item: 'portrait', dialogue: "Un **portrait** fait par ma fille ? ...C'est magnifique. Merci de me l'avoir apporté." },
        ],
        desc: "Livrer le portrait", lockedNPCs: ['anya', 'loid'] },

    { type: 'DELIVER', id: 'deliver_chocolate_gon',
        steps: [
            { action: 'talk', npc: 'killua', dialogue: "Hé... J'ai acheté des **chocolats** pour mon **pote**. Mais j'ai la flemme d'y aller. Tu peux les lui amener ?", giveItem: 'chocolate' },
            { action: 'deliver', npc: 'gon', item: 'chocolate', dialogue: "Des **chocolats** ?! C'est trop gentil ! Dis-lui merci de ma part !" },
        ],
        desc: "Livrer un cadeau entre amis", lockedNPCs: ['killua', 'gon'] },

    { type: 'DELIVER', id: 'deliver_letter_sabo',
        steps: [
            { action: 'talk', npc: 'ace', dialogue: "J'ai écrit une **lettre** pour mon **frère**... On s'est pas vus depuis longtemps. Tu pourrais la lui remettre ?", giveItem: 'letter' },
            { action: 'deliver', npc: 'sabo', item: 'letter', dialogue: "Une **lettre** de mon grand frère... Merci. Ça me touche plus que tu ne le penses." },
        ],
        desc: "Transmettre une lettre fraternelle", lockedNPCs: ['ace', 'sabo'] },

    // ══════════ VISIT_DELIVER ══════════
    { type: 'VISIT_DELIVER', id: 'visit_kame_magazine',
        steps: [
            { action: 'talk', npc: 'goku', dialogue: "Hé ! Tu vas vers **Kame House** ? Maître Roshi a oublié son **magazine** là-bas. Tu peux aller le chercher ?" },
            { action: 'visit', structure: 'kame', dialogue: "Vous trouvez un **magazine** suspect sous un coussin...", giveItem: 'magazine' },
            { action: 'deliver', npc: 'goku', item: 'magazine', dialogue: "Haha merci ! Enfin... c'est pour Maître Roshi hein, pas pour moi !" },
        ],
        desc: "Retrouver le magazine perdu", lockedNPCs: ['goku'], lockedStructures: ['kame'] },

    { type: 'VISIT_DELIVER', id: 'visit_konoha_headband',
        steps: [
            { action: 'talk', npc: 'naruto', dialogue: "Mon **bandeau** ! Je l'ai oublié à **Konoha** en partant ! Tu peux aller me le chercher ? S'te plaiiiit !" },
            { action: 'visit', structure: 'konoha', dialogue: "Un **bandeau** de Konoha traîne près de l'entrée du village...", giveItem: 'headband' },
            { action: 'deliver', npc: 'naruto', item: 'headband', dialogue: "Mon **bandeau** ! Merci ! Sans lui je ne suis pas un vrai ninja, tu comprends ?" },
        ],
        desc: "Retrouver le bandeau ninja", lockedNPCs: ['naruto'], lockedStructures: ['konoha'] },

    { type: 'VISIT_DELIVER', id: 'visit_guild_katana',
        steps: [
            { action: 'talk', npc: 'erza', dialogue: "J'ai laissé un **katana** spécial à la **guilde**. Je ne peux pas y retourner maintenant. Tu irais le chercher pour moi ?" },
            { action: 'visit', structure: 'guild', dialogue: "Un **katana** orné repose sur le comptoir de la guilde...", giveItem: 'katana' },
            { action: 'deliver', npc: 'erza', item: 'katana', dialogue: "Parfait ! Ce **katana** est irremplaçable. Tu as bien mérité ma gratitude." },
        ],
        desc: "Retrouver le katana rouge", lockedNPCs: ['erza'], lockedStructures: ['guild'] },

    { type: 'VISIT_DELIVER', id: 'visit_guild_keys',
        steps: [
            { action: 'talk', npc: 'lucy', dialogue: "Mes **clés du Zodiaque** ! Je les ai oubliées à la **guilde** en partant... Sans elles je ne peux rien invoquer ! Tu peux y aller ?" },
            { action: 'visit', structure: 'guild', dialogue: "Un trousseau de **clés dorées** brille sur une table de la guilde...", giveItem: 'keys' },
            { action: 'deliver', npc: 'lucy', item: 'keys', dialogue: "Mes **clés** !! Merci merci merci ! Aquarius va encore me crier dessus si je les perds..." },
        ],
        desc: "Retrouver les clés perdues", lockedNPCs: ['lucy'], lockedStructures: ['guild'] },

    { type: 'VISIT_DELIVER', id: 'visit_haikyuu_kageyama',
        steps: [
            { action: 'talk', npc: 'kageyama', dialogue: "Le **gymnase**... Où est-il ? J'ai besoin de m'entraîner. Tu sais où il est ?" },
            { action: 'visit', structure: 'haikyuu', dialogue: "Le **gymnase** est vide mais les filets sont tendus. Prêt pour l'entraînement." },
            { action: 'talk', npc: 'kageyama', dialogue: "Tu l'as trouvé ? Parfait. Merci... Maintenant j'ai des passes à perfectionner." },
        ],
        desc: "Trouver le gymnase", lockedNPCs: ['kageyama'], lockedStructures: ['haikyuu'] },

    // ══════════ CHAIN ══════════
    { type: 'CHAIN', id: 'chain_uchiha',
        steps: [
            { action: 'talk', npc: 'itachi', dialogue: "Mon **petit frère**... je dois lui parler. Retrouve-le et dis-lui que je veux le voir." },
            { action: 'talk', npc: 'sasuke', dialogue: "Il veut me voir ? Tch... Dis-lui que j'accepte. Mais c'est la **dernière fois**." },
            { action: 'talk', npc: 'itachi', dialogue: "Il a accepté... Merci. Tu as fait ce que je n'osais pas faire moi-même." },
        ],
        desc: "Réunir les frères Uchihas", lockedNPCs: ['itachi', 'sasuke'] },

    { type: 'CHAIN', id: 'chain_zoro_lost',
        steps: [
            { action: 'talk', npc: 'zoro', dialogue: "Hé toi. Je cherche le **Sunny**. C'est par où ? ... Non ne me dis pas que je suis perdu." },
            { action: 'visit', structure: 'sunny', dialogue: "Le **Thousand Sunny** est ancré ici. Il faudrait prévenir le bretteur..." },
            { action: 'talk', npc: 'zoro', dialogue: "Tu l'as trouvé ?! ...Je veux dire , évidemment il était là. Je le savais. Merci quand même." },
        ],
        desc: "Escorter le bretteur perdu", lockedNPCs: ['zoro'], lockedStructures: ['sunny'] },

    { type: 'CHAIN', id: 'chain_naruto_boruto',
        steps: [
            { action: 'talk', npc: 'boruto', dialogue: "Mon **père** est jamais là... Tu pourrais lui dire que j'aimerais qu'on **s'entraîne** ensemble ?" },
            { action: 'talk', npc: 'naruto', dialogue: "Il veut **s'entraîner** avec moi ? Bien sûr ! Dis-lui que je l'attends , j'ai une surprise pour lui !" },
            { action: 'talk', npc: 'boruto', dialogue: "**Papa** veut s'entraîner avec moi ? ...Cool. Enfin je veux dire , c'est pas si cool que ça." },
        ],
        desc: "Réunion père fils", lockedNPCs: ['boruto', 'naruto'] },

    { type: 'CHAIN', id: 'chain_gojo_sukuna',
        steps: [
            { action: 'talk', npc: 'gojo', dialogue: "Hé toi ! Y'a un type super **dangereux** dans le coin. Va lui dire que je l'attends pour un **round**." },
            { action: 'talk', npc: 'sukuna', dialogue: "L'**exorciste aux yeux bandés** veut se battre ? Hmph... Dis-lui que j'accepte. Ce sera amusant." },
            { action: 'talk', npc: 'gojo', dialogue: "Il accepte ? Hahaha parfait ! Ça va être le **combat du siècle** ! Merci le messager !" },
        ],
        desc: "Organiser le duel ultime", lockedNPCs: ['gojo', 'sukuna'] },

    { type: 'CHAIN', id: 'chain_jotaro_dio',
        steps: [
            { action: 'talk', npc: 'jotaro', dialogue: "...**Dio**. Je sens sa présence quelque part. Va le trouver et dis-lui que j'arrive." },
            { action: 'talk', npc: 'dio', dialogue: "**KONO DIO DA** ! Il me cherche ? Dis-lui que je l'attends ! Ce sera notre **dernier combat** !" },
            { action: 'talk', npc: 'jotaro', dialogue: "**Yare yare daze**... Merci. Cette fois c'est la bonne." },
        ],
        desc: "Préparer l'affrontement final", lockedNPCs: ['jotaro', 'dio'] },

    { type: 'CHAIN', id: 'chain_elric',
        steps: [
            { action: 'talk', npc: 'edward', dialogue: "Mon **frère**... On s'est séparés en cherchant la **Pierre Philosophale**. Tu peux le retrouver et lui dire que j'ai trouvé un indice ?" },
            { action: 'talk', npc: 'alphonse', dialogue: "**Grand frère** a trouvé un indice ?! J'arrive tout de suite ! Merci de m'avoir prévenu !" },
        ],
        desc: "Réunir les frères alchimistes", lockedNPCs: ['edward', 'alphonse'] },

    { type: 'CHAIN', id: 'chain_ram_rem',
        steps: [
            { action: 'talk', npc: 'ram', dialogue: "Ma **sœur** a encore disparu... Elle est sûrement en train d'aider quelqu'un. Retrouve-la et dis-lui de rentrer." },
            { action: 'talk', npc: 'rem', dialogue: "Ma **sœur** me cherche ? Rem va rentrer tout de suite ! Dis-lui que Rem est désolée !" },
            { action: 'talk', npc: 'ram', dialogue: "Elle s'excuse ? Comme d'habitude... Merci de l'avoir retrouvée." },
        ],
        desc: "Retrouver la sœur disparue", lockedNPCs: ['ram', 'rem'] },

    { type: 'CHAIN', id: 'chain_tanjiro_nezuko',
        steps: [
            { action: 'talk', npc: 'tanjiro', dialogue: "Ma **petite sœur**... Je ne la trouve plus ! Son odeur est faible... Tu peux m'aider à la chercher ?" },
            { action: 'talk', npc: 'nezuko', dialogue: "Mmm ! *hoche la tête et te suit du regard* *serre son bambou avec un sourire*" },
            { action: 'talk', npc: 'tanjiro', dialogue: "Tu l'as trouvée ?! Merci !! **Nezuko** , ne t'éloigne plus comme ça !" },
        ],
        desc: "Reunion fraternelle", lockedNPCs: ['tanjiro', 'nezuko'] },

    // ══════════ TRADE_CHAIN ══════════
    { type: 'TRADE_CHAIN', id: 'trade_frieren_grimoire',
        steps: [
            { action: 'talk', npc: 'frieren', dialogue: "Je cherche un **grimoire** ancien. Il me semble que **Robin** en avait un." },
            { action: 'talk', npc: 'robin', dialogue: "Le **grimoire** ? Il me faut une **photo** rare en échange. **Kaneki** en avait une intéressante." },
            { action: 'talk', npc: 'kaneki', dialogue: "Ma **photo** ? ...Elle est personnelle. Mais je l'échange contre mon **masque**. **Grimmjow** me l'a pris." },
            { action: 'talk', npc: 'grimmjow', dialogue: "Le **masque** ? Ah ouais je l'ai. Je l'avais confondu avec le mien. Je te le rends si tu me trouves un **adversaire**. Dis à **Ichigo** que je veux un combat !" },
            { action: 'talk', npc: 'ichigo', dialogue: "**Grimmjow** veut se battre ? Tch... Encore ? Bon dis-lui que j'accepte." },
            { action: 'talk', npc: 'grimmjow', dialogue: "Il accepte ?! Haha ! Tiens, reprends ce **masque**. J'en ai plus rien à faire !", giveItem: 'mask' },
            { action: 'trade', npc: 'kaneki', item: 'mask', dialogue: "Mon **masque** ! Merci... Tiens, voici la **photo**. Prends-en soin.", giveItem: 'photo' },
            { action: 'trade', npc: 'robin', item: 'photo', dialogue: "Oh, quelle **photo** fascinante... Merci. Voici le **grimoire**, comme promis.", giveItem: 'grimoire' },
            { action: 'deliver', npc: 'frieren', item: 'grimoire', dialogue: "Le **grimoire** ! Après mille ans de recherche... Merci, humain." },
        ],
        desc: "Trouver le grimoire ancien", lockedNPCs: ['frieren', 'robin', 'kaneki', 'grimmjow', 'ichigo'] },

    { type: 'TRADE_CHAIN', id: 'trade_denji_girl',
        steps: [
            { action: 'talk', npc: 'denji', dialogue: "Mec... J'aimerais trop un **rencard** avec **Makima**. Tu pourrais aller lui demander pour moi ? J'ose pas..." },
            { action: 'talk', npc: 'makima', dialogue: "Denji veut un rendez-vous ? ...Pourquoi pas. Mais dis-lui que je veux des **chocolats** d'abord." },
            { action: 'talk', npc: 'saber', dialogue: "Des **chocolats** ? J'en ai, je veux bien partager. Mais en échange je veux une **armure**. **Franky** en fabrique, non ?" },
            { action: 'talk', npc: 'franky', dialogue: "Une **armure** ? SUUUPER ! Je t'en fais une ! Mais j'ai oublié mes **outils** à **Water Seven**... Tu sais où c'est ?" },
            { action: 'visit', structure: 'water7', dialogue: "Vous trouvez les **outils** de Franky près de l'atelier de Water Seven.", giveItem: 'tools' },
            { action: 'trade', npc: 'franky', item: 'tools', dialogue: "Mes **outils** !! SUUUPER ! Tiens, voilà ton **armure** comme promis !", giveItem: 'armor' },
            { action: 'trade', npc: 'saber', item: 'armor', dialogue: "Oh, une belle **armure** ! Merci. Tiens, voici les **chocolats** comme promis.", giveItem: 'chocolate' },
            { action: 'trade', npc: 'makima', item: 'chocolate', dialogue: "Des **chocolats**... Bien. Dis à **Denji** que j'accepte son **rendez-vous**. S'il ose venir." },
            { action: 'talk', npc: 'denji', dialogue: "ELLE A DIT **OUI** ?! UN RENCARD AVEC MAKIMA ?! T'ES LE MEILLEUR POTE DU MONDE !!!" },
        ],
        desc: "Un rencard pour Denji", lockedNPCs: ['denji', 'makima', 'saber', 'franky'], lockedStructures: ['water7'] },

    // ══════════ REUNION ══════════
    { type: 'REUNION', id: 'reunion_straw_hats',
        group: 'straw_hats', count: 4,
        dialogue_found: "Tu m'as trouvé ! L'équipage sera bientôt réuni !",
        desc: "Réunir 4 membres du Chapeau de Paille",
    },

    { type: 'REUNION', id: 'reunion_naruto_series',
        group: 'naruto_series', count: 4,
        dialogue_found: "Un ninja ne refuse jamais l'appel ! Retrouve les autres !",
        desc: "Réunir 4 ninjas de Konoha",
    },

    { type: 'REUNION', id: 'reunion_snk',
        group: 'snk_series', count: 3,
        dialogue_found: "Le bataillon se rassemble. Continue !",
        desc: "Réunir le Bataillon d'Exploration",
    },

    { type: 'REUNION', id: 'reunion_dbz',
        group: 'dbz', count: 3,
        dialogue_found: "Tu m'as trouvé ! On sera bientôt au complet pour le tournoi !",
        desc: "Réunir les guerriers Saiyans",
    },

    { type: 'REUNION', id: 'reunion_forgers',
        group: 'forgers', count: 3,
        dialogue_found: "Tu m'as trouvé ! La famille sera bientôt réunie !",
        desc: "Réunir la famille d'Anya",
    },

    { type: 'REUNION', id: 'reunion_jojo',
        group: 'jojo', count: 3,
        dialogue_found: "Tu m'as trouvé ! Les JoJo se rassemblent !",
        desc: "Réunir 3 protagonistes JoJo",
    },

    // ══════════ COLLECT_ITEMS ══════════
    { type: 'COLLECT_ITEMS', id: 'collect_bentos_rengoku',
        item: 'bento', count: 5, deliverTo: 'rengoku',
        spawnNearStructures: true,
        desc: "Livrer 5 bentos",
        lockedNPCs: ['rengoku'],
        finalDialogue: "DÉLICIEUX ! Cinq bentos ! Tu es un vrai héros !! UMAI !!",
    },

    { type: 'COLLECT_ITEMS', id: 'collect_berries_nami',
        item: 'berries', count: 4, deliverTo: 'nami',
        spawnNearStructures: true,
        desc: "Apporter 4 billets de berries",
        lockedNPCs: ['nami'],
        finalDialogue: "Tout cet argent ! Tu es mon nouveau meilleur ami ! ...Non je ne partage pas.",
    },

    { type: 'COLLECT_ITEMS', id: 'collect_dragonballs',
        item: 'dragonball', count: 7, deliverTo: 'goku',
        spawnNearStructures: false,
        desc: "Livrez les Dragon Ball",
        lockedNPCs: ['goku'],
        finalDialogue: "LES 7 DRAGON BALLS !! Maintenant on peut invoquer Shenron ! T'es incroyable !!",
        specialItems: ['dragonball1', 'dragonball2', 'dragonball3', 'dragonball4', 'dragonball5', 'dragonball6', 'dragonball7'],
    },

    { type: 'COLLECT_ITEMS', id: 'collect_sabres_zoro',
        item: 'sabre', count: 3, deliverTo: 'zoro',
        spawnNearStructures: false,
        desc: "Retrouver les 3 sabres perdus",
        lockedNPCs: ['zoro'],
        finalDialogue: "Mes trois sabres ! Santoryu est de retour ! ...Ne dis à personne que je les avais perdus.",
        specialItems: ['zoro1', 'zoro2', 'zoro3'],
    },

    { type: 'COLLECT_ITEMS', id: 'collect_cooking_sanji',
        item: 'cooking', count: 3, deliverTo: 'sanji',
        spawnNearStructures: true,
        desc: "Trouver les ingrédients du chef",
        lockedNPCs: ['sanji'],
        finalDialogue: "PARFAIT ! Avec ça je vais préparer le meilleur plat des sept mers ! Merci, tu es invité à dîner !",
        specialItems: ['cooking1', 'cooking2', 'cooking3'],
    },

    // ══════════ RIDDLE ══════════
    { type: 'RIDDLE', id: 'riddle_kakashi',
        hint_npc: 'naruto',
        hint_dialogue: "Tu cherches quelqu'un ? Y'a un type bizarre toujours **en retard** qui lit des **bouquins douteux**...",
        answer_npc: 'kakashi',
        answer_structure: null,
        dialogue_correct: "Tu m'as trouvé. Je suis impressionné... ou pas. Comment savais-tu ?",
        desc: "Trouver l'homme mystère",
        lockedNPCs: ['kakashi', 'naruto'],
    },

    { type: 'RIDDLE', id: 'riddle_saitama',
        hint_npc: 'goku',
        hint_dialogue: "Y'a un type super fort par ici ! **Chauve**, l'air **blasé**, une **cape**... J'ai voulu le combattre mais il avait pas l'air intéressé. Hésite pas à lui dire bonjour de ma part si tu le vois.",
        answer_npc: 'saitama',
        answer_structure: null,
        dialogue_correct: "Oh, tu me cherchais ? ...C'est déjà fini ? Comme d'habitude.",
        desc: "Trouver l'homme mystère",
        lockedNPCs: ['saitama', 'goku'],
    },

    { type: 'RIDDLE', id: 'riddle_infinitecastle',
        hint_npc: 'tanjiro',
        hint_dialogue: "J'ai senti une odeur de démon venant d'un endroit étrange... Un château où les **murs bougent** et les **escaliers ne mènent nulle part**. Peux tu aller y jeter un oeil ?",
        answer_npc: null,
        answer_structure: 'infinitecastle',
        dialogue_correct: "Vous avez trouvé la Forteresse Infinie. Les murs tremblent à votre arrivée...",
        desc: "Trouver l'endroit mystère",
        lockedNPCs: ['tanjiro'], lockedStructures: ['infinitecastle'],
    },

    { type: 'RIDDLE', id: 'riddle_levi',
        hint_npc: 'eren',
        hint_dialogue: "Le plus fort de l'humanité ? Il est **petit**, il fait flipper tout le monde et il est obsédé par la **propreté**. Il porte des **lames** , je te conseille de pas t'y frotter.",
        answer_npc: 'levi',
        answer_structure: null,
        dialogue_correct: "Tch. Tu m'as trouvé. Maintenant dégage avant que je te fasse récurer le sol.",
        desc: "Trouver l'homme mystère",
        lockedNPCs: ['levi', 'eren'],
    },

    { type: 'RIDDLE', id: 'riddle_hisoka',
        hint_npc: 'killua',
        hint_dialogue: "Y'a un type flippant dans le coin... Un **magicien** obsédé par les combats. Il joue avec des **cartes** et il **sourit tout le temps**. Fais gaffe si tu le trouves.",
        answer_npc: 'hisoka',
        answer_structure: null,
        dialogue_correct: "Oh ? Tu m'as trouvé... ♠ Intéressant. Tu as du potentiel. Reviens me voir quand tu seras plus fort. ♥",
        desc: "Trouver l'homme mystère",
        lockedNPCs: ['hisoka', 'killua'],
    },

    // ══════════ MYSTERY ══════════
    { type: 'MYSTERY', id: 'mystery_hat_luffy',
        stolen_item: 'hat', victim: 'luffy',
        suspects: ['nami', 'usopp', 'robin'],
        culprit: null,
        victim_dialogue: null,
        culprit_hints: {
            nami: "MON **CHAPEAU** !! Quelqu'un me l'a **volé** !! J'ai vu quelqu'un s'enfuir... Une fille aux **cheveux oranges** qui courait avec un sac. Retrouve-la !",
            usopp: "MON **CHAPEAU** !! Quelqu'un me l'a **volé** !! J'ai vu une silhouette... Un type avec un **long nez** et un **lance-pierre**. C'est forcément lui !",
            robin: "MON **CHAPEAU** !! Quelqu'un me l'a **volé** !! J'ai entrevu quelqu'un... Une femme avec des **cheveux noirs** et un air **mystérieux**. Retrouve-la !",
        },
        innocent_dialogues: [
            "Moi ? Voler le chapeau de Luffy ? Jamais ! ...Enfin, sauf s'il valait beaucoup d'argent. Mais non !",
            "Ce n'est pas moi ! J'étais occupé(e) à... euh... faire autre chose. Demande aux autres !",
            "Innocent(e) ! Regarde, je n'ai rien dans les mains !",
        ],
        culprit_dialogues: [
            "Moi ? Non non ! ...Bon ok c'est moi. Tiens, reprends-le. C'était juste une blague !",
        ],
        desc: "Retrouver le chapeau volé",
        lockedNPCs: ['luffy', 'nami', 'usopp', 'robin'],
    },

    { type: 'MYSTERY', id: 'mystery_deathnote',
        stolen_item: 'death_note', victim: 'light',
        suspects: ['makima', 'gintoki', 'lelouch'],
        culprit: null,
        victim_dialogue: null, // Generated dynamically based on culprit
        culprit_hints: {
            gintoki: "Mon **carnet** a disparu ! J'ai aperçu quelqu'un s'enfuir... Un type avec des **cheveux argentés** en bataille et un air de **fainéant**. Retrouve-le !",
            lelouch: "Mon **carnet** a disparu ! J'ai vu une silhouette... Un **lycéen en uniforme** avec un **regard rouge** étrange. Il faut le retrouver !",
            makima: "Mon **carnet** a disparu ! J'ai entrevu quelqu'un... Une femme aux **cheveux roux-orangés** avec un **regard glacial**. Retrouve-la !",
        },
        innocent_dialogues: [
            "Un carnet ? Ça ne m'intéresse pas. J'ai d'autres moyens de contrôler les gens...",
            "Moi ? Voler un carnet ? J'ai autre chose à faire, tu sais.",
            "Je ne vois pas de quoi tu parles. Demande à quelqu'un d'autre.",
        ],
        culprit_dialogues: [
            "...Tu m'as percé à jour. Tiens, reprends ce carnet maudit. Il me donnait des frissons.",
        ],
        desc: "Retrouver le Death Note volé",
        lockedNPCs: ['light', 'makima', 'gintoki', 'lelouch'],
    },

    { type: 'MYSTERY', id: 'mystery_card_yugi',
        stolen_item: 'card', victim: 'yugi',
        suspects: ['dio', 'hisoka', 'chrollo'],
        culprit: null,
        victim_dialogue: null,
        culprit_hints: {
            dio: "Ma **carte** favorite a disparu !! J'ai vu quelqu'un s'enfuir... Un type **blond arrogant** avec un air de **vampire**. Retrouve-le !",
            hisoka: "Ma **carte** favorite a disparu !! J'ai aperçu une silhouette... Un **magicien** aux **cheveux rouges** qui jouait avec des **cartes**. C'est forcément lui !",
            chrollo: "Ma **carte** favorite a disparu !! J'ai vu quelqu'un... Un type calme avec un **manteau sombre** et un **regard calculateur**. Retrouve-le !",
        },
        innocent_dialogues: [
            "Une carte ? Je n'ai que faire de vos jeux de mortels...",
            "Voler une carte ? J'ai des trésors bien plus précieux que ça.",
            "Ce n'est pas moi. Cherche ailleurs.",
        ],
        culprit_dialogues: [
            "...Tu m'as démasqué. Tiens, reprends cette carte. Elle est puissante mais... pas à mon goût.",
        ],
        desc: "Retrouver la carte volée",
        lockedNPCs: ['yugi', 'dio', 'hisoka', 'chrollo'],
    },
];

// ═══════════════════════════════════════════════════════════════
// 🎲 GÉNÉRATEUR DE QUÊTES
// ═══════════════════════════════════════════════════════════════

function generateQuestsForGame(questCount = 5) {
    const available = [...QUEST_TEMPLATES];
    const selected = [];
    const usedNPCs = new Set();
    const usedStructures = new Set();
    const usedTypes = {};

    // Helper: check if a quest can be added (no NPC/structure conflicts)
    function canAdd(template) {
        // Max 1 quest per type
        if ((usedTypes[template.type] || 0) >= 1) return false;

        const neededNPCs = template.lockedNPCs || [];
        const neededStructures = template.lockedStructures || [];
        
        let reunionMembers = [];
        if (template.type === 'REUNION') {
            const groupData = QUEST_GROUPS[template.group];
            if (groupData && groupData.members) {
                reunionMembers = groupData.members;
            }
        }

        const allNeededNPCs = [...neededNPCs, ...reunionMembers];
        
        if (allNeededNPCs.some(id => usedNPCs.has(id))) return false;
        if (neededStructures.some(id => usedStructures.has(id))) return false;
        
        return true;
    }

    // Helper: add a quest to selected
    function addQuest(quest) {
        const q = JSON.parse(JSON.stringify(quest));
        
        // Pour MYSTERY, choisir le coupable aléatoirement
        if (q.type === 'MYSTERY' && !q.culprit) {
            q.culprit = q.suspects[Math.floor(Math.random() * q.suspects.length)];
            if (q.culprit_hints && q.culprit_hints[q.culprit]) {
                q.victim_dialogue = q.culprit_hints[q.culprit];
            }
        }

        selected.push(q);
        const neededNPCs = q.lockedNPCs || [];
        const neededStructures = q.lockedStructures || [];
        let reunionMembers = [];
        if (q.type === 'REUNION') {
            const groupData = QUEST_GROUPS[q.group];
            if (groupData && groupData.members) reunionMembers = groupData.members;
        }
        [...neededNPCs, ...reunionMembers].forEach(id => usedNPCs.add(id));
        neededStructures.forEach(id => usedStructures.add(id));
        usedTypes[q.type] = (usedTypes[q.type] || 0) + 1;
    }

    // Mélanger
    for (let i = available.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [available[i], available[j]] = [available[j], available[i]];
    }

    // Step 1: Guarantee 1 COLLECT_ITEMS quest
    const collectQuests = available.filter(t => t.type === 'COLLECT_ITEMS');
    for (const cq of collectQuests) {
        if (canAdd(cq)) {
            addQuest(cq);
            break;
        }
    }

    // Step 2: Fill remaining slots with unique types
    for (const template of available) {
        if (selected.length >= questCount) break;
        if (selected.some(s => s.id === template.id)) continue; // Already added
        if (!canAdd(template)) continue;
        addQuest(template);
    }

    // Retourner les IDs des NPCs/structures nécessaires
    const lockedNPCIds = new Set();
    const lockedStructureIds = new Set();
    selected.forEach(q => {
        (q.lockedNPCs || []).forEach(id => lockedNPCIds.add(id));
        (q.lockedStructures || []).forEach(id => lockedStructureIds.add(id));
        if (q.type === 'REUNION') {
            const groupData = QUEST_GROUPS[q.group];
            if (groupData && groupData.members) {
                groupData.members.forEach(id => lockedNPCIds.add(id));
            }
        }
    });

    return {
        quests: selected,
        lockedNPCs: [...lockedNPCIds],
        lockedStructures: [...lockedStructureIds],
    };
}

// ═══════════════════════════════════════════════════════════════
// 👤 STATE JOUEUR (créé par joueur au début de partie)
// ═══════════════════════════════════════════════════════════════

function createPlayerQuestState(quests) {
    return {
        quests: quests.map(q => ({
            id: q.id,
            type: q.type,
            desc: q.desc,
            currentStep: 0,
            totalSteps: q.steps ? q.steps.length : (q.type === 'REUNION' ? q.count : (q.type === 'COLLECT_ITEMS' ? q.count + 1 : (q.type === 'RIDDLE' ? 1 : 2))),
            completed: false,
            stepDesc: getStepDescription(q, 0),
            // Type-specific data
            ...(q.type === 'REUNION' && { found: [], count: q.count, group: q.group }),
            ...(q.type === 'COLLECT_ITEMS' && { collected: 0, count: q.count, delivered: false }),
            ...(q.type === 'RIDDLE' && { solved: false, hintReceived: false }),
            ...(q.type === 'ESCORT' && { escorting: false, arrived: false }),
            ...(q.type === 'MYSTERY' && { interrogated: [], culprit: q.culprit, accused: false }),
        })),
        inventory: [],
        completedCount: 0,
    };
}

// Generate human-readable step description
function getStepDescription(questTemplate, stepIndex) {
    if (!questTemplate) return '';
    
    // Step-based quests (DELIVER, VISIT_DELIVER, CHAIN, TRADE_CHAIN)
    if (questTemplate.steps) {
        if (stepIndex < questTemplate.steps.length) {
            const step = questTemplate.steps[stepIndex];
            if (step.action === 'talk') {
                const npcData = [...SURVIE_CHARACTERS, ...SURVIE_STRUCTURES].find(n => n.id === step.npc);
                const name = npcData ? npcData.name : step.npc;
                return `Aller voir ${name}`;
            }
            if (step.action === 'visit') {
                const structData = SURVIE_STRUCTURES.find(n => n.id === step.structure);
                const name = structData ? structData.name : step.structure;
                return `Se rendre à ${name}`;
            }
            if (step.action === 'deliver') {
                const npcData = [...SURVIE_CHARACTERS, ...SURVIE_STRUCTURES].find(n => n.id === step.npc);
                const name = npcData ? npcData.name : step.npc;
                const itemData = QUEST_ITEMS[step.item];
                const itemName = itemData ? itemData.name : step.item;
                return `Apporter ${itemName} à ${name}`;
            }
            if (step.action === 'trade') {
                const npcData = SURVIE_CHARACTERS.find(n => n.id === step.npc);
                const name = npcData ? npcData.name : step.npc;
                return `Échanger avec ${name}`;
            }
        }
        return 'Terminé !';
    }
    
    // REUNION / COLLECT_ITEMS — use default counter
    if (questTemplate.type === 'REUNION' || questTemplate.type === 'COLLECT_ITEMS') {
        return null;
    }
    
    // RIDDLE
    if (questTemplate.type === 'RIDDLE') {
        if (questTemplate.hint_npc) {
            const hintNpcData = SURVIE_CHARACTERS.find(n => n.id === questTemplate.hint_npc);
            const name = hintNpcData ? hintNpcData.name : questTemplate.hint_npc;
            return `Aller voir ${name}`;
        }
        return questTemplate.riddle || 'Résolvez l\'énigme...';
    }
    
    // ESCORT
    if (questTemplate.type === 'ESCORT') {
        const npcData = SURVIE_CHARACTERS.find(n => n.id === questTemplate.npc);
        const name = npcData ? npcData.name : questTemplate.npc;
        return `Trouver ${name}`;
    }
    
    // MYSTERY
    if (questTemplate.type === 'MYSTERY') {
        const victimData = SURVIE_CHARACTERS.find(n => n.id === questTemplate.victim);
        const name = victimData ? victimData.name : questTemplate.victim;
        return `Aller voir ${name}`;
    }
    
    return '';
}

// 🎮 Types d'épreuves Survie
const SURVIE_EPREUVE_TYPES = [
    'vrai-faux', 'intrus', 'anagramme', 'nomme', 'flou',
    'pendu', 'qui-suis-je', 'tri-anime', 'reflexe', 'paires',
    'association', 'comptage', 'timeline', 'chronologie'
];

// 💣 Set pour réserver les places pendant le traitement async (évite les race conditions)
const pendingJoins = new Set();


// SERIES_FILTERS importé depuis dbs.js

// Détection automatique de l'URL de redirection
const TWITCH_REDIRECT_URI = process.env.TWITCH_REDIRECT_URI ||
    (process.env.NODE_ENV === 'production'
        ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME || process.env.VERCEL_URL || 'shonenmaster.com'}/auth/twitch/callback`
        : `http://localhost:${PORT}/auth/twitch/callback`);

// ============================================
// Middleware
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('trust proxy', 1);

app.use(session({
    secret: process.env.SESSION_SECRET || 'pikine-secret-2025',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24h
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    },
    proxy: process.env.NODE_ENV === 'production'
}));


app.use('/admin/*', (req, res, next) => {
    if (req.session.isAdmin) {
        // Si admin normal
        if (req.session.id === activeAdminSession) {
            lastAdminActivity = Date.now();
        }
        // Si master, ne pas tracker (pas de timeout pour les devs)
        if (req.session.isMasterAdmin) {
            // Les masters n'ont pas de timeout
        }
    }
    next();
});

// ============================================
// Routes AUTH TWITCH
// ============================================

// Route pour démarrer l'auth Twitch
app.get('/auth/twitch', (req, res) => {
    // Stocker d'où vient la requête (admin ou joueur)
    if (req.query.from === 'admin') {
        req.session.twitchAuthFrom = 'admin';
    } else {
        req.session.twitchAuthFrom = 'player';
    }
    
    const twitchAuthUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${process.env.TWITCH_CLIENT_ID}&redirect_uri=${encodeURIComponent(TWITCH_REDIRECT_URI)}&response_type=code&scope=user:read:email`;
    res.redirect(twitchAuthUrl);
});

// Callback Twitch OAuth
app.get('/auth/twitch/callback', async (req, res) => {
    const { code } = req.query;
    const fromAdmin = req.session.twitchAuthFrom === 'admin';

    if (!code) {
        return res.redirect(fromAdmin ? '/admin?error=auth_failed' : '/?error=auth_failed');
    }

    try {
        // Échanger le code contre un token
        const tokenResponse = await axios.post('https://id.twitch.tv/oauth2/token', null, {
            params: {
                client_id: process.env.TWITCH_CLIENT_ID,
                client_secret: process.env.TWITCH_CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: TWITCH_REDIRECT_URI
            }
        });

        const accessToken = tokenResponse.data.access_token;

        // Récupérer les infos utilisateur
        const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Client-Id': process.env.TWITCH_CLIENT_ID
            }
        });

        const twitchUser = userResponse.data.data[0];

        // Créer ou mettre à jour l'utilisateur dans la DB (avec avatar)
        await db.createOrUpdateUser(twitchUser.id, twitchUser.display_name);

        // Stocker dans la session
        req.session.twitchId = twitchUser.id;
        req.session.username = twitchUser.display_name;
        req.session.twitchAvatar = twitchUser.profile_image_url;
        req.session.isAuthenticated = true;
        
        // Stocker les infos Twitch pour l'admin
        if (fromAdmin) {
            req.session.adminTwitchUser = {
                id: twitchUser.id,
                login: twitchUser.login,
                display_name: twitchUser.display_name,
                profile_image_url: twitchUser.profile_image_url
            };
        }

        // Rediriger vers la bonne page
        res.redirect(fromAdmin ? '/admin' : '/');
    } catch (error) {
        console.error('❌ Erreur auth Twitch:', error.message);
        res.redirect(fromAdmin ? '/admin?error=auth_failed' : '/?error=auth_failed');
    }
});

// Status Twitch pour l'admin
app.get('/auth/twitch/status', (req, res) => {
    if (req.session.adminTwitchUser) {
        res.json({
            connected: true,
            user: req.session.adminTwitchUser
        });
    } else {
        res.json({ connected: false });
    }
});

// Route de déconnexion
app.get('/auth/logout', (req, res) => {
    // Si c'est l'admin normal qui se déconnecte
    if (req.session.id === activeAdminSession) {
        activeAdminSession = null;
        activeAdminLoginTime = null;
        console.log('🔓 Slot admin normal libéré (logout)');
    }

    // Si c'est un master qui se déconnecte
    if (req.session.isMasterAdmin) {
        masterAdminSessions.delete(req.session.id);
        console.log(`👑 Master déconnecté (${masterAdminSessions.size} restant(s))`);
    }

    req.session.destroy();
    res.redirect('/');
});

// Route pour vérifier l'état de l'auth
app.get('/auth/status', (req, res) => {
    if (req.session.isAuthenticated) {
        res.json({
            authenticated: true,
            username: req.session.username,
            twitchId: req.session.twitchId
        });
    } else {
        res.json({ authenticated: false });
    }
});


// Route pour obtenir l'état actuel du jeu (pour reconnexion)
app.get('/game/state', (req, res) => {
    let timeRemaining = null;
    if (gameState.questionStartTime && gameState.inProgress) {
        const elapsed = Math.floor((Date.now() - gameState.questionStartTime) / 1000);
        timeRemaining = Math.max(0, gameState.questionTime - elapsed);
    }
    
    // 🆕 Mettre à jour les compteurs d'équipe
    if (gameState.lobbyMode === 'rivalry') {
        updateTeamCounts();
        updateTeamScores(); // 🆕 Calculer les scores d'équipe
    }
    
    // 💣🎴 Vérifier si le lobby BombAnime/Collect est plein
    const isBombanimeMode = gameState.lobbyMode === 'bombanime';
    const isCollectMode = gameState.lobbyMode === 'collect';
    const maxPlayers = isBombanimeMode ? BOMBANIME_CONFIG.MAX_PLAYERS : (isCollectMode ? COLLECT_CONFIG.MAX_PLAYERS : Infinity);
    const isLobbyFull = (isBombanimeMode || isCollectMode) && gameState.players.size >= maxPlayers;

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
            title: player.title || 'Novice',
            lives: gameState.mode === 'lives' ? player.lives : null,
            points: gameState.mode === 'points' ? (player.points || 0) : null,
            isLastGlobalWinner: player.twitchId === lastGlobalWinner,
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
        isTiebreaker: gameState.isTiebreaker,
        liveAnswerCounts: answerCounts,
        showingWinner: !!winnerScreenData,
        winnerScreenData: winnerScreenData,
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
            playersData: gameState.bombanime.active ? getBombanimePlayersData() : [],
            usedNamesCount: gameState.bombanime.usedNames.size,
            direction: gameState.bombanime.bombDirection,
            timeRemaining: gameState.bombanime.turnStartTime ? 
                Math.max(0, gameState.bombanime.timer - Math.floor((Date.now() - gameState.bombanime.turnStartTime) / 1000)) : 
                gameState.bombanime.timer
        } : null,
        // 🎮 Mode Survie
        survie: gameState.lobbyMode === 'survie' && gameState.survie.active ? {
            active: true,
            currentRound: gameState.survie.currentRound,
            roundInProgress: gameState.survie.roundInProgress,
            currentEpreuve: gameState.survie.currentEpreuve,
            timer: gameState.survie.timer,
            alivePlayers: gameState.survie.alivePlayers.map(p => ({
                twitchId: p.twitchId, username: p.username, avatarUrl: p.avatarUrl, colorIndex: p.colorIndex,
                posX: p.posX, posY: p.posY
            })),
            eliminatedPlayers: gameState.survie.eliminatedPlayers,
            completedCount: gameState.survie.completedPlayers.length,
            qualifiedCount: gameState.survie.qualifiedCount,
            toEliminateCount: gameState.survie.toEliminateCount,
            timeRemaining: gameState.survie.roundTimerEndTime 
                ? Math.max(0, Math.ceil((gameState.survie.roundTimerEndTime - Date.now()) / 1000))
                : gameState.survie.timer,
            npcs: gameState.survie.npcs || SURVIE_NPCS,
            quests: gameState.survie.quests ? gameState.survie.quests.map(q => ({
                id: q.id, type: q.type, desc: q.desc,
                totalSteps: q.steps ? q.steps.length : (q.type === 'REUNION' ? q.count : (q.type === 'COLLECT_ITEMS' ? q.count + 1 : (q.type === 'RIDDLE' ? 1 : 2))),
                ...(q.type === 'REUNION' && { count: q.count, group: q.group }),
                ...(q.type === 'COLLECT_ITEMS' && { count: q.count }),
                ...(q.type === 'RIDDLE' && { riddle: q.riddle }),
                ...(q.type === 'MYSTERY' && { victim: q.victim, suspects: q.suspects }),
            })) : [],
            groundItems: gameState.survie.groundItems || [],
            boosts: gameState.survie.boosts || [],
            questItems: QUEST_ITEMS,
            playerQuestStates: gameState.survie.playerQuestStates ? Object.fromEntries(
                Object.entries(gameState.survie.playerQuestStates).map(([tid, pqs]) => [tid, { quests: pqs.quests, pickedItems: pqs.pickedItems || [], inventory: pqs.inventory || [] }])
            ) : {},
        } : null
    });
});

// ============================================
// Fichiers statiques (APRÈS les routes API)
// ============================================
app.use(express.static('src/html'));
app.use(express.static('src/style'));
app.use(express.static('src/sound'));
app.use(express.static('src/img'));
app.use(express.static('src/img/questionpic'));
app.use(express.static('src/img/collectpic'));
app.use(express.static('src/img/tracepic'));
app.use(express.static('src/img/avatar'));
app.use(express.static('src/script'));


let activeAdminSession = null; // Session de l'admin connecté
let activeAdminLoginTime = null; // Timestamp de connexion
let masterAdminSessions = new Set();


const MASTER_PASSWORD = process.env.MASTER_ADMIN_PASSWORD || 'cc';
const ADMIN_TIMEOUT_MS = 10 * 60 * 1000;


// ============================================
// État du jeu
// ============================================
const gameState = {
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
    streamerId: null, // 🎙️ ID Twitch du streamer admin (null = pas d'historique)
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

    serieFilter: 'tout',
    noSpoil: false, // 🚫 Filtre anti-spoil (exclure les questions spoil)

    playerBonuses: new Map(),
    
    // 🆕 Mode Rivalité
    lobbyMode: 'classic', // 'classic' ou 'rivalry'
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
    
    // ============================================
    // 🎴 COLLECT - État du mode jeu de cartes anime
    // ============================================
    collect: {
        active: false,              // Mode Collect actif
        deck: [],                   // Deck de cartes
        playersOrder: [],           // Ordre des joueurs (twitchIds)
        playersData: new Map(),     // Map<twitchId, {cards, wins}>
        currentRound: 0,            // Round actuel
        roundStat: null,            // Stat du round actuel (atk, int, spd, pwr)
        playedCards: new Map(),     // Map<twitchId, card> - cartes jouées ce round
        roundTimer: null,           // Timer du round
        timerEndTime: null          // Timestamp fin du timer (pour sync)
    },
    
    // ============================================
    // 🎮 SURVIE - État du mode
    // ============================================
    survie: {
        active: false,
        currentRound: 0,
        roundTimer: null,
        roundTimerEndTime: null,
        roundInProgress: false,
        alivePlayers: [],           // [{twitchId, username, socketId, avatarUrl}]
        eliminatedPlayers: [],      // [{twitchId, username, eliminatedRound, position}]
        currentEpreuve: null,       // {type, data}
        usedEpreuves: [],           // Types déjà utilisés
        completedPlayers: [],       // [{twitchId, username, completionTime}]
        qualifiedCount: 0,
        toEliminateCount: 0,
        timer: 30,                  // Réglable par le streamer
        npcs: []                    // Positions randomisées à chaque partie
    }
};

// ============================================
// 🆕 HELPER - BROADCAST LOBBY UPDATE
// ============================================

function updateTeamCounts() {
    gameState.teamCounts = { 1: 0, 2: 0 };
    for (const player of gameState.players.values()) {
        if (player.team === 1) gameState.teamCounts[1]++;
        else if (player.team === 2) gameState.teamCounts[2]++;
    }
}

// 🆕 Calculer les scores d'équipe (vies restantes ou points totaux)
function updateTeamScores() {
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
function checkRivalryWinner() {
    if (gameState.lobbyMode !== 'rivalry') return null;
    
    updateTeamScores();
    
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

function broadcastLobbyUpdate() {
    // Mettre à jour les compteurs d'équipe
    if (gameState.lobbyMode === 'rivalry') {
        updateTeamCounts();
    }
    
    // 💣🎴 Vérifier si le lobby BombAnime/Collect est plein
    const isBombanimeMode = gameState.lobbyMode === 'bombanime';
    const isCollectMode = gameState.lobbyMode === 'collect';
    const maxPlayers = isBombanimeMode ? BOMBANIME_CONFIG.MAX_PLAYERS : (isCollectMode ? COLLECT_CONFIG.MAX_PLAYERS : Infinity);
    const isLobbyFull = (isBombanimeMode || isCollectMode) && gameState.players.size >= maxPlayers;
    
    io.emit('lobby-update', {
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
            title: p.title || 'Novice',
            avatarUrl: p.avatarUrl,
            team: p.team || null,
            isLastGlobalWinner: p.twitchId === lastGlobalWinner,
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
function generateChallenges() {
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
    if (gameState.serieFilter !== 'tout' && gameState.serieFilter !== 'mainstream') {
        poolShield = poolShield.filter(c => c.id !== 'series7');
    }
    
    const challengeShield = { ...poolShield[Math.floor(Math.random() * poolShield.length)], reward: gameState.mode === 'lives' ? 'shield' : 'doublex2' };
    challenges.push(challengeShield);
    
    console.log(`🎯 Défis générés: ${challenges.map(c => c.id).join(', ')}`);
    return challenges;
}

// Initialiser la progression des défis pour un joueur
function initPlayerChallenges(socketId) {
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
function checkChallenges(socketId, answerData) {
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
function getPlayerChallengesState(socketId) {
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
function shouldApplySerieCooldown() {
    return gameState.serieFilter === 'tout' || gameState.serieFilter === 'mainstream';
}

// 🆕 Ajoute une série à l'historique récent (garde les 5 dernières)
function addToRecentSeries(serie) {
    if (!shouldApplySerieCooldown()) return;

    gameState.recentSeries.push(serie);
    if (gameState.recentSeries.length > 5) {
        gameState.recentSeries.shift(); // Retirer la plus ancienne
    }
    console.log(`📚 Séries récentes: [${gameState.recentSeries.join(', ')}]`);
}


function getDifficultyForQuestion(questionNumber) {
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

function getAlivePlayers() {
    return Array.from(gameState.players.values()).filter(p => p.lives > 0);
}

function getEliminatedCount() {
    return Array.from(gameState.players.values()).filter(p => p.lives === 0).length;
}


// ============================================
// 🆕 TRACKING VISITES (discret)
// ============================================
async function logVisit(page, twitchUsername = null, userAgent = null) {
    try {
        await supabase.from('visits').insert({ 
            page,
            twitch_username: twitchUsername,
            user_agent: userAgent
        });
    } catch (e) {}
}


app.get('/', (req, res) => {
    logVisit('home', req.session?.username || null, req.headers['user-agent'] || null);
    res.sendFile(__dirname + '/src/html/home.html');
});

// ============================================
// Routes ADMIN
// ============================================

// Page admin
app.get('/admin', (req, res) => {
    logVisit('admin', req.session?.username || null, req.headers['user-agent'] || null);
    res.sendFile(__dirname + '/src/html/admin.html');
});

// 🆕 Page Ranking
app.get('/ranking', (req, res) => {
    logVisit('ranking', req.session?.username || null, req.headers['user-agent'] || null);
    res.sendFile(__dirname + '/src/html/ranking.html');
});

// Login admin
app.post('/admin/login', (req, res) => {
    const { password, masterOverride } = req.body;

    // ========== CAS 1 : Master override (toi le dev) ==========
    if (masterOverride && masterOverride === MASTER_PASSWORD) {
        req.session.isAdmin = true;
        req.session.isMasterAdmin = true;

        // Ajouter à la liste des masters connectés (SANS déconnecter le streamer)
        masterAdminSessions.add(req.session.id);
        lastAdminActivity = Date.now();

        req.session.save((err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Erreur de session' });
            }
            console.log(`👑 MASTER ADMIN connecté (${masterAdminSessions.size} master(s) actif(s))`);
            res.json({
                success: true,
                isMaster: true,
                canObserve: true // Indique que c'est un mode observation
            });
        });
        return;
    }

    // ========== CAS 2 : Login normal ==========
    if (password === process.env.ADMIN_PASSWORD) {

        // ⚠️ Vérifier si un admin NORMAL est déjà connecté
        if (activeAdminSession && activeAdminSession !== req.session.id) {
            const minutesConnected = Math.floor((Date.now() - activeAdminLoginTime) / 60000);
            return res.status(409).json({
                success: false,
                error: 'admin_already_connected',
                message: '',
                connectedSince: minutesConnected,
                requiresMaster: true
            });
        }

        // Sinon, autoriser la connexion normale
        req.session.isAdmin = true;
        req.session.isMasterAdmin = false; // Pas un master
        activeAdminSession = req.session.id;
        activeAdminLoginTime = Date.now();
        lastAdminActivity = Date.now();

        req.session.save((err) => {
            if (err) {
                console.error('❌ Erreur sauvegarde session:', err);
                return res.status(500).json({ success: false, message: 'Erreur de session' });
            }
            console.log('✅ Admin normal connecté - Slot pris');
            res.json({ success: true, isMaster: false });
        });
        return;
    }

    // ========== CAS 3 : Mot de passe incorrect ==========
    res.status(401).json({ success: false, message: 'Mot de passe incorrect' });
});

// 🆕 Route secrète pour voir les visites
app.get('/visits-stats', async (req, res) => {
    try {
        const { data: homeVisits } = await supabase
            .from('visits')
            .select('timestamp')
            .eq('page', 'home')
            .order('timestamp', { ascending: false })
            .limit(20);

        const { data: adminVisits } = await supabase
            .from('visits')
            .select('timestamp')
            .eq('page', 'admin')
            .order('timestamp', { ascending: false })
            .limit(20);

        const { count: homeCount } = await supabase
            .from('visits')
            .select('*', { count: 'exact', head: true })
            .eq('page', 'home');

        const { count: adminCount } = await supabase
            .from('visits')
            .select('*', { count: 'exact', head: true })
            .eq('page', 'admin');

        res.json({
            total: { home: homeCount || 0, admin: adminCount || 0 },
            recent: {
                home: homeVisits?.map(v => new Date(v.timestamp).toLocaleString('fr-FR')) || [],
                admin: adminVisits?.map(v => new Date(v.timestamp).toLocaleString('fr-FR')) || []
            }
        });
    } catch (e) {
        res.json({ error: e.message });
    }
});

// Vérifier si admin
app.get('/admin/check', (req, res) => {
    res.json({ isAdmin: req.session.isAdmin === true });
});

// Vérifier l'authentification admin (utilisé par le nouveau panel)
app.get('/admin/auth', (req, res) => {
    res.json({ authenticated: req.session.isAdmin === true });
});


app.get('/admin/game-state', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    // 💣🎴 Vérifier si le lobby BombAnime/Collect est plein
    const isBombanimeMode = gameState.lobbyMode === 'bombanime';
    const isCollectMode = gameState.lobbyMode === 'collect';
    const maxPlayers = isBombanimeMode ? BOMBANIME_CONFIG.MAX_PLAYERS : (isCollectMode ? COLLECT_CONFIG.MAX_PLAYERS : Infinity);
    const isLobbyFull = (isBombanimeMode || isCollectMode) && gameState.players.size >= maxPlayers;

    res.json({
        isActive: gameState.isActive,
        phase: gameState.inProgress ? 'playing' : (gameState.isActive ? 'lobby' : 'idle'),
        players: Array.from(gameState.players.values()).map(p => ({
            username: p.username,
            twitch_id: p.twitchId,
            twitchId: p.twitchId,
            title: p.title || 'Novice',
            isChampion: p.twitchId === lastGlobalWinner
        })),
        playerCount: gameState.players.size,
        lobbyMode: gameState.lobbyMode,
        maxPlayers: maxPlayers,
        isLobbyFull: isLobbyFull
    });
});

// Activer/désactiver le jeu
app.post('/admin/toggle-game', async (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé - Session expirée' });
    }

    gameState.isActive = !gameState.isActive;

    if (gameState.isActive) {
        console.log('✅ Jeu activé - Lobby ouvert');
        
        // 🔥 FIX: Clear le winnerScreenData pour éviter les données stale
        // (ex: après BombAnime le winner screen data persiste car closeBombanimeWinner n'appelle pas le serveur)
        winnerScreenData = null;
        
        // 🆕 Récupérer le mode et les noms d'équipe depuis la requête
        const { lobbyMode, teamNames, bombanimeSerie, bombanimeTimer, bombanimeLives } = req.body || {};
        gameState.lobbyMode = lobbyMode || 'classic';
        if (teamNames) {
            gameState.teamNames = teamNames;
        } else {
            gameState.teamNames = { 1: 'Team A', 2: 'Team B' };
        }
        gameState.teamCounts = { 1: 0, 2: 0 };
        
        // 💣 Configuration BombAnime
        if (lobbyMode === 'bombanime') {
            gameState.bombanime.serie = bombanimeSerie || 'Naruto';
            gameState.bombanime.timer = bombanimeTimer || BOMBANIME_CONFIG.DEFAULT_TIMER;
            gameState.bombanime.lives = bombanimeLives || BOMBANIME_CONFIG.DEFAULT_LIVES;
            console.log(`💣 BombAnime configuré: ${gameState.bombanime.serie} - ${gameState.bombanime.timer}s - ${gameState.bombanime.lives} vies`);
        }
        
        console.log(`🎮 Mode: ${gameState.lobbyMode}${gameState.lobbyMode === 'rivalry' ? ` (${gameState.teamNames[1]} vs ${gameState.teamNames[2]})` : ''}${gameState.lobbyMode === 'bombanime' ? ` (${gameState.bombanime.serie})` : ''}`);

        resetLogs();

        // Reset la grille des joueurs à l'ouverture du lobby
        gameState.players.clear();
        gameState.answers.clear();
        pendingJoins.clear(); // 🔓 Reset les réservations
        gameState.currentQuestionIndex = 0;
        gameState.currentQuestion = null;
        gameState.showResults = false;
        gameState.lastQuestionResults = null;
        gameState.questionStartTime = null;
        gameState.gameStartTime = null;
        gameState.inProgress = false;
        gameState.currentGameId = null;
        gameState.livesIcon = 'heart';

        // 🔥 NOUVEAU: Reset tiebreaker
        gameState.isTiebreaker = false;
        gameState.tiebreakerPlayers = [];
        gameState.isRivalryTiebreaker = false; // 🔥 FIX: Reset rivalry tiebreaker aussi
        
        // 🔥 FIX: Annuler les timeouts stale d'une partie précédente
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

        io.emit('game-activated', {
            lives: gameState.lives,
            questionTime: gameState.questionTime,
            lobbyMode: gameState.lobbyMode,
            teamNames: gameState.teamNames,
            noSpoil: gameState.noSpoil, // 🚫 Filtre anti-spoil
            bonusEnabled: gameState.bonusEnabled, // 🎮 Bonus activés
            // 💣 Données BombAnime
            bombanimeSerie: gameState.bombanime.serie,
            bombanimeTimer: gameState.bombanime.timer
        });
    } else {
        console.log('❌ Jeu désactivé');

        // Reset complet de l'état si une partie était en cours
        if (gameState.inProgress && gameState.currentGameId) {
            console.log('⚠️ Partie en cours annulée - Suppression de la BDD');

            // 🔥 Supprimer la partie interrompue (pas de winner = pas de vraie partie)
            try {
                await supabase
                    .from('games')
                    .delete()
                    .eq('id', gameState.currentGameId);
                console.log(`🗑️ Partie ${gameState.currentGameId} supprimée (interrompue)`);
            } catch (error) {
                console.error('❌ Erreur suppression partie:', error);
            }
        }

        winnerScreenData = null;
        gameState.inProgress = false;
        gameState.currentGameId = null;
        gameState.currentQuestionIndex = 0;
        gameState.currentQuestion = null;
        gameState.showResults = false;
        gameState.lastQuestionResults = null;
        gameState.players.clear();
        gameState.answers.clear();
        pendingJoins.clear(); // 🔓 Reset les réservations
        gameState.questionStartTime = null;
        gameState.gameStartTime = null;

        gameState.playerBonuses.clear();
        
        // 🆕 Reset mode Rivalité
        gameState.lobbyMode = 'classic';
        gameState.teamNames = { 1: 'Team A', 2: 'Team B' };
        gameState.teamCounts = { 1: 0, 2: 0 };
        
        // 🚫 Reset anti-spoil
        gameState.noSpoil = false;
        
        // 🔥 FIX: Reset tiebreaker flags
        gameState.isTiebreaker = false;
        gameState.tiebreakerPlayers = [];
        gameState.isRivalryTiebreaker = false;
        
        // 🔥 FIX: Annuler les timeouts stale
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
        
        // 💣 Reset BombAnime
        resetBombanimeState();
        
        // 🎮 Reset Survie/Trace
        if (gameState.survie) {
            // Clear any active round timers
            if (gameState.survie.roundTimer) {
                clearTimeout(gameState.survie.roundTimer);
            }
            gameState.survie = {
                active: false, currentRound: 0, roundTimer: null, roundTimerEndTime: null,
                roundInProgress: false, alivePlayers: [], eliminatedPlayers: [],
                currentEpreuve: null, usedEpreuves: [], completedPlayers: [],
                qualifiedCount: 0, toEliminateCount: 0, timer: 30,
                npcs: [], quests: [], groundItems: [], boosts: [],
                playerQuestStates: {}
            };
            console.log('🎮 Survie/Trace state reset');
        }

        io.emit('game-deactivated');
    }

    res.json({ isActive: gameState.isActive });
});

// 💣 Mettre à jour la série BombAnime
app.post('/admin/bombanime/update-serie', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }
    
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
    io.emit('bombanime-serie-updated', { 
        serie: serie,
        characterCount: BOMBANIME_CHARACTERS[serie].length 
    });
    
    res.json({ success: true, serie: serie });
});

// 💣 Fermer le lobby BombAnime spécifiquement
app.post('/admin/bombanime/close-lobby', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }
    
    // Fermer le lobby
    gameState.isActive = false;
    gameState.inProgress = false;
    
    // Reset BombAnime
    resetBombanimeState();
    
    // Reset Collect
    if (gameState.collect) {
        resetCollectState();
    }
    
    // Reset winnerScreenData
    winnerScreenData = null;
    
    // Vider les joueurs
    gameState.players.clear();
    
    // Notifier les clients
    io.emit('game-deactivated');
    io.emit('bombanime-lobby-closed');
    io.emit('collect-state', { active: false });
    
    console.log('🔒 Lobby fermé (BombAnime/Collect reset)');
    res.json({ success: true });
});

// ============================================
// 📝 BOMBANIME SUGGESTIONS ROUTES
// ============================================

// Créer une nouvelle suggestion
app.post('/admin/bombanime/suggestion', async (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }
    
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
            submittedBy: req.session.adminUsername || 'Admin'
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
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }
    
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
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }
    
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
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }
    
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
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }
    
    const animes = Object.keys(BOMBANIME_CHARACTERS).map(key => ({
        key,
        count: BOMBANIME_CHARACTERS[key].length
    }));
    
    res.json({ animes });
});

// Mettre à jour les paramètres du jeu (vies et temps)
app.post('/admin/update-settings', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    const { lives, timePerQuestion } = req.body;

    if (lives) {
        gameState.lives = parseInt(lives);
    }
    if (timePerQuestion) {
        gameState.questionTime = parseInt(timePerQuestion);
    }

    console.log(`⚙️ Paramètres mis à jour: ${gameState.lives}❤️ - ${gameState.questionTime}s`);

    // Notifier tous les clients des nouveaux paramètres
    io.emit('game-config-updated', {
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
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    const { lives } = req.body;
    gameState.lives = parseInt(lives);

    console.log(`⚙️ Vies mises à jour: ${gameState.lives}❤️`);

    // Mettre à jour les vies de tous les joueurs déjà connectés dans le lobby
    if (!gameState.inProgress && gameState.players.size > 0) {
        gameState.players.forEach(player => {
            player.lives = gameState.lives;
        });

        // Notifier l'admin pour rafraîchir la grille joueurs
        broadcastLobbyUpdate();

        console.log(`✅ Vies mises à jour pour ${gameState.players.size} joueur(s) dans le lobby`);
    }

    res.json({ success: true, lives: gameState.lives });
});

// Route séparée pour changer le temps par question
app.post('/admin/set-time', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    const { time } = req.body;
    gameState.questionTime = parseInt(time);

    console.log(`⚙️ Temps par question mis à jour: ${gameState.questionTime}s`);

    // Notifier tous les clients du nouveau temps
    io.emit('game-config-updated', {
        lives: gameState.lives,
        questionTime: gameState.questionTime
    });

    res.json({ success: true, questionTime: gameState.questionTime });
});

// Route séparée pour changer le nombre de réponses
app.post('/admin/set-answers', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    const { answers } = req.body;
    gameState.answersCount = parseInt(answers);

    console.log(`⚙️ Nombre de réponses mis à jour: ${gameState.answersCount}`);

    // Notifier tous les clients du nouveau paramètre
    io.emit('game-config-updated', {
        lives: gameState.lives,
        questionTime: gameState.questionTime,
        answersCount: gameState.answersCount
    });

    res.json({ success: true, answersCount: gameState.answersCount });
});

// Démarrer une partie
app.post('/admin/start-game', async (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    if (gameState.inProgress) {
        return res.status(400).json({ error: 'Une partie est déjà en cours' });
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
            const result = await startBombanimeGame();
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

    // 🎴 MODE COLLECT - Démarrage spécial
    if (gameState.lobbyMode === 'collect') {
        // Récupérer les paramètres envoyés
        const { collectAnimes, collectHandSize } = req.body || {};
        
        // Stocker la taille de main
        gameState.collect.handSize = parseInt(collectHandSize) || 3;
        if (gameState.collect.handSize !== 3 && gameState.collect.handSize !== 5) {
            gameState.collect.handSize = 3;
        }
        
        // Stocker les animes sélectionnés
        if (collectAnimes && Array.isArray(collectAnimes) && collectAnimes.length > 0) {
            gameState.collect.selectedAnimes = collectAnimes;
            console.log(`🎴 Animes sélectionnés: ${collectAnimes.length}/${Object.keys(COLLECT_CARDS_DATA).length}`);
        } else {
            gameState.collect.selectedAnimes = Object.keys(COLLECT_CARDS_DATA);
            console.log('🎴 Tous les animes sélectionnés');
        }
        console.log(`🎴 Cartes en main: ${gameState.collect.handSize}`);
        
        // Vérifier les limites de joueurs (2-10)
        if (totalPlayers > 10) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 5 joueurs en mode Collect'
            });
        }
        
        try {
            const result = await startCollectGame();
            if (result.success) {
                return res.json({ success: true, mode: 'collect' });
            } else {
                return res.status(400).json({ success: false, error: result.error });
            }
        } catch (error) {
            console.error('❌ Erreur démarrage Collect:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // 🎮 MODE SURVIE - Démarrage spécial
    if (gameState.lobbyMode === 'survie') {
        if (totalPlayers > SURVIE_CONFIG.MAX_PLAYERS) {
            return res.status(400).json({
                success: false,
                error: `Maximum ${SURVIE_CONFIG.MAX_PLAYERS} joueurs en mode Survie`
            });
        }
        
        try {
            const result = await startSurvieGame();
            if (result.success) {
                return res.json({ success: true, mode: 'survie' });
            } else {
                return res.status(400).json({ success: false, error: result.error });
            }
        } catch (error) {
            console.error('❌ Erreur démarrage Survie:', error);
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
        // 🎙️ Identifier le streamer admin (pour historique questions séparé)
        gameState.streamerId = req.session.twitchId || null;
        
        if (gameState.streamerId) {
            console.log(`🎙️ Streamer ID: ${gameState.streamerId} — historique personnalisé activé`);
            // Charger l'historique des questions utilisées (par streamer)
            gameState.usedQuestionIds = await db.getUsedQuestionIds(gameState.streamerId);
            console.log(`📊 ${gameState.usedQuestionIds.length} questions déjà utilisées pour ce streamer`);
        } else {
            console.log(`🎙️ Aucun streamer Twitch connecté — pas d'historique de questions`);
            gameState.usedQuestionIds = [];
        }

        const game = await db.createGame(totalPlayers, gameState.mode);

        gameState.inProgress = true;
        gameState.currentGameId = game.id;
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
        addLog('game-start', { playerCount });

        gameState.playerBonuses.clear();
        console.log('🔄 Bonus reset pour nouvelle partie');

        // 🆕 Générer les défis pour cette partie (seulement si bonus activés)
        if (gameState.bonusEnabled) {
            gameState.activeChallenges = generateChallenges();
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
                initPlayerChallenges(socketId);
            }
        });

        console.log(`🎮 Partie démarrée (Mode: ${gameState.mode.toUpperCase()}) - ${totalPlayers} joueurs - Filtre: ${gameState.serieFilter}`);

        io.sockets.sockets.forEach((socket) => {
            const socketId = socket.id;
            const player = gameState.players.get(socketId);

            if (player) {
                socket.emit('game-started', {
                    totalPlayers,
                    isParticipating: true,
                    gameMode: gameState.mode,
                    questionsCount: gameState.mode === 'points' ? gameState.questionsCount : null,
                    challenges: getPlayerChallengesState(socketId), // 🆕 Envoyer les défis
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
        });

        // 🔥 NOUVEAU: Envoyer automatiquement la première question après 2s
        setTimeout(async () => {
            try {
                gameState.currentQuestionIndex = 1;

                const difficulty = getDifficultyForQuestion(1);
                const questions = await db.getRandomQuestions(
                    difficulty,
                    1,
                    gameState.usedQuestionIds,
                    gameState.serieFilter,
                    shouldApplySerieCooldown() ? gameState.recentSeries : [],
                    gameState.noSpoil,  // 🚫 Filtre anti-spoil
                    gameState.streamerId
                );

                if (questions.length === 0) {
                    console.error('❌ Aucune question disponible');
                    return;
                }

                const question = questions[0];
                addToRecentSeries(question.serie);
                if (gameState.streamerId) await db.addUsedQuestion(question.id, question.difficulty, gameState.streamerId);
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

                addLog('question', {
                    questionNumber: 1,
                    difficulty: difficulty,
                    series: question.serie
                });

                // Envoyer la question aux joueurs
                io.emit('new-question', questionData);

                // Timer pour révéler les réponses
                setTimeout(() => {
                    if (gameState.inProgress) {
                        revealAnswers(newCorrectIndex);
                    }
                }, gameState.questionTime * 1000);

            } catch (error) {
                console.error('❌ Erreur envoi première question:', error);
            }
        }, 2000);

        res.json({ success: true, gameId: game.id, mode: gameState.mode });

    } catch (error) {
        console.error('❌ Erreur démarrage partie:', error);
        res.status(500).json({ error: error.message });
    }
});


// Route pour changer le mode de jeu
app.post('/admin/set-mode', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

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

    io.emit('game-config-updated', {
        mode: gameState.mode,
        lives: gameState.lives,
        questionTime: gameState.questionTime,
        answersCount: gameState.answersCount,
        questionsCount: gameState.questionsCount
    });

    broadcastLobbyUpdate();

    res.json({ success: true, mode: gameState.mode });
});

// Route pour changer le nombre de questions (Mode Points)
app.post('/admin/set-questions', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    const { questions } = req.body;
    const validCounts = [15, 20, 25, 30, 35, 40, 45, 50];

    if (!validCounts.includes(parseInt(questions))) {
        return res.status(400).json({ error: 'Nombre de questions invalide' });
    }

    gameState.questionsCount = parseInt(questions);
    console.log(`⚙️ Nombre de questions mis à jour: ${gameState.questionsCount}`);

    io.emit('game-config-updated', {
        mode: gameState.mode,
        lives: gameState.lives,
        questionTime: gameState.questionTime,
        answersCount: gameState.answersCount,
        questionsCount: gameState.questionsCount
    });

    res.json({ success: true, questionsCount: gameState.questionsCount });
});

// 🆕 Route pour activer/désactiver le bonus rapidité (mode points uniquement)
app.post('/admin/set-speed-bonus', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    const { enabled } = req.body;
    gameState.speedBonus = enabled === true;
    console.log(`⚡ Bonus rapidité: ${gameState.speedBonus ? 'Activé' : 'Désactivé'}`);

    res.json({ success: true, speedBonus: gameState.speedBonus });
});

// 🎮 Route pour activer/désactiver les bonus (jauge combo, bonus, défis)
app.post('/admin/set-bonus-enabled', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    const { enabled } = req.body;
    gameState.bonusEnabled = enabled === true;
    console.log(`🎮 Bonus (jauge/défis): ${gameState.bonusEnabled ? 'Activé' : 'Désactivé'}`);

    res.json({ success: true, bonusEnabled: gameState.bonusEnabled });
});


// Route pour changer le mode de difficulté
app.post('/admin/set-difficulty-mode', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

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

    io.emit('game-config-updated', {
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
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    if (gameState.inProgress) {
        return res.status(400).json({
            error: 'Impossible de changer le filtre pendant une partie',
            blocked: true
        });
    }

    const { enabled } = req.body;
    gameState.noSpoil = enabled === true;
    console.log(`🚫 Filtre anti-spoil: ${gameState.noSpoil ? 'Activé (masqué)' : 'Désactivé (autorisé)'}`);

    io.emit('game-config-updated', {
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
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    try {
        const allQuestions = await db.getAllQuestions();

        // Compter les séries uniques
        const uniqueSeries = new Set(allQuestions.map(q => q.serie).filter(s => s));
        const totalSeries = uniqueSeries.size;

        const stats = {};

        // 🔥 AUTOMATIQUE: Générer les stats pour chaque filtre dans SERIES_FILTERS
        for (const [filterId, filterConfig] of Object.entries(SERIES_FILTERS)) {
            if (filterId === 'tout') {
                stats.tout = {
                    count: allQuestions.length,
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
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

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

    io.emit('game-config-updated', {
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
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    gameState.autoMode = !gameState.autoMode;
    console.log(`⚙️ Mode Auto ${gameState.autoMode ? 'activé' : 'désactivé'}`);

    // 🔥 AJOUTER - Annuler le timeout si on désactive le mode auto
    if (!gameState.autoMode && gameState.autoModeTimeout) {
        clearTimeout(gameState.autoModeTimeout);
        gameState.autoModeTimeout = null;
        console.log('⏹️ Timeout auto-mode annulé');
    }

    io.emit('game-config-updated', {
        mode: gameState.mode,
        lives: gameState.lives,
        questionTime: gameState.questionTime,
        answersCount: gameState.answersCount,
        questionsCount: gameState.questionsCount,
        difficultyMode: gameState.difficultyMode,
        autoMode: gameState.autoMode
    });

    res.json({ success: true, autoMode: gameState.autoMode });
});

// Route pour forcer le déclenchement du mode auto (si activé pendant résultats)
app.post('/admin/trigger-auto-next', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

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
                await sendTiebreakerQuestion();
                return;
            }

            gameState.currentQuestionIndex++;

            if (gameState.mode === 'points' && gameState.currentQuestionIndex > gameState.questionsCount) {
                endGameByPoints();
                return;
            }

            const difficulty = getDifficultyForQuestion(gameState.currentQuestionIndex);
            const questions = await db.getRandomQuestions(
                difficulty,
                1,
                gameState.usedQuestionIds,
                gameState.serieFilter,
                shouldApplySerieCooldown() ? gameState.recentSeries : [],  // 🆕
                gameState.noSpoil,  // 🚫 Filtre anti-spoil
                    gameState.streamerId
            );


            if (questions.length === 0) {
                console.error('❌ Mode Auto : Aucune question disponible');
                return;
            }

            const question = questions[0];
            addToRecentSeries(question.serie);
            if (gameState.streamerId) await db.addUsedQuestion(question.id, question.difficulty, gameState.streamerId);
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
            io.emit('prepare-next-question');

            // Attendre 400ms pour l'animation de fermeture
            await new Promise(resolve => setTimeout(resolve, 400));

            io.emit('new-question', questionData);

            setTimeout(() => {
                if (gameState.inProgress) {
                    revealAnswers(newCorrectIndex);
                }
            }, gameState.questionTime * 1000);

        } catch (error) {
            console.error('❌ Erreur trigger auto:', error);
        }
    }, 5000);

    res.json({ success: true });
});


// Route pour forcer le refresh de tous les joueurs AUTHENTIFIÉS
app.post('/admin/refresh-players', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    try {
        const now = Date.now();
        const timeSinceLastRefresh = now - lastRefreshPlayersTime;

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
        lastRefreshPlayersTime = now;

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
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshPlayersTime;

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

// Route pour reset manuel de l'historique des questions
app.post('/admin/reset-questions-history', async (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    try {
        const streamerId = req.session.twitchId || gameState.streamerId;
        if (!streamerId) {
            return res.json({ success: true, message: 'Pas de streamer connecté — rien à réinitialiser' });
        }
        await db.resetUsedQuestions(null, streamerId);
        gameState.usedQuestionIds = [];
        console.log(`🔄 Historique des questions réinitialisé manuellement [streamer: ${streamerId}]`);
        res.json({ success: true, message: 'Historique réinitialisé' });
    } catch (error) {
        console.error('❌ Erreur reset questions:', error);
        res.status(500).json({ error: error.message });
    }
});

// Passer à la question suivante
app.post('/admin/next-question', async (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    if (!gameState.inProgress) {
        return res.status(400).json({ error: 'Aucune partie en cours' });
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
            await sendTiebreakerQuestion();
            return res.json({ success: true, tiebreaker: true });
        }
        
        // 🆕 RIVALRY TIEBREAKER: Si tiebreaker rivalry, lancer une question de départage
        if (gameState.isRivalryTiebreaker) {
            console.log('⚔️ Admin lance une question de départage Rivalry');
            await sendRivalryTiebreakerQuestion();
            return res.json({ success: true, rivalryTiebreaker: true });
        }

        // Logique normale
        gameState.currentQuestionIndex++;

        // Vérifier si on a atteint le nombre max de questions en mode Points
        if (gameState.mode === 'points' && gameState.currentQuestionIndex > gameState.questionsCount) {
            // Fin de partie - déterminer le gagnant par points
            endGameByPoints();
            return res.json({ success: true, gameEnded: true });
        }

        const difficulty = getDifficultyForQuestion(gameState.currentQuestionIndex);

        // 🔥 DEBUG: Afficher le filtre utilisé
        console.log(`🔍 Filtre série actif: ${gameState.serieFilter}`);

        const questions = await db.getRandomQuestions(
            difficulty,
            1,
            gameState.usedQuestionIds,
            gameState.serieFilter,
            shouldApplySerieCooldown() ? gameState.recentSeries : [],  // 🆕
            gameState.noSpoil,  // 🚫 Filtre anti-spoil
                    gameState.streamerId
        );


        if (questions.length === 0) {
            return res.status(404).json({ error: 'Aucune question disponible' });
        }

        const question = questions[0];
        addToRecentSeries(question.serie);

        // 🔥 DEBUG: Afficher la série de la question retournée
        console.log(`📌 Question série: ${question.serie}, difficulté: ${difficulty}`);

        if (gameState.streamerId) await db.addUsedQuestion(question.id, question.difficulty, gameState.streamerId);
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
        updateLiveAnswerStats();

        addLog('question', {
            questionNumber: gameState.currentQuestionIndex,
            difficulty: difficulty,
            series: question.serie
        });


        io.emit('new-question', questionData);

        setTimeout(() => {
            if (gameState.inProgress) {
                revealAnswers(newCorrectIndex);
            }
        }, gameState.questionTime * 1000);

        res.json({ success: true, question: questionData });
    } catch (error) {
        console.error('❌ Erreur question suivante:', error);
        res.status(500).json({ error: error.message });
    }
});


app.post('/admin/logout-silent', (req, res) => {
    if (req.session.id === activeAdminSession) {
        activeAdminSession = null;
        activeAdminLoginTime = null;
        console.log('🔓 Slot admin normal libéré (silent)');
    }

    if (req.session.isMasterAdmin) {
        masterAdminSessions.delete(req.session.id);
        console.log(`👑 Master déconnecté (silent) (${masterAdminSessions.size} restant(s))`);
    }

    req.session.destroy();
    res.json({ success: true });
});


// Vérifier le statut de connexion admin
app.get('/admin/connection-status', (req, res) => {
    if (!req.session.isAdmin) {
        return res.json({ connected: false });
    }

    res.json({
        connected: true,
        isMaster: req.session.isMasterAdmin || false,
        hasControl: req.session.id === activeAdminSession,
        normalAdminConnected: !!activeAdminSession,
        mastersConnected: masterAdminSessions.size
    });
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
function revealAnswers(correctAnswer) {
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
        revealTiebreakerAnswers(correctAnswer);
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
                updatePlayerCombo(socketId);
            } else {
                stats.wrong++;
                status = 'wrong';
            }

            playersDetails.push({
                socketId: socketId,
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
        const alivePlayers = getAlivePlayers();
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
                            addLog('eliminated', {
                                username: player.username,
                                playerColor: playerColors[player.username]
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

                updatePlayerCombo(socketId);

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
                            addLog('eliminated', {
                                username: player.username,
                                playerColor: playerColors[player.username]
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
        : getAlivePlayers();

    const playersData = Array.from(gameState.players.values()).map(player => ({
        twitchId: player.twitchId,
        username: player.username,
        lives: player.lives,
        correctAnswers: player.correctAnswers,
        points: player.points || 0,
        isLastGlobalWinner: player.twitchId === lastGlobalWinner,
        team: player.team || null // 🆕 Équipe du joueur
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
        
        const completedChallenges = checkChallenges(p.socketId, answerData);
        
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
                challenges: getPlayerChallengesState(p.socketId),
                completedChallenges: completedChallenges
            });
        }
    });

    // 🆕 Mettre à jour les scores d'équipe en mode Rivalité
    if (gameState.lobbyMode === 'rivalry') {
        updateTeamScores();
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
        teamNames: gameState.lobbyMode === 'rivalry' ? gameState.teamNames : null
    };

    gameState.showResults = true;
    gameState.lastQuestionResults = resultsData;

    io.emit('question-results', resultsData);

    // Vérifier fin de partie selon le mode
    if (gameState.mode === 'lives') {
        // Recalculer les joueurs en vie APRÈS les mises à jour
        const currentAlivePlayers = getAlivePlayers();
        console.log(`🔍 Joueurs en vie après cette question: ${currentAlivePlayers.length}`);

        // 🆕 MODE RIVALITÉ : Vérifier si une équipe est éliminée
        if (gameState.lobbyMode === 'rivalry') {
            const rivalryWinner = checkRivalryWinner();
            if (rivalryWinner && rivalryWinner !== 'draw') {
                console.log(`🏆 Fin de partie Rivalité - Équipe gagnante: Team ${rivalryWinner} (${gameState.teamNames[rivalryWinner]})`);
                endGameRivalry(rivalryWinner);
                return;
            } else if (rivalryWinner === 'draw') {
                console.log(`⚖️ Égalité en mode Rivalité - Les deux équipes éliminées`);
                endGameRivalry('draw');
                return;
            }
        } else {
            // Mode classique
            if (currentAlivePlayers.length <= 1) {
                // 0 ou 1 joueur restant = fin de partie
                const winner = currentAlivePlayers.length === 1 ? currentAlivePlayers[0] : null;
                console.log(`🏁 Fin de partie mode vie - Gagnant: ${winner ? winner.username : 'Aucun'}`);
                endGame(winner);
                return; // 🔥 IMPORTANT: Arrêter ici pour ne pas continuer avec le mode auto
            }
        }
    } else if (gameState.mode === 'points' && gameState.currentQuestionIndex >= gameState.questionsCount) {
        // 🆕 MODE RIVALITÉ : Fin par points
        if (gameState.lobbyMode === 'rivalry') {
            gameState.rivalryEndGameTimeout = setTimeout(() => {
                endGameRivalryPoints();
            }, 100); // 🔥 FIX: Afficher le winner directement (comme en classique)
            return; // 🆕 IMPORTANT: Arrêter pour ne pas continuer avec le mode auto
        } else {
            // Terminer automatiquement après la dernière question
            setTimeout(() => {
                endGameByPoints();
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
        
        console.log('⏱️ Mode Auto : Question suivante dans 3s...');

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
                await sendTiebreakerQuestion();
                return;
            }

            // Logique normale (copie de /admin/next-question)
            gameState.currentQuestionIndex++;

            // Vérifier si on a atteint le nombre max de questions en mode Points
            if (gameState.mode === 'points' && gameState.currentQuestionIndex > gameState.questionsCount) {
                endGameByPoints();
                return;
            }

            try {
                const difficulty = getDifficultyForQuestion(gameState.currentQuestionIndex);

                // 🔥 FIX: AJOUTER gameState.serieFilter (c'était probablement déjà là, mais vérifie bien)
                console.log(`🔍 [Mode Auto Timer] Filtre série: ${gameState.serieFilter}`); // 🔥 NOUVEAU LOG

                const questions = await db.getRandomQuestions(
                    difficulty,
                    1,
                    gameState.usedQuestionIds,
                    gameState.serieFilter,
                    shouldApplySerieCooldown() ? gameState.recentSeries : [],  // 🆕
                    gameState.noSpoil,  // 🚫 Filtre anti-spoil
                    gameState.streamerId
                );

                if (questions.length === 0) {
                    console.error('❌ Aucune question disponible (mode auto)');
                    return;
                }

                const question = questions[0];
                addToRecentSeries(question.serie);
                if (gameState.streamerId) await db.addUsedQuestion(question.id, question.difficulty, gameState.streamerId);
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

                addLog('question', {
                    questionNumber: gameState.currentQuestionIndex,
                    difficulty: difficulty,
                    series: question.serie
                });

                // 🔥 Animation de fermeture avant la nouvelle question
                io.emit('prepare-next-question');
                await new Promise(resolve => setTimeout(resolve, 400));

                io.emit('new-question', questionData);

                setTimeout(() => {
                    if (gameState.inProgress) {
                        revealAnswers(newCorrectIndex);
                    }
                }, gameState.questionTime * 1000);

            } catch (error) {
                console.error('❌ Erreur mode auto:', error);
            }
        }, 5000); // 3 secondes
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
function revealTiebreakerAnswers(correctAnswer) {
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
        isLastGlobalWinner: player.twitchId === lastGlobalWinner
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

    io.emit('question-results', resultsData);

    console.log(`⚔️ Résultats tiebreaker: ${stats.correct} bonne(s) réponse(s), ${stats.wrong} mauvaise(s), ${stats.afk} AFK`);

    // 🔥 FIX: Vérifier IMMÉDIATEMENT le gagnant
    setTimeout(async () => {
        await checkTiebreakerWinner();
    }, 100);
}


// Fonction pour terminer une partie en mode Points
async function endGameByPoints() {
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
            lastGlobalWinner = winner.twitchId;

            if (winner && winner.points > 0) {
                await db.endGame(
                    gameState.currentGameId,
                    winner.twitchId,
                    gameState.currentQuestionIndex,
                    duration
                );
                
                // 🆕 Stats comptabilisées uniquement si 15+ joueurs
                if (gameState.initialPlayerCount >= MIN_PLAYERS_FOR_STATS) {
                    await db.updateUserStats(winner.twitchId, true, 1);
                    
                    // Mettre à jour les stats des perdants
                    let placement = 2;
                    for (const player of sortedPlayers.slice(1)) {
                        await db.updateUserStats(player.twitchId, false, placement++);
                    }
                    console.log(`📊 Stats mises à jour (${gameState.initialPlayerCount} joueurs)`);
                } else {
                    console.log(`⚠️ Stats NON comptabilisées (${gameState.initialPlayerCount} < ${MIN_PLAYERS_FOR_STATS} joueurs)`);
                }

                addLog('game-end', { winner: winner.username });

                const winnerUser = await db.getUserByTwitchId(winner.twitchId);

                const winnerData = {
                    username: winner.username,
                    points: winner.points || 0,
                    totalVictories: winnerUser ? winnerUser.total_victories : 1
                };

                console.log(`🏆 Gagnant: ${winner.username} avec ${winner.points} points`);

                // Créer le podium Top 3
                const podium = sortedPlayers.slice(0, 3).map((player, index) => ({
                    rank: index + 1,
                    username: player.username,
                    points: player.points || 0
                }));

                const { playersData, topPlayers } = await generateGameEndedData();
                
                // 🔥 Sauvegarder les données de la dernière question AVANT le reset
                const lastQuestionPlayers = getLastQuestionPlayersData();

                winnerScreenData = {
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

                io.emit('game-ended', {
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
                resetGameState();
            }
        }
        // CAS 2: ÉGALITÉ → QUESTION DE DÉPARTAGE
        else {
            console.log(`⚖️ ÉGALITÉ: ${winners.length} joueurs avec ${maxPoints} points → Question de départage !`);

            // Stocker les twitchId
            gameState.isTiebreaker = true;
            gameState.tiebreakerPlayers = winners.map(w => w.twitchId);

            addLog('tiebreaker', { playerCount: winners.length });

            io.emit('tiebreaker-announced', {
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
async function sendTiebreakerQuestion() {
    try {
        gameState.currentQuestionIndex++;

        // Toujours prendre une question EXTREME pour le tiebreaker
        const difficulty = 'extreme';

        const questions = await db.getRandomQuestions(
            difficulty,
            1,
            gameState.usedQuestionIds,
            gameState.serieFilter,
            shouldApplySerieCooldown() ? gameState.recentSeries : [],  // 🆕
            gameState.noSpoil,  // 🚫 Filtre anti-spoil
                    gameState.streamerId
        );


        if (questions.length === 0) {
            console.error('❌ Aucune question extreme disponible pour tiebreaker');
            // Fallback: terminer avec égalité
            await endGameWithTie();
            return;
        }

        const question = questions[0];
        addToRecentSeries(question.serie);
        if (gameState.streamerId) await db.addUsedQuestion(question.id, question.difficulty, gameState.streamerId);
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
            difficulty: 'TIEBREAKER - EXTREME',
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

        addLog('question', {
            questionNumber: gameState.currentQuestionIndex,
            difficulty: 'TIEBREAKER - EXTREME',
            series: question.serie
        });

        // Envoyer la question à TOUS les joueurs
        io.emit('new-question', questionData);

        // 🔥 FIX: Attendre la fin du timer PUIS révéler
        setTimeout(() => {
            if (gameState.inProgress && gameState.isTiebreaker) {
                revealTiebreakerAnswers(newCorrectIndex);
            }
        }, gameState.questionTime * 1000);

    } catch (error) {
        console.error('❌ Erreur question tiebreaker:', error);
    }
}

// 🔥 FIX TIEBREAKER: Fonction pour vérifier si on a un gagnant
async function checkTiebreakerWinner() {
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
            // Enregistrer la victoire
            await db.endGame(
                gameState.currentGameId,
                winner.twitchId,
                gameState.currentQuestionIndex,
                duration
            );
            
            // 🆕 Stats comptabilisées uniquement si 15+ joueurs
            if (gameState.initialPlayerCount >= MIN_PLAYERS_FOR_STATS) {
                await db.updateUserStats(winner.twitchId, true, 1);

                // Mettre à jour les stats des perdants
                const allPlayers = Array.from(gameState.players.values())
                    .sort((a, b) => (b.points || 0) - (a.points || 0));

                let placement = 2;
                for (const player of allPlayers) {
                    if (player.twitchId !== winner.twitchId) {
                        await db.updateUserStats(player.twitchId, false, placement++);
                    }
                }
                console.log(`📊 Stats mises à jour après tiebreaker (${gameState.initialPlayerCount} joueurs)`);
            } else {
                console.log(`⚠️ Stats NON comptabilisées après tiebreaker (${gameState.initialPlayerCount} < ${MIN_PLAYERS_FOR_STATS} joueurs)`);
            }

            const winnerUser = await db.getUserByTwitchId(winner.twitchId);

            const winnerData = {
                username: winner.username,
                points: winner.points || 0,
                totalVictories: winnerUser ? winnerUser.total_victories : 1
            };

            // Créer le podium Top 3
            const allPlayersSorted = Array.from(gameState.players.values())
                .sort((a, b) => (b.points || 0) - (a.points || 0));
            const podium = allPlayersSorted.slice(0, 3).map((player, index) => ({
                rank: index + 1,
                username: player.username,
                points: player.points || 0
            }));

            const { playersData, topPlayers } = await generateGameEndedData();
            
            // 🔥 Sauvegarder les données de la dernière question AVANT le reset
            const lastQuestionPlayers = getLastQuestionPlayersData();

            winnerScreenData = {
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


            io.emit('game-ended', {
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
            resetGameState();

            console.log('✅ Partie terminée après tiebreaker');
        } catch (error) {
            console.error('❌ Erreur fin de partie après tiebreaker:', error);
        }
    } else {
        // ⚔️ ENCORE ÉGALITÉ
        console.log(`⚖️ Toujours ${stillTied.length} joueurs à égalité avec ${maxPoints} points`);

        gameState.tiebreakerPlayers = stillTied.map(p => p.twitchId);

        io.emit('tiebreaker-continues', {
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
async function sendRivalryTiebreakerQuestion() {
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
            shouldApplySerieCooldown() ? gameState.recentSeries : [],
            gameState.noSpoil,  // 🚫 Filtre anti-spoil
                    gameState.streamerId
        );

        if (questions.length === 0) {
            console.error('❌ Aucune question disponible pour tiebreaker rivalry');
            // Fallback: terminer avec égalité
            await endRivalryWithTie();
            return;
        }

        const question = questions[0];
        addToRecentSeries(question.serie);
        if (gameState.streamerId) await db.addUsedQuestion(question.id, question.difficulty, gameState.streamerId);
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
            difficulty: `DÉPARTAGE - ${difficulty.toUpperCase()}`,
            timeLimit: gameState.questionTime,
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

        addLog('question', {
            questionNumber: gameState.currentQuestionIndex,
            difficulty: `DÉPARTAGE - ${difficulty.toUpperCase()}`,
            series: question.serie
        });

        // Envoyer la question à TOUS les joueurs
        io.emit('new-question', questionData);

        // 🆕 Annuler l'ancien timeout de révélation si existant
        if (gameState.rivalryRevealTimeout) {
            clearTimeout(gameState.rivalryRevealTimeout);
        }

        // Attendre la fin du timer PUIS révéler et vérifier
        gameState.rivalryRevealTimeout = setTimeout(() => {
            if (gameState.inProgress && gameState.isRivalryTiebreaker) {
                revealRivalryTiebreakerAnswers(newCorrectIndex);
            }
        }, gameState.questionTime * 1000);

    } catch (error) {
        console.error('❌ Erreur question tiebreaker rivalry:', error);
    }
}

// 🆕 RIVALRY TIEBREAKER: Révéler les réponses et calculer les scores
async function revealRivalryTiebreakerAnswers(correctAnswer) {
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
    updateTeamScores();

    // Envoyer les résultats
    io.emit('question-results', {
        correctAnswer,
        players: results.players,
        stats: results.stats,
        teamScores: gameState.teamScores,
        isRivalryTiebreaker: true
    });

    console.log(`⚔️ Scores après tiebreaker: Team A = ${gameState.teamScores[1]}, Team B = ${gameState.teamScores[2]}`);

    // Vérifier si on a un gagnant
    await checkRivalryTiebreakerWinner();
}

// 🆕 RIVALRY TIEBREAKER: Vérifier si une équipe a pris l'avantage
async function checkRivalryTiebreakerWinner() {
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

        addLog('game-end', { winner: teamData.teamName, mode: 'rivalry-points-tiebreaker' });

        // 🔥 Préparer les données AVANT les appels DB
        const playersData = Array.from(gameState.players.values()).map(p => ({
            twitchId: p.twitchId,
            username: p.username,
            lives: p.lives,
            points: p.points || 0,
            correctAnswers: p.correctAnswers,
            team: p.team,
            isLastGlobalWinner: false
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
            topPlayers = await db.getTopPlayers(10);
        } catch (dbError) {
            console.error('⚠️ Erreur récup topPlayers:', dbError.message);
        }
        
        // 🔥 Sauvegarder les données de la dernière question AVANT le reset
        const lastQuestionPlayers = getLastQuestionPlayersData();

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

        winnerScreenData = {
            ...gameEndedPayload,
            livesIcon: gameState.livesIcon
        };

        io.emit('game-ended', gameEndedPayload);
        console.log('📡 game-ended émis pour rivalry-points-tiebreaker');

        // 🔥 Appels DB APRÈS l'émission (stats équipe uniquement)
        try {
            if (savedInitialPlayerCount >= MIN_PLAYERS_FOR_TEAM_STATS) {
                for (const p of playersData) {
                    const isWinner = p.team === (team1Score > team2Score ? 1 : 2);
                    await db.updateTeamStats(p.twitchId, isWinner);
                }
                console.log(`📊 Stats équipe mises à jour après tiebreaker (${savedInitialPlayerCount} joueurs)`);
            } else {
                console.log(`⚠️ Stats équipe NON comptabilisées après tiebreaker (${savedInitialPlayerCount} < ${MIN_PLAYERS_FOR_TEAM_STATS} joueurs)`);
            }
        } catch (dbError) {
            console.error('⚠️ Erreur DB post-émission tiebreaker (non bloquante):', dbError.message);
        }

        resetGameState();

    } else {
        // ⚖️ ENCORE ÉGALITÉ
        console.log(`⚖️ Toujours égalité: ${team1Score} - ${team2Score}`);

        io.emit('tiebreaker-continues', {
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
                    await sendRivalryTiebreakerQuestion();
                }
            }, 3000);
        } else {
            console.log('⚠️ En attente que l\'admin lance la prochaine question de départage...');
        }
    }
}

// 🆕 RIVALRY: Terminer avec égalité (fallback si plus de questions)
async function endRivalryWithTie() {
    const duration = Math.floor((Date.now() - gameState.gameStartTime) / 1000);
    
    const teamData = {
        team: null,
        teamName: 'Égalité',
        points: gameState.teamScores[1],
        isDraw: true
    };

    addLog('game-end', { winner: 'Égalité', mode: 'rivalry-points' });
    console.log(`🏆 Mode Rivalité terminé en ÉGALITÉ: ${gameState.teamScores[1]} - ${gameState.teamScores[2]}`);

    const playersData = Array.from(gameState.players.values()).map(p => ({
        twitchId: p.twitchId,
        username: p.username,
        lives: p.lives,
        points: p.points || 0,
        correctAnswers: p.correctAnswers,
        team: p.team,
        isLastGlobalWinner: false
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
        topPlayers = await db.getTopPlayers(10);
    } catch (dbError) {
        console.error('⚠️ Erreur récup topPlayers:', dbError.message);
    }

    // 🔥 Sauvegarder les données de la dernière question AVANT le reset
    const lastQuestionPlayers = getLastQuestionPlayersData();

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

    winnerScreenData = {
        ...gameEndedPayload,
        livesIcon: gameState.livesIcon
    };

    io.emit('game-ended', gameEndedPayload);
    console.log('📡 game-ended émis pour rivalry-points (égalité)');

    resetGameState();
}


// FONCTION: Terminer avec égalité (fallback si plus de questions)
async function endGameWithTie() {
    const duration = Math.floor((Date.now() - gameState.gameStartTime) / 1000);

    const sortedPlayers = Array.from(gameState.players.values())
        .sort((a, b) => (b.points || 0) - (a.points || 0));

    const maxPoints = sortedPlayers[0]?.points || 0;
    const winners = sortedPlayers.filter(p => p.points === maxPoints);

    await db.endGame(
        gameState.currentGameId,
        null,
        gameState.currentQuestionIndex,
        duration
    );

    // 🆕 Stats comptabilisées uniquement si 15+ joueurs
    if (gameState.initialPlayerCount >= MIN_PLAYERS_FOR_STATS) {
        for (const winner of winners) {
            await db.updateUserStats(winner.twitchId, true, 1);
        }

        let placement = winners.length + 1;
        for (const player of sortedPlayers.slice(winners.length)) {
            await db.updateUserStats(player.twitchId, false, placement++);
        }
        console.log(`📊 Stats mises à jour (égalité, ${gameState.initialPlayerCount} joueurs)`);
    } else {
        console.log(`⚠️ Stats NON comptabilisées (égalité, ${gameState.initialPlayerCount} < ${MIN_PLAYERS_FOR_STATS} joueurs)`);
    }

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
        points: player.points || 0
    }));

    const { playersData, topPlayers } = await generateGameEndedData();
    
    // 🔥 Sauvegarder les données de la dernière question AVANT le reset
    const lastQuestionPlayers = getLastQuestionPlayersData();

    winnerScreenData = {
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


    io.emit('game-ended', {
        winner: winnerData,
        podium: podium,
        duration,
        totalQuestions: gameState.currentQuestionIndex,
        gameMode: 'points',
        playersData,
        topPlayers,
        lastQuestionPlayers
    });

    resetGameState();
}

// 🔥 Helper: Extraire les données de la dernière question pour l'écran winner (hover)
function getLastQuestionPlayersData() {
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
async function endGame(winner) {
    const duration = Math.floor((Date.now() - gameState.gameStartTime) / 1000);

    try {
        let winnerData = null;

        if (winner) {
            lastGlobalWinner = winner.twitchId;
            await db.endGame(
                gameState.currentGameId,
                winner.twitchId,
                gameState.currentQuestionIndex,
                duration
            );
            
            // 🆕 Stats comptabilisées uniquement si 15+ joueurs
            if (gameState.initialPlayerCount >= MIN_PLAYERS_FOR_STATS) {
                await db.updateUserStats(winner.twitchId, true, 1);
                
                // Mettre à jour les stats des autres joueurs
                const losers = Array.from(gameState.players.values()).filter(p => p !== winner);
                let placement = 2;
                for (const loser of losers) {
                    await db.updateUserStats(loser.twitchId, false, placement++);
                }
                console.log(`📊 Stats mises à jour (mode vies, ${gameState.initialPlayerCount} joueurs)`);
            } else {
                console.log(`⚠️ Stats NON comptabilisées (mode vies, ${gameState.initialPlayerCount} < ${MIN_PLAYERS_FOR_STATS} joueurs)`);
            }

            addLog('game-end', { winner: winner.username });

            const winnerUser = await db.getUserByTwitchId(winner.twitchId);

            winnerData = {
                username: winner.username,
                correctAnswers: winner.correctAnswers,
                livesRemaining: winner.lives,
                totalVictories: winnerUser ? winnerUser.total_victories : 1
            };
        } else {
            // 🆕 Cas aucun gagnant - terminer la partie en DB quand même
            console.log('💀 Fin de partie sans gagnant');
            if (gameState.currentGameId) {
                await db.endGame(
                    gameState.currentGameId,
                    null, // Pas de winner
                    gameState.currentQuestionIndex,
                    duration
                );
            }
            addLog('game-end', { winner: 'Aucun' });
        }

        const playersData = Array.from(gameState.players.values()).map(p => ({
            twitchId: p.twitchId,
            username: p.username,
            lives: p.lives,
            correctAnswers: p.correctAnswers,
            isLastGlobalWinner: p.twitchId === lastGlobalWinner
        }));

        const topPlayers = await db.getTopPlayers(10);


        // 🔥 Sauvegarder les données de la dernière question AVANT le reset
        const lastQuestionPlayers = getLastQuestionPlayersData();

        // 🔥 Stocker pour restauration
        winnerScreenData = {
            winner: winnerData,
            duration,
            totalQuestions: gameState.currentQuestionIndex,
            gameMode: 'lives',
            playersData: playersData,
            topPlayers,
            livesIcon: gameState.livesIcon,
            lastQuestionPlayers
        };


        // 🆕 N'envoyer game-ended que s'il y a un gagnant
        if (winner) {
            io.emit('game-ended', {
                winner: winnerData,
                duration,
                totalQuestions: gameState.currentQuestionIndex,
                gameMode: 'lives',
                playersData: playersData,
                topPlayers,
                lastQuestionPlayers
            });
        }

        // Reset
        resetGameState();

        // 🆕 Si aucun gagnant, fermer le lobby automatiquement
        if (!winner) {
            console.log('🔒 Fermeture automatique du lobby (aucun gagnant)');
            gameState.isActive = false;
            io.emit('game-deactivated');
        }

    } catch (error) {
        console.error('❌ Erreur fin de partie:', error);
        // 🆕 Reset même en cas d'erreur pour débloquer
        resetGameState();
    }
}

// 🆕 Fin de partie mode Rivalité (vie)
async function endGameRivalry(winningTeam) {
    const duration = Math.floor((Date.now() - gameState.gameStartTime) / 1000);
    
    try {
        updateTeamScores();
        
        const teamData = {
            team: winningTeam === 'draw' ? null : winningTeam,
            teamName: winningTeam === 'draw' ? 'Égalité' : gameState.teamNames[winningTeam],
            livesRemaining: winningTeam === 'draw' ? 0 : gameState.teamScores[winningTeam],
            isDraw: winningTeam === 'draw'
        };
        
        // Log
        addLog('game-end', { winner: teamData.teamName, mode: 'rivalry' });
        console.log(`🏆 Mode Rivalité terminé - ${teamData.teamName} gagne avec ${teamData.livesRemaining} vies`);
        
        // 🔥 Préparer les données AVANT les appels DB
        const playersData = Array.from(gameState.players.values()).map(p => ({
            twitchId: p.twitchId,
            username: p.username,
            lives: p.lives,
            points: p.points || 0,
            correctAnswers: p.correctAnswers,
            team: p.team,
            isLastGlobalWinner: false
        }));
        
        // 🔥 Sauvegarder avant reset (copie)
        const savedTeamScores = { ...gameState.teamScores };
        const savedTeamNames = { ...gameState.teamNames };
        const savedInitialPlayerCount = gameState.initialPlayerCount;
        
        // 🔥 FIX: Récupérer topPlayers AVANT l'émission (comme en mode classique)
        let topPlayers = [];
        try {
            topPlayers = await db.getTopPlayers(10);
        } catch (dbError) {
            console.error('⚠️ Erreur récup topPlayers:', dbError.message);
        }
        
        // 🔥 Sauvegarder les données de la dernière question AVANT le reset
        const lastQuestionPlayers = getLastQuestionPlayersData();
        
        const gameEndedPayload = {
            winner: teamData,
            teamScores: savedTeamScores,
            teamNames: savedTeamNames,
            duration,
            totalQuestions: gameState.currentQuestionIndex,
            gameMode: 'rivalry-lives',
            playersData: playersData,
            topPlayers,
            lastQuestionPlayers
        };
        
        winnerScreenData = {
            ...gameEndedPayload,
            livesIcon: gameState.livesIcon
        };
        
        io.emit('game-ended', gameEndedPayload);
        console.log('📡 game-ended émis pour rivalry-lives');
        
        // Appels DB post-émission (stats équipe)
        try {
            if (savedInitialPlayerCount >= MIN_PLAYERS_FOR_TEAM_STATS && winningTeam !== 'draw') {
                for (const p of playersData) {
                    const isWinner = p.team === winningTeam;
                    await db.updateTeamStats(p.twitchId, isWinner);
                }
                console.log(`📊 Stats équipe mises à jour (${savedInitialPlayerCount} joueurs)`);
            } else {
                console.log(`⚠️ Stats équipe NON comptabilisées (${savedInitialPlayerCount} < ${MIN_PLAYERS_FOR_TEAM_STATS} joueurs ou égalité)`);
            }
        } catch (dbError) {
            console.error('⚠️ Erreur DB post-émission (non bloquante):', dbError.message);
        }
        
        resetGameState();
        
    } catch (error) {
        console.error('❌ Erreur fin de partie Rivalité:', error);
        resetGameState();
    }
}

// 🆕 Fin de partie mode Rivalité (points)
async function endGameRivalryPoints() {
    const duration = Math.floor((Date.now() - gameState.gameStartTime) / 1000);
    
    try {
        updateTeamScores();
        
        const team1Points = gameState.teamScores[1];
        const team2Points = gameState.teamScores[2];
        
        // 🆕 TIEBREAKER: Si égalité, lancer une question de départage
        if (team1Points === team2Points) {
            console.log(`⚖️ ÉGALITÉ RIVALRY: ${team1Points} - ${team2Points} → Question de départage !`);
            
            gameState.isRivalryTiebreaker = true;
            
            addLog('tiebreaker', { mode: 'rivalry', score: team1Points, playerCount: gameState.players.size });
            
            io.emit('tiebreaker-announced', {
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
                        await sendRivalryTiebreakerQuestion();
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
        addLog('game-end', { winner: teamData.teamName, mode: 'rivalry-points' });
        console.log(`🏆 Mode Rivalité (points) terminé - ${teamData.teamName} gagne avec ${teamData.points} points`);
        
        // 🔥 Préparer les données AVANT les appels DB (pas de dépendance DB)
        const playersData = Array.from(gameState.players.values()).map(p => ({
            twitchId: p.twitchId,
            username: p.username,
            lives: p.lives,
            points: p.points || 0,
            correctAnswers: p.correctAnswers,
            team: p.team,
            isLastGlobalWinner: false
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
            topPlayers = await db.getTopPlayers(10);
        } catch (dbError) {
            console.error('⚠️ Erreur récup topPlayers:', dbError.message);
        }
        
        // 🔥 Sauvegarder les données de la dernière question AVANT le reset
        const lastQuestionPlayers = getLastQuestionPlayersData();
        
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
            lastQuestionPlayers
        };
        
        winnerScreenData = {
            ...gameEndedPayload,
            livesIcon: gameState.livesIcon
        };
        
        io.emit('game-ended', gameEndedPayload);
        console.log('📡 game-ended émis pour rivalry-points');
        
        // Appels DB post-émission (stats équipe)
        try {
            if (savedInitialPlayerCount >= MIN_PLAYERS_FOR_TEAM_STATS) {
                for (const p of playersData) {
                    const isWinner = p.team === winningTeam;
                    await db.updateTeamStats(p.twitchId, isWinner);
                }
                console.log(`📊 Stats équipe mises à jour (${savedInitialPlayerCount} joueurs)`);
            } else {
                console.log(`⚠️ Stats équipe NON comptabilisées (${savedInitialPlayerCount} < ${MIN_PLAYERS_FOR_TEAM_STATS} joueurs)`);
            }
        } catch (dbError) {
            console.error('⚠️ Erreur DB post-émission (non bloquante):', dbError.message);
        }
        
        resetGameState();
        
    } catch (error) {
        console.error('❌ Erreur fin de partie Rivalité (points):', error);
        resetGameState();
    }
}

// Stats admin
app.get('/admin/stats', async (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    try {
        const totalGames = await db.getTotalGames();
        const topPlayers = await db.getTopPlayers(50);  // ← 50 joueurs max
        const recentGames = await db.getRecentGames(7);

        res.json({
            totalGames,
            topPlayers,
            recentGames,
            currentPlayers: gameState.players.size,
            activePlayers: gameState.inProgress ? getAlivePlayers().length : 0,
            gameActive: gameState.isActive,
            gameInProgress: gameState.inProgress
        });
    } catch (error) {
        console.error('❌ Erreur stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// Route pour les stats de la base de données
app.get('/admin/db-stats', async (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    try {
        const allQuestions = await db.getAllQuestions();
        const totalPlayers = await db.getTotalPlayers();  // ← AJOUTER

        // Compter les questions par difficulté
        const byDifficulty = {
            veryeasy: 0,
            easy: 0,
            medium: 0,
            hard: 0,
            veryhard: 0
        };

        const seriesSet = new Set();

        allQuestions.forEach(q => {
            if (byDifficulty.hasOwnProperty(q.difficulty)) {
                byDifficulty[q.difficulty]++;
            }
            if (q.serie) {
                seriesSet.add(q.serie);
            }
        });

        res.json({
            totalQuestions: allQuestions.length,
            totalSeries: seriesSet.size,
            totalPlayers: totalPlayers,  // ← AJOUTER
            byDifficulty: byDifficulty
        });
    } catch (error) {
        console.error('❌ Erreur db-stats:', error);
        res.status(500).json({ error: error.message });
    }
});


// Route pour mettre à jour les paramètres du jeu
app.post('/admin/update-settings', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    const { lives, timePerQuestion } = req.body;

    if (!lives || !timePerQuestion) {
        return res.status(400).json({ error: 'Paramètres invalides' });
    }

    // Mettre à jour les paramètres du jeu
    gameSettings.lives = parseInt(lives);
    gameSettings.timePerQuestion = parseInt(timePerQuestion);

    // Émettre vers tous les clients connectés
    io.emit('settings-updated', {
        lives: gameSettings.lives,
        timePerQuestion: gameSettings.timePerQuestion
    });

    console.log(`✅ Paramètres mis à jour: ${lives} vies, ${timePerQuestion}s`);
    res.json({ success: true, lives: gameSettings.lives, timePerQuestion: gameSettings.timePerQuestion });
});


// ============================================
// ROUTES PROFIL & BADGES
// ============================================

// Récupérer le profil complet d'un joueur
app.get('/profile/:twitchId', async (req, res) => {
    try {
        const { twitchId } = req.params;

        const user = await db.getUserByTwitchId(twitchId);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        const badges = await db.getUserBadges(twitchId);
        const unlockedTitles = await db.getUserUnlockedTitles(twitchId);
        const currentTitle = user.current_title_id
            ? await db.getTitleById(user.current_title_id)
            : await db.getTitleById(1); // Novice par défaut

        res.json({
            user: {
                twitch_id: user.twitch_id,
                username: user.username,
                avatar_url: user.avatar_url || '/img/avatars/novice.png', // 🔥 NOUVEAU
                total_games_played: user.total_games_played,
                total_victories: user.total_victories,
                last_placement: user.last_placement || null,
                isLastGlobalWinner: user.twitch_id === lastGlobalWinner,
                win_rate: user.total_games_played > 0
                    ? ((user.total_victories / user.total_games_played) * 100).toFixed(1)
                    : '0.0'
            },
            badges: {
                games_played: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(tier => ({
                    tier,
                    unlocked: badges.some(b => b.badge_type === 'games_played' && b.badge_tier === tier)
                })),
                games_won: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(tier => ({
                    tier,
                    unlocked: badges.some(b => b.badge_type === 'games_won' && b.badge_tier === tier)
                }))
            },
            titles: {
                current: currentTitle,
                unlocked: unlockedTitles
            }
        });
    } catch (error) {
        console.error('❌ Erreur profil:', error);
        res.status(500).json({ error: error.message });
    }
});


app.post('/profile/update-avatar', async (req, res) => {
    try {
        const { twitchId, avatarUrl } = req.body;

        if (!twitchId || !avatarUrl) {
            return res.status(400).json({ error: 'Paramètres manquants' });
        }

        const allowedAvatars = [
            'novice.png',
            'ninja.png',
            'knight.png',
            'knight2.png',
            'girl.png',
            'assassin.png',
            'sorcier.png',
            'totoro.png',
            'melody.png'
        ];

        if (!allowedAvatars.includes(avatarUrl)) {
            return res.status(400).json({ error: 'Avatar non autorisé' });
        }

        const updatedUser = await db.updateUserAvatar(twitchId, avatarUrl);

        res.json({
            success: true,
            user: updatedUser
        });
    } catch (error) {
        console.error('❌ Erreur update avatar:', error);
        res.status(400).json({ error: error.message });
    }
});





// Changer le titre actuel
app.post('/profile/update-title', async (req, res) => {
    try {
        const { twitchId, titleId } = req.body;

        if (!twitchId || !titleId) {
            return res.status(400).json({ error: 'Paramètres manquants' });
        }

        const updatedUser = await db.updateUserTitle(twitchId, titleId);
        const newTitle = await db.getTitleById(titleId);

        res.json({
            success: true,
            user: updatedUser,
            title: newTitle
        });
    } catch (error) {
        console.error('❌ Erreur update titre:', error);
        res.status(400).json({ error: error.message });
    }
});


// Route pour signaler une question
app.post('/admin/report-question', async (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    try {
        const { questionId, questionText, difficulty, reason } = req.body;

        if (!questionText || !reason) {
            return res.status(400).json({ error: 'Données manquantes' });
        }

        // Enregistrer le signalement dans Supabase
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

// Récupérer tous les titres disponibles
app.get('/titles', async (req, res) => {
    try {
        const titles = await db.getAllTitles();
        res.json(titles);
    } catch (error) {
        console.error('❌ Erreur titres:', error);
        res.status(500).json({ error: error.message });
    }
});

// Récupérer le leaderboard
app.get('/leaderboard', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const leaderboard = await db.getLeaderboard(limit);
        res.json(leaderboard);
    } catch (error) {
        console.error('❌ Erreur leaderboard:', error);
        res.status(500).json({ error: error.message });
    }
});


// Récupérer les parties récentes
app.get('/api/recent-games', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const games = await db.getRecentGames(limit);
        res.json({ success: true, games });
    } catch (error) {
        console.error('❌ Erreur recent-games:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});


app.get('/question', (req, res) => {
    res.sendFile(__dirname + '/src/html/question.html');
});

// API ajout question - avec code spécifique
app.post('/api/add-question', async (req, res) => {
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

// 🆕 Récupérer les IDs des questions utilisées
app.get('/api/used-questions', async (req, res) => {
    const { adminCode } = req.query;

    if (adminCode !== process.env.QUESTION_ADMIN_CODE && adminCode !== process.env.MASTER_ADMIN_CODE) {
        return res.status(401).json({ error: 'Code invalide' });
    }

    try {
        const usedIds = await db.getUsedQuestionIds();
        res.json({ success: true, usedIds });
    } catch (error) {
        console.error('Erreur récupération questions utilisées:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// 🆕 Marquer une question comme utilisée (exclure)
app.post('/api/mark-question-used', async (req, res) => {
    const { adminCode, questionId } = req.body;

    if (adminCode !== process.env.QUESTION_ADMIN_CODE && adminCode !== process.env.MASTER_ADMIN_CODE) {
        return res.status(401).json({ error: 'Code invalide' });
    }

    try {
        // Récupérer la difficulté de la question
        const { data: questionData } = await supabase
            .from('questions')
            .select('difficulty')
            .eq('id', questionId)
            .single();
        
        if (gameState.streamerId) await db.addUsedQuestion(questionId, questionData?.difficulty || null, gameState.streamerId);
        gameState.usedQuestionIds.push(questionId);
        console.log(`🚫 Question ${questionId} (${questionData?.difficulty || '?'}) marquée comme utilisée (exclue)`);
        res.json({ success: true, message: 'Question exclue' });
    } catch (error) {
        console.error('Erreur marquage question:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// 🆕 Retirer une question de l'historique (réactiver)
app.post('/api/unmark-question-used', async (req, res) => {
    const { adminCode, questionId } = req.body;

    if (adminCode !== process.env.QUESTION_ADMIN_CODE && adminCode !== process.env.MASTER_ADMIN_CODE) {
        return res.status(401).json({ error: 'Code invalide' });
    }

    try {
        const { error } = await supabase
            .from('used_questions')
            .delete()
            .eq('question_id', questionId);

        if (error) throw error;

        // Retirer du gameState aussi
        gameState.usedQuestionIds = gameState.usedQuestionIds.filter(id => id !== questionId);
        console.log(`✅ Question ${questionId} réactivée (retirée de l'historique)`);
        res.json({ success: true, message: 'Question réactivée' });
    } catch (error) {
        console.error('Erreur réactivation question:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// 🆕 Reset toutes les questions utilisées (via page question.html)
app.post('/api/reset-used-questions', async (req, res) => {
    const { adminCode } = req.body;

    if (adminCode !== process.env.QUESTION_ADMIN_CODE && adminCode !== process.env.MASTER_ADMIN_CODE) {
        return res.status(401).json({ error: 'Code invalide' });
    }

    try {
        const streamerId = req.session.twitchId || gameState.streamerId;
        if (!streamerId) {
            return res.json({ success: true, message: 'Pas de streamer connecté — rien à réinitialiser' });
        }
        await db.resetUsedQuestions(null, streamerId);
        gameState.usedQuestionIds = [];
        console.log(`🔄 Historique des questions réinitialisé (via page questions) [streamer: ${streamerId}]`);
        res.json({ success: true, message: 'Historique réinitialisé' });
    } catch (error) {
        console.error('Erreur reset questions:', error);
        res.status(500).json({ error: 'Erreur serveur' });
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


// POST /admin/set-lives-icon
app.post('/admin/set-lives-icon', (req, res) => {
    if (!req.session.isAdmin) {
        return res.status(403).json({ error: 'Non autorisé' });
    }

    const { icon } = req.body;
    const validIcons = ['heart', 'dragonball', 'flame', 'sharingan', 'katana', 'shuriken', 'konoha', 'alchemy', 'curse', 'kunai', 'star4'];

    if (!validIcons.includes(icon)) {
        return res.status(400).json({ error: 'Invalid icon' });
    }

    gameState.livesIcon = icon;

    // Broadcast aux clients
    io.emit('lobby-update', {
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
    ║     🎮 WEEBMASTER SERVER 🎮          ║
    ╠═══════════════════════════════════════╣
    ║  Port: ${PORT}                        ║
    ║  Status: ✅ Online                    ║
    ║  Mode: ${process.env.NODE_ENV}                  ║
    ║  Twitch Redirect: ${TWITCH_REDIRECT_URI}
    ╚═══════════════════════════════════════╝
    `);

    loadLastGlobalWinner();
});


// ============================================
// STREAMERS PARTENAIRES - LIVE STATUS
// ============================================
const PARTNER_STREAMERS = ['MinoStreaming', 'pikinemadd', 'Mikyatc' , 'Zogaa_', 'luidjy_skyblex'];
let partnersLiveStatus = {}; // Cache du statut



async function checkPartnersLive() {
    try {
        // Token Twitch (App Access Token)
        const tokenRes = await axios.post('https://id.twitch.tv/oauth2/token', null, {
            params: {
                client_id: process.env.TWITCH_CLIENT_ID,
                client_secret: process.env.TWITCH_CLIENT_SECRET,
                grant_type: 'client_credentials'
            }
        });
        const accessToken = tokenRes.data.access_token;

        // Vérifier les streams
        const userLogins = PARTNER_STREAMERS.join('&user_login=');
        const streamsRes = await axios.get(
            `https://api.twitch.tv/helix/streams?user_login=${userLogins}`,
            {
                headers: {
                    'Client-ID': process.env.TWITCH_CLIENT_ID,
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        const liveStreams = streamsRes.data.data || [];

        PARTNER_STREAMERS.forEach(streamer => {
            partnersLiveStatus[streamer] = liveStreams.some(
                stream => stream.user_login.toLowerCase() === streamer.toLowerCase()
            );
        });

        // Émettre à tous les clients
        io.emit('partners-live-status', partnersLiveStatus);
        console.log('📡 Statut live partenaires:', partnersLiveStatus);

    } catch (err) {
        console.error('❌ Erreur check live partenaires:', err.message);
    }
}

// Vérifier au démarrage puis toutes les 2 minutes
checkPartnersLive();
setInterval(checkPartnersLive, 120000);

// ============================================
// 💣 BOMBANIME - Fonctions de jeu
// ============================================

// Valider un nom de personnage
function validateBombanimeCharacter(name, serie) {
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
function checkAlphabetComplete(twitchId) {
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
function initBombanimePlayerChallenges(twitchId) {
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
function checkBombanimeChallenges(twitchId, characterName) {
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
function getBombanimePlayerChallengesState(twitchId) {
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
function getBombanimePlayerBonuses(twitchId) {
    return gameState.bombanime.playerBonuses.get(twitchId) || { freeCharacter: 0, extraLife: 0 };
}

// Obtenir un personnage aléatoire non utilisé pour le bonus perso gratuit
function getRandomUnusedCharacter(serie) {
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
function getAliveBombanimePlayers() {
    return Array.from(gameState.players.values()).filter(p => p.lives > 0);
}

// Passer au joueur suivant dans le cercle
function getNextBombanimePlayer() {
    const alivePlayers = getAliveBombanimePlayers();
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
function startBombanimeTurn(twitchId) {
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
        
        const alivePlayers = getAliveBombanimePlayers();
        if (alivePlayers.length <= 1) {
            // Fin de partie ou aucun joueur
            if (alivePlayers.length === 1) {
                endBombanimeGame(alivePlayers[0]);
            } else {
                endBombanimeGame(null);
            }
            return;
        }
        
        // Essayer de trouver le prochain joueur vivant
        const nextTwitchId = getNextBombanimePlayer();
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
    io.emit('bombanime-turn-start', {
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
        bombExplode(twitchId);
    }, gameState.bombanime.timer * 1000);
}

// La bombe explose sur un joueur
function bombExplode(twitchId) {
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
            rank: getAliveBombanimePlayers().length + 1
        });
        console.log(`☠️ ${player.username} ÉLIMINÉ!`);
    }
    
    // Envoyer l'événement d'explosion
    io.emit('bombanime-explosion', {
        playerTwitchId: twitchId,
        playerUsername: player.username,
        livesRemaining: player.lives,
        isEliminated: isEliminated,
        playersData: getBombanimePlayersData(),
        // Debug
        debugElapsedMs: elapsedMs,
        debugTurnId: gameState.bombanime.turnId
    });
    
    // Vérifier si la partie est terminée
    const alivePlayers = getAliveBombanimePlayers();
    if (alivePlayers.length <= 1) {
        endBombanimeGame(alivePlayers[0] || null);
        return;
    }
    
    // Pause puis passer au joueur suivant
    gameState.bombanime.isPaused = true;
    setTimeout(() => {
        const nextPlayerTwitchId = getNextBombanimePlayer();
        if (nextPlayerTwitchId) {
            startBombanimeTurn(nextPlayerTwitchId);
        } else {
            // 🔥 FIX: Safety net - si getNextBombanimePlayer retourne null mais il reste des joueurs
            const remainingPlayers = getAliveBombanimePlayers();
            if (remainingPlayers.length > 1) {
                // Prendre un joueur vivant différent du joueur qui vient d'exploser
                const fallback = remainingPlayers.find(p => p.twitchId !== twitchId) || remainingPlayers[0];
                console.log(`⚠️ getNextBombanimePlayer null mais ${remainingPlayers.length} joueurs vivants - fallback sur ${fallback.username}`);
                startBombanimeTurn(fallback.twitchId);
            } else if (remainingPlayers.length === 1) {
                endBombanimeGame(remainingPlayers[0]);
            } else {
                endBombanimeGame(null);
            }
        }
    }, 100); // Passage de tour pendant le shake
}

// Soumettre un nom BombAnime
function submitBombanimeName(socketId, name) {
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
    const validation = validateBombanimeCharacter(name, gameState.bombanime.serie);
    
    if (!validation.valid) {
        console.log(`❌ Nom invalide: "${name}" - ${validation.reason}`);
        
        io.emit('bombanime-name-rejected', {
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
        if (checkAlphabetComplete(player.twitchId)) {
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
            
            io.emit('bombanime-alphabet-complete', {
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
    const nextPlayerTwitchId = getNextBombanimePlayer();
    
    // Changer le joueur actuel
    if (nextPlayerTwitchId) {
        gameState.bombanime.currentPlayerTwitchId = nextPlayerTwitchId;
    }
    
    // Sauvegarder la dernière réponse du joueur
    gameState.bombanime.playerLastAnswers.set(player.twitchId, normalizedName);
    
    // 🎯 Vérifier les défis BombAnime
    const completedChallenges = checkBombanimeChallenges(player.twitchId, normalizedName);
    const playerChallengesState = getBombanimePlayerChallengesState(player.twitchId);
    const playerBonuses = getBombanimePlayerBonuses(player.twitchId);
    
    // Calculer le temps restant au moment de la validation (pour debug)
    const debugElapsedMs = Date.now() - gameState.bombanime.turnStartTime;
    const timeRemainingMs = (gameState.bombanime.timer * 1000) - debugElapsedMs;
    
    console.log(`⏱️ Réponse validée avec ${timeRemainingMs}ms restants (turnId=${gameState.bombanime.turnId})`);
    
    // 🖼️ Chercher l'image du personnage (DÉSACTIVÉ temporairement)
    // const characterImage = getCharacterImage(normalizedName, gameState.bombanime.serie);
    
    // Envoyer la confirmation avec le prochain joueur
    io.emit('bombanime-name-accepted', {
        playerTwitchId: player.twitchId,
        playerUsername: player.username,
        name: normalizedName,
        // characterImage: characterImage, // 🖼️ DÉSACTIVÉ temporairement
        newLetters: getAllLetters(normalizedName),
        alphabet: Array.from(gameState.bombanime.playerAlphabets.get(player.twitchId) || []),
        playersData: getBombanimePlayersData(),
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
            startBombanimeTurn(nextPlayerTwitchId);
        }
    }, 30); // 30ms - quasi-instantané
    
    return { success: true };
}

// Obtenir les données des joueurs BombAnime pour l'affichage
function getBombanimePlayersData() {
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
                avatarUrl: player.avatarUrl || '/img/avatars/novice.png'
            });
        }
    });
    
    return playersData;
}

// Démarrer une partie BombAnime
async function startBombanimeGame() {
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
    
    // Donner des lastAnswers par défaut aux fake players (utilise le fakeCharacterName stocké)
    players.forEach(player => {
        if (player.isFake && player.fakeCharacterName) {
            gameState.bombanime.playerLastAnswers.set(player.twitchId, player.fakeCharacterName);
        }
    });
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
        initBombanimePlayerChallenges(player.twitchId);
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
    io.emit('bombanime-game-started', {
        serie: gameState.bombanime.serie,
        timer: gameState.bombanime.timer,
        playersOrder: gameState.bombanime.playersOrder,
        playersData: getBombanimePlayersData(),
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
        
        const alivePlayers = getAliveBombanimePlayers();
        if (alivePlayers.length < BOMBANIME_CONFIG.MIN_PLAYERS) {
            console.log('⚠️ Plus assez de joueurs vivants pour démarrer le premier tour');
            endBombanimeGame(alivePlayers[0] || null);
            return;
        }
        
        let firstPlayer = gameState.bombanime.playersOrder[randomStartIndex];
        
        // 🔥 FIX: Vérifier que le joueur choisi existe encore, sinon prendre le premier vivant
        const firstPlayerExists = Array.from(gameState.players.values()).find(p => p.twitchId === firstPlayer && p.lives > 0);
        if (!firstPlayerExists) {
            console.log(`⚠️ Premier joueur ${firstPlayer} introuvable/mort - fallback sur premier joueur vivant`);
            firstPlayer = alivePlayers[0].twitchId;
        }
        
        startBombanimeTurn(firstPlayer);
    }, 3000); // 3s avant le premier tour
    
    return { success: true };
}

// Terminer une partie BombAnime
async function endBombanimeGame(winner) {
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
    winnerScreenData = {
        winner: winner ? {
            twitchId: winner.twitchId,
            username: winner.username,
            lives: winner.lives
        } : null,
        ranking: ranking,
        duration: duration,
        gameMode: 'bombanime',
        serie: gameState.bombanime.serie,
        namesUsed: gameState.bombanime.usedNames.size
    };
    
    io.emit('bombanime-game-ended', {
        winner: winner ? {
            twitchId: winner.twitchId,
            username: winner.username,
            lives: winner.lives
        } : null,
        ranking: ranking,
        duration: duration,
        serie: gameState.bombanime.serie,
        namesUsed: gameState.bombanime.usedNames.size
    });
    
    // Désactiver le lobby silencieusement après fin de partie bombanime
    // (pas d'émission game-deactivated pour ne pas interrompre le winner screen)
    gameState.isActive = false;
    console.log('🔒 Lobby désactivé automatiquement après fin BombAnime');
    
    // Reset
    resetBombanimeState();
    resetGameState();
}

// Reset l'état BombAnime
function resetBombanimeState() {
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

// ============================================
// 🎴 COLLECT - Fonctions du mode jeu de cartes anime
// ============================================

// Charger les cartes Collect depuis le fichier JSON
const COLLECT_CARDS_DATA = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'collect-cards.json'), 'utf8'));

// Deck de cartes Collect (construit depuis collect-cards.json)
const COLLECT_DECK = {
    // Les 13 animes
    animes: Object.keys(COLLECT_CARDS_DATA),

    // Les 3 classes (cycle: Assaut > Mirage > Oracle > Assaut)
    classes: ['assaut', 'oracle', 'mirage'],
    
    // Personnages par anime (chargés depuis collect-cards.json)
    characters: (() => {
        const chars = {};
        for (const [anime, data] of Object.entries(COLLECT_CARDS_DATA)) {
            chars[anime] = {
                assaut: data.assaut.map(c => c.name),
                oracle: data.oracle.map(c => c.name),
                mirage: data.mirage.map(c => c.name),
                protagonist: data.protagonist || []
            };
        }
        return chars;
    })()
};

// Les 3 personnages du BIG 3
const BIG3_NAMES = ['Luffy', 'Naruto', 'Ichigo'];

// 🎮 COLLECT GAMEPLAY CONSTANTS
const COLLECT_STATS = ['atk', 'int', 'spd', 'pwr'];
const COLLECT_STAT_NAMES = {
    atk: { name: 'Attaque', icon: '⚔️' },
    int: { name: 'Intelligence', icon: '🧠' },
    spd: { name: 'Vitesse', icon: '⚡' },
    pwr: { name: 'Pouvoir', icon: '🔥' }
};
const COLLECT_TIMER = 15; // 15 secondes pour choisir sa carte
// COLLECT_STARS_TO_WIN: dynamique selon handSize (3 cartes = 3⭐, 5 cartes = 5⭐)
// Utilisé via: gameState.collect.handSize || 3
const COLLECT_ROUNDS_PER_MANCHE = 3; // 3 rounds par manche

// 🔄 Cycle des classes : Assaut > Mirage > Oracle > Assaut
// Retourne: 1 si class1 bat class2, -1 si class1 perd, 0 si égalité
function getClassAdvantage(class1, class2) {
    if (class1 === class2) return 0;
    
    const cycle = {
        'assaut': 'mirage',  // Assaut bat Mirage
        'mirage': 'oracle',  // Mirage bat Oracle
        'oracle': 'assaut'   // Oracle bat Assaut
    };
    
    if (cycle[class1] === class2) return 1;  // class1 bat class2
    return -1; // class1 perd contre class2
}

// 🏆 Comparer deux cartes sur une stat donnée (avec avantage de classe en cas d'égalité)
function compareCards(card1, card2, stat) {
    const stat1 = card1.stats[stat];
    const stat2 = card2.stats[stat];
    
    if (stat1 > stat2) return 1;  // card1 gagne
    if (stat1 < stat2) return -1; // card2 gagne
    
    // Égalité → utiliser l'avantage de classe
    return getClassAdvantage(card1.class, card2.class);
}

// 🎲 Choisir une stat aléatoire pour le round
function getRandomStat() {
    return COLLECT_STATS[Math.floor(Math.random() * COLLECT_STATS.length)];
}

// Générer le deck de cartes avec les 4 stats (ATK, INT, SPD, PWR)
function generateCollectDeck(minCards = 39) {
    const deck = [];
    
    // Utiliser les animes sélectionnés par l'admin
    const selectedAnimes = gameState.collect.selectedAnimes || COLLECT_DECK.animes;
    const animesToUse = COLLECT_DECK.animes.filter(a => selectedAnimes.includes(a));
    console.log(`🎴 Deck: animes utilisés: ${animesToUse.length}/${COLLECT_DECK.animes.length}`);
    
    // Générer des rounds jusqu'à avoir assez de cartes
    // Chaque round pioche un personnage différent par classe par anime
    let round = 0;
    const usedChars = {}; // { 'OnePiece-assaut': ['Luffy', 'Zoro'] }
    
    while (deck.length < minCards) {
        let addedThisRound = 0;
        
        animesToUse.forEach(anime => {
            const characters = COLLECT_DECK.characters[anime];
            if (!characters) return;
            
            COLLECT_DECK.classes.forEach(cardClass => {
                const charArray = characters[cardClass];
                if (!charArray || charArray.length === 0) return;
                
                const key = `${anime}-${cardClass}`;
                if (!usedChars[key]) usedChars[key] = [];
                
                // Trouver un personnage pas encore utilisé
                const available = charArray.filter(c => !usedChars[key].includes(c));
                let charName;
                
                if (available.length > 0) {
                    charName = available[Math.floor(Math.random() * available.length)];
                } else {
                    // Tous utilisés → recycler avec un power level différent
                    charName = charArray[Math.floor(Math.random() * charArray.length)];
                }
                
                usedChars[key].push(charName);
                
                const isProtagonist = Array.isArray(characters.protagonist) 
                    ? characters.protagonist.includes(charName) 
                    : charName === characters.protagonist;
                
                // Charger les stats depuis collect-cards.json
                const cardData = COLLECT_CARDS_DATA[anime] && COLLECT_CARDS_DATA[anime][cardClass] 
                    ? COLLECT_CARDS_DATA[anime][cardClass].find(c => c.name === charName)
                    : null;
                const stats = cardData 
                    ? { atk: cardData.atk, int: cardData.int, spd: cardData.spd, pwr: cardData.pwr }
                    : { atk: 10, int: 10, spd: 10, pwr: 10 }; // Fallback
                
                deck.push({
                    id: `${anime}-${cardClass}-${charName}-r${round}`,
                    anime: anime,
                    name: charName,
                    class: cardClass,
                    stats: stats,
                    isProtagonist: isProtagonist,
                    isBig3: isProtagonist && BIG3_NAMES.includes(charName)
                });
                addedThisRound++;
            });
        });
        
        round++;
        // Sécurité anti-boucle infinie
        if (addedThisRound === 0 || round > 10) break;
    }
    
    // Mélanger le deck
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    console.log(`🎴 Deck: ${deck.length} cartes (${animesToUse.length} animes, ${round} round(s))`);
    return deck;
}

// 🎴 Distribuer 3 cartes avec garantie d'au moins 2 du même anime
function drawCardsFromDeck(deck, handSize = 3) {
    const drawn = [];
    for (let i = 0; i < handSize && deck.length > 0; i++) {
        const idx = Math.floor(Math.random() * deck.length);
        drawn.push(deck.splice(idx, 1)[0]);
    }
    console.log(`🎴 Distribution aléatoire: ${drawn.map(c => `${c.name}(${c.anime})`).join(', ')}`);
    return drawn;
}

function getCollectPlayersData() {
    const playersData = [];
    
    gameState.collect.playersOrder.forEach((twitchId, index) => {
        const playerData = gameState.collect.playersData.get(twitchId);
        if (!playerData) return;
        
        // Chercher le joueur connecté d'abord, fallback sur les infos sauvegardées
        const player = Array.from(gameState.players.values()).find(p => p.twitchId === twitchId);
        
        playersData.push({
            twitchId: twitchId,
            username: player ? player.username : (playerData.username || 'Joueur'),
            avatar: player ? player.avatar : (playerData.avatar || null),
            position: index,
            wins: playerData.wins || 0,
            cardCount: playerData.cards ? playerData.cards.length : 0
        });
    });
    
    return playersData;
}

// Broadcast card counts to all clients
function broadcastCollectCardCounts() {
    if (!gameState.collect.active) return;
    const counts = {};
    gameState.collect.playersOrder.forEach(twitchId => {
        const pd = gameState.collect.playersData.get(twitchId);
        counts[twitchId] = pd && pd.cards ? pd.cards.length : 0;
    });
    io.emit('collect-card-counts', counts);
}

// Démarrer une partie Collect
async function startCollectGame() {
    console.log('🎴 Démarrage partie Collect...');
    
    // Récupérer les joueurs dans l'ordre où ils ont rejoint
    const players = Array.from(gameState.players.values());
    
    if (players.length < 2) {
        return { success: false, error: 'Minimum 2 joueurs requis' };
    }
    
    if (players.length > 10) {
        return { success: false, error: 'Maximum 5 joueurs en mode Collect' };
    }
    
    // Initialiser l'état Collect
    gameState.collect.active = true;
    gameState.collect.playersOrder = players.map(p => p.twitchId);
    gameState.collect.playersData = new Map();
    
    // Générer le deck (assez de cartes pour tous les joueurs)
    const handSize = gameState.collect.handSize || 3;
    const cardsNeeded = players.length * handSize;
    gameState.collect.deck = generateCollectDeck(cardsNeeded);
    console.log(`🎴 Deck généré: ${gameState.collect.deck.length} cartes (besoin: ${cardsNeeded}, main: ${handSize})`);
    
    // Initialiser les données de chaque joueur et distribuer les cartes
    players.forEach((player) => {
        const cards = drawCardsFromDeck(gameState.collect.deck, handSize);
        console.log(`🔴 ${player.username} reçoit:`, cards.map(c => `${c.name}(${c.anime})`).join(', '));
        
        gameState.collect.playersData.set(player.twitchId, {
            cards: cards,
            username: player.username,
            avatar: player.avatar,
            wins: 0
        });
    });
    
    // Marquer la partie comme en cours
    gameState.inProgress = true;
    gameState.gameStartTime = Date.now();
    gameState.initialPlayerCount = players.length;
    
    // 🎴 Piocher 4 cartes pour le marché
    const marketCards = drawCardsFromDeck(gameState.collect.deck, 4);
    gameState.collect.marketCards = marketCards;
    console.log(`🏪 Marché:`, marketCards.map(c => `${c.name}(${c.anime})`).join(', '));
    
    console.log(`🎴 Partie Collect démarrée avec ${players.length} joueurs`);
    
    // Préparer le round 1 AVANT l'emit (pour l'inclure dans game-started)
    const stats = ['atk', 'int', 'spd', 'pwr'];
    const statNames = { atk: 'ATK', int: 'INT', spd: 'VIT', pwr: 'POW' };
    gameState.collect.currentRound = 1;
    const selectedStat = stats[Math.floor(Math.random() * stats.length)];
    gameState.collect.roundStat = selectedStat;
    
    console.log(`🎲 Round 1 préparé - Stat: ${statNames[selectedStat]}`);
    
    // 🎴 Tour par tour : 1er joueur aléatoire, puis sens horaire (ordre des sièges)
    const startIdx = Math.floor(Math.random() * gameState.collect.playersOrder.length);
    const clockwiseOrder = [];
    for (let i = 0; i < gameState.collect.playersOrder.length; i++) {
        clockwiseOrder.push(gameState.collect.playersOrder[(startIdx + i) % gameState.collect.playersOrder.length]);
    }
    gameState.collect.turnOrder = clockwiseOrder;
    gameState.collect.currentTurnIndex = 0;
    gameState.collect.currentTurnId = null; // Sera activé après le market reveal
    
    console.log(`🎴 Ordre de jeu:`, clockwiseOrder.map(id => {
        const pd = gameState.collect.playersData.get(id);
        return pd ? pd.username : id;
    }).join(' → '));
    
    // UN SEUL broadcast à tout le monde — inclut les données du round 1
    io.emit('collect-game-started', {
        playersData: getCollectPlayersData(),
        handSize: gameState.collect.handSize || 3,
        marketCards: marketCards,
        round1: {
            round: 1,
            stat: selectedStat,
            statName: statNames[selectedStat]
        }
    });
    
    // 🏪 Market reveal synchronisé — 5s après game start (~1s après fin du deal)
    setTimeout(() => {
        io.emit('collect-market-reveal', { marketCards: marketCards });
        console.log('🏪 Market reveal envoyé');
        
        // 🎴 2s après market reveal → démarrer le premier tour
        setTimeout(() => {
            startCollectTurn();
        }, 2000);
    }, 5000);
    
    // 🎴 Timer temporairement désactivé
    // const timerDelay = 9000;
    // const timerDuration = 20;
    // gameState.collect.roundTimer = setTimeout(() => {
    //     gameState.collect.timerEndTime = Date.now() + timerDuration * 1000;
    //     io.emit('collect-timer-start', { duration: timerDuration });
    //     console.log(`⏱️ Timer round 1 démarré (${timerDuration}s)`);
    // }, timerDelay);
    
    // Les joueurs demanderont leurs cartes via 'collect-request-my-cards'
    
    return { success: true };
}

// 🆕 Démarrer un round Collect (rounds 2+)
function startCollectRound() {
    const stats = ['atk', 'int', 'spd', 'pwr'];
    const statNames = { atk: 'ATK', int: 'INT', spd: 'VIT', pwr: 'POW' };
    
    gameState.collect.currentRound++;
    const selectedStat = stats[Math.floor(Math.random() * stats.length)];
    gameState.collect.roundStat = selectedStat;
    
    // Clear timer du round précédent
    if (gameState.collect.roundTimer) clearTimeout(gameState.collect.roundTimer);
    if (gameState.collect.turnTimer) clearTimeout(gameState.collect.turnTimer);
    gameState.collect.timerEndTime = null;
    gameState.collect.playedCards = new Map();
    gameState.collect.discardedPlayers = new Set();
    
    // 🎴 Sens horaire : le prochain round commence par le joueur suivant dans l'ordre des sièges
    const prevStartId = gameState.collect.turnOrder[0];
    const prevStartIdx = gameState.collect.playersOrder.indexOf(prevStartId);
    const nextStartIdx = (prevStartIdx + 1) % gameState.collect.playersOrder.length;
    const clockwiseOrder = [];
    for (let i = 0; i < gameState.collect.playersOrder.length; i++) {
        clockwiseOrder.push(gameState.collect.playersOrder[(nextStartIdx + i) % gameState.collect.playersOrder.length]);
    }
    gameState.collect.turnOrder = clockwiseOrder;
    gameState.collect.currentTurnIndex = 0;
    gameState.collect.currentTurnId = null;
    
    console.log(`🎲 Round ${gameState.collect.currentRound} - Stat: ${statNames[selectedStat]}`);
    console.log(`🎴 Ordre de jeu:`, clockwiseOrder.map(id => {
        const pd = gameState.collect.playersData.get(id);
        return pd ? pd.username : id;
    }).join(' → '));
    
    // Pas de showAt pour les rounds 2+ : les clients affichent immédiatement
    io.emit('collect-round-start', {
        round: gameState.collect.currentRound,
        stat: selectedStat,
        statName: statNames[selectedStat]
    });
    
    // 🎴 Démarrer le premier tour 2s après l'overlay du round
    setTimeout(() => {
        startCollectTurn();
    }, 2000);
    
    console.log(`🎲 collect-round-start emitted!`);
}

// 🎴 Démarrer le tour d'un joueur
function startCollectTurn() {
    if (!gameState.collect.active) return;
    
    const turnOrder = gameState.collect.turnOrder;
    const turnIndex = gameState.collect.currentTurnIndex;
    
    // Tous les joueurs ont joué → reboucler au premier joueur
    if (turnIndex >= turnOrder.length) {
        console.log('🎴 Tour complet — on reboucle');
        gameState.collect.currentTurnIndex = 0;
        startCollectTurn();
        return;
    }
    
    const currentPlayerId = turnOrder[turnIndex];
    const playerData = gameState.collect.playersData.get(currentPlayerId);
    
    if (!playerData) {
        // Joueur déconnecté → skip
        console.log(`⚠️ Joueur ${currentPlayerId} introuvable, skip`);
        gameState.collect.currentTurnIndex++;
        startCollectTurn();
        return;
    }
    
    gameState.collect.currentTurnId = currentPlayerId;
    const timerDuration = 15;
    gameState.collect.timerEndTime = Date.now() + timerDuration * 1000;
    
    // Reset les cartes jouées du tour précédent
    gameState.collect.playedCards = new Map();
    gameState.collect.discardedPlayers = new Set();
    
    console.log(`🎴 Tour de ${playerData.username} (${timerDuration}s)`);
    
    io.emit('collect-turn-start', {
        twitchId: currentPlayerId,
        username: playerData.username,
        duration: timerDuration,
        turnIndex: turnIndex,
        totalPlayers: turnOrder.length
    });
    
    // Auto-skip si le joueur ne joue pas à temps
    if (gameState.collect.turnTimer) clearTimeout(gameState.collect.turnTimer);
    gameState.collect.turnTimer = setTimeout(() => {
        if (gameState.collect.currentTurnId === currentPlayerId) {
            console.log(`⏱️ ${playerData.username} n'a pas joué à temps, tour suivant`);
            gameState.collect.currentTurnIndex++;
            startCollectTurn();
        }
    }, (timerDuration + 1) * 1000); // +1s de grâce
}

// Reset l'état Collect
function resetCollectState() {
    gameState.collect.active = false;
    gameState.collect.deck = [];
    gameState.collect.playersOrder = [];
    gameState.collect.playersData = new Map();
    gameState.collect.currentRound = 0;
    gameState.collect.roundStat = null;
    gameState.collect.playedCards = new Map();
    gameState.collect.discardedPlayers = new Set();
    gameState.collect.handSize = 3;
    gameState.collect.selectedAnimes = null;
    gameState.collect.pendingDraws = new Map();
    if (gameState.collect.roundTimer) {
        clearTimeout(gameState.collect.roundTimer);
        gameState.collect.roundTimer = null;
    }
    if (gameState.collect.turnTimer) {
        clearTimeout(gameState.collect.turnTimer);
        gameState.collect.turnTimer = null;
    }
    gameState.collect.timerEndTime = null;
    gameState.collect.turnOrder = [];
    gameState.collect.currentTurnIndex = 0;
    gameState.collect.currentTurnId = null;
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
        console.log(`⚠️ Connexion refusée - Trop de connexions depuis ${ip}`);
        socket.disconnect(true);
        return;
    }

    connectionsByIP.set(ip, currentConnections + 1);
    console.log(`🔌 Nouveau socket connecté: ${socket.id} (IP: ${ip}, connexions: ${currentConnections + 1})`);

    // Envoyer immédiatement le statut live des partenaires
    if (Object.keys(partnersLiveStatus).length > 0) {
        socket.emit('partners-live-status', partnersLiveStatus);
    }

    // 🔥 NOUVEAU: Événement pour enregistrer l'authentification
    socket.on('register-authenticated', (data) => {
        authenticatedUsers.set(socket.id, {
            twitchId: data.twitchId,
            username: data.username
        });
        console.log(`✅ Utilisateur authentifié enregistré: ${data.username} (${socket.id})`);
    });


    // Rejoindre le lobby
    socket.on('join-lobby', async (data) => {
        if (!gameState.isActive) {
            return socket.emit('error', { message: 'Le jeu n\'est pas activé' });
        }

        if (gameState.inProgress) {
            return socket.emit('error', { message: 'Une partie est déjà en cours' });
        }
        
        // 🔒 Vérifier si ce joueur est déjà en cours de traitement (anti-spam)
        if (pendingJoins.has(data.twitchId)) {
            console.log(`⏳ ${data.username} déjà en cours de traitement`);
            return socket.emit('error', { message: 'Connexion en cours...' });
        }
        
        // 🔥 Vérifier si le joueur est déjà dans le lobby (reconnexion)
        let isReconnection = false;
        let existingSocketId = null;
        for (const [socketId, player] of gameState.players.entries()) {
            if (player.twitchId === data.twitchId) {
                isReconnection = true;
                existingSocketId = socketId;
                break;
            }
        }
        
        // 💣🎴 En mode BombAnime/Collect, vérifier la limite avec les places réservées
        if ((gameState.lobbyMode === 'bombanime' || gameState.lobbyMode === 'collect') && !isReconnection) {
            const maxPlayers = gameState.lobbyMode === 'bombanime' ? BOMBANIME_CONFIG.MAX_PLAYERS : COLLECT_CONFIG.MAX_PLAYERS;
            const currentCount = gameState.players.size + pendingJoins.size;
            if (currentCount >= maxPlayers) {
                console.log(`🚫 Lobby plein: ${gameState.players.size} joueurs + ${pendingJoins.size} en attente >= ${maxPlayers}`);
                return socket.emit('error', { message: `Le lobby est plein (maximum ${maxPlayers} joueurs)` });
            }
        }
        
        // 🆕 En mode rivalité, vérifier qu'une équipe est fournie (AVANT réservation)
        if (gameState.lobbyMode === 'rivalry' && !data.team) {
            return socket.emit('error', { message: 'Vous devez choisir une équipe' });
        }
        
        // 🔒 Réserver la place AVANT les opérations async
        pendingJoins.add(data.twitchId);
        console.log(`🔒 Place réservée pour ${data.username} (pending: ${pendingJoins.size})`);
        
        try {
            if (isReconnection) {
                const existingPlayer = gameState.players.get(existingSocketId);
                
                // 🎴 Si l'entrée existante est l'admin-joueur et le nouveau join n'est PAS l'admin,
                // bloquer la reconnexion pour ne pas écraser l'admin
                if (existingPlayer && existingPlayer.isAdmin && !data.isAdmin) {
                    console.log(`🚫 ${data.username} tente de remplacer l'admin-joueur - bloqué`);
                    pendingJoins.delete(data.twitchId);
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

                // Déconnecter l'ancien socket (sans envoyer kicked pour éviter de reset le localStorage)
                const oldSocket = io.sockets.sockets.get(existingSocketId);
                if (oldSocket) {
                    oldSocket.disconnect(true);
                }
            }

            const userInfo = await db.getUserByTwitchId(data.twitchId);
        
        // 🔥 Récupérer le titre actuel du joueur
        let playerTitle = 'Novice';
        if (userInfo && userInfo.current_title_id) {
            const titleData = await db.getTitleById(userInfo.current_title_id);
            if (titleData) {
                playerTitle = titleData.title_name;
            }
        }

        // 🔥 FIX: Re-vérifier après les awaits que la partie n'a pas démarré entre-temps
        // (race condition: admin clique Démarrer pendant que le DB call était en cours)
        if (gameState.inProgress) {
            console.log(`⚠️ ${data.username} - join annulé: partie démarrée pendant le traitement`);
            pendingJoins.delete(data.twitchId);
            return socket.emit('error', { message: 'La partie vient de démarrer' });
        }

        gameState.players.set(socket.id, {
            socketId: socket.id,
            twitchId: data.twitchId,
            username: data.username,
            lives: gameState.lives,
            correctAnswers: 0,
            lastPlacement: userInfo?.last_placement || null,
            title: playerTitle,
            avatarUrl: userInfo?.avatar_url || '/img/avatars/novice.png',
            team: gameState.lobbyMode === 'rivalry' ? data.team : null,
            isAdmin: data.isAdmin || false
        });

        const playerColor = assignPlayerColor(data.username);
        addLog('join', { username: data.username, playerColor });

        console.log(`✅ ${data.username} a rejoint le lobby${data.team ? ` (Team ${data.team})` : ''}`);

        // 🆕 Utiliser la fonction helper
        broadcastLobbyUpdate();
        
        } finally {
            // 🔓 Libérer la réservation
            pendingJoins.delete(data.twitchId);
            console.log(`🔓 Place libérée pour ${data.username} (pending: ${pendingJoins.size})`);
        }
    });
    
    // 🆕 Changer d'équipe (mode Rivalité)
    socket.on('change-team', (data) => {
        if (gameState.lobbyMode !== 'rivalry') return;
        if (gameState.inProgress) return;
        
        const player = gameState.players.get(socket.id);
        if (!player) return;
        
        const oldTeam = player.team;
        player.team = data.team;
        
        console.log(`🔄 ${player.username} change d'équipe: Team ${oldTeam} → Team ${data.team}`);
        
        // Mettre à jour tous les clients
        broadcastLobbyUpdate();
    });
    
    // 🆕 Admin change l'équipe d'un joueur
    socket.on('admin-change-team', (data) => {
        if (gameState.lobbyMode !== 'rivalry') return;
        if (gameState.inProgress) return;
        
        const { twitchId, username, newTeam } = data;
        if (!newTeam) return;
        
        // Trouver le joueur par twitchId ou username
        let targetSocketId = null;
        let targetPlayer = null;
        
        for (const [socketId, player] of gameState.players.entries()) {
            if ((twitchId && player.twitchId === twitchId) || 
                (username && player.username === username)) {
                targetSocketId = socketId;
                targetPlayer = player;
                break;
            }
        }
        
        if (targetPlayer) {
            const oldTeam = targetPlayer.team;
            targetPlayer.team = newTeam;
            
            console.log(`🔄 [ADMIN] ${targetPlayer.username} changé: Team ${oldTeam} → Team ${newTeam}`);
            
            // Notifier le joueur concerné de son changement d'équipe
            const targetSocket = io.sockets.sockets.get(targetSocketId);
            if (targetSocket) {
                targetSocket.emit('team-changed', { newTeam: newTeam });
            }
            
            // Mettre à jour tous les clients
            broadcastLobbyUpdate();
        } else {
            console.log(`⚠️ [ADMIN] Joueur non trouvé: twitchId=${twitchId}, username=${username}`);
        }
    });

    // Quitter le lobby
    socket.on('leave-lobby', (data) => {
        const player = gameState.players.get(socket.id);
        if (player) {
            gameState.players.delete(socket.id);
            gameState.answers.delete(socket.id);
            console.log(`👋 ${data.username} a quitté le lobby`);

            const playerColor = playerColors[data.username];
            addLog('leave', { username: data.username, playerColor });

            broadcastLobbyUpdate();
        }
    });

    // 🆕 Kick un joueur manuellement (depuis l'admin)
    socket.on('kick-player', (data) => {
        const { username, twitchId } = data;
        if (!username) return;

        console.log(`🚫 Kick demandé pour: ${username}`);

        // Trouver le joueur par username ou twitchId
        let targetSocketId = null;
        let targetPlayer = null;

        for (const [socketId, player] of gameState.players.entries()) {
            if (player.username === username || player.twitchId === twitchId) {
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
            const playerColor = playerColors[username];
            addLog('kick', { username, playerColor });

            // Mettre à jour le lobby/game pour tout le monde
            broadcastLobbyUpdate();

            // 🆕 Vérifier si la partie doit se terminer après le kick
            if (gameState.inProgress && gameState.mode === 'lives') {
                const currentAlivePlayers = getAlivePlayers();
                console.log(`🔍 Joueurs en vie après kick: ${currentAlivePlayers.length}`);
                
                if (currentAlivePlayers.length <= 1) {
                    const winner = currentAlivePlayers.length === 1 ? currentAlivePlayers[0] : null;
                    console.log(`🏁 Fin de partie après kick - Gagnant: ${winner ? winner.username : 'Aucun'}`);
                    endGame(winner);
                }
            }
        } else {
            console.log(`⚠️ Joueur ${username} non trouvé pour kick`);
        }
    });

    // Reconnexion d'un joueur (nouveau événement)
    socket.on('reconnect-player', (data) => {
        if (!gameState.inProgress) {
            return socket.emit('error', { message: 'Aucune partie en cours' });
        }

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

            // Update socketId in survie alivePlayers too
            if (gameState.survie?.alivePlayers) {
                const surviePlayer = gameState.survie.alivePlayers.find(p => p.twitchId === data.twitchId);
                if (surviePlayer) surviePlayer.socketId = socket.id;
            }

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
                initPlayerChallenges(socket.id);
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
                challenges: getPlayerChallengesState(socket.id), // 🆕 Envoyer les défis
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
            const playerColor = playerColors[data.username] || assignPlayerColor(data.username);
            if (existingPlayer.disconnectLogged) {
                addLog('reconnect', { username: data.username, playerColor });
                delete existingPlayer.disconnectLogged;
            }

            // Mise à jour lobby
            broadcastLobbyUpdate();
        } else {
            socket.emit('error', {
                message: 'Vous ne pouvez pas rejoindre une partie en cours',
                canSpectate: true
            });
        }
    });

    // 🎴 Joueur demande ses cartes (après avoir reçu collect-game-started)
    socket.on('collect-get-animes', () => {
        // Build anime list dynamically from collect-cards.json
        const animeList = Object.entries(COLLECT_CARDS_DATA).map(([id, data]) => {
            // protagonist is already included in the class lists, don't double-count
            const count = (data.assaut ? data.assaut.length : 0)
                        + (data.oracle ? data.oracle.length : 0)
                        + (data.mirage ? data.mirage.length : 0);
            return { id, count };
        });
        // Sort by count descending
        animeList.sort((a, b) => b.count - a.count);
        socket.emit('collect-animes-list', { animes: animeList, big3: ['OnePiece', 'Naruto', 'Bleach'] });
    });

    socket.on('collect-request-my-cards', (data) => {
        const twitchId = data && data.twitchId;
        console.log(`🎴 Demande cartes de ${twitchId} (active: ${gameState.collect.active}, socket: ${socket.id})`);
        
        if (!gameState.collect.active) {
            console.log(`⚠️ Collect pas active pour demande de ${twitchId}`);
            return;
        }
        if (!twitchId) {
            console.log(`⚠️ Pas de twitchId dans la demande`);
            return;
        }
        
        const playerData = gameState.collect.playersData.get(twitchId);
        if (playerData && playerData.cards && playerData.cards.length > 0) {
            socket.emit('collect-your-cards', {
                cards: playerData.cards,
                dealing: true
            });
            console.log(`🎴 Cartes envoyées à ${twitchId} sur demande (${playerData.cards.length} cartes)`);
        } else {
            console.log(`⚠️ Pas de cartes trouvées pour ${twitchId} (playerData: ${!!playerData})`);
        }
    });

    // ð´ Joueur joue une carte
    // 🔥 Fusion de cartes Collect
    socket.on('collect-fuse-cards', (data) => {
        const twitchId = data && data.twitchId;
        const sourceIndex = data && data.sourceIndex;
        const targetIndex = data && data.targetIndex;
        
        if (!gameState.collect.active || !twitchId || sourceIndex === undefined || targetIndex === undefined) return;
        
        const playerData = gameState.collect.playersData.get(twitchId);
        if (!playerData || !playerData.cards) return;
        
        const src = playerData.cards[sourceIndex];
        const tgt = playerData.cards[targetIndex];
        if (!src || !tgt || src.anime !== tgt.anime) {
            console.log(`⚠️ Fusion invalide pour ${twitchId}: anime mismatch`);
            return;
        }
        
        // Build fused card
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
        
        // Update cards array (same logic as client)
        if (sourceIndex < targetIndex) {
            playerData.cards.splice(targetIndex, 1, fusedCard);
            playerData.cards.splice(sourceIndex, 1);
        } else {
            playerData.cards.splice(sourceIndex, 1);
            playerData.cards.splice(targetIndex, 1, fusedCard);
        }
        
        console.log(`🔥 FUSION: ${playerData.username} fusionne ${allCards.map(c => c.name).join(' + ')} → ${fusedCard.name} (${allCards.length} cartes)`);
        broadcastCollectCardCounts();
    });
    
    socket.on('collect-play-card', (data) => {
        const twitchId = data && data.twitchId;
        const cardIndex = data && data.cardIndex;
        
        if (!gameState.collect.active || !twitchId || cardIndex === undefined) {
            console.log('⚠️ collect-play-card: conditions invalides');
            return;
        }
        
        // 🎴 Vérifier que c'est bien le tour de ce joueur
        if (gameState.collect.currentTurnId !== twitchId) {
            console.log(`⚠️ ${twitchId} essaie de jouer mais c'est le tour de ${gameState.collect.currentTurnId}`);
            socket.emit('collect-card-confirmed', { success: false, reason: 'not_your_turn' });
            return;
        }
        
        const playerData = gameState.collect.playersData.get(twitchId);
        if (!playerData || !playerData.cards || !playerData.cards[cardIndex]) {
            console.log(`⚠️ collect-play-card: carte invalide pour ${twitchId}`);
            return;
        }
        
        // Vérifier que le joueur n'a pas déjà joué ce round
        if (gameState.collect.playedCards.has(twitchId)) {
            console.log(`⚠️ ${twitchId} a déjà joué ce round`);
            return;
        }
        
        // ⏱️ Vérifier que le timer n'a pas expiré (+1s de grâce réseau)
        if (gameState.collect.timerEndTime && Date.now() > gameState.collect.timerEndTime + 1000) {
            console.log(`⏱️ ${twitchId} trop tard, timer expiré`);
            socket.emit('collect-card-confirmed', { success: false, reason: 'timer_expired' });
            return;
        }
        
        // Stocker la carte jouée
        const playedCard = playerData.cards[cardIndex];
        gameState.collect.playedCards.set(twitchId, playedCard);
        
        // Stocker si c'est une défausse
        if (data.discard) {
            if (!gameState.collect.discardedPlayers) gameState.collect.discardedPlayers = new Set();
            gameState.collect.discardedPlayers.add(twitchId);
        }
        
        // Retirer la carte de la main du joueur
        playerData.cards.splice(cardIndex, 1);
        
        console.log(`🎴 ${playerData.username} joue: ${playedCard.name} (round ${gameState.collect.currentRound})`);
        
        // Confirmer au joueur
        socket.emit('collect-card-confirmed', { success: true });
        broadcastCollectCardCounts();
        
        // Notifier tous les clients qu'un joueur a joué (sans révéler la carte sauf discard)
        io.emit('collect-player-played', {
            twitchId: twitchId,
            username: playerData.username,
            totalPlayed: gameState.collect.playedCards.size,
            totalPlayers: gameState.collect.playersOrder.length,
            isDiscard: !!data.discard,
            playedCard: data.discard ? null : (playedCard.isFused ? playedCard : null)
        });
        
        console.log(`🎴 Cartes jouées: ${gameState.collect.playedCards.size}/${gameState.collect.playersOrder.length}`);
        
        // ⭐ Détection Lien/Collect — carte fusionnée jouée (pas défaussée)
        if (!data.discard && playedCard.isFused && playedCard.fusedCards && playedCard.fusedCards.length >= 2) {
            const fusionCount = playedCard.fusedCards.length;
            const starsGained = fusionCount >= 3 ? 2 : 1;
            const fusionType = fusionCount >= 3 ? 'collect' : 'lien';
            
            playerData.wins = (playerData.wins || 0) + starsGained;
            
            console.log(`⭐ ${playerData.username} valide ${fusionType.toUpperCase()} → +${starsGained} étoile(s) (total: ${playerData.wins}/${gameState.collect.handSize || 3})`);
            
            // Émettre quasi-immédiatement
            setTimeout(() => {
                io.emit('collect-star-gain', {
                    twitchId: twitchId,
                    username: playerData.username,
                    starsGained: starsGained,
                    totalStars: playerData.wins,
                    fusionType: fusionType,
                    playedCard: playedCard
                });
            }, 50);
        }
        
        // Tour suivant immédiatement après l'action
        if (gameState.collect.turnTimer) clearTimeout(gameState.collect.turnTimer);
        gameState.collect.currentTurnIndex++;
        setTimeout(() => startCollectTurn(), 500);
    });

    // 🎴 Piocher une carte depuis le deck
    socket.on('collect-draw-card', (data) => {
        const twitchId = data.twitchId;
        if (!gameState.collect.active || !twitchId) return;

        const playerData = gameState.collect.playersData.get(twitchId);
        if (!playerData) return;

        // Vérifier main pleine
        const handSize = gameState.collect.handSize || 3;
        if (playerData.cards.length >= handSize) {
            socket.emit('collect-draw-full', { message: 'Main pleine' });
            return;
        }

        if (!gameState.collect.deck || gameState.collect.deck.length === 0) {
            console.log(`⚠️ Deck vide, impossible de piocher`);
            return;
        }

        // Piocher 1 carte aléatoire
        const idx = Math.floor(Math.random() * gameState.collect.deck.length);
        const drawnCard = gameState.collect.deck.splice(idx, 1)[0];
        
        // Ajouter à la main
        playerData.cards.push(drawnCard);
        console.log(`🎴 ${playerData.username} pioche: ${drawnCard.name} (${drawnCard.anime})`);
        socket.emit('collect-draw-result', { card: drawnCard });
        broadcastCollectCardCounts();
        
        // Tour suivant immédiatement après la pioche
        if (gameState.collect.turnTimer) clearTimeout(gameState.collect.turnTimer);
        gameState.collect.currentTurnIndex++;
        setTimeout(() => startCollectTurn(), 1000);
    });

    // 🔄 Échanger une carte avec le marché
    socket.on('collect-swap-market', (data) => {
        const twitchId = data && data.twitchId;
        const cardIndex = data && data.cardIndex;
        const marketIndex = data && data.marketIndex;
        
        if (!gameState.collect.active || !twitchId || cardIndex === undefined || marketIndex === undefined) {
            console.log('⚠️ collect-swap-market: conditions invalides');
            return;
        }
        
        // Vérifier que c'est le tour du joueur
        if (gameState.collect.currentTurnId !== twitchId) {
            console.log(`⚠️ ${twitchId} essaie d'échanger mais c'est pas son tour`);
            socket.emit('collect-swap-confirmed', { success: false, reason: 'not_your_turn' });
            return;
        }
        
        const playerData = gameState.collect.playersData.get(twitchId);
        if (!playerData || !playerData.cards || !playerData.cards[cardIndex]) {
            console.log(`⚠️ collect-swap-market: carte main invalide pour ${twitchId}`);
            return;
        }
        
        // Vérifier que le joueur n'a pas déjà joué
        if (gameState.collect.playedCards.has(twitchId)) {
            console.log(`⚠️ ${twitchId} a déjà joué ce round`);
            return;
        }
        
        // Vérifier timer
        if (gameState.collect.timerEndTime && Date.now() > gameState.collect.timerEndTime + 1000) {
            socket.emit('collect-swap-confirmed', { success: false, reason: 'timer_expired' });
            return;
        }
        
        // Vérifier le marché
        if (!gameState.collect.marketCards || !gameState.collect.marketCards[marketIndex]) {
            console.log(`⚠️ collect-swap-market: carte marché invalide index ${marketIndex}`);
            return;
        }
        
        // Échanger les cartes
        const playerCard = playerData.cards[cardIndex];
        const marketCard = gameState.collect.marketCards[marketIndex];
        
        // La carte du joueur va au marché, la carte du marché va en main
        playerData.cards[cardIndex] = marketCard;
        gameState.collect.marketCards[marketIndex] = playerCard;
        
        // Marquer comme ayant joué (compte comme action)
        gameState.collect.playedCards.set(twitchId, { swapped: true, given: playerCard, received: marketCard });
        
        console.log(`🔄 ${playerData.username} échange: ${playerCard.name} ↔ ${marketCard.name} (marché)`);
        
        // Confirmer au joueur
        socket.emit('collect-swap-confirmed', { 
            success: true, 
            newCard: marketCard,
            cardIndex: cardIndex
        });
        
        // Notifier tout le monde du nouveau marché + que le joueur a joué
        io.emit('collect-market-update', { 
            marketCards: gameState.collect.marketCards,
            twitchId: twitchId,
            username: playerData.username,
            marketIndex: marketIndex,
            givenCard: playerCard
        });
        
        io.emit('collect-player-played', {
            twitchId: twitchId,
            username: playerData.username,
            totalPlayed: gameState.collect.playedCards.size,
            totalPlayers: gameState.collect.playersOrder.length,
            isDiscard: true, // Visuellement traité comme une défausse (pas de star)
            isSwap: true
        });
        
        // Tour suivant
        if (gameState.collect.turnTimer) clearTimeout(gameState.collect.turnTimer);
        gameState.collect.currentTurnIndex++;
        setTimeout(() => startCollectTurn(), 500);
    });

    // 🔍 SCANNER — Voir les cartes d'un adversaire pendant 7s
    socket.on('collect-scan-player', (data) => {
        const twitchId = data && data.twitchId;
        const targetId = data && data.targetId;
        
        if (!gameState.collect.active || !twitchId || !targetId) {
            console.log('⚠️ collect-scan-player: conditions invalides');
            return;
        }
        
        // Vérifier que c'est bien le tour de ce joueur
        if (gameState.collect.currentTurnId !== twitchId) {
            console.log(`⚠️ ${twitchId} essaie de scanner mais c'est pas son tour`);
            socket.emit('collect-scan-result', { success: false, reason: 'not_your_turn' });
            return;
        }
        
        // Vérifier que le joueur n'a pas déjà joué
        if (gameState.collect.playedCards.has(twitchId)) {
            console.log(`⚠️ ${twitchId} a déjà joué ce round`);
            return;
        }
        
        // Vérifier timer
        if (gameState.collect.timerEndTime && Date.now() > gameState.collect.timerEndTime + 1000) {
            socket.emit('collect-scan-result', { success: false, reason: 'timer_expired' });
            return;
        }
        
        // Vérifier que la cible est un joueur valide (pas soi-même)
        if (twitchId === targetId) {
            console.log(`⚠️ ${twitchId} essaie de se scanner lui-même`);
            return;
        }
        
        const targetData = gameState.collect.playersData.get(targetId);
        if (!targetData || !targetData.cards) {
            console.log(`⚠️ collect-scan-player: cible ${targetId} invalide`);
            return;
        }
        
        // Marquer comme ayant joué (le scanner coûte le tour)
        gameState.collect.playedCards.set(twitchId, { scanned: true, target: targetId });
        
        const scannerData = gameState.collect.playersData.get(twitchId);
        console.log(`🔍 ${scannerData ? scannerData.username : twitchId} scanne ${targetData.username} (${targetData.cards.length} cartes)`);
        
        // Envoyer les cartes de la cible au scanner (privé — lui seul voit)
        socket.emit('collect-scan-result', {
            success: true,
            targetId: targetId,
            targetUsername: targetData.username,
            cards: targetData.cards,
            duration: 7
        });
        
        // Notifier tout le monde qu'un scan a eu lieu (sans révéler les cartes)
        io.emit('collect-player-played', {
            twitchId: twitchId,
            username: scannerData ? scannerData.username : 'Joueur',
            totalPlayed: gameState.collect.playedCards.size,
            totalPlayers: gameState.collect.playersOrder.length,
            isDiscard: false,
            isScan: true,
            scanTargetUsername: targetData.username
        });
        
        // Tour suivant
        if (gameState.collect.turnTimer) clearTimeout(gameState.collect.turnTimer);
        gameState.collect.currentTurnIndex++;
        setTimeout(() => startCollectTurn(), 500);
    });

    socket.on('collect-reconnect', (data) => {
        if (!gameState.collect.active) {
            console.log(`🎴 Pas de partie Collect en cours pour ${data.username}`);
            socket.emit('collect-reconnect', { active: false });
            return;
        }

        const twitchId = data.twitchId;
        
        // Vérifier que le joueur fait partie de la partie Collect
        if (!gameState.collect.playersOrder.includes(twitchId)) {
            console.log(`🎴 ${data.username} n'est pas dans la partie Collect`);
            socket.emit('collect-reconnect', { active: false });
            return;
        }

        // Mettre à jour le socketId du joueur dans gameState.players
        let oldSocketId = null;
        for (const [socketId, player] of gameState.players.entries()) {
            if (player.twitchId === twitchId && socketId !== socket.id) {
                oldSocketId = socketId;
                // Transférer le joueur vers le nouveau socket
                gameState.players.delete(oldSocketId);
                player.socketId = socket.id;
                gameState.players.set(socket.id, player);
                delete player.disconnectedAt;
                delete player.disconnectedSocketId;
                console.log(`🎴 Socket transféré: ${oldSocketId} → ${socket.id}`);
                break;
            }
        }

        // Récupérer les données du joueur
        const playerData = gameState.collect.playersData.get(twitchId);
        if (!playerData) {
            console.log(`🎴 Pas de données Collect pour ${data.username}`);
            socket.emit('collect-reconnect', { active: false });
            return;
        }

        // Envoyer l'état complet de la partie
        // Vérifier si le joueur a déjà joué ce round
        const isDiscard = gameState.collect.discardedPlayers && gameState.collect.discardedPlayers.has(twitchId);
        const playedCard = isDiscard ? null : (gameState.collect.playedCards.get(twitchId) || null);
        
        socket.emit('collect-reconnect', {
            playersData: getCollectPlayersData(),
            myCards: playerData.cards,
            handSize: gameState.collect.handSize || 3,
            marketCards: gameState.collect.marketCards || [],
            currentRound: gameState.collect.currentRound || 0,
            roundStat: gameState.collect.roundStat || null,
            playedCard: playedCard,
            playersWhoPlayed: Array.from(gameState.collect.playedCards.keys()),
            timerRemainingMs: gameState.collect.timerEndTime ? Math.max(0, gameState.collect.timerEndTime - Date.now()) : 0,
            timerStarted: !!gameState.collect.timerEndTime,
            currentTurnId: gameState.collect.currentTurnId || null,
            hasPlayed: gameState.collect.currentTurnId !== twitchId
        });

        console.log(`🎴 ${data.username} reconnecté à la partie Collect (cards: ${playerData.cards.length})`);
    });

    // Demander l'état Collect (pour reconnexion admin)
    socket.on('collect-get-state', (data) => {
        if (!gameState.collect.active) {
            socket.emit('collect-state', { active: false });
            return;
        }
        
        // Vérifier si admin a joué ce round
        const requestTwitchId = data && data.twitchId;
        const adminIsDiscard = requestTwitchId && gameState.collect.discardedPlayers && gameState.collect.discardedPlayers.has(requestTwitchId);
        const adminPlayedCard = adminIsDiscard ? null : (requestTwitchId ? (gameState.collect.playedCards.get(requestTwitchId) || null) : null);
        
        socket.emit('collect-state', {
            active: true,
            playersData: getCollectPlayersData(),
            handSize: gameState.collect.handSize || 3,
            marketCards: gameState.collect.marketCards || [],
            currentRound: gameState.collect.currentRound || 0,
            roundStat: gameState.collect.roundStat || null,
            playedCard: adminPlayedCard,
            playersWhoPlayed: Array.from(gameState.collect.playedCards.keys()),
            timerRemainingMs: gameState.collect.timerEndTime ? Math.max(0, gameState.collect.timerEndTime - Date.now()) : 0,
            timerStarted: !!gameState.collect.timerEndTime,
            currentTurnId: gameState.collect.currentTurnId || null
        });
        
        // Renvoyer les cartes privées si un twitchId est fourni et qu'il est joueur Collect
        if (requestTwitchId) {
            const playerData = gameState.collect.playersData.get(requestTwitchId);
            if (playerData && playerData.cards && playerData.cards.length > 0) {
                socket.emit('collect-your-cards', {
                    cards: playerData.cards
                });
                console.log(`🎴 Cartes renvoyées à ${requestTwitchId} après reconnexion`);
            }
        }
        
        console.log(`🎴 État Collect envoyé (joueurs: ${gameState.collect.playersOrder.length})`);
    });


    // Répondre à une question
    socket.on('submit-answer', (data) => {
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
            addLog('answer', {
                username: player.username,
                playerColor: playerColors[player.username]
            });
        }

        socket.emit('answer-recorded');

        gameState.liveAnswers.set(socket.id, data.answer);
        throttledUpdateLiveAnswerStats();

        io.emit('answer-submitted', {
            socketId: socket.id,
            answeredCount: gameState.answers.size,
            totalPlayers: gameState.players.size
        });

        io.emit('player-answered', {
            username: player.username,
            answeredCount: gameState.answers.size,
            totalPlayers: gameState.players.size
        });
    });


    // 🆕 Utilisation d'un bonus
    socket.on('use-bonus', (data) => {
        if (!gameState.inProgress) return;

        const player = gameState.players.get(socket.id);
        if (!player) return;

        const { bonusType } = data;

        // Vérifier et utiliser le bonus
        const success = usePlayerBonus(socket.id, bonusType);

        if (success) {
            console.log(`✅ Bonus "${bonusType}" utilisé par ${player.username}`);

            // LOGS D'ACTIVITÉ
            const playerColor = playerColors[player.username];
            switch (bonusType) {
                case '5050':
                    addLog('bonus-5050', { username: player.username, playerColor });
                    break;
                case 'reveal':
                    addLog('bonus-joker', { username: player.username, playerColor });
                    break;
                case 'shield':
                    addLog('bonus-shield', { username: player.username, playerColor });
                    break;
                case 'doublex2':
                    addLog('bonus-x2', { username: player.username, playerColor });
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
        if (!gameState.bombanime.active) return;
        
        const result = submitBombanimeName(socket.id, data.name);
        
        if (!result.success) {
            // L'erreur est déjà envoyée dans submitBombanimeName
        }
    });
    
    // 🎯 Utiliser le bonus "Perso Gratuit" - donne un personnage aléatoire non utilisé
    socket.on('bombanime-use-free-character', () => {
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
        const freeChar = getRandomUnusedCharacter(gameState.bombanime.serie);
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
        io.emit('bombanime-player-lives-updated', {
            playerTwitchId: player.twitchId,
            playerUsername: player.username,
            lives: player.lives,
            playersData: getBombanimePlayersData()
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
        const myChallenges = player ? getBombanimePlayerChallengesState(player.twitchId) : [];
        const myBonuses = player ? getBombanimePlayerBonuses(player.twitchId) : { freeCharacter: 0, extraLife: 0 };
        
        socket.emit('bombanime-state', {
            active: true,
            serie: gameState.bombanime.serie,
            timer: gameState.bombanime.timer,
            currentPlayerTwitchId: gameState.bombanime.currentPlayerTwitchId,
            playersOrder: gameState.bombanime.playersOrder,
            playersData: getBombanimePlayersData(),
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
    socket.on('bombanime-add-fake-player', () => {
        if (gameState.inProgress) {
            console.log('❌ Impossible d\'ajouter un joueur fictif en cours de partie');
            return;
        }
        
        // Pseudos réalistes style Twitch
        const fakeNames = [
            'xNarutoFan_99', 'SakuraChan_', 'OnePieceLover', 'ZoroSlash42',
            'LuffyGumGum', 'SasukeDark_', 'KakashiSensei', 'HinataShy',
            'GaaraOfSand', 'ItachiLegend', 'MadaraGod_', 'TobiramaH2O'
        ];
        
        // Noms de personnages longs pour tester le rendu (max 15 chars)
        const fakeCharacterNames = [
            'SASUKE UCHIHA', 'MONKEY D LUFFY', 'RORONOA ZORO', 'PORTGAS D ACE',
            'TRAFALGAR LAW', 'VINSMOKE SANJI', 'NICO ROBIN', 'DOFLAMINGO',
            'KATAKURI', 'UZUMAKI NARUTO', 'KAKASHI HATAKE', 'MADARA UCHIHA'
        ];
        
        // Trouver un nom non utilisé
        const usedNames = Array.from(gameState.players.values()).map(p => p.username);
        const availableIndex = fakeNames.findIndex(name => !usedNames.includes(name));
        
        if (availableIndex === -1) {
            console.log('❌ Plus de noms fictifs disponibles');
            return;
        }
        
        if (gameState.players.size >= 13) {
            console.log('❌ Maximum 13 joueurs atteint');
            return;
        }
        
        const availableName = fakeNames[availableIndex];
        const fakeCharacterName = fakeCharacterNames[availableIndex] || 'PERSONNAGE';
        
        const fakeId = 'fake-' + Date.now();
        const fakeTwitchId = 'fake-twitch-' + Date.now();
        
        const fakePlayer = {
            socketId: fakeId,
            odemonId: fakeId,
            odemonAvatar: '/default-avatar.png',
            odemonBgColor: '#333',
            odemonBgUrl: null,
            odemonGradient: 'none',
            odemonEmoji: null,
            twitchId: fakeTwitchId,
            username: availableName,
            lives: gameState.bombanime.lives || BOMBANIME_CONFIG.DEFAULT_LIVES,
            points: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            answered: false,
            hasAnsweredFirst: false,
            hasUsedBonus: false,
            usedBonuses: [],
            team: null,
            joinedAt: Date.now(),
            isFake: true,
            fakeCharacterName: fakeCharacterName
        };
        
        gameState.players.set(fakeId, fakePlayer);
        
        console.log(`🤖 Joueur fictif ajouté: ${availableName} avec réponse "${fakeCharacterName}" (Total: ${gameState.players.size})`);
        
        // Notifier tous les clients
        io.emit('player-joined', {
            odemonId: fakeId,
            odemonAvatar: fakePlayer.odemonAvatar,
            odemonBgColor: fakePlayer.odemonBgColor,
            odemonBgUrl: fakePlayer.odemonBgUrl,
            odemonGradient: fakePlayer.odemonGradient,
            odemonEmoji: fakePlayer.odemonEmoji,
            twitchId: fakeTwitchId,
            username: availableName,
            lives: fakePlayer.lives,
            points: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            team: null,
            isFake: true,
            fakeCharacterName: fakeCharacterName
        });
        
        io.emit('player-count', gameState.players.size);
    });

    // ============================================
    // 🎮 SURVIE - Socket Handlers
    // ============================================
    
    socket.on('survie-completed', (data) => {
        if (!gameState.survie?.active || !gameState.survie?.roundInProgress) return;
        const player = gameState.players.get(socket.id);
        if (!player) return;
        surviePlayerCompleted(socket.id, player.twitchId);
    });
    
    socket.on('survie-next-round', () => {
        if (!gameState.survie?.active) return;
        // Vérifier que c'est un admin
        startSurvieNextRound();
    });
    
    socket.on('survie-reconnect', (data) => {
        if (gameState.survie?.active) {
            // Try to find player by socket.id or by twitchId passed from client
            const twitchId = data?.twitchId || null;
            console.log(`🔄 Survie reconnect: socketId=${socket.id}, twitchId=${twitchId}`);
            socket.emit('survie-state', getSurvieStateForClient(socket.id, twitchId));
        }
    });
    
    // Position du joueur sur le plateau
    socket.on('survie-position', (data) => {
        if (!gameState.survie?.active) return;
        let player = gameState.players.get(socket.id);
        
        // Fallback: find player by twitchId if socket.id not mapped
        if (!player && data.twitchId) {
            for (const [sid, p] of gameState.players.entries()) {
                if (p.twitchId && p.twitchId === data.twitchId) {
                    player = p;
                    gameState.players.delete(sid);
                    player.socketId = socket.id;
                    gameState.players.set(socket.id, player);
                    console.log(`🔄 Socket remappé (position) pour ${player.username}: ${sid} → ${socket.id}`);
                    break;
                }
            }
        }
        if (!player) return;
        
        // Store position
        const surviePlayer = gameState.survie.alivePlayers.find(p => p.twitchId === player.twitchId);
        if (surviePlayer) {
            surviePlayer.posX = data.x;
            surviePlayer.posY = data.y;
        }
        
        // Broadcast to ALL (including admin who is just watching)
        socket.broadcast.emit('survie-player-moved', {
            twitchId: player.twitchId,
            x: data.x,
            y: data.y,
            vx: data.vx,
            vy: data.vy
        });
        
        // Also emit to admin sockets specifically (they might not be in players map)
        io.emit('survie-player-pos', {
            twitchId: player.twitchId,
            x: data.x,
            y: data.y,
            vx: data.vx,
            vy: data.vy
        });
    });

    // ═══ INTERACTION NPC — Système de quêtes ═══
    socket.on('survie-interact', (data) => {
        if (!gameState.survie?.active) return;
        let player = gameState.players.get(socket.id);
        
        // Fallback: find player by twitchId if socket.id not mapped (happens after refresh)
        if (!player) {
            for (const [sid, p] of gameState.players.entries()) {
                if (p.twitchId && p.twitchId === data.twitchId) {
                    player = p;
                    // Update socket mapping
                    gameState.players.delete(sid);
                    player.socketId = socket.id;
                    gameState.players.set(socket.id, player);
                    console.log(`🔄 Socket remappé pour ${player.username}: ${sid} → ${socket.id}`);
                    break;
                }
            }
        }
        if (!player) return;
        
        const survie = gameState.survie;
        const twitchId = player.twitchId;
        const npcId = data.npcId;
        const isStructure = data.isStructure || false;
        
        console.log(`🗣️ ${player.username} interagit avec ${npcId} (structure: ${isStructure})`);
        
        // Get player quest state (auto-create for admin if missing)
        let pState = survie.playerQuestStates?.[twitchId];
        if (!pState && survie.quests) {
            console.log(`🔧 Création quest state pour ${twitchId} (admin/late join)`);
            survie.playerQuestStates[twitchId] = createPlayerQuestState(survie.quests);
            pState = survie.playerQuestStates[twitchId];
        }
        if (!pState) {
            console.log(`⚠️ Pas de quest state pour ${twitchId}`);
            return;
        }
        
        // Find if any quest is affected by this interaction
        let questDialogue = null;
        let questUpdate = null;
        let itemGiven = null;
        let itemTaken = null;
        
        for (const quest of pState.quests) {
            if (quest.completed) continue;
            
            // Find the template for this quest
            const template = survie.quests.find(q => q.id === quest.id);
            if (!template) continue;
            
            // ═══ DELIVER / VISIT_DELIVER / CHAIN / TRADE_CHAIN ═══
            if (template.steps && quest.currentStep < template.steps.length) {
                const step = template.steps[quest.currentStep];
                
                // Check if this NPC/structure matches the current step
                if (step.action === 'talk' && step.npc === npcId) {
                    questDialogue = step.dialogue;
                    if (step.giveItem) {
                        itemGiven = step.giveItem;
                        pState.inventory.push(step.giveItem);
                    }
                    quest.currentStep++;
                    quest.stepDesc = getStepDescription(template, quest.currentStep);
                    
                    // Check if quest completed
                    if (quest.currentStep >= template.steps.length) {
                        quest.completed = true;
                        pState.completedCount++;
                    }
                    questUpdate = { questId: quest.id, currentStep: quest.currentStep, completed: quest.completed, itemGiven };
                    break;
                    
                } else if (step.action === 'visit' && step.structure === npcId && isStructure) {
                    questDialogue = step.dialogue;
                    if (step.giveItem) {
                        itemGiven = step.giveItem;
                        pState.inventory.push(step.giveItem);
                    }
                    quest.currentStep++;
                    quest.stepDesc = getStepDescription(template, quest.currentStep);
                    
                    if (quest.currentStep >= template.steps.length) {
                        quest.completed = true;
                        pState.completedCount++;
                    }
                    questUpdate = { questId: quest.id, currentStep: quest.currentStep, completed: quest.completed, itemGiven };
                    break;
                    
                } else if (step.action === 'deliver' && step.npc === npcId && pState.inventory.includes(step.item)) {
                    // Don't complete yet — ask player to select item from inventory
                    questDialogue = step.deliverAskDialogue || "Tu as ce que je t'ai demandé ?";
                    questUpdate = { 
                        questId: quest.id, 
                        awaitingGive: true,
                        requiredItems: [step.item],
                        requiredCount: 1
                    };
                    break;
                    
                } else if (step.action === 'trade' && step.npc === npcId && pState.inventory.includes(step.item)) {
                    // Don't complete yet — ask player to select item from inventory
                    questDialogue = "Tu veux échanger quelque chose ?";
                    questUpdate = { 
                        questId: quest.id, 
                        awaitingGive: true,
                        requiredItems: [step.item],
                        requiredCount: 1
                    };
                    break;
                }
            }
            
            // ═══ REUNION ═══
            if (template.type === 'REUNION' && !isStructure) {
                const groupData = QUEST_GROUPS[template.group];
                if (groupData && groupData.members && groupData.members.includes(npcId)) {
                    if (!quest.found.includes(npcId)) {
                        quest.found.push(npcId);
                        questDialogue = template.dialogue_found;
                        
                        if (quest.found.length >= quest.count) {
                            quest.completed = true;
                            pState.completedCount++;
                        }
                        questUpdate = { questId: quest.id, found: quest.found, completed: quest.completed };
                        break;
                    }
                }
            }
            
            // ═══ COLLECT_ITEMS — Delivery step ═══
            if (template.type === 'COLLECT_ITEMS' && !quest.completed) {
                if (template.deliverTo === npcId && !isStructure && quest.collected >= template.count) {
                    // All items collected — ask player to select items from inventory
                    const requiredItems = template.specialItems 
                        ? template.specialItems.filter(si => pState.inventory.includes(si))
                        : pState.inventory.filter(i => i === template.item).slice(0, template.count);
                    // Also send imageUrls for client-side matching (slots may have ground item IDs)
                    const requiredImageUrls = requiredItems.map(ri => QUEST_ITEMS[ri]?.imageUrl).filter(Boolean);
                    questDialogue = "Tu as tout ce que je t'ai demandé ?";
                    questUpdate = { 
                        questId: quest.id, 
                        awaitingGive: true,
                        requiredItems: requiredItems,
                        requiredImageUrls: requiredImageUrls,
                        requiredCount: requiredItems.length
                    };
                    break;
                }
            }
            
            // ═══ RIDDLE ═══
            if (template.type === 'RIDDLE' && !quest.solved) {
                // Step 1: talk to hint NPC for clue
                if (template.hint_npc && !quest.hintReceived && template.hint_npc === npcId && !isStructure) {
                    quest.hintReceived = true;
                    quest.currentStep = 1;
                    questDialogue = template.hint_dialogue;
                    // Full hint as stepDesc (no truncation)
                    quest.stepDesc = (template.hint_dialogue || 'Chercher la réponse...').replace(/\*\*/g, '');
                    questUpdate = { questId: quest.id, hintReceived: true, currentStep: 1 };
                    break;
                }
                // Step 2: find the answer
                const matchNPC = template.answer_npc === npcId && !isStructure;
                const matchStructure = template.answer_structure === npcId && isStructure;
                if ((matchNPC || matchStructure) && (quest.hintReceived || !template.hint_npc)) {
                    quest.solved = true;
                    quest.completed = true;
                    quest.currentStep = 2;
                    quest.stepDesc = 'Terminé !';
                    pState.completedCount++;
                    questDialogue = template.dialogue_correct;
                    questUpdate = { questId: quest.id, solved: true, completed: true, currentStep: 2 };
                    break;
                }
            }
            
            // ═══ ESCORT ═══
            if (template.type === 'ESCORT') {
                if (!quest.escorting && template.npc === npcId && !isStructure) {
                    quest.escorting = true;
                    quest.currentStep = 1;
                    const structData = SURVIE_STRUCTURES.find(n => n.id === template.destination_structure);
                    quest.stepDesc = `Se rendre à ${structData ? structData.name : template.destination_structure}`;
                    questDialogue = template.dialogue_start;
                    questUpdate = { questId: quest.id, escorting: true, currentStep: 1, hideNpc: template.npc };
                    break;
                } else if (quest.escorting && template.destination_structure === npcId && isStructure) {
                    quest.arrived = true;
                    quest.completed = true;
                    quest.currentStep = 2;
                    quest.stepDesc = 'Terminé !';
                    pState.completedCount++;
                    questDialogue = template.dialogue_arrive;
                    questUpdate = { questId: quest.id, arrived: true, completed: true, currentStep: 2 };
                    break;
                }
            }
            
            // ═══ MYSTERY ═══
            if (template.type === 'MYSTERY') {
                // Return stolen item to victim (after accusing culprit) — uses give system
                if (quest.accused && !quest.completed && template.victim === npcId && pState.inventory.includes(template.stolen_item)) {
                    const victimData = SURVIE_CHARACTERS.find(n => n.id === template.victim);
                    questDialogue = "Tu as ce que je t'ai demandé ?";
                    questUpdate = {
                        questId: quest.id,
                        awaitingGive: true,
                        requiredItems: [template.stolen_item],
                        requiredCount: 1
                    };
                    break;
                }
                
                // Talk to victim first
                if (template.victim === npcId && !quest.interrogated.includes('_victim')) {
                    quest.interrogated.push('_victim');
                    // Use dynamic hint dialogue if culprit_hints exist
                    if (template.culprit_hints && quest.culprit && template.culprit_hints[quest.culprit]) {
                        questDialogue = template.culprit_hints[quest.culprit];
                    } else {
                        questDialogue = template.victim_dialogue;
                    }
                    // Update stepDesc with hint about culprit
                    const suspectCount = template.suspects.length;
                    let shortHint = `Interroger les ${suspectCount} suspects`;
                    if (template.culprit_hints && quest.culprit && template.culprit_hints[quest.culprit]) {
                        const fullHint = template.culprit_hints[quest.culprit];
                        const match = fullHint.match(/\.\.\.\s*(.+?)(?:\.\s*(?:Retrouve|C'est|Il faut))/);
                        if (match) {
                            shortHint = match[1].trim();
                        }
                    }
                    quest.stepDesc = shortHint.replace(/\*\*/g, '');
                    questUpdate = { questId: quest.id, interrogated: quest.interrogated };
                    break;
                }
                // Interrogate suspects (only after talking to victim)
                if (quest.interrogated.includes('_victim') && template.suspects.includes(npcId) && !quest.interrogated.includes(npcId)) {
                    quest.interrogated.push(npcId);
                    
                    if (npcId === quest.culprit) {
                        // Found the culprit! Give stolen item, need to return to victim
                        quest.accused = true;
                        questDialogue = template.culprit_dialogues[0];
                        itemGiven = template.stolen_item;
                        pState.inventory.push(template.stolen_item);
                        // Update stepDesc to return to victim
                        const victimData = SURVIE_CHARACTERS.find(n => n.id === template.victim);
                        const victimName = victimData ? victimData.name : template.victim;
                        quest.stepDesc = `Rapporter à ${victimName}`;
                        questUpdate = { questId: quest.id, interrogated: quest.interrogated, accused: true, itemGiven };
                    } else {
                        questDialogue = template.innocent_dialogues[Math.floor(Math.random() * template.innocent_dialogues.length)];
                        // Keep the original hint as stepDesc (don't replace with suspect count)
                        questUpdate = { questId: quest.id, interrogated: quest.interrogated };
                    }
                    break;
                }
            }
        }
        
        // Send response to player
        // Convert **word** to highlight spans in quest dialogues
        if (questDialogue) {
            questDialogue = questDialogue.replace(/\*\*(.+?)\*\*/g, '<span class="quest-highlight">$1</span>');
        }
        console.log(`📨 Résultat: questDialogue=${questDialogue ? 'OUI' : 'NON'}, update=${questUpdate ? questUpdate.questId : 'AUCUN'}, completed=${pState.completedCount}/${pState.quests.length}`);
        socket.emit('survie-interact-result', {
            npcId: npcId,
            questDialogue: questDialogue, // null if no quest match → client uses default dialogue
            questUpdate: questUpdate,
            itemGiven: itemGiven ? QUEST_ITEMS[itemGiven] : null,
            itemTaken: itemTaken,
            inventory: pState.inventory,
            completedCount: pState.completedCount,
            totalQuests: pState.quests.length,
            // Send full quest state for UI update
            questState: {
                quests: pState.quests.map(q => ({
                    ...q,
                    // Add totalSteps from template
                    totalSteps: q.totalSteps || (survie.quests.find(t => t.id === q.id)?.steps?.length) || 1,
                })),
            },
        });
        
        // Check if player completed ALL quests
        if (pState.completedCount >= pState.quests.length && !pState.finishedAt) {
            pState.finishedAt = Date.now();
            
            // Calculate rank
            const finishedPlayers = Object.values(survie.playerQuestStates)
                .filter(ps => ps.finishedAt)
                .sort((a, b) => a.finishedAt - b.finishedAt);
            const rank = finishedPlayers.length;
            pState.rank = rank;
            
            console.log(`🏆 ${player.username} a complété toutes les quêtes ! Rang: ${rank}`);
            
            // Broadcast to all players
            io.emit('survie-player-finished', {
                twitchId: twitchId,
                username: player.username,
                rank: rank,
            });
            
            // First player to finish = WINNER
            if (rank === 1) {
                console.log(`🥇 ${player.username} est le GAGNANT !`);
                
                // Find player's color
                const winnerPlayer = [...gameState.players.values()].find(pl => pl.twitchId === twitchId);
                const colorIndex = winnerPlayer ? winnerPlayer.colorIndex : 0;
                
                // Broadcast winner immediately
                io.emit('survie-winner', {
                    twitchId: twitchId,
                    username: player.username,
                    colorIndex: colorIndex,
                });
                
                // Start 60s countdown for podium
                setTimeout(() => {
                    if (!gameState.survie?.active) return;
                    
                    // Build final podium — all players sorted by completedCount then finishedAt
                    const allPlayers = Object.entries(survie.playerQuestStates)
                        .map(([tid, ps]) => {
                            const p = [...gameState.players.values()].find(pl => pl.twitchId === tid);
                            return {
                                twitchId: tid,
                                username: p ? p.username : tid,
                                completedCount: ps.completedCount || 0,
                                totalQuests: ps.quests.length,
                                finishedAt: ps.finishedAt || null,
                            };
                        })
                        .sort((a, b) => {
                            // Finished players first, sorted by finish time
                            if (a.finishedAt && !b.finishedAt) return -1;
                            if (!a.finishedAt && b.finishedAt) return 1;
                            if (a.finishedAt && b.finishedAt) return a.finishedAt - b.finishedAt;
                            // Then by completedCount descending
                            return b.completedCount - a.completedCount;
                        })
                        .map((p, idx) => ({ ...p, rank: idx + 1 }));
                    
                    io.emit('survie-game-over', {
                        winner: allPlayers[0],
                        podium: allPlayers.slice(0, 3),
                        totalFinished: allPlayers.filter(p => p.finishedAt).length,
                    });
                    console.log(`🏆 Partie terminée ! Podium:`, allPlayers.slice(0, 3).map(p => `${p.rank}. ${p.username} (${p.completedCount}/${p.totalQuests})`));
                }, 60000);
            }
        }
    });

    // ═══ GIVE ITEMS — Joueur confirme la remise d'items à un NPC ═══
    socket.on('survie-give-items', (data) => {
        if (!gameState.survie?.active) return;
        let player = gameState.players.get(socket.id);
        const twitchId = data.twitchId || (player ? player.twitchId : null);
        if (!twitchId) return;
        
        const survie = gameState.survie;
        const pState = survie.playerQuestStates[twitchId];
        if (!pState) return;
        
        const questId = data.questId;
        const givenItems = data.givenItems || [];
        const npcId = data.npcId;
        
        const quest = pState.quests.find(q => q.id === questId);
        if (!quest || quest.completed) return;
        
        const template = survie.quests.find(q => q.id === questId);
        if (!template) return;
        
        let questDialogue = null;
        let itemGiven = null;
        let itemsTaken = [];
        
        // ═══ DELIVER / TRADE steps ═══
        if (template.steps && quest.currentStep < template.steps.length) {
            const step = template.steps[quest.currentStep];
            
            if ((step.action === 'deliver' || step.action === 'trade') && step.npc === npcId) {
                if (givenItems.includes(step.item)) {
                    questDialogue = step.dialogue;
                    itemsTaken.push(step.item);
                    pState.inventory = pState.inventory.filter(i => i !== step.item);
                    if (step.giveItem) {
                        itemGiven = step.giveItem;
                        pState.inventory.push(step.giveItem);
                    }
                    quest.currentStep++;
                    quest.stepDesc = getStepDescription(template, quest.currentStep);
                    
                    if (quest.currentStep >= template.steps.length) {
                        quest.completed = true;
                        pState.completedCount++;
                    }
                }
            }
        }
        
        // ═══ COLLECT_ITEMS delivery ═══
        if (template.type === 'COLLECT_ITEMS' && !quest.completed && template.deliverTo === npcId) {
            // Remove all given items from inventory
            if (template.specialItems) {
                template.specialItems.forEach(si => {
                    if (givenItems.includes(si)) {
                        pState.inventory = pState.inventory.filter(i => i !== si);
                        itemsTaken.push(si);
                    }
                });
            } else {
                for (let i = 0; i < template.count; i++) {
                    const idx = pState.inventory.indexOf(template.item);
                    if (idx !== -1) {
                        pState.inventory.splice(idx, 1);
                        itemsTaken.push(template.item);
                    }
                }
            }
            quest.completed = true;
            quest.delivered = true;
            pState.completedCount++;
            questDialogue = template.finalDialogue;
            quest.stepDesc = 'Terminé !';
        }
        
        // ═══ MYSTERY return stolen item to victim ═══
        if (template.type === 'MYSTERY' && quest.accused && !quest.completed && template.victim === npcId) {
            if (givenItems.includes(template.stolen_item)) {
                pState.inventory = pState.inventory.filter(i => i !== template.stolen_item);
                itemsTaken.push(template.stolen_item);
                quest.completed = true;
                pState.completedCount++;
                quest.stepDesc = 'Terminé !';
                // Victim thank dialogue
                const itemData = QUEST_ITEMS[template.stolen_item];
                const itemName = itemData ? itemData.name : template.stolen_item;
                questDialogue = `Tu l'as retrouvé !! Mon ${itemName.toLowerCase()} ! Merci infiniment !!`;
            }
        }
        
        // Send result
        if (questDialogue) {
            questDialogue = questDialogue.replace(/\*\*(.+?)\*\*/g, '<span class="quest-highlight">$1</span>');
        }
        socket.emit('survie-give-result', {
            npcId,
            questId,
            questDialogue,
            itemGiven: itemGiven ? QUEST_ITEMS[itemGiven] : null,
            itemsTaken,
            completedCount: pState.completedCount,
            totalQuests: pState.quests.length,
            questState: {
                quests: pState.quests.map(q => ({
                    ...q,
                    stepDesc: q.stepDesc || ''
                })),
                pickedItems: pState.pickedItems,
                inventory: pState.inventory,
            }
        });
        
        // Check if player completed ALL quests (via give)
        if (pState.completedCount >= pState.quests.length && !pState.finishedAt) {
            pState.finishedAt = Date.now();
            
            const finishedPlayers = Object.values(survie.playerQuestStates)
                .filter(ps => ps.finishedAt)
                .sort((a, b) => a.finishedAt - b.finishedAt);
            const rank = finishedPlayers.length;
            pState.rank = rank;
            
            console.log(`🏆 ${player.username} a complété toutes les quêtes (give) ! Rang: ${rank}`);
            
            io.emit('survie-player-finished', {
                twitchId: twitchId,
                username: player.username,
                rank: rank,
            });
            
            if (rank === 1) {
                console.log(`🥇 ${player.username} est le GAGNANT !`);
                
                const winnerPlayer = [...gameState.players.values()].find(pl => pl.twitchId === twitchId);
                const colorIndex = winnerPlayer ? winnerPlayer.colorIndex : 0;
                
                io.emit('survie-winner', {
                    twitchId: twitchId,
                    username: player.username,
                    colorIndex: colorIndex,
                });
                
                setTimeout(() => {
                    if (!gameState.survie?.active) return;
                    const allPlayers = Object.entries(survie.playerQuestStates)
                        .map(([tid, ps]) => {
                            const p = [...gameState.players.values()].find(pl => pl.twitchId === tid);
                            return { twitchId: tid, username: p ? p.username : tid, completedCount: ps.completedCount || 0, totalQuests: ps.quests.length, finishedAt: ps.finishedAt || null };
                        })
                        .sort((a, b) => {
                            if (a.finishedAt && !b.finishedAt) return -1;
                            if (!a.finishedAt && b.finishedAt) return 1;
                            if (a.finishedAt && b.finishedAt) return a.finishedAt - b.finishedAt;
                            return b.completedCount - a.completedCount;
                        })
                        .map((p, idx) => ({ ...p, rank: idx + 1 }));
                    io.emit('survie-game-over', { winner: allPlayers[0], podium: allPlayers.slice(0, 3), totalFinished: allPlayers.filter(p => p.finishedAt).length });
                }, 60000);
            }
        }
    });

    // ═══ PICKUP ITEM — Joueur ramasse un item au sol ═══
    socket.on('survie-pickup', (data) => {
        if (!gameState.survie?.active) return;
        let player = gameState.players.get(socket.id);
        
        // Fallback: find player by twitchId if socket.id not mapped
        if (!player && data.twitchId) {
            for (const [sid, p] of gameState.players.entries()) {
                if (p.twitchId && p.twitchId === data.twitchId) {
                    player = p;
                    gameState.players.delete(sid);
                    player.socketId = socket.id;
                    gameState.players.set(socket.id, player);
                    console.log(`🔄 Socket remappé (pickup) pour ${player.username}: ${sid} → ${socket.id}`);
                    break;
                }
            }
        }
        if (!player) return;
        
        const survie = gameState.survie;
        const twitchId = player.twitchId;
        const groundItemId = data.groundItemId;
        
        let pState = survie.playerQuestStates?.[twitchId];
        if (!pState) return;
        
        // Check player hasn't already picked this item
        if (!pState.pickedItems) pState.pickedItems = [];
        if (pState.pickedItems.includes(groundItemId)) return;
        
        // Find the ground item
        const groundItem = survie.groundItems?.find(gi => gi.id === groundItemId);
        if (!groundItem) return;
        
        // Find matching quest
        const quest = pState.quests.find(q => q.id === groundItem.questId && !q.completed);
        if (!quest) return;
        
        // Mark as picked
        pState.pickedItems.push(groundItemId);
        
        // Update quest progress
        if (quest.type === 'COLLECT_ITEMS') {
            quest.collected = (quest.collected || 0) + 1;
            console.log(`📦 ${player.username} ramasse ${groundItem.name} (${quest.collected}/${quest.count}) pour quête ${quest.id}`);
            
            // Add to inventory
            const itemData = QUEST_ITEMS[groundItem.itemId];
            if (itemData) {
                pState.inventory.push(groundItem.itemId);
            }
            
            // Check if all collected — need to deliver now
            if (quest.collected >= quest.count) {
                const template = survie.quests.find(q => q.id === quest.id);
                if (template && template.deliverTo) {
                    const npcData = SURVIE_CHARACTERS.find(n => n.id === template.deliverTo);
                    const name = npcData ? npcData.name : template.deliverTo;
                    quest.stepDesc = `Aller voir ${name}`;
                }
                console.log(`📦 ${player.username} a collecté tous les items pour ${quest.id} → livraison !`);
            }
        }
        
        // Send result
        socket.emit('survie-pickup-result', {
            groundItemId: groundItemId,
            itemData: QUEST_ITEMS[groundItem.itemId] || null,
            questState: {
                quests: pState.quests.map(q => ({
                    ...q,
                    totalSteps: q.totalSteps || (survie.quests.find(t => t.id === q.id)?.steps?.length) || 1,
                })),
            },
        });
    });

    // ═══ BOOST PICKUP — Synchronisé entre joueurs ═══
    socket.on('survie-boost-pickup', (data) => {
        if (!gameState.survie?.active) return;
        const boostId = data.boostId;
        if (!boostId || !gameState.survie.boosts) return;
        
        // Mark as picked server-side
        const boost = gameState.survie.boosts.find(b => b.id === boostId);
        if (!boost || boost.picked) return;
        boost.picked = true;
        
        console.log(`⚡ Boost ${boostId} ramassé par ${data.twitchId}`);
        
        // Broadcast to ALL OTHER players (the picker already handled it locally)
        socket.broadcast.emit('survie-boost-picked', { boostId });
        
        // Respawn a new boost after 15-20s (max 20 active on map)
        const respawnDelay = 15000 + Math.random() * 5000;
        setTimeout(() => {
            if (!gameState.survie?.active) return;
            
            // Check max boosts
            const activeBoosts = gameState.survie.boosts.filter(b => !b.picked).length;
            if (activeBoosts >= 20) return;
            
            // Clean up old picked boosts
            gameState.survie.boosts = gameState.survie.boosts.filter(b => !b.picked);
            
            // Generate new position
            let bx, by, valid = false, attempts = 0;
            do {
                bx = 0.08 + Math.random() * 0.84;
                by = 0.08 + Math.random() * 0.84;
                const dxC = bx - 0.5;
                const dyC = by - 0.5;
                valid = Math.sqrt(dxC * dxC + dyC * dyC) > 0.12;
                // Avoid existing non-picked boosts
                for (const ob of gameState.survie.boosts) {
                    if (ob.picked) continue;
                    const dbx = bx - ob.x;
                    const dby = by - ob.y;
                    if (Math.sqrt(dbx * dbx + dby * dby) < 0.08) { valid = false; break; }
                }
                attempts++;
            } while (!valid && attempts < 100);
            
            const newBoost = { id: `boost_${Date.now()}_${Math.floor(Math.random() * 1000)}`, x: bx, y: by };
            gameState.survie.boosts.push(newBoost);
            
            console.log(`⚡ Nouveau boost spawné: ${newBoost.id} (${bx.toFixed(2)}, ${by.toFixed(2)})`);
            
            // Broadcast to ALL players
            io.emit('survie-boost-spawn', newBoost);
        }, respawnDelay);
    });

    // Déconnexion
    socket.on('disconnect', () => {
        const ip = socket.handshake.headers['x-forwarded-for']?.split(',')[0] || socket.handshake.address;
        const currentConnections = connectionsByIP.get(ip) || 1;
        if (currentConnections <= 1) {
            connectionsByIP.delete(ip);
        } else {
            connectionsByIP.set(ip, currentConnections - 1);
        }


        const player = gameState.players.get(socket.id);

        if (player) {
            const playerColor = playerColors[player.username];
            // 🔄 Délai avant d'afficher le log "disconnect" (évite le spam lors de changement d'onglet)
            player.pendingDisconnectLog = setTimeout(() => {
                addLog('disconnect', { username: player.username, playerColor });
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
                            console.log(`🗑️ ${player.username} supprimé du lobby (timeout 5s)`);
                            gameState.players.delete(socket.id);
                            gameState.answers.delete(socket.id);
                            broadcastLobbyUpdate();
                        }
                    }, 5000);
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
function updatePlayerCombo(socketId) {
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
function resetPlayerCombo(socketId) {
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
function usePlayerBonus(socketId, bonusType) {
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
function resetAllBonuses() {
    gameState.playerBonuses.clear();
    gameState.activeChallenges = [];
    gameState.playerChallenges.clear();
    console.log('🔄 Reset de tous les bonus et défis');
}


// FONCTION: Générer les données communes pour game-ended
async function generateGameEndedData() {
    const playersData = Array.from(gameState.players.values()).map(p => ({
        twitchId: p.twitchId,
        username: p.username,
        lives: p.lives,
        points: p.points || 0,
        correctAnswers: p.correctAnswers,
        isLastGlobalWinner: p.twitchId === lastGlobalWinner,
        team: p.team || null // 🆕 Inclure l'équipe pour mode Rivalité
    }));

    const topPlayers = await db.getTopPlayers(10);

    return { playersData, topPlayers };
}


// FONCTION: Reset complet de l'état du jeu
function resetGameState() {
    gameState.inProgress = false;
    gameState.currentGameId = null;
    gameState.currentQuestionIndex = 0;
    gameState.currentQuestion = null;
    gameState.showResults = false;
    gameState.lastQuestionResults = null;
    gameState.questionStartTime = null;
    gameState.gameStartTime = null;
    gameState.initialPlayerCount = 0; // 🆕 Reset du compteur initial
    gameState.players.clear();
    gameState.answers.clear();
    pendingJoins.clear(); // 🔓 Reset les réservations
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

    resetAllBonuses();

    // 🎮 Reset Survie
    if (gameState.survie.roundTimer) {
        clearTimeout(gameState.survie.roundTimer);
    }
    gameState.survie = {
        active: false, currentRound: 0, roundTimer: null, roundTimerEndTime: null,
        roundInProgress: false, alivePlayers: [], eliminatedPlayers: [],
        currentEpreuve: null, usedEpreuves: [], completedPlayers: [],
        qualifiedCount: 0, toEliminateCount: 0, timer: gameState.survie.timer || 30,
        npcs: []
    };

    // 🔥 COMMENTER CES LIGNES
    // gameState.isActive = false;
    // io.emit('game-deactivated');
    // console.log('🔒 Lobby fermé automatiquement après la fin de partie');

    // 🆕 Annuler le timeout auto mode si actif
    if (gameState.autoModeTimeout) {
        clearTimeout(gameState.autoModeTimeout);
        gameState.autoModeTimeout = null;
    }

    // 🆕 OPTIONNEL : Log pour savoir que le jeu reste ouvert
    console.log('✅ Partie terminée - Lobby reste ouvert pour la prochaine partie');
}




function updateLiveAnswerStats() {
    const answerCounts = {};

    gameState.liveAnswers.forEach((answerIndex) => {
        if (!answerCounts[answerIndex]) {
            answerCounts[answerIndex] = 0;
        }
        answerCounts[answerIndex]++;
    });

    io.emit('live-answer-stats', {
        answerCounts: answerCounts,
        answeredCount: gameState.liveAnswers.size,
        totalPlayers: gameState.players.size
    });
}

// 🆕 Version throttlée - appeler celle-ci à la place
function throttledUpdateLiveAnswerStats() {
    const now = Date.now();

    // Si assez de temps s'est écoulé, envoyer immédiatement
    if (now - lastStatsUpdate >= STATS_THROTTLE_MS) {
        lastStatsUpdate = now;
        updateLiveAnswerStats();
        pendingStatsUpdate = false;
    }
    // Sinon, programmer un envoi différé (si pas déjà programmé)
    else if (!pendingStatsUpdate) {
        pendingStatsUpdate = true;
        const delay = STATS_THROTTLE_MS - (now - lastStatsUpdate);

        setTimeout(() => {
            lastStatsUpdate = Date.now();
            updateLiveAnswerStats();
            pendingStatsUpdate = false;
        }, delay);
    }
}





function addLog(type, data) {
    const log = {
        id: Date.now() + Math.random(),
        type: type,
        data: data,
        timestamp: Date.now()
    };

    activityLogs.push(log);
    if (activityLogs.length > MAX_LOGS) {
        activityLogs.shift();
    }

    io.emit('activity-log', log);
}

function resetLogs() {
    activityLogs = [];
    playerColors = {};
    io.emit('logs-reset');
}

function assignPlayerColor(username) {
    if (!playerColors[username]) {
        const usedColors = Object.values(playerColors);
        const availableColors = PLAYER_COLORS.filter(c => !usedColors.includes(c));
        playerColors[username] = availableColors.length > 0
            ? availableColors[0]
            : PLAYER_COLORS[Object.keys(playerColors).length % PLAYER_COLORS.length];
    }
    return playerColors[username];
}


async function loadLastGlobalWinner() {
    try {
        const recentGames = await db.getRecentGames(10);
        if (recentGames && recentGames.length > 0) {
            const lastWonGame = recentGames.find(game => game.winner_twitch_id !== null);
            if (lastWonGame) {
                lastGlobalWinner = lastWonGame.winner_twitch_id;
                console.log(`👑 Dernier vainqueur chargé: ${lastGlobalWinner}`);
            }
        }
    } catch (error) {
        console.error('❌ Erreur chargement dernier vainqueur:', error);
    }
}



// ============================================
// 🎮 MODE SURVIE - Fonctions
// ============================================

function calculateSurvieEliminations(aliveCount) {
    if (aliveCount <= 3) return 1;
    if (aliveCount <= 6) return 2;
    if (aliveCount <= 10) return 3;
    if (aliveCount <= 15) return 4;
    if (aliveCount <= 20) return 5;
    if (aliveCount <= 30) return Math.ceil(aliveCount * 0.25);
    return Math.ceil(aliveCount * 0.2);
}

function getSurvieEpreuveInstruction(type) {
    const instructions = {
        'vrai-faux': 'Vrai ou Faux — Répondez le plus vite possible',
        'intrus': 'Trouvez l\'intrus dans chaque ligne',
        'anagramme': 'Retrouvez le nom mélangé',
        'nomme': 'Tapez le nom des personnages',
        'flou': 'Devinez le personnage flou',
        'pendu': 'Trouvez le mot caché',
        'qui-suis-je': 'Devinez le personnage à partir des indices',
        'tri-anime': 'Cliquez sur tous les personnages de l\'anime indiqué',
        'reflexe': 'Cliquez sur les personnages dans l\'ordre indiqué',
        'paires': 'Retrouvez les paires de personnages',
        'association': 'Associez les armes aux personnages',
        'comptage': 'Comptez les personnages selon le critère',
        'timeline': 'Remettez les scènes dans l\'ordre',
        'chronologie': 'Classez les animes par date de parution',
        'duel-final': '⚔️ DUEL FINAL — Le plus rapide remporte la victoire!'
    };
    return instructions[type] || 'Complétez l\'épreuve le plus vite possible';
}

function generateSurvieEpreuveData(type) {
    // Placeholder pour le Bloc 1 — sera remplacé par les vrais mini-jeux
    return {
        type: type,
        placeholder: true,
        instruction: getSurvieEpreuveInstruction(type)
    };
}

async function startSurvieGame() {
    const totalPlayers = gameState.players.size;
    
    if (totalPlayers < SURVIE_CONFIG.MIN_PLAYERS) {
        return { success: false, error: `Minimum ${SURVIE_CONFIG.MIN_PLAYERS} joueurs requis` };
    }
    
    // Initialiser l'état
    const survie = gameState.survie;
    survie.active = true;
    survie.currentRound = 0;
    survie.roundInProgress = false;
    survie.alivePlayers = [];
    survie.eliminatedPlayers = [];
    survie.usedEpreuves = [];
    survie.completedPlayers = [];
    
    // Collecter les joueurs
    let colorIdx = 0;
    gameState.players.forEach((player, socketId) => {
        survie.alivePlayers.push({
            twitchId: player.twitchId,
            username: player.username,
            socketId: socketId,
            avatarUrl: player.avatarUrl || null,
            colorIndex: colorIdx++
        });
    });
    
    gameState.inProgress = true;
    
    // Générer des positions aléatoires pour les NPCs (différentes à chaque partie)
    // Zone d'exclusion autour du centre (spawn joueurs)
    const SPAWN_CENTER_X = 0.5;
    const SPAWN_CENTER_Y = 0.5;
    const EXCLUSION_RADIUS = 0.12; // Zone spawn joueurs (personnages)
    const STRUCT_EXCLUSION_RADIUS = 0.22; // Zone spawn joueurs (structures — plus large car elles sont grandes)
    
    // Distances en pixels (MAP = 10000x7000)
    const MAP_W = 38000;
    const MAP_H = 24000;
    const CHAR_MIN_PX = 1500; // distance min entre personnages en pixels
    const STRUCT_CHAR_PX = 2500; // distance min entre structure et personnage en pixels
    const STRUCT_STRUCT_PX = 4000; // distance min entre structures en pixels
    
    const placedAll = [];
    
    // Helper: distance en pixels entre deux positions normalisées
    function pixelDist(x1, y1, x2, y2) {
        const dx = (x1 - x2) * MAP_W;
        const dy = (y1 - y2) * MAP_H;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // 1. Placer les structures d'abord
    SURVIE_STRUCTURES.forEach(npc => {
        let x, y, valid, attempts = 0;
        do {
            x = 0.05 + Math.random() * 0.90;
            y = 0.05 + Math.random() * 0.90;
            const dxC = x - SPAWN_CENTER_X;
            const dyC = y - SPAWN_CENTER_Y;
            const distCenter = Math.sqrt(dxC * dxC + dyC * dyC);
            let tooClose = false;
            for (const placed of placedAll) {
                if (pixelDist(x, y, placed.x, placed.y) < STRUCT_STRUCT_PX) {
                    tooClose = true;
                    break;
                }
            }
            valid = distCenter > STRUCT_EXCLUSION_RADIUS && !tooClose;
            attempts++;
        } while (!valid && attempts < 500);
        if (!valid) console.warn(`⚠️ Structure ${npc.id} placée après ${attempts} tentatives (peut être trop proche)`);
        placedAll.push({ ...npc, x, y, isStructure: true });
    });
    
    // 2. Placer les personnages (éloignés des structures ET entre eux)
    SURVIE_CHARACTERS.forEach(npc => {
        let x, y, valid, attempts = 0;
        do {
            x = 0.05 + Math.random() * 0.90;
            y = 0.05 + Math.random() * 0.90;
            const dxC = x - SPAWN_CENTER_X;
            const dyC = y - SPAWN_CENTER_Y;
            const distCenter = Math.sqrt(dxC * dxC + dyC * dyC);
            let tooClose = false;
            for (const placed of placedAll) {
                const minPx = placed.isStructure ? STRUCT_CHAR_PX : CHAR_MIN_PX;
                if (pixelDist(x, y, placed.x, placed.y) < minPx) {
                    tooClose = true;
                    break;
                }
            }
            valid = distCenter > EXCLUSION_RADIUS && !tooClose;
            attempts++;
        } while (!valid && attempts < 500);
        if (!valid) console.warn(`⚠️ Perso ${npc.id} placé après ${attempts} tentatives (peut être trop proche)`);
        placedAll.push({ ...npc, x, y });
    });
    
    survie.npcs = placedAll;
    
    // ═══ Générer les quêtes ═══
    const questData = generateQuestsForGame(5);
    survie.quests = questData.quests;
    survie.playerQuestStates = {};
    
    // Créer le state de quête pour chaque joueur
    survie.alivePlayers.forEach(p => {
        survie.playerQuestStates[p.twitchId] = createPlayerQuestState(questData.quests);
    });
    
    console.log(`🎮 Survie démarrée: ${totalPlayers} joueurs, ${survie.npcs.length} NPCs, ${questData.quests.length} quêtes`);
    console.log(`📋 Quêtes: ${questData.quests.map(q => q.id).join(', ')}`);
    
    // ═══ Générer les items au sol pour les quêtes COLLECT_ITEMS ═══
    survie.groundItems = [];
    const MAP_W_ITEMS = 32000;
    const MAP_H_ITEMS = 20000;
    
    questData.quests.forEach(quest => {
        if (quest.type !== 'COLLECT_ITEMS') return;
        
        const itemIds = quest.specialItems || [];
        const count = quest.count || 0;
        
        for (let i = 0; i < count; i++) {
            // Determine which item sprite to use
            let itemId;
            if (itemIds.length > 0 && i < itemIds.length) {
                itemId = itemIds[i]; // Special items (dragon balls 1-7)
            } else {
                itemId = quest.item; // Same item repeated (bento, berries)
            }
            
            const itemData = QUEST_ITEMS[itemId];
            if (!itemData) continue;
            
            // Place item randomly, away from center spawn AND away from NPCs/structures
            let ix, iy, valid, attempts = 0;
            do {
                ix = 0.08 + Math.random() * 0.84;
                iy = 0.08 + Math.random() * 0.84;
                const dxC = ix - 0.5;
                const dyC = iy - 0.5;
                const distCenter = Math.sqrt(dxC * dxC + dyC * dyC);
                valid = distCenter > 0.1;
                
                // If spawnNearStructures, place near a random structure
                if (quest.spawnNearStructures && placedAll.length > 0) {
                    const structures = placedAll.filter(n => n.isStructure);
                    if (structures.length > 0) {
                        const struct = structures[Math.floor(Math.random() * structures.length)];
                        ix = struct.x + (Math.random() - 0.5) * 0.08;
                        iy = struct.y + (Math.random() - 0.5) * 0.08;
                        ix = Math.max(0.05, Math.min(0.95, ix));
                        iy = Math.max(0.05, Math.min(0.95, iy));
                        valid = true;
                    }
                }
                
                // Check distance from all NPCs and structures
                if (valid) {
                    for (const npc of placedAll) {
                        const dnx = ix - npc.x;
                        const dny = iy - npc.y;
                        const minDist = npc.isStructure ? 0.035 : 0.02;
                        if (Math.sqrt(dnx * dnx + dny * dny) < minDist) {
                            valid = false;
                            break;
                        }
                    }
                }
                
                attempts++;
            } while (!valid && attempts < 100);
            
            survie.groundItems.push({
                id: `${quest.id}_item_${i}`,
                questId: quest.id,
                itemId: itemId,
                name: itemData.name,
                imageUrl: itemData.imageUrl,
                x: ix,
                y: iy,
                size: 100,
            });
        }
    });
    
    console.log(`📦 ${survie.groundItems.length} items au sol générés`);
    
    // ═══ Générer les boosts de vitesse ═══
    survie.boosts = [];
    const BOOST_COUNT = 20;
    for (let i = 0; i < BOOST_COUNT; i++) {
        let bx, by, valid = false, attempts = 0;
        do {
            bx = 0.08 + Math.random() * 0.84;
            by = 0.08 + Math.random() * 0.84;
            // Avoid center spawn area
            const dxC = bx - 0.5;
            const dyC = by - 0.5;
            valid = Math.sqrt(dxC * dxC + dyC * dyC) > 0.12;
            // Avoid being too close to other boosts
            for (const ob of survie.boosts) {
                const dbx = bx - ob.x;
                const dby = by - ob.y;
                if (Math.sqrt(dbx * dbx + dby * dby) < 0.08) { valid = false; break; }
            }
            attempts++;
        } while (!valid && attempts < 100);
        
        survie.boosts.push({ id: `boost_${i}`, x: bx, y: by });
    }
    console.log(`⚡ ${survie.boosts.length} boosts générés`);
    
    // Préparer les données de quêtes pour le client (sans spoiler les réponses)
    const clientQuests = questData.quests.map(q => ({
        id: q.id,
        type: q.type,
        desc: q.desc,
        totalSteps: q.steps ? q.steps.length : (q.type === 'REUNION' ? q.count : (q.type === 'COLLECT_ITEMS' ? q.count + 1 : (q.type === 'RIDDLE' ? 1 : 2))),
        ...(q.type === 'REUNION' && { count: q.count, group: q.group }),
        ...(q.type === 'COLLECT_ITEMS' && { count: q.count }),
        ...(q.type === 'RIDDLE' && { riddle: q.riddle }),
        ...(q.type === 'MYSTERY' && { victim: q.victim, suspects: q.suspects }),
    }));
    
    // Envoyer à tous
    io.emit('survie-game-started', {
        totalPlayers: totalPlayers,
        players: survie.alivePlayers.map(p => ({
            twitchId: p.twitchId,
            username: p.username,
            avatarUrl: p.avatarUrl,
            colorIndex: p.colorIndex
        })),
        timer: survie.timer,
        npcs: survie.npcs,
        quests: clientQuests,
        groundItems: survie.groundItems,
        boosts: survie.boosts || [],
        questItems: QUEST_ITEMS,
        playerQuestStates: Object.fromEntries(
            Object.entries(survie.playerQuestStates).map(([tid, pqs]) => [tid, { quests: pqs.quests, pickedItems: pqs.pickedItems || [], inventory: pqs.inventory || [] }])
        ),
    });
    
    // Rounds/épreuves désactivés pour le moment — juste le plateau
    // setTimeout(() => {
    //     startSurvieNextRound();
    // }, 3000);
    
    return { success: true };
}

function startSurvieNextRound() {
    const survie = gameState.survie;
    if (!survie || !survie.active) return;
    
    const aliveCount = survie.alivePlayers.length;
    
    // 1v1 final
    if (aliveCount === 2) {
        startSurvieFinalDuel();
        return;
    }
    
    // Winner direct
    if (aliveCount <= 1) {
        endSurvieGame();
        return;
    }
    
    survie.currentRound++;
    survie.roundInProgress = true;
    survie.completedPlayers = [];
    
    // Calcul éliminations
    survie.toEliminateCount = calculateSurvieEliminations(aliveCount);
    survie.qualifiedCount = aliveCount - survie.toEliminateCount;
    
    // Choisir une épreuve aléatoire
    let available = SURVIE_EPREUVE_TYPES.filter(t => !survie.usedEpreuves.includes(t));
    if (available.length === 0) {
        survie.usedEpreuves = [];
        available = [...SURVIE_EPREUVE_TYPES];
    }
    const epreuveType = available[Math.floor(Math.random() * available.length)];
    survie.usedEpreuves.push(epreuveType);
    
    const epreuveData = generateSurvieEpreuveData(epreuveType);
    survie.currentEpreuve = { type: epreuveType, data: epreuveData };
    
    console.log(`🎮 Survie Manche ${survie.currentRound}: ${epreuveType} | ${aliveCount} joueurs | éliminés: ${survie.toEliminateCount} | qualifiés: ${survie.qualifiedCount}`);
    
    // Timer
    const timerMs = survie.timer * 1000;
    survie.roundTimerEndTime = Date.now() + timerMs;
    
    survie.roundTimer = setTimeout(() => {
        endSurvieRound();
    }, timerMs);
    
    // Broadcast
    io.emit('survie-round-start', {
        round: survie.currentRound,
        epreuveType: epreuveType,
        epreuveData: epreuveData,
        timer: survie.timer,
        aliveCount: aliveCount,
        qualifiedCount: survie.qualifiedCount,
        toEliminateCount: survie.toEliminateCount,
        alivePlayers: survie.alivePlayers.map(p => ({
            twitchId: p.twitchId, username: p.username, avatarUrl: p.avatarUrl, colorIndex: p.colorIndex
        }))
    });
    
    addLog('survie-round', { round: survie.currentRound, epreuve: epreuveType, alive: aliveCount });
}

function surviePlayerCompleted(socketId, twitchId) {
    const survie = gameState.survie;
    if (!survie || !survie.active || !survie.roundInProgress) return;
    
    // Vérifier joueur en vie
    const isAlive = survie.alivePlayers.some(p => p.twitchId === twitchId);
    if (!isAlive) return;
    
    // Vérifier pas déjà complété
    if (survie.completedPlayers.some(p => p.twitchId === twitchId)) return;
    
    const player = survie.alivePlayers.find(p => p.twitchId === twitchId);
    survie.completedPlayers.push({
        twitchId: twitchId,
        username: player?.username || 'Unknown',
        completionTime: Date.now()
    });
    
    const completedCount = survie.completedPlayers.length;
    console.log(`✅ Survie: ${player?.username} terminé (${completedCount}/${survie.qualifiedCount})`);
    
    // Broadcast le compteur en live
    io.emit('survie-qualified-update', {
        completedCount: completedCount,
        qualifiedCount: survie.qualifiedCount,
        playerTwitchId: twitchId,
        playerUsername: player?.username
    });
    
    // Quota atteint → STOP NET
    if (completedCount >= survie.qualifiedCount) {
        console.log(`🛑 Survie: Quota atteint! ${completedCount}/${survie.qualifiedCount} → Manche terminée!`);
        endSurvieRound();
    }
}

function endSurvieRound() {
    const survie = gameState.survie;
    if (!survie || !survie.active || !survie.roundInProgress) return;
    
    survie.roundInProgress = false;
    
    if (survie.roundTimer) {
        clearTimeout(survie.roundTimer);
        survie.roundTimer = null;
    }
    
    // Qualifiés = ceux qui ont complété dans le quota
    const qualifiedIds = new Set(
        survie.completedPlayers.slice(0, survie.qualifiedCount).map(p => p.twitchId)
    );
    
    const eliminated = [];
    const qualified = [];
    
    survie.alivePlayers.forEach(player => {
        if (qualifiedIds.has(player.twitchId)) {
            qualified.push(player);
        } else {
            eliminated.push(player);
        }
    });
    
    // Positions des éliminés
    const currentPos = survie.alivePlayers.length;
    eliminated.forEach((player, idx) => {
        survie.eliminatedPlayers.push({
            twitchId: player.twitchId,
            username: player.username,
            eliminatedRound: survie.currentRound,
            position: currentPos - idx
        });
    });
    
    survie.alivePlayers = qualified;
    
    console.log(`🎮 Survie Manche ${survie.currentRound}: ${qualified.length} qualifiés, ${eliminated.length} éliminés`);
    
    io.emit('survie-round-results', {
        round: survie.currentRound,
        qualified: qualified.map(p => ({ twitchId: p.twitchId, username: p.username, avatarUrl: p.avatarUrl })),
        eliminated: eliminated.map(p => ({ twitchId: p.twitchId, username: p.username, avatarUrl: p.avatarUrl })),
        remainingCount: qualified.length,
        completionOrder: survie.completedPlayers.map(p => ({ twitchId: p.twitchId, username: p.username }))
    });
    
    addLog('survie-elim', { round: survie.currentRound, eliminated: eliminated.map(p => p.username), remaining: qualified.length });
    
    // Si 1 ou 0 restant → fin
    if (qualified.length <= 1) {
        setTimeout(() => endSurvieGame(), 4000);
    }
}

function startSurvieFinalDuel() {
    const survie = gameState.survie;
    if (!survie || !survie.active) return;
    
    survie.currentRound++;
    survie.roundInProgress = true;
    survie.completedPlayers = [];
    survie.qualifiedCount = 1;
    survie.toEliminateCount = 1;
    
    const epreuveType = 'duel-final';
    const epreuveData = generateSurvieEpreuveData(epreuveType);
    survie.currentEpreuve = { type: epreuveType, data: epreuveData };
    
    const timerMs = survie.timer * 1000;
    survie.roundTimerEndTime = Date.now() + timerMs;
    survie.roundTimer = setTimeout(() => endSurvieRound(), timerMs);
    
    console.log(`⚔️ Survie DUEL FINAL: ${survie.alivePlayers.map(p => p.username).join(' vs ')}`);
    
    io.emit('survie-duel-start', {
        round: survie.currentRound,
        players: survie.alivePlayers.map(p => ({
            twitchId: p.twitchId, username: p.username, avatarUrl: p.avatarUrl
        })),
        epreuveType: epreuveType,
        epreuveData: epreuveData,
        timer: survie.timer
    });
}

function endSurvieGame() {
    const survie = gameState.survie;
    if (!survie) return;
    
    if (survie.roundTimer) {
        clearTimeout(survie.roundTimer);
        survie.roundTimer = null;
    }
    
    const winner = survie.alivePlayers.length > 0 ? survie.alivePlayers[0] : null;
    
    console.log(`🏆 Survie terminée! Winner: ${winner?.username || 'Aucun'} | ${survie.currentRound} manches`);
    
    io.emit('survie-game-ended', {
        winner: winner ? {
            twitchId: winner.twitchId, username: winner.username, avatarUrl: winner.avatarUrl
        } : null,
        totalRounds: survie.currentRound,
        eliminatedPlayers: survie.eliminatedPlayers
    });
    
    // Keep active=true so players can still move on the board
    // Lobby closing (game-deactivated) will fully reset everything
    survie.roundInProgress = false;
    addLog('survie-end', { winner: winner?.username, rounds: survie.currentRound });
}

function getSurvieStateForClient(socketId, twitchIdHint) {
    const survie = gameState.survie;
    if (!survie || !survie.active) return null;
    
    // Get player's quest state if available
    let playerQuestState = null;
    let clientQuests = [];
    
    // Find player twitchId by socketId or use hint
    let playerTwitchId = twitchIdHint || null;
    if (!playerTwitchId && socketId) {
        const player = gameState.players.get(socketId);
        if (player) playerTwitchId = player.twitchId;
    }
    
    console.log(`📋 getSurvieState: twitchId=${playerTwitchId}, hasQuestStates=${!!survie.playerQuestStates}, keys=${Object.keys(survie.playerQuestStates || {}).join(',')}`);
    
    if (survie.quests) {
        clientQuests = survie.quests.map(q => ({
            id: q.id,
            type: q.type,
            desc: q.desc,
            totalSteps: q.steps ? q.steps.length : (q.type === 'REUNION' ? q.count : (q.type === 'COLLECT_ITEMS' ? q.count + 1 : (q.type === 'RIDDLE' ? 1 : 2))),
            ...(q.type === 'REUNION' && { count: q.count, group: q.group }),
            ...(q.type === 'COLLECT_ITEMS' && { count: q.count }),
            ...(q.type === 'RIDDLE' && { riddle: q.riddle }),
            ...(q.type === 'MYSTERY' && { victim: q.victim, suspects: q.suspects }),
        }));
    }
    
    if (playerTwitchId && survie.playerQuestStates?.[playerTwitchId]) {
        const pqs = survie.playerQuestStates[playerTwitchId];
        console.log(`✅ Quest state trouvé pour ${playerTwitchId}: ${pqs.quests.length} quêtes, completed=${pqs.quests.filter(q=>q.completed).length}`);
        playerQuestState = {
            quests: pqs.quests,
            pickedItems: pqs.pickedItems || [],
            inventory: pqs.inventory || [],
        };
    } else {
        console.log(`❌ Pas de quest state pour twitchId=${playerTwitchId}`);
    }
    
    return {
        active: true,
        currentRound: survie.currentRound,
        roundInProgress: survie.roundInProgress,
        currentEpreuve: survie.currentEpreuve,
        timer: survie.timer,
        alivePlayers: survie.alivePlayers.map(p => ({
            twitchId: p.twitchId, username: p.username, avatarUrl: p.avatarUrl, colorIndex: p.colorIndex,
            posX: p.posX, posY: p.posY
        })),
        eliminatedPlayers: survie.eliminatedPlayers,
        completedCount: survie.completedPlayers.length,
        qualifiedCount: survie.qualifiedCount,
        toEliminateCount: survie.toEliminateCount,
        timeRemaining: survie.roundTimerEndTime 
            ? Math.max(0, Math.ceil((survie.roundTimerEndTime - Date.now()) / 1000))
            : survie.timer,
        npcs: survie.npcs || SURVIE_NPCS,
        quests: clientQuests,
        playerQuestState: playerQuestState,
        groundItems: survie.groundItems || [],
        boosts: survie.boosts || [],
        questItems: QUEST_ITEMS,
    };
}


// ============================================
// Gestion des erreurs
// ============================================


setInterval(() => {
    // Timeout uniquement pour l'admin NORMAL (pas les masters)
    if (activeAdminSession && Date.now() - lastAdminActivity > ADMIN_TIMEOUT_MS) {
        console.log('⏰ Timeout admin normal (10min) - Libération du slot');
        activeAdminSession = null;
        activeAdminLoginTime = null;
    }
}, 30000);


process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled rejection:', error);
});


process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error);
    process.exit(1);
});