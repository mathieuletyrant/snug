import {
  type Feeds,
  type JellyfinIntegration,
  type McpIntegration,
  STATUSES,
  type Status,
  type WatchlistIntegration,
} from "@snug/shared";
import { Bot, Clapperboard, Download, Tv } from "lucide-react";
import { useState } from "react";
import { CopyField } from "@/components/copy-field";
import { MultiChips } from "@/components/ui";
import { useT } from "@/i18n";
import { IntegrationCard, SetupSteps, steps, useIntegration } from "./integration-card";
import { WebhookHistory } from "./webhook-history";

export function IntegrationsSection() {
  const t = useT();
  return (
    <>
      <p className="text-sm text-muted">{t.integrations.intro}</p>
      <Jellyfin />
      <Sonarr />
      <Spotarr />
      <Assistant />
    </>
  );
}

function Jellyfin() {
  const t = useT();
  const { data, rotate } = useIntegration<JellyfinIntegration>("/integrations/jellyfin", 15_000);
  const url = data ? location.origin + data.webhookPath : "…";

  return (
    <IntegrationCard icon={Tv} title="Jellyfin" description={t.integrations.jellyfin.description}>
      <SetupSteps open={data ? data.events.length === 0 : false}>{steps(t.integrations.jellyfin.steps)}</SetupSteps>
      <CopyField label={t.integrations.jellyfin.url} value={url} onRotate={rotate} />
      <WebhookHistory events={data?.events} />
    </IntegrationCard>
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
    <IntegrationCard icon={Download} title="Sonarr" description={t.integrations.sonarr.description}>
      <SetupSteps>{steps(t.integrations.sonarr.steps)}</SetupSteps>
      <p className="mb-2 text-sm font-semibold">{t.integrations.sonarr.toSend}</p>
      <MultiChips
        label={t.integrations.sonarr.toSendLabel}
        small
        value={statuses}
        onChange={setStatuses}
        options={STATUSES.map((s) => ({ value: s, label: t.status[s] }))}
        className="-mx-1 mb-2 px-1"
      />
      <p className="mb-4 text-xs text-muted">{t.integrations.sonarr.changed}</p>
      <CopyField label={t.integrations.sonarr.url} value={url} onRotate={rotate} />
    </IntegrationCard>
  );
}

function Spotarr() {
  const t = useT();
  const { data, rotate } = useIntegration<WatchlistIntegration>("/integrations/watchlist");
  const url = data ? location.origin + data.addPath : "…";

  return (
    <IntegrationCard icon={Clapperboard} title="Spotarr" description={t.integrations.spotarr.description}>
      <SetupSteps>{steps(t.integrations.spotarr.steps)}</SetupSteps>
      <CopyField label={t.integrations.spotarr.url} value={url} onRotate={rotate} />
    </IntegrationCard>
  );
}

function Assistant() {
  const t = useT();
  const { data, rotate } = useIntegration<McpIntegration>("/integrations/mcp");
  const url = data ? location.origin + data.mcpPath : "…";

  return (
    <IntegrationCard icon={Bot} title={t.integrations.mcp.title} description={t.integrations.mcp.description}>
      <SetupSteps>{steps(t.integrations.mcp.steps)}</SetupSteps>
      <CopyField label={t.integrations.mcp.url} value={url} onRotate={rotate} />
    </IntegrationCard>
  );
}
