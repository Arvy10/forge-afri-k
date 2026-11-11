import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { TasksOverview } from "@/components/tasks/TasksOverview";
import { todayISO } from "@/lib/dates";
import { filterTasks, parseTaskQuery } from "@/lib/tasks-params";
import { requireSession } from "@/server/session";
import { loadTaskPage } from "@/server/task-page";
import { getTeam } from "@/server/team";

export const metadata: Metadata = { title: "Toutes les tâches" };

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const auth = await requireSession();
  const query = parseTaskQuery(await searchParams);
  const today = todayISO();
  const [{ tasks, postOptions }, team] = await Promise.all([loadTaskPage(), getTeam()]);
  const visible = filterTasks(tasks, query, auth.memberId, today);
  const canAdd = auth.isAdmin || auth.settings?.tasks_add_policy !== "admin";

  return (
    <>
      <PageHeader
        title="Toutes les tâches"
        description="Ce qu'il reste à faire, par qui et pour quand. Chacun coche ses propres tâches."
      />
      <TaskFilters query={query} members={team.filter((m) => m.actif)} canUseMe={!!auth.memberId} />
      <TasksOverview
        key={JSON.stringify(query)}
        tasks={visible}
        members={team}
        posts={postOptions}
        me={{ id: auth.memberId, isAdmin: auth.isAdmin }}
        today={today}
        query={query}
        canAdd={canAdd}
      />
    </>
  );
}
