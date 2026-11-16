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
  "pc_days",
  "pc_slots",
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
  "pc_infos",
  "pc_role_tasks",
  "pc_notifications",
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
    await db.query(read("supabase/migrations/20261112000001_pc_roles_infos.sql"));
    await db.query(read("supabase/migrations/20261115000001_pc_roles_domaines.sql"));
    await db.query(read("supabase/migrations/20261116000001_pc_role_tasks.sql"));
    await db.query(read("supabase/migrations/20261116000002_pc_calendrier_jours.sql"));
    await db.query(read("supabase/migrations/20261116000003_pc_calendrier_seed.sql"));
    await db.query(read("supabase/migrations/20261117000001_pc_observateur_notifications.sql"));
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

  it("la RLS est active sur les 18 tables pc_*", async () => {
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

  it("le départ est vide : 0 membre, 0 tâche, mais les textes réels (rôles, guide, calendrier) sont là", async () => {
    const n = async (t: string) =>
      (await db.query(`select count(*)::int as n from public.${t}`)).rows[0].n;
    expect([await n("pc_members"), await n("pc_tasks")]).toEqual([0, 0]);
    expect([await n("pc_days"), await n("pc_slots")]).toEqual([20, 40]);
    expect([
      await n("pc_roles"),
      await n("pc_guide_sections"),
      await n("pc_projects"),
      await n("pc_milestones"),
    ]).toEqual([38, 9, 6, 5]); // 6 rôles de départ + 8 domaines + 24 sous-rôles
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
    // Un créneau passe à « publié » : le journal le note (le chargement du calendrier, lui, ne note rien).
    await db.query(
      "update pc_slots set statut='publie', maj_par=$1 where id = (select s.id from pc_slots s join pc_days d on d.id=s.day_id where d.date='2026-11-16' and s.priorite='obligatoire')",
      [A],
    );
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

  it("calendrier : 20 jours, un seul obligatoire et un seul facultatif par jour, un créneau par moment", async () => {
    const r = await db.query(`
      select d.date, count(*) filter (where s.priorite='obligatoire')::int as ob, count(*) filter (where s.priorite='facultatif')::int as fa, count(distinct s.moment)::int as moments
      from pc_days d join pc_slots s on s.day_id = d.id group by d.date`);
    expect(r.rows).toHaveLength(20);
    for (const row of r.rows) expect([row.ob, row.fa, row.moments]).toEqual([1, 1, 2]);
    await expect(
      db.query(
        "insert into pc_slots (day_id, moment, heure, priorite, titre) select id, 'matin', '09:00', 'facultatif', 'doublon' from pc_days where date='2026-11-16'",
      ),
    ).rejects.toThrow(/unique|duplicate/i);
  });

  it("calendrier : rejouer le chargement ne crée aucun doublon et n'écrase pas ce que l'équipe a rempli", async () => {
    const who = (await db.query("select id from pc_members limit 1")).rows[0].id;
    await db.query(
      "update pc_slots set responsable_id=$1, lien='https://exemple.org/p', statut='en_cours' where id = (select s.id from pc_slots s join pc_days d on d.id=s.day_id where d.date='2026-11-17' and s.priorite='obligatoire')",
      [who],
    );
    await db.query(read("supabase/migrations/20261116000003_pc_calendrier_seed.sql"));
    const counts = (
      await db.query(
        "select (select count(*)::int from pc_days) as d, (select count(*)::int from pc_slots) as s",
      )
    ).rows[0];
    expect(counts).toEqual({ d: 20, s: 40 });
    const kept = (
      await db.query(
        "select responsable_id, lien, statut from pc_slots s join pc_days d on d.id=s.day_id where d.date='2026-11-17' and s.priorite='obligatoire'",
      )
    ).rows[0];
    expect(kept).toEqual({
      responsable_id: who,
      lien: "https://exemple.org/p",
      statut: "en_cours",
    });
  });

  it("calendrier : le lien doit être http(s) ; la règle du calendrier est dans le guide", async () => {
    await expect(
      db.query(
        "update pc_slots set lien='pas-un-lien' where id = (select id from pc_slots limit 1)",
      ),
    ).rejects.toThrow();
    const g = await db.query(
      "select contenu from pc_guide_sections where slug='regles-calendrier'",
    );
    expect(g.rows).toHaveLength(1);
    expect(g.rows[0].contenu.split("\n")).toHaveLength(10);
  });

  it("sous-rôles : un rôle ne peut pas être son propre parent, et la suppression du parent détache les enfants", async () => {
    const parent = (
      await db.query("insert into public.pc_roles (nom) values ('Parent test') returning id")
    ).rows[0].id;
    const child = (
      await db.query(
        "insert into public.pc_roles (nom, parent_id) values ('Enfant test', $1) returning id",
        [parent],
      )
    ).rows[0].id;
    await expect(
      db.query("update public.pc_roles set parent_id = id where id = $1", [parent]),
    ).rejects.toThrow();
    await db.query("delete from public.pc_roles where id = $1", [parent]);
    const after = await db.query("select parent_id from public.pc_roles where id = $1", [child]);
    expect(after.rows[0].parent_id).toBeNull();
    await db.query("delete from public.pc_roles where id = $1", [child]);
  });

  it("infos : titre obligatoire, date de mise à jour automatique", async () => {
    await expect(
      db.query("insert into public.pc_infos (titre, contenu) values ('', 'x')"),
    ).rejects.toThrow();
    const id = (
      await db.query(
        "insert into public.pc_infos (titre, contenu) values ('Réunion', 'Jeudi') returning id",
      )
    ).rows[0].id;
    const before = (await db.query("select updated_at from public.pc_infos where id = $1", [id]))
      .rows[0].updated_at as Date;
    await db.query("select pg_sleep(0.05)");
    await db.query("update public.pc_infos set contenu = 'Vendredi' where id = $1", [id]);
    const after = (await db.query("select updated_at from public.pc_infos where id = $1", [id]))
      .rows[0].updated_at as Date;
    expect(after.getTime()).toBeGreaterThan(before.getTime());
    await db.query("delete from public.pc_infos where id = $1", [id]);
  });

  it("domaines : rejouer la migration ne crée aucun doublon et garde les titulaires", async () => {
    const before = (await db.query("select count(*)::int as n from public.pc_roles")).rows[0].n;
    await db.query(read("supabase/migrations/20261115000001_pc_roles_domaines.sql"));
    const after = (await db.query("select count(*)::int as n from public.pc_roles")).rows[0].n;
    expect(after).toBe(before);
    const r = await db.query(
      "select c.nom as enfant, p.nom as parent from public.pc_roles c join public.pc_roles p on p.id = c.parent_id where c.nom in ('Vidéo','Copywriter','Communauté')",
    );
    expect(Object.fromEntries(r.rows.map((x) => [x.enfant, x.parent]))).toEqual({
      Vidéo: "Photos et vidéos",
      Copywriter: "Rédaction",
      Communauté: "Gestion des réseaux sociaux",
    });
    // un seul niveau : aucun sous-rôle n'a lui-même de sous-rôles
    const deep = await db.query(
      "select count(*)::int as n from public.pc_roles c join public.pc_roles p on p.id = c.parent_id where p.parent_id is not null",
    );
    expect(deep.rows[0].n).toBe(0);
  });

  it("tâches par rôle : chaque rôle en a, sans heure précise, rejeu sans doublon, suppression en cascade", async () => {
    const n = async () =>
      (await db.query("select count(*)::int as n from public.pc_role_tasks")).rows[0].n;
    const total = await n();
    expect(total).toBe(95);
    const sans = await db.query(
      "select r.nom from public.pc_roles r where not exists (select 1 from public.pc_role_tasks t where t.role_id = r.id) and r.nom not in ('Photographe','Photos et vidéos') limit 5",
    );
    // seuls quelques rôles très ciblés peuvent ne rien avoir ; ici tous les rôles de départ et domaines en ont
    expect(sans.rows).toEqual([]);
    const heures = await db.query(
      "select titre from public.pc_role_tasks where titre ~* '\\m[0-9]{1,2}\\s?(h|:)[0-9]{0,2}\\M' and titre !~* '9:16'",
    );
    expect(heures.rows).toEqual([]);
    await db.query(read("supabase/migrations/20261116000001_pc_role_tasks.sql")); // rejeu
    expect(await n()).toBe(total);
    const r = (
      await db.query("insert into public.pc_roles (nom) values ('Rôle jetable') returning id")
    ).rows[0].id;
    await db.query("insert into public.pc_role_tasks (role_id, titre) values ($1, 'Faire ceci')", [
      r,
    ]);
    await expect(
      db.query("insert into public.pc_role_tasks (role_id, titre) values ($1, 'Faire ceci')", [r]),
    ).rejects.toThrow();
    await db.query("delete from public.pc_roles where id = $1", [r]);
    expect(await n()).toBe(total);
  });

  it("observateur : faux par défaut ; notifications : types contrôlés, texte obligatoire, suppression en cascade", async () => {
    const a = (
      await db.query(
        "insert into pc_members (prenom) values ('Obs Test') returning id, observateur",
      )
    ).rows[0];
    expect(a.observateur).toBe(false);
    const b = (
      await db.query(
        "insert into pc_members (prenom, observateur) values ('Fortunée Test', true) returning id",
      )
    ).rows[0].id;
    await db.query(
      "insert into pc_notifications (member_id, de_member_id, kind, texte) values ($1,$2,'message','Il manque la légende')",
      [a.id, b],
    );
    await expect(
      db.query("insert into pc_notifications (member_id, kind, texte) values ($1,'autre','x')", [
        a.id,
      ]),
    ).rejects.toThrow();
    await expect(
      db.query(
        "insert into pc_notifications (member_id, kind, texte) values ($1,'message','   ')",
        [a.id],
      ),
    ).rejects.toThrow();
    const unread = await db.query(
      "select count(*)::int as n from pc_notifications where member_id=$1 and lu_le is null",
      [a.id],
    );
    expect(unread.rows[0].n).toBe(1);
    // si l'expéditeur disparaît, le message reste (expéditeur inconnu) ; si le destinataire disparaît, il part avec
    await db.query("delete from pc_members where id=$1", [b]);
    expect(
      (await db.query("select de_member_id from pc_notifications where member_id=$1", [a.id]))
        .rows[0].de_member_id,
    ).toBeNull();
    await db.query("delete from pc_members where id=$1", [a.id]);
    expect(
      (await db.query("select count(*)::int as n from pc_notifications where member_id=$1", [a.id]))
        .rows[0].n,
    ).toBe(0);
  });
});
