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

/* ------------------------------------------------------- notification rules */
//
// The quiet hours, criticality and hold-queue tests live in the notifications
// bundle, which is not deployed yet. They call inQuietHours, isCritical,
// wantsCategory and nextQuietEnd - none of which exist in categories.ts until
// that bundle ships. Put them back when it does.

/* ------------------------------------------- net score is a FIELD contest */

import { basisForFormat } from "../src/features/trip/scoring/liveStandings";
import { allocateForMatch } from "../src/features/trip/scoring/strokeIndex";

const AD_HOLES = [
  { hole: 1, par: 4, si: 11 }, { hole: 2, par: 4, si: 7 }, { hole: 3, par: 3, si: 17 },
  { hole: 4, par: 5, si: 9 }, { hole: 5, par: 4, si: 13 }, { hole: 6, par: 4, si: 3 },
  { hole: 7, par: 3, si: 15 }, { hole: 8, par: 4, si: 5 }, { hole: 9, par: 5, si: 1 },
  { hole: 10, par: 3, si: 18 }, { hole: 11, par: 4, si: 16 }, { hole: 12, par: 4, si: 12 },
  { hole: 13, par: 4, si: 6 }, { hole: 14, par: 5, si: 8 }, { hole: 15, par: 3, si: 14 },
  { hole: 16, par: 4, si: 10 }, { hole: 17, par: 5, si: 2 }, { hole: 18, par: 4, si: 4 },
];
const AD_TEE = { rating: 71.6, slope: 135, par: 72 };

const alloc = (players: { playerId: string; name: string; index: number }[],
               basis: "relative" | "full") =>
  allocateForMatch({
    players, tee: AD_TEE, holes: AD_HOLES, holesCount: 18, nine: null,
    allowancePct: 100, basis,
  });

test("net score rounds use the full course handicap, not the group", () => {
  assert.equal(basisForFormat("net_score"), "full");
  assert.equal(basisForFormat("best_ball"), "relative");
  assert.equal(basisForFormat("match_play"), "relative");
  assert.equal(basisForFormat(null), "relative");
});

test("a player's net must not depend on who they teed off with", () => {
  // The same golfer, in two different groups. Under "full" his strokes are
  // identical; under "relative" they are not - which is the bug that had to be
  // fixed by hand during the 2026 trip.
  const withScratch = [
    { playerId: "kody", name: "Kody", index: 16.0 },
    { playerId: "joe", name: "Joe", index: 0.0 },
  ];
  const withHighHandicaps = [
    { playerId: "kody", name: "Kody", index: 16.0 },
    { playerId: "dcole", name: "Dcole", index: 19.6 },
  ];

  const fullA = alloc(withScratch, "full").find((x) => x.playerId === "kody")!;
  const fullB = alloc(withHighHandicaps, "full").find((x) => x.playerId === "kody")!;
  assert.equal(fullA.strokes, fullB.strokes, "full basis is group independent");
  assert.equal(fullA.strokes, 18, "16.0 index plays off 18 at Atlantic Dunes");

  const relA = alloc(withScratch, "relative").find((x) => x.playerId === "kody")!;
  const relB = alloc(withHighHandicaps, "relative").find((x) => x.playerId === "kody")!;
  assert.notEqual(relA.strokes, relB.strokes, "relative basis DOES depend on the group");
});

test("Saturday of the 2026 trip resolves the way it was scored by hand", () => {
  // Real cards. Net = gross - full course handicap at Atlantic Dunes.
  const field = [
    { playerId: "hank", name: "@hankalan", index: 10.6, gross: 87, team: "B" },
    { playerId: "dcole", name: "@dcole", index: 19.6, gross: 100, team: "B" },
    { playerId: "kody", name: "Kody", index: 16.0, gross: 97, team: "A" },
    { playerId: "ryan", name: "Ryan", index: 10.9, gross: 93, team: "B" },
    { playerId: "anthony", name: "@apalladino", index: 14.4, gross: 97, team: "A" },
    { playerId: "joe", name: "@joegowdy", index: 0.0, gross: 85, team: "A" },
    { playerId: "colum", name: "Colum", index: 13.7, gross: 101, team: "A" },
    { playerId: "wade", name: "Wade", index: 10.3, gross: 98, team: "B" },
    { playerId: "tj", name: "TJ", index: 13.3, gross: 104, team: "A" },
    { playerId: "ben", name: "Ben", index: 16.2, gross: 108, team: "B" },
  ];
  const strokes = alloc(field, "full");
  const ranked = field
    .map((p) => ({
      ...p,
      net: p.gross - strokes.find((s) => s.playerId === p.playerId)!.courseHandicap,
    }))
    .sort((a, b) => a.net - b.net);

  assert.deepEqual(
    ranked.slice(0, 5).map((r) => r.name),
    ["@hankalan", "@dcole", "Kody", "Ryan", "@apalladino"],
    "top five by net"
  );
  assert.equal(ranked[0].net, 75, "Hank had the low net");

  const top5 = ranked.slice(0, 5);
  assert.equal(top5.filter((r) => r.team === "A").length, 2, "McKannay took 2");
  assert.equal(top5.filter((r) => r.team === "B").length, 3, "Dietz took 3");
});

/* --------------------------------------------------------------- round clock */

import {
  parseClock,
  teeOffAt,
  roundClosesAt,
  localDate,
  localHour,
} from "../src/features/trip/scoring/roundClock";

test("tee times read the way they are written", () => {
  assert.equal(parseClock("7:30 AM"), 450);
  assert.equal(parseClock("10:03am"), 603);
  assert.equal(parseClock("2:06 PM"), 846);
  assert.equal(parseClock("12:15 AM"), 15, "midnight hour");
  assert.equal(parseClock("12:15 PM"), 735, "noon hour");
  assert.equal(parseClock("7:30 AM #1"), 450, "match labels carry a suffix");
  assert.equal(parseClock("TBD"), null);
});

test("a Hilton Head tee time is the right instant in September", () => {
  // September is daylight time: New York is UTC-4, so 7:30 local is 11:30 UTC.
  const at = teeOffAt("2026-09-11", "7:30 AM", "America/New_York")!;
  assert.equal(at.toISOString(), "2026-09-11T11:30:00.000Z");
});

test("the same tee time is an hour later in UTC in December", () => {
  // December is standard time: UTC-5. The December trip crosses this change,
  // and getting it wrong would open scoring an hour early or late.
  const at = teeOffAt("2026-12-11", "7:30 AM", "America/New_York")!;
  assert.equal(at.toISOString(), "2026-12-11T12:30:00.000Z");
});

test("a round closes three hours after the last score", () => {
  // Last score 1pm local (17:00 UTC in September) -> closes 4pm local.
  const close = roundClosesAt("2026-09-11T17:00:00.000Z", "2026-09-11", "America/New_York")!;
  assert.equal(close.toISOString(), "2026-09-11T20:00:00.000Z");
});

test("a late round closes at 9pm, not three hours after", () => {
  // Last score 7pm local -> 9pm cap comes first.
  const close = roundClosesAt("2026-09-11T23:00:00.000Z", "2026-09-11", "America/New_York")!;
  assert.equal(close.toISOString(), "2026-09-12T01:00:00.000Z", "9pm EDT");
});

test("a score after 9pm still gets its three hours", () => {
  // Nobody should be closed out the instant they finish.
  const close = roundClosesAt("2026-09-12T02:00:00.000Z", "2026-09-11", "America/New_York")!;
  assert.equal(close.toISOString(), "2026-09-12T05:00:00.000Z");
});

test("no scores means the round never closes itself", () => {
  assert.equal(roundClosesAt(null, "2026-09-11", "America/New_York"), null);
});

test("local date and hour follow the trip's zone, not the server's", () => {
  const at = new Date("2026-09-12T02:00:00.000Z"); // 10pm on the 11th in New York
  assert.equal(localDate(at, "America/New_York"), "2026-09-11");
  assert.equal(localHour(at, "America/New_York"), 22);
});

/* ------------------------------------------------------- notification rules */

import {
  inQuietHours,
  isCritical,
  nextQuietEnd,
  wantsCategory,
  shouldDeliver,
} from "../src/features/notifications/categories";

const at = (hour: number) => new Date(2026, 8, 1, hour, 0, 0);
const note = (category: string, kind: string) =>
  ({ category, kind, title: "t", message: "m" }) as Parameters<typeof wantsCategory>[0];

test("quiet hours wrap midnight", () => {
  const p = { quiet_start: 22, quiet_end: 6, time_zone: null };
  assert.equal(inQuietHours(p, at(23)), true);
  assert.equal(inQuietHours(p, at(2)), true);
  assert.equal(inQuietHours(p, at(6)), false);
  assert.equal(inQuietHours(p, at(14)), false);
});

test("critical means acting late would cost you something", () => {
  assert.equal(isCritical("tee_warning"), true);
  assert.equal(isCritical("round_open"), true);
  assert.equal(isCritical("score_changed"), true);
  assert.equal(isCritical("eagle"), false, "fun, but nothing to do at 2am");
  assert.equal(isCritical(null), false);
});

test("wanting a notification is separate from when it arrives", () => {
  // The fix: a wanted notification at 2am is HELD, not dropped.
  assert.equal(wantsCategory(note("clubhouse", "message"), { clubhouse_level: "off" }), false);
  assert.equal(wantsCategory(note("clubhouse", "message"), {}), true);
  assert.equal(wantsCategory(note("essential", "tee_warning"), { clubhouse_level: "off" }), true);
});

test("a wanted notification at 2am is not delivered right then", () => {
  const p = { quiet_start: 22, quiet_end: 6, time_zone: null };
  assert.equal(shouldDeliver(note("round_day", "night_before"), p, at(2)), false, "held for morning");
  assert.equal(shouldDeliver(note("essential", "tee_warning"), p, at(2)), true, "critical goes now");
});

test("a held notification waits for morning, not forever", () => {
  const p = { quiet_start: 22, quiet_end: 6, time_zone: null };
  const late = new Date(nextQuietEnd(p, at(23)));
  assert.equal(late.getHours(), 6);
  assert.equal(late.getDate(), 2, "11pm waits until the next morning");
  const early = new Date(nextQuietEnd(p, at(2)));
  assert.equal(early.getDate(), 1, "2am waits only until later that morning");
});

test("mentions still arrive when the clubhouse is set to mentions only", () => {
  const p = { clubhouse_level: "mentions" as const };
  assert.equal(wantsCategory(note("clubhouse", "mention"), p), true);
  assert.equal(wantsCategory(note("clubhouse", "message"), p), false);
});

/* ------------------------------------------------------------ career records */

import { buildCareerTable, headToHead, tripResultLine } from "../src/features/series/career";

// Two years of the same series. Wade and TJ play both; the player ROW ids
// differ each year, the accounts do not.
const CAREER_TRIPS = [
  { id: "t26", name: "2026", sequence: 1, finalA: 6, finalB: 9, winner: "B", completedAt: "2026-09-12" },
  { id: "t27", name: "2027", sequence: 2, finalA: 8, finalB: 7, winner: "A", completedAt: "2027-09-12" },
];
const CAREER_PLAYERS = [
  { id: "p1", tripId: "t26", accountId: "wade", name: "Wade", team: "B" },
  { id: "p2", tripId: "t26", accountId: "tj", name: "TJ", team: "A" },
  { id: "p3", tripId: "t27", accountId: "wade", name: "Wade", team: "A" },
  { id: "p4", tripId: "t27", accountId: "tj", name: "TJ", team: "B" },
  { id: "p5", tripId: "t27", accountId: null, name: "Guest", team: "B" },
];
const CAREER_MATCHES = [
  { id: "m1", tripId: "t26", points: 1, result: "B", aPlayers: ["p2"], bPlayers: ["p1"] },
  { id: "m2", tripId: "t26", points: 2, result: "T", aPlayers: ["p2"], bPlayers: ["p1"] },
  { id: "m3", tripId: "t27", points: 1, result: "A", aPlayers: ["p3"], bPlayers: ["p4"] },
  { id: "m4", tripId: "t27", points: 1, result: null, aPlayers: ["p3"], bPlayers: ["p4"] },
];
const CAREER_SCORES = [
  { tripId: "t26", playerId: "p1", gross: 98 },
  { tripId: "t27", playerId: "p3", gross: 91 },
  { tripId: "t26", playerId: "p2", gross: 104 },
];

test("the same person across two trips is one career row", () => {
  const rows = buildCareerTable({
    trips: CAREER_TRIPS,
    players: CAREER_PLAYERS,
    matches: CAREER_MATCHES,
    scores: CAREER_SCORES,
  });
  const wade = rows.find((r) => r.accountId === "wade")!;
  assert.equal(wade.trips, 2, "different player rows, same account");
  assert.equal(wade.won, 2, "won in 2026 and 2027");
  assert.equal(wade.halved, 1);
  assert.equal(wade.points, 1 + 1 + 1, "1 + 1 for wins, half of 2 for the tie");
  assert.equal(wade.bestGross, 91, "best across the series, not per trip");
  assert.equal(wade.trophies, 2, "team B won 2026, team A won 2027 - Wade was on both");
});

test("teams do not carry across years, so trophies follow the stored result", () => {
  const rows = buildCareerTable({
    trips: CAREER_TRIPS,
    players: CAREER_PLAYERS,
    matches: CAREER_MATCHES,
    scores: CAREER_SCORES,
  });
  const tj = rows.find((r) => r.accountId === "tj")!;
  // TJ was on A in 2026 (lost) and B in 2027 (lost). Same letter, different side.
  assert.equal(tj.trophies, 0);
  assert.equal(tj.lost, 2);
});

test("a match that never resolved counts for nobody", () => {
  const rows = buildCareerTable({
    trips: CAREER_TRIPS,
    players: CAREER_PLAYERS,
    matches: CAREER_MATCHES,
    scores: [],
  });
  const wade = rows.find((r) => r.accountId === "wade")!;
  assert.equal(wade.matches, 3, "four matches, one unresolved");
});

test("a player with no account is left out rather than counted twice", () => {
  const rows = buildCareerTable({
    trips: CAREER_TRIPS,
    players: CAREER_PLAYERS,
    matches: CAREER_MATCHES,
    scores: [],
  });
  assert.equal(rows.length, 2, "Wade and TJ only - the guest has no account");
});

test("head to head only counts meetings on opposite sides", () => {
  const h = headToHead("wade", "tj", { players: CAREER_PLAYERS, matches: CAREER_MATCHES });
  assert.equal(h.wins, 2, "Wade beat TJ in both years");
  assert.equal(h.losses, 0);
  assert.equal(h.halved, 1);
  assert.equal(h.meetings.length, 3, "the unresolved match is not a meeting");

  // And it reads the other way round from TJ's side.
  const back = headToHead("tj", "wade", { players: CAREER_PLAYERS, matches: CAREER_MATCHES });
  assert.equal(back.wins, 0);
  assert.equal(back.losses, 2);
});

test("partners are not opponents", () => {
  const partners = [{ id: "mx", tripId: "t26", points: 2, result: "A", aPlayers: ["p1", "p2"], bPlayers: [] }];
  const h = headToHead("wade", "tj", { players: CAREER_PLAYERS, matches: partners });
  assert.equal(h.meetings.length, 0);
});

test("the trip result reads as it finished", () => {
  const names = (code: string) => (code === "A" ? "Team McKannay" : "Team Dietz");
  assert.equal(tripResultLine(CAREER_TRIPS[0], names), "Team Dietz won 9 - 6");
  assert.equal(tripResultLine(CAREER_TRIPS[1], names), "Team McKannay won 8 - 7");
  assert.equal(
    tripResultLine({ ...CAREER_TRIPS[0], finalA: null, finalB: null, winner: null }, names),
    "Not finished"
  );
});

/* ---------------------------------------------------------------- round phase */

import { roundPhase, focusRound, liveRound, allRoundsFinal } from "../src/features/trip/scoring/roundPhase";

const R = (n: number, started?: string, finished?: string) => ({
  id: `r${n}`,
  roundNumber: n,
  startedAt: started ?? null,
  finishedAt: finished ?? null,
});

test("a round's phase comes from its own start and finish, nothing else", () => {
  assert.equal(roundPhase(R(1)), "upcoming");
  assert.equal(roundPhase(R(1, "2026-12-11T12:00Z")), "live");
  assert.equal(roundPhase(R(1, "2026-12-11T12:00Z", "2026-12-11T18:00Z")), "final");
});

test("the app focuses on the round being played", () => {
  const rounds = [R(1, "x", "y"), R(2, "x"), R(3)];
  assert.equal(focusRound(rounds)?.id, "r2");
});

test("a finished round can never be the focus while another is still to play", () => {
  // The Nest showed "Next round: Thursday" on Friday: the organizer's pointer
  // still named Thursday after it had finished. That pointer is now ignored
  // once the round it names is final.
  const rounds = [R(1, "x", "y"), R(2), R(3)];
  assert.equal(focusRound(rounds, "r1")?.id, "r2");
});

test("the organizer's choice still wins between rounds", () => {
  const rounds = [R(1, "x", "y"), R(2), R(3)];
  assert.equal(focusRound(rounds, "r3")?.id, "r3", "they can point ahead to Saturday");
});

test("when every round is done, the focus is the last one played", () => {
  const rounds = [R(1, "x", "y"), R(2, "x", "y")];
  assert.equal(focusRound(rounds)?.id, "r2");
  assert.equal(allRoundsFinal(rounds), true);
});

test("a live round outranks the organizer's pointer", () => {
  const rounds = [R(1, "x"), R(2)];
  assert.equal(focusRound(rounds, "r2")?.id, "r1");
  assert.equal(liveRound(rounds)?.id, "r1");
});

test("no rounds means no focus, not a crash", () => {
  assert.equal(focusRound([]), null);
  assert.equal(liveRound([]), null);
  assert.equal(allRoundsFinal([]), false);
});

/* ------------------------------------------------------------ onboarding */

import { safeNext } from "../src/features/avatar/BirdGate";

test("the bird pages only ever send people back into the app", () => {
  assert.equal(safeNext("/t/ENGINE1"), "/t/ENGINE1", "an invite destination survives");
  assert.equal(safeNext("/t/ENGINE1?x=1"), "/t/ENGINE1?x=1");
  assert.equal(safeNext(null), "");
  assert.equal(safeNext(""), "");
  // Never somewhere else on the internet.
  assert.equal(safeNext("https://evil.example"), "");
  assert.equal(safeNext("//evil.example"), "", "protocol-relative is another site");
});

/* ------------------------------------------------------------- card state */

import {
  cardState,
  groupFinished,
  everyoneConfirmed,
  holesInPlayFor,
} from "../src/features/trip/scoring/cardState";
import { votingConcluded } from "../src/features/voting/votingStatus";

const ALL18 = holesInPlayFor(18);

test("a card moves through its states as holes go in", () => {
  assert.equal(cardState({ holesEntered: [], holesInPlay: ALL18, confirmed: false }), "not_started");
  assert.equal(cardState({ holesEntered: [1, 2, 3], holesInPlay: ALL18, confirmed: false }), "in_progress");
  assert.equal(cardState({ holesEntered: ALL18, holesInPlay: ALL18, confirmed: false }), "complete");
  assert.equal(cardState({ holesEntered: ALL18, holesInPlay: ALL18, confirmed: true }), "confirmed");
});

test("a duplicate hole cannot complete a card early", () => {
  // 17 distinct holes, one entered twice = 18 rows. The engine used to count
  // rows, which would have called this card complete.
  const holes = [...Array.from({ length: 17 }, (_, i) => i + 1), 17];
  assert.equal(holes.length, 18);
  assert.equal(cardState({ holesEntered: holes, holesInPlay: ALL18, confirmed: false }), "in_progress");
});

test("a back-nine round only needs holes 10 to 18", () => {
  const back = holesInPlayFor(9, "back");
  assert.deepEqual(back, [10, 11, 12, 13, 14, 15, 16, 17, 18]);
  assert.equal(cardState({ holesEntered: back, holesInPlay: back, confirmed: false }), "complete");
  assert.equal(
    cardState({ holesEntered: [1, 2, 3, 4, 5, 6, 7, 8, 9], holesInPlay: back, confirmed: false }),
    "not_started",
    "front-nine scores don't count toward a back-nine round"
  );
});

test("a group is finished when every card has every hole", () => {
  assert.equal(groupFinished(["complete", "confirmed"]), true);
  assert.equal(groupFinished(["complete", "in_progress"]), false);
  assert.equal(groupFinished([]), false, "an empty group is not finished");
});

test("everyone confirmed means confirmed, not merely complete", () => {
  assert.equal(everyoneConfirmed(["confirmed", "confirmed"]), true);
  assert.equal(everyoneConfirmed(["confirmed", "complete"]), false);
});

test("voting lasts exactly as long as an engine-managed round", () => {
  const first = "2026-12-11T12:00:00.000Z";
  const now = new Date("2026-12-11T20:00:00.000Z").getTime(); // 8 hours after the first score
  const live = { id: "r1", roundNumber: 1, startedAt: first, finishedAt: null, firstScoreAt: first, lastScoreAt: "2026-12-11T19:30:00.000Z" };
  // Eight hours in, still live - the round is still being played, so voting stays open.
  assert.equal(votingConcluded(live as never, [live as never], now), false);
  // The moment it's final, voting concludes.
  const closed = { ...live, finishedAt: "2026-12-11T20:00:00.000Z" };
  assert.equal(votingConcluded(closed as never, [closed as never], now), true);
});

test("older rounds the engine never managed still get the 7 hour safety net", () => {
  const first = "2026-09-10T14:00:00.000Z";
  const now = new Date("2026-09-10T22:00:00.000Z").getTime();
  const legacy = { id: "r1", roundNumber: 1, startedAt: first, finishedAt: null, firstScoreAt: first, lastScoreAt: null };
  assert.equal(votingConcluded(legacy as never, [legacy as never], now), true);
});

/* ------------------------------------------------------------------ awards */

import { computePlayerFacts, computeMatchFacts, median } from "../src/features/awards/detectors";
import { MOMENTS, variantFor, lineFor, fill } from "../src/features/awards/moments";
import { selectAwards } from "../src/features/awards/select";

const CARD18 = Array.from({ length: 18 }, (_, i) => ({ hole: i + 1, par: 4, si: i + 1 }));
const card = (scores: number[]) => Object.fromEntries(scores.map((s, i) => [i + 1, s]));
const facts = (id: string, name: string, scores: number[], hcp = 12, team: string | null = "A", field = 0) =>
  computePlayerFacts({ playerId: id, name, handicapIndex: hcp, team, holes: CARD18, scores: card(scores), strokes: {}, fieldMedianNetToPar: field })!;

test("detectors count snowmen, streaks and the worst hole from the card", () => {
  const f = facts("w", "Wade", [4, 4, 4, 4, 8, 9, 6, 6, 6, 4, 4, 4, 4, 4, 4, 4, 4, 4]);
  assert.equal(f.snowmen, 2);
  assert.equal(f.worstHole?.strokes, 9);
  assert.equal(f.parStreak, 9, "holes 10-18 all at par");
  assert.equal(f.doubleStreak, 5, "holes 5-9 all double or worse");
  assert.equal(f.frontNine, 51);
  assert.equal(f.backNine, 36);
});

test("a match records the comeback and when it was decided", () => {
  // B goes 3 up, then A wins the last five holes.
  const holes = [
    { hole: 1, winner: "B" as const }, { hole: 2, winner: "B" as const }, { hole: 3, winner: "B" as const },
    { hole: 4, winner: "A" as const }, { hole: 5, winner: "A" as const }, { hole: 6, winner: "A" as const },
    { hole: 7, winner: "T" as const }, { hole: 8, winner: "A" as const },
  ];
  const m = computeMatchFacts({ matchId: "m", aPlayers: ["a"], bPlayers: ["b"], holes, strokesA: 10, strokesB: 2 })!;
  assert.equal(m.winner, "A");
  assert.equal(m.comeback, 3, "climbed out of 3 down");
  assert.equal(m.underdog, "A", "A received more shots");
  assert.equal(m.strokesGiven, 8);
  assert.equal(m.decidedOn, 8, "took the lead for good on 8");
});

test("the most specific line wins: repeat, then finale, then standing, then band", () => {
  const santa = MOMENTS.find((m) => m.id === "santas_helper")!;
  const base = { tier: 1, standing: "tied" as const, band: "mid" as const, stage: "middle" as const };
  assert.equal(variantFor(santa, base), "default");
  assert.equal(variantFor(santa, { ...base, band: "low" }), "low");
  assert.equal(variantFor(santa, { ...base, stage: "finale" }), "finale");
  assert.equal(variantFor(santa, { ...base, tier: 2, stage: "finale" }), "tier2", "a repeat outranks the finale");
  assert.equal(variantFor(santa, { ...base, tier: 3 }), "tier3");
});

test("lines are filled only from the facts", () => {
  assert.equal(fill("{name} made {count}", { name: "Wade", count: 2 }), "Wade made 2");
  assert.equal(fill("{name} {missing}", { name: "Wade" }).trim(), "Wade", "no invented values");
});

test("the same round always gets the same line, so it never changes on refresh", () => {
  const santa = MOMENTS.find((m) => m.id === "santas_helper")!;
  const ctx = { tier: 1, standing: "tied" as const, band: "mid" as const, stage: "middle" as const };
  const a = lineFor(santa, ctx, { name: "Wade", count: 2 }, "r1:santas_helper");
  const b = lineFor(santa, ctx, { name: "Wade", count: 2 }, "r1:santas_helper");
  assert.equal(a, b);
});

test("a round produces between 3 and 7 awards, at most two per person", () => {
  const players = [
    facts("w", "Wade", [4, 4, 4, 4, 8, 9, 6, 6, 6, 7, 7, 7, 4, 4, 4, 4, 4, 4], 10, "A"),
    facts("t", "TJ", [4, 3, 3, 4, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4], 13, "B"),
    facts("k", "Kody", [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5], 16, "A"),
  ];
  const fieldMed = median(players.map((p) => p.netToPar));
  const withField = players.map((p) => ({ ...p, vsField: fieldMed - p.netToPar }));
  const { awards, voteable } = selectAwards({
    roundId: "r1", players: withField, matches: [], previousNetToPar: {}, history: [],
    standingOf: () => "tied", stage: "middle",
  });
  assert.ok(awards.length >= 3 && awards.length <= 7, `got ${awards.length}`);
  const count = new Map<string, number>();
  for (const a of awards) for (const id of a.playerIds) count.set(id, (count.get(id) ?? 0) + 1);
  assert.ok([...count.values()].every((n) => n <= 2), "nobody takes more than two");
  assert.equal(new Set(awards.map((a) => a.momentId)).size, awards.length, "one award per moment");
  assert.equal(voteable.length, 2, "shot of the day and worst decision go to a vote");
  assert.ok(awards.every((a) => a.line.length > 0 && !a.line.includes("{")), "every line fully filled");
});

test("winning the same award again needs a worse performance", () => {
  // Two snowmen and nothing else remarkable - no long par run, no birdies -
  // so the snowmen are Wade's standout moment and the per-person cap of two
  // doesn't squeeze them out.
  const p = facts("w", "Wade", [4, 4, 5, 4, 4, 5, 4, 8, 8, 4, 4, 5, 4, 4, 5, 4, 4, 5], 10, "A", 10);
  const run = (history: { momentId: string; playerId: string }[]) =>
    selectAwards({ roundId: "r2", players: [p], matches: [], previousNetToPar: {}, history, standingOf: () => "tied", stage: "middle" })
      .awards.find((a) => a.momentId === "santas_helper");
  const first = run([]);
  const repeat = run([{ momentId: "santas_helper", playerId: "w" }]);
  assert.ok(first && repeat);
  assert.ok(repeat!.score < first!.score, "a repeat is discounted");
  assert.equal(repeat!.tier, 2);
  assert.equal(repeat!.variant, "tier2", "and gets the repeat line");
});

test("every award line only uses values its moment actually provides", () => {
  const provides: Record<string, string[]> = {
    medalist: ["name", "net"], wooden_spoon: ["name", "net"], santas_helper: ["name", "count"],
    big_number: ["name", "strokes", "hole"], the_vanisher: ["name", "front", "back"],
    par_train: ["name", "streak"], bogey_express: ["name", "streak"], bird_watcher: ["name", "count", "eagles"],
    free_square: ["name", "count"], sandbagger: ["name", "vs"], no_show: ["name", "vs"],
    mip: ["name", "gain", "before", "after"], cinderella: ["name", "opponent", "shots", "margin"],
    escape_artist: ["name", "opponent", "shots", "margin"], the_comeback: ["name", "opponent", "down"],
    the_closer: ["name", "opponent", "hole"], shot_of_the_day: ["name"], worst_decision: ["name"],
  };
  for (const m of MOMENTS) {
    assert.ok(provides[m.id], `${m.id} is listed`);
    assert.ok((m.lines.default?.length ?? 0) > 0, `${m.id} has a default line`);
    for (const lines of Object.values(m.lines)) for (const line of lines ?? []) {
      for (const [, key] of line.matchAll(/\{(\w+)\}/g)) assert.ok(provides[m.id].includes(key), `${m.id}: {${key}} in "${line}"`);
      assert.ok(!line.includes("—"), `${m.id}: plain hyphens only`);
    }
  }
});

/* ------------------------------------------------------- awards, end to end */

import { buildRoundAwards, standingFor } from "../src/features/awards/build";
import { checkLine, mergeCopy, parseCopyReply } from "../src/features/awards/copy";

const SI18 = Array.from({ length: 18 }, (_, i) => ({ hole: i + 1, par: 4, si: i + 1 }));
const hs = (playerId: string, strokes: number[]) =>
  strokes.map((s, i) => ({ roundId: "r1", playerId, hole: i + 1, strokes: s }));

test("a closed round turns hole scores into filled awards, with match stories", () => {
  // Wade (2) gives Kody (20) a pile of shots, goes 3 up, and loses. Hank
  // builds snowmen in the other group.
  const players = [
    { id: "w", name: "Wade", handicapIndex: 2, team: "A" },
    { id: "k", name: "Kody", handicapIndex: 20, team: "B" },
    { id: "h", name: "Hank", handicapIndex: 12, team: "A" },
    { id: "t", name: "TJ", handicapIndex: 13, team: "B" },
  ];
  const built = buildRoundAwards({
    roundId: "r1",
    holes: SI18,
    holesCount: 18,
    nine: null,
    tee: { rating: 72, slope: 113, par: 72 },
    format: "match_play",
    groups: [
      { playerIds: ["w", "k"], allowancePct: 100 },
      { playerIds: ["h", "t"], allowancePct: 100 },
    ],
    players,
    holeScores: [
      ...hs("w", [3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]),
      ...hs("k", [6, 6, 6, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]),
      ...hs("h", [8, 9, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]),
      ...hs("t", [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]),
    ],
    matches: [{ id: "m1", aPlayers: ["w"], bPlayers: ["k"] }],
    previousNetToPar: {},
    history: [],
    points: { a: 0, b: 1 },
    stage: "opener",
  });

  assert.equal(built.facts.length, 4, "everyone with a card gets facts");
  const m = built.matchFacts[0];
  assert.equal(m.underdog, "B", "Kody received the shots");
  assert.equal(m.winner, "B", "and won");
  assert.ok(m.comeback >= 3, "from 3 down");
  assert.ok(built.awards.length >= 3 && built.awards.length <= 7);
  assert.ok(built.awards.some((a) => a.momentId === "santas_helper" && a.playerIds[0] === "h"), "Hank's snowmen");
  assert.ok(built.awards.every((a) => !a.line.includes("{")), "every line filled");
  const hank = built.awards.filter((a) => a.playerIds.includes("h")).map((a) => a.momentId);
  assert.ok(!(hank.includes("wooden_spoon") && hank.includes("no_show")), "one 'worst in the field' story per person");
});

test("standing reads from the player's own team, and only the last round is decided", () => {
  assert.equal(standingFor("A", { a: 5, b: 3 }, "middle"), "leading");
  assert.equal(standingFor("B", { a: 5, b: 3 }, "middle"), "trailing");
  assert.equal(standingFor("A", { a: 4, b: 4 }, "finale"), "tied");
  assert.equal(standingFor("B", { a: 5, b: 3 }, "finale"), "decided");
  assert.equal(standingFor(null, { a: 5, b: 3 }, "middle"), "tied", "no team, no side");
});

const AWARD = {
  momentId: "santas_helper", title: "Santa's Helper", playerIds: ["h"], names: ["Hank"],
  line: "3 snowmen from Hank. It's not even cold out.", stat: "3 holes of 8 or worse",
  variant: "default" as const, tier: 1, score: 80,
};

test("an AI line has to name the winner and can't invent a number", () => {
  assert.equal(checkLine("Hank built 3 snowmen. Olaf is suing.", AWARD), "Hank built 3 snowmen. Olaf is suing.");
  assert.equal(checkLine("Built 3 snowmen. Olaf is suing.", AWARD), null, "winner missing");
  assert.equal(checkLine("Hank built 4 snowmen. Olaf is suing.", AWARD), null, "4 is not in the facts");
  assert.equal(checkLine("Hank built {count} snowmen today.", AWARD), null, "unfilled");
  assert.equal(checkLine("Hank — 3 snowmen, zero shame.", AWARD), "Hank - 3 snowmen, zero shame.", "em dash becomes a hyphen");
  assert.equal(checkLine("Hank " + "very ".repeat(60), AWARD), null, "too long");
});

test("a bad or missing AI reply falls back to the hand-written line", () => {
  assert.deepEqual(parseCopyReply("not json at all"), []);
  const reply = parseCopyReply('```json\n{"awards":[{"id":"santas_helper","line":"Hank: 7 snowmen."}]}\n```');
  assert.equal(reply.length, 1);
  const [m] = mergeCopy([AWARD], reply);
  assert.equal(m.byAi, false, "7 was invented");
  assert.equal(m.line, AWARD.line);
  const [ok] = mergeCopy([AWARD], [{ id: "santas_helper", line: "Hank and his 3 snowmen. Book the sleigh." }]);
  assert.equal(ok.byAi, true);
});
