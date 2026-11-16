# Le classement

Ce document précède la page. Il existe parce que **la page peut attendre, les données
non** : tout ce qui n'est pas enregistré pendant qu'on joue est perdu pour toujours, et
aucune requête ne le retrouvera.

---

## 1. Ce qui se reconstitue déjà, et ce qui se perd

État au 16 novembre 2026, lu dans les tables, pas supposé.

`comptes` : `id, pseudo, avatar, xp, parties, cree_le, vu_le, victoires, titre,
pseudo_impose, rubis, titres, titre_prefixe, titre_suffixe, questions_vues`
`game_history` : `id, mode, players_count, winner_name, duration, created_at, reglages`

**Se reconstitue sans rien ajouter** : classement général par XP, par victoires, par
parties, par taux de victoire, par rubis, par ancienneté. Tout est dans `comptes`.

**Se perd à chaque partie jouée :**

| Ce qu'on veut | Pourquoi c'est perdu |
|---|---|
| Classement par mode | `comptes.parties` et `comptes.victoires` sont **globaux**. Aucune ventilation. |
| Classement par saison ou par mois | `comptes.xp` est un **cumul sans date**. Rien ne dit quand il a été gagné. |
| Séries de victoires | Nulle part. La v1 les avait (`current_win_streak`, `best_win_streak`), la v2 non. |
| Records par partie | Rien n'est conservé à la fin d'une manche. |

⚠️ **`game_history` ne rattrape rien.** Il garde `winner_name` — un **pseudo**, pas un
identifiant de compte — et aucune ligne par joueur. Il dit ce qui s'est joué, jamais
qui l'a joué.

---

## 2. Le choix de fond : une ligne par joueur et par partie

Tout ce qui précède se résout avec **une seule table**, et c'est la raison de la
préférer à quatre colonnes dénormalisées : une ligne datée par joueur et par partie
rend *dérivables* le par-mode, le par-saison, les séries, les records et le taux de
victoire — y compris ceux auxquels on ne pense pas encore.

Les colonnes cumulées de `comptes` restent : elles servent le profil, qui doit
s'afficher en une requête sans agréger mille lignes. Mais **la vérité est dans les
lignes**, et les cumuls s'en recalculent si jamais ils divergent.

C'est le retour assumé de `player_games`, la table de la v1, qu'on avait abandonnée
avec le reste du système Twitch.

### La table

Voir [docs/classement.sql](classement.sql).

| Colonne | Rôle |
|---|---|
| `compte_id` | Le joueur. ⚠️ L'**identifiant**, jamais le pseudo : un pseudo se change. |
| `partie_id` | Regroupe les joueurs d'une même partie. Sans lui, impossible de dire « cette victoire et cette défaite sont la même manche ». |
| `mode` | `classic`, `rivalry`, `bombanime`, `rush`, `ascension`, `collect`, `codanime` |
| `gagnant` | booléen |
| `joueurs` | Combien d'humains distincts. Sert à écarter les parties trop petites **à la lecture**. |
| `duree` | Secondes |
| `xp_gagne`, `rubis_gagnes` | Ce que la partie a rapporté. C'est **ça** qui rend possibles les saisons : « top XP du mois » = une somme sur une plage de dates. |
| `reglages` | `jsonb`. Le **seau de comparaison** — voir §4. |
| `score` | `numeric`, le record du mode. Nul quand le mode n'en a pas. |
| `details` | `jsonb`, le reste. |
| `cree_le` | La date. Toutes les saisons en découlent. |

⚠️ **Seuls les comptes ont une ligne.** Un invité n'a pas d'identifiant stable : lui en
écrire une créerait des classements de fantômes. C'est aussi ce qui garde le volume
raisonnable.

---

## 3. Les records, mode par mode

⚠️ **Trois des cinq records demandés n'ont aucun compteur aujourd'hui.** Ils sont notés
« à ajouter » : c'est exactement le travail qui doit être fait avant que les gens
jouent.

| Mode | Record | Sens | État |
|---|---|---|---|
| **BombAnime** | Personnages nommés par le joueur dans la manche | max | ⚠️ **à ajouter** — `persosTrouves` est un compteur **de salon**, pas de joueur |
| **Rush** | Plus longue série de bonnes réponses d'affilée | max | ⚠️ **à ajouter** — `etat.serie` existe mais retombe à zéro, son maximum n'est pas retenu |
| **Rush** | Meilleur score d'une manche | max | ✅ `etat.record` existe déjà |
| **Ascension** | Temps pour atteindre le sommet | **min** | ✅ `finishedPlayers` porte le rang ; le temps est à confirmer |
| **Collect** | Temps pour gagner | **min** | ✅ `etat.debut` existe, `onGameEnd` rend déjà les secondes |
| **Classique** | Plus longue série de bonnes réponses d'affilée | max | ⚠️ **à ajouter** — `correctAnswers` compte le total, pas la suite |
| **Codanime** | — | — | Rien de défendable : c'est un jeu d'équipe où la performance est collective. Un classement individuel y mentirait. |

### Pourquoi la série plutôt que le score, en Classique

Le score dépend de `questionsCount`, du bonus de vitesse et du nombre de joueurs : deux
scores ne se comparent qu'à réglages identiques, ce qui fragmente le classement en
dizaines de tableaux vides. **La série de bonnes réponses d'affilée se compare
toujours** — elle ne dépend d'aucun réglage, elle mesure la connaissance seule, et elle
se raconte (« dix-sept d'affilée »).

⚠️ Elle a un biais à connaître : une partie longue offre plus d'occasions qu'une courte.
Il faut donc soit un minimum de questions, soit assumer que le record appartient aux
formats longs.

---

## 4. Le seau de comparaison : ce qui rend un record honnête

C'est le piège central de tout classement de records, et il ne se voit qu'une fois le
tableau rempli de valeurs absurdes.

**L'hôte règle la partie.** Il peut mettre Ascension à trois étages et signer le
meilleur temps de l'histoire ; il peut mettre Rush sur une seule série de personnages
et enchaîner cinquante bonnes réponses. Un record n'a de sens **qu'à réglages égaux**.

D'où `reglages` en `jsonb` sur chaque ligne, et un classement **par seau** :

- **BombAnime** : la série (`serie`) — c'est exactement ce que tu demandais
- **Rush** : la durée (60 / 90 / 120) **et** le filtre
- **Ascension** : le nombre d'étages
- **Collect** : les paramètres de la main
- **Classique** : rien, puisque la série ne dépend d'aucun réglage

---

## 5. Ce qui a été oublié, et qu'il faut trancher

Ce ne sont pas des détails de présentation : chacun change ce qu'on écrit en base ou ce
qui s'affiche, et trois d'entre eux ont déjà coulé des classements ailleurs.

### a. Le minimum de parties — **le piège n° 1**

Un joueur avec **une** partie et **une** victoire affiche 100 % et domine le classement
du taux de victoire. C'est le bug le plus courant des classements, et il est fatal : la
table du haut devient une liste de gens qui ont joué une fois.

Deux solutions, à choisir :
- **un plancher** — au moins 10 parties pour figurer. Simple, lisible, brutal ;
- **une moyenne lissée** — on ajoute un lest de parties fictives à 0, si bien qu'il faut
  en jouer beaucoup pour s'approcher de son vrai taux. Plus juste, moins lisible.

Défaut retenu si rien n'est dit : **plancher à 10 parties**.

### b. Les parties avec bots

BombAnime a un partenaire, et le mode développeur peut peupler un salon. Une partie à
deux humains plus six bots ne vaut pas une partie à huit. La colonne `joueurs` ne compte
déjà **que les humains distincts** — mais il faut décider si une partie *contenant* des
bots peut produire un record. Défaut retenu : **non pour les records, oui pour l'XP**
(qui a déjà ses propres seuils).

### c. Les saisons

Rien à écrire en base : `cree_le` suffit, toutes les plages s'en déduisent. Reste à
décider **la durée** — le mois est l'évidence, mais un mois ne laisse pas le temps de
remonter un classement. Trois mois donne des saisons qui veulent dire quelque chose.

⚠️ Et il faut un **all-time à côté**, pas à la place : sans saison, celui qui arrive en
mars ne rattrapera jamais celui de janvier et ne joue plus pour le classement ; sans
all-time, le travail de l'année disparaît tous les trois mois.

### d. Les pseudos sont publics

Un classement affiche des pseudos à des gens qui ne sont pas dans la partie. C'est un
changement de ce que le site fait des données, et
[la page de confidentialité](../src/html/confidentialite.html) dit aujourd'hui que le
pseudo « ne sort pas du salon ». **Elle devra être corrigée en même temps que la page
sort**, pas après.

### e. Les ex æquo

À valeur égale, c'est **le premier à l'avoir atteinte** qui passe devant — `cree_le`
tranche. Sans règle, l'ordre dépend de celui que la base rend en premier, et il change
d'une requête à l'autre sous les yeux du joueur.

### f. Ce qui manque encore à ta liste

- **Le classement par rubis** fonctionnera, mais dès que la boutique ouvre il mesurera
  ce qu'on n'a **pas** dépensé. Un gros score y dira « avare », pas « fort ». Si tu le
  gardes, mieux vaut classer sur les **rubis gagnés** (`sum(rubis_gagnes)`), pas sur le
  solde.
- **Le nombre de parties jouées** — le classement de l'assiduité. Il n'a rien de
  glorieux, mais c'est le seul où un joueur moyen peut figurer, et c'est ce qui le rend
  utile.
- **Le classement des hôtes** : qui a ouvert le plus de salons, réuni le plus de
  joueurs. Pour un site de streamers, c'est le chiffre qui parle le plus — et il ne
  demande qu'une colonne `hote` sur la ligne.
- **La progression du mois** : qui a pris le plus d'XP sur trente jours, quel que soit
  son total. C'est le classement qui donne une chance aux nouveaux, et il sort
  gratuitement de `sum(xp_gagne)`.

---

## 6. Volume

Une ligne par compte et par partie. À huit inscrits et cinquante parties par jour :
400 lignes par jour, ~150 000 par an, environ 30 Mo — sur les 500 Mo du palier gratuit
de Supabase. Les invités n'en écrivent aucune.
