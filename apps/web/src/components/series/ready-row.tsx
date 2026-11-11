import type { SeriesCard } from "@snug/shared";
import { Check } from "lucide-react";
import { Link } from "wouter";
import { PlayButton, useOpenPlayers } from "@/components/play";
import { useWatchNext } from "@/components/series-actions";
import { Backdrop } from "@/components/ui";
import { useT } from "@/i18n";
import { episodeLabel } from "@/lib/format";

/** One line of the compact list: thumbnail, the full title, the next episode and the one-tap ✓. */
export function ReadyRow({ card }: { card: SeriesCard }) {
  const watchNext = useWatchNext();
  const players = useOpenPlayers();
  const t = useT();
  const next = card.next;
  const code = next && episodeLabel(t, next, card.absoluteNumbering);
  const left = card.airing.kind === "ready" ? card.airing.left : 0;
  const flagged = card.saving || card.fresh;
  return (
    <li className="flex items-center gap-1 pr-0.5">
      <Link href={`/series/${card.seriesId}`} className="flex min-w-0 flex-1 items-center gap-2.5 py-2.5 pl-2.5">
        <div className="relative h-7.5 w-13 shrink-0 overflow-hidden rounded-md">
          <Backdrop backdropPath={card.backdropPath} posterPath={card.posterPath} sizes="52px" className="h-full w-full" />
          <div className="absolute inset-x-0 bottom-0 h-0.75 bg-bg/70">
            <div className="h-full bg-accent" style={{ width: `${card.airedCount ? (card.watchedCount / card.airedCount) * 100 : 0}%` }} />
          </div>
        </div>
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-base leading-tight">
            {flagged && (
              <span className="size-1.75 shrink-0 rounded-full bg-accent" title={card.saving ? t.home.savedUp : t.home.new}>
                <span className="sr-only">{card.saving ? t.home.savedUp : t.home.new}</span>
              </span>
            )}
            <span className="truncate">{card.name}</span>
          </h3>
          <p className="truncate text-xs text-muted">
            {code && <span className="font-bold text-accent">{code}</span>}
            {code && " · "}
            {t.home.left(left)}
          </p>
        </div>
      </Link>
      {players.length > 0 && next && (
        <PlayButton
          seriesId={card.seriesId}
          episode={next}
          label={code ?? undefined}
          player={players.length === 1 ? players[0] : undefined}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-text transition hover:text-accent"
        />
      )}
      <button
        aria-label={code ? t.home.markWatched(code) : t.home.markNextWatched}
        disabled={watchNext.isPending}
        onClick={() => watchNext.mutate(card)}
        className="group flex size-11 shrink-0 items-center justify-center disabled:opacity-60"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-ink transition group-hover:bg-accent-strong group-active:scale-90">
          <Check className="size-4" strokeWidth={3} />
        </span>
      </button>
    </li>
  );
}
