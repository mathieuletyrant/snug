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
