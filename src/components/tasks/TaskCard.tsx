"use client";

import Link from "next/link";
import { CalendarDays, Flame, Link2, TriangleAlert } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import type { TaskStatus } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { formatDateShort } from "@/lib/dates";
import type { PersonLite } from "@/lib/data";
import type { TaskRow } from "@/lib/database.types";
import { TaskStatusSelect } from "./TaskStatusSelect";

export function isTaskLate(t: Pick<TaskRow, "echeance" | "statut">, today: string) {
  return t.statut !== "valide" && !!t.echeance && t.echeance < today;
}

export function TaskCard({
  task,
  href,
  responsable,
  today,
  canEdit,
  postLabel,
  onStatus,
}: {
  task: TaskRow;
  href: string;
  responsable: PersonLite | null;
  today: string;
  canEdit: boolean;
  postLabel?: string;
  onStatus: (id: string, s: TaskStatus) => void;
}) {
  const late = isTaskLate(task, today);
  return (
    <article
      className={cn(
        "bg-surface border-line shadow-card lift relative flex flex-col gap-2.5 rounded-xl border p-3",
        late && "outline-accent outline-2 -outline-offset-1",
        task.statut === "valide" && "opacity-75",
      )}
    >
      <Link
        href={href}
        scroll={false}
        className={cn(
          "text-sm leading-snug font-medium after:absolute after:inset-0 after:content-['']",
          task.statut === "valide" && "line-through",
        )}
      >
        {task.titre}
      </Link>
      <div className="text-ink-muted flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {task.echeance && (
          <span
            className={cn(
              "inline-flex items-center gap-1",
              late && "text-accent-strong font-semibold",
            )}
          >
            {late ? (
              <TriangleAlert aria-hidden className="size-3.5" />
            ) : (
              <CalendarDays aria-hidden className="size-3.5" />
            )}
            {late ? "En retard · " : ""}
            {formatDateShort(task.echeance)}
          </span>
        )}
        {task.priorite === "haute" && (
          <span className="text-danger inline-flex items-center gap-1 font-semibold">
            <Flame aria-hidden className="size-3.5" />
            Priorité haute
          </span>
        )}
        {postLabel && (
          <span className="inline-flex items-center gap-1">
            <Link2 aria-hidden className="size-3.5" />
            {postLabel}
          </span>
        )}
      </div>
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
        <span className="flex max-w-full shrink-0 items-center gap-2">
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
        <TaskStatusSelect
          value={task.statut}
          disabled={!canEdit}
          onChange={(s) => onStatus(task.id, s)}
        />
      </div>
    </article>
  );
}
