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
      className={cn("mb-7 flex flex-wrap items-start justify-between gap-x-6 gap-y-3", className)}
    >
      <div className="min-w-0">
        <h1 className="font-display flex flex-wrap items-center gap-3 text-3xl font-bold md:text-4xl">
          {title}
          {badge}
        </h1>
        <span aria-hidden className="title-bar bg-accent mt-2.5 block h-1 w-12 rounded-full" />
        {description && (
          <p className="text-ink-muted mt-3 max-w-2xl text-sm md:text-base">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
