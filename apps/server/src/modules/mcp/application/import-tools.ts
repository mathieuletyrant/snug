import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { moduleLogger } from "../../../shared/logger";
import type { ImportService } from "../../import/application/import-service";
import type { ImportEntry } from "../../tracking/application/tracking-service";
import {
  addSeriesInput,
  MAX_SERIES,
  MAX_WATCH_ITEMS,
  markWatchedInput,
  seriesEntries,
  watchEntries,
} from "../domain/import-input";

const log = moduleLogger("mcp");

const ABOUT = `Snug is the user's TV series tracker. These tools move a history into it from another tracker (TV Time, Trakt, Serializd, a spreadsheet…). Snug does no matching: give each series' TMDB TV id, found yourself (search themoviedb.org, or your own knowledge when certain); a wrong id imports the wrong series. Movies are not tracked: leave them out. Calls can be repeated: what is already in Snug is kept as is, nothing is ever deleted.`;

const ADD_SERIES = `${ABOUT}

Adds series to Snug with a status, up to ${MAX_SERIES} per call. A series already in Snug keeps its status. Use it for series followed without any watched episode (watchlist, dropped…); mark_watched adds the others by itself. New series are then fetched from TMDB in the background: check import_status at the end.`;

const MARK_WATCHED = `${ABOUT}

Marks episodes watched, as ranges per season ("1-10"), up to ${MAX_WATCH_ITEMS} items per call: send large histories in several calls. A series not in Snug yet is added as watching (completed by itself once an ended series is fully watched); call add_series first to give another status. Check import_status at the end.`;

const IMPORT_STATUS = `${ABOUT}

How far Snug is in fetching the imported series from TMDB, in the background. When running is false, failedTmdbIds lists the ids TMDB doesn't know: wrong matches to fix.`;

const json = (value: object) => ({ content: [{ type: "text" as const, text: JSON.stringify(value) }] });
const failure = (error: unknown) => ({ isError: true, content: [{ type: "text" as const, text: (error as Error).message }] });

/** The import tools, for one User (the MCP token's). */
export function registerImportTools(server: McpServer, importer: ImportService, userId: string) {
  const tmdb = () => ({ ...importer.progressOf(userId), failedTmdbIds: importer.failuresOf(userId) });
  const write = { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false };
  const run = async (what: string, entries: () => ImportEntry[]) => {
    try {
      const changes = await importer.importBatch(userId, entries());
      log.info(`${what}: ${changes.newSeries} new series, ${changes.newWatches} new watches`);
      return changes;
    } catch (error) {
      return error as Error;
    }
  };

  server.registerTool(
    "add_series",
    { title: "Add series to Snug", description: ADD_SERIES, inputSchema: addSeriesInput, annotations: write },
    async (input) => {
      const changes = await run("add_series", () => seriesEntries(input.series));
      if (changes instanceof Error) return failure(changes);
      return json({ added: changes.newSeries, alreadyInSnug: changes.series - changes.newSeries, tmdb: tmdb() });
    },
  );

  server.registerTool(
    "mark_watched",
    { title: "Mark episodes watched in Snug", description: MARK_WATCHED, inputSchema: markWatchedInput, annotations: write },
    async (input) => {
      const changes = await run("mark_watched", () => watchEntries(input.watches, new Date()));
      if (changes instanceof Error) return failure(changes);
      return json({
        newWatches: changes.newWatches,
        alreadyWatched: changes.alreadyWatched,
        seriesAdded: changes.newSeries,
        tmdb: tmdb(),
      });
    },
  );

  server.registerTool(
    "import_status",
    {
      title: "Snug's import progress",
      description: IMPORT_STATUS,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => json(tmdb()),
  );
}
