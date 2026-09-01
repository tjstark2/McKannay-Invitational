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
