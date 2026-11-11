import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { serverEnv } from "@/lib/env";

let client: SupabaseClient<Database> | undefined;

/**
 * Accès aux données : UNIQUEMENT depuis le serveur, avec la clé service_role.
 * Les tables pc_* n'ont aucune politique publique : le navigateur ne peut rien lire.
 */
export function db(): SupabaseClient<Database> {
  if (!client) {
    const env = serverEnv();
    client = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
