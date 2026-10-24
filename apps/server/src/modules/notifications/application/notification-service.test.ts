import { expect, test } from "bun:test";
import { testDb } from "../../../shared/testing";
import type { PushTarget, WebPushSender } from "../infrastructure/web-push-sender";
import { NotificationService } from "./notification-service";

function setup(statusByEndpoint: Record<string, number>) {
  const { db } = testDb();
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
