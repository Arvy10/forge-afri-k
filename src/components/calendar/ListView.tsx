"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { LayoutGrid, Rows3, ExternalLink } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { StatusPill } from "@/components/ui/StatusPill";
import { TypePill } from "@/components/ui/TypePill";
import { CHANNEL_LABEL, POST_FORMAT_LABEL } from "@/lib/constants";
import { calendarHref, type CalendarQuery } from "@/lib/calendar-params";
import { cn } from "@/lib/cn";
import {
  formatDateShort,
  formatDayShort,
  formatWeekRange,
  isPrepLate,
  startOfWeekISO,
  type ISODate,
} from "@/lib/dates";
import type { PersonLite } from "@/lib/data";
import type { PostRow } from "@/lib/database.types";
import { PostCard } from "./PostCard";
import { usePostMutations } from "./usePostMutations";

type Mode = "table" | "cards";
const KEY = "forge.listMode";
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getMode = (): Mode => {
  try {
    return localStorage.getItem(KEY) === "cards" ? "cards" : "table";
  } catch {
    return "table";
  }
};
function setMode(m: Mode) {
  try {
    localStorage.setItem(KEY, m);
  } catch {
    /* navigation privée : on garde juste le choix de la session */
  }
  listeners.forEach((l) => l());
}

type Props = {
  posts: PostRow[];
  people: PersonLite[];
  me: { id: string; isAdmin: boolean };
  today: ISODate;
  query: CalendarQuery;
};

const COLS = [
  ["N°", "w-14"],
  ["Date", "w-28"],
  ["Jour", "w-16"],
  ["Type de contenu", "w-40"],
  ["Canal principal", "w-32"],
  ["Autres canaux", "w-36"],
  ["Format", "w-32"],
  ["Idée / scénario", "w-72"],
  ["À préparer / filmer le", "w-36"],
  ["Heure de publication", "w-28"],
  ["Légende (copywriting)", "w-80"],
  ["Responsable", "w-44"],
  ["Statut", "w-36"],
  ["Lien du post", "w-32"],
] as const;

export function ListView({ posts, people, me, today, query }: Props) {
  const router = useRouter();
  const mode = useSyncExternalStore(subscribe, getMode, () => "table" as Mode);
  const m = usePostMutations(posts);
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
            className="bg-accent-strong text-on-accent inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold"
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

  return (
    <div className="space-y-8">
      <Notice message={m.error} onClose={m.clearError} />

      <div className="flex justify-end md:hidden">
        <div
          role="group"
          aria-label="Affichage"
          className="border-line-strong bg-surface inline-flex rounded-lg border p-0.5"
        >
          {(
            [
              ["table", "Tableau", Rows3],
              ["cards", "Cartes", LayoutGrid],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-sm font-medium",
                mode === value ? "bg-forest text-on-forest" : "text-ink-muted",
              )}
            >
              <Icon aria-hidden className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {ordered.map(([monday, weekPosts]) => (
        <section key={monday} aria-labelledby={`sem-${monday}`}>
          <h2 id={`sem-${monday}`} className="font-display mb-2 text-lg font-bold">
            Semaine {formatWeekRange(monday)}
            <span className="text-ink-muted ml-2 font-sans text-sm font-normal">
              {weekPosts.length} post{weekPosts.length > 1 ? "s" : ""}
            </span>
          </h2>

          {/* Cartes (mobile, au choix) */}
          <div
            className={cn(
              "grid gap-3 sm:grid-cols-2",
              mode === "cards" ? "grid" : "hidden",
              "md:hidden",
            )}
          >
            {weekPosts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                responsable={p.responsable_id ? (peopleById.get(p.responsable_id) ?? null) : null}
                href={calendarHref(query, { post: p.id })}
                today={today}
                canEdit={me.isAdmin || p.responsable_id === me.id}
                onStatus={m.setStatus}
              />
            ))}
          </div>

          {/* Tableau */}
          <div
            className={cn(
              "border-line bg-surface scroll-thin overflow-x-auto rounded-xl border",
              mode === "cards" ? "hidden md:block" : "block",
            )}
          >
            <table className="w-max min-w-full table-fixed border-separate border-spacing-0 text-left text-sm">
              <colgroup>
                {COLS.map(([name, w]) => (
                  <col key={name} className={w} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {COLS.map(([name]) => (
                    <th
                      key={name}
                      scope="col"
                      className={cn(
                        "bg-surface-2 border-line text-ink-muted border-b px-3 py-2.5 text-xs font-semibold whitespace-nowrap",
                        name === "Date" && "sticky left-0 z-20",
                        name === "Idée / scénario" &&
                          "sticky left-28 z-20 shadow-[inset_-1px_0_0_var(--line)]",
                      )}
                    >
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weekPosts.map((p) => {
                  const person = p.responsable_id ? peopleById.get(p.responsable_id) : null;
                  const late = isPrepLate(p, today);
                  const href = calendarHref(query, { post: p.id });
                  const cell = "border-line border-b px-3 py-3 align-top";
                  return (
                    <tr
                      key={p.id}
                      onClick={() => router.push(href, { scroll: false })}
                      className="hover:bg-surface-2/50 group cursor-pointer"
                    >
                      <td className={cn(cell, "text-ink-muted tabular-nums")}>{p.numero}</td>
                      <td
                        className={cn(
                          cell,
                          "bg-surface group-hover:bg-surface-2 sticky left-0 z-10 font-semibold whitespace-nowrap",
                        )}
                      >
                        <Link
                          href={href}
                          scroll={false}
                          className="underline-offset-4 hover:underline"
                        >
                          {formatDateShort(p.date)}
                        </Link>
                      </td>
                      <td className={cn(cell, "text-ink-muted")}>{formatDayShort(p.date)}</td>
                      <td className={cell}>
                        <TypePill type={p.type} compact />
                      </td>
                      <td className={cell}>{CHANNEL_LABEL[p.canal_principal]}</td>
                      <td className={cell}>
                        {p.autres_canaux.length > 0 ? (
                          p.autres_canaux.map((c) => CHANNEL_LABEL[c]).join(", ")
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
                      </td>
                      <td className={cell}>{POST_FORMAT_LABEL[p.format]}</td>
                      <td
                        className={cn(
                          cell,
                          "bg-surface group-hover:bg-surface-2 sticky left-28 z-10 shadow-[inset_-1px_0_0_var(--line)]",
                        )}
                      >
                        <Link href={href} scroll={false} className="line-clamp-3 font-medium">
                          {p.idee || (
                            <span className="text-ink-muted font-normal italic">
                              Idée à définir
                            </span>
                          )}
                        </Link>
                      </td>
                      <td
                        className={cn(
                          cell,
                          "whitespace-nowrap",
                          late && "text-accent-strong font-semibold",
                        )}
                      >
                        {p.prep_date
                          ? `${formatDayShort(p.prep_date)} ${formatDateShort(p.prep_date)}`
                          : "—"}
                        {late && <span className="ml-1.5 text-[11px] uppercase">· en retard</span>}
                      </td>
                      <td className={cn(cell, "tabular-nums")}>{p.heure.slice(0, 5)}</td>
                      <td className={cell}>
                        {p.legende ? (
                          <span className="text-ink-muted line-clamp-3">{p.legende}</span>
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
                      </td>
                      <td className={cell}>
                        {person ? (
                          <span className="flex items-center gap-2">
                            <Avatar
                              name={person.name}
                              src={person.avatar_url}
                              id={person.id}
                              size="sm"
                            />
                            <span className="truncate">{person.name}</span>
                          </span>
                        ) : (
                          <span className="text-ink-muted italic">Sans responsable</span>
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
                            className="text-accent-strong inline-flex min-h-6 items-center gap-1 font-medium underline underline-offset-4"
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
      ))}
    </div>
  );
}
