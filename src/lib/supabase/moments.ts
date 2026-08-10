// Big moments that deserve to be seen by people who were not staring at their
// phone when it happened, plus the sticky snowman avatar.

import type { SupabaseClient } from "@supabase/supabase-js";

export type Moment = {
  id: string;
  playerId: string;
  kind: string;
  hole: number | null;
  body: string;
};

export async function recordMoment(
  supabase: SupabaseClient,
  args: { tripId: string; roundId: string; playerId: string; kind: string; hole: number; body: string }
): Promise<void> {
  await supabase.from("round_moments").insert({
    trip_id: args.tripId,
    round_id: args.roundId,
    player_id: args.playerId,
    kind: args.kind,
    hole: args.hole,
    body: args.body,
  });
}

/** Takeover-worthy moments this user hasn't been shown yet. */
export async function loadUnseenMoments(
  supabase: SupabaseClient,
  tripId: string,
  userId: string
): Promise<Moment[]> {
  const { data } = await supabase
    .from("round_moments")
    .select("id,player_id,kind,hole,body")
    .eq("trip_id", tripId)
    .in("kind", ["ace", "albatross", "eagle"])
    .order("created_at", { ascending: false })
    .limit(10);
  const list = ((data ?? []) as Record<string, unknown>[]).map((m) => ({
    id: m.id as string,
    playerId: m.player_id as string,
    kind: m.kind as string,
    hole: (m.hole as number) ?? null,
    body: m.body as string,
  }));
  if (list.length === 0) return [];

  const { data: seen } = await supabase
    .from("moment_seen")
    .select("moment_id")
    .eq("user_id", userId)
    .in(
      "moment_id",
      list.map((m) => m.id)
    );
  const seenIds = new Set(((seen ?? []) as { moment_id: string }[]).map((s) => s.moment_id));
  return list.filter((m) => !seenIds.has(m.id));
}

export async function markMomentSeen(
  supabase: SupabaseClient,
  momentId: string,
  userId: string
): Promise<void> {
  await supabase.from("moment_seen").upsert({ moment_id: momentId, user_id: userId });
}

/** Players currently wearing the snowman. */
export async function loadActiveSnowmen(
  supabase: SupabaseClient,
  tripId: string
): Promise<Set<string>> {
  const { data } = await supabase
    .from("round_moments")
    .select("player_id")
    .eq("trip_id", tripId)
    .eq("kind", "snowman")
    .eq("active", true);
  return new Set(((data ?? []) as { player_id: string }[]).map((r) => r.player_id));
}

/** They earned it off - retire the snowman. */
export async function clearSnowman(
  supabase: SupabaseClient,
  tripId: string,
  playerId: string
): Promise<void> {
  await supabase
    .from("round_moments")
    .update({ active: false })
    .eq("trip_id", tripId)
    .eq("player_id", playerId)
    .eq("kind", "snowman")
    .eq("active", true);
}
