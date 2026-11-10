import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { SignOutButton } from "./SignOutButton";
import { ThemeToggle } from "./ThemeToggle";

export type ShellUser = {
  id: string;
  name: string;
  avatar_url: string | null;
  roleLabel: string;
};

/** Bas de la barre : avatar, rôle, thème, déconnexion. */
export function UserCard({ user }: { user: ShellUser }) {
  return (
    <div className="border-on-forest/15 flex items-center gap-2 border-t pt-3">
      <Link
        href="/profil"
        className="hover:bg-on-forest/8 flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg p-1.5"
        aria-label="Mon profil"
      >
        <Avatar name={user.name} src={user.avatar_url} id={user.id} size="md" />
        <span className="min-w-0">
          <span className="text-on-forest block truncate text-sm font-semibold">{user.name}</span>
          <span className="text-on-forest/70 block truncate text-xs">{user.roleLabel}</span>
        </span>
      </Link>
      <div className="text-on-forest [&_button:hover]:bg-on-forest/10 [&_button]:text-on-forest flex shrink-0">
        <ThemeToggle />
        <SignOutButton />
      </div>
    </div>
  );
}
