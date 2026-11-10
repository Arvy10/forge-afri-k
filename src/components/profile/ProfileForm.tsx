"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera } from "lucide-react";
import type { z } from "zod";
import { finishOnboarding, saveProfile } from "@/actions/auth";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { FormError, TextArea, TextField } from "@/components/ui/Field";
import type { RoleRow } from "@/lib/database.types";
import { profileSchema } from "@/lib/schemas";

type Input = z.input<typeof profileSchema>;
type Output = z.output<typeof profileSchema>;

type Props = {
  mode: "onboarding" | "edit";
  userId: string;
  email: string;
  roles: RoleRow[];
  avatarUrl: string | null;
  defaults: Input;
};

export function ProfileForm({ mode, userId, email, roles, avatarUrl, defaults }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    setError: setFieldError,
    formState: { errors },
  } = useForm<Input, unknown, Output>({
    resolver: zodResolver(profileSchema),
    defaultValues: defaults,
  });
  const name = useWatch({ control, name: "full_name" }) || email;

  const onSubmit = handleSubmit((values) => {
    setError(null);
    setSaved(false);
    const fd = new FormData();
    fd.set("values", JSON.stringify(values));
    if (file) fd.set("avatar", file);
    if (removePhoto) fd.set("remove_avatar", "1");
    start(async () => {
      const res = await (mode === "onboarding" ? finishOnboarding(fd) : saveProfile(fd));
      if (res && !res.ok) {
        setError(res.error);
        for (const [k, msg] of Object.entries(res.fieldErrors ?? {}))
          setFieldError(k as keyof Input, { message: msg });
        return;
      }
      if (mode === "edit") {
        setSaved(true);
        router.refresh();
      }
    });
  });

  const shownPhoto = preview ?? (removePhoto ? null : avatarUrl);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {mode === "onboarding" && (
        <div>
          <h1 className="font-display text-2xl font-bold">Ton profil</h1>
          <p className="text-ink-muted mt-1 text-sm">
            Dis-nous qui tu es. Tu pourras tout modifier plus tard.
          </p>
        </div>
      )}
      <FormError message={error} />
      {saved && (
        <p
          role="status"
          className="bg-t-impact-bg text-t-impact-fg rounded-lg px-3 py-2.5 text-sm font-medium"
        >
          Profil enregistré.
        </p>
      )}

      <div className="flex items-center gap-4">
        <Avatar name={name} src={shownPhoto} id={userId} size="xl" />
        <div className="space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-label="Choisir une photo"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              setRemovePhoto(false);
              setPreview(f ? URL.createObjectURL(f) : null);
            }}
          />
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <Camera aria-hidden className="size-4" />
            {shownPhoto ? "Changer la photo" : "Ajouter une photo"}
          </Button>
          {shownPhoto && (
            <Button
              variant="ghost"
              onClick={() => {
                setFile(null);
                setPreview(null);
                setRemovePhoto(true);
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              Retirer
            </Button>
          )}
          <p className="text-ink-muted text-xs">JPG, PNG ou WebP · 3 Mo maximum</p>
        </div>
      </div>

      <TextField
        label="Nom complet"
        required
        autoComplete="name"
        error={errors.full_name?.message}
        {...register("full_name")}
      />
      <TextField
        label="E-mail"
        value={email}
        readOnly
        disabled
        hint="L'adresse de connexion ne se change pas ici."
      />
      <TextField
        label="WhatsApp"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+242 …"
        hint="Visible uniquement par les membres du pôle."
        error={errors.whatsapp?.message}
        {...register("whatsapp")}
      />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Ton ou tes rôles dans le pôle</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {roles.map((r) => (
            <label
              key={r.id}
              className="border-line-strong bg-surface hover:bg-surface-2 has-[:checked]:border-accent-strong has-[:checked]:bg-accent-soft flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3"
            >
              <input
                type="checkbox"
                value={r.id}
                className="accent-accent-strong mt-0.5 size-5"
                {...register("role_ids")}
              />
              <span>
                <span className="block text-sm font-semibold">{r.name}</span>
                <span className="text-ink-muted block text-xs">{r.mission}</span>
              </span>
            </label>
          ))}
        </div>
        {errors.role_ids && (
          <p role="alert" className="text-danger text-xs">
            {errors.role_ids.message}
          </p>
        )}
      </fieldset>

      <TextArea label="Courte bio" rows={3} error={errors.bio?.message} {...register("bio")} />
      <TextArea
        label="Ta mission"
        rows={2}
        hint="Ce pour quoi on compte sur toi."
        error={errors.mission?.message}
        {...register("mission")}
      />
      <TextArea
        label="Ce que tu fais"
        rows={3}
        error={errors.does?.message}
        {...register("does")}
      />
      <TextArea
        label="Ce que tu ne fais pas"
        rows={3}
        hint="Pour que chacun sache vers qui se tourner."
        error={errors.does_not?.message}
        {...register("does_not")}
      />

      <Button type="submit" loading={pending} className="w-full sm:w-auto">
        {mode === "onboarding" ? "Entrer dans l'atelier" : "Enregistrer"}
      </Button>
    </form>
  );
}
