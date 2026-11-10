"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function MembersTabs() {
  const pathname = usePathname();
  const tabs = [
    { href: "/membres", label: "Membres", active: pathname === "/membres" },
    { href: "/membres/roles", label: "Rôles", active: pathname === "/membres/roles" },
  ];
  return (
    <nav aria-label="Membres et rôles" className="border-line-strong bg-surface mb-6 inline-flex rounded-lg border p-0.5">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.active ? "page" : undefined}
          className={cn("inline-flex min-h-11 items-center rounded-md px-5 text-sm font-semibold", t.active ? "bg-forest text-on-forest" : "text-ink-muted hover:text-ink")}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
