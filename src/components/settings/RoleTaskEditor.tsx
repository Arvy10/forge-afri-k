"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { createRoleTask, deleteRoleTask } from "@/actions/role-tasks";
import { FormError } from "@/components/ui/Field";
import type { RoleRow, RoleTaskRow } from "@/lib/database.types";

/** Administrateur : tâches habituelles d'un rôle (ajouter, retirer). */
export function RoleTaskEditor({ role, tasks }: { role: RoleRow; tasks: RoleTaskRow[] }) {
  const router = useRouter();
  const [titre, setTitre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const id = `rt-${role.id}`;

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) return setError(res.error ?? "Impossible de modifier.");
      after?.();
      router.refresh();
    });

  return (
    <details className="border-line bg-surface rounded-2xl border px-4">
      <summary className="flex min-h-12 cursor-pointer items-center text-sm font-semibold">
        Tâches habituelles de « {role.nom} » ({tasks.length})
      </summary>
      <div className="space-y-2 pb-4">
        <FormError message={error} />
        <ul className="space-y-1">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 py-1.5">{t.titre}</span>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => deleteRoleTask(t.id))}
                aria-label={`Retirer « ${t.titre} »`}
                className="text-ink-muted hover:text-danger inline-flex size-12 shrink-0 items-center justify-center rounded-lg"
              >
                <X aria-hidden className="size-4" />
              </button>
            </li>
          ))}
          {tasks.length === 0 && (
            <li className="text-ink-muted text-sm">Aucune tâche habituelle pour ce rôle.</li>
          )}
        </ul>
        <div className="flex gap-2">
          <label htmlFor={id} className="sr-only">
            Nouvelle tâche habituelle
          </label>
          <input
            id={id}
            value={titre}
            maxLength={200}
            onChange={(e) => setTitre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && titre.trim()) {
                e.preventDefault();
                run(
                  () => createRoleTask(role.id, titre),
                  () => setTitre(""),
                );
              }
            }}
            placeholder="Ajouter une tâche (sans heure ni nom)"
            className="border-line-strong bg-canvas min-h-12 min-w-0 flex-1 rounded-xl border px-3 text-base"
          />
          <button
            type="button"
            disabled={pending || titre.trim() === ""}
            onClick={() =>
              run(
                () => createRoleTask(role.id, titre),
                () => setTitre(""),
              )
            }
            className="bg-accent-strong text-on-accent inline-flex min-h-12 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold disabled:opacity-50"
          >
            <Plus aria-hidden className="size-4" />
            Ajouter
          </button>
        </div>
      </div>
    </details>
  );
}
