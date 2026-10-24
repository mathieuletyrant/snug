import { expect, test } from "bun:test";
import { DEFAULT_PREFERENCES, isTitleHidden } from "@snug/shared";

test("the spoiler shield hides unwatched titles, the next one only when asked", () => {
  const on = { ...DEFAULT_PREFERENCES, hideUnwatchedTitles: true };
  expect(isTitleHidden(DEFAULT_PREFERENCES, { watched: false, next: false })).toBe(false);
  expect(isTitleHidden(on, { watched: true, next: false })).toBe(false);
  expect(isTitleHidden(on, { watched: false, next: false })).toBe(true);
  expect(isTitleHidden(on, { watched: false, next: true })).toBe(false);
  expect(isTitleHidden({ ...on, showNextTitle: false }, { watched: false, next: true })).toBe(true);
});
