import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { MemberAdminPanel } from "@/components/team/MemberAdminPanel";
import { TaskGroups } from "@/components/tasks/TaskGroups";
import { Avatar } from "@/components/ui/Avatar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { todayISO } from "@/lib/dates";
import { weekProgress } from "@/lib/progress";
import { requireSession } from "@/server/session";
import { loadTaskPage } from "@/server/task-page";
import { getRoles, getTeam } from "@/server/team";

export const metadata: Metadata = { title: "Espace d'un membre" };

export default async function MemberSpacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const auth = await requireSession();
  const team = await getTeam();
  const member = team.find((m) => m.id === id);
  if (!member || (!member.actif && !auth.isAdmin)) notFound();

  const today = todayISO();
  const [{ tasks, postOptions }, roles] = await Promise.all([
    loadTaskPage({ memberId: id }),
    getRoles(),
  ]);
  const progress = weekProgress(tasks, today);
  const isMe = auth.memberId === id;
  const canAdd = auth.isAdmin || auth.settings?.tasks_add_policy !== "admin";

  return (
    <div className="max-w-3xl">
      <Link
        href="/equipe"
        className="text-ink-muted hover:text-ink mb-3 inline-flex min-h-12 items-center gap-1.5 text-sm font-semibold"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Retour à l&apos;équipe
      </Link>

      <header className="mb-6 flex items-center gap-4">
        <Avatar name={member.name} color={member.couleur} size="lg" />
        <div className="min-w-0">
          <h1 className="font-display text-3xl leading-tight font-bold md:text-4xl">
            {member.name}
          </h1>
          <p className="text-ink-muted mt-0.5 text-sm md:text-base">
            {member.roleNames.join(" · ") || "Rôle à définir"}
          </p>
          {!member.actif && (
            <span className="bg-surface-2 text-ink-muted mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold">
              Désactivé
            </span>
          )}
        </div>
      </header>

      <RoleInfo memberRoleIds={member.roleIds} roles={roles} />

      <section
        aria-labelledby="progression"
        className="bg-surface border-line shadow-card mb-7 rounded-2xl border p-4 md:p-5"
      >
        <h2 id="progression" className="sr-only">
          Progression de la semaine
        </h2>
        {progress.total === 0 ? (
          <p className="text-ink-muted text-sm">Aucune tâche prévue cette semaine.</p>
        ) : (
          <>
            <p className="font-display text-lg font-bold">
              {progress.done} sur {progress.total} cette semaine
            </p>
            <ProgressBar
              done={progress.done}
              total={progress.total}
              label={`Progression de ${member.prenom}`}
              tone={progress.late > 0 ? "accent" : "forest"}
              className="mt-3 h-4"
            />
            {progress.late > 0 && (
              <p className="text-accent-strong mt-2 text-sm font-semibold">
                {progress.late} en retard
              </p>
            )}
          </>
        )}
      </section>

      {auth.isAdmin && (
        <MemberAdminPanel
          memberId={id}
          roles={roles}
          actif={member.actif}
          initial={{
            prenom: member.prenom,
            nom: member.nom ?? "",
            couleur: member.couleur,
            role_ids: member.roleIds,
          }}
        />
      )}

      <TaskGroups
        tasks={tasks}
        members={team}
        posts={postOptions}
        me={{ id: auth.memberId, isAdmin: auth.isAdmin }}
        today={today}
        canAdd={canAdd}
        defaultMemberId={id}
        emptyTitle={isMe ? "Aucune tâche pour toi" : `Aucune tâche pour ${member.prenom}`}
        emptyDescription="Ajoute une première tâche avec le bouton ci-dessous."
      />
    </div>
  );
}

function RoleInfo({
  memberRoleIds,
  roles,
}: {
  memberRoleIds: string[];
  roles: Awaited<ReturnType<typeof getRoles>>;
}) {
  const mine = roles.filter((r) => memberRoleIds.includes(r.id));
  if (mine.length === 0) return null;
  return (
    <section aria-label="Rôles" className="mb-6 grid gap-3 sm:grid-cols-2">
      {mine.map((r) => (
        <div key={r.id} className="bg-surface border-line rounded-2xl border p-4">
          <h2 className="font-display text-base font-bold">{r.nom}</h2>
          {r.mission && <p className="text-ink-muted mt-1 text-sm">{r.mission}</p>}
          {r.ne_fait_pas && (
            <p className="mt-2 text-sm">
              <strong>Ne fait pas :</strong> <span className="text-ink-muted">{r.ne_fait_pas}</span>
            </p>
          )}
        </div>
      ))}
    </section>
  );
}
