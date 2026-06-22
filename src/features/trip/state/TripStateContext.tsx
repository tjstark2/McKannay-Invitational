"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { initialTripState } from "@/data/initialTripState";
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
  updateTrip: (updates: Partial<Trip>) => void;
  updateTeam: (teamId: TeamId, updates: Partial<Team>) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  updateRound: (roundId: string, updates: Partial<Round>) => void;
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

  const value = useMemo<TripStateContextValue>(() => {
    return {
      ...state,

      updateTrip: (updates) => {
        setState((current) => ({
          ...current,
          trip: { ...current.trip, ...updates },
        }));
      },

      updateTeam: (teamId, updates) => {
        setState((current) => ({
          ...current,
          teams: current.teams.map((team) =>
            team.id === teamId ? { ...team, ...updates } : team
          ),
        }));
      },

      updatePlayer: (playerId, updates) => {
        setState((current) => ({
          ...current,
          players: current.players.map((player) =>
            player.id === playerId ? { ...player, ...updates } : player
          ),
        }));
      },

      updateRound: (roundId, updates) => {
        setState((current) => ({
          ...current,
          rounds: current.rounds.map((round) =>
            round.id === roundId ? { ...round, ...updates } : round
          ),
        }));
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
      },

      updateMatch: (matchId, updates) => {
        setState((current) => ({
          ...current,
          matches: current.matches.map((match) =>
            match.id === matchId ? { ...match, ...updates } : match
          ),
        }));
      },

      updateMatchPlayer: (matchId, side, index, playerId) => {
        setState((current) => ({
          ...current,
          matches: current.matches.map((match) => {
            if (match.id !== matchId) return match;

            const key = side === "A" ? "aPlayers" : "bPlayers";
            const updatedSide = [...match[key]];
            updatedSide[index] = playerId;

            return {
              ...match,
              [key]: updatedSide,
            };
          }),
        }));
      },

      updateManualMatchResult: (matchId, result) => {
        setState((current) => ({
          ...current,
          matches: current.matches.map((match) =>
            match.id === matchId
              ? {
                  ...match,
                  manualResult: result,
                }
              : match
          ),
        }));
      },

      updateScoringSettings: (updates) => {
        setState((current) => ({
          ...current,
          scoringSettings: {
            ...current.scoringSettings,
            ...updates,
          },
        }));
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
      },

      resetState: () => setState(initialTripState),
    };
  }, [state]);

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