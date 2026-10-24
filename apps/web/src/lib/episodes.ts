import type { SeriesDetail } from "@snug/shared";

/** Aired Episodes before SxxEyy, in any season, not watched yet: what catching up would mark. */
export function earlierUnwatched(seasons: SeriesDetail["seasons"], season: number, number: number) {
  return seasons
    .flatMap((entry) => entry.episodes.map((episode) => ({ ...episode, season: entry.number })))
    .filter((episode) => episode.aired && !episode.watched && (episode.season < season || (episode.season === season && episode.number < number))).length;
}

/** The Next Episode, when it's out: there's something to play. */
export function nextAired(series: Pick<SeriesDetail, "next" | "seasons">) {
  const next = series.next;
  if (!next) return null;
  const aired = series.seasons
    .find((season) => season.number === next.season)
    ?.episodes.some((episode) => episode.number === next.number && episode.aired);
  return aired ? next : null;
}
