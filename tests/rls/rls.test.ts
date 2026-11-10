import { readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Teste la migration et les règles RLS sur un vrai Postgres.
 * Lancer : RLS_TEST_DATABASE_URL=postgres://postgres@localhost:5432/rls_test npm test
 * (sans cette variable, ces tests sont ignorés).
 */
const url = process.env.RLS_TEST_DATABASE_URL;
const root = path.resolve(__dirname, "../..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");

const ADMIN = "00000000-0000-0000-0000-0000000000a1";
const ALICE = "00000000-0000-0000-0000-0000000000b1";
const BOB = "00000000-0000-0000-0000-0000000000b2";
const GONE = "00000000-0000-0000-0000-0000000000c1"; // membre désactivé

describe.skipIf(!url)("RLS", () => {
  let db: Client;
  let alicePost: string;
  let bobPost: string;
  let aliceTask: string;

  /** Exécute `fn` en tant que `uid` (ou visiteur si null) puis annule tout. */
  async function as<T>(uid: string | null, fn: (c: Client) => Promise<T>): Promise<T> {
    await db.query("begin");
    try {
      await db.query(`set local role ${uid ? "authenticated" : "anon"}`);
      if (uid) await db.query("select set_config('request.jwt.claim.sub', $1, true)", [uid]);
      return await fn(db);
    } finally {
      await db.query("rollback");
    }
  }

  beforeAll(async () => {
    db = new Client({ connectionString: url });
    await db.connect();
    await db.query(read("tests/rls/supabase_stub.sql"));
    await db.query(read("supabase/migrations/0001_init.sql"));
    await db.query(read("supabase/seed.sql"));
    for (const [id, email] of [
      [ADMIN, "admin@test"],
      [ALICE, "alice@test"],
      [BOB, "bob@test"],
      [GONE, "gone@test"],
    ])
      await db.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
    await db.query("update public.profiles set access_role='admin' where id=$1", [ADMIN]);
    await db.query("update public.profiles set active=false where id=$1", [GONE]);
    const ins = async (resp: string) =>
      (
        await db.query(
          `insert into public.posts (date, type, canal_principal, responsable_id, created_by)
           values ('2026-11-16','impact','instagram',$1,$1) returning id`,
          [resp],
        )
      ).rows[0].id as string;
    alicePost = await ins(ALICE);
    bobPost = await ins(BOB);
    aliceTask = (
      await db.query(
        `insert into public.tasks (titre, responsable_id, created_by) values ('T', $1, $1) returning id`,
        [ALICE],
      )
    ).rows[0].id;
  });
  afterAll(async () => {
    await db?.end();
  });

  it("seed : 6 rôles, 8 sections de guide, 6 projets, 5 jalons, aucun post fourni", async () => {
    const q = async (t: string) =>
      Number((await db.query(`select count(*) from public.${t}`)).rows[0].count);
    expect(await q("roles")).toBe(6);
    expect(await q("guide_sections")).toBe(8);
    expect(await q("projects")).toBe(6);
    expect(await q("milestones")).toBe(5);
    // les 2 posts présents ont été créés par ce test
    expect(await q("posts")).toBe(2);
  });

  it("un visiteur non connecté ne voit rien", async () => {
    for (const t of ["profiles", "posts", "tasks", "roles", "guide_sections", "projects"])
      await expect(as(null, (c) => c.query(`select * from public.${t}`))).rejects.toThrow(
        /permission denied/,
      );
  });

  it("un membre désactivé ne voit plus rien (sauf son propre profil)", async () => {
    await as(GONE, async (c) => {
      expect((await c.query("select * from public.posts")).rowCount).toBe(0);
      expect((await c.query("select * from public.roles")).rowCount).toBe(0);
      expect((await c.query("select * from public.profiles")).rowCount).toBe(1);
    });
  });

  it("un membre actif lit tout", async () => {
    await as(ALICE, async (c) => {
      expect((await c.query("select * from public.posts")).rowCount).toBe(2);
      expect((await c.query("select * from public.profiles")).rowCount).toBe(4);
      expect((await c.query("select * from public.guide_sections")).rowCount).toBe(8);
    });
  });

  it("un membre modifie son post, pas celui d'un autre", async () => {
    await as(ALICE, async (c) => {
      const ok = await c.query("update public.posts set idee='x' where id=$1", [alicePost]);
      expect(ok.rowCount).toBe(1);
      const ko = await c.query("update public.posts set idee='x' where id=$1", [bobPost]);
      expect(ko.rowCount).toBe(0);
    });
  });

  it("un membre ne peut pas passer son post à quelqu'un d'autre", async () => {
    await as(ALICE, (c) =>
      expect(
        c.query("update public.posts set responsable_id=$2 where id=$1", [alicePost, BOB]),
      ).rejects.toThrow(/row-level security/),
    );
  });

  it("un membre crée un post pour lui-même seulement", async () => {
    const insert = (c: Client, resp: string) =>
      c.query(
        `insert into public.posts (date, type, canal_principal, responsable_id) values ('2026-11-17','patrimoine','tiktok',$1)`,
        [resp],
      );
    await as(ALICE, async (c) => expect((await insert(c, ALICE)).rowCount).toBe(1));
    await as(ALICE, (c) => expect(insert(c, BOB)).rejects.toThrow(/row-level security/));
  });

  it("un membre ne supprime aucun post ; l'admin oui", async () => {
    await as(ALICE, async (c) =>
      expect((await c.query("delete from public.posts where id=$1", [alicePost])).rowCount).toBe(0),
    );
    await as(ADMIN, async (c) =>
      expect((await c.query("delete from public.posts where id=$1", [bobPost])).rowCount).toBe(1),
    );
  });

  it("l'admin modifie n'importe quel post", async () => {
    await as(ADMIN, async (c) =>
      expect(
        (await c.query("update public.posts set responsable_id=$2 where id=$1", [alicePost, BOB]))
          .rowCount,
      ).toBe(1),
    );
  });

  it("un membre ne peut pas se promouvoir admin ni changer son e-mail", async () => {
    await as(ALICE, async (c) => {
      await c.query(
        "update public.profiles set access_role='admin', active=true, email='x@x', full_name='Alice' where id=$1",
        [ALICE],
      );
      const r = (
        await c.query("select access_role, email, full_name from public.profiles where id=$1", [
          ALICE,
        ])
      ).rows[0];
      expect(r.access_role).toBe("member");
      expect(r.email).toBe("alice@test");
      expect(r.full_name).toBe("Alice");
    });
  });

  it("un membre ne modifie pas le profil d'un autre ; l'admin oui", async () => {
    await as(ALICE, async (c) =>
      expect(
        (await c.query("update public.profiles set bio='x' where id=$1", [BOB])).rowCount,
      ).toBe(0),
    );
    await as(ADMIN, async (c) =>
      expect(
        (await c.query("update public.profiles set bio='x' where id=$1", [BOB])).rowCount,
      ).toBe(1),
    );
  });

  it("seul l'admin modifie règles, projets et rôles", async () => {
    await as(ALICE, async (c) => {
      expect((await c.query("update public.guide_sections set contenu='x'")).rowCount).toBe(0);
      expect((await c.query("update public.projects set titre='x'")).rowCount).toBe(0);
      await expect(
        c.query("insert into public.roles (slug,name) values ('z','Z')"),
      ).rejects.toThrow(/row-level security/);
    });
    await as(ADMIN, async (c) =>
      expect((await c.query("update public.projects set titre='x'")).rowCount).toBe(6),
    );
  });

  it("tâches : un membre gère les siennes, pas celles des autres", async () => {
    await as(BOB, async (c) =>
      expect(
        (await c.query("update public.tasks set titre='x' where id=$1", [aliceTask])).rowCount,
      ).toBe(0),
    );
    await as(ALICE, async (c) => {
      expect(
        (await c.query("update public.tasks set statut='valide' where id=$1", [aliceTask]))
          .rowCount,
      ).toBe(1);
      await expect(
        c.query("insert into public.tasks (titre, responsable_id) values ('Pour Bob', $1)", [BOB]),
      ).rejects.toThrow(/row-level security/);
    });
  });

  it("commentaires : on ne peut écrire qu'en son nom", async () => {
    await as(ALICE, async (c) => {
      await expect(
        c.query("insert into public.comments (post_id, author_id, body) values ($1,$2,'salut')", [
          alicePost,
          BOB,
        ]),
      ).rejects.toThrow(/row-level security/);
    });
    await as(ALICE, async (c) =>
      expect(
        (
          await c.query("insert into public.comments (post_id, body) values ($1,'salut')", [
            alicePost,
          ])
        ).rowCount,
      ).toBe(1),
    );
  });

  it("l'historique des statuts se remplit tout seul", async () => {
    await as(ALICE, async (c) => {
      await c.query("update public.posts set statut='en_cours' where id=$1", [alicePost]);
      const h = await c.query(
        "select from_status, to_status from public.post_status_history where post_id=$1 order by id",
        [alicePost],
      );
      expect(h.rows.at(-1)).toEqual({ from_status: "a_faire", to_status: "en_cours" });
      await expect(
        c.query("insert into public.post_status_history (post_id,to_status) values ($1,'publie')", [
          alicePost,
        ]),
      ).rejects.toThrow(/row-level security/);
    });
  });

  it("pièce jointe : seulement sur un post dont on est responsable", async () => {
    await as(ALICE, async (c) => {
      expect(
        (
          await c.query(
            "insert into public.attachments (post_id, storage_path, file_name) values ($1,'posts/a/1.png','1.png')",
            [alicePost],
          )
        ).rowCount,
      ).toBe(1);
    });
    await as(BOB, async (c) =>
      expect(
        c.query(
          "insert into public.attachments (post_id, storage_path, file_name) values ($1,'posts/a/2.png','2.png')",
          [alicePost],
        ),
      ).rejects.toThrow(/row-level security/),
    );
  });

  it("intérêt « Bientôt » : chacun le sien", async () => {
    await as(ALICE, async (c) => {
      expect(
        (
          await c.query(
            "insert into public.feature_interests (profile_id, feature) values ($1,'resultats')",
            [ALICE],
          )
        ).rowCount,
      ).toBe(1);
      await expect(
        c.query(
          "insert into public.feature_interests (profile_id, feature) values ($1,'resultats')",
          [BOB],
        ),
      ).rejects.toThrow(/row-level security/);
    });
  });

  it("le numéro de post est automatique et croissant", async () => {
    const r = await db.query("select numero from public.posts order by numero");
    const nums = r.rows.map((x) => x.numero as number);
    expect(nums).toEqual([...nums].sort((a, b) => a - b));
    expect(new Set(nums).size).toBe(nums.length);
  });
});
