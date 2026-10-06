-- ============================================================
-- choice_questions — la banque du mode Choice (vrai / faux)
-- ============================================================
-- À exécuter UNE FOIS dans Supabase : SQL Editor → New query → Run.
-- Rien à redéployer ensuite : l'onglet « Vrai / Faux » de /admin s'en
-- sert dès qu'elle existe, et affiche une banque vide tant qu'elle
-- n'existe pas.
--
-- ⚠️ Le nom suit la convention du dépôt : `bombanime_suggestions` porte
-- le nom de son mode, celle-ci aussi. C'est la banque DE CHOICE, pas un
-- entrepôt général de vrai/faux.
--
-- ⚠️ Les noms de colonnes sont ceux de la table `questions`, à la lettre
-- (`serie`, `difficulty`, `is_spoil`, `proof_url`). Ce n'est pas de la
-- coquetterie : le back-office, ses filtres et ses formulaires sont
-- recopiés de ceux du quiz, et une colonne renommée au passage aurait
-- demandé de les relire tous pour trouver où ça diverge.

create table if not exists public.choice_questions (
    id          bigint generated always as identity primary key,

    -- L'ÉNONCÉ, affirmatif. Jamais une question : on ne demande pas
    -- « Luffy a-t-il mangé le Gomu Gomu no Mi ? », on affirme « Luffy a
    -- mangé le Gomu Gomu no Mi » et le joueur va du côté qu'il croit.
    question    text        not null,

    -- La réponse. true = VRAI (le bord BLEU, à gauche).
    reponse     boolean     not null,

    -- La série. Affichée au joueur avec l'énoncé, et elle filtre un salon.
    serie       text        not null,

    -- La difficulté. Mêmes paliers que le quiz, pour que les deux banques
    -- se lisent pareil : easy, medium, hard, veryhard, extreme.
    difficulty  text        not null default 'medium',

    -- FACULTATIFS tous les deux, et c'est voulu : Adem remplit l'énoncé,
    -- la réponse, la série et la difficulté, pas le reste.
    -- `is_spoil` écarte l'énoncé des salons qui refusent les spoils.
    -- ⚠️ Il vaut `false` par défaut et JAMAIS autre chose : c'est l'auteur
    -- qui décide ce qui est un spoil, pas celui qui saisit.
    is_spoil    boolean     not null default false,
    proof_url   text,

    created_at  timestamptz not null default now()
);

-- Le tirage d'une manche demandera « une question de telle difficulté,
-- dans telles séries, non vue » : c'est ce couple qui porte la requête.
create index if not exists choice_questions_tirage_idx
    on public.choice_questions (difficulty, serie);

-- Le back-office liste du plus récent au plus ancien.
create index if not exists choice_questions_id_desc_idx
    on public.choice_questions (id desc);

-- ⚠️ Deux fois le même énoncé dans la même série, c'est une saisie en
-- double — on s'en aperçoit quand elle retombe deux fois dans la même
-- soirée, c'est-à-dire trop tard. La base refuse, le back-office le dit.
create unique index if not exists choice_questions_sans_doublon_idx
    on public.choice_questions (lower(question), lower(serie));

-- Le serveur écrit avec la clé service_role, qui ignore RLS. On l'active
-- quand même : sans politique, la clé anon ne peut ni lire ni écrire.
-- ⚠️ Sans ça, N'IMPORTE QUI pourrait lire la banque avec la clé publique —
-- et lire la banque d'un vrai/faux, c'est connaître toutes les réponses.
alter table public.choice_questions enable row level security;
