# Déclarer Discord et Google dans Supabase

Ce qui reste à faire pour que la connexion existe, et qui **n'est pas du code** : trois sites,
une quinzaine de clics. Le SQL de la table est dans [comptes.sql](comptes.sql).

---

## ⚠️ D'abord : les DEUX URL qu'on confond

C'est la seule vraie difficulté de ce chantier. Tout le reste est du remplissage de formulaire.

| | Quelle adresse | Où elle se colle |
|---|---|---|
| **L'URL de retour** (*callback*) | celle de **Supabase** : `https://<ref>.supabase.co/auth/v1/callback` | chez **Discord** et chez **Google** |
| **La liste blanche** (*Redirect URLs*) | celles de **shonenmaster.com** | chez **Supabase** |

Les intervertir est l'erreur classique, et elle ne se voit qu'au moment du premier essai de
connexion — jamais avant. Le sens est celui-ci : Discord et Google renvoient le joueur **à
Supabase**, et Supabase le renvoie **au site**. Chacun a donc besoin de l'adresse du suivant.

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

## 2. Google

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

**Authentication** → **Providers** : activer **Discord**, puis **Google**, et coller dans chacun
le *Client ID* et le *Client Secret* relevés plus haut.

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

- **`redirect_uri_mismatch`** → l'URL de retour collée chez Discord ou Google ne correspond pas.
  Chercher le slash final, et vérifier qu'on a bien collé l'adresse `supabase.co` et non celle du
  site.
- **Renvoyé sur l'accueil sans être connecté** → l'adresse du site manque dans **Redirect URLs**.
- **Ça marche pour moi et pour personne d'autre** → l'écran de consentement Google est resté en
  **Testing**.
- **Déconnecté tous les sept jours** → le même.
