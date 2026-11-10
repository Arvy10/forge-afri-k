import { cn } from "@/lib/cn";

/** Bloc gris pulsant pour les états de chargement. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("bg-surface-2 animate-shimmer rounded-lg", className)} />;
}

export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Chargement" className="space-y-4">
      <Skeleton className="h-9 w-2/3 max-w-sm" />
      <Skeleton className="h-5 w-1/2 max-w-xs" />
      <div className="grid gap-3 pt-2 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <span className="sr-only">Chargement…</span>
    </div>
  );
}
