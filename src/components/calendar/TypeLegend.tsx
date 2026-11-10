import { CONTENT_TYPES } from "@/lib/constants";
import { TypePill } from "@/components/ui/TypePill";

export function TypeLegend() {
  return (
    <ul aria-label="Légende des types de contenu" className="flex flex-wrap items-center gap-1.5">
      {CONTENT_TYPES.map((t) => (
        <li key={t}>
          <TypePill type={t} />
        </li>
      ))}
    </ul>
  );
}
