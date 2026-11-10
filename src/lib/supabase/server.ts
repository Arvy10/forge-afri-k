import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "../database.types";
import { createDemoClient } from "../demo/client";
import { DEMO_COOKIE, isDemoMode, type DemoVariant } from "../demo/mode";
import { publicEnv } from "../env";

/** Client Supabase côté serveur, avec la session de la personne connectée (la RLS s'applique). */
export async function createClient() {
  const cookieStore = await cookies();
  // Aperçu visuel tant que Supabase n'est pas configuré (voir src/lib/demo/mode.ts).
  if (isDemoMode()) {
    const variant: DemoVariant =
      cookieStore.get(DEMO_COOKIE)?.value === "vide" ? "vide" : "exemples";
    return createDemoClient(variant);
  }
  const env = publicEnv();
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(list) {
          try {
            for (const { name, value, options } of list) cookieStore.set(name, value, options);
          } catch {
            // Appelé depuis un Server Component : le proxy rafraîchit déjà la session.
          }
        },
      },
    },
  );
}
