import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Member } from "@/lib/data";
import type { RoleRow } from "@/lib/database.types";

export function TeamStrip({ members, roles }: { members: Member[]; roles: RoleRow[] }) {
  if (members.length === 0)
    return <EmptyState compact illustration="people" title="L'équipe est en train de se former" />;
  const roleName = new Map(roles.map((r) => [r.id, r.name]));
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-2">
      {members.map((m) => (
        <li key={m.id}>
          <Link
            href={`/membres/${m.id}`}
            className="hover:bg-surface-2 flex min-h-11 items-center gap-3 rounded-xl p-2"
          >
            <Avatar name={m.full_name || m.email} src={m.avatar_url} id={m.id} size="md" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{m.full_name || m.email}</span>
              <span className="text-ink-muted block truncate text-xs">
                {m.role_ids
                  .map((id) => roleName.get(id))
                  .filter(Boolean)
                  .join(", ") || (m.access_role === "admin" ? "Ambassadeur" : "Membre")}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
