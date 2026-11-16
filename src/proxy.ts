import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./server/jwt";

/** Pages accessibles sans code : la présentation et l'écran du code d'accès. Tout le reste est privé. */
const PUBLIC_PATHS = ["/acces", "/bienvenue"];

/** En-tête interne : l'adresse demandée (posé ici, jamais fourni par le navigateur). */
const PATH_HEADER = "x-pc-path";

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

  // Un visiteur sans cookie qui ouvre le lien du site voit la présentation (l'adresse reste « / »).
  if (!claims && pathname === "/") {
    const to = request.nextUrl.clone();
    to.pathname = "/bienvenue";
    return NextResponse.rewrite(to);
  }

  if (!claims && !isPublic) {
    const to = request.nextUrl.clone();
    to.pathname = "/acces";
    to.search = pathname === "/" ? "" : `?suite=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(to);
  }
  // Les pages savent ainsi quelle adresse a été demandée (pour renvoyer « / » vers la présentation).
  const headers = new Headers(request.headers);
  headers.set(PATH_HEADER, pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|brand/|.*\\.(?:svg|png|jpg|jpeg|webp|ico|txt|webmanifest)$).*)",
  ],
};
