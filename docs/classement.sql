-- ════════════════════════════════════════════════════════════════
-- 🏆 UNE LIGNE PAR JOUEUR ET PAR PARTIE
-- ════════════════════════════════════════════════════════════════
--
-- À passer dans l'éditeur SQL de Supabase.
--
-- La conception, les pièges et les records mode par mode sont dans
-- docs/classement.md. Ici, seulement la table et ses index.
--
-- ⚠️ CETTE TABLE EXISTE AVANT LA PAGE, ET C'EST TOUT L'INTÉRÊT. Les colonnes
-- cumulées de `comptes` (xp, parties, victoires) ne savent ni QUAND ni À QUEL
-- MODE : le classement par mode, les saisons, les séries de victoires et les
-- records ne s'en déduisent pas. Chaque partie jouée sans cette table est
-- perdue pour eux, définitivement.
--
-- ⚠️ SEULS LES COMPTES Y ÉCRIVENT. Un invité n'a pas d'identifiant stable —
-- le sien vit dans son navigateur et change s'il vide ses données. Lui écrire
-- des lignes fabriquerait des classements de fantômes.

create table if not exists public.parties_jouees (
    id          bigserial primary key,

    -- ⚠️ L'IDENTIFIANT, JAMAIS LE PSEUDO. Un pseudo se change : un classement
    -- bâti dessus éclate le palmarès d'un joueur en deux le jour où il en
    -- change, et en fusionne deux le jour où quelqu'un reprend un nom libre.
    -- `on delete cascade` : supprimer son compte efface son passage, comme
    -- l'annonce la page de confidentialité.
    compte_id   uuid not null references public.comptes(id) on delete cascade,

    -- Regroupe les joueurs d'une même manche. Sans lui, impossible de dire
    -- que cette victoire et cette défaite sont la même partie — donc pas de
    -- « qui bat qui », pas de vérification, pas de reconstruction.
    partie_id   uuid not null,

    mode        text    not null,
    gagnant     boolean not null default false,

    -- ⚠️ Des HUMAINS DISTINCTS, bots exclus et doublons de socket écartés.
    -- C'est ce qui permet d'écarter les parties trop petites À LA LECTURE
    -- plutôt qu'à l'écriture : une règle de seuil qui change ne doit pas
    -- demander de rejouer le passé.
    joueurs     integer not null default 0,
    duree       integer not null default 0,

    -- Ce que CETTE partie a rapporté. ⚠️ C'est la colonne des saisons : un
    -- « top XP du mois » est une somme sur une plage de dates, et il est
    -- impossible à tirer du cumul de `comptes`, qui n'a pas de date.
    xp_gagne      integer not null default 0,
    rubis_gagnes  integer not null default 0,

    -- Le salon était-il le sien ? Une colonne, et le classement des hôtes
    -- devient possible — pour un site de streamers, c'est le chiffre qui
    -- parle le plus.
    hote        boolean not null default false,

    -- ⚠️ LE SEAU DE COMPARAISON, et la seule chose qui rend un record
    -- honnête. L'hôte règle la partie : il peut mettre Ascension à trois
    -- étages et signer le meilleur temps de l'histoire. Un record ne vaut
    -- qu'à réglages égaux, et ce sont eux qu'on garde ici.
    reglages    jsonb   not null default '{}'::jsonb,

    -- Le record du mode, quand il y en a un. Le SENS dépend du mode et vit
    -- dans le code : max pour BombAnime et Rush, MIN pour Ascension et
    -- Collect, où l'on cherche le temps le plus court.
    score       numeric,

    details     jsonb   not null default '{}'::jsonb,
    cree_le     timestamptz not null default now()
);

-- ── Les index, un par question qu'on posera ─────────────────────
-- « Le classement de ce mode sur cette période »
create index if not exists parties_jouees_mode_date
    on public.parties_jouees (mode, cree_le desc);

-- « Le palmarès de ce joueur », et les séries de victoires, qui se lisent
-- en parcourant ses parties dans l'ordre.
create index if not exists parties_jouees_compte_date
    on public.parties_jouees (compte_id, cree_le desc);

-- « Les meilleurs scores de ce mode ». ⚠️ `nulls last` : les modes sans
-- record y écrivent `null`, et sans ça ils remonteraient en tête.
create index if not exists parties_jouees_mode_score
    on public.parties_jouees (mode, score desc nulls last)
    where score is not null;

-- Le seau de comparaison se filtre par contenu : `reglages @> '{"duree":60}'`.
create index if not exists parties_jouees_reglages
    on public.parties_jouees using gin (reglages);

-- ⚠️ RLS ACTIVÉ, SANS AUCUNE POLITIQUE — comme les autres tables du jeu
-- (docs/fermer-rls.sql). `service_role` l'ignore, et c'est la seule clef qui
-- lit cette table : le navigateur passera par le serveur.
-- ℹ️ Le réflexe à garder : une table créée ici part OUVERTE. Supabase accorde
-- `select` au rôle `anon` par défaut, et seul le bandeau « UNRESTRICTED » du
-- Table Editor le signale.
alter table public.parties_jouees enable row level security;

-- ── Pour vérifier après coup ────────────────────────────────────
-- select mode, count(*), sum(gagnant::int) as victoires
--   from public.parties_jouees group by mode order by count(*) desc;
--
-- Le meilleur score de Rush en 90 secondes :
-- select c.pseudo, p.score, p.cree_le
--   from public.parties_jouees p join public.comptes c on c.id = p.compte_id
--   where p.mode = 'rush' and p.reglages @> '{"duree":90}'::jsonb
--   order by p.score desc, p.cree_le asc limit 10;
