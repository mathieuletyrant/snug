import { episodeCode, type SeriesCard } from "@snug/shared";
import { PiggyBank, Sparkles } from "lucide-react";
import { useT } from "../../i18n";
import { relativeDay } from "../airing";
import { PosterTile, PosterTileSkeleton, TileLine } from "../poster-tile";
import { cx } from "../ui";

/** A caught-up series on Home: when its next Episode airs, or how far its saving up is. */
export function UpcomingTile({ card }: { card: SeriesCard }) {
  const t = useT();
  // Details not fetched yet (e.g. right after an Import): a placeholder rather than "Series #123".
  if (!card.loaded) return <PosterTileSkeleton />;
  return (
    <PosterTile href={`/series/${card.seriesId}`} posterPath={card.posterPath} name={card.name}>
      {card.saving ? (
        <>
          <TileLine className="flex items-center gap-1 font-bold text-accent">
            <PiggyBank className="size-3 shrink-0" />
            <span className="truncate">
              {t.home.savingOut(card.saving.out, card.saving.needed)}
            </span>
          </TileLine>
          <TileLine>
            {card.saving.completeOn
              ? t.home.complete(relativeDay(t, card.saving.completeOn, undefined, true))
              : t.common.dateTba}
          </TileLine>
        </>
      ) : (
        <>
          {/* Date and episode on their own lines: "S02E06 · In 2 days" wraps mid-date in a 4-column grid. */}
          <TileLine className={cx("flex items-center gap-1 font-bold", card.next?.airDate ? "text-accent" : "text-muted")}>
            <Sparkles className="size-3 shrink-0" />
            <span className="truncate">{relativeDay(t, card.next?.airDate)}</span>
          </TileLine>
          {card.next && <TileLine>{episodeCode(card.next)}</TileLine>}
        </>
      )}
    </PosterTile>
  );
}
