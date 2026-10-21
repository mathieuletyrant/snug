import { AsyncLocalStorage } from "node:async_hooks";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { count } from "drizzle-orm";
import { AUTH_SECRET, ORIGINS } from "../../../shared/config";
import type { Db } from "../../../shared/db";
import * as schema from "./schema";

/** Set while an admin creates an account, the only way to sign up once the first User exists. */
export const invitation = new AsyncLocalStorage<true>();

export function createAuth(db: Db) {
  return betterAuth({
    secret: AUTH_SECRET,
    // Several origins (LAN name, IP, Tailscale…) → resolve per request among the allowed hosts.
    baseURL: ORIGINS.length > 1 ? { allowedHosts: ORIGINS.map((o) => new URL(o).host), fallback: ORIGINS[0] } : ORIGINS[0],
    trustedOrigins: ORIGINS,
    basePath: "/api/auth",
    database: drizzleAdapter(db, { provider: "sqlite", schema }),
    emailAndPassword: { enabled: true, minPasswordLength: 10 },
    session: { expiresIn: 60 * 60 * 24 * 90, updateAge: 60 * 60 * 24 },
    rateLimit: { enabled: true, window: 60, max: 30 },
    advanced: {
      ipAddress: { ipAddressHeaders: ["x-snug-client-ip"] },
      // With several origins the baseURL is dynamic and better-auth falls back to Secure cookies in
      // production, which browsers drop over plain HTTP: only use them when every origin is HTTPS.
      ...(ORIGINS.length > 0 && { useSecureCookies: ORIGINS.every((o) => o.startsWith("https://")) }),
    },
    databaseHooks: {
      user: {
        create: {
          // Sign-up is open for the very first User (the admin), then closed.
          before: async (user) => {
            const [row] = db.select({ n: count() }).from(schema.user).all();
            if ((row?.n ?? 0) > 0 && !invitation.getStore()) {
              throw new APIError("FORBIDDEN", { message: "Sign-up is closed. Ask your admin for an account." });
            }
            return { data: user };
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
