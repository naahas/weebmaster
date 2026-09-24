// Le partenaire de BombAnime : la bascule, puis le fait qu'il JOUE vraiment.
//
// Ce qui compte : il doit répondre avant l'explosion, tour après tour. On
// laisse tourner une dizaine de tours et l'on regarde s'il a perdu une vie.
const { io } = require('socket.io-client');
const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
const wait = ms => new Promise(r => setTimeout(r, ms));

let jeton = '', code = '';
const post = (p, b) => fetch(BASE + p, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Host-Token': jeton },
    body: JSON.stringify(b || {}),
}).then(r => r.json().then(j => {
    if (j.hostToken) jeton = j.hostToken;
    if (j.roomCode) code = j.roomCode;
    return { status: r.status, body: j };
}));

let ko = 0;
const check = (l, ok, extra) => {
    console.log(`${ok ? '✅' : '❌'} ${l}${extra !== undefined ? ' → ' + extra : ''}`);
    if (!ok) ko++;
};

(async () => {
    await post('/admin/toggle-game', { lobbyMode: 'bombanime' });
    await post('/admin/bombanime/set-timer', { timer: 5 });
    await post('/admin/bombanime/set-lives', { lives: 2 });
    console.log('salon ' + code + '\n');

    const s = io(BASE);
    await new Promise(r => s.on('connect', r));
    let salon = null;
    s.on('lobby-update', d => { salon = d; });
    s.emit('register-authenticated', { playerId: 'h1', username: 'Hote' });
    await wait(150);
    s.emit('join-lobby', { playerId: 'h1', username: 'Hote', code });
    await wait(600);

    console.log('── la bascule ──');
    check('un joueur au départ', salon && salon.playerCount === 1, salon && salon.playerCount);

    s.emit('bombanime-toggle-bot', { actif: true });
    await wait(300);
    check("sans jeton d'hôte, rien ne se passe", salon.playerCount === 1, salon.playerCount);

    s.emit('bombanime-toggle-bot', { actif: true, hostToken: jeton });
    await wait(300);
    check('avec le jeton, le bot rejoint', salon.playerCount === 2, salon.playerCount);
    const bot = (salon.players || []).find(p => p.estBot);
    check('le salon signale estBot au client', !!bot);
    check('il se nomme Master', bot && bot.username === 'Master', bot && bot.username);

    s.emit('bombanime-toggle-bot', { actif: true, hostToken: jeton });
    await wait(300);
    check("une seconde demande n'en ajoute pas un deuxième", salon.playerCount === 2, salon.playerCount);

    s.emit('bombanime-toggle-bot', { actif: false, hostToken: jeton });
    await wait(300);
    check('la bascule le retire', salon.playerCount === 1, salon.playerCount);

    s.emit('bombanime-toggle-bot', { actif: true, hostToken: jeton });
    await wait(300);

    // ── la partie ──
    console.log('\n── le bot joue-t-il ? ──');
    const noms = [], explosions = [];
    let tours = 0;
    s.on('bombanime-name-accepted', d => { if (d.playerUsername === 'Master') noms.push(d.name); });
    s.on('bombanime-explosion', d => explosions.push(d.playerUsername));
    s.on('bombanime-turn-start', () => { tours++; });

    const depart = await post('/admin/start-game', {});
    check('la manche démarre', depart.body.success === true, depart.body.error || 'ok');

    // L'hôte ne répond jamais : la bombe lui explose dessus, et comme il n'a
    // qu'une vie la partie s'arrête vite. Assez pour voir le bot jouer.
    await wait(20000);

    console.log('   tours          : ' + tours);
    console.log('   noms du bot    : ' + noms.length + '  ' + JSON.stringify(noms.slice(0, 6)));
    console.log('   explosions     : ' + JSON.stringify(explosions));

    check('le bot a répondu au moins une fois', noms.length >= 1, noms.length);
    check('il ne répète jamais un nom', new Set(noms).size === noms.length);
    check("la bombe ne lui a JAMAIS explosé dessus", !explosions.includes('Master'));
    check("elle a explosé sur l'hôte, qui ne répond pas", explosions.length > 0, explosions.length);

    s.close();
    await post('/admin/toggle-game', {});
    console.log(ko ? `\n❌ ${ko} échec(s)` : '\n✅ tout passe');
    process.exit(ko ? 1 : 0);
})().catch(e => { console.error('❌ ' + e.message); process.exit(1); });
