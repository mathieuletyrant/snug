import { useQuery } from "@tanstack/react-query";
import type { ImportProgress } from "@snug/shared";
import { useEffect } from "react";
import { api, queryClient } from "../api";
import { ProgressBar } from "./ui";

/** Polls while Series details are being fetched after an Import, refreshing lists as they fill in. */
export function useImportProgress() {
  const { data } = useQuery({
    queryKey: ["import-progress"],
    queryFn: () => api<ImportProgress>("/import/progress"),
    refetchInterval: (q) => (q.state.data?.running ? 1500 : false),
    staleTime: 0,
  });

  const settled = data ? data.done + data.failed : 0;
  useEffect(() => {
    if (settled) {
      queryClient.invalidateQueries({ queryKey: ["home"] });
      queryClient.invalidateQueries({ queryKey: ["library"] });
    }
  }, [settled]);

  return data;
}

export function ImportProgressBar({ progress }: { progress: ImportProgress }) {
  const settled = progress.done + progress.failed;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="font-semibold">
          {progress.running ? "Fetching series details…" : progress.failed ? "Some series details are missing" : "Series details fetched"}
        </span>
        <span className="text-muted tabular-nums">
          {settled}/{progress.total}
        </span>
      </div>
      <ProgressBar value={settled} max={progress.total} />
      {progress.failed > 0 && (
        <p className="text-xs text-rose">
          {progress.failed} series couldn't be fetched; they'll be retried automatically.
        </p>
      )}
    </div>
  );
}

/** Thin banner on every page while an Import is still running. */
export function ImportBanner() {
  const progress = useImportProgress();
  if (!progress?.running) return null;
  return (
    <div className="mb-6 rounded-2xl border border-line/60 bg-surface px-4 py-3">
      <ImportProgressBar progress={progress} />
    </div>
  );
}
