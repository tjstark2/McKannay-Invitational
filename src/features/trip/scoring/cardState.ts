// Where one player's card is in a round. ONE answer, used everywhere.
//
// This was worked out separately in three places - the round engine, the
// confirm screen and score entry - and the engine counted score ROWS rather
// than distinct holes, so a stray duplicate could mark a card complete early.
// The card is what stalled every round of the 2026 trip, so it gets named
// states and one definition.

export type CardState =
  /** No holes entered. */
  | "not_started"
  /** Some holes entered, not all. */
  | "in_progress"
  /** Every hole in play has a score, but the player hasn't confirmed. */
  | "complete"
  /** Confirmed - by the player in the app, or automatically at close. */
  | "confirmed";

/** Holes a round needs: 9 or 18. */
export function holesNeededFor(holesCount?: number | null): 9 | 18 {
  return holesCount === 9 ? 9 : 18;
}

/**
 * One player's card.
 *
 * `holesEntered` is the hole numbers they have a score for. Duplicates and
 * holes outside the round are ignored: a card is complete when every hole IN
 * PLAY has a score, not when the row count happens to reach 18.
 */
export function cardState(input: {
  holesEntered: number[];
  holesInPlay: number[];
  confirmed: boolean;
}): CardState {
  if (input.confirmed) return "confirmed";
  const inPlay = new Set(input.holesInPlay);
  const done = new Set(input.holesEntered.filter((h) => inPlay.has(h)));
  if (done.size === 0) return "not_started";
  if (done.size >= inPlay.size) return "complete";
  return "in_progress";
}

/** The holes a round is played over: 1-18, 1-9, or 10-18. */
export function holesInPlayFor(holesCount?: number | null, nine?: string | null): number[] {
  if (holesNeededFor(holesCount) === 18) return Array.from({ length: 18 }, (_, i) => i + 1);
  return nine === "back"
    ? Array.from({ length: 9 }, (_, i) => i + 10)
    : Array.from({ length: 9 }, (_, i) => i + 1);
}

/** A card that has every hole in play, whether or not it is confirmed yet. */
export function hasAllHoles(state: CardState): boolean {
  return state === "complete" || state === "confirmed";
}

/** A whole group is done once every card in it has all its holes. */
export function groupFinished(states: CardState[]): boolean {
  return states.length > 0 && states.every(hasAllHoles);
}

/** Everyone in the round has confirmed - no reason to wait for the timer. */
export function everyoneConfirmed(states: CardState[]): boolean {
  return states.length > 0 && states.every((s) => s === "confirmed");
}
