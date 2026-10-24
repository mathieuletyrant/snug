import { STATUSES } from "@snug/shared";
import { z } from "zod";
import type { ImportEntry } from "../../tracking/application/tracking-service";

/** Per call, so one answer stays quick and an assistant's request stays small; more goes in several calls. */
export const MAX_SERIES = 500;
export const MAX_WATCH_ITEMS = 2000;
export const MAX_EPISODES = 10_000;

/** "1-10,12" → [1, …, 10, 12]. Throws on anything else. */
export function parseEpisodes(text: string): number[] {
  const numbers: number[] = [];
  for (const part of text.split(",")) {
    const match = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error(`"${text}" is not a list of episodes like "1-10,12"`);
    const from = Number(match[1]);
    const to = Number(match[2] ?? match[1]);
    if (from < 1 || to < from || to - from > 999) throw new Error(`"${part.trim()}" is not a valid range`);
    for (let n = from; n <= to; n++) numbers.push(n);
  }
  return numbers;
}

const tmdbId = z
  .int()
  .positive()
  .describe("The series' TMDB TV id (themoviedb.org/tv/<id>): not a movie id, not a TheTVDB or IMDb id.");

/** What `add_series` takes. The descriptions are all an assistant knows of each field. */
export const addSeriesInput = {
  series: z
    .array(
      z.object({
        tmdbId,
        status: z
          .enum(STATUSES)
          .default("watching")
          .describe(
            "watchlist (not started), watching, saving (waiting for more episodes), paused, completed, dropped. " +
              "watching by default: Snug turns it into completed by itself once every aired episode of an ended series is watched.",
          ),
      }),
    )
    .min(1)
    .max(MAX_SERIES)
    .describe(`Up to ${MAX_SERIES} series per call.`),
};

/** What `mark_watched` takes. */
export const markWatchedInput = {
  watches: z
    .array(
      z.object({
        tmdbId,
        season: z.int().min(1).describe("Season number; specials (season 0) are not tracked."),
        episodes: z.string().describe('Watched episodes of this season: "1-10", "1-4,6,8-9" or "3".'),
        watchedAt: z.iso
          .date()
          .or(z.iso.datetime({ offset: true }))
          .optional()
          .describe('When: "2024-02-18" or an ISO datetime; today when absent.'),
      }),
    )
    .min(1)
    .max(MAX_WATCH_ITEMS)
    .describe(
      `Up to ${MAX_WATCH_ITEMS} items and ${MAX_EPISODES} episodes per call. Repeat a season to give different dates (one item per day watched).`,
    ),
};

type SeriesItem = { tmdbId: number; status: ImportEntry["status"] };
type WatchItem = { tmdbId: number; season: number; episodes: string; watchedAt?: string };

export function seriesEntries(series: SeriesItem[]): ImportEntry[] {
  const entries = new Map<number, ImportEntry>();
  for (const s of series) entries.set(s.tmdbId, { seriesId: s.tmdbId, status: s.status, watches: [] });
  return [...entries.values()];
}

/** One entry per series, each episode once; throws when an episode list is malformed or too long. */
export function watchEntries(watches: WatchItem[], now: Date): ImportEntry[] {
  let count = 0;
  const entries = new Map<number, { entry: ImportEntry; seen: Set<string> }>();
  for (const item of watches) {
    const current = entries.get(item.tmdbId) ?? {
      entry: { seriesId: item.tmdbId, status: "watching" as const, watches: [] },
      seen: new Set<string>(),
    };
    const watchedAt = new Date(item.watchedAt ?? now);
    for (const number of parseEpisodes(item.episodes)) {
      const key = `${item.season}x${number}`;
      if (current.seen.has(key)) continue;
      current.seen.add(key);
      current.entry.watches.push({ season: item.season, number, watchedAt });
      if (++count > MAX_EPISODES) throw new Error(`More than ${MAX_EPISODES} episodes in one call: split it`);
    }
    entries.set(item.tmdbId, current);
  }
  return [...entries.values()].map((e) => e.entry);
}
