import type { ReactNode } from "react";
import { useT } from "../i18n";
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
  const t = useT();
  return (
    <AskSheet
      title={title}
      description={description}
      cancel={{ label: t.common.cancel }}
      action={{ label: confirm, onClick: onConfirm, danger: true }}
      trigger={children}
    />
  );
}
