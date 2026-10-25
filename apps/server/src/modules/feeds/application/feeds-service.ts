import type { Status } from "@snug/shared";
import type { CatalogService } from "@/modules/catalog/application/catalog-service";
import type { TrackingService } from "@/modules/tracking/application/tracking-service";
import { addDays, today } from "@/shared/day";
import { episodeLabel } from "@/shared/i18n";
import { moduleLogger } from "@/shared/logger";

const log = moduleLogger("feeds");

/** Sonarr "Custom Lists" format: Sonarr reads tvdbId (title is for humans). */
export interface SonarrListItem {
  title: string;
  tvdbId: number;
}

/** The calendar shows the last month too, so a late catch-up still finds its Episodes. */
const CALENDAR_PAST_DAYS = 30;

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

  /**
   * iCal calendar of the Episodes of Watching and Saving up Series, as all-day events (TMDB has no air time).
   * Episode titles are left out: the calendar can't apply the spoiler shield.
   */
  async calendar(userId: string, now = new Date()): Promise<string> {
    const stamp = now.toISOString().replace(/[-:]|\.\d+/g, "");
    const events: string[] = [];
    for (const { series, episode, absoluteNumbering } of await this.tracking.airing(userId, addDays(today(now), -CALENDAR_PAST_DAYS))) {
      events.push(
        "BEGIN:VEVENT",
        `UID:${series.tmdbId}-${episode.season}-${episode.number}@snug`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${episode.airDate.replaceAll("-", "")}`,
        `DTEND;VALUE=DATE:${addDays(episode.airDate, 1).replaceAll("-", "")}`,
        `SUMMARY:${escapeText(`${series.name} ${episodeLabel(episode, absoluteNumbering)}`)}`,
        "END:VEVENT",
      );
    }
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Snug//EN", "X-WR-CALNAME:Snug", ...events, "END:VCALENDAR"];
    return lines.map(fold).join("\r\n") + "\r\n";
  }
}

const escapeText = (s: string) => s.replace(/[\\;,]/g, (char) => `\\${char}`).replace(/\n/g, "\\n");

/** iCal lines are at most 75 bytes; longer ones continue on lines starting with a space. */
function fold(line: string): string {
  const parts: string[] = [];
  let part = "";
  for (const char of line) {
    if (Buffer.byteLength(part + char) > (parts.length ? 74 : 75)) {
      parts.push(part);
      part = "";
    }
    part += char;
  }
  return [...parts, part].join("\r\n ");
}
