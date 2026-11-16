"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { cn } from "@/lib/cn";
import { unreadLabel } from "@/lib/notifications";
import { OPEN_EVENT } from "./NotificationBell";

const KEY = "pc-notif-announced";
const SHOW_MS = 8000;

/**
 * À l'arrivée (et à chaque nouveau message), une bannière dit en toutes lettres « Tu as 2 messages non lus »,
 * puis se referme : il ne reste que la cloche avec son point rouge.
 */
export function UnreadBanner({ unread }: { unread: number }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const read = (): number => {
      try {
        return Number(sessionStorage.getItem(KEY) ?? "0") || 0;
      } catch {
        return 0; // stockage indisponible : on annonce simplement
      }
    };
    const write = (n: number) => {
      try {
        sessionStorage.setItem(KEY, String(n));
      } catch {
        /* rien */
      }
    };

    // Plus de message non lu : on referme et on oublie.
    if (unread === 0) {
      write(0);
      const t = setTimeout(() => setShown(false), 0);
      return () => clearTimeout(t);
    }
    // Déjà annoncé dans cette session : rien de nouveau à dire.
    if (unread <= read()) return;

    // « Annoncé » n'est noté qu'au moment où la bannière s'affiche réellement.
    const start = setTimeout(() => {
      setShown(true);
      write(unread);
    }, 150);
    const stop = setTimeout(() => setShown(false), SHOW_MS);
    return () => {
      clearTimeout(start);
      clearTimeout(stop);
    };
  }, [unread]);

  return (
    <div
      aria-hidden={!shown}
      className={cn(
        "grid transition-all duration-500 ease-out",
        shown ? "mb-4 grid-rows-[1fr] opacity-100" : "mb-0 grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="overflow-hidden">
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl bg-[#b3261e] px-4 py-3 text-white shadow-md"
        >
          <BellRing aria-hidden className="size-6 shrink-0" />
          <p className="min-w-0 flex-1 text-base font-semibold">
            {unread > 0 ? `Tu as ${unreadLabel(unread)}` : "Aucun message"}
          </p>
          <button
            type="button"
            tabIndex={shown ? 0 : -1}
            onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
            className="inline-flex min-h-12 shrink-0 items-center rounded-lg bg-white/20 px-4 text-base font-bold hover:bg-white/30"
          >
            Lire
          </button>
        </div>
      </div>
    </div>
  );
}
