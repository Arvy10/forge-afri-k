import Link from "next/link";
import { CalendarClock, TriangleAlert } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { TypePill } from "@/components/ui/TypePill";
import { PriorityBadge } from "@/components/calendar/DayCard";
import type { DayWithSlots } from "@/lib/calendar";
import { isSlotLate } from "@/lib/calendar";
import { cn } from "@/lib/cn";
import type { SlotRow } from "@/lib/database.types";
import { formatDateShort, formatDayShort } from "@/lib/dates";
import type { MemberLite } from "@/lib/members";

/** L'alerte principale du pôle : ce qu'il faut préparer ou filmer aujourd'hui ou demain. */
export function PrepSoonList({
  items,
  people,
  today,
}: {
  items: { day: DayWithSlots; slot: SlotRow }[];
  people: MemberLite[];
  today: string;
}) {
  const byId = new Map(people.map((p) => [p.id, p]));
  if (items.length === 0)
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
      {items.slice(0, 8).map(({ day, slot }) => {
        // Le retard ne se signale que pour les posts obligatoires ; un facultatif est simplement « à préparer ».
        const late = isSlotLate(slot, today);
        const behind = slot.a_preparer_le !== null && slot.a_preparer_le < today;
        const who = slot.responsable_id ? byId.get(slot.responsable_id) : null;
        return (
          <li key={slot.id}>
            <Link href={`/calendrier/${day.date}`} className="flex min-h-12 items-start gap-3 py-3">
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
                <span className="line-clamp-2 block text-base font-medium">{slot.titre}</span>
                <span className="text-ink-muted mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <PriorityBadge priorite={slot.priorite} />
                  <TypePill type={day.type_de_contenu} compact />
                  <span className={late ? "text-accent-strong font-semibold" : undefined}>
                    {behind
                      ? `${late ? "En retard · " : ""}à préparer le ${formatDayShort(slot.a_preparer_le!)} ${formatDateShort(slot.a_preparer_le!)}`
                      : `${slot.a_preparer_le === today ? "À préparer aujourd'hui" : "À préparer demain"} · publication le ${formatDayShort(day.date)} ${formatDateShort(day.date)}`}
                  </span>
                </span>
              </span>
              {who && <Avatar name={who.name} color={who.couleur} size="sm" />}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
