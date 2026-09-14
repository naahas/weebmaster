// Un filet : une propriété calculée appelée AVEC des parenthèses dans le
// gabarit lève une TypeError et blanchit la page ; une méthode citée SANS
// parenthèses rend « function () {...} » ou un objet toujours vrai.
// « npm run check » ne voit ni l'un ni l'autre — ce sont des expressions
// parfaitement valides.
const fs = require('fs');
const app = fs.readFileSync('src/script/app.js', 'utf8');
const html = fs.readFileSync('src/html/home.html', 'utf8');

const iM = app.indexOf('    methods: {');
const nom = /^        (col[A-Za-z0-9_]*)\(/gm;
const calculees = new Set(), methodes = new Set();
const ou = new Map();   // nom → les lignes ou il est defini
let m;
while ((m = nom.exec(app))) {
    (m.index < iM ? calculees : methodes).add(m[1]);
    if (!ou.has(m[1])) ou.set(m[1], []);
    ou.get(m[1]).push(app.slice(0, m.index).split('\n').length);
}

const ko = [];

// ⚠️ DEUX FOIS LE MEME NOM, et rien ne proteste. Un objet JavaScript accepte
// une clef en double : la derniere ecrase la premiere, sans erreur ni
// avertissement. « npm run check » compile le gabarit, pas le script, et
// « new Function » n y voit qu une expression valide.
//
// C est arrive : une methode « colViser » ajoutee pour l apercu d une carte
// portait le nom du viseur du VOL, defini trois cents lignes plus bas. La
// nouvelle etait morte-nee, et le gabarit appelait le viseur du vol a chaque
// carte survolee — en lui passant une carte en guise de cible. Le vol
// devenait injouable, et rien nulle part ne le disait.
for (const [n, lignes] of ou) {
    if (lignes.length > 1) {
        ko.push(n + '  → défini ' + lignes.length + ' fois (lignes ' + lignes.join(', ') +
                ') — seule la dernière existe');
    }
}
for (const c of calculees) {
    if (new RegExp('\\b' + c + '\\s*\\(').test(html)) {
        ko.push(c + '  → propriété calculée, appelée avec des parenthèses');
    }
}
for (const c of methodes) {
    // « @click="fn" » est la forme normale d'un gestionnaire : Vue l'appelle
    // lui-même. On ne compte que les emplois EN PLUS de ceux-là.
    const sansParenthese = new RegExp('[^A-Za-z0-9_$.]' + c + '(?!\\s*\\()(?![A-Za-z0-9_$])', 'g');
    const gestionnaire = new RegExp('(@[a-z.]+|v-on:[a-z.]+)="' + c + '"', 'g');
    const total = (html.match(sansParenthese) || []).length;
    const permis = (html.match(gestionnaire) || []).length;
    if (total > permis) ko.push(c + '  → méthode, citée sans parenthèses (' + total + ' fois, dont ' + permis + ' en gestionnaire)');
}
console.log(ko.length ? 'À VÉRIFIER :\n  ' + ko.join('\n  ')
                      : '✅ aucun doublon, aucune confusion entre méthode et propriété calculée (' +
                        calculees.size + ' calculées, ' + methodes.size + ' méthodes)');
process.exit(ko.length ? 1 : 0);
