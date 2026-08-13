# ShonenMaster (repo : `weebmaster`) — branche `v2`

Party-games anime **multijoueur temps réel**, en parties privées.

**Modèle produit (v2) :** n'importe qui crée une partie, personne n'a de compte. Le créateur est
l'*hôte* et pilote la partie depuis `/admin` ; les joueurs saisissent un pseudo et rejoignent.
Cibles : streamers Twitch **et TikTok**, et groupes d'amis en vocal.

Domaine prod : `shonenmaster.com`. Auteur : Adem (`naahas`).

⚠️ **Cette branche est la refonte v2.** `main` porte encore la v1 (comptes Twitch, 7 modes,
progression). Voir [PLAN-V2.md](PLAN-V2.md) pour l'état d'avancement et la suite.

État : **phase 1 terminée** (suppression). Phase 2 (multi-room) à faire — aujourd'hui le serveur
n'héberge toujours qu'**une seule partie à la fois**.

## Stack

- **Backend** : Node.js + Express 4 + Socket.io 4 (`server.js`, point d'entrée, `npm start` → nodemon)
- **DB** : Supabase (Postgres) — ne stocke plus que les **questions** et les suggestions BombAnime
- **Identité** : pseudo invité en `localStorage` (`playerId` + `pseudo`). Plus d'OAuth, plus de session serveur.
- **Frontend joueur** : Vue 3 via CDN (`vue.global.js`), un seul gros composant (`src/script/app.js`)
- **Frontend hôte** : JS vanilla (`src/script/admin.js` + `admin-bombanime.js`)
- **Déploiement** : Render (Procfile `web: node server.js`)
- **Test** : `npm run smoke` — lancer `npm start` à côté, le script joue un cycle complet dans les 2 modes
- Pas de build, pas de bundler. Les fichiers sont servis en statique tels quels.

## Arborescence

```
server.js              5.9k lignes — serveur + modes classic / rivalry / bombanime
dbs.js                 client Supabase : questions + suggestions BombAnime uniquement
character-variants.js  BombAnime : groupes d'alias par perso (citer « Kakarot » bloque « Goku »)
bombdata.json          persos BombAnime par série ; bombimages.json : images (URLs imgur)
scripts/smoke-test.js  test de bout en bout (npm run smoke)
docs/ASCENSION.md      conception du mode Ascension, mis de côté (branche archive/ascension)
src/html/              home (joueur), admin (hôte), question (back-office questions)
src/script/            app.js (joueur), admin.js + admin-bombanime.js
src/style/             home*.css, admin*.css
src/img/               avatars, questionpic
```

## Modes de jeu

`gameState.lobbyMode` pilote tout côté serveur.

| lobbyMode   | Nom UI    | Principe |
|-------------|-----------|----------|
| `classic`   | Classic   | Quiz QCM, mode `lives` (vies) ou `points` (score + bonus rapidité) |
| `rivalry`   | Rivalité  | Même quiz en 2 équipes, scores/vies d'équipe, tiebreaker dédié |
| `bombanime` | BombAnime | Bombe tournante : citer un perso d'une série, alphabet à compléter, défis + bonus |

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
- `/admin` : le panel de l'hôte, **ouvert sans mot de passe** en v2 — le contrôle d'accès reviendra
  en phase 2 sous forme de code de room + rôle host.
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
- Gros fichiers (`admin.js` 9.5k lignes, `home.css` 17k, `server.js` 5.9k) : cibler via grep/offset,
  ne jamais relire en entier.
- `admin.js` contient encore des branches mortes sur les modes supprimés (inoffensives, jamais
  atteintes). Elles disparaîtront avec la refonte du panel en phase 2.
- Valider une modif : `npm start` puis `npm run smoke`, et ouvrir `/` + `/admin` dans le navigateur.
