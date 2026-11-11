import { describe, expect, it } from "vitest";
import {
  groupOf,
  groupTasks,
  inWeek,
  isLate,
  weekBounds,
  weekProgress,
  type ProgressTask,
} from "@/lib/progress";
import { nudgeMessage } from "@/lib/nudge";

// Mercredi 11 novembre 2026 : semaine du lundi 9 au dimanche 15.
const TODAY = "2026-11-11";
const t = (
  statut: ProgressTask["statut"],
  echeance: string | null,
  fait_le: string | null = null,
): ProgressTask => ({ statut, echeance, fait_le });

describe("semaine", () => {
  it("lundi → dimanche", () =>
    expect(weekBounds(TODAY)).toEqual({ start: "2026-11-09", end: "2026-11-15" }));
});

describe("progression de la semaine", () => {
  it("compte les tâches de la semaine, faites ou non", () => {
    const tasks = [
      t("fait", "2026-11-10", "2026-11-10T09:00:00Z"),
      t("fait", "2026-11-12", "2026-11-11T08:00:00Z"),
      t("en_cours", "2026-11-13"),
      t("a_faire", "2026-11-14"),
      t("a_faire", "2026-11-15"),
    ];
    expect(weekProgress(tasks, TODAY)).toMatchObject({ done: 2, total: 5, pct: 40, late: 0 });
  });
  it("une tâche en retard compte dans la semaine et dans les retards", () => {
    const p = weekProgress(
      [t("a_faire", "2026-11-03"), t("fait", "2026-11-10", "2026-11-10T09:00:00Z")],
      TODAY,
    );
    expect(p).toMatchObject({ done: 1, total: 2, late: 1 });
  });
  it("ignore ce qui est prévu plus tard ou sans échéance", () => {
    expect(
      weekProgress([t("a_faire", "2026-11-20"), t("a_faire", null), t("en_cours", null)], TODAY),
    ).toMatchObject({ total: 0, pct: 0 });
  });
  it("une tâche terminée cette semaine compte même sans échéance ou avec une ancienne échéance", () => {
    expect(inWeek(t("fait", null, "2026-11-10T10:00:00Z"), TODAY)).toBe(true);
    expect(inWeek(t("fait", "2026-10-01", "2026-11-09T10:00:00Z"), TODAY)).toBe(true);
    expect(inWeek(t("fait", "2026-10-01", "2026-10-02T10:00:00Z"), TODAY)).toBe(false);
  });
  it("pas de division par zéro", () =>
    expect(weekProgress([], TODAY)).toEqual({ done: 0, total: 0, pct: 0, late: 0 }));
  it("le jour de la tâche suit le fuseau de Brazzaville (UTC+1)", () => {
    // 23:30 UTC le dimanche 8 = 00:30 le lundi 9 à Brazzaville : appartient à la semaine
    expect(inWeek(t("fait", null, "2026-11-08T23:30:00Z"), TODAY)).toBe(true);
    expect(inWeek(t("fait", null, "2026-11-08T22:30:00Z"), TODAY)).toBe(false);
  });
});

describe("groupes de tâches", () => {
  it("retard / cette semaine / plus tard / faites", () => {
    expect(groupOf(t("a_faire", "2026-11-10"), TODAY)).toBe("retard");
    expect(groupOf(t("a_faire", TODAY), TODAY)).toBe("semaine");
    expect(groupOf(t("en_cours", "2026-11-15"), TODAY)).toBe("semaine");
    expect(groupOf(t("a_faire", "2026-11-16"), TODAY)).toBe("plus_tard");
    expect(groupOf(t("a_faire", null), TODAY)).toBe("plus_tard");
    expect(groupOf(t("fait", "2026-11-01", "2026-11-02T00:00:00Z"), TODAY)).toBe("faites");
  });
  it("trie par échéance, sans échéance en dernier", () => {
    const g = groupTasks(
      [t("a_faire", null), t("a_faire", "2026-11-30"), t("a_faire", "2026-11-20")],
      TODAY,
    );
    expect(g.plus_tard.map((x) => x.echeance)).toEqual(["2026-11-20", "2026-11-30", null]);
  });
  it("une tâche faite n'est jamais en retard", () =>
    expect(isLate(t("fait", "2026-10-01"), TODAY)).toBe(false));
});

describe("message de relance", () => {
  it("poli, avec le titre et l'échéance", () => {
    const m = nudgeMessage({
      prenom: "Marie",
      titre: "Montage vidéo",
      echeance: "2026-11-12",
      par: "Arvy",
    });
    expect(m).toContain("Bonjour Marie,");
    expect(m).toContain("« Montage vidéo »");
    expect(m).toContain("jeudi 12 novembre");
    expect(m.endsWith("Merci ! Arvy")).toBe(true);
  });
  it("sans échéance ni auteur", () => {
    const m = nudgeMessage({ prenom: "Paul", titre: "Visuel" });
    expect(m).not.toContain("(pour");
    expect(m.endsWith("Merci !")).toBe(true);
  });
  it("ajoute la note et adapte le texte quand c'est en retard", () => {
    const m = nudgeMessage({
      prenom: "Léa",
      titre: "Flyer",
      echeance: "2026-11-05",
      late: true,
      note: "On en a besoin pour la réunion.",
    });
    expect(m).toContain("prévue pour");
    expect(m).toContain("On en a besoin pour la réunion.");
  });
});
