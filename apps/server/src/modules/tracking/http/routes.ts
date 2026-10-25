import { Hono } from "hono";
import { z } from "zod";
import { SAVING_TARGETS, STATUSES } from "@snug/shared";
import { type AuthEnv, jsonBody, parse } from "@/shared/http";
import type { TrackingService } from "@/modules/tracking/application/tracking-service";

const id = z.coerce.number().int().positive();
const seasonParams = z.object({ id, season: z.coerce.number().int().min(1) });
const rating = z.object({ rating: z.int().min(1).max(10).nullable() });
const episodeParams = seasonParams.extend({ number: z.coerce.number().int().min(1) });

export const trackingRoutes = (tracking: TrackingService) =>
  new Hono<AuthEnv>()
    .get("/home", async (c) => c.json(await tracking.home(c.var.user.id)))
    .get("/library", async (c) => c.json(await tracking.library(c.var.user.id)))
    .get("/series/:id", async (c) => c.json(await tracking.detail(c.var.user.id, parse(id, c.req.param("id")))))
    .put("/series/:id", async (c) => {
      const { status, savingTarget } = parse(
        z.object({ status: z.enum(STATUSES), savingTarget: z.union(SAVING_TARGETS.map((t) => z.literal(t))).optional() }),
        await jsonBody(c),
      );
      await tracking.track(c.var.user.id, parse(id, c.req.param("id")), status, savingTarget);
      return c.body(null, 204);
    })
    .delete("/series/:id", async (c) => {
      await tracking.untrack(c.var.user.id, parse(id, c.req.param("id")));
      return c.body(null, 204);
    })
    .post("/series/:id/next", async (c) => c.json(await tracking.watchNext(c.var.user.id, parse(id, c.req.param("id")))))
    .put("/series/:id/episodes/:season/:number", async (c) => {
      const p = parse(episodeParams, c.req.param());
      await tracking.watchEpisode(c.var.user.id, p.id, p);
      return c.body(null, 204);
    })
    .put("/series/:id/episodes/:season/:number/through", async (c) => {
      const p = parse(episodeParams, c.req.param());
      await tracking.watchThrough(c.var.user.id, p.id, p);
      return c.body(null, 204);
    })
    .delete("/series/:id/episodes/:season/:number", async (c) => {
      const p = parse(episodeParams, c.req.param());
      const { status } = parse(z.object({ status: z.enum(STATUSES).optional() }), c.req.query());
      await tracking.unwatchEpisode(c.var.user.id, p.id, p, status);
      return c.body(null, 204);
    })
    .put("/series/:id/rating", async (c) => {
      await tracking.rate(c.var.user.id, parse(id, c.req.param("id")), parse(rating, await jsonBody(c)));
      return c.body(null, 204);
    })
    .put("/series/:id/seasons/:season/rating", async (c) => {
      const p = parse(seasonParams, c.req.param());
      await tracking.rate(c.var.user.id, p.id, { ...parse(rating, await jsonBody(c)), season: p.season });
      return c.body(null, 204);
    })
    .put("/series/:id/seasons/:season", async (c) => {
      const p = parse(seasonParams, c.req.param());
      await tracking.watchSeason(c.var.user.id, p.id, p.season);
      return c.body(null, 204);
    });
