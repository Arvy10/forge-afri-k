import "server-only";
import type { DeliverableRow, NudgeRow, SlotRow, TaskRow } from "@/lib/database.types";
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
  const slotIds = [...new Set(rows.map((r) => r.slot_id).filter((x): x is string => !!x))];

  const [deliv, nudges, slots] = await Promise.all([
    db().from("pc_task_deliverables").select("*").in("task_id", ids).order("created_at"),
    db().from("pc_nudges").select("*").in("task_id", ids).order("created_at", { ascending: false }),
    slotIds.length > 0
      ? db().from("pc_slots").select("id, titre").in("id", slotIds)
      : Promise.resolve({ data: [] as Pick<SlotRow, "id" | "titre">[] }),
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
    ((slots.data ?? []) as Pick<SlotRow, "id" | "titre">[]).map((s) => [s.id, `Post : ${s.titre}`]),
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
      postLabel: t.slot_id ? (postLabel.get(t.slot_id) ?? null) : null,
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
