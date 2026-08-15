import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { shouldDeliver, type Prefs, type Category } from "@/features/notifications/categories";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Scheduled reminders. Vercel Cron hits this hourly; it works out which rounds
 * are close enough to be worth a nudge and sends once per round per kind.
 *
 * Env: CRON_SECRET, VAPID keys, SUPABASE_SERVICE_ROLE_KEY.
 */

type Job = {
  kind: "night_before" | "morning_of";
  category: Category;
  roundId: string;
  tripId: string;
  title: string;
  message: string;
  joinCode: string;
};

function hoursUntil(dateIso: string): number {
  return (new Date(dateIso).getTime() - Date.now()) / 36e5;
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Not authorised." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!url || !serviceKey || !publicKey || !privateKey) {
    return NextResponse.json({ ok: false, error: "Reminders aren't configured." }, { status: 500 });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:hello@tourneybirdie.com", publicKey, privateKey);

  // Rounds with a real date that haven't finished.
  const { data: rounds } = await admin
    .from("rounds")
    .select("id,trip_id,title,round_date,arrival_time,started_at,finished_at,trips(name,join_code)")
    .not("round_date", "is", null)
    .is("finished_at", null);

  const jobs: Job[] = [];
  for (const raw of (rounds ?? []) as Record<string, unknown>[]) {
    const when = raw.round_date as string;
    if (!when) continue;
    const h = hoursUntil(when);
    const trip = (raw.trips ?? {}) as { name?: string; join_code?: string };
    const base = {
      roundId: raw.id as string,
      tripId: raw.trip_id as string,
      joinCode: trip.join_code ?? "",
    };
    const arrival = (raw.arrival_time as string) ?? "";
    if (h <= 26 && h > 2) {
      jobs.push({
        ...base,
        kind: "night_before",
        category: "round_day",
        title: trip.name ?? "Tomorrow",
        message: `${raw.title} is coming up${arrival ? `, arrive ${arrival}` : ""}. Check your tee time and matchup.`,
      });
    } else if (h <= 2 && h > 0.15) {
      jobs.push({
        ...base,
        kind: "morning_of",
        category: "essential",
        title: raw.title as string,
        message: `Teeing off soon${arrival ? ` - arrive ${arrival}` : ""}. Your group and strokes are in the app.`,
      });
    }
  }

  if (jobs.length === 0) return NextResponse.json({ ok: true, sent: 0, jobs: 0 });

  let sent = 0;
  for (const job of jobs) {
    // Only once per round per kind.
    const { data: already } = await admin
      .from("reminder_log")
      .select("id")
      .eq("round_id", job.roundId)
      .eq("kind", job.kind)
      .maybeSingle();
    if (already) continue;

    const { data: members } = await admin
      .from("trip_members")
      .select("user_id")
      .eq("trip_id", job.tripId)
      .eq("status", "active");
    const userIds = ((members ?? []) as { user_id: string }[]).map((m) => m.user_id);
    if (userIds.length === 0) continue;

    const { data: prefs } = await admin
      .from("notification_prefs")
      .select("user_id,round_day,live_action,my_card,awards,clubhouse_level,organizer,quiet_start,quiet_end,time_zone")
      .in("user_id", userIds);
    const prefById = new Map(
      ((prefs ?? []) as Record<string, unknown>[]).map((p) => [p.user_id as string, p as unknown as Partial<Prefs>])
    );
    const wanted = userIds.filter((id) =>
      shouldDeliver(
        { category: job.category, title: job.title, message: job.message },
        prefById.get(id) ?? null
      )
    );
    if (wanted.length === 0) continue;

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint,p256dh,auth")
      .in("user_id", wanted);

    const payload = JSON.stringify({
      title: job.title,
      body: job.message,
      url: job.joinCode ? `/t/${job.joinCode}` : "/home",
    });
    await Promise.all(
      ((subs ?? []) as Record<string, unknown>[]).map(async (sp) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sp.endpoint as string,
              keys: { p256dh: sp.p256dh as string, auth: sp.auth as string },
            },
            payload
          );
          sent += 1;
        } catch {
          /* dead subscriptions get pruned by the main send route */
        }
      })
    );

    await admin.from("reminder_log").insert({ round_id: job.roundId, kind: job.kind });
  }

  return NextResponse.json({ ok: true, jobs: jobs.length, sent });
}
