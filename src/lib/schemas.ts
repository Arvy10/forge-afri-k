import { z } from "zod";
import {
  MEMBER_COLORS,
  POST_STATUSES,
  PROJECT_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "./constants";
import { isISODate } from "./dates";

/* Schémas partagés : mêmes règles dans les formulaires (navigateur) et dans les actions (serveur). */

const blankToNull = (v: string | null | undefined) =>
  v == null || v.trim() === "" ? null : v.trim();

const optionalDate = z
  .string()
  .nullish()
  .transform(blankToNull)
  .refine((v) => v === null || isISODate(v), "Date invalide.");

const optionalUuid = z
  .string()
  .nullish()
  .transform(blankToNull)
  .refine((v) => v === null || z.uuid().safeParse(v).success, "Choix invalide.");

/* ------------------------------ Accès ------------------------------ */

export const accessCodeSchema = z.object({
  code: z
    .string({ error: "Entre le code d'accès." })
    .trim()
    .min(1, "Entre le code d'accès.")
    .max(100, "Code trop long."),
  suite: z.string().max(300).optional(),
});

export const adminCodeSchema = z.object({
  code: z
    .string({ error: "Entre le code administrateur." })
    .trim()
    .min(1, "Entre le code administrateur.")
    .max(100),
  /** Rester administrateur 30 jours sur cet appareil (sinon 12 heures). */
  remember: z.boolean().default(false),
});

export const newCodeSchema = z
  .object({
    code: z
      .string()
      .min(6, "Le code doit faire au moins 6 caractères.")
      .max(100, "Code trop long."),
    confirm: z.string(),
  })
  .refine((v) => v.code === v.confirm, {
    message: "Les deux codes ne sont pas identiques.",
    path: ["confirm"],
  });

/* ------------------------------ Membres ------------------------------ */

export const memberSchema = z.object({
  prenom: z.string().trim().min(1, "Entre un prénom.").max(60, "Prénom trop long."),
  nom: z.string().trim().max(80, "Nom trop long.").default(""),
  couleur: z.enum(MEMBER_COLORS).default("vert"),
  role_ids: z.array(z.uuid()).default([]),
  /** Observateur : consulte tout, sans travailler dans l'équipe. */
  observateur: z.boolean().default(false),
});
export type MemberInput = z.input<typeof memberSchema>;

export const roleSchema = z.object({
  id: z.uuid(),
  nom: z.string().trim().min(1, "Donne un nom au rôle.").max(80, "80 caractères maximum."),
  /** Rôle principal dont celui-ci est un sous-rôle (facultatif). */
  parent_id: optionalUuid,
  mission: z.string().trim().max(1000, "1000 caractères maximum.").default(""),
  ne_fait_pas: z.string().trim().max(1000, "1000 caractères maximum.").default(""),
});
export const roleCreateSchema = roleSchema.omit({ id: true });
export type RoleInput = z.input<typeof roleCreateSchema>;

/* ------------------------------ Infos ------------------------------ */

export const infoSchema = z.object({
  titre: z.string().trim().min(1, "Donne un titre à l'info.").max(160, "160 caractères maximum."),
  contenu: z.string().max(10000, "10 000 caractères maximum.").default(""),
  epingle: z.boolean().default(false),
});
export type InfoInput = z.input<typeof infoSchema>;
export const infoUpdateSchema = infoSchema.extend({ id: z.uuid() });

/* ------------------------------ Créneaux du calendrier ------------------------------ */

/** Ce que l'équipe peut remplir sur un créneau : responsable, statut, lien du post, date de préparation. */
export const slotUpdateSchema = z
  .object({
    responsable_id: z.uuid().nullable().optional(),
    statut: z.enum(POST_STATUSES).optional(),
    lien: z
      .string()
      .nullish()
      .transform(blankToNull)
      .refine(
        (v) => v === null || /^https?:\/\/\S+$/i.test(v),
        "Le lien doit commencer par http:// ou https://.",
      )
      .optional(),
    a_preparer_le: optionalDate.optional(),
  })
  .strict();
export type SlotUpdateInput = z.input<typeof slotUpdateSchema>;

/* ------------------------------ Messages ------------------------------ */

export const messageSchema = z.object({
  to: z.uuid({ error: "Choisis la personne." }),
  texte: z
    .string({ error: "Écris ton message." })
    .trim()
    .min(1, "Écris ton message.")
    .max(600, "600 caractères maximum."),
});
export type MessageInput = z.input<typeof messageSchema>;

/* ------------------------------ Tâches ------------------------------ */

export const taskSchema = z.object({
  titre: z.string().trim().min(1, "Donne un titre à la tâche.").max(200, "200 caractères maximum."),
  description: z.string().trim().max(3000, "3000 caractères maximum.").default(""),
  member_id: optionalUuid,
  echeance: optionalDate,
  priorite: z.enum(TASK_PRIORITIES).default("normale"),
  slot_id: optionalUuid,
  statut: z.enum(TASK_STATUSES).default("a_faire"),
});
export type TaskInput = z.input<typeof taskSchema>;
export type TaskValues = z.output<typeof taskSchema>;

export const taskStatusSchema = z.object({ id: z.uuid(), statut: z.enum(TASK_STATUSES) });

export const deliverableLinkSchema = z.object({
  task_id: z.uuid(),
  nom: z.string().trim().max(200, "Nom trop long.").default(""),
  url: z
    .string({ error: "Colle un lien." })
    .trim()
    .min(1, "Colle un lien.")
    .max(2000, "Lien trop long.")
    .refine((v) => /^https?:\/\/\S+$/i.test(v), "Le lien doit commencer par http:// ou https://."),
});

export const deliverableFileSchema = z.object({
  task_id: z.uuid(),
  file_name: z.string().trim().min(1).max(200),
  mime_type: z.string().max(120).default("application/octet-stream"),
  size_bytes: z.number().int().positive(),
});

export const deliverableRegisterSchema = deliverableFileSchema.extend({
  path: z.string().min(1).max(400),
});

export const nudgeSchema = z.object({
  task_id: z.uuid(),
  note: z.string().trim().max(500, "500 caractères maximum.").default(""),
});

/* ------------------------------ Règles et projets ------------------------------ */

export const guideSectionSchema = z.object({
  id: z.uuid(),
  titre: z.string().trim().min(1, "Le titre est obligatoire.").max(120, "120 caractères maximum."),
  contenu: z.string().max(20000, "Le texte est trop long."),
});

export const projectSchema = z.object({
  id: z.uuid(),
  titre: z.string().trim().min(1, "Le titre est obligatoire.").max(160),
  statut: z.enum(PROJECT_STATUSES),
  description: z.string().trim().max(1500).default(""),
  prudence: z.string().trim().max(1000).default(""),
  pole_pilote: z.string().trim().max(120).default(""),
  date_label: z.string().trim().max(80).default(""),
});

export const interestSchema = z.object({
  feature: z.enum(["bibliotheque", "reunions", "resultats"]),
});
