"use client";

import { useEffect, useRef, useState } from "react";
import { AddScoreScreen } from "@/features/trip/screens/AddScoreScreen";
import { AdminScreen } from "@/features/trip/screens/AdminScreen";
import { BottomNav } from "@/features/trip/components/BottomNav";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { CourseDetailScreen } from "@/features/trip/screens/CourseDetailScreen";
import { ClubhouseScreen } from "@/features/trip/screens/ClubhouseScreen";
import type { ClubhouseTab } from "@/features/trip/screens/ClubhouseScreen";
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
import { AccountMenu } from "@/features/account/AccountMenu";
import { EntryGate } from "@/features/trip/components/EntryGate";
import {
  TripStateProvider,
  useTripState,
} from "@/features/trip/state/TripStateContext";
import {
  ViewerProvider,
  useViewer,
} from "@/features/trip/state/ViewerContext";
import { useAuth } from "@/features/auth/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  loadUnreadCounts,
  type ClubhouseUnread,
} from "@/lib/supabase/clubhouse";
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
  const { canManage } = useViewer();
  const { user } = useAuth();

  const [activeScreen, setActiveScreen] = useState<Screen>("overview");
  const [selectedPlayerId, setSelectedPlayerId] = useState(players[0]?.id ?? "");
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id ?? "");
  const [selectedTeamId, setSelectedTeamId] = useState<TeamId>("A");
  const [selectedMatchId, setSelectedMatchId] = useState(matches[0]?.id ?? "");
  const [tournamentTab, setTournamentTab] =
    useState<TournamentTab>("scoreboard");
  const [clubhouseTab, setClubhouseTab] = useState<ClubhouseTab>("photos");
  const [unread, setUnread] = useState<ClubhouseUnread>({ photos: 0, chat: 0 });
  const [activityBanner, setActivityBanner] = useState<
    "photo" | "message" | "comment" | null
  >(null);
  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the latest screen/tab visible to the realtime closure without
  // re-subscribing on every change.
  const activeScreenRef = useRef(activeScreen);
  const clubhouseTabRef = useRef(clubhouseTab);
  useEffect(() => {
    activeScreenRef.current = activeScreen;
  }, [activeScreen]);
  useEffect(() => {
    clubhouseTabRef.current = clubhouseTab;
  }, [clubhouseTab]);
  useEffect(() => {
    if (activeScreen === "clubhouse") setActivityBanner(null);
  }, [activeScreen]);

  const tripId = trip?.id;
  const userId = user?.id;

  // Initial unread counts + a trip-level subscription that keeps the
  // Clubhouse badge live as photos and messages arrive from other people.
  useEffect(() => {
    if (!tripId || !userId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let active = true;

    loadUnreadCounts(supabase, tripId, userId)
      .then((counts) => {
        if (active) setUnread(counts);
      })
      .catch(() => {});

    const viewing = (tab: ClubhouseTab) =>
      activeScreenRef.current === "clubhouse" && clubhouseTabRef.current === tab;

    const bump = (
      tab: ClubhouseTab,
      fromUser: string,
      kind: "photo" | "message" | "comment"
    ) => {
      if (fromUser === userId) return; // don't count your own
      if (viewing(tab)) return; // they're looking at it; the tab marks it read
      setUnread((u) => ({ ...u, [tab]: u[tab] + 1 }));
      if (activeScreenRef.current !== "clubhouse") {
        setActivityBanner(kind);
        if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
        bannerTimeoutRef.current = setTimeout(
          () => setActivityBanner(null),
          5000
        );
      }
    };

    const channel = supabase
      .channel(`trip-clubhouse-unread-${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trip_photos",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) =>
          bump("photos", (payload.new as { user_id: string }).user_id, "photo")
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trip_messages",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) =>
          bump("chat", (payload.new as { user_id: string }).user_id, "message")
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trip_photo_comments",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) =>
          bump(
            "photos",
            (payload.new as { user_id: string }).user_id,
            "comment"
          )
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [tripId, userId]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center text-slate-900">
        <img
          src="/brand/loading-birdie.png"
          alt=""
          aria-hidden="true"
          className="h-44 w-auto animate-[tb-walk_0.7s_ease-in-out_infinite]"
        />
        <p className="font-anton text-2xl tracking-tight text-ink">
          Teeing things up…
        </p>
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-fairway-900 animate-[tb-dot_0.9s_ease-in-out_infinite]" />
          <span className="h-2.5 w-2.5 rounded-full bg-fairway-900 animate-[tb-dot_0.9s_ease-in-out_0.15s_infinite]" />
          <span className="h-2.5 w-2.5 rounded-full bg-fairway-900 animate-[tb-dot_0.9s_ease-in-out_0.3s_infinite]" />
          <span className="h-2.5 w-2.5 rounded-full bg-fairway-900/40 animate-[tb-dot_0.9s_ease-in-out_0.45s_infinite]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f1] px-5 text-slate-900">
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
      <div className="relative mx-auto min-h-screen max-w-md bg-[#f7f6f1] pb-28 shadow-phone">
        <div className="absolute right-4 top-4 z-[70]">
          <AccountMenu tone="onPhoto" />
        </div>
        <TopHero activeScreen={activeScreen} setActiveScreen={goToScreen} />

        <main className="px-5 py-6">
          {activeScreen === "overview" ? (
            <OverviewScreen setActiveScreen={goToScreen} />
          ) : null}

          {showTournamentShell ? (
            <div className="space-y-4">
              <ScreenHeader
                img="/brand/pecking-order.png"
                title="Pecking Order"
                subtitle="Scores, matches, schedule, leaders, teams, and players."
              />

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
                    className={`rounded-xl px-3 py-2 text-sm font-extrabold transition ${
                      tournamentTab === tab.id
                        ? "bg-fairway-900 text-white shadow-[0_8px_16px_-10px_rgba(19,100,63,0.8)]"
                        : "border border-line bg-white text-slate-600"
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
            canManage ? (
              <AdminScreen />
            ) : (
              <div className="rounded-2xl border border-sand-100 bg-white p-8 text-center">
                <p className="text-3xl">🔒</p>
                <p className="mt-3 font-black text-ink">Admins only</p>
                <p className="mt-1 text-sm text-slate-500">
                  Only the organizer and admins can manage this tournament.
                </p>
              </div>
            )
          ) : null}

          {activeScreen === "more" ? (
            <MoreScreen setActiveScreen={goToScreen} />
          ) : null}

          {activeScreen === "clubhouse" ? (
            <ClubhouseScreen
              tab={clubhouseTab}
              onTabChange={setClubhouseTab}
              unread={unread}
              onRead={(t) => setUnread((u) => ({ ...u, [t]: 0 }))}
            />
          ) : null}

          {activeScreen === "courseDetail" ? (
            <CourseDetailScreen
              courseId={selectedCourseId}
              setActiveScreen={goToScreen}
            />
          ) : null}
        </main>

        {activityBanner ? (
          <button
            onClick={() => {
              setClubhouseTab(activityBanner === "message" ? "chat" : "photos");
              goToScreen("clubhouse");
            }}
            className="fixed inset-x-0 bottom-[104px] z-40 mx-auto flex w-fit max-w-[92%] items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-extrabold text-ink shadow-[0_16px_34px_-16px_rgba(11,36,24,.7)]"
          >
            <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full">
              <img
                src="/brand/clubhouse.png"
                alt=""
                className="h-full w-full object-contain"
              />
            </span>
            {activityBanner === "photo"
              ? "New photo in the Clubhouse"
              : activityBanner === "comment"
                ? "New comment in the Clubhouse"
                : "New message in the Clubhouse"}
            <span className="ml-1 rounded-full bg-fairway-900 px-2 py-0.5 text-xs font-black text-white">
              View
            </span>
          </button>
        ) : null}

        <BottomNav
          activeScreen={activeScreen}
          setActiveScreen={goToScreen}
          clubhouseUnread={unread.photos + unread.chat}
        />
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

/** Trip app reached by a shareable URL like /t/MCK2026 - loads that code. */
export function TripView({
  code,
  canManage = false,
  isOwner = false,
}: {
  code: string;
  canManage?: boolean;
  isOwner?: boolean;
}) {
  return (
    <ViewerProvider value={{ canManage, isOwner }}>
      <TripStateProvider initialJoinCode={code}>
        <EntryGate>
          <TripAppInner />
        </EntryGate>
      </TripStateProvider>
    </ViewerProvider>
  );
}