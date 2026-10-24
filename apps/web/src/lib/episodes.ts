import type { SeriesDetail } from "@snug/shared";

/** Aired Episodes before SxxEyy, in any season, not watched yet: what catching up would mark. */
export function earlierUnwatched(seasons: SeriesDetail["seasons"], season: number, number: number) {
  return seasons
    .flatMap((s) => s.episodes.map((e) => ({ ...e, season: s.number })))
    .filter((e) => e.aired && !e.watched && (e.season < season || (e.season === season && e.number < number))).length;
}

/** The Next Episode, when it's out: there's something to play. */
export function nextAired(series: Pick<SeriesDetail, "next" | "seasons">) {
  const next = series.next;
  if (!next) return null;
  const aired = series.seasons.find((s) => s.number === next.season)?.episodes.some((e) => e.number === next.number && e.aired);
  return aired ? next : null;
}
