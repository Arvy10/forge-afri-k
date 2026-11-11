"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2, X } from "lucide-react";
import { createTask, deleteTask, updateTask } from "@/actions/tasks";
import { Button } from "@/components/ui/Button";
import { FormError, SelectField, TextArea, TextField } from "@/components/ui/Field";
import { TASK_PRIORITIES, TASK_PRIORITY_LABEL } from "@/lib/constants";
import type { MemberLite } from "@/lib/members";
import { taskSchema, type TaskInput, type TaskValues } from "@/lib/schemas";
import type { PostOption } from "@/server/task-page";
import type { TaskView } from "@/server/tasks";

export type TaskFormState =
  | { mode: "new"; defaultMemberId?: string | null; defaultPostId?: string | null }
  | { mode: "edit"; task: TaskView }
  | null;

type Props = {
  state: TaskFormState;
  onClose: () => void;
  members: MemberLite[];
  posts: PostOption[];
  me: { id: string | null; isAdmin: boolean };
};

/** Ajouter ou modifier une tâche. Réassigner une tâche existante : administrateur seulement. */
export function TaskFormDialog({ state, onClose, members, posts, me }: Props) {
  return (
    <Dialog.Root open={state !== null} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="rx-overlay fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="rx-dialog bg-canvas fixed inset-x-0 bottom-0 z-50 flex max-h-[94dvh] flex-col rounded-t-2xl shadow-2xl md:inset-auto md:top-1/2 md:left-1/2 md:w-[34rem] md:max-w-[92vw] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl"
        >
          {state && (
            <Form
              key={state.mode === "edit" ? state.task.id : "new"}
              state={state}
              onClose={onClose}
              members={members}
              posts={posts}
              me={me}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Form({
  state,
  onClose,
  members,
  posts,
  me,
}: Props & { state: NonNullable<TaskFormState> }) {
  const router = useRouter();
  const editing = state.mode === "edit";
  const task = editing ? state.task : null;
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors },
  } = useForm<TaskInput, unknown, TaskValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      titre: task?.titre ?? "",
      description: task?.description ?? "",
      member_id: task
        ? (task.member_id ?? "")
        : state.mode === "new"
          ? (state.defaultMemberId ?? me.id ?? "")
          : "",
      echeance: task?.echeance ?? "",
      priorite: task?.priorite ?? "normale",
      post_id: task
        ? (task.post_id ?? "")
        : state.mode === "new"
          ? (state.defaultPostId ?? "")
          : "",
      statut: task?.statut ?? "a_faire",
    },
  });

  const onSubmit = handleSubmit((values) => {
    setError(null);
    start(async () => {
      const res = task ? await updateTask(task.id, values) : await createTask(values);
      if (!res.ok) {
        setError(res.error);
        for (const [k, m] of Object.entries(res.fieldErrors ?? {}))
          setFieldError(k as keyof TaskInput, { message: m });
        return;
      }
      onClose();
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <Dialog.Title className="font-display text-xl font-bold">
          {editing ? "Modifier la tâche" : "Ajouter une tâche"}
        </Dialog.Title>
        <Dialog.Close
          className="hover:bg-surface-2 -mt-1 -mr-2 inline-flex size-12 items-center justify-center rounded-lg"
          aria-label="Fermer"
        >
          <X aria-hidden className="size-5" />
        </Dialog.Close>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <FormError message={error} />
        <TextField
          label="Titre"
          required
          autoFocus
          maxLength={200}
          error={errors.titre?.message}
          {...register("titre")}
        />
        <SelectField
          label="Pour qui ?"
          disabled={editing && !me.isAdmin}
          hint={
            editing && !me.isAdmin ? "Seul l'administrateur peut réassigner une tâche." : undefined
          }
          error={errors.member_id?.message}
          {...register("member_id")}
        >
          <option value="">Personne pour l&apos;instant</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </SelectField>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Pour le"
            type="date"
            error={errors.echeance?.message}
            {...register("echeance")}
          />
          <SelectField label="Priorité" error={errors.priorite?.message} {...register("priorite")}>
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {TASK_PRIORITY_LABEL[p]}
              </option>
            ))}
          </SelectField>
        </div>
        <TextArea
          label="Détails (facultatif)"
          rows={3}
          error={errors.description?.message}
          {...register("description")}
        />
        <SelectField
          label="Post lié (facultatif)"
          error={errors.post_id?.message}
          {...register("post_id")}
        >
          <option value="">Aucun</option>
          {posts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="border-line flex flex-wrap items-center gap-2 border-t px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button type="submit" loading={pending} className="min-h-12">
          {editing ? "Enregistrer" : "Ajouter la tâche"}
        </Button>
        <Button variant="ghost" onClick={onClose} className="min-h-12">
          Annuler
        </Button>
        {editing && me.isAdmin && (
          <span className="ml-auto">
            {confirmDelete ? (
              <Button
                variant="danger"
                loading={pending}
                className="min-h-12"
                onClick={() =>
                  start(async () => {
                    const res = await deleteTask(task!.id);
                    if (!res.ok) return setError(res.error);
                    onClose();
                    router.refresh();
                  })
                }
              >
                Confirmer la suppression
              </Button>
            ) : (
              <Button variant="ghost" className="min-h-12" onClick={() => setConfirmDelete(true)}>
                <Trash2 aria-hidden className="size-4" />
                Supprimer
              </Button>
            )}
          </span>
        )}
      </div>
    </form>
  );
}
