import Link from "next/link";
import { CalendarClock, TriangleAlert } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { TypePill } from "@/components/ui/TypePill";
import { cn } from "@/lib/cn";
import { formatDateShort, formatDayShort, isPrepLate } from "@/lib/dates";
import type { PersonLite } from "@/lib/data";
import type { PostRow } from "@/lib/database.types";

/** L'alerte principale du pôle : ce qu'il faut préparer ou filmer aujourd'hui ou demain. */
export function PrepSoonList({
  posts,
  people,
  today,
}: {
  posts: PostRow[];
  people: PersonLite[];
  today: string;
}) {
  const byId = new Map(people.map((p) => [p.id, p]));
  if (posts.length === 0)
    return (
      <EmptyState
        compact
        illustration="day"
        title="Rien à préparer d'ici demain"
        description="Profites-en pour avancer sur les posts de la semaine suivante."
      />
    );
  return (
    <ul className="divide-line divide-y">
      {posts.map((p) => {
        const late = isPrepLate(p, today);
        const who = p.responsable_id ? byId.get(p.responsable_id) : null;
        return (
          <li key={p.id}>
            <Link
              href={`/calendrier?post=${p.id}&date=${p.date}`}
              className="flex min-h-11 items-start gap-3 py-3"
            >
              <span
                className={cn(
                  "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
                  late ? "bg-accent-soft text-accent-strong" : "bg-surface-2",
                )}
              >
                {late ? (
                  <TriangleAlert aria-hidden className="size-4" />
                ) : (
                  <CalendarClock aria-hidden className="size-4" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 block text-sm font-medium">
                  {p.idee || "Idée à définir"}
                </span>
                <span className="text-ink-muted mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <TypePill type={p.type} compact />
                  <span className={late ? "text-accent-strong font-semibold" : undefined}>
                    {late
                      ? `En retard · à préparer le ${formatDayShort(p.prep_date!)} ${formatDateShort(p.prep_date!)}`
                      : `${p.prep_date === today ? "À préparer aujourd'hui" : "À préparer demain"} · publication le ${formatDayShort(p.date)} ${formatDateShort(p.date)}`}
                  </span>
                </span>
              </span>
              {who && <Avatar name={who.name} src={who.avatar_url} id={who.id} size="sm" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
