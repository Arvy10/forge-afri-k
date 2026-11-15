"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ListChecks, X } from "lucide-react";
import { setMyRoles } from "@/actions/members";
import { Button, buttonClass } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import type { RoleRow } from "@/lib/database.types";
import { flattenRoles } from "@/lib/roles";

/** « Choisir mes rôles » : chacun coche les tâches qui l'intéressent ; plusieurs personnes peuvent partager un rôle. */
export function MyRolesPicker({
  roles,
  mine,
  holders,
}: {
  roles: RoleRow[];
  mine: string[];
  /** Nombre de personnes qui portent déjà chaque rôle. */
  holders: Record<string, number>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<Set<string>>(new Set(mine));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const toggle = (id: string) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setChosen(new Set(mine));
          setError(null);
        }
      }}
    >
      <Dialog.Trigger className={buttonClass("secondary", "min-h-12")}>
        <ListChecks aria-hidden className="size-4" />
        {mine.length > 0 ? "Modifier mes rôles" : "Choisir mes rôles"}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="rx-overlay fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content
          aria-describedby="roles-desc"
          className="rx-dialog bg-canvas fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-2xl p-5 shadow-2xl md:inset-auto md:top-1/2 md:left-1/2 md:w-[36rem] md:max-w-[92vw] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <Dialog.Title className="font-display text-xl font-bold">Mes rôles</Dialog.Title>
            <Dialog.Close
              className="hover:bg-surface-2 -mt-1 -mr-2 inline-flex size-12 items-center justify-center rounded-lg"
              aria-label="Fermer"
            >
              <X aria-hidden className="size-5" />
            </Dialog.Close>
          </div>
          <p id="roles-desc" className="text-ink-muted mb-4 text-sm">
            Coche les tâches qui t&apos;intéressent et qui correspondent à tes compétences et à tes
            disponibilités. Si plusieurs personnes choisissent la même, vous travaillez ensemble.
          </p>
          <FormError message={error} />
          <ul className="space-y-2">
            {flattenRoles(roles).map(({ role: r, depth }) => (
              <li key={r.id} className={depth === 1 ? "ml-5" : undefined}>
                <label className="border-line-strong bg-surface has-[:checked]:border-accent-strong has-[:checked]:bg-accent-soft flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2">
                  <input
                    type="checkbox"
                    checked={chosen.has(r.id)}
                    onChange={() => toggle(r.id)}
                    className="accent-accent-strong size-5 shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className={depth === 0 ? "block text-sm font-semibold" : "block text-sm"}>
                      {r.nom}
                    </span>
                    {depth === 0 && r.mission && (
                      <span className="text-ink-muted block text-xs">{r.mission}</span>
                    )}
                  </span>
                  {(holders[r.id] ?? 0) > 0 && (
                    <span className="text-ink-muted shrink-0 text-xs">
                      {holders[r.id]} {holders[r.id]! > 1 ? "personnes" : "personne"}
                    </span>
                  )}
                </label>
              </li>
            ))}
          </ul>
          <div className="bg-canvas sticky bottom-0 -mx-5 mt-4 flex gap-2 px-5 pt-2 pb-1">
            <Button
              className="min-h-12 flex-1"
              loading={pending}
              onClick={() =>
                start(async () => {
                  const res = await setMyRoles([...chosen]);
                  if (!res.ok) return setError(res.error);
                  setOpen(false);
                  router.refresh();
                })
              }
            >
              Enregistrer mes rôles
            </Button>
            <Button variant="ghost" className="min-h-12" onClick={() => setOpen(false)}>
              Annuler
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
