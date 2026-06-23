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
  updateRoundFormat: (roundId: string, format: Round["format"]) => void;
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

      updateRoundFormat: (roundId, format) => {
        setState((current) => {
          const round = current.rounds.find((item) => item.id === roundId);

          if (!round) return current;

          const teamAPlayers = current.players
            .filter((player) => player.team === "A")
            .map((player) => player.id);

          const teamBPlayers = current.players
            .filter((player) => player.team === "B")
            .map((player) => player.id);

          let rebuiltMatches = current.matches.filter(
            (match) => match.roundId !== roundId
          );

          if (format === "best_ball") {
            rebuiltMatches = [
              ...rebuiltMatches,
              {
                id: `${roundId}-match-1`,
                roundId,
                label: `${round.title} Best Ball 1`,
                points: 2,
                aPlayers: teamAPlayers.slice(0, 2),
                bPlayers: teamBPlayers.slice(0, 2),
                manualResult: null,
              },
              {
                id: `${roundId}-match-2`,
                roundId,
                label: `${round.title} Best Ball 2`,
                points: 2,
                aPlayers: teamAPlayers.slice(2, 4),
                bPlayers: teamBPlayers.slice(2, 4),
                manualResult: null,
              },
              {
                id: `${roundId}-match-3`,
                roundId,
                label: `${round.title} Best Ball 3`,
                points: 2,
                aPlayers: teamAPlayers.slice(4, 6),
                bPlayers: teamBPlayers.slice(4, 6),
                manualResult: null,
              },
            ];
          }

          if (format === "match_play") {
            rebuiltMatches = [
              ...rebuiltMatches,
              ...Array.from({ length: 6 }, (_, index) => ({
                id: `${roundId}-match-${index + 1}`,
                roundId,
                label: `${round.title} Singles ${index + 1}`,
                points: 1,
                aPlayers: [teamAPlayers[index]],
                bPlayers: [teamBPlayers[index]],
                manualResult: null,
              })),
            ];
          }

          return {
            ...current,
            rounds: current.rounds.map((item) =>
              item.id === roundId
                ? {
                    ...item,
                    format,
                    pointsAvailable:
                      format === "best_ball"
                        ? 6
                        : format === "match_play"
                        ? 6
                        : format === "net_score"
                        ? 6
                        : item.pointsAvailable,
                  }
                : item
            ),
            matches: rebuiltMatches,
          };
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