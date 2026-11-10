import { cn } from "@/lib/cn";

export type IllustrationKind =
  | "calendar"
  | "day"
  | "tasks"
  | "people"
  | "book"
  | "folder"
  | "meeting"
  | "chart"
  | "map"
  | "error";

/**
 * Petites illustrations « atelier » au trait : engrenage, règle, carnet.
 * Trait = currentColor (encre), touches d'orange via la classe `text-accent` sur <g class="accent">.
 */
export function Illustration({ kind, className }: { kind: IllustrationKind; className?: string }) {
  return (
    <svg
      viewBox="0 0 160 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      className={cn("text-ink-muted h-28 w-auto", className)}
    >
      <ellipse cx="80" cy="108" rx="52" ry="5" className="fill-surface-2 stroke-none" />
      {kind === "calendar" && (
        <>
          <rect x="30" y="22" width="100" height="78" rx="8" className="fill-surface" />
          <path d="M30 42h100M56 14v16M104 14v16" />
          <path d="M46 58h14M72 58h14M98 58h14M46 76h14M72 76h14" />
          <circle cx="105" cy="78" r="9" className="stroke-accent fill-accent-soft" />
          <path d="M105 73v10M100 78h10" className="stroke-accent" />
        </>
      )}
      {kind === "day" && (
        <>
          <rect
            x="44"
            y="26"
            width="72"
            height="70"
            rx="8"
            className="fill-surface"
            strokeDasharray="5 6"
          />
          <circle cx="80" cy="61" r="14" className="stroke-accent fill-accent-soft" />
          <path d="M80 54v14M73 61h14" className="stroke-accent" />
        </>
      )}
      {kind === "tasks" && (
        <>
          <rect x="42" y="16" width="76" height="86" rx="8" className="fill-surface" />
          <path d="M66 16v-4h28v4" />
          <path d="M56 42l5 5 9-10M56 64l5 5 9-10" className="stroke-accent" />
          <path d="M80 44h26M80 66h26M56 86h50" />
        </>
      )}
      {kind === "people" && (
        <>
          <circle cx="80" cy="44" r="14" className="fill-surface" />
          <path d="M54 98c0-16 12-26 26-26s26 10 26 26" className="fill-surface" />
          <circle cx="42" cy="56" r="10" className="fill-surface" />
          <path d="M24 98c0-12 8-20 18-20" />
          <circle cx="118" cy="56" r="10" className="stroke-accent fill-accent-soft" />
          <path d="M136 98c0-12-8-20-18-20" className="stroke-accent" />
        </>
      )}
      {kind === "book" && (
        <>
          <path
            d="M80 30c-14-8-34-8-50-2v66c16-6 36-6 50 2 14-8 34-8 50-2V28c-16-6-36-6-50 2z"
            className="fill-surface"
          />
          <path d="M80 30v66" />
          <path d="M42 44c8-2 16-2 24 1M42 58c8-2 16-2 24 1" />
          <path d="M94 45c8-3 16-3 24-1" className="stroke-accent" />
        </>
      )}
      {kind === "folder" && (
        <>
          <path
            d="M28 36a6 6 0 016-6h28l10 12h54a6 6 0 016 6v44a6 6 0 01-6 6H34a6 6 0 01-6-6z"
            className="fill-surface"
          />
          <path d="M28 54h104" />
          <circle cx="110" cy="74" r="8" className="stroke-accent fill-accent-soft" />
        </>
      )}
      {kind === "meeting" && (
        <>
          <path
            d="M34 28h58a8 8 0 018 8v26a8 8 0 01-8 8H60l-16 14V70h-10a8 8 0 01-8-8V36a8 8 0 018-8z"
            className="fill-surface"
          />
          <path
            d="M112 50h14a8 8 0 018 8v22a8 8 0 01-8 8h-6v12l-14-12H88"
            className="stroke-accent fill-accent-soft"
          />
          <path d="M44 44h38M44 56h24" />
        </>
      )}
      {kind === "chart" && (
        <>
          <path d="M30 98h100M36 98V24" />
          <rect x="48" y="66" width="16" height="32" rx="3" className="fill-surface" />
          <rect x="76" y="46" width="16" height="52" rx="3" className="fill-surface" />
          <rect
            x="104"
            y="30"
            width="16"
            height="68"
            rx="3"
            className="stroke-accent fill-accent-soft"
          />
        </>
      )}
      {kind === "map" && (
        <>
          <path d="M30 34l34-10 32 10 34-10v62l-34 10-32-10-34 10z" className="fill-surface" />
          <path d="M64 24v62M96 34v62" />
          <path
            d="M112 52c0 8-8 14-8 14s-8-6-8-14a8 8 0 0116 0z"
            className="stroke-accent fill-accent-soft"
          />
        </>
      )}
      {kind === "error" && (
        <>
          <circle cx="80" cy="58" r="34" className="fill-surface" />
          <path d="M80 40v22" className="stroke-danger" />
          <circle cx="80" cy="74" r="1.5" className="stroke-danger" />
        </>
      )}
    </svg>
  );
}
