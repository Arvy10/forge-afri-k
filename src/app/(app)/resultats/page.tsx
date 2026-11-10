import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Résultats" };

export default function Page() {
  return (
    <ComingSoon
      feature="resultats"
      title="Résultats"
      sentence="Les vues, likes, commentaires et abonnés, post par post et semaine par semaine."
      illustration="chart"
      emptyTitle="Pas encore de chiffres"
      emptyDescription="Quand ce suivi sera prêt, tu verras ici ce qui fonctionne le mieux auprès de la communauté."
    />
  );
}
