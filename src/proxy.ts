import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Pages accessibles sans être connecté. Tout le reste est privé. */
const PUBLIC_PATHS = ["/connexion", "/mot-de-passe-oublie", "/auth/confirm"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return new NextResponse("Configuration Supabase manquante (voir .env.example).", {
      status: 500,
    });
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  // getUser() vérifie le jeton auprès de Supabase : ne pas le remplacer par une lecture de cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!user && !isPublic) {
    const to = request.nextUrl.clone();
    to.pathname = "/connexion";
    to.search =
      pathname === "/" ? "" : `?suite=${encodeURIComponent(pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(to);
  }
  if (user && (pathname === "/connexion" || pathname === "/mot-de-passe-oublie")) {
    const to = request.nextUrl.clone();
    to.pathname = "/";
    to.search = "";
    return NextResponse.redirect(to);
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|logo.svg|.*\\.(?:svg|png|jpg|jpeg|webp|ico|txt)$).*)",
  ],
};
