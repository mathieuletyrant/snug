import { AlertDialog } from "radix-ui";
import { Button } from "./ui";

/**
 * Asked when an Episode is marked watched while earlier aired ones are not: mark them too, or only this one.
 * Same sheet as Confirm, opened by the page rather than by a trigger. Closing it marks nothing.
 */
export function CatchUp({
  earlier,
  onOnlyThis,
  onAll,
  onClose,
}: {
  /** Earlier aired Episodes not watched; 0 keeps the sheet closed. */
  earlier: number;
  onOnlyThis: () => void;
  onAll: () => void;
  onClose: () => void;
}) {
  const episodes = earlier === 1 ? "episode" : "episodes";
  return (
    <AlertDialog.Root open={earlier > 0} onOpenChange={(open) => !open && onClose()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <AlertDialog.Content className="pb-safe fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-line bg-surface px-5 pt-6 data-[state=open]:animate-sheet-in sm:inset-x-auto sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:w-full sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border sm:pb-5">
          <AlertDialog.Title className="text-xl">
            {earlier} earlier {episodes} not watched
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-muted">Mark them watched too?</AlertDialog.Description>
          <div className="mt-6 flex flex-col-reverse gap-2 pb-2 sm:flex-row sm:justify-end sm:pb-0">
            <AlertDialog.Cancel asChild>
              <Button variant="ghost" onClick={onOnlyThis}>
                Only this one
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button onClick={onAll}>
                Mark all {earlier + 1}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
