import { z } from "zod";

/**
 * Variables d'environnement du site (voir .env.example).
 * Les secrets ne sont lus que côté serveur ; seules NEXT_PUBLIC_* peuvent atteindre le navigateur.
 */
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("doit être une adresse https://…"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10, "est manquante"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10, "est manquante"),
  ACCESS_CODE: z.string().min(4, "doit faire au moins 4 caractères"),
  ADMIN_CODE: z.string().min(4, "doit faire au moins 4 caractères"),
  SESSION_SECRET: z.string().min(32, "doit faire au moins 32 caractères"),
});

export type ServerEnv = z.infer<typeof schema>;

function raw() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ACCESS_CODE: process.env.ACCESS_CODE,
    ADMIN_CODE: process.env.ADMIN_CODE,
    SESSION_SECRET: process.env.SESSION_SECRET,
  };
}

/** Variables absentes ou invalides (noms seulement, jamais les valeurs). */
export function envProblems(): { name: string; problem: string }[] {
  const parsed = schema.safeParse(raw());
  if (parsed.success) return [];
  return parsed.error.issues.map((i) => ({ name: String(i.path[0]), problem: i.message }));
}

export function serverEnv(): ServerEnv {
  const parsed = schema.safeParse(raw());
  if (!parsed.success) {
    const names = parsed.error.issues.map((i) => String(i.path[0])).join(", ");
    throw new Error(`Configuration incomplète : ${names}. Voir .env.example.`);
  }
  return parsed.data;
}
