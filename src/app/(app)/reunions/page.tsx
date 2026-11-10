import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Réunions" };

export default function Page() {
  return (
    <ComingSoon
      feature="reunions"
      title="Réunions"
      sentence="Les comptes rendus des réunions du dimanche, avec les décisions prises et les actions à mener."
      illustration="meeting"
      emptyTitle="Aucun compte rendu pour l'instant"
      emptyDescription="Après chaque réunion du dimanche, les décisions et les actions s'afficheront ici."
    />
  );
}
