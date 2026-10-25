import { describe, expect, test } from "bun:test";
import { availability, TrackedSeries } from "./tracked-series";

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
    expect(t.choosable({ ended: true, episodes }, today)).toEqual(["watchlist", "watching", "saving", "paused", "dropped"]);
    t.watch(ep(2, 2), now);
    expect(t.choosable({ ended: true, episodes }, today)).toEqual(["watchlist", "paused", "completed", "dropped"]);
    expect(t.choosable({ ended: true, episodes: [] }, today)).toHaveLength(6); // Catalog not fetched yet
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

test("availability: Ready once the Next Episode has aired, Upcoming otherwise", () => {
  expect(availability(ep(1, 1, "2026-10-21"), today)).toBe("ready");
  expect(availability(ep(1, 1, "2026-10-22"), today)).toBe("upcoming");
  expect(availability(ep(1, 1, null), today)).toBe("upcoming");
  expect(availability(null, today)).toBe("upcoming");
});

test("Saving up a full season: reached once every Episode of the next season has aired", () => {
  // Season 1 watched; season 2 has 3 Episodes, 2 aired, the last one on 28 Oct.
  const list = [ep(1, 1), ep(2, 1, "2026-10-07"), ep(2, 2, "2026-10-14"), ep(2, 3, "2026-10-28")];
  const t = TrackedSeries.start("u", 1, "watching", now);
  t.watch(ep(1, 1), now);
  t.choose("saving", { ended: false, episodes: list }, today, 0);
  expect(t.saving(list, today)).toEqual({ target: 0, out: 2, needed: 3, reached: false, completeOn: "2026-10-28" });
  expect(t.saving(list, "2026-10-28").reached).toBe(true);
});

test("Saving up a number of Episodes counts across seasons", () => {
  const list = [ep(1, 1), ep(1, 2), ep(2, 1, "2026-10-07"), ep(2, 2, "2026-11-04")];
  const t = TrackedSeries.start("u", 1, "saving", now);
  t.choose("saving", { ended: false, episodes: list }, today, 3);
  expect(t.saving(list, today)).toEqual({ target: 3, out: 3, needed: 3, reached: true, completeOn: "2026-10-07" });
});
