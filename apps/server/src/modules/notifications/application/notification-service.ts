import { and, eq } from "drizzle-orm";
import type { Db } from "../../../shared/db";
import { moduleLogger, reason } from "../../../shared/logger";
import { pushSubscriptions } from "../infrastructure/schema";
import type { WebPushSender } from "../infrastructure/web-push-sender";

const log = moduleLogger("push");

export interface Notification {
  title: string;
  body: string;
  /** Page opened when the notification is tapped. */
  url: string;
  /** Notifications with the same tag replace each other (e.g. a whole season marked at once). */
  tag?: string;
}

/** What other modules need to notify a User. */
export interface Notifier {
  notify(userId: string, notification: Notification): Promise<void>;
}

export class NotificationService implements Notifier {
  constructor(
    private readonly db: Db,
    private readonly sender: WebPushSender,
  ) {}

  get publicKey() {
    return this.sender.publicKey;
  }

  subscribe(userId: string, sub: { endpoint: string; p256dh: string; auth: string }) {
    const row = { ...sub, userId, createdAt: new Date() };
    this.db.insert(pushSubscriptions).values(row).onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: row }).run();
  }

  unsubscribe(userId: string, endpoint: string) {
    this.db
      .delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)))
      .run();
  }

  deviceCount(userId: string) {
    return this.db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId)).all().length;
  }

  /** Sends to every device of the User; forgets devices the push service says are gone. Never throws. */
  async notify(userId: string, notification: Notification) {
    const devices = this.db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId)).all();
    await Promise.all(
      devices.map(async (device) => {
        try {
          const status = await this.sender.send(device, notification);
          const host = new URL(device.endpoint).host;
          if (status === 404 || status === 410) {
            this.db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, device.endpoint)).run();
            log.info(`Device on ${host} is gone (${status}), forgotten`);
          } else if (status >= 400) {
            log.warn(`Push to ${host} failed: ${status}`);
          } else {
            log.debug(`Sent "${notification.title}" to ${host}`);
          }
        } catch (error) {
          log.warn(`Push failed: ${reason(error)}`);
        }
      }),
    );
  }
}
