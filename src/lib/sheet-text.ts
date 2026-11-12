export type SheetCell = string | number | boolean | Date | null | undefined;

const pad = (n: number) => String(n).padStart(2, "0");

/** Une cellule de feuille Excel en texte (dates : jj/mm/aaaa, comme dans un copier-coller). */
export function cellText(value: SheetCell): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date)
    return `${pad(value.getUTCDate())}/${pad(value.getUTCMonth() + 1)}/${value.getUTCFullYear()}`;
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  return String(value)
    .replace(/[\t\r\n]+/g, " ")
    .trim();
}

/** Une feuille Excel (tableau de lignes) en texte à tabulations, lu par l'importeur comme un tableau collé. */
export function sheetToText(rows: SheetCell[][]): string {
  return rows
    .map((r) => r.map(cellText).join("\t"))
    .filter((line) => line.replace(/\t/g, "") !== "")
    .join("\n");
}
