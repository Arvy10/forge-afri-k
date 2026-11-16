"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, BellRing, MessageSquareText, X } from "lucide-react";
import { markNotificationsRead } from "@/actions/notifications";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/dates";
import { badgeText, unreadLabel, type NotificationView } from "@/lib/notifications";

export const OPEN_EVENT = "pc:open-notifications";

/**
 * La cloche : un point rouge avec le nombre de messages non lus. On l'ouvre pour lire les rappels et
 * les messages ; ils sont alors marqués comme lus. `tone` s'adapte au fond (clair ou vert de la barre latérale).
 */
export function NotificationBell({
  items,
  unread,
  tone = "light",
}: {
  items: NotificationView[];
  unread: number;
  tone?: "light" | "forest";
}) {
  const router = useRouter();
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  // Les messages qui étaient non lus à l'ouverture restent mis en évidence pendant la lecture.
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  const show = () => {
    setFresh(new Set(items.filter((i) => !i.lu).map((i) => i.id)));
    setOpen(true);
    if (unread > 0) void markNotificationsRead().then(() => router.refresh());
  };

  // « Lire » dans la bannière ouvre la cloche visible (celle de la barre du haut ou de la barre latérale).
  useEffect(() => {
    const onOpen = () => {
      if (button.current && button.current.offsetParent !== null) show();
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  });

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <button
        ref={button}
        type="button"
        onClick={show}
        aria-label={
          unread > 0 ? `Notifications : ${unreadLabel(unread)}` : "Notifications : aucun message"
        }
        className={cn(
          "relative inline-flex size-12 shrink-0 items-center justify-center rounded-full transition-colors",
          tone === "forest"
            ? "text-on-forest hover:bg-on-forest/10"
            : "text-ink hover:bg-surface-2",
        )}
      >
        {unread > 0 ? (
          <BellRing aria-hidden className="size-6" />
        ) : (
          <Bell aria-hidden className="size-6" />
        )}
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute top-1 right-1 grid min-w-5 place-items-center rounded-full bg-[#d62f1f] px-1 text-xs leading-5 font-bold text-white ring-2 ring-[var(--canvas)]"
          >
            {badgeText(unread)}
          </span>
        )}
      </button>

      <Dialog.Portal>
        <Dialog.Overlay className="rx-overlay fixed inset-0 z-[60] bg-black/50" />
        <Dialog.Content
          aria-describedby="notif-desc"
          className="rx-dialog bg-canvas text-ink fixed inset-x-0 bottom-0 z-[70] flex max-h-[85dvh] flex-col rounded-t-2xl shadow-2xl md:inset-auto md:top-16 md:right-6 md:left-auto md:w-[26rem] md:rounded-2xl"
        >
          <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
            <Dialog.Title className="font-display flex items-center gap-2 text-xl font-bold">
              <MessageSquareText aria-hidden className="text-accent-strong size-5" />
              Mes messages
            </Dialog.Title>
            <Dialog.Close
              aria-label="Fermer"
              className="hover:bg-surface-2 -mr-2 inline-flex size-12 items-center justify-center rounded-lg"
            >
              <X aria-hidden className="size-5" />
            </Dialog.Close>
          </div>
          <p id="notif-desc" className="text-ink-muted px-5 pb-3 text-base">
            Les rappels et les messages que l&apos;équipe t&apos;a laissés.
          </p>
          <ul className="min-h-0 flex-1 divide-y overflow-y-auto px-2 pb-4">
            {items.length === 0 && (
              <li className="text-ink-muted px-3 py-8 text-center text-base">
                Aucun message pour l&apos;instant.
              </li>
            )}
            {items.map((n) => {
              const isNew = fresh.has(n.id);
              const body = (
                <>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span className="font-bold">{n.de ?? "L'administrateur"}</span>
                    <span className="text-ink-muted">
                      {n.kind === "relance" ? "Rappel" : "Message"} · {formatRelative(n.createdAt)}
                    </span>
                    {isNew && (
                      <span className="rounded-full bg-[#d62f1f] px-2 py-0.5 text-xs font-bold text-white">
                        Nouveau
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-base leading-snug whitespace-pre-wrap">
                    {n.texte}
                  </span>
                </>
              );
              return (
                <li key={n.id} className={cn("rounded-xl px-3 py-3", isNew && "bg-accent-soft/60")}>
                  {n.taskId ? (
                    <Link
                      href="/mon-espace"
                      onClick={() => setOpen(false)}
                      className="block min-h-12"
                    >
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </li>
              );
            })}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
