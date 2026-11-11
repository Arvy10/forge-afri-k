"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Check, Flame, Paperclip, Pencil } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import type { TaskStatus } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { formatDueLabel } from "@/lib/dates";
import type { MemberLite } from "@/lib/members";
import { isLate } from "@/lib/progress";
import type { TaskView } from "@/server/tasks";
import { TaskStatusSelect } from "./TaskStatusSelect";

type SortKey = "titre" | "membre" | "echeance" | "priorite" | "statut";
const STATUS_ORDER: Record<TaskStatus, number> = { a_faire: 0, en_cours: 1, fait: 2 };

/** Tableau pour ordinateur : en-tête collant, lignes de 56 px, tri par colonne. */
export function TasksTable({
  tasks,
  members,
  me,
  today,
  onToggle,
  onStatus,
  onEdit,
}: {
  tasks: TaskView[];
  members: MemberLite[];
  me: { id: string | null; isAdmin: boolean };
  today: string;
  onToggle: (id: string, s: TaskStatus) => void;
  onStatus: (id: string, s: TaskStatus) => void;
  onEdit: (t: TaskView) => void;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "echeance", dir: 1 });
  const byId = new Map(members.map((m) => [m.id, m]));

  const value = (t: TaskView): string | number => {
    switch (sort.key) {
      case "titre":
        return t.titre.toLowerCase();
      case "membre":
        return (t.member_id ? byId.get(t.member_id)?.prenom.toLowerCase() : "") ?? "";
      case "echeance":
        return t.echeance ?? "9999-12-31";
      case "priorite":
        return t.priorite === "haute" ? 0 : 1;
      case "statut":
        return STATUS_ORDER[t.statut];
    }
  };
  const sorted = [...tasks].sort((a, b) => {
    const [x, y] = [value(a), value(b)];
    return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
  });

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
    <div className="border-line bg-surface shadow-card overflow-hidden rounded-2xl border">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th
              scope="col"
              className="bg-surface-2 border-line sticky top-0 z-10 w-14 border-b px-3"
            >
              <span className="sr-only">Fait</span>
            </th>
            {th("titre", "Tâche")}
            {th("membre", "Pour", "w-44")}
            {th("echeance", "Échéance", "w-40")}
            {th("priorite", "Priorité", "w-32")}
            {th("statut", "Statut", "w-40")}
            <th
              scope="col"
              className="bg-surface-2 border-line sticky top-0 z-10 w-24 border-b px-3 text-left"
            >
              <span className="text-ink-muted text-xs font-semibold tracking-wide uppercase">
                Livrables
              </span>
            </th>
            <th
              scope="col"
              className="bg-surface-2 border-line sticky top-0 z-10 w-14 border-b px-3"
            >
              <span className="sr-only">Modifier</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) => {
            const done = t.statut === "fait";
            const late = isLate(t, today);
            const owner = t.member_id ? byId.get(t.member_id) : null;
            const canToggle = me.isAdmin || (!!me.id && t.member_id === me.id);
            const canEdit =
              me.isAdmin || (!!me.id && (t.member_id === me.id || t.cree_par === me.id));
            const cell = "border-line h-14 border-b px-3 align-middle";
            return (
              <tr key={t.id} className="hover:bg-surface-2/50 transition-colors">
                <td className={cell}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={done}
                    aria-label={done ? `Rouvrir : ${t.titre}` : `Marquer comme faite : ${t.titre}`}
                    disabled={!canToggle}
                    onClick={() => onToggle(t.id, done ? "a_faire" : "fait")}
                    className="-m-2 inline-flex size-12 items-center justify-center disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span
                      className={cn(
                        "inline-flex size-7 items-center justify-center rounded-lg border-2",
                        done
                          ? "border-success bg-success text-canvas"
                          : "border-line-strong bg-canvas",
                      )}
                    >
                      {done && <Check aria-hidden className="size-4" strokeWidth={3.5} />}
                    </span>
                  </button>
                </td>
                <td className={cn(cell, "max-w-0")}>
                  <span
                    className={cn(
                      "block truncate font-semibold",
                      done && "text-ink-muted line-through",
                    )}
                    title={t.titre}
                  >
                    {t.titre}
                  </span>
                  {t.postLabel && (
                    <span className="text-ink-muted block truncate text-xs">{t.postLabel}</span>
                  )}
                </td>
                <td className={cell}>
                  {owner ? (
                    <span className="flex items-center gap-2">
                      <Avatar name={owner.name} color={owner.couleur} size="sm" />
                      <span className="truncate font-medium">{owner.prenom}</span>
                    </span>
                  ) : (
                    <span className="text-ink-muted italic">Personne</span>
                  )}
                </td>
                <td
                  className={cn(
                    cell,
                    "whitespace-nowrap",
                    late && "text-accent-strong font-semibold",
                  )}
                >
                  {t.echeance ? (
                    `${late ? "En retard · " : ""}${formatDueLabel(t.echeance, today)}`
                  ) : (
                    <span className="text-ink-muted">—</span>
                  )}
                </td>
                <td className={cell}>
                  {t.priorite === "haute" ? (
                    <span className="text-danger inline-flex items-center gap-1 font-semibold">
                      <Flame aria-hidden className="size-4" />
                      Haute
                    </span>
                  ) : (
                    <span className="text-ink-muted">Normale</span>
                  )}
                </td>
                <td className={cell}>
                  <TaskStatusSelect
                    value={t.statut}
                    disabled={!canToggle}
                    onChange={(s) => onStatus(t.id, s)}
                  />
                </td>
                <td className={cell}>
                  {t.deliverables.length > 0 ? (
                    <span className="inline-flex items-center gap-1 font-medium">
                      <Paperclip aria-hidden className="size-4" />
                      {t.deliverables.length}
                    </span>
                  ) : (
                    <span className="text-ink-muted">—</span>
                  )}
                </td>
                <td className={cell}>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(t)}
                      aria-label={`Modifier : ${t.titre}`}
                      className="text-ink-muted hover:text-ink hover:bg-surface-2 -m-1 inline-flex size-12 items-center justify-center rounded-lg"
                    >
                      <Pencil aria-hidden className="size-4" />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
