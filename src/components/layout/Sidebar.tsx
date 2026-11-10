import { Gear } from "@/components/ui/Gear";
import { Logo } from "@/components/ui/Logo";
import { NavLinks } from "./NavLinks";
import { UserCard, type ShellUser } from "./UserCard";

/** Barre latérale fixe (ordinateur). */
export function Sidebar({ user }: { user: ShellUser }) {
  return (
    <aside className="bg-forest text-on-forest fixed inset-y-0 left-0 z-30 hidden w-72 flex-col overflow-hidden md:flex">
      <Gear className="text-on-forest pointer-events-none absolute -right-20 -bottom-20 size-72 opacity-[0.05]" />
      <div className="relative px-5 pt-6 pb-5">
        <Logo light />
        <p className="text-on-forest/75 mt-2 text-xs leading-snug">
          Pôle Communication &amp; Réseau
        </p>
      </div>
      <nav aria-label="Navigation principale" className="relative flex-1 overflow-y-auto px-3 pb-4">
        <NavLinks />
      </nav>
      <div className="relative px-3 pb-4">
        <UserCard user={user} />
      </div>
    </aside>
  );
}
