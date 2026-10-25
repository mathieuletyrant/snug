import { expect, test } from "bun:test";
import { en } from "@/i18n/en";
import { fr } from "@/i18n/fr";
import { airing, isNew, relativeDay, shortDay } from "./airing";

const now = new Date(2026, 9, 22, 21, 30); // Thu 22 Oct 2026, evening
const ep = (airDate: string | null) => ({ season: 2, number: 3, name: "x", airDate });

test("a Watching series is ready, dated or TBA from its Next Episode", () => {
  expect(airing({ next: ep("2026-10-22"), airedCount: 10, watchedCount: 7 }, now)).toEqual({ kind: "ready", left: 3 });
  expect(airing({ next: ep("2026-10-30"), airedCount: 10, watchedCount: 10 }, now)).toEqual({ kind: "dated", date: "2026-10-30" });
  expect(airing({ next: ep(null), airedCount: 10, watchedCount: 10 }, now)).toEqual({ kind: "tba" });
  expect(airing({ next: null, airedCount: 10, watchedCount: 10 }, now)).toEqual({ kind: "tba" });
});

test("badge dates stay short, in the app's language", () => {
  expect(shortDay(en, "2026-10-22", now)).toBe("Today");
  expect(shortDay(fr, "2026-10-23", now)).toBe("Demain");
  expect(shortDay(en, "2026-10-26", now)).toBe("Mon");
  expect(shortDay(fr, "2026-11-30", now)).toBe("30 nov.");
});

test("relative days, and lowered to follow a word", () => {
  expect(relativeDay(en, "2026-10-25", now)).toBe("In 3 days");
  expect(relativeDay(fr, "2026-10-25", now, true)).toBe("dans 3 jours");
  expect(relativeDay(en, "2026-12-03", now, true)).toBe("Dec 3");
  expect(relativeDay(fr, null, now)).toBe("Date à venir");
});

test("an Episode is new when it aired lately, after the last Watch", () => {
  const watchedOn = (day: number) => new Date(2026, 9, day, 21).toISOString();
  expect(isNew({ next: ep("2026-10-20"), lastWatchedAt: watchedOn(14) }, 7, now)).toBe(true);
  expect(isNew({ next: ep("2026-10-20"), lastWatchedAt: watchedOn(21) }, 7, now)).toBe(false); // binging
  expect(isNew({ next: ep("2026-10-12"), lastWatchedAt: watchedOn(5) }, 7, now)).toBe(false); // too old
  expect(isNew({ next: ep("2026-10-12"), lastWatchedAt: watchedOn(5) }, 14, now)).toBe(true);
  expect(isNew({ next: ep("2026-10-25"), lastWatchedAt: watchedOn(14) }, 7, now)).toBe(false); // not out yet
  expect(isNew({ next: ep("2026-10-20"), lastWatchedAt: null }, 7, now)).toBe(false); // never started
});
