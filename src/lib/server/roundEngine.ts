// The round engine: moves a tournament through its day on its own.
//
// During the 2026 trip every one of these steps was done by hand, in SQL, and
// each one that was missed looked like the app being broken:
//   - a round nobody started
//   - matches that never resolved, so points never posted
//   - 180 holes of scores that counted for nothing because nobody signed
//   - "next round" still pointing at a round that had finished
//
// Now the cron calls runLifecycle every ten minutes and the app does them
// itself. The organizer is TOLD, never asked, unless something is genuinely
// missing - teams, matchups, a course - and then they are told exactly what.

import type { SupabaseClient } from "@supabase/supabase-js";
import { loadRoundSetups, type RoundSetup } from "@/lib/supabase/roundSegments";
import { loadCourseHoles, loadCourseTees } from "@/lib/supabase/courseHoles";
import { liveMatchStates, liveRowsForRound, type HoleScoreLite } from "@/features/trip/scoring/liveStandings";
import {
  CLOSE_REMINDER_MINUTES,
  OPEN_LEAD_MINUTES,
  TEE_WARNING_MINUTES,
  localDate,
  localHour,
  minutesUntil,
  roundClosesAt,
  teeOffAt,
} from "@/features/trip/scoring/roundClock";
import { activeMemberIds, onceForRound, organizerIds, sendPushToUsers } from "@/lib/server/push";

type Trip = {
  id: string;
  name: string;
  join_code: string;
  time_zone: string;
  scoring_mode: string | null;
};

type RoundRow = {
  id: string;
  trip_id: string;
  round_date: string | null;
  last_score_at: string | null;
};

type PlayerRow = {
  id: string;
  display_name: string;
  handicap_index: number | null;
  account_id: string | null;
  team_id: string | null;
};

type MatchRow = {
  id: string;
  manual_result: string | null;
  match_players: { player_id: string; side: string }[];
};

/** Formats scored as a head-to-head match, so they need matchups drawn. */
const MATCH_FORMATS = new Set(["best_ball", "match_play", "scramble", "alternate_shot", "shamble"]);

const tripUrl = (t: Trip) => `/t/${t.join_code}`;

function accountsFor(players: PlayerRow[], ids: string[]): string[] {
  return players
    .filter((p) => ids.includes(p.id))
    .map((p) => p.account_id)
    .filter((x): x is string => Boolean(x));
}

// ---------------------------------------------------------------- readiness

/**
 * What stops a round opening. Readiness is PER ROUND: Saturday's matchups do
 * not need to exist while Thursday is being played.
 */
export async function readinessProblems(
  admin: SupabaseClient,
  setup: RoundSetup,
  players: PlayerRow[]
): Promise<string[]> {
  const problems: string[] = [];

  if (!setup.courseId) {
    problems.push("no course");
  } else {
    const holes = await loadCourseHoles(admin, setup.courseId);
    const indexes = new Set(holes.map((h) => h.si));
    if (holes.length < 18 || indexes.size < 18) problems.push("course hole data is incomplete");
  }

  const seated = setup.teeTimes.flatMap((t) => t.playerIds);
  if (setup.teeTimes.length === 0 || seated.length === 0) problems.push("no tee times with players");

  const noHandicap = players.filter((p) => seated.includes(p.id) && p.handicap_index == null);
  if (noHandicap.length > 0) {
    problems.push(
      `${noHandicap.length} player${noHandicap.length === 1 ? "" : "s"} missing a handicap`
    );
  }

  if (MATCH_FORMATS.has(setup.format)) {
    const { data } = await admin
      .from("matches")
      .select("id,match_players(player_id)")
      .eq("round_id", setup.id);
    const matches = (data ?? []) as { id: string; match_players: { player_id: string }[] }[];
    if (matches.length === 0) problems.push("matchups not drawn");
    else if (matches.some((m) => (m.match_players ?? []).length < 2)) problems.push("a matchup is missing players");
  }

  return problems;
}

// ---------------------------------------------------------------- closing

/**
 * Resolve every unresolved match from the hole scores.
 *
 * The app only ever resolved a match if it came through the draw tool, which
 * wrote the result as scores landed. Matches made any other way sat at "no
 * result" forever and their points silently never posted. This computes the
 * result from the actual holes, using the same tested maths as the live view.
 */
async function resolveMatches(
  admin: SupabaseClient,
  setup: RoundSetup,
  players: PlayerRow[],
  holeScores: HoleScoreLite[]
): Promise<void> {
  if (!setup.courseId) return;
  const { data } = await admin
    .from("matches")
    .select("id,manual_result,match_players(player_id,side)")
    .eq("round_id", setup.id);
  const open = ((data ?? []) as MatchRow[]).filter((m) => !m.manual_result);
  if (open.length === 0) return;

  const [holes, tees] = await Promise.all([
    loadCourseHoles(admin, setup.courseId),
    loadCourseTees(admin, setup.courseId),
  ]);
  const tee = tees.find((t) => t.id === setup.teeId) ?? tees[0] ?? null;
  const coursePar = holes.reduce((sum, h) => sum + h.par, 0) || 72;

  const states = liveMatchStates(
    {
      roundId: setup.id,
      groups: setup.teeTimes.map((tt) => ({
        playerIds: tt.playerIds,
        allowancePct: setup.segments.find((s) => s.teeTimeId === tt.id)?.allowancePct ?? 100,
      })),
      holes,
      holesCount: (setup.holesCount === 9 ? 9 : 18) as 9 | 18,
      nine: setup.nine,
      tee: { rating: tee?.rating ?? null, slope: tee?.slope ?? null, par: coursePar },
      players: players.map((p) => ({ id: p.id, name: p.display_name, handicapIndex: p.handicap_index ?? 0 })),
      holeScores,
      format: setup.format,
    },
    open.map((m) => ({
      id: m.id,
      aPlayers: m.match_players.filter((x) => x.side === "A").map((x) => x.player_id),
      bPlayers: m.match_players.filter((x) => x.side === "B").map((x) => x.player_id),
    }))
  );

  for (const st of states) {
    if (st.thru === 0) continue; // nobody played it - leave it for a human
    const result = st.standing > 0 ? "A" : st.standing < 0 ? "B" : "T";
    await admin.from("matches").update({ manual_result: result }).eq("id", st.matchId);
  }
}

/**
 * Publish each finished card's total.
 *
 * Standings and net-score points read published totals, and a total used to
 * be written ONLY when a player signed in the app. So 180 holes sat in the
 * database counting for nothing. Every complete card now gets its total
 * written here, whether or not anyone signed.
 */
async function publishTotals(
  admin: SupabaseClient,
  setup: RoundSetup,
  holeScores: HoleScoreLite[]
): Promise<string[]> {
  const holesNeeded = setup.holesCount === 9 ? 9 : 18;
  const { data: existing } = await admin
    .from("score_entries")
    .select("player_id,gross_score")
    .eq("round_id", setup.id);
  const published = new Set(
    ((existing ?? []) as { player_id: string; gross_score: number | null }[])
      .filter((e) => e.gross_score != null)
      .map((e) => e.player_id)
  );

  const incomplete: string[] = [];
  const byPlayer = new Map<string, HoleScoreLite[]>();
  for (const s of holeScores) {
    const list = byPlayer.get(s.playerId) ?? [];
    list.push(s);
    byPlayer.set(s.playerId, list);
  }

  for (const playerId of setup.teeTimes.flatMap((t) => t.playerIds)) {
    const card = byPlayer.get(playerId) ?? [];
    if (card.length < holesNeeded) {
      if (card.length > 0) incomplete.push(playerId);
      continue;
    }
    if (published.has(playerId)) continue;
    const gross = card.reduce((sum, s) => sum + s.strokes, 0);
    const front = holesNeeded === 9
      ? gross
      : card.filter((s) => s.hole <= 9).reduce((sum, s) => sum + s.strokes, 0);
    await admin.from("score_entries").upsert(
      {
        round_id: setup.id,
        player_id: playerId,
        gross_score: gross,
        front_nine_score: front,
        entered_by: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "round_id,player_id" }
    );
  }
  return incomplete;
}


/**
 * The trip's final score, worked out once when the last round closes and then
 * stored. Two sources, because the 2026 trip had both:
 *   - match points, from every resolved match
 *   - net score rounds, where the best N net scores in the FIELD each take a
 *     point for their team rather than winning a match
 * Recomputing later from matches alone would have said 4-6 when the real
 * answer was 6-9, which is why this is recorded rather than re-derived.
 */
async function computeTripResult(
  admin: SupabaseClient,
  trip: Trip,
  setups: RoundSetup[],
  players: PlayerRow[]
): Promise<{ a: number; b: number }> {
  const { data: teamRows } = await admin.from("teams").select("id,code").eq("trip_id", trip.id);
  const codeOfTeam = new Map(
    ((teamRows ?? []) as { id: string; code: string }[]).map((t) => [t.id, t.code])
  );
  const teamOf = (playerId: string) => {
    const p = players.find((x) => x.id === playerId);
    return p?.team_id ? codeOfTeam.get(p.team_id) ?? null : null;
  };

  let a = 0;
  let b = 0;

  // ---- match points -------------------------------------------------------
  const roundIds = setups.map((r) => r.id);
  if (roundIds.length > 0) {
    const { data: mRows } = await admin
      .from("matches")
      .select("points,manual_result")
      .in("round_id", roundIds);
    for (const m of (mRows ?? []) as { points: number | null; manual_result: string | null }[]) {
      const pts = Number(m.points ?? 0);
      if (m.manual_result === "A") a += pts;
      else if (m.manual_result === "B") b += pts;
      else if (m.manual_result === "T") {
        a += pts / 2;
        b += pts / 2;
      }
    }
  }

  // ---- net score rounds ---------------------------------------------------
  const { data: settings } = await admin
    .from("scoring_settings")
    .select("net_score_points_override")
    .eq("trip_id", trip.id)
    .maybeSingle();
  const override = (settings as { net_score_points_override?: number | null } | null)
    ?.net_score_points_override;

  for (const setup of setups.filter((r) => r.format === "net_score" && r.courseId)) {
    const [holes, tees, hsRes] = await Promise.all([
      loadCourseHoles(admin, setup.courseId!),
      loadCourseTees(admin, setup.courseId!),
      admin.from("hole_scores").select("round_id,player_id,hole_number,strokes").eq("round_id", setup.id),
    ]);
    const holeScores: HoleScoreLite[] = ((hsRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
      roundId: r.round_id as string,
      playerId: r.player_id as string,
      hole: r.hole_number as number,
      strokes: r.strokes as number,
    }));
    if (holeScores.length === 0) continue;
    const tee = tees.find((t) => t.id === setup.teeId) ?? tees[0] ?? null;
    const coursePar = holes.reduce((sum, h) => sum + h.par, 0) || 72;

    // basis "full" comes from the net_score format: a field-wide competition
    // measures everyone off their own whole course handicap.
    const rows = liveRowsForRound({
      roundId: setup.id,
      groups: setup.teeTimes.map((tt) => ({
        playerIds: tt.playerIds,
        allowancePct: setup.segments.find((sg) => sg.teeTimeId === tt.id)?.allowancePct ?? 100,
      })),
      holes,
      holesCount: (setup.holesCount === 9 ? 9 : 18) as 9 | 18,
      nine: setup.nine,
      tee: { rating: tee?.rating ?? null, slope: tee?.slope ?? null, par: coursePar },
      players: players.map((p) => ({ id: p.id, name: p.display_name, handicapIndex: p.handicap_index ?? 0 })),
      holeScores,
      format: setup.format,
    }).filter((r) => r.complete);

    const count = override && override > 0 ? override : Math.floor(rows.length / 2);
    for (const r of rows.slice(0, count)) {
      const code = teamOf(r.playerId);
      if (code === "A") a += 1;
      else if (code === "B") b += 1;
    }
  }

  return { a, b };
}

/**
 * Close a round. Idempotent: the reminder log makes sure it only ever runs
 * once per round, however many cron ticks see it as due.
 */
export async function finalizeRound(
  admin: SupabaseClient,
  trip: Trip,
  setup: RoundSetup,
  players: PlayerRow[],
  allRounds: RoundSetup[]
): Promise<number> {
  if (!(await onceForRound(admin, setup.id, "finalized"))) return 0;

  const { data: hs } = await admin
    .from("hole_scores")
    .select("round_id,player_id,hole_number,strokes")
    .eq("round_id", setup.id);
  const holeScores: HoleScoreLite[] = ((hs ?? []) as Record<string, unknown>[]).map((r) => ({
    roundId: r.round_id as string,
    playerId: r.player_id as string,
    hole: r.hole_number as number,
    strokes: r.strokes as number,
  }));

  // Order matters: totals and results go in BEFORE the round is marked
  // finished and cards are confirmed, so nothing trips over its own lock.
  let incomplete: string[] = [];
  if (trip.scoring_mode === "hole_by_hole") {
    await resolveMatches(admin, setup, players, holeScores);
    incomplete = await publishTotals(admin, setup, holeScores);
  }

  // Anyone who never confirmed is confirmed now. Their votes are not counted,
  // but their card no longer holds up the tournament.
  const seated = setup.teeTimes.flatMap((t) => t.playerIds);
  if (seated.length > 0) {
    await admin.from("round_confirmations").upsert(
      seated.map((player_id) => ({ round_id: setup.id, player_id, confirmed_by: null })),
      { onConflict: "round_id,player_id", ignoreDuplicates: true }
    );
  }

  await admin.from("rounds").update({ finished_at: new Date().toISOString() }).eq("id", setup.id);

  // Point the tournament at whatever is next, so home never shows a round
  // that has already been played.
  const next = allRounds
    .filter((r) => r.id !== setup.id && !r.finishedAt)
    .sort((a, b) => a.roundNumber - b.roundNumber)[0];
  await admin.from("trips").update({ current_round_id: next?.id ?? null }).eq("id", trip.id);

  // Last round of the trip: record how it finished, once, so the series has a
  // champion that never has to be worked out again.
  if (!next) {
    try {
      const { a, b } = await computeTripResult(admin, trip, allRounds, players);
      await admin
        .from("trips")
        .update({
          final_points_a: a,
          final_points_b: b,
          winner_team: a > b ? "A" : b > a ? "B" : null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", trip.id);
    } catch {
      // Never let the trip summary stop the round closing.
    }
  }

  let sent = 0;
  const members = await activeMemberIds(admin, trip.id);
  sent += await sendPushToUsers(admin, {
    userIds: members,
    title: trip.name,
    message: next
      ? `${setup.title} is final. Standings are updated - next up, ${next.title}.`
      : `${setup.title} is final, and that's the trip. See who won.`,
    category: "round_day",
    kind: "round_final",
    tripId: trip.id,
    url: tripUrl(trip),
  });

  const orgs = await organizerIds(admin, trip.id);
  const missing = players.filter((p) => incomplete.includes(p.id)).map((p) => p.display_name);
  sent += await sendPushToUsers(admin, {
    userIds: orgs,
    title: `${setup.title} closed`,
    message: missing.length
      ? `All cards in, but ${missing.slice(0, 3).join(", ")} ${missing.length === 1 ? "has" : "have"} an incomplete card - fix it from Tee It Up.`
      : "All cards are in and points have posted.",
    category: "organizer",
    kind: "round_closed",
    tripId: trip.id,
    url: tripUrl(trip),
  });
  return sent;
}

// ---------------------------------------------------------------- lifecycle

/**
 * One pass over every tournament with a round in play. Safe to run as often
 * as you like: every notification and state change is guarded so it happens
 * exactly once.
 */
export async function runLifecycle(admin: SupabaseClient, now = new Date()): Promise<number> {
  let sent = 0;

  const { data: roundRows } = await admin
    .from("rounds")
    .select("id,trip_id,round_date,last_score_at")
    .is("finished_at", null)
    .not("round_date", "is", null);
  const rounds = (roundRows ?? []) as RoundRow[];
  const tripIds = [...new Set(rounds.map((r) => r.trip_id))];
  if (tripIds.length === 0) return 0;

  const { data: tripRows } = await admin
    .from("trips")
    .select("id,name,join_code,time_zone,scoring_mode")
    .in("id", tripIds);

  for (const trip of (tripRows ?? []) as Trip[]) {
    const tz = trip.time_zone || "America/New_York";
    const setups = await loadRoundSetups(admin, trip.id);
    const { data: pRows } = await admin
      .from("players")
      .select("id,display_name,handicap_index,account_id,team_id")
      .eq("trip_id", trip.id);
    const players = (pRows ?? []) as PlayerRow[];
    const members = await activeMemberIds(admin, trip.id);
    const orgs = await organizerIds(admin, trip.id);

    for (const row of rounds.filter((r) => r.trip_id === trip.id)) {
      const setup = setups.find((s) => s.id === row.id);
      if (!setup || setup.finishedAt) continue;

      const teeInstants = setup.teeTimes
        .map((tt) => ({ tt, at: teeOffAt(row.round_date, tt.time, tz) }))
        .filter((x): x is { tt: typeof x.tt; at: Date } => x.at !== null)
        .sort((a, b) => a.at.getTime() - b.at.getTime());
      const first = teeInstants[0]?.at ?? null;
      const toFirst = first ? minutesUntil(first, now) : null;

      // ---- Before the round -------------------------------------------------
      if (!setup.startedAt && toFirst !== null) {
        // Readiness, 12 hours out and again at 3. Tells the organizer exactly
        // what is missing - this is what would have caught Thursday's missing
        // matchups the night before instead of at 10am.
        for (const [kind, window] of [["ready_12h", 720], ["ready_3h", 180]] as const) {
          if (toFirst <= window && toFirst > window - 60) {
            const problems = await readinessProblems(admin, setup, players);
            if (problems.length && (await onceForRound(admin, setup.id, kind))) {
              sent += await sendPushToUsers(admin, {
                userIds: orgs,
                title: `${setup.title} isn't ready`,
                message: `Still needed: ${problems.join(", ")}.`,
                category: "organizer",
                kind: "round_not_ready",
                tripId: trip.id,
                url: `/manage/${trip.join_code}`,
              });
            }
          }
        }

        // The evening before: everyone gets their tee time.
        const dayBefore = new Date(first!.getTime() - 24 * 3600000);
        if (
          localDate(now, tz) === localDate(dayBefore, tz) &&
          localHour(now, tz) >= 18 && localHour(now, tz) < 21 &&
          (await onceForRound(admin, setup.id, "night_before"))
        ) {
          sent += await sendPushToUsers(admin, {
            userIds: members,
            title: trip.name,
            message: `${setup.title} tomorrow - first group off at ${teeInstants[0].tt.time}. Your group and strokes are in the app.`,
            category: "round_day",
            kind: "night_before",
            tripId: trip.id,
            url: tripUrl(trip),
          });
        }

        // Scoring opens on its own, 30 minutes before the first tee.
        if (toFirst <= OPEN_LEAD_MINUTES && toFirst > -240) {
          const problems = await readinessProblems(admin, setup, players);
          if (problems.length === 0) {
            if (await onceForRound(admin, setup.id, "auto_open")) {
              await admin.from("rounds").update({ started_at: now.toISOString() }).eq("id", setup.id);
              await admin.from("trips").update({ current_round_id: setup.id }).eq("id", trip.id);
              setup.startedAt = now.toISOString();
              sent += await sendPushToUsers(admin, {
                userIds: orgs,
                title: `${setup.title} is live`,
                message: "Scoring opened automatically for every group.",
                category: "organizer",
                kind: "round_open",
                tripId: trip.id,
                url: tripUrl(trip),
              });
            }
          } else if (await onceForRound(admin, setup.id, "auto_open_held")) {
            // Don't silently do nothing - say why, and what fixes it.
            sent += await sendPushToUsers(admin, {
              userIds: orgs,
              title: `${setup.title} couldn't open`,
              message: `Scoring is on hold until this is fixed: ${problems.join(", ")}.`,
              category: "organizer",
              kind: "round_open",
              tripId: trip.id,
              url: `/manage/${trip.join_code}`,
            });
          }
        }
      }

      if (!setup.startedAt) continue;

      // ---- During the round -------------------------------------------------
      // Each group gets its own warning, 30 minutes before its own tee time.
      for (const { tt, at } of teeInstants) {
        const toTee = minutesUntil(at, now);
        if (toTee <= TEE_WARNING_MINUTES && toTee > -15 && (await onceForRound(admin, setup.id, `tee_warning:${tt.id}`))) {
          sent += await sendPushToUsers(admin, {
            userIds: accountsFor(players, tt.playerIds),
            title: `${setup.title} - you're up at ${tt.time}`,
            message: "30 minutes to your tee time. Scoring is open.",
            category: "essential",
            kind: "tee_warning",
            tripId: trip.id,
            url: tripUrl(trip),
          });
        }
      }

      if (trip.scoring_mode !== "hole_by_hole") continue;

      const holesNeeded = setup.holesCount === 9 ? 9 : 18;
      const { data: hs } = await admin
        .from("hole_scores")
        .select("player_id,hole_number")
        .eq("round_id", setup.id);
      const counts = new Map<string, number>();
      for (const r of (hs ?? []) as { player_id: string }[]) counts.set(r.player_id, (counts.get(r.player_id) ?? 0) + 1);

      const { data: cRows } = await admin
        .from("round_confirmations")
        .select("player_id")
        .eq("round_id", setup.id);
      const confirmed = new Set(((cRows ?? []) as { player_id: string }[]).map((c) => c.player_id));

      // A group's last score is in: tell them to confirm and vote. This is
      // the hook into the awards, not a certification chore.
      for (const tt of setup.teeTimes) {
        const done = tt.playerIds.length > 0 && tt.playerIds.every((id) => (counts.get(id) ?? 0) >= holesNeeded);
        if (done && (await onceForRound(admin, setup.id, `group_done:${tt.id}`))) {
          sent += await sendPushToUsers(admin, {
            userIds: accountsFor(players, tt.playerIds.filter((id) => !confirmed.has(id))),
            title: "Your round is in",
            message: "Come see how bad it was. Confirm your card and vote for the awards.",
            category: "my_card",
            kind: "group_done",
            tripId: trip.id,
            url: tripUrl(trip),
          });
        }
      }

      // Everyone confirmed - no reason to wait for the timer.
      const seated = setup.teeTimes.flatMap((t) => t.playerIds);
      const allConfirmed = seated.length > 0 && seated.every((id) => confirmed.has(id));

      const closesAt = roundClosesAt(row.last_score_at, row.round_date, tz);
      if (!allConfirmed && closesAt) {
        const toClose = minutesUntil(closesAt, now);
        if (toClose <= CLOSE_REMINDER_MINUTES && toClose > 0 && (await onceForRound(admin, setup.id, "close_reminder"))) {
          sent += await sendPushToUsers(admin, {
            userIds: accountsFor(players, seated.filter((id) => !confirmed.has(id))),
            title: `${setup.title} closes in 30 minutes`,
            message: "Vote for the awards and confirm your round before it closes.",
            category: "my_card",
            kind: "close_reminder",
            tripId: trip.id,
            url: tripUrl(trip),
          });
        }
      }

      if (allConfirmed || (closesAt && minutesUntil(closesAt, now) <= 0)) {
        sent += await finalizeRound(admin, trip, setup, players, setups);
      }
    }
  }

  return sent;
}

/**
 * Close one round on demand - the organizer's "Finish round" button. Runs the
 * exact same path as the automatic close, so a manual finish can never skip
 * the match results or totals the way it used to.
 */
export async function finalizeRoundById(
  admin: SupabaseClient,
  roundId: string
): Promise<{ ok: boolean; error?: string }> {
  const { data: r } = await admin.from("rounds").select("trip_id,finished_at").eq("id", roundId).maybeSingle();
  const row = r as { trip_id: string; finished_at: string | null } | null;
  if (!row) return { ok: false, error: "Round not found." };
  if (row.finished_at) return { ok: true };

  const { data: t } = await admin
    .from("trips")
    .select("id,name,join_code,time_zone,scoring_mode")
    .eq("id", row.trip_id)
    .maybeSingle();
  if (!t) return { ok: false, error: "Tournament not found." };

  const setups = await loadRoundSetups(admin, row.trip_id);
  const setup = setups.find((s) => s.id === roundId);
  if (!setup) return { ok: false, error: "Round not found." };

  const { data: pRows } = await admin
    .from("players")
    .select("id,display_name,handicap_index,account_id,team_id")
    .eq("trip_id", row.trip_id);

  await finalizeRound(admin, t as Trip, setup, (pRows ?? []) as PlayerRow[], setups);
  return { ok: true };
}
