-- Observateur : une personne qui consulte tout (calendrier, tâches, avancement) sans travailler dans l'équipe.
-- Notifications : rappels et messages reçus par un membre (la cloche du site).

alter table public.pc_members
  add column if not exists observateur boolean not null default false;

create table if not exists public.pc_notifications (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references public.pc_members (id) on delete cascade,
  de_member_id  uuid references public.pc_members (id) on delete set null,
  kind          text not null check (kind in ('relance', 'message')),
  task_id       uuid references public.pc_tasks (id) on delete set null,
  texte         text not null check (char_length(btrim(texte)) between 1 and 600),
  lu_le         timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists pc_notifications_dest_idx
  on public.pc_notifications (member_id, created_at desc);
create index if not exists pc_notifications_non_lues_idx
  on public.pc_notifications (member_id) where lu_le is null;

-- Sécurité : comme toutes les tables pc_*, rien n'est lisible ni modifiable depuis le navigateur.
alter table public.pc_notifications enable row level security;
revoke all on public.pc_notifications from anon, authenticated;
