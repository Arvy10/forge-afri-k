import "server-only";
import type { TaskRow } from "@/lib/database.types";
import { db } from "./db";

export type TaskLite = Pick<TaskRow, "member_id" | "statut" | "echeance" | "fait_le">;

/** Tâches « légères » de toute l'équipe, pour calculer les barres de progression. */
export async function fetchTaskLites(): Promise<TaskLite[]> {
  const { data, error } = await db()
    .from("pc_tasks")
    .select("member_id, statut, echeance, fait_le")
    .limit(5000);
  if (error) throw new Error(`Chargement des tâches impossible : ${error.message}`);
  return (data ?? []) as TaskLite[];
}
