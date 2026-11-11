"use client";

import { ChevronDown } from "lucide-react";
import { TASK_STATUSES, TASK_STATUS_LABEL, type TaskStatus } from "@/lib/constants";
import { StatusPill } from "@/components/ui/StatusPill";

/** Changer le statut en un geste (liste native : s'ouvre bien au doigt). Sans droit, simple pastille. */
export function TaskStatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: TaskStatus;
  onChange: (s: TaskStatus) => void;
  disabled?: boolean;
}) {
  if (disabled) return <StatusPill status={value} kind="task" />;
  return (
    <span className="relative inline-flex">
      <span aria-hidden className="pointer-events-none">
        <StatusPill status={value} kind="task" className="pr-7" />
      </span>
      <ChevronDown
        aria-hidden
        className="text-ink-muted pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2"
      />
      <select
        aria-label="Statut de la tâche"
        value={value}
        onChange={(e) => onChange(e.target.value as TaskStatus)}
        className="absolute inset-x-0 -inset-y-3 w-full cursor-pointer opacity-0"
      >
        {TASK_STATUSES.map((s) => (
          <option key={s} value={s}>
            {TASK_STATUS_LABEL[s]}
          </option>
        ))}
      </select>
    </span>
  );
}
