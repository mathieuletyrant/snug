import { useMutation, useQuery } from "@tanstack/react-query";
import { type EpisodeRef, episodeCode, type PlayOptions } from "@snug/shared";
import { ExternalLink, Play, Tv } from "lucide-react";
import { Dialog } from "radix-ui";
import { useState } from "react";
import { api } from "../api";
import { useToast } from "./toast";
import { cx, Spinner } from "./ui";

/** Whether the Play button shows: the admin set up Jellyfin and this User picked their Jellyfin user. */
export function usePlayback() {
  const { data } = useQuery({ queryKey: ["play"], queryFn: () => api<{ enabled: boolean }>("/play"), staleTime: 60_000 });
  return data?.enabled ?? false;
}

/**
 * ▶︎ for an Episode: a sheet listing the Jellyfin players that accept remote control, plus a link to the
 * Episode in Jellyfin. Players are asked for when the sheet opens: a TV app shows up once it's open.
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
  children?: React.ReactNode;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const path = `/play/${seriesId}/${episode.season}/${episode.number}`;
  const options = useQuery({ queryKey: ["play", path], queryFn: () => api<PlayOptions>(path), enabled: open, staleTime: 0 });
  const play = useMutation({
    mutationFn: (player: { sessionId: string; name: string }) => api(path, { body: { sessionId: player.sessionId } }),
    onSuccess: (_, player) => {
      setOpen(false);
      toast({ message: `Playing ${episodeCode(episode)} on ${player.name}` });
    },
    onError: (e) => toast({ message: e.message }),
  });

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        aria-label={`Play ${episodeCode(episode)}`}
        onClick={(e) => e.stopPropagation()}
        className={className}
      >
        {children ?? <Play className="size-4 fill-current" />}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content className="pb-safe fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-line bg-surface px-5 pt-6 data-[state=open]:animate-sheet-in sm:inset-x-auto sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:w-full sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border sm:pb-5">
          <Dialog.Title className="text-xl">Play {episodeCode(episode)}</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted">On a Jellyfin player that's open now.</Dialog.Description>
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
                {options.data.players.length === 0 && (
                  <p className="rounded-2xl bg-raised/50 px-4 py-3 text-sm text-muted">
                    No player open. Open Jellyfin on your TV, then try again.
                  </p>
                )}
                {options.data.openUrl && (
                  <a
                    href={options.data.openUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={cx("flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-accent hover:bg-raised")}
                  >
                    <ExternalLink className="size-4" /> Open in Jellyfin
                  </a>
                )}
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
