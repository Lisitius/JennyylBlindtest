-- ============================================================
--  Autorisations manquantes — a coller dans Supabase > SQL Editor > Run
--  (les tables existent deja, il ne manque que les droits d'acces)
-- ============================================================

grant all privileges on public.profiles to service_role;
grant all privileges on public.games    to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Meme chose automatiquement pour les tables ajoutees plus tard.
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant all on sequences to service_role;
