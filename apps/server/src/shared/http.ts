import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { ForbiddenError, InvalidInputError, NotFoundError } from "./errors";

/** Hono env of routes behind the session middleware. */
export type AuthEnv = { Variables: { user: { id: string; name: string; email: string } } };

export const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) fields[String(issue.path[0] ?? "")] ??= issue.message;
    throw new InvalidInputError("Please fix the highlighted fields", fields);
  }
  return result.data;
};

export const jsonBody = (c: Context) =>
  c.req.json().catch(() => {
    throw new InvalidInputError("Expected a JSON body");
  });

/** HTTPS directly, or through a reverse proxy terminating TLS. */
export const isHttps = (req: Request) =>
  new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https";

/**
 * Adds `Secure` to every cookie of a response to an HTTPS request, so one instance can serve
 * http://umbrel.local (cookies must not be Secure) and https://snug.example.com (they must be).
 * A spoofed X-Forwarded-Proto only makes the sender's own cookies stricter.
 */
export function withSecureCookies(req: Request, res: Response): Response {
  const cookies = res.headers.getSetCookie();
  if (!cookies.length || !isHttps(req)) return res;
  const secured = new Response(res.body, res);
  secured.headers.delete("set-cookie");
  for (const cookie of cookies) secured.headers.append("set-cookie", /;\s*secure\b/i.test(cookie) ? cookie : `${cookie}; Secure`);
  return secured;
}

export const onError = (err: Error, c: Context) => {
  if (err instanceof HTTPException) return err.getResponse();
  const status =
    err instanceof NotFoundError ? 404 : err instanceof ForbiddenError ? 403 : err instanceof InvalidInputError ? 400 : 500;
  if (status === 500) console.error(err);
  const fields = err instanceof InvalidInputError ? err.fields : undefined;
  return c.json({ error: status === 500 ? "Something went wrong" : err.message, fields }, status);
};
