"use client";

import { ChevronDown } from "lucide-react";
import { POST_STATUSES, POST_STATUS_LABEL, type PostStatus } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { StatusPill } from "@/components/ui/StatusPill";

/**
 * Changement de statut en un geste (liste native : s'ouvre bien au doigt).
 * Sans droit de modification, on affiche simplement la pastille.
 */
export function StatusSelect({
  value,
  onChange,
  disabled,
  className,
}: {
  value: PostStatus;
  onChange: (next: PostStatus) => void;
  disabled?: boolean;
  className?: string;
}) {
  if (disabled) return <StatusPill status={value} className={className} />;
  return (
    <span className={cn("relative inline-flex", className)}>
      <span aria-hidden className="pointer-events-none">
        <StatusPill status={value} className="pr-7" />
      </span>
      <ChevronDown
        aria-hidden
        className="text-ink-muted pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2"
      />
      <select
        aria-label="Statut du post"
        value={value}
        onChange={(e) => onChange(e.target.value as PostStatus)}
        className="absolute inset-x-0 -inset-y-2.5 w-full cursor-pointer opacity-0"
      >
        {POST_STATUSES.map((s) => (
          <option key={s} value={s}>
            {POST_STATUS_LABEL[s]}
          </option>
        ))}
      </select>
    </span>
  );
}
