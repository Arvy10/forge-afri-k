"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { TYPE_CLASSES } from "@/components/ui/TypePill";
import { CONTENT_TYPE_META } from "@/lib/constants";
import { calendarHref, type CalendarQuery } from "@/lib/calendar-params";
import { cn } from "@/lib/cn";
import {
  defaultTypeForDate,
  formatDateShort,
  formatDayLong,
  isoWeekday,
  type ISODate,
} from "@/lib/dates";
import type { PersonLite } from "@/lib/data";
import type { PostRow } from "@/lib/database.types";
import { PostCard } from "./PostCard";
import { usePostMutations } from "./usePostMutations";

type Props = {
  /** Jours affichés en colonnes (lundi → vendredi). */
  days: ISODate[];
  posts: PostRow[];
  people: PersonLite[];
  me: { id: string; isAdmin: boolean };
  today: ISODate;
  query: CalendarQuery;
  /** Désactive le glisser-déposer (accueil, vue filtrée…). */
  allowDrag?: boolean;
};

export function WeekBoard({ days, posts, people, me, today, query, allowDrag = true }: Props) {
  const {
    posts: optimisticPosts,
    setStatus: onStatus,
    move,
    error,
    clearError,
  } = usePostMutations(posts);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overDate, setOverDate] = useState<ISODate | null>(null);

  const peopleById = new Map(people.map((p) => [p.id, p]));
  const canEdit = (p: PostRow) => me.isAdmin || p.responsable_id === me.id;
  const weekend = optimisticPosts.filter((p) => !days.includes(p.date));

  const onDrop = (date: ISODate) => {
    const id = dragId;
    setDragId(null);
    setOverDate(null);
    if (!id) return;
    const post = optimisticPosts.find((p) => p.id === id);
    if (!post || post.date === date) return;
    move(id, date);
  };

  const renderCard = (p: PostRow, showType: boolean) => (
    <PostCard
      key={p.id}
      post={p}
      responsable={p.responsable_id ? (peopleById.get(p.responsable_id) ?? null) : null}
      href={calendarHref(query, { post: p.id })}
      today={today}
      canEdit={canEdit(p)}
      showType={showType}
      onStatus={onStatus}
      draggable={allowDrag && canEdit(p)}
      dragging={dragId === p.id}
      onDragStart={(e, id) => {
        e.dataTransfer.setData("text/plain", id);
        e.dataTransfer.effectAllowed = "move";
        setDragId(id);
      }}
      onDragEnd={() => {
        setDragId(null);
        setOverDate(null);
      }}
    />
  );

  return (
    <div>
      <Notice message={error} onClose={clearError} />
      <div className="grid gap-4 md:grid-cols-5 md:gap-3">
        {days.map((date) => {
          const expected = defaultTypeForDate(date);
          const dayPosts = optimisticPosts.filter((p) => p.date === date);
          const isToday = date === today;
          const isOver = overDate === date && dragId !== null;
          return (
            <section
              key={date}
              aria-labelledby={`col-${date}`}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (overDate !== date) setOverDate(date);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node))
                  setOverDate((d) => (d === date ? null : d));
              }}
              onDrop={(e) => {
                e.preventDefault();
                onDrop(date);
              }}
              className={cn(
                "bg-surface-2/50 flex min-w-0 flex-col gap-3 rounded-2xl p-2 transition-colors",
                isToday && "ring-accent ring-2",
                isOver && "bg-accent-soft ring-accent ring-dashed ring-2",
              )}
            >
              <header
                className={cn(
                  "rounded-xl px-3 py-2",
                  expected ? TYPE_CLASSES[expected].pill : "bg-surface-2 text-ink",
                )}
              >
                <h2 id={`col-${date}`} className="font-display text-base font-bold capitalize">
                  {formatDayLong(date).split(" ")[0]}
                  {isToday && (
                    <span className="bg-accent-strong text-on-accent ml-2 rounded-full px-2 py-0.5 align-middle font-sans text-[10px] font-bold uppercase">
                      Aujourd&apos;hui
                    </span>
                  )}
                </h2>
                <p className="text-xs font-medium opacity-90">
                  {formatDateShort(date)}
                  {expected && <> · {CONTENT_TYPE_META[expected].label}</>}
                </p>
              </header>

              {dayPosts.length === 0 ? (
                <EmptyState
                  compact
                  illustration="day"
                  title="Rien de prévu"
                  action={
                    <Link
                      href={calendarHref(query, { post: "new", d: date })}
                      scroll={false}
                      className="border-line-strong bg-surface hover:bg-surface-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold"
                    >
                      <Plus aria-hidden className="size-4" />
                      Ajouter un post
                    </Link>
                  }
                />
              ) : (
                <>
                  {dayPosts.map((p) => renderCard(p, false))}
                  <Link
                    href={calendarHref(query, { post: "new", d: date })}
                    scroll={false}
                    className="text-ink-muted hover:text-ink hover:bg-surface inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg text-sm font-medium"
                  >
                    <Plus aria-hidden className="size-4" />
                    Ajouter un post
                  </Link>
                </>
              )}
            </section>
          );
        })}
      </div>

      {weekend.length > 0 && (
        <section className="mt-6" aria-labelledby="weekend">
          <h2 id="weekend" className="font-display mb-2 text-base font-bold">
            Posts hors rythme (week-end)
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {weekend.map((p) => (
              <div key={p.id}>
                <p className="text-ink-muted mb-1 text-xs font-medium capitalize">
                  {isoWeekday(p.date) === 6 ? "Samedi" : "Dimanche"} {formatDateShort(p.date)}
                </p>
                {renderCard(p, true)}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
