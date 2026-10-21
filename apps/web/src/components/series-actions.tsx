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

/** Room the open menu needs below its button, and the phone's bottom tab bar it must not slide under. */
const MENU_HEIGHT = 230;
const TAB_BAR_HEIGHT = 96;

/**
 * "⋯" menu to move a Series to another Status.
 * A card holding it should lift itself while it's open (`has-[[aria-expanded=true]]:z-40`): the blurred
 * button background creates a stacking context, so the menu alone can't rise above the next cards.
 */
export function StatusMenu({ seriesId, status, small = false }: { seriesId: number; status: Status; small?: boolean }) {
  const [open, setOpen] = useState(false);
  // Opens towards the side with room, so the menu never leaves the screen (e.g. first column of a grid).
  const [alignLeft, setAlignLeft] = useState(false);
  // Opens upwards near the bottom, where it would slide under the phone's tab bar.
  const [openUp, setOpenUp] = useState(false);
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
        aria-haspopup="menu"
        aria-expanded={open}
        className={cx("flex items-center justify-center rounded-full text-muted transition hover:bg-raised hover:text-text", small ? "p-1" : "p-2")}
        onClick={() => {
          const rect = ref.current?.getBoundingClientRect();
          setAlignLeft((rect?.right ?? Infinity) < 200);
          setOpenUp(!!rect && rect.bottom + MENU_HEIGHT > window.innerHeight - TAB_BAR_HEIGHT);
          setOpen(!open);
        }}
      >
        <EllipsisVertical className={small ? "size-4" : "size-5"} />
      </button>
      {open && (
        <div
          className={cx(
            "absolute z-30 w-44 overflow-hidden rounded-2xl border border-line bg-raised py-1 shadow-2xl shadow-black/50",
            alignLeft ? "left-0" : "right-0",
            openUp ? "bottom-full mb-1" : "mt-1",
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
