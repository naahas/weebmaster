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
const neuf = (duree = 'normale', nbAnimes = 10) => {
    const e = C.etatNeuf();
    e.duree = duree;
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

console.log('\n── Le vol et le triangle ──');
{
    // on fabrique la situation à la main pour l'éprouver exactement
    const e = neuf();
    const [a, b] = [e.tourJoueur, joueurs.find(j => j !== e.tourJoueur)];
    const carte = (anime, classe, uid) => ({ uid, id: uid, nom: uid, anime, classe, img: 'x.webp' });

    // les animes sont tirés au sort : on prend ceux de CETTE partie
    const [A1, A2] = e.animes;
    // assaut domine mirage, pas oracle ni assaut
    e.mains.set(a, [carte(A1, 'assaut', 'A1'), carte(A2, 'oracle', 'A2')]);
    e.mains.set(b, [carte(A1, 'oracle', 'B1'), carte(A1, 'mirage', 'B2'), carte(A1, 'assaut', 'B3')]);

    const r = C.actionVoler(e, a, b, A1, 'A1');
    check('le vol réussit sur la classe dominée', r.ok && r.reussi, r.reussi ? r.prise.uid : (r.erreur || 'échec'));
    check('c\'est bien le Mirage qui est pris', r.prise && r.prise.uid === 'B2', r.prise && r.prise.uid);
    check('les autres classes restent chez la cible',
        e.mains.get(b).filter(c => c.uid.startsWith('B')).map(c => c.uid).sort().join() === 'B1,B3',
        e.mains.get(b).map(c => c.uid).join());
    // La carte d'attaque est le prix du vol, et elle va au MARCHÉ — surtout pas
    // à la victime : sinon les deux joueurs troqueraient une carte contre une
    // autre et le vol n'aurait plus rien d'un vol.
    check('la carte d\'attaque ne va pas à la victime', !e.mains.get(b).some(c => c.uid === 'A1'));
    check('… elle atterrit au marché', e.marche.some(c => c.uid === 'A1'));
    check('… et quitte la main du voleur', !e.mains.get(a).some(c => c.uid === 'A1'));
    check('la victime perd bien une carte', e.mains.get(b).length === 2, e.mains.get(b).length + ' cartes');
    check('le voleur garde sa taille de main', e.mains.get(a).length === 2, e.mains.get(a).length + ' cartes');
    check('le marché garde la sienne', e.marche.length === C.CONFIG.MARCHE, e.marche.length + ' cartes');

    // rien à prendre : le tour part quand même
    const e2 = neuf();
    const [x, y] = [e2.tourJoueur, joueurs.find(j => j !== e2.tourJoueur)];
    const B1 = e2.animes[0];
    e2.mains.set(x, [carte(B1, 'assaut', 'X1')]);
    e2.mains.set(y, [carte(B1, 'assaut', 'Y1'), carte(B1, 'oracle', 'Y2')]);
    const vide = C.actionVoler(e2, x, y, B1, 'X1');
    check('annoncer dans le vide ne prend rien', vide.ok && !vide.reussi);
    check('… et coûte quand même le tour', e2.tourJoueur !== x, x + ' → ' + e2.tourJoueur);
    check('la carte d\'attaque reste en main', e2.mains.get(x).some(c => c.uid === 'X1'));

    // le triangle, exhaustivement
    const attendu = { assaut: 'mirage', mirage: 'oracle', oracle: 'assaut' };
    let triangleOk = true;
    for (const att of Object.keys(attendu)) for (const def of Object.keys(attendu)) {
        if (C.domine(att, def) !== (attendu[att] === def)) triangleOk = false;
    }
    check('le triangle est bien un cycle, sans égalité', triangleOk, 'assaut > mirage > oracle > assaut');

    // on ne vole pas soi-même, ni un anime hors partie
    const e3 = neuf();
    const soi = C.actionVoler(e3, e3.tourJoueur, e3.tourJoueur, e3.animes[0], e3.mains.get(e3.tourJoueur)[0].uid);
    check('on ne se vole pas soi-même', !soi.ok, soi.erreur);
    const hors = C.actionVoler(e3, e3.tourJoueur, joueurs.find(j => j !== e3.tourJoueur), 'AnimeQuiNExistePas', e3.mains.get(e3.tourJoueur)[0].uid);
    check('on ne vole pas un anime hors partie', !hors.ok, hors.erreur);
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
    const e = neuf('normale', 8);
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
    const e2 = neuf('normale', 8);
    let manquee = 0;
    for (let i = 0; i < 3000; i++) {
        const j = e2.tourJoueur;
        e2.mains.set(j, []);
        const r = C.actionPiocher(e2, j, (e2.mains.get(j)[0] || {}).uid);
        if (!r.ok) manquee++;
    }
    check('trois mille pioches d\'affilée sans rupture', manquee === 0, manquee + ' échec(s)');
}

console.log('\n── Les trois durées ──');
{
    for (const cle of Object.keys(C.DUREES)) {
        const d = C.DUREES[cle];
        const assez = d.main > d.taille;
        check(`« ${d.nom} » laisse une carte de réserve`, assez,
            `main ${d.main}, sets de ${d.taille} × ${d.sets}`);
    }
    check('aucune durée ne descend sous 8 animes', C.CONFIG.ANIMES_POSSIBLES.every(n => n >= 8),
        C.CONFIG.ANIMES_POSSIBLES.join(', '));
    check('l\'objectif ne dépasse jamais 2 sets de 3',
        Object.values(C.DUREES).every(d => d.taille * d.sets <= 6),
        Object.values(C.DUREES).map(d => d.sets + '×' + d.taille).join(' '));
}

console.log('\n── Une partie entière se termine ──');
{
    let sansVainqueur = 0, total = 0;
    const PARTIES = 400;
    for (let p = 0; p < PARTIES; p++) {
        const e = neuf('normale', 10);
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
            if (main.length < r.main) {
                let vole = false;
                for (const k of e.ordre) {
                    if (k === j) continue;
                    for (const att of main) {
                        if (e.mains.get(k).some(c => c.anime === vise && C.domine(att.classe, c.classe))) {
                            C.actionVoler(e, j, k, vise, att.uid); vole = true; break;
                        }
                    }
                    if (vole) break;
                }
                if (vole) continue;
            }
            {
                const par2 = {};
                for (const c of main) par2[c.anime] = (par2[c.anime] || 0) + 1;
                const isolee = main.find(c => par2[c.anime] === 1) || main[main.length - 1];
                C.actionPiocher(e, j, isolee.uid);
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
