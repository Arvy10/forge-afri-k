import "server-only";
import { addDaysISO, formatDateShort, todayISO } from "@/lib/dates";
import type { PostRow } from "@/lib/database.types";
import { db } from "./db";
import { getTeam } from "./team";
import { fetchTasks, loadTaskViews, type TaskView } from "./tasks";

export type PostOption = { id: string; label: string };

/** Posts proposés quand on lie une tâche à un post (les récents et les à venir). */
export async function fetchPostOptions(): Promise<PostOption[]> {
  const { data } = await db()
    .from("pc_posts")
    .select("id, numero, date, idee")
    .gte("date", addDaysISO(todayISO(), -14))
    .order("date")
    .limit(120);
  return ((data ?? []) as Pick<PostRow, "id" | "numero" | "date" | "idee">[]).map((p) => ({
    id: p.id,
    label: `N° ${p.numero} · ${formatDateShort(p.date)}${p.idee ? ` · ${p.idee.slice(0, 40)}` : ""}`,
  }));
}

/** Tâches (avec livrables et relances) + équipe + posts, prêtes pour l'affichage. */
export async function loadTaskPage(
  filter: { memberId?: string } = {},
): Promise<{ tasks: TaskView[]; postOptions: PostOption[] }> {
  const team = await getTeam();
  const names = new Map(team.map((m) => [m.id, m.prenom]));
  const [rows, postOptions] = await Promise.all([fetchTasks(filter), fetchPostOptions()]);
  return { tasks: await loadTaskViews(rows, names), postOptions };
}
