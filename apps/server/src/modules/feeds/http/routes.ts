import { Hono } from "hono";
import { z } from "zod";
import { type Feeds, STATUSES } from "@snug/shared";
import { type AuthEnv, parse } from "@/shared/http";
import type { IdentityService } from "@/modules/identity/application/identity-service";
import type { FeedsService } from "@/modules/feeds/application/feeds-service";
import { moduleLogger } from "@/shared/logger";

const log = moduleLogger("feeds");

const statuses = z
  .string()
  .default("watchlist")
  .transform((s) => s.split(",").map((part) => part.trim()))
  .pipe(z.array(z.enum(STATUSES, `Use statuses among ${STATUSES.join(", ")}`)).min(1));

/** Public, authenticated by the read-only feed token in the URL (Sonarr and calendar apps can't sign in). */
export const feedRoutes = (feeds: FeedsService, identity: IdentityService) =>
  new Hono()
    .use("/:token/*", async (c, next) => {
      if (!identity.feedTokens.userIdOf(c.req.param("token") ?? "")) {
        log.warn("Feed asked with an unknown token (rotated? check the URL in Sonarr or the calendar app)");
        return c.json({ error: "Not found" }, 404);
      }
      await next();
    })
    .get("/:token/sonarr", async (c) => {
      const userId = identity.feedTokens.userIdOf(c.req.param("token"))!;
      return c.json(await feeds.sonarrList(userId, parse(statuses, c.req.query("status"))));
    })
    .get("/:token/calendar.ics", async (c) => {
      const userId = identity.feedTokens.userIdOf(c.req.param("token"))!;
      return c.body(await feeds.calendar(userId), 200, { "content-type": "text/calendar; charset=utf-8" });
    });

export const feedSettingsRoutes = (identity: IdentityService) =>
  new Hono<AuthEnv>()
    .get("/", (c) => {
      const token = identity.feedTokens.of(c.var.user.id);
      return c.json<Feeds>({ sonarrPath: `/api/feeds/${token}/sonarr`, calendarPath: `/api/feeds/${token}/calendar.ics` });
    })
    .post("/rotate", (c) => {
      identity.feedTokens.rotate(c.var.user.id);
      return c.body(null, 204);
    });
