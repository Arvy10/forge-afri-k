import { NextResponse } from "next/server";
import { toCsv } from "@/lib/csv";
import { todayISO } from "@/lib/dates";
import type { MemberRow, TaskRow } from "@/lib/database.types";
import { TASK_PRIORITY_LABEL, TASK_STATUS_LABEL } from "@/lib/constants";
import { fullName } from "@/lib/members";
import { db } from "@/server/db";
import { getAuth } from "@/server/session";

/** Export des tâches en CSV — réservé au mode administrateur. */
export async function GET() {
  const auth = await getAuth();
  if (!auth.valid) return new NextResponse("Non connecté.", { status: 401 });
  if (!auth.isAdmin) return new NextResponse("Réservé au mode administrateur.", { status: 403 });

  const [{ data: tasks, error }, { data: members }] = await Promise.all([
    db().from("pc_tasks").select("*").order("echeance", { nullsFirst: false }).limit(5000),
    db().from("pc_members").select("*"),
  ]);
  if (error) return new NextResponse("Export impossible.", { status: 500 });

  const names = new Map(((members ?? []) as MemberRow[]).map((m) => [m.id, fullName(m)]));
  const rows = [
    ["Tâche", "Pour", "Échéance", "Priorité", "Statut", "Fait le", "Détails"],
    ...((tasks ?? []) as TaskRow[]).map((t) => [
      t.titre,
      t.member_id ? (names.get(t.member_id) ?? "") : "",
      t.echeance ?? "",
      TASK_PRIORITY_LABEL[t.priorite],
      TASK_STATUS_LABEL[t.statut],
      t.fait_le ? t.fait_le.slice(0, 10) : "",
      t.description,
    ]),
  ];
  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="taches-forge-afrik-${todayISO()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
