import { describe, expect, it } from "vitest";
import { filterTasks, parseTaskQuery, tasksHref } from "@/lib/tasks-params";

const TODAY = "2026-11-11";
const t = (
  member_id: string | null,
  statut: "a_faire" | "en_cours" | "fait",
  echeance: string | null,
) => ({ member_id, statut, echeance, fait_le: statut === "fait" ? "2026-11-10T10:00:00Z" : null });

describe("paramètres des tâches", () => {
  it("valeurs par défaut et valeurs invalides ignorées", () => {
    expect(parseTaskQuery({})).toEqual({ vue: "liste" });
    expect(
      parseTaskQuery({ vue: "x", membre: "n'importe quoi", statut: "zzz", ech: "zzz" }),
    ).toEqual({ vue: "liste" });
  });
  it("lit les filtres valides", () => {
    expect(
      parseTaskQuery({ vue: "kanban", membre: "moi", statut: "en_cours", ech: "retard" }),
    ).toEqual({ vue: "kanban", membre: "moi", statut: "en_cours", ech: "retard" });
  });
  it("construit les liens en gardant les filtres", () => {
    expect(tasksHref({ vue: "liste", membre: "moi" }, { statut: "fait" })).toBe(
      "/taches?vue=liste&membre=moi&statut=fait",
    );
  });
});

describe("filtres des tâches", () => {
  const A = "00000000-0000-4000-8000-0000000000a1";
  const B = "00000000-0000-4000-8000-0000000000b1";
  const tasks = [
    t(A, "a_faire", "2026-11-05"),
    t(A, "fait", "2026-11-09"),
    t(B, "en_cours", "2026-11-12"),
    t(B, "a_faire", "2026-11-30"),
    t(B, "a_faire", null),
  ];
  it("par membre (« moi » = la personne choisie)", () => {
    expect(filterTasks(tasks, { vue: "liste", membre: A }, null, TODAY)).toHaveLength(2);
    expect(filterTasks(tasks, { vue: "liste", membre: "moi" }, B, TODAY)).toHaveLength(3);
  });
  it("par statut", () =>
    expect(filterTasks(tasks, { vue: "liste", statut: "fait" }, null, TODAY)).toHaveLength(1));
  it("par échéance : retard, cette semaine, plus tard, sans date", () => {
    expect(filterTasks(tasks, { vue: "liste", ech: "retard" }, null, TODAY)).toHaveLength(1);
    expect(filterTasks(tasks, { vue: "liste", ech: "semaine" }, null, TODAY)).toHaveLength(1);
    expect(filterTasks(tasks, { vue: "liste", ech: "plus_tard" }, null, TODAY)).toHaveLength(2); // 30 nov. + sans date
    expect(filterTasks(tasks, { vue: "liste", ech: "sans" }, null, TODAY)).toHaveLength(1);
  });
});
