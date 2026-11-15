import { NextResponse } from "next/server";
import { exportCalendarCsv } from "@/lib/calendar-csv";
import { todayISO } from "@/lib/dates";
import { fullName } from "@/lib/members";
import { getDays } from "@/server/calendar";
import { db } from "@/server/db";
import { getAuth } from "@/server/session";

/** Export du calendrier en CSV (une ligne par créneau) — réservé au mode administrateur. */
export async function GET() {
  const auth = await getAuth();
  if (!auth.valid) return new NextResponse("Non connecté.", { status: 401 });
  if (!auth.isAdmin) return new NextResponse("Réservé au mode administrateur.", { status: 403 });

  const [days, { data: members }] = await Promise.all([
    getDays(),
    db().from("pc_members").select("id, prenom, nom"),
  ]);
  const csv = exportCalendarCsv(days, new Map((members ?? []).map((m) => [m.id, fullName(m)])));
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="calendrier-forge-afrik-${todayISO()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
