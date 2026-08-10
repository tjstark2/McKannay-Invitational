import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type Category = "live_callouts" | "round_info" | "clubhouse";

/**
 * Sends a push to a set of users. Called from the app when something worth
 * interrupting someone for happens (eagle, ace, big swing in the match).
 *
 * Needs, in Vercel env:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 *   SUPABASE_SERVICE_ROLE_KEY (to read other people's subscriptions)
 */
export async function POST(req: Request) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!publicKey || !privateKey || !url || !serviceKey) {
    return NextResponse.json(
      { ok: false, error: "Push isn't configured yet." },
      { status: 500 }
    );
  }

  let body: { userIds?: string[]; title?: string; message?: string; category?: Category; url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }

  const userIds = (body.userIds ?? []).filter(Boolean);
  if (userIds.length === 0 || !body.message) {
    return NextResponse.json({ ok: false, error: "Nothing to send." }, { status: 400 });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:hello@tourneybirdie.com",
    publicKey,
    privateKey
  );

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const category: Category = body.category ?? "live_callouts";

  // Respect each player's category preference (default on when no row exists).
  const { data: prefs } = await admin
    .from("notification_prefs")
    .select("user_id,live_callouts,round_info,clubhouse")
    .in("user_id", userIds);
  const prefById = new Map(
    ((prefs ?? []) as Record<string, unknown>[]).map((p) => [p.user_id as string, p])
  );
  const wanted = userIds.filter((id) => {
    const p = prefById.get(id);
    if (!p) return true;
    return p[category] !== false;
  });
  if (wanted.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .in("user_id", wanted);

  const payload = JSON.stringify({
    title: body.title || "TourneyBirdie",
    body: body.message,
    url: body.url || "/home",
  });

  let sent = 0;
  const dead: string[] = [];
  await Promise.all(
    ((subs ?? []) as Record<string, unknown>[]).map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint as string,
            keys: { p256dh: s.p256dh as string, auth: s.auth as string },
          },
          payload
        );
        sent += 1;
      } catch (e) {
        // 404/410 means the browser threw the subscription away.
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) dead.push(s.id as string);
      }
    })
  );

  if (dead.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", dead);
  }

  return NextResponse.json({ ok: true, sent, pruned: dead.length });
}
