/**
 * Mode « aperçu visuel » : actif tant que les clés Supabase ne sont pas renseignées.
 * Il permet de voir le site avant de brancher la base. Aucune donnée réelle, aucune écriture.
 * Dès que NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY existent, il s'éteint tout seul.
 */
export function isDemoMode(): boolean {
  // Références statiques : Next remplace NEXT_PUBLIC_* au build.
  return !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export const DEMO_MESSAGE =
  "Aperçu visuel : les modifications ne sont pas enregistrées. Branche Supabase pour activer le site.";

export type DemoVariant = "exemples" | "vide";
export const DEMO_COOKIE = "demo";
