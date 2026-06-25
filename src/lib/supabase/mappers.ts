// Translates between Supabase database rows (snake_case, join tables, UUIDs)
// and the app's domain types (camelCase, embedded arrays). Keeping this in one
// file means the rest of the app never has to know the database's shape.

import type {
  Course,
  Match,
  GroupScore,
  Player,
  Round,
  ScoreEntry,
  ScoringSettings,
  Team,
  TeamId,
  TeeTime,
  Trip,
  Winner,
} from "@/types";

// ---- Loosely-typed DB row shapes (only the columns we read) ----------------

export type TripRow = {
  id: string;
  name: string;
  location: string | null;
  dates: string | null;
  join_code: string;
  series_id: string | null;
  admin_code: string | null;
  lodging_name: string | null;
  lodging_address: string | null;
  total_points: number | null;
  winning_number: number | null;
  retain_number: number | null;
  defending_team: string | null;
  current_round_id: string | null;
  default_format: string | null;
};

export type ScoringSettingsRow = {
  trip_id: string;
  best_ball_handicap_allowance: number | null;
  singles_handicap_allowance: number | null;
  net_score_handicap_allowance: number | null;
  net_score_points_override: number | null;
};

export type TeamRow = {
  id: string;
  name: string;
  code: string;
  color: string | null;
};

export type PlayerRow = {
  id: string;
  team_id: string | null;
  display_name: string;
  handicap_index: number | null;
  avatar_emoji: string | null;
  sort_order: number | null;
  account_id: string | null;
};

export type CourseRow = {
  id: string;
  name: string;
  location: string | null;
  address: string | null;
  par: number | null;
  course_rating: number | null;
  slope: number | null;
  tee_name: string | null;
  yardage: number | null;
  image_url: string | null;
  notes: string | null;
};

export type TeeTimePlayerRow = { player_id: string };

export type TeeTimeRow = {
  id: string;
  tee_time: string | null;
  sort_order: number | null;
  tee_time_players: TeeTimePlayerRow[] | null;
};

export type MatchPlayerRow = { player_id: string; side: string };

export type MatchRow = {
  id: string;
  label: string | null;
  points: number | null;
  manual_result: string | null;
  sort_order: number | null;
  match_players: MatchPlayerRow[] | null;
};

export type RoundRow = {
  id: string;
  course_id: string | null;
  round_number: number;
  title: string | null;
  date_label: string | null;
  format: string;
  group_size: number | null;
  points_available: number | null;
  arrival_time: string | null;
  sort_order: number | null;
  tee_times: TeeTimeRow[] | null;
  matches: MatchRow[] | null;
};

export type ScoreRow = {
  round_id: string;
  player_id: string;
  front_nine_score: number | null;
  gross_score: number | null;
};

// ---- Row -> domain ---------------------------------------------------------

export function mapTrip(row: TripRow): Trip {
  return {
    id: row.id,
    name: row.name,
    location: row.location ?? "",
    dates: row.dates ?? "",
    joinCode: row.join_code,
    seriesId: row.series_id ?? null,
    adminCode: row.admin_code ?? null,
    lodgingName: row.lodging_name ?? "",
    lodgingAddress: row.lodging_address ?? "",
    totalPoints: Number(row.total_points ?? 0),
    winningNumber: Number(row.winning_number ?? 0),
    retainNumber: Number(row.retain_number ?? 0),
    defendingTeam: (row.defending_team as TeamId | null) ?? null,
    defaultFormat: row.default_format ?? null,
  };
}

export function mapScoringSettings(
  row: ScoringSettingsRow | null
): ScoringSettings {
  return {
    bestBallHandicapAllowance: Number(row?.best_ball_handicap_allowance ?? 0),
    singlesHandicapAllowance: Number(row?.singles_handicap_allowance ?? 100),
    netScoreHandicapAllowance: Number(row?.net_score_handicap_allowance ?? 100),
    netScorePointsOverride:
      row?.net_score_points_override ?? null,
  };
}

export function mapTeam(row: TeamRow): Team {
  return {
    id: row.code as TeamId,
    name: row.name,
    color: (row.color as Team["color"]) ?? (row.code === "A" ? "red" : "blue"),
  };
}

export function mapPlayer(
  row: PlayerRow,
  teamCodeById: Map<string, TeamId>
): Player {
  return {
    id: row.id,
    name: row.display_name,
    team: (row.team_id ? teamCodeById.get(row.team_id) : undefined) ?? "A",
    handicapIndex: Number(row.handicap_index ?? 0),
    avatarEmoji: row.avatar_emoji ?? undefined,
    accountId: row.account_id ?? undefined,
  };
}

export function mapCourse(row: CourseRow): Course {
  return {
    id: row.id,
    name: row.name,
    location: row.location ?? "",
    address: row.address ?? "",
    par: Number(row.par ?? 72),
    rating: Number(row.course_rating ?? 72),
    slope: Number(row.slope ?? 113),
    teeName: row.tee_name ?? "Blue",
    yardage:
      row.yardage === null || row.yardage === undefined
        ? null
        : Number(row.yardage),
    imageUrl: row.image_url ?? "",
    notes: row.notes ?? "",
  };
}

function mapTeeTime(row: TeeTimeRow): TeeTime {
  return {
    id: row.id,
    time: row.tee_time ?? "",
    players: (row.tee_time_players ?? []).map((p) => p.player_id),
  };
}

export function mapRound(row: RoundRow): Round {
  const teeTimes = (row.tee_times ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(mapTeeTime);

  return {
    id: row.id,
    roundNumber: row.round_number,
    title: row.title ?? `Round ${row.round_number}`,
    dateLabel: row.date_label ?? "",
    courseId: row.course_id ?? "",
    format: row.format as Round["format"],
    groupSize: row.group_size ?? null,
    pointsAvailable: Number(row.points_available ?? 0),
    arrivalTime: row.arrival_time ?? "",
    teeTimes,
  };
}

export function mapMatch(
  row: MatchRow,
  roundId: string,
  playerSortOrder: Map<string, number>
): Match {
  const sideSorted = (side: "A" | "B") =>
    (row.match_players ?? [])
      .filter((mp) => mp.side === side)
      .map((mp) => mp.player_id)
      .sort(
        (a, b) => (playerSortOrder.get(a) ?? 0) - (playerSortOrder.get(b) ?? 0)
      );

  return {
    id: row.id,
    roundId,
    label: row.label ?? "",
    points: Number(row.points ?? 0),
    aPlayers: sideSorted("A"),
    bPlayers: sideSorted("B"),
    manualResult: (row.manual_result as Winner) ?? null,
  };
}

export function mapScore(row: ScoreRow): ScoreEntry {
  return {
    roundId: row.round_id,
    playerId: row.player_id,
    frontNineScore: row.front_nine_score ?? undefined,
    grossScore: row.gross_score ?? undefined,
  };
}

export type GroupScoreRow = {
  match_id: string;
  side: string;
  front_nine_score: number | null;
  gross_score: number | null;
};

export function mapGroupScore(row: GroupScoreRow): GroupScore {
  return {
    matchId: row.match_id,
    side: row.side === "B" ? "B" : "A",
    frontNineScore: row.front_nine_score ?? undefined,
    grossScore: row.gross_score ?? undefined,
  };
}
