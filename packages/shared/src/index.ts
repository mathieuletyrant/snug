/** API contract between apps/server and apps/web. Types only, plus a few pure constants. */

export const STATUSES = ["watchlist", "watching", "saving", "paused", "completed", "dropped"] as const;
export type Status = (typeof STATUSES)[number];

export interface EpisodeRef {
  season: number;
  number: number;
}

export interface Episode extends EpisodeRef {
  name: string;
  /** ISO date (YYYY-MM-DD), null when not announced. */
  airDate: string | null;
  /** Minutes, when TMDB knows it. */
  runtime?: number | null;
}

/** The Episode the home screen's one click marked, and the Status before it, to undo. */
export type WatchedNext = Episode & { previousStatus: Status };

/** Where a Series stands: Episodes out to watch after the Progress, the Next Episode's air date, or no date yet. */
export type Airing = { kind: "ready"; left: number } | { kind: "dated"; date: string } | { kind: "tba" };

export interface SeriesCard {
  seriesId: number;
  /** False while the Catalog has not fetched this Series yet. */
  loaded: boolean;
  name: string;
  year: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  status: Status;
  /** The Statuses the User can pick now: Completed only once the Series has ended and nothing is left, and then only it. */
  choosable: Status[];
  /** With the Saving up status: how far the saving is. */
  saving: Saving | null;
  progress: EpisodeRef | null;
  next: Episode | null;
  airing: Airing;
  /** Something to watch now: Watching with the Next Episode aired, or Saving up with enough saved. */
  ready: boolean;
  /** New mode (see `Preferences.newForDays`): Ready, and the Next Episode came out lately, while you were waiting for it. */
  fresh: boolean;
  watchedCount: number;
  airedCount: number;
  /** The User's rating of the whole Series, out of 10. */
  rating: number | null;
  /** Minutes to watch every aired Episode not watched yet; an Episode without a runtime counts as the Series' average. */
  minutesLeft: number;
  /** ISO datetime. */
  lastWatchedAt: string | null;
}

/** Saving up until a full season (target 0) or a number of Episodes is out. */
export const SAVING_TARGETS = [0, 3, 5, 10] as const;
export type SavingTarget = (typeof SAVING_TARGETS)[number];

export interface Saving {
  target: SavingTarget;
  /** Episodes saved so far: aired, not watched. */
  out: number;
  /** How many are needed: the target, or the season's Episodes left. */
  needed: number;
  reached: boolean;
  /** Air date of the last Episode needed, when known. */
  completeOn: string | null;
}

export interface Home {
  ready: SeriesCard[];
  upcoming: SeriesCard[];
}

export interface SeriesDetail extends Omit<SeriesCard, "loaded"> {
  tracked: boolean;
  overview: string;
  ended: boolean;
  /** `watchedAt`: ISO datetime of the first Watch. */
  seasons: {
    number: number;
    rating: number | null;
    episodes: (Episode & { watched: boolean; watchedAt: string | null; aired: boolean })[];
  }[];
}

/** Read-only feed URLs (paths, to prefix with the origin) for other apps. */
export interface Feeds {
  sonarrPath: string;
  /** iCal calendar of the Episodes of Watching and Saving up Series. */
  calendarPath: string;
}

/** URL path (to prefix with the origin) other apps POST `{ tmdbId }` to, adding a Series to the Watchlist. */
/** Where an Assistant (AI over MCP) connects to act on the User's Series (`?token=` included). */
export interface McpIntegration {
  mcpPath: string;
}

/** What the MCP server offers, as shown in Integrations; a test checks it against the server. */
export const MCP_FEATURES = [
  ["prompt", "import_history"],
  ["tool", "find_series"],
  ["tool", "import"],
  ["tool", "library"],
  ["tool", "series"],
  ["tool", "calendar"],
  ["tool", "set_status"],
  ["tool", "watch"],
  ["tool", "unwatch"],
  ["tool", "rate"],
  ["tool", "untrack"],
] as const;

export interface WatchlistIntegration {
  addPath: string;
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
  /** The instance's time zone (`TZ`): its days decide what has aired, so the app counts days in it too. */
  timeZone: string;
}

export const DEFAULT_LANGUAGE = "en-US";

/** Languages the app itself is written in; series details come in any TMDB language. */
export const APP_LOCALES = ["en", "fr"] as const;
export type Locale = (typeof APP_LOCALES)[number];

/** The app's language for a TMDB language: "fr-FR" → "fr"; English for the ones the app isn't written in. */
export const localeOf = (language: string): Locale => (language.toLowerCase().startsWith("fr") ? "fr" : "en");

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
  /** Spoiler shield: which titles of Episodes not watched yet are hidden. */
  episodeTitles: EpisodeTitles;
  /** New mode: for how many days a fresh Episode of a Series you were caught up on goes first on Home; 0 = off. */
  newForDays: NewForDays;
  /** On a series page: a progress bar on every season, or only on the last one. */
  seasonProgress: SeasonProgress;
  /** Rating Series and seasons out of 10; off hides every rating control. */
  showRatings: boolean;
  /** Push a notification when an Episode of a Series you're watching comes out. */
  notifyNewEpisodes: boolean;
}

/** "hideUnwatched" keeps the Next Episode's title; "hideAll" hides it too. */
export const EPISODE_TITLES = ["show", "hideUnwatched", "hideAll"] as const;
export type EpisodeTitles = (typeof EPISODE_TITLES)[number];

export const SEASON_PROGRESS = ["all", "current"] as const;
export type SeasonProgress = (typeof SEASON_PROGRESS)[number];

export const NEW_FOR_DAYS = [0, 3, 7, 14] as const;
export type NewForDays = (typeof NEW_FOR_DAYS)[number];

export const DEFAULT_PREFERENCES: Preferences = { hideUndatedUpcoming: false, episodeTitles: "show", newForDays: 7, notifyNewEpisodes: true, seasonProgress: "all", showRatings: true };

/** Whether the spoiler shield hides an Episode's title. */
export function isTitleHidden(p: Preferences, e: { watched: boolean; next: boolean }) {
  if (e.watched || p.episodeTitles === "show") return false;
  return p.episodeTitles === "hideAll" || !e.next;
}

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


export const episodeCode = (e: EpisodeRef) =>
  `S${String(e.season).padStart(2, "0")}E${String(e.number).padStart(2, "0")}`;
