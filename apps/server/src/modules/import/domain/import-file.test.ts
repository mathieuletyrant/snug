import { expect, test } from "bun:test";
import { parseImportFile } from "./import-file";

test("maps library statuses and groups watches by series, skipping movies and specials", () => {
  const entries = parseImportFile({
    version: 1,
    library: [
      { tmdbId: 1, title: "A", type: "tv", status: "in_progress" },
      { tmdbId: 2, title: "B", type: "tv", status: "watchlist" },
      { tmdbId: 3, title: "Movie", type: "movie", status: "in_progress" },
    ],
    episodeWatches: [
      { showTmdbId: 1, seasonNumber: 1, episodeNumber: 1, watchedAt: "2024-12-17T11:39:12.000Z" },
      { showTmdbId: 1, seasonNumber: 0, episodeNumber: 1, watchedAt: "2024-12-17T11:39:12.000Z" },
      { showTmdbId: 4, seasonNumber: 2, episodeNumber: 3, watchedAt: "2024-12-18T11:39:12.000Z" },
    ],
    ratings: [],
  });
  expect(entries.map((entry) => [entry.seriesId, entry.status, entry.watches.length])).toEqual([
    [1, "watching", 1],
    [2, "watchlist", 0],
    [4, "watching", 1],
  ]);
  expect(entries[0]?.watches[0]?.watchedAt).toEqual(new Date("2024-12-17T11:39:12.000Z"));
});

test("rejects files that are not an export", () => {
  expect(() => parseImportFile({ library: "nope" })).toThrow();
});
