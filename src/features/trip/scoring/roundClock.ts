// When things happen in a round, in real time.
//
// Tee times are stored as local text - "7:30 AM" - with a calendar date. The
// server runs in UTC. Every automatic step (open scoring 30 minutes early,
// warn each group, close the round) needs to know when 7:30 in Hilton Head
// actually is, so all of that maths lives here, pure and tested.

/** "7:30 AM" / "10:03am" / "14:06" -> minutes after midnight, or null. */
export function parseClock(text: string | null | undefined): number | null {
  const m = /(\d{1,2}):(\d{2})\s*(am|pm)?/i.exec(text ?? "");
  if (!m) return null;
  let h = Number(m[1]);
  const mins = Number(m[2]);
  const ampm = (m[3] ?? "").toLowerCase();
  if (ampm === "pm" && h < 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  if (h > 23 || mins > 59) return null;
  return h * 60 + mins;
}

/** How many minutes a time zone is ahead of UTC at a given instant. */
function zoneOffsetMinutes(at: Date, timeZone: string): number {
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
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return Math.round((asUtc - at.getTime()) / 60000);
}

/**
 * A local wall-clock time on a date, in a zone, as a real instant.
 * Two passes so it stays right across a daylight-saving change.
 */
export function localToInstant(dateIso: string, minutesAfterMidnight: number, timeZone: string): Date {
  const [y, mo, d] = dateIso.slice(0, 10).split("-").map(Number);
  const h = Math.floor(minutesAfterMidnight / 60);
  const mi = minutesAfterMidnight % 60;
  const naive = Date.UTC(y, mo - 1, d, h, mi);
  let guess = naive - zoneOffsetMinutes(new Date(naive), timeZone) * 60000;
  guess = naive - zoneOffsetMinutes(new Date(guess), timeZone) * 60000;
  return new Date(guess);
}

/** When a tee time actually is. Null if either piece is missing or unreadable. */
export function teeOffAt(
  roundDate: string | null | undefined,
  teeTime: string | null | undefined,
  timeZone: string
): Date | null {
  if (!roundDate) return null;
  const mins = parseClock(teeTime);
  if (mins === null) return null;
  return localToInstant(roundDate, mins, timeZone);
}

/** The hour it is right now in a zone, 0-23. */
export function localHour(at: Date, timeZone: string): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hour12: false }).format(at)
  ) % 24;
}

/** Today's date in a zone, as yyyy-mm-dd. */
export function localDate(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** Scoring opens this long before the first tee time. */
export const OPEN_LEAD_MINUTES = 30;
/** Each group is warned this long before its own tee time. */
export const TEE_WARNING_MINUTES = 30;
/** A round closes this long after the last score... */
export const CLOSE_AFTER_LAST_SCORE_MINUTES = 180;
/** ...or at this local hour on the day, whichever comes first. */
export const CLOSE_LOCAL_HOUR = 21;
/** Outstanding players get one reminder this long before close. */
export const CLOSE_REMINDER_MINUTES = 30;

/**
 * When a live round closes itself: three hours after the last score, or 9pm
 * local on the day, whichever is earlier. If the last score is somehow after
 * 9pm, it gets its three hours rather than closing the instant it lands.
 */
export function roundClosesAt(
  lastScoreAt: string | null | undefined,
  roundDate: string | null | undefined,
  timeZone: string
): Date | null {
  if (!lastScoreAt) return null;
  const last = new Date(lastScoreAt);
  const afterLast = new Date(last.getTime() + CLOSE_AFTER_LAST_SCORE_MINUTES * 60000);
  if (!roundDate) return afterLast;
  const nine = localToInstant(roundDate, CLOSE_LOCAL_HOUR * 60, timeZone);
  return nine > last && nine < afterLast ? nine : afterLast;
}

/** Minutes from now until an instant. Negative once it has passed. */
export function minutesUntil(target: Date, now: Date): number {
  return (target.getTime() - now.getTime()) / 60000;
}
