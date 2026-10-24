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
  /** With the Saving up status: how far the saving is. */
  saving: Saving | null;
  progress: EpisodeRef | null;
  next: Episode | null;
  watchedCount: number;
  airedCount: number;
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
  seasons: { number: number; episodes: (Episode & { watched: boolean; aired: boolean })[] }[];
}

/** Read-only feed URLs (paths, to prefix with the origin) for other apps. */
export interface Feeds {
  sonarrPath: string;
}

/** URL path (to prefix with the origin) other apps POST `{ tmdbId }` to, adding a Series to the Watchlist. */
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
  /** The app the ▶︎ sheet opens an Episode in. */
  watchApp: WatchApp;
  /** With watchApp "custom": a link with {tmdbId}, {season}, {episode} and {itemId} in it. */
  watchLink: string;
}

export const WATCH_APPS = ["jellyfin", "jellytv", "custom"] as const;
export type WatchApp = (typeof WATCH_APPS)[number];

/** "hideUnwatched" keeps the Next Episode's title; "hideAll" hides it too. */
export const EPISODE_TITLES = ["show", "hideUnwatched", "hideAll"] as const;
export type EpisodeTitles = (typeof EPISODE_TITLES)[number];

export const NEW_FOR_DAYS = [0, 3, 7, 14] as const;
export type NewForDays = (typeof NEW_FOR_DAYS)[number];

export const DEFAULT_PREFERENCES: Preferences = {
  hideUndatedUpcoming: false,
  episodeTitles: "show",
  newForDays: 7,
  watchApp: "jellyfin",
  watchLink: "",
};

/**
 * The link that opens an Episode in the chosen app. Jellyfin's page needs the server's public URL and the
 * Episode's Jellyfin id; JellyTV plays the Jellyfin id when known, else opens the Episode by its TMDB id.
 * Null when the app can't be reached with what is known.
 */
export function watchLink(
  p: Pick<Preferences, "watchApp" | "watchLink">,
  e: { tmdbId: number; season: number; episode: number; itemId: string | null; jellyfinUrl: string | null },
): string | null {
  if (p.watchApp === "jellyfin") return e.jellyfinUrl && e.itemId && `${e.jellyfinUrl}/web/#/details?id=${e.itemId}`;
  if (p.watchApp === "jellytv") {
    return e.itemId ? `jellytv://play/${e.itemId}` : `jellytv://tv/${e.tmdbId}/season/${e.season}/episode/${e.episode}`;
  }
  if (!p.watchLink || (p.watchLink.includes("{itemId}") && !e.itemId)) return null;
  return p.watchLink
    .replaceAll("{tmdbId}", String(e.tmdbId))
    .replaceAll("{season}", String(e.season))
    .replaceAll("{episode}", String(e.episode))
    .replaceAll("{itemId}", e.itemId ?? "");
}

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
  /** Play button: whether the admin set up the Jellyfin server, and this User's Jellyfin user. */
  playback: { server: boolean; jellyfinUserId: string | null };
}

/** The Jellyfin server Snug talks to for the Play button (admin). The API key is never sent back. */
export interface JellyfinServer {
  /** How Snug reaches Jellyfin, e.g. http://jellyfin_server_1:8096. */
  url: string;
  /** How phones reach Jellyfin, for "Open in Jellyfin" links, e.g. https://tv.example.com. */
  publicUrl: string;
  hasApiKey: boolean;
}

export interface JellyfinUser {
  id: string;
  name: string;
}

/** Where an Episode can be played: Jellyfin players accepting remote control, and a link to its page. */
export interface PlayOptions {
  /** Empty until the admin sets up Jellyfin and the User picks their Jellyfin user. */
  players: { sessionId: string; name: string }[];
  /** The Episode's Jellyfin id; null without a Jellyfin server, or when Jellyfin doesn't have it. */
  itemId: string | null;
  /** The server's public URL, for links to its pages; null when not set. */
  jellyfinUrl: string | null;
}


export const episodeCode = (e: EpisodeRef) =>
  `S${String(e.season).padStart(2, "0")}E${String(e.number).padStart(2, "0")}`;
