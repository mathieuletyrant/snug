import { useMutation, useQuery } from "@tanstack/react-query";
import {
  type Feeds as FeedsUrls,
  type ImportResult,
  type JellyfinEventLog,
  type JellyfinIntegration,
  type JellyfinServer,
  type JellyfinUser,
  type Me,
  STATUS_LABELS,
  STATUSES,
  type Status,
  type WatchlistIntegration,
} from "@snug/shared";
import { ToggleGroup } from "radix-ui";
import { ChevronDown, Clapperboard, Download, LogOut, type LucideIcon, Tv, Upload } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Link, useSearchParams } from "wouter";
import { api, authClient, queryClient } from "../api";
import { CopyField } from "../components/copy-field";
import { usePush } from "../components/push";
import { useFormErrors } from "../components/form";
import { Toggle, usePreferences, useUpdatePreferences } from "../components/preferences";
import { ImportProgressBar, useImportProgress } from "../components/import-progress";
import { useToast } from "../components/toast";
import { Button, Card, Chips, cx, ErrorText, Input, PageTitle, Select, Skeleton } from "../components/ui";
import { LanguageSelect, TmdbKeyForm } from "./setup";

const SECTIONS = [
  { value: "general", label: "General" },
  { value: "integrations", label: "Integrations" },
  { value: "import", label: "Import" },
  { value: "admin", label: "Admin" },
] as const;
type Section = (typeof SECTIONS)[number]["value"];

/** One section at a time, chosen by `?section=` so a link (or Back) lands on the right one. */
export function SettingsPage({ me }: { me: Me }) {
  const [params, setParams] = useSearchParams();
  const sections = SECTIONS.filter((s) => s.value !== "admin" || me.isAdmin);
  const section: Section = sections.find((s) => s.value === params.get("section"))?.value ?? "general";

  return (
    <>
      <PageTitle>Settings</PageTitle>
      <Chips
        label="Settings section"
        value={section}
        onChange={(value) => setParams({ section: value }, { replace: true })}
        options={sections.map((s) => ({ value: s.value, label: s.label }))}
        className="-mx-4 mb-5 gap-2 px-4 pb-1 md:mx-0 md:px-0"
      />
      <div className="space-y-5">
        {section === "general" && (
          <>
            <Account me={me} />
            <Display />
            <Notifications />
          </>
        )}
        {section === "integrations" && (
          <>
            <p className="text-sm text-muted">
              Each app gets its own secret URL. Replace it with ↻ if it leaks.
            </p>
            <Jellyfin />
            <Sonarr />
            <Spotarr />
          </>
        )}
        {section === "import" && <Import />}
        {section === "admin" && (
          <>
            <Users />
            <Card className="space-y-5">
              <div>
                <h2 className="mb-1 text-xl">Series details</h2>
                <p className="text-sm text-muted">From TMDB, for everyone on this Snug.</p>
              </div>
              <LanguageSelect />
              <TmdbKeyForm />
            </Card>
            <JellyfinServerCard />
          </>
        )}
      </div>
    </>
  );
}

/** An app Snug talks to: its icon and name, what it does, then how to connect it. */
function IntegrationCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <div className="mb-4 flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl leading-tight">{title}</h2>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

function Account({ me }: { me: Me }) {
  return (
    <Card className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-xl">
          <span className="truncate">{me.name}</span>
          {me.isAdmin && (
            <span className="shrink-0 rounded-full bg-raised px-2 py-0.5 font-sans text-[11px] font-bold text-muted">Admin</span>
          )}
        </h2>
        <p className="truncate text-sm text-muted">{me.email}</p>
      </div>
      <Button
        variant="ghost"
        aria-label="Sign out"
        className="shrink-0 whitespace-nowrap"
        onClick={() => authClient.signOut().then(() => location.assign("/"))}
      >
        <LogOut className="size-4" />
        <span className="hidden sm:inline">Sign out</span>
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
        label="Hide undated series"
        description="Hide series with no air date yet (TBA) from Upcoming."
        checked={preferences.hideUndatedUpcoming}
        onChange={(hideUndatedUpcoming) => update.mutate({ hideUndatedUpcoming })}
      />
    </Card>
  );
}

function Notifications() {
  const toast = useToast();
  const push = usePush();
  const [busy, setBusy] = useState(false);
  const run = (action: () => Promise<unknown>) => {
    setBusy(true);
    action()
      .catch((e: Error) => toast({ message: e.message }))
      .finally(() => setBusy(false));
  };

  return (
    <Card>
      <h2 className="mb-2 text-xl">Notifications</h2>
      <Toggle
        label="On this device"
        description="When Jellyfin marks an episode watched, with what's next."
        checked={push.state === "on"}
        onChange={(on) => !busy && push.state !== "unsupported" && run(on ? push.enable : push.disable)}
      />
      {push.state === "unsupported" && (
        <p className="mt-2 text-sm text-muted">
          Not available here. On iPhone, add Snug to your Home Screen and open it from there (HTTPS only).
        </p>
      )}
      {push.state === "denied" && (
        <p className="mt-2 text-sm text-rose">Notifications are blocked. Allow them in your browser or phone settings.</p>
      )}
      {push.state === "on" && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-3">
          <p className="text-sm text-muted">
            {push.devices === 1 ? "1 device receives" : `${push.devices} devices receive`} notifications.
          </p>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => run(() => api("/push/test", { method: "POST" }).then(() => toast({ message: "Test sent" })))}
          >
            Send a test
          </Button>
        </div>
      )}
    </Card>
  );
}

function Jellyfin() {
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
    <IntegrationCard
      icon={Tv}
      title="Jellyfin"
      description="Episodes you finish in Jellyfin are marked watched here."
    >
      <SetupSteps open={data ? data.events.length === 0 : false}>
        <li>
          Install the <b className="text-text">Webhook</b> plugin (Dashboard → Plugins → Catalog) and restart.
        </li>
        <li>
          Plugins → Webhook → <b className="text-text">Add Generic Destination</b>, paste the URL below.
        </li>
        <li>
          Tick <b className="text-text">Playback Stop</b> and <b className="text-text">User Data Saved</b>, select your
          user, tick <b className="text-text">Send All Properties</b>, save.
        </li>
      </SetupSteps>
      <CopyField label="webhook URL" value={url} onRotate={() => rotate.mutate()} />
      {data?.playback.server && <JellyfinUserSelect current={data.playback.jellyfinUserId} />}
      <WebhookHistory events={data?.events} />
    </IntegrationCard>
  );
}

/** Numbered instructions, folded once set up so the page stays short on a phone. */
function SetupSteps({ open = false, children }: { open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="group mb-4">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-bold text-accent">
        How to connect
        <ChevronDown className="size-4 transition group-open:rotate-180" />
      </summary>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted">{children}</ol>
    </details>
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
  const [all, setAll] = useState(false);
  const matching = events?.filter((e) => filter === "all" || e.outcome === filter) ?? [];
  const shown = all ? matching : matching.slice(0, 5);

  return (
    <div className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-sans text-sm font-bold text-muted">Webhook history</h3>
        <Chips
          label="Webhook history filter"
          small
          value={filter}
          onChange={(o) => setFilter(o as (typeof OUTCOMES)[number])}
          options={OUTCOMES.map((o) => ({ value: o, label: o === "error" ? "Errors" : o[0]!.toUpperCase() + o.slice(1) }))}
          className="-mx-1 px-1"
        />
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
          {!all && matching.length > shown.length && (
            <li>
              <button onClick={() => setAll(true)} className="w-full rounded-xl py-2 text-sm font-bold text-accent">
                Show {matching.length - shown.length} more
              </button>
            </li>
          )}
        </ul>
      ) : (
        <p className="rounded-xl bg-raised/40 px-4 py-6 text-center text-sm text-muted">
          {events.length
            ? "Nothing matches this filter."
            : "No calls yet. Finish an episode in Jellyfin to see one here."}
        </p>
      )}
    </div>
  );
}

function Sonarr() {
  const { data } = useQuery({ queryKey: ["feeds"], queryFn: () => api<FeedsUrls>("/integrations/feeds") });
  const rotate = useMutation({
    mutationFn: () => api("/integrations/feeds/rotate", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feeds"] }),
  });
  // What the list sends, written into the URL below; the server's default is the Watchlist.
  const [statuses, setStatuses] = useState<Status[]>(["watchlist"]);
  const query = statuses.length === 1 && statuses[0] === "watchlist" ? "" : `?status=${statuses.join(",")}`;
  const url = data ? location.origin + data.sonarrPath + query : "…";

  return (
    <IntegrationCard
      icon={Download}
      title="Sonarr"
      description="Sonarr downloads the series you pick below."
    >
      <SetupSteps>
        <li>
          In Sonarr: Settings → Import Lists → + → <b className="text-text">Custom Lists</b>, paste the URL below.
        </li>
        <li>Pick a quality profile and root folder, save.</li>
      </SetupSteps>
      <p className="mb-2 text-sm font-semibold">Series to send</p>
      <ToggleGroup.Root
        type="multiple"
        aria-label="Series to send to Sonarr"
        value={statuses}
        // At least one: an empty list would send nothing.
        onValueChange={(picked) => picked.length > 0 && setStatuses(STATUSES.filter((s) => picked.includes(s)))}
        className="no-scrollbar -mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1"
      >
        {STATUSES.map((s) => (
          <ToggleGroup.Item
            key={s}
            value={s}
            className="shrink-0 rounded-full bg-raised px-3 py-1.5 text-xs font-bold text-muted transition hover:text-text data-[state=on]:bg-accent data-[state=on]:text-accent-ink"
          >
            {STATUS_LABELS[s]}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
      <p className="mb-4 text-xs text-muted">
        Changed your pick? Paste the new URL in Sonarr.
      </p>
      <CopyField label="Sonarr list URL" value={url} onRotate={() => rotate.mutate()} />
    </IntegrationCard>
  );
}

function Spotarr() {
  const { data } = useQuery({
    queryKey: ["watchlist-integration"],
    queryFn: () => api<WatchlistIntegration>("/integrations/watchlist"),
  });
  const rotate = useMutation({
    mutationFn: () => api("/integrations/watchlist/rotate", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["watchlist-integration"] }),
  });
  const url = data ? location.origin + data.addPath : "…";

  return (
    <IntegrationCard
      icon={Clapperboard}
      title="Spotarr"
      description="TV shows sent from Spotarr land on your Watchlist."
    >
      <SetupSteps>
        <li>
          In Spotarr: Settings → Connections → <b className="text-text">Snug</b>, paste the URL below, save.
        </li>
        <li>
          Add a rule with the action <b className="text-text">Add to Snug's Watchlist</b>, or use the button on a TV
          show.
        </li>
      </SetupSteps>
      <CopyField label="Spotarr URL" value={url} onRotate={() => rotate.mutate()} />
    </IntegrationCard>
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
        Load series and history from a <b className="text-text">CSV</b> (one row per episode) or a JSON export.
        Nothing is erased.{" "}
        <a href="/snug-import-template.csv" download className="font-semibold text-accent underline">
          Download the CSV template
        </a>
      </p>
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
            <p className="text-rose">
              Not found on TMDB: {run.data.unresolved.join(", ")}. Add their tmdb_id and retry.
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
      <p className="mb-4 text-sm text-muted">Sign-up is closed. Create accounts here.</p>
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

/** Play button: which Jellyfin user this person plays as (their players are listed). */
function JellyfinUserSelect({ current }: { current: string | null }) {
  const toast = useToast();
  const users = useQuery({
    queryKey: ["jellyfin-users"],
    queryFn: () => api<JellyfinUser[]>("/integrations/jellyfin/users"),
  });
  const save = useMutation({
    mutationFn: (jellyfinUserId: string | null) =>
      api("/integrations/jellyfin/user", { method: "PUT", body: { jellyfinUserId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["jellyfin"] });
      await queryClient.invalidateQueries({ queryKey: ["play"] });
    },
    onError: (e) => toast({ message: e.message }),
  });
  return (
    <div className="mt-5">
      <Select
        label="Your Jellyfin user"
        hint="For the ▶︎ button: your Jellyfin players show up there."
        value={current ?? ""}
        disabled={!users.data || save.isPending}
        onChange={(e) => save.mutate(e.target.value || null)}
      >
        <option value="">None (no ▶︎ button)</option>
        {users.data?.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </Select>
      <ErrorText error={users.error} />
    </div>
  );
}

/** Admin: the Jellyfin server behind the ▶︎ button. */
function JellyfinServerCard() {
  const toast = useToast();
  const { data } = useQuery({
    queryKey: ["jellyfin-server"],
    queryFn: () => api<JellyfinServer>("/integrations/jellyfin/server"),
  });
  const [form, setForm] = useState<{ url: string; apiKey: string; publicUrl: string } | null>(null);
  const values = form ?? { url: data?.url ?? "", apiKey: "", publicUrl: data?.publicUrl ?? "" };
  const { errors, formError, onSubmit, fromError, clear, formProps } = useFormErrors();
  const save = useMutation({
    mutationFn: () =>
      api("/integrations/jellyfin/server", { method: "PUT", body: { ...values, apiKey: values.apiKey || undefined } }),
    onSuccess: async () => {
      setForm(null);
      await queryClient.invalidateQueries();
      toast({ message: values.url ? "Jellyfin connected" : "Play button turned off" });
    },
    onError: fromError,
  });
  const set = (field: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...values, [field]: e.target.value });
    clear(field);
  };

  return (
    <Card>
      <h2 className="mb-1 text-xl">Jellyfin server</h2>
      <p className="mb-4 text-sm text-muted">
        For the ▶︎ button, which starts an episode on a Jellyfin player. Leave the URL empty to turn it off.
      </p>
      <form {...formProps} onSubmit={onSubmit(() => save.mutate())} className="space-y-4">
        <Input
          label="URL"
          name="url"
          value={values.url}
          onChange={set("url")}
          error={errors.url}
          placeholder="http://jellyfin_server_1:8096"
        />
        <Input
          label="API key"
          name="apiKey"
          type="password"
          autoComplete="off"
          value={values.apiKey}
          onChange={set("apiKey")}
          error={errors.apiKey}
          placeholder={data?.hasApiKey ? "Saved (paste a new one to replace it)" : "Dashboard → API Keys → +"}
        />
        <Input
          label="Public URL"
          name="publicUrl"
          value={values.publicUrl}
          onChange={set("publicUrl")}
          error={errors.publicUrl}
          placeholder="https://tv.example.com"
          hint="Where phones open Jellyfin, for the Open in Jellyfin link."
        />
        <ErrorText error={formError} />
        <Button disabled={save.isPending}>{save.isPending ? "Checking…" : "Save"}</Button>
      </form>
    </Card>
  );
}
