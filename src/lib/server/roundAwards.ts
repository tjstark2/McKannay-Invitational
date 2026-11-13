// Awards on the server: work them out when a round closes, store them, and
// later let the AI polish the wording.
//
// Two separate steps, on purpose:
//   1. writeRoundAwards - database only, well under a second. Runs inside the
//      round close. Uses the hand-written lines, so every round has awards
//      even if the AI is down, slow, or never configured.
//   2. polishRoundAwards - one AI call per round, Pro tournaments only. Runs
//      AFTER the close (the next cron tick, or straight after a manual
//      finish), so a slow model can never hold a round open or eat the cron's
//      time budget. Lines that fail the checks keep the hand-written version.

import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildRoundAwards } from "@/features/awards/build";
import { COPY_SYSTEM, copyPrompt, mergeCopy, parseCopyReply, type AwardWithNames } from "@/features/awards/copy";
import type { PlayerFacts } from "@/features/awards/detectors";
import type { Stage } from "@/features/awards/moments";
import type { Award } from "@/features/awards/select";
import type { HoleScoreLite } from "@/features/trip/scoring/liveStandings";
import { loadCourseHoles, loadCourseTees } from "@/lib/supabase/courseHoles";
import { loadRoundSetups } from "@/lib/supabase/roundSegments";
import { onceForRound } from "@/lib/server/push";
import { computeTripResult, type PlayerRow, type Trip } from "@/lib/server/roundEngine";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
/** Long enough for one call, short enough that a hung model never matters. */
const AI_TIMEOUT_MS = 25_000;

type AwardRow = {
  moment_id: string;
  title: string;
  player_ids: string[];
  line: string;
  fallback_line: string;
  stat: string;
  variant: string;
  tier: number;
  score: number;
  position: number;
};

/**
 * Work out a round's awards and store them, replacing any already there.
 * Returns how many were written. Never throws - awards must not stop a round
 * closing.
 */
export async function writeRoundAwards(admin: SupabaseClient, roundId: string): Promise<number> {
  try {
    const { data: r } = await admin.from("rounds").select("id,trip_id").eq("id", roundId).maybeSingle();
    const tripId = (r as { trip_id?: string } | null)?.trip_id;
    if (!tripId) return 0;

    const { data: t } = await admin
      .from("trips")
      .select("id,name,join_code,time_zone,scoring_mode")
      .eq("id", tripId)
      .maybeSingle();
    if (!t) return 0;
    const trip = t as Trip;

    const setups = await loadRoundSetups(admin, tripId);
    const setup = setups.find((s) => s.id === roundId);
    if (!setup?.courseId) return 0;

    const [holes, tees, pRes, teamRes, hsRes, mRes] = await Promise.all([
      loadCourseHoles(admin, setup.courseId),
      loadCourseTees(admin, setup.courseId),
      admin.from("players").select("id,display_name,handicap_index,account_id,team_id").eq("trip_id", tripId),
      admin.from("teams").select("id,code").eq("trip_id", tripId),
      admin.from("hole_scores").select("round_id,player_id,hole_number,strokes").eq("round_id", roundId),
      admin.from("matches").select("id,match_players(player_id,side)").eq("round_id", roundId),
    ]);
    if (holes.length === 0) return 0;

    const players = (pRes.data ?? []) as PlayerRow[];
    const codeOf = new Map(((teamRes.data ?? []) as { id: string; code: string }[]).map((x) => [x.id, x.code]));
    const holeScores: HoleScoreLite[] = ((hsRes.data ?? []) as Record<string, unknown>[]).map((x) => ({
      roundId: x.round_id as string,
      playerId: x.player_id as string,
      hole: x.hole_number as number,
      strokes: x.strokes as number,
    }));
    if (holeScores.length === 0) return 0;

    // Everyone seated in a tee time, plus anyone who somehow has scores.
    const seated = new Set([...setup.teeTimes.flatMap((tt) => tt.playerIds), ...holeScores.map((s) => s.playerId)]);
    const field = players.filter((p) => seated.has(p.id));

    const ordered = [...setups].sort((a, b) => a.roundNumber - b.roundNumber);
    const earlier = ordered.filter((s) => s.roundNumber < setup.roundNumber);
    const later = ordered.filter((s) => s.roundNumber > setup.roundNumber);
    const stage: Stage = later.length === 0 ? "finale" : earlier.length === 0 ? "opener" : "middle";

    // Standings as they were right after this round, not as they are today -
    // so regenerating Thursday's awards on Saturday still reads like Thursday.
    const upToHere = ordered.filter((s) => s.roundNumber <= setup.roundNumber);
    const points = await computeTripResult(admin, trip, upToHere, players);

    // History and last round's form, from what was stored for earlier rounds.
    const earlierIds = earlier.map((s) => s.id);
    const [histRes, prevRes] = await Promise.all([
      earlierIds.length
        ? admin.from("round_awards").select("moment_id,player_ids").in("round_id", earlierIds)
        : Promise.resolve({ data: [] }),
      earlier.length
        ? admin.from("round_award_facts").select("facts").eq("round_id", earlier[earlier.length - 1].id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    const history = ((histRes.data ?? []) as { moment_id: string; player_ids: string[] }[]).flatMap((h) =>
      h.player_ids.map((playerId) => ({ momentId: h.moment_id, playerId }))
    );
    const previousNetToPar: Record<string, number> = {};
    for (const f of ((prevRes.data as { facts?: PlayerFacts[] } | null)?.facts ?? [])) {
      if (f.holesPlayed >= 9) previousNetToPar[f.playerId] = f.netToPar;
    }

    const tee = tees.find((x) => x.id === setup.teeId) ?? tees[0] ?? null;
    const built = buildRoundAwards({
      roundId,
      holes,
      holesCount: (setup.holesCount === 9 ? 9 : 18) as 9 | 18,
      nine: setup.nine,
      tee: { rating: tee?.rating ?? null, slope: tee?.slope ?? null, par: holes.reduce((s, h) => s + h.par, 0) || 72 },
      format: setup.format,
      groups: setup.teeTimes.map((tt) => ({
        playerIds: tt.playerIds,
        allowancePct: setup.segments.find((sg) => sg.teeTimeId === tt.id)?.allowancePct ?? 100,
      })),
      players: field.map((p) => ({
        id: p.id,
        name: p.display_name,
        handicapIndex: p.handicap_index ?? 0,
        team: p.team_id ? codeOf.get(p.team_id) ?? null : null,
      })),
      holeScores,
      matches: ((mRes.data ?? []) as { id: string; match_players: { player_id: string; side: string }[] }[]).map((m) => ({
        id: m.id,
        aPlayers: m.match_players.filter((x) => x.side === "A").map((x) => x.player_id),
        bPlayers: m.match_players.filter((x) => x.side === "B").map((x) => x.player_id),
      })),
      previousNetToPar,
      history,
      points,
      stage,
    });

    await admin.from("round_award_facts").upsert(
      { round_id: roundId, trip_id: tripId, facts: built.facts, matches: built.matchFacts, stage, points },
      { onConflict: "round_id" }
    );
    await admin.from("round_awards").delete().eq("round_id", roundId);
    if (built.awards.length === 0) return 0;
    const { error } = await admin.from("round_awards").insert(
      built.awards.map((a: Award, i: number) => ({
        round_id: roundId,
        trip_id: tripId,
        moment_id: a.momentId,
        title: a.title,
        player_ids: a.playerIds,
        line: a.line,
        fallback_line: a.line,
        stat: a.stat,
        variant: a.variant,
        tier: a.tier,
        score: a.score,
        position: i,
        written_by: "template",
      }))
    );
    return error ? 0 : built.awards.length;
  } catch {
    return 0;
  }
}

/**
 * Let the AI rewrite a round's lines. Pro tournaments only, one call per
 * round. Returns how many lines the AI wrote; the rest stay hand-written.
 */
export async function polishRoundAwards(admin: SupabaseClient, roundId: string): Promise<number> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return 0;
  try {
    const { data: r } = await admin.from("rounds").select("trip_id,title").eq("id", roundId).maybeSingle();
    const round = r as { trip_id: string; title: string | null } | null;
    if (!round) return 0;
    const { data: t } = await admin.from("trips").select("name,is_pro").eq("id", round.trip_id).maybeSingle();
    const trip = t as { name: string; is_pro: boolean | null } | null;
    if (!trip?.is_pro) return 0;

    const [aRes, pRes, fRes, teamRes, histRes] = await Promise.all([
      admin.from("round_awards").select("*").eq("round_id", roundId).order("position"),
      admin.from("players").select("id,display_name").eq("trip_id", round.trip_id),
      admin.from("round_award_facts").select("stage,points").eq("round_id", roundId).maybeSingle(),
      admin.from("teams").select("code,name").eq("trip_id", round.trip_id),
      admin.from("round_awards").select("round_id,title,player_ids").eq("trip_id", round.trip_id).neq("round_id", roundId),
    ]);
    const rows = (aRes.data ?? []) as AwardRow[];
    if (rows.length === 0) return 0;

    const nameOf = new Map(((pRes.data ?? []) as { id: string; display_name: string }[]).map((p) => [p.id, p.display_name]));
    const awards: AwardWithNames[] = rows.map((row) => ({
      momentId: row.moment_id,
      title: row.title,
      playerIds: row.player_ids,
      line: row.fallback_line,
      stat: row.stat,
      variant: row.variant as Award["variant"],
      tier: row.tier,
      score: row.score,
      names: row.player_ids.map((id) => nameOf.get(id) ?? "").filter(Boolean),
    }));

    const facts = fRes.data as { stage?: Stage; points?: { a: number; b: number } } | null;
    const teamName = new Map(((teamRes.data ?? []) as { code: string; name: string }[]).map((x) => [x.code, x.name]));
    const a = facts?.points?.a ?? 0;
    const b = facts?.points?.b ?? 0;
    const standings =
      a === b
        ? `All square at ${a}-${b}`
        : `${teamName.get(a > b ? "A" : "B") ?? "One team"} lead ${Math.max(a, b)}-${Math.min(a, b)}`;

    const priorWins: Record<string, string[]> = {};
    for (const h of (histRes.data ?? []) as { title: string; player_ids: string[] }[]) {
      for (const id of h.player_ids) {
        const n = nameOf.get(id);
        if (n) (priorWins[n] ??= []).push(h.title);
      }
    }

    const client = new Anthropic({ apiKey: key, timeout: AI_TIMEOUT_MS, maxRetries: 0 });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: COPY_SYSTEM,
      messages: [
        {
          role: "user",
          content: copyPrompt(
            {
              tripName: trip.name,
              roundTitle: round.title ?? "Today's round",
              stage: facts?.stage ?? "middle",
              standings,
              field: [...nameOf.values()],
            },
            awards,
            priorWins
          ),
        },
      ],
    });
    const text = msg.content.map((c) => (c.type === "text" ? c.text : "")).join("");
    const merged = mergeCopy(awards, parseCopyReply(text));

    let written = 0;
    for (const m of merged.filter((x) => x.byAi)) {
      const { error } = await admin
        .from("round_awards")
        .update({ line: m.line, written_by: "ai" })
        .eq("round_id", roundId)
        .eq("moment_id", m.momentId);
      if (!error) written += 1;
    }
    return written;
  } catch {
    // Slow, down, or a bad reply: the hand-written lines are already there.
    return 0;
  }
}

/**
 * The cron's share: polish a couple of recently closed rounds per tick. Each
 * round is only ever attempted once, so a failing model can't be retried into
 * a big bill.
 */
export async function polishPendingAwards(admin: SupabaseClient, max = 2): Promise<number> {
  const since = new Date(Date.now() - 48 * 3600000).toISOString();
  const { data } = await admin
    .from("round_awards")
    .select("round_id")
    .eq("written_by", "template")
    .gte("created_at", since)
    .limit(50);
  const roundIds = [...new Set(((data ?? []) as { round_id: string }[]).map((x) => x.round_id))];
  let done = 0;
  for (const id of roundIds) {
    if (done >= max) break;
    if (!(await onceForRound(admin, id, "awards_ai"))) continue;
    await polishRoundAwards(admin, id);
    done += 1;
  }
  return done;
}
