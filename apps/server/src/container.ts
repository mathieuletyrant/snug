/** Composition root: the only place that knows every concrete implementation. */
import { CatalogService } from "./modules/catalog/application/catalog-service";
import { DrizzleCatalogRepository } from "./modules/catalog/infrastructure/drizzle-catalog-repository";
import { STATUSES } from "@snug/shared";
import { CatalogSettings } from "./modules/catalog/infrastructure/settings-store";
import { TmdbClient } from "./modules/catalog/infrastructure/tmdb-client";
import { IdentityService } from "./modules/identity/application/identity-service";
import { createAuth } from "./modules/identity/infrastructure/auth";
import { FeedsService } from "./modules/feeds/application/feeds-service";
import { ImportService } from "./modules/import/application/import-service";
import { NotificationService } from "./modules/notifications/application/notification-service";
import { WebPushSender } from "./modules/notifications/infrastructure/web-push-sender";
import { JellyfinService } from "./modules/jellyfin/application/jellyfin-service";
import { db } from "./shared/db";
import { TrackingService } from "./modules/tracking/application/tracking-service";
import { DrizzleTrackedSeriesRepository } from "./modules/tracking/infrastructure/drizzle-tracked-series-repository";

export const auth = createAuth(db);
export const catalogSettings = new CatalogSettings(db);
export const trackedSeries = new DrizzleTrackedSeriesRepository(db);
export const catalog = new CatalogService(new DrizzleCatalogRepository(db), new TmdbClient(catalogSettings.tmdbKey, catalogSettings.language));
export const tracking = new TrackingService(trackedSeries, catalog);
export const identity = new IdentityService(db, auth);
export const notifications = new NotificationService(db, new WebPushSender());
export const jellyfin = new JellyfinService(db, identity, catalog, tracking, notifications);
export const importer = new ImportService(tracking, catalog);
export const feeds = new FeedsService(tracking, catalog);

/**
 * Refreshes Catalog data of every tracked Series older than `maxAgeDays` (0 = all, e.g. after a language change),
 * then re-applies the Completed rule (new seasons, finales). Also fetches Series never fetched (interrupted Import).
 */
export async function refreshCatalog(maxAgeDays = 0.9) {
  if (!catalogSettings.tmdbKey()) return;
  const ids = await trackedSeries.seriesIdsWithStatus(STATUSES);
  const refreshed = await catalog.refreshStale(ids, maxAgeDays, (id) => tracking.reconcileSeries(id));
  if (refreshed) console.log(`Refreshed ${refreshed} series from TMDB`);
}
