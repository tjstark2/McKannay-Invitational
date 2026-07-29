// Data layer for the Matchup Draw (the `draws` table).
// A `draws` row is the record that an admin DELIBERATELY set a round's matchups
// (by running a draw or by setting them in Admin). Rounds with no row are still
// on auto-generated "provisional" pairings -> that's what the nudge keys off.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DrawMatch, DrawGroup, DrawMethod, DraftLogEntry } from "@/features/trip/draw/drawCompute";

export type SavedDraw = {
  id: string;
  roundId: string;
  method: DrawMethod;
  matches: DrawMatch[];
  groups: DrawGroup[];
  draftLog: DraftLogEntry[];
  coinWinner: "A" | "B" | null;
  posted: boolean;
  ranAt: string;
};

export type SaveDrawInput = {
  tripId: string;
  roundId: string;
  method: DrawMethod;
  runBy: string | null;
  matches?: DrawMatch[];
  groups?: DrawGroup[];
  draftLog?: DraftLogEntry[];
  coinWinner?: "A" | "B" | null;
  posted?: boolean;
};

// Upsert the draw for a round (one row per round; a re-draw replaces it).
export async function saveDraw(
  supabase: SupabaseClient,
  input: SaveDrawInput
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("draws")
    .upsert(
      {
        trip_id: input.tripId,
        round_id: input.roundId,
        method: input.method,
        run_by: input.runBy,
        ran_at: new Date().toISOString(),
        matches: input.matches ?? [],
        groups: input.groups ?? [],
        draft_log: input.draftLog ?? [],
        coin_winner: input.coinWinner ?? null,
        posted: input.posted ?? false,
      },
      { onConflict: "round_id" }
    );
  return error ? { ok: false, error: error.message } : { ok: true };
}

function mapRow(row: Record<string, unknown>): SavedDraw {
  return {
    id: row.id as string,
    roundId: row.round_id as string,
    method: row.method as DrawMethod,
    matches: (row.matches as DrawMatch[]) ?? [],
    groups: (row.groups as DrawGroup[]) ?? [],
    draftLog: (row.draft_log as DraftLogEntry[]) ?? [],
    coinWinner: (row.coin_winner as "A" | "B" | null) ?? null,
    posted: Boolean(row.posted),
    ranAt: (row.ran_at as string) ?? "",
  };
}

export async function loadDraw(
  supabase: SupabaseClient,
  roundId: string
): Promise<SavedDraw | null> {
  const { data } = await supabase
    .from("draws")
    .select("id,round_id,method,matches,groups,draft_log,coin_winner,posted,ran_at")
    .eq("round_id", roundId)
    .maybeSingle();
  return data ? mapRow(data as Record<string, unknown>) : null;
}

// Which of this trip's rounds already have a saved draw (matchups deliberately
// set). Used by the "needs matchups" nudge to tell set vs provisional.
export async function roundIdsWithDraw(
  supabase: SupabaseClient,
  tripId: string
): Promise<Set<string>> {
  const { data } = await supabase
    .from("draws")
    .select("round_id")
    .eq("trip_id", tripId);
  return new Set(((data ?? []) as { round_id: string }[]).map((r) => r.round_id));
}
