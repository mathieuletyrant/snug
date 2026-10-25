import { expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Hono } from "hono";
import { MCP_FEATURES } from "@snug/shared";
import type { CatalogService } from "@/modules/catalog/application/catalog-service";
import type { Series } from "@/modules/catalog/domain/series";
import { IdentityService } from "@/modules/identity/application/identity-service";
import type { Auth } from "@/modules/identity/infrastructure/auth";
import { ImportService } from "@/modules/import/application/import-service";
import { TrackingService } from "@/modules/tracking/application/tracking-service";
import { DrizzleTrackedSeriesRepository } from "@/modules/tracking/infrastructure/drizzle-tracked-series-repository";
import { testDb } from "@/shared/testing";
import { mcpServer } from "@/modules/mcp/http/routes";
import { addDays, today } from "@/shared/day";
import { parseEpisodes } from "./tools";

const series = (tmdbId: number): Series => ({
  tmdbId,
  tvdbId: null,
  name: `Series ${tmdbId}`,
  year: 2020,
  overview: "",
  posterPath: null,
  backdropPath: null,
  ended: false,
  episodes: [1, 2, 3, 4].map((number) => ({ season: 1, number, name: `Episode ${number}`, airDate: number < 4 ? "2020-01-01" : null })),
  fetchedAt: new Date(),
});

// Series 9 and up air around today: yesterday, today, in 3 days and in 10 days.
const seriesOf = (tmdbId: number): Series =>
  tmdbId < 9
    ? series(tmdbId)
    : {
        ...series(tmdbId),
        episodes: [-1, 0, 3, 10].map((offset, index) => ({
          season: 1,
          number: index + 1,
          name: `Episode ${index + 1}`,
          airDate: addDays(today(), offset),
        })),
      };

// A real MCP client, its HTTP calls answered by the app without a network.
async function setup() {
  const { db } = testDb();
  const catalog = {
    ensure: async (id: number) => seriesOf(id),
    getMany: async (ids: readonly number[]) => new Map(ids.map((id) => [id, seriesOf(id)])),
    search: async (title: string) => [
      { tmdbId: 2316, name: "The Office", year: 2005, overview: `US remake, searched as "${title}"`, posterPath: null },
      { tmdbId: 2996, name: "The Office", year: 2001, overview: "The original", posterPath: null },
      { tmdbId: 1, name: "Office Ladies", year: 2019, overview: "", posterPath: null },
      { tmdbId: 2, name: "Not shown", year: 2020, overview: "", posterPath: null },
    ],
  } as unknown as CatalogService;
  const repo = new DrizzleTrackedSeriesRepository(db);
  const tracking = new TrackingService(repo, catalog);
  const identity = new IdentityService(db, {} as Auth);
  const app = new Hono().route("/api/mcp", mcpServer(identity, catalog, new ImportService(tracking, catalog), tracking));
  const transport = new StreamableHTTPClientTransport(
    new URL(`http://snug.test/api/mcp?token=${identity.mcpTokens.of("u")}`),
    { fetch: async (url, init) => app.request(String(url), init) },
  );
  const client = new Client({ name: "test", version: "1" });
  await client.connect(transport);
  const call = async (name: string, args: Record<string, unknown>) => {
    const result = await client.callTool({ name, arguments: args });
    const [content] = result.content as { text: string }[];
    return result.isError ? content!.text : JSON.parse(content!.text);
  };
  return { app, client, call, tracking, repo, identity };
}

test("Integrations lists every tool and prompt", async () => {
  const { client } = await setup();
  const prompts = (await client.listPrompts()).prompts.map((prompt) => ["prompt", prompt.name]);
  const tools = (await client.listTools()).tools.map((tool) => ["tool", tool.name]);
  expect([...prompts, ...tools]).toEqual(MCP_FEATURES.map(([kind, name]) => [kind, name]));
});

test("import_history: a prompt naming the other tracker", async () => {
  const { client } = await setup();
  const { messages } = await client.getPrompt({ name: "import_history", arguments: { source: "TV Time" } });
  expect((messages[0]!.content as { text: string }).text).toStartWith("Import my TV Time history into Snug.");
});

test("episode lists", () => {
  expect(parseEpisodes("1-3,5, 8-9")).toEqual([1, 2, 3, 5, 8, 9]);
  expect(() => parseEpisodes("S01E01")).toThrow('"S01E01" is not a list of episodes like "1-10,12"');
  expect(() => parseEpisodes("5-2")).toThrow();
});

test("an unknown token is refused", async () => {
  const { app } = await setup();
  const res = await app.request("/api/mcp?token=nope", { method: "POST", body: "{}" });
  expect(res.status).toBe(401);
});

test("find_series: the 3 best TMDB results of each title", async () => {
  const { call } = await setup();
  const found = await call("find_series", { titles: ["The Office 2005"] });
  expect(found["The Office 2005"].map((result: { tmdbId: number }) => result.tmdbId)).toEqual([2316, 2996, 1]);
});

test("import: 200 series and 6 000 episodes in one call, sent again without duplicates", async () => {
  const { call, tracking, repo } = await setup();
  const batch = Array.from({ length: 200 }, (_, i) => ({
    tmdbId: 1000 + i,
    watched: [1, 2, 3].map((season) => ({ season, episodes: "1-10", watchedAt: "2024-02-18" })),
  }));
  expect(await call("import", { series: batch })).toEqual({ series: 200, episodes: 6000 });
  await call("import", { series: batch });

  const library = await tracking.library("u");
  expect(library).toHaveLength(200);
  const first = await repo.find("u", 1000);
  expect(first?.status).toBe("watching");
  expect(first?.watches).toHaveLength(30);
  expect(await call("import", { series: [{ tmdbId: 1, watched: [{ season: 1, episodes: "S01E01" }] }] })).toBe(
    '"S01E01" is not a list of episodes like "1-10,12"',
  );
});

test("import: ratings of the series and its seasons fill in, a rating given in Snug wins", async () => {
  const { call, tracking, repo } = await setup();
  await call("import", { series: [{ tmdbId: 7, rating: 8, seasonRatings: [{ season: 1, rating: 6 }] }] });
  await tracking.rate("u", 7, { rating: 10 });
  await call("import", { series: [{ tmdbId: 7, rating: 3, seasonRatings: [{ season: 2, rating: 9 }] }] });

  const tracked = await repo.find("u", 7);
  expect([tracked?.ratingOf(), tracked?.ratingOf(1), tracked?.ratingOf(2)]).toEqual([10, 6, 9]);
  expect(await call("import", { series: [{ tmdbId: 7, rating: 11 }] })).toContain("rating");
});

test("set_status adds a series; library, series and untrack see it", async () => {
  const { call } = await setup();
  await call("set_status", { tmdbId: 5, status: "saving", savingTarget: 3 });
  expect(await call("library", {})).toMatchObject([{ tmdbId: 5, name: "Series 5", status: "saving", progress: null, aired: 3 }]);
  expect(await call("series", { tmdbId: 5 })).toMatchObject({ tracked: true, status: "saving", next: { season: 1, number: 1 } });
  expect(await call("series", { tmdbId: 6 })).toMatchObject({ tracked: false, status: null });
  await call("untrack", { tmdbId: 5 });
  expect(await call("library", {})).toEqual([]);
});

test("watch and unwatch episodes; the spoiler shield hides unwatched titles", async () => {
  const { call, identity } = await setup();
  expect(await call("unwatch", { tmdbId: 5, season: 1, episodes: "1" })).toBe("This series is not in your library");
  expect(await call("watch", { tmdbId: 5, season: 1, episodes: "1-2", watchedAt: "2024-02-18" })).toEqual({ episodes: 2 });
  await call("unwatch", { tmdbId: 5, season: 1, episodes: "2" });
  expect(await call("series", { tmdbId: 5 })).toMatchObject({ status: "watching", progress: { season: 1, number: 1 } });

  identity.updatePreferences("u", { episodeTitles: "hideUnwatched" });
  const { seasons } = await call("series", { tmdbId: 5 });
  expect(seasons[0].episodes.map((episode: { name: string | null }) => episode.name)).toEqual(["Episode 1", "Episode 2", null, null]);
});

test("series and library give the day episodes were watched; today when none is given", async () => {
  const { call } = await setup();
  await call("watch", { tmdbId: 5, season: 1, episodes: "1", watchedAt: "2024-02-18" });
  await call("watch", { tmdbId: 5, season: 1, episodes: "1-2" }); // a rewatch keeps the first day
  const { seasons } = await call("series", { tmdbId: 5 });
  expect(seasons[0].episodes.map((episode: { watchedAt: string | null }) => episode.watchedAt)).toEqual([
    "2024-02-18",
    today(),
    null,
    null,
  ]);
  expect(await call("library", {})).toMatchObject([{ tmdbId: 5, lastWatchedAt: today() }]);
});

test("library filters: unwatchedOnly, statuses, sort by lastWatchedAt", async () => {
  const { call } = await setup();
  // Episodes 1-3 have aired.
  await call("watch", { tmdbId: 5, season: 1, episodes: "1-3", watchedAt: "2024-02-18" }); // caught up
  await call("watch", { tmdbId: 6, season: 1, episodes: "1", watchedAt: "2024-02-18" });
  await call("watch", { tmdbId: 7, season: 1, episodes: "1" }); // today, the most recent
  await call("set_status", { tmdbId: 8, status: "dropped" }); // never watched
  const ids = async (input: Record<string, unknown>) => (await call("library", input)).map((series: { tmdbId: number }) => series.tmdbId);

  expect(await ids({})).toEqual([5, 6, 7, 8]);
  expect(await ids({ unwatchedOnly: true })).toEqual([7, 6, 8]);
  expect(await ids({ unwatchedOnly: true, sort: "name" })).toEqual([6, 7, 8]);
  expect(await ids({ unwatchedOnly: true, statuses: ["watching"] })).toEqual([7, 6]);
  expect(await ids({ statuses: ["dropped"] })).toEqual([8]);
  expect(await ids({ sort: "lastWatchedAt" })).toEqual([7, 5, 6, 8]);
});

test("calendar: episodes airing in the next days in watched series, with the day watched and the spoiler shield", async () => {
  const { call, identity } = await setup();
  await call("watch", { tmdbId: 9, season: 1, episodes: "2" });
  await call("set_status", { tmdbId: 10, status: "dropped" });
  expect(await call("calendar", {})).toEqual([
    { airDate: today(), tmdbId: 9, series: "Series 9", season: 1, number: 2, absolute: 2, absoluteNumbering: false, name: "Episode 2", watchedAt: today() },
    { airDate: addDays(today(), 3), tmdbId: 9, series: "Series 9", season: 1, number: 3, absolute: 3, absoluteNumbering: false, name: "Episode 3", watchedAt: null },
  ]);

  identity.updatePreferences("u", { episodeTitles: "hideUnwatched" });
  const names = (await call("calendar", { days: 10 })).map((episode: { name: string | null }) => episode.name);
  expect(names).toEqual(["Episode 2", "Episode 3", null]);
});

test("rate a series and a season; null clears", async () => {
  const { call, repo } = await setup();
  expect(await call("rate", { tmdbId: 5, rating: 8 })).toBe("This series is not in your library");
  await call("set_status", { tmdbId: 5, status: "watchlist" });
  await call("rate", { tmdbId: 5, rating: 8 });
  await call("rate", { tmdbId: 5, season: 1, rating: 6 });
  await call("rate", { tmdbId: 5, rating: null });
  const tracked = await repo.find("u", 5);
  expect([tracked?.ratingOf(), tracked?.ratingOf(1)]).toEqual([null, 6]);
});
