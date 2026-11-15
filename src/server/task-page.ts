import "server-only";
import { slotOptionLabel } from "@/lib/calendar";
import { addDaysISO, todayISO } from "@/lib/dates";
import { getDays } from "./calendar";
import { getTeam } from "./team";
import { fetchTasks, loadTaskViews, type TaskView } from "./tasks";

export type PostOption = { id: string; label: string };

/** Créneaux proposés quand on lie une tâche à un post du calendrier (récents et à venir). */
export async function fetchPostOptions(): Promise<PostOption[]> {
  const days = await getDays();
  const since = addDaysISO(todayISO(), -14);
  return days
    .filter((d) => d.date >= since)
    .flatMap((d) => d.slots.map((s) => ({ id: s.id, label: slotOptionLabel(d, s) })));
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
