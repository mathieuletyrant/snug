import type { ImportProgress, ImportResult } from "@snug/shared";
import type { CatalogService } from "../../catalog/application/catalog-service";
import { forEachLimit } from "../../../shared/async";
import { InvalidInputError } from "../../../shared/errors";
import type { TrackingService } from "../../tracking/application/tracking-service";
import { parseImportFile } from "../domain/import-file";

const IDLE: ImportProgress = { running: false, total: 0, done: 0, failed: 0 };

export class ImportService {
  /** ponytail: in memory, lost on restart; the periodic Catalog refresh fetches whatever is still missing. */
  private readonly progress = new Map<string, ImportProgress>();

  constructor(
    private readonly tracking: TrackingService,
    private readonly catalog: CatalogService,
  ) {}

  /** Imports right away; Series metadata is then fetched in the background (see `progressOf`). */
  async import(userId: string, json: unknown): Promise<ImportResult> {
    if (this.progressOf(userId).running) throw new InvalidInputError("An import is still running, wait for it to finish");
    let entries: ReturnType<typeof parseImportFile>;
    try {
      entries = parseImportFile(json);
    } catch {
      throw new InvalidInputError("This file is not a valid export");
    }
    const ids = await this.tracking.import(userId, entries);

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
        console.error(`Import: could not fetch series ${id}`, error);
      },
    ).finally(() => (progress.running = false));

    return { series: entries.length, watches: entries.reduce((n, e) => n + e.watches.length, 0) };
  }

  progressOf(userId: string): ImportProgress {
    return this.progress.get(userId) ?? IDLE;
  }
}
