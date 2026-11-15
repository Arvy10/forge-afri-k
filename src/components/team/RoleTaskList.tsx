"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, ListPlus, Plus } from "lucide-react";
import { addRoleTasks } from "@/actions/role-tasks";
import { cn } from "@/lib/cn";
import type { RoleTaskRow } from "@/lib/database.types";

/** Tâches habituelles d'un rôle. Avec `target`, chaque tâche peut être ajoutée en un clic aux tâches de la personne. */
export function RoleTaskList({
  title,
  tasks,
  target,
}: {
  title: string;
  tasks: RoleTaskRow[];
  /** Personne à qui ajouter les tâches ; absent = affichage seul. */
  target?: { memberId: string | null; label: string };
}) {
  const router = useRouter();
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, start] = useTransition();
  if (tasks.length === 0) return null;

  const add = (ids: string[]) =>
    start(async () => {
      setMsg(null);
      const res = await addRoleTasks(ids, target?.memberId ?? undefined);
      if (!res.ok) return setMsg({ text: res.error, ok: false });
      setAdded((prev) => new Set([...prev, ...ids]));
      const { added: n = 0, skipped = 0 } = res.data ?? {};
      setMsg({
        ok: true,
        text:
          n === 0
            ? `Déjà dans les tâches ${target?.label ?? ""}.`.replace("  ", " ")
            : `${n} tâche${n > 1 ? "s" : ""} ajoutée${n > 1 ? "s" : ""}${skipped ? ` (${skipped} déjà présente${skipped > 1 ? "s" : ""})` : ""}.`,
      });
      router.refresh();
    });

  return (
    <details className="group border-line mt-3 border-t pt-2">
      <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-2 text-sm font-semibold">
        <span>
          {title} <span className="text-ink-muted font-normal">({tasks.length})</span>
        </span>
        <span aria-hidden className="text-ink-muted text-xs group-open:hidden">
          Voir
        </span>
      </summary>
      <ul className="mt-1 space-y-1">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center gap-2 text-sm">
            <span className="min-w-0 flex-1 py-1.5">{t.titre}</span>
            {target && (
              <button
                type="button"
                disabled={pending || added.has(t.id)}
                onClick={() => add([t.id])}
                aria-label={`Ajouter « ${t.titre} » aux tâches ${target.label}`}
                className={cn(
                  "inline-flex size-12 shrink-0 items-center justify-center rounded-lg",
                  added.has(t.id)
                    ? "text-forest"
                    : "text-accent-strong hover:bg-accent-soft disabled:opacity-50",
                )}
              >
                {added.has(t.id) ? (
                  <Check aria-hidden className="size-5" />
                ) : (
                  <Plus aria-hidden className="size-5" />
                )}
              </button>
            )}
          </li>
        ))}
      </ul>
      {target && (
        <div className="mt-1">
          <button
            type="button"
            disabled={pending}
            onClick={() => add(tasks.map((t) => t.id))}
            className="border-line-strong bg-canvas hover:bg-surface-2 inline-flex min-h-12 items-center gap-2 rounded-xl border px-4 text-sm font-semibold disabled:opacity-50"
          >
            <ListPlus aria-hidden className="size-4" />
            Tout ajouter aux tâches {target.label}
          </button>
        </div>
      )}
      {msg && (
        <p
          role={msg.ok ? "status" : "alert"}
          className={cn("mt-2 text-sm font-medium", msg.ok ? "text-forest" : "text-danger")}
        >
          {msg.text}
        </p>
      )}
    </details>
  );
}
