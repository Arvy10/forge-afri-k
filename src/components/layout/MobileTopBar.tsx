import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Logo } from "@/components/ui/Logo";
import type { ShellUser } from "./UserCard";

/** Barre du haut sur mobile : le logo et, toujours visible, le nom de la personne connectée. */
export function MobileTopBar({ user }: { user: ShellUser }) {
  return (
    <div className="border-line bg-canvas/90 sticky top-0 z-20 flex items-center justify-between gap-3 border-b px-4 py-2 backdrop-blur-md md:hidden">
      <Link
        href="/"
        aria-label="Forge Afri'K — accueil"
        className="flex min-h-12 items-center gap-2.5"
      >
        <span className="block w-10 rounded-xl bg-[#f6f1e4] p-1 shadow-sm">
          <Logo variant="mark" priority />
        </span>
        <span className="font-display text-base leading-tight font-bold">Forge Afri&apos;K</span>
      </Link>
      <Link
        href={user.id ? "/mon-espace" : "/qui-es-tu"}
        className="bg-surface border-line flex min-h-12 items-center gap-2 rounded-full border py-1 pr-3.5 pl-1"
        aria-label={user.id ? `Mon espace (${user.name})` : "Choisir qui je suis"}
      >
        <Avatar name={user.name} color={user.color} size="sm" />
        <span className="max-w-24 truncate text-sm font-semibold">
          {user.id ? user.name.split(" ")[0] : "Admin"}
        </span>
        {user.isAdmin && (
          <span className="bg-accent-strong text-on-accent rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase">
            Admin
          </span>
        )}
      </Link>
    </div>
  );
}
