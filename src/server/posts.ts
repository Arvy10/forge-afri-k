import "server-only";
import type { CalendarQuery } from "@/lib/calendar-params";
import type { ISODate } from "@/lib/dates";
import type { PostRow, TaskRow } from "@/lib/database.types";
import { db } from "./db";
import { getTeam } from "./team";
import { loadTaskViews, type TaskView } from "./tasks";

/** Posts d'une période, filtres appliqués côté base. */
export async function fetchPosts(
  range: { from: ISODate; to: ISODate },
  query: Pick<CalendarQuery, "type" | "canal" | "statut" | "resp">,
  meId: string | null,
): Promise<PostRow[]> {
  let q = db()
    .from("pc_posts")
    .select("*")
    .gte("date", range.from)
    .lte("date", range.to)
    .order("date")
    .order("heure")
    .order("numero")
    .limit(500);
  if (query.type) q = q.eq("type", query.type);
  if (query.statut) q = q.eq("statut", query.statut);
  if (query.canal) q = q.or(`canal_principal.eq.${query.canal},autres_canaux.cs.{${query.canal}}`);
  if (query.resp) {
    if (query.resp === "moi") {
      if (!meId) return [];
      q = q.eq("responsable_id", meId);
    } else q = q.eq("responsable_id", query.resp);
  }
  const { data, error } = await q;
  if (error) throw new Error(`Chargement des posts impossible : ${error.message}`);
  return (data ?? []) as PostRow[];
}

export type PostDetail = { post: PostRow; tasks: TaskView[] };

/** Un post et les tâches qui y sont liées. */
export async function fetchPostDetail(id: string): Promise<PostDetail | null> {
  const { data: post } = await db().from("pc_posts").select("*").eq("id", id).maybeSingle();
  if (!post) return null;
  const { data: tasks } = await db()
    .from("pc_tasks")
    .select("*")
    .eq("post_id", id)
    .order("echeance", { nullsFirst: false });
  const team = await getTeam();
  return {
    post: post as PostRow,
    tasks: await loadTaskViews(
      (tasks ?? []) as TaskRow[],
      new Map(team.map((m) => [m.id, m.prenom])),
    ),
  };
}
