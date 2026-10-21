import { Hono } from "hono";
import type { JellyfinIntegration } from "@snug/shared";
import { InvalidInputError } from "../../../shared/errors";
import { type AuthEnv, jsonBody } from "../../../shared/http";
import type { IdentityService } from "../../identity/application/identity-service";
import type { JellyfinService } from "../application/jellyfin-service";

/** Called by Jellyfin; the token in the URL identifies the User. */
export const jellyfinWebhook = (jellyfin: JellyfinService) =>
  new Hono().post("/:token", async (c) => {
    const body = await jsonBody(c);
    if (!body || typeof body !== "object") throw new InvalidInputError("Expected a JSON object");
    return c.json(await jellyfin.handle(c.req.param("token"), body));
  });

export const jellyfinRoutes = (jellyfin: JellyfinService, identity: IdentityService) =>
  new Hono<AuthEnv>()
    .get("/", (c) =>
      c.json<JellyfinIntegration>({
        webhookPath: `/api/webhooks/jellyfin/${identity.webhookTokens.of(c.var.user.id)}`,
        events: jellyfin.events(c.var.user.id),
      }),
    )
    .post("/rotate", (c) => {
      identity.webhookTokens.rotate(c.var.user.id);
      return c.body(null, 204);
    });
