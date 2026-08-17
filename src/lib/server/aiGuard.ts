// Guard for the endpoints that cost real money (the two Anthropic vision
// routes). Anyone with the URL could otherwise loop them and run up the bill.
//
// Two gates: you have to be signed in, and you get a limited number of calls
// per hour. The counter lives in Postgres rather than in memory, because each
// serverless invocation is its own process - an in-memory counter would reset
// constantly and protect nothing.

import { getAdminClient } from "@/lib/server/push";
import type { SupabaseClient } from "@supabase/supabase-js";

export type GuardResult =
  | { ok: true; userId: string; admin: SupabaseClient }
  | { ok: false; status: number; error: string };

/**
 * Verify the caller's session and count the call against their hourly budget.
 * `limit` is per user per rolling hour.
 */
export async function guardAiRoute(
  req: Request,
  route: string,
  limit = 30,
  /**
   * Optional thing the limit is counted against - a course id, say. When set,
   * the budget is per user PER SCOPE and has no time window: reading one
   * course's scorecard is a setup task you do once or twice, not something
   * that should refill every hour.
   */
  scope?: string | null
): Promise<GuardResult> {
  const admin = getAdminClient();
  if (!admin) {
    return { ok: false, status: 500, error: "Server isn't configured." };
  }

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) {
    return { ok: false, status: 401, error: "Sign in to use photo scoring." };
  }
  const { data: userData } = await admin.auth.getUser(token);
  const user = userData?.user ?? null;
  if (!user) {
    return { ok: false, status: 401, error: "Your session expired - sign in again." };
  }

  let query = admin
    .from("ai_usage_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("route", route);
  if (scope) {
    query = query.eq("scope", scope);
  } else {
    query = query.gte("called_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
  }
  const { count } = await query;

  if ((count ?? 0) >= limit) {
    return {
      ok: false,
      status: 429,
      error: scope
        ? "You've used your photo reads for this course. Type the remaining " +
          "numbers in by hand - reading a card costs real money, so it's capped."
        : "You've used up your photo reads for this hour. Type the numbers in " +
          "by hand for now - reading a card costs real money, so it's capped.",
    };
  }

  // Record the call before doing the expensive work, so a burst of parallel
  // requests can't all slip through the check.
  await admin.from("ai_usage_log").insert({ user_id: user.id, route, scope: scope ?? null });

  return { ok: true, userId: user.id, admin };
}
