import { z } from "zod";

/** Variables publiques : lues dans le navigateur ET sur le serveur. */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL doit être une URL."),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20, "NEXT_PUBLIC_SUPABASE_ANON_KEY est manquante."),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
});

export function publicEnv() {
  // Les références statiques sont nécessaires : Next remplace NEXT_PUBLIC_* à la compilation.
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });
  if (!parsed.success) {
    throw new Error(
      "Configuration Supabase incomplète : " +
        parsed.error.issues.map((i) => i.message).join(" ") +
        " Voir .env.example.",
    );
  }
  return parsed.data;
}

/** Clé service_role : serveur uniquement (jamais importée depuis un composant client). */
export function serviceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY est manquante (nécessaire pour inviter).");
  return key;
}
