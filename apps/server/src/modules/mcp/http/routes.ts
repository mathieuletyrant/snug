import { StreamableHTTPTransport } from "@hono/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Hono } from "hono";
import type { McpIntegration } from "@snug/shared";
import pkg from "../../../../../../package.json";
import type { AuthEnv } from "../../../shared/http";
import type { IdentityService } from "../../identity/application/identity-service";
import type { ImportService } from "../../import/application/import-service";
import type { CatalogService } from "../../catalog/application/catalog-service";
import { registerTools } from "../tools";

/**
 * MCP server (Model Context Protocol) for AI assistants, at `/api/mcp?token=<MCP token>`: the token goes in the
 * URL because some MCP clients can't send headers. Stateless: each request gets its own server and transport.
 */
export const mcpServer = (identity: IdentityService, catalog: CatalogService, importer: ImportService) =>
  new Hono()
    .post("/", async (c) => {
      const userId = identity.mcpTokens.userIdOf(c.req.query("token") ?? "");
      if (!userId) return c.json({ error: "Unknown MCP token" }, 401);
      const server = new McpServer({ name: "snug", version: pkg.version });
      registerTools(server, catalog, importer, userId);
      // Plain JSON answers rather than an event stream: one answer per call.
      const transport = new StreamableHTTPTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
      await server.connect(transport);
      return transport.handleRequest(c);
    })
    .on(["GET", "DELETE"], "/", (c) => c.body(null, 405, { Allow: "POST" }));

export const mcpRoutes = (identity: IdentityService) =>
  new Hono<AuthEnv>()
    .get("/", (c) => c.json<McpIntegration>({ mcpPath: `/api/mcp?token=${identity.mcpTokens.of(c.var.user.id)}` }))
    .post("/rotate", (c) => {
      identity.mcpTokens.rotate(c.var.user.id);
      return c.body(null, 204);
    });
