import { PlayerAvatar } from "@/features/avatar/PlayerAvatar";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import {
  allowedCourseHandicap,
  frontNineNetScore,
  getScore,
  netScore,
  netScoreConfirmed,
  netScorePointCount,
  resolveMatch,
} from "@/lib/scoring";
import { formatRoundFormat } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTripState } from "@/features/trip/state/TripStateContext";
import type { Screen, TeamId } from "@/types";

function MatchStatusPill({
  status,
}: {
  status: "final" | "live" | "upcoming";
}) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-black text-red-700">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
        </span>
        LIVE
      </span>
    );
  }
  if (status === "final") {
    return (
      <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-black text-slate-600">
        FINAL
      </span>
    );
  }
  return (
    <span className="rounded-full bg-fairway-100 px-2.5 py-1 text-xs font-black text-fairway-900">
      UP NEXT
    </span>
  );
}

export function MatchCenterScreen({
  setActiveScreen,
  setSelectedMatchId,
}: {
  setActiveScreen: (screen: Screen) => void;
  setSelectedMatchId: (matchId: string) => void;
}) {
  const {
    courses,
    matches,
    players,
    rounds,
    scores,
    groupScores,
    scoringSettings,
    currentRoundId,
  } = useTripState();

  const [selectedRoundId, setSelectedRoundId] = useState<string>(
    currentRoundId || rounds[0]?.id || ""
  );

  const selectedRound =
    rounds.find((round) => round.id === selectedRoundId) ?? null;

  const selectedCourse = selectedRound
    ? courses.find((course) => course.id === selectedRound.courseId) ??
      courses[0]
    : null;

  const getPlayerName = (playerId: string) =>
    players.find((player) => player.id === playerId)?.name ?? playerId;

  const visibleMatches = matches.filter(
    (match) => match.roundId === selectedRoundId
  );

  const netScoreRows =
    selectedRound && selectedRound.format === "net_score"
      ? players
          .map((player) => {
            const score = getScore(scores, selectedRound.id, player.id);

            const handicapAdjustment = allowedCourseHandicap(
              player,
              selectedRound,
              courses,
              scoringSettings
            );

            const finalNet =
              typeof score?.grossScore === "number"
                ? netScore(
                    player,
                    selectedRound,
                    score.grossScore,
                    courses,
                    scoringSettings
                  )
                : null;

            const frontNet =
              typeof score?.frontNineScore === "number"
                ? frontNineNetScore(
                    player,
                    selectedRound,
                    score.frontNineScore,
                    courses,
                    scoringSettings
                  )
                : null;

            return {
              player,
              grossScore: score?.grossScore ?? null,
              frontNineScore: score?.frontNineScore ?? null,
              handicapAdjustment,
              frontNineAdjustment: handicapAdjustment / 2,
              frontNet,
              finalNet,
              displayNet: finalNet ?? (frontNet !== null ? frontNet * 2 : null),
              isFinal: finalNet !== null,
            };
          })
          .sort((a, b) => {
            if (a.displayNet === null && b.displayNet === null) return 0;
            if (a.displayNet === null) return 1;
            if (b.displayNet === null) return -1;
            return a.displayNet - b.displayNet;
          })
      : [];

  const netConfirmed =
    selectedRound && selectedRound.format === "net_score"
      ? netScoreConfirmed(
          players,
          selectedRound,
          scores,
          courses,
          scoringSettings
        )
      : { points: { A: 0, B: 0 } as Record<TeamId, number>, lockedIds: new Set<string>() };

  const confirmedNetScorePoints = netConfirmed.points;
  const lockedNetIds = netConfirmed.lockedIds;

  const projectedNetScorePoints = netScoreRows
    .filter((row) => row.displayNet !== null)
    .slice(0, netScorePointCount(players, scoringSettings))
    .reduce<Record<TeamId, number>>(
      (acc, row) => {
        acc[row.player.team] += 1;
        return acc;
      },
      { A: 0, B: 0 }
    );

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Match Center"
        subtitle="View matches by round, format, and status."
      />

      <div className="grid grid-cols-3 gap-2">
        {rounds.map((round) => (
          <button
            key={round.id}
            onClick={() => setSelectedRoundId(round.id)}
            className={`rounded-xl px-3 py-2 text-sm font-extrabold transition ${
              selectedRoundId === round.id
                ? "bg-fairway-900 text-white shadow-[0_8px_16px_-10px_rgba(19,100,63,0.8)]"
                : "border border-line bg-white text-slate-600"
            }`}
          >
            Round {round.roundNumber}
          </button>
        ))}
      </div>

      {selectedRound?.format === "net_score" ? (
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-black">
                {selectedRound.title} Net Leaderboard
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {selectedCourse?.name ?? "Course"} · Net Score ·{" "}
                {scoringSettings.netScoreHandicapAllowance}% allowance
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Projected uses front 9 or final scores. Confirmed points require
                final gross score.
              </p>
            </div>

            <Pill tone="green">
              {confirmedNetScorePoints.A}-{confirmedNetScorePoints.B}
            </Pill>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-[#f3efe6] p-3">
              <p className="text-xs font-bold text-slate-500">Projected</p>
              <p className="mt-1 text-xl font-black">
                {projectedNetScorePoints.A}-{projectedNetScorePoints.B}
              </p>
            </div>

            <div className="rounded-xl bg-[#f3efe6] p-3">
              <p className="text-xs font-bold text-slate-500">Confirmed</p>
              <p className="mt-1 text-xl font-black">
                {confirmedNetScorePoints.A}-{confirmedNetScorePoints.B}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-6 border-b border-slate-200 pb-2 text-xs font-black uppercase text-slate-500">
            <div className="col-span-2">Player</div>
            <div className="text-center">Front</div>
            <div className="text-center">Gross</div>
            <div className="text-center">HCP</div>
            <div className="text-center">Net</div>
          </div>

          <div className="divide-y divide-slate-100">
            {netScoreRows.map((row, index) => {
              const projectedPoint =
                row.displayNet !== null &&
                index < netScorePointCount(players, scoringSettings);
              const confirmedPoint = lockedNetIds.has(row.player.id);

              return (
                <div
                  key={row.player.id}
                  className="grid grid-cols-6 items-center py-3 text-sm"
                >
                  <div className="col-span-2 flex items-center gap-2.5">
                    <span className="w-4 shrink-0 text-right text-xs font-black text-slate-400">
                      {index + 1}
                    </span>
                    <PlayerAvatar
                      avatarId={row.player.avatarId}
                      emoji={row.player.avatarEmoji}
                      name={row.player.name}
                      size={30}
                    />
                    <div className="min-w-0">
                    <p className="truncate font-black">{row.player.name}</p>

                    <p className="text-xs text-slate-500">
                      Team {row.player.team}
                      {row.isFinal
                        ? " · Final"
                        : row.frontNet !== null
                        ? " · Through 9 · proj net"
                        : ""}
                      {confirmedPoint
                        ? " · +1 confirmed"
                        : projectedPoint
                        ? " · +1 projected"
                        : ""}
                    </p>
                    </div>
                  </div>

                  <div className="text-center font-bold">
                    {row.frontNineScore ?? "-"}
                  </div>

                  <div className="text-center font-bold">
                    {row.grossScore ?? "-"}
                  </div>

                  <div className="text-center font-bold">
                    {row.isFinal
                      ? `-${row.handicapAdjustment}`
                      : row.frontNet !== null
                      ? `-${row.frontNineAdjustment.toFixed(1)}`
                      : `-${row.handicapAdjustment}`}
                  </div>

                  <div className="text-center font-black">
                    {row.displayNet === null
                      ? "-"
                      : row.isFinal
                      ? row.displayNet
                      : row.displayNet.toFixed(1)}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      {selectedRound?.format !== "net_score" &&
        visibleMatches.map((match) => {
          const result = resolveMatch(
            match,
            players,
            rounds,
            scores,
            courses,
            scoringSettings
          );

          const round = rounds.find((item) => item.id === match.roundId);
          const course = courses.find((item) => item.id === round?.courseId);

          const grouped = round?.groupSize != null;
          const started = grouped
            ? groupScores.some(
                (g) =>
                  g.matchId === match.id &&
                  (g.frontNineScore != null || g.grossScore != null)
              )
            : (() => {
                const ids = new Set([...match.aPlayers, ...match.bPlayers]);
                return scores.some(
                  (sc) =>
                    sc.roundId === match.roundId &&
                    ids.has(sc.playerId) &&
                    (typeof sc.frontNineScore === "number" ||
                      typeof sc.grossScore === "number")
                );
              })();
          const matchStatus: "final" | "live" | "upcoming" =
            result.status === "final"
              ? "final"
              : started
              ? "live"
              : "upcoming";

          return (
            <button
              key={match.id}
              onClick={() => {
                setSelectedMatchId(match.id);
                setActiveScreen("matchDetail");
              }}
              className="block w-full text-left"
            >
              <Card className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      {round?.title ?? "Round"} · {course?.name ?? "Course"}
                    </p>

                    <h2 className="mt-1 font-black">{match.label}</h2>

                    <p className="mt-1 text-xs text-slate-500">
                      {round ? formatRoundFormat(round.format, round.groupSize) : ""}
                      {" · "}
                      {match.points} pts
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <MatchStatusPill status={matchStatus} />

                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
                  <p className="text-sm font-bold text-red-800">
                    {match.aPlayers.map(getPlayerName).join(" + ")}
                    {round?.groupSize != null
                      ? (() => {
                          const g = groupScores.find(
                            (x) => x.matchId === match.id && x.side === "A"
                          );
                          const v = g?.grossScore ?? g?.frontNineScore;
                          return v != null ? ` · ${v}` : "";
                        })()
                      : ""}
                  </p>

                  <p className="text-xs font-bold text-slate-400">VS</p>

                  <p className="text-sm font-bold text-blue-800">
                    {match.bPlayers.map(getPlayerName).join(" + ")}
                    {round?.groupSize != null
                      ? (() => {
                          const g = groupScores.find(
                            (x) => x.matchId === match.id && x.side === "B"
                          );
                          const v = g?.grossScore ?? g?.frontNineScore;
                          return v != null ? ` · ${v}` : "";
                        })()
                      : ""}
                  </p>
                </div>

                <p className="mt-4 rounded-xl bg-[#f3efe6] p-3 text-sm font-semibold text-slate-600">
                  {result.label}
                </p>
              </Card>
            </button>
          );
        })}

      {selectedRound?.format !== "net_score" && visibleMatches.length === 0 ? (
        <EmptyState
          img="/brand/no-matches.png"
          title="No Matchups Yet"
          message="An organizer can set up sides in Admin to start match play for this round."
        />
      ) : null}
    </div>
  );
}