import { z } from "zod";
import {
  CHANNELS,
  CONTENT_TYPES,
  MEMBER_COLORS,
  POST_FORMATS,
  POST_STATUSES,
  PROJECT_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASKS_POLICIES,
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

const requiredDate = z
  .string({ error: "Choisis une date." })
  .min(1, "Choisis une date.")
  .refine(isISODate, "Date invalide.");

const optionalUuid = z
  .string()
  .nullish()
  .transform(blankToNull)
  .refine((v) => v === null || z.uuid().safeParse(v).success, "Choix invalide.");

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide (format 08:00).");

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

export const settingsSchema = z.object({ tasks_add_policy: z.enum(TASKS_POLICIES) });

/* ------------------------------ Membres ------------------------------ */

export const memberSchema = z.object({
  prenom: z.string().trim().min(1, "Entre un prénom.").max(60, "Prénom trop long."),
  nom: z.string().trim().max(80, "Nom trop long.").default(""),
  couleur: z.enum(MEMBER_COLORS).default("vert"),
  role_ids: z.array(z.uuid()).default([]),
});
export type MemberInput = z.input<typeof memberSchema>;

export const roleSchema = z.object({
  id: z.uuid(),
  mission: z.string().trim().max(1000, "1000 caractères maximum.").default(""),
  ne_fait_pas: z.string().trim().max(1000, "1000 caractères maximum.").default(""),
});

/* ------------------------------ Posts ------------------------------ */

export const postSchema = z.object({
  date: requiredDate,
  type: z.enum(CONTENT_TYPES, { error: "Choisis un type de contenu." }),
  canal_principal: z.enum(CHANNELS, { error: "Choisis un canal." }),
  autres_canaux: z.array(z.enum(CHANNELS)).default([]),
  format: z.enum(POST_FORMATS, { error: "Choisis un format." }),
  idee: z.string().trim().max(600, "600 caractères maximum.").default(""),
  prep_date: optionalDate,
  heure: time.default("08:00"),
  legende: z.string().max(5000, "5000 caractères maximum.").default(""),
  responsable_id: optionalUuid,
  statut: z.enum(POST_STATUSES).default("a_faire"),
  lien: z
    .string()
    .nullish()
    .transform(blankToNull)
    .refine(
      (v) => v === null || /^https?:\/\/\S+$/i.test(v),
      "Le lien doit commencer par http:// ou https://.",
    ),
  notes: z.string().max(5000, "5000 caractères maximum.").default(""),
});
export type PostInput = z.input<typeof postSchema>;
export type PostValues = z.output<typeof postSchema>;

export const postStatusSchema = z.object({ id: z.uuid(), statut: z.enum(POST_STATUSES) });
export const postMoveSchema = z.object({ id: z.uuid(), date: requiredDate });

/* ------------------------------ Tâches ------------------------------ */

export const taskSchema = z.object({
  titre: z.string().trim().min(1, "Donne un titre à la tâche.").max(200, "200 caractères maximum."),
  description: z.string().trim().max(3000, "3000 caractères maximum.").default(""),
  member_id: optionalUuid,
  echeance: optionalDate,
  priorite: z.enum(TASK_PRIORITIES).default("normale"),
  post_id: optionalUuid,
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
