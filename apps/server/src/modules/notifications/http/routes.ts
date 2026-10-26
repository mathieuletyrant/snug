import { Hono, type MiddlewareHandler } from "hono";
import { z } from "zod";
import type { NtfySettings, PushSettings } from "@snug/shared";
import { InvalidInputError } from "@/shared/errors";
import { type AuthEnv, jsonBody, parse } from "@/shared/http";
import { reason } from "@/shared/logger";
import type { NotificationService } from "@/modules/notifications/application/notification-service";
import type { Ntfy } from "@/modules/notifications/infrastructure/ntfy";
import { t } from "@/shared/i18n";

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

const ntfyInput = z.object({
  server: z.union([z.literal(""), z.url({ protocol: /^https?$/, error: () => t().errors.ntfyServer })]),
  token: z.string().trim(),
  topics: z.array(z.string().trim().regex(/^[-\w]{1,64}$/, { error: () => t().errors.ntfyTopic })),
  tags: z.array(z.string().trim().min(1)),
});

/** The instance's ntfy, set by the admin; a test sends with the form's values, saved or not. */
export const ntfyRoutes = (ntfy: Ntfy, adminOnly: MiddlewareHandler<AuthEnv>) =>
  new Hono<AuthEnv>()
    .use(adminOnly)
    .get("/", (c) => c.json<NtfySettings>(ntfy.settings()))
    .put("/", async (c) => {
      ntfy.save(parse(ntfyInput, await jsonBody(c)));
      return c.body(null, 204);
    })
    .post("/test", async (c) => {
      const config = ntfy.resolve(parse(ntfyInput, await jsonBody(c)));
      if (!config.topics.length) throw new InvalidInputError(t().errors.ntfyTopic, { topics: t().errors.ntfyTopic });
      try {
        await ntfy.send(config, { title: t().push.testTitle, body: t().push.ntfyTestBody, url: "/settings?section=integrations&app=ntfy" });
      } catch (error) {
        throw new InvalidInputError(reason(error));
      }
      return c.body(null, 204);
    });
