import { eq } from "drizzle-orm";
import type { NtfyInput, NtfySettings } from "@snug/shared";
import type { Db } from "@/shared/db";
import { ORIGINS } from "@/shared/config";
import { appSettings } from "@/modules/catalog/infrastructure/schema";
import type { Notification } from "@/modules/notifications/application/notification-service";

export type NtfyConfig = Omit<NtfyInput, "token"> & { token: string | null };

const KEY = "ntfy";
const PUBLIC_SERVER = "https://ntfy.sh";

/** Where a tap opens Snug: the first https origin, reachable from a phone; no link without an origin. */
const BASE = ORIGINS.find((origin) => origin.startsWith("https://")) ?? ORIGINS[0];

/** The instance's ntfy settings, kept as one JSON value in app_settings. */
export class Ntfy {
  constructor(
    private readonly db: Db,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  /** The saved settings, or null while ntfy is off (no topic). */
  config(): NtfyConfig | null {
    const config = this.saved();
    return config?.topics.length ? config : null;
  }

  settings(): NtfySettings {
    const { token, ...rest } = this.saved() ?? { server: "", topics: [], tags: [], token: null };
    return { ...rest, hasToken: !!token };
  }

  /** The input with the saved token when it leaves the field empty. */
  resolve(input: NtfyInput): NtfyConfig {
    return { ...input, token: input.token || (this.saved()?.token ?? null) };
  }

  save(input: NtfyInput) {
    const value = JSON.stringify(this.resolve(input));
    this.db.insert(appSettings).values({ key: KEY, value }).onConflictDoUpdate({ target: appSettings.key, set: { value } }).run();
  }

  /** Publishes to every topic (ntfy's JSON API); throws with ntfy's own message when one is refused. */
  async send(config: NtfyConfig, notification: Notification) {
    const server = (config.server || PUBLIC_SERVER).replace(/\/+$/, "");
    for (const topic of config.topics) {
      const res = await this.fetcher(server, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(config.token && { Authorization: `Bearer ${config.token}` }) },
        body: JSON.stringify({
          topic,
          title: notification.title,
          message: notification.body,
          tags: config.tags,
          ...(BASE && { click: new URL(notification.url, BASE).href }),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        const { error } = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(`ntfy ${res.status} on "${topic}"${error ? `: ${error}` : ""}`);
      }
    }
  }

  private saved(): NtfyConfig | null {
    const row = this.db.select().from(appSettings).where(eq(appSettings.key, KEY)).get();
    return row ? JSON.parse(row.value) : null;
  }
}
