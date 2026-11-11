import { readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Teste le schéma pc_* et la sécurité sur un vrai Postgres (jamais sur ta base Supabase).
 * Lancer : RLS_TEST_DATABASE_URL=postgres://postgres@localhost:5432/pc_test npm test
 * (sans cette variable, ces tests sont ignorés).
 */
const url = process.env.RLS_TEST_DATABASE_URL;
const root = path.resolve(__dirname, "../..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");

const TABLES = [
  "pc_members",
  "pc_roles",
  "pc_member_roles",
  "pc_posts",
  "pc_tasks",
  "pc_task_deliverables",
  "pc_nudges",
  "pc_activity",
  "pc_guide_sections",
  "pc_projects",
  "pc_milestones",
  "pc_settings",
  "pc_login_attempts",
  "pc_feature_interests",
];

describe.skipIf(!url)("schéma pc_* et sécurité", () => {
  let db: Client;
  const A = "11111111-1111-4111-8111-111111111111";
  const B = "22222222-2222-4222-8222-222222222222";

  beforeAll(async () => {
    db = new Client({ connectionString: url });
    await db.connect();
    await db.query(read("tests/rls/supabase_stub.sql"));
    await db.query(read("supabase/migrations/20261111000001_pc_schema.sql"));
    await db.query(read("supabase/migrations/20261111000002_pc_seed.sql"));
  });
  afterAll(async () => {
    await db?.end();
  });

  const asRole = async (role: string, sql: string) => {
    await db.query(`set role ${role}`);
    try {
      return await db.query(sql);
    } finally {
      await db.query("reset role");
    }
  };

  it("la RLS est active sur les 14 tables pc_*", async () => {
    const r = await db.query(
      "select count(*)::int as n from pg_tables where schemaname='public' and tablename like 'pc\\_%' and rowsecurity",
    );
    expect(r.rows[0].n).toBe(TABLES.length);
  });

  it("aucune politique : rien n'est ouvert au navigateur", async () => {
    expect(
      (await db.query("select count(*)::int as n from pg_policies where schemaname='public'"))
        .rows[0].n,
    ).toBe(0);
  });

  it.each(["anon", "authenticated"])("%s ne peut lire AUCUNE table pc_*", async (role) => {
    for (const t of TABLES)
      await expect(
        asRole(role, `select count(*) from public.${t}`),
        `${role} → ${t}`,
      ).rejects.toThrow(/permission denied/);
  });

  it.each(["anon", "authenticated"])("%s ne peut rien écrire", async (role) => {
    await expect(
      asRole(role, "insert into public.pc_members (prenom) values ('intrus')"),
    ).rejects.toThrow(/permission denied/);
    await expect(asRole(role, "update public.pc_settings set code_version = 99")).rejects.toThrow(
      /permission denied/,
    );
    await expect(asRole(role, "delete from public.pc_tasks")).rejects.toThrow(/permission denied/);
  });

  it("le départ est vide : 0 membre, 0 tâche, 0 post, mais les textes réels sont là", async () => {
    const n = async (t: string) =>
      (await db.query(`select count(*)::int as n from public.${t}`)).rows[0].n;
    expect([await n("pc_members"), await n("pc_tasks"), await n("pc_posts")]).toEqual([0, 0, 0]);
    expect([
      await n("pc_roles"),
      await n("pc_guide_sections"),
      await n("pc_projects"),
      await n("pc_milestones"),
    ]).toEqual([6, 8, 6, 5]);
  });

  it("le bucket des livrables est privé", async () => {
    const r = await db.query("select public from storage.buckets where id='pc-livrables'");
    expect(r.rows[0].public).toBe(false);
  });

  it("fait_le suit le statut d'une tâche", async () => {
    await db.query("insert into pc_members (id, prenom) values ($1,'Aa'), ($2,'Bb')", [A, B]);
    const t = (
      await db.query(
        "insert into pc_tasks (titre, member_id, cree_par) values ('T',$1,$2) returning id",
        [A, B],
      )
    ).rows[0].id;
    await db.query("update pc_tasks set statut='fait', maj_par=$2 where id=$1", [t, A]);
    expect(
      (await db.query("select fait_le is not null as ok from pc_tasks where id=$1", [t])).rows[0]
        .ok,
    ).toBe(true);
    await db.query("update pc_tasks set statut='en_cours' where id=$1", [t]);
    expect(
      (await db.query("select fait_le is null as ok from pc_tasks where id=$1", [t])).rows[0].ok,
    ).toBe(true);
  });

  it("le journal d'activité se remplit tout seul (tâche, livrable, relance, post)", async () => {
    const t = (await db.query("select id from pc_tasks limit 1")).rows[0].id;
    await db.query(
      "insert into pc_task_deliverables (task_id,type,nom,url,depose_par) values ($1,'lien','L','https://x.org',$2)",
      [t, A],
    );
    await db.query("insert into pc_nudges (task_id, par_member_id) values ($1,$2)", [t, B]);
    await db.query(
      "insert into pc_posts (date,type,canal_principal,idee,cree_par) values ('2026-11-16','impact','instagram','Mon post',$1)",
      [A],
    );
    await db.query("update pc_posts set statut='publie', maj_par=$1", [A]);
    const kinds = (await db.query("select kind from pc_activity order by id")).rows.map(
      (r) => r.kind,
    );
    expect(kinds).toEqual(
      expect.arrayContaining([
        "task_created",
        "task_done",
        "task_reopened",
        "deliverable_added",
        "nudge",
        "post_created",
        "post_published",
      ]),
    );
  });

  it("un livrable est soit un lien http(s), soit un fichier", async () => {
    const t = (await db.query("select id from pc_tasks limit 1")).rows[0].id;
    await expect(
      db.query(
        "insert into pc_task_deliverables (task_id,type,nom,url) values ($1,'lien','x','ftp://non')",
        [t],
      ),
    ).rejects.toThrow();
    await expect(
      db.query("insert into pc_task_deliverables (task_id,type,nom) values ($1,'fichier','x')", [
        t,
      ]),
    ).rejects.toThrow();
    await expect(
      db.query(
        "insert into pc_task_deliverables (task_id,type,nom,url,storage_path) values ($1,'lien','x','https://a.org','p')",
        [t],
      ),
    ).rejects.toThrow();
  });

  it("deux membres actifs ne peuvent pas avoir le même nom", async () => {
    await expect(db.query("insert into pc_members (prenom) values ('aa')")).rejects.toThrow(
      /duplicate|unique/i,
    );
    await db.query("insert into pc_members (prenom, nom) values ('Aa', 'Autre')"); // distingué par le nom de famille
  });

  it("le numéro de post est automatique et croissant", async () => {
    await db.query(
      "insert into pc_posts (date,type,canal_principal) values ('2026-11-17','fun','tiktok'), ('2026-11-18','fun','tiktok')",
    );
    const nums = (await db.query("select numero from pc_posts order by numero")).rows.map(
      (r) => r.numero as number,
    );
    expect(new Set(nums).size).toBe(nums.length);
    expect(nums).toEqual([...nums].sort((a, b) => a - b));
  });
});
