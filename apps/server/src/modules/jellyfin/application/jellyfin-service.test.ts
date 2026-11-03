import { expect, test } from "bun:test";
import { DEFAULT_PREFERENCES } from "@snug/shared";
import type { CatalogService } from "@/modules/catalog/application/catalog-service";
import type { IdentityService } from "@/modules/identity/application/identity-service";
import type { Series } from "@/modules/catalog/domain/series";
import type { Notification, Notifier } from "@/modules/notifications/application/notification-service";
import { TrackingService } from "@/modules/tracking/application/tracking-service";
import { DrizzleTrackedSeriesRepository } from "@/modules/tracking/infrastructure/drizzle-tracked-series-repository";
import { testDb } from "@/shared/testing";
import { jellyfinEvents } from "@/modules/jellyfin/infrastructure/schema";
import { JellyfinService } from "./jellyfin-service";

function setup() {
  const { db } = testDb();
  const identity = { webhookTokens: { userIdOf: () => "u" }, nameOf: () => "Mathieu" } as unknown as IdentityService;
  const service = new JellyfinService(db, identity, {} as CatalogService, {} as TrackingService, {} as Notifier);
  return { db, service };
}

const watched = (n: number) => ({
  userId: "u",
  receivedAt: new Date(),
  summary: `Severance S01E${n}`,
  outcome: "watched" as const,
  message: "Marked as watched",
  payload: "{}",
});

test("a burst of ignored calls never pushes Watched ones out of the history", async () => {
  const { db, service } = setup();
  db.insert(jellyfinEvents).values(Array.from({ length: 150 }, (_, i) => watched(i))).run();

  for (let i = 0; i < 120; i++) await service.handle("token", { NotificationType: "UserDataSaved", Name: "Episode 1" });

  const events = service.events("u");
  expect(events.filter((event) => event.outcome === "watched")).toHaveLength(150);
  expect(events.filter((event) => event.outcome === "ignored")).toHaveLength(100);
  // Only the 100 latest Watched calls keep their raw payload.
  expect(events.filter((event) => event.outcome === "watched" && event.payload)).toHaveLength(100);
});

test("a Watch of an Episode newer than the Catalog refreshes the Series, marks it, and says what's next", async () => {
  const { db } = testDb();
  const episode = (number: number, airDate: string) => ({ season: 1, number, name: `E${number}`, airDate });
  const cached: Series = {
    tmdbId: 1,
    tvdbId: null,
    name: "Severance",
    year: 2022,
    overview: "",
    posterPath: null,
    backdropPath: null,
    ended: false,
    episodes: [episode(1, "2020-01-01"), episode(2, "2020-01-08")],
    fetchedAt: new Date(),
  };
  let current = cached;
  const catalog = {
    resolve: async (hint: { tmdbId?: number }) => hint.tmdbId ?? null,
    ensure: async () => current,
    refresh: async () => (current = { ...cached, episodes: [...cached.episodes, episode(3, "2020-01-15"), episode(4, "2999-01-01")] }),
  } as unknown as CatalogService;
  const tracking = new TrackingService(new DrizzleTrackedSeriesRepository(db), catalog);
  const identity = {
    webhookTokens: { userIdOf: () => "u" },
    nameOf: () => "U",
    preferences: () => DEFAULT_PREFERENCES,
  } as unknown as IdentityService;
  const sent = Promise.withResolvers<Notification>();
  const notifier: Notifier = { notify: async (_, n) => sent.resolve(n) };
  const service = new JellyfinService(db, identity, catalog, tracking, notifier);

  const result = await service.handle("token", {
    NotificationType: "PlaybackStop",
    PlayedToCompletion: true,
    ItemType: "Episode",
    SeriesName: "Severance",
    SeriesProvider_tmdb: "1",
    SeasonNumber: 1,
    EpisodeNumber: 3,
  });

  expect(result.outcome).toBe("watched");
  expect((await tracking.detail("u", 1)).progress).toEqual({ season: 1, number: 3, absolute: 3 });
  expect(await sent.promise).toMatchObject({ title: "✓ Severance S01E03", body: "Next: S01E04 on 2999-01-01" });
});

test("the UserDataSaved call that follows a finished Episode is ignored, but a later rewatch is not", async () => {
  const { db } = testDb();
  const series: Series = {
    tmdbId: 1,
    tvdbId: null,
    name: "Vampire Diaries",
    year: 2009,
    overview: "",
    posterPath: null,
    backdropPath: null,
    ended: true,
    episodes: [{ season: 7, number: 21, name: "E21", airDate: "2016-05-06" }],
    fetchedAt: new Date(),
  };
  const catalog = {
    resolve: async (hint: { tmdbId?: number }) => hint.tmdbId ?? null,
    ensure: async () => series,
    refresh: async () => series,
  } as unknown as CatalogService;
  const tracking = new TrackingService(new DrizzleTrackedSeriesRepository(db), catalog);
  const identity = {
    webhookTokens: { userIdOf: () => "u" },
    nameOf: () => "U",
    preferences: () => DEFAULT_PREFERENCES,
  } as unknown as IdentityService;
  const notifications: Notification[] = [];
  const notifier: Notifier = { notify: async (_, notification) => void notifications.push(notification) };
  let now = new Date("2026-11-01T20:59:28Z");
  const service = new JellyfinService(db, identity, catalog, tracking, notifier, () => now);

  const episode = { ItemType: "Episode", SeriesName: "Vampire Diaries", SeriesProvider_tmdb: "1", SeasonNumber: 7, EpisodeNumber: 21 };
  const stop = { ...episode, NotificationType: "PlaybackStop", PlayedToCompletion: true };
  const markedPlayed = { ...episode, NotificationType: "UserDataSaved", Played: true, SaveReason: "TogglePlayed" };

  expect((await service.handle("token", stop)).outcome).toBe("watched");
  now = new Date(now.getTime() + 1000);
  expect(await service.handle("token", markedPlayed)).toEqual({ outcome: "ignored", message: "Already marked as watched a moment ago" });
  await Bun.sleep(0);
  expect(notifications).toHaveLength(1);

  now = new Date(now.getTime() + 2 * 60 * 60_000);
  expect((await service.handle("token", stop)).outcome).toBe("watched");
});

test("starting a Series Snug doesn't follow adds it to Watching; one already followed keeps its Status", async () => {
  const { db } = testDb();
  const series = (tmdbId: number, name: string): Series => ({
    tmdbId,
    tvdbId: null,
    name,
    year: 2026,
    overview: "",
    posterPath: null,
    backdropPath: null,
    ended: false,
    episodes: [
      { season: 1, number: 1, name: "E1", airDate: "2026-01-01" },
      { season: 1, number: 2, name: "E2", airDate: "2026-01-08" },
    ],
    fetchedAt: new Date(),
  });
  const catalog = {
    resolve: async (hint: { tmdbId?: number }) => hint.tmdbId ?? null,
    ensure: async (tmdbId: number) => series(tmdbId, `Series ${tmdbId}`),
    refresh: async (tmdbId: number) => series(tmdbId, `Series ${tmdbId}`),
  } as unknown as CatalogService;
  const tracking = new TrackingService(new DrizzleTrackedSeriesRepository(db), catalog);
  const identity = {
    webhookTokens: { userIdOf: () => "u" },
    nameOf: () => "U",
    preferences: () => DEFAULT_PREFERENCES,
  } as unknown as IdentityService;
  const notifications: Notification[] = [];
  const notifier: Notifier = { notify: async (_, notification) => void notifications.push(notification) };
  const service = new JellyfinService(db, identity, catalog, tracking, notifier);
  const start = (tmdbId: number) =>
    service.handle("token", {
      NotificationType: "PlaybackStart",
      ItemType: "Episode",
      SeriesName: `Series ${tmdbId}`,
      SeriesProvider_tmdb: String(tmdbId),
      SeasonNumber: 1,
      EpisodeNumber: 1,
    });

  // Untracked: Watching, nothing marked watched yet.
  expect(await start(1)).toEqual({ outcome: "added", message: "Series 1 added to Watching" });
  const added = await tracking.detail("u", 1);
  expect(added.status).toBe("watching");
  expect(added.progress).toBeNull();

  // The Watchlist moves to Watching; a paused Series stays paused.
  await tracking.track("u", 2, "watchlist");
  expect((await start(2)).outcome).toBe("added");
  expect((await tracking.detail("u", 2)).status).toBe("watching");
  await tracking.track("u", 3, "paused");
  expect(await start(3)).toEqual({ outcome: "ignored", message: "Already followed" });
  expect((await tracking.detail("u", 3)).status).toBe("paused");

  // Starting the next Episode of a Series already Watching changes nothing, and no notification is sent.
  expect((await start(1)).outcome).toBe("ignored");
  await Bun.sleep(0);
  expect(notifications).toHaveLength(0);
});
