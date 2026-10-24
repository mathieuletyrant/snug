import { Hono, type MiddlewareHandler } from "hono";
import { z } from "zod";
import type { JellyfinIntegration } from "@snug/shared";
import { InvalidInputError } from "../../../shared/errors";
import { type AuthEnv, jsonBody, parse } from "../../../shared/http";
import type { IdentityService } from "../../identity/application/identity-service";
import type { JellyfinService } from "../application/jellyfin-service";
import type { PlaybackService } from "../application/playback-service";

const episodeParams = z.object({
  id: z.coerce.number().int().positive(),
  season: z.coerce.number().int().min(1),
  number: z.coerce.number().int().min(1),
});
const url = z.union([z.literal(""), z.url({ protocol: /^https?$/ })]);

/** Called by Jellyfin; the token in the URL identifies the User. */
export const jellyfinWebhook = (jellyfin: JellyfinService) =>
  new Hono().post("/:token", async (c) => {
    const body = await jsonBody(c);
    if (!body || typeof body !== "object") throw new InvalidInputError("Expected a JSON object");
    return c.json(await jellyfin.handle(c.req.param("token"), body));
  });

export const jellyfinRoutes = (
  jellyfin: JellyfinService,
  playback: PlaybackService,
  identity: IdentityService,
  adminOnly: MiddlewareHandler<AuthEnv>,
) =>
  new Hono<AuthEnv>()
    .get("/", (c) =>
      c.json<JellyfinIntegration>({
        webhookPath: `/api/webhooks/jellyfin/${identity.webhookTokens.of(c.var.user.id)}`,
        events: jellyfin.events(c.var.user.id),
        playback: { server: !!playback.server().url, jellyfinUserId: playback.linkedUser(c.var.user.id) },
      }),
    )
    .get("/server", adminOnly, (c) => c.json(playback.server()))
    .put("/server", adminOnly, async (c) => {
      const input = parse(
        z.object({ url, apiKey: z.string().trim().optional(), publicUrl: url }),
        await jsonBody(c),
      );
      await playback.saveServer(input);
      return c.body(null, 204);
    })
    .get("/users", async (c) => c.json(await playback.users()))
    .put("/user", async (c) => {
      const { jellyfinUserId } = parse(z.object({ jellyfinUserId: z.string().min(1).nullable() }), await jsonBody(c));
      playback.link(c.var.user.id, jellyfinUserId);
      return c.body(null, 204);
    })
    .post("/rotate", (c) => {
      identity.webhookTokens.rotate(c.var.user.id);
      return c.body(null, 204);
    });

/** The Play button: whether it shows, where an Episode can play, and playing it. */
export const playRoutes = (playback: PlaybackService) =>
  new Hono<AuthEnv>()
    .get("/", (c) => {
      const server = playback.server();
      return c.json({ players: playback.enabled(c.var.user.id), jellyfinWeb: !!server.url && !!server.publicUrl });
    })
    .get("/:id/:season/:number", async (c) => {
      const p = parse(episodeParams, c.req.param());
      return c.json(await playback.options(c.var.user.id, p.id, p));
    })
    .post("/:id/:season/:number", async (c) => {
      const p = parse(episodeParams, c.req.param());
      const { sessionId } = parse(z.object({ sessionId: z.string().min(1) }), await jsonBody(c));
      await playback.play(c.var.user.id, p.id, p, sessionId);
      return c.body(null, 204);
    });
