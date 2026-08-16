import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

import {
  activeMemberIds,
  configureWebPush,
  getAdminClient,
  onceForRound,
  organizerIds,
  sendPushToUsers,
  sweepConcludedVoting,
} from "@/lib/server/push";
import { AWARDS } from "@/features/voting/awards";

/**
 * Scheduled work. Safe to hit as often as you like (hourly is the intent):
 * every message is deduped per round per kind in reminder_log.
 *
 *  - night_before / morning_of round reminders
 *  - voting: results reveal for rounds concluded by the 7-hour window,
 *    and a "voting closes soon" nudge two hours before it
 *  - organizer night-before checks: missing tee times, matchups, course
 *    data and player handicaps
 *
 * Env: CRON_SECRET, VAPID keys, SUPABASE_SERVICE_ROLE_KEY.
 */

function hoursUntil(dateIso: string): number {
  return (new Date(dateIso).getTime() - Date.now()) / 36e5;
}
function hoursSince(dateIso: string): number {
  return (Date.now() - new Date(dateIso).getTime()) / 36e5;
}

type TripLite = {
  id: string;
  name: string;
  join_code: string;
  scoring_mode: string | null;
};

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Not authorised." }, { status: 401 });
  }

  const admin = getAdminClient();
  if (!admin || !configureWebPush()) {
    return NextResponse.json({ ok: false, error: "Reminders aren't configured." }, { status: 500 });
  }

  let sent = 0;

  // ---- 1. Round-day reminders (night before / morning of) ------------------
  const { data: upcoming } = await admin
    .from("rounds")
    .select("id,trip_id,title,round_date,arrival_time,started_at,finished_at,trips(name,join_code)")
    .not("round_date", "is", null)
    .is("finished_at", null);

  for (const raw of (upcoming ?? []) as Record<string, unknown>[]) {
    const when = raw.round_date as string;
    if (!when) continue;
    const h = hoursUntil(when);
    const trip = (raw.trips ?? {}) as { name?: string; join_code?: string };
    const roundId = raw.id as string;
    const tripId = raw.trip_id as string;
    const joinCode = trip.join_code ?? "";
    const arrival = (raw.arrival_time as string) ?? "";

    let kind: "night_before" | "morning_of" | null = null;
    let title = "";
    let message = "";
    let category: "round_day" | "essential" = "round_day";
    if (h <= 26 && h > 2) {
      kind = "night_before";
      title = trip.name ?? "Tomorrow";
      message = `${raw.title} is coming up${arrival ? `, arrive ${arrival}` : ""}. Check your tee time and matchup.`;
    } else if (h <= 2 && h > 0.15) {
      kind = "morning_of";
      category = "essential";
      title = raw.title as string;
      message = `Teeing off soon${arrival ? ` - arrive ${arrival}` : ""}. Your group and strokes are in the app.`;
    }
    if (!kind) continue;
    if (!(await onceForRound(admin, roundId, kind))) continue;

    const members = await activeMemberIds(admin, tripId);
    sent += await sendPushToUsers(admin, {
      userIds: members,
      title,
      message,
      category,
      url: joinCode ? `/t/${joinCode}` : "/home",
    });
  }

  // ---- 2. Voting: reveal concluded rounds, warn before the window shuts ----
  sent += await sweepConcludedVoting(admin);

  const { data: liveRounds } = await admin
    .from("rounds")
    .select("id,trip_id,title,round_number,started_at,finished_at,first_score_at,trips(name,join_code,is_pro)")
    .not("started_at", "is", null)
    .is("finished_at", null)
    .not("first_score_at", "is", null);

  for (const raw of (liveRounds ?? []) as Record<string, unknown>[]) {
    const trip = (raw.trips ?? {}) as { name?: string; join_code?: string; is_pro?: boolean };
    if (!trip.is_pro) continue;
    const since = hoursSince(raw.first_score_at as string);
    if (since < 5 || since >= 7) continue;

    const roundId = raw.id as string;
    const tripId = raw.trip_id as string;

    // A later round already started concludes this one; the sweep handles it.
    const { data: later } = await admin
      .from("rounds")
      .select("id")
      .eq("trip_id", tripId)
      .gt("round_number", (raw.round_number as number) ?? 0)
      .not("started_at", "is", null)
      .limit(1);
    if ((later ?? []).length > 0) continue;

    if (!(await onceForRound(admin, roundId, "voting_closing"))) continue;

    // Only nudge people who haven't finished their picks.
    const members = await activeMemberIds(admin, tripId);
    const { data: voteRows } = await admin
      .from("round_votes")
      .select("voter_account")
      .eq("round_id", roundId);
    const counts = new Map<string, number>();
    for (const v of (voteRows ?? []) as { voter_account: string }[]) {
      counts.set(v.voter_account, (counts.get(v.voter_account) ?? 0) + 1);
    }
    const behind = members.filter((id) => (counts.get(id) ?? 0) < AWARDS.length);
    sent += await sendPushToUsers(admin, {
      userIds: behind,
      title: trip.name ?? "TourneyBirdie",
      message: `Voting closes soon for ${raw.title}. Get your award picks in.`,
      category: "awards",
      url: trip.join_code ? `/t/${trip.join_code}` : "/home",
    });
  }

  // ---- 3. Organizer night-before checks -------------------------------------
  const { data: tomorrow } = await admin
    .from("rounds")
    .select("id,trip_id,title,round_date,course_id,holes_count,trips(id,name,join_code,scoring_mode)")
    .not("round_date", "is", null)
    .is("started_at", null);

  for (const raw of (tomorrow ?? []) as Record<string, unknown>[]) {
    const when = raw.round_date as string;
    if (!when) continue;
    const h = hoursUntil(when);
    if (h > 26 || h <= 0) continue;

    const roundId = raw.id as string;
    const trip = (raw.trips ?? {}) as unknown as TripLite;
    const issues: string[] = [];

    // Tee times with actual players in them.
    const { data: tts } = await admin
      .from("tee_times")
      .select("id,tee_time_players(player_id)")
      .eq("round_id", roundId);
    const teeRows = (tts ?? []) as { id: string; tee_time_players: { player_id: string }[] }[];
    const assigned = teeRows.reduce((n, t) => n + (t.tee_time_players?.length ?? 0), 0);
    if (teeRows.length === 0) issues.push("no tee times");
    else if (assigned === 0) issues.push("no players assigned to tee times");

    // Matchups built.
    const { data: ms } = await admin.from("matches").select("id").eq("round_id", roundId).limit(1);
    if ((ms ?? []).length === 0) issues.push("matchups aren't set");

    // Course data (hole-by-hole trips need the full card).
    const courseId = raw.course_id as string | null;
    if (!courseId) {
      issues.push("no course picked");
    } else {
      const { data: course } = await admin
        .from("courses")
        .select("rating,slope")
        .eq("id", courseId)
        .maybeSingle();
      const c = (course ?? {}) as { rating?: number | null; slope?: number | null };
      if (!c.rating || !c.slope) issues.push("course is missing rating or slope");
      if (trip.scoring_mode === "hole_by_hole") {
        const { count } = await admin
          .from("course_holes")
          .select("id", { count: "exact", head: true })
          .eq("course_id", courseId);
        if ((count ?? 0) < 18) issues.push("course is missing hole data");
      }
    }

    // Everyone has a handicap.
    const { data: noHcp } = await admin
      .from("players")
      .select("display_name")
      .eq("trip_id", raw.trip_id as string)
      .or("handicap_index.is.null,handicap_index.eq.0");
    const names = ((noHcp ?? []) as { display_name: string }[]).map((p) => p.display_name);
    if (names.length > 0) {
      issues.push(`no handicap for ${names.slice(0, 3).join(", ")}${names.length > 3 ? ` +${names.length - 3}` : ""}`);
    }

    if (issues.length === 0) continue;
    if (!(await onceForRound(admin, roundId, "organizer_night_before"))) continue;

    const orgs = await organizerIds(admin, raw.trip_id as string);
    sent += await sendPushToUsers(admin, {
      userIds: orgs,
      title: `${raw.title} needs attention`,
      message: `Before tomorrow: ${issues.join("; ")}.`,
      category: "organizer",
      url: trip.join_code ? `/manage/${trip.join_code}` : "/home",
    });
  }

  return NextResponse.json({ ok: true, sent });
}
