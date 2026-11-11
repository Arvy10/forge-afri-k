"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BellRing,
  CalendarDays,
  Check,
  ExternalLink,
  FileText,
  Flame,
  Link2,
  Pencil,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { deleteDeliverable } from "@/actions/deliverables";
import { Avatar } from "@/components/ui/Avatar";
import type { TaskStatus } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { formatDateShort, formatDueLabel } from "@/lib/dates";
import { isLate } from "@/lib/progress";
import type { MemberLite } from "@/lib/members";
import type { TaskView } from "@/server/tasks";
import { DeliverableDialog } from "./DeliverableDialog";
import { NudgeDialog } from "./NudgeDialog";

type Props = {
  task: TaskView;
  today: string;
  owner?: MemberLite | null;
  /** Affiche le responsable (vue de l'équipe). */
  showOwner?: boolean;
  me: { id: string | null; isAdmin: boolean };
  onToggle: (id: string, status: TaskStatus) => void;
  onEdit?: (task: TaskView) => void;
  /** Vue en lecture seule d'un autre membre : pas de dépôt, mais on peut relancer. */
  className?: string;
};

/** Une tâche en carte : grande case à cocher, infos clés, livrables, relance. */
export function TaskItem({
  task,
  today,
  owner,
  showOwner,
  me,
  onToggle,
  onEdit,
  className,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const done = task.statut === "fait";
  const late = isLate(task, today);
  const mine = !!me.id && task.member_id === me.id;
  const canToggle = mine || me.isAdmin;
  const canDeposit = mine || me.isAdmin;
  const canNudge = !done && !mine && !!owner;
  const canEdit = me.isAdmin || mine || (!!me.id && task.cree_par === me.id);

  return (
    <article
      className={cn(
        "bg-surface border-line shadow-card rounded-2xl border p-3.5 transition-opacity md:p-4",
        late && "border-accent border-l-4",
        done && "opacity-80",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {/* Grande case à cocher (48 px) */}
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={done ? `Rouvrir : ${task.titre}` : `Marquer comme faite : ${task.titre}`}
          disabled={!canToggle}
          onClick={() => onToggle(task.id, done ? "a_faire" : "fait")}
          className="-m-1 inline-flex size-12 shrink-0 items-center justify-center disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-lg border-2 transition-all duration-200",
              done
                ? "border-success bg-success text-canvas animate-pop"
                : "border-line-strong bg-canvas hover:border-accent-strong",
            )}
          >
            {done && <Check aria-hidden className="size-5" strokeWidth={3.5} />}
          </span>
        </button>

        <div className="min-w-0 flex-1 space-y-1.5">
          <h3
            className={cn(
              "font-display text-base leading-snug font-bold break-words",
              done && "text-ink-muted line-through",
            )}
          >
            {task.titre}
          </h3>
          {task.description && (
            <p className="text-ink-muted line-clamp-2 text-sm">{task.description}</p>
          )}

          <div className="text-ink-muted flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {task.echeance && (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5",
                  late && "text-accent-strong font-semibold",
                )}
              >
                {late ? (
                  <TriangleAlert aria-hidden className="size-4" />
                ) : (
                  <CalendarDays aria-hidden className="size-4" />
                )}
                {late && "En retard · "}
                {formatDueLabel(task.echeance, today)}
              </span>
            )}
            {task.priorite === "haute" && !done && (
              <span className="text-danger inline-flex items-center gap-1 font-semibold">
                <Flame aria-hidden className="size-4" />
                Priorité haute
              </span>
            )}
            {task.postLabel && (
              <span className="inline-flex items-center gap-1.5">
                <Link2 aria-hidden className="size-4" />
                {task.postLabel}
              </span>
            )}
            {showOwner && (
              <span className="text-ink inline-flex items-center gap-1.5 font-medium">
                {owner ? <Avatar name={owner.name} color={owner.couleur} size="xs" /> : null}
                {owner ? owner.prenom : "Sans responsable"}
              </span>
            )}
            {done && task.fait_le && (
              <span className="text-success font-medium">
                Fait le {formatDateShort(task.fait_le.slice(0, 10))}
              </span>
            )}
          </div>

          {/* Relance reçue */}
          {task.lastNudge && mine && (
            <p
              role="note"
              className="bg-accent-soft text-ink flex items-start gap-2 rounded-lg px-3 py-2 text-sm"
            >
              <BellRing aria-hidden className="text-accent-strong mt-0.5 size-4 shrink-0" />
              <span>
                <strong>{task.lastNudge.par ?? "Quelqu'un"}</strong> t&apos;a relancé sur cette
                tâche
                {task.lastNudge.note ? ` : « ${task.lastNudge.note} »` : "."}
              </span>
            </p>
          )}
          {task.lastNudge && !mine && (
            <p className="text-ink-muted flex items-center gap-1.5 text-xs">
              <BellRing aria-hidden className="size-3.5" />
              Relancé{task.lastNudge.par ? ` par ${task.lastNudge.par}` : ""} le{" "}
              {formatDateShort(task.lastNudge.created_at.slice(0, 10))}
            </p>
          )}

          {/* Livrables déposés */}
          {task.deliverables.length > 0 && (
            <ul className="border-line divide-line bg-canvas divide-y overflow-hidden rounded-xl border">
              {task.deliverables.map((d) => (
                <li key={d.id} className="flex items-center gap-2 py-0.5 pr-1 pl-3">
                  {d.type === "lien" ? (
                    <Link2 aria-hidden className="text-ink-muted size-4 shrink-0" />
                  ) : (
                    <FileText aria-hidden className="text-ink-muted size-4 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1 py-2">
                    <span className="block truncate text-sm font-medium">{d.nom}</span>
                    <span className="text-ink-muted block text-xs">
                      Déposé le {formatDateShort(d.created_at.slice(0, 10))}
                    </span>
                  </span>
                  {d.href && (
                    <a
                      href={d.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-strong inline-flex min-h-12 items-center gap-1 px-2 text-sm font-semibold underline-offset-4 hover:underline"
                    >
                      Ouvrir <ExternalLink aria-hidden className="size-3.5" />
                    </a>
                  )}
                  {(me.isAdmin || (me.id && d.depose_par === me.id)) && (
                    <button
                      type="button"
                      aria-label={`Supprimer ${d.nom}`}
                      onClick={() =>
                        start(async () => {
                          const res = await deleteDeliverable(d.id);
                          if (!res.ok) setError(res.error);
                          else router.refresh();
                        })
                      }
                      className="text-ink-muted hover:text-danger inline-flex size-12 items-center justify-center"
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {error && (
            <p role="alert" className="text-danger text-sm font-medium">
              {error}
            </p>
          )}

          {(canDeposit || canNudge || (canEdit && onEdit)) && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {canDeposit && !done && <DeliverableDialog taskId={task.id} taskTitle={task.titre} />}
              {canDeposit && done && task.deliverables.length === 0 && (
                <DeliverableDialog taskId={task.id} taskTitle={task.titre} />
              )}
              {canNudge && owner && (
                <NudgeDialog taskId={task.id} taskTitle={task.titre} prenom={owner.prenom} />
              )}
              {canEdit && onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(task)}
                  className="text-ink-muted hover:text-ink hover:bg-surface-2 inline-flex min-h-12 items-center gap-1.5 rounded-lg px-3 text-sm font-medium"
                >
                  <Pencil aria-hidden className="size-4" />
                  Modifier
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
