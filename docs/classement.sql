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

    -- 🤖 Y avait-il un bot dans la partie ?
    --
    -- ⚠️ UNE COLONNE PLUTÔT QU'UN `score` MIS À NULL, et la nuance est tout
    -- l'esprit de cette table. La règle retenue est « pas de record dans une
    -- partie avec bot » — c'est une règle de CLASSEMENT, donc de lecture.
    -- L'appliquer à l'écriture en effaçant le score rendrait la décision
    -- irréversible : le jour où l'on voudrait un palmarès « avec partenaire »,
    -- ou simplement savoir combien de parties en comptaient un, il n'y aurait
    -- plus rien. Un booléen coûte un bit et garde la question ouverte.
    avec_bots   boolean not null default false,

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
-- Le meilleur score de Rush en 90 secondes. ⚠️ Les trois clauses de la
-- règle y sont : pas de bot, le seau de réglages, et `cree_le asc` qui
-- départage les ex æquo — le PREMIER à l'avoir atteint passe devant.
-- select c.pseudo, p.score, p.cree_le
--   from public.parties_jouees p join public.comptes c on c.id = p.compte_id
--   where p.mode = 'rush' and p.avec_bots = false
--     and p.reglages @> '{"duree":90}'::jsonb
--   order by p.score desc, p.cree_le asc limit 10;
--
-- Le classement du taux de victoire. ⚠️ Le plancher de dix parties est
-- TOUS MODES CONFONDUS : il se compte donc avant de filtrer sur un mode.
-- select c.pseudo, count(*) as parties,
--        sum(p.gagnant::int) as victoires,
--        round(100.0 * sum(p.gagnant::int) / count(*)) as taux
--   from public.parties_jouees p join public.comptes c on c.id = p.compte_id
--   group by c.id, c.pseudo
--   having count(*) >= 10
--   order by taux desc, victoires desc, min(p.cree_le) asc limit 50;
--
-- La progression du mois : qui a pris le plus d'xp sur trente jours, quel
-- que soit son total. C'est le seul classement où un nouveau peut figurer.
-- select c.pseudo, sum(p.xp_gagne) as xp
--   from public.parties_jouees p join public.comptes c on c.id = p.compte_id
--   where p.cree_le >= now() - interval '30 days'
--   group by c.id, c.pseudo order by xp desc limit 50;

-- ════════════════════════════════════════════════════════════════
-- 🥇 AJOUT : LA PLACE DANS LA PARTIE
-- ════════════════════════════════════════════════════════════════
-- A passer une fois, apres coup. Sans elle, la carte de joueur qui s ouvre
-- au survol d un pseudo en salon affiche un tiret a « Derniere partie ».
--
-- ⚠️ POURQUOI `gagnant` NE SUFFISAIT PAS. C est un booleen : il dit
-- « premier ou pas premier ». Il ne distingue pas celui qui a fini deuxieme
-- de celui qui a fini dernier — et c est exactement ce qu on veut lire au
-- survol d un pseudo : la forme du jour, pas le palmares.
--
-- ⚠️ LES PARTIES DEJA JOUEES RESTERONT A `null`, pour toujours. L information
-- n existait pas au moment ou elles ont ete ecrites, et elle ne se
-- reconstitue pas : ni `gagnant`, ni `joueurs`, ni `xp_gagne` ne permettent
-- de retrouver qui etait troisieme. La carte affiche donc un tiret pour ces
-- parties-la, et c est honnete.
--
-- ⚠️ LE SERVEUR TIENT LES DEUX CAS, et il faut le savoir avant de reporter
-- ce passage : tant que la colonne manque, `enregistrerParties` la RETIRE et
-- reinsere la ligne sans elle, plutot que de laisser PostgREST refuser toute
-- l insertion. Rien n est perdu que cette colonne — mais rien ne la remplira
-- non plus tant que ce SQL n a pas ete passe.
--
-- ⚠️ `smallint` et non `integer` : une partie ne depasse pas huit joueurs, et
-- la colonne est ecrite une fois par joueur et par manche.
alter table public.parties_jouees
    add column if not exists place smallint;

-- Pour verifier apres coup, sur les parties ecrites depuis le passage :
-- select mode, place, count(*) from public.parties_jouees
--   where place is not null group by mode, place order by mode, place;

-- ════════════════════════════════════════════════════════════════
-- 🚪 `abandon` — garder le RECORD de celui qui est parti
-- ════════════════════════════════════════════════════════════════
--
-- Pourquoi : dans une partie de BombAnime a quatorze qui dure neuf minutes,
-- celui qui saute a la premiere minute ferme son onglet. Il ne va pas
-- regarder les huit autres. Jusqu au 21 nov. 2026 ses personnages trouves
-- disparaissaient avec lui — les deux filtres `parti` et `disconnectedAt`
-- ecartaient sa ligne entiere. Le palmares ne montrait donc que les
-- finalistes, ce qui donnait l impression, juste, que les records ne
-- tenaient pas.
--
-- Ces deux filtres existent contre le FARM D XP, et un record ne se farme
-- pas en partant : il se perd. On garde donc la ligne pour son `score`, et
-- on la neutralise partout ailleurs.
--
-- ⚠️ CETTE COLONNE N EST PAS FACULTATIVE, CONTRAIREMENT A `place`.
--
-- Tant qu elle manque, le serveur N ECRIT PAS ces lignes du tout, et le dit
-- dans le journal (`sansAbandonsOrphelins`, server-comptes.js). C est voulu :
-- `sansColonnesAbsentes` l aurait retiree en silence, et la ligne serait
-- entree comme une partie ORDINAIRE. Le joueur aurait alors gagne une partie
-- jouee qu il n a pas finie, son taux de victoire aurait baisse, et une
-- defaite fantome aurait coupe sa serie de victoires — `v_series_global`
-- numerote TOUTES les lignes avant de filtrer sur `gagnant`.
--
-- Mieux vaut perdre le record que fausser trois classements. Donc : tant que
-- ce SQL n est pas passe, la correction ne fait simplement rien.
--
-- ⚠️ ET IL FAUT REPASSER docs/classement-vues.sql JUSTE APRES : ce sont les
-- vues qui ecartent ces lignes. La colonne seule ne protege rien.
alter table public.parties_jouees
    add column if not exists abandon boolean not null default false;

-- Pour verifier apres coup :
-- select mode, abandon, count(*), count(score) as avec_record
--   from public.parties_jouees group by mode, abandon order by mode, abandon;
