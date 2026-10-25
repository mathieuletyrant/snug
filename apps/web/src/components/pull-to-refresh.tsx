import { RefreshCw } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { queryClient } from "@/api";
import { useT } from "@/i18n";
import { cx } from "./ui";

/** How far the finger must pull (after resistance) to refresh, and the furthest the page follows it. */
const THRESHOLD = 72;
const MAX_PULL = 110;

/** Installed on the Home Screen: Safari's own pull-to-refresh is gone there. */
const standalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

/**
 * Pull the page down from the top to refetch what it shows. The page follows the finger at half speed,
 * an amber spinner turns with it and locks in past the threshold.
 */
export function PullToRefresh({ children }: { children: ReactNode }) {
  const t = useT();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const pullRef = useRef(0);

  useEffect(() => {
    if (!standalone()) return;
    const move = (distance: number) => {
      pullRef.current = distance;
      setPull(distance);
    };
    const onStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      start.current = window.scrollY <= 0 && touch ? { x: touch.clientX, y: touch.clientY } : null;
    };
    const onMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!start.current || !touch) return;
      const dy = touch.clientY - start.current.y;
      // A sideways swipe (a row of posters) or a scroll up is not a pull.
      if (dy <= 0 || Math.abs(touch.clientX - start.current.x) > dy) return move(0);
      move(Math.min(dy / 2, MAX_PULL));
    };
    const onEnd = async () => {
      start.current = null;
      if (pullRef.current < THRESHOLD) return move(0);
      move(THRESHOLD);
      setRefreshing(true);
      // At least half a second, so a fast answer doesn't look like a glitch.
      await Promise.all([queryClient.refetchQueries({ type: "active" }), new Promise((r) => setTimeout(r, 500))]);
      setRefreshing(false);
      move(0);
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  const dragging = pull > 0 && !refreshing && start.current !== null;
  const ready = pull >= THRESHOLD;
  return (
    <>
      <div
        aria-hidden={!refreshing}
        role="status"
        className="pointer-events-none fixed inset-x-0 top-[env(safe-area-inset-top)] z-30 flex justify-center"
        style={{ transform: `translateY(${pull - 44}px)`, opacity: Math.min(pull / THRESHOLD, 1) }}
      >
        <div
          className={cx(
            "flex size-10 items-center justify-center rounded-full border shadow-lg shadow-black/40 transition-colors",
            ready ? "border-accent/50 bg-accent text-accent-ink" : "border-line bg-raised text-accent",
          )}
        >
          <RefreshCw
            className={cx("size-5", refreshing && "animate-spin")}
            style={refreshing ? undefined : { transform: `rotate(${pull * 3}deg)` }}
          />
          {refreshing && <span className="sr-only">{t.refreshing}</span>}
        </div>
      </div>
      <div
        className={cx(!dragging && "transition-transform duration-300 ease-out")}
        style={pull ? { transform: `translateY(${pull}px)` } : undefined}
      >
        {children}
      </div>
    </>
  );
}
