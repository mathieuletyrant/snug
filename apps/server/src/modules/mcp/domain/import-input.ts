import { STATUSES } from "@snug/shared";
import { z } from "zod";
import type { ImportEntry } from "../../tracking/application/tracking-service";
import type { Watch } from "../../tracking/domain/tracked-series";

/** Per call, so one answer stays quick and an assistant's request stays small; more goes in several calls. */
export const MAX_SERIES = 200;
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

const date = z.iso
  .date()
  .or(z.iso.datetime({ offset: true }))
  .describe('When it was watched: "2024-02-18" or an ISO datetime. Today when absent.');

/** What the `import` tool takes. The descriptions are all an assistant knows of each field. */
export const importInput = {
  series: z
    .array(
      z.object({
        tmdbId: z
          .int()
          .positive()
          .describe("The series' TMDB TV id (themoviedb.org/tv/<id>): not a movie id, not a TheTVDB or IMDb id."),
        status: z
          .enum(STATUSES)
          .optional()
          .describe(
            "watchlist (not started), watching, saving (waiting for more episodes before watching), paused, completed, dropped. " +
              "When absent: watching, and Snug turns it into completed by itself once every aired episode of an ended series is watched. " +
              "A series already in Snug keeps its status.",
          ),
        seasons: z
          .array(
            z.object({
              season: z.int().min(1).describe("Season number; specials (season 0) are not tracked."),
              episodes: z.string().describe('Watched episodes of this season: "1-10", "1-4,6,8-9" or "3".'),
              watchedAt: date.optional(),
            }),
          )
          .default([])
          .describe(
            "Watched episodes, grouped by season. Repeat a season to give different dates (e.g. one entry per day watched).",
          ),
        watchedAt: date.optional().describe("Date for every season of this series that has none."),
      }),
    )
    .max(MAX_SERIES)
    .describe(`Up to ${MAX_SERIES} series per call. An empty list imports nothing and only reports the progress.`),
  dryRun: z
    .boolean()
    .default(false)
    .describe("true: say what would change, write nothing. Do it on the first batch to check the matching."),
};

const inputSchema = z.object(importInput);
export type ImportInput = z.infer<typeof inputSchema>;

/** The tool's input as import entries, each episode once; throws when an episode list is malformed or too long. */
export function toEntries(input: ImportInput, now: Date): ImportEntry[] {
  let count = 0;
  const entries = new Map<number, ImportEntry>();
  for (const series of input.series) {
    const entry = entries.get(series.tmdbId) ?? { seriesId: series.tmdbId, status: series.status ?? "watching", watches: [] };
    if (series.status) entry.status = series.status;
    const seen = new Set(entry.watches.map((w) => `${w.season}x${w.number}`));
    for (const season of series.seasons) {
      const watchedAt = new Date(season.watchedAt ?? series.watchedAt ?? now);
      for (const number of parseEpisodes(season.episodes)) {
        const key = `${season.season}x${number}`;
        if (seen.has(key)) continue;
        seen.add(key);
        entry.watches.push({ season: season.season, number, watchedAt } satisfies Watch);
        if (++count > MAX_EPISODES) throw new Error(`More than ${MAX_EPISODES} episodes in one call: split it`);
      }
    }
    entries.set(series.tmdbId, entry);
  }
  return [...entries.values()];
}
