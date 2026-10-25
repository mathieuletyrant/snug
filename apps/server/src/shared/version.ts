import { join } from "node:path";

/** Snug's version, from the root package.json (release-please bumps it). */
export const VERSION: string = (await Bun.file(join(import.meta.dir, "../../../../package.json")).json()).version;
