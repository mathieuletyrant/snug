import { EPISODE_TITLES, type EpisodeTitles, type Me, NEW_FOR_DAYS } from "@snug/shared";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { api, authClient } from "../../api";
import { usePreferences, useUpdatePreferences } from "../../components/preferences";
import { usePush } from "../../components/push";
import { useToast } from "../../components/toast";
import { Badge, Button, Card, CardHeader, Chips, SettingRow, Toggle } from "../../components/ui";
import { plural } from "../../lib/format";

export function GeneralSection({ me }: { me: Me }) {
  return (
    <>
      <Account me={me} />
      <Display />
      <Notifications />
    </>
  );
}

function Account({ me }: { me: Me }) {
  return (
    <Card className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-xl">
          <span className="truncate">{me.name}</span>
          {me.isAdmin && <Badge tone="plain">Admin</Badge>}
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

const TITLE_LABELS: Record<EpisodeTitles, string> = {
  show: "Show all",
  hideUnwatched: "Hide unwatched",
  hideAll: "Hide all",
};

function Display() {
  const preferences = usePreferences();
  const update = useUpdatePreferences();
  return (
    <Card>
      <CardHeader title="Display" />
      <Toggle
        label="Hide undated series"
        description="Hide series with no air date yet (TBA) from Upcoming."
        checked={preferences.hideUndatedUpcoming}
        onChange={(hideUndatedUpcoming) => update.mutate({ hideUndatedUpcoming })}
      />
      <SettingRow
        stacked
        label="Episode titles"
        description="Blur titles of episodes you haven't watched, against spoilers. Tap one to show it."
      >
        <Chips
          label="Episode titles"
          small
          value={preferences.episodeTitles}
          onChange={(episodeTitles) => update.mutate({ episodeTitles })}
          options={EPISODE_TITLES.map((value) => ({ value, label: TITLE_LABELS[value] }))}
        />
      </SettingRow>
      <SettingRow
        stacked
        label="New episodes first"
        description="A new episode of a series you were caught up on goes first on Home, with a New badge."
      >
        <Chips
          label="New episodes first"
          small
          value={String(preferences.newForDays)}
          onChange={(days) => update.mutate({ newForDays: Number(days) as (typeof NEW_FOR_DAYS)[number] })}
          options={NEW_FOR_DAYS.map((d) => ({ value: String(d), label: d === 0 ? "Off" : `${d} days` }))}
        />
      </SettingRow>
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
      <CardHeader title="Notifications" />
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
            {push.devices === 1 ? "1 device receives" : `${plural(push.devices, "device")} receive`} notifications.
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
