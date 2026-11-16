import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { groupWeeks, type DayWithSlots } from "@/lib/calendar";
import type { SlotRow } from "@/lib/database.types";
import { buildPresentation, firstSentence, formatsOf, WEEK_OBJECTIVES } from "@/lib/presentation";

/* Le vrai calendrier du pôle. */
type RawSlot = Record<string, unknown> & { priorite: string };
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
) as { jours: RawDay[] };

const TYPE: Record<string, DayWithSlots["type_de_contenu"]> = {
  Impact: "impact",
  Patrimoine: "patrimoine",
  Coulisses: "coulisses",
  Fun: "fun",
  "Appel à l'action": "appel_action",
};

const days: DayWithSlots[] = raw.jours.map((j) => ({
  id: `d${j.numero}`,
  numero: j.numero,
  date: j.date,
  jour: j.jour,
  semaine: j.semaine,
  theme_semaine: j.theme_semaine,
  type_de_contenu: TYPE[j.type_de_contenu]!,
  consigne_du_jour: j.consigne_du_jour,
  created_at: "",
  updated_at: "",
  slots: j.slots
    .map(
      (s, i) =>
        ({
          ...s,
          id: `s${j.numero}-${i}`,
          day_id: `d${j.numero}`,
          responsable_id: "membre-secret",
          lien: "https://exemple.org/post-prive",
          statut: "valide",
          cree_par: null,
          maj_par: null,
          created_at: "",
          updated_at: "",
        }) as SlotRow,
    )
    .sort((a, b) => (a.priorite === b.priorite ? 0 : a.priorite === "obligatoire" ? -1 : 1)),
}));

describe("première phrase de l'idée", () => {
  it("phrase simple", () => {
    expect(firstSentence("Un point d'avancement simple en 3 slides. Puis la suite.")).toBe(
      "Un point d'avancement simple en 3 slides.",
    );
  });
  it("ne coupe pas à l'intérieur d'une citation entre guillemets français", () => {
    expect(
      firstSentence(
        "Story avec la question : « Qu'est-ce que vous voulez voir sur nos pages cette semaine ? ». On garde les réponses.",
      ),
    ).toBe(
      "Story avec la question : « Qu'est-ce que vous voulez voir sur nos pages cette semaine ? ».",
    );
  });
  it("une seule phrase : elle est rendue en entier", () => {
    expect(firstSentence("Mini-interview : trois ambassadeurs disent ce qu'ils retiennent.")).toBe(
      "Mini-interview : trois ambassadeurs disent ce qu'ils retiennent.",
    );
  });
  it("point d'interrogation, d'exclamation et points de suspension", () => {
    expect(firstSentence("Tu viens ? Oui !")).toBe("Tu viens ?");
    expect(firstSentence("Allez ! On y va.")).toBe("Allez !");
  });
  it("sans ponctuation finale : tout le texte, espaces nettoyées", () => {
    expect(firstSentence("  Un texte   sans fin ")).toBe("Un texte sans fin");
  });
  it("chaque idée du vrai calendrier donne une phrase non vide, plus courte ou égale à l'idée", () => {
    for (const d of days)
      for (const s of d.slots) {
        const t = firstSentence(s.idee);
        expect(t.length, d.date).toBeGreaterThan(5);
        expect(s.idee.replace(/\s+/g, " ").startsWith(t), d.date).toBe(true);
      }
  });
});

describe("formats et canaux", () => {
  it("tous les canaux du post obligatoire, dans l'ordre TikTok · Instagram · Facebook", () => {
    const main = days[0]!.slots[0]!;
    expect(formatsOf(main).map((f) => f.canal)).toEqual(["tiktok", "instagram", "facebook"]);
  });
  it("un canal « Non nécessaire » est retiré", () => {
    const extra = days[0]!.slots[1]!;
    expect(formatsOf(extra).map((f) => f.canal)).toEqual(["instagram", "facebook"]);
  });
});

describe("la présentation du calendrier", () => {
  const weeks = buildPresentation(groupWeeks(days));

  it("4 semaines ; objectifs fournis pour S1, S2 et S3, rien d'inventé pour S4", () => {
    expect(weeks.map((w) => w.objectif)).toEqual([
      "Montrer où on en est, avec honnêteté",
      "Faire connaître la marche culturelle, sans date",
      "Présenter la matinée sportive et mobiliser",
      null,
    ]);
    expect(Object.keys(WEEK_OBJECTIVES)).toEqual(["1", "2", "3"]);
  });

  it("tous les posts du calendrier sont là (40), dans l'ordre des dates", () => {
    const posts = weeks.flatMap((w) => w.posts);
    expect(posts).toHaveLength(40);
    const dates = posts.map((p) => p.date);
    expect([...dates].sort()).toEqual(dates);
  });

  it("n'expose QUE date, type, titre court, format(s), légende (et l'identifiant technique)", () => {
    for (const p of weeks.flatMap((w) => w.posts))
      expect(Object.keys(p).sort()).toEqual([
        "date",
        "formats",
        "id",
        "legende",
        "titreCourt",
        "type",
      ]);
  });

  it("aucune consigne, note, statut, responsable ou lien dans ce qui est affiché", () => {
    const shown = JSON.stringify(weeks);
    expect(shown).not.toContain("membre-secret");
    expect(shown).not.toContain("exemple.org/post-prive");
    expect(shown).not.toMatch(/"statut"|"responsable|"lien"|"comment_faire"|"notes"|"accroche"/);
    // aucune étape « comment faire » du calendrier ne doit apparaître telle quelle
    const steps = days.flatMap((d) => d.slots.flatMap((s) => s.comment_faire));
    for (const step of steps) expect(shown.includes(JSON.stringify(step).slice(1, -1))).toBe(false);
  });

  it("la légende est reprise mot pour mot ; elle est absente des petits posts qui n'en ont pas", () => {
    const first = weeks[0]!.posts[0]!;
    expect(first.legende).toBe(days[0]!.slots[0]!.legende);
    expect(weeks[0]!.posts[1]!.legende).toBeNull();
  });

  it("le titre court est la première phrase de l'idée, pas le titre du post", () => {
    expect(weeks[0]!.posts[0]!.titreCourt).toBe(
      "Un point d'avancement simple en 3 slides pour montrer que le projet avance.",
    );
  });
});
