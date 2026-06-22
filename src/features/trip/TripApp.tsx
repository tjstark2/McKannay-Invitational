"use client";

import { useState } from "react";
import { AddScoreScreen } from "@/features/trip/screens/AddScoreScreen";
import { AdminScreen } from "@/features/trip/screens/AdminScreen";
import { BottomNav } from "@/features/trip/components/BottomNav";
import { CourseDetailScreen } from "@/features/trip/screens/CourseDetailScreen";
import { LeaderboardScreen } from "@/features/trip/screens/LeaderboardScreen";
import { MatchCenterScreen } from "@/features/trip/screens/MatchCenterScreen";
import { MatchDetailScreen } from "@/features/trip/screens/MatchDetailScreen";
import { MoreScreen } from "@/features/trip/screens/MoreScreen";
import { OverviewScreen } from "@/features/trip/screens/OverviewScreen";
import { PlayerProfileScreen } from "@/features/trip/screens/PlayerProfileScreen";
import { PlayersScreen } from "@/features/trip/screens/PlayersScreen";
import { RulesScreen } from "@/features/trip/screens/RulesScreen";
import { ScheduleScreen } from "@/features/trip/screens/ScheduleScreen";
import { ScoreboardScreen } from "@/features/trip/screens/ScoreboardScreen";
import { TeamDetailScreen } from "@/features/trip/screens/TeamDetailScreen";
import { TeamsScreen } from "@/features/trip/screens/TeamsScreen";
import { TopHero } from "@/features/trip/components/TopHero";
import { TripStateProvider, useTripState } from "@/features/trip/state/TripStateContext";
import type { Screen, TeamId } from "@/types";

function TripAppInner() {
  const { players, courses, matches } = useTripState();
  const [activeScreen, setActiveScreen] = useState<Screen>("overview");
  const [selectedPlayerId, setSelectedPlayerId] = useState(players[0]?.id ?? "");
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id ?? "");
  const [selectedTeamId, setSelectedTeamId] = useState<TeamId>("A");
  const [selectedMatchId, setSelectedMatchId] = useState(matches[0]?.id ?? "");

  return (
    <div className="min-h-screen bg-slate-200 text-slate-900">
      <div className="mx-auto min-h-screen max-w-md bg-white pb-28 shadow-phone">
        <TopHero activeScreen={activeScreen} setActiveScreen={setActiveScreen} />

        <main className="px-5 py-6">
          {activeScreen === "overview" ? <OverviewScreen setActiveScreen={setActiveScreen} /> : null}

          {activeScreen === "schedule" ? (
            <ScheduleScreen setActiveScreen={setActiveScreen} setSelectedCourseId={setSelectedCourseId} />
          ) : null}

          {activeScreen === "scoreboard" ? <ScoreboardScreen setActiveScreen={setActiveScreen} /> : null}

          {activeScreen === "leaderboard" ? <LeaderboardScreen /> : null}

          {activeScreen === "addScore" ? <AddScoreScreen /> : null}

          {activeScreen === "players" ? (
            <PlayersScreen setActiveScreen={setActiveScreen} setSelectedPlayerId={setSelectedPlayerId} />
          ) : null}

          {activeScreen === "playerProfile" ? (
            <PlayerProfileScreen playerId={selectedPlayerId} setActiveScreen={setActiveScreen} />
          ) : null}

          {activeScreen === "teams" ? (
            <TeamsScreen setActiveScreen={setActiveScreen} setSelectedTeamId={setSelectedTeamId} />
          ) : null}

          {activeScreen === "teamDetail" ? (
            <TeamDetailScreen
              teamId={selectedTeamId}
              setActiveScreen={setActiveScreen}
              setSelectedPlayerId={setSelectedPlayerId}
            />
          ) : null}

          {activeScreen === "matchCenter" ? (
            <MatchCenterScreen setActiveScreen={setActiveScreen} setSelectedMatchId={setSelectedMatchId} />
          ) : null}

          {activeScreen === "matchDetail" ? (
            <MatchDetailScreen matchId={selectedMatchId} setActiveScreen={setActiveScreen} />
          ) : null}

          {activeScreen === "rules" ? <RulesScreen /> : null}

          {activeScreen === "admin" ? <AdminScreen /> : null}

          {activeScreen === "more" ? <MoreScreen setActiveScreen={setActiveScreen} /> : null}

          {activeScreen === "courseDetail" ? (
            <CourseDetailScreen courseId={selectedCourseId} setActiveScreen={setActiveScreen} />
          ) : null}
        </main>

        <BottomNav activeScreen={activeScreen} setActiveScreen={setActiveScreen} />
      </div>
    </div>
  );
}

export function TripApp() {
  return (
    <TripStateProvider>
      <TripAppInner />
    </TripStateProvider>
  );
}
