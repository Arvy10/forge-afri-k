-- Calendrier éditorial jour par jour : deux tables (jours et créneaux) à la place de pc_posts.
-- Au moment de cette migration, pc_posts, les tâches liées à un post et le journal des posts sont vides
-- en production : rien n'est perdu. Les références « post » deviennent des références « créneau ».

create type public.pc_slot_moment   as enum ('matin', 'soir');
create type public.pc_slot_priorite as enum ('obligatoire', 'facultatif');

create table public.pc_days (
  id               uuid primary key default gen_random_uuid(),
  numero           integer not null unique,
  date             date    not null unique,
  jour             text    not null,
  semaine          integer not null,
  theme_semaine    text    not null default '',
  type_de_contenu  public.pc_content_type not null,
  consigne_du_jour text    not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index pc_days_semaine_idx on public.pc_days (semaine, date);

create table public.pc_slots (
  id             uuid primary key default gen_random_uuid(),
  day_id         uuid not null references public.pc_days (id) on delete cascade,
  moment         public.pc_slot_moment   not null,
  heure          time not null,
  priorite       public.pc_slot_priorite not null,
  genre          text not null default '',
  titre          text not null,
  idee           text not null default '',
  comment_faire  jsonb not null default '[]'::jsonb,
  accroche       text,
  legende        text,
  formats        jsonb not null default '{}'::jsonb,
  a_preparer_le  date,
  responsable_id uuid references public.pc_members (id) on delete set null,
  statut         public.pc_post_status not null default 'a_faire',
  lien           text,
  cree_par       uuid references public.pc_members (id) on delete set null,
  maj_par        uuid references public.pc_members (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (day_id, moment),
  constraint pc_slots_lien_http check (lien is null or lien ~* '^https?://'),
  constraint pc_slots_comment_faire_liste check (jsonb_typeof(comment_faire) = 'array'),
  constraint pc_slots_formats_objet check (jsonb_typeof(formats) = 'object')
);
create index pc_slots_prep_idx        on public.pc_slots (a_preparer_le);
create index pc_slots_responsable_idx on public.pc_slots (responsable_id);
create index pc_slots_statut_idx      on public.pc_slots (statut);

-- Les tâches et le journal pointaient vers pc_posts : ils pointent maintenant vers un créneau.
alter table public.pc_tasks    drop column post_id;
alter table public.pc_tasks    add  column slot_id uuid references public.pc_slots (id) on delete set null;
create index pc_tasks_slot_idx on public.pc_tasks (slot_id);
alter table public.pc_activity drop column post_id;
alter table public.pc_activity add  column slot_id uuid references public.pc_slots (id) on delete set null;

drop table public.pc_posts cascade;
drop function if exists public.pc_log_post();

-- Journal : seule la publication d'un créneau est notée (le chargement du calendrier ne doit rien inonder).
create or replace function public.pc_log_slot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.statut = 'publie' and old.statut is distinct from 'publie' then
    insert into public.pc_activity (kind, member_id, cible_id, slot_id, libelle)
    values ('post_published', coalesce(new.maj_par, new.responsable_id), new.responsable_id, new.id, new.titre);
  end if;
  return new;
end;
$$;
create trigger pc_slots_log_update after update of statut on public.pc_slots
  for each row execute function public.pc_log_slot();

create trigger pc_days_updated  before update on public.pc_days  for each row execute function public.pc_set_updated_at();
create trigger pc_slots_updated before update on public.pc_slots for each row execute function public.pc_set_updated_at();

-- Sécurité : comme toutes les tables pc_*, rien n'est lisible ni modifiable depuis le navigateur.
alter table public.pc_days  enable row level security;
alter table public.pc_slots enable row level security;
revoke all on public.pc_days  from anon, authenticated;
revoke all on public.pc_slots from anon, authenticated;
