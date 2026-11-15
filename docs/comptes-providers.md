# Déclarer les fournisseurs de connexion dans Supabase

Ce qui reste à faire pour que la connexion existe, et qui **n'est pas du code** : trois sites,
une quinzaine de clics. Le SQL de la table est dans [comptes.sql](comptes.sql).

## Qui est ouvert, et qui ne l'est pas

| | Bouton dans le jeu | Fournisseur Supabase |
|---|---|---|
| **Discord** | ✅ | à activer |
| **Twitch** | ✅ | à activer |
| **Google** | ❌ **retiré** | ⚠️ **encore actif** |

⚠️ **Le bouton Google a été retiré, pas le fournisseur.** Le sélecteur de comptes Google fait
d'un second compte une affaire de deux clics, sans mot de passe : c'est dix identités pour une
personne, donc dix fois l'XP et les rubis d'une partie. Discord et Twitch demandent tous les deux
une adresse distincte et une vraie reconnexion.

Mais **le flux répond toujours** à qui fabrique l'URL à la main — retirer un bouton ne ferme pas
une porte. Pour la fermer : **Authentication → Providers → Google → désactiver**. L'annexe garde
sa déclaration, pour le jour où la question se repose.

---

## ⚠️ D'abord : les DEUX URL qu'on confond

C'est la seule vraie difficulté de ce chantier. Tout le reste est du remplissage de formulaire.

| | Quelle adresse | Où elle se colle |
|---|---|---|
| **L'URL de retour** (*callback*) | celle de **Supabase** : `https://<ref>.supabase.co/auth/v1/callback` | chez **Discord**, chez **Twitch** |
| **La liste blanche** (*Redirect URLs*) | celles de **shonenmaster.com** | chez **Supabase** |

Les intervertir est l'erreur classique, et elle ne se voit qu'au moment du premier essai de
connexion — jamais avant. Le sens est celui-ci : le fournisseur renvoie le joueur **à Supabase**,
et Supabase le renvoie **au site**. Chacun a donc besoin de l'adresse du suivant.

Le `<ref>` se lit dans `.env`, ligne `SUPABASE_URL` : c'est la partie entre `https://` et
`.supabase.co`. ⚠️ Il n'est pas écrit ici parce que **ce dépôt est public** — l'adresse n'est pas
un secret (le navigateur la connaîtra), mais rien n'oblige à la publier.

⚠️ **Jamais de slash à la fin.** `…/auth/v1/callback/` et `…/auth/v1/callback` sont deux adresses
différentes pour Google et Discord, et le refus s'appelle `redirect_uri_mismatch`. Même règle pour
la liste blanche.

---

## 1. Discord

**Developer Portal** → <https://discord.com/developers/applications>

1. **New Application**. Le nom et l'icône sont ceux que le joueur verra sur l'écran
   d'autorisation : mettre **ShonenMaster** et le logo du site, pas un nom de travail.
2. Onglet **OAuth2** → section **Redirects** → **Add Redirect** → coller l'URL de retour de
   Supabase → **Save Changes**.
3. Toujours dans **OAuth2**, relever **Client ID** et **Client Secret** (*Reset Secret* pour le
   faire apparaître la première fois).

ℹ️ **Rien à cocher du côté des scopes.** Supabase demande `identify email` tout seul ; la liste de
cases de la page Discord sert à fabriquer un lien d'invitation à la main, ce dont on ne se sert
pas.

---

## 2. Twitch

**Developer Console** → <https://dev.twitch.tv/console/apps>

1. ⚠️ **L'authentification à deux facteurs doit être active sur le compte Twitch**, sinon le
   bouton *Register Your Application* refuse tout net. C'est le seul blocage de cette page, il
   n'est écrit nulle part sur le formulaire, et il se règle dans les paramètres de sécurité du
   compte — avec un vrai numéro de téléphone.
2. **Register Your Application**. Le *Name* est **ce que le joueur verra** sur l'écran
   d'autorisation : mettre **ShonenMaster**. ⚠️ Twitch exige qu'il soit **unique sur toute la
   plateforme** — si le nom est pris, il refuse, et il faut en trouver un autre.
3. **OAuth Redirect URLs** → coller l'URL de retour de Supabase.
4. **Category** : *Website Integration*. **Client Type** : *Confidential* (le secret vit sur le
   serveur de Supabase, jamais dans le navigateur).
5. **Create**, puis rouvrir l'application : relever le **Client ID** et faire **New Secret** pour
   le *Client Secret*.

ℹ️ **Rien à cocher du côté des scopes**, comme chez Discord : Supabase demande `user:read:email`
tout seul.

ℹ️ **L'écran d'autorisation montre le nom et le logo de l'application**, donc « ShonenMaster » —
pas l'adresse `supabase.co`. C'est l'avantage qu'a déjà Discord et que Google n'a pas.

---

## Annexe — Google (fournisseur gardé, bouton retiré)

⚠️ **Le bouton n'existe plus dans le jeu** (voir le tableau en tête de page). Cette section reste
pour que la déclaration ne soit pas à refaire si la question se repose — et parce que le
fournisseur, lui, est probablement **encore actif côté Supabase**.

**Cloud Console** → <https://console.cloud.google.com>

1. Créer un projet (ou en réutiliser un).
2. **APIs & Services** → **OAuth consent screen**. Type **External**. Nom de l'application,
   adresse d'assistance, logo.
3. **Credentials** → **Create Credentials** → **OAuth client ID** → type **Web application**.
4. Dans **Authorized redirect URIs** : coller l'URL de retour de Supabase. **Create**.
5. Relever **Client ID** et **Client Secret**.

⚠️ **Publier l'écran de consentement**, sinon la connexion ne marche que pour soi. Tant qu'il
reste en **Testing**, Google n'autorise que les comptes inscrits un par un comme utilisateurs de
test (cent au plus) et **la session expire au bout de sept jours** — ce qui ressemble exactement à
un bug qu'on ira chercher dans le code. Bouton **Publish app**.

ℹ️ **Et ça ne demande AUCUNE validation de Google.** On ne demande que l'adresse e-mail et le
profil, qui sont des *scopes* non sensibles : la revue (celle qui prend des semaines et réclame une
vidéo de démonstration) ne concerne que les accès au Drive, aux contacts, à Gmail. Publier suffit.

⚠️ **L'écran Google affichera `<ref>.supabase.co`, pas `shonenmaster.com`.** Le joueur lira
« Connexion à ggbal… » au moment précis où on lui demande sa confiance. C'est le prix de l'OAuth
hébergé, et ça ne se corrige qu'avec un **domaine personnalisé Supabase**, qui est une option
payante de leur côté.

ℹ️ **Discord n'a pas ce défaut** : son écran montre le nom et l'icône de l'application, donc
« ShonenMaster » et le logo. À savoir pour décider quel bouton on met en premier — et c'est un
argument de plus pour Discord, qui est déjà là où vivent les communautés visées.

---

## 3. Supabase

**Authentication** → **Providers** : activer **Discord**, puis **Twitch**, et coller dans chacun
le *Client ID* et le *Client Secret* relevés plus haut. Profiter du passage pour **désactiver
Google**, dont le bouton n'existe plus.

**Authentication** → **URL Configuration** :

- **Site URL** : `https://shonenmaster.com`
- **Redirect URLs** : y ajouter `https://shonenmaster.com` **et** `http://localhost:7000`

⚠️ **Sans `localhost:7000` dans la liste, la connexion est intestable en local** : Supabase refuse
de renvoyer le joueur vers une adresse qu'il ne connaît pas, et on ne peut rien mettre au point
sans déployer à chaque essai.

---

## 4. Les clefs, et ce qui va dans le navigateur

**Settings** → **API** : deux clefs, et **il ne faut pas les confondre**.

| Clef | Pour qui | Ce qu'elle ouvre |
|---|---|---|
| `anon` | **le navigateur** | rien de plus que ce que RLS autorise — ici : chacun lit sa ligne |
| `service_role` | **le serveur seul** | **toute la base, RLS ignoré** |

⚠️ **La `service_role` ne doit JAMAIS partir dans le navigateur**, sous aucun prétexte. C'est le
seul vrai piège de ce chantier : les deux clefs se ressemblent, elles tiennent sur une ligne
toutes les deux, et une confusion ne casse rien du tout — elle ouvre simplement la base entière à
qui ouvre l'onglet réseau.

À poser en variables d'environnement, **en local (`.env`) comme sur Heroku** :

```
SUPABASE_ANON_KEY=…
```

⚠️ **Elle est déjà dans le `.env` local, mais pas forcément sur Heroku.** À vérifier avant de
déployer : sans elle, le bouton de connexion existerait en ligne sans rien pouvoir faire.

ℹ️ **Pourquoi une variable et pas la clef écrite dans `app.js`** : elle est publique par
conception, donc l'écrire en dur ne serait pas une fuite — mais **ce dépôt est public**, et une
clef commitée ne se change plus sans réécrire l'historique. Le serveur la servira au client, ce
qui permet de la faire tourner sans toucher au code.

---

## Si ça ne marche pas

- **`redirect_uri_mismatch`** → l'URL de retour collée chez le fournisseur ne correspond pas.
  Chercher le slash final, et vérifier qu'on a bien collé l'adresse `supabase.co` et non celle du
  site.
- **Renvoyé sur l'accueil sans être connecté** → l'adresse du site manque dans **Redirect URLs**.
- **« Unsupported provider »** → le fournisseur n'est pas activé dans **Authentication →
  Providers**. Le bouton part bien, c'est Supabase qui refuse au retour : le message ne vient
  donc pas du code du jeu, qui passe le nom du fournisseur tel quel.
- **Le compte apparaît dans `/admin` sans pastille de fournisseur** → son nom manque dans la
  table `PROV` d'`admin.html`. Le panneau ne dessine rien pour un fournisseur inconnu, et
  l'absence se lit « on ne sait pas » : rien ne dirait que c'est la table qui est en retard.
- **Ça marche pour moi et pour personne d'autre** → l'écran de consentement Google est resté en
  **Testing**.
- **Déconnecté tous les sept jours** → le même.
