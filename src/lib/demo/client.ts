import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import { todayISO } from "../dates";
import { buildDemoTables, DEMO_ADMIN_ID, type DemoTables } from "./data";
import { DEMO_MESSAGE, type DemoVariant } from "./mode";

type Row = Record<string, unknown>;
type Result = { data: unknown; error: { message: string; code?: string } | null };

const cmp = (a: unknown, b: unknown): number => {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  return (a as string | number) < (b as string | number) ? -1 : 1;
};

/** Lecture seule : imite juste assez de l'API supabase-js (select, filtres, tri) pour l'aperçu. */
class DemoQuery implements PromiseLike<Result> {
  private filters: Array<(r: Row) => boolean> = [];
  private orders: Array<{ col: string; asc: boolean; nullsFirst?: boolean }> = [];
  private max = Infinity;
  private cols: string | null = null;
  private mutation = false;
  private mode: "many" | "maybe" | "single" = "many";

  constructor(private rows: Row[]) {}

  select(cols?: string) {
    if (cols && cols !== "*") this.cols = cols;
    return this;
  }
  eq(col: string, v: unknown) {
    this.filters.push((r) => r[col] === v);
    return this;
  }
  neq(col: string, v: unknown) {
    this.filters.push((r) => r[col] !== v);
    return this;
  }
  gte(col: string, v: unknown) {
    this.filters.push((r) => r[col] != null && cmp(r[col], v) >= 0);
    return this;
  }
  lte(col: string, v: unknown) {
    this.filters.push((r) => r[col] != null && cmp(r[col], v) <= 0);
    return this;
  }
  in(col: string, vs: unknown[]) {
    this.filters.push((r) => vs.includes(r[col]));
    return this;
  }
  /** Expression PostgREST : « col.eq.x,col2.cs.{x} » */
  or(expr: string) {
    const parts = expr.split(/,(?![^{]*})/).map((p) => {
      const [col, op, ...rest] = p.split(".");
      const val = rest.join(".");
      return (r: Row) => {
        if (op === "eq") return r[col!] === val;
        if (op === "cs") {
          const wanted = val.replace(/^\{|\}$/g, "").split(",");
          const have = r[col!];
          return Array.isArray(have) && wanted.every((w) => have.includes(w));
        }
        return false;
      };
    });
    this.filters.push((r) => parts.some((f) => f(r)));
    return this;
  }
  order(col: string, opts: { ascending?: boolean; nullsFirst?: boolean } = {}) {
    this.orders.push({ col, asc: opts.ascending !== false, nullsFirst: opts.nullsFirst });
    return this;
  }
  limit(n: number) {
    this.max = n;
    return this;
  }
  maybeSingle() {
    this.mode = "maybe";
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }
  // Toute écriture est refusée avec un message clair.
  insert() {
    this.mutation = true;
    return this;
  }
  update() {
    this.mutation = true;
    return this;
  }
  upsert() {
    this.mutation = true;
    return this;
  }
  delete() {
    this.mutation = true;
    return this;
  }

  private run(): Result {
    if (this.mutation) return { data: null, error: { message: DEMO_MESSAGE, code: "DEMO" } };
    let out = this.rows.filter((r) => this.filters.every((f) => f(r)));
    for (const o of [...this.orders].reverse()) {
      out = [...out].sort((a, b) => {
        const av = a[o.col];
        const bv = b[o.col];
        const aNull = av === null || av === undefined;
        const bNull = bv === null || bv === undefined;
        if (aNull || bNull) {
          if (aNull && bNull) return 0;
          // PostgREST : nulls en dernier en ordre croissant, sauf nullsFirst explicite
          const nullsFirst = o.nullsFirst ?? !o.asc;
          return aNull === nullsFirst ? -1 : 1;
        }
        return o.asc ? cmp(av, bv) : cmp(bv, av);
      });
    }
    out = out.slice(0, this.max);
    if (this.cols) {
      const keys = this.cols.split(",").map((k) => k.trim());
      out = out.map((r) => Object.fromEntries(keys.map((k) => [k, r[k]])));
    }
    if (this.mode === "many") return { data: out, error: null };
    if (this.mode === "maybe") return { data: out[0] ?? null, error: null };
    return out[0]
      ? { data: out[0], error: null }
      : { data: null, error: { message: "Aucune ligne trouvée", code: "PGRST116" } };
  }

  then<A = Result, B = never>(
    onfulfilled?: ((value: Result) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }
}

/** Faux client Supabase pour l'aperçu visuel : données d'exemple, aucune écriture. */
export function createDemoClient(variant: DemoVariant): SupabaseClient<Database> {
  const tables = buildDemoTables(variant, todayISO());
  const admin = tables.profiles.find((p) => p.id === DEMO_ADMIN_ID)!;
  const client = {
    from: (table: keyof DemoTables) => new DemoQuery((tables[table] ?? []) as unknown as Row[]),
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: admin.id,
            email: admin.email,
            aud: "authenticated",
            app_metadata: {},
            user_metadata: {},
            created_at: admin.created_at,
          },
        },
        error: null,
      }),
      signOut: async () => ({ error: null }),
    },
    storage: {
      from: () => ({
        createSignedUrls: async () => ({ data: [], error: null }),
        remove: async () => ({ data: [], error: null }),
        upload: async () => ({ data: null, error: { message: DEMO_MESSAGE } }),
      }),
    },
  };
  return client as unknown as SupabaseClient<Database>;
}
