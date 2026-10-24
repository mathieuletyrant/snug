import { type SeriesDetail, STATUS_LABELS, STATUSES } from "@snug/shared";
import { Plus } from "lucide-react";
import { useSetStatus } from "../series-actions";
import { Button, Chips } from "../ui";

/** A tracked series' status as pills; an untracked one gets two ways in. */
export function StatusPicker({ series }: { series: SeriesDetail }) {
  const setStatus = useSetStatus();
  const set = (status: SeriesDetail["status"]) => setStatus.mutate({ seriesId: series.seriesId, status });

  if (!series.tracked) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => set("watching")}>
          <Plus className="size-4" /> Start watching
        </Button>
        <Button variant="ghost" onClick={() => set("watchlist")}>
          Add to watchlist
        </Button>
      </div>
    );
  }
  return (
    <Chips
      label="Status"
      wrap
      value={series.status}
      onChange={set}
      options={STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
    />
  );
}
