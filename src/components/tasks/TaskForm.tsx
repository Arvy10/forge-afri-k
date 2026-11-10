"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { createTask, deleteTask, updateTask } from "@/actions/tasks";
import { Button } from "@/components/ui/Button";
import { FormError, SelectField, TextArea, TextField } from "@/components/ui/Field";
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABEL,
  TASK_STATUSES,
  TASK_STATUS_LABEL,
} from "@/lib/constants";
import type { PersonLite } from "@/lib/data";
import { taskSchema, type TaskInput, type TaskValues } from "@/lib/schemas";
import type { PostLabel } from "./TasksView";

export function TaskForm({
  mode,
  taskId,
  defaults,
  people,
  posts,
  me,
  canEdit,
  canDelete,
  closeHref,
}: {
  mode: "new" | "edit";
  taskId?: string;
  defaults: TaskInput;
  people: PersonLite[];
  posts: PostLabel[];
  me: { id: string; isAdmin: boolean };
  canEdit: boolean;
  canDelete: boolean;
  closeHref: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors },
  } = useForm<TaskInput, unknown, TaskValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: defaults,
  });

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((values) => {
        setError(null);
        setSaved(false);
        start(async () => {
          const res = mode === "new" ? await createTask(values) : await updateTask(taskId!, values);
          if (!res.ok) {
            setError(res.error);
            for (const [k, m] of Object.entries(res.fieldErrors ?? {}))
              setFieldError(k as keyof TaskInput, { message: m });
            return;
          }
          if (mode === "new") router.push(closeHref, { scroll: false });
          else {
            setSaved(true);
            router.refresh();
          }
        });
      })}
    >
      {!canEdit && (
        <p role="note" className="bg-surface-2 rounded-lg px-3 py-2.5 text-sm">
          Tu peux lire cette tâche. Seuls son responsable et l&apos;administrateur peuvent la
          modifier.
        </p>
      )}
      <FormError message={error} />
      {saved && (
        <p
          role="status"
          className="bg-t-impact-bg text-t-impact-fg rounded-lg px-3 py-2.5 text-sm font-medium"
        >
          Tâche enregistrée.
        </p>
      )}
      <fieldset disabled={!canEdit || pending} className="space-y-4 disabled:opacity-90">
        <TextField
          label="Titre"
          required
          maxLength={200}
          error={errors.titre?.message}
          {...register("titre")}
        />
        <TextArea
          label="Description"
          rows={4}
          error={errors.description?.message}
          {...register("description")}
        />
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Responsable"
            disabled={!me.isAdmin || !canEdit || pending}
            hint={me.isAdmin ? undefined : "Tu ne peux créer des tâches que pour toi."}
            error={errors.responsable_id?.message}
            {...register("responsable_id")}
          >
            <option value="">Sans responsable</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Échéance"
            type="date"
            error={errors.echeance?.message}
            {...register("echeance")}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Priorité" error={errors.priorite?.message} {...register("priorite")}>
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {TASK_PRIORITY_LABEL[p]}
              </option>
            ))}
          </SelectField>
          <SelectField label="Statut" error={errors.statut?.message} {...register("statut")}>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS_LABEL[s]}
              </option>
            ))}
          </SelectField>
        </div>
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
      </fieldset>
      <div className="bg-canvas/95 border-line sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-2 border-t px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        {canEdit && (
          <Button type="submit" loading={pending}>
            {mode === "new" ? "Ajouter la tâche" : "Enregistrer"}
          </Button>
        )}
        <Button variant="ghost" onClick={() => router.push(closeHref, { scroll: false })}>
          {canEdit ? "Annuler" : "Fermer"}
        </Button>
        {mode === "edit" && canDelete && (
          <span className="ml-auto">
            {confirmDelete ? (
              <Button
                variant="danger"
                loading={pending}
                onClick={() =>
                  start(async () => {
                    const res = await deleteTask(taskId!);
                    if (res.ok) router.push(closeHref, { scroll: false });
                    else setError(res.error);
                  })
                }
              >
                Confirmer la suppression
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
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
