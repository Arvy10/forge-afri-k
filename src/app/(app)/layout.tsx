import { DemoBanner } from "@/components/layout/DemoBanner";
import { MobileNav } from "@/components/layout/MobileNav";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import type { ShellUser } from "@/components/layout/UserCard";
import { ACCESS_ROLE_LABEL } from "@/lib/constants";
import { requireMember } from "@/lib/auth";
import { cookies } from "next/headers";
import { DEMO_COOKIE, isDemoMode } from "@/lib/demo/mode";
import { getRoles, getTeam } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, isAdmin } = await requireMember();
  const demo = isDemoMode();
  const demoVariant = (await cookies()).get(DEMO_COOKIE)?.value === "vide" ? "vide" : "exemples";
  const [team, roles] = await Promise.all([getTeam(), getRoles()]);
  const me = team.find((m) => m.id === profile.id);
  const myRoles = roles.filter((r) => me?.role_ids.includes(r.id)).map((r) => r.name);
  const shellUser: ShellUser = {
    id: profile.id,
    name: profile.full_name || profile.email,
    avatar_url: me?.avatar_url ?? null,
    roleLabel:
      myRoles.length > 0
        ? myRoles.join(" · ")
        : isAdmin
          ? ACCESS_ROLE_LABEL.admin
          : ACCESS_ROLE_LABEL.member,
  };

  return (
    <div className="min-h-dvh md:pl-72">
      <a
        href="#contenu"
        className="bg-accent-strong text-on-accent sr-only z-50 rounded-lg px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Aller au contenu
      </a>
      {demo && <DemoBanner variant={demoVariant} />}
      <MobileTopBar />
      <Sidebar user={shellUser} />
      <main
        id="contenu"
        className="stagger mx-auto w-full max-w-[88rem] px-4 pt-5 pb-28 md:px-8 md:pt-8 md:pb-12"
      >
        {children}
      </main>
      <MobileNav user={shellUser} />
    </div>
  );
}
