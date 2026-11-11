import { NextResponse } from "next/server";
import { toCsv } from "@/lib/csv";
import { CSV_HEADERS } from "@/lib/post-csv";
import { getAuth } from "@/server/session";

/** Modèle de fichier pour l'import : uniquement la ligne de titres (aucune donnée d'exemple). */
export async function GET() {
  const auth = await getAuth();
  if (!auth.valid) return new NextResponse("Non connecté.", { status: 401 });
  if (!auth.isAdmin) return new NextResponse("Réservé au mode administrateur.", { status: 403 });
  return new NextResponse(toCsv([[...CSV_HEADERS]]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="modele-calendrier-forge-afrik.csv"',
      "Cache-Control": "no-store",
    },
  });
}
