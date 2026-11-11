import { formatDayLong } from "./dates";

/**
 * Message de relance, court et poli, prêt à coller dans WhatsApp.
 * (Pas d'envoi automatique : la personne le copie et l'envoie elle-même.)
 */
export function nudgeMessage(opts: {
  prenom: string;
  titre: string;
  echeance?: string | null;
  par?: string | null;
  late?: boolean;
  note?: string;
}): string {
  const when = opts.echeance
    ? opts.late
      ? ` (prévue pour ${formatDayLong(opts.echeance)})`
      : ` (pour ${formatDayLong(opts.echeance)})`
    : "";
  const lines = [
    `Bonjour ${opts.prenom},`,
    `petit rappel pour la tâche « ${opts.titre} »${when}.`,
    ...(opts.note ? [opts.note] : []),
    "Dis-moi si tu es bloqué(e) ou si tu as besoin d'un coup de main.",
    opts.par ? `Merci ! ${opts.par}` : "Merci !",
  ];
  return lines.join("\n");
}
