"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "@/actions/auth";
import { Button } from "@/components/ui/Button";
import { FormError, TextField } from "@/components/ui/Field";
import { loginSchema } from "@/lib/schemas";
import type { z } from "zod";

type Values = z.input<typeof loginSchema>;

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values, unknown, z.output<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = handleSubmit((values) => {
    setError(null);
    start(async () => {
      const res = await signIn(values, next);
      if (res && !res.ok) setError(res.error);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Connexion</h1>
        <p className="text-ink-muted mt-1 text-sm">Content de te revoir à l&apos;atelier.</p>
      </div>
      {notice && (
        <p role="status" className="bg-accent-soft text-ink rounded-lg px-3 py-2.5 text-sm">
          {notice}
        </p>
      )}
      <FormError message={error} />
      <TextField
        label="Adresse e-mail"
        type="email"
        autoComplete="email"
        inputMode="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <TextField
        label="Mot de passe"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <Button type="submit" loading={pending} className="w-full">
        {pending ? "Connexion…" : "Se connecter"}
      </Button>
      <p className="text-center text-sm">
        <Link
          href="/mot-de-passe-oublie"
          className="text-accent-strong font-medium underline underline-offset-4"
        >
          Mot de passe oublié ?
        </Link>
      </p>
    </form>
  );
}
