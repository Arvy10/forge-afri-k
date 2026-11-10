import { Gear } from "./Gear";
import { cn } from "@/lib/cn";

/** Marque provisoire (engrenage + nom) en attendant le fichier du logo officiel. */
export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Gear className="text-accent size-9 shrink-0" />
      <span
        className={cn(
          "font-display leading-none font-bold tracking-tight",
          light ? "text-on-forest" : "text-ink",
        )}
      >
        <span className="block text-lg">Forge Afri&apos;K</span>
      </span>
    </span>
  );
}
