import type {
  Course,
  LeaderboardRow,
  Match,
  MatchResult,
  Player,
  Round,
  ScoreEntry,
  ScoringSettings,
  Team,
  TeamId,
  TeamSummary,
} from "@/types";

export type CurrentRoundStandingRow = {
  player: Player;
  frontNineScore: number | null;
  grossScore: number | null;
  handicapAdjustment: number;
  frontNineAdjustment: number;
  frontNet: number | null;
  finalNet: number | null;
  displayNet: number | null;
  isFinal: boolean;
  status: "not_started" | "through_9" | "final";
};

export type CurrentRoundRace = {
  confirmedPriorPoints: Record<TeamId, number>;
  currentConfirmedPoints: Record<TeamId, number>;
  currentProjectedPoints: Record<TeamId, number>;
  confirmedTotalPoints: Record<TeamId, number>;
  projectedTotalPoints: Record<TeamId, number>;
  currentConfirmedRemaining: number;
  currentProjectedRemaining: number;
  totalProjectedRemaining: number;
};

export function getPlayer(
  players: Player[],
  playerId: string
): Player | undefined {
  return players.find((player) => player.id === playerId);
}

export function getRound(rounds: Round[], roundId: string): Round | undefined {
  return rounds.find((round) => round.id === roundId);
}

export function getScore(
  scores: ScoreEntry[],
  roundId: string,
  playerId: string
): ScoreEntry | undefined {
  return scores.find(
    (score) => score.roundId === roundId && score.playerId === playerId
  );
}

export function hasFinalScore(
  score: ScoreEntry | undefined
): score is ScoreEntry & { grossScore: number } {
  return typeof score?.grossScore === "number";
}

export function hasFrontNineScore(
  score: ScoreEntry | undefined
): score is ScoreEntry & { frontNineScore: number } {
  return typeof score?.frontNineScore === "number";
}

function getCourseForRound(round: Round, courses: Course[]): Course {
  return courses.find((course) => course.id === round.courseId) ?? courses[0];
}

function getAllowanceForRound(
  round: Round,
  scoringSettings: ScoringSettings
): number {
  if (round.format === "best_ball") return scoringSettings.bestBallHandicapAllowance;
  if (round.format === "match_play") return scoringSettings.singlesHandicapAllowance;
  if (round.format === "net_score") return scoringSettings.netScoreHandicapAllowance;
  return 0;
}

export function courseHandicap(
  player: Player,
  round: Round,
  courses: Course[]
): number {
  const course = getCourseForRound(round, courses);

  return Math.round(
    player.handicapIndex * (course.slope / 113) + (course.rating - course.par)
  );
}

export function allowedCourseHandicap(
  player: Player,
  round: Round,
  courses: Course[],
  scoringSettings: ScoringSettings
): number {
  const allowance = getAllowanceForRound(round, scoringSettings);
  return Math.round(courseHandicap(player, round, courses) * (allowance / 100));
}

export function netScore(
  player: Player,
  round: Round,
  grossScore: number,
  courses: Course[],
  scoringSettings: ScoringSettings
): number {
  return grossScore - allowedCourseHandicap(player, round, courses, scoringSettings);
}

export function frontNineNetScore(
  player: Player,
  round: Round,
  frontNineScore: number,
  courses: Course[],
  scoringSettings: ScoringSettings
): number {
  const fullRoundHandicap = allowedCourseHandicap(
    player,
    round,
    courses,
    scoringSettings
  );

  return frontNineScore - fullRoundHandicap / 2;
}

export function playerNetToPar(
  player: Player,
  round: Round,
  grossScore: number,
  courses: Course[],
  scoringSettings: ScoringSettings
): number {
  const course = getCourseForRound(round, courses);
  return netScore(player, round, grossScore, courses, scoringSettings) - course.par;
}

export function buildCurrentRoundStandings(
  round: Round,
  players: Player[],
  scores: ScoreEntry[],
  courses: Course[],
  scoringSettings: ScoringSettings
): CurrentRoundStandingRow[] {
  return players
    .map((player) => {
      const score = getScore(scores, round.id, player.id);

      const handicapAdjustment = allowedCourseHandicap(
        player,
        round,
        courses,
        scoringSettings
      );

      const frontNineAdjustment = handicapAdjustment / 2;

      const frontNet = hasFrontNineScore(score)
        ? frontNineNetScore(
            player,
            round,
            score.frontNineScore,
            courses,
            scoringSettings
          )
        : null;

      const finalNet = hasFinalScore(score)
        ? netScore(player, round, score.grossScore, courses, scoringSettings)
        : null;

      const status: CurrentRoundStandingRow["status"] =
        finalNet !== null ? "final" : frontNet !== null ? "through_9" : "not_started";

      return {
        player,
        frontNineScore: score?.frontNineScore ?? null,
        grossScore: score?.grossScore ?? null,
        handicapAdjustment,
        frontNineAdjustment,
        frontNet,
        finalNet,
        displayNet: finalNet ?? frontNet,
        isFinal: finalNet !== null,
        status,
      };
    })
    .sort((a, b) => {
      if (a.displayNet === null && b.displayNet === null) return 0;
      if (a.displayNet === null) return 1;
      if (b.displayNet === null) return -1;
      return a.displayNet - b.displayNet;
    });
}

function bestNetForSide(
  playerIds: string[],
  players: Player[],
  round: Round,
  scores: ScoreEntry[],
  courses: Course[],
  scoringSettings: ScoringSettings
): number {
  const nets = playerIds.map((playerId) => {
    const player = getPlayer(players, playerId);
    const score = getScore(scores, round.id, playerId);

    if (!player || !hasFinalScore(score)) return Number.POSITIVE_INFINITY;

    return netScore(player, round, score.grossScore, courses, scoringSettings);
  });

  return Math.min(...nets);
}

function bestDisplayNetForSide(
  playerIds: string[],
  players: Player[],
  round: Round,
  scores: ScoreEntry[],
  courses: Course[],
  scoringSettings: ScoringSettings
): number {
  const nets = playerIds.map((playerId) => {
    const player = getPlayer(players, playerId);
    const score = getScore(scores, round.id, playerId);

    if (!player) return Number.POSITIVE_INFINITY;

    if (hasFinalScore(score)) {
      return netScore(player, round, score.grossScore, courses, scoringSettings);
    }

    if (hasFrontNineScore(score)) {
      return frontNineNetScore(
        player,
        round,
        score.frontNineScore,
        courses,
        scoringSettings
      );
    }

    return Number.POSITIVE_INFINITY;
  });

  return Math.min(...nets);
}

export function resolveMatch(
  match: Match,
  players: Player[],
  rounds: Round[],
  scores: ScoreEntry[],
  courses: Course[],
  scoringSettings: ScoringSettings
): MatchResult {
  const round = getRound(rounds, match.roundId);

  if (!round) {
    return {
      status: "open",
      winner: null,
      label: "Missing round",
      waitingOn: [],
    };
  }

  if (round.format === "best_ball") {
    if (match.manualResult) {
      return {
        status: "final",
        winner: match.manualResult,
        label:
          match.manualResult === "T"
            ? "Manual result: Tie"
            : `Manual result: Team ${match.manualResult} wins`,
        waitingOn: [],
        isManual: true,
      };
    }

    return {
      status: "open",
      winner: null,
      label: "Waiting on manual best ball result",
      waitingOn: [],
      isManual: true,
    };
  }

  const requiredPlayers = [...match.aPlayers, ...match.bPlayers];

  const waitingOn = requiredPlayers.filter((playerId) => {
    const score = getScore(scores, match.roundId, playerId);
    return !hasFinalScore(score);
  });

  if (waitingOn.length > 0) {
    return {
      status: "open",
      winner: null,
      label: `Waiting on ${waitingOn.join(", ")}`,
      waitingOn,
    };
  }

  const aNet = bestNetForSide(
    match.aPlayers,
    players,
    round,
    scores,
    courses,
    scoringSettings
  );

  const bNet = bestNetForSide(
    match.bPlayers,
    players,
    round,
    scores,
    courses,
    scoringSettings
  );

  const winner: TeamId | "T" = aNet < bNet ? "A" : bNet < aNet ? "B" : "T";

  return {
    status: "final",
    winner,
    aNet,
    bNet,
    label:
      winner === "T" ? `Tie: ${aNet}` : `Team ${winner} wins ${aNet}–${bNet}`,
    waitingOn: [],
  };
}

export function calculateMatchPoints(
  matches: Match[],
  players: Player[],
  rounds: Round[],
  scores: ScoreEntry[],
  courses: Course[],
  scoringSettings: ScoringSettings
): Record<TeamId, number> {
  return matches.reduce<Record<TeamId, number>>(
    (acc, match) => {
      const result = resolveMatch(
        match,
        players,
        rounds,
        scores,
        courses,
        scoringSettings
      );

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
  courses: Course[],
  scoringSettings: ScoringSettings
): Record<TeamId, number> {
  const finalScores = scores.filter(
    (score): score is ScoreEntry & { grossScore: number } =>
      score.roundId === round.id && hasFinalScore(score)
  );

  const ranked: NetScoreRanking[] = finalScores
    .map((score): NetScoreRanking | null => {
      const player = getPlayer(players, score.playerId);

      if (!player) return null;

      return {
        player,
        netScore: netScore(
          player,
          round,
          score.grossScore,
          courses,
          scoringSettings
        ),
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

export function calculateProjectedNetScorePoints(
  players: Player[],
  round: Round,
  scores: ScoreEntry[],
  courses: Course[],
  scoringSettings: ScoringSettings
): Record<TeamId, number> {
  const projectedRows = buildCurrentRoundStandings(
    round,
    players,
    scores,
    courses,
    scoringSettings
  )
    .filter((row) => row.displayNet !== null)
    .slice(0, 6);

  return projectedRows.reduce<Record<TeamId, number>>(
    (acc, row) => {
      acc[row.player.team] += 1;
      return acc;
    },
    { A: 0, B: 0 }
  );
}

function calculateProjectedMatchPoints(
  roundMatches: Match[],
  round: Round,
  players: Player[],
  scores: ScoreEntry[],
  courses: Course[],
  scoringSettings: ScoringSettings
): Record<TeamId, number> {
  return roundMatches.reduce<Record<TeamId, number>>(
    (acc, match) => {
      if (match.manualResult === "A") {
        acc.A += match.points;
        return acc;
      }

      if (match.manualResult === "B") {
        acc.B += match.points;
        return acc;
      }

      if (match.manualResult === "T") {
        acc.A += match.points / 2;
        acc.B += match.points / 2;
        return acc;
      }

      const aNet = bestDisplayNetForSide(
        match.aPlayers,
        players,
        round,
        scores,
        courses,
        scoringSettings
      );

      const bNet = bestDisplayNetForSide(
        match.bPlayers,
        players,
        round,
        scores,
        courses,
        scoringSettings
      );

      if (!Number.isFinite(aNet) || !Number.isFinite(bNet)) {
        return acc;
      }

      if (aNet < bNet) acc.A += match.points;
      if (bNet < aNet) acc.B += match.points;

      if (aNet === bNet) {
        acc.A += match.points / 2;
        acc.B += match.points / 2;
      }

      return acc;
    },
    { A: 0, B: 0 }
  );
}

export function calculateCurrentRoundConfirmedPoints(
  round: Round,
  matches: Match[],
  players: Player[],
  scores: ScoreEntry[],
  courses: Course[],
  scoringSettings: ScoringSettings
): Record<TeamId, number> {
  if (round.format === "net_score") {
    return calculateNetScorePoints(players, round, scores, courses, scoringSettings);
  }

  const roundMatches = matches.filter((match) => match.roundId === round.id);

  return calculateMatchPoints(
    roundMatches,
    players,
    [round],
    scores,
    courses,
    scoringSettings
  );
}

export function calculateCurrentRoundProjectedPoints(
  round: Round,
  matches: Match[],
  players: Player[],
  scores: ScoreEntry[],
  courses: Course[],
  scoringSettings: ScoringSettings
): Record<TeamId, number> {
  if (round.format === "net_score") {
    return calculateProjectedNetScorePoints(
      players,
      round,
      scores,
      courses,
      scoringSettings
    );
  }

  const roundMatches = matches.filter((match) => match.roundId === round.id);

  return calculateProjectedMatchPoints(
    roundMatches,
    round,
    players,
    scores,
    courses,
    scoringSettings
  );
}

export function calculateTeamPointsExcludingRound(
  excludedRoundId: string,
  matches: Match[],
  players: Player[],
  rounds: Round[],
  scores: ScoreEntry[],
  courses: Course[],
  scoringSettings: ScoringSettings
): Record<TeamId, number> {
  const otherMatches = matches.filter((match) => match.roundId !== excludedRoundId);
  const otherRounds = rounds.filter((round) => round.id !== excludedRoundId);

  return calculateTeamPoints(
    otherMatches,
    players,
    otherRounds,
    scores,
    courses,
    scoringSettings
  );
}

export function getCurrentRoundRace(
  totalPoints: number,
  round: Round,
  matches: Match[],
  players: Player[],
  rounds: Round[],
  scores: ScoreEntry[],
  courses: Course[],
  scoringSettings: ScoringSettings
): CurrentRoundRace {
  const confirmedPriorPoints = calculateTeamPointsExcludingRound(
    round.id,
    matches,
    players,
    rounds,
    scores,
    courses,
    scoringSettings
  );

  const currentConfirmedPoints = calculateCurrentRoundConfirmedPoints(
    round,
    matches,
    players,
    scores,
    courses,
    scoringSettings
  );

  const currentProjectedPoints = calculateCurrentRoundProjectedPoints(
    round,
    matches,
    players,
    scores,
    courses,
    scoringSettings
  );

  const confirmedTotalPoints = {
    A: confirmedPriorPoints.A + currentConfirmedPoints.A,
    B: confirmedPriorPoints.B + currentConfirmedPoints.B,
  };

  const projectedTotalPoints = {
    A: confirmedPriorPoints.A + currentProjectedPoints.A,
    B: confirmedPriorPoints.B + currentProjectedPoints.B,
  };

  const currentConfirmedAwarded =
    currentConfirmedPoints.A + currentConfirmedPoints.B;

  const currentProjectedAwarded =
    currentProjectedPoints.A + currentProjectedPoints.B;

  return {
    confirmedPriorPoints,
    currentConfirmedPoints,
    currentProjectedPoints,
    confirmedTotalPoints,
    projectedTotalPoints,
    currentConfirmedRemaining: Math.max(round.pointsAvailable - currentConfirmedAwarded, 0),
    currentProjectedRemaining: Math.max(round.pointsAvailable - currentProjectedAwarded, 0),
    totalProjectedRemaining: Math.max(
      totalPoints - projectedTotalPoints.A - projectedTotalPoints.B,
      0
    ),
  };
}

export function calculateTeamPoints(
  matches: Match[],
  players: Player[],
  rounds: Round[],
  scores: ScoreEntry[],
  courses: Course[],
  scoringSettings: ScoringSettings
): Record<TeamId, number> {
  const matchPoints = calculateMatchPoints(
    matches,
    players,
    rounds,
    scores,
    courses,
    scoringSettings
  );

  const netRounds = rounds.filter((round) => round.format === "net_score");

  const netPoints = netRounds.reduce<Record<TeamId, number>>(
    (acc, round) => {
      const roundPoints = calculateNetScorePoints(
        players,
        round,
        scores,
        courses,
        scoringSettings
      );

      acc.A += roundPoints.A;
      acc.B += roundPoints.B;

      return acc;
    },
    { A: 0, B: 0 }
  );

  return {
    A: matchPoints.A + netPoints.A,
    B: matchPoints.B + netPoints.B,
  };
}

export function buildLeaderboard(
  players: Player[],
  rounds: Round[],
  matches: Match[],
  scores: ScoreEntry[],
  courses: Course[],
  scoringSettings: ScoringSettings
): LeaderboardRow[] {
  return players
    .map((player) => {
      const playerScores = scores.filter(
        (score): score is ScoreEntry & { grossScore: number } =>
          score.playerId === player.id && hasFinalScore(score)
      );

      const totalNetToPar = playerScores.reduce((sum, score) => {
        const round = getRound(rounds, score.roundId);

        if (!round) return sum;

        return (
          sum +
          playerNetToPar(
            player,
            round,
            score.grossScore,
            courses,
            scoringSettings
          )
        );
      }, 0);

      const pointsWon = matches.reduce((sum, match) => {
        const result = resolveMatch(
          match,
          players,
          rounds,
          scores,
          courses,
          scoringSettings
        );

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
        averageNetToPar: playerScores.length
          ? totalNetToPar / playerScores.length
          : null,
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
  courses: Course[],
  scoringSettings: ScoringSettings
): TeamSummary[] {
  const points = calculateTeamPoints(
    matches,
    players,
    rounds,
    scores,
    courses,
    scoringSettings
  );

  return teams.map((team) => {
    const teamPlayers = players.filter((player) => player.team === team.id);

    const totalHandicap = teamPlayers.reduce(
      (sum, player) => sum + player.handicapIndex,
      0
    );

    const completedMatches = matches.filter((match) => {
      const result = resolveMatch(
        match,
        players,
        rounds,
        scores,
        courses,
        scoringSettings
      );

      return result.status === "final" && result.winner === team.id;
    }).length;

    return {
      teamId: team.id,
      teamName: team.name,
      playerCount: teamPlayers.length,
      averageHandicap: teamPlayers.length ? totalHandicap / teamPlayers.length : 0,
      totalHandicap,
      points: points[team.id],
      completedMatches,
    };
  });
}

export function getTournamentProgress(
  totalPoints: number,
  matches: Match[],
  players: Player[],
  rounds: Round[],
  scores: ScoreEntry[],
  courses: Course[],
  scoringSettings: ScoringSettings
) {
  const teamPoints = calculateTeamPoints(
    matches,
    players,
    rounds,
    scores,
    courses,
    scoringSettings
  );

  const awardedPoints = teamPoints.A + teamPoints.B;
  const remainingPoints = Math.max(totalPoints - awardedPoints, 0);

  const progressPercent =
    totalPoints > 0 ? Math.min((awardedPoints / totalPoints) * 100, 100) : 0;

  const leader =
    teamPoints.A > teamPoints.B ? "A" : teamPoints.B > teamPoints.A ? "B" : "T";

  return {
    teamPoints,
    awardedPoints,
    remainingPoints,
    progressPercent,
    leader,
  };
}

export function getTournamentAwards(
  players: Player[],
  rounds: Round[],
  matches: Match[],
  scores: ScoreEntry[],
  courses: Course[],
  scoringSettings: ScoringSettings
) {
  const leaderboard = buildLeaderboard(
    players,
    rounds,
    matches,
    scores,
    courses,
    scoringSettings
  );

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