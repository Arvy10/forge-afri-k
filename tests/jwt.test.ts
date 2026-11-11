import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import {
  signAdminToken,
  signSessionToken,
  verifyAdminToken,
  verifySessionToken,
} from "@/server/jwt";

const SECRET = "un-secret-de-test-assez-long-0123456789abcdef";
const enc = (s: string) => new TextEncoder().encode(s);

describe("jeton de session", () => {
  it("signe puis relit la version du code et le membre", async () => {
    const t = await signSessionToken({ v: 3, m: "abc" }, SECRET);
    expect(await verifySessionToken(t, SECRET)).toEqual({ v: 3, m: "abc" });
  });
  it("refuse une mauvaise clé de signature", async () => {
    const t = await signSessionToken({ v: 1 }, SECRET);
    expect(await verifySessionToken(t, "un-autre-secret-de-test-0123456789abcdef!!")).toBeNull();
  });
  it("refuse un jeton falsifié (charge modifiée, signature conservée)", async () => {
    const t = await signSessionToken({ v: 1 }, SECRET);
    const [h, , s] = t.split(".");
    const forged = `${h}.${Buffer.from(JSON.stringify({ kind: "session", v: 1, m: "pirate" })).toString("base64url")}.${s}`;
    expect(await verifySessionToken(forged, SECRET)).toBeNull();
  });
  it("refuse un jeton expiré", async () => {
    const expired = await new SignJWT({ kind: "session", v: 1 })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(enc(SECRET));
    expect(await verifySessionToken(expired, SECRET)).toBeNull();
  });
  it("refuse l'algorithme « none » et les jetons vides ou absents", async () => {
    const none = `${Buffer.from('{"alg":"none"}').toString("base64url")}.${Buffer.from('{"kind":"session","v":1}').toString("base64url")}.`;
    expect(await verifySessionToken(none, SECRET)).toBeNull();
    expect(await verifySessionToken("", SECRET)).toBeNull();
    expect(await verifySessionToken(undefined, SECRET)).toBeNull();
    expect(await verifySessionToken("n'importe quoi", SECRET)).toBeNull();
  });
  it("sans secret configuré, rien n'est accepté", async () => {
    const t = await signSessionToken({ v: 1 }, SECRET);
    expect(await verifySessionToken(t, undefined)).toBeNull();
  });
});

describe("jeton administrateur", () => {
  it("n'est pas interchangeable avec un jeton de session", async () => {
    const admin = await signAdminToken({ v: 1 }, SECRET);
    const session = await signSessionToken({ v: 1 }, SECRET);
    expect(await verifyAdminToken(admin, SECRET)).toEqual({ v: 1, m: undefined });
    expect(await verifySessionToken(admin, SECRET)).toBeNull();
    expect(await verifyAdminToken(session, SECRET)).toBeNull();
  });
  it("expire au bout de 12 heures", async () => {
    const t = await signAdminToken({ v: 1 }, SECRET);
    const payload = JSON.parse(Buffer.from(t.split(".")[1]!, "base64url").toString());
    expect(payload.exp - payload.iat).toBe(12 * 60 * 60);
  });
  it("la session dure 30 jours", async () => {
    const t = await signSessionToken({ v: 1 }, SECRET);
    const payload = JSON.parse(Buffer.from(t.split(".")[1]!, "base64url").toString());
    expect(payload.exp - payload.iat).toBe(30 * 24 * 60 * 60);
  });
});
