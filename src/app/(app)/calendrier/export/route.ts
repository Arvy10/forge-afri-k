import { NextResponse } from "next/server";
import { todayISO } from "@/lib/dates";
import type { PostRow } from "@/lib/database.types";
import { fullName } from "@/lib/members";
import { exportPostsCsv } from "@/lib/post-csv";
import { db } from "@/server/db";
import { getAuth } from "@/server/session";

/** Export complet du calendrier en CSV — réservé au mode administrateur. */
export async function GET() {
  const auth = await getAuth();
  if (!auth.valid) return new NextResponse("Non connecté.", { status: 401 });
  if (!auth.isAdmin) return new NextResponse("Réservé au mode administrateur.", { status: 403 });

  const [{ data: posts, error }, { data: members }] = await Promise.all([
    db().from("pc_posts").select("*").order("date").order("heure").order("numero").limit(5000),
    db().from("pc_members").select("id, prenom, nom"),
  ]);
  if (error) return new NextResponse("Export impossible.", { status: 500 });

  const csv = exportPostsCsv(
    (posts ?? []) as PostRow[],
    (members ?? []).map((m) => ({ id: m.id, full_name: fullName(m), email: "" })),
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="calendrier-forge-afrik-${todayISO()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
