"use client";

// Standings: who is winning, all in one place.
//
// This used to be six sub-tabs under Pecking Order - Score, Matches, Schedule,
// Leaders, Teams, Players - and the same numbers showed in four of them,
// sometimes disagreeing. Team score and the individual leaderboard now sit on
// one screen, with every match below. Schedule, teams and players moved to the
// Trip tab, which is reference rather than competition.

import { ScoreboardScreen } from "@/features/trip/screens/ScoreboardScreen";
import { LeaderboardScreen } from "@/features/trip/screens/LeaderboardScreen";
import { MatchCenterScreen } from "@/features/trip/screens/MatchCenterScreen";
import type { Screen } from "@/types";

export function StandingsScreen({
  setActiveScreen,
  setSelectedMatchId,
}: {
  setActiveScreen: (screen: Screen) => void;
  setSelectedMatchId: (matchId: string) => void;
}) {
  return (
    <div className="space-y-8">
      <ScoreboardScreen setActiveScreen={setActiveScreen} />
      <LeaderboardScreen />
      <MatchCenterScreen setActiveScreen={setActiveScreen} setSelectedMatchId={setSelectedMatchId} />
    </div>
  );
}
