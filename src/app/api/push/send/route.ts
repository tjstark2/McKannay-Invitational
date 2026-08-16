import { NextResponse } from "next/server";

export const runtime = "nodejs";

import type { Category } from "@/features/notifications/categories";
import { configureWebPush, getAdminClient, sendPushToUsers } from "@/lib/server/push";

/**
 * Sends a push to a set of users. Called from the app when something worth
 * interrupting someone for happens (eagle, ace, big swing in the match).
 * Preference checks, delivery and pruning live in lib/server/push.
 *
 * Needs, in Vercel env:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 *   SUPABASE_SERVICE_ROLE_KEY (to read other people's subscriptions)
 */
export async function POST(req: Request) {
  const admin = getAdminClient();
  if (!admin || !configureWebPush()) {
    return NextResponse.json(
      { ok: false, error: "Push isn't configured yet." },
      { status: 500 }
    );
  }

  let body: {
    userIds?: string[];
    title?: string;
    message?: string;
    category?: Category;
    kind?: string;
    url?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }

  const userIds = (body.userIds ?? []).filter(Boolean);
  if (userIds.length === 0 || !body.message) {
    return NextResponse.json({ ok: false, error: "Nothing to send." }, { status: 400 });
  }

  const sent = await sendPushToUsers(admin, {
    userIds,
    title: body.title || "TourneyBirdie",
    message: body.message,
    category: body.category ?? "live_action",
    kind: body.kind,
    url: body.url,
  });
  return NextResponse.json({ ok: true, sent });
}
