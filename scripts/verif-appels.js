// ⚠️ Le gabarit appelle-t-il une méthode QUI N EXISTE PAS ?
//
// C est arrivé le 27 septembre 2026, et les deux filets existants ont laissé
// passer : « npm run check » compile le gabarit — « mechePart() » est une
// expression parfaitement valide, il ne peut pas savoir que la méthode a
// disparu — et « check:vue » ne surveillait que les méthodes de Collect. Une
// découpe un peu large dans app.js avait emporté « mechePart » avec la
// méthode voisine qu on voulait retirer. Résultat : PAGE BLANCHE, alors que
// les sons continuaient de jouer parce que le script, lui, tournait.
//
// Vue rend la page une fois ; un appel manquant y lève une TypeError et le
// rendu s arrête net. Rien dans le terminal, rien dans les tests — seulement
// un écran noir et une erreur dans la console du navigateur.
//
// Ce filet lit les EXPRESSIONS du gabarit (moustaches, « : », « @ », « v- »),
// y cherche les identifiants appelés à la racine, et exige qu ils existent
// dans app.js.
const fs = require('fs');

const app = fs.readFileSync('src/script/app.js', 'utf8');
const html = fs.readFileSync('src/html/home.html', 'utf8');

// ── 1. Ce que le composant sait faire ───────────────────────────────
// Méthodes et propriétés calculées : toutes à huit espaces d indentation,
// suivies d une parenthèse. C est la forme tenue dans tout le fichier.
const connus = new Set();
let m;
// ⚠️ « async » compte : quatre méthodes le portent, dont applySetting(),
// appelée vingt-deux fois dans le seul panneau de réglages. L oublier faisait
// crier le filet sur des méthodes parfaitement présentes.
const decl = /^ {8}(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(/gm;
while ((m = decl.exec(app))) connus.add(m[1]);

// ── 2. Ce que le gabarit appelle ────────────────────────────────────
// On ne regarde QUE les expressions : le texte libre et les attributs
// ordinaires ne sont pas du JavaScript.
const expressions = [];
const moustache = /\{\{([\s\S]*?)\}\}/g;
while ((m = moustache.exec(html))) expressions.push([m[1], m.index]);
const lie = /\s(?::|@|v-[a-z:.-]+)[\w:.\-[\]]*\s*=\s*"([^"]*)"/g;
while ((m = lie.exec(html))) expressions.push([m[1], m.index]);

// Ce qui n a pas à vivre dans le composant.
const GLOBAUX = new Set([
    'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date',
    'Set', 'Map', 'RegExp', 'Promise', 'Error',
    'parseInt', 'parseFloat', 'isNaN', 'isFinite',
    'encodeURIComponent', 'decodeURIComponent', 'console', 'window', 'document',
    // mots-clefs suivis d une parenthèse
    'if', 'for', 'while', 'switch', 'catch', 'return', 'typeof', 'new',
    'function', 'in', 'of', 'do', 'else', 'await',
]);

const manquants = new Map();
// ⚠️ Les CHAÎNES DE TEXTE partent d abord. Un libellé comme « Nomme encore 3
// portrait(s) pour l'allumer » contient « portrait( » : sans ce nettoyage, le
// filet réclamait une méthode « portrait » qui n a jamais existé. Un mot suivi
// d une parenthèse dans une phrase française n est pas un appel.
const sansTexte = e => e.replace(/'(?:\\.|[^'\\])*'/g, "''")
                        .replace(/`(?:\\.|[^`\\])*`/g, '``');

for (const [brut, pos] of expressions) {
    const expr = sansTexte(brut);
    // ⚠️ La négation arrière « (?<![.$\w]) » est le cœur du filtre : sans elle
    // on ramasserait « p.filter( », « $event.target.blur( » et toutes les
    // méthodes d objets, qui n ont évidemment rien à faire dans le composant.
    const appel = /(?<![.$\w'"])([A-Za-z_$][\w$]*)\s*\(/g;
    let a;
    while ((a = appel.exec(expr))) {
        const nom = a[1];
        if (GLOBAUX.has(nom) || connus.has(nom)) continue;
        const ligne = html.slice(0, pos).split('\n').length;
        if (!manquants.has(nom)) manquants.set(nom, []);
        if (!manquants.get(nom).includes(ligne)) manquants.get(nom).push(ligne);
    }
}

if (manquants.size) {
    console.log('❌ Le gabarit appelle ' + manquants.size + ' chose(s) qui n existe(nt) pas dans app.js :');
    for (const [nom, lignes] of manquants) {
        console.log('   ' + nom + '()  → home.html ligne(s) ' + lignes.join(', '));
    }
    console.log('\n   Un seul de ces appels suffit à BLANCHIR la page : Vue lève une');
    console.log('   TypeError au rendu et s arrête là, sans rien dire au terminal.');
    process.exit(1);
}

console.log('✅ les ' + connus.size + ' méthodes et calculées couvrent tous les appels du gabarit');
