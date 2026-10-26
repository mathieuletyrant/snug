import { EPISODE_TITLES, SEASON_PROGRESS, type Me, NEW_FOR_DAYS } from "@snug/shared";
import { LogOut } from "lucide-react";
import { authClient } from "@/api";
import { usePreferences, useUpdatePreferences } from "@/components/preferences";
import { Badge, Button, Card, CardHeader, Chips, SettingRow, Toggle } from "@/components/ui";
import { useT } from "@/i18n";

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
  const t = useT();
  return (
    <Card className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-xl">
          <span className="truncate">{me.name}</span>
          {me.isAdmin && <Badge tone="plain">{t.settings.admin}</Badge>}
        </h2>
        <p className="truncate text-sm text-muted">{me.email}</p>
      </div>
      <Button
        variant="ghost"
        aria-label={t.settings.signOut}
        className="shrink-0 whitespace-nowrap"
        onClick={() => authClient.signOut().then(() => location.assign("/"))}
      >
        <LogOut className="size-4" />
        <span className="hidden sm:inline">{t.settings.signOut}</span>
      </Button>
    </Card>
  );
}

function Display() {
  const preferences = usePreferences();
  const update = useUpdatePreferences();
  const t = useT();
  return (
    <Card>
      <CardHeader title={t.settings.display} />
      <Toggle
        label={t.settings.hideUndated}
        description={t.settings.hideUndatedHelp}
        checked={preferences.hideUndatedUpcoming}
        onChange={(hideUndatedUpcoming) => update.mutate({ hideUndatedUpcoming })}
      />
      <SettingRow
        stacked
        label={t.settings.episodeTitles}
        description={t.settings.episodeTitlesHelp}
      >
        <Chips
          label={t.settings.episodeTitles}
          small
          value={preferences.episodeTitles}
          onChange={(episodeTitles) => update.mutate({ episodeTitles })}
          options={EPISODE_TITLES.map((value) => ({ value, label: t.settings.titleChoices[value] }))}
        />
      </SettingRow>
      <SettingRow
        stacked
        label={t.settings.newFirst}
        description={t.settings.newFirstHelp}
      >
        <Chips
          label={t.settings.newFirst}
          small
          value={String(preferences.newForDays)}
          onChange={(days) => update.mutate({ newForDays: Number(days) as (typeof NEW_FOR_DAYS)[number] })}
          options={NEW_FOR_DAYS.map((count) => ({ value: String(count), label: count === 0 ? t.settings.off : t.settings.days(count) }))}
        />
      </SettingRow>
      <Toggle
        label={t.settings.showRatings}
        description={t.settings.showRatingsHelp}
        checked={preferences.showRatings}
        onChange={(showRatings) => update.mutate({ showRatings })}
      />
      <SettingRow stacked label={t.settings.seasonProgress} description={t.settings.seasonProgressHelp}>
        <Chips
          label={t.settings.seasonProgress}
          small
          value={preferences.seasonProgress}
          onChange={(seasonProgress) => update.mutate({ seasonProgress })}
          options={SEASON_PROGRESS.map((value) => ({ value, label: t.settings.seasonProgressChoices[value] }))}
        />
      </SettingRow>
    </Card>
  );
}

/** Which events are sent; where they go (Web Push, …) is set in Integrations. */
function Notifications() {
  const t = useT();
  const preferences = usePreferences();
  const update = useUpdatePreferences();

  return (
    <Card>
      <CardHeader title={t.settings.notifications} />
      <Toggle
        label={t.settings.newEpisodes}
        description={t.settings.newEpisodesHelp}
        checked={preferences.notifyNewEpisodes}
        onChange={(notifyNewEpisodes) => update.mutate({ notifyNewEpisodes })}
      />
    </Card>
  );
}
