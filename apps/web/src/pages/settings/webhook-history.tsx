import type { JellyfinEventLog } from "@snug/shared";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { Chips, cx, Skeleton } from "../../components/ui";
import { useT } from "../../i18n";
import { ago } from "../../lib/format";

const OUTCOMES = ["all", "watched", "ignored", "error"] as const;
const DOT = { watched: "bg-sage", ignored: "bg-muted/50", error: "bg-rose" };

/** Every call Jellyfin made to the webhook, newest first, with what Snug did and the raw payload. */
export function WebhookHistory({ events }: { events: JellyfinEventLog[] | undefined }) {
  const t = useT();
  const [filter, setFilter] = useState<(typeof OUTCOMES)[number]>("all");
  const [all, setAll] = useState(false);
  const matching = events?.filter((e) => filter === "all" || e.outcome === filter) ?? [];
  const shown = all ? matching : matching.slice(0, 5);

  return (
    <div className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-sans text-sm font-bold text-muted">{t.integrations.jellyfin.history}</h3>
        <Chips
          label={t.integrations.jellyfin.historyFilter}
          small
          value={filter}
          onChange={setFilter}
          options={OUTCOMES.map((o) => ({ value: o, label: t.integrations.jellyfin.outcomes[o] }))}
          className="-mx-1 px-1"
        />
      </div>
      {!events ? (
        <Skeleton className="h-24 w-full" />
      ) : shown.length ? (
        <ul className="max-h-96 space-y-1 overflow-y-auto text-sm">
          {shown.map((e, i) => (
            <EventRow key={`${e.receivedAt}-${i}`} event={e} />
          ))}
          {!all && matching.length > shown.length && (
            <li>
              <button onClick={() => setAll(true)} className="w-full rounded-xl py-2 text-sm font-bold text-accent">
                {t.integrations.jellyfin.showMore(matching.length - shown.length)}
              </button>
            </li>
          )}
        </ul>
      ) : (
        <p className="rounded-xl bg-raised/40 px-4 py-6 text-center text-sm text-muted">
          {events.length ? t.integrations.jellyfin.noMatch : t.integrations.jellyfin.noCalls}
        </p>
      )}
    </div>
  );
}

function EventRow({ event: e }: { event: JellyfinEventLog }) {
  const t = useT();
  return (
    <li className="rounded-xl px-3 py-2 odd:bg-raised/40">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-start gap-3">
          <span className={cx("mt-1.5 size-2 shrink-0 rounded-full", DOT[e.outcome])} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">
              {e.seriesId ? (
                <Link href={`/series/${e.seriesId}`} className="hover:text-accent">
                  {e.summary}
                </Link>
              ) : (
                e.summary
              )}
            </p>
            <p className="text-xs text-muted">
              {ago(t, e.receivedAt)} · {e.message}
            </p>
          </div>
          {e.payload && <ChevronDown className="mt-1 size-4 shrink-0 text-muted transition group-open:rotate-180" />}
        </summary>
        {e.payload && (
          <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-bg p-3 text-[11px] leading-relaxed text-muted">
            {e.payload}
          </pre>
        )}
      </details>
    </li>
  );
}
