import { useQuery } from "@tanstack/react-query";
import { STATUS_LABELS, STATUSES, type SeriesCard, type Status } from "@snug/shared";
import { Library } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { libraryQuery } from "../queries";
import { airing, shortDay } from "../components/airing";
import { StatusMenu } from "../components/series-actions";
import { PosterGridSkeleton } from "../components/skeletons";
import { Chips, cx, Empty, PageTitle, Poster, POSTER_GRID, ProgressBar } from "../components/ui";

export function LibraryPage() {
  const { data, isPending } = useQuery(libraryQuery);
  const [status, setStatus] = useState<Status>("watching");
  const [filter, setFilter] = useState("");

  if (isPending) {
    return (
      <>
        <PageTitle>Library</PageTitle>
        <PosterGridSkeleton />
      </>
    );
  }
  const all = data ?? [];
  const shown = all.filter((c) => c.status === status && c.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <>
      <PageTitle>Library</PageTitle>
      <Chips
        label="Status"
        value={status}
        onChange={(s) => setStatus(s as Status)}
        options={STATUSES.map((s) => ({
          value: s,
          label: (
            <>
              {STATUS_LABELS[s]} <span className="opacity-60">{all.filter((c) => c.status === s).length}</span>
            </>
          ),
        }))}
        className="-mx-4 mb-4 gap-2 px-4 pb-1 md:mx-0 md:px-0"
      />
      {/* 16px on phones: iOS zooms into any field with smaller text when it gets focus, and stays zoomed. */}
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter…"
        className="mb-6 w-full rounded-2xl border border-line bg-surface px-4 py-2.5 text-base placeholder:text-muted/60 md:text-sm focus:border-accent focus:outline-none"
      />
      {shown.length ? (
        <div className={POSTER_GRID}>
          {shown.map((c) => (
            <div key={c.seriesId} className="relative">
              <Link href={`/series/${c.seriesId}`} className="group block space-y-1.5">
                <div className="relative transition group-hover:-translate-y-0.5">
                  <Poster path={c.posterPath} name={c.name} className="w-full" />
                  {c.status === "watching" && c.loaded && <AiringBadge card={c} />}
                </div>
                <p className="truncate text-xs font-semibold sm:text-sm">{c.name}</p>
                {c.airedCount > 0 && <ProgressBar value={c.watchedCount} max={c.airedCount} />}
              </Link>
              {/* Change status without opening the series */}
              <div className="absolute top-1 right-1 rounded-full bg-bg/80">
                <StatusMenu seriesId={c.seriesId} status={c.status} small />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty icon={<Library className="size-10" />} title={`No ${STATUS_LABELS[status].toLowerCase()} series`} />
      )}
    </>
  );
}

/**
 * Watching mixes Series with Episodes to catch up on and ones waiting for the next Episode (dated or not);
 * the badge tells them apart at a glance: "3 left", "Thu", "TBA".
 */
function AiringBadge({ card }: { card: SeriesCard }) {
  const state = airing(card);
  const label = state.kind === "ready" ? `${state.left} left` : state.kind === "dated" ? shortDay(state.date) : "TBA";
  const title =
    state.kind === "ready"
      ? `${state.left} episode${state.left === 1 ? "" : "s"} to watch`
      : state.kind === "dated"
        ? `Next episode on ${state.date}`
        : "Caught up, next episode not dated yet";
  return (
    <span
      title={title}
      className={cx(
        "absolute bottom-1.5 left-1.5 max-w-[calc(100%-0.75rem)] truncate rounded-full px-1.5 py-0.5 text-[10px] leading-tight font-bold shadow-md shadow-black/40 sm:text-[11px]",
        state.kind === "ready" ? "bg-accent text-accent-ink" : "bg-bg/90",
        state.kind === "dated" && "text-accent",
        state.kind === "tba" && "text-muted",
      )}
    >
      {label}
    </span>
  );
}
