"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { AttachmentsPanel } from "@/components/shared/AttachmentsPanel";
import type { PersonLite } from "@/lib/data";
import type { TaskRow } from "@/lib/database.types";
import type { AttachmentView } from "@/lib/posts-data";
import type { TaskInput } from "@/lib/schemas";
import { TaskForm } from "./TaskForm";
import type { PostLabel } from "./TasksView";

export function TaskSheet({
  mode,
  task,
  defaults,
  attachments,
  people,
  posts,
  me,
  closeHref,
}: {
  mode: "new" | "edit";
  task?: TaskRow;
  defaults: TaskInput;
  attachments: AttachmentView[];
  people: PersonLite[];
  posts: PostLabel[];
  me: { id: string; isAdmin: boolean };
  closeHref: string;
}) {
  const router = useRouter();
  const canEdit = mode === "new" || me.isAdmin || task?.responsable_id === me.id;
  const canDelete = me.isAdmin || (task?.created_by === me.id && task?.responsable_id === me.id);
  return (
    <Dialog.Root open onOpenChange={(o) => !o && router.push(closeHref, { scroll: false })}>
      <Dialog.Portal>
        <Dialog.Overlay className="rx-overlay fixed inset-0 z-40 bg-black/45" />
        <Dialog.Content
          aria-describedby={undefined}
          className="rx-sheet bg-canvas md:border-line fixed inset-0 z-50 flex flex-col overflow-hidden md:left-auto md:w-[34rem] md:max-w-[90vw] md:border-l md:shadow-2xl"
        >
          <header className="border-line flex items-center justify-between gap-3 border-b px-4 py-3 md:px-6">
            <Dialog.Title className="font-display text-xl font-bold">
              {mode === "new" ? "Nouvelle tâche" : "Tâche"}
            </Dialog.Title>
            <Dialog.Close
              className="hover:bg-surface-2 -mr-2 inline-flex size-11 items-center justify-center rounded-lg"
              aria-label="Fermer"
            >
              <X aria-hidden className="size-5" />
            </Dialog.Close>
          </header>
          <div className="flex-1 space-y-8 overflow-y-auto px-4 pt-4 md:px-6">
            <TaskForm
              key={task?.updated_at ?? "new"}
              mode={mode}
              taskId={task?.id}
              defaults={defaults}
              people={people}
              posts={posts}
              me={me}
              canEdit={canEdit}
              canDelete={canDelete}
              closeHref={closeHref}
            />
            {task && (
              <div className="pb-10">
                <AttachmentsPanel
                  parent={{ task_id: task.id }}
                  items={attachments}
                  canUpload={canEdit}
                  me={me}
                />
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
