// Round setup + day-of controls for the Manage hub.
//
// IMPORTANT: changing a round's format rebuilds that round's matches. That
// logic used to live in TripStateContext (in-tournament Admin). It is ported
// here as a PURE function (buildMatchesForFormat) so both paths produce the
// exact same pairings - if this drifts, matches silently stop matching the
// format, which is far worse than a visible error.

import type { SupabaseClient } from "@supabase/supabase-js";

export type BuiltMatch = {
  label: string;
  points: number;
  aPlayers: string[];
  bPlayers: string[];
};

/** Pure port of the original updateRoundFormat match builder. */
export function buildMatchesForFormat(
  roundTitle: string,
  format: string,
  groupSize: number | null,
  teamAPlayers: string[],
  teamBPlayers: string[]
): BuiltMatch[] {
  const gs = groupSize ?? null;

  if (gs && (format === "scramble" || format === "best_ball")) {
    const groupCount = Math.floor(Math.min(teamAPlayers.length, teamBPlayers.length) / gs);
    return Array.from({ length: groupCount }, (_, i) => {
      const start = i * gs;
      return {
        label: `${roundTitle} Group ${i + 1}`,
        points: 1,
        aPlayers: teamAPlayers.slice(start, start + gs),
        bPlayers: teamBPlayers.slice(start, start + gs),
      };
    });
  }

  if (!gs && format === "best_ball") {
    const pairCount = Math.floor(Math.min(teamAPlayers.length, teamBPlayers.length) / 2);
    return Array.from({ length: pairCount }, (_, i) => {
      const start = i * 2;
      return {
        label: `${roundTitle} Best Ball ${i + 1}`,
        points: 2,
        aPlayers: teamAPlayers.slice(start, start + 2),
        bPlayers: teamBPlayers.slice(start, start + 2),
      };
    });
  }

  if (format === "match_play") {
    const count = Math.min(teamAPlayers.length, teamBPlayers.length);
    return Array.from({ length: count }, (_, i) => ({
      label: `${roundTitle} Singles ${i + 1}`,
      points: 1,
      aPlayers: [teamAPlayers[i]],
      bPlayers: [teamBPlayers[i]],
    }));
  }

  // net_score / casual are field formats - no head-to-head matches.
  return [];
}

export type RosterPlayerLite = { id: string; name: string; team: "A" | "B"; accountId: string | null };

export async function loadRoster(
  supabase: SupabaseClient,
  tripId: string
): Promise<RosterPlayerLite[]> {
  const { data: teams } = await supabase.from("teams").select("id,code").eq("trip_id", tripId);
  const codeById = new Map(
    ((teams ?? []) as { id: string; code: string }[]).map((t) => [t.id, t.code])
  );
  const { data } = await supabase
    .from("players")
    .select("id,display_name,team_id,sort_order,account_id")
    .eq("trip_id", tripId)
    .order("sort_order");
  return ((data ?? []) as Record<string, unknown>[]).map((p) => ({
    id: p.id as string,
    name: (p.display_name as string) ?? "Player",
    team: ((codeById.get(p.team_id as string) as "A" | "B") ?? "A"),
    accountId: (p.account_id as string) ?? null,
  }));
}

export async function createRound(
  supabase: SupabaseClient,
  tripId: string,
  input: { title: string; roundNumber: number; courseId: string | null; dateLabel: string; arrivalTime: string }
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const { data, error } = await supabase
    .from("rounds")
    .insert({
      trip_id: tripId,
      round_number: input.roundNumber,
      title: input.title,
      course_id: input.courseId,
      date_label: input.dateLabel,
      arrival_time: input.arrivalTime,
      format: "best_ball",
      group_size: 2,
      points_available: 0,
      holes_count: 18,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: (data as { id: string }).id };
}

export async function updateRoundFields(
  supabase: SupabaseClient,
  roundId: string,
  patch: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("rounds").update(patch).eq("id", roundId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteRound(supabase: SupabaseClient, roundId: string): Promise<void> {
  await supabase.from("rounds").delete().eq("id", roundId);
}

/**
 * Change a round's format AND rebuild its matches to match. Destructive:
 * existing matches (and their scores) for that round are replaced.
 */
export async function setRoundFormatAndRebuild(
  supabase: SupabaseClient,
  round: { id: string; title: string },
  format: string,
  groupSize: number | null,
  roster: RosterPlayerLite[]
): Promise<{ ok: boolean; error?: string; built: number }> {
  const a = roster.filter((p) => p.team === "A").map((p) => p.id);
  const b = roster.filter((p) => p.team === "B").map((p) => p.id);
  const built = buildMatchesForFormat(round.title, format, groupSize, a, b);

  const up = await supabase
    .from("rounds")
    .update({ format, group_size: groupSize })
    .eq("id", round.id);
  if (up.error) return { ok: false, error: up.error.message, built: 0 };

  const del = await supabase.from("matches").delete().eq("round_id", round.id);
  if (del.error) return { ok: false, error: del.error.message, built: 0 };

  for (let i = 0; i < built.length; i++) {
    const m = built[i];
    const ins = await supabase
      .from("matches")
      .insert({ round_id: round.id, label: m.label, points: m.points, sort_order: i + 1 })
      .select("id")
      .single();
    if (ins.error) return { ok: false, error: ins.error.message, built: i };
    const matchId = (ins.data as { id: string }).id;
    const rows = [
      ...m.aPlayers.filter(Boolean).map((pid) => ({ match_id: matchId, player_id: pid, side: "A" })),
      ...m.bPlayers.filter(Boolean).map((pid) => ({ match_id: matchId, player_id: pid, side: "B" })),
    ];
    if (rows.length > 0) {
      const mp = await supabase.from("match_players").insert(rows);
      if (mp.error) return { ok: false, error: mp.error.message, built: i };
    }
  }
  return { ok: true, built: built.length };
}

// ---- tee times -------------------------------------------------------------

export async function addTeeTime(
  supabase: SupabaseClient,
  roundId: string,
  time: string,
  sortOrder: number
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("tee_times")
    .insert({ round_id: roundId, tee_time: time, sort_order: sortOrder });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function updateTeeTime(
  supabase: SupabaseClient,
  teeTimeId: string,
  time: string
): Promise<void> {
  await supabase.from("tee_times").update({ tee_time: time }).eq("id", teeTimeId);
}

export async function deleteTeeTime(supabase: SupabaseClient, teeTimeId: string): Promise<void> {
  await supabase.from("tee_times").delete().eq("id", teeTimeId);
}

export async function setTeeTimePlayers(
  supabase: SupabaseClient,
  teeTimeId: string,
  playerIds: string[]
): Promise<void> {
  await supabase.from("tee_time_players").delete().eq("tee_time_id", teeTimeId);
  if (playerIds.length === 0) return;
  await supabase
    .from("tee_time_players")
    .insert(playerIds.map((pid) => ({ tee_time_id: teeTimeId, player_id: pid })));
}

// ---- day-of lifecycle ------------------------------------------------------

export async function startRound(supabase: SupabaseClient, roundId: string): Promise<void> {
  await supabase
    .from("rounds")
    .update({ started_at: new Date().toISOString(), finished_at: null })
    .eq("id", roundId);
}

export async function finishRound(supabase: SupabaseClient, roundId: string): Promise<void> {
  await supabase.from("rounds").update({ finished_at: new Date().toISOString() }).eq("id", roundId);
}

export async function reopenRound(supabase: SupabaseClient, roundId: string): Promise<void> {
  await supabase.from("rounds").update({ finished_at: null }).eq("id", roundId);
}

export async function setCurrentRound(
  supabase: SupabaseClient,
  tripId: string,
  roundId: string
): Promise<void> {
  await supabase.from("trips").update({ current_round_id: roundId }).eq("id", tripId);
}

export async function setTournamentWrapped(
  supabase: SupabaseClient,
  tripId: string,
  wrapped: boolean
): Promise<void> {
  await supabase
    .from("trips")
    .update({ wrapped_at: wrapped ? new Date().toISOString() : null })
    .eq("id", tripId);
}

// ---- awards / voting -------------------------------------------------------

export async function loadVotingEnabled(
  supabase: SupabaseClient,
  tripId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("trip_award_config")
    .select("voting_enabled")
    .eq("trip_id", tripId)
    .maybeSingle();
  return data ? Boolean((data as { voting_enabled: boolean }).voting_enabled) : true;
}

export async function setVotingEnabled(
  supabase: SupabaseClient,
  tripId: string,
  enabled: boolean
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("trip_award_config")
    .upsert(
      { trip_id: tripId, voting_enabled: enabled, updated_at: new Date().toISOString() },
      { onConflict: "trip_id" }
    );
  return error ? { ok: false, error: error.message } : { ok: true };
}

/**
 * Build a round's matches from its tee-time segments: each tee time becomes one
 * or more matches using the players actually assigned to it. Without this, a
 * round configured purely with segments has no `matches` rows, so the matchup
 * board opens empty and Lock stays disabled.
 */
export async function buildMatchesFromSegments(
  supabase: SupabaseClient,
  roundId: string,
  roster: RosterPlayerLite[]
): Promise<{ ok: boolean; error?: string; built: number }> {
  const { data: tts } = await supabase
    .from("tee_times")
    .select("id,tee_time,sort_order,tee_time_players(player_id)")
    .eq("round_id", roundId)
    .order("sort_order");
  const { data: segs } = await supabase
    .from("round_segments")
    .select("tee_time_id,format,points")
    .eq("round_id", roundId);
  const segBy = new Map(
    ((segs ?? []) as Record<string, unknown>[]).map((x) => [x.tee_time_id as string, x])
  );
  const teamOf = new Map(roster.map((p) => [p.id, p.team]));

  await supabase.from("matches").delete().eq("round_id", roundId);

  let order = 0;
  for (const raw of (tts ?? []) as Record<string, unknown>[]) {
    const ids = ((raw.tee_time_players ?? []) as { player_id: string }[]).map((x) => x.player_id);
    const a = ids.filter((id) => teamOf.get(id) === "A");
    const b = ids.filter((id) => teamOf.get(id) === "B");
    if (a.length === 0 || b.length === 0) continue;
    const seg = segBy.get(raw.id as string);
    const format = (seg?.format as string) ?? "best_ball";
    const points = Number(seg?.points ?? 1);
    const perSide = format === "match_play" ? 1 : Math.min(a.length, b.length);
    const count = format === "match_play" ? Math.min(a.length, b.length) : 1;

    for (let i = 0; i < count; i++) {
      order += 1;
      const aSide = format === "match_play" ? [a[i]] : a.slice(0, perSide);
      const bSide = format === "match_play" ? [b[i]] : b.slice(0, perSide);
      const ins = await supabase
        .from("matches")
        .insert({
          round_id: roundId,
          label: `${raw.tee_time ?? "Tee time"}${count > 1 ? ` #${i + 1}` : ""}`,
          points: count > 1 ? points / count : points,
          sort_order: order,
        })
        .select("id")
        .single();
      if (ins.error) return { ok: false, error: ins.error.message, built: order - 1 };
      const mid = (ins.data as { id: string }).id;
      const rows = [
        ...aSide.map((pid) => ({ match_id: mid, player_id: pid, side: "A" })),
        ...bSide.map((pid) => ({ match_id: mid, player_id: pid, side: "B" })),
      ];
      const mp = await supabase.from("match_players").insert(rows);
      if (mp.error) return { ok: false, error: mp.error.message, built: order - 1 };
    }
  }
  return { ok: true, built: order };
}

/** Only one captain per team. Setting one clears the previous. */
export async function setCaptain(
  supabase: SupabaseClient,
  tripId: string,
  teamId: string,
  playerId: string | null
): Promise<void> {
  await supabase.from("players").update({ is_captain: false }).eq("trip_id", tripId).eq("team_id", teamId);
  if (playerId) await supabase.from("players").update({ is_captain: true }).eq("id", playerId);
}

/** Shuffle the whole field into the two teams, keeping the sides even. */
export async function assignTeamsRandomly(
  supabase: SupabaseClient,
  tripId: string
): Promise<{ ok: boolean; error?: string }> {
  const { data: teams } = await supabase.from("teams").select("id,code").eq("trip_id", tripId);
  const list = (teams ?? []) as { id: string; code: string }[];
  const teamA = list.find((t) => t.code === "A");
  const teamB = list.find((t) => t.code === "B");
  if (!teamA || !teamB) return { ok: false, error: "This tournament needs two teams first." };

  const { data: players } = await supabase.from("players").select("id").eq("trip_id", tripId);
  const ids = ((players ?? []) as { id: string }[]).map((p) => p.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const half = Math.ceil(ids.length / 2);
  for (let i = 0; i < ids.length; i++) {
    const { error } = await supabase
      .from("players")
      .update({ team_id: i < half ? teamA.id : teamB.id })
      .eq("id", ids[i]);
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Snake the field into two teams by handicap so the sides are balanced. */
export async function assignTeamsBalanced(
  supabase: SupabaseClient,
  tripId: string
): Promise<{ ok: boolean; error?: string }> {
  const { data: teams } = await supabase.from("teams").select("id,code").eq("trip_id", tripId);
  const list = (teams ?? []) as { id: string; code: string }[];
  const teamA = list.find((t) => t.code === "A");
  const teamB = list.find((t) => t.code === "B");
  if (!teamA || !teamB) return { ok: false, error: "This tournament needs two teams first." };

  const { data: players } = await supabase
    .from("players")
    .select("id,handicap_index")
    .eq("trip_id", tripId)
    .order("handicap_index");
  const ordered = ((players ?? []) as { id: string }[]).map((p) => p.id);
  // Snake: A, B, B, A, A, B ... keeps the combined handicaps close.
  for (let i = 0; i < ordered.length; i++) {
    const toA = Math.floor(i / 2) % 2 === 0 ? i % 2 === 0 : i % 2 === 1;
    const { error } = await supabase
      .from("players")
      .update({ team_id: toA ? teamA.id : teamB.id })
      .eq("id", ordered[i]);
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}
