import { useMutation, useQuery } from "@tanstack/react-query";
import { episodeCode, STATUS_LABELS, STATUSES, type SeriesDetail } from "@snug/shared";
import { ArrowLeft, Check, ChevronDown, Plus } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { api, image, queryClient } from "../api";
import { useSetStatus } from "../components/series-actions";
import { Confirm } from "../components/confirm";
import { useToast } from "../components/toast";
import { SeriesSkeleton } from "../components/skeletons";
import { Button, cx, ErrorText, Poster, ProgressBar } from "../components/ui";

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

      <button onClick={() => history.back()} aria-label="Back" className="rounded-full bg-bg/60 p-2 backdrop-blur">
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
                    s === data.status ? "bg-accent text-accent-ink" : "bg-raised/80 text-muted backdrop-blur hover:text-text",
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
          {data.overview && <p className="leading-relaxed text-muted">{data.overview}</p>}
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {data.seasons.map((season) => (
          <Season key={season.number} seriesId={data.seriesId} season={season} />
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

function Season({ seriesId, season }: { seriesId: number; season: SeriesDetail["seasons"][number] }) {
  const watched = season.episodes.filter((e) => e.watched).length;
  const aired = season.episodes.filter((e) => e.aired).length;
  const [open, setOpen] = useState(watched > 0 && watched < aired);
  const refresh = () => queryClient.invalidateQueries();

  const toggle = useMutation({
    mutationFn: (e: { number: number; watched: boolean }) =>
      api(`/series/${seriesId}/episodes/${season.number}/${e.number}`, { method: e.watched ? "DELETE" : "PUT" }),
    onSuccess: refresh,
  });
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
                  <p className={cx("truncate text-sm font-semibold", !e.aired && "text-muted")}>{e.name}</p>
                  <p className="text-xs text-muted">
                    {e.airDate ? new Date(e.airDate).toLocaleDateString(undefined, { dateStyle: "medium" }) : "TBA"}
                  </p>
                </div>
                <button
                  aria-label={e.watched ? "Mark as unwatched" : "Mark as watched"}
                  disabled={!e.aired && !e.watched}
                  onClick={() => toggle.mutate(e)}
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
    </section>
  );
}
