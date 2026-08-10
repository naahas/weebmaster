# ShonenMaster (repo : `weebmaster`)

Jeu de quiz / party-games anime **multijoueur temps réel pour streamers Twitch**.

**Modèle produit :** le streamer reçoit l'accès à `/admin` (mot de passe) et lance les parties depuis
ce panel. Les viewers vont sur le site, cliquent « Connexion Twitch » (OAuth), obtiennent un profil
lié à leur compte Twitch (XP, niveau, S-Coins, badges, titres, avatars) et rejoignent le lobby.

Domaine prod : `shonenmaster.com`. Auteur : Adem (`naahas`).

## Stack

- **Backend** : Node.js + Express 4 + Socket.io 4 (`server.js`, point d'entrée, `npm start` → nodemon)
- **DB** : Supabase (Postgres) via `@supabase/supabase-js`, service-role key côté serveur uniquement
- **Auth** : Twitch OAuth (`user:read:email`) + `express-session` (cookie 24 h)
- **Frontend joueur** : Vue 3 via CDN (`vue.global.js`), un seul gros composant (`src/script/app.js`)
- **Frontend admin** : JS vanilla (`src/script/admin.js` + un module par mode)
- **Déploiement** : Render (Procfile `web: node server.js`) — `trust proxy`, cookies `sameSite:none` en prod
- Pas de build, pas de bundler, pas de tests. Les fichiers sont servis en statique tels quels.

## Arborescence

```
server.js              11k lignes — serveur principal + modes classic/rivalry/bombanime/collect/survie
server-ascension.js    mode Ascension (state, mini-jeux, validation serveur)
server-poll.js         mode Poll (bracket de votes)
dbs.js                 client Supabase + objet `db` (toutes les requêtes) + SERIES_FILTERS, XP/COIN_REWARDS, calculateLevel
character-variants.js  BombAnime : groupes d'alias par perso (citer « Kakarot » bloque « Goku »)
*.json                 données de jeu (voir plus bas)
scripts/               utilitaires ponctuels (reset-user-stats.js)
testuser.js            seed de faux joueurs
src/html/              landing, home (joueur), admin, ranking, question, *-prototypes
src/script/            app.js (joueur), admin.js + admin-{bombanime,collect,survie,poll,ascension}.js, survie-canvas.js
src/style/             home*.css, admin*.css (très volumineux, une feuille par mode)
src/img/               avatars, personnages, cartes, images par mode (questionpic, collectpic, tracepic, …)
```

## Modes de jeu

`gameState.lobbyMode` pilote tout côté serveur.

| lobbyMode   | Nom UI     | Principe |
|-------------|-----------|----------|
| `classic`   | Classic   | Quiz QCM, mode `lives` (vies) ou `points` (score + bonus rapidité) |
| `rivalry`   | Rivalité  | Même quiz en 2 équipes, scores/vies d'équipe, tiebreaker dédié |
| `bombanime` | BombAnime | Bombe tournante : citer un perso d'une série, alphabet à compléter, défis + bonus |
| `collect`   | Collect   | Jeu de cartes anime (stats ATK/INT/SPD/PWR, classes Assaut > Mirage > Oracle), marché, scan, fusion |
| `survie`    | **Trace** | Jeu d'exploration canvas (`survie-canvas.js`) : quêtes/NPC/structures + épreuves d'élimination |
| `poll`      | Poll      | Bracket de votes entre persos (catégories dans `polldata.json`) |
| `ascension` | Ascension | Tour d'étages, mini-jeux : guess, wordle, order, match, scramble, target, intruder, silhouette, techniques, weapons, rivals, couples |

⚠️ Le mode `survie` est **affiché « Trace »** partout dans l'UI (joueur et admin). Même chose côté
assets : `src/img/tracepic/`. Ne pas renommer l'un sans l'autre.

Les modes limités (`bombanime`, `collect`, `trace`, `survie`) ont un seuil de joueurs plus bas pour
compter dans les stats — cf. `getMinPlayersForStats()` en tête de `server.js`.

## Fichiers de données

- `bombdata.json` / `bombimages.json` — persos BombAnime par série + images
- `collect-cards.json` — cartes par anime (OnePiece, Naruto, Bleach = BIG 3, …)
- `ascensiondata.json` — `characters, animes, arcs, techniques, weapons, rivals, couples, same_voice, wordle_words`
- `polldata.json` — `animes`, `specialCategories`
- Les **questions du quiz** vivent en base Supabase (table `questions`), pas en JSON. Ajout/édition
  via la page `/question` protégée par `QUESTION_ADMIN_CODE`.

## Tables Supabase (via `dbs.js`)

`users`, `questions`, `used_questions`, `games`, `player_games`, `titles`, `badges`,
`shop_items`, `user_purchases`, `bombanime_suggestions`, `visits`, `keep_alive`.

Le workflow GitHub `.github/workflows/main.yml` ping `keep_alive` 3×/semaine pour éviter la mise en
veille du projet Supabase free tier.

## Admin & sessions

Trois niveaux :

1. **Admin normal** (streamer) — `ADMIN_PASSWORD`, **un seul slot actif à la fois**
   (`activeAdminSession`), 409 `admin_already_connected` si déjà pris, timeout d'inactivité.
2. **Master admin** (dev) — `MASTER_ADMIN_PASSWORD` via le champ `masterOverride`, sessions
   multiples (`masterAdminSessions`), pas de timeout, ne vole pas le slot du streamer.
3. **Question admin** — `QUESTION_ADMIN_CODE` pour la page `/question` uniquement.

## 🚧 État actuel : mode maintenance

Le site est **en maintenance / pré-lancement** :

- `GET /` sert `src/html/landing.html` (page « En maintenance ») — pour rouvrir le jeu, repasser sur
  `home.html` (commentaire explicite dans la route).
- `GET /admin` **redirige vers `/`** sauf si `req.session.isMasterAdmin`.
- `GET /admin/master` est la backdoor qui sert quand même `admin.html` pour permettre au master de
  saisir son override et d'ouvrir sa session.
- La landing contient des mini-jeux offline autonomes : **BombAnime solo vs bot** (données servies par
  `/api/bombanime/*`) et un **Pendu** derrière un code d'accès en dur côté client.
- Bandeau des **streamers partenaires** avec statut live (poll Twitch toutes les 2 min, route publique
  `/api/partners`).

## Variables d'environnement (`.env`, non versionné)

`NODE_ENV`, `PORT` (7000), `SESSION_SECRET`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `TWITCH_REDIRECT_URI`,
`ADMIN_PASSWORD`, `MASTER_ADMIN_PASSWORD`, `QUESTION_ADMIN_CODE`.

`TWITCH_REDIRECT_URI` est auto-déduit si absent (localhost en dev, `shonenmaster.com` en prod).

## Conventions du code

- **Tout est en français** : commentaires, noms de sections, messages d'erreur, UI. Les identifiants
  de code sont en anglais/franglais (`lobbyMode`, `playerBonuses`, `usedNames`).
- Sections délimitées par des bannières `// ====` / `// ═══` avec emoji. S'en servir pour naviguer
  dans `server.js` et `app.js` (grep `^// [^=═]`).
- État serveur : un unique objet `gameState` global (`server.js:1676`) avec un sous-objet par mode
  (`gameState.bombanime`, `.collect`, `.survie`, `.poll`, `.ascension`). Une seule partie à la fois.
- `Map`/`Set` pour les états volatils (joueurs, réponses, timers) → jamais sérialisables tels quels,
  toujours convertir avant un `emit`.
- Les joueurs sont identifiés par `twitchId` (persistant) **et** `socket.id` (volatile). La
  reconnexion remappe le `socketId` — cf. handlers `reconnect-player`, `*-reconnect`.
- Le serveur est **autoritaire** : toute validation de réponse/mini-jeu se fait côté serveur, le
  client n'affiche que le résultat.
- Les rewards de fin de partie passent par `getPreRewardData()` → distribution → `buildRewardSummary()`
  → emit `*-rewards-ready` (l'animation client a besoin de l'avant/après).

## Points d'attention

- `MIN_PLAYERS_FOR_STATS`, `MIN_PLAYERS_FOR_TEAM_STATS`, `MIN_PLAYERS_LIMITED_MODES` sont à **1**
  avec un commentaire `⚠️ TEMPORAIRE POUR TEST` — valeurs de prod attendues : 15 / 20 / 5.
- Fichiers énormes (`app.js` 13.8k lignes, `home.css` 16.6k, `server.js` 11.3k) : toujours cibler via
  grep/offset, ne jamais relire en entier.
- Pas de tests automatisés : toute modif se valide en lançant `npm start` et en ouvrant `/` + `/admin`.
