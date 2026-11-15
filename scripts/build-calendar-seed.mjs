#!/usr/bin/env node
/**
 * Génère la migration de chargement du calendrier éditorial à partir du JSON (source de vérité).
 *   node scripts/build-calendar-seed.mjs
 * Les textes sont copiés tels quels (guillemets dollar : aucun échappement, aucune modification).
 * La migration produite est idempotente : relancée, elle ne crée aucun doublon et n'écrase ni
 * responsable, ni statut, ni lien remplis par l'équipe.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "data/calendrier-16nov-11dec.json");
const out = path.join(root, "supabase/migrations/20261116000003_pc_calendrier_seed.sql");
const data = JSON.parse(readFileSync(src, "utf8"));

const TYPES = {
  Impact: "impact",
  Patrimoine: "patrimoine",
  Coulisses: "coulisses",
  Fun: "fun",
  "Appel à l'action": "appel_action",
};
const DELIM = "$cal$";

const q = (v) => {
  if (v === null || v === undefined) return "null";
  const s = String(v);
  if (s.includes(DELIM)) throw new Error(`Texte contenant le délimiteur : ${s}`);
  return `${DELIM}${s}${DELIM}`;
};
const json = (v) => `${q(JSON.stringify(v))}::jsonb`;

const lines = [];
lines.push(
  `-- Calendrier éditorial du 16 novembre au 11 décembre 2026 (${data.jours.length} jours).`,
  "-- GÉNÉRÉ par scripts/build-calendar-seed.mjs à partir de data/calendrier-16nov-11dec.json : ne pas modifier à la main.",
  "-- Idempotent : relancé, ne crée aucun doublon et n'écrase rien de ce que l'équipe a rempli.",
  "",
);

for (const j of data.jours) {
  const type = TYPES[j.type_de_contenu];
  if (!type) throw new Error(`Type inconnu : ${j.type_de_contenu}`);
  lines.push(
    `insert into public.pc_days (numero, date, jour, semaine, theme_semaine, type_de_contenu, consigne_du_jour) values (${j.numero}, '${j.date}', ${q(j.jour)}, ${j.semaine}, ${q(j.theme_semaine)}, '${type}', ${q(j.consigne_du_jour)}) on conflict (date) do nothing;`,
  );
  for (const s of j.slots) {
    lines.push(
      "insert into public.pc_slots (day_id, moment, heure, priorite, genre, titre, idee, comment_faire, accroche, legende, formats, a_preparer_le, statut)",
      `  select d.id, '${s.moment}', '${s.heure}', '${s.priorite}', ${q(s.genre)}, ${q(s.titre)}, ${q(s.idee)}, ${json(s.comment_faire ?? [])}, ${q(s.accroche)}, ${q(s.legende)}, ${json(s.formats ?? {})}, '${s.a_preparer_le}', '${s.statut}'`,
      `  from public.pc_days d where d.date = '${j.date}'`,
      "  on conflict (day_id, moment) do nothing;",
    );
  }
  lines.push("");
}

lines.push("-- Règles du calendrier, affichées dans « Règles et guide »");
const regles = data.meta.regles.map((r) => `- ${r}`).join("\n");
lines.push(
  "insert into public.pc_guide_sections (slug, titre, contenu, ordre)",
  `  values ('regles-calendrier', 'Règles du calendrier éditorial', ${q(regles)}, 5)`,
  "  on conflict (slug) do nothing;",
  "",
);

writeFileSync(out, lines.join("\n"));
const slots = data.jours.reduce((n, j) => n + j.slots.length, 0);
console.log(`Écrit : ${path.relative(root, out)} (${data.jours.length} jours, ${slots} créneaux)`);
