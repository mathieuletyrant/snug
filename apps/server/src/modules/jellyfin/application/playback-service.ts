import type { EpisodeRef, JellyfinServer, PlayOptions } from "@snug/shared";
import { eq } from "drizzle-orm";
import type { Db } from "../../../shared/db";
import { InvalidInputError, NotFoundError } from "../../../shared/errors";
import { appSettings } from "../../catalog/infrastructure/schema";
import { JellyfinClient } from "../infrastructure/jellyfin-client";
import { jellyfinSeries, jellyfinUsers } from "../infrastructure/schema";

/** The Play button: finds an Episode in Jellyfin and starts it on a player, or links to it. */
export class PlaybackService {
  constructor(private readonly db: Db) {}

  // ---- Server (admin)

  server(): JellyfinServer {
    return {
      url: this.read("jellyfin_url") ?? "",
      publicUrl: this.read("jellyfin_public_url") ?? "",
      hasApiKey: !!this.read("jellyfin_api_key"),
    };
  }

  /** Saved only once Jellyfin answers with this URL and key. An empty URL turns the Play button off. */
  async saveServer(input: { url: string; apiKey?: string; publicUrl: string }) {
    const apiKey = input.apiKey || this.read("jellyfin_api_key");
    if (input.url) {
      if (!apiKey) throw new InvalidInputError("Paste a Jellyfin API key", { apiKey: "Required" });
      await new JellyfinClient({ url: input.url, apiKey }).check();
    }
    this.write("jellyfin_url", input.url);
    this.write("jellyfin_public_url", input.publicUrl.replace(/\/+$/, ""));
    if (input.apiKey) this.write("jellyfin_api_key", input.apiKey);
  }

  // ---- Users

  users() {
    return this.client().users();
  }

  linkedUser(userId: string): string | null {
    return this.db.select().from(jellyfinUsers).where(eq(jellyfinUsers.userId, userId)).get()?.jellyfinUserId ?? null;
  }

  link(userId: string, jellyfinUserId: string | null) {
    if (!jellyfinUserId) {
      this.db.delete(jellyfinUsers).where(eq(jellyfinUsers.userId, userId)).run();
      return;
    }
    this.db
      .insert(jellyfinUsers)
      .values({ userId, jellyfinUserId })
      .onConflictDoUpdate({ target: jellyfinUsers.userId, set: { jellyfinUserId } })
      .run();
  }

  /** The button shows once the server is set up and the User picked their Jellyfin user. */
  enabled(userId: string) {
    return !!this.read("jellyfin_url") && !!this.linkedUser(userId);
  }

  // ---- Playing

  async options(userId: string, seriesId: number, ep: EpisodeRef): Promise<PlayOptions> {
    const client = this.client();
    const itemId = await this.episodeItem(client, seriesId, ep);
    const publicUrl = this.read("jellyfin_public_url");
    return {
      players: await client.players(this.jellyfinUser(userId)),
      openUrl: publicUrl ? `${publicUrl}/web/#/details?id=${itemId}` : null,
    };
  }

  async play(userId: string, seriesId: number, ep: EpisodeRef, sessionId: string) {
    const client = this.client();
    const players = await client.players(this.jellyfinUser(userId));
    // Only the User's own players: a session id from someone else's TV is refused.
    if (!players.some((p) => p.sessionId === sessionId)) throw new NotFoundError("This player is gone");
    await client.play(sessionId, await this.episodeItem(client, seriesId, ep));
  }

  /** Jellyfin's id for an Episode; the series id is remembered (the webhook fills the same table). */
  private async episodeItem(client: JellyfinClient, seriesId: number, ep: EpisodeRef) {
    let jellyfinSeriesId = this.db.select().from(jellyfinSeries).where(eq(jellyfinSeries.tmdbId, seriesId)).get()
      ?.jellyfinSeriesId;
    if (!jellyfinSeriesId) {
      jellyfinSeriesId = (await client.seriesIdOf(seriesId)) ?? undefined;
      if (!jellyfinSeriesId) throw new NotFoundError("This series isn't in Jellyfin");
      this.db.insert(jellyfinSeries).values({ jellyfinSeriesId, tmdbId: seriesId }).onConflictDoNothing().run();
    }
    const itemId = await client.episodeId(jellyfinSeriesId, ep.season, ep.number);
    if (!itemId) throw new NotFoundError("This episode isn't in Jellyfin");
    return itemId;
  }

  private jellyfinUser(userId: string) {
    const id = this.linkedUser(userId);
    if (!id) throw new InvalidInputError("Pick your Jellyfin user in Settings → Integrations");
    return id;
  }

  private client() {
    const url = this.read("jellyfin_url");
    const apiKey = this.read("jellyfin_api_key");
    if (!url || !apiKey) throw new InvalidInputError("The admin hasn't set up the Jellyfin server");
    return new JellyfinClient({ url, apiKey });
  }

  private read(key: string) {
    return this.db.select().from(appSettings).where(eq(appSettings.key, key)).get()?.value || null;
  }

  private write(key: string, value: string) {
    this.db.insert(appSettings).values({ key, value }).onConflictDoUpdate({ target: appSettings.key, set: { value } }).run();
  }
}
