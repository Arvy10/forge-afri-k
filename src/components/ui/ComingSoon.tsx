import { requireMember } from "@/lib/auth";
import { EmptyState } from "./EmptyState";
import type { IllustrationKind } from "./Illustration";
import { NotifyButton } from "./NotifyButton";
import { PageHeader } from "./PageHeader";

type Feature = "bibliotheque" | "reunions" | "resultats";

export async function ComingSoon({
  feature,
  title,
  sentence,
  illustration,
  emptyTitle,
  emptyDescription,
}: {
  feature: Feature;
  title: string;
  sentence: string;
  illustration: IllustrationKind;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const { supabase, user } = await requireMember();
  const { data } = await supabase
    .from("feature_interests")
    .select("feature")
    .eq("profile_id", user.id)
    .eq("feature", feature)
    .maybeSingle();

  return (
    <>
      <PageHeader
        title={title}
        description={sentence}
        badge={
          <span className="bg-accent-soft text-accent-strong rounded-full px-3 py-1 font-sans text-xs font-semibold">
            Bientôt
          </span>
        }
      />
      <EmptyState
        illustration={illustration}
        title={emptyTitle}
        description={emptyDescription}
        action={<NotifyButton feature={feature} initial={!!data} />}
      />
    </>
  );
}
