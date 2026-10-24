import { useMutation, useQuery } from "@tanstack/react-query";
import {
  episodeCode,
  type Saving,
  SAVING_TARGETS,
  type SavingTarget,
  STATUS_LABELS,
  STATUSES,
  type SeriesDetail,
} from "@snug/shared";
import { ArrowLeft, Check, ChevronDown, Plus } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { api, image, queryClient } from "../api";
import { useSetStatus } from "../components/series-actions";
import { CatchUp } from "../components/catch-up";
import { Confirm } from "../components/confirm";
import { EpisodeTitle } from "../components/spoilers";
import { useToast } from "../components/toast";
import { SeriesSkeleton } from "../components/skeletons";
import { Button, Chips, cx, ErrorText, Poster, ProgressBar } from "../components/ui";

export function SeriesPage({ id }: { id: string }) {
  const { data, isPending, error } = useQuery({ queryKey: ["series", id], queryFn: () => api<SeriesDetail>(`/series/${id}`) });
  const setStatus = useSetStatus();
  const [, navigate] = useLocation();
  const toast = useToast();
  const remove = useMutation({
    mutationFn: () => api(`/series/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast({ message: "Removed from your library" });
    },
  });

  if (isPending) return <SeriesSkeleton />;
  if (!data) return <ErrorText error={error} />;
  const backdrop = image(data.backdropPath, "w1280");

  return (
    <article className="relative">
      {/* Full-bleed backdrop, faded into the page on every side. */}
      {backdrop && (
        <div
          aria-hidden
          className="backdrop-fade pointer-events-none absolute -top-6 left-1/2 -z-10 h-80 w-screen -translate-x-1/2 md:-top-10 md:h-[30rem]"
        >
          <img src={backdrop} alt="" className="h-full w-full object-cover object-[50%_25%] opacity-60" />
        </div>
      )}

      <button onClick={() => history.back()} aria-label="Back" className="rounded-full bg-bg/80 p-2">
        <ArrowLeft className="size-5" />
      </button>

      {/* Phones: poster + title, then actions and overview full width. Desktop: everything right of the poster. */}
      <div className="mt-20 grid grid-cols-[7rem_minmax(0,1fr)] gap-x-5 gap-y-6 md:mt-36 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-x-8">
        <Poster
          path={data.posterPath}
          name={data.name}
          className="w-full self-start md:row-span-2"
          sizes="(min-width: 768px) 160px, 112px"
          eager
        />
        <header className="flex flex-col justify-end gap-2 md:justify-start md:pt-6">
          <h1 className="text-3xl leading-tight font-semibold md:text-5xl">{data.name}</h1>
          <p className="text-sm text-muted">
            {data.year ?? "—"} · {data.ended ? "Ended" : "Airing"}
            {data.progress && ` · at ${episodeCode(data.progress)}`}
          </p>
          {data.airedCount > 0 && (
            <div className="max-w-xs">
              <ProgressBar value={data.watchedCount} max={data.airedCount} />
            </div>
          )}
        </header>

        <div className="col-span-2 space-y-5 md:col-span-1 md:col-start-2">
          <div className="flex flex-wrap gap-2">
            {data.tracked ? (
              STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus.mutate({ seriesId: data.seriesId, status: s })}
                  className={cx(
                    "rounded-full px-4 py-2 text-sm font-bold transition",
                    s === data.status ? "bg-accent text-accent-ink" : "bg-raised/90 text-muted hover:text-text",
                  )}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))
            ) : (
              <>
                <Button onClick={() => setStatus.mutate({ seriesId: data.seriesId, status: "watching" })}>
                  <Plus className="size-4" /> Start watching
                </Button>
                <Button variant="ghost" onClick={() => setStatus.mutate({ seriesId: data.seriesId, status: "watchlist" })}>
                  Add to watchlist
                </Button>
              </>
            )}
          </div>
          {data.tracked && data.status === "saving" && data.saving && (
            <SavingPanel seriesId={data.seriesId} saving={data.saving} />
          )}
          {data.overview && <p className="leading-relaxed text-muted">{data.overview}</p>}
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {data.seasons.map((season) => (
          <Season
            key={season.number}
            seriesId={data.seriesId}
            season={season}
            next={data.next}
            earlier={(n) => earlierUnwatched(data, season.number, n)}
          />
        ))}
      </div>

      {data.tracked && (
        <div className="mt-10">
          <Confirm
            title={`Remove ${data.name}?`}
            description="Its status and every episode you marked watched are deleted from Snug."
            confirm="Remove"
            onConfirm={() => remove.mutate(undefined, { onSuccess: () => navigate("/library") })}
          >
            <Button variant="danger">Remove from library</Button>
          </Confirm>
        </div>
      )}
    </article>
  );
}

/** Saving up: what to wait for, and where the saving stands. */
function SavingPanel({ seriesId, saving }: { seriesId: number; saving: Saving }) {
  const save = useMutation({
    mutationFn: (savingTarget: SavingTarget) =>
      api(`/series/${seriesId}`, { method: "PUT", body: { status: "saving", savingTarget } }),
    onSuccess: () => queryClient.invalidateQueries(),
  });
  const date = saving.completeOn
    ? new Date(`${saving.completeOn}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" })
    : null;
  return (
    <div className="space-y-3 rounded-3xl border border-line/60 bg-surface/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">Saving up until</span>
        <Chips
          label="Saving up until"
          small
          value={String(saving.target)}
          onChange={(target) => save.mutate(Number(target) as SavingTarget)}
          options={SAVING_TARGETS.map((t) => ({ value: String(t), label: t === 0 ? "Full season" : `${t} ep.` }))}
        />
      </div>
      <ProgressBar value={saving.out} max={saving.needed} />
      <p className="text-sm text-muted">
        {saving.reached
          ? `Ready to binge: ${saving.out} episodes.`
          : `${saving.out} of ${saving.needed} out${date ? `, the last one on ${date}` : ""}.`}
      </p>
    </div>
  );
}

/** Aired Episodes before SxxEyy, in any season, not watched yet. */
function earlierUnwatched(data: SeriesDetail, season: number, number: number) {
  return data.seasons
    .flatMap((s) => s.episodes.map((e) => ({ ...e, season: s.number })))
    .filter((e) => e.aired && !e.watched && (e.season < season || (e.season === season && e.number < number))).length;
}

function Season({
  seriesId,
  season,
  next,
  earlier,
}: {
  seriesId: number;
  season: SeriesDetail["seasons"][number];
  next: SeriesDetail["next"];
  earlier: (number: number) => number;
}) {
  const watched = season.episodes.filter((e) => e.watched).length;
  const aired = season.episodes.filter((e) => e.aired).length;
  const [open, setOpen] = useState(watched > 0 && watched < aired);
  const refresh = () => queryClient.invalidateQueries();

  const toggle = useMutation({
    mutationFn: (e: { number: number; watched: boolean }) =>
      api(`/series/${seriesId}/episodes/${season.number}/${e.number}`, { method: e.watched ? "DELETE" : "PUT" }),
    onSuccess: refresh,
  });
  const watchThrough = useMutation({
    mutationFn: (number: number) =>
      api(`/series/${seriesId}/episodes/${season.number}/${number}/through`, { method: "PUT" }),
    onSuccess: refresh,
  });
  // The Episode being marked while the catch-up question is open.
  const [asking, setAsking] = useState<{ number: number; earlier: number } | null>(null);
  const onToggle = (e: { number: number; watched: boolean }) => {
    const count = e.watched ? 0 : earlier(e.number);
    if (count > 0) setAsking({ number: e.number, earlier: count });
    else toggle.mutate(e);
  };
  const watchAll = useMutation({
    mutationFn: () => api(`/series/${seriesId}/seasons/${season.number}`, { method: "PUT" }),
    onSuccess: refresh,
  });

  return (
    <section className="overflow-hidden rounded-3xl border border-line/60 bg-surface">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-5 py-4 text-left">
        <h2 className="flex-1 text-lg">Season {season.number}</h2>
        <span className="text-sm font-bold text-muted">
          {watched}/{season.episodes.length}
        </span>
        <ChevronDown className={cx("size-5 text-muted transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t border-line/60">
          {watched < aired && (
            <button
              onClick={() => watchAll.mutate()}
              disabled={watchAll.isPending}
              className="w-full px-5 py-3 text-left text-sm font-bold text-accent hover:bg-raised"
            >
              Mark season watched
            </button>
          )}
          <ul>
            {season.episodes.map((e) => (
              <li key={e.number} className="flex items-center gap-4 px-5 py-3 odd:bg-raised/30">
                <span className="w-8 text-sm font-bold text-muted">{e.number}</span>
                <div className="min-w-0 flex-1">
                  <p className={cx("truncate text-sm font-semibold", !e.aired && "text-muted")}>
                    <EpisodeTitle
                      name={e.name}
                      watched={e.watched}
                      next={next?.season === season.number && next.number === e.number}
                    />
                  </p>
                  <p className="text-xs text-muted">
                    {e.airDate ? new Date(e.airDate).toLocaleDateString(undefined, { dateStyle: "medium" }) : "TBA"}
                  </p>
                </div>
                <button
                  aria-label={e.watched ? "Mark as unwatched" : "Mark as watched"}
                  disabled={!e.aired && !e.watched}
                  onClick={() => onToggle(e)}
                  className={cx(
                    "flex size-9 items-center justify-center rounded-full border-2 transition active:scale-90 disabled:opacity-30",
                    e.watched ? "border-accent bg-accent text-accent-ink" : "border-line text-transparent hover:border-accent",
                  )}
                >
                  <Check className="size-4" strokeWidth={3} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <CatchUp
        earlier={asking?.earlier ?? 0}
        onOnlyThis={() => asking && toggle.mutate({ number: asking.number, watched: false })}
        onAll={() => asking && watchThrough.mutate(asking.number)}
        onClose={() => setAsking(null)}
      />
    </section>
  );
}
