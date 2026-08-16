// One-liner for sending a push from anywhere in the app. Never throws: a
// notification failing must not break the thing that triggered it.

import type { Category } from "@/features/notifications/categories";

export async function notify(args: {
  userIds: (string | null | undefined)[];
  title: string;
  message: string;
  category: Category;
  kind?: string;
  url?: string;
}): Promise<void> {
  const userIds = args.userIds.filter((v): v is string => Boolean(v));
  if (userIds.length === 0) return;
  try {
    await fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...args, userIds }),
    });
  } catch {
    /* non-blocking by design */
  }
}

/**
 * Fire a server-decided event (join_request, voting_concluded_sweep). The
 * server verifies the caller's session token, works out who should hear about
 * it and dedupes. Never throws.
 */
export async function notifyEvent(
  event: "join_request" | "voting_concluded_sweep" | "chat_message" | "chat_reaction",
  tripId: string,
  extra?: Record<string, unknown>
): Promise<void> {
  try {
    const { getSupabaseClient } = await import("@/lib/supabase/client");
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch("/api/notify-event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ event, tripId, ...(extra ?? {}) }),
    });
  } catch {
    /* non-blocking by design */
  }
}

/** Everyone in the tournament except the person who caused it. */
export function othersIn(
  players: { accountId?: string | null }[],
  meUserId?: string | null
): string[] {
  return players
    .map((p) => p.accountId)
    .filter((id): id is string => Boolean(id) && id !== meUserId);
}

/**
 * POST to one of our own API routes with the caller's Supabase session token
 * attached. Used for the endpoints that must know who is calling (the AI
 * vision routes, which are rate limited per user).
 */
export async function authedPost(
  path: string,
  body: Record<string, unknown>
): Promise<Response> {
  const { getSupabaseClient } = await import("@/lib/supabase/client");
  const supabase = getSupabaseClient();
  const token = supabase
    ? (await supabase.auth.getSession()).data.session?.access_token
    : undefined;
  if (supabase && !token) {
    // Session gone. Say so plainly instead of a confusing server error.
    return new Response(
      JSON.stringify({ ok: false, error: "Your session expired - sign in again." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  return fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}
