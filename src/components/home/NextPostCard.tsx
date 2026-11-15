import Link from "next/link";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusPill } from "@/components/ui/StatusPill";
import { TypePill } from "@/components/ui/TypePill";
import type { DayWithSlots } from "@/lib/calendar";
import { cn } from "@/lib/cn";
import type { SlotRow } from "@/lib/database.types";
import { formatDayLong, formatTime } from "@/lib/dates";
import type { MemberLite } from "@/lib/members";
import { Countdown } from "./Countdown";

/** Le prochain post OBLIGATOIRE : quand, quoi, et où en est la préparation. */
export function NextPostCard({
  next,
  responsable,
}: {
  next: { day: DayWithSlots; slot: SlotRow } | null;
  responsable: MemberLite | null;
}) {
  if (!next)
    return (
      <EmptyState
        compact
        illustration="calendar"
        title="Aucun post obligatoire à venir"
        description="Tous les posts du calendrier sont publiés ou passés."
      />
    );
  const { day, slot } = next;
  const steps = [
    { label: "Légende prête", done: (slot.legende ?? "").trim() !== "" },
    {
      label: "Visuel ou vidéo prêt",
      done: ["pret_a_valider", "valide", "publie"].includes(slot.statut),
    },
    { label: "Validé par le pôle", done: ["valide", "publie"].includes(slot.statut) },
  ];
  const remaining = steps.filter((s) => !s.done).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <TypePill type={day.type_de_contenu} />
        <StatusPill status={slot.statut} />
      </div>
      <div>
        <p className="text-ink-muted flex items-center gap-1.5 text-sm font-medium">
          <Clock aria-hidden className="size-4" />
          Publication {formatDayLong(day.date)} à {formatTime(slot.heure)}
        </p>
        <Countdown date={day.date} time={slot.heure} />
      </div>
      <Link
        href={`/calendrier/${day.date}`}
        className="line-clamp-3 block min-h-12 text-base font-semibold underline-offset-4 hover:underline"
      >
        {slot.titre}
      </Link>
      <div>
        <p className="mb-1.5 text-sm font-semibold">
          {remaining === 0 ? "Tout est prêt" : `Reste à faire : ${remaining}`}
        </p>
        <ul className="space-y-1">
          {steps.map((s) => (
            <li
              key={s.label}
              className={cn(
                "flex items-center gap-2 text-base",
                s.done ? "text-ink-muted" : "font-medium",
              )}
            >
              {s.done ? (
                <CheckCircle2 aria-hidden className="text-success size-4" />
              ) : (
                <Circle aria-hidden className="text-ink-muted size-4" />
              )}
              <span className={s.done ? "line-through" : undefined}>{s.label}</span>
              <span className="sr-only">{s.done ? " (fait)" : " (à faire)"}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="flex items-center gap-2 text-base">
        {responsable ? (
          <>
            <Avatar name={responsable.name} color={responsable.couleur} size="sm" />
            <span>
              Responsable : <strong>{responsable.name}</strong>
            </span>
          </>
        ) : (
          <span className="text-ink-muted italic">Aucun responsable pour ce post</span>
        )}
      </p>
    </div>
  );
}
