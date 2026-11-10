import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SetPasswordForm } from "@/components/auth/SetPasswordForm";
import { getAuth } from "@/lib/auth";

export const metadata: Metadata = { title: "Définir le mot de passe" };

export default async function Page() {
  const { user, profile } = await getAuth();
  if (!user) redirect("/connexion?erreur=lien");
  return <SetPasswordForm firstTime={!profile?.onboarded} />;
}
