import "server-only";
import type { DeliverableRow, NudgeRow, PostRow, TaskRow } from "@/lib/database.types";
import { db } from "./db";

export type DeliverableView = DeliverableRow & {
  /** Lien d'ouverture : l'URL collée, ou une URL signée (1 h) pour un fichier. */
  href: string | null;
};

export type TaskView = TaskRow & {
  deliverables: DeliverableView[];
  /** Dernière relance reçue (tâches non faites). */
  lastNudge: (NudgeRow & { par: string | null }) | null;
  postLabel: string | null;
};

const BUCKET = "pc-livrables";

/** Attache à chaque tâche ses livrables (avec liens d'ouverture), sa dernière relance et son post lié. */
export async function loadTaskViews(
  rows: TaskRow[],
  names: Map<string, string>,
): Promise<TaskView[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const postIds = [...new Set(rows.map((r) => r.post_id).filter((x): x is string => !!x))];

  const [deliv, nudges, posts] = await Promise.all([
    db().from("pc_task_deliverables").select("*").in("task_id", ids).order("created_at"),
    db().from("pc_nudges").select("*").in("task_id", ids).order("created_at", { ascending: false }),
    postIds.length > 0
      ? db().from("pc_posts").select("id, numero, idee").in("id", postIds)
      : Promise.resolve({ data: [] as Pick<PostRow, "id" | "numero" | "idee">[] }),
  ]);

  const deliverables = (deliv.data ?? []) as DeliverableRow[];
  const filePaths = deliverables.map((d) => d.storage_path).filter((p): p is string => !!p);
  const signed = new Map<string, string>();
  if (filePaths.length > 0) {
    const { data } = await db().storage.from(BUCKET).createSignedUrls(filePaths, 3600);
    for (const s of data ?? []) if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl);
  }

  const lastNudge = new Map<string, NudgeRow>();
  for (const n of (nudges.data ?? []) as NudgeRow[])
    if (!lastNudge.has(n.task_id)) lastNudge.set(n.task_id, n);
  const postLabel = new Map(
    ((posts.data ?? []) as Pick<PostRow, "id" | "numero" | "idee">[]).map((p) => [
      p.id,
      `Post n° ${p.numero}${p.idee ? ` · ${p.idee.slice(0, 40)}` : ""}`,
    ]),
  );

  return rows.map((t) => {
    const n = lastNudge.get(t.id);
    return {
      ...t,
      deliverables: deliverables
        .filter((d) => d.task_id === t.id)
        .map((d) => ({
          ...d,
          href: d.url ?? (d.storage_path ? (signed.get(d.storage_path) ?? null) : null),
        })),
      lastNudge:
        n && t.statut !== "fait"
          ? { ...n, par: n.par_member_id ? (names.get(n.par_member_id) ?? null) : null }
          : null,
      postLabel: t.post_id ? (postLabel.get(t.post_id) ?? null) : null,
    };
  });
}

export async function fetchTasks(filter: { memberId?: string } = {}): Promise<TaskRow[]> {
  let q = db()
    .from("pc_tasks")
    .select("*")
    .order("echeance", { nullsFirst: false })
    .order("created_at")
    .limit(1000);
  if (filter.memberId) q = q.eq("member_id", filter.memberId);
  const { data, error } = await q;
  if (error) throw new Error(`Chargement des tâches impossible : ${error.message}`);
  return (data ?? []) as TaskRow[];
}
