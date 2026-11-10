import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

/** Carte de l'accueil : titre, lien « Tout voir » facultatif, contenu. */
export function Section({
  title,
  id,
  href,
  hrefLabel = "Tout voir",
  children,
  className,
}: {
  title: string;
  id: string;
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
        <h2 id={id} className="font-display text-lg font-bold">
          {title}
        </h2>
        {href && (
          <Link
            href={href}
            className="text-accent-strong inline-flex min-h-11 items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
          >
            {hrefLabel}
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
