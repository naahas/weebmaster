# ShonenMaster (repo : `weebmaster`) — branche `v2`

Party-games anime **multijoueur temps réel**, en parties privées.

**Modèle produit (v2) :** n'importe qui crée une partie, personne n'a de compte. Le créateur est
l'*hôte* et pilote la partie depuis `/` ; les joueurs saisissent un pseudo et rejoignent.
Cibles : streamers Twitch **et TikTok**, et groupes d'amis en vocal.

Domaine prod : `shonenmaster.com`. Auteur : Adem (`naahas`).

⚠️ **Cette branche est la refonte v2.** `main` porte encore la v1 (comptes Twitch, 7 modes,
progression). Voir [PLAN-V2.md](PLAN-V2.md) pour l'état d'avancement et la suite.

État : **phase 1 terminée** (suppression), refonte du mode Classique terminée (écran de jeu, salon,
camps, classement final, passe mobile). Phase 2 (multi-room) à faire — aujourd'hui le serveur
n'héberge toujours qu'**une seule partie à la fois**, et BombAnime est encore intégralement en v1.

Les routes `/admin/*` sont **réservées à l'hôte** : l'ouverture d'un salon tire un jeton
(`gameState.hostToken`) remis au seul créateur, qu'un middleware monté sur `/admin` exige ensuite en
en-tête `X-Host-Token`. En phase 2 le jeton passera dans la room, le middleware ne bougera pas.

## Stack

- **Backend** : Node.js + Express 4 + Socket.io 4 (`server.js`, point d'entrée, `npm start` → nodemon)
- **DB** : Supabase (Postgres) — ne stocke plus que les **questions** et les suggestions BombAnime
- **Identité** : pseudo invité en `localStorage` (`playerId` + `pseudo`). Plus d'OAuth, plus de session serveur.
- **Frontend** : Vue 3 via CDN (`vue.global.js`), un seul gros composant (`src/script/app.js`) —
  hôte et joueurs partagent la même page, seul `isHost` change ce qui s'affiche
- **Déploiement** : Render (Procfile `web: node server.js`)
- **Tests** : `npm run check` (le template Vue compile-t-il), puis, serveur lancé à côté :
  `npm run smoke` (cycle de jeu complet), `npm run test:host` (contrôles de l'hôte, camps,
  rafraîchissement), `npm run test:tie` (départage solo et en camps, ~1 min) et `npm run test:hote`
  (les routes /admin sont-elles bien fermées aux visiteurs)
- Pas de build, pas de bundler. Les fichiers sont servis en statique tels quels.

## Arborescence

```
server.js              6.2k lignes — serveur + modes classic / rivalry / bombanime
dbs.js                 client Supabase : questions + suggestions BombAnime uniquement
character-variants.js  BombAnime : groupes d'alias par perso (citer « Kakarot » bloque « Goku »)
bombdata.json          persos BombAnime par série ; bombimages.json : images (URLs imgur)
scripts/smoke-test.js         cycle de jeu complet (npm run smoke)
scripts/test-host-controls.js contrôles de l'hôte, camps, rafraîchissement (npm run test:host)
scripts/test-departage.js     égalité puis départage, solo et camps (npm run test:tie)
scripts/test-hote.js          les routes /admin sont-elles fermées aux visiteurs (npm run test:hote)
docs/ASCENSION.md      conception du mode Ascension, mis de côté (branche archive/ascension)
src/html/              home (le jeu), question (back-office questions), prototypes-*.html
src/script/            app.js — le seul script du jeu
src/style/             home.css, home-bombanime.css
src/img/               avatars, questionpic
```

## Modes de jeu

`gameState.lobbyMode` pilote tout côté serveur.

| lobbyMode   | Nom UI    | Principe |
|-------------|-----------|----------|
| `classic`   | Classique | Quiz QCM en solo. Réglage **Mode** : `lives` (vies) ou `points` (score + bonus rapidité) |
| `rivalry`   | Classique | Le même quiz en deux camps. Ce n'est **pas un mode à part** : c'est le réglage **Format** du quiz |
| `bombanime` | BombAnime | Bombe tournante : citer un perso d'une série, alphabet à compléter, défis + bonus |

⚠️ `classic` et `rivalry` sont **un seul mode pour le joueur**. Le réglage *Format* (Solo / Équipe)
bascule `lobbyMode` de l'un à l'autre en cours de salon (`POST /admin/set-teams`). Le badge de mode
affiche « Classique » dans les deux cas. C'est l'hôte qui attribue les camps (pastille sur chaque
joueur, ou *Mélanger*) ; un joueur ne choisit jamais le sien, et un nouvel arrivant tombe dans le
camp le moins fourni.

Modes retirés en v2 (code en git sur le tag `v1-final`) : Trace (survie), Collect, Poll, Ascension.
Ascension est documenté dans docs/ASCENSION.md et conservé sur la branche `archive/ascension`.

## Fichiers de données

- `bombdata.json` / `bombimages.json` — persos BombAnime par série + images
- Les **questions du quiz** vivent en base Supabase (table `questions`). Ajout/édition via la page
  `/question` protégée par `QUESTION_ADMIN_CODE`.

## Tables Supabase (via `dbs.js`)

`questions`, `bombanime_suggestions`, `reported_questions`, `keep_alive`.

Les tables de comptes (`users`, `games`, `player_games`, `titles`, `badges`, `shop_items`,
`user_purchases`, `used_questions`, `visits`) ne sont plus lues ni écrites.

Le workflow GitHub `.github/workflows/main.yml` ping `keep_alive` 3x/semaine pour éviter la mise en
veille du projet Supabase free tier.

## Accès

- `/` : le jeu (saisie du pseudo puis lobby).
- `/admin/*` : plus aucune page, mais les routes HTTP que le client de l'hôte appelle (réglages,
  démarrer, question suivante, camps, exclure). **Toutes exigent le jeton d'hôte**, sauf l'ouverture
  d'un salon — c'est elle qui le crée. L'événement socket `kick-player` le porte aussi.
- `/prototypes/*` : pages de travail sur le visuel (boutons, timer, cœurs, HUD, podium, icônes…).
- `/question` : back-office des questions, protégé par `QUESTION_ADMIN_CODE`.

## Variables d'environnement (`.env`, non versionné)

`NODE_ENV`, `PORT` (7000), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `QUESTION_ADMIN_CODE`.

Les variables Twitch, `SESSION_SECRET`, `ADMIN_PASSWORD` et `MASTER_ADMIN_PASSWORD` ne servent plus.

## Conventions du code

- **Tout est en français** : commentaires, noms de sections, messages d'erreur, UI. Les identifiants
  de code sont en anglais/franglais (`lobbyMode`, `playerBonuses`, `usedNames`).
- Sections délimitées par des bannières `// ====` / `// ═══` avec emoji. S'en servir pour naviguer
  dans `server.js` et `app.js` (grep `^// [^=═]`).
- État serveur : un unique objet `gameState` global, avec un sous-objet `gameState.bombanime`.
  **Une seule partie à la fois sur tout le serveur** — c'est ce que la phase 2 doit lever.
- `Map`/`Set` pour les états volatils (joueurs, réponses, timers) → jamais sérialisables tels quels,
  toujours convertir avant un `emit`.
- Les joueurs sont identifiés par `twitchId` **et** `socket.id` (volatile). ⚠️ `twitchId` porte
  désormais le `playerId` invité : le nom du champ est un reste de la v1, renommage prévu en phase 2.
- Le serveur est **autoritaire** : toute validation de réponse se fait côté serveur, le client
  n'affiche que le résultat.

## Points d'attention

- `MIN_PLAYERS_FOR_STATS` et consorts ont disparu avec les stats : plus de seuil de joueurs.
- Gros fichiers (`home.css` 11.5k lignes, `server.js` 6.2k, `app.js` 4.9k) : cibler via grep/offset,
  ne jamais relire en entier.
- Valider une modif : `npm run check`, puis `npm start` et les trois suites, et ouvrir `/` dans le
  navigateur.
- ⚠️ `transform` sur un ancêtre crée un bloc conteneur et casse le `position: fixed` de ses
  descendants. C'est l'erreur qui revient le plus souvent sur ce projet.
- ⚠️ Une reconnexion socket passe par `register-authenticated` (qui rebranche l'entrée du joueur sur
  la nouvelle socket) **puis** `join-lobby`. Ne jamais déconnecter « l'ancienne » socket sans
  vérifier qu'elle n'est pas la socket courante.
- ⚠️ `home.html` est un template Vue inline : un `v-else` séparé de son `v-if` par un autre
  élément casse toute la page (écran blanc). `npm run check` attrape ce cas.
