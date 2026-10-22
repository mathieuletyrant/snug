import { logger } from "./logger";

/** Runs `fn` over `items` with at most `limit` calls in flight. Failures are reported, not thrown. */
export async function forEachLimit<T>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<unknown>,
  onError: (item: T, error: unknown) => void = (item, error) => logger.error({ err: error }, `Task failed for ${String(item)}`),
): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next++] as T;
      try {
        await fn(item);
      } catch (error) {
        onError(item, error);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

export const today = (now: Date = new Date()) => now.toISOString().slice(0, 10);
