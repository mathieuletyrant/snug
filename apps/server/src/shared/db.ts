import { Database } from "bun:sqlite";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as catalog from "../modules/catalog/infrastructure/schema";
import * as identity from "../modules/identity/infrastructure/schema";
import * as jellyfin from "../modules/jellyfin/infrastructure/schema";
import * as notifications from "../modules/notifications/infrastructure/schema";
import * as tracking from "../modules/tracking/infrastructure/schema";
import { DATA_DIR } from "./config";

const sqlite = new Database(join(DATA_DIR, "snug.db"), { create: true, strict: true });
sqlite.run("PRAGMA journal_mode = WAL");
sqlite.run("PRAGMA synchronous = NORMAL");
sqlite.run("PRAGMA foreign_keys = ON");

export const db = drizzle({ client: sqlite, schema: { ...identity, ...catalog, ...tracking, ...jellyfin, ...notifications } });
export type Db = typeof db;

migrate(db, { migrationsFolder: join(import.meta.dir, "../../drizzle") });
