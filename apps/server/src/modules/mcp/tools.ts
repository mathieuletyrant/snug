import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { STATUSES } from "@snug/shared";
import { z } from "zod";
import { forEachLimit } from "../../shared/async";
import type { CatalogService } from "../catalog/application/catalog-service";
import type { ImportService } from "../import/application/import-service";
import type { ImportEntry } from "../tracking/application/tracking-service";

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
      }),
    )
    .min(1)
    .max(200)
    .describe("Up to 200 series per call: send a large history in several calls."),
};

const text = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value) }] });

/** Two tools for an AI assistant moving a user's history from another tracker into Snug. */
export function registerTools(server: McpServer, catalog: CatalogService, importer: ImportService, userId: string) {
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
        found[title] = results.slice(0, 3).map((r) => ({
          tmdbId: r.tmdbId,
          name: r.name,
          year: r.year,
          overview: r.overview.slice(0, 150),
        }));
      });
      return text(found);
    },
  );

  server.registerTool(
    "import",
    {
      description:
        "Imports series into Snug, the user's series tracker: their status and watched episodes. What is already in Snug is kept, nothing is deleted, so a call can be sent again.",
      inputSchema: importInput,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async ({ series }) => {
      const entries: ImportEntry[] = [];
      let episodes = 0;
      try {
        for (const s of series) {
          const watches = s.watched.flatMap((w) =>
            parseEpisodes(w.episodes).map((number) => ({
              season: w.season,
              number,
              watchedAt: w.watchedAt ? new Date(w.watchedAt) : new Date(),
            })),
          );
          episodes += watches.length;
          entries.push({ seriesId: s.tmdbId, status: s.status, watches });
        }
      } catch (error) {
        return { isError: true, content: [{ type: "text" as const, text: (error as Error).message }] };
      }
      await importer.importBatch(userId, entries);
      return text({ series: entries.length, episodes });
    },
  );
}
