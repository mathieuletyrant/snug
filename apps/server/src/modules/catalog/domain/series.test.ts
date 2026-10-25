import { expect, test } from "bun:test";
import { numberAbsolutely } from "./series";

const seasons = (...ranges: [season: number, from: number, to: number][]) =>
  ranges.flatMap(([season, from, to]) => Array.from({ length: to - from + 1 }, (_, i) => ({ season, number: from + i })));

test("seasons numbered from 1 count on from the seasons before", () => {
  const absolute = numberAbsolutely(seasons([1, 1, 26], [2, 1, 7], [3, 1, 11]));
  expect(absolute({ season: 1, number: 5 }).absolute).toBe(5);
  expect(absolute({ season: 2, number: 1 }).absolute).toBe(27);
  expect(absolute({ season: 3, number: 11 }).absolute).toBe(44);
});

test("seasons TMDB already numbers across the Series keep their numbers", () => {
  const absolute = numberAbsolutely(seasons([1, 1, 61], [2, 62, 77], [23, 1156, 1180]));
  expect(absolute({ season: 2, number: 62 }).absolute).toBe(62);
  expect(absolute({ season: 23, number: 1156 }).absolute).toBe(1156);
});

test("a season missing its first Episode still counts on", () => {
  const absolute = numberAbsolutely(seasons([1, 1, 26], [2, 2, 7]));
  expect(absolute({ season: 2, number: 2 }).absolute).toBe(28);
});
