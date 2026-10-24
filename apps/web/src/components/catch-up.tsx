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
  return (
    <AskSheet
      open={earlier > 0}
      onClose={onClose}
      title={`${earlier} earlier ${earlier === 1 ? "episode" : "episodes"} not watched`}
      description="Mark them watched too?"
      cancel={{ label: "Only this one", onClick: onOnlyThis }}
      action={{ label: `Mark all ${earlier + 1}`, onClick: onAll }}
    />
  );
}
