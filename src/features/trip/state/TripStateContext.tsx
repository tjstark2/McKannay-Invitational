"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { initialTripState } from "@/data/initialTripState";
import { getSupabaseClient } from "@/lib/supabase/client";
import { APP_CONFIG } from "@/features/trip/config";
import {
  loadTripState,
  persistCurrentRound,
  persistManualResult,
  persistMatchPlayers,
  persistMatchUpdates,
  persistPlayer,
  persistRoundMatchesRebuild,
  persistRoundUpdates,
  persistScoringSettings,
  persistTeam,
  persistTeeTime,
  persistTripUpdates,
  upsertScoreRow,
} from "@/lib/supabase/queries";
import type {
  Match,
  Player,
  Round,
  ScoreEntry,
  ScoringSettings,
  Team,
  TeamId,
  Trip,
  TripState,
  Winner,
} from "@/types";

type TripStateContextValue = TripState & {
  loading: boolean;
  error: string | null;
  updateTrip: (updates: Partial<Trip>) => void;
  updateTeam: (teamId: TeamId, updates: Partial<Team>) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  updateRound: (roundId: string, updates: Partial<Round>) => void;
  updateRoundFormat: (roundId: string, format: Round["format"]) => void;
  updateCurrentRound: (roundId: string) => void;
  updateTeeTime: (roundId: string, teeTimeId: string, time: string) => void;
  updateMatch: (matchId: string, updates: Partial<Match>) => void;
  updateMatchPlayer: (
    matchId: string,
    side: "A" | "B",
    index: number,
    playerId: string
  ) => void;
  updateManualMatchResult: (matchId: string, result: Winner) => void;
  updateScoringSettings: (updates: Partial<ScoringSettings>) => void;
  upsertScore: (score: ScoreEntry) => void;
  resetState: () => void;
};

const TripStateContext = createContext<TripStateContextValue | null>(null);

export function TripStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<TripState>(initialTripState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabaseRef = useRef<SupabaseClient | null>(null);
  const teamDbIdsRef = useRef<{ id: TeamId; dbId: string }[]>([]);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLocalWrite = useRef<number>(0);

  // Pull the latest data from Supabase and replace local state with it.
  const reload = useCallback(async () => {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    try {
      const loaded = await loadTripState(supabase, APP_CONFIG.defaultJoinCode);
      teamDbIdsRef.current = loaded.teamDbIds;
      setState(loaded.state);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load trip data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced reload. If we just wrote locally, hold the reload off for a beat
  // so an in-progress edit (e.g. typing in Admin) isn't overwritten mid-stroke.
  // Remote-only changes still reconcile within ~250ms.
  const scheduleReload = useCallback(() => {
    if (reloadTimer.current) clearTimeout(reloadTimer.current);
    const sinceWrite = Date.now() - lastLocalWrite.current;
    const delay = sinceWrite < 1500 ? 1500 - sinceWrite : 250;
    reloadTimer.current = setTimeout(() => {
      void reload();
    }, delay);
  }, [reload]);

  // Initial load + realtime subscription.
  useEffect(() => {
    const supabase = getSupabaseClient();
    supabaseRef.current = supabase;

    if (!supabase) {
      // No backend configured: run on the bundled seed data. Writes stay local.
      setLoading(false);
      return;
    }

    void reload();

    const tables = [
      "trips",
      "teams",
      "players",
      "courses",
      "rounds",
      "tee_times",
      "tee_time_players",
      "matches",
      "match_players",
      "score_entries",
      "scoring_settings",
    ];

    const channel = supabase.channel("trip-sync");
    tables.forEach((table) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => scheduleReload()
      );
    });
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
    };
  }, [reload, scheduleReload]);

  // Runs a write against Supabase. On failure, surfaces the error and resyncs.
  // In local-fallback mode (no client) it's a no-op: optimistic state stands.
  const persist = useCallback(
    (fn: (supabase: SupabaseClient) => Promise<void>) => {
      const supabase = supabaseRef.current;
      if (!supabase) return;
      lastLocalWrite.current = Date.now();
      fn(supabase).catch((e) => {
        setError(e instanceof Error ? e.message : "Save failed");
        void reload();
      });
    },
    [reload]
  );

  const value = useMemo<TripStateContextValue>(() => {
    const tripId = state.trip.id;

    return {
      ...state,
      loading,
      error,

      updateTrip: (updates) => {
        setState((current) => ({
          ...current,
          trip: { ...current.trip, ...updates },
        }));
        persist((s) => persistTripUpdates(s, tripId, updates));
      },

      updateTeam: (teamId, updates) => {
        setState((current) => ({
          ...current,
          teams: current.teams.map((team) =>
            team.id === teamId ? { ...team, ...updates } : team
          ),
        }));
        persist((s) => persistTeam(s, tripId, teamId, updates));
      },

      updatePlayer: (playerId, updates) => {
        setState((current) => ({
          ...current,
          players: current.players.map((player) =>
            player.id === playerId ? { ...player, ...updates } : player
          ),
        }));
        persist((s) =>
          persistPlayer(s, playerId, updates, teamDbIdsRef.current)
        );
      },

      updateRound: (roundId, updates) => {
        setState((current) => ({
          ...current,
          rounds: current.rounds.map((round) =>
            round.id === roundId ? { ...round, ...updates } : round
          ),
        }));
        persist((s) => persistRoundUpdates(s, roundId, updates));
      },

      updateCurrentRound: (roundId) => {
        setState((current) => ({
          ...current,
          currentRoundId: roundId,
        }));
        persist((s) => persistCurrentRound(s, tripId, roundId));
      },

      updateRoundFormat: (roundId, format) => {
        const round = state.rounds.find((item) => item.id === roundId);
        if (!round) return;

        const teamAPlayers = state.players
          .filter((player) => player.team === "A")
          .map((player) => player.id);
        const teamBPlayers = state.players
          .filter((player) => player.team === "B")
          .map((player) => player.id);

        let newRoundMatches: Match[] = [];

        if (format === "best_ball") {
          newRoundMatches = [0, 2, 4].map((start, index) => ({
            id: `${roundId}-match-${index + 1}`,
            roundId,
            label: `${round.title} Best Ball ${index + 1}`,
            points: 2,
            aPlayers: teamAPlayers.slice(start, start + 2),
            bPlayers: teamBPlayers.slice(start, start + 2),
            manualResult: null,
          }));
        }

        if (format === "match_play") {
          const count = Math.min(teamAPlayers.length, teamBPlayers.length);
          newRoundMatches = Array.from({ length: count }, (_, index) => ({
            id: `${roundId}-match-${index + 1}`,
            roundId,
            label: `${round.title} Singles ${index + 1}`,
            points: 1,
            aPlayers: [teamAPlayers[index]],
            bPlayers: [teamBPlayers[index]],
            manualResult: null,
          }));
        }

        const newPointsAvailable =
          format === "best_ball"
            ? 6
            : format === "match_play"
            ? 6
            : format === "net_score"
            ? 6
            : round.pointsAvailable;

        setState((current) => ({
          ...current,
          rounds: current.rounds.map((item) =>
            item.id === roundId
              ? { ...item, format, pointsAvailable: newPointsAvailable }
              : item
          ),
          matches: [
            ...current.matches.filter((match) => match.roundId !== roundId),
            ...newRoundMatches,
          ],
        }));

        // Structural change: persist round + rebuild matches, then resync so
        // local state picks up the real database-generated match IDs.
        persist(async (s) => {
          await persistRoundUpdates(s, roundId, {
            format,
            pointsAvailable: newPointsAvailable,
          });
          await persistRoundMatchesRebuild(s, roundId, newRoundMatches);
          await reload();
        });
      },

      updateTeeTime: (roundId, teeTimeId, time) => {
        setState((current) => ({
          ...current,
          rounds: current.rounds.map((round) =>
            round.id === roundId
              ? {
                  ...round,
                  teeTimes: round.teeTimes.map((tee) =>
                    tee.id === teeTimeId ? { ...tee, time } : tee
                  ),
                }
              : round
          ),
        }));
        persist((s) => persistTeeTime(s, teeTimeId, time));
      },

      updateMatch: (matchId, updates) => {
        setState((current) => ({
          ...current,
          matches: current.matches.map((match) =>
            match.id === matchId ? { ...match, ...updates } : match
          ),
        }));
        persist((s) => persistMatchUpdates(s, matchId, updates));
      },

      updateMatchPlayer: (matchId, side, index, playerId) => {
        const match = state.matches.find((item) => item.id === matchId);
        if (!match) return;

        const key = side === "A" ? "aPlayers" : "bPlayers";
        const updatedSide = [...match[key]];
        updatedSide[index] = playerId;

        const aPlayers = side === "A" ? updatedSide : match.aPlayers;
        const bPlayers = side === "B" ? updatedSide : match.bPlayers;

        setState((current) => ({
          ...current,
          matches: current.matches.map((item) =>
            item.id === matchId ? { ...item, aPlayers, bPlayers } : item
          ),
        }));
        persist((s) => persistMatchPlayers(s, matchId, aPlayers, bPlayers));
      },

      updateManualMatchResult: (matchId, result) => {
        setState((current) => ({
          ...current,
          matches: current.matches.map((match) =>
            match.id === matchId ? { ...match, manualResult: result } : match
          ),
        }));
        persist((s) => persistManualResult(s, matchId, result));
      },

      updateScoringSettings: (updates) => {
        setState((current) => ({
          ...current,
          scoringSettings: { ...current.scoringSettings, ...updates },
        }));
        persist((s) => persistScoringSettings(s, tripId, updates));
      },

      upsertScore: (score) => {
        setState((current) => {
          const exists = current.scores.some(
            (item) =>
              item.roundId === score.roundId && item.playerId === score.playerId
          );
          return {
            ...current,
            scores: exists
              ? current.scores.map((item) =>
                  item.roundId === score.roundId &&
                  item.playerId === score.playerId
                    ? score
                    : item
                )
              : [...current.scores, score],
          };
        });
        persist((s) => upsertScoreRow(s, score));
      },

      resetState: () => {
        if (supabaseRef.current) {
          void reload();
        } else {
          setState(initialTripState);
        }
      },
    };
  }, [state, loading, error, persist, reload]);

  return (
    <TripStateContext.Provider value={value}>
      {children}
    </TripStateContext.Provider>
  );
}

export function useTripState() {
  const context = useContext(TripStateContext);

  if (!context) {
    throw new Error("useTripState must be used inside TripStateProvider");
  }

  return context;
}