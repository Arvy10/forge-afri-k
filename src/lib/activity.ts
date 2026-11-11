import type { ActivityRow } from "./database.types";

/** Phrase du journal d'activité : « Marie a terminé « Montage vidéo » ». */
export function activityText(
  a: Pick<ActivityRow, "kind" | "member_id" | "cible_id" | "libelle">,
  names: Map<string, string>,
): string {
  const who = a.member_id ? (names.get(a.member_id) ?? "Un ancien membre") : "L'administrateur";
  const target = a.cible_id ? names.get(a.cible_id) : undefined;
  const t = a.libelle ? `« ${a.libelle} »` : "une tâche";
  switch (a.kind) {
    case "task_created":
      return target && a.cible_id !== a.member_id
        ? `${who} a ajouté ${t} pour ${target}`
        : `${who} a ajouté ${t}`;
    case "task_done":
      return `${who} a terminé ${t}`;
    case "task_reopened":
      return `${who} a rouvert ${t}`;
    case "deliverable_added":
      return `${who} a déposé un livrable sur ${t}`;
    case "nudge":
      return target ? `${who} a relancé ${target} sur ${t}` : `${who} a relancé une tâche : ${t}`;
    case "post_created":
      return `${who} a ajouté le post ${t}`;
    case "post_published":
      return `${who} a publié ${t}`;
  }
}
