// ════════════════════════════════════════════════════════════════
// 🎖️ LE CATALOGUE DES TITRES — préfixe + suffixe
// ════════════════════════════════════════════════════════════════
//
// ⚠️ Lu des DEUX COTES, comme `niveaux.js` : le navigateur le charge en
// `<script>` avant app.js, le serveur le `require` pour le panneau /admin.
// Ni `import` ni `export` — la balise n est pas un module.
//
// ════════════════════════════════════════════════════════════════
// UN TITRE N EST PAS UN RANG
// ════════════════════════════════════════════════════════════════
// Le RANG (Novice, Apprenti, Combattant, Vétéran, Maître, Légende) se DEDUIT
// du niveau, personne ne le donne, et il s affiche en permanence. Il vit dans
// `niveaux.js`.
//
// Le TITRE se COMPOSE : un préfixe et un suffixe, « Shinigami des ombres ».
// Il ne se déduit de rien — on le gagne, on l achète, ou l hôte le donne — et
// un joueur n en a aucun par défaut. C est le systeme de la v1, repris tel
// quel parce que c est celui que les joueurs connaissent.
//
// ⚠️ CINQ TITRES DE LA V1 ONT ETE RETIRES : Novice, Soldat, Guerrier,
// Commandant et General. Ils formaient l echelle « parties jouées » de la v1,
// c est-a-dire exactement ce que les RANGS font maintenant. Les garder aurait
// donne deux echelles militaires cote a cote — « Soldat » affiche sous
// « VÉTÉRAN » — et personne n aurait su laquelle compte.
// « Capitaine » survit seul : c est le seul des six qui tienne debout sans
// l echelle (un capitaine de Bleach, un capitaine corsaire), et il portait une
// faute en base — « Capitale ».
//
// ⚠️ Quatre autres fautes corrigees au passage, toutes des accents manquants
// de la v1 : Etudiant, Fantome, Garcon, Demon. Un titre s affiche sur l ecran
// d un streamer devant son audience.
//
// ════════════════════════════════════════════════════════════════
// LES SOURCES
// ════════════════════════════════════════════════════════════════
//   'gagne'    — se gagne en jouant. ⚠️ AUCUNE CONDITION N EST ENCORE
//                BRANCHEE : aujourd hui ils se donnent a la main depuis
//                /admin, comme les autres. Le champ existe pour que le jour
//                ou l on branche les conditions, on sache lesquels sont
//                censes s obtenir tout seuls.
//   'boutique' — s achetera en rubis. ⚠️ `prix: null` partout : la boutique
//                est VIDE pour l instant, les prix de la v1 (100 a 55 000)
//                ne tiennent plus face au nouveau bareme et seront refaits.
//                Un prix `null` veut dire « pas encore en vente », jamais
//                « gratuit » — c est ce que le panneau et la boutique doivent
//                tester.
//
// ⚠️ L `id` est ce qui est STOCKE en base, pas le nom. Il ne change jamais :
// corriger un nom (comme « Capitale ») doit pouvoir se faire sans que les
// joueurs perdent leur titre. D ou des identifiants sans accent ni espace.

const TITRES_CATALOGUE = [
    // ── Préfixes, a gagner ────────────────────────────────────────
    { id: 'capitaine',    nom: 'Capitaine',     type: 'prefixe', source: 'gagne', prix: null },
    { id: 'shinigami',    nom: 'Shinigami',     type: 'prefixe', source: 'gagne', prix: null },
    { id: 'ninja',        nom: 'Ninja',         type: 'prefixe', source: 'gagne', prix: null },
    { id: 'exorciste',    nom: 'Exorciste',     type: 'prefixe', source: 'gagne', prix: null },
    { id: 'chasseur',     nom: 'Chasseur',      type: 'prefixe', source: 'gagne', prix: null },
    { id: 'pirate',       nom: 'Pirate',        type: 'prefixe', source: 'gagne', prix: null },
    { id: 'chevalier',    nom: 'Chevalier',     type: 'prefixe', source: 'gagne', prix: null },
    { id: 'vagabond',     nom: 'Vagabond',      type: 'prefixe', source: 'gagne', prix: null },
    { id: 'mage',         nom: 'Mage',          type: 'prefixe', source: 'gagne', prix: null },
    { id: 'ronin',        nom: 'Ronin',         type: 'prefixe', source: 'gagne', prix: null },
    { id: 'ghoule',       nom: 'Ghoule',        type: 'prefixe', source: 'gagne', prix: null },
    { id: 'samurai',      nom: 'Samurai',       type: 'prefixe', source: 'gagne', prix: null },
    { id: 'saiyan',       nom: 'Saiyan',        type: 'prefixe', source: 'gagne', prix: null },
    { id: 'alchimiste',   nom: 'Alchimiste',    type: 'prefixe', source: 'gagne', prix: null },
    { id: 'gardien',      nom: 'Gardien',       type: 'prefixe', source: 'gagne', prix: null },
    { id: 'hollow',       nom: 'Hollow',        type: 'prefixe', source: 'gagne', prix: null },

    // ── Préfixes, en boutique ─────────────────────────────────────
    { id: 'idiot',        nom: 'Idiot',         type: 'prefixe', source: 'boutique', prix: null },
    { id: 'singe',        nom: 'Singe',         type: 'prefixe', source: 'boutique', prix: null },
    { id: 'etudiant',     nom: 'Étudiant',      type: 'prefixe', source: 'boutique', prix: null },
    { id: 'requin',       nom: 'Requin',        type: 'prefixe', source: 'boutique', prix: null },
    { id: 'paisible',     nom: 'Paisible',      type: 'prefixe', source: 'boutique', prix: null },
    { id: 'deux',         nom: 'Deux',          type: 'prefixe', source: 'boutique', prix: null },
    { id: 'garcon',       nom: 'Garçon',        type: 'prefixe', source: 'boutique', prix: null },
    { id: 'fille',        nom: 'Fille',         type: 'prefixe', source: 'boutique', prix: null },
    { id: 'flingue',      nom: 'Flingue',       type: 'prefixe', source: 'boutique', prix: null },
    { id: 'expert',       nom: 'Expert',        type: 'prefixe', source: 'boutique', prix: null },
    { id: 'renegat',      nom: 'Renégat',       type: 'prefixe', source: 'boutique', prix: null },
    { id: 'fantome',      nom: 'Fantôme',       type: 'prefixe', source: 'boutique', prix: null },
    { id: 'ami',          nom: 'Ami',           type: 'prefixe', source: 'boutique', prix: null },
    { id: 'espace',       nom: 'Espace',        type: 'prefixe', source: 'boutique', prix: null },
    { id: 'clan',         nom: 'Clan',          type: 'prefixe', source: 'boutique', prix: null },
    { id: 'sensei',       nom: 'Sensei',        type: 'prefixe', source: 'boutique', prix: null },
    { id: 'sauveur',      nom: 'Sauveur',       type: 'prefixe', source: 'boutique', prix: null },
    { id: 'purificateur', nom: 'Purificateur',  type: 'prefixe', source: 'boutique', prix: null },
    { id: 'symbole',      nom: 'Symbole',       type: 'prefixe', source: 'boutique', prix: null },
    { id: 'demon',        nom: 'Démon',         type: 'prefixe', source: 'boutique', prix: null },
    { id: 'ultime_p',     nom: 'Ultime',        type: 'prefixe', source: 'boutique', prix: null },
    { id: 'genie',        nom: 'Génie',         type: 'prefixe', source: 'boutique', prix: null },
    { id: 'etoile',       nom: 'Étoile',        type: 'prefixe', source: 'boutique', prix: null },
    { id: 'magicien',     nom: 'Magicien',      type: 'prefixe', source: 'boutique', prix: null },
    { id: 'empereur',     nom: 'Empereur',      type: 'prefixe', source: 'boutique', prix: null },
    { id: 'leplusgrand',  nom: 'Le plus grand', type: 'prefixe', source: 'boutique', prix: null },
    { id: 'heros',        nom: 'Héros',         type: 'prefixe', source: 'boutique', prix: null },
    { id: 'ange',         nom: 'Ange',          type: 'prefixe', source: 'boutique', prix: null },

    // ── Suffixes, a gagner ────────────────────────────────────────
    { id: 'courageux',    nom: 'courageux',     type: 'suffixe', source: 'gagne', prix: null },
    { id: 'desombres',    nom: 'des ombres',    type: 'suffixe', source: 'gagne', prix: null },
    { id: 'intrepide',    nom: 'intrépide',     type: 'suffixe', source: 'gagne', prix: null },
    { id: 'legendaire',   nom: 'légendaire',    type: 'suffixe', source: 'gagne', prix: null },
    { id: 'duchaos',      nom: 'du chaos',      type: 'suffixe', source: 'gagne', prix: null },
    { id: 'eternel',      nom: 'éternel',       type: 'suffixe', source: 'gagne', prix: null },
    { id: 'solitaire',    nom: 'solitaire',     type: 'suffixe', source: 'gagne', prix: null },
    { id: 'delaube',      nom: "de l'aube",     type: 'suffixe', source: 'gagne', prix: null },

    // ── Suffixes, en boutique ─────────────────────────────────────
    // ⚠️ Trois d entre eux portent le meme nom qu un prefixe (paisible,
    // renégat, ultime) : ce ne sont PAS des doublons, ils occupent deux
    // emplacements differents — « Paisible ultime » se compose des deux. D ou
    // les identifiants suffixes `_p` / `_s`, qui ne doivent pas se confondre.
    { id: 'cool',         nom: 'cool',          type: 'suffixe', source: 'boutique', prix: null },
    { id: 'delaplebe',    nom: 'de la plèbe',   type: 'suffixe', source: 'boutique', prix: null },
    { id: 'triste',       nom: 'triste',        type: 'suffixe', source: 'boutique', prix: null },
    { id: 'paisible_s',   nom: 'paisible',      type: 'suffixe', source: 'boutique', prix: null },
    { id: 'constant',     nom: 'constant',      type: 'suffixe', source: 'boutique', prix: null },
    { id: 'capillaire',   nom: 'capillaire',    type: 'suffixe', source: 'boutique', prix: null },
    { id: 'bipolaire',    nom: 'bipolaire',     type: 'suffixe', source: 'boutique', prix: null },
    { id: 'riche',        nom: 'riche',         type: 'suffixe', source: 'boutique', prix: null },
    { id: 'renegat_s',    nom: 'renégat',       type: 'suffixe', source: 'boutique', prix: null },
    { id: 'chauve',       nom: 'chauve',        type: 'suffixe', source: 'boutique', prix: null },
    { id: 'maudit',       nom: 'maudit',        type: 'suffixe', source: 'boutique', prix: null },
    { id: 'celeste',      nom: 'céleste',       type: 'suffixe', source: 'boutique', prix: null },
    { id: 'desabysses',   nom: 'des abysses',   type: 'suffixe', source: 'boutique', prix: null },
    { id: 'duclan',       nom: 'du clan',       type: 'suffixe', source: 'boutique', prix: null },
    { id: 'deloyaute',    nom: 'de loyauté',    type: 'suffixe', source: 'boutique', prix: null },
    { id: 'ultime_s',     nom: 'ultime',        type: 'suffixe', source: 'boutique', prix: null },
    { id: 'gris',         nom: 'gris',          type: 'suffixe', source: 'boutique', prix: null },
    { id: 'supreme',      nom: 'suprême',       type: 'suffixe', source: 'boutique', prix: null },
    { id: 'delavie',      nom: 'de la vie',     type: 'suffixe', source: 'boutique', prix: null },
    { id: 'rose',         nom: 'rose',          type: 'suffixe', source: 'boutique', prix: null },
    { id: 'delinfini',    nom: "de l'infini",   type: 'suffixe', source: 'boutique', prix: null },
    { id: 'detous',       nom: 'de tous',       type: 'suffixe', source: 'boutique', prix: null },
    { id: 'etoile_s',     nom: 'étoilé',        type: 'suffixe', source: 'boutique', prix: null },
    { id: 'adorable',     nom: 'adorable',      type: 'suffixe', source: 'boutique', prix: null },
    { id: 'defeu',        nom: 'de feu',        type: 'suffixe', source: 'boutique', prix: null },
    { id: 'delamort',     nom: 'de la mort',    type: 'suffixe', source: 'boutique', prix: null },
    { id: 'vert',         nom: 'vert',          type: 'suffixe', source: 'boutique', prix: null },
    { id: 'delombre',     nom: "de l'ombre",    type: 'suffixe', source: 'boutique', prix: null },
    { id: 'jaune',        nom: 'jaune',         type: 'suffixe', source: 'boutique', prix: null },
    { id: 'dufutur',      nom: 'du futur',      type: 'suffixe', source: 'boutique', prix: null },
    { id: 'delapaix',     nom: 'de la paix',    type: 'suffixe', source: 'boutique', prix: null },
    { id: 'violet',       nom: 'violet',        type: 'suffixe', source: 'boutique', prix: null },
    { id: 'rouge',        nom: 'rouge',         type: 'suffixe', source: 'boutique', prix: null },
    { id: 'bleu',         nom: 'bleu',          type: 'suffixe', source: 'boutique', prix: null },
    { id: 'divin',        nom: 'divin',         type: 'suffixe', source: 'boutique', prix: null },
    { id: 'blanc',        nom: 'blanc',         type: 'suffixe', source: 'boutique', prix: null },
    { id: 'noir',         nom: 'noir',          type: 'suffixe', source: 'boutique', prix: null },
];

// Index par identifiant, construit une fois. Une recherche lineaire sur
// quatre-vingt-dix entrees a chaque affichage d une carte de joueur serait
// gratuite a payer.
const TITRES_PAR_ID = {};
for (const t of TITRES_CATALOGUE) TITRES_PAR_ID[t.id] = t;

// Le titre affichable, a partir des deux identifiants poses sur le compte.
//
// ⚠️ Rend une CHAINE VIDE quand il n y a rien, jamais `null` : l appelant la
// met directement a l ecran, et « null » s y serait affiche en toutes lettres.
//
// ⚠️ Et les deux emplacements sont INDEPENDANTS : « Shinigami » seul et
// « des ombres » seul sont deux titres valables. Exiger les deux aurait rendu
// inutile le premier titre qu on recoit, puisqu on n en a qu un.
function composerTitre(idPrefixe, idSuffixe) {
    const p = TITRES_PAR_ID[idPrefixe];
    const s = TITRES_PAR_ID[idSuffixe];
    // Un emplacement rempli avec un identifiant INCONNU ne doit rien casser :
    // un titre retire du catalogue laisse des comptes qui le portaient.
    const bouts = [];
    if (p && p.type === 'prefixe') bouts.push(p.nom);
    if (s && s.type === 'suffixe') bouts.push(s.nom);
    return bouts.join(' ');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TITRES_CATALOGUE, TITRES_PAR_ID, composerTitre };
}
