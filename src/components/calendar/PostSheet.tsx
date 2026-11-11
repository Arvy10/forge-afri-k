"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import { TypePill } from "@/components/ui/TypePill";
import type { MemberLite } from "@/lib/members";
import type { PostInput } from "@/lib/schemas";
import type { PostDetail } from "@/server/posts";
import { LinkedTasks } from "./LinkedTasks";
import { PostForm } from "./PostForm";

type Props = {
  mode: "new" | "edit";
  defaults: PostInput;
  detail?: PostDetail;
  people: MemberLite[];
  me: { id: string | null; isAdmin: boolean };
  closeHref: string;
  today: string;
  canAddTask: boolean;
};

/** Fiche d'un post : panneau latéral sur ordinateur, plein écran sur mobile. */
export function PostSheet({
  mode,
  defaults,
  detail,
  people,
  me,
  closeHref,
  today,
  canAddTask,
}: Props) {
  const router = useRouter();
  const post = detail?.post;
  const canEdit = mode === "new" || me.isAdmin || (!!me.id && post?.responsable_id === me.id);

  return (
    <Dialog.Root open onOpenChange={(open) => !open && router.push(closeHref, { scroll: false })}>
      <Dialog.Portal>
        <Dialog.Overlay className="rx-overlay fixed inset-0 z-40 bg-black/45" />
        <Dialog.Content
          aria-describedby={undefined}
          className="rx-sheet bg-canvas md:border-line fixed inset-0 z-50 flex flex-col overflow-hidden md:left-auto md:w-[38rem] md:max-w-[90vw] md:border-l md:shadow-2xl"
        >
          <header className="border-line flex items-start justify-between gap-3 border-b px-4 py-3 md:px-6">
            <div className="min-w-0 space-y-1.5">
              <Dialog.Title className="font-display text-xl font-bold">
                {mode === "new" ? "Nouveau post" : `Post n° ${post?.numero}`}
              </Dialog.Title>
              {post && (
                <div className="flex flex-wrap items-center gap-2">
                  <TypePill type={post.type} compact />
                  <StatusPill status={post.statut} />
                </div>
              )}
            </div>
            <Dialog.Close
              className="hover:bg-surface-2 -mr-2 inline-flex size-12 shrink-0 items-center justify-center rounded-lg"
              aria-label="Fermer la fiche"
            >
              <X aria-hidden className="size-5" />
            </Dialog.Close>
          </header>

          <div className="flex-1 space-y-8 overflow-y-auto px-4 pt-4 pb-0 md:px-6">
            <PostForm
              key={post?.updated_at ?? "new"}
              mode={mode}
              postId={post?.id}
              defaults={defaults}
              people={people}
              me={me}
              canEdit={canEdit}
              closeHref={closeHref}
            />
            {detail && post && (
              <div className="pb-10">
                <LinkedTasks
                  postId={post.id}
                  postLabel={`Post n° ${post.numero}${post.idee ? ` · ${post.idee.slice(0, 40)}` : ""}`}
                  tasks={detail.tasks}
                  members={people}
                  me={me}
                  today={today}
                  canAdd={canAddTask}
                />
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
