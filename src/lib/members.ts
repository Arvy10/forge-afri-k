import type { MemberColor } from "./constants";

/** Version « légère » d'un membre, passée aux composants client. */
export type MemberLite = {
  id: string;
  prenom: string;
  nom: string | null;
  /** « Prénom Nom » */
  name: string;
  couleur: MemberColor;
  roleNames: string[];
  actif: boolean;
};

export const fullName = (m: { prenom: string; nom: string | null }) =>
  [m.prenom, m.nom].filter(Boolean).join(" ");
