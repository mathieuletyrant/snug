import { episodeCode, type SeriesCard } from "@snug/shared";
import { Check } from "lucide-react";
import { Link } from "wouter";
import { useWatchNext } from "../series-actions";
import { EpisodeTitle } from "../spoilers";
import { Backdrop, Badge } from "../ui";

/** Landscape "continue watching" card: 2 per row on phones, 4 on desktop, with the one-tap ✓. */
export function ReadyCard({ card, fresh }: { card: SeriesCard; fresh: boolean }) {
  const watchNext = useWatchNext();
  const next = card.next;
  const left = card.airedCount - card.watchedCount;
  // overflow-hidden clips the image and progress bar to the card's corners: a 4px-tall bar can't hold a 16px radius.
  return (
    <article className="relative overflow-hidden rounded-2xl border border-line/60 bg-surface shadow-md shadow-black/20">
      <Link href={`/series/${card.seriesId}`} className="block">
        <div className="relative aspect-video">
          <Backdrop
            backdropPath={card.backdropPath}
            posterPath={card.posterPath}
            sizes="(min-width: 1024px) 240px, (min-width: 768px) 33vw, 50vw"
            className="h-full w-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-transparent" />
          <div className="absolute top-2 left-2 flex gap-1">
            {card.saving && <Badge tone="accent">Saved up</Badge>}
            {!card.saving && fresh && <Badge tone="accent">New</Badge>}
            <Badge>{left} left</Badge>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-2.5 pr-12 sm:p-3 sm:pr-14">
            <h3 className="truncate text-sm leading-tight sm:text-base">{card.name}</h3>
            {next && (
              <p className="truncate text-xs text-muted">
                <span className="font-bold text-accent">{episodeCode(next)}</span>
                <span className="hidden sm:inline">
                  {" · "}
                  <EpisodeTitle name={next.name} watched={false} next />
                </span>
              </p>
            )}
          </div>
        </div>
        <div className="h-1 bg-raised">
          <div className="h-full bg-accent" style={{ width: `${card.airedCount ? (card.watchedCount / card.airedCount) * 100 : 0}%` }} />
        </div>
      </Link>
      <button
        aria-label={next ? `Mark ${episodeCode(next)} as watched` : "Mark next episode as watched"}
        disabled={watchNext.isPending}
        onClick={() => watchNext.mutate(card.seriesId)}
        className="absolute right-2 bottom-3.5 flex size-9 items-center justify-center rounded-full bg-accent text-accent-ink shadow-lg shadow-black/40 transition hover:bg-accent-strong active:scale-90 disabled:opacity-60 sm:right-2.5 sm:size-10"
      >
        <Check className="size-5" strokeWidth={3} />
      </button>
    </article>
  );
}
