import { GalleryHorizontal, LayoutGrid, List } from "lucide-react";
import { useState } from "react";
import { cx } from "@/components/ui";
import { useT } from "@/i18n";

export type ReadyLayout = "cards" | "list" | "carousel";

const LAYOUTS: ReadyLayout[] = ["cards", "list", "carousel"];
const LAYOUT_KEY = "snug.readyLayout";

/** The last layout, per device: a list on the phone, cards on the iPad. */
function storedLayout(): ReadyLayout {
  try {
    const stored = localStorage.getItem(LAYOUT_KEY);
    return LAYOUTS.find((layout) => layout === stored) ?? "cards";
  } catch {
    return "cards";
  }
}

export function useReadyLayout() {
  const [layout, setLayout] = useState(storedLayout);
  const choose = (next: ReadyLayout) => {
    setLayout(next);
    try {
      localStorage.setItem(LAYOUT_KEY, next);
    } catch {}
  };
  return [layout, choose] as const;
}

const ICONS = { cards: LayoutGrid, list: List, carousel: GalleryHorizontal };

/** Three icon buttons, the current one lit: how "Ready to watch" is laid out. */
export function LayoutSwitch({ value, onChange }: { value: ReadyLayout; onChange: (layout: ReadyLayout) => void }) {
  const t = useT();
  return (
    <div role="group" aria-label={t.home.layout.label} className="flex shrink-0 gap-0.5 rounded-full bg-raised p-0.5">
      {LAYOUTS.map((layout) => {
        const Icon = ICONS[layout];
        const current = layout === value;
        return (
          <button
            key={layout}
            aria-label={t.home.layout[layout]}
            aria-pressed={current}
            onClick={() => onChange(layout)}
            className={cx(
              "flex h-8 w-10 items-center justify-center rounded-full transition",
              current ? "bg-accent text-accent-ink" : "text-muted hover:text-text",
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
