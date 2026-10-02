// Combien de PERSONNAGES par série, et non combien de noms.
//
// ⚠️ Pourquoi un fichier produit à l avance plutôt qu un calcul au démarrage :
// il faut 25 SECONDES. Le calcul est en O(n²) par série — chaque nom est
// confronté à tous les autres — et il construit deux expressions régulières par
// paire. Sur 8 854 noms ça fait des millions d allocations, en bloquant la
// boucle du processus : le dyno ne répondrait à personne pendant ce temps, et
// tous les salons vivent dedans.
//
// ⚠️ Et pourquoi on se sert de `getAllNamesToBlock`, la VRAIE fonction du jeu,
// au lieu d une approximation plus rapide : le regroupement ne vient PAS que
// de `character-variants.js`. La règle du MOT ENTIER relie « Mihawk » à
// « Dracule Mihawk » sans qu aucune entrée ne le dise, et c est d elle que
// vient le gros du surcompte. Un compte fondé sur une autre règle que celle du
// jeu serait faux autrement, ce qui est pire que faux pareil.
//
// Usage : npm run bomb:compter
// À relancer après chaque ajout dans `bombdata.json`. Le serveur sait dire
// quand le fichier a vieilli — il compare le nombre de NOMS de chaque série et
// retombe sur le compte brut pour celles qui ont bougé, en le disant.
const fs = require('fs');
const path = require('path');
const { getAllNamesToBlock } = require('../character-variants');

const RACINE = path.join(__dirname, '..');
const SORTIE = path.join(RACINE, 'bombcounts.json');

const data = JSON.parse(fs.readFileSync(path.join(RACINE, 'bombdata.json'), 'utf8')).Character || {};

// Citer un nom bloque toute sa classe : le nombre de personnages CITABLES est
// donc le nombre de classes d équivalence, pas le nombre de noms.
function compterClasses(serie, noms) {
    const parent = new Map(noms.map(n => [n.toUpperCase(), n.toUpperCase()]));
    const trouver = (x) => {
        while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); }
        return x;
    };
    for (const n of noms) {
        const u = n.toUpperCase();
        for (const bloque of getAllNamesToBlock(u, noms, serie)) {
            const v = bloque.toUpperCase();
            if (!parent.has(v)) continue;
            const a = trouver(u), b = trouver(v);
            if (a !== b) parent.set(a, b);
        }
    }
    return new Set([...parent.keys()].map(trouver)).size;
}

const debut = Date.now();
const series = {};
let totalNoms = 0, totalPersos = 0;

console.log('série'.padEnd(18) + 'noms'.padStart(7) + 'persos'.padStart(8) + 'écart'.padStart(7));
for (const [serie, noms] of Object.entries(data)) {
    const persos = compterClasses(serie, noms);
    series[serie] = { noms: noms.length, persos };
    totalNoms += noms.length;
    totalPersos += persos;
    console.log(serie.padEnd(18)
        + String(noms.length).padStart(7)
        + String(persos).padStart(8)
        + String(noms.length - persos).padStart(7));
}

console.log('');
console.log('TOTAL'.padEnd(18)
    + String(totalNoms).padStart(7)
    + String(totalPersos).padStart(8)
    + String(totalNoms - totalPersos).padStart(7)
    + '   soit ' + ((totalNoms - totalPersos) / totalNoms * 100).toFixed(1) + '% de noms en trop');

fs.writeFileSync(SORTIE, JSON.stringify({
    // ⚠️ Pas de date ici : elle changerait à chaque exécution et ferait un diff
    // dans git même quand les chiffres sont identiques. C est `noms` qui dit si
    // le fichier est à jour, et c est la seule chose qui compte.
    _: 'Produit par npm run bomb:compter — ne pas éditer à la main',
    series,
}, null, 2) + '\n');

console.log('\n→ ' + path.relative(RACINE, SORTIE) + ' écrit en ' + ((Date.now() - debut) / 1000).toFixed(1) + ' s');
