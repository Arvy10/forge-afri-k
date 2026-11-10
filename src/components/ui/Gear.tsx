import { cn } from "@/lib/cn";

/** Chemin SVG d'un engrenage (motif signature de Forge Afri'K), calculé une seule fois. */
function gearPath(teeth = 12, outer = 47, root = 37, hole = 13): string {
  const c = 50;
  const step = (Math.PI * 2) / teeth;
  const pt = (angle: number, radius: number) =>
    `${(c + Math.cos(angle) * radius).toFixed(2)} ${(c + Math.sin(angle) * radius).toFixed(2)}`;
  let d = "";
  for (let i = 0; i < teeth; i++) {
    const a = i * step - Math.PI / 2;
    const p1 = pt(a - 0.3 * step, root);
    const p2 = pt(a - 0.15 * step, outer);
    const p3 = pt(a + 0.15 * step, outer);
    const p4 = pt(a + 0.3 * step, root);
    const next = pt(a + 0.7 * step, root);
    d += `${i === 0 ? "M" : "L"}${p1} L${p2} L${p3} L${p4} A${root} ${root} 0 0 1 ${next} `;
  }
  d += "Z ";
  // Trou central (rempli en evenodd)
  d += `M${c + hole} ${c} A${hole} ${hole} 0 1 0 ${c - hole} ${c} A${hole} ${hole} 0 1 0 ${c + hole} ${c} Z`;
  return d;
}

const PATH = gearPath();

type GearProps = {
  className?: string;
  /** Rotation lente (accueil, chargement). Désactivée si l'utilisateur réduit les animations. */
  spin?: boolean;
  title?: string;
};

export function Gear({ className, spin = false, title }: GearProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn(spin && "animate-gear", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <path d={PATH} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

/** Écran / zone de chargement avec l'engrenage qui tourne. */
export function GearLoader({ label = "Chargement…" }: { label?: string }) {
  return (
    <div role="status" className="text-ink-muted flex flex-col items-center gap-3 py-16">
      <Gear spin className="text-accent size-12 [animation-duration:6s]" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
