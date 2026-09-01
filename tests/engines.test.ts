/**
 * The first automated tests on this project.
 *
 * Every bug these cover survived multiple manual test passes on a phone:
 *   - the draw dropping the 5th player on an odd team, and dealing the same
 *     person twice, which took three passes to pin down;
 *   - two different handicap implementations disagreeing, which made a
 *     correct app look wrong because the test sheet quoted the other one.
 *
 * They need no new dependency: Node's built-in test runner, run through tsx
 * which is already installed.
 *
 *   npm test
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { computeSlotMatches, computeGroups, type TeeSlot } from "../src/features/trip/draw/drawCompute";
import { scoreLabel, scoreOptions } from "../src/features/trip/scoring/scoreLabels";
import { snakeOrder, draftBalance } from "../src/features/trip/draw/teamDraft";
import type { Player } from "../src/types";

// A minimal player: the draw engine only reads id, team and handicap.
const p = (id: string, team: "A" | "B", hcp = 10): Player =>
  ({ id, name: id, team, handicapIndex: hcp } as unknown as Player);

const TEN = [
  p("a1", "A"), p("a2", "A"), p("a3", "A"), p("a4", "A"), p("a5", "A"),
  p("b1", "B"), p("b2", "B"), p("b3", "B"), p("b4", "B"), p("b5", "B"),
];

/** Hilton Head Round 1: two 2v2 groups and a 1v1. */
const SLOTS: TeeSlot[] = [
  { teeTimeId: "t1", label: "8:00 AM", playerIds: ["a1", "a2", "b1", "b2"], perSide: 2, points: 2 },
  { teeTimeId: "t2", label: "8:10 AM", playerIds: ["a3", "a4", "b3", "b4"], perSide: 2, points: 2 },
  { teeTimeId: "t3", label: "8:20 AM", playerIds: ["a5", "b5"], perSide: 1, points: 1 },
];

test("every assigned player is dealt exactly once, in every method", () => {
  for (const method of ["slot", "hat", "wheel", "draft", "autobalance", "manual"] as const) {
    const board = computeSlotMatches(SLOTS, TEN, {}, method);
    const dealt = board.flatMap((m) => [...m.a, ...m.b]);

    assert.equal(dealt.length, 10, `${method}: expected 10 seats`);
    assert.equal(new Set(dealt).size, 10, `${method}: someone was dealt twice`);
    for (const player of TEN) {
      assert.ok(dealt.includes(player.id), `${method}: ${player.id} was left out`);
    }
  }
});

test("the shape follows each tee time's own format, not the round's", () => {
  const board = computeSlotMatches(SLOTS, TEN, {}, "slot");
  assert.equal(board.length, 3, "expected three matches");
  assert.equal(board[0].a.length, 2, "8:00 should be 2v2");
  assert.equal(board[1].a.length, 2, "8:10 should be 2v2");
  assert.equal(board[2].a.length, 1, "8:20 should be 1v1");
  assert.equal(board[2].b.length, 1, "8:20 should be 1v1");
});

test("nobody crosses into another tee time", () => {
  const board = computeSlotMatches(SLOTS, TEN, {}, "wheel");
  for (const m of board) {
    const slot = SLOTS.find((s) => s.teeTimeId === m.teeTimeId)!;
    for (const id of [...m.a, ...m.b]) {
      assert.ok(slot.playerIds.includes(id), `${id} was dealt into the wrong group`);
    }
  }
});

test("an uneven group surfaces the odd player rather than dropping them", () => {
  // Three on one side, one on the other - the old engine silently binned the
  // leftover, which is where "8 of 10 players" came from.
  const odd: TeeSlot[] = [
    { teeTimeId: "x", label: "9:00 AM", playerIds: ["a1", "a2", "a3", "b1"], perSide: 2, points: 2 },
  ];
  const board = computeSlotMatches(odd, TEN, {}, "slot");
  const dealt = board.flatMap((m) => [...m.a, ...m.b]);
  assert.equal(dealt.length, 4, "all four should still appear");
  assert.equal(new Set(dealt).size, 4);
});

test("field groups chunk by four and never pad the last group", () => {
  const groups = computeGroups(TEN.map((x) => x.id), "fieldmanual", 8 * 60, 10, 4);
  assert.equal(groups.length, 3);
  assert.deepEqual(groups.map((g) => g.players.length), [4, 4, 2]);
  assert.equal(groups[0].tee, "8:00 AM");
  assert.equal(groups[1].tee, "8:10 AM");
  assert.equal(groups[2].tee, "8:20 AM");
});

test("balanced groups even out the combined handicaps", () => {
  const hcp: Record<string, number> = {
    a1: 2, a2: 5, a3: 8, a4: 10, a5: 12, b1: 15, b2: 18, b3: 22, b4: 24, b5: 30,
  };
  const groups = computeGroups(Object.keys(hcp), "fieldbalanced", 8 * 60, 10, 4, hcp);
  const totals = groups
    .filter((g) => g.players.length === 4)
    .map((g) => g.players.reduce((t, id) => t + hcp[id], 0));
  const spread = Math.max(...totals) - Math.min(...totals);
  assert.ok(spread <= 5, `full groups should be close, got a spread of ${spread}`);
});

test("snake order gives both captains the same number of picks", () => {
  for (const n of [6, 8, 10, 14]) {
    const order = snakeOrder("A", n);
    const a = order.filter((t) => t === "A").length;
    assert.equal(a, n / 2, `${n} picks should split evenly`);
    // First pick to the toss winner, then the other side takes two.
    assert.equal(order[0], "A");
    assert.equal(order[1], "B");
    assert.equal(order[2], "B");
    assert.equal(order[3], "A");
  }
});

test("draft balance does not report floating point noise", () => {
  const hcp = { a1: 10.4, a2: 8.1, b1: 14.5, b2: 18.3 };
  const { diff } = draftBalance({ a: ["a1", "a2"], b: ["b1", "b2"] }, hcp);
  // 18.5 vs 32.8. Without rounding this reads 14.299999999999999.
  assert.equal(diff, 14.3);
});

test("score labels read the way a golfer would say them", () => {
  assert.equal(scoreLabel(1, 4).label, "Ace");
  assert.equal(scoreLabel(1, 3).label, "Ace", "a 1 on a par 3 is still an ace");
  assert.equal(scoreLabel(2, 4).label, "Eagle");
  assert.equal(scoreLabel(3, 4).label, "Birdie");
  assert.equal(scoreLabel(4, 4).label, "Par");
  assert.equal(scoreLabel(5, 4).label, "Bogey");
  assert.equal(scoreLabel(6, 4).label, "Double");
  assert.equal(scoreLabel(7, 4).label, "Triple");
  assert.equal(scoreLabel(8, 4).label, "+4", "anything worse stays short enough for a button");
  assert.equal(scoreLabel(5, 5).label, "Par", "the same number means different things by par");
});

test("an ace is always offered, whatever the par", () => {
  for (const par of [3, 4, 5]) {
    const opts = scoreOptions(par);
    assert.equal(opts[0].strokes, 1, `par ${par} should start at 1`);
    assert.equal(opts[opts.length - 1].strokes, par + 4);
    assert.equal(opts.length, par + 4, `par ${par} should offer ${par + 4} buttons`);
  }
});

/* ---------------------------------------------------------------- live rows */

import { liveRowsForRound, toParLabel } from "../src/features/trip/scoring/liveStandings";

const SAWGRASS_HOLES = [
  { hole: 1, par: 4, si: 5 }, { hole: 2, par: 5, si: 13 }, { hole: 3, par: 3, si: 17 },
  { hole: 4, par: 4, si: 1 }, { hole: 5, par: 4, si: 3 }, { hole: 6, par: 4, si: 9 },
  { hole: 7, par: 4, si: 7 }, { hole: 8, par: 3, si: 15 }, { hole: 9, par: 5, si: 11 },
  { hole: 10, par: 4, si: 8 }, { hole: 11, par: 5, si: 12 }, { hole: 12, par: 4, si: 14 },
  { hole: 13, par: 3, si: 16 }, { hole: 14, par: 4, si: 2 }, { hole: 15, par: 4, si: 6 },
  { hole: 16, par: 3, si: 10 }, { hole: 17, par: 4, si: 18 }, { hole: 18, par: 5, si: 4 },
];

const SAWGRASS_PLAYERS = [
  { id: "tj", name: "TJ", handicapIndex: 10.4 },
  { id: "grant", name: "Grant", handicapIndex: 8.1 },
  { id: "kellogg", name: "Kellogg TJ", handicapIndex: 14.5 },
  { id: "swaggy", name: "Swaggy", handicapIndex: 18.3 },
];

/** The scripted card from the test document, holes 1-3. */
const CARD: Record<number, Record<string, number>> = {
  1: { tj: 4, grant: 5, kellogg: 4, swaggy: 6 },
  2: { tj: 6, grant: 5, kellogg: 7, swaggy: 8 },
  3: { tj: 3, grant: 2, kellogg: 4, swaggy: 5 },
};

function scriptedScores(upTo: number) {
  const out = [];
  for (let h = 1; h <= upTo; h++) {
    for (const [pid, strokes] of Object.entries(CARD[h])) {
      out.push({ roundId: "r1", playerId: pid, hole: h, strokes });
    }
  }
  return out;
}

const liveInput = (upTo: number) => ({
  roundId: "r1",
  groups: [{ playerIds: ["tj", "grant", "kellogg", "swaggy"], allowancePct: 100 }],
  holes: SAWGRASS_HOLES,
  holesCount: 18 as const,
  nine: null,
  tee: { rating: 74.0, slope: 149, par: 72 },
  players: SAWGRASS_PLAYERS,
  holeScores: scriptedScores(upTo),
});

test("live rows match the scripted card thru 3", () => {
  const rows = liveRowsForRound(liveInput(3));
  const by = Object.fromEntries(rows.map((r) => [r.playerId, r]));

  // Par for holes 1-3 is 4 + 5 + 3 = 12.
  assert.equal(by.grant.gross, 12);
  assert.equal(by.grant.strokesGiven, 0, "Grant is the low man, he plays off scratch");
  assert.equal(by.grant.netToPar, 0);

  assert.equal(by.tj.gross, 13);
  assert.equal(by.tj.strokesGiven, 0, "TJ gets 3 strokes but none on indexes 5, 13 or 17");
  assert.equal(by.tj.netToPar, 1);

  assert.equal(by.kellogg.gross, 15);
  assert.equal(by.kellogg.strokesGiven, 1, "index 5 is inside his 9");
  assert.equal(by.kellogg.netToPar, 2);

  assert.equal(by.swaggy.gross, 19);
  assert.equal(by.swaggy.strokesGiven, 2, "indexes 5 and 13 are inside his 14");
  assert.equal(by.swaggy.netToPar, 5);
});

test("two players with the same gross can sit apart on net", () => {
  // Hole 1 only: TJ and Kellogg TJ both card a 4.
  const rows = liveRowsForRound(liveInput(1));
  const by = Object.fromEntries(rows.map((r) => [r.playerId, r]));
  assert.equal(by.tj.gross, by.kellogg.gross, "same strokes taken");
  assert.equal(by.tj.netToPar, 0);
  assert.equal(by.kellogg.netToPar, -1, "he gets a stroke on index 5, TJ does not");
});

test("live rows sort by net and report holes played", () => {
  const rows = liveRowsForRound(liveInput(3));
  assert.deepEqual(rows.map((r) => r.playerId), ["grant", "tj", "kellogg", "swaggy"]);
  assert.ok(rows.every((r) => r.thru === 3));
  assert.ok(rows.every((r) => !r.complete), "3 of 18 is not a finished card");
});

test("no scores means no rows, so screens can fall back", () => {
  assert.equal(liveRowsForRound({ ...liveInput(0), holeScores: [] }).length, 0);
});

test("to par reads the way a golfer writes it", () => {
  assert.equal(toParLabel(0), "E");
  assert.equal(toParLabel(3), "+3");
  assert.equal(toParLabel(-2), "-2");
});

/* --------------------------------------------------------- live match state */

import { liveMatchStates } from "../src/features/trip/scoring/liveStandings";

test("live match state reports holes up without deciding a winner", () => {
  // 2v2: TJ + Grant against Kellogg TJ + Swaggy, through 3 holes.
  const states = liveMatchStates(liveInput(3), [
    { id: "m1", aPlayers: ["tj", "grant"], bPlayers: ["kellogg", "swaggy"] },
  ]);
  assert.equal(states.length, 1);
  const m = states[0];
  assert.equal(m.thru, 3, "all three holes have both sides in");
  // Best net per hole: h1 A min(4,5)=4 vs B min(3,5)=3 -> B.
  //                    h2 A min(6,5)=5 vs B min(7,7)=7 -> A.
  //                    h3 A min(3,2)=2 vs B min(4,5)=4 -> A.
  assert.equal(m.standing, 1, "A wins two holes to one");
  assert.equal(m.label, "1 up");
  assert.ok(!("winner" in m), "a live match must not declare a winner");
});

test("a hole only counts once both sides have finished it", () => {
  const partial = {
    ...liveInput(3),
    // Drop one of B's scores on hole 3.
    holeScores: liveInput(3).holeScores.filter(
      (s) => !(s.hole === 3 && s.playerId === "swaggy")
    ),
  };
  const [m] = liveMatchStates(partial, [
    { id: "m1", aPlayers: ["tj", "grant"], bPlayers: ["kellogg", "swaggy"] },
  ]);
  assert.equal(m.thru, 2, "hole 3 is incomplete for side B so it does not count");
});

test("all square reads as all square", () => {
  const [m] = liveMatchStates(liveInput(1), [
    { id: "m1", aPlayers: ["tj"], bPlayers: ["grant"] },
  ]);
  // Hole 1: TJ net 4, Grant net 5 -> TJ up one.
  assert.equal(m.standing, 1);
  const [m2] = liveMatchStates(liveInput(1), [
    { id: "m2", aPlayers: ["tj"], bPlayers: ["kellogg"] },
  ]);
  // TJ net 4 vs Kellogg net 3 -> Kellogg up one.
  assert.equal(m2.standing, -1);
  assert.equal(m2.label, "1 up");
});
