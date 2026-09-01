const fs = require('fs'); const W = 1986, H = 502;
// Un degrade vertical cuit dans l'or : clair en haut, profond en bas. C'est
// l'eclat du metal sans l'extrusion ni l'ombre portee.
const OR = [[0, 0xff,0xe6,0xa6], [0.32, 0xff,0xcb,0x52], [0.66, 0xef,0xa4,0x33], [1, 0xd2,0x85,0x1f]];
const BLANC = [[0, 0xff,0xff,0xff], [1, 0xe4,0xe4,0xe4]];
const teinte = (stops, t) => {
    for (let i = 1; i < stops.length; i++) {
        if (t <= stops[i][0]) {
            const [a, ar, ag, ab] = stops[i - 1], [b, br, bg, bb] = stops[i];
            const k = (t - a) / (b - a);
            return [ar + (br - ar) * k, ag + (bg - ag) * k, ab + (bb - ab) * k];
        }
    }
    return stops[stops.length - 1].slice(1);
};
const [,, entree, sortie, hautArg, basArg] = process.argv;
const HAUT = Number(hautArg), BAS = Number(basArg);
const d = Buffer.from(fs.readFileSync(entree));
for (let y = 0; y < H; y++) {
    const t = Math.max(0, Math.min(1, (y - HAUT) / (BAS - HAUT)));
    const or = teinte(OR, t), bl = teinte(BLANC, t);
    for (let x = 0; x < W; x++) {
        const j = (y * W + x) * 4; if (d[j + 3] === 0) continue;
        const mx = Math.max(d[j], d[j+1], d[j+2]), mn = Math.min(d[j], d[j+1], d[j+2]);
        const c = (mx - mn) > 30 ? or : bl;
        // on garde la valeur relative du pixel : le lisere antialiase survit
        const f = Math.min(1, mx / 255);
        for (let k = 0; k < 3; k++) d[j + k] = Math.round(c[k] * f);
    }
}
fs.writeFileSync(sortie, d);
console.log('degrade cuit, bande y=' + HAUT + '..' + BAS);
