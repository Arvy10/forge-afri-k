import Link from "next/link";
import { LogOut, ShieldCheck, ShieldOff, UserRoundCog } from "lucide-react";
import { leaveAdminMode, leaveSession } from "@/actions/access";
import { AdminCodeDialog } from "@/components/access/AdminCodeDialog";
import { Avatar } from "@/components/ui/Avatar";
import type { MemberColor } from "@/lib/constants";
import { ThemeToggle } from "./ThemeToggle";

export type ShellUser = {
  id: string | null;
  name: string;
  color: MemberColor;
  roleLabel: string;
  isAdmin: boolean;
};

const ghost =
  "text-on-forest/85 hover:bg-on-forest/10 hover:text-on-forest flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium md:min-h-10";

/** Bas de la barre : qui je suis, « ce n'est pas moi », mode administrateur, thème, sortie. */
export function UserCard({ user }: { user: ShellUser }) {
  return (
    <div className="border-on-forest/15 space-y-1 border-t pt-3">
      <div className="flex items-center gap-3 px-1 py-1">
        <Avatar name={user.name} color={user.color} size="md" />
        <span className="min-w-0 flex-1">
          <span className="text-on-forest block truncate text-sm font-semibold">{user.name}</span>
          <span className="text-on-forest/70 block truncate text-xs">{user.roleLabel}</span>
        </span>
        <span className="text-on-forest [&_button]:text-on-forest [&_button:hover]:bg-on-forest/10">
          <ThemeToggle />
        </span>
      </div>

      <Link href="/qui-es-tu" className={ghost}>
        <UserRoundCog aria-hidden className="size-4" />
        Ce n&apos;est pas moi, changer
      </Link>

      {user.isAdmin ? (
        <form action={leaveAdminMode}>
          <button type="submit" className={ghost}>
            <ShieldOff aria-hidden className="size-4" />
            <span className="flex-1 text-left">Quitter le mode administrateur</span>
            <span className="bg-accent text-on-accent rounded-full px-2 py-0.5 text-[10px] font-bold uppercase">
              Admin
            </span>
          </button>
        </form>
      ) : (
        <AdminCodeDialog
          triggerClassName={ghost}
          trigger={
            <>
              <ShieldCheck aria-hidden className="size-4" />
              Mode administrateur
            </>
          }
        />
      )}

      <form action={leaveSession}>
        <button type="submit" className={ghost}>
          <LogOut aria-hidden className="size-4" />
          Se déconnecter
        </button>
      </form>
    </div>
  );
}
