/**
 * 🧪 Vérifie que le template Vue de home.html compile.
 *
 * Le client est un gros template inline : une erreur de structure (un v-else
 * séparé de son v-if, une balise non fermée) ne se voit qu'à l'exécution, avec
 * un écran blanc. Ce script la fait remonter tout de suite.
 *
 * Usage : node scripts/check-template.js   (ou npm run check)
 */

const fs = require('fs');
const path = require('path');
const { compile } = require('@vue/compiler-dom');

const FICHIER = path.join(__dirname, '..', 'src', 'html', 'home.html');
const html = fs.readFileSync(FICHIER, 'utf8');

// On isole le contenu de #app, c'est lui que Vue compile. On s'arrête au premier
// <script> qui suit : Vue ignore ces balises et le compilateur les signale.
const debut = html.indexOf('<div id="app"');
if (debut === -1) {
    console.error('❌ Impossible de trouver #app dans home.html');
    process.exit(1);
}

const fin = html.indexOf('<script', debut);
const template = html.slice(debut, fin === -1 ? html.length : fin);

try {
    // « prefixIdentifiers » fait passer chaque expression par un analyseur
    // JavaScript. Sans lui, le compilateur se contente de la structure : un
    // « @click=".codeInput.focus()" » — un  perdu en route — compilait
    // sans broncher et blanchissait la page a l execution. C est arrive.
    compile(template, { prefixIdentifiers: true, onError: (e) => { throw e; } });
    const lignes = template.split('\n').length;
    console.log(`✅ Template Vue valide (${lignes} lignes compilées)`);
} catch (e) {
    console.error('❌ Le template Vue ne compile pas :\n');
    console.error('   ' + e.message);
    if (e.loc && e.loc.start) {
        // ligne dans le fichier complet, pas seulement dans l'extrait
        const avant = html.slice(0, debut).split('\n').length - 1;
        console.error(`   → home.html, ligne ${avant + e.loc.start.line}`);
    }
    process.exit(1);
}
