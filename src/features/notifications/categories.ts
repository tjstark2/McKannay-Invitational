// One place that decides what a notification IS and who should get it, so the
// send route, the settings screen and the triggers can never drift apart.

export type Category =
  | "essential"   // always delivered, ignores quiet hours and every toggle
  | "round_day"
  | "live_action"
  | "my_card"
  | "awards"
  | "clubhouse"
  | "organizer";

export type LiveLevel = "big" | "all" | "off";
export type ClubhouseLevel = "all" | "mentions" | "off";

export type Prefs = {
  round_day: boolean;
  live_action: LiveLevel;
  my_card: boolean;
  awards: boolean;
  clubhouse_level: ClubhouseLevel;
  organizer: boolean;
  quiet_start: number;
  quiet_end: number;
  time_zone: string | null;
};

export const DEFAULT_PREFS: Prefs = {
  round_day: true,
  live_action: "big",
  my_card: true,
  awards: true,
  clubhouse_level: "all",
  organizer: true,
  quiet_start: 22,
  quiet_end: 6,
  time_zone: null,
};

/** Live events, split by how loud they are. */
export const BIG_MOMENTS = ["ace", "albatross", "eagle", "snowman", "lead_change", "close_at_turn"];
export const ALL_MOMENTS = [...BIG_MOMENTS, "birdie", "triple", "streak", "group_finished"];

export type Notification = {
  category: Category;
  /** For live_action and clubhouse, which specific event this is. */
  kind?: string;
  title: string;
  message: string;
  url?: string;
};

/** Is it currently inside this person's quiet hours? */
export function inQuietHours(prefsRaw: Partial<Prefs> | null, now = new Date()): boolean {
  const prefs: Prefs = { ...DEFAULT_PREFS, ...(prefsRaw ?? {}) };
  const tz = prefs.time_zone;
  let hour: number;
  try {
    hour = tz
      ? Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: tz }).format(now))
      : now.getHours();
  } catch {
    hour = now.getHours();
  }
  const { quiet_start: start, quiet_end: end } = prefs;
  // Quiet hours wrap midnight (22 -> 6).
  return start <= end ? hour >= start && hour < end : hour >= start || hour < end;
}

/**
 * Notifications that ignore quiet hours.
 *
 * The test: could you have done something differently if you had known at
 * 2am? For a tee time, yes. For a birdie in the chat, no. Everything else is
 * HELD until quiet hours end rather than dropped - dropping is what silently
 * swallowed notifications during the 2026 trip.
 */
export const CRITICAL_KINDS = [
  "tee_warning",    // your group tees off in 30 minutes
  "round_open",     // scoring is open, tell the organizer
  "round_started",  // your group is scoring now
  "score_changed",  // an organizer altered a score of yours
];

export function isCritical(kind?: string | null): boolean {
  return Boolean(kind && CRITICAL_KINDS.includes(kind));
}

/**
 * Does this person want this category at all?
 *
 * Deliberately says NOTHING about the time of day. A wanted notification at
 * 2am should wait for morning, not vanish - so "want" and "when" are two
 * separate questions, and mixing them is the bug this replaces.
 */
export function wantsCategory(n: Notification, prefsRaw: Partial<Prefs> | null): boolean {
  const prefs: Prefs = { ...DEFAULT_PREFS, ...(prefsRaw ?? {}) };
  if (n.category === "essential") return true;
  switch (n.category) {
    case "round_day":
      return prefs.round_day;
    case "my_card":
      return prefs.my_card;
    case "awards":
      return prefs.awards;
    case "organizer":
      return prefs.organizer;
    case "live_action": {
      if (prefs.live_action === "off") return false;
      const allowed = prefs.live_action === "big" ? BIG_MOMENTS : ALL_MOMENTS;
      return n.kind ? allowed.includes(n.kind) : true;
    }
    case "clubhouse": {
      if (prefs.clubhouse_level === "off") return false;
      if (prefs.clubhouse_level === "mentions") return n.kind === "mention";
      return true;
    }
    default:
      return true;
  }
}

/** When this person's quiet hours next end - when a held notification goes. */
export function nextQuietEnd(prefsRaw: Partial<Prefs> | null, now = new Date()): string {
  const prefs: Prefs = { ...DEFAULT_PREFS, ...(prefsRaw ?? {}) };
  const at = new Date(now);
  at.setMinutes(0, 0, 0);
  if (at.getHours() >= prefs.quiet_end) at.setDate(at.getDate() + 1);
  at.setHours(prefs.quiet_end);
  return at.toISOString();
}

/** Kept for callers that want one yes/no: wanted, and either critical or awake. */
export function shouldDeliver(
  n: Notification,
  prefsRaw: Partial<Prefs> | null,
  now = new Date()
): boolean {
  if (!wantsCategory(n, prefsRaw)) return false;
  if (n.category === "essential" || isCritical(n.kind)) return true;
  return !inQuietHours(prefsRaw, now);
}
