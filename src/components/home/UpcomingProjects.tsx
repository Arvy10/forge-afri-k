import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { MilestoneRow } from "@/lib/database.types";

/** Mini frise des prochains jalons ; le Summit est toujours le dernier. */
export function UpcomingProjects({ milestones }: { milestones: MilestoneRow[] }) {
  return (
    <>
      <ol className="space-y-0">
        {milestones.map((m, i) => (
          <li key={m.id} className="relative flex gap-3 pb-4 last:pb-0">
            {i < milestones.length - 1 && (
              <span
                aria-hidden
                className="bg-line-strong absolute top-6 bottom-0 left-[11px] w-0.5"
              />
            )}
            <span
              aria-hidden
              className={cn(
                "relative mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                m.statut === "realise"
                  ? "border-success bg-success text-canvas"
                  : i === milestones.length - 1
                    ? "border-accent bg-accent-soft"
                    : "border-line-strong bg-surface",
              )}
            >
              {m.statut === "realise" && <Check className="size-3.5" strokeWidth={3} />}
            </span>
            <div className="min-w-0">
              <p className="text-ink-muted text-xs font-semibold">{m.periode}</p>
              <p className="text-sm font-semibold">{m.titre}</p>
              <p className="text-ink-muted text-xs">{m.description}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="text-ink-muted mt-3 text-xs italic">
        Objectifs de travail, pas des dates définitivement arrêtées.
      </p>
    </>
  );
}
