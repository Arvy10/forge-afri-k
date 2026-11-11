import { describe, expect, it } from "vitest";
import { activityText } from "@/lib/activity";

const names = new Map([
  ["a", "Arvy"],
  ["b", "Marie"],
]);
const row = (
  kind: Parameters<typeof activityText>[0]["kind"],
  member_id: string | null,
  cible_id: string | null,
  libelle = "Montage vidéo",
) => ({ kind, member_id, cible_id, libelle });

describe("journal d'activité", () => {
  it("terminé / rouvert / livrable", () => {
    expect(activityText(row("task_done", "b", "b"), names)).toBe(
      "Marie a terminé « Montage vidéo »",
    );
    expect(activityText(row("task_reopened", "b", "b"), names)).toBe(
      "Marie a rouvert « Montage vidéo »",
    );
    expect(activityText(row("deliverable_added", "b", "b"), names)).toBe(
      "Marie a déposé un livrable sur « Montage vidéo »",
    );
  });
  it("ajout : « pour » seulement si c'est pour quelqu'un d'autre", () => {
    expect(activityText(row("task_created", "a", "b"), names)).toBe(
      "Arvy a ajouté « Montage vidéo » pour Marie",
    );
    expect(activityText(row("task_created", "a", "a"), names)).toBe(
      "Arvy a ajouté « Montage vidéo »",
    );
  });
  it("relance", () =>
    expect(activityText(row("nudge", "a", "b"), names)).toBe(
      "Arvy a relancé Marie sur « Montage vidéo »",
    ));
  it("auteur inconnu : administrateur sans identité, ou ancien membre", () => {
    expect(activityText(row("task_created", null, "b"), names)).toBe(
      "L'administrateur a ajouté « Montage vidéo » pour Marie",
    );
    expect(activityText(row("task_done", "zzz", null), names)).toBe(
      "Un ancien membre a terminé « Montage vidéo »",
    );
  });
  it("posts", () => {
    expect(activityText(row("post_created", "a", "b", "Visite du port"), names)).toBe(
      "Arvy a ajouté le post « Visite du port »",
    );
    expect(activityText(row("post_published", "b", "b", "Visite du port"), names)).toBe(
      "Marie a publié « Visite du port »",
    );
  });
  it("libellé vide", () =>
    expect(activityText(row("task_done", "b", "b", ""), names)).toBe("Marie a terminé une tâche"));
});
