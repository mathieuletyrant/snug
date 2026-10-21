import { Hono } from "hono";
import { type AuthEnv, jsonBody } from "../../../shared/http";
import type { ImportService } from "../application/import-service";

export const importRoutes = (importer: ImportService) =>
  new Hono<AuthEnv>()
    .post("/", async (c) => c.json(await importer.import(c.var.user.id, await jsonBody(c))))
    .get("/progress", (c) => c.json(importer.progressOf(c.var.user.id)));
