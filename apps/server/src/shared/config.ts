import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const DATA_DIR = process.env.DATA_DIR ?? "./data";
mkdirSync(DATA_DIR, { recursive: true });

export const PORT = Number(process.env.PORT ?? 3000);

/** Public URL(s) Snug is reached at, comma separated (e.g. "http://umbrel.local:3000,https://snug.tailnet.ts.net"). */
export const ORIGINS = (process.env.SNUG_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

/** Auth secret: env wins, otherwise generated once and persisted next to the database. */
export const AUTH_SECRET = process.env.BETTER_AUTH_SECRET ?? persistedSecret();

function persistedSecret(): string {
  const file = join(DATA_DIR, "secret");
  if (!existsSync(file)) {
    writeFileSync(file, Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex"), { mode: 0o600 });
  }
  return readFileSync(file, "utf8").trim();
}
