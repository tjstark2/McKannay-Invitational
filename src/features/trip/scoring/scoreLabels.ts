// Turning a stroke count into what a golfer would actually call it.
//
// The label has to fit on a phone button next to the number, so anything worse
// than a triple becomes "+4", "+5" and so on rather than "Quadruple Bogey".

export type ScoreOption = {
  strokes: number;
  /** Short name: Ace, Eagle, Par, Bogey, Double, +4. */
  label: string;
  /** How it should read out loud, for screen readers. */
  spoken: string;
  tone: "great" | "good" | "level" | "over" | "bad";
};

export function scoreLabel(strokes: number, par: number): Omit<ScoreOption, "strokes"> {
  if (strokes === 1) {
    return { label: "Ace", spoken: "hole in one", tone: "great" };
  }
  const diff = strokes - par;
  switch (diff) {
    case -3:
      return { label: "Albatross", spoken: "albatross", tone: "great" };
    case -2:
      return { label: "Eagle", spoken: "eagle", tone: "great" };
    case -1:
      return { label: "Birdie", spoken: "birdie", tone: "good" };
    case 0:
      return { label: "Par", spoken: "par", tone: "level" };
    case 1:
      return { label: "Bogey", spoken: "bogey", tone: "over" };
    case 2:
      return { label: "Double", spoken: "double bogey", tone: "over" };
    case 3:
      return { label: "Triple", spoken: "triple bogey", tone: "bad" };
    default:
      return diff > 0
        ? { label: `+${diff}`, spoken: `${diff} over par`, tone: "bad" }
        : { label: `${diff}`, spoken: `${Math.abs(diff)} under par`, tone: "great" };
  }
}

/**
 * The buttons to offer for a hole: everything from 1 (an ace is always
 * possible, and people do make them) up to four over par. Anything worse goes
 * through the by-hand prompt.
 *
 * That gives 7 buttons on a par 3, 8 on a par 4 and 9 on a par 5, which lays
 * out as two comfortable rows rather than one cramped one.
 */
export function scoreOptions(par: number): ScoreOption[] {
  const out: ScoreOption[] = [];
  for (let s = 1; s <= par + 4; s++) {
    out.push({ strokes: s, ...scoreLabel(s, par) });
  }
  return out;
}

export const TONE_CLASS: Record<ScoreOption["tone"], string> = {
  great: "border-amber-400 bg-amber-50 text-amber-900",
  good: "border-emerald-400 bg-emerald-50 text-emerald-800",
  level: "border-slate-300 bg-white text-slate-700",
  over: "border-slate-300 bg-white text-slate-600",
  bad: "border-red-200 bg-red-50 text-red-700",
};
