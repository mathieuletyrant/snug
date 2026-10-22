/** HTTP composition: mounts each module's routes under /api. */
import { Hono } from "hono";
import type { SetupState } from "@snug/shared";
import {
  auth,
  catalog,
  catalogSettings,
  feeds,
  identity,
  importer,
  jellyfin,
  notifications,
  refreshCatalog,
  tracking,
} from "./container";
import { feedRoutes, feedSettingsRoutes } from "./modules/feeds/http/routes";
import { catalogRoutes, imageRoutes } from "./modules/catalog/http/routes";
import { authHandler, identityRoutes, requireAdmin, requireSession } from "./modules/identity/http/routes";
import { importRoutes } from "./modules/import/http/routes";
import { jellyfinRoutes, jellyfinWebhook } from "./modules/jellyfin/http/routes";
import { notificationRoutes } from "./modules/notifications/http/routes";
import { trackingRoutes } from "./modules/tracking/http/routes";
import { watchlistRoutes, watchlistWebhook } from "./modules/watchlist/http/routes";
import { type AuthEnv, onError } from "./shared/http";
import { requestLog } from "./shared/request-log";

const api = new Hono<AuthEnv>()
  // Public
  .route("/auth", authHandler(auth))
  .route("/webhooks/jellyfin", jellyfinWebhook(jellyfin))
  .route("/images", imageRoutes())
  .route("/feeds", feedRoutes(feeds, identity))
  .route("/watchlist", watchlistWebhook(tracking, identity))
  .get("/setup", (c) =>
    c.json<SetupState>({
      hasUsers: identity.hasUsers(),
      hasTmdbKey: !!catalogSettings.tmdbKey(),
      language: catalogSettings.language(),
    }),
  )
  // Signed in
  .use(requireSession(auth))
  .route("/", identityRoutes(identity))
  .route("/", catalogRoutes(catalog, catalogSettings, requireAdmin(identity), () => void refreshCatalog(0)))
  .route("/", trackingRoutes(tracking))
  .route("/import", importRoutes(importer))
  .route("/integrations/jellyfin", jellyfinRoutes(jellyfin, identity))
  .route("/integrations/feeds", feedSettingsRoutes(identity))
  .route("/integrations/watchlist", watchlistRoutes(identity))
  .route("/push", notificationRoutes(notifications))
  .all("/*", (c) => c.json({ error: "Not found" }, 404));

export const app = new Hono().use(requestLog).onError(onError).route("/api", api);
