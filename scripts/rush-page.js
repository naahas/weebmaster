// Bâtit la page qui liste les personnages du Rush, par anime.
// Usage : node rush-page.js <racine du projet> <sortie.html>
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

const bloc = ([nom, liste]) => `
  <section class="anime" data-anime="${nom.replace(/"/g, '&quot;')}"
           data-big3="${dansBig3.has(nom)}" data-main="${dansMain.has(nom)}">
    <h2>${nom}
      <span class="n">${liste.length}</span>
      ${dansBig3.has(nom) ? '<span class="tag big3">Big 3</span>' : ''}
      ${dansMain.has(nom) ? '<span class="tag main">Mainstream</span>' : '<span class="tag hors">hors Mainstream</span>'}
    </h2>
    <div class="grille">
      ${liste.map(p => `<figure data-nom="${p.nom.toLowerCase().replace(/"/g, '&quot;')}">
        <img src="src/img/rushpic/${p.img}" alt="${p.nom}" loading="lazy">
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
    <button class="f" data-f="big3">Big 3 (${F.big3.compte})</button>
    <button class="f" data-f="main">Mainstream (${F.mainstream.compte})</button>
    <button class="f" data-f="hors">hors Mainstream (${P.length - F.mainstream.compte})</button>
    <span class="compteur" id="compteur"></span>
  </div>
${animes.map(bloc).join('\n')}
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
</script>
<style>figure.vide,section.anime.vide{display:none}</style>
</body></html>`;

fs.writeFileSync(sortie, html);
console.log(P.length + ' personnages · ' + animes.length + ' animes');
console.log('images manquantes : ' + manquantes.length + ' · images orphelines : ' + orphelines.length);
console.log('\nRépartition :');
animes.forEach(([n, l]) => console.log('  ' + String(l.length).padStart(3) + '  ' + n
    + (dansBig3.has(n) ? '  [Big 3]' : '') + (dansMain.has(n) ? '  [Mainstream]' : '')));
console.log('\npage : ' + sortie);
