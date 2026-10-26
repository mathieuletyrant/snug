import { EPISODE_TITLES, NEW_FOR_DAYS, SEASON_PROGRESS } from "@snug/shared";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { authClient } from "@/api";
import { usePreferences, useUpdatePreferences } from "@/components/preferences";
import { Choice, ListGroup, Toggle } from "@/components/ui";
import { useT } from "@/i18n";

/** The User's preferences, grouped by where they show; the account lives in the nav. */
export function PreferencesSection() {
  const preferences = usePreferences();
  const update = useUpdatePreferences();
  const t = useT();

  return (
    <>
      <ListGroup title={t.settings.groups.home}>
        <Row>
          <Toggle
            label={t.settings.hideUndated}
            description={t.settings.hideUndatedHelp}
            checked={preferences.hideUndatedUpcoming}
            onChange={(hideUndatedUpcoming) => update.mutate({ hideUndatedUpcoming })}
          />
        </Row>
        <Row>
          <Choice
            label={t.settings.newFirst}
            description={t.settings.newFirstHelp}
            value={String(preferences.newForDays)}
            onChange={(days) => update.mutate({ newForDays: Number(days) as (typeof NEW_FOR_DAYS)[number] })}
            options={NEW_FOR_DAYS.map((count) => ({ value: String(count), label: count === 0 ? t.settings.off : t.settings.days(count) }))}
          />
        </Row>
        <Row>
          <Toggle
            label={t.settings.showPick}
            description={t.settings.showPickHelp}
            checked={preferences.showPick}
            onChange={(showPick) => update.mutate({ showPick })}
          />
        </Row>
      </ListGroup>
      <ListGroup title={t.settings.groups.seriesPage}>
        <Row>
          <Choice
            label={t.settings.seasonProgress}
            description={t.settings.seasonProgressHelp}
            value={preferences.seasonProgress}
            onChange={(seasonProgress) => update.mutate({ seasonProgress })}
            options={SEASON_PROGRESS.map((value) => ({ value, label: t.settings.seasonProgressChoices[value] }))}
          />
        </Row>
        <Row>
          <Toggle
            label={t.settings.showRatings}
            description={t.settings.showRatingsHelp}
            checked={preferences.showRatings}
            onChange={(showRatings) => update.mutate({ showRatings })}
          />
        </Row>
      </ListGroup>
      <ListGroup title={t.settings.groups.spoilers}>
        <Row>
          <Choice
            label={t.settings.episodeTitles}
            description={t.settings.episodeTitlesHelp}
            value={preferences.episodeTitles}
            onChange={(episodeTitles) => update.mutate({ episodeTitles })}
            options={EPISODE_TITLES.map((value) => ({ value, label: t.settings.titleChoices[value] }))}
          />
        </Row>
      </ListGroup>
      {/* Which events are sent; where they go (Web Push, …) is set in Integrations. */}
      <ListGroup title={t.settings.groups.notifications}>
        <Row>
          <Toggle
            label={t.settings.newEpisodes}
            description={t.settings.newEpisodesHelp}
            checked={preferences.notifyNewEpisodes}
            onChange={(notifyNewEpisodes) => update.mutate({ notifyNewEpisodes })}
          />
        </Row>
      </ListGroup>
      {/* On a phone the nav's avatar is a tab, not a menu: signing out is here instead. */}
      <div className="md:hidden">
        <ListGroup>
          <li>
            <button
              onClick={() => authClient.signOut().then(() => location.assign("/"))}
              className="flex w-full items-center justify-center gap-2 px-4 py-3 font-bold text-rose transition hover:bg-rose/10"
            >
              <LogOut className="size-4" /> {t.settings.signOut}
            </button>
          </li>
        </ListGroup>
      </div>
    </>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <li className="px-4 py-1">{children}</li>;
}
