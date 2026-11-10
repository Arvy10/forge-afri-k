"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/actions/auth";
import { IconButton } from "@/components/ui/Button";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <IconButton label="Se déconnecter" type="submit">
        <LogOut aria-hidden className="size-5" />
      </IconButton>
    </form>
  );
}
