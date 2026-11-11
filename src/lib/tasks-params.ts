import { z } from "zod";
import { TASK_STATUSES } from "./constants";
import { groupOf, type ProgressTask } from "./progress";
import type { ISODate } from "./dates";

export const TASK_VIEWS = ["liste", "kanban"] as const;
export const DUE_FILTERS = ["retard", "semaine", "plus_tard", "sans"] as const;

export type TaskQuery = {
  vue: (typeof TASK_VIEWS)[number];
  /** Identifiant d'un membre, ou « moi ». */
  membre?: string;
  statut?: (typeof TASK_STATUSES)[number];
  ech?: (typeof DUE_FILTERS)[number];
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Lit les paramètres d'URL de façon tolérante : une valeur invalide est simplement ignorée. */
export function parseTaskQuery(raw: Record<string, string | string[] | undefined>): TaskQuery {
  const q: TaskQuery = { vue: z.enum(TASK_VIEWS).catch("liste").parse(first(raw.vue)) };
  const membre = first(raw.membre);
  if (membre === "moi" || (membre && z.uuid().safeParse(membre).success)) q.membre = membre;
  const statut = z.enum(TASK_STATUSES).safeParse(first(raw.statut));
  if (statut.success) q.statut = statut.data;
  const ech = z.enum(DUE_FILTERS).safeParse(first(raw.ech));
  if (ech.success) q.ech = ech.data;
  return q;
}

export function tasksHref(
  q: TaskQuery,
  patch: { [K in keyof TaskQuery]?: TaskQuery[K] | null } = {},
): string {
  const m: Record<string, string | null | undefined> = { ...q, ...patch };
  const params = new URLSearchParams();
  for (const k of ["vue", "membre", "statut", "ech"] as const) if (m[k]) params.set(k, m[k]!);
  return `/taches?${params.toString()}`;
}

export const hasTaskFilters = (q: TaskQuery) => !!(q.membre || q.statut || q.ech);

type Filterable = ProgressTask & { member_id: string | null };

/** Applique les filtres (membre, statut, échéance). */
export function filterTasks<T extends Filterable>(
  tasks: T[],
  q: TaskQuery,
  meId: string | null,
  today: ISODate,
): T[] {
  return tasks.filter((t) => {
    if (q.membre === "moi" ? t.member_id !== meId : q.membre && t.member_id !== q.membre)
      return false;
    if (q.statut && t.statut !== q.statut) return false;
    if (q.ech === "sans") return t.statut !== "fait" && !t.echeance;
    if (q.ech) return groupOf(t, today) === q.ech;
    return true;
  });
}
