import { describe, expect, it } from "vitest";
import { canBeParent, flattenRoles, roleLabel, roleTree, summarizeRoles } from "@/lib/roles";
import type { RoleRow } from "@/lib/database.types";

const r = (id: string, nom: string, parent_id: string | null = null, ordre = 0): RoleRow => ({
  id,
  nom,
  parent_id,
  ordre,
  mission: "",
  ne_fait_pas: "",
  created_at: "",
  updated_at: "",
});
const ROLES = [
  r("v", "Vidéo", null, 2),
  r("c", "Copywriter", null, 1),
  r("m", "Montage", "v", 1),
  r("t", "Tournage", "v", 0),
];

describe("rôles et sous-rôles", () => {
  it("arbre : rôles principaux triés, sous-rôles rattachés", () => {
    const tree = roleTree(ROLES);
    expect(tree.map((n) => n.role.nom)).toEqual(["Copywriter", "Vidéo"]);
    expect(tree[1]!.children.map((c) => c.nom)).toEqual(["Tournage", "Montage"]);
  });
  it("libellé : « Parent › Sous-rôle »", () => {
    const byId = new Map(ROLES.map((x) => [x.id, x]));
    expect(roleLabel(ROLES[2]!, byId)).toBe("Vidéo › Montage");
    expect(roleLabel(ROLES[0]!, byId)).toBe("Vidéo");
  });
  it("liste à plat dans l'ordre d'affichage", () => {
    expect(flattenRoles(ROLES).map((x) => `${x.depth}:${x.role.nom}`)).toEqual([
      "0:Copywriter",
      "0:Vidéo",
      "1:Tournage",
      "1:Montage",
    ]);
  });
  it("un sous-rôle dont le parent a disparu est traité comme un rôle principal", () => {
    expect(roleTree([r("x", "Orphelin", "inconnu")]).map((n) => n.role.nom)).toEqual(["Orphelin"]);
  });
  it("règles de parenté", () => {
    expect(canBeParent("c", "v", ROLES)).toEqual({ ok: true });
    expect(canBeParent("c", null, ROLES)).toEqual({ ok: true });
    expect(canBeParent("v", "v", ROLES).ok).toBe(false); // son propre parent
    expect(canBeParent("c", "m", ROLES).ok).toBe(false); // le parent est déjà un sous-rôle
    expect(canBeParent("v", "c", ROLES).ok).toBe(false); // « Vidéo » a des sous-rôles
    expect(canBeParent(null, "v", ROLES)).toEqual({ ok: true }); // création
  });
});

describe("résumé des rôles d'une personne", () => {
  it("aucun rôle", () => {
    expect(summarizeRoles([])).toBe("Rôle à définir");
    expect(summarizeRoles(undefined)).toBe("Rôle à définir");
  });
  it("jusqu'à deux noms, puis « +N »", () => {
    expect(summarizeRoles(["Rédaction"])).toBe("Rédaction");
    expect(summarizeRoles(["Rédaction", "Vidéo"])).toBe("Rédaction · Vidéo");
    expect(summarizeRoles(["A", "B", "C", "D"])).toBe("A · B +2");
  });
});
