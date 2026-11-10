import { CHANNEL_LABEL, type Channel } from "@/lib/constants";
import { cn } from "@/lib/cn";

const SHORT: Record<Channel, string> = { instagram: "IG", tiktok: "TT", facebook: "FB" };

/** Petites pastilles de canaux : le principal en plein, les autres en contour. */
export function ChannelChips({
  main,
  others = [],
  className,
}: {
  main: Channel;
  others?: Channel[];
  className?: string;
}) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      <span
        title={`Canal principal : ${CHANNEL_LABEL[main]}`}
        className="bg-ink text-canvas rounded px-1.5 py-0.5 text-[10px] leading-none font-bold"
      >
        {SHORT[main]}
        <span className="sr-only"> — {CHANNEL_LABEL[main]} (principal)</span>
      </span>
      {others.map((c) => (
        <span
          key={c}
          title={CHANNEL_LABEL[c]}
          className="border-line-strong text-ink-muted rounded border px-1.5 py-0.5 text-[10px] leading-none font-bold"
        >
          {SHORT[c]}
          <span className="sr-only"> — {CHANNEL_LABEL[c]}</span>
        </span>
      ))}
    </span>
  );
}
