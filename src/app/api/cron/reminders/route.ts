import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

import {
  configureWebPush,
  flushHeldNotifications,
  getAdminClient,
  sweepConcludedVoting,
} from "@/lib/server/push";
import { runLifecycle } from "@/lib/server/roundEngine";

/**
 * The heartbeat. Run it EVERY 10 MINUTES from cron-job.org - hourly is too
 * coarse, because a group's 30-minute tee warning and scoring opening 30
 * minutes before the first tee both need to land within a few minutes.
 *
 * Safe to run as often as you like: every step and every notification is
 * guarded so it happens exactly once.
 *
 *  1. The round engine - readiness checks, the night-before message, scoring
 *     opening on its own, per-group tee warnings, "your round is in", the
 *     close reminder, and closing the round (results, totals, confirmations,
 *     next round) when it is done.
 *  2. Voting results reveal for rounds that have concluded.
 *  3. Anything held overnight for quiet hours, now that morning has come.
 *
 * Env: CRON_SECRET, VAPID keys, SUPABASE_SERVICE_ROLE_KEY.
 */
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

  // Each step is isolated, so one failure never stops the others running.
  const result = { lifecycle: 0, voting: 0, held: 0, errors: [] as string[] };

  try {
    result.lifecycle = await runLifecycle(admin);
  } catch (e) {
    result.errors.push(`lifecycle: ${e instanceof Error ? e.message : String(e)}`);
  }
  try {
    result.voting = await sweepConcludedVoting(admin);
  } catch (e) {
    result.errors.push(`voting: ${e instanceof Error ? e.message : String(e)}`);
  }
  try {
    result.held = await flushHeldNotifications(admin);
  } catch (e) {
    result.errors.push(`held: ${e instanceof Error ? e.message : String(e)}`);
  }

  return NextResponse.json({ ok: result.errors.length === 0, ...result });
}
