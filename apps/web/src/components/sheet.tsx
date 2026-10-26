import { AlertDialog, Dialog } from "radix-ui";
import type { ReactNode } from "react";
import { Button } from "./ui";

/** A sheet from the bottom on phones (under the thumb), a centered dialog on wider screens. */
const SHEET_OVERLAY = "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-fade-in";
const SHEET_CONTENT =
  "pb-safe fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-line bg-surface px-5 pt-6 data-[state=open]:animate-sheet-in sm:inset-x-auto sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:w-full sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border sm:pb-5";

/**
 * A question with two answers, in a sheet. Opened by its `trigger`, or by the page through `open`.
 * Closing it any other way (outside, Escape) answers nothing.
 */
export function AskSheet({
  title,
  description,
  cancel,
  action,
  trigger,
  open,
  onClose,
}: {
  title: ReactNode;
  description: ReactNode;
  cancel: { label: string; onClick?: () => void };
  action: { label: string; onClick: () => void; danger?: boolean };
  trigger?: ReactNode;
  open?: boolean;
  onClose?: () => void;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose?.()}>
      {trigger && <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>}
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={SHEET_OVERLAY} />
        <AlertDialog.Content className={SHEET_CONTENT}>
          <AlertDialog.Title className="text-xl">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-muted">{description}</AlertDialog.Description>
          <div className="mt-6 flex flex-col-reverse gap-2 pb-2 sm:flex-row sm:justify-end sm:pb-0">
            <AlertDialog.Cancel asChild>
              <Button variant="ghost" onClick={cancel.onClick}>
                {cancel.label}
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant={action.danger ? "danger" : "primary"} onClick={action.onClick}>
                {action.label}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

/** Anything in a sheet, opened by its `trigger`; a tap outside or Escape closes it. */
export function Sheet({ title, trigger, children }: { title: ReactNode; trigger: ReactNode; children: ReactNode }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={SHEET_OVERLAY} />
        <Dialog.Content className={SHEET_CONTENT} aria-describedby={undefined}>
          <Dialog.Title className="text-xl">{title}</Dialog.Title>
          <div className="mt-4 pb-4 sm:pb-0">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
