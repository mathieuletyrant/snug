import { expect, test } from "bun:test";
import { DEFAULT_PREFERENCES, type Preferences } from "@snug/shared";
import type { Series } from "@/modules/catalog/domain/series";
import type { TrackedSeries, TrackedSeriesRepository } from "@/modules/tracking/domain/tracked-series";
import { DrizzleTrackedSeriesRepository } from "@/modules/tracking/infrastructure/drizzle-tracked-series-repository";
import { testDb } from "@/shared/testing";
import { type CatalogPort, TrackingService } from "./tracking-service";

const now = new Date("2026-10-21T20:00:00Z");

function setup(series: Series[], preferences: Partial<Preferences> = {}) {
  const store = new Map<string, TrackedSeries>();
  const key = (u: string, s: number) => `${u}:${s}`;
  const repo: TrackedSeriesRepository = {
    find: async (u, s) => store.get(key(u, s)) ?? null,
    listByUser: async (u) => [...store.values()].filter((t) => t.userId === u),
    listBySeries: async (s) => [...store.values()].filter((t) => t.seriesId === s),
    seriesIdsWithStatus: async (st) => [...store.values()].filter((t) => st.includes(t.status)).map((t) => t.seriesId),
    save: async (t) => void store.set(key(t.userId, t.seriesId), t),
    delete: async (u, s) => void store.delete(key(u, s)),
  };
  const byId = new Map(series.map((s) => [s.tmdbId, s]));
  const catalog: CatalogPort = {
    ensure: async (id) => byId.get(id) ?? Promise.reject(new Error("unknown")),
    getMany: async (ids) => new Map(ids.flatMap((id) => (byId.has(id) ? [[id, byId.get(id)!] as const] : []))),
  };
  return new TrackingService(repo, catalog, () => ({ ...DEFAULT_PREFERENCES, ...preferences }), () => now);
}

const series = (tmdbId: number, ended: boolean, airDates: (string | null)[]): Series => ({
  tmdbId,
  tvdbId: null,
  name: `Series ${tmdbId}`,
  year: 2020,
  overview: "",
  posterPath: null,
  backdropPath: null,
  ended,
  episodes: airDates.map((airDate, i) => ({ season: 1, number: i + 1, name: `E${i + 1}`, airDate })),
  fetchedAt: now,
});

test("one click watches the Next Episode; the home splits Ready and Upcoming", async () => {
  const tracking = setup([series(1, false, ["2026-10-01", "2026-10-08", "2026-10-28"]), series(2, true, ["2020-01-01"])]);
  await tracking.track("u", 1);
  await tracking.track("u", 2);

  expect((await tracking.watchNext("u", 1)).number).toBe(1);
  await tracking.watchNext("u", 1);
  await expect(tracking.watchNext("u", 1)).rejects.toThrow(); // E3 has not aired

  const home = await tracking.home("u");
  expect(home.ready.map((c) => c.seriesId)).toEqual([2]);
  expect(home.upcoming.map((c) => [c.seriesId, c.next?.airDate])).toEqual([[1, "2026-10-28"]]);

  // Finishing an ended Series completes it and drops it from the home.
  await tracking.watchNext("u", 2);
  expect((await tracking.home("u")).ready).toEqual([]);
  expect((await tracking.detail("u", 2)).status).toBe("completed");
});

test("a media server Watch on an untracked Series starts tracking it", async () => {
  const tracking = setup([series(1, false, ["2026-10-01", "2026-10-08"])]);
  await tracking.watchEpisode("u", 1, { season: 1, number: 1 });
  const [card] = await tracking.library("u");
  expect(card).toMatchObject({ status: "watching", progress: { season: 1, number: 1 }, watchedCount: 1, airedCount: 2 });
});

test("import keeps existing Statuses and merges Watches", async () => {
  const tracking = setup([series(1, false, ["2026-10-01", "2026-10-08"])]);
  await tracking.track("u", 1, "paused");
  await tracking.import("u", [
    { seriesId: 1, status: "watching", watches: [{ season: 1, number: 2, watchedAt: now }] },
  ]);
  const detail = await tracking.detail("u", 1);
  expect(detail.status).toBe("paused");
  expect(detail.progress).toEqual({ season: 1, number: 2 });
});


test("adding to the Watchlist from another app never changes a Series already tracked", async () => {
  const tracking = setup([series(1, false, ["2026-10-01"]), series(2, false, ["2026-10-01"])]);
  await tracking.track("u", 2, "watching");

  expect(await tracking.addToWatchlist("u", 1)).toEqual({ status: "watchlist", added: true });
  expect(await tracking.addToWatchlist("u", 1)).toEqual({ status: "watchlist", added: false });
  expect(await tracking.addToWatchlist("u", 2)).toEqual({ status: "watching", added: false });
  await expect(tracking.addToWatchlist("u", 99)).rejects.toThrow();
});

test("catching up watches every aired Episode before the one marked, across seasons", async () => {
  const twoSeasons: Series = {
    ...series(1, false, []),
    episodes: [
      { season: 1, number: 1, name: "", airDate: "2026-01-01" },
      { season: 1, number: 2, name: "", airDate: "2026-01-08" },
      { season: 2, number: 1, name: "", airDate: "2026-10-01" },
      { season: 2, number: 2, name: "", airDate: "2026-10-08" },
      { season: 2, number: 3, name: "", airDate: "2026-10-15" },
    ],
  };
  const tracking = setup([twoSeasons]);
  await tracking.watchEpisode("u", 1, { season: 1, number: 1 });

  await tracking.watchThrough("u", 1, { season: 2, number: 2 });

  const watched = (await tracking.detail("u", 1)).seasons.flatMap((s) =>
    s.episodes.filter((e) => e.watched).map((e) => `${s.number}x${e.number}`),
  );
  expect(watched).toEqual(["1x1", "1x2", "2x1", "2x2"]);
});

test("Saving up waits in Upcoming, then goes first in Ready once enough is out", async () => {
  const tracking = setup([
    series(1, false, ["2026-10-01", "2026-10-08", "2026-10-28"]),
    series(2, false, ["2026-10-01", "2026-10-08"]),
    series(3, false, ["2026-10-01"]),
  ]);
  await tracking.track("u", 1, "saving", 0); // the season's last Episode airs on 28 Oct
  await tracking.track("u", 2, "saving", 0); // the whole season is out
  await tracking.track("u", 3);

  const home = await tracking.home("u");
  expect(home.ready.map((c) => c.seriesId)).toEqual([2, 3]);
  expect(home.upcoming.map((c) => [c.seriesId, c.saving?.out, c.saving?.needed])).toEqual([[1, 2, 3]]);

  // Watching an Episode ends the saving; undoing it saves up again.
  const ep = await tracking.watchNext("u", 2);
  expect((await tracking.detail("u", 2)).status).toBe("watching");
  await tracking.unwatchEpisode("u", 2, ep, ep.previousStatus);
  expect((await tracking.detail("u", 2)).status).toBe("saving");
});

test("overlapping Watches of one Series are all kept", async () => {
  const { db } = testDb();
  const catalog: CatalogPort = {
    ensure: async () => series(1, false, ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]),
    getMany: async () => new Map(),
  };
  const tracking = new TrackingService(new DrizzleTrackedSeriesRepository(db), catalog, undefined, () => now);

  await Promise.all([1, 2, 3, 4].map((number) => tracking.watchEpisode("u", 1, { season: 1, number })));

  expect((await tracking.detail("u", 1)).seasons[0]?.episodes.filter((e) => e.watched)).toHaveLength(4);
});

test("new Episodes on a day: Watching Series only, Episodes not watched yet", async () => {
  const tracking = setup([series(1, false, ["2026-10-17", "2026-10-24"]), series(2, false, ["2026-10-24"])]);
  await tracking.track("u", 1);
  await tracking.track("u", 2, "paused");
  await tracking.track("v", 1);
  await tracking.watchEpisode("v", 1, { season: 1, number: 2 });

  const found = await tracking.newEpisodesOn(["2026-10-24"]);
  expect(found.map((f) => [f.userId, f.series.tmdbId, f.episodes.map((e) => e.number)])).toEqual([["u", 1, [2]]]);
});

test("home: fresh Episodes first, undated Upcoming hidden on demand", async () => {
  const catalog = [
    series(1, false, ["2026-10-01", "2026-10-02"]), // binged long ago
    series(2, false, ["2026-10-01", "2026-10-20"]), // E2 out yesterday, while waiting for it
    series(3, false, ["2026-10-01", null]), // caught up, no date yet
  ];
  const tracking = setup(catalog, { hideUndatedUpcoming: true });
  await tracking.watchEpisode("u", 2, { season: 1, number: 1 }, new Date("2026-10-14T21:00:00Z"));
  await tracking.watchEpisode("u", 1, { season: 1, number: 1 }, new Date("2026-10-15T21:00:00Z"));
  await tracking.watchEpisode("u", 3, { season: 1, number: 1 });

  const home = await tracking.home("u");
  expect(home.ready.map((c) => [c.seriesId, c.fresh, c.airing])).toEqual([
    [2, true, { kind: "ready", left: 1 }],
    [1, false, { kind: "ready", left: 1 }],
  ]);
  expect(home.upcoming).toEqual([]);
});
