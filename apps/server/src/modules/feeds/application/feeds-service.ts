import type { Status } from "@snug/shared";
import type { CatalogService } from "../../catalog/application/catalog-service";
import type { TrackingService } from "../../tracking/application/tracking-service";
import { moduleLogger } from "../../../shared/logger";

const log = moduleLogger("feeds");

/** Sonarr "Custom Lists" format: Sonarr reads tvdbId (title is for humans). */
export interface SonarrListItem {
  title: string;
  tvdbId: number;
}

/** Read-only views of a User's tracking for other apps (Sonarr). */
export class FeedsService {
  constructor(
    private readonly tracking: TrackingService,
    private readonly catalog: CatalogService,
  ) {}

  /** Series with one of `statuses`, as TheTVDB ids; Series without one are left out (Sonarr couldn't add them). */
  async sonarrList(userId: string, statuses: readonly Status[]): Promise<SonarrListItem[]> {
    const ids = await this.tracking.seriesIdsWithStatus(userId, statuses);
    const [series, tvdbIds] = await Promise.all([this.catalog.getMany(ids), this.catalog.tvdbIds(ids)]);
    const items: SonarrListItem[] = [];
    const skipped: string[] = [];
    for (const id of ids) {
      const tvdbId = tvdbIds.get(id);
      const title = series.get(id)?.name;
      if (tvdbId && title) items.push({ title, tvdbId });
      else skipped.push(title ?? `series ${id}`);
    }
    log.info(
      `Sonarr list (${statuses.join(", ")}): ${items.length} series` +
        (skipped.length ? `; left out, no TVDB id: ${skipped.join(", ")}` : ""),
    );
    return items;
  }
}
