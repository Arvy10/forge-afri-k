import Link from "next/link";
import { ChevronRight, TriangleAlert } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { MemberLite } from "@/lib/members";
import type { Progress } from "@/lib/progress";
import { cn } from "@/lib/cn";

/** Une personne de l'équipe : qui, quel rôle, et où elle en est cette semaine. */
export function TeamCard({ member, progress }: { member: MemberLite; progress: Progress }) {
  return (
    <article
      className={cn(
        "bg-surface border-line shadow-card lift relative flex flex-col gap-3 rounded-2xl border p-4",
        progress.late > 0 && "border-accent",
      )}
    >
      <div className="flex items-center gap-3.5">
        <Avatar name={member.name} color={member.couleur} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display truncate text-lg leading-tight font-bold">
            <Link
              href={`/equipe/${member.id}`}
              className="after:absolute after:inset-0 after:content-['']"
            >
              {member.name}
            </Link>
          </h2>
          <p className="text-ink-muted truncate text-sm">
            {member.roleNames.join(" · ") || "Rôle à définir"}
          </p>
          {!member.actif && (
            <span className="bg-surface-2 text-ink-muted mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold">
              Désactivé
            </span>
          )}
        </div>
        <ChevronRight aria-hidden className="text-ink-muted size-5 shrink-0" />
      </div>

      {progress.total > 0 ? (
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
            <span className="font-semibold tabular-nums">
              {progress.done} / {progress.total}{" "}
              <span className="text-ink-muted font-normal">cette semaine</span>
            </span>
            <span className="text-ink-muted text-xs tabular-nums">{progress.pct} %</span>
          </div>
          <ProgressBar
            done={progress.done}
            total={progress.total}
            label={`Progression de ${member.prenom}`}
            tone={progress.late > 0 ? "accent" : "forest"}
          />
        </div>
      ) : (
        <p className="text-ink-muted text-sm">Aucune tâche cette semaine.</p>
      )}

      {progress.late > 0 && (
        <p className="text-accent-strong flex items-center gap-1.5 text-sm font-semibold">
          <TriangleAlert aria-hidden className="size-4" />
          {progress.late} {progress.late > 1 ? "tâches en retard" : "tâche en retard"}
        </p>
      )}
    </article>
  );
}
