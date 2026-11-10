"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { saveGuideSection } from "@/actions/content";
import { Button } from "@/components/ui/Button";
import { FormError, TextArea, TextField } from "@/components/ui/Field";

/** Éditeur simple (texte + Markdown léger) : visible uniquement par l'administrateur. */
export function GuideEditor({
  id,
  titre,
  contenu,
}: {
  id: string;
  titre: string;
  contenu: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [t, setT] = useState(titre);
  const [c, setC] = useState(contenu);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  if (!open)
    return (
      <Button
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label={`Modifier la section ${titre}`}
      >
        <Pencil aria-hidden className="size-4" />
        Modifier
      </Button>
    );

  return (
    <form
      className="border-line-strong bg-canvas w-full space-y-3 rounded-xl border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await saveGuideSection({ id, titre: t, contenu: c });
          if (res.ok) {
            setOpen(false);
            router.refresh();
          } else {
            setError(res.error);
            setFields(res.fieldErrors ?? {});
          }
        });
      }}
    >
      <FormError message={error} />
      <TextField
        label="Titre"
        value={t}
        onChange={(e) => setT(e.target.value)}
        error={fields.titre}
      />
      <TextArea
        label="Texte"
        rows={10}
        value={c}
        onChange={(e) => setC(e.target.value)}
        error={fields.contenu}
        hint="Une ligne commençant par « - » fait une puce ; **gras** pour insister ; « 1. » pour une liste numérotée."
        className="font-mono text-sm"
      />
      <div className="flex gap-2">
        <Button type="submit" loading={pending}>
          Enregistrer
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setT(titre);
            setC(contenu);
          }}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}
