// Display a stored time nicely. Converts 24h "HH:MM" to "H:MM AM/PM";
// passes through values already formatted ("8:00 AM"), "TBD", "", etc.
export function displayTime(v?: string | null): string {
  const s = (v || "").trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return s;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${min} ${ampm}`;
}
