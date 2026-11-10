"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createTask } from "@/actions/tasks";
import { Button } from "@/components/ui/Button";

/** Création en une ligne : tape un titre, Entrée. Le reste se précise ensuite si besoin. */
export function QuickAdd({ moreHref }: { moreHref: string }) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLInputElement>(null);

  return (
    <form
      className="mb-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await createTask({ titre: title });
          if (res.ok) {
            setTitle("");
            ref.current?.focus();
          } else setError(res.fieldErrors?.titre ?? res.error);
        });
      }}
    >
      <div className="flex gap-2">
        <label htmlFor="quick-title" className="sr-only">
          Nouvelle tâche
        </label>
        <input
          id="quick-title"
          ref={ref}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nouvelle tâche… puis Entrée"
          maxLength={200}
          autoComplete="off"
          className="border-line-strong bg-surface min-h-11 min-w-0 flex-1 rounded-lg border px-3 text-base md:text-sm"
        />
        <Button type="submit" loading={pending} disabled={title.trim() === ""}>
          <Plus aria-hidden className="size-4" />
          <span className="max-sm:sr-only">Ajouter</span>
        </Button>
      </div>
      <p className="text-ink-muted mt-1.5 text-xs">
        Elle t&apos;est assignée, priorité normale.{" "}
        <Link href={moreHref} scroll={false} className="text-accent-strong font-medium underline underline-offset-4">
          Plus d&apos;options
        </Link>
      </p>
      {error && (
        <p role="alert" className="text-danger mt-1 text-sm font-medium">
          {error}
        </p>
      )}
    </form>
  );
}
