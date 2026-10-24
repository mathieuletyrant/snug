import type { ReactNode } from "react";
import { AskSheet } from "./sheet";

/** Asks before a destructive action. `children` is the trigger. */
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
    <AskSheet
      title={title}
      description={description}
      cancel={{ label: "Cancel" }}
      action={{ label: confirm, onClick: onConfirm, danger: true }}
      trigger={children}
    />
  );
}
