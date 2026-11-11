import { cn } from "@/lib/cn";

/** Barre de progression accessible. `tone` : orange si des retards, vert sinon. */
export function ProgressBar({
  done,
  total,
  label,
  className,
  tone = "forest",
}: {
  done: number;
  total: number;
  label: string;
  className?: string;
  tone?: "forest" | "accent";
}) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.max(total, 1)}
      aria-valuenow={done}
      aria-valuetext={`${done} sur ${total}`}
      className={cn("bg-surface-2 h-3 w-full overflow-hidden rounded-full", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-700 ease-out",
          tone === "accent" ? "bg-accent" : "bg-forest",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
