-- ════════════════════════════════════════════════════════════════
-- 🔒 FERMER LES TABLES A LA CLEF ANON
-- ════════════════════════════════════════════════════════════════
--
-- ⚠️ A PASSER UNE FOIS, DANS LE SQL EDITOR DE SUPABASE. Tant que ce n est
-- pas fait, N IMPORTE QUI peut lire ces tables depuis un navigateur.
--
-- ── Pourquoi maintenant ───────────────────────────────────────────
--
-- La clef `anon` est PUBLIQUE PAR CONCEPTION : elle part au navigateur par
-- /api/auth-config, parce que la connexion Discord en a besoin. Ce n est pas
-- une fuite — c est ainsi que Supabase fonctionne. Ce qui protege une table,
-- ce n est pas le secret de la clef, c est RLS.
--
-- Or RLS etait eteint sur toute la base, heritage de la v1 ou RIEN n allait
-- au navigateur : le serveur seul parlait a Supabase, avec la clef
-- service_role. Le trou n existait donc pas. Il est ne le jour ou la
-- connexion par compte a mis la clef anon dans la page.
--
-- Mesure du 14 novembre 2026, avec la seule clef anon, depuis l exterieur :
--
--   questions              HTTP 200 — 1 965 questions AVEC `coanswer`,
--                          c est-a-dire LA BONNE REPONSE. Toute la banque.
--   users                  HTTP 200 — 380 pseudos et identifiants Twitch
--   visits                 HTTP 200 — 28 981 lignes, avec `twitch_username`
--                          et `user_agent` : le journal de navigation de
--                          vraies personnes
--   games, player_games, badges, user_purchases, used_questions,
--   reported_questions, bombanime_suggestions, titles, shop_items  — idem
--
--   comptes                HTTP 200 — 0 ligne  ✅ (RLS + « chacun lit la sienne »)
--   game_history           HTTP 200 — 0 ligne  ✅
--
-- ── Pourquoi ca ne casse RIEN ─────────────────────────────────────
--
-- ⚠️ `service_role` IGNORE RLS, toujours. Or c est la seule clef qui lit ces
-- tables :
--   - `dbs.js` (tout le serveur de jeu, le back-office, le panneau) ;
--   - le workflow `keep_alive` de GitHub, verifie, il la porte aussi.
-- Le navigateur, lui, ne lit QUE `comptes`, qui garde sa politique.
--
-- RLS active SANS AUCUNE POLITIQUE = personne ne passe, sauf service_role.
-- C est exactement ce qu on veut : ces tables n ont rien a faire dans une
-- page.
-- ════════════════════════════════════════════════════════════════

alter table public.questions             enable row level security;
alter table public.users                 enable row level security;
alter table public.visits                enable row level security;
alter table public.games                 enable row level security;
alter table public.player_games          enable row level security;
alter table public.used_questions        enable row level security;
alter table public.reported_questions    enable row level security;
alter table public.bombanime_suggestions enable row level security;
alter table public.titles                enable row level security;
alter table public.badges                enable row level security;
alter table public.shop_items            enable row level security;
alter table public.user_purchases        enable row level security;
alter table public.choice_questions      enable row level security;
alter table public.keep_alive            enable row level security;

-- ⚠️ On NE TOUCHE PAS a `comptes` : elle a deja RLS et sa politique
-- « chacun lit sa ligne ». La reactiver ne ferait rien, mais y toucher a
-- l aveugle, si.

-- ── Verification ──────────────────────────────────────────────────
-- `rowsecurity` doit valoir `true` partout. Ce qui reste a `false` est
-- encore lisible depuis un navigateur.
select tablename, rowsecurity
  from pg_tables
 where schemaname = 'public'
 order by rowsecurity, tablename;
