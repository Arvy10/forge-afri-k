import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { getAuth } from "@/lib/auth";
import { getRoles, getTeam } from "@/lib/data";

export const metadata: Metadata = { title: "Compléter mon profil" };

export default async function Page() {
  const { user, profile } = await getAuth();
  if (!user) redirect("/connexion");
  if (!profile || !profile.active) redirect("/connexion?erreur=desactive");
  if (profile.onboarded) redirect("/");
  const [roles, team] = await Promise.all([getRoles(), getTeam()]);
  const me = team.find((m) => m.id === user.id);
  return (
    <ProfileForm
      mode="onboarding"
      userId={user.id}
      email={profile.email}
      roles={roles}
      avatarUrl={me?.avatar_url ?? null}
      defaults={{
        full_name: profile.full_name,
        bio: profile.bio,
        mission: profile.mission,
        does: profile.does,
        does_not: profile.does_not,
        whatsapp: profile.whatsapp,
        role_ids: me?.role_ids ?? [],
      }}
    />
  );
}
