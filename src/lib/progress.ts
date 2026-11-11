import { addDaysISO, startOfWeekISO, toISO, type ISODate } from "./dates";
import type { TaskRow } from "./database.types";

/** Champs utiles au calcul : une tâche, son statut, son échéance, sa date de réalisation. */
export type ProgressTask = Pick<TaskRow, "statut" | "echeance" | "fait_le">;

export function weekBounds(today: ISODate): { start: ISODate; end: ISODate } {
  const start = startOfWeekISO(today);
  return { start, end: addDaysISO(start, 6) };
}

/** Jour (Brazzaville) où la tâche a été terminée. */
export const doneDay = (t: Pick<TaskRow, "fait_le">): ISODate | null =>
  t.fait_le ? toISO(new Date(t.fait_le)) : null;

export const isOpen = (t: ProgressTask) => t.statut !== "fait";

/** En retard : pas faite et échéance dépassée. */
export const isLate = (t: ProgressTask, today: ISODate) =>
  isOpen(t) && !!t.echeance && t.echeance < today;

/**
 * Tâches comptées pour la semaine :
 *  - non faites dont l'échéance est cette semaine ou déjà dépassée,
 *  - faites dont l'échéance est cette semaine ou qui ont été terminées cette semaine.
 */
export function inWeek(t: ProgressTask, today: ISODate): boolean {
  const { start, end } = weekBounds(today);
  if (isOpen(t)) return !!t.echeance && t.echeance <= end;
  const d = doneDay(t);
  const dueThisWeek = !!t.echeance && t.echeance >= start && t.echeance <= end;
  return dueThisWeek || (d !== null && d >= start && d <= end);
}

export type Progress = { done: number; total: number; pct: number; late: number };

/** « 3 tâches faites sur 5 cette semaine » */
export function weekProgress(tasks: ProgressTask[], today: ISODate): Progress {
  const week = tasks.filter((t) => inWeek(t, today));
  const done = week.filter((t) => !isOpen(t)).length;
  const total = week.length;
  return {
    done,
    total,
    pct: total === 0 ? 0 : Math.round((done / total) * 100),
    late: tasks.filter((t) => isLate(t, today)).length,
  };
}

export type TaskGroupKey = "retard" | "semaine" | "plus_tard" | "faites";

export const TASK_GROUP_LABEL: Record<TaskGroupKey, string> = {
  retard: "En retard",
  semaine: "Cette semaine",
  plus_tard: "Plus tard",
  faites: "Faites",
};

export function groupOf(t: ProgressTask, today: ISODate): TaskGroupKey {
  if (!isOpen(t)) return "faites";
  if (isLate(t, today)) return "retard";
  const { end } = weekBounds(today);
  if (t.echeance && t.echeance <= end) return "semaine";
  return "plus_tard";
}

export function groupTasks<T extends ProgressTask>(
  tasks: T[],
  today: ISODate,
): Record<TaskGroupKey, T[]> {
  const out: Record<TaskGroupKey, T[]> = { retard: [], semaine: [], plus_tard: [], faites: [] };
  for (const t of tasks) out[groupOf(t, today)].push(t);
  const byDue = (a: T, b: T) => (a.echeance ?? "9999").localeCompare(b.echeance ?? "9999");
  out.retard.sort(byDue);
  out.semaine.sort(byDue);
  out.plus_tard.sort(byDue);
  out.faites.sort((a, b) => (b.fait_le ?? "").localeCompare(a.fait_le ?? ""));
  return out;
}
