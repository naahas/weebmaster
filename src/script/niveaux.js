// ════════════════════════════════════════════════════════════════
// 🏅 LES RANGS ET LEUR COURBE D XP — un seul endroit
// ════════════════════════════════════════════════════════════════
//
// ⚠️ Ce fichier est lu des DEUX COTES : le navigateur le charge en balise
// `<script>` AVANT app.js (home.html), et le serveur le `require` pour que le
// panneau /admin puisse afficher le rang d un joueur.
//
// Il vit a part pour une seule raison, et c est la maladie que ce projet
// connait le mieux : une valeur ecrite deux fois finit par diverger. Ici elle
// divergerait sur le PROFIL DES JOUEURS — le jeu annoncerait « Élite II » et
// le panneau « Prodige III », sans que rien ne dise lequel a raison.
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
// 🎖️ NEUF PALIERS, TROIS DIVISIONS CHACUN — vingt-cinq rangs
// ────────────────────────────────────────────────────────────────
// La forme vient de Valorant et de League of Legends, et elle resout un vrai
// probleme : SIX rangs sur toute la vie d un joueur, c etaient des quarantaines
// de parties sans que rien ne change a l ecran. Entre « Vétéran » et
// « Maître » il y avait 4 600 xp, soit une quarantaine de parties ; entre
// « Maître » et « Légende », quatorze mille, soit plus de cent. Les divisions
// rendent une marche visible tous les quelques parties, sans multiplier les
// noms a retenir : on en apprend neuf, pas vingt-cinq.
//
// ⚠️ CE N EST PAS UN CLASSEMENT. Chez Valorant, « Diamant » veut dire « tu es
// meilleur que X % des joueurs » : il y a un appariement, une saison et une
// DESCENTE. Ici le rang se deduit de l xp cumulee, donc du TEMPS JOUE, et il
// ne redescend jamais. Les noms ont ete choisis en consequence — aucun ne
// promet un niveau de jeu, la ou « Bronze » ou « Diamant » l auraient fait, et
// le premier joueur a se faire battre par un Novice aurait vu le badge mentir.
//
// ⚠️ ET IL N Y A PAS DEUX ECHELLES. Le rang EST le niveau : `niveauPourXp`
// rend l indice 1 a 25 dans cette liste, et rien d autre ne se compte a cote.
// Afficher « Élite II » et « niveau 11 » ensemble aurait redonne le defaut
// qu on a corrige sur les titres, ou une echelle militaire doublait les rangs
// et personne ne savait laquelle comptait.
//
// `pas` est le prix D UNE DIVISION de ce palier — ce qu il en coute pour
// passer de I a II, de II a III, et de III au palier suivant. C est le SEUL
// levier : changer un `pas` deplace tout ce qui est au-dessus, et rien
// d autre n est a toucher — ni le jeu, ni le panneau.
//
// ⚠️ L ecart grandit par palier, PAS par rang. Dans un meme palier les trois
// divisions coutent pareil : c est ce qui fait qu on sent sa progression DANS
// un palier, alors qu un prix qui monte a chaque cran donnerait un troisieme
// cran toujours interminable, donc un palier qu on quitte en trainant.
//
// ⚠️ Et la croissance reste MODEREE d un palier a l autre (environ ×1,4), pas
// geometrique. Un facteur ×2 aurait mis Divin a plus de trois cent mille : hors
// d atteinte, donc un rang que personne ne porte, donc un rang qui ne dit rien.
const PALIERS = [
    { nom: 'Novice',  pas:  300, couleur: '#9a9aa6' },
    // ⚠️ LES NOMS SONT EN ANGLAIS, et c est la seule chose du jeu qui le
    // soit — tout le reste de l interface est en francais. Un rang est un
    // nom propre, pas une phrase : « Legend III » se lit pareil dans les
    // deux langues, et c est le registre des jeux ou ces echelles viennent.
    // ⚠️ `Oracle` remplace `Éveillé`, qui n avait pas d equivalent anglais
    // qui tienne — « Awakened » sonnait comme une traduction.
    // ⚠️ ET AUCUN ACCENT NE SUBSISTE, ce qui est un gain : ces noms
    // voyagent en base, dans le panneau et sur l ecran d un streamer.
    { nom: 'Oracle',  pas:  700, couleur: '#7fd4a0' },
    { nom: 'Prodigy', pas: 1200, couleur: '#5fc9e8' },
    { nom: 'Elite',   pas: 2000, couleur: '#6fa0f5' },
    { nom: 'Expert',  pas: 3000, couleur: '#a97bf5' },
    { nom: 'Legend',  pas: 6500, couleur: '#f5a65b' },
    { nom: 'Eternal', pas: 9000, couleur: '#FFD700' },
    // ⚠️ MASTER EST LE SOMMET, et il a pris la place de « Divin » — le site
    // s appelle ShonenMaster, le dernier rang porte donc son nom. Master
    // etait avant le sixieme palier, a 4500 par division : ce palier-la
    // disparait purement, Legende et Eternal se decalent d un cran.
    //
    // ⚠️ LES AUTRES PALIERS GARDENT LEUR PROPRE `pas`. Legende a toujours
    // coute 6500 par division, Eternal 9000 : leur faire reprendre les
    // valeurs de la place qu ils occupent desormais (4500 et 6500) aurait
    // rapproche le sommet d un tiers — 54 600 au lieu de 68 100. L ecart
    // entre Expert et Legende se creuse donc d un coup (3000 → 6500), et
    // c est voulu : la derniere ligne droite doit se meriter.
    //
    // ⚠️ IL N A PAS DE DIVISIONS, et c est ce qui en fait le sommet : on n y
    // « progresse » pas, on y est. Son `pas` ne sert donc a rien — rien ne
    // vient apres. `unique` le dit explicitement plutot que de le deduire de
    // sa place dans la liste : un palier ajoute apres lui casserait la
    // deduction en silence.
    // ⚠️ Il reprend l or pale de l ancien Divin, pas le rose de l ancien
    // Master : c est la couleur du sommet, pas celle du nom.
    { nom: 'Master',  pas:    0, couleur: '#fff1c1', unique: true },
];

const CHIFFRES = ['', 'I', 'II', 'III'];

// ────────────────────────────────────────────────────────────────
// L echelle a plat : vingt-cinq rangs, chacun avec l xp qui l ouvre
// ────────────────────────────────────────────────────────────────
// ⚠️ Fabriquee UNE FOIS au chargement, pas a chaque appel. `niveauPourXp` est
// lu par une propriete calculee de Vue, donc a chaque rendu de la carte du
// joueur ; refaire la liste a chaque fois serait un gaspillage silencieux.
//
// ⚠️ Et le cumul s incremente APRES avoir pose le rang : le premier ouvre donc
// a zero. Poser le cumul apres l increment aurait rendu « Novice I » inatteignable
// a xp nulle, c est-a-dire pour tout nouveau joueur — le defaut classique de
// la boucle a un cran pres, et il ne se serait vu que sur un compte neuf.
const RANGS = (function construire() {
    const out = [];
    let cumul = 0;
    for (const p of PALIERS) {
        const divisions = p.unique ? 1 : 3;
        for (let d = 1; d <= divisions; d++) {
            out.push({
                palier: p.nom,
                division: p.unique ? 0 : d,
                // `nom` porte le nom COMPLET, division comprise : c est ce que
                // tout le monde affiche, du panneau a la carte du joueur.
                nom: p.unique ? p.nom : (p.nom + ' ' + CHIFFRES[d]),
                couleur: p.couleur,
                cumul: cumul,
            });
            cumul += p.pas;
        }
    }
    return out;
})();

// L xp cumulee qu il faut pour ATTEINDRE le rang n (1 = le premier).
//
// ⚠️ Au-dela du dernier rang elle rend le cumul du dernier, donc un prix de
// rang NUL pour Divin. C est volontaire et c est lu plus haut dans la chaine :
// `xpParNiveau` vaut alors zero, et `xpPart` doit rendre 1 — un rang sans
// suivant est plein par definition. Rendre `Infinity` aurait donne une barre
// VIDE au sommet, exactement l inverse.
function xpCumulee(n) {
    if (n <= 1) return 0;
    if (n > RANGS.length) return RANGS[RANGS.length - 1].cumul;
    return RANGS[n - 1].cumul;
}

// Le rang atteint avec `xp`, en indice 1 a 25.
//
// ⚠️ On MONTE au lieu d inverser la courbe : elle n a plus de forme fermee
// depuis que le prix change par palier, et une table de vingt-cinq entrees se
// parcourt plus vite qu on ne l ecrirait. La borne est la LONGUEUR de la
// table : un `xp` absurde (NaN, Infinity, une colonne mal lue) sort au dernier
// rang au lieu de figer la page.
function niveauPourXp(xp) {
    const total = Number(xp) || 0;
    let n = 1;
    while (n < RANGS.length && RANGS[n].cumul <= total) n++;
    return n;
}

// ⚠️ Le premier rang ouvre a 0, donc cette fonction trouve TOUJOURS quelque
// chose : pas de cas « aucun rang » a gerer a l affichage.
function titrePourNiveau(niveau) {
    const i = Math.min(Math.max(1, Math.floor(Number(niveau) || 1)), RANGS.length);
    return RANGS[i - 1];
}

// Gardee sous son ancien nom : server.js, app.js et le panneau la citent, et
// elle veut toujours dire la meme chose — la liste des rangs qu on peut porter.
const TITRES_JOUEUR = RANGS;

// ⚠️ LA SORTIE DOUBLE. En Node, `module` existe et l on exporte ; dans le
// navigateur il n existe pas, le bloc est saute, et les `const` du haut
// restent accessibles aux scripts charges ENSUITE (app.js). Un `const` de
// premier niveau ne devient pas une propriete de `window` — il vit dans la
// portee lexicale globale, ce qui suffit, a condition que ce fichier soit
// charge AVANT celui qui s en sert.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PALIERS, RANGS, xpCumulee, niveauPourXp, TITRES_JOUEUR, titrePourNiveau };
}
