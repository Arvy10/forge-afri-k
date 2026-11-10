import { Gear } from "./Gear";
import { cn } from "@/lib/cn";

const TONES = [
  "bg-t-impact-bg text-t-impact-fg",
  "bg-t-patrimoine-bg text-t-patrimoine-fg",
  "bg-t-coulisses-bg text-t-coulisses-fg",
  "bg-t-fun-bg text-t-fun-fg",
  "bg-t-appel_action-bg text-t-appel_action-fg",
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
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
  src?: string | null;
  id?: string;
  size?: keyof typeof SIZES;
  className?: string;
};

/** Photo, sinon pastille avec initiales et engrenage en filigrane. */
export function Avatar({ name, src, id, size = "md", className }: AvatarProps) {
  const tone = TONES[hash(id ?? name) % TONES.length];
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold select-none",
        SIZES[size],
        !src && tone,
        className,
      )}
      title={name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL signée, temporaire
        <img src={src} alt={name} className="size-full object-cover" loading="lazy" />
      ) : (
        <>
          <Gear className="absolute -right-1/4 -bottom-1/4 size-3/4 opacity-20" />
          <span aria-hidden className="relative">
            {initials(name)}
          </span>
          <span className="sr-only">{name}</span>
        </>
      )}
    </span>
  );
}
