import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./server/jwt";

/** Seule page accessible sans code : l'écran du code d'accès. Tout le reste est privé. */
const PUBLIC_PATHS = ["/acces"];

/**
 * Premier filtre : un jeton signé valide est exigé. (La version du code d'accès, stockée en base,
 * est vérifiée ensuite côté serveur par `getAuth()`.)
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const claims = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
    process.env.SESSION_SECRET,
  );

  if (!claims && !isPublic) {
    const to = request.nextUrl.clone();
    to.pathname = "/acces";
    to.search = pathname === "/" ? "" : `?suite=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(to);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|brand/|.*\\.(?:svg|png|jpg|jpeg|webp|ico|txt|webmanifest)$).*)",
  ],
};
