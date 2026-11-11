"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ListChecks, Plus } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDueLabel } from "@/lib/dates";
import type { MemberLite } from "@/lib/members";
import { TaskFormDialog, type TaskFormState } from "@/components/tasks/TaskFormDialog";
import type { TaskView } from "@/server/tasks";

/** Tâches liées à ce post ; on peut en ajouter une directement depuis la fiche. */
export function LinkedTasks({
  postId,
  postLabel,
  tasks,
  members,
  me,
  today,
  canAdd,
}: {
  postId: string;
  postLabel: string;
  tasks: TaskView[];
  members: MemberLite[];
  me: { id: string | null; isAdmin: boolean };
  today: string;
  canAdd: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<TaskFormState>(null);
  const byId = new Map(members.map((m) => [m.id, m.prenom]));
  return (
    <section aria-labelledby="linked-tasks" className="space-y-3">
      <h3 id="linked-tasks" className="font-display flex items-center gap-2 text-base font-bold">
        <ListChecks aria-hidden className="size-4" />
        Tâches liées{" "}
        <span className="text-ink-muted font-sans text-sm font-normal">({tasks.length})</span>
      </h3>
      {tasks.length === 0 ? (
        <p className="text-ink-muted text-sm">Aucune tâche liée à ce post.</p>
      ) : (
        <ul className="divide-line border-line bg-surface divide-y rounded-xl border">
          {tasks.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{t.titre}</p>
                <p className="text-ink-muted text-xs">
                  {t.member_id ? (byId.get(t.member_id) ?? "—") : "Personne"}
                  {t.echeance ? ` · ${formatDueLabel(t.echeance, today)}` : ""}
                </p>
              </div>
              <StatusPill status={t.statut} kind="task" />
            </li>
          ))}
        </ul>
      )}
      {canAdd && (
        <button
          type="button"
          onClick={() => setForm({ mode: "new", defaultPostId: postId, defaultMemberId: me.id })}
          className="border-line-strong bg-surface hover:bg-surface-2 inline-flex min-h-12 items-center gap-1.5 rounded-lg border px-4 text-sm font-semibold"
        >
          <Plus aria-hidden className="size-4" />
          Ajouter une tâche
        </button>
      )}
      <TaskFormDialog
        state={form}
        onClose={() => {
          setForm(null);
          router.refresh();
        }}
        members={members.filter((m) => m.actif)}
        posts={[{ id: postId, label: postLabel }]}
        me={me}
      />
    </section>
  );
}
