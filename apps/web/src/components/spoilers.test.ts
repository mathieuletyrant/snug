import { expect, test } from "bun:test";
import { DEFAULT_PREFERENCES, isTitleHidden } from "@snug/shared";

test("the spoiler shield hides unwatched titles, the next one only with Hide all", () => {
  const titles = (episodeTitles: "show" | "hideUnwatched" | "hideAll") => ({ ...DEFAULT_PREFERENCES, episodeTitles });
  expect(isTitleHidden(DEFAULT_PREFERENCES, { watched: false, next: false })).toBe(false);
  expect(isTitleHidden(titles("hideUnwatched"), { watched: true, next: false })).toBe(false);
  expect(isTitleHidden(titles("hideUnwatched"), { watched: false, next: false })).toBe(true);
  expect(isTitleHidden(titles("hideUnwatched"), { watched: false, next: true })).toBe(false);
  expect(isTitleHidden(titles("hideAll"), { watched: false, next: true })).toBe(true);
});
