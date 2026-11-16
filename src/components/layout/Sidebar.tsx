import { Gear } from "@/components/ui/Gear";
import { LogoPlate } from "@/components/ui/Logo";
import { NavLinks } from "./NavLinks";
import type { Inbox } from "@/server/notifications";
import { UserCard, type ShellUser } from "./UserCard";

/** Barre latérale fixe (ordinateur). */
export function Sidebar({ user, inbox }: { user: ShellUser; inbox: Inbox }) {
  return (
    <aside className="bg-forest text-on-forest fixed inset-y-0 left-0 z-30 hidden w-72 flex-col overflow-hidden lg:flex">
      <Gear className="text-on-forest pointer-events-none absolute -right-20 -bottom-20 size-72 opacity-[0.05]" />
      <div className="relative px-4 pt-5 pb-4">
        <div className="mx-auto w-44">
          <LogoPlate priority />
        </div>
        <p className="text-on-forest/80 mt-3 px-1 text-xs leading-snug font-medium">
          Pôle Communication &amp; Réseau
        </p>
      </div>
      <nav aria-label="Navigation principale" className="relative flex-1 overflow-y-auto px-3 pb-4">
        <NavLinks isAdmin={user.isAdmin} isObserver={user.isObserver} />
      </nav>
      <div className="relative px-3 pb-4">
        <UserCard user={user} inbox={inbox} />
      </div>
    </aside>
  );
}
