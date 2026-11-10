import { CONTENT_TYPE_META, type ContentType } from "@/lib/constants";
import { cn } from "@/lib/cn";

/** Classes littérales (Tailwind doit les voir en entier pour les générer). */
export const TYPE_CLASSES: Record<
  ContentType,
  { pill: string; dot: string; bar: string; soft: string }
> = {
  impact: {
    pill: "bg-t-impact-bg text-t-impact-fg",
    dot: "bg-t-impact-dot",
    bar: "border-t-t-impact-dot",
    soft: "bg-t-impact-bg/60",
  },
  patrimoine: {
    pill: "bg-t-patrimoine-bg text-t-patrimoine-fg",
    dot: "bg-t-patrimoine-dot",
    bar: "border-t-t-patrimoine-dot",
    soft: "bg-t-patrimoine-bg/60",
  },
  coulisses: {
    pill: "bg-t-coulisses-bg text-t-coulisses-fg",
    dot: "bg-t-coulisses-dot",
    bar: "border-t-t-coulisses-dot",
    soft: "bg-t-coulisses-bg/60",
  },
  fun: {
    pill: "bg-t-fun-bg text-t-fun-fg",
    dot: "bg-t-fun-dot",
    bar: "border-t-t-fun-dot",
    soft: "bg-t-fun-bg/60",
  },
  appel_action: {
    pill: "bg-t-appel_action-bg text-t-appel_action-fg",
    dot: "bg-t-appel_action-dot",
    bar: "border-t-t-appel_action-dot",
    soft: "bg-t-appel_action-bg/60",
  },
};

export function TypePill({
  type,
  className,
  compact,
}: {
  type: ContentType;
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full text-xs font-semibold whitespace-nowrap",
        compact ? "px-2 py-0.5" : "px-2.5 py-1",
        TYPE_CLASSES[type].pill,
        className,
      )}
    >
      <span aria-hidden className={cn("size-2 rounded-full", TYPE_CLASSES[type].dot)} />
      {CONTENT_TYPE_META[type].label}
    </span>
  );
}
