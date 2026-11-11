"use client";

import { useState } from "react";
import { ClipboardCheck, Plus } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { cn } from "@/lib/cn";
import type { MemberLite } from "@/lib/members";
import { groupTasks, TASK_GROUP_LABEL, type TaskGroupKey } from "@/lib/progress";
import type { PostOption } from "@/server/task-page";
import type { TaskView } from "@/server/tasks";
import { TaskFormDialog, type TaskFormState } from "./TaskFormDialog";
import { TaskItem } from "./TaskItem";
import { useTaskMutations } from "./useTaskMutations";

type Props = {
  tasks: TaskView[];
  members: MemberLite[];
  posts: PostOption[];
  me: { id: string | null; isAdmin: boolean };
  today: string;
  /** Bouton « Ajouter une tâche » visible (réglage de l'admin). */
  canAdd: boolean;
  /** Pour qui les nouvelles tâches sont créées par défaut. */
  defaultMemberId?: string | null;
  emptyTitle: string;
  emptyDescription: string;
};

const TONE: Record<TaskGroupKey, string> = {
  retard: "text-accent-strong",
  semaine: "text-ink",
  plus_tard: "text-ink",
  faites: "text-ink-muted",
};

/** Tâches regroupées : En retard, Cette semaine, Plus tard, Faites. */
export function TaskGroups({
  tasks,
  members,
  posts,
  me,
  today,
  canAdd,
  defaultMemberId,
  emptyTitle,
  emptyDescription,
}: Props) {
  const m = useTaskMutations(tasks);
  const [form, setForm] = useState<TaskFormState>(null);
  const memberById = new Map(members.map((x) => [x.id, x]));
  const groups = groupTasks(m.tasks, today);
  const open = (["retard", "semaine", "plus_tard"] as const).filter((k) => groups[k].length > 0);

  const addButton = canAdd && (
    <button
      type="button"
      onClick={() => setForm({ mode: "new", defaultMemberId: defaultMemberId ?? me.id })}
      className="bg-accent-strong text-on-accent fixed right-4 bottom-24 z-20 inline-flex min-h-14 items-center gap-2 rounded-full px-5 text-base font-semibold shadow-lg active:scale-95 md:right-8 md:bottom-8"
    >
      <Plus aria-hidden className="size-5" />
      Ajouter une tâche
    </button>
  );

  return (
    <div>
      <Notice message={m.error} onClose={m.clearError} />

      {m.tasks.length === 0 ? (
        <EmptyState
          illustration="tasks"
          title={emptyTitle}
          description={emptyDescription}
          action={
            canAdd ? (
              <button
                type="button"
                onClick={() => setForm({ mode: "new", defaultMemberId: defaultMemberId ?? me.id })}
                className="bg-accent-strong text-on-accent inline-flex min-h-12 items-center gap-2 rounded-lg px-5 text-sm font-semibold"
              >
                <Plus aria-hidden className="size-4" />
                Ajouter une tâche
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-7">
          {open.length === 0 && (
            <p className="bg-t-impact-bg text-t-impact-fg flex items-center gap-2 rounded-2xl px-4 py-4 text-sm font-semibold">
              <ClipboardCheck aria-hidden className="size-5" />
              Tout est fait pour l&apos;instant. Bravo !
            </p>
          )}
          {open.map((key) => (
            <section key={key} aria-labelledby={`grp-${key}`}>
              <h2
                id={`grp-${key}`}
                className={cn(
                  "font-display mb-2.5 flex items-center gap-2 text-lg font-bold",
                  TONE[key],
                )}
              >
                {TASK_GROUP_LABEL[key]}
                <span className="bg-surface-2 text-ink-muted rounded-full px-2.5 py-0.5 font-sans text-xs font-semibold">
                  {groups[key].length}
                </span>
              </h2>
              <div className="stagger space-y-3">
                {groups[key].map((t) => (
                  <TaskItem
                    key={t.id}
                    task={t}
                    today={today}
                    owner={t.member_id ? memberById.get(t.member_id) : null}
                    me={me}
                    onToggle={m.setStatus}
                    onEdit={(task) => setForm({ mode: "edit", task })}
                  />
                ))}
              </div>
            </section>
          ))}

          {groups.faites.length > 0 && (
            <details className="group">
              <summary className="font-display text-ink-muted flex min-h-12 cursor-pointer list-none items-center gap-2 text-lg font-bold [&::-webkit-details-marker]:hidden">
                {TASK_GROUP_LABEL.faites}
                <span className="bg-surface-2 rounded-full px-2.5 py-0.5 font-sans text-xs font-semibold">
                  {groups.faites.length}
                </span>
                <span className="text-accent-strong ml-1 font-sans text-sm font-semibold underline underline-offset-4 group-open:hidden">
                  Afficher
                </span>
              </summary>
              <div className="mt-2.5 space-y-3">
                {groups.faites.slice(0, 30).map((t) => (
                  <TaskItem
                    key={t.id}
                    task={t}
                    today={today}
                    owner={t.member_id ? memberById.get(t.member_id) : null}
                    me={me}
                    onToggle={m.setStatus}
                    onEdit={(task) => setForm({ mode: "edit", task })}
                  />
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {addButton}
      <TaskFormDialog
        state={form}
        onClose={() => setForm(null)}
        members={members.filter((x) => x.actif)}
        posts={posts}
        me={me}
      />
    </div>
  );
}
