import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./server/jwt";

/** Pages accessibles sans code : la présentation et l'écran du code d'accès. Tout le reste est privé. */
const PUBLIC_PATHS = ["/acces", "/bienvenue"];

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

  // Le lien de base du site (« / ») montre toujours la présentation, que la personne soit connectée ou non :
  // l'intérieur du site a ses propres adresses (/accueil, /calendrier…). L'adresse reste « / ».
  if (pathname === "/") {
    const to = request.nextUrl.clone();
    to.pathname = "/bienvenue";
    return NextResponse.rewrite(to);
  }

  if (!claims && !isPublic) {
    const to = request.nextUrl.clone();
    to.pathname = "/acces";
    to.search = `?suite=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(to);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|brand/|.*\\.(?:svg|png|jpg|jpeg|webp|ico|txt|webmanifest)$).*)",
  ],
};
