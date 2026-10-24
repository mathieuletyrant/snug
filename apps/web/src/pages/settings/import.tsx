import { useMutation } from "@tanstack/react-query";
import type { ImportResult } from "@snug/shared";
import { Upload } from "lucide-react";
import { api, queryClient } from "../../api";
import { ImportProgressBar, useImportProgress } from "../../components/import-progress";
import { Card, CardHeader, cx, ErrorText } from "../../components/ui";

/** Reads a CSV or a JSON export and sends it to the server as such. */
async function upload(file: File) {
  const text = await file.text();
  if (/\.csv$/i.test(file.name) || file.type === "text/csv") {
    return api<ImportResult>("/import", { text, contentType: "text/csv" });
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error("This file is neither CSV nor JSON");
  }
  return api<ImportResult>("/import", { body });
}

export function ImportSection() {
  const progress = useImportProgress();
  const run = useMutation({ mutationFn: upload, onSuccess: () => queryClient.invalidateQueries() });
  const busy = run.isPending || !!progress?.running;

  return (
    <Card>
      <CardHeader title="Import">
        Load series and history from a <b className="text-text">CSV</b> (one row per episode) or a JSON export.
        Nothing is erased.{" "}
        <a href="/snug-import-template.csv" download className="font-semibold text-accent underline">
          Download the CSV template
        </a>
      </CardHeader>
      <p className="mb-4 rounded-2xl bg-raised/50 px-4 py-3 text-xs text-muted">
        <code className="mb-1 block font-mono break-all text-text">title,tmdb_id,season,episode,watched_at,status</code>
        <span>
          Only <b>title</b> or <b>tmdb_id</b> is required. No season/episode: just adds the series.
        </span>
      </p>
      {run.data && (
        <div className="mb-3 space-y-1 text-sm">
          <p className="text-sage">
            Imported {run.data.series} series and {run.data.watches} watches.
          </p>
          {run.data.unresolved.length > 0 && (
            <p className="text-rose">Not found on TMDB: {run.data.unresolved.join(", ")}. Add their tmdb_id and retry.</p>
          )}
        </div>
      )}
      {progress && progress.total > 0 && (
        <div className="mb-4">
          <ImportProgressBar progress={progress} />
        </div>
      )}
      <label className={cx("inline-flex cursor-pointer", busy && "pointer-events-none opacity-60")}>
        <input
          type="file"
          accept=".csv,text/csv,.json,application/json"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) run.mutate(file);
            e.target.value = "";
          }}
        />
        <span className="inline-flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-ink">
          <Upload className="size-4" /> {run.isPending ? "Importing…" : progress?.running ? "Fetching details…" : "Choose file"}
        </span>
      </label>
      <div className="mt-3">
        <ErrorText error={run.error} />
      </div>
    </Card>
  );
}
