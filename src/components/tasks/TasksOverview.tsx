"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { TASK_STATUSES, TASK_STATUS_LABEL } from "@/lib/constants";
import type { MemberLite } from "@/lib/members";
import { hasTaskFilters, type TaskQuery } from "@/lib/tasks-params";
import type { PostOption } from "@/server/task-page";
import type { TaskView } from "@/server/tasks";
import { TaskFormDialog, type TaskFormState } from "./TaskFormDialog";
import { TaskItem } from "./TaskItem";
import { TasksTable } from "./TasksTable";
import { useTaskMutations } from "./useTaskMutations";

type Props = {
  tasks: TaskView[];
  members: MemberLite[];
  posts: PostOption[];
  me: { id: string | null; isAdmin: boolean };
  today: string;
  query: TaskQuery;
  canAdd: boolean;
};

/** Toutes les tâches : cartes sur mobile, tableau sur ordinateur, ou Kanban. */
export function TasksOverview({ tasks, members, posts, me, today, query, canAdd }: Props) {
  const m = useTaskMutations(tasks);
  const [form, setForm] = useState<TaskFormState>(null);
  const memberById = new Map(members.map((x) => [x.id, x]));
  const card = (t: TaskView) => (
    <TaskItem
      key={t.id}
      task={t}
      today={today}
      showOwner
      owner={t.member_id ? memberById.get(t.member_id) : null}
      me={me}
      onToggle={m.setStatus}
      onEdit={(task) => setForm({ mode: "edit", task })}
    />
  );

  return (
    <div>
      <Notice message={m.error} onClose={m.clearError} />

      {m.tasks.length === 0 ? (
        <EmptyState
          illustration="tasks"
          title={
            hasTaskFilters(query) ? "Aucune tâche ne correspond" : "Aucune tâche pour l'instant"
          }
          description={
            hasTaskFilters(query)
              ? "Change ou efface les filtres pour voir les autres tâches."
              : "Ajoute la première tâche : elle apparaîtra dans l'espace de la personne concernée."
          }
        />
      ) : query.vue === "kanban" ? (
        <div className="grid gap-4 md:grid-cols-3">
          {TASK_STATUSES.map((status) => {
            const col = m.tasks.filter((t) => t.statut === status);
            return (
              <section
                key={status}
                aria-labelledby={`k-${status}`}
                className="bg-surface-2/60 rounded-2xl p-2.5"
              >
                <h2
                  id={`k-${status}`}
                  className="font-display mb-2.5 flex items-center justify-between px-1.5 pt-1 text-base font-bold"
                >
                  {TASK_STATUS_LABEL[status]}
                  <span className="bg-surface text-ink-muted rounded-full px-2.5 py-0.5 font-sans text-xs font-semibold">
                    {col.length}
                  </span>
                </h2>
                <div className="space-y-2.5">
                  {col.length === 0 ? (
                    <p className="text-ink-muted px-2 py-6 text-center text-sm">Rien ici</p>
                  ) : (
                    col.map(card)
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <>
          <div className="stagger space-y-3 md:hidden">{m.tasks.map(card)}</div>
          <div className="hidden md:block">
            <TasksTable
              tasks={m.tasks}
              members={members}
              me={me}
              today={today}
              onToggle={m.setStatus}
              onStatus={m.setStatus}
              onEdit={(task) => setForm({ mode: "edit", task })}
            />
          </div>
        </>
      )}

      {canAdd && (
        <button
          type="button"
          onClick={() => setForm({ mode: "new" })}
          className="bg-accent-strong text-on-accent fixed right-4 bottom-24 z-20 inline-flex min-h-14 items-center gap-2 rounded-full px-5 text-base font-semibold shadow-lg active:scale-95 md:right-8 md:bottom-8"
        >
          <Plus aria-hidden className="size-5" />
          Ajouter une tâche
        </button>
      )}
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
