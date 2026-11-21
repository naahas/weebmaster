-- ════════════════════════════════════════════════════════════════
-- 🏆 LES VUES DU CLASSEMENT
-- ════════════════════════════════════════════════════════════════
--
-- À passer dans l'éditeur SQL de Supabase, APRÈS docs/classement.sql.
-- Les règles et le raisonnement sont dans docs/classement.md.
--
-- ⚠️ DES VUES, ET NON UNE AGRÉGATION EN NODE. Compter les victoires en
-- rapatriant les lignes marcherait aujourd'hui — il y en a deux. Mais
-- PostgREST NE REND JAMAIS PLUS DE MILLE LIGNES par requête : il ne lève
-- aucune erreur, il en rend mille et l'on croit avoir tout. Ce projet s'est
-- déjà fait prendre, le 13 septembre 2026, quand la banque de questions a
-- franchi ce seuil : six questions sont devenues invisibles et le
-- back-office affichait « 1000 / 1000 » en en ayant 1006. Un classement qui
-- s'arrête aux mille premières parties serait faux de la même façon : en
-- silence, et d'autant plus que le jeu marche.
--
-- ⚠️ ET LES SEUILS NE SONT PAS DANS LES VUES. Le plancher de dix parties,
-- l'exclusion des parties avec bot, le nombre de lignes montrées : tout ça
-- se décide à la LECTURE, dans le serveur. Une vue qui filtrerait à dix
-- parties obligerait à la recréer le jour où le chiffre change.

-- ── 1. La plus longue série de victoires, tous modes ─────────────
--
-- ⚠️ LA DIFFÉRENCE DE DEUX NUMÉROTATIONS, et c'est le seul tour de force de
-- ce fichier. On numérote les parties d'un joueur dans l'ordre, puis ses
-- parties DE MÊME ISSUE dans l'ordre : tant que l'issue ne change pas, les
-- deux avancent du même pas et leur écart reste constant. Cet écart est donc
-- un identifiant de série. Dès qu'une défaite s'intercale, il change.
-- (C'est le motif classique dit « gaps and islands ».)
create or replace view public.v_series_global as
with ordonne as (
    select compte_id, gagnant, cree_le,
           row_number() over (partition by compte_id order by cree_le)
         - row_number() over (partition by compte_id, gagnant order by cree_le) as ile
    from public.parties_jouees
    -- ⚠️ LES ABANDONS SORTENT AVANT LA NUMÉROTATION, pas après. Une ligne
    -- d'abandon est `gagnant = false` : la laisser entrer ici couperait la
    -- série de victoires de quelqu'un qui n'a pourtant rien perdu — elle
    -- n'existe que pour garder son record. Et la filtrer plus bas, dans
    -- `suites`, ne servirait à rien : le mal est fait au `row_number()`.
    where not abandon
),
suites as (
    select compte_id, count(*) as longueur
    from ordonne
    where gagnant
    group by compte_id, ile
)
select compte_id, max(longueur) as meilleure_serie
from suites
group by compte_id;

-- ── 2. La même chose, mode par mode ──────────────────────────────
create or replace view public.v_series_mode as
with ordonne as (
    select compte_id, mode, gagnant, cree_le,
           row_number() over (partition by compte_id, mode order by cree_le)
         - row_number() over (partition by compte_id, mode, gagnant order by cree_le) as ile
    from public.parties_jouees
    -- ⚠️ Même raison qu'au-dessus : avant la numérotation, jamais après.
    where not abandon
),
suites as (
    select compte_id, mode, count(*) as longueur
    from ordonne
    where gagnant
    group by compte_id, mode, ile
)
select compte_id, mode, max(longueur) as meilleure_serie
from suites
group by compte_id, mode;

-- ── 3. Le classement général, une ligne par compte ───────────────
--
-- ⚠️ `xp` VIENT DE `comptes`, PAS DE LA SOMME DES PARTIES. C'est l'xp de
-- toute la vie du compte, celle qui décide du rang affiché sur son profil.
-- La somme de `parties_jouees` ne couvre que depuis la création de la table :
-- classer là-dessus donnerait un rang différent de celui que le joueur porte,
-- et personne ne comprendrait l'écart.
--
-- ⚠️ `left join` : un compte sans aucune partie doit figurer, à zéro. Avec
-- un `join` il disparaîtrait du classement général, où il a sa place — il a
-- un rang, même s'il n'a pas encore joué depuis que le classement existe.
create or replace view public.v_classement as
select
    c.id              as compte_id,
    c.pseudo,
    c.avatar,
    c.xp,
    c.rubis,
    c.titre_prefixe,
    c.titre_suffixe,
    c.cree_le         as inscrit_le,
    count(p.id)                                        as parties,
    coalesce(sum(p.gagnant::int), 0)                   as victoires,
    -- Le taux, calculé en base pour que le tri porte dessus. `nullif` évite
    -- la division par zéro d'un compte sans partie.
    round(100.0 * coalesce(sum(p.gagnant::int), 0) / nullif(count(p.id), 0)) as taux,
    coalesce(sum(p.xp_gagne), 0)                       as xp_gagne,
    -- 📅 La progression du mois : le seul classement où un nouveau peut
    -- figurer. Trente jours glissants, et non le mois calendaire — un
    -- classement qui se vide le 1er à minuit n'a aucun intérêt le 2.
    coalesce(sum(p.xp_gagne) filter (where p.cree_le >= now() - interval '30 days'), 0) as xp_30j,
    coalesce(sum(p.rubis_gagnes), 0)                   as rubis_gagnes,
    coalesce(s.meilleure_serie, 0)                     as meilleure_serie,
    -- ⚠️ Départage les ex æquo : le PREMIER à être arrivé là passe devant.
    -- Sans cette colonne, l'ordre de deux joueurs à égalité changerait d'une
    -- requête à l'autre, sous les yeux du joueur.
    min(p.cree_le)                                     as premiere_partie
from public.comptes c
-- ⚠️ `and not p.abandon` DANS LE JOIN, surtout pas dans un `where` : un
-- `where` sur la table de droite transformerait ce `left join` en `join`
-- silencieux, et tout compte n'ayant que des abandons disparaîtrait du
-- classement général — alors qu'il doit y figurer, à zéro.
left join public.parties_jouees p on p.compte_id = c.id and not p.abandon
left join public.v_series_global s on s.compte_id = c.id
group by c.id, c.pseudo, c.avatar, c.xp, c.rubis,
         c.titre_prefixe, c.titre_suffixe, c.cree_le, s.meilleure_serie;

-- ── 4. Le classement mode par mode ───────────────────────────────
--
-- ⚠️ `parties_total` EST REPRIS ICI, et ce n'est pas un doublon. Le plancher
-- de dix parties est TOUS MODES CONFONDUS : sans ce total à portée de la
-- même ligne, filtrer le classement de BombAnime demanderait une seconde
-- requête puis un croisement en Node — pour une règle qui tient en une
-- comparaison.
create or replace view public.v_classement_mode as
select
    p.compte_id,
    p.mode,
    c.pseudo,
    c.avatar,
    c.titre_prefixe,
    c.titre_suffixe,
    count(*)                                   as parties,
    sum(p.gagnant::int)                        as victoires,
    round(100.0 * sum(p.gagnant::int) / count(*)) as taux,
    sum(p.xp_gagne)                            as xp_gagne,
    coalesce(sm.meilleure_serie, 0)            as meilleure_serie,
    min(p.cree_le)                             as premiere_partie,
    g.parties                                  as parties_total
from public.parties_jouees p
join public.comptes c on c.id = p.compte_id
join public.v_classement g on g.compte_id = p.compte_id
left join public.v_series_mode sm on sm.compte_id = p.compte_id and sm.mode = p.mode
-- ⚠️ Ici un `where` convient, au contraire de v_classement : cette vue part
-- de `parties_jouees` et n'a pas à faire exister une ligne par compte. Un
-- joueur qui n'aurait QUE des abandons dans un mode n'y a pas sa place —
-- il n'y a pas joué une partie entière.
where not p.abandon
group by p.compte_id, p.mode, c.pseudo, c.avatar,
         c.titre_prefixe, c.titre_suffixe, sm.meilleure_serie, g.parties;

-- ⚠️ RLS : les VUES n'en portent pas, elles héritent des droits de leur
-- propriétaire. Seul `service_role` les lira, depuis le serveur — le
-- navigateur passe par `/api/classement` et ne touche jamais la base.

-- ── Pour vérifier après coup ────────────────────────────────────
-- select pseudo, parties, victoires, taux, meilleure_serie, xp_30j
--   from public.v_classement
--   where parties >= 10
--   order by taux desc, victoires desc, premiere_partie asc limit 20;
--
-- select pseudo, mode, parties, victoires, taux
--   from public.v_classement_mode
--   where mode = 'bombanime' and parties_total >= 10
--   order by taux desc, premiere_partie asc limit 20;
