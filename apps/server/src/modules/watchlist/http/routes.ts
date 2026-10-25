import { Hono } from "hono";
import { z } from "zod";
import type { WatchlistIntegration } from "@snug/shared";
import { NotFoundError } from "@/shared/errors";
import { moduleLogger } from "@/shared/logger";
import { type AuthEnv, jsonBody, parse } from "@/shared/http";
import type { IdentityService } from "@/modules/identity/application/identity-service";
import type { TrackingService } from "@/modules/tracking/application/tracking-service";
import { t } from "@/shared/i18n";

const log = moduleLogger("watchlist");

const body = z.object({ tmdbId: z.number().int().positive() });

/**
 * Called by Spotarr when a shared reel turns out to be a series; the token in the URL identifies the User.
 * 201 when the Series was added, 200 when it was already tracked (its Status is kept).
 */
export const watchlistWebhook = (tracking: TrackingService, identity: IdentityService) =>
  new Hono().post("/:token", async (c) => {
    const userId = identity.watchlistTokens.userIdOf(c.req.param("token"));
    if (!userId) throw new NotFoundError(t().errors.unknownWatchlistToken);
    const { tmdbId } = parse(body, await jsonBody(c));
    const result = await tracking.addToWatchlist(userId, tmdbId);
    const who = identity.nameOf(userId);
    log.info(
      result.added
        ? `${who} · added series ${tmdbId} to the Watchlist`
        : `${who} · series ${tmdbId} already tracked (${result.status}), kept as is`,
    );
    return c.json(result, result.added ? 201 : 200);
  });

export const watchlistRoutes = (identity: IdentityService) =>
  new Hono<AuthEnv>()
    .get("/", (c) =>
      c.json<WatchlistIntegration>({ addPath: `/api/watchlist/${identity.watchlistTokens.of(c.var.user.id)}` }),
    )
    .post("/rotate", (c) => {
      identity.watchlistTokens.rotate(c.var.user.id);
      return c.body(null, 204);
    });
