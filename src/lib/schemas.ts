import { z } from "zod";
import {
  ACCESS_ROLES,
  CHANNELS,
  CONTENT_TYPES,
  POST_FORMATS,
  POST_STATUSES,
  PROJECT_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "./constants";
import { isISODate } from "./dates";

/* Schémas partagés : mêmes règles dans les formulaires (navigateur) et dans les actions (serveur). */

const blankToNull = (v: string | null | undefined) =>
  v == null || v.trim() === "" ? null : v.trim();

export const emailSchema = z
  .string({ error: "Entre une adresse e-mail." })
  .trim()
  .toLowerCase()
  .pipe(z.email("Cette adresse e-mail n'a pas la bonne forme."));

export const passwordSchema = z
  .string({ error: "Choisis un mot de passe." })
  .min(10, "Le mot de passe doit faire au moins 10 caractères.")
  .max(72, "Le mot de passe est trop long (72 caractères maximum).");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Entre ton mot de passe."),
});

export const resetRequestSchema = z.object({ email: emailSchema });

export const setPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string().min(1, "Confirme ton mot de passe.") })
  .refine((v) => v.password === v.confirm, {
    message: "Les deux mots de passe ne sont pas identiques.",
    path: ["confirm"],
  });

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

/* ------------------------------ Membres ------------------------------ */

export const inviteSchema = z.object({
  email: emailSchema,
  full_name: z.string().trim().max(120, "Nom trop long.").default(""),
  access_role: z.enum(ACCESS_ROLES).default("member"),
  role_ids: z.array(z.uuid()).default([]),
});

export const profileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Entre ton nom (2 lettres minimum).")
    .max(120, "Nom trop long."),
  bio: z.string().trim().max(500, "500 caractères maximum.").default(""),
  mission: z.string().trim().max(1000, "1000 caractères maximum.").default(""),
  does: z.string().trim().max(1000, "1000 caractères maximum.").default(""),
  does_not: z.string().trim().max(1000, "1000 caractères maximum.").default(""),
  whatsapp: z
    .string()
    .trim()
    .max(30, "Numéro trop long.")
    .regex(/^[+\d\s().-]*$/, "Utilise seulement des chiffres, +, espaces et tirets.")
    .default(""),
  role_ids: z.array(z.uuid()).default([]),
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

export const commentSchema = z.object({
  post_id: z.uuid(),
  body: z.string().trim().min(1, "Écris un message.").max(4000, "4000 caractères maximum."),
});

/* ------------------------------ Tâches ------------------------------ */

export const taskSchema = z.object({
  titre: z.string().trim().min(1, "Donne un titre à la tâche.").max(200, "200 caractères maximum."),
  description: z.string().trim().max(3000, "3000 caractères maximum.").default(""),
  responsable_id: optionalUuid,
  echeance: optionalDate,
  priorite: z.enum(TASK_PRIORITIES).default("normale"),
  post_id: optionalUuid,
  statut: z.enum(TASK_STATUSES).default("a_faire"),
});
export type TaskInput = z.input<typeof taskSchema>;
export type TaskValues = z.output<typeof taskSchema>;

export const taskStatusSchema = z.object({ id: z.uuid(), statut: z.enum(TASK_STATUSES) });

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
