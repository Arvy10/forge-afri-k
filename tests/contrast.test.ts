import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.resolve(import.meta.dirname, "../src/app/globals.css"), "utf8");

/** Extrait les variables `--nom: #hex` d'un bloc CSS dont l'ouverture correspond à `opener`. */
function block(opener: string): Record<string, string> {
  const start = css.indexOf(opener);
  if (start < 0) throw new Error(`Bloc introuvable : ${opener}`);
  const open = css.indexOf("{", start);
  let depth = 0;
  let end = open;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}") depth--;
    if (depth === 0) {
      end = i;
      break;
    }
  }
  const body = css.slice(open + 1, end);
  const vars: Record<string, string> = {};
  for (const m of body.matchAll(/--([a-z0-9_-]+):\s*(#[0-9a-f]{6})\s*;/gi)) vars[m[1]!] = m[2]!;
  return vars;
}

const light = block(":root {");
const darkAttr = block(':root[data-theme="dark"] {');

function lum(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

const TYPES = ["impact", "patrimoine", "coulisses", "fun", "appel_action"];
const STATUSES = ["a_faire", "en_cours", "pret_a_valider", "valide", "publie"];

describe("thème sombre", () => {
  it("définit les mêmes jetons que le mode clair (hors ombre)", () => {
    expect(Object.keys(darkAttr).sort()).toEqual(Object.keys(light).sort());
  });
  it("n'est jamais imposé par le réglage de l'appareil : le site reste clair par défaut", () => {
    expect(css).not.toMatch(/prefers-color-scheme:\s*dark/);
  });
});

for (const [name, v] of [
  ["clair", light],
  ["sombre", darkAttr],
] as const) {
  describe(`contraste AA — mode ${name}`, () => {
    const text: [string, string][] = [];
    for (const bg of ["canvas", "surface", "surface-2"]) {
      text.push(
        ["ink", bg],
        ["ink-muted", bg],
        ["accent-strong", bg],
        ["danger", bg],
        ["success", bg],
      );
    }
    text.push(["on-accent", "accent-strong"], ["on-forest", "forest"], ["danger", "danger-soft"]);
    text.push(["accent-strong", "accent-soft"]);
    for (const t of TYPES) text.push([`t-${t}-fg`, `t-${t}-bg`]);

    it.each(text)("texte %s sur %s ≥ 4,5", (fg, bg) => {
      expect(ratio(v[fg]!, v[bg]!), `${fg} sur ${bg}`).toBeGreaterThanOrEqual(4.5);
    });

    const ui: [string, string][] = [
      ["line-strong", "canvas"],
      ["line-strong", "surface"],
      ["accent", "surface"],
    ];
    for (const t of TYPES) ui.push([`t-${t}-dot`, "surface"]);
    for (const s of STATUSES) ui.push([`s-${s}`, "surface"]);
    it.each(ui)("élément graphique %s sur %s ≥ 3", (fg, bg) => {
      expect(ratio(v[fg]!, v[bg]!), `${fg} sur ${bg}`).toBeGreaterThanOrEqual(3);
    });
  });
}
