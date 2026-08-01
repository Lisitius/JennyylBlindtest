-- ============================================================
--  Blindtest JennyyL — structure de la base de donnees
--  A coller dans Supabase > SQL Editor > Run
--  (relancable sans risque : tout est en "if not exists")
-- ============================================================

-- Profil du joueur : le pseudo et ses preferences de jeu.
-- L'email et le mot de passe sont geres par Supabase (table auth.users) ;
-- le mot de passe n'y est stocke que sous forme d'empreinte irreversible.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  pseudo      text unique not null,
  created_at  timestamptz not null default now(),
  prefs       jsonb not null default '{}'::jsonb
);

-- Historique des parties.
create table if not exists public.games (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  played_at      timestamptz not null default now(),
  source         text,          -- theme:disney, artist:415, playlist:123…
  source_name    text,          -- libelle affiche ("Disney", "Nirvana"…)
  mode           text,          -- full | title | title-film | film
  nb_tracks      int,
  round_seconds  int,
  score          int not null default 0,
  max_points     int not null default 0,
  titles_found   int not null default 0,
  artists_found  int not null default 0,
  films_found    int not null default 0,
  items          jsonb not null default '[]'::jsonb
);

create index if not exists games_user_played_idx
  on public.games (user_id, played_at desc);

-- Securite : personne ne peut lire ces tables depuis le navigateur.
-- Tous les acces passent par le serveur du site, qui verifie l'identite.
alter table public.profiles enable row level security;
alter table public.games    enable row level security;

-- Autorisations pour le serveur du site (role "service_role").
-- Sans cela, le site recoit "permission denied for table profiles".
grant all privileges on public.profiles to service_role;
grant all privileges on public.games    to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Meme chose automatiquement pour les tables ajoutees plus tard.
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant all on sequences to service_role;

-- Suppression du compte : efface aussi profil et historique (via on delete cascade).
