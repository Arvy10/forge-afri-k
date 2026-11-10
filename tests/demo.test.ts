import { afterEach, describe, expect, it, vi } from "vitest";
import { createDemoClient } from "@/lib/demo/client";
import { DEMO_MESSAGE, isDemoMode } from "@/lib/demo/mode";

afterEach(() => vi.unstubAllEnvs());

describe("mode aperçu visuel", () => {
  it("actif sans clés Supabase", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    expect(isDemoMode()).toBe(true);
  });
  it("actif s'il manque l'une des deux clés", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    expect(isDemoMode()).toBe(true);
  });
  it("éteint dès que Supabase est configuré", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "cle-publique-de-test-0000000000");
    expect(isDemoMode()).toBe(false);
  });
});

describe("faux client de l'aperçu", () => {
  it("la variante « vide » ne contient aucun post ni tâche, comme le vrai départ", async () => {
    const c = createDemoClient("vide");
    expect(((await c.from("posts").select("*")).data ?? []).length).toBe(0);
    expect(((await c.from("tasks").select("*")).data ?? []).length).toBe(0);
    expect(((await c.from("roles").select("*")).data ?? []).length).toBe(6);
    expect(((await c.from("profiles").select("*")).data ?? []).length).toBe(1);
  });
  it("la variante « exemples » remplit la semaine, dans l'ordre", async () => {
    const c = createDemoClient("exemples");
    const { data } = await c.from("posts").select("*").order("date").order("heure");
    const dates = (data ?? []).map((p) => p.date);
    expect(dates.length).toBeGreaterThanOrEqual(5);
    expect([...dates].sort()).toEqual(dates);
  });
  it("filtre par canal (principal ou autre)", async () => {
    const c = createDemoClient("exemples");
    const { data } = await c
      .from("posts")
      .select("*")
      .or("canal_principal.eq.facebook,autres_canaux.cs.{facebook}");
    expect(
      (data ?? []).every(
        (p) => p.canal_principal === "facebook" || p.autres_canaux.includes("facebook"),
      ),
    ).toBe(true);
    expect((data ?? []).length).toBeGreaterThan(0);
  });
  it("tâches sans échéance en dernier", async () => {
    const c = createDemoClient("exemples");
    const { data } = await c.from("tasks").select("*").order("echeance", { nullsFirst: false });
    const last = (data ?? []).at(-1);
    expect(last?.echeance).toBeNull();
  });
  it("maybeSingle et projection de colonnes", async () => {
    const c = createDemoClient("exemples");
    const { data } = await c
      .from("profiles")
      .select("id, full_name")
      .eq("access_role", "admin")
      .maybeSingle();
    expect(Object.keys(data ?? {})).toEqual(["id", "full_name"]);
  });
  it("refuse toute écriture avec un message clair", async () => {
    const c = createDemoClient("exemples");
    const res = await c
      .from("posts")
      .insert({ date: "2026-01-01", type: "fun", canal_principal: "tiktok" });
    expect(res.error?.message).toBe(DEMO_MESSAGE);
    const del = await c.from("posts").delete().eq("id", "x");
    expect(del.error?.message).toBe(DEMO_MESSAGE);
  });
});
