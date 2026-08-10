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

function inQuietHours(prefs: Prefs, now = new Date()): boolean {
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

/** The single decision: does this person get this notification right now? */
export function shouldDeliver(
  n: Notification,
  prefsRaw: Partial<Prefs> | null,
  now = new Date()
): boolean {
  const prefs: Prefs = { ...DEFAULT_PREFS, ...(prefsRaw ?? {}) };

  // Essentials always go. Missing one means standing on the wrong tee.
  if (n.category === "essential") return true;

  if (inQuietHours(prefs, now)) return false;

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
