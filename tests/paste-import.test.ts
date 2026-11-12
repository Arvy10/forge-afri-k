import { describe, expect, it } from "vitest";
import { sheetToText } from "@/lib/sheet-text";
import {
  importPostsText,
  parseDateFlexible,
  readTable,
  suggestMapping,
  type PersonRef,
} from "@/lib/paste-import";

const TODAY = "2026-11-12";
const people: PersonRef[] = [
  { id: "m1", full_name: "Aïcha Mbemba", email: "" },
  { id: "m2", full_name: "Josué Tchicaya", email: "" },
];

describe("dates françaises", () => {
  it.each([
    ["2026-11-16", "2026-11-16"],
    ["16/11/2026", "2026-11-16"],
    ["16-11-26", "2026-11-16"],
    ["16/11", "2026-11-16"],
    ["16 nov.", "2026-11-16"],
    ["16 novembre 2026", "2026-11-16"],
    ["lundi 16 novembre", "2026-11-16"],
    ["Lun. 16/11", "2026-11-16"],
    ["novembre 16", "2026-11-16"],
    ["1er décembre", "2026-12-01"],
  ])("%s → %s", (input, iso) => {
    expect(parseDateFlexible(input, TODAY).iso).toBe(iso);
  });
  it("choisit l'année la plus proche d'aujourd'hui", () => {
    expect(parseDateFlexible("5 janvier", TODAY).iso).toBe("2027-01-05");
    expect(parseDateFlexible("20 octobre", TODAY).iso).toBe("2026-10-20");
  });
  it("un nom de jour seul n'a pas de date", () => {
    const p = parseDateFlexible("Mardi", TODAY);
    expect(p).toMatchObject({ iso: null, weekday: 2, hasDate: false });
  });
  it("rejette une date impossible", () => {
    expect(parseDateFlexible("31/02/2026", TODAY).iso).toBeNull();
  });
});

describe("lecture du tableau collé", () => {
  it("lit un tableau Markdown avec des barres", () => {
    const t = readTable("| Date | Idée |\n|---|---|\n| 16/11 | Visite |");
    expect(t).toEqual([
      ["Date", "Idée"],
      ["16/11", "Visite"],
    ]);
  });
  it("lit un copier-coller Notion/Excel (tabulations)", () => {
    expect(readTable("Date\tIdée\n16/11\tVisite")).toEqual([
      ["Date", "Idée"],
      ["16/11", "Visite"],
    ]);
  });
});

describe("import d'un calendrier collé", () => {
  it("reconnaît les colonnes par leur titre et adapte les dates", () => {
    const text = [
      "Date\tType\tCanal\tFormat\tIdée\tResponsable\tStatut\tHeure",
      "16/11\tImpact\tInstagram, TikTok\tReel\tPortrait d'un artisan\tAïcha\tÀ faire\t8h30",
      "mardi 17 novembre\tPatrimoine\tFacebook\tPhoto\tLe vieux port\tJosué\tPublié\t12:00",
    ].join("\n");
    const { rows, fatal } = importPostsText(text, people, { today: TODAY });
    expect(fatal).toBeUndefined();
    expect(rows).toHaveLength(2);
    expect(rows[0]!.post).toMatchObject({
      date: "2026-11-16",
      type: "impact",
      canal_principal: "instagram",
      autres_canaux: ["tiktok"],
      format: "video_9_16",
      heure: "08:30",
      responsable_id: "m1",
    });
    expect(rows[1]!.post).toMatchObject({
      date: "2026-11-17",
      statut: "publie",
      responsable_id: "m2",
      heure: "12:00",
    });
  });

  it("rattache des noms de jours à la semaine de départ et passe à la semaine suivante", () => {
    const text = ["Jour\tIdée", "Lundi\tA", "Mercredi\tB", "Lundi\tC"].join("\n");
    const { rows } = importPostsText(text, people, { today: TODAY, weekStart: "2026-11-16" });
    expect(rows.map((r) => r.post?.date)).toEqual(["2026-11-16", "2026-11-18", "2026-11-23"]);
  });

  it("demande la semaine de départ quand il n'y a que des noms de jours", () => {
    const { rows } = importPostsText("Jour\tIdée\nLundi\tA", people, { today: TODAY });
    expect(rows[0]!.errors[0]).toMatch(/semaine de départ/);
  });

  it("utilise les lignes « Semaine du … » comme repère", () => {
    const text = ["Jour\tIdée", "Semaine du 23 novembre", "Jeudi\tA"].join("\n");
    const { rows } = importPostsText(text, people, { today: TODAY });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.post?.date).toBe("2026-11-26");
  });

  it("avertit quand le jour écrit ne correspond pas à la date", () => {
    const { rows } = importPostsText("Date\tIdée\nmardi 16/11\tA", people, { today: TODAY });
    expect(rows[0]!.post?.date).toBe("2026-11-16");
    expect(rows[0]!.warnings.join(" ")).toMatch(/autre jour/);
  });

  it("devine les colonnes quand il n'y a pas de titres", () => {
    const text = [
      "16/11\tInstagram\tPortrait d'un artisan de Poto-Poto qui travaille le bois",
      "17/11\tTikTok\tVisite du vieux port au lever du soleil",
    ].join("\n");
    const { rows, analysis } = importPostsText(text, people, { today: TODAY });
    expect(analysis?.hasHeader).toBe(false);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.post).toMatchObject({ date: "2026-11-16", canal_principal: "instagram" });
    expect(rows[0]!.post?.idee).toMatch(/artisan/);
  });

  it("déduit le type du jour et la préparation", () => {
    const { rows } = importPostsText("Date\tIdée\n17/11\tVisite", people, { today: TODAY });
    expect(rows[0]!.post).toMatchObject({ type: "patrimoine", prep_date: "2026-11-15" });
  });

  it("permet de corriger la correspondance des colonnes", () => {
    const text = "Quand\tQuoi\n16/11\tPortrait";
    const base = importPostsText(text, people, { today: TODAY });
    expect(base.rows[0]!.post?.idee).toBe("Portrait");
    const forced = importPostsText(text, people, { today: TODAY, mapping: ["date", "notes"] });
    expect(forced.rows[0]!.post).toMatchObject({ idee: "", notes: "Portrait" });
  });

  it("garde les notes", () => {
    const { rows } = importPostsText("Date\tIdée\tNotes\n16/11\tA\tPenser à la musique", people, {
      today: TODAY,
    });
    expect(rows[0]!.post?.notes).toBe("Penser à la musique");
  });

  it("signale l'absence de colonne de dates", () => {
    expect(importPostsText("Idée\nA", people, { today: TODAY }).fatal).toMatch(/colonne de dates/);
  });

  it("refuse un texte vide", () => {
    expect(importPostsText("  \n", people, { today: TODAY }).fatal).toBeDefined();
  });

  it("suggère les colonnes d'un tableau avec titres", () => {
    const table = readTable("Date;Canal;Idée\n16/11;IG;A");
    const { mapping, hasHeader } = suggestMapping(table, people, TODAY);
    expect(hasHeader).toBe(true);
    expect(mapping).toEqual(["date", "canal", "idee"]);
  });
});

describe("feuille copiée en entier", () => {
  it("saute les lignes de titre avant la ligne des colonnes", () => {
    const text = [
      "Forge Afri'K · Calendrier éditorial · du 11 novembre au 4 décembre 2026",
      "Pôle Communication & Réseau · 5 posts par semaine",
      "",
      "N°\tDate\tJour\tType de contenu\tCanal principal\tAutres canaux\tFormat\tIdée / scénario\tÀ préparer / filmer le\tHeure de publication\tStatut",
      "1\t11/11/2026\tMer\tCoulisses\tTikTok + Instagram (Reel)\tFacebook (photos)\tVidéo 9:16 · mini-interview\tMini-interview\tDès aujourd'hui (10/11)\t08:00\tÀ faire",
      "4\t16/11/2026\tLun\tImpact\tFacebook (photo)\tInstagram (carrousel)\tCarrousel 3 slides\tPoint d'avancement\tDim 15/11\t08:00\tÀ faire",
    ].join("\n");
    const { rows, analysis } = importPostsText(text, people, { today: TODAY });
    expect(analysis?.hasHeader).toBe(true);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.line).toBe(4); // rang parmi les lignes non vides
    expect(rows[0]!.post).toMatchObject({
      date: "2026-11-11",
      type: "coulisses",
      canal_principal: "tiktok",
      autres_canaux: ["instagram", "facebook"],
      format: "video_9_16",
      prep_date: "2026-11-10",
    });
    expect(rows[1]!.post).toMatchObject({
      type: "impact",
      format: "carrousel",
      prep_date: "2026-11-15",
    });
  });
});

describe("feuille Excel → texte", () => {
  it("convertit dates, nombres et cellules vides", () => {
    const text = sheetToText([
      ["N°", "Date", "Idée"],
      [1, new Date(Date.UTC(2026, 10, 11)), "Mini-interview"],
      [null, null, null],
      [2, "12/11/2026", "Sketch\navec retour"],
    ]);
    expect(text).toBe(
      "N°\tDate\tIdée\n1\t11/11/2026\tMini-interview\n2\t12/11/2026\tSketch avec retour",
    );
    const { rows } = importPostsText(text, people, { today: TODAY });
    expect(rows.map((r) => r.post?.date)).toEqual(["2026-11-11", "2026-11-12"]);
  });
});
