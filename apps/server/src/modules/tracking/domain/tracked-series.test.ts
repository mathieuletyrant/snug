import { describe, expect, test } from "bun:test";
import type { SavingTarget } from "@snug/shared";
import { type Status, TrackedSeries } from "./tracked-series";

const now = new Date("2026-10-21T20:00:00Z");
const today = "2026-10-21";
const ep = (season: number, number: number, airDate: string | null = "2020-01-01") => ({ season, number, airDate });
const episodes = [ep(1, 1), ep(1, 2), ep(2, 1), ep(2, 2)];

describe("TrackedSeries", () => {
  test("progress is the furthest Episode watched, regardless of rewatches", () => {
    const t = TrackedSeries.start("u", 1, "watching", now);
    t.watch(ep(2, 1), now);
    t.watch(ep(1, 1), new Date(now.getTime() + 1000));
    expect(t.progress).toEqual({ season: 2, number: 1 });
    expect(t.nextEpisode(episodes)).toEqual(ep(2, 2));
  });

  test("next Episode is S01E01 when nothing is watched", () => {
    expect(TrackedSeries.start("u", 1, "watching", now).nextEpisode(episodes)).toEqual(ep(1, 1));
  });

  test("a Watch pulls Paused, Saving up and Watchlist back to Watching, never Dropped", () => {
    const cases = [
      ["paused", "watching"],
      ["saving", "watching"],
      ["watchlist", "watching"],
      ["dropped", "dropped"],
    ] as const;
    for (const [from, to] of cases) {
      const t = TrackedSeries.start("u", 1, from, now);
      t.watch(ep(1, 1), now);
      expect(t.status).toBe(to);
    }
  });

  test("Completed only when the Series has ended and nothing is left after the Progress", () => {
    const t = TrackedSeries.start("u", 1, "watching", now);
    t.watch(ep(2, 2), now); // gaps before the Progress don't count
    t.reconcile({ ended: false, episodes }, today);
    expect(t.status).toBe("watching");
    t.reconcile({ ended: true, episodes }, today);
    expect(t.status).toBe("completed");
  });

  test("a revived Series returns from Completed to Watching", () => {
    const t = TrackedSeries.start("u", 1, "completed", now);
    t.watch(ep(2, 2), now);
    t.reconcile({ ended: false, episodes: [...episodes, ep(3, 1, "2026-10-20")] }, today);
    expect(t.status).toBe("watching");
  });

  test("a picked Status follows the Completed rule right away", () => {
    const t = TrackedSeries.start("u", 1, "watching", now);
    t.watch(ep(1, 1), now);
    t.choose("completed", { ended: true, episodes }, today); // Episodes left
    expect(t.status).toBe("watching");
    t.watch(ep(2, 2), now);
    t.choose("watching", { ended: true, episodes }, today); // nothing left
    expect(t.status).toBe("completed");
  });

  test("choosable: no Completed while Episodes are left, only Completed once done", () => {
    const t = TrackedSeries.start("u", 1, "watching", now);
    t.watch(ep(1, 1), now);
    expect(t.standing({ ended: true, episodes }, today).choosable).toEqual(["watchlist", "watching", "saving", "paused", "dropped"]);
    t.watch(ep(2, 2), now);
    expect(t.standing({ ended: true, episodes }, today).choosable).toEqual(["watchlist", "paused", "completed", "dropped"]);
    expect(t.standing({ ended: true, episodes: [] }, today).choosable).toHaveLength(6); // Catalog not fetched yet
  });

  test("Saving up on an ended Series with nothing left becomes Completed", () => {
    const t = TrackedSeries.start("u", 1, "saving", now);
    t.merge([{ ...ep(2, 2), watchedAt: now }]);
    t.reconcile({ ended: true, episodes }, today);
    expect(t.status).toBe("completed");
  });

  test("imported Watches don't move the Status", () => {
    const t = TrackedSeries.start("u", 1, "paused", now);
    t.merge([{ ...ep(1, 1), watchedAt: now }]);
    expect(t.status).toBe("paused");
    expect(t.progress).toEqual({ season: 1, number: 1 });
  });

  test("Paused and Dropped are never reconciled", () => {
    const t = TrackedSeries.start("u", 1, "paused", now);
    t.reconcile({ ended: true, episodes }, today);
    expect(t.status).toBe("paused");
  });
});

test("airing: Ready with the Episodes out after the Progress, dated, or TBA", () => {
  const t = TrackedSeries.start("u", 1, "watching", now);
  t.watch(ep(1, 1), now);
  t.watch(ep(2, 1), now); // S01E02 skipped: a gap before the Progress doesn't count
  const list = [ep(1, 1), ep(1, 2), ep(2, 1), ep(2, 2, "2026-10-14"), ep(2, 3, "2026-10-21"), ep(2, 4, "2026-10-28")];
  const airing = (episodes: typeof list) => t.standing({ ended: false, episodes }, today).airing;
  expect(airing(list)).toEqual({ kind: "ready", left: 2 });
  t.watch(ep(2, 3), now);
  expect(airing(list)).toEqual({ kind: "dated", date: "2026-10-28" });
  expect(airing([...list.slice(0, 5), ep(2, 4, null)])).toEqual({ kind: "tba" });
  expect(airing(list.slice(0, 5))).toEqual({ kind: "tba" }); // nothing after the Progress
});

test("an Episode is new when it aired lately, after the last Watch", () => {
  const isNew = (airDate: string | null, lastWatch: string | null, days = 7) => {
    const t = TrackedSeries.start("u", 1, "watching", now);
    if (lastWatch) t.watch(ep(1, 1), new Date(`${lastWatch}T21:00:00Z`));
    return t.standing({ ended: false, episodes: [ep(1, 1), ep(1, 2, airDate)] }, today, days).fresh;
  };
  expect(isNew("2026-10-20", "2026-10-14")).toBe(true);
  expect(isNew("2026-10-20", "2026-10-21")).toBe(false); // binging
  expect(isNew("2026-10-12", "2026-10-05")).toBe(false); // too old
  expect(isNew("2026-10-12", "2026-10-05", 14)).toBe(true);
  expect(isNew("2026-10-25", "2026-10-14")).toBe(false); // not out yet
  expect(isNew("2026-10-20", "2026-10-14", 0)).toBe(false); // New mode off
});

test("Saving up a full season: reached once every Episode of the next season has aired", () => {
  // Season 1 watched; season 2 has 3 Episodes, 2 aired, the last one on 28 Oct.
  const list = [ep(1, 1), ep(2, 1, "2026-10-07"), ep(2, 2, "2026-10-14"), ep(2, 3, "2026-10-28")];
  const t = TrackedSeries.start("u", 1, "watching", now);
  t.watch(ep(1, 1), now);
  t.choose("saving", { ended: false, episodes: list }, today, 0);
  const saving = (day: string) => t.standing({ ended: false, episodes: list }, day).saving;
  expect(saving(today)).toEqual({ target: 0, out: 2, needed: 3, reached: false, completeOn: "2026-10-28" });
  expect(saving("2026-10-28")?.reached).toBe(true);
});

test("Saving up a number of Episodes counts across seasons", () => {
  const list = [ep(1, 1), ep(1, 2), ep(2, 1, "2026-10-07"), ep(2, 2, "2026-11-04")];
  const t = TrackedSeries.start("u", 1, "saving", now);
  t.choose("saving", { ended: false, episodes: list }, today, 3);
  expect(t.standing({ ended: false, episodes: list }, today).saving).toEqual({
    target: 3,
    out: 3,
    needed: 3,
    reached: true,
    completeOn: "2026-10-07",
  });
});

test("Ready: Watching with the Next Episode aired, Saving up with enough saved, never another Status", () => {
  // S01E01 watched; S01E02 to S01E04 aired, S01E05 not yet.
  const list = [ep(1, 1), ep(1, 2), ep(1, 3), ep(1, 4), ep(1, 5, "2026-10-28")];
  const ready = (status: Status, savingTarget?: SavingTarget) => {
    const t = TrackedSeries.start("u", 1, "watching", now);
    t.watch(ep(1, 1), now);
    t.choose(status, { ended: false, episodes: list }, today, savingTarget);
    const s = t.standing({ ended: false, episodes: list }, today);
    return [s.airing.kind, s.ready];
  };
  expect(ready("watching")).toEqual(["ready", true]);
  expect(ready("saving", 0)).toEqual(["ready", false]); // the Next Episode is out, but not the whole season
  expect(ready("saving", 3)).toEqual(["ready", true]);
  expect(ready("paused")).toEqual(["ready", false]);
  expect(ready("watchlist")).toEqual(["ready", false]);
});

test("ratings: the whole Series or a season, out of 10, cleared with null", () => {
  const t = TrackedSeries.start("u", 1, "watching", new Date());
  t.rate({ rating: 8 });
  t.rate({ rating: 6, season: 2 });
  expect(t.ratings).toEqual([
    { season: 0, rating: 8 },
    { season: 2, rating: 6 },
  ]);
  t.rate({ rating: null, season: 2 });
  expect(t.ratingOf(2)).toBeNull();
  expect(() => t.rate({ rating: 0 })).toThrow(RangeError);
  expect(() => t.rate({ rating: 7.5 })).toThrow(RangeError);
});
