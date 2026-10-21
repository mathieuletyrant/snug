import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import type { Db } from "../../../shared/db";
import type { PushTarget, WebPushSender } from "../infrastructure/web-push-sender";
import { NotificationService } from "./notification-service";

function setup(statusByEndpoint: Record<string, number>) {
  const sqlite = new Database(":memory:");
  const db = drizzle({ client: sqlite }) as unknown as Db;
  migrate(db, { migrationsFolder: join(import.meta.dir, "../../../../drizzle") });
  const now = Math.floor(Date.now() / 1000);
  sqlite.run(`insert into user (id, name, email, email_verified, created_at, updated_at) values ('u', 'U', 'u@x.io', 0, ${now}, ${now})`);
  const sent: string[] = [];
  const sender = {
    publicKey: "key",
    send: async (target: PushTarget) => {
      sent.push(target.endpoint);
      return statusByEndpoint[target.endpoint] ?? 201;
    },
  } as unknown as WebPushSender;
  return { service: new NotificationService(db, sender), sent };
}

test("notify reaches every device of the user and forgets the ones that unsubscribed", async () => {
  const { service, sent } = setup({ "https://push.example/gone": 410 });
  for (const endpoint of ["https://push.example/phone", "https://push.example/gone"]) {
    service.subscribe("u", { endpoint, p256dh: "p", auth: "a" });
  }
  expect(service.deviceCount("u")).toBe(2);

  await service.notify("u", { title: "✓ Severance S02E05", body: "Next: S02E06", url: "/series/1" });

  expect(sent.sort()).toEqual(["https://push.example/gone", "https://push.example/phone"]);
  expect(service.deviceCount("u")).toBe(1);
});

test("subscribing the same device twice keeps one subscription", () => {
  const { service } = setup({});
  service.subscribe("u", { endpoint: "https://push.example/phone", p256dh: "p", auth: "a" });
  service.subscribe("u", { endpoint: "https://push.example/phone", p256dh: "p2", auth: "a2" });
  expect(service.deviceCount("u")).toBe(1);
});
