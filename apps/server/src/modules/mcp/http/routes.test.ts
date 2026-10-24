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

async function call(client: Client, name: string, args: Record<string, unknown> = {}) {
  const result = await client.callTool({ name, arguments: args });
  const [content] = result.content as { text: string }[];
  return { isError: result.isError === true, text: content!.text, answer: result.isError ? null : JSON.parse(content!.text) };
}

/** Asks the progress until TMDB is done. */
async function finished(client: Client) {
  let answer = (await call(client, "import_status")).answer;
  for (let i = 0; i < 200 && answer.running; i++) {
    await new Promise((r) => setTimeout(r, 5));
    answer = (await call(client, "import_status")).answer;
  }
  return answer;
}

/** 200 series of 3 seasons of 10 episodes: 6 000 watches in one call. */
const ids = Array.from({ length: 200 }, (_, i) => (i === 199 ? UNKNOWN_ON_TMDB : 1000 + i));
const watches = (list: number[]) =>
  list.flatMap((tmdbId) => [1, 2, 3].map((season) => ({ tmdbId, season, episodes: "1-10", watchedAt: "2024-02-18" })));

test("an unknown token is refused", async () => {
  const { app } = setup();
  await expect(connect(app, "nope")).rejects.toThrow();
});

test("three simple tools: two that add, never delete, and the progress", async () => {
  const { app, token } = setup();
  const client = await connect(app, token);
  const { tools } = await client.listTools();
  expect(tools.map((t) => [t.name, t.annotations?.readOnlyHint, t.annotations?.destructiveHint])).toEqual([
    ["add_series", false, false],
    ["mark_watched", false, false],
    ["import_status", true, undefined],
  ]);
});

test("a large history in one call; sent again, nothing changes; ids TMDB doesn't know are reported", async () => {
  const { app, token, tracking } = setup();
  const client = await connect(app, token);

  const added = await call(client, "add_series", { series: [{ tmdbId: 5, status: "watchlist" }] });
  expect(added.answer).toMatchObject({ added: 1, alreadyInSnug: 0 });

  const first = await call(client, "mark_watched", { watches: watches(ids) });
  expect(first.answer).toMatchObject({ newWatches: 6000, alreadyWatched: 0, seriesAdded: 200 });
  const again = await call(client, "mark_watched", { watches: watches(ids) });
  expect(again.answer).toMatchObject({ newWatches: 0, alreadyWatched: 6000, seriesAdded: 0 });

  expect(await finished(client)).toMatchObject({ running: false, failed: 1, failedTmdbIds: [UNKNOWN_ON_TMDB] });
  const library = await tracking.library("u");
  expect(library).toHaveLength(201);
  expect(library.find((c) => c.seriesId === 5)?.status).toBe("watchlist");
});

test("batches sent while earlier ones are still fetched from TMDB share one progress", async () => {
  let open = () => {};
  const { app, token } = setup(new Promise<void>((resolve) => (open = resolve)));
  const client = await connect(app, token);
  const known = ids.slice(0, 199);

  expect((await call(client, "mark_watched", { watches: watches(known.slice(0, 100)) })).answer.tmdb).toMatchObject({
    running: true,
    total: 100,
  });
  // known[99] is in both batches: fetched once.
  expect((await call(client, "mark_watched", { watches: watches(known.slice(99)) })).answer.tmdb).toMatchObject({
    running: true,
    total: 199,
  });
  open();
  expect(await finished(client)).toEqual({ running: false, total: 199, done: 199, failed: 0, failedTmdbIds: [] });
});

test("a malformed call is refused with a message the assistant can act on", async () => {
  const { app, token } = setup();
  const client = await connect(app, token);
  const bad = await call(client, "mark_watched", { watches: [{ tmdbId: 1, season: 1, episodes: "S01E01" }] });
  expect(bad).toMatchObject({ isError: true, text: '"S01E01" is not a list of episodes like "1-10,12"' });
  const noId = await call(client, "add_series", { series: [{ status: "watching" }] });
  expect(noId.isError).toBe(true);
});
