import { useMutation, useQuery } from "@tanstack/react-query";
import { type EpisodeRef, episodeCode, type Player, type PlayOptions, watchLink } from "@snug/shared";
import { ExternalLink, Loader, Play, Tv } from "lucide-react";
import { Dialog } from "radix-ui";
import { type ReactNode, useState } from "react";
import { api } from "@/api";
import { usePreferences } from "@/components/preferences";
import { SHEET_CONTENT, SHEET_OVERLAY } from "@/components/sheet";
import { useToast } from "@/components/toast";
import { Spinner } from "@/components/ui";
import { useT } from "@/i18n";

/**
 * Whether the ▶︎ shows: it can list Jellyfin players, or open the chosen app (JellyTV and custom links work
 * without a Jellyfin server; Jellyfin's own page needs its public URL).
 */
export function usePlayback() {
  const { watchApp, watchLink } = usePreferences();
  const { data } = usePlaySetup();
  if (!data) return false;
  if (data.players) return true;
  if (watchApp === "jellyfin") return data.jellyfinWeb;
  return watchApp === "jellytv" || !!watchLink;
}

function usePlaySetup() {
  return useQuery({
    queryKey: ["play"],
    queryFn: () => api<{ players: boolean; jellyfinWeb: boolean }>("/play"),
    staleTime: 60_000,
  });
}

/**
 * The User's Jellyfin players open now (JellyTV on the TV…), asked every 30 seconds while the page is in front.
 * Empty when the User has no Jellyfin user: Home's ▶︎ only shows while a TV is on.
 */
export function useOpenPlayers(): Player[] {
  const setup = usePlaySetup();
  const { data } = useQuery({
    queryKey: ["play", "players"],
    queryFn: () => api<Player[]>("/play/players"),
    enabled: !!setup.data?.players,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
  return data ?? [];
}

/**
 * ▶︎ for an Episode: a sheet listing the Jellyfin players that accept remote control, plus a link that opens
 * the Episode in the app chosen in Settings. Players are asked for when the sheet opens: a TV app shows up
 * once it's open.
 */
export function PlayButton({
  seriesId,
  episode,
  label,
  player,
  className,
  children,
}: {
  seriesId: number;
  episode: EpisodeRef;
  /** How the Episode is named, e.g. with absolute numbering; S03E07 by default. */
  label?: string;
  /** The only TV open: a tap starts the Episode there, without the sheet. */
  player?: Player;
  className?: string;
  children?: ReactNode;
}) {
  const t = useT();
  const toast = useToast();
  const preferences = usePreferences();
  const [open, setOpen] = useState(false);
  const code = label ?? episodeCode(episode);
  const path = `/play/${seriesId}/${episode.season}/${episode.number}`;
  const options = useQuery({ queryKey: ["play", path], queryFn: () => api<PlayOptions>(path), enabled: open, staleTime: 0 });
  const play = useMutation({
    mutationFn: (player: { sessionId: string; name: string }) => api(path, { body: { sessionId: player.sessionId } }),
    onSuccess: (_, player) => {
      setOpen(false);
      toast({ message: t.play.playing(code, player.name) });
    },
    onError: (error) => toast({ message: error.message }),
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

  if (player) {
    return (
      <button
        aria-label={t.play.playOn(code, player.name)}
        disabled={play.isPending}
        onClick={(event) => {
          event.stopPropagation();
          play.mutate(player);
        }}
        className={className}
      >
        {play.isPending ? <Loader className="size-4 animate-spin" /> : (children ?? <Play className="size-4 fill-current" />)}
      </button>
    );
  }

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
