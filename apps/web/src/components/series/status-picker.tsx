import { type SeriesDetail, STATUSES } from "@snug/shared";
import { Plus } from "lucide-react";
import { useT } from "@/i18n";
import { useSetStatus } from "@/components/series-actions";
import { Button, Chips } from "@/components/ui";

/** A tracked series' status as pills; an untracked one gets two ways in. */
export function StatusPicker({ series }: { series: SeriesDetail }) {
  const setStatus = useSetStatus();
  const t = useT();
  const set = (status: SeriesDetail["status"]) => setStatus.mutate({ seriesId: series.seriesId, status });

  if (!series.tracked) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => set("watching")}>
          <Plus className="size-4" /> {t.series.startWatching}
        </Button>
        <Button variant="ghost" onClick={() => set("watchlist")}>
          {t.series.addToWatchlist}
        </Button>
      </div>
    );
  }
  return (
    <Chips
      label={t.library.statusFilter}
      wrap
      value={series.status}
      onChange={set}
      options={STATUSES.map((s) => ({ value: s, label: t.status[s] }))}
    />
  );
}
