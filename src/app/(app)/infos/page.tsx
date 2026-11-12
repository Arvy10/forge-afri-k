import type { Metadata } from "next";
import { InfoCard } from "@/components/infos/InfoCard";
import { InfoDialog } from "@/components/infos/InfoDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import type { InfoRow } from "@/lib/database.types";
import { db } from "@/server/db";
import { requireSession } from "@/server/session";

export const metadata: Metadata = { title: "Infos" };

export default async function InfosPage() {
  const auth = await requireSession();
  const { data } = await db()
    .from("pc_infos")
    .select("*")
    .order("epingle", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(100);
  const infos = (data ?? []) as InfoRow[];

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Infos"
        description="Les annonces et les informations à connaître, mises à jour par l'administrateur."
        actions={auth.isAdmin ? <InfoDialog /> : undefined}
      />
      {infos.length === 0 ? (
        <EmptyState
          illustration="book"
          title="Aucune info pour l'instant"
          description={
            auth.isAdmin
              ? "Publie une première info : une réunion, une consigne, une date importante."
              : "Les annonces de l'administrateur apparaîtront ici."
          }
          action={auth.isAdmin ? <InfoDialog /> : undefined}
        />
      ) : (
        <div className="stagger space-y-4">
          {infos.map((i) => (
            <InfoCard key={i.id} info={i} isAdmin={auth.isAdmin} />
          ))}
        </div>
      )}
    </div>
  );
}
