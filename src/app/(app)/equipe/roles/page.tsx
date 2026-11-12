import type { Metadata } from "next";
import Link from "next/link";
import { Settings, TriangleAlert } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { roleTree } from "@/lib/roles";
import type { RoleRow } from "@/lib/database.types";
import { requireSession } from "@/server/session";
import { getActiveTeam, getRoles } from "@/server/team";

export const metadata: Metadata = { title: "Rôles du pôle" };

export default async function RolesPage() {
  const auth = await requireSession();
  const [roles, team] = await Promise.all([getRoles(), getActiveTeam()]);
  const holdersOf = (id: string) => team.filter((m) => m.roleIds.includes(id));
  const vacant = roles.filter((r) => holdersOf(r.id).length === 0);

  const card = (role: RoleRow, sub = false) => {
    const holders = holdersOf(role.id);
    return (
      <li key={role.id} className={sub ? "border-line ml-4 border-l-2 pl-4" : undefined}>
        <div className="bg-surface border-line shadow-card flex h-full flex-col gap-3 rounded-2xl border p-4">
          <div>
            <h2 className="font-display text-lg font-bold">
              {sub && "↳ "}
              {role.nom}
            </h2>
            {role.mission && <p className="text-ink-muted mt-1 text-sm">{role.mission}</p>}
            {role.ne_fait_pas && (
              <p className="mt-2 text-sm">
                <strong>Ne fait pas :</strong>{" "}
                <span className="text-ink-muted">{role.ne_fait_pas}</span>
              </p>
            )}
          </div>
          {holders.length === 0 ? (
            <p className="bg-accent-soft text-accent-strong mt-auto inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold">
              <TriangleAlert aria-hidden className="size-3.5" />
              Sans titulaire
            </p>
          ) : (
            <ul className="mt-auto flex flex-wrap gap-2">
              {holders.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/equipe/${m.id}`}
                    className="hover:bg-surface-2 flex min-h-12 items-center gap-2 rounded-full py-1 pr-3 pl-1"
                  >
                    <Avatar name={m.name} color={m.couleur} size="sm" />
                    <span className="text-sm font-medium">{m.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </li>
    );
  };

  return (
    <>
      <PageHeader
        title="Rôles du pôle"
        description="Qui fait quoi. Plusieurs personnes peuvent porter le même rôle, et un rôle peut avoir des sous-rôles."
        actions={
          auth.isAdmin ? (
            <Link
              href="/reglages"
              className="border-line-strong bg-surface hover:bg-surface-2 inline-flex min-h-12 items-center gap-2 rounded-lg border px-4 text-sm font-semibold"
            >
              <Settings aria-hidden className="size-4" />
              Gérer les rôles
            </Link>
          ) : undefined
        }
      />
      {vacant.length > 0 && roles.length > 0 && (
        <p
          role="status"
          className="bg-accent-soft text-ink mb-5 flex items-start gap-2 rounded-xl px-4 py-3 text-sm"
        >
          <TriangleAlert aria-hidden className="text-accent-strong mt-0.5 size-4 shrink-0" />
          <span>
            <strong>
              {vacant.length === 1
                ? "1 rôle n'a pas de titulaire"
                : `${vacant.length} rôles n'ont pas de titulaire`}{" "}
              :
            </strong>{" "}
            {vacant.map((r) => r.nom).join(", ")}.
          </span>
        </p>
      )}
      <ul className="stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {roleTree(roles).map(({ role, children }) => (
          <li key={role.id} className="space-y-3">
            <ul>{card(role)}</ul>
            {children.length > 0 && (
              <ul className="space-y-3">{children.map((c) => card(c, true))}</ul>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
