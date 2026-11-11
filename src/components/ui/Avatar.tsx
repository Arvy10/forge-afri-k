import { Gear } from "./Gear";
import { cn } from "@/lib/cn";
import type { MemberColor } from "@/lib/constants";

/** Couleur de pastille d'un membre : reprend les couleurs des types de contenu. */
const TONES: Record<MemberColor, string> = {
  vert: "bg-t-impact-bg text-t-impact-fg",
  orange: "bg-t-appel_action-bg text-t-appel_action-fg",
  sable: "bg-t-patrimoine-bg text-t-patrimoine-fg",
  bleu: "bg-t-coulisses-bg text-t-coulisses-fg",
  ambre: "bg-t-fun-bg text-t-fun-fg",
};

export function initials(name: string) {
  const parts = name
    .replace(/\(.*?\)/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]![0]!;
  const last = parts.length > 1 ? parts[parts.length - 1]![0]! : "";
  return (first + last).toUpperCase();
}

const SIZES = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
  xl: "size-24 text-3xl",
} as const;

type AvatarProps = {
  name: string;
  color?: MemberColor;
  size?: keyof typeof SIZES;
  className?: string;
};

/** Pastille colorée avec l'initiale ; l'engrenage du logo en filigrane. */
export function Avatar({ name, color = "vert", size = "md", className }: AvatarProps) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold select-none",
        SIZES[size],
        TONES[color],
        className,
      )}
      title={name}
    >
      <Gear className="absolute -right-1/4 -bottom-1/4 size-3/4 opacity-20" />
      <span aria-hidden className="relative">
        {initials(name)}
      </span>
      <span className="sr-only">{name}</span>
    </span>
  );
}
