"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { Check, Flame, TriangleAlert } from "lucide-react";
import { setTaskStatus } from "@/actions/tasks";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { cn } from "@/lib/cn";
import { formatDateShort } from "@/lib/dates";
import type { TaskRow } from "@/lib/database.types";

/** Mes tâches ouvertes : la case se coche d'un geste (mise à jour immédiate). */
export function MyTasks({ tasks, today }: { tasks: TaskRow[]; today: string }) {
  const [optimistic, markDone] = useOptimistic(tasks, (state: TaskRow[], id: string) =>
    state.filter((t) => t.id !== id),
  );
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  if (optimistic.length === 0)
    return (
      <EmptyState
        compact
        illustration="tasks"
        title="Tout est à jour"
        description="Aucune tâche ouverte pour toi."
        action={
          <Link
            href="/taches?nouvelle=1"
            className="border-line-strong bg-surface hover:bg-surface-2 inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-semibold"
          >
            Ajouter une tâche
          </Link>
        }
      />
    );

  return (
    <>
      <Notice message={error} onClose={() => setError(null)} />
      <ul className="divide-line divide-y">
        {optimistic.map((t) => {
          const late = !!t.echeance && t.echeance < today;
          return (
            <li key={t.id} className="flex items-center gap-1">
              <button
                type="button"
                role="checkbox"
                aria-checked={false}
                aria-label={`Terminer : ${t.titre}`}
                className="group -ml-2 inline-flex size-11 shrink-0 items-center justify-center"
                onClick={() => {
                  setError(null);
                  start(async () => {
                    markDone(t.id);
                    const res = await setTaskStatus({ id: t.id, statut: "valide" });
                    if (!res.ok) setError(res.error);
                  });
                }}
              >
                <span className="border-line-strong bg-surface group-hover:border-accent-strong inline-flex size-6 items-center justify-center rounded-md border-2">
                  <Check
                    aria-hidden
                    className="text-accent-strong size-4 opacity-0 group-hover:opacity-60"
                    strokeWidth={3}
                  />
                </span>
              </button>
              <Link href={`/taches?tache=${t.id}`} className="min-h-11 min-w-0 flex-1 py-2">
                <span className="block truncate text-sm font-medium">{t.titre}</span>
                <span
                  className={cn(
                    "flex items-center gap-1.5 text-xs",
                    late ? "text-accent-strong font-semibold" : "text-ink-muted",
                  )}
                >
                  {late && <TriangleAlert aria-hidden className="size-3" />}
                  {t.echeance
                    ? `${late ? "En retard · " : "Pour le "}${formatDateShort(t.echeance)}`
                    : "Sans échéance"}
                  {t.priorite === "haute" && (
                    <span className="text-danger ml-1 inline-flex items-center gap-0.5 font-semibold">
                      <Flame aria-hidden className="size-3" />
                      Haute
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
