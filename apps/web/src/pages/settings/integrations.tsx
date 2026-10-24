import {
  type Feeds,
  type JellyfinIntegration,
  STATUS_LABELS,
  STATUSES,
  type Status,
  type WatchlistIntegration,
} from "@snug/shared";
import { Clapperboard, Download, Tv } from "lucide-react";
import { useState } from "react";
import { CopyField } from "../../components/copy-field";
import { MultiChips } from "../../components/ui";
import { IntegrationCard, SetupSteps, UI, useIntegration } from "./integration-card";
import { WebhookHistory } from "./webhook-history";

export function IntegrationsSection() {
  return (
    <>
      <p className="text-sm text-muted">Each app gets its own secret URL. Replace it with ↻ if it leaks.</p>
      <Jellyfin />
      <Sonarr />
      <Spotarr />
    </>
  );
}

function Jellyfin() {
  const { data, rotate } = useIntegration<JellyfinIntegration>("/integrations/jellyfin", 15_000);
  const url = data ? location.origin + data.webhookPath : "…";

  return (
    <IntegrationCard icon={Tv} title="Jellyfin" description="Episodes you finish in Jellyfin are marked watched here.">
      <SetupSteps open={data ? data.events.length === 0 : false}>
        <li>
          Install the <UI>Webhook</UI> plugin (Dashboard → Plugins → Catalog) and restart.
        </li>
        <li>
          Plugins → Webhook → <UI>Add Generic Destination</UI>, paste the URL below.
        </li>
        <li>
          Tick <UI>Playback Stop</UI> and <UI>User Data Saved</UI>, select your user, tick <UI>Send All Properties</UI>,
          save.
        </li>
      </SetupSteps>
      <CopyField label="webhook URL" value={url} onRotate={rotate} />
      <WebhookHistory events={data?.events} />
    </IntegrationCard>
  );
}

function Sonarr() {
  const { data, rotate } = useIntegration<Feeds>("/integrations/feeds");
  // What the list sends, written into the URL below; the server's default is the Watchlist.
  const [statuses, setStatuses] = useState<Status[]>(["watchlist"]);
  const query = statuses.length === 1 && statuses[0] === "watchlist" ? "" : `?status=${statuses.join(",")}`;
  const url = data ? location.origin + data.sonarrPath + query : "…";

  return (
    <IntegrationCard icon={Download} title="Sonarr" description="Sonarr downloads the series you pick below.">
      <SetupSteps>
        <li>
          In Sonarr: Settings → Import Lists → + → <UI>Custom Lists</UI>, paste the URL below.
        </li>
        <li>Pick a quality profile and root folder, save.</li>
      </SetupSteps>
      <p className="mb-2 text-sm font-semibold">Series to send</p>
      <MultiChips
        label="Series to send to Sonarr"
        small
        value={statuses}
        onChange={setStatuses}
        options={STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
        className="-mx-1 mb-2 px-1"
      />
      <p className="mb-4 text-xs text-muted">Changed your pick? Paste the new URL in Sonarr.</p>
      <CopyField label="Sonarr list URL" value={url} onRotate={rotate} />
    </IntegrationCard>
  );
}

function Spotarr() {
  const { data, rotate } = useIntegration<WatchlistIntegration>("/integrations/watchlist");
  const url = data ? location.origin + data.addPath : "…";

  return (
    <IntegrationCard icon={Clapperboard} title="Spotarr" description="TV shows sent from Spotarr land on your Watchlist.">
      <SetupSteps>
        <li>
          In Spotarr: Settings → Connections → <UI>Snug</UI>, paste the URL below, save.
        </li>
        <li>
          Add a rule with the action <UI>Add to Snug's Watchlist</UI>, or use the button on a TV show.
        </li>
      </SetupSteps>
      <CopyField label="Spotarr URL" value={url} onRotate={rotate} />
    </IntegrationCard>
  );
}
