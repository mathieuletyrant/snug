import pino from "pino";
import pretty from "pino-pretty";

const LEVELS = ["trace", "debug", "info", "warn", "error", "fatal", "silent"] as const;
type Level = (typeof LEVELS)[number];

const requested = (process.env.LOG_LEVEL ?? "").toLowerCase();
export const LOG_LEVEL: Level = (LEVELS as readonly string[]).includes(requested)
  ? (requested as Level)
  : process.env.NODE_ENV === "test"
    ? "silent"
    : "info";

/**
 * One line per event, readable in `docker logs` (umbrelOS → Troubleshoot): `12:04:31 INFO jellyfin: Marked …`.
 * Messages carry the whole event; only unexpected errors add their stack (`log.error({ err }, …)`).
 * LOG_FORMAT=json gives raw pino JSON lines for a log collector instead.
 * The pretty stream runs in-process (no worker transport), so lines are never lost on exit.
 */
export const logger = pino(
  { level: LOG_LEVEL, base: undefined },
  process.env.LOG_FORMAT === "json"
    ? undefined
    : pretty({
        colorize: !!process.stdout.isTTY,
        translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
        ignore: "module",
        messageFormat: "{if module}{module}: {end}{msg}",
      }),
);

/** Logger of one module: its name prefixes every line. */
export const moduleLogger = (module: string) => logger.child({ module });

/** Error as a short line ("TMDB 401 on /tv/1"), for warnings where a stack trace is noise. */
export const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));
