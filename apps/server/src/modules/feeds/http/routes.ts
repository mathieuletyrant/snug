import { Hono } from "hono";
import { z } from "zod";
import { type Feeds, STATUSES } from "@snug/shared";
import { type AuthEnv, parse } from "../../../shared/http";
import type { IdentityService } from "../../identity/application/identity-service";
import type { FeedsService } from "../application/feeds-service";
import { moduleLogger } from "../../../shared/logger";

const log = moduleLogger("feeds");

const statuses = z
  .string()
  .default("watchlist")
  .transform((s) => s.split(",").map((x) => x.trim()))
  .pipe(z.array(z.enum(STATUSES, `Use statuses among ${STATUSES.join(", ")}`)).min(1));

/** Public, authenticated by the read-only feed token in the URL (Sonarr can't sign in). */
export const feedRoutes = (feeds: FeedsService, identity: IdentityService) =>
  new Hono()
    .use("/:token/*", async (c, next) => {
      if (!identity.feedTokens.userIdOf(c.req.param("token") ?? "")) {
        log.warn("Feed asked with an unknown token (rotated? check the URL in Sonarr)");
        return c.json({ error: "Not found" }, 404);
      }
      await next();
    })
    .get("/:token/sonarr", async (c) => {
      const userId = identity.feedTokens.userIdOf(c.req.param("token"))!;
      return c.json(await feeds.sonarrList(userId, parse(statuses, c.req.query("status"))));
    });

export const feedSettingsRoutes = (identity: IdentityService) =>
  new Hono<AuthEnv>()
    .get("/", (c) => {
      const token = identity.feedTokens.of(c.var.user.id);
      return c.json<Feeds>({ sonarrPath: `/api/feeds/${token}/sonarr` });
    })
    .post("/rotate", (c) => {
      identity.feedTokens.rotate(c.var.user.id);
      return c.body(null, 204);
    });
