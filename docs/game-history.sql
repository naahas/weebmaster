-- ============================================================
-- game_history — historique des parties terminées
-- ============================================================
-- À exécuter une fois dans Supabase : SQL Editor → New query → Run.
--
-- Sans cette table, le serveur garde l'historique en mémoire seule : les
-- « dernières parties » de l'accueil et le compteur de parties jouées
-- repartent de zéro à chaque redémarrage (Render redémarre souvent).
--
-- Le serveur détecte tout seul que la table existe : rien à redéployer.
-- Écrit par recordFinishedGame(), lu par loadRecentGamesFromDb() (server.js).

create table if not exists public.game_history (
    id           bigint generated always as identity primary key,
    mode         text        not null,          -- 'classic' | 'rivalry' | 'bombanime'
    players_count integer    not null default 0,
    winner_name  text,                          -- null si personne n'a gagné (égalité, partie vidée)
    duration     integer     not null default 0, -- en secondes
    created_at   timestamptz not null default now()
);

-- L'accueil ne lit que les huit dernières, triées par date décroissante
create index if not exists game_history_created_at_idx
    on public.game_history (created_at desc);

-- Le serveur écrit avec la clé service_role, qui ignore RLS. On l'active
-- quand même : sans politique, la clé anon ne peut ni lire ni écrire.
alter table public.game_history enable row level security;

-- ============================================
-- REMISE A ZERO DES PARTIES RECENTES
-- ============================================
-- L'accueil lit cette table au demarrage du serveur : vider la table vide donc
-- aussi « Dernieres parties » et le compteur de parties, apres un redemarrage
-- du dyno (ou immediatement, puisque Heroku redemarre a chaque deploiement).

-- Tout effacer :
--   TRUNCATE TABLE game_history;

-- Ou seulement les essais, en gardant les vraies parties :
--   DELETE FROM game_history WHERE created_at < now() - interval '1 day';
