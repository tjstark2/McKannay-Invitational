// Round dates and the tournament's time zone - what the round engine runs on.
//
// The engine opens scoring, warns each group and closes the round off a
// round's real calendar date plus the tournament's time zone. Nothing in the
// app used to set either: rounds only had a free-text label ("Sept 14") and
// every tournament silently ran on US Eastern time. Every round that wasn't
// set up by hand in SQL simply never ran itself.

/** "2026-12-10" -> "Thu, Dec 10". The display label, always derived from the real date. */
export function dateLabelFor(ymd: string | null | undefined): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  const d = new Date(`${ymd}T12:00:00Z`);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

/** A yyyy-mm-dd date `days` later. */
export function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * The time zone most of a US state is in. A starting guess for where the
 * golf is - the organizer can change it in Manage, and states split across
 * zones (Florida panhandle, west Texas) are rare for a golf trip.
 */
const STATE_TZ: Record<string, string> = {
  AL: "America/Chicago", AK: "America/Anchorage", AZ: "America/Phoenix", AR: "America/Chicago",
  CA: "America/Los_Angeles", CO: "America/Denver", CT: "America/New_York", DE: "America/New_York",
  DC: "America/New_York", FL: "America/New_York", GA: "America/New_York", HI: "Pacific/Honolulu",
  ID: "America/Boise", IL: "America/Chicago", IN: "America/Indiana/Indianapolis", IA: "America/Chicago",
  KS: "America/Chicago", KY: "America/New_York", LA: "America/Chicago", ME: "America/New_York",
  MD: "America/New_York", MA: "America/New_York", MI: "America/Detroit", MN: "America/Chicago",
  MS: "America/Chicago", MO: "America/Chicago", MT: "America/Denver", NE: "America/Chicago",
  NV: "America/Los_Angeles", NH: "America/New_York", NJ: "America/New_York", NM: "America/Denver",
  NY: "America/New_York", NC: "America/New_York", ND: "America/Chicago", OH: "America/New_York",
  OK: "America/Chicago", OR: "America/Los_Angeles", PA: "America/New_York", RI: "America/New_York",
  SC: "America/New_York", SD: "America/Chicago", TN: "America/Chicago", TX: "America/Chicago",
  UT: "America/Denver", VT: "America/New_York", VA: "America/New_York", WA: "America/Los_Angeles",
  WV: "America/New_York", WI: "America/Chicago", WY: "America/Denver",
};

export function timeZoneForState(state: string | null | undefined): string | null {
  return state ? STATE_TZ[state.trim().toUpperCase()] ?? null : null;
}

/** The zones offered in Manage, US first, plus the browser's own if it isn't one of them. */
export const TIME_ZONES: { id: string; label: string }[] = [
  { id: "America/New_York", label: "Eastern" },
  { id: "America/Chicago", label: "Central" },
  { id: "America/Denver", label: "Mountain" },
  { id: "America/Phoenix", label: "Arizona" },
  { id: "America/Los_Angeles", label: "Pacific" },
  { id: "America/Anchorage", label: "Alaska" },
  { id: "Pacific/Honolulu", label: "Hawaii" },
  { id: "Europe/London", label: "UK & Ireland" },
  { id: "Europe/Madrid", label: "Central Europe" },
  { id: "America/Cancun", label: "Cancun" },
  { id: "America/Puerto_Rico", label: "Puerto Rico / Atlantic" },
];
