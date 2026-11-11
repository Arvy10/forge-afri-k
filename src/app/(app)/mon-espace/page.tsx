import type { Metadata } from "next";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TaskGroups } from "@/components/tasks/TaskGroups";
import { todayISO } from "@/lib/dates";
import { weekProgress } from "@/lib/progress";
import { requireSession } from "@/server/session";
import { loadTaskPage } from "@/server/task-page";
import { getTeam } from "@/server/team";

export const metadata: Metadata = { title: "Mon espace" };

export default async function MySpacePage() {
  const auth = await requireSession();
  const member = auth.member;

  // Administrateur entré sans avoir choisi qui il est : on l'invite à le faire.
  if (!member) {
    return (
      <EmptyState
        illustration="people"
        title="Choisis qui tu es pour voir ton espace"
        description="Mon espace rassemble tes tâches et tes livrables."
        action={
          <Link
            href="/qui-es-tu"
            className="bg-accent-strong text-on-accent inline-flex min-h-12 items-center gap-2 rounded-lg px-5 text-sm font-semibold"
          >
            <UserRound aria-hidden className="size-4" />
            Qui es-tu ?
          </Link>
        }
      />
    );
  }

  const today = todayISO();
  const [{ tasks, postOptions }, team] = await Promise.all([
    loadTaskPage({ memberId: member.id }),
    getTeam(),
  ]);
  const me = team.find((m) => m.id === member.id);
  const progress = weekProgress(tasks, today);
  const canAdd = auth.isAdmin || auth.settings?.tasks_add_policy !== "admin";

  return (
    <div className="max-w-3xl">
      <header className="mb-6 flex items-center gap-4">
        <Avatar name={me?.name ?? member.prenom} color={member.couleur} size="lg" />
        <div className="min-w-0">
          <h1 className="font-display text-3xl leading-tight font-bold md:text-4xl">
            Bonjour {member.prenom}
          </h1>
          <p className="text-ink-muted mt-0.5 text-sm md:text-base">
            {me?.roleNames.join(" · ") || "Rôle à définir"}
          </p>
        </div>
      </header>

      <section
        aria-labelledby="progression"
        className="bg-surface border-line shadow-card mb-7 rounded-2xl border p-4 md:p-5"
      >
        <h2 id="progression" className="sr-only">
          Ma progression de la semaine
        </h2>
        {progress.total === 0 ? (
          <p className="text-ink-muted text-sm">
            Aucune tâche prévue cette semaine pour l&apos;instant.
          </p>
        ) : (
          <>
            <p className="font-display text-lg font-bold">
              {progress.done} {progress.done > 1 ? "tâches faites" : "tâche faite"} sur{" "}
              {progress.total} cette semaine
            </p>
            <ProgressBar
              done={progress.done}
              total={progress.total}
              label="Mes tâches faites cette semaine"
              tone={progress.late > 0 ? "accent" : "forest"}
              className="mt-3 h-4"
            />
            {progress.late > 0 && (
              <p className="text-accent-strong mt-2 text-sm font-semibold">
                {progress.late} {progress.late > 1 ? "tâches en retard" : "tâche en retard"}
              </p>
            )}
          </>
        )}
      </section>

      <TaskGroups
        tasks={tasks}
        members={team}
        posts={postOptions}
        me={{ id: member.id, isAdmin: auth.isAdmin }}
        today={today}
        canAdd={canAdd}
        defaultMemberId={member.id}
        emptyTitle="Aucune tâche pour toi"
        emptyDescription="Quand une tâche te sera confiée, elle apparaîtra ici. Tu peux aussi en ajouter une toi-même."
      />
    </div>
  );
}
