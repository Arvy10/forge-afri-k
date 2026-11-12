-- =====================================================================
-- V2.1 : sous-rôles et section « Infos ». Additif : ne modifie aucune donnée existante.
-- =====================================================================

-- Sous-rôles : un rôle peut avoir un rôle parent (ex. « Vidéo » → « Montage »).
alter table public.pc_roles
  add column parent_id uuid references public.pc_roles (id) on delete set null;
alter table public.pc_roles
  add constraint pc_roles_pas_son_propre_parent check (parent_id is null or parent_id <> id);
create index pc_roles_parent_idx on public.pc_roles (parent_id);

-- Infos : annonces écrites par l'administrateur, lues par tout le monde.
create table public.pc_infos (
  id          uuid primary key default gen_random_uuid(),
  titre       text not null check (char_length(btrim(titre)) between 1 and 160),
  contenu     text not null default '' check (char_length(contenu) <= 10000),
  epingle     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index pc_infos_ordre_idx on public.pc_infos (epingle desc, updated_at desc);

create trigger pc_infos_updated before update on public.pc_infos
  for each row execute function public.pc_set_updated_at();

-- Même sécurité que les autres tables pc_* : RLS sans politique, aucun droit pour anon / authenticated.
alter table public.pc_infos enable row level security;
revoke all on table public.pc_infos from anon, authenticated;
