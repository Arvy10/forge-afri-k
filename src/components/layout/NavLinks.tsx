"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActivePath, navFor } from "@/lib/nav";
import { cn } from "@/lib/cn";

export function NavLinks({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {navFor(isAdmin).map(({ href, label, icon: Icon, soon }) => {
        const active = isActivePath(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all duration-200 hover:translate-x-0.5 md:min-h-10",
                active
                  ? "bg-on-forest/12 text-on-forest border-accent border-l-4 pl-2"
                  : "text-on-forest/80 hover:bg-on-forest/8 hover:text-on-forest",
              )}
            >
              <Icon aria-hidden className={cn("size-5 shrink-0", active && "text-accent")} />
              <span className="flex-1">{label}</span>
              {soon && (
                <span className="bg-on-forest/15 text-on-forest rounded-full px-2 py-0.5 text-[11px] font-semibold">
                  Bientôt
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
