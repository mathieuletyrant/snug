import type { EpisodeTitles, Status } from "@snug/shared";
import type { ReactNode } from "react";

/** Puts an app's button or menu name in bold inside a sentence. */
type Bold = (text: string) => ReactNode;

/** The app's words, in English. The French catalog has the same shape, checked by TypeScript. */
export const en = {
  /** For dates and numbers (Intl). */
  tag: "en-US",

  common: {
    cancel: "Cancel",
    back: "Back",
    undo: "Undo",
    copied: "Copied",
    retryNow: "Retry now",
    somethingWrong: "Something went wrong",
    tba: "TBA",
    dateTba: "Date TBA",
  },
  days: {
    today: "Today",
    tomorrow: "Tomorrow",
    inDays: (n: number) => `In ${n} days`,
  },
  nav: { home: "Home", library: "Library", search: "Search", settings: "Settings" },
  status: {
    watchlist: "Watchlist",
    watching: "Watching",
    saving: "Saving up",
    paused: "Paused",
    completed: "Completed",
    dropped: "Dropped",
  } satisfies Record<Status, string>,

  unreachable: {
    title: "Can't reach Snug",
    body: "The server isn't answering. Retrying every few seconds…",
  },
  refreshing: "Refreshing",

  auth: {
    welcome: "Welcome to Snug",
    welcomeBack: "Welcome back",
    firstRunIntro: "Create your account. You'll be the admin of this Snug.",
    signInIntro: "Grab a blanket and sign in.",
    name: "Name",
    email: "Email",
    password: "Password",
    passwordHint: "At least 10 characters",
    createAccount: "Create account",
    signIn: "Sign in",
    tooManyAttempts: "Too many attempts, wait a minute and try again",
  },
  form: {
    thisField: "This field",
    required: (label: string) => `${label} is required`,
    email: "Enter a valid email, like you@example.com",
    minLength: (n: number) => `Use at least ${n} characters`,
  },
  setup: {
    title: "One last thing",
    intro: (link: ReactNode) => <>Snug gets series, posters and episodes from TMDB. Create a free key at {link} and paste it here.</>,
    waiting: "Your admin hasn't set up the TMDB key yet. Come back in a bit.",
  },
  tmdb: {
    keyLabel: "API key or read access token",
    keyPlaceholder: "eyJhbGciOi… or 32 characters",
    saved: "Saved.",
    checking: "Checking…",
    saveKey: "Save key",
    language: "Language",
    languageHint: "For the app, and for descriptions, episode titles and posters. The app is in English or French.",
    switching: (language: string) => `Switching to ${language}…`,
  },

  home: {
    greeting: { morning: "Good morning", afternoon: "Good afternoon", evening: "Cozy evening" },
    emptyTitle: "Nothing on the couch yet",
    emptyBody: "Find a series to start, import your history from Settings, or connect Jellyfin.",
    findSeries: "Find a series",
    ready: "Ready to watch",
    upcoming: "Upcoming",
    savedUp: "Saved up",
    new: "New",
    left: (n: number) => `${n} left`,
    markWatched: (code: string) => `Mark ${code} as watched`,
    markNextWatched: "Mark next episode as watched",
    watched: (code: string) => `${code} watched`,
    savingOut: (out: number, needed: number) => `${out}/${needed} out`,
    complete: (when: string) => `Complete ${when}`,
  },
  library: {
    title: "Library",
    statusFilter: "Status",
    filter: "Filter…",
    filterLabel: "Filter the library",
    empty: (status: string) => `No ${status.toLowerCase()} series`,
    toWatch: (n: number) => (n === 1 ? "1 episode to watch" : `${n} episodes to watch`),
    nextOn: (date: string) => `Next episode on ${date}`,
    caughtUpUndated: "Caught up, next episode not dated yet",
    changeStatus: "Change status",
    movedTo: (status: string) => `Moved to ${status}`,
  },
  search: {
    title: "Search",
    label: "Search a series",
    placeholder: "A series title…",
    empty: "No series found",
  },
  series: {
    ended: "Ended",
    airing: "Airing",
    at: (code: string) => `at ${code}`,
    startWatching: "Start watching",
    addToWatchlist: "Add to watchlist",
    season: (n: number) => `Season ${n}`,
    markSeasonWatched: "Mark season watched",
    markWatched: "Mark as watched",
    markUnwatched: "Mark as unwatched",
    hiddenTitle: "Hidden title, tap to show",
    remove: "Remove from library",
    removeTitle: (name: string) => `Remove ${name}?`,
    removeBody: "Its status and every episode you marked watched are deleted from Snug.",
    removeConfirm: "Remove",
    removed: "Removed from your library",
    catchUpTitle: (n: number) => (n === 1 ? "1 earlier episode not watched" : `${n} earlier episodes not watched`),
    catchUpBody: "Mark them watched too?",
    onlyThisOne: "Only this one",
    markAll: (n: number) => `Mark all ${n}`,
  },
  saving: {
    until: "Saving up until",
    fullSeason: "Full season",
    episodes: (n: number) => `${n} ep.`,
    ready: (n: number) => `Ready to binge: ${n} episodes.`,
    progress: (out: number, needed: number, lastOn: string | null) =>
      `${out} of ${needed} out${lastOn ? `, the last one on ${lastOn}` : ""}.`,
  },

  settings: {
    title: "Settings",
    sections: { general: "General", integrations: "Integrations", import: "Import", admin: "Admin" },
    sectionLabel: "Settings section",
    admin: "Admin",
    signOut: "Sign out",
    display: "Display",
    hideUndated: "Hide undated series",
    hideUndatedHelp: "Hide series with no air date yet (TBA) from Upcoming.",
    episodeTitles: "Episode titles",
    episodeTitlesHelp: "Blur titles of episodes you haven't watched, against spoilers. Tap one to show it.",
    titleChoices: { show: "Show all", hideUnwatched: "Hide unwatched", hideAll: "Hide all" } satisfies Record<
      EpisodeTitles,
      string
    >,
    newFirst: "New episodes first",
    newFirstHelp: "A new episode of a series you were caught up on goes first on Home, with a New badge.",
    off: "Off",
    days: (n: number) => `${n} days`,
    notifications: "Notifications",
    onThisDevice: "On this device",
    onThisDeviceHelp: "When Jellyfin marks an episode watched, with what's next.",
    pushUnsupported: "Not available here. On iPhone, add Snug to your Home Screen and open it from there (HTTPS only).",
    pushDenied: "Notifications are blocked. Allow them in your browser or phone settings.",
    devices: (n: number) => (n === 1 ? "1 device receives notifications." : `${n} devices receive notifications.`),
    sendTest: "Send a test",
    testSent: "Test sent",
  },
  integrations: {
    intro: "Each app gets its own secret URL. Replace it with ↻ if it leaks.",
    howToConnect: "How to connect",
    copyUrl: "Copy URL",
    copy: (what: string) => `Copy ${what}`,
    replaceTitle: "Replace this URL?",
    replaceBody: "The current URL stops working. Paste the new one where you used it.",
    replace: "Replace",
    newUrl: (what: string) => `New ${what}`,
    newUrlHelp: "New URL (the old one stops working)",
    jellyfin: {
      description: "Episodes you finish in Jellyfin are marked watched here.",
      url: "webhook URL",
      steps: [
        (b: Bold) => <>Install the {b("Webhook")} plugin (Dashboard → Plugins → Catalog) and restart.</>,
        (b: Bold) => <>Plugins → Webhook → {b("Add Generic Destination")}, paste the URL below.</>,
        (b: Bold) => (
          <>
            Tick {b("Playback Stop")} and {b("User Data Saved")}, select your user, tick {b("Send All Properties")}, save.
          </>
        ),
      ],
      history: "Webhook history",
      historyFilter: "Webhook history filter",
      outcomes: { all: "All", watched: "Watched", ignored: "Ignored", error: "Errors" },
      noMatch: "Nothing matches this filter.",
      noCalls: "No calls yet. Finish an episode in Jellyfin to see one here.",
      showMore: (n: number) => `Show ${n} more`,
    },
    sonarr: {
      description: "Sonarr downloads the series you pick below.",
      url: "Sonarr list URL",
      steps: [
        (b: Bold) => <>In Sonarr: Settings → Import Lists → + → {b("Custom Lists")}, paste the URL below.</>,
        () => <>Pick a quality profile and root folder, save.</>,
      ],
      toSend: "Series to send",
      toSendLabel: "Series to send to Sonarr",
      changed: "Changed your pick? Paste the new URL in Sonarr.",
    },
    spotarr: {
      description: "TV shows sent from Spotarr land on your Watchlist.",
      url: "Spotarr URL",
      steps: [
        (b: Bold) => <>In Spotarr: Settings → Connections → {b("Snug")}, paste the URL below, save.</>,
        (b: Bold) => <>Add a rule with the action {b("Add to Snug's Watchlist")}, or use the button on a TV show.</>,
      ],
    },
  },
  play: {
    title: (code: string) => `Play ${code}`,
    subtitle: "On a TV, or in your app.",
    noTv: "No TV open. Open your Jellyfin app on the TV, then try again.",
    openIn: (app: string) => `Open in ${app}`,
    notInJellyfin: "This episode isn't in Jellyfin.",
    playing: (code: string, player: string) => `Playing ${code} on ${player}`,
    apps: { jellyfin: "Jellyfin", jellytv: "JellyTV", custom: "Other app" },
    myApp: "my app",
    openEpisodesIn: "Open episodes in",
    jellyfinNeedsServer: "Needs the Jellyfin server set up by the admin, with its public URL.",
    appLink: "App link",
    appLinkHint: "Use {tmdbId}, {season}, {episode}, or {itemId} (the Jellyfin id).",
    jellyfinUser: "Your Jellyfin user",
    jellyfinUserHint: "For the ▶︎ button: your TVs show up there.",
    none: "None",
    server: "Jellyfin server",
    serverHelp: "For the ▶︎ button, which starts an episode on a Jellyfin player. Leave the URL empty to turn it off.",
    url: "URL",
    apiKey: "API key",
    apiKeySaved: "Saved (paste a new one to replace it)",
    apiKeyPlaceholder: "Dashboard → API Keys → +",
    publicUrl: "Public URL",
    publicUrlHint: "Where phones open Jellyfin, for the Open in Jellyfin link.",
    save: "Save",
    checking: "Checking…",
    connected: "Jellyfin connected",
    turnedOff: "Play button turned off",
  },
  ago: {
    justNow: "just now",
    minutes: (n: number) => `${n} min ago`,
    hours: (n: number) => `${n} h ago`,
  },
  import: {
    title: "Import",
    intro: (csv: ReactNode, template: ReactNode) => (
      <>
        Load series and history from a {csv} (one row per episode) or a JSON export. Nothing is erased. {template}
      </>
    ),
    template: "Download the CSV template",
    columnsHelp: (title: ReactNode, tmdbId: ReactNode) => (
      <>
        Only {title} or {tmdbId} is required. No season/episode: just adds the series.
      </>
    ),
    done: (series: number, watches: number) => `Imported ${series} series and ${watches} watches.`,
    notFound: (titles: string) => `Not found on TMDB: ${titles}. Add their tmdb_id and retry.`,
    notCsvOrJson: "This file is neither CSV nor JSON",
    importing: "Importing…",
    fetchingDetails: "Fetching details…",
    chooseFile: "Choose file",
    progressRunning: "Fetching series details…",
    progressMissing: "Some series details are missing",
    progressDone: "Series details fetched",
    progressFailed: (n: number) => `${n} series couldn't be fetched; they'll be retried automatically.`,
  },
  admin: {
    people: "People",
    peopleHelp: "Sign-up is closed. Create accounts here.",
    accountCreated: "Account created",
    seriesDetails: "Series details",
    seriesDetailsHelp: "From TMDB, for everyone on this Snug.",
  },
};

export type Messages = typeof en;
