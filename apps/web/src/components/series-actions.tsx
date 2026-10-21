import { useMutation } from "@tanstack/react-query";
import { type Episode, episodeCode, STATUS_LABELS, STATUSES, type Status } from "@snug/shared";
import { EllipsisVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, queryClient } from "../api";
import { useToast } from "./toast";
import { cx } from "./ui";

const refresh = () => queryClient.invalidateQueries();

/** The home screen's one click, with a 5-second undo. */
export function useWatchNext() {
  const toast = useToast();
  return useMutation({
    mutationFn: (seriesId: number) => api<Episode>(`/series/${seriesId}/next`, { method: "POST" }),
    onSuccess: async (ep, seriesId) => {
      await refresh();
      toast({
        message: `${episodeCode(ep)} watched`,
        action: {
          label: "Undo",
          run: () => api(`/series/${seriesId}/episodes/${ep.season}/${ep.number}`, { method: "DELETE" }).then(refresh),
        },
      });
    },
    onError: (e) => toast({ message: e.message }),
  });
}

export function useSetStatus() {
  const toast = useToast();
  return useMutation({
    mutationFn: ({ seriesId, status }: { seriesId: number; status: Status }) =>
      api(`/series/${seriesId}`, { method: "PUT", body: { status } }),
    onSuccess: async (_, { status }) => {
      await refresh();
      toast({ message: `Moved to ${STATUS_LABELS[status]}` });
    },
    onError: (e) => toast({ message: e.message }),
  });
}

/** "⋯" menu to move a Series to another Status. */
export function StatusMenu({ seriesId, status }: { seriesId: number; status: Status }) {
  const [open, setOpen] = useState(false);
  // Opens towards the side with room, so the menu never leaves the screen (e.g. first column of a grid).
  const [alignLeft, setAlignLeft] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const setStatus = useSetStatus();

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        aria-label="Change status"
        className="rounded-full p-2 text-muted transition hover:bg-raised hover:text-text"
        onClick={() => {
          setAlignLeft((ref.current?.getBoundingClientRect().right ?? Infinity) < 200);
          setOpen(!open);
        }}
      >
        <EllipsisVertical className="size-5" />
      </button>
      {open && (
        <div
          className={cx(
            "absolute z-30 mt-1 w-44 overflow-hidden rounded-2xl border border-line bg-raised py-1 shadow-2xl shadow-black/50",
            alignLeft ? "left-0" : "right-0",
          )}
        >
          {STATUSES.map((s) => (
            <button
              key={s}
              disabled={s === status}
              onClick={() => {
                setOpen(false);
                setStatus.mutate({ seriesId, status: s });
              }}
              className={cx(
                "block w-full px-4 py-2.5 text-left text-sm font-semibold transition hover:bg-line",
                s === status ? "text-accent" : "text-text",
              )}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
