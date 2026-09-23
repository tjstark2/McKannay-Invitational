// Everything a series needs, in one load.
//
// A series spans trips, so this reaches across them: the trips themselves,
// every player row (linked to accounts so a person is one person across
// years), every resolved match, and gross scores for best-round records.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildCareerTable,
  type CareerMatch,
  type CareerPlayer,
  type CareerRow,
  type CareerTrip,
} from "@/features/series/career";

export type SeriesInfo = { id: string; name: string };

export type SeriesOverview = {
  series: SeriesInfo;
  trips: (CareerTrip & { joinCode: string; teamNames: Record<string, string> })[];
  careers: CareerRow[];
  players: CareerPlayer[];
  matches: CareerMatch[];
};

/** The series this person can see. Row level security does the filtering. */
export async function loadMySeries(supabase: SupabaseClient): Promise<SeriesInfo[]> {
  const { data } = await supabase.from("series").select("id,name").order("name");
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    name: r.name as string,
  }));
}

export async function loadSeriesOverview(
  supabase: SupabaseClient,
  seriesId: string
): Promise<SeriesOverview | null> {
  const { data: sRow } = await supabase
    .from("series")
    .select("id,name")
    .eq("id", seriesId)
    .maybeSingle();
  if (!sRow) return null;
  const series = { id: (sRow as Record<string, unknown>).id as string, name: (sRow as Record<string, unknown>).name as string };

  const { data: tRows } = await supabase
    .from("trips")
    .select("id,name,join_code,series_sequence,final_points_a,final_points_b,winner_team,completed_at")
    .eq("series_id", seriesId)
    .order("series_sequence", { ascending: true });
  const tripRows = (tRows ?? []) as Record<string, unknown>[];
  const tripIds = tripRows.map((t) => t.id as string);
  if (tripIds.length === 0) {
    return { series, trips: [], careers: [], players: [], matches: [] };
  }

  const [teamRes, playerRes, roundRes] = await Promise.all([
    supabase.from("teams").select("id,trip_id,code,name").in("trip_id", tripIds),
    supabase.from("players").select("id,trip_id,account_id,display_name,team_id").in("trip_id", tripIds),
    supabase.from("rounds").select("id,trip_id").in("trip_id", tripIds),
  ]);

  const teams = (teamRes.data ?? []) as Record<string, unknown>[];
  const teamCode = new Map(teams.map((t) => [t.id as string, t.code as string]));

  const players: CareerPlayer[] = ((playerRes.data ?? []) as Record<string, unknown>[]).map((p) => ({
    id: p.id as string,
    tripId: p.trip_id as string,
    accountId: (p.account_id as string) ?? null,
    name: (p.display_name as string) ?? "-",
    team: p.team_id ? teamCode.get(p.team_id as string) ?? null : null,
  }));

  const rounds = (roundRes.data ?? []) as Record<string, unknown>[];
  const tripOfRound = new Map(rounds.map((r) => [r.id as string, r.trip_id as string]));
  const roundIds = rounds.map((r) => r.id as string);

  let matches: CareerMatch[] = [];
  let scores: { tripId: string; playerId: string; gross: number | null }[] = [];
  if (roundIds.length > 0) {
    const [mRes, sRes] = await Promise.all([
      supabase
        .from("matches")
        .select("id,round_id,points,manual_result,match_players(player_id,side)")
        .in("round_id", roundIds),
      supabase.from("score_entries").select("round_id,player_id,gross_score").in("round_id", roundIds),
    ]);
    matches = ((mRes.data ?? []) as Record<string, unknown>[]).map((m) => {
      const mp = (m.match_players ?? []) as { player_id: string; side: string }[];
      return {
        id: m.id as string,
        tripId: tripOfRound.get(m.round_id as string) ?? "",
        points: Number(m.points ?? 0),
        result: (m.manual_result as string) ?? null,
        aPlayers: mp.filter((x) => x.side === "A").map((x) => x.player_id),
        bPlayers: mp.filter((x) => x.side === "B").map((x) => x.player_id),
      };
    });
    scores = ((sRes.data ?? []) as Record<string, unknown>[]).map((s) => ({
      tripId: tripOfRound.get(s.round_id as string) ?? "",
      playerId: s.player_id as string,
      gross: (s.gross_score as number) ?? null,
    }));
  }

  const trips = tripRows.map((t, i) => {
    const names: Record<string, string> = {};
    for (const tm of teams.filter((x) => x.trip_id === t.id)) {
      names[tm.code as string] = (tm.name as string) ?? `Team ${tm.code}`;
    }
    return {
      id: t.id as string,
      name: (t.name as string) ?? "Trip",
      joinCode: (t.join_code as string) ?? "",
      sequence: (t.series_sequence as number) ?? i + 1,
      finalA: (t.final_points_a as number) ?? null,
      finalB: (t.final_points_b as number) ?? null,
      winner: (t.winner_team as string) ?? null,
      completedAt: (t.completed_at as string) ?? null,
      teamNames: names,
    };
  });

  return {
    series,
    trips,
    careers: buildCareerTable({ trips, players, matches, scores }),
    players,
    matches,
  };
}
