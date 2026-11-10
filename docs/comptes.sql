-- ============================================================
-- comptes — le profil d'un joueur inscrit
-- ============================================================
-- À exécuter une fois dans Supabase : SQL Editor → New query → Run.
--
-- ⚠️ LE COMPTE N'EST JAMAIS REQUIS POUR JOUER. C'est la thèse de la v2 et
-- l'avantage du site sur ses concurrents : un viewer colle un lien, tape un
-- pseudo, il joue — sans inscription, jamais. Le compte sert à GARDER quelque
-- chose entre deux sessions, rien d'autre. Un invité ne perd rien de ce qu'il
-- voit déjà ; il n'a simplement pas de persistance.
--
-- ============================================================
-- POURQUOI `id` VIENT DE auth.users ET N'EST PAS FABRIQUÉ ICI
-- ============================================================
-- L'inscription passe par Supabase Auth (Discord et Google). C'est lui qui
-- porte les trois choses qu'un pseudo + mot de passe ne portait pas :
--   1. la RÉCUPÉRATION — mot de passe perdu = compte perdu, et c'est ça qui
--      aurait fait râler, pas la connexion ;
--   2. l'absence de mot de passe gardé par le site (ni hachage, ni fuite) ;
--   3. une identité unique sans formulaire — un bouton, et c'est fini.
--
-- Le site ne garde donc AUCUN secret de connexion. `auth.users` appartient à
-- Supabase ; cette table-ci ne porte que ce qui est au JEU.

create table if not exists public.comptes (
    -- L'identifiant du compte EST celui de Supabase Auth. ⚠️ Et c'est aussi
    -- le `playerId` que le client utilisera une fois connecté : le moteur ne
    -- connaît que `playerId`, donc il n'y a RIEN à refaire dans le jeu. Même
    -- personne sur téléphone et sur PC = même identifiant, ce qui est tout
    -- l'intérêt d'un compte.
    id        uuid        primary key references auth.users (id) on delete cascade,

    -- Le pseudo AFFICHÉ. ⚠️ VOLONTAIREMENT PAS UNIQUE.
    -- Aujourd'hui deux joueurs peuvent déjà porter le même pseudo, y compris
    -- dans un même salon — il n'existe aucun contrôle d'unicité et ça n'a
    -- jamais posé de problème, le moteur ne connaissant que `playerId`.
    -- Réserver les pseudos des inscrits protégerait l'identité, mais « Luffy »
    -- serait pris en une semaine et un invité se ferait refuser au pire moment :
    -- la première minute. On laisse donc libre, et c'est le BADGE qui distingue
    -- un compte — on peut usurper le nom, pas le statut.
    -- ⚠️ La réservation se rajoute par-dessus plus tard si besoin ; l'inverse
    -- n'est pas vrai, on ne « dé-réserve » pas sans casser le nom de quelqu'un.
    pseudo    text,

    -- ⚠️ L'AVATAR EST UN ITEM DU JEU, JAMAIS CELUI DE DISCORD.
    -- Deux raisons, et la seconde suffit : les avatars sont à débloquer, c'est
    -- la boucle de récompense ; et un avatar Discord peut être n'importe quoi,
    -- or il s'afficherait sur l'écran d'un streamer devant son audience. Les
    -- avatars du site sont choisis un par un, pas ceux-là.
    -- Supabase donnera l'URL de l'avatar Discord dans les métadonnées : on
    -- l'ignore, tout simplement.
    avatar    text        not null default 'novice.png',

    -- ⚠️ TOUT LE MONDE PART DE ZÉRO, y compris Adem. `game_history` ne garde
    -- aucune ligne par joueur (seulement `players_count` et `winner_name`),
    -- donc aucune XP rétroactive n'est possible. Ce n'est pas un défaut à
    -- rattraper : écrire des lignes par joueur « au cas où » reviendrait à
    -- stocker sur des gens qui n'ont rien demandé, pour un gain hypothétique.
    xp        integer     not null default 0,
    parties   integer     not null default 0,

    cree_le   timestamptz not null default now(),
    -- Sert à savoir qui revient, et à ne rien faire d'autre pour l'instant.
    vu_le     timestamptz not null default now()
);

-- Les classements par XP liront cette table triée ; l'index coûte peu et
-- évite un balayage complet le jour où les comptes se comptent en milliers.
create index if not exists comptes_xp_idx on public.comptes (xp desc);

-- ============================================================
-- SÉCURITÉ
-- ============================================================
-- Le serveur écrit avec la clé service_role, qui ignore RLS.
--
-- ⚠️ MAIS LE CLIENT VA DÉSORMAIS PARLER À SUPABASE DIRECTEMENT, avec la clé
-- ANON, pour la connexion. Ce sont DEUX CLEFS DIFFÉRENTES : la service_role
-- donne tous les droits sur toute la base et ne doit JAMAIS partir dans le
-- navigateur, sous aucun prétexte. C'est le seul vrai piège de ce chantier.
--
-- RLS activé, et une seule politique : chacun lit SA ligne. Aucune écriture
-- depuis le client — c'est le serveur qui décide de l'XP, jamais le joueur.
alter table public.comptes enable row level security;

drop policy if exists "chacun lit son compte" on public.comptes;
create policy "chacun lit son compte"
    on public.comptes for select
    using (auth.uid() = id);

-- ============================================================
-- CE QU'IL RESTE À FAIRE, ET QUI N'EST PAS DU SQL
-- ============================================================
-- 1. Créer une application Discord (Developer Portal) et une application
--    Google (Cloud Console), puis coller leurs identifiants dans
--    Supabase → Authentication → Providers.
-- 2. Y déclarer l'URL de retour que Supabase affiche, et ajouter
--    https://shonenmaster.com aux URL autorisées.
-- 3. Récupérer la clé ANON (Settings → API) et la poser en variable
--    d'environnement — c'est la seule qui ait le droit d'être servie au
--    navigateur.
-- 4. ⚠️ Le pseudo venu de Discord passe par `pseudoPropre` COMME N'IMPORTE
--    QUEL AUTRE. Un pseudo Discord peut être déplacé lui aussi, et il
--    s'afficherait sur l'écran d'un streamer. Ne pas court-circuiter
--    `pseudos-interdits.js` parce que le nom vient d'un fournisseur sérieux.
--
-- ============================================================
-- REMISE À ZÉRO
-- ============================================================
--   TRUNCATE TABLE comptes;        -- les profils, pas les connexions
-- Les comptes Supabase eux-mêmes se suppriment dans Authentication → Users ;
-- le `on delete cascade` ci-dessus efface alors le profil tout seul.
