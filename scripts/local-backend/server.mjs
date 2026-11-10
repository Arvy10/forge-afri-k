/**
 * Faux Supabase local — UNIQUEMENT pour tester l'interface sans compte Supabase.
 *
 * - /auth/v1/*  : connexion par mot de passe (tous les comptes de démo : « motdepasse-demo »)
 * - /rest/v1/*  : traduit les requêtes de supabase-js en SQL sur un vrai Postgres,
 *                 en se plaçant dans le rôle « authenticated » → la vraie RLS s'applique.
 * - /storage/v1/*: non fourni (les images/pièces jointes n'apparaissent pas en local).
 *
 * Usage : DATABASE_URL=postgres://… node scripts/local-backend/server.mjs
 * Ne jamais utiliser en production.
 */
import { createHmac, randomUUID } from "node:crypto";
import http from "node:http";
import pg from "pg";

const PORT = Number(process.env.PORT ?? 54321);
const SECRET = process.env.JWT_SECRET ?? "local-demo-secret-not-for-production-use";
const PASSWORD = "motdepasse-demo";
const SERVICE_KEY = "demo-service-role-key";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const b64 = (o) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
const sign = (payload) => {
  const head = b64({ alg: "HS256", typ: "JWT" });
  const body = b64(payload);
  const sig = createHmac("sha256", SECRET).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
};
function verify(token) {
  const [h, b, s] = token.split(".");
  if (!h || !b || !s) return null;
  const ok = createHmac("sha256", SECRET).update(`${h}.${b}`).digest("base64url") === s;
  if (!ok) return null;
  const claims = JSON.parse(Buffer.from(b, "base64url").toString());
  return claims.exp && claims.exp < Date.now() / 1000 ? null : claims;
}
const userJson = (u) => ({
  id: u.id,
  aud: "authenticated",
  role: "authenticated",
  email: u.email,
  app_metadata: { provider: "email" },
  user_metadata: u.raw_user_meta_data ?? {},
  created_at: new Date().toISOString(),
});
function session(u) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return {
    access_token: sign({
      sub: u.id,
      role: "authenticated",
      aud: "authenticated",
      email: u.email,
      exp,
    }),
    token_type: "bearer",
    expires_in: 3600,
    expires_at: exp,
    refresh_token: `r.${u.id}`,
    user: userJson(u),
  };
}

const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(body === undefined ? undefined : JSON.stringify(body));
};
const readBody = (req) =>
  new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
  });

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
  let depth = 0,
    cur = "";
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
  const Q = (c) => pre + q(c);
  const op = spec.slice(0, dot);
  const val = spec.slice(dot + 1);
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
  const auth = req.headers.authorization?.replace(/^Bearer /, "");
  const isService = auth === SERVICE_KEY; // clé service_role de démo : contourne la RLS
  const claims = auth && !isService ? verify(auth) : null;
  const role = isService ? "postgres" : claims ? "authenticated" : "anon";
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
    const upsert =
      prefer.includes("resolution=merge-duplicates") && conflict
        ? ` on conflict (${conflict.split(",").map(q).join(",")}) do update set ${
            keys
              .filter((k) => !conflict.split(",").includes(k))
              .map((k) => `${q(k)} = excluded.${q(k)}`)
              .join(", ") || `${q(keys[0])} = excluded.${q(keys[0])}`
          }`
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
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify(claims ?? {}),
    ]);
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
    const status = e.code === "42501" ? (claims ? 403 : 401) : e.code === "23505" ? 409 : 400;
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

/* ----------------------------- Auth ----------------------------- */
async function authRoute(req, res, url) {
  const path = url.pathname.replace("/auth/v1", "");
  if (path === "/token" && req.method === "POST") {
    const body = JSON.parse((await readBody(req)) || "{}");
    const grant = url.searchParams.get("grant_type");
    if (grant === "password") {
      const { rows } = await pool.query(
        "select id, email, raw_user_meta_data from auth.users where lower(email) = lower($1)",
        [body.email ?? ""],
      );
      if (!rows[0] || body.password !== PASSWORD)
        return send(res, 400, {
          code: 400,
          error_code: "invalid_credentials",
          msg: "Invalid login credentials",
        });
      return send(res, 200, session(rows[0]));
    }
    if (grant === "refresh_token") {
      const id = String(body.refresh_token ?? "").replace(/^r\./, "");
      const { rows } = await pool.query(
        "select id, email, raw_user_meta_data from auth.users where id::text = $1",
        [id],
      );
      if (!rows[0])
        return send(res, 400, {
          code: 400,
          error_code: "refresh_token_not_found",
          msg: "Invalid Refresh Token",
        });
      return send(res, 200, session(rows[0]));
    }
  }
  if (path === "/user" && req.method === "GET") {
    const claims = verify(req.headers.authorization?.replace(/^Bearer /, "") ?? "");
    if (!claims) return send(res, 401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT" });
    const { rows } = await pool.query(
      "select id, email, raw_user_meta_data from auth.users where id::text = $1",
      [claims.sub],
    );
    return rows[0]
      ? send(res, 200, userJson(rows[0]))
      : send(res, 401, { code: 401, msg: "user not found" });
  }
  if (path === "/invite" && req.method === "POST") {
    if (req.headers.authorization !== `Bearer ${SERVICE_KEY}` && req.headers.apikey !== SERVICE_KEY)
      return send(res, 401, { msg: "service_role requis" });
    const body = JSON.parse((await readBody(req)) || "{}");
    const { rows: existing } = await pool.query(
      "select 1 from auth.users where lower(email) = lower($1)",
      [body.email],
    );
    if (existing[0])
      return send(res, 422, {
        code: 422,
        error_code: "email_exists",
        msg: "A user with this email address has already been registered",
      });
    const { rows } = await pool.query(
      "insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id, email, raw_user_meta_data",
      [body.email, body.data ?? {}],
    );
    console.log(`[invite] ${body.email}`);
    return send(res, 200, userJson(rows[0]));
  }
  if (path.startsWith("/admin/users/") && req.method === "PUT") return send(res, 200, {});
  if (path === "/logout") return send(res, 204);
  if (path === "/recover") return send(res, 200, {});
  return send(res, 404, { msg: `Non géré en local : ${path}` });
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    try {
      if (url.pathname.startsWith("/rest/v1/")) return await rest(req, res, url);
      if (url.pathname.startsWith("/auth/v1/")) return await authRoute(req, res, url);
      if (url.pathname.startsWith("/storage/v1/object/sign/")) return send(res, 200, []);
      return send(res, 404, { message: "Non géré par le faux Supabase local" });
    } catch (e) {
      console.error(e);
      return send(res, 500, { message: String(e.message ?? e), requestId: randomUUID() });
    }
  })
  .listen(PORT, "127.0.0.1", () => console.log(`Faux Supabase local sur http://127.0.0.1:${PORT}`));
