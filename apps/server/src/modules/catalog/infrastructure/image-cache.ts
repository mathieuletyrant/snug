import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { DATA_DIR } from "../../../shared/config";

const IMAGE_SIZES = ["w92", "w154", "w185", "w300", "w342", "w500", "w780", "w1280"] as const;
const FILE = /^[A-Za-z0-9_-]+\.(jpg|png|webp)$/;
const ROOT = join(DATA_DIR, "images");

/**
 * TMDB images, downloaded once and kept on disk: every device then loads them from the LAN.
 * ponytail: no eviction; posters are a few dozen KB each, prune DATA_DIR/images if it ever matters.
 */
export async function cachedImage(size: string, file: string): Promise<Blob | null> {
  if (!IMAGE_SIZES.includes(size as (typeof IMAGE_SIZES)[number]) || !FILE.test(file)) return null;
  const path = join(ROOT, size, file);
  const cached = Bun.file(path);
  if (await cached.exists()) return cached;

  const res = await fetch(`https://image.tmdb.org/t/p/${size}/${file}`);
  if (!res.ok) return null;
  const bytes = await res.arrayBuffer();
  await mkdir(join(ROOT, size), { recursive: true });
  await Bun.write(path, bytes);
  return new Blob([bytes], { type: res.headers.get("content-type") ?? "image/jpeg" });
}
