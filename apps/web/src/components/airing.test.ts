import { expect, test } from "bun:test";
import { airing, shortDay } from "./airing";

const now = new Date(2026, 9, 22, 21, 30); // Thu 22 Oct 2026, evening
const ep = (airDate: string | null) => ({ season: 2, number: 3, name: "x", airDate });

test("a Watching series is ready, dated or TBA from its Next Episode", () => {
  expect(airing({ next: ep("2026-10-22"), airedCount: 10, watchedCount: 7 }, now)).toEqual({ kind: "ready", left: 3 });
  expect(airing({ next: ep("2026-10-30"), airedCount: 10, watchedCount: 10 }, now)).toEqual({ kind: "dated", date: "2026-10-30" });
  expect(airing({ next: ep(null), airedCount: 10, watchedCount: 10 }, now)).toEqual({ kind: "tba" });
  expect(airing({ next: null, airedCount: 10, watchedCount: 10 }, now)).toEqual({ kind: "tba" });
});

test("badge dates stay short", () => {
  expect(shortDay("2026-10-22", now)).toBe("Today");
  expect(shortDay("2026-10-23", now)).toBe("Tomorrow");
  expect(shortDay("2026-10-26", now)).toBe(new Date(2026, 9, 26).toLocaleDateString(undefined, { weekday: "short" }));
  expect(shortDay("2026-11-30", now)).toBe(new Date(2026, 10, 30).toLocaleDateString(undefined, { day: "numeric", month: "short" }));
});
