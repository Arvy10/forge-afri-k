import { z } from "zod";

export const TASK_VIEWS = ["kanban", "liste"] as const;

export type TaskQuery = {
  vue: (typeof TASK_VIEWS)[number];
  /** « moi » (par défaut) ou « tous ». */
  filtre: "moi" | "tous";
  /** Identifiant de la tâche ouverte. */
  tache?: string;
  /** « 1 » ou identifiant du post à lier : ouvre le formulaire de création. */
  nouvelle?: string;
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseTaskQuery(raw: Record<string, string | string[] | undefined>): TaskQuery {
  const q: TaskQuery = {
    vue: z.enum(TASK_VIEWS).catch("kanban").parse(first(raw.vue)),
    filtre: z.enum(["moi", "tous"]).catch("moi").parse(first(raw.filtre)),
  };
  const t = first(raw.tache);
  if (t && z.uuid().safeParse(t).success) q.tache = t;
  const n = first(raw.nouvelle);
  if (n === "1" || (n && z.uuid().safeParse(n).success)) q.nouvelle = n;
  return q;
}

export function tasksHref(q: TaskQuery, patch: { [K in keyof TaskQuery]?: TaskQuery[K] | null } = {}): string {
  const m: Record<string, string | null | undefined> = { ...q, ...patch };
  const params = new URLSearchParams();
  for (const k of ["vue", "filtre", "tache", "nouvelle"] as const) if (m[k]) params.set(k, m[k]!);
  return `/taches?${params.toString()}`;
}
