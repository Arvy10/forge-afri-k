"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { AttachmentsPanel } from "@/components/shared/AttachmentsPanel";
import { LinkedTasks } from "./LinkedTasks";
import { CommentsPanel } from "./CommentsPanel";
import { PostForm } from "./PostForm";
import { PostHistory } from "./PostHistory";
import { StatusPill } from "@/components/ui/StatusPill";
import { TypePill } from "@/components/ui/TypePill";
import type { PersonLite } from "@/lib/data";
import type { PostDetail } from "@/lib/posts-data";
import type { PostInput } from "@/lib/schemas";

type Props = {
  mode: "new" | "edit";
  defaults: PostInput;
  detail?: PostDetail;
  people: PersonLite[];
  me: { id: string; isAdmin: boolean };
  closeHref: string;
};

/** Fiche d'un post : panneau latéral sur ordinateur, plein écran sur mobile. */
export function PostSheet({ mode, defaults, detail, people, me, closeHref }: Props) {
  const router = useRouter();
  const post = detail?.post;
  const canEdit = mode === "new" || me.isAdmin || post?.responsable_id === me.id;

  return (
    <Dialog.Root open onOpenChange={(open) => !open && router.push(closeHref, { scroll: false })}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/45" />
        <Dialog.Content
          aria-describedby={undefined}
          className="bg-canvas md:border-line fixed inset-0 z-50 flex flex-col overflow-hidden md:left-auto md:w-[38rem] md:max-w-[90vw] md:border-l md:shadow-2xl"
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
              className="hover:bg-surface-2 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-lg"
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
              <div className="space-y-8 pb-10">
                <LinkedTasks postId={post.id} tasks={detail.tasks} people={people} />
                <AttachmentsPanel
                  parent={{ post_id: post.id }}
                  items={detail.attachments}
                  canUpload={canEdit}
                  me={me}
                />
                <CommentsPanel
                  postId={post.id}
                  comments={detail.comments}
                  people={people}
                  me={me}
                />
                <PostHistory history={detail.history} people={people} />
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
