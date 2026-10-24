import { Hono } from "hono";
import { z } from "zod";
import type { PushSettings } from "@snug/shared";
import { type AuthEnv, jsonBody, parse } from "../../../shared/http";
import type { NotificationService } from "../application/notification-service";
import { t } from "../../../shared/i18n";

const subscription = z.object({
  endpoint: z.url({ protocol: /^https$/ }),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export const notificationRoutes = (notifications: NotificationService) =>
  new Hono<AuthEnv>()
    .get("/", (c) =>
      c.json<PushSettings>({ publicKey: notifications.publicKey, devices: notifications.deviceCount(c.var.user.id) }),
    )
    .post("/subscriptions", async (c) => {
      const { endpoint, keys } = parse(subscription, await jsonBody(c));
      notifications.subscribe(c.var.user.id, { endpoint, ...keys });
      return c.body(null, 204);
    })
    .delete("/subscriptions", async (c) => {
      const { endpoint } = parse(z.object({ endpoint: z.string() }), await jsonBody(c));
      notifications.unsubscribe(c.var.user.id, endpoint);
      return c.body(null, 204);
    })
    .post("/test", async (c) => {
      await notifications.notify(c.var.user.id, {
        title: t().push.testTitle,
        body: t().push.testBody,
        url: "/settings",
        tag: "test",
      });
      return c.body(null, 204);
    });
