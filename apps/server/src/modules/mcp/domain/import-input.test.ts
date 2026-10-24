import { expect, test } from "bun:test";
import { MAX_EPISODES, parseEpisodes, toEntries } from "./import-input";

test("episode lists: single numbers and ranges", () => {
  expect(parseEpisodes("1-3,5, 8 - 9")).toEqual([1, 2, 3, 5, 8, 9]);
  expect(parseEpisodes("4")).toEqual([4]);
  expect(() => parseEpisodes("S01E01")).toThrow('"S01E01" is not a list of episodes like "1-10,12"');
  expect(() => parseEpisodes("5-2")).toThrow("not a valid range");
  expect(() => parseEpisodes("0")).toThrow("not a valid range");
});

test("a series given twice is merged, each episode once, with its own date", () => {
  const now = new Date("2026-10-24T12:00:00Z");
  const entries = toEntries(
    {
      dryRun: false,
      series: [
        { tmdbId: 1, seasons: [{ season: 1, episodes: "1-2", watchedAt: "2024-02-18" }] },
        { tmdbId: 1, status: "completed", seasons: [{ season: 1, episodes: "2-3" }] },
      ],
    },
    now,
  );
  expect(entries).toEqual([
    {
      seriesId: 1,
      status: "completed",
      watches: [
        { season: 1, number: 1, watchedAt: new Date("2024-02-18") },
        { season: 1, number: 2, watchedAt: new Date("2024-02-18") },
        { season: 1, number: 3, watchedAt: now },
      ],
    },
  ]);
});

test("too many episodes in one call is refused, asking to split", () => {
  const seasons = Array.from({ length: 11 }, (_, i) => ({ season: i + 1, episodes: "1-1000" }));
  expect(() => toEntries({ dryRun: false, series: [{ tmdbId: 1, seasons }] }, new Date())).toThrow(
    `More than ${MAX_EPISODES} episodes in one call: split it`,
  );
});
