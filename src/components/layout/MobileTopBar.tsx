import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "./ThemeToggle";

/** Barre du haut sur mobile : le logo officiel, toujours visible, et l'interrupteur de thème. */
export function MobileTopBar() {
  return (
    <div className="border-line bg-canvas/90 sticky top-0 z-20 flex items-center justify-between gap-3 border-b px-4 py-2 backdrop-blur-md md:hidden">
      <Link
        href="/"
        aria-label="Forge Afri'K — accueil"
        className="flex min-h-11 items-center gap-3"
      >
        <span className="block w-10">
          <Logo variant="mark" priority />
        </span>
        <span className="leading-tight">
          <span className="font-display block text-base font-bold">Forge Afri&apos;K</span>
          <span className="text-ink-muted block text-[11px] font-medium">
            Pôle Communication &amp; Réseau
          </span>
        </span>
      </Link>
      <ThemeToggle />
    </div>
  );
}
