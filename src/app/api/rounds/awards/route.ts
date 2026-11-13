import { NextResponse } from "next/server";
import { getAdminClient, organizerIds } from "@/lib/server/push";
import { claimPolish, polishRoundAwards, writeRoundAwards } from "@/lib/server/roundAwards";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Rebuilds per organizer per round. The AI pass costs money each time. */
const REBUILD_LIMIT = 5;

/**
 * Rebuild a finished round's awards. Organizers only.
 *
 * Covers rounds that closed before awards existed, and a round whose scores
 * were corrected after it closed. Works the awards out again from the
 * current scores, then lets the AI polish them (Pro tournaments).
 */
export async function POST(req: Request) {
  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: "Server isn't configured." }, { status: 500 });

  let roundId = "";
  try {
    roundId = ((await req.json()) as { roundId?: string }).roundId ?? "";
  } catch {
    /* fall through */
  }
  if (!roundId) return NextResponse.json({ ok: false, error: "No round given." }, { status: 400 });

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const { data: userData } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  const caller = userData?.user ?? null;
  if (!caller) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  const { data: r } = await admin.from("rounds").select("trip_id,finished_at").eq("id", roundId).maybeSingle();
  const round = r as { trip_id: string; finished_at: string | null } | null;
  if (!round) return NextResponse.json({ ok: false, error: "Round not found." }, { status: 404 });
  if (!round.finished_at) {
    return NextResponse.json({ ok: false, error: "Awards come out once the round is final." }, { status: 400 });
  }
  if (!(await organizerIds(admin, round.trip_id)).includes(caller.id)) {
    return NextResponse.json({ ok: false, error: "Only an organizer can rebuild awards." }, { status: 403 });
  }

  const { count } = await admin
    .from("ai_usage_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", caller.id)
    .eq("route", "round-awards")
    .eq("scope", roundId);
  if ((count ?? 0) >= REBUILD_LIMIT) {
    return NextResponse.json(
      { ok: false, error: "This round's awards have been rebuilt the most times allowed." },
      { status: 429 }
    );
  }
  await admin.from("ai_usage_log").insert({ user_id: caller.id, route: "round-awards", scope: roundId });

  const written = await writeRoundAwards(admin, roundId);
  // Claiming the pass here stops the cron polishing the same awards again.
  const polished = written > 0 && (await claimPolish(admin, roundId)) ? await polishRoundAwards(admin, roundId) : 0;
  return NextResponse.json({ ok: true, awards: written, aiLines: polished });
}
