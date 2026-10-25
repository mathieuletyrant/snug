import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import webpush from "web-push";
import { DATA_DIR, ORIGINS } from "@/shared/config";

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** VAPID keys identify this Snug to push services; generated once and kept next to the database. */
function vapidKeys(): { publicKey: string; privateKey: string } {
  const file = join(DATA_DIR, "vapid.json");
  if (!existsSync(file)) writeFileSync(file, JSON.stringify(webpush.generateVAPIDKeys()), { mode: 0o600 });
  return JSON.parse(readFileSync(file, "utf8"));
}

/** Push services (Apple's included) want an https: or mailto: contact; never a localhost one. */
const SUBJECT =
  process.env.SNUG_PUSH_CONTACT ?? ORIGINS.find((o) => o.startsWith("https://")) ?? "https://github.com/mathieuletyrant/snug";

export class WebPushSender {
  private readonly keys = vapidKeys();

  get publicKey() {
    return this.keys.publicKey;
  }

  /**
   * Encrypts (RFC 8291) and signs (VAPID) with web-push, sends with fetch.
   * Returns the push service's status: 404/410 mean the device unsubscribed.
   */
  async send(target: PushTarget, payload: object): Promise<number> {
    const request = webpush.generateRequestDetails(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(payload),
      { vapidDetails: { subject: SUBJECT, ...this.keys }, TTL: 24 * 60 * 60, urgency: "normal" },
    );
    const res = await fetch(request.endpoint, {
      method: request.method,
      headers: request.headers as Record<string, string>,
      body: request.body as Uint8Array,
      signal: AbortSignal.timeout(10_000),
    });
    return res.status;
  }
}
