import { useMutation } from "@tanstack/react-query";
import { type Saving, SAVING_TARGETS, type SavingTarget } from "@snug/shared";
import { api, queryClient } from "../../api";
import { useT } from "../../i18n";
import { shortDate } from "../airing";
import { Chips, ProgressBar } from "../ui";

/** Saving up: what to wait for, and where the saving stands. */
export function SavingPanel({ seriesId, saving }: { seriesId: number; saving: Saving }) {
  const t = useT();
  const save = useMutation({
    mutationFn: (savingTarget: SavingTarget) =>
      api(`/series/${seriesId}`, { method: "PUT", body: { status: "saving", savingTarget } }),
    onSuccess: () => queryClient.invalidateQueries(),
  });
  const date = saving.completeOn ? shortDate(t.tag, saving.completeOn) : null;
  return (
    <div className="space-y-3 rounded-3xl border border-line/60 bg-surface/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">{t.saving.until}</span>
        <Chips
          label={t.saving.until}
          small
          value={String(saving.target)}
          onChange={(target) => save.mutate(Number(target) as SavingTarget)}
          options={SAVING_TARGETS.map((n) => ({ value: String(n), label: n === 0 ? t.saving.fullSeason : t.saving.episodes(n) }))}
        />
      </div>
      <ProgressBar value={saving.out} max={saving.needed} />
      <p className="text-sm text-muted">
        {saving.reached ? t.saving.ready(saving.out) : t.saving.progress(saving.out, saving.needed, date)}
      </p>
    </div>
  );
}
