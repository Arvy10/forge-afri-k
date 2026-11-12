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
import { detectDelimiter, parseCsv } from "./csv";
import {
  addDaysISO,
  defaultPrepDate,
  defaultTypeForDate,
  formatDayLong,
  isISODate,
  isoWeekday,
  startOfWeekISO,
  todayISO,
  type ISODate,
} from "./dates";
import { norm } from "./text";

/**
 * Lecture d'un calendrier éditorial COLLÉ (ou importé) : pas d'IA, des règles.
 * Entrée : un tableau copié depuis Notion, Excel, Google Sheets, un CSV, ou un tableau avec des « | ».
 * Le moteur reconnaît les colonnes (par leur titre, ou à défaut par leur contenu) et les dates françaises.
 */

export type PersonRef = { id: string; full_name: string; email: string };

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
  notes: string;
};

export type ImportRowResult = {
  line: number;
  post?: ImportedPost;
  errors: string[];
  warnings: string[];
};

/** Champs d'un post que l'on peut reconnaître dans une colonne. */
export const FIELD_KEYS = [
  "numero",
  "date",
  "jour",
  "type",
  "canal",
  "autres",
  "format",
  "idee",
  "prep",
  "heure",
  "legende",
  "responsable",
  "statut",
  "lien",
  "notes",
] as const;
export type FieldKey = (typeof FIELD_KEYS)[number];

export const FIELD_LABEL: Record<FieldKey, string> = {
  numero: "N° (ignoré : numéro automatique)",
  date: "Date de publication",
  jour: "Jour (lundi, mardi…)",
  type: "Type de contenu",
  canal: "Canal principal",
  autres: "Autres canaux",
  format: "Format",
  idee: "Idée / scénario",
  prep: "À préparer le",
  heure: "Heure de publication",
  legende: "Légende",
  responsable: "Responsable",
  statut: "Statut",
  lien: "Lien du post",
  notes: "Notes",
};

export type Analysis = {
  /** Titres des colonnes (ou « Colonne 1… » s'il n'y a pas de ligne de titres). */
  headers: string[];
  /** Champ reconnu pour chaque colonne (null = ignorée). */
  mapping: (FieldKey | null)[];
  hasHeader: boolean;
  /** Quelques lignes du tableau, pour l'aperçu. */
  sample: string[][];
};

export type ImportReport = { rows: ImportRowResult[]; fatal?: string; analysis?: Analysis };

export type ParseOptions = {
  /** Date du jour (pour deviner l'année). Par défaut : aujourd'hui à Brazzaville. */
  today?: ISODate;
  /** Lundi (ou n'importe quel jour) de la première semaine, si le tableau n'a que des noms de jours. */
  weekStart?: ISODate | null;
  /** Correspondance colonne → champ imposée (sinon devinée). */
  mapping?: (FieldKey | null)[];
};

/* ------------------------------- Dates en français ------------------------------- */

const MONTHS: Array<[string, number]> = [
  ["janv", 1],
  ["jan", 1],
  ["fevr", 2],
  ["fev", 2],
  ["mars", 3],
  ["avr", 4],
  ["mai", 5],
  ["juin", 6],
  ["juil", 7],
  ["aout", 8],
  ["sept", 9],
  ["sep", 9],
  ["oct", 10],
  ["nov", 11],
  ["dec", 12],
];
const WEEKDAYS: Array<[string, number]> = [
  ["lun", 1],
  ["mar", 2],
  ["mer", 3],
  ["jeu", 4],
  ["ven", 5],
  ["sam", 6],
  ["dim", 7],
];

/** « novembre » → 11, « nov. » → 11 ; null si ce n'est pas un mois. */
function monthOf(token: string): number | null {
  const t = norm(token);
  if (t.length < 3) return null;
  // « mar » seul est un jour (mardi) ; « mars » est un mois : le contexte (un numéro avant) tranche ailleurs.
  for (const [prefix, n] of MONTHS) if (t.startsWith(prefix)) return n;
  return null;
}

/** « lundi », « lun. » → 1 … « dimanche » → 7 ; null sinon. */
function weekdayOf(token: string): number | null {
  const t = norm(token);
  if (t.length < 3) return null;
  for (const [prefix, n] of WEEKDAYS) {
    if (
      t === prefix ||
      (t.startsWith(prefix) && /^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)$/.test(t))
    )
      return n;
  }
  return null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Année la plus proche d'aujourd'hui pour un jour/mois sans année. */
function inferYear(day: number, month: number, today: ISODate): number {
  const y = Number(today.slice(0, 4));
  const t = new Date(`${today}T12:00:00Z`).getTime();
  let best = y;
  let bestDiff = Infinity;
  for (const cand of [y - 1, y, y + 1]) {
    const iso = `${cand}-${pad(month)}-${pad(day)}`;
    if (!isISODate(iso)) continue;
    const diff = Math.abs(new Date(`${iso}T12:00:00Z`).getTime() - t);
    if (diff < bestDiff) {
      best = cand;
      bestDiff = diff;
    }
  }
  return best;
}

export type ParsedDate = { iso: ISODate | null; weekday: number | null; hasDate: boolean };

/**
 * Lit une date écrite à la française. Formats reconnus :
 * 2026-11-16 · 16/11/2026 · 16-11-26 · 16/11 · 16.11 · 16 nov · 16 novembre 2026 · lundi 16 novembre · Lun. 16/11 · novembre 16
 * Un nom de jour seul (« lundi ») renvoie `iso: null` et le numéro du jour : le moteur le rattache à une semaine.
 */
export function parseDateFlexible(raw: string, today: ISODate): ParsedDate {
  const text = raw.trim();
  if (!text) return { iso: null, weekday: null, hasDate: false };

  // 1) formes numériques
  let m = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
  if (m) {
    const iso = `${m[1]}-${pad(Number(m[2]))}-${pad(Number(m[3]))}`;
    return { iso: isISODate(iso) ? iso : null, weekday: wd(text), hasDate: true };
  }
  m = /(\d{1,2})\s*[/.-]\s*(\d{1,2})(?:\s*[/.-]\s*(\d{2,4}))?/.exec(text);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = m[3]
      ? m[3].length === 2
        ? 2000 + Number(m[3])
        : Number(m[3])
      : inferYear(day, month, today);
    const iso = `${year}-${pad(month)}-${pad(day)}`;
    return { iso: isISODate(iso) ? iso : null, weekday: wd(text), hasDate: true };
  }

  // 2) « 16 novembre [2026] » ou « novembre 16 »
  const tokens = text.split(/[\s,.;:]+/).filter(Boolean);
  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i]!;
    if (/^\d{1,2}(er)?$/.test(tk)) {
      const next = tokens[i + 1];
      const mon = next ? monthOf(next) : null;
      // « mar » après un numéro est « mars » ; « mardi » reste un jour.
      const monthNum = mon ?? (next && norm(next) === "mar" ? 3 : null);
      if (monthNum) {
        const after = tokens[i + 2];
        const day = parseInt(tk, 10);
        const year =
          after && /^\d{4}$/.test(after) ? Number(after) : inferYear(day, monthNum, today);
        const iso = `${year}-${pad(monthNum)}-${pad(day)}`;
        return { iso: isISODate(iso) ? iso : null, weekday: wd(text), hasDate: true };
      }
    }
    const mon = monthOf(tk);
    const next = tokens[i + 1];
    if (mon && next && /^\d{1,2}$/.test(next)) {
      const day = Number(next);
      const after = tokens[i + 2];
      const year = after && /^\d{4}$/.test(after) ? Number(after) : inferYear(day, mon, today);
      const iso = `${year}-${pad(mon)}-${pad(day)}`;
      return { iso: isISODate(iso) ? iso : null, weekday: wd(text), hasDate: true };
    }
  }

  // 3) nom de jour seul
  const weekday = wd(text);
  return { iso: null, weekday, hasDate: false };

  function wd(s: string): number | null {
    for (const t of s.split(/[\s,.;:/-]+/)) {
      const n = weekdayOf(t);
      if (n) return n;
    }
    return null;
  }
}

/** Compatibilité : une date « complète » en ISO, ou null. */
export function parseDateCell(value: string): string | null {
  const p = parseDateFlexible(value, todayISO());
  return p.hasDate ? p.iso : null;
}

/** « 8h », « 8h30 », « 08:00 » → « 08:00 ». */
export function parseTimeCell(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  const m = /^(\d{1,2})\s*(?:h|:)\s*(\d{2})?$/.exec(v);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2] ?? "0");
  if (h > 23 || min > 59) return null;
  return `${pad(h)}:${pad(min)}`;
}

/* ------------------------------- Lecture du tableau ------------------------------- */

/** Séparateur de cellules, d'après l'ensemble des lignes (et non la seule première, qui peut être un titre). */
function pickDelimiter(lines: string[], text: string): "," | ";" | "\t" {
  const sample = lines.slice(0, 40);
  const score = (ch: string) => sample.filter((l) => l.split(ch).length - 1 >= 2).length;
  const tab = score("\t");
  const semi = score(";");
  const comma = score(",");
  if (tab > 0 && tab >= semi && tab >= comma / 2) return "\t";
  if (semi > 0 && semi >= comma) return ";";
  if (comma > 0) return ",";
  return detectDelimiter(text);
}

/** Tableau copié : cellules séparées par tabulation, « ; », « , » ou « | » (tableau Markdown). */
export function readTable(text: string): string[][] {
  const clean = text.replace(/\r\n?/g, "\n").replace(/^﻿/, "");
  const lines = clean.split("\n").filter((l) => l.trim() !== "");
  const pipes = lines.filter((l) => l.includes("|")).length;
  if (lines.length > 0 && pipes >= Math.max(2, Math.ceil(lines.length * 0.6))) {
    return lines
      .map((l) =>
        l
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) => c.trim()),
      )
      .filter((cells) => !cells.every((c) => /^:?-{2,}:?$/.test(c) || c === ""));
  }
  return parseCsv(clean, pickDelimiter(lines, clean));
}

/* ------------------------------- Reconnaissance des colonnes ------------------------------- */

const HEADER_ALIASES: Record<string, FieldKey> = {
  n: "numero",
  no: "numero",
  num: "numero",
  numero: "numero",
  "n°": "numero",
  date: "date",
  "date de publication": "date",
  "date publication": "date",
  publication: "date",
  "jour de publication": "date",
  quand: "date",
  "date de post": "date",
  jour: "jour",
  "jour de la semaine": "jour",
  "type de contenu": "type",
  type: "type",
  theme: "type",
  thematique: "type",
  rubrique: "type",
  categorie: "type",
  "type de post": "type",
  "canal principal": "canal",
  canal: "canal",
  canaux: "canal",
  reseau: "canal",
  reseaux: "canal",
  plateforme: "canal",
  plateformes: "canal",
  "reseau social": "canal",
  "reseaux sociaux": "canal",
  support: "canal",
  "autres canaux": "autres",
  "autres reseaux": "autres",
  "autres plateformes": "autres",
  diffusion: "autres",
  format: "format",
  "format du contenu": "format",
  "type de format": "format",
  "idee scenario": "idee",
  idee: "idee",
  scenario: "idee",
  contenu: "idee",
  sujet: "idee",
  description: "idee",
  titre: "idee",
  quoi: "idee",
  "idee de contenu": "idee",
  "idee de post": "idee",
  concept: "idee",
  "a preparer filmer le": "prep",
  "a preparer le": "prep",
  preparation: "prep",
  "date de preparation": "prep",
  "a filmer le": "prep",
  tournage: "prep",
  "a preparer": "prep",
  "heure de publication": "heure",
  heure: "heure",
  horaire: "heure",
  "legende copywriting": "legende",
  legende: "legende",
  copywriting: "legende",
  texte: "legende",
  caption: "legende",
  "texte du post": "legende",
  responsable: "responsable",
  "responsable du post": "responsable",
  qui: "responsable",
  assigne: "responsable",
  "assigne a": "responsable",
  "charge de": "responsable",
  "pris en charge par": "responsable",
  statut: "statut",
  etat: "statut",
  avancement: "statut",
  "lien du post": "lien",
  lien: "lien",
  url: "lien",
  "lien de publication": "lien",
  notes: "notes",
  note: "notes",
  remarques: "notes",
  remarque: "notes",
  commentaire: "notes",
  commentaires: "notes",
  observations: "notes",
};

const headerField = (h: string): FieldKey | null => HEADER_ALIASES[norm(h)] ?? null;

type Lookups = {
  type: Map<string, ContentType>;
  canal: Map<string, Channel>;
  format: Map<string, PostFormat>;
  statut: Map<string, PostStatus>;
};

function lookup<T extends string>(
  values: readonly T[],
  labelOf: (v: T) => string,
  extra: Record<string, T> = {},
) {
  const map = new Map<string, T>();
  for (const v of values) {
    map.set(norm(v), v);
    map.set(norm(labelOf(v)), v);
  }
  for (const [k, v] of Object.entries(extra)) map.set(k, v);
  return map;
}

const LOOKUPS: Lookups = {
  type: lookup(CONTENT_TYPES, (t) => CONTENT_TYPE_META[t].label, {
    "appel a l action": "appel_action",
    "appel a laction": "appel_action",
    cta: "appel_action",
    appel: "appel_action",
    "call to action": "appel_action",
    humour: "fun",
    "lundi impact": "impact",
  }),
  canal: lookup(CHANNELS, (c) => CHANNEL_LABEL[c], {
    ig: "instagram",
    insta: "instagram",
    fb: "facebook",
    "face book": "facebook",
    "tik tok": "tiktok",
    tt: "tiktok",
  }),
  format: lookup(POST_FORMATS, (f) => POST_FORMAT_LABEL[f], {
    video: "video_9_16",
    "video 9 16": "video_9_16",
    "video 9:16": "video_9_16",
    reel: "video_9_16",
    reels: "video_9_16",
    carousel: "carrousel",
    "carrousel photo": "carrousel",
    image: "photo",
    visuel: "photo",
    affiche: "photo",
    flyer: "photo",
  }),
  statut: lookup(POST_STATUSES, (s) => POST_STATUS_LABEL[s], {
    "a faire": "a_faire",
    "pret a valider": "pret_a_valider",
    publie: "publie",
    fait: "publie",
    termine: "valide",
    "en cours de realisation": "en_cours",
    "a valider": "pret_a_valider",
    planifie: "a_faire",
  }),
};

function matchOne<T>(cell: string, map: Map<string, T>): T | null {
  const t = norm(cell);
  if (!t) return null;
  if (map.has(t)) return map.get(t)!;
  // Cellule qui CONTIENT un mot reconnu (« Vidéo 9:16 sur TikTok », « Impact (avancement) »)
  for (const [k, v] of map) if (k.length >= 3 && new RegExp(`(^| )${k}( |$)`).test(t)) return v;
  return null;
}

/** Tous les canaux cités dans une cellule (« IG + TikTok », « Instagram, Facebook », « Tous »). */
function channelsIn(cell: string): Channel[] {
  const t = norm(cell);
  if (!t) return [];
  if (/^(tous|toutes|tous les canaux|tous les reseaux|les 3|3 reseaux)$/.test(t))
    return [...CHANNELS];
  const found: Channel[] = [];
  for (const part of cell.split(/[,;/+&]|\bet\b|\n/i)) {
    const c = matchOne(part, LOOKUPS.canal);
    if (c && !found.includes(c)) found.push(c);
  }
  return found;
}

/** Devine le champ d'une colonne d'après son CONTENU (quand il n'y a pas de ligne de titres). */
function guessByContent(
  rows: string[][],
  col: number,
  people: PersonRef[],
  today: ISODate,
): FieldKey | null {
  const cells = rows.map((r) => (r[col] ?? "").trim()).filter(Boolean);
  if (cells.length === 0) return null;
  const share = (pred: (c: string) => boolean) => cells.filter(pred).length / cells.length;
  if (share((c) => parseDateFlexible(c, today).hasDate) >= 0.6) return "date";
  if (share((c) => parseTimeCell(c) !== null) >= 0.6) return "heure";
  if (share((c) => /^https?:\/\//i.test(c)) >= 0.6) return "lien";
  if (
    share((c) => weekdayOf(c.split(/\s+/)[0] ?? "") !== null && c.split(/\s+/).length <= 2) >= 0.6
  )
    return "jour";
  if (share((c) => channelsIn(c).length > 0 && c.length < 40) >= 0.6) return "canal";
  if (share((c) => matchOne(c, LOOKUPS.type) !== null && c.length < 40) >= 0.6) return "type";
  if (share((c) => matchOne(c, LOOKUPS.format) !== null && c.length < 30) >= 0.6) return "format";
  if (share((c) => matchOne(c, LOOKUPS.statut) !== null && c.length < 30) >= 0.6) return "statut";
  const names = people
    .flatMap((p) => [norm(p.full_name), norm(p.full_name).split(" ")[0] ?? ""])
    .filter(Boolean);
  if (names.length > 0 && share((c) => names.some((n) => norm(c).includes(n))) >= 0.6)
    return "responsable";
  if (share((c) => /^\d{1,3}$/.test(c)) >= 0.8) return "numero";
  return null;
}

/** Colonnes → champs : par les titres si la première ligne en est une, sinon par le contenu. */
export function suggestMapping(
  table: string[][],
  people: PersonRef[],
  today: ISODate,
): { mapping: (FieldKey | null)[]; hasHeader: boolean } {
  const width = Math.max(0, ...table.map((r) => r.length));
  const first = table[0] ?? [];
  const byHeader = Array.from({ length: width }, (_, i) => headerField(first[i] ?? ""));
  const recognized = byHeader.filter(Boolean).length;
  const firstHasDate = first.some((c) => parseDateFlexible(c, today).hasDate);

  if (recognized >= 2 || (recognized >= 1 && !firstHasDate)) {
    // Deux colonnes ne peuvent pas porter le même champ : on garde la première.
    const seen = new Set<FieldKey>();
    return {
      hasHeader: true,
      mapping: byHeader.map((f) => (f && !seen.has(f) && (seen.add(f), true) ? f : null)),
    };
  }

  const body = table;
  const guessed = Array.from({ length: width }, (_, i) => guessByContent(body, i, people, today));
  // Les deux colonnes de texte les plus longues : idée, puis légende.
  const avg = (i: number) => {
    const cs = body.map((r) => (r[i] ?? "").trim()).filter(Boolean);
    return cs.length ? cs.reduce((a, c) => a + c.length, 0) / cs.length : 0;
  };
  const free = guessed
    .map((g, i) => (g === null ? i : -1))
    .filter((i) => i >= 0)
    .sort((a, b) => avg(b) - avg(a));
  if (free[0] !== undefined && avg(free[0]) > 4) guessed[free[0]] = "idee";
  if (free[1] !== undefined && avg(free[1]) > 25) guessed[free[1]] = "legende";
  const seen = new Set<FieldKey>();
  return {
    hasHeader: false,
    mapping: guessed.map((f) => (f && !seen.has(f) && (seen.add(f), true) ? f : null)),
  };
}

/* ------------------------------- Analyse complète ------------------------------- */

export function importPostsText(
  text: string,
  people: PersonRef[],
  options: ParseOptions = {},
): ImportReport {
  const today = options.today ?? todayISO();
  const allRows = readTable(text).filter((r) => r.some((c) => c.trim() !== ""));
  // Feuille copiée en entier : des lignes de titre peuvent précéder la ligne des colonnes. On les saute.
  const headerAt = allRows
    .slice(0, 15)
    .findIndex((r) => r.filter((c) => headerField(c) !== null).length >= 3);
  const skipped = headerAt > 0 ? headerAt : 0;
  const table = allRows.slice(skipped);
  if (table.length === 0) return { rows: [], fatal: "Rien à lire : colle ou importe un tableau." };

  const guess = suggestMapping(table, people, today);
  const mapping = options.mapping && options.mapping.length > 0 ? options.mapping : guess.mapping;
  const hasHeader = options.mapping ? guess.hasHeader : guess.hasHeader;
  const width = Math.max(mapping.length, ...table.map((r) => r.length));
  const headers = hasHeader
    ? Array.from({ length: width }, (_, i) => (table[0]?.[i] ?? "").trim() || `Colonne ${i + 1}`)
    : Array.from({ length: width }, (_, i) => `Colonne ${i + 1}`);
  const body = hasHeader ? table.slice(1) : table;
  const analysis: Analysis = {
    headers,
    mapping: Array.from({ length: width }, (_, i) => mapping[i] ?? null),
    hasHeader,
    sample: body.slice(0, 3).map((r) => Array.from({ length: width }, (_, i) => r[i] ?? "")),
  };

  const dateCols = mapping
    .map((f, i) => (f === "date" || f === "jour" ? i : -1))
    .filter((i) => i >= 0);
  if (dateCols.length === 0)
    return {
      rows: [],
      analysis,
      fatal:
        "Je ne trouve aucune colonne de dates. Indique la colonne « Date » (ou « Jour ») dans la liste des colonnes ci-dessous.",
    };

  const colsOf = (field: FieldKey) =>
    mapping.map((f, i) => (f === field ? i : -1)).filter((i) => i >= 0);
  const cell = (row: string[], field: FieldKey) =>
    colsOf(field)
      .map((i) => (row[i] ?? "").trim())
      .filter(Boolean)
      .join(" ");

  const byName = new Map<string, PersonRef>();
  for (const p of people) {
    byName.set(norm(p.full_name), p);
    if (p.email) byName.set(norm(p.email), p);
    const first = norm(p.full_name).split(" ")[0];
    if (first && !byName.has(first)) byName.set(first, p);
  }

  // Semaine courante, pour les tableaux qui n'ont que des noms de jours.
  let weekStart: ISODate | null = options.weekStart ? startOfWeekISO(options.weekStart) : null;
  let lastWeekday = 0;
  const startLine = (hasHeader ? 2 : 1) + skipped;

  const rows: ImportRowResult[] = [];
  body.forEach((cells, idx) => {
    const line = idx + startLine;
    const filled = cells.filter((c) => c.trim() !== "");
    if (filled.length === 0) return;

    // Ligne de titre de section (« Semaine du 16 au 22 novembre », « Novembre 2026 ») : on s'en sert, on ne l'importe pas.
    if (filled.length === 1 && cells[0]?.trim()) {
      const only = filled[0]!;
      const isWeek = /semaine/i.test(only);
      const isMonth =
        !isWeek &&
        !/\d{1,2}\s*[/.-]/.test(only) &&
        /^\s*([a-zéûô.]+)\s*(\d{4})?\s*$/i.test(only) &&
        monthOf(only.split(/\s+/)[0] ?? "") !== null;
      if (isWeek || isMonth) {
        if (isWeek) {
          const d = parseDateFlexible(only.replace(/semaine/gi, ""), today);
          if (d.iso) weekStart = startOfWeekISO(d.iso);
          lastWeekday = 0;
        }
        return;
      }
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // --- date
    const dateText = cell(cells, "date") || cell(cells, "jour");
    const dayText = cell(cells, "jour");
    let parsed = parseDateFlexible(dateText, today);
    if (!parsed.hasDate && dayText && dayText !== dateText) {
      const p2 = parseDateFlexible(dayText, today);
      if (p2.hasDate) parsed = p2;
    }
    let date: ISODate | null = parsed.hasDate ? parsed.iso : null;
    const named = parsed.weekday ?? parseDateFlexible(dayText, today).weekday;
    if (!parsed.hasDate && named) {
      if (!weekStart)
        errors.push(
          `Le jour « ${dateText || dayText} » n'a pas de date : indique la semaine de départ.`,
        );
      else {
        if (named < lastWeekday) weekStart = addDaysISO(weekStart, 7); // retour à « lundi » : semaine suivante
        date = addDaysISO(weekStart, named - 1);
        lastWeekday = named;
      }
    } else if (date) {
      weekStart = startOfWeekISO(date);
      lastWeekday = isoWeekday(date);
      if (named && named !== isoWeekday(date))
        warnings.push(
          `« ${dateText || dayText} » : le ${formatDayLong(date)} est un autre jour de la semaine que celui écrit. J'ai gardé la date.`,
        );
    } else if (parsed.hasDate && !parsed.iso) errors.push(`Date impossible : « ${dateText} ».`);
    else
      errors.push(
        "Date manquante ou illisible (exemples : 16/11/2026, 16 nov., lundi 16 novembre).",
      );

    // --- type
    let type: ContentType | null = null;
    const typeText = cell(cells, "type");
    if (typeText) {
      type = matchOne(typeText, LOOKUPS.type);
      if (!type && date) {
        type = defaultTypeForDate(date);
        warnings.push(
          `Type « ${typeText} » non reconnu : ${type ? "type du jour utilisé" : "aucun type pour un week-end"}.`,
        );
      }
    } else if (date) {
      type = defaultTypeForDate(date);
      if (type) warnings.push("Type déduit du jour de la semaine.");
    }
    if (!type && date)
      errors.push("Type de contenu manquant (et pas de type par défaut le week-end).");

    // --- canaux
    let canal: Channel | null = null;
    const autres: Channel[] = [];
    const canalChannels = channelsIn(cell(cells, "canal"));
    if (cell(cells, "canal") && canalChannels.length === 0)
      errors.push(`Canal principal inconnu : « ${cell(cells, "canal")} ».`);
    canal = canalChannels[0] ?? null;
    for (const c of [...canalChannels.slice(1), ...channelsIn(cell(cells, "autres"))])
      if (c !== canal && !autres.includes(c)) autres.push(c);
    if (!canal) {
      canal = "instagram";
      warnings.push("Canal absent : Instagram par défaut.");
    }

    // --- format, heure, statut
    let format: PostFormat = "video_9_16";
    const formatText = cell(cells, "format");
    if (formatText) {
      const f = matchOne(formatText, LOOKUPS.format);
      if (f) format = f;
      else {
        format = "autre";
        warnings.push(`Format « ${formatText} » inconnu : classé « Autre ».`);
      }
    }
    let heure = "08:00";
    const heureText = cell(cells, "heure");
    if (heureText) {
      const h = parseTimeCell(heureText);
      if (h) heure = h;
      else errors.push(`Heure illisible : « ${heureText} ».`);
    }
    let statut: PostStatus = "a_faire";
    const statutText = cell(cells, "statut");
    if (statutText) {
      const s = matchOne(statutText, LOOKUPS.statut);
      if (s) statut = s;
      else warnings.push(`Statut « ${statutText} » non reconnu : « À faire » utilisé.`);
    }

    // --- préparation
    let prep: string | null = null;
    const prepText = cell(cells, "prep");
    if (prepText) {
      const p = parseDateFlexible(prepText, today);
      if (p.hasDate && p.iso) prep = p.iso;
      else
        warnings.push(
          `Date de préparation illisible (« ${prepText} ») : calculée automatiquement.`,
        );
    }
    if (!prep && date) prep = defaultPrepDate(date);

    // --- responsable
    let responsable: string | null = null;
    const respText = cell(cells, "responsable");
    if (respText) {
      const direct = byName.get(norm(respText));
      const guess =
        direct ??
        [...byName].find(([k]) => k.length >= 2 && norm(respText).split(" ").includes(k))?.[1];
      if (guess) responsable = guess.id;
      else
        warnings.push(
          `Responsable « ${respText} » introuvable parmi les membres : post importé sans responsable.`,
        );
    }

    // --- texte, lien, notes
    const idee = cell(cells, "idee");
    const legende = colsOf("legende")
      .map((i) => cells[i] ?? "")
      .join("\n")
      .trim();
    const lienText = cell(cells, "lien");
    if (lienText && !/^https?:\/\/\S+$/i.test(lienText))
      errors.push("Le lien du post doit commencer par http:// ou https://.");
    const notes = colsOf("notes")
      .map((i) => (cells[i] ?? "").trim())
      .filter(Boolean)
      .join("\n");
    if (!idee && !legende && !notes && errors.length === 0)
      warnings.push("Ligne sans idée ni texte : importée avec « Idée à définir ».");

    const numText = cell(cells, "numero");
    const numero = /^\d+$/.test(numText) ? Number(numText) : null;

    if (errors.length > 0 || !date || !type) rows.push({ line, errors, warnings });
    else
      rows.push({
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
          idee,
          prep_date: prep,
          heure,
          legende,
          responsable_id: responsable,
          statut,
          lien: lienText || null,
          notes,
        },
      });
  });

  return { rows, analysis };
}

/** Compatibilité : import d'un CSV (fichier ou texte). */
export function importPostsCsv(
  text: string,
  people: PersonRef[],
  options: ParseOptions = {},
): ImportReport {
  const report = importPostsText(text, people, options);
  if (!report.fatal && report.rows.length === 0 && report.analysis)
    return { ...report, fatal: "Le fichier est vide ou ne contient que l'en-tête." };
  return report;
}
