# 🎨 Les prompts des chibis

Deux prompts, deux usages. Les deux partent d'une **image de référence du vrai
personnage** jointe au prompt — c'est elle qui porte l'identité, le texte ne
décrit que le traitement.

⚠️ **Ne change QUE l'image de référence d'un personnage à l'autre.** Tout le
reste — style, cadrage, caméra, fond, lisibilité — doit rester mot pour mot
identique, sinon les personnages arrivent à des échelles et des angles
différents et ne tiennent plus ensemble sur un même écran.

---

## 1 · Le sprite de personnage (carte, plateau, liste de joueurs)

Pose au repos, caméra légèrement plongeante, fond gris à détourer.

```
Full-body chibi anime character sprite of this character.
Single character asset for a top-down multiplayer RPG map, viewed from the
game's own camera. ONE character only, ONE single pose, one single image.

REFERENCE: take ONLY the character's identity from the attached image — face,
hairstyle, outfit, colours, accessories. Do NOT copy its pose, its camera
angle, its framing, its lighting or its background. Those are defined below
and override the reference completely.

PROPORTIONS — the single most important constraint of this image: extreme
super-deformed chibi, about 2 heads tall in total. The FACE itself must be
large: big eyes, wide round face taking up most of the head. Hair volume does
NOT count as head size — a tall hairstyle must not shrink the face.
Legs and arms are very short and stubby; everything below the chin is barely
one head tall. Tiny hands and feet.
NOT normally proportioned, NOT slightly stylized, NOT 4 or 5 heads tall.

CAMERA — identical for every character: slightly elevated three-quarter-top
view, looking down at the character from roughly 30 degrees above eye level.
The top of the head, the tops of the shoulders and the tops of the feet are
visible. The face is tilted slightly down.

POSE: standing still, idle, body oriented toward the camera, weight even on
both feet, arms relaxed down at the sides. A signature weapon or prop may be
held low at one side, never raised, never in an action pose.

GAZE: the character does NOT look at the camera and makes NO eye contact with
the viewer. The head stays facing forward but tilts slightly down, and the
eyes look straight ahead and downward, focused on the ground a few steps in
front, as if walking through the world unaware of being watched.
Calm neutral expression.

STYLE: clean flat cel-shaded anime game asset. Uniform bold dark outline of
constant thickness. Flat colour fills with a single soft shadow tone.
No gradients, no textures, no rim light, NO GLOW, no outer light, no sparkles.

LIGHTING: even, soft, frontal. No strong directional light. No cast shadow.

FRAMING: whole body fully inside the frame, centred horizontally, character
occupies about 85% of the image height, small even margin above the head and
below the feet. Vertical portrait image.

BACKGROUND: completely flat uniform solid mid-grey (#808080), empty.
No ground, no base, no pedestal, no platform, no shadow, no podium, no border,
no text, no watermark, nothing behind the character.
```

### Les quatre réglages qui ont coûté des essais

| | ce qui ne marchait pas | ce qu'il faut écrire | pourquoi |
|---|---|---|---|
| angle | `isometric 3/4 view` | la description concrète (30° au-dessus, on voit le dessus de la tête ET des pieds) | le mot « isometric » est **ignoré** — d'où un personnage de face et le suivant en plongée |
| proportions | `chibi, 2.5 heads tall` | le bloc PROPORTIONS entier, **en tête** | sans lui, le corps rapetissait mais le visage restait à l'échelle normale. Et le volume des cheveux était compté comme de la tête : une coiffure haute écrasait le visage |
| halo | `soft glow outline` | **`NO GLOW`** | le halo doit venir du moteur du jeu, pour qu'il *signifie* quelque chose (tour en cours, joueur actif) |
| cadrage | rien | `85% de la hauteur` | sans ça les personnages arrivent à des échelles différentes et ne tiennent plus ensemble |

⚠️ **Le fond gris moyen, et pas noir ni blanc.** Le noir mange les cheveux de
Sasuke, ceux de L, le manteau de Chrollo : la silhouette disparaît au
détourage. Le blanc a le défaut inverse (les losanges d'Urahara, les cheveux
de Frieren). Le gris moyen ne ressemble à presque rien dans un personnage
anime. Et comme il finit à la poubelle, il n'a pas besoin d'être cohérent
avec les sprites déjà faits — seule la **façon de dessiner le personnage**
doit l'être.

---

## 2 · La mascotte (écran, bandeau, illustration)

Pose cadrée, penchée vers le lecteur, fond transparent.

```
Chibi mascot version of the character in the reference image.

IDENTITY — Keep the character's exact identity: same hairstyle and hair colour,
same eye colour, same outfit, same signature accessories and weapon, same colour
palette. Only the proportions change. Do not redesign, do not restyle, do not
change the costume.

STYLE — Cute chibi / super-deformed, 2 heads tall, oversized round head, small
compact body, tiny hands and feet. Clean anime cel-shading, thick uniform dark
outline around the whole figure, flat colour fills, one soft shadow per shape.
No gradients, no texture, no rendering detail, no line weight variation.

POSE — Leaning in from the left, upper body tilted slightly to the right, one arm
raised with the index finger pointing up, the other hand on the hip. Confident
friendly expression, small open smile, large expressive eyes, looking to the right
towards the viewer's reading direction.

FRAMING — Full body, centred, three-quarter view facing slightly right, the entire
figure inside the frame with a small even margin on all four sides. Square 1:1.

BACKGROUND — Fully transparent, alpha channel. No background, no scenery, no
ground, no cast shadow, no props, no text, no logo, no frame, no border.

LEGIBILITY — The result must stay readable at 80 pixels tall: strong silhouette,
high contrast, thick outlines, large shapes. Avoid thin lines, small props and
fine facial detail. Add a subtle warm rim light along the figure's left edge so it
separates cleanly from a near-black background.

NEGATIVE — realistic proportions, adult body proportions, photorealism, 3D render,
text, watermark, signature, background, scenery, drop shadow, ground shadow,
blurry, noisy, thin lines, extra limbs, multiple characters, cropped limbs.
```

⚠️ **Si l'outil ne sait pas sortir de transparence**, remplace le bloc
BACKGROUND par :

```
BACKGROUND — Flat pure magenta #FF00FF filling the entire background, perfectly
uniform, no gradient, no shadow, no spill on the character. Nothing else in frame.
```

Le magenta pur se détoure proprement et n'apparaît quasi jamais en couleur de
peau ou de cheveux — mais vérifie quand même pour un personnage rose vif
(Mina, Momoi…), là il faut passer au vert pur.
