import { Check } from "lucide-react";
import {
  POST_STATUS_LABEL,
  TASK_STATUS_LABEL,
  type PostStatus,
  type TaskStatus,
} from "@/lib/constants";
import { cn } from "@/lib/cn";

const DOT: Record<PostStatus, string> = {
  a_faire: "bg-[var(--s-a_faire)]",
  en_cours: "bg-[var(--s-en_cours)]",
  pret_a_valider: "bg-[var(--s-pret_a_valider)]",
  valide: "bg-[var(--s-valide)]",
  publie: "bg-[var(--s-publie)]",
};

/** Pastille de statut : point coloré + libellé (la couleur n'est jamais seule). */
export function StatusPill({
  status,
  kind = "post",
  className,
}: {
  status: PostStatus | TaskStatus;
  kind?: "post" | "task";
  className?: string;
}) {
  const label =
    kind === "task"
      ? TASK_STATUS_LABEL[status as TaskStatus]
      : POST_STATUS_LABEL[status as PostStatus];
  return (
    <span
      className={cn(
        "border-line-strong bg-surface text-ink inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        className,
      )}
    >
      {status === "publie" ? (
        <Check aria-hidden className="size-3 text-[var(--s-publie)]" strokeWidth={3} />
      ) : (
        <span aria-hidden className={cn("size-2 rounded-full", DOT[status as PostStatus])} />
      )}
      {label}
    </span>
  );
}
