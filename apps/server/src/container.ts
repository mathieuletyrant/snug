/** Composition root: the only place that knows every concrete implementation. */
import { CatalogService } from "@/modules/catalog/application/catalog-service";
import { DrizzleCatalogRepository } from "@/modules/catalog/infrastructure/drizzle-catalog-repository";
import { STATUSES } from "@snug/shared";
import { CatalogSettings } from "@/modules/catalog/infrastructure/settings-store";
import { TmdbClient } from "@/modules/catalog/infrastructure/tmdb-client";
import { IdentityService } from "@/modules/identity/application/identity-service";
import { createAuth } from "@/modules/identity/infrastructure/auth";
import { FeedsService } from "@/modules/feeds/application/feeds-service";
import { ImportService } from "@/modules/import/application/import-service";
import { NewEpisodeAlerts } from "@/modules/notifications/application/new-episode-alerts";
import { NotificationService } from "@/modules/notifications/application/notification-service";
import { WebPushSender } from "@/modules/notifications/infrastructure/web-push-sender";
import { JellyfinService } from "@/modules/jellyfin/application/jellyfin-service";
import { db } from "@/shared/db";
import { setLanguageSource } from "@/shared/i18n";
import { moduleLogger } from "@/shared/logger";
import { TrackingService } from "@/modules/tracking/application/tracking-service";
import { DrizzleTrackedSeriesRepository } from "@/modules/tracking/infrastructure/drizzle-tracked-series-repository";

const log = moduleLogger("catalog");

export const auth = createAuth(db);
export const catalogSettings = new CatalogSettings(db);
setLanguageSource(catalogSettings.language);
export const trackedSeries = new DrizzleTrackedSeriesRepository(db);
export const catalog = new CatalogService(new DrizzleCatalogRepository(db), new TmdbClient(catalogSettings.tmdbKey, catalogSettings.language));
export const identity = new IdentityService(db, auth);
export const tracking = new TrackingService(trackedSeries, catalog, (userId) => identity.preferences(userId));
export const notifications = new NotificationService(db, new WebPushSender());
export const jellyfin = new JellyfinService(db, identity, catalog, tracking, notifications);
export const importer = new ImportService(tracking, catalog);
export const feeds = new FeedsService(tracking, catalog);
export const newEpisodeAlerts = new NewEpisodeAlerts(db, tracking, notifications, (userId) => identity.preferences(userId));

/**
 * Refreshes Catalog data of every tracked Series older than `maxAgeDays` (0 = all, e.g. after a language change),
 * then re-applies the Completed rule (new seasons, finales). Also fetches Series never fetched (interrupted Import).
 */
export async function refreshCatalog(maxAgeDays = 0.9) {
  if (!catalogSettings.tmdbKey()) {
    log.debug("Catalog refresh skipped: no TMDB key yet");
    return;
  }
  const ids = await trackedSeries.seriesIdsWithStatus(STATUSES);
  const { refreshed, failed } = await catalog.refreshStale(ids, maxAgeDays, (id) => tracking.reconcileSeries(id));
  if (refreshed || failed) log.info(`Refreshed ${refreshed} series from TMDB${failed ? `, ${failed} failed` : ""}`);
  else log.debug("Catalog refresh: everything is up to date");
}
