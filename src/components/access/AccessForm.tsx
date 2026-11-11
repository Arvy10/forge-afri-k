"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { submitAccessCode } from "@/actions/access";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";

/** Écran 1 : un seul champ, un seul bouton. */
export function AccessForm({ suite }: { suite?: string }) {
  const [code, setCode] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await submitAccessCode({ code, suite });
          // En cas de succès le serveur redirige ; on ne revient ici que sur une erreur.
          if (res && !res.ok) setError(res.fieldErrors?.code ?? res.error);
        });
      }}
    >
      <div>
        <h1 className="font-display text-2xl font-bold">Bienvenue dans l&apos;atelier</h1>
        <p className="text-ink-muted mt-1 text-sm">
          Entre le code d&apos;accès du pôle pour continuer.
        </p>
      </div>
      <FormError message={error} />
      <div className="space-y-1.5">
        <label htmlFor="code" className="text-sm font-medium">
          Code d&apos;accès du pôle
        </label>
        <div className="relative">
          <KeyRound
            aria-hidden
            className="text-ink-muted pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2"
          />
          <input
            id="code"
            name="code"
            type={visible ? "text" : "password"}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            autoFocus
            aria-invalid={!!error}
            className="border-line-strong bg-surface min-h-14 w-full rounded-xl border pr-14 pl-12 text-lg tracking-wide"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Masquer le code" : "Afficher le code"}
            className="text-ink-muted hover:text-ink absolute top-1/2 right-1 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-lg"
          >
            {visible ? (
              <EyeOff aria-hidden className="size-5" />
            ) : (
              <Eye aria-hidden className="size-5" />
            )}
          </button>
        </div>
      </div>
      <Button
        type="submit"
        loading={pending}
        disabled={code.trim() === ""}
        className="min-h-14 w-full text-base"
      >
        Entrer
      </Button>
    </form>
  );
}
