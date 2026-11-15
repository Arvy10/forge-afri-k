import { addDaysISO, isoWeekday, publishInstant, type ISODate } from "./dates";
import type { DayRow, SlotRow } from "./database.types";

/** Un jour du calendrier avec ses créneaux. */
export type DayWithSlots = DayRow & { slots: SlotRow[] };

export type WeekInfo = {
  semaine: number;
  theme: string;
  from: ISODate;
  to: ISODate;
  days: DayWithSlots[];
};

/** Le post obligatoire d'un jour (celui qui compte) et le petit post facultatif. */
export function splitSlots(day: DayWithSlots): { main: SlotRow | null; extra: SlotRow | null } {
  return {
    main: day.slots.find((s) => s.priorite === "obligatoire") ?? null,
    extra: day.slots.find((s) => s.priorite === "facultatif") ?? null,
  };
}

/** Regroupe les jours par semaine (dans l'ordre du calendrier). */
export function groupWeeks(days: DayWithSlots[]): WeekInfo[] {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const weeks = new Map<number, WeekInfo>();
  for (const day of sorted) {
    const w = weeks.get(day.semaine);
    if (w) {
      w.days.push(day);
      w.to = day.date;
    } else
      weeks.set(day.semaine, {
        semaine: day.semaine,
        theme: day.theme_semaine,
        from: day.date,
        to: day.date,
        days: [day],
      });
  }
  return [...weeks.values()].sort((a, b) => a.from.localeCompare(b.from));
}

/**
 * Semaine à montrer par défaut : celle d'aujourd'hui ; le week-end, la suivante ;
 * avant le début, la première ; après la fin, la dernière.
 */
export function defaultWeek(weeks: WeekInfo[], today: ISODate): WeekInfo | null {
  if (weeks.length === 0) return null;
  return weeks.find((w) => w.to >= today) ?? weeks[weeks.length - 1]!;
}

/** Un créneau obligatoire dont la date de préparation est dépassée et qui est encore « à faire ». */
export function isSlotLate(
  slot: Pick<SlotRow, "priorite" | "statut" | "a_preparer_le">,
  today: ISODate,
): boolean {
  return (
    slot.priorite === "obligatoire" &&
    slot.statut === "a_faire" &&
    slot.a_preparer_le !== null &&
    slot.a_preparer_le < today
  );
}

/** Instant exact de publication d'un créneau (fuseau Africa/Brazzaville). */
export function slotInstant(day: Pick<DayRow, "date">, slot: Pick<SlotRow, "heure">): Date {
  return publishInstant(day.date, slot.heure);
}

/** Le prochain créneau OBLIGATOIRE à publier (pas encore publié, pas dans le passé). */
export function nextMandatory(
  days: DayWithSlots[],
  now: Date = new Date(),
): { day: DayWithSlots; slot: SlotRow } | null {
  const candidates: { day: DayWithSlots; slot: SlotRow; at: number }[] = [];
  for (const day of days) {
    for (const slot of day.slots) {
      if (slot.priorite !== "obligatoire" || slot.statut === "publie") continue;
      const at = slotInstant(day, slot).getTime();
      if (at >= now.getTime()) candidates.push({ day, slot, at });
    }
  }
  candidates.sort((a, b) => a.at - b.at);
  const first = candidates[0];
  return first ? { day: first.day, slot: first.slot } : null;
}

/**
 * Créneaux à préparer d'ici demain (ou déjà en retard de préparation), pas encore validés ni publiés.
 * Les créneaux obligatoires passent avant les facultatifs.
 */
export function prepSoon(
  days: DayWithSlots[],
  today: ISODate,
): { day: DayWithSlots; slot: SlotRow }[] {
  const tomorrow = addDaysISO(today, 1);
  const out: { day: DayWithSlots; slot: SlotRow }[] = [];
  for (const day of days) {
    if (day.date < today) continue;
    for (const slot of day.slots) {
      if (!slot.a_preparer_le || slot.a_preparer_le > tomorrow) continue;
      if (!["a_faire", "en_cours", "pret_a_valider"].includes(slot.statut)) continue;
      out.push({ day, slot });
    }
  }
  const rank = (s: SlotRow) => (s.priorite === "obligatoire" ? 0 : 1);
  return out.sort(
    (a, b) =>
      rank(a.slot) - rank(b.slot) ||
      (a.slot.a_preparer_le ?? "").localeCompare(b.slot.a_preparer_le ?? "") ||
      a.day.date.localeCompare(b.day.date),
  );
}

/** Texte de l'en-tête de la fiche d'un jour : « Aujourd'hui, c'est Impact ». */
export function dayHeadline(day: Pick<DayRow, "date" | "jour">, typeLabel: string, today: ISODate) {
  if (day.date === today) return `Aujourd'hui, c'est ${typeLabel}`;
  if (day.date === addDaysISO(today, 1)) return `Demain, c'est ${typeLabel}`;
  return `${day.jour}, c'est ${typeLabel}`;
}

/** Libellé court d'un créneau pour les listes : « Lun 16/11 · Où en est Forge Afri'K ? ». */
export function slotOptionLabel(day: Pick<DayRow, "date" | "jour">, slot: Pick<SlotRow, "titre">) {
  const [, m, d] = day.date.split("-");
  return `${day.jour.slice(0, 3)} ${d}/${m} · ${slot.titre}`;
}

/** Jour de la semaine (1 = lundi) d'une date du calendrier : sert aux contrôles de cohérence. */
export function weekdayOf(date: ISODate): number {
  return isoWeekday(date);
}
