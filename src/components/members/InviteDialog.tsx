"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailPlus, X } from "lucide-react";
import type { z } from "zod";
import { inviteMember } from "@/actions/members";
import { Button, buttonClass } from "@/components/ui/Button";
import { FormError, SelectField, TextField } from "@/components/ui/Field";
import type { RoleRow } from "@/lib/database.types";
import { inviteSchema } from "@/lib/schemas";

type Input = z.input<typeof inviteSchema>;

export function InviteDialog({ roles }: { roles: RoleRow[] }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    setError: setFieldError,
    formState: { errors },
  } = useForm<Input, unknown, z.output<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", full_name: "", access_role: "member", role_ids: [] },
  });

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setDone(null);
          setError(null);
          reset();
        }
      }}
    >
      <Dialog.Trigger className={buttonClass("primary")}>
        <MailPlus aria-hidden className="size-4" />
        Inviter un membre
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="rx-overlay fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content
          aria-describedby="invite-desc"
          className="rx-dialog bg-canvas fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-2xl p-5 shadow-2xl md:inset-auto md:top-1/2 md:left-1/2 md:w-[34rem] md:max-w-[92vw] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <Dialog.Title className="font-display text-xl font-bold">
              Inviter un membre
            </Dialog.Title>
            <Dialog.Close
              className="hover:bg-surface-2 -mt-1 -mr-2 inline-flex size-11 items-center justify-center rounded-lg"
              aria-label="Fermer"
            >
              <X aria-hidden className="size-5" />
            </Dialog.Close>
          </div>
          {done ? (
            <div className="space-y-4" role="status">
              <p className="bg-t-impact-bg text-t-impact-fg rounded-lg px-3 py-3 text-sm font-medium">
                Invitation envoyée à {done}. La personne définira son mot de passe puis complétera
                son profil.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setDone(null);
                    reset();
                  }}
                >
                  Inviter quelqu&apos;un d&apos;autre
                </Button>
                <Dialog.Close className={buttonClass("ghost")}>Fermer</Dialog.Close>
              </div>
            </div>
          ) : (
            <form
              noValidate
              className="space-y-4"
              onSubmit={handleSubmit((values) => {
                setError(null);
                start(async () => {
                  const res = await inviteMember(values);
                  if (res.ok) setDone(values.email);
                  else {
                    setError(res.error);
                    for (const [k, m] of Object.entries(res.fieldErrors ?? {}))
                      setFieldError(k as keyof Input, { message: m });
                  }
                });
              })}
            >
              <p id="invite-desc" className="text-ink-muted text-sm">
                Un e-mail avec un lien personnel est envoyé. Il n&apos;y a pas d&apos;inscription
                publique.
              </p>
              <FormError message={error} />
              <TextField
                label="Adresse e-mail"
                type="email"
                required
                inputMode="email"
                autoComplete="off"
                error={errors.email?.message}
                {...register("email")}
              />
              <TextField
                label="Nom (facultatif)"
                autoComplete="off"
                error={errors.full_name?.message}
                {...register("full_name")}
              />
              <SelectField
                label="Niveau d'accès"
                hint="Un administrateur peut tout modifier et inviter d'autres membres."
                {...register("access_role")}
              >
                <option value="member">Membre</option>
                <option value="admin">Administrateur</option>
              </SelectField>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Rôle(s) dans le pôle</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {roles.map((r) => (
                    <label
                      key={r.id}
                      className="border-line-strong bg-surface has-[:checked]:border-accent-strong has-[:checked]:bg-accent-soft flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        value={r.id}
                        className="accent-accent-strong size-5"
                        {...register("role_ids")}
                      />
                      {r.name}
                    </label>
                  ))}
                </div>
              </fieldset>
              <Button type="submit" loading={pending} className="w-full sm:w-auto">
                Envoyer l&apos;invitation
              </Button>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
