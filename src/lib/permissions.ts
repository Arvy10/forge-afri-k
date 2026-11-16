/**
 * Qui peut faire quoi (règles uniques, utilisées par le serveur ET par les écrans).
 *
 * - Tout le monde VOIT tout : calendrier, tâches et avancement de chacun.
 * - Un membre n'agit que sur SA propre activité : ses tâches, ses livrables, ses créneaux.
 * - L'administrateur (l'Ambassadeur) est le seul à donner des tâches aux autres, ajouter ou retirer des membres.
 * - Un observateur consulte tout, sans travailler dans l'équipe : aucune modification.
 *   Il peut néanmoins laisser un rappel ou un message.
 */
export type Actor = {
  /** La personne choisie dans « Qui es-tu ? » (null : administrateur sans fiche). */
  id: string | null;
  isAdmin: boolean;
  isObserver: boolean;
};

export type Verdict = { ok: true } | { ok: false; reason: string };

export const OBSERVER_REASON =
  "Tu es en mode observation : tu peux tout consulter et laisser un rappel ou un message, mais pas modifier.";

const OK: Verdict = { ok: true };
const no = (reason: string): Verdict => ({ ok: false, reason });

/** Peut modifier des choses (tâches, livrables, créneaux…). L'administrateur le peut toujours. */
export function canWork(a: Actor): boolean {
  return a.isAdmin || !a.isObserver;
}

/** Ajouter une tâche : pour soi-même ; pour quelqu'un d'autre, seulement l'administrateur. */
export function canAddTaskFor(a: Actor, targetMemberId: string | null): Verdict {
  if (a.isAdmin) return OK;
  if (a.isObserver) return no(OBSERVER_REASON);
  if (!a.id) return no("Choisis d'abord qui tu es.");
  if (targetMemberId !== null && targetMemberId !== a.id)
    return no(
      "Tu ne peux ajouter des tâches que pour toi. Seul l'administrateur en ajoute pour les autres.",
    );
  return OK;
}

/** Modifier ou cocher une tâche : la sienne uniquement (l'administrateur : toutes). */
export function canActOnTask(a: Actor, task: { member_id: string | null }): Verdict {
  if (a.isAdmin) return OK;
  if (a.isObserver) return no(OBSERVER_REASON);
  if (!a.id || task.member_id !== a.id) return no("Tu ne peux agir que sur tes propres tâches.");
  return OK;
}

/** Réassigner une tâche à quelqu'un d'autre : l'administrateur seulement. */
export function canReassignTask(a: Actor): boolean {
  return a.isAdmin;
}
