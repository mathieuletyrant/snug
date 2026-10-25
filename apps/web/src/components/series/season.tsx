import { useMutation } from "@tanstack/react-query";
import type { SeriesDetail } from "@snug/shared";
import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { api, queryClient } from "@/api";
import { earlierUnwatched } from "@/lib/episodes";
import { CatchUp } from "@/components/catch-up";
import { EpisodeTitle } from "@/components/spoilers";
import { useT } from "@/i18n";
import { longDate } from "@/components/airing";
import { cx } from "@/components/ui";

type SeasonData = SeriesDetail["seasons"][number];
type EpisodeData = SeasonData["episodes"][number];

const refresh = () => queryClient.invalidateQueries();

/** One season, folded unless it's the one in progress: its Episodes to tick, with catching up. */
export function Season({ series, season }: { series: SeriesDetail; season: SeasonData }) {
  const t = useT();
  const watched = season.episodes.filter((e) => e.watched).length;
  const aired = season.episodes.filter((e) => e.aired).length;
  const [open, setOpen] = useState(watched > 0 && watched < aired);
  const base = `/series/${series.seriesId}`;

  const toggle = useMutation({
    mutationFn: (e: { number: number; watched: boolean }) =>
      api(`${base}/episodes/${season.number}/${e.number}`, { method: e.watched ? "DELETE" : "PUT" }),
    onSuccess: refresh,
  });
  const watchThrough = useMutation({
    mutationFn: (number: number) => api(`${base}/episodes/${season.number}/${number}/through`, { method: "PUT" }),
    onSuccess: refresh,
  });
  const watchAll = useMutation({
    mutationFn: () => api(`${base}/seasons/${season.number}`, { method: "PUT" }),
    onSuccess: refresh,
  });
  // The Episode being marked while the catch-up question is open.
  const [asking, setAsking] = useState<{ number: number; earlier: number } | null>(null);
  const onToggle = (e: EpisodeData) => {
    const count = e.watched ? 0 : earlierUnwatched(series.seasons, season.number, e.number);
    if (count > 0) setAsking({ number: e.number, earlier: count });
    else toggle.mutate(e);
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-line/60 bg-surface">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-5 py-4 text-left">
        <h2 className="flex-1 text-lg">{t.series.season(season.number)}</h2>
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
              {t.series.markSeasonWatched}
            </button>
          )}
          <ul>
            {season.episodes.map((e) => (
              <EpisodeRow
                key={e.number}
                episode={e}
                next={series.next?.season === season.number && series.next.number === e.number}
                onToggle={() => onToggle(e)}
              />
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

function EpisodeRow({ episode: e, next, onToggle }: { episode: EpisodeData; next: boolean; onToggle: () => void }) {
  const t = useT();
  return (
    <li className="flex items-center gap-4 px-5 py-3 odd:bg-raised/30">
      <span className="w-8 text-sm font-bold text-muted">{e.number}</span>
      <div className="min-w-0 flex-1">
        <p className={cx("truncate text-sm font-semibold", !e.aired && "text-muted")}>
          <EpisodeTitle name={e.name} watched={e.watched} next={next} />
        </p>
        <p className="text-xs text-muted">
          {e.airDate ? longDate(t.tag, e.airDate) : t.common.tba}
        </p>
      </div>
      <button
        aria-label={e.watched ? t.series.markUnwatched : t.series.markWatched}
        disabled={!e.aired && !e.watched}
        onClick={onToggle}
        className={cx(
          "flex size-9 items-center justify-center rounded-full border-2 transition active:scale-90 disabled:opacity-30",
          e.watched ? "border-accent bg-accent text-accent-ink" : "border-line text-transparent hover:border-accent",
        )}
      >
        <Check className="size-4" strokeWidth={3} />
      </button>
    </li>
  );
}
