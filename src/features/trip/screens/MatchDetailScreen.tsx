import { PlayerAvatar } from "@/features/avatar/PlayerAvatar";
import { CourseBackground } from "@/features/trip/components/CourseBackground";
import {
  allowedCourseHandicap,
  frontNineNetScore,
  getScore,
  hasFinalScore,
  hasFrontNineScore,
  netScore,
  playerNetToPar,
  resolveMatch,
} from "@/lib/scoring";
import { formatPlusMinus, formatRoundFormat } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { useTripState } from "@/features/trip/state/TripStateContext";
import type { Screen } from "@/types";

export function MatchDetailScreen({
  matchId,
  setActiveScreen,
}: {
  matchId: string;
  setActiveScreen: (screen: Screen) => void;
}) {
  const { courses, matches, players, rounds, scores, scoringSettings, groupScores } =
    useTripState();

  const match = matches.find((item) => item.id === matchId) ?? matches[0];
  const round = rounds.find((item) => item.id === match.roundId) ?? rounds[0];
  const course = courses.find((item) => item.id === round.courseId) ?? courses[0];
  const isGrouped = round.groupSize != null;

  const result = resolveMatch(
    match,
    players,
    rounds,
    scores,
    courses,
    scoringSettings
  );

  const started = isGrouped
    ? groupScores.some(
        (g) =>
          g.matchId === match.id &&
          (g.frontNineScore != null || g.grossScore != null)
      )
    : [...match.aPlayers, ...match.bPlayers].some((pid) => {
        const sc = getScore(scores, round.id, pid);
        return (
          sc &&
          (typeof sc.frontNineScore === "number" ||
            typeof sc.grossScore === "number")
        );
      });
  const matchStatus: "final" | "live" | "upcoming" =
    result.status === "final" ? "final" : started ? "live" : "upcoming";

  const renderGroupedSide = (side: "A" | "B", playerIds: string[]) => {
    const gs = groupScores.find(
      (g) => g.matchId === match.id && g.side === side
    );
    const names =
      playerIds
        .map((id) => players.find((p) => p.id === id)?.name)
        .filter(Boolean)
        .join(" & ") || "-";
    return (
      <div className="rounded-xl bg-[#f3efe6] p-3 text-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold">{names}</p>
            <p className="text-xs text-slate-500">Combined group score</p>
          </div>
          <div className="text-right">
            <p className="font-black">{gs?.grossScore ?? "-"}</p>
            <p className="text-xs text-slate-500">
              Front: {gs?.frontNineScore ?? "-"}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderPlayerRows = (playerIds: string[]) =>
    playerIds.map((playerId) => {
      const player = players.find((item) => item.id === playerId);
      if (!player) return null;

      const score = getScore(scores, round.id, player.id);

      const frontNet = hasFrontNineScore(score)
        ? frontNineNetScore(
            player,
            round,
            score.frontNineScore,
            courses,
            scoringSettings
          )
        : null;

      const net = hasFinalScore(score)
        ? netScore(player, round, score.grossScore, courses, scoringSettings)
        : null;

      const plusMinus = hasFinalScore(score)
        ? playerNetToPar(
            player,
            round,
            score.grossScore,
            courses,
            scoringSettings
          )
        : null;

      return (
        <div key={player.id} className="rounded-xl bg-[#f3efe6] p-3 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="flex items-center gap-2 font-bold">
                <PlayerAvatar
                  avatarId={player.avatarId}
                  emoji={player.avatarEmoji}
                  name={player.name}
                  size={28}
                />
                {player.name}
              </p>
              <p className="text-xs text-slate-500">
                Index {player.handicapIndex} · Allowed CH{" "}
                {allowedCourseHandicap(
                  player,
                  round,
                  courses,
                  scoringSettings
                )}
              </p>
            </div>

            <div className="text-right">
              <p className="font-black">{score?.grossScore ?? "-"}</p>
              <p className="text-xs text-slate-500">
                Front: {score?.frontNineScore ?? "-"}
              </p>
            </div>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            Front Net {frontNet === null ? "-" : frontNet.toFixed(1)} · Final Net{" "}
            {net ?? "-"} · {formatPlusMinus(plusMinus)} to par
          </p>
        </div>
      );
    });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <button
          onClick={() => setActiveScreen("matchCenter")}
          className="text-sm font-bold text-fairway-900"
        >
          ← Back to Match Center
        </button>
        <img
          src="/brand/match-detail-birdy.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none -mt-3 h-24 w-auto shrink-0 drop-shadow-[0_10px_14px_rgba(11,36,24,0.35)]"
        />
      </div>

      <Card className="overflow-hidden">
        <div className="h-36 w-full overflow-hidden">
          <CourseBackground value={course.imageUrl} alt={course.name} />
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-anton text-3xl tracking-tight text-ink">{match.label}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {round.title} · {course.name}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {formatRoundFormat(round.format, round.groupSize)}
              </p>
            </div>

            {matchStatus === "live" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-black text-red-700">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
                </span>
                LIVE
              </span>
            ) : matchStatus === "final" ? (
              <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-black text-slate-600">
                FINAL
              </span>
            ) : (
              <span className="rounded-full bg-fairway-100 px-2.5 py-1 text-xs font-black text-fairway-900">
                UP NEXT
              </span>
            )}
          </div>

          <p className="mt-4 rounded-xl bg-sand-50 p-3 text-sm font-semibold text-slate-700">
            {result.label}
          </p>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-anton text-xl text-team-north">Team A</h2>
        <div className="mt-3 space-y-2">
          {isGrouped
            ? renderGroupedSide("A", match.aPlayers)
            : renderPlayerRows(match.aPlayers)}
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-anton text-xl text-team-south">Team B</h2>
        <div className="mt-3 space-y-2">
          {isGrouped
            ? renderGroupedSide("B", match.bPlayers)
            : renderPlayerRows(match.bPlayers)}
        </div>
      </Card>
    </div>
  );
}