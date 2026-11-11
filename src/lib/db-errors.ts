import { ActionError } from "./action";

type PgError = { code?: string; message?: string } | null;

/** Traduit une erreur de la base en message lisible. */
export function failWith(error: PgError, fallback: string): never {
  if (error?.code === "23505")
    throw new ActionError("Cette valeur existe déjà (un membre avec le même prénom, par exemple).");
  if (error?.code === "23503")
    throw new ActionError("Cet élément n'existe plus. Recharge la page.");
  if (error?.code === "23514")
    throw new ActionError("Une des valeurs saisies n'est pas acceptée. Vérifie les champs.");
  throw new ActionError(fallback);
}
