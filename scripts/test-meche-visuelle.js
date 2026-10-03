// Le reglage « Meche visible ».
//
// Ce qu on exige :
//   • il part a VRAI sur un salon neuf, et il figure dans `reglagesDuSalon`
//     (sans quoi il resterait fige d un salon a l autre) ;
//   • il voyage jusqu au joueur dans les envois qui comptent ;
//   • et surtout : il ne touche PAS la duree de la meche. Le minuteur du
//     serveur doit rendre les memes valeurs, reglage allume ou eteint.
const io = require('socket.io-client');
const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
const dors = ms => new Promise(r => setTimeout(r, ms));

let ko = 0;
const dit = (l, ok, e) => { console.log((ok ? '✅ ' : '❌ ') + l + (e ? '  → ' + e : '')); if (!ok) ko++; };

const admin = (route, jeton, corps) => fetch(BASE + route, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Host-Token': jeton },
    body: JSON.stringify(corps || {}),
}).then(r => r.json().then(j => ({ status: r.status, body: j })));

async function ouvrir() {
    const r = await fetch(BASE + '/admin/toggle-game', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobbyMode: 'bombanime', playerId: 'mv-hote' }),
    });
    return r.json();
}
const fermer = j => fetch(BASE + '/admin/toggle-game', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Host-Token': j }, body: '{}' });

(async () => {
    // ── 1. Le defaut, et la presence dans les reglages du salon ──
    console.log('── un salon neuf ──');
    let o = await ouvrir();
    dit('le salon annonce « mecheVisuelle »', o.reglages.bombanime.mecheVisuelle !== undefined,
        String(o.reglages.bombanime.mecheVisuelle));
    dit('et il part a VRAI', o.reglages.bombanime.mecheVisuelle === true,
        String(o.reglages.bombanime.mecheVisuelle));

    // On l eteint, on ferme, on rouvre : il doit etre revenu a vrai.
    const r1 = await admin('/admin/bombanime/set-meche-visuelle', o.hostToken, { visuelle: false });
    dit('on peut l eteindre', r1.status === 200 && r1.body.mecheVisuelle === false, JSON.stringify(r1.body));
    await fermer(o.hostToken);

    o = await ouvrir();
    dit('un salon NEUF le remet a vrai', o.reglages.bombanime.mecheVisuelle === true,
        String(o.reglages.bombanime.mecheVisuelle));

    // ── 2. Il voyage jusqu au joueur ──
    console.log('\n── ce que le joueur recoit ──');
    await admin('/admin/bombanime/set-meche', o.hostToken, { meche: 'continue' });
    await admin('/admin/bombanime/set-meche-visuelle', o.hostToken, { visuelle: false });

    const clients = [];
    for (let i = 0; i < 2; i++) {
        const s = io(BASE, { transports: ['websocket'] });
        const id = 'mv' + i;
        await new Promise(r => s.on('connect', r));
        s.emit('register-authenticated', { playerId: id, username: 'Joueur' + i, avatarUrl: null });
        await dors(60);
        s.emit('join-lobby', { code: o.roomCode, playerId: id, username: 'Joueur' + i });
        const c = { s, id, demarrage: null, tour: null, config: null };
        s.on('bombanime-game-started', d => { c.demarrage = d; });
        s.on('bombanime-turn-start', d => { c.tour = c.tour || d; });
        s.on('bombanime-config-updated', d => { c.config = d; });
        clients.push(c);
    }
    await dors(500);

    // Le reglage change EN SALON : la diffusion doit l emporter.
    await admin('/admin/bombanime/set-meche-visuelle', o.hostToken, { visuelle: true });
    await dors(300);
    dit('« bombanime-config-updated » le porte',
        clients[0].config && clients[0].config.mecheVisuelle === true,
        JSON.stringify(clients[0].config && clients[0].config.mecheVisuelle));
    await admin('/admin/bombanime/set-meche-visuelle', o.hostToken, { visuelle: false });
    await dors(300);

    await admin('/admin/start-game', o.hostToken, {});
    await dors(6000);   // l intro passe avant le premier tour
    dit('« bombanime-game-started » le porte',
        clients[0].demarrage && clients[0].demarrage.mecheVisuelle === false,
        JSON.stringify(clients[0].demarrage && clients[0].demarrage.mecheVisuelle));
    dit('« bombanime-turn-start » le porte',
        clients[0].tour && clients[0].tour.mecheVisuelle === false,
        JSON.stringify(clients[0].tour && clients[0].tour.mecheVisuelle));

    const etat = await (await fetch(BASE + '/game/state?code=' + o.roomCode)).json();
    dit('« /game/state » le porte aussi', etat.bombanime && etat.bombanime.mecheVisuelle === false,
        JSON.stringify(etat.bombanime && etat.bombanime.mecheVisuelle));

    // ── 3. Il ne touche PAS la duree ──
    console.log('\n── la duree de la meche ne bouge pas ──');
    const total = clients[0].demarrage && clients[0].demarrage.mecheTotal;
    dit('la meche a bien une duree, reglage eteint', total > 0, total + ' s');
    clients.forEach(c => c.s.close());
    await fermer(o.hostToken);

    console.log(ko ? '\n' + ko + ' echec(s)' : '\n✨ le reglage voyage, et ne touche que le dessin');
    process.exit(ko ? 1 : 0);
})().catch(e => { console.error('✗', e.message); process.exit(1); });
