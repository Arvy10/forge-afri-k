import { History } from "lucide-react";
import { POST_STATUS_LABEL } from "@/lib/constants";
import type { PersonLite } from "@/lib/data";
import type { PostStatusHistoryRow } from "@/lib/database.types";
import { formatDateTime } from "@/lib/dates";
import { StatusPill } from "@/components/ui/StatusPill";

export function PostHistory({
  history,
  people,
}: {
  history: PostStatusHistoryRow[];
  people: PersonLite[];
}) {
  const byId = new Map(people.map((p) => [p.id, p.name]));
  return (
    <section aria-labelledby="hist" className="space-y-3">
      <h3 id="hist" className="font-display flex items-center gap-2 text-base font-bold">
        <History aria-hidden className="size-4" />
        Historique des statuts
      </h3>
      {history.length === 0 ? (
        <p className="text-ink-muted text-sm">Aucun changement enregistré.</p>
      ) : (
        <ol className="border-line ml-2 space-y-3 border-l pl-4">
          {history.map((h) => (
            <li key={h.id} className="text-sm">
              <div className="flex flex-wrap items-center gap-1.5">
                {h.from_status ? (
                  <>
                    <StatusPill status={h.from_status} />
                    <span aria-label="devient" className="text-ink-muted">
                      →
                    </span>
                  </>
                ) : (
                  <span className="text-ink-muted">Créé en</span>
                )}
                <StatusPill status={h.to_status} />
              </div>
              <p className="text-ink-muted mt-0.5 text-xs">
                {formatDateTime(h.changed_at)}
                {h.changed_by && byId.get(h.changed_by) ? ` · ${byId.get(h.changed_by)}` : ""}
                <span className="sr-only"> — {POST_STATUS_LABEL[h.to_status]}</span>
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
