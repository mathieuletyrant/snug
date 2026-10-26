import { compareEpisodes, type TrackedSeries, WHOLE_SERIES } from "@/modules/tracking/domain/tracked-series";
import { today } from "@/shared/day";
import { COLUMNS } from "./csv-import";

type Cell = string | number | boolean | null;

/** RFC 4180: a field with a comma, a quote or a line break is quoted, its quotes doubled. */
const cell = (value: Cell) => {
  const text = value === null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

/**
 * The Export: the Import's CSV (see csv-import.ts), so Snug reads it back without loss. One row per Watch,
 * watched_at as a Day; a rated season with no Watch gets a row of its own, a Series with neither gets one
 * row with no season. The Series' own fields (status, rating, saving_target, absolute_numbering) repeat on each row.
 */
export function writeCsvExport(list: readonly TrackedSeries[], titleOf: (seriesId: number) => string): string {
  const sorted = [...list].sort((a, b) => titleOf(a.seriesId).localeCompare(titleOf(b.seriesId)) || a.seriesId - b.seriesId);
  const lines = [COLUMNS.join(",")];
  for (const tracked of sorted) {
    const row = (season: number | null, episode: number | null, watchedAt: Date | null) =>
      [
        titleOf(tracked.seriesId),
        tracked.seriesId,
        season,
        episode,
        watchedAt && today(watchedAt),
        tracked.status,
        tracked.ratingOf(),
        season === null ? null : tracked.ratingOf(season),
        tracked.savingTarget,
        tracked.absoluteNumbering,
      ]
        .map(cell)
        .join(",");

    const watches = tracked.watches.sort(compareEpisodes);
    const rated = tracked.ratings.map((rating) => rating.season).filter((season) => season !== WHOLE_SERIES);
    const seasons = [...new Set([...watches.map((watch) => watch.season), ...rated])].sort((a, b) => a - b);
    for (const season of seasons) {
      const inSeason = watches.filter((watch) => watch.season === season);
      if (inSeason.length) for (const watch of inSeason) lines.push(row(season, watch.number, watch.watchedAt));
      else lines.push(row(season, null, null));
    }
    if (!seasons.length) lines.push(row(null, null, null));
  }
  return `${lines.join("\n")}\n`;
}
