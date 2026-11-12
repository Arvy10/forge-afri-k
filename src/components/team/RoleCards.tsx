import type { RoleRow } from "@/lib/database.types";
import { roleLabel } from "@/lib/roles";

/** Mission et « ne fait pas » des rôles portés par une personne (affichés dans son espace). */
export function RoleCards({
  roles,
  memberRoleIds,
  who,
}: {
  roles: RoleRow[];
  memberRoleIds: string[];
  who?: string;
}) {
  const byId = new Map(roles.map((r) => [r.id, r]));
  const mine = roles.filter((r) => memberRoleIds.includes(r.id));
  if (mine.length === 0) return null;
  return (
    <section
      aria-label={who ? `Rôle de ${who}` : "Mon rôle"}
      className="mb-6 grid gap-3 sm:grid-cols-2"
    >
      {mine.map((r) => (
        <div key={r.id} className="bg-surface border-line rounded-2xl border p-4">
          <h2 className="font-display text-base font-bold">{roleLabel(r, byId)}</h2>
          {r.mission ? (
            <p className="text-ink-muted mt-1 text-sm">{r.mission}</p>
          ) : (
            <p className="text-ink-muted mt-1 text-sm italic">Mission pas encore renseignée.</p>
          )}
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
