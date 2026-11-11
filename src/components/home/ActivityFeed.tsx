import { Activity } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { activityText } from "@/lib/activity";
import { formatRelative } from "@/lib/dates";
import type { ActivityRow } from "@/lib/database.types";

/** Dernières activités de l'équipe (journal alimenté automatiquement). */
export function ActivityFeed({
  items,
  names,
}: {
  items: ActivityRow[];
  names: Map<string, string>;
}) {
  if (items.length === 0)
    return (
      <EmptyState
        compact
        illustration="chart"
        title="Rien pour l'instant"
        description="Les tâches terminées, les livrables et les relances apparaîtront ici."
      />
    );
  return (
    <ul className="divide-line divide-y">
      {items.map((a) => (
        <li key={a.id} className="flex items-start gap-3 py-3">
          <span className="bg-surface-2 text-ink-muted mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg">
            <Activity aria-hidden className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium break-words">{activityText(a, names)}</p>
            <p className="text-ink-muted text-xs">{formatRelative(a.created_at)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
