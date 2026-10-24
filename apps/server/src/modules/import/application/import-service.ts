import type { ImportProgress, ImportResult } from "@snug/shared";
import type { CatalogService } from "../../catalog/application/catalog-service";
import { forEachLimit } from "../../../shared/async";
import { InvalidInputError } from "../../../shared/errors";
import { moduleLogger, reason } from "../../../shared/logger";
import type { ImportEntry, ImportPreview, TrackingService } from "../../tracking/application/tracking-service";
import { CsvImportError, type CsvRow, csvRowsToEntries, parseCsvImport } from "../domain/csv-import";
import { parseImportFile } from "../domain/import-file";
import { t } from "../../../shared/i18n";

const IDLE: ImportProgress = { running: false, total: 0, done: 0, failed: 0 };

const log = moduleLogger("import");

export class ImportService {
  /** ponytail: in memory, lost on restart; the periodic Catalog refresh fetches whatever is still missing. */
  private readonly progress = new Map<string, ImportProgress>();
  /** Background passes still running per User: batches sent one after another share one progress. */
  private readonly passes = new Map<string, number>();
  /** Series TMDB could not give during the current or last import, per User. */
  private readonly failures = new Map<string, number[]>();
  /** Series already queued in the current pass, so one split across two batches is fetched once. */
  private readonly queued = new Map<string, Set<number>>();

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

  /**
   * One batch of a large import sent by an assistant (MCP): accepted even while earlier batches are still
   * being fetched from TMDB. Idempotent: a batch sent twice records nothing new.
   */
  async importBatch(userId: string, entries: ImportEntry[]): Promise<ImportPreview> {
    const preview = await this.tracking.previewImport(userId, entries);
    // A batch sent again has nothing new: nothing to write, nothing to fetch.
    if (!preview.newSeries && !preview.newWatches) return preview;
    await this.run(userId, entries, []);
    return preview;
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
    this.fetchInBackground(userId, ids);
    return { series: entries.length, watches, unresolved };
  }

  private fetchInBackground(userId: string, all: number[]) {
    const current = this.progress.get(userId);
    const progress = current?.running ? current : { running: true, total: 0, done: 0, failed: 0 };
    if (progress !== current) {
      this.progress.set(userId, progress);
      this.failures.set(userId, []);
      this.queued.set(userId, new Set());
    }
    const queued = this.queued.get(userId)!;
    const ids = all.filter((id) => !queued.has(id));
    for (const id of ids) queued.add(id);
    progress.total += ids.length;
    this.passes.set(userId, (this.passes.get(userId) ?? 0) + 1);
    const failed = this.failures.get(userId)!;
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
        if (!failed.includes(id)) failed.push(id);
        log.warn(`Could not fetch series ${id}: ${reason(error)}`);
      },
    ).finally(() => {
      const left = (this.passes.get(userId) ?? 1) - 1;
      this.passes.set(userId, left);
      if (left > 0) return;
      progress.running = false;
      log.info(`Import finished: ${progress.done} series fetched, ${progress.failed} failed`);
    });
  }

  /** Series ids TMDB could not give during the current or last import. */
  failuresOf(userId: string): number[] {
    return this.failures.get(userId) ?? [];
  }

  private assertIdle(userId: string) {
    if (this.progressOf(userId).running) throw new InvalidInputError(t().errors.importRunning);
  }

  progressOf(userId: string): ImportProgress {
    return this.progress.get(userId) ?? IDLE;
  }
}
