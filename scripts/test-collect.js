// 🎴 Le moteur de Collect, sans serveur : les règles tiennent-elles, et le
// serveur laisse-t-il fuir une main ?
//
// Une main cachée est le cœur du mode — le scan n'a de valeur que parce qu'on
// ne voit pas les cartes des autres. Ce fichier vérifie donc surtout ça, en
// plus des règles.
const C = require('../server-collect');

let ko = 0;
const check = (l, ok, extra) => { console.log(`${ok ? '✅' : '❌'} ${l}${extra ? ' → ' + extra : ''}`); if (!ok) ko++; };

const joueurs = ['alice', 'bob', 'chloe', 'driss'];
const neuf = (main = 4, nbAnimes = 10) => {
    const e = C.etatNeuf();
    e.main = main;
    e.nbAnimes = nbAnimes;
    C.demarrer(e, joueurs);
    return e;
};

console.log('── La mise en place ──');
{
    const e = neuf();
    const r = C.regles(e);
    check('chaque joueur a sa main', joueurs.every(j => e.mains.get(j).length === r.main), r.main + ' cartes');
    check('le marché est servi', e.marche.length === C.CONFIG.MARCHE, e.marche.length + ' cartes');
    check('le bon nombre d\'animes est tiré', e.animes.length === 10, e.animes.join(', '));
    check('chaque anime tiré existe vraiment', e.animes.every(a => C._data.animes.includes(a)));
    check('un joueur commence', joueurs.includes(e.tourJoueur), e.tourJoueur);

    // toutes les cartes distribuées portent un identifiant unique
    const uids = [...joueurs.flatMap(j => e.mains.get(j)), ...e.marche].map(c => c.uid);
    check('aucun doublon d\'identifiant', new Set(uids).size === uids.length, uids.length + ' cartes en jeu');
}

console.log('\n── Le tour de table ──');
{
    const e = neuf();
    const autre = joueurs.find(j => j !== e.tourJoueur);
    const vole = C.actionPiocher(e, autre);
    check('on ne joue pas hors de son tour', !vole.ok, vole.erreur);

    const premier = e.tourJoueur;
    const sans = C.actionPiocher(e, premier);
    check('piocher sans dire quoi rendre est refusé', !sans.ok, sans.erreur);

    const rendue = e.mains.get(premier)[0].uid;
    C.actionPiocher(e, premier, rendue);
    check('le tour passe au suivant', e.tourJoueur !== premier, premier + ' → ' + e.tourJoueur);
    check('la main garde sa taille après une pioche',
        e.mains.get(premier).length === C.regles(e).main, e.mains.get(premier).length + ' cartes');
    check('la carte lâchée a quitté la main', !e.mains.get(premier).some(c => c.uid === rendue));
    // elle ne repart pas dans le paquet : elle doit profiter à quelqu'un
    check('… et se retrouve au marché', e.marche.some(c => c.uid === rendue));
    check('le marché garde sa taille', e.marche.length === C.CONFIG.MARCHE, e.marche.length + ' cartes');
}

console.log('\n── Le marché ──');
{
    const e = neuf();
    const j = e.tourJoueur;
    const avant = e.marche.length;
    const uidMain = e.mains.get(j)[0].uid;
    const uidMarche = e.marche[0].uid;
    const r = C.actionEchanger(e, j, uidMain, uidMarche);
    check('l\'échange se fait', r.ok, r.erreur || r.prise.nom);
    check('le marché garde sa taille', e.marche.length === avant, e.marche.length + ' cartes');
    check('la carte prise est en main', e.mains.get(j).some(c => c.uid === uidMarche));
    check('la carte rendue est au marché', e.marche.some(c => c.uid === uidMain));
    check('la main garde sa taille', e.mains.get(j).length === C.regles(e).main);

    const encore = C.actionEchanger(e, j, uidMain, uidMarche);
    check('on n\'échange pas deux fois dans le tour', !encore.ok, encore.erreur);
}

console.log('\n── Le vol : le duel à l\'aveugle ──');
{
    const carte = (anime, classe, uid) => ({ uid, id: uid, nom: uid, anime, classe, img: 'x.webp' });
    // On fabrique la situation à la main pour l'éprouver exactement. Les animes
    // sont tirés au sort à chaque partie : on prend ceux de CELLE-CI.
    const table = (mainsA, mainsB) => {
        const e = neuf();
        const [a, b] = [e.tourJoueur, joueurs.find(j => j !== e.tourJoueur)];
        e.mains.set(a, mainsA(e.animes));
        e.mains.set(b, mainsB(e.animes));
        return { e, a, b, A1: e.animes[0], A2: e.animes[1] };
    };

    // ── L'attaque ouvre un duel, elle ne tranche rien ──
    {
        const { e, a, b, A1, A2 } = table(
            (an) => [carte(an[1], 'assaut', 'A1'), carte(an[1], 'oracle', 'A2')],
            (an) => [carte(an[0], 'mirage', 'B1'), carte(an[0], 'assaut', 'B2')]);
        void A2;
        const r = C.actionVoler(e, a, b, A1, 'A1');
        check('l\'attaque ouvre un duel', r.ok && r.duel === true, r.erreur || (r.choix + ' défense(s) possible(s)'));
        check('le tour n\'a pas encore tourné', e.tourJoueur === a, e.tourJoueur);
        check('plus personne ne joue pendant le duel', !C.actionPiocher(e, a, 'A2').ok,
            C.actionPiocher(e, a, 'A2').erreur);

        // c'est tout l'intérêt du vol à l'aveugle : la classe attaquante est secrète
        const pub = JSON.stringify(C.vuePublique(e));
        check('le duel est annoncé à la table', C.vuePublique(e).duel && C.vuePublique(e).duel.anime === A1, A1);
        check('… mais la carte d\'attaque reste cachée', !pub.includes('"A1"'));
        const vueCible = JSON.stringify(C.vueJoueur(e, b));
        check('… y compris pour la cible', !vueCible.includes('"A1"'));
    }

    // ── La défense domine : l'attaquant perd sa carte ──
    {
        const { e, a, b, A1 } = table(
            (an) => [carte(an[1], 'assaut', 'A1'), carte(an[1], 'oracle', 'A2')],
            (an) => [carte(an[0], 'oracle', 'B1'), carte(an[0], 'mirage', 'B2')]);
        C.actionVoler(e, a, b, A1, 'A1');
        // oracle bat assaut
        const d = C.actionDefendre(e, b, 'B1');
        check('la défense qui domine l\'emporte', d.ok && d.issue === 'perdu', d.issue || d.erreur);
        check('l\'attaquant perd sa carte', !e.mains.get(a).some(c => c.uid === 'A1'));
        check('… elle repart au paquet, pas au marché',
            !e.marche.some(c => c.uid === 'A1') && e.pioche.some(c => c.uid === 'A1'));
        check('la cible ne perd rien', e.mains.get(b).length === 2, e.mains.get(b).map(c => c.uid).join());
        check('la main de l\'attaquant s\'ouvre d\'une place', e.mains.get(a).length === 1);
        check('le duel est refermé et le tour passe', !e.duel && e.tourJoueur !== a);
    }

    // ── L'attaque domine : la carte change de main ──
    {
        const { e, a, b, A1 } = table(
            (an) => [carte(an[1], 'assaut', 'A1'), carte(an[1], 'oracle', 'A2')],
            (an) => [carte(an[0], 'mirage', 'B1'), carte(an[0], 'assaut', 'B2')]);
        C.actionVoler(e, a, b, A1, 'A1');
        // assaut bat mirage
        const d = C.actionDefendre(e, b, 'B1');
        check('l\'attaque qui domine emporte la carte', d.ok && d.issue === 'gagne', d.issue || d.erreur);
        check('la carte volée est en main du voleur', e.mains.get(a).some(c => c.uid === 'B1'));
        check('la cible l\'a bien perdue', !e.mains.get(b).some(c => c.uid === 'B1'));
        check('la carte d\'attaque repart au paquet',
            e.pioche.some(c => c.uid === 'A1') && !e.marche.some(c => c.uid === 'A1'));
        check('les deux mains gardent leur compte',
            e.mains.get(a).length === 2 && e.mains.get(b).length === 1,
            e.mains.get(a).length + ' / ' + e.mains.get(b).length);
    }

    // ── Même classe : rien ne bouge ──
    {
        const { e, a, b, A1 } = table(
            (an) => [carte(an[1], 'assaut', 'A1'), carte(an[1], 'oracle', 'A2')],
            (an) => [carte(an[0], 'assaut', 'B1'), carte(an[0], 'oracle', 'B2')]);
        C.actionVoler(e, a, b, A1, 'A1');
        const d = C.actionDefendre(e, b, 'B1');
        check('même classe : match nul', d.ok && d.issue === 'nul', d.issue || d.erreur);
        check('personne ne perd de carte',
            e.mains.get(a).length === 2 && e.mains.get(b).length === 2);
        check('l\'attaquant garde la sienne', e.mains.get(a).some(c => c.uid === 'A1'));
        check('… mais il a perdu son tour', e.tourJoueur !== a);
    }

    // ── La cible n'a rien de la série : tranché sans l'attendre ──
    {
        const { e, a, b, A1 } = table(
            (an) => [carte(an[1], 'assaut', 'A1')],
            (an) => [carte(an[2], 'mirage', 'B1'), carte(an[3], 'assaut', 'B2')]);
        const r = C.actionVoler(e, a, b, A1, 'A1');
        check('sans carte de la série, aucun duel ne s\'ouvre', r.ok && r.issue === 'vide' && !e.duel, r.issue);
        check('l\'attaquant garde sa carte', e.mains.get(a).some(c => c.uid === 'A1'));
        check('… et perd seulement son tour', e.tourJoueur !== a);
    }

    // ── Qui peut défendre, et avec quoi ──
    {
        const { e, a, b, A1 } = table(
            (an) => [carte(an[1], 'assaut', 'A1')],
            (an) => [carte(an[0], 'mirage', 'B1'), carte(an[2], 'assaut', 'B2')]);
        C.actionVoler(e, a, b, A1, 'A1');
        const parA = C.actionDefendre(e, a, 'A1');
        check('l\'attaquant ne défend pas à la place de sa cible', !parA.ok, parA.erreur);
        const horsSerie = C.actionDefendre(e, b, 'B2');
        check('on ne défend pas avec une autre série', !horsSerie.ok, horsSerie.erreur);
        check('le duel est toujours ouvert', !!e.duel);
        const bon = C.actionDefendre(e, b, 'B1');
        check('la bonne carte le referme', bon.ok && !e.duel, bon.issue);
    }

    // ── L'absent ──
    {
        const { e, a, b, A1 } = table(
            (an) => [carte(an[1], 'assaut', 'A1')],
            (an) => [carte(an[0], 'mirage', 'B1'), carte(an[0], 'oracle', 'B2')]);
        C.actionVoler(e, a, b, A1, 'A1');
        const d = C.defenseParDefaut(e);
        check('une cible qui ne répond pas présente une carte au hasard',
            d.ok && ['gagne', 'perdu', 'nul'].includes(d.issue), d.issue);
        check('le duel se referme quand même', !e.duel && e.tourJoueur !== a);
    }

    // ── Le triangle, exhaustivement ──
    {
        const attendu = { assaut: 'mirage', mirage: 'oracle', oracle: 'assaut' };
        let triangleOk = true;
        for (const att of Object.keys(attendu)) for (const def of Object.keys(attendu)) {
            if (C.domine(att, def) !== (attendu[att] === def)) triangleOk = false;
        }
        check('le triangle est bien un cycle, sans égalité', triangleOk, 'assaut > mirage > oracle > assaut');

        // et le moteur le respecte à la lettre, sur les neuf combinaisons
        let issuesOk = true; const vues = [];
        for (const ca of Object.keys(attendu)) for (const cd of Object.keys(attendu)) {
            const { e, a, b, A1 } = table(
                (an) => [carte(an[1], ca, 'A1'), carte(an[1], 'assaut', 'A2')],
                (an) => [carte(an[0], cd, 'B1')]);
            C.actionVoler(e, a, b, A1, 'A1');
            const d = C.actionDefendre(e, b, 'B1');
            const veut = ca === cd ? 'nul' : (attendu[ca] === cd ? 'gagne' : 'perdu');
            if (d.issue !== veut) { issuesOk = false; vues.push(ca + '/' + cd + '→' + d.issue); }
        }
        check('les neuf duels possibles tombent juste', issuesOk, vues.join(' ') || '9/9');
    }

    // ── On ne vole ni soi-même, ni une série absente ──
    {
        const e = neuf();
        const j = e.tourJoueur;
        const soi = C.actionVoler(e, j, j, e.animes[0], e.mains.get(j)[0].uid);
        check('on ne se vole pas soi-même', !soi.ok, soi.erreur);
        const hors = C.actionVoler(e, j, joueurs.find(x => x !== j), 'SerieQuiNExistePas', e.mains.get(j)[0].uid);
        check('on ne vole pas une série hors partie', !hors.ok, hors.erreur);
    }
}

console.log('\n── Poser un set ──');
{
    const e = neuf();
    const j = e.tourJoueur;
    const r = C.regles(e);
    const carte = (i) => ({ uid: 'S' + i, id: 'S' + i, nom: 'S' + i, anime: 'Naruto', classe: 'assaut', img: 'x.webp' });
    e.mains.set(j, [...Array.from({ length: r.taille }, (_, i) => carte(i)), { uid: 'Z', id: 'Z', nom: 'Z', anime: 'Bleach', classe: 'oracle', img: 'x.webp' }]);

    const trop = C.actionPoser(e, j, 'Bleach');
    check('un set incomplet est refusé', !trop.ok, trop.erreur);

    const p = C.actionPoser(e, j, 'Naruto');
    const apres = e.mains.get(j);
    check('le set se pose', p.ok, p.erreur);
    check('les cartes posées quittent la main',
        !apres.some(c => c.uid.startsWith('S')), apres.map(c => c.uid).join(' '));
    check('la carte d\'un autre anime est gardée', apres.some(c => c.uid === 'Z'));
    // sans quoi celui qui vient de bien faire se retrouve sans rien pour jouer
    check('la main se refait aussitôt', apres.length === r.main, apres.length + '/' + r.main + ' cartes');
    check('le set est compté', e.sets.get(j).length === 1);
}

console.log('\n── La victoire ──');
{
    const e = neuf();
    const r = C.regles(e);
    const j = e.tourJoueur;
    const faire = (anime, n) => Array.from({ length: n }, (_, i) => ({ uid: anime + i, id: anime + i, nom: anime + i, anime, classe: 'assaut', img: 'x.webp' }));

    for (let s = 0; s < r.sets; s++) {
        e.tourJoueur = j;
        e.mains.set(j, faire('Naruto', r.taille));
        const p = C.actionPoser(e, j, 'Naruto');
        if (s < r.sets - 1) check(`le set ${s + 1} ne suffit pas`, !p.vainqueur && e.active);
        else check(`le set ${r.sets} donne la victoire`, p.vainqueur === j, p.vainqueur);
    }
    check('la partie se ferme', !e.active);
    check('rien ne se joue après la fin', !C.actionPiocher(e, j).ok);
}

console.log('\n── Ce que le serveur laisse voir ──');
{
    const e = neuf();
    const pub = JSON.stringify(C.vuePublique(e));
    const mains = joueurs.flatMap(j => e.mains.get(j));
    const fuites = mains.filter(c => pub.includes('"' + c.uid + '"'));
    check('la vue publique ne livre aucune carte en main', fuites.length === 0,
        fuites.length ? fuites.slice(0, 3).map(c => c.nom).join(', ') : mains.length + ' cartes cachées');
    check('elle ne donne que le nombre de cartes',
        C.vuePublique(e).joueurs.every(p => typeof p.cartes === 'number' && !p.main));

    const vue = C.vueJoueur(e, 'alice');
    check('un joueur voit sa propre main', vue.main.length === C.regles(e).main);
    const autres = joueurs.filter(j => j !== 'alice').flatMap(j => e.mains.get(j));
    const vueTxt = JSON.stringify(vue);
    check('… et aucune de celles des autres',
        autres.every(c => !vueTxt.includes('"' + c.uid + '"')), autres.length + ' cartes adverses cachées');

    // le scan est le seul chemin par lequel une main sort, et seulement vers lui
    const s = C.actionScanner(e, e.tourJoueur, joueurs.find(j => j !== e.tourJoueur));
    check('le scan rend bien la main visée', s.ok && Array.isArray(s.main) && s.main.length > 0, s.main && s.main.length + ' cartes');
    const apres = JSON.stringify(C.vuePublique(e));
    check('… sans que le salon en sache rien', s.main.every(c => !apres.includes('"' + c.uid + '"')));
}

console.log('\n── La pioche ne s\'épuise jamais ──');
{
    const e = neuf(4, 8);
    let vides = 0;
    for (let i = 0; i < 3000; i++) {
        const avant = e.pioche.length;
        const c = (function () { if (!e.pioche.length) vides++; return e.pioche.length ? e.pioche.pop() : null; })();
        if (!c) { // on rejoue le remélange du moteur
            e.tourJoueur = e.ordre[0];
            e.mains.set(e.ordre[0], []);
            C.actionPiocher(e, e.ordre[0]);
        }
        void avant;
    }
    // le vrai contrôle : trois mille pioches d'affilée par le moteur
    const e2 = neuf(4, 8);
    let manquee = 0;
    for (let i = 0; i < 3000; i++) {
        const j = e2.tourJoueur;
        e2.mains.set(j, []);
        const r = C.actionPiocher(e2, j, (e2.mains.get(j)[0] || {}).uid);
        if (!r.ok) manquee++;
    }
    check('trois mille pioches d\'affilée sans rupture', manquee === 0, manquee + ' échec(s)');
}

console.log('\n── Les trois barèmes ──');
{
    // L'hôte ne règle que la taille de main ; l'objectif suit. Le seul
    // invariant qui compte : il doit rester au moins une carte de réserve,
    // sinon il faudrait toute la main d'un seul anime pour poser.
    for (const n of C.CONFIG.MAINS_POSSIBLES) {
        const b = C.BAREMES[n];
        check(`main de ${n} : « ${b.resume} » laisse de la réserve`, b && b.main > b.taille,
            b ? `${b.sets} × ${b.taille}, main ${b.main}` : 'barème absent');
    }
    check('chaque taille proposée a son barème',
        C.CONFIG.MAINS_POSSIBLES.every(n => C.BAREMES[n]), C.CONFIG.MAINS_POSSIBLES.join(', '));
    check('la main par défaut est l\'entre-deux',
        C.CONFIG.MAIN_DEFAUT === 4 && C.BAREMES[4], String(C.CONFIG.MAIN_DEFAUT));
    check('aucun barème ne descend sous 8 animes', C.CONFIG.ANIMES_POSSIBLES.every(n => n >= 8),
        C.CONFIG.ANIMES_POSSIBLES.join(', '));
}

console.log('\n── Une partie entière se termine ──');
{
    let sansVainqueur = 0, total = 0;
    const PARTIES = 400;
    for (let p = 0; p < PARTIES; p++) {
        const e = neuf(4, 10);
        let tours = 0;
        while (e.active && tours < 600) {
            tours++;
            const j = e.tourJoueur;
            const main = e.mains.get(j);
            const par = {};
            for (const c of main) (par[c.anime] = par[c.anime] || []).push(c);
            const r = C.regles(e);

            const pret = Object.keys(par).find(a => par[a].length >= r.taille);
            if (pret) { C.actionPoser(e, j, pret); continue; }

            const vise = Object.keys(par).sort((x, y) => par[y].length - par[x].length)[0];
            const iM = e.marche.findIndex(c => c.anime === vise);
            if (iM >= 0) {
                const rendre = main.find(c => par[c.anime].length === 1 && c.anime !== vise) || main[main.length - 1];
                C.actionEchanger(e, j, rendre.uid, e.marche[iM].uid);
                continue;
            }
            // Le vol. Le joueur simulé se comporte comme quelqu'un qui a scanné :
            // il ne frappe que là où la série se trouve, et choisit la classe qui
            // bat le plus des cartes visées. C'est délibéré — attaquer à l'aveugle
            // ne réussit qu'une fois sur cent et ferait échouer une partie sur
            // quatre, ce qui mesurerait la bêtise du robot, pas le jeu.
            //
            // En face, la défense est tirée au hasard, et c'est juste : à
            // l'aveugle, aucune réponse n'est meilleure qu'une autre.
            {
                const armes = main.filter(c => c.anime !== vise);
                let cible = null, arme = null;
                for (const k of e.ordre) {
                    if (k === j) continue;
                    const chez = e.mains.get(k).filter(c => c.anime === vise);
                    if (!chez.length) continue;
                    let meilleure = null, score = 0;
                    for (const a of armes) {
                        const n = chez.filter(c => C.domine(a.classe, c.classe)).length
                                - chez.filter(c => C.domine(c.classe, a.classe)).length;
                        if (n > score) { score = n; meilleure = a; }
                    }
                    if (meilleure) { cible = k; arme = meilleure; break; }
                }
                if (cible && arme) {
                    const r2 = C.actionVoler(e, j, cible, vise, arme.uid);
                    if (r2.ok && r2.duel) C.defenseParDefaut(e);
                    if (r2.ok) continue;
                }
            }
            {
                const par2 = {};
                for (const c of main) par2[c.anime] = (par2[c.anime] || 0) + 1;
                const isolee = main.find(c => par2[c.anime] === 1) || main[main.length - 1];
                C.actionPiocher(e, j, isolee ? isolee.uid : null);
                continue;
            }
            const rendre = main[Math.floor(Math.random() * main.length)];
            C.actionEchanger(e, j, rendre.uid, e.marche[Math.floor(Math.random() * e.marche.length)].uid);
        }
        total += Math.ceil(tours / joueurs.length);
        if (!e.vainqueur) sansVainqueur++;
    }
    const moy = (total / PARTIES).toFixed(1);
    check('presque toutes les parties trouvent un vainqueur', sansVainqueur / PARTIES < 0.05,
        (sansVainqueur / PARTIES * 100).toFixed(1) + ' % sans vainqueur');
    check('la partie dure ce qui était annoncé', moy >= 3 && moy <= 12, moy + ' manches en moyenne');
}

console.log(ko ? `\n💥 ${ko} contrôle(s) en échec` : '\n✨ Le moteur de Collect tient, et ne montre aucune main');
process.exit(ko ? 1 : 0);
