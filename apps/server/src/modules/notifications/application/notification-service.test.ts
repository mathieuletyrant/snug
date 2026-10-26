import { expect, test } from "bun:test";
import { testDb } from "@/shared/testing";
import type { Ntfy, NtfyConfig } from "@/modules/notifications/infrastructure/ntfy";
import type { PushTarget, WebPushSender } from "@/modules/notifications/infrastructure/web-push-sender";
import { NotificationService } from "./notification-service";

function setup(statusByEndpoint: Record<string, number>, ntfyConfig: NtfyConfig | null = null) {
  const { db } = testDb();
  const sent: string[] = [];
  const ntfy = {
    config: () => ntfyConfig,
    send: async (config: NtfyConfig) => void sent.push(`ntfy:${config.topics.join(",")}`),
  } as unknown as Ntfy;
  const sender = {
    publicKey: "key",
    send: async (target: PushTarget) => {
      sent.push(target.endpoint);
      return statusByEndpoint[target.endpoint] ?? 201;
    },
  } as unknown as WebPushSender;
  return { service: new NotificationService(db, sender, ntfy, (userId) => userId === "admin"), sent };
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

test("the admin's notifications also go to ntfy, nobody else's", async () => {
  const { service, sent } = setup({}, { server: "", token: null, topics: ["arr"], tags: [] });
  const notification = { title: "📺 Severance", body: "S02E05 is out", url: "/series/1" };

  await service.notify("u", notification);
  expect(sent).toEqual([]);

  await service.notify("admin", notification);
  expect(sent).toEqual(["ntfy:arr"]);
});
