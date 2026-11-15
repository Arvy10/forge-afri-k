import Link from "next/link";
import { ChevronRight, TriangleAlert } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/StatusPill";
import { TypePill } from "@/components/ui/TypePill";
import { splitSlots, isSlotLate, type DayWithSlots } from "@/lib/calendar";
import { cn } from "@/lib/cn";
import type { SlotRow } from "@/lib/database.types";
import { formatDayLong, formatDateShort, formatDayShort, formatTime } from "@/lib/dates";
import type { MemberLite } from "@/lib/members";

/** « Obligatoire » (orange) ou « Facultatif » (gris). */
export function PriorityBadge({ priorite }: { priorite: SlotRow["priorite"] }) {
  return priorite === "obligatoire" ? (
    <span className="bg-accent-strong text-on-accent inline-flex items-center rounded-full px-3 py-0.5 text-sm font-bold whitespace-nowrap">
      Obligatoire
    </span>
  ) : (
    <span className="border-line-strong bg-surface-2 text-ink-muted inline-flex items-center rounded-full border px-3 py-0.5 text-sm font-semibold whitespace-nowrap">
      Facultatif
    </span>
  );
}

function SlotLine({
  slot,
  people,
  today,
}: {
  slot: SlotRow;
  people: Map<string, MemberLite>;
  today: string;
}) {
  const main = slot.priorite === "obligatoire";
  const late = isSlotLate(slot, today);
  const who = slot.responsable_id ? people.get(slot.responsable_id) : undefined;
  return (
    <div
      className={cn(
        "rounded-xl p-3",
        main ? "bg-surface border-line-strong border shadow-sm" : "bg-canvas/60",
        late && "border-accent-strong border-2",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <PriorityBadge priorite={slot.priorite} />
        <time
          className={cn(
            "font-display tabular-nums",
            main ? "text-xl font-bold" : "text-lg font-semibold",
          )}
        >
          {formatTime(slot.heure)}
        </time>
        <span className="ml-auto flex items-center gap-2">
          <StatusPill status={slot.statut} className="text-sm" />
          {who && <Avatar name={who.name} color={who.couleur} size="sm" />}
        </span>
      </div>
      <p className={cn("mt-2 text-base leading-snug", main ? "font-semibold" : "text-ink-muted")}>
        {slot.titre}
      </p>
      {late && (
        <p className="text-accent-strong mt-2 flex items-center gap-1.5 text-base font-semibold">
          <TriangleAlert aria-hidden className="size-4 shrink-0" />À préparer : en retard
          <span className="font-normal">
            ({formatDayShort(slot.a_preparer_le!)} {formatDateShort(slot.a_preparer_le!)})
          </span>
        </p>
      )}
    </div>
  );
}

/** Une carte par jour : en-tête, consigne du jour, créneau obligatoire (en premier) puis facultatif. */
export function DayCard({
  day,
  people,
  today,
}: {
  day: DayWithSlots;
  people: Map<string, MemberLite>;
  today: string;
}) {
  const { main, extra } = splitSlots(day);
  const isToday = day.date === today;
  return (
    <Link
      href={`/calendrier/${day.date}`}
      aria-label={`${formatDayLong(day.date)} : ouvrir la fiche du jour`}
      className={cn(
        "lift bg-surface border-line shadow-card group block rounded-2xl border p-4 transition-shadow hover:shadow-lg md:p-5",
        isToday && "ring-accent-strong ring-2",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h3 className="font-display text-xl font-bold first-letter:uppercase">
          {formatDayLong(day.date)}
        </h3>
        <TypePill type={day.type_de_contenu} className="text-sm" />
        {isToday && (
          <span className="bg-forest text-on-forest rounded-full px-3 py-0.5 text-sm font-bold">
            Aujourd&apos;hui
          </span>
        )}
        <ChevronRight
          aria-hidden
          className="text-ink-muted ml-auto size-6 transition-transform group-hover:translate-x-0.5"
        />
      </div>
      <p className="text-ink-muted mt-2 text-base">{day.consigne_du_jour}</p>
      <div className="mt-3 space-y-2">
        {main && <SlotLine slot={main} people={people} today={today} />}
        {extra && <SlotLine slot={extra} people={people} today={today} />}
      </div>
    </Link>
  );
}
