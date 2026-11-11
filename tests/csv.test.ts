import { describe, expect, it } from "vitest";
import { detectDelimiter, parseCsv, toCsv } from "@/lib/csv";
import { exportPostsCsv, importPostsCsv, norm, parseDateCell, parseTimeCell } from "@/lib/post-csv";
import type { PostRow } from "@/lib/database.types";

const people = [
  { id: "00000000-0000-4000-8000-000000000001", full_name: "Arvy Zabidi", email: "arvy@x.org" },
  { id: "00000000-0000-4000-8000-000000000002", full_name: "Marie Dupont", email: "marie@x.org" },
];

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

describe("import des posts", () => {
  const header =
    "N°;Date;Jour;Type de contenu;Canal principal;Autres canaux;Format;Idée / scénario;À préparer / filmer le;Heure de publication;Légende (copywriting);Responsable;Statut;Lien du post";

  it("normalise les libellés", () => {
    expect(norm("Idée / scénario")).toBe("idee scenario");
    expect(norm("Appel à l'action")).toBe("appel a laction");
  });
  it("lit les dates et heures françaises", () => {
    expect(parseDateCell("16/11/2026")).toBe("2026-11-16");
    expect(parseDateCell("2026-11-16")).toBe("2026-11-16");
    expect(parseDateCell("31/02/2026")).toBeNull();
    expect(parseTimeCell("8h")).toBe("08:00");
    expect(parseTimeCell("08:00")).toBe("08:00");
    expect(parseTimeCell("8h30")).toBe("08:30");
    expect(parseTimeCell("25:00")).toBeNull();
  });
  it("importe une ligne complète", () => {
    const csv = `${header}\n1;16/11/2026;lun.;Impact;Instagram;TikTok, Facebook;Vidéo 9:16;Avancement des séminaires;15/11/2026;08:00;Légende ici;Marie;À faire;`;
    const { rows, fatal } = importPostsCsv(csv, people);
    expect(fatal).toBeUndefined();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.errors).toEqual([]);
    expect(rows[0]!.post).toMatchObject({
      numero: 1,
      date: "2026-11-16",
      type: "impact",
      canal_principal: "instagram",
      autres_canaux: ["tiktok", "facebook"],
      format: "video_9_16",
      prep_date: "2026-11-15",
      heure: "08:00",
      responsable_id: people[1]!.id,
      statut: "a_faire",
    });
  });
  it("déduit type, préparation et canal quand ils manquent", () => {
    const csv = "Date;Idée\n17/11/2026;Visite du port";
    const { rows } = importPostsCsv(csv, people);
    expect(rows[0]!.post).toMatchObject({
      type: "patrimoine",
      prep_date: "2026-11-15",
      canal_principal: "instagram",
    });
    expect(rows[0]!.warnings.length).toBeGreaterThan(0);
  });
  it("signale les erreurs ligne par ligne sans tout bloquer", () => {
    const csv = `${header}\n;;;Impact;;;;;;;;;;\n2;18/11/2026;;Fun;Pinterest;;;;;;;;;`;
    const { rows } = importPostsCsv(csv, people);
    expect(rows[0]!.errors[0]).toMatch(/Date/);
    expect(rows[1]!.errors[0]).toMatch(/Canal principal inconnu/);
    expect(rows.every((r) => !r.post)).toBe(true);
  });
  it("refuse un fichier sans colonne Date", () => {
    expect(importPostsCsv("Idée\nx", people).fatal).toMatch(/Date/);
  });
  it("l'export peut être réimporté", () => {
    const post = {
      id: "p1",
      numero: 3,
      date: "2026-11-18",
      type: "coulisses",
      canal_principal: "tiktok",
      autres_canaux: ["instagram"],
      format: "carrousel",
      idee: "Séance; de travail",
      prep_date: "2026-11-16",
      heure: "08:00:00",
      legende: "Texte\nsur deux lignes",
      responsable_id: people[0]!.id,
      statut: "en_cours",
      lien: "https://exemple.org/x",
      notes: "",
      cree_par: null,
      maj_par: null,
      created_at: "",
      updated_at: "",
    } as PostRow;
    const { rows } = importPostsCsv(exportPostsCsv([post], people), people);
    expect(rows[0]!.errors).toEqual([]);
    expect(rows[0]!.post).toMatchObject({
      numero: 3,
      date: "2026-11-18",
      type: "coulisses",
      canal_principal: "tiktok",
      autres_canaux: ["instagram"],
      format: "carrousel",
      idee: "Séance; de travail",
      legende: "Texte\nsur deux lignes",
      statut: "en_cours",
      responsable_id: people[0]!.id,
      lien: "https://exemple.org/x",
    });
  });
});
