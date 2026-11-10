"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { setPassword } from "@/actions/auth";
import { Button } from "@/components/ui/Button";
import { FormError, TextField } from "@/components/ui/Field";
import { setPasswordSchema } from "@/lib/schemas";

export function SetPasswordForm({ firstTime }: { firstTime: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof setPasswordSchema>, unknown, z.output<typeof setPasswordSchema>>({
    resolver: zodResolver(setPasswordSchema),
  });

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((values) => {
        setError(null);
        start(async () => {
          const res = await setPassword(values);
          if (res && !res.ok) setError(res.error);
        });
      })}
    >
      <div>
        <h1 className="font-display text-2xl font-bold">
          {firstTime ? "Bienvenue à l'atelier" : "Nouveau mot de passe"}
        </h1>
        <p className="text-ink-muted mt-1 text-sm">
          Choisis un mot de passe d&apos;au moins 10 caractères.
        </p>
      </div>
      <FormError message={error} />
      <TextField
        label="Mot de passe"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <TextField
        label="Confirme le mot de passe"
        type="password"
        autoComplete="new-password"
        error={errors.confirm?.message}
        {...register("confirm")}
      />
      <Button type="submit" loading={pending} className="w-full">
        Enregistrer et continuer
      </Button>
    </form>
  );
}
