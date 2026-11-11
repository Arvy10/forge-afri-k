import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { MemberLite } from "@/lib/members";
import type { Progress } from "@/lib/progress";
import { cn } from "@/lib/cn";

/** Avancement de l'équipe : une barre globale, puis une ligne par personne. */
export function TeamProgress({
  members,
  byMember,
  overall,
}: {
  members: MemberLite[];
  byMember: Map<string, Progress>;
  overall: Progress;
}) {
  if (members.length === 0)
    return (
      <EmptyState
        compact
        illustration="people"
        title="Aucun membre pour l'instant"
        description="L'administrateur ajoute les membres dans « Équipe »."
      />
    );
  return (
    <div>
      <div className="mb-4">
        <p className="text-sm">
          {overall.total === 0 ? (
            <span className="text-ink-muted">Aucune tâche cette semaine pour l&apos;instant.</span>
          ) : (
            <>
              <strong className="font-display text-lg tabular-nums">
                {overall.done} / {overall.total}
              </strong>{" "}
              tâches faites cette semaine
              {overall.late > 0 && (
                <span className="text-accent-strong font-semibold">
                  {" "}
                  · {overall.late} en retard
                </span>
              )}
            </>
          )}
        </p>
        <ProgressBar
          done={overall.done}
          total={overall.total}
          label="Avancement de l'équipe"
          tone={overall.late > 0 ? "accent" : "forest"}
          className="mt-2 h-4"
        />
      </div>
      <ul className="grid gap-1 sm:grid-cols-2">
        {members.map((m) => {
          const p = byMember.get(m.id) ?? { done: 0, total: 0, pct: 0, late: 0 };
          return (
            <li key={m.id}>
              <Link
                href={`/equipe/${m.id}`}
                className="hover:bg-surface-2 flex min-h-14 items-center gap-3 rounded-xl p-2"
              >
                <Avatar name={m.name} color={m.couleur} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{m.prenom}</span>
                    <span
                      className={cn(
                        "text-xs tabular-nums",
                        p.late > 0 ? "text-accent-strong font-semibold" : "text-ink-muted",
                      )}
                    >
                      {p.total === 0 ? "—" : `${p.done}/${p.total}`}
                      {p.late > 0 && ` · ${p.late} en retard`}
                    </span>
                  </span>
                  <ProgressBar
                    done={p.done}
                    total={p.total}
                    label={`Progression de ${m.prenom}`}
                    tone={p.late > 0 ? "accent" : "forest"}
                    className="mt-1.5 h-2"
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
