import { useMutation, useQuery } from "@tanstack/react-query";
import type { ImportResult, JellyfinEventLog, JellyfinIntegration, Me } from "@snug/shared";
import { ChevronDown, Copy, LogOut, RefreshCw, Upload } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { api, authClient, queryClient } from "../api";
import { useFormErrors } from "../components/form";
import { Toggle, usePreferences, useUpdatePreferences } from "../components/preferences";
import { ImportProgressBar, useImportProgress } from "../components/import-progress";
import { useToast } from "../components/toast";
import { Button, Card, cx, ErrorText, Input, PageTitle, Skeleton } from "../components/ui";
import { LanguageSelect, TmdbKeyForm } from "./setup";

export function SettingsPage({ me }: { me: Me }) {
  return (
    <>
      <PageTitle>Settings</PageTitle>
      <div className="space-y-5">
        <Account me={me} />
        <Display />
        <Jellyfin />
        <Import />
        {me.isAdmin && <Users />}
        {me.isAdmin && (
          <Card className="space-y-5">
            <div>
              <h2 className="mb-1 text-xl">Series details</h2>
              <p className="text-sm text-muted">From TMDB, for everyone on this Snug.</p>
            </div>
            <LanguageSelect />
            <TmdbKeyForm />
          </Card>
        )}
      </div>
    </>
  );
}

function Account({ me }: { me: Me }) {
  return (
    <Card className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h2 className="truncate text-xl">{me.name}</h2>
        <p className="truncate text-sm text-muted">
          {me.email}
          {me.isAdmin && " · admin"}
        </p>
      </div>
      <Button variant="ghost" onClick={() => authClient.signOut().then(() => location.assign("/"))}>
        <LogOut className="size-4" /> Sign out
      </Button>
    </Card>
  );
}

function Display() {
  const preferences = usePreferences();
  const update = useUpdatePreferences();
  return (
    <Card>
      <h2 className="mb-2 text-xl">Display</h2>
      <Toggle
        label="Hide undated upcoming series"
        description="Leave series whose next episode has no air date yet (TBA) out of Upcoming."
        checked={preferences.hideUndatedUpcoming}
        onChange={(hideUndatedUpcoming) => update.mutate({ hideUndatedUpcoming })}
      />
    </Card>
  );
}

function Jellyfin() {
  const toast = useToast();
  const { data } = useQuery({
    queryKey: ["jellyfin"],
    queryFn: () => api<JellyfinIntegration>("/integrations/jellyfin"),
    refetchInterval: 15_000,
  });
  const rotate = useMutation({
    mutationFn: () => api("/integrations/jellyfin/rotate", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jellyfin"] }),
  });
  const url = data ? location.origin + data.webhookPath : "…";

  return (
    <Card>
      <h2 className="mb-1 text-xl">Jellyfin</h2>
      <p className="mb-4 text-sm text-muted">Episodes you finish, or mark as played, in Jellyfin are marked watched here.</p>
      <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-muted">
        <li>
          Install the <b className="text-text">Webhook</b> plugin (Dashboard → Plugins → Catalog), restart Jellyfin.
        </li>
        <li>
          Dashboard → Plugins → Webhook → <b className="text-text">Add Generic Destination</b>, paste the URL below.
        </li>
        <li>
          Tick <b className="text-text">Playback Stop</b> and <b className="text-text">User Data Saved</b>, select your
          user, tick <b className="text-text">Send All Properties</b>, save.
        </li>
      </ol>
      <div className="flex gap-2">
        <code className="min-w-0 flex-1 truncate rounded-2xl bg-raised px-4 py-3 text-xs">{url}</code>
        <Button
          variant="ghost"
          aria-label="Copy webhook URL"
          onClick={() => navigator.clipboard.writeText(url).then(() => toast({ message: "Copied" }))}
        >
          <Copy className="size-4" />
        </Button>
        <Button variant="ghost" aria-label="New webhook URL" title="New URL (the old one stops working)" onClick={() => rotate.mutate()}>
          <RefreshCw className="size-4" />
        </Button>
      </div>
      <WebhookHistory events={data?.events} />
    </Card>
  );
}

const OUTCOMES = ["all", "watched", "ignored", "error"] as const;
const DOT = { watched: "bg-sage", ignored: "bg-muted/50", error: "bg-rose" };

const ago = (iso: string) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)} h ago`;
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

/** Every call Jellyfin made to the webhook, newest first, with what Snug did and the raw payload. */
function WebhookHistory({ events }: { events: JellyfinEventLog[] | undefined }) {
  const [filter, setFilter] = useState<(typeof OUTCOMES)[number]>("all");
  const shown = events?.filter((e) => filter === "all" || e.outcome === filter) ?? [];

  return (
    <div className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-sans text-sm font-bold text-muted">Webhook history</h3>
        <div className="flex gap-1">
          {OUTCOMES.map((o) => (
            <button
              key={o}
              onClick={() => setFilter(o)}
              className={cx(
                "rounded-full px-3 py-1 text-xs font-bold capitalize transition",
                o === filter ? "bg-accent text-accent-ink" : "bg-raised text-muted hover:text-text",
              )}
            >
              {o === "error" ? "errors" : o}
            </button>
          ))}
        </div>
      </div>
      {!events ? (
        <Skeleton className="h-24 w-full" />
      ) : shown.length ? (
        <ul className="max-h-96 space-y-1 overflow-y-auto text-sm">
          {shown.map((e, i) => (
            <li key={`${e.receivedAt}-${i}`} className="rounded-xl px-3 py-2 odd:bg-raised/40">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-start gap-3">
                  <span className={cx("mt-1.5 size-2 shrink-0 rounded-full", DOT[e.outcome])} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {e.seriesId ? (
                        <Link href={`/series/${e.seriesId}`} className="hover:text-accent">
                          {e.summary}
                        </Link>
                      ) : (
                        e.summary
                      )}
                    </p>
                    <p className="text-xs text-muted">
                      {ago(e.receivedAt)} · {e.message}
                    </p>
                  </div>
                  {e.payload && <ChevronDown className="mt-1 size-4 shrink-0 text-muted transition group-open:rotate-180" />}
                </summary>
                {e.payload && (
                  <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-bg p-3 text-[11px] leading-relaxed text-muted">
                    {e.payload}
                  </pre>
                )}
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl bg-raised/40 px-4 py-6 text-center text-sm text-muted">
          {events.length
            ? "Nothing matches this filter."
            : "No calls yet. Finish an episode in Jellyfin, or mark one as played, and it shows up here."}
        </p>
      )}
    </div>
  );
}

function Import() {
  const progress = useImportProgress();
  const run = useMutation({
    mutationFn: async (file: File) => {
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
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });
  const busy = run.isPending || !!progress?.running;

  return (
    <Card>
      <h2 className="mb-1 text-xl">Import</h2>
      <p className="mb-4 text-sm text-muted">
        Load series and watch history from a <b className="text-text">CSV</b> (one row per watched episode) or a JSON
        export. Existing data is kept.{" "}
        <a href="/snug-import-template.csv" download className="font-semibold text-accent underline">
          Download the CSV template
        </a>
      </p>
      <p className="mb-4 rounded-2xl bg-raised/50 px-4 py-3 font-mono text-xs text-muted">
        title,tmdb_id,season,episode,watched_at,status
        <br />
        <span className="font-sans">
          Only <b>title</b> or <b>tmdb_id</b> is required. Leave season/episode empty to just add a series.
        </span>
      </p>
      {run.data && (
        <div className="mb-3 space-y-1 text-sm">
          <p className="text-sage">
            Imported {run.data.series} series and {run.data.watches} watches.
          </p>
          {run.data.unresolved.length > 0 && (
            <p className="text-rose">
              Not found on TMDB, skipped: {run.data.unresolved.join(", ")}. Add their tmdb_id and import again.
            </p>
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

function Users() {
  const toast = useToast();
  const { data } = useQuery({ queryKey: ["users"], queryFn: () => api<Omit<Me, "isAdmin">[]>("/users") });
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const { errors, formError, onSubmit, fromError, clear, formProps } = useFormErrors();
  const invite = useMutation({
    mutationFn: () => api("/users", { body: form }),
    onSuccess: async () => {
      setForm({ name: "", email: "", password: "" });
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ message: "Account created" });
    },
    onError: fromError,
  });
  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [field]: e.target.value });
    clear(field);
  };

  return (
    <Card>
      <h2 className="mb-1 text-xl">People</h2>
      <p className="mb-4 text-sm text-muted">Sign-up is closed. Create accounts for people sharing this Snug.</p>
      <ul className="mb-5 space-y-1 text-sm">
        {data?.map((u) => (
          <li key={u.id}>
            <b>{u.name}</b> <span className="text-muted">{u.email}</span>
          </li>
        ))}
      </ul>
      <form {...formProps} onSubmit={onSubmit(() => invite.mutate())} className="grid items-start gap-3 sm:grid-cols-3">
        <Input label="Name" name="name" required value={form.name} onChange={set("name")} error={errors.name} />
        <Input label="Email" name="email" type="email" required value={form.email} onChange={set("email")} error={errors.email} />
        <Input
          label="Password"
          name="password"
          type="password"
          minLength={10}
          required
          autoComplete="new-password"
          value={form.password}
          onChange={set("password")}
          error={errors.password}
          hint="At least 10 characters"
        />
        <div className="space-y-3 sm:col-span-3">
          <ErrorText error={formError} />
          <Button disabled={invite.isPending}>Create account</Button>
        </div>
      </form>
    </Card>
  );
}
