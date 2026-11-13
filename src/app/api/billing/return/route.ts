import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/server/push";
import { billingEnv, getSession } from "@/lib/server/stripe";
import { completeSession, safeReturnPath, withParam } from "@/lib/server/billing";

export const runtime = "nodejs";

/**
 * Where Stripe sends someone after paying. Grants it right here, so the
 * upgrade is there the moment they land back - the webhook does the same
 * thing as a backup if they close the tab first.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = safeReturnPath(url.searchParams.get("next"));
  const sessionId = url.searchParams.get("session_id") ?? "";
  const admin = getAdminClient();
  const env = billingEnv();
  if (!admin || !env.live || !sessionId) return NextResponse.redirect(new URL(next, url.origin));

  try {
    const session = await getSession(env.secretKey!, sessionId);
    const product = await completeSession(admin, session);
    return NextResponse.redirect(new URL(withParam(next, "upgraded", product ?? "pending"), url.origin));
  } catch {
    return NextResponse.redirect(new URL(withParam(next, "upgraded", "pending"), url.origin));
  }
}
