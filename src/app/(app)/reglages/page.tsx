import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, Megaphone, UsersRound } from "lucide-react";
import { RoleManager } from "@/components/settings/RoleManager";
import { AccessCodeForm, TasksPolicyForm } from "@/components/settings/SettingsForms";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireSession } from "@/server/session";
import { getRoles, getTeam } from "@/server/team";

export const metadata: Metadata = { title: "Administration" };

export default async function SettingsPage() {
  const auth = await requireSession();
  if (!auth.isAdmin) redirect("/");
  const [roles, team] = await Promise.all([getRoles(), getTeam()]);

  // Combien de personnes portent chaque rôle (membres actifs).
  const holders: Record<string, number> = {};
  for (const m of team.filter((x) => x.actif))
    for (const id of m.roleIds) holders[id] = (holders[id] ?? 0) + 1;

  const card = "bg-surface border-line shadow-card rounded-2xl border p-4 md:p-5";
  const shortcut =
    "bg-surface border-line shadow-card lift flex min-h-16 items-center gap-3 rounded-2xl border p-4 text-left";

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Administration"
        description="Les outils réservés à l'administrateur : membres, rôles, infos, code d'accès et réglages."
      />

      <div className="stagger space-y-6">
        <nav aria-label="Raccourcis d'administration" className="grid gap-3 sm:grid-cols-3">
          <Link href="/equipe" className={shortcut}>
            <span className="bg-accent-soft text-accent-strong inline-flex size-10 shrink-0 items-center justify-center rounded-xl">
              <UsersRound aria-hidden className="size-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold">Membres</span>
              <span className="text-ink-muted block text-xs">Ajouter, modifier, supprimer</span>
            </span>
          </Link>
          <Link href="/infos" className={shortcut}>
            <span className="bg-accent-soft text-accent-strong inline-flex size-10 shrink-0 items-center justify-center rounded-xl">
              <Megaphone aria-hidden className="size-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold">Infos</span>
              <span className="text-ink-muted block text-xs">Publier une annonce</span>
            </span>
          </Link>
          <a href="/taches/export" className={shortcut}>
            <span className="bg-accent-soft text-accent-strong inline-flex size-10 shrink-0 items-center justify-center rounded-xl">
              <Download aria-hidden className="size-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold">Exporter les tâches</span>
              <span className="text-ink-muted block text-xs">Fichier CSV (Excel)</span>
            </span>
          </a>
        </nav>

        <section aria-labelledby="r-roles" className="space-y-3">
          <h2 id="r-roles" className="font-display text-lg font-bold">
            Rôles et sous-rôles
          </h2>
          <p className="text-ink-muted text-sm">
            Plusieurs personnes peuvent porter le même rôle. Un sous-rôle précise un rôle (par
            exemple « Vidéo › Montage »). La mission s&apos;affiche dans l&apos;espace de chaque
            personne qui porte le rôle ; on l&apos;attribue depuis la fiche du membre.
          </p>
          <RoleManager roles={roles} holders={holders} />
        </section>

        <section aria-labelledby="r-taches" className={card}>
          <h2 id="r-taches" className="font-display mb-3 text-lg font-bold">
            Ajout de tâches
          </h2>
          <TasksPolicyForm value={auth.settings?.tasks_add_policy ?? "tous"} />
        </section>

        <section aria-labelledby="r-code" className={card}>
          <h2 id="r-code" className="font-display mb-3 text-lg font-bold">
            Code d&apos;accès du pôle
          </h2>
          <AccessCodeForm />
        </section>

        <section aria-labelledby="r-secu" className={card}>
          <h2 id="r-secu" className="font-display mb-2 text-lg font-bold">
            À savoir sur la sécurité
          </h2>
          <ul className="text-ink-muted list-disc space-y-1.5 pl-5 text-sm">
            <li>
              Le code est partagé : toute personne qui le connaît peut se faire passer pour
              n&apos;importe quel membre.
            </li>
            <li>Si le code fuite, change-le ici : toutes les autres sessions sont coupées.</li>
            <li>
              N&apos;enregistre jamais de téléphone, d&apos;e-mail personnel ni de pièce
              d&apos;identité dans le site.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
