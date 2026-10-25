import { useT } from "@/i18n";
import { AskSheet } from "./sheet";

/**
 * Asked when an Episode is marked watched while earlier aired ones are not: mark them too, or only this one.
 * Opened by the page; closing it marks nothing.
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
  const t = useT();
  return (
    <AskSheet
      open={earlier > 0}
      onClose={onClose}
      title={t.series.catchUpTitle(earlier)}
      description={t.series.catchUpBody}
      cancel={{ label: t.series.onlyThisOne, onClick: onOnlyThis }}
      action={{ label: t.series.markAll(earlier + 1), onClick: onAll }}
    />
  );
}
