-- =====================================================================
-- Forge Afri'K — Pôle Communication & Réseau — V2
-- Schéma `pc_*` : aucun compte e-mail, aucune politique publique.
-- Toutes les lectures et écritures passent par le serveur (clé service_role).
-- Les tables d'autres applications du même projet ne sont jamais touchées.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Types énumérés
-- ---------------------------------------------------------------------
create type public.pc_task_status      as enum ('a_faire', 'en_cours', 'fait');
create type public.pc_priority         as enum ('normale', 'haute');
create type public.pc_deliverable_type as enum ('fichier', 'lien');
create type public.pc_content_type     as enum ('impact', 'patrimoine', 'coulisses', 'fun', 'appel_action');
create type public.pc_channel          as enum ('instagram', 'tiktok', 'facebook');
create type public.pc_post_format      as enum ('video_9_16', 'carrousel', 'photo', 'story', 'texte', 'autre');
create type public.pc_post_status      as enum ('a_faire', 'en_cours', 'pret_a_valider', 'valide', 'publie');
create type public.pc_project_status   as enum ('a_decider', 'en_preparation', 'etudes_en_preparation', 'realise', 'date_annoncee');
create type public.pc_milestone_status as enum ('realise', 'en_cours', 'a_venir');
create type public.pc_tasks_policy     as enum ('tous', 'admin');
create type public.pc_activity_kind    as enum (
  'task_created', 'task_done', 'task_reopened', 'deliverable_added', 'nudge', 'post_created', 'post_published'
);

-- ---------------------------------------------------------------------
-- Fonction utilitaire : updated_at automatique
-- ---------------------------------------------------------------------
create or replace function public.pc_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Équipe
-- ---------------------------------------------------------------------
create table public.pc_members (
  id          uuid primary key default gen_random_uuid(),
  prenom      text not null check (char_length(btrim(prenom)) between 1 and 60),
  nom         text check (nom is null or char_length(nom) <= 80),
  couleur     text not null default 'vert' check (couleur in ('vert', 'orange', 'sable', 'bleu', 'ambre')),
  photo_path  text,
  actif       boolean not null default true,
  ordre       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- Deux membres actifs ne peuvent pas avoir exactement le même nom (on les distingue par le nom de famille).
create unique index pc_members_nom_actif_idx
  on public.pc_members (lower(btrim(prenom)), lower(btrim(coalesce(nom, '')))) where actif;
create index pc_members_ordre_idx on public.pc_members (ordre, created_at);

create table public.pc_roles (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null unique check (char_length(btrim(nom)) between 1 and 80),
  mission     text not null default '',
  ne_fait_pas text not null default '',
  ordre       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.pc_member_roles (
  member_id   uuid not null references public.pc_members (id) on delete cascade,
  role_id     uuid not null references public.pc_roles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (member_id, role_id)
);
create index pc_member_roles_role_idx on public.pc_member_roles (role_id);

-- ---------------------------------------------------------------------
-- Calendrier éditorial (vide au départ)
-- ---------------------------------------------------------------------
create sequence public.pc_posts_numero_seq;

create table public.pc_posts (
  id               uuid primary key default gen_random_uuid(),
  numero           integer not null unique default nextval('public.pc_posts_numero_seq'),
  date             date not null,
  type             public.pc_content_type not null,
  canal_principal  public.pc_channel not null,
  autres_canaux    public.pc_channel[] not null default '{}',
  format           public.pc_post_format not null default 'video_9_16',
  idee             text not null default '',
  prep_date        date,
  heure            time not null default '08:00',
  legende          text not null default '',
  responsable_id   uuid references public.pc_members (id) on delete set null,
  statut           public.pc_post_status not null default 'a_faire',
  lien             text,
  notes            text not null default '',
  cree_par         uuid references public.pc_members (id) on delete set null,
  maj_par          uuid references public.pc_members (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint pc_posts_lien_http check (lien is null or lien ~* '^https?://'),
  constraint pc_posts_canaux_distincts check (not (canal_principal = any (autres_canaux)))
);
alter sequence public.pc_posts_numero_seq owned by public.pc_posts.numero;
create index pc_posts_date_idx        on public.pc_posts (date);
create index pc_posts_prep_date_idx   on public.pc_posts (prep_date);
create index pc_posts_responsable_idx on public.pc_posts (responsable_id);
create index pc_posts_statut_idx      on public.pc_posts (statut);

-- ---------------------------------------------------------------------
-- Tâches, livrables, relances
-- ---------------------------------------------------------------------
create table public.pc_tasks (
  id           uuid primary key default gen_random_uuid(),
  titre        text not null check (char_length(btrim(titre)) between 1 and 200),
  description  text not null default '',
  member_id    uuid references public.pc_members (id) on delete set null,
  echeance     date,
  priorite     public.pc_priority not null default 'normale',
  statut       public.pc_task_status not null default 'a_faire',
  post_id      uuid references public.pc_posts (id) on delete set null,
  fait_le      timestamptz,
  cree_par     uuid references public.pc_members (id) on delete set null,
  maj_par      uuid references public.pc_members (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index pc_tasks_member_idx    on public.pc_tasks (member_id);
create index pc_tasks_echeance_idx  on public.pc_tasks (echeance);
create index pc_tasks_statut_idx    on public.pc_tasks (statut);
create index pc_tasks_post_idx      on public.pc_tasks (post_id);
create index pc_tasks_fait_le_idx   on public.pc_tasks (fait_le);

-- `fait_le` suit le statut : horodaté quand la tâche passe à « fait », effacé si on la rouvre.
create or replace function public.pc_task_fait_le()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.statut = 'fait' then
    if tg_op = 'INSERT' or old.statut is distinct from 'fait' then
      new.fait_le := now();
    else
      new.fait_le := old.fait_le;
    end if;
  else
    new.fait_le := null;
  end if;
  return new;
end;
$$;
create trigger pc_tasks_fait_le before insert or update of statut on public.pc_tasks
  for each row execute function public.pc_task_fait_le();

create table public.pc_task_deliverables (
  id            uuid primary key default gen_random_uuid(),
  task_id       uuid not null references public.pc_tasks (id) on delete cascade,
  type          public.pc_deliverable_type not null,
  nom           text not null check (char_length(btrim(nom)) between 1 and 200),
  url           text,
  storage_path  text unique,
  taille_octets bigint check (taille_octets is null or taille_octets >= 0),
  depose_par    uuid references public.pc_members (id) on delete set null,
  created_at    timestamptz not null default now(),
  -- Un lien porte une URL ; un fichier porte un chemin de stockage. Jamais les deux.
  constraint pc_deliverables_coherent check (
    (type = 'lien'    and url ~* '^https?://' and storage_path is null) or
    (type = 'fichier' and storage_path is not null and url is null)
  )
);
create index pc_deliverables_task_idx on public.pc_task_deliverables (task_id, created_at);

create table public.pc_nudges (
  id             uuid primary key default gen_random_uuid(),
  task_id        uuid not null references public.pc_tasks (id) on delete cascade,
  par_member_id  uuid references public.pc_members (id) on delete set null,
  note           text not null default '' check (char_length(note) <= 500),
  created_at     timestamptz not null default now()
);
create index pc_nudges_task_idx on public.pc_nudges (task_id, created_at desc);

-- ---------------------------------------------------------------------
-- Journal d'activité (alimenté par des triggers)
-- ---------------------------------------------------------------------
create table public.pc_activity (
  id          bigint generated always as identity primary key,
  kind        public.pc_activity_kind not null,
  member_id   uuid references public.pc_members (id) on delete set null,
  cible_id    uuid references public.pc_members (id) on delete set null,
  task_id     uuid references public.pc_tasks (id) on delete set null,
  post_id     uuid references public.pc_posts (id) on delete set null,
  libelle     text not null default '',
  created_at  timestamptz not null default now()
);
create index pc_activity_created_idx on public.pc_activity (created_at desc);

create or replace function public.pc_log_task()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.pc_activity (kind, member_id, cible_id, task_id, libelle)
    values ('task_created', new.cree_par, new.member_id, new.id, new.titre);
  elsif new.statut = 'fait' and old.statut is distinct from 'fait' then
    insert into public.pc_activity (kind, member_id, cible_id, task_id, libelle)
    values ('task_done', coalesce(new.maj_par, new.member_id), new.member_id, new.id, new.titre);
  elsif old.statut = 'fait' and new.statut is distinct from 'fait' then
    insert into public.pc_activity (kind, member_id, cible_id, task_id, libelle)
    values ('task_reopened', coalesce(new.maj_par, new.member_id), new.member_id, new.id, new.titre);
  end if;
  return new;
end;
$$;
create trigger pc_tasks_log_insert after insert on public.pc_tasks
  for each row execute function public.pc_log_task();
create trigger pc_tasks_log_update after update of statut on public.pc_tasks
  for each row execute function public.pc_log_task();

create or replace function public.pc_log_deliverable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare t record;
begin
  select titre, member_id into t from public.pc_tasks where id = new.task_id;
  insert into public.pc_activity (kind, member_id, cible_id, task_id, libelle)
  values ('deliverable_added', new.depose_par, t.member_id, new.task_id, coalesce(t.titre, new.nom));
  return new;
end;
$$;
create trigger pc_deliverables_log after insert on public.pc_task_deliverables
  for each row execute function public.pc_log_deliverable();

create or replace function public.pc_log_nudge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare t record;
begin
  select titre, member_id into t from public.pc_tasks where id = new.task_id;
  insert into public.pc_activity (kind, member_id, cible_id, task_id, libelle)
  values ('nudge', new.par_member_id, t.member_id, new.task_id, coalesce(t.titre, ''));
  return new;
end;
$$;
create trigger pc_nudges_log after insert on public.pc_nudges
  for each row execute function public.pc_log_nudge();

create or replace function public.pc_log_post()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.pc_activity (kind, member_id, cible_id, post_id, libelle)
    values ('post_created', new.cree_par, new.responsable_id, new.id,
            coalesce(nullif(btrim(new.idee), ''), 'Post n° ' || new.numero));
  elsif new.statut = 'publie' and old.statut is distinct from 'publie' then
    insert into public.pc_activity (kind, member_id, cible_id, post_id, libelle)
    values ('post_published', coalesce(new.maj_par, new.responsable_id), new.responsable_id, new.id,
            coalesce(nullif(btrim(new.idee), ''), 'Post n° ' || new.numero));
  end if;
  return new;
end;
$$;
create trigger pc_posts_log_insert after insert on public.pc_posts
  for each row execute function public.pc_log_post();
create trigger pc_posts_log_update after update of statut on public.pc_posts
  for each row execute function public.pc_log_post();

-- ---------------------------------------------------------------------
-- Règles et guide, projets, feuille de route
-- ---------------------------------------------------------------------
create table public.pc_guide_sections (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  titre       text not null,
  contenu     text not null default '',
  ordre       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.pc_projects (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  titre        text not null,
  statut       public.pc_project_status not null default 'a_decider',
  description  text not null default '',
  prudence     text not null default '',
  pole_pilote  text not null default '',
  date_label   text not null default '',
  ordre        integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.pc_milestones (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references public.pc_projects (id) on delete set null,
  periode      text not null,
  titre        text not null,
  description  text not null default '',
  statut       public.pc_milestone_status not null default 'a_venir',
  ordre        integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index pc_milestones_ordre_idx on public.pc_milestones (ordre);

-- ---------------------------------------------------------------------
-- Réglages, essais de connexion, intérêts « Bientôt »
-- ---------------------------------------------------------------------
create table public.pc_settings (
  id                boolean primary key default true check (id),   -- une seule ligne
  tasks_add_policy  public.pc_tasks_policy not null default 'tous',
  code_hash         text,                       -- code d'accès haché (bcrypt) ; sinon variable ACCESS_CODE
  code_version      integer not null default 1, -- change quand le code change : toutes les sessions tombent
  updated_at        timestamptz not null default now()
);
insert into public.pc_settings (id) values (true) on conflict do nothing;

create table public.pc_login_attempts (
  ip_hash       text not null,
  kind          text not null check (kind in ('access', 'admin')),
  tries         integer not null default 0,
  window_start  timestamptz not null default now(),
  locked_until  timestamptz,
  primary key (ip_hash, kind)
);

create table public.pc_feature_interests (
  member_id   uuid not null references public.pc_members (id) on delete cascade,
  feature     text not null check (feature in ('bibliotheque', 'reunions', 'resultats')),
  created_at  timestamptz not null default now(),
  primary key (member_id, feature)
);

-- ---------------------------------------------------------------------
-- updated_at automatique
-- ---------------------------------------------------------------------
create trigger pc_members_updated    before update on public.pc_members        for each row execute function public.pc_set_updated_at();
create trigger pc_roles_updated      before update on public.pc_roles          for each row execute function public.pc_set_updated_at();
create trigger pc_posts_updated      before update on public.pc_posts          for each row execute function public.pc_set_updated_at();
create trigger pc_tasks_updated      before update on public.pc_tasks          for each row execute function public.pc_set_updated_at();
create trigger pc_guide_updated      before update on public.pc_guide_sections for each row execute function public.pc_set_updated_at();
create trigger pc_projects_updated   before update on public.pc_projects       for each row execute function public.pc_set_updated_at();
create trigger pc_milestones_updated before update on public.pc_milestones     for each row execute function public.pc_set_updated_at();
create trigger pc_settings_updated   before update on public.pc_settings       for each row execute function public.pc_set_updated_at();

-- ---------------------------------------------------------------------
-- Sécurité : RLS partout, AUCUNE politique, droits retirés à anon / authenticated.
-- Résultat : la clé publique du navigateur ne peut rien lire ni écrire.
-- Seul le serveur (service_role, qui contourne la RLS) accède aux données.
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename like 'pc\_%' loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
  end loop;
end $$;
revoke all on sequence public.pc_posts_numero_seq from anon, authenticated;
revoke all on sequence public.pc_activity_id_seq from anon, authenticated;

revoke execute on function public.pc_set_updated_at()  from public, anon, authenticated;
revoke execute on function public.pc_task_fait_le()    from public, anon, authenticated;
revoke execute on function public.pc_log_task()        from public, anon, authenticated;
revoke execute on function public.pc_log_deliverable() from public, anon, authenticated;
revoke execute on function public.pc_log_nudge()       from public, anon, authenticated;
revoke execute on function public.pc_log_post()        from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Stockage : un espace privé pour les livrables (aucune politique → inaccessible au navigateur ;
-- le serveur délivre des URL signées de courte durée).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('pc-livrables', 'pc-livrables', false, 52428800)
on conflict (id) do nothing;
