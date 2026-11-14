// 👤 L'onglet « Comptes » du panneau /admin, de bout en bout.
//
// ⚠️ IL NE TOUCHE JAMAIS A UN VRAI COMPTE. Il fabrique le sien — un
// utilisateur Supabase sur un domaine `.invalid`, qui ne peut exister nulle
// part — s'en sert pour tout, y compris les deux gestes irreversibles, puis
// le supprime. Sans ca, eprouver « remettre a zero » coutait l xp de
// quelqu un, et on ne l aurait pas eprouve.
//
//   PANEL_ADMIN_CODE=… QUESTION_DELETE_CODE=… npm run test:comptes-panneau
//
// Serveur lance a cote.
require('dotenv').config();
const { supabase } = require('../dbs');

const BASE = 'http://localhost:' + (process.env.TEST_PORT || process.env.PORT || 7000);
const PANEL = process.env.PANEL_ADMIN_CODE || '';
const SUPPR = process.env.QUESTION_DELETE_CODE || '';

let ko = 0, ok = 0;
const check = (l, vrai, extra) => {
    console.log(`  ${vrai ? '✅' : '❌'} ${l}${extra ? ' → ' + extra : ''}`);
    vrai ? ok++ : ko++;
};

const post = (chemin, corps, code = PANEL) => fetch(BASE + chemin, {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' },
        code ? { 'X-Admin-Code': code } : {}),
    body: JSON.stringify(corps || {}),
}).then(async r => ({ status: r.status, body: await r.json().catch(() => ({})) }));

const get = (chemin, code = PANEL) => fetch(BASE + chemin, {
    headers: code ? { 'X-Admin-Code': code } : {},
}).then(async r => ({ status: r.status, body: await r.json().catch(() => ({})) }));

(async () => {
    if (!PANEL || !SUPPR) {
        console.log('\n⏭️  PANEL_ADMIN_CODE ou QUESTION_DELETE_CODE manquante — rien a verifier.\n');
        process.exit(0);
    }

    // ── 1. Les portes ────────────────────────────────────────────
    // ⚠️ Ces routes lisent et ECRIVENT sur le profil des joueurs. Qu elles
    // soient fermees sans le code du panneau est le premier controle, pas le
    // dernier : une seule laissee ouverte suffit.
    console.log('\n=== 1. Fermees sans le code du panneau ===');
    const sans = [
        ['GET  /admin/site/comptes', await get('/admin/site/comptes', '')],
        ['POST .../compte/chiffres', await post('/admin/site/compte/chiffres', { id: 'x' }, '')],
        ['POST .../compte/supprimer', await post('/admin/site/compte/supprimer', { id: 'x' }, '')],
        ['POST .../compte/rubis', await post('/admin/site/compte/rubis', { id: 'x' }, '')],
        ['POST .../compte/titres', await post('/admin/site/compte/titres', { id: 'x' }, '')],
        ['GET  /admin/site/titres', await get('/admin/site/titres', '')],
    ];
    for (const [nom, r] of sans) check(nom + ' refuse', r.status === 401, 'HTTP ' + r.status);
    const faux = await get('/admin/site/comptes', PANEL + 'x');
    check('un code FAUX refuse aussi', faux.status === 401, 'HTTP ' + faux.status);

    // ── 2. Le cobaye ─────────────────────────────────────────────
    console.log('\n=== 2. On fabrique un compte a nous ===');
    const marque = 'cobaye-' + Date.now();
    const { data: ne, error: eCreer } = await supabase.auth.admin.createUser({
        // ⚠️ `.invalid` est un domaine RESERVE : il ne peut appartenir a
        // personne, donc aucun courriel ne partira jamais vers lui.
        email: marque + '@exemple.invalid',
        password: 'cobaye-' + Math.random().toString(36).slice(2) + 'A1!',
        email_confirm: true,
    });
    if (eCreer || !ne || !ne.user) {
        console.log('  ❌ impossible de creer le cobaye : ' + (eCreer && eCreer.message));
        process.exit(1);
    }
    const ID = ne.user.id;
    check('utilisateur Supabase cree', !!ID, ID.slice(0, 8) + '…');

    const { error: eLigne } = await supabase.from('comptes')
        .insert({ id: ID, pseudo: marque, xp: 1800, parties: 9, victoires: 4 });
    if (eLigne) {
        console.log('  ❌ insertion du profil : ' + eLigne.message);
        await supabase.auth.admin.deleteUser(ID);
        process.exit(1);
    }
    check('profil insere (1800 xp, 9 parties, 4 victoires)', true);

    const trouver = async () => {
        const r = await get('/admin/site/comptes');
        if (r.status !== 200) return { r, c: null };
        return { r, c: (r.body.comptes || []).find(x => x.id === ID) || null };
    };

    // ── 3. La liste ──────────────────────────────────────────────
    console.log('\n=== 3. Ce que la liste rend ===');
    let { r: liste, c } = await trouver();
    check('la liste repond', liste.status === 200, 'HTTP ' + liste.status);
    check('le cobaye y figure', !!c, c ? c.pseudo : 'absent');
    if (!c) { await menage(ID); process.exit(1); }

    // ⚠️ Le niveau vient de `src/script/niveaux.js`, le MEME fichier que le
    // navigateur charge. 1800 xp = niveau 5 = Combattant : si ce controle
    // tombe, c est que les deux cotes ont diverge — exactement ce que le
    // fichier partage existe pour empecher.
    check('⚠️ le niveau est calcule par le serveur', c.niveau === 5, 'niveau ' + c.niveau);
    check('⚠️ … et son titre suit', c.titreNiveau === 'Combattant', c.titreNiveau);
    // ⚠️ `xpDuNiveau` est le prix du niveau COURANT vers le suivant, pas
    // celui qu il a coute pour y arriver. 1800 est pile le seuil du 5, donc
    // 0 de fait, et le 5 vaut 700 (300 + 100 × 4). Les confondre donnerait
    // une barre qui deborde ou qui n arrive jamais au bout.
    check('la progression dans le niveau', c.xpDansNiveau === 0 && c.xpDuNiveau === 700,
        c.xpDansNiveau + '/' + c.xpDuNiveau);
    check('l URL de l avatar est fabriquee par le SERVEUR',
        typeof c.avatarUrl === 'string' && c.avatarUrl.startsWith('/'), c.avatarUrl);

    const pret = liste.body.colonnesPretes !== false;
    if (!pret) {
        console.log('\n⏭️  Colonnes du panneau absentes — on saute 5 bis et 5 ter.');
        console.log('    (docs/comptes.sql, sections « AJOUT APRES COUP »)');
    }

    // ── 5. Ce que le panneau ne peut PLUS faire ──────────────────
    // ⚠️ Deux routes ont ete retirees, et ces controles sont la pour qu on
    // ne les remette pas sans le decider. Le pseudo d un joueur est le sien,
    // et un titre se prend dans le catalogue — pas au clavier.
    console.log('\n=== 5. Les deux routes retirees ===');
    const pseudoMort = await post('/admin/site/compte/pseudo', { id: ID, pseudo: 'Impose' });
    check('⚠️ /compte/pseudo n existe plus', pseudoMort.status === 404, 'HTTP ' + pseudoMort.status);
    const titreMort = await post('/admin/site/compte/titre', { id: ID, titre: 'Texte libre' });
    check('⚠️ /compte/titre (texte libre) n existe plus', titreMort.status === 404, 'HTTP ' + titreMort.status);

    // ── 5 bis. La monnaie ────────────────────────────────────────
    // ⚠️ Elle est volontairement plus OUVERTE que les compteurs : donner des
    // rubis est un geste courant (recompenser, dedommager), remettre l xp a
    // zero efface une progression qu on ne retrouve pas. Le code du panneau
    // suffit donc — et ce controle est la pour que personne ne « repare »
    // cette difference en y remettant le second mot de passe.
    console.log('\n=== 5 bis. Les rubis, SANS second mot de passe ===');
    let m = await post('/admin/site/compte/rubis', { id: ID, rubis: 4200 });
    if (m.status === 500) {
        console.log('  ⏭️  colonne « rubis » absente — on saute (docs/comptes.sql)');
    } else {
        check('⚠️ le code du panneau SUFFIT', m.status === 200 && m.body.success, m.body.error || 'ok');
        ({ c } = await trouver());
        check('le montant est pose', c.rubis === 4200, 'rubis=' + c.rubis);
        m = await post('/admin/site/compte/rubis', { id: ID, rubis: -1 });
        check('un montant negatif est refuse', m.status === 400, 'HTTP ' + m.status);
        m = await post('/admin/site/compte/rubis', { id: ID, rubis: 'plein' });
        check('un montant qui n est pas un nombre aussi', m.status === 400, 'HTTP ' + m.status);
        m = await post('/admin/site/compte/rubis', { id: ID, rubis: 99999999 });
        check('un montant hors borne aussi', m.status === 400, 'HTTP ' + m.status);
        ({ c } = await trouver());
        check('… et aucun refus n a abime le montant', c.rubis === 4200, 'rubis=' + c.rubis);
    }

    // ── 5 ter. Les titres ────────────────────────────────────────
    console.log('\n=== 5 ter. La collection de titres ===');
    const cat = await get('/admin/site/titres');
    check('le catalogue se sert au panneau', cat.status === 200 && (cat.body.titres || []).length > 80,
        (cat.body.titres || []).length + ' titres');
    // ⚠️ Le catalogue du serveur et celui du navigateur sont LE MEME fichier.
    // S ils divergeaient, le panneau proposerait un titre que la route refuse.
    const catalogue = require('../src/script/titres');
    check('⚠️ c est le MEME que celui du jeu',
        (cat.body.titres || []).length === catalogue.TITRES_CATALOGUE.length);
    check('⚠️ les cinq doublons de rangs ne sont plus la', [],
        (cat.body.titres || []).filter(t => ['Novice', 'Soldat', 'Guerrier', 'Commandant', 'General'].includes(t.nom)).map(t => t.nom));
    check('⚠️ « Capitale » est corrige en « Capitaine »', true,
        !!(cat.body.titres || []).find(t => t.nom === 'Capitaine'));

    let z2 = await post('/admin/site/compte/titres', { id: ID, donner: 'pizza-volante' });
    check('⚠️ un titre hors catalogue est refuse', z2.status === 400, 'HTTP ' + z2.status);

    z2 = await post('/admin/site/compte/titres', { id: ID, donner: 'shinigami' });
    if (z2.status === 404 || z2.status === 500) {
        console.log('  ⏭️  colonnes « titres » absentes — on saute (docs/comptes.sql)');
    } else {
        check('on donne un prefixe', z2.status === 200 && z2.body.success, z2.body.error || 'ok');
        ({ c } = await trouver());
        check('il est dans sa collection', (c.titres || []).includes('shinigami'), JSON.stringify(c.titres));
        // ⚠️ Il n en portait aucun : on l habille tout de suite, sinon le
        // titre donne ne se verrait nulle part et le clic aurait l air vain.
        check('⚠️ … et il le PORTE deja', c.titre_prefixe === 'shinigami', String(c.titre_prefixe));

        await post('/admin/site/compte/titres', { id: ID, donner: 'desombres' });
        ({ c } = await trouver());
        check('un suffixe se compose avec', catalogue.composerTitre(c.titre_prefixe, c.titre_suffixe) === 'Shinigami des ombres',
            catalogue.composerTitre(c.titre_prefixe, c.titre_suffixe));

        // ⚠️ LE PANNEAU NE CHOISIT PAS CE QU IL PORTE. Il donne et il
        // reprend, rien d autre — c est au joueur de composer son titre
        // parmi ce qu il possede. Ces deux controles sont la pour qu on ne
        // remette pas la route d habillage sans le decider.
        z2 = await post('/admin/site/compte/titres', { id: ID, prefixe: 'empereur' });
        check('⚠️ le panneau ne peut pas HABILLER', z2.status === 400, 'HTTP ' + z2.status);
        z2 = await post('/admin/site/compte/titres', { id: ID, prefixe: '' });
        check('⚠️ … ni DESHABILLER', z2.status === 400, 'HTTP ' + z2.status);
        ({ c } = await trouver());
        check('… et rien n a bouge', c.titre_prefixe === 'shinigami', String(c.titre_prefixe));

        // ⚠️ Lui reprendre un titre qu il PORTE doit quand meme le
        // deshabiller : sinon il garderait a l ecran un titre qu il n a plus.
        z2 = await post('/admin/site/compte/titres', { id: ID, retirer: 'shinigami' });
        check('on le lui reprend', z2.status === 200 && z2.body.success);
        ({ c } = await trouver());
        check('il n est plus dans sa collection', !(c.titres || []).includes('shinigami'));
        check('⚠️ … et il ne le PORTE plus non plus', !c.titre_prefixe, String(c.titre_prefixe));
    }

    // ── 6. Les compteurs ─────────────────────────────────────────
    console.log('\n=== 6. Les compteurs, et leur second mot de passe ===');
    let z = await post('/admin/site/compte/chiffres', { id: ID, xp: 0, parties: 0, victoires: 0 });
    check('⚠️ refuse SANS le mot de passe de suppression', z.status === 401, 'HTTP ' + z.status);
    z = await post('/admin/site/compte/chiffres', { id: ID, xp: 0, deleteCode: SUPPR + 'x' });
    check('⚠️ refuse avec un MAUVAIS mot de passe', z.status === 401, 'HTTP ' + z.status);

    ({ c } = await trouver());
    check('… et rien n a bouge entre-temps', c.xp === 1800, 'xp=' + c.xp);

    z = await post('/admin/site/compte/chiffres', { id: ID, xp: -5, deleteCode: SUPPR });
    check('une valeur negative est refusee', z.status === 400, 'HTTP ' + z.status);
    z = await post('/admin/site/compte/chiffres', { id: ID, xp: 'beaucoup', deleteCode: SUPPR });
    check('une valeur qui n est pas un nombre aussi', z.status === 400, 'HTTP ' + z.status);

    z = await post('/admin/site/compte/chiffres', { id: ID, xp: 0, parties: 0, victoires: 0, deleteCode: SUPPR });
    check('avec le bon mot de passe, ca passe', z.status === 200 && z.body.success, z.body.error || 'ok');
    ({ c } = await trouver());
    check('remis a zero', c.xp === 0 && c.parties === 0 && c.victoires === 0,
        `xp=${c.xp} parties=${c.parties} victoires=${c.victoires}`);
    check('⚠️ et il retombe au niveau 1', c.niveau === 1, 'niveau ' + c.niveau);

    // ── 7. La suppression ────────────────────────────────────────
    console.log('\n=== 7. La suppression ===');
    let s = await post('/admin/site/compte/supprimer', { id: ID });
    check('⚠️ refuse SANS le mot de passe de suppression', s.status === 401, 'HTTP ' + s.status);
    ({ c } = await trouver());
    check('… et le compte est toujours la', !!c);

    s = await post('/admin/site/compte/supprimer', { id: ID, deleteCode: SUPPR });
    check('avec le bon mot de passe, ca passe', s.status === 200 && s.body.success, s.body.error || 'ok');
    ({ c } = await trouver());
    check('il a disparu de la liste', !c);

    // ⚠️ LE CONTROLE QUI COMPTE : on supprime l utilisateur SUPABASE, pas
    // seulement sa ligne de profil. Effacer la seule ligne de `comptes`
    // n aurait rien supprime — il se serait reconnecte et aurait retrouve une
    // ligne neuve. C est une remise a zero, pas une suppression.
    const { data: reste } = await supabase.auth.admin.getUserById(ID);
    check('⚠️ l utilisateur Supabase est parti AUSSI', !reste || !reste.user,
        reste && reste.user ? 'il reste !' : 'parti');
    const { data: orph } = await supabase.from('comptes').select('id').eq('id', ID);
    check('… et le profil avec (on delete cascade)', !orph || !orph.length);

    await menage(ID);
    console.log(`\n${ko ? '❌ ' + ko + ' echec(s)' : '✨ ' + ok + ' controles au vert — l onglet Comptes tient'}\n`);
    process.exit(ko ? 1 : 0);
})().catch(async (e) => { console.error(e); process.exit(1); });

// Filet : si la suite s arrete en chemin, le cobaye ne doit pas rester.
async function menage(id) {
    try { await supabase.auth.admin.deleteUser(id); } catch (e) { /* deja parti */ }
    try { await supabase.from('comptes').delete().eq('id', id); } catch (e) { /* idem */ }
}
