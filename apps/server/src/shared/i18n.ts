/**
 * The server's own words that reach people: errors shown in the app, push notifications, the webhook
 * history, import problems. In the instance's language (French or English, like the app).
 */
import { type Locale, localeOf } from "@snug/shared";

const en = {
  errors: {
    notSignedIn: "Not signed in",
    adminsOnly: "Admins only",
    somethingWrong: "Something went wrong",
    fixFields: "Please fix the highlighted fields",
    expectedJson: "Expected a JSON body",
    expectedJsonObject: "Expected a JSON object",
    tmdbKeyShape: "This doesn't look like a TMDB key",
    tmdbKeyRejected: "TMDB rejected this key",
    tmdbLocale: "Use a TMDB locale like fr-FR",
    signUpClosed: "Sign-up is closed. Ask your admin for an account.",
    enterName: "Enter a name",
    enterEmail: "Enter a valid email",
    passwordLength: "Use at least 10 characters",
    emailTaken: "An account already uses this email",
    unknownWatchlistToken: "Unknown watchlist token",
    unknownWebhookToken: "Unknown webhook token",
    nothingToWatch: "No aired episode left to watch",
    notTracked: "This series is not in your library",
    invalidExport: "This file is not a valid export",
    importRunning: "An import is still running, wait for it to finish",
  },
  csv: {
    empty: "The file is empty",
    header: (columns: string) => `The first line must name the columns: ${columns}`,
    wholeNumber: (line: number, column: string) => `Line ${line}: ${column} must be a whole number`,
    needsTitle: (line: number) => `Line ${line}: needs a title or a tmdb_id`,
    seasonAndEpisode: (line: number) => `Line ${line}: season and episode go together`,
    notADate: (line: number) => `Line ${line}: watched_at is not a date (use 2024-02-18)`,
    unknownStatus: (line: number, status: string) => `Line ${line}: unknown status "${status}"`,
    noRows: "The file has no rows below the header",
    andMore: (count: number) => `and ${count} more`,
  },
  push: {
    testTitle: "Snug 🛋️",
    testBody: "Notifications work on this device.",
    caughtUp: "You're all caught up.",
    next: (code: string, name: string | null) => `Next: ${code}${name ? ` · ${name}` : ""}`,
    nextOn: (code: string, date: string) => `Next: ${code} on ${date}`,
    nextUndated: (code: string) => `Next: ${code}, date to be announced`,
    isOut: (code: string) => `${code} is out`,
    newEpisodes: (count: number, first: string, last: string) => `${count} new episodes: ${first} to ${last}`,
  },
  webhook: {
    specials: "Specials are not tracked",
    notFound: "Could not find this series on TMDB",
    marked: (series: string, code: string) => `Marked ${series} ${code} as watched`,
    incomplete: "Missing series name, season or episode number",
  },
};

type Messages = typeof en;

const fr: Messages = {
  errors: {
    notSignedIn: "Non connecté",
    adminsOnly: "Réservé à l'admin",
    somethingWrong: "Une erreur est survenue",
    fixFields: "Corrigez les champs en rouge",
    expectedJson: "Le corps de la requête doit être du JSON",
    expectedJsonObject: "Un objet JSON est attendu",
    tmdbKeyShape: "Ça ne ressemble pas à une clé TMDB",
    tmdbKeyRejected: "TMDB a refusé cette clé",
    tmdbLocale: "Utilisez une langue TMDB comme fr-FR",
    signUpClosed: "Les inscriptions sont fermées. Demandez un compte à votre admin.",
    enterName: "Saisissez un nom",
    enterEmail: "Saisissez un e-mail valide",
    passwordLength: "Au moins 10 caractères",
    emailTaken: "Un compte utilise déjà cet e-mail",
    unknownWatchlistToken: "Jeton de watchlist inconnu",
    unknownWebhookToken: "Jeton de webhook inconnu",
    nothingToWatch: "Plus aucun épisode sorti à regarder",
    notTracked: "Cette série n'est pas dans votre bibliothèque",
    invalidExport: "Ce fichier n'est pas un export valide",
    importRunning: "Un import est en cours, attendez qu'il se termine",
  },
  csv: {
    empty: "Le fichier est vide",
    header: (columns) => `La première ligne doit nommer les colonnes : ${columns}`,
    wholeNumber: (line, column) => `Ligne ${line} : ${column} doit être un nombre entier`,
    needsTitle: (line) => `Ligne ${line} : il faut un title ou un tmdb_id`,
    seasonAndEpisode: (line) => `Ligne ${line} : season et episode vont ensemble`,
    notADate: (line) => `Ligne ${line} : watched_at n'est pas une date (utilisez 2024-02-18)`,
    unknownStatus: (line, status) => `Ligne ${line} : statut inconnu « ${status} »`,
    noRows: "Le fichier n'a aucune ligne sous l'en-tête",
    andMore: (count) => `et ${count} de plus`,
  },
  push: {
    testTitle: "Snug 🛋️",
    testBody: "Les notifications marchent sur cet appareil.",
    caughtUp: "Vous êtes à jour.",
    next: (code, name) => `Ensuite : ${code}${name ? ` · ${name}` : ""}`,
    nextOn: (code, date) => `Ensuite : ${code} le ${date}`,
    nextUndated: (code) => `Ensuite : ${code}, date à venir`,
    isOut: (code) => `${code} est sorti`,
    newEpisodes: (count, first, last) => `${count} nouveaux épisodes : ${first} à ${last}`,
  },
  webhook: {
    specials: "Les épisodes spéciaux ne sont pas suivis",
    notFound: "Série introuvable sur TMDB",
    marked: (series, code) => `${series} ${code} marqué vu`,
    incomplete: "Nom de la série, saison ou numéro d'épisode manquant",
  },
};

const MESSAGES: Record<Locale, Messages> = { en, fr };

/** Where the instance's language comes from: the TMDB language setting (set by the container). */
let language: () => string = () => "en-US";

export function setLanguageSource(source: () => string) {
  language = source;
}

/** The messages in the instance's language, read at the time of use (the setting can change). */
export const t = (): Messages => MESSAGES[localeOf(language())];
