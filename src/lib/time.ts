/**
 * Offset of `timeZone` from UTC, in milliseconds, at the given instant.
 * Positive east of Greenwich (Asia/Jakarta → +7h).
 */
export function zoneOffsetMs(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asZone = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second")
  );
  return asZone - at.getTime();
}

/**
 * Turns the naive "YYYY-MM-DDTHH:mm" value an <input type="datetime-local">
 * produces into the real instant it refers to, reading it as wall-clock time in
 * `timeZone` rather than in whatever zone the server happens to run in.
 */
export function parseDatetimeLocal(value: string, timeZone: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  const naiveUtc = new Date(`${value.slice(0, 16)}:00Z`);
  if (Number.isNaN(naiveUtc.getTime())) return null;

  // Two passes so instants close to a DST boundary land on the right side.
  let instant = naiveUtc.getTime() - zoneOffsetMs(timeZone, naiveUtc);
  instant = naiveUtc.getTime() - zoneOffsetMs(timeZone, new Date(instant));
  return new Date(instant);
}

/** Start (inclusive) and end (exclusive) of "today" in `timeZone`, as UTC instants. */
export function dayBounds(timeZone: string, now: Date): { start: Date; end: Date } {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const start = parseDatetimeLocal(`${ymd}T00:00`, timeZone) ?? now;
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

/** Hour of day (0-23) right now in `timeZone`. */
export function hourIn(timeZone: string, now: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hour12: false }).format(now)
  );
}
