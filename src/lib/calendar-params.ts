import { z } from "zod";
import { CHANNELS, CONTENT_TYPES, POST_STATUSES } from "./constants";
import { addDaysISO, isISODate, startOfWeekISO, toDate, toISO, type ISODate } from "./dates";
import { endOfMonth, startOfMonth } from "date-fns";

export const VIEWS = ["semaine", "mois", "liste"] as const;
export type View = (typeof VIEWS)[number];

export type CalendarQuery = {
  vue: View;
  date: ISODate;
  type?: (typeof CONTENT_TYPES)[number];
  canal?: (typeof CHANNELS)[number];
  statut?: (typeof POST_STATUSES)[number];
  /** « moi » ou identifiant d'un membre. */
  resp?: string;
  /** Identifiant du post ouvert, ou « new ». */
  post?: string;
  /** Date préremplie pour un nouveau post. */
  d?: ISODate;
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Lit les paramètres d'URL de façon tolérante : une valeur invalide est simplement ignorée. */
export function parseCalendarQuery(
  raw: Record<string, string | string[] | undefined>,
  today: ISODate,
): CalendarQuery {
  const vue = z.enum(VIEWS).catch("semaine").parse(first(raw.vue));
  const dateRaw = first(raw.date);
  const q: CalendarQuery = { vue, date: dateRaw && isISODate(dateRaw) ? dateRaw : today };
  const type = z.enum(CONTENT_TYPES).safeParse(first(raw.type));
  if (type.success) q.type = type.data;
  const canal = z.enum(CHANNELS).safeParse(first(raw.canal));
  if (canal.success) q.canal = canal.data;
  const statut = z.enum(POST_STATUSES).safeParse(first(raw.statut));
  if (statut.success) q.statut = statut.data;
  const resp = first(raw.resp);
  if (resp === "moi" || (resp && z.uuid().safeParse(resp).success)) q.resp = resp;
  const post = first(raw.post);
  if (post === "new" || (post && z.uuid().safeParse(post).success)) q.post = post;
  const d = first(raw.d);
  if (d && isISODate(d)) q.d = d;
  return q;
}

/** Période (incluse) à charger pour une vue. */
export function rangeFor(q: Pick<CalendarQuery, "vue" | "date">): { from: ISODate; to: ISODate } {
  if (q.vue === "semaine") {
    const monday = startOfWeekISO(q.date);
    return { from: monday, to: addDaysISO(monday, 6) };
  }
  const base = toDate(q.date);
  const first = toISO(startOfMonth(base));
  const last = toISO(endOfMonth(base));
  if (q.vue === "liste") return { from: first, to: last };
  // Mois : la grille commence le lundi qui précède le 1er et finit le dimanche qui suit le dernier jour.
  const gridStart = startOfWeekISO(first);
  const gridEnd = addDaysISO(startOfWeekISO(last), 6);
  return { from: gridStart, to: gridEnd };
}

/** Date visée par « précédent » / « suivant ». */
export function shiftDate(q: Pick<CalendarQuery, "vue" | "date">, dir: -1 | 1): ISODate {
  if (q.vue === "semaine") return addDaysISO(startOfWeekISO(q.date), 7 * dir);
  const [y, m] = q.date.split("-").map(Number) as [number, number];
  const target = new Date(Date.UTC(y, m - 1 + dir, 1, 12));
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/** Construit une URL du calendrier en conservant les filtres. */
export function calendarHref(
  q: CalendarQuery,
  patch: { [K in keyof CalendarQuery]?: CalendarQuery[K] | null } = {},
): string {
  const merged: Record<string, string | null | undefined> = { ...q, ...patch };
  const params = new URLSearchParams();
  for (const key of ["vue", "date", "type", "canal", "statut", "resp", "post", "d"] as const) {
    const v = merged[key];
    if (v) params.set(key, v);
  }
  return `/calendrier?${params.toString()}`;
}

export function hasFilters(q: CalendarQuery): boolean {
  return !!(q.type || q.canal || q.statut || q.resp);
}
