import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  dayHeadline,
  defaultWeek,
  groupWeeks,
  isSlotLate,
  nextMandatory,
  prepSoon,
  slotOptionLabel,
  splitSlots,
  weekdayOf,
  type DayWithSlots,
} from "@/lib/calendar";
import { exportCalendarCsv, CALENDAR_CSV_HEADERS } from "@/lib/calendar-csv";
import { parseCsv } from "@/lib/csv";
import type { SlotRow } from "@/lib/database.types";

/* Le vrai calendrier du pôle (source de vérité du chargement en base). */
type RawSlot = Omit<
  SlotRow,
  "id" | "day_id" | "responsable_id" | "cree_par" | "maj_par" | "created_at" | "updated_at" | "lien"
> & {
  responsable: null;
  lien: null;
};
type RawDay = {
  numero: number;
  date: string;
  jour: string;
  semaine: number;
  theme_semaine: string;
  type_de_contenu: string;
  consigne_du_jour: string;
  slots: RawSlot[];
};
const raw = JSON.parse(
  readFileSync(path.resolve(__dirname, "../data/calendrier-16nov-11dec.json"), "utf8"),
) as { meta: { regles: string[] }; jours: RawDay[] };

const TYPE = {
  Impact: "impact",
  Patrimoine: "patrimoine",
  Coulisses: "coulisses",
  Fun: "fun",
  "Appel à l'action": "appel_action",
} as const;

const days: DayWithSlots[] = raw.jours.map((j) => ({
  id: `d${j.numero}`,
  numero: j.numero,
  date: j.date,
  jour: j.jour,
  semaine: j.semaine,
  theme_semaine: j.theme_semaine,
  type_de_contenu: TYPE[j.type_de_contenu as keyof typeof TYPE],
  consigne_du_jour: j.consigne_du_jour,
  created_at: "",
  updated_at: "",
  slots: j.slots
    .map((s, i) => ({
      ...s,
      id: `s${j.numero}-${i}`,
      day_id: `d${j.numero}`,
      responsable_id: null,
      lien: null,
      cree_par: null,
      maj_par: null,
      created_at: "",
      updated_at: "",
    }))
    .sort((a, b) => (a.priorite === b.priorite ? 0 : a.priorite === "obligatoire" ? -1 : 1)),
}));

describe("le calendrier fourni est cohérent avec les règles du pôle", () => {
  it("20 jours, du lundi 16 novembre au vendredi 11 décembre, du lundi au vendredi seulement", () => {
    expect(days).toHaveLength(20);
    expect(days[0]!.date).toBe("2026-11-16");
    expect(days[19]!.date).toBe("2026-12-11");
    for (const d of days) expect(weekdayOf(d.date), d.date).toBeLessThanOrEqual(5);
  });

  it("le type suit le jour : lundi Impact … vendredi Appel à l'action", () => {
    const expected = ["impact", "patrimoine", "coulisses", "fun", "appel_action"];
    for (const d of days) expect(d.type_de_contenu, d.date).toBe(expected[weekdayOf(d.date) - 1]);
  });

  it("2 créneaux par jour : un obligatoire et un facultatif", () => {
    for (const d of days) {
      expect(d.slots, d.date).toHaveLength(2);
      expect(d.slots.filter((s) => s.priorite === "obligatoire")).toHaveLength(1);
      expect(d.slots.filter((s) => s.priorite === "facultatif")).toHaveLength(1);
    }
  });

  it("l'obligatoire est le matin lundi, mercredi, vendredi ; le soir mardi et jeudi", () => {
    for (const d of days) {
      const main = splitSlots(d).main!;
      const morning = [1, 3, 5].includes(weekdayOf(d.date));
      expect(main.moment, d.date).toBe(morning ? "matin" : "soir");
      expect(main.heure.slice(0, 5), d.date).toBe(morning ? "08:00" : "19:00");
    }
  });

  it("un post se prépare 2 jours avant (le dimanche pour le lundi), un petit post la veille", () => {
    const iso = (d: string, n: number) => {
      const t = new Date(`${d}T12:00:00Z`);
      t.setUTCDate(t.getUTCDate() + n);
      return t.toISOString().slice(0, 10);
    };
    for (const d of days) {
      const { main, extra } = splitSlots(d);
      expect(main!.a_preparer_le, d.date).toBe(iso(d.date, weekdayOf(d.date) === 1 ? -1 : -2));
      // le petit post du lundi se prépare le dimanche aussi ; ensuite la veille
      expect(extra!.a_preparer_le, d.date).toBe(iso(d.date, -1));
    }
  });

  it("le post obligatoire est complet : étapes, accroche, légende, trois formats", () => {
    for (const d of days) {
      const m = splitSlots(d).main!;
      expect(m.comment_faire.length, d.date).toBeGreaterThanOrEqual(3);
      expect(m.accroche, d.date).toBeTruthy();
      expect(m.legende, d.date).toBeTruthy();
      expect(Object.keys(m.formats).sort(), d.date).toEqual(["facebook", "instagram", "tiktok"]);
    }
  });

  it("aucune date annoncée pour la marche culturelle ni la matinée sportive", () => {
    const text = JSON.stringify(
      days.flatMap((d) => d.slots.map((s) => [s.idee, s.legende, s.comment_faire])),
    );
    expect(text).not.toMatch(/marche culturelle[^.]*\b\d{1,2}\s?(novembre|décembre)/i);
    expect(raw.meta.regles.some((r) => /Aucune date n'est annoncée/.test(r))).toBe(true);
  });

  it("4 semaines de 5 jours avec leur thème", () => {
    const weeks = groupWeeks(days);
    expect(weeks.map((w) => [w.semaine, w.days.length, w.theme])).toEqual([
      [1, 5, "Bilan et confiance"],
      [2, 5, "Marche culturelle"],
      [3, 5, "Sport et mobilisation"],
      [4, 5, "École et impact"],
    ]);
  });
});

describe("semaine affichée par défaut", () => {
  const weeks = groupWeeks(days);
  it("celle d'aujourd'hui", () => {
    expect(defaultWeek(weeks, "2026-11-25")!.semaine).toBe(2);
    expect(defaultWeek(weeks, "2026-11-27")!.semaine).toBe(2);
  });
  it("le week-end : la semaine suivante", () => {
    expect(defaultWeek(weeks, "2026-11-28")!.semaine).toBe(3);
  });
  it("avant le début la première, après la fin la dernière", () => {
    expect(defaultWeek(weeks, "2026-11-12")!.semaine).toBe(1);
    expect(defaultWeek(weeks, "2027-01-10")!.semaine).toBe(4);
  });
  it("calendrier vide : rien", () => {
    expect(defaultWeek([], "2026-11-12")).toBeNull();
  });
});

describe("retard de préparation", () => {
  const slot = (over: Partial<SlotRow>) =>
    ({
      priorite: "obligatoire",
      statut: "a_faire",
      a_preparer_le: "2026-11-15",
      ...over,
    }) as SlotRow;
  it("signalé pour un obligatoire encore « à faire » dont la date est dépassée", () => {
    expect(isSlotLate(slot({}), "2026-11-16")).toBe(true);
  });
  it("pas le jour même, ni si commencé, ni pour un facultatif", () => {
    expect(isSlotLate(slot({}), "2026-11-15")).toBe(false);
    expect(isSlotLate(slot({ statut: "en_cours" }), "2026-11-16")).toBe(false);
    expect(isSlotLate(slot({ priorite: "facultatif" }), "2026-11-16")).toBe(false);
    expect(isSlotLate(slot({ a_preparer_le: null }), "2026-11-16")).toBe(false);
  });
});

describe("prochain post obligatoire", () => {
  it("le dimanche 15 novembre : le lundi 16 à 8 h", () => {
    const n = nextMandatory(days, new Date("2026-11-15T10:00:00+01:00"))!;
    expect(n.day.date).toBe("2026-11-16");
    expect(n.slot.priorite).toBe("obligatoire");
  });
  it("le mardi 17 à 10 h : le mardi soir à 19 h (le facultatif du matin est ignoré)", () => {
    const n = nextMandatory(days, new Date("2026-11-17T10:00:00+01:00"))!;
    expect(n.day.date).toBe("2026-11-17");
    expect(n.slot.heure.slice(0, 5)).toBe("19:00");
  });
  it("un post publié est sauté", () => {
    const copy = structuredClone(days);
    splitSlots(copy[0]!).main!.statut = "publie";
    expect(nextMandatory(copy, new Date("2026-11-15T10:00:00+01:00"))!.day.date).toBe("2026-11-17");
  });
  it("après le dernier : rien", () => {
    expect(nextMandatory(days, new Date("2027-01-01T00:00:00+01:00"))).toBeNull();
  });
});

describe("à préparer bientôt", () => {
  it("le dimanche 15 : le lundi et le mardi, obligatoires d'abord", () => {
    const list = prepSoon(days, "2026-11-15");
    expect(list.length).toBeGreaterThan(0);
    expect(list[0]!.slot.priorite).toBe("obligatoire");
    for (const { slot } of list) expect(slot.a_preparer_le! <= "2026-11-16").toBe(true);
  });
  it("exclut ce qui est validé ou publié", () => {
    const copy = structuredClone(days);
    for (const s of copy.flatMap((d) => d.slots)) s.statut = "valide";
    expect(prepSoon(copy, "2026-11-15")).toEqual([]);
  });
});

describe("textes de la fiche", () => {
  it("en-tête du jour", () => {
    expect(dayHeadline({ date: "2026-11-16", jour: "Lundi" }, "Impact", "2026-11-16")).toBe(
      "Aujourd'hui, c'est Impact",
    );
    expect(dayHeadline({ date: "2026-11-17", jour: "Mardi" }, "Patrimoine", "2026-11-16")).toBe(
      "Demain, c'est Patrimoine",
    );
    expect(
      dayHeadline({ date: "2026-11-20", jour: "Vendredi" }, "Appel à l'action", "2026-11-16"),
    ).toBe("Vendredi, c'est Appel à l'action");
  });
  it("libellé de créneau pour lier une tâche", () => {
    expect(
      slotOptionLabel({ date: "2026-11-16", jour: "Lundi" }, { titre: "Où en est Forge Afri'K ?" }),
    ).toBe("Lun 16/11 · Où en est Forge Afri'K ?");
  });
});

describe("export CSV", () => {
  it("une ligne par créneau, textes intacts, relisible", () => {
    const csv = exportCalendarCsv(days, new Map());
    const rows = parseCsv(csv, ";");
    expect(rows[0]).toEqual([...CALENDAR_CSV_HEADERS]);
    expect(rows).toHaveLength(1 + 40);
    const first = rows[1]!;
    expect(first[1]).toBe("2026-11-16");
    expect(first[8]).toBe("Obligatoire");
    expect(first[9]).toBe("Où en est Forge Afri'K ?");
    expect(first[13]).toBe(splitSlots(days[0]!).main!.legende);
  });
});
