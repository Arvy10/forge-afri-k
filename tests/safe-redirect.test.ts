import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/safe-redirect";

describe("redirection sûre", () => {
  it("accepte un chemin interne", () => {
    expect(safeNext("/calendrier?vue=mois")).toBe("/calendrier?vue=mois");
  });
  it("refuse les adresses extérieures", () => {
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("/\\evil.example")).toBe("/");
    expect(safeNext("javascript:alert(1)")).toBe("/");
  });
  it("valeur par défaut", () => {
    expect(safeNext(null)).toBe("/");
    expect(safeNext(undefined, "/x")).toBe("/x");
  });
});
