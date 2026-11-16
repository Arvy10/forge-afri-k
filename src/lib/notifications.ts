import type { NotificationRow } from "./database.types";

/** « 1 message non lu » / « 2 messages non lus ». */
export function unreadLabel(n: number): string {
  return n === 1 ? "1 message non lu" : `${n} messages non lus`;
}

/** Texte du badge rouge de la cloche : 1 … 9, puis « 9+ ». */
export function badgeText(n: number): string {
  return n > 9 ? "9+" : String(n);
}

/** Phrase affichée dans la cloche après un rappel sur une tâche. */
export function relanceText(input: { titre: string; late: boolean; note?: string | null }): string {
  const base = input.late
    ? `Petit rappel : « ${input.titre} » est en retard.`
    : `Petit rappel pour « ${input.titre} ».`;
  const note = (input.note ?? "").trim();
  return note ? `${base} ${note}` : base;
}

/** Ce que voit la personne dans sa cloche (le nom de l'expéditeur est déjà résolu). */
export type NotificationView = {
  id: string;
  kind: NotificationRow["kind"];
  texte: string;
  /** Prénom de la personne qui a écrit ; null = l'administrateur sans fiche. */
  de: string | null;
  taskId: string | null;
  createdAt: string;
  lu: boolean;
};

export function toView(row: NotificationRow, names: Map<string, string>): NotificationView {
  return {
    id: row.id,
    kind: row.kind,
    texte: row.texte,
    de: row.de_member_id ? (names.get(row.de_member_id) ?? "Un ancien membre") : null,
    taskId: row.task_id,
    createdAt: row.created_at,
    lu: row.lu_le !== null,
  };
}
