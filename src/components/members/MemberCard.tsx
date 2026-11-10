import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import type { Member } from "@/lib/data";
import type { RoleRow } from "@/lib/database.types";

export function waLink(number: string) {
  const digits = number.replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

export function MemberCard({ member, roles }: { member: Member; roles: RoleRow[] }) {
  const mine = roles.filter((r) => member.role_ids.includes(r.id));
  const wa = waLink(member.whatsapp);
  const name = member.full_name || member.email;
  return (
    <article className="bg-surface border-line shadow-card relative flex flex-col gap-3 rounded-2xl border p-4">
      <div className="flex items-start gap-3">
        <Avatar name={name} src={member.avatar_url} id={member.id} size="lg" />
        <div className="min-w-0">
          <h2 className="font-display text-lg leading-tight font-bold">
            <Link
              href={`/membres/${member.id}`}
              className="after:absolute after:inset-0 after:content-['']"
            >
              {name}
            </Link>
          </h2>
          <p className="text-ink-muted mt-0.5 text-sm">
            {mine.length > 0
              ? mine.map((r) => r.name).join(" · ")
              : member.access_role === "admin"
                ? "Administrateur"
                : "Rôle à définir"}
          </p>
          {!member.active && (
            <span className="bg-danger-soft text-danger mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold">
              Désactivé
            </span>
          )}
          {!member.onboarded && member.active && (
            <span className="bg-accent-soft text-accent-strong mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold">
              Invitation en attente
            </span>
          )}
        </div>
      </div>
      {member.bio && <p className="text-ink-muted line-clamp-3 text-sm">{member.bio}</p>}
      <div className="relative z-10 mt-auto flex flex-wrap gap-2">
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="border-line-strong hover:bg-surface-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium"
          >
            <MessageCircle aria-hidden className="size-4" />
            WhatsApp
          </a>
        )}
        <a
          href={`mailto:${member.email}`}
          className="border-line-strong hover:bg-surface-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium"
        >
          <Mail aria-hidden className="size-4" />
          E-mail
        </a>
      </div>
    </article>
  );
}
