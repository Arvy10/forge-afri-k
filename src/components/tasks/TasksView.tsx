"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { setTaskStatus } from "@/actions/tasks";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { TASK_STATUSES, TASK_STATUS_LABEL, type TaskStatus } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { formatDateShort } from "@/lib/dates";
import type { PersonLite } from "@/lib/data";
import type { TaskRow } from "@/lib/database.types";
import { tasksHref, type TaskQuery } from "@/lib/tasks-params";
import { isTaskLate, TaskCard } from "./TaskCard";
import { TaskStatusSelect } from "./TaskStatusSelect";

export type PostLabel = { id: string; label: string };

type Props = {
  tasks: TaskRow[];
  people: PersonLite[];
  posts: PostLabel[];
  me: { id: string; isAdmin: boolean };
  today: string;
  query: TaskQuery;
};

export function TasksView({ tasks, people, posts, me, today, query }: Props) {
  const [optimistic, apply] = useOptimistic(tasks, (state: TaskRow[], a: { id: string; statut: TaskStatus }) =>
    state.map((t) => (t.id === a.id ? { ...t, statut: a.statut } : t)),
  );
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const peopleById = new Map(people.map((p) => [p.id, p]));
  const postById = new Map(posts.map((p) => [p.id, p.label]));
  const canEdit = (t: TaskRow) => me.isAdmin || t.responsable_id === me.id;

  const onStatus = (id: string, statut: TaskStatus) => {
    setError(null);
    start(async () => {
      apply({ id, statut });
      const res = await setTaskStatus({ id, statut });
      if (!res.ok) setError(res.error);
    });
  };

  if (optimistic.length === 0)
    return (
      <EmptyState
        illustration="tasks"
        title={query.filtre === "moi" ? "Aucune tâche pour toi" : "Aucune tâche pour l'instant"}
        description={
          query.filtre === "moi"
            ? "Ajoute ta première tâche avec la ligne ci-dessus, ou regarde celles de toute l'équipe."
            : "Ajoute la première tâche avec la ligne ci-dessus."
        }
        action={
          query.filtre === "moi" ? (
            <Link href={tasksHref(query, { filtre: "tous" })} className="border-line-strong bg-surface hover:bg-surface-2 inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-semibold">
              Voir toutes les tâches
            </Link>
          ) : undefined
        }
      />
    );

  const sorted = [...optimistic].sort((a, b) => {
    const pa = a.priorite === "haute" ? 0 : 1;
    const pb = b.priorite === "haute" ? 0 : 1;
    if (a.echeance && b.echeance) return a.echeance.localeCompare(b.echeance) || pa - pb;
    if (a.echeance) return -1;
    if (b.echeance) return 1;
    return pa - pb;
  });

  return (
    <div>
      <Notice message={error} onClose={() => setError(null)} />
      {query.vue === "kanban" ? (
        <div className="grid gap-4 md:grid-cols-3">
          {TASK_STATUSES.map((status) => {
            const col = sorted.filter((t) => t.statut === status);
            return (
              <section key={status} aria-labelledby={`k-${status}`} className="bg-surface-2/50 rounded-2xl p-2">
                <h2 id={`k-${status}`} className="font-display mb-2 flex items-center justify-between px-2 pt-1 text-base font-bold">
                  {TASK_STATUS_LABEL[status]}
                  <span className="bg-surface text-ink-muted rounded-full px-2.5 py-0.5 font-sans text-xs font-semibold">{col.length}</span>
                </h2>
                <div className="space-y-2">
                  {col.length === 0 ? (
                    <p className="text-ink-muted px-2 py-6 text-center text-sm">Rien ici</p>
                  ) : (
                    col.map((t) => (
                      <TaskCard
                        key={t.id}
                        task={t}
                        href={tasksHref(query, { tache: t.id })}
                        responsable={t.responsable_id ? (peopleById.get(t.responsable_id) ?? null) : null}
                        today={today}
                        canEdit={canEdit(t)}
                        postLabel={t.post_id ? postById.get(t.post_id) : undefined}
                        onStatus={onStatus}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <ul className="bg-surface border-line divide-line divide-y overflow-hidden rounded-2xl border">
          {sorted.map((t) => {
            const who = t.responsable_id ? peopleById.get(t.responsable_id) : null;
            const late = isTaskLate(t, today);
            const done = t.statut === "valide";
            return (
              <li key={t.id} className="flex items-center gap-1 px-2">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={done}
                  aria-label={done ? `Rouvrir : ${t.titre}` : `Terminer : ${t.titre}`}
                  disabled={!canEdit(t)}
                  onClick={() => onStatus(t.id, done ? "a_faire" : "valide")}
                  className="inline-flex size-11 shrink-0 items-center justify-center disabled:opacity-40"
                >
                  <span className={cn("inline-flex size-6 items-center justify-center rounded-md border-2", done ? "border-success bg-success text-canvas" : "border-line-strong bg-surface")}>
                    {done && <Check aria-hidden className="size-4" strokeWidth={3} />}
                  </span>
                </button>
                <Link href={tasksHref(query, { tache: t.id })} scroll={false} className="min-h-11 min-w-0 flex-1 py-2">
                  <span className={cn("block truncate text-sm font-medium", done && "text-ink-muted line-through")}>{t.titre}</span>
                  <span className={cn("text-xs", late ? "text-accent-strong font-semibold" : "text-ink-muted")}>
                    {t.echeance ? `${late ? "En retard · " : "Pour le "}${formatDateShort(t.echeance)}` : "Sans échéance"}
                    {t.priorite === "haute" && " · Priorité haute"}
                    {who && <span className="md:hidden"> · {who.name.split(" ")[0]}</span>}
                  </span>
                </Link>
                {who && (
                  <span className="hidden items-center gap-2 md:flex">
                    <Avatar name={who.name} src={who.avatar_url} id={who.id} size="sm" />
                    <span className="w-24 truncate text-sm">{who.name}</span>
                  </span>
                )}
                <TaskStatusSelect value={t.statut} disabled={!canEdit(t)} onChange={(s) => onStatus(t.id, s)} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
