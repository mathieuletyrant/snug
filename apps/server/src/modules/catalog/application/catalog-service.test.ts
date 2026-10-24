import { expect, test } from "bun:test";
import type { CatalogRepository, Series, SeriesSource } from "../domain/series";
import { CatalogService } from "./catalog-service";

const now = new Date("2026-10-24T12:00:00Z");
const series = (tmdbId: number, fetchedAt = now): Series => ({
  tmdbId,
  tvdbId: null,
  name: `Series ${tmdbId}`,
  year: 2020,
  overview: "",
  posterPath: null,
  backdropPath: null,
  ended: false,
  episodes: [],
  fetchedAt,
});

function setup(source: Partial<SeriesSource> = {}) {
  const store = new Map<number, Series>();
  const repo: CatalogRepository = {
    get: async (id) => store.get(id) ?? null,
    getMany: async (ids) => new Map(ids.flatMap((id) => (store.has(id) ? [[id, store.get(id)!] as const] : []))),
    save: async (s) => void store.set(s.tmdbId, s),
    setTvdbId: async (id, tvdbId) => void store.set(id, { ...store.get(id)!, tvdbId }),
    stale: async (ids, before) => ids.filter((id) => !store.has(id) || store.get(id)!.fetchedAt < before),
  };
  const fetched: number[] = [];
  const full: SeriesSource = {
    fetch: async (id) => {
      fetched.push(id);
      return series(id);
    },
    tvdbId: async () => null,
    search: async () => [],
    findByEpisode: async () => null,
    ...source,
  };
  return { catalog: new CatalogService(repo, full, () => now), store, fetched };
}

test("a Series is fetched on first use, then read from the cache", async () => {
  const { catalog, fetched } = setup();
  await catalog.ensure(1);
  await catalog.ensure(1);
  expect(fetched).toEqual([1]);
});

test("stale Series are refreshed; one failure skips that Series only", async () => {
  const { catalog, store } = setup({
    fetch: async (id) => {
      if (id === 3) throw new Error("TMDB is down");
      return series(id);
    },
  });
  store.set(1, series(1, new Date("2026-10-01T00:00:00Z")));
  store.set(2, series(2)); // fresh
  const refreshed: number[] = [];
  expect(await catalog.refreshStale([1, 2, 3], 1, async (id) => void refreshed.push(id))).toEqual({
    refreshed: 1,
    failed: 1,
  });
  expect(refreshed).toEqual([1]);
});

test("a hint resolves from the most reliable signal: TMDB id, episode ids, then the title", async () => {
  const { catalog } = setup({
    findByEpisode: async (id, source) => (source === "imdb_id" && id === "tt1" ? 50 : null),
    search: async () => [
      { tmdbId: 60, name: "Shrinking", year: 2015, overview: "", posterPath: null },
      { tmdbId: 61, name: "Shrinking", year: 2023, overview: "", posterPath: null },
      { tmdbId: 62, name: "Shrinking Down", year: 2023, overview: "", posterPath: null },
    ],
  });
  expect(await catalog.resolve({ tmdbId: 7, imdbEpisodeId: "tt1" })).toBe(7);
  expect(await catalog.resolve({ tvdbEpisodeId: "9", imdbEpisodeId: "tt1" })).toBe(50);
  expect(await catalog.resolve({ title: "shrinking", year: 2023 })).toBe(61);
  expect(await catalog.resolve({ title: "Shrinking" })).toBe(60);
  expect(await catalog.resolve({})).toBeNull();
});
