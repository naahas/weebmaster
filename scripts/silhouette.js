// 🕶️ Transformer un personnage détouré en silhouette « perso mystère ».
//
//   node scripts/silhouette.js src/img/monperso.png src/img/collect-mystere.webp
//
// Le piège, et c'est pour ça que ce script existe plutôt qu'un simple filtre :
// une silhouette noire posée sur le fond sombre du site ne se voit plus du
// tout. Elle a besoin d'un CONTOUR pour exister. On garde donc l'intérieur
// très sombre — juste assez dégradé pour ne pas être un aplat mort — et l'on
// dessine un liséré sur son pourtour.
//
// Le liséré se mesure à trois pixels et non à un : l'illustration est réduite
// dans la carte du mode, et un trait d'un pixel disparaîtrait à la mise à
// l'échelle.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const [entree, sortie] = process.argv.slice(2);
if (!entree || !sortie) {
    console.error('usage : node scripts/silhouette.js <image-detouree> <sortie.webp>');
    process.exit(1);
}

// La couleur du liséré : le corail de la classe Assaut, qui est aussi celle du
// mode Collect. Changer ici si le mode change de teinte.
const LISERE = [255, 122, 92];
const INTERIEUR = [14, 14, 20];
const PORTEE = 3;

const dims = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height',
    '-of', 'csv=p=0', entree]).toString().trim().split(',').map(Number);
const [W, H] = dims;
if (!W || !H) { console.error('dimensions illisibles'); process.exit(1); }

const tmp = path.join(os.tmpdir(), 'silhouette-' + process.pid + '.raw');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', entree, '-f', 'rawvideo', '-pix_fmt', 'rgba', tmp]);
const d = fs.readFileSync(tmp);

const alpha = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : d[(y * W + x) * 4 + 3];
// Un pixel bien opaque dont un voisin proche ne l'est pas : c'est le bord.
const estBord = (x, y) => {
    if (alpha(x, y) < 140) return false;
    for (let dy = -PORTEE; dy <= PORTEE; dy++)
        for (let dx = -PORTEE; dx <= PORTEE; dx++)
            if (alpha(x + dx, y + dy) < 40) return true;
    return false;
};

let pleins = 0, bords = 0;
for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (d[i + 3] === 0) continue;
        pleins++;
        // Un dégradé vertical léger : la silhouette s'éclaircit un peu vers le
        // haut, ce qui lui donne du volume au lieu d'un aplat mort.
        const k = 1 - (y / H) * 0.35;
        let c = INTERIEUR.map(v => Math.round(v * k));
        if (estBord(x, y)) { c = LISERE; bords++; }
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
    }
}

fs.writeFileSync(tmp, d);
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba',
    '-s', W + 'x' + H, '-i', tmp, '-c:v', 'libwebp', '-quality', '88', '-compression_level', '6', sortie]);
fs.unlinkSync(tmp);

console.log(`${path.basename(sortie)} — ${W}×${H}, ${Math.round(fs.statSync(sortie).size / 1024)} Ko`);
console.log(`  ${pleins.toLocaleString('fr')} pixels de personnage, dont ${bords.toLocaleString('fr')} de liséré`);
