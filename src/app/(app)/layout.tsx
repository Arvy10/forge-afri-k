import { redirect } from "next/navigation";
import { LiveRefresh } from "@/components/layout/LiveRefresh";
import { MobileNav } from "@/components/layout/MobileNav";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import type { ShellUser } from "@/components/layout/UserCard";
import { requireSession } from "@/server/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireSession();
  // Sans identité (« Qui es-tu ? » pas encore fait), seul l'administrateur peut entrer pour ajouter les membres.
  if (!auth.member && !auth.isAdmin) redirect("/qui-es-tu");

  const shellUser: ShellUser = {
    id: auth.member?.id ?? null,
    name: auth.member
      ? [auth.member.prenom, auth.member.nom].filter(Boolean).join(" ")
      : "Administrateur",
    color: auth.member?.couleur ?? "orange",
    roleLabel: auth.isAdmin ? "Mode administrateur" : "Membre du pôle",
    isAdmin: auth.isAdmin,
  };

  return (
    <div className="min-h-dvh md:pl-72">
      <a
        href="#contenu"
        className="bg-accent-strong text-on-accent sr-only z-50 rounded-lg px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Aller au contenu
      </a>
      <Sidebar user={shellUser} />
      <MobileTopBar user={shellUser} />
      <main
        id="contenu"
        className="stagger mx-auto w-full max-w-[88rem] px-4 pt-5 pb-28 md:px-8 md:pt-8 md:pb-12"
      >
        {children}
      </main>
      <MobileNav user={shellUser} />
      <LiveRefresh />
    </div>
  );
}
