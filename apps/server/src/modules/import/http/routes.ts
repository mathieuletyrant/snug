import { Hono } from "hono";
import { type AuthEnv, jsonBody } from "@/shared/http";
import type { ImportService } from "@/modules/import/application/import-service";
import { today } from "@/shared/day";

export const importRoutes = (importer: ImportService) =>
  new Hono<AuthEnv>()
    .post("/", async (c) =>
      c.json(
        c.req.header("content-type")?.startsWith("text/csv")
          ? await importer.importCsv(c.var.user.id, await c.req.text())
          : await importer.importJson(c.var.user.id, await jsonBody(c)),
      ),
    )
    .get("/progress", (c) => c.json(importer.progressOf(c.var.user.id)));

export const exportRoutes = (importer: ImportService) =>
  new Hono<AuthEnv>().get("/", async (c) =>
    c.body(await importer.exportCsv(c.var.user.id), 200, {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="snug-export-${today()}.csv"`,
    }),
  );
