import { describe, expect, test } from "bun:test";
import { CsvImportError, csvRowsToEntries, parseCsvImport, readCsv } from "./csv-import";

const now = new Date("2026-10-21T12:00:00Z");

describe("readCsv", () => {
  test("handles quotes, escaped quotes, CRLF, BOM and blank lines", () => {
    expect(readCsv('﻿title,status\r\n"Love, Death & Robots",watching\r\n\r\n"The ""Office""",\n')).toEqual([
      ["title", "status"],
      ["Love, Death & Robots", "watching"],
      ['The "Office"', ""],
    ]);
  });
});

describe("parseCsvImport", () => {
  test("reads the documented columns, in any order and case", () => {
    const rows = parseCsvImport("Status,Episode,Season,TMDB_ID,Title,Watched_At\n,1,1,95396,Severance,2024-02-18\npaused,,,,The Bear,\n");
    expect(rows).toEqual([
      { line: 2, title: "Severance", tmdbId: 95396, season: 1, number: 1, watchedAt: new Date("2024-02-18") },
      { line: 3, title: "The Bear", tmdbId: undefined, season: undefined, number: undefined, status: "paused" },
    ]);
  });

  test("reports every bad line at once", () => {
    try {
      parseCsvImport("title,season,episode,watched_at,status\n,1,1,,\nDark,1,,,\nDark,1,2,yesterday,binging\n");
      throw new Error("should have failed");
    } catch (e) {
      expect(e).toBeInstanceOf(CsvImportError);
      expect((e as CsvImportError).problems).toEqual([
        "Line 2: needs a title or a tmdb_id",
        "Line 3: season and episode go together (season alone only with a season_rating)",
        "Line 4: watched_at is not a date (use 2024-02-18)",
        'Line 4: unknown status "binging"',
      ]);
    }
  });

  test("rejects a file without a header naming the columns", () => {
    expect(() => parseCsvImport("Severance,1,1\n")).toThrow(CsvImportError);
  });
});

test("csvRowsToEntries groups by series and infers the status", () => {
  const rows = parseCsvImport(
    "title,tmdb_id,season,episode,watched_at,status\nSeverance,,1,1,2024-02-18,\nSeverance,,1,2,,\nThe Bear,,,,,\nDark,,1,1,,dropped\nUnknown show,,1,1,,\n",
  );
  const ids: Record<string, number> = { Severance: 1, "The Bear": 2, Dark: 3 };
  const entries = csvRowsToEntries(rows, (title) => ids[title] ?? null, now);
  expect(entries.map((entry) => [entry.seriesId, entry.status, entry.watches.length])).toEqual([
    [1, "watching", 2],
    [2, "watchlist", 0],
    [3, "dropped", 1],
  ]);
  expect(entries[0]?.watches[1]?.watchedAt).toEqual(now);
});

test("ratings: the Series' and a season's, with or without an episode, the last one winning", () => {
  const rows = parseCsvImport(
    "tmdb_id,season,episode,rating,season_rating\n1,1,1,7,\n1,,,9,\n1,2,,,8\n1,2,3,,6\n",
  );
  const [entry] = csvRowsToEntries(rows, () => null, now);
  expect(entry?.ratings).toEqual([
    { season: 0, rating: 9 },
    { season: 2, rating: 6 },
  ]);
  expect(entry?.watches.length).toBe(2);
  expect(() => parseCsvImport("tmdb_id,rating\n1,11\n")).toThrow("rating must be a whole number from 1 to 10");
});
