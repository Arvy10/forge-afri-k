"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pin, PinOff, Trash2 } from "lucide-react";
import { deleteInfo, updateInfo } from "@/actions/infos";
import { Markdown } from "@/components/guide/Markdown";
import { Notice } from "@/components/ui/Notice";
import { formatDateTime } from "@/lib/dates";
import type { InfoRow } from "@/lib/database.types";
import { cn } from "@/lib/cn";
import { InfoDialog } from "./InfoDialog";

/** Une info : titre, date de mise à jour, texte ; outils d'édition pour l'administrateur. */
export function InfoCard({ info, isAdmin }: { info: InfoRow; isAdmin: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();

  return (
    <article
      className={cn(
        "bg-surface border-line shadow-card rounded-2xl border p-4 md:p-5",
        info.epingle && "border-accent/50",
      )}
    >
      <header className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-display flex items-center gap-2 text-lg font-bold">
            {info.epingle && (
              <Pin aria-label="Épinglée" className="text-accent-strong size-4 shrink-0" />
            )}
            {info.titre}
          </h2>
          <p className="text-ink-muted text-xs">Mis à jour le {formatDateTime(info.updated_at)}</p>
        </div>
      </header>
      {info.contenu && <Markdown>{info.contenu}</Markdown>}

      {isAdmin && (
        <div className="border-line mt-3 flex flex-wrap items-center gap-1 border-t pt-2">
          <Notice message={error} onClose={() => setError(null)} />
          <InfoDialog info={info} />
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await updateInfo({
                  id: info.id,
                  titre: info.titre,
                  contenu: info.contenu,
                  epingle: !info.epingle,
                });
                if (!res.ok) return setError(res.error);
                router.refresh();
              })
            }
            className="text-ink-muted hover:text-ink hover:bg-surface-2 inline-flex min-h-12 items-center gap-1.5 rounded-lg px-3 text-sm font-medium"
          >
            {info.epingle ? (
              <PinOff aria-hidden className="size-4" />
            ) : (
              <Pin aria-hidden className="size-4" />
            )}
            {info.epingle ? "Désépingler" : "Épingler"}
          </button>
          <span className="ml-auto">
            {confirm ? (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await deleteInfo(info.id);
                    if (!res.ok) return setError(res.error);
                    router.refresh();
                  })
                }
                className="bg-danger text-canvas inline-flex min-h-12 items-center rounded-lg px-4 text-sm font-semibold"
              >
                Confirmer la suppression
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirm(true)}
                className="text-ink-muted hover:text-danger inline-flex min-h-12 items-center gap-1.5 rounded-lg px-3 text-sm font-medium"
              >
                <Trash2 aria-hidden className="size-4" />
                Supprimer
              </button>
            )}
          </span>
        </div>
      )}
    </article>
  );
}
