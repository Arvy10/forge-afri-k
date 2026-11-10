-- =====================================================================
-- Forge Afri'K — Pôle Communication & Réseau
-- Migration initiale : types, tables, index, triggers, RLS, Storage.
-- À exécuter une seule fois sur un projet Supabase vierge.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Types énumérés
-- ---------------------------------------------------------------------
create type public.content_type as enum ('impact', 'patrimoine', 'coulisses', 'fun', 'appel_action');
create type public.channel as enum ('instagram', 'tiktok', 'facebook');
create type public.post_format as enum ('video_9_16', 'carrousel', 'photo', 'story', 'texte', 'autre');
create type public.post_status as enum ('a_faire', 'en_cours', 'pret_a_valider', 'valide', 'publie');
create type public.task_status as enum ('a_faire', 'en_cours', 'valide');
create type public.task_priority as enum ('normale', 'haute');
create type public.access_role as enum ('admin', 'member');
create type public.project_status as enum (
  'a_decider', 'en_preparation', 'etudes_en_preparation', 'realise', 'date_annoncee'
);
create type public.milestone_status as enum ('realise', 'en_cours', 'a_venir');

-- ---------------------------------------------------------------------
-- Fonctions utilitaires
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
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
-- Tables
-- ---------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null,
  full_name    text not null default '',
  avatar_path  text,
  bio          text not null default '',
  mission      text not null default '',
  does         text not null default '',
  does_not     text not null default '',
  whatsapp     text not null default '',
  access_role  public.access_role not null default 'member',
  active       boolean not null default true,
  onboarded    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.roles (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  mission     text not null default '',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.profile_roles (
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  role_id     uuid not null references public.roles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (profile_id, role_id)
);

create sequence public.posts_numero_seq;

create table public.posts (
  id               uuid primary key default gen_random_uuid(),
  numero           integer not null unique default nextval('public.posts_numero_seq'),
  date             date not null,
  type             public.content_type not null,
  canal_principal  public.channel not null,
  autres_canaux    public.channel[] not null default '{}',
  format           public.post_format not null default 'video_9_16',
  idee             text not null default '',
  prep_date        date,
  heure            time not null default '08:00',
  legende          text not null default '',
  responsable_id   uuid references public.profiles (id) on delete set null,
  statut           public.post_status not null default 'a_faire',
  lien             text,
  notes            text not null default '',
  created_by       uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint posts_lien_http check (lien is null or lien ~* '^https?://'),
  constraint posts_autres_canaux_distincts check (not (canal_principal = any (autres_canaux)))
);
alter sequence public.posts_numero_seq owned by public.posts.numero;

create table public.post_status_history (
  id           bigint generated always as identity primary key,
  post_id      uuid not null references public.posts (id) on delete cascade,
  from_status  public.post_status,
  to_status    public.post_status not null,
  changed_by   uuid references public.profiles (id) on delete set null,
  changed_at   timestamptz not null default now()
);

create table public.tasks (
  id              uuid primary key default gen_random_uuid(),
  titre           text not null check (char_length(titre) between 1 and 200),
  description     text not null default '',
  responsable_id  uuid references public.profiles (id) on delete set null,
  echeance        date,
  priorite        public.task_priority not null default 'normale',
  post_id         uuid references public.posts (id) on delete set null,
  statut          public.task_status not null default 'a_faire',
  created_by      uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts (id) on delete cascade,
  author_id   uuid references public.profiles (id) on delete set null default auth.uid(),
  body        text not null check (char_length(body) between 1 and 4000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.attachments (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid references public.posts (id) on delete cascade,
  task_id       uuid references public.tasks (id) on delete cascade,
  storage_path  text not null unique,
  file_name     text not null,
  mime_type     text not null default 'application/octet-stream',
  size_bytes    bigint not null default 0 check (size_bytes >= 0),
  uploaded_by   uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  -- Une pièce jointe appartient à un post OU à une tâche, jamais aux deux.
  constraint attachments_one_parent check ((post_id is null) <> (task_id is null))
);

create table public.guide_sections (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  titre       text not null,
  contenu     text not null default '',
  ordre       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.projects (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  titre        text not null,
  statut       public.project_status not null default 'a_decider',
  description  text not null default '',
  prudence     text not null default '',
  pole_pilote  text not null default '',
  date_label   text not null default '',
  ordre        integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.milestones (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references public.projects (id) on delete set null,
  periode      text not null,
  titre        text not null,
  description  text not null default '',
  statut       public.milestone_status not null default 'a_venir',
  ordre        integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Intérêt exprimé pour les pages « Bientôt » (aucune notification pour l'instant).
create table public.feature_interests (
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  feature     text not null check (feature in ('bibliotheque', 'reunions', 'resultats')),
  created_at  timestamptz not null default now(),
  primary key (profile_id, feature)
);

-- ---------------------------------------------------------------------
-- Index
-- ---------------------------------------------------------------------
create index posts_date_idx            on public.posts (date);
create index posts_prep_date_idx       on public.posts (prep_date);
create index posts_responsable_idx     on public.posts (responsable_id);
create index posts_statut_idx          on public.posts (statut);
create index tasks_responsable_idx     on public.tasks (responsable_id);
create index tasks_echeance_idx        on public.tasks (echeance);
create index tasks_post_idx            on public.tasks (post_id);
create index tasks_statut_idx          on public.tasks (statut);
create index comments_post_idx         on public.comments (post_id, created_at);
create index attachments_post_idx      on public.attachments (post_id);
create index attachments_task_idx      on public.attachments (task_id);
create index status_history_post_idx   on public.post_status_history (post_id, changed_at);
create index profile_roles_role_idx    on public.profile_roles (role_id);
create index milestones_ordre_idx      on public.milestones (ordre);

-- ---------------------------------------------------------------------
-- Triggers updated_at
-- ---------------------------------------------------------------------
create trigger profiles_updated_at       before update on public.profiles       for each row execute function public.set_updated_at();
create trigger roles_updated_at          before update on public.roles          for each row execute function public.set_updated_at();
create trigger posts_updated_at          before update on public.posts          for each row execute function public.set_updated_at();
create trigger tasks_updated_at          before update on public.tasks          for each row execute function public.set_updated_at();
create trigger comments_updated_at       before update on public.comments       for each row execute function public.set_updated_at();
create trigger guide_sections_updated_at before update on public.guide_sections for each row execute function public.set_updated_at();
create trigger projects_updated_at       before update on public.projects       for each row execute function public.set_updated_at();
create trigger milestones_updated_at     before update on public.milestones     for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Aides RLS (security definer : lisent profiles sans repasser par la RLS)
-- ---------------------------------------------------------------------
create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.active
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.active and p.access_role = 'admin'
  );
$$;

revoke all on function public.is_active_member() from public, anon;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_active_member() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------
-- Création automatique du profil à l'arrivée d'un utilisateur Auth
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Garde : un membre ne peut pas se promouvoir ni se réactiver
-- (auth.uid() est nul pour l'éditeur SQL et la clé service_role : autorisé)
-- ---------------------------------------------------------------------
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.access_role := old.access_role;
    new.active      := old.active;
    new.email       := old.email;
    new.id          := old.id;
  end if;
  return new;
end;
$$;

create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- Garde : le créateur d'un post ou d'une tâche ne change pas.
create or replace function public.keep_created_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_by := old.created_by;
  return new;
end;
$$;
create trigger posts_keep_created_by before update on public.posts for each row execute function public.keep_created_by();
create trigger tasks_keep_created_by before update on public.tasks for each row execute function public.keep_created_by();

-- ---------------------------------------------------------------------
-- Historique des statuts d'un post
-- ---------------------------------------------------------------------
create or replace function public.log_post_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.post_status_history (post_id, from_status, to_status, changed_by)
    values (new.id, null, new.statut, auth.uid());
  elsif new.statut is distinct from old.statut then
    insert into public.post_status_history (post_id, from_status, to_status, changed_by)
    values (new.id, old.statut, new.statut, auth.uid());
  end if;
  return new;
end;
$$;

create trigger posts_log_status_insert after insert on public.posts
  for each row execute function public.log_post_status();
create trigger posts_log_status_update after update of statut on public.posts
  for each row execute function public.log_post_status();

-- ---------------------------------------------------------------------
-- Row Level Security : activée partout, rien sans connexion
-- ---------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.roles               enable row level security;
alter table public.profile_roles       enable row level security;
alter table public.posts               enable row level security;
alter table public.post_status_history enable row level security;
alter table public.tasks               enable row level security;
alter table public.comments            enable row level security;
alter table public.attachments         enable row level security;
alter table public.guide_sections      enable row level security;
alter table public.projects            enable row level security;
alter table public.milestones          enable row level security;
alter table public.feature_interests   enable row level security;

-- Aucun droit pour les visiteurs non connectés.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;

-- profiles ------------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_active_member());
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid()) and public.is_active_member())
  with check (id = (select auth.uid()));
create policy profiles_update_admin on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- roles / profile_roles -----------------------------------------------
create policy roles_select on public.roles for select to authenticated using (public.is_active_member());
create policy roles_admin_write on public.roles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy profile_roles_select on public.profile_roles for select to authenticated
  using (public.is_active_member());
create policy profile_roles_admin_write on public.profile_roles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- posts ---------------------------------------------------------------
create policy posts_select on public.posts for select to authenticated using (public.is_active_member());
create policy posts_insert on public.posts for insert to authenticated
  with check (
    public.is_admin()
    or (public.is_active_member()
        and responsable_id = (select auth.uid())
        and created_by = (select auth.uid()))
  );
create policy posts_update on public.posts for update to authenticated
  using (public.is_admin() or (public.is_active_member() and responsable_id = (select auth.uid())))
  with check (public.is_admin() or (public.is_active_member() and responsable_id = (select auth.uid())));
create policy posts_delete on public.posts for delete to authenticated using (public.is_admin());

-- post_status_history (lecture seule ; écrite par trigger) ---------------
create policy status_history_select on public.post_status_history for select to authenticated
  using (public.is_active_member());

-- tasks ---------------------------------------------------------------
create policy tasks_select on public.tasks for select to authenticated using (public.is_active_member());
create policy tasks_insert on public.tasks for insert to authenticated
  with check (
    public.is_admin()
    or (public.is_active_member()
        and responsable_id = (select auth.uid())
        and created_by = (select auth.uid()))
  );
create policy tasks_update on public.tasks for update to authenticated
  using (public.is_admin() or (public.is_active_member() and responsable_id = (select auth.uid())))
  with check (public.is_admin() or (public.is_active_member() and responsable_id = (select auth.uid())));
create policy tasks_delete on public.tasks for delete to authenticated
  using (
    public.is_admin()
    or (public.is_active_member()
        and created_by = (select auth.uid())
        and responsable_id = (select auth.uid()))
  );

-- comments ------------------------------------------------------------
create policy comments_select on public.comments for select to authenticated using (public.is_active_member());
create policy comments_insert on public.comments for insert to authenticated
  with check (public.is_active_member() and author_id = (select auth.uid()));
create policy comments_update on public.comments for update to authenticated
  using (public.is_active_member() and author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));
create policy comments_delete on public.comments for delete to authenticated
  using (public.is_admin() or (public.is_active_member() and author_id = (select auth.uid())));

-- attachments ---------------------------------------------------------
create policy attachments_select on public.attachments for select to authenticated
  using (public.is_active_member());
create policy attachments_insert on public.attachments for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and (
      public.is_admin()
      or (post_id is not null and exists (
            select 1 from public.posts p
            where p.id = post_id and p.responsable_id = (select auth.uid())))
      or (task_id is not null and exists (
            select 1 from public.tasks t
            where t.id = task_id and t.responsable_id = (select auth.uid())))
    )
  );
create policy attachments_delete on public.attachments for delete to authenticated
  using (public.is_admin() or (public.is_active_member() and uploaded_by = (select auth.uid())));

-- guide_sections / projects / milestones --------------------------------
create policy guide_select on public.guide_sections for select to authenticated using (public.is_active_member());
create policy guide_admin_write on public.guide_sections for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy projects_select on public.projects for select to authenticated using (public.is_active_member());
create policy projects_admin_write on public.projects for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy milestones_select on public.milestones for select to authenticated using (public.is_active_member());
create policy milestones_admin_write on public.milestones for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- feature_interests ---------------------------------------------------
create policy interests_select on public.feature_interests for select to authenticated
  using (profile_id = (select auth.uid()) or public.is_admin());
create policy interests_insert on public.feature_interests for insert to authenticated
  with check (profile_id = (select auth.uid()) and public.is_active_member());
create policy interests_delete on public.feature_interests for delete to authenticated
  using (profile_id = (select auth.uid()));

-- Droits SQL de base pour les membres connectés (la RLS fait le tri).
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- ---------------------------------------------------------------------
-- Storage : deux buckets privés (accès par URL signée uniquement)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', false, 3145728,
    array['image/jpeg', 'image/png', 'image/webp']),
  ('attachments', 'attachments', false, 52428800,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif',
          'video/mp4', 'video/quicktime', 'video/webm',
          'application/pdf', 'text/plain',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation'])
on conflict (id) do nothing;

-- avatars : chemin « <id du profil>/<fichier> »
create policy avatars_select on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and public.is_active_member());
create policy avatars_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (public.is_admin() or (storage.foldername(name))[1] = (select auth.uid())::text)
  );
create policy avatars_update on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (public.is_admin() or (storage.foldername(name))[1] = (select auth.uid())::text)
  );
create policy avatars_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (public.is_admin() or (storage.foldername(name))[1] = (select auth.uid())::text)
  );

-- attachments : chemin « posts/<id>/… » ou « tasks/<id>/… ».
-- La table public.attachments décide qui peut rattacher un fichier ; ici on exige
-- seulement un membre actif, et on ne laisse supprimer que le déposant ou l'admin.
create policy attachments_obj_select on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and public.is_active_member());
create policy attachments_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and public.is_active_member());
create policy attachments_obj_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'attachments'
    and (public.is_admin() or (public.is_active_member() and owner = (select auth.uid())))
  );
