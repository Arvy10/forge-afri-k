import Link from "next/link";
import { StatusPill } from "@/components/ui/StatusPill";
import { TypePill } from "@/components/ui/TypePill";
import { splitSlots, type DayWithSlots } from "@/lib/calendar";
import { cn } from "@/lib/cn";
import { formatDateShort, formatTime } from "@/lib/dates";

/** « Cette semaine » : les jours avec leur type, le titre du post obligatoire et son heure. */
export function WeekStrip({ days, today }: { days: DayWithSlots[]; today: string }) {
  return (
    <ul className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {days.map((day) => {
        const { main } = splitSlots(day);
        const isToday = day.date === today;
        return (
          <li key={day.id} className="min-w-0">
            <Link
              href={`/calendrier/${day.date}`}
              className={cn(
                "lift bg-surface border-line shadow-card flex h-full min-h-12 flex-col gap-2 rounded-2xl border p-4",
                isToday && "ring-accent-strong ring-2",
              )}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-display text-lg font-bold">{day.jour}</span>
                <span className="text-ink-muted text-sm">{formatDateShort(day.date)}</span>
              </span>
              <span className="flex flex-wrap items-center gap-1.5">
                <TypePill type={day.type_de_contenu} compact className="text-sm" />
                {isToday && (
                  <span className="bg-forest text-on-forest rounded-full px-2.5 py-0.5 text-sm font-bold">
                    Aujourd&apos;hui
                  </span>
                )}
              </span>
              {main ? (
                <>
                  <span className="text-base leading-snug font-semibold">{main.titre}</span>
                  <span className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
                    <time className="font-display text-lg font-bold tabular-nums">
                      {formatTime(main.heure)}
                    </time>
                    <StatusPill status={main.statut} className="text-sm" />
                  </span>
                </>
              ) : (
                <span className="text-ink-muted text-base">Pas de post obligatoire</span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
