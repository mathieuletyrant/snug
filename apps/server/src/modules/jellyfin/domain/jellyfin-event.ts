/**
 * Payloads from the Jellyfin Webhook plugin (Generic destination, default template or "Send All Properties").
 * Values may arrive as booleans or strings ("True"), numbers or numeric strings.
 */

export type JellyfinEvent =
  | {
      kind: "episode-watched";
      seriesName: string;
      season: number;
      number: number;
      jellyfinSeriesId?: string;
      seriesTmdbId?: number;
      tvdbEpisodeId?: string;
      imdbEpisodeId?: string;
    }
  | { kind: "ignored"; reason: string };

const truthy = (v: unknown) => v === true || (typeof v === "string" && v.toLowerCase() === "true");
const int = (v: unknown) => {
  const n = typeof v === "number" ? v : Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : undefined;
};
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

export function parseJellyfinEvent(body: Record<string, unknown>): JellyfinEvent {
  const type = str(body.NotificationType);
  // Finishing playback, or ticking "mark played" in any Jellyfin client.
  const watched =
    (type === "PlaybackStop" && truthy(body.PlayedToCompletion)) ||
    (type === "UserDataSaved" && truthy(body.Played) && (!body.SaveReason || body.SaveReason === "TogglePlayed"));
  if (!watched) return { kind: "ignored", reason: `${type ?? "Unknown"} event without a completed watch` };
  if (body.ItemType !== "Episode") return { kind: "ignored", reason: `${str(body.ItemType) ?? "Item"} is not an episode` };

  const season = int(body.SeasonNumber);
  const number = int(body.EpisodeNumber);
  const seriesName = str(body.SeriesName);
  if (season === undefined || number === undefined || !seriesName) {
    return { kind: "ignored", reason: "Missing series name, season or episode number" };
  }
  return {
    kind: "episode-watched",
    seriesName,
    season,
    number,
    jellyfinSeriesId: str(body.SeriesId),
    // Item-level Provider_tmdb identifies the episode, not the series: only an explicit series id is trusted.
    seriesTmdbId: int(body.SeriesProvider_tmdb ?? body.SeriesTmdbId),
    tvdbEpisodeId: str(body.Provider_tvdb),
    imdbEpisodeId: str(body.Provider_imdb),
  };
}
