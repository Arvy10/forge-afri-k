import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { WeekInfo } from "@/lib/calendar";
import { cn } from "@/lib/cn";
import { formatDateShort } from "@/lib/dates";

const arrow =
  "border-line-strong bg-surface hover:bg-surface-2 inline-flex size-12 shrink-0 items-center justify-center rounded-xl border";

/** Sélecteur de semaine : flèches et pastilles « Semaine 1, 2, 3… » avec leurs dates. */
export function WeekNav({ weeks, current }: { weeks: WeekInfo[]; current: WeekInfo }) {
  const i = weeks.findIndex((w) => w.semaine === current.semaine);
  const prev = weeks[i - 1];
  const next = weeks[i + 1];
  return (
    <nav aria-label="Choisir la semaine" className="flex items-center gap-2">
      {prev ? (
        <Link
          href={`/calendrier?semaine=${prev.semaine}`}
          aria-label="Semaine précédente"
          className={arrow}
        >
          <ChevronLeft aria-hidden className="size-5" />
        </Link>
      ) : (
        <span aria-hidden className={cn(arrow, "opacity-40")}>
          <ChevronLeft className="size-5" />
        </span>
      )}
      <ul className="scroll-thin flex min-w-0 flex-1 gap-2 overflow-x-auto py-1">
        {weeks.map((w) => {
          const active = w.semaine === current.semaine;
          return (
            <li key={w.semaine} className="shrink-0">
              <Link
                href={`/calendrier?semaine=${w.semaine}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-12 flex-col justify-center rounded-xl border px-4 py-1 text-base leading-tight",
                  active
                    ? "bg-forest text-on-forest border-transparent font-bold"
                    : "border-line-strong bg-surface hover:bg-surface-2",
                )}
              >
                <span className="font-semibold">Semaine {w.semaine}</span>
                <span className={cn("text-sm", active ? "text-on-forest/80" : "text-ink-muted")}>
                  {formatDateShort(w.from)} – {formatDateShort(w.to)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {next ? (
        <Link
          href={`/calendrier?semaine=${next.semaine}`}
          aria-label="Semaine suivante"
          className={arrow}
        >
          <ChevronRight aria-hidden className="size-5" />
        </Link>
      ) : (
        <span aria-hidden className={cn(arrow, "opacity-40")}>
          <ChevronRight className="size-5" />
        </span>
      )}
    </nav>
  );
}
