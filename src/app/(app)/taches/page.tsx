import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { QuickAdd } from "@/components/tasks/QuickAdd";
import { QuickAddFab } from "@/components/tasks/QuickAddFab";
import { TaskSheet } from "@/components/tasks/TaskSheet";
import { TasksView, type PostLabel } from "@/components/tasks/TasksView";
import { WorkloadPanel, type Workload } from "@/components/tasks/WorkloadPanel";
import { requireMember } from "@/lib/auth";
import { getTeam, toLite } from "@/lib/data";
import { addDaysISO, formatDateShort, todayISO } from "@/lib/dates";
import type { AttachmentRow, PostRow, TaskRow } from "@/lib/database.types";
import { signAttachments } from "@/lib/posts-data";
import type { TaskInput } from "@/lib/schemas";
import { parseTaskQuery, tasksHref, type TaskQuery } from "@/lib/tasks-params";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Tâches" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TasksPage({ searchParams }: { searchParams: SearchParams }) {
  const { profile, isAdmin } = await requireMember();
  const query = parseTaskQuery(await searchParams);
  const me = { id: profile.id, isAdmin };
  const bodyKey = `${query.vue}|${query.filtre}`;

  const seg = (active: boolean) =>
    cn("inline-flex min-h-11 items-center rounded-md px-4 text-sm font-semibold", active ? "bg-forest text-on-forest" : "text-ink-muted hover:text-ink");

  return (
    <>
      <PageHeader title="Tâches" description="Ce qu'il reste à faire, par qui et pour quand." />

      <QuickAdd moreHref={tasksHref(query, { nouvelle: "1" })} />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Qui" className="border-line-strong bg-surface inline-flex rounded-lg border p-0.5">
          <Link href={tasksHref(query, { filtre: "moi", tache: null, nouvelle: null })} aria-current={query.filtre === "moi" ? "page" : undefined} className={seg(query.filtre === "moi")}>
            Mes tâches
          </Link>
          <Link href={tasksHref(query, { filtre: "tous", tache: null, nouvelle: null })} aria-current={query.filtre === "tous" ? "page" : undefined} className={seg(query.filtre === "tous")}>
            Toute l&apos;équipe
          </Link>
        </nav>
        <nav aria-label="Affichage" className="border-line-strong bg-surface inline-flex rounded-lg border p-0.5">
          <Link href={tasksHref(query, { vue: "kanban", tache: null, nouvelle: null })} aria-current={query.vue === "kanban" ? "page" : undefined} className={seg(query.vue === "kanban")}>
            Kanban
          </Link>
          <Link href={tasksHref(query, { vue: "liste", tache: null, nouvelle: null })} aria-current={query.vue === "liste" ? "page" : undefined} className={seg(query.vue === "liste")}>
            Liste
          </Link>
        </nav>
      </div>

      {isAdmin && (
        <Suspense fallback={null}>
          <Workloads />
        </Suspense>
      )}

      <Suspense key={bodyKey} fallback={<PageSkeleton />}>
        <Body query={query} me={me} />
      </Suspense>

      <QuickAddFab />

      {(query.tache || query.nouvelle) && (
        <Suspense fallback={null}>
          <Sheet query={query} me={me} />
        </Suspense>
      )}
    </>
  );
}

async function loadPostLabels(): Promise<PostLabel[]> {
  const { supabase } = await requireMember();
  const { data } = await supabase
    .from("posts")
    .select("id, numero, date, idee")
    .gte("date", addDaysISO(todayISO(), -14))
    .order("date")
    .limit(120);
  return ((data ?? []) as Pick<PostRow, "id" | "numero" | "date" | "idee">[]).map((p) => ({
    id: p.id,
    label: `N° ${p.numero} · ${formatDateShort(p.date)}${p.idee ? ` · ${p.idee.slice(0, 40)}` : ""}`,
  }));
}

async function Body({ query, me }: { query: TaskQuery; me: { id: string; isAdmin: boolean } }) {
  const { supabase } = await requireMember();
  let q = supabase.from("tasks").select("*").order("echeance", { nullsFirst: false }).limit(500);
  if (query.filtre === "moi") q = q.eq("responsable_id", me.id);
  const [{ data }, team, posts] = await Promise.all([q, getTeam(), loadPostLabels()]);
  return (
    <TasksView
      tasks={(data ?? []) as TaskRow[]}
      people={team.filter((m) => m.active).map(toLite)}
      posts={posts}
      me={me}
      today={todayISO()}
      query={query}
    />
  );
}

async function Workloads() {
  const { supabase } = await requireMember();
  const today = todayISO();
  const [{ data }, team] = await Promise.all([
    supabase.from("tasks").select("responsable_id, echeance, priorite").neq("statut", "valide").limit(2000),
    getTeam(),
  ]);
  const map = new Map<string, Workload>();
  for (const t of (data ?? []) as Pick<TaskRow, "responsable_id" | "echeance" | "priorite">[]) {
    if (!t.responsable_id) continue;
    const l = map.get(t.responsable_id) ?? { id: t.responsable_id, open: 0, late: 0, high: 0 };
    l.open++;
    if (t.echeance && t.echeance < today) l.late++;
    if (t.priorite === "haute") l.high++;
    map.set(t.responsable_id, l);
  }
  return <WorkloadPanel people={team.filter((m) => m.active).map(toLite)} load={[...map.values()]} />;
}

async function Sheet({ query, me }: { query: TaskQuery; me: { id: string; isAdmin: boolean } }) {
  const { supabase } = await requireMember();
  const closeHref = tasksHref(query, { tache: null, nouvelle: null });
  const [team, posts] = await Promise.all([getTeam(), loadPostLabels()]);
  const people = team.filter((m) => m.active).map(toLite);

  if (query.nouvelle) {
    const defaults: TaskInput = {
      titre: "",
      description: "",
      responsable_id: me.id,
      echeance: "",
      priorite: "normale",
      post_id: query.nouvelle !== "1" ? query.nouvelle : "",
      statut: "a_faire",
    };
    return <TaskSheet mode="new" defaults={defaults} attachments={[]} people={people} posts={posts} me={me} closeHref={closeHref} />;
  }

  const { data: task } = await supabase.from("tasks").select("*").eq("id", query.tache!).maybeSingle();
  if (!task) redirect(closeHref);
  const t = task as TaskRow;
  const { data: att } = await supabase.from("attachments").select("*").eq("task_id", t.id).order("created_at");
  const attachments = await signAttachments(supabase, (att ?? []) as AttachmentRow[]);
  const defaults: TaskInput = {
    titre: t.titre,
    description: t.description,
    responsable_id: t.responsable_id ?? "",
    echeance: t.echeance ?? "",
    priorite: t.priorite,
    post_id: t.post_id ?? "",
    statut: t.statut,
  };
  return <TaskSheet mode="edit" task={t} defaults={defaults} attachments={attachments} people={people} posts={posts} me={me} closeHref={closeHref} />;
}
