# ShonenMaster (repo : `weebmaster`) — branche `v2`

Party-games anime **multijoueur temps réel**, en parties privées.

**Modèle produit (v2) :** n'importe qui crée une partie, personne n'a de compte. Le créateur est
l'*hôte* et pilote la partie depuis `/` ; les joueurs saisissent un pseudo et rejoignent.
Cibles : streamers Twitch **et TikTok**, et groupes d'amis en vocal.

Domaine prod : `shonenmaster.com`. Auteur : Adem (`naahas`).

⚠️ **Cette branche est la refonte v2.** `main` porte encore la v1 (comptes Twitch, 7 modes,
progression). Voir [PLAN-V2.md](PLAN-V2.md) pour l'état d'avancement et la suite.

État : **phase 1 terminée** (suppression), refonte du mode Classique terminée (écran de jeu, salon,
camps, classement final, passe mobile), **phase 2 terminée** : le serveur héberge autant de salons
qu'on veut, chacun indépendant. Reste la passe visuelle mobile de **BombAnime**.

Les routes `/admin/*` sont **réservées à l'hôte** : l'ouverture d'un salon tire un jeton
(`gameState.hostToken`) remis au seul créateur, qu'un middleware monté sur `/admin` exige ensuite en
en-tête `X-Host-Token`. Le jeton désigne aussi **le salon** : le middleware pose `req.room`.

## Stack

- **Backend** : Node.js + Express 4 + Socket.io 4 (`server.js`, point d'entrée, `npm start` → nodemon)
- **DB** : Supabase (Postgres) — ne stocke plus que les **questions**, les suggestions BombAnime et
  l'historique des parties (`game_history`, SQL dans `docs/game-history.sql`). Les questions sont
  **chargées en mémoire au démarrage** (`assurerBanque` dans `dbs.js`) : une requête par question
  et par salon ne tenait pas à plusieurs parties. Le back-office `/question` invalide ce cache.
- **Identité** : pseudo invité en `localStorage` (`playerId` + `pseudo`). Plus d'OAuth, plus de session serveur.
- **Frontend** : Vue 3 via CDN (`vue.global.js`), un seul gros composant (`src/script/app.js`) —
  hôte et joueurs partagent la même page, seul `isHost` change ce qui s'affiche
- **Déploiement** : Heroku, plan Basic, **un seul dyno web** (Procfile `web: node server.js`,
  Node épinglé en 20.x). ⚠️ Les salons vivent dans la mémoire du processus, sans adaptateur Redis :
  passer à deux dynos donnerait deux ensembles de salons qui s'ignorent. Et le recyclage quotidien
  du dyno tue les parties en cours — c'est architectural, aucun plan n'y change rien.
- **Tests** : `npm run check` (le template Vue compile-t-il) et `npm run check:vue`
  (une propriété calculée appelée avec des parenthèses dans le gabarit lève une TypeError
  et blanchit la page ; une méthode citée sans parenthèses rend une fonction toujours
  vraie — `check` ne voit ni l un ni l autre, ce sont des expressions valides), puis,
  serveur lancé à côté :
  `npm run smoke` (cycle de jeu complet), `npm run test:host` (contrôles de l'hôte, camps,
  rafraîchissement), `npm run test:tie` (départage solo et en camps, ~1 min), `npm run test:hote`
  (les routes /admin sont-elles fermées aux visiteurs), `npm run test:rooms` (deux salons
  simultanés, plafond), `npm run test:mixte` (quiz et BombAnime en parallèle),
  `npm run test:rejouer` (deux manches d affilée sans répétition de question),
  `npm run test:historique` (chaque salon a sa propre mémoire),
  `npm run test:backoffice` (les routes /api/*question* exigent `QUESTION_ADMIN_CODE`),
  `npm run openings` liste les vignettes d openings a produire, serie par serie, avec
  le nom exact du fichier attendu — il ne verifie rien, il inventorie.
  `npm run openings:convertir` passe en WebP 400 px tout ce qui traine dans
  `src/img/ascensionpic/ascensionops` et supprime l original. Une capture d opening
  en PNG pese 400 a 800 Ko : les 171 vignettes feraient plus de 100 Mo, contre 5 en WebP.
  Un dossier peut lui etre passe (`-- ~/Bureau`) : il n y prend alors que les fichiers
  nommes `op_*` et ne supprime RIEN — on ne touche pas a ce qui vit hors du depot.
  `npm run test:preuve` (le lien de preuve d une question n atteint le joueur
  qu APRES la revelation : ni `new-question` ni `/game/state` ne le portent),
  `npm run test:collect` (le moteur de Collect sans serveur : les regles, les neuf
  duels du triangle, et surtout qu aucune main ne sort de chez son proprietaire),
  `npm run test:collect-salon` (Collect de bout en bout : reglages, partie jouee par
  les sockets, le duel, le depart d un joueur),
  `npm run test:debit` (le seau a jetons par socket : une brute est bornee a la
  rafale puis coupee, un joueur a cadence normale n en voit rien),
  `npm run test:fuites` (ce qu un curieux muni du seul code du salon peut lire :
  la reponse du quiz, les etages de la tour, les portes /admin, le pseudo d un
  client bricole),
  `npm run test:ascension` (le moteur d'étages, sans serveur : le tirage par sac, les
  sept types, et surtout qu'aucun ne livre sa réponse — ni par un champ, ni par un
  identifiant, ni par un nom de fichier),
  `npm run test:tour` (Ascension de bout en bout : salon, réglages, départ, premier étage),
  `npm run test:ampoule` (le joker de « Devine le perso » : seuil de trois, une seule fois, reprise),
  `npm run test:tour-fin` (classement final et rejeu — ⚠️ **3 min 30** : la montée
  se fait en silence, un minuteur expiré poussant à l étage suivant),
  `npm run test:tour-reprise` (rafraîchissement en pleine montée),
  `npm run test:tour-quitter` (quitter en pleine montée : on se fige, on n entend
  plus rien, on reste au classement — ~1 min, ~2 min avec `GRACE_DECONNEXION=3000`
  des deux côtés, qui joue en plus le cas de l onglet fermé sans prévenir),
  `npm run test:tour-salons` (deux Ascensions simultanées : réglages, étages et
  messages restent séparés),
  `npm run test:tour-grilles` (les épreuves à portraits : guess, target, intruder — ~2 min.
  Longtemps intermittente : elle rejouait 700 ms après une erreur, alors que celle-ci
  ferme la grille une seconde — le second clic tombait dans le vide une fois sur trois.
  Six passages d'affilée depuis), `npm run test:rush` (le mode Rush de bout en bout),
  `npm run test:rush-mult` (le barème du multiplicateur : le palier se compte en
  réponses et non en points, la casse sur une erreur, et le réglage éteint rend
  exactement le mode d'avant),
  `npm run test:depart` (quitter BombAnime en pleine partie), `npm run test:plafond` (le plafond
  de BombAnime : remplissage, refus du joueur de trop), `npm run test:bomb` (réglages
  BombAnime et enchaînement des manches), `npm run test:reprise`
  (l hôte revient après une coupure ; relance en équipes) et `npm run test:abandon`
  (un salon déserté se libère — à lancer avec `GRACE_SALON_VIDE=3000` des deux côtés).
  `npm run test:charge` mesure la tenue à N salons (`SALONS=15 JOUEURS=12`), il ne vérifie rien.
- Pas de build, pas de bundler. Les fichiers sont servis en statique tels quels.

## Arborescence

```
server.js              6.2k lignes — serveur + modes classic / rivalry / bombanime
dbs.js                 client Supabase : questions + suggestions BombAnime uniquement
pseudos-interdits.js   les pseudos refuses : deux listes, l une cherchee partout,
                       l autre en mot entier. Voir l en-tete du fichier
server-collect.js      mode Collect : le moteur (pur, eprouvable sans serveur) puis son
                       raccord au salon. Les trois reglages qui comptent viennent de
                       mesures, l en-tete du fichier dit lesquels et pourquoi
jetons-images.js       les portraits de Rush et d Ascension servis sous jeton : leur nom
                       de fichier disait la reponse. Route /pic/<jeton>
character-variants.js  BombAnime : groupes d'alias par perso (citer « Kakarot » bloque « Goku »)
bombdata.json          persos BombAnime par série ; bombimages.json : images (URLs imgur)
scripts/smoke-test.js         cycle de jeu complet (npm run smoke)
scripts/test-host-controls.js contrôles de l'hôte, camps, rafraîchissement (npm run test:host)
scripts/test-departage.js     égalité puis départage, solo et camps (npm run test:tie)
scripts/test-hote.js          les routes /admin sont-elles fermées aux visiteurs (npm run test:hote)
docs/ASCENSION.md      conception du mode Ascension, mis de côté (branche archive/ascension)
src/html/              home (le jeu), question (back-office questions), prototypes-*.html
src/script/            app.js — le seul script du jeu
src/style/             home.css, home-bombanime.css, home-collect.css
src/img/               avatars, questionpic
```

## Modes de jeu

`gameState.lobbyMode` pilote tout côté serveur.

| lobbyMode   | Nom UI    | Principe |
|-------------|-----------|----------|
| `classic`   | Classique | Quiz QCM en solo. Réglage **Mode** : `lives` (vies) ou `points` (score + bonus rapidité) |
| `rivalry`   | Classique | Le même quiz en deux camps. Ce n'est **pas un mode à part** : c'est le réglage **Format** du quiz |
| `rush`      | Rush      | Un portrait, un nom, sans touche Entrée. La plus longue série de la manche gagne. Réglages : **durée** (30/60/90 s), **limite par portrait** (5–12 s ou aucune), **filtre** (Tout, Mainstream, Big 3), **séquence** commune ou propre à chacun, et **multiplicateur** (non par défaut — voir plus bas). Jouable seul. Données dans `rushdata.json`, portraits dans `src/img/rushpic/` |
| `collect`   | Collect   | Jeu de cartes, 2 a 5 joueurs. Reunir **deux sets de trois** personnages du meme anime. A son tour, une action : piocher, echanger au marche, scanner une main, **voler** (deux temps de 7 s : on annonce sa cible, puis on designe une carte DE DOS chez elle ; elle se retourne au milieu du feutre. Si l on a la MEME CLASSE en main, on la garde en lachant une carte de cette classe ; sinon LE VOL ECHOUE — la carte retourne a sa place — et l on paie deux cartes d avoir tente a l aveugle. C est ce qui donne son prix au scan) ou poser un set. Poser ne refait PAS la main : on repart avec ce qui reste, et la pioche ajoute une carte tant que la main n est pas pleine. Le marche est une FILE : a chaque fin de tour celle de gauche part SOUS le paquet (jamais melee au
  hasard, sinon elle reviendrait aussitot), tout glisse d un cran et une neuve entre par la droite —
  la position d une carte est donc son compte a rebours, et une fleche marque celle qui s en va.
  Un ECHANGE, lui, se fait SUR PLACE : chacune prend la place de l autre et rien d autre ne bouge
  (faire glisser la rangee pour un troc la rendait illisible). Les deux ne se croisent jamais :
  un echange ne renouvelle pas le marche. Reglages : **main** (3, 4 ou 5 — l objectif suit tout seul : 3 paires, 2 sets de 3, ou 3 sets de 3) et **animes** (8/10/12) |
| `bombanime` | BombAnime | Bombe tournante : citer un perso d'une série, alphabet à compléter, défis + bonus. Réglages du salon : **série** (21 au choix), **temps du tour** (5–10 s, 8 par défaut), **vies** (1 ou 2, 2 par défaut) ; quinze joueurs au plus |

⚠️ **Le multiplicateur du Rush compte les RÉPONSES, jamais les points.** Un cran toutes les dix
bonnes réponses d'affilée : dix réponses valent dix points et ouvrent le ×2, dix de plus en valent
vingt — on est donc à **trente points quand le ×3 s'ouvre**, soixante pour le ×4. Compter le palier
sur le score affiché aurait ouvert le ×3 après quinze réponses puis le ×4 après quatre de plus :
l'emballement se serait mangé lui-même. D'où deux nombres dans l'état du joueur — `serie` compte les
réponses et ne sert qu'au palier, `score` est ce qu'on affiche et ce qui classe. Réglage éteint (le
défaut), le pas vaut toujours un et les deux valeurs sont égales : c'est le mode d'avant, au point
près. Le libellé du compteur reste « série » dans les deux cas : le nombre est alors un score, mais
faire changer le mot selon un réglage embrouillait plus qu il ne renseignait. Visuel dans
/prototypes/rush-multi.

⚠️ `classic` et `rivalry` sont **un seul mode pour le joueur**. Le réglage *Format* (Solo / Équipe)
bascule `lobbyMode` de l'un à l'autre en cours de salon (`POST /admin/set-teams`). Le badge de mode
affiche « Classique » dans les deux cas. C'est l'hôte qui attribue les camps (pastille sur chaque
joueur, ou *Mélanger*) ; un joueur ne choisit jamais le sien, et un nouvel arrivant tombe dans le
camp le moins fourni.

Modes retirés en v2 (code en git sur le tag `v1-final`) : Trace (survie), Collect, Poll, Ascension.
Ascension est documenté dans docs/ASCENSION.md et conservé sur la branche `archive/ascension`.

## Fichiers de données

- `bombdata.json` / `bombimages.json` — persos BombAnime par série + images
- `collectdata.json` — les cartes de Collect : 385 cartes sur 21 animes, chacune avec son
  portrait, son anime et sa classe. Genere depuis `collect-cards.json` (la source v1, gardee
  comme reference) ; portraits dans `src/img/collectpic/`, en WebP.
  ⚠️ Un anime doit fournir **au moins trois** cartes, sinon son set est impossible a reunir
- `ascensiondata.json` — les données d'Ascension. Deux clefs ne servent qu'à **un seul étage** :
  `wordle_words` pour le Wordle, et **`scramble_characters` / `scramble_animes` pour
  l'Anagramme**. ⚠️ L'anagramme se servait auparavant dans `characters` et `animes` en entier,
  filtrés à la volée : on ne pouvait pas en retirer un mot sans le retirer aussi de Devine le
  perso, de Cible, de l'Intrus et de la Liaison. Or cet étage demande du **mainstream** — remettre
  dans l'ordre les lettres d'un personnage qu'on ne connaît pas ne se devine pas, ça se subit —,
  là où les autres vivent très bien avec du plus pointu. Ajouter ou retirer un mot de l'anagramme
  se fait donc **dans ces deux listes, et nulle part ailleurs** ; une entrée absente reste jouable
  partout ailleurs. Chaque nom doit être **un seul mot de lettres, 4 à 10** (mélanger « One Piece »
  n'aurait pas de sens) ; le serveur annonce au démarrage combien il en a retenu et nomme celles
  qu'il écarte. Une liste vidée retombe sur l'ancien filtre : le mode ne peut pas se retrouver
  sans mots.
  L indice affiché sous les lettres — « Reconstitue le nom du personnage · Bleach » — est l anime
  du personnage, et il se **retrouve tout seul par le nom** : le serveur cherche l entrée dans
  `characters`. Écrire le nom suffit donc. Reste le personnage qui n existe nulle part ailleurs :
  il n a pas de portrait, donc rien à faire dans `characters` — l y mettre le ferait tirer par
  Devine le perso, Cible et l Intrus, qui montreraient une carte vide. Pour celui-là on écrit
  `{ "nom": "Ryuk", "anime": "Death Note" }` au lieu du nom seul. Sans indice trouvé ni donné,
  le mot reste jouable et le serveur le nomme au démarrage.
- Les **questions du quiz** vivent en base Supabase (table `questions`). Ajout/édition via la page
  `/question` protégée par `QUESTION_ADMIN_CODE`.

## Tables Supabase (via `dbs.js`)

`questions`, `bombanime_suggestions`, `reported_questions`, `keep_alive`.

Les tables de comptes (`users`, `games`, `player_games`, `titles`, `badges`, `shop_items`,
`user_purchases`, `used_questions`, `visits`) ne sont plus lues ni écrites.

Le workflow GitHub `.github/workflows/main.yml` ping `keep_alive` 3x/semaine pour éviter la mise en
veille du projet Supabase free tier.

## Mettre en ligne

Le travail se fait sur `v2` ; `main` est ce que Heroku déploie et n’en est jamais
qu’un ancêtre — personne ne commite dessus directement. Deux lignes suffisent donc,
sans changer de branche :

```bash
git push origin v2        # sauvegarde la branche de travail
git push origin v2:main   # avance main, ce qui déclenche le déploiement
```

Le second push est refusé si `main` a divergé — c’est le garde-fou : il ne
réécrit jamais rien. Dans ce cas seulement, il faut fusionner à la main.

Sur Heroku, vérifier que `ADMIN_PASSWORD` et `NODE_ENV=production` sont posées :
sans la première, ouvrir un salon Classique est refusé ; sans la seconde, les bots
de mise au point et `/admin/ascension/solution` resteraient ouverts.

## Accès

- `/` : le jeu (saisie du pseudo puis lobby).
- `/admin/*` : plus aucune page, mais les routes HTTP que le client de l'hôte appelle (réglages,
  démarrer, question suivante, camps, exclure). **Toutes exigent le jeton d'hôte**, sauf l'ouverture
  d'un salon — c'est elle qui le crée. L'événement socket `kick-player` le porte aussi.
- `/prototypes/*` : pages de travail sur le visuel (boutons, timer, cœurs, HUD, podium, icônes…).
  Dont `/prototypes/rush-passage` : six facons d enchainer les portraits du Rush.
  Et `/prototypes/rush-multi` : le multiplicateur RETENU, isole hors d une manche
  pour qu on puisse le regler sans jouer, avec le vrai bareme deroule a cote.
  Et `/prototypes/code` : cinq facons de demander le code du salon, avec un
  basculeur ordinateur/telephone.
  Et `/prototypes/rush-multi` : cinq facons d afficher le multiplicateur de Rush,
  la meme sequence rejouee en boucle (8, 9, 10 = deblocage, 11, 12, rate).
  Et `/prototypes/collect-duel` : les trois temps du vol — choisir la serie, choisir
  la carte, l arene — trois pistes chacun, rejouables au clic.
  Et `/prototypes/collect-sons` : les cinq gestes de Collect et leurs candidats
  sonores, plus un bouton qui joue une manche entiere — deux sons trop proches ne
  s entendent qu enchaines. Le choix s ecrit dans l adresse.
  Et `/prototypes/collect-attente` : huit facons de dire « il reflechit », posees
  sur un vrai siege, avec un curseur de taille.
  Et `/prototypes/collect-gestes` : quatre pioches et quatre facons de poser un
  set. ⚠️ Les images y sont en chemin ABSOLU (`/collectpic/…`) : une page servie
  sous `/prototypes/` chercherait sinon `/prototypes/collectpic/…`, qui n existe pas.
  Et `/prototypes/modes-mobile` : cinq facons de choisir un mode au doigt.
  Et `/prototypes/collect-lueur2` : le second tour, en beaucoup plus violent —
  arc electrique, double flux conique, circuit, neon liquide, eclats irreguliers.
  Et `/prototypes/collect-lueur` : six facons de signaler une carte dont on tient
  deja la serie, eprouvees a une, trois et cinq cartes allumees a la fois.
  Et `/prototypes/collect-hud` : le chrono, la pioche et les boutons d action de
  Collect, quatre pistes chacun — le chrono y tourne pour de vrai.
  Et `/prototypes/collect-triangle` : trois facons d afficher le triangle des classes
  en permanence — il n est pas decoratif, un joueur qui ne le comprend pas rate 99 %
  de ses vols contre 86 % de reussite pour celui qui choisit sa classe.
  Et `/prototypes/bomb-ellipse` : le cercle de BombAnime contre l ellipse,
  avec un curseur de joueurs et les mesures sous chaque telephone.
- `/question` : back-office des questions, protégé par `QUESTION_ADMIN_CODE`. Trois onglets :
  ajouter, lister, et relire les **suggestions de personnages** envoyées depuis BombAnime
  (`/api/suggestions`, `/api/suggestion-status`, `/api/delete-suggestion` — même code).

## Variables d'environnement (`.env`, non versionné)

`NODE_ENV`, `PORT` (7000), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `QUESTION_ADMIN_CODE`.

Facultative aussi, et de mise au point : `ASC_ETAGE_FORCE` impose le premier étage
d'Ascension (`wordle`, ou `match:anime_author` pour viser un sous-type de Liaison). Les
étages suivants restent tirés au sort. Elle ne vit que dans `.env` — rien à défaire dans
le code — et le serveur l'annonce au démarrage pour qu'on ne l'oublie pas en ligne.

`GRACE_LOBBY_MS` (60 000) est le sursis d un joueur qui se deconnecte DU SALON — jamais
en cours de partie, ou il est conserve quoi qu il arrive. Il valait cinq secondes, ce qui ne
se voyait qu a plusieurs sur telephone : verrouiller son ecran ou passer sur le chat du stream
coupe la socket bien au-dela, le joueur etait retire, et `join-lobby` le refusait ensuite des
que l hote avait relance. Il restait devant SON ecran de salon sans etre nulle part.

Facultatives : `MAX_CONNECTIONS_PER_IP` (100 par défaut — les opérateurs mobiles placent leurs
abonnés derrière une même IP, un plafond bas couperait la moitié d'un public) et `MAX_ROOMS` (50).

`EVENEMENTS_PAR_SECONDE` (25) borne ce qu'**une socket** peut envoyer : le plafond par IP ne
comptait que les connexions ouvertes, une seule suffisait ensuite à noyer la boucle du dyno —
partagée par tous les salons. Un seau à jetons posé en `socket.use()` laisse passer une rafale
de 2× puis jette en silence ; au-delà de 300 refus la socket est fermée. Le client le plus
bavard est celui du Rush, qui se limite lui-même à seize envois par seconde.

`ADMIN_PASSWORD` (l'ancien panneau d'administration) resservait : voir la mesure temporaire
ci-dessous. Les variables Twitch, `SESSION_SECRET` et `MASTER_ADMIN_PASSWORD` ne servent plus.

## ⏳ Mesure temporaire — le mode Classique est sous mot de passe

Ouvrir un salon **Classique** exige `ADMIN_PASSWORD` ; Rush et BombAnime restent libres. Le
contrôle est dans `/admin/toggle-game`, **avant `creerRoom()`** — un refus ne doit pas laisser
de salon fantôme. Sans la variable, l'ouverture est refusée plutôt qu'autorisée : une variable
oubliée au déploiement annulerait sinon la mesure en silence.

Les suites ouvrent des salons Classique : elles lisent le mot de passe via `scripts/mdp-hote.js`.
`test:hote` ouvre en Rush, son objet étant le jeton d'hôte et non cette mesure.

Pour lever la mesure, trois endroits : le garde dans `/admin/toggle-game`, `demandeMdp` dans
`app.js` (+ le voile `v2-mdp-*` dans `home.html` et `home.css`), et `scripts/mdp-hote.js`.

## Conventions du code

- **Tout est en français** : commentaires, noms de sections, messages d'erreur, UI. Les identifiants
  de code sont en anglais/franglais (`lobbyMode`, `playerBonuses`, `usedNames`).
- Sections délimitées par des bannières `// ====` / `// ═══` avec emoji. S'en servir pour naviguer
  dans `server.js` et `app.js` (grep `^// [^=═]`).
- État serveur : une `Map` `rooms`, du code de salon vers son état. `etatNeuf()` en fabrique un,
  `creerRoom()` / `fermerRoom()` l'ouvrent et le referment. Chaque point d'entrée résout le sien :
  `req.room` pour les routes `/admin`, `roomDeSocket(socket)` pour les événements, `roomParCode()`
  pour la jointure et `/game/state?code=`. Les fonctions de jeu reçoivent l'état en **premier
  paramètre**, toujours nommé `gameState`.
- Toute diffusion passe par `diffuser(gameState, evt, payload)` → `io.to(roomCode)`. **Ne jamais
  appeler `io.emit` directement** : le message partirait à tous les salons.
- Un salon vide se referme après dix minutes ; à `MAX_ROOMS` (50), les salons abandonnés depuis
  plus d'une minute sont récupérés d'abord. Le délai protège un salon qui vient d'ouvrir : son hôte
  n'y est pas encore entré.
- `Map`/`Set` pour les états volatils (joueurs, réponses, timers) → jamais sérialisables tels quels,
  toujours convertir avant un `emit`.
- Les joueurs sont identifiés par `playerId` (pseudo invité) **et** `socket.id` (volatile).
- Le serveur est **autoritaire** : toute validation de réponse se fait côté serveur, le client
  n'affiche que le résultat.

## Le lien de preuve d’une question

Chaque question du quiz peut porter un `proof_url`, saisi dans `/question`. Une pastille bleue le
rejoint sous le drapeau de signalement pendant les resultats, **reservee a l’hote** comme le
drapeau : c’est lui qui arbitre.

⚠️ **Il ne part qu’APRES la revelation.** L’URL nomme tres souvent la reponse —
`…/wiki/One_For_All` sous « Quel est le pouvoir de Deku ? ». Il voyageait avec `new-question`,
donc lisible dans l’onglet reseau avant d’avoir repondu. Il vit maintenant dans
`gameState.currentQuestion`, d’ou `questionSansReponse()` le retire avec `correctAnswer` :
`/game/state` s’ouvre avec le seul code du salon pendant que la question est posee, et n’aurait
fait que deplacer la fuite. Le client le recoit par `question-results`.
`npm run test:preuve` tient les trois portes.

## Points d'attention

- L accueil compte les parties et en montre les dernieres, avec deux seuils :
  `MIN_JOUEURS_COMPTEUR` (3) pour ce qu on garde et ce qu on compte — c est ce
  chiffre qui renseigne sur le trafic —, `MIN_JOUEURS_LISTE` (5) pour ce qu on
  affiche, tous modes confondus. Le filtre est a l ecriture pour le premier : une
  partie sous trois joueurs n entre jamais en base, et ne pourra donc pas etre
  comptee apres coup.
- Gros fichiers (`home.css` 11.5k lignes, `server.js` 6.2k, `app.js` 4.9k) : cibler via grep/offset,
  ne jamais relire en entier.
- Les portraits de Rush et d'Ascension sont en **WebP**, pas en PNG : à 225×350 de trait manga,
  le PNG demandait 150 Ko là où le WebP en prend 15. Un portrait ajouté doit suivre, sans quoi
  il pèsera dix fois ses voisins. Les noms cités dans `rushdata.json` et `ascensiondata.json`
  portent l'extension : elle doit correspondre au fichier.
- Valider une modif : `npm run check`, puis `npm start` et les trois suites, et ouvrir `/` dans le
  navigateur.
- ⚠️ `transform` sur un ancêtre crée un bloc conteneur et casse le `position: fixed` de ses
  descendants. C'est l'erreur qui revient le plus souvent sur ce projet.
- ⚠️ Une reconnexion socket passe par `register-authenticated` (qui rebranche l'entrée du joueur sur
  la nouvelle socket) **puis** `join-lobby`. Ne jamais déconnecter « l'ancienne » socket sans
  vérifier qu'elle n'est pas la socket courante.
- ⚠️ `home.html` est un template Vue inline : un `v-else` séparé de son `v-if` par un autre
  élément casse toute la page (écran blanc). `npm run check` attrape ce cas, et depuis qu il
  analyse aussi les expressions (`prefixIdentifiers`), il attrape également un `@click` dont
  la syntaxe JavaScript est fautive — qui compilait sans broncher et blanchissait la page.
