import type { DayWithSlots, WeekInfo } from "./calendar";
import type { Channel, ContentType } from "./constants";
import type { SlotRow } from "./database.types";

/**
 * Vue « Présentation » du calendrier : lecture seule, pensée pour être montrée.
 * Elle n'expose que la date, le type, le titre court, le format, le canal et la légende.
 * Les consignes (« comment faire », « ne pas… »), les notes internes, le statut, le responsable
 * et le lien n'y figurent JAMAIS : ils ne sont même pas copiés dans les données de cette vue.
 */

/** Ligne d'objectif en haut de chaque semaine (textes fournis ; la semaine 4 n'en a pas encore). */
export const WEEK_OBJECTIVES: Readonly<Record<number, string>> = {
  1: "Montrer où on en est, avec honnêteté",
  2: "Faire connaître la marche culturelle, sans date",
  3: "Présenter la matinée sportive et mobiliser",
};

export type PresentationFormat = { canal: Channel; format: string };

export type PresentationPost = {
  id: string;
  date: string;
  type: ContentType;
  /** Première phrase de l'idée. */
  titreCourt: string;
  /** Un format par canal réellement utilisé. */
  formats: PresentationFormat[];
  legende: string | null;
};

export type PresentationWeek = {
  semaine: number;
  theme: string;
  objectif: string | null;
  posts: PresentationPost[];
};

/**
 * Première phrase d'un texte. Un point, un point d'exclamation, de suspension ou d'interrogation
 * ne termine la phrase que s'il est hors guillemets français « … » et suivi d'une espace (ou de la fin).
 * Exemple : « Story avec la question : « Qu'est-ce que vous voulez voir ? ». On garde… »
 *           → « Story avec la question : « Qu'est-ce que vous voulez voir ? ». »
 */
export function firstSentence(text: string): string {
  const s = text.trim().replace(/\s+/g, " ");
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (c === "«") depth++;
    else if (c === "»") depth = Math.max(0, depth - 1);
    else if (depth === 0 && (c === "." || c === "!" || c === "?" || c === "…")) {
      let end = i + 1;
      // on garde les ponctuations qui suivent (« ?! », « … », guillemet fermant)
      while (end < s.length && /[.!?…»"”)]/.test(s[end]!)) end++;
      if (end >= s.length || s[end] === " ") return s.slice(0, end).trim();
    }
  }
  return s;
}

const NOT_NEEDED = /non\s+n[ée]cessaire/i;

/** Formats par canal, dans l'ordre TikTok · Instagram · Facebook, sans les canaux « non nécessaires ». */
export function formatsOf(slot: Pick<SlotRow, "formats">): PresentationFormat[] {
  const order: Channel[] = ["tiktok", "instagram", "facebook"];
  return order.flatMap((canal) => {
    const format = slot.formats?.[canal]?.trim();
    return format && !NOT_NEEDED.test(format) ? [{ canal, format }] : [];
  });
}

/** Un créneau, réduit aux six informations de la présentation (et rien d'autre). */
export function toPresentationPost(day: DayWithSlots, slot: SlotRow): PresentationPost {
  return {
    id: slot.id,
    date: day.date,
    type: day.type_de_contenu,
    titreCourt: firstSentence(slot.idee || slot.titre),
    formats: formatsOf(slot),
    legende: slot.legende && slot.legende.trim() !== "" ? slot.legende : null,
  };
}

/** Toutes les semaines prêtes pour la présentation, dans l'ordre du calendrier. */
export function buildPresentation(weeks: WeekInfo[]): PresentationWeek[] {
  return weeks.map((w) => ({
    semaine: w.semaine,
    theme: w.theme,
    objectif: WEEK_OBJECTIVES[w.semaine] ?? null,
    posts: w.days.flatMap((day) => day.slots.map((slot) => toPresentationPost(day, slot))),
  }));
}
