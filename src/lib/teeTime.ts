// Tee times are stored as readable text ("8:00 AM") because that's what the
// schedule, the tee sheet and the shareable cards all display. The pickers use
// a native <input type="time"> (24-hour "HH:MM"), so these convert between the
// two and give one place to decide what counts as a valid time.

/** "8:00 AM" or "08:00" -> minutes since midnight, or null if unparseable. */
export function parseClock(text: string | null | undefined): number | null {
  const m = /^\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*$/i.exec(text ?? "");
  if (!m) return null;
  let h = Number(m[1]);
  const mins = Number(m[2] ?? 0);
  const ampm = (m[3] ?? "").toLowerCase();
  if (mins > 59) return null;
  if (ampm) {
    if (h < 1 || h > 12) return null;
    if (ampm === "pm" && h < 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;
  } else if (h > 23) {
    return null;
  }
  return h * 60 + mins;
}

/** Minutes since midnight -> "8:00 AM". */
export function formatClock(total: number): string {
  const wrapped = ((total % 1440) + 1440) % 1440;
  const h24 = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h = h24 % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** Stored text -> the "HH:MM" an <input type="time"> expects ("" if unset). */
export function toTimeInput(text: string | null | undefined): string {
  const mins = parseClock(text);
  if (mins == null) return "";
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

/** "HH:MM" from an <input type="time"> -> stored text ("" if the box is empty). */
export function fromTimeInput(value: string): string {
  const mins = parseClock(value);
  return mins == null ? "" : formatClock(mins);
}

/** True when the text is a time we can actually schedule against. */
export function isValidClock(text: string | null | undefined): boolean {
  return parseClock(text) != null;
}
