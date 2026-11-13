// The AI's one job: rewrite award lines so they sound like they were written
// about these people, today.
//
// Everything that decides an outcome happened before this - the facts, the
// winners, the stats. The model only gets words. And its words are checked
// before they are used:
//   - every winner must be named, exactly as the app knows them
//   - every number must already be in the facts - no invented stats
//   - short, plain hyphens, nothing left unfilled
// A line that fails any check quietly keeps the hand-written version.

import type { Award } from "@/features/awards/select";

export const COPY_SYSTEM = `You write award lines for a golf trip app used by groups of friends.

Voice: spunky, fratty, borderline. Roast the golf, the handicap, the ego and the bar tab as hard as you like. Never joke about anyone's background, looks, family, body, health, race, religion, sexuality or where they are from. No slurs. Swearing only rarely and mildly.

Rules for every line:
- One or two sentences, under 200 characters.
- Use each winner's name exactly as given, character for character.
- Only use numbers that appear in that award's facts. Never invent a score, a hole or a count.
- Plain hyphens only, never em dashes.
- Keep the fact the award is about. You may change the joke, not the story.
- Vary the shape across the set so the lines do not all start or land the same way.
- If an award has been won before this trip, lean into the repeat.

Reply with ONLY raw JSON, no markdown: {"awards":[{"id":"<award id>","line":"<new line>"}]}`;

export type CopyContext = {
  tripName: string;
  roundTitle: string;
  stage: "opener" | "middle" | "finale";
  /** e.g. "Team Dietz lead 6-4" */
  standings: string;
  /** Everyone's name, so the model knows who is who. */
  field: string[];
};

/** The names an award is about. */
export type AwardWithNames = Award & { names: string[] };

export function copyPrompt(ctx: CopyContext, awards: AwardWithNames[], priorWins: Record<string, string[]>): string {
  return JSON.stringify(
    {
      trip: ctx.tripName,
      round: ctx.roundTitle,
      stage: ctx.stage,
      standings: ctx.standings,
      field: ctx.field,
      awards: awards.map((a) => ({
        id: a.momentId,
        title: a.title,
        winners: a.names,
        facts: a.stat,
        times_won_this_trip: a.tier,
        current_line: a.line,
      })),
      already_won_this_trip: priorWins,
    },
    null,
    1
  );
}

/** Pull the JSON out of a reply, tolerating fences or chatter around it. */
export function parseCopyReply(text: string): { id: string; line: string }[] {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return [];
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as { awards?: unknown };
    if (!Array.isArray(parsed.awards)) return [];
    return parsed.awards
      .filter((x): x is { id: string; line: string } =>
        !!x && typeof (x as { id?: unknown }).id === "string" && typeof (x as { line?: unknown }).line === "string")
      .map((x) => ({ id: x.id, line: x.line }));
  } catch {
    return [];
  }
}

const numbersIn = (s: string) => s.match(/\d+/g) ?? [];

/**
 * The checked line, or null if it fails a check. Dashes are normalised rather
 * than rejected - that is style, not substance.
 */
export function checkLine(line: string, award: AwardWithNames): string | null {
  const text = line.replace(/\s*[—–]\s*/g, " - ").replace(/\s+/g, " ").trim();
  if (text.length < 10 || text.length > 260) return null;
  if (/[{}]/.test(text)) return null;
  if (!award.names.every((n) => text.includes(n))) return null;
  // Every number has to come from somewhere real.
  const known = new Set([
    ...numbersIn(award.line),
    ...numbersIn(award.stat),
    ...award.names.flatMap(numbersIn),
    ...numbersIn(award.title),
  ]);
  if (!numbersIn(text).every((n) => known.has(n))) return null;
  return text;
}

/** Final line for each award: the AI's if it passed, the hand-written one if not. */
export function mergeCopy(
  awards: AwardWithNames[],
  reply: { id: string; line: string }[]
): { momentId: string; line: string; byAi: boolean }[] {
  return awards.map((a) => {
    const candidate = reply.find((r) => r.id === a.momentId);
    const ok = candidate ? checkLine(candidate.line, a) : null;
    return { momentId: a.momentId, line: ok ?? a.line, byAi: ok != null };
  });
}
