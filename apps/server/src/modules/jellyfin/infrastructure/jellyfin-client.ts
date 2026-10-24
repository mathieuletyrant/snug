import type { JellyfinUser } from "@snug/shared";
import { InvalidInputError } from "../../../shared/errors";

interface Item {
  Id: string;
  IndexNumber?: number;
  ParentIndexNumber?: number;
  ProviderIds?: Record<string, string>;
}

interface Session {
  Id: string;
  DeviceName?: string;
  Client?: string;
  SupportsRemoteControl?: boolean;
}

/** The few Jellyfin API calls the Play button needs. Failures become a message naming Jellyfin. */
export class JellyfinClient {
  constructor(private readonly server: { url: string; apiKey: string }) {}

  async check() {
    await this.get("/System/Info");
  }

  async users(): Promise<JellyfinUser[]> {
    const users = await this.get<{ Id: string; Name: string }[]>("/Users");
    return users.map((u) => ({ id: u.Id, name: u.Name }));
  }

  /** Jellyfin can't filter on a TMDB id: lists every series with its provider ids and matches them. */
  async seriesIdOf(tmdbId: number): Promise<string | null> {
    const { Items } = await this.get<{ Items: Item[] }>(
      "/Items?Recursive=true&IncludeItemTypes=Series&Fields=ProviderIds&HasTmdbId=true",
    );
    return Items.find((s) => s.ProviderIds?.Tmdb === String(tmdbId))?.Id ?? null;
  }

  async episodeId(seriesId: string, season: number, number: number): Promise<string | null> {
    const { Items } = await this.get<{ Items: Item[] }>(`/Shows/${seriesId}/Episodes?season=${season}`);
    return Items.find((e) => e.ParentIndexNumber === season && e.IndexNumber === number)?.Id ?? null;
  }

  /** Players of this Jellyfin user, seen in the last 15 minutes, that accept remote control. */
  async players(jellyfinUserId: string) {
    const sessions = await this.get<Session[]>(`/Sessions?ControllableByUserId=${jellyfinUserId}&ActiveWithinSeconds=900`);
    return sessions
      .filter((s) => s.SupportsRemoteControl)
      .map((s) => ({ sessionId: s.Id, name: [s.DeviceName, s.Client].filter(Boolean).join(" · ") || "Jellyfin player" }));
  }

  async play(sessionId: string, itemId: string) {
    await this.request("POST", `/Sessions/${sessionId}/Playing?playCommand=PlayNow&itemIds=${itemId}`);
  }

  private async get<T>(path: string): Promise<T> {
    return (await this.request("GET", path)).json() as Promise<T>;
  }

  private async request(method: string, path: string) {
    let res: Response;
    try {
      res = await fetch(this.server.url.replace(/\/+$/, "") + path, {
        method,
        headers: { Authorization: `MediaBrowser Token="${this.server.apiKey}"` },
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new InvalidInputError("Jellyfin doesn't answer at this URL");
    }
    if (res.status === 401) throw new InvalidInputError("Jellyfin refused the API key");
    if (!res.ok) throw new InvalidInputError(`Jellyfin answered ${res.status}`);
    return res;
  }
}
