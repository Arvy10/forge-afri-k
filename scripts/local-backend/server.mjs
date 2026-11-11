/**
 * Faux Supabase local — UNIQUEMENT pour tester le site sans compte Supabase.
 *
 * - /rest/v1/*     : traduit les requêtes de supabase-js en SQL sur un vrai Postgres.
 *                    Seule la clé « service_role » de démo est acceptée (comme le site le fait côté serveur) ;
 *                    toute autre clé (ex. la clé publique) agit comme « anon » : aucun droit sur les tables pc_*.
 * - /storage/v1/*  : envoi par URL signée et liens signés, en mémoire (pour tester les livrables).
 *
 * Usage : DATABASE_URL=postgres://… node scripts/local-backend/server.mjs
 * Ne jamais utiliser en production. Aucune donnée d'exemple n'est fournie.
 */
import { randomUUID } from "node:crypto";
import http from "node:http";
import pg from "pg";

const PORT = Number(process.env.PORT ?? 54321);
const SERVICE_KEY = "demo-service-role-key";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
};
const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { "Content-Type": "application/json", ...CORS, ...headers });
  res.end(body === undefined ? undefined : JSON.stringify(body));
};
const readRaw = (req) =>
  new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });
const readBody = async (req) => (await readRaw(req)).toString();

/* ----------------------------- REST → SQL ----------------------------- */
const IDENT = /^[a-z_][a-z0-9_]*$/;
const q = (id) => {
  if (!IDENT.test(id)) throw new Error(`Identifiant refusé : ${id}`);
  return `"${id}"`;
};
const OPS = {
  eq: "=",
  neq: "<>",
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  like: "like",
  ilike: "ilike",
  cs: "@>",
};

function splitTop(s) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(" || ch === "{") depth++;
    if (ch === ")" || ch === "}") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

function condition(col, spec, params, pre = "") {
  const dot = spec.indexOf(".");
  const op = spec.slice(0, dot);
  const val = spec.slice(dot + 1);
  const Q = (c) => pre + q(c);
  if (op === "is")
    return `${Q(col)} is ${val === "null" ? "null" : val === "true" ? "true" : "false"}`;
  if (op === "in") {
    const items = splitTop(val.replace(/^\(|\)$/g, "")).map((x) => x.replace(/^"|"$/g, ""));
    if (!items.length) return "false";
    return `${Q(col)} in (${items
      .map((i) => {
        params.push(i);
        return `$${params.length}`;
      })
      .join(",")})`;
  }
  if (!OPS[op]) throw new Error(`Opérateur non géré : ${op}`);
  params.push(val);
  return `${Q(col)} ${OPS[op]} $${params.length}`;
}

function whereFrom(url, params, pre = "") {
  const parts = [];
  for (const [k, v] of url.searchParams) {
    if (["select", "order", "limit", "offset", "on_conflict", "columns"].includes(k)) continue;
    if (k === "or")
      parts.push(
        "(" +
          splitTop(v.replace(/^\(|\)$/g, ""))
            .map((c) => {
              const [col, ...rest] = c.split(".");
              return condition(col, rest.join("."), params, pre);
            })
            .join(" or ") +
          ")",
      );
    else parts.push(condition(k, v, params, pre));
  }
  return parts.length ? ` where ${parts.join(" and ")}` : "";
}

function orderFrom(url) {
  const o = url.searchParams.get("order");
  if (!o) return "";
  return (
    " order by " +
    o
      .split(",")
      .map((p) => {
        const [col, ...mods] = p.split(".");
        return `${q(col)} ${mods.includes("desc") ? "desc" : "asc"}${mods.includes("nullsfirst") ? " nulls first" : mods.includes("nullslast") ? " nulls last" : ""}`;
      })
      .join(", ")
  );
}

const colsFrom = (url, pre = "") => {
  const s = url.searchParams.get("select") ?? "*";
  if (s === "*") return pre ? `${pre}*` : "*";
  return s
    .split(",")
    .map((c) => pre + q(c.trim()))
    .join(", ");
};

async function rest(req, res, url) {
  const table = url.pathname.replace("/rest/v1/", "");
  const bearer = (req.headers.authorization ?? "").replace(/^Bearer /, "");
  const apikey = req.headers.apikey ?? "";
  const isService = bearer === SERVICE_KEY || apikey === SERVICE_KEY;
  const role = isService ? "postgres" : "anon";
  const wantObject = (req.headers.accept ?? "").includes("vnd.pgrst.object");
  const prefer = req.headers.prefer ?? "";
  const returning = prefer.includes("return=representation");
  const params = [];
  const t = `public.${q(table)}`;
  let sql;
  const body =
    req.method === "POST" || req.method === "PATCH"
      ? JSON.parse((await readBody(req)) || "null")
      : null;
  const returnClause = ` returning ${colsFrom(url)}`;
  const wrap = (inner) => `select coalesce(json_agg(r), '[]'::json) as j from (${inner}) r`;
  // INSERT/UPDATE/DELETE ... RETURNING doit passer par une CTE, pas par une sous-requête.
  const wrapDml = (inner) =>
    `with r as (${inner}) select coalesce(json_agg(r), '[]'::json) as j from r`;

  if (req.method === "GET") {
    const limit = url.searchParams.get("limit");
    const offset = url.searchParams.get("offset");
    sql = wrap(
      `select ${colsFrom(url)} from ${t}${whereFrom(url, params)}${orderFrom(url)}${limit ? ` limit ${Number(limit)}` : ""}${offset ? ` offset ${Number(offset)}` : ""}`,
    );
  } else if (req.method === "POST") {
    const rows = Array.isArray(body) ? body : [body];
    const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    params.push(JSON.stringify(rows));
    const conflict = url.searchParams.get("on_conflict");
    const conflictCols = conflict ? conflict.split(",") : [];
    const updates = keys.filter((k) => !conflictCols.includes(k));
    const upsert =
      prefer.includes("resolution=merge-duplicates") && conflict
        ? ` on conflict (${conflictCols.map(q).join(",")}) do update set ${updates.map((k) => `${q(k)} = excluded.${q(k)}`).join(", ") || `${q(keys[0])} = excluded.${q(keys[0])}`}`
        : "";
    const ins = `insert into ${t} (${keys.map(q).join(",")}) select ${keys.map(q).join(",")} from json_populate_recordset(null::${t}, $1::json)${upsert}`;
    sql = returning ? wrapDml(ins + returnClause) : `${ins} returning 1`;
  } else if (req.method === "PATCH") {
    const keys = Object.keys(body);
    params.push(JSON.stringify(body));
    const where = whereFrom(url, params, "t.");
    const upd = `update ${t} as t set ${keys.map((k) => `${q(k)} = r.${q(k)}`).join(", ")} from json_populate_record(null::${t}, $1::json) r${where}`;
    sql = returning ? wrapDml(upd + ` returning ${colsFrom(url, "t.")}`) : `${upd} returning 1`;
  } else if (req.method === "DELETE") {
    const del = `delete from ${t}${whereFrom(url, params)}`;
    sql = returning ? wrapDml(del + returnClause) : `${del} returning 1`;
  } else return send(res, 405, { message: "Méthode non gérée" });

  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`set local role ${role}`);
    const out = await client.query(sql, params);
    await client.query("commit");
    if (req.method === "GET" || returning) {
      const rows = out.rows[0].j;
      if (wantObject) {
        if (rows.length !== 1)
          return send(res, 406, {
            code: "PGRST116",
            message: "JSON object requested, multiple (or no) rows returned",
            details: `The result contains ${rows.length} rows`,
            hint: null,
          });
        return send(res, req.method === "POST" ? 201 : 200, rows[0]);
      }
      return send(res, req.method === "POST" ? 201 : 200, rows);
    }
    return send(res, req.method === "POST" ? 201 : 204);
  } catch (e) {
    await client.query("rollback").catch(() => {});
    console.error(`[rest ${req.method} ${table}]`, e.message);
    const status = e.code === "42501" ? 401 : e.code === "23505" ? 409 : 400;
    return send(res, status, {
      code: e.code ?? "PGRST000",
      message: e.message,
      details: e.detail ?? null,
      hint: e.hint ?? null,
    });
  } finally {
    client.release();
  }
}

/* ----------------------------- Storage (en mémoire) ----------------------------- */
const files = new Map(); // "bucket/chemin" -> Buffer

async function storage(req, res, url) {
  const path = url.pathname.replace("/storage/v1", "");
  // Signature d'un envoi : POST /object/upload/sign/{bucket}/{chemin}
  let m = /^\/object\/upload\/sign\/([^/]+)\/(.+)$/.exec(path);
  if (m && req.method === "POST")
    return send(res, 200, { url: `/object/upload/sign/${m[1]}/${m[2]}?token=tok-${randomUUID()}` });
  // Envoi : PUT /object/upload/sign/{bucket}/{chemin}?token=
  if (m && req.method === "PUT") {
    if (!url.searchParams.get("token")) return send(res, 400, { message: "token manquant" });
    files.set(`${m[1]}/${decodeURIComponent(m[2])}`, await readRaw(req));
    return send(res, 200, { Key: `${m[1]}/${m[2]}` });
  }
  // Liens signés : POST /object/sign/{bucket}  { paths, expiresIn }
  m = /^\/object\/sign\/([^/]+)$/.exec(path);
  if (m && req.method === "POST") {
    const { paths = [] } = JSON.parse((await readBody(req)) || "{}");
    return send(
      res,
      200,
      paths.map((p) => ({
        path: p,
        signedURL: `/object/sign/${m[1]}/${p}?token=tok-${randomUUID()}`,
        error: null,
      })),
    );
  }
  // Téléchargement d'un lien signé
  m = /^\/object\/sign\/([^/]+)\/(.+)$/.exec(path);
  if (m && req.method === "GET") {
    const f = files.get(`${m[1]}/${decodeURIComponent(m[2])}`);
    if (!f) return send(res, 404, { message: "Fichier introuvable" });
    res.writeHead(200, { "Content-Type": "application/octet-stream", ...CORS });
    return res.end(f);
  }
  // Suppression : DELETE /object/{bucket}  { prefixes }
  m = /^\/object\/([^/]+)$/.exec(path);
  if (m && req.method === "DELETE") {
    const { prefixes = [] } = JSON.parse((await readBody(req)) || "{}");
    for (const p of prefixes) files.delete(`${m[1]}/${p}`);
    return send(res, 200, []);
  }
  return send(res, 404, { message: `Non géré en local : ${path}` });
}

http
  .createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, CORS);
      return res.end();
    }
    const url = new URL(req.url, `http://${req.headers.host}`);
    try {
      if (url.pathname.startsWith("/rest/v1/")) return await rest(req, res, url);
      if (url.pathname.startsWith("/storage/v1/")) return await storage(req, res, url);
      return send(res, 404, { message: "Non géré par le faux Supabase local" });
    } catch (e) {
      console.error(e);
      return send(res, 500, { message: String(e.message ?? e), requestId: randomUUID() });
    }
  })
  .listen(PORT, "127.0.0.1", () => console.log(`Faux Supabase local sur http://127.0.0.1:${PORT}`));
