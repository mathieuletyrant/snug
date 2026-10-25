import { z } from "zod";
import type { Status } from "@snug/shared";
import type { ImportEntry } from "@/modules/tracking/application/tracking-service";

/** Export file format: a library of titles plus every episode watch. Unknown fields are ignored. */
const ImportFile = z.object({
  library: z
    .array(z.object({ tmdbId: z.number().int(), type: z.string().optional(), status: z.string().optional() }))
    .default([]),
  episodeWatches: z
    .array(
      z.object({
        showTmdbId: z.number().int(),
        seasonNumber: z.number().int(),
        episodeNumber: z.number().int(),
        watchedAt: z.coerce.date(),
      }),
    )
    .default([]),
});

export const STATUS_ALIASES: Record<string, Status> = {
  watchlist: "watchlist",
  plan_to_watch: "watchlist",
  in_progress: "watching",
  watching: "watching",
  paused: "paused",
  on_hold: "paused",
  completed: "completed",
  dropped: "dropped",
};

export function parseImportFile(json: unknown): ImportEntry[] {
  const file = ImportFile.parse(json);
  const entries = new Map<number, ImportEntry>();
  for (const item of file.library) {
    if (item.type && item.type !== "tv") continue;
    entries.set(item.tmdbId, {
      seriesId: item.tmdbId,
      status: STATUS_ALIASES[item.status ?? ""] ?? "watching",
      watches: [],
    });
  }
  for (const w of file.episodeWatches) {
    if (w.seasonNumber === 0) continue; // specials are not tracked
    const entry = entries.get(w.showTmdbId) ?? { seriesId: w.showTmdbId, status: "watching", watches: [] };
    entry.watches.push({ season: w.seasonNumber, number: w.episodeNumber, watchedAt: w.watchedAt });
    entries.set(w.showTmdbId, entry);
  }
  return [...entries.values()];
}
