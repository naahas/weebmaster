-- ════════════════════════════════════════════════════════════════
-- 📮 LES RETOURS DES JOUEURS — bugs, suggestions, remarques
-- ════════════════════════════════════════════════════════════════
--
-- À passer dans l'éditeur SQL de Supabase. Une seule table, lue et écrite
-- par le serveur avec la clef `service_role` ; aucun navigateur n'y touche.
--
-- ⚠️ RLS ACTIVÉE ET AUCUNE POLITIQUE, comme `comptes`. La table est donc
-- FERMÉE à la clef publique : un visiteur qui ouvre l'onglet réseau et
-- récupère la clef anon ne peut ni lire les retours des autres, ni en
-- écrire un directement. Tout passe par `/api/retour`, qui valide.
--
-- ⚠️ `auteur_id` ne référence PAS `comptes(id)` : un retour doit survivre
-- à la suppression du compte qui l'a écrit. Un bug signalé reste un bug, et
-- une clef étrangère avec `on delete cascade` l'effacerait au moment où le
-- joueur part — c'est-à-dire souvent juste après l'avoir signalé.

create table if not exists public.retours (
    id          bigint generated always as identity primary key,

    -- 'bug' | 'suggestion' | 'autre'. Contrainte plutôt qu'énum : ajouter une
    -- catégorie ne doit pas demander une migration de type.
    type        text        not null default 'bug'
                            check (type in ('bug', 'suggestion', 'autre')),

    message     text        not null check (char_length(message) between 5 and 2000),

    -- Qui écrit. Les trois peuvent être nuls : on n'oblige personne à se
    -- nommer pour signaler un bug, c'est le meilleur moyen de n'en recevoir
    -- aucun.
    pseudo      text,
    auteur_id   uuid,
    contact     text,

    -- Ce que le navigateur dit de lui-même : utile pour reproduire, inutile
    -- à demander au joueur. ⚠️ Pas d'adresse IP — elle n'aide pas à
    -- reproduire un bug et c'est une donnée personnelle de plus à protéger.
    contexte    jsonb       not null default '{}'::jsonb,

    traite      boolean     not null default false,
    cree_le     timestamptz not null default now()
);

-- Le panneau lit « les non traités d'abord, les plus récents en tête ».
create index if not exists retours_tri on public.retours (traite, cree_le desc);

alter table public.retours enable row level security;

-- ── Pour vérifier après coup ────────────────────────────────────
-- select type, count(*) filter (where not traite) as a_traiter, count(*) as total
--   from public.retours group by type;
