"use client";

import { createClient } from "@supabase/supabase-js";

/**
 * Client « navigateur » : sert UNIQUEMENT à envoyer un fichier vers une URL signée par le serveur.
 * Il ne peut lire ni écrire aucune table (voir RLS), et le bucket n'a aucune politique publique.
 */
export function createUploadClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
