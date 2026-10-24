import { useMutation } from "@tanstack/react-query";
import { type Saving, SAVING_TARGETS, type SavingTarget } from "@snug/shared";
import { api, queryClient } from "../../api";
import { Chips, ProgressBar } from "../ui";

/** Saving up: what to wait for, and where the saving stands. */
export function SavingPanel({ seriesId, saving }: { seriesId: number; saving: Saving }) {
  const save = useMutation({
    mutationFn: (savingTarget: SavingTarget) =>
      api(`/series/${seriesId}`, { method: "PUT", body: { status: "saving", savingTarget } }),
    onSuccess: () => queryClient.invalidateQueries(),
  });
  const date = saving.completeOn
    ? new Date(`${saving.completeOn}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" })
    : null;
  return (
    <div className="space-y-3 rounded-3xl border border-line/60 bg-surface/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">Saving up until</span>
        <Chips
          label="Saving up until"
          small
          value={String(saving.target)}
          onChange={(target) => save.mutate(Number(target) as SavingTarget)}
          options={SAVING_TARGETS.map((t) => ({ value: String(t), label: t === 0 ? "Full season" : `${t} ep.` }))}
        />
      </div>
      <ProgressBar value={saving.out} max={saving.needed} />
      <p className="text-sm text-muted">
        {saving.reached
          ? `Ready to binge: ${saving.out} episodes.`
          : `${saving.out} of ${saving.needed} out${date ? `, the last one on ${date}` : ""}.`}
      </p>
    </div>
  );
}
