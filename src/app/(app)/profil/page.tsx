import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { requireMember } from "@/lib/auth";
import { getRoles, getTeam } from "@/lib/data";

export const metadata: Metadata = { title: "Mon profil" };

export default async function Page() {
  const { profile } = await requireMember();
  const [roles, team] = await Promise.all([getRoles(), getTeam()]);
  const me = team.find((m) => m.id === profile.id);
  return (
    <div className="max-w-2xl">
      <PageHeader title="Mon profil" description="Ce que les autres membres voient de toi." />
      <ProfileForm
        mode="edit"
        userId={profile.id}
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
    </div>
  );
}
