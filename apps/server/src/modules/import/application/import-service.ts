import type { ImportProgress, ImportResult } from "@snug/shared";
import type { CatalogService } from "../../catalog/application/catalog-service";
import { forEachLimit } from "../../../shared/async";
import { InvalidInputError } from "../../../shared/errors";
import { moduleLogger, reason } from "../../../shared/logger";
import type { ImportEntry, TrackingService } from "../../tracking/application/tracking-service";
import { CsvImportError, type CsvRow, csvRowsToEntries, parseCsvImport } from "../domain/csv-import";
import { parseImportFile } from "../domain/import-file";
import { t } from "../../../shared/i18n";

const IDLE: ImportProgress = { running: false, total: 0, done: 0, failed: 0 };

const log = moduleLogger("import");

export class ImportService {
  /** ponytail: in memory, lost on restart; the periodic Catalog refresh fetches whatever is still missing. */
  private readonly progress = new Map<string, ImportProgress>();

  constructor(
    private readonly tracking: TrackingService,
    private readonly catalog: CatalogService,
  ) {}

  /** JSON export (see import-file.ts). */
  async importJson(userId: string, json: unknown): Promise<ImportResult> {
    this.assertIdle(userId);
    let entries: ImportEntry[];
    try {
      entries = parseImportFile(json);
    } catch {
      throw new InvalidInputError(t().errors.invalidExport);
    }
    return this.run(userId, entries, []);
  }

  /** CSV (see csv-import.ts); titles without a tmdb_id are looked up on TMDB first. */
  async importCsv(userId: string, text: string): Promise<ImportResult> {
    this.assertIdle(userId);
    let rows: CsvRow[];
    try {
      rows = parseCsvImport(text);
    } catch (error) {
      if (error instanceof CsvImportError) throw new InvalidInputError(error.message);
      throw error;
    }
    const titles = [...new Set(rows.filter((r) => !r.tmdbId && r.title).map((r) => r.title as string))];
    const ids = new Map<string, number | null>();
    await forEachLimit(titles, 6, async (title) => ids.set(title, await this.catalog.resolve({ title })));
    const entries = csvRowsToEntries(rows, (title) => ids.get(title) ?? null, new Date());
    return this.run(userId, entries, titles.filter((t) => !ids.get(t)));
  }

  /** Imports right away; Series metadata is then fetched in the background (see `progressOf`). */
  private async run(userId: string, entries: ImportEntry[], unresolved: string[]): Promise<ImportResult> {
    const ids = await this.tracking.import(userId, entries);

    const watches = entries.reduce((n, e) => n + e.watches.length, 0);
    log.info(
      `Imported ${entries.length} series and ${watches} watches` +
        (unresolved.length ? `; not found on TMDB: ${unresolved.join(", ")}` : "") +
        `. Fetching ${ids.length} series from TMDB…`,
    );
    const progress: ImportProgress = { running: true, total: ids.length, done: 0, failed: 0 };
    this.progress.set(userId, progress);
    void forEachLimit(
      ids,
      6,
      async (id) => {
        await this.catalog.ensure(id);
        await this.tracking.reconcileSeries(id);
        progress.done++;
      },
      (id, error) => {
        progress.failed++;
        log.warn(`Could not fetch series ${id}: ${reason(error)}`);
      },
    ).finally(() => {
      progress.running = false;
      log.info(`Import finished: ${progress.done} series fetched, ${progress.failed} failed`);
    });

    return { series: entries.length, watches, unresolved };
  }

  private assertIdle(userId: string) {
    if (this.progressOf(userId).running) throw new InvalidInputError(t().errors.importRunning);
  }

  progressOf(userId: string): ImportProgress {
    return this.progress.get(userId) ?? IDLE;
  }
}
