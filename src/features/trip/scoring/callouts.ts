// Turns a saved hole score into the trash talk it deserves.
//
// Pure detection so it can be tested. The caller decides where the message
// goes (Clubhouse chat) and whether to show a full-screen celebration.

export type CalloutLevel = "chat" | "celebrate" | "takeover";

export type Callout = {
  key: string;
  level: CalloutLevel;
  text: string;
  /** Set for the snowman so the caller can swap the avatar. */
  snowman?: boolean;
};

export type ScoreEvent = {
  playerName: string;
  hole: number;
  par: number;
  strokes: number;
  /** That player's scores so far this round, hole -> strokes. */
  roundScores: { hole: number; par: number; strokes: number }[];
};

const overName = (over: number): string | null => {
  if (over <= -3) return "albatross";
  if (over === -2) return "eagle";
  if (over === -1) return "birdie";
  if (over === 0) return "par";
  return null;
};

export function detectCallouts(e: ScoreEvent): Callout[] {
  const over = e.strokes - e.par;
  const out: Callout[] = [];

  // Hole in one beats everything.
  if (e.strokes === 1) {
    out.push({
      key: "ace",
      level: "takeover",
      text: `🚨 HOLE IN ONE. ${e.playerName} aced hole ${e.hole}. Everyone else can go home.`,
    });
    return out;
  }

  if (over <= -3) {
    out.push({
      key: "albatross",
      level: "takeover",
      text: `🦅🦅 ${e.playerName} made an ALBATROSS on ${e.hole}. That is not a real thing people do.`,
    });
  } else if (over === -2) {
    out.push({
      key: "eagle",
      level: "takeover",
      text: `🦅 EAGLE. ${e.playerName} just poured one in on hole ${e.hole}.`,
    });
  } else if (over === -1) {
    out.push({
      key: "birdie",
      level: "celebrate",
      text: `🐦 ${e.playerName} birdied hole ${e.hole}.`,
    });
  }

  // Snowman: an 8 on a par 5 is the classic, but any 8+ earns the hat.
  // A takeover, same as an eagle - the snowman is half the fun of the trip and
  // it changes the player's avatar until they play their way out of it, so it
  // deserves the full screen rather than a quiet line in the chat.
  if (e.strokes >= 8) {
    out.push({
      key: "snowman",
      level: "takeover",
      snowman: true,
      text:
        e.par === 5
          ? `⛄ ${e.playerName} put a snowman on the par 5 ${e.hole}. Building it one shot at a time.`
          : `⛄ ${e.playerName} carded an ${e.strokes} on hole ${e.hole}. Frosty.`,
    });
  } else if (over >= 3) {
    out.push({
      key: "triple",
      level: "chat",
      text: `😬 ${e.playerName} went ${over} over on hole ${e.hole}. Let us never speak of it.`,
    });
  }

  // Double bogey streak: this hole plus the two before it.
  const sorted = [...e.roundScores].sort((a, b) => a.hole - b.hole);
  const idx = sorted.findIndex((s) => s.hole === e.hole);
  if (idx >= 2) {
    const last3 = sorted.slice(idx - 2, idx + 1);
    if (last3.length === 3 && last3.every((s) => s.strokes - s.par >= 2)) {
      out.push({
        key: "streak",
        level: "chat",
        text: `📉 ${e.playerName} has three straight doubles or worse. Someone check on them.`,
      });
    }
  }

  // Par milestones at 5 and 10.
  const pars = sorted.filter((s) => s.strokes - s.par === 0).length;
  if (over === 0 && (pars === 5 || pars === 10)) {
    out.push({
      key: `pars-${pars}`,
      level: "chat",
      text: `🎯 That is ${pars} pars for ${e.playerName} today. Boring. Effective.`,
    });
  }

  void overName;
  return out;
}

/** Handicap-tiered rule for shaking the snowman avatar off. */
export function snowmanEarnOff(handicapIndex: number): { over: number; label: string } {
  if (handicapIndex < 12) return { over: -1, label: "a birdie or better" };
  if (handicapIndex <= 22) return { over: 0, label: "a par or better" };
  return { over: 2, label: "a double bogey or better" };
}

export function clearsSnowman(handicapIndex: number, strokes: number, par: number): boolean {
  return strokes - par <= snowmanEarnOff(handicapIndex).over;
}
