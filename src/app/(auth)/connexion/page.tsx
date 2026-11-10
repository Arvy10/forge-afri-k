import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Connexion" };

const NOTICES: Record<string, string> = {
  desactive: "Ton accès a été désactivé. Contacte l'ambassadeur du pôle.",
  lien: "Ce lien n'est plus valable. Demande-en un nouveau avec « Mot de passe oublié ».",
  reinit: "Mot de passe mis à jour. Tu peux te connecter.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ suite?: string; erreur?: string }>;
}) {
  const { suite, erreur } = await searchParams;
  return <LoginForm next={suite} notice={erreur ? NOTICES[erreur] : undefined} />;
}
