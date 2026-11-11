import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it } from "vitest";
import { proxy } from "@/proxy";
import { signSessionToken } from "@/server/jwt";

const SECRET = "un-secret-de-test-assez-long-0123456789abcdef";

const req = (path: string, cookie?: string) =>
  new NextRequest(`https://pole.exemple.org${path}`, { headers: cookie ? { cookie } : {} });

beforeAll(() => {
  process.env.SESSION_SECRET = SECRET;
});

describe("accès aux pages et aux données : cookie signé obligatoire", () => {
  const PRIVATE = [
    "/",
    "/calendrier",
    "/equipe",
    "/mon-espace",
    "/taches",
    "/reglages",
    "/calendrier/export",
    "/calendrier/modele",
    "/qui-es-tu",
  ];

  it.each(PRIVATE)("sans cookie : %s renvoie vers l'écran du code", async (path) => {
    const res = await proxy(req(path));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/acces");
  });

  it("garde la page demandée pour y revenir après la saisie du code", async () => {
    const res = await proxy(req("/calendrier?vue=mois"));
    expect(
      decodeURIComponent(new URL(res.headers.get("location")!).searchParams.get("suite")!),
    ).toBe("/calendrier?vue=mois");
  });

  it("l'écran du code reste accessible sans cookie", async () => {
    const res = await proxy(req("/acces"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("avec un cookie valide, la page passe", async () => {
    const token = await signSessionToken({ v: 1 }, SECRET);
    for (const path of PRIVATE) {
      const res = await proxy(req(path, `pc_session=${token}`));
      expect(res.headers.get("location"), path).toBeNull();
    }
  });

  it("un cookie falsifié, signé avec un autre secret ou expiré est refusé", async () => {
    const wrong = await signSessionToken(
      { v: 1 },
      "autre-secret-de-test-assez-long-0123456789abcdef",
    );
    for (const cookie of [
      `pc_session=${wrong}`,
      "pc_session=n-importe-quoi",
      "pc_session=",
      "pc_admin=abc",
    ]) {
      const res = await proxy(req("/equipe", cookie));
      expect(res.status, cookie).toBe(307);
    }
  });

  it("le cookie administrateur seul ne donne aucun accès", async () => {
    const { signAdminToken } = await import("@/server/jwt");
    const admin = await signAdminToken({ v: 1 }, SECRET);
    const res = await proxy(req("/reglages", `pc_admin=${admin}`));
    expect(res.status).toBe(307);
  });

  it("sans SESSION_SECRET configuré, personne n'entre", async () => {
    const token = await signSessionToken({ v: 1 }, SECRET);
    delete process.env.SESSION_SECRET;
    const res = await proxy(req("/", `pc_session=${token}`));
    process.env.SESSION_SECRET = SECRET;
    expect(res.status).toBe(307);
  });
});
