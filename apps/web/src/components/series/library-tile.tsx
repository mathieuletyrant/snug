import type { SeriesCard } from "@snug/shared";
import { airing, longDate, shortDay } from "../airing";
import { PosterTile } from "../poster-tile";
import { StatusMenu } from "../series-actions";
import { useT } from "../../i18n";
import { cx, ProgressBar } from "../ui";

/** A series in the Library: poster with how it airs, progress, and a menu to change its status. */
export function LibraryTile({ card }: { card: SeriesCard }) {
  return (
    <div className="relative">
      <PosterTile
        href={`/series/${card.seriesId}`}
        posterPath={card.posterPath}
        name={card.name}
        overlay={card.status === "watching" && card.loaded && <AiringBadge card={card} />}
      >
        {card.airedCount > 0 && <ProgressBar value={card.watchedCount} max={card.airedCount} />}
      </PosterTile>
      {/* Change status without opening the series */}
      <div className="absolute top-1 right-1 rounded-full bg-bg/80">
        <StatusMenu seriesId={card.seriesId} status={card.status} small />
      </div>
    </div>
  );
}

/**
 * Watching mixes Series with Episodes to catch up on and ones waiting for the next Episode (dated or not);
 * the badge tells them apart at a glance: "3 left", "Thu", "TBA".
 */
function AiringBadge({ card }: { card: SeriesCard }) {
  const t = useT();
  const state = airing(card);
  const label =
    state.kind === "ready" ? t.home.left(state.left) : state.kind === "dated" ? shortDay(t, state.date) : t.common.tba;
  const title =
    state.kind === "ready"
      ? t.library.toWatch(state.left)
      : state.kind === "dated"
        ? t.library.nextOn(longDate(t.tag, state.date))
        : t.library.caughtUpUndated;
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
