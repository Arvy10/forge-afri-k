import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, MessageCircle } from "lucide-react";
import { MemberAdminPanel } from "@/components/members/MemberAdminPanel";
import { waLink } from "@/components/members/MemberCard";
import { Avatar } from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/StatusPill";
import { TypePill } from "@/components/ui/TypePill";
import { requireMember } from "@/lib/auth";
import { getRoles, getTeam } from "@/lib/data";
import { formatDateShort, formatDayShort, todayISO } from "@/lib/dates";
import type { PostRow, TaskRow } from "@/lib/database.types";
import { z } from "zod";

export const metadata: Metadata = { title: "Fiche membre" };

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase, profile, isAdmin } = await requireMember();
  const [team, roles] = await Promise.all([getTeam(), getRoles()]);
  const member = team.find((m) => m.id === id);
  if (!member || (!member.active && !isAdmin)) notFound();

  const today = todayISO();
  const [{ data: posts }, { data: tasks }] = await Promise.all([
    supabase
      .from("posts")
      .select("*")
      .eq("responsable_id", id)
      .neq("statut", "publie")
      .gte("date", today)
      .order("date")
      .limit(10),
    supabase
      .from("tasks")
      .select("*")
      .eq("responsable_id", id)
      .neq("statut", "valide")
      .order("echeance", { nullsFirst: false })
      .limit(10),
  ]);
  const name = member.full_name || member.email;
  const mine = roles.filter((r) => member.role_ids.includes(r.id));
  const wa = waLink(member.whatsapp);

  return (
    <div className="max-w-4xl space-y-6">
      <header className="bg-surface border-line shadow-card flex flex-wrap items-start gap-4 rounded-2xl border p-5">
        <Avatar name={name} src={member.avatar_url} id={member.id} size="xl" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold md:text-3xl">{name}</h1>
          <p className="text-ink-muted mt-1">
            {mine.length > 0 ? mine.map((r) => r.name).join(" · ") : "Rôle à définir"}
            {member.access_role === "admin" && " · Administrateur"}
          </p>
          {member.bio && <p className="mt-3 max-w-2xl text-sm">{member.bio}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="border-line-strong hover:bg-surface-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium"
              >
                <MessageCircle aria-hidden className="size-4" />
                {member.whatsapp}
              </a>
            )}
            <a
              href={`mailto:${member.email}`}
              className="border-line-strong hover:bg-surface-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium"
            >
              <Mail aria-hidden className="size-4" />
              {member.email}
            </a>
            {profile.id === member.id && (
              <Link
                href="/profil"
                className="bg-accent-strong text-on-accent inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold"
              >
                Modifier mon profil
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Mission", member.mission, mine.map((r) => r.mission).join(" ")],
          ["Ce que cette personne fait", member.does, ""],
          ["Ce qu'elle ne fait pas", member.does_not, ""],
        ].map(([title, text, fallback]) => (
          <section key={title} className="bg-surface border-line rounded-2xl border p-4">
            <h2 className="font-display text-base font-bold">{title}</h2>
            <p className="text-ink-muted mt-2 text-sm whitespace-pre-wrap">
              {text || fallback || "Pas encore renseigné."}
            </p>
          </section>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section
          className="bg-surface border-line rounded-2xl border p-4"
          aria-labelledby="posts-en-cours"
        >
          <h2 id="posts-en-cours" className="font-display mb-2 text-lg font-bold">
            Posts à venir
          </h2>
          {(posts ?? []).length === 0 ? (
            <p className="text-ink-muted text-sm">Aucun post à venir pour cette personne.</p>
          ) : (
            <ul className="divide-line divide-y">
              {((posts ?? []) as PostRow[]).map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/calendrier?post=${p.id}&date=${p.date}`}
                    className="flex min-h-11 flex-wrap items-center justify-between gap-2 py-2.5"
                  >
                    <span className="min-w-0">
                      <span className="line-clamp-1 block text-sm font-medium">
                        {p.idee || "Idée à définir"}
                      </span>
                      <span className="text-ink-muted flex items-center gap-2 text-xs">
                        {formatDayShort(p.date)} {formatDateShort(p.date)}{" "}
                        <TypePill type={p.type} compact />
                      </span>
                    </span>
                    <StatusPill status={p.statut} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section
          className="bg-surface border-line rounded-2xl border p-4"
          aria-labelledby="taches-en-cours"
        >
          <h2 id="taches-en-cours" className="font-display mb-2 text-lg font-bold">
            Tâches ouvertes
          </h2>
          {(tasks ?? []).length === 0 ? (
            <p className="text-ink-muted text-sm">Aucune tâche ouverte.</p>
          ) : (
            <ul className="divide-line divide-y">
              {((tasks ?? []) as TaskRow[]).map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/taches?tache=${t.id}`}
                    className="flex min-h-11 flex-wrap items-center justify-between gap-2 py-2.5"
                  >
                    <span className="min-w-0">
                      <span className="line-clamp-1 block text-sm font-medium">{t.titre}</span>
                      <span className="text-ink-muted text-xs">
                        {t.echeance ? `Pour le ${formatDateShort(t.echeance)}` : "Sans échéance"}
                      </span>
                    </span>
                    <StatusPill status={t.statut} kind="task" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {isAdmin && (
        <MemberAdminPanel
          profileId={member.id}
          isSelf={profile.id === member.id}
          roles={roles}
          roleIds={member.role_ids}
          accessRole={member.access_role}
          active={member.active}
        />
      )}
    </div>
  );
}
