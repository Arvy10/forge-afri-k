import Link from "next/link";
import { Pin } from "lucide-react";
import { formatDateTime } from "@/lib/dates";
import type { InfoRow } from "@/lib/database.types";

/** Aperçu des dernières infos sur l'Accueil. */
export function InfoPreview({ infos, isAdmin }: { infos: InfoRow[]; isAdmin: boolean }) {
  if (infos.length === 0)
    return (
      <p className="text-ink-muted text-sm">
        Aucune info pour l&apos;instant.{" "}
        {isAdmin && (
          <Link
            href="/infos"
            className="text-accent-strong font-semibold underline underline-offset-4"
          >
            Publier une info
          </Link>
        )}
      </p>
    );
  return (
    <ul className="divide-line divide-y">
      {infos.map((i) => (
        <li key={i.id}>
          <Link href="/infos" className="block min-h-12 py-3">
            <span className="flex items-center gap-2 text-sm font-semibold">
              {i.epingle && (
                <Pin aria-label="Épinglée" className="text-accent-strong size-3.5 shrink-0" />
              )}
              {i.titre}
            </span>
            {i.contenu && (
              <span className="text-ink-muted mt-0.5 line-clamp-2 block text-sm">
                {i.contenu.replace(/[*_`#>-]/g, "")}
              </span>
            )}
            <span className="text-ink-muted mt-1 block text-xs">
              Mis à jour le {formatDateTime(i.updated_at)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
