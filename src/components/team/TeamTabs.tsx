"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/** Onglets « Membres | Rôles » (uniquement sur ces deux pages). */
export function TeamTabs() {
  const pathname = usePathname();
  if (pathname !== "/equipe" && pathname !== "/equipe/roles") return null;
  const tabs = [
    { href: "/equipe", label: "Membres", active: pathname === "/equipe" },
    { href: "/equipe/roles", label: "Rôles", active: pathname === "/equipe/roles" },
  ];
  return (
    <nav
      aria-label="Équipe"
      className="border-line-strong bg-surface mb-6 inline-flex rounded-xl border p-1"
    >
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.active ? "page" : undefined}
          className={cn(
            "inline-flex min-h-12 items-center rounded-lg px-6 text-sm font-semibold",
            t.active ? "bg-forest text-on-forest" : "text-ink-muted hover:text-ink",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
