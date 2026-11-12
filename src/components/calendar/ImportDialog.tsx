"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, ClipboardPaste, FileUp, TriangleAlert, X } from "lucide-react";
import { importPosts } from "@/actions/posts";
import { Button, buttonClass } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import { CHANNEL_LABEL, CONTENT_TYPE_META } from "@/lib/constants";
import { formatDayLong } from "@/lib/dates";
import { sheetToText, type SheetCell } from "@/lib/sheet-text";
import { FIELD_KEYS, FIELD_LABEL, type FieldKey, type ImportReport } from "@/lib/paste-import";
import { cn } from "@/lib/cn";

type Report = ImportReport & { inserted: number };
type Mode = "coller" | "fichier";

const EXAMPLE = `Date\tType\tCanal\tIdée\tResponsable
16/11\tImpact\tInstagram\tPortrait d'un artisan\tAïcha
mardi 17 novembre\tPatrimoine\tTikTok, Facebook\tLe vieux port\tJosué`;

/** Importer un calendrier : coller le texte copié (Notion, Excel, Sheets…) ou choisir un fichier CSV. */
export function ImportDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("coller");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [weekStart, setWeekStart] = useState("");
  const [mapping, setMapping] = useState<(FieldKey | null)[] | undefined>(undefined);
  const [rawReport, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);

  const reset = () => {
    setText("");
    setFileName("");
    setWeekStart("");
    setMapping(undefined);
    setReport(null);
    setError(null);
    if (input.current) input.current.value = "";
  };

  // Vérification automatique (sans rien ajouter) dès que le texte, la semaine ou les colonnes changent.
  useEffect(() => {
    if (!open || text.trim() === "") return;
    const id = ++requestId.current;
    const timer = setTimeout(() => {
      start(async () => {
        const res = await importPosts(text, true, { mapping, weekStart: weekStart || null });
        if (id !== requestId.current) return;
        if (res.ok && res.data) {
          setError(null);
          setReport(res.data);
        } else if (!res.ok) {
          setReport(null);
          setError(res.error);
        }
      });
    }, 450);
    return () => clearTimeout(timer);
  }, [open, text, weekStart, mapping]);

  const report = text.trim() === "" ? null : rawReport;
  const valid = report?.rows.filter((r) => r.post).length ?? 0;
  const invalid = (report?.rows.length ?? 0) - valid;
  const done = (report?.inserted ?? 0) > 0;
  const analysis = report?.analysis;
  const needsWeek = report?.rows.some((r) => r.errors.some((e) => e.includes("semaine de départ")));

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <Dialog.Trigger className={buttonClass("secondary")}>
        <ClipboardPaste aria-hidden className="size-4" />
        Importer / coller
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="rx-overlay fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content
          aria-describedby="import-desc"
          className="rx-dialog bg-canvas fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-2xl p-5 shadow-2xl md:inset-auto md:top-1/2 md:left-1/2 md:w-[42rem] md:max-w-[92vw] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <Dialog.Title className="font-display text-xl font-bold">
              Importer un calendrier
            </Dialog.Title>
            <Dialog.Close
              className="hover:bg-surface-2 -mt-1 -mr-2 inline-flex size-12 items-center justify-center rounded-lg"
              aria-label="Fermer"
            >
              <X aria-hidden className="size-5" />
            </Dialog.Close>
          </div>
          <p id="import-desc" className="text-ink-muted mb-4 text-sm">
            Copie ton tableau (Notion, Excel, Google Sheets…) et colle-le ici : le site reconnaît
            les colonnes et les dates, et place chaque post au bon jour. Rien n&apos;est ajouté sans
            ta confirmation.
          </p>

          <div role="tablist" aria-label="Mode d'import" className="mb-4 grid grid-cols-2 gap-2">
            {(
              [
                ["coller", "Coller le texte", ClipboardPaste],
                ["fichier", "Fichier Excel / CSV", FileUp],
              ] as const
            ).map(([m, label, Icon]) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  "flex min-h-12 items-center justify-center gap-2 rounded-xl border text-sm font-semibold",
                  mode === m
                    ? "border-accent-strong bg-accent-soft"
                    : "border-line-strong bg-surface text-ink-muted",
                )}
              >
                <Icon aria-hidden className="size-4" />
                {label}
              </button>
            ))}
          </div>

          <FormError message={error} />

          {mode === "coller" ? (
            <div className="space-y-1.5">
              <label htmlFor="paste-area" className="text-sm font-medium">
                Colle ton calendrier ici
              </label>
              <textarea
                id="paste-area"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setMapping(undefined);
                }}
                rows={7}
                placeholder={EXAMPLE}
                className="border-line-strong bg-surface min-h-40 w-full rounded-xl border p-3 font-mono text-sm"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <input
                ref={input}
                type="file"
                accept=".xlsx,.csv,text/csv,text/plain"
                className="sr-only"
                aria-label="Choisir un fichier Excel ou CSV"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setFileName(f.name);
                  setMapping(undefined);
                  setError(null);
                  if (/\.xlsx$/i.test(f.name)) {
                    try {
                      // Chargé seulement quand on choisit un fichier Excel (première feuille).
                      const { readSheet } = await import("read-excel-file/universal");
                      setText(sheetToText((await readSheet(f)) as unknown as SheetCell[][]));
                    } catch {
                      setText("");
                      setError(
                        "Ce fichier Excel n'a pas pu être lu. Enregistre-le en .xlsx ou en CSV, ou colle le texte.",
                      );
                    }
                  } else setText(await f.text());
                }}
              />
              <Button variant="secondary" onClick={() => input.current?.click()}>
                <FileUp aria-hidden className="size-4" />
                {fileName || "Choisir un fichier"}
              </Button>
              <p className="text-ink-muted text-sm">
                <a
                  href="/calendrier/modele"
                  className="text-accent-strong font-semibold underline underline-offset-4"
                >
                  Télécharger le modèle
                </a>{" "}
                (modèle CSV). Fichier Excel (.xlsx) : la première feuille est lue.
              </p>
            </div>
          )}

          <div className="mt-4 space-y-1.5">
            <label htmlFor="week-start" className="text-sm font-medium">
              Semaine de départ{" "}
              <span className="text-ink-muted font-normal">
                (seulement si ton tableau a « lundi, mardi… » sans dates)
              </span>
            </label>
            <input
              id="week-start"
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              className={cn(
                "border-line-strong bg-surface min-h-12 w-full rounded-xl border px-3 text-base sm:w-60",
                needsWeek && "border-danger",
              )}
            />
          </div>

          {pending && !report && text.trim() !== "" && (
            <p className="text-ink-muted mt-4 text-sm" role="status">
              Lecture du tableau…
            </p>
          )}

          {analysis && !done && (
            <details className="border-line bg-surface mt-4 rounded-xl border p-3" open={!valid}>
              <summary className="min-h-10 cursor-pointer text-sm font-semibold">
                Colonnes reconnues {analysis.hasHeader ? "(d'après tes titres)" : "(devinées)"}
              </summary>
              <div className="mt-2 space-y-2">
                {analysis.headers.map((h, i) => (
                  <label key={i} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="w-full truncate font-medium sm:w-44">
                      {h}
                      <span className="text-ink-muted block truncate text-xs font-normal">
                        {analysis.sample[0]?.[i] || "—"}
                      </span>
                    </span>
                    <select
                      value={analysis.mapping[i] ?? ""}
                      onChange={(e) => {
                        const next = [...analysis.mapping];
                        next[i] = (e.target.value || null) as FieldKey | null;
                        setMapping(next);
                      }}
                      className="border-line-strong bg-canvas min-h-12 flex-1 rounded-xl border px-3 text-base"
                    >
                      <option value="">Ignorer cette colonne</option>
                      {FIELD_KEYS.map((k) => (
                        <option key={k} value={k}>
                          {FIELD_LABEL[k]}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </details>
          )}

          {done && (
            <p
              role="status"
              className="bg-t-impact-bg text-t-impact-fg mt-4 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium"
            >
              <CheckCircle2 aria-hidden className="size-4" />
              {report!.inserted} post{report!.inserted > 1 ? "s" : ""} importé
              {report!.inserted > 1 ? "s" : ""} dans le calendrier.
            </p>
          )}

          {report && !done && (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium">
                {valid} post{valid > 1 ? "s" : ""} reconnu{valid > 1 ? "s" : ""}
                {invalid > 0 && (
                  <>
                    {" "}
                    · <span className="text-danger">{invalid} ligne(s) à corriger</span>
                  </>
                )}
              </p>

              {valid > 0 && (
                <ul
                  aria-label="Aperçu des posts reconnus"
                  className="border-line bg-surface max-h-56 divide-y overflow-y-auto rounded-xl border text-sm"
                >
                  {report.rows
                    .filter((r) => r.post)
                    .slice(0, 60)
                    .map((r) => (
                      <li key={r.line} className="flex flex-wrap items-baseline gap-x-2 px-3 py-2">
                        <strong className="whitespace-nowrap">{formatDayLong(r.post!.date)}</strong>
                        <span className="text-ink-muted">
                          {CONTENT_TYPE_META[r.post!.type].label} ·{" "}
                          {CHANNEL_LABEL[r.post!.canal_principal]}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{r.post!.idee || "—"}</span>
                      </li>
                    ))}
                </ul>
              )}

              {report.rows.some((r) => r.errors.length > 0 || r.warnings.length > 0) && (
                <ul className="border-line bg-surface max-h-48 space-y-2 overflow-y-auto rounded-xl border p-3 text-sm">
                  {report.rows
                    .filter((r) => r.errors.length > 0 || r.warnings.length > 0)
                    .slice(0, 40)
                    .map((r) => (
                      <li key={r.line} className="flex gap-2">
                        <TriangleAlert
                          aria-hidden
                          className={
                            r.errors.length
                              ? "text-danger mt-0.5 size-4 shrink-0"
                              : "text-ink-muted mt-0.5 size-4 shrink-0"
                          }
                        />
                        <span>
                          <strong>Ligne {r.line}</strong> — {[...r.errors, ...r.warnings].join(" ")}
                        </span>
                      </li>
                    ))}
                </ul>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  className="min-h-12"
                  disabled={valid === 0}
                  loading={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await importPosts(text, false, {
                        mapping,
                        weekStart: weekStart || null,
                      });
                      if (res.ok && res.data) {
                        setReport(res.data);
                        router.refresh();
                      } else if (!res.ok) setError(res.error);
                    })
                  }
                >
                  Importer {valid} post{valid > 1 ? "s" : ""}
                </Button>
                <Button variant="ghost" className="min-h-12" onClick={reset}>
                  Tout effacer
                </Button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
