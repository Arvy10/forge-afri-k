"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, X } from "lucide-react";
import type { z } from "zod";
import { saveProject } from "@/actions/content";
import { Button, buttonClass } from "@/components/ui/Button";
import { FormError, SelectField, TextArea, TextField } from "@/components/ui/Field";
import { PROJECT_STATUSES, PROJECT_STATUS_LABEL } from "@/lib/constants";
import type { ProjectRow } from "@/lib/database.types";
import { projectSchema } from "@/lib/schemas";

type Input = z.input<typeof projectSchema>;

export function ProjectEditor({ project }: { project: ProjectRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors },
  } = useForm<Input, unknown, z.output<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      id: project.id,
      titre: project.titre,
      statut: project.statut,
      description: project.description,
      prudence: project.prudence,
      pole_pilote: project.pole_pilote,
      date_label: project.date_label,
    },
  });

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className={buttonClass("ghost")} aria-label={`Modifier ${project.titre}`}>
        <Pencil aria-hidden className="size-4" />
        Modifier
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="rx-overlay fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="rx-dialog bg-canvas fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-2xl p-5 shadow-2xl md:inset-auto md:top-1/2 md:left-1/2 md:w-[36rem] md:max-w-[92vw] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <Dialog.Title className="font-display text-xl font-bold">
              Modifier le projet
            </Dialog.Title>
            <Dialog.Close
              className="hover:bg-surface-2 -mt-1 -mr-2 inline-flex size-11 items-center justify-center rounded-lg"
              aria-label="Fermer"
            >
              <X aria-hidden className="size-5" />
            </Dialog.Close>
          </div>
          <form
            noValidate
            className="space-y-4"
            onSubmit={handleSubmit((values) => {
              setError(null);
              start(async () => {
                const res = await saveProject(values);
                if (res.ok) {
                  setOpen(false);
                  router.refresh();
                } else {
                  setError(res.error);
                  for (const [k, m] of Object.entries(res.fieldErrors ?? {}))
                    setFieldError(k as keyof Input, { message: m });
                }
              });
            })}
          >
            <FormError message={error} />
            <input type="hidden" {...register("id")} />
            <TextField
              label="Titre"
              required
              error={errors.titre?.message}
              {...register("titre")}
            />
            <SelectField label="Statut" error={errors.statut?.message} {...register("statut")}>
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PROJECT_STATUS_LABEL[s]}
                </option>
              ))}
            </SelectField>
            <TextArea
              label="Description"
              rows={3}
              error={errors.description?.message}
              {...register("description")}
            />
            <TextArea
              label="Note de prudence"
              rows={3}
              hint="Ce qu'il ne faut pas annoncer ou promettre."
              error={errors.prudence?.message}
              {...register("prudence")}
            />
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Pôle pilote"
                error={errors.pole_pilote?.message}
                {...register("pole_pilote")}
              />
              <TextField
                label="Date annoncée"
                placeholder="ex. 22 et 23 mai 2027"
                error={errors.date_label?.message}
                {...register("date_label")}
              />
            </div>
            <Button type="submit" loading={pending}>
              Enregistrer
            </Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
