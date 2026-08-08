// Round setup for the Manage hub: 9 vs 18 holes, and a format/points/handicap
// allowance per TEE TIME (a "segment"). This is what lets one round hold two
// formats - e.g. two tee times playing 2v2 best ball and one playing 1v1.

import type { SupabaseClient } from "@supabase/supabase-js";

export type SegmentFormat = "best_ball" | "match_play" | "net_score" | "scramble" | "casual";

export const FORMAT_LABELS: Record<SegmentFormat, string> = {
  best_ball: "2v2 Best Ball",
  match_play: "1v1 Match Play",
  net_score: "Individual Net",
  scramble: "Scramble",
  casual: "Casual",
};

export type TeeTimeLite = {
  id: string;
  time: string;
  playerCount: number;
};

export type Segment = {
  id?: string;
  teeTimeId: string | null;
  format: SegmentFormat;
  points: number;
  allowancePct: number;
};

export type RoundSetup = {
  id: string;
  roundNumber: number;
  title: string;
  holesCount: number;         // 9 or 18
  nine: "front" | "back" | null;
  teeTimes: TeeTimeLite[];
  segments: Segment[];
};

export async function loadRoundSetups(
  supabase: SupabaseClient,
  tripId: string
): Promise<RoundSetup[]> {
  const { data: rounds } = await supabase
    .from("rounds")
    .select("id,round_number,title,holes_count,nine,tee_times(id,tee_time,tee_time_players(player_id))")
    .eq("trip_id", tripId)
    .order("round_number");
  const list = (rounds ?? []) as Record<string, unknown>[];
  if (list.length === 0) return [];

  const ids = list.map((r) => r.id as string);
  const { data: segs } = await supabase
    .from("round_segments")
    .select("id,round_id,tee_time_id,format,points,allowance_pct")
    .in("round_id", ids)
    .order("sort_order");
  const byRound = new Map<string, Segment[]>();
  ((segs ?? []) as Record<string, unknown>[]).forEach((s) => {
    const arr = byRound.get(s.round_id as string) ?? [];
    arr.push({
      id: s.id as string,
      teeTimeId: (s.tee_time_id as string) ?? null,
      format: (s.format as SegmentFormat) ?? "best_ball",
      points: Number(s.points ?? 0),
      allowancePct: Number(s.allowance_pct ?? 100),
    });
    byRound.set(s.round_id as string, arr);
  });

  return list.map((r) => {
    const tts = ((r.tee_times ?? []) as Record<string, unknown>[])
      .map((t) => ({
        id: t.id as string,
        time: (t.tee_time as string) ?? "",
        playerCount: ((t.tee_time_players ?? []) as unknown[]).length,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
    return {
      id: r.id as string,
      roundNumber: r.round_number as number,
      title: (r.title as string) ?? `Round ${r.round_number}`,
      holesCount: (r.holes_count as number) ?? 18,
      nine: ((r.nine as string) ?? null) as "front" | "back" | null,
      teeTimes: tts,
      segments: byRound.get(r.id as string) ?? [],
    };
  });
}

export async function saveRoundHoles(
  supabase: SupabaseClient,
  roundId: string,
  holesCount: number,
  nine: "front" | "back" | null
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("rounds")
    .update({ holes_count: holesCount, nine: holesCount === 9 ? nine ?? "front" : null })
    .eq("id", roundId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Replaces this round's segments (one per tee time). */
export async function saveSegments(
  supabase: SupabaseClient,
  roundId: string,
  segments: Segment[]
): Promise<{ ok: boolean; error?: string }> {
  const del = await supabase.from("round_segments").delete().eq("round_id", roundId);
  if (del.error) return { ok: false, error: del.error.message };
  if (segments.length === 0) return { ok: true };
  const rows = segments.map((s, i) => ({
    round_id: roundId,
    tee_time_id: s.teeTimeId,
    format: s.format,
    points: s.points,
    allowance_pct: s.allowancePct,
    sort_order: i + 1,
  }));
  const { error } = await supabase.from("round_segments").insert(rows);
  return error ? { ok: false, error: error.message } : { ok: true };
}
