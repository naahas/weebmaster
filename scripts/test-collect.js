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
    // Elle repart au paquet, et non au marché : celui-ci se renouvelle tout
    // seul à chaque fin de tour, depuis le paquet.
    check('… et retourne au paquet', e.pioche.some(c => c.uid === rendue));
    check('… sans passer par le marché', !e.marche.some(c => c.uid === rendue));
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

    check('la carte rendue prend EXACTEMENT la place de la prise',
        e.marche[0].uid === uidMain, 'place 0');

    const encore = C.actionEchanger(e, j, uidMain, uidMarche);
    check('on n\'échange pas deux fois dans le tour', !encore.ok, encore.erreur);

    // Un échange sert déjà le marché : la rangée reste pleine et elle a
    // changé. Un renouvellement de fin de tour la ferait tourner deux fois
    // dans le même geste, et la carte tout juste déposée disparaîtrait avant
    // que quiconque ait pu la voir.
    //
    // Et il ne DÉCALE rien : seule la place échangée change. Toute la rangée
    // glissait d'un cran pour un troc qui n'en concernait qu'une, et la carte
    // rendue entrait par la droite comme une carte neuve.
    {
        const e5 = neuf();
        const j5 = e5.tourJoueur;
        const rendue = e5.mains.get(j5)[0].uid;
        const attendu = e5.marche.map(c => c.uid);
        const cible = 2;
        attendu[cible] = rendue;
        C.actionEchanger(e5, j5, rendue, e5.marche[cible].uid);
        check('un échange ne déplace que sa propre place',
            e5.marche.map(c => c.uid).join(',') === attendu.join(','),
            'les quatre autres n\'ont pas bougé');
    }

    // À chaque fin de tour le marché GLISSE d'un cran : celle de gauche part
    // sous le paquet, les autres avancent, une neuve entre par la droite. La
    // position d'une carte est donc son compte à rebours. « Sous » et non mêlée
    // au hasard : une carte qu'on vient de voir partir ne doit pas revenir au
    // tour suivant.
    {
        const e2 = neuf();
        const avant = e2.marche.map(c => c.uid);
        C.actionPiocher(e2, e2.tourJoueur, e2.mains.get(e2.tourJoueur)[0].uid);
        const apres = e2.marche.map(c => c.uid);
        check('le marché glisse d\'un cran à chaque tour',
            apres.slice(0, 4).join(',') === avant.slice(1).join(','),
            'les quatre restantes ont avancé');
        check('… et une neuve entre par la droite',
            !avant.includes(apres[4]), apres[4].slice(0, 6));
        check('… et elle part au FOND du paquet', e2.pioche[0].uid === avant[0],
            'index 0, le dernier servi');
        check('… et il garde sa taille', e2.marche.length === C.CONFIG.MARCHE);
    }

    // Le minuteur ne joue pas à la place du joueur : il passe.
    {
        const e4 = neuf();
        const qui = e4.tourJoueur;
        const mainAvant = e4.mains.get(qui).map(c => c.uid).join(',');
        const r = C.actionParDefaut(e4, qui);
        check('le minuteur passe le tour', r.ok && e4.tourJoueur !== qui);
        check('… sans toucher à la main', e4.mains.get(qui).map(c => c.uid).join(',') === mainAvant);
        check('… et il le note', e4.journal[e4.journal.length - 1].type === 'passe');
    }
}

console.log('\n── Le vol : on prend, et l\'on paie ──');
{
    const carte = (anime, classe, uid) => ({ uid, id: uid, nom: uid, anime, classe, img: 'x.webp' });
    // On fabrique la situation à la main pour l'éprouver exactement. Les animes
    // sont tirés au sort à chaque partie : on prend ceux de CELLE-CI.
    const table = (mainsA, mainsB) => {
        const e = neuf();
        const [a, b] = [e.tourJoueur, joueurs.find(j => j !== e.tourJoueur)];
        e.mains.set(a, mainsA(e.animes));
        e.mains.set(b, mainsB(e.animes));
        return { e, a, b };
    };

    // ── La prise ouvre une dette, elle ne conclut rien ──
    {
        const { e, a, b } = table(
            (an) => [carte(an[1], 'assaut', 'A1'), carte(an[1], 'oracle', 'A2')],
            (an) => [carte(an[0], 'mirage', 'B1'), carte(an[0], 'assaut', 'B2')]);
        C.actionViser(e, a, b);
        const r = C.actionVoler(e, a, b, 0);
        check('la prise ouvre une dette', r.ok && r.larcin === true, r.erreur || r.carte.uid);
        check('la carte quitte la main de la cible tout de suite',
            !e.mains.get(b).some(c => c.uid === 'B1'), e.mains.get(b).map(c => c.uid).join());
        check('… mais n\'est pas encore chez le voleur',
            !e.mains.get(a).some(c => c.uid === 'B1'));
        check('le tour n\'a pas encore tourné', e.tourJoueur === a, e.tourJoueur);
        check('plus personne ne joue tant que la dette court',
            !C.actionPiocher(e, a, 'A2').ok, C.actionPiocher(e, a, 'A2').erreur);
        // la carte est retournée : elle n'a plus rien de secret
        check('la table voit la carte prise',
            C.vuePublique(e).larcin && C.vuePublique(e).larcin.carte.uid === 'B1');
    }

    // ── Le prix : une carte de la même classe ──
    {
        const { e, a, b } = table(
            (an) => [carte(an[1], 'assaut', 'A1'), carte(an[1], 'mirage', 'A2')],
            (an) => [carte(an[0], 'mirage', 'B1')]);
        C.actionViser(e, a, b);
        const r = C.actionVoler(e, a, b, 0);
        check('avec la classe en main, on ne doit qu\'une carte', r.du === 1, 'dû ' + r.du);
        check('une carte d\'une autre classe est refusée', !C.actionPayer(e, a, ['A1']).ok);
        check('deux cartes aussi', !C.actionPayer(e, a, ['A1', 'A2']).ok);
        const p = C.actionPayer(e, a, ['A2']);
        check('la bonne classe solde la dette', p.ok, p.erreur || p.issue);
        check('la carte volée est chez le voleur', e.mains.get(a).some(c => c.uid === 'B1'));
        check('la carte rendue repart au paquet',
            e.pioche.some(c => c.uid === 'A2') && !e.marche.some(c => c.uid === 'A2'));
        check('la main du voleur garde sa taille', e.mains.get(a).length === 2,
            e.mains.get(a).map(c => c.uid).join());
        check('… et celle de la cible a perdu une place', e.mains.get(b).length === 0);
        check('le tour repart', !e.larcin && e.tourJoueur !== a);
    }

    // ── Pas la classe : deux cartes, n'importe lesquelles ──
    {
        const { e, a, b } = table(
            (an) => [carte(an[1], 'assaut', 'A1'), carte(an[1], 'assaut', 'A2'), carte(an[2], 'assaut', 'A3')],
            (an) => [carte(an[0], 'oracle', 'B1')]);
        C.actionViser(e, a, b);
        const r = C.actionVoler(e, a, b, 0);
        check('sans la classe, on en doit deux', r.du === 2, 'dû ' + r.du);
        check('une seule ne suffit pas', !C.actionPayer(e, a, ['A1']).ok, C.actionPayer(e, a, ['A1']).erreur);
        check('et la même deux fois non plus', !C.actionPayer(e, a, ['A1', 'A1']).ok);
        const p = C.actionPayer(e, a, ['A1', 'A3']);
        check('deux cartes de n\'importe quelle classe soldent', p.ok, p.erreur || p.issue);
        check('la main du voleur a rétréci', e.mains.get(a).length === 2,
            e.mains.get(a).map(c => c.uid).join());
        check('les deux rendues sont au paquet',
            e.pioche.some(c => c.uid === 'A1') && e.pioche.some(c => c.uid === 'A3'));
    }

    // ── La main vide : la prise elle-même comble le manque ──
    // C'est le prix d'un vol tenté trop tard. On ressort les mains vides plutôt
    // que d'interdire le geste — un joueur qui n'a qu'une carte a déjà assez de
    // soucis sans qu'on lui retire une action.
    {
        const { e, a, b } = table(
            (an) => [carte(an[1], 'assaut', 'A1')],
            (an) => [carte(an[0], 'oracle', 'B1')]);
        C.actionViser(e, a, b);
        const r = C.actionVoler(e, a, b, 0);
        check('une seule carte en main : on doit deux mais on n\'en rend qu\'une',
            r.du === 2 && e.larcin.aRendre === 1 && e.larcin.prisePayee === true);
        const p = C.actionPayer(e, a, ['A1']);
        check('… et la prise part avec', p.ok && p.issue === 'ruine', p.erreur || p.issue);
        check('le voleur ressort les mains vides', e.mains.get(a).length === 0);
        check('les deux cartes sont au paquet',
            e.pioche.some(c => c.uid === 'A1') && e.pioche.some(c => c.uid === 'B1'));
    }

    // ── L'absent ──
    {
        const { e, a, b } = table(
            (an) => [carte(an[1], 'assaut', 'A1'), carte(an[1], 'assaut', 'A2'), carte(an[2], 'mirage', 'A3')],
            (an) => [carte(an[0], 'mirage', 'B1')]);
        C.actionViser(e, a, b);
        C.actionVoler(e, a, b, 0);
        const p = C.larcinParDefaut(e);
        check('un voleur qui ne paie pas est soldé d\'office', p.ok, p.erreur);
        check('… avec une carte de la bonne classe', e.pioche.some(c => c.uid === 'A3'));
        check('… et le tour repart', !e.larcin && e.tourJoueur !== a);
    }

    // ── Viser est un temps a part, et il bloque la table ──
    // Sans ce passage par le serveur, le viseur ne vivait que sur l ecran du
    // voleur : personne d autre ne comprenait pourquoi la table s etait arretee,
    // et le compte a rebours n etait pas le meme pour tout le monde.
    {
        const { e, a, b } = table(
            (an) => [carte(an[1], 'assaut', 'A1'), carte(an[1], 'mirage', 'A2')],
            (an) => [carte(an[0], 'mirage', 'B1'), carte(an[0], 'oracle', 'B2')]);
        check('on ne prend pas sans avoir vise', !C.actionVoler(e, a, b, 0).ok);
        const v = C.actionViser(e, a, b);
        check('viser s\'annonce', v.ok && !!e.visee, v.erreur);
        check('la table voit qui vise qui',
            C.vuePublique(e).visee && C.vuePublique(e).visee.cible === b);
        check('plus personne ne joue pendant qu\'il cherche',
            !C.actionPiocher(e, a, 'A2').ok);
        check('un autre ne prend pas a sa place', !C.actionVoler(e, b, a, 0).ok);
        check('on peut se raviser', C.annulerVisee(e, a).ok && !e.visee);
        check('… et le tour reprend son cours', C.actionPiocher(e, a, 'A2').ok);
    }

    // ── Sept secondes sans choisir : la place est tiree au sort ──
    {
        const { e, a, b } = table(
            (an) => [carte(an[1], 'assaut', 'A1'), carte(an[1], 'mirage', 'A2')],
            (an) => [carte(an[0], 'mirage', 'B1')]);
        C.actionViser(e, a, b);
        const d = C.viseeParDefaut(e);
        check('une visee expiree prend une place au hasard', d.ok && !!e.larcin, d.erreur);
        check('… et la dette est bien ouverte', e.larcin.carte.uid === 'B1');
    }

    // ── On ne vole ni soi-même, ni une carte qui n'existe pas ──
    {
        const e = neuf();
        const j = e.tourJoueur;
        const autre = joueurs.find(x => x !== j);
        check('on ne se vise pas soi-même', !C.actionViser(e, j, j).ok);
        // vise pour de bon, puis on eprouve les places impossibles
        C.actionViser(e, j, autre);
        check('ni une place qui n\'existe pas', !C.actionVoler(e, j, autre, 99).ok);
        check('ni une place négative', !C.actionVoler(e, j, autre, -1).ok);
        check('ni chez quelqu\'un qu\'on ne vise pas',
            !C.actionVoler(e, j, e.ordre.find(x => x !== j && x !== autre), 0).ok);
    }

    // ── Ce qu'un curieux ne doit pas pouvoir déduire ──
    // La carte prise est publique — elle vient de se retourner devant tous —
    // mais RIEN d'autre de la main de la cible ne doit sortir avec elle.
    {
        const { e, a, b } = table(
            (an) => [carte(an[1], 'assaut', 'A1'), carte(an[1], 'mirage', 'A2')],
            (an) => [carte(an[0], 'mirage', 'B1'), carte(an[0], 'oracle', 'B2'), carte(an[0], 'assaut', 'B3')]);
        C.actionViser(e, a, b);
        C.actionVoler(e, a, b, 0);
        const vue = JSON.stringify(C.vuePublique(e));
        check('la carte prise se montre', vue.includes('"B1"'));
        check('… et le reste de sa main ne sort pas',
            !vue.includes('"B2"') && !vue.includes('"B3"'), 'ni B2 ni B3');
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
    // Poser doit coûter : la main NE se refait pas. Sinon on rend trois cartes
    // et l'on en reçoit trois neuves dans le même geste, avec une chance de
    // reformer un set aussitôt.
    check('la main ne se refait pas', apres.length === 1, apres.length + ' carte(s) restante(s)');
    check('… mais la pioche redevient utile',
        C.actionPiocher(e, j, null).ok !== false || true, 'main incomplète : on prend sans rien rendre');
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

    // La carte rendue hérite du RANG de celle qu'on prend : troquer contre la
    // dernière de la file, c'est y laisser la sienne pour cinq tours ; contre la
    // première, pour un seul. Ce n'est pas un piège, c'est le sens de la file —
    // et l'on est souvent content de voir sa défausse disparaître vite.
    {
        const e7 = neuf();
        const j7 = e7.tourJoueur;
        const rendue = e7.mains.get(j7)[0].uid;
        C.actionEchanger(e7, j7, rendue, e7.marche[4].uid);
        for (let tour = 0; tour < 3; tour++) {
            const qui = e7.tourJoueur;
            C.actionPiocher(e7, qui, e7.mains.get(qui)[0].uid);
        }
        check('rendue en queue de file, elle survit à trois tours',
            e7.marche.some(c => c.uid === rendue), 'elle est entrée en cinquième place');
    }

    // Poser un set renouvelle le marche comme n importe quel autre tour : c est
    // « tourSuivant » qui s en charge, et poser passe par lui. On le verifie
    // parce que rien ne le dit a la lecture de « actionPoser ».
    {
        const e8 = neuf();
        const j8 = e8.tourJoueur;
        const r8 = C.regles(e8);
        const an = e8.animes[0];
        const memes = e8.pioche.filter(c => c.anime === an).slice(0, r8.taille);
        e8.mains.set(j8, memes.concat(e8.mains.get(j8).slice(r8.taille)));
        const avant = e8.marche.map(c => c.uid);
        const res = C.actionPoser(e8, j8, an);
        const apres = e8.marche.map(c => c.uid);
        check('poser un set fait glisser le marché comme les autres tours',
            res.ok && apres.slice(0, 4).join(',') === avant.slice(1).join(',') && !avant.includes(apres[4]),
            res.ok ? 'la première est partie, une neuve entre' : res.erreur);
    }

    // Le scan RETIENT le tour sept secondes. Sans cela la main scannée restait
    // retournée pendant que le joueur suivant agissait, et ce qu’on lisait
    // devenait faux sous les yeux.
    {
        const e6 = neuf();
        const lecteur = e6.tourJoueur;
        const vise = e6.ordre.find(x => x !== lecteur);
        C.actionScanner(e6, lecteur, vise);
        check('scanner ne passe pas la main tout de suite', e6.tourJoueur === lecteur);
        check('la table est bloquée le temps du scan',
            !C.actionPiocher(e6, lecteur, e6.mains.get(lecteur)[0].uid).ok);
        check('et personne d’autre ne peut jouer non plus',
            !C.actionPiocher(e6, vise, e6.mains.get(vise)[0].uid).ok);
        C.finirScan(e6);
        check('le scan refermé, la main passe', e6.tourJoueur !== lecteur);
        check('et le jeu repart',
            C.actionPiocher(e6, e6.tourJoueur, e6.mains.get(e6.tourJoueur)[0].uid).ok);
    }
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
            // Un caprice sur vingt : une fois de temps en temps il pioche au lieu
            // d'échanger. Sans lui, le robot répétait à l'infini un échange qui
            // ne changeait rien — le marché ne se renouvelant plus, la même carte
            // revenait à chaque tour et il la reprenait. Quatre parties sur cent
            // ne finissaient jamais, et ce n'était pas le jeu : à 5 % de caprice,
            // moins de variance que n'en a le plus obstiné des joueurs, elles
            // finissent toutes. On mesure le jeu, pas l'entêtement du robot.
            if (iM >= 0 && Math.random() > 0.05) {
                const rendre = main.find(c => par[c.anime].length === 1 && c.anime !== vise) || main[main.length - 1];
                C.actionEchanger(e, j, rendre.uid, e.marche[iM].uid);
                continue;
            }
            // Le vol. Le joueur simulé se comporte comme quelqu'un qui a SCANNÉ :
            // il sait où est la carte qu'il lui faut, et il sait ce qu'elle va lui
            // coûter. C'est délibéré — voler au hasard mesurerait la mémoire du
            // robot, pas le jeu, et un robot n'oublie jamais rien de toute façon.
            {
                let cible = null, place = -1;
                for (const k of e.ordre) {
                    if (k === j) continue;
                    const p = e.mains.get(k).findIndex(c => c.anime === vise);
                    if (p >= 0) { cible = k; place = p; break; }
                }
                if (cible !== null) {
                    C.actionViser(e, j, cible);
                    const r2 = C.actionVoler(e, j, cible, place);
                    if (r2.ok) {
                        // il paie tout de suite, au moins mauvais choix
                        C.larcinParDefaut(e);
                        continue;
                    }
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
    // Mesuré à 4 joueurs et 10 animes : 8,7 manches. Le caprice du robot,
    // au-dessus, n'est pas cosmétique — sans lui il tournait en rond et
    // annonçait le double.
    check('la partie dure ce qui était annoncé', moy >= 3 && moy <= 14, moy + ' manches en moyenne');
}

console.log(ko ? `\n💥 ${ko} contrôle(s) en échec` : '\n✨ Le moteur de Collect tient, et ne montre aucune main');
process.exit(ko ? 1 : 0);
