// Le script du panneau /admin TOURNE-T-IL ?
//
// ⚠️ `new Function(code)` ne verifie que la SYNTAXE. Il a laisse passer un
// `const PORTE = $('porte')` place vingt lignes AVANT la declaration de `$` :
// syntaxe parfaite, ReferenceError a l execution, script entier mort. La page
// s affichait normalement et plus aucun bouton ne repondait — rien, a la
// lecture, ne disait pourquoi.
//
// On execute donc le script pour de vrai, dans un DOM de facade. On ne teste
// pas ce qu il FAIT : seulement qu il va jusqu au bout sans exploser.
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(__dirname + '/../src/html/admin.html', 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];

// ── Un element de facade ────────────────────────────────────────────
// Il accepte tout et ne rend jamais null : le but est d aller au bout du
// script, pas de simuler un navigateur.
function elem(id) {
    const el = {
        id: id || '',
        tagName: 'DIV',
        dataset: {},
        style: {},
        value: '',
        textContent: '',
        innerHTML: '',
        href: '',
        checked: false,
        disabled: false,
        hidden: false,
        indeterminate: false,
        offsetWidth: 0,
        type: 'text',
        maxLength: 0,
        parentNode: null,
        nextSibling: null,
        classList: {
            _: new Set(),
            add(...c) { c.forEach(x => this._.add(x)); },
            remove(...c) { c.forEach(x => this._.delete(x)); },
            toggle(c, f) { f === undefined ? (this._.has(c) ? this._.delete(c) : this._.add(c)) : (f ? this._.add(c) : this._.delete(c)); },
            contains(c) { return this._.has(c); },
        },
        querySelector: () => elem(),
        querySelectorAll: () => [],
        addEventListener() {},
        removeEventListener() {},
        setAttribute() {},
        removeAttribute() {},
        getAttribute: () => null,
        appendChild(n) { return n; },
        insertBefore(n) { return n; },
        replaceWith() {},
        remove() { this.parentNode = null; },
        closest: () => elem(),
        focus() {},
        select() {},
        blur() {},
        click() {},
    };
    return el;
}

const corps = elem('body');
const document = {
    body: corps,
    getElementById: id => elem(id),
    querySelector: () => elem(),
    querySelectorAll: () => [],
    createElement: t => { const e = elem(); e.tagName = String(t).toUpperCase(); return e; },
    addEventListener() {},
};

// ── L environnement ─────────────────────────────────────────────────
const bac = {
    document,
    console: { log() {}, warn() {}, error() {} },
    // On ne veut pas de requete reelle : la promesse ne se resout jamais, ce
    // qui suffit — on mesure le chargement du script, pas son trafic.
    fetch: () => new Promise(() => {}),
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    location: { search: '', pathname: '/admin' },
    history: { replaceState() {} },
    URLSearchParams: URLSearchParams,
    setTimeout: () => 0,
    clearTimeout() {},
    setInterval: () => 0,
    clearInterval() {},
    requestAnimationFrame: () => 0,
    alert() {},
    confirm: () => false,
    encodeURIComponent,
    Date, Math, JSON, Set, Map, Array, Object, String, Number, Boolean,
    parseInt, parseFloat, isNaN,
    Promise, Error,
};
bac.window = bac;
bac.globalThis = bac;

try {
    vm.createContext(bac);
    new vm.Script(code, { filename: 'admin.html<script>' }).runInContext(bac, { timeout: 5000 });
} catch (e) {
    console.log('❌ Le script du panneau MEURT au chargement :');
    console.log('   ' + e.name + ' : ' + e.message);
    if (e.stack) {
        const ligne = (e.stack.match(/admin\.html<script>:(\d+)/) || [])[1];
        if (ligne) {
            console.log('   ligne ' + ligne + ' du script : '
                + (code.split('\n')[ligne - 1] || '').trim());
        }
    }
    console.log('');
    console.log('   Une page qui s affiche ne prouve RIEN : le HTML se rend, et');
    console.log('   c est le script qui est mort. Plus aucun bouton ne repond.');
    process.exit(1);
}

console.log('✅ Le script du panneau s exécute de bout en bout ('
    + code.split('\n').length + ' lignes)');
