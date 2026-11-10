import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import type { PostRow } from "@/lib/database.types";
import { exportPostsCsv } from "@/lib/post-csv";

/** Export complet du calendrier en CSV — réservé à l'administrateur. */
export async function GET() {
  const { supabase, user, profile } = await getAuth();
  if (!user || !profile?.active) return new NextResponse("Non connecté.", { status: 401 });
  if (profile.access_role !== "admin")
    return new NextResponse("Réservé à l'administrateur.", { status: 403 });

  const [{ data: posts, error }, { data: people }] = await Promise.all([
    supabase.from("posts").select("*").order("date").order("heure").order("numero").limit(5000),
    supabase.from("profiles").select("id, full_name, email"),
  ]);
  if (error) return new NextResponse("Export impossible.", { status: 500 });

  const csv = exportPostsCsv((posts ?? []) as PostRow[], people ?? []);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="calendrier-forge-afrik-${todayISO()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
