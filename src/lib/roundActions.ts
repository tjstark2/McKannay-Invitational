// Round actions that have to run on the server, shared by every button that
// triggers them - so no screen can quietly take a shortcut again.

import { getSupabaseClient } from "@/lib/supabase/client";
import { notifyEvent } from "@/lib/notify";

async function post(path: string, body: unknown): Promise<{ ok: boolean; error?: string; [k: string]: unknown }> {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: "No connection to the database." };
  const { data: sess } = await sb.auth.getSession();
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sess.session?.access_token ?? ""}`,
    },
    body: JSON.stringify(body),
  }).catch(() => null);
  if (!res) return { ok: false, error: "No connection." };
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  return { ...json, ok: res.ok && Boolean(json.ok), error: json.error };
}

/**
 * Finish a round properly: match results, card totals, confirmations, next
 * round, awards, and everyone told. Stamping finished_at directly skips all
 * of that - which is how points went missing on the 2026 trip.
 */
export async function finishRound(roundId: string, tripId: string) {
  const result = await post("/api/rounds/finalize", { roundId });
  if (result.ok) void notifyEvent("voting_concluded_sweep", tripId);
  return result;
}

/** Work a finished round's awards out again from the current scores. Organizers only. */
export async function rebuildAwards(roundId: string) {
  return post("/api/rounds/awards", { roundId });
}
