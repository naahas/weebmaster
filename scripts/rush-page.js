// Bâtit la page qui liste les personnages du Rush, par anime.
// Usage : node rush-page.js <racine du projet> <sortie.html>
//
// ⚠️ ELLE S OUVRE PAR LE SERVEUR, PLUS EN `file://` :
//     http://localhost:7000/prototypes/rush-personnages
// Les portraits sont demandés en chemin ABSOLU (`/rushpic/…`), parce que
// c est là qu `express.static('src/img')` les sert. En relatif, servie depuis
// /prototypes/, la page les cherchait sous /prototypes/src/img/ — et les 481
// vignettes restaient vides sans que rien ne le dise.
const fs = require('fs');
const path = require('path');
const [, , racine, sortie] = process.argv;

const data = JSON.parse(fs.readFileSync(path.join(racine, 'rushdata.json'), 'utf8'));
const P = data.personnages;
const F = data.filtres;

// Les fichiers réellement présents : on veut voir tout de suite si une entrée
// pointe vers une image absente, ou si une image traîne sans entrée.
const surDisque = new Set(fs.readdirSync(path.join(racine, 'src', 'img', 'rushpic')));
const cites = new Set(P.map(p => p.img));
const manquantes = P.filter(p => !surDisque.has(p.img)).map(p => p.nom + ' → ' + p.img);
const orphelines = [...surDisque].filter(n => /\.webp$/i.test(n) && !cites.has(n));

const parAnime = new Map();
for (const p of P) {
    if (!parAnime.has(p.anime)) parAnime.set(p.anime, []);
    parAnime.get(p.anime).push(p);
}
const animes = [...parAnime.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
for (const [, liste] of animes) liste.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

const dansBig3 = new Set(F.big3.animes);
const dansMain = new Set(F.mainstream.animes);

// ⚠️ LES COMPTES SE CALCULENT, ILS NE SE LISENT PLUS. La page affichait
// « Big 3 (undefined) » et « hors Mainstream (NaN) » : elle lisait
// `F.big3.compte` et `F.mainstream.compte`, deux champs qui n existent pas
// dans rushdata.json — il n y a que `animes`. Un `undefined` dans une
// soustraction donne NaN, et le defaut s affichait sur le bouton sans que
// rien ne casse. Compter ici, c est ne plus dependre d un champ absent.
const compteDe = (set) => P.filter((p) => set.has(p.anime)).length;
const nBig3 = compteDe(dansBig3);
const nMain = compteDe(dansMain);

const bloc = ([nom, liste]) => `
  <section class="anime" data-anime="${nom.replace(/"/g, '&quot;')}"
           data-big3="${dansBig3.has(nom)}" data-main="${dansMain.has(nom)}">
    <h2>${nom}
      <span class="n">${liste.length}</span>
      ${dansBig3.has(nom) ? '<span class="tag big3">Big 3</span>' : ''}
      ${dansMain.has(nom) ? '<span class="tag main">Mainstream</span>' : '<span class="tag hors">hors Mainstream</span>'}
      <!-- ⚠️ TOUT L ANIME D UN COUP. Les genres se decident presque toujours
           par oeuvre — Haikyuu est du sport en entier. Sans ce bouton il
           faudrait quarante-et-un clics rien que pour Naruto. -->
      <button class="tout-anime" type="button">tout</button>
    </h2>
    <div class="grille">
      ${liste.map(p => `<figure data-nom="${p.nom.toLowerCase().replace(/"/g, '&quot;')}" data-id="${p.id}">
        <img src="/rushpic/${p.img}" alt="${p.nom}" loading="lazy">
        <figcaption>${p.nom}${p.alias && p.alias.length ? '<span class="al">' + p.alias.join(' · ') + '</span>' : ''}</figcaption>
      </figure>`).join('')}
    </div>
  </section>`;

const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rush — les personnages</title>
<style>
  :root{--fond:#0d0e12;--carte:#15171d;--bord:#242731;--or:#ffd24a;--texte:#e8e9ee;--pale:#8b8fa0}
  *{box-sizing:border-box}
  body{margin:0;padding:1.5rem 1rem 5rem;background:var(--fond);color:var(--texte);
       font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
  .page{max-width:78rem;margin:0 auto}
  h1{font-size:1.5rem;margin:0 0 .3rem}
  .sous{color:var(--pale);margin:0 0 1.4rem;font-size:.9rem}
  .outils{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin-bottom:1.8rem;
          position:sticky;top:0;background:var(--fond);padding:.7rem 0;z-index:5;
          border-bottom:1px solid var(--bord)}
  input[type=search]{background:var(--carte);border:1px solid var(--bord);color:var(--texte);
       border-radius:999px;padding:.45rem 1rem;font-size:.9rem;min-width:15rem;outline:none}
  input[type=search]:focus{border-color:var(--or)}
  button.f{background:var(--carte);border:1px solid var(--bord);color:var(--pale);
           border-radius:999px;font-size:.78rem;padding:.35rem .9rem;cursor:pointer}
  button.f:hover{border-color:var(--or);color:var(--or)}
  button.f.actif{border-color:var(--or);color:var(--fond);background:var(--or);font-weight:600}
  .compteur{margin-left:auto;color:var(--pale);font-size:.82rem}

  section.anime{margin-bottom:2rem}
  h2{font-size:1.02rem;margin:0 0 .7rem;display:flex;align-items:center;gap:.55rem;
     border-bottom:1px solid var(--bord);padding-bottom:.45rem}
  .n{color:var(--or);font-weight:700}
  .tag{font-size:.63rem;text-transform:uppercase;letter-spacing:.05em;padding:.15rem .5rem;
       border-radius:.3rem;font-weight:700}
  .tag.big3{background:rgba(255,100,0,.16);color:#ff8c3a}
  .tag.main{background:rgba(0,200,255,.13);color:#4cc9ff}
  .tag.hors{background:rgba(255,255,255,.05);color:var(--pale);font-weight:500}

  .grille{display:grid;grid-template-columns:repeat(auto-fill,minmax(6.2rem,1fr));gap:.7rem}
  figure{margin:0;background:var(--carte);border:1px solid var(--bord);border-radius:.55rem;
         overflow:hidden;transition:border-color .15s}
  figure:hover{border-color:var(--or)}
  figure img{width:100%;aspect-ratio:225/350;object-fit:cover;display:block;background:#0a0b0e}
  figcaption{padding:.35rem .4rem .45rem;font-size:.75rem;text-align:center;line-height:1.25}
  .al{display:block;color:var(--pale);font-size:.63rem;margin-top:.12rem}
  .vide{display:none}
  .alerte{background:rgba(255,50,50,.09);border-left:2px solid #ff3232;padding:.6rem .9rem;
          border-radius:0 .3rem .3rem 0;margin-bottom:1.2rem;font-size:.84rem}
</style></head><body>
<div class="page">
  <h1>Rush — les personnages</h1>
  <p class="sous">${P.length} portraits · ${animes.length} animes · généré depuis <code>rushdata.json</code></p>

  ${manquantes.length ? `<div class="alerte"><b>${manquantes.length} entrée(s) sans image sur le disque :</b><br>${manquantes.join('<br>')}</div>` : ''}
  ${orphelines.length ? `<div class="alerte"><b>${orphelines.length} image(s) sans entrée dans rushdata.json :</b><br>${orphelines.join(' · ')}</div>` : ''}

  <div class="outils">
    <input type="search" id="q" placeholder="chercher un personnage ou un anime…">
    <button class="f actif" data-f="tout">tout (${P.length})</button>
    <button class="f" data-f="big3">Big 3 (${nBig3})</button>
    <button class="f" data-f="main">Mainstream (${nMain})</button>
    <button class="f" data-f="hors">hors Mainstream (${P.length - nMain})</button>
    <span class="compteur" id="compteur"></span>
  </div>
${animes.map(bloc).join('\n')}
</div>

<!-- ⚠️ LA BARRE EST DECLAREE AVANT LE SCRIPT QUI LA CHERCHE. Posee apres,
     ses « getElementById » rendaient « null » : le portrait se marquait bien —
     la bascule passe avant — puis le compteur levait, et plus rien ne
     suivait. Un defaut muet, sans message a l ecran. -->
<div id="barre">
  <span><b id="n-sel">0</b> sélectionné(s)</span>
  <button id="copier" type="button">copier la liste</button>
  <button id="vider" type="button">tout désélectionner</button>
  <textarea id="repli" hidden readonly></textarea>
</div>

<script>
const q = document.getElementById('q');
const compteur = document.getElementById('compteur');
let filtre = 'tout';

function appliquer() {
  const t = q.value.trim().toLowerCase();
  let vus = 0;
  document.querySelectorAll('section.anime').forEach(s => {
    const nomAnime = s.dataset.anime.toLowerCase();
    const okFiltre = filtre === 'tout'
      || (filtre === 'big3' && s.dataset.big3 === 'true')
      || (filtre === 'main' && s.dataset.main === 'true')
      || (filtre === 'hors' && s.dataset.main !== 'true');
    let montres = 0;
    s.querySelectorAll('figure').forEach(f => {
      const ok = okFiltre && (!t || f.dataset.nom.includes(t) || nomAnime.includes(t));
      f.classList.toggle('vide', !ok);
      if (ok) montres++;
    });
    s.classList.toggle('vide', montres === 0);
    vus += montres;
  });
  compteur.textContent = vus + ' personnage' + (vus > 1 ? 's' : '');
}

q.addEventListener('input', appliquer);
document.querySelectorAll('button.f').forEach(b => b.onclick = () => {
  document.querySelectorAll('button.f').forEach(x => x.classList.remove('actif'));
  b.classList.add('actif'); filtre = b.dataset.f; appliquer();
});
appliquer();

/* ══════════════════════════════════════════════════════════════
   LA SELECTION — pour composer une liste et la recopier
   ══════════════════════════════════════════════════════════════
   On clique un portrait, il entre dans la selection. Le bouton « tout »
   d un anime prend ou lache ses personnages d un bloc.

   ⚠️ LA LISTE COPIEE CONTIENT LES « id », pas les noms affiches. C est l id
   qui vit dans rushdata.json : « Rock Lee » s y appelle « rock_lee », et
   recopier le nom obligerait a le retraduire a la main, avec une chance de
   se tromper sur chaque accent. Les noms figurent quand meme, en
   commentaire sur la premiere ligne, pour qu on puisse relire. */
const barre = document.getElementById('barre');
const nSel = document.getElementById('n-sel');
const btnCopier = document.getElementById('copier');
const btnVider = document.getElementById('vider');
const selection = new Set();

function majBarre() {
  nSel.textContent = selection.size;
  barre.classList.toggle('vu', selection.size > 0);
  document.querySelectorAll('section.anime').forEach(s => {
    const f = [...s.querySelectorAll('figure')];
    const tous = f.length > 0 && f.every(x => selection.has(x.dataset.id));
    s.querySelector('.tout-anime').classList.toggle('actif', tous);
  });
}

function basculer(fig) {
  const id = fig.dataset.id;
  if (selection.has(id)) { selection.delete(id); fig.classList.remove('sel'); }
  else { selection.add(id); fig.classList.add('sel'); }
}

document.querySelectorAll('figure').forEach(f => {
  f.addEventListener('click', () => { basculer(f); majBarre(); });
});

document.querySelectorAll('.tout-anime').forEach(b => {
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    const s = b.closest('section.anime');
    /* ⚠️ Seuls les portraits VISIBLES : si un filtre ou une recherche est
       actif, « tout » ne doit pas ramasser ce qu on ne voit pas. */
    const f = [...s.querySelectorAll('figure:not(.vide)')];
    const tous = f.every(x => selection.has(x.dataset.id));
    f.forEach(x => {
      if (tous) { selection.delete(x.dataset.id); x.classList.remove('sel'); }
      else if (!selection.has(x.dataset.id)) { selection.add(x.dataset.id); x.classList.add('sel'); }
    });
    majBarre();
  });
});

btnVider.addEventListener('click', () => {
  selection.clear();
  document.querySelectorAll('figure.sel').forEach(f => f.classList.remove('sel'));
  majBarre();
});

btnCopier.addEventListener('click', async () => {
  /* L ordre de la page, pas celui des clics : une liste relue dans l ordre
     des animes se verifie, une liste dans l ordre du hasard ne se verifie
     pas. */
  const retenus = [...document.querySelectorAll('figure')]
    .filter(f => selection.has(f.dataset.id));
  const noms = retenus.map(f => f.querySelector('figcaption').childNodes[0].textContent.trim());
  const ids = retenus.map(f => f.dataset.id);
  const texte = '// ' + ids.length + ' personnages : ' + noms.join(', ') + '\\n'
              + ids.join(', ');
  try {
    await navigator.clipboard.writeText(texte);
    btnCopier.textContent = 'copié !';
  } catch (e) {
    /* ⚠️ Le presse-papier est refuse hors HTTPS et hors geste utilisateur
       sur certains navigateurs. On ne laisse pas l utilisateur devant un
       bouton muet : la liste s affiche, a lui de la selectionner. */
    const z = document.getElementById('repli');
    z.value = texte; z.hidden = false; z.select();
    btnCopier.textContent = 'à copier ↓';
  }
  setTimeout(() => { btnCopier.textContent = 'copier la liste'; }, 2200);
});
</script>
<style>
figure.vide,section.anime.vide{display:none}
figure{cursor:pointer}
figure.sel{outline:2px solid #ffd166;outline-offset:2px;border-radius:6px}
figure.sel img{filter:brightness(1.08)}
.tout-anime{margin-left:.6rem;padding:.12rem .5rem;border:1px solid rgba(255,255,255,.16);
  border-radius:99px;background:none;color:#9b93ad;font:inherit;font-size:.68rem;cursor:pointer}
.tout-anime:hover{color:#fff;border-color:rgba(255,255,255,.34)}
.tout-anime.actif{background:rgba(255,209,102,.16);border-color:rgba(255,209,102,.5);color:#ffd166}
#barre{position:fixed;left:50%;transform:translateX(-50%);bottom:1.1rem;z-index:50;
  display:flex;align-items:center;gap:.8rem;padding:.6rem .9rem;border-radius:.7rem;
  background:rgba(18,16,26,.96);border:1px solid rgba(255,209,102,.3);
  box-shadow:0 .6rem 1.8rem rgba(0,0,0,.6);opacity:0;pointer-events:none;transition:opacity .2s ease}
#barre.vu{opacity:1;pointer-events:auto}
#barre b{color:#ffd166}
#barre button{padding:.34rem .7rem;border-radius:.45rem;border:1px solid rgba(255,255,255,.18);
  background:none;color:#e9e6f2;font:inherit;font-size:.78rem;cursor:pointer}
#barre button:hover{border-color:rgba(255,209,102,.6);color:#ffd166}
#repli{width:min(90vw,40rem);height:5rem;margin-top:.5rem}
</style>
</body></html>`;

fs.writeFileSync(sortie, html);
console.log(P.length + ' personnages · ' + animes.length + ' animes');
console.log('images manquantes : ' + manquantes.length + ' · images orphelines : ' + orphelines.length);
console.log('\nRépartition :');
animes.forEach(([n, l]) => console.log('  ' + String(l.length).padStart(3) + '  ' + n
    + (dansBig3.has(n) ? '  [Big 3]' : '') + (dansMain.has(n) ? '  [Mainstream]' : '')));
console.log('\npage : ' + sortie);
