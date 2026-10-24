import { expect, test } from "bun:test";
import type { CatalogService } from "../../catalog/application/catalog-service";
import type { IdentityService } from "../../identity/application/identity-service";
import type { Notifier } from "../../notifications/application/notification-service";
import type { TrackingService } from "../../tracking/application/tracking-service";
import { testDb } from "../../../shared/testing";
import { jellyfinEvents } from "../infrastructure/schema";
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
  expect(events.filter((e) => e.outcome === "watched")).toHaveLength(150);
  expect(events.filter((e) => e.outcome === "ignored")).toHaveLength(100);
  // Only the 100 latest Watched calls keep their raw payload.
  expect(events.filter((e) => e.outcome === "watched" && e.payload)).toHaveLength(100);
});
