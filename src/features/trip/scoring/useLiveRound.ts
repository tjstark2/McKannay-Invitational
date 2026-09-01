"use client";

// Live standings for the round currently being played, for any screen that
// wants them.
//
// Before this, Pecking Order, The Nest and Matches all read `score_entries`,
// which on a hole-by-hole trip stays empty until a card is signed - so during
// a round those screens showed nothing at all while the table inside Tee It Up
// updated hole by hole. This loads the hole scores directly and hands back the
// same rows, refreshing on the trip's realtime channel.
//
// On a basic 9/18 trip there is nothing live to show: a round is a single
// submitted number, so `live` comes back empty and screens fall back to their
// existing behaviour.

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { loadRoundSetups, type RoundSetup } from "@/lib/supabase/roundSegments";
import { loadCourseHoles } from "@/lib/supabase/courseHoles";
import { loadCourseTees } from "@/lib/supabase/courseHoles";
import {
  liveRowsForRound,
  liveMatchStates,
  type HoleScoreLite,
  type LiveMatchState,
  type LiveRow,
} from "@/features/trip/scoring/liveStandings";
import { useTripState } from "@/features/trip/state/TripStateContext";

export type LiveRound = {
  round: RoundSetup | null;
  rows: LiveRow[];
  /** Where each match stands right now. No winner - see liveMatchStates. */
  matchStates: LiveMatchState[];
  /** How many holes the round has, for "thru N of 18". */
  holeCount: number;
  loading: boolean;
};

export function useLiveRound(): LiveRound {
  const { trip, players, matches } = useTripState();
  const [state, setState] = useState<LiveRound>({
    round: null,
    rows: [],
    matchStates: [],
    holeCount: 18,
    loading: true,
  });

  const load = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    // Only hole-by-hole trips have a "during".
    if (trip.scoringMode !== "hole_by_hole") {
      setState({ round: null, rows: [], matchStates: [], holeCount: 18, loading: false });
      return;
    }

    try {
      const setups = await loadRoundSetups(supabase, trip.id);
      // The round being played: started and not finished. Falls back to the
      // most recently started one so a finished round still shows its result.
      const live =
        setups.find((r) => r.startedAt && !r.finishedAt) ??
        [...setups].reverse().find((r) => r.startedAt) ??
        null;
      if (!live || !live.courseId) {
        setState({ round: null, rows: [], matchStates: [], holeCount: 18, loading: false });
        return;
      }

      const [holes, tees, scoreRes] = await Promise.all([
        loadCourseHoles(supabase, live.courseId),
        loadCourseTees(supabase, live.courseId),
        supabase
          .from("hole_scores")
          .select("round_id,player_id,hole_number,strokes")
          .eq("round_id", live.id),
      ]);

      const holeScores: HoleScoreLite[] = (
        (scoreRes.data ?? []) as Record<string, unknown>[]
      ).map((r) => ({
        roundId: r.round_id as string,
        playerId: r.player_id as string,
        hole: r.hole_number as number,
        strokes: r.strokes as number,
      }));

      const tee = tees.find((t) => t.id === live.teeId) ?? tees[0] ?? null;
      const coursePar = holes.reduce((sum, h) => sum + h.par, 0) || 72;
      const holesCount = (live.holesCount === 9 ? 9 : 18) as 9 | 18;

      const liveInput = {
        roundId: live.id,
        groups: live.teeTimes.map((tt) => ({
          playerIds: tt.playerIds,
          allowancePct:
            live.segments.find((s) => s.teeTimeId === tt.id)?.allowancePct ?? 100,
        })),
        holes,
        holesCount,
        nine: live.nine,
        tee: { rating: tee?.rating ?? null, slope: tee?.slope ?? null, par: coursePar },
        players: players.map((p) => ({
          id: p.id,
          name: p.name,
          handicapIndex: p.handicapIndex,
        })),
        holeScores,
      };
      const rows = liveRowsForRound(liveInput);
      const matchStates = liveMatchStates(
        liveInput,
        matches
          .filter((m) => m.roundId === live.id)
          .map((m) => ({ id: m.id, aPlayers: m.aPlayers, bPlayers: m.bPlayers }))
      );

      setState({
        round: live,
        rows,
        matchStates,
        holeCount: holesCount,
        loading: false,
      });
    } catch {
      // Offline or a flaky connection - leave whatever was already on screen.
      setState((s) => ({ ...s, loading: false }));
    }
  }, [trip.id, players, matches, trip.scoringMode]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep it moving as scores land, without every screen writing its own
  // subscription.
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || trip.scoringMode !== "hole_by_hole") return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase.channel(`live-standings-${trip.id}`);
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "hole_scores" },
      () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(load, 400);
      }
    );
    channel.subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [trip.id, load, trip.scoringMode]);

  return state;
}
