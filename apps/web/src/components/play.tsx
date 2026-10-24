import { useMutation, useQuery } from "@tanstack/react-query";
import { type EpisodeRef, episodeCode, type PlayOptions, watchLink } from "@snug/shared";
import { ExternalLink, Play, Tv } from "lucide-react";
import { Dialog } from "radix-ui";
import { type ReactNode, useState } from "react";
import { api } from "../api";
import { useT } from "../i18n";
import { usePreferences } from "./preferences";
import { SHEET_CONTENT, SHEET_OVERLAY } from "./sheet";
import { useToast } from "./toast";
import { Spinner } from "./ui";

/**
 * Whether the ▶︎ shows: it can list Jellyfin players, or open the chosen app (JellyTV and custom links work
 * without a Jellyfin server; Jellyfin's own page needs its public URL).
 */
export function usePlayback() {
  const { watchApp, watchLink } = usePreferences();
  const { data } = useQuery({
    queryKey: ["play"],
    queryFn: () => api<{ players: boolean; jellyfinWeb: boolean }>("/play"),
    staleTime: 60_000,
  });
  if (!data) return false;
  if (data.players) return true;
  if (watchApp === "jellyfin") return data.jellyfinWeb;
  return watchApp === "jellytv" || !!watchLink;
}

/**
 * ▶︎ for an Episode: a sheet listing the Jellyfin players that accept remote control, plus a link that opens
 * the Episode in the app chosen in Settings. Players are asked for when the sheet opens: a TV app shows up
 * once it's open.
 */
export function PlayButton({
  seriesId,
  episode,
  className,
  children,
}: {
  seriesId: number;
  episode: EpisodeRef;
  className?: string;
  children?: ReactNode;
}) {
  const t = useT();
  const toast = useToast();
  const preferences = usePreferences();
  const [open, setOpen] = useState(false);
  const code = episodeCode(episode);
  const path = `/play/${seriesId}/${episode.season}/${episode.number}`;
  const options = useQuery({ queryKey: ["play", path], queryFn: () => api<PlayOptions>(path), enabled: open, staleTime: 0 });
  const play = useMutation({
    mutationFn: (player: { sessionId: string; name: string }) => api(path, { body: { sessionId: player.sessionId } }),
    onSuccess: (_, player) => {
      setOpen(false);
      toast({ message: t.play.playing(code, player.name) });
    },
    onError: (e) => toast({ message: e.message }),
  });
  const link =
    options.data &&
    watchLink(preferences, {
      tmdbId: seriesId,
      season: episode.season,
      episode: episode.number,
      itemId: options.data.itemId,
      jellyfinUrl: options.data.jellyfinUrl,
    });
  const appName = preferences.watchApp === "custom" ? t.play.myApp : t.play.apps[preferences.watchApp];

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger aria-label={t.play.title(code)} onClick={(e) => e.stopPropagation()} className={className}>
        {children ?? <Play className="size-4 fill-current" />}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={SHEET_OVERLAY} />
        <Dialog.Content className={SHEET_CONTENT}>
          <Dialog.Title className="text-xl">{t.play.title(code)}</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted">{t.play.subtitle}</Dialog.Description>
          <div className="mt-4 space-y-2 pb-4 sm:pb-0">
            {options.isPending ? (
              <Spinner />
            ) : options.error ? (
              <p className="rounded-2xl bg-raised/50 px-4 py-3 text-sm text-rose">{options.error.message}</p>
            ) : (
              <>
                {options.data.players.map((player) => (
                  <button
                    key={player.sessionId}
                    disabled={play.isPending}
                    onClick={() => play.mutate(player)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-raised px-4 py-3 text-left font-semibold transition hover:bg-line disabled:opacity-60"
                  >
                    <Tv className="size-5 text-accent" /> {player.name}
                  </button>
                ))}
                {options.data.itemId && options.data.players.length === 0 && (
                  <p className="rounded-2xl bg-raised/50 px-4 py-3 text-sm text-muted">{t.play.noTv}</p>
                )}
                {link ? (
                  <a
                    href={link}
                    target={link.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-accent hover:bg-raised"
                  >
                    <ExternalLink className="size-4" /> {t.play.openIn(appName)}
                  </a>
                ) : (
                  options.data.players.length === 0 && <p className="px-1 text-sm text-muted">{t.play.notInJellyfin}</p>
                )}
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
