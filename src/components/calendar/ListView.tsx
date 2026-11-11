"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink, TriangleAlert } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { StatusPill } from "@/components/ui/StatusPill";
import { TypePill } from "@/components/ui/TypePill";
import { CHANNEL_LABEL, CONTENT_TYPES, POST_FORMAT_LABEL, POST_STATUSES } from "@/lib/constants";
import { calendarHref, type CalendarQuery } from "@/lib/calendar-params";
import { cn } from "@/lib/cn";
import {
  formatDateShort,
  formatDayShort,
  formatTime,
  formatWeekRange,
  isPrepLate,
  startOfWeekISO,
  type ISODate,
} from "@/lib/dates";
import type { MemberLite } from "@/lib/members";
import type { PostRow } from "@/lib/database.types";
import { PostCard } from "./PostCard";
import { usePostMutations } from "./usePostMutations";

type Props = {
  posts: PostRow[];
  people: MemberLite[];
  me: { id: string | null; isAdmin: boolean };
  today: ISODate;
  query: CalendarQuery;
};

type SortKey = "numero" | "date" | "type" | "canal" | "idee" | "responsable" | "statut";

const sortValue = (
  p: PostRow,
  key: SortKey,
  peopleById: Map<string, MemberLite>,
): string | number => {
  switch (key) {
    case "numero":
      return p.numero;
    case "date":
      return `${p.date} ${p.heure}`;
    case "type":
      return CONTENT_TYPES.indexOf(p.type);
    case "canal":
      return p.canal_principal;
    case "idee":
      return p.idee.toLowerCase();
    case "responsable":
      return (
        (p.responsable_id ? peopleById.get(p.responsable_id)?.prenom.toLowerCase() : "~") ?? "~"
      );
    case "statut":
      return POST_STATUSES.indexOf(p.statut);
  }
};

/** Liste groupée par semaine : cartes sur mobile, tableau propre sur ordinateur (tri par colonne). */
export function ListView({ posts, people, me, today, query }: Props) {
  const router = useRouter();
  const m = usePostMutations(posts);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "date", dir: 1 });
  const peopleById = new Map(people.map((p) => [p.id, p]));

  if (m.posts.length === 0) {
    return (
      <EmptyState
        illustration="calendar"
        title="Aucun post sur cette période"
        description="Ajoute le premier post du mois, ou change de période avec les flèches."
        action={
          <Link
            href={calendarHref(query, { post: "new", d: query.date })}
            scroll={false}
            className="bg-accent-strong text-on-accent inline-flex min-h-12 items-center rounded-lg px-5 text-sm font-semibold"
          >
            Ajouter un post
          </Link>
        }
      />
    );
  }

  const weeks = new Map<ISODate, PostRow[]>();
  for (const p of m.posts) {
    const w = startOfWeekISO(p.date);
    weeks.set(w, [...(weeks.get(w) ?? []), p]);
  }
  const ordered = [...weeks.entries()].sort(([a], [b]) => a.localeCompare(b));
  const canEdit = (p: PostRow) => me.isAdmin || (!!me.id && p.responsable_id === me.id);

  const th = (key: SortKey, label: string, className?: string) => {
    const active = sort.key === key;
    const Icon = !active ? ArrowUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
    return (
      <th
        scope="col"
        aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
        className={cn(
          "bg-surface-2 border-line sticky top-0 z-10 border-b px-3 text-left",
          className,
        )}
      >
        <button
          type="button"
          onClick={() =>
            setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }))
          }
          className="text-ink-muted hover:text-ink inline-flex min-h-12 items-center gap-1.5 text-xs font-semibold tracking-wide uppercase"
        >
          {label}
          <Icon aria-hidden className={cn("size-3.5", !active && "opacity-40")} />
        </button>
      </th>
    );
  };

  return (
    <div className="space-y-9">
      <Notice message={m.error} onClose={m.clearError} />
      {ordered.map(([monday, weekPosts]) => {
        const rows = [...weekPosts].sort((a, b) => {
          const [x, y] = [sortValue(a, sort.key, peopleById), sortValue(b, sort.key, peopleById)];
          return (x < y ? -1 : x > y ? 1 : 0) * sort.dir || a.numero - b.numero;
        });
        return (
          <section key={monday} aria-labelledby={`sem-${monday}`}>
            <h2 id={`sem-${monday}`} className="font-display mb-3 text-lg font-bold">
              Semaine {formatWeekRange(monday)}
              <span className="text-ink-muted ml-2 font-sans text-sm font-normal">
                {weekPosts.length} post{weekPosts.length > 1 ? "s" : ""}
              </span>
            </h2>

            {/* Mobile : une carte par post */}
            <div className="stagger grid gap-3 sm:grid-cols-2 md:hidden">
              {weekPosts.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  responsable={p.responsable_id ? (peopleById.get(p.responsable_id) ?? null) : null}
                  href={calendarHref(query, { post: p.id })}
                  today={today}
                  canEdit={canEdit(p)}
                  onStatus={m.setStatus}
                />
              ))}
            </div>

            {/* Ordinateur : vrai tableau */}
            <div className="border-line bg-surface shadow-card hidden overflow-hidden rounded-2xl border md:block">
              <table className="w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    {th("numero", "N°", "w-16")}
                    {th("date", "Date", "w-32")}
                    {th("type", "Type", "w-44")}
                    {th("canal", "Canal", "w-32")}
                    {th("idee", "Idée / scénario")}
                    {th("responsable", "Responsable", "w-44")}
                    {th("statut", "Statut", "w-40")}
                    <th
                      scope="col"
                      className="bg-surface-2 border-line sticky top-0 z-10 w-24 border-b px-3 text-left"
                    >
                      <span className="text-ink-muted text-xs font-semibold tracking-wide uppercase">
                        Lien
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => {
                    const person = p.responsable_id ? peopleById.get(p.responsable_id) : null;
                    const late = isPrepLate(p, today);
                    const href = calendarHref(query, { post: p.id });
                    const cell = "border-line h-14 border-b px-3 align-middle";
                    return (
                      <tr
                        key={p.id}
                        onClick={() => router.push(href, { scroll: false })}
                        className="hover:bg-surface-2/50 cursor-pointer transition-colors"
                      >
                        <td className={cn(cell, "text-ink-muted tabular-nums")}>{p.numero}</td>
                        <td className={cn(cell, "font-semibold whitespace-nowrap")}>
                          {formatDayShort(p.date)} {formatDateShort(p.date)}
                          <span className="text-ink-muted block text-xs font-normal">
                            {formatTime(p.heure)}
                          </span>
                        </td>
                        <td className={cell}>
                          <TypePill type={p.type} compact />
                        </td>
                        <td className={cell}>
                          {CHANNEL_LABEL[p.canal_principal]}
                          <span className="text-ink-muted block text-xs">
                            {POST_FORMAT_LABEL[p.format]}
                          </span>
                        </td>
                        <td className={cn(cell, "max-w-0")}>
                          <Link
                            href={href}
                            scroll={false}
                            onClick={(e) => e.stopPropagation()}
                            className="block truncate font-medium"
                            title={p.idee}
                          >
                            {p.idee || (
                              <span className="text-ink-muted font-normal italic">
                                Idée à définir
                              </span>
                            )}
                          </Link>
                          {late && (
                            <span className="text-accent-strong flex items-center gap-1 text-xs font-semibold">
                              <TriangleAlert aria-hidden className="size-3" />
                              Préparation en retard
                            </span>
                          )}
                        </td>
                        <td className={cell}>
                          {person ? (
                            <span className="flex items-center gap-2">
                              <Avatar name={person.name} color={person.couleur} size="sm" />
                              <span className="truncate">{person.prenom}</span>
                            </span>
                          ) : (
                            <span className="text-ink-muted italic">Personne</span>
                          )}
                        </td>
                        <td className={cell}>
                          <StatusPill status={p.statut} />
                        </td>
                        <td className={cell} onClick={(e) => e.stopPropagation()}>
                          {p.lien ? (
                            <a
                              href={p.lien}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-accent-strong inline-flex min-h-12 items-center gap-1 font-medium underline underline-offset-4"
                            >
                              Ouvrir <ExternalLink aria-hidden className="size-3.5" />
                            </a>
                          ) : (
                            <span className="text-ink-muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
