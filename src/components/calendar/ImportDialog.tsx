"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { CheckCircle2, FileUp, TriangleAlert, X } from "lucide-react";
import { importPosts } from "@/actions/posts";
import { Button, buttonClass } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import type { ImportReport } from "@/lib/post-csv";

type Report = ImportReport & { inserted: number };

export function ImportDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  const reset = () => {
    setCsv(null);
    setFileName("");
    setReport(null);
    setError(null);
    if (input.current) input.current.value = "";
  };

  const valid = report?.rows.filter((r) => r.post).length ?? 0;
  const invalid = (report?.rows.length ?? 0) - valid;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <Dialog.Trigger className={buttonClass("secondary")}>
        <FileUp aria-hidden className="size-4" />
        Importer un CSV
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="rx-overlay fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content
          aria-describedby="import-desc"
          className="rx-dialog bg-canvas fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-2xl p-5 shadow-2xl md:inset-auto md:top-1/2 md:left-1/2 md:w-[40rem] md:max-w-[92vw] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <Dialog.Title className="font-display text-xl font-bold">
              Importer un calendrier (CSV)
            </Dialog.Title>
            <Dialog.Close
              className="hover:bg-surface-2 -mt-1 -mr-2 inline-flex size-11 items-center justify-center rounded-lg"
              aria-label="Fermer"
            >
              <X aria-hidden className="size-5" />
            </Dialog.Close>
          </div>
          <p id="import-desc" className="text-ink-muted mb-4 text-sm">
            Dans Excel : <strong>Fichier → Enregistrer sous → CSV</strong>. La première ligne doit
            contenir les titres de colonnes (au minimum « Date »). Les numéros sont attribués
            automatiquement. Une vérification précède tout import : rien n&apos;est ajouté sans ta
            confirmation.
          </p>

          <FormError message={error} />

          <input
            ref={input}
            type="file"
            accept=".csv,text/csv,text/plain"
            className="sr-only"
            aria-label="Choisir un fichier CSV"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setError(null);
              setReport(null);
              setFileName(f.name);
              const text = await f.text();
              setCsv(text);
              start(async () => {
                const res = await importPosts(text, true);
                if (res.ok && res.data) setReport(res.data);
                else if (!res.ok) setError(res.error);
              });
            }}
          />
          <Button
            variant="secondary"
            onClick={() => input.current?.click()}
            loading={pending && !report}
          >
            <FileUp aria-hidden className="size-4" />
            {fileName || "Choisir un fichier"}
          </Button>

          {report && report.inserted > 0 && (
            <p
              role="status"
              className="bg-t-impact-bg text-t-impact-fg mt-4 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium"
            >
              <CheckCircle2 aria-hidden className="size-4" />
              {report.inserted} post{report.inserted > 1 ? "s" : ""} importé
              {report.inserted > 1 ? "s" : ""}.
            </p>
          )}

          {report && report.inserted === 0 && (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium">
                {valid} ligne{valid > 1 ? "s" : ""} prête{valid > 1 ? "s" : ""} à importer
                {invalid > 0 && (
                  <>
                    {" "}
                    · <span className="text-danger">{invalid} à corriger</span>
                  </>
                )}
              </p>
              {report.rows.some((r) => r.errors.length > 0 || r.warnings.length > 0) && (
                <ul className="border-line bg-surface max-h-60 space-y-2 overflow-y-auto rounded-xl border p-3 text-sm">
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
                  disabled={valid === 0}
                  loading={pending}
                  onClick={() =>
                    start(async () => {
                      if (!csv) return;
                      const res = await importPosts(csv, false);
                      if (res.ok && res.data) {
                        setReport(res.data);
                        router.refresh();
                      } else if (!res.ok) setError(res.error);
                    })
                  }
                >
                  Importer {valid} post{valid > 1 ? "s" : ""}
                </Button>
                <Button variant="ghost" onClick={reset}>
                  Choisir un autre fichier
                </Button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
