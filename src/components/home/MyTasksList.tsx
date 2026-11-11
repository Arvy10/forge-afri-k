"use client";

import Link from "next/link";
import { CalendarDays, Check, TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { cn } from "@/lib/cn";
import { formatDueLabel } from "@/lib/dates";
import type { TaskRow } from "@/lib/database.types";
import { isLate } from "@/lib/progress";
import { useTaskMutations } from "@/components/tasks/useTaskMutations";

/** Mes tâches ouvertes sur l'accueil : la case se coche d'un geste (mise à jour immédiate). */
export function MyTasksList({ tasks, today }: { tasks: TaskRow[]; today: string }) {
  const m = useTaskMutations(tasks);
  const open = m.tasks.filter((t) => t.statut !== "fait");

  if (open.length === 0)
    return (
      <>
        <Notice message={m.error} onClose={m.clearError} />
        <EmptyState
          compact
          illustration="tasks"
          title="Tout est à jour"
          description="Aucune tâche ouverte pour toi."
          action={
            <Link
              href="/mon-espace"
              className="border-line-strong bg-surface hover:bg-surface-2 inline-flex min-h-12 items-center rounded-lg border px-4 text-sm font-semibold"
            >
              Mon espace
            </Link>
          }
        />
      </>
    );

  return (
    <>
      <Notice message={m.error} onClose={m.clearError} />
      <ul className="divide-line divide-y">
        {open.map((t) => {
          const late = isLate(t, today);
          return (
            <li key={t.id} className="flex items-center gap-1">
              <button
                type="button"
                role="checkbox"
                aria-checked={false}
                aria-label={`Marquer comme faite : ${t.titre}`}
                onClick={() => m.setStatus(t.id, "fait")}
                className="-ml-2 inline-flex size-12 shrink-0 items-center justify-center"
              >
                <span className="border-line-strong bg-canvas hover:border-accent-strong inline-flex size-7 items-center justify-center rounded-lg border-2">
                  <Check
                    aria-hidden
                    className="text-accent-strong size-4 opacity-0 hover:opacity-60"
                    strokeWidth={3.5}
                  />
                </span>
              </button>
              <Link href="/mon-espace" className="min-h-12 min-w-0 flex-1 py-2">
                <span className="block truncate text-sm font-semibold">{t.titre}</span>
                <span
                  className={cn(
                    "flex items-center gap-1.5 text-xs",
                    late ? "text-accent-strong font-semibold" : "text-ink-muted",
                  )}
                >
                  {late ? (
                    <TriangleAlert aria-hidden className="size-3" />
                  ) : (
                    <CalendarDays aria-hidden className="size-3" />
                  )}
                  {t.echeance
                    ? `${late ? "En retard · " : ""}${formatDueLabel(t.echeance, today)}`
                    : "Sans échéance"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
