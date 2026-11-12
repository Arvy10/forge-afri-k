import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, UsersRound } from "lucide-react";
import { leaveSession } from "@/actions/access";
import { AdminCodeDialog } from "@/components/access/AdminCodeDialog";
import { MemberPicker } from "@/components/access/MemberPicker";
import { requireSession } from "@/server/session";
import { getActiveTeam } from "@/server/team";

export const metadata: Metadata = { title: "Qui es-tu ?" };

export default async function WhoAreYouPage() {
  const auth = await requireSession();
  const members = await getActiveTeam();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Qui es-tu ?</h1>
        <p className="text-ink-muted mt-1 text-sm">
          Touche ton prénom. Le site s&apos;en souviendra sur cet appareil.
        </p>
      </div>

      {members.length === 0 ? (
        <div className="border-line-strong flex flex-col items-center gap-3 rounded-2xl border border-dashed px-5 py-8 text-center">
          <UsersRound aria-hidden className="text-ink-muted size-10" />
          <h2 className="font-display text-lg font-bold">Aucun membre pour l&apos;instant</h2>
          <p className="text-ink-muted max-w-sm text-sm">
            L&apos;administrateur doit d&apos;abord ajouter les membres du pôle.
          </p>
          <AdminCodeDialog
            onDoneHref="/equipe?ajout=1"
            triggerClassName="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent-strong px-5 text-sm font-semibold text-on-accent"
            trigger={
              <>
                <ShieldCheck aria-hidden className="size-4" />
                Je suis l&apos;administrateur
              </>
            }
          />
        </div>
      ) : (
        <MemberPicker members={members} />
      )}

      {members.length > 0 && !auth.isAdmin && (
        <AdminCodeDialog
          triggerClassName="text-ink-muted hover:text-ink flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium underline underline-offset-4"
          trigger={
            <>
              <ShieldCheck aria-hidden className="size-4" />
              Je suis l&apos;administrateur
            </>
          }
        />
      )}
      {auth.isAdmin && (
        <p className="bg-accent-soft text-ink flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium">
          <ShieldCheck aria-hidden className="text-accent-strong size-4 shrink-0" />
          Mode administrateur actif : choisis ton prénom pour avoir ton espace et tes outils.
        </p>
      )}

      <div className="border-line flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-sm">
        {auth.isAdmin ? (
          <Link
            href="/equipe"
            className="text-accent-strong min-h-12 content-center font-semibold underline underline-offset-4"
          >
            Gérer l&apos;équipe
          </Link>
        ) : (
          <span />
        )}
        <form action={leaveSession}>
          <button
            type="submit"
            className="text-ink-muted hover:text-ink min-h-12 underline underline-offset-4"
          >
            Changer de code / quitter
          </button>
        </form>
      </div>
    </div>
  );
}
