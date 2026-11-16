import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { QuickAddMembers } from "@/components/team/QuickAddMembers";
import { TeamCard } from "@/components/team/TeamCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { todayISO } from "@/lib/dates";
import { weekProgress } from "@/lib/progress";
import { fetchTaskLites } from "@/server/progress";
import { requireSession } from "@/server/session";
import { getTeam } from "@/server/team";

export const metadata: Metadata = { title: "Équipe" };

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ ajout?: string }>;
}) {
  const auth = await requireSession();
  const { ajout } = await searchParams;
  const today = todayISO();
  const [team, tasks] = await Promise.all([getTeam(), fetchTaskLites()]);
  const visibleAll = auth.isAdmin ? team : team.filter((m) => m.actif);
  // Les observateurs ne travaillent pas dans l'équipe : ni avancement, ni tâches. Ils sont listés à part.
  const visible = visibleAll.filter((m) => !m.observateur);
  const observers = visibleAll.filter((m) => m.observateur && m.actif);
  const active = team.filter((m) => m.actif && !m.observateur);

  const progressOf = (id: string) =>
    weekProgress(
      tasks.filter((t) => t.member_id === id),
      today,
    );
  const all = weekProgress(
    tasks.filter((t) => active.some((m) => m.id === t.member_id)),
    today,
  );

  return (
    <>
      <PageHeader
        title="Équipe"
        description="Où en est chacun cette semaine. Touche une personne pour voir son espace et la relancer si besoin."
      />

      {auth.isAdmin && <QuickAddMembers autoFocus={ajout === "1" || visible.length === 0} />}

      {visible.length === 0 && observers.length === 0 ? (
        !auth.isAdmin && (
          <EmptyState
            illustration="people"
            title="Aucun membre pour l'instant"
            description="L'administrateur doit d'abord ajouter les membres du pôle (bouton « Mode administrateur » dans le menu)."
          />
        )
      ) : (
        <>
          <section
            aria-labelledby="avancement"
            className="bg-surface border-line shadow-card mb-6 rounded-2xl border p-4 md:p-5"
          >
            <h2 id="avancement" className="font-display text-lg font-bold">
              Avancement de l&apos;équipe
            </h2>
            {all.total === 0 ? (
              <p className="text-ink-muted mt-1 text-sm">
                Aucune tâche cette semaine. Ajoute-en depuis l&apos;espace d&apos;une personne.
              </p>
            ) : (
              <>
                <p className="mt-1 text-sm">
                  <strong className="tabular-nums">
                    {all.done} / {all.total}
                  </strong>{" "}
                  tâches faites cette semaine ({all.pct} %)
                  {all.late > 0 && (
                    <span className="text-accent-strong font-semibold">
                      {" "}
                      · {all.late} en retard
                    </span>
                  )}
                </p>
                <ProgressBar
                  done={all.done}
                  total={all.total}
                  label="Avancement de l'équipe"
                  tone={all.late > 0 ? "accent" : "forest"}
                  className="mt-3 h-4"
                />
              </>
            )}
          </section>

          <ul className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((m) => (
              <li key={m.id} className="flex">
                <div className="w-full">
                  <TeamCard member={m} progress={progressOf(m.id)} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {observers.length > 0 && (
        <section aria-labelledby="observation" className="mt-8">
          <h2 id="observation" className="font-display text-lg font-bold">
            Observation
          </h2>
          <p className="text-ink-muted mt-1 mb-3 text-base">
            Ces personnes consultent tout (calendrier, tâches, avancement) sans travailler dans
            l&apos;équipe.
          </p>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {observers.map((m) => (
              <li key={m.id} className="min-w-0">
                <Link
                  href={`/equipe/${m.id}`}
                  className="lift bg-surface border-line shadow-card flex min-h-16 items-center gap-3 rounded-2xl border p-3"
                >
                  <Avatar name={m.name} color={m.couleur} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-semibold">{m.name}</span>
                    <span className="text-ink-muted block text-sm">Observation</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
