// ════════════════════════════════════════════════════════════════
// 🏅 LA COURBE DES NIVEAUX ET LES TITRES — un seul endroit
// ════════════════════════════════════════════════════════════════
//
// ⚠️ Ce fichier est lu des DEUX COTES : le navigateur le charge en balise
// `<script>` AVANT app.js (home.html), et le serveur le `require` pour que le
// panneau /admin puisse afficher le niveau d un joueur.
//
// Il vit a part pour une seule raison, et c est la maladie que ce projet
// connait le mieux : une valeur ecrite deux fois finit par diverger. Ici elle
// divergerait sur le PROFIL DES JOUEURS — le jeu annoncerait « Vétéran » et le
// panneau « Combattant », sans que rien ne dise lequel a raison.
//
// ⚠️ Il n y a NI BUILD NI BUNDLER sur ce projet : les fichiers sont servis
// tels quels. D ou la double sortie en bas, qui est la seule facon d etre a la
// fois un module Node et un script de navigateur. Ne pas y mettre d `import`
// ni d `export` : la balise `<script>` de home.html n est pas un module, et
// un `export` y leverait une erreur de syntaxe qui blanchirait la page.
//
// ⚠️ Et RIEN d autre ne doit entrer ici : pas de DOM, pas de `fetch`, pas de
// `require`. Tout ce qui ne tourne pas des deux cotes casserait l un des deux.

// ────────────────────────────────────────────────────────────────
// La courbe : chaque niveau coute XP_PAS de plus que le precedent.
// ────────────────────────────────────────────────────────────────
// Le palier a longtemps ete CONSTANT (200 xp), et c etait tenable tant que
// rien ne creditait d xp. Le bareme du serveur (`XP_MODES`, server-comptes.js)
// l a rendu absurde : un Classique gagne vaut 400, soit DEUX NIVEAUX d un
// coup. On ne voyait meme pas la barre bouger, on la voyait sauter.
//
// ⚠️ Croissance LINEAIRE, pas geometrique. Un facteur (×1,5 par niveau)
// mettrait « Légende » a deux millions d xp : hors d atteinte, donc un titre
// que personne ne porte, donc un titre qui ne dit plus rien. Ici il vaut
// 22 800 — environ 190 parties. Long, mais fini.
//
// Deux nombres, et ce sont les deux seuls leviers : XP_BASE est le prix du
// niveau 2, XP_PAS ce que chaque niveau suivant coute en plus. Diviser
// XP_PAS par deux fait monter deux fois plus vite, et rien d autre n est a
// toucher — ni l affichage du jeu, ni celui du panneau.
const XP_BASE = 300;
const XP_PAS = 100;

// L xp cumulee qu il faut pour ATTEINDRE le niveau n. Somme d une suite
// arithmetique, donc une forme fermee : pas de boucle pour la descente.
// Avec les valeurs ci-dessus, cela vaut 50·(n−1)·(n+4).
function xpCumulee(n) {
    if (n <= 1) return 0;
    return (XP_BASE * (n - 1)) + (XP_PAS * (n - 1) * (n - 2) / 2);
}

// Le niveau atteint avec `xp`.
//
// ⚠️ On MONTE au lieu d inverser la formule. L inverse existe (c est une
// racine carree) mais il rend 1,9999999 la ou il faut 2, et il faudrait de
// toute facon corriger l arrondi — autant ne pas l introduire. La boucle fait
// une vingtaine de tours au pire, sur une valeur que Vue met en cache.
// La borne a 500 n est pas la pour les joueurs : elle est la pour qu un `xp`
// absurde (NaN, Infinity, une colonne mal lue) ne fige pas la page.
function niveauPourXp(xp) {
    const total = Number(xp) || 0;
    let n = 1;
    while (n < 500 && xpCumulee(n + 1) <= total) n++;
    return n;
}

// ────────────────────────────────────────────────────────────────
// Les titres
// ────────────────────────────────────────────────────────────────
// ⚠️ Le premier palier est a 1, donc `titrePourNiveau` trouve toujours quelque
// chose : pas de cas « aucun titre » a gerer a l affichage.
const TITRES_JOUEUR = [
    { des: 1, nom: 'Novice', couleur: '#9a9aa6' },
    { des: 3, nom: 'Apprenti', couleur: '#7fd4a0' },
    { des: 5, nom: 'Combattant', couleur: '#6fb3f5' },
    { des: 8, nom: 'Vétéran', couleur: '#c08cf5' },
    { des: 12, nom: 'Maître', couleur: '#f5a65b' },
    { des: 20, nom: 'Légende', couleur: '#FFD700' },
];

function titrePourNiveau(niveau) {
    let t = TITRES_JOUEUR[0];
    for (const x of TITRES_JOUEUR) if (niveau >= x.des) t = x;
    return t;
}

// ⚠️ LA SORTIE DOUBLE. En Node, `module` existe et l on exporte ; dans le
// navigateur il n existe pas, le bloc est saute, et les `const` du haut
// restent accessibles aux scripts charges ENSUITE (app.js). Un `const` de
// premier niveau ne devient pas une propriete de `window` — il vit dans la
// portee lexicale globale, ce qui suffit, a condition que ce fichier soit
// charge AVANT celui qui s en sert.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { XP_BASE, XP_PAS, xpCumulee, niveauPourXp, TITRES_JOUEUR, titrePourNiveau };
}
