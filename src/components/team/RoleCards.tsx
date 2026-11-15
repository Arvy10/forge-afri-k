import type { RoleRow, RoleTaskRow } from "@/lib/database.types";
import { roleLabel } from "@/lib/roles";
import { RoleTaskList } from "./RoleTaskList";

/**
 * Mission, « ne fait pas » et tâches habituelles des rôles portés par une personne.
 * `taskTarget` : à qui ajouter les tâches d'un clic (absent = pas de bouton).
 */
export function RoleCards({
  roles,
  memberRoleIds,
  who,
  roleTasks = [],
  taskTarget,
}: {
  roles: RoleRow[];
  memberRoleIds: string[];
  who?: string;
  roleTasks?: RoleTaskRow[];
  taskTarget?: { memberId: string | null; label: string };
}) {
  const byId = new Map(roles.map((r) => [r.id, r]));
  const mine = roles.filter((r) => memberRoleIds.includes(r.id));
  if (mine.length === 0) return null;
  const tasksOf = (roleId: string) => roleTasks.filter((t) => t.role_id === roleId);
  return (
    <section
      aria-label={who ? `Rôle de ${who}` : "Mon rôle"}
      className="mb-6 grid items-start gap-3 sm:grid-cols-2"
    >
      {mine.map((r) => {
        // Les tâches du domaine (rôle parent) comptent aussi pour un sous-rôle.
        const parent = r.parent_id ? byId.get(r.parent_id) : undefined;
        const parentShown = parent ? memberRoleIds.includes(parent.id) : true;
        return (
          <div key={r.id} className="bg-surface border-line rounded-2xl border p-4">
            <h2 className="font-display text-base font-bold">{roleLabel(r, byId)}</h2>
            {r.mission ? (
              <p className="text-ink-muted mt-1 text-sm">{r.mission}</p>
            ) : (
              <p className="text-ink-muted mt-1 text-sm italic">Mission pas encore renseignée.</p>
            )}
            {r.ne_fait_pas && (
              <p className="mt-2 text-sm">
                <strong>Ne fait pas :</strong>{" "}
                <span className="text-ink-muted">{r.ne_fait_pas}</span>
              </p>
            )}
            <RoleTaskList title="Tâches habituelles" tasks={tasksOf(r.id)} target={taskTarget} />
            {parent && !parentShown && (
              <RoleTaskList
                title={`Tâches du domaine « ${parent.nom} »`}
                tasks={tasksOf(parent.id)}
                target={taskTarget}
              />
            )}
          </div>
        );
      })}
    </section>
  );
}
