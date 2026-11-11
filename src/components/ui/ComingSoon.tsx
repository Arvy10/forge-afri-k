import { db } from "@/server/db";
import { requireSession } from "@/server/session";
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
  const auth = await requireSession();
  const { data } = auth.memberId
    ? await db()
        .from("pc_feature_interests")
        .select("feature")
        .eq("member_id", auth.memberId)
        .eq("feature", feature)
        .maybeSingle()
    : { data: null };

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
