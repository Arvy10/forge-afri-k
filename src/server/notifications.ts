import "server-only";
import { toView, type NotificationView } from "@/lib/notifications";
import type { NotificationRow } from "@/lib/database.types";
import { db } from "./db";
import { getTeam } from "./team";

export type Inbox = { items: NotificationView[]; unread: number };

const EMPTY: Inbox = { items: [], unread: 0 };

/** La cloche d'une personne : ses 20 derniers messages et le nombre de non lus. */
export async function getInbox(memberId: string | null): Promise<Inbox> {
  if (!memberId) return EMPTY;
  const [list, unread, team] = await Promise.all([
    db()
      .from("pc_notifications")
      .select("*")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false })
      .limit(20),
    // Les non lus (au plus 100) : leur nombre alimente le badge rouge de la cloche.
    db()
      .from("pc_notifications")
      .select("id")
      .eq("member_id", memberId)
      .is("lu_le", null)
      .limit(100),
    getTeam(),
  ]);
  const names = new Map(team.map((m) => [m.id, m.prenom]));
  return {
    items: ((list.data ?? []) as NotificationRow[]).map((r) => toView(r, names)),
    unread: (unread.data ?? []).length,
  };
}
