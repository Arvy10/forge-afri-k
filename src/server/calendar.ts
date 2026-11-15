import "server-only";
import { cache } from "react";
import type { DayWithSlots } from "@/lib/calendar";
import type { DayRow, SlotRow } from "@/lib/database.types";
import { db } from "./db";

/** Tout le calendrier : les jours (dans l'ordre) avec leurs créneaux. Une seule lecture par page. */
export const getDays = cache(async (): Promise<DayWithSlots[]> => {
  const [days, slots] = await Promise.all([
    db().from("pc_days").select("*").order("date"),
    db().from("pc_slots").select("*").order("heure"),
  ]);
  if (days.error) throw new Error(`Chargement du calendrier impossible : ${days.error.message}`);
  if (slots.error) throw new Error(`Chargement du calendrier impossible : ${slots.error.message}`);
  const byDay = new Map<string, SlotRow[]>();
  for (const s of (slots.data ?? []) as SlotRow[]) {
    const list = byDay.get(s.day_id) ?? [];
    list.push(s);
    byDay.set(s.day_id, list);
  }
  return ((days.data ?? []) as DayRow[]).map((d) => ({
    ...d,
    // Le post obligatoire d'abord, quelle que soit l'heure.
    slots: (byDay.get(d.id) ?? []).sort((a, b) =>
      a.priorite === b.priorite
        ? a.heure.localeCompare(b.heure)
        : a.priorite === "obligatoire"
          ? -1
          : 1,
    ),
  }));
});
