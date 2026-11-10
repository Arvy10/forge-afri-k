import type { Metadata } from "next";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireMember } from "@/lib/auth";
import { getRoles, getTeam } from "@/lib/data";

export const metadata: Metadata = { title: "Rôles du pôle" };

export default async function RolesPage() {
  await requireMember();
  const [team, roles] = await Promise.all([getTeam(), getRoles()]);
  const active = team.filter((m) => m.active);
  const vacant = roles.filter((r) => !active.some((m) => m.role_ids.includes(r.id)));

  return (
    <>
      <PageHeader
        title="Rôles du pôle"
        description="Un membre peut avoir plusieurs rôles ; un rôle peut être tenu par plusieurs membres."
      />
      {vacant.length > 0 && (
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
            {vacant.map((r) => r.name).join(", ")}.
          </span>
        </p>
      )}
      <ul className="stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {roles.map((r) => {
          const holders = active.filter((m) => m.role_ids.includes(r.id));
          return (
            <li
              key={r.id}
              className="bg-surface border-line shadow-card lift flex flex-col gap-3 rounded-2xl border p-4"
            >
              <div>
                <h2 className="font-display text-lg font-bold">{r.name}</h2>
                <p className="text-ink-muted mt-1 text-sm">{r.mission}</p>
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
                        href={`/membres/${m.id}`}
                        className="hover:bg-surface-2 flex min-h-11 items-center gap-2 rounded-full py-1 pr-3 pl-1"
                      >
                        <Avatar
                          name={m.full_name || m.email}
                          src={m.avatar_url}
                          id={m.id}
                          size="sm"
                        />
                        <span className="text-sm font-medium">{m.full_name || m.email}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
