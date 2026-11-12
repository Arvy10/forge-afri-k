import { describe, expect, it } from "vitest";
import { normalizeCode } from "@/lib/code";

// Codes d'exemple inventés pour les tests : ne jamais y mettre un vrai code.
describe("normalisation des codes", () => {
  it("l'apostrophe typographique d'un téléphone équivaut à l'apostrophe simple", () => {
    expect(normalizeCode("Atelier-d’essai")).toBe("Atelier-d'essai");
    expect(normalizeCode("Atelier-d‘essai")).toBe("Atelier-d'essai");
    expect(normalizeCode("Atelier-d'essai")).toBe("Atelier-d'essai");
  });
  it("retire les espaces autour, mais respecte la casse et les espaces du milieu", () => {
    expect(normalizeCode("  Exemple1234@ \n")).toBe("Exemple1234@");
    expect(normalizeCode("atelier-d'essai")).not.toBe(normalizeCode("Atelier-d'essai"));
    expect(normalizeCode("deux mots")).toBe("deux mots");
  });
  it("accents composés ou décomposés donnent le même code", () => {
    expect(normalizeCode("éte")).toBe(normalizeCode("éte"));
  });
});
