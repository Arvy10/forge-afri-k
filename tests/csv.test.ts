import { describe, expect, it } from "vitest";
import { detectDelimiter, parseCsv, toCsv } from "@/lib/csv";

describe("csv", () => {
  it("détecte le point-virgule d'Excel français", () => {
    expect(detectDelimiter("a;b;c\n1;2;3")).toBe(";");
    expect(detectDelimiter("a,b,c\n1,2,3")).toBe(",");
  });
  it("gère guillemets, séparateurs et sauts de ligne dans une cellule", () => {
    const rows = parseCsv('a;b\r\n"x;y";"ligne 1\nligne 2"\r\n"dit ""oui""";z');
    expect(rows).toEqual([
      ["a", "b"],
      ["x;y", "ligne 1\nligne 2"],
      ['dit "oui"', "z"],
    ]);
  });
  it("ignore le BOM et les lignes vides", () => {
    expect(parseCsv("﻿a;b\n\n1;2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
  it("aller-retour écriture / lecture", () => {
    const data = [
      ["a", "b;c", 'd"e'],
      ["multi\nligne", "", "é"],
    ];
    expect(parseCsv(toCsv(data))).toEqual(data);
  });
  it("neutralise les formules Excel", () => {
    expect(toCsv([["=SOMME(A1)"]])).toContain("'=SOMME(A1)");
  });
});
