-- ============================================================
--  Blindtest JennyyL — roles + multijoueur
--  A coller dans Supabase > SQL Editor > Run
--  (relancable sans risque)
-- ============================================================

-- ---------- 1) Roles ----------
-- joueur (defaut) | animateur (peut creer des salons) | admin (gere les roles)
alter table public.profiles
  add column if not exists role text not null default 'joueur';

-- ---------- 2) Salons ----------
create table if not exists public.rooms (
  id                bigint generated always as identity primary key,
  code              text unique not null,          -- code a 6 caracteres
  host_id           uuid not null references auth.users(id) on delete cascade,
  status            text not null default 'lobby', -- lobby|playing|reveal|paused|ended
  settings          jsonb not null default '{}'::jsonb,
  -- Verite du serveur : titres, artistes, films. JAMAIS envoye tel quel
  -- au navigateur (sinon les reponses seraient visibles).
  tracks            jsonb not null default '[]'::jsonb,
  round_index       int  not null default -1,
  round_started_at  timestamptz,
  round_ends_at     timestamptz,
  reveal_until      timestamptz,
  auto_next         boolean not null default false, -- "chanson suivante automatique"
  locked            boolean not null default false,
  host_plays        boolean not null default true,  -- l'animatrice joue aussi
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists rooms_code_idx on public.rooms (code);

-- ---------- 3) Joueurs presents dans un salon ----------
create table if not exists public.room_players (
  room_id    bigint not null references public.rooms(id) on delete cascade,
  user_id    uuid   not null references auth.users(id) on delete cascade,
  pseudo     text   not null,
  score      int    not null default 0,
  found      jsonb  not null default '{}'::jsonb,  -- ce qui est trouve dans la manche
  joined_at  timestamptz not null default now(),
  last_seen  timestamptz not null default now(),
  kicked     boolean not null default false,
  primary key (room_id, user_id)
);

-- ---------- 4) Reponses envoyees ----------
-- Sert au classement, a l'anti-triche et surtout a la validation manuelle
-- par l'animatrice (accepter une reponse que le jeu a refusee).
create table if not exists public.room_answers (
  id           bigint generated always as identity primary key,
  room_id      bigint not null references public.rooms(id) on delete cascade,
  round_index  int not null,
  user_id      uuid not null references auth.users(id) on delete cascade,
  pseudo       text,
  texte        text,
  accepte      boolean not null default false,
  partie       text,                       -- titre | artiste | film | aucune
  points       int not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists room_answers_idx
  on public.room_answers (room_id, round_index, created_at desc);

-- ---------- 5) Securite ----------
-- Aucune lecture directe depuis le navigateur : tout passe par le serveur
-- du site, qui filtre ce que chaque joueur a le droit de voir.
alter table public.rooms        enable row level security;
alter table public.room_players enable row level security;
alter table public.room_answers enable row level security;

grant all privileges on public.rooms        to service_role;
grant all privileges on public.room_players to service_role;
grant all privileges on public.room_answers to service_role;
grant usage, select on all sequences in schema public to service_role;
