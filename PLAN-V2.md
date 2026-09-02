# ShonenMaster v2 — Plan de refonte

**Décision produit** : abandon du modèle « plateforme opérée pour des streamers partenaires » au profit
d'un **outil de parties privées self-serve**, modèle jklm.fun / skribbl.io.

- Plus de comptes, plus d'XP, plus de S-Coins, plus de boutique, plus de badges/titres, plus de classement
- Plus d'admin : **n'importe qui crée une room**, le créateur en est le *host*
- Deux modes seulement : **Quiz** et **BombAnime**
- Deux chemins d'entrée : **code de room** (TikTok, vocal entre potes, Discord) et **chat Twitch** (Quiz only)
- Cibles : streamers Twitch **et TikTok**, + groupes d'amis en vocal
- Rooms **privées uniquement** pour l'instant (rooms publiques : plus tard, à décider)

**Le seul indicateur qui compte** : le temps entre l'arrivée sur le site et le premier tour joué.
Objectif < 10 secondes. Sans compte ni progression, rien d'autre ne rattrape une entrée laborieuse.

---

## État des lieux chiffré

| Élément | Volume | Sort |
|---|---|---|
| `server.js` | 6 167 lignes, 62 routes, `io.emit` × 52 | refacto lourd |
| `server-ascension.js` | 1 682 lignes | supprimé |
| `server-poll.js` | 684 lignes | supprimé |
| `dbs.js` | 1 226 lignes, 12 tables | réduit aux questions |
| `src/script/app.js` | 13 866 lignes | allégé + mobile-first |
| `src/script/admin.js` | 9 805 lignes | devient le panel *host*, très allégé |
| `admin-{collect,survie,poll,ascension}.js` + CSS | ~11 000 lignes JS + ~200 Ko CSS | supprimés |
| `survie-canvas.js`, `home-{collect,survie}.css` | ~1 700 lignes + 217 Ko | supprimés |

Suppression attendue : **50 à 60 % du code**.

**Contexte favorable** : le site public est en maintenance, il n'y a aucun utilisateur actif. On peut
casser librement, il n'y a rien à préserver en production.

---

## Phase 0 — Filet de sécurité

- Branche `v2`, `main` reste intact et déployable (landing de maintenance)
- Tag `v1-final` sur le dernier commit avant refonte
- Le déploiement Render continue de servir `main` jusqu'à la bascule finale

---

## Phase 1 — Suppression (grosse en volume, faible en risque)

À faire **avant** le multi-room : tout ce qui est supprimé ici est du code qu'on n'aura pas à
rendre multi-room.

### Serveur

- **Auth & sessions** : routes `/auth/*`, `express-session`, `cookie-parser`, `req.session` partout,
  `TWITCH_CLIENT_ID/SECRET`, `TWITCH_REDIRECT_URI`
- **Admin** : `/admin/login`, `activeAdminSession`, `activeAdminLoginTime`, `masterAdminSessions`,
  middleware `/admin/*`, timeout d'inactivité, `/admin/master`, backdoor de maintenance
- **Progression** : `getPreRewardData`, `buildRewardSummary`, `computeExpectedRewards`,
  `distributeGameCoins`, `distributeGameXp`, `calculateLevel`, `COIN_REWARDS`, `XP_REWARDS`,
  tous les emit `*-rewards-ready`
- **Routes profil / social** : profil, avatars, titres, préfixes/suffixes, badges, boutique, achats,
  leaderboard, coins, parties récentes, stats DB, `/visits-stats`, `logVisit`
- **Partenaires** : `checkPartnersLive`, `setInterval` 2 min, `/api/partners`, `partnersLiveStatus`
- **Modes abandonnés** : `server-ascension.js`, `server-poll.js`, `gameState.survie/.collect/.poll/.ascension`,
  tous leurs handlers socket et routes

### Base de données

`dbs.js` ne conserve que la lecture des questions : `getRandomQuestions`, `getAvailableQuestionsCount`,
`getAllQuestions`, `SERIES_FILTERS`, `getFilterSeries`, + le CRUD utilisé par la page `/question`.

Tables abandonnées : `users`, `games`, `player_games`, `titles`, `badges`, `shop_items`,
`user_purchases`, `visits`, `used_questions`.
Tables conservées : `questions`, `keep_alive`, `bombanime_suggestions`.

⚠️ `used_questions` disparaît : l'historique anti-répétition était indexé par `streamerId`, notion qui
n'existe plus. Il devient un **historique par room, en mémoire**, purgé avec la room. C'est suffisant :
une session de stream ne dépasse pas quelques heures.

### Client

- `home.html` / `app.js` : suppression des écrans profil, boutique, badges, titres, leaderboard,
  animations de reward, sélection d'avatar, et de tous les écrans Trace / Collect / Poll / Ascension
- `admin.html` / `admin.js` : deviennent le **panel host**. On garde les réglages de partie (vies,
  temps, nb de réponses, difficulté, filtre série, anti-spoil, mode auto, série BombAnime, timer) et
  les contrôles (démarrer, question suivante, kick). On supprime l'écran de login, l'intro animée,
  les stats DB, le leaderboard idle, la gestion des questions (elle reste sur `/question`)
- Fichiers supprimés : `survie-canvas.js`, `admin-{collect,survie,poll,ascension}.{js,css}`,
  `home-{collect,survie}.css`, `crown-prototypes.html`, `tower-prototypes.html`

### Conservé

- `/question` avec son `QUESTION_ADMIN_CODE` (back-office questions, usage perso)
- `/ranking` : **à supprimer** (plus de classement) — ou à garder comme page vitrine ? à trancher
- `bombdata.json`, `bombimages.json`, `character-variants.js`, `collect-cards.json` (gelé)
- Tout le CSS et les animations des écrans conservés

---

## Phase 2 — Multi-room (cœur du chantier)

**Le refacto est quasi exclusivement serveur.** Un client ne voit jamais qu'une seule room à la fois :
la notion de room lui est transparente, il continue de recevoir les mêmes événements qu'avant.

### Modèle

```js
const rooms = new Map();   // code -> room

function createRoom(hostSocket, opts) {
  return {
    code,                    // 4-6 caractères, alphabet sans ambiguïté (ni 0/O, ni 1/I)
    hostSocketId,
    createdAt,
    entryMode: 'site',       // 'site' | 'chat'
    twitchChannel: null,     // si entryMode === 'chat'
    mode: 'quiz',            // 'quiz' | 'bombanime'
    usedQuestionIds: [],     // historique local à la room
    ...                      // reste identique à l'ancien gameState
  };
}
```

### Travail mécanique

1. Chaque fonction de jeu prend `room` en premier paramètre ; `gameState.` → `room.` (1330 occurrences,
   mécanique une fois les signatures posées)
2. `io.emit(evt, payload)` → `emitRoom(room, evt, payload)` = `io.to(room.code).emit(...)` (52 occurrences)
3. `socket.join(room.code)` à l'entrée, `socket.data.roomCode` pour retrouver la room, helper `getRoom(socket)`
4. `socket.emit(...)` (58 occurrences) reste inchangé — déjà ciblé sur un joueur

### Pièges identifiés

- **Globaux qui portent de l'état de partie** et doivent migrer dans `room` :
  `lastGlobalWinner`, `winnerScreenData`, `playerColors`, `lastRefreshPlayersTime`, `pendingJoins`
- **Tous les `setTimeout` différés** capturent aujourd'hui le `gameState` global par closure. Chacun doit
  capturer sa `room` **et** re-vérifier au réveil que la room existe encore et que la génération n'a pas
  changé : `if (!rooms.has(room.code) || room.turnId !== myTurnId) return;`.
  Le pattern `turnId` de BombAnime est le bon, à généraliser aux questions et aux rounds.
  **C'est là que se cacheront 90 % des bugs du refacto.**
- **Cycle de vie** : destruction quand le host part et que la room est vide, avec un délai de grâce de
  2-5 min pour la reconnexion ; TTL d'inactivité (30 min) ; plafond de rooms simultanées ; nettoyage
  impératif des timers à la destruction (sinon fuite mémoire garantie)
- **Transfert de host** si le créateur se déconnecte en cours de partie

---

## Phase 3 — Identité invité

- Écran d'accueil : **[Créer une partie]** / **[Rejoindre]** + champ pseudo. Rien d'autre.
- Pseudo mémorisé en `localStorage` (confort, pas un compte)
- Unicité du pseudo **dans la room** uniquement
- **Filtre** : normalisation (accents retirés, caractères répétés écrasés, leet décodé `4→a 3→e 0→o 1→i $→s`,
  espaces et ponctuation supprimés) puis test contre une blocklist FR + EN.
  Pas d'IA : 300-800 ms de latence, un coût par appel et une dépendance externe pour un gain marginal.
- Filet de sécurité réel : le **host voit les pseudos et peut kick** (`kick-player` existe déjà)

---

## Phase 4 — Mobile-first / vertical

Contrainte imposée par TikTok, bénéfique partout ailleurs.

- Vue joueur jouable **au pouce en 9:16**
- Vue « écran partagé » (celle que le streamer affiche) lisible en vertical
- `home.css` fait 16 600 lignes : on ne retouche **que** les écrans conservés (accueil, lobby, question,
  résultats, BombAnime). Pas de refonte globale du CSS.

---

## Phase 5 — Mode chat Twitch (dans la v1)

- **Connexion IRC anonyme** : nick `justinfan<random>` sur `irc-ws.chat.twitch.tv`, lecture seule,
  **aucun OAuth, aucun token, aucune validation Twitch**. Le host saisit juste le nom de sa chaîne.
- `entryMode: 'chat'` choisi à la création de la room
- **Quiz uniquement** — BombAnime a besoin d'un état par joueur (vies, alphabet, ordre de passage),
  impossible à porter proprement dans un chat
- Réponses par `1/2/3/4` ou `A/B/C/D`, **première réponse seule comptée** par utilisateur
- **Le délai de stream (3 à 20 s) impose** : timers longs (20-30 s), aucun bonus de rapidité, et
  **interdiction de mélanger joueurs-chat et joueurs-site dans une même partie** (ceux sur le site
  verraient la question instantanément)
- Identité = display-name du chat, déjà unique et déjà modéré par Twitch → pas de filtre de pseudo ici
- Pas de lobby : les joueurs apparaissent au fil de leurs réponses
- Robustesse : reconnexion avec backoff, un seul canal par room, `PART` du canal en fin de partie
- ⚠️ Twitch pousse progressivement vers EventSub pour le chat. L'IRC anonyme fonctionne aujourd'hui
  et depuis des années, mais c'est une dépendance à surveiller.

**TikTok : pas d'équivalent.** Aucune API publique pour lire le chat d'un live TikTok ; les
bibliothèques existantes passent par une API interne non documentée que TikTok bloque activement.
Pour TikTok, ce sera **code de room + navigateur mobile**, point.

---

## Ordre d'exécution

| # | Phase | Poids | Risque | État |
|---|---|---|---|---|
| 0 | Filet de sécurité | ▁ | nul | ✅ fait |
| 1 | Suppression | ███ | faible | ✅ fait |
| 2 | Multi-room | █████ | **élevé** | ✅ fait |
| 3 | Identité invité | ██ | faible | 🟡 version minimale en place |
| 4 | Mobile-first | ████ | moyen | ✅ fait (accueil, salon, quiz, Rush, Ascension, BombAnime) |
| 5 | Chat Twitch | ███ | moyen | à faire |

### Résultat de la phase 1

| Fichier | v1 | v2 |
|---|---|---|
| `server.js` | 11 352 | 5 945 |
| `dbs.js` | 1 226 | 340 |
| `src/script/app.js` | 13 866 | 4 349 |
| `src/html/home.html` | 2 459 | 1 332 |
| `src/html/question.html` | 2 205 | 1 863 |
| `src/script/admin.js` | 9 805 | 9 574 |

Plus les fichiers entièrement supprimés (`server-ascension.js`, `server-poll.js`, `survie-canvas.js`,
les 4 modules admin de modes, leurs CSS) et 224 Mo d'images. **Environ 21 000 lignes retirées.**

Fait en plus de ce qui était prévu :
- **Identité invité minimale** (pseudo + `playerId` en `localStorage`) pour garder le jeu testable
  entre la phase 1 et la phase 3 — sinon le client restait inutilisable tout ce temps.
- **`scripts/smoke-test.js`** (`npm run smoke`) : test de bout en bout sans navigateur, qui a
  immédiatement attrapé deux régressions (crash à chaque connexion socket, `game.id` orphelin).
- Route `/admin/report-question` **restaurée** : elle concerne la qualité des questions, pas les comptes.

Reste connu, à traiter en phase 2 :
- `admin.js` garde des branches mortes sur les modes supprimés (jamais atteintes, inoffensives).
- Le champ réseau s'appelle encore `twitchId` alors qu'il porte le `playerId` invité.
- L'écran idle du panel affiche des tirets à la place des anciennes stats globales.

Validation manuelle après chaque phase (aucun test automatisé dans le projet) : créer une room,
rejoindre à 2 onglets, lancer une partie de chaque mode, kicker, se déconnecter/reconnecter,
laisser une room expirer.

---

## À trancher plus tard (non bloquant)

- Rooms publiques / matchmaking
- Vue spectateur dédiée pour l'écran du streamer
- Discord Activity (le format 20-40 joueurs colle aux serveurs Discord anime, canal de distribution
  probablement le meilleur ratio effort/reach après le code de room)
- Sort de la page `/ranking`
- **Nom de domaine court** (hors code, mais déterminant : un viewer TikTok doit taper l'URL à la main)
