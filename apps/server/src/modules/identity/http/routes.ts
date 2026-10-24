import { Hono, type MiddlewareHandler } from "hono";
import { z } from "zod";
import { ForbiddenError } from "../../../shared/errors";
import { type AuthEnv, jsonBody, parse } from "../../../shared/http";
import type { IdentityService } from "../application/identity-service";
import type { Auth } from "../infrastructure/auth";

export const authHandler = (auth: Auth) => new Hono().on(["GET", "POST"], "/*", (c) => auth.handler(c.req.raw));

export const requireSession =
  (auth: Auth): MiddlewareHandler<AuthEnv> =>
  async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "Not signed in" }, 401);
    c.set("user", session.user);
    await next();
  };

export const requireAdmin =
  (identity: IdentityService): MiddlewareHandler<AuthEnv> =>
  async (c, next) => {
    if (!identity.isAdmin(c.var.user.id)) throw new ForbiddenError("Admins only");
    await next();
  };

export const identityRoutes = (identity: IdentityService) =>
  new Hono<AuthEnv>()
    .get("/me", (c) => c.json(identity.me(c.var.user)))
    .get("/preferences", (c) => c.json(identity.preferences(c.var.user.id)))
    .patch("/preferences", async (c) => {
      const changes = parse(z.object({ hideUndatedUpcoming: z.boolean(), notifyNewEpisodes: z.boolean() }).partial().strict(), await jsonBody(c));
      return c.json(identity.updatePreferences(c.var.user.id, changes));
    })
    .get("/users", requireAdmin(identity), (c) => c.json(identity.listUsers()))
    .post("/users", requireAdmin(identity), async (c) => {
      const input = parse(
        z.object({
          name: z.string().trim().min(1, "Enter a name"),
          email: z.email("Enter a valid email"),
          password: z.string().min(10, "Use at least 10 characters"),
        }),
        await jsonBody(c),
      );
      await identity.invite(input);
      return c.body(null, 201);
    });
