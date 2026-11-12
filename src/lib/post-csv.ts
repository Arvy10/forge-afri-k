import {
  CHANNEL_LABEL,
  CONTENT_TYPE_META,
  POST_FORMAT_LABEL,
  POST_STATUS_LABEL,
} from "./constants";
import { toCsv } from "./csv";
import { formatDayShort } from "./dates";
import type { PostRow } from "./database.types";

export const CSV_HEADERS = [
  "N°",
  "Date",
  "Jour",
  "Type de contenu",
  "Canal principal",
  "Autres canaux",
  "Format",
  "Idée / scénario",
  "À préparer / filmer le",
  "Heure de publication",
  "Légende (copywriting)",
  "Responsable",
  "Statut",
  "Lien du post",
] as const;

import { norm } from "./text";
import type { PersonRef } from "./paste-import";
export { norm };

export function exportPostsCsv(posts: PostRow[], people: PersonRef[]): string {
  const byId = new Map(people.map((p) => [p.id, p.full_name || p.email]));
  const rows = [
    [...CSV_HEADERS] as string[],
    ...posts.map((p) => [
      String(p.numero),
      p.date,
      formatDayShort(p.date),
      CONTENT_TYPE_META[p.type].label,
      CHANNEL_LABEL[p.canal_principal],
      p.autres_canaux.map((c) => CHANNEL_LABEL[c]).join(", "),
      POST_FORMAT_LABEL[p.format],
      p.idee,
      p.prep_date ?? "",
      p.heure.slice(0, 5),
      p.legende,
      p.responsable_id ? (byId.get(p.responsable_id) ?? "") : "",
      POST_STATUS_LABEL[p.statut],
      p.lien ?? "",
    ]),
  ];
  return toCsv(rows);
}

/* L'import (CSV, tableau collé) vit dans paste-import.ts ; ré-exporté ici pour compatibilité. */
export { importPostsCsv, importPostsText, parseDateCell, parseTimeCell } from "./paste-import";
export type { ImportReport, ImportRowResult, ImportedPost, PersonRef } from "./paste-import";
