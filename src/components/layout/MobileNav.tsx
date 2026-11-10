"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { LogoPlate } from "@/components/ui/Logo";
import { NAV_ITEMS, isActivePath } from "@/lib/nav";
import { cn } from "@/lib/cn";
import { NavLinks } from "./NavLinks";
import { UserCard, type ShellUser } from "./UserCard";

/** Mobile : barre du bas (4 accès rapides + « Plus ») et tiroir latéral avec les 9 sections. */
export function MobileNav({ user }: { user: ShellUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const primary = NAV_ITEMS.filter((i) => i.primary);
  const moreActive = !primary.some((i) => isActivePath(pathname, i.href));

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <nav
        aria-label="Navigation principale"
        className="border-line bg-surface fixed inset-x-0 bottom-0 z-30 flex border-t pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {primary.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                active ? "text-accent-strong" : "text-ink-muted",
              )}
            >
              <Icon aria-hidden className="size-6" strokeWidth={active ? 2.4 : 1.9} />
              <span>{label.split(" ")[0]}</span>
              {active && (
                <span aria-hidden className="title-bar bg-accent -mt-0.5 h-0.5 w-6 rounded-full" />
              )}
            </Link>
          );
        })}
        <Dialog.Trigger
          className={cn(
            "flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
            moreActive ? "text-accent-strong" : "text-ink-muted",
          )}
        >
          <Menu aria-hidden className="size-6" />
          <span>Plus</span>
        </Dialog.Trigger>
      </nav>

      <Dialog.Portal>
        <Dialog.Overlay className="rx-overlay fixed inset-0 z-40 bg-black/50 md:hidden" />
        <Dialog.Content
          aria-describedby={undefined}
          className="rx-drawer bg-forest text-on-forest fixed inset-y-0 left-0 z-50 flex w-[19rem] max-w-[88vw] flex-col px-3 pt-5 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden"
        >
          <div className="mb-4 flex items-start justify-between px-2">
            <div>
              <Dialog.Title asChild>
                <span className="block w-44">
                  <LogoPlate />
                </span>
              </Dialog.Title>
              <p className="text-on-forest/75 mt-2 text-xs">Pôle Communication &amp; Réseau</p>
            </div>
            <Dialog.Close
              className="hover:bg-on-forest/10 inline-flex size-11 items-center justify-center rounded-lg"
              aria-label="Fermer le menu"
            >
              <X aria-hidden className="size-5" />
            </Dialog.Close>
          </div>
          <nav aria-label="Toutes les sections" className="flex-1 overflow-y-auto">
            <NavLinks onNavigate={() => setOpen(false)} />
          </nav>
          <UserCard user={user} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
