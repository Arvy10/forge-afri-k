import { Illustration, type IllustrationKind } from "./Illustration";
import { cn } from "@/lib/cn";

type EmptyStateProps = {
  illustration?: IllustrationKind;
  title: string;
  description?: string;
  /** Bouton ou lien d'action. */
  action?: React.ReactNode;
  className?: string;
  /** Variante compacte pour les colonnes et les petits blocs. */
  compact?: boolean;
};

/** État vide dessiné : illustration, phrase claire, bouton d'action. */
export function EmptyState({
  illustration = "calendar",
  title,
  description,
  action,
  className,
  compact,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "border-line-strong flex flex-col items-center rounded-2xl border border-dashed text-center",
        compact ? "gap-2 px-4 py-6" : "gap-3 px-6 py-12",
        className,
      )}
    >
      <Illustration kind={illustration} className={compact ? "h-16" : "h-28"} />
      <h3 className={cn("font-display text-ink font-semibold", compact ? "text-sm" : "text-lg")}>
        {title}
      </h3>
      {description && <p className="text-ink-muted max-w-md text-sm">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
