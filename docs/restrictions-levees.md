# ⏳ Les restrictions levées hors production

**À remettre avant d'ouvrir le jeu à de vrais joueurs.** Cette page existe
pour qu'on n'ait rien à retrouver : elle liste tout ce qui est désarmé en
développement, ce que chaque garde-fou empêche en production, et la ligne
exacte qui le rallume.

## Comment tout rallumer d'un coup

```bash
XP_SANS_LIMITES=0 npm start
```

Les cinq restrictions ci-dessous tiennent toutes au même interrupteur. Hors
production il est **ouvert par défaut** ; `XP_SANS_LIMITES=0` le ferme et
remet le jeu dans son régime de production, sans rien déployer.

⚠️ **En production, rien de tout ceci n'est levé.** L'interrupteur se lit
`process.env.NODE_ENV !== 'production' && process.env.XP_SANS_LIMITES !== '0'`
(`server-comptes.js`). Heroku pose `NODE_ENV=production`, donc la première
condition suffit. C'est le même garde-fou que les bots de mise au point.

Le démarrage l'annonce dans les deux sens — « planchers LEVÉS » ou
« planchers EN PLACE » : on ne cherche pas pourquoi une partie n'a pas
compté devant une console muette.

---

## 1 · La durée minimale d'une partie

| | |
|---|---|
| Où | `server-comptes.js`, `partieAssezLongue()` |
| En production | Une partie sous le plancher de son mode ne laisse **rien** : ni xp, ni victoire, ni « +1 partie ». Les planchers sont par mode (`XP_MODES[…].duree`) — 45 s en BombAnime, plus long au Classique. |
| Pourquoi | Sans lui, quatre onglets lancent et arrêtent des parties de dix secondes en boucle. C'est la porte de farm la plus large du jeu. |
| Levé | Toute partie compte, même de trois secondes. |

## 2 · Le nombre de joueurs du bonus de victoire

| | |
|---|---|
| Où | `server-comptes.js`, `xpDeLaPartie()` |
| En production | Gagner ne paie le bonus qu'à partir du seuil du mode (`XP_MODES[…].seuil`). En dessous, la partie paie sa participation et rien de plus. |
| Pourquoi | Gagner en solo, ou à deux contre un bot, n'est pas gagner. |
| Levé | Le bonus de victoire tombe quel que soit le nombre de joueurs. |

## 3 · Le joueur parti en cours de route

| | |
|---|---|
| Où | `server.js`, `crediterXpDeLaPartie()` — `if (p.parti …)` |
| En production | Qui a quitté la partie avant la fin ne touche rien. Une partie terminée, c'est une partie où l'on était encore là pour l'écran du vainqueur. |
| Levé | Il touche sa part comme les autres. |

## 4 · Le joueur déconnecté à la fin

| | |
|---|---|
| Où | `server.js`, `crediterXpDeLaPartie()` — `if (p.disconnectedAt …)` |
| En production | Fermer son onglet est la façon la plus courante d'abandonner : ne garder que le bouton « Quitter » laisserait le farm ouvert à qui ferme la fenêtre. Une coupure brève ne coûte rien, `disconnectedAt` étant effacé dès le retour. |
| Levé | La déconnexion ne coûte plus rien. |

## 5 · Les deux seuils de l'accueil

| | |
|---|---|
| Où | `server.js`, `MIN_JOUEURS_COMPTEUR` (3) et `MIN_JOUEURS_LISTE` (5) |
| En production | Le compteur ne compte que les parties à trois et plus ; la liste des parties récentes n'en montre qu'à partir de cinq. |
| Pourquoi | Une manche à deux n'apprend rien à qui arrive sur la page, et gonflerait un compteur censé dire le trafic réel. |
| Levé | Les deux tombent à **1**, sinon l'accueil local n'aurait jamais rien à montrer et l'on règlerait une liste qu'on ne voit pas. |
| ⚠️ | Ce seuil filtre ce qu'on **lit**, jamais ce qu'on écrit. Les parties à deux étaient déjà enregistrées en base ; elles étaient seulement écartées de l'affichage. Le lever n'a donc **aucun effet sur la production**, qui lit avec ses propres seuils. |

`MIN_JOUEURS_COMPTEUR` et `MIN_JOUEURS_LISTE` restent réglables par variable
d'environnement, et celle-ci passe devant : on peut éprouver les vrais seuils
sans fermer l'interrupteur général.

---

## Ce qui n'est PAS levé, et ne peut pas l'être

- **Il faut un compte.** Un invité n'a pas de ligne où écrire son xp. Ce n'est
  pas un garde-fou, c'est l'absence de destination — `crediterXpDeLaPartie`
  saute tout `playerId` absent de `comptesVerifies`.
- **Les bots ne touchent rien.** Même raison, et ils sont déjà écartés en
  amont par `humainsDuSalon` : le bot de BombAnime siège dans `players` comme
  un joueur, et le compter gonflerait le salon jusqu'au seuil.
- **La base doit répondre.** `comptes.ACTIF` ferme tout le chemin si Supabase
  n'est pas configuré.

## Ce que le filet continue de tenir

`npm run test:comptes` éprouve le barème **avec** les planchers : il pose
`XP_SANS_LIMITES=0` lui-même, avant de charger le module, parce que
`SANS_LIMITES` est un `const` lu une seule fois. Sans cette ligne, la moitié
de ses contrôles deviendraient faux **en passant au vert** — ils vérifient des
montants plus bas que ceux du bonus.

`npm run smoke` demande les seuils au serveur (`/api/home-stats`, champ
`seuils`) plutôt que de les recopier. Un filet qui connaît la valeur attendue
par cœur ne protège que la valeur, pas la règle.
