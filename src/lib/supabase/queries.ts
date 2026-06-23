// All Supabase reads and writes for a trip live here. The TripState context
// calls these; nothing else touches the database directly.

import type { SupabaseClient } from "@supabase/supabase-js";
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
import {
  mapCourse,
  mapMatch,
  mapPlayer,
  mapRound,
  mapScore,
  mapScoringSettings,
  mapTeam,
  mapTrip,
  type CourseRow,
  type PlayerRow,
  type RoundRow,
  type ScoreRow,
  type ScoringSettingsRow,
  type TeamRow,
  type TripRow,
} from "@/lib/supabase/mappers";

function throwIf(error: { message: string } | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

// ---- LOAD ------------------------------------------------------------------

export type LoadedTrip = {
  state: TripState;
  teamDbIds: { id: TeamId; dbId: string }[];
};

export async function loadTripState(
  supabase: SupabaseClient,
  joinCode: string
): Promise<LoadedTrip> {
  const tripResult = await supabase
    .from("trips")
    .select("*")
    .eq("join_code", joinCode)
    .single();
  throwIf(tripResult.error, "load trip");
  const tripRow = tripResult.data as TripRow;
  const tripId = tripRow.id;

  const [
    scoringResult,
    teamsResult,
    playersResult,
    coursesResult,
    roundsResult,
  ] = await Promise.all([
    supabase.from("scoring_settings").select("*").eq("trip_id", tripId).maybeSingle(),
    supabase.from("teams").select("*").eq("trip_id", tripId),
    supabase.from("players").select("*").eq("trip_id", tripId).order("sort_order"),
    supabase.from("courses").select("*").eq("trip_id", tripId),
    supabase
      .from("rounds")
      .select(
        "*, tee_times(*, tee_time_players(player_id)), matches(*, match_players(player_id, side))"
      )
      .eq("trip_id", tripId)
      .order("round_number"),
  ]);

  throwIf(teamsResult.error, "load teams");
  throwIf(playersResult.error, "load players");
  throwIf(coursesResult.error, "load courses");
  throwIf(roundsResult.error, "load rounds");

  const teamRows = (teamsResult.data ?? []) as TeamRow[];
  const playerRows = (playersResult.data ?? []) as PlayerRow[];
  const courseRows = (coursesResult.data ?? []) as CourseRow[];
  const roundRows = (roundsResult.data ?? []) as RoundRow[];

  // Lookups for mapping.
  const teamCodeById = new Map<string, TeamId>();
  teamRows.forEach((t) => teamCodeById.set(t.id, t.code as TeamId));

  const playerSortOrder = new Map<string, number>();
  playerRows.forEach((p, index) =>
    playerSortOrder.set(p.id, p.sort_order ?? index)
  );

  // Scores for these rounds.
  const roundIds = roundRows.map((r) => r.id);
  let scoreRows: ScoreRow[] = [];
  if (roundIds.length > 0) {
    const scoresResult = await supabase
      .from("score_entries")
      .select("*")
      .in("round_id", roundIds);
    throwIf(scoresResult.error, "load scores");
    scoreRows = (scoresResult.data ?? []) as ScoreRow[];
  }

  const teams: Team[] = teamRows
    .map(mapTeam)
    .sort((a, b) => a.id.localeCompare(b.id));
  const players: Player[] = playerRows.map((row) =>
    mapPlayer(row, teamCodeById)
  );
  const courses = courseRows.map(mapCourse);
  const rounds: Round[] = roundRows.map(mapRound);

  const matches: Match[] = roundRows.flatMap((roundRow) =>
    (roundRow.matches ?? [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((m) => mapMatch(m, roundRow.id, playerSortOrder))
  );

  const scores = scoreRows.map(mapScore);
  const scoringSettings = mapScoringSettings(
    (scoringResult.data as ScoringSettingsRow | null) ?? null
  );

  const currentRoundId =
    tripRow.current_round_id ?? rounds[0]?.id ?? "";

  const teamDbIds = teamRows.map((t) => ({
    id: t.code as TeamId,
    dbId: t.id,
  }));

  return {
    state: {
      trip: mapTrip(tripRow),
      teams,
      players,
      courses,
      rounds,
      matches,
      scores,
      scoringSettings,
      currentRoundId,
    },
    teamDbIds,
  };
}

// ---- WRITES ----------------------------------------------------------------

export async function persistTripUpdates(
  supabase: SupabaseClient,
  tripId: string,
  updates: Partial<Trip>
) {
  const row: Record<string, unknown> = {};
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.location !== undefined) row.location = updates.location;
  if (updates.dates !== undefined) row.dates = updates.dates;
  if (updates.joinCode !== undefined) row.join_code = updates.joinCode;
  if (updates.lodgingName !== undefined) row.lodging_name = updates.lodgingName;
  if (updates.lodgingAddress !== undefined)
    row.lodging_address = updates.lodgingAddress;
  if (updates.totalPoints !== undefined) row.total_points = updates.totalPoints;
  if (updates.winningNumber !== undefined)
    row.winning_number = updates.winningNumber;
  if (updates.retainNumber !== undefined)
    row.retain_number = updates.retainNumber;
  if (updates.defendingTeam !== undefined)
    row.defending_team = updates.defendingTeam;

  if (Object.keys(row).length === 0) return;
  const { error } = await supabase.from("trips").update(row).eq("id", tripId);
  throwIf(error, "update trip");
}

export async function persistTeam(
  supabase: SupabaseClient,
  tripId: string,
  teamId: TeamId,
  updates: Partial<Team>
) {
  const row: Record<string, unknown> = {};
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.color !== undefined) row.color = updates.color;
  if (Object.keys(row).length === 0) return;
  const { error } = await supabase
    .from("teams")
    .update(row)
    .eq("trip_id", tripId)
    .eq("code", teamId);
  throwIf(error, "update team");
}

export async function persistPlayer(
  supabase: SupabaseClient,
  playerId: string,
  updates: Partial<Player>,
  teams: { id: TeamId; dbId: string }[]
) {
  const row: Record<string, unknown> = {};
  if (updates.name !== undefined) row.display_name = updates.name;
  if (updates.handicapIndex !== undefined)
    row.handicap_index = updates.handicapIndex;
  if (updates.avatarEmoji !== undefined) row.avatar_emoji = updates.avatarEmoji;
  if (updates.team !== undefined) {
    const team = teams.find((t) => t.id === updates.team);
    if (team) row.team_id = team.dbId;
  }
  if (Object.keys(row).length === 0) return;
  const { error } = await supabase.from("players").update(row).eq("id", playerId);
  throwIf(error, "update player");
}

export async function persistRoundUpdates(
  supabase: SupabaseClient,
  roundId: string,
  updates: Partial<Round>
) {
  const row: Record<string, unknown> = {};
  if (updates.title !== undefined) row.title = updates.title;
  if (updates.dateLabel !== undefined) row.date_label = updates.dateLabel;
  if (updates.arrivalTime !== undefined) row.arrival_time = updates.arrivalTime;
  if (updates.format !== undefined) row.format = updates.format;
  if (updates.pointsAvailable !== undefined)
    row.points_available = updates.pointsAvailable;
  if (updates.courseId !== undefined) row.course_id = updates.courseId;
  if (Object.keys(row).length === 0) return;
  const { error } = await supabase.from("rounds").update(row).eq("id", roundId);
  throwIf(error, "update round");
}

export async function persistCurrentRound(
  supabase: SupabaseClient,
  tripId: string,
  roundId: string
) {
  const { error } = await supabase
    .from("trips")
    .update({ current_round_id: roundId })
    .eq("id", tripId);
  throwIf(error, "update current round");
}

export async function persistTeeTime(
  supabase: SupabaseClient,
  teeTimeId: string,
  time: string
) {
  const { error } = await supabase
    .from("tee_times")
    .update({ tee_time: time })
    .eq("id", teeTimeId);
  throwIf(error, "update tee time");
}

export async function persistMatchUpdates(
  supabase: SupabaseClient,
  matchId: string,
  updates: Partial<Match>
) {
  const row: Record<string, unknown> = {};
  if (updates.label !== undefined) row.label = updates.label;
  if (updates.points !== undefined) row.points = updates.points;
  if (Object.keys(row).length === 0) return;
  const { error } = await supabase.from("matches").update(row).eq("id", matchId);
  throwIf(error, "update match");
}

export async function persistManualResult(
  supabase: SupabaseClient,
  matchId: string,
  result: Winner
) {
  const { error } = await supabase
    .from("matches")
    .update({ manual_result: result })
    .eq("id", matchId);
  throwIf(error, "update manual result");
}

export async function persistMatchPlayers(
  supabase: SupabaseClient,
  matchId: string,
  aPlayers: string[],
  bPlayers: string[]
) {
  const del = await supabase
    .from("match_players")
    .delete()
    .eq("match_id", matchId);
  throwIf(del.error, "clear match players");

  const rows = [
    ...aPlayers.filter(Boolean).map((player_id) => ({
      match_id: matchId,
      player_id,
      side: "A",
    })),
    ...bPlayers.filter(Boolean).map((player_id) => ({
      match_id: matchId,
      player_id,
      side: "B",
    })),
  ];
  if (rows.length === 0) return;
  const ins = await supabase.from("match_players").insert(rows);
  throwIf(ins.error, "insert match players");
}

export async function persistScoringSettings(
  supabase: SupabaseClient,
  tripId: string,
  updates: Partial<ScoringSettings>
) {
  const row: Record<string, unknown> = { trip_id: tripId };
  if (updates.bestBallHandicapAllowance !== undefined)
    row.best_ball_handicap_allowance = updates.bestBallHandicapAllowance;
  if (updates.singlesHandicapAllowance !== undefined)
    row.singles_handicap_allowance = updates.singlesHandicapAllowance;
  if (updates.netScoreHandicapAllowance !== undefined)
    row.net_score_handicap_allowance = updates.netScoreHandicapAllowance;

  const { error } = await supabase
    .from("scoring_settings")
    .upsert(row, { onConflict: "trip_id" });
  throwIf(error, "update scoring settings");
}

export async function upsertScoreRow(
  supabase: SupabaseClient,
  score: ScoreEntry
) {
  const row = {
    round_id: score.roundId,
    player_id: score.playerId,
    front_nine_score:
      typeof score.frontNineScore === "number" ? score.frontNineScore : null,
    gross_score:
      typeof score.grossScore === "number" ? score.grossScore : null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("score_entries")
    .upsert(row, { onConflict: "round_id,player_id" });
  throwIf(error, "save score");
}

// Rebuild all matches for a round after a format change. Deletes the round's
// matches (cascades to match_players) and recreates them from `matches`.
export async function persistRoundMatchesRebuild(
  supabase: SupabaseClient,
  roundId: string,
  matches: Match[]
) {
  const del = await supabase.from("matches").delete().eq("round_id", roundId);
  throwIf(del.error, "clear round matches");

  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    const insertResult = await supabase
      .from("matches")
      .insert({
        round_id: roundId,
        label: match.label,
        points: match.points,
        manual_result: match.manualResult ?? null,
        sort_order: i + 1,
      })
      .select("id")
      .single();
    throwIf(insertResult.error, "insert rebuilt match");

    const newMatchId = (insertResult.data as { id: string }).id;
    await persistMatchPlayers(
      supabase,
      newMatchId,
      match.aPlayers,
      match.bPlayers
    );
  }
}