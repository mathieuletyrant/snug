import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { moduleLogger } from "../../../shared/logger";
import type { ImportService } from "../../import/application/import-service";
import { importInput, MAX_SERIES, toEntries } from "../domain/import-input";

const log = moduleLogger("mcp");

const DESCRIPTION = `Imports a TV series history into Snug, the user's series tracker: which series they follow, with which status, and which episodes they watched. Made for moving from another tracker (TV Time, Trakt, Serializd, a spreadsheet…).

Snug does no matching: give each series' TMDB TV id. Find it yourself (search themoviedb.org, or your own knowledge when certain); a wrong id imports the wrong series. Movies are not tracked: leave them out.

Large histories: send up to ${MAX_SERIES} series per call and keep calling until everything is sent; give episodes as ranges ("1-10") rather than one by one. Start with dryRun on the first batch. Calls are idempotent: a series or episode already in Snug is kept as is, so a batch can be sent again after an error. Nothing is ever deleted.

Snug answers with what changed, then fetches each new series from TMDB in the background ("tmdb"). When it is done (running false), "failedTmdbIds" lists ids TMDB doesn't know: wrong matches to fix. Call with an empty list to check the progress.`;

/** The `import` tool, for one User (the MCP token's). */
export function registerImportTool(server: McpServer, importer: ImportService, userId: string) {
  server.registerTool(
    "import",
    {
      title: "Import a series history into Snug",
      description: DESCRIPTION,
      inputSchema: importInput,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (input) => {
      let answer: object;
      try {
        const entries = toEntries(input, new Date());
        const changes = entries.length ? await importer.importBatch(userId, entries, input.dryRun) : null;
        if (changes && !input.dryRun) {
          log.info(`Import batch: ${changes.series} series (${changes.newSeries} new), ${changes.newWatches} new watches`);
        }
        const progress = importer.progressOf(userId);
        answer = {
          dryRun: input.dryRun,
          ...(changes ?? { series: 0, newSeries: 0, newWatches: 0, alreadyWatched: 0 }),
          tmdb: { ...progress, failedTmdbIds: importer.failuresOf(userId) },
        };
      } catch (error) {
        return { isError: true, content: [{ type: "text", text: (error as Error).message }] };
      }
      return { content: [{ type: "text", text: JSON.stringify(answer) }] };
    },
  );
}
