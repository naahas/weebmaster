// Un salon où il ne reste QUE le bot doit se refermer.
//
// ⚠️ Le partenaire de BombAnime n'est pas quelqu'un : il siège dans `players`
// comme un joueur, mais il n'a pas de socket — donc jamais de
// `disconnectedAt` — et il ne partira jamais de lui-même.
//
// Les deux ménages du serveur le comptaient. Un hôte qui posait un bot puis
// fermait son onglet laissait un salon ouvert POUR TOUJOURS. Vu en ligne : un
// salon resté la matinée entière avec le seul bot dedans.
//
// Ce test tient les deux bouts — le salon fantôme se ferme, ET un salon où il
// reste un humain ne se ferme PAS.
//
// À lancer avec des délais courts des deux côtés, sinon il faut dix minutes :
//   GRACE_SALON_VIDE=2000 GRACE_LOBBY_MS=2000 npm start
//   GRACE_SALON_VIDE=2000 GRACE_LOBBY_MS=2000 npm run test:bot-fantome
const { io } = require('socket.io-client');

const PORT = process.env.TEST_PORT || process.env.PORT || 7000;
const BASE = 'http://localhost:' + PORT;
const CODE = process.env.PANEL_ADMIN_CODE;

let ok = 0, ko = 0;
const dire = (b, txt, det) => {
    console.log((b ? '✅ ' : '❌ ') + txt + (det ? ' → ' + det : ''));
    b ? ok++ : ko++;
};
const attendre = ms => new Promise(r => setTimeout(r, ms));

const poster = (chemin, corps, jeton) => fetch(BASE + chemin, {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' },
        jeton ? { 'X-Host-Token': jeton } : {}),
    body: JSON.stringify(corps || {}),
}).then(r => r.json().catch(() => ({})));

const salons = () => fetch(BASE + '/admin/site/direct', { headers: { 'X-Admin-Code': CODE } })
    .then(r => r.json()).then(o => o.salons);

async function entrer(id, nom, code) {
    const s = io(BASE, { transports: ['websocket'] });
    await new Promise(r => s.on('connect', r));
    s.emit('register-authenticated', { playerId: id, username: nom });
    await attendre(200);
    s.emit('join-lobby', { playerId: id, username: nom, code });
    return s;
}

// Le ménage tourne par intervalle : on lui laisse plusieurs tours.
async function attendreFermeture(code, tours = 4) {
    for (let i = 0; i < tours; i++) {
        await attendre(4000);
        if (!(await salons()).find(x => x.code === code)) return true;
    }
    return false;
}

(async () => {
    if (!CODE) {
        console.log('❌ PANEL_ADMIN_CODE absent de l\'environnement.');
        process.exit(1);
    }

    console.log('');
    console.log('═══ 1. IL NE RESTE QUE LE BOT ═══');
    console.log('');

    let o = await poster('/admin/toggle-game', { lobbyMode: 'bombanime', playerId: 'fantome-1' });
    let s = await entrer('fantome-1', 'LHote', o.roomCode);
    await attendre(700);
    s.emit('bombanime-toggle-bot', { actif: true, hostToken: o.hostToken });
    await attendre(700);

    let v = (await salons()).find(x => x.code === o.roomCode);
    dire(v && v.joueurs === 2, 'salon ouvert : l\'hôte et le bot', v && v.joueurs + ' joueur(s)');

    s.disconnect();
    dire(await attendreFermeture(o.roomCode),
        '⚠️ l\'hôte parti, le salon se referme malgré le bot');

    console.log('');
    console.log('═══ 2. ET IL NE SE FERME PAS TROP TÔT ═══');
    console.log('');

    o = await poster('/admin/toggle-game', { lobbyMode: 'bombanime', playerId: 'reste-1' });
    const a = await entrer('reste-1', 'Reste', o.roomCode);
    const b = await entrer('reste-2', 'Part', o.roomCode);
    await attendre(700);
    a.emit('bombanime-toggle-bot', { actif: true, hostToken: o.hostToken });
    await attendre(700);

    v = (await salons()).find(x => x.code === o.roomCode);
    dire(v && v.joueurs === 3, 'salon à trois : deux humains et le bot', v && v.joueurs + ' joueur(s)');

    b.disconnect();
    await attendre(9000);
    v = (await salons()).find(x => x.code === o.roomCode);
    dire(!!v, '⚠️ il TIENT tant qu\'un humain y est',
        v ? v.joueurs + ' joueur(s) — ouvert' : 'fermé à tort');

    a.disconnect();
    dire(await attendreFermeture(o.roomCode),
        'et il se ferme quand le dernier humain part');

    console.log('');
    console.log(ko === 0
        ? '✨ Le bot seul ne retient plus aucun salon'
        : '💥 ' + ko + ' échec(s) sur ' + (ok + ko));
    process.exit(ko === 0 ? 0 : 1);
})().catch(e => { console.error('\n💥 ' + e.message); process.exit(1); });
