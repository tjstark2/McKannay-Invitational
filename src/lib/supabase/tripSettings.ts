// Settings data layer for the Manage hub (outside-the-tournament control panel).
// resolveTrip() only returns the trip_card essentials; this loads/saves the full
// settings surface, including scoring_mode (the top-of-tree Pro discriminator).

import type { SupabaseClient } from "@supabase/supabase-js";

export type ScoringMode = "basic_918" | "hole_by_hole";

export type TripSettings = {
  id: string;
  name: string;
  joinCode: string;
  location: string | null;
  state: string | null;
  dates: string | null;
  lodgingName: string | null;
  lodgingAddress: string | null;
  logisticsNotes: string | null;
  totalPoints: number | null;
  winningNumber: number | null;
  retainNumber: number | null;
  isPro: boolean;
  scoringMode: ScoringMode;
};

/** Round progress - drives the scoring-mode toggle guardrails. */
export type RoundProgress = {
  completed: number;   // rounds with a finish time
  inProgress: number;  // started but not finished
  total: number;
};

export async function loadTripSettings(
  supabase: SupabaseClient,
  tripId: string
): Promise<TripSettings | null> {
  const { data } = await supabase
    .from("trips")
    .select(
      "id,name,join_code,location,state,dates,lodging_name,lodging_address,logistics_notes,total_points,winning_number,retain_number,is_pro,scoring_mode"
    )
    .eq("id", tripId)
    .maybeSingle();
  if (!data) return null;
  const t = data as Record<string, unknown>;
  return {
    id: t.id as string,
    name: (t.name as string) ?? "",
    joinCode: (t.join_code as string) ?? "",
    location: (t.location as string) ?? null,
    state: (t.state as string) ?? null,
    dates: (t.dates as string) ?? null,
    lodgingName: (t.lodging_name as string) ?? null,
    lodgingAddress: (t.lodging_address as string) ?? null,
    logisticsNotes: (t.logistics_notes as string) ?? null,
    totalPoints: (t.total_points as number) ?? null,
    winningNumber: (t.winning_number as number) ?? null,
    retainNumber: (t.retain_number as number) ?? null,
    isPro: Boolean(t.is_pro),
    scoringMode: ((t.scoring_mode as string) ?? "basic_918") as ScoringMode,
  };
}

export async function loadRoundProgress(
  supabase: SupabaseClient,
  tripId: string
): Promise<RoundProgress> {
  const { data } = await supabase
    .from("rounds")
    .select("started_at,finished_at")
    .eq("trip_id", tripId);
  const rows = (data ?? []) as { started_at: string | null; finished_at: string | null }[];
  return {
    completed: rows.filter((r) => r.finished_at).length,
    inProgress: rows.filter((r) => r.started_at && !r.finished_at).length,
    total: rows.length,
  };
}

export type TripSettingsPatch = Partial<{
  name: string;
  location: string | null;
  state: string | null;
  dates: string | null;
  lodgingName: string | null;
  lodgingAddress: string | null;
  logisticsNotes: string | null;
  totalPoints: number | null;
  winningNumber: number | null;
  retainNumber: number | null;
  scoringMode: ScoringMode;
}>;

// NOTE: join_code is deliberately NOT updatable - it is display-only once created.
export async function saveTripSettings(
  supabase: SupabaseClient,
  tripId: string,
  patch: TripSettingsPatch
): Promise<{ ok: boolean; error?: string }> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.location !== undefined) row.location = patch.location;
  if (patch.state !== undefined) row.state = patch.state;
  if (patch.dates !== undefined) row.dates = patch.dates;
  if (patch.lodgingName !== undefined) row.lodging_name = patch.lodgingName;
  if (patch.lodgingAddress !== undefined) row.lodging_address = patch.lodgingAddress;
  if (patch.logisticsNotes !== undefined) row.logistics_notes = patch.logisticsNotes;
  if (patch.totalPoints !== undefined) row.total_points = patch.totalPoints;
  if (patch.winningNumber !== undefined) row.winning_number = patch.winningNumber;
  if (patch.retainNumber !== undefined) row.retain_number = patch.retainNumber;
  if (patch.scoringMode !== undefined) row.scoring_mode = patch.scoringMode;
  if (Object.keys(row).length === 0) return { ok: true };
  const { error } = await supabase.from("trips").update(row).eq("id", tripId);
  return error ? { ok: false, error: error.message } : { ok: true };
}
