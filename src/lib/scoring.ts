import type {
  Course,
  LeaderboardRow,
  Match,
  MatchResult,
  Player,
  Round,
  ScoreEntry,
  Team,
  TeamId,
  TeamSummary
} from "@/types";

export function getPlayer(players: Player[], playerId: string): Player | undefined {
  return players.find((player) => player.id === playerId);
}

export function getRound(rounds: Round[], roundId: string): Round | undefined {
  return rounds.find((round) => round.id === roundId);
}

export function getScore(scores: ScoreEntry[], roundId: string, playerId: string): ScoreEntry | undefined {
  return scores.find((score) => score.roundId === roundId && score.playerId === playerId);
}

function getCourseForRound(round: Round, courses: Course[]): Course {
  return courses.find((course) => course.id === round.courseId) ?? courses[0];
}

export function courseHandicap(player: Player, round: Round, courses: Course[]): number {
  const course = getCourseForRound(round, courses);
  return Math.round(player.handicapIndex * (course.slope / 113) + (course.rating - course.par));
}

export function netScore(player: Player, round: Round, grossScore: number, courses: Course[]): number {
  return grossScore - courseHandicap(player, round, courses);
}

export function playerNetToPar(player: Player, round: Round, grossScore: number, courses: Course[]): number {
  const course = getCourseForRound(round, courses);
  return netScore(player, round, grossScore, courses) - course.par;
}

function bestNetForSide(
  playerIds: string[],
  players: Player[],
  round: Round,
  scores: ScoreEntry[],
  courses: Course[]
): number {
  const nets = playerIds.map((playerId) => {
    const player = getPlayer(players, playerId);
    const score = getScore(scores, round.id, playerId);
    if (!player || !score) return Number.POSITIVE_INFINITY;
    return netScore(player, round, score.grossScore, courses);
  });

  return Math.min(...nets);
}

export function resolveMatch(
  match: Match,
  players: Player[],
  rounds: Round[],
  scores: ScoreEntry[],
  courses: Course[]
): MatchResult {
  const round = getRound(rounds, match.roundId);

  if (!round) {
    return { status: "open", winner: null, label: "Missing round", waitingOn: [] };
  }

  const requiredPlayers = [...match.aPlayers, ...match.bPlayers];
  const waitingOn = requiredPlayers.filter((playerId) => !getScore(scores, match.roundId, playerId));

  if (waitingOn.length > 0) {
    return {
      status: "open",
      winner: null,
      label: `Waiting on ${waitingOn.join(", ")}`,
      waitingOn
    };
  }

  const aNet = bestNetForSide(match.aPlayers, players, round, scores, courses);
  const bNet = bestNetForSide(match.bPlayers, players, round, scores, courses);
  const winner: TeamId | "T" = aNet < bNet ? "A" : bNet < aNet ? "B" : "T";

  return {
    status: "final",
    winner,
    aNet,
    bNet,
    label: winner === "T" ? `Tie: ${aNet}` : `Team ${winner} wins ${aNet}–${bNet}`,
    waitingOn: []
  };
}

export function calculateMatchPoints(
  matches: Match[],
  players: Player[],
  rounds: Round[],
  scores: ScoreEntry[],
  courses: Course[]
): Record<TeamId, number> {
  return matches.reduce<Record<TeamId, number>>(
    (acc, match) => {
      const result = resolveMatch(match, players, rounds, scores, courses);
      if (result.winner === "A") acc.A += match.points;
      if (result.winner === "B") acc.B += match.points;
      if (result.winner === "T") {
        acc.A += match.points / 2;
        acc.B += match.points / 2;
      }
      return acc;
    },
    { A: 0, B: 0 }
  );
}

type NetScoreRanking = {
  player: Player;
  netScore: number;
};

export function calculateNetScorePoints(
  players: Player[],
  round: Round,
  scores: ScoreEntry[],
  courses: Course[]
): Record<TeamId, number> {
  const ranked: NetScoreRanking[] = scores
    .filter((score) => score.roundId === round.id)
    .map((score): NetScoreRanking | null => {
      const player = getPlayer(players, score.playerId);
      if (!player) return null;
      return {
        player,
        netScore: netScore(player, round, score.grossScore, courses)
      };
    })
    .filter((row): row is NetScoreRanking => row !== null)
    .sort((a, b) => a.netScore - b.netScore)
    .slice(0, 6);

  return ranked.reduce<Record<TeamId, number>>(
    (acc, row) => {
      acc[row.player.team] += 1;
      return acc;
    },
    { A: 0, B: 0 }
  );
}

export function calculateTeamPoints(
  matches: Match[],
  players: Player[],
  rounds: Round[],
  scores: ScoreEntry[],
  courses: Course[]
): Record<TeamId, number> {
  const matchPoints = calculateMatchPoints(matches, players, rounds, scores, courses);
  const netRounds = rounds.filter((round) => round.format === "net_score");

  const netPoints = netRounds.reduce<Record<TeamId, number>>(
    (acc, round) => {
      const roundPoints = calculateNetScorePoints(players, round, scores, courses);
      acc.A += roundPoints.A;
      acc.B += roundPoints.B;
      return acc;
    },
    { A: 0, B: 0 }
  );

  return {
    A: matchPoints.A + netPoints.A,
    B: matchPoints.B + netPoints.B
  };
}

export function buildLeaderboard(
  players: Player[],
  rounds: Round[],
  matches: Match[],
  scores: ScoreEntry[],
  courses: Course[]
): LeaderboardRow[] {
  return players
    .map((player) => {
      const playerScores = scores.filter((score) => score.playerId === player.id);

      const totalNetToPar = playerScores.reduce((sum, score) => {
        const round = getRound(rounds, score.roundId);
        if (!round) return sum;
        return sum + playerNetToPar(player, round, score.grossScore, courses);
      }, 0);

      const pointsWon = matches.reduce((sum, match) => {
        const result = resolveMatch(match, players, rounds, scores, courses);
        const side = match.aPlayers.includes(player.id)
          ? "A"
          : match.bPlayers.includes(player.id)
          ? "B"
          : null;

        if (!side) return sum;
        if (result.winner === side) return sum + match.points;
        if (result.winner === "T") return sum + match.points / 2;
        return sum;
      }, 0);

      return {
        player,
        roundsPlayed: playerScores.length,
        pointsWon,
        totalNetToPar,
        averageNetToPar: playerScores.length ? totalNetToPar / playerScores.length : null
      };
    })
    .sort((a, b) => {
      if (b.pointsWon !== a.pointsWon) return b.pointsWon - a.pointsWon;
      const aAvg = a.averageNetToPar ?? 999;
      const bAvg = b.averageNetToPar ?? 999;
      return aAvg - bAvg;
    });
}

export function buildTeamSummaries(
  teams: Team[],
  players: Player[],
  rounds: Round[],
  matches: Match[],
  scores: ScoreEntry[],
  courses: Course[]
): TeamSummary[] {
  const points = calculateTeamPoints(matches, players, rounds, scores, courses);

  return teams.map((team) => {
    const teamPlayers = players.filter((player) => player.team === team.id);
    const totalHandicap = teamPlayers.reduce((sum, player) => sum + player.handicapIndex, 0);
    const completedMatches = matches.filter((match) => {
      const result = resolveMatch(match, players, rounds, scores, courses);
      return result.status === "final" && result.winner === team.id;
    }).length;

    return {
      teamId: team.id,
      teamName: team.name,
      playerCount: teamPlayers.length,
      averageHandicap: teamPlayers.length ? totalHandicap / teamPlayers.length : 0,
      totalHandicap,
      points: points[team.id],
      completedMatches
    };
  });
}

export function getTournamentProgress(
  totalPoints: number,
  matches: Match[],
  players: Player[],
  rounds: Round[],
  scores: ScoreEntry[],
  courses: Course[]
) {
  const teamPoints = calculateTeamPoints(matches, players, rounds, scores, courses);
  const awardedPoints = teamPoints.A + teamPoints.B;
  const remainingPoints = Math.max(totalPoints - awardedPoints, 0);
  const progressPercent = totalPoints > 0 ? Math.min((awardedPoints / totalPoints) * 100, 100) : 0;
  const leader = teamPoints.A > teamPoints.B ? "A" : teamPoints.B > teamPoints.A ? "B" : "T";

  return {
    teamPoints,
    awardedPoints,
    remainingPoints,
    progressPercent,
    leader
  };
}

export function getTournamentAwards(
  players: Player[],
  rounds: Round[],
  matches: Match[],
  scores: ScoreEntry[],
  courses: Course[]
) {
  const leaderboard = buildLeaderboard(players, rounds, matches, scores, courses);
  const mvp = leaderboard[0] ?? null;

  const coldest =
    [...leaderboard]
      .filter((row) => row.roundsPlayed > 0)
      .sort((a, b) => {
        const aAvg = a.averageNetToPar ?? -999;
        const bAvg = b.averageNetToPar ?? -999;
        return bAvg - aAvg;
      })[0] ?? null;

  const clutch =
    [...leaderboard]
      .filter((row) => row.pointsWon > 0)
      .sort((a, b) => b.pointsWon - a.pointsWon)[0] ?? mvp;

  return { mvp, coldest, clutch };
}
