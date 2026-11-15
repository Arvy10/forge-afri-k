import type { DayWithSlots } from "./calendar";
import { CONTENT_TYPE_META, POST_STATUS_LABEL } from "./constants";
import { toCsv } from "./csv";
import { formatTime } from "./dates";

export const CALENDAR_CSV_HEADERS = [
  "N° du jour",
  "Date",
  "Jour",
  "Semaine",
  "Thème de la semaine",
  "Type de contenu",
  "Créneau",
  "Heure",
  "Priorité",
  "Titre",
  "Idée",
  "Comment faire",
  "Accroche",
  "Légende",
  "TikTok",
  "Instagram",
  "Facebook",
  "À préparer le",
  "Responsable",
  "Statut",
  "Lien du post",
] as const;

/** Export du calendrier : une ligne par créneau (obligatoire d'abord), tous les textes tels quels. */
export function exportCalendarCsv(days: DayWithSlots[], memberNames: Map<string, string>): string {
  const rows: string[][] = [[...CALENDAR_CSV_HEADERS]];
  for (const day of days) {
    for (const s of day.slots) {
      rows.push([
        String(day.numero),
        day.date,
        day.jour,
        String(day.semaine),
        day.theme_semaine,
        CONTENT_TYPE_META[day.type_de_contenu].label,
        s.moment === "matin" ? "Matin" : "Soir",
        formatTime(s.heure),
        s.priorite === "obligatoire" ? "Obligatoire" : "Facultatif",
        s.titre,
        s.idee,
        (s.comment_faire ?? []).map((step, i) => `${i + 1}. ${step}`).join("\n"),
        s.accroche ?? "",
        s.legende ?? "",
        s.formats?.tiktok ?? "",
        s.formats?.instagram ?? "",
        s.formats?.facebook ?? "",
        s.a_preparer_le ?? "",
        s.responsable_id ? (memberNames.get(s.responsable_id) ?? "") : "",
        POST_STATUS_LABEL[s.statut],
        s.lien ?? "",
      ]);
    }
  }
  return toCsv(rows);
}
