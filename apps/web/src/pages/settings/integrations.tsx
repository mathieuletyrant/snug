import {
  type Feeds,
  type JellyfinIntegration,
  MCP_FEATURES,
  type McpIntegration,
  STATUSES,
  type Status,
  type WatchlistIntegration,
} from "@snug/shared";
import {
  ArrowLeft,
  Bot,
  CalendarDays,
  ChevronRight,
  Clapperboard,
  Download,
  type LucideIcon,
  Smartphone,
  Tv,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { useSearchParams } from "wouter";
import { api } from "@/api";
import { CopyField } from "@/components/copy-field";
import { usePush } from "@/components/push";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, cx, ListGroup, MultiChips, Toggle } from "@/components/ui";
import { useT } from "@/i18n";
import { ago } from "@/lib/format";
import { SetupSteps, steps, useIntegration } from "./integration-card";
import { WebhookHistory } from "./webhook-history";

type AppId = "jellyfin" | "sonarr" | "spotarr" | "push" | "calendar" | "mcp";

interface App {
  id: AppId;
  group: "media" | "arr" | "notifications" | "other";
  icon: LucideIcon;
  /** What its row opens. */
  Content: () => ReactNode;
}

/** What a row can tell at a glance: Jellyfin's last call, push on this device. */
interface ConnectionState {
  label: string;
  on: boolean;
}

/** Every integration, in the list's order. */
const APPS: App[] = [
  { id: "jellyfin", group: "media", icon: Tv, Content: Jellyfin },
  { id: "sonarr", group: "arr", icon: Download, Content: Sonarr },
  { id: "spotarr", group: "arr", icon: Clapperboard, Content: Spotarr },
  { id: "push", group: "notifications", icon: Smartphone, Content: WebPush },
  { id: "calendar", group: "other", icon: CalendarDays, Content: Calendar },
  { id: "mcp", group: "other", icon: Bot, Content: Assistant },
];

const GROUPS = [...new Set(APPS.map((app) => app.group))];

/** The list of integrations, or the one chosen by `?app=` so a link (or Back) lands on it. */
export function IntegrationsSection() {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const app = APPS.find((candidate) => candidate.id === params.get("app"));
  const status = useStatus();

  if (app) {
    const text = t.integrations[app.id];
    return (
      <>
        <button onClick={() => history.back()} className="flex items-center gap-1.5 text-sm font-bold text-accent">
          <ArrowLeft className="size-4" /> {t.settings.sections.integrations}
        </button>
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <AppIcon icon={app.icon} />
            <h2 className="text-xl leading-tight">{text.title}</h2>
            <Badge tone="plain">{text.term}</Badge>
          </div>
          <app.Content />
        </Card>
      </>
    );
  }

  const open = (id: AppId) => {
    const next = new URLSearchParams(params);
    next.set("app", id);
    setParams(next);
  };

  return GROUPS.map((group) => (
    <ListGroup key={group} title={t.integrations.groups[group]}>
      {APPS.filter((candidate) => candidate.group === group).map((app) => (
        <Row key={app.id} app={app} status={status[app.id]} onOpen={() => open(app.id)} />
      ))}
    </ListGroup>
  ));
}

/** An integration in the list: what it is, the word the other app uses for it, what it does, and its status. */
function Row({ app, status, onOpen }: { app: App; status: ConnectionState | undefined; onOpen: () => void }) {
  const t = useT();
  const text = t.integrations[app.id];
  return (
    <li>
      <button onClick={onOpen} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-raised">
        <AppIcon icon={app.icon} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 font-bold">
            {text.title}
            <Badge tone="plain">{text.term}</Badge>
          </span>
          <span className="block text-sm text-muted">{text.description}</span>
        </span>
        {status && (
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
            <span className={cx("size-2 rounded-full", status.on ? "bg-sage" : "bg-muted/40")} />
            {status.label}
          </span>
        )}
        <ChevronRight className="size-4 shrink-0 text-muted" />
      </button>
    </li>
  );
}

function AppIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
      <Icon className="size-5" />
    </span>
  );
}

function useStatus(): Partial<Record<AppId, ConnectionState>> {
  const t = useT();
  const { data } = useIntegration<JellyfinIntegration>("/integrations/jellyfin", 15_000);
  const push = usePush();
  const last = data?.events[0];
  return {
    jellyfin: data && (last ? { label: ago(t, last.receivedAt), on: true } : { label: t.integrations.jellyfin.neverCalled, on: false }),
    push:
      push.state === "loading"
        ? undefined
        : push.state === "on"
          ? { label: t.integrations.push.on(push.devices), on: true }
          : { label: t.settings.off, on: false },
  };
}

function Jellyfin() {
  const t = useT();
  const { data, rotate } = useIntegration<JellyfinIntegration>("/integrations/jellyfin", 15_000);
  const url = data ? location.origin + data.webhookPath : "…";

  return (
    <>
      <SetupSteps open={data ? data.events.length === 0 : false}>{steps(t.integrations.jellyfin.steps)}</SetupSteps>
      <CopyField label={t.integrations.jellyfin.url} value={url} onRotate={rotate} />
      <WebhookHistory events={data?.events} />
    </>
  );
}

function Sonarr() {
  const t = useT();
  const { data, rotate } = useIntegration<Feeds>("/integrations/feeds");
  // What the list sends, written into the URL below; the server's default is the Watchlist.
  const [statuses, setStatuses] = useState<Status[]>(["watchlist"]);
  const query = statuses.length === 1 && statuses[0] === "watchlist" ? "" : `?status=${statuses.join(",")}`;
  const url = data ? location.origin + data.sonarrPath + query : "…";

  return (
    <>
      <SetupSteps>{steps(t.integrations.sonarr.steps)}</SetupSteps>
      <p className="mb-2 text-sm font-semibold">{t.integrations.sonarr.toSend}</p>
      <MultiChips
        label={t.integrations.sonarr.toSendLabel}
        small
        value={statuses}
        onChange={setStatuses}
        options={STATUSES.map((option) => ({ value: option, label: t.status[option] }))}
        className="-mx-1 mb-2 px-1"
      />
      <p className="mb-4 text-xs text-muted">{t.integrations.sonarr.changed}</p>
      <CopyField label={t.integrations.sonarr.url} value={url} onRotate={rotate} />
    </>
  );
}

function Calendar() {
  const t = useT();
  const { data, rotate } = useIntegration<Feeds>("/integrations/feeds");
  const url = data ? location.origin + data.calendarPath : "…";

  return (
    <>
      <SetupSteps>{steps(t.integrations.calendar.steps)}</SetupSteps>
      <CopyField label={t.integrations.calendar.url} value={url} onRotate={rotate} />
      <p className="mt-2 text-xs text-muted">{t.integrations.calendar.sharedUrl}</p>
    </>
  );
}

function Spotarr() {
  const t = useT();
  const { data, rotate } = useIntegration<WatchlistIntegration>("/integrations/watchlist");
  const url = data ? location.origin + data.addPath : "…";

  return (
    <>
      <SetupSteps>{steps(t.integrations.spotarr.steps)}</SetupSteps>
      <CopyField label={t.integrations.spotarr.url} value={url} onRotate={rotate} />
    </>
  );
}

function Assistant() {
  const t = useT();
  const { data, rotate } = useIntegration<McpIntegration>("/integrations/mcp");
  const url = data ? location.origin + data.mcpPath : "…";

  return (
    <>
      <SetupSteps>{steps(t.integrations.mcp.steps)}</SetupSteps>
      <CopyField label={t.integrations.mcp.url} value={url} onRotate={rotate} />
      <p className="mt-5 mb-2 text-sm font-semibold">{t.integrations.mcp.canDo}</p>
      <ul className="space-y-2.5">
        {MCP_FEATURES.map(([kind, name]) => (
          <li key={name} className="text-sm">
            <div className="flex items-center gap-2">
              <Badge tone={kind === "prompt" ? "accent" : "plain"}>{t.integrations.mcp.kind[kind]}</Badge>
              <code className="text-xs">{name}</code>
            </div>
            <p className="mt-0.5 text-muted">{t.integrations.mcp.features[name]}</p>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Push on this device (Web Push); which events are sent is chosen in Preferences. */
function WebPush() {
  const toast = useToast();
  const t = useT();
  const push = usePush();
  const [busy, setBusy] = useState(false);
  const run = (action: () => Promise<unknown>) => {
    setBusy(true);
    action()
      .catch((e: Error) => toast({ message: e.message }))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <Toggle
        label={t.settings.onThisDevice}
        description={t.settings.onThisDeviceHelp}
        checked={push.state === "on"}
        onChange={(on) => !busy && push.state !== "unsupported" && run(on ? push.enable : push.disable)}
      />
      {push.state === "unsupported" && <p className="mt-2 text-sm text-muted">{t.settings.pushUnsupported}</p>}
      {push.state === "denied" && <p className="mt-2 text-sm text-rose">{t.settings.pushDenied}</p>}
      {push.state === "on" && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-3">
          <p className="text-sm text-muted">{t.settings.devices(push.devices)}</p>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => run(() => api("/push/test", { method: "POST" }).then(() => toast({ message: t.settings.testSent })))}
          >
            {t.settings.sendTest}
          </Button>
        </div>
      )}
    </>
  );
}
