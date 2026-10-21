import { useMutation } from "@tanstack/react-query";
import { type Episode, episodeCode, STATUS_LABELS, STATUSES, type Status } from "@snug/shared";
import { Check, EllipsisVertical } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { api, queryClient } from "../api";
import { useToast } from "./toast";
import { COLLISION_PADDING, cx, MENU, MENU_ITEM } from "./ui";

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
export function StatusMenu({ seriesId, status, small = false }: { seriesId: number; status: Status; small?: boolean }) {
  const setStatus = useSetStatus();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Change status"
        className={cx(
          "flex items-center justify-center rounded-full text-muted transition hover:bg-raised hover:text-text data-[state=open]:text-text",
          small ? "p-1" : "p-2",
        )}
      >
        <EllipsisVertical className={small ? "size-4" : "size-5"} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} collisionPadding={COLLISION_PADDING} className={MENU}>
          <DropdownMenu.RadioGroup
            value={status}
            onValueChange={(s) => setStatus.mutate({ seriesId, status: s as Status })}
          >
            {STATUSES.map((s) => (
              <DropdownMenu.RadioItem key={s} value={s} className={MENU_ITEM}>
                {STATUS_LABELS[s]}
                <DropdownMenu.ItemIndicator>
                  <Check className="size-4" strokeWidth={3} />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
