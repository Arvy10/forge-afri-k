import type { Metadata } from "next";
import { ComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = { title: "Bibliothèque" };

export default function Page() {
  return (
    <ComingSoon
      feature="bibliotheque"
      title="Bibliothèque"
      sentence="Les idées de vidéos, scripts, légendes types, visuels et logos du pôle, rangés au même endroit."
      illustration="folder"
      emptyTitle="Rien à ranger pour l'instant"
      emptyDescription="Bientôt, tu pourras retrouver ici les scripts, les légendes types, les visuels et les logos de Forge Afri'K."
    />
  );
}
