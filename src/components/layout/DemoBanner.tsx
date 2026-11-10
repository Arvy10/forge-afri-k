import { Eye } from "lucide-react";
import { cn } from "@/lib/cn";
import type { DemoVariant } from "@/lib/demo/mode";

/** Bandeau permanent de l'aperçu visuel : on ne doit jamais le confondre avec le vrai site. */
export function DemoBanner({ variant }: { variant: DemoVariant }) {
  const link = (v: DemoVariant, label: string) => (
    <a
      href={`?demo=${v}`}
      aria-current={variant === v ? "true" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold",
        variant === v
          ? "bg-forest text-on-forest"
          : "hover:bg-forest/10 underline underline-offset-4",
      )}
    >
      {label}
    </a>
  );
  return (
    <div
      role="note"
      className="bg-accent-soft text-ink border-accent/40 z-20 border-b px-4 py-2 md:sticky md:top-0 md:px-8"
    >
      <div className="mx-auto flex max-w-[88rem] flex-wrap items-center gap-x-4 gap-y-1">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Eye aria-hidden className="size-4 shrink-0" />
          <span>
            <strong>Aperçu visuel</strong> : exemples fictifs, rien n&apos;est enregistré.
          </span>
        </p>
        <div className="flex items-center gap-1" role="group" aria-label="Contenu de l'aperçu">
          {link("exemples", "Avec des exemples")}
          {link("vide", "Vide (comme au départ)")}
        </div>
      </div>
    </div>
  );
}
