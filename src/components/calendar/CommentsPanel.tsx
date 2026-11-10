"use client";

import { useState, useTransition } from "react";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { addComment, deleteComment } from "@/actions/posts";
import { Avatar } from "@/components/ui/Avatar";
import { Button, IconButton } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import type { PersonLite } from "@/lib/data";
import type { CommentRow } from "@/lib/database.types";
import { formatRelative } from "@/lib/dates";

export function CommentsPanel({
  postId,
  comments,
  people,
  me,
}: {
  postId: string;
  comments: CommentRow[];
  people: PersonLite[];
  me: { id: string; isAdmin: boolean };
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const byId = new Map(people.map((p) => [p.id, p]));

  return (
    <section aria-labelledby="coms" className="space-y-3">
      <h3 id="coms" className="font-display flex items-center gap-2 text-base font-bold">
        <MessageSquare aria-hidden className="size-4" />
        Commentaires{" "}
        <span className="text-ink-muted font-sans text-sm font-normal">({comments.length})</span>
      </h3>
      {comments.length === 0 ? (
        <p className="text-ink-muted text-sm">
          Personne n&apos;a encore commenté. Lance la discussion.
        </p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => {
            const author = c.author_id ? byId.get(c.author_id) : undefined;
            return (
              <li key={c.id} className="flex gap-3">
                <Avatar
                  name={author?.name ?? "Ancien membre"}
                  src={author?.avatar_url}
                  id={author?.id}
                  size="sm"
                />
                <div className="bg-surface-2/60 min-w-0 flex-1 rounded-xl px-3 py-2">
                  <p className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="font-semibold">{author?.name ?? "Ancien membre"}</span>
                    <span className="text-ink-muted">{formatRelative(c.created_at)}</span>
                  </p>
                  <p className="mt-0.5 text-sm break-words whitespace-pre-wrap">{c.body}</p>
                </div>
                {(me.isAdmin || c.author_id === me.id) && (
                  <IconButton
                    label="Supprimer ce commentaire"
                    onClick={() =>
                      start(async () => {
                        const res = await deleteComment(c.id);
                        if (!res.ok) setError(res.error);
                      })
                    }
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </IconButton>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          start(async () => {
            const res = await addComment({ post_id: postId, body });
            if (res.ok) setBody("");
            else setError(res.fieldErrors?.body ?? res.error);
          });
        }}
      >
        <FormError message={error} />
        <label className="sr-only" htmlFor="new-comment">
          Ajouter un commentaire
        </label>
        <textarea
          id="new-comment"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Écrire un commentaire…"
          className="border-line-strong bg-surface block w-full rounded-lg border px-3 py-2.5 text-base md:text-sm"
        />
        <Button type="submit" variant="secondary" loading={pending} disabled={body.trim() === ""}>
          <Send aria-hidden className="size-4" />
          Envoyer
        </Button>
      </form>
    </section>
  );
}
