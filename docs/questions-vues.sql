-- ════════════════════════════════════════════════════════════════
-- 📜 L'HISTORIQUE DES QUESTIONS, LIÉ AU COMPTE
-- ════════════════════════════════════════════════════════════════
--
-- À passer dans l'éditeur SQL de Supabase.
--
-- Jusqu'ici, « ne pas retomber sur la même question » ne valait que pour la
-- SESSION : la liste vivait dans la mémoire du salon (`usedQuestionIds`) et
-- repartait de zéro au salon suivant. Deux parties d'affilée et l'on
-- revoyait les mêmes énoncés.
--
-- ⚠️ UNE COLONNE, PAS UNE TABLE. Une table `questions_vues(compte, question)`
-- aurait été plus « propre » sur le papier et coûté une requête de plus à
-- chaque tirage, pour des milliers de lignes par joueur. Ici la banque fait
-- quelques milliers de questions : la liste entière d'un joueur tient dans
-- un tableau de quelques kilo-octets, lu UNE fois au démarrage de la partie
-- et réécrit UNE fois à la fin.
--
-- ⚠️ ET ELLE NE GROSSIT PAS INDÉFINIMENT. Quand un joueur a vu toutes les
-- questions d'une difficulté, le tirage purge lui-même ces identifiants de
-- la liste (`dbs.js`, « reset de cette difficulté ») — c'est ce mécanisme
-- qui existait déjà pour la session, et il travaille maintenant sur la liste
-- du compte. La colonne se stabilise donc autour de la taille de la banque,
-- elle ne la dépasse jamais.

alter table public.comptes
    add column if not exists questions_vues integer[] not null default '{}'::integer[];

-- ── Pour vérifier après coup ────────────────────────────────────
-- select pseudo, cardinality(questions_vues) as vues from public.comptes
--   order by vues desc limit 10;

-- ── Pour repartir de zéro sur un compte ─────────────────────────
-- update public.comptes set questions_vues = '{}' where pseudo = 'xxx';
