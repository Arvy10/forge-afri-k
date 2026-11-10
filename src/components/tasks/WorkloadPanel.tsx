import { Scale } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import type { PersonLite } from "@/lib/data";

export type Workload = { id: string; open: number; late: number; high: number };

/** Charge de chaque membre (administrateur) : tâches ouvertes, en retard, en priorité haute. */
export function WorkloadPanel({ people, load }: { people: PersonLite[]; load: Workload[] }) {
  const byId = new Map(load.map((l) => [l.id, l]));
  const max = Math.max(1, ...load.map((l) => l.open));
  return (
    <details className="bg-surface border-line mb-5 rounded-2xl border">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        <Scale aria-hidden className="size-4" />
        Charge de l&apos;équipe
      </summary>
      <ul className="space-y-3 px-4 pt-1 pb-4">
        {people.map((p) => {
          const l = byId.get(p.id) ?? { id: p.id, open: 0, late: 0, high: 0 };
          return (
            <li key={p.id} className="flex items-center gap-3">
              <Avatar name={p.name} src={p.avatar_url} id={p.id} size="sm" />
              <span className="w-28 shrink-0 truncate text-sm font-medium sm:w-40">{p.name}</span>
              <span
                className="bg-surface-2 h-3 min-w-0 flex-1 overflow-hidden rounded-full"
                role="img"
                aria-label={`${l.open} tâches ouvertes`}
              >
                <span
                  className="bg-forest block h-full rounded-full"
                  style={{ width: `${(l.open / max) * 100}%` }}
                />
              </span>
              <span className="w-28 shrink-0 text-right text-xs tabular-nums">
                {l.open} ouverte{l.open > 1 ? "s" : ""}
                {l.late > 0 && (
                  <span className="text-accent-strong block font-semibold">{l.late} en retard</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
