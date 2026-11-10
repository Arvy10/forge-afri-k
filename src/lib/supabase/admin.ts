import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import { publicEnv, serviceRoleKey } from "../env";

/**
 * Client « service_role » : contourne la RLS. À n'utiliser que dans des Server Actions
 * déjà protégées par `requireAdmin()`, et uniquement pour inviter / gérer des comptes.
 */
export function createAdminClient() {
  return createClient<Database>(publicEnv().NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
