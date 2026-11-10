"use client";

import { useEffect, useState } from "react";
import { countdownTo, formatCountdown, publishInstant } from "@/lib/dates";

/** Compte à rebours jusqu'à l'heure de publication (mis à jour chaque minute). */
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
    <span className="font-display text-3xl font-bold tabular-nums" aria-live="off">
      {c ? formatCountdown(c) : "…"}
    </span>
  );
}
