import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type Preferences, SAVING_TARGETS, STATUSES, isTitleHidden } from "@snug/shared";
import { z } from "zod";
import { forEachLimit } from "@/shared/async";
import { addDays, startOf, today } from "@/shared/day";
import { InvalidInputError, NotFoundError } from "@/shared/errors";
import type { CatalogService } from "@/modules/catalog/application/catalog-service";
import type { ImportService } from "@/modules/import/application/import-service";
import type { ImportEntry, TrackingService } from "@/modules/tracking/application/tracking-service";
import { WHOLE_SERIES } from "@/modules/tracking/domain/tracked-series";

/** "1-10,12" → [1, …, 10, 12]. */
export function parseEpisodes(text: string): number[] {
  const numbers: number[] = [];
  for (const part of text.split(",")) {
    const match = part.trim().match(/^(\d+)(-(\d+))?$/);
    const from = Number(match?.[1]);
    const to = Number(match?.[3] ?? from);
    if (!match || from < 1 || to < from || to - from > 999) throw new Error(`"${text}" is not a list of episodes like "1-10,12"`);
    for (let n = from; n <= to; n++) numbers.push(n);
  }
  return numbers;
}

const findSeriesInput = {
  titles: z.array(z.string()).min(1).max(50).describe("Series titles, up to 50 per call. Add the year when known: \"The Office 2005\"."),
};

const importInput = {
  series: z
    .array(
      z.object({
        tmdbId: z.int().positive().describe("The series' TMDB id, from find_series."),
        status: z
          .enum(STATUSES)
          .default("watching")
          .describe("watching by default: Snug marks an ended series completed once every episode is watched."),
        watched: z
          .array(
            z.object({
              season: z.int().min(1),
              episodes: z.string().describe('"1-10", "1-4,6" or "3".'),
              watchedAt: z.iso.date().optional().describe('"2024-02-18"; today when absent.'),
            }),
          )
          .default([])
          .describe("Watched episodes. Repeat a season to give one date per day."),
        rating: z.int().min(1).max(10).optional().describe("The user's rating of the series, out of 10."),
        seasonRatings: z
          .array(z.object({ season: z.int().min(1), rating: z.int().min(1).max(10) }))
          .default([])
          .describe("The user's ratings of single seasons, out of 10."),
      }),
    )
    .min(1)
    .max(200)
    .describe("Up to 200 series per call: send a large history in several calls."),
};

/** An ISO datetime as the Day it falls on, like the Days the Assistant sends. */
const dayOf = (iso: string | null) => iso && today(new Date(iso));

const tmdbId = z.int().positive().describe("The series' TMDB id, from find_series or library.");
const episodes = z.string().describe('"1-10", "1-4,6" or "3".');

const text = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value) }] });
const failure = (error: unknown) => ({ isError: true, content: [{ type: "text" as const, text: (error as Error).message }] });

/** Bad input and unknown series come back to the assistant as a tool error, not an exception. */
const attempt = async (fn: () => Promise<unknown>) => {
  try {
    return text(await fn());
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof InvalidInputError) return failure(error);
    throw error;
  }
};

/** The Assistant's tools: the User's own commands and views on their Series, nothing on their account. */
export function registerTools(
  server: McpServer,
  catalog: CatalogService,
  importer: ImportService,
  tracking: TrackingService,
  preferences: Preferences,
  userId: string,
) {
  server.registerPrompt(
    "import_history",
    {
      title: "Import my history into Snug",
      description: "Moves the series, watched episodes and ratings of another tracker into Snug.",
      argsSchema: { source: z.string().describe("The other tracker: TV Time, Trakt, Letterboxd…") },
    },
    ({ source }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Import my ${source} history into Snug. Read the export I give you (ask for it if I haven't), then:
1. Find every series with find_series, in batches of 50 titles; when the best match is unclear, ask me.
2. Send them with import, up to 200 series per call: their status, watched episodes with the day they were watched, and ratings converted to a scale of 10.
3. Skip movies and specials (season 0). Tell me which titles you couldn't match.`,
          },
        },
      ],
    }),
  );

  server.registerTool(
    "find_series",
    {
      description:
        "Searches TV series on TMDB by title, several at once. For each title, the 3 best results: pick the right one and pass its tmdbId to import.",
      inputSchema: findSeriesInput,
      annotations: { readOnlyHint: true },
    },
    async ({ titles }) => {
      const found: Record<string, { tmdbId: number; name: string; year: number | null; overview: string }[]> = {};
      await forEachLimit(titles, 6, async (title) => {
        const results = await catalog.search(title);
        found[title] = results.slice(0, 3).map((result) => ({
          tmdbId: result.tmdbId,
          name: result.name,
          year: result.year,
          overview: result.overview.slice(0, 150),
        }));
      });
      return text(found);
    },
  );

  server.registerTool(
    "import",
    {
      description:
        "Imports series into Snug, the user's series tracker: their status, watched episodes and ratings (out of 10; convert other scales, e.g. 4/5 stars → 8). What is already in Snug is kept, nothing is deleted, so a call can be sent again.",
      inputSchema: importInput,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async ({ series }) => {
      const entries: ImportEntry[] = [];
      let episodes = 0;
      try {
        for (const entry of series) {
          const watches = entry.watched.flatMap((group) =>
            parseEpisodes(group.episodes).map((number) => ({
              season: group.season,
              number,
              watchedAt: group.watchedAt ? startOf(group.watchedAt) : new Date(),
            })),
          );
          episodes += watches.length;
          const ratings = [...(entry.rating ? [{ season: WHOLE_SERIES, rating: entry.rating }] : []), ...entry.seasonRatings];
          entries.push({ seriesId: entry.tmdbId, status: entry.status, watches, ratings });
        }
      } catch (error) {
        return { isError: true, content: [{ type: "text" as const, text: (error as Error).message }] };
      }
      await importer.importBatch(userId, entries);
      return text({ series: entries.length, episodes });
    },
  );

  server.registerTool(
    "library",
    {
      description:
        "The user's series: status, progress (the furthest episode watched), next episode, rating, and lastWatchedAt (the day of the most recent watch, of any episode).",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () =>
      text(
        (await tracking.library(userId)).map((card) => ({
          tmdbId: card.seriesId,
          name: card.name,
          year: card.year,
          status: card.status,
          progress: card.progress,
          next: card.next && { season: card.next.season, number: card.next.number, airDate: card.next.airDate },
          rating: card.rating,
          watched: card.watchedCount,
          aired: card.airedCount,
          lastWatchedAt: dayOf(card.lastWatchedAt),
        })),
      ),
  );

  server.registerTool(
    "series",
    {
      description:
        "One series in detail, tracked or not: its seasons and episodes, the day each one was first watched (watchedAt, null when not watched), the next one. An episode's name is null when the user's spoiler shield hides it: don't look the title up elsewhere.",
      inputSchema: { tmdbId },
      annotations: { readOnlyHint: true },
    },
    ({ tmdbId }) =>
      attempt(async () => {
        const detail = await tracking.detail(userId, tmdbId);
        const isNext = (episode: { season: number; number: number }) =>
          detail.next?.season === episode.season && detail.next.number === episode.number;
        return {
          tmdbId,
          name: detail.name,
          year: detail.year,
          overview: detail.overview,
          ended: detail.ended,
          tracked: detail.tracked,
          status: detail.tracked ? detail.status : null,
          progress: detail.progress,
          next: detail.next && { season: detail.next.season, number: detail.next.number, airDate: detail.next.airDate },
          rating: detail.rating,
          seasons: detail.seasons.map((season) => ({
            number: season.number,
            rating: season.rating,
            episodes: season.episodes.map((episode) => ({
              number: episode.number,
              name: isTitleHidden(preferences, { watched: episode.watched, next: isNext(episode) }) ? null : episode.name,
              airDate: episode.airDate,
              watchedAt: dayOf(episode.watchedAt),
            })),
          })),
        };
      }),
  );

  server.registerTool(
    "calendar",
    {
      description:
        "The episodes airing from today to the next `days` days in the series the user watches or saves up, by air date, with the day each one was watched (watchedAt, null when not watched). An episode's name is null when the user's spoiler shield hides it: don't look the title up elsewhere.",
      inputSchema: { days: z.int().min(0).max(90).default(7).describe("How many days ahead; 0 for today only.") },
      annotations: { readOnlyHint: true },
    },
    async ({ days }) => {
      const from = today();
      return text(
        (await tracking.airing(userId, from, addDays(from, days))).map(({ series, episode, watchedAt, next }) => ({
          airDate: episode.airDate,
          tmdbId: series.tmdbId,
          series: series.name,
          season: episode.season,
          number: episode.number,
          name: isTitleHidden(preferences, { watched: !!watchedAt, next }) ? null : episode.name,
          watchedAt: dayOf(watchedAt?.toISOString() ?? null),
        })),
      );
    },
  );

  server.registerTool(
    "set_status",
    {
      description:
        "Sets a series' status; a series not tracked yet is added with it, so this is also how to add one. saving = waiting for a whole season (target 0) or a number of episodes before watching.",
      inputSchema: {
        tmdbId,
        status: z.enum(STATUSES),
        savingTarget: z.literal(SAVING_TARGETS).optional().describe("With saving: 0 for a whole season, or how many episodes."),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    ({ tmdbId, status, savingTarget }) =>
      attempt(async () => {
        await tracking.track(userId, tmdbId, status, savingTarget);
        return { ok: true };
      }),
  );

  server.registerTool(
    "watch",
    {
      description: "Marks episodes of a season watched. A series not tracked yet starts as watching.",
      inputSchema: {
        tmdbId,
        season: z.int().min(1),
        episodes,
        watchedAt: z.iso.date().optional().describe('"2024-02-18"; today when absent.'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    ({ tmdbId, season, episodes, watchedAt }) =>
      attempt(async () => {
        const numbers = parseEpisodes(episodes);
        const at = watchedAt ? startOf(watchedAt) : new Date();
        for (const number of numbers) await tracking.watchEpisode(userId, tmdbId, { season, number }, at);
        return { episodes: numbers.length };
      }),
  );

  server.registerTool(
    "unwatch",
    {
      description: "Marks episodes of a season not watched, e.g. to undo a mistake.",
      inputSchema: { tmdbId, season: z.int().min(1), episodes },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    ({ tmdbId, season, episodes }) =>
      attempt(async () => {
        const numbers = parseEpisodes(episodes);
        for (const number of numbers) await tracking.unwatchEpisode(userId, tmdbId, { season, number });
        return { episodes: numbers.length };
      }),
  );

  server.registerTool(
    "rate",
    {
      description: "Rates a tracked series, or one of its seasons, out of 10; null clears the rating.",
      inputSchema: {
        tmdbId,
        season: z.int().min(1).optional().describe("Absent: the whole series."),
        rating: z.int().min(1).max(10).nullable(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    ({ tmdbId, season, rating }) =>
      attempt(async () => {
        await tracking.rate(userId, tmdbId, { rating, season });
        return { ok: true };
      }),
  );

  server.registerTool(
    "untrack",
    {
      description:
        "Removes a series from the user's library with its watched episodes and ratings, irreversibly: for a series added by mistake. To stop watching one, set its status to dropped instead.",
      inputSchema: { tmdbId },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    ({ tmdbId }) =>
      attempt(async () => {
        await tracking.untrack(userId, tmdbId);
        return { ok: true };
      }),
  );
}
