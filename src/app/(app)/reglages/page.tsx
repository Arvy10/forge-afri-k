import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccessCodeForm, RoleEditor, TasksPolicyForm } from "@/components/settings/SettingsForms";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireSession } from "@/server/session";
import { getRoles } from "@/server/team";

export const metadata: Metadata = { title: "Réglages" };

export default async function SettingsPage() {
  const auth = await requireSession();
  if (!auth.isAdmin) redirect("/");
  const roles = await getRoles();

  const card = "bg-surface border-line shadow-card rounded-2xl border p-4 md:p-5";
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Réglages"
        description="Réservé au mode administrateur : qui peut ajouter des tâches, le code d'accès et les modèles de rôles."
      />

      <div className="stagger space-y-6">
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

        <section aria-labelledby="r-roles" className="space-y-3">
          <h2 id="r-roles" className="font-display text-lg font-bold">
            Modèles de rôles
          </h2>
          <p className="text-ink-muted text-sm">
            Ces textes s&apos;affichent dans l&apos;espace de chaque personne qui porte le rôle.
          </p>
          {roles.map((r) => (
            <RoleEditor key={r.id} role={r} />
          ))}
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
