import { describe, expect, it } from "vitest";
import {
  addDaysISO,
  countdownTo,
  defaultPrepDate,
  defaultTypeForDate,
  formatWeekRange,
  isOffRhythm,
  isPrepLate,
  isPrepSoon,
  isoWeekday,
  isISODate,
  publishInstant,
  startOfWeekISO,
  todayISO,
  workWeekISO,
} from "@/lib/dates";

// Semaine de référence : lundi 16 novembre 2026 → vendredi 20 novembre 2026.
const LUN = "2026-11-16";

describe("date de préparation par défaut", () => {
  it("lundi → dimanche précédent", () => {
    expect(defaultPrepDate("2026-11-16")).toBe("2026-11-15");
  });
  it("mardi → dimanche (2 jours avant)", () => {
    expect(defaultPrepDate("2026-11-17")).toBe("2026-11-15");
  });
  it("mercredi → lundi", () => expect(defaultPrepDate("2026-11-18")).toBe("2026-11-16"));
  it("jeudi → mardi", () => expect(defaultPrepDate("2026-11-19")).toBe("2026-11-17"));
  it("vendredi → mercredi", () => expect(defaultPrepDate("2026-11-20")).toBe("2026-11-18"));
  it("traverse un changement de mois", () => {
    expect(defaultPrepDate("2026-12-01")).toBe("2026-11-29"); // mardi 1er déc.
    expect(defaultPrepDate("2026-11-30")).toBe("2026-11-29"); // lundi 30 nov.
  });
  it("traverse un changement d'année", () => {
    expect(defaultPrepDate("2027-01-04")).toBe("2027-01-03"); // lundi
    expect(defaultPrepDate("2027-01-01")).toBe("2026-12-30"); // vendredi
  });
});

describe("rythme par jour", () => {
  it("associe chaque jour à son type", () => {
    expect(workWeekISO(LUN).map(defaultTypeForDate)).toEqual([
      "impact",
      "patrimoine",
      "coulisses",
      "fun",
      "appel_action",
    ]);
  });
  it("pas de type par défaut le week-end", () => {
    expect(defaultTypeForDate("2026-11-21")).toBeNull();
    expect(defaultTypeForDate("2026-11-22")).toBeNull();
  });
  it("détecte un écart au rythme", () => {
    expect(isOffRhythm("fun", "2026-11-16")).toBe(true);
    expect(isOffRhythm("impact", "2026-11-16")).toBe(false);
    expect(isOffRhythm("fun", "2026-11-21")).toBe(false); // week-end : pas d'avertissement
  });
});

describe("semaines", () => {
  it("renvoie lundi → vendredi", () => {
    expect(workWeekISO("2026-11-18")).toEqual([
      "2026-11-16",
      "2026-11-17",
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
    ]);
  });
  it("le dimanche appartient à la semaine qui finit", () => {
    expect(startOfWeekISO("2026-11-22")).toBe("2026-11-16");
  });
  it("numéro du jour ISO", () => {
    expect(isoWeekday("2026-11-15")).toBe(7);
    expect(isoWeekday(LUN)).toBe(1);
  });
  it("libellé de semaine, y compris à cheval sur deux mois", () => {
    expect(formatWeekRange("2026-11-16")).toBe("du 16 au 22 novembre");
    expect(formatWeekRange("2026-11-30")).toBe("du 30 novembre au 6 décembre");
  });
  it("addDaysISO", () => {
    expect(addDaysISO("2026-02-28", 1)).toBe("2026-03-01");
  });
  it("valide les dates ISO", () => {
    expect(isISODate("2026-11-16")).toBe(true);
    expect(isISODate("2026-02-30")).toBe(false);
    expect(isISODate("16/11/2026")).toBe(false);
  });
});

describe("fuseau Africa/Brazzaville", () => {
  it("08:00 à Brazzaville = 07:00 UTC", () => {
    expect(publishInstant(LUN, "08:00").toISOString()).toBe("2026-11-16T07:00:00.000Z");
    expect(publishInstant(LUN, "08:00:00").toISOString()).toBe("2026-11-16T07:00:00.000Z");
  });
  it("le jour change à minuit heure de Brazzaville, pas UTC", () => {
    // 23:30 UTC le 15 = 00:30 le 16 à Brazzaville
    expect(todayISO(new Date("2026-11-15T23:30:00Z"))).toBe("2026-11-16");
    expect(todayISO(new Date("2026-11-15T22:30:00Z"))).toBe("2026-11-15");
  });
});

describe("compte à rebours", () => {
  it("calcule jours, heures, minutes", () => {
    const target = publishInstant(LUN);
    const now = new Date("2026-11-14T04:15:00Z");
    expect(countdownTo(target, now)).toEqual({ past: false, days: 2, hours: 2, minutes: 45 });
  });
  it("signale l'heure passée", () => {
    expect(countdownTo(publishInstant(LUN), new Date("2026-11-16T09:00:00Z")).past).toBe(true);
  });
});

describe("alertes de préparation", () => {
  const today = "2026-11-16";
  it("en retard : date dépassée et statut « À faire »", () => {
    expect(isPrepLate({ prep_date: "2026-11-15", statut: "a_faire" }, today)).toBe(true);
    expect(isPrepLate({ prep_date: "2026-11-15", statut: "en_cours" }, today)).toBe(false);
    expect(isPrepLate({ prep_date: today, statut: "a_faire" }, today)).toBe(false);
    expect(isPrepLate({ prep_date: null, statut: "a_faire" }, today)).toBe(false);
  });
  it("à préparer bientôt : aujourd'hui ou demain", () => {
    expect(isPrepSoon({ prep_date: "2026-11-16", statut: "a_faire" }, today)).toBe(true);
    expect(isPrepSoon({ prep_date: "2026-11-17", statut: "en_cours" }, today)).toBe(true);
    expect(isPrepSoon({ prep_date: "2026-11-18", statut: "a_faire" }, today)).toBe(false);
    expect(isPrepSoon({ prep_date: "2026-11-16", statut: "valide" }, today)).toBe(false);
  });
});
