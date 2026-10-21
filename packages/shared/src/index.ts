/** API contract between apps/server and apps/web. Types only, plus a few pure constants. */

export const STATUSES = ["watchlist", "watching", "paused", "completed", "dropped"] as const;
export type Status = (typeof STATUSES)[number];

export interface EpisodeRef {
  season: number;
  number: number;
}

export interface Episode extends EpisodeRef {
  name: string;
  /** ISO date (YYYY-MM-DD), null when not announced. */
  airDate: string | null;
}

export interface SeriesCard {
  seriesId: number;
  /** False while the Catalog has not fetched this Series yet. */
  loaded: boolean;
  name: string;
  year: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  status: Status;
  progress: EpisodeRef | null;
  next: Episode | null;
  watchedCount: number;
  airedCount: number;
  /** ISO datetime. */
  lastWatchedAt: string | null;
}

export interface Home {
  ready: SeriesCard[];
  upcoming: SeriesCard[];
}

export interface SeriesDetail extends Omit<SeriesCard, "loaded"> {
  tracked: boolean;
  overview: string;
  ended: boolean;
  seasons: { number: number; episodes: (Episode & { watched: boolean; aired: boolean })[] }[];
}

/** Read-only feed URLs (paths, to prefix with the origin) for other apps. */
export interface Feeds {
  sonarrPath: string;
}

export interface SeriesSummary {
  tmdbId: number;
  name: string;
  year: number | null;
  overview: string;
  posterPath: string | null;
}

export interface SetupState {
  hasUsers: boolean;
  hasTmdbKey: boolean;
  /** Language of series details (descriptions, episode names, posters). */
  language: string;
}

export const DEFAULT_LANGUAGE = "en-US";

/** Languages offered for series details; any TMDB locale works, these are the common ones. */
export const LANGUAGES = [
  { code: "en-US", label: "English" },
  { code: "fr-FR", label: "Français" },
  { code: "es-ES", label: "Español" },
  { code: "de-DE", label: "Deutsch" },
  { code: "it-IT", label: "Italiano" },
  { code: "pt-BR", label: "Português (Brasil)" },
  { code: "pt-PT", label: "Português" },
  { code: "nl-NL", label: "Nederlands" },
  { code: "pl-PL", label: "Polski" },
  { code: "ja-JP", label: "日本語" },
] as const;

export interface Me {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
}

/** Per-user display preferences. */
export interface Preferences {
  /** Hide Upcoming Series whose next Episode has no air date yet. */
  hideUndatedUpcoming: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = { hideUndatedUpcoming: false };

/** Web Push: the server's public key, and how many devices of this User receive notifications. */
export interface PushSettings {
  publicKey: string;
  devices: number;
}

export interface ImportResult {
  series: number;
  watches: number;
  /** CSV titles that matched no series on TMDB (skipped). */
  unresolved: string[];
}

/** Background fetch of Series details that follows an Import. */
export interface ImportProgress {
  running: boolean;
  total: number;
  done: number;
  failed: number;
}

export interface JellyfinEventLog {
  receivedAt: string;
  summary: string;
  outcome: "watched" | "ignored" | "error";
  message: string;
  /** Series the call was resolved to, when it was. */
  seriesId: number | null;
  /** Raw JSON body sent by Jellyfin. */
  payload: string | null;
}

export interface JellyfinIntegration {
  webhookPath: string;
  events: JellyfinEventLog[];
}

export const STATUS_LABELS: Record<Status, string> = {
  watchlist: "Watchlist",
  watching: "Watching",
  paused: "Paused",
  completed: "Completed",
  dropped: "Dropped",
};

export const episodeCode = (e: EpisodeRef) =>
  `S${String(e.season).padStart(2, "0")}E${String(e.number).padStart(2, "0")}`;
