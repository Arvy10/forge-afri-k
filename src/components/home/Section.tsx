import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/** Carte de l'accueil : pastille d'icône, titre, lien « Tout voir » facultatif, contenu. */
export function Section({
  title,
  id,
  icon: Icon,
  href,
  hrefLabel = "Tout voir",
  children,
  className,
}: {
  title: string;
  id: string;
  icon?: LucideIcon;
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn("bg-surface border-line shadow-card rounded-2xl border p-4 md:p-5", className)}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id={id} className="font-display flex items-center gap-2.5 text-lg font-bold">
          {Icon && (
            <span className="bg-accent-soft text-accent-strong inline-flex size-9 items-center justify-center rounded-xl">
              <Icon aria-hidden className="size-[18px]" />
            </span>
          )}
          {title}
        </h2>
        {href && (
          <Link
            href={href}
            className="text-accent-strong group inline-flex min-h-11 items-center gap-1 text-sm font-semibold"
          >
            <span className="underline-offset-4 group-hover:underline">{hrefLabel}</span>
            <ArrowRight
              aria-hidden
              className="size-4 transition-transform group-hover:translate-x-1"
            />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
