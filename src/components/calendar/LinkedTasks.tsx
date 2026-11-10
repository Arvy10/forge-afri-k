import Link from "next/link";
import { ListChecks, Plus } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import type { PersonLite } from "@/lib/data";
import type { TaskRow } from "@/lib/database.types";
import { formatDateShort } from "@/lib/dates";

/** Tâches liées à ce post (créées depuis la page Tâches). */
export function LinkedTasks({
  postId,
  tasks,
  people,
}: {
  postId: string;
  tasks: TaskRow[];
  people: PersonLite[];
}) {
  const byId = new Map(people.map((p) => [p.id, p.name]));
  return (
    <section aria-labelledby="linked-tasks" className="space-y-3">
      <h3 id="linked-tasks" className="font-display flex items-center gap-2 text-base font-bold">
        <ListChecks aria-hidden className="size-4" />
        Tâches liées{" "}
        <span className="text-ink-muted font-sans text-sm font-normal">({tasks.length})</span>
      </h3>
      {tasks.length === 0 ? (
        <p className="text-ink-muted text-sm">Aucune tâche liée à ce post.</p>
      ) : (
        <ul className="divide-line border-line bg-surface divide-y rounded-xl border">
          {tasks.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
            >
              <div className="min-w-0">
                <Link
                  href={`/taches?tache=${t.id}`}
                  className="text-sm font-medium underline-offset-4 hover:underline"
                >
                  {t.titre}
                </Link>
                <p className="text-ink-muted text-xs">
                  {t.responsable_id ? (byId.get(t.responsable_id) ?? "—") : "Sans responsable"}
                  {t.echeance ? ` · pour le ${formatDateShort(t.echeance)}` : ""}
                </p>
              </div>
              <StatusPill status={t.statut} kind="task" />
            </li>
          ))}
        </ul>
      )}
      <Link
        href={`/taches?nouvelle=${postId}`}
        className="border-line-strong bg-surface hover:bg-surface-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold"
      >
        <Plus aria-hidden className="size-4" />
        Ajouter une tâche
      </Link>
    </section>
  );
}
