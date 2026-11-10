"use client";

import { useEffect, useState } from "react";
import { countdownTo, formatCountdown, publishInstant } from "@/lib/dates";

/** Compte à rebours jusqu'à l'heure de publication (mis à jour chaque minute), avec un point « en direct ». */
export function Countdown({ date, time }: { date: string; time: string }) {
  // Pas d'heure au premier rendu serveur : évite tout décalage d'hydratation.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  const c = now ? countdownTo(publishInstant(date, time), now) : null;
  return (
    <span className="flex items-center gap-3" aria-live="off">
      {c && !c.past && (
        <span aria-hidden className="relative inline-flex size-2.5">
          <span className="bg-accent animate-ping-soft absolute inline-flex size-full rounded-full opacity-60" />
          <span className="bg-accent relative inline-flex size-2.5 rounded-full" />
        </span>
      )}
      <span className="font-display text-3xl font-bold tabular-nums">
        {c ? formatCountdown(c) : "…"}
      </span>
    </span>
  );
}
