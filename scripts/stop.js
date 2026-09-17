// 🛑 Libérer le port du serveur, quoi qu'il y ait dessus.
//
// Fermer la fenêtre du terminal ne suffit pas toujours : « npm start » lance
// nodemon, qui lance node. Tuer le terminal tue npm, mais le petit-fils node
// survit, garde le port, et le lancement suivant échoue sur EADDRINUSE — avec
// un site qui répond encore alors qu'on croit avoir tout coupé.
//
// On ne cherche donc pas « les processus node » (on tuerait ceux des autres
// projets), mais CE QUI TIENT LE PORT.

const { execSync } = require('child_process');
const PORT = process.env.PORT || 7000;

function pidsSurLePort(port) {
    let sortie = '';
    try {
        sortie = execSync('netstat -ano -p TCP', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    } catch (e) { return []; }
    const pids = new Set();
    for (const ligne of sortie.split('\n')) {
        // On ne prend que les lignes en écoute sur NOTRE port — pas les
        // connexions sortantes qui s'y adressent.
        if (!/LISTENING|LISTEN/i.test(ligne)) continue;
        const m = ligne.match(/\S+\s+\S*:(\d+)\s+\S+\s+\S+\s+(\d+)\s*$/);
        if (m && m[1] === String(port) && m[2] !== '0') pids.add(m[2]);
    }
    return [...pids];
}

const pids = pidsSurLePort(PORT);

if (!pids.length) {
    console.log('✅ Le port ' + PORT + ' est déjà libre.');
    process.exit(0);
}

for (const pid of pids) {
    let quoi = 'processus ' + pid;
    try {
        const info = execSync(
            'powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter \\"ProcessId=' + pid + '\\").CommandLine"',
            { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
        if (info) quoi = info.slice(0, 70);
    } catch (e) { /* le nom est un confort, pas une condition */ }

    try {
        execSync('taskkill /PID ' + pid + ' /T /F', { stdio: 'ignore' });
        console.log('🛑 tué : ' + quoi + '   (PID ' + pid + ')');
    } catch (e) {
        console.log('❌ impossible de tuer le PID ' + pid + ' — essaie un terminal en administrateur.');
        process.exit(1);
    }
}

// Le système met parfois une seconde à rendre le port : sans cette attente,
// un « npm run restart » enchaîne trop vite et retombe sur EADDRINUSE.
const fin = Date.now() + 4000;
(function attendre() {
    if (!pidsSurLePort(PORT).length) {
        console.log('✅ Port ' + PORT + ' libéré.');
        return;
    }
    if (Date.now() > fin) {
        console.log('⚠️  Le port ' + PORT + ' est toujours occupé après 4 s.');
        process.exit(1);
    }
    setTimeout(attendre, 200);
})();
