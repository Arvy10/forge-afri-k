import { SignJWT, jwtVerify } from "jose";

/**
 * Jetons de session (jose, HS256). Sans dépendance serveur : utilisable aussi dans proxy.ts.
 * Deux jetons distincts : « session » (code d'accès, 30 jours) et « admin » (12 heures).
 */
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
export const ADMIN_TTL_SECONDS = 12 * 60 * 60;

export type Claims = {
  /** Version du code d'accès : si l'admin change le code, tous les jetons tombent. */
  v: number;
  /** Membre choisi (facultatif). */
  m?: string;
};

type Kind = "session" | "admin";

const key = (secret: string) => new TextEncoder().encode(secret);

async function sign(kind: Kind, claims: Claims, secret: string, ttl: number): Promise<string> {
  return new SignJWT({ kind, v: claims.v, ...(claims.m ? { m: claims.m } : {}) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(key(secret));
}

async function verify(
  kind: Kind,
  token: string | undefined,
  secret: string | undefined,
): Promise<Claims | null> {
  if (!token || !secret) return null;
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ["HS256"] });
    if (payload.kind !== kind || typeof payload.v !== "number") return null;
    return { v: payload.v, m: typeof payload.m === "string" ? payload.m : undefined };
  } catch {
    return null; // signature fausse, jeton expiré ou illisible
  }
}

export const signSessionToken = (c: Claims, secret: string) =>
  sign("session", c, secret, SESSION_TTL_SECONDS);
export const signAdminToken = (c: Claims, secret: string) =>
  sign("admin", c, secret, ADMIN_TTL_SECONDS);
export const verifySessionToken = (t: string | undefined, secret: string | undefined) =>
  verify("session", t, secret);
export const verifyAdminToken = (t: string | undefined, secret: string | undefined) =>
  verify("admin", t, secret);

export const SESSION_COOKIE = "pc_session";
export const ADMIN_COOKIE = "pc_admin";
/** Mémorise « qui je suis » pour ne pas redemander après une nouvelle saisie du code (non secret). */
export const ME_COOKIE = "pc_me";
