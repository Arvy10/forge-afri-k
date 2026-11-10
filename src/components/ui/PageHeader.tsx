import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  description,
  actions,
  className,
  badge,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn("mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-3", className)}
    >
      <div className="min-w-0">
        <h1 className="font-display flex flex-wrap items-center gap-3 text-2xl font-bold md:text-3xl">
          {title}
          {badge}
        </h1>
        {description && (
          <p className="text-ink-muted mt-1.5 max-w-2xl text-sm md:text-base">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
