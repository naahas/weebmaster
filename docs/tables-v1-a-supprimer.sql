-- ════════════════════════════════════════════════════════════════
-- 🧹 LES TABLES DE LA V1 QUE PLUS AUCUN CODE NE LIT
-- ════════════════════════════════════════════════════════════════
--
-- À passer dans l'éditeur SQL de Supabase, et SEULEMENT après avoir exporté
-- en CSV ce qu'on veut garder (Table Editor → ⋮ → « Export to CSV »).
-- Un `drop table` ne se rattrape pas sur le plan gratuit.
--
-- ── Pourquoi celles-là ──────────────────────────────────────────
-- Ce sont les tables du système de comptes de la v1, du temps où seuls des
-- streamers Twitch pouvaient se connecter. La v2 a son propre système —
-- `comptes`, une seule table, avec l'XP, les rubis, le titre et désormais
-- l'historique des questions — et aucune ligne de code ne les touche plus.
-- Vérifié par recherche sur tout le dépôt : zéro occurrence dans `server.js`,
-- `server-comptes.js`, `dbs.js` et les scripts.
--
-- ⚠️ `used_questions` n'est PAS dans cette liste : elle a déjà été supprimée,
-- et son rôle est repris par la colonne `comptes.questions_vues`
-- (docs/questions-vues.sql) — un tableau d'identifiants par compte, lu une
-- fois au lancement de la partie et réécrit une fois à la fin.
--
-- ── Ce qu'on NE touche pas ──────────────────────────────────────
--   questions (1 982)        la banque du mode Classique
--   choice_questions (60)    la banque du mode Vrai/Faux
--   comptes                  les comptes de la v2
--   game_history             l'historique des parties, lu par le panneau
--   bombanime_suggestions    les personnages proposés en jeu
--   reported_questions       les signalements depuis une question
--   retours                  le formulaire /signaler
--   keep_alive               pingée par le workflow GitHub pour que le projet
--                            Supabase ne se mette pas en veille
--
-- ⚠️ `shop_items` (78 lignes) N'EST PAS DANS LA LISTE NON PLUS, et c'est
-- délibéré : la boutique est le prochain chantier. Ces 78 lignes portent un
-- nom, un type, un prix, une description et une image — c'est un catalogue
-- déjà écrit, qui ne coûte rien à garder le temps de décider si la boutique
-- de la v2 le reprend. `user_purchases` part en revanche : dix achats faits
-- avec une monnaie qui n'existe plus.

-- ── L'ordre compte : les enfants avant les parents ──────────────
-- `cascade` ne supprime pas d'autres tables, seulement les contraintes et
-- les vues qui pointaient vers celle-ci. L'ordre évite quand même d'avoir à
-- s'en remettre à lui.

drop table if exists public.user_purchases cascade;   -- 10 achats, monnaie v1
drop table if exists public.badges         cascade;   -- 12 badges Twitch
drop table if exists public.player_games   cascade;   -- 147 participations
drop table if exists public.games          cascade;   -- 29 parties v1
drop table if exists public.titles         cascade;   -- 29 titres v1 (la v2 a
                                                      -- src/script/titres.js)
drop table if exists public.users          cascade;   -- 380 comptes Twitch v1

-- ⚠️ 28 981 LIGNES DE DONNÉES PERSONNELLES, et c'est la vraie raison de la
-- supprimer plutôt que de la laisser dormir : `visits` garde un pseudo Twitch
-- et un `user_agent` par visite, de gens qui n'ont jamais rien demandé. Elle
-- n'est lue par rien, elle est la plus grosse table du projet, et sa seule
-- protection est le RLS posé après coup (docs/fermer-rls.sql).
drop table if exists public.visits cascade;

-- ── Pour vérifier après coup ────────────────────────────────────
-- select table_name from information_schema.tables
--   where table_schema = 'public' order by table_name;
