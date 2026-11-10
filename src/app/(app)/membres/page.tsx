import type { Metadata } from "next";
import { InviteDialog } from "@/components/members/InviteDialog";
import { MemberCard } from "@/components/members/MemberCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireMember } from "@/lib/auth";
import { getRoles, getTeam } from "@/lib/data";

export const metadata: Metadata = { title: "Membres et rôles" };

export default async function MembersPage() {
  const { isAdmin } = await requireMember();
  const [team, roles] = await Promise.all([getTeam(), getRoles()]);
  const visible = isAdmin ? team : team.filter((m) => m.active);

  return (
    <>
      <PageHeader
        title="Membres et rôles"
        description="Les personnes du pôle, ce qu'elles font et comment les joindre."
        actions={isAdmin ? <InviteDialog roles={roles} /> : undefined}
      />
      {visible.length === 0 ? (
        <EmptyState illustration="people" title="Aucun membre pour l'instant" description="Invite la première personne du pôle par e-mail." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((m) => (
            <li key={m.id} className="flex">
              <div className="flex w-full flex-col">
                <MemberCard member={m} roles={roles} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
