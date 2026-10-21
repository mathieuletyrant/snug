import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "../../identity/infrastructure/schema";

/** One row per device that accepted notifications (a browser's push subscription). */
export const pushSubscriptions = sqliteTable("push_subscriptions", {
  endpoint: text("endpoint").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
