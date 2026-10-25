import { useMutation } from "@tanstack/react-query";
import { type SeriesCard, STATUSES, type Status, type WatchedNext } from "@snug/shared";
import { Check, EllipsisVertical } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { api, queryClient } from "@/api";
import { useT } from "@/i18n";
import { episodeLabel } from "@/lib/format";
import { useToast } from "./toast";
import { COLLISION_PADDING, cx, MENU, MENU_ITEM } from "./ui";

const refresh = () => queryClient.invalidateQueries();

/** The home screen's one click, with a 5-second undo. */
export function useWatchNext() {
  const toast = useToast();
  const t = useT();
  return useMutation({
    mutationFn: ({ seriesId }: SeriesCard) => api<WatchedNext>(`/series/${seriesId}/next`, { method: "POST" }),
    onSuccess: async (ep, { seriesId, absoluteNumbering }) => {
      await refresh();
      toast({
        message: t.home.watched(episodeLabel(t, ep, absoluteNumbering)),
        action: {
          label: t.common.undo,
          run: () =>
            api(`/series/${seriesId}/episodes/${ep.season}/${ep.number}?status=${ep.previousStatus}`, {
              method: "DELETE",
            }).then(refresh),
        },
      });
    },
    onError: (e) => toast({ message: e.message }),
  });
}

export function useSetStatus() {
  const toast = useToast();
  const t = useT();
  return useMutation({
    mutationFn: ({ seriesId, status }: { seriesId: number; status: Status }) =>
      api(`/series/${seriesId}`, { method: "PUT", body: { status } }),
    onSuccess: async (_, { status }) => {
      await refresh();
      toast({ message: t.library.movedTo(t.status[status]) });
    },
    onError: (e) => toast({ message: e.message }),
  });
}

/** "⋯" menu to move a Series to another Status. */
export function StatusMenu({
  seriesId,
  status,
  choosable,
  small = false,
}: Pick<SeriesCard, "seriesId" | "status" | "choosable"> & { small?: boolean }) {
  const setStatus = useSetStatus();
  const t = useT();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={t.library.changeStatus}
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
            {STATUSES.map((option) => (
              <DropdownMenu.RadioItem key={option} value={option} disabled={!choosable.includes(option)} className={MENU_ITEM}>
                {t.status[option]}
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
