import { describe, expect, it } from "vitest";
import { calendarHref, parseCalendarQuery, rangeFor, shiftDate } from "@/lib/calendar-params";

const TODAY = "2026-11-10"; // mardi

describe("paramètres du calendrier", () => {
  it("valeurs par défaut", () => {
    expect(parseCalendarQuery({}, TODAY)).toEqual({ vue: "semaine", date: TODAY });
  });
  it("ignore les valeurs invalides au lieu de planter", () => {
    const q = parseCalendarQuery(
      { vue: "annee", date: "pas-une-date", type: "inconnu", resp: "n'importe quoi", post: "x" },
      TODAY,
    );
    expect(q).toEqual({ vue: "semaine", date: TODAY });
  });
  it("lit les filtres valides", () => {
    const q = parseCalendarQuery(
      {
        vue: "liste",
        type: "fun",
        canal: "tiktok",
        statut: "valide",
        resp: "moi",
        post: "new",
        d: "2026-11-20",
      },
      TODAY,
    );
    expect(q).toMatchObject({
      vue: "liste",
      type: "fun",
      canal: "tiktok",
      statut: "valide",
      resp: "moi",
      post: "new",
      d: "2026-11-20",
    });
  });
});

describe("périodes chargées", () => {
  it("semaine : lundi → dimanche", () => {
    expect(rangeFor({ vue: "semaine", date: "2026-11-10" })).toEqual({
      from: "2026-11-09",
      to: "2026-11-15",
    });
  });
  it("mois : grille complète lundi → dimanche", () => {
    // novembre 2026 : le 1er est un dimanche, le 30 un lundi
    expect(rangeFor({ vue: "mois", date: "2026-11-10" })).toEqual({
      from: "2026-10-26",
      to: "2026-12-06",
    });
  });
  it("liste : le mois civil", () => {
    expect(rangeFor({ vue: "liste", date: "2026-11-10" })).toEqual({
      from: "2026-11-01",
      to: "2026-11-30",
    });
  });
});

describe("navigation", () => {
  it("semaine précédente / suivante", () => {
    expect(shiftDate({ vue: "semaine", date: "2026-11-10" }, 1)).toBe("2026-11-16");
    expect(shiftDate({ vue: "semaine", date: "2026-11-10" }, -1)).toBe("2026-11-02");
  });
  it("mois précédent / suivant, y compris à l'année", () => {
    expect(shiftDate({ vue: "mois", date: "2026-12-15" }, 1)).toBe("2027-01-01");
    expect(shiftDate({ vue: "liste", date: "2027-01-20" }, -1)).toBe("2026-12-01");
  });
  it("construit des liens en gardant les filtres", () => {
    const q = parseCalendarQuery({ vue: "mois", type: "fun" }, TODAY);
    expect(calendarHref(q, { date: "2026-12-01" })).toBe(
      "/calendrier?vue=mois&date=2026-12-01&type=fun",
    );
    expect(calendarHref(q, { post: "new", d: "2026-11-20" })).toContain("post=new&d=2026-11-20");
  });
});
