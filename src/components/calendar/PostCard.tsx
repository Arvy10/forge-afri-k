"use client";

import Link from "next/link";
import { CalendarClock, TriangleAlert } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { TYPE_CLASSES, TypePill } from "@/components/ui/TypePill";
import { POST_FORMAT_LABEL, type PostStatus } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { formatDayShort, formatDateShort, isOffRhythm, isPrepLate } from "@/lib/dates";
import type { PostRow } from "@/lib/database.types";
import type { PersonLite } from "@/lib/data";
import { ChannelChips } from "./ChannelChips";
import { StatusSelect } from "./StatusSelect";

export type PostCardProps = {
  post: PostRow;
  responsable: PersonLite | null;
  href: string;
  today: string;
  canEdit: boolean;
  /** Affiche la pastille de type (inutile dans une colonne qui porte déjà le type). */
  showType?: boolean;
  onStatus?: (id: string, status: PostStatus) => void;
  draggable?: boolean;
  dragging?: boolean;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onDragEnd?: () => void;
  className?: string;
};

export function PostCard({
  post,
  responsable,
  href,
  today,
  canEdit,
  showType = true,
  onStatus,
  draggable,
  dragging,
  onDragStart,
  onDragEnd,
  className,
}: PostCardProps) {
  const late = isPrepLate(post, today);
  const offRhythm = isOffRhythm(post.type, post.date);
  return (
    <article
      draggable={draggable}
      onDragStart={draggable ? (e) => onDragStart?.(e, post.id) : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
      className={cn(
        "bg-surface border-line shadow-card relative flex flex-col gap-2.5 rounded-xl border border-t-4 p-3 transition-shadow hover:shadow-md",
        TYPE_CLASSES[post.type].bar,
        late && "outline-accent outline-2 -outline-offset-1",
        dragging && "opacity-40",
        draggable && "cursor-grab active:cursor-grabbing",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {showType && <TypePill type={post.type} compact />}
          {!showType && offRhythm && <TypePill type={post.type} compact />}
          {late && (
            <span className="bg-accent-soft text-accent-strong inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold">
              <TriangleAlert aria-hidden className="size-3" />
              En retard
            </span>
          )}
        </div>
        <span className="text-ink-muted shrink-0 text-xs tabular-nums">N° {post.numero}</span>
      </div>

      <Link
        href={href}
        scroll={false}
        className="text-ink line-clamp-3 text-sm leading-snug font-medium after:absolute after:inset-0 after:content-['']"
      >
        {post.idee ? (
          post.idee
        ) : (
          <span className="text-ink-muted font-normal italic">Idée à définir</span>
        )}
      </Link>

      <div className="text-ink-muted flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <ChannelChips main={post.canal_principal} others={post.autres_canaux} />
        <span>{POST_FORMAT_LABEL[post.format]}</span>
        <span className="tabular-nums">{post.heure.slice(0, 5)}</span>
      </div>

      {post.prep_date && (
        <p
          className={cn(
            "flex items-center gap-1.5 text-xs",
            late ? "text-accent-strong font-semibold" : "text-ink-muted",
          )}
        >
          <CalendarClock aria-hidden className="size-3.5 shrink-0" />À préparer le{" "}
          {formatDayShort(post.prep_date)} {formatDateShort(post.prep_date)}
        </p>
      )}

      <div className="relative z-10 mt-auto flex items-center justify-between gap-2 pt-0.5">
        <span className="flex min-w-0 items-center gap-2">
          {responsable ? (
            <>
              <Avatar
                name={responsable.name}
                src={responsable.avatar_url}
                id={responsable.id}
                size="sm"
              />
              <span className="truncate text-xs font-medium">{responsable.name.split(" ")[0]}</span>
            </>
          ) : (
            <span className="text-ink-muted text-xs italic">Sans responsable</span>
          )}
        </span>
        <StatusSelect
          value={post.statut}
          disabled={!canEdit || !onStatus}
          onChange={(s) => onStatus?.(post.id, s)}
        />
      </div>
    </article>
  );
}
