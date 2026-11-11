import "server-only";
import { compare } from "bcryptjs";
import { createHash, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { serverEnv } from "@/lib/env";
import { db } from "./db";
import { afterFailure, lockedMinutes, triesLeft, type AttemptState } from "./attempts";

/** Comparaison en temps constant (on compare des empreintes de même longueur). */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** Code d'accès : haché en base s'il a été changé depuis « Réglages », sinon variable ACCESS_CODE. */
export async function checkAccessCode(input: string): Promise<boolean> {
  const { data } = await db().from("pc_settings").select("code_hash").eq("id", true).maybeSingle();
  const hash = data?.code_hash;
  if (hash) return compare(input, hash);
  return safeEqual(input, serverEnv().ACCESS_CODE);
}

export function checkAdminCode(input: string): boolean {
  return safeEqual(input, serverEnv().ADMIN_CODE);
}

/** Adresse de l'appelant, anonymisée : on ne garde qu'une empreinte salée. */
export async function clientKey(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "inconnue";
  return createHash("sha256").update(`${ip}|${serverEnv().SESSION_SECRET}`).digest("hex");
}

type Kind = "access" | "admin";

async function readState(kind: Kind, ipHash: string): Promise<AttemptState | null> {
  const { data } = await db()
    .from("pc_login_attempts")
    .select("tries, window_start, locked_until")
    .eq("ip_hash", ipHash)
    .eq("kind", kind)
    .maybeSingle();
  return data ?? null;
}

/** Minutes d'attente restantes (0 si l'on peut essayer). */
export async function waitMinutes(kind: Kind, ipHash: string): Promise<number> {
  return lockedMinutes(await readState(kind, ipHash), new Date());
}

/** Enregistre un échec ; renvoie les essais restants, ou le blocage qui vient de commencer. */
export async function registerFailure(
  kind: Kind,
  ipHash: string,
): Promise<{ left: number; lockedFor: number }> {
  const now = new Date();
  const next = afterFailure(await readState(kind, ipHash), now);
  await db()
    .from("pc_login_attempts")
    .upsert({ ip_hash: ipHash, kind, ...next }, { onConflict: "ip_hash,kind" });
  return { left: triesLeft(next), lockedFor: lockedMinutes(next, now) };
}

export async function clearFailures(kind: Kind, ipHash: string): Promise<void> {
  await db().from("pc_login_attempts").delete().eq("ip_hash", ipHash).eq("kind", kind);
}
