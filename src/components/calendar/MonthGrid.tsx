import Link from "next/link";
import { Plus } from "lucide-react";
import { TYPE_CLASSES } from "@/components/ui/TypePill";
import { CONTENT_TYPE_META } from "@/lib/constants";
import { calendarHref, type CalendarQuery } from "@/lib/calendar-params";
import { cn } from "@/lib/cn";
import { addDaysISO, formatDayNumber, isoWeekday, type ISODate } from "@/lib/dates";
import type { PostRow } from "@/lib/database.types";

const HEADERS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];

export function MonthGrid({
  from,
  to,
  monthPrefix,
  posts,
  today,
  query,
}: {
  from: ISODate;
  to: ISODate;
  /** « 2026-11 » : sert à estomper les jours des mois voisins. */
  monthPrefix: string;
  posts: PostRow[];
  today: ISODate;
  query: CalendarQuery;
}) {
  const days: ISODate[] = [];
  for (let d = from; d <= to; d = addDaysISO(d, 1)) days.push(d);

  return (
    <div className="border-line bg-surface overflow-hidden rounded-2xl border">
      <div className="bg-surface-2/60 grid grid-cols-7 text-center text-xs font-semibold">
        {HEADERS.map((h) => (
          <div key={h} className="text-ink-muted py-2">
            {h}
          </div>
        ))}
      </div>
      <ol className="grid grid-cols-7">
        {days.map((date) => {
          const dayPosts = posts.filter((p) => p.date === date);
          const inMonth = date.startsWith(monthPrefix);
          const isToday = date === today;
          const weekend = isoWeekday(date) >= 6;
          return (
            <li
              key={date}
              className={cn(
                "group border-line relative min-h-20 border-t border-l p-1 first:border-l-0 md:min-h-28 md:p-1.5 [&:nth-child(7n+1)]:border-l-0",
                !inMonth && "bg-surface-2/40",
                weekend && inMonth && "bg-surface-2/20",
              )}
            >
              <div className="flex items-center justify-between">
                <Link
                  href={calendarHref({ ...query, vue: "semaine" }, { date, post: null })}
                  aria-label={`Voir la semaine du ${date}`}
                  className={cn(
                    "inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                    isToday
                      ? "bg-accent-strong text-on-accent"
                      : inMonth
                        ? "text-ink"
                        : "text-ink-muted/70",
                  )}
                >
                  {formatDayNumber(date)}
                </Link>
                {inMonth && (
                  <Link
                    href={calendarHref(query, { post: "new", d: date })}
                    scroll={false}
                    aria-label={`Ajouter un post le ${date}`}
                    className="text-ink-muted hover:bg-surface-2 hidden size-7 items-center justify-center rounded-full opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 md:inline-flex"
                  >
                    <Plus aria-hidden className="size-4" />
                  </Link>
                )}
              </div>

              {/* Mobile : pastilles de couleur ; le toucher ouvre la semaine. */}
              {dayPosts.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1 md:hidden">
                  {dayPosts.slice(0, 4).map((p) => (
                    <Link
                      key={p.id}
                      href={calendarHref(query, { post: p.id })}
                      scroll={false}
                      aria-label={`${CONTENT_TYPE_META[p.type].label} : ${p.idee || "idée à définir"}`}
                      className="inline-flex size-6 items-center justify-center"
                    >
                      <span className={cn("size-3 rounded-full", TYPE_CLASSES[p.type].dot)} />
                    </Link>
                  ))}
                </div>
              )}

              {/* Ordinateur : pastilles avec texte. */}
              <ul className="mt-1 hidden space-y-1 md:block">
                {dayPosts.slice(0, 3).map((p) => (
                  <li key={p.id}>
                    <Link
                      href={calendarHref(query, { post: p.id })}
                      scroll={false}
                      className={cn(
                        "flex items-center gap-1.5 truncate rounded-md px-1.5 py-1 text-xs font-medium hover:brightness-95",
                        TYPE_CLASSES[p.type].pill,
                      )}
                      title={`${CONTENT_TYPE_META[p.type].label} — ${p.idee || "idée à définir"}`}
                    >
                      <span
                        aria-hidden
                        className={cn("size-1.5 shrink-0 rounded-full", TYPE_CLASSES[p.type].dot)}
                      />
                      <span className="truncate">{p.idee || CONTENT_TYPE_META[p.type].label}</span>
                    </Link>
                  </li>
                ))}
                {dayPosts.length > 3 && (
                  <li>
                    <Link
                      href={calendarHref({ ...query, vue: "semaine" }, { date, post: null })}
                      className="text-ink-muted hover:text-ink px-1.5 text-xs font-medium"
                    >
                      +{dayPosts.length - 3} autre{dayPosts.length - 3 > 1 ? "s" : ""}
                    </Link>
                  </li>
                )}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
