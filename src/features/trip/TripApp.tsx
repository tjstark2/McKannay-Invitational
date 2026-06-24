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
import { PasswordGate } from "@/features/trip/components/PasswordGate";
import { EntryGate } from "@/features/trip/components/EntryGate";
import {
  APP_CONFIG,
  ADMIN_UNLOCK_KEY,
} from "@/features/trip/config";
import {
  TripStateProvider,
  useTripState,
} from "@/features/trip/state/TripStateContext";
import type { Screen, TeamId } from "@/types";

type TournamentTab =
  | "scoreboard"
  | "matchCenter"
  | "schedule"
  | "leaderboard"
  | "teams"
  | "players";

function TripAppInner() {
  const { trip, players, courses, matches, loading, error, resetState } =
    useTripState();

  const [activeScreen, setActiveScreen] = useState<Screen>("overview");
  const [selectedPlayerId, setSelectedPlayerId] = useState(players[0]?.id ?? "");
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id ?? "");
  const [selectedTeamId, setSelectedTeamId] = useState<TeamId>("A");
  const [selectedMatchId, setSelectedMatchId] = useState(matches[0]?.id ?? "");
  const [tournamentTab, setTournamentTab] =
    useState<TournamentTab>("scoreboard");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-200 text-slate-900">
        <div className="text-center">
          <p className="text-3xl">⛳</p>
          <p className="mt-3 font-black">Loading tournament…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-200 px-5 text-slate-900">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-phone">
          <p className="text-3xl">⚠️</p>
          <p className="mt-3 font-black">Couldn&apos;t load the tournament</p>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
          <button
            onClick={() => resetState()}
            className="mt-4 w-full rounded-xl bg-fairway-900 px-4 py-3 font-black text-white"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  function goToScreen(screen: Screen) {
    if (
      screen === "scoreboard" ||
      screen === "matchCenter" ||
      screen === "schedule" ||
      screen === "leaderboard" ||
      screen === "teams" ||
      screen === "players"
    ) {
      setTournamentTab(screen);
      setActiveScreen("tournament");
      return;
    }

    setActiveScreen(screen);
  }

  const showTournamentShell = activeScreen === "tournament";

  return (
    <div className="min-h-screen bg-[#f7f6f1] text-slate-900">
      <div className="mx-auto min-h-screen max-w-md bg-[#f7f6f1] pb-28 shadow-phone">
        <TopHero activeScreen={activeScreen} setActiveScreen={goToScreen} />

        <main className="px-5 py-6">
          {activeScreen === "overview" ? (
            <OverviewScreen setActiveScreen={goToScreen} />
          ) : null}

          {showTournamentShell ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  Tournament
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Scoreboard, matches, schedule, leaderboard, teams, and players.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "scoreboard", label: "Score" },
                  { id: "matchCenter", label: "Matches" },
                  { id: "schedule", label: "Schedule" },
                  { id: "leaderboard", label: "Leaders" },
                  { id: "teams", label: "Teams" },
                  { id: "players", label: "Players" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setTournamentTab(tab.id as TournamentTab)}
                    className={`rounded-xl px-3 py-2 text-sm font-black ${
                      tournamentTab === tab.id
                        ? "bg-fairway-900 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {tournamentTab === "scoreboard" ? (
                <ScoreboardScreen setActiveScreen={goToScreen} />
              ) : null}

              {tournamentTab === "matchCenter" ? (
                <MatchCenterScreen
                  setActiveScreen={goToScreen}
                  setSelectedMatchId={setSelectedMatchId}
                />
              ) : null}

              {tournamentTab === "schedule" ? (
                <ScheduleScreen
                  setActiveScreen={goToScreen}
                  setSelectedCourseId={setSelectedCourseId}
                />
              ) : null}

              {tournamentTab === "leaderboard" ? <LeaderboardScreen /> : null}

              {tournamentTab === "teams" ? (
                <TeamsScreen
                  setActiveScreen={goToScreen}
                  setSelectedTeamId={setSelectedTeamId}
                />
              ) : null}

              {tournamentTab === "players" ? (
                <PlayersScreen
                  setActiveScreen={goToScreen}
                  setSelectedPlayerId={setSelectedPlayerId}
                />
              ) : null}
            </div>
          ) : null}

          {activeScreen === "addScore" ? <AddScoreScreen /> : null}

          {activeScreen === "playerProfile" ? (
            <PlayerProfileScreen
              playerId={selectedPlayerId}
              setActiveScreen={goToScreen}
            />
          ) : null}

          {activeScreen === "teamDetail" ? (
            <TeamDetailScreen
              teamId={selectedTeamId}
              setActiveScreen={goToScreen}
              setSelectedPlayerId={setSelectedPlayerId}
            />
          ) : null}

          {activeScreen === "matchDetail" ? (
            <MatchDetailScreen
              matchId={selectedMatchId}
              setActiveScreen={goToScreen}
            />
          ) : null}

          {activeScreen === "rules" ? <RulesScreen /> : null}

          {activeScreen === "admin" ? (
            <PasswordGate
              password={trip.adminCode ?? APP_CONFIG.adminPassword}
              storageKey={ADMIN_UNLOCK_KEY}
              label="Admin Code"
              heading="Admin Access"
              subtitle="Enter the admin code to manage the tournament."
            >
              <AdminScreen />
            </PasswordGate>
          ) : null}

          {activeScreen === "more" ? (
            <MoreScreen setActiveScreen={goToScreen} />
          ) : null}

          {activeScreen === "courseDetail" ? (
            <CourseDetailScreen
              courseId={selectedCourseId}
              setActiveScreen={goToScreen}
            />
          ) : null}
        </main>

        <BottomNav activeScreen={activeScreen} setActiveScreen={goToScreen} />
      </div>
    </div>
  );
}

export function TripApp() {
  return (
    <TripStateProvider>
      <EntryGate>
        <TripAppInner />
      </EntryGate>
    </TripStateProvider>
  );
}