import {
  CHANNELS,
  CHANNEL_LABEL,
  CONTENT_TYPES,
  CONTENT_TYPE_META,
  POST_FORMATS,
  POST_FORMAT_LABEL,
  POST_STATUSES,
  POST_STATUS_LABEL,
  type Channel,
  type ContentType,
  type PostFormat,
  type PostStatus,
} from "./constants";
import { parseCsv, toCsv } from "./csv";
import { defaultPrepDate, defaultTypeForDate, formatDayShort, isISODate } from "./dates";
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

/** Minuscules, sans accents ni ponctuation : « Idée / scénario » → « idee scenario ». */
export function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export type PersonRef = { id: string; full_name: string; email: string };

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

/* ------------------------------- Import ------------------------------- */

export type ImportedPost = {
  numero: number | null;
  date: string;
  type: ContentType;
  canal_principal: Channel;
  autres_canaux: Channel[];
  format: PostFormat;
  idee: string;
  prep_date: string | null;
  heure: string;
  legende: string;
  responsable_id: string | null;
  statut: PostStatus;
  lien: string | null;
};

export type ImportRowResult = {
  line: number;
  post?: ImportedPost;
  errors: string[];
  warnings: string[];
};

export type ImportReport = {
  rows: ImportRowResult[];
  fatal?: string;
};

const enumLookup = <T extends string>(values: readonly T[], labelOf: (v: T) => string) => {
  const map = new Map<string, T>();
  for (const v of values) {
    map.set(norm(v), v);
    map.set(norm(labelOf(v)), v);
  }
  return map;
};

const TYPE_MAP = enumLookup(CONTENT_TYPES, (t) => CONTENT_TYPE_META[t].label);
TYPE_MAP.set("appel a l action", "appel_action");
TYPE_MAP.set("cta", "appel_action");
const CHANNEL_MAP = enumLookup(CHANNELS, (c) => CHANNEL_LABEL[c]);
CHANNEL_MAP.set("ig", "instagram");
CHANNEL_MAP.set("insta", "instagram");
CHANNEL_MAP.set("fb", "facebook");
CHANNEL_MAP.set("tik tok", "tiktok");
const FORMAT_MAP = enumLookup(POST_FORMATS, (f) => POST_FORMAT_LABEL[f]);
FORMAT_MAP.set("video", "video_9_16");
FORMAT_MAP.set("video 9 16", "video_9_16");
FORMAT_MAP.set("reel", "video_9_16");
FORMAT_MAP.set("carousel", "carrousel");
const STATUS_MAP = enumLookup(POST_STATUSES, (s) => POST_STATUS_LABEL[s]);
STATUS_MAP.set("a faire", "a_faire");
STATUS_MAP.set("pret a valider", "pret_a_valider");
STATUS_MAP.set("publie", "publie");

/** Accepte « 2026-11-16 », « 16/11/2026 », « 16-11-2026 », « 16/11/26 ». */
export function parseDateCell(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return isISODate(v) ? v : null;
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(v);
  if (!m) return null;
  const year = m[3]!.length === 2 ? `20${m[3]}` : m[3]!;
  const iso = `${year}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  return isISODate(iso) ? iso : null;
}

export function parseTimeCell(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  const m = /^(\d{1,2})\s*(?:h|:)\s*(\d{2})?$/.exec(v);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2] ?? "0");
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

const COLUMN_ALIASES: Record<string, string> = {
  n: "numero",
  no: "numero",
  numero: "numero",
  date: "date",
  "date de publication": "date",
  jour: "jour",
  "type de contenu": "type",
  type: "type",
  "canal principal": "canal",
  canal: "canal",
  "autres canaux": "autres",
  format: "format",
  "idee scenario": "idee",
  idee: "idee",
  scenario: "idee",
  "a preparer filmer le": "prep",
  "a preparer le": "prep",
  preparation: "prep",
  "heure de publication": "heure",
  heure: "heure",
  "legende copywriting": "legende",
  legende: "legende",
  responsable: "responsable",
  statut: "statut",
  "lien du post": "lien",
  lien: "lien",
};

export function importPostsCsv(text: string, people: PersonRef[]): ImportReport {
  const table = parseCsv(text);
  if (table.length < 2)
    return { rows: [], fatal: "Le fichier est vide ou ne contient que l'en-tête." };

  const header = table[0]!.map((h) => COLUMN_ALIASES[norm(h)] ?? null);
  for (const required of ["date"]) {
    if (!header.includes(required))
      return {
        rows: [],
        fatal: `Colonne « ${required === "date" ? "Date" : required} » introuvable dans l'en-tête.`,
      };
  }
  const col = (row: string[], key: string) => {
    const i = header.indexOf(key);
    return i >= 0 ? (row[i] ?? "").trim() : "";
  };

  const byName = new Map<string, PersonRef>();
  for (const p of people) {
    byName.set(norm(p.full_name), p);
    byName.set(norm(p.email), p);
    const first = norm(p.full_name).split(" ")[0];
    if (first && !byName.has(first)) byName.set(first, p);
  }

  const rows: ImportRowResult[] = table.slice(1).map((cells, idx) => {
    const line = idx + 2;
    const errors: string[] = [];
    const warnings: string[] = [];

    const date = parseDateCell(col(cells, "date"));
    if (!date) errors.push("Date manquante ou illisible (attendu : 16/11/2026 ou 2026-11-16).");

    let type: ContentType | null = null;
    const typeCell = col(cells, "type");
    if (typeCell) {
      type = TYPE_MAP.get(norm(typeCell)) ?? null;
      if (!type) errors.push(`Type de contenu inconnu : « ${typeCell} ».`);
    } else if (date) {
      type = defaultTypeForDate(date);
      if (!type) errors.push("Type de contenu manquant (et pas de rythme par défaut le week-end).");
      else warnings.push("Type déduit du jour de la semaine.");
    }

    let canal: Channel | null = null;
    const canalCell = col(cells, "canal");
    if (canalCell) {
      canal = CHANNEL_MAP.get(norm(canalCell)) ?? null;
      if (!canal) errors.push(`Canal principal inconnu : « ${canalCell} ».`);
    } else {
      canal = "instagram";
      warnings.push("Canal principal absent : Instagram par défaut.");
    }

    const autres: Channel[] = [];
    for (const part of col(cells, "autres").split(/[,;/+&]|\bet\b/i)) {
      const t = part.trim();
      if (!t) continue;
      const c = CHANNEL_MAP.get(norm(t));
      if (!c) warnings.push(`Autre canal ignoré : « ${t} ».`);
      else if (c !== canal && !autres.includes(c)) autres.push(c);
    }

    let format: PostFormat = "video_9_16";
    const formatCell = col(cells, "format");
    if (formatCell) {
      const f = FORMAT_MAP.get(norm(formatCell));
      if (f) format = f;
      else {
        format = "autre";
        warnings.push(`Format « ${formatCell} » inconnu : classé « Autre ».`);
      }
    }

    let prep: string | null = null;
    const prepCell = col(cells, "prep");
    if (prepCell) {
      prep = parseDateCell(prepCell);
      if (!prep) errors.push("Date de préparation illisible.");
    } else if (date) prep = defaultPrepDate(date);

    let heure = "08:00";
    const heureCell = col(cells, "heure");
    if (heureCell) {
      const h = parseTimeCell(heureCell);
      if (h) heure = h;
      else errors.push(`Heure illisible : « ${heureCell} ».`);
    }

    let statut: PostStatus = "a_faire";
    const statutCell = col(cells, "statut");
    if (statutCell) {
      const s = STATUS_MAP.get(norm(statutCell));
      if (s) statut = s;
      else errors.push(`Statut inconnu : « ${statutCell} ».`);
    }

    let responsable: string | null = null;
    const respCell = col(cells, "responsable");
    if (respCell) {
      const p = byName.get(norm(respCell));
      if (p) responsable = p.id;
      else
        warnings.push(`Responsable « ${respCell} » introuvable : post importé sans responsable.`);
    }

    const lien = col(cells, "lien");
    if (lien && !/^https?:\/\/\S+$/i.test(lien))
      errors.push("Le lien du post doit commencer par http:// ou https://.");

    const numCell = col(cells, "numero");
    const numero = /^\d+$/.test(numCell) ? Number(numCell) : null;

    if (errors.length > 0 || !date || !type || !canal) return { line, errors, warnings };
    return {
      line,
      errors,
      warnings,
      post: {
        numero,
        date,
        type,
        canal_principal: canal,
        autres_canaux: autres,
        format,
        idee: col(cells, "idee"),
        prep_date: prep,
        heure,
        legende: cells[header.indexOf("legende")] ?? "",
        responsable_id: responsable,
        statut,
        lien: lien || null,
      },
    };
  });

  return { rows };
}
