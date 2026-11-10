import type { Metadata } from "next";
import { ResetRequestForm } from "@/components/auth/ResetRequestForm";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function Page() {
  return <ResetRequestForm />;
}
