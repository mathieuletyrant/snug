import { useMutation } from "@tanstack/react-query";
import type { ImportResult } from "@snug/shared";
import { ArrowDownToLine, ArrowUpFromLine, Bot, Download, Upload } from "lucide-react";
import { Link } from "wouter";
import { api, queryClient } from "@/api";
import { ImportProgressBar, useImportProgress } from "@/components/import-progress";
import { Card, CardHeader, cx, ErrorText } from "@/components/ui";
import { type Messages, useT } from "@/i18n";
import { Group } from "./group";

/** Reads a CSV or a JSON export and sends it to the server as such. */
async function upload(t: Messages, file: File) {
  const text = await file.text();
  if (/\.csv$/i.test(file.name) || file.type === "text/csv") {
    return api<ImportResult>("/import", { text, contentType: "text/csv" });
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(t.import.notCsvOrJson);
  }
  return api<ImportResult>("/import", { body });
}

export function ImportSection() {
  const t = useT();
  const progress = useImportProgress();
  const run = useMutation({
    mutationFn: (file: File) => upload(t, file),
    onSuccess: () => queryClient.invalidateQueries(),
  });
  const busy = run.isPending || !!progress?.running;

  return (
    <>
      <Group icon={ArrowDownToLine} title={t.import.title} help={t.import.help}>
        <Card>
          <CardHeader title={t.import.fileTitle}>
            {t.import.intro(
              <b className="text-text">CSV</b>,
              <a href="/snug-import-template.csv" download className="font-semibold text-accent underline">
                {t.import.template}
              </a>,
            )}
          </CardHeader>
          <p className="mb-4 rounded-2xl bg-raised/50 px-4 py-3 text-xs text-muted">
            <code className="mb-1 block font-mono break-all text-text">
              title,tmdb_id,season,episode,watched_at,status,rating,season_rating,saving_target,absolute_numbering
            </code>
            <span>{t.import.columnsHelp(<b>title</b>, <b>tmdb_id</b>)}</span>
          </p>
          {run.data && (
            <div className="mb-3 space-y-1 text-sm">
              <p className="text-sage">{t.import.done(run.data.series, run.data.watches)}</p>
              {run.data.unresolved.length > 0 && (
                <p className="text-rose">{t.import.notFound(run.data.unresolved.join(", "))}</p>
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
              <Upload className="size-4" />{" "}
              {run.isPending ? t.import.importing : progress?.running ? t.import.fetchingDetails : t.import.chooseFile}
            </span>
          </label>
          <div className="mt-3">
            <ErrorText error={run.error} />
          </div>
        </Card>
        <Link
          href="/settings?section=integrations"
          className="flex items-center gap-3 rounded-3xl border border-line/60 bg-surface p-5 transition hover:border-accent/60"
        >
          <Bot className="size-5 shrink-0 text-accent" />
          <span className="text-sm">
            <b>{t.import.withAssistant}</b> <span className="text-muted">{t.import.withAssistantHelp}</span>
          </span>
        </Link>
      </Group>
      <Group icon={ArrowUpFromLine} title={t.export.title} help={t.export.help}>
        <Card>
          <CardHeader title={t.export.fileTitle}>{t.export.intro}</CardHeader>
          <a
            href="/api/export"
            download
            className="inline-flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-ink"
          >
            <Download className="size-4" /> {t.export.download}
          </a>
        </Card>
      </Group>
    </>
  );
}
