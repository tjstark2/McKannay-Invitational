import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

import { shouldDeliver, type Category, type Prefs } from "@/features/notifications/categories";

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

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:hello@tourneybirdie.com",
    publicKey,
    privateKey
  );

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const category: Category = body.category ?? "live_action";

  // Category, intensity and quiet hours all decided in one shared place.
  const { data: prefs } = await admin
    .from("notification_prefs")
    .select(
      "user_id,round_day,live_action,my_card,awards,clubhouse_level,organizer,quiet_start,quiet_end,time_zone"
    )
    .in("user_id", userIds);
  const prefById = new Map(
    ((prefs ?? []) as Record<string, unknown>[]).map((p) => [p.user_id as string, p as unknown as Partial<Prefs>])
  );
  const notification = {
    category,
    kind: body.kind,
    title: body.title || "TourneyBirdie",
    message: body.message,
  };
  const wanted = userIds.filter((id) => shouldDeliver(notification, prefById.get(id) ?? null));
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
