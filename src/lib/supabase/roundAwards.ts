// Reading a round's awards. They are written by the server when the round
// closes; members can only read them.

import type { SupabaseClient } from "@supabase/supabase-js";

export type RoundAward = {
  momentId: string;
  title: string;
  playerIds: string[];
  line: string;
  stat: string;
  tier: number;
  position: number;
  writtenBy: "template" | "ai";
};

export async function fetchRoundAwards(supabase: SupabaseClient, roundId: string): Promise<RoundAward[]> {
  const { data } = await supabase
    .from("round_awards")
    .select("moment_id,title,player_ids,line,stat,tier,position,written_by")
    .eq("round_id", roundId)
    .order("position");
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    momentId: r.moment_id as string,
    title: r.title as string,
    playerIds: (r.player_ids as string[]) ?? [],
    line: r.line as string,
    stat: r.stat as string,
    tier: Number(r.tier ?? 1),
    position: Number(r.position ?? 0),
    writtenBy: r.written_by === "ai" ? "ai" : "template",
  }));
}
