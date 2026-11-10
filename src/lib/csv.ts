/** Lecture / écriture CSV minimale (RFC 4180), compatible Excel français (séparateur « ; », BOM). */

export function detectDelimiter(text: string): "," | ";" | "\t" {
  const firstLine = text.replace(/^﻿/, "").split(/\r?\n/, 1)[0] ?? "";
  const count = (ch: string) => firstLine.split(ch).length - 1;
  const candidates: Array<[",", number] | [";", number] | ["\t", number]> = [
    [";", count(";")],
    [",", count(",")],
    ["\t", count("\t")],
  ];
  candidates.sort((a, b) => b[1] - a[1]);
  return candidates[0]![0];
}

export function parseCsv(input: string, delimiter?: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const sep = delimiter ?? detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === sep) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Ignore les lignes entièrement vides
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Protège contre l'injection de formule dans Excel (= + - @ en début de cellule). */
function neutralize(value: string): string {
  return /^[=+\-@\t\r]/.test(value) && !/^[+-]?\d+([.,]\d+)?$/.test(value) ? `'${value}` : value;
}

export function toCsv(rows: string[][], delimiter = ";"): string {
  const esc = (v: string) => {
    const s = neutralize(v);
    return /["\n\r]/.test(s) || s.includes(delimiter) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // BOM : Excel ouvre alors le fichier en UTF-8 (accents corrects).
  return "﻿" + rows.map((r) => r.map(esc).join(delimiter)).join("\r\n") + "\r\n";
}
