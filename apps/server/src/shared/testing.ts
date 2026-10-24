/** Test helpers: a fresh, migrated in-memory database with one User ("u"). */
import { Database } from "bun:sqlite";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import type { Db } from "./db";

export function testDb(users: string[] = ["u"]) {
  const sqlite = new Database(":memory:");
  const db = drizzle({ client: sqlite }) as unknown as Db;
  migrate(db, { migrationsFolder: join(import.meta.dir, "../../drizzle") });
  users.forEach((id, i) => {
    // One second apart, so the first one is the admin.
    const at = Math.floor(Date.now() / 1000) + i;
    sqlite.run(
      `insert into user (id, name, email, email_verified, created_at, updated_at) values (?, ?, ?, 0, ?, ?)`,
      [id, id.toUpperCase(), `${id}@x.io`, at, at],
    );
  });
  return { db, sqlite };
}
