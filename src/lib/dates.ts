import { TZDate } from "@date-fns/tz";
import { addDays, format, getISODay, startOfISOWeek } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CONTENT_TYPES,
  CONTENT_TYPE_META,
  DEFAULT_PUBLISH_TIME,
  PREP_DAYS_BEFORE,
  TIMEZONE,
  TZ_OFFSET,
  type ContentType,
} from "./constants";

/**
 * Toutes les dates métier sont des chaînes « AAAA-MM-JJ » (type `date` de Postgres),
 * lues dans le fuseau Africa/Brazzaville. On évite ainsi tout décalage de jour entre
 * le serveur (UTC) et le navigateur de la personne.
 */
export type ISODate = string;

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isISODate(value: string): value is ISODate {
  const m = ISO_RE.exec(value);
  if (!m) return false;
  const d = toDate(value);
  return format(d, "yyyy-MM-dd") === value;
}

/** Midi à Brazzaville ce jour-là (midi : jamais de bascule de date). */
export function toDate(iso: ISODate): TZDate {
  const m = ISO_RE.exec(iso);
  if (!m) throw new Error(`Date invalide : ${iso}`);
  return new TZDate(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, TIMEZONE);
}

export function toISO(date: Date): ISODate {
  return format(new TZDate(date, TIMEZONE), "yyyy-MM-dd");
}

/** Date du jour à Brazzaville. */
export function todayISO(now: Date = new Date()): ISODate {
  return toISO(now);
}

export function addDaysISO(iso: ISODate, days: number): ISODate {
  return toISO(addDays(toDate(iso), days));
}

/** 1 = lundi … 7 = dimanche. */
export function isoWeekday(iso: ISODate): number {
  return getISODay(toDate(iso));
}

export function startOfWeekISO(iso: ISODate): ISODate {
  return toISO(startOfISOWeek(toDate(iso)));
}

/** Lundi → vendredi de la semaine qui contient `iso`. */
export function workWeekISO(iso: ISODate): ISODate[] {
  const monday = startOfWeekISO(iso);
  return [0, 1, 2, 3, 4].map((n) => addDaysISO(monday, n));
}

/* ------------------------------- Rythme éditorial ------------------------------- */

/** Type de contenu attendu ce jour-là (null le week-end). */
export function defaultTypeForDate(iso: ISODate): ContentType | null {
  const day = isoWeekday(iso);
  return CONTENT_TYPES.find((t) => CONTENT_TYPE_META[t].weekday === day) ?? null;
}

/** Vrai si le type choisi s'écarte du rythme du jour. */
export function isOffRhythm(type: ContentType, iso: ISODate): boolean {
  const expected = defaultTypeForDate(iso);
  return expected !== null && expected !== type;
}

/**
 * Date de préparation par défaut : 2 jours avant la publication.
 * Exception : le lundi, on prépare le dimanche précédent (réunion d'équipe).
 */
export function defaultPrepDate(publicationDate: ISODate): ISODate {
  if (isoWeekday(publicationDate) === 1) return addDaysISO(publicationDate, -1);
  return addDaysISO(publicationDate, -PREP_DAYS_BEFORE);
}

/* ------------------------------- Publication ------------------------------- */

/** Instant exact de publication (Brazzaville = UTC+1). */
export function publishInstant(date: ISODate, time: string = DEFAULT_PUBLISH_TIME): Date {
  const hhmm = /^\d{2}:\d{2}/.test(time) ? time.slice(0, 5) : DEFAULT_PUBLISH_TIME;
  return new Date(`${date}T${hhmm}:00${TZ_OFFSET}`);
}

export type Countdown = { past: boolean; days: number; hours: number; minutes: number };

export function countdownTo(target: Date, now: Date = new Date()): Countdown {
  const diff = target.getTime() - now.getTime();
  const past = diff <= 0;
  const total = Math.floor(Math.abs(diff) / 60000);
  return {
    past,
    days: Math.floor(total / 1440),
    hours: Math.floor((total % 1440) / 60),
    minutes: total % 60,
  };
}

/** Post en retard : préparation dépassée et statut encore « À faire ». */
export function isPrepLate(
  post: { prep_date: ISODate | null; statut: string },
  today: ISODate,
): boolean {
  return post.statut === "a_faire" && post.prep_date !== null && post.prep_date < today;
}

/** Préparation attendue aujourd'hui ou demain, et pas encore commencée ou terminée. */
export function isPrepSoon(
  post: { prep_date: ISODate | null; statut: string },
  today: ISODate,
): boolean {
  if (!post.prep_date || post.statut === "publie" || post.statut === "valide") return false;
  return post.prep_date >= today && post.prep_date <= addDaysISO(today, 1);
}

/* ------------------------------- Affichage (fr) ------------------------------- */

const f = (iso: ISODate, pattern: string) => format(toDate(iso), pattern, { locale: fr });

export const formatDayLong = (iso: ISODate) => f(iso, "EEEE d MMMM"); // lundi 16 novembre
export const formatDayShort = (iso: ISODate) => f(iso, "EEE"); // lun.
export const formatDayNumber = (iso: ISODate) => f(iso, "d");
export const formatDateShort = (iso: ISODate) => f(iso, "d MMM"); // 16 nov.
export const formatDateFull = (iso: ISODate) => f(iso, "d MMMM yyyy");
export const formatMonthYear = (iso: ISODate) => f(iso, "MMMM yyyy");

/** « du 16 au 22 novembre » — semaine du lundi au dimanche. */
export function formatWeekRange(mondayISO: ISODate): string {
  const start = toDate(mondayISO);
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const left = format(start, sameMonth ? "d" : "d MMMM", { locale: fr });
  const right = format(end, "d MMMM", { locale: fr });
  return `du ${left} au ${right}`;
}

export const formatWeekTitle = (mondayISO: ISODate) =>
  `Semaine ${formatWeekRange(mondayISO)}`.replace("Semaine du", "Semaine du");

/** « 08:00 » à partir de « 08:00:00 ». */
export const formatTime = (time: string) => time.slice(0, 5);

export function formatCountdown(c: Countdown): string {
  if (c.past) return "Heure de publication passée";
  const parts: string[] = [];
  if (c.days > 0) parts.push(`${c.days} j`);
  if (c.days > 0 || c.hours > 0) parts.push(`${c.hours} h`);
  parts.push(`${String(c.minutes).padStart(2, "0")} min`);
  return parts.join(" ");
}
