import { expect, test } from "bun:test";
import type { SeriesDetail } from "@snug/shared";
import { earlierUnwatched } from "./episodes";

const ep = (number: number, watched: boolean, aired = true) => ({ number, name: "", airDate: null, watched, aired });

test("counts the aired, unwatched Episodes before one, across seasons", () => {
  const seasons: SeriesDetail["seasons"] = [
    { number: 1, episodes: [ep(1, true), ep(2, false), ep(3, false)] },
    { number: 2, episodes: [ep(1, false), ep(2, false), ep(3, false, false)] },
  ];
  expect(earlierUnwatched(seasons, 2, 2)).toBe(3); // S01E02, S01E03, S02E01
  expect(earlierUnwatched(seasons, 1, 2)).toBe(0);
  expect(earlierUnwatched(seasons, 2, 4)).toBe(4); // S02E03 has not aired
});
