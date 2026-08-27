# Mode Ascension — archive de conception

Mode **mis de côté lors de la refonte v2**, pas abandonné. Il était le plus récent et le plus
prometteur des modes développés. Ce document conserve la conception ; le code est conservé en git.

## Où est le code

| Quoi | Où |
|---|---|
| Branche d'archive | `archive/ascension` |
| Tag de l'état v1 complet | `v1-final` |
| Serveur | `server-ascension.js` (1 682 lignes) |
| Panel admin | `src/script/admin-ascension.js` (3 326 lignes) + `src/style/admin-ascension.css` |
| Données | `ascensiondata.json` |
| Images | `src/img/ascensionpic/` (326 fichiers, 90 Mo) dont `ascensionarcs/` et `ascensionanime/` |
| Client joueur | intégré dans `src/script/app.js` (chercher `ascension-`) |

Pour récupérer un fichier ponctuellement, sans changer de branche :

```bash
git show v1-final:server-ascension.js > server-ascension.js
git checkout v1-final -- src/img/ascensionpic   # récupère tout le dossier d'images
```

## Principe

Une **tour d'étages** que chaque joueur gravit **à son propre rythme**, en parallèle des autres.
Chaque étage est un mini-jeu différent, avec un timer par étage. Le premier arrivé au sommet gagne.

Config par défaut : **15 étages**, **30 s par étage**, épreuves synchronisées entre joueurs
(`syncEpreuves: true`) — chaque joueur affronte la même séquence d'étages.

Ce qui le rendait bon : c'est le seul mode où **le joueur avance seul sans attendre les autres**
(pas de tour par tour, pas d'attente), tout en gardant une tension de course collective.

## Les 7 types d'étages

| Type | Principe |
|---|---|
| `guess` | 5 images de persos, taper les noms (validation par alias) |
| `target` | 30 persos affichés, 5 consignes successives « clique sur X » |
| `intruder` | 30 persos, trouver les 3 qui ne sont pas du bon anime |
| `wordle` | deviner un nom, statuts par lettre façon Wordle, essais illimités dans le temps de l'étage |
| `order` | remettre des arcs dans l'ordre chronologique (drag & drop) |
| `match` | relier deux colonnes (voir sous-types ci-dessous) |
| `scramble` | anagramme : remettre dans l'ordre les lettres d'un nom de perso |

Sous-types de `match` : `char_anime`, `couples`, `techniques`, `weapons`, `rivals`, `same_voice`,
`anime_studio`, `anime_year`.

## Détails d'implémentation à ne pas perdre

- **Génération de la séquence d'étages par « sac »** : on pioche sans remise dans un sac contenant
  un exemplaire de chaque type ; sac vide → on le remplit à nouveau. Garantit qu'aucun type ne se
  répète tant que tous les autres ne sont pas passés, avec en plus une protection contre le
  back-to-back entre deux cycles. Bien meilleur qu'un tirage aléatoire naïf.
- **Validation systématiquement côté serveur, et incrémentale** : chaque clic / chaque paire /
  chaque lettre est validé au fil de l'eau (`ascension-check-*`), le client n'affiche que le verdict.
- **Ordre (`order`)** : le serveur ne répond **que si l'ordre est correct** — aucun retour
  intermédiaire, sinon le joueur bruteforce.
- **Wordle** : gestion correcte des doublons de lettres (on place d'abord les verts, puis les jaunes
  en consommant les positions restantes). C'est le piège classique, il était traité.
- **Rooms socket.io par joueur** (`asctid:<twitchId>`) pour livrer les événements d'étage à un joueur
  précis — déjà un embryon d'architecture multi-destinataire, réutilisable en v2.
- **Reconnexion** : remappage du `socketId` via `ascension-reconnect`, avec fallback de recherche dans
  `playerProgress`. Sans ça, un refresh cassait silencieusement la validation.
- **`ascensiondata.json`** est le vrai actif : `characters, animes, arcs, techniques, weapons, rivals,
  couples, same_voice, wordle_words`. C'est long à reconstituer, ne pas le perdre.

## Si on le remet en v2

- L'architecture est **déjà proche du multi-room** : `createAscensionState()` retourne un état isolé et
  toutes les fonctions prennent cet état en paramètre. C'est le module le mieux préparé du projet.
- Le mode est **jouable en solo** — c'est le seul du lot. S'il fallait un jour un mode qui tourne sans
  streamer, c'est celui-là.
- Point d'attention : 90 Mo d'images. À passer sur un CDN ou à recompresser avant de le réactiver.

---

## Le contrat client ↔ serveur (relevé au portage v2)

Établi en interrogeant le moteur, pas la mémoire. `getFloorDataForClient()` retire
systématiquement la réponse ; ce tableau donne ce qui reste.

| Type | Le client reçoit | Il renvoie | Réponse |
|---|---|---|---|
| `guess` | `totalToGuess`, `characters[{id, img, anime}]` | `ascension-check-guess` `{characterId, name, source}` | `ascension-guess-result` |
| `target` | `totalTargets`, `characters[{id, img, name, anime}]`, `currentTarget{id, name}` | `ascension-check-target` `{characterId}` | `ascension-target-result` |
| `intruder` | `variant`, `targetAnime`, `instruction`, `totalTargets`, `characters[…]` | `ascension-check-intruder` `{characterId}` | `ascension-intruder-result` |
| `wordle` | `wordLength`, `category`, `groups`, `animeHint` | `ascension-check-wordle` `{guess}` | `ascension-wordle-result` |
| `order` | `anime`, `arcs[{id, name, img}]` | `ascension-check-order` `{order:[id…]}` | `ascension-order-result` |
| `match` | `subtype`, `left[{id, name, img}]`, `right[{id, value}]` | `ascension-check-match` `{connections}` | `ascension-match-result` |
| `scramble` | `wordLength`, `category`, `scrambled[…lettres]`, `hint` | `ascension-check-scramble` `{guess}` | `ascension-scramble-result` |

Tous répondent **aussi** `ascension-answer-result` quand l'étage est validé.

Événements de salon : `ascension-game-started`, `ascension-floor-start` (au seul
joueur concerné, via le salon `<code>:asc:<playerId>`), `ascension-progress`,
`ascension-game-end`, `ascension-config`.

### ⚠️ Ce qui fuite encore, à traiter avec les portraits de Rush

- `guess` : l'identifiant **et** le nom du fichier image donnent le nom cherché.
- `intruder` : le champ `anime` de chaque personnage désigne les cibles.

`npm run test:ascension` garde ces trois échecs rouges tant que ce n'est pas fait.
