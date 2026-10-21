import type { Status } from "@snug/shared";
import type { ImportEntry } from "../../tracking/application/tracking-service";
import { STATUS_ALIASES } from "./import-file";

/**
 * CSV import, one row per watched Episode (or per Series to just add it):
 *   title,tmdb_id,season,episode,watched_at,status
 * Either `title` or `tmdb_id` is required; everything else is optional.
 */

export interface CsvRow {
  line: number;
  title?: string;
  tmdbId?: number;
  season?: number;
  number?: number;
  watchedAt?: Date;
  status?: Status;
}

export class CsvImportError extends Error {
  constructor(readonly problems: string[]) {
    super(problems.slice(0, 5).join(" · ") + (problems.length > 5 ? ` · and ${problems.length - 5} more` : ""));
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
  return rows.filter((r) => r.some((cell) => cell.trim()));
}

const COLUMNS = ["title", "tmdb_id", "season", "episode", "watched_at", "status"] as const;

export function parseCsvImport(text: string): CsvRow[] {
  const [header, ...lines] = readCsv(text);
  if (!header) throw new CsvImportError(["The file is empty"]);
  const index = new Map(header.map((h, i) => [h.trim().toLowerCase(), i]));
  if (!index.has("title") && !index.has("tmdb_id")) {
    throw new CsvImportError([`The first line must name the columns: ${COLUMNS.join(",")}`]);
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
      if (!Number.isInteger(n) || n < min) problems.push(`Line ${line}: ${column} must be a whole number`);
      return n;
    };

    const row: CsvRow = { line, title: get("title") || undefined, tmdbId: int("tmdb_id", 1) };
    row.season = int("season", 0);
    row.number = int("episode", 1);
    if (!row.title && !row.tmdbId) problems.push(`Line ${line}: needs a title or a tmdb_id`);
    if ((row.season === undefined) !== (row.number === undefined)) {
      problems.push(`Line ${line}: season and episode go together`);
    }

    const watchedAt = get("watched_at");
    if (watchedAt) {
      row.watchedAt = new Date(watchedAt);
      if (Number.isNaN(row.watchedAt.getTime())) problems.push(`Line ${line}: watched_at is not a date (use 2024-02-18)`);
    }

    const status = get("status").toLowerCase();
    if (status) {
      row.status = STATUS_ALIASES[status];
      if (!row.status) problems.push(`Line ${line}: unknown status "${status}"`);
    }
    rows.push(row);
  });

  if (problems.length) throw new CsvImportError(problems);
  if (!rows.length) throw new CsvImportError(["The file has no rows below the header"]);
  return rows;
}

/**
 * Groups rows into one entry per Series. `seriesIdOf` turns a title into a TMDB id (null when not found).
 * Status: the last explicit one wins; otherwise Watching when something was watched, Watchlist when not.
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
    entries.set(id, entry);
  }
  return [...entries.values()].map(({ explicit: _, ...entry }) => entry);
}
