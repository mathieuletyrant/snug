import { SAVING_TARGETS, type SavingTarget, type Status } from "@snug/shared";
import type { ImportEntry } from "@/modules/tracking/application/tracking-service";
import { WHOLE_SERIES } from "@/modules/tracking/domain/tracked-series";
import { STATUS_ALIASES } from "./import-file";
import { startOf } from "@/shared/day";
import { t } from "@/shared/i18n";

/**
 * CSV import, one row per watched Episode (or per Series to just add it):
 *   title,tmdb_id,season,episode,watched_at,status,rating,season_rating,saving_target,absolute_numbering
 * Either `title` or `tmdb_id` is required; everything else is optional. `rating` rates the Series and
 * `season_rating` the row's season, out of 10; a row may give a season and its rating without an episode.
 * `saving_target` (0 for a full season, or 3, 5, 10 Episodes) and `absolute_numbering` (true/false) are the
 * Series' own, like `status`. It is also the Export's format (see csv-export.ts).
 */

export interface CsvRow {
  line: number;
  title?: string;
  tmdbId?: number;
  season?: number;
  number?: number;
  watchedAt?: Date;
  status?: Status;
  rating?: number;
  seasonRating?: number;
  savingTarget?: SavingTarget;
  absoluteNumbering?: boolean;
}

export class CsvImportError extends Error {
  constructor(readonly problems: string[]) {
    super(problems.slice(0, 5).join(" · ") + (problems.length > 5 ? ` · ${t().csv.andMore(problems.length - 5)}` : ""));
  }
}

/** Minimal RFC 4180 reader: commas, quoted fields with "" escapes and line breaks, CRLF or LF. */
export function readCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const source = text.replace(/^﻿/, ""); // Excel's BOM
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && source[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field || row.length) rows.push([...row, field]);
  return rows.filter((row) => row.some((cell) => cell.trim()));
}

export const COLUMNS = [
  "title",
  "tmdb_id",
  "season",
  "episode",
  "watched_at",
  "status",
  "rating",
  "season_rating",
  "saving_target",
  "absolute_numbering",
] as const;

export function parseCsvImport(text: string): CsvRow[] {
  const [header, ...lines] = readCsv(text);
  if (!header) throw new CsvImportError([t().csv.empty]);
  const index = new Map(header.map((name, position) => [name.trim().toLowerCase(), position]));
  if (!index.has("title") && !index.has("tmdb_id")) {
    throw new CsvImportError([t().csv.header(COLUMNS.join(","))]);
  }

  const problems: string[] = [];
  const rows: CsvRow[] = [];
  lines.forEach((cells, i) => {
    const line = i + 2;
    const get = (column: (typeof COLUMNS)[number]) => {
      const at = index.get(column);
      return at === undefined ? "" : (cells[at] ?? "").trim();
    };
    const int = (column: "tmdb_id" | "season" | "episode", min: number) => {
      const raw = get(column);
      if (!raw) return undefined;
      const n = Number(raw);
      if (!Number.isInteger(n) || n < min) problems.push(t().csv.wholeNumber(line, column));
      return n;
    };

    const row: CsvRow = { line, title: get("title") || undefined, tmdbId: int("tmdb_id", 1) };
    row.season = int("season", 0);
    row.number = int("episode", 1);
    const rating = (column: "rating" | "season_rating") => {
      const raw = get(column);
      if (!raw) return undefined;
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 1 || n > 10) problems.push(t().csv.notARating(line, column));
      return n;
    };
    row.rating = rating("rating");
    row.seasonRating = rating("season_rating");
    if (!row.title && !row.tmdbId) problems.push(t().csv.needsTitle(line));
    const seasonAlone = row.season !== undefined && row.number === undefined && row.seasonRating !== undefined;
    if ((row.season === undefined) !== (row.number === undefined) && !seasonAlone) {
      problems.push(t().csv.seasonAndEpisode(line));
    }

    const watchedAt = get("watched_at");
    if (watchedAt) {
      row.watchedAt = /^\d{4}-\d{2}-\d{2}$/.test(watchedAt) ? startOf(watchedAt) : new Date(watchedAt);
      if (Number.isNaN(row.watchedAt.getTime())) problems.push(t().csv.notADate(line));
    }

    const savingTarget = get("saving_target");
    if (savingTarget) {
      row.savingTarget = SAVING_TARGETS.find((target) => String(target) === savingTarget);
      if (row.savingTarget === undefined) problems.push(t().csv.notASavingTarget(line, SAVING_TARGETS.join(", ")));
    }
    const absoluteNumbering = get("absolute_numbering").toLowerCase();
    if (absoluteNumbering) {
      row.absoluteNumbering = absoluteNumbering === "true" ? true : absoluteNumbering === "false" ? false : undefined;
      if (row.absoluteNumbering === undefined) problems.push(t().csv.notABoolean(line, "absolute_numbering"));
    }

    const status = get("status").toLowerCase();
    if (status) {
      row.status = STATUS_ALIASES[status];
      if (!row.status) problems.push(t().csv.unknownStatus(line, status));
    }
    rows.push(row);
  });

  if (problems.length) throw new CsvImportError(problems);
  if (!rows.length) throw new CsvImportError([t().csv.noRows]);
  return rows;
}

/**
 * Groups rows into one entry per Series. `seriesIdOf` turns a title into a TMDB id (null when not found).
 * Status: the last explicit one wins; otherwise Watching when something was watched, Watchlist when not.
 * Ratings, saving_target and absolute_numbering: the last one given wins.
 */
export function csvRowsToEntries(rows: CsvRow[], seriesIdOf: (title: string) => number | null, now: Date): ImportEntry[] {
  const entries = new Map<number, ImportEntry & { explicit: boolean }>();
  for (const row of rows) {
    const id = row.tmdbId ?? (row.title ? seriesIdOf(row.title) : null);
    if (!id) continue;
    const entry = entries.get(id) ?? { seriesId: id, status: "watchlist", watches: [], explicit: false };
    if (row.season && row.number) {
      entry.watches.push({ season: row.season, number: row.number, watchedAt: row.watchedAt ?? now });
      if (!entry.explicit) entry.status = "watching";
    }
    if (row.status) Object.assign(entry, { status: row.status, explicit: true });
    if (row.savingTarget !== undefined) entry.savingTarget = row.savingTarget;
    if (row.absoluteNumbering !== undefined) entry.absoluteNumbering = row.absoluteNumbering;
    const ratings = new Map((entry.ratings ?? []).map((rating) => [rating.season, rating.rating]));
    if (row.rating) ratings.set(WHOLE_SERIES, row.rating);
    if (row.seasonRating && row.season) ratings.set(row.season, row.seasonRating);
    if (ratings.size) entry.ratings = [...ratings].map(([season, rating]) => ({ season, rating }));
    entries.set(id, entry);
  }
  return [...entries.values()].map(({ explicit: _, ...entry }) => entry);
}
