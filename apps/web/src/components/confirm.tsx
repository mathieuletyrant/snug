import { AlertDialog } from "radix-ui";
import type { ReactNode } from "react";
import { Button } from "./ui";

/**
 * Asks before a destructive action. A sheet from the bottom on phones (under the thumb), a centered
 * dialog on wider screens. `children` is the trigger.
 */
export function Confirm({
  title,
  description,
  confirm,
  onConfirm,
  children,
}: {
  title: string;
  description: ReactNode;
  confirm: string;
  onConfirm: () => void;
  children: ReactNode;
}) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>{children}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <AlertDialog.Content className="pb-safe fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-line bg-surface px-5 pt-6 data-[state=open]:animate-sheet-in sm:inset-x-auto sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:w-full sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border sm:pb-5">
          <AlertDialog.Title className="text-xl">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-muted">{description}</AlertDialog.Description>
          <div className="mt-6 flex flex-col-reverse gap-2 pb-2 sm:flex-row sm:justify-end sm:pb-0">
            <AlertDialog.Cancel asChild>
              <Button variant="ghost">Cancel</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant="danger" onClick={onConfirm}>
                {confirm}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
