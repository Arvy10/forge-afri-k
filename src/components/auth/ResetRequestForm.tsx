"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { requestPasswordReset } from "@/actions/auth";
import { Button } from "@/components/ui/Button";
import { FormError, TextField } from "@/components/ui/Field";
import { resetRequestSchema } from "@/lib/schemas";

export function ResetRequestForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof resetRequestSchema>, unknown, z.output<typeof resetRequestSchema>>({
    resolver: zodResolver(resetRequestSchema),
  });

  if (sent)
    return (
      <div className="space-y-4" role="status">
        <h1 className="font-display text-2xl font-bold">Vérifie ta boîte mail</h1>
        <p className="text-ink-muted text-sm">
          Si cette adresse correspond à un compte, un lien pour choisir un nouveau mot de passe
          vient d&apos;être envoyé.
        </p>
        <Link
          href="/connexion"
          className="text-accent-strong text-sm font-medium underline underline-offset-4"
        >
          Retour à la connexion
        </Link>
      </div>
    );

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((values) => {
        setError(null);
        start(async () => {
          const res = await requestPasswordReset(values);
          if (res.ok) setSent(true);
          else setError(res.error);
        });
      })}
    >
      <div>
        <h1 className="font-display text-2xl font-bold">Mot de passe oublié</h1>
        <p className="text-ink-muted mt-1 text-sm">
          Entre ton adresse : on t&apos;envoie un lien pour en choisir un nouveau.
        </p>
      </div>
      <FormError message={error} />
      <TextField
        label="Adresse e-mail"
        type="email"
        autoComplete="email"
        inputMode="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <Button type="submit" loading={pending} className="w-full">
        Envoyer le lien
      </Button>
      <p className="text-center text-sm">
        <Link
          href="/connexion"
          className="text-accent-strong font-medium underline underline-offset-4"
        >
          Retour à la connexion
        </Link>
      </p>
    </form>
  );
}
