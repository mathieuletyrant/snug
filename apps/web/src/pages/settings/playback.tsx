import { useMutation, useQuery } from "@tanstack/react-query";
import { type JellyfinServer, type JellyfinUser, WATCH_APPS } from "@snug/shared";
import { useState } from "react";
import { api, queryClient } from "../../api";
import { useForm } from "../../components/form";
import { usePreferences, useUpdatePreferences } from "../../components/preferences";
import { useToast } from "../../components/toast";
import { Button, Card, CardHeader, Chips, ErrorText, Input, Select, SettingRow } from "../../components/ui";
import { useT } from "../../i18n";

/** The app the ▶︎ sheet opens an episode in; any app with links through "Other app". */
export function WatchAppChoice() {
  const t = useT();
  const preferences = usePreferences();
  const update = useUpdatePreferences();
  const [link, setLink] = useState<string | null>(null);
  return (
    <div className="mt-5">
      <SettingRow stacked label={t.play.openEpisodesIn}>
        <Chips
          label={t.play.openEpisodesIn}
          small
          value={preferences.watchApp}
          onChange={(watchApp) => update.mutate({ watchApp })}
          options={WATCH_APPS.map((value) => ({ value, label: t.play.apps[value] }))}
        />
      </SettingRow>
      {preferences.watchApp === "jellyfin" && <p className="text-sm text-muted">{t.play.jellyfinNeedsServer}</p>}
      {preferences.watchApp === "custom" && (
        <div className="mt-2">
          <Input
            label={t.play.appLink}
            name="watchLink"
            value={link ?? preferences.watchLink}
            onChange={(e) => setLink(e.target.value)}
            onBlur={() => link !== null && update.mutate({ watchLink: link.trim() }, { onSuccess: () => setLink(null) })}
            error={update.error?.message}
            placeholder="myapp://show/{tmdbId}/{season}/{episode}"
            hint={t.play.appLinkHint}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      )}
    </div>
  );
}

/** Play button: which Jellyfin user this person plays as (their TVs are listed). */
export function JellyfinUserSelect({ current }: { current: string | null }) {
  const t = useT();
  const toast = useToast();
  const users = useQuery({
    queryKey: ["jellyfin-users"],
    queryFn: () => api<JellyfinUser[]>("/integrations/jellyfin/users"),
  });
  const save = useMutation({
    mutationFn: (jellyfinUserId: string | null) =>
      api("/integrations/jellyfin/user", { method: "PUT", body: { jellyfinUserId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["integration"] });
      await queryClient.invalidateQueries({ queryKey: ["play"] });
    },
    onError: (e) => toast({ message: e.message }),
  });
  return (
    <div className="mt-5 space-y-2">
      <Select
        label={t.play.jellyfinUser}
        hint={t.play.jellyfinUserHint}
        value={current ?? ""}
        disabled={!users.data || save.isPending}
        onChange={(e) => save.mutate(e.target.value || null)}
      >
        <option value="">{t.play.none}</option>
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

/** Admin: the Jellyfin server behind the ▶︎ button. Saved only once Jellyfin answers. */
export function JellyfinServerCard() {
  const t = useT();
  const toast = useToast();
  const { data } = useQuery({
    queryKey: ["jellyfin-server"],
    queryFn: () => api<JellyfinServer>("/integrations/jellyfin/server"),
  });
  // Shown once the saved server is known, so the fields start from it.
  if (!data) return null;
  return <ServerForm saved={data} onSaved={(on) => toast({ message: on ? t.play.connected : t.play.turnedOff })} />;
}

function ServerForm({ saved, onSaved }: { saved: JellyfinServer; onSaved: (on: boolean) => void }) {
  const t = useT();
  const form = useForm({ url: saved.url, apiKey: "", publicUrl: saved.publicUrl });
  const save = useMutation({
    mutationFn: () =>
      api("/integrations/jellyfin/server", {
        method: "PUT",
        body: { ...form.values, apiKey: form.values.apiKey || undefined },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      onSaved(!!form.values.url);
    },
    onError: form.fromError,
  });

  return (
    <Card>
      <CardHeader title={t.play.server}>{t.play.serverHelp}</CardHeader>
      <form {...form.formProps} onSubmit={form.onSubmit(() => save.mutate())} className="space-y-4">
        <Input label={t.play.url} placeholder="http://jellyfin_server_1:8096" {...form.field("url")} />
        <Input
          label={t.play.apiKey}
          type="password"
          autoComplete="off"
          placeholder={saved.hasApiKey ? t.play.apiKeySaved : t.play.apiKeyPlaceholder}
          {...form.field("apiKey")}
        />
        <Input
          label={t.play.publicUrl}
          placeholder="https://tv.example.com"
          hint={t.play.publicUrlHint}
          {...form.field("publicUrl")}
        />
        <ErrorText error={form.formError} />
        <Button disabled={save.isPending}>{save.isPending ? t.play.checking : t.play.save}</Button>
      </form>
    </Card>
  );
}
