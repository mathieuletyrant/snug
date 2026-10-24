import { expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Hono } from "hono";
import type { CatalogService } from "../../catalog/application/catalog-service";
import type { Series } from "../../catalog/domain/series";
import { IdentityService } from "../../identity/application/identity-service";
import type { Auth } from "../../identity/infrastructure/auth";
import { ImportService } from "../../import/application/import-service";
import { TrackingService } from "../../tracking/application/tracking-service";
import { DrizzleTrackedSeriesRepository } from "../../tracking/infrastructure/drizzle-tracked-series-repository";
import { testDb } from "../../../shared/testing";
import { mcpServer } from "./routes";

const UNKNOWN_ON_TMDB = 999_999;

/** `gate`: TMDB answers only once it resolves, to send batches while earlier ones are still being fetched. */
function setup(gate: Promise<unknown> = Promise.resolve()) {
  const { db } = testDb();
  const series = (tmdbId: number): Series => ({
    tmdbId,
    tvdbId: null,
    name: `Series ${tmdbId}`,
    year: 2020,
    overview: "",
    posterPath: null,
    backdropPath: null,
    ended: false,
    episodes: [],
    fetchedAt: new Date(),
  });
  const catalog = {
    ensure: async (id: number) => {
      await gate;
      if (id === UNKNOWN_ON_TMDB) throw new Error("TMDB 404");
      return series(id);
    },
    getMany: async (ids: readonly number[]) => new Map(ids.map((id) => [id, series(id)])),
  } as unknown as CatalogService;
  const tracking = new TrackingService(new DrizzleTrackedSeriesRepository(db), catalog);
  const identity = new IdentityService(db, {} as Auth);
  const importer = new ImportService(tracking, catalog);
  const app = new Hono().route("/api/mcp", mcpServer(identity, importer));
  return { app, tracking, token: identity.mcpTokens.of("u") };
}

// A real MCP client, its HTTP calls answered by the app without a network.
async function connect(app: Hono, token: string) {
  const transport = new StreamableHTTPClientTransport(new URL(`http://snug.test/api/mcp?token=${token}`), {
    fetch: async (url, init) => app.request(String(url), init),
  });
  const client = new Client({ name: "test", version: "1" });
  await client.connect(transport);
  return client;
}

async function callImport(client: Client, args: Record<string, unknown>) {
  const result = await client.callTool({ name: "import", arguments: args });
  const [content] = result.content as { text: string }[];
  return { isError: result.isError === true, text: content!.text, answer: result.isError ? null : JSON.parse(content!.text) };
}

/** Asks the progress until TMDB is done. */
async function finished(client: Client) {
  let answer = (await callImport(client, { series: [] })).answer;
  for (let i = 0; i < 200 && answer.tmdb.running; i++) {
    await new Promise((r) => setTimeout(r, 5));
    answer = (await callImport(client, { series: [] })).answer;
  }
  return answer.tmdb;
}

/** 200 series of 3 seasons of 10 episodes: 6 000 watches, the most one call takes in series. */
const bigBatch = Array.from({ length: 200 }, (_, i) => ({
  tmdbId: i === 199 ? UNKNOWN_ON_TMDB : 1000 + i,
  watchedAt: "2024-02-18",
  seasons: [1, 2, 3].map((season) => ({ season, episodes: "1-10" })),
}));

test("an unknown token is refused", async () => {
  const { app } = setup();
  await expect(connect(app, "nope")).rejects.toThrow();
});

test("one tool, import: writes, never deletes, can be called again", async () => {
  const { app, token } = setup();
  const client = await connect(app, token);
  const { tools } = await client.listTools();
  expect(tools.map((t) => [t.name, t.annotations?.destructiveHint, t.annotations?.idempotentHint])).toEqual([
    ["import", false, true],
  ]);
});

test("a large history in one call; sent again, nothing changes; ids TMDB doesn't know are reported", async () => {
  const { app, token, tracking } = setup();
  const client = await connect(app, token);

  const preview = await callImport(client, { series: bigBatch, dryRun: true });
  expect(preview.answer).toMatchObject({ dryRun: true, series: 200, newSeries: 200, newWatches: 6000 });
  expect(await tracking.library("u")).toHaveLength(0);

  const first = await callImport(client, { series: bigBatch });
  expect(first.answer).toMatchObject({ dryRun: false, series: 200, newSeries: 200, newWatches: 6000, alreadyWatched: 0 });
  const again = await callImport(client, { series: bigBatch });
  expect(again.answer).toMatchObject({ newSeries: 0, newWatches: 0, alreadyWatched: 6000 });

  expect(await finished(client)).toMatchObject({ running: false, failed: 1, failedTmdbIds: [UNKNOWN_ON_TMDB] });
  expect(await tracking.library("u")).toHaveLength(200);
});

test("batches sent while earlier ones are still fetched from TMDB share one progress", async () => {
  let open = () => {};
  const { app, token } = setup(new Promise<void>((resolve) => (open = resolve)));
  const client = await connect(app, token);
  const half = (from: number) => bigBatch.slice(from, from + 100).map((s) => ({ ...s, tmdbId: s.tmdbId === UNKNOWN_ON_TMDB ? 1199 : s.tmdbId }));

  expect((await callImport(client, { series: half(0) })).answer.tmdb).toMatchObject({ running: true, total: 100, done: 0 });
  expect((await callImport(client, { series: half(100) })).answer.tmdb).toMatchObject({ running: true, total: 200, done: 0 });
  open();
  expect(await finished(client)).toEqual({ running: false, total: 200, done: 200, failed: 0, failedTmdbIds: [] });
});

test("a malformed batch is refused with a message the assistant can act on", async () => {
  const { app, token } = setup();
  const client = await connect(app, token);
  const bad = await callImport(client, { series: [{ tmdbId: 1, seasons: [{ season: 1, episodes: "S01E01" }] }] });
  expect(bad).toMatchObject({ isError: true, text: '"S01E01" is not a list of episodes like "1-10,12"' });
  const tooMany = await callImport(client, { series: [...bigBatch, { tmdbId: 1 }] });
  expect(tooMany.isError).toBe(true);
});
