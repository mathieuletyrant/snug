import { expect, test } from "bun:test";
import type { CatalogService } from "@/modules/catalog/application/catalog-service";
import type { Series } from "@/modules/catalog/domain/series";
import { TrackingService } from "@/modules/tracking/application/tracking-service";
import { DrizzleTrackedSeriesRepository } from "@/modules/tracking/infrastructure/drizzle-tracked-series-repository";
import { startOf } from "@/shared/day";
import { testDb } from "@/shared/testing";
import { ImportService } from "./import-service";

const series = (tmdbId: number, ended: boolean): Series => ({
  tmdbId,
  tvdbId: null,
  name: `Series ${tmdbId}`,
  year: 2020,
  overview: "",
  posterPath: null,
  backdropPath: null,
  ended,
  episodes: [
    { season: 1, number: 1, name: "", airDate: "2020-01-01" },
    { season: 1, number: 2, name: "", airDate: "2020-01-08" },
  ],
  fetchedAt: new Date(),
});

test("imports right away, then fetches the Series and applies the Completed rule", async () => {
  const { db } = testDb();
  const catalog = {
    ensure: async (id: number) => (id === 3 ? Promise.reject(new Error("TMDB down")) : series(id, id === 1)),
    getMany: async (ids: readonly number[]) => new Map(ids.map((id) => [id, series(id, id === 1)])),
  } as unknown as CatalogService;
  const tracking = new TrackingService(new DrizzleTrackedSeriesRepository(db), catalog);
  const importer = new ImportService(tracking, catalog);
  const watched = (showTmdbId: number, episodeNumber: number) => ({
    showTmdbId,
    seasonNumber: 1,
    episodeNumber,
    watchedAt: "2024-01-01T00:00:00Z",
  });

  const result = await importer.importJson("u", {
    library: [
      { tmdbId: 1, status: "in_progress" }, // ended, everything watched
      { tmdbId: 2, status: "completed" }, // still airing
      { tmdbId: 3, status: "in_progress" },
    ],
    episodeWatches: [watched(1, 1), watched(1, 2), watched(2, 1)],
  });
  expect(result).toEqual({ series: 3, watches: 3, unresolved: [] });
  await expect(importer.importJson("u", {})).rejects.toThrow(); // one import at a time

  while (importer.progressOf("u").running) await Bun.sleep(1);
  expect(importer.progressOf("u")).toEqual({ running: false, total: 3, done: 2, failed: 1 });
  const statuses = (await tracking.library("u")).map((card) => [card.seriesId, card.status]);
  expect(statuses).toEqual([
    [1, "completed"],
    [2, "watching"],
    [3, "watching"],
  ]);
});

test("an Export imported into an empty account exports the same", async () => {
  const { db } = testDb();
  const names: Record<number, string> = { 1: 'Love, Death & "Robots"', 2: "Dark", 3: "Severance" };
  const named = (id: number) => ({ ...series(id, false), name: names[id] ?? "" });
  const catalog = {
    ensure: async (id: number) => named(id),
    getMany: async (ids: readonly number[]) => new Map(ids.map((id) => [id, named(id)])),
  } as unknown as CatalogService;
  const tracking = new TrackingService(new DrizzleTrackedSeriesRepository(db), catalog);
  const importer = new ImportService(tracking, catalog);
  const watch = (number: number, day: string) => ({ season: 1, number, watchedAt: startOf(day) });
  await tracking.import("a", [
    { seriesId: 1, status: "watching", watches: [watch(1, "2024-02-18")], ratings: [{ season: 0, rating: 9 }, { season: 2, rating: 7 }] },
    { seriesId: 2, status: "saving", watches: [watch(2, "2024-03-01"), watch(1, "2024-02-28")], savingTarget: 5, absoluteNumbering: true },
    { seriesId: 3, status: "watchlist", watches: [] },
  ]);

  const csv = await importer.exportCsv("a");
  expect(csv).toBe(
    [
      "title,tmdb_id,season,episode,watched_at,status,rating,season_rating,saving_target,absolute_numbering",
      "Dark,2,1,1,2024-02-28,saving,,,5,true",
      "Dark,2,1,2,2024-03-01,saving,,,5,true",
      '"Love, Death & ""Robots""",1,1,1,2024-02-18,watching,9,,0,false',
      '"Love, Death & ""Robots""",1,2,,,watching,9,7,0,false',
      "Severance,3,,,,watchlist,,,0,false",
      "",
    ].join("\n"),
  );
  await importer.importCsv("b", csv);
  while (importer.progressOf("b").running) await Bun.sleep(1);
  expect(await importer.exportCsv("b")).toBe(csv);
});
